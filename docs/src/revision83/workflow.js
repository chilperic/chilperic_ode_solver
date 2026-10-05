/** One visible action contract. Native scientific handlers remain authoritative. */
(function(root){'use strict';const d=document,base=new URL('../../',d.currentScript.src);if(root.FokoWorkflow)return;
const configs={
'analysis-studio.html':['as-run','as-cancel','as-demo','as-load-demo'],
'decision-studio.html':['ds-run','ds-cancel','ds-demo',null],
'optimization.html':['runOptimization',null,'optimizationSelect','loadOptimization'],
'studio.html':['runStudio','cancelStudioRun','studioPreset','loadStudioPreset'],
'ode.html':['runBtn','cancelBtn','exampleSelect','loadExample'],
'stochastic.html':['runStochastic',null,'stochasticSelect','loadStochastic'],
'steady.html':['solveSteady',null,'steadySelect','loadSteady'],
'bifurcation.html':['runBifurcation',null,'bfPreset','loadBfPreset'],
'sensitivity.html':['runSensitivity','cancelSensitivity','sensitivitySelect','loadSensitivity'],
'fitting.html':['runFitting',null,'fittingSelect','loadFitting'],
'statistics.html':['runStatistics',null,'statisticsSelect','loadStatistics'],
'agent.html':['runAgent','cancelAgent','agentPresetSelect','loadAgentPreset'],
'population-genetics.html':['runPopulationGenetics',null,'pgExampleSelect','loadPgExample'],
'symbolic.html':['runSymbolic',null,'symbolicSelect','loadSymbolic'],
'networks.html':['runNetworks',null,'networksSelect','loadNetworks'],
'linear-algebra.html':['runLinalg',null,'linalgSelect','loadLinalg'],
'evolution.html':['runEvolution',null,'evPreset','loadEvPreset'],
'advanced-methods.html':['runAdvanced',null,'advancedSelect','loadAdvanced'],
'ai-modeling.html':['runAiModel',null,'aiExample','loadAiExample'],
'sciml.html':['sciRunAnalysis',null,null,null], 'ml.html':['mlRun',null,null,null],
'workbench.html':['wbRun',null,null,null], 'workspace.html':['runCurrent','cancelRun',null,null],
'plants/index.html':['run','cancel',null,null], 'leaf/index.html':['experiment button[type=submit]','cancel',null,null],
'lipids/index.html':['experiment button[type=submit]','cancel',null,null], 'tcells/index.html':['experiment button[type=submit]','cancel',null,null],
'random.html':['controls button[type=submit]',null,null,null], 'continuum/index.html':['run','cancel',null,null],
'continuum/advanced.html':['advRun','advCancel',null,null], 'continuum/approaches.html':['runApproach','cancelApproach',null,null]
};
for(const p of ['plant-growth','leaf-physiology','adaptation','lipids','tcell','randomness','branching','diffusion','fractals'])configs[p+'.html']=['u-run','u-cancel','u-example',null];
const route=decodeURIComponent(location.pathname).slice(base.pathname.length),C=configs[route];
let lastDraft=null,prepared=null,undo=null,phase='ready',rev=0,runRev=-1,status,run;
const q=id=>id?d.getElementById(id)||d.querySelector('#'+id):null;
const fieldKey=e=>e.id||e.name||e.getAttribute('data-param')||e.dataset.flDraftKey||null;
function fields(){const items=[...d.querySelectorAll('main input,main select,main textarea,form input,form select,form textarea,.lab-inspector input,.lab-inspector select,.lab-inspector textarea')].filter(e=>e.type!=='file');items.forEach((e,i)=>{if(!fieldKey(e))e.dataset.flDraftKey='field-'+i;});return items;}
function snapshot(){return fields().map(e=>({key:fieldKey(e),value:e.value,checked:e.checked,html:e.tagName==='SELECT'?e.innerHTML:null}));}
function inform(text){if(status)status.textContent=text;}
function beforeSelection(){lastDraft=snapshot();const sel=q(C?.[2]);if(sel&&prepared){const s=lastDraft.find(x=>x.key===fieldKey(sel));if(s)s.value=prepared;}}
function afterSelection(){prepared=q(C?.[2])?.value;undo.hidden=!lastDraft;phase='ready';rev++;inform('Example prepared. Review the inputs, then Run.');}
function boot(){
 if(d.querySelector('.fl-command'))return;if(!C)return;
 run=q(C[0]);if(!run){const f=d.getElementById(C[0].split(' ')[0]);run=f?.querySelector('button[type=submit],button:not([type])');}if(!run)return;
 const dock=d.createElement('nav');dock.className='fl-command';dock.setAttribute('aria-label','Simulation and analysis actions');
 const title=d.createElement('span');title.className='fl-command-title';title.textContent=(d.querySelector('h1')?.innerText||'Scientific workspace').replace(/\s+/g,' ').slice(0,60);
 const holder=d.createElement('div');holder.className='fl-command-actions';const form=run.form;if(form){if(!form.id)form.id='fl-science-form';run.setAttribute('form',form.id);}
 run.before(d.createComment('Primary action is in the persistent command bar'));run.dataset.originalLabel=run.textContent;run.textContent='Run';run.hidden=false;run.classList.add('fl-primary-run');holder.append(run);const cancel=q(C[1]);if(cancel){cancel.textContent='Cancel';holder.append(cancel);}
 const edit=d.createElement('button');edit.type='button';edit.textContent='Inputs';edit.onclick=()=>{if(root.LabWorkspace)root.LabWorkspace.openInspector();else{const e=d.querySelector('.as-inspector,.experiment-controls,.work-panel.controls,.controls-panel,main form,main input');if(e){let n=e;while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement;}e.scrollIntoView({block:'start'});e.querySelector('input,select,textarea')?.focus({preventScroll:true});}}};holder.append(edit);
 undo=d.createElement('button');undo.type='button';undo.hidden=true;undo.textContent='Undo example';undo.onclick=()=>{if(!lastDraft)return;const saved=lastDraft;const sel=q(C[2]),prev=saved.find(x=>x.key===C[2]);if(sel&&prev){sel.value=prev.value;if(root.FokoNativePrepare)root.FokoNativePrepare(prev.value);else q(C[3])?.click();}for(const v of saved){const e=fields().find(x=>fieldKey(x)===v.key);if(!e)continue;if(v.html)e.innerHTML=v.html;e.value=v.value;if(e.type==='checkbox'||e.type==='radio')e.checked=v.checked;e.dispatchEvent(new Event('input',{bubbles:true}));}prepared=sel?.value;lastDraft=null;undo.hidden=true;inform('Previous inputs restored. Run to calculate their result.');};holder.append(undo);
 status=d.createElement('span');status.className='fl-command-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Ready · selecting an example prepares its inputs';dock.append(title,holder,status);d.body.append(dock);d.body.classList.add('fl-has-command');
 const sel=q(C[2]),load=q(C[3]);if(sel&&load&&root.FokoNativePrepare){prepared=sel.value;sel.addEventListener('change',e=>{e.stopImmediatePropagation();beforeSelection();root.FokoNativePrepare(sel.value);afterSelection();},true);load.hidden=true;load.dataset.flRedundant='true';}
 else if(sel&&route==='analysis-studio.html'){prepared=sel.value;sel.addEventListener('change',()=>{beforeSelection();root.FokoAnalysisStudio.loadDemo(sel.value);afterSelection();},true);if(load){load.hidden=true;load.dataset.flRedundant='true';}}
 d.addEventListener('input',e=>{if(e.target.closest('.fl-command')||/frame|timeline|plot|view|speed|zoom|rotation|palette|font|marker|lineWidth/i.test(e.target.id))return;rev++;if(runRev>=0&&phase==='complete')inform('Inputs changed · Run to update. Previous result retains its own inputs.');},true);
 run.addEventListener('click',()=>{phase='running';runRev=rev;inform('Validating and computing…');},{capture:true});cancel?.addEventListener('click',()=>{phase='cancelled';inform('Cancelled · no new complete result.');});
 const statuses=['as-status','ds-status','status','advStatus','runStatus','statisticsStatus','optimizationStatus','sensitivityStatus','fittingStatus','pgStatus','bfStatus','evStatus','agentStatus','u-status','provenanceStatus'];
 for(const id of statuses){const node=d.getElementById(id);if(node&&node!==status)new MutationObserver(()=>{const text=node.textContent.trim();if(text){if(phase==='ready'&&prepared&&lastDraft&&!/error|invalid|failed/i.test(text)){inform('Example prepared. Review the inputs, then Run.');return;}inform(text);if(/complete|computed|analysed|analyzed|finished|converged/i.test(text))phase='complete';else if(/error|fail|invalid|infeasible/i.test(text))phase='failed';}}).observe(node,{childList:true,subtree:true,characterData:true});}
 root.addEventListener('lab-result',()=>{phase='complete';inform(runRev===rev?'Complete · results use the recorded configuration':'Result received · inspect recorded configuration');});
 for(const id of ['runTop']){const duplicate=d.getElementById(id);if(duplicate)duplicate.hidden=true;}
 d.addEventListener('focusin',e=>{if(dock.contains(e.target)||e.target.closest('dialog'))return;const b=e.target.getBoundingClientRect();if(b.bottom>dock.getBoundingClientRect().top-8||b.top<70)e.target.scrollIntoView({block:'center'});});
 d.addEventListener('invalid',e=>{if(!e.target.form)return;phase='invalid';inform(e.target.validationMessage||'Correct the highlighted input before running.');},true);
 // Selecting a curated card has the same preparation semantics as its dropdown.
 if(sel&&root.FokoNativePrepare){d.addEventListener('click',e=>{const card=e.target.closest('button[data-preset],button[data-example],button[data-pg-example],button[data-ev-preset],button[data-ai-example]');if(!card)return;const name=card.dataset.preset||card.dataset.example||card.dataset.pgExample||card.dataset.evPreset||card.dataset.aiExample;if(![...sel.options].some(o=>o.value===name))return;e.preventDefault();e.stopImmediatePropagation();beforeSelection();root.FokoNativePrepare(name);afterSelection();},true);}
 root.FokoWorkflow={snapshot,getState:()=>({phase,revision:rev,runRevision:runRev,prepared}),run:()=>run.click()};
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>setTimeout(boot,100),{once:true});else setTimeout(boot,100);
})(globalThis);
