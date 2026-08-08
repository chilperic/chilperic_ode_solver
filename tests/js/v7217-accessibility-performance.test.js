'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
let checks = 0, failures = 0;
function ok(value, message) { checks += 1; if (!value) { failures += 1; console.error('FAIL:', message); } }
function read(name) { return fs.readFileSync(path.join(root, name), 'utf8'); }

const runtime = read('src/v72/accessibility-performance.js');
const css = read('styles/v72-accessibility-performance.css');
ok(runtime.includes("const RELEASE = '77.4.1'"), 'accessibility runtime has current release');
ok(runtime.includes("['newPlot', 'react']"), 'Plotly newPlot/react are instrumented');
ok(runtime.includes("aria-busy"), 'plot rendering exposes busy state');
ok(runtime.includes('foko:plot-rendered'), 'plot rendering dispatches completion evidence');
ok(runtime.includes('PerformanceObserver'), 'long-task telemetry is supported');
ok(runtime.includes('getReport'), 'performance report is inspectable without UI noise');
ok(!runtime.includes('MutationObserver'), 'runtime does not use mutation repair');
ok(!runtime.includes('ResizeObserver'), 'runtime does not use observer-driven layout repair');
ok(css.includes(':focus-visible'), 'strong keyboard focus is present');
ok(css.includes('prefers-reduced-motion'), 'reduced motion is respected');
ok(css.includes('forced-colors'), 'forced-colour users are supported');
ok(css.includes('@container v72workspace'), 'workspace-width responsive contract exists');
ok(!css.includes('!important'), 'accessibility CSS does not escalate overrides');

const pages = fs.readdirSync(root).filter(name => name.endsWith('.html') && read(name).includes('data-v72-shell="true"'));
ok(pages.length >= 14, 'all authored lab pages are covered');
for (const name of pages) {
  const text = read(name);
  ok(text.includes('class="skip-link"'), name + ' has skip link');
  ok(text.includes('v72-accessibility-performance.css?v=77.4.1'), name + ' loads accessibility CSS');
  ok(text.includes('v72/accessibility-performance.js?v=77.4.1'), name + ' loads accessibility runtime');
  ok(!/data-layout-mode="three"|data-wb-layout="three"/.test(text), name + ' omits three-panel controls');
  const scripts = [...text.matchAll(/<script\b([^>]*)\bsrc="[^"]+"([^>]*)>/g)];
  scripts.forEach(match => ok(/\bdefer(?:="")?\b|\basync(?:="")?\b/.test(match[0]), name + ' external scripts are deferred'));
}

console.log(`${checks - failures}/${checks} v72.17 accessibility/performance checks passed`);
if (failures) process.exit(1);
