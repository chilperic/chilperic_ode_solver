/* SVG scientific charts: brand-independent palette, marker/line redundancy,
 * explicit standard-deviation bars and readable ticks. Tables retain raw precision. */
(function(root){'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dashes=['','8 4','2 4','10 3 2 3','6 3','12 4','3 3','10 2 2 2'];
 function fmt(x){if(!Number.isFinite(x))return '—';if(x===0)return '0';return Math.abs(x)<.001||Math.abs(x)>=10000?x.toExponential(2):Number(x.toPrecision(4)).toString();}
 function colors(){const c=getComputedStyle(document.documentElement);return Array.from({length:8},(_,i)=>c.getPropertyValue('--plot-'+(i+1)).trim()||['#14688d','#a74a23','#6952a3','#26744e','#675523','#455568','#946533','#407b7e'][i]);}
 function theme(){const c=getComputedStyle(document.documentElement);return Object.fromEntries(['ink','muted','line','surface','soft'].map(k=>[k,c.getPropertyValue('--'+k).trim()]));}
 function removeLegend(host){if(host.nextElementSibling?.classList.contains('chart-legend'))host.nextElementSibling.remove();}
 function empty(host,message='Run the current model to see its response.',detail='Results are generated from your inputs. No demonstration curve is substituted.'){removeLegend(host);host.innerHTML=`<div class="plot-empty"><strong>${esc(message)}</strong><p>${esc(detail)}</p></div>`;}
 function ticks(lo,hi,count){const raw=(hi-lo)/Math.max(1,count-1),base=10**Math.floor(Math.log10(raw)),q=raw/base,step=(q<=1?1:q<=2?2:q<=2.5?2.5:q<=5?5:10)*base;const a=Math.ceil(lo/step-1e-10),b=Math.floor(hi/step+1e-10);return Array.from({length:Math.max(0,Math.min(16,b-a+1))},(_,i)=>Number(((a+i)*step).toPrecision(12)));}
 function symbol(x,y,size,index,color,fill){const common=`fill="${fill}" stroke="${color}" stroke-width="1.5"`;switch(index%3){case 1:return `<rect x="${x-size}" y="${y-size}" width="${size*2}" height="${size*2}" ${common}/>`;case 2:return `<path d="M${x} ${y-size*1.2}L${x+size*1.1} ${y+size}H${x-size*1.1}Z" ${common}/>`;default:return `<circle cx="${x}" cy="${y}" r="${size}" ${common}/>`;}}
 function line(host,series,opts={}){
  const width=Math.max(250,Math.round(host.getBoundingClientRect().width)||640),height=Math.max(260,Math.round(host.getBoundingClientRect().height)||350),m={l:67,r:24,t:30,b:58},w=width-m.l-m.r,h=height-m.t-m.b,th=theme(),palette=colors();
  const all=[];series.forEach(s=>s.x.forEach((x,i)=>{if(Number.isFinite(x)&&Number.isFinite(s.y[i])){all.push([x,s.y[i]]);const e=s.error?.[i];if(Number.isFinite(e)&&e>=0)all.push([x,s.y[i]-e],[x,s.y[i]+e]);}}));
  if(!all.length){empty(host,'No finite values to plot.');return;}
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;for(const [x,y]of all){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
  if(opts.band)for(const y of [...opts.band.lower,...opts.band.upper])if(Number.isFinite(y)){ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
  if(xmin===xmax){xmin-=.5;xmax+=.5;}if(ymin===ymax){const delta=Math.abs(ymin)*.1||1;ymin-=delta;ymax+=delta;}const pad=(ymax-ymin)*.07;ymin-=pad;ymax+=pad;
  const X=x=>m.l+(x-xmin)/(xmax-xmin)*w,Y=y=>m.t+h-(y-ymin)/(ymax-ymin)*h,id=host.id+'-title',desc=host.id+'-description',clip=host.id+'-clip';
  const path=(xs,ys)=>{let open=false;return xs.map((x,i)=>{if(!Number.isFinite(x)||!Number.isFinite(ys[i])){open=false;return '';}const d=(open?'L':'M')+X(x).toFixed(2)+','+Y(ys[i]).toFixed(2);open=true;return d;}).join(' ');};
  const yl=opts.ylabel||'Value',xl=opts.xlabel||'Time';
  const summary=series.map(s=>{const i=s.y.findIndex(Number.isFinite),k=s.y.findLastIndex(Number.isFinite);return i<0?'':`${s.name}: first value ${fmt(s.y[i])} at ${fmt(s.x[i])}, last value ${fmt(s.y[k])} at ${fmt(s.x[k])}.`;}).join(' ');
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id} ${desc}" style="font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"><title id="${id}">${esc(opts.title||'Computed trajectory')}</title><desc id="${desc}">${esc((opts.description||'Computed values; exact data and CSV are available below.')+' Horizontal axis: '+xl+'. Vertical axis: '+yl+'. '+summary)}</desc><defs><clipPath id="${clip}"><rect x="${m.l}" y="${m.t}" width="${w}" height="${h}"/></clipPath></defs>`;
  if(Number.isFinite(opts.cutoff)&&opts.cutoff>=xmin&&opts.cutoff<xmax){const xx=X(opts.cutoff);svg+=`<rect x="${xx}" y="${m.t}" width="${m.l+w-xx}" height="${h}" fill="${th.soft}"/><path d="M${xx} ${m.t}V${m.t+h}" stroke="${th.muted}" stroke-dasharray="3 5"/><text x="${m.l+w}" y="${m.t-10}" text-anchor="end" fill="${th.muted}" font-size="11">Held-out: open markers</text>`;}
  ticks(ymin,ymax,5).forEach(y=>{const yy=Y(y);svg+=`<path d="M${m.l} ${yy}H${m.l+w}" stroke="${th.line}" stroke-dasharray="3 5"/><text x="${m.l-9}" y="${yy+4}" text-anchor="end" font-size="12" fill="${th.muted}">${esc(fmt(y))}</text>`;});
  ticks(xmin,xmax,width<400?4:6).forEach(x=>{svg+=`<text x="${X(x)}" y="${m.t+h+23}" text-anchor="middle" font-size="12" fill="${th.muted}">${esc(fmt(x))}</text>`;});
  svg+=`<path d="M${m.l} ${m.t}V${m.t+h}H${m.l+w}" fill="none" stroke="${th.line}"/><g clip-path="url(#${clip})">`;
  if(opts.band){const b=opts.band,d=path(b.x,b.lower)+' '+path(b.x.slice().reverse(),b.upper.slice().reverse()).replace(/^M/,'L')+' Z';svg+=`<path d="${d}" fill="${palette[0]}" opacity="0.17"/>`;}
  series.forEach((s,j)=>{const col=s.color||palette[j%8],dash=s.dash===undefined?dashes[j%8]:s.dash;
   if(s.mode==='points')s.x.forEach((x,i)=>{if(!Number.isFinite(x)||!Number.isFinite(s.y[i]))return;const xx=X(x),yy=Y(s.y[i]),e=s.error?.[i];
    if(Number.isFinite(e)&&e>=0){const a=Y(s.y[i]-e),b=Y(s.y[i]+e);svg+=`<path class="observation-error-bar" d="M${xx} ${a}V${b}M${xx-3} ${a}H${xx+3}M${xx-3} ${b}H${xx+3}" fill="none" stroke="${col}" stroke-width="1" opacity=".65"/>`;}
    svg+=`<g><title>${esc(s.name)}: ${esc(fmt(x))}, ${esc(fmt(s.y[i]))}${Number.isFinite(e)?'; observation SD '+esc(fmt(e)):''}</title>${symbol(xx,yy,s.radius||3.5,s.markerIndex??0,col,s.hollow?th.surface:col)}</g>`;
   });else svg+=`<path d="${path(s.x,s.y)}" fill="none" stroke="${col}" stroke-width="${s.width||2.3}" ${dash?'stroke-dasharray="'+esc(dash)+'"':''} stroke-linejoin="round"/>`;
  });svg+=`</g><text transform="translate(17 ${m.t+h/2}) rotate(-90)" text-anchor="middle" font-size="12" fill="${th.ink}">${esc(yl)}</text><text x="${m.l+w/2}" y="${height-10}" text-anchor="middle" font-size="12" fill="${th.ink}">${esc(xl)}</text></svg>`;host.innerHTML=svg;
  const legend=document.createElement('div');legend.className='chart-legend';legend.setAttribute('aria-label','Chart series');legend.style.cssText='display:flex;flex-wrap:wrap;gap:8px 16px;padding:0 22px 12px;font-size:12px;color:var(--muted)';
  legend.innerHTML=series.map((s,j)=>{const col=s.color||palette[j%8],dash=s.dash===undefined?dashes[j%8]:s.dash;return `<span style="display:inline-flex;align-items:center;gap:7px"><svg width="25" height="14" aria-hidden="true">${s.mode==='points'?symbol(12,7,3.5,s.markerIndex??0,col,s.hollow?th.surface:col):`<path d="M0 7H25" fill="none" stroke="${col}" stroke-width="2.3" ${dash?'stroke-dasharray="'+esc(dash)+'"':''}/>`}</svg>${esc(s.name)}</span>`;}).join('');removeLegend(host);host.after(legend);
 }
 function bars(host,rows,opts={}){
  removeLegend(host);const W=Math.max(250,Math.round(host.getBoundingClientRect().width)||640),H=Math.max(260,Math.round(host.getBoundingClientRect().height)||350),th=theme(),palette=colors(),data=rows.slice(0,12),left=Math.min(138,W*.31),right=65,top=18,bottom=43,w=W-left-right,h=H-top-bottom,max=Math.max(...data.map(x=>Math.abs(x.value)),1e-30),zero=left+w/2;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="${esc(opts.title||'Signed local sensitivity')}"><desc>Bars show signed effects, not global importance or causation. Exact values for every parameter appear in the table.</desc><path d="M${zero} ${top}V${H-bottom}" stroke="${th.line}"/>`;
  data.forEach((r,i)=>{const y=top+(i+.15)*h/data.length,bh=Math.min(23,h/data.length*.6),width=Math.abs(r.value)/max*(w/2-5),x=r.value>=0?zero:zero-width;svg+=`<text x="${left-10}" y="${y+bh/2+4}" text-anchor="end" fill="${th.ink}" font-size="12">${esc(r.name)}</text><rect x="${x}" y="${y}" width="${width}" height="${bh}" rx="2" fill="${r.value<0?palette[1]:palette[0]}"/><text x="${W-right+10}" y="${y+bh/2+4}" fill="${th.muted}" font-size="11">${esc(fmt(r.value))}</text>`;});svg+=`<text x="${left+w/2}" y="${H-13}" text-anchor="middle" font-size="12" fill="${th.ink}">${esc(opts.xlabel||'Range-scaled local effect')}</text></svg>`;host.innerHTML=svg;
 }
 root.FokoResearchCharts=Object.freeze({line,bars,empty,fmt,colors,ticks});
})(window);
