(function(root){'use strict';
const DEFAULT={
  preset:'classification', mode:'logistic', plot:'auto', featureCols:'1,2', targetCol:'3', trainShare:'0.7', k:'3', threshold:'2.5',
  data:'x1,x2,label\n1.0,1.1,0\n1.3,0.8,0\n0.9,1.4,0\n1.6,1.0,0\n4.8,5.1,1\n5.3,4.9,1\n4.6,5.5,1\n5.2,5.6,1\n7.8,1.2,1\n8.0,1.0,1\n7.4,1.5,1'
};
const PRESETS={
  classification:Object.assign({},DEFAULT),
  regression:{preset:'regression',mode:'linear',plot:'scatter',featureCols:'1',targetCol:'2',trainShare:'0.7',k:'3',threshold:'2.5',data:'x,target\n0,1\n1,2.2\n2,4.1\n3,5.9\n4,8.2\n5,10.1\n6,12.1'},
  clusters:{preset:'clusters',mode:'kmeans',plot:'scatter',featureCols:'1,2',targetCol:'2',trainShare:'0.7',k:'3',threshold:'2.5',data:'x1,x2\n1,1\n1.1,0.8\n0.9,1.3\n5,5\n5.4,4.8\n4.7,5.3\n8,1\n8.2,1.1\n7.6,0.8'},
  anomaly:{preset:'anomaly',mode:'anomaly',plot:'scatter',featureCols:'1,2',targetCol:'2',trainShare:'0.7',k:'3',threshold:'2.5',data:'x1,x2\n1.0,1.1\n1.2,1.0\n0.9,1.3\n1.1,0.9\n5.1,5.2\n5.0,4.9\n4.8,5.3\n9.5,0.5'}
};
function $(id){return document.getElementById(id);}
function sigmoid(z){return 1/(1+Math.exp(-Math.max(-40,Math.min(40,z))));}
function formatResult(obj){const kit=root.FokoKit; return kit&&kit.formatResult?kit.formatResult(obj,{json:true,digits:6}):JSON.stringify(obj,(k,v)=>Number.isFinite(v)?Number(v.toFixed(6)):v,2);}
function parseCols(v){return String(v||'1,2').split(/[,;\s]+/).map(Number).filter(Number.isFinite);}
function predictLinear(beta,x){return (beta[0]||0)+x.reduce((s,v,i)=>s+(beta[i+1]||0)*v,0);}
function controls(state,onChange){
  const wrap=document.createElement('div'); wrap.className='analysis-panel';
  wrap.innerHTML=`<h2>Machine-learning diagnostic</h2>
  <div class="analysis-subgrid cols-3">
    <label>Example<select id="mlPreset"><option value="classification">Binary classification</option><option value="regression">Continuous regression</option><option value="clusters">Clustering</option><option value="anomaly">Anomaly screening</option></select></label>
    <label>Mode<select id="mlMode"><option value="logistic">Logistic regression</option><option value="knn">kNN classifier</option><option value="linear">Linear regression</option><option value="kmeans">k-means clustering</option><option value="pca">PCA projection</option><option value="validation">Validation report</option><option value="anomaly">Anomaly detection</option></select></label>
    <label>Plot<select id="mlPlotMode"><option value="auto">Automatic</option><option value="scatter">Scatter / projection</option><option value="decision">Decision boundary</option><option value="roc">ROC curve</option><option value="pr">Precision-recall</option><option value="confusion">Confusion matrix</option><option value="loss">Loss curve</option><option value="residual">Residual plot</option><option value="elbow">Elbow curve</option><option value="silhouette">Silhouette plot</option></select></label>
  </div>
  <label>CSV / numeric table<textarea id="mlData" rows="12"></textarea></label>
  <div class="analysis-subgrid cols-4"><label>Feature columns<input id="mlFeatureCols" value="1,2"/></label><label>Target column<input id="mlTargetCol" type="number" value="3" min="1"/></label><label>Train share<input id="mlTrainShare" type="number" value="0.7" min="0.5" max="0.9" step="0.05"/></label><label>k / threshold<input id="mlK" type="number" value="3" min="1" step="1"/></label></div>
  <label>Anomaly z-threshold<input id="mlThreshold" type="number" value="2.5" min="1" step="0.1"/></label>
  <div class="analysis-button-row"><button class="analysis-run" id="mlRun" type="button">Run ML diagnostic</button><button class="analysis-secondary" id="mlCopy" type="button">Copy summary</button></div>`;
  function current(){return {preset:$('#mlPreset').value,mode:$('#mlMode').value,plot:$('#mlPlotMode').value,featureCols:$('#mlFeatureCols').value,targetCol:$('#mlTargetCol').value,trainShare:$('#mlTrainShare').value,k:$('#mlK').value,threshold:$('#mlThreshold').value,data:$('#mlData').value};}
  function setState(s){$('#mlPreset').value=s.preset||'classification';$('#mlMode').value=s.mode||'logistic';$('#mlPlotMode').value=s.plot||'auto';$('#mlFeatureCols').value=s.featureCols||'1,2';$('#mlTargetCol').value=s.targetCol||'3';$('#mlTrainShare').value=s.trainShare||'0.7';$('#mlK').value=s.k||'3';$('#mlThreshold').value=s.threshold||'2.5';$('#mlData').value=s.data||DEFAULT.data;onChange(current());}
  setTimeout(()=>{setState(Object.assign({},DEFAULT,state));wrap.querySelectorAll('textarea,input,select').forEach(el=>el.addEventListener('input',()=>onChange(current())));$('#mlPreset').addEventListener('change',()=>{setState(PRESETS[$('#mlPreset').value]||DEFAULT);wrap.dispatchEvent(new CustomEvent('foko-shell-run',{bubbles:true}));});const mlRun=$('#mlRun'); if(mlRun) mlRun.addEventListener('click',()=>{onChange(current());wrap.dispatchEvent(new CustomEvent('foko-shell-run',{bubbles:true}));}); const mlCopy=$('#mlCopy'); if(mlCopy) mlCopy.addEventListener('click',()=>navigator.clipboard&&navigator.clipboard.writeText($('#mlOutput')?$('#mlOutput').textContent:''));setTimeout(()=>wrap.dispatchEvent(new CustomEvent('foko-shell-run',{bubbles:true})),25);},0);
  return wrap;
}
function schema(state){const input=Object.assign({},DEFAULT,state||{}); if(!String(input.data||'').trim())throw new Error('ML Toolkit needs a CSV or numeric table.'); if(!['logistic','knn','linear','kmeans','pca','validation','anomaly'].includes(input.mode))throw new Error('Unknown ML mode: '+input.mode); return input;}
function engine(input){
  const M=root.FokoMLLite; if(!M)throw new Error('FokoMLLite core is not loaded.');
  const table=M.parseTable(input.data); if(!table.rows.length)throw new Error('No numeric rows detected.');
  const featureCols=parseCols(input.featureCols); const targetCol=Number(input.targetCol)||(table.rows[0]?table.rows[0].length:featureCols.length+1); const data=M.pickFeatures(table.rows,featureCols,targetCol);
  const share=Math.min(0.9,Math.max(0.5,Number(input.trainShare)||0.7)), k=Math.max(1,Number(input.k)||3), threshold=Number(input.threshold)||2.5; let res={};
  if(input.mode==='kmeans'){res=M.kmeans(data.X,k);res.silhouette=M.silhouetteScore(data.X,res.labels);res.elbow=M.elbowCurve(data.X,Math.min(10,k+5));}
  else if(input.mode==='pca'){res=M.pca2(data.X);}
  else if(input.mode==='linear'){const sp=M.trainTestSplit(data.X,data.y,share); const model=M.linearRegression(sp.Xtr,sp.ytr); const pred=sp.Xte.map(x=>predictLinear(model.coefficients,x)); const resid=pred.map((p,i)=>sp.yte[i]-p); const mse=resid.reduce((s,r)=>s+r*r,0)/Math.max(1,resid.length); res={model,testPred:{true:sp.yte,pred,resid,rmse:Math.sqrt(mse)}}; res.featureImportance=M.featureImportanceLinear(model,featureCols.map(i=>'column_'+i));}
  else if(input.mode==='logistic'){res=M.logisticRegression(data.X,data.y,0.2,700); res.metrics=M.confusion(data.y,res.pred); res.roc=M.roc(data.y,res.probs); res.precisionRecall=M.precisionRecall(data.y,res.probs); res.thresholdSweep=M.logisticThresholdSweep(data.y,res.probs);}
  else if(input.mode==='knn'){res=M.knnClassify(data.X,data.y,k,share); res.crossValidation=M.knnCrossValidation(data.X,data.y,[1,3,5,7].filter(v=>v<=data.X.length),5);}
  else if(input.mode==='validation'){const scaled=M.normalizeFeatures(data.X); const lr=M.logisticRegression(scaled.X,data.y,0.15,500); res={normalization:{means:scaled.means,sds:scaled.sds},logistic:{metrics:M.confusion(data.y,lr.pred),thresholdSweep:M.logisticThresholdSweep(data.y,lr.probs),lossHistory:lr.lossHistory},knnCV:M.knnCrossValidation(scaled.X,data.y,[1,3,5,7].filter(v=>v<=scaled.X.length),5)};}
  else if(input.mode==='anomaly'){res=M.anomalyDetect(data.X,threshold);}
  return {table,data,result:res,mode:input.mode,plot:input.plot,text:formatResult(res),script:JSON.stringify({tool:'Foko ML Toolkit',descriptor:'src/labs/ml.js',mode:input.mode,plot:input.plot,featureCols,targetCol,trainShare:share,k,threshold},null,2)};
}
function result(output){const box=document.createElement('div'); box.className='analysis-panel'; box.innerHTML='<h2>ML diagnostics</h2><pre class="analysis-output" id="mlOutput"></pre><h3>Reproducibility macro</h3><pre class="analysis-output analysis-script" id="mlScript"></pre>'; box.querySelector('#mlOutput').textContent=output.text; box.querySelector('#mlScript').textContent=output.script; return box;}
function choose(mode,plot){if(plot&&plot!=='auto')return plot; if(mode==='logistic')return 'roc'; if(mode==='knn')return 'confusion'; if(mode==='linear')return 'scatter'; if(mode==='kmeans')return 'scatter'; if(mode==='pca')return 'scatter'; if(mode==='validation')return 'loss'; if(mode==='anomaly')return 'scatter'; return 'scatter';}
function plot(input,output,host){const slot=(host&&host.dataset&&host.dataset.plotSlot)||'primary'; const plotId='mlPlot_'+slot; host.innerHTML='<div class="analysis-plot" id="'+plotId+'"></div>'; const el=host.querySelector('#'+plotId); if(!root.Plotly||!el)return; const X=output.data.X,y=output.data.y,res=output.result,mode=output.mode,pm=choose(mode,output.plot),x1=X.map(r=>r[0]),x2=X.map(r=>r[1]||0); let traces=[],layout={margin:{t:28,r:20,b:48,l:54},paper_bgcolor:'#fff',plot_bgcolor:'#fff'};
  if((mode==='kmeans'||mode==='pca'||mode==='anomaly')&&pm==='scatter'){const xx=mode==='pca'?res.projection.map(r=>r[0]):x1, yy=mode==='pca'?res.projection.map(r=>r[1]):x2, color=mode==='kmeans'?res.labels:(mode==='anomaly'?res.flags:y); traces=[{x:xx,y:yy,mode:'markers',type:'scatter',marker:{color},name:mode}]; layout.xaxis={title:mode==='pca'?'PC1':'x1'}; layout.yaxis={title:mode==='pca'?'PC2':'x2'};}
  else if((mode==='logistic'||mode==='knn')&&(pm==='scatter'||pm==='decision')){const color=mode==='logistic'?res.pred:y; traces=[{x:x1,y:x2,mode:'markers',type:'scatter',marker:{color},text:y.map(String),name:'data'}]; if(pm==='decision'&&mode==='logistic'&&X[0].length>=2){const xs=[],ys=[],zs=[]; const minx=Math.min(...x1)-1,maxx=Math.max(...x1)+1,miny=Math.min(...x2)-1,maxy=Math.max(...x2)+1; for(let i=0;i<40;i++)xs.push(minx+(maxx-minx)*i/39); for(let j=0;j<40;j++)ys.push(miny+(maxy-miny)*j/39); for(let j=0;j<ys.length;j++){const row=[]; for(let i=0;i<xs.length;i++)row.push(sigmoid(res.weights[0]+res.weights[1]*xs[i]+res.weights[2]*ys[j])); zs.push(row);} traces.unshift({x:xs,y:ys,z:zs,type:'contour',opacity:0.45,showscale:false,contours:{start:0,end:1,size:0.2},colorscale:'Blues'});} layout.yaxis={scaleanchor:'x'};}
  else if(mode==='linear'&&pm==='scatter'){const xx=res.testPred.true.map((_,i)=>i+1); traces=[{x:xx,y:res.testPred.true,mode:'markers',type:'scatter',name:'observed'},{x:xx,y:res.testPred.pred,mode:'lines+markers',type:'scatter',name:'predicted'}];}
  else if(mode==='linear'&&pm==='residual'){traces=[{x:res.testPred.pred,y:res.testPred.resid,mode:'markers',type:'scatter',name:'residuals'}]; layout.xaxis={title:'predicted'}; layout.yaxis={title:'residual'};}
  else if(mode==='logistic'&&pm==='roc'){const curve=res.roc; traces=[{x:curve.map(o=>o.fpr),y:curve.map(o=>o.tpr),mode:'lines+markers',type:'scatter',name:'ROC'}]; layout.xaxis={title:'FPR',range:[0,1]}; layout.yaxis={title:'TPR',range:[0,1]};}
  else if(mode==='logistic'&&pm==='pr'){const curve=res.precisionRecall; traces=[{x:curve.map(o=>o.recall),y:curve.map(o=>o.precision),mode:'lines+markers',type:'scatter',name:'Precision-Recall'}]; layout.xaxis={title:'Recall',range:[0,1]}; layout.yaxis={title:'Precision',range:[0,1]};}
  else if((mode==='logistic'||mode==='knn')&&pm==='confusion'){const c=mode==='knn'?res.metrics:res.metrics; traces=[{z:[[c.tn,c.fp],[c.fn,c.tp]],x:['pred 0','pred 1'],y:['true 0','true 1'],type:'heatmap',colorscale:'Viridis'}];}
  else if((mode==='logistic'||mode==='validation')&&pm==='loss'){const h=mode==='validation'?res.logistic.lossHistory:res.lossHistory; traces=[{x:h.map(o=>o.epoch),y:h.map(o=>o.loss),mode:'lines+markers',type:'scatter',name:'log loss'}]; layout.xaxis={title:'epoch'}; layout.yaxis={title:'loss'};}
  else if(mode==='kmeans'&&pm==='elbow'){const c=res.elbow; traces=[{x:c.map(o=>o.k),y:c.map(o=>o.inertia),mode:'lines+markers',type:'scatter',name:'inertia'}]; layout.xaxis={title:'k'}; layout.yaxis={title:'within-cluster SSE'};}
  else if(mode==='kmeans'&&pm==='silhouette'){const s=res.silhouette; traces=[{x:s.values.map((_,i)=>i+1),y:s.values,type:'bar',name:'silhouette'}]; layout.yaxis={title:'silhouette',range:[-1,1]};}
  else traces=[{x:x1,y:x2,mode:'markers',type:'scatter',name:'data'}];
  root.Plotly.newPlot(el,traces,layout,{responsive:true,displaylogo:false});
}
function secondaryPlot(input,output,host){const pm=choose(output.mode,output.plot);const map={roc:'pr',pr:'roc',confusion:'scatter',scatter:'confusion',decision:'roc',loss:'confusion',residual:'scatter',importance:'scatter',elbow:'silhouette',silhouette:'elbow'};plot(input,Object.assign({},output,{plot:map[pm]||'scatter'}),host);} 
function mount(){const contract=$('mlContracts'); if(contract)contract.remove(); root.FokoPlatform.registerLab({id:'ml',title:'ML Toolkit',category:'Data / Analysis',schema,template:DEFAULT,Controls:controls,Result:result,Plot:plot,PlotSecondary:secondaryPlot,engine}); root.FokoPlatform.mount($('mlShellApp'),'ml');}
if(typeof module!=='undefined'&&module.exports)module.exports={DEFAULT,schema,engine};
if(typeof document!=='undefined'){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount):mount();}
}(typeof window!=='undefined'?window:globalThis));
