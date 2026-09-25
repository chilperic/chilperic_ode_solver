"""FokoLab 79.2 native Python reference for the additive laboratories.

Run: python fokolab_reference.py experiment.json --output results/run
Requires NumPy and SciPy. Matplotlib is optional for the generated figure.
This executes Python equations; it does not invoke Node or a browser.
ODE exports use independent SciPy integration, not a transcription of the browser solver.
Stochastic references use the documented Mulberry32 stream and Box–Muller transform.
Matching a reference is numerical evidence, not empirical validation.
"""
from __future__ import annotations
import argparse
import ast
import csv
import json
import math
from pathlib import Path
from typing import Any, Callable
import numpy as np
from scipy.integrate import solve_ivp

Result = dict[str, Any]

class RNG:
    """32-bit Mulberry generator. The stream advances across, not inside, replicates."""
    def __init__(self, seed: int) -> None:
        self.a = int(seed) & 0xffffffff
    def __call__(self) -> float:
        self.a = (self.a + 0x6D2B79F5) & 0xffffffff
        t = ((self.a ^ (self.a >> 15)) * (1 | self.a)) & 0xffffffff
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & 0xffffffff)) & 0xffffffff) ^ t
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296
    def normal(self) -> float:
        return math.sqrt(-2 * math.log(max(self(), 1e-15))) * math.cos(2 * math.pi * self())
    def binomial(self, n: int, p: float) -> int:
        if not isinstance(n, int) or not 0 <= n <= 200000 or not 0 <= p <= 1:
            raise ValueError('Binomial requires integer 0 <= n <= 200000 and 0 <= p <= 1.')
        return sum(self() < p for _ in range(n))

def grid(q: dict) -> np.ndarray:
    """Requested observations, including both endpoints; independent of solver steps."""
    return np.linspace(q['t0'], q['tEnd'], int(q['samples']))

def result(columns: list[str], rows: Any, **extra: Any) -> Result:
    a = np.asarray(rows, dtype=float)
    if a.ndim != 2 or a.shape[1] != len(columns) or not np.isfinite(a).all():
        raise ValueError('Nonfinite or malformed result; no partial table is exported.')
    return {'columns': columns, 'rows': a.tolist(), **extra}

_FUNCTIONS = {name: getattr(math, name) for name in ['sin','cos','tan','exp','log','sqrt','asin','acos','atan','sinh','cosh','tanh','floor','ceil']}
_FUNCTIONS.update({'abs': abs, 'min': min, 'max': max, 'pow': pow, 'round': round})
_ALLOWED = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Call, ast.Name, ast.Load,
            ast.Constant, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.USub, ast.UAdd)

def compile_expression(expression: str, names: set[str]) -> Callable[[dict], float]:
    """Strict scalar arithmetic subset; no attributes, indexing, assignments or imports."""
    tree = ast.parse(expression.replace('^', '**'), mode='eval')
    if sum(1 for _ in ast.walk(tree)) > 2000:
        raise ValueError('Expression exceeds the reference complexity budget.')
    for node in ast.walk(tree):
        if not isinstance(node, _ALLOWED):
            raise ValueError(f'Unsupported Python-reference syntax: {type(node).__name__}.')
        if isinstance(node, ast.Name) and node.id not in names | set(_FUNCTIONS) | {'pi','e','t'}:
            raise ValueError(f'Unknown model symbol: {node.id}.')
        if isinstance(node, ast.Call) and (not isinstance(node.func, ast.Name) or node.func.id not in _FUNCTIONS or node.keywords):
            raise ValueError('Only declared scalar mathematical function calls are supported.')
        if isinstance(node, ast.Constant) and (isinstance(node.value, bool) or not isinstance(node.value, (float,int))):
            raise ValueError('Only numeric constants are supported.')
    code = compile(tree, '<fokolab-equation>', 'eval')
    def evaluate(env: dict) -> float:
        return float(eval(code, {'__builtins__': {}, **_FUNCTIONS, 'pi': math.pi, 'e': math.e}, env))
    return evaluate

