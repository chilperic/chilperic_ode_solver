"""
v70.18 — Analysis-lab engine consistency contract.
==================================================

Every analysis lab must meet the SAME professional standard set by the
Statistics engine, so the platform is internally consistent:

  1. a pure, Node-exported numeric core (module.exports) that can be unit
     tested outside the browser;
  2. a Foko* global for the browser UI;
  3. precondition assertions (guards that throw) so bad input fails loudly
     instead of returning silent NaN / garbage;
  4. a heavily-commented Node unit test under tests/js/.

Numeric correctness itself is proven by those Node tests
(tests/js/*-core.test.js). This file guards the consistency of the *contract*.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ENGINES = {
    "statistics": ("src/core/statistics.js", "FokoStatistics", "tests/js/statistics-core.test.js"),
    "linear algebra": ("src/core/linalg.js", "FokoLinearAlgebra", "tests/js/linalg-core.test.js"),
    "curve fitting": ("src/core/fitting.js", "FokoFitting", "tests/js/fitting-core.test.js"),
    "networks": ("src/core/networks.js", "FokoNetworks", "tests/js/networks-core.test.js"),
    "ml": ("src/core/ml-lite.js", "FokoMLLite", "tests/js/ml-core.test.js"),
}


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def test_every_engine_is_node_exported_and_has_a_global():
    for name, (src, glob, _t) in ENGINES.items():
        js = read(src)
        assert "module.exports" in js, f"{name}: engine is not Node-exported"
        assert glob in js, f"{name}: missing {glob} browser global"


def test_every_engine_has_precondition_guards():
    # consistency: no engine may silently accept malformed input.
    for name, (src, _g, _t) in ENGINES.items():
        js = read(src)
        assert js.count("throw new Error") >= 2, \
            f"{name}: engine lacks precondition assertions"


def test_every_engine_has_a_node_unit_test():
    for name, (_s, _g, test) in ENGINES.items():
        p = ROOT / test
        assert p.exists(), f"{name}: missing Node unit test {test}"
        t = p.read_text(encoding="utf-8")
        # each test must check both correctness and preconditions (throws)
        assert "throws(" in t, f"{name}: test does not check preconditions"


def test_changed_engines_are_cache_busted():
    # the four engines edited this release must move their token forward so
    # deployed clients fetch the guarded versions.
    for page, asset in [("linear-algebra.html", "linalg.js"),
                        ("fitting.html", "fitting.js"),
                        ("networks.html", "networks.js"),
                        ("ml.html", "ml-lite.js")]:
        html = read(page)
        assert f"{asset}?v=71.46.0" in html, f"{page}: {asset} not bumped to 71.3.0"
