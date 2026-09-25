/* One worker per request; terminating it cancels the computation, not just the animation. */
const base=self.FOKO_BASE||new URL('./',self.location.href).href;
importScripts(new URL('registry.js',base).href,new URL('../../assets/vendor/mathjs/math-15.2.0.js',base).href,new URL('../core/project.js',base).href,new URL('../core/ode.js',base).href,new URL('../core/studio-compute.js',base).href);
self.onmessage=async({data})=>{const {id,request}=data;try{const {compute}=await import(new URL('kernel.mjs',base).href);const result=await compute(request);self.postMessage({id,ok:true,result});}catch(error){self.postMessage({id,ok:false,error:error.message||String(error)});}};
