/* Experimental observations: explicit mapping, immutable rows, and grouped splits.
 * Browser/Node shared implementation. This is a bounded FokoLab data contract,
 * not an implementation of the full PEtab standard. No silent unit conversion.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FokoExperimentData = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const SCHEMA = 'foko.observations/2';
  const ROLES = ['time', 'value', 'observable', 'condition', 'replicate', 'sigma', 'unit'];
  const clone = x => JSON.parse(JSON.stringify(x));
  function requireValue(ok, message) { if (!ok) throw new Error(message); }
  function finite(value, name) {
    requireValue(value !== null && value !== undefined && typeof value !== 'boolean' &&
      (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '', `${name} is missing.`);
    const n = Number(value);
    requireValue(Number.isFinite(n), `${name} must be finite.`);
    return n;
  }
  function label(value, fallback, name) {
    const s = value === undefined || value === null ? fallback : String(value).trim();
    requireValue(s.length > 0 && s.length <= 160, `${name} must contain 1–160 characters.`);
    return s;
  }
  function csv(text) {
    requireValue(typeof text === 'string' && text.length <= 2000000, 'Use a CSV file under 2 MB.');
    text = text.replace(/^\uFEFF/, '');
    const rows = []; let row = [], cell = '', quoted = false, afterQuote = false;
    function pushRow() { row.push(cell); cell = ''; if (row.some(x => x.trim() !== '')) rows.push(row); row = []; afterQuote = false; }
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') { quoted = false; afterQuote = true; }
        else cell += c;
      } else if (c === ',' || c === '\n' || c === '\r') {
        if (c === ',') { row.push(cell); cell = ''; afterQuote = false; }
        else { if (c === '\r' && text[i + 1] === '\n') i++; pushRow(); }
      } else if (c === '"') {
        requireValue(!cell.trim() && !afterQuote, 'Unexpected quote in CSV.');
        cell = ''; quoted = true;
      } else {
        requireValue(!afterQuote || /\s/.test(c), 'Unexpected text after a quoted CSV field.');
        if (!afterQuote) cell += c;
      }
    }
    requireValue(!quoted, 'CSV has an unclosed quoted field.'); pushRow();
    requireValue(rows.length >= 2, 'Provide a header and at least one observation.');
    const headers = rows.shift().map(x => x.trim());
    requireValue(headers.every(Boolean) && new Set(headers).size === headers.length, 'CSV headers must be nonempty and unique.');
    requireValue(headers.length <= 60 && rows.length <= 1000, 'Use at most 60 columns and 1,000 observation rows.');
    rows.forEach((r, i) => requireValue(r.length === headers.length, `CSV row ${i + 2} has ${r.length} fields; expected ${headers.length}.`));
    return { headers, rows };
  }
  function observableList(model) {
    const states = model.vars.map(id => ({ id, label: model.stateLabels?.[id] || id, expression: id, unit: model.units?.[id] || 'unspecified', kind: 'state' }));
    return states.concat((model.observables || []).map(o => ({ ...o, kind: 'observation' })));
  }
  function compileObservables(model, Compute, math) {
    return Object.fromEntries(observableList(model).map(o => {
      const fn = Compute.compile({ ...model, eqs: [o.expression] }, math);
      return [o.id, { ...o, evaluate: (t, y, p) => fn(t, y, p)[0] }];
    }));
  }
  function suggestMapping(headers, selected) {
    const pick = names => names.find(n => headers.includes(n)) || '';
    return {
      time: pick(['time', 't']), value: pick(['value', 'measurement', selected]),
      observable: pick(['observable', 'observableId']), condition: pick(['condition', 'simulationConditionId']),
      replicate: pick(['replicate', 'replicateId']), sigma: pick(['sigma', 'sd']), unit: pick(['unit', 'units'])
    };
  }
  function normalizeConditions(raw, model, used) {
    const input = raw || {}; const result = Object.create(null);
    requireValue(new Set(used).size <= 12, 'Use at most 12 conditions in the browser.');
    for (const id of [...new Set(used)]) {
      requireValue(Object.prototype.hasOwnProperty.call(input, id), `Define the inputs for condition “${id}” before attaching the data.`);
      const entry = input[id];
      requireValue(entry && typeof entry === 'object' && !Array.isArray(entry), `Invalid definition for condition ${id}.`);
      const parameters = {}, initial = {};
      for (const [key, v] of Object.entries(entry.parameters || {})) {
        requireValue(Object.prototype.hasOwnProperty.call(model.params, key), `Condition ${id}: unknown parameter ${key}.`);
        const n = finite(v, `Condition ${id}, ${key}`), bounds = model.params[key];
        requireValue(n >= bounds[1] && n <= bounds[2], `Condition ${id}: ${key} is outside its declared range. Change the range explicitly first.`);
        parameters[key] = n;
      }
      for (const [key, v] of Object.entries(entry.initial || {})) {
        requireValue(model.vars.includes(key), `Condition ${id}: unknown initial state ${key}.`);
        initial[key] = finite(v, `Condition ${id}, initial ${key}`);
      }
      result[id] = { parameters, initial };
    }
    return result;
  }
  /** Preview every role and retained metadata before committing an import. */
  function preview(text, model, options = {}) {
    const raw = csv(text), defaultObservable = options.output || model.outputVar;
    const mapping = options.mapping || suggestMapping(raw.headers, defaultObservable);
    const mapped = ROLES.map(k => mapping[k]).filter(Boolean);
    requireValue(mapping.time && mapping.value, 'Map both a time column and a value column.');
    requireValue(new Set(mapped).size === mapped.length, 'A CSV column cannot have two roles.');
    mapped.forEach(h => requireValue(raw.headers.includes(h), `Mapped column ${h} is absent.`));
    const extras = raw.headers.filter(h => !mapped.includes(h)), skipped = [], rows = [];
    const definitions = Object.fromEntries(observableList(model).map(o => [o.id, o]));
    raw.rows.forEach((cells, index) => {
      const get = role => mapping[role] ? cells[raw.headers.indexOf(mapping[role])].trim() : undefined;
      const sourceRow = index + 2, valueText = get('value');
      if (valueText === '' || /^(NA|NaN|N\/A)$/i.test(valueText)) {
        requireValue(options.missing === 'exclude', `Observation in row ${sourceRow} is missing. Choose an explicit missing-value policy.`);
        skipped.push({ sourceRow, reason: 'Missing observation', cells: cells.slice() }); return;
      }
      const observable = label(get('observable'), defaultObservable, 'Observable');
      requireValue(Object.prototype.hasOwnProperty.call(definitions, observable), `Row ${sourceRow}: define observable “${observable}” in the model editor.`);
      const unit = label(get('unit'), definitions[observable].unit || 'unspecified', 'Unit');
      requireValue(unit === (definitions[observable].unit || 'unspecified'), `Row ${sourceRow}: unit “${unit}” differs from “${definitions[observable].unit || 'unspecified'}”. No automatic conversion is performed.`);
      const sigma = mapping.sigma ? finite(get('sigma'), `Sigma in row ${sourceRow}`) : null;
      requireValue(sigma === null || sigma > 0, `Row ${sourceRow}: sigma must be strictly positive. It is a standard deviation, not a variance or confidence interval.`);
      rows.push({ rowId: `csv-${sourceRow}`, sourceRow,
        time: finite(get('time'), `Time in row ${sourceRow}`), value: finite(valueText, `Observation in row ${sourceRow}`),
        observable, condition: label(get('condition'), 'default', 'Condition'),
        replicate: label(get('replicate'), '1', 'Replicate'), sigma, unit,
        metadata: Object.fromEntries(extras.map((h) => [h, cells[raw.headers.indexOf(h)]])) });
    });
    requireValue(rows.length > 0, 'The import contains no usable observations.');
    const conditionIds = [...new Set(rows.map(r => r.condition))];
    const conditions = options.conditions || (conditionIds.length === 1 && conditionIds[0] === 'default' ? { default: { parameters: {}, initial: {} } } : {});
    const proposed = { schema: SCHEMA, timeUnit:model.timeUnit, output: defaultObservable, source: options.source || 'user CSV',
      rows, conditions, observables: observableList(model).filter(o => rows.some(r => r.observable === o.id)),
      import: { filename: options.filename || 'pasted CSV', headers: raw.headers, mapping: clone(mapping),
        metadataColumns: extras, missingPolicy: options.missing || 'reject', excludedRows: skipped,
        originalRowCount: raw.rows.length, timeUnit: model.timeUnit, notice: 'Unmapped columns are retained as row metadata, not used in the objective.' } };
    // Missing condition definitions are exposed in the preview; final validation remains mandatory.
    const undefinedConditions = conditionIds.filter(id => !Object.prototype.hasOwnProperty.call(conditions, id));
    const proposedConditions = Object.assign(Object.create(null), conditions);
    undefinedConditions.forEach(id => { proposedConditions[id] = { parameters: {}, initial: {} }; });
    const data = validate({ ...proposed, conditions: proposedConditions }, model);
    return { data, mapping, headers: raw.headers, metadataColumns: extras, excludedRows: skipped,
      undefinedConditions, conditionIds, summary: { rows: rows.length, excluded: skipped.length,
        conditions: conditionIds.length, observables: new Set(rows.map(r => r.observable)).size,
        replicates: new Set(rows.map(r => JSON.stringify([r.condition, r.replicate]))).size,
        weighted: rows[0].sigma !== null } };
  }
  /** Revalidate JSON imports and worker inputs, not just the CSV boundary. */
  function validate(raw, model) {
    requireValue(raw && raw.schema === SCHEMA, 'Unknown observation contract.');
    requireValue((raw.timeUnit ?? raw.import?.timeUnit ?? model.timeUnit)===model.timeUnit, 'Observation time unit differs from the model. Convert times explicitly before reattaching; no automatic conversion is performed.');
    requireValue(Array.isArray(raw.rows) && raw.rows.length >= 1 && raw.rows.length <= 1000, 'Use 1–1,000 observation rows.');
    const defs = Object.fromEntries(observableList(model).map(o => [o.id, o]));
    const keys = new Set(), ids = new Set(), rows = raw.rows.map((r, i) => {
      requireValue(r && typeof r === 'object', `Invalid observation ${i + 1}.`);
      const rowId = label(r.rowId, `row-${i + 1}`, 'Observation ID'), observable = label(r.observable, model.outputVar, 'Observable');
      requireValue(!ids.has(rowId), `Observation ID ${rowId} is duplicated.`); ids.add(rowId);
      requireValue(Object.prototype.hasOwnProperty.call(defs, observable), `Unknown observable ${observable}.`);
      const time = finite(r.time, `Time for ${rowId}`), value = finite(r.value, `Value for ${rowId}`);
      requireValue(time >= model.t0 && time <= model.t1, `${rowId}: time is outside [${model.t0}, ${model.t1}].`);
      const condition = label(r.condition, 'default', 'Condition'), replicate = label(r.replicate, '1', 'Replicate');
      const key = JSON.stringify([condition, replicate, observable, time]);
      requireValue(!keys.has(key), `${rowId}: duplicate time within the same condition, replicate and observable. Give distinct measurements distinct replicate IDs.`); keys.add(key);
      const sigma = r.sigma == null ? null : finite(r.sigma, `${rowId} sigma`);
      requireValue(sigma === null || sigma > 0, `${rowId}: sigma must be strictly positive.`);
      const unit = label(r.unit, defs[observable].unit || 'unspecified', 'Unit');
      requireValue(unit === (defs[observable].unit || 'unspecified'), `${rowId}: observation unit does not match the model. No units were converted.`);
      requireValue(!r.metadata || (typeof r.metadata === 'object' && !Array.isArray(r.metadata)), 'Row metadata must be an object.');
      requireValue(Object.entries(r.metadata || {}).every(([k,v]) => k.length <= 160 && typeof v === 'string' && v.length <= 20000), 'Metadata cells must be strings of at most 20,000 characters.');
      return { ...clone(r), rowId, time, value, observable, condition, replicate, sigma, unit, metadata: clone(r.metadata || {}) };
    });
    const hasSigma = rows.some(r => r.sigma !== null);
    requireValue(!hasSigma || rows.every(r => r.sigma !== null), 'Either supply positive sigma for every row or leave it unspecified for every row. Mixed implicit weights are not supported.');
    const conditions = normalizeConditions(raw.conditions, model, rows.map(r => r.condition));
    const stored = raw.observables;
    // Stored formulas belong to the original import. Current-model edits may update h deliberately;
    // the experiment record captures both the new model and original import definitions.
    requireValue(!stored || Array.isArray(stored), 'Observation definitions must be an array.');
    return { ...clone(raw), schema: SCHEMA, timeUnit:raw.timeUnit ?? raw.import?.timeUnit ?? model.timeUnit, rows, conditions,
      T: rows.map(r => r.time), Y: rows.map(r => r.value), output: raw.output || model.outputVar,
      units: [...new Set(rows.map(r => r.unit))].join('; '), source: String(raw.source || 'user observations') };
  }
  function groupKey(row, kind) { return kind === 'condition' ? row.condition : JSON.stringify([row.condition, row.replicate]); }
  function split(data, settings = {}) {
    const rows = data.rows;
    requireValue(rows.length >= 8, 'Fit at least eight observations; smaller datasets can still be inspected.');
    const kind = settings.splitKind || 'time'; let trainIndices = [], testIndices = [], cutoff = null;
    requireValue(['time', 'condition', 'replicate'].includes(kind), 'Choose chronological, condition or replicate holdout.');
    if (kind === 'time') {
      const fraction = finite(settings.trainFraction ?? 0.7, 'Training fraction');
      requireValue(fraction >= 0.5 && fraction <= 0.85, 'Training fraction must lie between 0.5 and 0.85.');
      const times = [...new Set(rows.map(r => r.time))].sort((a, b) => a - b), n = Math.floor(times.length * fraction);
      requireValue(n >= 2 && n < times.length, 'Chronological holdout needs at least three distinct times.'); cutoff = times[n - 1];
      rows.forEach((r, i) => (r.time <= cutoff ? trainIndices : testIndices).push(i));
    } else {
      const groups = [...new Set(rows.map(r => groupKey(r, kind)))], held = settings.holdoutGroups || [];
      requireValue(Array.isArray(held) && held.length > 0 && held.length < groups.length && held.every(x => groups.includes(x)), 'Select one or more existing holdout groups while retaining at least one training group.');
      rows.forEach((r, i) => (held.includes(groupKey(r, kind)) ? testIndices : trainIndices).push(i));
    }
    requireValue(trainIndices.length >= 4 && testIndices.length >= 2, 'Retain at least four training and two held-out observations.');
    const trainObs = new Set(trainIndices.map(i => rows[i].observable));
    requireValue(testIndices.every(i => trainObs.has(rows[i].observable)), 'Each held-out observable must also occur in training data.');
    return { kind, cutoff, trainIndices, testIndices, nTrain: trainIndices.length, nTest: testIndices.length,
      holdoutGroups: kind === 'time' ? [] : settings.holdoutGroups.slice(),
      policy: kind === 'time' ? 'All measurements at the same time stay together.' : 'A complete experimental group is held out; no row from that group trains a model.' };
  }
  function toCSV(data) {
    const meta = [...new Set(data.rows.flatMap(r => Object.keys(r.metadata || {})))];
    const fields = ['time', 'value', 'observable', 'condition', 'replicate', ...(data.rows.some(r => r.sigma !== null) ? ['sigma'] : []), 'unit'];
    const quote = x => /[,"\r\n]/.test(String(x ?? '')) ? '"' + String(x ?? '').replace(/"/g, '""') + '"' : String(x ?? '');
    const used = new Set(fields), metaHeaders = meta.map(k => { let h=k; while(used.has(h)) h='metadata:'+h; used.add(h); return h; });
    return [fields.concat(metaHeaders).map(quote).join(','), ...data.rows.map(r => fields.map(k => r[k]).concat(meta.map(k => r.metadata?.[k] ?? '')).map(quote).join(','))].join('\n');
  }
  return Object.freeze({ SCHEMA, ROLES, csv, preview, validate, observableList, compileObservables, normalizeConditions, suggestMapping, split, groupKey, toCSV, finite });
});
