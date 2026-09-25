# Foko Lab accessibility contract — v72.29.0

The authored scientific pages target WCAG 2.2 AA interaction and contrast requirements within the limits of browser-rendered scientific graphics.

## Required structure

- One page-level `h1`.
- A labelled primary navigation landmark.
- A keyboard-visible skip link targeting the main scientific workspace.
- A stable `main` landmark that can receive focus.
- Unique element IDs.
- Explicit labels for form controls.
- Accessible names for icon-only buttons and external links.

## Keyboard behavior

- All native controls remain keyboard operable.
- Plot-layout, mode and section button groups support arrow-key navigation.
- Navigation menus support Enter, Space, Arrow Down and Escape.
- Focus indicators do not rely on colour alone.

## Scientific graphics

Interactive plots are exposed as focusable labelled figures. Plot rendering changes `aria-busy` and records rendered or failed state. This is not a complete textual substitute for every data point. Numerical tables, diagnostics and exports remain the authoritative accessible evidence route.

## User preferences

The interface respects reduced-motion, increased-contrast and forced-colour settings. Touch targets increase on coarse-pointer devices. Two-plot layouts collapse when the central scientific canvas becomes too narrow.

## Known limits

Plotly SVG internals are not guaranteed to provide a complete screen-reader representation of dense scientific figures. Every production result therefore requires accompanying numerical summaries, provenance and downloadable data.
