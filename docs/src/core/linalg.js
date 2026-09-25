(function(root){'use strict';
const FokoKit = root.FokoKit || (typeof require==='function' ? require('../fokokit.js') : null);
// --- precondition guards (consistent across all Foko engines) ---
function requireMatrix(A,name){return FokoKit?FokoKit.requireMatrix(A,name):A;}
function requireSquare(A,name){return FokoKit?FokoKit.requireSquare(A,name):A;}
function requireVector(v,name){return FokoKit?FokoKit.requireVector(v,name):v;}

function parseMatrix(text){return String(text||'').trim().split(/\n+/).map(r=>r.trim().split(/[\s,;]+/).map(Number).filter(Number.isFinite)).filter(r=>r.length);} 
function parseVector(text){return String(text||'').split(/[\s,;]+/).map(Number).filter(Number.isFinite);} 
function transpose(A){return A[0].map((_,j)=>A.map(r=>r[j]));}
function matmul(A,B){const Bt=transpose(B);return A.map(r=>Bt.map(c=>r.reduce((s,v,i)=>s+v*(c[i]||0),0)));}
function matvec(A,v){return A.map(r=>r.reduce((s,a,i)=>s+a*(v[i]||0),0));}
function identity(n){return Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0));}
function determinant(A){requireSquare(A,'determinant');A=A.map(r=>r.slice());const n=A.length;let det=1;for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(A[i][k])>Math.abs(A[p][k]))p=i;if(Math.abs(A[p][k])<1e-12)return 0;if(p!==k){[A[k],A[p]]=[A[p],A[k]];det*=-1;}det*=A[k][k];const piv=A[k][k];for(let i=k+1;i<n;i++){const f=A[i][k]/piv;for(let j=k;j<n;j++)A[i][j]-=f*A[k][j];}}return det;}
function solve(A,b){requireSquare(A,'solve');requireVector(b,'solve');if(b.length!==A.length)throw new Error('solve: b length must equal rows of A');A=A.map(r=>r.slice());b=b.slice();const n=A.length;for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(A[i][k])>Math.abs(A[p][k]))p=i;[A[k],A[p]]=[A[p],A[k]];[b[k],b[p]]=[b[p],b[k]];const piv=Math.abs(A[k][k])<1e-12?1e-12:A[k][k];for(let j=k;j<n;j++)A[k][j]/=piv;b[k]/=piv;for(let i=0;i<n;i++)if(i!==k){const f=A[i][k];for(let j=k;j<n;j++)A[i][j]-=f*A[k][j];b[i]-=f*b[k];}}return b;}
function inverse(A){requireSquare(A,'inverse');return transpose(identity(A.length).map(e=>solve(A,e)));}
function norm(v){return Math.hypot(...v);} function dot(a,b){return a.reduce((s,x,i)=>s+x*(b[i]||0),0);} function scale(v,c){return v.map(x=>x*c);} function sub(a,b){return a.map((x,i)=>x-(b[i]||0));}
function powerIteration(A,it=100){requireSquare(A,'powerIteration');let v=Array(A.length).fill(1/Math.sqrt(A.length));for(let k=0;k<it;k++){let w=matvec(A,v);const n=norm(w)||1;v=w.map(x=>x/n);}const Av=matvec(A,v);const lambda=dot(Av,v);return {eigenvalue:lambda,eigenvector:v};}
function trace(A){return A.reduce((s,r,i)=>s+(r[i]||0),0);} 
function gramSchmidt(A){requireMatrix(A,'gramSchmidt');const cols=transpose(A),Q=[];for(const c of cols){let v=c.slice();for(const q of Q)v=sub(v,scale(q,dot(v,q)));const n=norm(v);if(n>1e-10)Q.push(scale(v,1/n));}return transpose(Q);} 
function leastSquares(A,b){requireMatrix(A,'leastSquares');requireVector(b,'leastSquares');if(A.length!==b.length)throw new Error('leastSquares: rows of A must equal length of b');const At=transpose(A),AtA=matmul(At,A),Atb=matvec(At,b);return solve(AtA,Atb);} 
function projection(u,v){const c=dot(u,v)/(dot(v,v)||1);return scale(v,c);} 
function markovSteady(P){requireSquare(P,'markovSteady');const Pt=transpose(P);let v=Array(P.length).fill(1/P.length);for(let k=0;k<200;k++){let w=matvec(Pt,v);const s=w.reduce((a,b)=>a+b,0)||1;v=w.map(x=>x/s);}return v;}

