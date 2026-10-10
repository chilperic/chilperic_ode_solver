/* Observable adapters and portable SVG. Every point comes from a completed result. */
(function(root){'use strict';
const colors=['#3d4df0','#16816d','#c55f35','#7955b6','#ad8224','#327a99','#596779','#8a712e'];
const finite=Number.isFinite,fmt=x=>!finite(x)?'—':Math.abs(x)>=1e5||Math.abs(x)>0&&Math.abs(x)<.001?x.toExponential(1):Number(x.toPrecision(4)).toString();
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const series=(name,rows,x,y)=>({name,color:({C3:'#19816e',C4:'#3168c7',CAM:'#c55f35'})[name],points:rows.map((r,i)=>[x(r,i),finite(y(r,i))?y(r,i):null])});
const chart=(id,title,xlabel,ylabel,series,note,extra={})=>({id,title,xlabel,ylabel,series,note,...extra});
function histogram(xs,bins=20){const a=xs.filter(finite);if(!a.length)return[];const lo=a.reduce((v,x)=>Math.min(v,x),Infinity),hi=a.reduce((v,x)=>Math.max(v,x),-Infinity);if(lo===hi)return[[lo,a.length,lo-.5,hi+.5]];const n=Math.min(bins,Math.max(5,Math.ceil(Math.sqrt(a.length)))),dx=(hi-lo)/n,counts=Array(n).fill(0);for(const v of a)counts[Math.min(n-1,Math.floor((v-lo)/dx))]++;return counts.map((v,i)=>[lo+(i+.5)*dx,v,lo+i*dx,lo+(i+1)*dx]);}
function analyze(lab,r,focus){const out=[],add=(...a)=>out.push(chart(...a));
if(lab==='plants'){
 const types=r.types,chosen=types.includes(focus)?focus:types.includes('C4')?'C4':types[0],t=x=>x.hour/24,note='First weather realization; these curves are not ensemble confidence intervals.';
 for(const [key,title,unit]of [['biomass','Structural growth','Dry mass (g)'],['fruit','Reproductive production','Fruit / seed dry mass (g)'],['water','Water available in soil','Soil water (mm)'],['soilN','Nitrogen available in soil','Soil nitrogen (mg N)'],['netCarbon','Net carbon accumulated','Carbon (g C)']])add(key,title,'Elapsed time (days)',unit,types.map(type=>series(type,r.series[type],t,x=>x[key])),note);
 add('organs',chosen+' · organ investment','Elapsed time (days)','Dry mass (g)',['leaf','stem','root','flower','fruit'].map(key=>series(key,r.series[chosen],t,x=>x[key])),'Stocks in living organs, not cumulative production. Senescence and translocation can reduce an organ’s mass. '+note);
 add('thermal',chosen+' · thermal environment','Elapsed time (days)','Temperature (°C)',[series('Leaf',r.series[chosen],t,x=>x.leafT),series('Root-zone soil',r.series[chosen],t,x=>x.soilRootT),series('Air',r.weather,x=>x.hour/24,x=>x.temperature)],'Air values are hourly forcing samples; plant and soil values are recorded model states. '+note);
 add('carbon-budget',chosen+' · carbon accounting','Elapsed time (days)','Cumulative carbon (g C)',['carbonInput','resp','litter','retainedCarbon'].map((key,i)=>series(['Assimilated','Respired','Litter','Retained change'][i],r.series[chosen],t,x=>x[key])),'Retained carbon change = assimilated carbon − respiration − litter. Initial carbon is excluded. '+note);
}
if(lab==='tcells'){
 const tx=r.config.model==='kimmel'?'Cycle':'Time (h)',time=(_,i)=>r.times[i];
 add('population','Population and expectation',tx,'Living cells',[series('Ensemble mean',r.summary,time,x=>x.mean),series('Reference expectation',r.theory,time,x=>x.totalMean)],'Mean across '+r.finals.length+' realizations. The reference is the model expectation, not experimental data.');
 add('generations','Division-generation occupancy',tx,'Generation',[], 'Color is the ensemble mean number of living cells. This is a cohort heatmap, not a reconstructed lineage.',{heat:r.summary.map((s,i)=>s.generationMean.map((v,j)=>[r.times[i],j,v])).flat(),heatRows:r.summary[0].generationMean.length});
 add('living-generations','Living cells by generation',tx,'Living cells',r.summary[0].generationMean.map((_,g)=>series('G'+g+' · ensemble mean',r.summary,time,x=>x.generationMean[g])),'Generation denotes completed divisions; these curves summarize all simulated realizations.');
 for(const [key,title,unit]of [['divisions','Cumulative divisions','Division events'],['dead','Cumulative deaths','Death events']])add(key,title,tx,unit,[series('Recorded run 1',r.events,x=>x.time,x=>x[key])],'Events recorded in the first realization; not a survival probability or ensemble expectation.',{step:true});
 add('endpoints','Variation between realizations','Final living-cell count','Realizations',[{name:'Recorded endpoints',points:histogram(r.finals)}],'Each realization contributes one endpoint. Histogram bars are counts; they are not a probability density.',{kind:'bars'});
 add('variance','Population dispersion',tx,'Variance (cells²)',[series('Sample variance',r.summary,time,x=>x.variance),series('Reference variance',r.theory,time,x=>x.totalVar)],'Sample variance measures population variability, not uncertainty in the mean. Missing reference moments are not drawn.');
 add('cohorts','Final cohort composition','Division generation','Mean living cells',[{name:'Ensemble mean',points:r.summary.at(-1).generationMean.map((v,i)=>[i,v,i-.4,i+.4])}],'Counts are grouped by completed divisions at the recorded endpoint.',{kind:'bars'});
}
if(lab==='lipids'){
 const tx=r.model==='synthesis'?'Time (s)':'Model time (arbitrary)',uy=r.model==='synthesis'?'Concentration (µM)':'Pool amount (arbitrary)',rowSeries=j=>series(r.species[j],r.rows,(_,i)=>r.times[i],x=>x[j]);
 if(r.model==='synthesis'){
 add('products','Released fatty-acid products',tx,uy,[13,14,15].map(rowSeries),'C14:0, C16:0 and C18:0 are released products. Enzyme-bound intermediates are shown separately.');
 add('substrates','Substrate consumption',tx,uy,[0,1].map(rowSeries),'Acetyl-CoA and malonyl-CoA are modeled pools. Changes reflect the specified reaction network.');
 add('cofactor','Reducing-power budget',tx,uy,[rowSeries(2)],'NADPH is consumed by the synthesis reactions. This is a concentration trajectory, not a whole-cell energy balance.');
 add('occupancy','Where is fatty-acid synthase?',tx,'Fraction of modeled FAS pool',[['Free',x=>x[3]],['Elongating',x=>x.slice(4,13).reduce((a,b)=>a+b,0)],['FAS–CoA',x=>x[17]]].map(([name,fn])=>series(name,r.rows,(_,i)=>r.times[i],x=>{const total=x[3]+x[17]+x.slice(4,13).reduce((a,b)=>a+b,0);return total>0?fn(x)/total:null;})),'Fractions are normalized by free, elongating and CoA-bound enzyme at each time. A zero denominator creates a gap.');
 add('chain','Elongation-state occupancy',tx,'Carbon atoms in chain',[],'Color is enzyme-bound concentration (µM), not released product yield.',{heat:r.rows.flatMap((x,i)=>x.slice(4,13).map((v,j)=>[r.times[i],j,v])),heatRows:9,heatLabels:Array.from({length:9},(_,i)=>String(2+2*i))});
 add('product-share','Product selectivity',tx,'Fraction of released products',[13,14,15].map(j=>series(r.species[j],r.rows,(_,i)=>r.times[i],x=>{const total=x[13]+x[14]+x[15];return total>0?x[j]/total:null;})),'A molar product fraction, not a carbon-weighted fraction. No product yet means an undefined fraction.');
 }else{
 add('pools','Metabolic pool dynamics',tx,uy,r.species.map((_,j)=>rowSeries(j)),'Reduced deterministic four-pool model. A transient path does not establish bistability.');
 for(const [id,i,j]of [['phase-af',0,2],['phase-mt',1,3]])add(id,r.species[i]+' ↔ '+r.species[j],r.species[i]+' (arbitrary)',r.species[j]+' (arbitrary)',[series('Recorded trajectory',r.rows,x=>x[i],x=>x[j])],'Points follow recorded time order; start and end markers show direction. This is one initial condition.',{phase:true});
 add('rates','Net pool-change rates',tx,'Change / model time',r.species.map((name,j)=>series(name,r.rows.slice(1),(_,i)=>(r.times[i+1]+r.times[i])/2,(x,i)=>(x[j]-r.rows[i][j])/(r.times[i+1]-r.times[i]))),'Finite differences between saved observations, not individual reaction fluxes.');
 }
}
if(lab==='leaf'){
 const tx='Air temperature (°C)',make=(name,fn)=>series(name,r.response,x=>x.airC,x=>x.valid?fn(x):null),note='Fixed selected traits and conductance across the temperature sweep. Invalid or unresolved points remain gaps.';
 add('assimilation','Assimilation response',tx,'Net carbon (µmol m⁻² s⁻¹)',[make('Assimilation',x=>x.carbon.assimilation)],note);
 add('transpiration','Transpiration response',tx,'Water flux (mmol m⁻² s⁻¹)',[make('Transpiration',x=>x.physics.E*1000)],note);
 add('temperature','Compartment temperatures',tx,'Temperature (°C)',[make('Mesophyll',x=>x.physics.leaf[0]-273.15),make('Bundle sheath',x=>x.physics.leaf[1]-273.15),make('Root-zone soil',x=>x.physics.tr-273.15)],note);
 add('wue','Carbon gained per water lost',tx,'µmol CO₂ / mmol H₂O',[make('A / E',x=>x.physics.E>0?x.carbon.assimilation/(1000*x.physics.E):null)],'A/E uses net assimilation and transpiration. Zero transpiration is undefined. '+note);
 add('atp','ATP supply and demand',tx,'ATP (µmol m⁻² s⁻¹)',[make('Supply',x=>x.carbon.energy?.atp),make('Demand',x=>x.carbon.atpDemand)],note);
}
if(lab==='random'){
 const models=r.models,m=models[0],temporal=m.chart,kind=m.config.mode,positive=['walk','brownian'].includes(kind);
 if(positive){
 const increments=models.map((q,i)=>({name:i?'Reference':'Experiment',values:q.edges.map(e=>e.y2-e.y)}));
 add('increments','What was actually sampled?','Increment','Sample count',increments.map(s=>({name:s.name,points:histogram(s.values,32)})),'Full recorded increments from completed runs. Bars use each series’ own bin widths; compare the empirical CDF for probabilities. No clipping of tail values.',{kind:'bars'});
 add('cdf','Empirical cumulative distribution','Increment','Fraction ≤ x',increments.map(s=>{const a=[...s.values].sort((a,b)=>a-b);return{name:s.name,points:a.map((v,i)=>[v,(i+1)/a.length])};}),'All observed increments contribute. This is an empirical step function; it is not a fitted distribution.',{step:true});
 }
 if(temporal){
 const finals=[],means=[],spreads=[];for(const [j,q]of models.entries()){
  const runs=new Map();for(const e of q.edges){if(!runs.has(e.run))runs.set(e.run,[]);runs.get(e.run).push(e);}const horizon=q.config.mode==='brownian'?q.config.n*q.config.dt:q.config.mode==='birthdeath'?q.config.horizon:q.config.n;
  const completed=[...runs.values()].filter(rows=>Math.abs(rows.at(-1).x2-horizon)<1e-8);
  finals.push({name:(j?'Reference':'Experiment')+' · '+completed.length+' complete',points:histogram(completed.map(rows=>rows.at(-1).y2))});
  const meanPoints=[],spreadPoints=[];
  // Sample only times at which every requested realization is observed. Do not select survivors after censoring.
  const lastCommon=runs.size===q.config.m?Math.min(...[...runs.values()].map(rows=>rows.at(-1).x2)):0;
  const pointers=Array(runs.size).fill(0),lists=[...runs.values()];for(let k=0;k<=100&&lastCommon>0;k++){
   const t=k*lastCommon/100,values=lists.map((rows,j)=>{while(pointers[j]+1<rows.length&&rows[pointers[j]].x2<=t)pointers[j]++;const e=rows[pointers[j]];if(q.config.mode==='birthdeath'||q.config.mode==='branching')return t>=e.x2?e.y2:e.y;return e.x2===e.x?e.y2:e.y+(e.y2-e.y)*(t-e.x)/(e.x2-e.x);});
   const mean=values.reduce((a,b)=>a+b,0)/values.length,variance=values.length>1?values.reduce((a,b)=>a+(b-mean)**2,0)/(values.length-1):null;meanPoints.push([t,mean]);spreadPoints.push([t,variance]);
  }
  means.push({name:j?'Reference':'Experiment',points:meanPoints});spreads.push({name:j?'Reference':'Experiment',points:spreadPoints});
 }
 add('endpoints','Endpoint distribution',m.axisX==='Time'?'Value at time horizon':'Value at final step','Complete realizations',finals,'Only realizations that reach the requested horizon contribute. Counts are shown in the legend; capped endpoints are excluded.',{kind:'bars'});
 add('ensemble','Mean path on a shared clock',m.axisX,m.axisY,means,'The mean ends when any requested run is no longer observed. Jump processes use held states; continuous sampled paths use linear interpolation. Heavy-tailed laws may have no population mean.');
 add('dispersion','Spread between realizations',m.axisX,m.axisY+' variance',spreads,'Sample variance on the same common clock. It is descriptive only; a finite sample variance does not imply that the distribution has a finite variance.');
 }
 if(!positive){
 if(kind!=='branching')add('outcomes','Observed outcome frequencies','Outcome category','Recorded draws',models.map((q,j)=>({name:j?'Reference':'Experiment',points:q.faceCounts.map((v,i)=>[i+1,v,i+.65,i+1.35])})),'Categories are the simulator’s outcome indices. Birth–death categories: 1 birth, 2 death, 3 immigration. Branching offspring counts use the separate offspring histogram.',{kind:'bars'});
 if(kind==='branching')add('offspring','Realized offspring law','Offspring per individual','Recorded individuals',models.map((q,j)=>({name:j?'Reference':'Experiment',points:histogram(q.traces.flatMap(t=>t.map(d=>d.face)))})),'Every recorded individual contributes one offspring draw; generations with larger populations contribute more draws.',{kind:'bars'});
 if(!temporal){add('decisions','Activity through the sequence','Step','Sampled decisions',models.map((q,j)=>series(j?'Reference':'Experiment',q.decisions,(_,i)=>i+1,x=>x)),'Aggregated activity across repetitions. Colony branches can generate multiple decisions per step.');add('visits','Branch occupancy distribution','Visits per distinct segment','Segments',models.map((q,j)=>({name:j?'Reference':'Experiment',points:histogram(q.edges.map(e=>e.count))})),'Counts of distinct recorded segments grouped by visit count. In chaos mode each arrival is stored separately.',{kind:'bars'});}
 }
}
return out;}
function extent(a){let lo=Infinity,hi=-Infinity;for(const x of a)if(finite(x)){lo=Math.min(lo,x);hi=Math.max(hi,x);}if(lo===Infinity)return[0,1];if(lo===hi){const d=Math.max(.5,Math.abs(lo)*.05);return[lo-d,hi+d];}return[lo,hi];}
function drawSamples(a){if(a.length<=4000)return a;const out=[],n=Math.ceil(a.length/1000);for(let i=0;i<a.length;i+=n){const chunk=a.slice(i,i+n);let lo=0,hi=0;chunk.forEach((p,j)=>{if(p[1]<chunk[lo][1])lo=j;if(p[1]>chunk[hi][1])hi=j;});const indices=new Set([0,lo,hi,chunk.length-1]);chunk.forEach((p,j)=>{if(!finite(p[1])||j&& !finite(chunk[j-1][1]))indices.add(j);});out.push(...[...indices].sort((x,y)=>x-y).map(j=>chunk[j]));}return out;}
function svg(p,width=620,height=340,options={}){
 const W=Math.max(320,width),H=height,L=76,R=W-28,T=options.caption?76:35,B=H-(options.caption?108:72),points=p.heat||p.series.flatMap(s=>s.points),xr=extent(points.map(x=>x[0])),yr=p.heat?[-.5,p.heatRows-.5]:extent(points.map(x=>x[1]));
 if(p.kind==='bars'){xr[0]=Math.min(xr[0],...points.map(x=>x[2]??x[0]));xr[1]=Math.max(xr[1],...points.map(x=>x[3]??x[0]));yr[0]=Math.min(0,yr[0]);}if(!p.heat){const d=(yr[1]-yr[0])*.06;yr[0]-=yr[0]===0?0:d;yr[1]+=d;}
 if(options.yRange&&!p.heat){yr[0]=options.yRange[0];yr[1]=options.yRange[1];if(yr[0]===yr[1])yr[1]=yr[0]+1;}
 const X=x=>L+(x-xr[0])/(xr[1]-xr[0])*(R-L),Y=y=>B-(y-yr[0])/(yr[1]-yr[0])*(B-T),f=x=>Number(x.toFixed(2));const contrast=options.style==='contrast',grid=contrast?'#c2c8d3':'#e7eaf0',ink='#444c5f';let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.title)}"><title>${esc(p.title)}</title><desc>${esc(p.note)} X: ${esc(p.xlabel)}. Y: ${esc(p.ylabel)}.</desc><rect width="100%" height="100%" fill="white"/><g font-family="Arial,Helvetica,sans-serif" font-size="12" fill="${ink}">`;
 if(options.caption)s+=`<text x="${L}" y="26" font-size="19" font-weight="600" fill="#202331">${esc(p.title)}</text><text x="${L}" y="46" font-size="11" fill="#677087">FokoLab / recorded model output</text>`;
 for(let i=0;i<=4;i++){const x=xr[0]+(xr[1]-xr[0])*i/4,y=yr[0]+(yr[1]-yr[0])*i/4;s+=`<path d="M${L},${f(Y(y))}H${R}" stroke="${grid}" stroke-dasharray="${i===0?'none':'3 4'}"/><text x="${f(X(x))}" y="${B+23}" text-anchor="middle">${esc(fmt(x))}</text>`;if(!p.heat)s+=`<text x="${L-10}" y="${f(Y(y)+4)}" text-anchor="end">${esc(fmt(y))}</text>`;}
 s+=`<text x="${L}" y="${T-14}" fill="#343b4f">${esc(p.ylabel)}</text><text x="${(L+R)/2}" y="${B+46}" text-anchor="middle" fill="#343b4f">${esc(p.xlabel)}</text>`;
 if(p.heat){const max=Math.max(1,...p.heat.map(x=>x[2])),nx=p.heat.length/p.heatRows,cw=(R-L)/Math.max(1,nx),ch=(B-T)/p.heatRows;for(const [x,y,v]of p.heat){const a=.06+.94*v/max;s+=`<rect x="${f(L+(x-xr[0])/(xr[1]-xr[0])*(R-L-cw))}" y="${f(B-(y+1)*ch)}" width="${f(cw+.2)}" height="${f(ch+.2)}" fill="rgba(49,85,220,${a.toFixed(4)})"><title>${esc(p.xlabel)} ${fmt(x)}; ${esc(p.heatLabels?.[y]??y)}: ${fmt(v)}</title></rect>`;}for(let j=0;j<p.heatRows;j++)if(p.heatRows<=12||j%2===0)s+=`<text x="${L-10}" y="${f(B-(j+.5)*ch+4)}" text-anchor="end">${esc(p.heatLabels?.[j]??j)}</text>`;s+=`<text x="${R}" y="${T-14}" text-anchor="end">Color 0 → ${fmt(max)}</text>`;}
 else for(const [i,ser]of p.series.entries()){const col=ser.color||colors[i%colors.length],a=drawSamples(ser.points);let d='',prev=null;for(let j=0;j<a.length;j++){const q=a[j];if(!finite(q[0])||!finite(q[1])){prev=null;continue;}const x=f(X(q[0])),y=f(Y(q[1]));if(p.kind==='bars'){s+=`<rect x="${f(X(q[2]??q[0]-.4))}" y="${y}" width="${f(Math.max(1,X(q[3]??q[0]+.4)-X(q[2]??q[0]-.4)-1))}" height="${f(Math.max(0,Y(0)-y))}" fill="${col}" fill-opacity="${p.series.length>1?.45:.85}"><title>${esc(ser.name)}: ${fmt(q[0])}; count ${fmt(q[1])}</title></rect>`;continue;}d+=(prev?(p.step?'H'+x+'V'+y:'L'+x+','+y):'M'+x+','+y);prev=q;}
 s+=`<path d="${d}" stroke="${col}" stroke-width="${ser.markersOnly?0:contrast?3:2.5}" stroke-dasharray="${contrast&&i%3===1?'7 4':contrast&&i%3===2?'2 3':'none'}" fill="none" stroke-linejoin="round"/>`;
 // Tooltip samples are bounded; exported CSV retains every observation.
 const hop=Math.max(1,Math.ceil(a.length/160));if(p.kind!=='bars')for(let j=0;j<a.length;j+=hop){const q=a[j];if(!finite(q[1]))continue;s+=`<circle cx="${f(X(q[0]))}" cy="${f(Y(q[1]))}" r="${a.length<30?3:2}" fill="${col}"><title>${esc(ser.name)}: ${fmt(q[0])}, ${fmt(q[1])}</title></circle>`;}
 if(p.phase&&a.length){const first=a.find(q=>finite(q[1])),last=a.findLast(q=>finite(q[1]));if(first&&last)s+=`<circle cx="${f(X(first[0]))}" cy="${f(Y(first[1]))}" r="6" fill="white" stroke="${col}" stroke-width="2"/><circle cx="${f(X(last[0]))}" cy="${f(Y(last[1]))}" r="6" fill="${col}"/>`;}
 }
 if(Number.isFinite(options.cursor)&&options.cursor>=xr[0]&&options.cursor<=xr[1])s+=`<path d="M${f(X(options.cursor))} ${T}V${B}" stroke="#202f3b" stroke-width="1.5" stroke-dasharray="4 3"/><text x="${Math.min(R-70,Math.max(L,X(options.cursor)+5))}" y="${T+12}" fill="#202f3b">${esc(fmt(options.cursor))}</text>`;
 if(options.caption){const cols=Math.max(1,Math.floor((R-L)/160));for(const [i,ser]of p.series.entries()){const x=L+(i%cols)*160,y=B+68+Math.floor(i/cols)*17;if(y>H-7)break;s+=`<path d="M${x} ${y-4}h18" stroke="${ser.color||colors[i%colors.length]}" stroke-width="3"/><text x="${x+25}" y="${y}" font-size="10">${esc(ser.name)}</text>`;}}
 return s+'</g></svg>';
}
function csv(p){const quote=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const rows=p.heat?[['x','row','value'],...p.heat]:[['series','x','y','bin_lower','bin_upper'],...p.series.flatMap(s=>s.points.map(q=>[s.name,...q]))];return rows.map(r=>r.map(quote).join(',')).join('\n');}
function python(p,options={}){
 const payload=JSON.stringify({plot:p,colors,style:options.style||'publication'});
 return `# FokoLab: reproduce a figure from recorded model observations.\n# This script does not integrate or rerun the underlying model.\n# Install: pip install numpy matplotlib\nimport json\nfrom pathlib import Path\nimport numpy as np\nimport matplotlib\nmatplotlib.use("Agg")\nimport matplotlib.pyplot as plt\n\ndata = json.loads(${JSON.stringify(payload)})\np = data["plot"]\nplt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.spines.top": False, "axes.spines.right": False, "svg.fonttype": "none", "savefig.dpi": 300})\nfig, ax = plt.subplots(figsize=(10, 5.8), layout="constrained")\nax.set_axisbelow(True)\nax.grid(axis="y", color="#e3e7ee", linestyle="--", linewidth=0.6)\nif p.get("heat"):\n    a = np.array(p["heat"], dtype=float)\n    xs = np.unique(a[:, 0])\n    ys = np.unique(a[:, 1])\n    z = np.full((len(ys), len(xs)), np.nan)\n    for x, y, v in a:\n        z[np.searchsorted(ys, y), np.searchsorted(xs, x)] = v\n    mesh = ax.pcolormesh(xs, ys, z, shading="nearest", cmap="Blues", vmin=0)\n    fig.colorbar(mesh, ax=ax, label="Value")\n    if p.get("heatLabels"):\n        ax.set_yticks(ys, p["heatLabels"])\nelse:\n    for i, s in enumerate(p["series"]):\n        a = np.array([[np.nan if v is None else v for v in row] for row in s["points"]], dtype=float)\n        if not len(a):\n            continue\n        color = s.get("color") or data["colors"][i % len(data["colors"])]\n        if p.get("kind") == "bars":\n            width = a[:, 3]-a[:, 2] if a.shape[1] > 3 else 0.8\n            ax.bar(a[:, 0], a[:, 1], width=width*0.94, color=color, alpha=0.55 if len(p["series"]) > 1 else 0.9, label=s["name"])\n        else:\n            style = ["-", "--", ":"][i % 3] if data["style"] == "contrast" else "-"\n            ax.plot(a[:, 0], a[:, 1], color=color, lw=1.8, linestyle="None" if s.get("markersOnly") else style, marker="o" if s.get("markersOnly") else None, drawstyle="steps-post" if p.get("step") else "default", label=s["name"])\n    ax.legend(frameon=False, loc="best")\nax.set(title=p["title"], xlabel=p["xlabel"], ylabel=p["ylabel"])\nfor ext in ("png", "svg", "pdf"):\n    fig.savefig(p["id"] + "." + ext, bbox_inches="tight")\nPath(p["id"] + "-context.txt").write_text(p["note"], encoding="utf-8")\nprint("Saved PNG, SVG, PDF and interpretation note for", p["id"])\n`;
}
const api={analyze,svg,csv,python,histogram,colors,fmt};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LabAnalysis=api;
})(globalThis);
