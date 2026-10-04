/** Classify an evaluated state without changing its equations or feasibility. */
(function(root){'use strict';
const finite=Number.isFinite;
function diagnose(row){const ph=row?.physics||{},residuals=ph.residual||ph.leafResidual||[],residual=finite(ph.heatResidual)?ph.heatResidual:residuals.length?Math.max(...residuals.map(Math.abs)):null;
 const heatConverged=residual!==null&&finite(residual)&&residual<1e-5,E=ph.E,supply=ph.supply,deficit=finite(E)&&finite(supply)?E-supply:null;
 let code='unresolved',title='Equilibrium not resolved',explanation='Inspect solver residuals, parameter ranges and the original model diagnostics.';
 if(row?.valid){code='valid';title='Feasible evaluated equilibrium';explanation='The tested heat, hydraulic and carbon conditions are satisfied for this input.';}
 else if(heatConverged&&deficit!==null&&deficit>1e-10){code='hydraulic_limit';title='Hydraulic constraint violated';explanation='The heat equations converged, but the prescribed stomatal conductance demands more transpiration than this soil–leaf hydraulic supply permits. This rejects this fixed-trait state; it does not prove that no equilibrium exists at this air temperature.';}
 else if(!heatConverged){code='solver_unresolved';title='Thermal solution not resolved';explanation='The solver residual or temperature domain failed its acceptance criteria. Non-convergence is not proof of physical nonexistence.';}
 else if(row?.reason?.includes('Carbon')){code='carbon_unresolved';title='Carbon balance not resolved';explanation='The physical candidate passed its heat check; carbon residuals did not meet the acceptance criterion.';}
 else{code='domain_violation';title='State outside model constraints';}
 return{code,title,explanation,heatConverged,heatResidual:residual,transpiration_mmol:finite(E)?E*1000:null,supply_mmol:finite(supply)?supply*1000:null,deficit_mmol:deficit===null?null:Math.max(0,deficit)*1000,excessPercent:finite(supply)&&supply>0?100*Math.max(0,deficit)/supply:null,sourceReason:row?.reason||'',units:{water:'mmol H2O m^-2 s^-1',heatResidual:'W m^-2'},noSubstitution:true};}
const api={diagnose};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LeafDiagnostics=api;
})(globalThis);