def ode_reference(q: dict) -> Result:
    m = q['modelSpec']; states = m['vars']; initial = np.asarray(m['y0'], float)
    if len(states) != len(initial) or len(states) != len(m['eqs']) or len(set(states)) != len(states):
        raise ValueError('State names, equations and initial values must match and be unique.')
    parameters = {k: float(v) for k,v in q['params'].items()}
    for k,v in parameters.items():
        bounds = m['params'][k]
        if not bounds[1] <= v <= bounds[2]:
            raise ValueError(f'{k} is outside its declared parameter range.')
    equations = [compile_expression(e, set(states) | set(parameters)) for e in m['eqs']]
    def rhs(t: float, y: np.ndarray) -> np.ndarray:
        env = {**parameters, **dict(zip(states, y)), 't': t}
        values = np.array([f(env) for f in equations])
        if not np.isfinite(values).all():
            raise ValueError(f'Nonfinite derivative at time {t}.')
        return values
    method = q.get('python_method', 'DOP853')
    if method not in {'RK45','DOP853','Radau','BDF','LSODA'}:
        raise ValueError('Choose RK45, DOP853, Radau, BDF or LSODA for the Python reference.')
    sol = solve_ivp(rhs, (q['t0'], q['tEnd']), initial, method=method,
                    t_eval=grid(q), rtol=q['rtol'], atol=q['atol'])
    if not sol.success:
        raise RuntimeError(sol.message)
    return result(['time', *states], np.column_stack([sol.t, sol.y.T]),
                  diagnostics={'method':method,'nfev':sol.nfev,'message':sol.message,
                  'notice':'Independent SciPy integration; not the browser integration mesh.'})

def weather_at(t: float, p: dict, weather: np.ndarray | None) -> tuple[float,float,float]:
    if weather is not None:
        return tuple(float(np.interp(t,weather[:,0],weather[:,i])) for i in (1,2,3))
    wave = math.sin(2*math.pi*(t-p['phase'])/p['year'])
    dry = p['droughtStart'] <= t < p['droughtStart']+p['droughtLength']
    return p['temperature']+p['tempAmplitude']*wave, 0.0 if dry else p['rain']*(1+p['rainSeason']*wave), p['light']

