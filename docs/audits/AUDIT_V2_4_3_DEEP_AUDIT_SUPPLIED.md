# Chilperic Dynamics v2.4.3 — Audit
## Focus: user model-building symmetry, stochastic lab design, and carry-forward fixes

**Files:** `src/app.js` (785 lines), `src/stochastic/stochastic-lab.js` (872 lines), `stochastic.html` (141 lines), `index.html` (265 lines), `styles/style.css` (287 lines)
**Date:** June 2026

---

## Executive summary

Most of the v2.4.2 bug fixes landed correctly — the JSON dirty-state protection is solid, the mean-field toggle is properly hidden, the per-state delta editor replaces raw JSON, the resonance scan is now 20×40×300 = 240K iterations (down from 1.5M), the Python Gillespie export is fully runnable, and Parrondo now shows a computed theoretical drift. However one bug was not fixed (GBM tEnd), one new bug was introduced (state rename does not update propensity strings), and the most important structural issue — the symmetry between the two labs from a user's model-building perspective — is not yet addressed. The stochastic library shows all 15 models as a flat scrollable list; the ODE Lab shows 6 core chips plus a full dropdown. This creates a navigation mismatch that mirrors the deeper conceptual gap in how the two labs scaffold building a new model.

---

## Part I — Carry-forward bugs

### 🔴 PERSIST-1 — GBM tEnd still ignores Run settings panel

**Location:** `function runGBM`

```js
const tEnd = p.tEnd || settings.tEnd;
```

