# Argo Workflows — and how it would extend the TEAMOMF portal

**What this is:** a from-scratch explanation of Argo Workflows, followed by a
concrete plan for integrating it into the TEAMOMF Backstage portal as it
actually exists today.

**Status:** Argo Workflows is **not integrated** into the portal. Nothing in
this repository depends on it. Everything in Part 3 is a proposal with real
file paths, not a description of existing code.

**Prerequisite you don't have yet:** Argo Workflows requires a Kubernetes
cluster. There is no cluster, and no container tooling (Docker, kubectl, kind,
minikube, helm are all absent from the dev machine). Part 2 covers getting
there.

---

## Contents

- **Part 1 — What Argo Workflows is** (concepts, from zero)
- **Part 2 — Standing it up locally** (the prerequisite chain)
- **Part 3 — Integrating it into the TEAMOMF portal** (four paths, phased)
- **Part 4 — Talking points and likely questions**
- **Part 5 — Glossary**

---

# Part 1 — What Argo Workflows is

## 1.1 The one-sentence version

Argo Workflows is a workflow engine that runs multi-step pipelines on
Kubernetes, where **every step is a container**.

## 1.2 Read this before anything else: the four Argos

This is the single most common source of confusion, and the thing to get
straight before talking to anyone about it. "Argo" is a family of four
separate products under one CNCF project. They are commonly conflated and they
solve different problems.

| Product | What it does | Analogy |
|---|---|---|
| **Argo Workflows** | Runs multi-step container pipelines on Kubernetes | GitHub Actions, but in your cluster |
| **Argo CD** | GitOps continuous delivery — keeps a cluster matching a Git repo | A deployment robot watching Git |
| **Argo Rollouts** | Progressive delivery — canary and blue-green releases | A careful traffic-shifting deployer |
| **Argo Events** | Event-driven triggering from webhooks, queues, schedules | The glue that starts things |

**This document is about Argo Workflows only.**

Worth checking what your lead actually wants, because "we should look at Argo"
usually means one of two very different things:

- *"How do we run pipelines/batch jobs?"* → **Argo Workflows**
- *"How do we deploy our services?"* → **Argo CD**

Your portal currently does neither. CI is GitHub Actions; deployment is not
automated by the portal at all.

## 1.3 Why it exists — the problem it solves

Say you have a job like: fetch data → process it in 50 parallel shards →
aggregate → publish → notify. You want:

- Each step in its own container with its own image and dependencies
- Steps running in parallel where the dependency graph allows
- Retries on the flaky step only
- Files passed between steps
- Visibility into which step failed and its logs
- Resume from the failure rather than rerunning everything

Doing that with plain Kubernetes Jobs means writing the orchestration
yourself. Argo Workflows is that orchestration, as a Kubernetes-native
component.

## 1.4 Kubernetes-native: what that actually means

Argo doesn't run a server that stores workflows in its own database and calls
the Kubernetes API. Instead it **extends Kubernetes itself** with Custom
Resource Definitions (CRDs).

The consequence: a workflow is a Kubernetes object. So

```bash
kubectl get workflows
kubectl apply -f my-pipeline.yaml
kubectl delete workflow my-pipeline-abc123
```

all just work, and workflows can be version-controlled and GitOps'd like any
other manifest. This is the main architectural difference from Jenkins or
GitHub Actions.

## 1.5 The components

| Component | Runs as | Job |
|---|---|---|
| **workflow-controller** | Deployment in the cluster | Watches `Workflow` resources, creates a pod per step, tracks status |
| **argo-server** | Deployment in the cluster | REST/gRPC API + the web UI (default port 2746) |
| **`argo` CLI** | On your machine | Submit, list, watch, retry, fetch logs |
| **executor** | Sidecar in every step pod | Runs the step's command, captures output and artifacts |

The `argo-server` is **optional** — the controller alone will execute
workflows. You need the server for the UI and the REST API, and the REST API
is what a Backstage integration would talk to.

### The reconcile loop

```
 1. You submit a Workflow object      →  Kubernetes API server
 2. workflow-controller sees it       →  reads the DAG / step list
 3. Controller creates a Pod          →  for each step that's ready to run
 4. Executor sidecar runs the step    →  captures stdout, outputs, artifacts
 5. Controller updates .status        →  on the Workflow object
 6. Repeat from 3 until done          →  respecting dependencies
```

