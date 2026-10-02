"""Integration corrections isolated from original scientific engines/renderers."""
from pathlib import Path
from bs4 import BeautifulSoup
import json,hashlib
site=Path('site');changes=[]
def put(path,body,reason):
 p=site/path;before=hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(body);changes.append({'path':path,'before_sha256':before,'after_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'reason':reason})
bridge="""(function(r){'use strict';const seen=new Set();const key=x=>(x.id||[x.lab,x.title].join('|'))+'|'+x.href;r.FokoScientificExampleCatalog=[...(r.FokoScientificExampleCatalog||[]),...(r.FokoUpgradeCatalogue||[])].filter(x=>{const k=key(x);if(seen.has(k))return false;seen.add(k);return true;});})(globalThis);"""
put('src/recovery/catalog-bridge.js',bridge,'Keep distinct source records sharing a destination; deduplicate only identical catalogue identities.')
p=site/'src/upgrade/experiments-hub.js';s=p.read_text().replace("const k=x.id+'|'+x.href","const k=(x.id||[x.lab,x.title].join('|'))+'|'+x.href");put(str(p.relative_to(site)),s,'Match the union catalogue identity key.')
for p in list(site.rglob('*.html')):
 if 'assets/vendor' in str(p):continue
 soup=BeautifulSoup(p.read_text(),'html.parser');rel=str(p.relative_to(site));prefix='../'*(len(p.relative_to(site).parents)-1)
 if not soup.head or not soup.body:continue
 # Registry must exist before the union is constructed, regardless of original script placement.
 tags=[x for x in soup.find_all('script') if (x.get('src') or '').split('?')[0].endswith('src/upgrade/registry.js')]
 for x in tags:x.extract()
 if tags:
  tag=tags[0];tag.attrs.pop('defer',None);tag.attrs.pop('async',None)
  target=next((x for x in soup.head.find_all('script') if (x.get('src') or '').endswith('src/models/scientific-example-catalog.js')),None)
  if target:target.insert_before(tag)
  else:soup.head.append(tag)
 if rel=='lipids/index.html':soup.select_one('#timeline')['step']='any'
 if rel=='index.html':
  soup.select_one('.foko-hero h1').string='FokoLab — scientific simulations'
  soup.select_one('.foko-hero h1').find_next('p').string='Explore organ growth, cell lineages, molecular reactions and evolutionary trajectories. Build and analyze your own models in the same workspace.'
  for x in soup.select('.foko-orbit'):x.decompose()
  for x in soup.select('.foko-section-head h2'):
   if x.get_text().startswith('Start from'):x.string='Choose a scientific system'
 # Every unavailable publication link is labelled, not silently redirected to an unrelated result.
 put(rel,str(soup),'Place the existing scenario registry before the combined catalogue; reaction-slider precision is unrestricted only on the lipid event view.')
p=site/'src/upgrade/common.js';s=p.read_text().replace('79.2.0','80.1.0').replace('80.0.0','80.1.0');put(str(p.relative_to(site)),s,'Ensure shared UI reports this tested integration release, not its baseline.')
p=site/'src/recovery/runtime.js';s=p.read_text();s=s.replace("function init(){d.documentElement.dataset.fokoRelease='80.1.0';","function init(){d.documentElement.dataset.fokoRelease='80.1.0';const css=d.createElement('link');css.rel='stylesheet';css.href=route('styles/recovery-final.css');d.head.append(css);")
put(str(p.relative_to(site)),s,'Append final navigation/typography tokens after legacy runtime stylesheet injection.')
put('styles/recovery-final.css','''body[data-foko-integrated] .foko-home .foko-hero{display:block;padding:20px 0 30px}body[data-foko-integrated] .foko-home .foko-hero h1{font-size:clamp(32px,4vw,52px);line-height:1.12;max-width:none;letter-spacing:-.04em}body[data-foko-integrated] .foko-home .foko-hero p{font-size:19px;max-width:880px}body[data-foko-integrated] .foko-home a:not(.primary){color:var(--foko-teal,#1c6672)}.recovery-provenance a{color:var(--accent,#1c6672)}.foko-context a{color:#275c67}.foko-header .foko-primary-nav a{color:#edf8f9}@media(max-width:650px){body[data-foko-integrated] .foko-home .foko-hero h1{font-size:34px}body[data-foko-integrated] .foko-home .foko-hero p{font-size:16px}}''','Compact typography without changing computation or recorded-state diagrams.')
# Offline MathJax SVG renderer already exists in the baseline and does not require font binaries.
removed=[]
for p in site.rglob('*'):
 if p.is_file() and p.suffix.lower() in ('.woff','.woff2','.ttf','.otf','.eot'):
  removed.append(str(p.relative_to(site)));p.unlink()
manifest=json.loads((site/'recovery-manifest.json').read_text());manifest['integration_corrections']=changes;manifest['font_binaries_excluded']=removed
# Recheck all original scientific assets after the correction pass.
for check in manifest['scientific_source_checks']:
 check['integrated_sha256']=hashlib.sha256((site/check['path']).read_bytes()).hexdigest();check['byte_identical']=check['source_sha256']==check['integrated_sha256'];assert check['byte_identical'],check['path']
(site/'recovery-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print(json.dumps({'integration_corrections':len(changes),'excluded_font_binaries':len(removed),'scientific_source_preserved':len(manifest['scientific_source_checks'])}))
