/* Foko Lab v72.4 data-ingestion core.
 * Pure parsing and preparation helpers. No DOM and no plotting dependencies.
 */
(function (root) {
  'use strict';

  const DEFAULT_MISSING = new Set(['', 'NA', 'N/A', 'NaN', 'null', 'NULL', '.', '-']);

  function detectDelimiter(text) {
    const lines = String(text || '').split(/\r?\n/).filter(function (line) { return line.trim(); }).slice(0, 8);
    if (!lines.length) return ',';
    const candidates = [',', '\t', ';'];
    let best = ',';
    let bestScore = -Infinity;
    candidates.forEach(function (delimiter) {
      const counts = lines.map(function (line) {
        let count = 0;
        let quoted = false;
        for (let i = 0; i < line.length; i += 1) {
          const char = line[i];
          if (char === '"') {
            if (quoted && line[i + 1] === '"') i += 1;
            else quoted = !quoted;
          } else if (!quoted && char === delimiter) count += 1;
        }
        return count;
      });
      const nonzero = counts.filter(function (value) { return value > 0; });
      if (!nonzero.length) return;
      const mean = nonzero.reduce(function (sum, value) { return sum + value; }, 0) / nonzero.length;
      const spread = nonzero.reduce(function (sum, value) { return sum + Math.abs(value - mean); }, 0) / nonzero.length;
      const score = mean * 10 - spread - (nonzero.length !== lines.length ? 4 : 0);
      if (score > bestScore) { bestScore = score; best = delimiter; }
    });
    return bestScore > 0 ? best : 'whitespace';
  }

  function parseDelimitedRows(text, delimiter) {
    const source = String(text || '').replace(/^\uFEFF/, '');
    if (delimiter === 'whitespace') {
      return source.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean).map(function (line) { return line.split(/\s+/); });
    }
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (quoted) {
        if (char === '"' && source[i + 1] === '"') { field += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else field += char;
      } else if (char === '"') quoted = true;
      else if (char === delimiter) { row.push(field.trim()); field = ''; }
      else if (char === '\n') { row.push(field.trim()); rows.push(row); row = []; field = ''; }
      else if (char !== '\r') field += char;
    }
    if (quoted) throw new Error('Unclosed quoted field in the uploaded data.');
    if (field.length || row.length) { row.push(field.trim()); rows.push(row); }
    return rows.filter(function (cells) { return cells.some(function (cell) { return String(cell).trim() !== ''; }); });
  }

  function looksNumeric(value) {
    if (value == null || value === '') return false;
    return Number.isFinite(Number(value));
  }

  function normaliseName(value, index, used) {
    const base = String(value || '').trim() || `V${index + 1}`;
    let name = base;
    let suffix = 2;
    while (used.has(name)) { name = `${base}_${suffix}`; suffix += 1; }
    used.add(name);
    return name;
  }

  function parseDataset(text, options) {
    const opts = Object.assign({ delimiter: 'auto', header: 'auto', missingTokens: [] }, options || {});
    const delimiter = opts.delimiter === 'auto' ? detectDelimiter(text) : opts.delimiter;
    const rawRows = parseDelimitedRows(text, delimiter);
    if (!rawRows.length) throw new Error('No data rows were found.');
    const width = rawRows.reduce(function (max, row) { return Math.max(max, row.length); }, 0);
    if (!width) throw new Error('No data columns were found.');
    const first = rawRows[0];
    const headerDetected = opts.header === true || (opts.header === 'auto' && first.some(function (value) { return value !== '' && !looksNumeric(value); }));
    const used = new Set();
    const names = Array.from({ length: width }, function (_, index) {
      return normaliseName(headerDetected ? first[index] : '', index, used);
    });
    const missing = new Set(Array.from(DEFAULT_MISSING).concat(opts.missingTokens || []).map(String));
    const body = rawRows.slice(headerDetected ? 1 : 0);
    const rows = body.map(function (raw, rowIndex) {
      const cells = Array.from({ length: width }, function (_, columnIndex) {
        const token = raw[columnIndex] == null ? '' : String(raw[columnIndex]).trim();
        if (missing.has(token)) return null;
        const numeric = Number(token);
        return Number.isFinite(numeric) ? numeric : token;
      });
      return { index: rowIndex + 1, cells };
    });
    const columns = names.map(function (name, index) {
      const values = rows.map(function (row) { return row.cells[index]; });
      const nonmissing = values.filter(function (value) { return value !== null; });
      const numeric = nonmissing.filter(function (value) { return typeof value === 'number' && Number.isFinite(value); });
      const type = nonmissing.length && numeric.length === nonmissing.length ? 'numeric' : 'categorical';
      return {
        index,
        name,
        type,
        missing: values.length - nonmissing.length,
        nonmissing: nonmissing.length,
        unique: new Set(nonmissing.map(String)).size,
      };
    });
    const missingCells = columns.reduce(function (sum, column) { return sum + column.missing; }, 0);
    return {
      delimiter,
      headerDetected,
      names,
      rows,
      columns,
      rowCount: rows.length,
      columnCount: columns.length,
      missingCells,
      sourceText: String(text || ''),
    };
  }

  function requireColumn(dataset, index, label) {
    const numericIndex = Number(index);
    if (!dataset || !Array.isArray(dataset.columns)) throw new Error('A parsed dataset is required.');
    if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= dataset.columns.length) {
      throw new Error(`${label || 'Column'} is not available in this dataset.`);
    }
    return numericIndex;
  }

  function numericValues(dataset, index) {
    index = requireColumn(dataset, index, 'Numeric column');
    return dataset.rows.map(function (row) { return row.cells[index]; }).filter(function (value) { return typeof value === 'number' && Number.isFinite(value); });
  }

  function prepareRows(dataset, required, policy) {
    const requirements = (required || []).map(function (item) {
      return {
        index: requireColumn(dataset, item.index, item.label),
        type: item.type || 'numeric',
        label: item.label || dataset.columns[item.index].name,
      };
    });
    const means = {};
    requirements.filter(function (item) { return item.type === 'numeric'; }).forEach(function (item) {
      const values = numericValues(dataset, item.index);
      means[item.index] = values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : NaN;
    });
    let dropped = 0;
    let imputed = 0;
    const rows = [];
    dataset.rows.forEach(function (sourceRow) {
      const row = sourceRow.cells.slice();
      let valid = true;
      requirements.forEach(function (item) {
        const value = row[item.index];
        const numericValid = item.type !== 'numeric' || (typeof value === 'number' && Number.isFinite(value));
        const categoricalValid = item.type !== 'categorical' || value !== null;
        if (numericValid && categoricalValid) return;
        if (policy === 'mean-impute' && item.type === 'numeric' && Number.isFinite(means[item.index])) {
          row[item.index] = means[item.index];
          imputed += 1;
        } else valid = false;
      });
      if (valid) rows.push({ index: sourceRow.index, cells: row });
      else dropped += 1;
    });
    return {
      rows,
      dropped,
      imputed,
      policy: policy || 'analysis-complete',
      sourceRows: dataset.rowCount,
      usableRows: rows.length,
    };
  }

  function pairedNumeric(dataset, xIndex, yIndex, policy) {
    const prepared = prepareRows(dataset, [
      { index: xIndex, type: 'numeric', label: 'X' },
      { index: yIndex, type: 'numeric', label: 'Y' },
    ], policy);
    return Object.assign(prepared, {
      x: prepared.rows.map(function (row) { return Number(row.cells[xIndex]); }),
      y: prepared.rows.map(function (row) { return Number(row.cells[yIndex]); }),
    });
  }

  function groupedNumeric(dataset, groupIndex, valueIndex, policy) {
    const prepared = prepareRows(dataset, [
      { index: groupIndex, type: 'categorical', label: 'Group' },
      { index: valueIndex, type: 'numeric', label: 'Value' },
    ], policy);
    const groups = {};
    prepared.rows.forEach(function (row) {
      const key = String(row.cells[groupIndex]);
      if (!groups[key]) groups[key] = [];
      groups[key].push(Number(row.cells[valueIndex]));
    });
    return Object.assign(prepared, { groups });
  }

  function pairwiseNumericColumns(dataset, leftIndex, rightIndex) {
    leftIndex = requireColumn(dataset, leftIndex, 'Left numeric column');
    rightIndex = requireColumn(dataset, rightIndex, 'Right numeric column');
    const left = [];
    const right = [];
    dataset.rows.forEach(function (row) {
      const a = row.cells[leftIndex];
      const b = row.cells[rightIndex];
      if (typeof a === 'number' && Number.isFinite(a) && typeof b === 'number' && Number.isFinite(b)) { left.push(a); right.push(b); }
    });
    return { left, right, n: left.length };
  }

  function pairwiseCorrelationMatrix(dataset, indices, correlation) {
    const cols = (indices || dataset.columns.filter(function (column) { return column.type === 'numeric'; }).map(function (column) { return column.index; })).map(function (index) { return requireColumn(dataset, index, 'Correlation column'); });
    if (typeof correlation !== 'function') throw new Error('A correlation function is required.');
    return cols.map(function (leftIndex) {
      return cols.map(function (rightIndex) {
        const pair = pairwiseNumericColumns(dataset, leftIndex, rightIndex);
        return pair.n >= 2 ? correlation(pair.left, pair.right) : NaN;
      });
    });
  }

  function missingnessMatrix(dataset, maxRows) {
    const rows = dataset.rows.slice(0, maxRows || 250);
    return {
      z: rows.map(function (row) { return row.cells.map(function (value) { return value === null ? 1 : 0; }); }),
      x: dataset.names.slice(),
      y: rows.map(function (row) { return row.index; }),
      truncated: rows.length < dataset.rows.length,
    };
  }

  const api = {
    detectDelimiter,
    parseDelimitedRows,
    parseDataset,
    requireColumn,
    numericValues,
    prepareRows,
    pairedNumeric,
    groupedNumeric,
    pairwiseNumericColumns,
    pairwiseCorrelationMatrix,
    missingnessMatrix,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoDataCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
