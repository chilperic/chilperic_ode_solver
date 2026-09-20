/* Book companion: exact edition, source-page navigation and local page bookmarks.
 * Extracted text is a search locator, never an equation renderer or an AI answer.
 * A native PDF iframe is mounted only after the reader asks for it.
 */
(function(root){'use strict';
 const B=root.FokoBook,U=root.FokoResearchUI,S=root.FokoResearchStore;
 if(!B||!U||!S)return;
 const $=id=>document.getElementById(id),esc=U.esc;
 const key='foko:book:selected-page:'+B.sha256;
 let selectedPage=1,selectedChapter=null,searchData=null,searchPromise=null,sequence=0,results=[],visible=20;
 function pageNumber(value){if(!/^\d+$/.test(String(value)))return null;const n=Number(value);return Number.isSafeInteger(n)&&n>=1&&n<=B.physicalPageCount?n:null;}
 function chapterAt(page){return B.chapters.find(c=>c.pdfPage<=page&&c.endPdfPage>=page)||null;}
 function pdfURL(page){return B.pdf+'#page='+page;}
 function saveStatus(message){$('pageStatus').textContent=message;}
 function renderFrame(){const host=$('pdfFrameHost');host.replaceChildren();if(!$('inlineViewer').open)return;const frame=document.createElement('iframe');frame.title='Original '+B.edition+' PDF, selected page '+selectedPage;frame.src=pdfURL(selectedPage);frame.loading='lazy';host.append(frame);}
 function showPage(page,chapter=null,updateURL=true,focus=true){
  page=pageNumber(page);if(!page){U.toast('Choose a PDF page between 1 and '+B.physicalPageCount+'.');return false;}
  selectedPage=page;selectedChapter=chapter&&chapter.pdfPage<=page&&page<=chapter.endPdfPage?chapter:chapterAt(page);
  $('readingPanel').hidden=false;$('bookPage').value=String(page);$('openSelectedPage').href=pdfURL(page);
  $('readingTitle').textContent=selectedChapter?selectedChapter.title:(B.appendices.find(a=>a.pdfPage===page)?.title||'Original book');
  const label=page>24?'printed page '+(page-24):'front matter';
  $('readingLocation').textContent=(selectedChapter?'Chapter '+selectedChapter.id+' · ':'')+label+' · PDF page '+page+' of '+B.physicalPageCount;
  $('chapterSections').hidden=!selectedChapter;
  $('sectionLinks').innerHTML=selectedChapter?selectedChapter.sections.map(s=>`<li><a href="${esc(pdfURL(s.pdfPage))}" data-book-jump="${s.pdfPage}" target="_blank" rel="noopener">${esc(s.title)} <span class="muted">· p. ${s.printedPage}</span></a></li>`).join(''):'';
  const related=selectedChapter?.related||[];
  $('chapterCompanion').innerHTML=related.length?related.map(l=>`<p><a href="${esc(l.href)}">${esc(l.label)} →</a><small>${esc(l.relation)}</small></p>`).join(''):'<p>Read the original chapter and its investigations first. No exact browser reproduction of this chapter is claimed.</p><p><a href="learn.html">Browse available companion lessons →</a></p>';
  if(selectedChapter&&[3,4].includes(selectedChapter.id)){const note=document.createElement('p');note.className='book-source-warning';const a=document.createElement('a');a.href=selectedChapter.id===3?'#errata-cg':'#errata-ad';a.textContent='Known source issue in this chapter — read the erratum';note.append(a);$('chapterCompanion').prepend(note);}
  $('chapterGate').href='programme.html'+(selectedChapter?'?gate='+selectedChapter.gate:'');
  saveStatus('Selected page: '+page+'. Use Save selected page to retain it. Scrolling within the PDF viewer is not tracked.');
  if(updateURL){const q=new URLSearchParams();if(selectedChapter)q.set('chapter',selectedChapter.id);q.set('page',page);try{history.pushState(null,'','book.html?'+q.toString()+'#readingPanel');}catch(_){/* Opaque origins still permit read/download; no false persistence claim. */}}
  renderFrame();if(focus){$('readingTitle').focus({preventScroll:true});$('readingPanel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  return true;
 }
 function fromURL(focus=false){const p=new URLSearchParams(location.search),id=Number(p.get('chapter')),chapter=B.chapters.find(c=>c.id===id);const raw=p.get('page');if(raw!==null&&!pageNumber(raw)){U.toast('Invalid page in the link. Use the chapter directory.');return;}if(raw||chapter)showPage(raw||chapter.pdfPage,chapter,false,focus);}
 document.addEventListener('click',e=>{const a=e.target.closest('[data-select-chapter],[data-book-jump]');if(!a)return;if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();const c=a.dataset.selectChapter?B.chapters.find(c=>c.id===Number(a.dataset.selectChapter)):null;showPage(c?.pdfPage||a.dataset.bookJump,c);});
 $('pageForm').addEventListener('submit',e=>{e.preventDefault();if($('pageForm').reportValidity())showPage($('bookPage').value);});
 $('inlineViewer').addEventListener('toggle',renderFrame);
 $('closeReading').onclick=()=>{$('readingPanel').hidden=true;$('inlineViewer').open=false;$('pdfFrameHost').replaceChildren();try{history.pushState(null,'','book.html#contents');}catch(_){}$('contentsTitle').setAttribute('tabindex','-1');$('contentsTitle').focus();};
 function updateResume(){const saved=S.get(key,null),page=saved?.sha256===B.sha256?pageNumber(saved.page):null;$('resumeBook').hidden=!page;if(page){$('resumeBook').href='book.html?page='+page+'#readingPanel';$('resumeBook').textContent='Resume selected PDF page '+page+' →';}}
 $('bookmarkPage').onclick=()=>{const saved=S.set(key,{sha256:B.sha256,page:selectedPage,updatedAt:new Date().toISOString()});saveStatus(saved?'Selected page saved on this device. No reading completion is inferred.':'Saved for this session only. Browser storage is unavailable; copy this page link or download the book.');updateResume();};
 const normal=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 async function loadIndex(){
  if(searchData)return searchData;
  if(!searchPromise)searchPromise=fetch(B.index,{credentials:'same-origin'}).then(r=>{if(!r.ok)throw new Error('Text index returned HTTP '+r.status);return r.json();}).then(x=>{if(x.sha256!==B.sha256||!Array.isArray(x.pages)||x.pages.length!==B.physicalPageCount||!x.pages.every(p=>pageNumber(p.page)&&typeof p.text==='string'))throw new Error('The search index does not match this book edition.');searchData=x;return x;}).catch(e=>{searchPromise=null;throw e;});
  return searchPromise;
 }
 function renderSearch(){
  const items=results.slice(0,visible);$('bookSearchResults').innerHTML=items.map(r=>{const c=chapterAt(r.page);return `<li><a href="${esc(pdfURL(r.page))}" data-book-jump="${r.page}" target="_blank" rel="noopener">${esc(c?'Chapter '+c.id+' · '+c.title:'Book source')} · ${r.page>24?'p. '+(r.page-24):'front matter'}<span class="small muted"> · PDF ${r.page}</span></a><p>${esc(r.snippet)}</p></li>`;}).join('');
  $('moreSearch').hidden=visible>=results.length;
  $('bookSearchStatus').textContent=results.length?`${results.length} matching source pages; ${items.length} shown. Text extracts locate passages; read the original PDF for equations, code and figure layout.`:'No matching source pages. Try fewer words or use the contents.';
 }
 $('bookSearch').addEventListener('submit',async e=>{e.preventDefault();const q=$('bookQuery').value.trim();if(q.length<2){$('bookSearchStatus').textContent='Enter at least two characters.';return;}const request=++sequence;$('bookSearchStatus').textContent='Searching the source text…';try{const x=await loadIndex();if(request!==sequence)return;const tokens=normal(q).split(/\s+/).filter(Boolean);results=x.pages.filter(p=>tokens.every(t=>normal(p.text).includes(t))).map(p=>{const n=normal(p.text),start=Math.max(0,n.indexOf(tokens[0])-80);return {page:p.page,snippet:(start?'…':'')+p.text.slice(start,start+320)+(start+320<p.text.length?'…':'')};});visible=20;renderSearch();}catch(err){if(request!==sequence)return;$('bookSearchResults').replaceChildren();$('moreSearch').hidden=true;$('bookSearchStatus').textContent='Search unavailable: '+err.message+' Open the PDF and use its built-in search. For local use, run the supplied HTTP server.';}});
 $('moreSearch').onclick=()=>{visible+=20;renderSearch();};
 root.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);if(!p.has('page')&&!p.has('chapter')){$('readingPanel').hidden=true;$('pdfFrameHost').replaceChildren();}else fromURL(false);});
 updateResume();fromURL(false);
 root.FokoBookReader={showPage,getState:()=>({page:selectedPage,chapter:selectedChapter?.id||null,matchedPages:results.length,searchLoaded:!!searchData})};
})(window);
