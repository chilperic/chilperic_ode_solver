/** Shared additive navigation, offline mathematics, publication state and keyboard behavior. */
(function(root){'use strict';
const doc=root.document;if(!doc)return;
const prefix=(doc.currentScript?.getAttribute('src')||'src/upgrade/common.js').replace(/src\/upgrade\/common\.js(?:\?.*)?$/,'');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const path=(root.location.pathname.split('/').pop()||'index.html');
let mathsReady=null,painting=false,timer;
function loadMaths(){if(mathsReady)return mathsReady;mathsReady=new Promise((resolve,reject)=>{
 root.MathJax={tex:{inlineMath:[['\\(','\\)']],displayMath:[['\\[','\\]']],processEscapes:true},svg:{fontCache:'local'},startup:{typeset:false},options:{skipHtmlTags:['script','noscript','style','textarea','pre','code'],ignoreHtmlClass:'no-mathjax'}};
 const s=doc.createElement('script');s.src=prefix+'assets/vendor/mathjax/tex-svg.js';s.onload=()=>root.MathJax.startup.promise.then(resolve,reject);s.onerror=()=>reject(Error('Local mathematics renderer could not load.'));doc.head.append(s);
 });return mathsReady;}
root.FokoTypeset=async(node=doc.body)=>{if(painting)return;const hasTex=/\\\(|\\\[/.test(node.textContent||''),katex=node.querySelectorAll?.('.katex:not([data-svg-done])')||[];if(!hasTex&&!katex.length)return;painting=true;try{await loadMaths();
 // Replace the original TeX renderer's font-dependent output with local SVG.
 // The source annotation is retained in the SVG accessibility tree; no equations are reconstructed from pixels.
 for(const k of katex){const a=k.querySelector('annotation[encoding="application/x-tex"]');if(!a)continue;const display=!!k.closest('.katex-display');const svg=await root.MathJax.tex2svgPromise(a.textContent,{display});svg.dataset.svgDone='true';k.replaceWith(svg);}
 await root.MathJax.typesetPromise([node]);
 }catch(e){console.warn(e.message);}finally{painting=false;}};
function appendLabs(){}
function publication(){if(!['book.html','learn.html','programme.html','practice.html','book-observations.html'].includes(path))return;
 const record=root.FokoPublication||{};const n=doc.createElement('p');n.className='u-publication';n.innerHTML='V6.17 public companion · scientific chapter, section and practice navigation retained. Private author-planning pages 6–9 are omitted in this public copy; physical page numbering is unchanged. <a href="'+prefix+'publication.html">Publication scope</a>.';
 const host=doc.querySelector('main');if(host){const h=host.querySelector('h1');(h?.parentElement||host).append(n);}
}
function init(){doc.documentElement.dataset.fokoRelease='80.2.0';if(!doc.querySelector('link[data-foko-unified]')){const l=doc.createElement('link');l.rel='stylesheet';l.href=prefix+'styles/unified.css';l.dataset.fokoUnified='true';doc.head.append(l);}
 const semanticLabs=new Set(['plant-growth','leaf-physiology','adaptation','lipids','tcell','randomness','branching','diffusion','fractals','ode','stochastic','steady','bifurcation','agent','population-genetics','evolution','sensitivity','optimization','fitting','statistics','advanced-methods','ai-modeling','sciml','ml','linear-algebra','networks','symbolic','studio','workbench']);
 const lab=doc.body.dataset.lab;if(semanticLabs.has(lab)){const heading=doc.querySelector('.u-heading h1,.page-heading h1,main h1');if(heading&&!doc.querySelector('.u-page-emblem')){const img=doc.createElement('img');img.className='u-page-emblem';img.src=prefix+'assets/lab-logos/'+lab+'.svg';img.alt='';img.setAttribute('aria-hidden','true');heading.before(img);}}appendLabs();
 // Correct only exposed release labels; historical evidence remains explicitly historical in private docs.
 doc.querySelectorAll('[data-release-label]').forEach(n=>n.textContent='80.2.0');
 doc.querySelectorAll('a[href*="Scientific_Mastery_V6_17_Design_Revision.pdf"]').forEach(a=>a.href=prefix+'materials/Scientific_Mastery_V6_17_Public_Companion.pdf');
 // Public headers contain no internal release badges.
 root.FokoTypeset(doc.body);
 const observer=new MutationObserver(changes=>{if(painting)return;if(!changes.some(c=>[...c.addedNodes].some(n=>n.nodeType===1&&!n.closest?.('mjx-container,.js-plotly-plot')&&(n.matches?.('.katex')||n.querySelector?.('.katex')||/\\\(|\\\[/.test(n.textContent||'')))))return;clearTimeout(timer);timer=setTimeout(()=>root.FokoTypeset(doc.body),200);});observer.observe(doc.body,{childList:true,subtree:true});
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
}(globalThis));
