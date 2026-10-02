/* Model Studio compute protocol. Identical math in worker and bounded fallback. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.FokoStudioCompute=api;})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  function compile(model, math) {
    if (!math || !math.parse) throw new Error('The equation parser is not available.');
    const functions=new Set(['sin','cos','tan','asin','acos','atan','exp','log','sqrt','abs','min','max','pow','floor','ceil','round']);
    const symbols=new Set(['t','pi','e',...model.vars,...Object.keys(model.params),...functions]);
    const types=new Set(['OperatorNode','ConstantNode','SymbolNode','ParenthesisNode','FunctionNode']);
    const equations=model.eqs.map((source,i)=>{
      if(String(source).length>5000)throw new Error(`Equation ${i+1} exceeds the browser expression-size limit.`);
      const node=math.parse(source);
      node.traverse(child=>{
        if(!types.has(child.type))throw new Error(`Equation ${i+1}: ${child.type} is not a scalar mathematical expression.`);
        if(child.isSymbolNode&&!symbols.has(child.name))throw new Error(`Equation ${i+1}: unknown symbol ${child.name}.`);
        if(child.isFunctionNode&&!functions.has(child.fn.name))throw new Error(`Equation ${i+1}: unsupported function ${child.fn.name}.`);
      });
      return node.compile();
    });
    return (t,y,params)=>{
      const scope={t,...params};model.vars.forEach((name,i)=>{scope[name]=y[i];});
      return equations.map((eq,i)=>{
        const raw=eq.evaluate(scope),value=typeof raw==='number'?raw:NaN;
        if(!Number.isFinite(value))throw new Error(`Equation ${i+1} became non-finite at t=${t}: ${model.eqs[i]}. Check divisions, model domains and parameter scaling.`);
        return value;
      });
    };
  }
  function config(model,overrides,stepBudget){
    return {vars:model.vars,y0:model.y0,t0:model.t0,t1:model.t1,points:model.points,method:model.method,rtol:model.rtol,atol:model.atol,initialStep:model.initialStep,maxStep:model.maxStep,stepBudget,
      params:Object.assign({},Object.fromEntries(Object.entries(model.params).map(([key,row])=>[key,row[0]])),overrides||{})};
  }
  function metric(result,index,kind){
    const values=result.Y[index];
    if(!values)throw new Error('Select an existing output state.');
    if(kind==='final')return values.at(-1);
    if(kind==='max')return Math.max(...values);
    if(kind==='min')return Math.min(...values);
    if(kind==='mean')return values.reduce((s,v)=>s+v,0)/values.length;
    if(kind==='range')return Math.max(...values)-Math.min(...values);
    if(kind!=='integral')throw new Error('Unknown response metric.');
    let area=0;for(let i=1;i<values.length;i++)area+=(values[i-1]+values[i])*(result.T[i]-result.T[i-1])/2;return area;
  }
  function sweepDefinition(model,options){
    const {xName,yName,output,metric:kind,grid}=options;
    if(!model.params[xName]||!model.params[yName]||xName===yName)throw new Error('Choose two different declared sweep parameters.');
    if(!Number.isInteger(grid)||grid<5||grid>25)throw new Error('Sweep resolution must be an integer from 5 to 25.');
    if(!model.vars.includes(output))throw new Error('Select an existing output state.');
    const axis=key=>{const p=model.params[key];if(p[1]===p[2])throw new Error(`Give ${key} a nonzero range before sweeping.`);return Array.from({length:grid},(_,i)=>p[1]+(p[2]-p[1])*i/(grid-1));};
    return {xName,yName,output,metric:kind,grid,x:axis(xName),y:axis(yName),index:model.vars.indexOf(output)};
  }
  function abort(){const error=new Error('Run cancelled.');error.name='AbortError';return error;}
  async function execute(request,dependencies,hooks={}){
    const {model,kind,settings={}}=request,{ODE,math}=dependencies;
    const rhs=compile(model,math),now=()=>typeof performance!=='undefined'?performance.now():Date.now();
    const cancelled=hooks.cancelled||(()=>false),progress=hooks.progress||(()=>{});
    const solve=overrides=>{if(cancelled())throw abort();const result=ODE.solveWithRhs(config(model,overrides,hooks.stepBudget),rhs,{cancelled,progress});if(!result.ok)throw abort();return result;};
    if(kind==='simulation')return solve();
    if(kind!=='parameter-sweep')throw new Error('Unknown experiment type.');
    const definition=sweepDefinition(model,settings),z=[],started=now();let evaluations=0,totalSteps=0;
    for(let row=0;row<definition.y.length;row++){
      const values=[];
      for(let column=0;column<definition.x.length;column++){
        const result=solve({[definition.xName]:definition.x[column],[definition.yName]:definition.y[row]});
        values.push(metric(result,definition.index,definition.metric));evaluations+=result.diagnostics.functionEvaluations;totalSteps+=result.diagnostics.accepted+result.diagnostics.rejected;
        if(totalSteps>2000000)throw new Error('Sweep exceeded the 2,000,000-step browser budget. Reduce the grid or time span; no partial surface was reported.');
        if(hooks.yieldControl)await hooks.yieldControl();
      }
      z.push(values);progress((row+1)/definition.grid,`Sweep row ${row+1}/${definition.grid}`);
    }
    return {...definition,z,evaluations,runtime:now()-started,outputPoints:model.points};
  }
  return Object.freeze({compile,config,metric,sweepDefinition,execute,abort});
});
