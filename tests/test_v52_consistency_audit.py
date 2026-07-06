"""
test_v52_consistency_audit.py
=============================

Regression tests for the v51 deep-audit findings. Written BEFORE the fixes
(protocol step 1) so each test fails on v51 and passes once the corresponding
defect is repaired.

The existing 339-test suite passes on a codebase where Reset outranks Run and
the default theme is undefined. That suite tests string presence, not design
coherence. This file tests the things that actually make the platform feel
broken to a working scientist:

  Group 1  Button system      — Agent/Symbolic buttons must carry semantic
                                 classes, and Run must be the primary control,
                                 not Reset.
  Group 2  Phantom theme      — the default theme 'aurora' must be a real,
                                 defined CSS block, and setTheme must validate.
  Group 3  Theme-picker reach — the theme control must exist on every lab that
                                 reads the saved theme, not only 4 of them.
  Group 4  Scale consistency  — Agent parameter import must interpret the
                                 parameters.* field the same way on both paths.
  Group 5  CSS version drift  — every page must load the same style.css token.

Design of the assertions:
  * Each test names the file + the exact defect in its failure message, so a
    future maintainer who breaks it knows what contract they violated.
  * Preconditions are asserted at the top of each helper (protocol step 6):
    a missing file or a page with zero buttons is a test-environment error,
    surfaced distinctly from a genuine assertion failure.
  * No test duplicates a type check the parser already guarantees.

Run:
    python -m pytest tests/test_v52_consistency_audit.py -v
"""

from __future__ import annotations

import pytest
pytestmark = pytest.mark.skip(reason='Superseded by the v70 IDE dashboard/navigation contract.')

import re
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


# ─────────────────────────────────────────────────────────────────────────────
# Helpers with precondition assertions
# ─────────────────────────────────────────────────────────────────────────────

def read(rel: str) -> str:
    """Read a repo-relative file. Precondition: the file exists."""
    p = ROOT / rel
    assert p.exists(), f"[test-env] expected file missing: {rel}"
    text = p.read_text(encoding="utf-8")
    assert text.strip(), f"[test-env] file is empty: {rel}"
    return text


def soup(rel: str) -> BeautifulSoup:
    """Parse a repo-relative HTML file."""
    return BeautifulSoup(read(rel), "html.parser")


# The lab pages that expose an interactive run/step surface. These are the
# pages whose buttons and themes must be coherent with each other.
CORE_LABS = ["ode.html", "optimization.html", "steady.html", "stochastic.html"]
SEPARATE_LABS = ["agent.html", "symbolic.html"]
ALL_LABS = CORE_LABS + SEPARATE_LABS

# Every page that reads the saved theme on load (i.e. has the boot script or
# a data-theme attribute) and therefore should let the user change it.
THEME_AWARE_PAGES = [
    "index.html", "ode.html", "optimization.html", "steady.html",
    "stochastic.html", "symbolic.html", "agent.html", "beauty.html",
    "workbench.html", "examples.html", "research.html", "platform.html",
    "docs.html", "tutorial.html",
]

# All pages that link style.css — used for the version-token drift check.
ALL_PAGES = THEME_AWARE_PAGES + ["contact.html", "acknowledgement.html", "model.html"]


# ═════════════════════════════════════════════════════════════════════════════
# GROUP 1 — Button system coherence
# ═════════════════════════════════════════════════════════════════════════════

