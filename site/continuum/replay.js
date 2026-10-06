(function(){'use strict';
const climates=['sudan','niger','germany','canada','brazil'],labels={sudan:'Sudan',niger:'Niger',germany:'Germany',canada:'Canada',brazil:'Brazil'};
const select=document.getElementById('evClimate'),base=document.getElementById('evBase'),reveal=document.getElementById('evReveal'),scan=document.getElementById('evScan'),bar=document.querySelector('.ev-progress span'),btn=document.getElementById('evPlay'),caption=document.getElementById('evCaption');
let playing=true,p=0,last=0,climateIndex=0;
for(const k of climates){const o=document.createElement('option');o.value=k;o.textContent=labels[k];select.append(o);}
function src(k){return '../assets/research/photosynthesis/c3c4_3d_evolution_'+k+'.png';}
function setClimate(k){select.value=k;base.src=src(k);reveal.src=src(k);caption.textContent=labels[k]+' · archived research trajectory figure. The animation progressively reveals the recorded result; it does not rerun the unpublished scientific model and it is not a reconstructed natural lineage.';}
function draw(){const q=Math.max(0,Math.min(1,p));reveal.style.clipPath='inset(0 '+((1-q)*100)+'% 0 0)';scan.style.left=(q*100)+'%';bar.style.width=(q*100)+'%';}
function loop(t){if(!last)last=t;const dt=t-last;last=t;if(playing){p+=dt/7000;if(p>=1){p=0;climateIndex=(climateIndex+1)%climates.length;setClimate(climates[climateIndex]);}draw();}requestAnimationFrame(loop);}
select.addEventListener('change',()=>{climateIndex=climates.indexOf(select.value);p=0;setClimate(select.value);draw();});btn.addEventListener('click',()=>{playing=!playing;btn.textContent=playing?'Pause':'Play';});
setClimate(climates[0]);draw();requestAnimationFrame(loop);
})();