#!/usr/bin/env bash
# Foko Lab v72.48.0 local validation runner.
# This runner never starts the server after a failed gate and keeps an interactive
# terminal open on failure when a TTY is available.
set +e

EXPECTED_VERSION="72.48.0"
PREVIOUS_VERSION="72.47.0"
PORT=8102
BASE_DIR="${FOKOLAB_RELEASE_DIR:-$HOME/Downloads}"
ZIP_FILE="foko-lab-v72.48.0-platform-benchmark-hardening.zip"
TEST_DIR="foko-lab-v72-48-0-test"
PROJECT_DIR="$BASE_DIR/$TEST_DIR/foko-lab-v72.48.0-platform-benchmark-hardening"
ENV_DIR="$HOME/.venvs/fokolab-v72-48-0"
FAILED_GATE=""

keep_terminal_open() {
  trap - EXIT
  local code="${1:-1}"
  echo
  echo "=================================================="
  echo "VALIDATION FAILED${FAILED_GATE:+ — $FAILED_GATE}"
  echo "No server was started. Review the first error above."
  echo "The extracted project remains at: $PROJECT_DIR"
  echo "=================================================="
  if [[ -t 0 && -t 1 ]]; then
    echo "An interactive shell will remain open. Type 'exit' when finished."
    cd "${PROJECT_DIR:-$BASE_DIR}" 2>/dev/null || cd "$BASE_DIR" || true
    exec "${SHELL:-/bin/bash}" -i
  fi
  exit "$code"
}

run_gate() {
  local label="$1"; shift
  echo
  echo "=== $label ==="
  "$@"
  local code=$?
  if [[ $code -ne 0 ]]; then
    FAILED_GATE="$label"
    keep_terminal_open "$code"
  fi
}

trap 'code=$?; if [[ $code -ne 0 ]]; then FAILED_GATE=${FAILED_GATE:-unexpected-shell-error}; keep_terminal_open "$code"; fi' EXIT

cd "$BASE_DIR" || { FAILED_GATE="open downloads directory"; keep_terminal_open 1; }

echo "=================================================="
echo "Foko Lab v${EXPECTED_VERSION} — modelling handbook, Sensitivity depth and platform stability"
echo "Port: $PORT"
echo "=================================================="

[[ -f "$ZIP_FILE" ]] || { echo "ERROR: ZIP not found: $BASE_DIR/$ZIP_FILE"; FAILED_GATE="archive discovery"; keep_terminal_open 1; }
if [[ -f "${ZIP_FILE}.sha256" ]]; then
  run_gate "Archive checksum" sha256sum -c "${ZIP_FILE}.sha256"
fi

fuser -k "${PORT}/tcp" 2>/dev/null || true
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR" || { FAILED_GATE="create extraction directory"; keep_terminal_open 1; }
run_gate "Extract release" unzip -q -o "$ZIP_FILE" -d "$TEST_DIR"
[[ -d "$PROJECT_DIR" ]] || { echo "ERROR: Expected directory not found: $PROJECT_DIR"; find "$BASE_DIR/$TEST_DIR" -maxdepth 3 -type d | sort; FAILED_GATE="release structure"; keep_terminal_open 1; }
cd "$PROJECT_DIR" || { FAILED_GATE="enter project"; keep_terminal_open 1; }

run_gate "Release identity and manifest preflight" python3 - <<'PY'
import hashlib, json
from pathlib import Path
expected='72.48.0'
previous='72.47.0'
root=Path('.')
version=json.loads((root/'VERSION.json').read_text())['version']
assert version == expected, (version, expected)
for path in list(root.glob('*.html')) + list((root/'src').rglob('*.js')) + list((root/'styles').glob('*.css')):
    text=path.read_text(encoding='utf-8', errors='ignore')
    assert f'?v={previous}' not in text, f'stale runtime token in {path}'
