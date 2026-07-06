/* =====================================================================
 * Foko Lab V71.21 — shared compute bus
 *
 * One browser-facing API for long-running computation. It does not rewrite
 * the science engines; it centralizes worker creation, progress forwarding,
 * cancellation, timeout cleanup, and future descriptor-shell dispatch.
 * ===================================================================== */
(function(root){
  'use strict';
  const DEFAULT_WORKER = 'src/worker.js?v=71.46.0';
  const PLATFORM_WORKER = 'src/v71-worker.js?v=71.46.0';
  let seq = 0;
  const active = new Map();

  function assertObject(x, name){ if(!x || typeof x !== 'object') throw new Error(name+' must be an object.'); return x; }
  function assertFunction(fn, name){ if(typeof fn !== 'function') throw new Error(name+' must be a function.'); return fn; }
  function supportsWorkers(){ return typeof root.Worker === 'function'; }
  function normalizeJob(job){
    assertObject(job,'compute job');
    const type = job.type || job.method || job.engine;
    if(!type || typeof type !== 'string') throw new Error('compute job requires a string type/method/engine.');
    return {
      id: job.id || ('job-'+(++seq)),
      type,
      payload: job.payload || {},
      workerUrl: job.workerUrl || job.worker || DEFAULT_WORKER,
      timeoutMs: Math.max(1000, Number(job.timeoutMs || 0) || 0),
      progress: typeof job.progress === 'function' ? job.progress : null,
      raw: !!job.raw
    };
  }

  function run(job){
    const spec = normalizeJob(job);
    if(!supportsWorkers()) return Promise.reject(new Error('Web Workers are unavailable. Serve through http://localhost, not file://.'));
    return new Promise((resolve,reject)=>{
      const worker = new Worker(spec.workerUrl);
      const record = {worker, reject, resolve, started: Date.now(), type: spec.type};
      let timer = null;
      active.set(spec.id, record);
      if(spec.timeoutMs){
        timer = setTimeout(()=>{
          cancel(spec.id, 'Computation timed out.');
        }, spec.timeoutMs);
      }
      function cleanup(){
        if(timer) clearTimeout(timer);
        active.delete(spec.id);
        try{ worker.terminate(); }catch{}
      }
      worker.onmessage = ev => {
        const msg = ev.data || {};
        if(msg.progress !== undefined || msg.type === 'progress'){
          const progressPayload = {id: spec.id, progress: Number(msg.progress || 0), text: msg.text || msg.message || 'Running', raw: msg};
          if(spec.progress) spec.progress(progressPayload);
          return;
        }
        cleanup();
        if(msg.type === 'error' || msg.ok === false){
          reject(new Error(msg.error || msg.message || 'Worker computation failed.'));
          return;
        }
        resolve(msg.type === 'result' && Object.prototype.hasOwnProperty.call(msg,'result') ? msg.result : msg);
      };
      worker.onerror = err => {
        cleanup();
        reject(new Error(err && err.message ? err.message : 'Worker crashed.'));
      };
      worker.postMessage(spec.raw ? spec.payload : {type: spec.type, payload: spec.payload});
    });
  }

  function cancel(id, reason){
    if(!id){ Array.from(active.keys()).forEach(k=>cancel(k, reason)); return true; }
    const record = active.get(id);
    if(!record) return false;
    if(record.local){
      record.cancelled = true;
      if(record.timer) clearTimeout(record.timer);
      active.delete(id);
      record.reject(new Error(reason || 'Computation cancelled.'));
      return true;
    }
    try{ record.worker.postMessage({type:'cancel'}); }catch{}
    try{ record.worker.terminate(); }catch{}
    active.delete(id);
    record.reject(new Error(reason || 'Computation cancelled.'));
    return true;
  }

  function runLocal(job, executor){
    const spec = normalizeJob(job);
    assertFunction(executor, 'local executor');
    return new Promise((resolve,reject)=>{
      const record = {local:true, reject, resolve, started:Date.now(), type:spec.type, cancelled:false, timer:null};
      active.set(spec.id, record);
      function cleanup(){ active.delete(spec.id); }
      const progress = payload => {
        if(spec.progress) spec.progress(typeof payload === 'number' ? {id:spec.id, progress:payload, text:'Running'} : {...payload, id:spec.id});
      };
      record.timer = setTimeout(()=>{
        try{
          if(record.cancelled) throw new Error('Computation cancelled.');
          progress({progress:0.05, text:'Running'});
          const result = executor({payload:spec.payload, progress, isCancelled:()=>record.cancelled});
          cleanup();
          resolve(result);
        }catch(err){
          cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }, 0);
    });
  }

  function createLegacyHandle(options){
    options = options || {};
    let current = null;
    const handle = {
      onmessage: null,
      onerror: null,
      postMessage(msg){
        msg = msg || {};
        if(msg.type === 'cancel'){ handle.terminate(); return; }
        const id = 'legacy-'+(++seq);
        current = id;
        run({
          id,
          type: msg.type,
          payload: msg.payload || {},
          workerUrl: options.workerUrl || DEFAULT_WORKER,
          timeoutMs: options.timeoutMs || 0,
          progress: p => { if(typeof handle.onmessage === 'function') handle.onmessage({data:{progress:p.progress, text:p.text}}); }
        }).then(result=>{
          current = null;
          if(typeof handle.onmessage === 'function') handle.onmessage({data:result});
        }).catch(err=>{
          current = null;
          if(typeof handle.onerror === 'function') handle.onerror(err);
          else if(typeof handle.onmessage === 'function') handle.onmessage({data:{ok:false,error:err.message||String(err)}});
        });
      },
      terminate(){ if(current) cancel(current, 'Computation cancelled.'); current = null; },
      get activeJob(){ return current; }
    };
    return handle;
  }

  function platformRun(engine, method, payload, options){
    options = options || {};
    return run({
      type: method || engine,
      payload: {engine, method, payload},
      workerUrl: options.workerUrl || PLATFORM_WORKER,
      timeoutMs: options.timeoutMs || 0,
      progress: options.progress,
      raw: false
    });
  }

  root.FokoComputeBus = {
    RELEASE: '71.46.0',
    DEFAULT_WORKER,
    PLATFORM_WORKER,
    supportsWorkers,
    run,
    runLocal,
    platformRun,
    cancel,
    createLegacyHandle,
    activeCount(){ return active.size; },
    _active: active
  };
})(typeof window !== 'undefined' ? window : globalThis);
