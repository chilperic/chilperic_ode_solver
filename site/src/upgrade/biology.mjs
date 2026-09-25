import {linspace,rng,mean,quantile,sum,integrate} from './numerics.mjs';
export const line=(x,y,name,extra={})=>({x,y,name,type:'scatter',mode:'lines',...extra});
export const plot=(id,title,data,xlabel,ylabel,extra={})=>({id,title,data,layout:{xaxis:{title:{text:xlabel}},yaxis:{title:{text:ylabel}},...extra}});
export function plant(q){
 const p=q.params;if(p.initialWater>p.capacity)throw Error('Initial soil water exceeds capacity. Change the initial state or soil capacity; it will not be silently reset.');
 let W=p.initialWater,shoot=p.initialBiomass*(1-p.rootAllocation),root=p.initialBiomass*p.rootAllocation,seed=0,P=0,I=0,E=0,D=0,t=q.t0;const ts=linspace(q.t0,q.tEnd,q.samples),rows=[];
 const demandFactor=p.pathway==='C4'?.7:p.pathway==='CAM'?.3:1,tempOpt=p.pathway==='C4'?32:p.pathway==='CAM'?28:24,growthFactor=p.pathway==='CAM'?.5:p.pathway==='C4'?.9:1;
 const T=t=>p.temperature+p.tempAmplitude*Math.sin(2*Math.PI*t/365);
 rows.push([shoot,root,seed,W,P,I,E,D,T(t)]);
 let steps=0;
 for(let oi=1;oi<ts.length;oi++){
  while(t<ts[oi]){
   if(++steps>200000)throw Error('Plant substep budget exceeded. Shorten the horizon or increase the step.');
   let h=Math.min(q.step,ts[oi]-t,.25);for(const edge of [p.droughtStart,p.droughtStart+p.droughtLength,q.t0+p.season])if(edge>t&&edge<t+h)h=edge-t;
   if(t+h===t)throw Error('Plant step underflow.');
   const mid=t+h/2,drought=mid>=p.droughtStart&&mid<p.droughtStart+p.droughtLength;
   const rain=drought?0:p.rain*(1+p.rainSeason*Math.sin(2*Math.PI*mid/365));
   const waterIn=(rain+p.irrigation)*h;P+=rain*h;I+=p.irrigation*h;
   const available=W+waterIn,drain=Math.max(0,available-p.capacity),stored=available-drain;D+=drain;
   const stress=stored/(stored+.22*p.capacity),area=1-Math.exp(-shoot/100);
   const demand=p.evap*(.15+.85*area)*demandFactor*stress;
   const evaporation=Math.min(stored,demand*h);E+=evaporation;W=stored-evaporation;
   const B=shoot+root,thermal=Math.exp(-(((T(mid)-tempOpt)/16)**2)),age=mid-q.t0;
   const potential=p.growth*B*Math.max(0,1-B/1000)*thermal*stress*growthFactor*(age<p.season?1:0);
   const reproduction=age>.6*p.season?.45:0,mortality=.003+(age>p.season?.06:0);
   const G=potential*h,rs=p.rootAllocation*(1-reproduction),ss=(1-p.rootAllocation)*(1-reproduction);
   // Exact exponential loss split is nonnegative; input is applied after loss. No state clipping.
   shoot=shoot*Math.exp(-mortality*h)+G*ss;root=root*Math.exp(-mortality*.7*h)+G*rs;seed+=G*reproduction;
   t+=h;if(Math.abs(ts[oi]-t)<1e-12)t=ts[oi];
  }
  rows.push([shoot,root,seed,W,P,I,E,D,T(t)]);
 }
 const budget=rows.map(r=>r[3]-p.initialWater-r[4]-r[5]+r[6]+r[7]),res=Math.max(...budget.map(Math.abs));
 return{columns:['time_day','shoot_g_m2','root_g_m2','reproductive_g_m2','water_mm','rain_mm_cumulative','irrigation_mm_cumulative','evapotranspiration_mm_cumulative','drainage_mm_cumulative','temperature_C'],rows:ts.map((t,i)=>[t,...rows[i]]),plots:[plot('growth','Growth and allocation',rows[0].slice(0,3).map((_,j)=>line(ts,rows.map(r=>r[j]),['Shoot','Root','Reproductive biomass'][j])),'Time (days)','Biomass (g m⁻²)'),plot('water','Water remains a finite state',[line(ts,rows.map(r=>r[3]),'Soil water'),line(ts,rows.map(r=>p.initialWater+r[4]+r[5]-r[6]-r[7]),'Independent budget reconstruction',{line:{dash:'dot'}})],'Time (days)','Water (mm)'),plot('flux','Cumulative water transfers',[4,5,6,7].map(j=>line(ts,rows.map(r=>r[j]),['','','','','Precipitation','Irrigation','Evapotranspiration','Drainage'][j])),'Time (days)','Cumulative transfer (mm)'),plot('thermal','Temperature forcing',[line(ts,rows.map(r=>r[8]),'Illustrative temperature')],'Time (days)','Temperature (°C)')],metrics:{'Water balance residual (mm)':res,'Final water (mm)':W,'Final reproductive biomass (g/m²)':seed,'Rain input (mm)':P,'Integration substeps':steps},warnings:[p.rain===0&&p.irrigation===0?'Closed water supply: no water enters this simulation.':'Water enters only through the displayed precipitation and irrigation terms.'],animation:{type:'plant',time:ts,states:rows,capacity:p.capacity},stateNames:['Shoot','Root','Reproductive','Water'],timeSeries:true};
}
export function leafRates(C,p){
 const light=p.alpha*p.light,z=light+p.Jmax;
 // Stable small root of the non-rectangular light-response hyperbola.
 const J=light===0?0:2*light*p.Jmax/(z+Math.sqrt(z*z-4*p.theta*light*p.Jmax));
 const Ac=p.Vcmax*(C-p.gammaStar)/(C+p.Kc*(1+p.oxygen/p.Ko));
 const Aj=p.gammaStar===0?J/4:J*(C-p.gammaStar)/(4*(C+2*p.gammaStar));return{A:Math.min(Ac,Aj)-p.Rd,Ac:Ac-p.Rd,Aj:Aj-p.Rd,J};
}
export function leaf(q){const x=linspace(1,1200,q.samples),r=x.map(C=>leafRates(C,q.params));return{columns:['Ci_ubar','A_net','Ac_net','Aj_net'],rows:x.map((v,i)=>[v,r[i].A,r[i].Ac,r[i].Aj]),plots:[plot('response','C3 CO₂ response',[line(x,r.map(v=>v.A),'Net assimilation'),line(x,r.map(v=>v.Ac),'Rubisco-limited branch',{line:{dash:'dash'}}),line(x,r.map(v=>v.Aj),'Light-limited branch',{line:{dash:'dot'}})],'Intercellular CO₂ partial pressure (µbar)','Assimilation (µmol m⁻² s⁻¹)')],metrics:{'J (µmol m⁻² s⁻¹)':r[0].J,'A at Ci=280 µbar':leafRates(280,q.params).A,'Respiration (µmol m⁻² s⁻¹)':q.params.Rd},warnings:[],timeSeries:false};}
export function fitness(a,b,p){
 const heat=(p.temperature-20)/20,lowCO2=400/p.co2,benefit=(.6*heat+.7*p.dryness+.5*(lowCO2-1));
 return Math.exp(benefit*a*b+.12*b-.12*a*(1-b)-p.cost*a*a-.08*b*b);
}
export function fixation(s,N){if(Math.abs(s)<1e-10)return 1/N;if(s>0)return(-Math.expm1(-2*s))/(-Math.expm1(-2*N*s));const v=-2*s;if(N*v>700)return 0;return Math.expm1(v)/Math.expm1(N*v);}
export function evolution(q){
 const p=q.params,R=rng(q.seed),generations=Math.round(q.tEnd);let a=p.initialTrait,b=p.initialLeak,accepted=0;const rows=[[0,a,b,fitness(a,b,p),0]],proposals=[];
 for(let g=1;g<=generations;g++){
  // Reflection at finite trait boundaries, not unreported clipping.
  const reflect=x=>{x=((x%2)+2)%2;return x>1?2-x:x;};
  let aa=a,bb=b;if(R()<.5)aa=reflect(a+p.mutation*R.normal());else bb=reflect(b+p.mutation*R.normal());
  const f=fitness(a,b,p),ff=fitness(aa,bb,p),s=(ff-f)/f;
  const prob=fixation(s,p.population),yes=R()<prob;proposals.push([g,aa,bb,ff,prob,Number(yes)]);if(yes){a=aa;b=bb;accepted++;}rows.push([g,a,b,fitness(a,b,p),Number(yes)]);
 }
 const x=linspace(0,1,51),y=linspace(0,1,51),z=y.map(b=>x.map(a=>fitness(a,b,p)));
 const region=y.map(b=>x.map(a=>a<.25?0:(a>.72&&b>.65?2:1)));
 const regionTrace={x,y,z:region,type:'heatmap',zmin:0,zmax:2,colorscale:[[0,'#dcebdc'],[.2499,'#dcebdc'],[.25,'#f1e4c2'],[.7499,'#f1e4c2'],[.75,'#dbe8f2'],[1,'#dbe8f2']],showscale:false,hoverinfo:'skip',name:'Declared proxy regions'};
 const contour={x,y,z,type:'contour',contours:{coloring:'lines'},line:{width:1},colorscale:'Greys',showscale:false,hovertemplate:'Pump %{x:.2f}<br>Retention %{y:.2f}<br>Fitness proxy %{z:.3f}<extra></extra>',name:'Fitness proxy'};
 const trajectory=line(rows.map(r=>r[1]),rows.map(r=>r[2]),'Recorded evolutionary path',{mode:'lines+markers',marker:{size:4}});
 return{columns:['generation','pump_allocation','sheath_retention','fitness_proxy','accepted'],rows,proposals,plots:[plot('landscape','Trait-space path · regions are proxies',[regionTrace,contour,trajectory],'Pump allocation (dimensionless)','Sheath retention (dimensionless)',{annotations:[{x:.11,y:.95,text:'C3-like',showarrow:false},{x:.47,y:.95,text:'Intermediate-like',showarrow:false},{x:.85,y:.95,text:'C4-like',showarrow:false}],xaxis:{range:[0,1],title:{text:'Pump allocation'}},yaxis:{range:[0,1],title:{text:'Sheath retention'}}}),plot('traits','Traits and fitness over generations',[line(rows.map(r=>r[0]),rows.map(r=>r[1]),'Pump allocation'),line(rows.map(r=>r[0]),rows.map(r=>r[2]),'Sheath retention'),line(rows.map(r=>r[0]),rows.map(r=>r[3]),'Fitness proxy')],'Mutation opportunities (generation index)','Dimensionless value')],metrics:{'Accepted mutations':accepted,'Mutation opportunities':generations,'Final fitness proxy':fitness(a,b,p),'Final pump allocation':a},warnings:['One new candidate mutation per indexed opportunity. Small fixation probabilities can legitimately produce a stationary path. Regions are not physiological diagnoses. The Kimura-style probability is a weak-selection diffusion approximation, not exact finite-population fixation.'],animation:{type:'evolution',time:rows.map(r=>r[0]),states:rows},timeSeries:false};
}
function ensembleResult(t,paths,name,unit,expected,extra={}){
 const med=t.map((_,i)=>quantile(paths.map(p=>p[i]),.5)),lo=t.map((_,i)=>quantile(paths.map(p=>p[i]),.05)),hi=t.map((_,i)=>quantile(paths.map(p=>p[i]),.95)),avg=t.map((_,i)=>mean(paths.map(p=>p[i])));
 const data=[...paths.slice(0,10).map((p,i)=>line(t,p,`Path ${i+1}`,{opacity:.26,showlegend:false,line:{width:1}})),line(t,lo,'5th percentile',{line:{width:0},showlegend:false}),line(t,hi,'5–95% simulation interval',{fill:'tonexty',line:{width:0},opacity:.35}),line(t,med,'Median'),line(t,avg,'Ensemble mean',{line:{dash:'dash'}})];if(expected)data.push(line(t,expected,'Analytical expectation',{line:{dash:'dot',width:2}}));
 return{columns:['time','mean','median','p05','p95',...(expected?['analytical_expectation']:[])],rows:t.map((v,i)=>[v,avg[i],med[i],lo[i],hi[i],...(expected?[expected[i]]:[])]),ensemble:paths,plots:[plot('ensemble',name,data,'Time / generation',unit),plot('distribution','Final-state distribution',[{type:'histogram',x:paths.map(p=>p.at(-1)),name:'Replicate endpoints',nbinsx:25}],'Final state', 'Replicate count')],metrics:{'Replicates':paths.length,'Final ensemble mean':avg.at(-1),'Final ensemble median':med.at(-1),...extra},warnings:['The simulation interval describes replicate variability; it is not a confidence interval for a population parameter.'],timeSeries:true};
}
export function stochastic(q){
 const p=q.params,R=rng(q.seed),ts=linspace(q.t0,q.tEnd,q.samples),paths=[];
 if(q.method==='ssa'&&!Number.isInteger(p.initial))throw Error('SSA initial population must be an integer.');
 for(let rep=0;rep<p.paths;rep++){
  let y=p.initial,t=q.t0,eventTime=Infinity,eventBirth=false,events=0;const out=[y];
  const draw=()=>{const hazard=(p.birth+p.death)*y;if(hazard<=0){eventTime=Infinity;return;}eventTime=t-Math.log(Math.max(R(),1e-15))/hazard;eventBirth=R()<p.birth/(p.birth+p.death);};if(q.method==='ssa')draw();
  for(let i=1;i<ts.length;i++){
   if(q.method==='ssa'){while(eventTime<=ts[i]){if(++events>250000||y>200000)throw Error('SSA event or population budget exceeded. Shorten the horizon; no trajectories were capped.');t=eventTime;y+=eventBirth?1:-1;draw();}}
   else{const h=ts[i]-ts[i-1];if(q.method==='brownian')y+=p.sigma*Math.sqrt(h)*R.normal();else{const e=Math.exp(-p.birth*h),sd=p.birth===0?p.sigma*Math.sqrt(h):p.sigma*Math.sqrt(-Math.expm1(-2*p.birth*h)/(2*p.birth));y=e*y+sd*R.normal();}}
   out.push(y);
  }paths.push(out);
 }
 const expected=ts.map(t=>q.method==='ssa'?p.initial*Math.exp((p.birth-p.death)*(t-q.t0)):q.method==='ou'?p.initial*Math.exp(-p.birth*(t-q.t0)):p.initial);
 return ensembleResult(ts,paths,'Stochastic trajectories',q.method==='ssa'?'Individuals':'State units',expected,{'Extinct fraction at horizon':q.method==='ssa'?mean(paths.map(p=>Number(p.at(-1)===0))):'Not a population model'});
}
export function branching(q){const p=q.params,R=rng(q.seed),G=Math.round(q.tEnd),ts=Array.from({length:G+1},(_,i)=>i),paths=[];for(let k=0;k<p.paths;k++){let n=p.initial;const v=[n];for(let g=0;g<G;g++){if(n>200000)throw Error('Branching population exceeded 200000. No silent truncation: reduce horizon, ancestors or offspring mean.');n=2*R.binomial(n,p.p);v.push(n);}paths.push(v);}const qext=p.p<=.5?1:((1-p.p)/p.p)**p.initial;return ensembleResult(ts,paths,'Branching lineages','Individuals',ts.map(g=>p.initial*(2*p.p)**g),{'Extinct at horizon':mean(paths.map(x=>Number(x.at(-1)===0))),'Theoretical eventual extinction':qext});}
export function genetics(q){const p=q.params,R=rng(q.seed),G=Math.round(q.tEnd),ts=Array.from({length:G+1},(_,i)=>i),paths=[];for(let k=0;k<p.paths;k++){let f=p.p0;const v=[f];for(let g=0;g<G;g++){const fs=f*(1+p.selection)/(1+p.selection*f),fm=p.mutation+(1-2*p.mutation)*fs;f=R.binomial(p.N,fm)/p.N;v.push(f);}paths.push(v);}return ensembleResult(ts,paths,'Wright–Fisher allele trajectories','Allele frequency',p.selection===0?ts.map(g=>.5+(p.p0-.5)*(1-2*p.mutation)**g):null,{'Gene copies':p.N,'Fixed at horizon':mean(paths.map(x=>Number(x.at(-1)===1))),'Lost at horizon':mean(paths.map(x=>Number(x.at(-1)===0)))});}
export function agents(q){
 const p=q.params,R=rng(q.seed),n=p.size,N=n*n,G=Math.round(q.tEnd);let a=Array(N).fill(0);const seeds=new Set;while(seeds.size<Math.min(p.initial,N))seeds.add(Math.floor(R()*N));for(const i of seeds)a[i]=1;
 const frames=[],rows=[];const save=g=>{const counts=[0,0,0];a.forEach(v=>counts[v]++);rows.push([g,...counts]);if(g%Math.max(1,Math.ceil(G/180))===0||g===G)frames.push({time:g,z:Array.from({length:n},(_,i)=>a.slice(i*n,(i+1)*n))});};save(0);
 for(let g=1;g<=G;g++){const b=[...a];for(let i=0;i<N;i++){if(a[i]===2)continue;if(a[i]===1){if(R()<p.gamma)b[i]=2;continue;}const x=i%n,y=Math.floor(i/n),nn=[y*n+(x+1)%n,y*n+(x+n-1)%n,((y+1)%n)*n+x,((y+n-1)%n)*n+x],k=nn.reduce((s,j)=>s+Number(a[j]===1),0);if(R()<1-(1-p.beta)**k)b[i]=1;}a=b;save(g);}
 return{columns:['step','susceptible','infected','recovered'],rows,plots:[plot('lattice','Local transmission · stored final lattice',[{type:'heatmap',z:frames.at(-1).z,zmin:0,zmax:2,colorscale:[[0,'#d8e3e8'],[.49,'#d8e3e8'],[.5,'#c26637'],[.74,'#c26637'],[.75,'#326f65'],[1,'#326f65']],colorbar:{tickvals:[0,1,2],ticktext:['S','I','R']},hovertemplate:'Column %{x}<br>Row %{y}<br>State %{z}<extra></extra>'}],'Lattice column','Lattice row',{yaxis:{scaleanchor:'x',title:{text:'Lattice row'}}}),plot('counts','Population states',[1,2,3].map(j=>line(rows.map(r=>r[0]),rows.map(r=>r[j]),['','Susceptible','Infected','Recovered'][j])),'Discrete step','Individuals')],metrics:{'Population':N,'Final infected':rows.at(-1)[2],'Final recovered':rows.at(-1)[3],'Conservation error':Math.max(...rows.map(r=>Math.abs(sum(r.slice(1))-N)))},warnings:[],animation:{type:'lattice',frames,time:frames.map(f=>f.time)},timeSeries:false};
}
export function networks(q){
 const p=q.params,R=rng(q.seed),n=p.nodes,A=Array.from({length:n},()=>Array(n).fill(0)),edges=[];
 if(q.graph){if(!Array.isArray(q.graph)||q.graph.length!==n||q.graph.some(r=>!Array.isArray(r)||r.length!==n))throw Error('Graph adjacency must match the node count.');for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=q.graph[i][j];if(![0,1].includes(v)||v!==q.graph[j][i]||(i===j&&v!==0))throw Error('Graph must be undirected, binary, symmetric and loop-free.');A[i][j]=v;}}
 else for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(q.method==='ring'?(j===i+1||(i===0&&j===n-1)):R()<p.probability)A[i][j]=A[j][i]=1;
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(A[i][j])edges.push([i,j]);
 const degree=A.map(sum),visited=new Set;let components=0;
 for(let i=0;i<n;i++){if(visited.has(i))continue;components++;let stack=[i];visited.add(i);while(stack.length){const j=stack.pop();for(let k=0;k<n;k++)if(A[j][k]&&!visited.has(k)){visited.add(k);stack.push(k);}}}
 const initial=Array(n).fill(0);initial[0]=1;const sol=integrate((t,y)=>A.map((r,i)=>p.diffusion*sum(r.map((v,j)=>v*(y[j]-y[i])))),initial,q.t0,q.tEnd,{method:'rk45',step:q.step,samples:Math.min(201,q.samples),nonnegative:true});
 const xy=Array.from({length:n},(_,i)=>[Math.cos(2*Math.PI*i/n),Math.sin(2*Math.PI*i/n)]),xe=[],ye=[];for(const[i,j]of edges){xe.push(xy[i][0],xy[j][0],null);ye.push(xy[i][1],xy[j][1],null);}
 return{columns:['time',...Array.from({length:n},(_,i)=>`node_${i}`)],rows:sol.t.map((t,i)=>[t,...sol.y[i]]),adjacency:A,plots:[plot('graph','Graph structure',[line(xe,ye,'Edges',{line:{width:1},hoverinfo:'skip'}),{type:'scatter',mode:'markers',x:xy.map(r=>r[0]),y:xy.map(r=>r[1]),text:degree.map((d,i)=>`Node ${i} · degree ${d}`),marker:{size:degree.map(d=>7+Math.sqrt(d)*2),color:degree,colorscale:'Teal'},name:'Nodes',hovertemplate:'%{text}<extra></extra>'}],'Layout x (arbitrary)','Layout y (arbitrary)',{yaxis:{scaleanchor:'x'}}),plot('diffusion','Conserved diffusion on the graph',Array.from({length:Math.min(8,n)},(_,j)=>line(sol.t,sol.y.map(r=>r[j]),`Node ${j}`)),'Time','Mass fraction')],metrics:{'Nodes':n,'Edges':edges.length,'Connected components':components,'Mean degree':mean(degree),'Mass conservation error':Math.max(...sol.y.map(y=>Math.abs(sum(y)-1)))},warnings:[],timeSeries:false};
}
export function pde(q){
 const p=q.params,n=p.nodes,dx=p.length/n,x=Array.from({length:n},(_,i)=>i*dx),t=linspace(q.t0,q.tEnd,Math.min(201,q.samples)),maxdt=.45*dx*dx/p.D;let y=x.map(v=>p.initial==='sine'?1+.5*Math.sin(2*Math.PI*v/p.length):Math.exp(-(((v-.5*p.length)/(.09*p.length))**2))),now=q.t0,rows=[[...y]],steps=0;
 for(let k=1;k<t.length;k++){while(now<t[k]){if(++steps>300000)throw Error('PDE substep budget exceeded. Reduce horizon, diffusivity or spatial resolution.');const h=Math.min(t[k]-now,maxdt,q.step),a=p.D*h/dx**2;const z=y.map((v,i)=>v+a*(y[(i+1)%n]-2*v+y[(i+n-1)%n]));y=z;now+=h;if(Math.abs(now-t[k])<1e-12)now=t[k];}rows.push([...y]);}
 const data=[line(x,rows[0],'Initial field',{line:{dash:'dot'}}),line(x,rows.at(-1),'Final numerical field')];let error=null;if(p.initial==='sine'){const exact=x.map(v=>1+.5*Math.exp(-p.D*(2*Math.PI/p.length)**2*(q.tEnd-q.t0))*Math.sin(2*Math.PI*v/p.length));data.push(line(x,exact,'Analytical solution',{line:{dash:'dash'}}));error=Math.max(...y.map((v,i)=>Math.abs(v-exact[i])));}
 return{columns:['time',...x.map((v,i)=>`u_at_node_${i}`)],rows:t.map((v,i)=>[v,...rows[i]]),coordinates:x,plots:[plot('field','Diffusion field',data,'Position (domain units)','Concentration'),plot('spacetime','Space–time diffusion',[{type:'heatmap',x,y:t,z:rows,colorscale:'Viridis',name:'Concentration'}],'Position','Time')],metrics:{'Spatial nodes':n,'Actual substeps':steps,'Stability substep bound':maxdt,'Mass error':Math.max(...rows.map(r=>Math.abs(sum(r)-sum(rows[0]))))*dx,...(error!==null?{'Analytical max error':error}:{})},warnings:[],animation:{type:'field',time:t,states:rows,x},timeSeries:false};
}
export function fractals(q){const p=q.params,R=rng(q.seed),xs=[],ys=[];
 if(q.method==='mandelbrot'){const n=p.resolution,x=linspace(-2.2,.8,n),y=linspace(-1.3,1.3,n),iterations=Math.max(30,Math.round(p.points/50)),z=y.map(ci=>x.map(cr=>{let a=0,b=0,k=0;while(k<iterations&&a*a+b*b<=4){[a,b]=[a*a-b*b+cr,2*a*b+ci];k++;}return k;}));return{columns:['real','imaginary','escape_iterations'],rows:y.flatMap((v,j)=>x.map((u,i)=>[u,v,z[j][i]])),plots:[plot('fractal','Mandelbrot escape-time computation',[{type:'heatmap',x,y,z,colorscale:'Cividis',colorbar:{title:{text:'Iterations'}},name:'Escape time'}],'Real(c)','Imaginary(c)',{yaxis:{scaleanchor:'x'}})],metrics:{'Grid points':n*n,'Iteration limit':iterations},warnings:['Interior-colored points are nonescaping within this finite iteration limit, not a proof of set membership.'],timeSeries:false};}
 let x=0,y=0;for(let i=0;i<p.points+30;i++){if(q.method==='triangle'){const v=Math.floor(R()*3),vertices=[[0,0],[1,0],[.5,Math.sqrt(3)/2]];x=(x+vertices[v][0])/2;y=(y+vertices[v][1])/2;}else{const u=R();[x,y]=u<.01?[0,.16*y]:u<.86?[.85*x+.04*y,-.04*x+.85*y+1.6]:u<.93?[.2*x-.26*y,.23*x+.22*y+1.6]:[-.15*x+.28*y,.26*x+.24*y+.44];}if(i>=30){xs.push(x);ys.push(y);}}
 return{columns:['x','y'],rows:xs.map((v,i)=>[v,ys[i]]),plots:[plot('fractal',q.method==='triangle'?'Sierpiński chaos game':'Barnsley affine iterated function system',[{type:'scatter',mode:'markers',x:xs,y:ys,marker:{size:1.2,opacity:.6},name:'Computed points'}],'x','y',{yaxis:{scaleanchor:'x'}})],metrics:{'Computed points':xs.length,'Discarded burn-in':30,'Seed':q.seed},warnings:[],timeSeries:false,progressivePoints:true};}
