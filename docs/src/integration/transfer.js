/* Observable-only handoff. No resampling, unit conversion or model substitution. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;root.FokoTransfer=api;})(globalThis,function(root){'use strict';
const SCHEMA='foko.observable-transfer/1',PREFIX='foko:observable-transfer:';let active=null;
const clone=x=>JSON.parse(JSON.stringify(x));
function csvHeader(x){return '"'+String(x).replace(/"/g,'""')+'"';}
function create(record,key){
 if(root.ResearchRecords)root.ResearchRecords.validate(record);
 if(record?.schema!=='dynamics.experiment/1'||!Array.isArray(record.curves))throw Error('A completed Dynamics record is required.');
 const c=record.curves.find(c=>c.key===key);if(!c)throw Error('The selected observable is absent from this run.');
 if(c.points.length>60000)throw Error('This observable exceeds the 60,000-sample analysis handoff limit. Download the complete run for external analysis; no downsampling has been applied.');
 if(!c.points.length||!c.points.some(p=>p[1]!==null))throw Error('This observable has no finite result samples.');
 for(const p of c.points)if(!Number.isFinite(p[0])||(p[1]!==null&&!Number.isFinite(p[1])))throw Error('Observable contains invalid coordinates.');
 const data=[csvHeader(c.xLabel+' ['+c.xUnit+']')+','+csvHeader(c.label+' ['+c.unit+']'),...c.points.map(p=>String(p[0])+','+(p[1]===null?'':String(p[1])))].join('\n');
 const payload={schema:SCHEMA,id:root.crypto?.randomUUID?.()||'transfer-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),createdAt:new Date().toISOString(),data,provenance:{schema:SCHEMA,origin:'simulated output',recordId:record.id,title:record.title,lab:record.lab,model:clone(record.model),configuration:clone(record.configuration),source:clone(record.source),observable:{key:c.key,label:c.label,xLabel:c.xLabel,xUnit:c.xUnit,unit:c.unit,statistic:c.statistic,interpolation:c.interpolation},samples:c.points.length,missing:c.points.filter(p=>p[1]===null).length,interpretation:'Exact stored samples; no interpolation, unit conversion or empirical observations. Samples within a trajectory are dependent. A descriptive fit is not calibration of the source model.'}};
 return validate(payload);
}
function validate(p){if(p?.schema!==SCHEMA||typeof p.id!=='string'||!/^[a-zA-Z0-9-]+$/.test(p.id)||typeof p.data!=='string'||p.data.length>3500000||p.provenance?.schema!==SCHEMA||!['simulated output','user-provided table','user-provided file','synthetic teaching data','derived analysis'].includes(p.provenance.origin)||typeof p.provenance.recordId!=='string'||!p.provenance.observable||typeof p.provenance.observable.label!=='string')throw Error('Invalid observable transfer.');return p;}
function save(p,storage=root.sessionStorage){validate(p);const text=JSON.stringify(p);if(text.length>4000000)throw Error('This transfer is too large for browser analysis. Download the original run.');try{storage.setItem(PREFIX+p.id,text);}catch(_){throw Error('Browser transfer storage is unavailable or full. Download the observable CSV and its provenance instead.');}return p.id;}
function read(id,storage=root.sessionStorage){if(!/^[a-zA-Z0-9-]+$/.test(id||''))throw Error('Invalid transfer identifier.');let text;try{text=storage.getItem(PREFIX+id);}catch(_){throw Error('Browser transfer storage is unavailable.');}if(!text)throw Error('This transfer is not available in this tab. Return to the completed run and transfer it again.');return validate(JSON.parse(text));}
function config(p,target){validate(p);return{data:p.data,provenance:clone(p.provenance),delimiter:',',missingPolicy:'analysis-complete',x:target==='statistics'?1:0,y:target==='statistics'?0:1,group:0,event:1,mode:'descriptive',model:'linear',weighting:'ordinary',computeProfile:false,layout:'two',focusSide:'left'};}
function adopt(meta,data){active=meta?.schema===SCHEMA?{meta:clone(meta),data}:null;if(root.document)root.dispatchEvent(new Event('foko:transfer-provenance'));}
function provenanceFor(data){if(!active)return null;return{...clone(active.meta),inputModified:Boolean(active.meta.inputModified)||data!==active.data};}
function clear(){active=null;if(root.document)root.dispatchEvent(new Event('foko:transfer-provenance'));}
return{SCHEMA,PREFIX,create,validate,save,read,config,adopt,provenanceFor,clear};
});
