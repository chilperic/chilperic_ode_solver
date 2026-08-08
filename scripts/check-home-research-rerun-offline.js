#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const stripResources = html => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<link\b[^>]*>/gi, '')
  .replace(/(<img\b[^>]*?)\s+src=(['"])[\s\S]*?\2/gi, '$1');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.setContent(stripResources(read('index.html')), { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ path: path.join(ROOT, 'styles/v76-system.css') });
    await page.addScriptTag({ path: path.join(ROOT, 'src/core/ode.js') });
    await page.addScriptTag({ path: path.join(ROOT, 'src/v76/home-workspace.js') });
    await page.waitForFunction(() => document.getElementById('v76HomePlot')?.dataset.renderState === 'rendered');

    const before = await page.locator('#v76HomeFinal').textContent();
    await page.locator('#v76HomeCapacity').fill('180');
    assert.match(await page.locator('#v76HomeStatus').textContent(), /run required/);
    await page.locator('#v76HomeRun').click();
    await page.waitForFunction(previous => document.getElementById('v76HomeFinal').textContent !== previous, before);
    const after = await page.locator('#v76HomeFinal').textContent();
    assert.notEqual(after, before, 'Changed inputs did not produce a new final state.');
    assert.equal(await page.locator('#v76HomePlot').getAttribute('data-engine'), 'FokoODECore');
    assert.match(await page.locator('#v76HomeStatus').textContent(), /^Computed/);

    console.log('Homepage editable-model regression passed: changed input, canonical recomputation, current plot provenance.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error('Homepage editable-model regression failed.');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
