# V71.46 — SciML spotlight layout

Purpose: reduce SciML cockpit crowding without touching global chrome, Data/Analysis pages, or focused modeling labs.

Changes:
- Converted the SciML diagnostic grid into a spotlight layout.
- Primary plot becomes the dominant scientific stage.
- Diagnostic and third-analysis plots become a right-side diagnostic rail on wide screens.
- Model artifact moves below the plots as a compact evidence strip instead of competing with the plots.
- Hidden SciML hero and compact CSV card on the cockpit page to recover vertical space.
- Preserved model/data input, upload, LaTeX preview, plot dropdowns, phase controls, and export behavior.

Rationale:
The previous SciML cockpit showed model artifact + three plots in one row. This created crowding and cut plots despite available page width. The new layout uses a "spotlight + diagnostic rail" pattern: one large plot for the current scientific question, two supporting diagnostics, then equations/results below.

Limits:
This release is layout-only for SciML. It does not train PINNs/FNOs/DeepONets in-browser and does not change SciML numerical scope.
