from pathlib import Path
import fitz, hashlib,json
root=Path(__file__).resolve().parents[1];site=root/'site';src=root/'private-reference/Scientific_Mastery_V6_17_Design_Revision.pdf';out=site/'materials/Scientific_Mastery_V6_17_Public_Companion.pdf'
original=fitz.open(src);doc=fitz.open();omitted={6,7,8,9}
for i in range(len(original)):
 if i+1 not in omitted:doc.insert_pdf(original,from_page=i,to_page=i)
 else:
  r=original[i].rect;p=doc.new_page(width=r.width,height=r.height)
  p.draw_line((45,58),(r.width-45,58),color=(.17,.30,.35),width=1)
  p.insert_text((45,91),'SCIENTIFIC MASTERY  |  V6.17 PUBLIC COMPANION',fontname='helv',fontsize=10,color=(.17,.30,.35))
  p.insert_textbox(fitz.Rect(45,135,r.width-45,r.height-70),f'Private author-planning page omitted\n\nPhysical source page {i+1} is not distributed in this public companion.\n\nScientific chapters, worked practice solutions, figures and their source-page destinations retain the original physical numbering. The complete unmodified author PDF is supplied separately in the private-reference folder of the complete author package.\n\nThis derivative is not a new edition of the scientific text.',fontname='helv',fontsize=13,lineheight=1.65,color=(.17,.26,.30))
  p.insert_text((45,r.height-35),f'Source physical page {i+1} / {len(original)}',fontsize=9)
# Do not bring links to private sections into the public outline.
toc=[row for row in original.get_toc() if row[2] not in omitted]
if toc:
 try:doc.set_toc(toc)
 except ValueError:pass
try:doc.set_page_labels(original.get_page_labels())
except Exception:pass
doc.set_metadata({'title':'Scientific Modelling, AI & Research Software Engineering — V6.17 public companion','author':'Chilperic Armel Foko Kuate','subject':'Public derivative: private author-planning physical pages 6–9 withheld. Other page numbering preserved.','creator':'FokoLab 79.2 publication preparation'})
doc.save(out,garbage=4,deflate=True);doc.close()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
p=site/'materials/book-manifest.json';b=json.loads(p.read_text());b.update(sourceSha256=sha(src),sha256=sha(out),bytes=out.stat().st_size,pdf='materials/'+out.name,edition='V6.17 · Public companion',publication={'omittedPhysicalPages':sorted(omitted),'unmodifiedAuthorPDFPublic':False,'scientificChaptersRetained':True},editionNotice='Public derivative of the V6.17 Design Revision. Private author-planning physical pages 6–9 are withheld; all scientific source-page destinations retain their original physical numbering.',materialNotice='The full author PDF is available only in private-reference in the complete author package. Book references to notebooks do not imply that those notebook files are distributed in this website.')
b['frontMatter']=[x for x in b.get('frontMatter',[]) if x.get('pdfPage',x.get('page')) not in omitted]
p.write_text(json.dumps(b,ensure_ascii=False,indent=2))
(site/'src/research/book-data.js').write_text('(function(r){const data='+json.dumps(b,ensure_ascii=False,separators=(',',':'))+';if(typeof module!=="undefined"&&module.exports)module.exports=data;if(r)r.FokoBook=data;})(typeof window!=="undefined"?window:globalThis);')
p=site/'materials/book-search.json';idx=json.loads(p.read_text());idx['sha256']=b['sha256'];idx['sourceSha256']=b['sourceSha256'];idx['edition']=b['edition']
for page in idx['pages']:
 if page['page'] in omitted:page['text']='Private author-planning page omitted from the public companion.'
p.write_text(json.dumps(idx,ensure_ascii=False,separators=(',',':')))
record={'schema':'foko.publication/1','version':'79.2.0','book':b['pdf'],'sourceVersion':'V6.17 Design Revision','sourceSHA256':b['sourceSha256'],'publicSHA256':b['sha256'],'publicPageCount':439,'omittedPhysicalPages':sorted(omitted),'chapters':len(b['chapters']),'sections':sum(len(c['sections']) for c in b['chapters']),'workedPracticeDestinations':sum(len(c.get('practices',[])) for c in b['chapters']),'appendices':len(b['appendices']),'notebooksDistributed':False,'fullAuthorPDFPublic':False}
(site/'materials/publication-status.json').write_text(json.dumps(record,indent=2))
(site/'src/upgrade/publication.js').write_text('globalThis.FokoPublication='+json.dumps(record)+';')
for p in site.rglob('*.html'):
 s=p.read_text();s=s.replace('Scientific_Mastery_V6_17_Design_Revision.pdf',out.name).replace('The unmodified source PDF','The public companion PDF').replace('unmodified source PDF','public companion PDF').replace('unmodified supplied PDF','public companion PDF').replace('unmodified PDF','public companion PDF')
 prefix='../'*len(p.parent.relative_to(site).parts)
 if 'src/upgrade/common.js' in s and 'src/upgrade/publication.js' not in s:s=s.replace('<script src="'+prefix+'src/upgrade/common.js">','<script src="'+prefix+'src/upgrade/publication.js"></script><script src="'+prefix+'src/upgrade/common.js">')
 p.write_text(s)
(root/'evidence/publication.json').write_text(json.dumps(record,indent=2));print(json.dumps(record,indent=2))
