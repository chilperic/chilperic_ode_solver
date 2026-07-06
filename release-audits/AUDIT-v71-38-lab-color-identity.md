# V71.38 — Per-lab colour identity

## Purpose
Give each compute workspace and each analysis module one signature hue, so a user
always knows which lab they are in — without repainting surfaces, fighting the 14
themes, or adding to the `!important` stack.

## Assessment that led here (state at V71.37)
- Integrity is resolved: V71.27 deleted the dead flat engines, wired the shell
  analysis labs to the tested `src/core/*` APIs, and fixed the ROC / Cook's /
  Sankey bugs. Full suite is green (427 passed).
- Structural debt remains and is the real constraint: the 90-line nav is still
  duplicated across 24 pages, ~575 hand cache-token tokens persist, and `!important`
  has grown to ~3041 (the V71.29–V71.35 cockpit rebuilds inflated it).
- V71.36 proved the lesson: a big-bang single-source nav + 4-group rewrite broke
  the site and was rolled back. Remaining debt must be paid down additively.

Colour identity was therefore built as an **accent-only, additive layer** — the
opposite of a per-lab theme, which would have fought the theme system and the
override stack and risked another rollback.

## Design
Single new stylesheet `styles/lab-identity.css`, loaded LAST so it wins by cascade
order and uses **zero `!important`**. Backgrounds and body text stay theme-driven,
so contrast stays safe on all 14 themes. The hue reaches only five orientation
surfaces:

1. a 3px accent bar on the universal header top edge (renders on all 24 pages);
2. the active top-nav underline + soft tinted pill;
3. the page eyebrow / kicker text;
4. section-title and plot-header rules (left accent tick / underline);
5. the focus ring (accessible, on-brand).

Tokens: `--lab-accent`, `--lab-accent-strong` (AA-legible with white on fills),
and a runtime `--lab-tint` via `color-mix(... transparent)` that composites over
any theme background.

## Palette (13 coloured tools, science-mapped)
- Dynamics (Workbench + ODE): teal `#0e7c86`
- Stochastic: indigo `#4f46e5`
- Optimization: amber `#d97706`
- Steady-state: emerald `#059669`
- Symbolic: violet `#7c3aed`
- Agent: rose `#e11d48`
- SciML: blue `#2563eb`
- Statistics: cobalt `#1d4ed8`
- Curve fitting: teal-green `#0d9488`
- Linear algebra: crimson `#dc2626`
- Networks: bronze `#ea580c`
- ML Toolkit: magenta `#c026d3`
- Mathematical Beauty: gold `#ca8a04`

Informational pages (docs, tutorial, research, cv, contact, acknowledgement,
examples, platform, home) stay theme-neutral by design, so colour signals a
*tool*, not merely a page.

## Data hooks added
- `data-module` on the five analysis pages (they share `data-lab="analysis"`).
- `data-lab` filled on the three pages that previously had none: `cv` (creator),
  `examples`, `research`.
- `styles/lab-identity.css` linked as the last stylesheet on all 24 pages.
  All edits applied idempotently by `tools/apply_lab_identity.py`.

## Tests
- New contract `tests/test_v71_38_lab_color_identity.py` (RED-first): data hooks,
  single-source + last-in-cascade, zero-`!important` guard, distinct accents per
  tool, and surface application.
- Updated two existing contracts to reflect the new, intentional cascade tail:
  `test_v70_7_unified_contracts` (v70-7 is last of the override *stack*, identity
  may follow) and `test_v71_34` token scan (excludes `tools/` dev scripts, as it
  already excludes `tests/`).
- Full result: 427 passed, 271 skipped (Playwright-gated), 0 failed. Node cores
  all green.

## Known limitation
The active-nav underline only appears on pages that hardcode `class="active"`
(currently 5). Marking active state per page is the same fragile 24-file edit
that contributed to the V71.36 rollback, so it is intentionally deferred. The
universal header bar already provides the you-are-here signal on every page. The
proper fix is to set active state in `navigation.js` from `data-lab` at runtime
— a small, single-source follow-up, safe to do on its own.

## Local test command
    python -m pytest tests/test_v71_38_lab_color_identity.py -q
    python -m pytest tests/ -q            # full suite
    for t in tests/js/*.test.js; do node "$t"; done
