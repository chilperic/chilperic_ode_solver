/* v72.24 SciPy comparison core tests */
'use strict'; const V=require('../../src/core/scipy-verification.js'); let n=0,f=0; function ok(x,m){n++;if(!x){f++;console.error('FAIL:',m)}else console.log('ok  :',m)}
const browser={T:[0,1,2],Y:[[1,2,3],[0,1,0]],vars:['x','y'],diagnostics:{rtol:1e-6,atol:1e-9},provenance:{stiffnessEvidence:{likelyStiff:false}}};
let c=V.compareTrajectories(browser,{T:[0,1,2],Y:[[1,2,3],[0,1,0]]},{rtol:1e-6,atol:1e-9}); ok(c.verdict==='agreement'&&c.maxScaledDeviation===0,'identical trajectories agree');
c=V.compareTrajectories(browser,{T:[0,1,2],Y:[[1,2.2,3],[0,1,0]]},{rtol:1e-6,atol:1e-9}); ok(c.verdict==='disagreement'&&c.time===1&&c.stateName==='x','material deviation is localized and rejected');
ok(V.chooseReferenceMethod(browser)==='DOP853','nonstiff result uses DOP853 referee');
browser.provenance.stiffnessEvidence.likelyStiff=true; ok(V.chooseReferenceMethod(browser)==='Radau','stiffness evidence selects Radau referee');
console.log(`\n${n-f}/${n} checks passed`);if(f)process.exitCode=1;
