const { test, expect } = require('@playwright/test');

test('Agent computes and renders a live 3D space-time cube', async ({ page }) => {
  await page.goto('/agent.html?example=sir_clustered_seed');
  await expect(page.locator('#agentEquationPreview .katex')).toBeVisible();
  await expect(page.locator('#leftAgentPlotType')).toHaveValue('spatial-dynamics');
  await expect(page.locator('#leftAgentPlotType option[value="space-time-3d"]')).toHaveCount(1);
  await page.locator('#leftAgentPlotType').selectOption('space-time-3d');
  await expect(page.locator('#runAgent')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#agentSize').fill('12');
  await page.locator('#agentSize').blur();
  await page.locator('#agentSteps').fill('12');
  await page.locator('#agentRuns').fill('2');
  await page.locator('#agentSnapshotCount').fill('6');
  await page.locator('#runAgent').click();
  await expect(page.locator('#agentTopStatus')).toHaveText(/Rendered/, { timeout: 30_000 });
  await expect(page.locator('#leftAgentPlot')).toHaveAttribute('data-agent-render-kind', 'space-time-3d');
  const traceTypes = await page.locator('#leftAgentPlot').evaluate(node => (node.data || []).map(trace => trace.type));
  expect(traceTypes).toContain('scatter3d');
  expect(traceTypes).toContain('mesh3d');
  await expect(page.locator('#agent3dPlay')).toBeEnabled();
});

test('Agent keeps ordinary models on the live lattice without an irrelevant 3D choice', async ({ page }) => {
  await page.goto('/agent.html?example=tcell_baseline');
  await expect(page.locator('#leftAgentPlotType')).toHaveValue('spatial-dynamics');
  await expect(page.locator('#leftAgentPlotType option[value="space-time-3d"]')).toHaveCount(0);
  await expect(page.locator('#agent3dControls')).toBeHidden();
});

test('Evolution keeps a rotatable live 3D population and adaptive path', async ({ page }) => {
  await page.goto('/evolution.html');
  await expect(page.locator('#evEquationPreview .katex')).toBeVisible();
  await expect(page.locator('#rightEvPlotType')).toHaveValue('live-4d');
  await expect(page.locator('#evTopStatus')).toHaveText('Computed');
  const names = await page.locator('#rightEvPlot').evaluate(node => (node.data || []).map(trace => trace.name));
  expect(names).toContain('dominant path');
  expect(names).toContain('current population');
  await page.locator('#evStepBack').click();
  await expect(page.locator('#evSnapshotLabel')).toContainText('frame');
});

test('Model Studio renders LaTeX and plays a user-computed 3D trajectory', async ({ page }) => {
  await page.goto('/studio.html');
  await page.locator('#studioPreset').selectOption('lorenz');
  await page.locator('#loadStudioPreset').click();
  await expect(page.locator('#studioEquationPreview .katex')).toBeVisible();
  await page.locator('#runStudio').click();
  await expect(page.locator('#studioTopStatus')).toHaveText(/Computed/);
  await page.locator('#leftStudioPlotType').selectOption('phase3d');
  await expect(page.locator('#studio3dControls')).toBeVisible();
  await expect(page.locator('#studio3dPlay')).toBeEnabled();
  const traceTypes = await page.locator('#leftStudioPlot').evaluate(node => (node.data || []).map(trace => trace.type));
  expect(traceTypes).toContain('scatter3d');
  await page.locator('#studio3dPlay').click();
  await expect(page.locator('#studio3dPlay')).toHaveText(/Pause 3D/);
});
