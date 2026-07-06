# V71.35 — Analysis layout unclipping and Statistics starter

Scope:
- Repair Data/Analysis dashboard clipping on desktop widths where three plot headers overflowed and the third plot was cut.
- Prefer two large plot columns plus a full-width third analysis slot until the viewport is wide enough for three plots.
- Make plot-card headers wrap safely instead of forcing long dropdown labels into clipped columns.
- Add a fallback panel message and auto-run retry so analysis pages do not appear static/blank while Plotly or initial computation is still loading.
- Preserve V71.34 model/data input, LaTeX preview, upload support, and tested-core wiring.

Limit:
- This release is still mainly delivery and runtime stability. The full Statistics scientific honesty pass remains a separate deeper release.
