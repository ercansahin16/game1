#!/usr/bin/env python3
"""Sınav dosyalarını (sinav_uret.py çıktısı) icerik.json'daki 'exams' listesine işler.
Kullanım: python3 icerik_birlestir.py icerik.json sinav_klasoru [cikti.json]
- Var olan sınavın (başlığı aynıysa) id'si korunur; yeni sınava rastgele 20 karakterlik id verilir.
- Çıktı verilmezse icerik.json üzerine yazılır. generatedAt güncellenir.
- Kelime/ders/kitap listelerine dokunmaz."""
import sys, json, re, os, glob, random, string, datetime
js, folder = sys.argv[1], sys.argv[2]; out = sys.argv[3] if len(sys.argv) > 3 else js
d = json.load(open(js, encoding='utf-8'))
les_by_no = {int(re.sub(r'\D', '', l['name'])): l for l in d['lessons']}
old = {e['title']: e for e in d['exams']}
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z'); new = []
for f in sorted(glob.glob(os.path.join(folder, 'Ders-*_Sınav-*_sorular.json'))):
    m = re.search(r'Ders-(\d+)_Sınav-(\d+)', os.path.basename(f)); n, k = int(m.group(1)), int(m.group(2))
    title = f'Ders-{n}/Sınav-{k}'; les = les_by_no[n]; o = old.get(title)
    new.append({'id': o['id'] if o else ''.join(random.choices(string.ascii_letters + string.digits, k=20)), 'title': title,
                'lessonId': les['id'], 'bookId': les['bookId'], 'questions': json.load(open(f, encoding='utf-8')),
                'createdAt': o['createdAt'] if o else now, 'updatedAt': now})
d['exams'] = new; d['generatedAt'] = now
json.dump(d, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(new), 'sınav yazıldı ->', out)
