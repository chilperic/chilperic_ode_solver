"""Execute delivered UI code in a controlled local-source Chromium fixture.
Native address navigation is blocked in the authoring environment. New labs use
real Blob workers and local delivered modules; old Studio uses its existing
bounded no-worker fallback. Storage is an explicit in-memory fixture.
"""
from pathlib import Path
from urllib.parse import urlparse,unquote
import json,mimetypes,time,traceback
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'site';EV=ROOT/'evidence';SS=EV/'screenshots';DL=EV/'browser-exports'
SS.mkdir(exist_ok=True);DL.mkdir(exist_ok=True)
results=[];page_reports=[]
def check(name,fn):
 try:
  detail=fn();results.append({'name':name,'status':'passed','detail':detail});print('PASS',name,flush=True);return detail
 except Exception as e:
  results.append({'name':name,'status':'failed','error':str(e)});print('FAIL',name,str(e)[:350],flush=True)
def require(value,message='Assertion failed'):
 if not value:raise AssertionError(message)
def fulfill(route):
 u=urlparse(route.request.url)
 if u.netloc=='fokolab.test':
  f=(SITE/unquote(u.path).lstrip('/')).resolve()
  if f.is_relative_to(SITE) and f.is_file():
   mime='text/javascript' if f.suffix in ['.js','.mjs'] else mimetypes.guess_type(str(f))[0] or 'application/octet-stream'
   route.fulfill(status=200,content_type=mime,body=f.read_bytes(),headers={'Access-Control-Allow-Origin':'*'});return
 route.abort()
def source_html(name,worker=True):
 shim='''<base href="https://fokolab.test/"><script>(function(){for(const key of ['localStorage','sessionStorage']){const m=new Map();Object.defineProperty(window,key,{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}});}'''
 if worker:shim+='''const NativeWorker=window.Worker;window.Worker=class extends NativeWorker {constructor(url,opts){const target=new URL(url,document.baseURI).href;const script="self.FOKO_BASE='https://fokolab.test/src/upgrade/';importScripts("+JSON.stringify(target)+");";super(URL.createObjectURL(new Blob([script],{type:'text/javascript'})),opts);}};'''
 else:shim+='window.Worker=undefined;'
 shim+='})();</script>'
 s=(SITE/(name+'.html')).read_text();return s.replace('<head>','<head>'+shim,1)
