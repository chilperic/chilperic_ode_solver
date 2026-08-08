const { test, expect } = require('@playwright/test');

test.describe('v77.4.1 laboratory identity and workflow rail', () => {
  test('desktop rail is vertical, readable, ordered, and laboratory-coloured', async ({ page }) => {
    await page.setViewportSize({ width: 1500, height: 960 });
    await page.goto('/agent.html', { waitUntil: 'networkidle' });

    const rail = page.locator('.side-nav');
    const items = rail.locator('.nav-item');
    await expect(rail).toBeVisible();
    await expect(items).toHaveCount(4);
    await expect(items).toHaveText(['Examples', 'Model', 'Simulation', 'Export']);

    const railBox = await rail.boundingBox();
    expect(railBox.width).toBeGreaterThanOrEqual(62);
    expect(railBox.width).toBeLessThanOrEqual(66);

    const boxes = await items.evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        writingMode: style.writingMode,
        transform: style.transform
      };
    }));
    for (let index = 0; index < boxes.length; index += 1) {
      expect(boxes[index].width).toBeGreaterThanOrEqual(62);
      expect(boxes[index].height).toBeGreaterThanOrEqual(76);
      expect(boxes[index].writingMode).toBe('vertical-rl');
      expect(boxes[index].transform).not.toBe('none');
      if (index > 0) {
        expect(Math.abs(boxes[index].x - boxes[0].x)).toBeLessThanOrEqual(1);
        expect(boxes[index].y).toBeGreaterThan(boxes[index - 1].y + boxes[index - 1].height);
      }
    }

    const identity = await page.evaluate(() => {
      const bodyStyle = getComputedStyle(document.body);
      const activeStyle = getComputedStyle(document.querySelector('.side-nav .nav-item.active'));
      return {
        accent: bodyStyle.getPropertyValue('--lab-accent').trim(),
        text: activeStyle.color,
        background: activeStyle.backgroundColor
      };
    });
    expect(identity.accent).toBe('#317244');
    expect(identity.text).toBe('rgb(255, 255, 255)');
    expect(identity.background).toBe('rgb(49, 114, 68)');
  });

  test('representative laboratories expose different visible identities', async ({ page }) => {
    const pages = [
      ['ode.html', '#006d78'],
      ['population-genetics.html', '#477026'],
      ['sensitivity.html', '#8b5a00'],
      ['ai-modeling.html', '#653eb4'],
      ['linear-algebra.html', '#2c58a2']
    ];
    const observed = [];
    for (const [path, expected] of pages) {
      await page.goto(`/${path}`, { waitUntil: 'domcontentloaded' });
      const accent = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--lab-accent').trim());
      expect(accent).toBe(expected);
      observed.push(accent);
    }
    expect(new Set(observed).size).toBe(pages.length);
  });

  test('adaptive mark separates subject context from exact laboratory identity', async ({ page }) => {
    await page.setViewportSize({ width: 1500, height: 960 });
    await page.goto('/agent.html', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toHaveAttribute('data-subject', 'populations-evolution');
    await expect(page.locator('.v76-appbar .foko-brand-context > span')).toHaveText('Populations & evolution');
    await expect(page.locator('.v76-appbar .foko-brand-context em')).toHaveText('Agent Lab');

    const mark = await page.evaluate(() => {
      const subject = getComputedStyle(document.querySelector('.v76-appbar .foko-brand-observe-top')).stroke;
      const output = getComputedStyle(document.querySelector('.v76-appbar .foko-brand-observe-bottom')).stroke;
      const body = getComputedStyle(document.body);
      return {
        subject,
        output,
        subjectToken: body.getPropertyValue('--subject-accent').trim(),
        labToken: body.getPropertyValue('--lab-accent').trim()
      };
    });
    expect(mark.subjectToken).toBe('#397142');
    expect(mark.labToken).toBe('#317244');
    expect(mark.subject).not.toBe(mark.output);

    const routedAccents = await page.evaluate(() => {
      const values = {};
      for (const lab of ['ode', 'agent', 'optimization', 'ai-modeling', 'linalg']) {
        const link = document.querySelector(`[data-lab-target="${lab}"]`);
        values[lab] = link ? getComputedStyle(link).getPropertyValue('--lab-accent').trim() : '';
      }
      return values;
    });
    expect(Object.values(routedAccents).every(Boolean)).toBeTruthy();
    expect(new Set(Object.values(routedAccents)).size).toBe(5);
  });

  test('phone rail becomes a horizontal scroller without clipping the page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/agent.html', { waitUntil: 'domcontentloaded' });
    const rail = page.locator('.side-nav');
    const items = rail.locator('.nav-item');
    await expect(rail).toBeVisible();
    const geometry = await items.evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, writingMode: getComputedStyle(node).writingMode };
    }));
    expect(geometry).toHaveLength(4);
    for (let index = 0; index < geometry.length; index += 1) {
      expect(geometry[index].width).toBeGreaterThanOrEqual(84);
      expect(geometry[index].writingMode).toBe('horizontal-tb');
      expect(Math.abs(geometry[index].y - geometry[0].y)).toBeLessThanOrEqual(1);
      if (index > 0) expect(geometry[index].x).toBeGreaterThan(geometry[index - 1].x);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
