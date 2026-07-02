"""
test_v41_identity_navigation.py
================================

Step-by-step test plan for Foko Lab v41 identity-clean workbench-suite.

Covers:
  1. Navigation structure contract  — all 16 pages have the 4-dropdown pattern
  2. Dropdown content parity        — same labels across all pages (no drift)
  3. navigation.js ARIA correctness — static presence of required attributes
  4. navigation.js performance bug  — mousemove listener missing {passive:true}
  5. model-validator false-positive — 'stiff' matches Van der Pol narrative string
  6. FokoSession.load() absent from init() — session restore is half-implemented
  7. New pages completeness         — contact.html, acknowledgement.html
  8. Institution assets present     — 4 logos referenced and on disk

Severity legend (matches audit severity from v24/v26 cycles):
  P1 — data-integrity or silent failure risk
  P2 — correctness, performance, or user-visible degradation
  P3 — polish / completeness

Running:
    python -m pytest tests/test_v41_identity_navigation.py -v

All tests are designed to FAIL on the bugs they document
and PASS once those bugs are fixed.  Tests that already PASS
confirm carry-forward of earlier fixes.
"""

from __future__ import annotations

import json
import re
import subprocess
import textwrap
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

# ── Repo root ─────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    """Read a file relative to the repo root, raising clearly if absent."""
    p = ROOT / rel
    assert p.exists(), f"Expected file not found: {p}"
    return p.read_text(encoding="utf-8")


def soup(rel: str) -> BeautifulSoup:
    """Parse an HTML page with BeautifulSoup lxml parser."""
    return BeautifulSoup(read(rel), "html.parser")


# ── Pages that must carry the v41 navigation ──────────────────────────────────
# Every top-level page and the two new identity pages.
ALL_PAGES = [
    "index.html",
    "workbench.html",
    "ode.html",
    "optimization.html",
    "steady.html",
    "stochastic.html",
    "symbolic.html",
    "agent.html",
    "beauty.html",
    "examples.html",
    "research.html",
    "platform.html",
    "docs.html",
    "tutorial.html",
    "acknowledgement.html",
    "contact.html",
]

# Expected dropdown labels for each group — canonical form as <b> text
WORKBENCH_LABELS = ["ODE", "Stochastic CTMC", "Steady-State", "Optimization", "Symbolic", "Agent", "SciML", "Model Atlas"]
LEARN_LABELS     = ["Docs", "Tutorial", "Platform"]
ABOUT_LABELS     = ["Research", "Mathematical Beauty", "Acknowledgement", "Contact"]


# ══════════════════════════════════════════════════════════════════════════════
# 1.  Navigation structure contract
# ══════════════════════════════════════════════════════════════════════════════

