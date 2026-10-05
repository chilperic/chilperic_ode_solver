"""Apply the 80.3 integration to the committed application baseline.
Numerical engines, portrait and existing CV PDFs are not replaced.
"""
from pathlib import Path
import json,re,hashlib
from html import escape as E
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'site';changes=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def put(path,text,reason):
 p=ROOT/path;old=sha(p) if p.exists() else None;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text,encoding='utf-8');changes.append({'path':path,'before':old,'after':sha(p),'reason':reason})
def patch(path,fn,reason):
 p=ROOT/path;before=p.read_text();after=fn(before)
 if before!=after:put(path,after,reason)
def hook(path,anchor,body):
 def edit(s):
  assert anchor in s,path+' missing '+anchor
  return s.replace(anchor,'window.FokoNativePrepare = function(name) { '+body+' };\n  '+anchor,1)
 patch(path,edit,'Expose native input preparation separately from computation.')
protected={str(p.relative_to(SITE)):sha(p) for p in SITE.rglob('*') if p.is_file() and (p.suffix=='.pdf' and ('cv' in p.parts) or p.name=='profile-chilperic.webp')}
engines={str(p.relative_to(SITE)):sha(p) for folder in ['plants','leaf','tcells','lipids','continuum','shared','src/core'] for p in (SITE/folder).glob('*.js') if 'engine' in p.name or folder=='src/core'}
hooks=[
 ('optimization','loadPreset(name, true);'),('stochastic','loadPreset(name, true);'),('steady','loadPreset(name, true);'),('sensitivity','loadPreset(name);'),('fitting','loadPreset(name, false);'),('statistics','loadPreset(name, false);'),('agent','loadPreset(name, false);'),('networks','loadPreset(name);'),('linalg','loadPreset(name);'),('symbolic','loadPreset(name, false);'),('population-genetics','loadExample(name, true, false);'),('bifurcation','apply(Core.presets.find(p=>p.id===name)||Core.presets[0]);result=null;'),('evolution-landscape','loadPreset(Core.presets.find(p=>p.id===name)||Core.presets[0],false);result=null;'),('advanced-methods','load(name,false);result=null;'),('ai-modeling','applyExample(Core.examples.find(e=>e.id===name)||Core.examples[0]);result=null;')]
for stem,body in hooks:
 path='site/src/v72/'+stem+'-workspace.js';text=(ROOT/path).read_text();anchor='function init()'
 if anchor not in text:
  found=re.search(r'function (?:initialise|initialize|boot|bindEvents|bind)\s*\(',text);assert found,path;anchor=found.group(0)
 hook(path,anchor,body)
p='site/src/v73/model-studio.js';text=(ROOT/p).read_text();anchor='function boot()';assert anchor in text;hook(p,anchor,'loadPreset(name);')
patch('site/src/app.js',lambda s:s+'\nwindow.FokoNativePrepare=function(name){loadExample(name);};\n','Expose native ODE preparation.')
for p in (SITE/'src/v72').glob('*workspace.js'):
 patch(str(p.relative_to(ROOT)),lambda s:s.replace("searchParams.get('autorun') !== '0'","searchParams.get('autorun') === '1'"),'Initial expensive computation requires explicit autorun opt-in.')
patch('site/src/v72/agent-workspace.js',lambda s:s.replace('loadPreset(requested&&PRESETS[requested]?requested:state.preset,true)','loadPreset(requested&&PRESETS[requested]?requested:state.preset,false)'),'Prepare Agent without executing.')
for stem in ('linalg','networks'):
 patch('site/src/v72/'+stem+'-workspace.js',lambda s:s.replace('setTimeout(run, 40);',"if(new URLSearchParams(location.search).get('autorun')==='1')setTimeout(run,40);"),'Prepare the first input without automatic computation.')
