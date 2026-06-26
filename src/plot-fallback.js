/* Lightweight Plotly fallback for offline/local audits.
 * If the Plotly CDN fails, Foko Lab still renders readable line, bar,
 * histogram and heatmap cards instead of blank panels.
 * It intentionally implements only the subset used by model.html.
 */
(function(){
  'use strict';
  if (window.Plotly && typeof window.Plotly.react === 'function') return;
  const NS = 'http://www.w3.org/2000/svg';
  const num = (v) => Number.isFinite(Number(v)) ? Number(v) : NaN;
  const clean = (a) => (a||[]).map(num).filter(Number.isFinite);
  const extent = (arrays) => {
    const vals = arrays.flatMap(clean);
    if (!vals.length) return [0, 1];
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (Math.abs(hi-lo) < 1e-12) { lo -= 1; hi += 1; }
    return [lo, hi];
  };
  const titleText = (layout, fallback) => (layout && layout.title && (layout.title.text || layout.title)) || fallback || 'Analysis';
  const svgEl = (name, attrs={}) => {
    const el = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k, String(v)));
    return el;
  };
  const label = (svg, x, y, text, attrs={}) => {
    const t = svgEl('text', {x, y, fill:'#263246', 'font-size':11, 'font-family':'Inter, system-ui, sans-serif', ...attrs});
    t.textContent = text;
    svg.appendChild(t);
  };
  const baseSvg = (el, title) => {
    el.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'mw-fallback-plot';
    const head = document.createElement('div');
    head.className = 'mw-fallback-title';
    head.textContent = title;
    const svg = svgEl('svg', {viewBox:'0 0 760 420', role:'img', 'aria-label':title});
    wrap.appendChild(head); wrap.appendChild(svg); el.appendChild(wrap);
    svg.appendChild(svgEl('rect', {x:0,y:0,width:760,height:420,fill:'#fff'}));
    svg.appendChild(svgEl('rect', {x:58,y:32,width:660,height:318,fill:'#fff',stroke:'#d7e2f0'}));
    return svg;
  };
  const makeScale = (lo, hi, a, b) => (v) => a + (num(v)-lo) * (b-a) / (hi-lo || 1);
  const color = (i) => ['#047d86','#2563eb','#f97316','#7c3aed','#db2777','#16a34a','#334155','#0891b2'][i%8];
  function renderLine(el, traces, layout){
    const title = titleText(layout, traces[0]?.name);
    const svg = baseSvg(el, title);
    const xs = traces.map(t=>t.x||[]), ys = traces.map(t=>t.y||[]);
    const [xmin,xmax] = extent(xs), [ymin,ymax] = extent(ys);
    const sx = makeScale(xmin,xmax,70,700), sy = makeScale(ymin,ymax,338,48);
    for (let k=0;k<6;k++){
      const y=48+k*(290/5); svg.appendChild(svgEl('line',{x1:70,y1:y,x2:700,y2:y,stroke:'#edf2f7'}));
      label(svg,22,y+4,(ymax-(ymax-ymin)*k/5).toPrecision(3));
    }
    traces.forEach((tr,i)=>{
      const pts=(tr.x||[]).map((x,j)=>[sx(x),sy((tr.y||[])[j])]).filter(p=>p.every(Number.isFinite)).map(p=>p.join(',')).join(' ');
      if(!pts) return;
      svg.appendChild(svgEl('polyline',{points:pts,fill:'none',stroke:color(i),'stroke-width':i===traces.length-1?2.5:1.5,'stroke-opacity':tr.opacity||0.95}));
      label(svg,72+120*(i%5),378+18*Math.floor(i/5),'■ '+(tr.name||`trace ${i+1}`),{fill:color(i)});
    });
  }
  function renderBar(el, traces, layout){
    const tr=traces[0]||{}, title=titleText(layout,tr.name); const svg=baseSvg(el,title);
    const horizontal = tr.orientation === 'h';
    const values = clean(horizontal ? tr.x : tr.y); const labels = (horizontal ? tr.y : tr.x) || values.map((_,i)=>String(i+1));
    const max = Math.max(1, ...values.map(Math.abs));
    if(horizontal){
      const h = Math.max(18, 280/Math.max(1,values.length));
      values.forEach((v,i)=>{ const y=52+i*h; const w=610*Math.abs(v)/max; label(svg,70,y+12,String(labels[i]||i+1)); svg.appendChild(svgEl('rect',{x:180,y:y,width:w,height:h*.62,rx:4,fill:color(i)})); label(svg,190+w,y+12,Number(v).toPrecision(3)); });
    } else {
      const w = 600/Math.max(1,values.length);
      values.forEach((v,i)=>{ const bh=290*Math.abs(v)/max; const x=75+i*w; const y=338-bh; svg.appendChild(svgEl('rect',{x,y,width:Math.max(4,w*.65),height:bh,rx:4,fill:color(i)})); label(svg,x,366,String(labels[i]||i+1),{'text-anchor':'middle'}); });
    }
  }
  function renderHistogram(el, traces, layout){
    const tr=traces[0]||{}, data=clean(tr.x), bins=Math.max(5, Math.min(60, Number(tr.nbinsx)||25));
    const [lo,hi]=extent([data]); const counts=Array(bins).fill(0);
    data.forEach(v=>{ const idx=Math.max(0,Math.min(bins-1,Math.floor((v-lo)/(hi-lo||1)*bins))); counts[idx]++; });
    const xs=counts.map((_,i)=>lo+(hi-lo)*(i+.5)/bins);
    renderBar(el,[{x:xs.map(v=>v.toPrecision(2)),y:counts,name:tr.name||'histogram'}],layout);
  }
  function renderHeatmap(el, traces, layout){
    const tr=traces[0]||{}, z=tr.z||[], xs=tr.x||[], ys=tr.y||[]; const svg=baseSvg(el,titleText(layout,tr.name));
    const vals=z.flatMap(row=>(row||[]).map(num)).filter(Number.isFinite); const lo=Math.min(...vals,0), hi=Math.max(...vals,1);
    const rows=z.length, cols=Math.max(1,...z.map(r=>(r||[]).length));
    const cw=620/cols, ch=285/Math.max(1,rows);
    function c(v){ const q=Math.max(0,Math.min(1,(v-lo)/(hi-lo||1))); const h=210-160*q; return `hsl(${h}, 70%, 48%)`; }
    z.forEach((row,j)=>{ (row||[]).forEach((v,i)=>{ svg.appendChild(svgEl('rect',{x:72+i*cw,y:50+j*ch,width:Math.max(1,cw),height:Math.max(1,ch),fill:c(num(v))})); }); });
    label(svg,70,365,String(xs[0]??'')); label(svg,680,365,String(xs[xs.length-1]??''),{'text-anchor':'end'});
    label(svg,20,56,String(ys[0]??'')); label(svg,20,335,String(ys[ys.length-1]??''));
    label(svg,600,28,`${lo.toPrecision(3)} → ${hi.toPrecision(3)}`);
  }
  function react(id, traces, layout, config){
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if(!el) return Promise.resolve();
    const first=(traces||[])[0]||{};
    if(first.type === 'heatmap' || first.type === 'contour') renderHeatmap(el,traces,layout);
    else if(first.type === 'histogram') renderHistogram(el,traces,layout);
    else if(first.type === 'bar') renderBar(el,traces,layout);
    else renderLine(el,traces||[],layout);
    return Promise.resolve(el);
  }
  function purge(id){ const el = typeof id === 'string' ? document.getElementById(id) : id; if(el) el.innerHTML=''; }
  function downloadImage(id, opts={}){
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    const svg = el && el.querySelector('svg');
    if(!svg) return Promise.resolve();
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {type:'image/svg+xml'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(opts.filename||'foko-plot')+'.svg'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);
    return Promise.resolve();
  }
  window.Plotly = {react, purge, downloadImage, __fallback:true};
})();
