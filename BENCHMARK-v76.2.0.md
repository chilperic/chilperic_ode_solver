# Foko Lab v76.2.0 platform benchmark

This benchmark informs product architecture. It does **not** claim numerical or feature parity with mature desktop, server or commercial systems, and it does not imply standards conformance beyond the explicitly tested subset.

| Reference | Official product pattern | Applied in v76.2.0 |
|---|---|---|
| [COMSOL Desktop](https://www.comsol.com/support/learning-center/course/how-to-navigate-the-comsol-multiphysics-user-interface-12/personalize-the-comsol-desktop-34391) | Model Builder, Settings and Graphics remain coordinated and can use different compact/widescreen arrangements. | Editable model, computed canvas and evidence remain visible as coordinated zones; the authoring/results divider is adjustable on desktop and becomes task-based on phones. |
| [Simulink Dashboard](https://www.mathworks.com/help/simulink/ug/connect-dashboard-blocks.html) | Controls tune model variables or parameters and displays monitor signals during simulation. | Inputs are attached to the current model and the global Run action resolves to the visible lab computation rather than opening a disconnected example. |
| [AnyLogic](https://www.anylogic.com/features/) | Multiple modelling methods coexist with 2D and 3D visualization. | Mechanistic, stochastic, agent, population, inference and data-driven workspaces coexist; 3D is conditional on meaningful landscape, state-space or lattice-time geometry. |
| [Wolfram System Modeler](https://www.wolfram.com/system-modeler/resources/) | Modelling, simulation and analysis form one integrated workflow. | Model Studio hands the same editable model into simulation, steady-state and sensitivity workflows with attached evidence and export boundaries. |
| [OpenCOR](https://opencor.ws/user/plugins/simulation/simulationExperimentView.html) | Model content and simulation-experiment settings are distinct. | Foko Model IR separates model definition from time, solver and analysis settings. Unsupported standards semantics fail closed. |
| [NetLogo](https://docs.netlogo.org/7.0.3/interfacetab) | Interactive controls and live model views remain distinct from advanced authoring. | Agent controls, lattice view and computed evidence are coordinated while custom modelling stays explicit. |
| [SBML Level 3](https://sbml.org/documents/specifications/level-3/) and [SED-ML](https://sed-ml.org/) | Model language and simulation experiment carry different semantics. | The strict SBML subset is not presented as general SBML; SED-ML, CellML and OMEX are recognized but not falsely executed. |

Additional scientific-workflow references remain **VCell**, **SimBiology**, **COPASI**, **Tellurium**, **Cell Collective** and **BioUML**. Their shared lesson is that models, experiments, analyses, diagnostics and provenance should remain attached to one project rather than being presented as unrelated demonstrations.

## Measurable product dimensions

- **Model ownership:** blank-model route; editable equations, initial conditions, parameter ranges, time and solver settings; safe multi-format import; reproducible export and lab handoff.
- **Scientific reliability:** finite-input validation, diagnostic state, seeded stochastic methods, workload refusal, independent numerical references and stale-result safety.
- **Platform stability:** one shared shell, one authoritative identity taxonomy, bounded browser workloads, stable plot ownership and deterministic release gates.
- **UX:** resizable desktop authoring, phone task views, populated navigation, visible Home access and direct creator/trust routes.
- **Modern GUI:** compact scientific typography, adaptive vector identity, two-level color orientation, accessible focus states and relevant rather than decorative 3D.
- **Workspace quality:** resizable desktop authoring/results split, stable plot ownership, phone task views, contained tables and contextual 3D.
- **Information architecture:** Home, Project, Model, Experiment, Analyze, Evidence and Atlas remain stable; examples are starting points, not the platform definition.
- **Visual orientation:** one sophisticated platform mark, six subject families and twenty distinct lab identities carried through header, navigation, workspace rail, home and Atlas.
- **Plot integrity:** interface colors orient the user; semantic categorical, sequential, diverging and uncertainty palettes communicate quantitative data.
- **Honest interoperability:** Model IR is internal; supported and unsupported external formats are explicitly distinguished.

## Position after the audit

Foko Lab’s credible differentiation is a browser-native, model-first workbench spanning mechanistic, population, agent, sensitivity, optimization, Bayesian-reference and data-driven workflows with unusually visible evidence boundaries. The 259-entry Atlas strengthens model creation but does not replace it.

The largest remaining gaps are production stiff/DAE solvers, general Bayesian sampling, certified continuation, dimensional analysis, standards-conformant SED-ML/OMEX execution, multi-locus genomics and external usability/assistive-technology validation. These remain roadmap items, not hidden claims.
