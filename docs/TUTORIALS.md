# Foko Lab modeling curriculum

These tutorials teach modeling rather than button pressing. Each exercise contains a scientific goal, an implementation task, a deliberate challenge, an interpretation checkpoint, and a reporting outcome.

Complete Tutorials 1–4 before using the advanced labs.

## Tutorial 1 — Turn a question into a model

**Goal:** Build a minimal model whose output directly answers a scientific question.

**Question:** How do growth rate and carrying capacity affect population after 15 time units?

1. Open **ODE Lab** and load Logistic Growth.
2. Identify the state `x`, parameters `r` and `K`, initial condition `x(0)`, and time interval.
3. Write the units you would assign to each quantity.
4. Confirm the equation:

```text
dx/dt = r*x*(1-x/K)
```

5. Run the nominal model.
6. Change only `r`; run again.
7. Restore `r`, change only `K`; run again.
8. Extend the final time and inspect whether the conclusion changes.

**Challenge:** Set `x(0)` above `K`. Predict the direction of motion before running.

**Checkpoint:** `r` primarily controls approach speed while `K` controls the asymptotic level, but a short observation window can make their effects difficult to separate.

**Report:** State the question, output time, initial condition, parameter values, solver and one limitation of logistic growth.

## Tutorial 2 — Build equations from mechanisms

**Goal:** Derive balances from a reaction network rather than copying equations blindly.

Consider:

```text
S --k1--> M --k2--> P
```

1. Write rates `v1=k1*S` and `v2=k2*M`.
2. Derive:

```text
dS/dt = -v1
dM/dt =  v1-v2
dP/dt =  v2
```

3. Enter the model in ODE Lab or import the reaction-network Model IR.
4. Use `S(0)=10`, `M(0)=0`, `P(0)=0`, `k1=0.4`, `k2=0.2`.
5. Plot all states and the total `S+M+P` if the conservation view is available.

**Challenge:** Change the stoichiometric coefficient producing `M` from `1` to `2`. Explain why total material is no longer conserved under the original counting convention.

**Failure test:** Refer to an undeclared state `X`. The model should be rejected before computation.

**Checkpoint:** Mechanism-to-balance construction makes signs, units and conservation inspectable.

## Tutorial 3 — Separate output-grid density from numerical accuracy

**Goal:** Learn why a smooth plot can be numerically weak.

1. Open ODE Lab with a nonlinear oscillator.
2. Run adaptive RK45 with the default reported points.
3. Double the reported points without changing tolerances.
4. Compare the diagnostic work and the plotted smoothness.
5. Restore the point count and tighten `rtol`/`atol` by two orders of magnitude.
6. Compare a scalar quantity such as maximum amplitude or final state.

**Challenge:** Run a fixed-step method with a coarse step and then halve the step repeatedly.

**Checkpoint:** More reported points change the output grid. Tighter tolerances or smaller fixed steps change the numerical approximation.

**Report:** Include the convergence table, not only the final plot.

## Tutorial 4 — Diagnose stiffness with an independent method

**Goal:** Recognize when explicit browser integration is not sufficient.

Use the Robertson system:

```text
dA/dt = -k1*A + k3*B*C
dB/dt =  k1*A - k2*B^2 - k3*B*C
dC/dt =  k2*B^2
```

with:

```text
A(0)=1, B(0)=0, C(0)=0
k1=0.04, k2=3e7, k3=1e4
t = 0 ... 40
```

1. Run adaptive RK45.
2. Record rejected steps, minimum step, function evaluations and conservation drift.
3. Attempt a coarse fixed-step run.
4. Export or run **Verify against SciPy** with Radau or BDF.
5. Compare on the same output grid.

**Checkpoint:** A stiff problem can produce a smooth but wrong fixed-step curve. Independent implicit verification addresses numerical integration, not model validity.

## Tutorial 5 — Local sensitivity with scale discipline

**Goal:** Distinguish raw derivatives, range-scaled effects and elasticities.

