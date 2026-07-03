"""
test_v67_inverse_and_surrogate.py
=================================

Protocol step 1: the test precedes the engines. This pins Block 2 of the SciML
work — two genuinely-computed browser ML methods that replace the fake scaffolds:

  A. FokoInverse   — inverse-problem parameter calibration. Given data and a
                     KNOWN ODE structure with unknown parameters theta, recover
                     theta by Levenberg–Marquardt over an RK4 forward solve.
                     Two Jacobian modes, both tested against closed-form truth:
                       - 'fd'          finite-difference columns
                       - 'sensitivity' forward-sensitivity ODEs integrated
                                       alongside the state
  B. FokoSurrogate — a fast emulator fit to sampled (input -> output) data with a
                     real train/test split; the contract is HELD-OUT accuracy,
                     not training-set fit (an emulator that only fits its training
                     points is worthless).

Why both Jacobian modes, and why test against analytic truth
------------------------------------------------------------
LM is only as trustworthy as its gradient. A wrong Jacobian does not crash — it
produces a plausible-looking but wrong descent direction, so LM converges to the
wrong parameters or stalls, silently. Testing the sensitivity Jacobian against
the finite-difference Jacobian would be circular (both could share a bug). So the
anchor is a system with a CLOSED-FORM Jacobian:

    x' = -k x,  x(0)=x0   =>   x(t) = x0 e^{-kt}
    d x / d k = -t x0 e^{-kt} = -t x(t)                (analytic sensitivity)
    sensitivity ODE:  S' = -k S - x,  S(0)=0           (must integrate to -t x(t))

If the sensitivity path reproduces -t x(t), the df/dx and df/dtheta assembly is
correct. Both modes are checked against this truth AND against each other.

How the engines are exercised
-----------------------------
Browser IIFEs attaching window.FokoInverse and window.FokoSurrogate, run in Node
via vm (window===ctx) so the shipping code is tested, not a re-implementation.
Data is generated in the harness by RK4 integrating a known RHS.

Run:
    python -m pytest tests/test_v67_inverse_and_surrogate.py -v
"""

from __future__ import annotations

import json
import subprocess
import textwrap
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
INVERSE_SRC = "src/inverse.js"
SURROGATE_SRC = "src/surrogate.js"

PARAM_TOL = 1e-2       # calibration parameter-recovery tolerance
JAC_TOL = 1e-4         # sensitivity-vs-analytic Jacobian tolerance
SURROGATE_TEST_R2 = 0.98   # held-out R^2 floor for a well-sampled smooth target


# ─────────────────────────────────────────────────────────────────────────────
# Node harness (shared by both engines)
# ─────────────────────────────────────────────────────────────────────────────

def _run(engine_src: str, body_js: str) -> dict:
    """
    Load `engine_src` in a vm context (window===ctx) and run `body_js`, which must
    process.stdout.write(JSON.stringify(<result>)). A harness-only RK4 integrator
    is injected for data generation.

    Pre-conditions:
      * the engine source file exists (else the engine was not built);
      * Node runs cleanly and emits valid JSON.
    """
    src = ROOT / engine_src
    assert src.exists(), (
        f"[engine-missing] {engine_src} not found. Build it as a browser IIFE "
        "attaching the documented window global."
    )
    harness = textwrap.dedent(f"""
        const vm = require('vm'), fs = require('fs');
        const ctx = {{}}; ctx.window = ctx; ctx.console = console;
        vm.createContext(ctx);
        vm.runInContext(fs.readFileSync({json.dumps(str(src))}, 'utf8'), ctx);

        // harness-only RK4 integrator for generating reference data
        function rk4Step(f,t,y,dt){{
          const add=(a,b,s)=>a.map((v,i)=>v+s*b[i]);
          const k1=f(t,y),k2=f(t+dt/2,add(y,k1,dt/2)),
                k3=f(t+dt/2,add(y,k2,dt/2)),k4=f(t+dt,add(y,k3,dt));
          return y.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
        }}
        function simulate(f,y0,dt,nSteps){{
          const t=[],X=[]; let y=y0.slice();
          for(let i=0;i<=nSteps;i++){{ t.push(i*dt); X.push(y.slice()); y=rk4Step(f,i*dt,y,dt); }}
          return {{t,X}};
        }}
        ctx.__h = {{ simulate }};
        {body_js}
    """)
    proc = subprocess.run(["node", "-e", harness], capture_output=True, text=True, cwd=str(ROOT))
    assert proc.returncode == 0, (
        f"Node harness failed (code {proc.returncode}).\nstderr:\n{proc.stderr}\nstdout:\n{proc.stdout}"
    )
    return json.loads(proc.stdout)


