importScripts('../shared/soil-thermal.js','leaf-updated.js','leaf-engine.js','../shared/leaf-diagnostics.js');
onmessage=e=>{const {id,config}=e.data;try{const row=ResearchLeaf.evaluate(config);postMessage({id,row,diagnosis:LeafDiagnostics.diagnose(row),config});}catch(error){postMessage({id,error:error.message});}};
