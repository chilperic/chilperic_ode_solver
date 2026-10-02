#!/usr/bin/env python3
"""FokoLab independent lipid ODE replay, including configured comparison.
Install: pip install numpy scipy matplotlib
Run: python lipid-model.py
Uses SciPy Radau, not the browser integrator. This is a numerical replay,
not an empirical validation or a proof of bistability. The animation tracer
is separate from the bulk equations and is not simulated by this script.
"""
import base64, csv, json
from pathlib import Path
import numpy as np
from scipy.integrate import solve_ivp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
CONFIG = json.loads(base64.b64decode('__CONFIG_BASE64__').decode('utf-8'))
P = CONFIG['p']
SYN = CONFIG['model'] == 'synthesis'
NAMES = ['Acetyl-CoA','Malonyl-CoA','NADPH','Free FAS',*[f'EC{i}' for i in range(2,19,2)],'C14:0','C16:0','C18:0','Free CoA','FAS-CoA'] if SYN else ['Acetyl-CoA','Malonyl-CoA','Fatty acids','Triglycerides']

def derivative(t, x, p):
    if not SYN:
        a,m,f,tg = x
        r1 = p['V1']*a/((p['K1']+a)*(1+p['q1']*f))
        r2 = p['V2']*m/(p['K2']+m)
        r3 = p['V3']*f/(p['K3']+f)
        r4 = p['V4']*f/((p['K4']+f)*(1+p['q4']*m))
        r5 = p['V5']*tg/(p['K5']+tg)
        return [p['k1']-r1+r4-p['alpha']*a, r1-r2,
                p['k2']+r2-r3-r4+r5-p['beta']*f, p['k3']+r3-r5-p['gamma']*tg]
    d = np.zeros(18)
    v = p['initiation']*x[0]*x[3]
    d[[0,3]] -= v
    d[[4,16]] += v
    for j in range(8):
        v = (p['last'] if j==7 else p['elongation'])*x[j+4]*x[1]*x[2]
        d[j+4] -= v
        d[j+5] += v
        d[1] -= v
        d[2] -= 2*v
        d[16] += v
    for j, k in enumerate(['release14','release16','release18']):
        v = p[k]*x[j+10]
        d[j+10] -= v
        d[j+13] += v
        d[3] += v
    if p['inhibition']:
        v = p['binding']*x[3]*x[16]-p['unbinding']*x[17]
        d[[3,16]] -= v
        d[17] += v
    return d

def run(comparison=False):
    p = dict(P)
    y0 = [p['acetyl'],p['malonyl'],p['nadph'],p['enzyme'],*([0]*12),p['coa'],0] if SYN else list(p['initial'])
    if comparison:
        if SYN: p['inhibition'] = not p['inhibition']
        else: y0 = (10*np.asarray(y0)).tolist()
    sol = solve_ivp(lambda t,y: derivative(t,y,p), (0,p['duration']), y0,
                    t_eval=np.linspace(0,p['duration'],201), method='Radau', rtol=1e-9, atol=1e-11)
    if not sol.success or len(sol.t)!=201 or not np.isfinite(sol.y).all():
        raise RuntimeError(sol.message)
    if np.min(sol.y)<-1e-7:
        raise RuntimeError('Negative concentration beyond tolerance; inspect parameters and numerics.')
    suffix = 'comparison' if comparison else 'experiment'
    with open(f'lipid-{suffix}.csv','w',newline='',encoding='utf-8') as f:
        writer=csv.writer(f); writer.writerow(['time',*NAMES]); writer.writerows(zip(sol.t,*sol.y))
    return sol

def main():
    a=run(); b=run(True) if CONFIG.get('compare') else None
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'svg.fonttype':'none','axes.spines.top':False,'axes.spines.right':False})
    fig, axes=plt.subplots(2,1,figsize=(10,8),layout='constrained')
    groups=[([13,14,15],'Released fatty acids'),([0,1,2],'Substrates')] if SYN else [([0,1,2,3],'Metabolic pools'),([0,1,2,3],'Comparison of initial conditions')]
    colors=['#3d4df0','#16816d','#c55f35','#7955b6']
    for ax,(ids,title) in zip(axes,groups):
        for i,j in enumerate(ids):
            ax.plot(a.t,a.y[j],color=colors[i],label=NAMES[j])
            if b is not None: ax.plot(b.t,b.y[j],color=colors[i],ls='--')
        ax.set(title=title,xlabel='Time (s)' if SYN else 'Time (arbitrary units)',ylabel='Concentration (µM)' if SYN else 'Pool (arbitrary units)')
        ax.grid(axis='y',color='#e2e7ee',ls='--',lw=.6); ax.legend(frameon=False)
    if b is not None: fig.suptitle('Solid: experiment / dashed: configured comparison')
    for ext in ('png','svg','pdf'): fig.savefig('lipid-replay.'+ext,dpi=300,bbox_inches='tight')
    Path('lipid-configuration.json').write_text(json.dumps(CONFIG,indent=2),encoding='utf-8')
    print('Saved independent Radau trajectories, configuration, PNG, SVG and PDF.')
if __name__=='__main__': main()
