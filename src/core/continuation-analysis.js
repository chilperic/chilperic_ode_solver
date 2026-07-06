(function(root){'use strict';
function classifyEigen(prev,curr){const p=prev||[],c=curr||[];let fold=false,hopf=false;for(let i=0;i<Math.min(p.length,c.length);i++){if((p[i].re||p[i])*(c[i].re||c[i])<0)fold=true;if(Math.abs((p[i].re||0))>1e-6 && Math.abs((c[i].re||0))<1e-3 && Math.abs(c[i].im||0)>1e-3)hopf=true;}return hopf?'hopf':(fold?'fold':'regular');}
function detectBifurcations(points){const out=[];for(let i=1;i<points.length;i++){const type=classifyEigen(points[i-1].eigenvalues||[],points[i].eigenvalues||[]);if(type!=='regular')out.push({index:i,type,parameter:points[i].parameter});}return out;}
const api={classifyEigen,detectBifurcations};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FokoContinuation=api;
}(typeof window!=='undefined'?window:globalThis));