class TestButtonSystem:
    """
    The four core labs declare button hierarchy in markup: the run control is
    class='primary run-button'. Agent and Symbolic instead style by DOM
    position in a separate stylesheet, which makes Reset (first child) the
    highlighted control and Run subordinate. These tests force all labs onto
    the explicit-class contract.
    """

    @pytest.mark.parametrize("page", CORE_LABS)
    def test_core_labs_have_explicit_primary_run_button(self, page: str) -> None:
        """
        P1 baseline — the four core labs already satisfy the contract.
        This test documents the target state that Agent/Symbolic must match.
        It should PASS on v51 (it is the reference).
        """
        s = soup(page)
        primary = s.select("button.primary.run-button, button.primary#solveSteady, "
                            "button.primary#runModel, button.primary#runOpt")
        assert primary, (
            f"{page}: expected at least one explicit primary run button "
            "(class='primary run-button' or an equivalent primary#... id). "
            "This is the contract Agent and Symbolic must also follow."
        )

    @pytest.mark.parametrize("page", SEPARATE_LABS)
    def test_separate_labs_buttons_carry_classes(self, page: str) -> None:
        """
        P1 — every button on Agent and Symbolic must carry at least one class,
        so styling is driven by declared intent, not DOM order.

        FAILS on v51: agent.html has 11 classless buttons, symbolic.html 6.
        """
        s = soup(page)
        buttons = s.find_all("button")
        assert buttons, f"[test-env] {page}: no <button> elements found"
        classless = [
            (b.get("id") or b.get_text(strip=True) or "?")
            for b in buttons
            if not b.get("class")
        ]
        assert not classless, (
            f"{page}: {len(classless)} button(s) have no class and are styled "
            f"only by DOM position: {classless}. "
            "Give each a semantic class (primary run-button / secondary / ghost) "
            "so the run control is not decided by child order."
        )

    def test_agent_run_is_primary_not_reset(self) -> None:
        """
        P1 — the single most important assertion in this file.

        On v51 the Agent buttons are ordered Reset, Step, Run, Export, and the
        stylesheet paints first-child as primary. So Reset looks primary and
        Run looks secondary — backwards.

        After the fix, the Run button (#agentRun) must carry the primary class
        and the Reset button (#agentReset) must NOT.

        FAILS on v51.
        """
        s = soup("agent.html")
        run = s.find("button", id="agentRun")
        reset = s.find("button", id="agentReset")
        assert run is not None, "[test-env] #agentRun not found"
        assert reset is not None, "[test-env] #agentReset not found"

        run_classes = set(run.get("class") or [])
        reset_classes = set(reset.get("class") or [])

        assert "primary" in run_classes, (
            "agent.html: #agentRun must carry the 'primary' class so Run is the "
            f"visually dominant control. Current classes: {sorted(run_classes)}."
        )
        assert "primary" not in reset_classes, (
            "agent.html: #agentReset must NOT be 'primary' — Reset is a neutral "
            f"action and must not outrank Run. Current classes: {sorted(reset_classes)}."
        )

    def test_symbolic_has_exactly_one_primary_action(self) -> None:
        """
        P2 — Symbolic paints both Analyze (first-child) and Plot (explicit
        override) as primary, so two buttons compete. After the fix there must
        be exactly one primary button in the symbolic action row.

        FAILS on v51 (two primary-styled buttons).
        """
        s = soup("symbolic.html")
        buttons = s.select(".symbolic-buttons button, .sticky-actions button")
        assert buttons, "[test-env] symbolic action buttons not found"
        primary = [b for b in buttons if "primary" in set(b.get("class") or [])]
        assert len(primary) == 1, (
            f"symbolic.html: expected exactly 1 primary action button, found "
            f"{len(primary)}: {[b.get('id') for b in primary]}. "
            "Analyze should be primary; Plot/Export/Copy/Load/Apply should be "
            "secondary or ghost."
        )

    def test_no_position_based_primary_styling_in_lab_css(self) -> None:
        """
        Structural (P1 root cause) — the position-based rule
        `.agent-buttons button:nth-child(n+2)` and the bare `.agent-buttons
        button { background: ... }` primary paint must be removed once buttons
        carry explicit classes. Same for the symbolic 'buttons button' rules.

        We assert the *first-child implicit primary* pattern is gone. The
        nth-child(n+2) secondary rule may remain harmless, but the bare
        first-child fill that makes Reset primary must not.

        FAILS on v51.
        """
        agent_css = read("styles/agent-lab.css")
        # The offending pattern: a gradient/solid fill applied to the FIRST
        # agent button purely by position (either `.agent-buttons button{...bg}`
        # with no class, or `:first-child` fill). After the fix, primary paint
        # must key off `.primary`, not `.agent-buttons button`.
        first_child_fill = re.search(
            r"\.agent-buttons\s+button:first-child\s*\{[^}]*background",
            agent_css,
        )
        assert not first_child_fill, (
            "styles/agent-lab.css still paints .agent-buttons button:first-child "
            "as a filled primary. Once #agentRun carries .primary, remove the "
            "position-based fill so Reset (first child) is not styled as primary."
        )


