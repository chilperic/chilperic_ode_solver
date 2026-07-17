'use strict';
const assert = require('assert');
const S = require('../../src/core/sensitivity.js');
const ODE = require('../../src/core/ode.js');
let checks = 0;
function ok(condition, message){ assert.ok(condition, message); checks += 1; console.log('ok  : '+message); }
function near(actual, expected, tolerance, message){ assert.ok(Math.abs(actual-expected)<=tolerance, `${message}: got ${actual}, expected ${expected}`); checks += 1; console.log('ok  : '+message); }

const parameters = {a:[2,0,4], b:[3,0,6]};
const linear = p => 2*p.a + 3*p.b;
const local = S.localFiniteDifference({parameters, evaluate:linear, relativeStep:1e-4});
near(local.rows.find(r=>r.name==='a').derivative, 2, 1e-8, 'local derivative for a');
near(local.rows.find(r=>r.name==='b').derivative, 3, 1e-8, 'local derivative for b');
near(local.rows.find(r=>r.name==='a').rangeScaled, 8, 1e-8, 'range-scaled local derivative for a');
ok(local.evaluations===5, 'local analysis reports exact scalar evaluation count');


const ofat = S.ofat({parameters, evaluate:linear, points:7});
ok(ofat.rows.length===2 && ofat.rows.every(row=>row.values.length===7), 'OFAT returns one bounded response curve per parameter');
near(ofat.rows.find(row=>row.name==='a').highChange,4,1e-10,'OFAT endpoint change for a');
const directional = S.directionalProfile({parameters, evaluate:linear, direction:{a:1,b:0}, points:9, span:0.2});
near(directional.derivative,8,1e-8,'range-normalized directional derivative follows the declared direction');
const surface = S.responseSurface({parameters, evaluate:p=>p.a*p.b, first:'a', second:'b', points:5});
ok(surface.z.length===5 && surface.z.every(row=>row.length===5),'bounded two-parameter response surface has the requested grid');
const dependentRows=Array.from({length:64},(_,i)=>({a:i/63,b:(i*17%64)/63,output:i/63}));
const dependence=S.dependenceDiagnostics(dependentRows,['a','b'],{permutations:19,bins:6,seed:4});
ok(dependence.rows.find(row=>row.name==='a').mutualInformation>dependence.rows.find(row=>row.name==='b').mutualInformation,'limited MI screening ranks the directly related parameter higher');
ok(dependence.rows.every(row=>row.mutualInformationP>0&&row.mutualInformationP<=1&&row.hsicP>0&&row.hsicP<=1),'dependence screening reports bounded permutation p-values');

const morris = S.morris({parameters, evaluate:linear, trajectories:20, levels:6, seed:7});
near(morris.rows.find(r=>r.name==='a').muStar, 8, 1e-10, 'Morris normalized-domain mu* for a');
near(morris.rows.find(r=>r.name==='b').muStar, 18, 1e-10, 'Morris normalized-domain mu* for b');
ok(morris.rows.every(r=>r.sigma<1e-9), 'linear Morris effects have negligible spread');
ok(morris.evaluations===20*3, 'Morris evaluation budget is trajectories times p+1');

const sobol = S.sobolJansen({parameters, evaluate:linear, samples:4096, seed:11});
const a = sobol.rows.find(r=>r.name==='a');
const b = sobol.rows.find(r=>r.name==='b');
// Variance contributions: 4*Var(U[0,4])=16/3; 9*Var(U[0,6])=27.
near(a.first, (16/3)/((16/3)+27), 0.05, 'Jansen first-order index for a');
near(b.first, 27/((16/3)+27), 0.05, 'Jansen first-order index for b');
near(a.total, a.first, 0.06, 'Jansen total approximately first for additive model a');
near(b.total, b.first, 0.06, 'Jansen total approximately first for additive model b');
ok(sobol.convergence.at(-1).samples===4096, 'Jansen convergence includes the requested sample size');
ok(sobol.rows.every(r=>Number.isFinite(r.firstSe)&&Number.isFinite(r.totalSe)), 'Jansen rows report rough Monte Carlo standard errors');
ok(sobol.sampleRows.length<=256 && sobol.sampleRows.every(row=>Number.isFinite(row.__output)), 'Jansen analysis retains a bounded sample subset for relationship diagnostics');
ok(Number.isFinite(sobol.varianceContribution.firstOrder) && Number.isFinite(sobol.varianceContribution.unresolved), 'variance-contribution accounting remains explicit');
let observed=0; S.sobolJansen({parameters,evaluate:linear,samples:32,seed:3,sampleObserver:()=>{observed+=1;}}); ok(observed===32*4,'Sobol sample observer receives A, B and every A_B evaluation');


