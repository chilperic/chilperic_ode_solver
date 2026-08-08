const { test, expect } = require('@playwright/test');

async function selectDifferentOption(select, forbidden = '') {
  const current = await select.inputValue();
  const alternate = await select.locator('option').evaluateAll((options, values) => {
    const [currentValue, forbiddenValue] = values;
    const found = options.find((option) => option.value && option.value !== 'none' && option.value !== currentValue && option.value !== forbiddenValue && !option.disabled);
    return found ? found.value : '';
  }, [current, forbidden]);
  if (alternate) await select.selectOption(alternate);
  return alternate;
}


async function expectRenderedHost(page, selector, label) {
  const host = page.locator(selector);
  await expect(host, label + ': plot host must remain visible').toBeVisible();
  await expect.poll(async () => host.evaluate((node) => {
    const message = (node.textContent || '').toLowerCase();
    if (message.includes('cannot read properties') || message.includes('plot error')) return false;
    return node.classList.contains('js-plotly-plot') || Boolean(node.querySelector('canvas, svg, .plotly, .js-plotly-plot'));
  }), { message: label + ': plot must remain mounted after selector changes', timeout: 12_000 }).toBe(true);
}



async function expectSingleAgentRenderRoot(page, side, expectedKind) {
  const host = page.locator(`#${side}AgentPlot`);
  await expect(host).toHaveAttribute('data-agent-render-root-count', '1', { timeout: 12_000 });
  if (expectedKind) await expect(host).toHaveAttribute('data-agent-render-kind', expectedKind);
  const audit = await host.evaluate((node) => {
    const directRoots = Array.from(node.children).filter((child) =>
      child.classList && (child.classList.contains('plot-container') || child.classList.contains('agent-panel-render-root'))
    );
    return {
      directRoots: directRoots.length,
      liveCanvases: node.querySelectorAll('canvas.agent-live-lattice, canvas.agent-live-population').length,
      animationCanvases: node.querySelectorAll('canvas.agent-animation-canvas').length,
      plotContainers: node.querySelectorAll(':scope > .plot-container').length
    };
  });
  expect(audit.directRoots).toBe(1);
  return audit;
}

async function assertTwoPanelStable(page, route) {
  await test.step(route.url, async () => {
  await page.setViewportSize({ width: 1280, height: 920 });
  await page.goto(route.url, { waitUntil: 'networkidle' });
  const grid = page.locator(route.grid);
  const left = page.locator(route.left);
  const right = page.locator(route.right);
  await expect(left).toBeVisible();
  await expect(right).toBeVisible();

  const twoButton = page.locator('[data-layout-mode="two"]').first();
  if (await twoButton.count()) await twoButton.click();
  await expect(grid).toHaveAttribute('data-layout', 'two');

  const analysisMenu = page.locator('[data-v76-popover="analyze"]');
  const analysisSummary = page.locator('[data-v76-trigger="analyze"]');
  if (await analysisSummary.count()) {
    const navBox = await analysisSummary.boundingBox();
    if (navBox) {
      await page.mouse.move(navBox.x + navBox.width / 2, navBox.y + navBox.height / 2);
      await page.waitForTimeout(120);
      await expect(analysisMenu, `${route.url}: navigation must not open from pointer travel`).toHaveAttribute('data-open', 'false');
    }
  }

  await expect.poll(async () => left.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return top === node || node.contains(top);
  }), { message: `${route.url}: primary selector hitbox must not be covered`, timeout: 4_000 }).toBe(true);
  await left.click();
  await expect(grid, `${route.url}: opening a plot selector must not enter Focus`).toHaveAttribute('data-layout', 'two');
  await page.keyboard.press('Escape');
  await right.click();
  await expect(grid, `${route.url}: opening the second selector must not enter Focus`).toHaveAttribute('data-layout', 'two');
  await page.keyboard.press('Escape');

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await selectDifferentOption(left, await right.inputValue());
    await page.waitForTimeout(350);
    await expect(grid, `${route.url}: left change ${cycle + 1} must preserve two-up`).toHaveAttribute('data-layout', 'two');
    await expect(twoButton, `${route.url}: 2-up intent must remain selected after left change`).toHaveAttribute('aria-pressed', 'true');
    await expectRenderedHost(page, route.leftHost, `${route.url} left cycle ${cycle + 1}`);
    await expectRenderedHost(page, route.rightHost, `${route.url} right after left cycle ${cycle + 1}`);

    await selectDifferentOption(right, await left.inputValue());
    await page.waitForTimeout(350);
    await expect(grid, `${route.url}: right change ${cycle + 1} must preserve two-up`).toHaveAttribute('data-layout', 'two');
    await expect(twoButton, `${route.url}: 2-up intent must remain selected after right change`).toHaveAttribute('aria-pressed', 'true');
    if (cycle === 2) {
      await page.waitForTimeout(1900);
      await expect(grid, `${route.url}: delayed work must not collapse 2-up`).toHaveAttribute('data-layout', 'two');
      await expect(twoButton).toHaveAttribute('aria-pressed', 'true');
    }
    await expectRenderedHost(page, route.leftHost, `${route.url} left after right cycle ${cycle + 1}`);
    await expectRenderedHost(page, route.rightHost, `${route.url} right cycle ${cycle + 1}`);
  }
  });
}


