/* State-driven 2D organ visualization. Geometry is illustrative, not an architectural growth model.
   Organ indices are persistent; the renderer never creates or changes simulated biomass. */
(function(root){'use strict';
const Architecture=typeof module!=='undefined'&&module.exports?require('./architecture.js'):root.PlantArchitecture;
const Soil=typeof module!=='undefined'&&module.exports?require('./soil-resources.js'):root.SoilResources;
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),noise=i=>(Math.sin(i*127.1+31.7)*43758.5453)%1;
function form(config,type){return config.traitMode==='presets'?config['plant'+type]:'virtual';}
function structure(r,config,type){const kind=form(config,type),sourceCount=r.leafUnits.length,slots=Math.max(1,sourceCount);const grass=['wheat','rice','maize','sorghum','millet','sugarcane'].includes(kind),rosette=['agave','aloe','pineapple','arabidopsis'].includes(kind),pad=kind==='opuntia',count=r.leafUnits.length,cap=slots,built=r.leafBuilt.reduce((a,b)=>a+b,0),spacing=(grass?28:16)+8*Math.log1p(r.stem/Math.max(1,built)),height=rosette?12:pad?25:kind==='maize'?18+175*Math.cbrt(Math.max(0,r.stem))*Math.min(1,.35+.08*built):Math.max(8,Math.min(cap,built)*spacing/2+10+40*Math.log1p(Math.max(0,built-cap))),organs=[],sites=Architecture.reproduction(r,kind,config.illustratedSites),profile=Architecture.profile(kind),axes=profile.layout==='tillers'?Math.min(sites.requested,Math.max(1,Math.ceil(count/4))):1;
 for(let i=0;i<Math.min(count,cap);i++){const mass=r.leafUnits[i],progress=clamp(r.leafBuilt[i]||0,0,1);if(mass<1e-7||pad)continue;const survival=clamp(mass/Math.max(r.leafBuilt[i]||0,1e-8),0,1),size=Math.sqrt(mass)*Math.sqrt((config.traitMode==='presets'?(config['leafArea'+type]??config.leafUnitArea):config.leafUnitArea)/100),side=i%2?1:-1;let x=0,y=0,angle=0,length=0,width=0,depth=0;
 if(rosette){const a=i*2.399963,reach=Math.cos(a);x=reach*8;y=-8;angle=-Math.PI/2+reach*1.15;length=(60+12*(i%3))*size;width=13*size;depth=Math.sin(a);}
 else{x=3*Math.sin(i*.65);y=-(10+(i/2)*spacing);angle=side;length=(grass?105:48)*size*(.85+.15*Math.cos(i*2.4));width=(grass?(kind==='maize'?10:5):24)*size;depth=side;}
 if(kind==='maize'){const rank=count>1?i/(count-1):.4,profile=.7+.35*Math.sin(Math.PI*rank);x=0;y=-height*(.12+.78*rank);length=78*size*profile;width=9*size*profile;}
 if(axes>1){const axis=i%axes,local=Math.floor(i/axes),perAxis=Math.ceil(count/axes),spread=(axis-(axes-1)/2)*34;x=spread*(.35+.65*local/Math.max(1,perAxis-1));y=-(12+local*spacing);}
 if(['flaveria','kalanchoe'].includes(kind)){x=i>3?side*(8+14*Architecture.variation(Math.floor(i/2),19)):0;y=-(12+Math.floor(i/2)*spacing);width*=kind==='kalanchoe'?.85:.6;}
 length*=.90+.20*Architecture.variation(i,12);angle+=.08*(Architecture.variation(i,13)-.5);
 if(kind==='pineapple'){length*=1.35;width*=.43;}if(kind==='aloe'){length*=.8;width*=1.1;}if(kind==='arabidopsis'){length*=.62;width*=.85;}if(kind==='sugarcane'){width*=1.7;length*=1.3;}
 organs.push({rank:count>1?i/(count-1):.4,id:i,mass,progress,survival,x,y,angle,length,width,depth,side});}
 if(pad)organs.push(...Architecture.pads(r.leafUnits,r.leafBuilt,Math.sqrt((config['leafArea'+type]??100)/100)));
 const shootHeight=axes>1?Math.max(12,...organs.map(o=>-o.y+12)):height;
 const maxHeight=pad?Math.max(10,...organs.map(o=>-o.y+o.length)):rosette?Math.max(10,...organs.map(o=>o.length)):shootHeight;
 return{sites,axes,profile,veinDensity:r.veinDensity??5,kind,grass,rosette,pad,organs,height:shootHeight,maxHeight,omitted:Math.max(0,sourceCount-slots),rootDepth:18+42*Math.sqrt(Math.max(0,r.root)),stemWidth:clamp(2+2.8*Math.sqrt(r.stem),2,18)};}
function bounds(r,c,type){const s=structure(r,c,type),reproduction=r.flower+r.fruit>1e-8,top=s.maxHeight+(reproduction?(s.rosette?120:65):30),width=Math.max(100,20*s.sites.requested+70,...s.organs.map(o=>Math.abs(o.x)+o.length+o.width));return{top,bottom:s.rootDepth+15,width};}
function camera(rows,c,type){let b={top:100,bottom:50,width:110};for(let i=0;i<rows.length;i+=Math.max(1,Math.floor(rows.length/180))){const q=bounds(rows[i],c,type);for(const k of Object.keys(b))b[k]=Math.max(b[k],q[k]);}const q=bounds(rows.at(-1),c,type);for(const k of Object.keys(b))b[k]=Math.max(b[k],q[k]);return b;}
function stroke(ctx,points,color,width=1){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function leafColor(o,stress,pad){const aging=1-o.survival,young=1-o.progress;return `hsl(${pad?135:105-aging*57},${pad?24:43}%,${pad?40:28+young*21}%)`;}
function leaf(ctx,o,s,r,veins){const stress=clamp(r.stress,0,1),L=o.length,W=o.width,fold=.2+.8*o.progress,col=leafColor(o,stress,s.pad);ctx.save();ctx.translate(o.x,o.y);
 if(s.kind==='maize'){
 const rank=o.rank,tip=L*(.3-.65*rank)+(1-stress)*L*.35,lift=L*(.22+.35*rank),curl=(1-o.progress)*L*.3;
 ctx.scale(o.side,1);const shade=ctx.createLinearGradient(0,-W,L,tip);shade.addColorStop(0,'#2e622d');shade.addColorStop(.42,col);shade.addColorStop(.67,'#91b755');shade.addColorStop(1,'#476d31');ctx.fillStyle=shade;
 // Broad clasping base narrows to a pointed, arching maize blade.
 ctx.beginPath();ctx.moveTo(0,6);ctx.bezierCurveTo(L*.17,-lift-W*.8-curl,L*.64,-lift+tip*.3-W*.35,L,tip);ctx.bezierCurveTo(L*.64,-lift+tip*.3+W*.35,L*.17,-lift+W*.8,0,6);ctx.fill();ctx.strokeStyle='#8bab5b';ctx.lineWidth=.6;ctx.stroke();
 ctx.beginPath();ctx.moveTo(0,6);ctx.bezierCurveTo(L*.2,-lift-curl*.5,L*.66,-lift+tip*.3,L,tip);ctx.strokeStyle='#c4d395';ctx.lineWidth=1;ctx.stroke();
 if(veins)for(const side of Array.from({length:Math.max(2,Math.min(10,Math.round(s.veinDensity)))},(_,j)=>2*(j+1)/(Math.max(2,Math.min(10,Math.round(s.veinDensity)))+1)-1)){ctx.beginPath();ctx.moveTo(0,6);ctx.bezierCurveTo(L*.18,-lift+side*W*.45,L*.64,-lift+tip*.3+side*W*.16,L,tip);ctx.strokeStyle='#b1c78877';ctx.lineWidth=.5;ctx.stroke();}
 // Leaf sheath wraps the internode just below the blade insertion.
 stroke(ctx,[[-2,14],[2,8],[1,0]],'#93ac66',2);
 }
 else if(s.pad){ctx.rotate(o.angle);stroke(ctx,[[0,L*.045],[0,-L*.08]],o.visible?'#638953':'#8c795c',Math.max(1.5,W*.16));if(!o.visible){stroke(ctx,[[0,0],[0,-L]],'#8c795c',Math.max(2,W*.16));for(const child of s.organs.filter(p=>p.parentId===o.id)){const a=child.attachmentAngle;stroke(ctx,[[0,0],[Math.sin(a)*W*.64,-L*(.5+.5*Math.cos(a))]],'#8c795c',2);}ctx.restore();return;}const g=ctx.createLinearGradient(-W,0,W,-L);g.addColorStop(0,'#244d39');g.addColorStop(.55,col);g.addColorStop(1,'#96b98a');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,-L/2,W*.64,L/2,0,0,TAU);ctx.fill();ctx.strokeStyle='#73976d';ctx.lineWidth=.7;ctx.stroke();for(let k=0;k<17;k++){const a=k*2.4,rr=Math.sqrt((k+1)/19),x=Math.cos(a)*W*.53*rr,y=-L*.5+Math.sin(a)*L*.43*rr;ctx.fillStyle='#cfcb9a';ctx.beginPath();ctx.arc(x,y,.8,0,TAU);ctx.fill();if(veins)stroke(ctx,[[x-1,y+1],[x+1.5,y-2]],'#ded8ae',.4);}}
 else if(s.rosette){ctx.rotate(o.angle);if(s.kind==='arabidopsis'){ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(L*.5,0,L*.5,W*.85,0,0,TAU);ctx.fill();stroke(ctx,[[0,0],[L*.92,0]],'#b7c8aa',.8);ctx.restore();return;}const g=ctx.createLinearGradient(0,-W,L,W);g.addColorStop(0,'#294f42');g.addColorStop(.5,'#789b87');g.addColorStop(1,'#254b3d');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(L*.3,-W*fold,L*.8,-W*.4,L,0);ctx.bezierCurveTo(L*.72,W*.6,L*.2,W*fold,0,0);ctx.fill();ctx.strokeStyle='#b7c6a0';ctx.lineWidth=.6;ctx.stroke();stroke(ctx,[[0,0],[L*.5,0],[L,0]],'#b7c8aa',.8);stroke(ctx,[[L-2,0],[L+3,0]],'#d4b991',.8);if(['aloe','pineapple'].includes(s.kind))for(let j=1;j<8;j++){const x=L*j/9,yy=W*.6*Math.sin(Math.PI*j/9);for(const side of [-1,1])stroke(ctx,[[x,yy*side],[x-2,(yy+2)*side]],'#c4c79e',.7);}}
 else if(s.kind==='kalanchoe'){ctx.scale(o.side,1);stroke(ctx,[[0,0],[12,-6]],'#71905c',1.8);ctx.translate(12,-6);ctx.rotate(-.25);ctx.fillStyle='#739c89';ctx.strokeStyle='#aa8294';ctx.lineWidth=.9;ctx.beginPath();for(let j=0;j<=64;j++){const a=j*TAU/64,scallop=1+.055*Math.cos(a*12),x=L*.48+Math.cos(a)*L*.48*scallop,y=Math.sin(a)*W*.8*scallop;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();stroke(ctx,[[0,0],[L*.9,0]],'#b0c4a1',.75);}
 else if(s.kind==='soybean'){ctx.scale(o.side,1);stroke(ctx,[[0,0],[L*.4,-L*.2]],'#72954e',1.3);for(const [x,y,a,ll,ww]of [[L*.32,-L*.21,-.3,L*.37,W*.58],[L*.45,-L*.43,-.8,L*.27,W*.5],[L*.49,-L*.02,.4,L*.28,W*.5]]){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(ll*.7,0,ll,ww,0,0,TAU);ctx.fill();stroke(ctx,[[-ll*.2,0],[ll*1.65,0]],'#a9c27d',.65);ctx.restore();}}
 else{const side=o.side,petiole=s.grass?2:12*o.progress;ctx.scale(side,1);const droop=(1-stress)*L*.55,yTip=s.grass?(-L*.18+droop):(-L*.25+droop),lift=(1-o.progress)*L*.7;stroke(ctx,[[0,0],[petiole,-petiole*.55]],'#65964a',s.grass?1.5:1.1);ctx.translate(petiole,-petiole*.55);const g=ctx.createLinearGradient(0,-W,L,W);g.addColorStop(0,'#254d2c');g.addColorStop(.45,col);g.addColorStop(1,o.survival<.65?'#a08c45':'#659b43');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(L*.22,s.grass?-L*.6-lift:-W*fold-lift,L*.7,s.grass?-L*.4-W:-W-lift,L,yTip);ctx.bezierCurveTo(L*.7,s.grass?-L*.4+W:W*.7+yTip,L*.25,s.grass?-L*.6+W:W*fold,0,0);ctx.fill();ctx.strokeStyle='#8cab61';ctx.lineWidth=.55;ctx.stroke();ctx.save();ctx.clip();ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(L*.3,s.grass?-L*.6-lift*.5:-lift*.8,L*.68,s.grass?-L*.4:-lift*.6,L,yTip);ctx.strokeStyle='#b2cb7b';ctx.lineWidth=s.grass?.6:.85;ctx.stroke();if(veins&&s.grass){for(const offset of [-.45,.45]){ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(L*.3,-L*.6+offset*W-lift*.5,L*.68,-L*.4+offset*W,L,yTip);ctx.strokeStyle='#adc27866';ctx.lineWidth=.45;ctx.stroke();}}if(veins&&!s.grass){for(let k=1;k<6;k++){const q=k/7,x=L*q,mid=yTip*q*q-lift*Math.sin(q*Math.PI)*.4,ww=W*Math.sin(q*Math.PI)*.65;stroke(ctx,[[x,mid],[x+L*.11,mid-ww]],'#98b96788',.55);stroke(ctx,[[x,mid],[x+L*.1,mid+ww]],'#98b96788',.55);}}ctx.restore();}
 ctx.restore();}
function roots(ctx,s,r){const reach=s.rootDepth,tap=!s.grass&&!s.rosette,nRoot=Math.max(3,Math.min(29,Math.round(6+20*Math.sqrt(r.rootDensity??.1))));ctx.save();ctx.globalAlpha=.83;for(let i=0;i<nRoot;i++){const a=(i/(nRoot-1)-.5)*2.1,depth=reach*(.6+.4*Math.cos(a)),endX=Math.sin(a)*reach*.65,endY=depth;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(endX*.15,depth*.22,endX*.8,depth*.65,endX,endY);ctx.strokeStyle=i===4&&tap?'#ddc9a0':'#aa9978';ctx.lineWidth=i===4&&tap?Math.max(1,s.stemWidth*.27):.8;ctx.stroke();for(let j=1;j<7;j++){const q=j/8,x=endX*q*q,y=depth*q,sgn=j%2?1:-1,branch=reach*.15*(1-q);stroke(ctx,[[x,y],[x+sgn*branch*.7,y+branch*.45],[x+sgn*branch,y+branch]],'#b9a780',.55);for(let k=1;k<=2;k++)stroke(ctx,[[x+sgn*branch*k/3,y+branch*k/3],[x+sgn*(branch*k/3+3),y+branch*k/3+4]],'#b9a78088',.35);}}ctx.restore();}
function maizeReproduction(ctx,s,r){
 // Visible reproductive mass controls scale. No tassel or ear is drawn before construction.
 if(r.flower+r.fruit<1e-8)return;
 const q=Math.min(1,Math.sqrt(Math.max(0,r.reproductiveGrowth??(r.flower+r.fruit))/.8)),tip=-s.height,stalk=44*q;
 stroke(ctx,[[0,tip],[1,tip-stalk]],'#c1b878',1.25*q);
 for(let side of [-1,1])for(let j=0;j<6;j++){const y=tip-stalk*(.25+j*.105),reach=(24-j*2.5)*q,end=[side*reach,y-(13+j*1.4)*q];stroke(ctx,[[0,y],[side*reach*.55,y-8*q],end],'#b7af6b',.85*q);for(let k=1;k<6;k++){const t=k/6,x=side*reach*t,yy=y-(13+j*1.4)*q*t;ctx.fillStyle=r.flower>.02?'#ddd093':'#a89a62';ctx.beginPath();ctx.ellipse(x,yy,1.1*q,2.2*q,side*.4,0,TAU);ctx.fill();}}
 if(r.fruit<=1e-8)return;const count=s.sites.count,mass=r.fruit/Math.max(1,count),L=13+15*Math.cbrt(mass),W=3+3*Math.cbrt(mass),silk=Math.min(1,Math.sqrt(r.flower/.1));
 for(let i=0;i<count;i++){const side=i%2?-1:1,y=-s.height*(.68-.42*i/Math.max(1,count-1));ctx.save();ctx.translate(side*s.stemWidth*.35,y);ctx.rotate(side*.35);ctx.scale(side,1);stroke(ctx,[[0,8],[7,0]],'#92ad51',2);ctx.translate(6,0);
 const grad=ctx.createLinearGradient(-W,0,W,-L);grad.addColorStop(0,'#3f6334');grad.addColorStop(.45,'#a6bd62');grad.addColorStop(1,'#517439');ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(0,7);ctx.bezierCurveTo(-W*1.6,-L*.15,-W,-L*.85,0,-L);ctx.bezierCurveTo(W*1.4,-L*.8,W*1.5,-L*.15,0,7);ctx.fill();
 // Husk seams and an overlapping pointed bract, not a wheat-like exposed grain head.
 for(let j=-2;j<=2;j++){ctx.beginPath();ctx.moveTo(0,6);ctx.bezierCurveTo(j*W*.4,-L*.3,j*W*.25,-L*.8,0,-L);ctx.strokeStyle='#ced69388';ctx.lineWidth=.6;ctx.stroke();}
 ctx.fillStyle='#789945';ctx.beginPath();ctx.moveTo(-W*.8,-L*.25);ctx.quadraticCurveTo(-W*1.4,-L*.7,-W*.65,-L*1.17);ctx.quadraticCurveTo(W*.05,-L*.8,0,4);ctx.fill();
 for(let j=0;j<10;j++){ctx.beginPath();ctx.moveTo(0,-L);ctx.bezierCurveTo((j-4.5)*1.2,-L-12*silk,(j-4)*2,-L-7*silk,(j-4)*2,-L-2*silk);ctx.strokeStyle='#dcc49a';ctx.lineWidth=.6;ctx.stroke();}ctx.restore();}
}
function reproductive(ctx,s,r,c){
 if(s.kind==='maize'){maizeReproduction(ctx,s,r);return;}
 const sites=s.sites.sites,n=sites.length;if(!n)return;
 const total=Math.max(0,r.flower+r.fruit),scale=Math.min(1,Math.cbrt(total/.15));
 if(s.rosette&&s.kind!=='pineapple')stroke(ctx,[[0,-8],[0,-s.maxHeight-85*scale]],'#6d8749',2*scale);
 for(const site of sites){
  const i=site.id,side=i%2?1:-1;let x=0,y=-s.height-8;
  if(s.pad){const terminals=s.organs.filter(o=>o.visible&&!s.organs.some(child=>child.parentId===o.id&&child.visible));const o=terminals[i%terminals.length];if(!o)continue;({x,y}=Architecture.padPoint(o,(Math.floor(i/terminals.length)%3-1)*.35));}
  else if(s.kind==='pineapple'){x=(i-(n-1)/2)*42;y=-s.maxHeight*.85;stroke(ctx,[[x,0],[x,y]],'#7c9851',2);if(n>1)for(let j=0;j<5;j++)stroke(ctx,[[x,0],[x+Math.sin(j*2.4)*25,-20-Math.abs(Math.cos(j*2.4))*25]],'#759762',3);}
  else if(s.rosette){x=side*(12+6*(i%3))*scale;y=-s.maxHeight-(80-60*i/Math.max(1,n-1))*scale;stroke(ctx,[[0,y+6],[x,y]],'#7c9851',.9);}
  else if(s.profile.layout==='tillers'){x=(i-(n-1)/2)*34;y=-s.height*(.84+.16*(1-Math.abs((i-(n-1)/2)/Math.max(1,n/2))));stroke(ctx,[[0,0],[x*.35,-s.height*.35],[x,y]],'#72954e',1.8);}
  else if(n>1){x=i?side*(26+20*Math.floor((i-1)/2)):0;y=-s.height+(i?18+25*Math.floor((i-1)/2):0);stroke(ctx,[[0,y+35],[x,y]],'#72954e',1.4);}
  const mass=site.flower+site.fruit,q=Math.min(1,Math.cbrt(mass/.2)),size=Math.min(25,5+7*Math.cbrt(mass))*q;
  ctx.save();ctx.translate(x,y);
  if(s.kind==='wheat'){
   stroke(ctx,[[0,4],[0,-28*q]],'#97a55d',1);
   for(let j=0;j<8;j++)for(const side of [-1,1]){ctx.fillStyle=site.fruit>0?'#b29a50':'#8aa157';ctx.beginPath();ctx.ellipse(side*2.6*q,-j*3.2*q,2.7*q,3.8*q,side*.5,0,TAU);ctx.fill();stroke(ctx,[[side*3*q,-j*3.2*q],[side*9*q,-(j*3.2+12)*q]],'#a79960',.55);}
  }else if(['sorghum','rice','sugarcane','millet'].includes(s.kind)){
   stroke(ctx,[[0,4],[0,-35*q]],'#929751',1);
   for(let j=0;j<45;j++){const a=j*2.399963,t=(j+.5)/45,xx=Math.cos(a)*(s.kind==='sugarcane'?19:s.kind==='millet'?6:10)*q*(s.kind==='millet'?1:Math.sin(Math.PI*t)),yy=s.kind==='rice'?(-25*t+14*Math.sin(t*Math.PI/2))*q:-t*(s.kind==='millet'?46:35)*q;stroke(ctx,[[0,yy+3],[xx,yy]],'#8c824f',.5);ctx.fillStyle=site.fruit>0?'#b68c53':'#94a85c';ctx.beginPath();ctx.arc(xx,yy,1.8*q,0,TAU);ctx.fill();}
  }else if(s.kind==='sunflower'){
   for(let j=0;j<18;j++){ctx.save();ctx.rotate(j*TAU/18);ctx.fillStyle=site.fruit>site.flower?'#c49d43':'#edbb31';ctx.beginPath();ctx.ellipse(size,0,size*.65,size*.2,0,0,TAU);ctx.fill();ctx.restore();}
   ctx.fillStyle='#665033';ctx.beginPath();ctx.arc(0,0,size*.82,0,TAU);ctx.fill();
   for(let j=0;j<30;j++){const a=j*2.399963,d=Math.sqrt(j/30)*size*.72;ctx.fillStyle='#c5ad67';ctx.beginPath();ctx.arc(Math.cos(a)*d,Math.sin(a)*d,.7*q,0,TAU);ctx.fill();}
  }else if(s.kind==='pineapple'){
   ctx.fillStyle=site.fruit>0?'#b99439':'#9d6985';ctx.beginPath();ctx.ellipse(0,-size,size*.62,size*1.2,0,0,TAU);ctx.fill();for(let j=0;j<18;j++){const a=j*2.4;stroke(ctx,[[Math.cos(a)*size*.5,-size+Math.sin(a)*size],[Math.cos(a)*size*.5+2,-size+Math.sin(a)*size+2]],'#6b7543',.8);}for(let j=0;j<7;j++)stroke(ctx,[[0,-size*2],[Math.sin(j-3)*size*.6,-size*(2.6+.2*Math.cos(j))]],'#648f4c',2);
  }else if(['soybean','arabidopsis'].includes(s.kind)){
   ctx.fillStyle=site.fruit>0?'#8c9b4c':'#cab3ce';ctx.rotate(-.4);ctx.beginPath();ctx.ellipse(0,-size*.5,s.kind==='arabidopsis'?1.5:4,size,0,0,TAU);ctx.fill();
  }else if(s.rosette||['flaveria','kalanchoe'].includes(s.kind)){
   for(let j=0;j<5;j++){const xx=(j-2)*3*q,yy=-5*q-Math.sin(j)*3*q;stroke(ctx,[[0,4],[xx,yy]],'#849653',.7);ctx.fillStyle=site.fruit>site.flower?'#978f58':s.kind==='kalanchoe'?'#cd7b79':s.kind==='aloe'?'#e7a94c':'#d3ba5a';ctx.beginPath();ctx.ellipse(xx,yy,2*q,4*q,0,0,TAU);ctx.fill();}
  }else{
   ctx.fillStyle=site.fruit>0?(s.pad?'#bb7150':'#b39454'):'#e0bb55';ctx.beginPath();ctx.ellipse(0,-size*.5,size*.6,size,0,0,TAU);ctx.fill();
  }
  ctx.restore();
 }
}
function draw(ctx,w,h,r,config,type,view={}){const s=structure(r,config,type),b=view.camera||bounds(r,config,type),showRoots=view.roots!==false,ground=showRoots?h*.72:h-65,scale=Math.min((w-42)/(2*b.width),(ground-92)/b.top),cx=w/2;
 ctx.clearRect(0,0,w,h);const sky=ctx.createLinearGradient(0,0,0,ground);sky.addColorStop(0,'#f5f9fd');sky.addColorStop(1,'#e5eef2');ctx.fillStyle=sky;ctx.fillRect(0,0,w,ground);const soil=ctx.createLinearGradient(0,ground,0,h);soil.addColorStop(0,'#d9cbae');soil.addColorStop(1,'#bdaf94');ctx.fillStyle=soil;ctx.fillRect(0,ground,w,h-ground);stroke(ctx,[[0,ground],[w,ground]],'#697566',1);
 if(r.biomass<1e-10&&config.startStage==='seed'){ctx.fillStyle='#bb9c65';ctx.beginPath();ctx.ellipse(cx,ground+9,6,4,.3,0,TAU);ctx.fill();ctx.fillStyle='#314a53';ctx.font='14px system-ui';ctx.fillText('Seed reserves · awaiting emergence',12,23);Soil.draw2D(ctx,w,h,ground,r,config,view.time??r.hour);return s;}
 if(showRoots&&r.root>1e-10){const rootScale=Math.min((h-ground-55)/b.bottom,(w-30)/(b.bottom*1.5));ctx.save();ctx.translate(cx,ground);ctx.scale(rootScale,rootScale);roots(ctx,s,r);ctx.restore();}ctx.save();ctx.translate(cx,ground);ctx.scale(scale,scale);ctx.lineCap='round';ctx.lineJoin='round';
 if(s.axes>1){for(let a=0;a<s.axes;a++){const xx=(a-(s.axes-1)/2)*34;stroke(ctx,[[0,0],[xx*.35,-s.height*.35],[xx,-s.height]],'#6c8e48',s.stemWidth/Math.sqrt(s.axes));}}
 if(!s.rosette&&!s.pad&&s.axes===1){ctx.beginPath();ctx.moveTo(-s.stemWidth/2,0);ctx.bezierCurveTo(-s.stemWidth*.3,-s.height*.4,-2,-s.height*.8,0,-s.height);ctx.bezierCurveTo(2,-s.height*.8,s.stemWidth*.4,-s.height*.3,s.stemWidth/2,0);ctx.closePath();const g=ctx.createLinearGradient(-s.stemWidth/2,0,s.stemWidth/2,0);g.addColorStop(0,'#426438');g.addColorStop(.5,'#9aaf6a');g.addColorStop(1,'#344e2e');ctx.fillStyle=g;ctx.fill();for(const o of s.organs)stroke(ctx,[[-s.stemWidth*.3,o.y],[s.stemWidth*.3,o.y]],'#a6b680',.8);}

 if(s.rosette)for(const o of s.organs)stroke(ctx,[[0,0],[o.x,o.y]],'#6d8749',2);
if(['flaveria','kalanchoe'].includes(s.kind))for(const o of s.organs)stroke(ctx,[[0,o.y+18],[o.x,o.y]],'#71905c',1.4);
 const organs=s.rosette?[...s.organs].sort((a,b)=>a.depth-b.depth):s.organs;for(const o of organs){leaf(ctx,o,s,r,view.veins!==false);if(view.labels){ctx.fillStyle='#263f35';ctx.font=`${11/scale}px system-ui`;ctx.fillText(String(o.id+1),o.x+o.side*(o.length+6),o.y);}}reproductive(ctx,s,r,config);ctx.restore();
 if(view.transport&&r.area>1e-10&&s.organs.length){const organ=s.organs[Math.floor(s.organs.length*.55)],leafX=cx+(organ.x+organ.side*organ.length*.55)*scale,leafY=ground+(organ.y-organ.length*.2)*scale,rootY=showRoots?ground+(h-ground)*.5:ground,rootX=cx-w*.12,loop=type==='C4'&&(r.loopActualFlow||0)>1e-12,uptake=(r.transRate||0)>1e-12||loop;function pipe(points,color,active){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color+(active?'99':'22');ctx.lineWidth=1.7;ctx.lineJoin='round';ctx.stroke();if(!active)return;const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),sum=lengths.reduce((a,b)=>a+b,0);for(let j=0;j<5;j++){let d=((r.hour*.65+j/5)%1)*sum,k=0;while(k<lengths.length-1&&d>lengths[k])d-=lengths[k++];const f=d/Math.max(1e-9,lengths[k]);ctx.fillStyle=color;ctx.beginPath();ctx.arc(points[k][0]+f*(points[k+1][0]-points[k][0]),points[k][1]+f*(points[k+1][1]-points[k][1]),2,0,TAU);ctx.fill();}}pipe([[rootX,rootY],[cx-4,ground],[cx-4,leafY+12],[leafX,leafY]],'#71ceef',uptake);if(type==='C4')pipe([[leafX,leafY],[cx+4,leafY+18],[cx+4,ground],[rootX,rootY]],'#f3b178',loop);pipe([[leafX,leafY],[leafX+8,leafY-15],[leafX+14,leafY-28]],'#c4f3f5',(r.transRate||0)>1e-12);}
 s.soilResources=Soil.draw2D(ctx,w,h,ground,r,config,view.time??r.hour);
 ctx.font='14px system-ui';ctx.fillStyle='#314a53';ctx.fillStyle='#314a53';ctx.fillText(r.stress<.5?'Water stress · leaves droop / roll':'Water supplied',12,21);if(r.nStress<.8)ctx.fillText('Nitrogen limits construction',12,39);
 ctx.fillText(s.organs.filter(o=>o.visible!==false).length+' '+s.profile.unit,12,57);ctx.fillText(s.sites.count+' '+s.sites.label+' illustrated',12,75);
 return s;}
const api={form,structure,bounds,camera,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PlantRenderer=api;
})(globalThis);
