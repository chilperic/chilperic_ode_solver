(function(){
  const climates=['sudan','niger','germany','canada','brazil'];
  const labels={sudan:'Sudan',niger:'Niger',germany:'Germany',canada:'Canada',brazil:'Brazil'};
  function init(){
    const climate=document.getElementById('simClimate'), view=document.getElementById('simView'), img=document.getElementById('simImage'), cap=document.getElementById('simCaption');
    if(!climate||!view||!img||!cap)return;
    climates.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=labels[k];climate.append(o);});
    climate.value='sudan';
    function render(){
      const k=climate.value, v=view.value;
      if(v==='trajectory'){
        img.src='../assets/research/photosynthesis/c3c4_3d_evolution_'+k+'.png';
        cap.textContent=labels[k]+' · historical trait-search trajectory from the research workflow. Simulation output, not a reconstructed biological lineage.';
      }else{
        img.src='../assets/research/photosynthesis/c3c4_pareto_'+k+'.png';
        cap.textContent=labels[k]+' · Pareto analysis of competing mesophyll and bundle-sheath performance objectives in the corresponding research run.';
      }
    }
    climate.addEventListener('change',render);view.addEventListener('change',render);render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();