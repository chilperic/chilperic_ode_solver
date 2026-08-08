'use strict';
const fs = require('fs');
const path = require('path');
const ODE = require('../../src/core/ode.js');
const Models = require('../../src/models/home-research-models.js');

let checks = 0;
function check(condition, message) { checks += 1; if (!condition) throw new Error(message); }

(function liveResearchModelRemainsCoreComputed() {
  const fatty = Models.fattyAcidMetabolism;
  const result = ODE.solveWithRhs(Object.assign({}, fatty.config, { params: fatty.parameters }), fatty.rhs);
  check(result.ok, 'home research result is computed by FokoODECore');
  check(result.Y.length === 4, 'home research result exposes four declared states');
  check(result.Y.every(row => row.every(Number.isFinite)), 'home research result is finite');
  check(result.diagnostics.accepted > 0, 'home research result exposes genuine adaptive-step work');
})();

(function projectFirstHomeUsesTheCanonicalEngine() {
  const home = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  const workspace = fs.readFileSync(path.join(__dirname, '../../src/v76/home-workspace.js'), 'utf8');
  check(home.includes('id="v76HomeRun"'), 'home has an editable experiment control');
  check(home.includes('id="v76HomeRate"') && home.includes('id="v76HomeCapacity"') && home.includes('id="v76HomeInitial"'), 'home exposes editable model inputs');
  check(home.includes('src/home-live-research.js'), 'home loads the research computation');
  check(!home.includes('src/home-demo-reel.js'), 'home does not execute the retired example carousel');
  check(workspace.includes('FokoODECore.solveWithRhs'), 'home experiment calls the canonical deterministic engine');
  check(workspace.includes("if (!result.ok || !result.Y[0].every(Number.isFinite))"), 'home experiment rejects a non-finite trajectory');
  check(workspace.includes("dataset.engine = 'FokoODECore'"), 'home result exposes its engine provenance');
})();

(function homeVisualsAreComputedOrClearlyStatic() {
  const workspace = fs.readFileSync(path.join(__dirname, '../../src/v76/home-workspace.js'), 'utf8');
  ['Math.random(', 'Math.sin(', 'hardcodedSeries', 'cachedTrajectory'].forEach(token => {
    check(!workspace.includes(token), 'home computation excludes decorative generator ' + token);
  });
})();

console.log(`home-demo-reel.test.js: ${checks} assertions passed`);
