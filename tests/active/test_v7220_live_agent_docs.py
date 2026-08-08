from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding='utf-8')


def test_public_documents_are_user_facing_and_maintenance_is_separate():
    guide = read('USER_GUIDE.md')
    tutorials = read('TUTORIALS.md')
    roadmap = read('PLATFORM_TODO.md')
    assert guide.startswith('# Foko Lab modeling handbook')
    assert tutorials.startswith('# Foko Lab modeling curriculum')
    assert roadmap.startswith('# Maintainer roadmap')
    assert 'P0.1 — Kill' not in roadmap
    assert 'Source documents:' not in read('docs.html')
    assert 'PLATFORM_TODO.md' not in read('docs.html')
    assert 'PLATFORM_TODO.md' not in read('tutorial.html')


def test_agent_live_claims_match_incremental_runtime_contract():
    guide = read('USER_GUIDE.md')
    tutorials = read('TUTORIALS.md')
    capabilities = json.loads(read('CAPABILITIES.json'))['labs']['agent']['capabilities']
    assert 'one representative computed realization' in guide
    assert 'Each visible frame is computed before it is displayed' in tutorials
    assert 'the animation is still one run' in tutorials
    assert capabilities['incremental_paced_numerical_runner'] == 'browser-computed'
    assert capabilities['live_pause_resume_control'] == 'browser-computed'


def test_public_help_links_only_user_help_surfaces():
    docs = read('docs.html')
    tutorial = read('tutorial.html')
    for html in (docs, tutorial):
        assert 'href="docs.html"' in html
        assert 'href="tutorial.html"' in html
        assert 'href="trust.html"' in html
        assert 'USER_GUIDE.md' not in html
        assert 'TUTORIALS.md' not in html
        assert 'PLATFORM_TODO.md' not in html
