#!/usr/bin/env python3
"""Normalize every page onto the central v76 application shell.

Navigation content and interaction live in src/v76/app-shell.js. Keeping this
maintenance entry point as a thin wrapper prevents generated pages from
reintroducing duplicated menus or page-specific navigation behavior.
"""

from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    subprocess.run(["node", "scripts/migrate-v76-shell.js"], cwd=ROOT, check=True)
    print("Normalized all authored pages onto the central v76 application shell.")


if __name__ == "__main__":
    main()