def plant_reference(q: dict) -> Result:
    """Flux-limited finite stocks. Respiration here is litter CO2; growth is net carbon gain."""
    p=q['params']; weather=np.array(q['weather'],float) if q.get('weather') else None
    if p['initialWater'] > p['capacity'] or p['season'] > p['year']:
        raise ValueError('Initial water exceeds capacity or season exceeds the environmental cycle.')
    if weather is not None and (weather.ndim!=2 or weather.shape[1]!=4 or len(weather)<2 or not np.isfinite(weather).all() or np.any(np.diff(weather[:,0])<=0) or weather[0,0]>q['t0'] or weather[-1,0]<q['tEnd'] or np.any(weather[:,2:]<0)):
        raise ValueError('Weather needs finite, ordered time/temp/rain-rate/light rows covering the experiment.')
    shoot=p['initialBiomass']*(1-p['rootAllocation']); root=p['initialBiomass']*p['rootAllocation']
    seed=p['initialSeed']; litter=0.; water=p['initialWater']; nitrogen=p['initialN']
    rain_in=irrigation_in=et_out=drain_out=n_input=n_leach=net_c=resp_c=0.
    t=q['t0']; substeps=0; flux=0.
    pump, water_factor, optimum={'C3':(0,1,24),'C3–C4':(.4,.85,27),'C4':(1,.7,32),'CAM':(1,.3,28)}[p['pathway']]
    slow=.48 if p['pathway']=='CAM' else 1.; initial_c=shoot+root+seed; initial_n=nitrogen+p['nRatio']*initial_c
    rows=[]
    def save(time: float) -> None:
        temp,rain,light=weather_at(time,p,weather)
        rows.append([time,shoot,root,seed,litter,water,nitrogen,net_c,resp_c,rain_in,irrigation_in,et_out,drain_out,n_input,n_leach,temp,rain,light,flux,
                     shoot+root+seed+litter+resp_c-initial_c-net_c,
                     water-p['initialWater']-rain_in-irrigation_in+et_out+drain_out,
                     nitrogen+p['nRatio']*(shoot+root+seed+litter)+n_leach-initial_n-n_input])
    save(t)
    for target in grid(q)[1:]:
        while t < target-1e-12:
            substeps+=1
            if substeps>150000: raise RuntimeError('Plant integration budget exceeded.')
            h=min(q['step'],.25,target-t); age=t-q['t0']; year_index=math.floor((age+1e-10)/p['year']); cycle_start=q['t0']+year_index*p['year']
            for edge in [cycle_start+p['season'],cycle_start+p['year'],p['droughtStart'],p['droughtStart']+p['droughtLength']]:
                if t+1e-10 < edge < t+h: h=edge-t
            mid=t+h/2; cycle_age=mid-cycle_start
            active=p['life']=='perennial' or (cycle_age<p['season'] and (p['life']=='annual-reseed' or year_index==0))
            temp,rain,light=weather_at(mid,p,weather)
            rain_in+=rain*h; irrigation_in+=p['irrigation']*h
            available=water+(rain+p['irrigation'])*h; drain=max(0,available-p['capacity']); stored=available-drain; drain_out+=drain
            water_stress=stored/(stored+.18*p['capacity']); canopy=1-math.exp(-shoot/80)
            demand=p['evap']*(.12+.88*canopy)*water_factor*water_stress
            loss=min(stored,demand*h); water=stored-loss; et_out+=loss
            n_input+=p['fertilizer']*h; nitrogen+=p['fertilizer']*h
            dec=litter*(-math.expm1(-p['litterDecay']*h)); litter-=dec; resp_c+=dec; nitrogen+=p['nRatio']*dec
            leached=nitrogen*(-math.expm1(-p['leaching']*drain/max(1,available))); nitrogen-=leached; n_leach+=leached
            thermal=math.exp(-((temp-optimum)/15)**2); co2=p['co2']/(p['co2']+250*(1-.65*pump)); n_stress=nitrogen/(nitrogen+p['halfN']); live=shoot+root
            potential=p['growth']*shoot*max(0,1-live/p['carrying'])*thermal*light/(light+220)*co2*water_stress*n_stress*slow*(1-.18*pump) if active else 0
            gain=min(potential*h,nitrogen/p['nRatio']); net_c+=gain; nitrogen-=p['nRatio']*gain; flux=gain/h
            reproductive=.45 if active and p['life']!='perennial' and cycle_age>.6*p['season'] else 0.
            shoot+=gain*(1-reproductive)*(1-p['rootAllocation']); root+=gain*(1-reproductive)*p['rootAllocation']; seed+=gain*reproductive
            turn=p['turnover']+(0 if active else .12)
            ds=shoot*(-math.expm1(-turn*h)); dr=root*(-math.expm1(-.7*turn*h)); shoot-=ds; root-=dr; litter+=ds+dr
            t+=h
            if p['life']=='annual-reseed' and abs(t-(cycle_start+p['year']))<1e-8:
                germ=seed*p['reseed'];seed-=germ;shoot+=germ*(1-p['rootAllocation']);root+=germ*p['rootAllocation']
        t=float(target); save(t)
    return result(['time_day','shoot_C','root_C','seed_C','litter_C','soil_water_mm','mineral_N','cumulative_net_C_gain','cumulative_litter_CO2_C','cumulative_rain_mm','cumulative_irrigation_mm','cumulative_ET_mm','cumulative_drainage_mm','cumulative_N_input','cumulative_N_leaching','temperature_C','rain_rate_mm_day','light_umol_m2_s','net_gain_gC_m2_day','carbon_residual','water_residual','nitrogen_residual'], rows)

