/* Shared projected plant geometry with soil resource availability. */
(function(root){'use strict';
const Architecture=typeof module!=='undefined'&&module.exports?require('./architecture.js'):root.PlantArchitecture;
const Soil=typeof module!=='undefined'&&module.exports?require('./soil-resources.js'):root.SoilResources;
const view={yaw:-.35,tilt:.23,zoom:1,cutaway:false,thermal:false};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function status(r,c,type){const baseline=r.leafWithoutLoop??r.leafT,target=c.loopTargetC??30,eligible=type==='C4',active=eligible&&c.loopEnabled===1&&(r.loopActualFlow||0)>1e-12;return{active,baseline,target,flow:active?r.loopActualFlow:0,label:!eligible?'Unavailable · C4 only':!c.loopEnabled?'Controller disabled':active?(r.loopUnmet>.05?'Cooling active · target unmet':'Cooling active · regulating'):baseline<=target?'Standby · no overheating':r.soilRootT>=baseline?'Standby · soil cannot absorb heat':'Standby · no usable cooling path'};}
function draw(ctx,w,h,r,c,type='C4',time=r.hour,options={}){const kind=options.kind||(!options.growth&&type==='C4'&&view.c4Species?view.c4Species:c.traitMode==='presets'?c['plant'+type]:'virtual'),grass=['maize','sorghum','wheat','rice','millet','sugarcane'].includes(kind),rosette=['agave','aloe','pineapple','arabidopsis'].includes(kind),pad=kind==='opuntia',flaveria=['flaveria','kalanchoe'].includes(kind),growth=!!options.growth,growthScale=growth?Math.cbrt(Math.max(0,r.stem||0)/10):1;const padNodes=pad?Architecture.pads(options.growth?(r.leafUnits||[]):Array(10).fill(1),options.growth?(r.leafBuilt||[]):Array(10).fill(1),Math.sqrt((c['leafArea'+type]??100)/100)):[],padExtent=Math.max(160,...padNodes.map(p=>Math.max(Math.abs(p.x)+p.width,-p.y+p.length)))/65;
const s=status(r,c,type),net=Math.max(0,r.transRate||0),loop=64.8*s.flow*Math.max(0,r.area),up=net+loop,cameraHeight=pad?Math.max(padExtent,options.padExtent||0)+.5:growth?(rosette?2.5:(pad?1.8:flaveria?2.35:kind==='wheat'?1.85:2.75)*Math.cbrt(Math.max(10,options.maxStem??r.stem??10)/10)+1):3.6,scale=Math.max(0.01,Math.min(Math.max(1,w)/4.8,Math.max(1,h*.68-38)/Math.max(3.6,cameraHeight))*Math.max(.01,view.zoom)),cx=w*.5,cy=h*.73,shapes=[];
const project=p=>{const x=p[0]*Math.cos(view.yaw)+p[2]*Math.sin(view.yaw),z=-p[0]*Math.sin(view.yaw)+p[2]*Math.cos(view.yaw),y=p[1]*Math.cos(view.tilt)-z*Math.sin(view.tilt);return[cx+x*scale,cy-y*scale,z*Math.cos(view.tilt)+p[1]*Math.sin(view.tilt)];};
function path(points,color,width=1,fill=null){const pp=points.map(project);shapes.push({z:pp.reduce((a,p)=>a+p[2],0)/pp.length,paint(){ctx.beginPath();pp.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}if(width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}}});}
function dot(p,color,radius){const q=project(p);shapes.push({z:q[2]-.012,paint(){const g=ctx.createRadialGradient(q[0]-radius*.3,q[1]-radius*.3,0,q[0],q[1],radius);g.addColorStop(0,'#ffffff');g.addColorStop(.28,color);g.addColorStop(1,color+'33');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q[0],q[1],radius,0,Math.PI*2);ctx.fill();}});}
function pipe(){ /* Transport glyphs removed: resources are represented only in soil. */ }
ctx.clearRect(0,0,w,h);const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#f9fbfe');bg.addColorStop(.55,'#f0f4f8');bg.addColorStop(1,'#e6edf2');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
// Ground-plane shadow fixes the organism in the cutaway; it carries no transport information.
ctx.save();const ground=project([0,0,0]);ctx.translate(ground[0],ground[1]);ctx.scale(1,.2);const shadow=ctx.createRadialGradient(0,0,0,0,0,scale*1.5);shadow.addColorStop(0,'#29384928');shadow.addColorStop(1,'#00000000');ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,scale*1.5,0,Math.PI*2);ctx.fill();ctx.restore();
// Fixed camera framing follows the run's maximum stem mass; it does not shrink the plant at each frame.
// Transparent soil prism exposes the root system; geometry is displayed on a fixed scale.
const soilY=-.85,soilResources=Soil.state(r,c,time);
path([[-1.65,0,-.9],[1.65,0,-.9],[1.65,soilY,-.9],[-1.65,soilY,-.9]],'#62798b33',1,'#b3a07b55');
path([[-1.65,0,.9],[1.65,0,.9],[1.65,soilY,.9],[-1.65,soilY,.9]],'#62798b55',1,'#c3b59580');
path([[-1.65,0,-.9],[-1.65,0,.9],[-1.65,soilY,.9],[-1.65,soilY,-.9]],'#62798b33',1,'#b1a18277');
// Pool density is quantitative; the bounded motion is an availability cue only.
for(const pool of soilResources.pools)for(const p of pool.particles){const x=-1.5+3*p.x,y=-.10-.64*p.y,z=-.78+1.56*p.z;if(pool.kind==='water')path([[x,y+.035,z],[x+.026,y-.012,z],[x,y-.034,z],[x-.026,y-.012,z]],pool.color,0,pool.color+Math.round(p.alpha*180).toString(16).padStart(2,'0'));else dot([x,y,z],pool.color,1.9*p.alpha);}
for(let x=-1.5;x<=1.5;x+=.3)path([[x,0,-.9],[x,0,.9]],'#88a7a21c');
for(let z=-.9;z<=.9;z+=.3)path([[-1.65,0,z],[1.65,0,z]],'#88a7a21c');
// Representative root architecture: dry mass drives extension; length density drives lateral detail.
// This is a bounded visual sample, not one segment per physical root.
const rootScale=growth?Math.cbrt(Math.max(0,r.root||0)/3):1;
const rootAxes=options.roots===false||rootScale===0?0:grass?16:rosette?14:8;
const lateralCount=Math.round(clamp(3+Math.log1p(Math.max(0,r.rootDensity||0))*3,3,10));
for(let j=0;j<rootAxes;j++){
 const a=j*2.39996323,radial=(grass?.7:rosette?.95:.5)*(1+(j%3)*.12)*Math.min(1,rootScale),depth=Math.min(.79,(grass?.55:.72)*rootScale)*(1-(j%4)*.09),points=[];
 for(let k=0;k<=14;k++){const t=k/14,rr=radial*Math.sin(t*Math.PI*.52);points.push([Math.cos(a)*rr,-depth*t,Math.sin(a)*rr*.72]);}
 path(points,'#806c4bdf',Math.max(.6,2.4*Math.min(1,rootScale)));
 for(let k=1;k<=lateralCount;k++){const t=k/(lateralCount+1),q=points[Math.floor(t*14)],len=.15*Math.min(1,rootScale)*(1-t*.6),direction=a+(k%2?1:-1)*1.2,tip=[q[0]+len*Math.cos(direction),Math.max(-.82,q[1]-.09*rootScale),q[2]+len*Math.sin(direction)];path([q,mix(q,tip,.5),tip],'#86734cb0',.8);for(let f=1;f<3;f++){const u=mix(q,tip,f/3);path([u,[u[0]+.035*Math.sin(j+f),u[1]-.035,u[2]+.035*Math.cos(j+f)]],'#998562b0',.45);}}
}

