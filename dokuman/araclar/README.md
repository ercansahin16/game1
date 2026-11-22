# İçerik araçları

Üç küçük Python betiği (Python 3 + `pip install openpyxl`). Ayrıntı: `SaadetYolu_Proje_Kilavuzu.pdf`, bölüm 12.

| Betik | Ne yapar |
|---|---|
| `excel_dogrula.py` | Excel (Kelimeler_v2.xlsx) ile `saadetyolu/icerik.json` kelimelerini karşılaştırır, farkları listeler. |
| `sinav_uret.py` | Excel'den tüm dersler için sınav dosyaları üretir (`Ders-NN_Sınav-K_sorular.json`). |
| `icerik_birlestir.py` | Üretilen sınavları `icerik.json` içindeki `exams` listesine işler. |

Örnek akış:
```
python3 excel_dogrula.py Kelimeler_v2.xlsx ../saadetyolu/icerik.json
python3 sinav_uret.py Kelimeler_v2.xlsx /tmp/sinavlar
python3 icerik_birlestir.py ../saadetyolu/icerik.json /tmp/sinavlar
```
Kelime/ders/kitap listesi değişecekse `icerik.json` içindeki `words`, `lessons`, `books` dizileri Excel'e göre güncellenmelidir (kelime `id`'leri korunmalıdır; bölüm 12'ye bakın).
