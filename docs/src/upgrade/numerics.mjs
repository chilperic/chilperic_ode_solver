/** Dependency-free numerical kernels. Algorithms, bounds and tests are documented in docs/SCIENCE.md. */
export const linspace=(a,b,n)=>Array.from({length:n},(_,i)=>i===n-1?b:a+(b-a)*i/(n-1));
export const sum=a=>a.reduce((s,v)=>s+v,0),mean=a=>sum(a)/a.length;
export function variance(a){if(a.length<2)return 0;const m=mean(a);return sum(a.map(x=>(x-m)**2))/(a.length-1);}
export function quantile(a,p){if(!a.length)throw Error('Quantile requires observations.');const s=[...a].sort((x,y)=>x-y),q=(s.length-1)*p,i=Math.floor(q);return s[i]+(q-i)*((s[i+1]??s[i])-s[i]);}
export function rng(seed=42){let a=Number(seed)>>>0;const u=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};u.normal=()=>Math.sqrt(-2*Math.log(Math.max(u(),1e-15)))*Math.cos(2*Math.PI*u());u.binomial=(n,p)=>{if(!Number.isInteger(n)||n<0||n>200000||p<0||p>1)throw Error('Binomial sampling outside supported range.');let s=0;for(let i=0;i<n;i++)s+=u()<p;return s;};return u;}
export function integrate(rhs,initial,t0,t1,{method='rk45',step=.05,rtol=1e-7,atol=1e-9,samples=401,maxSteps=250000,nonnegative=false}={}){
 if(!(Number.isFinite(t0)&&Number.isFinite(t1)&&t1>t0&&step>0&&Number.isFinite(step)&&rtol>0&&atol>0))throw Error('Require finite end > start, step > 0 and positive tolerances.');
 if(!Number.isInteger(samples)||samples<2||samples>5001)throw Error('Output samples must be an integer between 2 and 5001.');
 if(!['rk45','rk4','heun','euler'].includes(method))throw Error('Unsupported ODE method.');
 let t=t0,y=[...initial],h=Math.min(step,t1-t0),steps=0,rejected=0,evals=0;const times=linspace(t0,t1,samples),rows=[[...y]];
 const f=(t,y)=>{evals++;const z=rhs(t,y);if(z.length!==y.length||!z.every(Number.isFinite))throw Error(`Non-finite derivative at t=${t}. Check domains and parameters.`);return z;};
 const combine=(terms,hh)=>y.map((v,j)=>v+hh*terms.reduce((s,[c,k])=>s+c*k[j],0));
 for(let oi=1;oi<times.length;oi++){
  const target=times[oi];
  while(t<target){
   if(++steps>maxSteps)throw Error('Step budget exceeded. Reduce the time horizon, reconsider stiffness, or export to a stiff Python solver.');
   const hh=Math.min(h,target-t,step);if(t+hh===t)throw Error('Step underflow: requested tolerance or model scale cannot be resolved.');
   const k1=f(t,y);let next,err=0;
   if(method==='euler')next=combine([[1,k1]],hh);
   else if(method==='heun'){const k2=f(t+hh,combine([[1,k1]],hh));next=combine([[.5,k1],[.5,k2]],hh);}
   else if(method==='rk4'){const k2=f(t+hh/2,combine([[.5,k1]],hh)),k3=f(t+hh/2,combine([[.5,k2]],hh)),k4=f(t+hh,combine([[1,k3]],hh));next=combine([[1/6,k1],[1/3,k2],[1/3,k3],[1/6,k4]],hh);}
   else{
    const k2=f(t+hh/5,combine([[1/5,k1]],hh));
    const k3=f(t+hh*3/10,combine([[3/40,k1],[9/40,k2]],hh));
    const k4=f(t+hh*4/5,combine([[44/45,k1],[-56/15,k2],[32/9,k3]],hh));
    const k5=f(t+hh*8/9,combine([[19372/6561,k1],[-25360/2187,k2],[64448/6561,k3],[-212/729,k4]],hh));
    const k6=f(t+hh,combine([[9017/3168,k1],[-355/33,k2],[46732/5247,k3],[49/176,k4],[-5103/18656,k5]],hh));
    next=combine([[35/384,k1],[500/1113,k3],[125/192,k4],[-2187/6784,k5],[11/84,k6]],hh);
    const k7=f(t+hh,next),low=combine([[5179/57600,k1],[7571/16695,k3],[393/640,k4],[-92097/339200,k5],[187/2100,k6],[1/40,k7]],hh);
    err=Math.max(...next.map((v,j)=>Math.abs(v-low[j])/(atol+rtol*Math.max(Math.abs(v),Math.abs(y[j])))));
   }
   if(!next.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e12))throw Error(`Divergence or state magnitude > 1e12 at t=${t}. Inspect equations and reduce the step.`);
   if(method==='rk45'&&err>1){h=hh*Math.max(.1,.9*err**(-.2));rejected++;continue;}
   if(nonnegative&&next.some(v=>v < -10*atol))throw Error(`A nonnegative state became negative at t=${t+hh}. No clipping was applied. Reduce the integration step.`);
   t=t+hh;if(Math.abs(target-t)<Number.EPSILON*Math.max(1,Math.abs(target))*4)t=target;y=next;
   if(method==='rk45')h=Math.min(step,hh*(err===0?5:Math.min(5,Math.max(.2,.9*err**(-.2)))));
  }
  rows.push([...y]);
 }
 return{t:times,y:rows,steps,rejected,evals};
}
export function solve(A,b){
 const n=b.length;if(n===0||n>30||A.length!==n||A.some(r=>r.length!==n)||!A.flat().every(Number.isFinite)||!b.every(Number.isFinite))throw Error('Linear solve requires a finite square matrix of size 1–30.');
 const a=A.map((r,i)=>[...r,b[i]]);const scale=Math.max(...A.flat().map(Math.abs),1);
 for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[p][k]))p=i;if(Math.abs(a[p][k])<scale*1e-13)throw Error('Matrix is singular or numerically rank-deficient. Inspect scaling or regularize.');[a[k],a[p]]=[a[p],a[k]];
 for(let i=k+1;i<n;i++){const m=a[i][k]/a[k][k];for(let j=k;j<=n;j++)a[i][j]-=m*a[k][j];}}
 const x=Array(n).fill(0);for(let i=n-1;i>=0;i--)x[i]=(a[i][n]-sum(a[i].slice(i+1,n).map((v,j)=>v*x[i+1+j])))/a[i][i];return x;
}
export function leastSquares(X,y,lambda=0){if(X.length!==y.length||X.length<1||lambda<0)throw Error('Invalid regression dimensions or penalty.');const n=X[0].length,A=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>sum(X.map(r=>r[i]*r[j]))+(i===j&&i>0?lambda:0))),b=Array.from({length:n},(_,i)=>sum(X.map((r,k)=>r[i]*y[k])));return solve(A,b);}
export const dot=(a,b)=>sum(a.map((v,i)=>v*b[i]));
export function jacobian(f,x,rel=1e-5){const n=x.length;return Array.from({length:n},()=>Array(n).fill(0)).map((row,i)=>row.map((_,j)=>{const h=rel*Math.max(1,Math.abs(x[j])),a=[...x],b=[...x];a[j]+=h;b[j]-=h;return(f(a)[i]-f(b)[i])/(2*h);}));}
export function newton(f,x0,{tol=1e-9,maxIter=80}={}){let x=[...x0],history=[];for(let it=0;it<maxIter;it++){const y=f(x),r=Math.max(...y.map(Math.abs));history.push(r);if(r<tol)return{x,residual:r,iterations:it,history};const step=solve(jacobian(f,x),y);let alpha=1,trial,rr;do{trial=x.map((v,i)=>v-alpha*step[i]);rr=Math.max(...f(trial).map(Math.abs));if(rr<r)break;alpha*=.5;}while(alpha>1/4096);if(!(rr<r))throw Error('Newton iteration could not reduce the residual. Try a different initial guess.');x=trial;}throw Error('Newton solve did not meet the residual tolerance.');}
export function eigen2(A){if(A.length!==2||A[0].length!==2)throw Error('Eigenvalues implemented for 2 × 2 matrices only.');const tr=A[0][0]+A[1][1],det=A[0][0]*A[1][1]-A[0][1]*A[1][0],disc=tr*tr-4*det;return disc>=0?[{re:(tr+Math.sqrt(disc))/2,im:0},{re:(tr-Math.sqrt(disc))/2,im:0}]:[{re:tr/2,im:Math.sqrt(-disc)/2},{re:tr/2,im:-Math.sqrt(-disc)/2}];}
export function nelderMead(f,x0,{maxIter=600,tol=1e-9}={}){const n=x0.length;let simplex=[x0,...x0.map((_,i)=>x0.map((v,j)=>v+(i===j?.15*Math.max(1,Math.abs(v)):0)))],history=[];
 for(let it=0;it<maxIter;it++){simplex.sort((a,b)=>f(a)-f(b));const best=simplex[0],worst=simplex[n];history.push([...best,f(best)]);if(Math.max(...simplex.map(p=>Math.hypot(...p.map((v,i)=>v-best[i]))))<tol)return{x:best,value:f(best),history,converged:true};const c=Array.from({length:n},(_,j)=>mean(simplex.slice(0,n).map(p=>p[j]))),r=c.map((v,j)=>2*v-worst[j]);
 if(f(r)<f(best)){const e=c.map((v,j)=>v+2*(r[j]-v));simplex[n]=f(e)<f(r)?e:r;}
 else if(f(r)<f(simplex[n-1]))simplex[n]=r;
 else{const outside=f(r)<f(worst),co=c.map((v,j)=>v+.5*((outside?r[j]:worst[j])-v));if(f(co)<(outside?f(r):f(worst)))simplex[n]=co;else simplex=simplex.map((p,k)=>k===0?p:p.map((v,j)=>best[j]+.5*(v-best[j])));}}
 simplex.sort((a,b)=>f(a)-f(b));return{x:simplex[0],value:f(simplex[0]),history,converged:false};
}
export function parseCSV(text){
 if(typeof text!=='string'||text.length>2000000)throw Error('CSV is limited to 2 MB.');
 const input=text.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(quoted){if(c==='"'){if(input[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell.trim()||closed)throw Error('Unexpected quote in CSV.');quoted=true;cell='';continue;}
  if(c===','||c==='\n'||c==='\r'){row.push(cell.trim());cell='';closed=false;if(c!==','){if(c==='\r'&&input[i+1]==='\n')i++;if(row.some(v=>v!==''))rows.push(row);row=[];}continue;}
  if(closed&&!/\s/.test(c))throw Error('Unexpected text after a quoted CSV field.');cell+=c;
 }
 if(quoted)throw Error('Unclosed quoted CSV field.');if(cell||row.length){row.push(cell.trim());if(row.some(v=>v!==''))rows.push(row);}
 if(rows.length<2||rows.length>20001)throw Error('CSV requires a header and 1–20,000 numeric data rows.');
 const header=rows.shift();if(header.length>30||new Set(header).size!==header.length||header.some(v=>!v))throw Error('CSV requires unique nonempty column names; at most 30 columns.');
 rows=rows.map((cells,i)=>{if(cells.length!==header.length||cells.some(v=>!v))throw Error(`CSV row ${i+2}: missing values or incorrect column count.`);const values=cells.map(Number);if(!values.every(Number.isFinite))throw Error(`CSV row ${i+2}: numeric finite values are required.`);return values;});return{header,rows};
}