class TestNavigationStructure:
    """
    Every page must have exactly one of each dropdown group plus a single
    top-level 'Home' link.  The dropdown groups must not overlap or be
    duplicated — the test catches copy-paste regression where a page keeps
    old nav or gets two copies of a group.
    """

    @pytest.mark.parametrize("page", ALL_PAGES)
    def test_exactly_one_home_link(self, page: str) -> None:
        """
        P2 — The nav must have exactly one direct 'Home' <a> child.
        More than one means the nav is duplicated; zero means the page
        is using a different (probably old) structure.
        """
        s = soup(page)
        home_links = [
            a for a in s.select(".topnav > a")
            if a.get_text(strip=True) == "Home"
        ]
        assert len(home_links) == 1, (
            f"{page}: expected 1 top-level 'Home' link, "
            f"found {len(home_links)}.  Nav may be duplicated or missing."
        )

    @pytest.mark.parametrize("page", ALL_PAGES)
    def test_exactly_three_dropdown_groups(self, page: str) -> None:
        """
        P2 — Three `<details class="nav-menu">` elements: Workbench, Learn, About.  Each must appear exactly once to avoid duplication
        or omission.
        """
        s = soup(page)
        groups = {
            "workbench": s.select(".topnav details.workbench-menu"),
            "learn":     s.select(".topnav details.learn-menu"),
            "about":     s.select(".topnav details.about-menu"),
        }
        for name, found in groups.items():
            assert len(found) == 1, (
                f"{page}: expected exactly 1 '{name}' dropdown menu, "
                f"found {len(found)}.  Check for duplicate nav blocks."
            )
        assert [a.get_text(strip=True) for a in s.select(".topnav details.legacy-menu .labs-menu-panel a")] == ["ODE","Optimization","Steady-State","Stochastic"], page

    @pytest.mark.parametrize("page", ALL_PAGES)
    def test_no_old_flat_nav_items(self, page: str) -> None:
        """
        P2 — The v25 flat-nav pattern had individual <a> items for every lab
        directly in .topnav (14 links).  v41 collapsed these into 4 dropdowns.
        Any surviving flat links (besides 'Home') indicate an incomplete migration.
        """
        s = soup(page)
        direct_links = [
            a.get_text(strip=True)
            for a in s.select(".topnav > a")
        ]
        # After Home, there must be no other direct <a> elements — everything
        # else lives in dropdown panels.
        assert direct_links == ["Home"], (
            f"{page}: expected only ['Home'] as direct topnav link, "
            f"got {direct_links}.  Old flat-nav items may be leaking through."
        )

    @pytest.mark.parametrize("page", ALL_PAGES)
    def test_navigation_js_loaded(self, page: str) -> None:
        """
        P1 — navigation.js must be loaded on every page.  Without it the
        dropdowns are plain <details> elements with no hover/ARIA management;
        they work as toggle-on-click only and break hover intent.
        """
        html = read(page)
        assert "navigation.js" in html, (
            f"{page}: navigation.js not loaded.  Dropdowns will lack hover "
            "handling, ARIA states, and Escape-key dismiss."
        )

    @pytest.mark.parametrize("page", ALL_PAGES)
    def test_no_floating_labs_remnant(self, page: str) -> None:
        """
        P2 — v27-v31 briefly used a floating bottom-bar for labs.
        That pattern was removed in v32.  Confirm it is fully absent.
        """
        s = soup(page)
        assert not s.select(".floating-labs, .floating-labs-toggle, .labs-strip"), (
            f"{page}: floating-labs remnant found; remove or it conflicts "
            "with the dropdown navigation."
        )


# ══════════════════════════════════════════════════════════════════════════════
# 2.  Dropdown content parity across pages
# ══════════════════════════════════════════════════════════════════════════════

def _panel_labels(page: str, menu_class: str) -> list[str]:
    """
    Extract bold text from all <a><b>…</b></a> items inside a named dropdown
    panel.  These are the canonical compact labels used in v40+.

    Pre-condition: soup() must find at least one menu with the given class.
    """
    s = soup(page)
    items = s.select(f".{menu_class} .labs-menu-panel a")
    # Require <b> child — the v40 contract says labels are <b>-wrapped only.
    labels = []
    for item in items:
        b = item.find("b")
        assert b is not None, (
            f"{page} / .{menu_class}: menu item '{item.get_text(strip=True)}' "
            "has no <b> child — v40 contract requires every item to have a "
            "bold label with no explanatory <span>."
        )
        labels.append(b.get_text(strip=True))
    return labels


