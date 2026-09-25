/* Loaded only by the directory; do not add catalogue UI weight to computation pages. */
(function(root){'use strict';
const $=id=>document.getElementById(id),esc=root.FokoResearchUI.esc,TOOLS=root.FokoResearchTools,catalog=root.FokoScientificExampleCatalog||[];
if($('labDirectory')){
 const query=$('labQuery'),group=$('labGroup'),size=8;let page=1;
 const methods=root.FokoLabMethodIndex||{};
 const labsFor={'studio.html':[], 'workbench.html':[], 'ode.html':['ODE'], 'stochastic.html':['Stochastic'], 'steady.html':['Steady State'], 'bifurcation.html':['Bifurcation'], 'agent.html':['Agent'], 'population-genetics.html':['Population Genetics'], 'evolution.html':['Evolution Landscapes'], 'sensitivity.html':[], 'optimization.html':['Optimization'], 'fitting.html':['Fitting'], 'statistics.html':['Statistics'], 'advanced-methods.html':['Advanced Methods'], 'ai-modeling.html':['AI Modeling'], 'sciml.html':['SciML'], 'ml.html':['Machine Learning'], 'linear-algebra.html':['Linear Algebra'], 'networks.html':['Networks'], 'symbolic.html':['Symbolic']};
 for(const l of (root.FokoUpgrade?.labs||[]))labsFor[l.route]=[l.title];
 const friendly={'ODE dynamics':'ODE Lab','Stochastic processes':'Stochastic Lab','Equilibria':'Steady-State Lab','Optimization':'Optimization Lab'};
 group.innerHTML='<option value="">All areas</option>'+[...new Set(TOOLS.map(t=>t[3]))].map(v=>`<option>${esc(v)}</option>`).join('');
 const params=new URLSearchParams(location.search);if(params.has('q'))query.value=params.get('q');if([...group.options].some(o=>o.value===params.get('area')))group.value=params.get('area');
 function renderLabs(){
  const q=query.value.trim().toLowerCase();const rows=TOOLS.filter(t=>(!group.value||t[3]===group.value)&&(t.join(' ')+' '+(methods[t[1]]||[]).join(' ')).toLowerCase().includes(q));
  const n=Math.max(1,Math.ceil(rows.length/size));page=Math.min(Math.max(1,page),n);const start=(page-1)*size,shown=rows.slice(start,start+size);
  $('labCount').textContent=rows.length?`${rows.length} of ${TOOLS.length} labs · showing ${start+1}–${start+shown.length}`:`No matching labs. All ${TOOLS.length} remain available; clear the filters.`;
  $('labPage').textContent=`Page ${page} of ${n}`;$('labPrevious').disabled=page===1;$('labNext').disabled=page===n;
  $('labDirectory').innerHTML=shown.map(t=>{
   const methodList=methods[t[1]]||[],labels=labsFor[t[1]]||[],count=catalog.filter(c=>labels.includes(c.lab)).length;
   const exampleHref=labels.length?'examples.html?lab='+encodeURIComponent(labels[0]):t[1]==='studio.html'?'studio.html#catalogueBlock':t[1]==='sensitivity.html'?'sensitivity.html':'examples.html';
   return `<article class="directory-item" data-route="${esc(t[1])}"><div class="directory-item-heading"><h2><a href="${esc(t[1])}">${esc(friendly[t[0]]||t[0])}</a></h2><span>${esc(t[3])}</span></div><p>${esc(t[2])}.</p><div class="actions"><a class="button-link" href="${esc(t[1])}">Open lab</a><a class="directory-examples" href="${esc(exampleHref)}">${count?count+' examples':'Examples'} →</a></div>${methodList.length?`<details class="directory-methods"><summary>Method options</summary><ul>${methodList.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p>Availability and validation qualifications remain in the lab.</p></details>`:''}</article>`;
  }).join('')||'<p class="empty-block">No matching labs. Try a broader method name or clear the filters.</p>';
 }
 $('labDirectoryFilters').onsubmit=e=>{e.preventDefault();page=1;renderLabs();};[query,group].forEach(x=>x.addEventListener('input',()=>{page=1;renderLabs();}));
 $('labReset').onclick=()=>{query.value='';group.value='';page=1;renderLabs();query.focus();};
 $('labPrevious').onclick=()=>{page--;renderLabs();};$('labNext').onclick=()=>{page++;renderLabs();};renderLabs();
}
})(window);