1. Open **Sensitivity Analysis** and load Exponential Decay Verification.
2. Select **Local central finite differences**.
3. Run with the default perturbation.
4. Switch the plot scale between raw derivative, range-scaled derivative and elasticity.
5. Inspect the perturbation-convergence plot.
6. Compare the numerical derivative with the analytic result for `x(T)=x0*exp(-k*T)`.

**Challenge:** Make the perturbation too large and then very small. Observe truncation versus floating-point sensitivity.

**Checkpoint:** A ranking can change solely because the scaling convention changed. Always report the convention.

## Tutorial 6 — Local influence through states and time

**Goal:** Separate vector-field Jacobians from propagated trajectory sensitivity.

1. Load the Three-tier Activation Cascade.
2. Run Local sensitivity for final `x3`.
3. Compare:
   - parameter Jacobian `∂f/∂p`;
   - state Jacobian `∂f/∂x`;
   - selected-state sensitivity through time;
   - parameter-by-state influence map.
4. Select a different output state and rerun.

**Challenge:** Increase the final time. Determine whether early upstream influence persists in the final downstream state.

**Checkpoint:** A large right-hand-side derivative at one time does not automatically imply a large propagated effect on the final output.

## Tutorial 7 — OFAT, tornado and directional analysis

**Goal:** Understand conditional slices through parameter space.

1. Load the Chemostat example.
2. Run Local sensitivity.
3. Inspect OFAT curves and the tornado plot.
4. Define a direction such as:

```text
D:1, mumax:-1, Ks:0.5
```

5. Run the directional profile.
6. Enable a response surface for `D` and `mumax`.
7. Use contour view first; switch to 3D only when it helps inspect geometry.

**Challenge:** Move the nominal point near washout and repeat.

**Checkpoint:** OFAT and response surfaces condition on all unvaried parameters. They reveal geometry but do not partition global variance.

## Tutorial 8 — Morris screening for a larger parameter set

**Goal:** Screen parameters while retaining evidence of nonlinearity and interaction.

1. Load the Goodwin oscillator.
2. Select **Morris screening**.
3. Start with 12 trajectories and six grid levels.
4. Inspect `μ*–σ`, signed elementary-effect distributions and the normalized design paths.
5. Increase the trajectory count.
6. Compare prefix convergence and bootstrap rank intervals.
7. Repeat with a different seed.

**Challenge:** Change the output metric from range to mean and rerun.

**Checkpoint:** `μ*` ranks overall effect, while large `σ` may reflect nonlinearity, interaction, or both. Rank overlap means the finite design does not resolve the ordering.

## Tutorial 9 — Sobol/Jansen first and total effects

**Goal:** Interpret variance-based indices over declared independent ranges.

1. Load SEIR Outbreak Peak.
2. Select **Global variance: Jansen + Saltelli**.
3. Use 128 base samples without second-order interactions.
4. Inspect first and total indices with uncertainty.
5. Inspect the total-minus-first gap.
6. Increase the sample count and compare convergence.
7. Inspect the sampled output distribution and parameter-output relationships.

**Challenge:** Narrow the `beta` range while keeping its nominal value. Explain why the index can fall even though the underlying mechanism did not change.

**Checkpoint:** Global importance belongs to the declared joint input domain. It is not an intrinsic constant of the equation.

## Tutorial 10 — Pairwise interactions, time and state resolution

**Goal:** Add second-order and structured output evidence without overclaiming.

1. Use a model with no more than five varied parameters.
2. Enable pairwise second-order interactions.
3. Read the projected ODE-solve budget before running.
4. Inspect the second-order heatmap and bootstrap uncertainty.
5. Compare first/total effects through time.
6. Compare first/total effects across states.
7. Identify periods or states with near-zero output variance.

**Challenge:** Increase the sample count until the browser guard refuses the request.

**Checkpoint:** Pairwise second-order terms do not recover arbitrary higher-order interactions. Time/state heatmaps reuse the same finite design.

## Tutorial 11 — Limited MI and HSIC dependence screening

