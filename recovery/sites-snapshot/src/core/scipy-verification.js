/* Foko Lab v72.24 SciPy verification comparison core. */
(function(root){
  'use strict';
  function assert(cond,msg){if(!cond)throw new Error(msg);}
  function chooseReferenceMethod(browserResult){
    const evidence=browserResult&&browserResult.provenance&&browserResult.provenance.stiffnessEvidence;
    return evidence&&evidence.likelyStiff?'Radau':'DOP853';
  }
  function comparisonScale(reference,browser,rtol,atol){return atol+rtol*Math.max(Math.abs(reference),Math.abs(browser));}
  function compareTrajectories(browserResult,referenceResult,options){
    const opts=Object.assign({rtol:1e-6,atol:1e-9,agreementScaled:5,cautionScaled:50},options||{});
    assert(browserResult&&Array.isArray(browserResult.T)&&Array.isArray(browserResult.Y),'browser result is required');
    assert(referenceResult&&Array.isArray(referenceResult.T)&&Array.isArray(referenceResult.Y),'reference result is required');
    assert(browserResult.T.length===referenceResult.T.length,'reference time grid must match browser time grid');
    assert(browserResult.Y.length===referenceResult.Y.length,'reference state dimension must match browser result');
    let maxAbs=0,maxRelative=0,maxScaled=0,maxState=0,maxIndex=0;
    for(let state=0;state<browserResult.Y.length;state++){
      assert(browserResult.Y[state].length===referenceResult.Y[state].length,'reference trajectory length mismatch');
      for(let i=0;i<browserResult.T.length;i++){
        const a=Number(browserResult.Y[state][i]),b=Number(referenceResult.Y[state][i]);
        assert(Number.isFinite(a)&&Number.isFinite(b),'comparison received a non-finite value');
        const abs=Math.abs(a-b);
        const rel=abs/Math.max(1e-12,Math.abs(b));
        const scaled=abs/comparisonScale(b,a,opts.rtol,opts.atol);
        if(scaled>maxScaled){maxScaled=scaled;maxAbs=abs;maxRelative=rel;maxState=state;maxIndex=i;}
      }
    }
    const verdict=maxScaled<=opts.agreementScaled?'agreement':maxScaled<=opts.cautionScaled?'caution':'disagreement';
    const labels={agreement:'Agreement confirmed at the requested numerical scale.',caution:'Partial agreement only; inspect the maximum deviation and tighten tolerances.',disagreement:'Browser and SciPy trajectories disagree materially. Do not use the browser trajectory as evidence.'};
    return {verdict,label:labels[verdict],maxAbsoluteDeviation:maxAbs,maxRelativeDeviation:maxRelative,maxScaledDeviation:maxScaled,stateIndex:maxState,stateName:(browserResult.vars||[])[maxState]||`x${maxState+1}`,timeIndex:maxIndex,time:browserResult.T[maxIndex],thresholds:{agreementScaled:opts.agreementScaled,cautionScaled:opts.cautionScaled},metric:'|browser-reference| / (atol + rtol*max(|browser|,|reference|))'};
  }
  const api={chooseReferenceMethod,compareTrajectories};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.FokoSciPyVerificationCore=api;
})(typeof self!=='undefined'?self:globalThis);