async function assertFocusStable(page, route) {
  await test.step(`${route.url} focus`, async () => {
    await page.setViewportSize({ width: 1280, height: 920 });
    await page.goto(route.url, { waitUntil: 'networkidle' });
    const grid = page.locator(route.grid);
    const left = page.locator(route.left);
    const right = page.locator(route.right);
    const focusButton = page.locator('[data-layout-mode="focus"]').first();
    await focusButton.click();
    await expect(grid).toHaveAttribute('data-layout', 'focus');
    await selectDifferentOption(left, await right.inputValue());
    await page.waitForTimeout(850);
    await expect(grid, `${route.url}: changing a plot must preserve explicit Focus`).toHaveAttribute('data-layout', 'focus');
  });
}

const ROUTES = [
  { url: '/ode.html?example=SIR', left: '#leftPlotType', right: '#rightPlotType', grid: '#plotGrid', leftHost: '#leftPlot', rightHost: '#rightPlot' },
  { url: '/steady.html', left: '#leftPlotType', right: '#rightPlotType', grid: '#plotGrid', leftHost: '#leftPlot', rightHost: '#rightPlot' },
  { url: '/stochastic.html', left: '#leftPlotType', right: '#rightPlotType', grid: '#plotGrid', leftHost: '#leftPlot', rightHost: '#rightPlot' },
  { url: '/optimization.html', left: '#leftPlotType', right: '#rightPlotType', grid: '#plotGrid', leftHost: '#leftPlot', rightHost: '#rightPlot' },
  { url: '/statistics.html', left: '#leftPlotType', right: '#rightPlotType', grid: '#plotGrid', leftHost: '#leftPlot', rightHost: '#rightPlot' },
  { url: '/fitting.html', left: '#leftPlotType', right: '#rightPlotType', grid: '#plotGrid', leftHost: '#leftPlot', rightHost: '#rightPlot' },
  { url: '/linear-algebra.html', left: '#leftPlotType', right: '#rightPlotType', grid: '#plotGrid', leftHost: '#leftPlot', rightHost: '#rightPlot' },
  { url: '/networks.html', left: '#leftPlotType', right: '#rightPlotType', grid: '#plotGrid', leftHost: '#leftPlot', rightHost: '#rightPlot' },
  { url: '/ml.html', left: '#leftMlPlotType', right: '#rightMlPlotType', grid: '#mlPlotGrid', leftHost: '#leftMlPlot', rightHost: '#rightMlPlot' },
  { url: '/sciml.html', left: '#sciPlotType', right: '#sciPlotType2', grid: '#plotGrid', leftHost: '#sciPlot', rightHost: '#sciPlot2' },
  { url: '/agent.html', left: '#leftAgentPlotType', right: '#rightAgentPlotType', grid: '#agentPlotGrid', leftHost: '#leftAgentPlot', rightHost: '#rightAgentPlot' },
  { url: '/symbolic.html', left: '#leftPlotType', right: '#rightPlotType', grid: '#plotGrid', leftHost: '#leftPlot', rightHost: '#rightPlot' },
  { url: '/workbench.html', left: '#wbPlotSelect0', right: '#wbPlotSelect1', grid: '#wbPlotGrid', leftHost: '#wbPlot0', rightHost: '#wbPlot1' }
];

