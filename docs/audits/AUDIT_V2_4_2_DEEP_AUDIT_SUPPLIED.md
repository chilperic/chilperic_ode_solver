# Chilperic ODE v2.4.2 — Deep Audit

**Files audited:** `index.html`, `stochastic.html`, `src/app.js` (785 lines), `src/stochastic/stochastic-lab.js` (683 lines), `src/worker.js` (237 lines), `styles/style.css` (277 lines)  
**Date:** June 2026

---

## Executive summary

This release makes two meaningful additions: a custom CTMC/Gillespie model builder in the Stochastic Lab (the symmetry with ODE Lab equation editing is now architecturally complete), and a library of 15 stochastic examples spanning six mathematical families. The scientific content of the stochastic examples is largely correct — conservation laws hold for the CTMC models, the GBM uses the exact log-normal scheme rather than Euler-Maruyama, and the population-genetics and optimal-stopping engines are mathematically sound. However there are four bugs that affect user-visible behaviour, two of which will produce wrong outputs silently. The two open issues from the v2.1.9 audit that were not carried forward are now confirmed resolved (SBML piecewise throws correctly; the Portfolio double-constraint is gone). The Braess paradox narrative error persists.

The stochastic lab runs entirely on the main thread without a Web Worker. For the current preset run counts this is acceptable, but two engines (Resonance, SIR at max runs) will cause several seconds of UI freeze on mid-range hardware.

---

## Part I — Bugs

### 🔴 BUG-1 — GBM time horizon ignores Run settings panel

**Location:** `function runGBM`

```js
const tEnd = p.tEnd || settings.tEnd;
```

`p.tEnd` is the GBM model's own parameter (`{ X0:1, mu:0.04, sigma:0.35, tEnd:20 }`), which is always truthy. `settings.tEnd` is the value from the Run settings panel. Since `p.tEnd` is tested first and is always set, the user-facing "time horizon" input has zero effect on GBM simulations — the model always runs for 20 time units regardless of what the user types. A user who wants to compare 10-year vs 30-year paths is silently ignored.

**Fix:**
```js
const tEnd = settings.tEnd || p.tEnd || 20;
```
Or better: remove `tEnd` from the GBM `params` object and rely exclusively on `settings.tEnd`. The duplicate parameter causes the confusion.

---

### 🔴 BUG-2 — Propensity validation checks syntax only; unknown names silently produce zero

**Location:** `function validateCTMCModel`, `function compileExpr`

The validation step calls `compileExpr(ev.propensity)` to verify syntax. This catches malformed JS like `beta*S*I/` (parse error) but passes `beta * Infected * Susceptible / N` even when states are named `S`, `I`, `R`. At runtime, `with(ctx)` looks up `Infected` → `undefined`, and `Math.max(0, Number(undefined) || 0)` returns `0`. The event fires with zero propensity and never occurs. The user sees no error, no warning, and no event firings — just a population that never changes for that reaction.

This is the stochastic equivalent of a typo in an ODE equation that produces zero derivatives without error. For a new user building a custom model, this will produce completely wrong results with no diagnostic.

**Fix:** After the syntax check passes, inspect symbol nodes in the expression and warn if any are not present in `knownNames = new Set([...stateNames, ...paramNames, 'Math', 't'])`:
```js
const knownNames = new Set([
  ...names, ...Object.keys(model.params || {}),
  'Math', 'E', 'PI', 'min', 'max', 'abs', 'sqrt', 'exp', 'log', 'sin', 'cos'
]);
const syms = [...ev.propensity.matchAll(/\b([A-Za-z_]\w*)\b/g)].map(m => m[1]);
syms.filter(s => !knownNames.has(s)).forEach(s =>
  warnings.push(`Event "${ev.name}" propensity references unknown name "${s}".`)
);
```
This is a warning rather than an error (the user may have a reason), but it surfaces the problem.

---

### 🟠 BUG-3 — JSON editor textarea is silently overwritten by param edits

**Location:** `function syncAfterEdit`, `function renderJsonEditor`

