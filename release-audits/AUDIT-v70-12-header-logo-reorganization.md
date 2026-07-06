# AUDIT v70.12 — header reorganization and logo redesign

## Objective
Two persistent UX problems remained after v70.11:

1. The header accumulated links without a strong information architecture, so it read like a list of additions rather than a coherent platform navigation.
2. The logo was serviceable but not sufficiently specific to the creator identity and the platform focus on mechanistic modeling, scientific computing and computational biology.

## Changes

### 1. Navigation reorganization
The public header was rebuilt around five clear user intents:

- **Home** — landing page.
- **Modeling** — workbench, ODE, stochastic, optimization, steady-state, symbolic and agent workflows.
- **SciML** — SciML Lab, ML Toolkit and export boundary.
- **Analysis** — statistics, curve fitting, linear algebra and networks.
- **Explore** — Model Atlas, Mathematical Beauty and Research Hub.
- **Learn** — documentation, tutorial, contact and acknowledgement.

This removes the old “mere addition of labs” problem. It now follows the modeling workflow more naturally.

### 2. Dropdown coherence
Dropdowns were rebuilt with:

- visible textual labels,
- section titles,
- compact two-column layout where needed,
- one-column compact layout where clearer,
- stronger hover and active states,
- better small-screen fallback.

### 3. Active-state clarity
Current-page and open-menu states now have stronger pill highlighting and a clear bottom accent.

### 4. Logo redesign
The logo was replaced with a new mark that combines:

- a structured geometric envelope (platform / rigor),
- a trajectory curve (dynamical systems / modeling),
- connected nodes (analysis / computation / networked systems),
- a small leaf cue (biology identity).

The wordmark subtitle now reflects the real scope more clearly:
computational biology, mechanistic modeling and SciML.

## Scope boundary
This release intentionally does **not** rewrite the entire platform layout architecture. The header is still injected into static pages that duplicate surrounding page shells. A full long-term cleanup would centralize the complete shared header/footer into a single reusable template system.