function luDecomposition(A){requireSquare(A,'luDecomposition');const n=A.length,L=identity(n),U=Array.from({length:n},()=>Array(n).fill(0)),P=identity(n);A=A.map(r=>r.slice());for(let k=0;k<n;k++){let piv=k;for(let i=k+1;i<n;i++)if(Math.abs(A[i][k])>Math.abs(A[piv][k]))piv=i;if(piv!==k){[A[k],A[piv]]=[A[piv],A[k]];[P[k],P[piv]]=[P[piv],P[k]];for(let j=0;j<k;j++){[L[k][j],L[piv][j]]=[L[piv][j],L[k][j]];}}for(let j=k;j<n;j++)U[k][j]=A[k][j];for(let i=k+1;i<n;i++){L[i][k]=A[i][k]/(U[k][k]||1e-12);for(let j=k;j<n;j++)A[i][j]-=L[i][k]*U[k][j];}}return {P,L,U};}
function qrDecomposition(A){requireMatrix(A,'qrDecomposition');const cols=transpose(A),Qcols=[];const R=Array.from({length:cols.length},()=>Array(cols.length).fill(0));for(let j=0;j<cols.length;j++){let v=cols[j].slice();for(let i=0;i<Qcols.length;i++){R[i][j]=dot(Qcols[i],cols[j]);v=sub(v,scale(Qcols[i],R[i][j]));}R[j][j]=norm(v);Qcols[j]=R[j][j]<1e-12?v.map(()=>0):scale(v,1/R[j][j]);}return {Q:transpose(Qcols),R};}
function rref(A){A=A.map(r=>r.slice());let lead=0;const rows=A.length,cols=A[0]?.length||0,pivots=[];for(let r=0;r<rows;r++){if(lead>=cols)break;let i=r;while(Math.abs(A[i][lead])<1e-12){i++;if(i===rows){i=r;lead++;if(lead===cols)return {R:A,pivots};}}[A[i],A[r]]=[A[r],A[i]];const lv=A[r][lead]||1;A[r]=A[r].map(v=>v/lv);for(let i2=0;i2<rows;i2++)if(i2!==r){const lv2=A[i2][lead];A[i2]=A[i2].map((v,j)=>v-lv2*A[r][j]);}pivots.push(lead);lead++;}return {R:A,pivots};}
function nullSpace(A){requireMatrix(A,'nullSpace');const rr=rref(A),R=rr.R,pivots=new Set(rr.pivots),cols=A[0]?.length||0,free=[];for(let j=0;j<cols;j++)if(!pivots.has(j))free.push(j);if(!free.length)return [];return free.map(f=>{const v=Array(cols).fill(0);v[f]=1;rr.pivots.forEach((p,i)=>{v[p]=-(R[i][f]||0);});return v;});}
function pcaFromMatrix(A){requireMatrix(A,'pcaFromMatrix');const X=A.map(r=>r.slice()),cols=transpose(X),mu=cols.map(c=>c.reduce((s,x)=>s+x,0)/c.length),C=X.map(r=>r.map((v,j)=>v-mu[j]));const Cov=matmul(transpose(C),C).map(r=>r.map(v=>v/Math.max(1,C.length-1)));const first=powerIteration(Cov,120);return {center:mu,covariance:Cov,firstComponent:first.eigenvector,dominantVariance:first.eigenvalue};}

