importScripts('../shared/soil-thermal.js','leaf-updated.js','leaf-engine.js');onmessage=({data})=>{try{postMessage({result:ResearchLeaf.run(data)});}catch(e){postMessage({error:e.message});}};
