# ${{ values.title }}

${{ values.description }}

| | |
|---|---|
| Owner | `${{ values.owner }}` |
| System | `${{ values.system }}` |

## About this site

Generated from the **TEAMOMF Documentation Site** template. It is built with
MkDocs and published through Backstage TechDocs, so it renders on the **Docs**
tab of this component in the portal.

This page is a starting point -- replace it with real content.

## Writing docs

Add a Markdown file under `docs/` and list it in the `nav` section of
`mkdocs.yml`. Anything not in `nav` will not appear in the sidebar.

Preview locally with the same toolchain Backstage uses:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install mkdocs-techdocs-core
.venv/bin/mkdocs serve      # http://localhost:8000
```

`mkdocs build --strict` is what Backstage runs, and `--strict` fails on broken
internal links -- run it before pushing.

## Decisions

Significant decisions belong in `docs/adr/` as numbered records. See
[ADR 001](adr/001-record-architecture-decisions.md).
