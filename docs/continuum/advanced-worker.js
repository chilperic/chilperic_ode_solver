importScripts('../shared/soil-thermal.js','../leaf/leaf-updated.js','../leaf/leaf-engine.js','fokolab-cmaes.js','approaches.js','advanced-engine.js');
onmessage=async({data})=>{try{let result;const progress=(p,message)=>postMessage({progress:p,message});
if(data.task==='kimura'&&data.live){const it=EvolutionAdvanced.runSteps(data.input,progress);for(;;){const step=it.next();if(step.done){result=step.value;break;}postMessage({stream:step.value});/* Wall-clock pacing does not alter RNG, generations, or fixation rates. */await new Promise(resolve=>setTimeout(resolve,step.value.kind==='substitution'?(step.value.rep===0?(data.pace||650):40):0));}}
else result=data.task==='sensitivity'?EvolutionAdvanced.analyze(data.input,p=>progress(p,'Global sensitivity')):data.task==='pca'?EvolutionAdvanced.pca(data.input):EvolutionAdvanced.run(data.input,progress);
postMessage({result,task:data.task});}catch(e){postMessage({error:e.message,task:data.task});}};
