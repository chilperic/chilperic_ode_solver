# Foko Lab v76.0.5 implementation audit

## Scope

This release intentionally preserves the approved v76 product layout. It changes
only the identity system and the missing Home navigation contract.

## Navigation

- Desktop navigation exposes Home as a named, keyboard-focusable destination.
- The phone sheet exposes Home before project actions.
- The persistent phone dock contains Home, Model, Experiment, Run and Evidence.
- The current Home destination has a visible and semantic active state.
- Navigation taxonomy, hitbox, overflow and phone regressions cover the new
  seven-item desktop bar and five-item phone dock.

## Identity

The refined Convergent Field mark represents the platform workflow rather than a
generic laboratory badge. Three trajectories represent distinct data, equation
and population/agent inputs. They converge at the model node, then continue to a
separate evidence point. The simpler geometry remains recognizable at 16 px.

The compact header lockup removes the illegible micro-tagline. The display
lockup retains “Modeling • Simulation • Evidence” for contexts with enough
space. SVGs include titles and descriptions, and every raster icon is generated
from the same vector source.

## Preserved product contract

The release does not change the home layout, scientific workspaces, methods,
model catalogue, examples, numerical cores, plot lifecycle or creator access.
The local runner still selects a fresh free port on every invocation.

## Verification

- 324/324 active Python product and scientific contracts passed.
- 32/32 independent numerical reference checks passed.
- All seven offline Chromium gates passed, including navigation hitboxes,
  responsive Agent layout and visual lifecycle checks.
- The benchmark score remained 100/100.
- All 145 desktop and phone Playwright scenarios passed. The inventory was
  completed in two bounded runs after the single long-running process reached
  the execution host's time limit at scenario 114; no product test failed.
- Desktop (1440 px) and phone (390 px) visual reviews confirmed that the named
  Home destination, refined logo and five-item phone dock fit without clipping
  or overlap.
