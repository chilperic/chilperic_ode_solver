const { test, expect } = require('@playwright/test');

async function expectUsablePage(page, path, requiredTexts = []) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  for (const text of requiredTexts) {
    await expect(page.locator('main').getByText(text, { exact: false }).first()).toBeVisible();
  }
}

async function expectNoPageOverflow(page) {
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth
  }));
  expect(overflow.width).toBeLessThanOrEqual(overflow.viewport + 2);
}


async function expectPlotGeometry(page, selector, label) {
  const host = page.locator(selector);
  await expect(host).toHaveAttribute('data-render-state', /rendered|fallback/, { timeout: 30_000 });
  const geometry = await host.evaluate((node) => {
    const rectFor = (query) => {
      const child = node.querySelector(query);
      if (!child) return null;
      const rect = child.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, text: child.textContent.trim() };
    };
    const rect = node.getBoundingClientRect();
    return {
      host: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
      title: rectFor('.gtitle'),
      legend: rectFor('.legend'),
      xTitle: rectFor('.xtitle'),
      yTitle: rectFor('.ytitle')
    };
  });
  const overlaps = (a, b) => a && b && a.width > 0 && a.height > 0 && b.width > 0 && b.height > 0
    && !(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1);
  expect(geometry.host.width, `${label}: plot width`).toBeGreaterThan(300);
  expect(geometry.host.height, `${label}: plot height`).toBeGreaterThan(300);
  expect(!geometry.title || !geometry.title.text, `${label}: duplicate Plotly title`).toBeTruthy();
  expect(overlaps(geometry.legend, geometry.xTitle), `${label}: legend/x-axis overlap`).toBeFalsy();
  expect(overlaps(geometry.legend, geometry.yTitle), `${label}: legend/y-axis overlap`).toBeFalsy();
  for (const annotation of [geometry.legend, geometry.xTitle, geometry.yTitle].filter(Boolean)) {
    expect(annotation.left, `${label}: annotation left bound`).toBeGreaterThanOrEqual(geometry.host.left - 3);
    expect(annotation.right, `${label}: annotation right bound`).toBeLessThanOrEqual(geometry.host.right + 3);
    expect(annotation.top, `${label}: annotation top bound`).toBeGreaterThanOrEqual(geometry.host.top - 3);
    expect(annotation.bottom, `${label}: annotation bottom bound`).toBeLessThanOrEqual(geometry.host.bottom + 3);
  }
}

async function expectActionControlsNotClipped(page, selector, label) {
  const controls = page.locator(selector);
  expect(await controls.count(), `${label}: control count`).toBeGreaterThan(0);
  const rows = await controls.evaluateAll((nodes) => nodes.map((node) => ({
    text: node.textContent.replace(/\s+/g, ' ').trim(),
    height: node.getBoundingClientRect().height,
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    overflowY: getComputedStyle(node).overflowY
  })));
  for (const row of rows) {
    expect(row.height, `${label}: ${row.text} height`).toBeGreaterThanOrEqual(44);
    expect(row.scrollHeight <= row.clientHeight + 2 || row.overflowY === 'visible', `${label}: ${row.text} clipping`).toBeTruthy();
  }
}