def _max_abs_err(a, b):
    assert len(a) == len(b), f"[test-env] length mismatch {len(a)} vs {len(b)}"
    return max(abs(x - y) for x, y in zip(a, b))


# ═════════════════════════════════════════════════════════════════════════════
# A. FokoInverse — forward model correctness first
# ═════════════════════════════════════════════════════════════════════════════

def test_forward_solve_matches_analytic_decay() -> None:
    """
    LM is only as good as the integrator it wraps, so prove the forward model
    first: x' = -k x with x0=2, k=0.7 must reproduce x(t)=2 e^{-0.7 t} at the
    sample times to tight tolerance. `simulateModel` is the engine's own forward
    solve (NOT the harness one) — we test the shipping integrator.
    """
    out = _run(INVERSE_SRC, """
        const rhs = (t,x,th)=>[-th[0]*x[0]];
        const t = []; for(let i=0;i<=100;i++) t.push(i*0.05);
        const sol = FokoInverse.simulateModel({rhs, theta:[0.7], x0:[2.0], t});
        // analytic 2 e^{-0.7 t}
        const exact = t.map(tt=>2*Math.exp(-0.7*tt));
        const got = sol.map(r=>r[0]);
        process.stdout.write(JSON.stringify({got, exact}));
    """)
    assert _max_abs_err(out["got"], out["exact"]) < 1e-4, "forward solve diverges from analytic decay"


# ═════════════════════════════════════════════════════════════════════════════
# A. Jacobian correctness — both modes against the closed-form sensitivity
# ═════════════════════════════════════════════════════════════════════════════

def test_sensitivity_jacobian_matches_analytic() -> None:
    """
    For x' = -k x, dx/dk = -t x(t) in closed form. The 'sensitivity' Jacobian must
    reproduce this at every sample. This is the load-bearing test: a wrong df/dx or
    df/dtheta assembly produces a wrong-but-plausible gradient that silently breaks
    calibration.
    """
    out = _run(INVERSE_SRC, """
        const rhs = (t,x,th)=>[-th[0]*x[0]];
        // df/dx and df/dtheta supplied so the engine can build sensitivity ODEs.
        const dfdx = (t,x,th)=>[[-th[0]]];         // 1x1
        const dfdth = (t,x,th)=>[[-x[0]]];         // n x p  (d/dk of -k x = -x)
        const t = []; for(let i=0;i<=100;i++) t.push(i*0.05);
        const J = FokoInverse.jacobian({rhs, dfdx, dfdth, theta:[0.7], x0:[2.0], t, mode:'sensitivity'});
        // J is [nSamples][nStates][nParams]; here 1 state, 1 param -> J[i][0][0]
        const got = J.map(row=>row[0][0]);
        const exact = t.map(tt=>-tt*2*Math.exp(-0.7*tt));
        process.stdout.write(JSON.stringify({got, exact}));
    """)
    assert _max_abs_err(out["got"], out["exact"]) < JAC_TOL, (
        "sensitivity Jacobian does not match analytic dx/dk = -t x(t)"
    )


def test_fd_jacobian_matches_analytic() -> None:
    """
    The 'fd' Jacobian must also match -t x(t), to looser tolerance (O(h)). Confirms
    the finite-difference column assembly is correct independently of sensitivity.
    """
    out = _run(INVERSE_SRC, """
        const rhs = (t,x,th)=>[-th[0]*x[0]];
        const t = []; for(let i=0;i<=100;i++) t.push(i*0.05);
        const J = FokoInverse.jacobian({rhs, theta:[0.7], x0:[2.0], t, mode:'fd', fdStep:1e-6});
        const got = J.map(row=>row[0][0]);
        const exact = t.map(tt=>-tt*2*Math.exp(-0.7*tt));
        process.stdout.write(JSON.stringify({got, exact}));
    """)
    assert _max_abs_err(out["got"], out["exact"]) < 1e-3, "finite-difference Jacobian wrong"


