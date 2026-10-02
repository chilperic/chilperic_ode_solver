"""Recover public executable resources of the user's specified site.
No login, hidden API, source-editor access, remote code execution, or external-domain crawl.
Numerical implementations are copied as bytes, never reconstructed from rendered text.
"""
from __future__ import annotations
import concurrent.futures as cf
import hashlib
import html
import json
import pathlib
import re
import time
import urllib.error
import urllib.parse as up
import urllib.request as ur
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser

ORIGIN = 'https://dice-branch-fractal.chilpericarmel.chatgpt.site'
HOST = up.urlsplit(ORIGIN).netloc
ROOT = pathlib.Path('recovery/sites-snapshot')
ROOT.mkdir(parents=True, exist_ok=True)
SEEDS = ['/', '/plants/', '/tcells/', '/lipids/', '/random.html', '/continuum/advanced.html', '/integration-notes.html']
EXT = {'.html','.htm','.js','.mjs','.cjs','.css','.json','.svg','.webp','.png','.jpg','.jpeg','.gif','.ico','.wasm','.txt','.csv','.md','.cff','.xml','.py','.yml','.yaml','.map'}
SKIP = {'.pdf','.zip','.woff','.woff2','.ttf','.otf','.eot','.mp4','.webm','.gz','.tar','.exe'}
MAX_FILES, MAX_BYTES, MAX_FILE = 2200, 180_000_000, 20_000_000
MAX_SECONDS = 660
class SameOrigin(ur.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if up.urlsplit(newurl).netloc != HOST:
            raise ValueError('Off-origin redirect was not followed')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.scripts=[]; self.controls=[]; self.base=None
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='base' and a.get('href'): self.base=a['href']
        for key in ('href','src','poster','data-src'):
            if a.get(key): self.links.append(a[key])
        if a.get('srcset'):
            self.links.extend(v.strip().split(' ')[0] for v in a['srcset'].split(','))
        if tag=='script' and a.get('src'): self.scripts.append(a['src'])
        if tag in ('button','input','select','canvas','video'):
            self.controls.append({k:a[k] for k in ('id','type','name','aria-label','min','max','value') if k in a}|{'tag':tag})

skipped, external, records, seen, pending = {}, set(), {}, set(), {}
started=time.time(); total=0

def offer(raw: str, base: str, parent: str) -> None:
    raw=html.unescape(raw).replace('\\/','/').strip()
    if not raw or raw.startswith(('#','data:','blob:','mailto:','tel:','javascript:')) or '${' in raw: return
    if any(c in raw for c in ('\n','\r','\t','<','>','{','}')) or len(raw)>1000: return
    u=up.urlsplit(up.urljoin(base,raw))
    if u.scheme not in ('http','https'): return
    if u.netloc!=HOST:
        if u.scheme=='https': external.add(up.urlunsplit(u))
        return
    path=up.unquote(u.path or '/')
    if any(x in ('.git','.env','private-reference') for x in pathlib.PurePosixPath(path).parts): return
    url=ORIGIN+up.quote(path, safe='/@:~!$&\'()*+,;=-._')
    suffix=pathlib.PurePosixPath(path).suffix.lower()
    if suffix in SKIP:
        skipped[url]='not copied: publication review or excluded binary/font'; return
    if suffix and suffix not in EXT: return
    if url not in seen and url not in pending: pending[url]=parent

def fetch(item):
    url,parent=item
    for attempt in range(2):
        try:
            opener=ur.build_opener(SameOrigin())
            req=ur.Request(url,headers={'User-Agent':'FokoLab-owner-source-recovery/1.0','Accept':'*/*'})
            with opener.open(req,timeout=25) as r:
                ct=r.headers.get('Content-Type','').split(';')[0].lower()
                data=r.read(MAX_FILE+1)
                if len(data)>MAX_FILE: raise ValueError('individual resource budget exceeded')
                return url,parent,r.geturl(),ct,data,None
        except Exception as e:
            if attempt==0 and not isinstance(e,ur.HTTPError): time.sleep(.5); continue
            return url,parent,url,'',b'',f'{type(e).__name__}: {e}'

def local_name(url: str,ct: str) -> str:
    p=up.unquote(up.urlsplit(url).path).lstrip('/')
    if not p or p.endswith('/'): p+='index.html'
    if ct=='text/html' and not pathlib.PurePosixPath(p).suffix: p+='.html'
    dest=(ROOT/p).resolve()
    if not dest.is_relative_to(ROOT.resolve()): raise ValueError('invalid output path')
    return p

for x in SEEDS: offer(x,ORIGIN+'/', 'seed')
while pending and len(seen)<MAX_FILES and total<MAX_BYTES and time.time()-started<MAX_SECONDS:
    batch=list(pending.items())[:24]
    for url,_ in batch: pending.pop(url); seen.add(url)
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        for url,parent,final,ct,data,error in ex.map(fetch,batch):
            rec={'url':url,'referred_by':parent,'resolved_url':final,'content_type':ct}
            if error:
                records[url]=rec|{'status':'failed','error':error}; print('FAILED',url,error,flush=True); continue
            try:
                name=local_name(url,ct)
                expected=pathlib.PurePosixPath(up.urlsplit(url).path).suffix.lower()
                if ct=='text/html' and expected and expected not in ('.html','.htm'):
                    raise ValueError('HTML fallback returned for non-HTML resource')
                dest=ROOT/name; dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(data)
                total+=len(data)
                records[url]=rec|{'status':'recovered','path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
                print('RECOVERED',name,len(data),flush=True)
                istext=ct.startswith('text/') or any(x in ct for x in ('javascript','json','xml')) or expected in {'.js','.mjs','.css','.json','.md','.py','.map'}
                if not istext: continue
                text=data.decode('utf-8',errors='replace')
                if ct=='text/html':
                    parser=Links();parser.feed(text)
                    pagebase=up.urljoin(final,parser.base) if parser.base else final
                    for href in parser.links: offer(href,pagebase,url)
                    records[url]['controls']=parser.controls
                    records[url]['script_urls']=[up.urljoin(pagebase,s) for s in parser.scripts]
                    bases=[pagebase]
                else:
                    bases=[final,ORIGIN+'/']
                    if parent.startswith(ORIGIN): bases.append(parent)
                for raw in re.findall(r'''["'`]([^"'`\s<>]{1,500}\.(?:html?|js|mjs|cjs|css|json|svg|png|jpe?g|webp|ico|wasm|csv|txt|zip|pdf|py|map)(?:\?[^"'`\s<>]*)?)["'`]''',text,re.I):
                    for base in dict.fromkeys(bases): offer(raw,base,url)
                for raw in re.findall(r'url\(\s*["\']?([^\s\)"\']+)',text): offer(raw,final,url)
            except Exception as e:
                records[url]=rec|{'status':'failed','error':str(e)}
    print('PROGRESS',len(seen),'attempted',len(pending),'queued',total,'bytes',flush=True)

summary={'source_origin':ORIGIN,'retrieved_at':datetime.now(timezone.utc).isoformat(),
         'mode':'Public static-resource recovery; no original authoring project access',
         'budgets':{'max_files':MAX_FILES,'max_bytes':MAX_BYTES,'max_seconds':MAX_SECONDS},
         'counts':dict(Counter(r['status'] for r in records.values())), 'bytes':total,
         'unfinished_queue':len(pending),'skipped':skipped,'external_urls':sorted(external),
         'records':list(records.values())}
pathlib.Path('recovery/retrieval.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
pathlib.Path('recovery/RECOVERY-NOTE.md').write_text('# Public executable-source snapshot\n\nThis is a byte-copy snapshot of resources actually served by the specified public site.\nNo test or completeness claim is inferred from retrieval. See retrieval.json for failures and exclusions.\nPDFs, source ZIP downloads and font binaries were excluded pending publication review.\nThe main branch and live deployment are unchanged by this recovery job.\n')
print(json.dumps({k:v for k,v in summary.items() if k not in ('records','external_urls','skipped')},indent=2))
