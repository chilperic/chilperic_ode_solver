from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit,unquote
import json
R=Path(__file__).resolve().parents[1];site=R/'site';base=R.parent/'work/baseline79'
replacements={
 'Open complete book ↗':'Open public companion ↗',
 'Download PDF · 12.4 MB':'Download public PDF',
 'The supplied PDF is preserved byte for byte.':'The complete author PDF remains byte-identical in the private package. The public companion preserves scientific pages and page numbering, replacing physical pages 6–9 with explicit omission notices.',
 'The author’s personal planning front matter remains; review before public distribution.':'Private author-planning pages 6–9 are not published in the public companion or its search index.',
 'Read the complete source':'Read the scientific source',
 'All 439 pages, the original explanations and technical figures, 27 worked chapter openings, 54 practice problems, and appendices A–E.':'439 physical page positions, with four private planning pages omitted; scientific explanations and technical figures, 27 worked chapter openings, 54 practice problems, and appendices A–E are retained.',
 'The complete book and its contents remain accessible without JavaScript.':'The public PDF and its contents remain accessible without JavaScript.',
}
for p in site.rglob('*.html'):
 s=p.read_text()
 for old,new in replacements.items():s=s.replace(old,new)
 p.write_text(s)
v=json.loads((site/'VERSION.json').read_text());v['token']='79.2.0';(site/'VERSION.json').write_text(json.dumps(v,indent=2))
# Resolve original historical documentation links without publishing planning files or old validation as current.
missing=[]
for p in site.rglob('*.html'):
 soup=BeautifulSoup(p.read_text(),'html.parser')
 for tag in soup.find_all(['a','script','link','img','iframe']):
  attr='href' if tag.name in ['a','link'] else 'src';ref=tag.get(attr)
  if not ref or ref.startswith(('#','data:','blob:','mailto:','tel:','javascript:')) or urlsplit(ref).scheme or ref.startswith('//'):continue
  target=(p.parent/unquote(urlsplit(ref).path)).resolve()
  if target==p.parent or target.is_file():continue
  missing.append({'page':str(p.relative_to(site)),'url':ref,'kind':tag.name})
print(json.dumps(missing,indent=2))
(R/'evidence/unresolved-links-before.json').write_text(json.dumps(missing,indent=2))