The `syncAfterEdit` function (called on every parameter input change) re-renders the JSON editor textarea via `renderJsonEditor()`. If a user opens the JSON editor, starts editing the model schema directly, then adjusts a numeric parameter in the parameter panel above it, their partial JSON edits are overwritten without warning. The textarea reverts to the current `currentModel` state, losing whatever structural changes the user had typed.

This is particularly disruptive for the CTMC custom builder, where the workflow of "edit a few params, then restructure the JSON" is natural.

**Fix:** Track whether the JSON textarea has unsaved edits (via a `dirty` flag set on `input`, cleared on `applyJson`). When `renderJsonEditor` is called while `dirty === true`, skip the overwrite and show a warning badge: *"JSON has unsaved changes — Apply before editing parameters."*

---

### 🟠 BUG-4 — Mean-field toggle visible for non-CTMC engines but does nothing

**Location:** `stochastic.html` simulation panel, `function renderMeanFieldBox`

The "show deterministic mean-field approximation when available" checkbox appears for every engine. For non-CTMC engines (GBM, Wright-Fisher, branching, ratchet, etc.), checking or unchecking it has no effect: these engines do not call `meanFieldCTMC` and the `Compare` tab shows a static "not shown" message. A user exploring GBM will check this box expecting to see the `e^(μt)` mean-field curve and see nothing change.

**Fix:** In `renderSettings`, hide or disable the mean-field toggle for non-CTMC engines:
```js
$('meanFieldToggle').closest('label').classList.toggle(
  'hidden', currentPreset.engine !== 'ctmc'
);
```

---

## Part II — Design and UX issues

### UX-1 🟠 — Event updates are entered as raw JSON in a single-line input

**Location:** Structured CTMC editor, event rows

The "updates JSON" field for each event (`{"S":-1,"I":1}`) is rendered as a plain `<input>` (single-line text field). For a first-time user building a stochastic SIR model, typing `{"S":-1,"I":1}` correctly into a one-line box is non-obvious and fragile — missing a quote or brace produces a silent no-op (the update is not changed, and the only feedback is a brief `'Invalid updates JSON.'` flash in the validation line).

The rest of the stochastic editor uses friendly tabular inputs. This one field demands raw JSON knowledge from users who are not expected to be developers.

**Suggested fix:** Replace the JSON input with a per-state delta table: one row per state showing a `+/-` spinner or number input. Compile to JSON internally. This matches the level of abstraction of the rest of the editor.

---

### UX-2 🟡 — Resonance noise scan runs 1.5M iterations on the main thread

**Location:** `function runResonance`

The noise scan computes quality metrics at 31 noise levels × 80 micro-runs × 600 time points = 1,488,000 iterations, all synchronous in a `setTimeout(fn, 20)` callback. On mid-range hardware this causes 1–3 seconds of UI freeze after clicking Run. The progress bar advances to 35% and then the page is unresponsive until the computation finishes. There is no way to cancel.

This is less urgent than other items (it affects only one model), but it is the worst-performing engine and the freeze is noticeable.

**Fix:** Reduce the noise scan to 20 levels × 40 micro-runs × 300 points = 240,000 iterations, which would cut runtime by ~6× with minimal quality loss for a pedagogical plot. Alternatively, move the noise scan to a Web Worker (which the architecture currently lacks entirely).

---

### UX-3 🟡 — Python export is pseudocode, not runnable code

**Location:** `function pythonStarter`

```python
# For CTMC models, implement Gillespie SSA:
# 1. evaluate propensities from current state
# 2. sample tau = -log(U) / total_propensity
# ...
```

The Python export provides the model JSON and a comment describing the Gillespie algorithm steps — but no runnable Python code that would actually execute a simulation. The ODE Lab's Python export produces code you can paste into a terminal and run. The Stochastic Lab's equivalent is a JSON blob and prose commentary.

This asymmetry is mentioned in the release note as intentional ("reproducibility bridge"), but it significantly reduces the utility of the export tab for users who want to continue analysis in Python.