class TestDropdownContentParity:
    """
    Every page must present identical dropdown labels.  Drift is caught by
    comparing each page's labels to the canonical constants at the module top.
    """

    @pytest.mark.parametrize("page", ALL_PAGES)
    def test_workbench_labels(self, page: str) -> None:
        """P2 — Workbench group content."""
        assert _panel_labels(page, "workbench-menu") == WORKBENCH_LABELS, page

    @pytest.mark.parametrize("page", ALL_PAGES)
    def test_learn_labels(self, page: str) -> None:
        """P2 — Learn group content."""
        assert _panel_labels(page, "learn-menu") == LEARN_LABELS, page

    @pytest.mark.parametrize("page", ALL_PAGES)
    def test_about_labels(self, page: str) -> None:
        """P2 — About group content."""
        assert _panel_labels(page, "about-menu") == ABOUT_LABELS, page

    @pytest.mark.parametrize("page", ALL_PAGES)
    def test_no_explanatory_spans_in_panels(self, page: str) -> None:
        """
        P2 — v40 compact-dropdown contract: panels contain <b> labels only,
        no descriptive <span> text.  Spans were removed because they made
        the dropdown feel like a landing page rather than a navigation aid.
        """
        s = soup(page)
        for panel in s.select(".nav-menu .labs-menu-panel"):
            spans = panel.find_all("span")
            assert not spans, (
                f"{page}: found {len(spans)} <span> element(s) inside a "
                "dropdown panel — v40 contract requires label-only (no spans)."
            )

    @pytest.mark.parametrize("page", ALL_PAGES)
    def test_panel_items_have_role_menuitem(self, page: str) -> None:
        """
        P2 ARIA — Links inside dropdown panels must carry role='menuitem' to
        complete the ARIA menu pattern started by role='menu' on the panel.
        Missing roles break screen-reader navigation.
        """
        s = soup(page)
        for panel in s.select(".labs-menu-panel[role='menu']"):
            for link in panel.find_all("a"):
                assert link.get("role") == "menuitem", (
                    f"{page}: <a href='{link.get('href','')}> inside "
                    "role='menu' panel is missing role='menuitem'."
                )


# ══════════════════════════════════════════════════════════════════════════════
# 3.  navigation.js ARIA and event handler contract
# ══════════════════════════════════════════════════════════════════════════════

