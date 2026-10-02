self.importScripts('fokokit.js');
self.onmessage = function(ev){
  const {id, engine, method, payload} = ev.data || {};
  try{
    self.postMessage({id, type:'progress', progress:0.05, message:'started'});
    let result = null;
    if(engine === 'statistics' && method === 'schema'){
      const table = FokoKit.parseTable(payload.text || '');
      result = {schema:FokoKit.inferSchema(table), rows: table.rows.length};
    } else if(engine === 'echo'){
      result = payload;
    } else {
      result = {warning:'Worker endpoint registered but engine adapter not yet bound', engine, method, payload};
    }
    self.postMessage({id, type:'progress', progress:1, message:'done'});
    self.postMessage({id, type:'result', result});
  } catch(err){
    self.postMessage({id, type:'error', error: String(err && err.message || err)});
  }
};