#!/usr/bin/env bash
# Foko Lab v77.2.0 local validation runner.
# Usage: ./test-v77.2.0-local.sh [--full] [--serve|--browser] [--skip-install]
set -euo pipefail

EXPECTED_VERSION="77.2.0"
PREVIOUS_VERSION="76.2.0"
previous='76.2.0'
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

FULL=0
SERVE=0
OPEN_DEMO=0
SKIP_INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --quick) FULL=0 ;;
    --full|--certify) FULL=1 ;;
    --serve) SERVE=1 ;;
    --browser|--demo) SERVE=1; OPEN_DEMO=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    --help|-h)
      echo "Usage: ./test-v77.2.0-local.sh [--full] [--serve|--browser] [--skip-install]"
      echo "  --quick         Alias for the default reliable baseline validation."
      echo "  --full          Add every Chromium regression and Playwright release-certification gate."
      echo "  --certify       Alias for --full."
      echo "  --serve         Serve the verified platform after the requested gates pass."
      echo "  --browser       Baseline-validate, choose a fresh port, serve, and open the default browser."
      echo "  --demo          Alias for --browser."
      echo "  --skip-install  Reuse already-installed Python, Node, and browser dependencies."
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

FOKOLAB_PORT="$(python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    print(sock.getsockname()[1])
PY
)"
export FOKOLAB_PORT
export FOKOLAB_E2E_WORKERS="${FOKOLAB_E2E_WORKERS:-1}"
VENV_DIR="${FOKOLAB_VENV_DIR:-${TMPDIR:-/tmp}/fokolab-v77.2.0-venv}"
NPM_CACHE="${FOKOLAB_NPM_CACHE:-${TMPDIR:-/tmp}/fokolab-v77.2.0-npm-cache}"
export NPM_CONFIG_CACHE="$NPM_CACHE"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-${TMPDIR:-/tmp}/fokolab-v77.2.0-playwright}"
mkdir -p "$NPM_CACHE" "$PLAYWRIGHT_BROWSERS_PATH"

node -e "const v=require('./VERSION.json'); if(v.version!=='${EXPECTED_VERSION}') throw new Error('Expected ${EXPECTED_VERSION}, got '+v.version)"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  if [[ ! -x "$VENV_DIR/bin/python" ]]; then python3 -m venv --copies "$VENV_DIR"; fi
  source "$VENV_DIR/bin/activate"
  if ! python -c 'import bs4, pytest' >/dev/null 2>&1; then python -m pip install --disable-pip-version-check -r requirements.txt; fi
  if ! python -c 'import numpy, scipy, sklearn, networkx, sympy' >/dev/null 2>&1; then python -m pip install --disable-pip-version-check -r requirements-validation.txt; fi
  if [[ "$FULL" -eq 1 ]] && ! node -e "require('@playwright/test')" >/dev/null 2>&1; then npm ci --registry=https://registry.npmjs.org --ignore-scripts --no-audit --no-fund --omit=optional; fi
  if [[ "$FULL" -eq 1 ]] && ! node - <<'NODE'
const fs = require('fs');
const { chromium } = require('playwright');
const candidates = [process.env.PLAYWRIGHT_CHROMIUM_PATH, '/usr/bin/chromium', chromium.executablePath()].filter(Boolean);
process.exit(candidates.some(candidate => fs.existsSync(candidate)) ? 0 : 1);
NODE
  then
    npx playwright install chromium
  fi
elif [[ -x "$VENV_DIR/bin/python" ]]; then
  source "$VENV_DIR/bin/activate"
elif ! python3 -c 'import bs4, pytest, numpy, scipy, sklearn, networkx, sympy' >/dev/null 2>&1; then
  echo "Python validation dependencies are missing; rerun without --skip-install." >&2
  exit 2
fi

echo "Foko Lab v${EXPECTED_VERSION} validation · fresh port ${FOKOLAB_PORT}"
if [[ "$FULL" -eq 1 ]]; then
  echo "Validation mode: full release certification (baseline + Chromium + Playwright)."
else
  echo "Validation mode: reliable local baseline. Add --full only when release certification is required."
fi
npm test
npm run test:reference

if [[ "$FULL" -eq 1 ]]; then
  npm run test:navigation-hitboxes-offline
  npm run test:agent-layout-offline
  npm run test:visual-contracts-offline
  npm run test:analysis-taxonomy-offline
  npm run test:home-research-rerun-offline
  npm run test:sensitivity-offline
  npm run test:guides-offline
  npm run test:e2e
fi

echo "All requested validation gates passed."
if [[ "$SERVE" -eq 1 ]]; then
  DEMO_URL="http://127.0.0.1:${FOKOLAB_PORT}/"
  echo "Open ${DEMO_URL} · Ctrl+C stops the server."
  if [[ "$OPEN_DEMO" -eq 1 ]]; then
    (
      sleep 1
      if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$DEMO_URL" >/dev/null 2>&1
      elif command -v gio >/dev/null 2>&1; then
        gio open "$DEMO_URL" >/dev/null 2>&1
      elif command -v open >/dev/null 2>&1; then
        open "$DEMO_URL" >/dev/null 2>&1
      else
        echo "No browser launcher was found. Open ${DEMO_URL} manually." >&2
      fi
    ) &
  fi
  exec python3 -m http.server "$FOKOLAB_PORT" --bind 127.0.0.1
fi
