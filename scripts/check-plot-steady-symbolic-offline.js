#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const stripExternalResources = (html) => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<link\b[^>]*>/gi, '')
  .replace(/(<img\b[^>]*?)\s+src=(['"])[\s\S]*?\2/gi, '$1');

function boxesOverlap(a, b, tolerance = 1) {
  return !(a.right <= b.left + tolerance || b.right <= a.left + tolerance || a.bottom <= b.top + tolerance || b.bottom <= a.top + tolerance);
}

async function addBaseStyles(page, extras = []) {
  for (const css of ['styles/v72-tokens.css', 'styles/v72-lab-shell.css', 'styles/v72-accessibility-performance.css', ...extras]) {
    await page.addStyleTag({ path: path.join(ROOT, css) });
  }
}

async function installBrowserState(page) {
  await page.evaluate(() => {
    const store = new Map();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => store.has(String(key)) ? store.get(String(key)) : null,
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(String(key)); },
        clear: () => { store.clear(); }
      }
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
      }
    });
    history.replaceState = () => {};
  });
}

async function addScripts(page, scripts) {
  for (const script of scripts) await page.addScriptTag({ path: path.join(ROOT, script) });
}


function localResourcePaths(html, tag, attribute) {
  const pattern = new RegExp(`<${tag}\\b[^>]*${attribute}=["']([^"']+)["'][^>]*>`, 'gi');
  return Array.from(html.matchAll(pattern), (match) => match[1].split('?', 1)[0])
    .filter((value) => value && !/^(?:https?:|data:|\/\/)/i.test(value));
}

async function loadAuthoredPage(page, filename) {
  const html = read(filename);
  const styles = localResourcePaths(html, 'link', 'href').filter((value) => value.endsWith('.css'));
  const scripts = localResourcePaths(html, 'script', 'src').filter((value) => value.endsWith('.js'));
  await page.setContent(stripExternalResources(html), { waitUntil: 'domcontentloaded' });
  await installBrowserState(page);
  for (const stylesheet of styles) await page.addStyleTag({ path: path.join(ROOT, stylesheet) });
  for (const script of scripts) await page.addScriptTag({ path: path.join(ROOT, script) });
  if (filename === 'optimization.html') await page.evaluate(() => window.dispatchEvent(new Event('DOMContentLoaded')));
}

async function assertActionButtonsNotClipped(page, selector, label) {
  const rows = await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      text: node.textContent.replace(/\s+/g, ' ').trim(),
      height: rect.height,
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      overflowY: style.overflowY
    };
  }));
  assert.ok(rows.length, `${label}: no action controls found.`);
  for (const row of rows) {
    assert.ok(row.height >= 44, `${label}: ${row.text} is too short (${row.height}px).`);
    assert.ok(row.scrollHeight <= row.clientHeight + 2 || row.overflowY === 'visible', `${label}: ${row.text} is vertically clipped.`);
  }
}

async function assertPlotGeometry(page, hostSelector, label) {
  const geometry = await page.locator(hostSelector).evaluate((host) => {
    const box = (selector) => {
      const node = host.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, text: node.textContent.trim() };
    };
    return {
      host: (() => { const r = host.getBoundingClientRect(); return { left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height }; })(),
      title: box('.gtitle'),
      legend: box('.legend'),
      xTitle: box('.xtitle'),
      yTitle: box('.ytitle'),
      plot: box('.plot')
    };
  });
  assert.ok(geometry.host.width > 300 && geometry.host.height > 300, `${label}: plot host collapsed.`);
  assert.ok(!geometry.title || !geometry.title.text, `${label}: Plotly duplicated the card title (${geometry.title ? geometry.title.text : ''}).`);
  if (geometry.legend && geometry.xTitle) assert.ok(!boxesOverlap(geometry.legend, geometry.xTitle), `${label}: legend overlaps x-axis title.`);
  if (geometry.legend && geometry.yTitle) assert.ok(!boxesOverlap(geometry.legend, geometry.yTitle), `${label}: legend overlaps y-axis title.`);
  for (const entry of [geometry.legend, geometry.xTitle, geometry.yTitle].filter(Boolean)) {
    assert.ok(entry.left >= geometry.host.left - 3 && entry.right <= geometry.host.right + 3, `${label}: annotation escapes horizontally.`);
    assert.ok(entry.top >= geometry.host.top - 3 && entry.bottom <= geometry.host.bottom + 3, `${label}: annotation escapes vertically.`);
  }
}