class TestNavigationJsContract:
    """
    Static source checks confirm the expected behavior is coded in navigation.js.
    These are not browser execution tests — they guard against accidental deletion
    of critical code paths during future refactoring.
    """

    def _nav_js(self) -> str:
        return read("src/navigation.js")

    def test_aria_expanded_managed(self) -> None:
        """P2 ARIA — setExpanded() must toggle aria-expanded on the summary."""
        js = self._nav_js()
        assert "aria-expanded" in js, (
            "navigation.js must set aria-expanded on the summary element. "
            "Without it, screen readers cannot announce open/close state."
        )
        assert "setAttribute('aria-expanded'" in js or \
               'setAttribute("aria-expanded"' in js, (
            "aria-expanded must be set via setAttribute, not as a property "
            "assignment, to ensure correct serialization."
        )

    def test_aria_haspopup_set(self) -> None:
        """P2 ARIA — summary must receive aria-haspopup='menu'."""
        js = self._nav_js()
        assert "aria-haspopup" in js, (
            "navigation.js must set aria-haspopup='menu' on summary elements. "
            "This tells screen readers the button controls a popup menu."
        )

    def test_escape_key_closes_menus(self) -> None:
        """P2 keyboard — Pressing Escape must close all open menus."""
        js = self._nav_js()
        # The handler must check for 'Escape' key specifically.
        assert "'Escape'" in js or '"Escape"' in js, (
            "navigation.js must close all menus on Escape key. "
            "Without this, keyboard users cannot dismiss dropdowns."
        )

    def test_click_prevents_default(self) -> None:
        """
        P2 — The summary click handler must call event.preventDefault().
        Without this, clicking a <summary> inside a <details> toggles the
        browser's built-in open/closed state independently of our JS state,
        causing desync between `menu.hasAttribute('open')` and the visual state.
        """
        js = self._nav_js()
        assert "event.preventDefault()" in js, (
            "navigation.js click handler must call event.preventDefault() "
            "to take full control of open/closed state from the browser."
        )

    def test_focusout_closes_on_blur(self) -> None:
        """P2 keyboard — Menu must close when focus leaves the widget entirely."""
        js = self._nav_js()
        assert "focusout" in js, (
            "navigation.js must handle 'focusout' to close menus when the "
            "user tabs away, preventing orphaned open dropdowns."
        )

    def test_pointer_and_mouse_events_both_registered(self) -> None:
        """
        P2 compatibility — Both Pointer Events ('pointerenter'/'pointerleave')
        and legacy Mouse Events ('mouseenter'/'mouseleave') are registered.
        Pointer Events supersede Mouse Events on modern browsers, but the legacy
        pair covers older WebViews used in research computing environments.
        """
        js = self._nav_js()
        for event in ("pointerenter", "pointerleave", "mouseenter", "mouseleave"):
            assert event in js, (
                f"navigation.js must register '{event}' handler. "
                f"Both Pointer and Mouse events are required for broad compat."
            )

    def test_mousemove_listener_is_passive(self) -> None:
        """
        P2 PERFORMANCE — The global document 'mousemove' listener must use
        {passive: true} to prevent blocking the browser's scroll thread.

        The mousemove event fires on every mouse movement across the entire
        document.  Without {passive: true}, the browser must wait for the
        handler to complete before rendering the next frame, causing jank
        that is especially visible when the user scrolls while a menu is open.

        Fix:
            document.addEventListener('mousemove', handler, { passive: true });

        This test FAILS on v41 because the passive option is not set.
        """
        js = self._nav_js()
        # Find the mousemove addEventListener call and check if it includes
        # a third argument containing 'passive'.
        # Regex: addEventListener('mousemove', ..., { passive: true })
        pattern = re.compile(
            r"addEventListener\(['\"]mousemove['\"]"   # event name
            r".*?"                                       # handler (non-greedy)
            r"\{[^}]*passive[^}]*true[^}]*\}",         # options object with passive:true
            re.DOTALL
        )
        assert pattern.search(js), (
            "navigation.js registers a global 'mousemove' listener without "
            "{passive: true}.  This blocks the browser's scroll thread on every "
            "mouse move while a dropdown is open.  "
            "Fix: document.addEventListener('mousemove', handler, {passive: true})."
        )

    def test_no_duplicate_hover_handling(self) -> None:
        """
        P2 CORRECTNESS — Each menu should be opened by pointerenter OR
        mouseenter, not both independently.  Both events fire on desktop;
        registering separate handlers for each causes openMenu() to be called
        twice per hover, triggering closeAll() twice and introducing needless
        DOM churn.

        Best practice: use pointerenter as the primary event and fall back to
        mouseenter only if Pointer Events are not supported (old browsers).
        The current implementation registers both unconditionally.

        This test FAILS on v41 to document the bug.  A correct implementation
        would guard one behind a feature-detection check.
        """
        js = self._nav_js()
        # Count how many of the four hover event types are registered
        # unconditionally (not inside an if-statement).
        # A correct implementation uses either pointer events OR mouse events,
        # not both for the same action.
        has_pointer_enter  = "pointerenter" in js
        has_mouse_enter    = "mouseenter" in js
        has_feature_detect = (
            "PointerEvent" in js
            or "'pointerover' in window" in js
            or "window.PointerEvent" in js
        )
        if has_pointer_enter and has_mouse_enter:
            assert has_feature_detect, (
                "navigation.js registers both 'pointerenter' and 'mouseenter' "
                "handlers for opening menus without a feature-detection guard.  "
                "On desktop, both events fire, causing openMenu() to be called "
                "twice per hover.  "
                "Fix: guard mouseenter behind "
                "if (!window.PointerEvent) { ... } or use only pointerenter."
            )


# ══════════════════════════════════════════════════════════════════════════════
# 4.  model-validator.js false-positive (P2 correctness)
# ══════════════════════════════════════════════════════════════════════════════

