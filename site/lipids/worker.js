importScripts('../shared/ode.js','lipid-engine.js');onmessage=({data})=>{try{postMessage({result:LipidModel.run(data)});}catch(e){postMessage({error:e.message});}};
