# V71.14 — scope control and identity wording

## Change shipped

- Replaced the homepage creator tagline with: `Multiscale Modeller | Applied Mathematician | Computational Biology`.
- Replaced the same longer creator lead on the CV/profile surface when present.
- Normalized local cache tokens to `?v=71.46.0`.

## Scope decision

The requested bundle contained ten major architectural/scientific changes:

1. real ODE fitting execution,
2. parameter confidence intervals in ODE plots,
3. uncertainty bands across trajectory labs,
4. tau-leaping and Euler–Maruyama in Stochastic,
5. two-parameter continuation and Hopf/fold classification in Steady-State,
6. Web Worker compute bus,
7. full URL/session persistence across all labs,
8. bundle export/import,
9. full descriptor migration of Workbench and Focused Labs,
10. Playwright end-to-end deploy gate.

These should not be merged in one release. They touch solvers, fitting, stochastic simulation, continuation, app state, I/O, routing, CI, and page migration at once. A single failed assumption would make the platform hard to debug and could break labs that are currently usable.

## Correct next sequence

- V71.15: real ODE fitting execution + parameter confidence intervals only.
- V71.16: uncertainty bands for ODE and stochastic trajectory plots.
- V71.17: Stochastic tau-leaping + Euler–Maruyama UI exposure.
- V71.18: Steady-State 2-parameter continuation + Hopf/fold labels.
- V71.19: platform state persistence + bundle import/export.
- V71.21: worker bus consolidation.
- V71.21+: descriptor migration for Workbench and each Focused Lab, one at a time.
- V71.22: Playwright deploy gate after the migrated pages are stable.

## Validation target

The identity wording change is intentionally small. It prevents a branding regression while preserving the green scientific platform.
