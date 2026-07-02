from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def test_v9_release_notes_removed_from_public_root_and_cache_bust_exist():
    assert not any(ROOT.glob('RELEASE-NOTES*.md'))
    assert 'style.css?v=2.7.4' in (ROOT / 'index.html').read_text(encoding='utf-8')
