'use strict';
const assert = require('assert');
require('../../src/core/live-3d.js');
const Live3D = globalThis.FokoLive3D;
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }

ok(Boolean(Live3D), 'live 3D core exports a browser/global API');
ok(Live3D.clampIndex(99, 4) === 3 && Live3D.clampIndex(-4, 4) === 0, 'frame indexes are bounded');
ok(Live3D.pointStride(80, 20, 5200) > 1, 'large Agent displays are decimated');
ok(Live3D.pointStride(8, 2, 5200) === 1, 'small Agent displays retain every site');

function frame(step, grid) { return { step, totalSteps: 10, grid, counts: [grid.filter(x => x === 0).length, grid.filter(x => x === 1).length] }; }
const frames = [
  frame(0, [0, 0, 1, 1, 0, 1, 0, 1, 0]),
  frame(5, [0, 1, 1, 1, 0, 0, 0, 1, 1]),
  frame(10, [1, 1, 1, 0, 0, 0, 1, 1, 1])
];
const agent = Live3D.agentSpaceTimeSpec({ frames, size: 3, states: ['empty', 'active'], colors: ['#eee', '#f00'], emptyState: 0, index: 2, trailFrames: 3 });
ok(agent.traces.some(trace => trace.type === 'mesh3d'), 'Agent 3D includes an explicit current-time slice');
ok(agent.traces.some(trace => trace.name === 'active · current'), 'Agent 3D includes the current population cloud');
ok(agent.traces.some(trace => trace.name === 'active centroid path'), 'Agent 3D includes a state centroid trail');
ok(agent.layout.scene.xaxis.title === 'Lattice column' && agent.layout.scene.zaxis.title === 'Algorithmic step', 'Agent axes have literal scientific meanings');
ok(agent.layout.uirevision === 'foko-agent-space-time-camera', 'Agent camera is preserved across live frames');
ok(agent.metadata.currentStep === 10 && agent.metadata.displayedFrames === 3, 'Agent frame metadata is explicit');

const trajectory = Live3D.trajectorySpec({ t: [0, 1, 2, 3], y: [[0, 1, 2, 3], [2, 2, 1, 0], [1, 2, 4, 8]], names: ['x', 'y', 'z'], index: 2 });
ok(trajectory.traces[0].x.length === 3, 'Studio 3D reveals only the selected trajectory prefix');
ok(trajectory.traces.some(trace => trace.name === 'start') && trajectory.traces.some(trace => trace.name === 'current'), 'Studio 3D marks start and current positions');
ok(trajectory.layout.scene.zaxis.title === 'z', 'Studio 3D preserves declared state-axis names');
ok(trajectory.layout.uirevision === 'foko-model-studio-trajectory-camera', 'Studio camera is preserved during playback');

assert.throws(() => Live3D.trajectorySpec({ t: [0], y: [[0], [0]] }), /three computed states/); checks += 1;
assert.throws(() => Live3D.agentSpaceTimeSpec({ frames: [] }), /At least one/); checks += 1;
console.log(`${checks}/${checks} live-3D scientific view checks passed`);
