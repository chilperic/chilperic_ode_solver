(function(){
  function countStates(m){ return (m && (m.vars||m.states||m.species||[]).length) || 0; }
  function validate(model, lab){
    const blockers=[], warnings=[]; const n=countStates(model); const type=(lab||model?.type||'unknown').toLowerCase();
    if(n>25 && ['ode','symbolic','steady'].includes(type)) warnings.push('High-dimensional browser run; prefer local Python for validation.');
    if(n>100 && type==='agent') warnings.push('Large grids/agent systems can freeze older browsers.');
    const text=JSON.stringify(model||{}).toLowerCase();
    if(/delay|dde|piecewise|event\(|when\(|root event/.test(text)) blockers.push('Delay/event/piecewise dynamics are not supported by the browser runner.');
    if(/radau|bdf|lsoda|stiff/.test(text)) warnings.push('Stiff solver requested or suspected; browser RK methods are exploratory only.');
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