**Goal:** Use nonlinear dependence diagnostics without confusing them with variance shares.

1. Run a bounded Global variance analysis with at least 64–128 samples.
2. Enable MI/HSIC diagnostics.
3. Inspect normalized histogram MI, RBF-HSIC and permutation p-values.
4. Compare their rankings with Sobol total effects.
5. Repeat with a different seed and larger sample budget.

**Challenge:** Use an output with a threshold-like response.

**Checkpoint:** MI and HSIC can detect dependence that is not monotonic, but their values depend on estimator choices. They are not causal measures or Sobol indices.

## Tutorial 12 — Optimization with feasibility separated from objective

**Goal:** Avoid calling an infeasible low-objective point an optimum.

1. Open **Optimization Lab** and load Constrained Quadratic.
2. Run bounded coordinate search.
3. Inspect objective history and constraint history separately.
4. Compare raw and penalized landscapes.
5. Run projected penalty descent and seeded differential evolution.
6. Compare candidates, feasibility and sensitivity to starting points.

**Challenge:** Reduce the penalty or constraint tolerance until an apparently attractive but infeasible candidate appears.

**Checkpoint:** Feasibility is a separate scientific and numerical requirement.

## Tutorial 13 — Finite multi-objective trade-offs

**Goal:** Read a sampled Pareto front without claiming completeness.

1. Load Bi-objective Rosenbrock–Rastrigin or Tracking vs Control Effort.
2. Run the finite multi-objective workflow.
3. Inspect the Pareto front, dominance heatmap, crowding distance, objective correlation and hypervolume progression.
4. Locate the geometric knee candidate.
5. Repeat with a larger candidate budget and another seed.

**Challenge:** Change the reference point used for hypervolume interpretation outside the platform export workflow and observe its effect.

**Checkpoint:** Nondominated sampled candidates are not proof of the complete Pareto set. A knee is preference-dependent, even when identified geometrically.

## Tutorial 14 — Find equilibria without claiming all roots

**Goal:** Distinguish a converged root from root completeness and bifurcation evidence.

1. Open **Steady-State Lab** and load CSTR Thermal Runaway or a normal-form example.
2. Run from the default initial guess.
3. inspect residual history and the final tolerance gate.
4. Run deterministic multi-start search.
5. Inspect nullclines or residual surface where available.
6. Run a parameter branch scan and stability-margin view.

**Challenge:** Change the initial-guess domain and scan resolution.

**Checkpoint:** Say “the search found these roots.” A sequential branch is not pseudo-arclength continuation, and a grid sign change is only a candidate bifurcation.

## Tutorial 15 — Stochastic paths, ensembles and censoring

**Goal:** Separate one realization from finite-ensemble evidence.

1. Open **Stochastic Lab** and load Birth–Death or Stochastic SIR.
2. Set seed `42` and 100 trajectories.
3. Inspect sample paths, mean/band, endpoint histogram, variance, Fano factor and event counts.
4. Repeat with the same seed and then seed `43`.
5. Increase the trajectory count.
6. Inspect censored runs and first-passage or zero-state evidence where relevant.

**Challenge:** Lower the event cap until censoring occurs.

**Checkpoint:** More trajectories reduce Monte Carlo error but do not remove process variability or parameter uncertainty.

## Tutorial 16 — Parameter fitting and practical identifiability

**Goal:** Show that an excellent fit can still contain poorly estimated parameters.

1. Open **Curve Fitting** and load low-substrate Michaelis–Menten data.
2. Fit `v=Vmax*S/(Km+S)`.
3. Inspect residuals, parameter correlation, bootstrap and profile scans.
4. Refit from several starting values.
5. Add or choose data that extend into saturation and repeat.

**Checkpoint:** Low-substrate data may constrain `Vmax/Km` without separately identifying `Vmax` and `Km`.

## Tutorial 17 — Statistics before machine learning

**Goal:** Audit data before building a predictive baseline.

