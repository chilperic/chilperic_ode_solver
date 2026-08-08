'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const shell = fs.readFileSync(path.join(ROOT, 'src/v76/app-shell.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'styles/v76-system.css'), 'utf8');
const studio = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');
const ode = fs.readFileSync(path.join(ROOT, 'ode.html'), 'utf8');
const odeRuntime = fs.readFileSync(path.join(ROOT, 'src/app.js'), 'utf8');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }

for (const token of ['role', 'separator', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-controls']) ok(shell.includes(token), `workspace splitter exposes ${token}`);
ok(shell.includes("event.key === 'ArrowLeft'") && shell.includes("event.key === 'ArrowRight'"), 'splitter supports keyboard resizing');
ok(shell.includes('localStorage.setItem(key'), 'panel width persists per laboratory');
ok(shell.includes('FokoPlotLifecycle.resize'), 'plot geometry is notified after panel resizing');
ok(!shell.includes("node.textContent = 'Start'") && !shell.includes("atlasJump.textContent = 'Templates'"), 'authored Examples and Atlas rail labels are preserved');
ok(css.includes('grid-area: splitter') && css.includes('--v76-input-width'), 'scientific grid reserves a real splitter track');
ok(css.includes('@media (max-width: 900px)') && css.includes('.v76-workspace-splitter'), 'splitter is removed from narrow task layouts');
ok(/\.side-nav\s*\{[^}]*display:\s*grid !important;[^}]*width:\s*64px !important;/s.test(css), 'desktop laboratory rail is an explicit 64px vertical grid');
ok(/\.side-nav \.nav-item\s*\{[^}]*min-height:\s*78px !important;[^}]*writing-mode:\s*vertical-rl !important;[^}]*transform:\s*rotate\(180deg\) !important;/s.test(css), 'desktop laboratory controls retain readable vertical labels');
ok(/\.side-nav \.nav-item\.active\s*\{[^}]*#fff[^}]*var\(--lab-accent\)/s.test(css), 'active rail control uses the current laboratory identity');

const labIds = [
  'studio', 'ode', 'stochastic', 'steady', 'bifurcation', 'agent',
  'population-genetics', 'evolution', 'sensitivity', 'optimization',
  'fitting', 'statistics', 'advanced-methods', 'ai-modeling', 'sciml',
  'ml', 'linalg', 'networks', 'symbolic', 'workbench'
];
const accentColours = [];
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a, b) {
  const light = Math.max(luminance(a), luminance(b));
  const dark = Math.min(luminance(a), luminance(b));
  return (light + 0.05) / (dark + 0.05);
}
for (const labId of labIds) {
  const rule = css.match(new RegExp(`body\\[data-lab="${labId}"\\][^{]*\\{[^}]*--lab-accent:\\s*(#[0-9a-f]{6});[^}]*--lab-accent-soft:\\s*(#[0-9a-f]{6})`, 'i'));
  ok(rule, `${labId} defines its own laboratory colour`);
  accentColours.push(rule[1].toLowerCase());
  ok(contrast(rule[1], '#ffffff') >= 4.5, `${labId} accent passes WCAG AA on white`);
  ok(contrast(rule[1], rule[2]) >= 4.5, `${labId} active rail state passes WCAG AA`);
}
ok(new Set(accentColours).size === labIds.length, 'all scientific laboratories have distinct accents');
for (const subject of ['model-engineering','dynamical-systems','populations-evolution','inference-uncertainty','scientific-intelligence','mathematical-structure']) {
  ok(css.includes(`body[data-subject="${subject}"]`) && shell.includes(`'${subject}'`), `${subject} has matching CSS and shell taxonomy`);
}
ok(shell.includes('adaptiveBrandMarkup') && shell.includes('foko-brand-observe-top') && shell.includes('foko-brand-manifold') && shell.includes('foko-brand-observe-mid') && shell.includes('foko-brand-observe-bottom') && shell.includes('foko-brand-state-axis'), 'adaptive State Observatory keeps scientific layers while subject and lab accents remain separate');
ok(shell.includes('data-lab-target') && shell.includes('data-subject-target'), 'navigation items carry both identity levels');
for (const id of ['studioImportFormat','studioImportText','studioParseImport','studioImportStatus']) ok(studio.includes(`id="${id}"`), `Model Studio exposes ${id}`);
for (const extension of ['.ode','.json','.py','.yaml','.csv','.sbml','.cellml','.sedml','.omex']) ok(studio.includes(extension), `Model Studio recognizes ${extension}`);
ok(studio.includes('src/core/model-import.js'), 'Model Studio loads the shared interchange core');
ok(ode.includes('src/core/model-import.js'), 'ODE Lab loads the same interchange core as Model Studio');
ok(odeRuntime.includes('window.FokoModelImport.parse(text,name)'), 'ODE Lab routes deterministic formats through the shared parser');
ok(!odeRuntime.includes('Results may be incomplete'), 'ODE import never continues after known unsupported SBML semantics');
console.log(`${checks}/${checks} workspace-sizing and Studio-input checks passed`);
