# Foko Lab — Home page rebuild (rev. 2)

**Target file:** `index.html`
**Baseline:** v72.19.0
**New CSS files required:** none — use `styles/v72-tokens.css` and the existing cockpit classes.
**Supersedes:** rev. 1

---

## What changed in rev. 2

Rev. 1 proposed a single CTA: *"Run the SIR example."* **That was wrong**, for three reasons:

1. **SIR is the hello-world of ODEs.** Every modeling tool demos it. A scientist who has seen it six times learns nothing from a seventh.
2. **It proves capability, not differentiation.** "We can integrate an ODE" is table stakes — mxlweb, SciPy and COPASI all do it. It burns your most valuable pixels on the one claim that isn't yours.
3. **It contradicts the headline.** The hero promises *"know how much to believe it,"* then demos a clean, non-stiff, unremarkable curve with nothing to doubt.

**Rev. 2 makes two changes:**

- **The hero result runs on load. Zero clicks.** You have no backend — the model can just *run*. Time-to-value becomes zero seconds, a thing no install-based competitor can match. Spending that advantage on a button that asks permission to prove yourself is a waste.
- **The hero model is a real published research model, not SIR.** This is the strongest available answer to the first question every scientist asks about a browser tool: *is this a toy?*

---

## The rule that governs the research emphasis

> ❌ **"Here is my research."** → credential. Portfolio. A reason to trust *the author*.
> ✅ **"Here is a real research model, running, right now, in your browser."** → proof. Product. A reason to trust *the tool*.

Same models. Opposite pitch.

**The model is the hero. The author is a citation line.** Research content earns a place on the home page on exactly one condition: **it must be running.** A model that computes live is proof. A section describing what you have published is a CV.

---

## 1. Delete first

Do the deletions before writing anything new.

- [ ] Delete the **"Modeling approaches"** section (all 9 items). It is a taxonomy, not navigation.
- [ ] Delete the **"Formulate · Compute · Diagnose · Export"** strip. Generic.
- [ ] Delete the **Creator/CV block** from the hero.
- [ ] Delete **four of the five hero CTAs.**
- [ ] Merge **"Start by workflow"** and **"Focused Labs"** — they duplicate each other.

---

## 2. Hero — a live computed result

**The result renders on page load. No button. No click.**

| Element | Copy |
|---|---|
| Eyebrow | `Browser-native · no install · no account · nothing uploaded` |
| Headline (h1) | `Model it in your browser. Know how much to believe it.` |
| Subhead | Foko Lab computes locally and labels every result as computed, bounded, or export-only. |

**Below the headline, side by side:**

- **Left — a live plot.** The **fatty-acid metabolism** reduced research model, integrated by `FokoODECore` (RKF45) on load. A real trajectory, not a screenshot, not an SVG.
- **Right — the real diagnostics panel.**
  ```
  method    rk45
  accepted  312
  rejected  3
  rtol      1e-6
  atol      1e-9
  status    Computed
  ```

**Citation line under the plot (required):**

> *Reduced public model from the creator's fatty-acid metabolism research. Not a calibrated repository reproduction — see Trust.*

- [ ] Wording must match `FADNS_RESEARCH_CONTRACT.md`. Do not overclaim. The contract is explicit that a successful trajectory does **not** prove bistability, and the home page must not imply it does.
- [ ] Must use the **real core**, not a cached array. If the hero plot is fabricated, the home page violates the contract it is advertising.

**Primary CTA (single, accent-filled):**

> **`Open ODE Lab`** — *or drop in your own equations*

The demo is no longer something the visitor opts into. It has already happened. The button stops meaning *"prove it works"* and starts meaning *"now do yours."*

**Secondary text link (not a button):**

> *See it catch a bad fit →*

Points to the Michaelis–Menten identifiability demo (R² = 0.99, flat profile, verdict: *not identifiable*). This is the depth charge for anyone who wants proof of the second half of the headline.

---

## 3. Claim-class strip

Directly under the hero, **above the fold.** Four small cards:

| Card | Label | Sub-label |
|---|---|---|
| 1 | Computed | Real, from your input |
| 2 | Limited | Bounded or heuristic |
| 3 | Export-only | Script, not a fake plot |
| 4 | Unavailable | Said, not faked |

