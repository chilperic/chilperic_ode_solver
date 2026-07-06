# V71.47 — SciML + Linear Algebra scientific honesty

## The problem (confirmed)
Statistics (v71.42) and Curve Fitting (v71.44) were made honest. SciML got
only layout work (v71.45 cockpit, v71.46 spotlight) — its own audit admits
"layout-only ... does not change SciML numerical scope." A source review
confirmed the complaint: SciML shipped decorative plots that fabricate data
under labels claiming real computation. Linear Algebra had the same class of
defect.

### SciML — 10 fabricated plot modes (removed)
`speedup, uncertainty, ood_boundary, loss_landscape, adjoint_trace,
shadow_relevance, fno_spectrum, deeponet_basis, pinn_loss/loss` drew
`Math.exp(-e/…)`, `Math.sin`, `Math.random` and hardcoded arrays. A viewer
saw "PINN physics vs data loss convergence" or "FNO spectral decay" and
believed a network was trained; nothing was. These describe out-of-browser
neural/operator training, which the lab already (correctly) declares
export-only. The fabricated in-browser plots contradicted that honesty.

### SciML — 1 fabricated mode (made real)
`pareto` drew a hardcoded `exp(-k/2)` curve labelled "SINDy Pareto".

### Linear Algebra — fabricated / wrong (fixed)
- `svdVariance`: hardcoded `[55,74,86,94,100]`.
- `powerTrace`: hardcoded `[0.8,0.55,0.35,0.22,0.15]`.
- `nullspace`: hardcoded line, ignoring the actual matrix.
- `eigenSpectrum`: plotted `|diagonal entries|`, which are **not** eigenvalues.
- `conditionSurface`: a decorative `|x−y|+λ` surface; a condition number is a
  scalar, not a surface. Removed.

## What was done

New, unit-tested pure functions on the tested cores:
- `FokoSINDy.paretoSweep(cfg)` — refits STLSQ across a lambda grid and returns,
  per lambda, active-term count and fit RMSE, with a knee heuristic. Real SINDy
  model selection.
- `FokoLinearAlgebra.symmetricEigenvalues(S)` — full spectrum of a symmetric
  matrix via cyclic Jacobi. Feeds a true eigenvalue/singular-value spectrum and
  a true cumulative-variance line (variance_i = σ_i² = eig_i(AᵀA)).
- `FokoLinearAlgebra.powerIterationTrace(A, iters)` — the Rayleigh-quotient
  estimate at each iteration, genuinely converging to the dominant eigenvalue.

Wiring:
- SciML `pareto` now calls `paretoSweep` on the current data/library; the 9
  fabricated neural plots and their dropdown options are deleted (they remain in
  the Python export scaffold, which is the honest home for out-of-browser
  training). `Math.random` now survives only inside `randn()` for realistic
  observation noise on simulated data.
- Linear Algebra `svdVariance`, `powerTrace`, `nullspace`, `eigenSpectrum` now
  compute from the input matrix via the core; `conditionSurface` removed;
  `eigenSpectrum` relabelled to "singular value spectrum" (what it now shows).

## Every other lab
Swept for the same fabrication signature (hardcoded arrays / `Math.sin` /
`Math.random` in plot builders labelled as computed diagnostics): Statistics,
Curve Fitting, Networks, ML, Optimization, Steady-State, Symbolic, Stochastic,
Agent are clean. (Stochastic's secretary-problem `f·log(1/f)` and Agent's
`Math.random` are legitimate: the analytic optimum and genuine stochastic
sampling, respectively.)

## Tests
- `tests/js/honest-diagnostics.test.js` (25 checks) — correctness + preconditions
  of the three new core functions (Lotka–Volterra sweep monotonicity, Jacobi
  spectra vs known values and trace invariant, power-iteration convergence).
- `tests/test_v71_47_sciml_linalg_honesty.py` (7 checks) — guards that the
  fabrications cannot return and the replacements call the cores.
- Updated three legacy snapshot tests (`v63`, `v71_25`, `v71_45`) that had
  encoded the fabricated modes as *requirements* — retargeted to the honest set,
  never by re-adding fakes.

## Validation
```
python -m pytest -q tests          # 464 passed, 271 skipped
node tests/js/honest-diagnostics.test.js
```

## Limits
Still browser-side. PINN / neural-operator / DeepONet / FNO training stays
export-only by design — the lab now says so without drawing fake evidence.
