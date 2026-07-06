# Foko Lab v70.18 — Analysis-lab consistency audit

## Correction to the working assumption

The four analysis engines are not hollow. Read in full, they are dense but
substantial and **numerically correct** (verified against reference values):

- `linalg.js` — Gaussian solve, LU, QR, determinant, inverse, power-iteration
  eigen, Gram-Schmidt, RREF, null space, PCA, Markov steady state.
- `fitting.js` — polynomial / exponential / logistic / Michaelis-Menten fits
  with parameter SE, AIC/BIC, R², residual Q–Q.
- `networks.js` — Dijkstra, Brandes betweenness, closeness, eigenvector,
  PageRank, MST (Kruskal), label-propagation communities, resilience.
- `ml-lite.js` — linear / logistic regression, kNN, k-means, PCA, ROC,
  precision–recall, silhouette, elbow, anomaly detection, cross-validation.

The problem was never depth. It was **consistency of professional standard**.

## The inconsistency, precisely

Against the standard set by the Statistics engine (my v70.14 rewrite):

| Dimension | Statistics | linalg / fitting / networks / ml (before) |
|---|---|---|
| Precondition assertions | in every entry function | **absent** — bad input returned silent NaN / garbage |
| Node unit test | had one (then **dropped** by a later session) | **none** |
| Node-exported core | yes | yes (already consistent) |
| Foko* browser global | yes | yes (already consistent) |
| Cache token | 70.14 | drifted — 70.7 / 70.15 / 70.16, six versions across the tree |

So one lab failed loudly on bad input and was tested; four failed silently and
were untested. That is the whole inconsistency.

## Changes implemented (test-first, per protocol)

For each of the four engines, the sequence was: heavily-commented Node unit
test written first (correctness references + invalid-input checks) → confirmed
RED on the precondition checks → precondition guards added → GREEN.

1. **Precondition guards on every entry function**, using one consistent guard
   vocabulary per engine (`requireMatrix` / `requireSquare` / `requireVector`;
   `requirePairs` / `requireSameLength`; `requireEdges` / `requireNodePresent`;
   `requireDataMatrix` / `requireSameCount` / `requireClusterCount`). Malformed
   input now throws a named, specific error instead of producing NaN. This is
   the platform-wide standard your protocol calls for.

2. **Five Node unit tests** (`tests/js/*-core.test.js`), including the restored
   Statistics test. Each checks correctness against reference values **and**
   that entry points reject bad input. Totals: statistics 11, linalg 17,
   fitting 11, networks 10, ml 10 — 59 checks, all green.

3. **A pytest consistency contract** (`test_v70_18_engine_consistency.py`) that
   enforces the standard going forward: every engine must be Node-exported,
   expose a `Foko*` global, carry precondition guards, and have a Node test that
   checks preconditions. A future engine that skips any of these fails CI.

4. **Cache tokens** for the four edited engines bumped to `70.18.0`, so deployed
   clients fetch the guarded versions.

## Still inconsistent — deliberately deferred

These are real but lower-severity, and each is its own mechanical pass:

- **UI parity.** Statistics and ML expose a reproducible-script export;
  linalg / fitting have no export button, and the demo/preset affordance is
  present on fitting/networks/ml but not linalg. Standardize: every lab gets a
  `template`/demo loader and a copy-reproducible-config button.
- **Output formatting.** Statistics prints `key = value`; the others dump JSON.
  One shared formatter would unify the result panels.
- **Code style.** The four engines are written as dense single-line functions;
  Statistics is sectioned and commented. A reformat pass (no behaviour change)
  would make them equally auditable.
- **Version-token normalization.** Six tokens still coexist tree-wide (214 at
  70.7.0). One token everywhere, bumped every release, ends the "changed it but
  don't see it" class of bug. Blocked only by 7 active tests pinning 70.7.0 —
  a dedicated release.

## Validation

Full suite: 265 passed, 271 skipped. Node engine tests: 5/5 (59 checks). JS
syntax: clean.
