(function(){
  'use strict';
  function pre(inputs,outputs){ if(!Array.isArray(inputs)||inputs.length===0) throw new Error('empty inputs'); if(!Array.isArray(outputs)||outputs.length===0) throw new Error('empty outputs'); if(inputs.length!==outputs.length) throw new Error('inputs and outputs length mismatch'); }
  function powers(n,degree){ const out=[]; function rec(pos,left,row){ if(pos===n){ out.push(row.slice()); return; } for(let k=0;k<=left;k++){ row[pos]=k; rec(pos+1,left-k,row); } } rec(0,degree,Array(n).fill(0)); return out; }
  function phi(x,pows){ return pows.map(p=>p.reduce((s,e,i)=>s*Math.pow(x[i],e),1)); }
  function design(inputs,pows){ return inputs.map(x=>phi(x,pows)); }
  function solve(A,b){ const n=A.length; const M=A.map((row,i)=>row.slice().concat([b[i]])); for(let k=0;k<n;k++){ let piv=k; for(let i=k+1;i<n;i++) if(Math.abs(M[i][k])>Math.abs(M[piv][k])) piv=i; if(Math.abs(M[piv][k])<1e-14) throw new Error('surrogate linear solve singular'); [M[k],M[piv]]=[M[piv],M[k]]; const d=M[k][k]; for(let j=k;j<=n;j++) M[k][j]/=d; for(let i=0;i<n;i++) if(i!==k){ const f=M[i][k]; for(let j=k;j<=n;j++) M[i][j]-=f*M[k][j]; } } return M.map(r=>r[n]); }
  function fitOnce(inputs,outputs,degree,ridge){ const nInputs=inputs[0].length; const pows=powers(nInputs,degree); const X=design(inputs,pows); const p=pows.length; const H=Array.from({length:p},()=>Array(p).fill(0)); const g=Array(p).fill(0); for(let i=0;i<X.length;i++){ for(let a=0;a<p;a++){ g[a]+=X[i][a]*outputs[i]; for(let b=0;b<p;b++) H[a][b]+=X[i][a]*X[i][b]; } } for(let a=0;a<p;a++) H[a][a]+=ridge; return {coeffs:solve(H,g),degree,nInputs,powers:pows}; }
  function predict(model,x){ const v=phi(x,model.powers); return v.reduce((s,a,i)=>s+a*model.coeffs[i],0); }
  function rmse(vals){ return Math.sqrt(vals.reduce((s,v)=>s+v*v,0)/Math.max(1,vals.length)); }
  function fit(cfg){ pre(cfg.inputs,cfg.outputs); const degree=Math.max(0,Math.floor(cfg.degree==null?2:cfg.degree)); const ridge=cfg.ridge==null?1e-10:Number(cfg.ridge); const full=fitOnce(cfg.inputs,cfg.outputs,degree,ridge); const n=cfg.inputs.length; const folds=Math.min(5,n); const errs=[]; for(let f=0;f<folds;f++){ const trainIn=[],trainOut=[],testIn=[],testOut=[]; for(let i=0;i<n;i++){ if(i%folds===f){testIn.push(cfg.inputs[i]);testOut.push(cfg.outputs[i]);} else {trainIn.push(cfg.inputs[i]);trainOut.push(cfg.outputs[i]);} } if(trainIn.length && testIn.length){ const m=fitOnce(trainIn,trainOut,degree,ridge); testIn.forEach((x,i)=>errs.push(predict(m,x)-testOut[i])); } } full.cvError=Number.isFinite(rmse(errs))?rmse(errs):0; return full; }
  window.FokoSurrogate={fit,predict};
})();
try{ this.constructor.constructor('return this')().FokoSurrogate = window.FokoSurrogate; }catch(_e){}