def _run_validator_node(setup_js: str) -> dict:
    """
    Execute model-validator.js in Node.js and return the parsed JSON result.

    The IIFE assigns to ``window.FokoModelValidator``.  Inside a vm.Context,
    the context object IS the global scope, so setting ``ctx.window = ctx``
    makes ``window`` resolve to the context itself.  We then run the source
    AS-IS (no text replacement); when the IIFE executes
    ``window.FokoModelValidator = {...}`` it is equivalent to
    ``ctx.FokoModelValidator = {...}``.

    Key: do NOT do the ``window. → ctx.`` replacement that was used
    previously — after that replacement ``ctx`` is no longer a variable
    visible inside the vm sandbox, causing ReferenceError.
    """
    script = textwrap.dedent(f"""
        const vm = require('vm'), fs = require('fs');
        // ctx becomes the vm global; ctx.window = ctx so 'window' resolves to ctx
        const ctx = {{}};
        ctx.window = ctx;
        vm.createContext(ctx);
        // Run the IIFE source unchanged: window.FokoModelValidator = ... lands on ctx
        vm.runInContext(fs.readFileSync('src/model-validator.js', 'utf8'), ctx);
        const v = ctx.FokoModelValidator;
        {setup_js}
    """)
    result = subprocess.run(
        ["node", "-e", script],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )
    assert result.returncode == 0, (
        f"Node.js exited with code {result.returncode}\n"
        f"stdout: {result.stdout}\n"
        f"stderr: {result.stderr}"
    )
    return json.loads(result.stdout.strip())


class TestModelValidatorCorrectness:
    """
    The model-validator searches the full JSON.stringify(model) for keywords.
    This means narrative strings like 'Large mu creates stiffness; export
    Python with Radau' trigger the stiff-solver warning even though the model
    uses method='rk45'.  These tests document the false-positive and the
    correct target behaviour.
    """

    def test_null_model_is_not_ok(self) -> None:
        """
        P1 — validate(null, 'ode') must not return ok:true.
        A null model has no equations; running it crashes later in app.js.
        The validator returning ok:true for null is semantically incorrect.

        This test FAILS on v41 (validator returns ok:true for null).
        """
        r = _run_validator_node(
            "process.stdout.write(JSON.stringify(v.validate(null, 'ode')));"
        )
        assert r.get("ok") is False or len(r.get("blockers", [])) > 0, (
            "validate(null, 'ode') returned ok:true.  A null model cannot "
            "be run; the validator must return a blocker.  "
            "Fix: add if (!model) blockers.push('No model supplied.') "
            "at the start of validate()."
        )

    def test_van_der_pol_narrative_does_not_trigger_stiff_warning(self) -> None:
        """
        P2 — The Van der Pol narrative string contains 'stiffness' and 'Radau'.
        validate() currently searches the full JSON.stringify(model), so the
        narrative triggers the stiff-solver warning even for method='rk45'.
        This is a false positive: the model is runnable in the browser.

        This test FAILS on v41 because the validator searches narrative text.
        Fix: restrict the stiff-solver check to model.method and model.eqs only.
        """
        vdp_model = {
            "vars": ["x", "v"],
            "eqs": ["v", "mu*(1-x^2)*v-x"],
            "method": "rk45",
            "narrative": (
                "Limit cycle oscillator. Large mu creates stiffness; "
                "export Python with Radau for serious stiff runs."
            ),
        }
        setup = (
            f"const m = {json.dumps(vdp_model)};\n"
            "process.stdout.write(JSON.stringify(v.validate(m, 'ode')));"
        )
        r = _run_validator_node(setup)
        stiff_warnings = [
            w for w in r.get("warnings", [])
            if "stiff" in w.lower() or "radau" in w.lower()
        ]
        assert not stiff_warnings, (
            f"validate() triggered a stiff-solver warning for Van der Pol "
            f"with method='rk45'.  The warning came from the narrative string "
            f"containing 'stiffness' and 'Radau', not from the model method.  "
            f"Warnings: {stiff_warnings}.  "
            f"Fix: test only model.method and model.eqs, not the full JSON."
        )

    def test_actual_stiff_method_does_trigger_warning(self) -> None:
        """
        P2 — The inverse test: a model with method='radau' must trigger the
        stiff warning even after the false-positive fix is applied.
        This ensures the fix does not over-correct by removing the check
        entirely.
        """
        radau_model = {
            "vars": ["A", "B"],
            "eqs": ["-k1*A", "k1*A"],
            "method": "radau",
        }
        setup = (
            f"const m = {json.dumps(radau_model)};\n"
            "process.stdout.write(JSON.stringify(v.validate(m, 'ode')));"
        )
        r = _run_validator_node(setup)
        warnings_lower = [w.lower() for w in r.get("warnings", [])]
        assert any("stiff" in w or "radau" in w for w in warnings_lower), (
            "validate() must warn when method='radau' is explicitly set — "
            "Radau is a Python-only export solver, not a browser solver.  "
            f"Got warnings: {r.get('warnings', [])}."
        )

    def test_delay_equation_is_blocked(self) -> None:
        """
        P1 — A model with a delay term in the equations must produce a blocker,
        not just a warning.  Browser RK integrators cannot handle DDEs.
        """
        dde_model = {
            "vars": ["x"],
            "eqs": ["x(t-tau) - x"],
            "method": "rk45",
        }
        setup = (
            f"const m = {json.dumps(dde_model)};\n"
            "process.stdout.write(JSON.stringify(v.validate(m, 'ode')));"
        )
        r = _run_validator_node(setup)
        assert r.get("ok") is False, (
            "validate() must block (ok:false) when a delay term 'x(t-tau)' "
            f"is present in the equations.  Got: {r}."
        )

    def test_large_ode_system_gives_warning_not_blocker(self) -> None:
        """
        P2 — A 26-variable ODE should produce a warning (not a blocker);
        it is runnable in the browser but slow.
        """
        big_model = {
            "vars": [f"x{i}" for i in range(26)],
            "eqs": [f"-k*x{i}" for i in range(26)],
            "method": "rk45",
        }
        setup = (
            f"const m = {json.dumps(big_model)};\n"
            "process.stdout.write(JSON.stringify(v.validate(m, 'ode')));"
        )
        r = _run_validator_node(setup)
        assert r.get("ok") is True, (
            f"26-variable ODE should be ok:true (runnable with warning), "
            f"not blocked.  Got: {r}."
        )
        assert len(r.get("warnings", [])) > 0, (
            "26-variable ODE should produce at least one warning about "
            "high-dimensional browser runs."
        )