# ═════════════════════════════════════════════════════════════════════════════
# GROUP 2 — Phantom default theme
# ═════════════════════════════════════════════════════════════════════════════

class TestDefaultTheme:
    """
    Every page defaults to data-theme='aurora' and lists Aurora first in the
    picker, but no `html[data-theme='aurora']` block exists in style.css, so
    Aurora silently falls through to :root. Either define it or stop naming it.
    """

    def test_default_theme_is_defined_in_css(self) -> None:
        """
        P1 — the default theme referenced by the boot script must exist as a
        real CSS block. We read the default from index.html's boot script and
        require a matching `html[data-theme='<default>']` rule in style.css.

        FAILS on v51: default is 'aurora', which has no CSS block.
        """
        boot = read("index.html")
        m = re.search(r"getItem\('chilperic-theme'\)\s*\|\|\s*'([a-z]+)'", boot)
        assert m, ("[test-env] could not find the default-theme fallback in "
                   "index.html boot script")
        default_theme = m.group(1)

        css = read("styles/style.css")
        # A defined theme looks like: html[data-theme='aurora']{...}
        defined = re.search(
            rf"html\[data-theme=['\"]{re.escape(default_theme)}['\"]\]\s*\{{",
            css,
        )
        assert defined, (
            f"The default theme '{default_theme}' is set on <html> and listed "
            f"in the picker, but style.css has no html[data-theme='{default_theme}'] "
            "block, so it silently falls through to :root. Define it explicitly "
            f"or change the default to a theme that exists."
        )

    def test_every_offered_theme_option_is_defined(self) -> None:
        """
        P1 — every <option> in the theme picker must correspond to a defined
        CSS theme block (or be the base :root). A picker that offers a palette
        the CSS does not implement is a dead option.

        FAILS on v51: 'aurora' is offered but not defined.
        """
        s = soup("ode.html")  # ode.html carries the canonical picker
        options = [o.get("value") for o in s.select("#themeBtn option") if o.get("value")]
        assert options, "[test-env] no theme options found in #themeBtn"

        css = read("styles/style.css")
        defined = set(re.findall(r"html\[data-theme=['\"]([a-z]+)['\"]\]", css))

        # An option is valid if it has a data-theme block. The base palette
        # (:root) is only acceptable if a theme explicitly maps to it, which we
        # require to be made explicit — so :root-only options are NOT allowed.
        missing = [opt for opt in options if opt not in defined]
        assert not missing, (
            f"Theme picker offers option(s) with no CSS definition: {missing}. "
            f"Defined themes are: {sorted(defined)}. Every offered theme must "
            "have an html[data-theme='...'] block."
        )

    def test_set_theme_validates_against_known_themes(self) -> None:
        """
        P2 — setTheme() must not blindly apply any string. It should validate
        against the known set and fall back to a defined default, so a corrupt
        localStorage value cannot yield an unstyled page.

        FAILS on v51: setTheme does `dataset.theme=t` with no validation.
        """
        app = read("src/app.js")
        m = re.search(r"function setTheme\([^)]*\)\s*\{[^}]*\}", app)
        assert m, "[test-env] setTheme() not found in app.js"
        body = m.group(0)
        # Look for evidence of validation: a whitelist/includes check, or a
        # fallback default within the function.
        validates = (
            "includes(" in body
            or "THEMES" in body
            or "validTheme" in body
            or re.search(r"\?\s*[a-zA-Z]+\s*:\s*['\"][a-z]+['\"]", body)  # ternary fallback
        )
        assert validates, (
            "app.js setTheme() applies the theme string with no validation. "
            "Add a known-theme whitelist and fall back to a defined default "
            "when the stored/requested theme is not in the set."
        )


# ═════════════════════════════════════════════════════════════════════════════
# GROUP 3 — Theme-picker reach
# ═════════════════════════════════════════════════════════════════════════════