1. Open **Statistics** with a dataset containing missingness and correlated features.
2. Inspect missing-data policy, distributions, correlations and PCA.
3. Move to **Machine Learning** with a compatible preset.
4. Select features and target explicitly.
5. Run fold-safe cross-validation.
6. Inspect out-of-fold predictions, residuals or classification curves, calibration and permutation importance.

**Challenge:** Include a target-derived feature and confirm the leakage guard rejects it.

**Checkpoint:** Cross-validation cannot rescue leakage, inappropriate labels, nonrepresentative data or an invalid scientific target.

## Tutorial 18 — Conditioning in linear algebra

**Goal:** Understand why a small residual may coexist with an unstable solution.

1. Open **Linear Algebra** and load the well-conditioned solve.
2. Solve `Ax=b`; inspect residual and singular values.
3. Load the Hilbert example and repeat.
4. Perturb one entry of `b` slightly.
5. Compare the change in the solution.

**Checkpoint:** Residual measures equation satisfaction. Conditioning governs amplification of input and rounding errors.

## Tutorial 19 — Use SciML without fabricating neural evidence

**Goal:** Distinguish computed SINDy/surrogate evidence from export-only PINN and neural-operator templates.

1. Open **SciML** and run a compatible SINDy example.
2. Inspect coefficient paths, active library terms, error versus sparsity and trajectory evidence.
3. Change the sparsity threshold and noise assumptions.
4. Select a PINN or operator-learning example.
5. Confirm that the platform presents an export boundary rather than invented loss curves or residual maps.

**Checkpoint:** A scientific problem card is not a trained model. Only interpret evidence generated by an actual maintained computation.

## Tutorial 20 — Produce a reproducible report

Before the final reporting exercise, inspect one Agent Lab run. Each visible frame is computed before it is displayed, but the animation is still one run and must not be interpreted as an ensemble or calibrated biological movie.


**Goal:** Create a result another scientist can inspect and challenge.

1. Choose one completed model from an earlier tutorial.
2. Repeat the run with tighter numerical controls or a larger sampling budget.
3. Perform an independent comparison where available.
4. Save the configuration and export model/result JSON.
5. Export a plot only while the evidence is current.
6. Record version, solver, tolerances, seed, sample count, parameter ranges and warnings.
7. Write at least three explicit non-claims.

A defensible methods statement contains:

- model equations or rules;
- state, parameter and unit definitions;
- initial/boundary conditions;
- numerical method and controls;
- verification and diagnostics;
- sensitivity/uncertainty design;
- software version and export;
- limitations.

**Final checkpoint:** Reproducibility requires enough information to recompute the result, not merely a screenshot of the result.

## Tutorial 21 — Move a model between formats without changing its meaning

**Goal:** Treat model exchange as a scientific equivalence test rather than a file-conversion exercise.

1. Open **Model Studio** and expand **Import or paste a model**.
2. Load the supplied plain-text logistic model and check the rendered equation, `x(0)`, parameter values/ranges, time span and solver.
3. Run it and record the final state and solver diagnostics.
4. Export the project as JSON.
5. Create a blank project, import the JSON and rerun it. The new result should agree within the declared numerical tolerance.
6. Repeat with a Python data dictionary using `FOKO_MODEL = {...}`. Confirm that no Python code is executed.
7. Widen the model panel with the separator while editing, then reset it. Confirm that plot selection and computed data do not change when only panel geometry changes.
8. Try a CellML or SED-ML filename, or an SBML model containing an event. Record the explicit rejection instead of trying to work around it.

**Challenge:** Change one parameter range in only one representation. Explain why matching nominal trajectories do not imply matching sensitivity questions.

**Failure test:** Add `x(0) = Infinity` or an undeclared symbol. The import or model validator must reject it before a scientific result is created.

**Checkpoint:** A successful parse proves syntax compatibility. A successful numerical round trip supports implementation equivalence for that tested configuration. Neither proves that the model is scientifically valid or that Foko Lab supports the full source standard.

**Report:** List the source format, imported states/equations/parameters, any rejected semantics, numerical settings, comparison tolerance and the software/release used for both runs.
