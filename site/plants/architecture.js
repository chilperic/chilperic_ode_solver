/* Presentation architecture only. Does not change biomass, area, development or yield.
   Reproductive pools are mass compartments, never counted as botanical ears/fruits. */
(function(root){'use strict';
const Species=typeof module!=='undefined'&&module.exports?require('./species.js'):root.PlantSpecies;
const profiles={...Species.catalog,virtual:{name:'Virtual plant',unit:'leaf units',sites:'reproductive sites',layout:'alternate',note:'Shared illustrative architecture for pathway comparisons.'}};
function kind(c,type){return c.traitMode==='presets'?(c['plant'+type]||'virtual'):'virtual';}
function profile(k){return profiles[k]||profiles.virtual;}
function siteCount(value){const n=Number(value);return Number.isFinite(n)?Math.max(1,Math.min(50,Math.round(n))):1;}
function reproduction(r,k,value){
 const n=siteCount(value),flower=Math.max(0,r.flower||0),fruit=Math.max(0,r.fruit||0);
 // Equal division is an explicit display assumption, not a sink competition model.
 const active=(k==='maize'?fruit:flower+fruit)>1e-8;
 return {count:active?n:0,requested:n,label:profile(k).sites,
  sites:active?Array.from({length:n},(_,id)=>({id,flower:flower/n,fruit:fruit/n})):[],calibrated:false};
}
// Stable visual variation: independent of weather randomness and animation frame.
function variation(i,salt=0){const v=Math.sin((i+1)*127.1+salt*311.7)*43758.5453;return v-Math.floor(v);}
function padPoint(p,a=0){const xx=Math.sin(a)*p.width*.64,yy=-p.length*(.5+.5*Math.cos(a));return{x:p.x+xx*Math.cos(p.angle)-yy*Math.sin(p.angle),y:p.y+xx*Math.sin(p.angle)+yy*Math.cos(p.angle)};}
function pads(masses,built=[],areaScale=1){
 const nodes=[],children=[];
 for(let i=0;i<masses.length;i++){
  const mass=Math.max(0,masses[i]||0),visible=mass>1e-7;
  // A spent ancestor remains a brown structural attachment, never new green mass.
  const size=Math.sqrt(visible?mass:Math.max(.03,(built[i]||0)*.18))*areaScale;
  let parentId=-1,x=0,y=0,angle=-.09,attachmentAngle=0;
  if(i){const available=nodes.filter(p=>children[p.id]<2),j=available.length-1-Math.floor(variation(i,2)*Math.min(4,available.length)),p=available[Math.max(0,j)];parentId=p.id;const side=children[p.id]===0?(variation(p.id,4)>.48?1:-1):(variation(p.id,4)>.48?-1:1);attachmentAngle=side*(.25+.58*variation(i,5));({x,y}=padPoint(p,attachmentAngle));angle=p.angle*.35+side*(.22+.40*variation(i,6));children[p.id]++;}
  const n={id:i,parentId,x,y,angle,attachmentAngle,length:53*size*(.87+.24*variation(i,7)),width:25*size*(.88+.22*variation(i,8)),mass,visible,progress:Math.max(0,Math.min(1,built[i]||0)),survival:visible?Math.min(1,mass/Math.max(1e-9,built[i]||mass)):0,side:angle<0?-1:1,depth:i};nodes.push(n);children.push(0);
 }
 return nodes;
}
const api={profiles,kind,profile,siteCount,reproduction,variation,pads,padPoint};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PlantArchitecture=api;
})(globalThis);
