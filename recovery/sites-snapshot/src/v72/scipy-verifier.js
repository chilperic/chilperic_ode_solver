/* Foko Lab v72.24 optional independent SciPy referee via lazy Pyodide. */
(function(root){
  'use strict';
  const DEFAULT_INDEX='https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
  let runtimePromise=null;
  function loadScript(url){return new Promise(function(resolve,reject){const existing=document.querySelector(`script[data-foko-pyodide="${url}"]`);if(existing){if(root.loadPyodide)resolve();else existing.addEventListener('load',resolve,{once:true});return;}const script=document.createElement('script');script.src=url;script.async=true;script.dataset.fokoPyodide=url;script.onload=resolve;script.onerror=function(){reject(new Error('Unable to download the optional Pyodide reference runtime. Check the network or configure a local Pyodide index.'));};document.head.appendChild(script);});}
  async function runtime(progress){
    if(runtimePromise)return runtimePromise;
    runtimePromise=(async function(){
      const index=root.FOKOLAB_PYODIDE_INDEX_URL||DEFAULT_INDEX;
      progress&&progress('Loading optional Python reference runtime…');
      if(!root.loadPyodide)await loadScript(index+'pyodide.js');
      const py=await root.loadPyodide({indexURL:index});
      progress&&progress('Loading NumPy and SciPy into the isolated reference runtime…');
      await py.loadPackage(['numpy','scipy']);
      return py;
    })().catch(function(error){runtimePromise=null;throw error;});
    return runtimePromise;
  }
  const PYTHON=String.raw`
import ast, json, math
import numpy as np
from scipy.integrate import solve_ivp
payload=json.loads(foko_payload_json)
allowed_names=set(payload['vars'])|set(payload.get('params',{}))|{'t','pi','e'}
allowed_funcs={'sin':np.sin,'cos':np.cos,'tan':np.tan,'asin':np.arcsin,'acos':np.arccos,'atan':np.arctan,'sinh':np.sinh,'cosh':np.cosh,'tanh':np.tanh,'exp':np.exp,'log':np.log,'log10':np.log10,'sqrt':np.sqrt,'abs':abs,'min':min,'max':max,'pow':pow,'floor':np.floor,'ceil':np.ceil,'round':round}
allowed_nodes=(ast.Expression,ast.BinOp,ast.UnaryOp,ast.Call,ast.Name,ast.Load,ast.Constant,ast.Add,ast.Sub,ast.Mult,ast.Div,ast.Pow,ast.USub,ast.UAdd,ast.Mod)
def compile_safe(source):
    tree=ast.parse(str(source).replace('^','**'),mode='eval')
    for node in ast.walk(tree):
        if not isinstance(node,allowed_nodes): raise ValueError(f'Unsupported Python reference syntax: {type(node).__name__}')
        if isinstance(node,ast.Name) and node.id not in allowed_names and node.id not in allowed_funcs: raise ValueError(f'Unknown symbol in reference expression: {node.id}')
        if isinstance(node,ast.Call) and (not isinstance(node.func,ast.Name) or node.func.id not in allowed_funcs): raise ValueError('Only the documented mathematical functions are allowed in reference expressions')
    return compile(tree,'<fokolab-expression>','eval')
compiled=[compile_safe(expr) for expr in payload['eqs']]
def rhs(t,y):
    scope={'t':t,'pi':math.pi,'e':math.e,**allowed_funcs,**payload.get('params',{})}
    scope.update({name:float(y[i]) for i,name in enumerate(payload['vars'])})
    return [float(eval(code,{'__builtins__':{}},scope)) for code in compiled]
t_eval=np.asarray(payload['timeGrid'],dtype=float)
method=payload['referenceMethod']
sol=solve_ivp(rhs,(float(payload['t0']),float(payload['t1'])),np.asarray(payload['y0'],dtype=float),method=method,t_eval=t_eval,rtol=float(payload['referenceRtol']),atol=float(payload['referenceAtol']))
result={'ok':bool(sol.success),'message':str(sol.message),'method':method,'T':sol.t.tolist(),'Y':sol.y.tolist(),'nfev':int(sol.nfev),'njev':int(getattr(sol,'njev',0) or 0),'nlu':int(getattr(sol,'nlu',0) or 0),'scipyVersion':__import__('scipy').__version__}
json.dumps(result)
`;
  async function verify(payload,browserResult,progress){
    if(!browserResult||!browserResult.ok)throw new Error('Run the browser model before requesting independent verification.');
    const py=await runtime(progress);
    const method=root.FokoSciPyVerificationCore.chooseReferenceMethod(browserResult);
    const browserRtol=Number(browserResult.diagnostics&&browserResult.diagnostics.rtol)||1e-6;
    const browserAtol=Number(browserResult.diagnostics&&browserResult.diagnostics.atol)||1e-9;
    const request={vars:payload.vars,eqs:payload.eqs,y0:payload.y0,params:payload.params||{},t0:payload.t0,t1:payload.t1,timeGrid:browserResult.T,referenceMethod:method,referenceRtol:Math.max(1e-12,Math.min(1e-9,browserRtol/100)),referenceAtol:Math.max(1e-14,Math.min(1e-12,browserAtol/100))};
    py.globals.set('foko_payload_json',JSON.stringify(request));
    progress&&progress(`Running SciPy ${method} as an independent referee…`);
    const raw=await py.runPythonAsync(PYTHON);
    const reference=JSON.parse(String(raw));
    if(!reference.ok)throw new Error(`SciPy ${method} failed: ${reference.message}`);
    const comparison=root.FokoSciPyVerificationCore.compareTrajectories(browserResult,reference,{rtol:browserRtol,atol:browserAtol});
    return {status:'completed',reference:{engine:'SciPy solve_ivp in Pyodide',method,scipyVersion:reference.scipyVersion,nfev:reference.nfev,njev:reference.njev,nlu:reference.nlu,rtol:request.referenceRtol,atol:request.referenceAtol},comparison,verifiedAt:new Date().toISOString(),networkBoundary:'Pyodide and SciPy are loaded on demand; first verification requires network access unless a local index is configured.'};
  }
  root.FokoSciPyVerifier={verify,DEFAULT_INDEX};
})(window);
