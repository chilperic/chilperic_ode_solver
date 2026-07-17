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

async function directlyHit(page, selector) {
  return page.locator(selector).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { ok: top === node || node.contains(top), top: top ? `${top.tagName}#${top.id}.${top.className}` : 'none' };
  });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 920 } });
    await page.setContent(stripExternalResources(read('symbolic.html')), { waitUntil: 'domcontentloaded' });
    for (const css of [
      'styles/v72-tokens.css',
      'styles/v72-lab-shell.css',
      'styles/v72-accessibility-performance.css',
      'styles/v72-symbolic.css'
    ]) await page.addStyleTag({ path: path.join(ROOT, css) });
    await page.addScriptTag({ path: path.join(ROOT, 'src/navigation.js') });
    await page.waitForTimeout(150);

    for (const name of ['modeling', 'analysis', 'sciml', 'explore']) {
      const menu = page.locator(`details[data-nav-menu="${name}"]`);
      const summary = menu.locator('summary');
      const box = await summary.boundingBox();
      assert.ok(box, `${name}: summary has no hitbox.`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(100);
      assert.equal(await menu.getAttribute('open'), null, `${name}: pointer travel opened the menu.`);
      assert.equal(await menu.getAttribute('data-menu-open'), 'false');
      const panel = menu.locator('.labs-menu-panel');
      assert.equal(await panel.getAttribute('aria-hidden'), 'true');
      assert.notEqual(await panel.getAttribute('inert'), null);
    }

    for (const selector of ['#leftPlotType', '#rightPlotType']) {
      const hit = await directlyHit(page, selector);
      assert.ok(hit.ok, `${selector} is covered by ${hit.top}.`);
      await page.locator(selector).click();
      await page.keyboard.press('Escape');
    }

    const modeling = page.locator('details[data-nav-menu="modeling"]');
    await modeling.locator('summary').click();
    assert.notEqual(await modeling.getAttribute('open'), null, 'Click did not open Modeling.');
    assert.equal(await modeling.getAttribute('data-menu-open'), 'true');
    assert.equal(await modeling.locator('.labs-menu-panel').getAttribute('aria-hidden'), 'false');
    assert.equal(await modeling.locator('.labs-menu-panel').getAttribute('inert'), null);
    await page.keyboard.press('Escape');
    assert.equal(await modeling.getAttribute('open'), null, 'Escape did not close Modeling.');

    const finalHit = await directlyHit(page, '#leftPlotType');
    assert.ok(finalHit.ok, `Closed navigation still covers Symbolic selector via ${finalHit.top}.`);
    console.log('Navigation and Symbolic hitbox regression passed: click-only menus, inert closed panels, and unobstructed plot selectors.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error('Navigation and Symbolic hitbox regression failed.');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
