"""
test_v62_latex_greek_rendering.py
=================================

Protocol step 1: test before the fix. This pins the LaTeX rendering defect the
Genetic toggle switch exposes and the contract the fix must satisfy.

The defect, proven
------------------
Equations are rendered by  math.parse(expr).toTex(...)  then katex.render(...).
mathjs toTex() converts BARE Greek names to Greek commands but leaves INDEXED
Greek names as literal roman text:

    math.parse('beta').toTex()   -> '\\beta'      (Greek, good)
    math.parse('gamma').toTex()  -> '\\gamma'     (Greek, good)
    math.parse('alpha1').toTex() -> ' alpha1'     (literal roman, BROKEN)
    math.parse('alpha2').toTex() -> ' alpha2'     (literal roman, BROKEN)

The Genetic toggle switch uses params alpha1, alpha2, beta, gamma. So its
rendered system shows real beta/gamma symbols sitting next to the upright word
"alpha1" — visually inconsistent and read as a rendering failure. This hits any
indexed Greek parameter (alpha1, beta2, ...) platform-wide, not just the toggle.

The contract the fix must satisfy
---------------------------------
A `greekify(tex)` post-processor is added to the shared TeX path so that, after
mathjs toTex():

  1. An indexed Greek name (alphaN) becomes a proper subscripted Greek command:
        'alpha1' -> '\\alpha_{1}'
  2. A bare Greek name that is already '\\beta' is left untouched (no double
     backslash, no corruption).
  3. Non-Greek identifiers (u, v, x, k1) are untouched.
  4. It is idempotent: greekify(greekify(t)) == greekify(t).

Explicitly OUT OF SCOPE (documented, not fixed here):
  * underscore-named Greek like 'gamma_1' — mathjs emits 'gamma\\_1' and the
    clean fix for that is a separate concern (it needs the underscore treated as
    a subscript, which changes semantics). The reported bug is the digit-suffix
    form, and over-reaching risks regressing valid underscore identifiers.

How this test runs the real code
--------------------------------
greekify lives in a browser IIFE (src/latex-greek.js) that attaches
window.FokoTex.greekify. We execute it in Node via vm with window===ctx, then
call it on the exact toTex() output mathjs produces (mathjs installed in the
harness). This tests the SHIPPING function, not a Python re-implementation.

Run:
    python -m pytest tests/test_v62_latex_greek_rendering.py -v
"""

from __future__ import annotations

import json
import subprocess
import textwrap
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
GREEKIFY_SRC = "src/latex-greek.js"


# ─────────────────────────────────────────────────────────────────────────────
# Harness: run the shipping greekify() in Node against real mathjs toTex output
# ─────────────────────────────────────────────────────────────────────────────

def _node_greekify(exprs: list[str]) -> dict[str, str]:
    """
    For each input EXPRESSION, return {expr: greekify(mathjs.toTex(expr))} using
    the shipping greekify implementation.

    Pre-conditions:
      * the greekify source file exists (else the fix was not added);
      * Node executes without error and returns valid JSON.
    """
    src = ROOT / GREEKIFY_SRC
    assert src.exists(), (
        f"[fix-missing] {GREEKIFY_SRC} not found. The fix must add a shared "
        "greekify() TeX post-processor (browser IIFE attaching "
        "window.FokoTex.greekify)."
    )

    script = textwrap.dedent(f"""
        const vm = require('vm'), fs = require('fs');
        let math;
        try {{ math = require('mathjs'); }}
        catch (e) {{
          console.error('MATHJS_MISSING'); process.exit(3);
        }}
        // Load the shipping greekify into a vm context with window === ctx.
        const ctx = {{}}; ctx.window = ctx;
        vm.createContext(ctx);
        vm.runInContext(fs.readFileSync({json.dumps(str(src))}, 'utf8'), ctx);
        const greekify = ctx.FokoTex && ctx.FokoTex.greekify;
        if (typeof greekify !== 'function') {{
          console.error('GREEKIFY_NOT_EXPORTED'); process.exit(4);
        }}
        const exprs = {json.dumps(exprs)};
        const out = {{}};
        for (const e of exprs) {{
          const raw = math.parse(e).toTex({{parenthesis:'keep', implicit:'hide'}});
          out[e] = greekify(raw);
        }}
        process.stdout.write(JSON.stringify(out));
    """)

    proc = subprocess.run(
        ["node", "-e", script],
        capture_output=True, text=True, cwd=str(ROOT),
    )
    if proc.returncode == 3:
        pytest.skip("mathjs not installed in the test harness (npm i mathjs@13.2.0)")
    assert proc.returncode == 0, (
        f"Node harness failed (code {proc.returncode}).\n"
        f"stderr: {proc.stderr}\nstdout: {proc.stdout}"
    )
    return json.loads(proc.stdout)


