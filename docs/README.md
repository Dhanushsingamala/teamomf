# TEAMOMF portal explainer material

Two deliverables for introducing the TEAMOMF Developer Portal and Backstage to
the engineering team.

| File | Format | Use it for |
|---|---|---|
| `TEAMOMF-Backstage-Overview.pptx` | PowerPoint, 16:9, 44 slides | A ~25 minute talk, ten sections with divider and statement slides |
| `TEAMOMF-Backstage-Guide.docx` | Word, 21 sections | The written reference people keep after the talk |

Both are generated, not hand-authored, so they can be kept truthful as the
portal changes.

## Regenerating

The generators need `python-pptx` and `python-docx`, which are installed in a
throwaway virtualenv at `~/.venvs/docgen`:

```bash
python3 -m venv ~/.venvs/docgen
~/.venvs/docgen/bin/pip install python-pptx python-docx

~/.venvs/docgen/bin/python docs/_gen_docx.py
~/.venvs/docgen/bin/python docs/_gen_pptx.py
```

## Layout

- `_gen_common.py` — the content model (personas, capabilities, templates,
  security choices, roadmap, glossary) plus the brand tokens, which mirror
  `packages/app/src/modules/theme/tokens.ts`. Edit facts here and both
  deliverables update together.
- `_gen_docx.py` — document layout: styles, tables, code blocks, callouts.
- `_gen_pptx.py` — deck layout: slide templates for title, section divider,
  cards, tables, flows, code and full-bleed statement slides.

Keeping the facts in one file is the point: the deck and the document cannot
disagree with each other, and a change to the persona model is a one-line edit
rather than a hunt through two binaries.
