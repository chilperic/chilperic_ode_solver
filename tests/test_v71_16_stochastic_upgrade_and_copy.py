from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def test_analysis_pages_do_not_expose_internal_shell_noise():
    for page in ["statistics.html", "linear-algebra.html", "fitting.html", "networks.html", "ml.html"]:
        text = read(page)
        hero = text.split('<section class="analysis-hero compact">', 1)[1].split('</section>', 1)[0]
        assert "Descriptor-driven" not in hero
        assert "scientific engine is loaded" not in hero
        assert "layout is owned" not in hero
        assert any(word in hero.lower() for word in ["plot", "plots", "examples", "diagnostic", "regression", "matrix"])


def test_stochastic_method_controls_are_present():
    text = read("stochastic.html")
    assert 'id="methodInput"' in text
    assert 'value="gillespie"' in text
    assert 'value="tau-leaping"' in text
    assert 'value="euler-maruyama"' in text
    assert 'id="tauInput"' in text
    assert 'id="sdeSigmaInput"' in text


def test_stochastic_engine_contains_approximation_methods_and_bands():
    text = read("src/stochastic/stochastic-lab.js")
    for token in [
        "runTauLeapingCTMC",
        "runEulerMaruyamaCTMC",
        "poissonSample",
        "normalSample",
        "5% quantile",
        "95% quantile",
        "Tau-leaping is approximate",
        "Euler–Maruyama is a continuous-noise approximation",
    ]:
        assert token in text


def test_cache_token_is_v71_16():
    for page in ["index.html", "stochastic.html", "statistics.html"]:
        text = read(page)
        assert "?v=71.46.0" in text
        assert ("?v=" + "71.15.0") not in text
