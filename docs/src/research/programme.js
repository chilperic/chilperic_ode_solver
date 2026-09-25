/* Local curriculum navigation. No tracking, remote API, PDF upload or certificate. */
(function(root){'use strict';
 const C=root.FokoCurriculum,UI=root.FokoResearchUI,store=root.FokoResearchStore;
 if(!C||!UI||!store)return;
 const $=id=>document.getElementById(id),esc=UI.esc,KEY='foko:programme:v6.16' /* retained gate IDs; old notes remain self-reported, not reverified */;
 let notes=store.get(KEY,{}),current='verify',bookURL='materials/Scientific_Mastery_V6_17_Public_Companion.pdf',bookVerified=false;
 const gateIDs=new Set(C.gates.map(g=>g.id));
 const validNotes=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>gateIDs.has(k)&&value[k]&&typeof value[k]==='object'&&['artifact','interpretation','updatedAt'].every(f=>typeof value[k][f]==='string'&&value[k][f].length<16000));
 if(!validNotes(notes))notes={};
 const params=new URLSearchParams(location.search);if(gateIDs.has(params.get('gate')))current=params.get('gate');
 // Complete run attachments are separate from self-recorded chapter notes. Nothing
 // is uploaded; export explicitly includes the selected record's observations.
 const RUN_KEY='foko:programme:run-evidence:v1';
 function validAttachments(items){return Array.isArray(items)&&items.length<=60&&items.every(x=>x?.schema==='foko.programme-evidence/1'&&typeof x.id==='string'&&gateIDs.has(x.gate)&&typeof x.interpretation==='string'&&x.interpretation.length<=20000&&x.run?.snapshot?.model&&x.run?.result&&typeof x.run.kind==='string');}
 function attachments(){const x=store.get(RUN_KEY,[]);return validAttachments(x)?x:[];}
 function renderRunEvidence(){
  let host=$('runEvidence');if(!host){host=document.createElement('section');host.id='runEvidence';host.className='programme-section';$('gatePanel').after(host);}
  const all=attachments(),items=all.filter(x=>x.gate===current);
  host.innerHTML=`<div class="section-title"><h2>Experiments attached to ${esc(current)}</h2><span class="small muted">${items.length} retained · no automatic gate certification</span></div>`+(items.length?items.map(x=>{
   const r=x.run,snap=r.snapshot,rr=r.result,rows=snap.data?.rows?.length||snap.data?.T?.length||0;
   return `<article class="retained-run"><div class="retained-run-heading"><h3>${esc(snap.model.name)}</h3><span class="tag">${esc(x.evidenceLevel)}</span></div><p class="small muted">${esc(r.kind)} · ${rows} observations · run ${esc(r.id)}</p><p>${esc(x.interpretation||'No interpretation has been recorded. State what this calculation establishes and what remains untested.')}</p><details><summary>Inputs and diagnostic record</summary><dl class="record-facts"><dt>Run engine</dt><dd>${esc(rr.version||rr.engineVersion||'See exported record')}</dd><dt>Equations</dt><dd>${esc(snap.model.eqs.join('; '))}</dd><dt>Observation model</dt><dd>${esc((snap.model.observables||[]).map(o=>o.id+' = '+o.expression+' ['+o.unit+']').join('; ')||'Direct state measurements')}</dd><dt>Conditions</dt><dd>${esc(Object.keys(snap.data?.conditions||{}).join(', ')||'Single model input set')}</dd><dt>Objective</dt><dd>${esc(rr.objective?.weighting||'See calculation record')}</dd><dt>Numerical method</dt><dd>${esc(snap.model.method)}; relative tolerance ${esc(snap.model.rtol)}</dd><dt>Validation design</dt><dd>${esc(rr.split?.policy||'Not applicable to this calculation')} ${rr.split?esc(rr.split.nTrain+' training; '+rr.split.nTest+' held out'+(rr.split.cutoff!=null?'; cutoff '+rr.split.cutoff+' '+snap.model.timeUnit:'')):''}</dd><dt>Fingerprint</dt><dd>${esc(x.snapshotFingerprint)} · identity aid, not a signature</dd></dl><p class="small muted">${esc(x.notice)}</p></details><div class="actions"><button class="button" data-download-evidence="${esc(x.id)}">Download experiment</button><button class="button quiet" data-inspect-evidence="${esc(x.id)}">Copy inputs to workspace</button></div></article>`;}).join(''):'<p class="empty-help">In Workspace → Evidence, attach a completed calculation to this gate. Its model, data, settings and results travel together.</p><a class="button-link" href="workspace.html?case=fluorescence">Try the measurement investigation →</a>');
  const asBundle=x=>({schema:'foko.research/1',version:x.run.result.version||'78.2.0',model:x.run.snapshot.model,data:x.run.snapshot.data,results:[x.run],notes:{hypothesis:'',interpretation:x.interpretation,nextTest:''},attachments:[x],scenarios:[]});
  host.querySelectorAll('[data-download-evidence]').forEach(b=>b.onclick=()=>{const x=items.find(x=>x.id===b.dataset.downloadEvidence);UI.download('FokoLab-evidence-'+current+'.json',JSON.stringify(asBundle(x),null,2));});
  host.querySelectorAll('[data-inspect-evidence]').forEach(b=>b.onclick=()=>{const x=items.find(x=>x.id===b.dataset.inspectEvidence),bundle=asBundle(x),id='programme-'+Date.now().toString(36);bundle.id=id;bundle.results=bundle.results.map(r=>({...r,source:'imported; unverified'}));bundle.attachments=bundle.attachments.map(a=>({...a,evidenceLevel:'imported; not independently reproduced'}));if(store.set('foko:research:project:'+id,bundle)){location.href='workspace.html?resume='+encodeURIComponent(id);}else{UI.download('FokoLab-evidence-'+current+'.json',JSON.stringify(bundle,null,2));UI.toast('Storage unavailable. Import the downloaded experiment in Workspace.');}});
 }

 function chapters(ids){return '<div class="chapter-list">'+ids.map(id=>{const ch=C.chapters.find(c=>c.id===id);return `<div class="chapter-row"><span class="number">${String(id).padStart(2,'0')}</span><strong>${esc(ch.title)}</strong><button type="button" data-book-page="${ch.pdfPage}" aria-label="Open chapter ${id}, printed page ${ch.printedPage}, in the book">p. ${ch.printedPage} ↗</button></div>`;}).join('')+'</div>';}
 function render(){
  const g=C.gates.find(g=>g.id===current),n=notes[current]||{};
  $('gateTabs').innerHTML=C.gates.map((x,i)=>`<button id="gate-${x.id}" role="tab" aria-controls="gatePanel" aria-selected="${x.id===current}" tabindex="${x.id===current?0:-1}" data-gate="${x.id}"><span class="gate-number">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(x.short)}</strong><small>${esc(x.caption)}</small></span></button>`).join('');
  $('gatePanel').setAttribute('aria-labelledby','gate-'+g.id);
  $('gatePanel').innerHTML=`<div><p class="eyebrow">${esc(g.source)}</p><h2>${esc(g.title)}</h2><p>${esc(g.description)}</p><div class="gate-evidence"><strong>Evidence to retain</strong><p>${esc(g.evidence)}</p></div><details><summary>Relevant chapters (${g.chapters.length})</summary>${chapters(g.chapters)}</details></div><aside class="gate-transfer"><h3>${esc(g.practiceTitle)}</h3><p>${esc(g.practice)}</p><div class="transfer-actions">${g.links.map(([t,h])=>`<a href="${esc(h)}">${esc(t)} <span aria-hidden="true">→</span></a>`).join('')}</div><details><summary>Check your reasoning</summary><p>${esc(g.challenge)}</p></details><details><summary>What still belongs in the external project?</summary><p>${esc(g.outside)}</p></details><details id="noteDetails" ${n.artifact||n.interpretation?'open':''}><summary>Record your evidence</summary><label class="field" for="artifactRef">Artifact link or filename<input id="artifactRef" maxlength="15000" value="${esc(n.artifact||'')}" placeholder="Repository path, DOI or local filename"></label><label class="field" for="artifactNote">What does this evidence establish—and not establish?<textarea class="portfolio-note" id="artifactNote" maxlength="15000">${esc(n.interpretation||'')}</textarea></label><div class="evidence-save"><button class="button" id="saveGate">Save note</button><span id="gateSaveState" role="status">${n.updatedAt?'Note recorded; not reviewed.':''}</span></div></details></aside>`;
  $('gateTabs').querySelectorAll('[data-gate]').forEach(b=>b.addEventListener('click',()=>{current=b.dataset.gate;render();$('gate-'+current).focus();}));
  $('saveGate').addEventListener('click',saveNote);renderRunEvidence();
 }
 function saveNote(){
  notes[current]={artifact:$('artifactRef').value.trim(),interpretation:$('artifactNote').value.trim(),updatedAt:new Date().toISOString()};
  const persistent=store.set(KEY,notes);
  $('gateSaveState').textContent=persistent?'Saved on this device; not reviewed.':'Session only. Export to retain this note.';
  $('programmeSaveState').textContent=persistent?'Local notes saved.':'Browser saving unavailable. Export before leaving.';
 }
 $('gateTabs').addEventListener('keydown',e=>{
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
  e.preventDefault();const i=C.gates.findIndex(x=>x.id===current);
  const j=e.key==='Home'?0:e.key==='End'?C.gates.length-1:(i+(e.key==='ArrowRight'?1:-1)+C.gates.length)%C.gates.length;
  current=C.gates[j].id;render();$('gate-'+current).focus();
 });
 $('researchThreads').innerHTML=C.researchThreads.map(t=>`<article class="thread"><p class="eyebrow">${esc(t.focus)} · ${esc(t.chapters)}</p><h3>${esc(t.title)}</h3><p>${esc(t.deposit)}</p><a href="${esc(t.href)}">${esc(t.cta)} →</a><small>${esc(t.boundary)}</small></article>`).join('');
 $('bookParts').innerHTML=C.parts.map(p=>`<details><summary>${esc(p.number)} &nbsp; ${esc(p.title)}</summary>${chapters(p.chapters)}</details>`).join('');
 $('bookFile').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  bookVerified=false;
  if(!/\.pdf$/i.test(file.name)||file.size>100*1024*1024){$('bookStatus').textContent='Choose a PDF under 100 MB.';return;}
  $('bookStatus').textContent='Checking the selected edition locally…';
  try{
   if(root.crypto?.subtle){
    const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
    const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
    if(hash!==C.sourceSha256){$('bookStatus').textContent='This is not the supplied V6.17 Design Revision edition. The existing book remains selected to avoid opening the wrong chapters.';return;}
    bookVerified=true;
   }
   if(bookURL?.startsWith('blob:'))URL.revokeObjectURL(bookURL);bookURL=URL.createObjectURL(file);
   $('bookStatus').textContent=bookVerified?'V6.17 Design Revision verified. Chapter links open your local file; nothing is uploaded.':'Local PDF selected; edition not verified in this browser. Page links assume V6.17 Design Revision.';
  }catch(err){$('bookStatus').textContent='Could not open the local PDF: '+err.message;}
 });
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-book-page]');if(!b)return;
  if(!bookURL){$('bookStatus').textContent='Select your V6.17 Design Revision PDF above before opening chapter pages.';$('bookFile').focus();UI.toast('Select your local book at the top of the programme.');return;}
  const page=Number(b.dataset.bookPage);if(!Number.isInteger(page)||page<1||page>C.physicalPageCount)return;
  const a=document.createElement('a');a.href=bookURL+'#page='+page;a.target='_blank';a.rel='noopener';a.click();
 });
 $('exportProgramme').addEventListener('click',()=>{
  const pending=$('artifactRef').value.trim()||$('artifactNote').value.trim();if(pending)saveNote();
  UI.download('fokolab-programme-v6.16.json',JSON.stringify({schema:'fokolab-programme/1',source:{edition:C.edition,title:C.title,sha256:C.sourceSha256},exportedAt:new Date().toISOString(),evidenceStatus:'Notes and attached calculations, not independent validation or a qualification. Export includes raw observations in attached runs.',notes,attachments:attachments()},null,2));
 });
 $('importProgramme').addEventListener('click',()=>$('programmeImportFile').click());
 $('programmeImportFile').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
   if(f.size>15000000)throw new Error('Record must be under 15 MB.');
   const obj=JSON.parse(await f.text());
   if(obj.schema!=='fokolab-programme/1'||obj.source?.sha256!==C.sourceSha256||!validNotes(obj.notes))throw new Error('Unsupported edition or invalid record. Existing notes are unchanged.');
   if(obj.attachments!==undefined&&!validAttachments(obj.attachments))throw new Error('Invalid run attachments; existing records unchanged.');
   if(obj.attachments){const received=obj.attachments.map(x=>({...x,evidenceLevel:'imported; not independently reproduced',review:null,run:{...x.run,source:'imported; unverified'}})),ids=new Set(received.map(x=>x.id));store.set(RUN_KEY,attachments().filter(x=>!ids.has(x.id)).concat(received).slice(-60));}
   // Explicit import merges known gates. It never executes imported links or code.
   notes={...notes,...obj.notes};const ok=store.set(KEY,notes);render();$('programmeSaveState').textContent=ok?'Imported as unreviewed notes on this device.':'Imported for this session. Export before leaving.';
  }catch(err){$('programmeSaveState').textContent=err.message;}
 });
 root.addEventListener('pagehide',()=>{if(bookURL?.startsWith('blob:'))URL.revokeObjectURL(bookURL)});
 render();
})(window);
