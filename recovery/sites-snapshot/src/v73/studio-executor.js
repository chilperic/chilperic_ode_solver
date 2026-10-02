/* Cancellable compute transport. Fallback is explicit and uses a smaller budget. */
(function(root){
  'use strict';
  const src=root.document.currentScript?.getAttribute('src');
  let workerURL;
  try{workerURL=new URL('studio-worker.js?v=78.2.0',new URL(src,root.document.baseURI)).href;}catch(_){workerURL=null;}
  let sequence=0;
  function start(request,onProgress){
    const id=++sequence;let worker=null,cancelled=false,settled=false,rejectPromise,timer,execution='worker';
    let fallbackStarted=false;
    const promise=new Promise((resolve,reject)=>{
      rejectPromise=reject;
      function finish(error,result){if(settled)return;settled=true;clearTimeout(timer);worker?.terminate();error?reject(error):resolve({result,execution});}
      async function fallback(reason){
        if(fallbackStarted||settled)return;fallbackStarted=true;worker?.terminate();worker=null;execution='bounded-main-thread';
        onProgress?.(0,'Worker unavailable; using bounded, cancellable-between-solves mode.');
        try{const result=await root.FokoStudioCompute.execute(request,{ODE:root.FokoODECore,math:root.math},{cancelled:()=>cancelled,stepBudget:10000,progress:onProgress,yieldControl:()=>new Promise(done=>root.setTimeout(done,0))});if(cancelled)throw root.FokoStudioCompute.abort();result.executionNotice=`Worker transport unavailable (${reason}). Inline fallback is limited to 10,000 steps per solve.`;finish(null,result);}catch(error){finish(error);}
      }
      timer=root.setTimeout(()=>{cancelled=true;finish(new Error('Browser run time limit reached (60 s). Shorten the experiment or export to an independent solver.'));},60000);
      if(!workerURL||typeof root.Worker!=='function'){fallback('unavailable in this browser context');return;}
      try{
        worker=new root.Worker(workerURL);
        worker.onmessage=event=>{
          const message=event.data;if(message.id!==id||settled||cancelled)return;
          if(message.type==='progress')onProgress?.(message.fraction,message.message);
          else if(message.type==='result')finish(null,message.result);
          else if(message.type==='error'){const error=new Error(message.error.message);error.name=message.error.name;finish(error);}
        };
        worker.onerror=event=>{event.preventDefault();fallback('worker could not start');};
        worker.postMessage({id,request});
      }catch(error){fallback(error.message);}
    });
    return {promise,cancel(){if(settled)return;cancelled=true;settled=true;clearTimeout(timer);worker?.terminate();rejectPromise(root.FokoStudioCompute.abort());}};
  }
  root.FokoStudioExecutor=Object.freeze({start});
})(window);
