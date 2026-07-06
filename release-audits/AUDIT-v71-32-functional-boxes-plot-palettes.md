# V71.32 — Functional cockpit boxes and plot palettes

## Reason
The V71.31 analysis cockpit still had display-only pills/cards that looked like controls, and plot palette controls were missing from the Data/Analysis plot panels.

## Changes
- Converted the left cockpit tabs into real buttons that focus the corresponding setup, example, or user-input section.
- Replaced the decorative status cards with a compact live status line.
- Moved plot choices into each plot card header.
- Added per-panel palette selectors: Scientific, Viridis, Cividis, Plasma, Turbo, Mono.
- Added palette application after each Plotly render.
- Preserved the third diagnostic panel, user upload, formula preview, and tested-core wiring.
- Removed duplicate Plotly target IDs by giving each lab plot a slot-specific ID.

## Validation target
Every visible analysis cockpit box should either trigger behavior, report live state compactly, or be removed.
