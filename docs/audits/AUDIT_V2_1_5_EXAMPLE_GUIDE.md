# Chilperic ODE v2.1.5 — Example guide and attribution audit

## Scope
This update separates model documentation from the main workbench. The interface keeps core examples compact, while `examples.html` provides model descriptions, author/inspiration attribution, and usage notes.

## Changes
- Added `examples.html` as a dedicated model guide page.
- Added `Examples` to the top navigation next to `Docs`.
- Added author/inspiration metadata for core, additional, parametric, and optimization examples.
- Displayed author metadata in the additional-example cards.
- Added author metadata to the selected example narrative in the main workbench.
- Linked the additional-example panel to the example guide.
- Updated documentation to point to the dedicated example guide.

## Design decision
The main workbench should not carry long historical or scientific descriptions. It should show only the minimum needed to load, run, and inspect models. The dedicated example guide carries scientific context and attribution.

## Boundaries
- FA metabolism is represented as an exploratory browser model inspired by the thesis structure, not a calibrated reproduction of the full thesis model.
- Braess, Ziegler, Love/Hate, and Calvin-cycle examples are reduced pedagogical models.
