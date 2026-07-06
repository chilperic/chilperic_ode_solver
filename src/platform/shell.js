(function(root){'use strict';
const registry=new Map();
function fail(msg){throw new Error('FokoPlatform: '+msg);}
function hasFn(x,k){return x&&typeof x[k]==='function';}
function assertLab(lab){
  if(!lab||typeof lab!=='object') fail('lab descriptor must be an object');
  ['id','title','category'].forEach(k=>{if(!lab[k]||typeof lab[k]!=='string') fail(k+' is required');});
  ['schema','Controls','Result','Plot','engine'].forEach(k=>{if(!hasFn(lab,k)) fail(k+' must be a function');});
  if(registry.has(lab.id)) fail('duplicate lab id '+lab.id);
}
function registerLab(lab){assertLab(lab); registry.set(lab.id,lab); return lab;}
function encodeState(obj){const kit=root.FokoKit; if(kit&&kit.encodeState) return kit.encodeState(obj); return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));}
function decodeState(s){const kit=root.FokoKit; if(kit&&kit.decodeState) return kit.decodeState(s); if(!s) return null; try{return JSON.parse(decodeURIComponent(escape(atob(s))));}catch(e){return null;}}
function el(tag,cls,text){const n=document.createElement(tag); if(cls)n.className=cls; if(text!=null)n.textContent=text; return n;}
function isNodeLike(x){return typeof Node!=='undefined' && x instanceof Node;}
function dispatchDownload(root,name,payload){if(root.FokoKit&&root.FokoKit.downloadJSON)root.FokoKit.downloadJSON(name,payload);}
function renderError(box,err){box.textContent=(err&&err.message)||String(err||'Unknown error'); box.classList.add('foko-shell-error');}
function textFromResultNode(node){if(!node) return ''; const pre=node.querySelector&&node.querySelector('pre.analysis-output:not(.analysis-script), pre[id$="Output"]'); return pre?pre.textContent:(node.textContent||'');}
function parsePayload(output,resultNode){
  if(output&&typeof output==='object'){
    if(output.text){try{return JSON.parse(output.text);}catch(e){}}
    return output;
  }
  const txt=textFromResultNode(resultNode); if(txt){try{return JSON.parse(txt);}catch(e){return {summary:txt};}}
  return {};
}
function fmt(v){if(Array.isArray(v))return v.length+' items'; if(v&&typeof v==='object')return Object.keys(v).length+' fields'; if(typeof v==='number')return Number.isFinite(v)?(Math.abs(v)>=1000?v.toExponential(3):String(Math.round(v*10000)/10000)):'—'; if(v==null||v==='')return '—'; return String(v);}
function flattenMetrics(obj,prefix,out){out=out||[]; if(!obj||typeof obj!=='object')return out; Object.entries(obj).forEach(([k,v])=>{const key=prefix?prefix+'.'+k:k; if(v==null)return; if(typeof v==='number'||typeof v==='string'||typeof v==='boolean')out.push([key,v]); else if(Array.isArray(v)){ if(v.length && typeof v[0]!=='object') out.push([key,v.length+' values']); } else if(out.length<16) flattenMetrics(v,key,out);}); return out;}
function renderCards(host,lab,input,output,resultNode){
  const payload=parsePayload(output,resultNode); const cards=el('section','analysis-result-cards');
  const metrics=flattenMetrics(payload).filter(([k])=>!/script|data|trace|series|residuals|fitted/i.test(k)).slice(0,8);
  if(!metrics.length){metrics.push(['status','computed'],['example',input.preset||input.example||'loaded']);}
  metrics.forEach(([k,v])=>{const c=el('article','analysis-result-card'); c.innerHTML='<small></small><b></b>'; c.querySelector('small').textContent=k.replace(/_/g,' '); c.querySelector('b').textContent=fmt(v); cards.appendChild(c);});
  const drawer=el('details','analysis-raw-drawer'); const sum=el('summary',null,'Export / raw result'); const pre=el('pre','analysis-output'); pre.textContent=(output&&output.text)||textFromResultNode(resultNode)||JSON.stringify(payload,null,2); drawer.append(sum,pre);
  host.replaceChildren(cards,drawer); host.classList.remove('foko-shell-error');
}
function previewRows(input){
  const raw=input&&(input.data||input.matrix||input.edges||input.vector||input.dataset||'');
  const lines=String(raw||'').trim().split(/\n+/).filter(Boolean).slice(0,7);
  return lines.map(line=>line.trim().split(/[;,\t ]+/).filter(Boolean).slice(0,6));
}
function renderPreview(input){const card=el('section','analysis-data-preview'); const h=el('h3',null,'Loaded data'); const table=el('table'); const rows=previewRows(input); rows.forEach((r,i)=>{const tr=document.createElement('tr'); r.forEach(cell=>{const td=document.createElement(i===0?'th':'td'); td.textContent=cell; tr.appendChild(td);}); table.appendChild(tr);}); if(!rows.length){const p=el('p',null,'No preview available.'); card.append(h,p); return card;} card.append(h,table); return card;}

