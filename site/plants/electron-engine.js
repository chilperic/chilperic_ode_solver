/* Reduced steady-state chloroplast energy budget, not a kinetic/redox model.
   Stoichiometry and assumptions are exposed in the interface and source register. */
(function(root){'use strict';
const defaults={energyMode:'budget',absorptance:.84,photoLoss:.15,cefC3:.2,cefC4:.6,cefCAM:.35,ndhFraction:.3,hPerATP:14/3,camDayATP:2,camNightATP:1,respATPPerC:5,psiiActivity:1,psiActivity:1,b6fActivity:1};
function validate(c){for(const[k,v]of Object.entries(defaults))c[k]??=v;if(!['budget','legacy'].includes(c.energyMode))throw Error('Choose a valid electron-transport model.');for(const k of ['absorptance','photoLoss','ndhFraction','psiiActivity','psiActivity','b6fActivity'])if(!Number.isFinite(c[k])||c[k]<0||c[k]>1)throw Error(k+' must lie between 0 and 1.');for(const k of ['cefC3','cefC4','cefCAM'])if(!Number.isFinite(c[k])||c[k]<0||c[k]>3)throw Error(k+' must lie between 0 and 3.');for(const[k,lo,hi]of [['hPerATP',3,6],['camDayATP',0,5],['camNightATP',0,5],['respATPPerC',1,6]])if(!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)throw Error(k+' is outside its supported range.');return c;}
function supply(par,jmax,c,type){const ratio=c['cef'+type],photons=Math.max(0,par)*c.absorptance*(1-c.photoLoss),a=photons/(2+ratio),capacity=Math.max(0,jmax)*Math.min(c.psiiActivity,c.psiActivity/(1+ratio),c.b6fActivity/(1+ratio)),theta=.7,sum=a+capacity,J=sum>0?2*a*capacity/(sum+Math.sqrt(Math.max(0,sum*sum-4*theta*a*capacity))):0,cyclic=ratio*J,h=3*J+(2+2*c.ndhFraction)*cyclic;return{lef:J,cef:cyclic,cefPgr:(1-c.ndhFraction)*cyclic,cefNdh:c.ndhFraction*cyclic,atp:h/c.hPerATP,nadph:J/2,protons:h,oxygen:J/4,photonsUsed:2*J+cyclic,photons,ratio};}
// C4 uses this Calvin-cycle cost plus 2 ATP per realized PEPC turnover in c4-engine.js.
function cost(ci,gamma,type,c){if(ci<=gamma)return{atp:Infinity,nadph:Infinity};return{atp:(3*ci+7*gamma)/(ci-gamma)+(type==='CAM'?c.camDayATP:0),nadph:2*(ci+2*gamma)/(ci-gamma)};}
function limit(ci,gamma,type,c,e){const k=cost(ci,gamma,type,c);return Math.max(0,Math.min(e.atp/k.atp,e.nadph/k.nadph));}
const api={defaults,validate,supply,cost,limit};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ElectronModel=api;
})(globalThis);