Everything lives in the Workflow object's `.status`. That's why `kubectl get
workflow -o yaml` shows you the whole execution history, and why the UI is a
thin view over Kubernetes rather than a separate system of record.

## 1.6 Core concepts

### Resource kinds

| Kind | What it is |
|---|---|
| `Workflow` | **One execution.** Created, runs, finishes, holds its own status. Roughly "a pipeline run." |
| `WorkflowTemplate` | **A reusable, parameterised definition**, namespaced. Doesn't run on its own. Roughly "a pipeline definition." |
| `ClusterWorkflowTemplate` | Same, but cluster-scoped and shareable across namespaces |
| `CronWorkflow` | A `WorkflowTemplate` on a schedule (cron syntax) |
| `WorkflowEventBinding` | Starts a workflow when an event arrives (with Argo Events) |

The `Workflow` / `WorkflowTemplate` distinction matters and maps cleanly onto
something you already know: **`WorkflowTemplate` is to `Workflow` what a
Backstage scaffolder template is to a scaffolder task.** Definition versus
instance.

### Inside a workflow

| Concept | Meaning |
|---|---|
| **`templates`** | The named units of work in a workflow. Confusingly, "template" means this *and* `WorkflowTemplate` — see the warning below |
| **`entrypoint`** | Which template to start with |
| **`parameters`** | Typed string inputs and outputs, passed between steps |
| **`artifacts`** | *Files* passed between steps, via object storage |
| **`steps`** | Sequential list; nested lists run in parallel |
| **`dag`** | Dependency graph — each task declares `dependencies` |
| **`retryStrategy`** | Per-template retries, with backoff |
| **`parallelism`** | Cap on simultaneously running pods |
| **`ttlStrategy`** | Auto-delete finished workflows after N seconds |
| **`onExit`** | Exit handler — always runs, success or failure. Use for cleanup and notifications |
| **`suspend`** | Pause until resumed — this is how you build manual approval gates |

> **Terminology warning.** "Template" is overloaded three ways in this space:
> a `WorkflowTemplate` (a reusable workflow), a `template` (one step inside a
> workflow), and a *Backstage* scaffolder template. When talking to the team,
> say "step" for the second one.

### Template types

A `template` is one of:

| Type | Does |
|---|---|
| `container` | Runs a container image with a command — the workhorse |
| `script` | Inline source (Python, bash, …) run in a container |
| `resource` | Creates/patches a Kubernetes resource and optionally waits on it |
| `dag` | Composes other templates as a dependency graph |
| `steps` | Composes other templates as an ordered list |
| `suspend` | Pauses for a duration, or indefinitely until resumed |
| `http` | Makes an HTTP request without a pod |

## 1.7 Worked examples

### Hello world

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: hello-        # generateName, not name: each run gets a suffix
spec:
  entrypoint: say-hello
  templates:
    - name: say-hello
      container:
        image: alpine:3.20
        command: [echo]
        args: ["hello from Argo"]
```

```bash
argo submit hello.yaml --watch
```

### Sequential and parallel steps

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: build-test-
spec:
  entrypoint: pipeline
  templates:
    - name: pipeline
      steps:
        - - name: install          # step group 1
            template: npm-ci
        - - name: unit-tests       # step group 2 — these two run
            template: run-tests    # IN PARALLEL with each other,
          - name: lint             # but only after step group 1
            template: run-lint

    - name: npm-ci
      container:
        image: node:22-alpine
        command: [sh, -c]
        args: ["npm ci"]

    - name: run-tests
      container:
        image: node:22-alpine
        command: [sh, -c]
        args: ["npm test"]

    - name: run-lint
      container:
        image: node:22-alpine
        command: [sh, -c]
        args: ["npm run lint"]
```

**The nesting rule is the thing to remember:** the outer list `- -` is
sequential, the inner list is parallel. Two dashes means "new step group,"
one dash means "add to the current group, run alongside."

### A DAG with parameters and a retry

Closer to something real — CI for a TEAMOMF node-service:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: WorkflowTemplate      # a definition, not a run
metadata:
  name: teamomf-node-service-ci
