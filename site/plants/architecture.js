/* Presentation architecture only. Does not change biomass, area, development or yield.
   Reproductive pools are mass compartments, never counted as botanical ears/fruits. */
(function(root){'use strict';
const profiles={
 maize:{name:'Maize',unit:'leaf units',sites:'ears',layout:'alternate',note:'Alternate leaves on a main stem; terminal male tassel and lateral ears. Ear number depends on genotype and conditions.'},
 wheat:{name:'Wheat',unit:'leaf units',sites:'spikes',layout:'tillers',note:'Leaves occur on the main shoot and tillers. A fertile shoot ends in a spike; not every tiller sets grain.'},
 sorghum:{name:'Sorghum',unit:'leaf units',sites:'panicles',layout:'tillers',note:'Alternate leaves and terminal panicles; tillering varies with genotype and growing conditions.'},
 sunflower:{name:'Sunflower',unit:'leaf units',sites:'heads',layout:'branches',note:'Single-headed and branched forms exist. A head contains many flowers and, after seed set, many fruits.'},
 agave:{name:'Agave',unit:'leaf units',sites:'flower clusters',layout:'rosette',note:'Succulent leaves form a basal rosette. Flower clusters sit on a tall stalk; flowering age is not calibrated here.'},
 opuntia:{name:'Prickly pear',unit:'pad units',sites:'fruit sites',layout:'pads',note:'The green pads are flattened stems, not leaves. Flowers and fruits arise at areoles on pads.'},
 flaveria:{name:'Flaveria',unit:'leaf units',sites:'flower clusters',layout:'opposite',note:'Opposite leaves and branched flowering shoots. Geometry is illustrative.'},
 virtual:{name:'Virtual plant',unit:'leaf units',sites:'reproductive sites',layout:'alternate',note:'Shared illustrative architecture for pathway comparisons.'}
};
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
const api={profiles,kind,profile,siteCount,reproduction};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PlantArchitecture=api;
})(globalThis);