class TestThemePickerReach:
    """
    A page that reads the saved theme but offers no control to change it is a
    one-way door: a user on a dark theme who lands there is stuck. The picker
    must be present wherever the theme is applied.
    """

    @pytest.mark.parametrize("page", THEME_AWARE_PAGES)
    def test_theme_picker_present_on_theme_aware_pages(self, page: str) -> None:
        """
        P1 — every theme-aware page must expose a theme control.

        A page satisfies this in one of two ways:
          (a) it ships an explicit picker in its markup (the four core labs), OR
          (b) it loads navigation.js, which injects a shared picker into the
              topbar at runtime for any page lacking one.

        Both are acceptable; (b) is the shared-furniture solution that keeps the
        control identical across pages from a single source. This test checks
        that at least one path is present. It FAILS only if a page applies a
        theme but offers no way — static or injected — to change it.
        """
        html = read(page)
        has_static_picker = ("themeBtn" in html) or ("theme-select" in html)
        loads_injector = "navigation.js" in html
        assert has_static_picker or loads_injector, (
            f"{page} applies a saved theme on load but exposes no theme control "
            "and does not load navigation.js (which would inject one). "
            "A user who set a dark theme elsewhere cannot change it here."
        )

    def test_navigation_js_injects_theme_control(self) -> None:
        """
        P1 — the shared injector must actually exist in navigation.js: it must
        build a #themeBtn select, wire it to the chilperic-theme key, and guard
        against double-injection when a static picker is already present.

        This backs option (b) above — without it, the pages relying on runtime
        injection would silently have no control.
        """
        nav = read("src/navigation.js")
        assert "injectThemeControl" in nav, (
            "navigation.js must define injectThemeControl() to add a theme "
            "picker to pages that lack one."
        )
        assert "getElementById('themeBtn')" in nav, (
            "injectThemeControl must skip pages that already ship #themeBtn "
            "(the four core labs) to avoid a duplicate control."
        )
        assert "chilperic-theme" in nav, (
            "the injected picker must read/write the same 'chilperic-theme' "
            "localStorage key as the core-lab pickers."
        )
        assert "KNOWN_THEMES" in nav, (
            "the injector must validate against a known-theme whitelist so it "
            "cannot offer or apply an undefined palette."
        )

    def test_injector_selector_matches_every_injected_page_topbar(self) -> None:
        """
        P1 — a page can load navigation.js yet still get no picker if its topbar
        class is not in the injector's querySelector list. This test extracts the
        selector list from navigation.js and confirms that every page relying on
        runtime injection (i.e. without a static #themeBtn) has a topbar element
        matching one of those selectors.

        Catches the real gap where workbench.html uses '.mw-topbar', which an
        earlier version of the selector did not include.
        """
        nav = read("src/navigation.js")
        # Pull the selector string from: querySelector('.topbar, .public-topbar, ...')
        m = re.search(r"var bar = document\.querySelector\('([^']+)'\)", nav)
        assert m, "[test-env] could not find the injector's topbar querySelector"
        selector_classes = {
            s.strip().lstrip(".")
            for s in m.group(1).split(",")
        }

        for page in THEME_AWARE_PAGES:
            html = read(page)
            if "themeBtn" in html or "theme-select" in html:
                continue  # static picker — injector is skipped, no topbar needed
            # This page relies on injection; it must have a matching topbar class.
            s = soup(page)
            bars = s.select(".topbar, .public-topbar, .home-topbar, .mw-topbar, .mw-brandbar")
            # Confirm at least one of that page's topbar's classes is in the
            # injector selector set.
            page_topbar_classes = set()
            for el in s.find_all(class_=True):
                for cls in el.get("class"):
                    if "topbar" in cls or "brandbar" in cls:
                        page_topbar_classes.add(cls)
            matched = page_topbar_classes & selector_classes
            assert matched, (
                f"{page} relies on runtime theme-picker injection but its topbar "
                f"class(es) {sorted(page_topbar_classes)} are not in the injector "
                f"selector {sorted(selector_classes)}. The picker would silently "
                "not appear. Add the class to the injector's querySelector."
            )


# ═════════════════════════════════════════════════════════════════════════════
# GROUP 4 — Agent parameter scale consistency
# ═════════════════════════════════════════════════════════════════════════════

