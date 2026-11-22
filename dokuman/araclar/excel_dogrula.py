#!/usr/bin/env python3
"""Excel (Kelimeler_v2.xlsx) ile icerik.json'u karşılaştırır. Kullanım:
   python3 excel_dogrula.py Kelimeler_v2.xlsx ../../saadetyolu/icerik.json
Excel: 4. satırdan itibaren  A=ders no, B=Arapça, C=Türkçe anlam.  (Excel %100 doğru kabul edilir.)"""
import sys, json, re, openpyxl, collections
xl, js = sys.argv[1], sys.argv[2]
d = json.load(open(js, encoding='utf-8'))
ws = openpyxl.load_workbook(xl, data_only=True).active
X = [(int(r[0]), str(r[1]).strip(), re.sub(r'\s+', ' ', str(r[2]).strip())) for r in ws.iter_rows(min_row=4, values_only=True) if r[0] is not None and r[1]]
no = {l['id']: int(re.sub(r'\D', '', l['name'])) for l in d['lessons']}
J = collections.Counter((no.get(w['lessonId']), w['arabic'].strip(), re.sub(r'\s+', ' ', w['turkish'].strip())) for w in d['words'])
E_ = collections.Counter(X)
eksik = E_ - J; fazla = J - E_
print(f'Excel: {len(X)} kelime | icerik.json: {len(d["words"])} kelime')
print('Excel\'de olup JSON\'da olmayan/farklı:', sum(eksik.values()))
for k in sorted(eksik): print('  ', k)
print('JSON\'da olup Excel\'de olmayan/farklı:', sum(fazla.values()))
for k in sorted(fazla, key=str): print('  ', k)
print('SONUÇ:', 'TAMAMEN UYUMLU ✔' if not eksik and not fazla else 'FARK VAR ✘')
