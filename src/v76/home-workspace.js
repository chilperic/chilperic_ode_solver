(function initV76HomeWorkspace(root) {
  'use strict';

  const doc = root.document;
  if (!doc) return;

  const byId = id => doc.getElementById(id);
  const finitePositive = (value, label) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be a finite number greater than zero.`);
    return number;
  };

  function renderEquation() {
    const host = byId('v76HomeEquation');
    if (!host) return;
    if (root.katex && typeof root.katex.render === 'function') {
      root.katex.render(String.raw`\frac{\mathrm{d}x}{\mathrm{d}t}=r\,x\left(1-\frac{x}{K}\right)`, host, {
        displayMode: true,
        throwOnError: false,
        strict: false
      });
    }
  }

  function svgNode(tag, attrs) {
    const node = doc.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function renderPlot(svg, result, capacity) {
    const bounds = svg.getBoundingClientRect();
    const width = Math.max(320, Math.round(bounds.width || 520));
    const height = Math.max(250, Math.round(bounds.height || 300));
    const margin = { left: 42, right: 16, top: 16, bottom: 34 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const values = result.Y[0];
    const tMin = result.T[0];
    const tMax = result.T[result.T.length - 1];
    const yMax = Math.max(capacity * 1.08, ...values) || 1;
    const x = time => margin.left + (time - tMin) / Math.max(1e-12, tMax - tMin) * innerWidth;
    const y = value => margin.top + innerHeight - value / yMax * innerHeight;

    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('data-render-state', 'rendered');

    const grid = svgNode('g', { stroke: '#465261', 'stroke-width': 1, opacity: .62 });
    for (let i = 0; i <= 4; i += 1) {
      const yy = margin.top + innerHeight * i / 4;
      grid.appendChild(svgNode('line', { x1: margin.left, y1: yy, x2: width - margin.right, y2: yy }));
    }
    for (let i = 0; i <= 5; i += 1) {
      const xx = margin.left + innerWidth * i / 5;
      grid.appendChild(svgNode('line', { x1: xx, y1: margin.top, x2: xx, y2: height - margin.bottom }));
    }
    svg.appendChild(grid);

    const capacityY = y(capacity);
    svg.appendChild(svgNode('line', {
      x1: margin.left,
      y1: capacityY,
      x2: width - margin.right,
      y2: capacityY,
      stroke: '#E8A11A',
      'stroke-width': 1.5,
      'stroke-dasharray': '5 5',
      opacity: .9
    }));

    const areaPoints = result.T.map((time, index) => `${x(time)},${y(values[index])}`).join(' ');
    const area = `${margin.left},${height - margin.bottom} ${areaPoints} ${width - margin.right},${height - margin.bottom}`;
    svg.appendChild(svgNode('polygon', { points: area, fill: '#008C7A', opacity: .17 }));
    svg.appendChild(svgNode('polyline', {
      points: areaPoints,
      fill: 'none',
      stroke: '#69D2C2',
      'stroke-width': 3,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }));

    const endX = x(tMax);
    const endY = y(values[values.length - 1]);
    svg.appendChild(svgNode('circle', { cx: endX, cy: endY, r: 5, fill: '#F7F8F5', stroke: '#E8A11A', 'stroke-width': 3 }));

    const axis = svgNode('g', { fill: '#AEB8C4', 'font-family': 'Inter, sans-serif', 'font-size': 10 });
    const xLabel = svgNode('text', { x: margin.left + innerWidth / 2, y: height - 8, 'text-anchor': 'middle' });
    xLabel.textContent = 'time';
    const yLabel = svgNode('text', { x: 12, y: margin.top + innerHeight / 2, transform: `rotate(-90 12 ${margin.top + innerHeight / 2})`, 'text-anchor': 'middle' });
    yLabel.textContent = 'state x';
    const capacityLabel = svgNode('text', { x: width - margin.right - 3, y: capacityY - 6, 'text-anchor': 'end', fill: '#F2C66D' });
    capacityLabel.textContent = 'K';
    axis.append(xLabel, yLabel, capacityLabel);
    svg.appendChild(axis);
  }

  function run() {
    const status = byId('v76HomeStatus');
    try {
      if (!root.FokoODECore || typeof root.FokoODECore.solveWithRhs !== 'function') {
        throw new Error('The numerical engine is still loading.');
      }
      const rate = finitePositive(byId('v76HomeRate').value, 'Growth rate');
      const capacity = finitePositive(byId('v76HomeCapacity').value, 'Capacity');
      const initial = finitePositive(byId('v76HomeInitial').value, 'Initial state');
      status.textContent = 'Computing locally…';
      const result = root.FokoODECore.solveWithRhs({
        t0: 0,
        t1: 14,
        y0: [initial],
        vars: ['x'],
        method: 'rk45',
        points: 181,
        rtol: 1e-7,
        atol: 1e-9,
        params: { r: rate, K: capacity }
      }, (_time, state, params) => [params.r * state[0] * (1 - state[0] / params.K)]);
      if (!result.ok || !result.Y[0].every(Number.isFinite)) throw new Error('The experiment did not produce a finite trajectory.');
      renderPlot(byId('v76HomePlot'), result, capacity);
      byId('v76HomeAccepted').textContent = String(result.diagnostics.accepted);
      byId('v76HomeRejected').textContent = String(result.diagnostics.rejected);
      byId('v76HomeFinal').textContent = result.Y[0].at(-1).toFixed(3);
      status.textContent = result.status === 'success' ? 'Computed · current' : 'Computed · inspect warning';
      byId('v76HomePlot').dataset.engine = 'FokoODECore';
    } catch (error) {
      status.textContent = error.message;
      byId('v76HomePlot')?.setAttribute('data-render-state', 'failed');
    }
  }

  function install() {
    if (!byId('v76HomeRun')) return;
    renderEquation();
    byId('v76HomeRun').addEventListener('click', run);
    ['v76HomeRate', 'v76HomeCapacity', 'v76HomeInitial'].forEach(id => {
      byId(id).addEventListener('input', () => {
        byId('v76HomeStatus').textContent = 'Inputs changed · run required';
        byId('v76HomePlot').dataset.stale = 'true';
      });
    });
    root.setTimeout(run, 0);
    root.addEventListener('resize', () => {
      if (byId('v76HomePlot')?.dataset.renderState === 'rendered') run();
    }, { passive: true });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})(typeof window !== 'undefined' ? window : globalThis);
