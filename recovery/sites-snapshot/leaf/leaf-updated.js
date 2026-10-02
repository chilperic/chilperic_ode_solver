/* Resource-constrained extension of the supplied C3–C4 continuum.
 * Pressure-based chemistry (µbar), molar conductances, and SI heat/water fluxes.
 * Whole-leaf ATP/NADPH allocation is an explicit reduced-model assumption.
 * Original source equations remain in leaf-engine.js for comparison.
 */
(function(root){'use strict';
const Thermal=typeof module!=='undefined'&&module.exports?require('../shared/soil-thermal.js'):root.SoilThermal;
const R=8.3145,T25=298.15;
const defaults={...Thermal.defaults,soilMode:'equilibrium',pressure:101325,g_bw:1,jmax25:260,cef:.4,hPerATP:14/3,ndhFraction:.3,photoLoss:.15,pumpATPshare:.4,vpr:80};
function temp(v,t,ea,hd,s=0){return v*Math.exp(ea*(t-T25)/(T25*R*t))*(hd===undefined?1:(1+Math.exp((T25*s-hd)/(T25*R)))/(1+Math.exp((t*s-hd)/(t*R))));}
function vapor(t){return Thermal.vapor(t);}
function validate(p){Thermal.validate(p);if(!['equilibrium','prescribed'].includes(p.soilMode??'equilibrium'))throw Error('Choose a soil thermal mode.');for(const[k,[lo,hi]]of Object.entries({pressure:[60000,110000],g_bw:[.01,10],jmax25:[0,1000],cef:[0,3],hPerATP:[3,6],ndhFraction:[0,1],photoLoss:[0,1],pumpATPshare:[0,.95],vpr:[0,500],g_h:[.01,10],u_a:[.1,2000],k_l:[1e-11,1e-6],leaf_water_potential:[-5000000,-10000]})){const v=p[k]??defaults[k];if(!Number.isFinite(v)||v<lo||v>hi)throw Error(k+' is outside '+lo+'–'+hi+'.');}}
function physical(input,gs){const p={...defaults,...input},air=p.airC+273.15,transmitted=((1-p.f_canopy)+p.f_canopy*p.tau_mes*p.tau_bs)*p.solar_irradiance,reflection=p.rho_soil*transmitted;
 const im=p.f_canopy*p.alpha_mes*p.solar_irradiance+p.gamma_mes*reflection,ib=p.f_canopy*p.tau_mes*p.alpha_bs*p.solar_irradiance+p.gamma_bs*reflection,effectiveGs=1/(1/gs+1/p.g_bw),ea=p.rel_humidity/100*vapor(air);
 const h=Thermal.regulate({p,mode:p.soilMode,absorbed:[im,ib],soilAbsorbed:(1-p.rho_soil)*transmitted,lai:1,airC:p.airC,rh:p.rel_humidity/100,wetness:p.rel_soil_wetness,pressure:p.pressure,emissivity:p.leaf_emissivity,latent:p.lambda_heat,heatConductance:p.c_p*p.g_h,ua:p.u_a,leafWater:tm=>{const vpd=Math.max(0,vapor(tm)-ea);return{E:effectiveGs*vpd/p.pressure,vpd};}},p.loopC4Only===1);
 const[tm,tb]=h.leaf,psiSatPa=p.psi_sat*98.0665,psiSoil=psiSatPa*p.rel_soil_wetness**(-p.b),supply=Math.max(0,p.k_l*(psiSoil-p.leaf_water_potential));
 return{...h,tm,tb,im,ib,ea,effectiveGs,latent:p.lambda_heat*h.E,rm:h.radiation[0]+h.soilRadiation[0],rb:h.radiation[1]+h.soilRadiation[1],psiSatPa,psiSoil,supply,hydraulicMargin:supply-h.E,valid:h.valid&&h.E<=supply+1e-10};}
function energy(p,ph){const par=(ph.im+ph.ib)*.45*4.57,photons=par*(1-p.photoLoss),a=photons/(2+p.cef),cap=p.jmax25,sum=a+cap;
 const lef=sum>0?2*a*cap/(sum+Math.sqrt(Math.max(0,sum*sum-2.8*a*cap))):0,cef=p.cef*lef;
 return{absorbedPAR:par,lef,cef,atp:(3*lef+(2+2*p.ndhFraction)*cef)/p.hPerATP,nadph:lef/2};
}
function chemistry(input,ph,gs,fractions){const p={...defaults,...input},[fp,fm,fb]=fractions,{tm,tb}=ph,budget=p.v_cmax_tot;
 const vm=temp(fm*budget,tm,p.v_cmax_ea,p.v_cmax_hd,p.v_cmax_delta_s),vb=temp(fb*budget,tb,p.v_cmax_ea,p.v_cmax_hd,p.v_cmax_delta_s),vp=temp(fp*budget,tm,p.v_pmax_ea,p.v_pmax_hd,p.v_pmax_delta_s);
 const rm=temp(p.r_mes,tm,p.r_ea),rb=temp(p.r_bs,tb,p.r_ea),Gm=temp(p.gamma_star,tm,p.gamma_star_ea)*p.o2_atm,Gb=temp(p.gamma_star,tb,p.gamma_star_ea)*p.o2_atm;
 const Km=temp(p.k_c,tm,p.k_c_ea)*(1+p.o2_atm/temp(p.k_o,tm,p.k_o_ea)),Kb=temp(p.k_c,tb,p.k_c_ea)*(1+p.o2_atm/temp(p.k_o,tb,p.k_o_ea)),Kp=temp(p.k_p,tm,p.k_p_ea);
 const gm=temp(p.g_m,tm,p.g_m_ea),gb=p.g_bs,Pbar=p.pressure/100000,g=1/(1.6*Pbar/gs+1.37*Pbar/p.g_bw+1/gm),supply=energy(p,ph),share=fm+fb>0?fm/(fm+fb):0;
 function fixation(C,V,K,G,ATP,NAD){const u=Math.min(V/(C+K),ATP/Math.max(1e-12,3*C+7*G),NAD/Math.max(1e-12,2*C+4*G));return{rate:(C-G)*u,atp:(3*C+7*G)*u,nadph:(2*C+4*G)*u};}
 function at(cm){const pep=Math.min(vp*cm/(Kp+cm),p.vpr,p.pumpATPshare*supply.atp/2),remaining=supply.atp-2*pep;
  const mesFix=fixation(cm,vm,Km,Gm,remaining*share,supply.nadph*share),mes=mesFix.rate-rm;
  const bsAt=cb=>fixation(cb,vb,Kb,Gb,remaining*(1-share),supply.nadph*(1-share));
  let lo=0,hi=Math.max(p.co2_atm,Gb,cm+(pep+rb)/gb)+1;
  for(let i=0;i<45;i++){const cb=(lo+hi)/2,res=bsAt(cb).rate-rb-pep+gb*(cb-cm);if(res>0)hi=cb;else lo=cb;}
  const cb=(lo+hi)/2,bsFix=bsAt(cb),bs=bsFix.rate-rb,leak=gb*(cb-cm),uptake=g*(p.co2_atm-cm);
  return{ci:cm*.1/(R*T25)*1e6,cmPressure:cm,cbsPressure:cb,mes,bs,pep,leak,assimilation:mes+bs,uptake,residual:uptake-mes-bs,sheathResidual:pep-leak-bs,discriminantClipped:false,bsFloor:false,atpDemand:2*pep+mesFix.atp+bsFix.atp,nadphDemand:mesFix.nadph+bsFix.nadph};
 }
 let lo=0,hi=p.co2_atm+(rm+rb+vm+vb+1)/g;
 for(let i=0;i<48;i++){const cm=(lo+hi)/2;if(at(cm).residual>0)lo=cm;else hi=cm;}
 return{...at((lo+hi)/2),vm,vb,vp,rm,rb,energy:supply,energyMesShare:share};
}
const api={defaults,validate,physical,chemistry,energy,vapor};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.UpdatedLeaf=api;
})(globalThis);
