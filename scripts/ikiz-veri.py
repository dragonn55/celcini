# -*- coding: utf-8 -*-
"""Fabrika İkizi verisi: Fabrika Motoru'nun ÖRNEKLİ çalışma kitabından (kurgusal tesis) hat, iş merkezi, mamul, rota
(standart süre), 20 iş günlük MPS planı, net talep, dosyadaki iş merkezi yük oranları ve SİMÜLASYON senaryolarını okuyup
uzay/ikiz/js/veri.js'e (ES modülü) yazar. Excel dosyası repoda durmaz; dosya değişince yeniden çalıştırılır:
  pip install openpyxl
  python3 scripts/ikiz-veri.py <FABRICAKIT_MOTOR_ORNEKLI.xlsx> [uzay/ikiz/js/veri.js]
Önbellekteki değerler okunur (dosya Excel'de hesaplanıp kaydedilmiş olmalı)."""
import sys, json, datetime
import openpyxl

xlsx = sys.argv[1]
cikti = sys.argv[2] if len(sys.argv) > 2 else "uzay/ikiz/js/veri.js"
wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)

def satirlar(ad, r1, r2, c1, c2):
    ws = wb[ad]
    return list(ws.iter_rows(min_row=r1, max_row=r2, min_col=c1, max_col=c2, values_only=True))

def tarih(v):
    if isinstance(v, datetime.datetime): return v.date().isoformat()
    if isinstance(v, datetime.date): return v.isoformat()
    return None

def sayi(v, vars=0.0):
    return float(v) if isinstance(v, (int, float)) else vars

# --- HAT (6-8) ve iş merkezleri (13-23)
hatlar = []
for r in satirlar("HAT", 6, 9, 1, 13):
    if not r[0]: continue
    hatlar.append({"kod": r[0], "ad": r[1], "aciklama": r[2], "v1": sayi(r[3]), "v2": sayi(r[4]), "v3": sayi(r[5])})
im = []
for r in satirlar("HAT", 13, 40, 1, 14):
    if not r[0]: continue
    im.append({"kod": r[0], "ad": r[1], "hat": r[2], "proses": r[3], "istasyon": int(sayi(r[4], 1)),
               "operator": sayi(r[6], 1), "fason": (r[7] == "Evet"), "fason_dk": sayi(r[8]), "verim": sayi(r[12], 0.85),
               "kapasite_dk": sayi(r[13])})

# --- MAMUL (6-25)
mamuller = []
for r in satirlar("MAMUL", 6, 60, 1, 12):
    if not r[0]: continue
    mamuller.append({"kod": r[0], "ad": r[1], "musteri": r[2], "musteri_adi": r[10], "hat": r[3], "lot": int(sayi(r[5], 1)),
                     "acilis_stok": int(sayi(r[7]))})

# --- STD_SÜRE (6-80): mamul × iş merkezi süre (dk/adet), hazırlık (dk/gün)
rota = {}
for r in satirlar("STD_SÜRE", 6, 400, 1, 4):
    if not r[0] or not r[1]: continue
    rota.setdefault(r[0], []).append({"im": r[1], "dk": sayi(r[2]), "hazirlik": sayi(r[3])})

# --- MPS: plan günleri (satır 23, KAPASİTE J23:AC23 tarihler) ve G01..G20 (MPS satır 25 başlıkları)
bas = satirlar("MPS", 25, 25, 1, 108)[0]
g_sutun = {}
for i, v in enumerate(bas):
    if isinstance(v, str) and len(v) == 3 and v[0] == "G" and v[1:].isdigit(): g_sutun.setdefault(v, i)
assert len(g_sutun) >= 20, g_sutun
mps = {}
for r in satirlar("MPS", 26, 80, 1, 108):
    if not r[1]: continue
    mps[r[1]] = [sayi(r[g_sutun["G%02d" % g]]) for g in range(1, 21)]
# Sevk: mamul başına "Net Talep (20 iş günü)" (MPS, S sütunu); model bunu 20 güne eşit dağıtır.
talep20 = {}
for r in satirlar("MPS", 26, 80, 1, 24):
    if not r[1]: continue
    talep20[r[1]] = sayi(r[18])  # Net Talep (20 iş günü) sütunu (S)

# --- KAPASİTE: tarihler (satır 23, sütun J..AC) ve iş merkezi × gün yük oranı (26-36)
tarih_satiri = satirlar("KAPASİTE", 23, 23, 10, 29)[0]
gunler = [tarih(v) for v in tarih_satiri]
assert all(gunler) and len(gunler) == 20, gunler
yuk = {}
for r in satirlar("KAPASİTE", 26, 60, 1, 29):
    if not r[1]: continue
    yuk[r[1]] = [round(sayi(r[9 + g]), 4) for g in range(20)]

# --- RAF: bölge sayıları (depo çizimi için)
raflar = {}
for r in satirlar("RAF", 6, 35, 1, 5):
    if not r[0]: continue
    raflar.setdefault(r[1], 0); raflar[r[1]] += 1

# --- SİMÜLASYON: senaryo başlıkları ve değişkenler (7-14)
sen = satirlar("SİMÜLASYON", 7, 14, 2, 6)
senaryolar = []
for k in range(1, 5):
    senaryolar.append({"ad": sen[0][k], "talep": sayi(sen[1][k]), "kapasite": sayi(sen[2][k]), "tedarik_gun": sayi(sen[3][k]),
                       "ss_gun": sayi(sen[4][k])})

veri = {"tesis": "Örnek Isıtma-Soğutma Yan Sanayi Tesisi", "bugun": gunler[0], "gunler": gunler, "hatlar": hatlar,
        "is_merkezleri": im, "mamuller": mamuller, "rota": rota, "mps": mps, "talep20": talep20, "yuk": yuk,
        "raf_bolge": raflar, "senaryolar": senaryolar}
with open(cikti, "w", encoding="utf-8") as f:
    f.write("/* Fabrika İkizi verisi — scripts/ikiz-veri.py üretir, elle düzenlenmez. Kaynak: Fabrika Motoru'nun örnekli dosyası\n"
            "   (kurgusal tesis; gerçek firma verisi değildir). */\n")
    f.write("export const VERI = " + json.dumps(veri, ensure_ascii=False, separators=(",", ":")) + ";\n")
print("hat", len(hatlar), "iş merkezi", len(im), "mamul", len(mamuller), "rota satırı", sum(len(v) for v in rota.values()),
      "mps", len(mps), "yük", len(yuk), "gün", len(gunler), "raf bölgesi", raflar, "senaryo", [s["ad"] for s in senaryolar])
