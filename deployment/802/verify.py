"""Release acceptance checks; not biological calibration or WCAG certification."""
from pathlib import Path
import argparse,concurrent.futures,functools,hashlib,http.server,json,os,subprocess,sys,threading,time,urllib.request
import numpy as np
ROOT=Path('.').resolve();SITE=ROOT/'site';OUT=ROOT/'evidence/deployment-80.2';OUT.mkdir(parents=True,exist_ok=True)
cases=json.loads((OUT/'cases.json').read_text());checks=[]
def close(label,a,b):
 np.testing.assert_allclose(a,b,rtol=3e-8,atol=3e-10,err_msg=label);checks.append(label)
def native():
 template=(SITE/'src/analysis-studio/reproduce.py').read_text()
 for case in cases:
  m=case['analysis']['method'];folder=OUT/'python'/m;folder.mkdir(parents=True,exist_ok=True)
  script=folder/'reproduce.py';literal=json.dumps(json.dumps(case['request'],ensure_ascii=False),ensure_ascii=False)
  script.write_text(template.replace('__PAYLOAD_LITERAL__',literal));run=subprocess.run([sys.executable,str(script)],cwd=folder,capture_output=True,env={**os.environ,'MPLBACKEND':'Agg'},timeout=60)
  (folder/'execution.log').write_bytes(run.stdout+run.stderr);assert run.returncode==0,(m,run.stderr.decode()[-2000:])
  py=json.loads((folder/'fokolab_python_result.json').read_text())['result'];js=case['analysis']['result']
  if m=='block-bootstrap':js=js['bootstrap']
  for k in ('estimate','mean','median','sd','p','r','se','df','F','df1','df2','H','ci','meanCI','r2','area','perGroup','fisherP','riskDifference','riskDifferenceCI','logOddsRatioCI','interval'):
   if not (m=='regression' and k=='p') and k in py and k in js and py[k] is not None and js[k] is not None:close(m+':'+k,py[k],js[k])
  if m=='regression':
   for pk,jk in [('coefficients','estimate'),('se','se'),('p','p'),('ci','ci')]:close(m+':'+pk,py[pk],[r[jk] for r in js['coefficients']])
  if m in ('welch-anova','kruskal'):
   for i,(a,b) in enumerate(zip(py['comparisons'],js['comparisons'])):close(m+f':contrast-{i}',a['pAdjusted'],b['pAdjusted'])
  if m=='endpoints':
   for a,b in zip(py['effects'],js['effects']):close(m+':'+a['endpoint'],a['pAdjusted'],b['pAdjusted'])
  if m=='survival':
   for a,b in zip(py['groups'],js['groups']):close(m+':'+a['name'],[r['survival'] for r in a['rows']],[r['survival'] for r in b['rows']])
   close('logrank',py['logrank']['p'],js['logrank']['p'])
 (OUT/'native.json').write_text(json.dumps({'workflows':17,'referenceComparisons':len(checks),'checks':checks},indent=2));print('NATIVE_OK',len(checks),'comparisons; 17 Python reproductions')