spec:
  entrypoint: ci
  arguments:
    parameters:
      - name: repo
      - name: revision
        value: main

  templates:
    - name: ci
      dag:
        tasks:
          - name: checkout
            template: git-clone

          - name: install
            template: npm
            dependencies: [checkout]
            arguments:
              parameters: [{name: cmd, value: "ci"}]

          - name: test
            template: npm
            dependencies: [install]        # test and lint both wait on
            arguments:                     # install, then run in parallel
              parameters: [{name: cmd, value: "test"}]

          - name: lint
            template: npm
            dependencies: [install]
            arguments:
              parameters: [{name: cmd, value: "run lint"}]

          - name: image
            template: build-image
            dependencies: [test, lint]     # waits for BOTH

    - name: git-clone
      retryStrategy:                       # network step: retry it
        limit: "3"
        retryPolicy: OnError
        backoff:
          duration: "10s"
          factor: "2"
      container:
        image: alpine/git:latest
        args: ["clone", "--depth=1", "--branch={{workflow.parameters.revision}}",
               "{{workflow.parameters.repo}}", "/work"]

    - name: npm
      inputs:
        parameters:
          - name: cmd
      container:
        image: node:22-alpine
        workingDir: /work
        command: [sh, -c]
        args: ["npm {{inputs.parameters.cmd}}"]

    - name: build-image
      container:
        image: gcr.io/kaniko-project/executor:latest
        args: ["--context=/work", "--no-push"]
