"""Evidence-only audit of the user-approved legacy. No application changes.
Real Chromium on a local HTTP server under the GitHub project URL prefix.
Automated accessibility findings are not a full WCAG conformance assessment.
"""
from __future__ import annotations
import pathlib,json,time,threading,http.server,functools,collections,traceback
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path('.').resolve();OUT=ROOT/'evidence/deep-audit';OUT.mkdir(parents=True,exist_ok=True)
SERVE=OUT/'http-root';SERVE.mkdir(exist_ok=True);(SERVE/'chilperic_ode_solver').symlink_to(ROOT/'site',target_is_directory=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8899),functools.partial(Quiet,directory=str(SERVE)));threading.Thread(target=srv.serve_forever,daemon=True).start()
BASE='http://127.0.0.1:8899/chilperic_ode_solver/'
ROUTES=['index.html','experiments.html','labs.html','plants/index.html','leaf/index.html','tcells/index.html','lipids/index.html','random.html','continuum/advanced.html','continuum/approaches.html','continuum/index.html','studio.html','ode.html','stochastic.html','steady.html','bifurcation.html','agent.html','population-genetics.html','evolution.html','sensitivity.html','optimization.html','fitting.html','statistics.html','advanced-methods.html','ai-modeling.html','sciml.html','ml.html','linear-algebra.html','networks.html','symbolic.html','workspace.html','book.html','learn.html','research/index.html','saved-experiments.html','plant-growth.html','adaptation.html','diffusion.html','fractals.html']
MOBILE=['index.html','experiments.html','plants/index.html','leaf/index.html','tcells/index.html','lipids/index.html','continuum/advanced.html','studio.html','sensitivity.html','optimization.html','fitting.html','statistics.html']
AXE=pathlib.Path('node_modules/axe-core/axe.min.js').read_text()
metrics_script='''()=>{const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};const text=e=>(e.getAttribute('aria-label')||e.innerText||e.id||e.name||e.tagName).trim().slice(0,90);const all=[...document.querySelectorAll('button,input,select,textarea,a[href],summary')],controls=all.filter(visible);const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);const counts={};ids.forEach(x=>counts[x]=(counts[x]||0)+1);const under=controls.filter(e=>{const r=e.getBoundingClientRect();return (r.width<24||r.height<24)&&!e.matches('input[type=checkbox],input[type=radio]')}).map(e=>({id:e.id,label:text(e),tag:e.tagName,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));const clipped=[...document.body.querySelectorAll('*')].filter(e=>{if(!visible(e)||e.closest('.js-plotly-plot,svg,canvas,table,pre,code'))return false;const r=e.getBoundingClientRect();return (r.right>innerWidth+3||r.left< -3)&&r.width>1}).slice(0,30).map(e=>({tag:e.tagName,id:e.id,class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));return {viewport:{w:innerWidth,h:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},visibleControls:controls.length,totalControls:all.length,visibleFormControls:controls.filter(e=>e.matches('input,select,textarea')).length,aboveFoldControls:controls.filter(e=>e.getBoundingClientRect().top<innerHeight&&e.getBoundingClientRect().bottom>0).length,duplicateIds:Object.entries(counts).filter(([k,n])=>n>1),smallTargets:under,clipped,stylesheets:[...document.styleSheets].map(s=>s.href),scripts:[...document.scripts].filter(s=>s.src).map(s=>s.src),headings:[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>({level:e.tagName,text:text(e)})),canvases:[...document.querySelectorAll('canvas')].filter(visible).map(e=>({id:e.id,aria:e.getAttribute('aria-label'),role:e.getAttribute('role'),fallback:e.innerText,tabindex:e.getAttribute('tabindex')})),ranges:[...document.querySelectorAll('input[type=range]')].filter(visible).map(e=>({id:e.id,min:e.min,max:e.max,step:e.step,value:e.value,ariaValueText:e.getAttribute('aria-valuetext'),label:e.getAttribute('aria-label')})),liveRegions:[...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].map(e=>({id:e.id,live:e.getAttribute('aria-live'),role:e.getAttribute('role')})),memory:performance.memory?{used:performance.memory.usedJSHeapSize}:null,resources:performance.getEntriesByType('resource').map(e=>({url:e.name,duration:e.duration,transferSize:e.transferSize,decodedBodySize:e.decodedBodySize})),autoAnimationCallbacks:window.__rafCount,animations:document.getAnimations().filter(a=>a.playState==='running').length};}'''
records=[];focused={};failures=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 def context(w,h):
  c=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce',accept_downloads=True)
  c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(('http://127.0.0.1:8899/','data:','blob:')) else r.abort('blockedbyclient'))
  c.add_init_script('window.__rafCount=0;const raf=window.requestAnimationFrame;window.requestAnimationFrame=function(f){return raf.call(window,t=>{window.__rafCount++;f(t)})};')
  return c
 def inspect(c,route,variant):
  p=c.new_page();errors=[];bad=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('response',lambda r:bad.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
  start=time.time()
  try:
   response=p.goto(BASE+route,wait_until='domcontentloaded',timeout=30000);p.wait_for_timeout(2200)
   if variant=='dark':p.evaluate("document.documentElement.dataset.appearance='dark';document.dispatchEvent(new Event('foko:appearance'))");p.wait_for_timeout(500)
   p.add_script_tag(content=AXE)
   axe=p.evaluate('async()=>{const r=await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa","best-practice"]}});return {version:r.testEngine.version,violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,help:v.help,helpUrl:v.helpUrl,tags:v.tags,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary,checks:n.any.map(c=>({id:c.id,data:c.data}))}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))};}')
   metric=p.evaluate(metrics_script);item={'route':route,'variant':variant,'http':response.status,'seconds':round(time.time()-start,2),'metrics':metric,'axe':axe,'pageErrors':errors,'failedHTTP':bad};records.append(item)
   if route in ['index.html','leaf/index.html','plants/index.html','studio.html','experiments.html','tcells/index.html','sensitivity.html'] and variant in ['desktop','mobile']:
    p.screenshot(path=str(OUT/(route.replace('/','-').replace('.html','')+'-'+variant+'.png')))
   print('AUDIT',variant,route,'axe',[(x['id'],len(x['nodes'])) for x in axe['violations']],'width',metric['document']['width'],'controls',metric['visibleControls'],flush=True)
  except Exception as e:failures.append({'route':route,'variant':variant,'error':str(e)});print('INCOMPLETE',route,str(e),flush=True)
  finally:p.close()
 c=context(1440,1000)
 for r in ROUTES:inspect(c,r,'desktop')
 for r in ['index.html','leaf/index.html','lipids/index.html','studio.html']:inspect(c,r,'dark')
 p=c.new_page();p.goto(BASE+'leaf/index.html',wait_until='domcontentloaded');p.wait_for_function('ResearchExperiments?.getLatest()?.lab==="leaf"',timeout=90000)
 focused['leafDefault']=p.evaluate('ResearchExperiments.getLatest().result');p.locator('.leaf-scan input').fill('12');p.locator('.leaf-scan input').dispatch_event('input');p.wait_for_timeout(200)
 focused['leafDisplayedFailure']=p.locator('.leaf-scan').inner_text();p.locator('.leaf-scan').screenshot(path=str(OUT/'leaf-sample13-before.png'))
 focused['transfer']=p.evaluate('(()=>{const r=ResearchRecords.create("leaf",ResearchExperiments.getLatest().result,"Leaf audit"),p=FokoTransfer.create(r,"leaf.assimilation");return {record:{model:r.model,source:r.source,curves:r.curves},payload:p,statsConfig:FokoTransfer.config(p,"statistics"),fitConfig:FokoTransfer.config(p,"fitting")};})()')
 p.locator('#airC').fill('30');p.locator('#airC').dispatch_event('input');focused['afterInputEdit']=p.evaluate('({latestAir:ResearchExperiments.getLatest().result.config.p.airC,formAir:document.getElementById("airC").value,dirtyVisible:!document.getElementById("dirty").hidden,transferEnabled:![...document.querySelectorAll(".foko-result-link")][0]?.disabled,csvDisabled:document.getElementById("csv").disabled})')
 p.close();c.close()
 c=context(390,844)
 for r in MOBILE:inspect(c,r,'mobile')
 c.close();c=context(320,800)
 for r in ['index.html','leaf/index.html','tcells/index.html','studio.html']:inspect(c,r,'narrow320')
 c.close();browser.close()
srv.shutdown()
report={'baselineCommit':'39810f18526ea7eed1b02c3a30fffaddad490b57','legacyBranch':'legacy/80.1.0-user-approved','scope':'Read-only automated audit; not WCAG certification. Small target and overflow heuristics require manual exceptions review. Timing is a runner diagnostic, not a cross-device benchmark. Independent equilibrium sample is not physical time.','pages':records,'focused':focused,'incomplete':failures}
(OUT/'deep-audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));print('COMPLETE',len(records),'page-state scans;',len(failures),'incomplete probes')