function fmt(obj){return (FokoKit&&FokoKit.formatResult?FokoKit.formatResult(obj,{json:true,digits:6}):JSON.stringify(obj,(k,v)=>Number.isFinite(v)?Number(v.toFixed(6)):v,2));} 
function plot(plot,A,b,mode,res){if(!window.Plotly||!plot)return;const rows=A.length,cols=A[0]?.length||0;let data=[],layout={margin:{t:28,r:20,b:48,l:52},paper_bgcolor:'#fff',plot_bgcolor:'#fff'};const chosen=mode==='auto'?'heatmap':mode;
 if(chosen==='heatmap')data=[{z:A,type:'heatmap',colorscale:'Viridis'}];
 else if(chosen==='vectors'){const xs=[],ys=[],text=[];for(let j=0;j<Math.min(cols,3);j++){xs.push(0,A[0][j]||0,null);ys.push(0,A[1]?.[j]||0,null);text.push('',`col ${j+1}`,'');}data=[{x:xs,y:ys,mode:'lines+markers+text',text,type:'scatter'}];layout.xaxis={zeroline:true};layout.yaxis={scaleanchor:'x',zeroline:true};}
 else if(chosen==='transform'){const X=[],Y=[];for(let t=-2;t<=2;t++){for(let s=-2;s<=2;s++){let p=matvec(A,[t,s]);X.push(p[0],null);Y.push(p[1]||0,null);}}data=[{x:X,y:Y,mode:'markers',type:'scatter',name:'transformed grid'}];layout.yaxis={scaleanchor:'x'};}
 else if(chosen==='eigen'){const ev=res&&res.eigenvector?res:powerIteration(A);const v=ev.eigenvector;data=[{x:[-v[0]*3,v[0]*3],y:[-(v[1]||0)*3,(v[1]||0)*3],mode:'lines+markers',type:'scatter',name:'dominant eigenline'}];layout.yaxis={scaleanchor:'x'};}
 else if(chosen==='projection'){const u=b.length?b:[1,2],v=[A[0][0]||1,A[1]?.[0]||0];const pr=projection(u,v);data=[{x:[0,u[0]],y:[0,u[1]||0],mode:'lines+markers',name:'u'},{x:[0,pr[0]],y:[0,pr[1]||0],mode:'lines+markers',name:'projection'}];layout.yaxis={scaleanchor:'x'};}
 else if(chosen==='leastSquares'){const x=A.map(r=>r[0]),y=b;const coeff=leastSquares(A,b);const pred=matvec(A,coeff);data=[{x,y,mode:'markers',type:'scatter',name:'data'},{x,y:pred,mode:'lines',name:'least squares'}];}
 else if(chosen==='markov'){const st=markovSteady(A);data=[{x:st.map((_,i)=>'S'+(i+1)),y:st,type:'bar',name:'steady probability'}];}
 Plotly.newPlot(plot,data,layout,{responsive:true,displaylogo:false});}
