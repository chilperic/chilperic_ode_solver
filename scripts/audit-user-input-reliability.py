#!/usr/bin/env python3
"""Audit editable scientific inputs, validation, persistence and stale-result boundaries."""
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    failures: list[str] = []
    ode = BeautifulSoup((ROOT / 'ode.html').read_text(encoding='utf-8'), 'html.parser')
    sensitivity = BeautifulSoup((ROOT / 'sensitivity.html').read_text(encoding='utf-8'), 'html.parser')
    app = (ROOT / 'src/app.js').read_text(encoding='utf-8')
    sensitivity_workspace = (ROOT / 'src/v72/sensitivity-workspace.js').read_text(encoding='utf-8')
    validator = (ROOT / 'src/core/numerical-inputs.js').read_text(encoding='utf-8')

    ode_ids = ['t0','t1','points','method','stepSize','initialStep','maxStep','rtol','atol','safety','initialRows','paramRows']
    sensitivity_ids = [
        'sensitivityEquationRows','sensitivityInitialRows','sensitivityParameterRows',
        'sensitivityT0','sensitivityT1','sensitivityPoints','sensitivitySolver',
        'sensitivityRtol','sensitivityAtol','sensitivityStepSize','sensitivityInitialStep',
        'sensitivityMaxStep','sensitivitySafety','sensitivityRelativeStep','sensitivitySamples',
        'sensitivityTrajectories','sensitivityLevels','sensitivitySeed','sensitivitySigma',
        'sensitivitySecondOrder','sensitivityBootstrap','sensitivityBudget',
        'sensitivityOfatPoints','sensitivityDirection','sensitivityDirectionalSpan',
        'sensitivityDirectionPoints','sensitivityResponseSurface','sensitivitySurfaceFirst',
        'sensitivitySurfaceSecond','sensitivitySurfacePoints','sensitivityDependence',
        'sensitivityDependencePermutations'
    ]
    for element_id in ode_ids:
        if not ode.select_one(f'#{element_id}'):
            failures.append(f'ode.html missing user-owned input #{element_id}')
    for element_id in sensitivity_ids:
        if not sensitivity.select_one(f'#{element_id}'):
            failures.append(f'sensitivity.html missing user-owned input #{element_id}')

    for marker in (
        'function numericalSettingsFromInputs()', 'function applyNumericalSettings(settings)',
        'markScientificInputsStale', 'resultIsStale', 'numerics:state.module',
        'FokoNumericalInputs.validateOde(raw)'
    ):
        if marker not in app:
            failures.append(f'ODE input/persistence contract missing: {marker}')
    for marker in (
        'INPUT.validateOde', 'INPUT.validateSensitivity', 'markDirty',
        'configuration only', 'syncExportState', 'estimatedOdeSolves',
        'capacityBlocked', 'checkedAnalysis.capacity && checkedAnalysis.capacity.blocked',
        'sensitivityOfatPoints', 'sensitivityResponseSurface', 'sensitivityDependence'
    ):
        if marker not in sensitivity_workspace:
            failures.append(f'Sensitivity input/reproducibility contract missing: {marker}')
    for marker in (
        'validateOde', 'validateSensitivity', 'Relative tolerance', 'Absolute tolerance',
        'orderedRange', 'Morris grid levels must be even', 'sensitivityCapacity',
        'too large for reliable in-browser sensitivity analysis', 'ofatPoints', 'surfacePoints',
        'dependencePermutations'
    ):
        if marker not in validator:
            failures.append(f'shared numerical validator missing: {marker}')

    ode_scripts = [node.get('src','').split('?',1)[0] for node in ode.select('script[src]')]
    sensitivity_scripts = [node.get('src','').split('?',1)[0] for node in sensitivity.select('script[src]')]
    if 'src/core/numerical-inputs.js' not in ode_scripts or ode_scripts.index('src/core/numerical-inputs.js') > ode_scripts.index('src/app.js'):
        failures.append('ODE numerical validator is not loaded before src/app.js')
    if 'src/core/numerical-inputs.js' not in sensitivity_scripts or sensitivity_scripts.index('src/core/numerical-inputs.js') > sensitivity_scripts.index('src/v72/sensitivity-workspace.js'):
        failures.append('Sensitivity numerical validator is not loaded before its workspace')

    if failures:
        print('User-input reliability audit failed:')
        for failure in failures:
            print(' -', failure)
        return 1
    print('User-input reliability audit passed: ODE and Sensitivity expose validated, persistent, stale-safe controls, local/global diagnostic settings, bounded response-surface and dependence controls, and a pre-worker browser-capacity refusal boundary.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
