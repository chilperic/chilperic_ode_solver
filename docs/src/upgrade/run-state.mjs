/** Revision ownership is separate from rendering state. */
export class RunState{
 constructor(){this.revision=0;this.serial=0;this.status='ready';this.result=null;this.baseline=null;this.worker=null;}
 edit(){this.cancel(false);this.revision++;this.status=this.result?'outdated':'ready';}
 begin(){this.cancel(false);this.serial++;this.status='running';return{id:this.serial,revision:this.revision};}
 accepts(token){return token.id===this.serial&&token.revision===this.revision&&this.status==='running';}
 complete(token,result){if(!this.accepts(token))return false;this.result=result;this.status='complete';this.worker?.terminate();this.worker=null;return true;}
 fail(token){if(!this.accepts(token))return false;this.status='failed';this.worker?.terminate();this.worker=null;return true;}
 cancel(explicit=true){this.serial++;this.worker?.terminate();this.worker=null;if(explicit)this.status='cancelled';}
 pin(){if(!this.result||this.status!=='complete')throw Error('Compute a current result before pinning a comparison.');this.baseline=structuredClone(this.result);}
}
export const stableStringify=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function fingerprint(value){const text=stableStringify(value);let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
