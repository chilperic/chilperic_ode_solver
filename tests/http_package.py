"""Real loopback HTTP asset serving, MIME, and publication-boundary checks."""
from pathlib import Path
import json,subprocess,socket,time,urllib.request,urllib.error,concurrent.futures
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'site'
s=socket.socket();s.bind(('127.0.0.1',0));port=s.getsockname()[1];s.close()
log=(ROOT/'evidence/http-server.log').open('w');proc=subprocess.Popen(['python3',str(ROOT/'serve.py'),'--port',str(port),'--no-browser'],stdout=log,stderr=log)
base=f'http://127.0.0.1:{port}/';results=[]
def get(path):
 try:
  with urllib.request.urlopen(base+path,timeout=10) as r:return r.status,r.headers.get_content_type(),r.read()
 except urllib.error.HTTPError as e:return e.code,'',b''
try:
 for _ in range(50):
  try:
   if get('index.html')[0]==200:break
  except OSError:time.sleep(.1)
 else:raise RuntimeError('Local server did not start')
 files=[p for p in SITE.rglob('*') if p.is_file() and p.suffix in ['.html','.js','.mjs','.css','.json','.svg','.png','.webp','.ico','.txt','.pdf']]
 def check(p):
  status,mime,body=get(p.relative_to(SITE).as_posix());ok=status==200 and len(body)==p.stat().st_size
  if p.suffix in ['.js','.mjs']:ok=ok and mime=='text/javascript'
  return {'path':p.relative_to(SITE).as_posix(),'status':'passed' if ok else 'failed','httpStatus':status,'mime':mime}
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(check,files))
 boundaries=[]
 for path in ['private-reference/Scientific_Mastery_V6_17_Design_Revision.pdf','../private-reference/Scientific_Mastery_V6_17_Design_Revision.pdf','rollback/FokoLab-79.1-original.zip','materials/Scientific_Mastery_V6_17_Design_Revision.pdf']:
  code=get(path)[0];boundaries.append({'path':path,'status':'passed' if code==404 else 'failed','httpStatus':code})
 results+=boundaries
finally:
 proc.terminate();proc.wait(timeout=5);log.close()
(ROOT/'evidence/http-package.json').write_text(json.dumps({'scope':'Real standard-library HTTP requests to the delivered local launcher, not native browser navigation or live deployment.','results':results},indent=2))
print('HTTP checks',len(results),'failed',sum(r['status']=='failed' for r in results))
raise SystemExit(int(any(r['status']=='failed' for r in results)))