test('Agent streams the actual representative run to both panels and keeps manual one-pass replay', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/agent.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#agentSize').fill('16');
  await page.locator('#agentSteps').fill('80');
  await page.locator('#agentRuns').fill('4');
  await page.locator('#agentSnapshotCount').fill('8');
  await page.locator('#agentLiveSpeed').selectOption('90');
  await page.locator('#runAgent').click();
  await expect(page.locator('#leftAgentPlot canvas.agent-live-lattice')).toBeVisible({ timeout: 12000 });
  await expect(page.locator('#rightAgentPlot canvas.agent-live-population')).toBeVisible();
  await expect(page.locator('#leftAgentPlot .agent-live-badge')).toContainText('Live');
  await expect.poll(async () => Number(await page.locator('#leftAgentPlot').getAttribute('data-live-step') || 0)).toBeGreaterThan(0);
  const firstVisibleStep = Number(await page.locator('#leftAgentPlot').getAttribute('data-live-step'));
  await expect.poll(async () => Number(await page.locator('#leftAgentPlot').getAttribute('data-live-step') || 0)).toBeGreaterThan(firstVisibleStep);
  await page.locator('#pauseAgent').click();
  await expect(page.locator('#pauseAgent')).toHaveText('Resume live run');
  await expect(page.locator('#agentTopStatus')).toHaveText('Paused');
  const pausedStep = Number(await page.locator('#leftAgentPlot').getAttribute('data-live-step'));
  await page.waitForTimeout(260);
  expect(Number(await page.locator('#leftAgentPlot').getAttribute('data-live-step'))).toBe(pausedStep);
  await page.locator('#pauseAgent').click();
  await expect.poll(async () => Number(await page.locator('#leftAgentPlot').getAttribute('data-live-step') || 0)).toBeGreaterThan(pausedStep);
  await expect.poll(async () => Number(await page.locator('#rightAgentPlot').getAttribute('data-live-step') || 0)).toBeGreaterThan(0);
  await expect(page.locator('#agentTopStatus')).toHaveText('Rendered', { timeout: 45000 });
  await expect(page.locator('#leftAgentPlot canvas.agent-animation-canvas')).toBeVisible();
  await expect(page.locator('#leftAgentPlot .agent-animation-play')).toHaveText('Replay');
  await expect(page.locator('#leftAgentPlotLegend')).toBeVisible();
  const plotBox = await page.locator('#leftAgentPlot').boundingBox();
  const legendBox = await page.locator('#leftAgentPlotLegend').boundingBox();
  expect(legendBox.y).toBeGreaterThanOrEqual(plotBox.y + plotBox.height - 2);
});



test('Agent dropdown exposes live simulation and time curves without collapsing two-up', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/agent.html', { waitUntil: 'domcontentloaded' });
  const grid = page.locator('#agentPlotGrid');
  const left = page.locator('#leftAgentPlotType');
  const right = page.locator('#rightAgentPlotType');
  const twoButton = page.locator('[data-layout-mode="two"]').first();
  await expect(left.locator('option', { hasText: 'Live spatial simulation' })).toHaveCount(1);
  await expect(left.locator('option', { hasText: 'Population time curves' })).toHaveCount(1);
  await twoButton.click();
  await expect(grid).toHaveAttribute('data-layout', 'two');
  await right.click();
  await expect(grid, 'opening the dropdown must not trigger Focus through event bubbling').toHaveAttribute('data-layout', 'two');
  await page.keyboard.press('Escape');

  await right.selectOption('spatial-dynamics');
  await expect(right).toHaveValue('spatial-dynamics');
  await expect(left).toHaveValue('population');
  await expect(grid, 'selecting a plot must not bubble into the grid Focus action').toHaveAttribute('data-layout', 'two');
  await expect(twoButton).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#agentSize').fill('16');
  await page.locator('#agentSteps').fill('120');
  await page.locator('#agentRuns').fill('4');
  await page.locator('#agentSnapshotCount').fill('8');
  await page.locator('#agentLiveSpeed').selectOption('90');
  await page.locator('#runAgent').click();
  await expect(page.locator('#rightAgentPlot canvas.agent-live-lattice')).toBeVisible({ timeout: 12_000 });
  await expect(page.locator('#leftAgentPlot canvas.agent-live-population')).toBeVisible();
  await expect(grid).toHaveAttribute('data-layout', 'two');

  await left.selectOption('spatial-dynamics');
  await expect(left).toHaveValue('spatial-dynamics');
  await expect(right).toHaveValue('population');
  await expect(page.locator('#leftAgentPlot canvas.agent-live-lattice')).toBeVisible();
  await expect(page.locator('#rightAgentPlot canvas.agent-live-population')).toBeVisible();
  await expect(grid).toHaveAttribute('data-layout', 'two');
  await expect(twoButton).toHaveAttribute('aria-pressed', 'true');
});


