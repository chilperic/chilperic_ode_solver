/* Operational display diagnostics; these rules never enter selection or physiology. */
(function(root){'use strict';
const defaults={c3Min:.8,c4Max:.1,pumpMax:.1,recyclingMin:.02,recyclingStrong:.1};
const labels={c3:'C3-like',incipient:'Incipient C2',c2:'C2 / Type I-like',c2c4:'C2 + C4 / Type II-like',intermediate:'Mixed C3–C4',c4:'C4-like',other:'Other allocation'};
function validate(input={}){const c={...defaults,...input};for(const k of Object.keys(defaults))if(!Number.isFinite(c[k])||c[k]<0||c[k]>1)throw Error('Classification threshold '+k+' must be between 0 and 1.');if(c.c3Min<.5||c.c4Max>=c.c3Min||c.recyclingStrong<=c.recyclingMin)throw Error('Separate the C3/C4 boundaries and the weak/strong recycling thresholds.');return c;}
function classify(p,input=defaults){const c=validate(input),f=p.fractions;if(!Array.isArray(f)||f.length!==3||!f.every(Number.isFinite)||f.some(x=>x< -1e-10)||Math.abs(f.reduce((a,b)=>a+b,0)-1)>1e-8)return 'other';
 const [fp,fm,fb]=f,activity=Number.isFinite(p.pumpRatio)&&Number.isFinite(p.recyclingRatio),pump=activity?p.pumpRatio:0,recycle=activity?p.recyclingRatio:0;
 // Allocation-only results retain explicit allocation proxies; no GDC flag can imply active recycling.
 if(fm>=c.c3Min-1e-12&&(!activity||(pump<=c.pumpMax+1e-12&&recycle<c.recyclingStrong)))return 'c3';
 if(fm<=c.c4Max+1e-12&&fp>=.1-1e-12&&fb>=.1-1e-12&&(!activity||pump>c.pumpMax))return 'c4';
 if(activity&&fm>0&&fb>0&&recycle>=c.recyclingMin){if(recycle<c.recyclingStrong)return 'incipient';return pump<=c.pumpMax+1e-12?'c2':'c2c4';}
 return fm>0&&fb>0&&(fp>0||activity&&recycle>0)?'intermediate':'other';
}
const api={defaults,labels,validate,classify};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StrategyClassifier=api;
})(globalThis);
