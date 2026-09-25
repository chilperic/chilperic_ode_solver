from pathlib import Path
import fitz,json,hashlib
R=Path(__file__).resolve().parents[1];source=fitz.open(R/'private-reference/Scientific_Mastery_V6_17_Design_Revision.pdf');public=fitz.open(R/'site/materials/Scientific_Mastery_V6_17_Public_Companion.pdf');checks=[]
assert len(source)==len(public)==439
for i in range(439):
 if i+1 in [6,7,8,9]:
  assert source[i].get_text()!=public[i].get_text();assert 'omitted' in public[i].get_text().lower()
 else:assert source[i].get_text()==public[i].get_text(),f'Unexpected text change on page {i+1}'
checks.append({'name':'Physical page positions retained and text equality outside four omitted pages','status':'passed','unchangedScientificAndOtherPublicPages':435})
for n in [1,28,71,401]:
 a=source[n-1].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);b=public[n-1].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);assert a.samples==b.samples,f'Visual difference page {n}'
checks.append({'name':'Representative unchanged page raster comparisons','status':'passed','physicalPages':[1,28,71,401]})
public[5].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False).save(R/'evidence/screenshots/12-publication-omission.png')
(R/'evidence/publication-check.json').write_text(json.dumps({'checks':checks,'scope':'Full text equality outside omitted pages; representative visual equality, not a new scientific audit of the book.'},indent=2));print('Publication checks passed')
