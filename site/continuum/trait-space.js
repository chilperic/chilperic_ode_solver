/* Coordinate and ranking utilities only; physiological evaluation stays on the server. */
(function(root){'use strict';
const TNames={pepcShare:'PEPC allocation',sheathShare:'Rubisco in sheath',gs:'Stomatal conductance',gdcBS:'GDC in sheath'};
const units={pepcShare:'fraction of capacity',sheathShare:'fraction of Rubisco',gs:'mol m⁻² s⁻¹',gdcBS:'fraction'};
function factors(c){const names=c.allocationMode==='nitrogen'?{pepcShare:'Pump enzyme nitrogen',sheathShare:'Rubisco nitrogen in sheath',gs:'Stomatal conductance',gdcBS:'GDC in sheath'}:TNames;return[{key:'pepcShare',name:names.pepcShare,unit:c.allocationMode==='nitrogen'?'fraction of variable enzyme N':'fraction of capacity',lo:0,hi:1},{key:'sheathShare',name:names.sheathShare,unit:c.allocationMode==='nitrogen'?'fraction of Rubisco N':'fraction of Rubisco',lo:0,hi:1},{key:'gs',name:names.gs,lo:c.gsMin,hi:c.gsMax},...(c.c2Enabled?[{key:'gdcBS',name:names.gdcBS,lo:0,hi:1}]:[])];}
function value(p,key){if(key==='pepcShare')return p.fractions[0];if(key==='sheathShare'){const rubisco=p.fractions[1]+p.fractions[2];return rubisco>1e-10?p.fractions[2]/rubisco:null;}return p[key]??(key==='gdcBS'?0:null);}
function trait(v){return{fractions:[v.pepcShare,(1-v.pepcShare)*(1-v.sheathShare),(1-v.pepcShare)*v.sheathShare],gs:v.gs,gdcBS:v.gdcBS??0};}
function ranked(a){if(!a||a.constant||a.method==='pca')return[];return a.rows.map((row,i)=>({...a.factors[i],...row,influence:a.method==='sobol'?row.ST:row.muStar})).filter(r=>Number.isFinite(r.influence)).sort((a,b)=>b.influence-a.influence);}
function choose(a){const eligible=ranked(a).filter(f=>Object.hasOwn(names,f.key));if(eligible.length<2)throw Error('At least two ranked evolvable traits are needed.');return eligible.slice(0,2).map(f=>f.key);}
const names=TNames;const api={names,units,factors,value,trait,ranked,choose};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TraitSpace=api;
})(globalThis);