patch('site/src/v72/symbolic-workspace.js',lambda s:s.replace("loadPreset(requested && Presets[requested] ? requested : 'logistic', true)","loadPreset(requested && Presets[requested] ? requested : 'logistic', false)"),'Separate symbolic preparation from execution.')
patch('site/src/v72/fitting-workspace.js',lambda s:s.replace('setTimeout(runFitting, 60);',"if(new URLSearchParams(location.search).get('autorun')==='1')setTimeout(runFitting,60);"),'Prepare fitting input before execution.')
patch('site/src/v72/population-genetics-workspace.js',lambda s:s.replace("loadExample($('pgExampleSelect').value, true, true)","loadExample($('pgExampleSelect').value, true, false)").replace('loadExample(button.dataset.pgExample, true, true)','loadExample(button.dataset.pgExample, true, false)').replace('loadExample(PRESETS[requested] ? requested : currentExample, false, true)','loadExample(PRESETS[requested] ? requested : currentExample, false, false)'),'Population-genetics cards and selectors prepare inputs.')
patch('site/src/v72/advanced-methods-workspace.js',lambda s:s.replace("load($('advancedSelect').value,true)","load($('advancedSelect').value,false)").replace('load(b.dataset.example,true)','load(b.dataset.example,false)').replace('load(id||PRESETS[0].id,true)','load(id||PRESETS[0].id,false)'),'Advanced-method cards prepare inputs.')
patch('site/src/v72/ai-modeling-workspace.js',lambda s:s.replace('applyExample(example); run();','applyExample(example);'),'Prepare surrogate input before fitting.')
patch('site/src/v72/evolution-landscape-workspace.js',lambda s:s.replace('}), true);','}), false);').replace('apply(preset); showPresetInfo(preset); run();','apply(preset); showPresetInfo(preset);'),'Landscape example cards prepare inputs.')
patch('site/src/v72/sensitivity-workspace.js',lambda s:s.replace("setAttribute('aria-checked'","setAttribute('aria-pressed'"),'Correct toggle semantics on method buttons.')
def opt(s):
 s=s.replace('state.compiledProblem = problem;','state.compiledProblem = problem;\n        state.computedConfiguration = {model:clone(state.model),settings:clone(settings)};',1)
 s=s.replace('      } catch (error) {\n        showError(error);\n      } finally','      } catch (error) {\n        state.result=null;state.pareto=null;state.computedConfiguration=null;\n        showError(error);\n      } finally',1)
 getter="""window.FokoDecisionSource=function(){
    if(!state.result||!state.computedConfiguration)throw Error('Run the optimization first.');
    const now=configuration();
    if(JSON.stringify(now.model)!==JSON.stringify(state.computedConfiguration.model)||JSON.stringify(now.settings)!==JSON.stringify(state.computedConfiguration.settings))throw Error('Inputs changed after this optimization. Run the revised configuration before transferring.');
    return clone({kind:'optimization',model:state.computedConfiguration.model,config:state.computedConfiguration.settings,result:state.result,pareto:state.pareto});
  };\n  """
 return s.replace('window.FokoNativePrepare =',getter+'window.FokoNativePrepare =',1)
patch('site/src/v72/optimization-workspace.js',opt,'Full-objective candidate handoff retains completed settings and rejects failed or edited runs.')
for p in (SITE/'src').rglob('*.js'):
 if 'vendor' in p.parts or 'revision83' in p.parts or 'core' in p.parts:continue
 def aria(s):
  return s.replace('id="provenanceStatus" role="status"','id="provenanceStatus"').replace("id='provenanceStatus' role='status'","id='provenanceStatus'").replace("querySelectorAll('[data-layout]')","querySelectorAll('button[data-layout]')").replace('querySelectorAll("[data-layout]")','querySelectorAll("button[data-layout]")')
 patch(str(p.relative_to(ROOT)),aria,'Restrict interactive ARIA state to actual controls.')
