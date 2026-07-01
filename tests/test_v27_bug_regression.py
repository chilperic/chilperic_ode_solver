"""
test_v27_bug_regression.py
==========================

Regression tests for two P1 bugs introduced in v26:

  BUG-1: app.js worker onerror handler does not null state.worker.
          After a worker crash the next worker() call returns the dead
          worker reference, causing the next run to silently produce
          no result and emit no error message.

  BUG-2: openCurrentInSymbolic writes to sessionStorage and redirects
          to symbolic.html?import=session, but symbolic-lab.js has no
          receiver for that parameter. The "Open in Symbolic" button
          is a dead-end: it navigates away but the symbolic lab ignores
          the payload and loads its default logistic example.

Run from the repo root with:
    python -m pytest tests/test_v27_bug_regression.py -v

Both tests are designed to FAIL on v26 and PASS once the bugs are fixed.
"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(p: str) -> str:
    return (ROOT / p).read_text(encoding="utf-8")


# ─────────────────────────────────────────────────────────────────────────────
# BUG-1 tests
# ─────────────────────────────────────────────────────────────────────────────

def test_worker_onerror_nulls_state_worker():
    """
    The onerror callback on the ODE worker must set state.worker = null
    BEFORE calling endBusy().  Without this, the keep-alive guard
    (if(state.worker) return state.worker) returns the dead worker on
    the next run().

    We check:
      (a) state.worker = null appears inside the onerror handler body.
      (b) It appears BEFORE endBusy so the next worker() call gets a
          fresh instance, not a race with UI reset.
    """
    app = read("src/app.js")

    # Locate the onerror handler block
    start = app.find("state.worker.onerror")
    assert start != -1, "onerror handler not found in app.js"

    # Grab enough text to contain the handler body (up to the next ;})
    # Typical handler is one arrow function on a single logical line
    snippet = app[start:start + 500]

    # (a) null assignment must be present
    assert "state.worker = null" in snippet, (
        "onerror handler must set state.worker = null; "
        "without this, the dead worker is returned by the keep-alive guard "
        "on the next run, causing silent failure. "
        f"Handler snippet:\n{snippet[:300]}"
    )

    # (b) null assignment must come before endBusy in the same handler
    null_pos    = snippet.index("state.worker = null")
    endbusy_pos = snippet.index("endBusy") if "endBusy" in snippet else len(snippet)
    assert null_pos < endbusy_pos, (
        "state.worker = null must appear before endBusy() in the onerror handler; "
        "order matters so the next worker() call creates a fresh worker "
        "rather than racing with the UI reset."
    )


def test_worker_onerror_sets_null_not_terminate():
    """
    The keep-alive pattern means we must NOT call terminate() inside
    onerror — the worker already crashed; terminate() on a dead worker
    is a no-op but it signals confusion about the design intent.
    Only null the reference; let the GC clean up.
    """
    app = read("src/app.js")
    start = app.find("state.worker.onerror")
    assert start != -1
    snippet = app[start:start + 400]

    # terminate() must NOT appear inside the onerror handler
    assert ".terminate()" not in snippet, (
        "onerror handler should only null state.worker, "
        "not call .terminate() on an already-dead worker. "
        f"Snippet:\n{snippet[:300]}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# BUG-2 tests
# ─────────────────────────────────────────────────────────────────────────────

def test_symbolic_lab_reads_sessionStorage_on_import_param():
    """
    symbolic-lab.js must handle ?import=session by reading
    sessionStorage('foko-symbolic-import').  Without this, the
    "Open in Symbolic" handoff button in ODE Lab navigates to
    symbolic.html?import=session but the symbolic lab loads its
    default logistic example instead of the ODE model.
    """
    js = read("src/symbolic-lab.js")

    assert "sessionStorage" in js, (
        "symbolic-lab.js must read sessionStorage to support the "
        "ODE→Symbolic handoff. The key 'foko-symbolic-import' is written "
        "by openCurrentInSymbolic() in app.js."
    )

    assert "foko-symbolic-import" in js, (
        "symbolic-lab.js must reference the key 'foko-symbolic-import' "
        "used by app.js openCurrentInSymbolic()."
    )


def test_symbolic_lab_checks_import_url_param():
    """
    The import receiver must gate on the URL parameter ?import=session,
    not unconditionally try to read sessionStorage on every page load
    (that would break direct navigation to symbolic.html).
    """
    js = read("src/symbolic-lab.js")

    has_param_check = (
        "import=session" in js
        or ("params.get" in js and "import" in js)
        or ("URLSearchParams" in js and "import" in js)
    )
    assert has_param_check, (
        "symbolic-lab.js must check for the URL parameter ?import=session "
        "before attempting to read sessionStorage. Without this guard, "
        "a direct visit to symbolic.html would silently attempt a stale import."
    )


def test_symbolic_lab_applies_imported_model_fields():
    """
    After reading the sessionStorage payload, symbolic-lab.js must
    populate at least the variables, parameters and RHS fields.
    These correspond to the object structure written by
    openCurrentInSymbolic(): {variables, parameters, rhs, numericScope}.
    """
    js = read("src/symbolic-lab.js")

    # Only meaningful to check if the other two tests pass;
    # if sessionStorage handling is absent this test also fails.
    if "foko-symbolic-import" not in js:
        raise AssertionError(
            "Cannot check field application: sessionStorage key not present."
        )

    # The import handler must write to the visible form fields
    for field_id in ("symVars", "symParams", "symRhs"):
        assert field_id in js, (
            f"symbolic-lab.js import handler must populate '{field_id}' "
            f"from the session payload so the user sees the imported model."
        )


def test_openCurrentInSymbolic_writes_correct_key():
    """
    app.js openCurrentInSymbolic() must write 'foko-symbolic-import'
    to sessionStorage — the exact key that symbolic-lab.js reads.
    A mismatch would silently break the handoff even if both sides
    exist.
    """
    app = read("src/app.js")
    assert "foko-symbolic-import" in app, (
        "app.js must write sessionStorage key 'foko-symbolic-import' "
        "in openCurrentInSymbolic()."
    )

    # Check both ends use the same key (not caught by string search alone,
    # but catches copy-paste renames like 'foko-sym-import')
    sym = read("src/symbolic-lab.js")
    if "sessionStorage" in sym:
        # Both files must use the same key string
        app_key = re.search(r"'foko-symbolic-import'", app)
        sym_key = re.search(r"'foko-symbolic-import'", sym)
        assert app_key and sym_key, (
            "Key mismatch: app.js and symbolic-lab.js must use the "
            "identical sessionStorage key string 'foko-symbolic-import'."
        )


# ─────────────────────────────────────────────────────────────────────────────
# Integration: steady-state handoff is the reference implementation
# ─────────────────────────────────────────────────────────────────────────────

def test_steady_state_handoff_is_reference_implementation():
    """
    The ODE→Steady-State handoff is fully implemented and can serve
    as the reference pattern for the symbolic fix.  This test
    documents the expected structure so the symbolic implementation
    can be modelled after it.
    """
    steady = read("src/steady-state-lab.js")
    app    = read("src/app.js")

    # app.js writes 'foko-steady-import'
    assert "foko-steady-import" in app
    # steady-state-lab.js reads it
    assert "foko-steady-import" in steady
    # steady-state-lab.js gates on ?import=session
    assert "import=session" in steady or "params.get('import')" in steady
    # steady-state-lab.js applies the model fields
    assert "obj.vars" in steady and "obj.equations" in steady
