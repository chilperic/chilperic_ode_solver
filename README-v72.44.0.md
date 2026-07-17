# Foko Lab v72.44.0

Optimization, multi-objective, Steady-State, and sensitivity taxonomy integration.

## Release focus

- Adds the exact requested 15-item Optimization plot and problem catalogues.
- Adds the exact requested 15-item multi-objective plot and problem catalogues.
- Adds the exact requested 15-item Steady-State/algebraic plot and problem catalogues.
- Adds local, global, structural, multi-objective, and steady-state sensitivity categories.
- Labels every capability as browser-computed, derived-browser, limited-browser, export-only, or unavailable.
- Exposes only diagnostics backed by current numerical results in runtime dropdowns.
- Expands Optimization to 17 runnable examples, including Beale, Booth, and two bounded multi-objective benchmarks.
- Preserves the 26 validated Steady-State systems and adds Jacobian-sign, local stiffness, and sequential-scan sensitivity views.
- Renders the same taxonomy in the public Docs page and ships JSON/Markdown references.

## Validation

```bash
npm test
npm run test:reference
npm run test:navigation-hitboxes-offline
npm run test:agent-layout-offline
npm run test:visual-contracts-offline
npm run test:analysis-taxonomy-offline
FOKOLAB_PORT=8095 FOKOLAB_E2E_WORKERS=1 npm run test:e2e
```

The packaged local script starts the server only after all gates pass.