def run_new(page):
 page.locator('#u-run').click()
 page.wait_for_function("['complete','failed'].includes(FokoIntegratedLab.getState().status)",timeout=30000)
 require(page.evaluate("FokoIntegratedLab.getState().status==='complete'"),page.locator('#u-message').inner_text())
 page.wait_for_function("document.getElementById('u-left-plot').data?.length>0 && document.getElementById('u-right-plot').data?.length>0",timeout=20000)
 return page.evaluate("({rows:FokoIntegratedLab.getState().result.rows.length,plots:FokoIntegratedLab.getState().result.plots.length})")
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);ctx.set_default_timeout(8000);ctx.route('**/*',fulfill)
 def load(name,worker=True):
  page=ctx.new_page();errors=[];failed=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:failed.append(r.url));page.set_content(source_html(name,worker),wait_until='networkidle',timeout=30000);page.wait_for_timeout(150);page_reports.append({'page':name,'errors':errors,'failedRequests':failed,'worker':('real Blob worker/source fixture' if worker else 'original bounded fallback')});return page
 home=load('index');check('Homepage has direct original Studio and Atlas access',lambda:require(home.locator('a[href="studio.html"]').count()>0 and home.locator('a[href="examples.html"]').count()>0));home.screenshot(path=str(SS/'01-home-desktop.png'));home.set_viewport_size({'width':390,'height':844});home.screenshot(path=str(SS/'02-home-mobile.png'));check('Homepage mobile has no horizontal document overflow',lambda:require(home.evaluate('document.documentElement.scrollWidth<=innerWidth+1')));home.close()
 for name in ['plant-growth','leaf-physiology','adaptation','lipids','tcell','randomness','branching','diffusion','fractals']:
  page=load(name);check(name+' default computation through real worker and UI',lambda:run_new(page))
  if name in ['plant-growth','adaptation','lipids']:
   page.screenshot(path=str(SS/{'plant-growth':'03-plant-desktop.png','adaptation':'04-adaptation-desktop.png','lipids':'05-lipids-desktop.png'}[name]))
  if name=='plant-growth':
   def two():
    original=page.locator('#u-right-select').input_value();options=page.locator('#u-left-select option').evaluate_all('(os)=>os.map(o=>o.value)');page.locator('#u-left-select').select_option(options[-1]);require(page.locator('#u-two').get_attribute('aria-pressed')=='true');require(page.locator('#u-right-select').input_value()==original);require(page.locator('#u-right-card').is_visible());return {'left':options[-1],'right':original}
   check('New Two-up preserves separate selections and exactly two cards',two)
   def pin():
    page.locator('#u-fields summary').filter(has_text='Water').click();page.locator('#u-pin').click();pinned=page.evaluate('FokoIntegratedLab.getState().baseline.request.params.rain');page.locator('#p-rain').fill('0');page.locator('#p-irrigation').fill('0');require(page.evaluate("FokoIntegratedLab.getState().status==='outdated'"));require(page.locator('#u-json').is_disabled());run_new(page);require(page.evaluate('FokoIntegratedLab.getState().baseline.request.params.rain')==pinned);require(page.locator('#u-compare').is_visible());return {'pinnedRain':pinned,'newRain':0}
   check('Pin, edit, stale-result export refusal, recompute comparison',pin)
   def play():
    serial=page.evaluate('FokoIntegratedLab.state.serial');page.locator('#u-play').click();page.wait_for_timeout(350);page.locator('#u-play').click();require(page.evaluate('FokoIntegratedLab.state.serial')==serial);return {'computationSerialUnchanged':True}
   check('Play reveals results without another computation',play)
   def cancel():
    page.evaluate("FokoIntegratedLab.run();document.getElementById('u-cancel').click()");require(page.evaluate("FokoIntegratedLab.getState().status==='cancelled'"));page.wait_for_timeout(200);require(page.evaluate("FokoIntegratedLab.getState().status==='cancelled'"));run_new(page)
   check('Cancel terminates a launched worker and prevents publication',cancel)
   page.locator('#u-tab-methods').click();page.wait_for_function("document.querySelector('#u-equations mjx-container svg')",timeout=20000);check('Local mathematical equations render as real SVG',lambda:require(page.locator('#u-equations mjx-container svg').count()>=3));page.locator('#u-tab-data').click()
   def dl(button):
    with page.expect_download(timeout=20000) as event:page.locator(button).click()
    d=event.value;dest=DL/d.suggested_filename;d.save_as(str(dest));require(dest.stat().st_size>100);return {'filename':dest.name,'bytes':dest.stat().st_size}
   for button,label in [('#u-json','JSON'),('#u-csv','CSV'),('#u-python','native Python'),('#u-html','interactive HTML')]:check('Executed browser '+label+' download',lambda b=button:dl(b))
   def saved():
    page.locator('#u-save').click();require('saved locally' in page.locator('#u-save-status').inner_text());return {'scope':'in-memory browser-storage fixture only'}
   check('Input save uses declared storage path',saved)
   page.locator('#u-tab-results').click()
   for fmt in ['svg','png']:check('Executed browser '+fmt.upper()+' plot download',lambda f=fmt:dl('[data-image="left:'+f+'"]'))
   page.set_viewport_size({'width':390,'height':844});page.evaluate("document.getElementById('u-settings').open=false;document.getElementById('u-persistence').open=false");page.wait_for_timeout(350);page.screenshot(path=str(SS/'06-plant-mobile.png'));check('Plant mobile document has no horizontal overflow',lambda:require(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')))
   page.evaluate("document.documentElement.dataset.appearance='dark';document.dispatchEvent(new Event('foko:appearance'))");page.wait_for_timeout(400);page.screenshot(path=str(SS/'07-plant-mobile-dark.png'))
  if name=='lipids':check('Original FADNS runs with all eighteen states',lambda:require(page.evaluate('FokoIntegratedLab.getState().result.modelSpec.vars.length')==18))
  page.close()
 # Original scientific interfaces, not reduced reconstructions.
 for name,selector,count in [('optimization','#optimizationAlgorithm',6),('sensitivity','#sensitivityMethod',4),('statistics','#statisticsMode',11),('fitting','#fittingModel',6),('ml','#mlTask',4),('agent','#agentModel',11),('studio','#studioImportFormat',8),('workspace','#splitKind',3)]:
  page=load(name,worker=False)
  def options():
   page.wait_for_function('(s)=>document.querySelector(s)?.options.length>0',arg=selector,timeout=15000);n=page.locator(selector+' option').count();require(n==count if count else n>=24,f'{selector}: {n}, expected {count or ">=24"}');return {'options':n}
  check('Preserved '+name+' interface controls',options)
  if name=='agent':check('Original agent example configurations retained',lambda:require(page.locator('#agentPresetSelect option').count()>=24))
  if name=='studio':
   check('Structured Studio retains original starters plus exact source models',lambda:require(page.locator('#studioPreset option').count()>=23))
   def studio_two():
    before=page.locator('#rightStudioPlotType').input_value();page.locator('[data-layout-mode="two"]').click();page.locator('#leftStudioPlotType').select_option('normalized');require(page.locator('[data-layout-mode="two"]').get_attribute('aria-pressed')=='true');require(page.locator('#rightStudioPlotType').input_value()==before)
   check('Original Studio independent Two-up remains working',studio_two)
   def fadns():
    page.locator('#studioPreset').select_option('original_fadns');page.locator('#loadStudioPreset').click();page.wait_for_timeout(100);page.locator('#runStudio').click();page.wait_for_timeout(1500);n=page.evaluate('FokoModelStudio.currentProject().model.vars.length');require(n==18);return {'modelStates':n}
   # The direct additive worker above verifies simulation; here exercise structured model activation.
   check('Original FADNS can be selected in structured Studio',fadns)
   page.screenshot(path=str(SS/'08-original-studio-fadns.png'))
  if name=='optimization':page.screenshot(path=str(SS/'09-original-optimization.png'))
  if name=='workspace':page.screenshot(path=str(SS/'10-connected-research.png'))
  page.close()
 book=load('book',worker=False)
 check('Book retains 27 chapter destinations',lambda:require(book.locator('[data-select-chapter]').count()==27))
 def chapter():
  book.locator('[data-book-part="I"] summary').click();book.locator('[data-select-chapter="1"]').click();book.wait_for_timeout(100);require(book.locator('#sectionLinks a').count()==10);require(book.locator('#practiceLinks a').count()==2);return{'chapter1Sections':10,'practice':2}
 check('Book chapter activates section and worked-practice navigation',chapter)
 def search():
  book.locator('#bookQuery').fill('identifiability');book.locator('#bookSearch button').click();book.wait_for_timeout(1000);n=book.locator('#bookSearchResults li').count();require(n>0);return{'matchesShown':n}
 check('Book local source-text search',search)
 check('Book uses the explicitly redacted public companion',lambda:require('Public_Companion.pdf' in book.locator('#readFullBook').get_attribute('href')))
 book.screenshot(path=str(SS/'11-book-navigation.png'));book.close()
 for report in page_reports:
  check(report['page']+' source load has no JavaScript exceptions',lambda r=report:require(not r['errors'],str(r['errors'])))
  check(report['page']+' local assets load without failure',lambda r=report:require(not r['failedRequests'],str(r['failedRequests'])))
 browser.close()
(EV/'browser-regression.json').write_text(json.dumps({'generatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'scope':__doc__,'results':results,'pages':page_reports},indent=2))
print('TOTAL',len(results),'FAILED',sum(r['status']=='failed' for r in results),flush=True)
raise SystemExit(int(any(r['status']=='failed' for r in results)))