patch('site/design/workspace.js',lambda s:s.replace("dock=el('aside'","dock=el('section'").replace("toolbar.scrollIntoView({block:'start',behavior:'smooth'});",'').replace('actions.append(focus,runProxy);','actions.append(focus);runProxy.hidden=true;actions.append(runProxy);').replace("if(nativeRun?.id==='advRun')nativeRun.hidden=true;",'if(nativeRun)nativeRun.hidden=false;').replace("el('h1','',names[labName]||'Experiment')","el('div','fl-lab-title',names[labName]||'Experiment')"),'Keep a single native Run and avoid nested complementary landmarks and unexpected selection scrolling.')
def shell(s):
 s=s.replace("['cv.html','contact.html','research.html','identity.html','integration-notes.html','trust.html']","['cv.html','contact.html','contributors.html','research.html','identity.html','integration-notes.html','trust.html']")
 s=s.replace("['Contact','contact.html'],['Methods & evidence'","['Acknowledgements','contributors.html'],['Contact','contact.html'],['Methods & evidence'")
 s=s.replace("links=[['Overview','analysis.html'],['Statistics','statistics.html']","links=[['Data & statistics','analysis-studio.html'],['Evolution & optimization','decision-studio.html'],['Statistical workbench','statistics.html']")
 s=s.replace("['Evolution & search','continuum/approaches.html']","['Evolution & search','continuum/approaches.html'],['Trade-off analysis','decision-studio.html']")
 s=s.replace("['Contact & links','contact.html','Email, GitHub, GitLab and personal website']","['Acknowledgements','contributors.html','People, research institutions and funding'],['Contact & links','contact.html','Email, GitHub, GitLab and personal website']")
 return s
patch('site/src/integration/shell.js',shell,'Expose analysis families and attribution in shared navigation.')
p=SITE/'src/integration/registry.js';s=p.read_text();match=re.search(r'r\.FokoIntegration=(.*);\}\)\(globalThis\);',s);assert match
reg=json.loads(match.group(1));reg['version']='80.3.0';reg['tools'].insert(0,['Evolution & optimization analysis','decision-studio.html','Recorded candidates, full-objective Pareto ranks, trade-offs, feasibility and evolutionary events.','Inference'])
for t in reg['resources']:
 if t[1]=='contributors.html':t[0]='Acknowledgements';t[2]='Collaborators, supervisors, institutions, historical research funding and cited model sources.'
put(str(p.relative_to(ROOT)),s[:match.start(1)]+json.dumps(reg,ensure_ascii=False)+s[match.end(1):],'One discoverable workspace registry.')
credits=json.loads((SITE/'contributors.json').read_text());credits['updated']='2026-10-06';credits['institutionalAcknowledgements']=[
 {'name':'Heinrich Heine University Düsseldorf · CCB','role':'Research environment, supervision and collaboration in computational cell biology; the plant programme is associated with CCB and CEPLAS.','url':'https://www.cs.hhu.de/en/research-groups/computational-cell-biology'},
 {'name':'CEPLAS · Cluster of Excellence on Plant Sciences','role':'Plant-science research environment. The 2023 enzyme-kinetic review acknowledges DFG support through CEPLAS, EXC 2048/1, project 390686111. This attributes the cited research, not funding of all FokoLab software under this award.','url':'https://www.ceplas.eu/'},
 {'name':'European Union · Marie Skłodowska-Curie Actions · PoLiMeR','role':'Doctoral training and research through the Horizon 2020 PoLiMeR Innovative Training Network, grant agreement 812616. Funding is acknowledged for the underlying doctoral work, not represented as endorsement of this platform.','url':'https://cordis.europa.eu/project/id/812616'},
 {'name':'African Institute for Mathematical Sciences · AIMS','role':'Mathematical training, research opportunities and scientific community, including AIMS Ghana and the AIMS network, and subsequent research associated with AIMS Cameroon and Rwanda.','url':'https://aims-network.org/'},
 {'name':'University of Cape Coast · University of Yaoundé I · University of Douala','role':'Degree-awarding institutions and mathematical education. Their contribution is distinguished from authorship or funding of the browser application.','url':None},
 {'name':'University of Groningen · University Medical Center Groningen','role':'Scientific collaboration in fatty-acid and metabolic modelling; UMC Groningen coordinated the PoLiMeR network.','url':'https://cordis.europa.eu/project/id/812616'}]
