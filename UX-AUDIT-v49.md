# UX Audit v49 — visual consistency and Symbolic Lab correction

## Critical findings

1. **Model Atlas filter overflow**
   The active `All` filter could sit partially outside its container. The cause was not the filter itself; it was the global `.card::before` gradient pseudo-element injected into every card. Inside a flex filter bar, that pseudo-element behaved like an extra item with negative margins.

2. **Misplaced teal/cyan/magenta bars**
   The global pseudo-element treatment turned brand colors into accidental layout dividers. It made Agent Lab, Model Atlas and public cards look broken rather than branded.

3. **Symbolic Lab priority inversion**
   The page still visually prioritized plots and explanatory panels over the actual symbolic computation result. For a symbolic tool, the primary artifact should be the rendered mathematical result in LaTeX.

4. **Symbolic Lab copy noise**
   Public-facing text included internal implementation boundaries and architectural commentary. That belongs in docs or audits, not in the main execution screen.

5. **ODE-to-Symbolic import bug**
   The Symbolic Lab import path populated fields from session storage and then called `populate()`, which reloaded the default example and could overwrite the imported model.

## Corrections made

- Removed global card gradient pseudo-bars from public cards and filter cards.
- Repaired Model Atlas filter layout so `All` is a real first button inside the frame.
- Removed topbar inset color line that looked like accidental page framing.
- Reworked Symbolic Lab so **Computation result** appears before the numeric plot in the DOM and in the visual layout.
- Added a prominent **Computed LaTeX** panel rendered with KaTeX.
- Added LaTeX rendering for numeric equilibrium candidates.
- Kept plot controls, but framed them as a numeric preview rather than the symbolic result.
- Fixed the ODE→Symbolic import overwrite path.
- Added v49 regression tests.

## Remaining non-blocking weaknesses

- The symbolic algebra engine is still math.js-light in browser; exact solving remains exported to SymPy.
- Symbolic plot controls are still dense on small screens.
- Model Workbench model selection still uses a long native select. A future version should replace it with a family selector plus searchable model selector.
