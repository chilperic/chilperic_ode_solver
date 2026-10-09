/* Recorded phenology and organ progression. This view never advances the plant model. */
(function(root){'use strict';
const names=['Germination','Vegetative growth','Flowering','Fruiting / filling','Maturity'];
const cache=new WeakMap(),hosts=new WeakMap(),threshold=1e-7;
function timeline(rows){
 if(cache.has(rows))return cache.get(rows);
 const stages=names.map((name,index)=>({name,index,hour:null})),leaves=[];
 for(const r of rows){const hour=r.hour??rows.indexOf(r);if(stages[r.stage]&&stages[r.stage].hour===null)stages[r.stage].hour=hour;
  (r.leafBuilt||[]).forEach((v,i)=>{if(v>threshold&&!leaves[i])leaves[i]={id:i+1,hour};});}
 const out={stages,leaves};cache.set(rows,out);return out;
}
function state(rows,r,c,type){
 const data=timeline(rows),stage=Math.max(0,Math.min(4,Math.floor(r.stage||0))),scale=c['developmentScale'+type]||1;
 const boundaries=[0,c.emergenceGDD,c.flowerGDD,c.fillGDD,c.maturityGDD],local=(r.thermalTime||0)/scale;
 const progress=c.developmentMode==='thermal'?(stage===4?1:Math.max(0,Math.min(1,(local-boundaries[stage])/(boundaries[stage+1]-boundaries[stage])))):null;
 return{...data,stage,name:c.developmentMode==='thermal'?names[stage]:'Calendar allocation',progress,
  organs:(r.leafBuilt||[]).map((built,i)=>({id:i+1,built:Math.max(0,Math.min(1,built)),living:(r.leafUnits[i]||0)>threshold,visible:built>threshold,birth:data.leaves[i]?.hour})),
  reproductive:stage>=2&&(r.flower||0)+(r.fruit||0)<=threshold?'Phase threshold reached; no reproductive tissue is present.':null};
}
function render(host,rows,r,c,type,jump,unit='leaves'){
 const q=state(rows,r,c,type);let h=hosts.get(host);
 if(!h||h.rows!==rows){
  host.replaceChildren();const el=(tag,cls,parent=host)=>{const x=document.createElement(tag);if(cls)x.className=cls;parent.append(x);return x;};
  const heading=el('div','stage-current'),title=el('strong','',heading),clock=el('span','',heading),phases=el('div','stage-track');phases.setAttribute('aria-label',type+' growth phases');
  const phaseButtons=q.stages.map(p=>{const b=el('button','',phases);b.type='button';b.textContent=p.name;b.disabled=p.hour===null||c.developmentMode!=='thermal';b.title=p.hour===null?'Not reached during this run':p.hour===0&&p.index>0?'Already present at start':'First recorded on day '+(p.hour/24).toFixed(1);b.onclick=()=>jump(p.hour);return b;});
  const meter=el('progress');meter.max=1;const details=el('details','leaf-progression');details.open=true;const summary=el('summary','',details),list=el('div','leaf-cohorts',details),empty=el('span','',list);empty.textContent='No emerged leaf or pad yet.';
  const key=el('p','',details);key.textContent='Number = order of appearance · fill = construction progress · × = no living tissue. Select a number to revisit its appearance.';
  const notice=el('p');h={rows,title,clock,phaseButtons,meter,summary,list,empty,notice,buttons:[]};hosts.set(host,h);
 }
 h.title.textContent=q.name;h.clock.textContent='Day '+((r.hour||0)/24).toFixed(1);
 h.phaseButtons.forEach((b,i)=>{b.className=i===q.stage?'current':i<q.stage?'passed':'';b.setAttribute('aria-current',i===q.stage?'step':'false');});
 h.meter.hidden=q.progress===null;h.meter.value=q.progress||0;h.meter.setAttribute('aria-label',q.name+' phase progress');
 const count=q.organs.filter(o=>o.visible).length;h.summary.textContent='Leaf progression · '+count+' formed '+unit;h.empty.hidden=!!count;
 for(const leaf of q.organs){if(!leaf.visible)continue;let b=h.buttons[leaf.id-1];if(!b){b=document.createElement('button');b.type='button';b.textContent=String(leaf.id);b.onclick=()=>jump(leaf.birth||0);h.list.append(b);h.buttons[leaf.id-1]=b;}
  b.className=leaf.living?'':'lost';b.style.setProperty('--expanded',100*leaf.built+'%');b.setAttribute('aria-label',unit+' unit '+leaf.id+', '+Math.round(leaf.built*100)+'% of construction target'+(leaf.living?'':', no living tissue')+', first recorded day '+((leaf.birth||0)/24).toFixed(1));b.title=b.getAttribute('aria-label');
 }
 h.buttons.forEach((b,i)=>{b.hidden=!q.organs[i]?.visible;});h.notice.hidden=!q.reproductive;h.notice.textContent=q.reproductive||'';return q;
}
const api={names,timeline,state,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GrowthStages=api;
})(globalThis);