def leaf_rates(c: float,p: dict) -> list[float]:
    light=p['alpha']*p['light']; z=light+p['Jmax']
    j=0. if light==0 else 2*light*p['Jmax']/(z+math.sqrt(max(0,z*z-4*p['theta']*light*p['Jmax'])))
    ac=p['Vcmax']*(c-p['gammaStar'])/(c+p['Kc']*(1+p['oxygen']/p['Ko']))
    aj=j/4 if p['gammaStar']==0 else j*(c-p['gammaStar'])/(4*(c+2*p['gammaStar']))
    return [min(ac,aj)-p['Rd'],ac-p['Rd'],aj-p['Rd'],j]

def leaf_reference(q: dict) -> Result:
    p=q['params']
    if q['method']!='heat':
        x=np.linspace(0,p['CiMax'] if q['method']=='aci' else 2500,int(q['samples']))
        rows=[[v,*leaf_rates(v if q['method']=='aci' else p['Ci'], {**p,'light':v} if q['method']=='light' else p)] for v in x]
        return result(['Ci_ubar' if q['method']=='aci' else 'light_umol_m2_s','net_A','Rubisco_limited_net_A','electron_limited_net_A','electron_transport'],rows)
    latent=44000*p['transpiration']; sigma=5.670374419e-8
    def fluxes(temp:float)->list[float]:
        sensible=p['heatTransfer']*(temp-p['air']); longwave=p['emissivity']*sigma*((temp+273.15)**4-(p['air']+273.15)**4)
        return [p['radiation'],sensible,longwave,latent,p['radiation']-sensible-longwave-latent]
    sol=solve_ivp(lambda t,y:[fluxes(y[0])[-1]/p['heatCapacity']],(q['t0'],q['tEnd']),[p['initialTemp']],t_eval=grid(q),method='DOP853',rtol=q['rtol'],atol=q['atol'])
    if not sol.success:raise RuntimeError(sol.message)
    return result(['time_s','leaf_temperature_C','absorbed_W_m2','sensible_W_m2','longwave_W_m2','latent_W_m2','storage_W_m2'],[[t,temp,*fluxes(temp)] for t,temp in zip(sol.t,sol.y[0])])

def seasonal_fitness(pump:float,allocation:float,p:dict,generation:int=0)->float:
    water=min(1,max(.001,p['water']-p['drying']*generation)); co2=p['co2']/(p['co2']+250*(1-.65*pump)); total=0.
    for i in range(24):
        temp=p['temperature']+p['warming']*generation+p['tempAmplitude']*math.sin(2*math.pi*((i+.5)*p['season']/24+p['phase'])/p['year'])
        thermal=math.exp(-((temp-(24+8*pump))/15)**2); hydraulic=water+(1-water)*allocation*.75
        photo=math.exp(-max(0,temp-20)*(1-pump)*.012*420/p['co2'])
        total+=thermal*hydraulic*co2*photo*(1-.22*pump)*(1-.45*allocation)
    return p['season']*total/24

def fixation(s:float,n:int)->float:
    if abs(s)<1e-10:return 1/n
    if s>0:return -math.expm1(-s)/-math.expm1(-n*s)
    a=-s
    return 0. if (n-1)*a>745 else math.exp(-(n-1)*a)*(-math.expm1(-a))/(-math.expm1(-n*a))

