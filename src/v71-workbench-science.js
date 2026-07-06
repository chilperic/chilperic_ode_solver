(function(root){'use strict';
const Kit = root.FokoKit || (typeof require==='function' ? require('./fokokit.js') : null);
const Fit = root.FokoDynamicalFitting || (typeof require==='function' ? require('./dynamical-fitting.js') : null);
const Stoch = root.FokoStochasticAdvanced || (typeof require==='function' ? require('./stochastic-advanced.js') : null);
const Basin = root.FokoBasin || (typeof require==='function' ? require('./basin-analysis.js') : null);

function parseObservations(text){
  const table = Kit ? Kit.parseTable(text) : {names:[],rows:[]};
  const rows = (table.rows||[]).map(r=>r.map(Number)).filter(r=>r.length>=2&&Number.isFinite(r[0])&&Number.isFinite(r[1]));
  return rows.map(r=>({t:r[0], y:r[1], series: r[2] ?? 0}));
}
function modelFactory(kind){
  if(kind==='linear') return {theta:[1,1], names:['intercept','slope'], fn:(t,p)=>p[0]+p[1]*t};
  if(kind==='exponential') return {theta:[1,.3], names:['a','b'], fn:(t,p)=>p[0]*Math.exp(p[1]*t)};
  if(kind==='decay') return {theta:[10,.3,0], names:['amplitude','rate','offset'], fn:(t,p)=>p[2]+p[0]*Math.exp(-Math.abs(p[1])*t)};
  if(kind==='michaelis') return {theta:[10,2], names:['Vmax','Km'], fn:(t,p)=>p[0]*t/(Math.abs(p[1])+t)};
  return {theta:[10,1,.5], names:['K','A','r'], fn:(t,p)=>p[0]/(1+Math.exp(-p[2]*(t-p[1])))};
}
function parseTheta(text, fallback){
  const vals=String(text||'').split(/[,;\s]+/).map(Number).filter(Number.isFinite);
  return vals.length?vals:fallback.slice();
}
function runFitCore(text, kind='logistic', thetaText=''){
  const data=parseObservations(text);
  if(data.length<3) throw new Error('Need at least three observation rows: time,value');
  const spec=modelFactory(kind);
  const theta0=parseTheta(thetaText, spec.theta);
  const out=Fit.levenbergMarquardt((t,p)=>spec.fn(t,p), data, theta0, {maxIter:90, lambda:1e-2});
  const ci=Fit.parameterCI((t,p)=>spec.fn(t,p), data, out.theta);
  const k=out.theta.length, n=data.length;
  const aic=n*Math.log(Math.max(1e-12,out.sse/n))+2*k;
  const bic=n*Math.log(Math.max(1e-12,out.sse/n))+k*Math.log(n);
  return {kind, names:spec.names.slice(0,out.theta.length), theta:out.theta, ci, sse:out.sse, rmse:out.rmse, aic, bic, residuals:out.residuals, data};
}
function makePredictionGrid(fit, n=160){
  const t=fit.data.map(d=>d.t), min=Math.min(...t), max=Math.max(...t), spec=modelFactory(fit.kind);
  const xs=[]; for(let i=0;i<n;i++) xs.push(min+(max-min)*i/(n-1 || 1));
  const y=xs.map(x=>spec.fn(x,fit.theta));
  return {x:xs,y};
}
function uncertaintyBand(fit, n=160){
  const grid=makePredictionGrid(fit,n), spec=modelFactory(fit.kind);
  const lo=grid.x.map(()=>Infinity), hi=grid.x.map(()=>-Infinity);
  const candidates=[];
  candidates.push(fit.theta);
  fit.ci.forEach((c,i)=>{
    const a=fit.theta.slice(), b=fit.theta.slice();
    a[i]=Number.isFinite(c.low)?c.low:fit.theta[i];
    b[i]=Number.isFinite(c.high)?c.high:fit.theta[i];
    candidates.push(a,b);
  });
  candidates.forEach(th=>{
    grid.x.forEach((x,i)=>{
      const v=spec.fn(x,th);
      lo[i]=Math.min(lo[i],v); hi[i]=Math.max(hi[i],v);
    });
  });
  return {x:grid.x, y:grid.y, low:lo, high:hi};
}
function sirTauEnsemble({S=990,I=10,R=0,beta=.00035,gamma=.1,t1=80,tau=.5,runs=80,seed=123}={}){
  const paths=[]; for(let r=0;r<runs;r++){
    const out=Stoch.tauLeap({state:[S,I,R],t0:0,t1,tau,seed:seed+r,reactions:[
      {change:[-1,1,0],propensity:x=>beta*x[0]*x[1]},
      {change:[0,-1,1],propensity:x=>gamma*x[1]}
    ]});
    paths.push(out.map(o=>o.state[1]));
  }
  const times=[]; for(let t=0;t<=t1+1e-12;t+=tau) times.push(Number(t.toFixed(8)));
  return {times, infected: Stoch.quantileBands(paths), runs, seed};
}
function cubicBasin({a=0,steps=140,nx=60,ny=60}={}){
  return Basin.basinMap({
    xRange:[-2,2],yRange:[-2,2],nx,ny,
    simulate:(ic)=>{let x=ic[0],y=ic[1];for(let i=0;i<steps;i++){const dx=x-x*x*x-y+a, dy=.45*x-.25*y; x+=.025*dx; y+=.025*dy;}return [x,y];},
    classify:(final)=> final[0]>0 ? 1 : 0
  });
}

function plotFit(div, fit){
  if(!root.Plotly||!div) return;
  const band=uncertaintyBand(fit);
  const obs={x:fit.data.map(d=>d.t),y:fit.data.map(d=>d.y),mode:'markers',type:'scatter',name:'observations'};
  const low={x:band.x,y:band.low,mode:'lines',line:{width:0},showlegend:false,type:'scatter',name:'lower'};
  const high={x:band.x,y:band.high,mode:'lines',fill:'tonexty',line:{width:0},type:'scatter',name:'CI envelope'};
  const line={x:band.x,y:band.y,mode:'lines',type:'scatter',name:'fit'};
  Plotly.newPlot(div,[low,high,line,obs],{margin:{t:20,r:20,b:45,l:55},xaxis:{title:'time'},yaxis:{title:'value'}},{responsive:true,displaylogo:false});
  Kit&&Kit.attachPlotExport&&Kit.attachPlotExport(div,'workbench-fit');
}
function plotSir(div,res){
  if(!root.Plotly||!div) return;
  const x=res.times, b=res.infected;
  Plotly.newPlot(div,[
    {x,y:b.map(o=>o.low),mode:'lines',line:{width:0},showlegend:false,type:'scatter'},
    {x,y:b.map(o=>o.high),mode:'lines',fill:'tonexty',line:{width:0},name:'5–95% envelope',type:'scatter'},
    {x,y:b.map(o=>o.median),mode:'lines',name:'median infected',type:'scatter'}
  ],{margin:{t:20,r:20,b:45,l:55},xaxis:{title:'time'},yaxis:{title:'infected'}},{responsive:true,displaylogo:false});
  Kit&&Kit.attachPlotExport&&Kit.attachPlotExport(div,'workbench-stochastic-envelope');
}
function plotBasin(div,res){
  if(!root.Plotly||!div) return;
  const xs=[]; for(let i=0;i<res.nx;i++) xs.push(res.xRange[0]+(res.xRange[1]-res.xRange[0])*i/(res.nx-1));
  const ys=[]; for(let j=0;j<res.ny;j++) ys.push(res.yRange[0]+(res.yRange[1]-res.yRange[0])*j/(res.ny-1));
  Plotly.newPlot(div,[{x:xs,y:ys,z:res.grid,type:'heatmap',colorscale:'Viridis',showscale:false}],{margin:{t:20,r:20,b:45,l:55},xaxis:{title:'initial x'},yaxis:{title:'initial y'}},{responsive:true,displaylogo:false});
  Kit&&Kit.attachPlotExport&&Kit.attachPlotExport(div,'workbench-basin-map');
}
function install(){
  const grid=document.getElementById('analysisGrid')||document.querySelector('main');
  if(!grid||document.getElementById('v711SciencePanel')) return;
  const panel=document.createElement('section');
  panel.id='v711SciencePanel';
  panel.className='mw-card v711-science-panel';
  panel.innerHTML=`<div class="mw-card-head"><div><p class="mw-eyebrow">V71.1 SCIENTIFIC INTEGRATION</p><h3>Data fitting, uncertainty, stochastic envelopes and basin maps</h3></div></div>
  <div class="v711-grid">
    <article class="v711-block"><h4>Experimental overlay + parameter fit</h4>
      <label>Observed data <textarea id="v711ObsData" rows="7">time,value
0,1.1
1,2.2
2,3.8
3,5.9
4,7.5
5,8.8
6,9.5</textarea></label>
      <div class="v711-row"><label>Fit model <select id="v711FitModel"><option value="logistic">Logistic</option><option value="linear">Linear</option><option value="exponential">Exponential</option><option value="decay">Exponential decay</option><option value="michaelis">Michaelis-Menten</option></select></label><label>Initial parameters <input id="v711Theta" placeholder="optional comma-separated values"></label></div>
      <button id="v711RunFit" type="button" class="analysis-run">Fit data</button><pre id="v711FitOutput" class="analysis-output" aria-live="polite"></pre><div id="v711FitPlot" class="analysis-plot"></div>
    </article>
    <article class="v711-block"><h4>Seeded stochastic envelope</h4>
      <div class="v711-row"><label>Seed <input id="v711Seed" type="number" value="123"></label><label>Runs <input id="v711Runs" type="number" value="80" min="10" max="500"></label><label>τ <input id="v711Tau" type="number" value="0.5" step="0.1"></label></div>
      <button id="v711RunStoch" type="button" class="analysis-run">Run SIR tau-leaping ensemble</button><pre id="v711StochOutput" class="analysis-output" aria-live="polite"></pre><div id="v711StochPlot" class="analysis-plot"></div>
    </article>
    <article class="v711-block"><h4>Initial-condition basin map</h4>
      <div class="v711-row"><label>Control a <input id="v711BasinA" type="number" value="0" step="0.05"></label><label>Grid <input id="v711BasinN" type="number" value="60" min="20" max="120"></label></div>
      <button id="v711RunBasin" type="button" class="analysis-run">Compute basin map</button><pre id="v711BasinOutput" class="analysis-output" aria-live="polite"></pre><div id="v711BasinPlot" class="analysis-plot"></div>
    </article>
  </div>`;
  grid.appendChild(panel);
  const fmt=x=>(Kit&&Kit.formatResult)?Kit.formatResult(x,{json:true,digits:5}):JSON.stringify(x,null,2);
  document.getElementById('v711RunFit').addEventListener('click',()=>{
    try{const fit=runFitCore(document.getElementById('v711ObsData').value,document.getElementById('v711FitModel').value,document.getElementById('v711Theta').value);document.getElementById('v711FitOutput').textContent=fmt({model:fit.kind,names:fit.names,theta:fit.theta,ci:fit.ci,rmse:fit.rmse,aic:fit.aic,bic:fit.bic});plotFit(document.getElementById('v711FitPlot'),fit);}catch(e){document.getElementById('v711FitOutput').textContent=e.message;}});
  document.getElementById('v711RunStoch').addEventListener('click',()=>{
    const res=sirTauEnsemble({seed:Number(document.getElementById('v711Seed').value)||123,runs:Number(document.getElementById('v711Runs').value)||80,tau:Number(document.getElementById('v711Tau').value)||.5});document.getElementById('v711StochOutput').textContent=fmt({runs:res.runs,seed:res.seed,summary:'median and 5–95% infected envelope'});plotSir(document.getElementById('v711StochPlot'),res);});
  document.getElementById('v711RunBasin').addEventListener('click',()=>{
    const res=cubicBasin({a:Number(document.getElementById('v711BasinA').value)||0,nx:Number(document.getElementById('v711BasinN').value)||60,ny:Number(document.getElementById('v711BasinN').value)||60});document.getElementById('v711BasinOutput').textContent=fmt({grid:[res.nx,res.ny],classes:'left/right attractor proxy'});plotBasin(document.getElementById('v711BasinPlot'),res);});
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();}
const api={parseObservations,modelFactory,parseTheta,runFitCore,makePredictionGrid,uncertaintyBand,sirTauEnsemble,cubicBasin};
if(typeof module!=='undefined'&&module.exports) module.exports=api;
root.FokoWorkbenchScience=api;
}(typeof window!=='undefined'?window:globalThis));