"""Corrections from the first actual-browser acceptance run. No numerical engines changed."""
from pathlib import Path
import re,json,hashlib
from bs4 import BeautifulSoup
root=Path('.');site=root/'site';changes=[]
def edit(path,fn,reason):
 p=root/path;s=p.read_text();t=fn(s)
 if t!=s:p.write_text(t);changes.append({'path':path,'before':hashlib.sha256(s.encode()).hexdigest(),'after':hashlib.sha256(t.encode()).hexdigest(),'reason':reason})
# Native controllers update their old status just after preparation; do not let that
# asynchronous copy overwrite the common action contract or imply automatic execution.
def workflow(s):
 old="if(text){inform(text);if(/complete|computed|analysed|analyzed|finished|converged/i.test(text))phase='complete';else if(/error|fail|invalid|infeasible/i.test(text))phase='failed';}"
 new="if(text){if(phase==='ready'&&prepared&&lastDraft&&!/error|invalid|failed/i.test(text)){inform('Example prepared. Review the inputs, then Run.');return;}inform(text);if(/complete|computed|analysed|analyzed|finished|converged/i.test(text))phase='complete';else if(/error|fail|invalid|infeasible/i.test(text))phase='failed';}"
 assert old in s;s=s.replace(old,new)
 s=s.replace("function fields(){return [...d.querySelectorAll('main input,main select,main textarea,form input,form select,form textarea,.lab-inspector input,.lab-inspector select,.lab-inspector textarea')].filter(e=>fieldKey(e)&&e.type!=='file');}","function fields(){const items=[...d.querySelectorAll('main input,main select,main textarea,form input,form select,form textarea,.lab-inspector input,.lab-inspector select,.lab-inspector textarea')].filter(e=>e.type!=='file');items.forEach((e,i)=>{if(!fieldKey(e))e.dataset.flDraftKey='field-'+i;});return items;}")
 s=s.replace("e.getAttribute('data-param')||null","e.getAttribute('data-param')||e.dataset.flDraftKey||null")
 anchor="root.FokoWorkflow={snapshot,getState:"
 insert="""d.addEventListener('invalid',e=>{if(!e.target.form)return;phase='invalid';inform(e.target.validationMessage||'Correct the highlighted input before running.');},true);
 // Selecting a curated card has the same preparation semantics as its dropdown.
 if(sel&&root.FokoNativePrepare){d.addEventListener('click',e=>{const card=e.target.closest('button[data-preset],button[data-example],button[data-pg-example],button[data-ev-preset],button[data-ai-example]');if(!card)return;const name=card.dataset.preset||card.dataset.example||card.dataset.pgExample||card.dataset.evPreset||card.dataset.aiExample;if(![...sel.options].some(o=>o.value===name))return;e.preventDefault();e.stopImmediatePropagation();beforeSelection();root.FokoNativePrepare(name);afterSelection();},true);}
 """
 assert anchor in s;s=s.replace(anchor,insert+anchor)
 return s
edit('site/src/revision83/workflow.js',workflow,'Prevent preparation status races, preserve unnamed input values and standardize curated-card preparation.')
edit('site/src/revision83/decision-core.mjs',lambda s:s.replace("source.model?.secondaryObjective||'Secondary objective'","source.model?.objective2||source.model?.secondaryObjective||'Secondary objective'").replace("unit:'model-declared units'","unit:'not specified by source'").replace("title:'Recorded finite Pareto sample',clock:","title:'Recorded finite Pareto sample',historyKind:'finite Pareto sampling, distinct from the optimizer history',clock:"),'Retain the actual secondary expression; do not imply objective units the source never declared.')
def decisions(s):
 s=s.replace("id==='endpoints'?'Independent replicate'","id==='endpoints'?'Recorded replicate'")
 s=s.replace("label=o=>`${o.label} [${o.unit}]`","label=o=>`${o.label} [${o.unit}] · ${o.direction}`")
 s=s.replace("label:label(o),values:pts.map(p=>p.values[o.key])","label:o.label,values:pts.map(p=>p.values[o.key])")
 s=s.replace("line:{color:pts.map(p=>rank(p)),colorscale:[[0,styles.teal],[1,'#a5b9c0']]}}];caption='Raw-unit", "line:{color:pts.map(p=>rank(p)),colorscale:[[0,styles.teal],[1,'#a5b9c0']]}}];layout.margin={l:100,r:100,t:75,b:55};caption='Raw-unit")
 s=s.replace("caption='Best-so-far among feasible recorded candidates, not an optimality certificate. Evaluations are not biological generations.'", "caption='Best-so-far among feasible recorded candidates, not an optimality certificate. Evaluations are not biological generations.'+(A.input.historyKind?' This is the separate finite Pareto sample, not the optimizer convergence history.':'')")
 s=s.replace("Across-run comparisons need identical reference, units and evaluation windows.'", "Across-run comparisons need identical reference, units and evaluation windows. Intermediate display checkpoints may be omitted; every preceding candidate contributes to each computed checkpoint.'")
 s=s.replace("worker=new Worker(new URL('./decision-worker.mjs',import.meta.url),{type:'module'});worker.onmessage=e=>{worker.terminate();worker=null;e.data.error?reject(Error(e.data.error)):resolve(e.data.result);};worker.onerror=e=>reject(Error(e.message));worker.postMessage({input,reference:ref});", "const w=new Worker(new URL('./decision-worker.mjs',import.meta.url),{type:'module'});worker=w;w.onmessage=e=>{w.terminate();if(worker===w)worker=null;if(token!==runToken)return;e.data.error?reject(Error(e.data.error)):resolve(e.data.result);};w.onerror=e=>{w.terminate();if(worker===w)worker=null;if(token===runToken)reject(Error(e.message));};w.postMessage({input,reference:ref});")
 return s
