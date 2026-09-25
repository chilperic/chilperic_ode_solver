"""Package the complete author tree and the public-only website separately."""
from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[1];DEST=ROOT.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
items=[('FokoLab-79.2.0-Updated-Package.zip',ROOT,ROOT.name),('FokoLab-79.2.0-Public-Site.zip',ROOT/'site','')]
records=[]
for name,source,prefix in items:
 target=DEST/name
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p in sorted(source.rglob('*')):
   if p.is_file() and '__pycache__' not in p.parts:
    relative=p.relative_to(source).as_posix();z.write(p,arcname=prefix+'/'+relative if prefix else relative)
 with zipfile.ZipFile(target) as z:
  assert z.testzip() is None
  names=z.namelist();assert (prefix+'/site/index.html' if prefix else 'index.html') in names
  if not prefix:assert not any(n.startswith(('private-reference/','rollback/')) for n in names);assert 'materials/Scientific_Mastery_V6_17_Design_Revision.pdf' not in names
 records.append({'file':name,'bytes':target.stat().st_size,'sha256':sha(target),'files':len(names),'publication':'complete author package' if prefix else 'public site only'})
(DEST/'FokoLab-79.2.0-Checksums.txt').write_text('\n'.join(x['sha256']+'  '+x['file'] for x in records)+'\n')
(DEST/'FokoLab-79.2.0-Package-Manifest.json').write_text(json.dumps(records,indent=2))
print(json.dumps(records,indent=2))
