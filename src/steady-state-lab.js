const $ = id => document.getElementById(id);
const clone = x => JSON.parse(JSON.stringify(x));

const STEADY_PRESETS = {
  'Michaelis-Menten steady state': {family:'Core / enzyme kinetics', narrative:'Quasi-steady enzyme-complex balance. It solves the algebraic complex balance kon·E·S − koff·C − kcat·C = 0 and illustrates how saturation kinetics emerges from mass action.', vars:[['C',0.2]], equations:['kon*E*S - koff*C - kcat*C'], params:{kon:2,koff:.6,kcat:1,E:1,S:1}},
  'SIR endemic equilibrium': {family:'Core / epidemiology', narrative:'Endemic susceptible-infected balance with births and deaths. The positive equilibrium exists when transmission is strong enough to maintain infection.', vars:[['S',.35],['I',.15]], equations:['mu*N - beta*S*I/N - mu*S','beta*S*I/N - gamma*I - mu*I'], params:{beta:2.2,gamma:.5,mu:.05,N:1}},
  'Toggle switch bistability': {family:'Core / gene regulation', narrative:'Canonical bistable switch. Try different initial guesses to reveal the two stable branches and the unstable middle state.', vars:[['x',.6],['y',2.2]], equations:['alpha/(1+y^n) - x','alpha/(1+x^n) - y'], params:{alpha:4,n:2}},
  'Predator-prey equilibrium': {family:'Core / ecology', narrative:'Lotka-Volterra coexistence equilibrium solved directly as f(x,y)=0 instead of by time integration.', vars:[['x',1.2],['y',1.4]], equations:['a*x - b*x*y','d*x*y - c*y'], params:{a:1.2,b:.8,c:.9,d:.7}},
  'CSTR equilibrium': {family:'Core / chemistry', narrative:'Reduced continuous stirred-tank reactor balance with nonlinear Michaelis-type consumption.', vars:[['C',.5]], equations:['Fin*(Cin-C) - vmax*C/(Km+C)'], params:{Fin:1,Cin:2,vmax:1.2,Km:.4}},
  'Budget allocation KKT toy': {family:'Core / optimization algebra', narrative:'Small KKT-like algebraic system for constrained allocation and Lagrange multipliers.', vars:[['x',.4],['y',.6],['lambda',-1]], equations:['2*x + lambda','2*y + lambda','x + y - 1'], params:{}},
  'Brusselator fixed points': {family:'Additional / nonlinear chemistry', narrative:'Fixed point of the Brusselator reaction oscillator before time-domain simulation.', vars:[['x',1],['y',3]], equations:['A + x^2*y - (B+1)*x','B*x - x^2*y'], params:{A:1,B:3}},
  'Logistic carrying capacity': {family:'Additional / population', narrative:'Steady states of logistic growth with harvest. Continuation in H shows when positive roots disappear.', vars:[['N',8.8]], equations:['r*N*(1-N/K)-H'], params:{r:1,K:10,H:1}},
  'Monod chemostat equilibrium': {family:'Additional / biotechnology', narrative:'Substrate and biomass balances in a chemostat with Monod uptake.', vars:[['S',.6],['X',3]], equations:['D*(Sin-S) - (mumax*S/(Ks+S))*X/Y','((mumax*S/(Ks+S))-D)*X'], params:{D:.4,Sin:5,mumax:1,Ks:.5,Y:.6}},
  'Hill feedback equilibrium': {family:'Additional / feedback', narrative:'Self-repressing Hill feedback fixed point. Useful for transcriptional regulation and nonlinear dose response.', vars:[['x',1.4]], equations:['basal + vmax/(1+x^n) - deg*x'], params:{basal:.1,vmax:4,n:3,deg:1}},
  'Reaction equilibrium A ⇌ B': {family:'Additional / chemistry', narrative:'Mass-action reversible reaction with a conserved total pool.', vars:[['A',.35],['B',.65]], equations:['-kf*A + kr*B','A + B - T'], params:{kf:1.5,kr:.8,T:1}}
,
  'Leaf gas-exchange operating point': {family:'Real-world / photosynthesis', narrative:'Algebraic leaf operating point linking biochemical assimilation with diffusive CO2 supply. It asks whether a chosen stomatal conductance and biochemical capacity can support a consistent internal CO2 concentration.', vars:[['A',12],['Ci',240]], equations:['Vcmax*(Ci-Gamma)/(Ci+K) - A','gs*(Ca-Ci) - A'], params:{Vcmax:35,Gamma:40,K:400,gs:.08,Ca:420}},
  'Soil pesticide exposure balance': {family:'Real-world / environmental risk', narrative:'Two-pool parent/metabolite steady-state exposure model. Parent compound enters by repeated application and leaves by degradation, runoff, and leaching; metabolite is produced from parent degradation and cleared separately.', vars:[['C_parent',.8],['C_met',.25]], equations:['dose/interval - (kdeg + runoff + leach)*C_parent','yield*kdeg*C_parent - (kmet + runoffM + leachM)*C_met'], params:{dose:1.0,interval:7,kdeg:.12,runoff:.025,leach:.018,yield:.45,kmet:.09,runoffM:.015,leachM:.025}},
  'Wastewater nitrification balance': {family:'Real-world / environmental engineering', narrative:'Activated-sludge nitrification balance for ammonium and nitrifier biomass. The model connects hydraulic dilution, Monod growth, biomass decay, and substrate consumption.', vars:[['NH4',.35],['Xn',11.5]], equations:['D*(NH4in-NH4) - (mumax*NH4/(Ks+NH4))*Xn/Y','((mumax*NH4/(Ks+NH4)) - D - kd)*Xn'], params:{D:.2,NH4in:30,mumax:.9,Ks:1,Y:.45,kd:.03}},
  'Lake phosphorus steady state': {family:'Real-world / ecology', narrative:'Well-mixed lake phosphorus balance with external loading, flushing, settling, and saturating biological uptake. Continuation in load shows how management pressure shifts the equilibrium.', vars:[['P',.08]], equations:['load/V - (outflow/V + settling)*P - vmax*P/(Kp+P)'], params:{load:120,V:1000,outflow:180,settling:.08,vmax:.06,Kp:.05}}
};
const CORE = Object.keys(STEADY_PRESETS).slice(0,6);
let model, currentName = CORE[0], last = null, continuation = [];

