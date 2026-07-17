#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require('@playwright/test');
const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const strip = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<link\b[^>]*>/gi, '').replace(/(<img\b[^>]*?)\s+src=(['"])[\s\S]*?\2/gi, '$1');
function resources(html, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*${attr}=["']([^"']+)["'][^>]*>`, 'gi');
  return Array.from(html.matchAll(re), m => m[1].split('?',1)[0]).filter(v => v && !/^(https?:|data:|\/\/)/i.test(v));
}
(async () => {
  const browser = await chromium.launch({ executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined, headless: true, args: ['--no-sandbox','--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    page.on('console', m => { if (m.type()==='error') console.error('PAGE CONSOLE:', m.text()); });
    page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
    const html = read('sensitivity.html');
    await page.setContent(strip(html), { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const store = new Map();
      Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem:k=>store.get(String(k))||null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(String(k)),clear:()=>store.clear() } });
      Object.defineProperty(window, 'sessionStorage', { configurable: true, value: { getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{} } });
      history.replaceState = () => {};
    });
    for (const css of resources(html,'link','href').filter(v=>v.endsWith('.css'))) await page.addStyleTag({ path:path.join(ROOT,css) });
    const scripts = resources(html,'script','src').filter(v=>v.endsWith('.js'));
    for (const script of scripts) {
      if (script === 'src/v72/sensitivity-workspace.js' || script === 'src/v72/scientific-registry.js' || script === 'src/navigation.js') continue;
      await page.addScriptTag({ path:path.join(ROOT,script) });
    }
    await page.addScriptTag({ path:path.join(ROOT,'src/core/ode.js') });
    await page.evaluate(() => {
      class SensitivityWorkerShim {
        constructor(){ this.onmessage=null; this.onerror=null; this.terminated=false; }
        terminate(){ this.terminated=true; }
        postMessage(request){
          setTimeout(() => {
            if(this.terminated) return;
            try{
              const checked=window.FokoNumericalInputs.validateOde(request.model);
              const expressions=checked.eqs.map(e=>window.math.compile(e));
              let solves=0, evals=0, accepted=0, rejected=0;
              const solve=(params)=>{
                const rhs=(t,y,p)=>expressions.map((expr)=>{const scope=Object.assign({t},p);checked.vars.forEach((name,i)=>scope[name]=y[i]);return Number(expr.evaluate(scope));});
                const result=window.FokoODECore.solveWithRhs({vars:checked.vars,y0:checked.y0,params,t0:checked.t0,t1:checked.t1,points:checked.points,method:checked.method,rtol:checked.rtol,atol:checked.atol,maxStep:checked.maxStep,initialStep:checked.initialStep,stepSize:checked.stepSize,safety:checked.safety},rhs);
                solves++; evals+=result.diagnostics.functionEvaluations; accepted+=result.diagnostics.accepted; rejected+=result.diagnostics.rejected; return result;
              };
              const outputVar=request.outputVar||checked.vars[0]; const metricName=request.outputMetric||'final';
              const scalar=(params)=>{const r=solve(params);const row=r.Y[r.vars.indexOf(outputVar)];if(metricName==='max')return Math.max(...row);if(metricName==='mean')return row.reduce((a,b)=>a+b,0)/row.length;return row.at(-1);};
              const methodConfig=window.FokoNumericalInputs.validateSensitivity(Object.assign({},request.analysis,{parameterCount:Object.keys(checked.paramDefs).length,stateCount:checked.vars.length,outputPoints:checked.points}));
              if(methodConfig.capacity.blocked) throw new Error(methodConfig.capacity.message);
              let analysis;
              if(methodConfig.method==='sobol'){
                analysis=window.FokoSensitivityCore.sobolJansen({parameters:checked.paramDefs,samples:methodConfig.samples,seed:methodConfig.seed,secondOrder:methodConfig.secondOrder,bootstrapReplicates:methodConfig.bootstrapReplicates,dependence:methodConfig.dependence,dependencePermutations:methodConfig.dependencePermutations,evaluate:scalar});
                analysis.timeSensitivity={time:[0,1,2],names:analysis.names,totalMatrix:analysis.rows.map(row=>[row.total*.7,row.total,row.total*.9]),firstMatrix:analysis.rows.map(row=>[row.first*.7,row.first,row.first*.9]),warning:'offline deterministic time-profile fixture'};
              }else{
                analysis=window.FokoSensitivityCore.localFiniteDifference({parameters:checked.paramDefs,relativeStep:request.analysis.relativeStep,evaluate:scalar});
                const baseline=solve(Object.fromEntries(Object.entries(checked.paramDefs).map(([k,v])=>[k,Array.isArray(v)?Number(v[0]):Number(v.value)])));
                const names=Object.keys(checked.paramDefs);
                analysis.trajectory={time:baseline.T,base:baseline.Y[baseline.vars.indexOf(outputVar)],rows:analysis.rows.map(row=>({name:row.name,values:baseline.T.map(()=>row.derivative)})),stateNames:baseline.vars,parameterNames:names,influenceMatrix:baseline.vars.map(()=>analysis.rows.map(row=>Math.abs(row.derivative)))};
                analysis.jacobians={states:baseline.vars,parameters:names,stateMeanAbsolute:baseline.vars.map((_,i)=>baseline.vars.map((__,j)=>i===j?1:0.1)),parameterMeanAbsolute:baseline.vars.map(()=>analysis.rows.map(row=>Math.abs(row.derivative)))};
                analysis.convergence=[1,.5,.25,.125].map(f=>({step:request.analysis.relativeStep*f,rows:analysis.rows}));
                analysis.ofat=window.FokoSensitivityCore.ofat({parameters:checked.paramDefs,points:methodConfig.ofatPoints,evaluate:scalar});
                analysis.directional=window.FokoSensitivityCore.directionalProfile({parameters:checked.paramDefs,points:methodConfig.directionPoints,span:methodConfig.directionalSpan,direction:Object.fromEntries(names.map(name=>[name,1])),evaluate:scalar}); analysis.directional.available=true;
                if(methodConfig.responseSurface) analysis.responseSurface=window.FokoSensitivityCore.responseSurface({parameters:checked.paramDefs,first:request.analysis.surfaceFirst,second:request.analysis.surfaceSecond,points:methodConfig.surfacePoints,evaluate:scalar});
              }
              this.onmessage?.({data:{type:'result',ok:true,release:'72.46.0',method:methodConfig.method,outputVar,outputMetric:metricName,model:checked,analysis,solverSummary:{odeSolves:solves,functionEvaluations:evals,acceptedSteps:accepted,rejectedSteps:rejected,maxRejectionRatio:0,minStep:0,maxTimescaleRatio:1,warnings:[],methods:[checked.method]},estimatedOdeSolves:methodConfig.expectedEvaluations,runtime:12,warnings:(checked.warnings||[]).concat(methodConfig.warnings||[]),configuration:{model:request.model,analysis:request.analysis,outputVar,outputMetric:metricName}}});
            }catch(error){ this.onmessage?.({data:{type:'result',ok:false,error:error.message,runtime:1}}); }
          }, 10);
        }
      }
      Object.defineProperty(window,'Worker',{configurable:true,writable:true,value:SensitivityWorkerShim});
    });
    for (const script of ['src/v72/sensitivity-workspace.js','src/v72/scientific-registry.js','src/navigation.js']) await page.addScriptTag({ path:path.join(ROOT,script) });
    await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded',{bubbles:true})));
    await page.waitForFunction(() => document.querySelectorAll('#sensitivitySelect option').length >= 8 && document.querySelectorAll('#sensitivityParameterRows .table-row').length >= 3);
    assert.equal(await page.locator('#sensitivitySelect').inputValue(), 'sir');
    assert.equal(await page.locator('#sensitivityParameterRows .table-row').count(), 3);
    await page.locator('#sensitivityMethod').selectOption('sobol');
    await page.locator('#sensitivitySecondOrder').check();
    await page.locator('#sensitivitySamples').fill('4096');
    await page.waitForFunction(() => document.getElementById('runSensitivity').disabled === true);
    assert.match(await page.locator('#sensitivityBudget').textContent(),/too large for reliable in-browser sensitivity analysis/i);
    assert.match(await page.locator('#sensitivityBudget').textContent(),/No worker should be started/i);

    await page.locator('#sensitivitySelect').selectOption('logistic');
    await page.locator('#loadSensitivity').click();
    assert.equal(await page.locator('#sensitivityParameterRows .table-row').count(), 2);
    await page.locator('#sensitivitySecondOrder').uncheck();
    await page.locator('#sensitivitySamples').fill('128');
    await page.locator('#sensitivityMethod').selectOption('local');
    const initialValue = page.locator('#sensitivityInitialRows .table-row').first().locator('input').nth(1);
    await initialValue.fill('3.5');
    await page.locator('#sensitivityT1').fill('12');
    await page.locator('#sensitivityRtol').fill('1e-8');
    await page.locator('#sensitivityAtol').fill('1e-11');
    await page.locator('#sensitivityParameterRows .table-row').first().locator('input').nth(1).fill('0.75');
    await page.locator('#runSensitivity').click();
    await page.waitForFunction(() => document.getElementById('sensitivityTopStatus').textContent.trim() === 'Computed', null, {timeout:15000}).catch(async e => { console.error('STATUS', await page.locator('#sensitivityStatus').textContent()); console.error('TOP', await page.locator('#sensitivityTopStatus').textContent()); console.error('PROV', await page.locator('#provenanceWarning').textContent()); throw e; });
    assert.equal(await page.locator('#plotGrid').getAttribute('data-layout'),'two');
    assert.equal(await page.locator('#leftPlot').getAttribute('data-render-state'),'rendered');
    assert.equal(await page.locator('#rightPlot').getAttribute('data-render-state'),'rendered');
    assert.match(await page.locator('#sensitivityRtolMetric').textContent(),/1\.0e-8/i);
    assert.ok(Number(await page.locator('#sensitivityEvaluations').textContent()) > 0);
    assert.equal(await page.locator('#exportSensitivityJson').isEnabled(),true);
    for (const plot of ['parameter-jacobian','state-jacobian','influence-map','ofat','tornado','directional']) assert.equal(await page.locator(`#leftPlotType option[value="${plot}"]`).count(),1);
    await page.locator('#leftPlotType').selectOption('parameter-jacobian');
    await page.waitForFunction(() => document.getElementById('leftPlot').getAttribute('data-render-state') === 'rendered');
    assert.match(await page.locator('#leftPlotEvidence').textContent(),/right-hand-side Jacobian/i);
    await page.locator('#sensitivityResponseSurface').check();
    await page.locator('#sensitivitySurfacePoints').fill('5');
    await page.locator('#runSensitivity').click();
    await page.waitForFunction(() => document.getElementById('sensitivityTopStatus').textContent.trim() === 'Computed', null, {timeout:20000});
    assert.equal(await page.locator('#leftPlotType option[value="response-surface"]').count(),1);

    await page.locator('#sensitivityT1').fill('13');
    assert.equal(await page.locator('#sensitivityTopStatus').textContent(),'Stale');
    assert.equal(await page.locator('#exportSensitivityJson').isDisabled(),true);
    assert.match(await page.locator('#provenanceWarning').textContent(),/previous inputs/i);

    await page.locator('#sensitivityMethod').selectOption('sobol');
    await page.locator('#sensitivitySecondOrder').check();
    await page.locator('#sensitivitySamples').fill('16');
    await page.locator('#sensitivityBootstrap').fill('20');
    await page.locator('#sensitivityDependence').check();
    await page.locator('#sensitivityDependencePermutations').fill('19');
    await page.locator('#runSensitivity').click();
    await page.waitForFunction(() => document.getElementById('sensitivityTopStatus').textContent.trim() === 'Computed', null, {timeout:20000});
    assert.equal(await page.locator('#leftPlotType option[value="sobol-second"]').count(),1);
    await page.locator('#leftPlotType').selectOption('sobol-second');
    await page.waitForFunction(() => document.getElementById('leftPlot').getAttribute('data-render-state') === 'rendered');
    assert.match(await page.locator('#leftPlotEvidence').textContent(),/Saltelli/i);
    assert.match(await page.locator('#sensitivityDiagnostics').textContent(),/Second-order pairs/i);
    for (const plot of ['sobol-time','variance-contribution','global-scatter','dependence-mi','dependence-hsic']) assert.equal(await page.locator(`#leftPlotType option[value="${plot}"]`).count(),1);
    await page.locator('#leftPlotType').selectOption('sobol-time');
    await page.waitForFunction(() => document.getElementById('leftPlot').getAttribute('data-render-state') === 'rendered');
    assert.match(await page.locator('#leftPlotEvidence').textContent(),/each downsampled time point/i);
    await page.locator('#rightPlotType').selectOption('dependence-hsic');
    await page.waitForFunction(() => document.getElementById('rightPlot').getAttribute('data-render-state') === 'rendered');
    assert.match(await page.locator('#rightPlotEvidence').textContent(),/not a Sobol index/i);

    await page.locator('#sensitivityMethod').selectOption('fim');
    assert.equal(await page.locator('#sensitivityOutputMetric').isDisabled(),true);
    assert.match(await page.locator('#sensitivityMethodNote').textContent(),/trajectory vector/i);
    console.log('Sensitivity offline Chromium contract passed: browser-capacity refusal, editable scientific inputs, two-up rendering, stale evidence, local Jacobian/OFAT/directional/surface plots, time-resolved Jansen/Saltelli and limited MI/HSIC plots, and FIM boundaries are explicit.');
  } finally { await browser.close(); }
})().catch(error=>{console.error('Sensitivity offline Chromium contract failed.');console.error(error.stack||error);process.exit(1);});
