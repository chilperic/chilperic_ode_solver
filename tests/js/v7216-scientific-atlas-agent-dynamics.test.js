'use strict';
const fs=require('fs');
const core=require('../../src/core/agent-reference.js');
const presets=require('../../src/models/agent-presets.js');
const modelIR=require('../../src/core/model-ir.js');
let checks=0;
function ok(condition,message){checks+=1;if(!condition)throw new Error(message);}
function close(a,b,tol,message){ok(Math.abs(a-b)<=tol,message+' ('+a+' vs '+b+')');}

ok(Object.keys(presets).length>=20,'Agent library must contain at least twenty curated examples');
['fadns_particle_baseline','fadns_coa_inhibition','cell_cycle_generations','forest_fire_spread'].forEach(function(name){
  ok(!!presets[name],name+' preset exists');
  const config=Object.assign({},presets[name],{size:12,steps:8,runs:3,recordEvery:2,snapshotCount:4,initialMode:'fractions'});
  const a=core.simulateEnsemble(config),b=core.simulateEnsemble(config);
  ok(a.representative.snapshots.length===4,name+' captures four representative snapshots');
  ok(a.ensemble.spatial.times.length===5,name+' exposes spatial metrics through time');
  ok(JSON.stringify(a.ensemble.mean)===JSON.stringify(b.ensemble.mean),name+' is deterministic for the same master seed');
  close(a.ensemble.spatial.occupiedFraction.mean[0],b.ensemble.spatial.occupiedFraction.mean[0],0,name+' spatial summary is deterministic');
});



Object.entries(presets).forEach(function(entry){
  const name=entry[0], preset=entry[1];
  const result=core.simulateEnsemble(Object.assign({},preset,{size:8,steps:4,runs:2,recordEvery:1,snapshotCount:3,initialMode:'fractions'}));
  ok(result.representative.initialCounts.reduce(function(a,b){return a+b;},0)===64,name+' initial counts conserve lattice population');
  ok(result.representative.finalCounts.reduce(function(a,b){return a+b;},0)===64,name+' final counts conserve lattice population');
  ok(result.representative.snapshots.length===3,name+' records the configured number of spatial snapshots');
  ok(result.ensemble.spatial.times.every(Number.isFinite),name+' spatial time grid is finite');
  ['agreement','diversity','occupiedFraction'].forEach(function(metric){
    ok(result.ensemble.spatial[metric].mean.every(Number.isFinite),name+' '+metric+' ensemble mean is finite');
  });
});

const lowered=modelIR.lower({schema:'foko.model-ir/1',kind:'reaction-network',name:'A to B',states:[{id:'A',initial:2},{id:'B',initial:0}],parameters:{k:{value:.5,min:.1,max:1}},reactions:[{id:'conversion',rate:'k*A',stoichiometry:{A:-1,B:1}}],time:{start:0,end:5,points:101}});
ok(lowered.module==='ode','Model IR lowers to ODE module');
ok(lowered.model.vars.join(',')==='A,B','Model IR preserves state order');
ok(lowered.model.eqs[0].includes('-(k*A)')||lowered.model.eqs[0].includes('-(k*A'.replace('(','')),'Model IR creates negative reactant contribution');
ok(lowered.model.eqs[1].includes('(k*A)'),'Model IR creates positive product contribution');

const workspace=fs.readFileSync('src/v72/agent-workspace.js','utf8');
const page=fs.readFileSync('agent.html','utf8');
const atlas=fs.readFileSync('src/models/scientific-example-catalog.js','utf8');
require('../../src/models/scientific-example-catalog.js');
const catalog=globalThis.FokoScientificExampleCatalog;
ok(workspace.includes("const SIDES = ['left', 'right']"),'Agent workspace uses two readable panels');
ok(workspace.includes("'spatial-dynamics'"),'Agent workspace includes dynamic spatial snapshots');
ok(workspace.includes("'spatial-metrics'"),'Agent workspace includes spatial metrics through time');
ok(!page.includes('thirdAgentPlot'),'Agent HTML removes the third plot card');
ok(page.includes('leftAgentPlotLegend')&&page.includes('rightAgentPlotLegend'),'Agent state labels have dedicated below-plot legends');
ok(page.includes('agentSnapshotCount'),'Agent exposes snapshot resolution');
ok(Array.isArray(catalog)&&catalog.length>=100,'Atlas exposes at least one hundred curated routes');
ok(new Set(catalog.map(function(item){return item.title;})).size===catalog.length,'Atlas titles are unique');
ok(atlas.includes('FADNS semi-mechanistic kinetics')&&atlas.includes('Fatty-acid metabolism bistability'),'Atlas exposes the creator’s fatty-acid models');
ok(atlas.includes('Research-derived')&&atlas.includes('Synthetic teaching'),'Atlas separates provenance classes');

console.log(`${checks}/${checks} v72.16 scientific-atlas and Agent-dynamics checks passed`);