**Suggested fix:** Generate a working Gillespie SSA implementation for CTMC models:
```python
import numpy as np

# Gillespie direct method
def gillespie(model, tEnd, seed=0):
    rng = np.random.default_rng(seed)
    state = {s['name']: s['initial'] for s in model['states']}
    t, history = 0, [(0, dict(state))]
    while t < tEnd:
        props = [eval(e['propensity'], {**state, **model['params']}) for e in model['events']]
        a0 = sum(max(0, p) for p in props)
        if a0 == 0: break
        tau = rng.exponential(1 / a0)
        t += tau
        chosen = rng.choice(len(model['events']), p=[max(0,p)/a0 for p in props])
        for k, delta in model['events'][chosen]['updates'].items():
            state[k] = max(0, state[k] + delta)
        history.append((t, dict(state)))
    return history
```

---

## Part III — Scientific content

### ✅ CTMC example conservation laws

All four CTMC examples have correct stoichiometric conservation:

- **Birth-death:** X can reach 0 (absorbing state). No conservation — open system. Correct.
- **SIR:** S + I + R = 1000 = N at all times. Each event (infection, recovery) is a permutation. Conservation verified analytically.
- **Gene expression:** M and P are open systems (transcription creates mRNA from nothing, representing nuclear input flux). No conservation expected. Correct.
- **Michaelis-Menten SSA:** E + ES = 30 and S + ES + P = 120 conserved. Both verified analytically.

### ✅ GBM uses the exact log-normal scheme

```js
val *= Math.exp((p.mu - 0.5*p.sigma*p.sigma)*dt + p.sigma*Math.sqrt(dt)*randn(rng));
```

This is the Itô-correct exact discretisation for GBM, not Euler-Maruyama. The `−½σ²` Itô correction is present. The insight (*"Mean and typical outcome are different objects"*) correctly identifies the Jensen inequality trap: `E[X(T)] = X₀e^{μT}` but the typical (median) path follows `X₀e^{(μ−½σ²)T}`, which can decay when σ is large.

### ✅ Wright-Fisher: fixation dynamics correctly modelled

The selection model `w = p(1+s)/(p(1+s) + (1-p))` is the standard diploid selection coefficient. The absorption check (`freq === 0 || freq === 1`) correctly identifies fixation. The insight (*"A neutral allele can dominate without being fitter"*) is correct for `selection=0`.

### ✅ T-cell proliferation model is biologically coherent

`makeTCellModel(4)` generates 11 states (Q0–Q4, A0–A4, D) with 15 events. Division produces 2 daughter cells in the next quiescent generation (`Q(i+1) += 2`), matching CFSE dilution biology where daughters halve their fluorescence label. The `live` derived variable sums all non-dead states. Correct.

### 🟠 SCIENCE-1 — Braess paradox narrative still incorrect (carried from v2.1.9)

The Braess routing dynamics model in the ODE Lab continues to show the shortcut *improving* aggregate travel cost, not worsening it. The narrative says it *"can worsen collective travel cost"* — the opposite of what the model demonstrates. This issue was raised in the v2.1.9 audit and remains unaddressed.

### 🟡 SCIENCE-2 — Parrondo mixed-strategy drift not verified analytically

The model parameters (`pA=0.495, pBad=0.095, pGood=0.745, M=3`) are designed to exhibit Parrondo's paradox, but no analytical check is included in the code or narrative confirming that the mixed strategy produces positive drift for these specific values. The model produces a simulation result, but without the theoretical prediction shown alongside it (as GBM shows `E[X(T)]`), a user cannot verify whether the result is expected. The insight is correct qualitatively but lacks a quantitative anchor.

**Suggested addition:** Display the theoretical mean drift for the mixed strategy. For Parrondo with these parameters, the drift can be computed from the stationary distribution of (capital mod M) under the mixed chain.

### 🟡 SCIENCE-3 — Stochastic resonance quality metric is non-standard

The quality metric for stochastic resonance is `correct/hits` (precision of threshold crossings). This is not the standard signal-to-noise ratio (SNR) metric used in the stochastic resonance literature. The classical SNR measure is the power spectral density ratio of the signal peak to the noise floor. The precision metric is a reasonable pedagogical proxy but the narrative does not mention this distinction, which could mislead a user familiar with the stochastic resonance literature.

---

## Part IV — Maintenance

