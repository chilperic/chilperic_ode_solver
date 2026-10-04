"""Publish the requested CV editions without modifying numerical laboratories."""
from pathlib import Path
from hashlib import sha256
import json, re, shutil, subprocess
import fitz
from PIL import Image
from bs4 import BeautifulSoup

root=Path('.').resolve(); source=root/'deployment/cv'; build=root/'deployment/cv-build'; build.mkdir(exist_ok=True)
site=root/'site'; original=site/'assets/profile-chilperic.webp'
assert sha256(original.read_bytes()).hexdigest()=='82831d92a306952f303010b43faeeaee763f2ce283e443b40feeb1cbfded0fd3'
image=Image.open(original).convert('RGB');image.save(build/'profile_photo.png')
assert image.tobytes()==Image.open(build/'profile_photo.png').convert('RGB').tobytes()
industry=(source/'industry_cv.tex').read_text(); preamble=industry.split('\\begin{document}',1)[0]
texts={'industry_cv':industry,'academic_cv':preamble+(source/'academic.body.tex').read_text(),'industry_cv_german':preamble.replace('[english]{babel}','[ngerman]{babel}').replace('Last updated: 4 October 2026','Aktualisiert: 4. Oktober 2026')+(source/'industry-german.body.tex').read_text()}
photo_header=r'''\newcommand{\headline}[2]{%
\noindent\begin{minipage}[t]{\dimexpr\linewidth-35mm\relax}
\vspace{0pt}{\small\bfseries\color{Rust}#1}\par\vspace{5pt}
{\fontsize{27}{29}\selectfont\bfseries Dr. Chilperic Armel\\Foko Kuate}\par
\end{minipage}\hfill\begin{minipage}[t]{28mm}
\vspace{0pt}\includegraphics[width=28mm]{profile_photo.png}
\end{minipage}\par\vspace{7pt}
{\large\color{Teal}#2}\par\vspace{9pt}
{\small Düsseldorf, Germany\quad\textbar\quad\href{mailto:chilpericarmel@gmail.com}{chilpericarmel@gmail.com}}\par
{\small\href{https://chilperic.github.io}{Research website}\quad\textbar\quad\href{https://github.com/chilperic}{GitHub}\quad\textbar\quad\href{https://orcid.org/0000-0002-0140-7588}{ORCID: 0000-0002-0140-7588}}\par\vspace{7pt}
{\color{Rust}\rule{23mm}{1.5pt}}{\color{Rule}\rule{\dimexpr\linewidth-23mm}{.5pt}}\par}
'''
expected={'industry_cv':'9abce98b622bcccfbb76d6ca2655634b09c589b5c2a3aab5e0ed27eada5ba00a','academic_cv':'d8c593abef40e97cedb68e2f33d4a92a19a802f61c2716425f2b93690915437c','industry_cv_german':'ec385ac46ebe51e7551cd666f1f91c1ce6049c6c12b524b51b74f8ed6ecf66cd','industry_cv_with_photo':'95209831f46737b0e2a494e5d0e866a414592eb5c177e61e917ea11fe72fc14c','academic_cv_with_photo':'232b9a128715aa3f4f2ec297609e8dac1c80bd3cee99fb9b1476c8f8058825f8','industry_cv_german_with_photo':'0cfc19242935262e2916338164f08bc1aae749571415f3901100157ed890d95e'}
records=[]
for stem,tex in texts.items():
 for photo in (False,True):
  name=stem+('_with_photo' if photo else '');text=tex
  if photo:
   start=text.index('\\newcommand{\\headline}');end=text.index('\\begin{document}',start)
   header=photo_header.replace('Research website','Forschungswebsite') if stem.endswith('german') else photo_header
   text=text[:start]+header+'\n'+text[end:]
  actual=sha256(text.encode()).hexdigest()
  assert actual==expected[name],f'Source does not match reviewed edition: {name} {actual}'
  path=build/(name+'.tex');path.write_text(text)
  for repeat in range(2):
   done=subprocess.run(['xelatex','-interaction=nonstopmode','-halt-on-error',path.name],cwd=build,capture_output=True)
   assert done.returncode==0,done.stdout.decode(errors='replace')[-4000:]
  assert 'Overfull \\hbox' not in (build/(name+'.log')).read_text(errors='replace'),name+' text overflow'
  pdf=build/(name+'.pdf');doc=fitz.open(pdf);pages=3 if stem=='academic_cv' else 2
  assert len(doc)==pages,(name,len(doc))
  contents='\n'.join(page.get_text() for page in doc)
  assert all(x in contents for x in ('Foko Kuate','MSc','Baccalauréat','2009','2026')),name
  assert ('October 2026' in contents or 'Oktober 2026' in contents),name
  assert bool(doc[0].get_images(full=True))==photo,name+' portrait mismatch'
  for directory in (site/'cv',site/'assets/cv'):
   directory.mkdir(parents=True,exist_ok=True);shutil.copy2(pdf,directory/pdf.name)
  for directory in (site/'cv/sources',site/'assets/cv'):
   directory.mkdir(parents=True,exist_ok=True);shutil.copy2(path,directory/path.name);shutil.copy2(build/'profile_photo.png',directory/'profile_photo.png')
  records.append({'id':name,'photo':photo,'pages':pages,'pdf_sha256':sha256(pdf.read_bytes()).hexdigest(),'source_sha256':actual,'href':'cv/'+pdf.name})