function boot(){const el=document.querySelector('[data-linalg-lab]');if(!el)return;const $=id=>document.getElementById(id);const run=()=>{const A=parseMatrix($('laMatrix').value),b=parseVector($('laVector').value),mode=$('laMode').value;let res;if(mode==='solve')res={solution:solve(A,b)};else if(mode==='inverse')res={inverse:inverse(A)};else if(mode==='eigen')res=powerIteration(A);else if(mode==='leastSquares')res={coefficients:leastSquares(A,b)};else if(mode==='projection')res={projection:projection(b.length?b:[1,2],[A[0][0]||1,A[1]?.[0]||0])};else if(mode==='gramSchmidt')res={Q:gramSchmidt(A)};else if(mode==='markov')res={steadyState:markovSteady(A)};else if(mode==='multiply')res={AtA:matmul(transpose(A),A)};else if(mode==='lu')res=luDecomposition(A);else if(mode==='qr')res=qrDecomposition(A);else if(mode==='nullspace')res={nullSpace:nullSpace(A)};else if(mode==='pca')res=pcaFromMatrix(A);else res={rows:A.length,cols:A[0]?.length||0,determinant:determinant(A),trace:trace(A),conditionWarning:'Use export for large/sparse or ill-conditioned matrices.'};$('laOutput').textContent=fmt(res);plot($('laPlot'),A,b,$('laPlotMode').value,res);};$('laRun').addEventListener('click',run);$('laPlotMode').addEventListener('change',run);run();}
/* symmetricEigenvalues(S) -> eigenvalues of a symmetric matrix, sorted
 * descending, via cyclic Jacobi rotations. Real diagnostic behind the
 * eigenvalue-spectrum bar chart and the singular-value cumulative-variance
 * line (variance_i = sigma_i^2 = eig_i(A^T A)). Replaces hardcoded fakes.
 * PRECONDITIONS: S is square and symmetric (within tolerance). */
function symmetricEigenvalues(S){
  requireSquare(S,'symmetricEigenvalues');
  const n=S.length;
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
    if(Math.abs(S[i][j]-S[j][i])>1e-8*(1+Math.abs(S[i][j])))
      throw new Error('symmetricEigenvalues: matrix must be symmetric (entry ['+i+']['+j+']).');
  }
  const A=S.map(r=>r.slice());
  const off=()=>{let s=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)s+=A[i][j]*A[i][j];return s;};
  let sweeps=0;
  while(off()>1e-20 && sweeps<100){
    for(let p=0;p<n-1;p++)for(let q=p+1;q<n;q++){
      if(Math.abs(A[p][q])<1e-300)continue;
      const app=A[p][p],aqq=A[q][q],apq=A[p][q];
      const phi=0.5*Math.atan2(2*apq,aqq-app);
      const c=Math.cos(phi),s=Math.sin(phi);
      for(let k=0;k<n;k++){
        const akp=A[k][p],akq=A[k][q];
        A[k][p]=c*akp-s*akq; A[k][q]=s*akp+c*akq;
      }
      for(let k=0;k<n;k++){
        const apk=A[p][k],aqk=A[q][k];
        A[p][k]=c*apk-s*aqk; A[q][k]=s*apk+c*aqk;
      }
    }
    sweeps++;
  }
  const eig=[]; for(let i=0;i<n;i++)eig.push(A[i][i]);
  return eig.sort((a,b)=>b-a);
}

/* powerIterationTrace(A, iters) -> array of Rayleigh-quotient estimates,
 * one per iteration, genuinely converging to the dominant eigenvalue.
 * Real diagnostic behind the "power-iteration convergence" plot.
 * PRECONDITIONS: A square; iters a positive integer. */
function powerIterationTrace(A,iters){
  requireSquare(A,'powerIterationTrace');
  if(!Number.isInteger(iters)||iters<1)
    throw new Error('powerIterationTrace: iters must be a positive integer (got '+iters+').');
  const nn=A.length;
  let v=Array(nn).fill(1/Math.sqrt(nn));
  const est=[];
  for(let k=0;k<iters;k++){
    const w=matvec(A,v);
    const nrm=norm(w)||1;
    v=w.map(x=>x/nrm);
    const Av=matvec(A,v);
    est.push(dot(Av,v)/(dot(v,v)||1)); // Rayleigh quotient
  }
  return est;
}

const api={parseMatrix,parseVector,transpose,matmul,matvec,identity,determinant,solve,inverse,powerIteration,powerIterationTrace,symmetricEigenvalues,trace,gramSchmidt,leastSquares,projection,markovSteady,luDecomposition,qrDecomposition,rref,nullSpace,pcaFromMatrix}; if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FokoLinearAlgebra=api;if(typeof document!=='undefined')(document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot());
}(typeof window!=='undefined'?window:globalThis));
