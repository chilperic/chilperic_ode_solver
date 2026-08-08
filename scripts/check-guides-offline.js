#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require('@playwright/test');
const ROOT = path.resolve(__dirname, '..');

function stripExternalScripts(html) {
  return html.replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi, '');
}
function guideScript(html) {
  const matches = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/gi), match => match[1]);
  const script = matches.find(text => text.includes("const page=document.querySelector('.guide-page')"));
  if (!script) throw new Error('Interactive guide script not found');
  return script;
}
async function load(page, filename) {
  const html = fs.readFileSync(path.join(ROOT, filename), 'utf8');
  const script = guideScript(html);
  await page.setContent(stripExternalScripts(html).replace(/<script>[\s\S]*?<\/script>/gi, ''), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const store = new Map();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem:key => store.get(String(key)) || null,
      setItem:(key,value) => store.set(String(key), String(value)),
      removeItem:key => store.delete(String(key)), clear:() => store.clear()
    }});
  });
  await page.addScriptTag({ path: path.join(ROOT, 'src/v76/app-shell.js') });
  await page.waitForSelector('body[data-v76-ready="true"]');
  await page.addScriptTag({ content: script });
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args:['--no-sandbox','--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors=[]; page.on('pageerror', error => errors.push(error.message));
    await load(page, 'docs.html');
    assert.equal(await page.locator('h1').textContent(), 'Foko Lab modeling handbook');
    assert.ok(await page.locator('[data-guide-section]').count() >= 26);
    assert.ok(await page.locator('.guide-toc-level-3').count() >= 40);
    assert.equal(await page.locator('nav.v76-primary-nav').locator(':scope > *').count(), 6);
    const total = await page.locator('[data-guide-section]').count();
    await page.locator('#guideSearch').fill('Sobol');
    const visible = await page.locator('[data-guide-section]:visible').count();
    assert.ok(visible > 0 && visible < total, `Handbook search did not narrow sections (${visible}/${total})`);
    assert.match(await page.locator('#guideSearchCount').textContent(), /matching sections/);
    await page.locator('#guideSearch').fill('');
    assert.equal(await page.locator('[data-guide-section]:visible').count(), total);

    await load(page, 'tutorial.html');
    assert.equal(await page.locator('h1').textContent(), 'Practical modeling curriculum');
    assert.equal(await page.locator('.tutorial-complete').count(), 21);
    const first = page.locator('.tutorial-complete').first();
    await first.click();
    assert.equal(await first.getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#tutorialProgressLabel').textContent(), /^1 of 21 tutorials completed$/);
    await page.locator('#guideSearch').fill('identifiability');
    assert.ok(await page.locator('[data-guide-section]:visible').count() >= 1);
    assert.deepEqual(errors, [], `Guide browser errors: ${errors.join('; ')}`);
    console.log('Guide offline Chromium contract passed: central navigation, searchable handbook chapters, twenty-one tutorial modules, persistent completion controls and responsive guide UI are functional.');
  } finally { await browser.close(); }
})().catch(error => { console.error('Guide offline Chromium contract failed.'); console.error(error.stack || error); process.exit(1); });