def test_two_jacobian_modes_agree() -> None:
    """
    fd and sensitivity Jacobians must agree with each other on the same problem
    (to fd tolerance). A disagreement means one of them is wrong.
    """
    out = _run(INVERSE_SRC, """
        const rhs = (t,x,th)=>[-th[0]*x[0]];
        const dfdx = (t,x,th)=>[[-th[0]]];
        const dfdth = (t,x,th)=>[[-x[0]]];
        const t = []; for(let i=0;i<=80;i++) t.push(i*0.05);
        const cfg = {rhs, theta:[0.9], x0:[1.5], t};
        const Js = FokoInverse.jacobian(Object.assign({}, cfg, {dfdx, dfdth, mode:'sensitivity'}));
        const Jf = FokoInverse.jacobian(Object.assign({}, cfg, {mode:'fd', fdStep:1e-6}));
        const gs = Js.map(r=>r[0][0]), gf = Jf.map(r=>r[0][0]);
        process.stdout.write(JSON.stringify({gs, gf}));
    """)
    assert _max_abs_err(out["gs"], out["gf"]) < 1e-3, "sensitivity and fd Jacobians disagree"


# ═════════════════════════════════════════════════════════════════════════════
# A. Parameter recovery (the actual calibration), both modes
# ═════════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("mode", ["fd", "sensitivity"])
def test_calibrate_sir_recovers_parameters(mode: str) -> None:
    """
    SIR: S'=-b S I, I'=b S I - g I, R'=g I with b=0.35, g=0.1. Simulate the truth,
    then calibrate from a WRONG start (b0=0.2, g0=0.25) and require recovery of
    (b,g) to PARAM_TOL and a small final residual. Runs for both Jacobian modes so
    both calibration paths are proven end-to-end.
    """
    dfdx = ""
    dfdth = ""
    if mode == "sensitivity":
        # analytic df/dx and df/dtheta for SIR (states S,I,R; params b,g)
        dfdx = """dfdx:(t,x,th)=>[
            [-th[0]*x[1], -th[0]*x[0], 0],
            [ th[0]*x[1],  th[0]*x[0]-th[1], 0],
            [ 0,           th[1],           0]
        ],"""
        dfdth = """dfdth:(t,x,th)=>[
            [-x[0]*x[1], 0],
            [ x[0]*x[1], -x[1]],
            [ 0,          x[1]]
        ],"""
    out = _run(INVERSE_SRC, f"""
        const b=0.35, g=0.1;
        const f=(t,y)=>[-b*y[0]*y[1], b*y[0]*y[1]-g*y[1], g*y[1]];
        const {{t, X}} = ctx.__h.simulate(f, [0.99,0.01,0], 0.25, 120);
        const rhs=(t,x,th)=>[-th[0]*x[0]*x[1], th[0]*x[0]*x[1]-th[1]*x[1], th[1]*x[1]];
        const res = FokoInverse.calibrate({{
            rhs, {dfdx} {dfdth}
            x0:[0.99,0.01,0], t, data:X,
            theta0:[0.2,0.25], mode:'{mode}', maxIter:100
        }});
        process.stdout.write(JSON.stringify(res));
    """)
    assert abs(out["theta"][0] - 0.35) < PARAM_TOL, f"b not recovered: {out['theta'][0]}"
    assert abs(out["theta"][1] - 0.10) < PARAM_TOL, f"g not recovered: {out['theta'][1]}"
    assert out["converged"] is True, "calibration reported non-convergence on a solvable problem"
    assert out["finalCost"] < 1e-4, f"final residual too large: {out['finalCost']}"


def test_calibrate_michaelis_menten() -> None:
    """
    Michaelis–Menten depletion S' = -Vmax S/(Km+S), P' = +Vmax S/(Km+S), with
    Vmax=1.2, Km=0.7. Recover (Vmax,Km) from a wrong start via the fd path (no
    analytic Jacobian needed). The enzyme-kinetics case from the atlas.
    """
    out = _run(INVERSE_SRC, """
        const Vmax=1.2, Km=0.7;
        const f=(t,y)=>{const v=Vmax*y[0]/(Km+y[0]); return [-v, v];};
        const {t, X} = ctx.__h.simulate(f, [8,0], 0.05, 160);
        const rhs=(t,x,th)=>{const v=th[0]*x[0]/(th[1]+x[0]); return [-v, v];};
        const res = FokoInverse.calibrate({
            rhs, x0:[8,0], t, data:X, theta0:[0.5,2.0], mode:'fd', maxIter:100
        });
        process.stdout.write(JSON.stringify(res));
    """)
    assert abs(out["theta"][0] - 1.2) < 2e-2, f"Vmax not recovered: {out['theta'][0]}"
    assert abs(out["theta"][1] - 0.7) < 2e-2, f"Km not recovered: {out['theta'][1]}"


# ═════════════════════════════════════════════════════════════════════════════
# A. Robustness / graceful failure
# ═════════════════════════════════════════════════════════════════════════════

