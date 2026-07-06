# V71.44 — Curve Fitting scientific honesty

Scope: Curve Fitting Lab only. No global chrome, navigation, or cockpit layout rewrite.

Changes:
- Replaced proxy fitting diagnostics with core-backed numerical diagnostics.
- Added Levenberg–Marquardt-style nonlinear least squares for exponential, logistic and Michaelis–Menten models.
- Added parameter covariance from the numerical Jacobian and residual variance.
- Added parameter standard errors, t-like ratios and approximate 95% confidence intervals.
- Added mean confidence bands and prediction bands from the fitted covariance.
- Added 2D parameter confidence ellipse for the first two parameters when covariance is estimable.
- Added parameter profile-likelihood scans with re-optimization of non-fixed parameters.
- Added deterministic bootstrap resampling for parameter histograms.
- Added sensitivity coefficients based on numerical derivatives.
- Added influence diagnostics using the Jacobian leverage and standardized residuals.

Limits:
- Browser-side exploratory fitting only; stiff ODE-constrained calibration, adjoints, bounded multi-dataset global fits and Bayesian posterior inference remain Python/R backend tasks.
- Confidence intervals are asymptotic local approximations and can be unreliable for weakly identifiable nonlinear models or small samples.
