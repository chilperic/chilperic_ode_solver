/* Foko Lab one-dimensional bifurcation core.
 * Finite parameter/root scans with derivative-based local stability.
 * Browser: FokoBifurcationCore. Node: require(...).
 */
(function (root) {
  'use strict';
  function assert(ok, message) { if (!ok) throw new Error(message); }
  function finite(value, name) { const n=Number(value); assert(Number.isFinite(n), name+' must be finite.'); return n; }
  function integer(value, name, lo, hi) { const n=finite(value,name); assert(Number.isInteger(n)&&n>=lo&&n<=hi,name+' must be an integer from '+lo+' to '+hi+'.'); return n; }
  function linspace(a,b,n){return Array.from({length:n},function(_,i){return a+(b-a)*i/Math.max(1,n-1);});}
  function derivative(rhs,x,mu,h){return(rhs(x+h,mu)-rhs(x-h,mu))/(2*h);}
  function bisect(rhs,a,b,mu,tolerance){let fa=rhs(a,mu),fb=rhs(b,mu);if(Math.abs(fa)<=tolerance)return a;if(Math.abs(fb)<=tolerance)return b;assert(fa*fb<=0,'Bisection interval does not bracket a root.');for(let i=0;i<80;i+=1){const m=(a+b)/2,fm=rhs(m,mu);if(Math.abs(fm)<=tolerance||Math.abs(b-a)<=tolerance)return m;if(fa*fm<=0){b=m;fb=fm;}else{a=m;fa=fm;}}return(a+b)/2;}
  function rootsAt(rhs,mu,xMin,xMax,xPoints,tolerance){const xs=linspace(xMin,xMax,xPoints),values=xs.map(function(x){return finite(rhs(x,mu),'right-hand side');}),roots=[];function add(x){if(!roots.some(function(r){return Math.abs(r-x)<=Math.max(tolerance*20,(xMax-xMin)/xPoints*.08);}))roots.push(x);}
    for(let i=0;i<xs.length-1;i+=1){const a=xs[i],b=xs[i+1],fa=values[i],fb=values[i+1];if(Math.abs(fa)<=tolerance)add(a);if(fa*fb<0)add(bisect(rhs,a,b,mu,tolerance));}
    if(Math.abs(values[values.length-1])<=tolerance)add(xs[xs.length-1]);
    for(let i=1;i<xs.length-1;i+=1){
      if(Math.abs(values[i])<Math.abs(values[i-1])&&Math.abs(values[i])<Math.abs(values[i+1])&&Math.abs(values[i])<Math.sqrt(tolerance)){
        let candidate=xs[i];
        for(let iteration=0;iteration<30;iteration+=1){
          const value=rhs(candidate,mu),step=Math.max(1e-7,(xMax-xMin)*1e-6),slope=derivative(rhs,candidate,mu,step);
          if(!Number.isFinite(slope)||Math.abs(slope)<1e-12)break;
          const next=Math.max(xs[i-1],Math.min(xs[i+1],candidate-value/slope));
          if(Math.abs(next-candidate)<=tolerance){candidate=next;break;}
          candidate=next;
        }
        if(Math.abs(rhs(candidate,mu))<=Math.max(tolerance*20,1e-7))add(candidate);
      }
    }
    return roots.sort(function(a,b){return a-b;});
  }
  function normalize(config){const c=config||{},muMin=finite(c.muMin==null?-2:c.muMin,'mu minimum'),muMax=finite(c.muMax==null?2:c.muMax,'mu maximum'),xMin=finite(c.xMin==null?-2.5:c.xMin,'state minimum'),xMax=finite(c.xMax==null?2.5:c.xMax,'state maximum');assert(muMax>muMin,'mu maximum must exceed minimum.');assert(xMax>xMin,'state maximum must exceed minimum.');return{muMin,muMax,xMin,xMax,muPoints:integer(c.muPoints==null?181:c.muPoints,'parameter points',31,601),xPoints:integer(c.xPoints==null?301:c.xPoints,'root scan points',81,1201),rootTolerance:Math.max(1e-12,finite(c.rootTolerance==null?1e-8:c.rootTolerance,'root tolerance')),derivativeStep:Math.max(1e-7,finite(c.derivativeStep==null?1e-4:c.derivativeStep,'derivative step'))};}
  function scan(input){const c=normalize(input),rhs=input&&input.rhs;assert(typeof rhs==='function','A right-hand-side function rhs(x, mu) is required.');const mus=linspace(c.muMin,c.muMax,c.muPoints),rows=[],counts=[],critical=[];let previousCount=null;
    mus.forEach(function(mu,index){const roots=rootsAt(rhs,mu,c.xMin,c.xMax,c.xPoints,c.rootTolerance);counts.push({mu,count:roots.length});if(previousCount!=null&&roots.length!==previousCount)critical.push({mu,type:roots.length>previousCount?'branch gain':'branch loss',before:previousCount,after:roots.length});previousCount=roots.length;roots.forEach(function(x){const eigenvalue=derivative(rhs,x,mu,c.derivativeStep),residual=Math.abs(rhs(x,mu));rows.push({mu,x,eigenvalue,stable:eigenvalue<0,residual});if(Math.abs(eigenvalue)<.02&&!critical.some(function(event){return Math.abs(event.mu-mu)<(c.muMax-c.muMin)/c.muPoints&&event.type==='near-zero eigenvalue';}))critical.push({mu,type:'near-zero eigenvalue',x,eigenvalue});});});
    const maxResidual=rows.reduce(function(m,row){return Math.max(m,row.residual);},0);return{schema:'foko.bifurcation-result/1',config:c,rows,counts,critical,maxResidual,method:'Finite parameter scan, bracketed scalar roots, and central finite-difference stability derivative.',limitations:['This is not pseudo-arclength continuation.','Root branches can be missed when the finite state grid does not bracket or approach them.','Local stability is one-dimensional and based on the sign of df/dx.','Periodic orbits, Hopf points, multidimensional branches, codimension-two events, and certified critical points are not computed.']};
  }
  function slice(input){const c=normalize(input),rhs=input&&input.rhs,mu=finite(input.mu,'inspection parameter');assert(typeof rhs==='function','A right-hand-side function is required.');const x=linspace(c.xMin,c.xMax,401),field=x.map(function(v){return finite(rhs(v,mu),'right-hand side');}),potential=[0];for(let i=1;i<x.length;i+=1)potential.push(potential[i-1]-.5*(field[i-1]+field[i])*(x[i]-x[i-1]));const roots=rootsAt(rhs,mu,c.xMin,c.xMax,c.xPoints,c.rootTolerance).map(function(value){const eig=derivative(rhs,value,mu,c.derivativeStep);return{x:value,eigenvalue:eig,stable:eig<0};});return{x,field,potential,roots,mu};}
  const presets=[
    {id:'pitchfork',title:'Supercritical pitchfork',family:'Symmetry breaking',expression:'mu*x - x^3',params:{},muMin:-2,muMax:2,xMin:-2,xMax:2,inspectMu:.8},
    {id:'saddle-node',title:'Saddle-node fold',family:'Tipping point',expression:'mu - x^2',params:{},muMin:-1,muMax:3,xMin:-2.2,xMax:2.2,inspectMu:1},
    {id:'transcritical',title:'Transcritical exchange',family:'Stability exchange',expression:'mu*x - x^2',params:{},muMin:-2,muMax:2,xMin:-2.2,xMax:2.2,inspectMu:.8},
    {id:'imperfect-pitchfork',title:'Imperfect pitchfork / cusp slice',family:'Hysteresis',expression:'mu + a*x - x^3',params:{a:1},muMin:-1,muMax:1,xMin:-2,xMax:2,inspectMu:.1},
    {id:'allee-threshold',title:'Allee population threshold',family:'Ecology',expression:'r*x*(1-x/K)*(x-mu)',params:{r:1,K:1},muMin:.05,muMax:.8,xMin:-.15,xMax:1.2,inspectMu:.3},
    {id:'gene-switch',title:'Reduced gene self-activation',family:'Gene regulation',expression:'mu + a*x^2/(b+x^2) - x',params:{a:2.4,b:.45},muMin:0,muMax:.8,xMin:-.1,xMax:3.2,inspectMu:.18}
  ];
  const api=Object.freeze({scan,slice,rootsAt,normalize,presets});root.FokoBifurcationCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
}(typeof window!=='undefined'?window:globalThis));
