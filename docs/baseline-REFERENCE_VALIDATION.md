# Differential scientific validation — v78.2.0

A freshly executed cross-language suite compares representative FokoLab algorithms with independent scientific Python implementations. The recorded run passed **32 / 32 comparisons**. See `REFERENCE_VALIDATION.json` for exact inputs, outputs, tolerances and dependency versions.

Covered comparisons include ODE integration, parametric tests, linear solves, symmetric eigenvalues, singular values, shortest paths, minimum spanning trees, ridge coefficients, PCA explained variance, symbolic derivatives, stochastic first moments and bounded optimization. The suite is representative, not exhaustive model, browser or physiological validation.

```bash
python3 -m pip install -r requirements-validation.txt
python3 scripts/run-reference-validation.py --json REFERENCE_VALIDATION.json
```

The additional fluorescence measurement reference is separate: `research/measurement-case/reproduce.py`, with executed results in `validation-v78.2.0/independent-measurement.json`.
