/** Final shared tokens and attribution: no physical/numerical state is rewritten. */
(function(){'use strict';const d=document,base=new URL('../../',d.currentScript.src);
function boot(){if(!d.querySelector('link[data-fl-final]')){const l=d.createElement('link');l.rel='stylesheet';l.href=new URL('styles/revision83.css',base);l.dataset.flFinal='true';d.head.append(l);}d.documentElement.dataset.fokoRelease='80.3.0';
 const p=decodeURIComponent(location.pathname),key=/plants|plant-growth|leaf|adaptation|continuum|photosynthesis/.test(p)?'plants':/lipid|fatty-acid/.test(p)?'lipids':/tcell/.test(p)?'tcells':null;
 if(key&&!d.querySelector('.fl-credit-link')){const a=d.createElement('a');a.className='fl-credit-link';a.href=new URL('contributors.html#'+key,base);a.textContent='Acknowledgements';(d.querySelector('.foko-context')||d.querySelector('main')).append(a);}
 d.querySelectorAll('dd[role=status]').forEach(n=>{n.removeAttribute('role');n.setAttribute('aria-live','polite');});
 d.querySelectorAll('aside aside,.experiment-dock>aside').forEach(n=>{n.setAttribute('role','region');n.setAttribute('aria-label',n.getAttribute('aria-label')||'Model inputs');});
 d.querySelectorAll('.chart-grid[aria-pressed],div[data-layout][aria-pressed]').forEach(n=>n.removeAttribute('aria-pressed'));
 d.querySelectorAll('.u-release-tag,.u-extra-labs,.recovery-provenance,.u-publication').forEach(n=>n.remove());
 for(const x of d.querySelectorAll('footer a[href*="release.html"]'))x.remove();
 for(const n of d.querySelectorAll('.chart-grid[aria-pressed]')){n.removeAttribute('aria-pressed');new MutationObserver(()=>{if(n.hasAttribute('aria-pressed'))n.removeAttribute('aria-pressed');}).observe(n,{attributes:true,attributeFilter:['aria-pressed']});}
 for(const n of d.querySelectorAll('div[aria-label]:not([role])'))n.setAttribute('role',n.hasAttribute('tabindex')?'region':'group');
 for(const [i,n] of [...d.querySelectorAll('.foko-context')].entries())n.setAttribute('aria-label',i?'Additional related workspaces':'Related scientific workspaces');
 for(const n of d.querySelectorAll('main aside')){n.setAttribute('role','region');n.setAttribute('aria-label',n.getAttribute('aria-label')||'Additional workspace information');}
 const title=d.querySelector('.lab-toolbar .fl-lab-title');if(title){title.setAttribute('role','heading');title.setAttribute('aria-level','1');}
 for(const n of d.querySelectorAll('div[id$="PlotTitle"],.chart-grid h3,#sciPlotLabel')){n.setAttribute('role','heading');n.setAttribute('aria-level','2');}
 const growth=d.querySelector('#growth>.growthHeading>h3');if(growth){growth.setAttribute('role','heading');growth.setAttribute('aria-level','2');}
 for(const n of d.querySelectorAll('.preset-action'))if(n.textContent.trim()==='Load')n.textContent='Select';
 const main=d.querySelector('main');if(main&&main.querySelector('h1')&&!main.querySelector('h2')){const h=d.createElement('h2');h.className='fl-sr-only';h.textContent='Workspace and results';main.querySelector('h1').after(h);}
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>setTimeout(boot,180));else setTimeout(boot,180);
})();
