# TEAMOMF Developer Portal — Build Walkthrough

**What this is:** the story of how the TEAMOMF Developer Portal was built on
Backstage, what each piece does, and how it all connects to GitHub. Written as
the companion to the ~1 hour walkthrough, and as something you can read later
on your own.

**Who it's for:** the TEAMOMF engineering team. No prior Backstage knowledge
assumed.

> **A note on the word "workflow", because it means two different things here.**
> In this project "workflow" refers either to a **GitHub Actions workflow** (a
> `.github/workflows/ci.yml` file that runs CI) or to a **Backstage scaffolder
> template** (the "create a new service" wizard). It does **not** refer to Argo
> Workflows. There is no Argo anything in this project — no Argo Workflows, no
> Argo CD, no Argo Rollouts, no dependency on any of them. If you've seen Argo
> elsewhere, park that mental model; it is unrelated to what follows.

---

## 1. Agenda

| # | Segment | Time | What you'll see |
|---|---|---|---|
| 1 | Why a developer portal | 5 min | The problem Backstage solves |
| 2 | Architecture tour | 10 min | Frontend, backend, and where data lives |
| 3 | Sign in as a real user | 5 min | Custom credential login, not Backstage's default |
| 4 | The custom UI | 10 min | What we replaced and why |
| 5 | Personas & permissions | 10 min | Why your access differs from mine |
| 6 | **Live: create a service** | 10 min | Template → real GitHub repo → catalog entity |
| 7 | GitHub integration | 5 min | The three separate connections |
| 8 | Q&A / what's next | 5 min | |

---

## 2. What the portal is

Backstage is an open-source framework from Spotify for building an internal
developer portal. It is a framework, not a product — you get a plugin system
and a catalog model, and you assemble the portal you actually want.

TEAMOMF's portal does four things today:

1. **Software catalog** — one inventory of every service, API, and doc site,
   each with a real owner.
2. **Software templates (scaffolder)** — pick a template, fill a form, get a
   real GitHub repository with CI already wired up, automatically registered
   in the catalog.
3. **TechDocs** — documentation written as markdown next to the code, rendered
   in the portal.
4. **Persona-based access** — what you can do is derived from the team you're
   actually in.

---

## 3. Architecture

Three layers. A monorepo managed by Yarn workspaces.

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND   packages/app        (React, port 3000)           │
│                                                              │
│  Custom modules we wrote:                                    │
│    nav/    auth/    home/    theme/                          │
│  Backstage plugins we reuse:                                 │
│    catalog   scaffolder   techdocs   search   github-actions  │
└──────────────────────────┬───────────────────────────────────┘
                           │  HTTP
