/* Experiment workbench. Inputs remain mounted; every run uses the native form and worker. */
(()=>{'use strict';
const body=document.body,main=document.querySelector('main'),labName=body.dataset.lab;
if(!main)return;
const script=document.currentScript.src;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button=(text,fn,cls='')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
const form=main.querySelector('aside form,#advancedForm,#approachForm')||(labName==='continuum'?main.querySelector('form'):null);if(!form)return;
const defaults=Object.fromEntries([...form.querySelectorAll('input[id],select[id],textarea[id]')].map(n=>[n.id,n.type==='checkbox'?n.checked:n.value]));
const desk=el('div','lab-desk instrument-desk'),dock=el('section','experiment-dock lab-inspector'),work=el('div','workbench-main');dock.id='lab-inspector';dock.setAttribute('aria-label','Experiment setup');
const wrapper=form.closest('aside')||form;dock.append(wrapper);for(const child of [...main.children])if(child!==wrapper)work.append(child);desk.append(dock,work);main.append(desk);body.classList.add('has-inspector','has-experiment-dock');
const mobileNav=el('nav','mobile-workbench-switch');mobileNav.setAttribute('aria-label','Mobile experiment view');function mobileView(view){desk.dataset.mobileView=view;for(const b of mobileNav.children)b.setAttribute('aria-pressed',String(b.dataset.view===view));window.dispatchEvent(new Event('resize'));}for(const [id,title]of [['setup','01 Setup'],['results','02 Simulation & plots']]){const b=button(title,()=>mobileView(id));b.dataset.view=id;mobileNav.append(b);}desk.before(mobileNav);mobileView('setup');form.addEventListener('submit',()=>{if(matchMedia('(max-width:760px)').matches&&form.checkValidity())mobileView('results');});
const names={random:'Randomness & branching',plants:'Plant growth',tcells:'T-cell populations',lipids:'Fatty acids & lipids',leaf:'Leaf physiology',evolution:'Evolution & adaptation',continuum:'Evolution & search'};
const toolbar=el('header','lab-toolbar'),copy=el('div','toolbar-copy'),actions=el('div','toolbar-actions');copy.append(el('span','toolbar-eyebrow','SIMULATION WORKSPACE'),el('div','fl-lab-title',names[labName]||'Experiment'));toolbar.append(copy,actions);work.prepend(toolbar);
const nativeRun=document.getElementById('advRun')||form.querySelector('button[type=submit]')||document.getElementById('run');
function reveal(target=form){mobileView('setup');let p=target;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}desk.classList.remove('desk-focus');dock.scrollIntoView({block:'nearest',behavior:'smooth'});target.scrollIntoView({block:'nearest',behavior:'smooth'});if(target.matches('input,select,textarea,button'))target.focus({preventScroll:true});}
const openInspector=()=>reveal();
const runProxy=button('Run experiment',()=>{if(nativeRun?.matches(':disabled'))return;if(form.reportValidity())form.requestSubmit();},'primary experiment-run');
const focus=button('Focus view',()=>{const on=desk.classList.toggle('desk-focus');focus.textContent=on?'Show setup':'Focus view';focus.setAttribute('aria-pressed',String(on));window.dispatchEvent(new Event('resize'));});focus.setAttribute('aria-pressed','false');
actions.append(focus);runProxy.hidden=true;actions.append(runProxy);const cancel=document.getElementById('advCancel');if(cancel)actions.append(cancel);
if(nativeRun){const syncRun=()=>runProxy.disabled=nativeRun.matches(':disabled');new MutationObserver(syncRun).observe(form,{attributes:true,subtree:true,attributeFilter:['disabled']});syncRun();}
if(nativeRun)nativeRun.hidden=false;const oldToggle=document.getElementById('toggleControls');if(oldToggle)oldToggle.hidden=true;
form.addEventListener('invalid',e=>reveal(e.target),true);
const dockHead=el('div','experiment-dock-head');dockHead.append(el('span','toolbar-eyebrow','01 / CONFIGURE'),el('h2','','Experiment setup'));dock.prepend(dockHead);
const search=el('input','parameter-search');search.type='search';search.placeholder='Find a parameter…';search.setAttribute('aria-label','Find a parameter');const hits=el('div','parameter-hits');dockHead.append(search,hits);
const moveCapture=()=>{const record=document.querySelector('.research-capture');if(record&&!dock.contains(record))dock.append(record);};moveCapture();document.addEventListener('DOMContentLoaded',moveCapture,{once:true});
const labelFor=x=>(x.labels?.[0]?.textContent||x.getAttribute('aria-label')||x.id).replace(/\s+/g,' ').trim();
search.oninput=()=>{hits.replaceChildren();const q=search.value.trim().toLowerCase();if(!q)return;const fields=[...form.querySelectorAll('input[id],select[id],textarea[id]')].filter(x=>!x.disabled&&!x.closest('[hidden]')&&(labelFor(x)+' '+x.id).toLowerCase().includes(q));if(!fields.length)hits.append(el('p','','No active parameter matches this model.'));for(const x of fields.slice(0,10))hits.append(button(labelFor(x),()=>reveal(x)));};
const inspector={content:dock};let exampleDialog=null;
function dialog(title){const d=el('dialog','lab-dialog'),h=el('div','lab-dialog-head'),content=el('div','lab-dialog-body');h.append(el('h2','',title),button('Close',()=>d.close()));d.append(h,content);body.append(d);return{d,content};}
const exampleLabel=el('label','toolbar-example','Starting example'),primarySelect=el('select');primarySelect.setAttribute('aria-label','Choose an example');primarySelect.append(el('option','','Loading examples…'));exampleLabel.append(primarySelect);dockHead.after(exampleLabel);
const browse=button('Browse examples',()=>exampleDialog?.d.showModal(),'browse-examples');exampleLabel.append(browse);
const live=el('p','lab-run-status');live.setAttribute('role','status');toolbar.after(live);const statusNodes=['error','status','work','pending','dirty','runStatus','advStatus'].map(id=>document.getElementById(id)).filter(Boolean);
function syncStatus(){const error=document.getElementById('error'),current=error?.textContent.trim()?error:statusNodes.find(x=>!x.hidden&&x.textContent.trim());live.textContent=current?.textContent||'Choose conditions, then run your experiment.';live.classList.toggle('example-error',current===error);}
const statusObserver=new MutationObserver(syncStatus);for(const x of statusNodes)statusObserver.observe(x,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});syncStatus();
const explain=el('section','example-selected');explain.hidden=true;live.after(explain);
 function set(id,value){const x=document.getElementById(id);if(!x)throw Error('Example parameter is unavailable: '+id);if(x.type==='checkbox')x.checked=!!value;else x.value=String(value);if(x.tagName==='SELECT'&&x.value!==String(value))throw Error('Unknown choice for '+id+': '+value);return x;}
 function event(id,type='change'){document.getElementById(id)?.dispatchEvent(new Event(type,{bubbles:true}));}
 function applyExample(example){
  // Cancel in-flight work before replacing settings. Results remain labeled as the previous run.
  for(const id of ['cancel','advCancel','cancelApproach']){const b=document.getElementById(id);if(b&&!b.disabled&&!b.hidden)b.click();}
  for(const [id,v]of Object.entries(defaults))if(document.getElementById(id))set(id,v);
  const v=example.values,lab=body.dataset.lab;if(lab==='evolution')event('advForcing','input');
  if(lab==='lipids'){set('model',v.model||defaults.model);event('model');}
  if(lab==='tcells'){set('generations',v.generations??defaults.generations);event('generations');set('preset',v.preset||'baseline');event('preset');}
  for(const [id,value]of Object.entries(v))set(id,value);
  if(lab==='plants'){
   // Linked examples deliberately apply the complete location profile, then their explicit interventions.
   if(v.climateSource==='profile'){event('location');for(const [id,value]of Object.entries(v))if(!['temperature','amplitude','humidity','wind','rainProbability','initialWater','seasonAmplitude','rainSeasonality'].includes(id))set(id,value);}
   event('climateSource');
  }
  if(lab==='tcells'){event('model');event('distribution');event('deathDistribution');}
  if(lab==='lipids')event('inhibition');
  if(lab==='evolution'&&v.advLocation)document.getElementById('advApplyLocation')?.click();
  form.dispatchEvent(new Event('input',{bubbles:true}));
  explain.hidden=false;explain.replaceChildren(el('strong','',example.title),el('p','',example.question),el('small','',example.tag+' · Settings loaded; press Run experiment to calculate.'));
  window.dispatchEvent(new CustomEvent('lab-example-selected',{detail:example}));exampleDialog?.d.close();window.dispatchEvent(new Event('lab-inputs-loaded'));
 }