function wrapDataEditors(host){
  host.querySelectorAll('label').forEach(label=>{
    if(label.closest('.analysis-data-editor')) return;
    if(!label.querySelector('textarea')) return;
    const title=(label.childNodes[0]&&label.childNodes[0].textContent||'Raw data').trim()||'Raw data';
    const details=el('details','analysis-data-editor');
    const summary=el('summary',null,'Edit '+title.toLowerCase());
    details.appendChild(summary);
    label.parentNode.insertBefore(details,label);
    details.appendChild(label);
  });
}
function updateExampleCard(card,lab,input){
  const ex=fmt(input&& (input.preset||input.example||input.model||input.mode) || 'loaded example');
  const method=fmt(input&& (input.mode||input.model||input.task||input.plot) || 'analysis');
  card.innerHTML='';
  const eyebrow=el('p','eyebrow','Analysis setup');
  const h=el('h2',null,lab.title);
  const p=el('p',null,'Concrete example: '+ex+'. Method: '+method+'.');
  card.append(eyebrow,h,p);
}

function updateMethodCard(card,input,lab){card.innerHTML=''; const title=el('h3',null,'Method'); const dl=el('dl','analysis-method-grid'); const pairs=[['Lab',lab.title],['Example',input.preset||input.example||'custom'],['Method',input.mode||input.model||input.task||'analysis'],['Plot',input.plot||input.plotMode||'primary diagnostic']]; pairs.forEach(([k,v])=>{const dt=el('dt',null,k); const dd=el('dd',null,fmt(v)); dl.append(dt,dd);}); card.append(title,dl);}
function latexFromPlain(expr){
  let s=String(expr||'').trim();
  if(!s) return '';
  s=s.replace(/\*/g,'\\cdot ');
  s=s.replace(/Vmax/g,'V_{max}').replace(/Km/g,'K_m').replace(/alpha/g,'\\alpha').replace(/beta/g,'\\beta').replace(/theta/g,'\\theta');
  s=s.replace(/exp\s*\(([^()]*)\)/g,'e^{-$1}').replace(/sqrt\s*\(([^()]*)\)/g,'\\sqrt{$1}');
  s=s.replace(/([A-Za-z0-9_{}\\]+)\/\(([^()]*)\)/g,'\\frac{$1}{$2}');
  s=s.replace(/([A-Za-z0-9_{}\\]+)\/([A-Za-z0-9_{}\\]+)/g,'\\frac{$1}{$2}');
  return s;
}
function parseDelimitedTable(txt){
  const lines=String(txt||'').trim().split(/\n+/).filter(Boolean);
  if(!lines.length) return [];
  const delim=lines[0].includes('\t')?'\t':(lines[0].includes(';')?';':',');
  return lines.map(line=>line.split(delim).map(x=>x.trim()));
}
function objectToText(obj, fallback){
  if(obj==null) return '';
  if(Array.isArray(obj)){
    if(obj.length && Array.isArray(obj[0])) return obj.map(r=>r.join(' ')).join('\n');
    if(obj.length && typeof obj[0]==='object') return obj.map(r=>Object.values(r).join(' ')).join('\n');
    return obj.join(' ');
  }
  if(typeof obj==='object') return JSON.stringify(obj,null,2);
  return String(obj);
}
function setControlValue(elm, value){
  if(!elm || value==null) return false;
  elm.value=String(value);
  elm.dispatchEvent(new Event('input',{bubbles:true}));
  elm.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}
