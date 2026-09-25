/** New explicit teaching models. Conservation is tested separately from biological adequacy. */
import {linspace,rng,sum,mean,integrate} from './numerics.mjs';
import {line,plot,leafRates} from './biology.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function validateWeather(rows,t0,t1){
 if(!Array.isArray(rows)||rows.length<2)throw Error('Weather requires at least two rows: day, temperature_C, rain_mm_day, light_umol_m2_s.');
 rows.forEach((r,i)=>{if(!Array.isArray(r)||r.length!==4||r.some(x=>!Number.isFinite(x)))throw Error(`Weather row ${i+1}: four finite numeric values are required.`);if(i&&r[0]<=rows[i-1][0])throw Error('Weather times must be strictly increasing, without duplicates.');if(r[2]<0||r[3]<0)throw Error('Rain and irradiance cannot be negative.');});
 if(rows[0][0]>t0||rows.at(-1)[0]<t1)throw Error(`Weather covers ${rows[0][0]}–${rows.at(-1)[0]} days, not the requested ${t0}–${t1}. No extrapolation was performed.`);
 return rows;
}
export function forcing(t,p,weather=null){
 if(weather){let lo=0,hi=weather.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(weather[m][0]<=t)lo=m;else hi=m;}const a=weather[lo],b=weather[hi],f=(t-a[0])/(b[0]-a[0]);return{temperature:a[1]+f*(b[1]-a[1]),rain:a[2]+f*(b[2]-a[2]),light:a[3]+f*(b[3]-a[3])};}
 const wave=Math.sin(2*Math.PI*(t-p.phase)/p.year),dry=t>=p.droughtStart&&t<p.droughtStart+p.droughtLength;
 return{temperature:p.temperature+p.tempAmplitude*wave,rain:dry?0:p.rain*(1+p.rainSeason*wave),light:p.light};
}
export function plantBalance(q){
 const p=q.params,weather=q.weather?validateWeather(q.weather,q.t0,q.tEnd):null;
 if(p.initialWater>p.capacity)throw Error('Initial water exceeds the soil capacity. Change the initial stock or capacity; it is not reset automatically.');
 if(p.season>p.year)throw Error('The active season cannot exceed the environmental year.');
 let shoot=p.initialBiomass*(1-p.rootAllocation),root=p.initialBiomass*p.rootAllocation,seed=p.initialSeed,litter=0,water=p.initialWater,nitrogen=p.initialN;
 let rainIn=0,irrigationIn=0,etOut=0,drainOut=0,nInput=0,nLeach=0,netC=0,respC=0,t=q.t0,substeps=0,reseedEvents=0;
 const path={C3:[0,1,24], 'C3–C4':[.4,.85,27], C4:[1,.7,32],CAM:[1,.3,28]}[p.pathway];
 const [pump,waterFactor,optimum]=path,slow=p.pathway==='CAM'?.48:1;
 const initialC=shoot+root+seed,initialN=nitrogen+p.nRatio*initialC;
 const times=linspace(q.t0,q.tEnd,q.samples),rows=[],events=[];let flux=0;
 const save=time=>{const f=forcing(time,p,weather),cBalance=shoot+root+seed+litter+respC-initialC-netC,nBalance=nitrogen+p.nRatio*(shoot+root+seed+litter)+nLeach-initialN-nInput,wBalance=water-p.initialWater-rainIn-irrigationIn+etOut+drainOut;
 rows.push([time,shoot,root,seed,litter,water,nitrogen,netC,respC,rainIn,irrigationIn,etOut,drainOut,nInput,nLeach,f.temperature,f.rain,f.light,flux,cBalance,wBalance,nBalance]);};save(t);
 for(let k=1;k<times.length;k++){
  while(t<times[k]-1e-12){
   if(++substeps>150000)throw Error('Plant integration budget exceeded. Increase the substep or shorten the horizon. No partial result was published.');
   let h=Math.min(q.step,.25,times[k]-t),age=t-q.t0,yearIndex=Math.floor((age+1e-10)/p.year),cycleStart=q.t0+yearIndex*p.year;
   for(const edge of [cycleStart+p.season,cycleStart+p.year,p.droughtStart,p.droughtStart+p.droughtLength])if(edge>t+1e-10&&edge<t+h)h=edge-t;
   const mid=t+h/2,cycleAge=mid-cycleStart,active=p.life==='perennial'||(cycleAge<p.season&&(p.life==='annual-reseed'||yearIndex===0)),f=forcing(mid,p,weather);
   rainIn+=f.rain*h;irrigationIn+=p.irrigation*h;
   const availableWater=water+(f.rain+p.irrigation)*h,drain=Math.max(0,availableWater-p.capacity),stored=availableWater-drain;drainOut+=drain;
   const waterStress=stored/(stored+.18*p.capacity),canopy=1-Math.exp(-shoot/80),demand=p.evap*(.12+.88*canopy)*waterFactor*waterStress;
   const waterLoss=Math.min(stored,demand*h);water=stored-waterLoss;etOut+=waterLoss;
   nInput+=p.fertilizer*h;nitrogen+=p.fertilizer*h;
   const decomposed=litter*(-Math.expm1(-p.litterDecay*h));litter-=decomposed;respC+=decomposed;nitrogen+=p.nRatio*decomposed;
   const leached=nitrogen*(-Math.expm1(-p.leaching*drain/Math.max(1,availableWater)));nitrogen-=leached;nLeach+=leached;
   const thermal=Math.exp(-(((f.temperature-optimum)/15)**2)),light=f.light/(f.light+220),co2=p.co2/(p.co2+250*(1-.65*pump)),nStress=nitrogen/(nitrogen+p.halfN);
   const live=shoot+root,potential=active?p.growth*shoot*Math.max(0,1-live/p.carrying)*thermal*light*co2*waterStress*nStress*slow*(1-.18*pump):0;
   const gain=Math.min(potential*h,nitrogen/p.nRatio);netC+=gain;nitrogen-=p.nRatio*gain;flux=gain/h;
   const reproductive=active&&p.life!=='perennial'&&cycleAge>.6*p.season?.45:0;
   shoot+=gain*(1-reproductive)*(1-p.rootAllocation);root+=gain*(1-reproductive)*p.rootAllocation;seed+=gain*reproductive;
   const turn=p.turnover+(active?0:.12),dShoot=shoot*(-Math.expm1(-turn*h)),dRoot=root*(-Math.expm1(-.7*turn*h));shoot-=dShoot;root-=dRoot;litter+=dShoot+dRoot;
   t+=h;
   if(p.life==='annual-reseed'&&Math.abs(t-(cycleStart+p.year))<1e-8){const germinated=seed*p.reseed;seed-=germinated;shoot+=germinated*(1-p.rootAllocation);root+=germinated*p.rootAllocation;reseedEvents++;events.push({time:t,type:'germination',carbon:germinated,nitrogen:p.nRatio*germinated});}
  }
  t=times[k];save(t);
 }
 const series=(j,name,extra={})=>line(times,rows.map(r=>r[j]),name,extra);
 return{columns:['time_day','shoot_C','root_C','seed_C','litter_C','soil_water_mm','mineral_N','cumulative_net_C_gain','cumulative_litter_CO2_C','cumulative_rain_mm','cumulative_irrigation_mm','cumulative_ET_mm','cumulative_drainage_mm','cumulative_N_input','cumulative_N_leaching','temperature_C','rain_rate_mm_day','light_umol_m2_s','net_gain_gC_m2_day','carbon_residual','water_residual','nitrogen_residual'],rows,
 plots:[plot('biomass','Carbon allocation',[series(1,'Shoot'),series(2,'Root'),series(3,'Reproductive / seed bank'),series(4,'Litter',{line:{dash:'dot'}})],'Model time (days)','Carbon (g C m⁻²)'),plot('water','Finite soil water',[series(5,'Stored water'),line(times,rows.map(r=>p.initialWater+r[9]+r[10]-r[11]-r[12]),'Flux reconstruction',{line:{dash:'dot'}})],'Model time (days)','Water (mm)'),plot('nitrogen','Nitrogen pools',[series(6,'Mineral nitrogen'),line(times,rows.map(r=>p.nRatio*(r[1]+r[2]+r[3])),'Living + seed nitrogen'),line(times,rows.map(r=>p.nRatio*r[4]),'Litter nitrogen')],'Model time (days)','Nitrogen (g N m⁻²)'),plot('water-flux','Water ledger',[series(9,'Rain'),series(10,'Irrigation'),series(11,'Evapotranspiration'),series(12,'Drainage')],'Model time (days)','Cumulative transfer (mm)'),plot('balances','Numerical balance residuals',[series(19,'Carbon residual'),series(20,'Water residual'),series(21,'Nitrogen residual')],'Model time (days)','Residual in each declared unit'),plot('climate','Temperature forcing',[series(15,'Temperature')],'Model time (days)','Temperature (°C)'),plot('productivity','Net carbon production',[series(18,'Net growth transfer')],'Model time (days)','g C m⁻² d⁻¹'),plot('phase','Water–carbon response',[{x:rows.map(r=>r[5]),y:rows.map(r=>r[1]+r[2]),type:'scatter',mode:'lines+markers',marker:{size:3,color:times,colorscale:'Cividis',showscale:true,colorbar:{title:'Day'}},name:'Trajectory'}],'Soil water (mm)','Live carbon (g C m⁻²)')],
 metrics:{'Final live carbon (g C m⁻²)':shoot+root,'Seed carbon (g C m⁻²)':seed,'Final water (mm)':water,'Final mineral N (g N m⁻²)':nitrogen,'Max water residual':Math.max(...rows.map(r=>Math.abs(r[20]))),'Max carbon residual':Math.max(...rows.map(r=>Math.abs(r[19]))),'Max nitrogen residual':Math.max(...rows.map(r=>Math.abs(r[21]))),'Germination events':reseedEvents,'Substeps':substeps},
 warnings:[p.rain===0&&p.irrigation===0&&!weather?'No water enters this experiment. The initial stock can only decrease.':'Rain and irrigation are explicit external inputs. No water stock is replenished at a season or year boundary.',p.life==='single-season'?'One cohort only: after its active season it senesces. A longer horizon does not create a new plant.':p.life==='annual-reseed'?'New cohorts transfer carbon and nitrogen from the existing seed bank. No free seedlings or nutrient resets.':'Perennial growth responds continuously to forcing; there is no yearly state reset.',weather?'Weather is linearly interpolated within its supplied coverage. Rates, not daily rainfall totals, are required.':'Location presets are illustrative forcing, not historical measurements.'],events,timeSeries:true,animation:{type:'plant',time:times,states:rows.map(r=>r.slice(1)),capacity:p.capacity},modelInfo:{equations:['dW/dt = precipitation + irrigation − evapotranspiration − drainage','ΔC = net carbon gain − litter CO₂ loss','ΔN_total = nitrogen input − leaching'],provenance:'New 79.2 conservative resource-transfer teaching model.'}};
}
export function leafExperiment(q){
 const p=q.params;
 if(q.method==='heat'){
  const sigma=5.670374419e-8,latent=44000*p.transpiration,ta=p.air+273.15;
  const rhs=(t,y)=>[(p.radiation-p.heatTransfer*(y[0]-p.air)-p.emissivity*sigma*((y[0]+273.15)**4-ta**4)-latent)/p.heatCapacity];
  const sol=integrate(rhs,[p.initialTemp],q.t0,q.tEnd,{method:'rk45',samples:q.samples,step:q.step,rtol:q.rtol,atol:q.atol});
  const rows=sol.t.map((t,i)=>{const T=sol.y[i][0],s=p.heatTransfer*(T-p.air),r=p.emissivity*sigma*((T+273.15)**4-ta**4);return[t,T,p.radiation,s,r,latent,p.radiation-s-r-latent];});
  return{columns:['time_s','leaf_temperature_C','absorbed_W_m2','sensible_W_m2','longwave_W_m2','latent_W_m2','storage_W_m2'],rows,plots:[plot('temperature','Leaf heat transient',[line(sol.t,rows.map(r=>r[1]),'Leaf'),line(sol.t,rows.map(()=>p.air),'Air',{line:{dash:'dot'}})],'Time (seconds)','Temperature (°C)'),plot('energy','Heat-flux partition',[2,3,4,5,6].map((j)=>line(sol.t,rows.map(r=>r[j]),['','','Absorbed','Sensible','Net longwave','Latent','Heat storage'][j])),'Time (seconds)','Flux (W m⁻²)')],metrics:{'Final leaf temperature (°C)':rows.at(-1)[1],'Final heat storage (W m⁻²)':rows.at(-1)[6]},warnings:['Transpiration is prescribed, not predicted by a stomatal or hydraulic model. Thermal and biochemical experiments are separate.'],timeSeries:true};
 }
 const x=linspace(0,q.method==='aci'?p.CiMax:2500,q.samples),rows=x.map(v=>{const r=leafRates(q.method==='aci'?v:p.Ci,{...p,light:q.method==='light'?v:p.light});return[v,r.A,r.Ac,r.Aj,r.J];});
 return{columns:[q.method==='aci'?'Ci_ubar':'light_umol_m2_s','net_A','Rubisco_limited_net_A','electron_limited_net_A','electron_transport'],rows,plots:[plot('assimilation','C3 limitation branches',[line(x,rows.map(r=>r[1]),'Net assimilation',{line:{width:3.2}}),line(x,rows.map(r=>r[2]),'Rubisco branch',{line:{dash:'dot'}}),line(x,rows.map(r=>r[3]),'Electron branch',{line:{dash:'dash'}})],q.method==='aci'?'Intercellular CO₂ (µbar)':'Photon flux (µmol m⁻² s⁻¹)','Net CO₂ assimilation (µmol m⁻² s⁻¹)'),plot('electron','Electron transport',[line(x,rows.map(r=>r[4]),'J')],q.method==='aci'?'Intercellular CO₂ (µbar)':'Photon flux (µmol m⁻² s⁻¹)','Electron transport (µmol m⁻² s⁻¹)')],metrics:{'Net A at selected Ci':leafRates(p.Ci,p).A,'Electron transport J':leafRates(p.Ci,p).J,'Day respiration':p.Rd},warnings:['Negative net assimilation below compensation is a model prediction, not a solver failure. Kinetic parameters are held fixed; these curves do not imply temperature acclimation.'],timeSeries:false};
}
export function seasonalFitness(pump,allocation,p,generation=0){
 const water=clamp(p.water-p.drying*generation,.001,1),co2=p.co2/(p.co2+250*(1-.65*pump));let total=0;
 for(let i=0;i<24;i++){const temperature=p.temperature+p.warming*generation+p.tempAmplitude*Math.sin(2*Math.PI*((i+.5)*p.season/24+p.phase)/p.year),thermal=Math.exp(-(((temperature-(24+8*pump))/15)**2)),hydraulic=water+(1-water)*allocation*.75,photoresp=Math.exp(-Math.max(0,temperature-20)*(1-pump)*.012*420/p.co2);total+=thermal*hydraulic*co2*photoresp*(1-.22*pump)*(1-.45*allocation);}
 return p.season*total/24;
}
export function fixationProbability(s,N){
 if(Math.abs(s)<1e-10)return 1/N;
 if(s>0)return -Math.expm1(-s)/-Math.expm1(-N*s);
 const a=-s;if((N-1)*a>745)return 0;return Math.exp(-(N-1)*a)*(-Math.expm1(-a))/(-Math.expm1(-N*a));
}
export function adaptation(q){
 const p=q.params,R=rng(q.seed),x=linspace(0,1,p.resolution),y=linspace(.05,.85,p.resolution),z=y.map(b=>x.map(a=>seasonalFitness(a,b,p))),steps=q.method==='map'?0:Math.round(q.tEnd-q.t0);let a=p.pump0,b=p.root0,accepted=0;const rows=[[0,a,b,seasonalFitness(a,b,p),0,0]],events=[];
 const reflect=(v,lo,hi)=>{const span=hi-lo,w=((v-lo)%(2*span)+2*span)%(2*span);return lo+(w<=span?w:2*span-w);};
 for(let g=1;g<=steps;g++){const na=reflect(a+p.mutation*R.normal(),0,1),nb=reflect(b+p.mutation*.5*R.normal(),.05,.85),f0=seasonalFitness(a,b,p,g),f1=seasonalFitness(na,nb,p,g),s=p.selection*Math.log(Math.max(1e-12,f1)/Math.max(1e-12,f0)),fix=fixationProbability(s,p.N),ok=R()<fix;if(ok){a=na;b=nb;accepted++;events.push({generation:g,pump:a,root:b,selection:s,fixationProbability:fix});}rows.push([g,a,b,seasonalFitness(a,b,p,g),s,Number(ok)]);}
 const band=[{type:'rect',xref:'x',yref:'paper',x0:0,x1:.15,y0:1.01,y1:1.06,fillcolor:'#367fa0',opacity:.8,line:{width:0},layer:'above'},{type:'rect',xref:'x',yref:'paper',x0:.15,x1:.85,y0:1.01,y1:1.06,fillcolor:'#b98235',opacity:.8,line:{width:0},layer:'above'},{type:'rect',xref:'x',yref:'paper',x0:.85,x1:1,y0:1.01,y1:1.06,fillcolor:'#477647',opacity:.8,line:{width:0},layer:'above'}];
 const trajectory={type:'scatter',mode:'lines+markers',x:rows.map(r=>r[1]),y:rows.map(r=>r[2]),name:'Trait substitutions',line:{color:'#26323d',width:2},marker:{size:4,color:rows.map(r=>r[0]),colorscale:'Cividis',showscale:false,colorbar:{title:'Generation'}}};
 const gridMax=Math.max(...z.flat()),time=rows.map(r=>r[0]),legend=[['C3',0,'#367fa0'],['C3–C4',.5,'#b98235'],['C4',1,'#477647']];
 return{columns:['generation','concentrating_trait','root_allocation_trait','fitness_proxy','proposal_log_selection','fixed'],rows,events,plots:[plot('landscape','Season-averaged fitness · initial environment',[{type:'contour',x,y,z,colorscale:'Viridis',contours:{showlabels:true},colorbar:{title:{text:'Fitness proxy'},x:1.02},name:'Fitness'},trajectory,...legend.map(([name,v,c])=>({type:'scatter',x:[v],y:[null],mode:'markers',marker:{color:c,size:10},name:name+' landmark'}))],'Concentrating trait (dimensionless)','Root-allocation trait (dimensionless)',{shapes:band}),plot('surface','Fitness surface',[{type:'surface',x,y,z,colorscale:'Viridis',name:'Seasonal fitness'}],'','',{scene:{xaxis:{title:'Concentrating trait'},yaxis:{title:'Root allocation'},zaxis:{title:'Fitness proxy'}}}),plot('traits','Substitution trajectory',[line(time,rows.map(r=>r[1]),'Concentrating trait'),line(time,rows.map(r=>r[2]),'Root-allocation trait')],'Generations','Trait value'),plot('fitness','Resident fitness under each environment',[line(time,rows.map(r=>r[3]),'Resident seasonal proxy')],'Generations','Dimensionless seasonal fitness proxy'),plot('strategies','Declared pathway landmarks',legend.map(([name,v,c])=>line(y,y.map(b=>seasonalFitness(v,b,p)),name,{line:{color:c,width:2}})),'Root-allocation trait','Seasonal fitness proxy')],metrics:{'Accepted substitutions':accepted,'Mutation attempts':steps,'Neutral fixation probability':1/p.N,'Final concentrating trait':a,'Final fitness proxy':rows.at(-1)[3],'Initial-grid maximum':gridMax},warnings:['C3, C3–C4 and C4 bands are illustrative trait landmarks. They are not empirical physiological boundaries or claims of ancestry.','The landscape shows the initial environment. Changing-environment trajectories use the specified per-generation forcing; the final fitness curve is not ascent on a static landscape.','Water here is a dimensionless selection environment, not a soil reservoir. Use Plant growth for physical water and nitrogen budgets.'],animation:{type:'adaptation',time,states:rows},timeSeries:false};
}
export function dice(q){
 const p=q.params,R=rng(q.seed),counts=Array(p.faces).fill(0),rows=[];let total=0;const stride=Math.max(1,Math.ceil(p.rolls/600));
 for(let i=1;i<=p.rolls;i++){const face=1+Math.floor(R()*p.faces);counts[face-1]++;total+=face;if(i===1||i%stride===0||i===p.rolls)rows.push([i,total/i]);}
 const x=counts.map((_,i)=>i+1),expected=p.rolls/p.faces,chi2=sum(counts.map(c=>(c-expected)**2/expected));
 return{columns:['roll','running_mean'],rows,frequencyTable:{columns:['face','observed','expected'],rows:x.map((v,i)=>[v,counts[i],expected])},plots:[plot('frequencies','Face counts',[{type:'bar',x,y:counts,name:'Observed'},line(x,counts.map(()=>expected),'Fair-die expectation',{line:{dash:'dot'}})],'Face','Count'),plot('mean','Convergence of the sample mean',[line(rows.map(r=>r[0]),rows.map(r=>r[1]),'Running mean'),line(rows.map(r=>r[0]),rows.map(()=>(p.faces+1)/2),'Expectation',{line:{dash:'dot'}})],'Roll number','Face value')],metrics:{'Rolls':p.rolls,'Sample mean':total/p.rolls,'Expected mean':(p.faces+1)/2,'Pearson χ² statistic':chi2,'Degrees of freedom':p.faces-1},warnings:['Fairness is imposed by the simulation. A frequency plot of simulated fair dice does not test a physical die. No p-value is inferred from the statistic alone.'],timeSeries:false,animation:{type:'dice',time:rows.map(r=>r[0]),states:rows}};
}
export function diffusion(q){
 const p=q.params,n=p.nodes,dx=p.length/n,x=Array.from({length:n},(_,i)=>(i+.5)*dx),times=linspace(q.t0,q.tEnd,q.samples),limit=(p.boundary==='fixed'?.3:.45)*dx*dx/p.D;
 let u=x.map(v=>p.initial==='uniform'?1:p.initial==='sine'?1+.5*Math.sin(2*Math.PI*v/p.length):Math.exp(-(((v-.5*p.length)/(.09*p.length))**2))),t=q.t0,steps=0,transfer=0;
 const initial=sum(u)*dx,rows=[[q.t0,...u]],budget=[[q.t0,initial,0,0]];
 for(let k=1;k<times.length;k++){
  while(t<times[k]-1e-12){if(++steps>500000)throw Error('Diffusion integration budget exceeded. Reduce diffusivity, horizon or spatial resolution.');const h=Math.min(q.step,limit,times[k]-t),faces=Array(n+1).fill(0);for(let i=1;i<n;i++)faces[i]=-p.D*(u[i]-u[i-1])/dx;
   if(p.boundary==='periodic')faces[0]=faces[n]=-p.D*(u[0]-u[n-1])/dx;
   if(p.boundary==='fixed'){faces[0]=-2*p.D*(u[0]-p.left)/dx;faces[n]=-2*p.D*(p.right-u[n-1])/dx;}
   transfer+=h*(faces[0]-faces[n]);u=u.map((v,i)=>v+h*(faces[i]-faces[i+1])/dx);t+=h;
  }t=times[k];rows.push([t,...u]);const mass=sum(u)*dx;budget.push([t,mass,transfer,mass-initial-transfer]);
 }
 const analytic=p.boundary==='periodic'&&p.initial==='sine'?x.map(v=>1+.5*Math.exp(-p.D*(2*Math.PI/p.length)**2*(q.tEnd-q.t0))*Math.sin(2*Math.PI*v/p.length)):null;
 const traces=[line(x,rows[0].slice(1),'Initial',{line:{dash:'dot'}}),line(x,u,'Final numerical field')];if(analytic)traces.push(line(x,analytic,'Continuous analytic solution',{line:{dash:'dash'}}));
 return{columns:['time',...x.map((_,i)=>'cell_'+i)],rows,coordinates:x,budget:{columns:['time','mass','boundary_transfer','balance_residual'],rows:budget},plots:[plot('field','Spatial concentration',traces,'Position (length units)','Concentration'),plot('spacetime','Space–time dynamics',[{type:'heatmap',x,y:times,z:rows.map(r=>r.slice(1)),colorscale:'Viridis',colorbar:{title:'Concentration'}}],'Position','Time'),plot('mass','Mass and boundary transfer',[line(times,budget.map(r=>r[1]),'Total mass'),line(times,budget.map(r=>initial+r[2]),'Initial + boundary transfer',{line:{dash:'dot'}})],'Time','Integrated mass'),plot('residual','Conservation residual',[line(times,budget.map(r=>r[3]),'Mass-balance residual')],'Time','Mass units')],metrics:{'Cells':n,'Substeps':steps,'Maximum stable substep':limit,'Maximum balance error':Math.max(...budget.map(r=>Math.abs(r[3]))),'Boundary transfer':transfer,...(analytic?{'Analytic final max error':Math.max(...u.map((v,i)=>Math.abs(v-analytic[i])))}:{})},warnings:['Finite-volume cells use shared face fluxes. Fixed exterior concentrations exchange mass; periodic and no-flux boundaries do not.','Output sampling is separate from the actual stability-limited integration substep.'],animation:{type:'field',time:times,states:rows.map(r=>r.slice(1)),x},timeSeries:false};
}
