(function(){
  function countStates(m){ return (m && (m.vars||m.states||m.species||[]).length) || 0; }
  function validate(model, lab){
    const blockers=[], warnings=[];

    // FIX A: null/undefined model is not runnable — block immediately before any property access.
    if(!model){
      blockers.push('No model supplied.');
      return {ok:false, lab:(lab||'unknown').toLowerCase(), stateCount:0, browserRunnable:false, warnings, blockers, recommendedRoute:'export-python'};
    }

    const n=countStates(model); const type=(lab||model?.type||'unknown').toLowerCase();
    if(n>25 && ['ode','symbolic','steady'].includes(type)) warnings.push('High-dimensional browser run; prefer local Python for validation.');
    if(n>100 && type==='agent') warnings.push('Large grids/agent systems can freeze older browsers.');

    // FIX B: restrict searches to model.method and model.eqs only.
    // Searching JSON.stringify(model) causes false positives when narrative
    // strings contain words like 'stiffness' or 'Radau' (e.g. Van der Pol).
    const methodStr = (model.method || '').toLowerCase();
    const eqStr     = (model.eqs   || []).join(' ').toLowerCase();

    // FIX C: detect both keyword-style delays AND call-style delays x(t-1) / x(t+tau).
    // The original regex only matched explicit keywords; it missed the common
    // mathematical notation where a state variable is evaluated at a shifted time.
    const delayKeyword   = /delay|dde|piecewise|event\(|when\(|root event/.test(eqStr);
    const delayCallStyle = /\w+\s*\(\s*t\s*[-+]/.test(eqStr); // catches x(t-1), y(t+tau)
    if(delayKeyword || delayCallStyle)
      blockers.push('Delay/event/piecewise dynamics are not supported by the browser runner.');

    // Stiff-solver warning: only fires when method is explicitly set to a stiff solver.
    if(/radau|bdf|lsoda|stiff/.test(methodStr))
      warnings.push('Stiff solver requested or suspected; browser RK methods are exploratory only.');

    let recommendedRoute='run-browser';
    if(blockers.length) recommendedRoute='export-python'; else if(warnings.length) recommendedRoute='run-with-warning';
    return {ok:!blockers.length, lab:type, stateCount:n, browserRunnable:!blockers.length, warnings, blockers, recommendedRoute};
  }
  function message(v){
    if(!v) return 'No model checked.';
    if(v.blockers?.length) return 'Browser run blocked: '+v.blockers.join(' ')+ ' Generate a local script instead.';
    if(v.warnings?.length) return 'Runnable with warning: '+v.warnings.join(' ');
    return 'Browser-runnable model. Export for final validation.';
  }
  window.FokoModelValidator={validate,message};
})();