const interaction = S.sobolJansen({parameters:{a:[0,-1,1],b:[0,-1,1]}, evaluate:p=>p.a*p.b, samples:8192, seed:42, secondOrder:true, bootstrapReplicates:120});
const ia = interaction.rows.find(r=>r.name==='a');
const ib = interaction.rows.find(r=>r.name==='b');
near(ia.first,0,0.08,'pure interaction has near-zero first-order index for a');
near(ib.first,0,0.08,'pure interaction has near-zero first-order index for b');
near(ia.total,1,0.08,'pure interaction has total-order index near one for a');
near(ib.total,1,0.08,'pure interaction has total-order index near one for b');
near(interaction.secondOrder[0].value,1,0.12,'Saltelli second-order estimator recovers the pure a×b interaction');
ok(interaction.secondOrderMatrix.length===2 && interaction.secondOrderMatrix[0].length===2,'second-order matrix has parameter dimensions');
ok(interaction.rows.every(r=>Number.isFinite(r.firstLow)&&Number.isFinite(r.totalHigh)),'bootstrap intervals are retained for first and total indices');
ok(interaction.rows.every(r=>Number.isFinite(r.medianRank)&&Number.isFinite(r.topProbability)),'bootstrap rank stability is retained');
ok(S.estimateEvaluations('sobol',3,{samples:128,secondOrder:true})===1024,'second-order global budget is N(2p+2)');

const fim = S.fim({parameters, evaluateVector:p=>[p.a+p.b, 2*p.a-p.b], relativeStep:1e-5, sigma:1});
ok(fim.matrix.length===2 && fim.matrix[0].length===2, 'scaled information matrix has parameter dimension');
ok(fim.rawMatrix.length===2, 'raw information matrix is retained for export');
ok(fim.eigenvalues.every(Number.isFinite), 'information eigenvalues are finite');
ok(fim.rank===2, 'full-rank reference information matrix is detected');
ok(fim.condition>=1, 'information condition number is bounded below by one');
ok(fim.alignment.every(row=>row.every(v=>v>=-1.0000001&&v<=1.0000001)), 'sensitivity-column alignment is normalized');

// End-to-end ODE derivative: x(t)=exp(-k t), d x(T)/d k = -T exp(-kT).
const T=4, k=0.3;
function odeFinal(params){
  const result=ODE.solveWithRhs({vars:['x'],y0:[1],params,t0:0,t1:T,points:100,method:'rk45',rtol:1e-9,atol:1e-12,maxStep:'auto',initialStep:'auto',stepSize:'auto',safety:0.9}, (t,y,p)=>[-p.k*y[0]]);
  return result.Y[0].at(-1);
}
const odeLocal=S.localFiniteDifference({parameters:{k:[k,0.1,0.8]},evaluate:odeFinal,relativeStep:1e-4});
near(odeLocal.rows[0].derivative,-T*Math.exp(-k*T),2e-5,'ODE finite-difference sensitivity matches analytic exponential derivative');

ok(S.estimateEvaluations('local',3,{})===61,'local ODE-solve budget includes convergence, OFAT and directional diagnostics');
ok(S.estimateEvaluations('local',3,{responseSurface:true,surfacePoints:7})===110,'optional response surface is included in the local browser budget');
ok(S.estimateEvaluations('sobol',3,{samples:128})===640,'Jansen ODE-solve budget is N(p+2)');
assert.throws(()=>S.localFiniteDifference({parameters:{a:[1,1,1]}, evaluate:p=>p.a}), /non-zero/, 'zero parameter range rejected'); checks += 1; console.log('ok  : zero parameter range rejected');
assert.throws(()=>S.localFiniteDifference({parameters:{a:[2,0,1]}, evaluate:p=>p.a}), /inside/, 'current value outside sensitivity range rejected'); checks += 1; console.log('ok  : current value outside range rejected');
assert.throws(()=>S.morris({parameters, evaluate:linear, trajectories:4, levels:5}), /even/, 'odd Morris level count rejected'); checks += 1; console.log('ok  : odd Morris level count rejected');
assert.throws(()=>S.sobolJansen({parameters, evaluate:()=>1, samples:32}), /variance/, 'zero-output variance rejected'); checks += 1; console.log('ok  : zero-output variance rejected');
console.log(`\n${checks}/${checks} checks passed`);