page=site/'cv.html';soup=BeautifulSoup(page.read_text(),'html.parser');grid=soup.select_one('.cv-download-grid,.cv-downloads');assert grid
section=grid.find_parent('section');grid.clear();grid['class']=['cv-downloads']
for heading in section.find_all(['h1','h2']):heading.string='CV downloads'
for title,desc,stem in [('Industry CV','Applied modelling, scientific software and data analysis · English · 2 pages','industry_cv'),('Academic CV','Research, publications, teaching and education · English · 3 pages','academic_cv'),('Lebenslauf','Wissenschaftliches Rechnen und Modellierung · Deutsch · 2 Seiten','industry_cv_german')]:
 article=soup.new_tag('article',attrs={'class':'cv-download-card'});h=soup.new_tag('h3');h.string=title;p=soup.new_tag('p');p.string=desc;actions=soup.new_tag('div',attrs={'class':'cv-download-options'})
 for suffix,label in [('', 'Without photo · PDF'),('_with_photo','With photo · PDF')]:
  a=soup.new_tag('a',href=f'cv/{stem}{suffix}.pdf',attrs={'aria-label':f'{title}: {label}'});a.string=label;actions.append(a)
 article.extend([h,p,actions]);grid.append(article)
updated=soup.new_tag('p',attrs={'class':'cv-updated'});updated.string='Last updated: 4 October 2026';grid.insert_before(updated)
# The qualifications summary uses the same chronology as the downloadable PDFs.
heading=next((h for h in soup.find_all(['h2','h3']) if h.get_text(strip=True)=='Education'),None)
if heading:
 listing=heading.find_next('ul')
 if listing:
  listing.clear()
  for degree,date,institution in [('PhD, Quantitative and Theoretical Biology','2019–2023','HHU Düsseldorf'),('MSc, Mathematics and Fundamental Applications','2017–2019','University of Yaoundé I'),('MSc, Mathematical Sciences','2015–2016','AIMS Ghana / University of Cape Coast'),('BSc, Mathematics','2009–2012','University of Douala'),('Baccalauréat','2009','Collège La Confiance, Bafoussam')]:
   li=soup.new_tag('li');strong=soup.new_tag('strong');strong.string=degree;li.extend([strong,' — '+institution+', '+date+'.']);listing.append(li)
style=soup.new_tag('style');style.string='''.cv-downloads{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.cv-download-card{padding:22px;border:1px solid #bed1d6;border-radius:14px;background:#f8fbfc;min-width:0}.cv-download-card h3{margin:0 0 10px;font-size:20px}.cv-download-card p{font-size:14px;line-height:1.5;color:#455f67;min-height:66px}.cv-download-options{display:flex;flex-direction:column;gap:10px}.cv-download-options a{display:flex;padding:12px 14px;min-height:44px;box-sizing:border-box;align-items:center;border:1px solid #89a9b1;border-radius:7px;background:#fff;color:#174f60;font-size:14px;font-weight:650;text-decoration:none}.cv-download-options a:hover{background:#e6f0f3}.cv-download-options a:focus-visible{outline:3px solid #b86536;outline-offset:3px}.cv-updated{font-size:13px;color:#455f67}html[data-appearance=dark] .cv-download-card{background:#1a3440;border-color:#496975}html[data-appearance=dark] .cv-download-card p,html[data-appearance=dark] .cv-updated{color:#cadae1}html[data-appearance=dark] .cv-download-options a{background:#102c38;border-color:#648a98;color:#d6f3fb}@media(max-width:850px){.cv-downloads{grid-template-columns:1fr}.cv-download-card p{min-height:0}}''';soup.head.append(style);page.write_text(str(soup))
manifest={'updated':'2026-10-04','portrait_source':'assets/profile-chilperic.webp','portrait_sha256':sha256(original.read_bytes()).hexdigest(),'portrait_changes':'Lossless format conversion and proportional PDF placement only; no retouching or cropping.','editions':records}
(site/'cv/downloads.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
for relative in ['cv.html','cv','assets/cv']:
 a=site/relative;b=root/'docs'/relative
 if a.is_dir():shutil.copytree(a,b,dirs_exist_ok=True)
 else:shutil.copy2(a,b)
(root/'deployment/cv-build/verification.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False));print(json.dumps(manifest,indent=2,ensure_ascii=False))
