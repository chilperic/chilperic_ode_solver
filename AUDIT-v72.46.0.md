# Foko Lab v72.46.0 — Professional Platform Audit

## Scope

This audit uses v72.45.0 as the stable baseline and examines the new Sensitivity Analysis depth, input ownership, numerical workload limits, plot semantics, cross-page capability metadata, responsive layout, render lifecycle and release behavior. It does not certify arbitrary user models or claim parity with desktop/server sensitivity packages.

## Implemented local sensitivity diagnostics

The browser now computes, from the current editable equations and numerical settings:

- central finite-difference scalar sensitivity and perturbation-size convergence;
- propagated trajectory sensitivity for every state and varied parameter;
- finite-difference state Jacobian `∂f/∂x` along the nominal trajectory;
- finite-difference parameter Jacobian `∂f/∂p` along the nominal trajectory;
- parameter-by-state influence summaries;
- bounded one-factor-at-a-time response curves;
- tornado endpoint changes over declared parameter ranges;
- range-normalized user-defined directional response profiles;
- an optional bounded two-parameter response surface.

The audit distinguishes three quantities that are often incorrectly merged:

1. `∂f/∂x` is the local state Jacobian of the right-hand side.
2. `∂f/∂p` is the local parameter Jacobian of the right-hand side.
3. `∂x(t)/∂p` is the propagated trajectory response.

Neither Jacobian heatmap is presented as a stability certificate. OFAT and tornado plots explicitly exclude interactions. The directional profile is conditional on the declared parameter ranges and direction normalization. A response surface varies only two parameters and fixes every other parameter at its nominal value.

## Implemented global diagnostics

The existing Morris and Jansen/Saltelli estimators remain intact. New derived views reuse their actual computed designs rather than launching decorative or hidden simulations:

- time-resolved first- and total-effect matrices for the selected state;
- raw variance-contribution accounting: first-order sum, optional pairwise sum and unresolved remainder;
- sampled parameter-output relationship panels;
- limited histogram mutual-information screening;
- limited normalized RBF-HSIC screening;
- coarse permutation p-values for MI and HSIC.

Time-resolved indices reuse the same seeded A/B/mixed sample design and cached ODE trajectories. MI and HSIC operate on a bounded subset of those actual samples. They are labelled dependence-screening diagnostics, not variance fractions, causal measures or replacements for Sobol indices.

## Browser workload safety

The pre-worker capacity gate now accounts for local convergence checks, OFAT points, directional-profile points and the optional response-surface grid in addition to global sample, second-order and state-time budgets. The worker repeats the validation and refuses oversized requests before an ODE solve begins.

The capacity boundary is operational rather than mathematical. A stiff or expensive model can still fail below the limit. Large models are directed to the exported Python/SALib or server/HPC workflow.

## Platform consistency findings

One scientific metadata defect was found and corrected during the audit: Residual Component Sensitivity was marked browser-computed in the taxonomy even though a generic ODE trajectory has no canonical residual-component decomposition. It is now unavailable in generic Sensitivity Analysis and explicitly reserved for residual-defined fitting, algebraic or future PINN workflows.

The capability registry now maps every selectable Sensitivity plot to its exact runtime identifier. Adjoint sensitivity, FAST/eFAST and Shapley effects remain export-only. No unsupported estimator was added to a runtime menu.

The audit also verifies:

- all 14 scientific workspaces retain exactly two stable plot hosts;
- selectors do not change explicit Two-up or Focus intent;
- one shared Plotly owner remains active;
- scientific input changes mark evidence stale and disable result export;
- new controls are persisted with the Sensitivity configuration;
- field grids and wide controls remain bounded at mobile width;
- one current release token and one current port are used throughout the platform.

## Reliability verdict

The added features are suitable for bounded exploratory analysis, model screening, teaching, comparison of outputs and reproducible export. They are not publication-grade convergence certificates, causal analyses, dependent-input decompositions or substitutes for validated high-budget external workflows.
