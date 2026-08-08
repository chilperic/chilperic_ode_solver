(function(root){'use strict';
  const data=root.FokoScientificExampleCatalog||[];
  const PAGE_SIZE=24;
  let page=1;
  const $=function(id){return document.getElementById(id);};
  const LAB_IDENTITY={
    'ODE':['ode','dynamical-systems'],'Stochastic':['stochastic','dynamical-systems'],'Steady State':['steady','dynamical-systems'],'Bifurcation':['bifurcation','dynamical-systems'],
    'Agent':['agent','populations-evolution'],'Population Genetics':['population-genetics','populations-evolution'],'Evolution Landscapes':['evolution','populations-evolution'],
    'Optimization':['optimization','inference-uncertainty'],'Fitting':['fitting','inference-uncertainty'],'Statistics':['statistics','inference-uncertainty'],'Advanced Methods':['advanced-methods','inference-uncertainty'],
    'AI Modeling':['ai-modeling','scientific-intelligence'],'SciML':['sciml','scientific-intelligence'],'Machine Learning':['ml','scientific-intelligence'],
    'Linear Algebra':['linalg','mathematical-structure'],'Networks':['networks','mathematical-structure'],'Symbolic':['symbolic','mathematical-structure'],'Research':['research','resources']
  };
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function options(values,label){return '<option value="">'+label+'</option>'+Array.from(new Set(values)).sort().map(function(value){return '<option value="'+esc(value)+'">'+esc(value)+'</option>';}).join('');}
  function includes(text,terms){return terms.some(function(term){return text.includes(term);});}
  const LEGACY_ALIASES={
    'FADNS particle dynamics':['FADNS particle-agent tracker'],
    'T-cell generation cascade':['Generation-structured cell proliferation agents'],
    'Forest-fire spread':['Forest-fire cellular automaton'],
    'Lattice predator–prey cycles':['Predator–prey agents'],
    'Lorenz system':['Lorenz attractor'],
    'Lotka–Volterra predator–prey':['Lotka–Volterra'],
    'Calvin-cycle mini-model':['Calvin cycle mini-model'],
    'Enzyme kinetics':['Michaelis–Menten enzyme kinetics'],
    'Michaelis–Menten complex balance':['Michaelis–Menten steady state'],
    'Stochastic SIR epidemic':['Stochastic SIR / SIS'],
    'SINDy logistic discovery':['SINDy logistic discovery'],
    'Surrogate residual diagnostic':['Surrogate emulator diagnostics'],
    'PINN workflow export':['PINN / PyTorch diagnostic scaffold'],
    'Genetic toggle switch':['Biological network ML scaffold'],
    'Thermoplants · C3–C4 adaptation':['photosynthesis climate adaptation','C3 C4 plants','thermoplants'],
    'Saddle-node normal form':['fold bifurcation','saddle node'],
    'Supercritical pitchfork':['pitchfork bifurcation','symmetry breaking'],
    'Hopf normal-form equilibrium':['hopf bifurcation','oscillation onset'],
    'Rosenbrock gradient and Hessian':['rosenbrock hessian','banana valley'],
    'Random telegraph gene bursting':['telegraph process','gene bursting'],
    'Moran fixation process':['moran process','fixation probability']
  };
  function aliasesFor(item){return LEGACY_ALIASES[item.title]||[];}
  function imageFor(item){
    if(item.image) return item.image;
    const text=[item.title,item.family,item.lab].join(' ').toLowerCase();
    if(includes(text,['fadns'])) return item.lab==='Agent'?'assets/agent-atlas/fadns_particle.svg':'assets/model-atlas/phd-fadns-coa-extracted.webp';
    if(includes(text,['fatty-acid','fatty acid','malcoa'])) return 'assets/model-atlas/phd-fa-metabolism-extracted.webp';
    if(includes(text,['t-cell','t cell','cell cycle','generation cascade'])) return 'assets/agent-atlas/tcell.svg';
    if(includes(text,['forest'])) return 'assets/agent-atlas/forest.svg';
    if(includes(text,['predator','prey'])) return item.lab==='Agent'?'assets/agent-atlas/predprey.svg':'assets/model-atlas/lotka.webp';
    if(includes(text,['sir','seir','epidem'])) return item.lab==='SciML'?'assets/sciml-atlas/seir.svg':'assets/model-atlas/sir-seir.webp';
    if(includes(text,['lorenz','chaos'])) return 'assets/model-atlas/lorenz.webp';
    if(includes(text,['van der pol','oscillator'])) return 'assets/model-atlas/vanderpol.webp';
    if(includes(text,['calvin','photosynthesis','leaf'])) return 'assets/model-atlas/calvin.webp';
    if(includes(text,['michaelis','enzyme','dose–response','dose-response'])) return 'assets/model-atlas/michaelis.webp';
    if(includes(text,['braess','network','graph','spanning tree','information flow'])) return 'assets/model-atlas/braess.webp';
    if(includes(text,['romeo','social','voter','segregation','collective'])) return item.lab==='Agent'?'assets/agent-atlas/life.svg':'assets/model-atlas/romeo-juliet.webp';
    if(item.lab==='Agent') return 'assets/agent-atlas/life.svg';
    if(item.lab==='SciML'){
      if(includes(text,['gene'])) return 'assets/sciml-atlas/gene-knockout.svg';
      if(includes(text,['drug'])) return 'assets/sciml-atlas/drug-schedule.svg';
      if(includes(text,['metabolic'])) return 'assets/sciml-atlas/metabolic-stress.svg';
      if(includes(text,['protein'])) return 'assets/sciml-atlas/protein-design.svg';
      if(includes(text,['signaling'])) return 'assets/sciml-atlas/signaling-network.svg';
      if(includes(text,['tumor'])) return 'assets/sciml-atlas/tumor-microenv.svg';
      if(includes(text,['patient'])) return 'assets/sciml-atlas/virtual-patients.svg';
      return 'assets/sciml-atlas/allosteric.svg';
    }
    const defaults={
      'ODE':'assets/lab-logos/ode-lab.webp',
      'Steady State':'assets/lab-logos/steady-state-lab.webp',
      'Stochastic':'assets/lab-logos/stochastic-lab.webp',
      'Optimization':'assets/lab-logos/optimization-lab.webp',
      'Fitting':'assets/model-atlas/michaelis.webp',
      'Statistics':'assets/lab-logos/model-atlas.webp',
      'Machine Learning':'assets/lab-logos/model-atlas.webp',
      'Linear Algebra':'assets/model-atlas/romeo-juliet.webp',
      'Networks':'assets/model-atlas/braess.webp',
      'Population Genetics':'assets/lab-logos/model-atlas.webp',
      'Symbolic':'assets/model-atlas/vanderpol.webp'
    };
    return defaults[item.lab]||'assets/lab-logos/model-atlas.webp';
  }
  function render(){
    const q=$('atlasSearch').value.trim().toLowerCase(),lab=$('atlasLab').value,prov=$('atlasProvenance').value,family=$('atlasFamily').value,status=$('atlasStatus').value;
    const filtered=data.filter(function(item){const text=[item.title,item.lab,item.family,item.provenance,item.status,item.summary].concat(aliasesFor(item)).join(' ').toLowerCase();return (!q||text.includes(q))&&(!lab||item.lab===lab)&&(!prov||item.provenance===prov)&&(!family||item.family===family)&&(!status||item.status===status);});
    const pageCount=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
    page=Math.min(Math.max(1,page),pageCount);
    const start=(page-1)*PAGE_SIZE;
    const visible=filtered.slice(start,start+PAGE_SIZE);
    $('atlasCount').textContent=filtered.length+' of '+data.length+' examples';
    $('atlasPageStatus').textContent=filtered.length?'Page '+page+' of '+pageCount+' · showing '+(start+1)+'–'+(start+visible.length):'No matching pages';
    $('atlasPrevious').disabled=page<=1;
    $('atlasNext').disabled=page>=pageCount;
    $('atlasPagination').hidden=filtered.length<=PAGE_SIZE;
    $('atlasGridV72').innerHTML=visible.map(function(item){
      const image=imageFor(item);
      const identity=LAB_IDENTITY[item.lab]||['examples','resources'];
      return '<article class="v72-atlas-card" data-lab-target="'+esc(identity[0])+'" data-subject-target="'+esc(identity[1])+'">'
        +'<figure class="v72-atlas-media"><img alt="'+esc(item.title)+' preview" decoding="async" src="'+esc(image)+'"/></figure>'
        +'<div class="v72-atlas-meta"><span class="v72-atlas-badge">'+esc(item.lab)+'</span><span class="v72-atlas-badge provenance">'+esc(item.provenance)+'</span><span class="v72-atlas-badge status">'+esc(item.status)+'</span></div>'
        +'<div class="v72-atlas-card-body"><h2>'+esc(item.title)+'</h2><p><b>'+esc(item.family)+'</b></p><dl><dt>Scientific use</dt><dd>'+esc(item.summary)+'</dd><dt>Evidence boundary</dt><dd>'+esc(item.status)+'</dd></dl></div>'
        +'<a href="'+esc(item.href)+'">Open as editable starting point</a></article>';
    }).join('')||'<p>No examples match the current filters.</p>';
  }
  function init(){
    $('atlasLab').innerHTML=options(data.map(function(x){return x.lab;}),'All labs');
    $('atlasProvenance').innerHTML=options(data.map(function(x){return x.provenance;}),'All provenance classes');
    $('atlasFamily').innerHTML=options(data.map(function(x){return x.family;}),'All scientific families');
    $('atlasStatus').innerHTML=options(data.map(function(x){return x.status;}),'All evidence levels');
    const params=new URLSearchParams(window.location.search);
    if(params.get('q')) $('atlasSearch').value=params.get('q');
    if(params.get('lab') && Array.from($('atlasLab').options).some(function(option){return option.value===params.get('lab');})) $('atlasLab').value=params.get('lab');
    if(params.get('provenance') && Array.from($('atlasProvenance').options).some(function(option){return option.value===params.get('provenance');})) $('atlasProvenance').value=params.get('provenance');
    if(params.get('family') && Array.from($('atlasFamily').options).some(function(option){return option.value===params.get('family');})) $('atlasFamily').value=params.get('family');
    if(params.get('status') && Array.from($('atlasStatus').options).some(function(option){return option.value===params.get('status');})) $('atlasStatus').value=params.get('status');
    ['atlasSearch','atlasLab','atlasProvenance','atlasFamily','atlasStatus'].forEach(function(id){$(id).addEventListener(id==='atlasSearch'?'input':'change',function(){page=1;render();});});
    $('atlasPrevious').addEventListener('click',function(){page=Math.max(1,page-1);render();$('atlasGridV72').scrollIntoView({block:'start'});});
    $('atlasNext').addEventListener('click',function(){page+=1;render();$('atlasGridV72').scrollIntoView({block:'start'});});
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
}(typeof window!=='undefined'?window:globalThis));
