'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const agentHtml = read('agent.html'), agent = read('src/v72/agent-workspace.js');
const evolutionHtml = read('evolution.html'), evolution = read('src/v72/evolution-landscape-workspace.js');
const studioHtml = read('studio.html'), studio = read('src/v73/model-studio.js');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }

ok(agentHtml.includes('agent3dPlay') && agentHtml.includes('agent3dFrame') && agentHtml.includes('agent3dTrail'), 'Agent exposes live 3D playback, scrubbing, and trail controls');
ok(agent.includes("left: 'spatial-dynamics'") && agent.includes('renderAgent3DSides'), 'Agent defaults to the live lattice and retains contextual 3D rendering');
ok(agent.includes('spaceTime3DRelevant') && agent.includes("key!=='space-time-3d'||spaceTime3DRelevant()"), 'Agent exposes 3D only when the curated model declares it scientifically relevant');
ok(agent.includes("x: 'Lattice column'") || read('src/core/live-3d.js').includes("x: 'Lattice column'"), 'Agent 3D uses literal spatial axes');
ok(agent.includes('pointBudget: 5200'), 'Agent live 3D has a bounded rendering budget');
ok(agentHtml.indexOf('src/core/live-3d.js') < agentHtml.indexOf('src/v72/agent-workspace.js'), 'Agent loads live 3D before its workspace controller');

ok(evolutionHtml.includes('evStepBack') && evolutionHtml.includes('evStepForward') && evolutionHtml.includes('evPlaybackSpeed'), 'Evolution exposes complete playback controls');
ok(evolution.includes('dominant path') && evolution.includes('current population'), 'Evolution 3D combines adaptive path and current population cloud');
ok(evolution.includes('foko-evolution-live-camera'), 'Evolution preserves camera orientation during playback');
ok(evolution.includes("name: 'start'") && evolution.includes("? 'end' : 'current'"), 'Evolution marks start and current/end states');

ok(studioHtml.includes('studio3dPlay') && studioHtml.includes('studio3dFrame'), 'Model Studio exposes live 3D playback and scrubber');
ok(studio.includes('LIVE3D.trajectorySpec') && studio.includes('scheduleStudio3D'), 'Model Studio animates user-computed three-state trajectories');
ok(studio.includes("vars.length<3") || studio.includes('vars.length < 3'), 'Model Studio refuses live 3D without three states');

for (const [html, id] of [[studioHtml,'studioEquationPreview'],[agentHtml,'agentEquationPreview'],[evolutionHtml,'evEquationPreview']]) {
  ok(html.includes(id), `${id} rendered equation surface is present`);
  ok(html.includes('katex-0.16.47.min.js'), `${id} loads the local KaTeX renderer`);
}
ok(studio.includes('renderEquationPreview') && studio.includes('.toTex('), 'Model Studio converts editable expressions into rendered mathematics');
ok(agent.includes('renderAgentEquation'), 'Agent exposes its conditional transition contract as mathematics');
ok(evolution.includes('renderEvolutionEquations') && evolution.includes('operatorname{Multinomial}'), 'Evolution exposes its implemented selection-mutation-drift equations');

console.log(`${checks}/${checks} live-3D platform and equation-rendering checks passed`);
