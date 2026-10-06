# ${{ values.name }}

${{ values.description }}

Node.js 22 + Express 5 REST API. Generated from the **TEAMOMF REST API
Service** template.

- Owner: `${{ values.owner }}`
- System: `${{ values.system }}`
- Lifecycle: `${{ values.lifecycle }}`

## Run locally

```bash
npm install
npm start        # http://localhost:3000
npm run dev
npm test
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness and readiness probe |
| `GET` | `/openapi.yaml` | The API contract |
| `GET` | `/${{ values.resource }}` | List ${{ values.resource }} (empty until implemented) |

Full documentation is in [`docs/`](./docs) and is published through Backstage
TechDocs.

## Convention

Changing a route means changing `openapi.yaml` in the same commit -- the
Backstage API entity reads the spec straight from this repository, so drift is
immediately visible.
