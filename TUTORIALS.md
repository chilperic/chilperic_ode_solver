# Practical tutorials

These tutorials show how to run a model, challenge the result, and decide what evidence is still missing. Complete the first tutorial before choosing a topic-specific exercise.

## Tutorial 1 — Read a result before the plot

**Goal:** Learn the standard reading order.

1. Open ODE Lab and run the loaded example.
2. Ignore the plot for a moment.
3. Read the status, method, tolerances, accepted and rejected steps, minimum step, warnings, and provenance.
4. Change the method to Euler and run again.

**Check:** Euler reports no rejected steps because it has no local error estimate. A quiet diagnostic panel is not evidence that the method is accurate.

**Keep:** Read status and diagnostics before interpreting the figure.

## Tutorial 2 — Keep Two-up under your control

**Goal:** Confirm that plot choice and layout choice are independent.

1. Open ODE Lab with the SIR example.
2. Select **Two-up**.
3. Choose a trajectory on the left and another compatible plot on the right.
4. Change the left plot, wait, then change the right plot.
5. Repeat the same steps in another lab such as Statistics or Agent.

**Check:** Both evidence panels remain visible. On a narrow screen they may stack vertically, but Two-up remains selected.

Select **Focus** and change a plot again. Focus should remain selected because you chose it explicitly.

**Keep:** Plot selectors choose evidence. They do not choose the workspace layout.

## Tutorial 3 — Detect a plausible stiff-solver failure

**Goal:** See why a smooth trajectory may still be unreliable.

Use the Robertson system:

```text
dA/dt = -k1*A + k3*B*C
dB/dt =  k1*A - k2*B*B - k3*B*C
dC/dt =  k2*B*B
```

with:

```text
A(0)=1, B(0)=0, C(0)=0
k1=0.04, k2=3e7, k3=1e4
t from 0 to 40
```

1. Run adaptive RKF45.
2. Inspect rejected steps, minimum step, function evaluations, conservation, and the estimated timescale ratio.
3. Switch to a coarse fixed-step RK4 and run again.
4. Use **Verify against SciPy** to compare with Radau on the same output grid.

**Check:** Fixed-step RK4 may produce a smooth curve while losing the rejection evidence that warned you about stiffness.

**Keep:** For suspected stiffness, compare with an independent implicit method. Agreement supports the numerics, not the biological model.

## Tutorial 4 — Build a reaction network and test conservation

**Goal:** Let stoichiometry generate the differential equations.

Import this model:

```json
{
  "schema": "foko.model-ir/1",
  "kind": "reaction-network",
  "name": "Two-step pathway",
  "states": [
    {"id": "S", "initial": 10},
    {"id": "M", "initial": 0},
    {"id": "P", "initial": 0}
  ],
  "parameters": {
    "k1": {"value": 0.4, "min": 0, "max": 2},
    "k2": {"value": 0.2, "min": 0, "max": 2}
  },
  "reactions": [
    {"id": "r1", "rate": "k1*S", "stoichiometry": {"S": -1, "M": 1}},
    {"id": "r2", "rate": "k2*M", "stoichiometry": {"M": -1, "P": 1}}
  ],
  "time": {"start": 0, "end": 30, "points": 500},
  "method": "rk45"
}
```

1. Run the model and inspect `S + M + P`.
2. Change the coefficient of `M` in `r1` from `1` to `2`.
3. Replace one valid state name with `X`.

**Check:** The first change creates material and breaks conservation. The second is malformed structure and should be rejected before computation.

**Keep:** Declarative reaction structure is easier to inspect than hand-copied signs in several equations.

## Tutorial 5 — Find steady states without claiming completeness

**Goal:** Separate roots you found from all roots that may exist.

1. Open Steady-State Lab and load a nonlinear example with multiple candidates.
2. Run deterministic multi-start search.
3. Inspect the residual norm, termination reason, physical admissibility, and local stability evidence for each candidate.
4. Change the initial-guess range and repeat.
5. Run a one-parameter scan near a suspected branch transition.

**Check:** Different starting sets may find different candidates. A sequential scan can jump branches or fail near a fold without identifying a bifurcation.

**Keep:** Say “the search found these roots,” not “these are all the roots.” Use continuation software when the existence and structure of branches matter.

## Tutorial 6 — Compare stochastic paths with ensemble evidence

**Goal:** Understand extinction, seeds, and Monte Carlo uncertainty.

