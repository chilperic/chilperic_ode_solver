importScripts('../shared/soil-thermal.js','../leaf/leaf-updated.js','../leaf/leaf-engine.js','engine.js');
onmessage=({data})=>{try{postMessage({result:Continuum.run(data,p=>postMessage({progress:p}))});}catch(e){postMessage({error:e.message});}};
