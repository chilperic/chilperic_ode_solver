"""Create release-scoped evidence and reproducible byte manifests for the current tree."""
from __future__ import annotations
from pathlib import Path
import json,hashlib,datetime,platform,subprocess,importlib.metadata
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'site';EV=ROOT/'evidence'
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(name):return json.loads((EV/name).read_text())
def suite(name,file,key='results'):
 d=read(file);rows=d[key];failed=[x for x in rows if x.get('status')=='failed'];passed=[x for x in rows if x.get('status')=='passed'];assert len(rows)==len(failed)+len(passed),(file,'ambiguous results');assert not failed,(file,failed)
 return {'name':name,'passed':len(passed),'failed':len(failed),'evidenceFile':'evidence/'+file,'scope':d.get('scope','See the individual result records.')}
suites=[suite('Retained numerical methods and resource/run-state contracts','preservation-regression.json'),suite('Every registered additive example','additive-smoke.json'),suite('Native Python versus JavaScript reference comparisons','python-comparison.json'),suite('Controlled browser workflows and source loading','browser-regression.json'),suite('Additional browser/mobile/fallback checks','browser-edges.json'),suite('Real loopback HTTP assets and public/private boundary','http-package.json'),suite('Public PDF source preservation','publication-check.json','checks')]
replay=read('browser-export-replay.json');assert replay['status']=='passed';suites.append({'name':'Actual browser-downloaded native Python replay','passed':1,'failed':0,'scope':replay['scope'],'evidenceFile':'evidence/browser-export-replay.json'})
# Byte identity of the application is not defined by timestamps or historical release labels.
excluded={'release-evidence.json','preservation.json','build-manifest.json'}
files=[]
for p in sorted(SITE.rglob('*')):
 if p.is_file() and p.relative_to(SITE).as_posix() not in excluded:files.append({'path':p.relative_to(SITE).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())})
build=sha(json.dumps(files,sort_keys=True,separators=(',',':')).encode());created=datetime.datetime.now(datetime.timezone.utc).isoformat()
manifest={'release':'79.2.0','applicationBuildSHA256':build,'hashDefinition':'SHA256 of compact sorted-key JSON of the ordered files array. Generated evidence and this manifest are excluded to avoid recursive hashes.','files':files}
(SITE/'build-manifest.json').write_text(json.dumps(manifest,indent=2));(EV/'build-manifest.json').write_text(json.dumps(manifest,indent=2))
preservation=read('preservation.json');environment={'Python':platform.python_version(),'Node':subprocess.check_output(['node','--version'],text=True).strip(),'Chromium':subprocess.check_output(['/usr/bin/chromium','--version'],text=True).strip()}
for name in ['numpy','scipy','matplotlib','playwright','PyMuPDF']:
 try:environment[name]=importlib.metadata.version(name)
 except importlib.metadata.PackageNotFoundError:pass
report={'release':'79.2.0','name':'FokoLab 79.2.0 Integrated Update','applicationBuildSHA256':build,'generatedAt':created,'deployment':'Not deployed. The existing hosted website is unchanged.','baseline':'Actual user-supplied 79.1 Pages archive; not inaccessible newer hosted source.','inventory':read('inventory.json')['counts'],'preservation':{k:preservation[k] for k in ['baselineArchiveSHA256','identityFilesChecked','identityFilesUnchanged','originalCoreFiles','originalCoreFilesUnchanged','originalAppAndModelDefinitionsUnchanged','numericalCorrection']},'executedSuites':suites,'notAnIndependentGrandTotal':'The suites overlap. Counts identify executed checks, not independent scientific validations.','blocked':[{'check':'Native browser address navigation in the authoring environment','reason':'ERR_BLOCKED_BY_ADMINISTRATOR. Local-source controlled fixtures used instead; real HTTP serving tested separately.'}],'notRun':['Live deployment and original hosted-site modification','Real-device mobile tests','Safari and Firefox compatibility','Persistence across a full browser restart','Exhaustive verification of every original example and method combination','Empirical validation of the newly authored teaching reductions','Human unfamiliar-user study and formal accessibility-conformance audit','Reconciliation against unavailable full research implementations'],'scientificLimits':['Original public FADNS/metabolism equations are retained, not certified as complete calibrated research. The bistability/uniqueness source comparison remains unresolved.','New plant/leaf/adaptation/T-cell reductions have their explicit model scopes in the interface. Colored pathway landmarks are not empirical boundaries.','Independent Python agreement verifies the declared calculations, not observational adequacy or every stochastic inference.'],'publication':json.loads((SITE/'materials/publication-status.json').read_text()),'environment':environment,'runInYourBrowser':'verify.html'}
(EV/'release-evidence.json').write_text(json.dumps(report,indent=2));(SITE/'release-evidence.json').write_text(json.dumps(report,indent=2));print('Build:',build);print('Executed suites:',[(s['name'],s['passed'])for s in suites])
# Runtime source completeness and obvious placeholder audit.
assert 'Evidence aggregation in progress' not in (SITE/'release-evidence.json').read_text()
assert not any(p.suffix.lower() in {'.ttf','.otf','.woff','.woff2','.eot'} for p in SITE.rglob('*'))
