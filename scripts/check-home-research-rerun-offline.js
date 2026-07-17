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

async function canvasHash(page) {
  return page.locator('#research-tcell-canvas').evaluate((canvas) => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (let index = 0; index < data.length; index += 17) {
      hash ^= data[index];
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return { hash, width: canvas.width, height: canvas.height };
  });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.setContent(stripExternalResources(read('index.html')), { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const store = new Map();
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem: (key) => store.has(String(key)) ? store.get(String(key)) : null,
          setItem: (key, value) => { store.set(String(key), String(value)); },
          removeItem: (key) => { store.delete(String(key)); },
          clear: () => { store.clear(); }
        }
      });
      class IdleObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: IdleObserver });
    });
    for (const css of ['styles/v72-tokens.css', 'styles/style.css', 'styles/v72-public-shell.css']) {
      await page.addStyleTag({ path: path.join(ROOT, css) });
    }
    await page.addScriptTag({ path: path.join(ROOT, 'src/core/agent-reference.js') });
    await page.addScriptTag({ path: path.join(ROOT, 'src/models/agent-presets.js') });
    await page.evaluate(() => {
      class CoreBackedWorker {
        constructor() { this.onmessage = null; this.onerror = null; this.timer = null; this.terminated = false; }
        postMessage(payload) {
          const delay = payload.seed % 2 === 0 ? 18 : 45;
          this.timer = setTimeout(() => {
            if (this.terminated) return;
            try {
              if (payload.task !== 'agent') throw new Error('Offline rerun gate only supports Agent tasks.');
              const preset = window.FokoAgentPresets[payload.preset] || window.FokoAgentPresets.tcell_baseline;
              const config = Object.assign({}, preset, {
                size: 14, steps: 28, runs: 1, seed: payload.seed || preset.seed,
                recordEvery: 2, snapshotCount: 7, captureSnapshots: true
              });
              const result = window.FokoAgentReference.simulate(config, config.seed);
              const response = {
                size: config.size,
                steps: config.steps,
                seed: result.seed,
                states: result.states,
                colors: result.colors,
                snapshots: result.snapshots,
                finalCounts: result.finalCounts,
                terminal: result.terminal,
                algorithm: 'random-sequential lattice updates',
                boundary: config.note
              };
              this.onmessage?.({ data: { id: payload.id, ok: true, task: payload.task, result: response } });
            } catch (error) {
              this.onmessage?.({ data: { id: payload.id, ok: false, task: payload.task, error: error.message } });
            }
          }, delay);
        }
        terminate() { this.terminated = true; if (this.timer) clearTimeout(this.timer); }
      }
      Object.defineProperty(window, 'Worker', { configurable: true, writable: true, value: CoreBackedWorker });
    });
    await page.addScriptTag({ path: path.join(ROOT, 'src/home-demo-reel.js') });
    await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true })));
    await page.waitForFunction(() => window.FokoHomeDemoReel && document.querySelector('[data-run-demo="research-tcell"]'));

    const button = page.locator('[data-run-demo="research-tcell"]');
    const status = page.locator('#demo-research-tcell-status');
    const metrics = page.locator('#research-tcell-metrics');
    const card = page.locator('[data-demo-card="research-tcell"]');

    await button.click();
    await page.waitForFunction(() => document.getElementById('demo-research-tcell-status').textContent === 'Computed');
    assert.match(await metrics.textContent(), /seed 202611\b/);
    assert.equal(await card.getAttribute('data-state'), 'complete');
    const first = await canvasHash(page);
    assert.ok(first.width > 0 && first.height > 0, 'First T-cell realization did not paint a canvas.');

    await button.click();
    await page.waitForFunction(() => /Recomputing/.test(document.getElementById('demo-research-tcell-status').textContent));
    await page.waitForFunction(() => document.getElementById('demo-research-tcell-status').textContent === 'Computed');
    assert.match(await metrics.textContent(), /seed 202612\b/);
    const second = await canvasHash(page);
    assert.notEqual(second.hash, first.hash, 'Run again repainted the identical T-cell realization.');

    await button.click();
    await page.waitForTimeout(5);
    await button.click();
    await page.waitForFunction(() => document.getElementById('demo-research-tcell-status').textContent === 'Computed');
    assert.match(await metrics.textContent(), /seed 202614\b/, 'A superseded T-cell run overwrote the newest result.');
    assert.equal(await page.evaluate(() => window.FokoHomeDemoReel.attempt('research-tcell')), 4);
    assert.equal(await page.evaluate(() => window.FokoHomeDemoReel.isRunning('research-tcell')), false);

    console.log('Homepage T-cell Run again regression passed: new deterministic realization, cancelled stale worker/animation, newest run owns the card.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error('Homepage T-cell Run again regression failed.');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