def adaptation_reference(q:dict)->Result:
    p=q['params'];random=RNG(q['seed']);a=p['pump0'];b=p['root0'];steps=0 if q['method']=='map' else int(q['tEnd']-q['t0'])
    def reflect(v:float,lo:float,hi:float)->float:
        span=hi-lo;w=(v-lo)%(2*span);return lo+(w if w<=span else 2*span-w)
    rows=[[0,a,b,seasonal_fitness(a,b,p),0,0]]
    for g in range(1,steps+1):
        na=reflect(a+p['mutation']*random.normal(),0,1);nb=reflect(b+p['mutation']*.5*random.normal(),.05,.85)
        f0=seasonal_fitness(a,b,p,g);f1=seasonal_fitness(na,nb,p,g);s=p['selection']*math.log(max(1e-12,f1)/max(1e-12,f0));ok=random()<fixation(s,int(p['N']))
        if ok:a,b=na,nb
        rows.append([g,a,b,seasonal_fitness(a,b,p,g),s,int(ok)])
    xs=np.linspace(0,1,int(p['resolution']));ys=np.linspace(.05,.85,int(p['resolution']))
    return result(['generation','concentrating_trait','root_allocation_trait','fitness_proxy','proposal_log_selection','fixed'],rows,landscape={'x':xs.tolist(),'y':ys.tolist(),'z':[[seasonal_fitness(a,b,p) for a in xs] for b in ys]})

def ensemble(times:np.ndarray,paths:list,expected:np.ndarray)->Result:
    a=np.asarray(paths,float);columns=['time','mean','median','p05','p95','analytical_expectation']
    rows=np.column_stack([times,a.mean(axis=0),np.quantile(a,.5,axis=0),np.quantile(a,.05,axis=0),np.quantile(a,.95,axis=0),expected])
    return result(columns,rows,ensemble=a.tolist())

def stochastic_reference(q:dict)->Result:
    p=q['params'];r=RNG(q['seed']);times=grid(q);paths=[]
    if q['method']=='dice':
        counts=[0]*int(p['faces']);total=0;rows=[];stride=max(1,math.ceil(p['rolls']/600))
        for i in range(1,int(p['rolls'])+1):
            face=1+math.floor(r()*p['faces']);counts[face-1]+=1;total+=face
            if i==1 or i%stride==0 or i==p['rolls']:rows.append([i,total/i])
        return result(['roll','running_mean'],rows,frequencyTable={'columns':['face','observed','expected'],'rows':[[i+1,v,p['rolls']/p['faces']] for i,v in enumerate(counts)]})
    for rep in range(int(p['paths'])):
        y=p['initial'];t=q['t0'];events=0;out=[y]
        def draw()->tuple[float,bool]:
            hazard=(p['birth']+p['death'])*y
            if hazard<=0:return math.inf,False
            return t-math.log(max(r(),1e-15))/hazard,r()<p['birth']/(p['birth']+p['death'])
        event,birth=draw() if q['method']=='ssa' else (math.inf,False)
        for i,target in enumerate(times[1:],start=1):
            if q['method']=='ssa':
                while event<=target:
                    events+=1
                    if events>250000 or y>200000:raise RuntimeError('SSA event or population budget exceeded.')
                    t=event;y+=1 if birth else -1;event,birth=draw()
            else:
                h=target-times[i-1]
                if q['method']=='brownian':y+=p['sigma']*math.sqrt(h)*r.normal()
                else:
                    e=math.exp(-p['birth']*h);sd=p['sigma']*math.sqrt(h) if p['birth']==0 else p['sigma']*math.sqrt(-math.expm1(-2*p['birth']*h)/(2*p['birth']))
                    y=e*y+sd*r.normal()
            out.append(y)
        paths.append(out)
    expected=p['initial']*np.exp((p['birth']-p['death'])*(times-q['t0'])) if q['method']=='ssa' else p['initial']*np.exp(-p['birth']*(times-q['t0'])) if q['method']=='ou' else np.full(len(times),p['initial'])
    return ensemble(times,paths,expected)

def branching_reference(q:dict)->Result:
    p=q['params'];r=RNG(q['seed']);g=int(q['tEnd']);paths=[]
    for _ in range(int(p['paths'])):
        n=int(p['initial']);a=[n]
        for _ in range(g):
            n=2*r.binomial(n,p['p']);a.append(n)
        paths.append(a)
    times=np.arange(g+1);return ensemble(times,paths,p['initial']*(2*p['p'])**times)

