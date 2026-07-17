'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
let checks = 0, fails = 0;
function ok(cond, msg) { checks += 1; if (!cond) { fails += 1; console.error('FAIL:', msg); } else console.log('ok  :', msg); }
function text(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

global.FokoDataCore = require('../../src/core/data.js');
require('../../src/models/statistics-presets.js');
const statsPresets = global.FokoStatisticsPresets;
ok(Object.keys(statsPresets).length >= 22, 'Statistics has at least 22 curated examples');
ok(Object.values(statsPresets).filter(p => p.mode === 'pca').length >= 2, 'Statistics includes multiple PCA examples');
Object.values(statsPresets).filter(p => p.mode === 'pca').forEach(p => {
  const data = global.FokoDataCore.parseDataset(p.data, {delimiter:'auto', header:'auto'});
  ok(data.columns.filter(c => c.type === 'numeric').length >= 2, `${p.title}: PCA example has multiple numeric features`);
  ok(data.rows.length >= 12, `${p.title}: PCA example is not trivial`);
});

const nav = text('src/navigation.js');
const tokens = text('styles/v72-tokens.css');
ok(!nav.includes("label.textContent = '◑'"), 'theme picker no longer injects a wrapping decorative glyph');
ok(nav.includes("aria-label', 'Choose interface theme'"), 'theme picker has an explicit accessible label');
ok(tokens.includes('.theme-icon {\n  display: none;'), 'legacy theme glyph is suppressed');
ok(tokens.includes('white-space: nowrap'), 'theme picker cannot wrap into two rows');

const pca = text('src/core/pca.js');
const ml = text('src/v72/ml-workspace.js');
const stats = text('src/v72/statistics-workspace.js');
const sciml = text('src/sciml-lab.js');
const agent = text('src/v72/agent-workspace.js');
ok(pca.includes('root.FokoPCA'), 'shared PCA core exports a browser namespace');
ok(ml.includes("plots.concat(['pca','explained','loadings'])"), 'ML adds PCA diagnostics to compatible analyses');
ok(stats.includes("config.mode === 'pca'"), 'Statistics exposes a PCA computation branch');
ok(sciml.includes("kind!=='phase2d'||vars.length>=2") && sciml.includes("kind!=='phase3d'||vars.length>=3"), 'SciML filters dimension-incompatible phase plots');
ok(sciml.includes("pca_scores") && sciml.includes("PCA.compute"), 'SciML exposes computed trajectory PCA for multistate results');
ok(agent.includes('fallbackCanvas') && agent.includes('await PLOT.render') && agent.includes("PLOT.setState(host, 'fallback', false)") && !/Plotly\.(?:newPlot|react|purge|Plots\.resize)/.test(agent), 'Agent delegates Plotly lifecycle to the shared owner and retains a computed canvas fallback');
ok(agent.includes("$('agentTopStatus').textContent='Rendering'"), 'Agent does not claim computed display before rendering completes');
ok(agent.includes('runSerial'), 'Agent rejects stale overlapping runs');

['ml.html','statistics.html','sciml.html'].forEach(rel => ok(text(rel).includes('src/core/pca.js'), `${rel} loads the shared PCA core`));
ok(text('statistics.html').includes('<option value="pca">'), 'Statistics analysis selector includes PCA');

console.log(`\n${checks - fails}/${checks} checks passed`);
if (fails) process.exit(1);
