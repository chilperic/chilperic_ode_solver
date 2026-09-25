/* Presentation only. Does not alter model state, selector options, solver settings,
 * plot families or experiment data. Source chapter links are optional companions. */
(function(root){'use strict';
 const doc=root.document,I=root.FokoIdentityMap;if(!doc||!I)return;
 const script=doc.currentScript?.getAttribute('src')||'',prefix=script.replace(/src\/(?:platform\/visual-identity|research\/shell|v76\/app-shell)\.js(?:\?.*)?$/,'');
 const base=prefix===script?'':prefix;
 const page=doc.body.dataset.pageKey||'index';
 const family=I.pages[page]||'learning';
 const safeHref=h=>h&&!/^(?:https?:|mailto:|#|data:)/i.test(h);
 const routeKey=h=>String(h||'').split('?')[0].split('#')[0].split('/').pop().replace(/\.html$/,'');
 const iconKey=k=>I.icons.includes(k)?k:(k==='index'?'home':k==='library'?'examples':'docs');
 function icon(key,size=40){const image=doc.createElement('img');image.className='identity-icon';image.src=base+'assets/lab-logos/'+(doc.documentElement.dataset.appearance==='dark'?'dark/':'')+iconKey(key)+'.svg';image.alt='';image.width=size;image.height=size;image.setAttribute('aria-hidden','true');return image;}
 function decorate(scope=doc){
  scope.querySelectorAll('.directory-item:not([data-identity-ready])').forEach(card=>{
   const key=routeKey(card.querySelector('a')?.getAttribute('href'));card.dataset.colorFamily=I.pages[key]||'learning';card.dataset.identityReady='true';
   const head=card.querySelector('.directory-item-heading');if(head){const holder=doc.createElement('span');holder.className='lab-emblem';holder.append(icon(key,44));head.prepend(holder);}
  });
  scope.querySelectorAll('.v72-atlas-card:not([data-identity-ready]),.library-item:not([data-identity-ready])').forEach(card=>{
   const key=routeKey(card.querySelector('a[href*=".html"]')?.getAttribute('href'));card.dataset.colorFamily=I.pages[key]||'foundation';card.dataset.identityReady='true';
  });
  scope.querySelectorAll('.core-lab-shortcuts>a,.side-links>a,.v76-popover a,.v76-mobile-nav-section a').forEach(a=>{
   if(a.dataset.identityReady)return;const h=a.getAttribute('href');if(!safeHref(h))return;const key=routeKey(h);a.dataset.colorFamily=I.pages[key]||'learning';a.dataset.identityReady='true';
   const holder=a.querySelector('.v76-popover-icon,.nav-icon');if(holder){holder.replaceChildren(icon(key,24));holder.classList.add('lab-emblem','small');}
  });
  scope.querySelectorAll('.book-part[data-book-part]').forEach(el=>el.removeAttribute('data-color-family'));
 }
 const chapters={studio:[1,5],workbench:[1,24],ode:[5,4],stochastic:[14,15],steady:[3,5],bifurcation:[5,18],agent:[15,14],'population-genetics':[14,15],evolution:[17,18],sensitivity:[4,12],optimization:[17,18],fitting:[11,2],statistics:[11,13],'advanced-methods':[13,16],'ai-modeling':[21,23],sciml:[20,21,22],ml:[19,20],'linear-algebra':[2,3],networks:[15,2],symbolic:[4,3]};
 const chapterMeta=[{"title":"Book · 1. Scientific Models as Executable Arguments","href":"book.html?chapter=1"},{"title":"Book · 2. Linear Algebra, Information Geometry, and Inverse Problems","href":"book.html?chapter=2"},{"title":"Book · 3. Krylov Solvers, Sparse Systems, and Numerical Evidence","href":"book.html?chapter=3"},{"title":"Book · 4. Differentiation, Automatic Differentiation, and Sensitivity","href":"book.html?chapter=4"},{"title":"Book · 5. Dynamical Systems, ODE/DAE/PDE Solvers, and Verification","href":"book.html?chapter=5"},{"title":"Book · 6. Scientific Python I: Contracts, State, and Diagnostic Testing","href":"book.html?chapter=6"},{"title":"Book · 7. Scientific Python II: Interfaces, Types, and Trust Boundaries","href":"book.html?chapter=7"},{"title":"Book · 8. Scientific Python III: Array Thinking, Vectorization, and Numerical Types","href":"book.html?chapter=8"},{"title":"Book · 9. Scientific Python IV: Reproducible Experiments, Failures, and Randomness","href":"book.html?chapter=9"},{"title":"Book · 10. Scientific Python V: Callables, Packaging, and the Project Bridge","href":"book.html?chapter=10"},{"title":"Book · 11. Parameter Estimation, Identifiability, and PEtab Workflows","href":"book.html?chapter=11"},{"title":"Book · 12. Global Sensitivity, Uncertainty Quantification, and Experimental Design","href":"book.html?chapter=12"},{"title":"Book · 13. Bayesian Workflow, State Estimation, and Simulation-Based Inference","href":"book.html?chapter=13"},{"title":"Book · 14. Stochastic Processes from CTMCs to SDEs","href":"book.html?chapter=14"},{"title":"Book · 15. Agent-Based Models, Temporal Networks, and Calibration","href":"book.html?chapter=15"},{"title":"Book · 16. Multiscale Modelling, Reduction, and Scientific Digital Twins","href":"book.html?chapter=16"},{"title":"Book · 17. Optimization Geometry, Constraints, and Reliable Algorithms","href":"book.html?chapter=17"},{"title":"Book · 18. Robust Decisions, Multiobjective Design, Optimal Control, and MPC","href":"book.html?chapter=18"},{"title":"Book · 19. Statistical Machine Learning on Real and Biological Data","href":"book.html?chapter=19"},{"title":"Book · 20. Deep Learning as Differentiable Computation","href":"book.html?chapter=20"},{"title":"Book · 21. Scientific Machine Learning and Hybrid Mechanistic-Neural Models","href":"book.html?chapter=21"},{"title":"Book · 22. Equation Discovery, Model Discrimination, and Causal Reasoning","href":"book.html?chapter=22"},{"title":"Book · 23. Transformers, Retrieval, and Verifiable Scientific Agents","href":"book.html?chapter=23"},{"title":"Book · 24. Scientific Software Architecture, Contracts, and Testing","href":"book.html?chapter=24"},{"title":"Book · 25. Performance, HPC, Reproducibility, FAIR, and Deployment","href":"book.html?chapter=25"},{"title":"Book · 26. Integrated Scientific Cases: From Evidence to Decision","href":"book.html?chapter=26"},{"title":"Book · 27. Portfolio Integration and Technical Defense","href":"book.html?chapter=27"}];
 if(chapters[page]){
  const target=doc.querySelector('.v72-inspector')||doc.querySelector('.work-panel.controls');
  if(target&&!doc.getElementById('identityReading')){
   const details=doc.createElement('details');details.className='identity-reading';details.id='identityReading';
   const summary=doc.createElement('summary');summary.textContent='Related reading · V6.17';details.append(summary);
   const intro=doc.createElement('p');intro.textContent='Source chapters and worked practice. These links do not certify the lab’s implementation.';details.append(intro);
   for(const n of chapters[page]){const record=chapterMeta.find(x=>x.href==='book.html?chapter='+n);if(!record)continue;const a=doc.createElement('a');a.href=base+record.href;a.textContent=record.title.replace('Book · ','Chapter ');details.append(a);}
   target.append(details);
  }
 }
 // The lab identity is named as well as colored. No category depends on color alone.
 function syncTheme(){
  const mode=doc.documentElement.dataset.appearance||'light';
  const img=mode==='dark'?'foko-lab-mark-reversed.svg':'foko-lab-micro.svg';
  doc.querySelectorAll('.brand>img,.foko-brand-mark>img').forEach(x=>{const src=base+'assets/brand/'+img;if(!x.getAttribute('src')?.endsWith(img))x.src=src;});
  doc.querySelectorAll('img[src*="assets/lab-logos/"]').forEach(x=>{const name=x.getAttribute('src').split('/').pop();x.src=base+'assets/lab-logos/'+(mode==='dark'?'dark/':'')+name;});
  doc.querySelectorAll('.identity-guide-mark>img').forEach(x=>{const name=x.getAttribute('src').split('/').pop().replace('-dark','');x.src=base+'assets/brand/'+name.replace('.svg',(mode==='dark'?'-dark':'')+'.svg');});
  // Keep appearance usable when storage is denied.

  try{localStorage.setItem('foko:appearance',JSON.stringify(doc.getElementById('appearance')?.value||mode));localStorage.setItem('fokolab:appearance',mode);}catch(_){/* Appearance continues without persistence. */}
 }
 const attr=new MutationObserver(m=>{if(m.some(x=>x.attributeName==='data-appearance'))syncTheme();});attr.observe(doc.documentElement,{attributes:true,attributeFilter:['data-appearance']});
 decorate();syncTheme();
 let queued=false;
 const observer=new MutationObserver(mutations=>{
  if(queued||!mutations.some(m=>m.addedNodes.length))return;queued=true;
  requestAnimationFrame(()=>{queued=false;decorate();});
 });
 // Observe only collections / overlays, never the numerical chart subtree.
 ['labDirectory','atlasGridV72','libraryResults','commandResults','v76-shell-portal'].forEach(id=>{const el=doc.getElementById(id);if(el)observer.observe(el,{subtree:true,childList:true});});
 // Small, explicit page helpers; do not alter run callbacks or interpretation.
 root.FokoVisualIdentity={version:'79.1.0-design',family,decorate};
})(window);
