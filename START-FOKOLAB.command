#!/bin/sh
set -eu
cd -- "$(dirname -- "$0")"
if command -v python3 >/dev/null 2>&1; then exec python3 serve.py "$@"; fi
if command -v python >/dev/null 2>&1; then exec python serve.py "$@"; fi
printf '%s\n' 'Python 3 is required for the local server. No Node, npm or source editor is needed.' >&2
exit 1
