/* Structured model/data authoring and scenario workflow. Numerical state stays in
 * workspace.js; this module provides transactional views, not another model store.
 */
(function (root) {
  'use strict';
  function mount(A) {
    const $ = id => document.getElementById(id), D = root.FokoExperimentData, H = root.FokoModelAuthoring;
    const { esc, toast, download } = root.FokoResearchUI, store = root.FokoResearchStore;
    const copy = x => JSON.parse(JSON.stringify(x)), deps = { Project: root.FokoProjectCore, Compute: root.FokoStudioCompute, math: root.math, Data: D };
    const KEY = 'foko:programme:run-evidence:v1', undo = [], redo = [];
    let draft = null, reviewed = null, editorTab = 'states', preview = null, conditionState = {}, pendingRun = null, importing = false;
    const blankCondition = () => ({ parameters: {}, initial: {} });
    function snapshot() { return H.experimentSnapshot(A.state().model, A.state().data); }
    function remember(label, previous) {
      undo.push({ label, value: previous || snapshot() }); if (undo.length > 30) undo.shift(); redo.length = 0; updateUndo();
    }
    function updateUndo() {
      $('undoEdit').disabled = !undo.length; $('redoEdit').disabled = !redo.length;
      $('undoEdit').title = undo.length ? `Undo: ${undo.at(-1).label}` : 'No applied edit to undo';
      $('redoEdit').title = redo.length ? `Redo: ${redo.at(-1).label}` : 'No edit to redo';
    }
    function stepHistory(from, to) {
      if (!from.length) return;
      const change = from.pop(); to.push({ label: change.label, value: snapshot() });
      A.restore(change.value); updateUndo(); toast(`${from === undo ? 'Undid' : 'Redid'}: ${change.label}. Recompute to obtain current evidence.`);
    }
    function fail(id, error) { $(id).textContent = error.message || String(error); }
    function field(id, title, value, type = 'text', extra = '') {
      return `<label class="field" for="${id}">${title}<input id="${id}" type="${type}" value="${esc(value)}" ${type === 'number' ? 'step="any"' : ''} ${extra}></label>`;
    }
    function textfield(id, title, value, rows = 2) {
      return `<label class="field" for="${id}">${title}<textarea id="${id}" rows="${rows}" spellcheck="false">${esc(value)}</textarea></label>`;
    }
    function equation(expression) {
      function node(n) {
        if (n.type === 'SymbolNode') return `<mi>${esc(n.name)}</mi>`;
        if (n.type === 'ConstantNode') return `<mn>${esc(n.value)}</mn>`;
        if (n.type === 'ParenthesisNode') return `<mrow><mo>(</mo>${node(n.content)}<mo>)</mo></mrow>`;
        if (n.type === 'FunctionNode') return `<mrow><mi mathvariant="normal">${esc(n.fn.name)}</mi><mo>(</mo>${n.args.map(node).join('<mo>,</mo>')}<mo>)</mo></mrow>`;
        if (n.type === 'OperatorNode') {
          if (n.op === '/' && n.args.length === 2) return `<mfrac>${node(n.args[0])}${node(n.args[1])}</mfrac>`;
          if ((n.op === '^' || n.op === '**') && n.args.length === 2) return `<msup>${node(n.args[0])}${node(n.args[1])}</msup>`;
          const op = n.op === '*' ? '·' : n.op === '-' ? '−' : n.op;
          return '<mrow>' + (n.args.length === 1 ? `<mo>${esc(op)}</mo>${node(n.args[0])}` : n.args.map(node).join(`<mo>${esc(op)}</mo>`)) + '</mrow>';
        }
        return `<mtext>${esc(expression)}</mtext>`;
      }
      try { return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="${esc(expression)}">${node(root.math.parse(expression))}</math>`; }
      catch (_) { return `<code>${esc(expression)}</code>`; }
    }
    const tabs = [['states', 'States & equations'], ['parameters', 'Parameters'], ['observables', 'Measurements'], ['numerics', 'Numerics & scope']];
    function showEditorTab(id, focus = false) {
      editorTab = id;
      $('editorTabs').querySelectorAll('[data-editor-tab]').forEach(b => { const on = b.dataset.editorTab === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      $('editorContent').querySelectorAll('[data-editor-panel]').forEach(el => { el.hidden = el.dataset.editorPanel !== id; });
    }
    function gather() {
      const m = copy(draft), stateRows = [...$('editorContent').querySelectorAll('[data-state-row]')];
      m.vars = stateRows.map((_, i) => $('ed-s-id-' + i).value.trim());
      m.eqs = stateRows.map((_, i) => $('ed-s-eq-' + i).value);
      m.y0 = stateRows.map((_, i) => $('ed-s-y0-' + i).value);
      m.units = Object.fromEntries(stateRows.map((_, i) => [m.vars[i], $('ed-s-unit-' + i).value]));
      m.stateLabels = Object.fromEntries(stateRows.map((_, i) => [m.vars[i], $('ed-s-label-' + i).value]));
      const pRows = [...$('editorContent').querySelectorAll('[data-parameter-row]')], pIds = pRows.map((_, i) => $('ed-p-id-' + i).value.trim());
      if (new Set(pIds).size !== pIds.length) throw new Error('Parameter symbols must be unique; no row has been overwritten.');
      m.params = Object.fromEntries(pRows.map((_, i) => [pIds[i], ['value', 'min', 'max'].map(k => $('ed-p-' + k + '-' + i).value)]));
      m.parameterMeta = Object.fromEntries(pRows.map((_, i) => [pIds[i], { label: $('ed-p-label-' + i).value, unit: $('ed-p-unit-' + i).value, source: $('ed-p-source-' + i).value }]));
      m.observables = [...$('editorContent').querySelectorAll('[data-observation-row]')].map((_, i) => ({
        id: $('ed-o-id-' + i).value.trim(), expression: $('ed-o-eq-' + i).value, label: $('ed-o-label-' + i).value,
        unit: $('ed-o-unit-' + i).value, source: $('ed-o-source-' + i).value }));
      ['t0', 't1', 'timeUnit', 'points', 'rtol', 'atol', 'maxStep', 'initialStep', 'method'].forEach(k => { m[k] = $('ed-n-' + k).value; });
      m.assumptions = $('ed-assumptions').value.split('\n').map(s => s.trim()).filter(Boolean);
      m.description = $('ed-description').value;
      return m;
    }
    function unreview() { reviewed = null; $('applyStructured').disabled = true; $('structuredDiff').innerHTML = ''; $('editorErrors').textContent = ''; }
    function renderEditor() {
      $('editorTabs').innerHTML = tabs.map(([id, title]) => `<button type="button" role="tab" id="editor-tab-${id}" aria-controls="editor-panel-${id}" data-editor-tab="${id}">${title}</button>`).join('');
      const m = draft;
      const states = m.vars.map((v, i) => `<article data-state-row="${i}" class="editor-row"><div class="row-title"><h3>State ${i + 1}</h3><button class="button quiet" data-remove-state="${i}">Remove state</button></div><div class="editor-state-grid">${field('ed-s-id-' + i, 'Symbol', v)}${field('ed-s-label-' + i, 'Meaning', m.stateLabels?.[v] || v)}${field('ed-s-y0-' + i, 'Initial value', m.y0[i], 'number')}${field('ed-s-unit-' + i, 'Unit', m.units[v] || 'unspecified')}</div>${textfield('ed-s-eq-' + i, `Rate equation · d${esc(v)}/dt`, m.eqs[i])}<div class="equation-preview" id="equation-preview-${i}">${equation(m.eqs[i])}</div><p class="field-error" id="equation-error-${i}"></p></article>`).join('');
      const pars = Object.entries(m.params).map(([k, p], i) => `<article data-parameter-row="${i}" class="editor-row"><div class="row-title"><h3>Parameter ${i + 1}</h3><button class="button quiet" data-remove-parameter="${i}">Remove parameter</button></div><div class="editor-param-grid">${field('ed-p-id-' + i, 'Symbol', k)}${field('ed-p-label-' + i, 'Meaning', m.parameterMeta?.[k]?.label || k)}${field('ed-p-unit-' + i, 'Unit', m.parameterMeta?.[k]?.unit || 'unspecified')}${field('ed-p-value-' + i, 'Nominal value', p[0], 'number')}${field('ed-p-min-' + i, 'Lower bound', p[1], 'number')}${field('ed-p-max-' + i, 'Upper bound', p[2], 'number')}</div>${field('ed-p-source-' + i, 'Source or justification', m.parameterMeta?.[k]?.source || '')}</article>`).join('');
      const obs = (m.observables || []).map((o, i) => `<article data-observation-row="${i}" class="editor-row"><div class="row-title"><h3>Measurement ${i + 1}</h3><button class="button quiet" data-remove-observation="${i}">Remove measurement</button></div><div class="editor-observation-grid">${field('ed-o-id-' + i, 'Observable ID in data', o.id)}${field('ed-o-label-' + i, 'Measurement name', o.label)}${field('ed-o-unit-' + i, 'Measurement unit', o.unit)}</div>${textfield('ed-o-eq-' + i, 'Observation operator h(states, parameters, t)', o.expression)}<div class="equation-preview" id="observation-preview-${i}">${equation(o.expression)}</div><p class="field-error" id="observation-error-${i}"></p>${field('ed-o-source-' + i, 'Calibration / source', o.source || '')}</article>`).join('');
      $('editorContent').innerHTML = `<section data-editor-panel="states" id="editor-panel-states" role="tabpanel" aria-labelledby="editor-tab-states"><p class="small muted">States carry memory; each needs an initial value and a rate equation. Symbols used in equations must be declared.</p>${states}<button class="button" id="addState">Add a state</button></section>
      <section data-editor-panel="parameters" id="editor-panel-parameters" role="tabpanel" aria-labelledby="editor-tab-parameters"><p class="small muted">Bounds guide experiments and fitting. Equal bounds fix a parameter; these are not confidence intervals.</p>${pars}<button class="button" id="addParameter">Add a parameter</button></section>
      <section data-editor-panel="observables" id="editor-panel-observables" role="tabpanel" aria-labelledby="editor-tab-observables"><div class="observation-explainer"><strong>What does the instrument measure?</strong><p>A state is available directly under its symbol. Add a separate measurement when scaling, background or a combination of states changes what is observed.</p><code>signal = gain * x + background</code><a href="learn.html?lesson=measurement" target="_blank" rel="noopener">Worked example →</a></div>${obs || '<p class="empty-help">No additional observation operators. Data may refer to the state symbols directly.</p>'}<button class="button" id="addObservation">Add a measurement</button></section>
      <section data-editor-panel="numerics" id="editor-panel-numerics" role="tabpanel" aria-labelledby="editor-tab-numerics"><div class="editor-numerics-grid">${field('ed-n-t0', 'Start time', m.t0, 'number')}${field('ed-n-t1', 'End time', m.t1, 'number')}${field('ed-n-timeUnit', 'Time unit', m.timeUnit)}${field('ed-n-points', 'Uniform plot samples', m.points, 'number')}<label class="field" for="ed-n-method">Integration method<select id="ed-n-method">${[...new Set(['rk45','rk4',m.method])].map(k => `<option ${k === m.method ? 'selected' : ''} value="${esc(k)}">${k === 'rk45' ? 'RK45 · adaptive explicit' : k === 'rk4' ? 'RK4 · fixed step' : esc(k)}</option>`).join('')}</select></label>${field('ed-n-rtol', 'Relative tolerance', m.rtol, 'number')}${field('ed-n-atol', 'Absolute tolerance', m.atol, 'number')}${field('ed-n-maxStep', 'Maximum step or auto', m.maxStep)}${field('ed-n-initialStep', 'Initial step or auto', m.initialStep)}</div><p class="small muted">Measurement fitting lands on the requested observation times. Plot samples are not internal solver steps. Verify stiff problems independently.</p>${textfield('ed-assumptions', 'Assumptions · one per line', m.assumptions.join('\n'), 4)}${textfield('ed-description', 'System and scope', m.description, 3)}</section>`;
      showEditorTab(editorTab);
      $('editorContent').querySelectorAll('input,textarea,select').forEach(el => el.addEventListener('input', () => {
        unreview();
        const match = el.id.match(/^ed-([so])-eq-(\d+)$/);
        if (match) $(match[1] === 's' ? 'equation-preview-' + match[2] : 'observation-preview-' + match[2]).innerHTML = equation(el.value);
      }));
      $('editorTabs').querySelectorAll('[data-editor-tab]').forEach(el => { el.onclick = () => showEditorTab(el.dataset.editorTab); el.onkeydown = e => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return; e.preventDefault();
        const i = tabs.findIndex(t => t[0] === editorTab), j = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (i + (e.key === 'ArrowRight' ? 1 : -1) + 4) % 4;
        showEditorTab(tabs[j][0], true);
      }; });
      function modify(fn) { try { draft = gather(); fn(draft); unreview(); renderEditor(); } catch(e) { fail('editorErrors', e); } }
      $('addState').onclick = () => modify(m => { let i = 1; while (m.vars.includes('x' + i) || m.params['x' + i]) i++; const k = 'x' + i; m.vars.push(k); m.y0.push(0); m.eqs.push('0'); m.units[k] = 'unspecified'; });
      $('addParameter').onclick = () => modify(m => { let i = 1; while (m.vars.includes('p' + i) || m.params['p' + i]) i++; m.params['p' + i] = [0, -1, 1]; });
      $('addObservation').onclick = () => modify(m => { let i = 1; while ((m.observables || []).some(o => o.id === 'signal' + i) || m.vars.includes('signal' + i)) i++; m.observables.push({ id: 'signal' + i, label: 'Measurement', expression: m.vars[0], unit: m.units[m.vars[0]] || 'unspecified', source: '' }); });
      $('editorContent').querySelectorAll('[data-remove-state]').forEach(b => b.onclick = () => modify(m => { const i = +b.dataset.removeState; m.vars.splice(i, 1); m.eqs.splice(i, 1); m.y0.splice(i, 1); }));
      $('editorContent').querySelectorAll('[data-remove-parameter]').forEach(b => b.onclick = () => modify(m => { delete m.params[Object.keys(m.params)[+b.dataset.removeParameter]]; }));
      $('editorContent').querySelectorAll('[data-remove-observation]').forEach(b => b.onclick = () => modify(m => { m.observables.splice(+b.dataset.removeObservation, 1); }));
    }
    function diffHTML(a, b) {
      const diff = H.differences(a, b), value = x => typeof x === 'object' ? JSON.stringify(x) : String(x ?? 'not present');
      return diff.length ? `<div class="change-table-wrap"><table class="change-table"><caption>${diff.length} explicit changes</caption><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>${diff.slice(0, 80).map(d => `<tr><th>${esc(d.field)}</th><td>${esc(value(d.before))}</td><td>${esc(value(d.after))}</td></tr>`).join('')}</tbody></table></div>${diff.length > 80 ? '<p>First 80 changes shown; complete snapshots remain in the export.</p>' : ''}` : '<p class="small muted">No differences in this configuration.</p>';
    }
    $('openModelEditor').onclick = () => {
      try { if (A.state().draftDirty) throw new Error('Apply or discard the JSON draft before opening another model view.'); draft = copy(A.readModel()); unreview(); renderEditor(); $('modelEditorDialog').showModal(); }
      catch(e) { A.error(e); }
    };
    $('modelEditorDialog').querySelector('[data-close-editor]').onclick = () => $('modelEditorDialog').close();
    $('reviewStructured').onclick = () => {
      try {
        draft = gather(); const review = H.review(draft, deps); unreview();
        $('editorContent').querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
        $('editorContent').querySelectorAll('.field-error').forEach(x => x.textContent = '');
        if (!review.ok) {
          $('editorErrors').textContent = review.errors.map(e => e.message).join(' ');
          for (const e of review.errors) {
            const match = e.field.match(/^(equation|observation)-(\d+)$/); if (!match) continue;
            const id = (match[1] === 'equation' ? 'ed-s-eq-' : 'ed-o-eq-') + match[2], err = match[1] + '-error-' + match[2];
            $(id).setAttribute('aria-invalid', 'true'); $(id).setAttribute('aria-describedby', err); $(err).textContent = e.message;
          }
          return;
        }
        if (A.state().data?.schema === D.SCHEMA) D.validate(A.state().data, review.model);
        else if (A.state().data && !review.model.vars.includes(A.state().data.output)) throw new Error('The existing dataset would lose its observable. Detach or remap it explicitly first.');
        reviewed = review.model; $('structuredDiff').innerHTML = diffHTML(A.state().model, reviewed);
        $('applyStructured').disabled = false; $('editorErrors').textContent = review.notice;
      } catch(e) { fail('editorErrors', e); }
    };
    $('applyStructured').onclick = () => {
      try { if (!reviewed) throw new Error('Review this draft first.'); remember('model editor'); A.commitModel(reviewed); $('modelEditorDialog').close(); $('openModelEditor').focus(); }
      catch(e) { fail('editorErrors', e); }
    };
    function mapping() { return Object.fromEntries(D.ROLES.map(k => [k, $('mapping-' + k).value])); }
    function readConditions() {
      const c = Object.create(null);
      $('conditionEditors').querySelectorAll('[data-condition-id]').forEach(card => {
        const d = blankCondition();
        card.querySelectorAll('.condition-override').forEach(row => {
          const key = row.querySelector('select').value, val = row.querySelector('input').value, part = key.startsWith('initial:') ? 'initial' : 'parameters', name = key.slice(key.indexOf(':') + 1);
          if (Object.prototype.hasOwnProperty.call(d[part], name)) throw new Error(`Condition ${card.dataset.conditionId} repeats ${name}.`);
          d[part][name] = val;
        });
        c[card.dataset.conditionId] = d;
      }); return c;
    }
    function conditionsHTML(ids, values) {
      const m = A.state().model, options = [...Object.keys(m.params).map(k => ['parameters:' + k, 'Parameter · ' + k]), ...m.vars.map(k => ['initial:' + k, 'Initial · ' + k])];
      function row(key, value) { return `<div class="condition-override"><select aria-label="Condition input">${options.map(([k, title]) => `<option value="${esc(k)}" ${k === key ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select><input type="number" step="any" aria-label="Condition override value" value="${esc(value)}"><button class="button" data-remove-override aria-label="Remove this condition override">Remove</button></div>`; }
      $('conditionEditors').innerHTML = ids.map(id => `<section class="condition-editor" data-condition-id="${esc(id)}"><h4>${esc(id)}</h4><div class="condition-rows">${['parameters','initial'].flatMap(part => Object.entries(values[id]?.[part] || {}).map(([k, v]) => row(part + ':' + k, v))).join('')}</div><button class="button" data-add-override>Add an input override</button></section>`).join('');
      function dirty() { preview = null; $('confirmConditions').checked = false; $('confirmImport').disabled = true; }
      $('conditionEditors').querySelectorAll('[data-add-override]').forEach(b => b.onclick = () => { const key = options[0]?.[0]; if (!key) return; const value = key.startsWith('parameters:') ? m.params[key.slice(11)][0] : m.y0[0]; b.previousElementSibling.insertAdjacentHTML('beforeend', row(key, value)); dirty(); });
      $('conditionEditors').onclick = e => { const b = e.target.closest('[data-remove-override]'); if (b) { b.closest('.condition-override').remove(); dirty(); } };
      $('conditionEditors').oninput = dirty;
    }
    function previewOptions() { return { mapping: mapping(), output: $('defaultObservable').value, missing: $('missingPolicy').value,
      conditions: Object.keys(readConditions()).length ? readConditions() : conditionState, source: $('dataSource').value.trim() || 'user CSV', filename: $('csvFile').files[0]?.name || 'pasted CSV' }; }
    function refreshImport() {
      try {
        $('importErrors').textContent = ''; const result = D.preview($('csvText').value, A.state().model, previewOptions());
        conditionState = result.data.conditions; preview = result;
        $('previewHeading').textContent = `${result.summary.rows} observations · ${result.summary.conditions} conditions`;
        $('importSummary').innerHTML = `<p>Time values are interpreted in ${esc(A.state().model.timeUnit)}. No unit conversion is performed.</p><p>${result.summary.observables} observables · ${result.summary.replicates} condition/replicate groups. ${result.summary.weighted ? 'Positive sigma retained for every row.' : 'No measurement standard deviations supplied.'}</p><p>${result.metadataColumns.length ? 'Retained metadata: ' + result.metadataColumns.map(esc).join(', ') + '. Not used for fitting.' : 'Every column has an explicit numerical or experimental role.'}</p>${result.excludedRows.length ? `<p class="exclusion-note">${result.excludedRows.length} missing measurements excluded explicitly. Original rows and reasons remain in the import record.</p>` : ''}`;
        $('importRows').innerHTML = `<table><caption>First ${Math.min(8, result.data.rows.length)} rows · no aggregation</caption><thead><tr>${['Time','Value','Observable','Condition','Replicate','Sigma','Unit'].map(k=>'<th>'+k+'</th>').join('')}</tr></thead><tbody>${result.data.rows.slice(0,8).map(r=>'<tr>'+['time','value','observable','condition','replicate','sigma','unit'].map(k=>'<td title="'+esc(r[k] ?? 'not supplied')+'">'+esc(typeof r[k]==='number'?root.FokoResearchCharts.fmt(r[k]):r[k] ?? 'not supplied')+'</td>').join('')+'</tr>').join('')}</tbody></table>`;
        conditionsHTML(result.conditionIds, conditionState);
        $('confirmImport').disabled = !$('confirmConditions').checked;
      } catch(e) { preview = null; $('confirmImport').disabled = true; fail('importErrors', e); }
    }
    $('applyCSV').onclick = () => {
      try {
        const parsed = D.csv($('csvText').value), m = A.state().model, current = A.state().data;
        conditionState = current?.schema === D.SCHEMA ? copy(current.conditions) : {};
        const map = current?.schema === D.SCHEMA && current.import?.headers?.join('|') === parsed.headers.join('|') ? current.import.mapping : D.suggestMapping(parsed.headers, m.outputVar);
        $('columnMappings').innerHTML = D.ROLES.map(k => `<label class="field" for="mapping-${k}">${k === 'sigma' ? 'Sigma · known standard deviation' : k[0].toUpperCase()+k.slice(1)}<select id="mapping-${k}"><option value="">${['time','value'].includes(k) ? 'Choose column' : 'Not supplied'}</option>${parsed.headers.map(h=>`<option value="${esc(h)}" ${map[k]===h?'selected':''}>${esc(h)}</option>`).join('')}</select></label>`).join('');
        $('defaultObservable').innerHTML = D.observableList(m).map(o=>`<option value="${esc(o.id)}">${esc(o.label)} · ${esc(o.id)}</option>`).join('');
        $('defaultObservable').value = current?.output && D.observableList(m).some(o=>o.id===current.output) ? current.output : m.outputVar;
        $('dataSource').value = current?.source || 'user CSV'; $('missingPolicy').value='reject'; $('confirmConditions').checked=false; $('conditionEditors').innerHTML='';
        ['columnMappings','defaultObservable','missingPolicy','dataSource'].forEach(id=>$(id).oninput=()=>{preview=null;$('confirmImport').disabled=true;$('confirmConditions').checked=false;});
        $('dataImportDialog').showModal(); refreshImport();
      } catch(e) { A.error(e); }
    };
    $('refreshImport').onclick = refreshImport;
    $('confirmConditions').onchange = () => { $('confirmImport').disabled = !preview || !$('confirmConditions').checked; };
    $('confirmImport').onclick = () => {
      try {
        if (!$('confirmConditions').checked || !preview) throw new Error('Refresh and confirm the preview first.');
        const result = D.preview($('csvText').value, A.state().model, previewOptions());
        if (result.undefinedConditions.length) throw new Error('Review the condition definitions before importing.');
        remember('observation import'); A.commitData(result.data); $('dataImportDialog').close(); $('applyCSV').focus();
      } catch(e) { fail('importErrors',e); }
    };
    $('closeDataImport').onclick = () => $('dataImportDialog').close();
    $('removeData').onclick = () => { if (!A.state().data) return; remember('detach observations'); A.commitData(null); toast('Observations detached. Undo restores them; prior runs retain their snapshots.'); };
    function updateSplits() {
      const data = A.state().data, kind = $('splitKind').value;
      if (data?.schema !== D.SCHEMA) { $('splitKind').value='time'; $('splitKind').disabled=true; $('holdoutGroupField').hidden=true; $('trainingFractionField').hidden=false; return; }
      $('splitKind').disabled=false; $('trainingFractionField').hidden=kind!=='time'; $('holdoutGroupField').hidden=kind==='time';
      const checked=[...$('holdoutGroups').querySelectorAll('input:checked')].map(x=>x.value);
      if (kind!=='time') $('holdoutGroups').innerHTML=[...new Set(data.rows.map(r=>D.groupKey(r,kind)))].map(k=>`<label><input type="checkbox" value="${esc(k)}" ${checked.includes(k)?'checked':''}>${esc(kind==='replicate'?JSON.parse(k).join(' · '):k)}</label>`).join('');
    }
    $('splitKind').onchange=()=>{updateSplits();A.invalidate('Validation design changed. No model uses held-out measurements for fitting.');};
    $('holdoutGroups').onchange=()=>A.invalidate('Holdout groups changed. Recompute the comparison.');
    $('fitSeries').onchange=()=>A.renderFit();
    function selectedHoldouts() { return [...$('holdoutGroups').querySelectorAll('input:checked')].map(x=>x.value); }
    function scenarioList() {
      const ss=A.state().scenarios||[];
      $('scenarioList').innerHTML=ss.length?ss.map(s=>`<article class="scenario-entry"><div><h3>${esc(s.name)}</h3><p class="small muted">${esc(s.model.name)} · ${s.data?.rows?.length||s.data?.T?.length||0} observations</p></div><div class="actions"><button class="button" data-scenario-diff="${esc(s.id)}">Show changes</button><button class="button" data-scenario-use="${esc(s.id)}">Use inputs</button><button class="button" data-scenario-run="${esc(s.id)}">Run baseline</button></div></article>`).join(''):'<p class="empty-help">No scenarios yet. Save the baseline before changing a parameter or experimental condition.</p>';
      $('scenarioList').querySelectorAll('[data-scenario-diff]').forEach(b=>b.onclick=()=>{const s=ss.find(x=>x.id===b.dataset.scenarioDiff);$('scenarioDiff').innerHTML='<h3>'+esc(s.name)+' → current experiment</h3>'+diffHTML({model:s.model,data:s.data},snapshot());});
      $('scenarioList').querySelectorAll('[data-scenario-use]').forEach(b=>b.onclick=()=>{const s=ss.find(x=>x.id===b.dataset.scenarioUse);remember('restore scenario '+s.name);A.restore({model:s.model,data:s.data});$('scenarioDialog').close();});
      $('scenarioList').querySelectorAll('[data-scenario-run]').forEach(b=>b.onclick=()=>{const s=ss.find(x=>x.id===b.dataset.scenarioRun);$('scenarioDialog').close();A.runBaseline(s);});
    }
    $('scenarioButton').onclick=()=>{$('scenarioDiff').innerHTML='';scenarioList();$('scenarioDialog').showModal();};
    $('closeScenarios').onclick=()=>$('scenarioDialog').close();
    $('saveScenario').onclick=()=>{try{const name=$('scenarioName').value.trim();if(!name)throw new Error('Give the scenario a name.');if(A.state().scenarios.length>=20)throw new Error('Keep at most 20 scenarios per project; export before starting another.');const m=A.readModel();A.state().scenarios.push({id:'scenario-'+Date.now().toString(36),name,model:copy(m),data:copy(A.state().data),createdAt:new Date().toISOString()});A.save();$('scenarioName').value='';scenarioList();}catch(e){toast(e.message);}};
    $('undoEdit').onclick=()=>stepHistory(undo,redo);$('redoEdit').onclick=()=>stepHistory(redo,undo);
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.closest('input,textarea,select,[contenteditable=true],dialog')){e.preventDefault();stepHistory(e.shiftKey?redo:undo,e.shiftKey?undo:redo);}});
    function deposit(id) {
      pendingRun=A.state().records.find(r=>r.id===id);if(!pendingRun)return;
      $('depositRunName').textContent=pendingRun.snapshot.model.name+' · '+pendingRun.kind;
      $('depositGate').value=pendingRun.kind==='fit'?'infer':pendingRun.kind==='surrogate'?'compare':'verify';
      $('depositInterpretation').value=A.state().notes.interpretation||'';$('depositDialog').showModal();
    }
    $('closeDeposit').onclick=()=>$('depositDialog').close();
    $('confirmDeposit').onclick=()=>{try{const item=H.gateAttachment(pendingRun,$('depositGate').value,$('depositInterpretation').value,deps),s=A.state();s.attachments=s.attachments.filter(x=>x.id!==item.id).concat(item);let global=store.get(KEY,[]);if(!Array.isArray(global))global=[];const ok=store.set(KEY,global.filter(x=>x.id!==item.id).concat(item).slice(-60));A.save();A.renderEvidence();$('depositDialog').close();toast(ok?'Complete run attached. Evidence is executed, not reviewed or a passed gate.':'Attached to this project only. Export the bundle; persistent programme storage is unavailable.');}catch(e){toast(e.message);}};
    function renderAttachments() {
      const records=A.state().attachments||[];
      $('attachedEvidence').innerHTML=records.length?records.map(x=>`<p class="small"><strong>${esc(x.gate)}</strong> · ${esc(x.run.kind)} · ${esc(x.evidenceLevel)}</p>`).join(''):'<p class="small muted">Use “Attach to programme” on a calculation below.</p>';
      $('runHistory').querySelectorAll('[data-export-run]').forEach(b=>{
        if(b.parentElement.querySelector('[data-deposit]'))return;
        const x=document.createElement('button');x.className='button';x.textContent='Attach to programme';x.dataset.deposit=b.dataset.exportRun;x.onclick=()=>deposit(x.dataset.deposit);b.parentElement.append(x);
      });
    }
    $('runCurrent').onclick=()=>A.run($('runCurrent').dataset.currentKind);
    function refresh() { updateUndo(); updateSplits(); renderAttachments(); syncTab(); $('removeData').disabled=!A.state().data; }
    function syncTab() {
      const tab=A.state().tab, kind=tab==='fit'?'fit':tab==='robust'?$('robustKind').value:tab==='ml'?'surrogate':'simulation';
      $('runCurrent').dataset.currentKind=kind;$('runCurrent').disabled=!!A.state().job;$('runCurrent').textContent={fit:'Fit & compare',sensitivity:'Run sensitivity',ensemble:'Run ensemble',surrogate:'Test surrogate',simulation:'Run simulation'}[kind];
      $('toolbarContext').textContent=A.state().job?'Calculation in progress':A.state().model.name;
    }
    for(const id of ['modelEditorDialog','dataImportDialog','scenarioDialog','depositDialog']) $(id).addEventListener('close',()=>{
      const button={modelEditorDialog:'openModelEditor',dataImportDialog:'applyCSV',scenarioDialog:'scenarioButton',depositDialog:'tab-evidence'}[id];$(button).focus();
    });
    refresh();
    return {remember,refresh,syncTab,renderAttachments,selectedHoldouts,updateSplits,diffHTML,deposit,clearHistory(){undo.length=0;redo.length=0;updateUndo();}};
  }
  root.FokoResearchEditing=Object.freeze({mount});
})(window);
