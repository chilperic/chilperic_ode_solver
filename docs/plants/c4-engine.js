/* Coupled reduced C4 steady state: von Caemmerer (2021), equations 3–5,
   7–19, 27–28, 32–37 and 50. Whole-leaf energy supply is partitioned by x.
   Mitochondrial respiration remains in the plant ledger (Rm=Rd=0 here),
   bundle-sheath O2 is fixed at atmospheric O2, and no decarboxylation subtype
   or cell-specific redox transport is resolved. This is not the full paper model. */
(function(root){'use strict';
function arrhenius(v,ea,T){return v*Math.exp(ea*(T-25)/(8.314*298.15*(T+273.15)));}
function parameters(T,c,multiplier=1){return{Kc:arrhenius(1210,64200,T),Ko:arrhenius(292,10500,T),gamma:arrhenius(.0003817*210000,31100,T),Kp:arrhenius(c.c4Kp25??82,38300,T),Vp:arrhenius((c.c4Vpmax??66)*multiplier,50100,T),Vpr:c.c4Vpr??80,gm:arrhenius(c.c4Gm??1,49800,T),gbs:c.c4Gbs??.003,x:c.c4ATPshare??.4};}
// Positive root of g*b*C² + (g*d+a-P*b)C - (P*d+a*Gamma)=0.
// Solves P - g*C = a*(C-Gamma)/(b*C+d) with a stable quadratic formula.
function concentration(P,g,a,b,d,G){const q=g*d+a-P*b,u=P*d+a*G,disc=Math.sqrt(q*q+4*g*b*u);return q>=0?2*u/(q+disc):(-q+disc)/(2*g*b);}
function solve(ca,gs,p,stress=1){const gm=p.gm??1,gbs=p.gbs??.003,x=p.x??.4,G=p.gamma,V=p.V*stress,K=p.Kc*(1+210/p.Ko),Vpmax=(p.Vp??1.1*p.V)*stress,Kp=p.Kp??82,Vpr=p.Vpr??80,energy=p.energy,atp=energy?.atp??Infinity,nadph=energy?.nadph??p.J/3;
const empty={A:0,ci:ca,cm:ca,cbs:ca,pump:0,leak:0,leakiness:0,c4CarbonResidual:0,c4DiffusionResidual:0,atpDemand:0,nadphDemand:0};if(gs<=0||gm<=0||p.J<=0||V<=0||nadph<=0||atp<=0)return empty;
const conductance=1/(1.6/gs+1/gm);
function at(cm){const pump=Math.min(Vpmax*cm/(cm+Kp),Vpr,energy?x*atp/2:Infinity),P=pump+gbs*cm;if(P/gbs<=G)return{...empty,cm,cbs:P/gbs,pump,leak:pump,leakiness:pump>1e-10?1:0,atpDemand:2*pump};
let cb=concentration(P,gbs,V,1,K,G);cb=Math.max(cb,concentration(P,gbs,nadph,2,4*G,G));if(energy)cb=Math.max(cb,concentration(P,gbs,(1-x)*atp,3,7*G,G));
const leak=gbs*(cb-cm),A=Math.max(0,pump-leak),calvinATP=A*(3*cb+7*G)/(cb-G),nadphDemand=2*A*(cb+2*G)/(cb-G);return{A,cm,cbs:cb,pump,leak,leakiness:pump>1e-10?leak/pump:0,atpDemand:calvinATP+2*pump,nadphDemand,c4CarbonResidual:pump-leak-A};}
let lo=0,hi=ca;for(let i=0;i<44;i++){const mid=(lo+hi)/2;if(at(mid).A>conductance*(ca-mid))hi=mid;else lo=mid;}const r=at((lo+hi)/2),ci=ca-1.6*r.A/gs;r.ci=ci;r.c4DiffusionResidual=Math.max(Math.abs(r.A-gm*(ci-r.cm)),Math.abs(r.A-gs/1.6*(ca-ci)));return r;}
const api={parameters,solve,concentration};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.C4Model=api;
})(globalThis);
