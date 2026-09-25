/* Analytic preview only. This is not a recorded workspace simulation. */
(function(){'use strict';
 const input=document.getElementById('previewRate'),host=document.getElementById('homeReference');
 if(!input||!host)return;
 function render(){
  const r=Number(input.value),K=100,N0=2,tEnd=20;
  const css=getComputedStyle(document.documentElement),c=k=>css.getPropertyValue('--'+k).trim();
  const X=t=>40+t/tEnd*390,Y=y=>156-y/100*130;
  const points=Array.from({length:101},(_,i)=>{const t=i*tEnd/100;return[X(t),Y(K/(1+(K/N0-1)*Math.exp(-r*t)))];});
  const path=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2)).join(' ');
  host.innerHTML=`<title id="referenceTitle">Analytic logistic growth, rate ${r.toFixed(2)}</title><desc id="referenceDescription">Initial value 2, carrying capacity 100, time 0 to 20 in illustrative units. This preview uses the closed-form logistic solution, not a recorded experiment.</desc>`+
   [0,50,100].map(y=>`<path d="M40 ${Y(y)}H430" stroke="${c('line')}" stroke-dasharray="2 5"/><text x="29" y="${Y(y)+4}" text-anchor="end" fill="${c('muted')}" font-size="11">${y}</text>`).join('')+
   [0,10,20].map(t=>`<text x="${X(t)}" y="176" text-anchor="middle" fill="${c('muted')}" font-size="11">${t}</text>`).join('')+
   `<text x="430" y="188" fill="${c('muted')}" text-anchor="end" font-size="10">time (illustrative units)</text><path d="${path}" fill="none" stroke="${c('accent')}" stroke-width="2.5" stroke-linecap="round"/><circle cx="${points[100][0]}" cy="${points[100][1]}" r="4" fill="${c('blue')}"/>`;
  document.getElementById('previewValue').value=r.toFixed(2);
 }
 input.addEventListener('input',render);document.addEventListener('foko:appearance',render);render();
})();