function init(){
  setTheme(localStorage.getItem('chilperic-theme') || 'aurora');
  $('themeBtn')?.addEventListener('change', e => setTheme(e.target.value));
  initTabs(); bindSideNav(); renderLibrary();
  const params=new URLSearchParams(location.search); if(params.get('import')==='session' && sessionStorage.getItem('foko-steady-import')){ try{ const obj=JSON.parse(sessionStorage.getItem('foko-steady-import')); model={family:obj.family||'Imported', narrative:obj.narrative||'Imported steady-state model.', vars:obj.vars, equations:obj.equations, params:obj.params||{}}; currentName=obj.name||'Imported from ODE'; renderLibrary(); renderEditor(); clearResults(); }catch(_e){ loadPreset(params.get('example') || currentName, false); } } else { loadPreset(params.get('example') || currentName, false); }
  wire();
}
function setTheme(t){ document.documentElement.dataset.theme=t; if($('themeBtn')) $('themeBtn').value=t; localStorage.setItem('chilperic-theme',t); setTimeout(resizePlots,60); }
function initTabs(){ document.querySelectorAll('#resultTabs .tab').forEach(btn => btn.addEventListener('click', () => setPanel(btn.dataset.panel))); }
function bindSideNav(){ document.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>{ const el=$(btn.dataset.jump); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); document.querySelectorAll('.side-nav .nav-item').forEach(b=>b.classList.toggle('active', b===btn)); })); $('collapseSidebar')?.addEventListener('click',()=>$('workbench')?.classList.toggle('sidebar-collapsed')); }
function wire(){
  $('solveSteady')?.addEventListener('click', solveCurrent);
  $('runContinuation')?.addEventListener('click', runContinuation);
  $('resetSteady')?.addEventListener('click', () => loadPreset(currentName,true));
  $('resetSteady2')?.addEventListener('click', () => loadPreset(currentName,true));
  $('loadSteady')?.addEventListener('click', () => loadPreset($('steadySelect').value,true));
  $('addSteadyVar')?.addEventListener('click', () => { model.vars.push(['x'+(model.vars.length+1),0]); model.equations.push('0'); renderEditor(); });
  $('addSteadyParam')?.addEventListener('click', () => { model.params['p'+(Object.keys(model.params).length+1)] = 1; renderEditor(); });
  $('steadyImport')?.addEventListener('change', importJson);
  $('leftPlotType')?.addEventListener('change', renderPlots);
  $('rightPlotType')?.addEventListener('change', renderPlots);
  $('exportSteadyWide')?.addEventListener('click', () => downloadText('foko_lab_steady_wide.csv', steadyWideCsv(), 'text/csv'));
  $('exportSteadyLong')?.addEventListener('click', () => downloadText('foko_lab_steady_long.csv', steadyLongCsv(), 'text/csv'));
  $('exportSteadyJson')?.addEventListener('click', () => downloadText('foko_lab_steady_data.json', JSON.stringify(dataExport(),null,2), 'application/json'));
  $('exportSteadyPlotJson')?.addEventListener('click', () => downloadText('foko_lab_steady_plotly.json', JSON.stringify(plotlyExport(),null,2), 'application/json'));
  $('exportSteadyModel')?.addEventListener('click', () => downloadText('foko_lab_steady_model.json', JSON.stringify(model,null,2), 'application/json'));
  $('exportSteadyPython')?.addEventListener('click', () => downloadText('foko_lab_steady_root.py', pythonExport(), 'text/x-python'));
  $('exportSteadyPng')?.addEventListener('click', () => safeImage('leftPlot','png'));
  $('exportSteadySvg')?.addEventListener('click', () => safeImage('leftPlot','svg'));
  document.addEventListener('keydown', e => { if((e.ctrlKey||e.metaKey) && e.key === 'Enter'){ e.preventDefault(); solveCurrent(); } });
}
function renderLibrary(){
  const sel=$('steadySelect'), deck=$('steadyDeck'), add=$('steadyAdditional');
  if(sel) sel.innerHTML = Object.keys(STEADY_PRESETS).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
  if(deck) deck.innerHTML = CORE.map(name=>presetButton(name,true)).join('');
  if(add) add.innerHTML = Object.keys(STEADY_PRESETS).filter(n=>!CORE.includes(n)).map(n=>presetButton(n,false)).join('');
  document.querySelectorAll('[data-steady-preset]').forEach(b => b.addEventListener('click', () => loadPreset(b.dataset.steadyPreset,true)));
}
function presetButton(name, core){ const p=STEADY_PRESETS[name]; return `<button class="${core?'model-card':'secondary stoch2-model-button'} ${currentName===name?'active':''}" data-steady-preset="${esc(name)}" type="button"><b>${esc(name)}</b><span>${esc(p.family)}</span></button>`; }
function loadPreset(name, updateUrl=true){
  currentName = STEADY_PRESETS[name] ? name : CORE[0];
  model = clone(STEADY_PRESETS[currentName]);
  if(updateUrl) history.replaceState(null,'',`?example=${encodeURIComponent(currentName)}`);
  if($('steadySelect')) $('steadySelect').value=currentName;
  renderLibrary(); renderEditor(); clearResults();
}
function renderEditor(){
  $('steadyTitle').textContent = currentName;
  $('steadyFamily').textContent = model.family;
  $('steadyNarrative').textContent = model.narrative;
  $('steadyEquations').value = model.equations.join('\n');
  $('steadyVars').innerHTML = '<div class="table-head"><div>name</div><div>guess</div><div></div></div>' + model.vars.map((v,i)=>`<div class="table-row compact-table"><input data-var-name="${i}" value="${esc(v[0])}"><input data-var-guess="${i}" type="number" step="any" value="${esc(v[1])}"><button class="delete" data-var-del="${i}" type="button">×</button></div>`).join('');
  $('steadyParams').innerHTML = '<div class="table-head"><div>parameter</div><div>value</div><div></div></div>' + Object.entries(model.params).map(([k,v],i)=>`<div class="table-row compact-table"><input data-param-name="${i}" value="${esc(k)}"><input data-param-value="${esc(k)}" type="number" step="any" value="${esc(v)}"><button class="delete" data-param-del="${esc(k)}" type="button">×</button></div>`).join('');
  $('steadyContParam').innerHTML = Object.keys(model.params).map(k=>`<option value="${esc(k)}">${esc(k)}</option>`).join('') || '<option value="">none</option>';
  bindEditorInputs(); renderPreview();
}
function bindEditorInputs(){
  $('steadyEquations').oninput = () => { model.equations = parseEquationText($('steadyEquations').value); renderPreview(); };
  document.querySelectorAll('[data-var-name]').forEach(inp => inp.oninput = e => { model.vars[+inp.dataset.varName][0] = normalizeSymbol(e.target.value.trim()) || model.vars[+inp.dataset.varName][0]; renderPreview(); });
  document.querySelectorAll('[data-var-guess]').forEach(inp => inp.oninput = e => { model.vars[+inp.dataset.varGuess][1] = +e.target.value; });
  document.querySelectorAll('[data-var-del]').forEach(btn => btn.onclick = () => { if(model.vars.length>1){ model.vars.splice(+btn.dataset.varDel,1); model.equations.splice(+btn.dataset.varDel,1); renderEditor(); }});
  document.querySelectorAll('[data-param-name]').forEach(inp => inp.onchange = e => { const keys=Object.keys(model.params); const old=keys[+inp.dataset.paramName]; const next=normalizeSymbol(e.target.value.trim()); if(old&&next&&old!==next){ model.params[next]=model.params[old]; delete model.params[old]; renderEditor(); }});
  document.querySelectorAll('[data-param-value]').forEach(inp => inp.oninput = e => { model.params[inp.dataset.paramValue] = +e.target.value; });
  document.querySelectorAll('[data-param-del]').forEach(btn => btn.onclick = () => { delete model.params[btn.dataset.paramDel]; renderEditor(); });
}
function lines(s){
  return String(s||'')
    .replace(/[−–—]/g,'-')
    .replace(/\\\s*\[4pt\]|\\\[4pt\]|\[4pt\]/g,'\n')
    .replace(/,\s*(?=[A-Za-z_][A-Za-z0-9_]*\s*:)/g,'\n')
    .split(/\n|\\\\/)
    .map(x=>x.trim())
    .filter(Boolean);
}
function parseEquationText(text){ return lines(text).map(normalizeEquationLine).filter(Boolean); }
function normalizeEquationLine(line){
  let s = String(line||'').replace(/[−–—]/g,'-').replace(/\\lambda/g,'lambda').replace(/\\quad|quad/g,' ').replace(/\\\[4pt\\]|\[4pt\]/g,' ').replace(/\s+/g,' ').trim();
  s = s.replace(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*/, '');
  if(!s) return '';
  if(/=/.test(s)){ const parts=s.split('='); s = parts.length===2 && Number(parts[1].trim())===0 ? parts[0] : `(${parts[0]})-(${parts.slice(1).join('=')})`; }
  s = s.replace(/\s+/g,'');
  return insertImplicitProducts(s);
}
function normalizeSymbol(s){ return String(s||'').replace(/\\lambda/g,'lambda').replace(/[^A-Za-z0-9_]/g,'').replace(/^(\d)/,'_$1'); }
function knownSymbols(){ return [...new Set([...model.vars.map(v=>v[0]), ...Object.keys(model.params), 'pi','e'])].filter(Boolean).sort((a,b)=>b.length-a.length); }
function insertImplicitProducts(expr){
  let s=expr;
  s=s.replace(/(\d)([A-Za-z_])/g,'$1*$2').replace(/([A-Za-z0-9_\)])\(/g,'$1*(').replace(/\)([A-Za-z0-9_])/g,')*$1');
  const symbols=knownSymbols();
  return s.replace(/[A-Za-z_][A-Za-z0-9_]*/g, token => splitKnownToken(token, symbols));
}
function splitKnownToken(token, symbols){
  if(symbols.includes(token) || ['sin','cos','tan','exp','log','sqrt','abs','min','max','pow','floor','ceil','round'].includes(token)) return token;
  let i=0, out=[];
  while(i<token.length){ const hit=symbols.find(sym=>token.slice(i,i+sym.length)===sym); if(hit){ out.push(hit); i+=hit.length; } else { return token; } }
  return out.join('*');
}
function renderPreview(){
  const equations = parseEquationText($('steadyEquations')?.value || '');
  model.equations = equations.length ? equations : model.equations;
  const rows = model.equations.map((eq,i)=>`${latexSymbol(model.vars[i]?.[0]||'f_'+(i+1))} &: ${toTex(eq)} = 0`).join('\\\\[4pt]');
  const raw = rows ? `\\begin{aligned}${rows}\\end{aligned}` : '\\text{No equations}';
  if($('steadyParsedPreview')) $('steadyParsedPreview').textContent = 'Parsed as:\n' + model.equations.map((e,i)=>`${model.vars[i]?.[0]||'f'}: ${e} = 0`).join('\n');
  try { if(window.katex) katex.render(raw, $('steadyPreview'), {displayMode:true, throwOnError:false}); else $('steadyPreview').textContent = raw; } catch(e) { $('steadyPreview').textContent = model.equations.map((e,i)=>`${model.vars[i]?.[0]||'f'}: ${e} = 0`).join('\n'); }
}
function toTex(expr){ try{ const raw=math.parse(expr).toTex({parenthesis:'keep'}); return (window.FokoTex&&window.FokoTex.greekify)?window.FokoTex.greekify(raw):raw; }catch{ return tex(expr); } }
function latexSymbol(s){ return String(s).replace('lambda','\\lambda').replace(/_/g,'\\_'); }
function readModel(){ model.equations = parseEquationText($('steadyEquations').value); $('steadyEquations').value = model.equations.join('\n'); renderPreview(); }
function compileSystem(){ readModel(); if(model.equations.length !== model.vars.length) throw new Error(`Expected ${model.vars.length} equations, found ${model.equations.length}. Use one equation per variable.`); const names=model.vars.map(v=>v[0]); const allowed=new Set([...names,...Object.keys(model.params),'pi','e']); const comps=model.equations.map(e=>{ validateSymbols(e, allowed); return math.compile(e); }); return {names, comps}; }
function validateSymbols(expr, allowed){ const node=math.parse(expr); const bad=[]; node.traverse(n=>{ if(n.isSymbolNode && !allowed.has(n.name) && !['sin','cos','tan','exp','log','sqrt','abs','min','max','pow'].includes(n.name)) bad.push(n.name); }); if(bad.length) throw new Error(`Unknown symbol(s): ${[...new Set(bad)].join(', ')} in ${expr}`); }
function residualFactory(compiled, params=model.params){ const {names, comps}=compiled; return function(x){ const scope={...params}; names.forEach((n,i)=>scope[n]=x[i]); return comps.map(c=>Number(c.evaluate(scope))); }; }
function norm2(v){ return Math.sqrt(v.reduce((s,x)=>s+x*x,0)); }
function jacobian(x, residual){ const n=x.length, J=Array.from({length:n},()=>Array(n).fill(0)); for(let j=0;j<n;j++){ const h=Math.max(1e-7, Math.abs(x[j])*1e-6); const xp=x.slice(), xm=x.slice(); xp[j]+=h; xm[j]-=h; const fp=residual(xp), fm=residual(xm); for(let i=0;i<n;i++) J[i][j]=(fp[i]-fm[i])/(2*h); } return J; }
function solveLinear(A,b){ const n=b.length, M=A.map((r,i)=>[...r,b[i]]); for(let k=0;k<n;k++){ let p=k; for(let i=k+1;i<n;i++) if(Math.abs(M[i][k])>Math.abs(M[p][k])) p=i; [M[k],M[p]]=[M[p],M[k]]; if(Math.abs(M[k][k])<1e-12) throw new Error('Singular Jacobian near current guess. Try another initial guess.'); for(let i=k+1;i<n;i++){ const f=M[i][k]/M[k][k]; for(let j=k;j<=n;j++) M[i][j]-=f*M[k][j]; } } const x=Array(n).fill(0); for(let i=n-1;i>=0;i--){ let s=M[i][n]; for(let j=i+1;j<n;j++) s-=M[i][j]*x[j]; x[i]=s/M[i][i]; } return x; }
function newton(x0, params=model.params){ const compiled=compileSystem(); const residual=residualFactory(compiled, params); const maxIter=+$('steadyMaxIter').value||80, tol=Number($('steadyTol').value)||1e-9, damp=Number($('steadyDamping').value)||0.8; let x=x0.slice(), history=[]; let J=[]; for(let it=0; it<maxIter; it++){ const f=residual(x), nrm=norm2(f); history.push(nrm); if(nrm<tol) return {x, norm:nrm, iterations:it, converged:true, history, J: J.length?J:jacobian(x,residual), residual:f}; J=jacobian(x,residual); const dx=solveLinear(J,f.map(v=>-v)); let alpha=damp, best=x, bestNorm=Infinity; for(let ls=0; ls<12; ls++){ const cand=x.map((v,i)=>v+alpha*dx[i]); const cn=norm2(residual(cand)); if(cn<bestNorm){ best=cand; bestNorm=cn; } if(cn<nrm) break; alpha*=0.5; } x=best; } const f=residual(x); return {x, norm:norm2(f), iterations:maxIter, converged:false, history, J:jacobian(x,residual), residual:f}; }
function localJacobianClassification(J){
 if(!J?.length) return {label:'unknown', detail:'no Jacobian'}; if(J.length===1){ const a=J[0][0]; return {label:a<0?'stable':a>0?'unstable':'neutral', detail:`eigenvalue ${a.toPrecision(3)}`}; } if(J.length===2){ const tr=J[0][0]+J[1][1], det=J[0][0]*J[1][1]-J[0][1]*J[1][0]; if(det<0) return {label:'unstable', detail:'saddle, determinant < 0'}; if(tr<0&&det>0) return {label:'stable', detail:'trace < 0, determinant > 0'}; if(tr>0&&det>0) return {label:'unstable', detail:'trace > 0, determinant > 0'}; return {label:'neutral', detail:`trace ${tr.toPrecision(3)}, det ${det.toPrecision(3)}`}; } return {label:'computed', detail:'Jacobian available; eigenvalue classification shown for 1D/2D systems'}; }