// A mature maize architectural illustration: alternate blades, cylindrical internodes and a tassel.
const count=growth?(r.leafUnits||[]).length:(flaveria?16:rosette?18:kind==='maize'?14:10),height=(rosette?.12:pad?1.8:flaveria?2.35:kind==='wheat'?1.85:2.75)*growthScale,stemRadius=(grass?.043:flaveria?.023:.046)*(growth?Math.cbrt(Math.max(0,r.stem||0)/10):1);const leafSteps=count>50?10:20,leafBands=count>50?2:4;const reproduction=Architecture.reproduction(growth?r:{flower:1,fruit:2},kind,options.illustratedSites),organs={leaves:0,tassels:0,ears:0,panicles:0,spikes:0,heads:0,clusters:0,fruits:0,rosettes:rosette?1:0};
function shade(rgb,n){const d=clamp(.55+.45*Math.abs(n[1])+.20*n[0]-.13*n[2],.34,1.2);return 'rgb('+rgb.map(v=>Math.round(clamp(v*d,0,255))).join(',')+')';}
function surface(p,rgb){const u=p[1].map((v,i)=>v-p[0][i]),v=p[2].map((v,i)=>v-p[0][i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],L=Math.hypot(...n)||1;const color=shade(rgb,n.map(x=>x/L));path(p,color,.65,color);}
function tube(a,b,r0,r1,rgb,alpha=false){const d=b.map((v,i)=>v-a[i]),L=Math.hypot(...d);if(L<1e-9)return;const n=d.map(v=>v/L),q=Math.abs(n[1])>.9?[1,0,0]:[0,1,0],u=[n[1]*q[2]-n[2]*q[1],n[2]*q[0]-n[0]*q[2],n[0]*q[1]-n[1]*q[0]],ul=Math.hypot(...u);for(let i=0;i<3;i++)u[i]/=ul;const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];for(let k=0;k<8;k++){const at=(p,r,t)=>p.map((x,i)=>x+r*(Math.cos(t)*u[i]+Math.sin(t)*v[i])),t=k*Math.PI/4,t1=(k+1)*Math.PI/4,poly=[at(a,r0,t),at(a,r0,t1),at(b,r1,t1),at(b,r1,t)];if(alpha)path(poly,null,0,'#83b77835');else surface(poly,rgb);}}
if(!pad&&!rosette){tube([0,0,0],[0,height,0],stemRadius,stemRadius*.45,[93,143,62],view.cutaway);for(let k=0;k<count;k++){const y=k*height/Math.max(1,count),rad=stemRadius*(1-.55*k/Math.max(1,count))*1.05;path(Array.from({length:9},(_,j)=>[rad*Math.cos(j*Math.PI/4),y,rad*Math.sin(j*Math.PI/4)]),'#9eaf75',.65);}}


