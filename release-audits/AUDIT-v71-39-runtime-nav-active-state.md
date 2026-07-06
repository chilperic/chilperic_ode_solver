# Foko Lab v71.39 — runtime navigation active-state

Scope: small, reversible navigation repair only.

Changes:
- Added a data-driven active-state resolver in `src/navigation.js`.
- Active menu selection now reads `body[data-lab]`, `body[data-module]`, and the current page filename.
- No header rewrite, no generated chrome, no global menu restructuring.
- Preserved the v71.38 lab color identity baseline.

Mappings:
- `data-lab="analysis"` plus statistics/fitting/linalg/networks pages marks Data / Analysis.
- `data-lab="ode|stochastic|optimization|steady"` marks Focused Labs.
- `data-lab="model-workbench|symbolic|agent"` marks Modeling.
- `data-lab="sciml"` and `ml.html` mark SciML.
- Learn, Explore and Creator pages are resolved from their page filenames.

Rationale:
This implements the smallest safe next move after the v71.36 post-mortem: fix runtime active state without touching global chrome structure.