def _node_greekify_raw(tex_strings: list[str]) -> dict[str, str]:
    """
    Apply the shipping greekify DIRECTLY to raw TeX strings (no mathjs), for
    idempotency and bare-name tests. Pre-condition: source present, Node OK.
    """
    src = ROOT / GREEKIFY_SRC
    assert src.exists(), f"[fix-missing] {GREEKIFY_SRC} not found."
    script = textwrap.dedent(f"""
        const vm = require('vm'), fs = require('fs');
        const ctx = {{}}; ctx.window = ctx; vm.createContext(ctx);
        vm.runInContext(fs.readFileSync({json.dumps(str(src))}, 'utf8'), ctx);
        const greekify = ctx.FokoTex && ctx.FokoTex.greekify;
        if (typeof greekify !== 'function') {{ console.error('NO_FN'); process.exit(4); }}
        const items = {json.dumps(tex_strings)};
        const out = {{}};
        for (const t of items) out[t] = greekify(t);
        process.stdout.write(JSON.stringify(out));
    """)
    proc = subprocess.run(["node", "-e", script], capture_output=True, text=True, cwd=str(ROOT))
    assert proc.returncode == 0, f"Node failed: {proc.stderr or proc.stdout}"
    return json.loads(proc.stdout)


# ─────────────────────────────────────────────────────────────────────────────
# 1. The exact toggle-switch symptom is fixed
# ─────────────────────────────────────────────────────────────────────────────

def test_toggle_switch_indexed_alpha_becomes_greek() -> None:
    """
    P1 — the two toggle-switch right-hand sides must render alpha1/alpha2 as
    subscripted Greek, matching the beta/gamma that mathjs already converts.
    """
    out = _node_greekify([
        "alpha1/(1+v^beta)-u",
        "alpha2/(1+u^gamma)-v",
    ])
    r1 = out["alpha1/(1+v^beta)-u"]
    r2 = out["alpha2/(1+u^gamma)-v"]

    # alpha1/alpha2 must now be Greek-with-subscript, not literal roman.
    assert "\\alpha_{1}" in r1, (
        f"alpha1 not converted. Got: {r1!r}. Expected '\\alpha_{{1}}'."
    )
    assert "\\alpha_{2}" in r2, (
        f"alpha2 not converted. Got: {r2!r}. Expected '\\alpha_{{2}}'."
    )
    # The literal roman word must be gone.
    assert "alpha1" not in r1.replace("\\alpha_{1}", ""), (
        f"literal 'alpha1' still present in {r1!r}"
    )
    # beta/gamma remain proper Greek (regression guard).
    assert "\\beta" in r1 and "\\gamma" in r2, (
        "beta/gamma must remain Greek after greekify."
    )


