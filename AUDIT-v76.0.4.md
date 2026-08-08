# Foko Lab v76.0.4 implementation and validation audit

## Patch verification

The v76.0.0 Chromium log exposed one release-blocking navigation timing defect:
the Project menu changed semantic state before its links became visible.
v76.0.1 removed the discrete `visibility` transition, preserved the opacity and
movement animation, and adds a contract requiring immediate hit-test and focus
availability.

The next Chromium run confirmed that visibility was no longer the failure. It
then exposed an ambiguous test-only selector: `a:first-of-type` matched one link
in each Experiment menu section. v76.0.2 selected the first real menu link
explicitly.

The v76.0.2 run then exposed a separate Profile geometry mismatch: positioning
used 430 px while CSS rendered 620 px. v76.0.3 replaced those competing values
with one bounded geometry function and executable desktop/phone edge cases.

The v76.0.3 local run passed all scientific, reference, navigation and Agent
gates, then stopped in the combined Optimization/Stochastic visual contract.
The harness waited for two plot states but did not report which lab, which host
or whether the host was pending, hidden or failed. Both workspaces also issued
overlapping fire-and-forget render requests during initialization. v76.0.4
coalesces those requests through the shared post-layout lifecycle, waits up to
60 seconds on slower hardware, and reports the exact lab, file, host geometry,
render state and browser errors if a failure remains.

An exact Chromium probe then exposed the rendering cause that the old timeout
had hidden: the desktop workspace declared four grid columns but inherited a
three-area template. The results canvas collapsed into the inputs column and
one plot host had zero width. v76.0.4 gives the four columns the matching
`modes inputs workspace inspector` areas, preserves two-up plot ownership, and
restores 44 px action targets after the compact-style cascade.

The full Playwright run also exposed four product defects and several stale test
expectations. Phone task controls were covered by the global bottom navigation,
one visible phone button was only 33 px high, research cards used unequal
content-height rows, and the new-model test read input values as text. These are
now corrected. Tests now recognize intentional scientific growth: 13 AI plots,
seven supporting home tools, an open searchable Sensitivity catalogue, and the
single Aurora brand identity. The Playwright configuration also persists one
fresh port across the web server and every test worker; workers no longer
invent a new unreachable port.

The local runner now separates normal use from release certification.
`--browser` runs the reliable baseline, selects a fresh port, starts localhost
and opens it. `--full` deliberately adds all offline Chromium and Playwright
gates. A timing-sensitive certification gate can therefore no longer prevent a
scientist from opening an otherwise validated local platform.

## Outcome

v76.0.4 is a model-first product rebuild, not a catalogue-first relabeling. One
central application shell now owns Project, Model, Experiment, Analyze, Evidence,
Atlas, command search, Run, creator/trust access, desktop popovers, and the phone
navigation sheet. The 36 authored pages no longer carry duplicated navigation
menus or visible product-version metadata.

The Convergent Field identity uses one accessible vector/raster asset family and
the Abyss, Cobalt, Cyan, Verdigris, Copper, Paper and Ink palette. The shared v76
design system applies compact typography, stable workspaces, portal overlays,
mobile bottom actions, reduced-motion support, forced-color support, and bounded
plot geometry across public and scientific pages.

The home page begins with an editable logistic model computed by the canonical
adaptive ODE engine. It routes by problem structure—equations, populations/agents,
or data—while preserving the 259-entry Model Atlas, worked models, tutorials and
research examples as supporting material.

## Scientific and product checks

- 324/324 active Python contracts passed.
- 32/32 independent differential reference checks passed.
- 128 JavaScript files passed syntax validation.
- 221/221 v76 shell and product contracts passed across 36 pages.
- Core suites passed for CMA-ES, population genetics, Bayesian/advanced methods,
  bifurcation, evolution landscapes, AI modeling, global multi-output sensitivity,
  fitting, statistics, ML, SciML, symbolic methods, networks, stochastic models,
  steady states, agents, Workbench and Model Studio.
- All 20 scientific workspaces retain two stable plot hosts and one plot lifecycle
  owner; the measurable platform benchmark is 100/100.
- Sensitivity retains local, Morris, Jansen/Saltelli first/total/second-order,
  time/state, one- or multiple-output, response-surface, dependence and FIM
  workflows with pre-computation browser-capacity refusal.
- Agent models default to the live lattice. Space-time 3D is exposed only for
  curated front, invasion, coarsening or wave models; Model Studio 3D requires
  at least three computed states.
- KaTeX remains vendored and equations are rendered from editable model inputs.
- Seven offline Chromium gates passed for navigation hitboxes, Agent layout,
  shared visual contracts, taxonomy, home reruns, Sensitivity and guides.
- The complete desktop/mobile Playwright release suite passed 145/145 scenarios
  on one stable fresh localhost port.

## Reported numerical failures

The worker now reports the equation index, time, expression, current finite
values and likely cause. `-beta*S*I/N` with `N=0` identifies division by zero and
the zero denominator. Divergent `alpha*x-beta*x*y` identifies a state that left
the model domain or exceeded a numerically stable scale and recommends shorter
time spans, rescaling and parameter/sign inspection. Both cases have executable
regressions.

## Browser certification

The corrected bundle was observed directly in Chromium 149.0.7827.0. The seven
offline browser gates and all 145 Playwright scenarios passed. This includes
desktop and phone navigation, creator options, model creation and execution,
two-up/Focus stability, plotted-result lifecycle, KaTeX rendering, mobile task
panels, contextual Agent 3D, Population Genetics, CMA-ES, multi-output global
Sensitivity, Advanced Methods, AI, the Model Atlas and the home research
workflows. `test-v76.0.4-local.sh --full` reproduces that certification; the
normal `--browser` route remains intentionally shorter.
