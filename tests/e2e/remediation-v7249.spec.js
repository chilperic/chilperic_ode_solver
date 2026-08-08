const { test, expect } = require('@playwright/test');

test.describe('v72.50 remediation', () => {
  test('shared lab shell exposes a task-first sequence and reorganized navigation', async ({ page }) => {
    await page.goto('/statistics.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.v72-task-sequence')).toBeVisible();
    await expect(page.locator('.v72-task-sequence button')).toHaveText(['1Choose', '2Configure', '3Run', '4Inspect', '5Export']);
    const lastControlClass = await page.locator('.work-panel.controls > :last-child').getAttribute('class');
    expect(lastControlClass).toContain('actionbar');
    await expect(page.locator('.v76-primary-nav a[href="index.html"]')).toHaveText('Home');
    await expect(page.locator('.v76-primary-nav a[href="studio.html"]')).toHaveText('Model Studio');
    await expect(page.locator('[data-v76-trigger="experiment"]')).toContainText('Simulate');
    await expect(page.locator('[data-v76-trigger="analyze"]')).toContainText('Analyze');
    await page.locator('[data-v76-trigger="analyze"]').click();
    await expect(page.locator('[data-v76-popover="analyze"]')).toContainText('Sensitivity');
  });

  test('population genetics computes a seeded two-deme ensemble', async ({ page }) => {
    await page.goto('/population-genetics.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body[data-lab="population-genetics"]')).toBeVisible();
    await expect(page.locator('#pgTopStatus')).toHaveText('Computed', { timeout: 30_000 });
    await expect(page.locator('#leftPgPlot')).toHaveAttribute('data-render-state', 'rendered', { timeout: 30_000 });
    await expect(page.locator('#rightPgPlot')).toHaveAttribute('data-render-state', 'rendered', { timeout: 30_000 });
    await expect(page.locator('#pgBudget')).toContainText('draws');
    const mean = Number(await page.locator('#pgMean').textContent());
    expect(mean).toBeGreaterThanOrEqual(0);
    expect(mean).toBeLessThanOrEqual(1);
    await expect(page.locator('#pgExampleCount')).toContainText('13');
  });

  test('advanced methods, CMA-ES applications, and creator access are discoverable', async ({ page }) => {
    await page.goto('/advanced-methods.html?example=genomic-differentiation', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#advancedCount')).toContainText('14');
    await expect(page.locator('#leftAdvancedPlot')).toHaveAttribute('data-render-state', 'rendered', { timeout: 30_000 });
    await expect(page.locator('#advancedMetrics')).toContainText('Mean Fst');
    const creator = page.locator('[data-v76-trigger="profile"]');
    await expect(creator).toBeVisible();
    await creator.click();
    await expect(page.locator('[data-v76-popover="profile"] a[href="cv.html"]')).toBeVisible();
    await expect(creator.locator('img')).toHaveAttribute('alt', /creator profile/i);

    await page.goto('/optimization.html?example=CMA-ES%20%C2%B7%20ML%20hyperparameters', { waitUntil: 'domcontentloaded' });
    await page.locator('#showCmaExamples').click();
    await expect(page.locator('#optimizationExampleCount')).toContainText('15');
    await expect(page.locator('#leftPlot')).toHaveAttribute('data-render-state', 'rendered', { timeout: 30_000 });
    await expect(page.locator('#rightPlotType option')).toHaveCount(29);
    await expect(page.locator('#rightPlotType')).toContainText('distance to known reference');
    await expect(page.locator('#rightPlotType')).toContainText('evaluations vs cumulative time');
  });

  test('mobile header and task panels stay compact and operable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/optimization.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-v76-mobile-open]').first()).toBeVisible();
    await expect(page.locator('.v76-primary-nav')).toBeHidden();
    const headerHeight = await page.locator('.topbar').evaluate(node => node.getBoundingClientRect().height);
    expect(headerHeight).toBeLessThan(90);
    await page.locator('[data-v76-mobile-open]').first().click();
    await expect(page.locator('[data-v76-mobile-sheet]')).toHaveAttribute('data-open', 'true');
    await expect(page.locator('[data-v76-mobile-sheet] a[href="index.html"]')).toHaveText('Home');
    await expect(page.locator('[data-v76-mobile-sheet] a')).not.toHaveCount(0);
    await page.locator('[data-v76-mobile-close]').click();

    await expect(page.locator('.v72-mobile-taskbar')).toBeVisible();
    await expect(page.locator('.work-panel.controls')).toBeVisible();
    await expect(page.locator('.v72-workspace')).toBeHidden();
    await page.locator('[data-mobile-panel-target="results"]').click();
    await expect(page.locator('.v72-workspace')).toBeVisible();
    await expect(page.locator('.work-panel.controls')).toBeHidden();
    await page.locator('[data-mobile-panel-target="evidence"]').click();
    await expect(page.locator('.v72-inspector')).toBeVisible();
    await expect(page.locator('.v72-workspace')).toBeHidden();
  });
});
