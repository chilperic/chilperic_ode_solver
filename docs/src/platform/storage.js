/* Shared best-effort storage. A denied/quota-limited store must not stop the UI.
   The memory fallback is session-only; callers must not label it persisted. */
(function (root) {
  'use strict';
  function createStore(kind) {
    const memory = new Map();
    let persistent = true, reason = '';
    function unavailable(error) {
      persistent = false; reason = error && error.message || 'Browser storage unavailable';
      if (root.document) root.document.dispatchEvent(new CustomEvent('foko:storage-state', {detail:{kind,persistent,reason}}));
    }
    return Object.freeze({
      getItem(key) {
        key=String(key);
        try { const value=root[kind].getItem(key); if (value !== null) {memory.set(key,value);return value;} }
        catch(error) {unavailable(error);}
        return memory.has(key) ? memory.get(key) : null;
      },
      setItem(key,value) {
        key=String(key);value=String(value);memory.set(key,value);
        try {root[kind].setItem(key,value);persistent=true;reason='';return true;}
        catch(error) {unavailable(error);return false;}
      },
      removeItem(key) {memory.delete(String(key));try{root[kind].removeItem(key);}catch(error){unavailable(error);}},
      get persistent(){return persistent;}, get reason(){return reason;}
    });
  }
  root.FokoStorage=Object.freeze({local:createStore('localStorage'),session:createStore('sessionStorage')});
})(typeof window !== 'undefined' ? window : globalThis);
