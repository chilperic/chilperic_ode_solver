# Foko Lab v43 UX audit

## Executive judgement

v42 is structurally much better than the earlier flat-navigation versions, but the experience was still uneven. The navigation contract is now sane, but the product still had three UX risks:

1. Agent Lab had weaker visual analytics than the equation-based labs.
2. The homepage still used too much vertical space for a tool that should open quickly.
3. The interface mixed product routing, explanation, and portfolio material too aggressively.

v43 addresses the first two directly and documents the third as the next design boundary.

## High-priority critique

### 1. Agent Lab was underpowered as a simulation surface

Agent Lab had many models and custom rules, but the plotting layer did not match the ambition. A user could run rich agent models but mostly saw population counts and a few diagnostics. That created a mismatch: complex simulation, shallow feedback.

**Fix in v43**

Added a palette selector and expanded diagnostic plots:

- model colors
- scientific
- aurora
- viridis
- magma
- mono

New plot modes:

- stacked population area
- state ranking
- cumulative events
- state diversity / entropy
- spatial state heatmap

These are not decorative. They expose different questions:

- What dominates now?
- How did composition change over time?
- Are events accumulating or stabilizing?
- Is the system becoming more or less diverse?
- Is spatial structure visible?

### 2. Homepage was too tall for a product entry point

The homepage was visually strong but too scroll-heavy. The hero, identity card, route cards and lower panels all competed for attention. This is poor UX for a modeling tool because the first task is usually to enter a workspace, not read a manifesto.

**Fix in v43**

- Reduced hero height.
- Reduced headline and card proportions.
- Shortened route-card text.
- Hid the lower `Model / Inspect / Export` panel on the homepage.
- Preserved the lab identity and personal profile block without letting it dominate the screen.

### 3. Interface hierarchy is now clearer, but still fragile

The current organization is the right direction:

```text
Home
Workbench
  Main
  Model Atlas
  Symbolic
  Agent
Legacy
  ODE
  Optimization
  Steady-State
  Stochastic
Learn
  Docs
  Tutorial
  Platform
About
  Research
  Mathematical Beauty
  Acknowledgement
  Contact
```

The weakness is not the labels anymore. The remaining risk is duplication of explanatory material across Home, Docs, Platform and Atlas. The design rule should now be strict:

- Dropdowns: labels only.
- Homepage: entry points only.
- Workbench pages: execution first.
- Docs/Atlas: explanation.
- About/Research: identity and portfolio.

## Professional score after v43

| Area | Score | Critique |
|---|---:|---|
| Navigation taxonomy | 88/100 | Good grouping. Freeze it unless testing proves otherwise. |
| Homepage UX | 84/100 | Much more compact. Still visually dense, but now usable. |
| Agent simulation experience | 86/100 | Stronger plots and palette control. Next missing piece is animation speed presets and frame export. |
| Visual consistency | 82/100 | Better proportions. Some legacy labs still feel older, which is acceptable if intentional. |
| Documentation boundary | 76/100 | Docs/Atlas/Home overlap remains the largest content risk. |
| Technical stability | 92/100 | 332 tests pass; navigation and validator regressions are covered. |

Overall: **86/100**.

## Remaining work, ranked

1. Add Agent animation presets: slow / normal / fast / batch.
2. Add Agent export PNG/SVG for the current diagnostic plot.
3. Add a Workbench dashboard page that shows Main, Atlas, Symbolic and Agent as four equal modern routes.
4. Clean Docs and Platform so they do not repeat homepage marketing language.
5. Make Legacy visually secondary but not abandoned.

## Non-negotiable design rule going forward

Do not add more top-level navigation items. Add capability inside the correct surface.