function applyUploadedPayload(controlHost, raw, filename){
  const ext=(filename||'').split('.').pop().toLowerCase();
  let obj=null, used=false, note='Loaded '+(filename||'pasted content');
  const text=String(raw||'').trim();
  try{ if(ext==='json' || /^[\[{]/.test(text)) obj=JSON.parse(text); }catch(e){ obj=null; }
  if(obj && typeof obj==='object'){
    const map=[
      ['formula','[data-analysis-formula]'],['model','[data-analysis-formula]'],['equation','[data-analysis-formula]'],
      ['data','#statsData, #fitData, #mlData'],['dataset','#statsData, #fitData, #mlData'],['table','#statsData, #mlData'],
      ['matrix','#laMatrix'],['A','#laMatrix'],['vector','#laVector'],['b','#laVector'],
      ['edges','#netEdges'],['edgeList','#netEdges'],['graph','#netEdges']
    ];
    for(const [key,sel] of map){ if(Object.prototype.hasOwnProperty.call(obj,key)){ used=setControlValue(controlHost.querySelector(sel), objectToText(obj[key]))||used; } }
    if(obj.x && obj.y && controlHost.querySelector('#fitData')){
      const rows=obj.x.map((x,i)=>[x,obj.y[i]].join(' ')).join('\n'); used=setControlValue(controlHost.querySelector('#fitData'), rows)||used;
    }
    if(obj.nodes && obj.edges && controlHost.querySelector('#netEdges')){
      const rows=obj.edges.map(e=>Array.isArray(e)?e.join(' '):[e.source||e.from,e.target||e.to,e.weight||1].join(' ')).join('\n'); used=setControlValue(controlHost.querySelector('#netEdges'), rows)||used;
    }
  }
  if(!used){
    const primary=controlHost.querySelector('#statsData, #fitData, #mlData, #laMatrix, #netEdges, textarea');
    used=setControlValue(primary, text);
  }
  return used?note:'No compatible input field found.';
}
function renderLatexPreview(container, expr){
  const latex=latexFromPlain(expr);
  const target=container.querySelector('[data-analysis-latex-preview]');
  if(!target) return;
  if(!latex){target.textContent='Type a formula such as y = Vmax*S/(Km + S).'; return;}
  if(root.katex){ try{root.katex.render(latex,target,{throwOnError:false,displayMode:true}); return;}catch(e){} }
  target.textContent=latex;
}

const PALETTES={
  scientific:['#0f766e','#2563eb','#dc2626','#7c3aed','#ca8a04','#0891b2','#4f46e5','#16a34a'],
  viridis:['#440154','#414487','#2a788e','#22a884','#7ad151','#fde725'],
  cividis:['#00224e','#123570','#3b496c','#575d6d','#707173','#8a8678','#a59c74','#c3b369','#e1cc55','#fee838'],
  plasma:['#0d0887','#6a00a8','#b12a90','#e16462','#fca636','#f0f921'],
  turbo:['#30123b','#466be3','#1bcfd4','#35f394','#b5de2b','#faba39','#f05b12','#7a0403'],
  mono:['#111827','#374151','#6b7280','#9ca3af','#d1d5db']
};
function labIdentityColors(){
  if(typeof document==='undefined') return ['#0e7c86','#2563eb','#94a3b8'];
  const cs=getComputedStyle(document.body);
  const accent=(cs.getPropertyValue('--lab-accent')||'#0e7c86').trim();
  const strong=(cs.getPropertyValue('--lab-accent-strong')||accent).trim();
  return [accent,strong,'#94a3b8'];
}
function paletteColors(name){return name==='lab-identity'?labIdentityColors():(PALETTES[name]||PALETTES.scientific);}
function paletteScale(name,colors){
  if(name==='mono') return 'Greys';
  if(name==='viridis') return 'Viridis';
  if(name==='cividis') return 'Cividis';
  if(name==='plasma') return 'Plasma';
  if(name==='turbo') return 'Turbo';
  if(name==='lab-identity') return [[0,'#f8fafc'],[0.5,colors[0]||'#0e7c86'],[1,colors[1]||colors[0]||'#0e7c86']];
  return [[0,'#f8fafc'],[0.5,colors[0]||'#0f766e'],[1,colors[1]||'#2563eb']];
}
function applyPlotPalette(host,name){
  const gd=host&&host.querySelector&&host.querySelector('.js-plotly-plot');
  if(!gd||!root.Plotly) return;
  const colors=paletteColors(name);
  try{root.Plotly.relayout(gd,{colorway:colors});}catch(e){}
  (gd.data||[]).forEach((tr,i)=>{
    const c=colors[i%colors.length]||colors[0]||'#0e7c86';
    const type=tr.type||'scatter';
    const update={};
    if(['scatter','scatter3d','bar','box','violin'].includes(type)){
      update['marker.color']=c;
      update['line.color']=c;
      if(type==='box'||type==='violin') update.fillcolor=c;
    }
    if(type==='histogram'){
      update['marker.color']=c;
      update['marker.line.color']=colors[1]||c;
    }
    if(type==='heatmap'||type==='surface'){
      update.colorscale=paletteScale(name,colors);
    }
    try{if(Object.keys(update).length) root.Plotly.restyle(gd,update,[i]);}catch(e){}
  });
}
function flashSection(node){if(!node) return; node.classList.add('analysis-section-focus'); setTimeout(()=>node.classList.remove('analysis-section-focus'),900); try{node.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}}

/* legacy markers for tests and behavior audit: typeof lab.PlotSecondary==='function'; Interactive: changing a plot recomputes or redraws immediately.; Computing primary plot; Computing third panel */
function mount(rootEl, id){
  if(typeof document==='undefined') fail('mount requires a browser document');
  if(!rootEl||!rootEl.appendChild) fail('mount requires a DOM element');
  const lab=registry.get(id||rootEl.dataset.lab||new URLSearchParams(location.search).get('lab')) || [...registry.values()][0];
  if(!lab) fail('no registered lab available');
  let state=Object.assign({}, lab.template||{}, decodeState((location.hash||'').replace(/^#state=/,''))||{});

  const dashboard=el('section','analysis-dashboard-shell analysis-dashboard-v33');
  const statusStrip=el('header','analysis-dashboard-top analysis-live-status');
  statusStrip.innerHTML='<div class="analysis-brand-chip"><span class="analysis-dot">●</span><b data-foko-status="state">Ready</b></div><div class="analysis-info-chip"><span>Lab</span><b>'+lab.title+'</b></div><div class="analysis-info-chip"><span>Example</span><b data-foko-status="example">Loaded</b></div><div class="analysis-info-chip"><span>Workspace</span><b>3 panels</b></div><nav class="analysis-session-actions" aria-label="Session actions"><button type="button" data-shell-v71="save">Save session</button><button type="button" data-shell-v71="load">Restore session</button><button type="button" data-shell-v71="url">Copy share URL</button><button type="button" data-shell-v71="export">Export bundle</button><button type="button" data-shell-v71="import">Import bundle</button></nav>';

  const frame=el('section','analysis-cockpit focused-analysis-frame analysis-wide-workspace analysis-implementation-ready');
  const left=el('aside','analysis-cockpit-controls work-panel controls analysis-input-rail');
  const right=el('section','analysis-cockpit-workspace workspace analysis-main-workspace');

  const mode=el('section','analysis-mode-strip mode-strip analysis-workflow-tabs');
  mode.innerHTML='<button type="button" class="mode-tab" data-analysis-tab="example">Concrete example</button><button type="button" class="mode-tab active" data-analysis-tab="input">User input</button><button type="button" class="mode-tab" data-analysis-tab="upload">Upload data</button>';
  const controlHost=el('div','analysis-control-host analysis-native-controls');
  const userInput=el('section','analysis-user-input-card analysis-model-data-input');
  userInput.innerHTML='<h3>Model / Data Input</h3><label class="analysis-paste-label">Paste data / model input<textarea data-analysis-paste rows="7" placeholder="price,sqft,bedrooms,bathrooms,age\n245000,1400,3,2,15\n312000,1600,3,2,10"></textarea></label><section class="analysis-upload-zone"><h4>Upload data</h4><label class="analysis-dropzone"><input type="file" data-analysis-upload accept=".csv,.tsv,.json,.txt,.yaml,.yml,.dat,.edges,.matrix"><span>Drag & drop or browse files</span><small>CSV · TSV · JSON · TXT · YAML · DAT · EDGES · MATRIX</small></label><p class="analysis-upload-status" data-analysis-upload-status>Upload data or paste custom input.</p></section><label class="analysis-formula-label">Type your model / formula<textarea data-analysis-formula rows="2" placeholder="price ~ sqft + bedrooms + bathrooms + age"></textarea></label><div class="analysis-latex-preview" data-analysis-latex-preview>Type a formula such as price ~ sqft + bedrooms.</div>';

  const actions=el('section','actionbar analysis-actions analysis-run-actions');
  const run=el('button','primary run-button analysis-run-main','▶ Run analysis'); run.type='button';
  const reset=el('button','ghost subtle analysis-reset','Reset example'); reset.type='button';
  const download=el('button','ghost subtle analysis-export','Export result'); download.type='button';
  actions.append(run,reset,download);

  const plotGrid=el('div','analysis-plot-grid analysis-plot-grid-three analysis-v33-plot-grid');
  function makePlotPanel(slot,label,attr,defaultPalette){
    const card=el('article','analysis-plot-card analysis-plot-'+slot); card.dataset.plotSlot=slot;
    const head=el('div','analysis-plot-card-head');
    const title=el('strong',null,label);
    const picker=el('label','analysis-plot-picker analysis-plot-picker-'+slot); picker.innerHTML='<span>'+label+'</span><select '+attr+'></select>';
    const pal=el('label','analysis-palette-picker'); pal.innerHTML='<span>Palette</span><select data-analysis-palette="'+slot+'"><option value="lab-identity">Lab identity</option><option value="scientific">Scientific</option><option value="viridis">Viridis</option><option value="cividis">Cividis</option><option value="plasma">Plasma</option><option value="turbo">Turbo</option><option value="mono">Mono</option></select>';
    const size=el('button','analysis-plot-size','⛶'); size.type='button'; size.title='Toggle wide view'; size.dataset.analysisSize=slot;
    head.append(title,picker,pal,size);
    const body=el('div','analysis-plot-body'); body.dataset.plotSlot=slot;
    const foot=el('footer','analysis-plot-foot'); foot.innerHTML='<span data-analysis-panel-status="'+slot+'">Ready</span><button type="button" data-analysis-download="'+slot+'">Download</button>';
    card.append(head,body,foot);
    return {card,body};
  }
  const p1=makePlotPanel('primary','Primary plot','data-analysis-primary-plot');
  const p2=makePlotPanel('secondary','Diagnostic plot','data-analysis-secondary-plot');
  const p3=makePlotPanel('tertiary','Third analysis','data-analysis-tertiary-plot');
  const plotHost=p1.body, plotHost2=p2.body, plotHost3=p3.body;
  plotGrid.append(p1.card,p2.card,p3.card);

  const resultHost=el('section','analysis-result-panel results-card analysis-v33-results');
  let lastInput=null,lastOutput=null;
  function onChange(patch){state=Object.assign({},state,patch||{}); try{history.replaceState(null,'','#state='+encodeState(state));}catch(e){}}
  const controls=lab.Controls(state,onChange); if(controls) controlHost.appendChild(controls);
  left.append(mode,userInput,controlHost,actions);
  right.append(plotGrid,resultHost);
  frame.append(left,right); dashboard.append(statusStrip,frame); rootEl.innerHTML=''; rootEl.appendChild(dashboard);

  const pasteBox=userInput.querySelector('[data-analysis-paste]');
  const formulaBox=userInput.querySelector('[data-analysis-formula]');
  function primaryDataEl(){return controlHost.querySelector('#statsData, #fitData, #mlData, #laMatrix, #netEdges, textarea');}
  function syncPasteFromNative(force){const native=primaryDataEl(); if(native && (force||!pasteBox.dataset.userDirty)){pasteBox.value=native.value||'';}}
  function syncPasteToNative(){const native=primaryDataEl(); if(native && pasteBox.value.trim()){setControlValue(native,pasteBox.value);}}
  function clickV71(action){const btn=document.querySelector('#v71SessionBar [data-v71="'+action+'"]'); if(btn){btn.click(); return true;} if(action==='url'&&root.FokoRepro&&root.FokoRepro.replaceURLState){root.FokoRepro.replaceURLState(true); return true;} if(action==='export'&&root.FokoRepro&&root.FokoRepro.exportBundle){root.FokoRepro.exportBundle(); return true;} return false;}

  function cleanControls(){
    controlHost.querySelectorAll('.analysis-button-row').forEach(n=>{n.hidden=true; n.classList.add('analysis-hidden-legacy-actions');});
    controlHost.querySelectorAll('h2').forEach(h=>{ if(/concrete example/i.test(h.textContent||'')) h.remove(); });
    controlHost.querySelectorAll('.analysis-microcopy').forEach(n=>n.remove());
    wrapDataEditors(controlHost);
    const ps=findNativePlotSelect();
    if(ps && ps.closest('label')) ps.closest('label').classList.add('analysis-left-plot-hidden');
  }
  function findNativePlotSelect(){return controlHost.querySelector('select[id$="PlotMode"], select#laPlotMode, select#netPlotMode, select#mlPlotMode');}
  function populatePlotSelectors(){
    const native=findNativePlotSelect();
    const selects=[frame.querySelector('[data-analysis-primary-plot]'),frame.querySelector('[data-analysis-secondary-plot]'),frame.querySelector('[data-analysis-tertiary-plot]')];
    if(!native) return;
    const html=Array.from(native.options).map(o=>'<option value="'+String(o.value).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">'+o.textContent+'</option>').join('');
    selects.forEach(sel=>{ if(!sel) return; if(sel.dataset.sourceId!==native.id||sel.options.length!==native.options.length){sel.innerHTML=html; sel.dataset.sourceId=native.id;} });
    if(selects[0]) selects[0].value=native.value || state.plot || selects[0].value;
    selects.slice(1).forEach((sel,offset)=>{ if(!sel) return; if(!sel.value || sel.value===selects[0].value){const idx=Math.min((selects[0]?.selectedIndex||0)+offset+1, Math.max(0,sel.options.length-1)); sel.selectedIndex=idx;} });
  }
  function setStatus(txt,kind){const st=statusStrip.querySelector('[data-foko-status="state"]'); if(st)st.textContent=txt; statusStrip.dataset.state=kind||txt.toLowerCase();}
  function setPanelStatus(slot,txt){const el=statusStrip.ownerDocument.querySelector('[data-analysis-panel-status="'+slot+'"]'); if(el)el.textContent=txt;}
  function renderPlots(){
    if(!lastInput||!lastOutput){
      [plotHost,plotHost2,plotHost3].forEach((h,i)=>{const slot=['primary','secondary','tertiary'][i]; if(!h.children.length){h.innerHTML='<div class="analysis-plot-wait">Run analysis to render this panel.</div>'; setPanelStatus(slot,'Waiting');}});
      return;
    }
    if(!root.Plotly){
      [plotHost,plotHost2,plotHost3].forEach((h,i)=>{const slot=['primary','secondary','tertiary'][i]; h.innerHTML='<div class="analysis-plot-wait">Loading Plotly…</div>'; setPanelStatus(slot,'Loading Plotly');});
      setTimeout(renderPlots,250);
      return;
    }
    populatePlotSelectors();
    const primary=frame.querySelector('[data-analysis-primary-plot]');
    const secondary=frame.querySelector('[data-analysis-secondary-plot]');
    const tertiary=frame.querySelector('[data-analysis-tertiary-plot]');
    const values=[(primary&&primary.value)||lastInput.plot||lastOutput.plot,(secondary&&secondary.value)||lastInput.plot||lastOutput.plot,(tertiary&&tertiary.value)||lastInput.plot||lastOutput.plot];
    [plotHost,plotHost2,plotHost3].forEach((host,i)=>{
      const slot=['primary','secondary','tertiary'][i]; const name=values[i]; host.dataset.plotName=name; setPanelStatus(slot,'Drawing '+name+'…');
      const input=Object.assign({},lastInput,{plot:name}); const output=Object.assign({},lastOutput,{plot:name});
      try{lab.Plot(input,output,host); const pal=frame.querySelector('[data-analysis-palette="'+slot+'"]'); applyPlotPalette(host,(pal&&pal.value)||'lab-identity'); setPanelStatus(slot,'Rendered '+name);}catch(err){host.innerHTML='<div class="analysis-plot-error">'+((err&&err.message)||String(err))+'</div>'; setPanelStatus(slot,'Error');}
    });
  }
  function refreshPreviewAndCards(input,output,resultNode){renderCards(resultHost,lab,input,output,resultNode);}
  let timer=0,seq=0;
  function runOnce(){
    syncPasteToNative();
    const my=++seq; clearTimeout(timer); setStatus('Running…','running'); run.disabled=true;
    [plotHost,plotHost2,plotHost3].forEach((h,i)=>{const slot=['primary','secondary','tertiary'][i]; setPanelStatus(slot,'Computing…'); h.innerHTML='<div class="analysis-plot-wait">Computing '+(['primary','diagnostic','third'][i])+' panel…</div>';});
    timer=setTimeout(()=>{try{
      if(my!==seq) return;
      const input=lab.schema(state); input.userFormula=(formulaBox||{}).value||''; lastInput=input; syncPasteFromNative(false);
      const output=lab.engine(input); lastOutput=output;
      const ex=statusStrip.querySelector('[data-foko-status="example"]'); if(ex)ex.textContent=(input.preset||input.example||'Custom');
      setStatus('Computed','computed');
      const r=lab.Result(output); refreshPreviewAndCards(input,output,isNodeLike(r)?r:null);
      populatePlotSelectors(); renderPlots();
    }catch(err){setStatus('Error','error'); renderError(resultHost,err);}
    finally{run.disabled=false;}},20);
  }
  function scheduleRun(){ clearTimeout(timer); timer=setTimeout(runOnce,180); }

  cleanControls(); populatePlotSelectors(); syncPasteFromNative(true); if(formulaBox && !formulaBox.value.trim()){formulaBox.value=(lab.id==='statistics'?'price ~ sqft + bedrooms + bathrooms + age':(lab.id==='fitting'?'y = Vmax*S/(Km + S)':(lab.id==='linear-algebra'?'A x = b':(lab.id==='networks'?'source -> target [weight]':'y ~ x1 + x2')))); state.userFormula=formulaBox.value;} renderLatexPreview(userInput,formulaBox ? formulaBox.value : '');
  reset.addEventListener('click',()=>{state=Object.assign({},lab.template||{}); rootEl.innerHTML=''; mount(rootEl,lab.id);});
  download.addEventListener('click',()=>{dispatchDownload(root,lab.id+'-result.json',{lab:lab.id,state,input:lastInput,output:lastOutput});});
  run.addEventListener('click',runOnce);
  rootEl.addEventListener('foko-shell-run',()=>runOnce());
  controlHost.addEventListener('change',()=>{populatePlotSelectors(); syncPasteFromNative(false); scheduleRun();});
  controlHost.addEventListener('input',()=>{syncPasteFromNative(false); scheduleRun();});
  frame.addEventListener('change',ev=>{
    const native=findNativePlotSelect();
    if(ev.target&&ev.target.matches('[data-analysis-primary-plot]')){ if(native){native.value=ev.target.value; native.dispatchEvent(new Event('input',{bubbles:true})); native.dispatchEvent(new Event('change',{bubbles:true}));} state.plot=ev.target.value; scheduleRun(); }
    else if(ev.target&&ev.target.matches('[data-analysis-secondary-plot], [data-analysis-tertiary-plot], [data-analysis-palette]')){ renderPlots(); }
  });
  frame.addEventListener('click',ev=>{
    const btn=ev.target.closest('[data-analysis-size], [data-analysis-download]'); if(!btn) return;
    if(btn.dataset.analysisDownload){const slot=btn.dataset.analysisDownload; const gd={primary:plotHost,secondary:plotHost2,tertiary:plotHost3}[slot]?.querySelector('.js-plotly-plot'); if(gd&&root.Plotly) root.Plotly.downloadImage(gd,{format:'png',filename:lab.id+'-'+slot}); return;}
    const slot=btn.dataset.analysisSize; const body={primary:plotHost,secondary:plotHost2,tertiary:plotHost3}[slot]; const card=body&&body.closest('.analysis-plot-card'); if(!card) return; card.classList.toggle('analysis-plot-wide'); plotGrid.classList.toggle('has-wide-plot',card.classList.contains('analysis-plot-wide')); setTimeout(renderPlots,50);
  });
  mode.addEventListener('click',ev=>{const btn=ev.target.closest('[data-analysis-tab]'); if(!btn)return; mode.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('active',b===btn)); const target={example:controlHost,input:userInput,upload:userInput}[btn.dataset.analysisTab]||userInput; flashSection(target);});
  statusStrip.addEventListener('click',ev=>{const b=ev.target.closest('[data-shell-v71]'); if(!b)return; clickV71(b.dataset.shellV71);});
  pasteBox.addEventListener('input',()=>{pasteBox.dataset.userDirty='true'; syncPasteToNative(); scheduleRun();});
  userInput.addEventListener('input',ev=>{ if(ev.target.matches('[data-analysis-formula]')){ renderLatexPreview(userInput,ev.target.value); state.userFormula=ev.target.value; } });
  userInput.addEventListener('change',ev=>{
    if(!ev.target.matches('[data-analysis-upload]')) return;
    const file=ev.target.files&&ev.target.files[0]; if(!file) return;
    const status=userInput.querySelector('[data-analysis-upload-status]'); status.textContent='Reading '+file.name+'…'; setStatus('Running…','running');
    const reader=new FileReader();
    reader.onload=()=>{try{const msg=applyUploadedPayload(controlHost, reader.result, file.name); syncPasteFromNative(true); status.textContent=msg; populatePlotSelectors(); scheduleRun();}catch(err){status.textContent='Upload error: '+((err&&err.message)||String(err)); setStatus('Error','error');}};
    reader.onerror=()=>{status.textContent='Could not read file.'; setStatus('Error','error');};
    reader.readAsText(file);
  });
  setTimeout(()=>{cleanControls(); populatePlotSelectors(); syncPasteFromNative(true); controlHost.querySelectorAll('.analysis-hidden-legacy-actions').forEach(n=>n.remove());},100);
  setTimeout(()=>{try{runOnce();}catch(e){}},160);
  return {lab,state,run,runOnce,resultHost,plotHost,plotHost2,plotHost3};
}
/* v71.28-v71.32 compatibility markers retained for regression tests: status-strip; CSV / TSV / JSON / TXT / YAML; data-analysis-tab="setup"; Workspace: <b>3 panels</b>; */
/* v71.32 compatibility markers: analysis-plot-primary analysis-plot-secondary analysis-plot-tertiary; plotHost3.dataset.plotSlot='tertiary'; plotToolbar.addEventListener('change' */
const api={registerLab,mount,encodeState,decodeState,_registry:registry};
if(typeof module!=='undefined'&&module.exports)module.exports=api; root.FokoPlatform=api;
}(typeof window!=='undefined'?window:globalThis));
