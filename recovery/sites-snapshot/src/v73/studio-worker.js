/* Dedicated, terminable worker: never touches DOM, never requests user data. */
'use strict';
importScripts('../../assets/vendor/mathjs/math-15.2.0.js?v=78.2.0','../core/ode.js?v=78.2.0','../core/studio-compute.js?v=78.2.0');
self.onmessage=async function(event){
  const {id,request}=event.data;
  try{
    const result=await self.FokoStudioCompute.execute(request,{ODE:self.FokoODECore,math:self.math},{progress:(fraction,message)=>self.postMessage({id,type:'progress',fraction,message})});
    self.postMessage({id,type:'result',result});
  }catch(error){self.postMessage({id,type:'error',error:{name:error.name,message:error.message||String(error)}});}
};