async function syntheticPlotContract(browser) {
  const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
  await page.setContent(`<!doctype html><html data-theme="aurora"><body data-v72-shell="true"><main class="layout"><section class="workspace v72-workspace"><article class="chart-card"><div class="chart-title"><h3>Stiffness evidence timeline</h3><select><option>Stiffness evidence timeline</option></select><button class="focus-card">Focus</button><button class="kebab">⇩</button></div><div id="contractPlot" class="plot"></div></article></section></main></body></html>`);
  await addBaseStyles(page);
  await addScripts(page, ['assets/vendor/plotly/plotly-2.35.2.min.js', 'src/v72/accessibility-performance.js']);
  await page.evaluate(async () => {
    await window.FokoPlotLifecycle.render(document.getElementById('contractPlot'), [
      { x: [0, 20, 40], y: [1, 1, 3.1], type: 'scatter', mode: 'lines+markers', name: 'timescale ratio' },
      { x: [0, 20, 40], y: [1, 1, 1], type: 'scatter', mode: 'lines', name: 'heuristic threshold', line: { dash: 'dash' } }
    ], {
      title: { text: 'Stiffness evidence timeline' },
      margin: { l: 20, r: 8, t: 20, b: 18 },
      xaxis: { title: 'sample time' },
      yaxis: { title: 'local timescale ratio' },
      legend: { orientation: 'h', y: -0.35 }
    }, { responsive: true, displaylogo: false });
  });
  await page.waitForFunction(() => document.getElementById('contractPlot').dataset.renderState === 'rendered');
  await assertPlotGeometry(page, '#contractPlot', 'shared Plotly normalizer');
  await page.close();
}




async function odeLoadRunGeometryContract(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const html = read('ode.html');
  await page.setContent(stripExternalResources(html), { waitUntil: 'domcontentloaded' });
  await installBrowserState(page);
  for (const stylesheet of localResourcePaths(html, 'link', 'href').filter((value) => value.endsWith('.css'))) {
    await page.addStyleTag({ path: path.join(ROOT, stylesheet) });
  }

  // Exercise the authored ODE UI without localhost. The worker facade runs the
  // same FokoODECore and Math.js expressions asynchronously, preserving the
  // page's Load-versus-Run boundary and worker message lifecycle.
  await page.evaluate(() => {
    class OfflineOdeWorker {
      constructor() {
        this.onmessage = null;
        this.onerror = null;
        this.terminated = false;
      }
      terminate() { this.terminated = true; }
      postMessage(message) {
        if (message && message.type === 'cancel') { this.terminated = true; return; }
        if (!message || message.type !== 'solve') {
          const error = new Error(`Offline ODE worker only supports solve, received ${message && message.type}.`);
          if (typeof this.onerror === 'function') this.onerror(error);
          return;
        }
        const cfg = message.payload;
        setTimeout(() => {
          if (this.terminated) return;
          try {
            const compiled = cfg.eqs.map((expression) => window.math.parse(String(expression)).compile());
            const rhs = (t, y, params) => {
              const scope = { t, ...params };
              cfg.vars.forEach((name, index) => { scope[name] = y[index]; });
              return compiled.map((expression) => {
                const value = expression.evaluate(scope);
                if (!Number.isFinite(value)) throw new Error('ODE expression produced a non-finite value.');
                return value;
              });
            };
            const result = window.FokoODECore.solveWithRhs(cfg, rhs, {
              cancelled: () => this.terminated,
              progress: (fraction, label) => {
                if (!this.terminated && typeof this.onmessage === 'function') {
                  this.onmessage({ data: { progress: fraction, text: label } });
                }
              },
              now: () => performance.now()
            });
            if (!this.terminated && typeof this.onmessage === 'function') this.onmessage({ data: result });
          } catch (error) {
            if (!this.terminated && typeof this.onerror === 'function') this.onerror(error);
          }
        }, 0);
      }
    }
    Object.defineProperty(window, 'Worker', { configurable: true, writable: true, value: OfflineOdeWorker });
  });

  const authoredScripts = localResourcePaths(html, 'script', 'src').filter((value) => value.endsWith('.js'));
  for (const script of authoredScripts) {
    if (script === 'src/platform/compute-bus.js') {
      await page.addScriptTag({ path: path.join(ROOT, 'src/core/ode.js') });
    }
    await page.addScriptTag({ path: path.join(ROOT, script) });
  }
  await page.evaluate(() => window.dispatchEvent(new Event('load')));

  await page.waitForFunction(() => document.querySelectorAll('#exampleSelect option').length > 10 && document.getElementById('topStatus').textContent.trim() === 'Ready');
  await page.locator('#exampleSelect').selectOption({ label: 'Van der Pol' });
  await page.locator('#loadExample').click();
  assert.equal((await page.locator('#topStatus').textContent()).trim(), 'Ready', 'Loading an ODE example must not compute it implicitly.');
  await page.locator('#runBtn').click();
  await page.waitForFunction(() => /successful|warning/i.test(document.getElementById('topStatus').textContent), null, { timeout: 30000 });
  await page.locator('#leftPlotType').selectOption('stiffness');
  await page.waitForFunction(() => document.getElementById('leftPlot').dataset.renderState === 'rendered');
  await assertPlotGeometry(page, '#leftPlot', 'ODE stiffness evidence timeline');
  await page.close();
}