def test_diverging_forward_solve_throws_named_error() -> None:
    """
    A parameter set that makes the forward solve blow up must throw a NAMED error,
    not return NaN or hang. x' = +k x with large k over a long horizon overflows;
    simulateModel must detect the non-finite state and throw.
    """
    out = _run(INVERSE_SRC, """
        let msg='NO_THROW';
        try {
            const rhs=(t,x,th)=>[th[0]*x[0]];   // growth
            const t=[]; for(let i=0;i<=5000;i++) t.push(i*0.1);
            FokoInverse.simulateModel({rhs, theta:[50], x0:[1], t});
        } catch(e){ msg=String(e.message||e); }
        process.stdout.write(JSON.stringify({msg}));
    """)
    assert out["msg"] != "NO_THROW", "diverging forward solve must throw, not return NaN"
    assert ("finite" in out["msg"].lower() or "diverg" in out["msg"].lower()
            or "overflow" in out["msg"].lower()), out["msg"]


def test_calibrate_deterministic() -> None:
    """Identical calibration input -> identical theta. LM here is deterministic."""
    out = _run(INVERSE_SRC, """
        const b=0.35,g=0.1;
        const f=(t,y)=>[-b*y[0]*y[1], b*y[0]*y[1]-g*y[1], g*y[1]];
        const {t,X}=ctx.__h.simulate(f,[0.99,0.01,0],0.25,100);
        const rhs=(t,x,th)=>[-th[0]*x[0]*x[1], th[0]*x[0]*x[1]-th[1]*x[1], th[1]*x[1]];
        const cfg={rhs,x0:[0.99,0.01,0],t,data:X,theta0:[0.2,0.25],mode:'fd',maxIter:60};
        const r1=FokoInverse.calibrate(cfg), r2=FokoInverse.calibrate(cfg);
        process.stdout.write(JSON.stringify({t1:r1.theta,t2:r2.theta}));
    """)
    assert out["t1"] == out["t2"], "calibration is not deterministic"


@pytest.mark.parametrize("bad_js, needle", [
    ("FokoInverse.calibrate({rhs:(t,x,th)=>[0], x0:[1], t:[], data:[], theta0:[1], mode:'fd'})", "empty"),
    ("FokoInverse.calibrate({rhs:(t,x,th)=>[0], x0:[1], t:[0,1], data:[[1]], theta0:[1], mode:'fd'})", "length"),
    ("FokoInverse.calibrate({rhs:(t,x,th)=>[0], x0:[1], t:[0,1], data:[[1],[2]], theta0:[], mode:'fd'})", "theta"),
    ("FokoInverse.calibrate({rhs:(t,x,th)=>[0], x0:[1], t:[0,1], data:[[1],[2]], theta0:[1], mode:'sensitivity'})", "sensitivity"),
])
def test_inverse_preconditions(bad_js: str, needle: str) -> None:
    """
    Malformed calibration input throws a message naming the problem. Note the last
    case: 'sensitivity' mode without dfdx/dfdth must fail loudly, not silently fall
    back to fd (a silent fallback would hide a missing-derivative bug).
    """
    out = _run(INVERSE_SRC, f"""
        let msg='NO_THROW';
        try {{ {bad_js}; }} catch(e){{ msg=String(e.message||e); }}
        process.stdout.write(JSON.stringify({{msg}}));
    """)
    assert out["msg"] != "NO_THROW", f"expected throw for: {bad_js}"
    assert needle.lower() in out["msg"].lower(), f"{out['msg']!r} should mention {needle!r}"


# ═════════════════════════════════════════════════════════════════════════════
# B. FokoSurrogate — held-out accuracy is the contract
# ═════════════════════════════════════════════════════════════════════════════

def test_surrogate_fits_held_out_smooth_function() -> None:
    """
    Fit a polynomial-chaos surrogate to a smooth 2-input function on a TRAIN split
    and require R^2 >= SURROGATE_TEST_R2 on the HELD-OUT test split. Training-set
    fit is not tested — only generalisation, because an emulator that memorises its
    training points is useless.
    """
    out = _run(SURROGATE_SRC, f"""
        // target: f(a,b) = 2 + 1.5a - 0.7b + 0.4 a b - 0.3 a^2  (smooth, degree 2)
        function target(a,b){{ return 2 + 1.5*a - 0.7*b + 0.4*a*b - 0.3*a*a; }}
        // sample a grid, split 70/30
        const inputs=[], outputs=[];
        for(let i=0;i<12;i++) for(let j=0;j<12;j++){{
            const a=-1+2*i/11, b=-1+2*j/11;
            inputs.push([a,b]); outputs.push(target(a,b));
        }}
        // deterministic split by index parity-ish stride
        const trainIn=[],trainOut=[],testIn=[],testOut=[];
        inputs.forEach((x,k)=>{{ if(k%10<7){{trainIn.push(x);trainOut.push(outputs[k]);}}
                                 else {{testIn.push(x);testOut.push(outputs[k]);}} }});
        const model = FokoSurrogate.fit({{inputs:trainIn, outputs:trainOut, degree:2}});
        const pred = testIn.map(x=>FokoSurrogate.predict(model, x));
        // R^2 on held-out
        const mean = testOut.reduce((s,v)=>s+v,0)/testOut.length;
        let ssRes=0, ssTot=0;
        testOut.forEach((y,k)=>{{ ssRes+=(y-pred[k])**2; ssTot+=(y-mean)**2; }});
        const r2 = 1 - ssRes/ssTot;
        process.stdout.write(JSON.stringify({{r2}}));
    """)
    assert out["r2"] >= SURROGATE_TEST_R2, f"held-out R^2 too low: {out['r2']}"


