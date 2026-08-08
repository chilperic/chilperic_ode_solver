
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const PCA = window.FokoPCA;
  const PLOT = window.FokoPlotLifecycle;
  if (!PLOT) throw new Error('SciML Lab requires FokoPlotLifecycle.');
  const COLORS = ['#00A7A7','#155EEF','#145374','#0B1D3D','#2F855A','#FF7A1A','#64748B'];

  const EXAMPLES = {
    logistic:{title:'SINDy logistic discovery',atlas:'SciML Atlas · teaching ODE',native:'workbench.html?model=logistic',vars:['x'],params:{r:1,K:10},x0:[0.7],rhs:(x,p)=>[p.r*x[0]*(1-x[0]/p.K)],truth:['r*x - (r/K)*x^2'],desc:'Compact growth system for checking whether sparse regression recovers a readable governing equation.',phase:['x'],defaults:{points:180,dt:0.05,threshold:0.03,ridge:0.0001,noise:0}},
    lotka:{title:'Lotka–Volterra from data',atlas:'Model Atlas · ODE + SciML',native:'workbench.html?model=lotka',vars:['N','P'],params:{a:1,b:0.12,c:0.075,d:1.5},x0:[12,6],rhs:(x,p)=>[p.a*x[0]-p.b*x[0]*x[1],p.c*x[0]*x[1]-p.d*x[1]],truth:['a*N - b*N*P','c*N*P - d*P'],desc:'Predator–prey data with interaction terms, phase geometry and identifiable sparse structure.',phase:['N','P'],defaults:{points:240,dt:0.035,threshold:0.04,ridge:0.0001,noise:0}},
    vanderpol:{title:'Van der Pol sparse dynamics',atlas:'Model Atlas · nonlinear oscillator',native:'workbench.html?model=vanderpol',vars:['x','y'],params:{mu:1},x0:[2,0],rhs:(x,p)=>[x[1],p.mu*(1-x[0]*x[0])*x[1]-x[0]],truth:['y','mu*y - x - mu*x^2*y'],desc:'Nonlinear oscillator that needs richer terms. Enable cubic terms to expose the full sparse mechanism.',phase:['x','y'],defaults:{points:260,dt:0.035,threshold:0.05,ridge:0.0001,noise:0}},
    sir:{title:'SIR inverse parameter identification',atlas:'Model Atlas · epidemic systems',native:'workbench.html?model=sir',vars:['S','I','R'],params:{beta:0.35,gamma:0.1},x0:[0.99,0.01,0],rhs:(x,p)=>[-p.beta*x[0]*x[1],p.beta*x[0]*x[1]-p.gamma*x[1],p.gamma*x[1]],truth:['-beta*S*I','beta*S*I - gamma*I','gamma*I'],desc:'Epidemic trajectories for equation discovery, inverse calibration and residual diagnostics. Use 2D or 3D phase portraits with user-chosen state variables.',phase:['S','I','R'],defaults:{points:220,dt:0.08,threshold:0.015,ridge:0.0001,noise:0}},
    seir:{title:'SEIR outbreak structure and calibration',atlas:'SciML Atlas · epidemic systems',native:'examples.html#sciml-atlas',vars:['S','E','I','R'],params:{beta:0.85,sigma:0.35,gamma:0.16},x0:[0.995,0.003,0.002,0],rhs:(x,p)=>[-p.beta*x[0]*x[2],p.beta*x[0]*x[2]-p.sigma*x[1],p.sigma*x[1]-p.gamma*x[2],p.gamma*x[2]],truth:['-beta*S*I','beta*S*I - sigma*E','sigma*E - gamma*I','gamma*I'],desc:'A higher-dimensional epidemic example. Compare inverse fitting and phase-space structure using selectable 2D and 3D portraits.',phase:['S','E','I'],defaults:{points:260,dt:0.06,threshold:0.015,ridge:0.0001,noise:0}},
    michaelis:{title:'Michaelis–Menten inverse kinetics',atlas:'SciML Atlas · enzyme kinetics',native:'workbench.html?model=michaelis',vars:['S','P'],params:{Vmax:1.2,Km:0.7},x0:[8,0],rhs:(x,p)=>{const v=p.Vmax*x[0]/(p.Km+x[0]); return [-v,v];},truth:['-Vmax*S/(Km+S)','Vmax*S/(Km+S)'],desc:'Biochemical kinetics example for inverse parameter identification. Use it mainly for calibration, surrogate diagnostics and export.',phase:['S','P'],defaults:{points:200,dt:0.045,threshold:0.02,ridge:0.0002,noise:0}},
    toggle:{title:'Genetic toggle switch',atlas:'SciML Atlas · genetic network',native:'examples.html#sciml-atlas',vars:['A','B'],params:{alpha1:3.2,alpha2:3.0,n:2,d1:1,d2:1},x0:[0.3,2.2],rhs:(x,p)=>[p.alpha1/(1+Math.pow(x[1],p.n))-p.d1*x[0],p.alpha2/(1+Math.pow(x[0],p.n))-p.d2*x[1]],truth:['alpha1/(1+B^n)-d1*A','alpha2/(1+A^n)-d2*B'],desc:'Regulatory-network example for biological SciML, residual diagnostics and graph/network export scaffolds.',phase:['A','B'],defaults:{points:240,dt:0.035,threshold:0.025,ridge:0.0002,noise:0}},
    lorenz:{title:'Lorenz surrogate stress test',atlas:'Model Atlas · chaotic dynamics',native:'workbench.html?model=lorenz',vars:['x','y','z'],params:{sigma:10,rho:28,beta:2.6666667},x0:[1,1,1],rhs:(x,p)=>[p.sigma*(x[1]-x[0]),x[0]*(p.rho-x[2])-x[1],x[0]*x[1]-p.beta*x[2]],truth:['sigma*(y-x)','x*(rho-z)-y','x*y-beta*z'],desc:'Chaotic system for surrogate-model validation. Short horizons, residual maps and 3D phase portraits are the informative diagnostics.',phase:['x','y','z'],defaults:{points:420,dt:0.01,threshold:0.08,ridge:0.0005,noise:0}},
    heat1d:{title:'1D heat-equation surrogate',atlas:'SciML Atlas · discretized PDE',native:'examples.html#sciml-atlas',vars:['u1','u2','u3','u4','u5'],params:{alpha:0.7},x0:[0.1,0.8,1.4,0.8,0.1],rhs:(x,p)=>x.map((u,i)=>{const L=i?x[i-1]:0, R=i<x.length-1?x[i+1]:0; return p.alpha*(L-2*u+R);}),truth:['alpha*(u_{i-1}-2u_i+u_{i+1})'],desc:'Method-of-lines PDE surrogate example. Use heatmaps, residuals and field diagnostics rather than low-dimensional phase plots.',phase:['u1','u3','u5'],defaults:{points:220,dt:0.025,threshold:0.015,ridge:0.0001,noise:0}},
    chemostat:{title:'Chemostat growth calibration',atlas:'SciML Atlas · bioprocess model',native:'examples.html#sciml-atlas',vars:['S','X'],params:{D:0.25,Sin:10,mumax:1.1,Ks:0.8,Y:0.55},x0:[8,0.15],rhs:(x,p)=>{const mu=p.mumax*x[0]/(p.Ks+x[0]); return [p.D*(p.Sin-x[0])-(1/p.Y)*mu*x[1],(mu-p.D)*x[1]];},truth:['D*(Sin-S)-mu(S)*X/Y','(mu(S)-D)*X'],desc:'Process-modeling example for parameter identification and surrogate acceleration in biological engineering.',phase:['S','X'],defaults:{points:240,dt:0.04,threshold:0.02,ridge:0.0002,noise:0}},
    allee:{title:'Allee-effect population model',atlas:'SciML Atlas · ecology',native:'examples.html#sciml-atlas',vars:['x'],params:{r:1,K:10,A:2},x0:[2.6],rhs:(x,p)=>[p.r*x[0]*(1-x[0]/p.K)*(x[0]/p.A-1)],truth:['r*x*(1-x/K)*(x/A-1)'],desc:'Nonlinear ecological growth example for distinguishing logistic and threshold dynamics.',phase:['x'],defaults:{points:220,dt:0.04,threshold:0.025,ridge:0.0001,noise:0}},
    protein_design:{title:'De novo protein structure and function',atlas:'SciML Atlas · biological design',native:'examples.html#sciml-atlas',vars:['Fold','Bind','Stable'],params:{kf:0.7,kb:0.45,ks:0.35,c1:0.18,c2:0.12},x0:[0.12,0.08,0.05],rhs:(x,p)=>[p.kf*(1-x[0]) - p.c1*x[0]*x[1], p.kb*x[0]*(1-x[1]) - p.c2*x[1]*(1-x[2]), p.ks*x[1]*(1-x[2]) - 0.08*x[2]],truth:['kf*(1-Fold)-c1*Fold*Bind','kb*Fold*(1-Bind)-c2*Bind*(1-Stable)','ks*Bind*(1-Stable)-0.08*Stable'],desc:'Synthetic protein-design scaffold: latent folding, binding and stability coordinates with surrogate-style diagnostics and export hooks.',phase:['Fold','Bind','Stable'],defaults:{points:220,dt:0.04,threshold:0.02,ridge:0.0002,noise:0.001}},
    signaling:{title:'Dynamic cell signaling network',atlas:'SciML Atlas · signaling biology',native:'examples.html#sciml-atlas',vars:['MAPK','NFkB','IκB'],params:{a1:1.4,a2:0.9,a3:0.8,d1:0.7,d2:0.5,d3:0.35,c1:0.55,c2:0.4},x0:[0.15,0.1,0.85],rhs:(x,p)=>[p.a1*(1-x[0])*(0.4+x[1]) - p.d1*x[0], p.a2*x[0]*(1-x[1]) - p.d2*x[1]*x[2], p.a3*(1-x[1]) - p.d3*x[2]],truth:['a1*(1-MAPK)*(0.4+NFkB)-d1*MAPK','a2*MAPK*(1-NFkB)-d2*NFkB*IκB','a3*(1-NFkB)-d3*IκB'],desc:'Toy MAPK/NF-κB-style signaling network for learning unknown kinetic structure from time-series data.',phase:['MAPK','NFkB','IκB'],defaults:{points:260,dt:0.03,threshold:0.02,ridge:0.0002,noise:0.002}},
    metabolic_stress:{title:'Metabolic shifts under stress',atlas:'SciML Atlas · metabolism',native:'examples.html#sciml-atlas',vars:['O2','ATP','Lactate'],params:{ko:0.12,katp:0.9,kl:0.6,kc:0.22,stress:1.25},x0:[1,0.72,0.08],rhs:(x,p)=>[-p.ko*p.stress*x[0], p.katp*x[0]*(1-x[1]) - p.kc*x[1], p.kl*(1-x[0]) - 0.2*x[2]],truth:['-ko*stress*O2','katp*O2*(1-ATP)-kc*ATP','kl*(1-O2)-0.2*Lactate'],desc:'Metabolic rewiring under nutrient or oxygen limitation: oxygen depletion, ATP adaptation and lactate buildup.',phase:['O2','ATP','Lactate'],defaults:{points:240,dt:0.04,threshold:0.02,ridge:0.0002,noise:0.001}},
    gene_knockout:{title:'In silico gene knockout screening',atlas:'SciML Atlas · functional genomics',native:'examples.html#sciml-atlas',vars:['Target','Backup','Fitness'],params:{koff:0.95,comp:0.75,cost:0.22,recovery:0.55},x0:[1,0.15,1],rhs:(x,p)=>[-p.koff*x[0], p.comp*(1-x[1])*(1-x[0]) - 0.18*x[1], p.recovery*x[1] - p.cost*(1-x[0]) - 0.1*(1-x[2])],truth:['-koff*Target','comp*(1-Backup)*(1-Target)-0.18*Backup','recovery*Backup-cost*(1-Target)-0.1*(1-Fitness)'],desc:'Gene-deletion scaffold with compensation and fitness loss. Useful for inverse fitting and synthetic-lethality style reasoning.',phase:['Target','Backup','Fitness'],defaults:{points:220,dt:0.04,threshold:0.02,ridge:0.0002,noise:0.001}},
    tumor_microenv:{title:'Spatial tumor microenvironment',atlas:'SciML Atlas · tumor ecology',native:'examples.html#sciml-atlas',vars:['Tumor','Immune','Nutrient'],params:{rt:0.7,kill:0.48,ri:0.55,decay:0.28,supply:0.9,use:0.6},x0:[0.25,0.18,0.95],rhs:(x,p)=>[p.rt*x[0]*x[2] - p.kill*x[0]*x[1], p.ri*x[1]*x[0] - p.decay*x[1], p.supply*(1-x[2]) - p.use*x[0]*x[2]],truth:['rt*Tumor*Nutrient-kill*Tumor*Immune','ri*Immune*Tumor-decay*Immune','supply*(1-Nutrient)-use*Tumor*Nutrient'],desc:'Tumor–immune–nutrient interaction model: a reduced microenvironment scaffold with interpretable state competition.',phase:['Tumor','Immune','Nutrient'],defaults:{points:260,dt:0.03,threshold:0.02,ridge:0.0002,noise:0.002}},
    drug_penetration:{title:'Tissue-scale drug penetration',atlas:'SciML Atlas · drug transport',native:'examples.html#sciml-atlas',vars:['d1','d2','d3','d4','d5','d6'],params:{diff:0.62,decay:0.08,input:1.2},x0:[1,0.55,0.24,0.1,0.04,0.01],rhs:(x,p)=>x.map((u,i)=>{const L=i?x[i-1]:p.input, R=i<x.length-1?x[i+1]:0; return p.diff*(L-2*u+R)-p.decay*u;}),truth:['diff*(d_{i-1}-2d_i+d_{i+1})-decay*d_i'],desc:'Tissue drug-gradient scaffold with diffusion and decay. Use heatmaps and residual maps; phase portraits can compare selected tissue locations.',phase:['d1','d3','d6'],defaults:{points:260,dt:0.03,threshold:0.015,ridge:0.0001,noise:0.001}},
    drug_schedule:{title:'Multi-drug combination scheduling',atlas:'SciML Atlas · therapy optimization',native:'examples.html#sciml-atlas',vars:['Sensitive','Resistant','Drug'],params:{gs:0.52,gr:0.32,kill:0.85,adapt:0.18,clear:0.55,dose:0.72},x0:[0.78,0.08,0.15],rhs:(x,p)=>[p.gs*x[0]*(1-x[0]-x[1]) - p.kill*x[2]*x[0], p.gr*x[1]*(1-x[0]-x[1]) + p.adapt*x[2]*x[0] - 0.2*x[1], p.dose*(0.6+0.4*Math.sin(0.2*x[0]+0.5)) - p.clear*x[2]],truth:['gs*S*(1-S-R)-kill*Drug*S','gr*R*(1-S-R)+adapt*Drug*S-0.2*R','dose*u(t)-clear*Drug'],desc:'Treatment scheduling scaffold with sensitive and resistant populations plus a controllable drug state.',phase:['Sensitive','Resistant','Drug'],defaults:{points:280,dt:0.035,threshold:0.02,ridge:0.0002,noise:0.001}},
    virtual_patients:{title:'Virtual patient stratification',atlas:'SciML Atlas · digital twins',native:'examples.html#sciml-atlas',vars:['Responder','NonResponder','Biomarker'],params:{rr:0.38,rn:0.42,effect:0.55,bgain:0.4},x0:[0.16,0.28,0.35],rhs:(x,p)=>[p.rr*x[0]*(1-x[0]) + p.effect*x[2]*(1-x[0]), p.rn*x[1]*(1-x[1]) - 0.18*x[2]*x[1], p.bgain*(x[0]-x[1]) - 0.15*x[2]],truth:['rr*Responder*(1-Responder)+effect*Biomarker*(1-Responder)','rn*NonResponder*(1-NonResponder)-0.18*Biomarker*NonResponder','bgain*(Responder-NonResponder)-0.15*Biomarker'],desc:'Digital-twin scaffold for patient stratification. Useful for clustering-inspired surrogate diagnostics and interpretable latent-state plots.',phase:['Responder','NonResponder','Biomarker'],defaults:{points:220,dt:0.05,threshold:0.02,ridge:0.0002,noise:0.002}},
    allosteric:{title:'Allosteric regulation mechanisms',atlas:'SciML Atlas · structural biology',native:'examples.html#sciml-atlas',vars:['Open','Closed','Bound'],params:{kop:0.75,kcl:0.42,kbind:0.48,kunbind:0.14},x0:[0.6,0.35,0.05],rhs:(x,p)=>[-p.kcl*x[0] + p.kop*x[1] - p.kbind*x[0]*(1-x[2]), p.kcl*x[0] - p.kop*x[1] + p.kunbind*x[2], p.kbind*x[0]*(1-x[2]) - p.kunbind*x[2]],truth:['-kcl*Open+kop*Closed-kbind*Open*(1-Bound)','kcl*Open-kop*Closed+kunbind*Bound','kbind*Open*(1-Bound)-kunbind*Bound'],desc:'Conformational-switching scaffold for allostery: open, closed and ligand-bound states with interpretable transitions.',phase:['Open','Closed','Bound'],defaults:{points:240,dt:0.035,threshold:0.02,ridge:0.0002,noise:0.001}},
    microbiome:{title:'Microbial community dynamics',atlas:'SciML Atlas · microbial ecology',native:'examples.html#sciml-atlas',vars:['B1','B2','B3'],params:{r1:0.8,r2:0.6,r3:0.72,a12:0.22,a13:0.15,a21:0.18,a23:0.2,a31:0.16,a32:0.12},x0:[0.22,0.18,0.1],rhs:(x,p)=>[
      p.r1*x[0]*(1-x[0]-p.a12*x[1]-p.a13*x[2]),
      p.r2*x[1]*(1-p.a21*x[0]-x[1]-p.a23*x[2]),
      p.r3*x[2]*(1-p.a31*x[0]-p.a32*x[1]-x[2])],truth:['r1*B1*(1-B1-a12*B2-a13*B3)','r2*B2*(1-a21*B1-B2-a23*B3)','r3*B3*(1-a31*B1-a32*B2-B3)'],desc:'Generalized Lotka–Volterra microbiome scaffold for competition, coexistence and stability diagnostics.',phase:['B1','B2','B3'],defaults:{points:280,dt:0.03,threshold:0.02,ridge:0.0002,noise:0.001}}
  };

  Object.assign(EXAMPLES, {
    fluid_pinn:{title:'Fluid dynamics PINN export scaffold',atlas:'SciML Atlas · physics-informed export',native:'examples.html#sciml-atlas',vars:['u','v','p'],params:{nu:0.01,forcing:1.0},x0:[0.25,0.08,0.02],rhs:(x,p)=>[p.forcing*x[1]-p.nu*x[0],-0.4*x[0]*x[1]-p.nu*x[1],0.35*x[0]-0.18*x[2]],truth:['u_t + u u_x = -p_x + nu\Delta u','v_t + u v_x = -p_y + nu\Delta v','\nabla\cdot u = 0'],desc:'Physics-informed Navier–Stokes scaffold. The browser computes reduced residual diagnostics and exports the training workflow; it does not train a PINN locally.',phase:['u','v','p'],defaults:{points:240,dt:0.025,threshold:0.02,ridge:0.0002,noise:0.002}},
    aerospace_sindy:{title:'Aerospace SINDy Discovery',atlas:'SciML Atlas · wing-rock flutter',native:'examples.html#sciml-atlas',vars:['roll','yaw','rate'],params:{a:0.7,b:0.28,c:1.3},x0:[0.3,0.1,0.2],rhs:(x,p)=>[x[2],-p.a*x[0]+p.b*x[0]**3+0.2*x[1],-p.c*x[2]+x[0]*x[1]],truth:['rate','-a*roll+b*roll^3+0.2*yaw','-c*rate+roll*yaw'],desc:'Sparse discovery of nonlinear aircraft wing-rock dynamics from high-frequency telemetry.',phase:['roll','yaw','rate'],defaults:{points:280,dt:0.025,threshold:0.035,ridge:0.0002,noise:0.001}},
    battery_neural_ode:{title:'Lithium-ion battery surrogate scaffold',atlas:'SciML Atlas · Neural ODE export',native:'examples.html#sciml-atlas',vars:['SOC','Temp','Voltage'],params:{k:0.25,heat:0.18,cool:0.08},x0:[1,0.22,0.95],rhs:(x,p)=>[-p.k*(0.5+0.5*x[1])*x[0],p.heat*(1-x[0])-p.cool*x[1],-0.15*(1-x[0])-0.05*x[1]],truth:['exported Neural ODE surrogate for cell solver','thermal coupling','voltage response'],desc:'Battery surrogate scaffold for EV diagnostics. Browser plots inspect synthetic trajectories and residuals; Neural ODE training is exported.',phase:['SOC','Temp','Voltage'],defaults:{points:240,dt:0.035,threshold:0.02,ridge:0.0002,noise:0.001}},
    structural_fno:{title:'Structural operator-learning export scaffold',atlas:'SciML Atlas · neural-operator export',native:'examples.html#sciml-atlas',vars:['stress_x','stress_y','strain'],params:{E:2.1,damp:0.12},x0:[0.1,0.08,0.02],rhs:(x,p)=>[p.E*x[2]-p.damp*x[0],0.65*p.E*x[2]-p.damp*x[1],0.18-0.25*x[2]],truth:['exported neural operator maps geometry to stress fields'],desc:'Operator-learning scaffold for stress-strain fields. Browser diagnostics are reduced-order checks; FNO-style training is exported.',phase:['stress_x','stress_y','strain'],defaults:{points:220,dt:0.04,threshold:0.02,ridge:0.0002,noise:0.001}},
    seismic_inverse:{title:'Seismic Inverse Imaging',atlas:'SciML Atlas · wave inverse problem',native:'examples.html#sciml-atlas',vars:['wave','reflect','density'],params:{c:1.1,atten:0.18},x0:[0.4,0.15,0.55],rhs:(x,p)=>[p.c*x[1]-p.atten*x[0],-0.4*x[0]+0.2*x[2],0.08*x[1]-0.05*x[2]],truth:['wave-equation inversion for density map'],desc:'Wave-equation inverse scaffold for reconstructing reservoir density from acoustic reflections.',phase:['wave','reflect','density'],defaults:{points:220,dt:0.035,threshold:0.02,ridge:0.0002,noise:0.002}},
    drone_gpr:{title:'Small-Data Drone Failure Baselines',atlas:'SciML Atlas · Gaussian process baseline',native:'examples.html#sciml-atlas',vars:['lift','drag','angle'],params:{stall:0.7,noise:0.12},x0:[0.5,0.12,0.2],rhs:(x,p)=>[0.35*x[2]-p.stall*x[1],0.12*x[2]*x[2]-0.1*x[1],0.02-0.03*x[2]],truth:['GPR uncertainty from 25 wind-tunnel runs'],desc:'Low-data GPR scaffold for drone lift-drag failure boundaries with uncertainty ribbons.',phase:['lift','drag','angle'],defaults:{points:80,dt:0.08,threshold:0.025,ridge:0.0002,noise:0.003}},
    biomedical_deeponet:{title:'Biomedical DeepONet export scaffold',atlas:'SciML Atlas · DeepONet surrogate',native:'examples.html#sciml-atlas',vars:['infusion','central','peripheral'],params:{clear:0.22,transfer:0.18},x0:[0.55,0.08,0.02],rhs:(x,p)=>[-0.05*x[0],x[0]-p.clear*x[1]-p.transfer*(x[1]-x[2]),p.transfer*(x[1]-x[2])-0.08*x[2]],truth:['exported operator model maps infusion function to concentration curve'],desc:'DeepONet-style pharmacokinetic scaffold. Browser diagnostics use reduced trajectories; operator training is exported.',phase:['infusion','central','peripheral'],defaults:{points:240,dt:0.04,threshold:0.02,ridge:0.0002,noise:0.001}},
    climate_sindy:{title:'Climate System Equation Discovery',atlas:'SciML Atlas · climate SINDy',native:'examples.html#sciml-atlas',vars:['ocean','atmos','flux'],params:{k1:0.18,k2:0.12,forcing:0.45},x0:[0.4,0.32,0.08],rhs:(x,p)=>[p.k1*(x[1]-x[0])+0.05*x[2],p.k2*(x[0]-x[1])+p.forcing-0.1*x[1],0.3*(x[0]-x[1])-0.18*x[2]],truth:['ocean-atmosphere thermal exchange'],desc:'Sparse climate-equation discovery from noisy satellite-like thermal exchange signals.',phase:['ocean','atmos','flux'],defaults:{points:260,dt:0.05,threshold:0.02,ridge:0.0002,noise:0.002}},
    superconductor_inverse:{title:'Superconductor Inverse Design',atlas:'SciML Atlas · inverse materials design',native:'examples.html#sciml-atlas',vars:['doping','spacing','bandgap'],params:{target:1.8,relax:0.2},x0:[0.25,0.45,0.75],rhs:(x,p)=>[0.12*(p.target-x[2])-p.relax*x[0],0.08*x[0]-0.05*x[1],0.55*x[0]+0.35*x[1]-0.22*x[2]],truth:['inverse design for target bandgap'],desc:'Inverse design scaffold for doping ratios and crystal spacing that target electronic bandgap.',phase:['doping','spacing','bandgap'],defaults:{points:220,dt:0.04,threshold:0.02,ridge:0.0002,noise:0.001}},
    acoustic_metamaterials:{title:'Acoustic Wave Metamaterials',atlas:'SciML Atlas · physics-guided encoder-decoder',native:'examples.html#sciml-atlas',vars:['porosity','resonance','attenuation'],params:{drive:0.6,damp:0.16},x0:[0.35,0.22,0.12],rhs:(x,p)=>[0.08*(1-x[0])-0.03*x[1],p.drive*x[0]-p.damp*x[1],0.52*x[1]-0.12*x[2]],truth:['physics-guided geometry-to-attenuation surrogate'],desc:'Physics-guided surrogate for optimizing sub-wavelength acoustic insulation geometries.',phase:['porosity','resonance','attenuation'],defaults:{points:220,dt:0.04,threshold:0.02,ridge:0.0002,noise:0.001}}
  });
  const EXPORT_ONLY = new Set(['assimilation','pinn','operator','network']);
  const APPROACH = {
    sindy:'Equation discovery / SINDy: construct candidate terms, estimate derivatives and recover readable ODEs by sparse thresholded least squares.',
    surrogate:'Surrogate modeling: validate a fast emulator against a reference simulation with predicted-vs-reference, error and cross-validation diagnostics.',
    inverse:'Inverse problem: identify hidden parameters in a known differential-equation structure using sparse observations and residual analysis.',
    assimilation:'Data assimilation: blend model forecast and noisy observations, then inspect innovations, residuals and correction behavior.',
    pinn:'PINN export: configure physics-loss training outside the browser and inspect only the diagnostics computed from the current reduced model.',
    operator:'Neural operator export: generate a field-to-field surrogate scaffold and validation protocol; no browser-side neural-operator training is claimed.',
    network:'Biological network ML: export graph/omics scaffolds while keeping links to mechanistic pathway interpretation.'
  };

  const PLOT_META = {
    reference_trajectory:{label:'Reference trajectory only',evidence:'The selected atlas trajectory or uploaded data. For export-only workflows this is input evidence, not a trained neural-model output.'},
    trajectory:{label:'Trajectory / observations',evidence:'The trajectory used by the browser computation. Synthetic examples are generated from the displayed reduced model; uploaded CSV remains user-provided evidence.'},
    derivative:{label:'SINDy derivative fit',evidence:'Finite-difference derivative estimates compared with derivatives reconstructed from the sparse coefficient matrix.'},
    predicted:{label:'SINDy predicted vs derivative',evidence:'A pointwise comparison between estimated derivatives and the sparse model prediction. Agreement is conditional on derivative estimation and the candidate library.'},
    residual_time:{label:'SINDy residuals over time',evidence:'Signed derivative residuals through time. Structure indicates model, library, noise or derivative-estimation mismatch.'},
    residual_hist:{label:'SINDy residual distribution',evidence:'Empirical derivative residuals. A narrow histogram is not proof of mechanistic correctness.'},
    error_heatmap:{label:'SINDy residual heatmap',evidence:'Absolute computed residual by time and state. This is not a PDE residual unless the supplied model and computation actually define one.'},
    pareto:{label:'SINDy sparsity–error sweep',evidence:'A real STLSQ refit across thresholds, reporting active terms and fit RMSE. The highlighted knee is a heuristic model-selection aid.'},
    coefficients:{label:'Sparse coefficient spectrum',evidence:'Nonzero coefficients from the current SINDy fit. Coefficient magnitude depends on scaling and does not by itself establish causal importance.'},
    library_heatmap:{label:'Candidate-library correlation',evidence:'Pairwise correlations among evaluated candidate terms. Strong correlation warns of coefficient non-identifiability.'},
    phase2d:{label:'2D state-space trajectory',evidence:'A projection of the observed trajectory onto two selected states. Projection geometry can hide higher-dimensional structure.'},
    phase3d:{label:'3D state-space trajectory',evidence:'A three-state projection of the observed trajectory. It is descriptive, not a reconstructed attractor proof.'},
    inverse_fit:{label:'Inverse fitted vs observed',evidence:'Observed trajectories compared with the known model structure simulated at the recovered positive parameters.'},
    inverse_cost:{label:'Inverse optimization history',evidence:'Accepted and rejected Levenberg–Marquardt-style iterations and their residual cost. Convergence does not prove uniqueness or identifiability.'},
    inverse_residual:{label:'Inverse residuals over time',evidence:'Signed fitted-minus-observed residuals from the recovered parameter vector.'},
    surrogate_fit:{label:'Surrogate predicted vs reference',evidence:'A polynomial ridge surrogate fitted on the first 70% of the trajectory and evaluated on all points; the held-out region is marked.'},
    surrogate_residual_time:{label:'Surrogate residuals over time',evidence:'Prediction minus reference for the modeled output. The train/test split is temporal and is not a universal validation design.'},
    surrogate_residual_hist:{label:'Surrogate residual distribution',evidence:'Empirical surrogate errors, with training and held-out errors distinguishable through the reported split metrics.'},
    pca_scores:{label:'Trajectory PCA scores',evidence:'Time points are projected onto the first two standardized principal components of the current state trajectory. This is descriptive input/result geometry, not neural training evidence.'},
    pca_explained:{label:'Trajectory PCA explained variance',evidence:'Variance fractions summarize the standardized state trajectory. They are sample- and scaling-dependent and do not identify mechanisms.'},
    pca_loadings:{label:'Trajectory PCA loadings',evidence:'Loadings show linear directions across state variables. Sign is arbitrary and magnitude is not causal importance.'}
  };
  window.FokoSciMLExamples = EXAMPLES;
  window.FokoSciMLPlotMeta = PLOT_META;

  const WORKFLOW_PLOTS = {
    sindy:['trajectory','pareto','coefficients','derivative','predicted','residual_time','residual_hist','error_heatmap','library_heatmap','phase2d','phase3d'],
    inverse:['inverse_fit','inverse_cost','inverse_residual'],
    surrogate:['surrogate_fit','surrogate_residual_time','surrogate_residual_hist'],
    assimilation:['reference_trajectory'],
    pinn:['reference_trajectory'],
    operator:['reference_trajectory'],
    network:['reference_trajectory']
  };
  const STORAGE_KEY='fokolab:v72:sciml-session';
  const LAYOUT_KEY='fokolab:v72:sciml-layout';
  const PLOT_SIDES=['left','right'];
  const SIDE_IDS={left:['sciPlot','sciPlotType','sciPlotLabel','sciPlotEvidence'],right:['sciPlot2','sciPlotType2','sciPlotLabel2','sciPlotEvidence2']};
  const LAYOUTS=new Set(['two','focus']);

  let DATA=null, MODEL=null, ANALYSIS=null;
  const VIEW={layout:'two',focusSide:'left',plotTypes:{left:'',right:''}};

  function n(id,fb){ const v=Number($(id)?.value); return Number.isFinite(v)?v:fb; }
  function set(id,val){ const el=$(id); if(el)el.value=String(val); }
  function ex(){ return EXAMPLES[$('sciExample')?.value] || EXAMPLES.logistic; }
  function approach(){ return $('sciApproach')?.value || 'sindy'; }

  function activeVars(){ return (DATA && DATA.vars && DATA.vars.length) ? DATA.vars.slice() : ex().vars.slice(); }
  function refreshPhaseSelectors(){
    const vars = activeVars();
    const ids = ['sciPhaseX','sciPhaseY','sciPhaseZ'];
    ids.forEach((id,idx)=>{
      const sel = $(id); if(!sel) return;
      const current = sel.value;
      sel.innerHTML = vars.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
      const pref = (ex().phase && ex().phase[idx]) || vars[Math.min(idx, vars.length-1)] || '';
      sel.value = vars.includes(current) ? current : pref;
      if(!sel.value && vars.length) sel.value = vars[Math.min(idx, vars.length-1)];
      sel.disabled = vars.length === 0 || (id==='sciPhaseZ' && vars.length < 3);
    });
  }
  function phaseIndices(){
    const vars = activeVars();
    const pick = id => Math.max(0, vars.indexOf($(id)?.value || vars[0] || ''));
    return {vars, ix:pick('sciPhaseX'), iy:pick('sciPhaseY'), iz:pick('sciPhaseZ')};
  }
  function layout3d(title,x,y,z){
    return {title:{text:title,font:{size:15}},margin:{l:0,r:0,t:50,b:0},paper_bgcolor:'rgba(0,0,0,0)',font:{family:'Inter, system-ui, sans-serif',size:12},scene:{xaxis:{title:x},yaxis:{title:y},zaxis:{title:z},bgcolor:'rgba(0,0,0,0)'}};
  }
  function status(msg,bad=false){ const el=$('sciStatus'); if(el){el.textContent=msg;el.classList.toggle('bad',bad);} if($('sciTopStatus')){$('sciTopStatus').textContent=bad?'Failed':msg.startsWith('Ready')?'Ready':msg.includes('export')?'Export only':'Computed';} }
  function hasMath(){ return !!(window.math && math.lusolve); }
  function seededRandom(seed){ let a=(Number(seed)>>>0)||1; return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  function randn(random){ let u=0,v=0; while(!u)u=random(); while(!v)v=random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
  function coreOdeStep(x,t,dt,f,p){
    if(!window.FokoODECore || typeof window.FokoODECore.fixedStep!=='function') throw new Error('Canonical ODE core is unavailable.');
    return window.FokoODECore.fixedStep(function(time,state,params){ return f(state,params,time); },'rk4',t,x,dt,p).y;
  }

  function numberAttr(v){ return Number.isFinite(Number(v)) ? String(Number(v)) : '0'; }
  function paramRangeDefault(value){
    const v=Number(value); const span=Math.max(1e-6, Math.abs(v)||1);
    return {min:v>=0?0:v-2*span, max:v>=0?v+2*span:v+2*span};
  }
  function populateModelInputs(){
    const e=ex();
    const stateBox=$('sciInitialEditor'), paramBox=$('sciParamEditor');
    if(stateBox){
      stateBox.innerHTML=e.vars.map((v,i)=>`<label><span>${esc(v)}₀</span><input class="sci-x0" data-var="${esc(v)}" type="number" step="any" value="${numberAttr(e.x0[i] ?? 0)}"></label>`).join('');
    }
    if(paramBox){
      paramBox.innerHTML=Object.entries(e.params||{}).map(([k,v])=>{
        const r=paramRangeDefault(v);
        return `<div class="sci-param-row" data-param="${esc(k)}"><label><span>${esc(k)}</span><input class="sci-param-value" type="number" step="any" value="${numberAttr(v)}"></label><label><span>min</span><input class="sci-param-min" type="number" step="any" value="${numberAttr(r.min)}"></label><label><span>max</span><input class="sci-param-max" type="number" step="any" value="${numberAttr(r.max)}"></label></div>`;
      }).join('') || '<p class="sciml-note">No parameters declared for this example.</p>';
    }
  }
  function readModelInputs(){
    const e=ex();
    const x0=Array.from(document.querySelectorAll('.sci-x0')).map((el,i)=>{
      const v=Number(el.value); return Number.isFinite(v)?v:(e.x0[i]??0);
    });
    const params={}; const ranges={};
    document.querySelectorAll('.sci-param-row').forEach(row=>{
      const key=row.dataset.param;
      const val=Number(row.querySelector('.sci-param-value')?.value);
      const min=Number(row.querySelector('.sci-param-min')?.value);
      const max=Number(row.querySelector('.sci-param-max')?.value);
      params[key]=Number.isFinite(val)?val:Number(e.params?.[key]||0);
      ranges[key]={min:Number.isFinite(min)?min:paramRangeDefault(params[key]).min, max:Number.isFinite(max)?max:paramRangeDefault(params[key]).max};
      if(ranges[key].max < ranges[key].min){ const tmp=ranges[key].min; ranges[key].min=ranges[key].max; ranges[key].max=tmp; }
    });
    return {x0:x0.length?x0:e.x0.slice(), params:Object.keys(params).length?params:Object.assign({},e.params), ranges};
  }
  function buildDataFromCurrentInputs(){
    const e=ex(), d=e.defaults||{}, edited=readModelInputs();
    const m=Math.max(30,Math.min(800,Math.round(n('sciPoints',d.points||180)))), dt=Math.max(1e-4,n('sciDt',d.dt||.05)), noise=Math.max(0,n('sciNoise',0));
    const seed=Math.max(0,Math.floor(n('sciSeed',202614)))>>>0, random=seededRandom(seed);
    const t=[], X=[]; let x=edited.x0.slice();
    for(let i=0;i<m;i++){ t.push(i*dt); X.push(x.map(v=>v+noise*randn(random))); x=coreOdeStep(x,i*dt,dt,e.rhs,edited.params).map(v=>Number.isFinite(v)?v:0); }
    DATA={t,vars:e.vars.slice(),X,source:e.title,native:e.native,truth:e.truth.slice(),params:edited.params,paramRanges:edited.ranges,x0:edited.x0,noiseSeed:seed,noiseAmplitude:noise};
    refreshPhaseSelectors();
    $('sciCsv').value=toCsv(DATA);
    MODEL=null; ANALYSIS=null;
    return DATA;
  }
  function applyInputsAndAnalyze(){
    buildDataFromCurrentInputs();
    runAnalysis();
  }
  function updatePhaseControlVisibility(){
    const k=$('sciPlotType')?.value||'trajectory';
    const controls=$('sciPhaseControls');
    if(controls) controls.hidden = !(k==='phase2d' || k==='phase3d');
  }
  function exampleFormula(e){
    const truth=Array.isArray(e.truth)?e.truth:[];
    if(truth.length===e.vars.length){
      return e.vars.map((v,i)=>v+"' = "+truth[i]).join('\n');
    }
    return (e.title||'SciML model')+'\n'+truth.join('\n');
  }

  function loadExampleData(){
    const e=ex(), d=e.defaults||{};
    set('sciPoints',d.points||180); set('sciDt',d.dt||.05); set('sciThreshold',d.threshold||.05); set('sciRidge',d.ridge||.0001); set('sciNoise',d.noise||0); set('sciSeed',d.seed||202614);
    $('sciExampleTitle').textContent=e.title; $('sciAtlasKicker').textContent=e.atlas; describe();
    if($('sciUserModel')){ $('sciUserModel').value=exampleFormula(e); renderUserLatex(); }
    populateModelInputs();
    const data=buildDataFromCurrentInputs();
    renderMath([`\\text{Loaded atlas data: } ${e.vars.join(', ')}`]);
    $('sciDiagnostics').innerHTML='<p>'+esc(e.desc)+'</p>';
    status('Defaults restored. Edit initial conditions or parameters, then apply inputs.');
    updatePhaseControlVisibility();
    configurePlotSelectors();
    updateRunSummary();
  }
  function describe(){
    if($('sciExampleDescription')) $('sciExampleDescription').textContent = ex().desc + ' ' + (APPROACH[approach()]||'');
    configurePlotSelectors();
  }
  function toCsv(data){ return [['t',...data.vars].join(',')].concat(data.t.map((tt,i)=>[tt,...data.X[i]].map(v=>Number(v).toPrecision(9)).join(','))).join('\n'); }
  function parseCsv(){
    const raw=String($('sciCsv')?.value||'').trim(); if(!raw)throw new Error('No CSV data.');
    const lines=raw.split(/\n+/).map(s=>s.trim()).filter(Boolean); if(lines.length<5)throw new Error('CSV needs a header and at least four rows.');
    const head=lines[0].split(',').map(s=>s.trim()).filter(Boolean); if(head.length<2)throw new Error('CSV header must be t plus state variables.');
    const t=[],X=[]; for(let i=1;i<lines.length;i++){ const row=lines[i].split(',').map(s=>Number(s.trim())); if(row.length!==head.length||row.some(v=>!Number.isFinite(v)))throw new Error('Invalid numeric row '+(i+1)); t.push(row[0]); X.push(row.slice(1)); }
    { const edited=readModelInputs(); DATA={t,vars:head.slice(1),X,source:'CSV input',native:ex().native,truth:[],params:edited.params,paramRanges:edited.ranges,x0:edited.x0}; } refreshPhaseSelectors(); return DATA;
  }
  function derivative(data){ const m=data.X.length,d=data.vars.length,out=Array.from({length:m},()=>Array(d).fill(0)); for(let i=0;i<m;i++){ const im=Math.max(0,i-1),ip=Math.min(m-1,i+1),dt=data.t[ip]-data.t[im]; for(let j=0;j<d;j++)out[i][j]=dt?(data.X[ip][j]-data.X[im][j])/dt:0; } return out; }
  function terms(vars){ const a=[], add=(name,fn)=>a.push({name,fn}); if($('libConstant')?.checked)add('1',()=>1); if($('libLinear')?.checked)vars.forEach((v,i)=>add(v,r=>r[i])); if($('libQuadratic')?.checked)vars.forEach((v,i)=>add(v+'^2',r=>r[i]*r[i])); if($('libInteractions')?.checked)for(let i=0;i<vars.length;i++)for(let j=i+1;j<vars.length;j++)add(vars[i]+'*'+vars[j],r=>r[i]*r[j]); if($('libCubic')?.checked)vars.forEach((v,i)=>add(v+'^3',r=>r[i]*r[i]*r[i])); if($('libTrig')?.checked)vars.forEach((v,i)=>{add('sin('+v+')',r=>Math.sin(r[i])); add('cos('+v+')',r=>Math.cos(r[i]));}); if(!a.length)throw new Error('Candidate library is empty.'); return a; }
  function theta(X,T){ return X.map(r=>T.map(t=>t.fn(r))); }
  function tr(A){ return A[0].map((_,j)=>A.map(r=>r[j])); }
  function mm(A,B){ const Bt=tr(B); return A.map(r=>Bt.map(c=>r.reduce((s,v,i)=>s+v*c[i],0))); }
  function mv(A,b){ return A.map(r=>r.reduce((s,v,i)=>s+v*b[i],0)); }
  function lsq(Th,y,ridge){ if(!hasMath())throw new Error('math.js linear algebra unavailable.'); const TT=tr(Th),A=mm(TT,Th),b=mv(TT,y); for(let i=0;i<A.length;i++)A[i][i]+=ridge; const sol=math.lusolve(A,b).valueOf(); return sol.map(v=>Array.isArray(v)?Number(v[0]):Number(v)); }
  // Read the checkbox library spec from the UI toggles.
  function librarySpec(){
    return {
      constant: !!$('libConstant')?.checked,
      linear: !!$('libLinear')?.checked,
      quadratic: !!$('libQuadratic')?.checked,
      interactions: !!$('libInteractions')?.checked,
      cubic: !!$('libCubic')?.checked,
      trig: !!$('libTrig')?.checked
    };
  }
  // Run discovery via the shared, unit-tested engine (window.FokoSINDy) and adapt
  // its result to the MODEL shape the rest of this lab consumes:
  //   {vars, terms:[{name,fn}], theta, xdot, coeff:[perVar][perFeat], data, threshold, ridge}
  function runSindy(data){
    assert(window.FokoSINDy, 'SINDy engine (sindy.js) not loaded.');
    const spec = librarySpec();
    const lam = Math.max(0, n('sciThreshold',.05));
    const ridge = Math.max(0, n('sciRidge',1e-4));
    const its = Math.max(1, Math.min(20, Math.round(n('sciIterations',10))));
    const res = window.FokoSINDy.discover({
      X:data.X, t:data.t, varNames:data.vars, library:spec,
      lambda:lam, ridge:ridge, iterations:its
    });
    // Rebuild the {name,fn} term list locally so downstream code that calls
    // t.fn (none currently) and t.name (coefficient labels, heatmaps) keeps working.
    const lib = window.FokoSINDy.buildLibrary(data.X, Object.assign({varNames:data.vars}, spec));
    // coeff is per-variable rows: coeff[j][k] = Xi[k][j].
    const coeff = data.vars.map((_,j)=>res.featureNames.map((_,k)=>res.Xi[k][j]));
    return {vars:data.vars.slice(), terms:lib.feats, theta:res.Theta, xdot:res.Xdot,
            coeff, data, threshold:lam, ridge, rmse:res.rmse};
  }
  function assert(c,m){ if(!c) throw new Error(m); }
  function expr(c,T){ const p=[]; c.forEach((v,i)=>{ if(Math.abs(v)>1e-12){ const sign=v<0?'-':(p.length?'+':''); const mag=Math.abs(v); p.push(sign+(Math.abs(mag-1)<1e-12?'':mag.toPrecision(5)+'*')+T[i].name); }}); return p.join(' ')||'0'; }
  function predictDerivative(model){ return model.theta.map(row=>model.coeff.map(c=>row.reduce((s,v,k)=>s+v*c[k],0))); }
  function residuals(model){ const pred=predictDerivative(model); return model.xdot.map((row,i)=>row.map((v,j)=>v-pred[i][j])); }
  function renderMath(lines){ const box=$('sciEquations'); if(!box) throw new Error('SciML equation output host is unavailable.'); box.innerHTML=''; lines.forEach(line=>{ const d=document.createElement('div'); d.className='sciml-math-line'; const latex=String(line).replace(/([A-Za-z]\w*)'/g,"$1^{\\prime}").replace(/\*/g,'\\cdot ').replace(/\^2/g,'^{2}').replace(/\^3/g,'^{3}'); window.FokoMathRender.render(d,latex,{displayMode:true}); box.appendChild(d); }); }
  function table(html){ $('sciDiagnostics').innerHTML=html; }

  function thetaObjectToArray(obj,names){ return names.map(k=>Number(obj[k])); }
  function currentParam(name,fallback){ const inputs=readModelInputs(); const v=Number(inputs.params[name]); return Number.isFinite(v)?v:fallback; }
  function arrayToObject(names,vals){ const o={}; names.forEach((k,i)=>o[k]=vals[i]); return o; }
  function inverseSpec(exampleKey){
    const e=ex();
    if(exampleKey==='sir') return {names:['beta','gamma'], theta0:[currentParam('beta',0.2),currentParam('gamma',0.25)], rhs:(t,x,th)=>[-th[0]*x[0]*x[1], th[0]*x[0]*x[1]-th[1]*x[1], th[1]*x[1]]};
    if(exampleKey==='seir') return {names:['beta','sigma','gamma'], theta0:[currentParam('beta',0.55),currentParam('sigma',0.2),currentParam('gamma',0.25)], rhs:(t,x,th)=>[-th[0]*x[0]*x[2], th[0]*x[0]*x[2]-th[1]*x[1], th[1]*x[1]-th[2]*x[2], th[2]*x[2]]};
    if(exampleKey==='michaelis') return {names:['Vmax','Km'], theta0:[currentParam('Vmax',0.5),currentParam('Km',2.0)], rhs:(t,x,th)=>{const v=th[0]*x[0]/(th[1]+x[0]); return [-v,v];}};
    if(exampleKey==='logistic') return {names:['r','K'], theta0:[currentParam('r',0.55),currentParam('K',6.5)], rhs:(t,x,th)=>[th[0]*x[0]*(1-x[0]/th[1])]};
    if(exampleKey==='allee') return {names:['r','K','A'], theta0:[currentParam('r',0.55),currentParam('K',7),currentParam('A',1.5)], rhs:(t,x,th)=>[th[0]*x[0]*(1-x[0]/th[1])*(x[0]/th[2]-1)]};
    return null;
  }
  function runInverseEngine(data){
    if(!window.FokoInverse) throw new Error('FokoInverse engine missing');
    const key=$('sciExample')?.value||'sir'; const spec=inverseSpec(key);
    if(!spec) return {exportOnly:true, message:'Inverse calibration for this example is export-only. Choose SIR, SEIR, logistic, Allee or Michaelis–Menten for browser calibration.'};
    const res=window.FokoInverse.calibrate({rhs:spec.rhs,x0:data.X[0],t:data.t,data:data.X,theta0:spec.theta0,mode:'fd',maxIter:80});
    const fitX=window.FokoInverse.simulateModel({rhs:spec.rhs,x0:data.X[0],t:data.t,theta:res.theta});
    return {spec,res,fitX,thetaObject:arrayToObject(spec.names,res.theta),exportOnly:false};
  }
  function runSurrogateEngine(data){
    if(!window.FokoSurrogate) throw new Error('FokoSurrogate engine missing');
    const inputs=data.t.map(t=>[t]); const outputs=data.X.map(r=>r[0]);
    const split=Math.max(6,Math.floor(inputs.length*0.7));
    const model=window.FokoSurrogate.fit({inputs:inputs.slice(0,split),outputs:outputs.slice(0,split),degree:Math.min(4,Math.max(2,Math.floor(data.vars.length/2)+2))});
    const pred=inputs.map(x=>window.FokoSurrogate.predict(model,x));
    const testY=outputs.slice(split), testP=pred.slice(split); const mean=testY.reduce((a,b)=>a+b,0)/Math.max(1,testY.length);
    let ssRes=0,ssTot=0; testY.forEach((y,i)=>{ssRes+=(y-testP[i])**2; ssTot+=(y-mean)**2;});
    return {model,pred,cvError:model.cvError,r2:ssTot?1-ssRes/ssTot:1,split,exportOnly:false};
  }

  function title(a){ return {sindy:'Equation discovery / SINDy',surrogate:'Surrogate modeling / acceleration',inverse:'Inverse problem / parameter identification',assimilation:'Data assimilation',pinn:'PINN export scaffold',operator:'Neural-operator export scaffold',network:'Biological network ML scaffold'}[a]||'SciML analysis'; }
  function compatiblePlots(){
    const vars=activeVars();
    let plots=(WORKFLOW_PLOTS[approach()]||['reference_trajectory']).slice();
    plots=plots.filter(kind=>kind!=='phase2d'||vars.length>=2).filter(kind=>kind!=='phase3d'||vars.length>=3);
    if(vars.length>=2 && ANALYSIS && ANALYSIS.pca) plots=plots.concat(['pca_scores','pca_explained','pca_loadings']);
    return Array.from(new Set(plots));
  }
  function plotMeta(kind){ return PLOT_META[kind]||{label:kind,evidence:'Computed output from the current workflow.'}; }
  function visibleSciSides(){
    const grid=$('plotGrid');
    if(!grid||grid.dataset.layout!=='focus')return ['left','right'];
    return [VIEW.focusSide==='right'?'right':'left'];
  }
  function scheduleSciPlots(){
    if(!DATA)return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>visibleSciSides().forEach(drawPlotTo)));
  }
  function applyLayout(){
    const grid=$('plotGrid'); if(!grid)return null;
    if(!LAYOUTS.has(VIEW.layout)) VIEW.layout='two';
    const count=Number(grid.dataset.compatibleCount||2);
    const report=window.FokoLayoutStability.apply({
      grid:grid,
      preferred:VIEW.layout,
      focus:VIEW.focusSide,
      breakpoint: 1024,
      compatibleCount:count
    });
    try{localStorage.setItem(LAYOUT_KEY,JSON.stringify({layout:VIEW.layout,focusSide:VIEW.focusSide}));}catch(_){}
    scheduleSciPlots();
    if(window.FokoScientificRegistry) window.FokoScientificRegistry.notifyRendered('sciml');
    return report;
  }
  function configurePlotSelectors(){
    const allowed=compatiblePlots();
    const grid=$('plotGrid'); if(grid)grid.dataset.compatibleCount=String(Math.min(2,allowed.length));
    const used=new Set();
    PLOT_SIDES.forEach((side,index)=>{
      const ids=SIDE_IDS[side], sel=$(ids[1]), card=document.querySelector(`[data-plot-card="${side}"]`);
      const available=index<Math.min(2,allowed.length);
      if(card)card.dataset.unavailable=available?'false':'true';
      if(!sel)return;
      sel.innerHTML=allowed.map(kind=>`<option value="${esc(kind)}">${esc(plotMeta(kind).label)}</option>`).join('');
      let desired=VIEW.plotTypes[side];
      if(!allowed.includes(desired) || used.has(desired)) desired=allowed.find(kind=>!used.has(kind))||allowed[0];
      sel.value=desired||''; VIEW.plotTypes[side]=desired||''; if(desired)used.add(desired);
    });
    if($('sciAvailablePlots'))$('sciAvailablePlots').textContent=String(allowed.length);
    if($('sciPlotHint'))$('sciPlotHint').textContent=allowed.length===1?'This workflow is export-only in the browser. The single visible plot is the reference input trajectory, not a trained-model result.':'Only plots supported by the current computed result are selectable.';
    updatePhaseControlVisibility();
    applyLayout();
  
  if(window.FokoScientificRegistry) window.FokoScientificRegistry.notifyOptionsChanged('sciml');
}
  function runAnalysis(){
    const started=(window.performance&&performance.now)?performance.now():Date.now();
    try{
      const data=parseCsv(), a=approach(); MODEL=null; ANALYSIS={approach:a,exportOnly:EXPORT_ONLY.has(a)};
      if(a==='sindy') MODEL=runSindy(data);
      else if(a==='inverse'){ ANALYSIS.inverse=runInverseEngine(data); ANALYSIS.exportOnly=!!ANALYSIS.inverse.exportOnly; }
      else if(a==='surrogate') ANALYSIS.surrogate=runSurrogateEngine(data);
      if(PCA && data.vars.length>=2){
        try{ ANALYSIS.pca=PCA.compute(data.X,{standardize:true,featureNames:data.vars}); }
        catch(error){ ANALYSIS.pcaError=String(error.message||error); }
      }
      if(a==='sindy') renderMath(MODEL.vars.map((v,j)=>`${v}' = ${expr(MODEL.coeff[j],MODEL.terms)}`));
      else if(a==='inverse' && ANALYSIS.inverse && !ANALYSIS.inverse.exportOnly) renderMath([`\\text{Recovered positive parameters}`, ...Object.entries(ANALYSIS.inverse.thetaObject).map(([k,v])=>`${k} = ${Number(v).toPrecision(5)}`)]);
      else if(a==='surrogate' && ANALYSIS.surrogate) renderMath([`\\text{Polynomial ridge surrogate}`, `R^2_{heldout} = ${Number(ANALYSIS.surrogate.r2).toPrecision(4)}`, `CV\\ RMSE = ${Number(ANALYSIS.surrogate.cvError).toPrecision(4)}`]);
      else renderMath([`\\text{${title(a)}}`, `\\text{Export-only: no browser neural training is claimed.}`]);
      ANALYSIS.runtimeMs=((window.performance&&performance.now)?performance.now():Date.now())-started;
      renderDiagnostics();
      $('sciExport').value=exportScript(a);
      configurePlotSelectors();
      drawPlot();
      updateRunSummary();
      status(title(a)+(ANALYSIS.exportOnly?' export prepared.':' computed.'));
    }catch(e){showError(e);}
  }
  function renderDiagnostics(){
    const a=approach(); const box=$('sciDiagnostics'); if(!box)return;
    box.classList.remove('empty');
    if(a==='sindy' && MODEL){
      const res=residuals(MODEL);
      const rows=MODEL.vars.map((v,j)=>{const r=res.map(x=>x[j]),mse=r.reduce((q,x)=>q+x*x,0)/r.length,max=Math.max(...r.map(Math.abs)),active=MODEL.coeff[j].filter(c=>Math.abs(c)>1e-12).length;return `<tr><td>${esc(v)}</td><td>${active}</td><td>${mse.toExponential(3)}</td><td>${max.toExponential(3)}</td></tr>`;}).join('');
      box.innerHTML=`<p><b>Derivative source:</b> centered finite differences · <b>threshold:</b> ${Number(MODEL.threshold).toPrecision(4)} · <b>ridge:</b> ${Number(MODEL.ridge).toExponential(2)}</p><table><thead><tr><th>state</th><th>active terms</th><th>residual MSE</th><th>max |residual|</th></tr></thead><tbody>${rows}</tbody></table><p>${esc(APPROACH[a])}</p>`;
      return;
    }
    if(a==='inverse'){
      const inv=ANALYSIS&&ANALYSIS.inverse;
      if(!inv||inv.exportOnly){box.innerHTML=`<p><b>Export-only for this example.</b> ${esc(inv&&inv.message||'The selected inverse problem is not implemented in the bounded browser adapter.')}</p>`;return;}
      const residual=flatten(inv.fitX.map((row,i)=>row.map((v,j)=>v-DATA.X[i][j]))); const rmse=Math.sqrt(residual.reduce((q,v)=>q+v*v,0)/Math.max(1,residual.length));
      box.innerHTML=`<p><b>Recovered:</b> ${Object.entries(inv.thetaObject).map(([k,v])=>`${esc(k)}=${Number(v).toPrecision(5)}`).join(', ')}</p><p><b>Converged:</b> ${inv.res.converged?'yes':'no'} · <b>iterations:</b> ${inv.res.iterations} · <b>final cost:</b> ${Number(inv.res.finalCost).toExponential(3)} · <b>RMSE:</b> ${rmse.toExponential(3)}</p><p>Positive parameters are enforced by rejecting invalid trials. Convergence does not establish uniqueness, practical identifiability or structural identifiability.</p>`;
      return;
    }
    if(a==='surrogate'){
      const sur=ANALYSIS&&ANALYSIS.surrogate;
      box.innerHTML=`<p><b>Model:</b> polynomial ridge surrogate of the first state as a function of time.</p><p><b>Temporal split:</b> ${sur.split} training points / ${DATA.t.length-sur.split} held-out points · <b>held-out R²:</b> ${Number(sur.r2).toPrecision(4)} · <b>5-fold CV RMSE:</b> ${Number(sur.cvError).toExponential(3)}</p><p>This reduced emulator is a browser diagnostic, not a validated replacement for a high-fidelity simulator.</p>`;
      return;
    }
    box.innerHTML=`<p><b>Export-only workflow.</b> The browser preserves the input trajectory and generates a validation scaffold. No training loss, physics residual, operator error or speedup is fabricated.</p><p>${esc(APPROACH[a]||'')}</p>`;
  }
  function updateRunSummary(){
    const a=approach(), exportOnly=!!(ANALYSIS&&ANALYSIS.exportOnly);
    if($('sciRuntime'))$('sciRuntime').textContent=ANALYSIS?`${ANALYSIS.runtimeMs.toFixed(1)} ms`:'—';
    if($('sciResultWorkflow'))$('sciResultWorkflow').textContent=title(a);
    if($('sciResultExample'))$('sciResultExample').textContent=ex().title;
    if($('sciResultStates'))$('sciResultStates').textContent=`${(DATA&&DATA.vars||ex().vars).length} states`;
    if($('sciComputation'))$('sciComputation').textContent=exportOnly?'Export only':a==='sindy'?'Browser STLSQ':a==='inverse'?'Browser calibration':'Browser surrogate';
    if($('sciResultKind'))$('sciResultKind').textContent=exportOnly?'Configuration and reference input only':`${title(a)} · browser-computed`;
    if($('sciBoundaryStatus'))$('sciBoundaryStatus').textContent=exportOnly?'Export-only':'Browser-computed';
    if($('sciBoundaryMethod'))$('sciBoundaryMethod').textContent=a==='sindy'?'STLSQ sparse regression':a==='inverse'?'Finite-difference calibration':a==='surrogate'?'Polynomial ridge + temporal hold-out':title(a);
    if($('sciBoundaryData'))$('sciBoundaryData').textContent=`${DATA&&DATA.source||ex().title} · ${DATA&&DATA.t.length||0} rows · seed ${DATA&&DATA.noiseSeed!=null?DATA.noiseSeed:'uploaded'}`;
    if($('sciBoundaryClaim'))$('sciBoundaryClaim').textContent=exportOnly?'No neural model was trained':a==='sindy'?'Sparse equation fit to estimated derivatives':a==='inverse'?'Parameter fit in a known model structure':'Reduced emulator validation';
    if($('sciBoundaryText'))$('sciBoundaryText').textContent=exportOnly?'No training loss, residual field, operator accuracy or speedup is shown because no neural training occurred in the browser.':'Interpretation remains conditional on sampling, scaling, model structure, numerical settings and held-out validation.';
    if($('sciWorkflowBoundary'))$('sciWorkflowBoundary').textContent=exportOnly?'This workflow is export-only. The browser shows only the reference trajectory and the generated external workflow.':APPROACH[a];
  }
  function modelJson(){
    const data=DATA||buildDataFromCurrentInputs();
    const out={id:'sciml-model',name:ex().title,type:'ODE/SciML',family:'SciML',workflow:approach(),variables:data.vars,parameters:data.params||{},initialConditions:data.x0||[],parameterRanges:data.paramRanges||{},source:'Foko SciML Lab v77.4.1',noiseSeed:data.noiseSeed,noiseAmplitude:data.noiseAmplitude};
    if(MODEL)out.equations=MODEL.vars.map((v,j)=>expr(MODEL.coeff[j],MODEL.terms));
    if(ANALYSIS&&ANALYSIS.inverse&&!ANALYSIS.inverse.exportOnly)out.recoveredParameters=ANALYSIS.inverse.thetaObject;
    if(ANALYSIS&&ANALYSIS.surrogate)out.surrogate={degree:ANALYSIS.surrogate.model.degree,heldoutR2:ANALYSIS.surrogate.r2,cvRmse:ANALYSIS.surrogate.cvError};
    return out;
  }
  function layout(titleText,x,y){ return {xaxis:{title:x,zeroline:true,automargin:true},yaxis:{title:y,zeroline:true,automargin:true},margin:{l:60,r:25,t:22,b:66},legend:{orientation:'h',y:-.22},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'Inter, system-ui, sans-serif',size:11},meta:{title:titleText}}; }
  function config(){ return {responsive:true,displaylogo:false,displayModeBar:'hover'}; }
  function flatten(a){ return a.reduce((x,y)=>x.concat(y),[]); }
  function corr(a,b){ const ma=a.reduce((q,v)=>q+v,0)/a.length,mb=b.reduce((q,v)=>q+v,0)/b.length;let num=0,da=0,db=0;for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;num+=x*y;da+=x*x;db+=y*y;}return da&&db?num/Math.sqrt(da*db):0; }
  function sciStats(){ if(!MODEL)throw new Error('Run SINDy before requesting a SINDy plot.'); return {data:DATA,model:MODEL,pred:predictDerivative(MODEL),res:residuals(MODEL)}; }
  function drawPlotTo(side){
    const ids=SIDE_IDS[side],box=$(ids[0]),sel=$(ids[1]),label=$(ids[2]),evidence=$(ids[3]); if(!box||!sel||!window.Plotly||box.offsetParent===null)return;
    const kind=sel.value,meta=plotMeta(kind); if(label)label.textContent=meta.label; if(evidence)evidence.textContent=meta.evidence;
    if(box.querySelector('.diagnostics.empty') || box.querySelector('.sciml-error')) box.innerHTML='';
    try{
      const data=DATA||buildDataFromCurrentInputs(); let traces=[],lay=layout(meta.label,'time','value');
      if(kind==='reference_trajectory'||kind==='trajectory'){
        traces=data.vars.map((v,j)=>({x:data.t,y:data.X.map(r=>r[j]),mode:'lines',name:v,line:{color:COLORS[j%COLORS.length]}})); lay=layout(meta.label,'time','state');
      } else if(kind.startsWith('pca_')){
        const p=ANALYSIS&&ANALYSIS.pca; if(!p)throw new Error(ANALYSIS&&ANALYSIS.pcaError||'PCA requires at least two state variables.');
        if(kind==='pca_scores'){
          traces=[{x:p.scores.map(r=>r[0]),y:p.scores.map(r=>r[1]),mode:'markers+lines',name:'time-ordered scores',marker:{color:data.t,colorscale:'Viridis',showscale:true,colorbar:{title:'time'},size:6},line:{color:'rgba(15,118,110,.35)',width:1}}];
          lay=layout(`${meta.label} · ${(100*p.explainedVarianceRatio[0]).toFixed(1)}% + ${(100*p.explainedVarianceRatio[1]).toFixed(1)}%`,'PC1 score','PC2 score');
        } else if(kind==='pca_explained'){
          const labels=p.explainedVarianceRatio.map((_,i)=>`PC${i+1}`);traces=[{x:labels,y:p.explainedVarianceRatio,type:'bar',name:'individual'},{x:labels,y:p.cumulativeExplained,mode:'lines+markers',name:'cumulative',yaxis:'y2'}];lay=layout(meta.label,'component','variance fraction');lay.yaxis.range=[0,1];lay.yaxis2={title:'cumulative',overlaying:'y',side:'right',range:[0,1]};
        } else {
          const count=Math.min(5,p.components.length);traces=[{z:p.components.slice(0,count),x:p.featureNames,y:Array.from({length:count},(_,i)=>`PC${i+1}`),type:'heatmap',colorscale:'RdBu',zmid:0,colorbar:{title:'loading'}}];lay=layout(meta.label,'state variable','component');
        }
      } else if(kind.startsWith('inverse_')){
        const inv=ANALYSIS&&ANALYSIS.inverse; if(!inv||inv.exportOnly)throw new Error('No browser-computed inverse result is available for this example.');
        if(kind==='inverse_fit'){
          data.vars.forEach((v,j)=>{traces.push({x:data.t,y:data.X.map(r=>r[j]),mode:'markers',name:`${v} observed`,marker:{size:4,color:COLORS[j%COLORS.length],opacity:.55}});traces.push({x:data.t,y:inv.fitX.map(r=>r[j]),mode:'lines',name:`${v} fitted`,line:{width:2,color:COLORS[j%COLORS.length]}});}); lay=layout(meta.label,'time','state');
        } else if(kind==='inverse_cost'){
          const h=inv.res.history; traces=[{x:h.map((_,i)=>i+1),y:h.map(r=>Math.max(r.cost,1e-16)),mode:'lines+markers',name:'residual cost',marker:{color:h.map(r=>r.accepted?'#0f766e':'#b45309')}}]; lay=layout(meta.label,'iteration','cost'); lay.yaxis.type='log';
        } else {
          data.vars.forEach((v,j)=>traces.push({x:data.t,y:inv.fitX.map((r,i)=>r[j]-data.X[i][j]),mode:'lines',name:v,line:{color:COLORS[j%COLORS.length]}})); lay=layout(meta.label,'time','fitted − observed');
        }
      } else if(kind.startsWith('surrogate_')){
        const sur=ANALYSIS&&ANALYSIS.surrogate; if(!sur)throw new Error('No browser-computed surrogate result is available.');
        const ref=data.X.map(r=>r[0]),resid=sur.pred.map((v,i)=>v-ref[i]),splitTime=data.t[Math.min(sur.split,data.t.length-1)];
        if(kind==='surrogate_fit'){
          traces=[{x:data.t,y:ref,mode:'lines',name:`${data.vars[0]} reference`,line:{color:'#0f766e',width:3}},{x:data.t,y:sur.pred,mode:'lines',name:'surrogate',line:{color:'#1d4ed8',dash:'dash',width:2}}]; lay=layout(meta.label,'time',data.vars[0]); lay.shapes=[{type:'line',x0:splitTime,x1:splitTime,yref:'paper',y0:0,y1:1,line:{dash:'dot',color:'#b45309'}}]; lay.annotations=[{x:splitTime,y:1,yref:'paper',text:'held-out starts',showarrow:false,yanchor:'bottom'}];
        } else if(kind==='surrogate_residual_time'){
          traces=[{x:data.t,y:resid,mode:'lines',name:'prediction − reference',line:{color:'#b45309'}}]; lay=layout(meta.label,'time','residual'); lay.shapes=[{type:'line',x0:splitTime,x1:splitTime,yref:'paper',y0:0,y1:1,line:{dash:'dot',color:'#334155'}}];
        } else {traces=[{x:resid.slice(0,sur.split),type:'histogram',name:'training',opacity:.65},{x:resid.slice(sur.split),type:'histogram',name:'held-out',opacity:.65}];lay=layout(meta.label,'residual','count');lay.barmode='overlay';}
      } else {
        const {model:m,pred,res}=sciStats(),absRes=res.map(r=>r.map(v=>Math.abs(v)));
        if(kind==='derivative'){m.vars.forEach((v,j)=>{traces.push({x:m.data.t,y:m.xdot.map(r=>r[j]),mode:'lines',name:`${v}' estimate`,line:{color:COLORS[j%COLORS.length]}});traces.push({x:m.data.t,y:pred.map(r=>r[j]),mode:'lines',name:`${v}' sparse model`,line:{color:COLORS[(j+3)%COLORS.length],dash:'dash'}});});lay=layout(meta.label,'time','derivative');}
        else if(kind==='predicted'){m.vars.forEach((v,j)=>traces.push({x:m.xdot.map(r=>r[j]),y:pred.map(r=>r[j]),mode:'markers',name:v,marker:{color:COLORS[j%COLORS.length],size:5,opacity:.65}}));const vals=flatten(traces.map(t=>t.x.concat(t.y))).filter(Number.isFinite),lo=Math.min(...vals),hi=Math.max(...vals);traces.push({x:[lo,hi],y:[lo,hi],mode:'lines',name:'ideal y=x',line:{dash:'dot',color:'#334155'}});lay=layout(meta.label,'estimated derivative','sparse-model derivative');}
        else if(kind==='error_heatmap'){traces=[{z:absRes,x:m.vars,y:m.data.t,type:'heatmap',colorscale:'Cividis',colorbar:{title:'|residual|'}}];lay=layout(meta.label,'state','time');}
        else if(kind==='pareto'){const grid=[0.001,0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2],sweep=window.FokoSINDy.paretoSweep({X:m.data.X,t:m.data.t,varNames:m.vars,library:librarySpec(),ridge:m.ridge,lambdas:grid}),pts=sweep.points,knee=pts[sweep.bestIndex];traces=[{x:pts.map(p=>p.activeTerms),y:pts.map(p=>p.rmse),text:pts.map(p=>'λ='+p.lambda),mode:'lines+markers',name:'STLSQ refit sweep',line:{color:'#155eef',width:3}},{x:[knee.activeTerms],y:[knee.rmse],mode:'markers',name:'heuristic knee',marker:{size:12,color:'#b45309'}}];lay=layout(meta.label,'active terms','fit RMSE');lay.yaxis.type='log';}
        else if(kind==='phase2d'){const ph=phaseIndices();if(ph.vars.length<2)throw new Error('Need at least two state variables.');traces=[{x:data.X.map(r=>r[ph.ix]),y:data.X.map(r=>r[ph.iy]),mode:'lines',name:`${ph.vars[ph.ix]} vs ${ph.vars[ph.iy]}`,line:{color:'#0f766e'}}];lay=layout(meta.label,ph.vars[ph.ix],ph.vars[ph.iy]);}
        else if(kind==='phase3d'){const ph=phaseIndices();if(ph.vars.length<3)throw new Error('Need at least three state variables.');traces=[{x:data.X.map(r=>r[ph.ix]),y:data.X.map(r=>r[ph.iy]),z:data.X.map(r=>r[ph.iz]),type:'scatter3d',mode:'lines',name:'trajectory',line:{color:'#155eef',width:5}}];lay=layout3d(meta.label,ph.vars[ph.ix],ph.vars[ph.iy],ph.vars[ph.iz]);}
        else if(kind==='residual_time'){m.vars.forEach((v,j)=>traces.push({x:m.data.t,y:res.map(r=>r[j]),mode:'lines',name:v,line:{color:COLORS[j%COLORS.length]}}));lay=layout(meta.label,'time','residual');}
        else if(kind==='residual_hist'){m.vars.forEach((v,j)=>traces.push({x:res.map(r=>r[j]),type:'histogram',name:v,opacity:.65,marker:{color:COLORS[j%COLORS.length]}}));lay=layout(meta.label,'residual','count');lay.barmode='overlay';}
        else if(kind==='coefficients'){const y=[],x=[];m.vars.forEach((v,j)=>m.terms.forEach((t,k)=>{if(Math.abs(m.coeff[j][k])>1e-12){y.push(`${v}: ${t.name}`);x.push(m.coeff[j][k]);}}));traces=[{x,y,type:'bar',orientation:'h',name:'coefficient',marker:{color:'#0f766e'}}];lay=layout(meta.label,'coefficient','term');lay.margin.l=155;}
        else if(kind==='library_heatmap'){const cols=m.terms.map((_,j)=>m.theta.map(r=>r[j]));traces=[{z:cols.map(a=>cols.map(b=>corr(a,b))),x:m.terms.map(t=>t.name),y:m.terms.map(t=>t.name),type:'heatmap',colorscale:'Cividis',zmin:-1,zmax:1,colorbar:{title:'corr'}}];lay=layout(meta.label,'term','term');lay.margin.b=105;}
      }
      return PLOT.render(box,traces,lay,config()).then(outcome=>{
        if(outcome&&outcome.error){const message=outcome.error.message||outcome.error;box.innerHTML=`<div class="sciml-error">${esc(message)}</div>`;PLOT.setState(box,'failed',false);}
        return outcome;
      });
    }catch(e){box.innerHTML=`<div class="sciml-error">${esc(e.message||e)}</div>`;PLOT.setState(box,'failed',false);return Promise.resolve({error:e});}
  }
  function drawPlot(){ configurePlotSelectors(); scheduleSciPlots(); }
  function exportScript(a=approach()){ const vars=(DATA?.vars)||ex().vars, csv=$('sciCsv')?.value||''; const common=`# Generated by Foko SciML Lab\n# Selected modeling problem: ${title(a)}\n`; if(a==='sindy')return common+`# pip install pysindy pandas numpy matplotlib scikit-learn\nimport io, pandas as pd, numpy as np, pysindy as ps\ncsv_data=${JSON.stringify(csv)}\ndf=pd.read_csv(io.StringIO(csv_data)); t=df.iloc[:,0].to_numpy(); X=df[${JSON.stringify(vars)}].to_numpy()\ndt=float(np.median(np.diff(t)))\nmodel=ps.SINDy(feature_library=ps.PolynomialLibrary(degree=3,include_interaction=True), optimizer=ps.STLSQ(threshold=${n('sciThreshold',.05)}, alpha=${n('sciRidge',1e-4)}), feature_names=${JSON.stringify(vars)})\nmodel.fit(X,t=dt); model.print()\n`; if(a==='surrogate')return common+`# scikit-learn surrogate validation: train/test split, predicted-vs-reference, residuals, error histogram.\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import PolynomialFeatures, StandardScaler\nfrom sklearn.linear_model import Ridge\nfrom sklearn.gaussian_process import GaussianProcessRegressor\n# Fit emulator to expensive solver outputs, then plot y_pred vs y_ref and residuals.\n`; if(a==='inverse')return common+`# scipy least_squares inverse problem scaffold: infer hidden ODE parameters from sparse observations.\nfrom scipy.integrate import solve_ivp\nfrom scipy.optimize import least_squares\n# Define rhs(t,y,theta), residual(theta), then inspect fitted trajectory and residual plots.\n`; if(a==='assimilation')return common+`# Data assimilation scaffold: forecast + observation update.\n# Replace with EnKF/UKF/particle filter. Plot innovation sequence and analysis residuals.\n`; if(a==='pinn')return common+`# PyTorch PINN scaffold. Train outside browser. Plot train/validation loss, physics residual, predicted-vs-reference and error heatmap.\nimport torch, torch.nn as nn\nclass MLP(nn.Module):\n    def __init__(self,width=64,depth=4,out_dim=1):\n        super().__init__(); layers=[nn.Linear(1,width),nn.Tanh()]\n        for _ in range(depth-1): layers += [nn.Linear(width,width),nn.Tanh()]\n        layers += [nn.Linear(width,out_dim)]; self.net=nn.Sequential(*layers)\n    def forward(self,t): return self.net(t)\n`; if(a==='operator')return common+`# Neural-operator scaffold: train field-to-field surrogate outside the browser.\n# Suggested stack: PyTorch + neuraloperator / JAX. Validate with x-t error heatmaps and cross-validation residuals.\n`; return common+`# Biological network ML scaffold: graph/omics features, GNN templates, pathway-level interpretation and SBML/BioNetGen export hooks.\n`; }
  async function copy(text,msg){ try{await navigator.clipboard.writeText(text);status(msg);}catch(_){$('sciExport').value=text;$('sciExport').focus();$('sciExport').select();status('Select/copy from export box.');} }
  function showError(e){ status(String(e.message||e),true); $('sciEquations').innerHTML=`<div class="sciml-error">${esc(e.message||e)}</div>`; }

  function renderUserLatex(){
    const src=String($('sciUserModel')?.value||'').trim() || 'y = f(x, \\theta)';
    const latex=src.split(/\n+/).slice(0,4).map(line=>line.replace(/~/g,'\\sim').replace(/\*/g,'\\cdot ').replace(/_/g,'\\_')).join('\\\\');
    const box=$('sciLatexPreview'); if(!box)return;
    if(window.FokoMathRender.render(box,'\\begin{aligned}'+latex+'\\end{aligned}',{displayMode:true})) return;
    box.textContent=src;
  }
  function wireSciUpload(){
    const input=$('sciUploadDataFile'); if(!input)return;
    input.addEventListener('change',()=>{ const file=input.files&&input.files[0]; if(!file)return; const r=new FileReader(); r.onload=()=>{ const txt=String(r.result||''); if(/\.(json|yaml|yml|txt|dat|matrix|edges)$/i.test(file.name) && $('sciUserModel')) $('sciUserModel').value=txt.slice(0,4000); if($('sciCsv')) $('sciCsv').value=txt; renderUserLatex(); try{parseCsv(); MODEL=null; runAnalysis(); status('Uploaded '+file.name+' and recomputed diagnostics.');}catch(e){ status('Uploaded '+file.name+'. Paste/format as CSV for browser diagnostics, or export the scaffold.', false); drawPlot(); } }; r.readAsText(file); });
  }
  function encodeState(value){
    const bytes=new TextEncoder().encode(JSON.stringify(value));
    let binary=''; bytes.forEach(b=>binary+=String.fromCharCode(b));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function decodeState(value){
    const raw=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
    const binary=atob(raw+'==='.slice((raw.length+3)%4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));
  }
  function currentConfig(){
    return {
      schema:'fokolab-sciml-config-v1', version:'77.4.1',
      example:$('sciExample')?.value||'logistic', approach:approach(),
      settings:{points:n('sciPoints',180),dt:n('sciDt',.05),noise:n('sciNoise',0),seed:Math.max(0,Math.floor(n('sciSeed',202614)))>>>0,threshold:n('sciThreshold',.05),ridge:n('sciRidge',1e-4),iterations:n('sciIterations',8)},
      modelText:$('sciUserModel')?.value||'', csv:$('sciCsv')?.value||'',
      modelInputs:readModelInputs(), library:librarySpec(),
      view:{layout:VIEW.layout,focusSide:VIEW.focusSide,plotTypes:Object.assign({},VIEW.plotTypes)}
    };
  }
  function applyModelInputConfig(config){
    const mi=config&&config.modelInputs; if(!mi)return;
    document.querySelectorAll('.sci-x0').forEach((el,i)=>{if(Number.isFinite(Number(mi.x0?.[i])))el.value=String(mi.x0[i]);});
    document.querySelectorAll('.sci-param-row').forEach(row=>{
      const key=row.dataset.param, value=mi.params&&mi.params[key], range=mi.ranges&&mi.ranges[key];
      if(Number.isFinite(Number(value)))row.querySelector('.sci-param-value').value=String(value);
      if(range&&Number.isFinite(Number(range.min)))row.querySelector('.sci-param-min').value=String(range.min);
      if(range&&Number.isFinite(Number(range.max)))row.querySelector('.sci-param-max').value=String(range.max);
    });
  }
  function applyConfig(config,{compute=true}={}){
    if(!config||typeof config!=='object')throw new Error('Invalid SciML configuration.');
    if(config.example&&EXAMPLES[config.example])$('sciExample').value=config.example;
    if(config.approach&&APPROACH[config.approach])$('sciApproach').value=config.approach;
    loadExampleData();
    const st=config.settings||{};
    [['sciPoints','points'],['sciDt','dt'],['sciNoise','noise'],['sciSeed','seed'],['sciThreshold','threshold'],['sciRidge','ridge'],['sciIterations','iterations']].forEach(([id,key])=>{if(Number.isFinite(Number(st[key])))set(id,st[key]);});
    if(typeof config.modelText==='string')$('sciUserModel').value=config.modelText;
    applyModelInputConfig(config);
    if(typeof config.csv==='string'&&config.csv.trim())$('sciCsv').value=config.csv;
    const lib=config.library||{};
    [['libConstant','constant'],['libLinear','linear'],['libQuadratic','quadratic'],['libInteractions','interactions'],['libCubic','cubic'],['libTrig','trig']].forEach(([id,key])=>{if(typeof lib[key]==='boolean')$(id).checked=lib[key];});
    const v=config.view||{};
    if(LAYOUTS.has(v.layout))VIEW.layout=v.layout;
    if(PLOT_SIDES.includes(v.focusSide))VIEW.focusSide=v.focusSide;
    if(v.plotTypes&&typeof v.plotTypes==='object')PLOT_SIDES.forEach(side=>{if(typeof v.plotTypes[side]==='string')VIEW.plotTypes[side]=v.plotTypes[side];});
    renderUserLatex(); describe();
    if(compute)runAnalysis(); else configurePlotSelectors();
  }
  function saveSession(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(currentConfig()));status('SciML configuration saved locally.');}
    catch(e){showError(new Error('Could not save the local SciML configuration.'));}
  }
  function restoreSession(){
    try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)throw new Error('No saved SciML configuration was found.');applyConfig(JSON.parse(raw));status('Saved SciML configuration restored and recomputed.');}
    catch(e){showError(e);}
  }
  async function copyShareUrl(){
    try{const url=new URL(location.href);url.search='';url.searchParams.set('state',encodeState(currentConfig()));await copy(url.toString(),'Share URL copied. Configuration only; results recompute on load.');}
    catch(e){showError(e);}
  }
  function exportPlot(side,format){
    const ids=SIDE_IDS[side]||SIDE_IDS.left, box=$(ids[0]);
    if(!box||!box.data||!box.data.length){showError(new Error('No computed plot is available for export.'));return;}
    const kind=$(ids[1])?.value||'sciml';
    Plotly.downloadImage(box,{format,filename:`fokolab-sciml-${kind}`,width:1400,height:900,scale:1});
  }
  function plotSelectionChanged(side){
    const ids=SIDE_IDS[side],sel=$(ids[1]); if(!sel)return;
    const requested=sel.value,old=VIEW.plotTypes[side];
    const other=PLOT_SIDES.find(candidate=>candidate!==side&&VIEW.plotTypes[candidate]===requested);
    if(other&&old&&old!==requested){const otherIds=SIDE_IDS[other];VIEW.plotTypes[other]=old;const otherSelect=$(otherIds[1]);if(otherSelect)otherSelect.value=old;}
    VIEW.plotTypes[side]=requested;sel.value=requested;
    updatePhaseControlVisibility(); scheduleSciPlots();
  }
  function bind(){
    $('sciExample')?.addEventListener('change',()=>{loadExampleData();runAnalysis();});
    $('sciApproach')?.addEventListener('change',()=>{describe();runAnalysis();});
    PLOT_SIDES.forEach(side=>{const ids=SIDE_IDS[side];$(ids[1])?.addEventListener('change',()=>plotSelectionChanged(side));});
    document.querySelectorAll('[data-layout-mode]').forEach(btn=>btn.addEventListener('click',()=>{VIEW.layout=btn.dataset.layoutMode;applyLayout();}));
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(btn=>btn.addEventListener('click',()=>{VIEW.focusSide=btn.dataset.focusSide;VIEW.layout='focus';applyLayout();}));
    document.querySelectorAll('[data-export-side]').forEach(btn=>btn.addEventListener('click',()=>exportPlot(btn.dataset.exportSide,'svg')));
    document.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>document.querySelector(btn.dataset.jump)?.scrollIntoView({behavior:'smooth',block:'start'})));
    $('sciUserModel')?.addEventListener('input',renderUserLatex);
    wireSciUpload();
    ['sciPhaseX','sciPhaseY','sciPhaseZ'].forEach(id=>$(id)?.addEventListener('change',scheduleSciPlots));
    ['libConstant','libLinear','libQuadratic','libInteractions','libCubic','libTrig'].forEach(id=>$(id)?.addEventListener('change',()=>{MODEL=null;status('Candidate library changed. Run analysis to recompute SINDy.');}));
    $('sciResetExample')?.addEventListener('click',()=>{loadExampleData();runAnalysis();});
    $('sciRunAnalysis')?.addEventListener('click',applyInputsAndAnalyze);
    $('sciReadCsv')?.addEventListener('click',()=>{try{parseCsv();MODEL=null;ANALYSIS=null;status('CSV read. Run analysis to compute new evidence.');configurePlotSelectors();}catch(e){showError(e);}});
    $('sciCopyCsv')?.addEventListener('click',()=>copy($('sciCsv').value,'CSV copied.'));
    $('sciCopyJson')?.addEventListener('click',()=>copy(JSON.stringify(modelJson(),null,2),'Model JSON copied.'));
    $('sciGenerateExport')?.addEventListener('click',()=>{$('sciExport').value=exportScript();status('External validation export generated.');});
    $('sciCopyExport')?.addEventListener('click',()=>copy($('sciExport').value,'Export copied.'));
    $('sciOpenNativeModel')?.addEventListener('click',()=>{location.href=ex().native;});
    window.addEventListener('resize',applyLayout);
    $('saveSciSession')?.addEventListener('click',saveSession);
    $('restoreSciSession')?.addEventListener('click',restoreSession);
    $('copySciShareUrl')?.addEventListener('click',copyShareUrl);
    $('exportSciPng')?.addEventListener('click',()=>exportPlot(VIEW.focusSide||'left','png'));
    $('exportSciSvg')?.addEventListener('click',()=>exportPlot(VIEW.focusSide||'left','svg'));
  }
  function fromUrl(){
    const p=new URLSearchParams(location.search),state=p.get('state');
    if(state){try{return decodeState(state);}catch(e){status('Shared configuration could not be decoded.',true);}}
    const e=p.get('example'),a=p.get('approach')||p.get('workflow');
    return {example:e&&EXAMPLES[e]?e:'logistic',approach:a&&APPROACH[a]?a:'sindy'};
  }
  function init(){
    try{const saved=JSON.parse(localStorage.getItem(LAYOUT_KEY)||'null');if(saved&&LAYOUTS.has(saved.layout))VIEW.layout=saved.layout;if(saved&&PLOT_SIDES.includes(saved.focusSide))VIEW.focusSide=saved.focusSide;}catch(_){}
    bind();
    const config=fromUrl();
    applyConfig(config);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