1. Open Stochastic Lab and choose a birth–death or stochastic SIR example.
2. Use a small initial population, seed `42`, and 100 runs.
3. Inspect individual paths, empirical bands, endpoint distribution, Monte Carlo error, and censoring.
4. Repeat with seed `42`, then seed `43`.
5. Increase the run count.

**Check:** The same seed reproduces the same finite ensemble. A different seed changes the realization. More runs reduce Monte Carlo error but do not remove the process variability.

**Keep:** Record the seed, run count, and censoring count with every stochastic result.

## Tutorial 7 — Expose non-identifiable fitted parameters

**Goal:** Show that an excellent fit can contain poorly determined parameters.

1. Open Curve Fitting and load the low-substrate Michaelis–Menten example.
2. Fit `v = Vmax*S/(Km+S)`.
3. Inspect R², residuals, the parameter-correlation matrix, and the profile scan.
4. Refit from different starting values.
5. Add measurements in the saturation region and repeat.

**Check:** Low-substrate data can constrain `Vmax/Km` while leaving `Vmax` and `Km` individually uncertain. The curve may fit extremely well even when the profile is flat and the parameters are strongly correlated.

**Keep:** Check profiles and correlations before reporting nonlinear parameters. Better data can solve a problem that a different optimiser cannot.

## Tutorial 8 — Read a live Agent simulation honestly

**Goal:** Separate one animated realization from finite-ensemble evidence.

1. Open Agent Lab and select a biological or ecological preset.
2. Choose **Slow** or **Normal** and start the live ensemble.
3. Confirm that the step counter and lattice advance together.
4. Pause, wait, and resume.
5. Repeat with the same seed and then a different seed.
6. Compare the animation with the population bands and endpoint summaries.

**Check:** Each visible frame is computed before it is displayed, but the animation is still one run. The uncertainty is represented by the ensemble summaries, not by the movie itself.

**Keep:** Do not interpret a lattice animation as a calibrated biological movie or an ensemble average.

## Tutorial 9 — Produce a result another scientist can inspect

**Goal:** Move from exploration to defensible reporting.

1. Run an ODE model with recorded tolerances and diagnostics.
2. Tighten the tolerances and confirm that the quantity of interest is stable.
3. Run independent SciPy verification when appropriate.
4. Generate the Model Report Card.
5. Export the model and reproduce it in an external tool.
6. Write down what was not established.

A useful methods statement includes the model, parameters, method, tolerances, seed where relevant, software version, diagnostics, independent comparison, and the limits of the claim.

**Keep:** A reproducible result contains both the evidence and the non-claims.


## Tutorial 10 — Build a defensible sensitivity analysis

**Goal:** Distinguish local derivatives, screening, variance decomposition and information diagnostics while keeping the browser workload bounded.

1. Open Sensitivity Analysis and load the SIR example.
2. Run **Local central finite differences**. Compare the signed sensitivity, parameter Jacobian, state Jacobian, trajectory influence, OFAT, tornado and perturbation-convergence views.
3. Enter `beta:1,gamma:-1,N:0` as the directional vector. Run again and inspect the range-normalized directional profile.
4. Enable the two-parameter response surface for `beta` and `gamma`. Confirm that the budget increases and that all other parameters remain nominal.
5. Switch to **Morris screening**. Inspect μ*–σ, elementary-effect distributions, normalized parameter trajectories, convergence and rank stability.
6. Switch to **Global variance: Jansen + Saltelli**. Start with 128 samples and no second-order interactions. Compare first/total indices, effects through time, effects across states, variance accounting and the sampled relationship matrix.
7. Enable second-order interactions only when the parameter count and projected workload remain within the browser guard. Treat low-sample interactions as screening evidence.
8. Optionally enable MI/HSIC. Read the estimator and permutation warnings; do not compare them numerically with Sobol fractions.
9. Change a parameter range or tolerance. Confirm that the previous plots become **Stale** and exports are disabled.
10. Increase the requested workload until the capacity guard refuses the run. Export the configuration rather than bypassing the guard.

**Check:** Morris and Sobol rankings need not agree because they answer different questions. A response surface may reveal geometry but does not become a variance decomposition. State-resolved and time-resolved indices reuse the same finite design rather than creating independent evidence.

**Keep:** Report the selected output metric, parameter ranges, initial conditions, time window, sample budget, seed, solver, tolerances and all unresolved limitations.