### MAINT-1 — `index.html` and `examples.html` load stale CSS (`v2.3.1`)

```html
<!-- index.html -->
<link href="styles/style.css?v=2.3.1" rel="stylesheet"/>
<!-- stochastic.html -->
<link href="styles/style.css?v=2.4.2" rel="stylesheet"/>
```

`stochastic.html` correctly references `v2.4.2`. Both `index.html` and `examples.html` still reference `v2.3.1`. Browsers with cached versions of the stylesheet will show the wrong styles on the ODE Lab and Model Atlas pages — potentially including visual regressions from the stochastic lab CSS that was added to the shared `style.css`.

**Fix:** Update both files to `?v=2.4.2`.

---

### MAINT-2 — 41 `color-mix()` calls with no `rgba()` fallbacks

Now 41 uses (up from 21) with still zero fallback values. Every call added for the stochastic lab layout continues the pattern of no `rgba()` fallback for Safari ≤16.1 and Firefox ≤112. This was flagged in every audit since v2.1.9.

---

### MAINT-3 — `visibleSeriesIndices` priority list still hardcoded to specific model names

Unchanged from v2.1.9. The function that limits trajectory display to 8 series for large models uses a hardcoded list (`['C14','C16','C18','CoA','ECoA',...]`). Custom models with more than 8 variables whose names don't match this list show variables 0–7 with no user control.

---

## Part V — Security note

### SEC-1 — CTMC propensity evaluated via `new Function()` + `with(ctx)`

User-entered propensity strings (both via the structured editor and via JSON import) are compiled with:
```js
Function('ctx', `with(ctx){ return Math.max(0, Number(${expr}) || 0); }`)
```

This executes arbitrary JavaScript. For a single-user static GitHub Pages application the threat model is self-XSS only. However, if users share model JSON files (e.g., as GitHub Gists linked from a course), a malicious model file could execute code in the importing user's browser context — making network requests, reading `localStorage`, or triggering `window.location` redirects. This is the same class of issue that the ODE Lab resolved by switching to Math.js safe evaluation.

The ODE Lab's approach (Math.js `parse + compile + evaluate` with an allowlist of symbol names) is the correct fix. The cost is adding Math.js as a dependency in `stochastic.html`. Given that the stochastic lab's expression language is the same subset (arithmetic, `sin`, `cos`, `exp`, `sqrt`, standard operators), this is a straightforward substitution.

---

## Summary

| ID | Severity | Issue |
|----|----------|-------|
| BUG-1 | 🔴 | GBM ignores settings time horizon (`p.tEnd` overrides `settings.tEnd`) |
| BUG-2 | 🔴 | Unknown names in propensity pass validation, silently produce zero at runtime |
| BUG-3 | 🟠 | JSON editor textarea overwritten by parameter edits without warning |
| BUG-4 | 🟠 | Mean-field toggle visible for non-CTMC engines; has no effect |
| UX-1 | 🟠 | Event updates entered as raw JSON in single-line input — hostile for non-developers |
| UX-2 | 🟡 | Resonance noise scan: 1.5M synchronous iterations, noticeably freezes UI |
| UX-3 | 🟡 | Python export is pseudocode, not runnable Gillespie code |
| SCIENCE-1 | 🟠 | Braess model doesn't exhibit the paradox it claims (carried from v2.1.9) |
| SCIENCE-2 | 🟡 | Parrondo mixed-strategy drift not verified against theoretical prediction |
| SCIENCE-3 | 🟡 | Stochastic resonance quality metric is non-standard; not identified as such |
| MAINT-1 | 🟠 | `index.html` + `examples.html` load CSS `v2.3.1`; stochastic loads `v2.4.2` |
| MAINT-2 | 🟡 | 41 `color-mix()` calls with no `rgba()` fallbacks |
| MAINT-3 | 🟡 | `visibleSeriesIndices` hardcoded to specific model variable names |
| SEC-1 | 🟡 | Propensity compiled via `new Function()` — same class of issue as pre-Math.js ODE Lab |

**Confirmed resolved from v2.1.9:** SBML piecewise now throws correctly. Portfolio double-constraint is gone. CSS version on `stochastic.html` is correct.
