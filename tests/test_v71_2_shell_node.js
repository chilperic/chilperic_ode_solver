
const assert=require('assert');
const shell=require('../src/platform/shell.js');
assert.throws(()=>shell.registerLab({}),/id is required/);
assert.throws(()=>shell.registerLab({id:'x',title:'X',category:'C',schema:()=>({}),Controls:()=>null,Result:()=>'',Plot:()=>{}}),/engine must be a function/);
const lab={id:'mock',title:'Mock Lab',category:'Test',template:{x:2},schema:s=>({x:Number(s.x)}),Controls:()=>({nodeType:1}),Result:o=>JSON.stringify(o),Plot:()=>{},engine:i=>({y:i.x*2})};
shell.registerLab(lab);
assert.throws(()=>shell.registerLab(lab),/duplicate lab id/);
const enc=shell.encodeState({a:1,b:[2,3],c:{d:'x'}}); const dec=shell.decodeState(enc);
assert.deepStrictEqual(dec,{a:1,b:[2,3],c:{d:'x'}});
console.log('v71.2 shell descriptor core tests passed');
