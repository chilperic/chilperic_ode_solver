/* v72.23 first-class stiffness evidence */
'use strict';
const ODE=require('../../src/core/ode.js');
let checks=0,fails=0;
function ok(value,message){checks++;if(!value){fails++;console.error('FAIL:',message);}else console.log('ok  :',message);}

(function diagonalTimescales(){
  const result=ODE.solveWithRhs({t0:0,t1:0.01,y0:[1,1],vars:['slow','fast'],method:'rk4',points:2001},(_t,y)=>[-y[0],-1e4*y[1]]);
  ok(result.diagnostics.localTimescaleRatio>9000,'local Jacobian ratio detects separated diagonal timescales');
  ok(/fixed-step explicit method/i.test(result.diagnostics.warning),'fixed-step method receives explicit unsafe-stiffness warning');
  ok(result.provenance.stiffnessEvidence.likelyStiff===true,'provenance records the stiffness evidence');
})();

(function nonstiffControl(){
  const result=ODE.solveWithRhs({t0:0,t1:2,y0:[1,0],method:'rk45',points:201},(_t,y)=>[y[1],-y[0]]);
  ok(result.diagnostics.stiffnessAssessment==='no strong local timescale separation detected','oscillator is not falsely classified as strongly separated');
})();

(function polynomialRootsKnownMatrix(){
  const coeff=ODE.characteristicPolynomial([[-1,0],[0,-100]]);
  const roots=ODE.polynomialRoots(coeff).roots.map(z=>z.re).sort((a,b)=>a-b);
  ok(Math.abs(roots[0]+100)<1e-6 && Math.abs(roots[1]+1)<1e-6,'characteristic-root diagnostic recovers known eigenvalues');
})();

console.log(`\n${checks-fails}/${checks} checks passed`); if(fails) process.exitCode=1;