def browser():
 from playwright.sync_api import sync_playwright
 fixture=OUT/'http-root';fixture.mkdir(exist_ok=True);alias=fixture/'chilperic_ode_solver'
 if not alias.exists():alias.symlink_to(ROOT,target_is_directory=True)
 class Quiet(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=http.server.ThreadingHTTPServer(('127.0.0.1',8872),functools.partial(Quiet,directory=str(fixture)))
 threading.Thread(target=server.serve_forever,daemon=True).start();origin='http://127.0.0.1:8872';base=origin+'/chilperic_ode_solver/site/'
 evidence={'workflows':[],'routes':[],'exports':[],'errors':[]}
 try:
  with sync_playwright() as pw:
   b=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
   context=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True)
   context.route('**/*',lambda r:r.continue_() if r.request.url.startswith((origin,'data:','blob:')) else r.abort())
   p=context.new_page();p.on('pageerror',lambda e:evidence['errors'].append(str(e)));p.goto(base+'analysis-studio.html',wait_until='domcontentloaded');p.wait_for_function('!!window.FokoAnalysisStudio')
   for case in cases:
    req=case['request'];m=case['analysis']['method']
    p.evaluate("q=>{FokoAnalysisStudio.acceptPayload({schema:'foko.analysis/2',...q});FokoAnalysisStudio.run();}",req)
    p.wait_for_function("m=>window.FokoAnalysisResult?.method===m",arg=m,timeout=30000)
    p.wait_for_function("!!document.getElementById('as-plot-left')._fullLayout",timeout=30000);p.wait_for_timeout(120)
    observed=p.evaluate('FokoAnalysisStudio.getResult().audit.analyzedUnits');assert observed==case['analysis']['audit']['analyzedUnits'],m
    assert not p.locator('#as-error').is_visible(),m
    evidence['workflows'].append({'method':m,'units':observed})
   p.evaluate("()=>{FokoAnalysisStudio.loadDemo('harvest');FokoAnalysisStudio.run()}");p.wait_for_function("FokoAnalysisResult?.method==='welch-anova'");p.wait_for_timeout(700)
   p.screenshot(path=str(OUT/'studio-desktop.png'),full_page=True)
   for format in ('svg','png','html'):
    with p.expect_download(timeout=30000) as info:p.locator(f'[data-side="left"][data-export="{format}"]').click()
    d=info.value;dest=OUT/('browser-figure.'+format);d.save_as(dest);data=dest.read_bytes();assert len(data)>100
    if format=='png':assert data.startswith(b'\x89PNG')
    if format=='svg':assert b'<svg' in data[:1000]
    evidence['exports'].append(format)
   with p.expect_download() as info:p.locator('#as-export-python').click()
   dest=OUT/'browser-reproduce.py';info.value.save_as(dest);compile(dest.read_text(),str(dest),'exec')
   folder=OUT/'browser-python';folder.mkdir(exist_ok=True)
   run=subprocess.run([sys.executable,str(dest)],cwd=folder,capture_output=True,env={**os.environ,'MPLBACKEND':'Agg'},timeout=60);assert run.returncode==0,run.stderr.decode()[-2000:]
   evidence['exports'].append('executed-python')
   p.locator('#as-advanced > summary').click();p.locator('#as-alpha').fill('0.1');assert p.locator('#as-export-result').is_disabled();assert p.locator('#as-stale').is_visible();evidence['staleGuard']=True
   p.close()
   mc=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');mc.route('**/*',lambda r:r.continue_() if r.request.url.startswith((origin,'data:','blob:')) else r.abort())
   mp=mc.new_page();mp.goto(base+'analysis-studio.html',wait_until='domcontentloaded');mp.wait_for_function('!!window.FokoAnalysisStudio');mp.locator('#as-run').click();mp.wait_for_function('!!window.FokoAnalysisResult');mp.wait_for_timeout(800)
   dims=mp.evaluate('({width:innerWidth,document:document.documentElement.scrollWidth})');evidence['mobile']=dims;assert dims['document']<=dims['width']+2,dims;mp.screenshot(path=str(OUT/'studio-mobile.png'),full_page=True);mc.close()
   for route in ['index.html','plants/index.html','leaf/index.html','tcells/index.html','lipids/index.html','continuum/advanced.html','random.html','ode.html','statistics.html','cv.html']:
    q=context.new_page();errs=[];q.on('pageerror',lambda e:errs.append(str(e)));response=q.goto(base+route,wait_until='domcontentloaded');q.wait_for_timeout(1400);assert response.status==200,route
    if route=='cv.html':
     links=q.locator('.cv-downloads a[href$=".pdf"]').evaluate_all('xs=>xs.map(a=>a.getAttribute("href"))');assert len(links)==6,links
     for link in links:
      raw=context.request.get(base+link);assert raw.status==200 and raw.body().startswith(b'%PDF'),link
     evidence['cvLinks']=links
    if route=='leaf/index.html':
     q.wait_for_function("window.ResearchExperiments?.getLatest()?.lab==='leaf'",timeout=90000)
     fixture=q.evaluate("()=>{const r=ResearchExperiments.getLatest().result;const i=r.response.findIndex(x=>x.airC===45);if(i<0)throw Error('45 degree sample missing');const original=JSON.stringify(r.response[i]);const slider=document.querySelector('.leaf-scan input[type=range]');slider.value=i;slider.dispatchEvent(new Event('input',{bubbles:true}));return {i,original,diagnosis:LeafDiagnostics.diagnose(r.response[i])};}")
     assert fixture['diagnosis']['code']=='hydraulic_limit' and fixture['diagnosis']['heatConverged'],fixture
     q.locator('.leaf-diagnosis details summary').click();q.locator('#diagnostic-gs').fill('0.05');q.locator('#diagnostic-run').click();q.wait_for_function('!!window.FokoLeafAlternative',timeout=60000)
     assert q.evaluate('(i)=>JSON.stringify(ResearchExperiments.getLatest().result.response[i])',fixture['i'])==fixture['original']
     evidence['leaf45']=fixture['diagnosis'];evidence['alternativeDidNotReplaceSample']=True;q.locator('.leaf-diagnosis').screenshot(path=str(OUT/'leaf-diagnosis.png'))
    assert not errs,(route,errs);evidence['routes'].append(route);q.close()
   assert not evidence['errors'],evidence['errors'];context.close();b.close()
 finally:server.shutdown()
 (OUT/'browser.json').write_text(json.dumps(evidence,indent=2));print('BROWSER_OK',len(evidence['workflows']),'module-worker workflows; mobile, exports, six CVs and leaf constraint checked')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--native-only',action='store_true');args=parser.parse_args();native()
 if not args.native_only:browser()
 report={'release':'80.2.0','checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'commit':os.environ.get('GITHUB_SHA'),'source':json.loads((SITE/'deployment-source-manifest.json').read_text()) if (SITE/'deployment-source-manifest.json').exists() else None,'node':json.loads((OUT/'node.json').read_text()),'native':json.loads((OUT/'native.json').read_text()),'browser':json.loads((OUT/'browser.json').read_text()) if (OUT/'browser.json').exists() and not args.native_only else None,'scope':'Release acceptance on Chromium desktop/mobile emulation and selected native labs; not complete accessibility conformance, physical-device testing, biological calibration or proof of arbitrary model feasibility.'}
 report['source']={k:v for k,v in (report['source'] or {}).items() if k not in ('authored_expected','new_expected','protected_cv_hashes')}
 (OUT/'report.json').write_text(json.dumps(report,indent=2))
 if not args.native_only:
  for d in (SITE,ROOT/'docs'):(d/'deployment-verification.json').write_text(json.dumps(report,indent=2))
