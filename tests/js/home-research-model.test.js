'use strict';
const ODE = require('../../src/core/ode.js');
const Models = require('../../src/models/home-research-models.js');
let checks = 0;
function truthy(value, message) { checks += 1; if (!value) throw new Error(message); console.log('ok  :', message); }
const model = Models.fattyAcidMetabolism;
const result = ODE.solveWithRhs(Object.assign({}, model.config, { params: model.parameters }), model.rhs);
truthy(result.ok, 'home research model is genuinely solved by FokoODECore');
truthy(result.provenance.engine === 'FokoODECore', 'home result records the canonical engine');
truthy(result.T.length === model.config.points, 'home result uses the declared output grid');
truthy(result.Y.length === 4 && result.Y.every(row => row.every(Number.isFinite)), 'home result contains four finite research-model trajectories');
truthy(result.diagnostics.accepted > 0 && result.diagnostics.functionEvaluations > 0, 'home diagnostics report real numerical work');
truthy(Math.max(...result.Y.flat()) < 1e4, 'home research model remains bounded over the public demonstration horizon');
console.log(`\n${checks}/${checks} checks passed`);
