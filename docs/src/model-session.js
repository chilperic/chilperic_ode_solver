(function(){
  const NS='foko-last-model:';
  function save(lab, payload){ try{ localStorage.setItem(NS+lab, JSON.stringify({payload, savedAt:new Date().toISOString()})); }catch(_e){} }
  function load(lab){ try{ return JSON.parse(localStorage.getItem(NS+lab)||'null'); }catch(_e){ return null; } }
  function clear(lab){ try{ localStorage.removeItem(NS+lab); }catch(_e){} }
  window.FokoSession={save,load,clear};
})();
