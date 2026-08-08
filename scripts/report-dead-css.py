#!/usr/bin/env python3
"""Report CSS class/id selectors that nothing in the shipped source references.

This is a *report*, not a gate. It exists to give the v76 declutter a factual
deletion backlog instead of a taste argument.

Method: collect every class token and id used by any .html or .js in the repo
(JS included because navigation.js and the workspace modules inject markup at
runtime, so an unused-looking selector may be perfectly live). Then walk each
stylesheet and flag rules whose class/id tokens appear nowhere.

Limits, stated plainly:
  - A token assembled at runtime by string concatenation ('menu-' + kind) will
    not be found, so a flagged rule is a *candidate* for deletion, not proof.
  - Element/attribute-only selectors (a, [data-x], :root) are never flagged.
Verify a candidate before deleting it. The point is to shrink the search space
from 12k lines to a reviewable list.

Usage: python3 scripts/report-dead-css.py [--verbose]
"""
from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STYLES = ROOT / "styles"
SKIP_DIRS = {"node_modules", ".git", "dist", "__pycache__", "assets"}

TOKEN_RE = re.compile(r"[.#]([A-Za-z_][A-Za-z0-9_-]*)")
WORD_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_-]*")


def source_tokens() -> set[str]:
    """Every identifier-ish word appearing in shipped HTML/JS."""
    tokens: set[str] = set()
    for path in ROOT.rglob("*"):
        if path.is_dir() or any(p in SKIP_DIRS for p in path.parts):
            continue
        if path.suffix.lower() not in {".html", ".js"}:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        tokens.update(WORD_RE.findall(text))
    return tokens


def split_rules(css: str) -> list[tuple[str, int]]:
    """(selector-list, line-number) for each rule, ignoring at-rule preludes."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    rules: list[tuple[str, int]] = []
    line = 1
    buf: list[str] = []
    depth = 0
    for ch in css:
        if ch == "\n":
            line += 1
        if ch == "{":
            if depth == 0:
                selector = "".join(buf).strip()
                if selector and not selector.startswith("@"):
                    rules.append((selector, line))
                buf = []
            depth += 1
        elif ch == "}":
            depth = max(0, depth - 1)
            buf = []
        elif depth == 0:
            buf.append(ch)
    return rules


def main() -> int:
    verbose = "--verbose" in sys.argv
    used = source_tokens()
    total_rules = 0
    dead: dict[str, list[tuple[str, int, list[str]]]] = defaultdict(list)

    for sheet in sorted(STYLES.glob("*.css")):
        css = sheet.read_text(encoding="utf-8")
        for selector, line in split_rules(css):
            total_rules += 1
            tokens = set(TOKEN_RE.findall(selector))
            if not tokens:
                continue  # element/attribute-only selector; never flag
            if not (tokens & used):
                dead[sheet.name].append((selector, line, sorted(tokens)))

    flagged = sum(len(v) for v in dead.values())
    print(f"Scanned {total_rules} rules across {len(list(STYLES.glob('*.css')))} stylesheets.")
    print(f"Candidates with no referencing HTML/JS token: {flagged}\n")

    for name in sorted(dead, key=lambda n: -len(dead[n])):
        entries = dead[name]
        print(f"  {name}: {len(entries)} candidates")
        if verbose:
            for selector, line, tokens in entries:
                short = selector if len(selector) <= 90 else selector[:87] + "..."
                print(f"      L{line}: {short}")

    if not verbose and flagged:
        print("\nRe-run with --verbose for per-selector detail.")
    print("\nCandidates only. Confirm each before deleting; runtime-assembled class")
    print("names cannot be detected statically.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
