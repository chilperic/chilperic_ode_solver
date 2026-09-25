/* Foko Lab v72.11 authored Workbench controller.
 * Renders a stable adapter contract; it does not move or repair legacy DOM.
 */
(function (root) {
  'use strict';
  const Registry = root.FokoWorkbenchAdapters;
  const Plotly = root.Plotly;
  const PLOT = root.FokoPlotLifecycle;
  if (!Registry || !PLOT) throw new Error('Workbench requires the adapter registry and FokoPlotLifecycle.');

  const $ = function (id) { return document.getElementById(id); };
  const storageKey = 'fokolab:v72.11:workbench-config';
  const state = { adapterId: 'ode', presetId: 'sir', config: null, result: null, layout: 'two', focus: 0, selection: [0, 1], running: false };
  let toastTimer = null;

  function safe(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]; }); }
  function clone(value) { return Registry.clone(value); }
  function setPath(object, path, value) { const parts = String(path).split('.'); let target = object; parts.slice(0, -1).forEach(function (key) { if (!target[key] || typeof target[key] !== 'object') target[key] = {}; target = target[key]; }); target[parts[parts.length - 1]] = value; }
  function getPath(object, path) { return String(path).split('.').reduce(function (value, key) { return value == null ? undefined : value[key]; }, object); }
  function adapter() { return Registry.get(state.adapterId); }
  function preset() { return adapter().presets[state.presetId] || adapter().presets[adapter().defaultPreset]; }
  function showToast(message) { const el = $('wbToast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600); }
  function setStatus(kind, label) { const el = $('wbStatus'); el.className = 'wb-status ' + kind; el.querySelector('strong').textContent = label; }
  function encodeState(value) { const text = JSON.stringify(value); const bytes = new TextEncoder().encode(text); let binary = ''; bytes.forEach(function (byte) { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function decodeState(value) { const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4); const binary = atob(padded); const bytes = Uint8Array.from(binary, function (char) { return char.charCodeAt(0); }); return JSON.parse(new TextDecoder().decode(bytes)); }
  function download(name, text, type) { const blob = new Blob([text], { type: type || 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 500); }

  function readRoute() {
    const params = new URLSearchParams(location.search);
    if (params.has('state')) {
      try { const saved = decodeState(params.get('state')); if (Registry.get(saved.adapterId)) { state.adapterId = saved.adapterId; state.presetId = saved.presetId || Registry.get(saved.adapterId).defaultPreset; state.config = saved.config || null; state.layout = ['two', 'three', 'focus'].includes(saved.layout) ? saved.layout : 'two'; } }
      catch (error) { showToast('Share state could not be read: ' + error.message); }
    } else if (params.has('lab') && Registry.get(params.get('lab'))) {
      state.adapterId = params.get('lab'); state.presetId = params.get('preset') || Registry.get(state.adapterId).defaultPreset;
    } else if (params.has('model') && Registry.legacyModelMap[params.get('model')]) {
      const route = Registry.legacyModelMap[params.get('model')]; state.adapterId = route[0]; state.presetId = route[1];
    }
  }

  function renderAdapterOptions() {
    $('wbAdapter').innerHTML = Registry.ids.map(function (id) { const item = Registry.get(id); return '<option value="' + safe(id) + '">' + safe(item.label) + ' — ' + safe(item.family) + '</option>'; }).join('');
    $('wbAdapter').value = state.adapterId;
  }

  function renderPresetOptions() {
    const item = adapter();
    $('wbPreset').innerHTML = Object.keys(item.presets).map(function (id) { return '<option value="' + safe(id) + '">' + safe(item.presets[id].title) + '</option>'; }).join('');
    if (!item.presets[state.presetId]) state.presetId = item.defaultPreset;
    $('wbPreset').value = state.presetId;
  }

  function renderIdentity() {
    const item = adapter(); const p = preset();
    $('wbAdapterIdentity').innerHTML = '<strong>' + safe(p.title) + '</strong><p>' + safe(item.description) + '</p><p style="margin-top:6px">' + safe(p.note) + '</p><span>same verified core</span>';
    $('wbOpenFocused').href = item.focusedHref;
    $('wbWorkspaceTitle').textContent = item.label + ' workspace';
    $('wbWorkspaceSubtitle').textContent = item.description;
  }

  function renderControls() {
    const item = adapter();
    const fields = item.fields.filter(function (field) { return field.type === 'select' || field.type === 'checkbox' || getPath(state.config, field.path) !== undefined; });
    if (!fields.length) $('wbQuickControls').innerHTML = '<p class="wide" style="color:var(--muted)">This adapter uses the curated configuration below. Open the JSON drawer or the focused lab for advanced editing.</p>';
    else $('wbQuickControls').innerHTML = fields.map(function (field) {
      const id = 'wbField_' + field.path.replace(/[^a-zA-Z0-9]/g, '_'); const value = getPath(state.config, field.path);
      if (field.type === 'checkbox') return '<label class="checkbox-row wide"><input id="' + id + '" data-wb-path="' + safe(field.path) + '" type="checkbox" ' + (value ? 'checked' : '') + '/><span>' + safe(field.label) + '</span></label>';
      if (field.type === 'select') return '<label><span>' + safe(field.label) + '</span><select id="' + id + '" data-wb-path="' + safe(field.path) + '">' + field.options.map(function (option) { return '<option value="' + safe(option) + '" ' + (String(value) === String(option) ? 'selected' : '') + '>' + safe(option.replace(/_/g, ' ')) + '</option>'; }).join('') + '</select></label>';
      return '<label><span>' + safe(field.label) + '</span><input id="' + id + '" data-wb-path="' + safe(field.path) + '" type="number" value="' + safe(value) + '" step="' + safe(field.step == null ? 'any' : field.step) + '"/></label>';
    }).join('');
    $('wbQuickControls').querySelectorAll('[data-wb-path]').forEach(function (control) {
      control.addEventListener('input', function () {
        const path = control.dataset.wbPath; const value = control.type === 'checkbox' ? control.checked : control.tagName === 'SELECT' ? control.value : Number(control.value);
        setPath(state.config, path, value); syncJson(); clearResult('Configuration changed. Run the analysis to regenerate evidence.');
      });
    });
    syncJson();
  }

  function syncJson() { $('wbConfigJson').value = JSON.stringify(state.config, null, 2); }
  function loadPreset(presetId) { const item = adapter(); state.presetId = item.presets[presetId] ? presetId : item.defaultPreset; state.config = item.createConfig(state.presetId); state.result = null; state.selection = [0,1]; renderPresetOptions(); renderIdentity(); renderControls(); clearResult('Preset loaded. Computing…'); runAdapter(); }
  function selectAdapter(id) { if (!Registry.get(id)) return; state.adapterId = id; state.presetId = adapter().defaultPreset; state.config = adapter().createConfig(state.presetId); state.result = null; state.selection = [0,1]; renderPresetOptions(); renderIdentity(); renderControls(); clearResult('Analysis changed. Computing…'); runAdapter(); }

  function clearPlots(message) {
    for (let index = 0; index < 2; index += 1) {
      const target = $('wbPlot' + index);
      PLOT.clear(target, message || 'Run an adapter to create a plot.');
      $('wbPlotTitle' + index).textContent = index === 0 ? 'Primary plot' : 'Diagnostic plot';
      $('wbMeaning' + index).textContent = '';
    }
  }
  function clearResult(message) { state.result = null; clearPlots(message); $('wbMetrics').innerHTML = ''; $('wbWarnings').innerHTML = '<p>' + safe(message || 'No computed evidence.') + '</p>'; $('wbProvenance').innerHTML = '<li>No current computation.</li>'; setStatus('ready','Ready'); }

  function renderMetrics() {
    $('wbMetrics').innerHTML = (state.result.metrics || []).map(function (item) { return '<div class="wb-metric"><small>' + safe(item.label) + '</small><strong>' + safe(item.value) + '</strong>' + (item.detail ? '<span>' + safe(item.detail) + '</span>' : '') + '</div>'; }).join('');
    const warnings = state.result.warnings || [];
    $('wbWarnings').innerHTML = warnings.length ? warnings.map(function (text) { return '<p>' + safe(text) + '</p>'; }).join('') : '<p>No adapter-level warning was emitted. Absence of a warning is not validation of model assumptions.</p>';
    $('wbProvenance').innerHTML = (state.result.provenance || []).map(function (text) { return '<li>' + safe(text) + '</li>'; }).join('');
  }

  function uniqueSelection(plotCount) {
    const used = new Set(); state.selection = state.selection.map(function (index, card) { let next = Number(index); if (!Number.isInteger(next) || next < 0 || next >= plotCount || used.has(next)) next = Array.from({length:plotCount}, function(_,i){return i;}).find(function(i){return !used.has(i);}); if (next == null) next = 0; used.add(next); return next; });
  }
  function renderPlotSelectors() {
    const plots = state.result.plots || []; uniqueSelection(plots.length);
    for (let card = 0; card < 2; card += 1) {
      const select = $('wbPlotSelect' + card); select.innerHTML = plots.map(function (plot,index) { return '<option value="' + index + '" ' + (state.selection[card] === index ? 'selected' : '') + '>' + safe(plot.title) + '</option>'; }).join(''); select.disabled = card >= plots.length;
    }
  
}

  function commonLayout(plot) { return Object.assign({ autosize:true, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff', font:{family:'Inter, system-ui, sans-serif',color:'#26374a',size:12}, hovermode:'closest' }, clone(plot.layout || {})); }
  function renderCard(card) {
    const plots = state.result && state.result.plots ? state.result.plots : []; const plot = plots[state.selection[card]]; const target = $('wbPlot' + card);
    if (!plot) { PLOT.clear(target, 'No distinct compatible output for this panel.'); return; }
    $('wbPlotTitle' + card).textContent = plot.title; $('wbMeaning' + card).textContent = plot.meaning;
    return PLOT.render(target, clone(plot.data), commonLayout(plot), { responsive:true, displaylogo:false, modeBarButtonsToRemove:['lasso2d','select2d'] });
  }
  function renderPlots() {
    const plots = state.result.plots || [];
    $('wbPlotGrid').dataset.plotCount = String(Math.min(plots.length, 2));
    if (state.layout === 'three') state.layout = 'two';
    renderLayout();
    renderPlotSelectors();
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      const grid=$('wbPlotGrid');
      const cards=grid.dataset.layout==='focus'?[state.focus]:[0,1];
      cards.forEach(renderCard);
    });});
  }

  function renderLayout() {
    const grid = $('wbPlotGrid');
    const preferred = state.layout === 'focus' ? 'focus' : 'two';
    const compatibleCount = state.result ? Math.min(2, (state.result.plots || []).length) : 2;
    const report = root.FokoLayoutStability.apply({
      grid: grid,
      preferred: preferred,
      focus: state.focus === 1 ? 'right' : 'left',
      breakpoint: 1024,
      compatibleCount: compatibleCount,
      layoutButtons: '[data-wb-layout]',
      focusButtons: '[data-wb-focus]'
    });
    if(state.result)requestAnimationFrame(function(){requestAnimationFrame(function(){
      const cards=report && report.effective==='focus'?[state.focus]:[0,1];
      cards.forEach(function(card){PLOT.resize($('wbPlot'+card));});
    });});
    return report;
  }
  function chooseLayout(layout) { if (!['two','focus'].includes(layout)) layout = 'two'; state.layout = layout; renderLayout(); if(state.result)renderPlots(); }
  function choosePlot(card, index) {
    if (!state.result) return;
    const other = card === 0 ? 1 : 0;
    state.selection = Registry.swapDistinctSelection(state.selection, card, Number(index), state.result.plots.length);
    renderPlotSelectors();
    renderCard(card);
    if ($('wbPlotGrid').dataset.layout !== 'focus' || state.focus === other) renderCard(other);
  }

  function runAdapter() {
    if (state.running) return; state.running = true; setStatus('running','Computing'); $('wbRun').disabled = true; $('wbRun').textContent = 'Computing…'; clearPlots('Computing one result through the selected adapter…');
    setTimeout(function () {
      try {
        const parsed = JSON.parse($('wbConfigJson').value); state.config = parsed; state.config.preset = state.presetId; const started = performance.now(); const result = adapter().run(clone(state.config)); const elapsed = performance.now() - started; if (!result || !Array.isArray(result.plots) || result.plots.length < 2) throw new Error('This analysis did not produce two compatible views. Open the dedicated lab for more options.'); result.metrics = (result.metrics || []).concat([{label:'Workspace runtime',value:elapsed.toFixed(2)+' ms',detail:'interface overhead'}]); result.provenance = result.provenance || []; state.result = result; state.selection = result.plots.map(function(_,i){return i;}).slice(0,2);  $('wbWorkspaceSubtitle').textContent = result.summary + ' — choose two views to compare.'; renderMetrics(); renderPlots(); setStatus(result.status === 'warning' ? 'warning' : 'success', result.status === 'warning' ? 'Computed with warning' : 'Computed');
      } catch (error) {
        state.result = null; clearPlots('Computation failed. No plot is presented as evidence.'); $('wbWarnings').innerHTML = '<p>' + safe(error.message || error) + '</p>'; $('wbProvenance').innerHTML = '<li>Failed before a valid result contract was created.</li>'; setStatus('error','Failed');
      } finally { state.running=false; $('wbRun').disabled=false; $('wbRun').textContent='Run adapter'; }
    }, 0);
  }

  function currentCard() { return $('wbPlotGrid').dataset.layout === 'focus' ? state.focus : 0; }
  function exportPlot(card, format) { if (!state.result) return showToast('Run an adapter before exporting a plot.'); const target = $('wbPlot' + card); if (!target || !target.data) return showToast('The selected card has no computed plot.'); Plotly.downloadImage(target,{format:format,filename:'fokolab-workbench-' + state.adapterId + '-' + state.result.plots[state.selection[card]].id,width:1400,height:900}); }
  function sessionPayload() { return { release:Registry.VERSION, adapterId:state.adapterId, presetId:state.presetId, config:clone(state.config), layout:state.layout }; }

  function bind() {
    readRoute(); renderAdapterOptions(); if (!Registry.get(state.adapterId)) state.adapterId='ode'; renderPresetOptions(); if (!state.config) state.config=adapter().createConfig(state.presetId); renderIdentity(); renderControls(); chooseLayout(state.layout);
    $('wbAdapter').addEventListener('change', function(){selectAdapter(this.value);}); $('wbPreset').addEventListener('change', function(){loadPreset(this.value);}); $('wbRun').addEventListener('click',runAdapter); $('wbReset').addEventListener('click',function(){loadPreset(state.presetId);});
    $('wbApplyJson').addEventListener('click',function(){try{const next=JSON.parse($('wbConfigJson').value);next.preset=state.presetId;state.config=next;renderControls();clearResult('JSON configuration applied. Run the analysis to regenerate evidence.');showToast('Configuration JSON applied.');}catch(error){showToast('Invalid JSON: '+error.message);}});
    $('wbImportJson').addEventListener('change',function(){const file=this.files&&this.files[0];if(!file)return;const reader=new FileReader();reader.onload=function(){try{const parsed=JSON.parse(String(reader.result||''));if(parsed.adapterId&&Registry.get(parsed.adapterId)){state.adapterId=parsed.adapterId;state.presetId=parsed.presetId||Registry.get(parsed.adapterId).defaultPreset;state.config=parsed.config||Registry.get(parsed.adapterId).createConfig(state.presetId);renderAdapterOptions();renderPresetOptions();renderIdentity();}else{state.config=parsed.config||parsed;}state.config.preset=state.presetId;renderControls();clearResult('Imported adapter configuration. Run the analysis to regenerate evidence.');showToast('Configuration JSON imported.');}catch(error){showToast('Invalid JSON: '+error.message);} $('wbImportJson').value='';};reader.onerror=function(){showToast('Could not read the selected JSON file.');};reader.readAsText(file);});
    document.querySelectorAll('[data-wb-layout]').forEach(function(button){button.addEventListener('click',function(){chooseLayout(button.dataset.wbLayout);});});
    document.querySelectorAll('[data-wb-focus]').forEach(function(button){button.addEventListener('click',function(){state.focus=Number(button.dataset.wbFocus);state.layout='focus';renderLayout();});});
    for(let card=0;card<2;card+=1){$('wbPlotSelect'+card).addEventListener('change',function(){choosePlot(card,this.value);});}
    document.querySelectorAll('[data-wb-download]').forEach(function(button){button.addEventListener('click',function(){exportPlot(Number(button.dataset.wbDownload),'png');});});
    $('wbCurrentPng').addEventListener('click',function(){exportPlot(currentCard(),'png');}); $('wbCurrentSvg').addEventListener('click',function(){exportPlot(currentCard(),'svg');});
    $('wbSave').addEventListener('click',function(){localStorage.setItem(storageKey,JSON.stringify(sessionPayload()));showToast('Workbench configuration saved locally.');});
    $('wbRestore').addEventListener('click',function(){try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(!saved||!Registry.get(saved.adapterId))throw new Error('No valid saved configuration.');state.adapterId=saved.adapterId;state.presetId=saved.presetId||Registry.get(saved.adapterId).defaultPreset;state.config=saved.config;state.layout=saved.layout||'two';renderAdapterOptions();renderPresetOptions();renderIdentity();renderControls();runAdapter();showToast('Saved configuration restored.');}catch(error){showToast(error.message);}});
    $('wbShare').addEventListener('click',async function(){const url=new URL(location.href);url.search='?state='+encodeState(sessionPayload());try{await navigator.clipboard.writeText(url.toString());showToast('Configuration-only share URL copied.');}catch(_){prompt('Copy this configuration URL',url.toString());}});
    $('wbExport').addEventListener('click',function(){if(!state.result)return showToast('Run an adapter before exporting a result.');download('fokolab-workbench-'+state.adapterId+'-result.json',JSON.stringify({release:Registry.VERSION,adapterId:state.adapterId,presetId:state.presetId,config:state.config,status:state.result.status,summary:state.result.summary,metrics:state.result.metrics,warnings:state.result.warnings,provenance:state.result.provenance,raw:state.result.raw},null,2),'application/json');});
    window.addEventListener('resize',function(){renderLayout();},{passive:true});
    runAdapter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true }); else bind();
}(typeof window !== 'undefined' ? window : globalThis));
