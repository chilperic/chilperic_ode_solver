# Block 2 implementation brief — inverse calibration + surrogate

Carry this file, `test_v67_inverse_and_surrogate.py`, and the v66 tree
(`foko-lab-v66-tested-sindy-engine`) into a fresh chat. Implement two engines
against the test, then cut the SciML lab over to them and remove the fake
scaffolds. Follow the same discipline as `sindy.js`: standalone browser IIFE,
self-contained linear algebra, pre-conditions that throw named errors, run in
Node via the vm harness the test already provides.

## 1. `src/inverse.js` — `window.FokoInverse`

Parameter calibration for a KNOWN ODE structure by Levenberg–Marquardt over an
RK4 forward solve. Public surface the test calls:

- `simulateModel({rhs, theta, x0, t})` -> `X` (nSamples x nStates).
  RK4 forward integration of `x' = rhs(t, x, theta)` from `x0` over the times
  `t`. MUST detect a non-finite state mid-integration and THROW a named error
  ("non-finite" / "diverged"). This is what makes calibration robust.

- `jacobian({rhs, theta, x0, t, mode, dfdx?, dfdth?, fdStep?})`
  -> `J` shaped `[nSamples][nStates][nParams]` = d x_state / d theta_param.
  Two modes, both tested against the CLOSED FORM  dx/dk = -t x(t)  for x'=-kx:
    * `mode:'fd'`          finite-difference columns:
        J[:,:,j] = (simulate(theta + h e_j) - simulate(theta)) / h,  h=fdStep.
    * `mode:'sensitivity'` integrate the augmented system alongside the state:
        S_j' = dfdx . S_j + dfdth[:,j],  S_j(0)=0
      REQUIRES dfdx (nStates x nStates) and dfdth (nStates x nParams). If
      'sensitivity' is requested without them, THROW (test pins this — no silent
      fallback to fd).

- `calibrate({rhs, x0, t, data, theta0, mode, maxIter, dfdx?, dfdth?})`
  -> `{ theta, converged, finalCost, iterations, history? }`.
  LM: at each step solve  (J^T J + mu I) dtheta = -J^T r  where
  r = simulate(theta) - data (flattened), adapt mu on accept/reject, stop on
  small step / small gradient / maxIter. `finalCost` = 0.5 * sum r^2 (or mean —
  the test only requires it < 1e-4 on solvable problems, so keep it small and
  document which). `converged` true iff a convergence criterion fired before
  maxIter.

Pre-conditions (throw, message names the field): empty t/data; data length !=
t length; theta0 empty; 'sensitivity' without dfdx/dfdth.

## 2. `src/surrogate.js` — `window.FokoSurrogate`

Polynomial-chaos emulator (start here; GP only if it earns its complexity).

- `fit({inputs, outputs, degree})` -> `model` with at least `{coeffs, degree,
  nInputs, cvError}`. Build a multivariate polynomial design matrix up to total
  `degree` over the inputs, ridge-solve for coeffs. `cvError` = k-fold (or LOO)
  CV RMSE — a finite non-negative number the UI shows so users know how far to
  trust the emulator.
- `predict(model, x)` -> scalar prediction at a single input point.

The contract is HELD-OUT accuracy: the test fits on a train split and requires
R^2 >= 0.98 on the test split for a smooth degree-2 target. Do not test or tune
to training fit.

Pre-conditions: empty inputs/outputs; inputs.length != outputs.length.

## 3. Cutover + remove the noise

- `sciml.html`: load `src/inverse.js` and `src/surrogate.js` (bump their cache
  tokens; realign any version-pinning test as a deliberate bump, as in v66).
- `sciml-lab.js`: the `inverse` approach calls `FokoInverse.calibrate` and shows
  recovered parameters + residuals + fit overlay; the `surrogate` approach calls
  `FokoSurrogate.fit`/`predict` and shows predicted-vs-reference + held-out error.
- The heavy approaches (`pinn`, `operator`, `assimilation`, `network`): either
  delete them, or mark them `exportOnly` so the UI never claims a browser result
  it did not compute. The test enforces this.

## 4. Verify

- `python -m pytest tests/test_v67_inverse_and_surrogate.py -v`  -> all pass.
- `python -m pytest tests/ -q`  -> full suite green (reconcile any deliberate
  version-pin bumps).
- `node --check` on every `src/*.js`.

## Scientific limits to keep honest in the UI

Browser LM finds LOCAL minima and the forward RK4 can diverge on bad guesses —
that is why `simulateModel` throws instead of returning NaN, and why calibration
ships with a SciPy `least_squares` export for the rigorous version. Keep the
"browser = fast first answer, export = rigorous answer" split sharp, exactly as
SINDy does.
