from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding='utf-8')

def test_upload_audit_release_notes_removed_from_public_root():
    assert not (ROOT / 'UPLOAD-AUDIT-v23.md').exists()

def test_upload_readiness_core_files_exist():
    for path in ['index.html','workbench.html','ode.html','symbolic.html','agent.html','docs.html','tutorial.html']:
        assert (ROOT/path).exists()
