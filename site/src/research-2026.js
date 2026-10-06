(function(){
  'use strict';
  const d=document;
  if(!d||d.documentElement.dataset.rxReady==='1')return;
  d.documentElement.dataset.rxReady='1';
  const script=d.currentScript;
  const root=script?new URL('../',script.src):new URL('/',location.href);
  d.body.classList.add('rx-enhanced');

  function href(path){return new URL(path,root).href;}
  function same(path){
    const target=new URL(path,root).pathname.replace(/index\.html$/,'');
    const here=location.pathname.replace(/index\.html$/,'');
    return here===target || (path==='research.html' && /\/research(?:\.html|\/[^/]+\.html)$/.test(location.pathname));
  }

  const nav=d.createElement('nav');
  nav.className='rx-nav';
  nav.setAttribute('aria-label','FokoLab research navigation');
  nav.innerHTML='<div class="rx-nav-inner">'+
    '<a class="rx-brand" href="'+href('index.html')+'" aria-label="FokoLab home"><img src="'+href('assets/brand/foko-lab-logo.svg')+'" alt="FokoLab"></a>'+
    '<div class="rx-nav-links">'+
      '<a href="'+href('research.html')+'" data-path="research.html">Research</a>'+
      '<a href="'+href('experiments.html')+'" data-path="experiments.html">Experiments</a>'+
      '<a href="'+href('labs.html')+'" data-path="labs.html">Laboratories</a>'+
      '<a href="'+href('analysis-studio.html')+'" data-path="analysis-studio.html">Analysis</a>'+
      '<a href="'+href('trust.html')+'" data-path="trust.html">Methods & limits</a>'+
      '<a class="rx-nav-cta" href="'+href('contributors.html')+'" data-path="contributors.html">People</a>'+
    '</div></div>';
  d.body.insertBefore(nav,d.body.firstChild);
  nav.querySelectorAll('[data-path]').forEach(a=>{if(same(a.dataset.path))a.setAttribute('aria-current','page');});
  const prog=d.createElement('div');prog.className='rx-progress';d.body.appendChild(prog);
  function progress(){
    const h=d.documentElement.scrollHeight-innerHeight;
    prog.style.width=(h>0?Math.max(0,Math.min(1,scrollY/h))*100:0)+'%';
  }
  addEventListener('scroll',progress,{passive:true});progress();

  const main=d.querySelector('main');
  if(main)main.classList.add('rx-main');

  const reveal=[...d.querySelectorAll('main > section, main > article, .research-project-panel, .atlas-card, .figure-card, .panel')];
  if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}}),{threshold:.08,rootMargin:'0px 0px -6% 0px'});
    reveal.forEach(el=>{el.classList.add('rx-reveal');io.observe(el);});
  }else reveal.forEach(el=>el.classList.add('is-visible'));

  d.querySelectorAll('canvas').forEach(canvas=>{
    const host=canvas.closest('section,.panel,article,div');
    if(!host||host.dataset.rxLive==='1')return;
    host.dataset.rxLive='1';host.classList.add('rx-live-zone');
    const tag=d.createElement('div');tag.className='rx-live-label';tag.textContent='Live animation / computed view';
    host.insertBefore(tag,host.firstChild);
  });

  d.querySelectorAll('[data-rx-reel]').forEach(reel=>{
    const slides=[...reel.querySelectorAll('[data-rx-slide]')];
    if(slides.length<2)return;
    let i=0,timer=null,paused=false;
    const dots=d.createElement('div');dots.className='rx-reel-dots';
    slides.forEach((_,idx)=>{const dot=d.createElement('span');dot.className='rx-reel-dot'+(idx===0?' is-active':'');dots.appendChild(dot);});
    reel.appendChild(dots);
    const controls=d.createElement('div');controls.className='rx-reel-controls';
    const prev=d.createElement('button'),toggle=d.createElement('button'),next=d.createElement('button');
    prev.type=next.type=toggle.type='button';prev.setAttribute('aria-label','Previous result');next.setAttribute('aria-label','Next result');toggle.setAttribute('aria-label','Pause result reel');
    prev.textContent='←';toggle.textContent='Ⅱ';next.textContent='→';controls.append(prev,toggle,next);reel.appendChild(controls);
    function show(n){
      i=(n+slides.length)%slides.length;
      slides.forEach((s,k)=>s.classList.toggle('is-active',k===i));
      [...dots.children].forEach((s,k)=>s.classList.toggle('is-active',k===i));
    }
    function start(){
      clearInterval(timer);
      if(paused||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      timer=setInterval(()=>show(i+1),5200);
    }
    prev.onclick=()=>{show(i-1);start()};next.onclick=()=>{show(i+1);start()};
    toggle.onclick=()=>{paused=!paused;toggle.textContent=paused?'▶':'Ⅱ';toggle.setAttribute('aria-label',paused?'Play result reel':'Pause result reel');start()};
    reel.addEventListener('mouseenter',()=>{clearInterval(timer)});reel.addEventListener('mouseleave',start);
    reel.addEventListener('focusin',()=>clearInterval(timer));reel.addEventListener('focusout',start);
    show(0);start();
  });
})();