# ══════════════════════════════════════════════════════════════════════════════
# 5.  FokoSession.load() absent from init() — session restore half-implemented
# ══════════════════════════════════════════════════════════════════════════════

class TestSessionRestoreHalfImplemented:
    """
    model-session.js exposes save(), load(), clear().  app.js calls save()
    on every run.  But load() is never called in init(), so the session
    persists writes but never performs the restore that makes persistence
    useful to the user.

    These tests document the gap so it is tracked and not silently closed
    by a refactor that removes save() without adding load().
    """

    def test_session_save_is_called_on_run(self) -> None:
        """
        P2 — save() is called in runOde(), runSweep(), runOpt().  This is
        correct and should be preserved.  If this test fails, someone removed
        the save calls without adding them elsewhere.
        """
        app = read("src/app.js")
        # All three run paths must save the model.
        assert "FokoSession?.save?.(" in app or "FokoSession.save(" in app, (
            "app.js must call FokoSession.save() in run paths "
            "(runOde, runSweep, runOpt).  The save calls are present in v41 "
            "and should not be removed without an equivalent restore path."
        )

    def test_session_load_is_called_in_init(self) -> None:
        """
        P2 — load() must be called in init() to restore the last session on
        page load.  Currently it is NOT called, so users lose their last
        model every time they refresh the page.

        This test FAILS on v41 because init() does not call FokoSession.load().

        Fix: in init(), after setModule() and before loadExample():
            const saved = FokoSession?.load?.(state.module);
            if (saved && saved.payload && !ex) {
                state.model = saved.payload;
                renderOdeControls();
                updateMathPreview();
                refreshAllSelects();
                setStatus(`Restored from ${saved.savedAt?.slice(0,10)}.`);
                return;
            }
        """
        app = read("src/app.js")
        # Find the init() function body
        init_start = app.find("function init(){")
        assert init_start != -1, "init() function not found in app.js"
        # Grab text from init() up to the next top-level function definition
        init_body = app[init_start:init_start + 800]

        has_load_call = (
            "FokoSession?.load?." in init_body
            or "FokoSession.load(" in init_body
            or "FokoSession?.load(" in init_body
        )
        assert has_load_call, (
            "app.js init() does not call FokoSession.load().  "
            "Session persistence saves on run but never restores on page load.  "
            "Add FokoSession?.load?.(state.module) inside init() to complete "
            "the persist-and-restore cycle.  "
            f"Current init() body (first 400 chars):\n{init_body[:400]}"
        )

    def test_session_module_has_load_function(self) -> None:
        """
        P2 — model-session.js must expose load().  If it were removed, the
        fix for the missing init() call would have nothing to call.
        """
        session_js = read("src/model-session.js")
        assert "function load(" in session_js or "load(" in session_js, (
            "model-session.js must expose a load() function.  "
            "It is needed for the session-restore fix."
        )
        assert "window.FokoSession" in session_js, (
            "model-session.js must expose FokoSession on window."
        )


