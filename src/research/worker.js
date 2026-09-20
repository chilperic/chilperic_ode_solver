/* Terminable research executor, with local dependencies only. */
'use strict';
importScripts('../../assets/vendor/mathjs/math-15.2.0.js?v=78.2.0','../core/project.js?v=78.2.0','../core/ode.js?v=78.2.0','../core/studio-compute.js?v=78.2.0','experiment-data.js?v=78.2.0','fit-experiment.js?v=78.2.0','engine.js?v=78.2.0');
self.onmessage=async event=>{const {id,request}=event.data;try{const result=await self.FokoResearchEngine.execute(request,{Project:self.FokoProjectCore,ODE:self.FokoODECore,Compute:self.FokoStudioCompute,math:self.math},{progress:(fraction,message)=>self.postMessage({id,type:'progress',fraction,message})});self.postMessage({id,type:'result',result});}catch(error){self.postMessage({id,type:'error',message:error.message,name:error.name});}};
