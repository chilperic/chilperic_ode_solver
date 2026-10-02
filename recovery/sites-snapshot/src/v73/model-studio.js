/* Foko Lab Model Studio — one editable ODE project, simulations, sweeps and plot evidence. */
(function (root) {
  'use strict';
  const Project = root.FokoProjectCore, ODE = root.FokoODECore, IR = root.FokoModelIR, Importer = root.FokoModelImport, PLOT = root.FokoPlotLifecycle, LIVE3D = root.FokoLive3D;
  const PRESETS = root.FokoModelStudioPresets || {};
  if (!Project || !ODE || !IR || !Importer || !PLOT || !LIVE3D) throw new Error('Model Studio requires the project, Model IR, model import, ODE, live 3D, and plot lifecycle cores.');
  const $ = id => document.getElementById(id), clone = value => JSON.parse(JSON.stringify(value));
  const STORAGE_KEY = 'fokolab:v73:model-studio-project';
  const colours = ['#007f8b','#7c3aed','#ea580c','#2563eb','#be123c','#16a34a','#a16207','#0891b2'];
  const meta = {
    trajectory:['Trajectories','State trajectories','Each line is one computed state against time. Different units can make direct magnitude comparisons misleading.'],
    normalized:['Normalized trajectories','Range-normalized trajectories','Each state is rescaled to [0,1] over this run. Shape is preserved; absolute units and amplitudes are removed.'],
    heatmap:['State × time heatmap','Normalized state-time heatmap','Rows are states, columns are time, and color is within-state range-normalized value.'],
    phase2d:['2D phase portrait','Two-state phase portrait','The first two states define the plane. The curve is colored independently of speed and is not a vector field.'],
    'phase-time':['Phase portrait colored by time','Phase geometry with time encoding','X and Y are the first two states; marker color is time. This is a three-variable visual encoding, not a third state.'],
    phase3d:['Live 3D phase portrait','Live three-state phase portrait','The first three computed states define x, y, and z; the playback control reveals their trajectory through simulation time while preserving the camera. This view requires at least three states.'],
    parallel:['Parallel coordinates','Multistate trajectory slices','Each line is one sampled time point across all state axes. Axes retain their individual numerical scales.'],
    radar:['Final-state radar','Final state within observed range','Each spoke is the final value normalized within that state’s computed min–max range.'],
    derivative:['Derivative heatmap','State velocity through time','Color is the finite-difference estimate dx/dt from the computed trajectory, retaining each state’s units per time.'],
    correlation:['Correlation heatmap','Trajectory state correlation','Pearson correlation is computed across sampled time points. Shared trends can produce correlation without direct coupling.'],
    'solver-step':['Adaptive step size','Solver step-size evidence','Accepted and rejected internal attempts expose adaptation. Fixed-step runs do not provide local error control.'],
    'local-error':['Scaled local error','Adaptive local-error evidence','The RK acceptance threshold is one. This is a local embedded estimate, not global trajectory error.'],
    'response-heatmap':['Response heatmap','Two-parameter response heatmap','Axes are declared parameter ranges; color is the selected scalar model output. Other parameters remain nominal.'],
    'response-contour':['Response contour','Two-parameter response contours','Contour geometry is interpolated only across the finite rectangular grid shown.'],
    'response-surface':['3D response surface','Three-dimensional response surface','X and Y are parameters and Z is the selected scalar output. This is a finite deterministic sweep.']
  };
  root.FokoModelStudioPlotMeta = Object.freeze(meta);
  const state = { project:null, result:null, sweep:null, plot:{left:'trajectory',right:'heatmap'}, layout:'two', focus:'left', dirty:true, revision:0, serial:0, active:null, tablePage:0, saveTimer:null, live3d:{index:0,playing:false,timer:0} };
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function finite(value,label){if(value==null||typeof value==='boolean'||(typeof value==='string'&&!value.trim()))throw new Error(`${label} must be a number, not blank.`);const number=Number(value);if(!Number.isFinite(number))throw new Error(`${label} must be finite.`);return number;}
  function format(value){const number=Number(value);if(!Number.isFinite(number))return '—';return number!==0&&(Math.abs(number)>=1e5||Math.abs(number)<1e-3)?number.toExponential(3):number.toFixed(4).replace(/\.?0+$/,'');}
  function setRunState(kind,message) {
    document.body.dataset.runState=kind;
    $('studioTopStatus').textContent={ready:'Ready',running:'Running',completed:'Current result',outdated:'Inputs changed',failed:'Failed',cancelled:'Cancelled'}[kind]||kind;
    if(message)$('studioStatus').textContent=message;
    $('studioStatus').dataset.state=kind;
    $('cancelStudioRun').disabled=kind!=='running';$('cancelStudioRun').hidden=kind!=='running';
    document.querySelector('.workspace')?.setAttribute('aria-busy',String(kind==='running'));
    $('studioProgress').hidden=kind!=='running';
  }
  function invalidateRun(){if(state.active){state.active.cancel();state.active=null;}state.serial+=1;}
  function clearResults(message){
    stopStudio3D();state.dirty=true;state.result=null;state.sweep=null;
    $('exportStudioResults').disabled=true;
    $('studioDataView').hidden=true;
    ['left','right'].forEach(side=>PLOT.clear($(side+'StudioPlot'),message||'Run the model to create this plot.'));
    syncStudio3DControls();
  }
  function queueSave(){
    clearTimeout(state.saveTimer);
    state.saveTimer=setTimeout(()=>{
      try{const project=readProject(),persisted=root.FokoStorage.local.setItem(STORAGE_KEY,JSON.stringify(project));$('studioSaveState').textContent=persisted?'Saved in this browser · export a file for backup.':'Session-only storage · export before leaving this page.';}
      catch(_){$('studioSaveState').textContent='Incomplete input · last valid local save retained.';}
    },450);
  }
  function markDirty(message){
    invalidateRun();state.revision+=1;clearResults('Inputs changed. Run again for current results.');renderEquationPreview();
    $('studioResultKind').textContent='Outdated · run the current inputs';setRunState('outdated',message);queueSave();
  }
  function cancelRun(){invalidateRun();clearResults('Run cancelled. No partial result was published.');$('studioResultKind').textContent='Cancelled · no current result';setRunState('cancelled','Run cancelled. Your model and recorded experiments are unchanged.');}
  async function executeExperiment(kind,settings={}){
    invalidateRun();const project=Project.normalize(readProject()),revision=state.revision,serial=state.serial;
    root.FokoStudioCompute.compile(project.model,root.math);
    clearResults('Computing the current inputs…');setRunState('running','Computing locally…');$('studioProgress').value=0;
    const job=root.FokoStudioExecutor.start({kind,model:project.model,settings},(fraction,message)=>{
      if(revision!==state.revision||serial!==state.serial)return;
      $('studioProgress').value=Math.max(0,Math.min(1,fraction));$('studioStatus').textContent=message||'Computing…';
    });state.active=job;
    try{
      const {result,execution}=await job.promise;
      if(revision!==state.revision||serial!==state.serial)return null;
      return {project,result,execution};
    }catch(error){if(revision===state.revision&&serial===state.serial&&error.name!=='AbortError')throw error;return null;}
    finally{if(state.active===job)state.active=null;}
  }

  function blank(){return Project.create({name:'Untitled project',model:{name:'Untitled ODE model',vars:['x'],eqs:['0'],y0:[1],params:{p1:[1,0,2]},t0:0,t1:20,points:400,method:'rk45',rtol:1e-6,atol:1e-9,description:'Describe the system, assumptions, and intended use.',question:'What should this model help you investigate?'}});}
  function projectFromPreset(preset){return Project.create({name:preset.title+' study',domain:preset.family,description:preset.note,model:Object.assign(clone(preset),{name:preset.title,description:preset.note,question:preset.question})});}
  function latexName(name){return '\\mathrm{' + String(name).replace(/_/g,'\\_') + '}';}
  function renderEquationPreview(){
    const target=$('studioEquationPreview');if(!target||!state.project)return;const model=state.project.model;
    try{
      const equations=model.eqs.map((expression,index)=>`\\frac{d ${latexName(model.vars[index])}}{d t} &= ${root.math.parse(String(expression)).toTex({parenthesis:'keep'})}`);
      const t0=$('studioT0')&&$('studioT0').value!==''?$('studioT0').value:model.t0;
      const initials=model.vars.map((name,index)=>`${latexName(name)}(${t0})=${format(model.y0[index])}`).join(',\\;');
      const parameters=Object.entries(model.params).map(([name,row])=>`${latexName(name)}=${format(row[0])}`).join(',\\;');
      const source=`\\begin{aligned}${equations.join('\\\\[3pt]')}\\\\[6pt]\\text{initial: }&${initials}${parameters?`\\\\[3pt]\\text{parameters: }&${parameters}`:''}\\end{aligned}`;
      target.dataset.invalid='false';root.FokoMathRender.render(target,source,{displayMode:true,throwOnError:true});
    }catch(error){target.dataset.invalid='true';target.textContent='Equation preview unavailable: '+(error.message||error);}
  }
  function renderTable(rootId, headers, rows, onEdit, onDelete, readonly){
    const host=$(rootId);host.innerHTML='';const head=document.createElement('div');head.className='table-head';headers.forEach(text=>{const cell=document.createElement('div');cell.textContent=text;head.append(cell);});if(onDelete)head.append(document.createElement('div'));host.append(head);
    rows.forEach((row,rowIndex)=>{const line=document.createElement('div');line.className='table-row';row.forEach((value,columnIndex)=>{const input=document.createElement('input');input.value=value;input.setAttribute('aria-label',`${headers[columnIndex]} row ${rowIndex+1}`);if((readonly||[]).includes(columnIndex))input.readOnly=true;else input.addEventListener('input',()=>{onEdit(rowIndex,columnIndex,input.value);markDirty('Model edited. Run to compute fresh evidence.');});line.append(input);});const del=document.createElement('button');del.type='button';del.className='delete';del.textContent='×';del.setAttribute('aria-label',`Delete row ${rowIndex+1}`);del.disabled=!onDelete;del.addEventListener('click',()=>{if(onDelete){onDelete(rowIndex);renderModel();markDirty('Model structure changed.');}});if(onDelete)line.append(del);host.append(line);});
  }
  function renderModel(){
    const model=state.project.model;
    $('studioProjectName').value=state.project.name;$('studioQuestion').value=model.question||state.project.description||'';
    // Event handlers always edit the current project. Normalization, autosave and
    // completed runs replace project objects; capturing an old model loses edits.
    renderTable('studioStateRows',['state','d(state)/dt'],model.vars.map((name,index)=>[name,model.eqs[index]]),
      (row,column,value)=>{const current=state.project.model;if(column===0)current.vars[row]=value;else current.eqs[row]=value;},
      row=>{const current=state.project.model;if(current.vars.length<=1)return;current.vars.splice(row,1);current.eqs.splice(row,1);current.y0.splice(row,1);});
    renderTable('studioInitialRows',['state','initial','unit'],model.vars.map((name,index)=>[name,model.y0[index],model.units?.[name]||'']),
      (row,column,value)=>{const current=state.project.model;if(column===1)current.y0[row]=value;else if(column===2){current.units||={};current.units[current.vars[row]]=value;}},null,[0]);
    const entries=Object.entries(model.params);
    renderTable('studioParameterRows',['parameter','value','min','max'],entries.map(([name,value])=>[name,...value]),
      (row,column,value)=>{const current=state.project.model,rows=Object.entries(current.params);if(column===0){rows[row][0]=value;current.params=Object.fromEntries(rows);}else current.params[rows[row][0]][column-1]=value;},
      row=>{const current=state.project.model;delete current.params[Object.keys(current.params)[row]];});
    $('studioTimeUnit').value=model.timeUnit==='unspecified'?'':model.timeUnit||'';
    $('studioT0').value=model.t0;$('studioT1').value=model.t1;$('studioPoints').value=model.points;$('studioMethod').value=model.method;
    $('studioRtol').value=model.rtol;$('studioAtol').value=model.atol;$('studioInitialStep').value=model.initialStep==='auto'?'':model.initialStep;
    $('studioMaxStep').value=model.maxStep==='auto'?'':model.maxStep;
    refreshSelectors();$('studioStateCount').textContent=model.vars.length;$('studioParameterCount').textContent=Object.keys(model.params).length;renderEquationPreview();renderLedger();
  }
  function refreshSelectors(){
    const params=Object.keys(state.project.model.params),vars=state.project.model.vars;[['studioSweepX',params],['studioSweepY',params],['studioSweepOutput',vars]].forEach(([id,values])=>{const select=$(id),current=select.value;select.innerHTML=values.map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');select.value=values.includes(current)?current:(id==='studioSweepY'?(values[1]||values[0]||''):(values[0]||''));});
  }
  function readProject(){
    const model=state.project.model;state.project.name=$('studioProjectName').value.trim()||'Untitled project';model.name=state.project.name.replace(/\s+study$/i,'')||'Untitled ODE model';model.question=$('studioQuestion').value.trim();model.timeUnit=$('studioTimeUnit').value.trim()||'unspecified';model.t0=$('studioT0').value;model.t1=$('studioT1').value;model.points=$('studioPoints').value;model.method=$('studioMethod').value;model.rtol=$('studioRtol').value;model.atol=$('studioAtol').value;model.initialStep=$('studioInitialStep').value||'auto';model.maxStep=$('studioMaxStep').value||'auto';
    state.project=Project.normalize(state.project);refreshSelectors();return state.project;
  }
  function compile(model){return root.FokoStudioCompute.compile(model,root.math);}
  function solverConfig(model,override){return {vars:model.vars,y0:model.y0,t0:model.t0,t1:model.t1,points:model.points,method:model.method,rtol:model.rtol,atol:model.atol,initialStep:model.initialStep,maxStep:model.maxStep,params:Object.assign({},Object.fromEntries(Object.entries(model.params).map(([name,row])=>[name,Number(row[0])])),override||{})};}
  async function runSimulation(){
    try{
      const completed=await executeExperiment('simulation');if(!completed)return;
      const {project,result,execution}=completed,model=project.model;
      state.result=result;state.live3d.index=Math.max(0,result.T.length-1);state.sweep=null;state.dirty=false;
      state.project=Project.appendRun(project,{kind:'simulation',model:model.name,configuration:{kind:'simulation'},execution,summary:{points:result.T.length,states:model.vars.length},diagnostics:{method:result.diagnostics.method,accepted:result.diagnostics.accepted,rejected:result.diagnostics.rejected,functionEvaluations:result.diagnostics.functionEvaluations,runtime:result.diagnostics.runtime,warning:result.diagnostics.warning||result.executionNotice||''}});
      updateEvidence();updatePlotOptions();syncStudio3DControls();renderPlots();renderLedger();renderData();$('exportStudioResults').disabled=false;
      setRunState('completed','Simulation complete for the current inputs.'+(result.executionNotice?' '+result.executionNotice:''));queueSave();
      root.FokoMobileTaskbar?.show('results');
    }catch(error){setFailure(error);}
  }

  function metric(result,index,kind){const values=result.Y[index];if(kind==='final')return values[values.length-1];if(kind==='max')return Math.max(...values);if(kind==='min')return Math.min(...values);if(kind==='mean')return values.reduce((sum,value)=>sum+value,0)/values.length;if(kind==='range')return Math.max(...values)-Math.min(...values);let area=0;for(let i=1;i<values.length;i++)area+=(values[i-1]+values[i])*(result.T[i]-result.T[i-1])/2;return area;}
  async function runSweep(){
    try{
      const settings={xName:$('studioSweepX').value,yName:$('studioSweepY').value,output:$('studioSweepOutput').value,metric:$('studioSweepMetric').value,grid:finite($('studioSweepGrid').value,'Grid size')};
      root.FokoStudioCompute.sweepDefinition(readProject().model,settings);
      const completed=await executeExperiment('parameter-sweep',settings);if(!completed)return;
      const {project,result,execution}=completed;state.sweep=result;state.result=null;state.dirty=false;
      state.project=Project.appendRun(project,{kind:'parameter-sweep',configuration:settings,execution,summary:settings,diagnostics:{functionEvaluations:result.evaluations,runtime:result.runtime,outputPoints:result.outputPoints}});
      $('studioResultTitle').textContent=project.model.name;$('studioResultKind').textContent=`Current ${result.grid}×${result.grid} response surface`;
      $('studioRuntime').textContent=(result.runtime/1000).toFixed(3)+' s';$('studioEvaluations').textContent=result.evaluations.toLocaleString();$('studioAccepted').textContent='—';$('studioRejected').textContent='—';
      $('studioDiagnostics').classList.remove('empty');$('studioDiagnostics').textContent=`${result.grid*result.grid} simulations; ${result.outputPoints} requested output samples per simulation. Model, ranges, method and tolerances are stored with this experiment. A response surface is not a global sensitivity decomposition.`;
      updatePlotOptions(true);state.plot.left='response-heatmap';state.plot.right='response-surface';syncPlotSelects();syncStudio3DControls();renderPlots();renderLedger();renderData();$('exportStudioResults').disabled=false;
      setRunState('completed','Response surface complete for the current inputs.'+(result.executionNotice?' '+result.executionNotice:''));queueSave();root.FokoMobileTaskbar?.show('results');
    }catch(error){setFailure(error);}
  }

  function setFailure(error){invalidateRun();clearResults('No current result. Correct the reported problem and run again.');$('studioResultKind').textContent='Failed · no current result';setRunState('failed',error.message||String(error));$('studioDiagnostics').classList.remove('empty');$('studioDiagnostics').textContent=error.message||String(error);}
  function updateEvidence(){const d=state.result.diagnostics;$('studioResultTitle').textContent=state.project.model.name;$('studioResultKind').textContent='Computed ODE trajectory';$('studioTopStatus').textContent=d.warning?'Computed with warning':'Computed';$('studioRuntime').textContent=(d.runtime/1000).toFixed(3)+' s';$('studioEvaluations').textContent=d.functionEvaluations.toLocaleString();$('studioAccepted').textContent=d.accepted.toLocaleString();$('studioRejected').textContent=d.rejected.toLocaleString();$('studioStateCount').textContent=state.project.model.vars.length;$('studioParameterCount').textContent=Object.keys(state.project.model.params).length;$('studioDiagnostics').classList.remove('empty');$('studioDiagnostics').innerHTML=`<p><b>Engine:</b> FokoODECore · <b>method:</b> ${escapeHtml(d.method)} · <b>rtol/atol:</b> ${d.rtol.toExponential(1)} / ${d.atol.toExponential(1)}</p><p><b>Accepted/rejected:</b> ${d.accepted} / ${d.rejected}. <b>Internal evaluations:</b> ${d.functionEvaluations.toLocaleString()}.</p><p><b>Stiffness evidence:</b> ${escapeHtml(d.stiffnessAssessment)}${Number.isFinite(d.localTimescaleRatio)?` (ratio ${d.localTimescaleRatio.toExponential(2)})`:''}.</p>${d.warning?`<p><b>Warning:</b> ${escapeHtml(d.warning)}</p>`:''}`;}
  function layout(title,x,y){return {annotations:[],title:{text:title},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'Inter,system-ui,sans-serif',size:12,color:getComputedStyle(document.body).getPropertyValue('--ink').trim()||'#17324d'},margin:{l:62,r:24,t:48,b:58},xaxis:{title:x,automargin:true,gridcolor:'#dfeaf1'},yaxis:{title:y,automargin:true,gridcolor:'#dfeaf1'},legend:{orientation:'h',y:-0.2}};}
  function normalizeRows(){return state.result.Y.map(row=>{const min=Math.min(...row),max=Math.max(...row),span=max-min||1;return row.map(value=>(value-min)/span);});}
  function correlation(){const rows=state.result.Y;return rows.map(a=>rows.map(b=>{const am=a.reduce((s,v)=>s+v,0)/a.length,bm=b.reduce((s,v)=>s+v,0)/b.length;let num=0,da=0,db=0;for(let i=0;i<a.length;i++){const x=a[i]-am,y=b[i]-bm;num+=x*y;da+=x*x;db+=y*y;}return num/Math.sqrt(da*db||1);}));}
  function plotSpec(type){
    const result=state.result,model=state.project.model;if(type.startsWith('response-')){if(!state.sweep)throw new Error('Run the two-parameter sweep to create this response-surface view.');const s=state.sweep,title=`${s.metric}(${s.output}) across ${s.xName} × ${s.yName}`;if(type==='response-heatmap')return {traces:[{type:'heatmap',x:s.x,y:s.y,z:s.z,colorscale:'Viridis',colorbar:{title:`${s.metric}(${s.output})`}}],layout:layout(title,s.xName,s.yName)};if(type==='response-contour')return {traces:[{type:'contour',x:s.x,y:s.y,z:s.z,colorscale:'Viridis',contours:{coloring:'heatmap',showlabels:true},colorbar:{title:`${s.metric}(${s.output})`}}],layout:layout(title,s.xName,s.yName)};return {traces:[{type:'surface',x:s.x,y:s.y,z:s.z,colorscale:'Viridis',colorbar:{title:`${s.metric}(${s.output})`}}],layout:Object.assign(layout(title,'',''),{scene:{xaxis:{title:s.xName},yaxis:{title:s.yName},zaxis:{title:`${s.metric}(${s.output})`}},margin:{l:8,r:8,t:48,b:8}})};}
    if(!result)throw new Error('Run a simulation to create this plot.');const T=result.T,Y=result.Y,vars=result.vars;
    if(type==='trajectory')return {traces:Y.map((row,index)=>({type:'scatter',mode:'lines',x:T,y:row,name:vars[index]+(model.units?.[vars[index]]?' ['+model.units[vars[index]]+']':''),line:{width:2.4,color:colours[index%colours.length],dash:['solid','dash','dot','dashdot'][index%4]}})),layout:layout('State trajectories',`time (${model.timeUnit||'unspecified units'})`,'state value · units in legend')};
    if(type==='normalized'){const rows=normalizeRows();return {traces:rows.map((row,index)=>({type:'scatter',mode:'lines',x:T,y:row,name:vars[index],line:{width:2,color:colours[index%colours.length]}})),layout:layout('Range-normalized trajectories','time','within-state [0,1]')};}
    if(type==='heatmap')return {traces:[{type:'heatmap',x:T,y:vars,z:normalizeRows(),zmin:0,zmax:1,colorscale:'Cividis',colorbar:{title:'normalized value'}}],layout:layout('Normalized state × time heatmap','time','state')};
    if((type==='phase2d'||type==='phase-time')&&vars.length<2)throw new Error('This view requires at least two states.');
    if(type==='phase2d')return {traces:[{type:'scatter',mode:'lines',x:Y[0],y:Y[1],name:`${vars[0]} vs ${vars[1]}`,line:{width:2.4,color:colours[0]}}],layout:layout('Two-state phase portrait',vars[0],vars[1])};
    if(type==='phase-time')return {traces:[{type:'scattergl',mode:'markers',x:Y[0],y:Y[1],marker:{size:5,color:T,colorscale:'Turbo',colorbar:{title:'time'}},name:'trajectory samples'}],layout:layout('Phase geometry colored by time',vars[0],vars[1])};
    if(type==='phase3d'){if(vars.length<3)throw new Error('Live 3D phase portrait requires at least three states.');return LIVE3D.trajectorySpec({t:T,y:Y,names:vars,index:state.live3d.index});}
    if(type==='parallel'){const indexes=Array.from({length:Math.min(100,T.length)},(_,i)=>Math.round(i*(T.length-1)/(Math.min(100,T.length)-1||1)));return {traces:[{type:'parcoords',line:{color:indexes.map(index=>T[index]),colorscale:'Viridis',showscale:true,colorbar:{title:'time'}},dimensions:vars.map((name,row)=>({label:name,values:indexes.map(index=>Y[row][index])}))}],layout:layout('Parallel coordinates','','')};}
    if(type==='radar'){const normalized=normalizeRows().map(row=>row[row.length-1]);return {traces:[{type:'scatterpolar',r:normalized.concat(normalized[0]),theta:vars.concat(vars[0]),fill:'toself',name:'final state'}],layout:Object.assign(layout('Final state within computed range','',''),{polar:{radialaxis:{range:[0,1],visible:true}}})};}
    if(type==='derivative'){const z=Y.map(row=>row.map((value,index)=>index===0?0:(value-row[index-1])/(T[index]-T[index-1])));return {traces:[{type:'heatmap',x:T,y:vars,z,colorscale:'RdBu',zmid:0,colorbar:{title:'dx/dt'}}],layout:layout('Finite-difference state velocity','time','state')};}
    if(type==='correlation')return {traces:[{type:'heatmap',x:vars,y:vars,z:correlation(),zmin:-1,zmax:1,zmid:0,colorscale:'RdBu',colorbar:{title:'r'}}],layout:layout('Trajectory state correlation','state','state')};
    const trace=result.diagnostics.stepTrace||{time:[],step:[],error:[],accepted:[]};
    if(type==='solver-step')return {traces:[{type:'scattergl',mode:'markers',x:trace.time,y:trace.step,marker:{size:5,color:trace.accepted.map(value=>value?0:1),colorscale:[[0,'#0f766e'],[1,'#b45309']]},name:'step attempts'}],layout:Object.assign(layout('Internal solver step size','attempt time','|h|'),{yaxis:{title:'|h|',type:'log',automargin:true}})};
    if(type==='local-error'){const x=[],y=[],accepted=[];trace.time.forEach((time,index)=>{if(Number.isFinite(trace.error[index])){x.push(time);y.push(Math.max(trace.error[index],1e-16));accepted.push(trace.accepted[index]);}});if(!x.length)throw new Error('Local error evidence requires an adaptive solver.');return {traces:[{type:'scattergl',mode:'markers',x,y,marker:{size:5,color:accepted.map(value=>value?0:1),colorscale:[[0,'#0f766e'],[1,'#b45309']]},name:'scaled error'},{type:'scatter',mode:'lines',x:[x[0],x[x.length-1]],y:[1,1],line:{dash:'dash'},name:'acceptance threshold'}],layout:Object.assign(layout('Scaled local error','attempt time','scaled error'),{yaxis:{title:'scaled error',type:'log',automargin:true}})};}
    throw new Error('Unknown plot type.');
  }
  function available(){const base=Object.keys(meta).filter(type=>!type.startsWith('response-'));return state.sweep?base.concat(['response-heatmap','response-contour','response-surface']):base;}
  function updatePlotOptions(includeSweep){const options=(includeSweep||state.sweep)?Object.keys(meta):available();['left','right'].forEach(side=>{const select=$(side+'StudioPlotType'),current=state.plot[side];select.innerHTML=options.map(type=>`<option value="${type}">${escapeHtml(meta[type][0])}</option>`).join('');if(options.includes(current))select.value=current;else{state.plot[side]=options[side==='left'?0:Math.min(1,options.length-1)];select.value=state.plot[side];}});$('studioPlotCount').textContent=`${Object.keys(meta).length} plot families`;}
  function syncPlotSelects(){['left','right'].forEach(side=>{$(side+'StudioPlotType').value=state.plot[side];});}
  function stopStudio3D(){state.live3d.playing=false;if(state.live3d.timer)root.clearTimeout(state.live3d.timer);state.live3d.timer=0;const button=$('studio3dPlay');if(button){button.textContent='▶ Play 3D';button.setAttribute('aria-pressed','false');}}
  function syncStudio3DControls(){const controls=$('studio3dControls');if(!controls)return;const selected=['left','right'].some(side=>state.plot[side]==='phase3d'),compatible=!!(state.result&&state.result.vars.length>=3);controls.hidden=!selected;const slider=$('studio3dFrame'),button=$('studio3dPlay');if(!selected)return;const length=compatible?state.result.T.length:0;state.live3d.index=LIVE3D.clampIndex(state.live3d.index,length||1);slider.max=String(Math.max(0,length-1));slider.value=String(state.live3d.index);slider.disabled=!compatible||length<2;button.disabled=!compatible||length<2;const time=compatible?state.result.T[state.live3d.index]:null;$('studio3dLabel').textContent=time==null?'Run a three-state model':`t ${format(time)} · frame ${state.live3d.index+1}/${length}`;}
  function renderStudio3D(index){if(!state.result||state.result.vars.length<3)return;state.live3d.index=LIVE3D.clampIndex(index,state.result.T.length);syncStudio3DControls();['left','right'].forEach(side=>{if(state.plot[side]==='phase3d')renderPlot(side);});}
  function scheduleStudio3D(){if(!state.live3d.playing||!state.result)return;const delay=Number($('studio3dSpeed').value)||45;if(state.live3d.timer)root.clearTimeout(state.live3d.timer);state.live3d.timer=root.setTimeout(()=>{if(!state.live3d.playing)return;const step=Math.max(1,Math.floor(state.result.T.length/180)),next=state.live3d.index+step;if(next>=state.result.T.length){stopStudio3D();$('studio3dPlay').textContent='↻ Replay 3D';return;}renderStudio3D(next);scheduleStudio3D();},delay);}
  function toggleStudio3D(){if(!state.result||state.result.vars.length<3)return;if(state.live3d.playing){stopStudio3D();return;}if(state.live3d.index>=state.result.T.length-1)renderStudio3D(0);state.live3d.playing=true;$('studio3dPlay').textContent='❚❚ Pause 3D';$('studio3dPlay').setAttribute('aria-pressed','true');scheduleStudio3D();}
  function renderPlot(side){const type=state.plot[side],details=meta[type];$(side+'StudioPlotTitle').textContent=details[1];$(side+'StudioEvidence').textContent=details[2];try{const spec=plotSpec(type);PLOT.render($(side+'StudioPlot'),spec.traces,spec.layout,{responsive:true,displaylogo:false,modeBarButtonsToRemove:['lasso2d','select2d']});}catch(error){PLOT.clear($(side+'StudioPlot'),error.message);}}
  function renderPlots(){renderPlot('left');renderPlot('right');}
  function applyLayout(mode){state.layout=mode;document.querySelectorAll('[data-layout-mode]').forEach(button=>{button.classList.toggle('active',button.dataset.layoutMode===mode);button.setAttribute('aria-pressed',String(button.dataset.layoutMode===mode));});root.FokoLayoutStability.apply({grid:$('plotGrid'),preferred:mode,focus:state.focus,breakpoint: 1024,compatibleCount:2});if(state.result||state.sweep)renderPlots();}
  function renderCatalogue(){const query=$('studioExampleSearch').value.trim().toLowerCase(),family=$('studioFamilyFilter').value,items=Object.entries(PRESETS).filter(([,preset])=>(!family||preset.family===family)&&(!query||`${preset.title} ${preset.family} ${preset.question} ${preset.note}`.toLowerCase().includes(query)));$('studioExampleCount').textContent=`${items.length} of ${Object.keys(PRESETS).length} examples`;$('studioExampleDeck').innerHTML=items.map(([id,preset])=>`<button type="button" data-studio-preset="${escapeHtml(id)}"><b>${escapeHtml(preset.title)}</b><span>${escapeHtml(preset.family)} · ${escapeHtml(preset.difficulty)}</span><small>${escapeHtml(preset.question)}</small></button>`).join('');}
  function loadPreset(id){const preset=PRESETS[id]||PRESETS[Object.keys(PRESETS)[0]];if(!preset)return;invalidateRun();state.revision+=1;clearResults();state.project=projectFromPreset(preset);state.result=null;state.sweep=null;state.dirty=true;$('studioPreset').value=id;$('studioPresetNote').textContent=preset.note;renderModel();updatePlotOptions();syncStudio3DControls();['left','right'].forEach(side=>PLOT.clear($(side+'StudioPlot'),'Run the loaded model to create this plot.'));$('studioResultKind').textContent='Ready · example is editable';setRunState('ready','Example loaded. Edit the model or run it to produce results.');queueSave();}
  function renderLedger(){
    const runs=state.project&&state.project.runs||[];
    $('studioLedger').innerHTML=runs.length?runs.slice().reverse().slice(0,8).map(run=>`<article><b>${escapeHtml(run.kind==='simulation'?'Simulation':'Parameter sweep')}</b><span>${escapeHtml(new Date(run.createdAt).toLocaleString())}</span><small>${escapeHtml(JSON.stringify(run.summary||{}).replace(/[{}"]/g,'').replace(/,/g,' · '))}</small>${run.snapshot?`<button class="secondary" type="button" data-restore-run="${escapeHtml(run.id)}">Load these inputs</button><small>Release ${escapeHtml(run.release||'unknown')} · ${escapeHtml(run.configurationFingerprint||'')}</small>`:'<small>Legacy record · complete inputs were not recorded.</small>'}</article>`).join(''):'<p class="diagnostics empty">Run an experiment to record its exact inputs here.</p>';
  }
  function renderData(){
    const host=$('studioDataView');if(!state.result&&!state.sweep){host.hidden=true;return;}host.hidden=false;
    const rows=[],headers=[];let summary='';
    if(state.result){const r=state.result,m=state.project.model;headers.push(`Time (${m.timeUnit||'unspecified'})`,...r.vars.map(name=>name+' ('+(m.units?.[name]||'unit unspecified')+')'));r.T.forEach((t,i)=>rows.push([t,...r.Y.map(y=>y[i])]));summary=r.vars.map((name,i)=>`${name}: initial ${format(r.Y[i][0])}, final ${format(r.Y[i].at(-1))}, range ${format(Math.min(...r.Y[i]))} to ${format(Math.max(...r.Y[i]))}.`).join(' ');}
    else{const r=state.sweep;headers.push(r.xName,r.yName,`${r.metric}(${r.output})`);r.y.forEach((y,j)=>r.x.forEach((x,i)=>rows.push([x,y,r.z[j][i]])));summary=`${r.grid} × ${r.grid} deterministic response surface for ${r.metric}(${r.output}). Other parameters stay at their nominal values.`;}
    const pageSize=25,total=Math.max(1,Math.ceil(rows.length/pageSize));state.tablePage=Math.min(state.tablePage,total-1);const start=state.tablePage*pageSize;
    $('studioDataSummary').textContent=summary;
    $('studioDataHead').innerHTML='<tr>'+headers.map(h=>'<th scope="col">'+escapeHtml(h)+'</th>').join('')+'</tr>';
    $('studioDataBody').innerHTML=rows.slice(start,start+pageSize).map(row=>'<tr>'+row.map(v=>'<td>'+escapeHtml(Number(v).toPrecision(8))+'</td>').join('')+'</tr>').join('');
    $('studioDataPage').textContent=`Rows ${start+1}–${Math.min(rows.length,start+pageSize)} of ${rows.length}. Full precision is retained in CSV export.`;
    $('studioDataPrev').disabled=state.tablePage===0;$('studioDataNext').disabled=state.tablePage>=total-1;
  }

  function projectFromImported(parsed){const raw=parsed&&parsed.raw;if(!raw||typeof raw!=='object')throw new Error('Imported model did not resolve to an object.');if(IR.isModelIR(raw))return Project.fromModelIR(raw,IR);if(raw.model&&IR.isModelIR(raw.model))return Project.fromModelIR(raw.model,IR);if(raw.module&&!['ode','param'].includes(String(raw.module).toLowerCase()))throw new Error('Model Studio accepts deterministic ODE models. Open the compatible specialist lab for this model type.');return Project.normalize(raw);}
  function applyImportedSource(text,name,format){try{const parsed=Importer.parse(text,name||'pasted-model.txt',{format:format||'auto'}),project=projectFromImported(parsed);invalidateRun();state.revision+=1;clearResults();state.project=project;state.result=null;state.sweep=null;state.dirty=true;if(parsed.warnings.length){state.project.model.description=[state.project.model.description].concat(parsed.warnings).filter(Boolean).join(' ');}renderModel();updatePlotOptions();syncStudio3DControls();['left','right'].forEach(side=>PLOT.clear($(side+'StudioPlot'),'Imported model is ready. Run it to generate evidence.'));const warning=parsed.warnings.length?` Review: ${parsed.warnings.join(' ')}`:'';$('studioImportStatus').textContent=`Loaded ${parsed.label} from ${name||'pasted input'}.${warning}`;$('studioResultKind').textContent='Ready · review imported inputs';setRunState('ready','Imported model loaded. Review units, initial values and solver settings before running.');queueSave();return project;}catch(error){$('studioImportStatus').textContent=`Import rejected: ${error.message||error}`;setFailure(error);return null;}}
  const TXT_EXAMPLE=`name: Logistic growth\ndx/dt = r*x*(1-x/K)\nx(0) = 2\nparam r = 0.6 [0.1, 1.2]\nparam K = 100 [40, 180]\ntime 0 15 400\nmethod: rk45`;
  function download(name,content,type){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([content],{type:type||'application/json'}));link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
  function exportResults(){
    let rows,name;
    if(state.result){rows=[['time',...state.result.vars].join(',')];state.result.T.forEach((time,index)=>rows.push([time,...state.result.Y.map(row=>row[index])].join(',')));name='foko-studio-trajectory.csv';}
    else if(state.sweep){const sw=state.sweep;rows=[[sw.xName,sw.yName,sw.output+'_'+sw.metric].join(',')];sw.y.forEach((y,j)=>sw.x.forEach((x,i)=>rows.push([x,y,sw.z[j][i]].join(','))));name='foko-studio-sweep.csv';}
    else return;
    download(name,rows.join('\n')+'\n','text/csv');
  }
  function encode(value){return btoa(unescape(encodeURIComponent(JSON.stringify(value))));}
  function encodeUrlSafe(value){const binary=unescape(encodeURIComponent(JSON.stringify(value)));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function route(kind){try{const project=readProject(),model=project.model;if(kind==='sensitivity'){const cfg={release:'78.2.0',model,analysis:{method:'local',responseSurface:false},plots:{left:'ranking',right:'heatmap'},layout:'two',focusSide:'left'};location.href='sensitivity.html?state='+encodeURIComponent(encode(cfg));return;}const cfg={schema:'fokolab-steady-config-v1',release:'78.2.0',name:project.name,model:{vars:model.vars.map((name,index)=>[name,model.y0[index]]),equations:model.eqs,params:Object.fromEntries(Object.entries(model.params).map(([name,row])=>[name,row[0]])),interpretation:'dynamic'},settings:{tolerance:'1e-9',maxIterations:'80',damping:'1',startScale:'1'},plots:{left:'equilibrium',right:'residual'},layout:{preferred:'two',focus:'left'}};location.href='steady.html?autorun=1&state='+encodeURIComponent(encodeUrlSafe(cfg));}catch(error){setFailure(error);}}
  function bind(){
    $('studioDataPrev').addEventListener('click',()=>{state.tablePage=Math.max(0,state.tablePage-1);renderData();});
    $('studioDataNext').addEventListener('click',()=>{state.tablePage+=1;renderData();});
    $('studioLedger').addEventListener('click',event=>{
      const button=event.target.closest('[data-restore-run]');if(!button)return;
      const run=state.project.runs.find(item=>item.id===button.dataset.restoreRun);if(!run?.snapshot)return;
      state.project.model=Project.normalizeModel(run.snapshot.model);renderModel();
      if(run.kind==='parameter-sweep'){const c=run.snapshot.experiment;[['studioSweepX','xName'],['studioSweepY','yName'],['studioSweepOutput','output'],['studioSweepMetric','metric'],['studioSweepGrid','grid']].forEach(([id,key])=>{if(c[key]!=null)$(id).value=c[key];});}
      markDirty('Recorded inputs loaded. Run to reproduce them; previous results are not claimed as current.');root.FokoMobileTaskbar?.show('setup');
    });
    $('loadStudioPreset').addEventListener('click',()=>loadPreset($('studioPreset').value));$('studioExampleSearch').addEventListener('input',renderCatalogue);$('studioFamilyFilter').addEventListener('change',renderCatalogue);$('studioExampleDeck').addEventListener('click',event=>{const button=event.target.closest('[data-studio-preset]');if(button)loadPreset(button.dataset.studioPreset);});
    $('addStudioState').addEventListener('click',()=>{const index=state.project.model.vars.length+1;state.project.model.vars.push('x'+index);state.project.model.eqs.push('0');state.project.model.y0.push(0);renderModel();markDirty('State added.');});$('addStudioParameter').addEventListener('click',()=>{let index=1;while(state.project.model.params['p'+index])index+=1;state.project.model.params['p'+index]=[1,0,2];renderModel();markDirty('Parameter added.');});
    $('newStudioProject').addEventListener('click',()=>{state.project=blank();renderModel();markDirty('Blank project created.');});$('cancelStudioRun').addEventListener('click',cancelRun);$('runStudio').addEventListener('click',runSimulation);$('runStudioSweep').addEventListener('click',runSweep);
    ['studioProjectName','studioQuestion','studioTimeUnit','studioT0','studioT1','studioPoints','studioMethod','studioRtol','studioAtol','studioInitialStep','studioMaxStep'].forEach(id=>$(id).addEventListener('input',()=>markDirty('Experiment inputs changed. Run to compute fresh evidence.')));
    ['studioSweepX','studioSweepY','studioSweepOutput','studioSweepMetric'].forEach(id=>$(id).addEventListener('change',()=>markDirty('Sweep inputs changed. Run again to compute this response.')));$('studioSweepGrid').addEventListener('input',()=>markDirty('Sweep resolution changed. Run again to compute this response.'));
    ['left','right'].forEach(side=>$(side+'StudioPlotType').addEventListener('change',function(){state.plot[side]=this.value;if(!['left','right'].some(candidate=>state.plot[candidate]==='phase3d'))stopStudio3D();syncStudio3DControls();renderPlot(side);}));document.querySelectorAll('[data-layout-mode]').forEach(button=>button.addEventListener('click',()=>applyLayout(button.dataset.layoutMode)));document.querySelectorAll('button[data-focus-side]').forEach(button=>button.addEventListener('click',()=>{state.focus=button.dataset.focusSide;applyLayout('focus');}));document.querySelectorAll('[data-jump]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.jump).scrollIntoView({behavior:'smooth',block:'start'})));document.querySelectorAll('[data-studio-route]').forEach(button=>button.addEventListener('click',()=>route(button.dataset.studioRoute)));
    $('studio3dPlay').addEventListener('click',toggleStudio3D);$('studio3dFrame').addEventListener('input',function(){stopStudio3D();renderStudio3D(Number(this.value));});$('studio3dSpeed').addEventListener('change',()=>{if(state.live3d.playing)scheduleStudio3D();});
    $('saveStudioProject').addEventListener('click',()=>{try{const persisted=root.FokoStorage.local.setItem(STORAGE_KEY,JSON.stringify(readProject()));$('studioStatus').textContent=persisted?'Project saved in this browser. Export Project JSON for a portable backup.':'Saved for this page session only. Browser storage is unavailable; export Project JSON before leaving.';}catch(error){setFailure(error);}});$('restoreStudioProject').addEventListener('click',()=>{try{const raw=root.FokoStorage.local.getItem(STORAGE_KEY);if(!raw)throw new Error('No saved Model Studio project exists.');state.project=Project.normalize(JSON.parse(raw));renderModel();markDirty('Project restored. Run to regenerate computed evidence.');}catch(error){setFailure(error);}});
    $('studioParseImport').addEventListener('click',()=>applyImportedSource($('studioImportText').value,'pasted model',$('studioImportFormat').value));
    $('studioImportExample').addEventListener('click',()=>{$('studioImportFormat').value='txt';$('studioImportText').value=TXT_EXAMPLE;$('studioImportText').focus();$('studioImportStatus').textContent='Plain-text example loaded. Select “Load into editor” to parse it.';});
    $('studioImport').addEventListener('change',async function(){const file=this.files&&this.files[0];if(!file)return;const text=await file.text();$('studioImportText').value=text;$('studioImportFormat').value='auto';applyImportedSource(text,file.name,'auto');this.value='';});
    const importCard=$('importBlock');['dragenter','dragover'].forEach(type=>importCard.addEventListener(type,event=>{event.preventDefault();importCard.classList.add('drag');}));['dragleave','drop'].forEach(type=>importCard.addEventListener(type,event=>{event.preventDefault();importCard.classList.remove('drag');if(type==='drop'){const file=event.dataTransfer&&event.dataTransfer.files&&event.dataTransfer.files[0];if(file)file.text().then(text=>{$('studioImportText').value=text;$('studioImportFormat').value='auto';applyImportedSource(text,file.name,'auto');}).catch(setFailure);}}));
    $('exportStudioProject').addEventListener('click',()=>{try{download('foko-project.json',JSON.stringify(readProject(),null,2));}catch(error){setFailure(error);}});$('exportStudioModelIR').addEventListener('click',()=>{try{download('foko-model-ir.json',JSON.stringify(Project.toModelIR(readProject()),null,2));}catch(error){setFailure(error);}});$('exportStudioResults').addEventListener('click',exportResults);root.addEventListener('resize',()=>applyLayout(state.layout),{passive:true});
  }
  function boot(){const keys=Object.keys(PRESETS),families=Array.from(new Set(Object.values(PRESETS).map(preset=>preset.family))).sort();$('studioPreset').innerHTML=keys.map(id=>`<option value="${id}">${escapeHtml(PRESETS[id].title)}</option>`).join('');$('studioFamilyFilter').innerHTML='<option value="">All families</option>'+families.map(family=>`<option value="${escapeHtml(family)}">${escapeHtml(family)}</option>`).join('');const intent=new URLSearchParams(location.search||'');let restored=false;
    if(intent.get('new')==='1')state.project=blank();
    else if(intent.get('preset')&&PRESETS[intent.get('preset')])state.project=projectFromPreset(PRESETS[intent.get('preset')]);
    else {try{const saved=root.FokoStorage.local.getItem(STORAGE_KEY);state.project=saved?Project.normalize(JSON.parse(saved)):blank();restored=!!saved;}catch(_){state.project=blank();}}
    bind();renderCatalogue();renderModel();updatePlotOptions();syncStudio3DControls();applyLayout('two');setRunState('ready',restored?'Last saved project restored. Run to regenerate its results.':'Define your model, import a file, or open an example. No computation has run yet.');$('studioSaveState').textContent=restored?'Restored from this browser · export for a portable backup.':'Not yet saved · edits are saved locally when valid.';$('studioPresetNote').textContent=PRESETS[keys[0]]&&PRESETS[keys[0]].note||'';if(location.hash==='#import'){const details=document.querySelector('.studio-import-disclosure');if(details)details.open=true;requestAnimationFrame(()=>$('studioImportText').focus());}}
  root.FokoModelStudio = Object.freeze({runSimulation,runSweep,cancelRun,plotSpec,availablePlots:available,currentProject:()=>clone(state.project)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}(typeof window !== 'undefined' ? window : globalThis));
