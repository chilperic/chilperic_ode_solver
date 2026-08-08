'use strict';
const assert=require('assert');
const Core=require('../../src/core/evolution-landscape.js');
let checks=0;function check(ok,message){checks+=1;assert.ok(ok,message);}
const landscape=Core.buildLandscape({type:'nk',length:6,k:2,landscapeSeed:7});
check(landscape.values.length===64,'NK landscape enumerates every genotype');
check(landscape.bestGenotype.length===6,'global optimum is explicit');
const a=Core.simulate({type:'additive',length:6,population:120,generations:80,selection:5,mutation:.02,seed:9,initialGenotype:'000000'});
const b=Core.simulate({type:'additive',length:6,population:120,generations:80,selection:5,mutation:.02,seed:9,initialGenotype:'000000'});
check(JSON.stringify(a.history)===JSON.stringify(b.history),'seeded evolution is reproducible');
check(a.history.length===81&&a.snapshots.length>2,'history and retained snapshots are plot ready');
check(a.finalCounts.reduce((x,y)=>x+y,0)===120,'population size is conserved');
check(a.history.every(row=>Number.isFinite(row.meanFitness)&&Number.isFinite(row.entropy)),'metrics remain finite');
const custom=Core.buildLandscape({type:'custom',length:2,customFitness:'00,0\n01,1\n10,2\n11,3'});
check(custom.bestGenotype==='11','custom fitness tables are accepted');
check(Core.presets.length>=12,'at least twelve landscape starters are exposed');
check(Core.presets.every(p=>p.family&&p.summary),'every starter carries catalogue modeling information');
assert.throws(()=>Core.simulate({type:'additive',length:12,population:2000,generations:1000}),/budget/);checks+=1;
console.log(`${checks}/${checks} evolution-landscape checks passed`);