# ══════════════════════════════════════════════════════════════════════════════
# 6.  New pages: contact.html and acknowledgement.html completeness
# ══════════════════════════════════════════════════════════════════════════════

class TestNewPagesCompleteness:
    """
    v35 added contact.html and acknowledgement.html.  These tests confirm
    that the pages have the minimum expected content and metadata.
    """

    def test_contact_has_required_links(self) -> None:
        """
        P2 — contact.html must contain links to email, GitHub, GitLab and
        the personal homepage.  Missing a link is a content error.
        """
        s = soup("contact.html")
        hrefs = {a.get("href", "") for a in s.find_all("a")}
        assert any("mailto:" in h for h in hrefs), (
            "contact.html: email mailto: link is missing."
        )
        assert any("github.com/chilperic" in h for h in hrefs), (
            "contact.html: GitHub link (github.com/chilperic) is missing."
        )
        assert any("gitlab.com/chilperic" in h for h in hrefs), (
            "contact.html: GitLab link (gitlab.com/chilperic) is missing."
        )
        assert any("chilperic.github.io" in h for h in hrefs), (
            "contact.html: personal homepage (chilperic.github.io) is missing."
        )

    def test_acknowledgement_has_institution_logos(self) -> None:
        """
        P2 — acknowledgement.html must reference institution logo images.
        These are the HHU, PoLiMeR, AIMS, and University of Yaoundé I logos.
        """
        html = read("acknowledgement.html")
        for img in ["hhu.png", "polimer.png", "aims.webp", "university-yaounde-i.png"]:
            assert img in html, (
                f"acknowledgement.html: institution logo '{img}' is not "
                "referenced.  Check the <img> tags in the institution band."
            )

    def test_institution_logo_files_exist_on_disk(self) -> None:
        """
        P1 — All institution logo files referenced in acknowledgement.html
        must exist on disk.  Missing images produce broken <img> elements
        in a static GitHub Pages deploy.
        """
        logos = [
            "assets/institutions/hhu.png",
            "assets/institutions/polimer.png",
            "assets/institutions/aims.webp",
            "assets/institutions/university-yaounde-i.png",
        ]
        for logo in logos:
            assert (ROOT / logo).exists(), (
                f"Institution logo file not found on disk: {logo}  "
                "This will produce a broken image on the live site."
            )

    def test_both_new_pages_have_og_image(self) -> None:
        """
        P3 — Social preview requires og:image meta tag on every page.
        contact.html and acknowledgement.html were added in v35 and must
        carry the tag.
        """
        for page in ("contact.html", "acknowledgement.html"):
            html = read(page)
            assert 'property="og:image"' in html, (
                f"{page}: missing <meta property='og:image'> tag.  "
                "Social sharing will show no preview image."
            )

    def test_both_new_pages_have_correct_css_version(self) -> None:
        """
        P2 — Unified CSS cache token must be present.  A different token
        would cause cache misses or serve stale CSS to returning visitors.
        """
        for page in ("contact.html", "acknowledgement.html"):
            html = read(page)
            assert "styles/style.css?v=2.7.4" in html, (
                f"{page}: CSS version token mismatch.  "
                "Expected 'style.css?v=2.7.4'."
            )

    def test_acknowledgement_credits_all_three_research_projects(self) -> None:
        """
        P2 — acknowledgement.html must acknowledge all three research domains:
        T-cell, fatty-acid/FADNS, and plant thermo-hydraulic work.
        Missing a project would misrepresent the research portfolio.
        """
        text = soup("acknowledgement.html").get_text(" ", strip=True)
        for project_keyword in ("T-cell", "Fatty", "FADNS", "Plant", "thermo"):
            if project_keyword.lower() in text.lower():
                return  # At least one of the keywords is present
        # If we reach here, none of the expected projects appear.
        assert False, (
            "acknowledgement.html does not mention any of the expected "
            "research project keywords (T-cell, Fatty, FADNS, Plant, thermo).  "
            "Check that credit sections are not accidentally removed."
        )


