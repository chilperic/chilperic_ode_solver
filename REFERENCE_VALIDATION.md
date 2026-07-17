# Differential scientific validation — v72.36.0

A representative cross-language suite compares Foko Lab outputs with independent scientific Python libraries.

## Result

- **32 / 32 checks passed**
- NumPy 2.3.5
- SciPy 1.17.0
- scikit-learn 1.8.0
- NetworkX 3.6.1
- SymPy 1.14.0
- Node v22.16.0

Covered comparisons include ODE integration, parametric tests, linear solves, symmetric eigenvalues, singular values, shortest paths, minimum spanning trees, ridge coefficients, PCA explained variance, symbolic derivatives, stochastic first moments and bounded optimization.

The suite is representative, not exhaustive certification. It does not validate every model preset, browser renderer, hardware configuration or scientific interpretation.

Run it with:

```bash
python -m pip install -r requirements-validation.txt
python scripts/run-reference-validation.py --json REFERENCE_VALIDATION.local.json
```

The committed `REFERENCE_VALIDATION.json` records the exact checks used for this release.
