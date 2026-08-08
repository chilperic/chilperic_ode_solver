'use strict';
const assert=require('assert');
const N=require('../../src/core/numerical-inputs.js');
let count=0;
function ok(value,label){assert.ok(value,label);count+=1;console.log('ok  : '+label);}
function throws(fn,pattern,label){assert.throws(fn,pattern);count+=1;console.log('ok  : throws — '+label);}
const ode=N.validateOde({vars:['x'],eqs:['-k*x'],y0:[1],params:{k:[.2,.1,.5]},t0:0,t1:20,points:800,method:'rk45',rtol:'1e-6',atol:'1e-9',stepSize:'auto',initialStep:'auto',maxStep:'auto',safety:.9});
ok(ode.t1===20,'ODE time span is normalized');
ok(ode.rtol===1e-6 && ode.atol===1e-9,'ODE tolerances are numeric');
ok(ode.paramDefs.k[0]===.2 && ode.paramDefs.k[1]===.1 && ode.paramDefs.k[2]===.5,'parameter value and range are preserved');
const restoredShapes=N.validateOde({...ode,params:{k:{value:.3,min:.1,max:.7}},paramDefs:{k:{value:.3,min:.1,max:.7}}});
ok(restoredShapes.params.k===.3 && restoredShapes.paramDefs.k[2]===.7,'restored object-shaped parameters are normalized');
throws(()=>N.validateOde({...ode,t0:5,t1:5}),/end must be greater/,'equal ODE time endpoints are rejected');
throws(()=>N.validateOde({...ode,method:'bdf'}),/export-only/,'browser run rejects export-only BDF');
throws(()=>N.validateOde({...ode,rtol:0}),/greater than zero/,'zero relative tolerance is rejected');
throws(()=>N.validateOde({...ode,y0:[Infinity]}),/finite/,'non-finite initial conditions are rejected');
throws(()=>N.validateOde({...ode,paramDefs:{k:[.2,.5,.1]},params:{k:.2}}),/maximum must be greater/,'reversed parameter range is rejected');
const stochastic=N.validateStochastic({t0:0,t1:10,points:200,runs:20,seed:1,maxEvents:10000});
ok(stochastic.warnings.some(w=>w.code==='small-ensemble'),'small stochastic ensemble is disclosed');
const optimization=N.validateOptimization({iterations:100,population:20,starts:4,seed:2,feasibilityTolerance:1e-6,stepTolerance:1e-8,penalty:100});
ok(optimization.iterations===100,'optimization numerical controls are validated');
const sensitivity=N.validateSensitivity({method:'sobol',relativeStep:1e-3,samples:64,trajectories:12,levels:6,seed:3});
ok(sensitivity.warnings.some(w=>w.code==='low-sobol-samples'),'low Sobol sample count is disclosed');
const localAdvanced=N.validateSensitivity({method:'local',relativeStep:1e-3,ofatPoints:9,directionPoints:9,directionalSpan:.25,responseSurface:true,surfacePoints:7,parameterCount:3,stateCount:2,outputPoints:120});
ok(localAdvanced.expectedEvaluations===110,'local advanced budget includes OFAT, directional profile and response surface');
ok(localAdvanced.capacity.responseSurface===true,'response-surface capacity state is preserved');
throws(()=>N.validateSensitivity({method:'local',ofatPoints:4,parameterCount:2,stateCount:1,outputPoints:20}),/at least 5/,'OFAT point count below safe minimum is rejected');
throws(()=>N.validateSensitivity({method:'sobol',dependence:true,dependencePermutations:10,parameterCount:2,stateCount:1,outputPoints:20}),/at least 19/,'dependence permutation count below safe minimum is rejected');

const advanced=N.validateSensitivity({method:'sobol',samples:512,secondOrder:true,bootstrapReplicates:200,parameterCount:4,stateCount:3,outputPoints:200});
ok(advanced.expectedEvaluations===512*(2*4+2),'second-order sensitivity budget includes both mixed-matrix directions');
ok(!advanced.capacity.blocked,'moderate second-order model remains inside browser envelope');
const globalSurface=N.validateSensitivity({method:'sobol',samples:128,secondOrder:false,responseSurface:true,surfacePoints:7,parameterCount:3,stateCount:2,outputPoints:100});
ok(globalSurface.expectedEvaluations===128*5+49,'global response surface is charged to the guarded ODE budget');
ok(globalSurface.capacity.responseSurface===true,'global response-surface capacity state is preserved');
const tooLarge=N.validateSensitivity({method:'sobol',samples:4096,secondOrder:true,bootstrapReplicates:200,parameterCount:12,stateCount:20,outputPoints:2000});
ok(tooLarge.capacity.blocked,'oversized global sensitivity request is blocked before a worker starts');
ok(/too large for reliable in-browser/i.test(tooLarge.capacity.message),'blocked capacity returns an explicit browser limitation message');

console.log(`\n${count}/${count} checks passed`);
