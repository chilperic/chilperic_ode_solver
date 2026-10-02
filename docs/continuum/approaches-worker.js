importScripts('../shared/soil-thermal.js','../leaf/leaf-updated.js','../leaf/leaf-engine.js','fokolab-cmaes.js','approaches.js');
onmessage=({data})=>{try{postMessage({result:PlantApproaches.run(data,(progress,detail)=>postMessage({progress,detail}))});}catch(e){postMessage({error:e.message});}};