def test_consistency_all_four_params_are_greek() -> None:
    """
    P1 — the point of the fix is visual consistency: in the rendered toggle
    system, all four params (alpha1, alpha2, beta, gamma) must be Greek symbols.
    No param may render as an upright roman word.
    """
    out = _node_greekify(["alpha1/(1+v^beta)-u", "alpha2/(1+u^gamma)-v"])
    joined = out["alpha1/(1+v^beta)-u"] + out["alpha2/(1+u^gamma)-v"]
    for roman in ("alpha1", "alpha2"):
        # after stripping the correct commands, no bare roman greek remains
        cleaned = joined.replace("\\alpha_{1}", "").replace("\\alpha_{2}", "")
        assert roman not in cleaned, (
            f"'{roman}' still renders as roman text in {joined!r}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 2. General indexed Greek + non-Greek safety
# ─────────────────────────────────────────────────────────────────────────────

def test_other_indexed_greek_names() -> None:
    """P1 — the fix generalises: beta2, gamma3, delta1 all convert."""
    out = _node_greekify(["beta2", "gamma3", "delta1"])
    assert out["beta2"].strip() == "\\beta_{2}", out["beta2"]
    assert out["gamma3"].strip() == "\\gamma_{3}", out["gamma3"]
    assert out["delta1"].strip() == "\\delta_{1}", out["delta1"]


def test_non_greek_identifiers_untouched() -> None:
    """
    P1 — ordinary variables must not be altered. 'u', 'v', 'k1', 'x2' are not
    Greek and must pass through greekify unchanged (modulo mathjs formatting).
    """
    out = _node_greekify(["u+v", "k1*x2"])
    # No backslash-Greek should be injected for non-Greek names.
    for expr, tex in out.items():
        for bad in ("\\u", "\\v", "\\k", "\\x"):
            assert bad not in tex, (
                f"non-Greek identifier corrupted in {expr!r} -> {tex!r} "
                f"(found {bad})"
            )


def test_bare_greek_not_double_escaped() -> None:
    """
    P2 — a TeX string already containing '\\beta' must not become '\\\\beta'.
    Guards against the bare-name pass re-processing its own output.
    """
    out = _node_greekify_raw(["\\beta + \\gamma", "\\alpha_{1}"])
    assert out["\\beta + \\gamma"] == "\\beta + \\gamma", out["\\beta + \\gamma"]
    assert out["\\alpha_{1}"] == "\\alpha_{1}", out["\\alpha_{1}"]


def test_greekify_is_idempotent() -> None:
    """
    P1 — greekify(greekify(t)) == greekify(t). Rendering can run repeatedly
    (live editing); a non-idempotent transform would corrupt on the 2nd pass.
    """
    samples = ["alpha1/(1+v^beta)-u", "beta2 + gamma", "u+v"]
    once = _node_greekify(samples)
    twice = _node_greekify_raw(list(once.values()))
    for expr, first in once.items():
        assert twice[first] == first, (
            f"not idempotent: {expr!r}\n once:  {first!r}\n twice: {twice[first]!r}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 3. Wiring: greekify is loaded and used in the render paths
# ─────────────────────────────────────────────────────────────────────────────

def test_greekify_loaded_on_symbolic_and_workbench_pages() -> None:
    """
    P1 — the shared script must be included on pages that render model LaTeX
    (symbolic.html at minimum, where the toggle switch lives).
    """
    sym = (ROOT / "symbolic.html").read_text(encoding="utf-8")
    assert "latex-greek.js" in sym, (
        "symbolic.html must load src/latex-greek.js so greekify is available "
        "to the symbolic render path."
    )


def test_symbolic_tex_path_calls_greekify() -> None:
    """
    P1 — the symbolic lab's tex() wrapper must route toTex output through
    greekify, otherwise loading the file changes nothing.
    """
    js = (ROOT / "src/symbolic-lab.js").read_text(encoding="utf-8")
    assert "greekify" in js or "FokoTex" in js, (
        "src/symbolic-lab.js must call greekify (window.FokoTex.greekify) on the "
        "toTex output in its tex() helper."
    )
