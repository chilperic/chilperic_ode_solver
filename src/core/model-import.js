/* Foko Lab model interchange core.
 * Parses local, declarative ODE model inputs without evaluating user code.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoModelImport = api;
}(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const FORMATS = Object.freeze({
    json: 'Foko project, model JSON or Model IR',
    txt: 'Plain-text ODE equations',
    yaml: 'Declarative YAML subset',
    python: 'Python dictionary (data only)',
    javascript: 'JavaScript object (data only)',
    csv: 'Model-table CSV',
    sbml: 'SBML reaction model (strict subset)'
  });

  function finite(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
    return number;
  }

  function identifier(value, label) {
    const text = String(value || '').trim();
    if (!IDENT.test(text)) throw new Error(`${label} must be a valid identifier.`);
    return text;
  }

  function cleanId(value) {
    return String(value || '').trim().replace(/[^A-Za-z0-9_]/g, '_').replace(/^([0-9])/, '_$1');
  }

  function extension(name) {
    const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  }

  function detect(text, name, requested) {
    if (requested && requested !== 'auto') return requested;
    const ext = extension(name);
    if (['json', 'foko'].includes(ext)) return 'json';
    if (['csv'].includes(ext)) return 'csv';
    if (['yaml', 'yml'].includes(ext)) return 'yaml';
    if (['py'].includes(ext)) return 'python';
    if (['js', 'mjs', 'cjs'].includes(ext)) return 'javascript';
    if (['sbml', 'xml'].includes(ext)) return 'sbml';
    if (['cellml'].includes(ext)) return 'cellml';
    if (['sedml'].includes(ext)) return 'sedml';
    if (['omex'].includes(ext)) return 'omex';
    if (['txt', 'ode', 'eqn'].includes(ext)) return 'txt';
    const source = String(text || '').trim();
    // Recognize standards documents even when pasted without an XML declaration
    // or filename. Never let an experiment or CellML document fall through to
    // the permissive plain-text ODE grammar.
    if (/^<sedML\b/i.test(source)) return 'sedml';
    if (/^<model\b/i.test(source) && /xmlns=["'][^"']*cellml/i.test(source)) return 'cellml';
    if (/^<\?xml|^<sbml\b/i.test(source)) {
      if (/<model[^>]+xmlns=["'][^"']*cellml/i.test(source)) return 'cellml';
      if (/<sedML\b/i.test(source)) return 'sedml';
      return 'sbml';
    }
    if (/^(?:FOKO_(?:MODEL|PROJECT)|DYNAMICS_LAB_CONFIG)\s*=/m.test(source)) return 'python';
    if (/^(?:const|let|var)\s+FOKO_(?:MODEL|PROJECT)\s*=/m.test(source)) return 'javascript';
    if (/^[\[{]/.test(source)) return 'json';
    if (/^\s*(?:model|vars|eqs|parameters)\s*:/m.test(source)) return 'yaml';
    return 'txt';
  }

  function splitTopLevel(text, separator) {
    const out = [];
    let start = 0, depth = 0, quote = '', escaped = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") quote = char;
      else if ('[{('.includes(char)) depth += 1;
      else if (']})'.includes(char)) depth -= 1;
      else if (char === separator && depth === 0) {
        out.push(text.slice(start, index).trim());
        start = index + 1;
      }
    }
    out.push(text.slice(start).trim());
    return out.filter(Boolean);
  }

  function literalParser(source) {
    let index = 0;
    function skip() {
      while (index < source.length) {
        if (/\s/.test(source[index])) { index += 1; continue; }
        if (source[index] === '#') { while (index < source.length && source[index] !== '\n') index += 1; continue; }
        if (source[index] === '/' && source[index + 1] === '/') { while (index < source.length && source[index] !== '\n') index += 1; continue; }
        break;
      }
    }
    function string() {
      const quote = source[index++];
      let out = '';
      while (index < source.length) {
        const char = source[index++];
        if (char === quote) return out;
        if (char === '\\') {
          const next = source[index++];
          const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };
          out += Object.prototype.hasOwnProperty.call(escapes, next) ? escapes[next] : next;
        } else out += char;
      }
      throw new Error('Unterminated string in dictionary input.');
    }
    function token() {
      const start = index;
      while (index < source.length && !/[\s,:\[\]{}()]/.test(source[index])) index += 1;
      return source.slice(start, index);
    }
    function value() {
      skip();
      const char = source[index];
      if (char === '"' || char === "'") return string();
      if (char === '{') return object();
      if (char === '[' || char === '(') return array(char === '(' ? ')' : ']');
      const word = token();
      if (!word) throw new Error(`Expected a value near character ${index + 1}.`);
      if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(word)) return Number(word);
      if (/^(?:true|True)$/i.test(word)) return true;
      if (/^(?:false|False)$/i.test(word)) return false;
      if (/^(?:null|none|None)$/i.test(word)) return null;
      return word;
    }
    function array(close) {
      index += 1;
      const out = [];
      skip();
      while (source[index] !== close) {
        out.push(value()); skip();
        if (source[index] === ',') { index += 1; skip(); }
        else if (source[index] !== close) throw new Error(`Expected ',' or '${close}' near character ${index + 1}.`);
      }
      index += 1;
      return out;
    }
    function object() {
      index += 1;
      const out = {};
      skip();
      while (source[index] !== '}') {
        const key = source[index] === '"' || source[index] === "'" ? string() : token();
        if (!key) throw new Error(`Expected a dictionary key near character ${index + 1}.`);
        skip();
        if (source[index] !== ':') throw new Error(`Expected ':' after dictionary key ${key}.`);
        index += 1;
        out[key] = value(); skip();
        if (source[index] === ',') { index += 1; skip(); }
        else if (source[index] !== '}') throw new Error(`Expected ',' or '}' near character ${index + 1}.`);
      }
      index += 1;
      return out;
    }
    const result = value();
    skip();
    if (index < source.length && source.slice(index).trim().replace(/;$/, '')) throw new Error(`Unexpected content after dictionary near character ${index + 1}.`);
    return result;
  }

  function assignedLiteral(text, language) {
    const pattern = language === 'javascript'
      ? /(?:const|let|var)\s+FOKO_(?:MODEL|PROJECT)\s*=\s*/m
      : /(?:FOKO_(?:MODEL|PROJECT)|DYNAMICS_LAB_CONFIG)\s*=\s*/m;
    const match = pattern.exec(text);
    if (!match) throw new Error(`${language === 'javascript' ? 'JavaScript' : 'Python'} input requires FOKO_MODEL = {...} or FOKO_PROJECT = {...}.`);
    const start = match.index + match[0].length;
    const open = text[start];
    if (open !== '{') throw new Error('The assigned model must be a dictionary/object literal.');
    let depth = 0, quote = '', escaped = false, end = -1;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '{') depth += 1;
      else if (char === '}' && --depth === 0) { end = index + 1; break; }
    }
    if (end < 0) throw new Error('The model dictionary/object is not closed.');
    return literalParser(text.slice(start, end));
  }

  function scalar(value) {
    const text = String(value || '').trim();
    if (!text) return {};
    if (/^[\[{(]/.test(text)) return literalParser(text);
    if (/^["']/.test(text)) return literalParser(text);
    if (/^(?:true|false|null|none)$/i.test(text)) return literalParser(text);
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return Number(text);
    return text;
  }

  function parseYaml(text) {
    const rootObject = {};
    const stack = [{ indent: -1, value: rootObject }];
    String(text || '').split(/\r?\n/).forEach(function (raw, lineIndex) {
      if (!raw.trim() || raw.trim().startsWith('#')) return;
      const indent = raw.match(/^\s*/)[0].replace(/\t/g, '  ').length;
      const match = raw.trim().match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
      if (!match) throw new Error(`YAML subset expects key: value at line ${lineIndex + 1}. Use inline arrays such as [x, y].`);
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      const parent = stack[stack.length - 1].value;
      const key = match[1].replace(/-/g, '_');
      const valueText = match[2].trim();
      if (!valueText) {
        parent[key] = {};
        stack.push({ indent: indent, value: parent[key] });
      } else parent[key] = scalar(valueText);
    });
    return rootObject;
  }

  function parseText(text) {
    const model = { name: 'Imported plain-text ODE', vars: [], eqs: [], y0: [], params: {}, t0: 0, t1: 20, points: 800, method: 'rk45' };
    const initial = {};
    String(text || '').split(/\r?\n/).forEach(function (raw, lineIndex) {
      const line = raw.replace(/\s+#.*$/, '').trim();
      if (!line) return;
      let match;
      if ((match = line.match(/^name\s*:\s*(.+)$/i))) model.name = match[1].trim();
      else if ((match = line.match(/^d([A-Za-z_]\w*)\s*\/\s*dt\s*=\s*(.+)$/i))) { model.vars.push(identifier(match[1], `State at line ${lineIndex + 1}`)); model.eqs.push(match[2].trim()); }
      else if ((match = line.match(/^(?:initial\s+)?([A-Za-z_]\w*)\s*(?:\(\s*(?:0|t0)\s*\))?\s*=\s*([^\s]+)$/i))) initial[match[1]] = finite(match[2], `Initial value at line ${lineIndex + 1}`);
      else if ((match = line.match(/^param(?:eter)?\s+([A-Za-z_]\w*)\s*=\s*([^\s\[]+)(?:\s*\[\s*([^,]+),\s*([^\]]+)\])?$/i))) {
        const value = finite(match[2], `Parameter ${match[1]}`);
        model.params[match[1]] = [value, finite(match[3] == null ? value : match[3], `${match[1]} minimum`), finite(match[4] == null ? value : match[4], `${match[1]} maximum`)];
      } else if ((match = line.match(/^time\s+([^\s]+)\s+([^\s]+)(?:\s+([^\s]+))?$/i))) {
        model.t0 = finite(match[1], 'Start time'); model.t1 = finite(match[2], 'End time'); model.points = Math.floor(finite(match[3] == null ? model.points : match[3], 'Output points'));
      } else if ((match = line.match(/^method\s*:\s*([A-Za-z0-9_-]+)$/i))) model.method = match[1].toLowerCase();
      else if (!/^module\s*:\s*ode$/i.test(line)) throw new Error(`Unrecognized plain-text model statement at line ${lineIndex + 1}: ${line}`);
    });
    if (!model.vars.length) throw new Error('Plain-text ODE input needs at least one equation such as dx/dt = r*x.');
    model.y0 = model.vars.map(name => Object.prototype.hasOwnProperty.call(initial, name) ? initial[name] : 0);
    const unused = Object.keys(initial).filter(name => !model.vars.includes(name));
    if (unused.length) throw new Error(`Initial values reference undeclared states: ${unused.join(', ')}.`);
    return { model: model };
  }

  function csvCell(line) {
    const cells = [];
    let cell = '', quote = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && quote && line[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quote = !quote;
      else if (char === ',' && !quote) { cells.push(cell.trim()); cell = ''; }
      else cell += char;
    }
    cells.push(cell.trim());
    return cells;
  }

  function parseCsv(text) {
    const lines = String(text || '').split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'));
    if (lines.length < 2) throw new Error('Model CSV needs a header and at least one data row.');
    const header = csvCell(lines.shift());
    const rows = lines.map(line => { const cells = csvCell(line), row = {}; header.forEach((key, index) => { row[key] = cells[index] || ''; }); return row; });
    const model = { name: 'Imported model-table CSV', vars: [], eqs: [], y0: [], params: {}, t0: 0, t1: 20, points: 800, method: 'rk45' };
    rows.forEach(function (row) {
      if (row.kind === 'equation') { model.vars.push(identifier(row.name, 'CSV state')); model.eqs.push(String(row.equation || row.expression || row.value)); model.y0.push(finite(row.initial || 0, `Initial value for ${row.name}`)); }
      else if (row.kind === 'parameter') { const value = finite(row.value, `Parameter ${row.name}`); model.params[identifier(row.name, 'CSV parameter')] = [value, finite(row.min || value, `${row.name} minimum`), finite(row.max || value, `${row.name} maximum`)]; }
      else if (row.kind === 'time' && ['t0', 't1', 'points'].includes(row.name)) model[row.name] = finite(row.value, row.name);
      else if (row.kind === 'solver' && row.name === 'method') model.method = String(row.value || 'rk45').toLowerCase();
      else if (row.kind === 'meta' && row.name === 'name') model.name = String(row.value || model.name);
    });
    if (!model.vars.length) throw new Error('Model CSV contains no equation rows.');
    model.points = Math.floor(model.points);
    return { model: model };
  }

  function mathml(node) {
    if (!node) throw new Error('SBML kinetic law has no MathML expression.');
    const tag = String(node.localName || node.nodeName || '').toLowerCase().replace(/^.*:/, '');
    if (tag === 'math' || tag === 'semantics') return mathml(Array.from(node.children || []).find(child => !/annotation/.test(child.localName || child.nodeName)));
    if (tag === 'ci') return cleanId(node.textContent.trim());
    if (tag === 'cn') return String(node.textContent || '').trim();
    if (tag === 'csymbol') return /time/i.test(node.textContent || '') ? 't' : cleanId(node.textContent.trim());
    if (tag === 'apply') {
      const children = Array.from(node.children || []), operator = String((children.shift() || {}).localName || '').toLowerCase(), args = children.map(mathml);
      if (operator === 'plus') return `(${args.join(' + ')})`;
      if (operator === 'times') return `(${args.join(' * ')})`;
      if (operator === 'minus') return args.length === 1 ? `(-${args[0]})` : `(${args.join(' - ')})`;
      if (operator === 'divide') return `(${args[0]} / ${args[1]})`;
      if (operator === 'power') return `(${args[0]}^${args[1]})`;
      if (['exp', 'ln', 'log', 'sin', 'cos', 'tan', 'sqrt', 'abs', 'floor', 'ceiling'].includes(operator)) return `${operator === 'ln' ? 'log' : operator}(${args[0] || ''})`;
      throw new Error(`SBML MathML operator '${operator || 'unknown'}' is outside the validated browser subset.`);
    }
    throw new Error(`SBML MathML element '${tag || 'unknown'}' is outside the validated browser subset.`);
  }

  function parseSbml(text, name) {
    if (!root.DOMParser) throw new Error('SBML parsing requires a browser DOM parser.');
    const doc = new root.DOMParser().parseFromString(String(text || ''), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('SBML/XML is not well formed.');
    const sbml = doc.getElementsByTagName('sbml')[0];
    if (!sbml) throw new Error('The XML document is not an SBML model.');
    const forbidden = ['event', 'assignmentRule', 'rateRule', 'algebraicRule', 'initialAssignment', 'functionDefinition', 'constraint', 'delay', 'piecewise'];
    const found = forbidden.filter(tag => doc.getElementsByTagName(tag).length);
    if (found.length) throw new Error(`SBML features outside the validated browser subset: ${found.join(', ')}. No partial model was imported.`);
    const packages = Array.from(sbml.attributes || []).filter(attr => /^xmlns:/.test(attr.name) && !/(math|xhtml)/i.test(attr.name));
    if (packages.length) throw new Error(`SBML Level 3 packages are not supported (${packages.map(attr => attr.name.replace('xmlns:', '')).join(', ')}). No package semantics were discarded.`);
    const parameters = {};
    Array.from(doc.getElementsByTagName('compartment')).forEach(node => {
      const id = cleanId(node.getAttribute('id'));
      const size = finite(node.getAttribute('size') == null || node.getAttribute('size') === '' ? 1 : node.getAttribute('size'), `Compartment ${id} size`);
      if (Math.abs(size - 1) > 1e-12) throw new Error(`Compartment ${id} has size ${size}; compartment scaling other than 1 is not supported.`);
      if (id) parameters[id] = [size, size, size];
    });
    Array.from(doc.getElementsByTagName('parameter')).filter(node => !node.closest || !node.closest('kineticLaw')).forEach(node => {
      const id = identifier(cleanId(node.getAttribute('id') || node.getAttribute('name')), 'SBML parameter');
      const value = finite(node.getAttribute('value') == null || node.getAttribute('value') === '' ? 0 : node.getAttribute('value'), `SBML parameter ${id}`);
      parameters[id] = [value, value, value];
    });
    const speciesNodes = Array.from(doc.getElementsByTagName('species'));
    if (!speciesNodes.length) throw new Error('SBML contains no species.');
    const dynamic = speciesNodes.filter(node => node.getAttribute('boundaryCondition') !== 'true' && node.getAttribute('constant') !== 'true');
    const vars = dynamic.map(node => identifier(cleanId(node.getAttribute('id') || node.getAttribute('name')), 'SBML species'));
    if (new Set(vars).size !== vars.length) throw new Error('SBML species identifiers are not unique after safe normalization.');
    const y0 = dynamic.map(node => finite(node.getAttribute('initialConcentration') ?? node.getAttribute('initialAmount') ?? 0, `Initial value for ${node.getAttribute('id')}`));
    speciesNodes.filter(node => !dynamic.includes(node)).forEach(node => {
      const id = identifier(cleanId(node.getAttribute('id') || node.getAttribute('name')), 'Constant SBML species');
      const value = finite(node.getAttribute('initialConcentration') ?? node.getAttribute('initialAmount') ?? 0, `Value for ${id}`);
      parameters[id] = [value, value, value];
    });
    const equations = Object.fromEntries(vars.map(id => [id, '0']));
    const varSet = new Set(vars);
    const reactions = Array.from(doc.getElementsByTagName('reaction'));
    if (!reactions.length) throw new Error('The validated SBML subset requires at least one reaction.');
    reactions.forEach(function (reaction, reactionIndex) {
      const reactionId = cleanId(reaction.getAttribute('id') || `reaction_${reactionIndex + 1}`);
      const law = reaction.getElementsByTagName('kineticLaw')[0];
      const mathNode = law && law.getElementsByTagName('math')[0];
      if (!mathNode) throw new Error(`Reaction ${reactionId} has no kinetic-law MathML.`);
      let rate = mathml(mathNode);
      const locals = Array.from(law.getElementsByTagName('localParameter')).concat(Array.from(law.getElementsByTagName('parameter')));
      locals.forEach(function (node) {
        const local = cleanId(node.getAttribute('id')), promoted = `${reactionId}_${local}`;
        const value = finite(node.getAttribute('value') == null || node.getAttribute('value') === '' ? 0 : node.getAttribute('value'), `Local parameter ${local}`);
        parameters[promoted] = [value, value, value];
        rate = rate.replace(new RegExp(`\\b${local}\\b`, 'g'), promoted);
      });
      [['listOfReactants', -1], ['listOfProducts', 1]].forEach(function ([listName, sign]) {
        const list = reaction.getElementsByTagName(listName)[0];
        Array.from(list ? list.getElementsByTagName('speciesReference') : []).forEach(function (reference) {
          const id = cleanId(reference.getAttribute('species'));
          if (!varSet.has(id)) return;
          const coefficient = finite(reference.getAttribute('stoichiometry') || 1, `Stoichiometry for ${reactionId}/${id}`) * sign;
          equations[id] = `(${equations[id]}) ${coefficient < 0 ? '-' : '+'} (${Math.abs(coefficient)})*(${rate})`;
        });
      });
    });
    return { model: { name: String(name || 'Imported SBML').replace(/\.(?:xml|sbml)$/i, ''), vars, eqs: vars.map(id => equations[id]), y0, params: parameters, t0: 0, t1: 50, points: 800, method: 'rk45', description: 'Imported from the strict Foko Lab SBML reaction subset. Units, events, rules, packages, non-unit compartments and unsupported MathML are rejected rather than ignored.' }, warnings: ['SBML does not encode this run time span or tolerance policy; review the imported experiment settings before simulation.'] };
  }

  function normalizeContainer(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Model input must resolve to an object.');
    return raw;
  }

  function parse(text, name, options) {
    const source = String(text == null ? '' : text);
    if (!source.trim()) throw new Error('Model input is empty.');
    const format = detect(source, name, options && options.format);
    if (format === 'cellml') throw new Error('CellML is recognized but not executed in this release. Convert with OpenCOR or provide Foko Model IR; no CellML semantics were discarded.');
    if (format === 'sedml') throw new Error('SED-ML describes simulation experiments and is recognized but not executed in this release. Import the referenced model and configure the experiment explicitly.');
    if (format === 'omex') throw new Error('COMBINE/OMEX archives are recognized but not unpacked or executed in the browser. Use a standards-compliant simulator for the archive.');
    let parsed;
    if (format === 'json') parsed = normalizeContainer(JSON.parse(source));
    else if (format === 'python' || format === 'javascript') parsed = normalizeContainer(assignedLiteral(source, format));
    else if (format === 'yaml') parsed = normalizeContainer(parseYaml(source));
    else if (format === 'txt') parsed = parseText(source);
    else if (format === 'csv') parsed = parseCsv(source);
    else if (format === 'sbml') parsed = parseSbml(source, name);
    else throw new Error(`Unsupported model format: ${format}.`);
    return { format, label: FORMATS[format], raw: parsed, warnings: parsed.warnings || [], detectedFrom: name || 'pasted input' };
  }

  return Object.freeze({ FORMATS, detect, parse, parseText, parseCsv, parseYaml, parseLiteral: literalParser, version: '1' });
}));