def test_surrogate_reports_cv_error() -> None:
    """
    fit() must expose a cross-validation error estimate so the user knows how far to
    trust the emulator. We just assert the field exists and is a finite non-negative
    number — the value is problem-dependent.
    """
    out = _run(SURROGATE_SRC, """
        const inputs=[], outputs=[];
        for(let i=0;i<8;i++) for(let j=0;j<8;j++){ const a=i/7,b=j/7; inputs.push([a,b]); outputs.push(a*a+b); }
        const model = FokoSurrogate.fit({inputs, outputs, degree:2});
        process.stdout.write(JSON.stringify({cv:model.cvError}));
    """)
    assert isinstance(out["cv"], (int, float)) and out["cv"] >= 0, out["cv"]


def test_surrogate_preconditions() -> None:
    """Empty data, or mismatched input/output counts, must throw a named error."""
    out = _run(SURROGATE_SRC, """
        const results={};
        try { FokoSurrogate.fit({inputs:[], outputs:[], degree:2}); results.empty='NO_THROW'; }
        catch(e){ results.empty=String(e.message||e); }
        try { FokoSurrogate.fit({inputs:[[1,2]], outputs:[1,2], degree:2}); results.mismatch='NO_THROW'; }
        catch(e){ results.mismatch=String(e.message||e); }
        process.stdout.write(JSON.stringify(results));
    """)
    assert out["empty"] != "NO_THROW" and "empty" in out["empty"].lower()
    assert out["mismatch"] != "NO_THROW" and ("match" in out["mismatch"].lower() or "length" in out["mismatch"].lower())


# ═════════════════════════════════════════════════════════════════════════════
# C. Wiring + honest removal of fake scaffolds
# ═════════════════════════════════════════════════════════════════════════════

def test_engines_loaded_and_used_by_sciml_lab() -> None:
    """
    The lab page must load both engines, and sciml-lab.js must call them. Guards
    against headless engines no user can reach.
    """
    page = (ROOT / "sciml.html").read_text(encoding="utf-8")
    assert "src/inverse.js" in page, "sciml.html must load src/inverse.js"
    assert "src/surrogate.js" in page, "sciml.html must load src/surrogate.js"
    lab = (ROOT / "src/sciml-lab.js").read_text(encoding="utf-8")
    assert "FokoInverse" in lab, "sciml-lab.js must call window.FokoInverse for real calibration"
    assert "FokoSurrogate" in lab, "sciml-lab.js must call window.FokoSurrogate for real emulation"


def test_fake_scaffold_approaches_are_removed_or_labeled_export_only() -> None:
    """
    Remove the noise: the approaches that produced only a generic message must
    either be gone, or explicitly labelled export-only. This test fails if any of
    them still pretends to run a browser 'analysis' without real computation.

    Contract: for any approach still present that is NOT genuinely computed
    (assimilation, pinn, operator, network), the code must mark it export-only
    (an 'exportOnly' flag / label), so the UI never claims a browser result it did
    not compute.
    """
    lab = (ROOT / "src/sciml-lab.js").read_text(encoding="utf-8")
    # sindy, inverse, surrogate are genuinely computed.
    # If any heavy approach remains, it must be tagged export-only.
    for heavy in ["pinn", "operator", "assimilation", "network"]:
        if f"'{heavy}'" in lab or f'"{heavy}"' in lab:
            assert "exportOnly" in lab or "export-only" in lab or "EXPORT_ONLY" in lab, (
                f"approach '{heavy}' is still present but nothing marks it export-only; "
                "either remove it or label it so the UI does not claim a browser result."
            )
