/* Display-only interpolation and shared organ counts. No tissue is created here. */
(function(root){'use strict';
const visible=1e-7;
function counts(r){let living=0,expanded=0,formed=0;for(let i=0;i<r.leafUnits.length;i++){if((r.leafBuilt[i]||0)>visible)formed++;if(r.leafUnits[i]>visible){living++;if((r.leafBuilt[i]||0)>=.99)expanded++;}}return{living,expanded,expanding:living-expanded,formed};}
function frame(rows,hour){const at=Math.max(0,Math.min(rows.length-1,hour)),i=Math.floor(at),a=rows[i],b=rows[Math.min(i+1,rows.length-1)],f=at-i;return Object.fromEntries(Object.entries(a).map(([k,v])=>[k,Array.isArray(v)?Array.from({length:Math.max(v.length,b[k].length)},(_,j)=>(v[j]||0)+((b[k][j]||0)-(v[j]||0))*f):['stage','leafCount','leafOpportunities'].includes(k)?v:typeof v==='number'?v+(b[k]-v)*f:v]));}
function summary(rows,hour,c,type){const r=frame(rows,hour),first=rows[0],previous=frame(rows,Math.max(0,hour-24)),change=r.biomass-first.biomass,dayChange=r.biomass-previous.biomass,n=counts(r);let limitation;
 if(c.developmentMode==='thermal'&&r.stage===0)limitation='Awaiting emergence; growth uses seed reserves after emergence.';
 else if(c.developmentMode==='thermal'&&r.stage===4)limitation='Maturity reached; this model stops new construction.';
 else if(r.stress<.5)limitation='Water is limiting expansion. Inspect soil water and irrigation.';
 else if(r.nStress<.5)limitation='Nitrogen is limiting expansion. Inspect soil nitrogen and fertilizer.';
 else if(r.growthRate<1e-7&&r.reserve<.01)limitation='Carbon reserves are depleted; new tissue cannot be built yet.';
 else if(r.growthRate<1e-7)limitation='Construction is currently slow; check temperature and available reserves.';
 else limitation='New tissue is being built from available carbon and nitrogen.';
 let appearance=c.developmentMode==='thermal'?Math.floor(r.leafOpportunities)+' appearance opportunities so far; '+n.formed+' organs have received enough tissue to draw.':'Legacy mode: counts are biomass units, not predicted individual leaves.';
 if(c.developmentMode==='thermal'&&r.stage>=2)appearance='New leaf appearance has ended at the flowering threshold.';
 else if(c.developmentMode==='thermal'&&c['finalLeaves'+type]>0&&r.leafOpportunities>=c['finalLeaves'+type])appearance='Configured final leaf count reached; existing leaves can still expand.';
 else if(c.developmentMode==='thermal'&&c['developmentScale'+type]!==1)appearance+=' Timing multiplier '+c['developmentScale'+type]+' is an editable slow-development assumption.';
 return{r,...n,change,dayChange,limitation,appearance};}
const api={visible,counts,frame,summary};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GrowthPlayback=api;
})(globalThis);