def diffusion_reference(q:dict)->Result:
    p=q['params'];n=int(p['nodes']);dx=p['length']/n;x=(np.arange(n)+.5)*dx;times=grid(q)
    u=np.ones(n) if p['initial']=='uniform' else 1+.5*np.sin(2*np.pi*x/p['length']) if p['initial']=='sine' else np.exp(-((x-.5*p['length'])/(.09*p['length']))**2)
    limit=(.3 if p['boundary']=='fixed' else .45)*dx*dx/p['D'];t=q['t0'];transfer=0.;steps=0;mass0=float(u.sum()*dx);rows=[[t,*u]];budget=[[t,mass0,0,0]]
    for target in times[1:]:
        while t<target-1e-12:
            steps+=1
            if steps>500000:raise RuntimeError('Diffusion substep budget exceeded.')
            h=min(q['step'],limit,target-t);faces=np.zeros(n+1);faces[1:n]=-p['D']*np.diff(u)/dx
            if p['boundary']=='periodic':faces[0]=faces[n]=-p['D']*(u[0]-u[-1])/dx
            if p['boundary']=='fixed':faces[0]=-2*p['D']*(u[0]-p['left'])/dx;faces[n]=-2*p['D']*(p['right']-u[-1])/dx
            transfer+=h*(faces[0]-faces[n]);u=u+h*(faces[:-1]-faces[1:])/dx;t+=h
        t=float(target);mass=float(u.sum()*dx);rows.append([t,*u]);budget.append([t,mass,transfer,mass-mass0-transfer])
    return result(['time',*[f'cell_{i}' for i in range(n)]],rows,coordinates=x.tolist(),budget={'columns':['time','mass','boundary_transfer','balance_residual'],'rows':budget})

def fractal_reference(q:dict)->Result:
    p=q['params'];r=RNG(q['seed'])
    if q['method']=='mandelbrot':
        n=int(p['resolution']);limit=max(30,math.floor(p['points']/50+.5));rows=[]
        for ci in np.linspace(-1.3,1.3,n):
            for cr in np.linspace(-2.2,.8,n):
                a=b=0.;k=0
                while k<limit and a*a+b*b<=4:a,b=a*a-b*b+cr,2*a*b+ci;k+=1
                rows.append([cr,ci,k])
        return result(['real','imaginary','escape_iterations'],rows)
    x=y=0.;rows=[];vertices=[(0,0),(1,0),(.5,math.sqrt(3)/2)]
    for i in range(int(p['points'])+30):
        if q['method']=='triangle':
            vx,vy=vertices[math.floor(r()*3)];x=(x+vx)/2;y=(y+vy)/2
        else:
            v=r()
            if v<.01:x,y=0,.16*y
            elif v<.86:x,y=.85*x+.04*y,-.04*x+.85*y+1.6
            elif v<.93:x,y=.2*x-.26*y,.23*x+.22*y+1.6
            else:x,y=-.15*x+.28*y,.26*x+.24*y+.44
        if i>=30:rows.append([x,y])
    return result(['x','y'],rows)

def run(request:dict)->Result:
    """Execute an exported request; accept either a request or an experiment result wrapper."""
    q=json.loads(json.dumps(request.get('request',request)));p=q['params']
    for key in ['t0','tEnd','step','samples','rtol','atol','seed']:
        if isinstance(q[key],bool) or not isinstance(q[key],(int,float)) or not math.isfinite(q[key]):raise ValueError(f'{key} must be finite numeric data.')
    if not 0<q['tEnd']-q['t0']<=10000 or q['step']<=0 or min(q['rtol'],q['atol'])<=0:raise ValueError('Require positive step/tolerances and 0 < horizon <= 10000.')
    if q['samples']!=int(q['samples']) or not 20<=q['samples']<=1500:raise ValueError('Output sample count must be an integer in 20–1500.')
    for key,value in p.items():
        if isinstance(value,(int,float)) and not math.isfinite(value):raise ValueError(f'Parameter {key} must be finite.')
    functions={'plant':plant_reference,'leaf':leaf_reference,'adaptation':adaptation_reference,'lipids':ode_reference,'tcell':ode_reference,'randomness':stochastic_reference,'branching':branching_reference,'diffusion':diffusion_reference,'fractals':fractal_reference}
    if q['lab'] not in functions:raise ValueError('Unsupported additive laboratory; use that original laboratory’s native export.')
    answer=functions[q['lab']](q);answer['request']=q;answer['implementation']='FokoLab 79.2 native Python reference';return answer

