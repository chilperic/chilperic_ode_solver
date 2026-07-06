# AUDIT v70.20 — cache-token normalization

## Scope

This release implements leverage point 1 only: one cache token everywhere.

The user explicitly identified six coexisting cache-token families as a recurring cause of stale UI reports such as "changed it but I do not see it" and "Mathematical Beauty is invisible." This release avoids bundling unrelated features so the deployment/cache contract can be tested cleanly.

## Changes

- Normalized every local asset query token to:

```text
?v=71.46.0
```

- Removed legacy local asset cache tokens from HTML, CSS, JS, docs and tests.
- Updated older regression tests that pinned historical tokens.
- Added a dedicated token contract:

```text
tests/test_v70_20_token_normalization.py
```

## Why this matters

Before this release, the tree contained many token families, including:

- `70.7.0`
- `70.10.0`
- `70.11.0`
- `70.13.0`
- `70.15.0`
- `70.18.0`
- `70.19.0`
- older `2.x` / `3.x` tokens

That made browser cache behavior indistinguishable from implementation failure. After v70.20, a hard refresh or redeploy has a single cache target.

## Validation

- `python3 -m pytest -q tests` → 272 passed, 271 skipped
- `node tests/js/*.test.js` → passed
- `node tests/test_v70_9_numeric_cores_node.js` → passed
- `node tests/test_v70_11_numeric_cores_node.js` → passed
- `node tests/test_v70_16_numeric_depth_node.js` → passed
- `node tests/test_v70_17_consistency_depth_node.js` → passed
- `node tests/test_v70_19_data_engine_node.js` → passed
- `node --check src/*.js src/stochastic/*.js` → passed

## Remaining work

Next release should be v70.21: migrate duplicated engine validation guards to FokoKit.