test.describe('Foko Lab v72 public gate', () => {
  test('home routes by task and surfaces the evidence boundary', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#homeTitle')).toHaveText('Build, test, and compare scientific models in your browser.');
    await expect(page.locator('.trust-home-primary')).toHaveCount(1);
    await expect(page.locator('.trust-home-primary')).toHaveAttribute('href', /example=FA%20metabolism%20bistability.*autorun=1/);
    await expect(page.locator('#homeResearchEvidence')).toHaveAttribute('data-computed', 'true', { timeout: 10_000 });
    await expect(page.locator('#homeResearchEvidence')).toHaveAttribute('data-engine', 'FokoODECore');
    await expect(page.locator('.home-research-list > a')).toHaveCount(4);
    await expect(page.locator('.home-evidence-key > a')).toHaveCount(4);
    await expect(page.locator('.home-engine-row')).toHaveCount(4);
    await expect(page.locator('.home-analysis-row')).toHaveCount(5);
    await expect(page.locator('.home-supporting-index > a')).toHaveCount(4);
    await expect(page.locator('nav.foko-main-nav > details, nav.foko-main-nav > a')).toHaveCount(6);
    await expect(page.locator('nav.foko-main-nav > a.nav-home-link')).toHaveText('Home');
    await expect(page.locator('.home-author-profile')).toContainText('Dr. Chilperic Armel Foko Kuate');
  });


  test('home demo reel uses real cores for live evidence', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#actComputesTitle').scrollIntoViewIfNeeded();
    await expect(page.locator('#demo-ode-status')).toContainText('Computed', { timeout: 15_000 });
    await expect(page.locator('#demo-steady-status')).toContainText('Computed', { timeout: 15_000 });
    await expect(page.locator('#demo-stochastic-status')).toContainText('Computed', { timeout: 20_000 });
    await expect(page.locator('#demo-agent-status')).toContainText('Computed', { timeout: 20_000 });
    await expect(page.locator('#demo-ode-metrics')).toContainText('accepted');
    await expect(page.locator('#demo-stochastic-metrics')).toContainText('Gillespie direct SSA');
    await page.locator('#actTrustTitle').scrollIntoViewIfNeeded();
    await expect(page.locator('#demo-fit-r2')).not.toHaveText('—', { timeout: 15_000 });
    await page.getByRole('button', { name: 'Run identifiability check' }).click();
    await expect(page.locator('#demo-fit-verdict')).toContainText(/non-identifiability/i, { timeout: 20_000 });
    await expect(page.locator('#demo-fit-correlation')).toContainText('corr(Vmax, Km)');
  });

  test('ODE is the authored v72 reference shell', async ({ page }) => {
    await expectUsablePage(page, '/ode.html', ['ODE and parametric analysis', 'Computation boundary']);
    await expect(page.locator('body[data-v72-shell="true"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="two"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="three"]')).toHaveCount(0);
    await expect(page.locator('[data-layout-mode="focus"]')).toBeVisible();
    await expect(page.locator('#saveSessionBtn')).toBeVisible();
    await expect(page.locator('#copyShareUrlBtn')).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test('ODE computes a browser result with diagnostics and provenance', async ({ page }) => {
    await page.goto('/ode.html', { waitUntil: 'networkidle' });
    await page.locator('#runBtn').click();
    await expect(page.locator('#topStatus')).toContainText(/successful|warning/i, { timeout: 20_000 });
    await expect(page.locator('#acceptedValue')).not.toHaveText('—');
    await expect(page.locator('#provenanceStatus')).toContainText(/Computed/i);
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
  });

  test('ODE mobile mode keeps the document within the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ode.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#plotGrid')).toHaveAttribute('data-layout', 'focus');
    await expectNoPageOverflow(page);
  });


  test('Steady-State is the authored v72.1 reference shell', async ({ page }) => {
    await expectUsablePage(page, '/steady.html', ['Roots, residuals and parameter scans', 'Computation boundary']);
    await expect(page.locator('body[data-v72-shell="true"][data-lab="steady"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="two"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="three"]')).toHaveCount(0);
    await expect(page.locator('[data-layout-mode="focus"]')).toBeVisible();
    await expect(page.locator('#saveSteadySession')).toBeVisible();
    await expect(page.locator('#copySteadyShareUrl')).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test('Steady-State computes a tolerance-gated root with diagnostics', async ({ page }) => {
    await page.goto('/steady.html', { waitUntil: 'networkidle' });
    await page.locator('#solveSteady').click();
    await expect(page.locator('#steadyTopStatus')).toContainText('Converged', { timeout: 20_000 });
    await expect(page.locator('#steadyResidual')).not.toHaveText('—');
    await expect(page.locator('#steadyTermination')).toContainText('residual tolerance');
    await expect(page.locator('#provenanceStatus')).toContainText('tolerance met');
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#rightPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('[data-plot-card="third"]')).toHaveCount(0);
  });

  test('Steady-State algebraic interpretation does not claim stability', async ({ page }) => {
    await page.goto('/steady.html', { waitUntil: 'networkidle' });
    await page.locator('#steadySelect').selectOption({ label: 'Budget-allocation KKT system' });
    await page.locator('#loadSteady').click();
    await page.locator('#solveSteady').click();
    await expect(page.locator('#steadyTopStatus')).toContainText('Converged', { timeout: 20_000 });
    await expect(page.locator('#steadyMetricStability')).toContainText('not applicable');
    await expect(page.locator('#provenanceInterpretation')).toContainText('Algebraic constraints only');
  });

  test('Steady-State exposes Jacobian structure, stiffness and scan sensitivity without overstating continuation', async ({ page }) => {
    await page.goto('/steady.html?example=Brusselator%20equilibrium&autorun=0', { waitUntil: 'networkidle' });
    await expect(page.locator('#steadyTaxonomyCatalog > details')).toHaveCount(4);
    await page.locator('#solveSteady').click();
    await expect(page.locator('#steadyTopStatus')).toContainText('Converged', { timeout: 20_000 });
    let options = await page.locator('#leftPlotType option').evaluateAll(nodes => nodes.map(node => node.value));
    expect(options).toContain('jacobian-sign');
    expect(options).toContain('stiffness-indicator');
    await page.locator('#leftPlotType').selectOption('jacobian-sign');
    await page.locator('#rightPlotType').selectOption('stiffness-indicator');
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#rightPlot.js-plotly-plot')).toBeVisible();
    await page.locator('#steadyScanN').fill('9');
    await page.locator('#runScan1D').click();
    await expect(page.locator('#steadyTopStatus')).toContainText(/Scan complete|Scan incomplete/, { timeout: 30_000 });
    options = await page.locator('#leftPlotType option').evaluateAll(nodes => nodes.map(node => node.value));
    expect(options).toContain('implicit-sensitivity');
    await page.locator('#leftPlotType').selectOption('implicit-sensitivity');
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#provenanceScope')).toContainText('not pseudo-arclength continuation');
    await expect(page.locator('#plotGrid')).toHaveAttribute('data-layout', 'two');
  });

  test('Steady-State mobile mode uses one focused plot without page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/steady.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#plotGrid')).toHaveAttribute('data-layout', 'focus');
    await expectNoPageOverflow(page);
  });


  test('Stochastic is the authored v72.2 reference shell', async ({ page }) => {
    await expectUsablePage(page, '/stochastic.html', ['Trajectories, uncertainty and final-state distributions', 'Computation boundary']);
    await expect(page.locator('body[data-v72-shell="true"][data-lab="stochastic"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="two"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="three"]')).toHaveCount(0);
    await expect(page.locator('[data-layout-mode="focus"]')).toBeVisible();
    await expect(page.locator('#saveStochasticSession')).toBeVisible();
    await expect(page.locator('#copyStochasticShareUrl')).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test('Stochastic computes a seeded direct-SSA ensemble with censoring evidence', async ({ page }) => {
    await page.goto('/stochastic.html', { waitUntil: 'networkidle' });
    await page.locator('#stochasticRuns').fill('80');
    await page.locator('#runStochastic').click();
    await expect(page.locator('#stochasticTopStatus')).toContainText(/Successful|warning/i, { timeout: 30_000 });
    await expect(page.locator('#stochasticRunsMetric')).toHaveText('80');
    await expect(page.locator('#stochasticTruncated')).toHaveText('0/80');
    await expect(page.locator('#provenanceMethod')).toContainText('Gillespie direct SSA');
    await expect(page.locator('#provenanceRandomness')).toContainText('Base seed');
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#rightPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('[data-plot-card="third"]')).toHaveCount(0);
  });

  test('Stochastic rejects explicit time-dependent hazards', async ({ page }) => {
    await page.goto('/stochastic.html', { waitUntil: 'networkidle' });
    const firstPropensity = page.locator('.stoch-reaction-propensity').first();
    await firstPropensity.fill('lambda*X*(1+t)');
    await page.locator('#runStochastic').click();
    await expect(page.locator('#stochasticTopStatus')).toHaveText('Error');
    await expect(page.locator('#provenanceWarning')).toContainText('time-homogeneous');
  });

  test('Stochastic mobile mode uses one focused plot without page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/stochastic.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#plotGrid')).toHaveAttribute('data-layout', 'focus');
    await expectNoPageOverflow(page);
  });

  test('Optimization is the authored v72.3 reference shell', async ({ page }) => {
    await expectUsablePage(page, '/optimization.html', ['Candidates, feasibility and search diagnostics', 'Computation boundary']);
    await expect(page.locator('body[data-v72-shell="true"][data-lab="optimization"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="two"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="three"]')).toHaveCount(0);
    await expect(page.locator('[data-layout-mode="focus"]')).toBeVisible();
    await expect(page.locator('#saveOptimizationSession')).toBeVisible();
    await expect(page.locator('#copyOptimizationShareUrl')).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test('Optimization computes a feasible bounded candidate with explicit optimality limits', async ({ page }) => {
    await page.goto('/optimization.html', { waitUntil: 'networkidle' });
    await page.locator('#runOptimization').click();
    await expect(page.locator('#optimizationTopStatus')).toContainText('Feasible candidate', { timeout: 30_000 });
    await expect(page.locator('#optimizationBestObjective')).not.toHaveText('—');
    await expect(page.locator('#optimizationMaxViolation')).toHaveText('0');
    await expect(page.locator('#provenanceOptimality')).toContainText('Global optimality not established');
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#rightPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('[data-plot-card="third"]')).toHaveCount(0);
  });

  test('Optimization taxonomy and finite multi-objective diagnostics are integrated honestly', async ({ page }) => {
    await page.goto('/optimization.html?autorun=0', { waitUntil: 'networkidle' });
    await expect(page.locator('#optimizationTaxonomyCatalog > details')).toHaveCount(4);
    await expect(page.locator('#optimizationTaxonomySummary')).toContainText('of 60 taxonomy entries');
    await page.locator('#optimizationExampleSearch').fill('Beale');
    await expect(page.locator('#optimizationDeck [data-preset="Beale function"]')).toBeVisible();
    await page.locator('#optimizationExampleSearch').fill('');
    await page.locator('#optimizationSelect').selectOption('Bi-objective Rosenbrock–Rastrigin');
    await page.locator('#loadOptimization').click();
    await page.locator('#optimizationIterations').fill('35');
    await page.locator('#optimizationPopulation').fill('18');
    await page.locator('#optimizationParetoSamples').fill('260');
    await page.locator('#runOptimization').click();
    await expect(page.locator('#optimizationTopStatus')).toContainText(/Feasible candidate|Feasibility warning/, { timeout: 30_000 });
    const options = await page.locator('#leftPlotType option').evaluateAll(nodes => nodes.map(node => node.value));
    for (const id of ['pareto', 'dominance-heatmap', 'crowding-distance', 'hypervolume-convergence', 'objective-correlation', 'knee-point', 'local-sensitivity']) expect(options).toContain(id);
    await page.locator('#leftPlotType').selectOption('dominance-heatmap');
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
    await page.locator('#rightPlotType').selectOption('knee-point');
    await expect(page.locator('#rightPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#plotGrid')).toHaveAttribute('data-layout', 'two');
  });

  test('Optimization does not label an infeasible candidate as an optimum', async ({ page }) => {
    await page.goto('/optimization.html', { waitUntil: 'networkidle' });
    await page.locator('#optimizationInequalities').fill('x + 10');
    await page.locator('#optimizationAlgorithm').selectOption('random_search');
    await page.locator('#optimizationIterations').fill('80');
    await page.locator('#runOptimization').click();
    await expect(page.locator('#optimizationTopStatus')).toContainText('Feasibility warning', { timeout: 30_000 });
    await expect(page.locator('#optimizationCandidateStatus')).toContainText('outside tolerance');
    await expect(page.locator('#provenanceWarning')).toContainText('not a feasible solution');
  });

  test('Optimization mobile mode uses one focused plot without page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/optimization.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#plotGrid')).toHaveAttribute('data-layout', 'focus');
    await expectNoPageOverflow(page);
  });


  test('Statistics is the authored v72.4 reference shell', async ({ page }) => {
    await expectUsablePage(page, '/statistics.html', ['Data quality, inference and uncertainty', 'Computation boundary']);
    await expect(page.locator('body[data-v72-shell="true"][data-lab="statistics"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="two"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="three"]')).toHaveCount(0);
    await expect(page.locator('[data-layout-mode="focus"]')).toBeVisible();
    await expect(page.locator('#statisticsFile')).toBeVisible();
    await expect(page.locator('#saveStatisticsSession')).toBeVisible();
    await expect(page.locator('#copyStatisticsShareUrl')).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test('Statistics computes OLS with usable-row and assumption evidence', async ({ page }) => {
    await page.goto('/statistics.html', { waitUntil: 'networkidle' });
    await page.locator('#runStatistics').click();
    await expect(page.locator('#statisticsTopStatus')).toContainText(/Computed/i, { timeout: 20_000 });
    await expect(page.locator('#statisticsUsableRows')).toContainText('/20');
    await expect(page.locator('#statisticsPrimaryLabel')).toHaveText('slope');
    await expect(page.locator('#statisticsEffectLabel')).toHaveText('R²');
    await expect(page.locator('#provenanceAssumptions')).toContainText('linear');
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#rightPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('[data-plot-card="third"]')).toHaveCount(0);
  });

  test('Statistics exposes mean-imputation as a warning rather than hidden cleaning', async ({ page }) => {
    await page.goto('/statistics.html', { waitUntil: 'networkidle' });
    await page.locator('#statisticsMissingPolicy').selectOption('mean-impute');
    await page.locator('#runStatistics').click();
    await expect(page.locator('#statisticsTopStatus')).toContainText('warnings', { timeout: 20_000 });
    await expect(page.locator('#statisticsMissingMetric')).toContainText('imputed');
    await expect(page.locator('#provenanceWarning')).toContainText('uncertainty is understated');
  });

  test('Statistics mobile mode uses one focused plot without page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/statistics.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#plotGrid')).toHaveAttribute('data-layout', 'focus');
    await expectNoPageOverflow(page);
  });

  test('authored v72 dropdown stays opaque and above scientific page content', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/fitting.html', { waitUntil: 'domcontentloaded' });
    const menu = page.locator('details[data-nav-menu="modeling"]');
    await menu.locator('summary').click();
    const panel = menu.locator('.labs-menu-panel');
    await expect(panel).toBeVisible();
    const evidence = await panel.evaluate((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const x = Math.max(0, Math.min(innerWidth - 1, rect.left + Math.min(rect.width / 2, 80)));
      const y = Math.max(0, Math.min(innerHeight - 1, rect.top + Math.min(rect.height / 2, 80)));
      const topNode = document.elementFromPoint(x, y);
      return {
        background: style.backgroundColor,
        zIndex: Number(style.zIndex),
        receivesPointer: Boolean(topNode && node.contains(topNode))
      };
    });
    expect(evidence.background).not.toMatch(/rgba?\([^)]*,\s*0(?:\.0+)?\s*\)$/);
    expect(evidence.zIndex).toBeGreaterThan(1000);
    expect(evidence.receivesPointer).toBeTruthy();
  });

  test('Curve Fitting is the authored v72.5 reference shell', async ({ page }) => {
    await expectUsablePage(page, '/fitting.html', ['Fit, uncertainty and diagnostics', 'Computation boundary']);
    await expect(page.locator('body[data-v72-shell="true"][data-lab="fitting"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="two"]')).toBeVisible();
    await expect(page.locator('[data-layout-mode="three"]')).toHaveCount(0);
    await expect(page.locator('[data-layout-mode="focus"]')).toBeVisible();
    await expect(page.locator('#fittingFile')).toBeVisible();
    await expect(page.locator('#saveFittingSession')).toBeVisible();
    await expect(page.locator('#copyFittingShareUrl')).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test('Curve Fitting computes nonlinear parameters with explicit termination evidence', async ({ page }) => {
    await page.goto('/fitting.html', { waitUntil: 'networkidle' });
    await page.locator('#fittingBootstrapReps').fill('80');
    await page.locator('#runFitting').click();
    await expect(page.locator('#fittingTopStatus')).toContainText(/Computed|convergence/i, { timeout: 30_000 });
    await expect(page.locator('#fittingRowsMetric')).not.toHaveText('—');
    await expect(page.locator('#fittingRmse')).not.toHaveText('—');
    await expect(page.locator('#fittingTermination')).not.toHaveText('—');
    await expect(page.locator('#provenanceMethod')).toContainText(/least squares/i);
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#rightPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('[data-plot-card="third"]')).toBeHidden();
  });

  test('Curve Fitting rejects non-positive known sigma values', async ({ page }) => {
    await page.goto('/fitting.html', { waitUntil: 'networkidle' });
    await page.locator('#fittingSelect').selectOption('calibration');
    await page.locator('#loadFitting').click();
    await page.locator('#fittingData').fill('x,y,sigma\n0,1,0.1\n1,3,0\n2,5,0.1\n3,7,0.1');
    await page.locator('#runFitting').click();
    await expect(page.locator('#fittingTopStatus')).toHaveText('Failed');
    await expect(page.locator('#provenanceWarning')).toContainText('strictly positive');
  });

  test('Curve Fitting mobile mode uses one focused plot without page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/fitting.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#plotGrid')).toHaveAttribute('data-layout', 'focus');
    await expectNoPageOverflow(page);
  });

  for (const [path, text] of [
    ['/linear-algebra.html', 'Linear'],
    ['/networks.html', 'Network'],
    ['/ml.html', 'ML'],
    ['/sciml.html', 'SciML'],
    ['/symbolic.html', 'Capability boundary']
  ]) {
    test(`${path} retained route loads`, async ({ page }) => {
      await expectUsablePage(page, path, [text]);
    });
  }

  test('theme control remains legible in the dark header', async ({ page }) => {
    await page.goto('/statistics.html', { waitUntil: 'domcontentloaded' });
    const summary = page.locator('#themeBtn');
    await expect(summary).toBeVisible();
    const contrast = await summary.evaluate((node) => {
      const style = getComputedStyle(node);
      return { color: style.color, background: style.backgroundColor, width: node.getBoundingClientRect().width };
    });
    expect(contrast.color).not.toBe(contrast.background);
    expect(contrast.width).toBeGreaterThan(75);
    await expect(summary).toHaveAttribute('aria-label', 'Choose interface theme');
  });

  test('Statistics exposes the expanded and filterable scientific example library', async ({ page }) => {
    await page.goto('/statistics.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#statisticsExampleCount')).toContainText('22');
    await expect(page.locator('#statisticsFamilyFilter')).toBeVisible();
    await page.locator('#statisticsFamilyFilter').selectOption({ label: 'Regression' });
    await expect(page.locator('#statisticsDeck button')).toHaveCount(3);
    await expect(page.locator('#statisticsDeck').getByText('Regression with leverage and influence', { exact: false })).toBeVisible();
  });

  test('SciML is authored, computes SINDy evidence and removes incompatible plots', async ({ page }) => {
    await page.goto('/sciml.html', { waitUntil: 'networkidle' });
    await expect(page.locator('body[data-v72-shell="true"][data-lab="sciml"]')).toBeVisible();
    await expect(page.locator('#sciTopStatus')).toContainText(/Computed/i, { timeout: 25_000 });
    await expect(page.locator('#sciPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#sciPlotType option')).not.toHaveCount(0);
    await expect(page.locator('#sciDiagnostics')).toContainText('residual', { ignoreCase: true });
    await expectNoPageOverflow(page);
  });

  test('SciML export-only PINN mode does not fabricate neural diagnostics', async ({ page }) => {
    await page.goto('/sciml.html', { waitUntil: 'networkidle' });
    await page.locator('#sciApproach').selectOption('pinn');
    await expect(page.locator('#sciTopStatus')).toContainText('Export only', { timeout: 20_000 });
    await expect(page.locator('#sciAvailablePlots')).toHaveText('1');
    await expect(page.locator('[data-plot-card="right"]')).toBeHidden();
    await expect(page.locator('[data-plot-card="third"]')).toBeHidden();
    await expect(page.locator('#sciBoundaryClaim')).toContainText('No neural model was trained');
  });


  test('Machine Learning is the authored v72.9 reference shell', async ({ page }) => {
    await page.goto('/ml.html', { waitUntil: 'networkidle' });
    await expect(page.locator('body[data-v72-shell="true"][data-lab="ml"]')).toBeVisible();
    await expect(page.locator('#mlPlotGrid')).toHaveAttribute('data-layout', 'two');
    await expect(page.locator('#mlTopStatus')).toContainText('Computed', { timeout: 30_000 });
    await expect(page.locator('#mlDiagnostics')).toContainText('Selected model');
    await expect(page.locator('#leftMlPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#rightMlPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#saveMlSession')).toBeVisible();
    await expect(page.locator('#copyMlShareUrl')).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test('Machine Learning rejects target leakage through feature overlap', async ({ page }) => {
    await page.goto('/ml.html', { waitUntil: 'networkidle' });
    const target = await page.locator('#mlTarget').inputValue();
    await page.locator(`#mlFeatureGrid input[value="${target}"]`).check();
    await page.locator('#mlRun').click();
    await expect(page.locator('#mlTopStatus')).toHaveText('Failed');
    await expect(page.locator('#mlStatus')).toContainText('target cannot also be a feature');
  });

  test('SciML Pareto sweep uses the loaded runtime core without a missing-function error', async ({ page }) => {
    await page.goto('/sciml.html', { waitUntil: 'networkidle' });
    await page.locator('#sciPlotType2').selectOption('pareto');
    await expect(page.locator('#sciPlot2.js-plotly-plot')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#sciPlot2')).not.toContainText('paretoSweep is not a function');
  });


  test('Agent renders dynamic spatial evidence with labels below the plot', async ({ page }) => {
    await page.goto('/agent.html?example=fadns_particle_baseline', { waitUntil: 'networkidle' });
    await expect(page.locator('body[data-v72-shell="true"][data-lab="agent"]')).toBeVisible();
    await expect(page.locator('.chart-card')).toHaveCount(2);
    await expect(page.locator('[data-plot-card="third"]')).toHaveCount(0);
    await page.locator('#agentSize').fill('16');
    await page.locator('#agentSteps').fill('24');
    await page.locator('#agentRuns').fill('4');
    await page.locator('#agentSnapshotCount').fill('4');
    await page.locator('#runAgent').click();
    await expect(page.locator('#agentTopStatus')).toContainText(/Rendered|Fallback|Computed/i, { timeout: 45_000 });
    await expect(page.locator('#leftAgentPlot')).not.toContainText('Run the ensemble');
    await expect(page.locator('#leftAgentPlotLegend span')).not.toHaveCount(0);
    const positions = await page.evaluate(() => {
      const plot = document.querySelector('#leftAgentPlot').getBoundingClientRect();
      const legend = document.querySelector('#leftAgentPlotLegend').getBoundingClientRect();
      return { plotBottom: plot.bottom, legendTop: legend.top };
    });
    expect(positions.legendTop).toBeGreaterThanOrEqual(positions.plotBottom - 2);
  });

  test('Model Atlas exposes a large provenance-classified catalog', async ({ page }) => {
    await page.goto('/examples.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body[data-v72-shell="true"][data-lab="examples"]')).toBeVisible();

    const readCount = async () => {
      const text = (await page.locator('#atlasCount').textContent()) || '';
      const match = text.match(/(\d+)\s+of\s+(\d+)/i);
      expect(match, `Unparseable Atlas count: ${text}`).not.toBeNull();
      return { visible: Number(match[1]), total: Number(match[2]) };
    };

    const initial = await readCount();
    expect(initial.total).toBeGreaterThanOrEqual(180);
    expect(initial.visible).toBe(initial.total);
    await expect(page.locator('.v72-atlas-card').first().locator('.v72-atlas-badge.provenance')).not.toHaveText('');
    await expect(page.locator('.v72-atlas-card').first().locator('.v72-atlas-badge.status')).not.toHaveText('');

    await page.locator('#atlasLab').selectOption({ label: 'Agent' });
    await expect.poll(async () => (await readCount()).visible).toBeGreaterThanOrEqual(20);
    const agent = await readCount();
    expect(agent.total).toBe(initial.total);
    await expect(page.getByText('FADNS chain-termination shift', { exact: true })).toBeVisible();

    await page.locator('#atlasSearch').fill('Hilbert');
    await expect.poll(async () => (await readCount()).visible).toBe(0);
    await page.locator('#atlasLab').selectOption('');
    await expect.poll(async () => (await readCount()).visible).toBe(1);
  });

  test('Model Atlas deep links select authored presets where supported', async ({ page }) => {
    await page.goto('/linear-algebra.html?example=ill-conditioned-hilbert', { waitUntil: 'networkidle' });
    await expect(page.locator('#linalgSelect')).toHaveValue('ill-conditioned-hilbert');
    await page.goto('/ml.html?example=small-n-high-p', { waitUntil: 'networkidle' });
    await expect(page.locator('#mlPresetSelect')).toHaveValue('small-n-high-p');
    await page.goto('/symbolic.html?example=toggle', { waitUntil: 'networkidle' });
    await expect(page.locator('#symbolicSelect')).toHaveValue('toggle');
  });


  test('Workbench is authored and computes through the shared ODE adapter', async ({ page }) => {
    await page.goto('/workbench.html', { waitUntil: 'networkidle' });
    await expect(page.locator('body[data-v72-shell="true"][data-lab="workbench"]')).toBeVisible();
    await expect(page.locator('#wbStatus')).toContainText('Computed', { timeout: 30_000 });
    await expect(page.locator('#wbAdapter')).toHaveValue('ode');
    await expect(page.locator('#wbPlot0.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#wbPlot1.js-plotly-plot')).toBeVisible();
    await expect(page.locator('.wb-plot-card[data-card="2"]')).toBeHidden();
    await expect(page.locator('#wbProvenance')).toContainText('FokoODECore');
    const adapterContract = await page.evaluate(() => {
      const registry = window.FokoWorkbenchAdapters;
      const ode = registry && typeof registry.get === 'function' ? registry.get('ode') : null;
      return Boolean(ode && typeof ode.run === 'function' && typeof ode.runPreset === 'function');
    });
    expect(adapterContract).toBe(true);
    await expectNoPageOverflow(page);
  });

  test('Workbench switches adapters without loading a second numerical engine', async ({ page }) => {
    await page.goto('/workbench.html', { waitUntil: 'networkidle' });
    await page.locator('#wbAdapter').selectOption('linalg');
    await expect(page.locator('#wbStatus')).toContainText('Computed', { timeout: 30_000 });
    await expect(page.locator('#wbWorkspaceTitle')).toContainText('Linear Algebra');
    await expect(page.locator('#wbPlotTitle0')).not.toHaveText('Primary plot');
    const selections = await page.locator('.wb-plot-card:visible select').evaluateAll(nodes => nodes.map(node => node.value));
    expect(new Set(selections).size).toBe(selections.length);
  });

  test('Workbench preserves legacy model links through explicit adapter routes', async ({ page }) => {
    await page.goto('/workbench.html?model=stoch-sir', { waitUntil: 'networkidle' });
    await expect(page.locator('#wbAdapter')).toHaveValue('stochastic');
    await expect(page.locator('#wbPreset')).toHaveValue('sir');
    await expect(page.locator('#wbStatus')).toContainText(/Computed/, { timeout: 30_000 });
    await expect(page.locator('#wbProvenance')).toContainText('Gillespie direct SSA');
  });


  test('Symbolic Lab is the authored v72.12 limited reference shell', async ({ page }) => {
    await page.goto('/symbolic.html', { waitUntil: 'networkidle' });
    await expect(page.locator('body[data-v72-shell="true"][data-lab="symbolic"]')).toBeVisible();
    await expect(page.locator('#symbolicTopStatus')).toContainText('Computed', { timeout: 25_000 });
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#rightPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#symbolicEquations')).toContainText(/Simplified expressions/i);
    await expect(page.locator('#provenanceWarning')).toContainText('not browser-computed');
    await expectNoPageOverflow(page);
  });

  test('Symbolic Lab keeps plot titles separate from selectors in two-up mode', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/symbolic.html', { waitUntil: 'networkidle' });
    await page.locator('#symbolicSelect').selectOption('lotka');
    await page.locator('#loadSymbolic').click();
    await page.locator('[data-layout-mode="two"]').click();
    await expect(page.locator('#plotGrid')).toHaveAttribute('data-layout', 'two');
    await expect(page.locator('[data-plot-card="third"]')).toBeHidden();
    for (const side of ['left', 'right']) {
      const title = page.locator(`[data-plot-card="${side}"] .chart-title > h3`);
      const controls = page.locator(`[data-plot-card="${side}"] .chart-title > .chart-controls, [data-plot-card="${side}"] .chart-title > select`).first();
      await expect(title).toBeVisible();
      await expect(controls).toBeVisible();
      const overlap = await page.evaluate(({ side }) => {
        const titleNode = document.querySelector(`[data-plot-card="${side}"] .chart-title > h3`);
        const controlsNode = document.querySelector(`[data-plot-card="${side}"] .chart-title > .chart-controls`) || document.querySelector(`[data-plot-card="${side}"] .chart-title > select`);
        const a = titleNode.getBoundingClientRect(); const b = controlsNode.getBoundingClientRect();
        return Math.max(0, Math.min(a.right,b.right)-Math.max(a.left,b.left)) * Math.max(0, Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      }, { side });
      expect(overlap).toBe(0);
    }
  });

  test('Symbolic Lab rejects implicit multiplication instead of guessing', async ({ page }) => {
    await page.goto('/symbolic.html', { waitUntil: 'networkidle' });
    await page.locator('#symbolicExpressions').fill("x' = 2x");
    await page.locator('#runSymbolic').click();
    await expect(page.locator('#symbolicTopStatus')).toHaveText('Failed');
    await expect(page.locator('#symbolicStatus')).toContainText('Explicit multiplication is required');
  });


  test('theme chooser changes the shell and existing plots, then persists across pages', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/statistics.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
    const before = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      return { canvas: css.getPropertyValue('--canvas').trim(), surface: css.getPropertyValue('--surface').trim(), ink: css.getPropertyValue('--ink').trim() };
    });
    const picker = page.locator('#themeControl');
    const summary = picker.locator('#themeBtn');
    await expect(summary).toBeVisible();
    await summary.click();
    await expect(picker.locator('.theme-menu-panel')).toBeVisible();
    await expect(picker.locator('[data-theme-choice]')).toHaveCount(14);
    await picker.locator('[data-theme-choice="midnight"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
    await expect(picker.locator('[data-theme-choice="midnight"]')).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => localStorage.getItem('chilperic-theme'))).toBe('midnight');
    const after = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      return { canvas: css.getPropertyValue('--canvas').trim(), surface: css.getPropertyValue('--surface').trim(), ink: css.getPropertyValue('--ink').trim() };
    });
    expect(after).not.toEqual(before);
    await expect.poll(async () => page.locator('#leftPlot').evaluate((node) => ({
      paper: node.layout && node.layout.paper_bgcolor,
      surface: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()
    })), { timeout: 12_000 }).toEqual(expect.objectContaining({ paper: after.surface, surface: after.surface }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
  });


  test('maintained mathematical previews render through one bounded KaTeX contract', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/symbolic.html', { waitUntil: 'networkidle' });
    await page.locator('#symbolicSelect').selectOption('rosenbrock');
    await page.locator('#loadSymbolic').click();
    await expect(page.locator('#symbolicTopStatus')).toContainText('Computed', { timeout: 25_000 });
    const blocks = page.locator('#symbolicEquations .symbolic-equation');
    await expect(blocks).toHaveCount(4);
    await expect(blocks.locator('.katex-display')).toHaveCount(4);
    await expect(page.locator('#symbolicEquations .foko-math-fallback')).toHaveCount(0);
    const geometry = await blocks.evaluateAll((nodes) => nodes.map((node) => ({
      width: node.getBoundingClientRect().width,
      parentWidth: node.parentElement.getBoundingClientRect().width,
      overflowX: getComputedStyle(node).overflowX,
      status: node.dataset.mathStatus,
      source: node.dataset.latexSource
    })));
    for (const row of geometry) {
      expect(row.width).toBeLessThanOrEqual(row.parentWidth + 1);
      expect(['auto', 'scroll']).toContain(row.overflowX);
      expect(row.status).toBe('rendered');
      expect(row.source.length).toBeGreaterThan(2);
    }

    for (const route of [
      ['/ode.html?example=SIR', '#mathPreview .foko-math-output'],
      ['/steady.html', '#steadyPreview.foko-math-output'],
      ['/stochastic.html', '#stochasticPreview.foko-math-output'],
      ['/optimization.html', '#optimizationPreview.foko-math-output'],
      ['/sciml.html', '#sciEquations .foko-math-output']
    ]) {
      await page.goto(route[0], { waitUntil: 'networkidle' });
      const math = page.locator(route[1]).first();
      await expect(math).toHaveAttribute('data-math-status', 'rendered', { timeout: 25_000 });
      await expect(math.locator('.katex-display')).toBeVisible();
    }
  });

  test('Statistics computes PCA and exposes multivariate plots', async ({ page }) => {
    await page.goto('/statistics.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#statisticsExampleCount')).toContainText('22');
    await page.locator('#statisticsFamilyFilter').selectOption({ label: 'Multivariate structure' });
    await page.locator('#statisticsSelect').selectOption('pca_latent_gradient');
    await page.locator('#loadStatistics').click();
    await expect(page.locator('#statisticsMode')).toHaveValue('pca');
    await page.locator('#runStatistics').click();
    await expect(page.locator('#statisticsTopStatus')).toContainText(/Computed/i, { timeout: 20_000 });
    await expect(page.locator('#leftPlotType option[value="pca-scores"]')).toHaveCount(1);
    await expect(page.locator('#leftPlot.js-plotly-plot')).toBeVisible();
    await expect(page.locator('#statisticsDiagnostics')).toContainText('PC1 variance');
  });

  test('Machine Learning exposes PCA diagnostics alongside supervised evidence', async ({ page }) => {
    await page.goto('/ml.html', { waitUntil: 'networkidle' });
    await page.locator('#mlPresetSelect').selectOption('collinear-predictors');
    await page.locator('#mlRun').click();
    await expect(page.locator('#mlTopStatus')).toContainText('Computed', { timeout: 30_000 });
    await expect(page.locator('#leftMlPlotType option[value="pca"]')).toHaveCount(1);
    await expect(page.locator('#leftMlPlotType option[value="explained"]')).toHaveCount(1);
    await expect(page.locator('#leftMlPlotType option[value="loadings"]')).toHaveCount(1);
  });

  test('SciML hides phase and PCA plots that are incompatible with one state', async ({ page }) => {
    await page.goto('/sciml.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#sciResultStates')).toContainText('1 states');
    for (const value of ['phase2d','phase3d','pca_scores','pca_explained','pca_loadings']) {
      await expect(page.locator(`#sciPlotType option[value="${value}"]`)).toHaveCount(0);
    }
    await expect(page.locator('.sciml-error')).toHaveCount(0);
  });

  test('Agent computed status requires a rendered Plotly or canvas panel', async ({ page }) => {
    await page.goto('/agent.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#agentSize').fill('16'); await page.locator('#agentSteps').fill('30'); await page.locator('#agentRuns').fill('4');
    await page.locator('#runAgent').click();
    await expect(page.locator('#agentTopStatus')).toHaveText('Rendered', { timeout: 45_000 });
    for (const side of ['left','right']) {
      const host = page.locator(`#${side}AgentPlot`);
      await expect(host).toHaveAttribute('data-render-state', /rendered|fallback/);
      const rendered = await host.evaluate(node => Boolean(node.classList.contains('js-plotly-plot') || node.querySelector('canvas')));
      expect(rendered).toBeTruthy();
    }
    await expect(page.locator('#agentStatus')).toContainText('Computed and rendered');
  });

  test('Agent worker can be cancelled without publishing a partial ensemble', async ({ page }) => {
    await page.goto('/agent.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#agentSize').fill('24');
    await page.locator('#agentRuns').fill('120');
    await page.locator('#agentSteps').fill('400');
    await page.locator('#runAgent').click();
    await expect(page.locator('#cancelAgent')).toBeVisible();
    await page.locator('#cancelAgent').click();
    await expect(page.locator('#agentTopStatus')).toHaveText('Cancelled');
    await expect(page.locator('#agentStatus')).toContainText('No partial ensemble was published');
    await expect(page.locator('#agentResultKind')).toContainText('No computed agent result');
  });

  test('Agent reports reproducibility and finite-ensemble uncertainty evidence', async ({ page }) => {
    await page.goto('/agent.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#agentSize').fill('16'); await page.locator('#agentSteps').fill('30'); await page.locator('#agentRuns').fill('6');
    await page.locator('#runAgent').click();
    await expect(page.locator('#agentTopStatus')).toHaveText('Rendered', { timeout: 45_000 });
    await expect(page.locator('#agentBoundarySeeds')).toContainText('master');
    await expect(page.locator('#agentDiagnostics')).toContainText('Wilson 95%');
    await expect(page.locator('#agentDiagnostics')).toContainText('Monte Carlo');
    await expect(page.locator('#agentBoundaryAlgorithm')).toContainText('asynchronous');
  });

  test('ODE exposes stiffness evidence, independent verification and report-card controls', async ({ page }) => {
    await page.goto('/ode.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#verifySciPyBtn')).toBeVisible();
    await expect(page.locator('#modelReportBtn')).toBeVisible();
    await page.locator('#runBtn').click();
    await expect(page.locator('#provenanceStatus')).toContainText(/Computed|warning/i, { timeout: 30_000 });
    await expect(page.locator('#diagnostics')).toContainText(/timescale|stiffness/i);
    await expect(page.locator('#verificationStatus')).toContainText(/not run|independent/i);
  });

  test('Curve Fitting renders practical-identifiability evidence and correlation plots', async ({ page }) => {
    await page.goto('/fitting.html', { waitUntil: 'networkidle' });
    await page.locator('#fittingBootstrapReps').fill('0');
    await page.locator('#runFitting').click();
    await expect(page.locator('#fittingTopStatus')).toContainText(/Computed|convergence/i, { timeout: 30_000 });
    await expect(page.locator('#fittingDiagnostics')).toContainText('Identifiability verdict');
    await expect(page.locator('#fittingDiagnostics')).toContainText('Structural identifiability');
    await expect(page.locator('#leftPlotType option[value="correlation"]')).toHaveCount(1);
    await expect(page.locator('#fittingDiagnostics')).toContainText('Experimental-design heuristic');
  });


  test('Sensitivity Analysis accepts editable scientific inputs and invalidates stale evidence', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/sensitivity.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#sensitivitySelect option')).toHaveCount(8);

    // The initial preset is SIR and exposes beta, gamma and N. The test must
    // validate the currently loaded preset instead of assuming Logistic is
    // already active.
    await expect(page.locator('#sensitivitySelect')).toHaveValue('sir');
    await expect(page.locator('#sensitivityParameterRows .table-row')).toHaveCount(3);

    // A request outside the guarded browser envelope must be refused before a
    // worker starts rather than freezing the tab or publishing a partial run.
    await page.locator('#sensitivityMethod').selectOption('sobol');
    await page.locator('#sensitivitySecondOrder').check();
    await page.locator('#sensitivitySamples').fill('4096');
    await expect(page.locator('#runSensitivity')).toBeDisabled();
    await expect(page.locator('#sensitivityBudget')).toContainText('too large for reliable in-browser sensitivity analysis');
    await expect(page.locator('#sensitivityBudget')).toContainText('No worker should be started');
    await page.locator('#sensitivitySecondOrder').uncheck();
    await page.locator('#sensitivitySamples').fill('128');
    await page.locator('#sensitivityMethod').selectOption('local');

    await page.locator('#sensitivitySelect').selectOption('logistic');
    await page.locator('#loadSensitivity').click();
    await expect(page.locator('#sensitivityParameterRows .table-row')).toHaveCount(2);
    await page.locator('#sensitivityInitialRows .table-row').first().locator('input').nth(1).fill('3.5');
    await page.locator('#sensitivityT1').fill('12');
    await page.locator('#sensitivityRtol').fill('1e-8');
    await page.locator('#sensitivityAtol').fill('1e-11');
    await page.locator('#sensitivityParameterRows .table-row').first().locator('input').nth(1).fill('0.75');
    await page.locator('#runSensitivity').click();

    await expect(page.locator('#sensitivityTopStatus')).toHaveText('Computed', { timeout: 45_000 });
    await expect(page.locator('#plotGrid')).toHaveAttribute('data-layout', 'two');
    await expect(page.locator('#leftPlot')).toHaveAttribute('data-render-state', 'rendered');
    await expect(page.locator('#rightPlot')).toHaveAttribute('data-render-state', 'rendered');
    await expect(page.locator('#sensitivityRtolMetric')).toContainText('1.0e-8');
    await expect(page.locator('#sensitivityDiagnostics')).toContainText('ODE solves');
    await expect(page.locator('#exportSensitivityJson')).toBeEnabled();
    await expect(page.locator('#exportSensitivityPng')).toBeEnabled();
    for (const plot of ['parameter-jacobian','state-jacobian','influence-map','ofat','tornado','directional']) {
      await expect(page.locator(`#leftPlotType option[value="${plot}"]`)).toHaveCount(1);
    }
    await page.locator('#leftPlotType').selectOption('parameter-jacobian');
    await expect(page.locator('#leftPlot')).toHaveAttribute('data-render-state', 'rendered');
    await expect(page.locator('#leftPlotEvidence')).toContainText('right-hand-side Jacobian');

    await page.locator('#sensitivityT1').fill('13');
    await expect(page.locator('#sensitivityTopStatus')).toHaveText('Stale');
    await expect(page.locator('#exportSensitivityJson')).toBeDisabled();
    await expect(page.locator('#exportSensitivityPng')).toBeDisabled();
    await expect(page.locator('#provenanceWarning')).toContainText('previous inputs');

    await page.locator('#sensitivityMethod').selectOption('fim');
    await expect(page.locator('#sensitivityOutputMetric')).toBeDisabled();
    await expect(page.locator('#sensitivityMethodNote')).toContainText('trajectory vector');
    await expect(page.locator('#scopeBlock')).toContainText('Not computed');
    await expectNoPageOverflow(page);
  });


  test('Sensitivity Analysis exposes advanced Morris and second-order global diagnostics', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/sensitivity.html', { waitUntil: 'networkidle' });
    await page.locator('#sensitivitySelect').selectOption('logistic');
    await page.locator('#loadSensitivity').click();
    await page.locator('#sensitivityPoints').fill('80');
    await page.locator('#sensitivityMethod').selectOption('sobol');
    await page.locator('#sensitivitySecondOrder').check();
    await page.locator('#sensitivitySamples').fill('16');
    await page.locator('#sensitivityBootstrap').fill('20');
    await page.locator('#sensitivityDependence').check();
    await page.locator('#sensitivityDependencePermutations').fill('19');
    await page.locator('#sensitivityResponseSurface').check();
    await page.locator('#sensitivitySurfacePoints').fill('5');
    await page.locator('#runSensitivity').click();

    await expect(page.locator('#sensitivityTopStatus')).toHaveText('Computed', { timeout: 75_000 });
    await expect(page.locator('#leftPlotType option[value="sobol-second"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="sobol-uncertainty"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="sobol-rank"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="sobol-output"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="sobol-time"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="sobol-first-time"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="sobol-state-total"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="sobol-state-first"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="variance-contribution"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="global-scatter"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="response-surface"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="dependence-mi"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="dependence-hsic"]')).toHaveCount(1);
    await page.locator('#leftPlotType').selectOption('sobol-second');
    await expect(page.locator('#leftPlot')).toHaveAttribute('data-render-state', 'rendered');
    await expect(page.locator('#leftPlotEvidence')).toContainText('Saltelli');
    await expect(page.locator('#sensitivityDiagnostics')).toContainText('Second-order pairs');
    await expect(page.locator('#provenanceWarning')).toContainText('independent uniform parameter ranges');
    await page.locator('#leftPlotType').selectOption('sobol-time');
    await expect(page.locator('#leftPlot')).toHaveAttribute('data-render-state', 'rendered');
    await expect(page.locator('#leftPlotEvidence')).toContainText('each downsampled time point');
    await page.locator('#rightPlotType').selectOption('dependence-hsic');
    await expect(page.locator('#rightPlot')).toHaveAttribute('data-render-state', 'rendered');
    await expect(page.locator('#rightPlotEvidence')).toContainText('not a Sobol index');

    await page.locator('#sensitivityMethod').selectOption('morris');
    await expect(page.locator('#sensitivityMethodNote')).toContainText('elementary-effect distributions');
    await page.locator('#sensitivityTrajectories').fill('6');
    await page.locator('#runSensitivity').click();
    await expect(page.locator('#sensitivityTopStatus')).toHaveText('Computed', { timeout: 75_000 });
    await expect(page.locator('#leftPlotType option[value="morris-design"]')).toHaveCount(1);
    await page.locator('#leftPlotType').selectOption('morris-design');
    await expect(page.locator('#leftPlotEvidence')).toContainText('design-inspection');
    await expectNoPageOverflow(page);
  });


  test('shared plot geometry prevents title, legend and axis collisions in representative labs', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });

    await page.goto('/optimization.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#optimizationTopStatus')).toContainText('Feasible candidate', { timeout: 30_000 });
    await expectPlotGeometry(page, '#leftPlot', 'Optimization objective landscape');
    await expectPlotGeometry(page, '#rightPlot', 'Optimization search history');

    await page.goto('/stochastic.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#stochasticTopStatus')).toContainText(/Successful|warning/i, { timeout: 30_000 });
    await expectPlotGeometry(page, '#leftPlot', 'Stochastic ensemble trajectories');
    await expectPlotGeometry(page, '#rightPlot', 'Stochastic mean-field comparison');

    await page.goto('/ode.html', { waitUntil: 'networkidle' });
    await page.locator('#exampleSelect').selectOption({ label: 'Van der Pol' });
    await page.locator('#loadExample').click();
    await expect(page.locator('#topStatus')).toHaveText('Ready');
    await page.locator('#runBtn').click();
    await expect(page.locator('#topStatus')).toContainText(/successful|warning/i, { timeout: 30_000 });
    await page.locator('#leftPlotType').selectOption('stiffness');
    await expectPlotGeometry(page, '#leftPlot', 'ODE stiffness evidence timeline');
  });

  test('Steady-State exposes a deep searchable library and solves selected systems automatically', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/steady.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#steadySelect option')).toHaveCount(26);
    await expect(page.locator('#steadyDeck [data-steady-preset]')).toHaveCount(26);
    await expect(page.locator('#steadyExampleCount')).toContainText('26 of 26 examples');
    await expect(page.locator('#steadyTopStatus')).toContainText('Converged', { timeout: 30_000 });
    await expectPlotGeometry(page, '#leftPlot', 'Steady-State primary evidence');
    await expectPlotGeometry(page, '#rightPlot', 'Steady-State secondary evidence');
    await expectActionControlsNotClipped(page, '.actionbar > button, .actionbar > .file-label', 'Steady-State action bar');

    await page.locator('#steadySelect').selectOption({ label: 'MAPK two-tier activation equilibrium' });
    await expect(page.locator('#steadyTopStatus')).toContainText('Converged', { timeout: 30_000 });
    await expect(page.locator('#leftPlotType option', { hasText: 'Residual-norm surface' })).toHaveCount(1);
    await expect(page.locator('#leftPlotType option', { hasText: 'Nullcline overlay' })).toHaveCount(1);

    await page.locator('#steadySelect').selectOption({ label: 'FADNS enzyme occupancy and CoA sequestration' });
    await expect(page.locator('#steadyTopStatus')).toContainText('Converged', { timeout: 30_000 });
    await expect(page.locator('#steadyMetricVars')).toHaveText('11');
    const residual = Number(await page.locator('#steadyResidual').textContent());
    expect(residual).toBeLessThanOrEqual(1e-9);
  });

  test('Symbolic exposes a deep searchable library and analyzes selected systems automatically', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/symbolic.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#symbolicSelect option')).toHaveCount(20);
    await expect(page.locator('#symbolicDeck [data-symbolic-preset]')).toHaveCount(20);
    await expect(page.locator('#symbolicExampleCount')).toContainText('20 of 20 examples');
    await expect(page.locator('#symbolicTopStatus')).toHaveText('Computed', { timeout: 30_000 });
    await expectPlotGeometry(page, '#leftPlot', 'Symbolic primary evidence');
    await expectPlotGeometry(page, '#rightPlot', 'Symbolic secondary evidence');
    await expectActionControlsNotClipped(page, '.actionbar > button', 'Symbolic action bar');

    await page.locator('#symbolicSelect').selectOption('cstr');
    await expect(page.locator('#symbolicTopStatus')).toHaveText('Computed', { timeout: 30_000 });
    await expect(page.locator('#leftPlotType option[value="vector-field"]')).toHaveCount(1);
    await expect(page.locator('#leftPlotType option[value="nullclines"]')).toHaveCount(1);
    const mathStatuses = await page.locator('#symbolicEquations .symbolic-equation').evaluateAll((nodes) => nodes.map((node) => node.dataset.mathStatus));
    expect(mathStatuses.length).toBeGreaterThanOrEqual(4);
    expect(mathStatuses.every((status) => status === 'rendered')).toBeTruthy();
    await expect(page.locator('#plotGrid')).toHaveAttribute('data-layout', 'two');
  });

});

