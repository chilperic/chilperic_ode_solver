# Foko Lab v70.1 Professional UI Audit

## Audit conclusion

v70 moved the app in the right direction but introduced three regressions:

1. The Workbench dropdown was visually too close to the dark header layer. The menu needed a stronger, non-transparent surface and stricter text contrast.
2. Legacy/classic lab routes were removed from the public navigation, which broke backward compatibility and hid useful older functionality.
3. Research was treated as an About destination rather than a first-class research hub. For a scientific modeling platform, research provenance must be visible in the header.

## Corrections implemented

### Header architecture

The public header is now:

- Home
- Workbench
- SciML
- Model Atlas
- Research Hub
- Documentation
- Tutorial
- GitHub
- clickable profile avatar

The text `About` was removed from the crowded primary nav because the avatar already serves as the personal/about entry point.

### Workbench dropdown

The Workbench dropdown now has two sections:

- Workbench IDE: ODE, stochastic, optimization, steady-state, symbolic and agent-based modeling.
- Classic / legacy labs: original ODE, stochastic, optimization and steady-state pages.

This preserves the IDE direction without destroying access to the previous lab interfaces.

### Contrast hardening

The dropdown panel now uses:

- solid dark scientific background
- no transparency
- no text shadow
- explicit high-contrast text
- visible hover/focus state
- max-height with internal scrolling for smaller screens

This prevents the menu from being hidden by the header color layer.

### Research Hub

Research Hub is now a top-level header item on every public page and research subpage.

## Remaining professional-risk items

These are not fixed in v70.1 and should be treated as v71 work:

1. The Workbench is still visually simulated on the home page rather than being the real unified IDE workspace.
2. The classic labs still use older UI patterns and need a shared control grammar for parameters, initial conditions, ranges and plot modes.
3. The symbolic workflow should continue moving toward rendered mathematical output first, raw expression second.
4. The SciML module needs clearer separation between inverse modeling, surrogate validation and SINDy discovery.
5. Documentation should continue shifting from interface description to modeling workflows.

## Release decision

v70.1 is a correction release, not a full v71 redesign. It fixes the immediate navigation and visibility regressions while preserving the v70 IDE direction.
