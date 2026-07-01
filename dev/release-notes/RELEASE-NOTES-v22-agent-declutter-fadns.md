# v22 — Agent Lab declutter, FADNS tracker and reliability direction

## Main changes

- Reworked Agent Lab as an execution-first page: selectors, visible A-D parameters, run buttons, plot mode and compact status stay on the first screen.
- Moved long model explanations to Docs and Model Atlas.
- Collapsed rule definition, custom rule editor, custom JSON import and approach comparison by default.
- Moved detailed run settings into a collapsible panel.
- Added inline state legend next to the simulation instead of burying it inside the rule text.
- Corrected the FADNS agent example:
  - tracks Acetyl-CoA;
  - tracks Malonyl-CoA;
  - tracks chain intermediates;
  - tracks C14, C16 and C18 products;
  - tracks CoA release/recycling.
- Added FADNS-specific plot mode for substrate, intermediate, product and CoA trajectories.
- Generalized Agent Lab state counting and plotting beyond four hard-coded states.
- Generalized custom rule return range to valid model state indices instead of only 0–3.
- Updated Model Atlas and Docs to carry explanatory material rather than crowding the execution page.

## Audit status

- Python tests: 101 passed.
- JavaScript syntax checks passed for all main lab scripts.
- Local link/image audit passed.
- ZIP integrity passed.
