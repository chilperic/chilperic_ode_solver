#!/usr/bin/env python3
"""Build a deterministic, test-gated Foko Lab release archive."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / "VERSION.json").read_text(encoding="utf-8"))["version"]
DIST = ROOT / "dist"
ARCHIVE_BASENAME = f"foko-lab-v{VERSION}-complete"
ARCHIVE = DIST / f"{ARCHIVE_BASENAME}.zip"
MANIFEST = ROOT / "RELEASE_MANIFEST.json"

EXCLUDED_DIRS = {
    ".git", ".venv", "venv", "node_modules", "__pycache__", ".pytest_cache",
    "dist", "release-audits", "release-history", "test-results", "playwright-report"
}
EXCLUDED_PREFIXES = {Path("tests/archive")}
EXCLUDED_SUFFIXES = {".pyc", ".pyo", ".zip", ".swp", "~"}
EXCLUDED_NAMES = {".DS_Store"}
FIXED_TIME = (2026, 1, 1, 0, 0, 0)


def is_excluded(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    if any(part in EXCLUDED_DIRS for part in rel.parts):
        return True
    if any(rel == prefix or prefix in rel.parents for prefix in EXCLUDED_PREFIXES):
        return True
    if path.name in EXCLUDED_NAMES:
        return True
    if any(path.name.endswith(suffix) for suffix in EXCLUDED_SUFFIXES):
        return True
    return False


def release_files() -> list[Path]:
    files = []
    for path in ROOT.rglob("*"):
        if path.is_file() and not is_excluded(path) and path != MANIFEST:
            files.append(path)
    return sorted(files, key=lambda p: p.relative_to(ROOT).as_posix())


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_tests() -> None:
    print("Running active release gate...", flush=True)
    subprocess.run(["npm", "test"], cwd=ROOT, check=True)
    subprocess.run(["npm", "run", "test:reference"], cwd=ROOT, check=True)
    subprocess.run(["npm", "run", "test:navigation-hitboxes-offline"], cwd=ROOT, check=True)
    subprocess.run(["npm", "run", "test:agent-layout-offline"], cwd=ROOT, check=True)
    subprocess.run(["npm", "run", "test:visual-contracts-offline"], cwd=ROOT, check=True)
    subprocess.run(["npm", "run", "test:analysis-taxonomy-offline"], cwd=ROOT, check=True)
    subprocess.run(["npm", "run", "test:home-research-rerun-offline"], cwd=ROOT, check=True)
    subprocess.run(["npm", "run", "test:sensitivity-offline"], cwd=ROOT, check=True)
    subprocess.run(["npm", "run", "test:guides-offline"], cwd=ROOT, check=True)


def write_manifest(files: list[Path]) -> None:
    payload = {
        "release": VERSION,
        "archiveRoot": ARCHIVE_BASENAME,
        "scientificContract": "SCIENTIFIC_CONTRACT.md",
        "capabilityMatrix": "CAPABILITIES.json",
        "files": [
            {
                "path": path.relative_to(ROOT).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
            for path in files
        ],
    }
    MANIFEST.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def add_file(zf: zipfile.ZipFile, path: Path) -> None:
    rel = path.relative_to(ROOT).as_posix()
    info = zipfile.ZipInfo(f"{ARCHIVE_BASENAME}/{rel}", FIXED_TIME)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = (0o755 if os.access(path, os.X_OK) else 0o644) << 16
    zf.writestr(info, path.read_bytes())


def build() -> None:
    if "--skip-tests" not in sys.argv:
        run_tests()
    files = release_files()
    write_manifest(files)
    files = release_files() + [MANIFEST]
    DIST.mkdir(exist_ok=True)
    if ARCHIVE.exists():
        ARCHIVE.unlink()
    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in sorted(files, key=lambda p: p.relative_to(ROOT).as_posix()):
            add_file(zf, path)
    checksum = sha256(ARCHIVE)
    checksum_path = ARCHIVE.with_suffix(".zip.sha256")
    checksum_path.write_text(f"{checksum}  {ARCHIVE.name}\n", encoding="utf-8")
    print(f"Built {ARCHIVE}")
    print(f"SHA-256 {checksum}")


if __name__ == "__main__":
    build()
