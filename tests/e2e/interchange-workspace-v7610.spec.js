const { test, expect } = require('@playwright/test');

const TEXT_MODEL = `name: Logistic import
dx/dt = r*x*(1-x/K)
x(0) = 2
param r = 0.6 [0.1, 1.2]
param K = 100 [40, 180]
time 0 15 240
method: rk45`;

test.describe('v77.4.1 model authoring and interchange', () => {
  test('desktop model and plot panels resize without losing computed evidence', async ({ page }) => {
    await page.setViewportSize({ width: 1500, height: 960 });
    await page.goto('/studio.html', { waitUntil: 'networkidle' });
    const splitter = page.locator('.v76-workspace-splitter');
    await expect(splitter).toBeVisible();
    await expect(splitter).toHaveAttribute('role', 'separator');
    const controls = page.locator('.studio-controls');
    const before = await controls.evaluate(node => node.getBoundingClientRect().width);
    await splitter.press('End');
    await expect(splitter).toHaveAttribute('aria-valuenow', '560');
    const wide = await controls.evaluate(node => node.getBoundingClientRect().width);
    expect(wide).toBeGreaterThan(before + 100);
    await page.locator('#runStudio').click();
    await expect(page.locator('#studioTopStatus')).toContainText('Computed', { timeout: 20_000 });
    await expect(page.locator('#leftStudioPlot')).toHaveAttribute('data-render-state', 'rendered');
    await splitter.press('Home');
    await expect(splitter).toHaveAttribute('aria-valuenow', '268');
    await expect(page.locator('#leftStudioPlot')).toHaveAttribute('data-render-state', 'rendered');
  });

  test('plain text becomes an editable, rerunnable model', async ({ page }) => {
    await page.goto('/studio.html#import', { waitUntil: 'networkidle' });
    await expect(page.locator('.studio-import-disclosure')).toHaveAttribute('open', '');
    await page.locator('#studioImportFormat').selectOption('txt');
    await page.locator('#studioImportText').fill(TEXT_MODEL);
    await page.locator('#studioParseImport').click();
    await expect(page.locator('#studioImportStatus')).toContainText('Plain-text ODE equations');
    await expect(page.locator('#studioStateRows input').nth(1)).toHaveValue('r*x*(1-x/K)');
    await expect(page.locator('#studioT1')).toHaveValue('15');
    await page.locator('#runStudio').click();
    await expect(page.locator('#studioTopStatus')).toContainText('Computed', { timeout: 20_000 });
  });

  test('data dictionaries never execute code and unsupported standards fail closed', async ({ page }) => {
    await page.goto('/studio.html#import', { waitUntil: 'networkidle' });
    await page.locator('#studioImportFormat').selectOption('python');
    await page.locator('#studioImportText').fill(`FOKO_MODEL = {'name':'Decay','vars':['x'],'eqs':['-k*x'],'y0':[4],'params':{'k':[0.3,0.1,0.8]},'t0':0,'t1':20,'points':200}`);
    await page.locator('#studioParseImport').click();
    await expect(page.locator('#studioImportStatus')).toContainText('Python dictionary');
    await page.locator('#studioImportText').fill(`FOKO_MODEL = __import__('os').system('echo unsafe')`);
    await page.locator('#studioParseImport').click();
    await expect(page.locator('#studioImportStatus')).toContainText('Import rejected');
    await page.locator('#studioImportFormat').selectOption('auto');
    await page.locator('#studioImportText').fill('<sedML></sedML>');
    await page.locator('#studioParseImport').click();
    await expect(page.locator('#studioImportStatus')).toContainText('recognized but not executed');
  });

  test('phone uses task panels and hides the desktop splitter', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/studio.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.v76-workspace-splitter')).toBeHidden();
    await expect(page.locator('.v76-panel-size-controls')).toBeHidden();
    await expect(page.locator('.v72-mobile-taskbar')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