put('site/contributors.json',json.dumps(credits,ensure_ascii=False,indent=2),'Add explicit historical institutional and funding acknowledgements.')
p=SITE/'src/revision82/contributors.js';s=p.read_text();m=re.search(r'r\.FokoContributorRegistry=(.*?);\s*function',s,re.S);assert m
s=s[:m.start(1)]+json.dumps(credits,ensure_ascii=False)+s[m.end(1):];s=s.replace('Contributors & scientific sources','Acknowledgements & scientific sources');put(str(p.relative_to(ROOT)),s,'Align lab-level credits with the institutional record.')
def page(title,main):
 return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} · FokoLab</title><link rel="icon" href="assets/brand/foko-lab-micro.svg"><link rel="stylesheet" href="styles/source-observatory.css"><link rel="stylesheet" href="styles/instrument.css"><link rel="stylesheet" href="styles/revision83.css"><script src="src/integration/registry.js"></script><script src="src/integration/transfer.js"></script><script defer src="src/integration/shell.js"></script></head><body data-foko-integrated="true" data-lab="research"><a class="fl-skip" href="#main-content">Skip to content</a><main class="fl-about" id="main-content">{main}</main></body></html>'''
put('site/contact.html',page('Contact','''<header class="fl-contact-hero"><div><p class="fl-eyebrow">Contact</p><h1>Dr. Chilperic Armel<br>Foko Kuate</h1><p class="fl-intro">Computational biology, mechanistic modelling and scientific software.</p><p>Düsseldorf, Germany</p><nav class="fl-contact-links" aria-label="Contact and professional links"><a href="mailto:chilpericarmel@gmail.com">Email</a><a href="https://chilperic.github.io/">Research website</a><a href="https://github.com/chilperic">GitHub</a><a href="cv.html">CVs · with and without photo</a></nav></div><img src="assets/profile-chilperic.webp" width="300" height="360" alt="Dr. Chilperic Armel Foko Kuate" class="fl-contact-photo"></header><section><h2>Research and collaboration</h2><p>For scientific collaboration, model development, research-software work or teaching enquiries, please use the email link above. Include the model, scientific question or project context.</p><div class="fl-contact-links"><a href="research.html">Research projects</a><a href="contributors.html">Acknowledgements · people and institutions</a><a href="trust.html">Methods and limitations</a></div></section>'''),'Restore the existing unretouched portrait and coherent Contact layout.')
main='<header><p class="fl-eyebrow">People · institutions · sources</p><h1>Acknowledgements</h1><p class="fl-intro">Scientific work is collaborative. Direct contributions, supervision, research support and cited model literature are credited separately.</p></header><nav class="fl-credit-nav" aria-label="Acknowledgement sections"><a href="#institutions">Institutions & funding</a><a href="#plants">Plants</a><a href="#lipids">Doctoral & lipid work</a><a href="#tcells">T-cell work</a><a href="#visual">Visual inspiration</a></nav><section id="institutions"><h2>Institutions and research support</h2><div class="fl-institution-grid">'
for x in credits['institutionalAcknowledgements']:
 main+='<article><h3>'+E(x['name'])+'</h3><p>'+E(x['role'])+'</p>'+('<a href="'+E(x['url'])+'">Institution / award record</a>' if x['url'] else '')+'</article>'
main+='</div><p class="fl-small">Funding statements refer to the underlying research or training. Inclusion does not imply institutional endorsement of FokoLab or a funding award for every module.</p></section>'
for key,label in [('plants','Plant physiology and adaptation'),('lipids','Doctoral research and fatty-acid modelling'),('tcells','T-cell research and model provenance')]:
 record=credits['projects'][key];main+=f'<section class="fl-credit-section" id="{key}"><h2>{label}</h2>'
 for person in record['people']:main+='<div class="fl-credit-row"><h3>'+E(person['name'])+'</h3><p>'+E(person['role'])+'</p></div>'
 main+='<p>'+E(record.get('basis',''))+'</p>'
 refs=record.get('references',[])
 if refs:
  main+='<details><summary>Research sources and attribution basis</summary>'
  for ref in refs:main+='<p><a href="'+E(ref['url'])+'">'+E(ref['title'])+'</a></p>'
  main+='</details>'
 main+='</section>'
main+='''<section id="visual"><h2>Visual explanation and software</h2><p>The explanatory-animation direction is informed by <a href="https://www.3blue1brown.com/">3Blue1Brown</a> and <a href="https://seeing-theory.brown.edu/">Seeing Theory</a>. No authorship of this platform is attributed to them; their branding and artwork have not been copied.</p><p>Scientific references and software licence notices remain with the relevant models and dependencies. Literature-derived model families are not automatically credited as direct collaborations.</p><p><a href="contributors.json">Structured contributor record</a> · <a href="cv.html">Creator profile and CVs</a></p></section>'''
put('site/contributors.html',page('Acknowledgements',main),'Make people and institutions directly discoverable in a readable common design.')
sections=[('Data and statistical inference','analysis-studio.html','Study design, effect estimates, uncertainty, resampling, regression and survival.'),('Evolution and optimization','decision-studio.html','Full-objective Pareto ranks, candidate inspection, trade-offs and event histories.'),('Optimization workbench','optimization.html','CMA-ES diagnostics, constrained search, finite Pareto sampling and native convergence plots.'),('Sensitivity and identifiability','sensitivity.html','Local response, Morris and Sobol methods, and model-specific information.'),('Mechanistic curve fitting','fitting.html','Model fitting, residual diagnostics, parameter uncertainty and linked observations.'),('Statistical workbench','statistics.html','Retained specialist statistical workflows and datasets.'),('Bayesian methods','advanced-methods.html','The existing advanced inference workbench; assumptions remain explicit.'),('Linear algebra and networks','linear-algebra.html','Matrix analysis and structural methods; see also the Networks laboratory.')]
main='<header><p class="fl-eyebrow">Scientific analysis</p><h1>Choose the question, then inspect the evidence.</h1><p class="fl-intro">Use the same recorded result across compatible analyses. Physical time, evolutionary generations and optimizer evaluations remain distinct.</p></header><div class="fl-institution-grid">'
for title,href,desc in sections:main+='<article><h2><a href="'+href+'">'+title+'</a></h2><p>'+desc+'</p></article>'
main+='</div><section><h2>One workflow</h2><p>Select an example to prepare it. Edit the inputs. Run the calculation. Plot choices and playback change the view, not the scientific result. Transfers retain their source configuration and unresolved samples.</p><a href="contributors.html">Acknowledgements</a></section>'
put('site/analysis.html',page('Analysis',main),'Unify scientific families while retaining all specialist laboratories.')
for p in list(SITE.rglob('*.html')):
 if any(x in p.parts for x in ('vendor','book-web')):continue
 soup=BeautifulSoup(p.read_text(),'html.parser')
 if not soup.head or not soup.body:continue
 rel=str(p.relative_to(SITE));prefix='../'*(len(p.relative_to(SITE).parents)-1)
 for node in soup.select('dd[role="status"]'):node.attrs.pop('role',None);node['aria-live']='polite'
 for node in soup.select('[aria-pressed]'):
  if node.name not in ('button','input') and node.get('role') not in ('button',):node.attrs.pop('aria-pressed',None)
 for node in soup.select('aside aside'):node.name='section';node['aria-label']=node.get('aria-label','Input configuration')
 for a in soup.find_all('a'):
  if 'Open the v13' in a.get_text():a.string='C3–C4 evolutionary landscape'
  if a.get('href','').split('#')[0].endswith('contributors.html'):a.string='Acknowledgements'
 for footer in soup.find_all('footer'):footer.decompose()
 for node in soup.select('.recovery-provenance,.u-release-tag,.u-publication,.u-extra-labs'):node.decompose()
 for select in soup.find_all('select'):
  if not select.get('aria-label') and not select.get('aria-labelledby') and not select.find_parent('label') and not (select.get('id') and soup.find('label',attrs={'for':select['id']})):
   select['aria-label']=re.sub(r'([a-z])([A-Z])',r'\1 \2',select.get('id','Select option')).replace('_',' ')
 if not any('styles/revision83.css' in l.get('href','') for l in soup.find_all('link')):soup.head.append(soup.new_tag('link',rel='stylesheet',href=prefix+'styles/revision83.css'))
 for js in ['src/revision83/workflow.js','src/revision83/decision-bridge.js','src/revision83/presentation.js']:
  if not any(js in x.get('src','') for x in soup.find_all('script')):soup.head.append(soup.new_tag('script',src=prefix+js,defer=''))
 footer=soup.new_tag('footer',attrs={'class':'fl-site-footer'})
 for label,href in [('Home','index.html'),('Contact','contact.html'),('Acknowledgements','contributors.html'),('Methods & limitations','trust.html')]:
  a=soup.new_tag('a',href=prefix+href);a.string=label;footer.append(a)
 soup.body.append(footer);content=soup.find('main')
 if content:
  if not content.find('h1'):
   h=soup.new_tag('h1',attrs={'class':'fl-page-title'});h.string=(soup.title.get_text().split('·')[0] if soup.title else 'Scientific workspace');content.insert(0,h)
  if not soup.find('a',class_='fl-skip'):
   content['id']=content.get('id','main-content');a=soup.new_tag('a',href='#'+content['id'],attrs={'class':'fl-skip'});a.string='Skip to content';soup.body.insert(0,a)
 if rel=='analysis-studio.html' and not soup.select_one('.fl-analysis-tabs'):
  nav=soup.new_tag('nav',attrs={'class':'fl-analysis-tabs','aria-label':'Analysis family'})
  for title,href in [('Data & statistics','analysis-studio.html'),('Evolution & optimization','decision-studio.html'),('Sensitivity','sensitivity.html'),('Model fitting','fitting.html')]:
   a=soup.new_tag('a',href=href);a.string=title
   if href==rel:a['aria-current']='page'
   nav.append(a)
  soup.select_one('.as-header').insert_after(nav)
 put(str(p.relative_to(ROOT)),str(soup),'Shared presentation, useful attribution, semantic corrections and persistent actions; scientific content retained.')
version=json.loads((SITE/'VERSION.json').read_text());version.update(version='80.3.0',release='Unified workflows, evolutionary analysis and scientific attribution',updated='2026-10-06',baseline_commit='ea0d099c38c09e7ab44955c436b1565e10b5c68b',verification='audit-80.3.json');put('site/VERSION.json',json.dumps(version,indent=2),'Version the actual integrated application.')
patch('site/src/revision82/interface.js',lambda s:s.replace("dataset.fokoRelease='80.2.0'","dataset.fokoRelease='80.3.0'"),'Keep internal version metadata current without visible version noise.')
package=json.loads((ROOT/'package.json').read_text());package['version']='80.3.0';put('package.json',json.dumps(package,indent=2),'Synchronize developer package metadata.')
readme=(ROOT/'README.md').read_text().replace('Release **80.2.0**','Release **80.3.0**').replace('Last updated **5 October 2026**','Last updated **6 October 2026**')
readme+='''\n\n## 80.3: shared workflow and evolutionary analysis\n\nSelecting an example prepares native inputs without a separate Load click. The primary Run stays visible in a bottom command bar, with Cancel when the native solver supports interruption and an Inputs shortcut. Plot choices and playback do not rerun the scientific model. Undo example restores the previous draft on the connected dropdowns.\n\n`site/decision-studio.html` analyses explicit 2–6-objective records, including all-objective nondomination, ranks and crowding, linked 2D/3D/parallel views, feasibility, descriptive correlation, exact two-objective hypervolume with a fixed reference, evaluation histories and recorded evolutionary events. Import a completed native multi-objective optimization or evolutionary result; the original record remains in provenance. Failed candidates are excluded from dominance calculations, not replaced by zeros. A finite nondominated set is not a certified global front. Biological generations are not optimizer iterations.\n\nContact uses the existing unmodified portrait. Acknowledgements are linked in the shared navigation and footer, distinguishing collaborators, supervisors, institutions, historical research funding and cited model literature. Marie Skłodowska-Curie / PoLiMeR 812616 and AIMS support are credited without implying endorsement of all browser software. All six CV editions are preserved.\n\nFor executed acceptance and remaining limitations see `site/audit-80.3.json` and `site/AUDIT-80.3.md`. Automated checks are not biological calibration, physical-device certification or full WCAG conformance. The approved `legacy/80.1.0-user-approved` branch is unchanged.\n'''
put('README.md',readme,'Document workflows, scientific scope, credits, limitations and local startup.')
assert all(sha(SITE/p)==h for p,h in protected.items()),'Protected CV/portrait changed'
assert all(sha(SITE/p)==h for p,h in engines.items()),'Original numerical engine changed'
put('site/source-changes-80.3.json',json.dumps({'release':'80.3.0','changes':changes,'protectedFiles':protected,'unchangedEngines':engines},indent=2),'Record changes and preservation evidence separately from test results.')
print(json.dumps({'changed':len(changes),'version':'80.3.0','preservedCVPortraitFiles':len(protected),'preservedEngineFiles':len(engines)}))
