"""Independent native Python executions of the delivered JavaScript example requests."""
from pathlib import Path
import sys,json,time
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'python'))
from fokolab_reference import run
out=[]
for file in sorted((ROOT/'evidence/reference-results').glob('*.json')):
 source=json.loads(file.read_text());q=source['request'];start=time.perf_counter()
 try:
  observed=run(q);a=np.asarray(observed['rows']);b=np.asarray(source['rows'])
  assert a.shape==b.shape,(a.shape,b.shape)
  assert observed['columns']==source['columns'],'Column contract mismatch'
  relative=float(np.max(np.abs(a-b)/(1+np.abs(b))));absolute=float(np.max(np.abs(a-b)))
  if q['lab']=='fractals' and q['method']=='mandelbrot':
   match=float(np.mean(a[:,2]==b[:,2]));assert np.allclose(a[:,:2],b[:,:2],atol=1e-12,rtol=0);assert match>=.995,match
   detail={'exactEscapeFraction':match,'criterion':'Coordinates within 1e-12; >=99.5% identical finite escape counts. Floating-point sensitivity near the boundary is recorded.'}
  else:
   tolerance=2e-5 if q['lab'] in ('lipids','tcell') or (q['lab']=='leaf' and q['method']=='heat') else 2e-9
   assert relative<tolerance,(relative,tolerance)
   detail={'scaledErrorBound':tolerance}
  out.append({'case':file.stem,'status':'passed','maxAbsoluteDifference':absolute,'maxScaledDifference':relative,'seconds':time.perf_counter()-start,**detail});print('PASS',file.stem,relative,flush=True)
 except Exception as e:
  out.append({'case':file.stem,'status':'failed','error':str(e)});print('FAIL',file.stem,e,flush=True)
(ROOT/'evidence/python-comparison.json').write_text(json.dumps({'scope':'Fresh native Python reference vs JS tables. ODE and thermal reference use independent SciPy DOP853. Other algorithms are separate implementations of the same declared equations. Not empirical validation.', 'results':out},indent=2))
if any(r['status']=='failed' for r in out):sys.exit(1)
