#!/usr/bin/env python3
"""Independent, analytic/SciPy reproduction of the synthetic measurement case.

Run from any directory: python3 research/measurement-case/reproduce.py
Optional --compare path/to/measurement-fit.json checks a FokoLab run.
This verifies a synthetic pipeline; it makes no empirical biological claim.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import minimize_scalar


def reproduce() -> dict:
    case = json.loads(Path(__file__).with_name('reference.json').read_text())
    rows = case['data']['rows']
    time = np.array([r['time'] for r in rows], dtype=float)
    value = np.array([r['value'] for r in rows], dtype=float)
    sigma = np.array([r['sigma'] for r in rows], dtype=float)
    initial = np.array([case['data']['conditions'][r['condition']]['initial']['x'] for r in rows])
    unique = np.unique(time)
    cutoff = unique[int(np.floor(len(unique) * 0.7)) - 1]
    train = time <= cutoff
    def prediction(k: float) -> np.ndarray:
        return 3.0 * initial * np.exp(-k * time) + 0.2
    def loss(k: float) -> float:
        return float(np.mean(((prediction(k)[train] - value[train]) / sigma[train]) ** 2))
    result = minimize_scalar(loss, bounds=(0.05, 0.8), method='bounded', options={'xatol':1e-13})
    if not result.success:
        raise RuntimeError(result.message)
    sol = solve_ivp(lambda t,x: -0.35*x, (0,6), [1.0], t_eval=unique, rtol=1e-11, atol=1e-13)
    if not sol.success:
        raise RuntimeError(sol.message)
    answer = {
        'source':'Synthetic verification, PCG64 seed 2026; not measured laboratory data.',
        'generator':'x=x0*exp(-0.35*t), y=3*x+0.2+N(0,0.06**2)',
        'method':'Analytic prediction with SciPy bounded scalar minimization',
        'reference_k':float(result.x), 'train_rows':int(train.sum()),'test_rows':int((~train).sum()),
        'cutoff':float(cutoff),'train_standardized_rmse':float(np.sqrt(result.fun)),
        'heldout_rmse':float(np.sqrt(np.mean((prediction(result.x)[~train]-value[~train])**2))),
        'scipy_decay_max_error':float(np.max(np.abs(sol.y[0]-np.exp(-0.35*unique)))),
    }
    return answer


def main() -> None:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compare',type=Path)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    result=reproduce()
    if args.compare:
        payload=json.loads(args.compare.read_text())
        fit=payload['result']
        if len(fit['rows'])!=52 or fit['split']['nTrain']!=36 or fit['split']['nTest']!=16:
            raise AssertionError('Observation or split alignment mismatch.')
        error=abs(fit['fitted']['k']-result['reference_k'])
        # FokoLab stops at a declared coordinate resolution, not SciPy precision.
        if error>0.0002:
            raise AssertionError(f'Estimated k differs from analytic reference by {error}.')
        model=payload['model'];rows=payload['data']['rows']
        observed=np.array([r['value'] for r in rows]);times=np.array([r['time'] for r in rows])
        initial=np.array([payload['data']['conditions'][r['condition']]['initial']['x'] for r in rows])
        predicted=3*initial*np.exp(-fit['fitted']['k']*times)+.2
        residual=float(np.max(np.abs(np.asarray(fit['predictions']['mechanistic'])-predicted)))
        if residual>1e-6:
            raise AssertionError(f'Observation predictions differ from analytic values by {residual}.')
        tr=fit['split']['trainIndices'];g=fit['regressions']['signal']['dataOnly']
        z=(times[tr]-g['center'])/g['scale'];sig=np.array([rows[i]['sigma'] for i in tr])
        A=np.column_stack([z**j for j in range(g['degree']+1)])/sig[:,None]
        reg=np.sqrt(g['ridge'])*np.eye(g['degree']+1)[1:]
        beta=np.linalg.lstsq(np.vstack([A,reg]),np.r_[observed[tr]/sig,np.zeros(g['degree'])],rcond=None)[0]
        coef_error=float(np.max(np.abs(beta-np.array(g['coefficients']))))
        if coef_error>1e-9:
            raise AssertionError('Weighted QR regression disagrees with NumPy least squares.')
        result['comparison']={'passed':True,'k_absolute_error':error,'observation_max_error':residual,
                              'regression_coefficient_max_error':coef_error,'checks':4}
    text=json.dumps(result,indent=2)+'\n'
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(text)
    print(text,end='')

if __name__=='__main__':
    main()
