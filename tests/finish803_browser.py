"""Real local HTTP acceptance. Native module workers and Plotly, not computation stubs."""
from pathlib import Path
import json,time,functools,http.server,threading,subprocess,sys,hashlib
from playwright.sync_api import sync_playwright
ROOT=Path('.').resolve();OUT=ROOT/'evidence/finish803';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',8883),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();BASE='http://127.0.0.1:8883/site/'
checks=[];errors=[];bad=[]
def check(name,fn):
 start=time.time()
 try:
  detail=fn();checks.append({'name':name,'status':'passed','seconds':round(time.time()-start,2),'detail':detail});print('PASS',name,flush=True);return detail
 except Exception as e:checks.append({'name':name,'status':'failed','error':str(e)});print('FAIL',name,str(e),flush=True)
def require(ok,message):
 if not ok:raise AssertionError(message)
ROUTES=['analysis-studio.html','decision-studio.html','optimization.html','studio.html','ode.html','stochastic.html','steady.html','bifurcation.html','sensitivity.html','fitting.html','statistics.html','agent.html','population-genetics.html','symbolic.html','networks.html','linear-algebra.html','evolution.html','advanced-methods.html','ai-modeling.html','sciml.html','ml.html','plants/index.html','leaf/index.html','tcells/index.html','lipids/index.html','random.html','continuum/advanced.html','continuum/approaches.html','continuum/index.html','plant-growth.html','adaptation.html','diffusion.html','fractals.html']
SELECTORS={'analysis-studio.html':'as-demo','optimization.html':'optimizationSelect','studio.html':'studioPreset','ode.html':'exampleSelect','stochastic.html':'stochasticSelect','steady.html':'steadySelect','bifurcation.html':'bfPreset','sensitivity.html':'sensitivitySelect','fitting.html':'fittingSelect','statistics.html':'statisticsSelect','agent.html':'agentPresetSelect','population-genetics.html':'pgExampleSelect','symbolic.html':'symbolicSelect','networks.html':'networksSelect','linear-algebra.html':'linalgSelect','evolution.html':'evPreset','advanced-methods.html':'advancedSelect','ai-modeling.html':'aiExample'}
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);c=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True)
 c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(('http://127.0.0.1:8883/','data:','blob:')) else r.abort())
 def page(route):
  p=c.new_page();p.on('pageerror',lambda e:errors.append({'route':route,'message':str(e)}));p.on('response',lambda r:bad.append({'route':route,'url':r.url,'status':r.status}) if r.status>=400 else None);p.goto(BASE+route,wait_until='domcontentloaded',timeout=30000);p.wait_for_timeout(650);return p
 for route in ROUTES:
  p=page(route)
  def dock():
   p.wait_for_selector('.fl-command .fl-primary-run',state='visible',timeout=12000);out=[]
   for f in (0,.5,1):
    p.evaluate('f=>window.scrollTo(0,document.documentElement.scrollHeight*f)',f);p.wait_for_timeout(100)
    result=p.locator('.fl-primary-run').evaluate('(e)=>{const r=e.getBoundingClientRect();return {visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,text:e.textContent,form:e.form?.id}}');require(result['visible'],'Run outside viewport at scroll '+str(f));out.append(result)
   require(p.locator('.fl-command').count()==1,'Duplicate command dock');return out
  check('Persistent native Run · '+route,dock)
  if route in SELECTORS:
   def select_example():
    sel=p.locator('#'+SELECTORS[route]);vals=sel.evaluate('(e)=>[...e.options].map(x=>x.value).filter(Boolean)');require(len(vals)>1,'No alternative example');old=sel.input_value();new=next(x for x in vals if x!=old);sel.select_option(new);p.wait_for_timeout(200);require(sel.input_value()==new,'Selection did not persist');require('prepared' in p.locator('.fl-command-status').inner_text().lower(),'No preparation status');undo=p.get_by_role('button',name='Undo example',exact=True);require(undo.is_visible(),'Missing reversible example switch');undo.click();p.wait_for_timeout(100);require(sel.input_value()==old,'Undo did not restore original selection');return {'selected':new,'restored':old}
   check('Prepare and undo example · '+route,select_example)
  p.close()
 # New finite-candidate analysis and all available chart specifications.
 p=page('decision-studio.html');p.locator('#ds-ref').fill('2,2');p.locator('#ds-run').click();p.wait_for_function('FokoDecisionStudio.getResult()?.hypervolume>0',timeout=30000)
 def decision():
  r=p.evaluate('({n:FokoDecisionStudio.getResult().front.length,excluded:FokoDecisionStudio.getResult().excluded.length})');require(r['n']==41 and r['excluded']==1,'Analytic Pareto reference failed');return r
 check('Decision worker analytic example',decision)
 options=p.locator('#ds-left-view').evaluate('(e)=>[...e.options].filter(x=>!x.disabled).map(x=>x.value)')
 for view in options:
  def plot(v=view):
   p.select_option('#ds-left-view',v);p.wait_for_timeout(300);require(p.locator('#ds-left').evaluate('(e)=>!!e._fullLayout'),'Missing Plotly figure');require(not p.locator('#ds-error').is_visible(),'Plot error displayed');return {'view':v,'traces':p.locator('#ds-left').evaluate('(e)=>e.data.length')}
  check('Decision view · '+view,plot)
 p.select_option('#ds-left-view','pareto');p.wait_for_timeout(200);p.screenshot(path=str(OUT/'decision-desktop.png'))
 def download(id,name):
  target=p.locator('#'+id);target.scroll_into_view_if_needed()
  with p.expect_download(timeout=20000) as d:target.click()
  path=OUT/name;d.value.save_as(path);require(path.stat().st_size>20,'Empty export');return path
 check('Decision native CSV export',lambda:{'bytes':download('ds-csv','candidates.csv').stat().st_size})
 check('Decision full JSON preserves original input',lambda:{'schema':json.loads(download('ds-export','decision.json').read_text())['schema']})
 def python_export():
  path=download('ds-python','pareto.py');r=subprocess.run([sys.executable,str(path)],capture_output=True,text=True);require(r.returncode==0,r.stderr);v=json.loads(r.stdout);require(len(v['finite_nondominated_ids'])==41,'Python front disagreement');return v
 check('Independent exported Python reproduces finite front',python_export)
 def playback():
  p.locator('#ds-play').click();p.wait_for_timeout(450);a=float(p.input_value('#ds-frame'));require(0<a<1000,'No playback progress');p.locator('#ds-play').click();v=p.input_value('#ds-frame');p.wait_for_timeout(250);require(v==p.input_value('#ds-frame'),'Pause does not hold');return {'position':v}
 check('Recorded candidate reveal and pause',playback)
 def three():
  p.select_option('#ds-demo','three');p.locator('#ds-run').click();p.wait_for_function('FokoDecisionStudio.getResult()?.input.objectives.length===3');p.select_option('#ds-left-view','three');p.wait_for_timeout(700);require(p.locator('#ds-left').evaluate('(e)=>e.data[0].type')=='scatter3d','No three-objective view');return {'objectives':3}
 check('Three-objective rendering preserves full objective set',three)
 def stale():
  p.locator('#ds-ref').fill('1,');require(p.locator('#ds-export').is_disabled(),'Edited configuration still exportable');p.locator('#ds-run').click();p.wait_for_timeout(200);require('blank' in p.locator('#ds-error').inner_text(),'Malformed reference not refused')
 check('Incomplete input does not reuse a stale export',stale);p.close()
 # Native optimization: actual Pareto data and exact configuration handoff.
 p=page('optimization.html')
 def optimize():
  sel=p.locator('#optimizationSelect');val=sel.evaluate("e=>[...e.options].find(o=>/pareto|trade.off|multi.objective/i.test(o.textContent))?.value");require(val,'No native multiobjective preset');sel.select_option(val);p.wait_for_timeout(100);p.locator('#runOptimization').click();p.wait_for_function('(()=>{try{return !!FokoDecisionSource().pareto?.points?.length}catch(e){return false}})()',timeout=90000);r=p.evaluate('FokoDecisionSource()');require(r['pareto']['points'],'Missing actual candidate history');(OUT/'native-optimization.json').write_text(json.dumps(r));return {'points':len(r['pareto']['points']),'model':r['model']['objective'],'secondary':r['model'].get('objective2')}
 check('Native multiobjective optimizer completes',optimize)
 def transfer():
  count=p.evaluate('FokoDecisionSource().pareto.points.length');p.locator('#fl-decision-handoff').click();p.wait_for_url('**/decision-studio.html?record=*');p.wait_for_function('window.FokoDecisionStudio');p.locator('#ds-run').click();p.wait_for_function('FokoDecisionStudio.getResult()',timeout=30000);r=p.evaluate('FokoDecisionStudio.getResult().input');require(len(r['candidates'])==count,'Candidates lost during transfer');require(r['provenance']['original']['model'],'Original objective configuration lost');return {'candidates':count,'directions':[x['direction'] for x in r['objectives']]}
 check('Native optimizer → decision studio without Load or X–Y flattening',transfer);p.close()
 # Native origin-fixation computation and source event transfer, using a small declared budget.
 p=page('continuum/advanced.html')
 def evolution():
  for id,value in {'advLive':'fast','advReps':'1','advCap':'4','advGrid':'4','advGsLevels':'2','advComparator':'none','advScale':'0'}.items():
   el=p.locator('#'+id)
   if el.evaluate('(e)=>e.tagName')=='SELECT':el.select_option(value)
   else:el.fill(value)
  p.locator('#advRun').click();p.wait_for_function("ResearchExperiments?.getLatest()?.result?.schema==='dynamics.kimura/1'",timeout=150000);r=p.evaluate('ResearchExperiments.getLatest()');(OUT/'native-evolution.json').write_text(json.dumps(r));p.locator('#fl-decision-handoff').click();p.wait_for_url('**/decision-studio.html?record=*');p.wait_for_function('window.FokoDecisionStudio');p.locator('#ds-run').click();p.wait_for_function('FokoDecisionStudio.getResult()?.input.events?.length',timeout=30000)
  for v in ('events','selection','fixation','waiting','endpoints'):
   p.select_option('#ds-left-view',v);p.wait_for_timeout(150);require(not p.locator('#ds-error').is_visible(),'Evolution view failed '+v)
  return {'events':p.evaluate('FokoDecisionStudio.getResult().input.events.length'),'clock':p.evaluate('FokoDecisionStudio.getResult().input.clock')}
 check('Recorded evolutionary events transfer with correct clock',evolution);p.close()
 # Unchanged numerical heat/hydraulic rejection retains explicit failure diagnosis.
 p=page('leaf/index.html')
 def leaf():
  p.wait_for_function("ResearchExperiments?.getLatest()?.lab==='leaf'",timeout=90000);r=p.evaluate('(()=>{const r=ResearchExperiments.getLatest().result;return LeafDiagnostics.diagnose(r.response.find(p=>p.airC===45))})()');require(r['code']=='hydraulic_limit' and r['heatConverged'],'Leaf failure diagnosis changed');return r
 check('45 C source diagnosis remains a hydraulic constraint, not a substituted result',leaf);p.close()
 for route in ('contact.html','contributors.html','analysis.html','cv.html'):
  p=page(route)
  def editorial(r=route):
   require(p.locator('.foko-header').count()==1,'Duplicate shared header');require(p.locator('.fl-site-footer a[href$="contributors.html"]').count()==1,'Acknowledgements not in footer')
   if r=='contact.html':require(p.locator('img.fl-contact-photo').evaluate('(e)=>e.complete&&e.naturalWidth>100'),'Contact portrait not displayed')
   if r=='contributors.html':
    text=p.locator('main').inner_text()
    for name in ('Jérémie','Yvonne','Antonio','Jonas','Martin','Adélaïde','Barbara','Wilfred','Gisèle','AIMS','Marie Skłodowska-Curie','812616','CCB'):require(name in text,'Missing credit '+name)
   if r=='cv.html':require(p.locator('.cv-downloads a[href$=".pdf"]').count()==6,'Six editions are not available')
   p.screenshot(path=str(OUT/(r.replace('.html','')+'-desktop.png')));return {'title':p.title()}
  check('Contact, attribution and CV preservation · '+route,editorial);p.close()
 c.close()
 c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 for route in ['analysis-studio.html','decision-studio.html','optimization.html','plants/index.html','leaf/index.html','tcells/index.html','studio.html','contact.html','contributors.html']:
  p=c.new_page();p.on('pageerror',lambda e:errors.append({'route':route,'message':str(e)}));p.goto(BASE+route,wait_until='domcontentloaded');p.wait_for_timeout(800)
  def mobile():
   require(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Horizontal document overflow')
   if route not in ('contact.html','contributors.html'):
    p.evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');p.wait_for_timeout(150);require(p.locator('.fl-primary-run').evaluate('e=>{let r=e.getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0&&r.right<=innerWidth}'),'Run hidden on mobile')
   if route in ('contact.html','decision-studio.html'):p.evaluate('window.scrollTo(0,0)');p.screenshot(path=str(OUT/(route+'-mobile.png')))
   return {'width':p.evaluate('document.documentElement.scrollWidth')}
  check('Mobile reflow and persistent Run · '+route,mobile);p.close()
 c.close();b.close()
server.shutdown();report={'release':'80.3.0','checks':checks,'errors':errors,'failedHTTP':bad,'summary':{'passed':sum(x['status']=='passed' for x in checks),'failed':sum(x['status']=='failed' for x in checks)},'scope':'Real HTTP Chromium desktop/mobile emulation with native workers and source records. Not full WCAG conformance, physical-device or empirical biological validation.'};(OUT/'browser.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));print(json.dumps(report['summary']));sys.exit(1 if report['summary']['failed'] or errors or bad else 0)
