# UX audit v46 — navigation, color identity, model hierarchy

## Critical inconsistencies found

1. **Workbench duplicated Legacy.**
   The Workbench dropdown listed ODE, Optimization, Steady-State and Stochastic while the Legacy dropdown listed the same four routes. This made the information architecture ambiguous: Workbench looked like another Legacy menu rather than the modern modeling gateway.

2. **Symbolic and Agent were treated as peer navigation items instead of model approaches.**
   The intended structure is: Workbench opens the modeling workspace; the Model area contains the modeling approaches, including Symbolic and Agent. The previous navigation exposed these as separate dropdown entries and made the menu too crowded.

3. **Brand color identity was uneven.**
   Teal existed in some workbench surfaces, but magenta and cyan were weak or absent on many pages. Legacy and public pages looked less like the same product family.

4. **Some public copy still explained internal architecture to the user.**
   Phrases about separation boundaries, teaching-only spaces and protected boundaries were technically useful for maintainers but noisy for normal users.

5. **Agent plot filtering needed a stronger regression contract.**
   FADNS-specific plot modes must never appear for T-cell or general agent models. The implementation already had model-aware filtering, but v46 keeps this as a documented UX rule.

## v46 correction

- Workbench dropdown is now compact: **Workbench · Model · Model Atlas**.
- Legacy remains unchanged: **ODE · Optimization · Steady-State · Stochastic**.
- The Model area in Workbench now contains all modeling approaches: ODE, stochastic, optimization, steady-state, symbolic and agent-based.
- Teal, cyan and magenta are promoted to shared identity variables and applied across public pages, Workbench, Agent Lab and legacy surfaces.
- Public copy was shortened where it exposed internal rationale.

## Remaining risks

- `workbench.html` and `model.html` still share much of the same runtime surface. This is acceptable for compatibility, but the long-term fix is to make `workbench.html` a pure dashboard and `model.html` the execution surface.
- Some older tests still encode historical naming concepts. They were updated for the v46 navigation contract, but future changes should remove obsolete test names rather than keep rewriting expectations.
- Agent Lab is improved, but still needs a small visual state showing which plot modes are available for the selected model before the user opens the dropdown.

## Current score

**88 / 100**

The platform now has a cleaner information architecture and stronger color identity. The main remaining weakness is route duplication between Workbench and Model execution pages.
