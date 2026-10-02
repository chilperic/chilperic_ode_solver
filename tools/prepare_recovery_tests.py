"""Prepare browser probes; no runtime source or scientific tolerance is changed."""
from pathlib import Path
p=Path('tests/recovery_browser.py');s=p.read_text()
a="def export(pg,id,name):\n  with pg.expect_download(timeout=15000) as d:pg.locator('#'+id).click()"
b="""def export(pg,id,name):
  # Exports are deliberately inside a source <details> disclosure. Open the
  # actual summary before using the visible control, rather than force-clicking.
  closed=pg.locator('#'+id).locator('xpath=ancestor::details[not(@open)]')
  for i in range(closed.count()-1,-1,-1):
   closed.nth(i).locator(':scope > summary').click()
  with pg.expect_download(timeout=15000) as d:pg.locator('#'+id).click()"""
assert a in s;s=s.replace(a,b)
a="return {'buttons':pg.locator('#compareCirculation,#exportCirculation,#loopPlantC30,#loopPlantC31,#loopPlantC40,#loopPlantC41,#loopPlantCAM0,#loopPlantCAM1').count(),'snapshot':snap(pg,'07-circulation','#waterCircuit')}"
b="""pg.wait_for_function('CirculationComparison.frame(1)!==null',timeout=120000)
  details=pg.evaluate('(()=>{const f=CirculationComparison.frame(1);if(f.rows.length!==2)throw Error("Missing matched paired states");return {states:f.rows.map(x=>({leafT:x.leafT,soil:x.soil,biomass:x.biomass,loopActualFlow:x.loopActualFlow})),days:f.config.days};})()')
  details['buttons']=pg.locator('#compareCirculation,#exportCirculation,#loopPlantC30,#loopPlantC31,#loopPlantC40,#loopPlantC41,#loopPlantCAM0,#loopPlantCAM1').count()
  details['snapshot']=snap(pg,'07-circulation','#waterCircuit');return details"""
assert a in s;s=s.replace(a,b)
a="check('Cell full native JSON export',lambda:export(pg,'download','cell-native.json'));pg.close()"
b="""check('Cell full native JSON export',lambda:export(pg,'download','cell-native.json'))
 def pause_replay():
  pg.locator('#replay').click();pg.wait_for_timeout(400);a=float(pg.input_value('#timeline'));ensure(a>0,'Replay did not advance actual clock');pg.locator('#play').click();b=float(pg.input_value('#timeline'));pg.wait_for_timeout(220);c=float(pg.input_value('#timeline'));ensure(abs(c-b)<1e-9,'Pause did not hold time');return {'playing_time':a,'paused_time':b}
 check('Cell replay and pause control the recorded event clock',pause_replay)
 def storage():
  return pg.evaluate('async()=>{const r=ResearchRecords.create(ResearchExperiments.getLatest().lab,ResearchExperiments.getLatest().result,{title:"Browser verification cell record"});await ResearchStorage.put(r);return {id:r.id,revision:r.revision};}')
 check('Original native record schema can be saved to IndexedDB',storage)
 pg.close()"""
assert a in s;s=s.replace(a,b)
# Capture filmstrip views of the real recovered scenes. No synthetic frames.
a="check('Lipid mechanism rendered',lambda:snap(pg,'04-lipid-chain','#molecularA'));"
b="""check('Lipid mechanism rendered',lambda:snap(pg,'04-lipid-chain','#molecularA'));
 def lipid_frames():
  names=[]
  for n,f in enumerate([0,.0003,.1,.8]):
   scrub(pg,'timeline',f);names.append(snap(pg,'lipid-frame-'+str(n),'#molecularA'))
  return names
 check('Lipid source filmstrip at declared physical times',lipid_frames);"""
assert a in s;s=s.replace(a,b)
p.write_text(s)
print('Browser tests now reveal original export disclosures and inspect event clock, resource comparison and persistent records.')
