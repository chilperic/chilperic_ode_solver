# v69 home and brand audit

## Problems found
- The creator card still allowed the name/button column to overlap the profile image at medium viewport widths.
- The home hero headline remained oversized relative to the rest of the platform.
- Magenta remained in gradients and identity variables even after the visual direction moved toward teal/cyan/blue.
- The logo still used magenta and did not match the calmer scientific modeling identity.

## Changes implemented
- Replaced the home headline with a shorter, smaller title: `Modeling workspace.`
- Rewrote the home lead to emphasize modeling actions: equations, parameters, dynamics and export.
- Rebuilt the creator card as a strict two-column layout with protected image and text columns.
- Increased the profile image size while preventing text and button overlap.
- Removed magenta from the home palette and primary gradients.
- Redesigned the SVG logo and mark with teal, cyan and blue only.
- Regenerated favicon PNGs and favicon.ico from the new mark.
- Bumped logo/style cache tokens.

## Remaining UX risk
The full platform still needs module-by-module testing on narrow laptop widths and phones, especially around dense scientific controls.
