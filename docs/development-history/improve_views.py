from pathlib import Path
from bs4 import BeautifulSoup
r=Path(__file__).resolve().parents[1];site=r/'site'
for p in site.glob('*.html'):
 s=BeautifulSoup(p.read_text(),'html.parser')
 save=s.find(id='u-save')
 if not save:continue
 parent=save.find_parent('section')
 if parent and not parent.find(id='u-persistence'):
  h=parent.find(['h2','h3'])
  if h:h.decompose()
  details=s.new_tag('details',id='u-persistence');details['open']='';summary=s.new_tag('summary');summary.string='Save, restore & share';details.append(summary)
  for node in list(parent.contents):details.append(node)
  parent.append(details)
 p.write_text(str(s))
p=site/'src/upgrade/lab-ui.mjs';s=p.read_text()
s=s.replace("if(innerWidth<720)$('u-settings').open=false;", "if(innerWidth<720){$('u-settings').open=false;$('u-persistence').open=false;}")
s=s.replace("right=r.plots.some(p=>p.id===right)?right:r.plots[Math.min(1,r.plots.length-1)].id", "right=r.plots.some(p=>p.id===right)?right:(lab.id==='adaptation'?'traits':r.plots[Math.min(1,r.plots.length-1)].id)")
s=s.replace("let params={},model=null", "let params={},model=null")
# Detect actual WebGL availability once. Preserve full data in scientific exports.
pos=s.index('function plotStyle(spec)')
s=s[:pos]+'''const webglAvailable=(()=>{try{const c=document.createElement('canvas'),g=c.getContext('webgl2')||c.getContext('webgl');if(!g)return false;g.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch(_){return false;}})();
function displaySpec(original){
 if(webglAvailable||!original.data.some(t=>['surface','scatter3d'].includes(t.type)))return original;
 const spec=clone(original);spec.data=spec.data.map(t=>t.type==='surface'?{type:'contour',x:t.x,y:t.y,z:t.z,colorscale:t.colorscale||'Viridis',name:t.name,colorbar:{title:'Value'}}:t.type==='scatter3d'?{type:'scatter',mode:'lines',x:t.x,y:t.y,name:t.name+' · x/y projection',line:{width:2}}:t);
 const scene=spec.layout.scene||{};spec.layout={...spec.layout,scene:undefined,xaxis:{title:scene.xaxis?.title||spec.layout.xaxis?.title||'X'},yaxis:{title:scene.yaxis?.title||spec.layout.yaxis?.title||'Y'},annotations:[{text:'WebGL unavailable · explicit 2D projection',xref:'paper',yref:'paper',x:0,y:1.09,showarrow:false,font:{size:10},xanchor:'left'}]};return spec;
}
''' +s[pos:]
s=s.replace("margin:{l:65,r:35,t:16,b:60}","margin:{l:65,r:35,t:34,b:60}")
s=s.replace("const spec=state.result.plots.find(p=>p.id===(side==='left'?left:right));if(!spec)continue;await Plotly.react", "const raw=state.result.plots.find(p=>p.id===(side==='left'?left:right));if(!raw)continue;const spec=displaySpec(raw);await Plotly.react")
p.write_text(s)
p=site/'src/upgrade/physiology.mjs';s=p.read_text().replace("y0:0,y1:1,fillcolor:'#367fa0',opacity:.08", "y0:1.01,y1:1.06,fillcolor:'#367fa0',opacity:.8").replace("y0:0,y1:1,fillcolor:'#b98235',opacity:.08", "y0:1.01,y1:1.06,fillcolor:'#b98235',opacity:.8").replace("y0:0,y1:1,fillcolor:'#477647',opacity:.08", "y0:1.01,y1:1.06,fillcolor:'#477647',opacity:.8")
s=s.replace("colorscale:'Cividis',showscale:true,colorbar:{title:'Generation'}", "colorscale:'Cividis',showscale:false,colorbar:{title:'Generation'}")
s=s.replace("colorbar:{title:{text:'Fitness proxy'},x:1.18}", "colorbar:{title:{text:'Fitness proxy'},x:1.02}")
p.write_text(s)
p=r/'tests/browser_regression.py';s=p.read_text().replace("page.locator('#studioPreset').select_option('original_fadns');page.wait_for_timeout(100);", "page.locator('#studioPreset').select_option('original_fadns');page.locator('#loadStudioPreset').click();page.wait_for_timeout(100);")
s=s.replace("document.getElementById('u-settings').open=false\"", "document.getElementById('u-settings').open=false;document.getElementById('u-persistence').open=false\"")
p.write_text(s)
