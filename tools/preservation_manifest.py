"""Compare the actual deployment tree to the supplied rollback ZIP, not release labels."""
from pathlib import Path
import hashlib,zipfile,json,datetime
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'site'
sha=lambda b:hashlib.sha256(b).hexdigest()
archive=ROOT/'rollback/FokoLab-79.1-original.zip'
with zipfile.ZipFile(archive) as z:
 entries=[i for i in z.infolist() if not i.is_dir()]
 # The supplied Pages archive is flat at its top level.
 prefix=next((i.filename[:-len('src/app.js')] for i in entries if i.filename.endswith('src/app.js')),'')
 records=[]
 for info in entries:
  name=info.filename[len(prefix):];p=SITE/name;old=sha(z.read(info));new=sha(p.read_bytes()) if p.is_file() else None
  records.append({'path':name,'baselineSHA256':old,'currentSHA256':new,'status':'unchanged' if old==new else 'modified' if new else 'outside-public-tree'})
 original_cat=z.read(prefix+'src/models/scientific-example-catalog.js').decode()
 current_cat=(SITE/'src/models/scientific-example-catalog.js').read_text()
 assert current_cat.startswith(original_cat), 'Original catalogue source was not retained as prefix.'
core=[r for r in records if r['path'].startswith('src/core/')];brand=[r for r in records if r['path'].startswith(('assets/brand/','assets/lab-logos/')) or r['path']=='favicon.ico']
assert all(r['status']=='unchanged' for r in brand),'Identity assets changed'
assert all(r['status']=='unchanged' for r in core if r['path']!='src/core/statistics.js'),'Unexpected core replacement'
assert next(r for r in records if r['path']=='src/app.js')['status']=='unchanged','Original model equations changed'
inv=json.loads((ROOT/'evidence/inventory.json').read_text())['counts']
result={'release':'79.2.0','generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baselineArchiveSHA256':sha(archive.read_bytes()),'baselineMeaning':'Supplied 79.1 Pages application, not the inaccessible newer hosted source.','counts':inv,'identityFilesChecked':len(brand),'identityFilesUnchanged':len(brand),'originalCoreFiles':len(core),'originalCoreFilesUnchanged':sum(r['status']=='unchanged' for r in core),'numericalCorrection':{'path':'src/core/statistics.js','change':'ROC ties are aggregated at one threshold; average precision includes the first recall jump; invalid or single-class inputs are refused.','evidence':'evidence/pre-fix-roc-regression.log and evidence/preservation-regression.json'},'originalAppAndModelDefinitionsUnchanged':True,'files':records,'omissionMeaning':'Original root author/release documents are held in docs/baseline-* and the rollback archive. The private PDF is held in private-reference/. Public scientific PDF is a page-number-preserving derivative.'}
(ROOT/'evidence/preservation.json').write_text(json.dumps(result,indent=2))
(SITE/'preservation.json').write_text(json.dumps(result,indent=2))
print('Identity:',len(brand),'unchanged; original core:',len(core),'unchanged:',sum(r['status']=='unchanged' for r in core))
