#!/usr/bin/env python3
"""Excel'den tüm dersler için sınav dosyaları (Ders-NN_Sınav-K_sorular.json) üretir.
Kullanım: python3 sinav_uret.py Kelimeler_v2.xlsx cikti_klasoru
Kurallar: ders başına ceil(kelime/12) sınav; her kelime tam bir kez sorulur; 3 çeldirici
(aynı ders önce, sonra yakın dersler); doğru şıkka eş anlamlı/benzer çeldirici girmez.
Sabit tohum (2026) olduğu için aynı Excel her zaman aynı sınavları verir."""
import sys, re, json, random, math, os, collections, unicodedata, openpyxl
xl, outdir = sys.argv[1], sys.argv[2]; os.makedirs(outdir, exist_ok=True)
ws = openpyxl.load_workbook(xl, data_only=True).active
X = [(int(r[0]), str(r[1]).strip(), str(r[2]).strip()) for r in ws.iter_rows(min_row=4, values_only=True) if r[0] is not None and r[1]]
def mt(t):
    t = unicodedata.normalize('NFKC', t).replace('’', "'").replace('‘', "'").replace('`', "'").lower().replace('i̇', 'i')
    t = re.sub(r'\s*([,;])\s*', r'\1 ', t); return re.sub(r'\s+', ' ', t).strip(' ,;.')
STOP = {'için', 'gibi', 'olan', 'bir', 'ile', 'kadar', 'daha', 'çok'}
cl = lambda m: re.sub(r'\s+', ' ', m).strip()
ck = lambda t: re.sub(r'[-\s]', '', mt(re.sub(r'\([^)]*\)', '', t)))
toks = lambda t: {w[:5] for w in re.findall(r"[a-zçğıöşü]+", mt(t)) if len(w) >= 4 and w not in STOP}
segs = lambda m: {ck(p) for p in re.split(r'[,;]', m) if ck(p)} | {ck(m)}
byl = collections.defaultdict(list)
for les, a, m in X: byl[les].append((a, cl(m)))
allm = [(l, a, cl(m)) for l, a, m in X]
rnd = random.Random(2026); total = 0
for les in sorted(byl):
    ws_ = byl[les][:]; rnd.shuffle(ws_)
    ne = max(1, math.ceil(len(ws_) / 12)); per = math.ceil(len(ws_) / ne)
    for k in range(ne):
        chunk = ws_[k * per:(k + 1) * per]
        if not chunk: continue
        seq = [i % 4 for i in range(len(chunk))]; rnd.shuffle(seq); qs = []
        for (a, m), p in zip(chunk, seq):
            bad = segs(m) | set().union(*[segs(mm) for aa, mm in byl[les] if aa == a]); tc = toks(m)
            pool = list(byl[les]) + [(aa, mm) for l, aa, mm in allm if abs(l - les) <= 3 and l != les] + [(aa, mm) for l, aa, mm in allm if abs(l - les) > 3]
            seen = {ck(m)}; ds = []
            for aa, mm in pool:
                if len(ds) == 3: break
                if aa == a: continue
                c = ck(mm)
                if not c or c in seen or segs(mm) & bad or toks(mm) & tc or any(toks(mm) & toks(x) for x in ds): continue
                seen.add(c); ds.append(mm)
            assert len(ds) == 3, (les, a)
            o = ds[:]; o.insert(p, m)
            qs.append({"question": "Aşağıdaki Arapça kelimenin anlamı hangi seçenekte doğru verilmiştir?\n" + a, "options": o, "correct": p})
        json.dump(qs, open(f"{outdir}/Ders-{les:02d}_Sınav-{k + 1}_sorular.json", 'w', encoding='utf-8'), ensure_ascii=False, indent=1); total += len(qs)
print('Üretilen soru:', total)
