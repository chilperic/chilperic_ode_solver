/** Add original research reductions without removing or changing any existing starter. */
(function(root){'use strict';
const out={...root.FokoModelStudioPresets};
const entries=[['original_fadns','FADNS semi-mechanistic'],['original_fa_metabolism','FA metabolism bistability']];
for(const [id,name] of entries){const m=root.FokoPreservedModels?.[name];if(!m)continue;out[id]={...JSON.parse(JSON.stringify(m)),title:name,family:'Original public research reduction',difficulty:'advanced',question:'Which source-defined balances and numerical limits constrain this mechanism?',note:'Original 79.1 equations and parameter ranges retained. This public reduction is not the protected or experimentally validated full research implementation.',outputVar:m.vars.at(-1),outputMetric:'final',points:500,method:'rk45',rtol:1e-7,atol:1e-9};}
root.FokoModelStudioPresets=Object.freeze(out);
}(typeof self!=='undefined'?self:globalThis));
