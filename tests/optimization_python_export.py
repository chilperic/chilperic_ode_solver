"""Exercise actual browser-generated Python exports against analytic constrained optima."""
from pathlib import Path
import os,sys,json,base64,functools,http.server,threading,subprocess,time
from playwright.sync_api import sync_playwright
ROOT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path('.').resolve()
OUT=ROOT/'evidence/optimization-python';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',8913),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
cases=[
 {'name':'vector_name_x_with_inequality','variables':['x','y'],'objective':'(x-1)^2+(y-2)^2','inequalities':['x+y-2'],'equalities':[],'expected':[.5,1.5],'value':.5},
 {'name':'named_variables_in_inequality','variables':['a','b'],'objective':'(a-1)^2+(b-2)^2','inequalities':['a+b-2'],'equalities':[],'expected':[.5,1.5],'value':.5},
 {'name':'named_variables_in_equality','variables':['x','y'],'objective':'(x-1)^2+(y-2)^2','inequalities':[],'equalities':['x+y-1'],'expected':[0,1],'value':2},
 {'name':'maximize_direction','variables':['x','y'],'objective':'x+y','inequalities':['x+y-2'],'equalities':[],'sense':'maximize','value':2},
 {'name':'variable_named_like_module','variables':['_np','x'],'objective':'(_np-1)^2+(x-2)^2','inequalities':['_np+x-2'],'equalities':[],'expected':[.5,1.5],'value':.5},
 {'name':'functions_and_numeric_constants','variables':['x','y'],'objective':'sin(x)^2+(y-log(e))^2','inequalities':[],'equalities':['x'],'expected':[0,1],'value':0},
]
checks=[];errors=[]
try:
 with sync_playwright() as pw:
  args={'headless':True,'args':['--no-sandbox']}
  if os.getenv('CHROMIUM_PATH'):args['executable_path']=os.environ['CHROMIUM_PATH']
  browser=pw.chromium.launch(**args);c=browser.new_context(accept_downloads=True,viewport={'width':1440,'height':1000},reduced_motion='reduce')
  c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(('http://127.0.0.1:8913/','data:','blob:')) else r.abort())
  for case in cases:
   p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
   model={'name':case['name'],'objective':case['objective'],'objective2':'','sense':case.get('sense','minimize'),'algorithm':'cmaes','variables':[{'name':v,'lower':-5,'upper':5,'start':.2} for v in case['variables']], 'inequalities':case['inequalities'],'equalities':case['equalities']}
   cfg={'model':model,'settings':{'maxIterations':500,'feasibilityTolerance':1e-9,'algorithm':'cmaes'}}
   token=base64.urlsafe_b64encode(json.dumps(cfg).encode()).decode().rstrip('=')
   try:
    p.goto('http://127.0.0.1:8913/site/optimization.html?state='+token,wait_until='domcontentloaded')
    p.wait_for_function('!!window.FokoNativePrepare',timeout=20000)
    control=p.locator('#exportOptimizationPython')
    ancestors=control.locator('xpath=ancestor::details[not(@open)]')
    for i in range(ancestors.count()-1,-1,-1):ancestors.nth(i).locator(':scope > summary').click()
    with p.expect_download(timeout=15000) as dl:control.click()
    file=OUT/(case['name']+'.py');dl.value.save_as(file)
    completed=subprocess.run([sys.executable,str(file)],capture_output=True,text=True,timeout=20)
    assert completed.returncode==0,completed.stderr
    observed=json.loads(completed.stdout);assert observed['success'] and observed['feasible'],observed
    assert abs(observed['reported_objective']-case['value'])<1e-6,observed
    if 'expected' in case:assert all(abs(a-b)<1e-5 for a,b in zip(observed['x'],case['expected'])),observed
    assert observed['max_constraint_violation']<=1e-8,observed
    checks.append({'name':case['name'],'passed':True,'expected':case.get('expected'),'expected_objective':case['value'],'observed':observed})
    print('PASS',case['name'],observed['x'],flush=True)
   except Exception as e:
    checks.append({'name':case['name'],'passed':False,'error':str(e)})
    print('FAIL',case['name'],str(e),flush=True)
   finally:p.close()
  browser.close()
finally:server.shutdown()
report={'scope':'Actual Chromium-exported Python scripts executed independently with SciPy SLSQP; analytic constrained optimum checks; not equivalence to the native browser search algorithm.', 'checks':checks,'page_errors':errors,'passed':len(checks)==len(cases) and all(c['passed'] for c in checks) and not errors}
(OUT/'verification.json').write_text(json.dumps(report,indent=2));sys.exit(0 if report['passed'] else 1)
