#!/usr/bin/env python3
"""Predict load-time failures in the offline Chromium gates, without a browser.

Each scripts/check-*-offline.js rebuilds a page by calling setContent() on
stripped HTML and then re-injecting scripts by hand. Several src modules guard
their dependencies at load time, e.g.

    if (!LIVE3D) throw new Error('Agent Lab requires FokoLive3D.');

If a gate injects such a module but omits the module that defines the global,
the gate throws on injection and tests nothing. That is exactly how
check-agent-layout-offline.js broke, and it is statically detectable.

Mere omission is NOT a defect: gates legitimately skip modules they do not
exercise. The defect is specifically an injected module whose guard cannot be
satisfied by the modules injected before it.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

DEFINE_RE = re.compile(r"(?:root|window|globalThis)\.(Foko[A-Za-z0-9_]+)\s*=")
GUARD_RE = re.compile(r"throw new Error\('([^']*requires[^']*)'\)")
GLOBAL_RE = re.compile(r"\bFoko[A-Za-z0-9_]+\b")
INJECT_RE = re.compile(r"'((?:src|assets)/[A-Za-z0-9_./-]+\.js)'")


def build_definition_map() -> dict[str, str]:
    """global name -> relative path of the module that defines it."""
    defines: dict[str, str] = {}
    for path in sorted(SRC.rglob("*.js")):
        rel = path.relative_to(ROOT).as_posix()
        for name in DEFINE_RE.findall(path.read_text(encoding="utf-8")):
            defines.setdefault(name, rel)
    return defines


def required_globals(rel: str) -> list[str]:
    """Globals a module hard-requires at load time, from its throw guards."""
    path = ROOT / rel
    if not path.exists():
        return []
    needed: list[str] = []
    for message in GUARD_RE.findall(path.read_text(encoding="utf-8")):
        for name in GLOBAL_RE.findall(message):
            if name not in needed:
                needed.append(name)
    return needed



def self_injection_lines(source: str) -> str:
    """Only text that actually injects scripts, excluding equality filters."""
    keep = []
    for line in source.splitlines():
        if "===" in line or "!==" in line:
            continue
        keep.append(line)
    return "\n".join(keep)

def main() -> int:
    defines = build_definition_map()
    failures: list[str] = []
    gates = sorted((ROOT / "scripts").glob("check-*-offline.js"))

    for gate in gates:
        source = gate.read_text(encoding="utf-8")
        if "resources(html,'script','src')" in source.replace(' ', ''):
            print(f"skip    {gate.name}: derives its script list from the page (cannot drift)")
            continue
        injected = []
        for rel in INJECT_RE.findall(self_injection_lines(source)):
            if rel not in injected:
                injected.append(rel)

        available: set[str] = set()
        for rel in injected:
            for name in required_globals(rel):
                if name not in available:
                    owner = defines.get(name, "<undefined anywhere>")
                    failures.append(
                        f"{gate.name}: injects {rel}, which requires {name}, "
                        f"but {owner} is not injected before it"
                    )
            available.update(n for n, src in defines.items() if src == rel)

        print(f"checked {gate.name}: {len(injected)} injected modules")

    if failures:
        print(f"\nOffline gate guard audit FAILED ({len(failures)} unsatisfied load-time guards):\n")
        for f in failures:
            print("  " + f)
        return 1

    print("\nOffline gate guard audit passed: every injected module's load-time guards are satisfiable.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