manifest=json.loads((root/'RELEASE_MANIFEST.json').read_text())
assert manifest['release']==expected
for row in manifest['files']:
    path=root/row['path']
    assert path.is_file(), f'missing {path}'
    assert path.stat().st_size==row['bytes'], f'size mismatch {path}'
    assert hashlib.sha256(path.read_bytes()).hexdigest()==row['sha256'], f'checksum mismatch {path}'
assert (root/'sensitivity.html').is_file()
sensitivity=(root/'sensitivity.html').read_text()
for control in (
    'sensitivitySecondOrder','sensitivityBootstrap','sensitivityBudget',
    'sensitivityOfatPoints','sensitivityDirection','sensitivityResponseSurface',
    'sensitivitySurfaceFirst','sensitivitySurfaceSecond','sensitivitySurfacePoints',
    'sensitivityDependence','sensitivityDependencePermutations',
    'sensitivityExampleSearch','sensitivityFamilyFilter','sensitivityViewScale','sensitivityTopN'
):
    assert f'id="{control}"' in sensitivity, f'missing {control}'
print(f"Preflight passed: {len(manifest['files'])} manifest-controlled files; 17-model Sensitivity library, advanced diagnostics, browser-capacity controls and learning surfaces present.")
PY

rm -rf .venv venv .pytest_cache node_modules test-results playwright-report
find . -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
find . -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete 2>/dev/null || true
rm -rf "$ENV_DIR"
mkdir -p "$HOME/.venvs"
run_gate "Create Python environment" /usr/bin/python3 -m venv "$ENV_DIR"
# shellcheck disable=SC1090
source "$ENV_DIR/bin/activate"
run_gate "Upgrade pip" python -m pip install --upgrade pip
run_gate "Install Python runtime requirements" python -m pip install -r requirements.txt
run_gate "Install Python validation requirements" python -m pip install -r requirements-validation.txt
run_gate "Install browser-test dependencies" npm ci --registry=https://registry.npmjs.org --ignore-scripts --no-audit --no-fund --omit=optional
run_gate "Install Chromium" npx playwright install chromium

run_gate "Browser inventory" bash -lc '
  output=$(npx playwright test --list 2>&1); code=$?; printf "%s\n" "$output"; [[ $code -eq 0 ]] || exit $code
  printf "%s\n" "$output" | grep -Fq "Total: 123 tests in 3 files"
'
run_gate "Complete numerical, structural, input, plot and benchmark gate" npm test
run_gate "Independent numerical reference matrix" npm run test:reference
run_gate "Navigation and Symbolic hitbox Chromium gate" npm run test:navigation-hitboxes-offline
run_gate "Agent two-up Chromium gate" npm run test:agent-layout-offline
run_gate "Shared plot, ODE, Steady-State and Symbolic Chromium gate" npm run test:visual-contracts-offline
run_gate "Optimization and Steady-State taxonomy Chromium gate" npm run test:analysis-taxonomy-offline
run_gate "Homepage T-cell rerun Chromium gate" npm run test:home-research-rerun-offline
run_gate "Sensitivity Analysis Chromium gate" npm run test:sensitivity-offline
run_gate "Modelling handbook and tutorial Chromium gate" npm run test:guides-offline
run_gate "Sensitivity input and capacity regression repeated three times" npx playwright test tests/e2e/main-labs-smoke.spec.js -g "Sensitivity Analysis accepts editable scientific inputs" --repeat-each=3
run_gate "Advanced Global Sensitivity regression repeated three times" npx playwright test tests/e2e/main-labs-smoke.spec.js -g "Sensitivity Analysis exposes advanced Morris and second-order global diagnostics" --repeat-each=3
run_gate "Complete 123-test browser suite" npm run test:e2e

trap - EXIT
echo
echo "=================================================="
echo "ALL VALIDATION GATES PASSED"
echo "The server now stays attached to this terminal."
echo "Open: http://127.0.0.1:${PORT}/"
echo "Sensitivity: http://127.0.0.1:${PORT}/sensitivity.html"
echo "Press Ctrl+C to stop the server."
echo "=================================================="
exec python3 -m http.server "$PORT" --bind 127.0.0.1
