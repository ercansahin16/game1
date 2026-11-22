#!/usr/bin/env python3
"""Kılavuzu (kaynak/*.html parçaları) tek PDF'e çevirir.
Gerekli: pip install playwright && playwright install chromium   (veya sistemde Chrome)
Kullanım (depo kökünden):  python3 dokuman/pdf_uret.py
Çıktı: dokuman/SaadetYolu_Proje_Kilavuzu.pdf
Sürüm günlüğü tablosu, git geçmişindeki "(vX.Y.Z)" commit'lerinden otomatik üretilir."""
import glob, os, re, subprocess, html
kok = os.path.dirname(os.path.abspath(__file__)); depo = os.path.dirname(kok)
parts = sorted(glob.glob(os.path.join(kok, 'kaynak', '*.html')))
doc = ''.join(open(p, encoding='utf-8').read() for p in parts)
log = subprocess.run(['git', '-C', depo, 'log', '--format=%ad|%s', '--date=short'], capture_output=True, text=True).stdout.splitlines()
rows = []
for l in log:
    d, _, s = l.partition('|')
    m = re.search(r'\(v(\d+\.\d+\.\d+)\)', s)
    if m: rows.append((d, m.group(1), re.sub(r'\s*\(v\d+\.\d+\.\d+\)', '', s)))
tab = '<table><tr><th>Tarih</th><th>Sürüm</th><th>Değişiklik</th></tr>' + ''.join(
    f'<tr><td>{d}</td><td>{v}</td><td>{html.escape(s)}</td></tr>' for d, v, s in rows) + '</table>'
doc = doc.replace('<!--VERSION_TABLE-->', tab)
def uret(doc, out):
    tmp = os.path.join(kok, '_kilavuz_tmp.html'); open(tmp, 'w', encoding='utf-8').write(doc)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        exe = '/usr/bin/google-chrome'
        b = p.chromium.launch(executable_path=exe, args=['--no-sandbox']) if os.path.exists(exe) else p.chromium.launch()
        pg = b.new_page(); pg.goto('file://' + tmp)
        pg.pdf(path=out, format='A4', print_background=True, display_header_footer=True,
               header_template='<div style="font-size:7pt;color:#888;width:100%;text-align:center;font-family:sans-serif">SaadetYolu Kur\'an Akademisi — Proje Devir Teslim ve Kullanım Kılavuzu</div>',
               footer_template='<div style="font-size:8pt;color:#666;width:100%;text-align:center;font-family:sans-serif"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
               margin={'top': '20mm', 'bottom': '18mm', 'left': '17mm', 'right': '17mm'})
        b.close()
    os.remove(tmp)
out = os.path.join(kok, 'SaadetYolu_Proje_Kilavuzu.pdf')
# 1. geçiş: içindekiler sayfa numaraları boş; 2. geçiş: başlıkların bulunduğu sayfalar yazılır
uret(re.sub(r'__PG\d+__', '', doc), out)
toc = re.findall(r'<span class="n">(\d+)</span>([^<]*)<span class="pg">', doc)
npages = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', out], capture_output=True, text=True).stdout).group(1))
txt = [subprocess.run(['pdftotext', '-f', str(i), '-l', str(i), '-layout', out, '-'], capture_output=True, text=True).stdout for i in range(1, npages + 1)]
for n, title in toc:
    key = f'{n}. {title.strip()[:20]}'
    pg = next((i + 1 for i in range(2, npages) if re.search(r'^\s*' + re.escape(key), txt[i], re.M)), '')
    doc = doc.replace(f'__PG{n}__', str(pg))
uret(doc, out)
print('Yazıldı:', out)
