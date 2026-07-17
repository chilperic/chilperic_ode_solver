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

function localResourcePaths(html, tag, attribute) {
  const pattern = new RegExp(`<${tag}\\b[^>]*${attribute}=["']([^"']+)["'][^>]*>`, 'gi');
  return Array.from(html.matchAll(pattern), (match) => match[1].split('?', 1)[0])
    .filter((value) => value && !/^(?:https?:|data:|\/\/)/i.test(value));
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
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} }
    });
    history.replaceState = () => {};
  });
}

async function loadAuthoredPage(page, filename) {
  const html = read(filename);
  const styles = localResourcePaths(html, 'link', 'href').filter((value) => value.endsWith('.css'));
  const scripts = localResourcePaths(html, 'script', 'src').filter((value) => value.endsWith('.js'));
  await page.setContent(stripExternalResources(html), { waitUntil: 'domcontentloaded' });
  await installBrowserState(page);
  for (const stylesheet of styles) await page.addStyleTag({ path: path.join(ROOT, stylesheet) });
  for (const script of scripts) await page.addScriptTag({ path: path.join(ROOT, script) });
  // Authored modules use both immediate boot and DOMContentLoaded guards.
  await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true })));
}


async function documentationContract(browser) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await loadAuthoredPage(page, 'docs.html');
  await page.waitForFunction(() => document.querySelector('#analysisTaxonomyDocs') && document.querySelector('a[href="ANALYSIS_TAXONOMY.json"]'), null, { timeout: 10000 });
  assert.equal(await page.locator('#analysisTaxonomyDocs').count(), 1, 'Documentation taxonomy section is absent.');
  assert.match(await page.locator('#analysisTaxonomyDocs').textContent(), /implemented, limited, export-only, and unavailable/i, 'Documentation does not explain capability boundaries.');
  assert.match(await page.locator('main').textContent(), /Sensitivity Analysis Lab/i, 'Documentation does not explain the first-class Sensitivity workspace.');
  assert.equal(await page.locator('a[href="ANALYSIS_TAXONOMY.json"]').count(), 1, 'Documentation JSON download link is absent.');
  await page.close();
}

async function optimizationContract(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await loadAuthoredPage(page, 'optimization.html');
  await page.waitForFunction(() => {
    const catalog = document.querySelectorAll('#optimizationTaxonomyCatalog > details');
    const presets = document.querySelectorAll('#optimizationSelect option');
    return catalog.length === 4 && presets.length >= 17;
  }, null, { timeout: 20000 });

  assert.match(await page.locator('#optimizationTaxonomySummary').textContent(), /60 taxonomy entries/i);
  await page.locator('#optimizationExampleSearch').fill('Beale');
  assert.equal(await page.locator('#optimizationDeck [data-preset="Beale function"]:visible').count(), 1, 'Beale was not exposed by taxonomy-aware search.');
  await page.locator('#optimizationExampleSearch').fill('');

  await page.locator('#optimizationSelect').selectOption({ label: 'Bi-objective Rosenbrock–Rastrigin' });
  await page.locator('#loadOptimization').click();
  await page.locator('#optimizationIterations').fill('35');
  await page.locator('#optimizationPopulation').fill('18');
  await page.locator('#optimizationParetoSamples').fill('260');
  await page.locator('#runOptimization').click();
  await page.waitForFunction(() => /Feasible candidate|Feasibility warning/.test(document.getElementById('optimizationTopStatus').textContent), null, { timeout: 30000 });

  const options = await page.locator('#leftPlotType option').evaluateAll((nodes) => nodes.map((node) => node.value));
  for (const id of ['pareto', 'dominance-heatmap', 'crowding-distance', 'hypervolume-convergence', 'objective-correlation', 'knee-point', 'local-sensitivity']) {
    assert.ok(options.includes(id), `Optimization runtime did not expose ${id}.`);
  }
  await page.locator('#leftPlotType').selectOption('dominance-heatmap');
  await page.locator('#rightPlotType').selectOption('knee-point');
  await page.waitForFunction(() => document.getElementById('leftPlot').dataset.renderState === 'rendered' && document.getElementById('rightPlot').dataset.renderState === 'rendered');
  assert.equal(await page.locator('#plotGrid').getAttribute('data-layout'), 'two');
  assert.equal(await page.locator('#leftPlot .js-plotly-plot, #leftPlot.js-plotly-plot').count() > 0, true, 'Dominance heatmap did not render.');
  assert.equal(await page.locator('#rightPlot .js-plotly-plot, #rightPlot.js-plotly-plot').count() > 0, true, 'Knee-point plot did not render.');
  await page.close();
}

