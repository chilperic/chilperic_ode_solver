"""Additional controlled browser checks: fresh mobile initialization, WebGL fallback, diagnostic UI."""
from pathlib import Path
import json,time
# Reuse the declared local-source fixture without running its complete test sequence.
here=Path(__file__).resolve().parent
# Reuse only fixture definitions, not the main test sequence.
g={'__file__':str(here/'browser_regression.py')};exec(compile((here/'browser_regression.py').read_text().split('with sync_playwright() as p:')[0],str(here/'browser_regression.py'),'exec'),g)
from playwright.sync_api import sync_playwright
results=[];R=here.parent
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844});c.route('**/*',g['fulfill'])
 page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(g['source_html']('plant-growth'),wait_until='networkidle');g['run_new'](page)
 assert not errors,errors;assert not page.locator('#u-persistence').get_attribute('open');assert not page.locator('#u-settings').get_attribute('open')
 page.locator('#u-left-card').scroll_into_view_if_needed();page.wait_for_timeout(200);page.screenshot(path=str(R/'evidence/screenshots/13-plant-mobile-results.png'));results.append({'name':'Fresh mobile initialization and native computation fixture','status':'passed','scope':'390px controlled Chromium, real Blob worker, in-memory storage.'});page.close()
 page=c.new_page();page.set_viewport_size({'width':1440,'height':1000});page.set_content(g['source_html']('adaptation'),wait_until='networkidle');g['run_new'](page);page.locator('#u-right-select').select_option('surface');page.wait_for_timeout(700)
 data=page.locator('#u-right-plot').evaluate('(e)=>({type:e.data?.[0]?.type,text:e.innerText})');assert data['type'] in ['contour','surface'];assert 'WebGL is not supported' not in data['text'],data
 results.append({'name':'3D selection renders or explicitly projects without unsupported overlay','status':'passed','traceType':data['type']});page.screenshot(path=str(R/'evidence/screenshots/14-surface-fallback.png'));page.close()
 page=c.new_page();page.set_content(g['source_html']('verify'),wait_until='networkidle');page.locator('#start-checks').click();page.wait_for_function("!document.getElementById('start-checks').disabled",timeout=60000);rows=page.locator('#check-results tr').evaluate_all('(ts)=>ts.map(t=>t.innerText)');assert len(rows)==11;assert all('\tpassed\t' in r for r in rows),rows
 results.append({'name':'User-run installation diagnostics execute all eleven checks in controlled fixture','status':'passed','rows':rows,'scope':'The fixture storage/worker context is not evidence of normal-origin persistence.'});b.close()
(R/'evidence/browser-edges.json').write_text(json.dumps({'scope':__doc__,'results':results},indent=2));print(json.dumps(results,indent=2))
