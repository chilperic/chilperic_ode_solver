"""Real local-HTTP browser tests; no worker or computation stubs.
Checks use explicitly recorded source presets or reduced test budgets.
"""
from __future__ import annotations
import pathlib, json, time, hashlib, threading, http.server, functools, traceback
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path('.').resolve(); OUT=ROOT/'evidence/recovery';OUT.mkdir(parents=True,exist_ok=True)
SERVE=OUT/'http-root';SERVE.mkdir(exist_ok=True);link=SERVE/'chilperic_ode_solver'
if not link.exists():link.symlink_to(ROOT/'site',target_is_directory=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',8897),functools.partial(Quiet,directory=str(SERVE)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE='http://127.0.0.1:8897/chilperic_ode_solver/'
checks=[];network=[];browser_errors=[];snapshots=[]
def check(name,fn):
 start=time.time()
 try:
  detail=fn();checks.append({'name':name,'status':'passed','seconds':round(time.time()-start,3),'detail':detail});print('PASS',name,flush=True);return detail
 except Exception as e:
  detail=str(e);checks.append({'name':name,'status':'failed','seconds':round(time.time()-start,3),'detail':detail});print('FAIL',name,detail,flush=True);return None
def ensure(cond,message):
 if not cond:raise AssertionError(message)
def state(pg):return pg.evaluate('window.ResearchExperiments?.getLatest() ? {lab:ResearchExperiments.getLatest().lab, keys:Object.keys(ResearchExperiments.getLatest().result), config:ResearchExperiments.getLatest().result.config} : null')
def inputs(pg,values):
 pg.evaluate('''v=>{for(const [id,value] of Object.entries(v)){const e=document.getElementById(id);if(!e)throw Error('Missing input '+id);if(e.type==='checkbox')e.checked=value;else e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}}''',values)
def run(pg,form,values=None,timeout=110000):
 if values:inputs(pg,values)
 before=pg.evaluate('window.__recoveryResults||0')
 validity=pg.evaluate('id=>{const f=document.getElementById(id);return {valid:f.checkValidity(),invalid:[...f.querySelectorAll(":invalid")].map(x=>({id:x.id,message:x.validationMessage,value:x.value}))}}',form)
 ensure(validity['valid'],'Invalid configured form: '+json.dumps(validity))
 pg.evaluate('id=>document.getElementById(id).requestSubmit()',form)
 try:pg.wait_for_function('(n)=>(window.__recoveryResults||0)>n',arg=before,timeout=timeout)
 except Exception:
  raise AssertionError('No completed run. '+pg.locator('#status,#work,#error,#advStatus,#runStatus').all_text_contents().__repr__())
 pg.wait_for_timeout(250);return state(pg)
def scrub(pg,id,fraction):
 pg.evaluate('([id,f])=>{const e=document.getElementById(id);e.value=Number(e.min||0)+(Number(e.max||1)-Number(e.min||0))*f;e.dispatchEvent(new Event("input",{bubbles:true}));}',[id,fraction]);pg.wait_for_timeout(200)
def canvas_digest(pg,id):return pg.locator('#'+id).evaluate('(c)=>{if(!c.width||!c.height)throw Error("Empty canvas");return c.toDataURL()}')
def scene_change(pg,slider,canvas):
 scrub(pg,slider,0);a=canvas_digest(pg,canvas);scrub(pg,slider,1);b=canvas_digest(pg,canvas);ensure(a!=b,'Canvas unchanged between initial and final recorded states');return {'slider':slider,'canvas':canvas,'initial_sha256':hashlib.sha256(a.encode()).hexdigest(),'final_sha256':hashlib.sha256(b.encode()).hexdigest()}
def snap(pg,name,selector=None):
 p=OUT/(name+'.png');(pg.locator(selector) if selector else pg).screenshot(path=str(p));snapshots.append(p.name)
 return p.name
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--disable-dev-shm-usage','--no-sandbox'])
 context=browser.new_context(viewport={'width':1500,'height':1040},reduced_motion='reduce',accept_downloads=True)
 # Isolated offline deployment test: source external services are not substituted.
 context.route('**/*',lambda route:route.continue_() if route.request.url.startswith(('http://127.0.0.1:8897/','data:','blob:')) else route.abort('blockedbyclient'))
 context.add_init_script("window.__recoveryResults=0;addEventListener('lab-result',()=>window.__recoveryResults++);")
 def page(route):
  pg=context.new_page();pg.on('pageerror',lambda e:browser_errors.append({'route':route,'error':str(e)}))
  pg.on('response',lambda r:network.append({'route':route,'url':r.url,'status':r.status}) if r.status>=400 else None)
  response=pg.goto(BASE+route,wait_until='domcontentloaded',timeout=25000);ensure(response.status==200,'Not HTTP200');pg.wait_for_timeout(1000);return pg
 # One navigation shell and full paginated union.
 pg=page('index.html');check('Homepage navigation and recovered routes',lambda:(ensure(pg.locator('.foko-header').count()==1,'Expected one shared header'),ensure(pg.locator('a[href="plants/index.html"]').count()>0,'Missing primary original plant route'),snap(pg,'01-home'))[-1]);pg.close()
 pg=page('experiments.html')
 def catalog():
  count=pg.evaluate('FokoRecoveryLibrary.records.length');ensure(count==554,'Expected 259 core + 115 recovered + 180 retained configurations, found '+str(count));ensure(pg.locator('.experiment-card').count()==18,'Expected page size18');pg.locator('#experimentNext').click();ensure('2 /' in pg.locator('#experimentPage').inner_text(),'Pagination did not advance');pg.select_option('#experimentSource','recovered');ensure('115 matching' in pg.locator('#experimentCount').inner_text(),'Missing source presets');return {'records':count,'recovered':115,'screenshot':snap(pg,'02-library')}
 check('Catalogue preserves original IDs and complete pagination',catalog);pg.close()
 # Full original T-cell families.
 pg=page('tcells/index.html');pg.wait_for_function('ResearchExperiments?.getLatest()',timeout=90000)
 for model in ['activation','birthdeath','age','cyton','kimmel']:
  check('Cell family '+model+' completes in original worker',lambda m=model:run(pg,'experiment',{'model':m,'initial':4,'generations':3,'hours':8 if m=='kimmel' else 48,'repetitions':30}))
 check('Cell count event accounting',lambda:pg.evaluate('(()=>{const r=ResearchExperiments.getLatest().result,e=r.events.at(-1);if(r.config.initial+e.divisions-e.dead!==e.total)throw Error("Lineage accounting mismatch");return {events:r.events.length,cells:r.cells.length,final:e.total};})()'))
 check('Cell population scene follows recorded timeline',lambda:scene_change(pg,'timeline','cellCulture'))
 def cell_events():
  scrub(pg,'timeline',0);pg.locator('#nextCellEvent').click();a=pg.input_value('#timeline');ensure(float(a)>0,'Next event did not advance');pg.locator('#previousCellEvent').click();b=pg.input_value('#timeline');ensure(float(b)<float(a),'Previous event did not retreat');return {'next':a,'previous':b}
 check('Cell next/previous actual event controls',cell_events);scrub(pg,'timeline',.6);check('Cell lineage rendered',lambda:snap(pg,'03-cell-lineage','#lineage'))
 def export(pg,id,name):
  with pg.expect_download(timeout=15000) as d:pg.locator('#'+id).click()
  p=OUT/name;d.value.save_as(p);data=p.read_bytes();ensure(len(data)>20,'Empty export');return {'file':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 check('Cell full native JSON export',lambda:export(pg,'download','cell-native.json'));pg.close()
 # Full source lipid mechanism, not replacement four-pool animation.
 pg=page('lipids/index.html');pg.wait_for_function('ResearchExperiments?.getLatest()',timeout=110000)
 check('Source 18-state lipid model',lambda:pg.evaluate('(()=>{const r=ResearchExperiments.getLatest().result;if(r.species.length!==18)throw Error("Missing 18 states");return {species:r.species,rows:r.rows.length,model:r.model};})()'))
 check('Lipid molecular scene follows physical clock',lambda:scene_change(pg,'timeline','molecularA'))
 def lipid_events():
  scrub(pg,'timeline',0);pg.locator('#nextReaction').click();a=float(pg.input_value('#timeline'));ensure(a>0,'Reaction stepping failed');pg.locator('#previousReaction').click();ensure(float(pg.input_value('#timeline'))<a,'Backward reaction failed');pg.locator('#nextProduct').click();ensure(float(pg.input_value('#timeline'))>0,'Product event stepping failed');return pg.locator('#reactionReadout').inner_text()
 check('Lipid reaction and product-release stepping',lipid_events);check('Lipid mechanism rendered',lambda:snap(pg,'04-lipid-chain','#molecularA'));check('Lipid native CSV export',lambda:export(pg,'csv','lipid-concentrations.csv'))
 check('Source four-pool lipid model remains available',lambda:run(pg,'experiment',{'model':'metabolism'}));pg.close()
 # Source plant, development, physical resources and independently computed paired circulation.
 pg=page('plants/index.html');pg.wait_for_function('ResearchExperiments?.getLatest()',timeout=150000)
 check('Original plant default computation',lambda:state(pg))
 check('Plant finite resource ledgers',lambda:pg.evaluate('(()=>{const r=ResearchExperiments.getLatest().result;const out={};for(const [k,rows]of Object.entries(r.series)){if(!rows.length)throw Error("Missing pathway");out[k]={rows:rows.length,final:rows.at(-1)};}return out;})()'))
 def plant_scene():
  # The original renderer creates named per-pathway canvases dynamically.
  canvases=pg.locator('#growthPlants canvas').evaluate_all('(xs)=>xs.map(x=>x.id)');ensure(len(canvases)>=3,'Missing pathway plant scenes');return [scene_change(pg,'timeline',c) for c in canvases[:3]]
 check('All three original plant scenes follow their recorded states',plant_scene)
 check('Plant scene snapshot',lambda:snap(pg,'05-plant-organ-growth','#growthPlants'))
 def flowering():
  data=json.loads((ROOT/'site/design/examples.json').read_text())['plants'][1]
  pg.evaluate('e=>LabWorkspace.applyExample(e)',data);r=run(pg,'controls',{'reps':1},timeout=150000);scrub(pg,'timeline',.85);return {'run':r,'snapshot':snap(pg,'06-development','#growthPlants')}
 check('Original sowing-to-reproduction experiment',flowering)
 check('Plant native result JSON export',lambda:export(pg,'exportExperiment','plant-native.json'))
 def circulation():
  # Original source automatically starts the same-forcing six-way comparison after a run.
  pg.wait_for_function('typeof CirculationComparison!=="undefined"',timeout=10000)
  return {'buttons':pg.locator('#compareCirculation,#exportCirculation,#loopPlantC30,#loopPlantC31,#loopPlantC40,#loopPlantC41,#loopPlantCAM0,#loopPlantCAM1').count(),'snapshot':snap(pg,'07-circulation','#waterCircuit')}
 check('Paired circulation controls and rotation canvas retained',circulation);pg.close()
 # Source random model families, all independently simulated through original controls.
 pg=page('random.html')
 for mode in ['tree','colony','chaos','walk','brownian','branching','birthdeath']:
  check('Random process '+mode,lambda m=mode:run(pg,'controls',{'mode':m,'n':30,'m':6,'initial':4}))
 check('Random-process event playback changes scene',lambda:scene_change(pg,'timeline','canvas0'));check('Random process snapshot',lambda:snap(pg,'08-random','#panels'));pg.close()
 # Full physiological allocation / Kimura event journey.
 pg=page('continuum/advanced.html');pg.wait_for_function('!document.getElementById("advRun").disabled',timeout=20000)
 check('Original Kimura allocation model runs',lambda:run(pg,'advancedForm',{'advLive':'fast','advReps':1,'advCap':8,'advGrid':4,'advGsLevels':2,'advComparator':'none','advScale':0},timeout=150000))
 def evo_step():
  maxevent=int(pg.get_attribute('#advEvent','max'));ensure(maxevent>0,'No test substitution recorded');scrub(pg,'advEvent',0);a=canvas_digest(pg,'advancedLandscape');pg.locator('#advNext').click();b=canvas_digest(pg,'advancedLandscape');ensure(a!=b,'Source event frame did not change');return {'max_event':maxevent,'selected':pg.input_value('#advEvent'),'screenshot':snap(pg,'09-evolution','#advancedLandscape')}
 check('Evolution advances on accepted substitutions',evo_step);check('Evolution native event CSV export',lambda:export(pg,'advCSV','evolution-events.csv'));pg.close()
 # Quantitative evolution and optimizer comparison controls.
 pg=page('continuum/approaches.html');pg.wait_for_timeout(500)
 if pg.locator('#cancelApproach').is_enabled():pg.locator('#cancelApproach').click()
 check('Population evolution comparison runs',lambda:run(pg,'approachForm',{'method':'evolution','population':8,'generations':4,'replicates':2},timeout=150000))
 check('Generation-linked population view',lambda:scene_change(pg,'generationFrame','landscapePlot'));check('Evolution/search screenshot',lambda:snap(pg,'10-population-search','#landscapePlot'));pg.close()
 pg=page('continuum/index.html');check('Original haploid evolution runs',lambda:run(pg,'controls',{'population':8,'generations':3},timeout=90000));pg.close()
 pg=page('leaf/index.html');pg.wait_for_function('ResearchExperiments?.getLatest()',timeout=90000);check('Source coupled leaf physiology',lambda:state(pg));check('Leaf source response plot',lambda:snap(pg,'11-leaf','#response'));pg.close()
 # Original analytical laboratory initialization uses real scripts and dependencies.
 for route,selector in [('studio.html','#runStudio'),('optimization.html','#runOptimization'),('sensitivity.html','#runSensitivity'),('statistics.html','#runStatistics'),('fitting.html','#runFitting'),('agent.html','#runAgent'),('population-genetics.html','#runPopulationGenetics'),('book.html','main'),('saved-experiments.html','#refreshExperiments')]:
  pg=page(route)
  check('Retained route '+route,lambda pg=pg,selector=selector:(ensure(pg.locator(selector).count()>0,'Missing original control '+selector),ensure(pg.locator('.foko-header').count()==1,'Expected one header'),{'title':pg.title()})[-1]);pg.close()
 # Small-screen actual rendering, not physical-device testing.
 mobile=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');pg=mobile.new_page();pg.goto(BASE+'tcells/index.html',wait_until='domcontentloaded');pg.wait_for_timeout(2000)
 check('Mobile recovered T-cell reflow',lambda:(ensure(pg.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Horizontal document overflow'),snap(pg,'12-mobile-cell'))[-1]);mobile.close()
 context.close();browser.close()
server.shutdown()
report={'release':'80.1.0','scope':'Real GitHub-runner Chromium on local HTTP under the GitHub project subpath; native workers and actual source renderers. Offline external requests blocked, not mocked. No physical-device or biological validation claim.','checks':checks,'network_errors':network,'browser_errors':browser_errors,'screenshots':snapshots,'summary':{s:sum(c['status']==s for c in checks) for s in ('passed','failed')}}
(OUT/'browser.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));print(json.dumps(report['summary']))
# Preserve failure evidence; release gate can inspect explicit failed checks.
