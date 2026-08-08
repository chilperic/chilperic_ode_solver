'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const pages = [
  ...fs.readdirSync(ROOT).filter(name => name.endsWith('.html')).map(name => name),
  ...fs.readdirSync(path.join(ROOT, 'research')).filter(name => name.endsWith('.html')).map(name => `research/${name}`)
];
let count = 0;
function ok(value, label) {
  assert.ok(value, label);
  count += 1;
}

ok(pages.length === 36, `expected 36 authored pages, found ${pages.length}`);
for (const page of pages) {
  const html = read(page);
  const prefix = page.startsWith('research/') ? '../' : '';
  ok(html.includes('data-v76-appbar="true"'), `${page} has a stable shell mount`);
  ok(html.includes(`${prefix}styles/v76-system.css?v=77.4.1`), `${page} loads the central visual system`);
  ok(html.includes(`${prefix}src/v76/app-shell.js?v=77.4.1`), `${page} loads the central application shell`);
  ok(!html.includes('data-nav-menu='), `${page} does not duplicate navigation markup`);
  ok(!/\sdata-version=/.test(html), `${page} does not display product-version metadata`);
}

const shell = read('src/v76/app-shell.js');
const css = read('styles/v76-system.css');
const home = read('index.html');
const homeRuntime = read('src/v76/home-workspace.js');

for (const route of [
  'studio.html?new=1', 'ode.html?module=ode', 'stochastic.html', 'steady.html',
  'bifurcation.html', 'agent.html', 'population-genetics.html', 'evolution.html',
  'sensitivity.html', 'optimization.html', 'advanced-methods.html', 'ai-modeling.html',
  'examples.html', 'trust.html', 'cv.html'
]) ok(shell.includes(route), `central shell exposes ${route}`);

ok(shell.includes("doc.body.appendChild(portal)"), 'menus are portaled outside page layout');
ok(shell.includes('boundedPopoverGeometry'), 'popover rendering and positioning use one bounded geometry function');
ok(shell.includes("setMobile(open)"), 'mobile navigation has explicit state ownership');
ok(shell.includes("setCommand(open)"), 'command search has explicit state ownership');
ok(shell.includes("ROOT_PREFIX"), 'nested research routes resolve through the platform root');
ok(!shell.includes('pointerenter'), 'navigation is not hover activated');

for (const token of ['#17232d', '#243c86', '#5b4fc0', '#2b5fa8', '#c98a19', '#f8f6ee', '#d8dde3']) {
  ok(css.includes(token), `visual system includes brand token ${token}`);
}
ok(css.includes('@media (max-width: 720px)'), 'phone breakpoint is authored');
ok(css.includes('.v76-bottom-nav'), 'phone bottom navigation is authored');
ok(css.includes('prefers-reduced-motion'), 'reduced motion is supported');
ok(css.includes('forced-colors'), 'forced colors are supported');
ok(/minmax\(0,\s*1fr\)/.test(css), 'workspace grids are shrink-safe');
ok(!/transition\s*:[^;]*visibility/i.test(css), 'menu visibility changes immediately for hit testing and keyboard focus');

ok(home.includes('From model definition to'), 'home leads with a modeling-to-evidence workflow');
ok(home.includes('Change parameters, initial conditions, time spans, outputs, and numerical methods'), 'home states editable scientific inputs');
ok(home.includes('Start with the system, not a menu of methods.'), 'home routes by model structure');
ok(home.includes('id="v76HomeRun"'), 'home provides a real editable experiment');
ok(home.includes('katex-0.16.47.min.js'), 'home loads offline LaTeX rendering');
ok(homeRuntime.includes('FokoODECore.solveWithRhs'), 'home preview uses the canonical ODE engine');
ok(homeRuntime.includes('data-render-state'), 'home plot exposes render evidence');

console.log(`${count}/${count} v76 product-shell checks passed across ${pages.length} pages`);
