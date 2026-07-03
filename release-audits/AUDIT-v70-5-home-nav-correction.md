# Foko Lab v70.5 — Home page and navigation correction

## Trigger
User screenshots showed that v70.4 still violated the v70.3 audit direction:

- The Workbench dropdown opened as a large mostly blank panel; section labels were visible but the actionable links were not reliably visible.
- The home page looked like an IDE/scientific tool screen instead of a proper product landing page.
- Open/hover/selected navigation states were visually too similar, making users unsure what was selected.
- The visible `Classic / legacy labs` wording was weak and visually inconsistent.

## Applied corrections

### Home page
- Replaced the IDE-mock dashboard on `index.html` with a proper landing page.
- Added a clear product statement: `Choose a model. Change assumptions. Run diagnostics. Export serious code.`
- Added three unambiguous entry routes: Open Workbench, Run SIR example, Browse Model Atlas.
- Restored a proper creator/profile card without overlapping the modeling workflow.
- Kept the platform identity scientific, but removed the fake editor/plot preview from the homepage.

### Workbench dropdown
- Added `styles/v70-5-home-nav.css` as the final correction layer.
- Forced dropdown layout to a simple visible flex-column structure.
- Forced menu items, labels, icons, and descriptions to be visible with explicit color, opacity, visibility, and display rules.
- Replaced `Classic / legacy labs` with `Standalone labs` to avoid implying deprecated or broken tools.

### Active state clarity
- Separated selected page state from hover/open state.
- Open dropdown no longer uses the same visual grammar as the active/current page state.

### Tests
- Updated release token checks to `70.5.0`.
- Added `tests/test_v70_5_home_nav_correction.py`.
- Updated old v70 IDE-dashboard expectations to match the corrected product-home direction.

## Validation

```bash
python3 -m pytest -q tests
# 215 passed, 271 skipped

for f in src/*.js src/stochastic/*.js; do
  [ -f "$f" ] && node --check "$f"
done
# passed
```

## Remaining hard issue
The header is still duplicated across static pages. Runtime CSS and JavaScript now repair the most visible symptoms, but the v70.3 audit remains correct: the navigation should become one shared generated/injected component in a later consolidation release.
