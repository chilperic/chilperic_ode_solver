importScripts('../shared/linear-network.js','tcell-engine.js','age-engine.js');
onmessage=({data})=>{try{const engine=['age','cyton','kimmel'].includes(data.model)?AgeBranching:TCellModel;postMessage({kind:'result',result:engine.experiment(data,p=>postMessage({kind:'progress',...p}))});}catch(e){postMessage({kind:'error',message:e.message});}};
