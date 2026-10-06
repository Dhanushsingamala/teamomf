# ${{ values.name }}

${{ values.description }}

Generated from the **TEAMOMF REST API Service** template.

| | |
|---|---|
| Owner | `${{ values.owner }}` |
| System | `${{ values.system }}` |
| Lifecycle | `${{ values.lifecycle }}` |

## What exists today

This service was just scaffolded, so it deliberately ships very little:

- `GET /health` -- liveness and readiness probe
- `GET /openapi.yaml` -- the API contract, served from the repository
- `GET /${{ values.resource }}` -- returns an empty collection

The `${{ values.resource }}` store is an in-memory placeholder that starts
empty. It holds no sample data, and everything is lost when the process stops.

## Run locally

```bash
npm install
npm start        # http://localhost:3000
npm test
```

## Next steps

1. Implement real persistence in place of the in-memory array in `src/app.js`.
2. Add the remaining routes and keep `openapi.yaml` updated in the same commit.
3. Record any significant architectural decision as an ADR under `docs/adr/`.
