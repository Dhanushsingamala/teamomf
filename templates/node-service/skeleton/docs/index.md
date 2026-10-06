# ${{ values.name }}

${{ values.description }}

Generated from the **TEAMOMF Node.js Service** template.

| | |
|---|---|
| Owner | `${{ values.owner }}` |
| System | `${{ values.system }}` |
| Lifecycle | `${{ values.lifecycle }}` |

## What exists today

This service was just scaffolded, so it deliberately ships very little:

- `GET /health` -- liveness and readiness probe returning the service name,
  version and uptime

There is no sample data and no placeholder business logic.

## Run locally

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # auto-reload on change
npm test         # node:test, no test framework dependency
```

Override the port with `PORT`.

## Layout

```text
src/
  app.js       Express app factory
  server.js    Process entry point and graceful shutdown
test/          API tests
docs/          This documentation, published as TechDocs
```

`app.js` is separate from `server.js` so tests can mount the application
without binding a fixed port or installing signal handlers.

## Next steps

1. Add your routes under `src/routes/` and mount them in `app.js`.
2. Keep validation out of route handlers -- see the TEAMOMF Orders Service for
   the established convention.
3. Add a page per significant topic here and list it under `nav:` in
   `mkdocs.yml`.