edit('site/src/revision83/decision-ui.mjs',decisions,'Clarify optimizer sampling clocks, retain full objective directions, avoid clipped parallel labels and isolate worker completion.')
# Probe original inputs by opening their visible disclosure summaries before filling.
def tests(s):
 old="""   el=p.locator('#'+id)
   if el.evaluate('(e)=>e.tagName')=='SELECT':el.select_option(value)"""
 new="""   el=p.locator('#'+id)
   closed=el.locator('xpath=ancestor::details[not(@open)]')
   for i in range(closed.count()-1,-1,-1):closed.nth(i).locator(':scope > summary').click()
   if el.evaluate('(e)=>e.tagName')=='SELECT':el.select_option(value)"""
 assert old in s;s=s.replace(old,new)
 s=s.replace("p.screenshot(path=str(OUT/'decision-desktop.png'))","p.evaluate('window.scrollTo(0,0)');p.screenshot(path=str(OUT/'decision-desktop.png'))")
 return s
edit('tests/finish803_browser.py',tests,'Exercise visible disclosure navigation rather than timing out on intentionally collapsed controls.')
# Resolve the measured semantic failures at source and at dynamic native insertion.
for p in site.rglob('*.html'):
 if 'vendor' in p.parts or 'book-web' in p.parts:continue
 soup=BeautifulSoup(p.read_text(),'html.parser')
 if not soup.body or not soup.head:continue
 for n in soup.select('.skip-link,.fl-skip'):
  # One working skip link inside its own labelled navigation landmark.
  if n!=soup.select('.skip-link,.fl-skip')[0]:n.decompose()
 n=soup.select_one('.skip-link,.fl-skip')
 if n and not n.find_parent('nav'):
  nav=soup.new_tag('nav',attrs={'class':'fl-skip-nav','aria-label':'Skip navigation'});n.wrap(nav)
 for n in soup.select('div[aria-label]'):
  if not n.get('role'):n['role']='region' if n.get('tabindex') is not None else 'group'
 for n in soup.select('.chart-grid [id$="PlotTitle"],.chart-grid h3[id],#sciPlotLabel'):
  if n.name=='h3':n.name='h2'
 for n in soup.select('section[role="region"]'):
  if not n.get('aria-label') and not n.get('aria-labelledby'):n.attrs.pop('role',None)
 for n in soup.select('.table-scroll,#diagnostics'):n['tabindex']='0';n['role']='region';n['aria-label']=n.get('aria-label','Scrollable data and diagnostics')
 for i,n in enumerate(soup.select('aside')):
  if n.find_parent('main') or n.find_parent('aside'):n.name='section';n['aria-label']=n.get('aria-label','Model inputs' if i==0 else 'Additional workspace information')
 tab=soup.select_one('#resultTabs')
 if tab:tab['role']='group'
 edit(str(p),lambda _,t=str(soup):t,'Correct document headings, scrollable data access and named/unique landmarks without hiding scientific content.')
def present(s):
 anchor="const main=d.querySelector('main');"
 insert="""for(const n of d.querySelectorAll('.chart-grid[aria-pressed]')){n.removeAttribute('aria-pressed');new MutationObserver(()=>{if(n.hasAttribute('aria-pressed'))n.removeAttribute('aria-pressed');}).observe(n,{attributes:true,attributeFilter:['aria-pressed']});}
 for(const n of d.querySelectorAll('div[aria-label]:not([role])'))n.setAttribute('role',n.hasAttribute('tabindex')?'region':'group');
 for(const [i,n] of [...d.querySelectorAll('.foko-context')].entries())n.setAttribute('aria-label',i?'Additional related workspaces':'Related scientific workspaces');
 for(const n of d.querySelectorAll('main aside')){n.setAttribute('role','region');n.setAttribute('aria-label',n.getAttribute('aria-label')||'Additional workspace information');}
 const title=d.querySelector('.lab-toolbar .fl-lab-title');if(title){title.setAttribute('role','heading');title.setAttribute('aria-level','1');}
 for(const n of d.querySelectorAll('div[id$="PlotTitle"],.chart-grid h3,#sciPlotLabel')){n.setAttribute('role','heading');n.setAttribute('aria-level','2');}
 const growth=d.querySelector('#growth>.growthHeading>h3');if(growth){growth.setAttribute('role','heading');growth.setAttribute('aria-level','2');}
 for(const n of d.querySelectorAll('.preset-action'))if(n.textContent.trim()==='Load')n.textContent='Select';
 """
 assert anchor in s;return s.replace(anchor,insert+anchor)