const heat=clamp((r.leafT-s.target+5)/15,0,1),rgb=view.thermal?(heat>.65?[225,108,61]:heat>.3?[210,173,70]:[64,155,182]):rosette?(kind==='arabidopsis'?[83,150,58]:[96,157,143]):[70,144,57];
for(const p of padNodes.filter(p=>!p.visible)){const t=Architecture.padPoint(p);tube([p.x/65,-p.y/65,0],[t.x/65,-t.y/65,0],.023,.015,[140,121,92]);for(const ch of padNodes.filter(ch=>ch.parentId===p.id))tube([p.x/65,-p.y/65,0],[ch.x/65,-ch.y/65,0],.023,.015,[140,121,92]);}
for(let k=0;k<count;k++){
 const mass=growth?Math.max(0,r.leafUnits[k]||0):1;if(mass<1e-7)continue;organs.leaves++;
 if(pad){const p=padNodes[k];tube([(p.x-Math.sin(p.angle)*p.length*.04)/65,(-p.y-Math.cos(p.angle)*p.length*.04)/65,0],[(p.x+Math.sin(p.angle)*p.length*.08)/65,(-p.y+Math.cos(p.angle)*p.length*.08)/65,0],.026,.022,[96,154,92]);const at=(u,v)=>{const xx=p.width*.64*Math.sin(u)*Math.cos(v),yy=-p.length*.5+p.length*.5*Math.cos(u);return[(p.x+xx*Math.cos(p.angle)-yy*Math.sin(p.angle))/65,-(p.y+xx*Math.sin(p.angle)+yy*Math.cos(p.angle))/65,.10*Math.sin(u)*Math.sin(v)];};
  for(let a=0;a<12;a++)for(let b=0;b<16;b++)surface([at(a*Math.PI/12,b*Math.PI/8),at((a+1)*Math.PI/12,b*Math.PI/8),at((a+1)*Math.PI/12,(b+1)*Math.PI/8),at(a*Math.PI/12,(b+1)*Math.PI/8)],[96,154,92]);
  for(let j=0;j<13;j++){const a=j*2.4,rr=Math.sqrt((j+1)/15),xx=Math.cos(a)*p.width*.52*rr,yy=-p.length*.5+Math.sin(a)*p.length*.42*rr;dot([(p.x+xx*Math.cos(p.angle)-yy*Math.sin(p.angle))/65,-(p.y+xx*Math.sin(p.angle)+yy*Math.cos(p.angle))/65,-.09],'#e3dab0',1.05);}continue;}
 const maxCount=Math.max(1,options.maxLeaves||count),rank=(flaveria?Math.floor(k/2)/Math.max(1,Math.ceil(maxCount/2)-1):k/Math.max(1,maxCount-1)),y=rosette?.04:height*(.12+.8*rank),a=rosette?k*2.399:flaveria?(k%2)*Math.PI+Math.floor(k/2)*Math.PI/2:grass?(k%2?Math.PI:0)+.12*Math.sin(k*1.7):k*2.399963,dir=[Math.cos(a),0,Math.sin(a)],size=(growth?Math.sqrt(mass):1)*(.9+.2*Architecture.variation(k,12)),L=(grass?(.55+1.15*Math.sin((.12+.80*rank)*Math.PI)):(rosette?(kind==='arabidopsis'?.75:kind==='pineapple'?1.9:1.6)*(1-.45*rank):pad?.5:flaveria?.48:.75))*size,rise=(rosette?(kind==='arabidopsis'?.05+.18*rank:.18+1.75*rank):pad?.75:grass?.22+.80*rank:.18)*size,droop=((grass?.58*(1-rank)+.10:rosette?.025:.07)+(1-clamp(r.stress??1,0,1))*.45)*size;
 const branch=flaveria&&k>3?.15+.32*Math.sin(rank*Math.PI):0;
 if(branch)tube([0,y-.28,0],[dir[0]*branch,y,dir[2]*branch],.018,.01,[102,154,74],view.cutaway);
 const expansion=growth?clamp(r.leafBuilt?.[k]??1,0,1):1,survival=growth?clamp(mass/Math.max(1e-9,r.leafBuilt?.[k]??mass),0,1):1,leafRGB=view.thermal?rgb:rosette?rgb:[86+60*(1-survival),179-60*(1-survival),69-25*(1-survival)];
 let leaflet=0;
 function leaf(t,b){const width=(grass?(kind==='wheat'?.047:kind==='sorghum'?.085:.13):rosette?(kind==='pineapple'?.10:kind==='arabidopsis'?.24:.26):pad?.28:flaveria?(kind==='kalanchoe'?.23:.16):.25)*size*(.25+.75*expansion)*Math.pow(Math.sin(Math.PI*t),rosette?.65:grass?.65:.85)*(1-.22*t)*(kind==='kalanchoe'?1+.11*Math.cos(t*Math.PI*12):1),twist=.22*Math.sin(t*4+k),xx=L*t,yy=rosette?y+rise*t-.12*t*t:y+rise*Math.sin(t*Math.PI*.85)-droop*t*t;if(kind==='soybean'){const aa=a+leaflet*.9,dd=[Math.cos(aa),0,Math.sin(aa)],base=[dir[0]*L*.28,y+.08,dir[2]*L*.28];return[base[0]+dd[0]*xx*.62-dd[2]*width*b*.6,base[1]+(yy-y)*.6,base[2]+dd[2]*xx*.62+dd[0]*width*b*.6];}return[dir[0]*(xx+branch)-dir[2]*width*b,yy-(rosette?.12:.032)*Math.abs(b)*Math.sin(t*Math.PI)+width*b*Math.sin(twist),dir[2]*(xx+branch)+dir[0]*width*b];}
 const midline=Array.from({length:leafSteps+1},(_,j)=>leaf(j/leafSteps,0));
 if(kind==='soybean')tube([0,y,0],[dir[0]*L*.28,y+.08,dir[2]*L*.28],.009,.005,[102,154,74]);
 for(const li of (kind==='soybean'?[-1,0,1]:[0])){leaflet=li;for(let j=0;j<leafSteps;j++)for(let b=-leafBands/2;b<leafBands/2;b++)surface([leaf(j/leafSteps,b/(leafBands/2)),leaf((j+1)/leafSteps,b/(leafBands/2)),leaf((j+1)/leafSteps,(b+1)/(leafBands/2)),leaf(j/leafSteps,(b+1)/(leafBands/2))],leafRGB);}leaflet=0;
 // Longitudinal venation and folded sheaths distinguish maize blades from generic leaves.
 for(const b of (options.veins===false?[]:count>50?[0]:grass||rosette?[-.75,-.4,0,.4,.75]:[0]))path(Array.from({length:leafSteps+1},(_,j)=>{const p=leaf(j/leafSteps,b);p[1]+=.005;return p;}),b===0?'#c2d98caa':'#bad48428',b===0?1.15:.45);
 if(grass&&count<45)for(const side of [-1,1])path(Array.from({length:leafSteps+1},(_,j)=>leaf(j/leafSteps,side)),'#c5df8a55',.5);
 if(grass)tube([0,Math.max(0,y-.12),0],[0,y+.04,0],stemRadius*1.08,stemRadius*.95,[113,155,69],view.cutaway);
 if(!grass&&!rosette&&options.veins!==false)for(let j=3;j<22;j+=4)for(const side of [-1,1])path([leaf(j/28,0),leaf((j+3)/28,side*.9)],'#c2d98c55',.55);
 if(rosette){const tip=leaf(1,0);path([leaf(.97,0),[tip[0]*1.035,tip[1]+.025,tip[2]*1.035]],'#bcb89d',1);}
 if(!grass&&!rosette&&!pad&&options.veins!==false)for(let j=4;j<25;j+=4)for(const b of [-.8,.8])path([leaf((j-2)/28,0),leaf(j/28,b)],'#bdcf9344',.6);

}
// Flowers only appear from simulated reproductive tissue in growth mode.
if((!growth||(r.flower||0)+(r.fruit||0)>1e-7)&&kind==='maize'){organs.tassels++;
tube([0,height-.1,0],[.02,height+.52,0],.022,.006,[176,167,103]);
for(let j=0;j<9;j++){const a=j*2.4,y=height+.03+(j%4)*.035,end=[.29*Math.cos(a),height+.27+(j%3)*.06,.29*Math.sin(a)],base=[0,y,0];path([base,mix(base,end,.6),end],'#c6b47a',1.1);for(let k=1;k<=7;k++){const p=mix(base,end,k/8);path([[p[0]-.014,p[1]-.013,p[2]],[p[0]+.014,p[1]+.018,p[2]]],'#dbcc99',2);}}
}
if(kind==='maize'&&(!growth||height>.7&&r.root>0))for(let j=0;j<7;j++){const a=j*Math.PI*2/7;path([[0,.22*growthScale,0],[.14*Math.cos(a),.07,.14*Math.sin(a)],[.28*Math.cos(a),-.08,.28*Math.sin(a)]],'#98a56d',1.6);}
for(const organ of reproduction.sites){
 const i=organ.id,n=reproduction.count,side=i%2?-1:1,mass=organ.flower+organ.fruit,q=growth?Math.min(1,Math.cbrt(mass/.6)):1;
 let x=(i-(n-1)/2)*.30,y=height;
 if(kind==='maize'){
  organs.ears++;const f=growth?Math.min(1,Math.cbrt(organ.fruit)/2):1,yy=height*(.68-.42*i/Math.max(1,n-1));
  tube([side*.05,yy,0],[side*.2,yy+.4*f,0],.10*f,.018*f,[130,163,65]);
  for(let j=0;j<5;j++)path([[side*.2,yy+.38*f,0],[side*(.23+.01*j),yy+.5*f,.02*j*f]],'#c8a978',.7);continue;
 }
 if(grass){y=height*(.82+.18*(1-Math.abs(x)/Math.max(.3,n*.15)));if(n>1)tube([0,0,0],[x,y,0],stemRadius*.6,stemRadius*.25,[93,143,62]);}
 else if(rosette){y=(kind==='arabidopsis'?1.85:kind==='pineapple'?1.25:2.4)*Math.max(.5,growthScale)+i*.07;x=kind==='pineapple'?(i-(n-1)/2)*.4:side*(.12+.02*(i%3));path([[kind==='pineapple'?x:0,.1,0],[kind==='pineapple'?x:0,y-.1,0],[x,y,0]],'#82985a',2);}
 else if(pad){const tips=padNodes.filter(p=>p.visible&&!padNodes.some(ch=>ch.parentId===p.id&&ch.visible));if(!tips.length)continue;const p=tips[i%tips.length],t=Architecture.padPoint(p,(Math.floor(i/tips.length)%3-1)*.35);x=t.x/65;y=-t.y/65;}
 else if(n>1){x=i?side*(.25+.18*Math.floor((i-1)/2)):0;y=height-(i?.2+.18*Math.floor((i-1)/2):0);path([[0,Math.max(0,y-.35),0],[x,y,0]],'#779a60',2);}
 if(['sorghum','rice','sugarcane','millet'].includes(kind)){
  organs.panicles++;tube([x,y-.04,0],[x,y+.68*q,0],.018*q,.005*q,[149,154,83]);
  for(let j=0;j<65;j++){const a=j*2.4,t=j/65,rad=(kind==='millet'?.09:kind==='sugarcane'?.29:.16)*(kind==='millet'?1:Math.sin(Math.PI*t))*q,base=[x,y+(.07+t*.49)*q,0],tip=[x+rad*Math.cos(a),y+(.14+t*.49-(kind==='rice'?.25*Math.sin(Math.PI*t):0))*q,rad*Math.sin(a)];path([base,tip],'#b3a974',.7);dot(tip,'#cab17b',1.5*q);}
 }else if(kind==='wheat'){
  organs.spikes++;for(let j=0;j<14;j++){const yy=y+(.06+j*.03)*q,xx=(j%2?1:-1)*.045*q;tube([x,yy,0],[x+xx,yy+.06*q,0],.026*q,.01*q,[193,175,104]);path([[x+xx,yy+.06*q,0],[x+xx*2,yy+.16*q,0]],'#b9b588',.5);}
 }else if(kind==='sunflower'){
  organs.heads++;const inner=.13*q,outer=.33*q,z=-.06;
  for(let k=0;k<24;k++){const angle=k*Math.PI/12,points=[];for(let j=0;j<=16;j++){const u=j*Math.PI/8,rr=inner+(outer-inner)*(.5+.5*Math.cos(u)),ww=.053*q*Math.sin(u);points.push([x+rr*Math.cos(angle)-ww*Math.sin(angle),y+rr*Math.sin(angle)+ww*Math.cos(angle),z+.015*Math.sin(u)]);}surface(points,k%2?[255,202,48]:[245,174,35]);}
  path(Array.from({length:25},(_,j)=>[x+inner*Math.cos(j*Math.PI/12),y+inner*Math.sin(j*Math.PI/12),z-.02]),'#75612d',.7,'#493e28');
 }else if(kind==='pineapple'){organs.fruits++;tube([x,y-.1,0],[x,y+.45*q,0],.16*q,.10*q,[172,150,64]);for(let j=0;j<8;j++){const a=j*2.4;path([[x,y+.45*q,0],[x+Math.cos(a)*.14*q,y+.72*q,Math.sin(a)*.14*q]],'#5e944e',2);}for(let j=0;j<15;j++)dot([x+Math.cos(j*2.4)*.12*q,y+(j/15)*.42*q,-.1*q],'#6e7d40',1);
 }else if(['soybean','arabidopsis'].includes(kind)){organs.fruits++;tube([x,y,0],[x+.09*q,y+.26*q,0],(kind==='arabidopsis'?.012:.04)*q,.008*q,[137,156,73]);
 }else if(pad){organs.fruits++;tube([x,y,0],[x,y+.18*q,0],.07*q,.04*q,[177,105,74]);}
 else{organs.clusters++;for(let j=0;j<5;j++){const xx=x+(j-2)*.04*q,yy=y+.07*q*Math.sin(j);path([[x,y-.07,0],[xx,yy,0]],'#849653',.8);dot([xx,yy,0],kind==='kalanchoe'?'#cd7b79':kind==='aloe'?'#e7a94c':'#d6bd65',2.7*q);}}
}
shapes.sort((a,b)=>b.z-a.z);for(const o of shapes)o.paint();
// Anchored labels are deliberately outside the organ geometry.
function label(txt,p,x,y,color){const q=project(p);ctx.strokeStyle=color+'88';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(x,y-5);ctx.stroke();ctx.font='14px system-ui';const tw=ctx.measureText(txt).width;ctx.fillStyle='#0a1928e6';ctx.fillRect(x-5,y-20,tw+10,26);ctx.fillStyle=color;ctx.fillText(txt,x,y);}

