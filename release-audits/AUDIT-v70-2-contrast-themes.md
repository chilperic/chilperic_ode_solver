# Foko Lab v70.2 — contrast and theme audit

## Problem diagnosed

The v70.1 Workbench dropdown restored the legacy links, but the section labels `Workbench IDE` and `Classic / legacy labs` remained low-contrast on the dark translucent menu. They were easy to lose against the saturated header color and menu shadow.

## Corrections

- Replaced the Workbench dropdown panel with a high-contrast white navigation surface.
- Converted the two section labels into visible chips with explicit backgrounds, borders and dark text.
- Kept modern Workbench links and classic/legacy links visually separated.
- Added a visible theme selector into the IDE header instead of relying only on the small cycle button.
- Expanded the theme system from eight palettes to fourteen palettes.
- Added homepage/dashboard theme variables so color changes affect the v70 IDE surface, not only older lab pages.

## Themes now available

Aurora, Clarity, Ocean, Emerald, Steel, Royal, Olive, Copper, Paper, Graphite, Slate, Midnight, Forest, High contrast.

## Design decision

For the Workbench menu, readability outranks visual drama. A dark dropdown looked closer to the mockup, but it failed under real text density. The corrected menu behaves more like professional scientific software: high contrast, compact grouping, and no decorative opacity.
