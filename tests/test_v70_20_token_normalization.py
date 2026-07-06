from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TOKEN='71.46.0'

def test_v70_20_single_cache_token_tree_wide():
    tokens = {}
    for path in ROOT.rglob('*'):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {'.html','.css','.js','.md','.py','.json','.svg','.txt'}:
            continue
        text = path.read_text(encoding='utf-8', errors='ignore')
        found = re.findall(r'\?v=([A-Za-z0-9._-]+)', text)
        if found:
            tokens[str(path.relative_to(ROOT))] = found
    assert tokens, 'No cache tokens found'
    unique = {token for values in tokens.values() for token in values}
    assert unique == {TOKEN}, unique

def test_v70_20_no_legacy_cache_tokens_remain():
    legacy = ['70.13.0','70.19.0','70.11.0','70.10.0','70.15.0','70.7.0','2.7.5','3.2.0','2.7.4']
    for path in ROOT.rglob('*'):
        if path.is_file() and path.suffix.lower() in {'.html','.css','.js','.md','.py','.json','.svg','.txt'}:
            text = path.read_text(encoding='utf-8', errors='ignore')
            for token in legacy:
                assert ('?v=' + token) not in text, path
