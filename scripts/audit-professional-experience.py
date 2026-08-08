#!/usr/bin/env python3
"""Release gate for brand, subject taxonomy, UX identity, and audit evidence."""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / "VERSION.json").read_text(encoding="utf-8"))["version"]
CSS = (ROOT / "styles/v76-system.css").read_text(encoding="utf-8")
SHELL = (ROOT / "src/v76/app-shell.js").read_text(encoding="utf-8")

SUBJECTS = {
    "model-engineering", "dynamical-systems", "populations-evolution",
    "inference-uncertainty", "scientific-intelligence", "mathematical-structure",
}
SCIENTIFIC_LABS = {
    "studio", "workbench", "ode", "stochastic", "steady", "bifurcation",
    "agent", "population-genetics", "evolution", "sensitivity", "optimization",
    "fitting", "statistics", "advanced-methods", "ai-modeling", "sciml", "ml",
    "linalg", "networks", "symbolic",
}


def luminance(hex_color: str) -> float:
    values = [int(hex_color[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in values]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast(first: str, second: str) -> float:
    bright, dark = sorted((luminance(first), luminance(second)), reverse=True)
    return (bright + 0.05) / (dark + 0.05)


def token_rules(kind: str) -> dict[str, tuple[str, str, str]]:
    pattern = re.compile(
        rf'body\[data-{kind}="([^"]+)"\][^{{]*\{{[^}}]*--{kind}-accent:\s*(#[0-9a-f]{{6}});'
        rf'[^}}]*--{kind}-accent-soft:\s*(#[0-9a-f]{{6}});[^}}]*--{kind}-accent-on-dark:\s*(#[0-9a-f]{{6}})',
        re.I,
    )
    return {match.group(1): tuple(value.lower() for value in match.groups()[1:]) for match in pattern.finditer(CSS)}


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    subject_rules = token_rules("subject")
    lab_rules = token_rules("lab")
    check(SUBJECTS <= subject_rules.keys(), "one or more scientific subject families lack tokens")
    check(SCIENTIFIC_LABS <= lab_rules.keys(), "one or more scientific labs lack tokens")
    accents = [lab_rules[lab][0] for lab in SCIENTIFIC_LABS]
    check(len(set(accents)) == len(SCIENTIFIC_LABS), "scientific lab accents are not unique")

    for label, rules in (("subject", subject_rules), ("lab", {key: lab_rules[key] for key in SCIENTIFIC_LABS})):
        for name, (accent, soft, on_dark) in rules.items():
            check(contrast(accent, "#ffffff") >= 4.5, f"{label} {name} fails AA on white")
            check(contrast(accent, soft) >= 4.5, f"{label} {name} fails AA on its tint")
            check(contrast(on_dark, "#17232d") >= 4.5, f"{label} {name} fails AA on dark instrument surfaces")

    compatibility = (ROOT / "styles/lab-identity.css").read_text(encoding="utf-8")
    check(not re.search(r"--lab-accent\s*:", compatibility), "legacy stylesheet redeclares the palette")
    check("LAB_IDENTITIES" in SHELL and "SUBJECTS" in SHELL, "shell taxonomy is missing")
    check(
        "adaptiveBrandMarkup" in SHELL
        and "foko-brand-observe-top" in SHELL
        and "foko-brand-manifold" in SHELL
        and "foko-brand-observe-mid" in SHELL
        and "foko-brand-observe-bottom" in SHELL
        and "foko-brand-state-axis" in SHELL
        and "foko-brand-state" in SHELL,
        "adaptive State Observatory logo geometry is missing",
    )
    check("data-lab-target" in SHELL and "data-subject-target" in SHELL, "navigation does not expose two-level identity")

    for name in (
        "foko-lab-emblem.svg", "foko-lab-mark.svg", "foko-lab-mark-mono.svg",
        "foko-lab-micro.svg", "foko-lab-logo.svg", "foko-lab-logo-display.svg",
    ):
        root = ET.parse(ROOT / "assets/brand" / name).getroot()
        check(root.attrib.get("role") == "img" and root.attrib.get("aria-labelledby") == "title desc", f"{name} is not an accessible SVG")

    atlas = (ROOT / "src/v72/example-atlas.js").read_text(encoding="utf-8")
    check("LAB_IDENTITY" in atlas and "data-subject-target" in atlas and "data-lab-target" in atlas, "Atlas cards are not identity coded")
    home = (ROOT / "index.html").read_text(encoding="utf-8")
    check(home.count("data-subject-target=") >= 15 and home.count("data-lab-target=") >= 15, "home routes do not visibly carry the taxonomy")

    platform = (ROOT / "src/platform/shell.js").read_text(encoding="utf-8")
    scientific_position = platform.find('<option value="scientific">Scientific categorical</option>')
    identity_position = platform.find('<option value="lab-identity">Lab accent · presentation only</option>')
    check(0 <= scientific_position < identity_position, "scientific plot palette is not the default")
    check("(pal&&pal.value)||'scientific'" in platform, "plot fallback is coupled to GUI identity")

    check((ROOT / f"LIMITATIONS-v{VERSION}.md").exists(), "release limitations document is missing")
    validation = (ROOT / "VALIDATION.md").read_text(encoding="utf-8")
    check(f"v{VERSION}" in validation, "validation record is not current")
    check("125 JavaScript" not in validation and "320/320" not in validation, "validation record contains stale counts")

    print(
        f"Professional experience audit passed for {VERSION}: "
        f"{len(SUBJECTS)} scientific subjects, {len(SCIENTIFIC_LABS)} distinct labs, "
        "responsive State Observatory identity, AA shell contrast, semantic plot defaults, and current release evidence."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