┌──────────────────────────▼───────────────────────────────────┐
│  BACKEND    packages/backend     (Node, port 7007)           │
│                                                              │
│  Stock plugins: catalog, scaffolder, techdocs, auth,         │
│                 permission, search, notifications, k8s        │
│  Our own plugin:                                             │
│    plugins/teamomf-credentials-backend                       │
│      ├── credential store + /login, /logout                  │
│      ├── 'teamomf' auth provider (session → identity)        │
│      ├── TeamomfPermissionPolicy (persona authorization)     │
│      └── yarn teamomf:user CLI                               │
└──────────────────────────┬───────────────────────────────────┘
                           │
         ┌─────────────────┴──────────────────┐
         ▼                                    ▼
  SQLite  .data/db/*.sqlite            GitHub (github.com)
  catalog, scaffolder, auth,           repos, Actions runs,
  credentials, techdocs, …             catalog-info.yaml
```

**Why file-backed SQLite, not in-memory:** the catalog, credentials and
TechDocs state survive a backend restart. See the comment at
`app-config.yaml:97-103`. This is a development choice — production would use
Postgres.

### The one config file that ties it together

`app-config.yaml` is the control panel for the whole portal. The sections that
matter most:

| Section | Line | Controls |
|---|---|---|
| `integrations.github` | ~112 | The service PAT used to read GitHub |
| `auth.providers` | ~147 | Which sign-in and token providers exist |
| `catalog.locations` | ~202 | Everything the catalog ingests |
| `catalog.rules` | ~186 | Which entity kinds are allowed in |
| `teamomf.permissions.personas` | ~264 | Who can do what |
| `app.extensions` | — | Home page widget placement |

---

## 4. How we got here, step by step

Roughly the order the work happened in. Each step is independently
demonstrable.

### Step 1 — Scaffold and strip the demo data

Started from `npx @backstage/create-app`. The default app ships sample
entities (`example-website`, `example-grpc-api`, a `guest` user) that look
convincing and would have made the portal a demo rather than a tool. Those
locations are deliberately **not** registered — with a comment explaining why,
so nobody re-adds them by accident (`app-config.yaml:203-207` and `245-249`).

**Principle we held throughout: no placeholder data anywhere.** Every entity in
the catalog corresponds to something real. Where there's nothing to show, a
card says so and explains what would make data appear.

### Step 2 — Model the organisation

`catalog/teamomf-org.yaml` defines **7 Groups** and the real people in them.
`catalog/teamomf-systems.yaml` defines the `teamomf-platform` System.

The key design decision: **a Group is both the team and the permission
boundary.** There is no separate role entity and no RBAC plugin. Membership
lives in `spec.memberOf` on the User entity.

Users are added by CLI, never hand-edited:

```bash
yarn teamomf:user add      # prompts, writes credential + catalog entry
yarn teamomf:user list
yarn teamomf:user check    # explain a user's effective permissions
yarn teamomf:user remove <username>
```

### Step 3 — Custom credential sign-in

Backstage's default is a guest login or an OAuth provider. We wanted real
usernames and passwords owned by TEAMOMF, so we wrote
`plugins/teamomf-credentials-backend`:

- `service/router.ts` — `POST /login`, `POST /logout`
- `auth/password.ts` — password hashing
- `auth/session.ts` + `sessionKeyService.ts` — signed sessions
- `service/loginThrottle.ts` — brute-force protection
- `database/CredentialsStore.ts` — the credential store
- `auth/authenticator.ts` — turns a valid session into a Backstage identity
  backed by a **real catalog User entity**

That last point is what makes permissions work: the sign-in resolver reads the
user's `spec.memberOf` from the catalog and puts it on the identity token as
`ownershipEntityRefs`. The browser never gets to assert group membership.

### Step 4 — Personas and permissions

`plugins/teamomf-credentials-backend/src/permissions/`

The model has two levels, deliberately:

- **Capability** — a named bundle of real Backstage permissions, defined in
  `capabilities.ts`. Seven of them today.
- **Persona** — a catalog Group plus the capabilities it grants, configured in
  `app-config.yaml` and read by `personas.ts`.

| Capability | Means |
|---|---|
| `template.read` | Open a template, see its parameters and steps |
| `scaffolder.execute` | Create a service from a template |
| `scaffolder.cancel` | Cancel a running scaffolder task |
| `template.manage` | Administer templates |
| `catalog.entity.refresh` | Force an entity to refresh from source |
| `catalog.entity.write` | Create or delete catalog entities |
| `catalog.location.manage` | Register or remove catalog locations |

Current personas: **Developers** and **Tech Leads** get `'*'` (everything);
**Engineering Managers** get oversight capabilities (browse templates, refresh
entities) but cannot create repos or mutate the catalog; **Finance** and **HR**
have no entry at all, which means read-only.

Three decisions worth defending if asked:

1. **Deny-by-default was rejected.** Only permissions listed in
   `capabilities.ts` are gated; everything else — catalog read, search,
   TechDocs, settings — is allowed for any signed-in user. A portal that hides
   the catalog isn't useful, and it means installing a new plugin can never
   silently lock everyone out.
2. **A typo fails startup.** An unknown capability name throws rather than
   being ignored. Silently granting less is discovered when someone is wrongly
   denied; silently granting more is never discovered at all.
3. **Tech Lead == Developer, on purpose.** Backstage publishes no permission
   meaning "approve" or "own a team", so we didn't invent a distinction we
   couldn't enforce. The comment in `app-config.yaml:300-306` says so.

### Step 5 — The custom UI

Covered in detail in section 5 below.

### Step 6 — Software templates

Three templates under `templates/`, each registered as its own catalog
location so a broken one can't stop the others (`app-config.yaml:229-239`):

| Template | Produces |
|---|---|
| `node-service` | Express service, CI, TechDocs, catalog entity |
| `api-service` | Same plus `openapi.yaml` and a registered **API** entity |
| `techdocs` | A documentation-only site |

### Step 7 — GitHub integration

Covered in section 7 below.

### Step 8 — Explainer material

`docs/` holds a 44-slide deck and a 21-section written guide, both
**generated** from `docs/_gen_common.py` rather than hand-authored, so the
facts can't drift apart between the two. See `docs/README.md`.

---

## 5. From the default UI to the TEAMOMF UI

This is the part people ask about most, so it's worth being precise: we did
not restyle Backstage's default pages. We **replaced extensions** using
Backstage's new frontend system.

The mechanism: `packages/app/src/App.tsx` registers feature modules.

```tsx
export default createApp({
  features: [
    catalogPlugin,
    githubActionsPlugin,
    navModule,     // sidebar
    homeModule,    // home page layout + widgets
    authModule,    // sign-in page
    themeModule,   // light/dark themes
  ],
});
```

Each of the four custom modules replaces something Backstage shipped:

| Module | Replaces | Files |
|---|---|---|
| `modules/theme` | Both built-in themes | `index.tsx`, `teamomfTheme.ts`, `tokens.ts`, `TeamomfPageLayout.tsx` |
| `modules/auth` | Default sign-in page | `TeamomfSignInPage.tsx`, `TeamomfBrand.tsx` |
| `modules/nav` | Default sidebar | `Sidebar.tsx`, `LogoFull.tsx`, `LogoIcon.tsx`, `SidebarLogo.tsx` |
| `modules/home` | Default home page | `homeModule.tsx`, `HomeLayout.tsx`, `widgets/`, `hooks/` |

### The theme override trick

`modules/theme/index.tsx` registers themes using the **same extension IDs** as
Backstage's built-ins (`theme:app/light`, `theme:app/dark`). Same ID means
override, not addition — so the default Backstage look isn't reachable
anywhere in the app, and Settings → Appearance shows "TEAMOMF Light" and
"TEAMOMF Dark" rather than four options.

### Design tokens

`modules/theme/tokens.ts` is the single source of truth for the palette —
there are no colour literals in components. The palette is India-inspired but
restrained by rule:

- **Navy** `#000080` (from the Ashoka Chakra blue) carries the application
- **Saffron** `#FF9933` is accent only — selection, focus, emphasis
- **Green** `#138808` is success state only

Saffron and green are never used for large surfaces. There's also
`saffronText` `#9A4F00`, a darkened saffron that reaches 4.5:1 contrast on
white, because raw saffron fails accessibility as text.

### The home page

`homeModule.tsx` registers a custom layout plus **nine widgets**: Overview,
Quick actions, Your role & access, Owned by you and your teams, Services &
components, APIs, Documentation, Software templates, Source repositories.

Two things to point out in the demo:

- **Every widget renders live data** from the catalog or your identity. No
  placeholder metrics.
- **"Your role & access"** (`widgets/Access.tsx`) shows your persona and the
  live permission decisions that follow from it. Sign in as two different
  people and the card genuinely differs — that's the permission policy being
  queried in real time, not a hardcoded label.

The custom layout exists because the stock widget grid ignored the configured
layout at some window widths. Placement is configured in `app-config.yaml`
under `app.extensions → page:home → defaultConfig`, keyed by each widget's
`name` param.

---

## 6. The scaffolder workflow, end to end

What happens when someone clicks **Create**. Using `node-service` as the
example; the other two are the same shape.

```
  1. USER fills the form
     └─ templates/node-service/template.yaml  (parameters)
        Name, description, owner, system, lifecycle, repo location

  2. PERMISSION CHECK
     └─ TeamomfPermissionPolicy: do you hold scaffolder.execute?
        Finance/HR stop here.

  3. BROWSER asks GitHub for a token on your behalf
     └─ requestUserCredentials → secretsKey: USER_OAUTH_TOKEN
        additionalScopes: github: [repo, workflow]

  4. STEP 'fetch'  —  action: fetch:template
     └─ Renders templates/node-service/skeleton/** with your answers
        Produces src/, test/, docs/, catalog-info.yaml,
        .github/workflows/ci.yml, mkdocs.yml

  5. STEP 'publish'  —  action: publish:github
     └─ Creates the real GitHub repo, defaultBranch: main,
        pushes the first commit AS YOU (your OAuth token, not a shared PAT)

  6. STEP 'register'  —  action: catalog:register
     └─ Registers repoContentsUrl + /catalog-info.yaml as a catalog location

  7. OUTPUT LINKS
     └─ "Repository" → GitHub    "Open in the TEAMOMF catalog" → entity page
```

**Why per-user credentials instead of a shared PAT:** the repository and its
first commit are attributed to the real person who ran the template, not to a
robot account. The trade-off is that each developer consents to the OAuth
scopes once. The comment at `templates/node-service/template.yaml:81-83`
records this choice.

**The ordering detail that matters** (and that bit us — see section 9):
`catalog-info.yaml` is rendered in step 4, *before* the repo exists in step 5.
So anything in the skeleton that needs to know the real repo name is working
from your form input, not from GitHub's answer.

---

## 7. How GitHub is connected

There are **three separate GitHub connections** doing three different jobs.
Conflating them is the main source of confusion, so they're worth separating
explicitly.

| # | Connection | Configured in | Used for |
|---|---|---|---|
| 1 | **Service PAT** `${GITHUB_TOKEN}` | `app-config.yaml:112-117` (`integrations.github`) | Backend reading `catalog-info.yaml` from `url:` locations |
| 2 | **GitHub OAuth app** | `app-config.yaml:162-165` + `plugin-auth-backend-module-github-provider` | Getting a **short-lived token on the signed-in user's behalf** |
| 3 | **GitHub Actions plugin** | `githubActionsPlugin` in `App.tsx` | The CI/CD tab, reading real workflow runs |

### Connection 2 is not a sign-in method

This surprises people, so state it plainly: **GitHub OAuth is deliberately not
a way to log into TEAMOMF.** The sign-in page only offers credential login.
GitHub OAuth exists purely so `scmAuthApi` can obtain a GitHub token for two
consumers — the scaffolder (to create repos as you) and the GitHub Actions
plugin (to read your workflow runs). The consent popup appears the first time
you open a CI/CD tab or run a template, *not* at sign-in. This is documented
in `app-config.yaml:156-161` and again in `packages/backend/src/index.ts`.

### How the CI/CD tab finds the right repo

The GitHub Actions tab only appears on entities carrying the
`github.com/project-slug` annotation. Given `owner/repo`, the plugin calls
`GET /repos/{owner}/{repo}` to find the default branch, then lists workflow
runs.

Templates generate that annotation in the skeleton's `catalog-info.yaml`:

```yaml
github.com/project-slug: ${{ (values.destination.owner + "/" + values.destination.repo) | replace(" ", "-") }}
```

The `replace(" ", "-")` is not decoration — see section 9.

---

## 8. File map: what's responsible for what

### Configuration
| Path | Responsibility |
|---|---|
| `app-config.yaml` | Everything: integrations, auth, catalog locations, personas |
| `catalog/teamomf-org.yaml` | 7 Groups + real users. Written by `yarn teamomf:user` |
| `catalog/teamomf-systems.yaml` | The `teamomf-platform` System |

### Frontend — `packages/app/src/`
| Path | Responsibility |
|---|---|
| `App.tsx` | Registers plugins and the four custom modules |
| `modules/theme/tokens.ts` | The palette. Single source of truth |
| `modules/theme/teamomfTheme.ts` | Light + dark themes built from tokens |
| `modules/theme/index.tsx` | Overrides Backstage's built-in themes by ID |
| `modules/auth/TeamomfSignInPage.tsx` | Credential login form |
| `modules/nav/Sidebar.tsx` | Custom sidebar |
| `modules/home/homeModule.tsx` | Registers the 9 home widgets |
| `modules/home/HomeLayout.tsx` | Custom widget grid |
| `modules/home/widgets/Access.tsx` | Live persona + permission display |
| `modules/home/widgets/CatalogCards.tsx` | Services, APIs, Docs, Templates, Repos |
| `modules/home/hooks/useCatalogEntities.ts` | Catalog queries |
| `modules/home/hooks/useIdentity.ts` | Signed-in user + groups |

### Backend — `packages/backend/src/index.ts`
Wires ~20 plugins. The three TEAMOMF-specific lines:
```ts
backend.add(teamomfCredentialsPlugin);              // credential store + /login
backend.add(authModuleTeamomfCredentialsProvider);  // session → identity
backend.add(permissionModuleTeamomfPolicy);         // replaces stock allow-all
```

### Our plugin — `plugins/teamomf-credentials-backend/src/`
| Path | Responsibility |
|---|---|
| `service/router.ts` | `POST /login`, `POST /logout` |
| `service/loginThrottle.ts` | Brute-force protection |
| `auth/password.ts` | Password hashing |
| `auth/session.ts`, `sessionKeyService.ts` | Signed sessions |
| `auth/authenticator.ts` | Session → Backstage identity via catalog User |
| `database/CredentialsStore.ts` | Credential persistence |
| `permissions/capabilities.ts` | The 7 capabilities → real permissions |
| `permissions/personas.ts` | Group → capabilities, read from config |
| `permissions/TeamomfPermissionPolicy.ts` | The policy itself |
| `cli/main.ts` | `add` / `list` / `remove` / `check` |
| `cli/checkPersona.ts` | Explains a user's effective permissions |
| `cli/orgCatalog.ts` | Reads and writes `teamomf-org.yaml` |

Tested: `password`, `session`, `CredentialsStore`, `loginThrottle`,
`orgCatalog`, `TeamomfPermissionPolicy`.

### Templates — `templates/<name>/`
| Path | Responsibility |
|---|---|
| `template.yaml` | Form parameters + the fetch/publish/register steps |
| `skeleton/catalog-info.yaml` | The entity that will be registered |
| `skeleton/.github/workflows/ci.yml` | CI for the generated service |
| `skeleton/mkdocs.yml`, `skeleton/docs/` | TechDocs source |
| `skeleton/src/`, `skeleton/test/` | The service itself |
| `skeleton/openapi.yaml` | *(api-service only)* Contract, referenced by `$text` |

Worth noting on `api-service`: the API entity's `definition` uses
`$text: ./openapi.yaml` rather than an inlined copy, so the catalog can't drift
from the shipped contract.

---

## 9. Two real bugs, and what they teach

Both were hit and fixed while preparing this. They're good demo material
because they're the kind of thing you only learn by shipping.

### Bug 1 — "refusing to allow an OAuth App to create or update workflow"

**Symptom:** creating a service failed with
`One or more branches were not updated: refs/heads/main`.

**Cause:** GitHub has a hard rule — an OAuth token cannot write any file under
`.github/workflows/` unless it carries the `workflow` scope. Our templates
requested only `repo`, and every skeleton ships a `ci.yml`. The repo got
created and the push was rejected.

**Fix:** `additionalScopes: github: [repo, workflow]` in all three templates.
Users re-consent once.

**Lesson:** GitHub scopes are not all-or-nothing, and `repo` does not imply
`workflow`.

### Bug 2 — `HttpError: Not Found` on the CI/CD tab

**Symptom:** the entity page loaded but the CI/CD tab threw `Not Found` from
`GithubActionsClient.getDefaultBranch`.

**Cause:** a repo had been created by typing `omf documentation` — with a
space — into the repo name field. GitHub **silently normalises** that to
`omf-documentation`. But `catalog-info.yaml` is rendered in the `fetch` step
*before* `publish` runs, so it baked in the raw input. The annotation said
`Dhanushsingamala/omf documentation`, the repo was
`Dhanushsingamala/omf-documentation`, and `GET /repos/...` 404'd.

The tell: `source-location` was *correct* (it comes from the publish output,
i.e. the real repo) while `project-slug` was wrong. Two annotations on the
same entity disagreeing about the repo name.

**Fix:** `| replace(" ", "-")` on the slug in all three skeletons, verified
against multi-space names.

**Lesson:** when a template renders a value *before* the external system has
normalised it, the template owns the normalisation. Also: use hyphens in repo
names.

---

## 10. Live demo run order

Keep to this order — each step sets up the next.

1. **Sign in** with a real TEAMOMF credential. Point out: no guest login, no
   "Sign in with GitHub".
2. **Home page.** Nine live widgets. Stop on **Your role & access**.
3. **Catalog.** Open a component → Overview, Docs, CI/CD tabs.
4. **Create → node-service.** Use a hyphenated name (`omf-orders-service`).
   Narrate the three steps as they run: fetch, publish, register.
5. **Open the new GitHub repo.** Real repo, first commit attributed to you,
   CI workflow present.
6. **Open in the TEAMOMF catalog.** The entity exists with no manual
   registration.
7. *(If time)* Sign in as a Finance or HR user — Create is gone. Same portal,
   different capabilities.

### Before you start
- Backend restarted, so template edits are loaded
- GitHub OAuth consent already granted, so no popup mid-demo
- A pre-created working repo open in a tab, as a fallback
- Decide the repo name in advance — **hyphens, no spaces**

### If something fails live
Don't debug. Say what it is in one sentence, switch to the pre-created repo,
and continue in the catalog. If a repo creation half-fails, the repo *was*
created — change the name rather than retrying, or you'll hit "already
exists", which looks worse.

---

## 11. Honest current state

Worth saying out loud rather than being asked:

- **Dev-grade persistence.** SQLite on local disk. Production needs Postgres.
- **Secrets from the environment.** `GITHUB_TOKEN`,
  `AUTH_GITHUB_CLIENT_ID/SECRET` are env vars; there's no secret manager.
- **`backend.auth.keys` is commented out** in `app-config.yaml:79-81`.
  Service-to-service auth needs configuring before this leaves a laptop.
- **The guest auth provider is still registered** in
  `packages/backend/src/index.ts` even though the sign-in page doesn't offer
  it. Harmless today, worth removing.
- **Two users, seven groups** in the org catalog. It's real, it's just small.
- **Tech Lead and Developer are identical** — deliberate, see section 4.
- **Kubernetes plugin is wired but unconfigured.** `kubernetes:` in
  `app-config.yaml` is an empty stanza.
- **One entity is pinned to `master`**
  (`teamomf-orders-service`) while templates now set `defaultBranch: main`.
  Pre-dates the current template; its Docs tab may 404.

---

## 12. Glossary

| Term | Meaning |
|---|---|
| **Entity** | Anything in the catalog: Component, API, System, User, Group, Template |
| **Component** | A service or app |
| **System** | A group of related components |
| **`catalog-info.yaml`** | The file in a repo that describes its entities |
| **Location** | A place the catalog reads entities from (`file:` or `url:`) |
| **Annotation** | Metadata on an entity, e.g. `github.com/project-slug` |
| **Scaffolder** | The "create a new service" engine |
| **Template** | A scaffolder definition: form parameters + steps |
| **Skeleton** | The file tree a template renders |
| **Action** | One step a template can run, e.g. `publish:github` |
| **TechDocs** | Markdown-in-repo docs rendered in the portal |
| **Capability** | *TEAMOMF term.* A named bundle of Backstage permissions |
| **Persona** | *TEAMOMF term.* A catalog Group plus its capabilities |
| **Frontend module** | A unit of frontend extensions, how we override defaults |
| **Blueprint** | The factory for a specific extension kind |

### And once more, on Argo

**Nothing in this project uses Argo.** Not Argo Workflows, not Argo CD, not
Argo Rollouts. CI for generated services is **GitHub Actions**. Deployment is
not automated by this portal at all. If Argo comes up as a future direction,
it would be a new integration, not a change to something already here.

---

## Further reading

- `docs/TEAMOMF-Backstage-Overview.pptx` — 44-slide deck, ~25 min talk
- `docs/TEAMOMF-Backstage-Guide.docx` — 21-section written reference
- `docs/README.md` — how both are generated from `_gen_common.py`
- https://backstage.io/docs — upstream documentation
