#!/usr/bin/env python3
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
version = json.loads((ROOT / 'VERSION.json').read_text())['version']
package = json.loads((ROOT / 'package.json').read_text())
assert package['version'] == version, (package['version'], version)

shell = (ROOT / 'styles/v72-lab-shell.css').read_text()
assert '.field-grid {' in shell and '.field-grid.cols-2 {' in shell, 'field-grid classes are used but not defined'
assert '#sensitivityBudget.capacity-blocked' in shell, 'capacity refusal has no explicit visual state'

html = (ROOT / 'sensitivity.html').read_text()
required_ids = {
    'sensitivitySecondOrder', 'sensitivityBootstrap', 'sensitivityBudget',
    'sensitivitySamples', 'sensitivityTrajectories', 'sensitivityLevels',
    'sensitivityOfatPoints', 'sensitivityDirection', 'sensitivityDirectionalSpan',
    'sensitivityDirectionPoints', 'sensitivityResponseSurface',
    'sensitivitySurfaceFirst', 'sensitivitySurfaceSecond', 'sensitivitySurfacePoints',
    'sensitivityDependence', 'sensitivityDependencePermutations',
    'runSensitivity', 'leftPlotType', 'rightPlotType'
}
for control in required_ids:
    assert f'id="{control}"' in html, f'missing sensitivity control {control}'
assert 'Global variance: Jansen + Saltelli' in html
assert 'Requests outside the guarded browser workload envelope are refused before a worker starts.' in html

workspace = (ROOT / 'src/v72/sensitivity-workspace.js').read_text()
for plot in [
    'morris-effects', 'morris-convergence', 'morris-rank', 'morris-design',
    'sobol-second', 'sobol-gap', 'sobol-uncertainty', 'sobol-rank', 'sobol-output',
    'parameter-jacobian', 'state-jacobian', 'influence-map', 'ofat', 'tornado',
    'directional', 'response-surface', 'sobol-time', 'sobol-first-time', 'sobol-state-total', 'sobol-state-first', 'variance-contribution',
    'global-scatter', 'dependence-mi', 'dependence-hsic'
]:
    assert plot in workspace, f'missing advanced sensitivity plot {plot}'
assert 'capacityBlocked' in workspace
assert 'checkedAnalysis.capacity && checkedAnalysis.capacity.blocked' in workspace

core = (ROOT / 'src/core/sensitivity.js').read_text()
for token in [
    'secondOrderMatrix', 'bootstrapSobol', 'rankStability', 'outputHistogram',
    'function ofat(', 'function directionalProfile(', 'function responseSurface(',
    'function dependenceDiagnostics(', 'sampleObserver'
]:
    assert token in core, f'missing global-sensitivity diagnostic {token}'
inputs = (ROOT / 'src/core/numerical-inputs.js').read_text()
assert 'function sensitivityCapacity' in inputs
assert 'too large for reliable in-browser sensitivity analysis' in inputs
assert 'No worker should be started' in inputs
assert 'ofatPoints * parameterCount' in inputs
assert 'surfacePoints * surfacePoints' in inputs
assert 'dependencePermutations' in inputs

expected_copy = 'Local Jacobians, OFAT, Morris, first/total/second-order variance, state/time effects and FIM.'
for page in ROOT.glob('*.html'):
    text = page.read_text(errors='ignore')
    if 'href="sensitivity.html"' in text:
        assert expected_copy in text, f'outdated Sensitivity navigation copy in {page.name}'
nav = (ROOT / 'src/navigation.js').read_text()
assert expected_copy in nav
assert 'Sobol/Jansen and local information diagnostics' not in ''.join(p.read_text(errors='ignore') for p in ROOT.glob('*.html'))

# Public documentation must describe the actual conditional runtime evidence.
docs = (ROOT / 'docs.html').read_text()
tutorial = (ROOT / 'tutorial.html').read_text()
trust = (ROOT / 'trust.html').read_text()
for token in ['normalized parameter domain', 'parameter-by-state first and total effects', 'Plot availability is method-dependent']:
    assert token in docs, f'docs missing Sensitivity feature: {token}'
for token in ['Tutorial 10 — Pairwise interactions, time and state resolution', 'effects across states', 'browser guard refuses the request']:
    assert token in tutorial, f'tutorial missing Sensitivity feature: {token}'
for token in ['Morris normalized parameter design trajectories', 'State resolved first and total effect indices', 'Sensitivity documentation tutorial and trust sync']:
    assert token in trust, f'trust matrix missing Sensitivity capability: {token}'
assert 'Derived in browser' in trust, 'trust is missing the reader-facing derived-result claim label'
assert '>derived-browser<' not in trust, 'trust leaks an internal capability token'
for acronym in ('ODE', 'HSIC', 'FIM', 'SSA'):
    assert acronym in trust, f'trust acronym formatting is missing {acronym}'
assert 'Adjoint sensitivity' in trust and 'Unavailable' in trust

runner = (ROOT / 'test-v72.48.0-local.sh').read_text()
assert 'PREVIOUS_VERSION="72.47.0"' in runner, 'runner predecessor variable is stale'
assert "previous='72.47.0'" in runner, 'runner embedded preflight predecessor is stale'

# Every authored workspace must retain exactly two stable plot hosts.
workspaces = ['ode','steady','stochastic','optimization','statistics','fitting','linear-algebra','networks','ml','sciml','agent','symbolic','sensitivity','workbench']
for name in workspaces:
    text = (ROOT / f'{name}.html').read_text()
    count = text.count('data-plot-card="left"') + text.count('data-plot-card="right"')
    assert count == 2, f'{name}.html exposes {count} stable plot hosts'

print(f'Platform consistency audit passed for {version}: local Jacobian/OFAT/directional diagnostics, Morris design trajectories, local/global bounded response surfaces, time- and state-resolved global effects, limited dependence screening, synchronized public documentation, guarded browser capacity, synchronized navigation copy, and 14 two-panel workspaces.')
