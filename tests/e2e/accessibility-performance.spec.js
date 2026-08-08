const { test, expect } = require('@playwright/test');

const authoredPages = [
  '/studio.html', '/ode.html', '/steady.html', '/stochastic.html', '/optimization.html',
  '/statistics.html', '/fitting.html', '/linear-algebra.html', '/networks.html',
  '/ml.html', '/sciml.html', '/agent.html', '/symbolic.html', '/sensitivity.html',
  '/workbench.html', '/population-genetics.html', '/advanced-methods.html',
  '/bifurcation.html', '/evolution.html', '/ai-modeling.html', '/examples.html'
];

function accessibleText(node) {
  return String(node.getAttribute('aria-label') || node.getAttribute('aria-labelledby') || node.getAttribute('title') || node.textContent || '').trim();
}

test.describe('v72.17 accessibility and performance gate', () => {
  for (const path of authoredPages) {
    test(`${path} has a coherent accessible document structure`, async ({ page }) => {
      const consoleErrors = [];
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body[data-v72-shell="true"]')).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main[id][tabindex="-1"]')).toHaveCount(1);
      const mainId = await page.locator('main').getAttribute('id');
      await expect(page.locator(`a.skip-link[href="#${mainId}"]`)).toHaveCount(1);
      await expect(page.locator('nav[aria-label="Primary navigation"]')).toHaveCount(1);
      await expect(page.locator('[data-layout-mode="three"], [data-wb-layout="three"]')).toHaveCount(0);
      const audit = await page.evaluate(() => {
        const ids = Array.from(document.querySelectorAll('[id]')).map(node => node.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        const unnamedButtons = Array.from(document.querySelectorAll('button')).filter(button => {
          const value = button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent;
          return !String(value || '').trim();
        }).length;
        const unlabeledControls = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea')).filter(control => {
          if (control.getAttribute('aria-label') || control.getAttribute('aria-labelledby')) return false;
          if (control.closest('label')) return false;
          return !(control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`));
        }).length;
        return { duplicates, unnamedButtons, unlabeledControls, scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth };
      });
      expect(audit.duplicates).toEqual([]);
      expect(audit.unnamedButtons).toBe(0);
      expect(audit.unlabeledControls).toBe(0);
      expect(audit.scrollWidth).toBeLessThanOrEqual(audit.viewport + 2);
      expect(consoleErrors.filter(message => !/favicon/i.test(message))).toEqual([]);
    });
  }

  test('skip link moves keyboard focus to the main scientific workspace', async ({ page }) => {
    await page.goto('/agent.html', { waitUntil: 'domcontentloaded' });
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('layout controls expose pressed state and arrow-key navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/statistics.html', { waitUntil: 'domcontentloaded' });
    const group = page.locator('.v72-layout-switch');
    const two = group.locator('[data-layout-mode="two"]');
    const focus = group.locator('[data-layout-mode="focus"]');
    await expect(two).toHaveAttribute('aria-pressed', 'true');
    await two.focus();
    await page.keyboard.press('ArrowRight');
    await expect(focus).toBeFocused();
    await focus.click();
    await expect(focus).toHaveAttribute('aria-pressed', 'true');
  });

  test('computed plots expose rendered state instead of anonymous graphics', async ({ page }) => {
    await page.goto('/statistics.html', { waitUntil: 'networkidle' });
    await page.locator('#runStatistics').click();
    await expect(page.locator('#statisticsTopStatus')).toContainText(/Computed/i, { timeout: 20_000 });
    const plot = page.locator('#leftPlot');
    await expect(plot).toHaveAttribute('role', 'img');
    await expect(plot).toHaveAttribute('aria-busy', 'false');
    await expect(plot).toHaveAttribute('data-render-state', 'rendered');
    await expect(plot).toHaveAttribute('aria-label', /Computed interactive plot/);
  });

  test('Agent renders two evidence panels after a bounded worker run', async ({ page }) => {
    await page.goto('/agent.html', { waitUntil: 'networkidle' });
    await page.locator('#agentSize').fill('16');
    await page.locator('#agentSteps').fill('30');
    await page.locator('#agentRuns').fill('6');
    await page.locator('#agentSnapshotCount').fill('4');
    await page.locator('#runAgent').click();
    await expect(page.locator('#agentTopStatus')).toContainText(/Computed|Rendered|warning/i, { timeout: 35_000 });
    for (const id of ['#leftAgentPlot', '#rightAgentPlot']) {
      await expect(page.locator(id)).toHaveAttribute('aria-busy', 'false');
      await expect(page.locator(id)).toHaveAttribute('data-render-state', /rendered|fallback/);
      const visibleEvidence = await page.locator(id).evaluate(node => Boolean(node.querySelector('.js-plotly-plot, canvas, svg')));
      expect(visibleEvidence).toBeTruthy();
    }
  });

  test('performance telemetry records resources and plot durations without adding visible noise', async ({ page }) => {
    await page.goto('/linear-algebra.html', { waitUntil: 'networkidle' });
    await page.locator('#runLinalg').click();
    await expect(page.locator('#linalgTopStatus')).toContainText(/Computed/i, { timeout: 20_000 });
    const report = await page.evaluate(() => window.FokoPerformance.getReport());
    expect(report.release).toBe('77.4.1');
    expect(report.resources.count).toBeGreaterThan(0);
    expect(report.plots.some(item => item.status === 'rendered')).toBeTruthy();
    expect(await page.getByText('DOMContentLoaded time', { exact: false }).count()).toBe(0);
  });

  test('mobile layout remains within the viewport and keeps touch targets usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ml.html', { waitUntil: 'domcontentloaded' });
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      minButton: Math.min(...Array.from(document.querySelectorAll('button')).filter(node => node.offsetParent !== null).map(node => node.getBoundingClientRect().height))
    }));
    expect(geometry.width).toBeLessThanOrEqual(geometry.viewport + 2);
    expect(geometry.minButton).toBeGreaterThanOrEqual(36);
  });
});
