"""Read-only platform audit. Real local HTTP, native workers, no computation mocks.
Automated findings are evidence, not blanket WCAG certification.
Usage: python tests/audit803_browser.py [before|after]
"""
from pathlib import Path
import sys,functools,http.server,threading,json,time
from playwright.sync_api import sync_playwright
ROOT=Path('.').resolve();OUT=ROOT/'evidence/audit-80.3'/ (sys.argv[1] if len(sys.argv)>1 else 'before');OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',8863),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start();base='http://127.0.0.1:8863/site/'
ROUTES=['index.html','analysis-studio.html','optimization.html','studio.html','ode.html','stochastic.html','steady.html','bifurcation.html','sensitivity.html','fitting.html','statistics.html','agent.html','population-genetics.html','symbolic.html','networks.html','evolution.html','advanced-methods.html','ai-modeling.html','sciml.html','ml.html','linear-algebra.html','plants/index.html','leaf/index.html','tcells/index.html','lipids/index.html','random.html','continuum/advanced.html','continuum/approaches.html','continuum/index.html','plant-growth.html','adaptation.html','diffusion.html','fractals.html','cv.html','experiments.html']
MOBILE=['analysis-studio.html','optimization.html','studio.html','ode.html','plants/index.html','leaf/index.html','tcells/index.html','continuum/advanced.html','statistics.html','agent.html','cv.html']
records=[];errors=[]
measure="""()=>{const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};const buttons=[...document.querySelectorAll('button')].filter(vis),action=buttons.filter(x=>/^(run|solve|fit|compute|analy[sz]e)/i.test(x.textContent.trim()));return {viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,visibleControls:[...document.querySelectorAll('button,input,select,textarea')].filter(vis).length,runControls:action.map(x=>{const r=x.getBoundingClientRect();return{id:x.id,text:x.textContent.trim().slice(0,45),visibleInViewport:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,top:r.top,disabled:x.disabled}}),loadButtons:buttons.filter(x=>/^load/i.test(x.textContent.trim())).map(x=>({id:x.id,text:x.textContent.trim()})),canvases:[...document.querySelectorAll('canvas')].filter(vis).map(x=>({id:x.id,label:x.getAttribute('aria-label'),role:x.getAttribute('role')})),duplicateIds:[...new Set([...document.querySelectorAll('[id]')].map(x=>x.id))].filter(id=>document.querySelectorAll('[id="'+CSS.escape(id)+'"]').length>1),h1:document.querySelectorAll('h1').length,stylesheets:[...document.querySelectorAll('link[rel=stylesheet]')].map(x=>x.href),bodyText:document.body.innerText.slice(0,1800)}}"""
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for variant,routes,w,h in [('desktop',ROUTES,1440,1000),('mobile',MOBILE,390,844),('dark',['analysis-studio.html','optimization.html','leaf/index.html'],1440,1000)]:
   c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(('http://127.0.0.1:8863/','data:','blob:')) else r.abort())
   for route in routes:
    p=c.new_page();errs=[];failed=[];p.on('pageerror',lambda e:errs.append(str(e)));p.on('response',lambda r:failed.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
    try:
     t=time.time();p.goto(base+route,wait_until='domcontentloaded',timeout=25000);p.wait_for_timeout(1000)
     if variant=='dark':p.evaluate("document.documentElement.dataset.appearance='dark'");p.wait_for_timeout(200)
     top=p.evaluate(measure);p.evaluate('window.scrollTo(0,document.documentElement.scrollHeight*.65)');p.wait_for_timeout(100);scrolled=p.evaluate(measure)
     p.add_script_tag(path='/tmp/foko-axe/node_modules/axe-core/axe.min.js')
     a=p.evaluate("async()=>{const a=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});return {violations:a.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary}))})),incomplete:a.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))}}")
     r={'route':route,'variant':variant,'top':top,'scrolled':scrolled,'axe':a,'errors':errs,'failedHTTP':failed,'seconds':time.time()-t};records.append(r)
     if route in ['analysis-studio.html','optimization.html','studio.html','leaf/index.html','continuum/advanced.html']:
      p.evaluate('window.scrollTo(0,0)');p.screenshot(path=str(OUT/(route.replace('/','-').replace('.html','')+'-'+variant+'.png')))
     print(variant,route,'violations',[(x['id'],len(x['nodes'])) for x in a['violations']],'run-visible',any(x['visibleInViewport'] for x in scrolled['runControls']),flush=True)
    except Exception as e:errors.append({'route':route,'variant':variant,'error':str(e)});print('INCOMPLETE',route,str(e),flush=True)
    finally:p.close()
   c.close()
  b.close()
finally:server.shutdown()
report={'application_baseline':'559cd84a859368081446270efac137decdb5852b','variant':OUT.name,'pages':records,'incomplete':errors,'scope':'Real headless Chromium, desktop/mobile emulation and offline external services; automated accessibility findings are not a full conformance assessment.'}
(OUT/'audit.json').write_text(json.dumps(report,indent=2));print('SCANS',len(records),'INCOMPLETE',len(errors))
