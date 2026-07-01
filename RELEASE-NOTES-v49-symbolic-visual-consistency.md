# Release notes v49 — Symbolic result and visual consistency

## Changed

- Removed misplaced teal/cyan/magenta pseudo-bars from generic cards.
- Repaired Model Atlas filter overflow.
- Simplified Symbolic Lab hero copy.
- Made Symbolic Lab prioritize rendered LaTeX computation results.
- Added `symComputed` and `symNumericEquilibriaLatex` render targets.
- Moved symbolic computation panels before numeric plot preview.
- Fixed ODE→Symbolic session import so imported models are not overwritten by default examples.

## Tests

- Added `tests/test_v49_symbolic_and_visual_consistency.py`.
- Full test suite: 331 passed.