Soil.gauges(ctx,w,h,soilResources);
ctx.font='10px system-ui';ctx.fillStyle='#7c889c';ctx.fillText('DRAG TO ORBIT · SCHEMATIC GEOMETRY',16,23);
ctx.fillStyle='#30483f';ctx.font='13px system-ui';ctx.fillText(organs.leaves+' '+Architecture.profile(kind).unit+(Number.isFinite(r.biomass)?'  /  '+r.biomass.toFixed(1)+' g dry':''),16,49);
if(Number.isFinite(r.leafT)){ctx.textAlign='right';ctx.fillStyle='#476b5d';ctx.font='13px system-ui';ctx.fillText(r.leafT.toFixed(1)+' °C',w-16,49);ctx.textAlign='left';}
return{...s,kind,organs,reproduction,soilResources,padNodes,geometry:{height,stemRadius,stemScaleReferenceG:10,rootScale,rootAxes,lateralCount,calibrated:false},net,loop,up,heat:(r.loopHeat||0)*(r.area||0)};
}
function bind(canvas,redraw){if(!canvas||canvas.dataset?.orbitBound)return;if(canvas.dataset)canvas.dataset.orbitBound='1';let drag=null;canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture?.(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;view.yaw+=(e.clientX-drag[0])*.009;view.tilt=clamp(view.tilt+(e.clientY-drag[1])*.006,-.35,.7);drag=[e.clientX,e.clientY];redraw();});const stop=()=>{drag=null;};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')Object.assign(view,{yaw:-.35,tilt:.23,zoom:1});else if(e.key==='ArrowLeft'||e.key==='ArrowRight')view.yaw+=e.key==='ArrowLeft'?-.15:.15;else view.tilt=clamp(view.tilt+(e.key==='ArrowUp'?.08:-.08),-.35,.7);redraw();});}
const api={draw,status,view,bind};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WaterCircuit=api;
})(globalThis);
