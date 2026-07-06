# V71.36 stable rollback

The prior V71.36 chrome/token cleanup was too aggressive and broke the working page experience. This package intentionally restores the last stable V71.35 codebase as the safe baseline.

Rollback decision:
- Restore static page chrome and navigation from V71.35.
- Preserve the Data/Analysis cockpit layout, model/data input, upload area and LaTeX preview from V71.35.
- Do not include the new single-source page-chrome injection from the failed V71.36 attempt.
- Do not include the 4-group global nav rewrite.

Next consolidation work must be done in smaller steps:
1. preserve the visible V71.35 interface exactly;
2. add behavior tests first;
3. migrate one page chrome component at a time;
4. validate in browser before packaging.