test.describe('Public UX gate', () => {
  test('home is compact, model-first, and includes the creator', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText('Build, test, and compare scientific models in your browser.');
    const fontSize = await heading.evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
    expect(fontSize).toBeLessThanOrEqual(70);
    await expect(page.locator('#homeResearchEvidence')).toHaveAttribute('data-computed', 'true');
    await expect(page.locator('.home-author-profile img')).toBeVisible();
    await expect(page.locator('.home-author-profile')).toContainText('Dr. Chilperic Armel Foko Kuate');
    await expect(page.locator('#homePlatformAnswerTitle')).toHaveText('From model to evidence');
    await expect(page.locator('.home-engine-row')).toHaveCount(4);
    await expect(page.locator('.home-research-grid > .home-research-card')).toHaveCount(4);
    await expect(page.locator('.home-research-layout .home-author-profile-home')).toBeVisible();
    const researchBoxes = await page.locator('.home-research-grid > .home-research-card').evaluateAll((nodes) => nodes.map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
    expect(Math.max(...researchBoxes.map((box) => box.width)) - Math.min(...researchBoxes.map((box) => box.width))).toBeLessThan(3);
    expect(Math.max(...researchBoxes.map((box) => box.height)) - Math.min(...researchBoxes.map((box) => box.height))).toBeLessThan(3);
    await expect(page.locator('[data-research-card="thermoplants"]')).toContainText('Protected unpublished research');
    await expect(page.locator('[data-research-card="thermoplants"] [data-run-demo]')).toHaveCount(0);
    await expect(page.locator('.home-analysis-row')).toHaveCount(5);
    await expectNoPageOverflow(page);
  });

  test('guide and tutorials contain user help without maintainer filenames', async ({ page }) => {
    for (const path of ['/docs.html', '/tutorial.html']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.guide-layout .guide-toc')).toBeVisible();
      await expect(page.locator('.guide-document')).toBeVisible();
      await expect(page.locator('.guide-source-links')).toHaveCount(0);
      await expect(page.locator('main')).not.toContainText('PLATFORM_TODO.md');
      await expect(page.locator('main')).not.toContainText('USER_GUIDE.md');
      await expect(page.locator('main')).not.toContainText('TUTORIALS.md');
      await expectNoPageOverflow(page);
    }
  });

  test('Model Atlas restores loaded visual previews', async ({ page }) => {
    await page.goto('/examples.html', { waitUntil: 'networkidle' });
    await expect(page.locator('.v72-atlas-card').first()).toBeVisible();
    const cardCount = await page.locator('.v72-atlas-card').count();
    expect(cardCount).toBeGreaterThan(100);
    await expect(page.locator('.v72-atlas-media')).toHaveCount(cardCount);
    const images = await page.locator('.v72-atlas-media img').evaluateAll((nodes) =>
      nodes.slice(0, 12).map((img) => ({ complete: img.complete, width: img.naturalWidth, height: img.naturalHeight }))
    );
    for (const image of images) {
      expect(image.complete).toBeTruthy();
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
    }
    await page.goto('/examples.html?q=Lorenz%20attractor', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.v72-atlas-card')).toHaveCount(1);
    await expect(page.locator('.v72-atlas-card')).toContainText('Lorenz system');
    await page.goto('/examples.html?q=thermoplants', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.v72-atlas-card')).toContainText('Thermoplants');
    await expectNoPageOverflow(page);
  });

  test('redesigned public pages remain usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/docs.html', '/tutorial.html', '/examples.html']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expectNoPageOverflow(page);
    }
  });
});
