"""Assemble the authored 80.2 release; reject changed baselines and preserve CVs."""
from pathlib import Path
import hashlib,json,shutil,subprocess
ROOT=Path('.').resolve(); SITE=ROOT/'site'; PAYLOAD=ROOT/'deployment/802'
def digest(data):return hashlib.sha256(data).hexdigest()
def blob(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def safe(rel):
 p=(SITE/rel).resolve();assert p.is_relative_to(SITE) and not p.is_symlink(),rel
 assert not rel.startswith(('cv/','assets/cv/')) and rel!='cv.html','Protected CV: '+rel
 return p
parts={
 'analysis-studio.html':(['002','003'],'939bd68ee059c2783a942f2d6b61d9ec3667b13d'),
 'src/analysis-studio/plots.mjs':(['011','012'],'6478fc338077e921b762ed8113717404a5c243a2'),
 'src/analysis-studio/reproduce.py':(['013','014'],'d4e3e77a4979c38f41b23696218ed0bc9431d3e5'),
 'src/analysis-studio/statistics.mjs':(['015','016','017'],'170be1a5bbb4e2111a6d1ebb4a1811cabf4ecabe'),
 'src/analysis-studio/ui.mjs':(['018','019','020'],'0fb7859d82c6fad139b726e6e8680c9373614eea')}
# Keep the merged, source-verified photo and no-photo editions byte-identical.
cv_manifest=json.loads((SITE/'cv/downloads.json').read_text());assert len(cv_manifest['editions'])==6
for r in cv_manifest['editions']:
 data=(SITE/'cv'/(r['id']+'.pdf')).read_bytes();assert data.startswith(b'%PDF') and digest(data)==r['pdf_sha256'],r['id']
protected=[SITE/'cv.html',*[p for folder in ('cv','assets/cv') for p in (SITE/folder).rglob('*') if p.is_file()]]
cv_before={str(p.relative_to(SITE)):digest(p.read_bytes()) for p in protected}
changes={}
for rel,(ids,expected) in parts.items():
 data=b''.join((PAYLOAD/'parts'/(i+'.txt')).read_bytes() for i in ids)
 assert blob(data)==expected,f'Fragment assembly mismatch: {rel}'
 changes[rel]=data
# This registry duplicates contributors.json exactly, using its original serializer.
registry=json.loads((SITE/'contributors.json').read_text())
prefix="(function(r){'use strict';const d=r.document;if(!d)return;const base=new URL('../../',d.currentScript.src);r.FokoContributorRegistry="
tail="""function init(){let key=d.body.dataset.lab||d.body.dataset.dynamicsLab||'';const path=location.pathname;if(/plants|plant-growth|leaf|adaptation|continuum|photosynthesis/.test(path))key='plants';else if(/lipid|fatty-acid/.test(path))key='lipids';else if(/tcell/.test(path))key='tcells';if(!r.FokoContributorRegistry.projects[key]||d.querySelector('.lab-contributors'))return;const p=r.FokoContributorRegistry.projects[key],box=d.createElement('details');box.className='lab-contributors';const title=d.createElement('summary');title.textContent='Contributors & scientific sources';box.append(title);const text=d.createElement('p');text.textContent=p.people.map(x=>x.name+' — '+x.role).join('; ')+'. '+p.institutions.join('; ')+'.';const a=d.createElement('a');a.href=new URL('contributors.html#'+key,base);a.textContent='Complete acknowledgments, references and contribution scope';box.append(text,a);d.querySelector('main')?.append(box);}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();})(globalThis);"""
data=(prefix+json.dumps(registry,ensure_ascii=False)+';\n'+tail).encode()
assert blob(data)=='5f9e4d1f9372bd48038f8a500818a8bad3dff805','Contributor registry serialization mismatch'
changes['src/revision82/contributors.js']=data
patches=[]
for path in sorted((PAYLOAD/'patches').glob('*.json')):patches.extend(json.loads(path.read_text()))
assert len(patches)==77 and len({p['path'] for p in patches})==77,'Incomplete patch set'
for patch in patches:
 path=safe(patch['path']);raw=path.read_bytes();assert digest(raw)==patch['before'],'Baseline changed: '+patch['path']
 old=raw.decode();chunks=[]
 for op in patch['ops']:
  if isinstance(op,str):chunks.append(op)
  else:
   assert len(op)==2 and all(type(v)==int for v in op) and 0<=op[0]<=op[1]<=len(old)
   chunks.append(old[op[0]:op[1]])
 out=''.join(chunks).encode();assert digest(out)==patch['after'],'Patch mismatch: '+patch['path']
 changes[patch['path']]=out
expected=json.loads((PAYLOAD/'new-files.json').read_text())
assert len(expected)==22
for r in expected:
 data=changes.get(r['path'])
 if data is None:data=safe(r['path']).read_bytes()
 assert blob(data)==r['sha'],f"New file mismatch: {r['path']} ({blob(data)})"
# Write only after validating the complete authored update.
for rel,data in changes.items():path=safe(rel);path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
assert cv_before=={str(p.relative_to(SITE)):digest(p.read_bytes()) for p in protected},'CV content changed'
v=json.loads((SITE/'VERSION.json').read_text());assert v['version']=='80.2.0'
v.pop('deployment',None);v['distribution']='GitHub Pages';v['updated']='2026-10-05';v['verification']='deployment-verification.json'
(SITE/'VERSION.json').write_text(json.dumps(v,indent=2)+'\n')
record={'release':'80.2.0','updated':'2026-10-05','authored_changes':77,'new_files':22,'protected_cv_editions':6,'protected_cv_hashes':cv_before,'source_package_sha256':'dbfb1d9ea6b1cfefba481d2087afafd7248f52c418a6aa4f86ab775e7e2e5b7b','baseline_commit':'39810f18526ea7eed1b02c3a30fffaddad490b57','scope':'Exact authored application text restored, then publication metadata updated. This is source verification, not biological validation.','authored_expected':patches,'new_expected':expected}
(SITE/'deployment-source-manifest.json').write_text(json.dumps(record,indent=2,ensure_ascii=False))
for rel in set(changes)|{r['path'] for r in expected}:
 if rel.endswith(('.js','.mjs')):subprocess.run(['node','--check',str(SITE/rel)],check=True)
compile((SITE/'src/analysis-studio/reproduce.py').read_text(),'reproduce.py','exec')
shutil.copytree(SITE,ROOT/'docs',dirs_exist_ok=True)
print('ASSEMBLY_OK: 77 authored changes, 22 new files, six CV editions preserved; syntax checked.')
