# Foko Lab v70.8 — Home fixes + platform expansion audit

Two parts: the concrete fixes shipped in v70.8, and a deep, grounded audit of
the existing labs plus a ranked, honest feasibility map for the additions you
asked about (statistics, fitting, linear algebra, graph theory, ML, "AI").
Everything below is read off the actual v70.7 source, not assumed.

---

## Part 1 — v70.8 fixes

1. **Mathematical Beauty restored to the home body.** The v70.6/v70.7
   rationalization rebuilt `<main class="home-v705">` and demoted Mathematical
   Beauty to a footer-only link. It is back as a real card in the home paradigm
   grid, alongside the labs.
2. **Personal website linked from the home.** `https://chilperic.github.io/index.html`
   is now in the creator-profile block (previously it existed only inside
   contact.html), `target="_blank"` + `rel="noopener"`.
3. **`.gitignore` restored.** The v70.7 package shipped without it, which is why
   the suite arrived with two red tests (`test_v51`, `test_v53` both require it).
   Restored with the required patterns; suite is green again.

Contract: `tests/test_v70_8_home_beauty_website.py` (6 tests, all were red before
the fix). Suite: 230 passed, 271 skipped.

---

## Part 2 — Lab control audit (initial conditions, ranges, plots, dynamics, flexibility)

The platform is already strong: Plotly rendering with a canvas fallback, a real
solver suite (`rk45 rk4 euler bdf radau lsoda dop853`, i.e. stiff-capable),
per-parameter `min/max/step/vary/bounds` with sweeps, and 10 scientific palettes
(viridis, cividis, turbo, plasma, colorblind-safe, …). Per lab:

**Workbench (ODE / Stochastic / Optimization / Steady-State flagship)**
- Controls: model JSON (`vars, params, init, eqs, tspan, method`), `t start`,
  `t end`, `steps`, primary output, plot palette.
- Analyses: time course, phase portrait, parameter sweep, 2D heatmap/contour,
  GSA/sensitivity, sensitivity heatmap, equation math, diagnostics.
- Gaps that limit flexibility: initial conditions are editable but there is **no
  IC sweep / basin-of-attraction map** (only parameter sweep); **no live sliders
  that re-solve on drag** (sweeps are discrete); **no experimental-data overlay**
  on a trajectory outside SciML/inverse; **no uncertainty bands** for ODE;
  phase portrait is 2D only (no 3D for Lorenz-type); no nullcline/vector-field
  overlay in the workbench itself.

**ODE lab (legacy `app.js`)** — ODE + parametric ODE; outputs max/final/min/mean;
`rk45/rk5` only. Weaker than the workbench (no stiff solvers, fewer plots). It is
effectively superseded by the workbench; consider folding it in.

**Stochastic lab** — CTMC/Gillespie; ensemble / mean / single / mean-field /
diagnostic / metrics; distribution plots. Gaps: exact Gillespie only (**no
tau-leaping** for speed), **no SDE path** (Langevin / Euler–Maruyama), ensemble
size is browser-bound, quantile confidence bands are implicit not explicit.

**Optimization lab** — convex / non-convex / metaheuristic / multi-objective /
optimal-stopping / coordinate / projected-gradient; CMA-ES + gradient; Pareto +
convergence. Gaps: **no data-fitting bridge** (optimization is not wired to
experimental data as a least-squares objective), no Bayesian/surrogate-assisted
optimization, constraints limited to bounds.

**Steady-State lab** — equilibrium / Newton residual / continuation branch /
stability / Jacobian heatmap. Sophisticated. Gaps: 1-parameter continuation only
(**no 2-parameter bifurcation**), stability is computed but **fold/Hopf are not
classified/detected automatically**.

**Symbolic lab** — expression / ODE-system / steady-state linearization /
bifurcation scan / QSSA / simplify / expand / factor. The page already states it
is "not a full in-browser CAS" — honest. Gap: no general symbolic solve/integrate.

**Agent lab** — rule worker, biology/social/crisis/finance/urban/environment,
cellular automata. Gap: large-population performance; topology is ad hoc (would
benefit from the graph module below).

**SciML lab** — SINDy, inverse parameter ID, surrogate, PINN scaffold. This is
the current ML surface. Gaps: `surrogate.js` is thin (14 lines) and the PINN is a
scaffold, not real training.

---

## Part 3 — What to add, ranked, with an honest possible/not verdict

Constraint that governs everything: this is a **static GitHub Pages site,
vanilla JS + Plotly + Web Workers, no backend**. That is the whole feasibility
line.

### Tier 1 — high value, fully feasible browser-native