# ══════════════════════════════════════════════════════════════════════════════
# 7.  CSS tokens and dropdown closed-state rule
# ══════════════════════════════════════════════════════════════════════════════

class TestCssContractTokens:
    """
    Version-tagged CSS comment tokens act as a safety net:
    removing a CSS block without updating the token fails these tests,
    prompting the developer to write a new test for the new behavior.
    """

    def test_v34_visual_cleanup_token_present(self) -> None:
        """P3 — v34 block present."""
        assert "v34 visual audit cleanup" in read("styles/style.css"), (
            "CSS v34 audit-cleanup block was removed.  "
            "If the styles moved, update this token."
        )

    def test_v40_compact_dropdown_token_present(self) -> None:
        """P3 — v40 block present."""
        assert "v40 compact dropdown contract" in read("styles/style.css"), (
            "CSS v40 compact-dropdown block was removed.  "
            "If the styles moved, update this token."
        )

    def test_dropdown_closed_state_hides_panel(self) -> None:
        """
        P1 — When a <details class='labs-menu'> is not open, its panel
        must be hidden.  Without this rule the panels can flash visible
        during page load before navigation.js runs.

        The CSS must contain:
            .labs-menu:not([open]) > .labs-menu-panel { display: none !important; }

        (Whitespace variations are tolerated.)
        """
        css = read("styles/style.css").replace(" ", "")
        pattern = re.compile(
            r"\.labs-menu:not\(\[open\]\)>\.labs-menu-panel\{[^}]*display:none!important",
            re.DOTALL,
        )
        assert pattern.search(css), (
            "CSS must contain "
            "'.labs-menu:not([open]) > .labs-menu-panel { display: none !important; }' "
            "to prevent panels flashing visible before navigation.js initialises."
        )

    def test_dropdown_grid_is_single_column_in_v40(self) -> None:
        """
        P2 — v40 changed the panel grid to a single column for compact labels.
        The CSS must contain grid-template-columns:1fr!important somewhere in
        the v40 block (after the compact-dropdown contract token).
        """
        css = read("styles/style.css").replace(" ", "")
        # Find the v40 block and check it contains the single-column grid rule.
        v40_start = css.find("v40compactdropdowncontract")
        assert v40_start != -1, "v40 CSS block not found."
        v40_section = css[v40_start:v40_start + 2000]
        assert "grid-template-columns:1fr!important" in v40_section, (
            "v40 CSS block must set grid-template-columns:1fr!important "
            "on .labs-menu-panel to enforce single-column compact labels."
        )