async function optimizationMobileOverflowContract(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await loadAuthoredPage(page, 'optimization.html');
  await page.waitForFunction(() => document.getElementById('plotGrid')?.dataset.layout === 'focus', null, { timeout: 10000 });
  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    sideNavClientWidth: document.querySelector('.side-nav')?.clientWidth || 0,
    sideNavScrollWidth: document.querySelector('.side-nav')?.scrollWidth || 0,
    sideNavOverflow: getComputedStyle(document.querySelector('.side-nav')).overflowX
  }));
  assert.ok(geometry.documentWidth <= geometry.viewport + 2, `Optimization mobile document overflows: ${geometry.documentWidth}px for ${geometry.viewport}px viewport.`);
  assert.ok(geometry.bodyWidth <= geometry.viewport + 2, `Optimization mobile body overflows: ${geometry.bodyWidth}px for ${geometry.viewport}px viewport.`);
  assert.equal(geometry.sideNavOverflow, 'auto', 'Mobile side navigation must contain its wide tabs in an internal scroller.');
  assert.ok(geometry.sideNavScrollWidth >= geometry.sideNavClientWidth, 'Mobile side navigation geometry is inconsistent.');
  await page.close();
}

async function steadyContract(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await loadAuthoredPage(page, 'steady.html');
  await page.waitForFunction(() => document.querySelectorAll('#steadyTaxonomyCatalog > details').length === 4 && document.querySelectorAll('#steadySelect option').length >= 26, null, { timeout: 20000 });

  await page.locator('#steadySelect').selectOption({ label: 'Brusselator equilibrium' });
  await page.locator('#loadSteady').click();
  await page.locator('#solveSteady').click();
  await page.waitForFunction(() => document.getElementById('steadyTopStatus').textContent.trim() === 'Converged', null, { timeout: 20000 });
  let options = await page.locator('#leftPlotType option').evaluateAll((nodes) => nodes.map((node) => node.value));
  for (const id of ['jacobian-sign', 'stiffness-indicator']) assert.ok(options.includes(id), `Steady-State runtime did not expose ${id}.`);
  await page.locator('#leftPlotType').selectOption('jacobian-sign');
  await page.locator('#rightPlotType').selectOption('stiffness-indicator');
  await page.waitForFunction(() => document.getElementById('leftPlot').dataset.renderState === 'rendered' && document.getElementById('rightPlot').dataset.renderState === 'rendered');

  await page.locator('#steadyScanN').fill('9');
  await page.locator('#runScan1D').click();
  await page.waitForFunction(() => /Scan complete|Scan incomplete/.test(document.getElementById('steadyTopStatus').textContent), null, { timeout: 30000 });
  options = await page.locator('#leftPlotType option').evaluateAll((nodes) => nodes.map((node) => node.value));
  assert.ok(options.includes('implicit-sensitivity'), 'Steady-State scan did not expose sequential sensitivity.');
  await page.locator('#leftPlotType').selectOption('implicit-sensitivity');
  await page.waitForFunction(() => document.getElementById('leftPlot').dataset.renderState === 'rendered');
  assert.match(await page.locator('#provenanceScope').textContent(), /not pseudo-arclength continuation/i);
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
    await documentationContract(browser);
    await optimizationContract(browser);
    await optimizationMobileOverflowContract(browser);
    await steadyContract(browser);
    console.log('Documentation, Optimization, multi-objective and Steady-State taxonomy runtime contracts passed in offline Chromium.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error('Analysis taxonomy offline Chromium contract failed.');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
