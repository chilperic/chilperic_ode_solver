# Repository structure and contribution guide

This guide separates maintained code, inputs, provenance and disposable outputs. It does not move existing files.

| Location | Purpose |
| --- | --- |
| `site/` | Authored public application used by serve.py and the root landing-page redirect. |
| `docs/` | Separately reachable publication tree; currently diverges from site/. Preserve pending reconciliation. |
| `tests/` | Regression checks. Some checks target historical layouts and need separate repair. |
| `tools/` | Release, inventory and recovery utilities. Several are historical transformations, not a general build command. |
| `evidence/` | Versioned historical acceptance evidence; do not treat old reports as current tests. |
| `recovery/` | Historical recovery records and source provenance. |
| `python/` | Python-related material; keep it separate from browser code. |
| `Root launch scripts, serve.py and index.html` | Existing entry points; preserve paths and redirect behaviour. |

## Outputs and version control

Use root `outputs/` or `tmp/` for disposable local runs. Curated figures, datasets, manuscripts, reference outputs and reproducibility evidence should be committed explicitly in their relevant project directory. Do not hide all PDFs, PNGs, CSVs, notebooks or HTML files with extension-wide ignore rules.

The ignore file prevents accidental additions of local environments, caches and credentials. It does not remove files that are already tracked and it does not erase Git history. Review `git status --short` before committing. Preserve lockfiles and sanitized environment examples when they are introduced.

Keep reusable code in the existing package/module directories and executable workflows in `scripts/` or `tools/`. Preserve original research material and its attribution under the existing provenance directories. A historical folder is not proof that its code is obsolete or safe to delete.

## Public URL preservation

Repository names, owner names, published HTML paths, assets, downloadable files, route anchors, worker/module URLs and service-worker scope form a compatibility boundary. A directory move needs an explicit mapping that keeps the existing public URLs, followed by tests of the relevant links and browser interactions. Do not change Pages source settings or hosting project roots as a cleanup shortcut.

## Publication-tree reconciliation

At the audited base commit, `site/` contains 737 tracked files and `docs/` contains 680: 535 shared files are identical, 145 differ, and 57 occur only in `site/`. There are no `docs/`-only files. Both public paths responded during the audit. They are not currently synchronized mirrors.

Before consolidating them, determine which path each consumer uses, compare the 145 conflicts, and decide on one authored source plus a reproducible publication step. Keep both existing public path families until compatibility is verified. Do not replace either tree wholesale or automatically copy private author inputs into it.

The README's former `deployment/802/` commands refer to a directory absent from this checkout. Use the existing root launch scripts for local browsing. Treat old release scripts and stored acceptance reports as historical evidence until rerun against a declared commit.
