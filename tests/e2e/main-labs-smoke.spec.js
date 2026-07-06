const { test, expect } = require('@playwright/test');

async function expectUsablePage(page, path, requiredTexts = []) {
  await page.goto(path);
  await expect(page.locator('body')).toBeVisible();
  for (const text of requiredTexts) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  }
}

test.describe('Foko Lab deploy smoke gate', () => {
  test('home exposes the main route families without selected-card artefacts', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Model output analysis')).toBeVisible();
    await expect(page.getByText('Structure and geometry')).toBeVisible();
    await expect(page.getByText('Focused Labs')).toBeVisible();
    const beauty = page.locator('a[href="beauty.html"]').first();
    await expect(beauty).toBeVisible();
  });

  test('ODE focused lab runs from the preserved standalone page', async ({ page }) => {
    await expectUsablePage(page, '/ode.html', ['ODE Solver']);
    const load = page.locator('#loadExampleBtn, #loadBtn').first();
    if (await load.count()) await load.click();
    await page.locator('#runBtn, #runOde, button:has-text("Run")').first().click();
    await expect(page.locator('#plot, #output, #result, .js-plotly-plot').first()).toBeVisible();
  });

  test('stochastic focused lab exposes upgraded stochastic methods', async ({ page }) => {
    await expectUsablePage(page, '/stochastic.html', ['Gillespie', 'Tau-leaping', 'Euler']);
    await expect(page.locator('#stochMethod, select').first()).toBeVisible();
  });

  test('steady-state focused lab exposes continuation and 2D map controls', async ({ page }) => {
    await expectUsablePage(page, '/steady.html', ['Continuation']);
    await expect(page.locator('#steadyContParam2, #steadyCont2N').first()).toBeVisible();
  });

  test('optimization focused lab loads without collapsing layout', async ({ page }) => {
    await expectUsablePage(page, '/optimization.html', ['Optimization']);
    await expect(page.locator('main, .lab-shell, .workspace').first()).toBeVisible();
  });

  for (const lab of [
    ['/statistics.html', 'Statistics'],
    ['/fitting.html', 'Curve'],
    ['/linear-algebra.html', 'Linear'],
    ['/networks.html', 'Network'],
    ['/ml.html', 'ML']
  ]) {
    test(`${lab[0]} descriptor lab loads with run surface`, async ({ page }) => {
      await expectUsablePage(page, lab[0], [lab[1]]);
      await expect(page.locator('button:has-text("Run"), #statsRun, #fitRun, #laRun, #netRun, #mlRun').first()).toBeVisible();
    });
  }

  test('reproducibility controls are present on representative labs', async ({ page }) => {
    await page.goto('/ode.html');
    await expect(page.getByText('Save session', { exact: false })).toBeVisible();
    await expect(page.getByText('Export bundle', { exact: false })).toBeVisible();
    await page.goto('/statistics.html');
    await expect(page.getByText('Copy share URL', { exact: false })).toBeVisible();
  });
});
