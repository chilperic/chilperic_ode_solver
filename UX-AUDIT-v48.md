# UX Audit v48 — Consistency and public-interface cleanup

## Critical findings

1. Public pages were exposing internal architecture decisions. Phrases such as "Platform engineering moved out of Research Hub" and Workbench/Legacy rationale were not useful to users and made the platform feel self-commentary-heavy.
2. The action language was inconsistent. Some clickable controls were gradient-filled, others were white or pale outlines, while neutral chips looked similar to links. This weakened affordance.
3. Docs and Tutorial heroes had visible box/border imbalance and too much empty horizontal space on laptop widths.
4. Home page lower panels created extra scrolling without improving first-run task completion.
5. Workbench/Legacy had a conceptual risk: Workbench must remain the modern modeling entry point, while Legacy must remain a specialist shortcut. Duplicating the same destinations in both top-level menus would make the information architecture ambiguous.
6. Contact copy sounded like a generic bio sentence instead of a product/contact page.

## v48 decisions

- Public pages now use short functional copy.
- Workbench dropdown remains: Model, Symbolic, Agent, Model Atlas.
- Legacy remains: ODE, Optimization, Steady-State, Stochastic.
- CTAs and clickable public actions now share the same teal/cyan/magenta action language.
- Neutral chips stay neutral, separating clickable from non-clickable elements.
- Docs/Tutorial/Platform heroes now use compact rounded panels with consistent spacing.
- Homepage lower Model/Inspect/Export panels are hidden to reduce scroll.
- Research Hub no longer shows the old platform-engineering explanation block.
- Contact page now uses a short creator/contact statement.

## Remaining risk

The native Workbench model `<select>` can still feel long on desktop because browsers control native dropdown rendering. A future version should replace it with a searchable custom combobox or a two-level selector: family first, model second.

## Score

- Navigation clarity: 88/100
- Public copy discipline: 90/100
- Visual consistency: 86/100
- Workbench selector ergonomics: 74/100
- Overall UX state: 87/100
