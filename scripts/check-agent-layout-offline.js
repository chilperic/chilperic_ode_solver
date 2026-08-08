#!/usr/bin/env node
'use strict';

/*
 * Browser-level Agent layout regression that does not require a localhost URL.
 * It loads the release's real HTML, CSS, Plotly bundle and Agent runtime into
 * Chromium, disables Worker only to select the real paced main-thread path,
 * then exercises dropdown swaps, live canvases, delayed completion and the
 * single-render-root invariant.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function stripExternalResources(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/(<img\b[^>]*?)\s+src=(['"])[\s\S]*?\2/gi, '$1');
}

function speedValuesFromHtml(html) {
  const match = html.match(/<select\s+id="agentLiveSpeed"[^>]*>([\s\S]*?)<\/select>/i);
  if (!match) throw new Error('Agent live-speed select is absent from agent.html.');
  return Array.from(match[1].matchAll(/<option\b[^>]*value="([^"]+)"/gi), (entry) => entry[1]);
}

async function snapshot(page, label) {
  return page.evaluate((name) => {
    const grid = document.getElementById('agentPlotGrid');
    const leftCard = document.querySelector('[data-plot-card="left"]');
    const rightCard = document.querySelector('[data-plot-card="right"]');
    const leftHost = document.getElementById('leftAgentPlot');
    const rightHost = document.getElementById('rightAgentPlot');
    const box = (node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { display: style.display, visibility: style.visibility, width: rect.width, height: rect.height };
    };
    return {
      label: name,
      layout: grid.dataset.layout,
      preferred: grid.dataset.preferredLayout,
      reason: grid.dataset.layoutReason,
      focusSide: grid.dataset.focusSide,
      leftValue: document.getElementById('leftAgentPlotType').value,
      rightValue: document.getElementById('rightAgentPlotType').value,
      leftCard: box(leftCard),
      rightCard: box(rightCard),
      leftRoots: window.FokoAgentRenderInvariant.activeRenderRoots('left'),
      rightRoots: window.FokoAgentRenderInvariant.activeRenderRoots('right'),
      leftKind: leftHost.dataset.agentRenderKind || '',
      rightKind: rightHost.dataset.agentRenderKind || '',
      leftLiveLattice: leftHost.querySelectorAll('canvas.agent-live-lattice').length,
      rightLiveLattice: rightHost.querySelectorAll('canvas.agent-live-lattice').length,
      leftLivePopulation: leftHost.querySelectorAll('canvas.agent-live-population').length,
      rightLivePopulation: rightHost.querySelectorAll('canvas.agent-live-population').length,
      status: document.getElementById('agentTopStatus').textContent.trim()
    };
  }, label);
}

function assertTwoUp(state, phase) {
  assert.equal(state.layout, 'two', `${phase}: effective layout changed from two-up.`);
  assert.equal(state.preferred, 'two', `${phase}: preferred layout changed from two-up.`);
  assert.notEqual(state.leftCard.display, 'none', `${phase}: left card is hidden.`);
  assert.notEqual(state.rightCard.display, 'none', `${phase}: right card is hidden.`);
  assert.ok(state.leftCard.width > 250, `${phase}: left card width collapsed (${state.leftCard.width}).`);
  assert.ok(state.rightCard.width > 250, `${phase}: right card width collapsed (${state.rightCard.width}).`);
  assert.ok(Math.abs(state.leftCard.width - state.rightCard.width) <= 2,
    `${phase}: panel widths differ (${state.leftCard.width} vs ${state.rightCard.width}).`);
}

async function waitFor(page, predicate, message, timeout = 15000) {
  await page.waitForFunction(predicate, null, { timeout }).catch((error) => {
    throw new Error(`${message}\n${error.message}`);
  });
}

(async () => {
  const html = read('agent.html');
  const speeds = speedValuesFromHtml(html);
  assert.ok(speeds.includes('90'), `Agent test speed 90 is not present. Available values: ${speeds.join(', ')}`);

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    page.on('pageerror', (error) => { throw error; });

    await page.setContent(stripExternalResources(html), { waitUntil: 'domcontentloaded' });
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
      Object.defineProperty(window, 'Worker', { configurable: true, writable: true, value: undefined });
    });

    for (const css of [
      'styles/v72-tokens.css',
      'styles/v72-lab-shell.css',
      'styles/v72-accessibility-performance.css'
    ]) await page.addStyleTag({ path: path.join(ROOT, css) });

    for (const script of [
      'assets/vendor/plotly/plotly-2.35.2.min.js',
      'src/v72/accessibility-performance.js',
      'src/core/agent-reference.js',
      'src/core/live-3d.js',
      'src/models/agent-presets.js',
      'src/v72/agent-workspace.js'
    ]) await page.addScriptTag({ path: path.join(ROOT, script) });

    await waitFor(page, () => {
      const left = document.getElementById('leftAgentPlotType');
      const right = document.getElementById('rightAgentPlotType');
      return window.FokoAgentLayout && window.FokoAgentRenderInvariant && left.options.length > 2 && right.options.length > 2;
    }, 'Agent workspace did not initialize in the offline Chromium harness.');

    let state = await snapshot(page, 'initial');
    assertTwoUp(state, 'initial');
    assert.equal(state.leftValue, 'spatial-dynamics');
    assert.equal(state.rightValue, 'population');

    await page.locator('#rightAgentPlotType').click();
    state = await snapshot(page, 'dropdown-open');
    assertTwoUp(state, 'opening right dropdown');
    await page.keyboard.press('Escape');

    await page.locator('#rightAgentPlotType').selectOption('spatial-dynamics');
    state = await snapshot(page, 'pre-run-swap');
    assertTwoUp(state, 'pre-run selector swap');
    assert.equal(state.leftValue, 'population');
    assert.equal(state.rightValue, 'spatial-dynamics');

    await page.locator('#agentSize').fill('16');
    await page.locator('#agentSteps').fill('120');
    await page.locator('#agentRuns').fill('4');
    await page.locator('#agentSnapshotCount').fill('8');
    await page.locator('#agentLiveSpeed').selectOption('90');
    await page.locator('#runAgent').click();

    await waitFor(page, () =>
      document.querySelectorAll('#rightAgentPlot canvas.agent-live-lattice').length === 1 &&
      document.querySelectorAll('#leftAgentPlot canvas.agent-live-population').length === 1,
    'Expected live lattice and population canvases were not mounted.');

    state = await snapshot(page, 'live-before-swap');
    assertTwoUp(state, 'live preview before swap');
    assert.equal(state.leftRoots, 1, 'Live left panel must own one render root.');
    assert.equal(state.rightRoots, 1, 'Live right panel must own one render root.');
    assert.equal(state.leftLivePopulation, 1);
    assert.equal(state.rightLiveLattice, 1);

    await page.locator('#leftAgentPlotType').selectOption('spatial-dynamics');
    await waitFor(page, () =>
      document.querySelectorAll('#leftAgentPlot canvas.agent-live-lattice').length === 1 &&
      document.querySelectorAll('#rightAgentPlot canvas.agent-live-population').length === 1,
    'Live panel swap did not remount the selected views.');

    state = await snapshot(page, 'live-after-swap');
    assertTwoUp(state, 'live selector swap');
    assert.equal(state.leftValue, 'spatial-dynamics');
    assert.equal(state.rightValue, 'population');
    assert.equal(state.leftRoots, 1);
    assert.equal(state.rightRoots, 1);
    assert.equal(state.leftLiveLattice, 1);
    assert.equal(state.rightLivePopulation, 1);

    await waitFor(page, () => document.getElementById('agentTopStatus').textContent.trim() === 'Rendered',
      'Agent ensemble did not reach the rendered state.', 45000);

    state = await snapshot(page, 'completed');
    assertTwoUp(state, 'delayed completion');
    assert.equal(state.leftRoots, 1, 'Completed left panel must own one render root.');
    assert.equal(state.rightRoots, 1, 'Completed right panel must own one render root.');
    assert.equal(state.status, 'Rendered');

    console.log('Agent offline Chromium regression passed: dropdowns, live views, panel swap, delayed completion, two-up persistence and one render root per panel.');
    console.log(JSON.stringify(state, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error('Agent offline Chromium regression failed.');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
