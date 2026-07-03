# Foko Lab v70.4 UI Consistency and Accessibility Consolidation

## Trigger
User audit screenshots showed three defects that static tests did not catch well enough:

1. Controls and buttons looked selected even when they were only hoverable or decorative.
2. Plot/diagnostic controls in classic labs could stack into unreadable fragments above the graph.
3. Dark-theme documentation and tutorial pages still had contrast regressions.

The uploaded product audit also identified missing anchors, active-state inconsistency, unlabeled controls, duplicated navigation state, and weak UX contracts as P0/P1 release risks.

## Changes implemented

### Visual state contract
- Added `styles/v70-4-consistency.css` as the final override layer.
- Separated hover state from selected state.
- Active tabs/buttons now use a single selected grammar: solid teal fill plus internal active mark.
- Hoverable inactive buttons use outline/soft background only.
- Removed gradient styling from primary action grammar where it made inactive controls look selected.

### Header and active navigation
- Added `syncActiveNavigation()` in `src/navigation.js`.
- The current route now determines one active main navigation item.
- Workbench-related pages activate the Workbench summary rather than random child links.
- `aria-current="page"` is applied to active top-level links.

### Workbench dropdown readability
- Kept the Workbench menu white and high contrast under all themes.
- Strengthened `Workbench IDE` and `Classic / legacy labs` section labels.
- Preserved classic labs inside Workbench instead of removing them.

### Plot toolbar and diagnostics
- Repaired `.plot-toolbar-v2` layout.
- Labels remain above their own select controls and do not stack into the plot region.
- Long tab labels are ellipsized instead of wrapping into vertical fragments.

### Documentation and tutorial contrast
- Forced docs/tutorial/platform surfaces to use theme tokens for background, text, borders and cards.
- Reduced hero heading risk by clamping size.
- CTA buttons in docs/tutorial now follow the same selected/non-selected grammar.

### Accessibility and link correctness
- Added missing hash anchors for workbench metrics/sensitivity/sweep/stability, stochastic examples, SciML atlas and Agent Lab docs.
- Added accessible names to unlabeled inputs/selects/textareas where static markup lacked labels.
- Added v70.4 tests for anchor resolution, control labels, CSS consistency, active navigation sync and plot-toolbar grammar.

## Validation

```bash
python3 -m pytest -q tests
# 211 passed, 271 skipped

for f in src/*.js src/stochastic/*.js; do
  [ -f "$f" ] && node --check "$f"
done
# passed
```

## Remaining technical debt

- The large skipped-test count remains a structural weakness inherited from older release contracts.
- Navigation markup is still duplicated across many HTML files, although active state is now corrected at runtime.
- The CSS is still override-heavy; v70.4 isolates the newest consistency layer but does not yet split the full design system into tokens/base/layout/components/labs/mobile files.
- Workbench custom model authoring still needs deeper parity across CTMC, steady-state, symbolic, agent and SciML workflows.

## Next release recommendation

v70.5 should focus on Workbench clarity:

Choose model → Edit setup → Run → Diagnose → Export.

Controls irrelevant to the selected modeling paradigm should be hidden automatically.
