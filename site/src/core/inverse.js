(function(){
  'use strict';
  function assertArray(x,name){ if(!Array.isArray(x) || x.length===0) throw new Error(name+' empty'); }
  function cloneVec(x){ return x.map(Number); }
  function isFiniteVec(x){ return Array.isArray(x) && x.every(Number.isFinite); }
  const ODE = (typeof window!=='undefined' && window.FokoODECore) || (typeof require==='function' ? require('./ode.js') : null);
  function coreStep(rhs,t,x,dt,theta){
    if(!ODE || typeof ODE.fixedStep!=='function') throw new Error('canonical ODE core unavailable');
    const result=ODE.fixedStep(rhs,'rk4',t,x,dt,theta).y;
    if(!isFiniteVec(result)) throw new Error('non-finite/diverged state during canonical RK4 integration');
    return result;
  }
  function simulateModel(cfg){
    if(!cfg || typeof cfg.rhs!=='function') throw new Error('rhs required');
    assertArray(cfg.t,'t'); assertArray(cfg.theta,'theta'); assertArray(cfg.x0,'x0');
    const t=cfg.t, theta=cloneVec(cfg.theta); let x=cloneVec(cfg.x0); const X=[];
    if(!isFiniteVec(x) || !isFiniteVec(theta)) throw new Error('non-finite initial state or theta');
    for(let i=0;i<t.length;i++){
      X.push(x.slice());
      if(i<t.length-1){ const dt=t[i+1]-t[i]; if(!Number.isFinite(dt)) throw new Error('non-finite time step'); x=coreStep(cfg.rhs,t[i],x,dt,theta); }
    }
    return X;
  }
  function zeros(n,m){ return Array.from({length:n},()=>Array(m).fill(0)); }
  function matVec(A,v){ return A.map(row=>row.reduce((s,a,i)=>s+a*v[i],0)); }
  function sensRhs(t,y,theta,n,p,rhs,dfdx,dfdth){
    const x=y.slice(0,n); const S=[]; let off=n;
    for(let j=0;j<p;j++){ S.push(y.slice(off,off+n)); off+=n; }
    const fx=rhs(t,x,theta), A=dfdx(t,x,theta), B=dfdth(t,x,theta);
    const out=fx.slice();
    for(let j=0;j<p;j++){
      const AS=matVec(A,S[j]);
      for(let i=0;i<n;i++) out.push(AS[i]+B[i][j]);
    }
    return out;
  }
  function jacobian(cfg){
    assertArray(cfg.t,'t'); assertArray(cfg.theta,'theta'); assertArray(cfg.x0,'x0');
    const mode=cfg.mode||'fd'; const base=simulateModel(cfg); const m=cfg.t.length,n=cfg.x0.length,p=cfg.theta.length;
    if(mode==='fd'){
      const h=Number(cfg.fdStep||1e-5); const J=Array.from({length:m},()=>Array.from({length:n},()=>Array(p).fill(0)));
      for(let j=0;j<p;j++){
        const thp=cloneVec(cfg.theta), thm=cloneVec(cfg.theta); thp[j]+=h; thm[j]-=h;
        const Xp=simulateModel({rhs:cfg.rhs,theta:thp,x0:cfg.x0,t:cfg.t});
        const Xm=simulateModel({rhs:cfg.rhs,theta:thm,x0:cfg.x0,t:cfg.t});
        for(let a=0;a<m;a++) for(let i=0;i<n;i++) J[a][i][j]=(Xp[a][i]-Xm[a][i])/(2*h);
      }
      return J;
    }
    if(mode==='sensitivity'){
      if(typeof cfg.dfdx!=='function' || typeof cfg.dfdth!=='function') throw new Error('sensitivity mode requires dfdx and dfdth');
      let y=cloneVec(cfg.x0).concat(Array(n*p).fill(0)); const J=[];
      for(let k=0;k<cfg.t.length;k++){
        const row=Array.from({length:n},()=>Array(p).fill(0));
        let off=n; for(let j=0;j<p;j++){ for(let i=0;i<n;i++) row[i][j]=y[off+i]; off+=n; }
        J.push(row);
        if(k<cfg.t.length-1){ const dt=cfg.t[k+1]-cfg.t[k]; y=coreStep((tt,yy,th)=>sensRhs(tt,yy,th,n,p,cfg.rhs,cfg.dfdx,cfg.dfdth),cfg.t[k],y,dt,cfg.theta); }
      }
      return J;
    }
    throw new Error('unknown jacobian mode '+mode);
  }
  function flattenResidual(X,data){ const r=[]; for(let i=0;i<X.length;i++) for(let j=0;j<X[i].length;j++) r.push(X[i][j]-data[i][j]); return r; }
  function flattenJ(J){ const rows=[]; for(let i=0;i<J.length;i++) for(let s=0;s<J[i].length;s++) rows.push(J[i][s].slice()); return rows; }
  function normalEq(A,r,mu){
    const p=A[0].length; const H=Array.from({length:p},()=>Array(p).fill(0)); const g=Array(p).fill(0);
    for(let i=0;i<A.length;i++){
      for(let a=0;a<p;a++){ g[a]+=A[i][a]*r[i]; for(let b=0;b<p;b++) H[a][b]+=A[i][a]*A[i][b]; }
    }
    for(let a=0;a<p;a++) H[a][a]+=mu;
    return {H,g};
  }
  function solve(A,b){
    const n=A.length; const M=A.map((row,i)=>row.slice().concat([b[i]]));
    for(let k=0;k<n;k++){
      let piv=k; for(let i=k+1;i<n;i++) if(Math.abs(M[i][k])>Math.abs(M[piv][k])) piv=i;
      if(Math.abs(M[piv][k])<1e-14) throw new Error('linear solve singular');
      [M[k],M[piv]]=[M[piv],M[k]];
      const d=M[k][k]; for(let j=k;j<=n;j++) M[k][j]/=d;
      for(let i=0;i<n;i++) if(i!==k){ const f=M[i][k]; for(let j=k;j<=n;j++) M[i][j]-=f*M[k][j]; }
    }
    return M.map(row=>row[n]);
  }
  function norm2(v){ return Math.sqrt(v.reduce((s,x)=>s+x*x,0)); }
  function cost(r){ return 0.5*r.reduce((s,x)=>s+x*x,0); }
  function validateCal(cfg){
    if(!cfg || typeof cfg.rhs!=='function') throw new Error('rhs required');
    assertArray(cfg.t,'t'); assertArray(cfg.data,'data'); assertArray(cfg.theta0,'theta'); assertArray(cfg.x0,'x0');
    if(cfg.data.length!==cfg.t.length) throw new Error('data length must match t length');
    if((cfg.mode||'fd')==='sensitivity' && (typeof cfg.dfdx!=='function' || typeof cfg.dfdth!=='function')) throw new Error('sensitivity mode requires dfdx and dfdth');
  }
  function calibrate(cfg){
    validateCal(cfg);
    let theta=cloneVec(cfg.theta0); let mu=1e-3; const maxIter=cfg.maxIter||60; const history=[]; let converged=false;
    let X=simulateModel({rhs:cfg.rhs,theta,x0:cfg.x0,t:cfg.t}); let r=flattenResidual(X,cfg.data); let c=cost(r);
    for(let iter=0;iter<maxIter;iter++){
      const J=flattenJ(jacobian({rhs:cfg.rhs,dfdx:cfg.dfdx,dfdth:cfg.dfdth,theta,x0:cfg.x0,t:cfg.t,mode:cfg.mode||'fd',fdStep:cfg.fdStep||1e-5}));
      const {H,g}=normalEq(J,r,mu); const step=solve(H,g.map(v=>-v));
      const gnorm=norm2(g); if(c<1e-8 && gnorm<1e-10){ converged=true; break; }
      if(c<1e-8 && norm2(step)<1e-9*(norm2(theta)+1e-9)){ converged=true; break; }
      const trial=theta.map((v,i)=>v+step[i]);
      let accepted=false;
      try{
        if(trial.some(v=>!Number.isFinite(v) || v<=0)) throw new Error('non-finite or invalid parameter trial');
        const Xt=simulateModel({rhs:cfg.rhs,theta:trial,x0:cfg.x0,t:cfg.t}); const rt=flattenResidual(Xt,cfg.data); const ct=cost(rt);
        if(ct<c){ theta=trial; X=Xt; r=rt; c=ct; mu=Math.max(mu/3,1e-12); accepted=true; }
        else mu*=4;
      }catch(e){ mu*=10; }
      history.push({iteration:iter,cost:c,mu,accepted,theta:theta.slice()});
      if(c<1e-10){ converged=true; break; }
    }
    return {theta,converged,finalCost:c,iterations:history.length,history};
  }
  window.FokoInverse={simulateModel,jacobian,calibrate};
})();
try{ this.constructor.constructor('return this')().FokoInverse = window.FokoInverse; }catch(_e){}
