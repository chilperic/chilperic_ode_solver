# V71.2 core boundary and shell-strangler foundation

## Diagnosis
The latest platform failed structurally because scientifically correct engines, shared helper code and hand-written pages were still mixed. The load-bearing science should not be rewritten. The shell must be strangled in place.

## Implemented
- Created `src/core/` and copied the science engines there.
- Left thin compatibility wrappers in `src/` so older tests and external references do not break immediately.
- Updated HTML pages to load the core science paths directly.
- Added `src/core/index.js` as a library boundary.
- Added `src/platform/shell.js` and `src/platform/shell.css`: a descriptor-driven lab shell with `registerLab`, `mount`, template loading, config export, error boundary and URL-state helpers.
- Reworded the navigation from `Workbench IDE` / `Standalone ODE Lab` to `Modeling workspaces` / `ODE Solver`, because legacy wording made valid routes look deprecated.
- Bumped cache tokens to `?v=71.46.0`.

## Not implemented yet
- Statistics is not yet ported to a descriptor page. That is the next release.
- The old page shell still exists. This release establishes the boundary; it does not delete the old shell.
- Full Workbench fitting against arbitrary user ODEs remains future work.

## Local validation command
```bash
python3 -m pytest -q tests/test_v71_2_core_shell_boundary.py && \
node tests/test_v71_2_shell_node.js && \
python3 -m pytest -q tests && \
for t in tests/js/*.test.js tests/test_v70_9_numeric_cores_node.js tests/test_v70_11_numeric_cores_node.js tests/test_v70_16_numeric_depth_node.js tests/test_v70_17_consistency_depth_node.js tests/test_v70_19_data_engine_node.js tests/test_v71_0_platform_node.js tests/test_v71_1_workbench_science_node.js tests/test_v71_2_shell_node.js; do node "$t"; done && \
for f in src/*.js src/core/*.js src/platform/*.js src/stochastic/*.js; do [ -f "$f" ] && node --check "$f"; done && \
python3 -m http.server 8010
```

Open `http://localhost:8010`.