- [ ] Definitions **verbatim from `CAPABILITIES.json` → `statusDefinitions`.**
- [ ] Each card links to `trust.html`.
- [ ] Colours: teal / amber / blue / neutral. **Not green-red** — this is not a pass/fail axis.

---

## 4. Research models row *(new — this is where research emphasis lives)*

Three cards. **Each card is a running model, one click from a computed result.**

| Card | Model | Status |
|---|---|---|
| 1 | **Fatty-acid metabolism** — four-state bistability candidate | ✅ Open reduced simulation |
| 2 | **FADNS** — semi-mechanistic de novo synthesis, C14/C16/C18 | ✅ Open reduced simulation |
| 3 | **T-cell proliferation** — division and death dynamics | ✅ Open reduced simulation |

- [ ] ⚠️ **Do NOT put photosynthesis / C3–C4 here.** `research/photosynthesis.html` is marked **"Protected unpublished project."** It must not become a public live demo. Describe it on `research.html`; do not ship it as a runnable card.
- [ ] Each card: model name → one-line mechanism → **"Run it"** → **"Read the paper"**.
- [ ] Each card carries its **provenance class** (per `FADNS_RESEARCH_CONTRACT.md`): these are *public reductions*, not calibrated repository reproductions.
- [ ] Section heading: **"Real research models, running live"** — not *"My research."*

> This row answers *"is this a toy?"* — and it is an answer mxlweb structurally cannot give. They have an engine; you have a research programme behind it.

---

## 5. Two task cards

The heading is the user's question, not your category.

**Card A — "I have a model"**
- ODE Lab — *trajectories, sweeps*
- Steady-State — *roots, stability*
- Stochastic — *Gillespie ensembles*
- Agent — *spatial, individual-based*

**Card B — "I have data"**
- Curve Fitting — *with identifiability*
- Statistics — *tests, missingness audit*
- Machine Learning — *fold-safe validation*
- SciML — *discover equations*

Rules:
- [ ] **Every link carries a promise, not a category.** Not "Curve Fitting" — "Curve Fitting — with identifiability."
- [ ] **Linear Algebra, Networks and Symbolic do not appear here.** Nav only.
- [ ] Four links per card, maximum.

---

## 6. Hello-worlds — in the labs, not on the home page

**The instinct is right; the placement is not.** Thirteen hello-worlds on the home page is thirteen equal choices — the exact disease the rebuild cures. It is also a **breadth pitch**, and breadth is the weak axis: mxlweb wins the depth argument, and "one person built thirteen labs" reads as a warning, not a boast.

So:

- [ ] **Every lab opens with a worked example already loaded AND already computed.** No lab ever lands on a blank configuration. Applies to all thirteen.
- [ ] **Every Atlas card is one click from a computed result.**
- [ ] **No hello-world grid on the home page.**

---

## 7. Footer

- [ ] Model Atlas · Workbench · Tutorials · Docs · Trust · Research
- [ ] **Mathematical Beauty** — one link, **once**, here only.
- [ ] **About the author** — muted, last → links to the personal academic site.
- [ ] Institution logos (HHU, CEPLAS, AIMS Ghana, PoLiMeR ITN).
- [ ] Version token + GitHub.

---

## 8. Constraints

- [ ] **Max 10 links above the fold.** (Currently 22+.)
- [ ] **One `h1`. One accent button.** No exceptions.
- [ ] **The hero plot is computed, never fabricated.** Non-negotiable — a fake hero plot on a platform that sells scientific honesty is the worst possible defect.
- [ ] Hero must not block on the solve. Render the panel, then the trace. Target: **result visible under 1 second.**
- [ ] No new `!important`. No new version-numbered stylesheet.

---

## Acceptance test

Show the old page and the new page to someone who has never seen Foko Lab. **Ten seconds each.** Ask:

> *"What does it do, and who is it for?"*

| | Expected answer |
|---|---|
| Old page | *"…a lot of things?"* |
| New page | *"Browser modeling that tells you when to trust it — with real research models in it."* |

**Run this on three real people — not on yourself.**

---

## The through-line

Your demo should be **the thing your competitor cannot do**, not the thing every competitor does.

- mxlweb can integrate an ODE. → So don't lead with that.
- mxlweb cannot tell you your parameters are non-identifiable. → Lead with that.
- mxlweb has no published research programme behind it. → Lead with that too.

**A live, published research model with an honest diagnostics panel next to it is both claims at once, in one image, before the visitor has clicked anything.**
