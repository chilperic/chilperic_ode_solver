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
  /*
   * A menu can contain several authored sections. Select the first matching
   * target explicitly instead of relying on :first-of-type, which returns the
   * first anchor from every section and violates Playwright strict mode.
   */
  return page.locator(selector).first().evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      ok: top === node || node.contains(top),
      top: top ? `${top.tagName}#${top.id}.${top.className}` : 'none'
    };
  });
}

async function installShell(page, html, extraCss = []) {
  await page.setContent(stripExternalResources(read(html)), { waitUntil: 'domcontentloaded' });
  for (const css of ['styles/style.css', 'styles/v72-tokens.css', ...extraCss, 'styles/v76-system.css']) {
    await page.addStyleTag({ path: path.join(ROOT, css) });
  }
  await page.addScriptTag({ path: path.join(ROOT, 'src/v76/app-shell.js') });
  await page.waitForSelector('body[data-v76-ready="true"]');
}

async function verifyMenu(page, name, minimumLinks) {
  const trigger = page.locator(`[data-v76-trigger="${name}"]`);
  const popover = page.locator(`[data-v76-popover="${name}"]`);
  const triggerBox = await trigger.boundingBox();
  assert.ok(triggerBox && triggerBox.width >= 32 && triggerBox.height >= 32, `${name}: trigger has no usable hitbox.`);

  await page.mouse.move(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height / 2);
  await page.waitForTimeout(80);
  assert.equal(await popover.getAttribute('data-open'), 'false', `${name}: pointer travel opened the menu.`);

  const headerBefore = await page.locator('[data-v76-appbar]').boundingBox();
  await trigger.click();
  assert.equal(await trigger.getAttribute('aria-expanded'), 'true', `${name}: trigger state did not open.`);
  assert.equal(await popover.getAttribute('aria-hidden'), 'false', `${name}: popover stayed hidden.`);
  assert.ok(await popover.locator('a').count() >= minimumLinks, `${name}: menu lost authored destinations.`);
  assert.ok(await popover.locator('a').first().isVisible(), `${name}: first menu option is not visible.`);

  const box = await popover.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box, `${name}: popover has no geometry.`);
  assert.ok(box.x >= 0 && box.y >= 0, `${name}: popover escaped the top-left viewport.`);
  assert.ok(box.x + box.width <= viewport.width + 1, `${name}: popover overflows horizontally.`);
  assert.ok(box.y + Math.min(box.height, viewport.height - box.y) <= viewport.height + 1, `${name}: popover cannot be reached.`);
  const hit = await directlyHit(page, `[data-v76-popover="${name}"] a`);
  assert.ok(hit.ok, `${name}: first option is covered by ${hit.top}.`);

  const headerAfter = await page.locator('[data-v76-appbar]').boundingBox();
  assert.deepEqual(headerAfter, headerBefore, `${name}: opening the portal reflowed the app bar.`);
  await page.keyboard.press('Escape');
  assert.equal(await popover.getAttribute('data-open'), 'false', `${name}: Escape did not close.`);
  assert.equal(await trigger.getAttribute('aria-expanded'), 'false', `${name}: trigger state did not close.`);
}

async function verifyCommandPalette(page) {
  const trigger = page.locator('[data-v76-command]');
  const dialog = page.locator('[data-v76-command-dialog]');
  const backdrop = page.locator('.v76-command-backdrop');

  assert.equal(await dialog.isVisible(), false, 'Command palette must be hidden on initial load.');

  await trigger.click();
  assert.equal(await dialog.isVisible(), true, 'Find button did not open the command palette.');
  await page.keyboard.press('Escape');
  assert.equal(await dialog.isVisible(), false, 'Escape did not visually dismiss the command palette.');

  await trigger.click();
  await page.locator('.v76-command-close-button').click();
  assert.equal(await dialog.isVisible(), false, 'Visible close button did not dismiss the command palette.');

  await trigger.click();
  await backdrop.click({ position: { x: 8, y: 8 } });
  assert.equal(await dialog.isVisible(), false, 'Backdrop click did not dismiss the command palette.');
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 920 } });
    await installShell(page, 'symbolic.html', [
      'styles/v72-lab-shell.css',
      'styles/v72-accessibility-performance.css',
      'styles/v72-symbolic.css'
    ]);

    await expectShellTaxonomy(page);
    await verifyCommandPalette(page);
    for (const [name, count] of [['project', 4], ['experiment', 8], ['analyze', 11], ['profile', 7]]) {
      await verifyMenu(page, name, count);
    }

    for (const selector of ['#leftPlotType', '#rightPlotType']) {
      const hit = await directlyHit(page, selector);
      assert.ok(hit.ok, `${selector} is covered by ${hit.top}.`);
      await page.locator(selector).click();
      await page.keyboard.press('Escape');
    }

    await installShell(page, 'cv.html', ['styles/v72-profile-shell.css', 'styles/lab-identity.css']);
    await verifyMenu(page, 'profile', 7);
    const labels = await page.locator('[data-v76-popover="profile"] a b').allTextContents();
    for (const required of ['Documentation', 'Trust and validation', 'Creator profile', 'Modeling guides']) {
      assert.ok(labels.includes(required), `Creator menu is missing ${required}.`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-v76-mobile-open]').first().click();
    const sheet = page.locator('[data-v76-mobile-sheet]');
    assert.equal(await sheet.getAttribute('data-open'), 'true', 'Mobile navigation sheet did not open.');
    assert.ok(await sheet.locator('a').count() >= 20, 'Mobile navigation lost destinations.');
    const sheetBox = await sheet.boundingBox();
    assert.ok(sheetBox && sheetBox.width <= 390 && sheetBox.height <= 844, 'Mobile sheet exceeds the viewport.');
    await page.locator('[data-v76-mobile-close]').click();
    assert.equal(await sheet.getAttribute('data-open'), 'false', 'Mobile navigation sheet did not close.');

    console.log('v76 navigation regression passed: dismissible command palette, portal menus, creator options, stable hitboxes, unobstructed plots, and mobile sheet.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error('v76 navigation regression failed.');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});

async function expectShellTaxonomy(page) {
  const labels = await page.locator('.v76-primary-nav > *').allTextContents();
  assert.deepEqual(labels.map(label => label.trim().replace(/\s+/g, ' ')), [
    'Home', 'Model Studio', 'Simulate', 'Analyze', 'Atlas', 'Evidence'
  ], 'Primary navigation taxonomy drifted.');
  assert.equal(await page.locator('[data-v76-portal]').count(), 1, 'Shell portal is not unique.');
}
