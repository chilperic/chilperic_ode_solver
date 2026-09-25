import {createRequire} from 'node:module';
import path from 'node:path';import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
globalThis.math=require(path.join(root,'site/assets/vendor/mathjs/math-15.2.0.js'));
globalThis.FokoProjectCore=require(path.join(root,'site/src/core/project.js'));
globalThis.FokoODECore=require(path.join(root,'site/src/core/ode.js'));
globalThis.FokoStudioCompute=require(path.join(root,'site/src/core/studio-compute.js'));
require(path.join(root,'site/src/upgrade/registry.js'));
const fs=require('fs');globalThis.FokoPreservedModels=JSON.parse(fs.readFileSync(path.join(root,'site/src/upgrade/preserved-models.json'),'utf8'));
export function tcellModel(){const vars=Array.from({length:7},(_,i)=>'G'+i);return{name:'Generation-resolved T cells',vars,eqs:vars.map((v,i)=>i===0?'-(division+death)*G0':i===6?'2*division*G5-death*G6':`2*division*G${i-1}-(division+death)*G${i}`),y0:[100,0,0,0,0,0,0],params:{division:[.55,0,2],death:[.1,0,2]},t0:0,t1:8,points:241,method:'rk45',timeUnit:'days'};}
export function request(labId,example=null){const lab=FokoUpgrade.labs.find(l=>l.id===labId),ex=example||lab.examples[0],over=ex[2],p=Object.fromEntries(lab.fields.map(f=>[f.key,f.value]));let q={lab:lab.id,method:over._method||lab.methods[0][0],params:p,t0:0,tEnd:over._end||lab.end,step:lab.step,samples:241,rtol:1e-7,atol:1e-9,seed:42};if(lab.models){const name=over._model||lab.models[0];q.modelSpec=name==='Generation-resolved T cells'?tcellModel():JSON.parse(JSON.stringify(FokoPreservedModels[name]));q.modelSpec.name=name;q.t0=q.modelSpec.t0;q.tEnd=q.modelSpec.t1;q.params=Object.fromEntries(Object.entries(q.modelSpec.params).map(([k,v])=>[k,v[0]]));}for(const[k,v]of Object.entries(over))if(!k.startsWith('_'))q.params[k]=v;if(over._end)q.tEnd=over._end;return q;}
export {require};
