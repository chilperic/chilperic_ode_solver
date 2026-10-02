/* Access to existing model controls; never copies values or replaces a solver. */
(function(root){'use strict';const doc=root.document;
function boot(){const S=root.FokoShell;if(!S||doc.querySelector('.foko-edit-inputs'))return;
 const controls=doc.querySelector('.work-panel.controls,.controls-panel')||doc.querySelector('.lab-inspector form');if(!controls)return;
 const dynamic=!!controls.closest('.lab-inspector');controls.id||='foko-model-inputs';
 function reveal(target){if(!dynamic)root.FokoMobileTaskbar?.show('setup');let p=target;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}target.scrollIntoView({block:'center',behavior:'instant'});const scope=/^H[23]$/.test(target.tagName)?(target.nextElementSibling||target):target;const field=scope.matches('input,select,textarea,button')?scope:scope.querySelector('input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea:not(:disabled)');if(field)field.focus({preventScroll:true});else{target.tabIndex=-1;target.focus({preventScroll:true});}}
 function parameterTarget(){return [...controls.querySelectorAll('h2,h3,summary,legend')].find(n=>/^(parameters|model parameters|parameter bounds|rates|kinetic|conditions)/i.test(n.textContent.trim()))||controls;}
 const edit=S.button('Edit parameters',()=>{if(dynamic){root.LabWorkspace?.openInspector();}else reveal(parameterTarget());},'foko-edit-inputs');edit.setAttribute('aria-controls',dynamic?'lab-inspector':controls.id);doc.querySelector('.foko-context')?.append(edit);
 if(!dynamic){
  const bar=S.el('nav','foko-input-jumps');bar.setAttribute('aria-label','Model input sections');const heading=S.el('span','','Edit inputs');bar.append(heading);
  const candidates=[...controls.querySelectorAll('h2,h3,summary,legend')].filter(n=>/parameter|equation|initial|solver|numerical|time range|data|model|objective|constraint|method|seed/i.test(n.textContent));
  const seen=new Set();for(const n of candidates){const title=n.textContent.trim().replace(/\s+/g,' ');if(seen.has(title)||title.length>45||/custom.*method choice|starter|example|browse|note/i.test(title))continue;seen.add(title);const target=n.tagName==='SUMMARY'?n.closest('details'):n;bar.append(S.button(title,()=>reveal(target)));if(seen.size>=7)break;}
  if(bar.children.length>1)controls.prepend(bar);
  // Examples remain selectable; the repeated shortcut list no longer buries model inputs.
  const chips=controls.querySelector('[aria-label="Core example model chips"]');if(chips&&!chips.closest('details')){const d=S.el('details','foko-example-shortcuts'),summary=S.el('summary','','More example shortcuts');d.append(summary);chips.before(d);d.append(chips);}
 }
 controls.addEventListener('invalid',e=>{if(dynamic)root.LabWorkspace?.openInspector();reveal(e.target);},true);
}
if(root.FokoShell)boot();else root.addEventListener('foko:integrated-ready',boot,{once:true});
// Some native controls are installed by deferred page controllers after the shared shell.
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});
})(globalThis);