function findAlternatives(sol){ const roots=[]; const base=sol.x; const starts=[]; base.forEach((v,i)=>{ let a=base.slice(); a[i]=(v||1)*0.5; starts.push(a); let b=base.slice(); b[i]=(v||1)*1.8+0.1; starts.push(b); }); starts.forEach(s=>{ try{ const r=newton(s); if(r.converged && dist(r.x, sol.x)>1e-3 && !roots.some(q=>dist(q.x,r.x)<1e-3)) roots.push(r); }catch{} }); return roots.slice(0,4); }
function dist(a,b){ return Math.sqrt(a.reduce((s,x,i)=>s+(x-b[i])**2,0)); }
function setRunState(running, msg){ const b=$('solveSteady'); const c=$('runContinuation'); if(b){ b.disabled=running; b.textContent=running?'Solving…':'▶ Solve'; } if(c) c.disabled=running; if($('steadyProgress')) $('steadyProgress').style.width=running?'40%':'0%'; if($('steadyStatus')) $('steadyStatus').textContent=msg; }
function solveCurrent(){ if($('solveSteady')?.disabled) return; try{ readEditor(); FokoSession?.save?.('steady', model); const check=window.FokoModelValidator?.validate?.(model,'steady'); if(check && check.blockers.length) throw new Error(window.FokoModelValidator.message(check)); }catch(e){ showError(e); return; } setRunState(true,'Solving algebraic system…'); setTimeout(()=>{ const t0=performance.now(); try{ last=newton(model.vars.map(v=>Number(v[1]))); last.runtimeMs=performance.now()-t0; last.stability=localJacobianClassification(last.J); last.alternatives=findAlternatives(last); continuation=[]; updateStatus(); renderPlots(); renderDiagnostics(); setPanel('plotsPanel'); setRunState(false,last.converged?'Solved.':'Approximate solution.'); }catch(e){ showError(e); } },20); }
function runContinuation(){ if(!model || $('runContinuation')?.disabled) return; const param=$('steadyContParam').value; if(!param){ $('steadyStatus').textContent='No continuation parameter available.'; return; } setRunState(true,'Running continuation…'); setTimeout(()=>{ const t0=performance.now(); try{ continuation=[]; const min=Number($('steadyContMin').value), max=Number($('steadyContMax').value), N=Math.max(3,+$('steadyContN').value||30); let guess=last?.x?.slice() || model.vars.map(v=>Number(v[1])); for(let k=0;k<N;k++){ const val=min+(max-min)*(k/(N-1)); const params={...model.params,[param]:val}; try{ const r=newton(guess, params); guess=r.x; const row={param:val,residual:r.norm,converged:r.converged}; model.vars.forEach((v,i)=>row[v[0]]=r.x[i]); continuation.push(row); }catch(err){ continuation.push({param:val,residual:NaN,converged:false}); } } if($('leftPlotType')) $('leftPlotType').value='continuation'; if($('rightPlotType')) $('rightPlotType').value='continuation-residual'; renderPlots(); setPanel('plotsPanel'); $('steadyDiagnostics').textContent=`Continuation complete over ${param}. ${continuation.filter(r=>r.converged).length}/${continuation.length} points converged.`; $('steadyTopStatus').textContent='Continuation'; $('steadyRuntime').textContent=(performance.now()-t0).toFixed(1)+' ms'; setRunState(false,'Continuation complete.'); }catch(e){ showError(e); } },20); }
function showError(e){ if($('steadyDiagnostics')) $('steadyDiagnostics').textContent=e.message || String(e); if($('steadyTopStatus')) $('steadyTopStatus').textContent='Error'; setPanel('diagnosticsPanel'); setRunState(false,'Error.'); }
function renderPlots(){ renderOne('leftPlot', $('leftPlotType')?.value || 'equilibrium'); renderOne('rightPlot', $('rightPlotType')?.value || 'residual'); resizePlots(); }
function safePlot(id,traces,lay,config){ const el=$(id); if(!el) return; if(!window.Plotly){ el.innerHTML='<div class="diagnostics empty">Plotly is not loaded.</div>'; return; } if(!traces || !traces.length){ el.innerHTML='<div class="diagnostics empty">No data available for this plot.</div>'; return; } try{ if(el.querySelector('.diagnostics')) el.innerHTML=''; Plotly.purge(el); return Plotly.react(el,traces,lay,config||cfg()).then(()=>{ el.classList.add('plot-ready'); try{ Plotly.Plots.resize(el); }catch{} }).catch(err=>{ el.innerHTML='<div class="diagnostics empty">Plot error: '+esc(err.message||err)+'</div>'; }); }catch(err){ el.innerHTML='<div class="diagnostics empty">Plot error: '+esc(err.message||err)+'</div>'; } }
function renderOne(id,type){ const el=$(id); if(!el) return; if(!last && !continuation.length){ el.innerHTML='<div class="diagnostics empty">Solve to plot.</div>'; return; } const names=model.vars.map(v=>v[0]); if(type==='equilibrium' && last) return safePlot(id,[{x:names,y:last.x,type:'bar',name:'equilibrium'}],layout('Equilibrium values','variable','value'),cfg()); if(type==='residual' && last) return safePlot(id,[{x:last.history.map((_,i)=>i), y:last.history, type:'scatter', mode:'lines+markers', name:'residual'}],{...layout('Newton residual','iteration','||f||'), yaxis:{type:'log',title:'||f||'}},cfg()); if(type==='jacobian' && last?.J?.length) return safePlot(id,[{z:last.J,x:names,y:names,type:'heatmap',colorscale:'Viridis'}],layout('Jacobian matrix','variable','equation'),cfg()); if(type==='stability' && last) return safePlot(id,[{x:['residual','iterations','alternatives'],y:[last.norm,last.iterations,last.alternatives?.length||0],type:'bar'}],layout('Solve diagnostics','metric','value'),cfg()); if(type==='continuation' && continuation.length){ const traces=names.map(n=>({x:continuation.map(r=>r.param),y:continuation.map(r=>r[n]),mode:'lines+markers',type:'scatter',name:n})); return safePlot(id,traces,layout('Continuation branch',$('steadyContParam').value,'equilibrium'),cfg()); } if(type==='continuation-residual' && continuation.length) return safePlot(id,[{x:continuation.map(r=>r.param),y:continuation.map(r=>r.residual),mode:'lines+markers',type:'scatter',name:'residual'}],layout('Continuation residual',$('steadyContParam').value,'||f||'),cfg()); el.innerHTML='<div class="diagnostics empty">Run the required solve or continuation first.</div>'; }
function layout(title,x,y){ return {title,xaxis:{title:x,zeroline:false},yaxis:{title:y,zeroline:false},margin:{l:60,r:20,t:55,b:55},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'}; }
function cfg(){ return {responsive:true,displaylogo:false}; }
function resizePlots(){ ['leftPlot','rightPlot'].forEach(id=>{try{Plotly.Plots.resize(id);}catch{}}); }
function updateStatus(){ $('steadyTopStatus').textContent=last.converged?'Converged':'Approximate'; $('steadyRuntime').textContent=last.runtimeMs.toFixed(1)+' ms'; $('steadyIterations').textContent=last.iterations; $('steadyResidual').textContent=last.norm.toExponential(2); $('steadyMetricConverged').textContent=last.converged?'yes':'no'; $('steadyMetricStability').textContent=last.stability?.label||'—'; $('steadyMetricVars').textContent=model.vars.length; $('steadyMetricAlt').textContent=last.alternatives?.length||0; }
function renderDiagnostics(){ const alt=last.alternatives?.length?`\n\nAlternative equilibria detected:\n${last.alternatives.map(s=>s.x.map(v=>v.toPrecision(5)).join(', ')).join('\n')}`:''; const warn=last.stability?.label==='unstable'?'\n\nInterpretation warning: this root has an unstable local Jacobian if interpreted as dx/dt = f(x,p). For a general algebraic constraint, residual convergence does not imply dynamical stability. Try another initial guess or run continuation.':''; $('steadyDiagnostics').textContent=`${last.converged?'Converged':'Approximate solution'}\nIterations: ${last.iterations}\nResidual norm: ${last.norm.toExponential(4)}\nLocal Jacobian classification: ${last.stability.label} (${last.stability.detail})\n\n${model.vars.map((v,i)=>`${v[0]} = ${last.x[i].toPrecision(8)}`).join('\n')}${warn}${alt}`; }
function setPanel(id){ document.querySelectorAll('#resultTabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===id)); document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===id)); setTimeout(resizePlots,40); }
function clearResults(){ last=null; continuation=[]; ['leftPlot','rightPlot'].forEach(id=>{ const el=$(id); if(el){ try{ if(window.Plotly) Plotly.purge(el); }catch{} el.classList.remove('plot-ready'); el.innerHTML='<div class="diagnostics empty">Solve to plot.</div>'; }}); if($('steadyDiagnostics')) $('steadyDiagnostics').textContent='Solve a model to see residuals, local Jacobian classification, and equilibrium values.'; ['steadyRuntime','steadyIterations','steadyResidual','steadyMetricConverged','steadyMetricStability','steadyMetricVars','steadyMetricAlt'].forEach(id=>{ if($(id)) $(id).textContent='—'; }); if($('steadyTopStatus')) $('steadyTopStatus').textContent='Ready'; }
async function importJson(e){ const f=e.target.files?.[0]; if(!f) return; try{ const obj=JSON.parse(await f.text()); if(!Array.isArray(obj.vars)||!Array.isArray(obj.equations)) throw new Error('JSON must contain vars and equations.'); model={family:obj.family||'Imported', narrative:obj.narrative||'Imported steady-state model.', vars:obj.vars, equations:obj.equations, params:obj.params||{}}; currentName=obj.name||'Imported model'; renderEditor(); clearResults(); }catch(err){ $('steadyStatus').textContent='Import error: '+err.message; } }
function steadyWideCsv(){ const rows=[['variable','equilibrium','residual_norm','iterations','converged','stability'].join(',')]; if(last) model.vars.forEach((v,i)=>rows.push([v[0],last.x[i],last.norm,last.iterations,last.converged,last.stability?.label].map(csv).join(','))); return rows.join('\n'); }
function steadyLongCsv(){ const rows=[['dataset','index','variable','value','extra'].join(',')]; if(last){ model.vars.forEach((v,i)=>rows.push(['equilibrium',i,v[0],last.x[i],`residual=${last.norm}`].map(csv).join(','))); last.history.forEach((v,i)=>rows.push(['newton',i,'residual',v,''].map(csv).join(','))); } continuation.forEach((r,i)=>Object.keys(r).forEach(k=>{ if(k!=='param') rows.push(['continuation',i,k,r[k],`param=${r.param}`].map(csv).join(',')); })); return rows.join('\n'); }
function dataExport(){ return {model,currentName,solution:last,continuation,exportedAt:new Date().toISOString()}; }
function plotlyExport(){ const out={exportedAt:new Date().toISOString(),plots:{}}; ['leftPlot','rightPlot'].forEach(id=>{ const el=$(id); if(el&&el.data) out.plots[id]={data:el.data,layout:el.layout}; }); return out; }

function pythonExport(){
  const names=model.vars.map(v=>v[0]);
  const guesses=model.vars.map(v=>Number(v[1])||0);
  const params=JSON.stringify(model.params||{}, null, 2);
  const eqs=JSON.stringify(model.equations||[], null, 2);
  return `# Foko Lab Steady-State export
# Browser result is exploratory. Validate locally with SciPy root/fsolve.
import numpy as np
from scipy.optimize import root, fsolve

variables = ${JSON.stringify(names)}
x0 = np.array(${JSON.stringify(guesses)}, dtype=float)
params = ${params}
equations = ${eqs}

# Safe eval scope for compact exported models.
def system(x, params=params):
    scope = dict(params)
    scope.update({name: float(x[i]) for i, name in enumerate(variables)})
    scope.update({
        'sin': np.sin, 'cos': np.cos, 'tan': np.tan, 'exp': np.exp,
        'log': np.log, 'sqrt': np.sqrt, 'abs': abs, 'min': min, 'max': max,
        'pow': pow, 'pi': np.pi, 'e': np.e
    })
    return np.array([eval(expr.replace('^','**'), {'__builtins__': {}}, scope) for expr in equations], dtype=float)

sol = root(system, x0, method='hybr')
print('root success:', sol.success, sol.message)
print(dict(zip(variables, sol.x)))
print('residual norm:', np.linalg.norm(system(sol.x)))

# fsolve alternative
x_fsolve, info, ier, msg = fsolve(system, x0, full_output=True)
print('fsolve ier:', ier, msg)
print(dict(zip(variables, x_fsolve)))
`;
}

function downloadText(name,text,type='text/plain'){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function safeImage(id,format){ const el=$(id); if(el&&el.data) Plotly.downloadImage(id,{format,filename:`foko-lab-steady-${id}`}); else $('steadyStatus').textContent='Run a plot before exporting an image.'; }
function csv(v){ const s=String(v??''); return /[,\n"]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function esc(s){ return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function tex(s){ return String(s||'').replace(/\*/g,'\\,').replace(/\^/g,'^').replace(/\bpi\b/g,'\\pi').replace(/lambda/g,'\\lambda'); }
window.addEventListener('load', init);