1. **Statistics module (new lab).** Descriptive stats; distributions
   (pdf/cdf/sampling: normal, t, χ², F, binomial, Poisson); hypothesis tests
   (one/two-sample & paired t, Welch, one-way ANOVA/F, χ², Mann–Whitney, KS);
   correlation (Pearson/Spearman); OLS & multiple linear regression with
   coefficient CIs, R², residual diagnostics; bootstrap & permutation CIs;
   power / sample-size. Plots (all native to Plotly): histogram, box, violin,
   ECDF, QQ, scatter+fit, residual-vs-fit, correlation heatmap. Input via CSV
   paste/upload. **Feasible. Highest priority** — you asked for it, it fills a
   real gap, and it underpins fitting and ML.

2. **Curve fitting / nonlinear least squares (extend).** Levenberg–Marquardt +
   weighted LS; parameter estimates ± CI from the covariance σ²(JᵀJ)⁻¹; AIC/BIC;
   residual diagnostics; data import. Reuses the existing solver and `inverse.js`.
   **Feasible.** Bridges every dynamical lab to real data — arguably the single
   biggest scientific-power increase.

3. **Linear algebra tool (new).** Eigenvalues/eigenvectors, SVD, LU/QR/Cholesky,
   rank, condition number, determinant, `Ax=b`, least squares, PCA. Pure JS
   (Jacobi for symmetric — which covers Jacobians, covariance, graph Laplacians —
   plus QR-iteration for general). **Feasible to moderate size** (~300×300 dense
   comfortably). **Honest limit:** very large or sparse matrices are not
   browser-tractable.

4. **Graph theory / network tool (new).** Build from edge list / adjacency / a
   reaction network; degree/closeness/betweenness/eigenvector/PageRank
   centrality; components; shortest paths (BFS/Dijkstra); MST; clustering
   coefficient; spectral (Laplacian → algebraic connectivity, spectral layout);
   light community detection. Viz via force-directed (d3 is available) or Plotly.
   **Feasible up to a few thousand nodes; layout is the bottleneck. Honest
   limit:** very large graphs.

### Tier 2 — feasible with real limits

5. **ML toolkit (extend SciML).** Linear/logistic regression, k-means,
   hierarchical clustering, PCA/t-SNE (small), decision tree / small random
   forest, small MLP via **TensorFlow.js** (WebGL-backed), Gaussian-process
   regression for small n (O(n³)). **Feasible for small/medium data in-browser.
   Honest limit:** no large-scale or deep training, no big data, GPU is modest.

### Tier 3 — possible only under an explicit tradeoff

6. **"AI tool" (LLM-assisted: natural-language→model, explain results, suggest
   analysis).** On a static host you **cannot hide an API key**. Real options:
   (a) user pastes **their own** API key client-side — works, but the key lives
   in their browser and it is opt-in; (b) stand up a small proxy backend — breaks
   the no-server architecture; (c) ship a small in-browser model via
   WebLLM / transformers.js — works but a heavy download and limited quality.
   **Verdict: possible, but never "free" on GitHub Pages.** Recommend deferring,
   or doing (a) as an explicit opt-in only.

### Not feasible browser-native (stated plainly)

- Heavy PDE / large-scale simulation, large optimization, MCMC at scale — the
  single-thread/WASM ceiling; Workers help but do not replace a server/GPU.
- Hiding secrets or doing server-side compute on GitHub Pages — impossible by
  construction.
- Large sparse or huge dense eigenproblems — memory/time bound.
- Stochastic ensembles at 10⁶ paths in interactive time — thousands, not millions.
- Real deep-network training beyond small models.

---

## Cross-cutting control/flexibility upgrades (independent of new modules)

Ranked by value: live parameter sliders that re-solve (debounced) — biggest UX
win; universal experimental-data overlay on any trajectory; initial-condition
ranges + IC sweep / basin maps; uncertainty bands (ensemble quantiles for
stochastic, parameter-CI propagation by sampling for ODE); log-scale parameter
ranges + a real constraint editor; 3D phase/trajectory plots (Plotly already
supports); steady-state 2-parameter continuation with Hopf/fold classification;
stochastic SDE (Euler–Maruyama) + tau-leaping.

## Recommended sequence

v70.9 Statistics module → v71.0 Curve-fitting bridge → v71.1 Linear algebra →
v71.2 Graph/network → then ML toolkit. Statistics first because fitting and ML
both lean on it. Each as its own test-first release; the main integration cost is
adding the new page to the shared navigation across all pages plus the nav
contracts — a bounded, mechanical change, but real, so it deserves its own cycle.