test('Agent replaces the previous render root across live, Plotly and lattice transitions', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/agent.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#agentSize').fill('16');
  await page.locator('#agentSteps').fill('40');
  await page.locator('#agentRuns').fill('4');
  await page.locator('#agentSnapshotCount').fill('8');
  await page.locator('#runAgent').click();

  await expect(page.locator('#rightAgentPlot canvas.agent-live-population')).toBeVisible({ timeout: 12_000 });
  let audit = await expectSingleAgentRenderRoot(page, 'right', 'live-preview');
  expect(audit.liveCanvases).toBe(1);

  await expect(page.locator('#agentTopStatus')).toHaveText('Rendered', { timeout: 45_000 });
  audit = await expectSingleAgentRenderRoot(page, 'right', 'population');
  expect(audit.liveCanvases).toBe(0);
  expect(audit.plotContainers).toBe(1);

  await page.locator('#rightAgentPlotType').selectOption('spatial');
  await expect(page.locator('#rightAgentPlotTitle')).toHaveText('Representative final spatial state');
  await expect(page.locator('#rightAgentPlot')).toHaveAttribute('data-render-state', 'rendered');
  audit = await expectSingleAgentRenderRoot(page, 'right', 'spatial');
  expect(audit.liveCanvases).toBe(0);
  expect(audit.plotContainers).toBe(1);
  const spatialTypes = await page.locator('#rightAgentPlot').evaluate((node) => (node.data || []).map((trace) => trace.type || 'scatter'));
  expect(spatialTypes).toEqual(['heatmap']);

  await page.locator('#rightAgentPlotType').selectOption('population');
  await expect(page.locator('#rightAgentPlotTitle')).toHaveText('Population time curves');
  audit = await expectSingleAgentRenderRoot(page, 'right', 'population');
  expect(audit.animationCanvases).toBe(0);
  const populationTypes = await page.locator('#rightAgentPlot').evaluate((node) => (node.data || []).map((trace) => trace.type || 'scatter'));
  expect(populationTypes).not.toContain('heatmap');

  await page.locator('#rightAgentPlotType').selectOption('spatial-dynamics');
  await expect(page.locator('#rightAgentPlot canvas.agent-animation-canvas')).toBeVisible();
  audit = await expectSingleAgentRenderRoot(page, 'right', 'spatial-animation');
  expect(audit.animationCanvases).toBe(1);
  expect(audit.plotContainers).toBe(0);

  await page.locator('#rightAgentPlotType').selectOption('population');
  await expect(page.locator('#rightAgentPlotTitle')).toHaveText('Population time curves');
  audit = await expectSingleAgentRenderRoot(page, 'right', 'population');
  expect(audit.liveCanvases).toBe(0);
  expect(audit.animationCanvases).toBe(0);
  expect(audit.plotContainers).toBe(1);
  await expect(page.locator('#agentPlotGrid')).toHaveAttribute('data-layout', 'two');
});

for (const route of ROUTES) {
  test(`changing either plot preserves two-up after delayed rerendering — ${route.url}`, async ({ page }) => {
    await assertTwoPanelStable(page, route);
  });
  test(`changing a plot preserves explicit Focus — ${route.url}`, async ({ page }) => {
    await assertFocusStable(page, route);
  });
}

