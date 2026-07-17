/* Foko Lab live research-model hero. The trace is computed on page load by FokoODECore. */
(function (root) {
  'use strict';

  function byId(id) { return document.getElementById(id); }
  function text(id, value) { const node = byId(id); if (node) node.textContent = String(value); }
  function finite(value, digits) { return Number.isFinite(value) ? Number(value).toPrecision(digits || 4) : '—'; }

  function makePath(xs, ys, width, height, bounds) {
    const left = 42, right = 14, top = 14, bottom = 28;
    const innerW = Math.max(1, width - left - right);
    const innerH = Math.max(1, height - top - bottom);
    const xSpan = Math.max(1e-12, bounds.xMax - bounds.xMin);
    const ySpan = Math.max(1e-12, bounds.yMax - bounds.yMin);
    return xs.map(function (x, index) {
      const px = left + (x - bounds.xMin) / xSpan * innerW;
      const py = top + (bounds.yMax - ys[index]) / ySpan * innerH;
      return (index === 0 ? 'M' : 'L') + px.toFixed(2) + ',' + py.toFixed(2);
    }).join(' ');
  }

  function svgNode(name, attributes) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }

  function renderSvg(result, labels) {
    const svg = byId('homeResearchPlot');
    if (!svg) return;
    const width = 760, height = 360;
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.replaceChildren();
    const values = result.Y.flat().filter(Number.isFinite);
    const yMin = Math.min.apply(null, values);
    const yMax = Math.max.apply(null, values);
    const pad = Math.max(1e-6, (yMax - yMin) * 0.08);
    const bounds = { xMin: result.T[0], xMax: result.T[result.T.length - 1], yMin: Math.min(0, yMin - pad), yMax: yMax + pad };

    svg.appendChild(svgNode('rect', { x: 0, y: 0, width: width, height: height, rx: 18, class: 'home-live-bg' }));
    [0, 0.25, 0.5, 0.75, 1].forEach(function (fraction) {
      const y = 14 + fraction * (height - 42);
      svg.appendChild(svgNode('line', { x1: 42, x2: width - 14, y1: y, y2: y, class: 'home-live-gridline' }));
    });
    result.Y.forEach(function (series, index) {
      const path = svgNode('path', {
        d: makePath(result.T, series, width, height, bounds),
        class: 'home-live-series home-live-series-' + index,
        'aria-label': labels[index] + ' trajectory'
      });
      svg.appendChild(path);
    });
    const xLabel = svgNode('text', { x: width - 18, y: height - 8, 'text-anchor': 'end', class: 'home-live-axis-label' });
    xLabel.textContent = 'model time';
    svg.appendChild(xLabel);
  }

  function run() {
    const core = root.FokoODECore;
    const models = root.FokoHomeResearchModels;
    if (!core || !models) {
      text('homeResearchStatus', 'Not computed: numerical core unavailable.');
      return;
    }
    const model = models.fattyAcidMetabolism;
    text('homeResearchStatus', 'Computing locally…');
    root.requestAnimationFrame(function () {
      try {
        const result = core.solveWithRhs(Object.assign({}, model.config, { params: model.parameters }), model.rhs);
        if (!result || !result.ok) throw new Error(result && result.error || 'The browser solve did not complete.');
        renderSvg(result, model.variables);
        text('homeResearchStatus', result.status === 'warning' ? 'Computed with warning' : 'Computed');
        text('homeDiagMethod', result.diagnostics.method);
        text('homeDiagAccepted', result.diagnostics.accepted);
        text('homeDiagRejected', result.diagnostics.rejected);
        text('homeDiagRtol', result.diagnostics.rtol.toExponential(0));
        text('homeDiagAtol', result.diagnostics.atol.toExponential(0));
        text('homeDiagStatus', result.status === 'warning' ? 'Computed with warning' : 'Computed');
        text('homeDiagRuntime', finite(result.diagnostics.runtime, 3) + ' ms');
        const shell = byId('homeResearchEvidence');
        if (shell) {
          shell.dataset.computed = 'true';
          shell.dataset.engine = result.provenance.engine;
          shell.dataset.method = result.diagnostics.method;
        }
      } catch (error) {
        text('homeResearchStatus', 'Not computed: ' + (error.message || error));
        text('homeDiagStatus', 'Not computed');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
}(typeof window !== 'undefined' ? window : globalThis));
