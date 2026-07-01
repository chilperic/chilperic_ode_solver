from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def test_v9_release_notes_moved_to_dev_and_cache_bust_exist():
    assert (ROOT / 'dev' / 'release-notes' / 'RELEASE-NOTES-platform-stability-v9.md').exists()
    assert not (ROOT / 'RELEASE-NOTES-platform-stability-v9.md').exists()
    assert 'style.css?v=2.7.4' in (ROOT / 'index.html').read_text(encoding='utf-8')
