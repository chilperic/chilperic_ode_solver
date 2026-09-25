# Measurement case: a calibrated fluorescence experiment

This is a **synthetic verification investigation**, not a laboratory dataset or a reproduction of the author's thesis. It adapts the observation-model reasoning in *Scientific Modelling, AI & Research Software Engineering*, V6.16, Chapter 1 (§1.5) and Chapter 11. The private book is not included in the public site.

## Scientific question

Can one shared degradation rate explain fluorescence under two **known** initial concentrations? Which conclusions depend on knowing instrument gain and background?

The model is `dx/dt = -k*x`, with observation `signal = gain*x + background`. Time is in hours; state is relative concentration; signal and its standard deviation are in AU. The generator uses `k=0.35 /h`, `gain=3 AU/(relative concentration)` and `background=0.2 AU`. Conditions `low` and `high` start at `x=1` and `x=2`. Each has two independently generated measurement-noise replicates at 13 times from 0 to 6 hours. Sigma is fixed at 0.06 AU for every measurement. NumPy's PCG64 generator is seeded with 2026. The nominal working guess for k is deliberately different, 0.2 /h.

Replicates here share deterministic dynamics and differ only in independent measurement noise. They do **not** simulate biological random effects. The analytical trajectory is `x(t)=x0*exp(-k*t)`.

## Execute in the browser

Open `workspace.html?case=fluorescence`. No calculation starts until you request it.

1. Select **Edit model**. Inspect **States & equations**, then **Measurements**. The instrument equation is separate from the state derivative. A change must pass **Review changes** before it can be applied.
2. In **Data & fit**, open **Import or review the observation record** and **Preview & map**. Check the time/value/condition/replicate/sigma/unit mappings. The `batch` column is retained as metadata and does not enter the numerical objective. Expand conditions to inspect the initial-state overrides. Confirm explicitly.
3. Fit k using the chronological split. All observations at a common time stay together. The default 70% split uses 36 training rows at times ≤4 h and 16 held-out rows at later times. Gain and background are fixed, not inferred.
4. Inspect measured points, known-SD bars, and predictions separately for each condition. Filled points identify training data; open points identify held-out data. Compare all four baselines using the common split. Expand residuals and retain their row-level values.
5. Choose complete-condition holdout and reserve `high`. Predictions then test a new **known initial condition**. This does not test a new organism or unknown calibration, nor does it establish biological validity.
6. Attach the locally executed fit to **Infer** in the Evidence tab, adding your interpretation and a failure that would change it. The complete input/result record—not just a URL—is retained. Export the experiment before leaving.

The pooled time-polynomial model deliberately omits condition inputs; the residual hybrid is an output correction. Their restricted input representations must be considered when interpreting comparative error. The example does not establish that mechanistic models generally outperform machine learning.

## Predict, compute, diagnose, transfer

**Prediction.** Before running, doubling x0 should double signal *above background*, not double the complete signal. At time zero the predicted signals are 3.2 and 6.2 AU, not 3.2 and 6.4 AU.

**Worked diagnostic.** A prediction error of 0.12 AU with sigma=0.06 AU contributes `(0.12/0.06)^2=4` to the sum of squared standardized residuals. Sigma is a standard deviation, not a variance or confidence interval. FokoLab minimizes the root mean squared standardized residual; with fixed independent Gaussian sigma and fixed row count, it has the same minimizer as weighted least squares.

**Deliberate failure.** Save a baseline scenario. Set the assumed background to zero, keeping it fixed during fitting. Predict the direction of late-time residual bias before recomputing. Compare the fitted rate, held-out residuals and both conditions. An apparently successful optimizer cannot establish that the instrument model was right.

**Confounding.** If both gain and initial concentration are unknown, the signal depends on their product. A numerical fit cannot identify their separate values without additional information. The current browser fit estimates shared parameters, not arbitrary condition-specific initial values; use an external formulation to analyze that extended inverse problem.

**Transfer.** For actual lipid, T-cell or photosynthesis measurements, define what the instrument measures, which experimental inputs are known, what counts as an independent replicate, and which groups must remain together during validation. Do not reuse these synthetic noise/calibration assumptions without justification.

## Independent reproduction

From the repository root:

```bash
node tests/research/structured.test.js
python3 research/measurement-case/reproduce.py \
  --compare validation-v78.2.0/measurement-fit.json \
  --output validation-v78.2.0/independent-measurement.json
```

The comparison uses an analytic exponential with SciPy scalar minimization, an independent SciPy trajectory, and NumPy least squares to check weighted QR coefficients. The browser's bounded coordinate search stops at a declared finite resolution; exact equality to SciPy's tighter optimum is not expected. Parameter agreement is tested with absolute tolerance 0.0002 /h. Observation predictions and coefficients have separate numerical tolerances.

Regenerate the synthetic reference explicitly with `python3 research/measurement-case/generate.py`. This writes both `reference.json` and the browser case module; it is not required to open the shipped example.

## Boundaries

This is not full PEtab support; there is no pre-equilibration, event protocol, censoring, correlated error, fitted noise scale or random-effects model. Units are checked by exact labels, not dimensionally converted. Three bounded coordinate-search starts do not prove a global optimum or identifiability. No confidence interval, posterior, clinical or empirical biological conclusion is generated.