`p.tEnd` is always 20 (the model's own parameter). It is truthy, so `settings.tEnd` from the Run settings input is permanently shadowed. The audit explicitly called this out; it was listed as fixed in `AUDIT_V2_4_3_AUDIT_FIXES.md` but the code is unchanged. The GBM model should be the only engine where time horizon is controlled by a model parameter, and that parameter was removed from the `params` object in the changelog — but it is still present in the PRESET definition and still read by `runGBM` first.

**One-line fix:**
```js
const tEnd = settings.tEnd || p.tEnd || 20;
```

---

### 🔴 NEW-1 — State rename does not update propensity strings

**Location:** `function structuredChanged`, state rename branch

When the user renames a state (e.g., `X` → `N`), the code correctly updates the event `updates` object keys via `renameObjectKey`. It does **not** update the propensity strings:

```js
currentModel.states[i].name = next;
(currentModel.events || []).forEach(ev => renameObjectKey(ev.updates, old, next));
// Missing: ev.propensity = ev.propensity.replaceAll(old, next)
```

After renaming `X` to `N`:
- Event update key is correctly changed to `N`
- Propensity `'birth * X'` still contains `X`
- Validation fires immediately: *"Event birth propensity references unknown name X"*
- The model is now invalid and cannot run until the user manually edits the propensity

This regression was introduced when the per-state delta editor was added. The delta editor fixed the UX for entering updates; the rename propagation was not extended to propensity strings.

**Fix:**
```js
currentModel.states[i].name = next;
(currentModel.events || []).forEach(ev => {
  renameObjectKey(ev.updates, old, next);
  if (ev.propensity) {
    // Replace whole-word occurrences to avoid partial matches (e.g. S → S1 not touching S2)
    ev.propensity = ev.propensity.replace(new RegExp(`\\b${old}\\b`, 'g'), next);
  }
});
if (currentModel.derived) {
  Object.keys(currentModel.derived).forEach(k => {
    currentModel.derived[k] = currentModel.derived[k].replace(new RegExp(`\\b${old}\\b`, 'g'), next);
  });
}
```

---

## Part II — The structural gap: model-building symmetry

This is the primary issue raised in the brief and the most important thing to address architecturally.

### 🟠 ARCH-1 — Stochastic library uses a flat list where ODE Lab uses chips + dropdown

**Current state:**

The ODE Lab has two layers of example navigation:
1. **Chips** (`modelDeck`): 6 core examples per module, always visible, one click to load.
2. **Dropdown + additional panel**: all examples accessible; additional examples shown in a collapsible card with author attribution, narrative text, and titles.

The Stochastic Lab has:
1. A **flat scrollable list** of all 15 presets as buttons, filterable by family via a dropdown.

The ODE approach is superior for model-building orientation: it immediately surfaces the most instructive starting points, and the full list is always reachable. The stochastic flat list forces the user to scroll through SDE, gambler, Ehrenfest, bandit, and secretary models before finding the CTMC examples they are most likely to want as a starting template for building their own model.

**Proposed structure for stochastic library**, mirroring ODE Lab exactly:

```
[aside.stoch2-library]
  [.library-head]
    "Model library" / "Examples"
    <select id="familyFilter">   ← full-list access
  [.model-deck]
    Birth-death     SIR     Gene expression     Michaelis-Menten   ← 4 CTMC chips
  [.stoch2-additional / details]
    ← all other presets: branching, gambler, GBM, Parrondo, etc.
  [.custom-action]
    ＋ New custom CTMC model
```

**Implementation:**

Add a `CORE_STOCH` constant:
```js
const CORE_STOCH = ['birth-death', 'sir', 'gene-expression', 'michaelis-menten-ssa'];
```

Split `renderLibrary` into chips (4 CTMC models) and a `<details>` block (remaining 11). The family filter applies to the full list only. This is a direct structural copy of `fillExamples` in `app.js` — approximately 15 lines.

---

### 🟠 ARCH-2 — The stochastic lab has no live expression preview; ODE Lab does

When a user edits an ODE equation, `updateMathPreview()` re-renders the full system as LaTeX in real-time. The user sees `dX/dt = birth·X − death·X` the moment they type.

When a user edits a propensity in the stochastic lab, they see the plain text they typed. There is no preview. Validation fires on `change` (after focus leaves the field), not on `input`.

This is a meaningful UX asymmetry for the user's model-building workflow. A user constructing a stochastic SIR from scratch types `beta*S*I/N` and has no immediate visual confirmation that this is what they intended. They only find out if the name `N` is unknown (which will surface a validation warning after they leave the field), but not whether the expression itself makes mathematical sense.

**Minimum fix:** fire validation on `input` (not just `change`) for propensity fields. This gives live error feedback without requiring KaTeX.

**Full fix:** add a text-based "reaction notation" preview under the event list. For a birth-death model with state `X`, event `birth`, propensity `b*X`, updates `{X: +1}`, display:

```
birth:  X  →  X + 1   at rate  b·X
death:  X  →  X − 1   at rate  d·X
```

This requires no KaTeX and is directly computed from the model schema.

---

### 🟠 ARCH-3 — "New custom CTMC" silently discards unsaved work without confirmation

**Location:** `function loadCustomCTMC`

Both "＋ New custom CTMC model" (library panel) and "New blank CTMC" (model editor) call `loadCustomCTMC()` which immediately replaces `currentModel` with `blankCTMCModel()`. If the user has spent 20 minutes building a custom model that they have not exported, clicking either button loses all their work with no confirmation dialog and no undo.

The ODE Lab has the same issue (clicking another example chip loads without confirmation), but the consequence is less severe because ODE examples are template files, not user-created structures.

**Fix:** when `currentPreset.id === 'custom-ctmc'` and `currentModel` differs from `blankCTMCModel()`, prompt:

```js
if (currentPreset.id === 'custom-ctmc' && hasUnsavedCustomWork()) {
  if (!confirm('Replace your current custom model with a new blank? Download the JSON first if you want to keep it.')) return;
}
```

Or, less disruptively, auto-save to `localStorage` before overwriting and offer "Restore last custom model" on the next blank load.

---

### 🟡 ARCH-4 — No "start from a template" path for stochastic custom model

In the ODE Lab, the natural way to build a custom model is: load an example close to your target, then modify equations, parameters, and initial conditions. The ecosystem of examples functions as a template library.

In the Stochastic Lab, the structured editor is only reachable from the "New custom CTMC" path (which starts from the blank birth-death template). There is no path to say "load SIR as an editable custom model and modify the events." The structured editor appears only when `currentPreset.engine === 'ctmc'` AND `currentPreset.id === 'custom-ctmc'`. Loading the `sir` preset shows read-only parameter inputs; the structured editor shows a "specialized simulator" message.

**Fix:** When a CTMC preset is loaded, show a "Customize this model" button that calls `loadCustomCTMC(clone(currentModel), currentPreset.title)`. This gives the user a populated starting point for the editor, matching exactly how ODE Lab example → modify flow works.

---

## Part III — Remaining minor issues

### 🟡 MAINT-1 — `color-mix()` fallbacks still missing for 25 of 41 uses

The CSS now uses `var(--fallback-xxx)` intermediate custom properties for 16 `color-mix` calls. This is an improvement over zero. But 25 direct `color-mix(in srgb, var(...) ...)` calls remain with no fallback, and the intermediate custom properties still use `color-mix` themselves. Safari ≤16.1 and Firefox ≤112 will not see any transition colours, hover rings, or module-highlight backgrounds.

**Minimum fix for the remaining 25 cases:** use `@supports (color: color-mix(in srgb, white 50%, black))` to wrap the non-fallback uses, and provide `background: var(--panel2)` (which is always defined) as the fallback rule outside the `@supports` block.

---

### 🟡 MAINT-2 — GBM `tEnd` parameter still present in PRESETS after supposed removal

Per `AUDIT_V2_4_3_AUDIT_FIXES.md`, the fix involved removing `tEnd` from GBM model params. The PRESET still contains:
```js
model: { params: { X0: 1, mu: 0.04, sigma: 0.35, tEnd: 20 } }
```
And `runGBM` still reads `p.tEnd || settings.tEnd`. The PRESET and the engine need to be updated together.

---

### 🟡 UX-1 — Parameter editor not shown for non-CTMC engines

For GBM, Wright-Fisher, Parrondo, etc., the structured editor shows: *"This family uses a specialized simulator. Edit parameters above or the full JSON schema below."* But the structured editor section is inside a card labelled "Model editor" — the parameters ARE shown above in a separate card. This is correct, but the note is slightly confusing because it says "edit parameters above" while the user is already looking at a section labelled "Model editor." The user may wonder what the model editor is for if parameters are edited elsewhere.

---

### 🟡 UX-2 — `loadCustomCTMC` called twice on "New blank CTMC" click

Both `$('newCustomModel')` and `$('newBlankModel')` call `loadCustomCTMC(null, 'Custom CTMC model', true)`. This is fine; both buttons do the same thing. But it means clicking "New blank CTMC" inside the model editor tab re-fires with `updateHash = true`, which pushes to browser history. If the user clicks "New blank CTMC" five times (common while exploring), the browser back button goes through five identical states. Fix: pass `updateHash = false` for `newBlankModel`.

---

## Part IV — What is correctly fixed from v2.4.2

| Issue | Status |
|-------|--------|
| BUG-1 GBM tEnd override | ❌ Not fixed (PERSIST-1 above) |
| BUG-2 Unknown propensity names silently zero | ✅ Fixed — `validateExpressionSymbols` using Math.js symbol traversal |
| BUG-3 JSON editor overwritten without warning | ✅ Fixed — `jsonDirty` flag with protective check in `renderJsonEditor(force)` |
| BUG-4 Mean-field toggle visible for non-CTMC | ✅ Fixed — hidden via `classList.toggle('hidden', engine !== 'ctmc')` |
| UX-1 Raw JSON for event updates | ✅ Fixed — per-state delta inputs (number spinners per state per event) |
| UX-2 Resonance scan 1.5M iterations | ✅ Fixed — reduced to 20×40×300 = 240K |
| UX-3 Python export pseudocode only | ✅ Fixed — full runnable Gillespie SSA with `numpy` |
| SCIENCE-1 Braess narrative incorrect | ✅ Fixed — now says "illustrates route-choice feedback rather than the full Braess paradox" |
| SCIENCE-2 Parrondo no theoretical prediction | ✅ Fixed — `parrondoStationaryDrift()` computes stationary distribution and shows theoretical drift/step |
| SCIENCE-3 Resonance quality unlabelled | ✅ Fixed — metric renamed `'pedagogical precision score'` |
| MAINT-1 CSS version stale on index/examples | ✅ Fixed — both reference `v2.4.3` |
| MAINT-2 color-mix no fallbacks | 🟡 Partial — 16 of 41 now have var-based fallbacks |
| MAINT-3 visibleSeriesIndices hardcoded names | ✅ Fixed — now reads `state.model?.plotPriority` array |
| SEC-1 `new Function()` / `with()` in stochastic | ✅ Fixed — replaced with Math.js `parse().compile().evaluate()` |

---

## Summary table

| ID | Severity | Category | Issue |
|----|----------|----------|-------|
| PERSIST-1 | 🔴 | Bug | GBM tEnd still uses `p.tEnd` first, ignores Run settings |
| NEW-1 | 🔴 | Bug | State rename does not update propensity strings → immediate validation failure |
| ARCH-1 | 🟠 | Symmetry | Stochastic library is a flat list; ODE has chips + dropdown |
| ARCH-2 | 🟠 | Symmetry | No live expression preview in stochastic lab; ODE has real-time LaTeX |
| ARCH-3 | 🟠 | UX | "New custom CTMC" silently discards unsaved custom work |
| ARCH-4 | 🟡 | UX | No "Customize this CTMC example" path from any preset |
| MAINT-1 | 🟡 | Maintenance | 25 of 41 `color-mix()` calls still lack fallbacks |
| MAINT-2 | 🟡 | Maintenance | GBM `tEnd` param still in PRESET even though fix claimed to remove it |
| UX-1 | 🟡 | UX | "Edit parameters above" note in model editor is slightly confusing |
| UX-2 | 🟡 | UX | "New blank CTMC" pushes browser history on every click |
