(function(root){'use strict';
const Kit=root.FokoKit;
const RELEASE='72.46.0';
const BUNDLE_SCHEMA='foko.lab.bundle.v1';
function $all(sel){return Array.from(document.querySelectorAll(sel));}
function pageName(){return location.pathname.split('/').pop()||'index.html';}
function pageKey(){return 'fokolab:v71:session:'+pageName();}
function lastBundleKey(){return 'fokolab:v71:last-bundle:'+pageName();}
function safeSet(store,key,value){try{store.setItem(key,value);return true;}catch(e){return false;}}
function safeGet(store,key){try{return store.getItem(key);}catch(e){return null;}}
function safeJSON(raw){try{return JSON.parse(raw);}catch(e){return null;}}
function fieldValue(el){
  if(el.type==='checkbox')return !!el.checked;
  if(el.type==='radio')return el.checked ? el.value : undefined;
  if(el.tagName==='SELECT'&&el.multiple)return Array.from(el.selectedOptions).map(o=>o.value);
  return el.value;
}
function setFieldValue(el,v){
  if(el.type==='checkbox')el.checked=!!v;
  else if(el.type==='radio')el.checked=(el.value===v||v===true);
  else if(el.tagName==='SELECT'&&el.multiple&&Array.isArray(v))Array.from(el.options).forEach(o=>{o.selected=v.includes(o.value);});
  else el.value=v;
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
function collectState(){
  const out={release:RELEASE,page:pageName(),theme:document.documentElement.dataset.theme||'',fields:{},scroll:{x:scrollX||0,y:scrollY||0}};
  $all('input,textarea,select').forEach((el,i)=>{
    if(el.type==='file'||el.type==='button'||el.type==='submit'||el.dataset.v71Ignore==='true')return;
    const key=el.id||el.name||('field_'+i);
    const v=fieldValue(el);
    if(v!==undefined)out.fields[key]=v;
  });
  return out;
}
function collectOutputs(){
  const outputs={};
  $all('pre,output,.analysis-output,.result-panel,.metric-card').forEach((el,i)=>{
    const txt=(el.textContent||'').trim();
    if(txt)outputs[el.id||('output_'+i)]=txt.slice(0,20000);
  });
  return outputs;
}
function applyState(state){
  if(!state||!state.fields)return false;
  Object.entries(state.fields).forEach(([id,v])=>{
    const el=document.getElementById(id)||document.querySelector(`[name="${CSS.escape(id)}"]`);
    if(!el)return;
    setFieldValue(el,v);
  });
  if(state.theme)document.documentElement.dataset.theme=state.theme;
  return true;
}
function createBundle(kind='manual'){
  return {schema:BUNDLE_SCHEMA,release:RELEASE,kind,page:pageName(),title:document.title||'Foko Lab',createdAt:new Date().toISOString(),state:collectState(),outputs:collectOutputs(),location:{pathname:location.pathname,hash:location.hash,search:location.search}};
}
function applyBundle(bundle){
  if(!bundle||bundle.schema!==BUNDLE_SCHEMA)throw new Error('Not a Foko Lab reproducibility bundle.');
  if(!bundle.state||!bundle.state.fields)throw new Error('Bundle has no restorable state.');
  applyState(bundle.state);
  safeSet(sessionStorage,lastBundleKey(),JSON.stringify(bundle));
  return bundle;
}
function encodedState(){return Kit.encodeState(collectState());}
function replaceURLState(copy=false){
  const hash='#state='+encodedState();
  const url=location.pathname+location.search+hash;
  history.replaceState(null,'',url);
  if(copy&&navigator.clipboard)navigator.clipboard.writeText(location.href).catch(()=>{});
}
let persistTimer=null;
function autoPersist(){
  clearTimeout(persistTimer);
  persistTimer=setTimeout(()=>{
    const state=collectState();
    safeSet(sessionStorage,pageKey(),JSON.stringify(state));
    safeSet(localStorage,pageKey()+':autosave',JSON.stringify(state));
    try{replaceURLState(false);}catch(e){}
  },450);
}
function saveLocal(){
  const state=collectState();
  safeSet(localStorage,pageKey(),JSON.stringify(state));
  safeSet(sessionStorage,pageKey(),JSON.stringify(state));
  toast('Session saved.');
}
function loadLocal(){
  const raw=safeGet(localStorage,pageKey())||safeGet(sessionStorage,pageKey())||safeGet(localStorage,pageKey()+':autosave');
  const state=safeJSON(raw);
  if(state&&applyState(state))toast('Session restored.'); else toast('No saved session found.');
}
function saveURL(){replaceURLState(true); toast('Shareable URL copied.');}
function restoreURL(){const m=location.hash.match(/state=([^&]+)/);if(m){const state=Kit.decodeState(m[1]);if(state&&applyState(state)){safeSet(sessionStorage,pageKey(),JSON.stringify(state));return true;}}return false;}
function restoreSessionFallback(){const raw=safeGet(sessionStorage,pageKey());const state=safeJSON(raw);return !!(state&&applyState(state));}
function exportBundle(){const bundle=createBundle('bundle-export');safeSet(sessionStorage,lastBundleKey(),JSON.stringify(bundle));Kit.downloadJSON('foko-lab-bundle-'+pageName().replace(/\.html$/,'')+'.json',bundle);}
function importBundleFile(file){return file.text().then(txt=>{const bundle=safeJSON(txt);if(!bundle)throw new Error('Bundle file is not valid JSON.');applyBundle(bundle);toast('Bundle imported.');});}
function toast(msg){let t=document.getElementById('v71Toast');if(!t){t=document.createElement('div');t.id='v71Toast';t.style.cssText='position:fixed;right:18px;bottom:18px;background:#061B2A;color:white;padding:12px 14px;border-radius:14px;z-index:9999;font-weight:800;box-shadow:0 14px 40px rgba(0,0,0,.24)';document.body.appendChild(t);}t.textContent=msg;clearTimeout(t._timer);t._timer=setTimeout(()=>t.remove(),2200);}
function addSessionBar(){
  if(document.getElementById('v71SessionBar'))return;
  const main=document.querySelector('main');if(!main)return;
  const bar=document.createElement('div');bar.id='v71SessionBar';bar.className='v71-session-bar';bar.setAttribute('aria-label','Reproducibility controls');
  bar.innerHTML='<button class="v71-shell-button" data-v71="save" type="button">Save session</button><button class="v71-shell-button" data-v71="load" type="button">Restore session</button><button class="v71-shell-button" data-v71="url" type="button">Copy share URL</button><button class="v71-shell-button" data-v71="export" type="button">Export bundle</button><button class="v71-shell-button" data-v71="import" type="button">Import bundle</button><input id="v71BundleImport" data-v71-ignore="true" type="file" accept=".json" style="display:none" aria-label="Import Foko Lab bundle">';
  main.insertBefore(bar,main.firstChild);
  const file=bar.querySelector('#v71BundleImport');
  bar.addEventListener('click',e=>{const a=e.target.dataset.v71;if(a==='save')saveLocal();if(a==='load')loadLocal();if(a==='url')saveURL();if(a==='export')exportBundle();if(a==='import')file.click();});
  file.addEventListener('change',()=>{const f=file.files&&file.files[0];if(!f)return;importBundleFile(f).catch(e=>toast(e.message||String(e)));});
}
function installAutoPersistence(){document.addEventListener('input',e=>{if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))autoPersist();},true);document.addEventListener('change',e=>{if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))autoPersist();},true);}
function addUploadHelpers(){const map=[['statistics','statsData'],['ml','mlData'],['network','netEdges'],['fitting','fitData'],['linear algebra','laMatrix']];map.forEach(([kind,id])=>{const ta=document.getElementById(id);if(!ta||ta.dataset.v71Upload)return;ta.dataset.v71Upload='true';const row=document.createElement('div');row.className='v71-upload-row';row.innerHTML='<input data-v71-ignore="true" type="file" accept=".csv,.tsv,.txt,.json" aria-label="Upload '+kind+' template"><button type="button" class="v71-shell-button">Validate template</button><span class="v71-upload-status" aria-live="polite"></span>';ta.parentNode.insertBefore(row,ta.nextSibling);const file=row.querySelector('input'),btn=row.querySelector('button'),status=row.querySelector('span');file.addEventListener('change',async()=>{const f=file.files[0];if(!f)return;ta.value=await f.text();status.textContent='Loaded '+f.name;ta.dispatchEvent(new Event('change',{bubbles:true}));});btn.addEventListener('click',()=>{try{const out=Kit.validateTemplate(kind==='linear algebra'?'statistics':kind,ta.value);status.textContent='OK: '+out.schema.length+' columns, '+out.table.rows.length+' rows.';}catch(e){status.textContent=e.message;}});});}
function addExperimentalOverlayPanel(){if(!/workbench\.html$/.test(location.pathname)||document.getElementById('v71OverlayPanel'))return;const host=document.getElementById('analysisGrid')||document.querySelector('main');if(!host)return;const panel=document.createElement('section');panel.id='v71OverlayPanel';panel.className='analysis-panel v71-overlay-panel';panel.innerHTML='<h2>Experimental data overlay</h2><p>Paste time/value data to keep observations beside the model run.</p><textarea id="v71OverlayData" rows="6" placeholder="time,value,series\n0,1.2,A\n1,2.1,A"></textarea><div class="analysis-button-row"><button class="analysis-run" id="v71SendToFitting" type="button">Send to Fitting Lab</button></div>';host.appendChild(panel);panel.querySelector('#v71SendToFitting').addEventListener('click',()=>{sessionStorage.setItem('fokolab:handoff:fitting',panel.querySelector('#v71OverlayData').value);location.href='fitting.html#handoff=workbench';});}
function installLiveSliders(){let timer=null;$all('input[type="range"]').forEach(el=>{if(el.dataset.v71Live)return;el.dataset.v71Live='true';el.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{const run=document.getElementById('runAll')||document.querySelector('[data-run],button.analysis-run');if(run)run.click();},260);});});}
function restoreHandoff(){if(location.hash.includes('handoff=workbench')){const txt=sessionStorage.getItem('fokolab:handoff:fitting');const ta=document.getElementById('fitData');if(txt&&ta){ta.value=txt;toast('Data received from Workbench.');}}}
function installCommandPalette(){Kit.createCommandPalette([
{label:'Open Workbench',href:'workbench.html',tags:'modeling ode stochastic optimization'},
{label:'Focused ODE + Parametric ODE',href:'ode.html',tags:'dynamics sweep fitting'},
{label:'Focused Stochastic CTMC',href:'stochastic.html',tags:'gillespie tau-leaping uncertainty'},
{label:'Focused Optimization',href:'optimization.html',tags:'constraints search'},
{label:'Focused Steady-State',href:'steady.html',tags:'continuation hopf fold'},
{label:'Statistics: tests and plots',href:'statistics.html',tags:'data inference'},
{label:'Fitting: residual diagnostics',href:'fitting.html',tags:'parameter estimation kinetics'},
{label:'Linear algebra: eigen / SVD / null space',href:'linear-algebra.html',tags:'matrix pca'},
{label:'Network Lab: centrality / community',href:'networks.html',tags:'graph theory'},
{label:'ML Toolkit: classification / PCA',href:'ml.html',tags:'machine learning sciml'},
{label:'Model Atlas',href:'examples.html',tags:'examples registry'},
{label:'Mathematical Beauty',href:'beauty.html',tags:'visual math'},
{label:'Creator CVs',href:'cv.html',tags:'profile research'}]);}
function boot(){if(!Kit)return;const restored=restoreURL();if(!restored)restoreSessionFallback();addSessionBar();installAutoPersistence();addUploadHelpers();addExperimentalOverlayPanel();installLiveSliders();restoreHandoff();installCommandPalette();setTimeout(()=>document.querySelectorAll('[id$="Plot"],.js-plotly-plot').forEach((p,i)=>Kit.attachPlotExport(p,'foko-plot-'+i)),1000);}
root.FokoRepro={collectState,applyState,createBundle,applyBundle,exportBundle,replaceURLState,RELEASE,BUNDLE_SCHEMA};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
}(window));