test('home ODE demo computes a real SVG trajectory and links to an autorun example', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 920 });
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await page.locator('[data-demo-card="ode"] [data-run-demo="ode"]').click();
  await expect(page.locator('#demo-ode-status')).toHaveText('Computed');
  await expect(page.locator('#demo-ode-plot path.home-demo-series')).toHaveCount(1);
  await expect(page.locator('[data-demo-card="ode"] .home-engine-label a')).toHaveAttribute('href', /example=Lorenz.*autorun=1/);
});


test('home project console recomputes and the newest inputs own the result', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await expect(page.locator('#v76HomeStatus')).toContainText('Computed', { timeout: 10_000 });
  const before = await page.locator('#v76HomeFinal').textContent();
  await page.locator('#v76HomeCapacity').fill('180');
  await page.locator('#v76HomeRun').click();
  await expect.poll(async () => page.locator('#v76HomeFinal').textContent()).not.toBe(before);
  await expect(page.locator('#v76HomePlot')).toHaveAttribute('data-engine', 'FokoODECore');
});

test('homepage uses six model cards and keeps creator identity compact', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await expect(page.locator('.foko-creator-strip')).toBeVisible();
  await expect(page.locator('.foko-creator-strip')).toContainText('Dr. Chilperic Armel Foko Kuate');
  const cards = page.locator('.foko-feature-grid > .foko-feature-card');
  await expect(cards).toHaveCount(6);
  await expect(cards.filter({ hasText: 'Population genetics' })).toHaveCount(1);
  await expect(cards.filter({ hasText: 'CMA-ES' })).toHaveCount(1);
  await expect(cards.filter({ hasText: 'Sobol and Morris' })).toHaveCount(1);
});

test('Explore exposes Mathematical Beauty and the manifold canvas is interactive', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 920 });
  await page.goto('/beauty.html', { waitUntil: 'networkidle' });
  await page.locator('[data-v76-trigger="profile"]').click();
  await expect(page.locator('[data-v76-popover="profile"] a[href="beauty.html"]')).toHaveCount(1);
  await expect(page.locator('.beauty-preview-card')).toHaveCount(34);
  await expect.poll(async () => page.locator('.beauty-preview-card canvas').first().evaluate((canvas) => canvas.toDataURL().length), { timeout: 15_000 }).toBeGreaterThan(2_000);
  const selector = page.locator('#beautyExample');
  for (const value of ['mobius','torus','klein','projective','helicoid','catenoid','enneper','sphere','saddle']) {
    await selector.selectOption(value);
    await expect(page.locator('#beautyTitle')).not.toHaveText('Mandelbrot set');
  }
  const canvas = page.locator('#beautyCanvas');
  const before = await canvas.screenshot();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * .45, box.y + box.height * .48);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .68, box.y + box.height * .62, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
});

test('Workbench deeper examples expose distinct scientific views without collapsing two-up', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/workbench.html?lab=ode&preset=lorenz', { waitUntil: 'networkidle' });
  await expect(page.locator('#wbStatus strong')).toContainText(/Computed/);
  await expect(page.locator('#wbPreset')).toHaveValue('lorenz');
  await expect(page.locator('#wbPlotSelect0 option')).toHaveCount(5);
  await page.locator('[data-wb-layout="two"]').click();
  await page.locator('#wbPlotSelect0').selectOption({ label: 'Three-dimensional phase trajectory' });
  await expect(page.locator('#wbPlotSelect0')).toHaveValue('1');
  await expect(page.locator('#wbPlotSelect1')).toHaveValue('0');
  await page.waitForTimeout(2100);
  await expect(page.locator('#wbPlotGrid')).toHaveAttribute('data-layout', 'two');
  await expect(page.locator('[data-wb-layout="two"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#wbPlot0 .js-plotly-plot, #wbPlot0.js-plotly-plot')).toBeVisible();
  await expect(page.locator('#wbPlot1 .js-plotly-plot, #wbPlot1.js-plotly-plot')).toBeVisible();
});
