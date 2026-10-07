from pathlib import Path
import hashlib,json,re
s=Path('site');m=json.loads((s/'science-80.7.json').read_text())
for e in m['renderers']:
    assert hashlib.sha256((s/e['file']).read_bytes()).hexdigest()==e['sha256'],e['file']
    if e['file'].startswith(('plants/','leaf/')):assert e['unchangedFrom803'],e['file']
for f in ['plants/index.html','leaf/index.html','continuum/index.html','continuum/advanced.html','continuum/approaches.html']:
    text=(s/f).read_text()
    assert not re.search(r'<math|id=["\'](?:equations|advancedMethods)["\']',text),f
    assert 'remote-client.js' in text,f
for f in ['plants/plant-engine.js','plants/c4-engine.js','plants/scenario-engine.js','leaf/leaf-engine.js','leaf/leaf-updated.js','leaf/presets.json','continuum/advanced-engine.js','continuum/engine.js','continuum/approaches.js','shared/soil-thermal.js']:
    assert not (s/f).exists(),f
for f in s.rglob('*'):
    if f.is_file():assert f.read_bytes()==(Path('docs')/f.relative_to(s)).read_bytes(),str(f)
a=json.loads((s/'design/examples.json').read_text());assert len(a['plants'])==18 and len(a['leaf'])==18
assert 'research-2026.js' in (s/'research.html').read_text()
assert 'Muller-Prokob' in (s/'contributors.json').read_text()
assert 'ensemble.js' in (s/'continuum/advanced.html').read_text()
assert 'objectiveStatement' in (s/'continuum/advanced.html').read_text()
assert m['replicates']['maximum']==1000
print('Preserved plant/leaf renderers and updated evolution figures, protected pages, examples, Research Hub, acknowledgements and public mirrors passed.')