async function authoredScreenshotLabsContract(browser) {
  for (const spec of [
    {
      file: 'optimization.html',
      status: () => document.getElementById('optimizationTopStatus').textContent.trim() === 'Feasible candidate',
      label: 'Optimization',
      controls: '.actionbar > button, .actionbar > .file-label'
    },
    {
      file: 'stochastic.html',
      status: () => /Successful|warning/i.test(document.getElementById('stochasticTopStatus').textContent.trim()),
      label: 'Stochastic',
      controls: '.actionbar > button, .actionbar > .file-label'
    }
  ]) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await loadAuthoredPage(page, spec.file);
    await page.waitForFunction(spec.status, null, { timeout: 30000 });
    await page.waitForFunction(() => document.getElementById('leftPlot').dataset.renderState === 'rendered' && document.getElementById('rightPlot').dataset.renderState === 'rendered', null, { timeout: 30000 });
    await assertPlotGeometry(page, '#leftPlot', `${spec.label} primary plot`);
    await assertPlotGeometry(page, '#rightPlot', `${spec.label} secondary plot`);
    await assertActionButtonsNotClipped(page, spec.controls, `${spec.label} controls`);
    await page.close();
  }
}

async function steadyContract(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.setContent(stripExternalResources(read('steady.html')), { waitUntil: 'domcontentloaded' });
  await installBrowserState(page);
  await addBaseStyles(page);
  await addScripts(page, [
    'assets/vendor/katex/katex-0.16.47.min.js',
    'assets/vendor/mathjs/math-15.2.0.js',
    'assets/vendor/plotly/plotly-2.35.2.min.js',
    'src/v72/accessibility-performance.js',
    'src/models/steady-presets.js',
    'src/core/steady.js',
    'src/v72/steady-workspace.js'
  ]);
  await page.waitForFunction(() => document.querySelectorAll('#steadySelect option').length >= 26 && document.getElementById('steadyTopStatus').textContent.trim() === 'Converged', null, { timeout: 20000 });
  assert.equal(await page.locator('#steadySelect option').count(), 26, 'Steady-State example count changed unexpectedly.');
  assert.equal(await page.locator('#steadyDeck [data-steady-preset]').count(), 26, 'Steady-State deck does not expose all examples.');
  await page.waitForFunction(() => document.getElementById('leftPlot').dataset.renderState === 'rendered' && document.getElementById('rightPlot').dataset.renderState === 'rendered');
  await assertPlotGeometry(page, '#leftPlot', 'Steady-State primary plot');
  await assertPlotGeometry(page, '#rightPlot', 'Steady-State diagnostic plot');
  await assertActionButtonsNotClipped(page, '.actionbar > button, .actionbar > .file-label', 'Steady-State controls');

  await page.locator('#steadySelect').selectOption({ label: 'MAPK two-tier activation equilibrium' });
  await page.waitForFunction(() => document.getElementById('steadyTitle').textContent.includes('MAPK') && document.getElementById('steadyTopStatus').textContent.trim() === 'Converged');
  const mapkOptions = await page.locator('#leftPlotType option').allTextContents();
  assert.ok(mapkOptions.includes('Residual-norm surface') && mapkOptions.includes('Nullcline overlay'), 'Steady-State 2D solve did not expose computed spatial diagnostics.');

  await page.locator('#steadySelect').selectOption({ label: 'FADNS enzyme occupancy and CoA sequestration' });
  await page.waitForFunction(() => document.getElementById('steadyTitle').textContent.includes('FADNS') && document.getElementById('steadyTopStatus').textContent.trim() === 'Converged', null, { timeout: 20000 });
  assert.equal(await page.locator('#steadyMetricVars').textContent(), '11');
  assert.ok(Number(await page.locator('#steadyResidual').textContent().then((v) => Number(v))) <= 1e-9, 'FADNS default residual exceeds tolerance.');
  await page.close();
}

