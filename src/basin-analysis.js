(function(root){'use strict';
function basinMap({xRange=[-2,2],yRange=[-2,2],nx=40,ny=40,simulate,classify}){const grid=[];for(let j=0;j<ny;j++){const y=yRange[0]+(yRange[1]-yRange[0])*j/(ny-1);const row=[];for(let i=0;i<nx;i++){const x=xRange[0]+(xRange[1]-xRange[0])*i/(nx-1);row.push(classify(simulate([x,y]),[x,y]));}grid.push(row);}return {xRange,yRange,nx,ny,grid};}
const api={basinMap};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FokoBasin=api;
}(typeof window!=='undefined'?window:globalThis));