def save_result(answer:Result, output:str)->None:
    """Write full numeric CSV + provenance JSON; add one plot when Matplotlib is present."""
    target=Path(output);target.parent.mkdir(parents=True,exist_ok=True)
    with target.with_suffix('.csv').open('w',newline='',encoding='utf-8') as handle:
        writer=csv.writer(handle);writer.writerow(answer['columns']);writer.writerows(answer['rows'])
    target.with_suffix('.json').write_text(json.dumps(answer,indent=2,allow_nan=False),encoding='utf-8')
    try:
        import matplotlib.pyplot as plt
        a=np.asarray(answer['rows']);fig,ax=plt.subplots(figsize=(10,5.5));lab=answer['request']['lab'];columns=answer['columns'];indices=list(range(1,min(9,len(columns))));ylabel='State value · see declared units'
        if lab=='plant':indices=[1,2,3,4];ylabel='Carbon stock (g C m⁻²)'
        elif lab=='leaf' and answer['request']['method']=='heat':indices=[1];ylabel='Leaf temperature (°C)'
        elif lab=='adaptation':indices=[1,2];ylabel='Dimensionless trait'
        elif lab=='lipids' and len(columns)>10:indices=[j for j,c in enumerate(columns) if c in ['C14','C16','C18']];ylabel='Fatty-acid products (source units)'
        if lab=='fractals' and answer['request']['method']!='mandelbrot':ax.scatter(a[:,0],a[:,1],s=.5);ax.set_ylabel(columns[1]);ax.set_aspect('equal',adjustable='box')
        elif lab=='diffusion':
            x=answer.get('coordinates',np.arange(a.shape[1]-1));ax.plot(x,a[0,1:],label='Initial');ax.plot(x,a[-1,1:],label='Final');ax.set_xlabel('Position');ax.set_ylabel('Concentration');ax.legend(fontsize=8)
        else:
            for j in indices:ax.plot(a[:,0],a[:,j],label=columns[j])
            ax.set_ylabel(ylabel);ax.legend(fontsize=8)
        if lab!='diffusion':ax.set_xlabel(columns[0])
        ax.grid(alpha=.2);fig.tight_layout();fig.savefig(target.with_suffix('.png'),dpi=170);plt.close(fig)
    except ImportError:
        pass
    print(f'Wrote {target.with_suffix(".csv")} and {target.with_suffix(".json")}')



if __name__ == "__main__":
    import json
    request = json.loads("{\"lab\":\"plant\",\"method\":\"balance\",\"params\":{\"pathway\":\"C3\",\"life\":\"single-season\",\"season\":150,\"year\":365,\"reseed\":0.2,\"initialBiomass\":8,\"initialSeed\":0,\"rootAllocation\":0.32,\"growth\":0.08,\"carrying\":600,\"turnover\":0.004,\"litterDecay\":0.005,\"temperature\":25,\"tempAmplitude\":6,\"phase\":0,\"co2\":420,\"light\":450,\"rain\":0,\"rainSeason\":0.6,\"irrigation\":0,\"initialWater\":80,\"capacity\":140,\"evap\":4,\"droughtStart\":70,\"droughtLength\":35,\"initialN\":4,\"fertilizer\":0.002,\"nRatio\":0.05,\"halfN\":0.7,\"leaching\":0.2},\"t0\":0,\"tEnd\":220,\"step\":0.2,\"samples\":241,\"seed\":42,\"rtol\":1e-7,\"atol\":1e-9}")
    save_result(run(request), "FokoLab-plant")
