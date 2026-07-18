(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const esc=v=>String(v??'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  let canvas,ctx,state,timer=null,history=[],compiledCustom=null,MODEL_LIBRARY={},customWorker=null,workerSeq=0,workerReady=false,stepBusy=false;

  const AGENT_PALETTES={
    scientific:['#ffffff','#0072b2','#009e73','#d55e00','#cc79a7','#56b4e9','#f0e442','#64748b','#111827'],
    aurora:['#ffffff','#0f766e','#155EEF','#2563eb','#f97316','#22c55e','#e11d48','#64748b','#111827'],
    viridis:['#ffffff','#440154','#31688e','#21918c','#35b779','#90d743','#fde725','#64748b','#111827'],
    magma:['#ffffff','#3b0f70','#8c2981','#de4968','#fe9f6d','#fcfdbf','#f97316','#64748b','#111827'],
    mono:['#ffffff','#111827','#334155','#475569','#64748b','#94a3b8','#cbd5e1','#e2e8f0','#0f172a']
  };



  const AGENT_PLOT_MODES={
    population:'Population time series',
    population_stacked:'Stacked population area',
    composition:'Current composition',
    state_rank:'State ranking',
    phase:'Phase portrait',
    events:'Event rates',
    cumulative_events:'Cumulative events',
    diversity:'State diversity / entropy',
    trait:'Trait distribution',
    transition:'Transition / event matrix',
    network:'Network degree plot',
    spatial_summary:'Spatial occupancy profile',
    spatial_heatmap:'Spatial state heatmap',
    layers:'Layer comparison',
    fadns_species:'FADNS species tracker'
  };
  const BASE_PLOT_MODES=['population','population_stacked','composition','state_rank','phase','events','cumulative_events','diversity','transition','spatial_summary','spatial_heatmap'];
  const GRAPH_PLOT_MODES=['network','layers'];
  const TRAIT_PLOT_MODES=['trait'];
  const FADNS_PLOT_MODES=['fadns_species'];

  const EXAMPLES={
    tcell:{family:'biology',label:'T-cell proliferation agents',caption:'Quiescent cells activate, divide locally and die. A=activation/division, B=death, C=spontaneous activation, D=crowding death.',states:['empty','quiescent','activated','dead'],colors:['#ffffff','#93c5fd','#14b8a6','#f97316'],params:['activation/division','death','spontaneous activation','crowding death'],a:35,b:20,c:4,d:3,approach:'statechart',timeMode:'continuous_rate',topology:'moore',rule:['0 empty space','1 quiescent: may activate','2 activated: may divide into empty neighbor or die','3 dead/removed lineage']},
    fadns_particle:{family:'biology',label:'FADNS particle-agent tracker',caption:'Toy agent analogy for FADNS. Tracks Acetyl-CoA, Malonyl-CoA, chain intermediates, C14/C16/C18 products and CoA release. Not the calibrated PhD ODE model.',states:['empty','Acetyl-CoA','Malonyl-CoA','chain intermediate','C14 product','C16 product','C18 product','CoA released'],colors:['#ffffff','#60a5fa','#38bdf8','#14b8a6','#fbbf24','#f97316','#dc2626','#64748b'],params:['condensation / chain start','elongation bias','product release / CoA recycling','substrate inflow'],a:34,b:48,c:22,d:28,approach:'statechart',timeMode:'continuous_rate',topology:'moore',behavior:'fadns',rule:['0 empty site','1 Acetyl-CoA substrate pool','2 Malonyl-CoA substrate pool','3 chain intermediate after condensation','4/5/6 products: C14, C16, C18','7 CoA released/recycled']},
    sir:{family:'biology',label:'SIR agent epidemic',caption:'Susceptible agents become infected through local or graph contact and recover. A=infection, B=recovery, C=imported infection, D=loss of immunity.',states:['empty','susceptible','infected','recovered'],colors:['#ffffff','#bfdbfe','#ef4444','#22c55e'],params:['infection','recovery','imported infection','loss of immunity'],a:45,b:35,c:2,d:0,approach:'graph',timeMode:'continuous_rate',topology:'small_world',rule:['1 susceptible + infected neighbor → infected with probability A','2 infected → recovered with probability B','3 recovered can lose immunity if D > 0']},
    vax_hesitancy:{family:'social',label:'Outbreak + vaccine hesitancy',caption:'Rumor spread lowers vaccination compliance during a measles-like outbreak. A=infection pressure, B=misinformation spread, C=vaccination/official correction, D=hesitancy persistence.',states:['outside','vaccinated / protected','infected / rumor-exposed','hesitant susceptible'],colors:['#ffffff','#22c55e','#ef4444','#f59e0b'],params:['infection pressure','misinformation spread','vaccination / correction','hesitancy persistence'],a:38,b:55,c:22,d:34,approach:'graph',timeMode:'continuous_rate',topology:'small_world',behavior:'social',rule:['rumor-exposed neighbors convert protected/susceptible agents toward hesitancy','hesitant susceptible agents are easier to infect','official correction/vaccination moves agents back to protected state']},
    evacuation_panic:{family:'crisis',label:'Wildfire evacuation + panic misinformation',caption:'Fake route rumors spread through local groups and push agents into congested exits. A=official compliance, B=panic rumor spread, C=evacuation flow, D=congestion feedback.',states:['empty','calm / official route','panicked / false route','evacuated / blocked'],colors:['#ffffff','#2563eb','#ef4444','#64748b'],params:['official compliance','panic rumor spread','evacuation flow','congestion feedback'],a:35,b:62,c:28,d:46,approach:'graph',timeMode:'discrete_async',topology:'small_world',behavior:'social',rule:['panic spreads through local group contacts','official compliance can move panicked agents back to route-following','congestion keeps agents in the panicked/blocked class']},
    meme_stock:{family:'finance',label:'Meme-stock cascade',caption:'Viral hype coordinates retail buying and creates unstable waves. A=hype conversion, B=sell pressure, C=algorithm amplification, D=volatility.',states:['inactive','holder','hype buyer','seller / liquidated'],colors:['#ffffff','#60a5fa','#22c55e','#ef4444'],params:['hype conversion','sell pressure','algorithm amplification','volatility'],a:52,b:21,c:45,d:28,approach:'graph',timeMode:'discrete_async',topology:'small_world',behavior:'social',rule:['hype buyer neighbors recruit inactive agents','sell pressure moves buyers to seller/liquidated state','algorithmic amplification increases recruitment on clustered networks']},
    cancer_myth:{family:'social',label:'Cancer-care myth adoption',caption:'Medical misinformation in support networks can pull patients away from evidence-based care. A=myth exposure, B=echo-chamber reinforcement, C=clinical correction, D=isolation.',states:['outside','evidence-care aligned','myth-adopting','isolated / delayed care'],colors:['#ffffff','#22c55e','#f97316','#991b1b'],params:['myth exposure','echo reinforcement','clinical correction','isolation'],a:34,b:58,c:30,d:24,approach:'graph',timeMode:'continuous_rate',topology:'small_world',behavior:'social',rule:['myth-adopting neighbors increase adoption pressure','clinical correction can restore evidence-care alignment','isolation delays correction and keeps agents in risky states']},
    gentrification_hype:{family:'urban',label:'Urban gentrification + neighborhood hype',caption:'Geo-tagged influencer attention raises local desirability and displaces residents. A=hype influx, B=price pressure, C=local resistance, D=displacement.',states:['empty','resident','hype investor','displaced / priced out'],colors:['#ffffff','#60a5fa','#f59e0b','#7f1d1d'],params:['hype influx','price pressure','local resistance','displacement'],a:28,b:52,c:18,d:35,approach:'adaptive',timeMode:'discrete_sync',topology:'moore',behavior:'social',rule:['investor clusters raise neighboring price pressure','resistance slows conversion','sustained pressure moves residents to displaced state']},
    deepfake_polarization:{family:'social',label:'Polarization + deepfakes',caption:'Polarizing synthetic content fragments a moderate population before an election. A=polarizing exposure, B=algorithmic boost, C=debunking, D=echo-chamber retention.',states:['outside','moderate','polarized','debunked / resistant'],colors:['#ffffff','#93c5fd','#dc2626','#22c55e'],params:['polarizing exposure','algorithmic boost','debunking','echo retention'],a:44,b:65,c:25,d:42,approach:'graph',timeMode:'continuous_rate',topology:'small_world',behavior:'social',rule:['polarized neighbors recruit moderates','debunking moves agents to resistant state','echo retention keeps agents polarized']},
    poaching_market:{family:'environment',label:'Wildlife poaching + black-market network',caption:'Trust networks connect poachers, smugglers and enforcement pressure. A=recruitment, B=trade coordination, C=enforcement, D=trust decay.',states:['outside','poacher','smuggler / buyer link','enforcement / removed'],colors:['#ffffff','#92400e','#ef4444','#2563eb'],params:['recruitment','trade coordination','enforcement','trust decay'],a:24,b:48,c:32,d:18,approach:'graph',timeMode:'discrete_async',topology:'random_graph',behavior:'social',rule:['poacher/smuggler clusters recruit new participants','enforcement removes or suppresses active cells','trust decay reduces active links over time']},
    av_backlash:{family:'urban',label:'Autonomous vehicles + anti-tech backlash',caption:'Rumors around AV safety trigger local protests and vandalism. A=adoption, B=backlash rumor, C=trust repair, D=incident salience.',states:['outside','neutral / adopter','backlash','repaired trust'],colors:['#ffffff','#38bdf8','#ef4444','#22c55e'],params:['adoption','backlash rumor','trust repair','incident salience'],a:26,b:49,c:30,d:38,approach:'graph',timeMode:'continuous_rate',topology:'small_world',behavior:'social',rule:['backlash spreads through neighborhood networks','trust repair moves backlash agents into repaired state','salient incidents increase conversion to backlash']},
    smart_grid_boycott:{family:'environment',label:'Smart-grid boycott rumors',caption:'Rumors about smart meters reduce automation compliance and grid flexibility. A=compliance, B=rumor spread, C=technical correction, D=privacy fear persistence.',states:['outside','smart-grid compliant','boycott / disabled','corrected / trusted'],colors:['#ffffff','#22c55e','#ef4444','#60a5fa'],params:['compliance','rumor spread','technical correction','privacy fear persistence'],a:30,b:44,c:28,d:36,approach:'graph',timeMode:'continuous_rate',topology:'small_world',behavior:'social',rule:['boycott state spreads through family/social links','technical correction can restore compliance','persistence keeps boycott clusters stable']},
    ancient_cult:{family:'social',label:'Ancient cities + cult movement rumors',caption:'Trade-route networks carry apocalyptic/cultural rumors that trigger migration before environmental collapse. A=rumor adoption, B=merchant connectivity, C=local stabilization, D=migration pressure.',states:['empty','settled','rumor carrier','migrating / abandoned'],colors:['#ffffff','#84cc16','#f59e0b','#7c2d12'],params:['rumor adoption','merchant connectivity','local stabilization','migration pressure'],a:34,b:54,c:18,d:32,approach:'graph',timeMode:'discrete_async',topology:'small_world',behavior:'social',rule:['rumor carriers spread through route links','local stabilization slows adoption','migration pressure converts carriers into abandoned/migrating states']},
    predprey:{family:'biology',label:'Predator–prey agents',caption:'Prey reproduce into empty sites; predators consume nearby prey and die without food. A=prey growth, B=predator death, C=predator birth, D=random disturbance.',states:['empty','prey','predator','disturbed'],colors:['#ffffff','#84cc16','#f97316','#64748b'],params:['prey growth','predator death','predator birth','disturbance'],a:28,b:22,c:18,d:1,approach:'rule_based',timeMode:'discrete_sync',topology:'moore',rule:['1 prey reproduces into empty neighbors','2 predator converts neighboring prey into predator','2 predator dies if no prey is nearby']},
    life:{family:'cellular',label:"Conway's Game of Life",caption:'Three local rules produce gliders, oscillators and chaotic-looking growth. A/B/C/D are unused except for custom experiments.',states:['dead','alive','alive','alive'],colors:['#ffffff','#0f172a','#0f172a','#0f172a'],params:['unused','unused','unused','unused'],a:0,b:0,c:0,d:0,approach:'rule_based',timeMode:'discrete_sync',topology:'moore',rule:['alive with 2 or 3 neighbors survives','dead with exactly 3 neighbors becomes alive','otherwise the cell is dead']},
    forest:{family:'cellular',label:'Forest-fire cellular automaton',caption:'Trees grow, lightning appears and fire spreads through local neighborhoods. A=growth, B=lightning, C=spread, D=ash persistence.',states:['empty','tree','fire','ash'],colors:['#ffffff','#16a34a','#ef4444','#7c2d12'],params:['tree growth','lightning','fire spread','ash persistence'],a:10,b:2,c:80,d:25,approach:'rule_based',timeMode:'continuous_rate',topology:'moore',rule:['empty → tree by growth A','tree + fire neighbor → fire with spread C','tree → fire by lightning B','fire → ash/empty; ash delays regrowth']},
    plant:{family:'biology',label:'Plant competition toy model',caption:'Plant individuals reproduce into neighboring gaps, die under crowding and carry a small trait. A=reproduction, B=mortality, C=mutation, D=crowding.',states:['empty','plant','stressed','dead'],colors:['#ffffff','#22c55e','#65a30d','#166534'],params:['reproduction','mortality','mutation','crowding'],a:25,b:8,c:18,d:25,approach:'adaptive',timeMode:'continuous_rate',topology:'moore',rule:['plant reproduces into empty sites','trait mutates with probability C','crowding raises mortality through D']},
    evolution:{family:'biology',label:'Evolutionary trait agents',caption:'Agents reproduce according to distance from a moving optimum. A=reproduction, B=death, C=mutation, D=environmental speed.',states:['empty','agent','selected','dead'],colors:['#ffffff','#22c55e','#14b8a6','#f59e0b'],params:['reproduction','death','mutation','environment speed'],a:30,b:5,c:20,d:25,approach:'adaptive',timeMode:'continuous_rate',topology:'moore',rule:['fitness depends on trait distance to moving optimum','offspring inherit trait with mutation C','population mean trait can lag the optimum']},
    langton:{family:'cellular',label:"Langton's ant",caption:'A two-color Turing-machine rule: chaos first, then an organized highway. A/B/C/D are unused.',states:['white','black','ant','path'],colors:['#ffffff','#0f172a','#dc2626','#64748b'],params:['unused','unused','unused','unused'],a:0,b:0,c:0,d:0,approach:'rule_based',timeMode:'discrete_async',topology:'moore',rule:['on white: turn right, flip to black, move','on black: turn left, flip to white, move']}
  };

  const APPROACHES={
    rule_based:{label:'Rule-Based Decision Making',summary:'Cells decide from explicit if/then local conditions. This is transparent and easy to audit, but does not represent internal agent memory unless you add it.',best:'cellular automata, forest fire, local infection, simple ecological rules',signature:'return next state from cell + neighbor counts'},
    statechart:{label:'State-Driven Agents / Statecharts',summary:'Agents move through named states such as quiescent → activated → divided/dead. This clarifies biological state semantics and transition probabilities.',best:'T-cell proliferation, disease stages, life-cycle models',signature:'encode transition conditions between states'},
    adaptive:{label:'Adaptive & Learning Agents',summary:'Agents carry a trait or memory and update it from local success, mutation or reward. This is closer to evolutionary or learning behavior.',best:'evolution, plant competition, behavioral toy models',signature:'return {state, trait, event} from rule code'},
    graph:{label:'Graph / Network-Based Approach',summary:'Interactions use adjacency layers instead of only geometric grid neighbors. Multilayer mode combines spatial, social and transport/contact edges.',best:'contact networks, tissue neighborhoods, misinformation, social/transport interactions',signature:'neighbors are merged from selected network layers'}
  };

  const SOCIAL_MODELS=new Set(['vax_hesitancy','evacuation_panic','meme_stock','cancer_myth','gentrification_hype','deepfake_polarization','poaching_market','av_backlash','smart_grid_boycott','ancient_cult']);

  function socialStep(next,ev,c,p,rand,rp){
    for(const id of orderIds()){
      const x=id%state.n,y=Math.floor(id/state.n),cn=countNeighbors(x,y,c),old=c[id];
      if(old===0 && rand()<rp(p.C*.012)){next[id]=1;ev.transitions01++;}
      else if(old===1){
        const influence=(cn.b+0.6*cn.c)/Math.max(1,cn.degree);
        if(rand()<rp(p.A*influence + p.B*.035)){next[id]=2;ev.infections++;ev.transitions12++;}
        else if(rand()<rp(p.C*.035)){next[id]=3;ev.recoveries++;ev.transitions23++;}
      }
      else if(old===2){
        if(rand()<rp(p.D*.045)){next[id]=2;}
        else if(rand()<rp(p.C*.08)){next[id]=3;ev.recoveries++;ev.transitions23++;}
        else if(rand()<rp(p.B*.025)){const empt=emptyNeighbors(x,y,c); if(empt.length){next[empt[Math.floor(rand()*empt.length)]]=2;ev.births++;}}
      }
      else if(old===3 && rand()<rp(p.D*.015)){next[id]=1;}
      trackEvent(old,next[id],ev);
    }
  }

  function fadnsStep(next,ev,c,p,rand,rp){
    for(const id of orderIds()){
      const x=id%state.n,y=Math.floor(id/state.n),cn=countNeighbors(x,y,c),old=c[id];
      if(old===0){
        if(rand()<rp(p.D*.07)){next[id]=rand()<.48?1:2; ev.transitions01++;}
      }
      else if(old===1){
        if((cn.b>0||cn.c>0) && rand()<rp(p.A*.12)){next[id]=3; ev.transitions12++;}
        else if(rand()<rp(p.D*.025)){next[id]=2;}
      }
      else if(old===2){
        if((cn.a>0||cn.c>0) && rand()<rp(p.A*.12)){next[id]=3; ev.transitions12++;}
        else if(rand()<rp(p.D*.02)){next[id]=1;}
      }
      else if(old===3){
        if(rand()<rp(p.B*.11)){const r=rand(); next[id]=r<.30?4:(r<.75?5:6); if(next[id]===4)ev.productsC14++; if(next[id]===5)ev.productsC16++; if(next[id]===6)ev.productsC18++; ev.transitions34++;}
      }
      else if(old===4||old===5||old===6){
        if(rand()<rp(p.C*.08)){next[id]=7; ev.transitions67++;}
      }
      else if(old===7){
        if(rand()<rp(p.C*.12)){next[id]=0; ev.customChanges++;}
      }
      trackEvent(old,next[id],ev);
    }
  }

  function rngFactory(seed){let a=(Number(seed)>>>0)||1;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  function num(id,fallback=0){const el=$(id); const v=Number(el?.value); return Number.isFinite(v)?v:fallback;}
  // SCALE: visible sliders use 0–100 percentages; runtime rates use 0–1 fractions.
  // Library/custom fields a,b,c,d are stored as 0–100 slider values. Exported
  // config parameters.{A..D} are stored as 0–1 runtime values. importJson()
  // accepts both forms defensively: values <= 1 are treated as runtime rates,
  // values > 1 are treated as slider percentages. This prevents a hand-written
  // model with A:25 from being clamped to 100 after import.
  function sliderPercentFromParameter(v){const n=Number(v); if(!Number.isFinite(n))return 0; return n<=1 ? n*100 : n;}
  function params(){return {A:num('agentA')/100,B:num('agentB')/100,C:num('agentC')/100,D:num('agentD')/100,dt:dt(),degree:num('agentDegree',6)|0};}
  function dt(){return clamp(num('agentDt',100),1,200)/100;} function rateProb(rate){return 1-Math.exp(-Math.max(0,rate)*dt());}
  function size(){return clamp(num('agentSize',46),20,100)|0;}
  function totalSites(){const n=size(); return n*n;}
  function density(){return clamp(num('agentDensity',42),1,95)/100;}
  function syncInitialCountFromDensity(){const el=$('agentInitialCount'); if(!el)return; const total=totalSites(); el.max=String(total); el.value=String(clamp(Math.round(total*density()),0,total));}
  function initialPopulationCount(){const el=$('agentInitialCount'); const total=totalSites(); if(el){el.max=String(total); return clamp(Math.round(Number(el.value)||0),0,total);} return clamp(Math.round(total*density()),0,total);}
  function initialPopulationFraction(){return totalSites()?initialPopulationCount()/totalSites():0;}
  function updateDensityFromInitialCount(){const d=$('agentDensity'); if(!d)return; const total=totalSites(); const pct=total?Math.round(100*initialPopulationCount()/total):0; d.value=String(clamp(pct,1,95));}
  function selectedModelKey(){return state?.kind || $('agentExample')?.value || 'tcell';}
  function defaultInitialPercentages(kind, ex){
    const nStates=Math.max(2,(ex.states||[]).length), out=Array(nStates).fill(0);
    const set=(pairs)=>{pairs.forEach(([i,v])=>{if(i>0&&i<nStates)out[i]=clamp(Number(v)||0,0,100);}); return out;};
    if(ex.initial && typeof ex.initial==='object'){
      Object.entries(ex.initial).forEach(([k,v])=>{const i=Number(k); if(Number.isFinite(i)&&i>0&&i<nStates)out[i]=clamp(Number(v)||0,0,100);});
      return out;
    }
    if(kind==='tcell') return set([[1,90],[2,10],[3,0]]);
    if(kind==='sir') return set([[1,93],[2,7],[3,0]]);
    if(kind==='predprey') return set([[1,70],[2,30]]);
    if(kind==='fadns_particle') return set([[1,32],[2,32],[3,12],[4,5],[5,5],[6,5],[7,9]]);
    if(kind==='plant' || kind==='evolution' || kind==='life' || kind==='forest') return set([[1,100]]);
    if(SOCIAL_MODELS.has(kind)) return set([[1,90],[2,10],[3,0]]);
    return set([[1,100]]);
  }
  function populateInitialConditions(preserve=true){
    const box=$('agentInitialGrid'); if(!box)return;
    const kind=$('agentExample')?.value || selectedModelKey(), ex=MODEL_LIBRARY[kind]||model(), states=ex.states||['empty','state 1'];
    const old={}; box.querySelectorAll('[data-init-state]').forEach(inp=>{old[inp.dataset.initState]=Number(inp.value)||0;});
    const defaults=defaultInitialPercentages(kind,ex);
    box.innerHTML='';
    states.slice(1).forEach((name,offset)=>{
      const i=offset+1, v=preserve && Object.prototype.hasOwnProperty.call(old,String(i)) ? old[String(i)] : (defaults[i]||0);
      const label=document.createElement('label'); label.className='agent-init-control';
      label.innerHTML=`<span>${esc(name)}</span><output id="agentInitOut${i}">${Math.round(v)}%</output><input data-init-state="${i}" id="agentInit${i}" type="range" min="0" max="100" value="${clamp(v,0,100)}"/>`;
      box.appendChild(label);
      label.querySelector('input')?.addEventListener('input',()=>{updateInitialOutputs(); markStale(); status('Reset needed.','busy');});
    });
    updateInitialOutputs();
  }
  function initialFractions(){
    const ex=model(), nStates=Math.max(2,(ex.states||[]).length), composition=Array(nStates).fill(0);
    $('agentInitialGrid')?.querySelectorAll('[data-init-state]').forEach(inp=>{const i=Number(inp.dataset.initState); if(i>0&&i<nStates)composition[i]=clamp(Number(inp.value)||0,0,100);});
    let sum=composition.slice(1).reduce((a,b)=>a+b,0);
    if(sum<=0){composition[1]=100; sum=100;}
    const occupied=initialPopulationFraction();
    const vals=Array(nStates).fill(0);
    vals[0]=1-occupied;
    for(let i=1;i<nStates;i++) vals[i]=occupied*(composition[i]/sum);
    return vals;
  }
  function pickInitialState(rand, fractions){let r=rand(), acc=0; for(let i=0;i<fractions.length;i++){acc+=fractions[i]||0; if(r<=acc)return i;} return 0;}
  function updateInitialOutputs(){
    $('agentInitialGrid')?.querySelectorAll('[data-init-state]').forEach(inp=>{const out=$('agentInitOut'+inp.dataset.initState); if(out)out.textContent=Math.round(Number(inp.value)||0)+'%';});
  }
  function model(){return MODEL_LIBRARY[selectedModelKey()]||MODEL_LIBRARY.tcell||EXAMPLES.tcell;}
  function isFadnsPlotModel(kind, ex){return kind==='fadns_particle' || ex?.behavior==='fadns';}
  function allowedPlotModes(kind=selectedModelKey(), ex=model()){
    const topo=$('agentTopology')?.value || ex.topology || 'moore';
    const out=[...BASE_PLOT_MODES];
    if(['plant','evolution'].includes(kind)) out.splice(8,0,...TRAIT_PLOT_MODES);
    if(['graph','random_graph','small_world','multilayer_social','multilayer_transport'].includes(ex.approach) || topo.includes('graph') || topo.includes('multilayer')) out.push(...GRAPH_PLOT_MODES);
    if(isFadnsPlotModel(kind, ex)) out.push(...FADNS_PLOT_MODES);
    return [...new Set(out)];
  }
  function defaultPlotMode(kind=selectedModelKey(), ex=model()){
    if(isFadnsPlotModel(kind, ex)) return 'fadns_species';
    if(['plant','evolution'].includes(kind)) return 'trait';
    return 'population';
  }
  function populatePlotModes(preferred=null, forceDefault=false){
    const sel=$('agentPlotMode'); if(!sel)return;
    const kind=$('agentExample')?.value || selectedModelKey(); const ex=MODEL_LIBRARY[kind]||model();
    const allowed=allowedPlotModes(kind, ex); const wanted=forceDefault ? defaultPlotMode(kind, ex) : (preferred || sel.value || defaultPlotMode(kind, ex));
    sel.innerHTML=''; allowed.forEach(key=>{const o=document.createElement('option'); o.value=key; o.textContent=AGENT_PLOT_MODES[key]||key; sel.appendChild(o);});
    sel.value=allowed.includes(wanted) ? wanted : defaultPlotMode(kind, ex);
    if(sel.value==='fadns_species' && !isFadnsPlotModel(kind, ex)) sel.value=defaultPlotMode(kind, ex);
    const ctx=$('agentPlotContext'); if(ctx){
      const label=AGENT_PLOT_MODES[sel.value]||'Diagnostic plot';
      ctx.textContent=`${label} for ${ex.label || 'selected model'}.`;
    }
  }
  function idx(x,y){const n=state.n;return ((y+n)%n)*n+((x+n)%n)}
  function status(msg,tone=''){const el=$('agentStatus'); if(el){el.textContent=msg; el.dataset.tone=tone;}}
  function paletteKey(){return $('agentPalette')?.value||'model';}
  function activePalette(){const ex=model(); const key=paletteKey(); return key==='model' ? (ex.colors||AGENT_PALETTES.scientific) : (AGENT_PALETTES[key]||AGENT_PALETTES.scientific);}
  function stateColor(i){const pal=activePalette(); return pal[i % pal.length] || '#0f766e';}
  function plotColor(i){const pal=activePalette().filter((_,idx)=>idx!==0); return pal[i % Math.max(1,pal.length)] || '#0f766e';}
  function plotTemplate(){const text=getComputedStyle(document.documentElement).getPropertyValue('--text')||'#0f172a'; const muted=getComputedStyle(document.documentElement).getPropertyValue('--muted')||'#64748b'; return {margin:{l:58,r:44,t:38,b:70},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'Inter, system-ui, sans-serif',size:12,color:text},legend:{orientation:'h',y:-.32},xaxis:{automargin:true,tickfont:{color:muted},gridcolor:'rgba(148,163,184,.18)'},yaxis:{automargin:true,tickfont:{color:muted},gridcolor:'rgba(148,163,184,.18)'}};}
  function updateOutputs(){updateInitialOutputs();const ic=$('agentInitialCount'); if(ic)ic.max=String(totalSites()); [['agentSizeOut',size()],['agentDensityOut',Math.round(initialPopulationFraction()*100)+'%'],['agentAOut',params().A.toFixed(2)],['agentBOut',params().B.toFixed(2)],['agentCOut',params().C.toFixed(2)],['agentDOut',params().D.toFixed(2)],['agentDtOut',dt().toFixed(2)],['agentDegreeOut',String(params().degree)]].forEach(([id,val])=>{const el=$(id);if(el)el.textContent=val;});}
  function updateParamLabels(){const ex=MODEL_LIBRARY[$('agentExample')?.value]||EXAMPLES.tcell; ['A','B','C','D'].forEach((k,i)=>{const lab=$('agent'+k+'Label'),input=$('agent'+k); if(lab)lab.textContent=ex.params[i]||k; if(input)input.value=ex[k.toLowerCase()]??input.value;}); if($('agentApproach'))$('agentApproach').value=ex.approach||'rule_based'; if(ex.timeMode&&$('agentTimeMode'))$('agentTimeMode').value=ex.timeMode; if(ex.topology&&$('agentTopology'))$('agentTopology').value=ex.topology; populateInitialConditions(false); populatePlotModes(null,true); updateOutputs(); renderApproach();}
  function populate(){MODEL_LIBRARY={...EXAMPLES}; populateExampleOptions($('agentExample')?.value||'tcell');}
  function populateExampleOptions(preferred){const sel=$('agentExample'); if(!sel)return; const family=$('agentModelFamily')?.value||'all'; const previous=preferred||sel.value||'tcell'; sel.innerHTML=''; Object.entries(MODEL_LIBRARY).filter(([_,v])=>family==='all'||v.family===family).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.label;sel.appendChild(o);}); if([...sel.options].some(o=>o.value===previous))sel.value=previous; else if(sel.options.length)sel.value=sel.options[0].value; else {const o=document.createElement('option');o.value='tcell';o.textContent='T-cell proliferation agents';sel.appendChild(o);sel.value='tcell';}}
  function bind(){
    [['agentReset','click',reset],['agentStep','click',stepAndDraw],['agentRun','click',toggleRun],['agentExport','click',()=>downloadJson()],['agentApplyRule','click',applyCustomRule],['agentLoadRuleTemplate','click',loadRuleTemplate],['agentLoadApproachTemplate','click',loadApproachTemplate],['agentLoadCustomModel','click',loadCustomModelSkeleton],['agentApplyCustomModel','click',applyCustomModel],['agentImport','click',importJson],['agentCopyJson','click',copyJson],['agentPlotMode','change',()=>{populatePlotModes($('agentPlotMode')?.value,false);metrics();}],['agentPalette','change',()=>{draw();metrics();status('Palette updated.');}],['agentApproach','change',()=>{loadApproachTemplate();renderApproach();}],['agentTopology','change',()=>{populatePlotModes($('agentPlotMode')?.value,false);buildGraph();renderApproach();draw();metrics();}],['agentTimeMode','change',()=>{renderApproach();status('Time update changed. Step or reset to inspect the effect.');}]].forEach(([id,ev,fn])=>$(id)?.addEventListener(ev,fn));
    $('agentModelFamily')?.addEventListener('change',()=>{populateExampleOptions();updateParamLabels();loadRuleTemplate();reset();});
    $('agentExample')?.addEventListener('change',()=>{updateParamLabels();loadRuleTemplate();reset();});
    $('agentSize')?.addEventListener('change',()=>{syncInitialCountFromDensity();updateOutputs();reset();});
    ['agentSeed','agentDegree'].forEach(id=>$(id)?.addEventListener('change',()=>{updateOutputs();reset();}));
    $('agentInitialCount')?.addEventListener('input',()=>{updateDensityFromInitialCount();updateOutputs();markStale();status('Reset needed.','busy');});
    $('agentInitialCount')?.addEventListener('change',()=>{reset();});
    $('agentDensity')?.addEventListener('input',()=>{syncInitialCountFromDensity(); updateOutputs(); markStale(); status('Reset needed.','busy');});
    $('agentDensity')?.addEventListener('change',()=>{reset();});
    ['agentA','agentB','agentC','agentD','agentDt'].forEach(id=>$(id)?.addEventListener('input',()=>{updateOutputs(); markStale(); status('Reset needed.','busy'); if($('agentRuleMode')?.value==='custom')applyCustomRule(false);}));
    $('agentRuleMode')?.addEventListener('change',()=>{applyCustomRule(false); renderRule(); status($('agentRuleMode').value==='custom'?'Custom rule mode enabled.':'Built-in rule mode enabled.');});
  }
  function init(){canvas=$('agentCanvas');ctx=canvas?.getContext('2d'); fitCanvasDpr(); window.addEventListener('resize',()=>{fitCanvasDpr();draw();});populate(); const q=new URLSearchParams(window.location.search); const requested=q.get('example'); if(requested&&EXAMPLES[requested]){if($('agentModelFamily'))$('agentModelFamily').value='all'; populateExampleOptions(requested); if($('agentExample'))$('agentExample').value=requested;} bind();syncInitialCountFromDensity();updateParamLabels();loadRuleTemplate();loadCustomModelSkeleton(false);reset();}

  function gridNeighborhoodIds(x,y,mode){const out=[]; const dirs=mode==='von_neumann'?[[1,0],[-1,0],[0,1],[0,-1]]:[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]; dirs.forEach(([dx,dy])=>out.push(idx(x+dx,y+dy))); return out;}
  function makeLayer(total){return Array.from({length:total},()=>[]);} 
  function addEdge(layer,i,j){if(i===j||i<0||j<0)return; if(!layer[i].includes(j))layer[i].push(j); if(!layer[j].includes(i))layer[j].push(i);}
  function unionIds(...layers){return [...new Set(layers.flat().filter(Number.isFinite))];}
  function buildGraph(){if(!state)return; const n=state.n,total=n*n,degree=params().degree,rand=state.rand||Math.random; const topo=$('agentTopology')?.value||'moore'; const layers={spatial:makeLayer(total),social:makeLayer(total),transport:makeLayer(total)}; for(let y=0;y<n;y++)for(let x=0;x<n;x++){const id=idx(x,y); gridNeighborhoodIds(x,y,topo==='von_neumann'?'von_neumann':'moore').forEach(j=>addEdge(layers.spatial,id,j));}
    const addRandom=(layer,k)=>{for(let i=0;i<total;i++)for(let e=0;e<k;e++){const j=Math.floor(rand()*total); addEdge(layer,i,j);}};
    const addSmallWorld=(layer,k)=>{for(let i=0;i<total;i++)for(let e=0;e<k;e++){let j; if(rand()<.72){const x=i%n,y=Math.floor(i/n),dx=Math.floor(rand()*9)-4,dy=Math.floor(rand()*9)-4; j=idx(x+dx,y+dy);} else j=Math.floor(rand()*total); addEdge(layer,i,j);}};
    if(topo==='random_graph')addRandom(layers.social,degree);
    if(topo==='small_world')addSmallWorld(layers.social,degree);
    if(topo==='multilayer_social'){addSmallWorld(layers.social,Math.max(2,Math.round(degree*.75)));}
    if(topo==='multilayer_transport'){addSmallWorld(layers.social,Math.max(2,Math.round(degree*.55))); const hubs=[]; for(let h=0;h<Math.max(4,Math.round(Math.sqrt(total)/3));h++)hubs.push(Math.floor(rand()*total)); for(const h of hubs){for(let e=0;e<degree*4;e++)addEdge(layers.transport,h,Math.floor(rand()*total));} for(let i=0;i<total;i++)if(rand()<.06)addEdge(layers.transport,i,hubs[Math.floor(rand()*hubs.length)]);}
    state.networkLayers=layers; state.graph=Array.from({length:total},(_,i)=>unionIds(layers.social[i]||[],layers.transport[i]||[]));}
  function neighborhoodIds(x,y){const topo=$('agentTopology')?.value||'moore',id=idx(x,y); const layers=state.networkLayers||{}; if(topo==='random_graph'||topo==='small_world')return state.graph?.[id]?.length?state.graph[id]:gridNeighborhoodIds(x,y,topo); if(topo==='multilayer_social')return unionIds(layers.spatial?.[id]||[],layers.social?.[id]||[]); if(topo==='multilayer_transport')return unionIds(layers.spatial?.[id]||[],layers.social?.[id]||[],layers.transport?.[id]||[]); return gridNeighborhoodIds(x,y,topo);}
  function layerDegrees(id){const layers=state.networkLayers||{}; return {spatial:(layers.spatial?.[id]||[]).length,social:(layers.social?.[id]||[]).length,transport:(layers.transport?.[id]||[]).length};}
  function countNeighbors(x,y,base=state.cells){const ids=neighborhoodIds(x,y), vals=ids.map(i=>base[i]); const byState={}; vals.forEach(v=>{byState[v]=(byState[v]||0)+1;}); return {values:vals,ids,byState,empty:byState[0]||0,a:byState[1]||0,b:byState[2]||0,c:byState[3]||0,d:byState[4]||0,e:byState[5]||0,f:byState[6]||0,g:byState[7]||0,alive:vals.filter(v=>v>0).length,degree:vals.length,layers:layerDegrees(idx(x,y))};}
  function emptyNeighbors(x,y,base=state.cells){return neighborhoodIds(x,y).filter(i=>base[i]===0);}
  function eventBag(){return {births:0,deaths:0,infections:0,recoveries:0,mutations:0,customChanges:0,transitions01:0,transitions12:0,transitions23:0,transitions34:0,transitions45:0,transitions56:0,transitions67:0,productsC14:0,productsC16:0,productsC18:0};}
  function reset(){stop(); const n=size(), rand=rngFactory(num('agentSeed',2026)); state={kind:$('agentExample')?.value||'tcell',n,t:0,cells:new Array(n*n).fill(0),traits:new Array(n*n).fill(0),memory:new Array(n*n).fill(0),rand,ant:{x:Math.floor(n/2),y:Math.floor(n/2),dir:0},events:{},graph:[]}; const kind=state.kind;
    buildGraph(); const fractions=kind==='langton' ? [1] : initialFractions();
    for(let i=0;i<n*n;i++){
      state.cells[i]=pickInitialState(rand,fractions);
      if(kind==='plant'&&state.cells[i])state.traits[i]=Math.floor(rand()*5)+1;
      if(kind==='evolution'&&state.cells[i])state.traits[i]=Math.floor(rand()*9)+1;
    }
    if($('agentRuleMode')?.value==='custom')applyCustomRule(false); history=[]; record(); renderRule(); renderApproach(); draw(); metrics(); clearStale(); status('Reset.');}
  // Mark/clear the "results no longer match the controls" state. Reuses the
  // .stale-results grayscale treatment from the four core labs for consistency.
  function markStale(){document.querySelector('.agent-sim-card')?.classList.add('stale-results');}
  function clearStale(){document.querySelector('.agent-sim-card')?.classList.remove('stale-results');}

  function orderIds(){const total=state.n*state.n, arr=[...Array(total).keys()]; if($('agentTimeMode')?.value==='discrete_async'){for(let i=arr.length-1;i>0;i--){const j=Math.floor(state.rand()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}} return arr;}
  async function step(){const n=state.n,c=state.cells,next=c.slice(),rand=state.rand,p=params(),k=state.kind,ev=eventBag(); state.t++;
    if($('agentRuleMode')?.value==='custom'&&compiledCustom){await customStep(next,ev); state.events=ev; record(); return;}
    const rp=v=>$('agentTimeMode')?.value==='continuous_rate'?rateProb(v):v;
    if(k==='life'){for(const id of orderIds()){const x=id%n,y=Math.floor(id/n),alive=countNeighbors(x,y,c).alive; next[id]=c[id]?(alive===2||alive===3?1:0):(alive===3?1:0); trackEvent(c[id],next[id],ev);}}
    else if(k==='sir'){for(const id of orderIds()){const x=id%n,y=Math.floor(id/n),cn=countNeighbors(x,y,c); if(c[id]===1&&cn.b&&rand()<rp(p.A*.45)){next[id]=2;ev.infections++;ev.transitions12++;} else if(c[id]===2&&rand()<rp(p.B*.35)){next[id]=3;ev.recoveries++;ev.transitions23++;} else if(c[id]===1&&rand()<rp(p.C*.015)){next[id]=2;ev.infections++;ev.transitions12++;} else if(c[id]===3&&rand()<rp(p.D*.05)){next[id]=1;}}}
    else if(SOCIAL_MODELS.has(k)){socialStep(next,ev,c,p,rand,rp);}
    else if(k==='fadns_particle'){fadnsStep(next,ev,c,p,rand,rp);}
    else if(k==='tcell'){for(const id of orderIds()){const x=id%n,y=Math.floor(id/n),cn=countNeighbors(x,y,c); if(c[id]===1&&(rand()<rp(p.A*.08)||rand()<rp(p.C*.02))){next[id]=2;ev.transitions12++;} else if(c[id]===2&&rand()<rp(p.B*.03)){next[id]=3;ev.deaths++;ev.transitions23++;} else if(c[id]===2&&rand()<rp(p.A*.12)){const empt=emptyNeighbors(x,y,c); if(empt.length){next[empt[Math.floor(rand()*empt.length)]]=1;ev.births++;}} if(c[id]===2&&cn.alive>5&&rand()<rp(p.D*.04)){next[id]=3;ev.deaths++;}}}
    else if(k==='predprey'){for(const id of orderIds()){const x=id%n,y=Math.floor(id/n),cn=countNeighbors(x,y,c); if(c[id]===1&&rand()<rp(p.A*.07)){const empt=emptyNeighbors(x,y,c); if(empt.length){next[empt[Math.floor(rand()*empt.length)]]=1;ev.births++;}} if(c[id]===2){const prey=neighborhoodIds(x,y).filter(j=>c[j]===1); if(prey.length&&rand()<rp(p.C*.22)){next[prey[Math.floor(rand()*prey.length)]]=2;ev.births++;} else if(!prey.length&&rand()<rp(p.B*.08)){next[id]=0;ev.deaths++;}} if(rand()<rp(p.D*.01))next[id]=0;}}
    else if(k==='forest'){for(const id of orderIds()){const x=id%n,y=Math.floor(id/n),cn=countNeighbors(x,y,c); if(c[id]===0&&rand()<rp(p.A*.05)){next[id]=1;ev.births++;} else if(c[id]===1&&(cn.b&&rand()<rp(p.C)||rand()<rp(p.B*.01))){next[id]=2;ev.customChanges++;} else if(c[id]===2){next[id]=3;} else if(c[id]===3&&rand()>p.D){next[id]=0;}}}
    else if(k==='plant'){for(const id of orderIds()){const x=id%n,y=Math.floor(id/n),cn=countNeighbors(x,y,c); if(c[id]===1&&(rand()<rp(p.B*.035)||(cn.alive>5&&rand()<rp(p.D*.04)))){next[id]=2;ev.deaths++;} if(c[id]===1&&rand()<rp(p.A*.08)){const empt=emptyNeighbors(x,y,c); if(empt.length){const j=empt[Math.floor(rand()*empt.length)]; next[j]=1; state.traits[j]=clamp((state.traits[id]||3)+(rand()<p.C?(rand()<.5?-1:1):0),1,5); if(state.traits[j]!==state.traits[id])ev.mutations++; ev.births++;}}}}
    else if(k==='evolution'){const optimum=1+8*(.5+.5*Math.sin(state.t/(20+80*p.D))); for(let i=0;i<c.length;i++){if(c[i]&&rand()<rp(p.B*.025)){next[i]=0;ev.deaths++;} if(c[i]){const fit=Math.max(0,1-Math.abs((state.traits[i]||5)-optimum)/8); if(rand()<rp(p.A*.06*fit)){const x=i%n,y=Math.floor(i/n),empt=emptyNeighbors(x,y,c); if(empt.length){const j=empt[Math.floor(rand()*empt.length)]; next[j]=1; state.traits[j]=clamp((state.traits[i]||5)+(rand()<p.C?(rand()<.5?-1:1):0),1,9); if(state.traits[j]!==state.traits[i])ev.mutations++; ev.births++;}}}}}
    else if(k==='langton'){const ant=state.ant,id=idx(ant.x,ant.y); if(c[id]){ant.dir=(ant.dir+3)%4;next[id]=0;} else {ant.dir=(ant.dir+1)%4;next[id]=1;} const d=[[0,-1],[1,0],[0,1],[-1,0]][ant.dir]; ant.x=(ant.x+d[0]+n)%n; ant.y=(ant.y+d[1]+n)%n; ev.customChanges++;}
    state.cells=next; state.events=ev; record();}

  function trackEvent(oldv,newv,ev){if(newv!==oldv){ev.customChanges++; if(!oldv&&newv)ev.births++; if(oldv&&!newv)ev.deaths++; const key='transitions'+oldv+newv; if(Object.prototype.hasOwnProperty.call(ev,key))ev[key]++;}}
  function maxStateIndex(){return Math.max(3,((model().states||[]).length-1));}
  function normalizeCustomResult(res,oldState,oldTrait){const maxState=maxStateIndex(); if(res&&typeof res==='object')return {state:clamp(Number(res.state ?? res.cell ?? oldState)||0,0,maxState)|0,trait:Number.isFinite(Number(res.trait))?Number(res.trait):oldTrait,event:String(res.event||'')}; return {state:clamp(Number(res)||0,0,maxState)|0,trait:oldTrait,event:''};}
  async function customStep(next,ev){const payload={type:'step',code:$('agentCustomCode')?.value||'',cells:state.cells,traits:state.traits,memory:state.memory,n:state.n,params:params(),dt:dt(),timeMode:$('agentTimeMode')?.value||'discrete_sync',topology:$('agentTopology')?.value||'moore',graph:state.graph||[],networkLayers:state.networkLayers||{},t:state.t,seed:num('agentSeed',2026)+state.t*104729,maxState:maxStateIndex()}; const res=await workerCall(payload,1200); state.cells=res.cells; state.traits=res.traits; state.memory=res.memory||state.memory; Object.assign(ev,res.events||{});}
  async function stepAndDraw(){if(stepBusy)return; stepBusy=true; try{await step(); draw(); metrics(); status(`Step ${state.t}.`);}catch(e){status('Step failed: '+(e.message||e),'error'); stop();}finally{stepBusy=false;}}
  function toggleRun(){if(timer){stop();return;} $('agentRun').textContent='Pause'; let left=Math.max(1,num('agentSteps',100)); const loop=async()=>{if(!timer)return; await stepAndDraw(); if(--left<=0){stop();return;} timer=setTimeout(loop,Math.max(0,num('agentDelay',40)));}; timer=setTimeout(loop,0);}
  function stop(){if(timer){clearTimeout(timer);timer=null;} if($('agentRun'))$('agentRun').textContent='Run';}

  function counts(){const ex=model(), nStates=Math.max(4,(ex.states||[]).length), o={empty:0,a:0,b:0,c:0,trait:0,ntrait:0,states:Array(nStates).fill(0)}; state.cells.forEach((v,i)=>{const sv=clamp(Number(v)||0,0,nStates-1)|0; o.states[sv]=(o.states[sv]||0)+1; if(!sv)o.empty++; if(sv===1)o.a++; if(sv===2)o.b++; if(sv===3)o.c++; if(sv&&state.traits[i]){o.trait+=state.traits[i];o.ntrait++;}}); for(let i=0;i<o.states.length;i++)o['s'+i]=o.states[i]||0; o.meanTrait=o.ntrait?o.trait/o.ntrait:0; return o;}
  function record(){const cc=counts(), ev=state.events||eventBag(); history.push({t:state.t,...cc,...ev}); if(history.length>900)history.shift();}
  function fitCanvasDpr(){ if(!canvas||!ctx)return; const rect=canvas.getBoundingClientRect(); const logicalW=Math.max(320, rect.width||760), logicalH=Math.max(260, rect.height||520); const dpr=window.devicePixelRatio||1; if(canvas.width!==Math.round(logicalW*dpr)||canvas.height!==Math.round(logicalH*dpr)){ canvas.width=Math.round(logicalW*dpr); canvas.height=Math.round(logicalH*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); canvas.dataset.logicalWidth=String(logicalW); canvas.dataset.logicalHeight=String(logicalH); } }
  function draw(){if(!ctx)return; fitCanvasDpr(); const n=state.n,w=Number(canvas.dataset.logicalWidth)||760,h=Number(canvas.dataset.logicalHeight)||520,cell=Math.min(w,h)/n,ox=(w-cell*n)/2,oy=(h-cell*n)/2,ex=model(); ctx.clearRect(0,0,w,h); ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--panel')||'#f8fafc'; ctx.fillRect(0,0,w,h); for(let y=0;y<n;y++)for(let x=0;x<n;x++){const id=idx(x,y),v=state.cells[id]; if(v){if(['evolution','plant'].includes(state.kind)&&state.traits[id])ctx.fillStyle=state.kind==='plant'?`hsl(${105+state.traits[id]*8},58%,38%)`:`hsl(${180+state.traits[id]*18},70%,42%)`; else ctx.fillStyle=stateColor(v); ctx.fillRect(ox+x*cell,oy+y*cell,Math.ceil(cell),Math.ceil(cell));}} if(state.kind==='langton'){ctx.fillStyle='#dc2626'; ctx.beginPath(); ctx.arc(ox+(state.ant.x+.5)*cell,oy+(state.ant.y+.5)*cell,Math.max(3,cell*.45),0,Math.PI*2); ctx.fill();}}
  function renderRule(){const ex=model(); $('agentTitle').textContent=ex.label; $('agentCaption').textContent=ex.caption; const mode=$('agentRuleMode')?.value==='custom'?'Custom local rule':'Built-in rule'; const tm=$('agentTimeMode')?.value||'discrete_sync', topo=$('agentTopology')?.value||'moore'; $('agentRuleSummary').innerHTML=`<p><b>${esc(mode)}.</b> ${esc(ex.caption)}</p><ol>${(ex.rule||[]).map(r=>`<li>${esc(r)}</li>`).join('')}</ol><p><b>Update:</b> ${esc(tm.replaceAll('_',' '))}; <b>Topology:</b> ${esc(topo.replaceAll('_',' '))}; <b>dt:</b> ${dt().toFixed(2)}.</p><p><b>Parameter meaning:</b> ${(ex.params||[]).map((p,i)=>`${'ABCD'[i]}=${esc(p)}`).join('; ')}.</p>`; $('agentLegend').innerHTML=(ex.states||[]).map((s,i)=>`<span><i style="background:${stateColor(i)}"></i>${esc(i+': '+s)}</span>`).join('');}
  function renderApproach(){const key=$('agentApproach')?.value||model().approach||'rule_based',ap=APPROACHES[key]||APPROACHES.rule_based; const time=$('agentTimeMode')?.value||'discrete_sync', topo=$('agentTopology')?.value||'moore'; const info=$('agentApproachInfo'); if(info)info.textContent=`${ap.label} · ${time.replaceAll('_',' ')} · ${topo.replaceAll('_',' ')}`; const box=$('agentApproachCompare'); if(box)box.innerHTML=`<table><thead><tr><th>Approach</th><th>Strength</th><th>Use when</th></tr></thead><tbody>${Object.values(APPROACHES).map(a=>`<tr><td><b>${esc(a.label)}</b></td><td>${esc(a.summary)}</td><td>${esc(a.best)}</td></tr>`).join('')}</tbody></table>`; renderRule();}
  function stateLabel(i){return (model().states||[])[i]||('state '+i);}
  function kpiHtml(cc){const occupied=state.cells.length-(cc.states?.[0]||cc.empty||0); const names=model().states||[]; let cards=[`<div><b>${state.t}</b><span>step</span></div>`,`<div><b>${occupied}</b><span>occupied</span></div>`]; for(let i=1;i<Math.min(names.length,6);i++)cards.push(`<div><b>${cc.states?.[i]||0}</b><span>${esc(names[i])}</span></div>`); if(names.length>6){const tail=(cc.states||[]).slice(6).reduce((a,b)=>a+b,0); cards.push(`<div><b>${tail}</b><span>other tracked</span></div>`);} if(cc.meanTrait)cards.push(`<div><b>${cc.meanTrait.toFixed(2)}</b><span>mean trait</span></div>`); return cards.join('');}
  function entropyFromCounts(arr){const total=arr.reduce((a,b)=>a+b,0)||1; return arr.reduce((h,c)=>{const p=c/total; return p>0?h-p*Math.log2(p):h;},0);}
  function cumulative(key){let acc=0; return history.map(d=>{acc+=d[key]||0; return acc;});}
  function heatmapRows(){const n=state.n, z=[]; for(let y=0;y<n;y++){const row=[]; for(let x=0;x<n;x++)row.push(state.cells[idx(x,y)]||0); z.push(row);} return z;}
  function metrics(){
    const box=$('agentMetrics'),cc=counts(), ex=model(), names=ex.states||['empty','state 1','state 2','state 3'];
    $('agentKpis').innerHTML=kpiHtml(cc);
    if(!history.length)record();
    if(!window.Plotly){box.innerHTML='<p>Plotly unavailable. Counts: '+esc(JSON.stringify(cc))+'</p>'; return;}
    let mode=$('agentPlotMode')?.value||defaultPlotMode(state.kind,ex); if(!allowedPlotModes(state.kind,ex).includes(mode)){populatePlotModes(null,true); mode=$('agentPlotMode')?.value||defaultPlotMode(state.kind,ex);} const xs=history.map(d=>d.t), pal=activePalette();
    let traces=[],lay=plotTemplate();
    const countsNow=names.map((_,i)=>cc.states?.[i]||0);
    const lineTrace=(i,name)=>({x:xs,y:history.map(d=>d.states?.[i]||0),mode:'lines',name,line:{color:plotColor(i-1),width:2.25}});
    if(mode==='composition'){
      traces=[{type:'bar',x:names,y:countsNow,name:'cells',marker:{color:names.map((_,i)=>stateColor(i))}}];
      lay.title={text:'Current state composition',font:{size:14}}; lay.xaxis.tickangle=names.length>5?-25:0;
    }
    else if(mode==='state_rank'){
      const ranked=names.map((n,i)=>({name:n,count:countsNow[i],idx:i})).sort((a,b)=>b.count-a.count);
      traces=[{type:'bar',orientation:'h',y:ranked.map(r=>r.name).reverse(),x:ranked.map(r=>r.count).reverse(),name:'cells',marker:{color:ranked.map(r=>stateColor(r.idx)).reverse()}}];
      lay.title={text:'State ranking at current step',font:{size:14}}; lay.xaxis.title='cells'; lay.margin.l=110;
    }
    else if(mode==='population_stacked'){
      traces=names.slice(1).map((name,offset)=>({x:xs,y:history.map(d=>d.states?.[offset+1]||0),mode:'lines',stackgroup:'agents',name,line:{color:plotColor(offset),width:1.6},fillcolor:plotColor(offset)}));
      lay.title={text:'Stacked population composition over time',font:{size:14}}; lay.xaxis.title='step'; lay.yaxis.title='agent count';
    }
    else if(mode==='phase'){
      traces=[{type:'scatter',mode:'lines+markers',x:history.map(d=>d.states?.[1]||d.a||0),y:history.map(d=>d.states?.[2]||d.b||0),name:`${stateLabel(1)} vs ${stateLabel(2)}`,line:{color:plotColor(0)},marker:{size:4,color:plotColor(1)}}];
      lay.title={text:'Phase portrait from simulation history',font:{size:14}}; lay.xaxis.title=stateLabel(1); lay.yaxis.title=stateLabel(2);
    }
    else if(mode==='trait'){
      const vals=state.traits.filter((v,i)=>state.cells[i]&&v);
      traces=[{type:'histogram',x:vals,name:'trait',xbins:{size:1},marker:{color:plotColor(0)}}];
      lay.title={text:'Current trait distribution',font:{size:14}}; lay.xaxis.title='trait'; lay.yaxis.title='count';
    }
    else if(mode==='events'){
      ['births','deaths','infections','recoveries','mutations','productsC14','productsC16','productsC18','customChanges'].forEach((k,i)=>traces.push({type:'scatter',mode:'lines',x:xs,y:history.map(d=>d[k]||0),name:k,line:{color:plotColor(i),width:2}}));
      lay.title={text:'Events per step',font:{size:14}}; lay.xaxis.title='step'; lay.yaxis.title='events';
    }
    else if(mode==='cumulative_events'){
      ['births','deaths','infections','recoveries','mutations','productsC14','productsC16','productsC18','customChanges'].forEach((k,i)=>traces.push({type:'scatter',mode:'lines',x:xs,y:cumulative(k),name:k,line:{color:plotColor(i),width:2.1}}));
      lay.title={text:'Cumulative event burden',font:{size:14}}; lay.xaxis.title='step'; lay.yaxis.title='cumulative events';
    }
    else if(mode==='diversity'){
      traces=[{type:'scatter',mode:'lines',x:xs,y:history.map(d=>entropyFromCounts((d.states||[]).slice(1))),name:'Shannon entropy',line:{color:plotColor(0),width:2.4}},{type:'scatter',mode:'lines',x:xs,y:history.map(d=>((d.states||[]).filter((c,i)=>i>0&&c>0).length)),name:'active states',line:{color:plotColor(2),width:2,dash:'dot'},yaxis:'y2'}];
      lay.title={text:'State diversity during the simulation',font:{size:14}}; lay.xaxis.title='step'; lay.yaxis.title='entropy'; lay.yaxis2={overlaying:'y',side:'right',title:'active states',automargin:true};
    }
    else if(mode==='transition'){
      const ev=state.events||{}; const labs=['0→1','1→2','2→3','3→4','4/5/6→CoA','custom']; const vals=[ev.transitions01||0,ev.transitions12||0,ev.transitions23||0,ev.transitions34||0,ev.transitions67||0,ev.customChanges||0];
      traces=[{type:'bar',x:labs,y:vals,name:'last-step transitions',marker:{color:labs.map((_,i)=>plotColor(i))}}]; lay.title={text:'Last-step transition/event summary',font:{size:14}}; lay.yaxis.title='events';
    }
    else if(mode==='network'){
      const layers=state.networkLayers||{}; const deg=state.graph?.length?state.graph.map(g=>g.length):[countNeighbors(0,0).degree];
      traces=[{type:'histogram',x:deg,name:'merged graph degree',marker:{color:plotColor(0)}}];
      if(layers.social?.length)traces.push({type:'histogram',x:layers.social.map(g=>g.length),name:'social layer',opacity:.62,marker:{color:plotColor(1)}});
      if(layers.transport?.length)traces.push({type:'histogram',x:layers.transport.map(g=>g.length),name:'transport layer',opacity:.62,marker:{color:plotColor(2)}});
      lay.barmode='overlay'; lay.title={text:'Network / multilayer degree distribution',font:{size:14}}; lay.xaxis.title='degree'; lay.yaxis.title='cells';
    }
    else if(mode==='layers'){
      const layers=state.networkLayers||{}; const namesL=['spatial','social','transport'];
      traces=[{type:'bar',x:namesL,y:namesL.map(k=>layers[k]?.length?layers[k].reduce((a,g)=>a+g.length,0)/layers[k].length:0),name:'mean degree',marker:{color:namesL.map((_,i)=>plotColor(i))}}];
      lay.title={text:'Mean degree by network layer',font:{size:14}}; lay.yaxis.title='mean degree';
    }
    else if(mode==='spatial_summary'){
      const n=state.n, rows=[]; for(let y=0;y<n;y++){let c=0;for(let x=0;x<n;x++)if(state.cells[idx(x,y)])c++;rows.push(c/n);}
      traces=[{type:'scatter',mode:'lines',x:rows.map((_,i)=>i),y:rows,name:'occupied fraction',line:{color:plotColor(0),width:2.4}}]; lay.title={text:'Spatial occupancy profile by row',font:{size:14}}; lay.xaxis.title='row'; lay.yaxis.title='occupied fraction';
    }
    else if(mode==='spatial_heatmap'){
      traces=[{type:'heatmap',z:heatmapRows(),colorscale:pal.map((c,i)=>[i/Math.max(1,pal.length-1),c]),showscale:true,colorbar:{title:'state'}}];
      lay.title={text:'Spatial state heatmap',font:{size:14}}; lay.xaxis.title='x'; lay.yaxis.title='y'; lay.yaxis.autorange='reversed';
    }
    else if(mode==='fadns_species'){
      if(!isFadnsPlotModel(state.kind, ex)){populatePlotModes(null,true); return metrics();}
      const ids=[1,2,3,4,5,6,7].filter(i=>i<names.length); traces=ids.map((i,k)=>({x:xs,y:history.map(d=>d.states?.[i]||0),mode:'lines',name:names[i],line:{color:plotColor(k),width:2.25}})); lay.title={text:'FADNS tracked species: substrates, intermediates, C14/C16/C18 and CoA',font:{size:14}}; lay.xaxis.title='step'; lay.yaxis.title='agent count';
    }
    else {
      for(let i=1;i<names.length;i++)traces.push(lineTrace(i,names[i]||('state '+i)));
      if(['plant','evolution'].includes(state.kind))traces.push({x:xs,y:history.map(d=>d.meanTrait),mode:'lines',name:'mean trait',line:{color:plotColor(names.length),width:2,dash:'dash'},yaxis:'y2'});
      lay.title={text:'Population metrics',font:{size:14}}; lay.xaxis.title='step'; lay.yaxis.title='count'; if(['plant','evolution'].includes(state.kind))lay.yaxis2={overlaying:'y',side:'right',title:'trait',automargin:true};
    }
    const ctx=$('agentPlotContext'); if(ctx)ctx.textContent=`${AGENT_PLOT_MODES[mode]||'Diagnostic plot'} for ${ex.label||'selected model'}.`;
    if(!traces.length){box.innerHTML='<div class="agent-empty-plot">No diagnostic trace is available for this model and plot combination.</div>'; return;}
    Plotly.react(box,traces,lay,{responsive:true,displaylogo:false}).then(()=>{try{Plotly.Plots.resize(box);}catch(_e){}});
  }

  function ensureRuleWorker(){if(customWorker)return customWorker; if(!window.Worker){workerReady=false; return null;} customWorker=new Worker('src/agent-rule-worker.js?v=72.48.0'); customWorker.onerror=e=>{workerReady=false; status('Custom rule worker error: '+(e.message||'unknown error'),'error');}; return customWorker;}
  function workerCall(payload,timeout=900){return new Promise((resolve,reject)=>{const w=ensureRuleWorker(); if(!w)return reject(new Error('Web Worker unavailable. Serve the page through http://localhost, not file://.')); const id=++workerSeq; const timer=setTimeout(()=>{w.terminate(); customWorker=null; workerReady=false; reject(new Error('custom rule timeout; worker was reset'));},timeout); const handler=ev=>{if(ev.data?.requestId!==id)return; clearTimeout(timer); w.removeEventListener('message',handler); ev.data.ok?resolve(ev.data):reject(new Error(ev.data.error||'worker failure'));}; w.addEventListener('message',handler); w.postMessage({requestId:id,...payload});});}
  async function applyCustomRule(report=true){if($('agentRuleMode')?.value!=='custom'){compiledCustom=null; workerReady=false; if(report)status('Built-in rules active.'); return;} try{status('Compiling custom rule in Web Worker sandbox…','busy'); await workerCall({type:'compile',code:$('agentCustomCode').value},700); compiledCustom='worker'; workerReady=true; if(report)status('Custom rule compiled in worker sandbox. Step or run to apply it.');}catch(e){compiledCustom=null; workerReady=false; status('Custom rule rejected by sandbox: '+(e.message||e),'error');}}
  // v24 note: previous main-thread new Function execution was removed; new Function now lives only inside agent-rule-worker.js.

  function templateFor(kind){const approach=$('agentApproach')?.value||'rule_based'; const templates={rule_based:`// Rule-Based Decision Making\n// return 0, 1, 2 or 3\nif (cell === 1 && counts.alive > 5 && rand() < params.D) return 0;\nif (cell === 0 && counts.a >= 2 && rand() < params.A) return 1;\nreturn cell;`,statechart:`// State-Driven / Statechart rule\n// 0 empty, 1 resting, 2 active, 3 terminal\nif (cell === 1 && rand() < params.A * dt) return 2;\nif (cell === 2 && rand() < params.B * dt) return 3;\nif (cell === 2 && counts.empty > 0 && rand() < params.C * dt) return 1;\nreturn cell;`,adaptive:`// Adaptive / learning agent rule\n// return an object when updating state and trait\nlet nextTrait = trait || 1;\nif (cell > 0 && rand() < params.C) nextTrait += rand() < 0.5 ? -1 : 1;\nif (cell === 0 && counts.a > 1 && rand() < params.A) return {state:1, trait:Math.max(1,nextTrait), event:'birth'};\nif (cell > 0 && counts.alive > 5 && rand() < params.B) return {state:0, trait:0, event:'death'};\nreturn {state:cell, trait:nextTrait};`,graph:`// Graph / network contact rule\n// counts comes from graph neighbors if graph topology is selected\nif (cell === 1 && counts.b > 0 && rand() < params.A * counts.b / Math.max(1, counts.degree)) return {state:2, event:'infection'};\nif (cell === 2 && rand() < params.B) return {state:3, event:'recovery'};\nreturn cell;`}; const byKind={sir:templates.graph,tcell:templates.statechart,fadns_particle:`// FADNS particle-agent tracker
// 0 empty, 1 Acetyl-CoA, 2 Malonyl-CoA, 3 chain intermediate, 4 C14, 5 C16, 6 C18, 7 CoA
if (cell === 0 && rand() < params.D * 0.07) return rand() < 0.5 ? 1 : 2;
if ((cell === 1 && counts.b > 0) || (cell === 2 && counts.a > 0)) {
  if (rand() < params.A * 0.12) return {state:3, event:'condensation'};
}
if (cell === 3 && rand() < params.B * 0.11) {
  const r = rand();
  if (r < 0.30) return {state:4, event:'C14'};
  if (r < 0.75) return {state:5, event:'C16'};
  return {state:6, event:'C18'};
}
if ((cell === 4 || cell === 5 || cell === 6) && rand() < params.C * 0.08) return {state:7, event:'CoA'};
if (cell === 7 && rand() < params.C * 0.12) return 0;
return cell;`,life:`// Conway's Game of Life\nif (cell === 1 && (counts.alive === 2 || counts.alive === 3)) return 1;\nif (cell === 0 && counts.alive === 3) return 1;\nreturn 0;`,forest:`// Forest-fire local rule\nif (cell === 0 && rand() < params.A * 0.05) return 1;\nif (cell === 1 && (counts.b > 0 || rand() < params.B * 0.01)) return 2;\nif (cell === 2) return 3;\nif (cell === 3 && rand() > params.D) return 0;\nreturn cell;`}; if(SOCIAL_MODELS.has(kind)) return `// Social / network-contagion rule template\n// 0 outside, 1 baseline/compliant, 2 activated by rumor/hype/panic, 3 corrected/resistant/removed\nconst pressure = (counts.b + 0.6 * counts.c) / Math.max(1, counts.degree);\nif (cell === 1 && rand() < params.A * pressure + params.B * 0.035) return {state:2, event:'contagion'};\nif (cell === 2 && rand() < params.C * 0.08) return {state:3, event:'correction'};\nif (cell === 3 && rand() < params.D * 0.015) return 1;\nreturn cell;`; return byKind[kind]||templates[approach]||templates.rule_based;}
  function loadRuleTemplate(){const k=$('agentExample')?.value||'life'; if($('agentCustomCode'))$('agentCustomCode').value=templateFor(k); applyCustomRule(false); status('Rule template loaded. Switch to custom mode to run it.');}
  function loadApproachTemplate(){if($('agentCustomCode'))$('agentCustomCode').value=templateFor($('agentExample')?.value||'life'); applyCustomRule(false); status('Approach template loaded.');}
  function customSkeleton(){return {lab:'Agent Lab',version:'v54',id:'my-custom-agent-model',family:'custom',label:'My custom agent model',caption:'Define state meanings, parameters and a local update rule.',approach:$('agentApproach')?.value||'rule_based',timeMode:$('agentTimeMode')?.value||'discrete_sync',topology:$('agentTopology')?.value||'moore',states:['empty','state 1','state 2','state 3'],colors:['#ffffff','#2563eb','#dc2626','#16a34a'],params:['birth / activation','death / recovery','mutation / import','crowding / memory'],a:25,b:10,c:5,d:2,density:35,initial:{1:32,2:3,3:0},rule:['document your transition rules here'],ruleCode:templateFor('custom')};}
  function loadCustomModelSkeleton(report=true){const box=$('agentCustomModelJson'); if(box)box.value=JSON.stringify(customSkeleton(),null,2); if(report)status('Custom model skeleton loaded. Edit JSON, then apply.');}
  function applyCustomModel(){try{const cfg=JSON.parse($('agentCustomModelJson')?.value||'{}'); const id=(cfg.id||'custom_'+Date.now()).replace(/[^A-Za-z0-9_-]/g,'_'); MODEL_LIBRARY[id]={family:cfg.family||'custom',label:cfg.label||'Custom agent model',caption:cfg.caption||'Custom Agent Lab model.',states:cfg.states||['empty','state 1','state 2','state 3'],colors:cfg.colors||['#fff','#2563eb','#dc2626','#16a34a'],params:cfg.params||['A','B','C','D'],a:cfg.a??25,b:cfg.b??10,c:cfg.c??5,d:cfg.d??2,approach:cfg.approach||'rule_based',timeMode:cfg.timeMode,topology:cfg.topology,initial:cfg.initial||null,behavior:cfg.behavior,rule:cfg.rule||['custom rule']}; const sel=$('agentExample'); if(![...sel.options].some(o=>o.value===id)){const o=document.createElement('option');o.value=id;o.textContent=MODEL_LIBRARY[id].label;sel.appendChild(o);} sel.value=id; if(cfg.timeMode&&$('agentTimeMode'))$('agentTimeMode').value=cfg.timeMode; if(cfg.topology&&$('agentTopology'))$('agentTopology').value=cfg.topology; if(cfg.density!==undefined&&$('agentDensity'))$('agentDensity').value=cfg.density; if(cfg.ruleCode){$('agentCustomCode').value=cfg.ruleCode; $('agentRuleMode').value='custom';} updateParamLabels(); applyCustomRule(false); reset(); status('Applied custom model specification.');}catch(e){status('Custom model JSON failed: '+(e.message||e),'error');}}
  function configObject(){return {lab:'Agent Lab',version:'v54',example:state.kind,approach:$('agentApproach')?.value,timeMode:$('agentTimeMode')?.value,topology:$('agentTopology')?.value,dt:dt(),ruleMode:$('agentRuleMode')?.value,customRule:$('agentCustomCode')?.value,customModel:$('agentCustomModelJson')?.value,gridSize:state.n,initialPopulation:initialPopulationCount(),density:initialPopulationFraction(),parameters:params(),initialFractions:initialFractions(),seed:num('agentSeed',2026),step:state.t,plotMode:$('agentPlotMode')?.value,palette:paletteKey(),states:model().states};}
  function exportConfig(){return configObject();}
  function jsonText(){return JSON.stringify(configObject(),null,2);}
  function downloadJson(){const txt=jsonText(); $('agentJsonBox').value=txt; const blob=new Blob([txt],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='foko-agent-model-v54.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); status('JSON exported.');}
  async function copyJson(){const txt=jsonText(); $('agentJsonBox').value=txt; try{await navigator.clipboard.writeText(txt); status('JSON copied.');}catch(_){status('JSON placed in the text box for manual copy.');}}
  function importJson(){try{const cfg=JSON.parse($('agentJsonBox').value); if(cfg.customModel){$('agentCustomModelJson').value=typeof cfg.customModel==='string'?cfg.customModel:JSON.stringify(cfg.customModel,null,2); applyCustomModel(); return;} if(cfg.example&&MODEL_LIBRARY[cfg.example]){$('agentExample').value=cfg.example;updateParamLabels();} ['agentApproach','agentTimeMode','agentTopology','agentPlotMode','agentPalette','agentRuleMode'].forEach(id=>{if(cfg[id.replace('agent','').replace(/^[A-Z]/,m=>m.toLowerCase())]&&$(id))$(id).value=cfg[id.replace('agent','').replace(/^[A-Z]/,m=>m.toLowerCase())];}); if(cfg.gridSize)$('agentSize').value=cfg.gridSize; if(cfg.initialPopulation!==undefined&&$('agentInitialCount'))$('agentInitialCount').value=clamp(Number(cfg.initialPopulation)||0,0,totalSites()); else if(cfg.density){$('agentDensity').value=clamp(cfg.density*100,1,95); syncInitialCountFromDensity();} if(cfg.parameters){$('agentA').value=clamp(sliderPercentFromParameter(cfg.parameters.A),0,100);$('agentB').value=clamp(sliderPercentFromParameter(cfg.parameters.B),0,100);$('agentC').value=clamp(sliderPercentFromParameter(cfg.parameters.C),0,100);$('agentD').value=clamp(sliderPercentFromParameter(cfg.parameters.D),0,100);} if(cfg.initialFractions){populateInitialConditions(false); cfg.initialFractions.forEach((v,i)=>{const inp=$('agentInit'+i); if(inp)inp.value=clamp(Number(v)*100,0,100);}); updateInitialOutputs();} if(cfg.seed)$('agentSeed').value=cfg.seed; if(cfg.ruleMode)$('agentRuleMode').value=cfg.ruleMode; if(cfg.customRule)$('agentCustomCode').value=cfg.customRule; updateOutputs(); applyCustomRule(false); reset(); status('Imported JSON configuration.');}catch(e){status('Import failed: '+(e.message||e),'error');}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
