#!/usr/bin/env python3
"""Regenerate the published synthetic case with numpy PCG64 seed 2026."""
from pathlib import Path
import json,math,numpy as np
R=Path(__file__).resolve().parents[2];rng=np.random.default_rng(2026)
model={'name':'Fluorescence decay · measurement case','kind':'ode','vars':['x'],'eqs':['-k*x'],'y0':[1],'params':{'k':[.2,.05,.8],'gain':[3,3,3],'background':[.2,.2,.2]},'t0':0,'t1':6,'points':300,'method':'rk45','rtol':1e-8,'atol':1e-10,'maxStep':'auto','initialStep':'auto','timeUnit':'h','units':{'x':'relative concentration'},'stateLabels':{'x':'Unobserved concentration'},'parameterMeta':{'k':{'label':'Degradation rate','unit':'1/h','source':'Estimated from measurements'},'gain':{'label':'Fluorescence gain','unit':'AU / relative concentration','source':'Fixed calibration in this synthetic case'},'background':{'label':'Background fluorescence','unit':'AU','source':'Fixed background in this synthetic case'}},'observables':[{'id':'signal','label':'Measured fluorescence','expression':'gain*x+background','unit':'AU','source':'Declared synthetic measurement model'}],'question':'Can one shared degradation rate explain fluorescence in two known initial conditions?','assumptions':['Exponential decay within each condition.','Known initial concentrations: 1 and 2 relative units.','Fixed calibrated fluorescence gain and background.','Independent Gaussian measurement errors with known sigma 0.06 AU. This is synthetic verification, not experimental validation.'],'outputVar':'x','outputMetric':'final'}
rows=[]
for cond,x0 in [('low',1),('high',2)]:
 for rep in ['r1','r2']:
  for t in np.linspace(0,6,13):
   rows.append({'rowId':f'{cond}-{rep}-{t:g}','time':float(t),'value':float(3*x0*math.exp(-.35*t)+.2+rng.normal(0,.06)),'observable':'signal','condition':cond,'replicate':rep,'sigma':.06,'unit':'AU','metadata':{'batch':'synthetic-2026'}})
data={'schema':'foko.observations/2','timeUnit':'h','output':'signal','source':'Synthetic verification · seed 2026 · independent Gaussian sigma 0.06 AU','rows':rows,'conditions':{'low':{'parameters':{},'initial':{'x':1}},'high':{'parameters':{},'initial':{'x':2}}},'generation':{'truth':{'k':.35,'gain':3,'background':.2},'randomGenerator':'NumPy default_rng PCG64','seed':2026,'sigma':.06,'notice':'Synthetic data from the analytic expression. Not observations from biological experiments.'}}
case={'id':'fluorescence-v1','model':model,'data':data,'source':'Original verification microcase implementing the state/observation distinction in Scientific Mastery V6.16, chapters 1 and 11. Not a reproduced published experiment.'}
(R/'src/research/measurement-case.js').write_text('/* Analytically generated verification data; never represented as experimental observations. */\n(function(root){const data='+json.dumps(case,separators=(',',':'))+';root.FokoMeasurementCase=data;if(typeof module==="object"&&module.exports)module.exports=data;})(typeof self!=="undefined"?self:globalThis);\n')
(R/'research/measurement-case').mkdir(exist_ok=True)
(R/'research/measurement-case/reference.json').write_text(json.dumps(case,indent=2)+'\n')