```

Two syntax notes: `{{workflow.parameters.x}}` reads a workflow-level argument,
`{{inputs.parameters.x}}` reads a template's own input. The `npm` template is
defined once and reused three times with different arguments — that
parameterised reuse is a real advantage over copy-pasted CI steps.

### What's missing from that example

It won't actually work as written, and the reason is instructive: **each step
is a separate pod, so `/work` is not shared.** The clone lands in one pod's
filesystem and vanishes. Real workflows solve this one of two ways:

1. **`volumeClaimTemplates`** — a shared PVC mounted into every step. Simple,
   but ties steps to one node's storage class and doesn't scale to fan-out.
2. **Artifacts** — declare outputs and inputs, and Argo copies files through
   object storage between steps. Scales properly, but **requires an artifact
   repository configured** (S3, MinIO, GCS, Azure Blob).

This is the first real operational cost people hit: **you need object storage
before Argo Workflows is useful for anything that passes files between
steps.** Worth stating plainly, because it's usually skipped in demos.

## 1.8 Argo Workflows vs GitHub Actions

Your portal uses GitHub Actions today. Direct comparison:

| | GitHub Actions | Argo Workflows |
|---|---|---|
| **Where it runs** | GitHub-hosted or self-hosted runners | Your Kubernetes cluster |
| **Unit of work** | A job on a runner VM | A pod per step |
| **Definition lives** | `.github/workflows/*.yml` in the repo | A CRD in the cluster (usually GitOps'd) |
| **Triggered by** | Git events, mostly | API, CLI, `CronWorkflow`, Argo Events |
| **Setup cost** | Zero — it's just there | Cluster, controller, object storage, archive DB, RBAC |
| **You operate** | Nothing | All of the above |
| **Cost model** | Per-minute billing | Your cluster's capacity |
| **Best at** | Build, test, release on push | Long-running, heavy fan-out, data/ML pipelines |
| **Weak at** | Long jobs, big fan-out, GPU work | Ordinary "test my PR" CI |
| **Ecosystem** | Huge marketplace of actions | Any container image, no marketplace |

### The honest read for TEAMOMF

**Argo Workflows is not a better GitHub Actions for what you're doing today.**
Your generated services need build-test-on-push, and Actions does that with
zero operational burden. Replacing it with Argo would be strictly more work
for the same result.

Argo Workflows earns its keep when you have:

- Jobs that run for hours (Actions has job timeouts)
- Fan-out to dozens or hundreds of parallel shards
- Steps needing specific hardware — GPUs, high memory
- Data or ML pipelines with real artifact passing
- Scheduled batch work that needs cluster resources
- A compliance reason that work must run inside your own infrastructure

If none of those are true for TEAMOMF yet, the correct recommendation is
"not yet, and here's the trigger that would change my mind." That's a stronger
position than adopting it because it's interesting.

---

# Part 2 — Standing it up locally

The prerequisite chain, in order. Nothing here is installed on the dev machine
today, which is why this can't be a same-day thing.

| # | Step | Time | Notes |
|---|---|---|---|
| 1 | Docker working in WSL2 | 20–40 min | **The hard one.** Docker Desktop with WSL integration usually needs Windows admin rights and a reboot |
| 2 | `kubectl` | 2 min | Single binary |
| 3 | `kind` (or minikube) | 5 min | Single binary. `kind` is lighter |
| 4 | Create a cluster | 5–10 min | Image pulls |
| 5 | Install Argo Workflows | 5–10 min | Several images to pull |
| 6 | Port-forward, submit a workflow | 5 min | |
| 7 | *(Optional)* MinIO for artifacts | 15 min | Needed for anything passing files |

Best case ≈45 minutes. Realistic 1.5–3 hours, because step 1 is where it
goes wrong.

### Outline of steps 3–6

Once Docker works:

```bash
# 3. cluster tooling
kind create cluster --name argo-demo

# 4. namespace + install
kubectl create namespace argo
# Check https://github.com/argoproj/argo-workflows/releases for the current
# version and manifest names before running this — they change between
# releases. quick-start-minimal.yaml includes the server and a MinIO for
# artifacts, which is what you want for a demo.
kubectl apply -n argo -f \
  https://github.com/argoproj/argo-workflows/releases/download/<VERSION>/quick-start-minimal.yaml

kubectl -n argo wait --for=condition=available --timeout=300s \
  deployment/workflow-controller deployment/argo-server

# 5. UI
kubectl -n argo port-forward deployment/argo-server 2746:2746
# → https://localhost:2746  (HTTPS, self-signed — expect a browser warning)

# 6. run something
argo submit -n argo --watch hello.yaml
argo list -n argo
argo logs -n argo @latest
```

> **Do not run this within an hour of a demo.** Step 1 can require a Windows
> reboot. Set it up on a calm afternoon, verify it works, then demo it.

### Cheaper alternatives to evaluate first

- **A managed cluster** — GKE Autopilot, EKS, AKS. Costs money but removes
  step 1 entirely and is closer to how you'd really run it.
- **A shared team dev cluster**, if one exists anywhere in the org. Ask before
  building your own.
- **`k3d`** instead of `kind` — still needs Docker, so it doesn't dodge the
  real blocker.

---

# Part 3 — Integrating it into the TEAMOMF portal

Now the part that matters: given the portal as it exists, what would adding
Argo Workflows actually involve?

## 3.1 The good news

**The Kubernetes plugin is already installed on both ends.** Verified:

| Piece | Where | State |
|---|---|---|
| `@backstage/plugin-kubernetes` (frontend) | `packages/app/package.json:38` | Installed, auto-discovered via `app.packages: all` |
| `@backstage/plugin-kubernetes-backend` | `packages/backend/package.json:29`, registered in `packages/backend/src/index.ts` | Installed and wired |
| `kubernetes:` config stanza | `app-config.yaml:256-257` | **Empty** — a comment and nothing else |

So the plugin is present and unconfigured. That matters a lot, because the
Backstage Kubernetes plugin can display **arbitrary custom resources** — which
means it can display Argo `Workflow` objects with no new plugin, no new
dependency, and no new code. Config and annotations only.

## 3.2 Four integration paths

Ordered by increasing cost. They compose — later paths assume earlier ones.

---

### Path A — Show Argo Workflows via the existing Kubernetes plugin

**Effort: config only (once a cluster exists). Lowest risk.**

Configure the cluster and tell the plugin about Argo's CRDs:

```yaml
# app-config.yaml — replacing the currently-empty kubernetes: stanza
kubernetes:
  serviceLocatorMethod:
    type: multiTenant
  clusterLocatorMethods:
    - type: config
      clusters:
        - name: teamomf-dev
          url: ${K8S_CLUSTER_URL}
          authProvider: serviceAccount
          serviceAccountToken: ${K8S_SA_TOKEN}
          skipTLSVerify: true        # dev only

  # This is the key part: surface Argo's custom resources
  customResources:
    - group: argoproj.io
      apiVersion: v1alpha1
      plural: workflows
    - group: argoproj.io
      apiVersion: v1alpha1
      plural: workflowtemplates
    - group: argoproj.io
      apiVersion: v1alpha1
      plural: cronworkflows
```

Then entities need an annotation so the plugin knows which resources belong to
them — the same annotation-driven pattern as `github.com/project-slug`:

```yaml
# in a skeleton's catalog-info.yaml
annotations:
  backstage.io/kubernetes-id: ${{ values.name }}
```

and the workflow manifests must carry a matching label
(`backstage.io/kubernetes-id: <name>`). Alternatively use
`backstage.io/kubernetes-label-selector` for a custom selector.

**What you get:** a Kubernetes tab on entity pages listing that service's
workflows and their status.

**What you don't get:** the DAG visualisation, per-step logs, retry/resubmit
buttons. It's a resource list, not the Argo UI.

**Also needed:** a Kubernetes ServiceAccount with `get`/`list`/`watch` on
`workflows.argoproj.io`, and a token for it. Give it read-only RBAC — the
portal has no reason to create workflows at this stage.

---

### Path B — A dedicated Argo Workflows frontend plugin

**Effort: days. Needs evaluation first.**

For the real Argo experience inside Backstage — DAG view, step logs,
retry — you need a purpose-built plugin.

**Be careful here, and verify before promising anything:** there is **no
first-party Argo Workflows plugin in Backstage core**. Community plugins
exist, but their maintenance status and compatibility vary. Two specific
things to check before committing:

1. **New frontend system compatibility.** Your app is built on the *new*
   frontend system (`@backstage/frontend-defaults`, `createApp` with
   `features: []`, Blueprints). Many community plugins still target the legacy
   system and would need an adapter or a fork.
2. **Whether it's maintained at all.** Check last commit, open issues, and
   whether it supports current Argo Workflows API versions.

If nothing suitable exists, the fallback is writing one — a frontend plugin
calling the argo-server REST API through a Backstage proxy. That's a real
project, not an afternoon.

**A cheap interim option:** skip the embedded UI and just add a link.
Backstage supports entity links via annotations, so an
`argo-workflows/url` style annotation plus a link on the entity page gets
people to the Argo UI in one click. Not glamorous, 90% of the value of Path B
for a fraction of the cost. Consider this seriously before building anything.

---

### Path C — Scaffolder templates generate Argo manifests

**Effort: small, once A or B exists.**

Your templates already generate `.github/workflows/ci.yml` into every new
service. The same mechanism can emit an Argo `WorkflowTemplate`:

```
templates/node-service/skeleton/
  .github/workflows/ci.yml          ← exists today
  argo/workflow-template.yaml       ← would be added
```

The skeleton file is parameterised exactly like the existing ones:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: WorkflowTemplate
metadata:
  name: ${{ values.name }}-ci
  labels:
    backstage.io/kubernetes-id: ${{ values.name }}   # links it to the entity
spec:
  entrypoint: ci
  # ... steps
```

**Watch the normalisation trap.** This is the same bug class as the
`project-slug` issue: skeleton files are rendered in the `fetch` step, before
anything external has normalised the values. Kubernetes resource names are
stricter than GitHub repo names — lowercase alphanumeric and `-` only, max 253
characters, must start and end alphanumeric. So any name used as a Kubernetes
resource name needs sanitising in the template, not assumed:

```yaml
name: ${{ (values.name | lower | replace(" ", "-")) }}-ci
```

Test this with a deliberately awkward name before trusting it.

**Also decide who applies the manifest.** Generating a file into a repo
doesn't put it in the cluster. Either a GitOps tool (this is what Argo **CD**
is for) syncs it, or CI applies it, or someone runs `kubectl apply`. Don't
leave this implicit — a generated manifest nobody applies is worse than none,
because it looks like it's working.

---

### Path D — Trigger workflows from the portal

**Effort: medium. Do last, and only with a clear reason.**

A custom scaffolder action, e.g. `argo:workflow:submit`, that POSTs to the
argo-server REST API. This would let a template's final step kick off a
pipeline, or let a portal button run a workflow.

This is where your **permission model needs extending**, and it's worth being
precise about how, because it's the part most likely to be done badly.

Today's model (`plugins/teamomf-credentials-backend/src/permissions/`) maps
capabilities onto **permissions that Backstage plugins publish**. The
Kubernetes plugin publishes no granular per-resource permissions, so Path A is
effectively "any signed-in user can see workflows" — consistent with your
deny-nothing-by-default stance for read operations, and probably fine.

Path D is different: **submitting a workflow runs code in your cluster.** That
must be gated. Two options:

1. If a community plugin publishes its own permissions, add capabilities in
   `capabilities.ts` that wrap them — the existing pattern, no new machinery.
2. For a custom action, `actionExecutePermission` already gates scaffolder
   actions, and `scaffolder.execute` already covers it. That may be
   sufficient, but it's coarse: it can't distinguish "create a repo" from
   "run a job in production." A new capability like `argo.workflow.submit`
   would be the honest modelling.

Either way, this is a **security-relevant change** and deserves a design
conversation, not a quick commit.

## 3.3 Suggested phasing

| Phase | Work | Prerequisite | Rough effort |
|---|---|---|---|
| 0 | Decide Workflows vs Argo CD; find a real use case | — | A conversation |
| 1 | Get a cluster (managed, or local Docker+kind) | Docker or cloud access | 0.5–1 day |
| 2 | Install Argo Workflows, run examples by hand | Phase 1 | 0.5 day |
| 3 | **Path A** — config + RBAC + annotations | Phase 2 | 0.5 day |
| 4 | **Path C** — templates emit `WorkflowTemplate` | Phase 3 + a GitOps answer | 0.5 day |
| 5 | **Path B** — evaluate plugins, or add a link annotation | Phase 3 | 1 day to evaluate; days-to-weeks to build |
| 6 | **Path D** — triggering + permission model | Phases 3–5 | 2–3 days incl. design |

**Phase 0 is not a formality.** If the answer is "no use case yet," stopping
there is the right outcome, and knowing why is more valuable than a
half-integrated feature nobody uses.

## 3.4 Files that would change

For reference, mapped onto the real repo:

| File | Change | Path |
|---|---|---|
| `app-config.yaml` | Fill the empty `kubernetes:` stanza; add `customResources` | A |
| `app-config.yaml` | Possibly a `proxy.endpoints` entry for argo-server | B, D |
| `templates/*/skeleton/catalog-info.yaml` | Add `backstage.io/kubernetes-id` | A |
| `templates/*/skeleton/argo/workflow-template.yaml` | New file | C |
| `templates/*/template.yaml` | Pass a sanitised name into the skeleton | C |
| `packages/app/src/App.tsx` | Register an Argo plugin | B |
| `plugins/teamomf-credentials-backend/src/permissions/capabilities.ts` | New Argo capabilities | D |
| `app-config.yaml` → `teamomf.permissions.personas` | Grant them to personas | D |
| *(new)* a custom scaffolder action | `argo:workflow:submit` | D |

Nothing on this list is written today.

---

# Part 4 — Talking points and likely questions

## 4.1 The honest framing

If you have to present this without a running cluster, this is a defensible
and accurate position:

> "Argo Workflows is a Kubernetes-native workflow engine — every pipeline step
> runs as a container, and workflows are Kubernetes custom resources, so
> `kubectl` and GitOps work on them natively. It's not in the portal today,
> and deliberately so: it needs a cluster we don't have, and our current CI
> need — build and test on push — is served well by GitHub Actions with zero
> operational overhead. What I have scoped is the integration path. The
> Kubernetes plugin is already installed in our portal, just unconfigured, so
> the first useful step is config-only: point it at a cluster and register
> Argo's CRDs as custom resources, and workflows show up on entity pages. The
> prerequisite is a cluster, which is a half-day of setup, not an afternoon."

That answers "do you understand it," "have you thought about it," and "what
would it take" — without claiming anything untrue.

## 4.2 Questions to expect

**"Why not use Argo instead of GitHub Actions?"**
For build-test-on-push, Actions is the better tool — no infrastructure to
operate. Argo wins on long-running jobs, heavy parallel fan-out, GPU or
high-memory work, and data/ML pipelines. We don't have those needs yet. If we
get them, the case changes.

**"How hard is the integration?"**
Three levels. Showing workflows on entity pages is config-only, because the
Kubernetes plugin is already installed. Generating Argo manifests from our
templates is a small template change. A full embedded Argo UI is a real
project, because there's no first-party Backstage plugin for it.

**"Do we need Argo CD too?"**
They're independent. Argo CD answers "how does code get deployed"; Argo
Workflows answers "how do pipelines run." If the actual question is about
deployment, Argo CD is the relevant product and this analysis is about the
wrong one.

**"Can you show it running?"**
Not today — it needs a Kubernetes cluster and we don't have one, or any
container tooling on the dev machine. Give me a cluster or half a day to stand
one up locally and I'll demo it properly.

**"What does it cost to run?"**
Cluster capacity, plus object storage for artifacts, plus a Postgres or MySQL
database if you want workflow history retained after the objects are garbage
collected. Plus the ongoing operational burden — upgrades, RBAC, quotas. It is
not free the way a managed CI service is.

**"Isn't this just Jenkins on Kubernetes?"**
Superficially similar, structurally different. There's no persistent
controller holding state in its own database — workflows *are* Kubernetes
objects, so they're declarative, version-controllable, and manageable with the
same tools as everything else in the cluster.

## 4.3 Don't say these

- ~~"We use Argo Workflows"~~ — you don't.
- ~~"It's just a Backstage plugin we can install"~~ — it's a Kubernetes
  controller; the plugin is only the view.
- ~~"Argo will replace our CI"~~ — no plan, no reason, and it'd be a downgrade
  for current needs.
- Anything conflating Argo Workflows with Argo CD.

---

# Part 5 — Glossary

| Term | Meaning |
|---|---|
| **Argo Workflows** | Kubernetes-native container workflow engine |
| **Argo CD** | GitOps continuous delivery. Different product |
| **Argo Rollouts** | Progressive delivery — canary, blue-green. Different product |
| **Argo Events** | Event-driven triggering. Different product |
| **CRD** | Custom Resource Definition — how you teach Kubernetes a new object kind |
| **CR** | Custom Resource — an instance of a CRD |
| **`Workflow`** | One pipeline execution, as a Kubernetes object |
| **`WorkflowTemplate`** | A reusable parameterised workflow definition |
| **`CronWorkflow`** | A scheduled workflow |
| **template** *(Argo)* | One step inside a workflow. Not a `WorkflowTemplate` |
| **entrypoint** | The template a workflow starts with |
| **DAG** | Directed acyclic graph — steps with declared dependencies |
| **artifact** | A file passed between steps via object storage |
| **artifact repository** | Where artifacts live: S3, MinIO, GCS, Azure Blob |
| **executor** | The sidecar that runs a step and captures its output |
| **workflow-controller** | The component that watches `Workflow` objects and creates pods |
| **argo-server** | The REST/gRPC API and web UI. Optional, but needed for integration |
| **workflow archive** | Postgres/MySQL storage of finished workflows for history |
| **exit handler** | `onExit` template that always runs — cleanup, notifications |
| **suspend** | A pause, used to build manual approval gates |

---

## Verify before relying on

Written from general knowledge of Argo Workflows, not from a running cluster
or a live docs check. Confirm these before acting:

- **Current release and manifest filenames** — check
  https://github.com/argoproj/argo-workflows/releases. The
  `quick-start-*.yaml` names and contents change between versions.
- **Which community Backstage plugins exist for Argo Workflows**, whether
  they're maintained, and whether any supports the new frontend system.
- **The exact `kubernetes.customResources` schema** for your installed
  `@backstage/plugin-kubernetes-backend` version (`^0.21.7`) — config schemas
  do shift.
- **Argo's current default executor** and whether it affects anything in your
  cluster setup.

Everything stated about *your repository* — installed packages, the empty
`kubernetes:` stanza, template structure, the permission model — was verified
against the working tree.

---

## See also

- `docs/TEAMOMF-Demo-Walkthrough.md` — the portal as it exists today
- `docs/TEAMOMF-Backstage-Guide.docx` — the written reference
- https://argo-workflows.readthedocs.io/ — upstream documentation
- https://backstage.io/docs/features/kubernetes/ — the plugin Path A uses
