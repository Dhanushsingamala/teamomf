# ${{ values.name }}

${{ values.description }}

Node.js 22 + Express 5. Generated from the **TEAMOMF Node.js Service**
template.

- Owner: `${{ values.owner }}`
- System: `${{ values.system }}`
- Lifecycle: `${{ values.lifecycle }}`

## Run locally

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # auto-reload on change
npm test         # node:test, no test framework dependency
```

Override the port with `PORT`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness and readiness probe |

## Layout

```text
src/
  app.js       Express app factory
  server.js    Process entry point and graceful shutdown
test/          API tests
```

`app.js` is separate from `server.js` so tests can mount the application
without binding a fixed port or installing signal handlers.

## Next steps

1. Add your routes under `src/routes/` and mount them in `app.js`.
2. Keep validation out of route handlers -- see the Orders Service for the
   TEAMOMF convention.
3. Extend `docs/` and list new pages under `nav:` in `mkdocs.yml`. TechDocs
   is already wired up: the `backstage.io/techdocs-ref` annotation is set in
   `catalog-info.yaml` and CI builds the site with `mkdocs build --strict`.