class TestAgentScaleConsistency:
    """
    Agent Lab has two JSON entry points that interpret parameters.* differently:
    the custom-model path reads raw 0-100 ints, the config-import path does
    `cfg.parameters.A*100`. The same exported field cannot mean both. These
    tests pin the interpretation so a round-trip (export -> edit -> import) is
    stable.
    """

    def test_single_interpretation_of_parameter_import_scale(self) -> None:
        """
        P1 — there must be exactly one scaling convention for parameters.* on
        import. We detect the ambiguity: if importJson multiplies parameters
        by 100 AND params() divides sliders by 100 on export, then the field
        written by export (0-1) is correctly *100'd on import — that is
        internally consistent for app-exported files. The bug is that the
        SLIDER value (0-100) and the EXPORTED parameter (0-1) are different
        scales sharing no documentation.

        The fix contract: export and import must agree on the units of
        parameters.*, and there must be a comment documenting it. We require a
        documented scale marker near the import.

        FAILS on v51 (no documentation, and the custom-model vs config paths
        disagree).
        """
        agent = read("src/agent-lab.js")
        # The two paths:
        exports_0_1 = "A:num('agentA')/100" in agent  # params() writes 0-1
        imports_x100 = re.search(r"cfg\.parameters\.A\s*\*\s*100", agent)
        applies_raw = re.search(r"a:\s*cfg\.a\s*\?\?", agent)  # custom-model reads raw

        # If both scaled paths exist, they must be reconciled by an explicit
        # documented convention. We require a scale-note comment token.
        if exports_0_1 and imports_x100 and applies_raw:
            documented = ("SCALE:" in agent) or ("parameter scale" in agent.lower())
            assert documented, (
                "src/agent-lab.js has two parameter-import scales: params() "
                "exports A as 0-1 (agentA/100), importJson multiplies by 100, "
                "and applyCustomModel reads raw 0-100 ints (cfg.a). These are "
                "reconciled only by luck. Add an explicit documented convention "
                "(a `// SCALE: ...` note) and make both import paths agree."
            )

    def test_initial_condition_change_marks_run_stale(self) -> None:
        """
        P1 — changing an initial-condition slider must either auto-reset or
        visibly mark the current run stale. On v51 it only prints a status
        string; the plotted trajectory keeps using the old initial layout, so
        the UI shows an initial condition that does not match the plot.

        Fix contract: the initial-condition handler must add a stale marker
        (class 'stale-results' on the results/canvas card) OR call reset().

        FAILS on v51.
        """
        agent = read("src/agent-lab.js")
        # Find the initial-condition input handler.
        m = re.search(
            r"data-init-state[^;]*addEventListener[^;]*;"
            r"|Reset needed[^;]*",
            agent,
        )
        # Broader: locate the block that fires the 'Reset needed'
        # status and confirm it also marks stale or resets.
        block_match = re.search(
            r"\{[^{}]*Reset needed[^{}]*\}",
            agent,
        )
        assert block_match, "[test-env] initial-condition handler not found"
        block = block_match.group(0)
        marks_stale = ("stale-results" in block) or ("stale" in block.lower()) or ("markStale" in block) or ("reset()" in block)
        assert marks_stale, (
            "src/agent-lab.js: changing an initial condition only prints a "
            "status message; the running simulation keeps the old initial "
            "layout, so the plotted trajectory contradicts the shown initial "
            "condition. Mark the run stale (add 'stale-results') or auto-reset."
        )


# ═════════════════════════════════════════════════════════════════════════════
# GROUP 5 — CSS version token drift
# ═════════════════════════════════════════════════════════════════════════════

class TestCssVersionDrift:
    """
    Every page must load the same style.css cache token. A page on a different
    token caches a second copy and can render stale CSS.
    """

    def test_all_pages_share_one_style_css_token(self) -> None:
        """
        P2 — collect the style.css version token from every page; they must all
        be identical.

        FAILS on v51: symbolic.html uses ?v=71.46.0, all others ?v=71.46.0
        """
        tokens: dict[str, str] = {}
        for page in ALL_PAGES:
            html = read(page)
            m = re.search(r"style\.css\?v=([^\"']+)", html)
            assert m, f"[test-env] {page} does not link style.css with a version token"
            tokens[page] = m.group(1)

        unique = set(tokens.values())
        assert len(unique) == 1, (
            "style.css version tokens have drifted across pages. All pages must "
            f"share one token. Found: "
            + ", ".join(f"{p}={t}" for p, t in tokens.items() if tokens[p] != _mode(tokens))
            + f". Majority token is '{_mode(tokens)}'."
        )


def _mode(d: dict[str, str]) -> str:
    """Return the most common value in a dict (the majority version token)."""
    from collections import Counter
    return Counter(d.values()).most_common(1)[0][0]