window.LabWorkspace={openInspector,applyExample,defaults,reveal};
exampleDialog=dialog('Choose an experiment');const rail=el('div','example-rail');exampleDialog.content.append(rail);rail.append(el('p','examples-intro','Load a scientific question, inspect its conditions, then run. Examples illustrate models; they are not experimental validation.'));
const filter=el('input','rail-search');filter.type='search';filter.placeholder='Search this lab’s examples';filter.setAttribute('aria-label','Search this lab’s examples');const category=el('select','rail-category');category.setAttribute('aria-label','Filter examples by topic');const all=el('option','','All topics');all.value='';category.append(all);const listing=el('div','rail-list'),railStatus=el('p','rail-status');railStatus.setAttribute('role','status');rail.append(filter,category,listing,railStatus);
fetch(new URL('examples.json',script)).then(r=>{if(!r.ok)throw Error('Example library could not load.');return r.json();}).then(data=>{const entries=form.id!=='advancedForm'&&labName==='evolution'?[]:data[labName]||[];if(!entries.length){exampleLabel.hidden=true;return;}browse.textContent='Browse '+entries.length+' examples';primarySelect.replaceChildren();const initial=el('option','','Custom experiment');initial.value='';primarySelect.append(initial);const groups=new Map();for(const e of entries){const topic=e.category||'Experiments';if(!groups.has(topic)){const g=el('optgroup');g.label=topic;groups.set(topic,g);primarySelect.append(g);const o=el('option','',topic);o.value=topic;category.append(o);}const o=el('option','',e.title);o.value=e.id||e.title;groups.get(topic).append(o);const b=button('',()=>load(e),'rail-example');b.dataset.topic=topic;b.append(el('strong','',e.title),el('small','',e.question));listing.append(b);}
 function load(e){try{applyExample(e);primarySelect.value=e.id||e.title;}catch(err){railStatus.textContent=err.message;railStatus.classList.add('example-error');}}
 primarySelect.onchange=()=>{const e=entries.find(x=>(x.id||x.title)===primarySelect.value);if(e)load(e);};const filterList=()=>{let n=0;for(const b of listing.children){b.hidden=!!(category.value&&category.value!==b.dataset.topic)||!b.textContent.toLowerCase().includes(filter.value.toLowerCase());if(!b.hidden)n++;}railStatus.textContent=n+' of '+entries.length+' examples';};filter.oninput=filterList;category.onchange=filterList;filterList();
}).catch(e=>{primarySelect.replaceChildren(el('option','','Examples unavailable'));railStatus.textContent=e.message+' Configure parameters directly or reload.';});
const nav=el('nav','lab-section-links');nav.setAttribute('aria-label','Experiment sections');const targets={plants:[['growthPlants','Growth'],['analysisWorkspace','Plots'],['waterLedger','Resources'],['equations','Equations'],['calibration','Sources'],['exportLab','Export']],evolution:[['advancedLandscape','Landscape'],['evoTraits','Traits'],['globalAnalysis','Sensitivity'],['advancedMethods','Methods'],['advancedExport','Export']],tcells:[['cellCulture','Cells'],['analysisWorkspace','Plots'],['equations','Equations']],lipids:[['molecularA','Molecules'],['analysisWorkspace','Plots'],['equations','Equations']],leaf:[['results','Physiology'],['analysisWorkspace','Plots'],['equations','Equations']],random:[['panels','Simulation'],['analysisWorkspace','Plots']]}[labName]||[];
for(const [id,label]of targets){const a=el('a','',label);a.href='#'+id;a.onclick=e=>{const t=document.getElementById(id);if(!t)return;e.preventDefault();let p=t;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}t.scrollIntoView({block:'start',behavior:'smooth'});};nav.append(a);}live.before(nav);
new MutationObserver(records=>{for(const record of records)for(const child of record.addedNodes)if(child.nodeType===1&&child!==desk)work.append(child);}).observe(main,{childList:true});
})();
