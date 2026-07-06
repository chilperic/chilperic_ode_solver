const assert = require('assert');
const Kit = require('../src/fokokit.js');
const stoch = require('../src/stochastic-advanced.js');
const fit = require('../src/dynamical-fitting.js');
const cont = require('../src/continuation-analysis.js');
const basin = require('../src/basin-analysis.js');

{
  const r1 = Kit.seededRandom(42), r2 = Kit.seededRandom(42);
  assert.strictEqual(r1(), r2());
  assert.throws(()=>Kit.requireSquare([[1,2,3]],'A'), /square/);
  assert(Kit.formatResult({b:2,a:1}).includes('a'));
}
{
  const path = stoch.tauLeap({
    state:[50],
    reactions:[{change:[1], propensity:()=>2}],
    t0:0,t1:1,tau:.1,seed:1
  });
  assert(path.length > 2);
  const sde = stoch.eulerMaruyama({state:[0],drift:()=>[1],diffusion:()=>[0],t1:1,dt:.1});
  assert(Math.abs(sde.at(-1).state[0]-1)<1e-9);
  const bands = stoch.quantileBands([[1,2,3],[2,3,4],[3,4,5]]);
  assert.strictEqual(bands.length, 3);
}
{
  const data = [0,1,2,3].map(t=>({t,y:2+3*t}));
  const model = (t,theta)=>theta[0]+theta[1]*t;
  const out = fit.levenbergMarquardt(model,data,[0,0],{maxIter:60});
  assert(Math.abs(out.theta[0]-2)<1e-3);
  assert(Math.abs(out.theta[1]-3)<1e-3);
  const ci = fit.parameterCI(model,data,out.theta);
  assert.strictEqual(ci.length,2);
}
{
  assert.strictEqual(cont.classifyEigen([{re:-1,im:0}],[{re:1,im:0}]), 'fold');
  const bm = basin.basinMap({nx:3,ny:3,simulate:x=>x,classify:x=>x[0]>0?'right':'left'});
  assert.strictEqual(bm.grid.length,3);
}

console.log('v71 platform foundation: ok');