async function symbolicContract(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.setContent(stripExternalResources(read('symbolic.html')), { waitUntil: 'domcontentloaded' });
  await installBrowserState(page);
  await addBaseStyles(page, ['styles/v72-symbolic.css']);
  await addScripts(page, [
    'assets/vendor/katex/katex-0.16.47.min.js',
    'assets/vendor/plotly/plotly-2.35.2.min.js',
    'src/v72/accessibility-performance.js',
    'src/core/steady.js',
    'src/core/symbolic-reference.js',
    'src/models/symbolic-presets.js',
    'src/v72/symbolic-workspace.js'
  ]);
  await page.waitForFunction(() => document.querySelectorAll('#symbolicSelect option').length >= 20 && document.getElementById('symbolicTopStatus').textContent.trim() === 'Computed', null, { timeout: 20000 });
  assert.equal(await page.locator('#symbolicSelect option').count(), 20, 'Symbolic example count changed unexpectedly.');
  assert.equal(await page.locator('#symbolicDeck [data-symbolic-preset]').count(), 20, 'Symbolic deck does not expose all examples.');
  await page.waitForFunction(() => document.getElementById('leftPlot').dataset.renderState === 'rendered' && document.getElementById('rightPlot').dataset.renderState === 'rendered');
  await assertPlotGeometry(page, '#leftPlot', 'Symbolic primary plot');
  await assertPlotGeometry(page, '#rightPlot', 'Symbolic secondary plot');
  await assertActionButtonsNotClipped(page, '.actionbar > button', 'Symbolic controls');

  await page.locator('#symbolicSelect').selectOption('cstr');
  await page.waitForFunction(() => document.getElementById('symbolicSelect').value === 'cstr' && document.getElementById('symbolicTopStatus').textContent.trim() === 'Computed');
  const options = await page.locator('#leftPlotType option').allTextContents();
  assert.ok(options.includes('Two-dimensional vector field') && options.includes('Residual contours / nullclines'), 'Symbolic CSTR analysis did not expose vector-field/nullcline evidence.');
  const mathStatuses = await page.locator('#symbolicEquations .symbolic-equation').evaluateAll((nodes) => nodes.map((node) => node.dataset.mathStatus));
  assert.ok(mathStatuses.length >= 4 && mathStatuses.every((status) => status === 'rendered'), 'Symbolic equations did not use the shared KaTeX contract.');
  assert.equal(await page.locator('#plotGrid').getAttribute('data-layout'), 'two');
  await page.close();
}

(async () => {
  const browser = await chromium.launch({
    executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    await syntheticPlotContract(browser);
    await authoredScreenshotLabsContract(browser);
    await odeLoadRunGeometryContract(browser);
    await steadyContract(browser);
    await symbolicContract(browser);
    console.log('Shared plot, control, ODE Load/Run, Optimization, Stochastic, Steady-State and Symbolic offline Chromium contracts passed.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error('Shared plot / Steady-State / Symbolic offline Chromium contract failed.');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
