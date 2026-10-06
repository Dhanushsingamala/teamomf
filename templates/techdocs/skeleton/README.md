# ${{ values.title }}

${{ values.description }}

Documentation site generated from the **TEAMOMF Documentation Site** template.
Published through Backstage TechDocs -- read it on the **Docs** tab of
`${{ values.name }}` in the portal rather than browsing the raw Markdown.

- Owner: `${{ values.owner }}`
- System: `${{ values.system }}`

## Layout

```text
mkdocs.yml         TechDocs configuration
docs/
  index.md         Landing page
  adr/             Architecture decision records
catalog-info.yaml  Backstage catalog entity
```

## Preview locally

```bash
python3 -m venv .venv
.venv/bin/python -m pip install mkdocs-techdocs-core
.venv/bin/mkdocs serve
```

Run `mkdocs build --strict` before pushing -- it is the command Backstage
runs, and it fails on broken internal links.
