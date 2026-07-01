# Foko Lab v36 — identity, docs and noise cleanup

## Purpose
Restore the public visual identity while removing explanatory noise from the public-facing pages.

## Main changes
- Enlarged the homepage profile photo.
- Reduced the header logo footprint.
- Added a visible “More about me” link under the profile block.
- Removed meta-design copy from the homepage.
- Rewrote `platform.html` around actual software structure: Workbench, specialist labs, Model Atlas and Research Hub.
- Rewrote `docs.html` as a concise reference for labs, custom models, exports and limits.
- Rewrote `tutorial.html` as short user workflows instead of a long lesson wall.
- Kept teal/magenta/orange visual identity without exposing design rationale text to users.

## Audit result
- Static pytest suite passed.
- JavaScript syntax checks passed.
- Local link/image audit found 0 missing assets.
- ZIP excludes `.venv`, `.pytest_cache`, `__pycache__` and `.pyc`.
