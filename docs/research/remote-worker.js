/* Streaming results from the private computation service. */
function remoteResearch(kind){
 onmessage=async({data})=>{
  try{
   const origin=location.hostname==='chilperic.github.io'?'https://dice-branch-fractal.chilpericarmel.chatgpt.site':location.origin;
   const r=await fetch(origin+'/api/research/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
   if(!r.ok)throw Error('Simulation service returned '+r.status+'. Previous results are retained.');
   const reader=r.body.getReader(),decoder=new TextDecoder();let pending='';
   for(;;){const {done,value}=await reader.read();pending+=decoder.decode(value||new Uint8Array(),{stream:!done});let i;while((i=pending.indexOf('\n'))>=0){const line=pending.slice(0,i);pending=pending.slice(i+1);if(line.trim()){const message=JSON.parse(line);postMessage(message);if(message.stream?.kind==='substitution'&&message.stream.rep===0&&(data.input?.kimura?.replicates||1)<=30)await new Promise(resolve=>setTimeout(resolve,message.stream.rep===0?(data.pace||650):40));}}if(done)break;}
   if(pending.trim())postMessage(JSON.parse(pending));
  }catch(error){postMessage({error:error.message});}
 };
}
