# Upload audit v23

## Critical fixes before upload

1. **Symbolic Lab layout**: fixed the missing/low analysis-panel issue by moving analysis output into a right-hand panel on wide screens and into a clear stacked section on smaller screens.
2. **Symbolic plot reliability**: added Plotly fallback support and guarded Plotly resize calls.
3. **Agent Model Atlas visuals**: added compact illustrations for all Agent Lab examples.
4. **Noise reduction**: kept Agent Lab execution-focused; long scenario descriptions remain in Model Atlas and Docs.

## Validation commands

```bash
python3 -m pytest -q tests
node --check src/agent-lab.js
node --check src/symbolic-lab.js
node --check src/math-beauty.js
node --check src/model-workbench-v3.js
node --check src/optimization-lab.js
node --check src/app.js
node --check src/worker.js
node --check src/steady-state-lab.js
node --check src/stochastic/stochastic-lab.js
```

## Manual deployment checklist

- Open `symbolic.html` and confirm editor, plot and analysis are visible without hunting below the fold on desktop.
- Click `Analyze`, `Plot now`, `Export SymPy` and `Copy Python`.
- Open `agent.html?example=fadns_particle`, switch plot mode to `FADNS species tracker`, step, run and export JSON.
- Open `examples.html#agent-atlas` and confirm each Agent example has an illustration.
- Open all pages once after cache refresh.
