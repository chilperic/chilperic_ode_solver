# Foko Lab docs/tutorial standard audit

## Objective

Correct the documentation and tutorial so they match the current product architecture:

- current online legacy labs remain available;
- the new workbench is the no-scroll analysis surface;
- Model Atlas is the recommended launcher;
- Docs define standards;
- Tutorial gives action-based, testable workflows.

## Result

`docs.html` was rebuilt as a structured operating-standard reference. It now explains:

- product surfaces: Model Atlas, Workbench, Legacy Labs, Docs/Tutorial;
- Model Atlas routing: Open in Workbench vs Open in lab;
- Workbench standard: model header, parameter strip, analysis cards, details drawer;
- analysis card catalogue for ODE, stochastic, steady-state, and optimization;
- GSA/sensitivity terminology;
- export and trust rules.

`tutorial.html` was rebuilt as an action-based guide. It now includes:

- surface choice: Workbench vs Legacy Lab;
- SIR workbench path;
- Model Atlas route checks;
- stochastic, steady-state, and optimization paths;
- export path;
- failure checklist.

## Navigation standard

The top navigation remains:

Home · ODE Lab · Optimization Lab · Steady-State Lab · Stochastic Lab · Model Atlas · Docs · Tutorial

No Workbench link was added to the top navigation. Workbench remains accessible from Model Atlas and internal tutorial/doc links.

## Validation

Validated:

- no duplicate HTML IDs in `docs.html` and `tutorial.html`;
- all local links in both pages resolve to an existing file;
- top navigation labels are preserved;
- Node syntax checks for active JavaScript files pass;
- pytest package tests pass;
- ZIP integrity passes.

## Remaining limitation

Full visual browser regression testing still needs a real Playwright/Chromium environment. Static and route checks pass, but final visual judgment should be performed locally.