edit('site/src/revision83/presentation.js',present,'Correct dynamically created landmark/heading states and remove remaining misleading card labels.')
# Explicitly override older high-specificity light palettes when the selected theme is dark.
extra='''
/* Corrections measured by axe in the first after-audit; no canvas colour/state remapping. */
html body .fl-skip-nav{position:absolute;width:0;height:0;overflow:visible;border:0;margin:0;padding:0}
html body .fl-skip,html body .skip-link{position:fixed!important;left:12px!important;top:0!important;transform:translateY(-160%)!important;min-height:44px!important;padding:12px!important;z-index:10000!important;background:var(--fl-card)!important;color:var(--fl-ink)!important}
html body .fl-skip:focus,html body .skip-link:focus{transform:translateY(0)!important}
html body .fl-command .fl-primary-run,html[data-appearance=dark] body .fl-command .fl-primary-run{background:#176678!important;color:#fff!important;border-color:#176678!important}
html body :is(.fl-analysis-tabs,.as-header,.as-bottom-links,.fl-site-footer,.fl-about) a{color:var(--fl-accent)!important}
html body .fl-command-status{color:var(--fl-ink)!important}
html body :is(.legend,.panelRules,.panelTitle,#traceNote,#methodNote,.leaf-scan,.leaf-diagnosis,.stats,.metrics,.energyMetrics>div,.c4Readout,.c4Numbers,.primaryTemp,.responsePanel,.comparisonState,.growthPlant,.sequence){background:var(--fl-card)!important;color:var(--fl-ink)!important;border-color:var(--fl-line)!important}
html body :is(.legend,.metrics,.stats,.energyMetrics,.leaf-diagnosis,.leaf-scan,.c4Readout,.panelTitle,.panelRules) :is(span,strong,b,p,h2,h3),html body :is(#status,#work,#runStatus,#methodNote,#traceNote,.fl-lab-title){color:var(--fl-ink)!important}
html body :is(.legend,.metrics,.stats,.energyMetrics) :is(small,.hint){color:var(--fl-muted)!important}
html body .legend .c3{color:#116b5c!important}html body .legend .c4{color:#8a4c09!important}html body .legend .cam{color:#315da0!important}
html[data-appearance=dark] body .legend .c3{color:#91dccb!important}html[data-appearance=dark] body .legend .c4{color:#ffd194!important}html[data-appearance=dark] body .legend .cam{color:#bed7ff!important}
html body :is(table,table td,table th){color:var(--fl-ink)!important;border-color:var(--fl-line)!important}html body table th{background:var(--fl-soft)!important}
html body .model-card,html body .model-card.is-active,html body .model-card.active,html body button[data-preset][aria-pressed=true]{background:var(--fl-soft)!important;color:var(--fl-ink)!important;border-color:var(--fl-line)!important}
html body .model-card :is(b,strong,span,small){color:var(--fl-ink)!important}html body .model-card small{color:var(--fl-muted)!important}
html body .model-card .preset-action{color:var(--fl-accent)!important}html body .foko-context>a[aria-current]{color:var(--fl-accent)!important}
html body :is(.type-intermediate,.type-c3,.type-c4) a{display:block;min-height:30px;padding:4px 0}
html body .fl-lab-title{font-size:20px;font-weight:700;line-height:1.3}.as-plot-head select{min-width:0}.as-plot-head label{white-space:nowrap}.as-stage-controls select{max-width:300px;min-width:0}
html[data-appearance=dark] body .lab-toolbar,html[data-appearance=dark] body .lab-toolbar :is(p,span),html[data-appearance=dark] body .lab-summary{background:var(--fl-bg)!important;color:var(--fl-ink)!important}
html[data-appearance=dark] body .preset-status,html[data-appearance=dark] body .meta-chip{color:var(--fl-ink)!important;background:var(--fl-soft)!important}
@media(max-width:650px){.as-stage-controls select{max-width:100%}}
'''
edit('site/styles/revision83.css',lambda s:s+extra,'Fix measured contrast issues in dark cards, labels, links, tables and biological readouts; reserve skip-link focus space.')
# More specific source UI status guards and clearer source metadata.
version=json.loads((site/'VERSION.json').read_text());version['built']='2026-10-06';(site/'VERSION.json').write_text(json.dumps(version,indent=2))
manifest=json.loads((site/'source-changes-80.3.json').read_text());manifest['postIntegrationCorrections']=changes
for category in ('protectedFiles','unchangedEngines'):
 for path,expected in manifest[category].items():assert hashlib.sha256((site/path).read_bytes()).hexdigest()==expected,(category,path)
(site/'source-changes-80.3.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'refinements':len(changes),'protected_files':'unchanged','original_engines':'unchanged'}))
