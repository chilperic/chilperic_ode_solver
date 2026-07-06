# AUDIT v71.13 — Mathematical Beauty card state and roadmap honesty

## Problem
The homepage Mathematical Beauty card still looked selected because older CSS layers (`v70-7-unified.css` and `v70-11-modeling-platform.css`) forced a teal border and tinted background on `a[href='beauty.html']`. The v71.12 cleanup removed arrow/callout pseudo-elements but did not override the later-loaded accent-border rules.

## Fix
A final scoped rule was appended to `styles/v70-7-unified.css`, which is loaded last on the homepage. It resets Mathematical Beauty to the same resting card state as the other homepage routes. Hover/focus may still change the card, but the non-interactive resting state no longer looks selected.

## Scope
No science engine changed. No Focused Lab changed. No shell descriptor changed. This is a UI state correction only.

## Current implementation status
Implemented and protected by tests:
- one cache token per release;
- core boundary and shell foundation;
- descriptor-shell ports for Statistics, Linear Algebra, Curve Fitting, Networks, and ML Toolkit;
- legacy/Focused Labs preserved as real standalone pages;
- standalone layout repair for Stochastic, Optimization, and Steady-State;
- ODE + Parametric ODE recovery;
- ODE observed-data overlay and fitting-bridge export hook;
- creator identity repair;
- Focused Labs moved to their own dropdown;
- homepage noise cleanup;
- Mathematical Beauty homepage card no longer appears pre-selected.

Not finished yet:
- full descriptor-shell migration of Workbench and Focused Labs;
- real direct fitting execution inside ODE, beyond bridge-config export;
- parameter confidence intervals propagated into ODE plots;
- stochastic tau-leaping and Euler-Maruyama integration;
- uncertainty bands across all trajectory labs;
- 2-parameter continuation and Hopf/fold classification;
- Web Worker compute bus;
- session bundles and full URL state persistence across every lab;
- SBML-lite import and richer model registry;
- full Playwright end-to-end deploy gate.

## Validation expectation
The new regression test ensures that Mathematical Beauty is not given forced selected styling on the homepage while preserving normal hover/focus interaction.
