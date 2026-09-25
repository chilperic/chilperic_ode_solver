// Extract the exact source literals. The archive, not a new model, is authoritative.
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'site/src/app.js'),'utf8');
const models={};
for(const line of source.split('\n')){
 const m=line.match(/^\s*['"]([^'"]+)['"]\s*:\s*(\{.*\}),?\s*$/);
 if(!m||!m[2].includes('vars:')&&!m[2].includes('"vars"'))continue;
 try{const x=vm.runInNewContext('('+m[2]+')');if(Array.isArray(x.vars)&&Array.isArray(x.eqs))models[m[1]]=x;}catch(_){}
}
const output=path.join(root,'site/src/upgrade/preserved-models.json');fs.writeFileSync(output,JSON.stringify(models,null,2));
fs.writeFileSync(path.join(root,'site/src/upgrade/preserved-models.js'),'window.FokoPreservedModels='+JSON.stringify(models)+';\n');
console.log(Object.entries(models).map(([k,v])=>[k,v.vars.length]));
