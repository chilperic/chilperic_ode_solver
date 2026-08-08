const { test, expect } = require('@playwright/test');

test.describe('v72.51 modeling-first expansion', () => {
  test('Model Studio edits, simulates, and renders advanced response surfaces', async ({ page }) => {
    await page.goto('/studio.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#studioPreset option')).toHaveCount(21);
    await page.locator('#runStudio').click();
    await expect(page.locator('#studioTopStatus')).toContainText(/Computed/i, { timeout: 20_000 });
    await expect(page.locator('#leftStudioPlotType option')).toHaveCount(12);
    await expect(page.locator('#leftStudioPlot')).toHaveAttribute('data-render-state', 'rendered');
    await page.locator('#studioSweepGrid').fill('5');
    await page.locator('#runStudioSweep').click();
    await expect(page.locator('#studioResultKind')).toContainText('5×5', { timeout: 30_000 });
    await page.locator('#rightStudioPlotType').selectOption('response-surface');
    await expect(page.locator('#rightStudioPlot')).toHaveAttribute('data-render-state', 'rendered');
  });
  test('Sensitivity exposes Morris and Sobol before the example gallery', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await page.goto('/sensitivity.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-sensitivity-method="morris"]')).toBeVisible();
    await expect(page.locator('[data-sensitivity-method="sobol"]')).toBeVisible();
    await expect(page.locator('.example-browser')).toHaveAttribute('open', '');
    await page.locator('[data-sensitivity-method="morris"]').click();
    await expect(page.locator('#sensitivityMethod')).toHaveValue('morris');
    const overflow = await page.locator('.work-panel').evaluate(node => node.scrollWidth > node.clientWidth + 2);
    expect(overflow).toBeFalsy();
  });

  test('Population Genetics computes ten selectable plot families', async ({ page }) => {
    await page.goto('/population-genetics.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#pgTopStatus')).toContainText('Computed', { timeout: 30_000 });
    await expect(page.locator('#leftPgPlotType option')).toHaveCount(10);
    await page.locator('#leftPgPlotType').selectOption('phase');
    await expect(page.locator('#leftPgPlot')).toHaveAttribute('data-render-state', 'rendered');
  });

  test('Advanced Methods exposes at least two computed plots for each starter', async ({ page }) => {
    await page.goto('/advanced-methods.html', { waitUntil: 'networkidle' });
    const values = await page.locator('#advancedSelect option').evaluateAll(nodes => nodes.map(node => node.value));
    for (const value of values) {
      await page.locator('#advancedSelect').selectOption(value);
      await page.locator('#loadAdvanced').click();
      await expect(page.locator('#advancedStatus')).toContainText(/Computed|complete|finished/i, { timeout: 15_000 });
      expect(await page.locator('#leftAdvancedPlotType option').count()).toBeGreaterThanOrEqual(2);
    }
  });

  test('a user-authored bifurcation equation produces branches and a vector field', async ({ page }) => {
    await page.goto('/bifurcation.html', { waitUntil: 'networkidle' });
    await page.locator('#bfExpression').fill('mu - x^2');
    await page.locator('#bfParameters').fill('{}');
    await page.locator('#runBifurcation').click();
    await expect(page.locator('#bfTopStatus')).toContainText('Computed', { timeout: 20_000 });
    await expect(page.locator('#leftBfPlotType option')).toHaveCount(6);
    await expect(page.locator('#leftBfPlot')).toHaveAttribute('data-render-state', 'rendered');
    await expect(page.locator('#rightBfPlot')).toHaveAttribute('data-render-state', 'rendered');
  });

  test('a custom fitness table runs an evolutionary simulation', async ({ page }) => {
    await page.goto('/evolution.html', { waitUntil: 'networkidle' });
    await page.locator('#evLength').fill('2');
    await page.locator('#evType').selectOption('custom');
    await page.locator('#evCustomFitness').fill('00,0.1\n01,0.5\n10,0.6\n11,1');
    await page.locator('#evInitial').fill('00');
    await page.locator('#evGenerations').fill('30');
    await page.locator('#runEvolution').click();
    await expect(page.locator('#evTopStatus')).toContainText('Computed', { timeout: 20_000 });
    await expect(page.locator('#leftEvPlotType option')).toHaveCount(10);
    await page.locator('#rightEvPlotType').selectOption('live-4d');
    await page.locator('#evPlay').click();
    await expect(page.locator('#evSnapshotLabel')).not.toHaveText('30', { timeout: 3_000 });
  });

  test('user data fits a transparent neural surrogate', async ({ page }) => {
    await page.goto('/ai-modeling.html', { waitUntil: 'networkidle' });
    await page.locator('#aiData').fill('x,y\n0,0\n1,1\n2,0.5\n3,-0.4\n4,0.2');
    await page.locator('#aiMethod').selectOption('random-feature');
    await page.locator('#runAiModel').click();
    await expect(page.locator('#aiTopStatus')).toContainText('Computed', { timeout: 20_000 });
    await expect(page.locator('#aiMethodMetric')).toContainText('Random features');
    await expect(page.locator('#leftAiPlotType option')).toHaveCount(13);
  });

  test('Create model opens an editable runnable ODE scaffold', async ({ page }) => {
    await page.goto('/ode.html?module=ode&new=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#equationRows input[data-eq="0"]')).toHaveValue('r*x*(1-x/K)');
    const parameterNames = page.locator('#paramRows input[data-col="0"]');
    await expect(parameterNames).toHaveCount(2);
    await expect(parameterNames.nth(0)).toHaveValue('r');
    await expect(parameterNames.nth(1)).toHaveValue('K');
    await page.locator('#runBtn').click();
    await expect(page.locator('#topStatus')).toContainText(/Computed|Success|complete/i, { timeout: 20_000 });
  });
});
