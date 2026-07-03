# Foko Lab v70.6 interface rationalization

Scope: patch the visible inconsistencies reported after v70.5 without changing the numerical engines.

Fixed:
- Home page ratio and oversized hero text.
- Removed slogan-like Documentation and Tutorial headings.
- Hardened Workbench dropdown rendering so menu links cannot disappear under inherited theme/legacy CSS.
- Reduced theme selector visual weight; it is a utility control, not a selected navigation tab.
- Repaired SciML diagnostic plot toolbar layout to prevent title/select overlap.
- Bumped public asset tokens to v70.6.0 to avoid browser cache confusion.

Still open:
- Header/navigation remains duplicated across static pages.
- The CSS is still layered rather than a clean token/base/component split.
- Skipped historical tests remain high.
