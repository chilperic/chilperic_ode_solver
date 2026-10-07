/* Seeded adaptive walks for the idealized Mount Fuji teaching landscape.
 * Deliberately separate from plant physiology and Kimura experiment records. */
(function(root){'use strict';
const clamp=x=>Math.max(0,Math.min(1,x));
function fitness(x,y){return Math.max(0,1-Math.hypot(x-.55,y-.55)/Math.hypot(.55,.55));}
function simulate({seed=803,replicates=200,steps=160}={}){
 if(!Number.isInteger(replicates)||replicates<1||replicates>1000||!Number.isInteger(steps)||steps<1||steps>1000)throw Error('Choose 1–1000 replicates and mutation steps.');
 let state=(Number(seed)>>>0)||1;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const paths=Array.from({length:replicates},()=>{
  let x=.04+.2*random(),y=.04+.2*random(),value=fitness(x,y);const path=[{x,y,value}];
  for(let step=1;step<=steps;step++){
   const angle=random()*Math.PI*2,radius=.1*Math.sqrt(random()),nx=clamp(x+radius*Math.cos(angle)),ny=clamp(y+radius*Math.sin(angle)),next=fitness(nx,ny);
   if(next>value){x=nx;y=ny;value=next;}
   path.push({x,y,value});
  }
  return path;
 });
 const means=Array.from({length:steps+1},(_,step)=>paths.reduce((m,path)=>({x:m.x+path[step].x/replicates,y:m.y+path[step].y/replicates,value:m.value+path[step].value/replicates}),{x:0,y:0,value:0}));
 return{seed:Number(seed)>>>0,replicates,steps,paths,means};
}
function frame(run,step){const index=Math.max(0,Math.min(run.steps,Math.floor(step||0)));return{index,individuals:run.paths.map(path=>path[index]),mean:run.means[index]};}
const api={simulate,frame,fitness};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FujiEvolution=api;
})(globalThis);
