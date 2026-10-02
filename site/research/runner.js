/* Execute saved configurations using current local engine versions. No dynamic URLs or imported code. */
onmessage=({data})=>{try{const c=data.configuration;let result;switch(data.lab){
case 'plants':importScripts('../shared/climate-catalog.js','../shared/soil-thermal.js','../plants/electron-engine.js','../plants/c4-engine.js','../plants/development.js','../plants/plant-engine.js');result=PlantModel.simulate(c,p=>postMessage({progress:p}));break;
case 'tcells':importScripts('../shared/linear-network.js','../tcells/tcell-engine.js','../tcells/age-engine.js');result=(['age','cyton','kimmel'].includes(c.model)?AgeBranching:TCellModel).experiment(c,p=>postMessage({progress:p.done/p.total}));break;
case 'lipids':importScripts('../shared/ode.js','../lipids/lipid-engine.js');result=LipidModel.run(c);break;
case 'leaf':importScripts('../shared/soil-thermal.js','../leaf/leaf-updated.js','../leaf/leaf-engine.js');result=ResearchLeaf.run(c);break;
case 'evolution':importScripts('../shared/soil-thermal.js','../leaf/leaf-updated.js','../leaf/leaf-engine.js','../continuum/fokolab-cmaes.js','../continuum/approaches.js','../continuum/advanced-engine.js');result=EvolutionAdvanced.run(c,p=>postMessage({progress:p}));break;
case 'search':importScripts('../shared/soil-thermal.js','../leaf/leaf-updated.js','../leaf/leaf-engine.js','../continuum/fokolab-cmaes.js','../continuum/approaches.js');result=PlantApproaches.run(c,p=>postMessage({progress:p}));break;
case 'haploid':importScripts('../shared/soil-thermal.js','../leaf/leaf-updated.js','../leaf/leaf-engine.js','../continuum/engine.js');result=Continuum.run(c,p=>postMessage({progress:p}));break;
case 'random':importScripts('../engine.js');result={models:c.map(config=>FractalEngine.simulate(config))};break;
default:throw Error('This laboratory is not supported by the experiment runner.');}postMessage({result});}catch(e){postMessage({error:e.message});}};
