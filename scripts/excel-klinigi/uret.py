"""Excel Kliniği'nin 43 ücretsiz dosyasını yeniden üretir → dosyalar/excel-klinigi/ (ya da verilen klasör).

Kullanım: python3 scripts/excel-klinigi/uret.py [çıktı_klasörü]

Betikler 5 Ekim 2026 sohbetinde yazıldı; buradakiler son hâlleri. Üç değişiklik var:
- örnek kişi ve firma adları "Müşteri Alfa, Beta…" biçiminde
- "yapay zeka" şapkasız
- RİTİM'in gün adları ve NÖBET'in tarih başlıkları TEXT yerine yerelden bağımsız formülle

Her betik kendi örnek verisini hesaplatıp doğrular; bir doğrulama tutmazsa üretim durur.
Örnek veriler ve doğrulamalar 4 Ekim 2026'ya göredir; tarih libfaketime ile o güne sabitlenir.
Gerekenler:
- openpyxl
- LibreOffice
- recalc.py: RECALC ortam değişkeni; varsayılan Claude'un xlsx becerisindeki betik
- libfaketime (pip install libfaketime)
Derlemenin parçası değildir.
"""
import glob
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

B = pathlib.Path(__file__).resolve().parent
HEDEF = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else B.parents[1] / "dosyalar" / "excel-klinigi"
TARIH = "2026-10-04 22:00:00"

if "FAKETIME" not in os.environ:
    import libfaketime
    so = glob.glob(os.path.join(os.path.dirname(libfaketime.__file__), "**", "libfaketime.so.1"), recursive=True)
    if not so:
        sys.exit("libfaketime.so.1 bulunamadı (pip install libfaketime)")
    os.environ.update(LD_PRELOAD=so[0], FAKETIME="@" + TARIH, TZ="UTC", DONT_FAKE_MONOTONIC="1")
    os.execv(sys.executable, [sys.executable] + sys.argv)

RECALC = os.environ.setdefault("RECALC", "/mnt/skills/public/xlsx/scripts/recalc.py")
is_klasoru = pathlib.Path(tempfile.mkdtemp(prefix="klinik-"))
cikti = is_klasoru / "cikti"
cikti.mkdir()
os.environ["KLINIK_CIKTI"] = str(cikti)


def calistir(*arg):
    p = subprocess.run([sys.executable, *map(str, arg)], cwd=is_klasoru, capture_output=True, text=True)
    print(p.stdout.strip())
    if p.returncode:
        sys.exit(f"HATA: {' '.join(map(str, arg))}\n{p.stderr.strip()}")
    return p.stdout


# 1) Tek dosyalık betikler: NABIZ, TANSİYON, CHECK-UP (çıktı çalışma klasörüne, sonra yeniden hesap ve doğrulama)
for ad in ("nabiz", "tansiyon", "checkup"):
    calistir(B / f"{ad}.py")
for f in sorted(is_klasoru.glob("ExcelKlinigi_*.xlsx")):
    calistir(RECALC, f.name, "300")
    shutil.move(str(f), cikti / f.name)
shutil.copy(cikti / "ExcelKlinigi_CHECKUP_Esnaf_Isletme_Defteri.xlsx", is_klasoru)
if "TÜMÜ OK" not in calistir(B / "checkup_dogrula.py"):
    sys.exit("HATA: CHECK-UP Panel rakamları örnek veriden bağımsız hesapla tutmuyor")
# 2) Ortak altyapılı 40 dosya (lib.py, lib2.py): betik betik, her dosya kaydedilip yeniden hesaplanır ve doğrulanır
for ad in ("p1", "p2", "p3", "p4", "a1", "a2", "b1", "b2", "b3", "b4"):
    calistir(B / f"{ad}.py")

dosyalar = sorted(cikti.glob("ExcelKlinigi_*.xlsx"))
if len(dosyalar) != 43:
    sys.exit(f"HATA: 43 dosya bekleniyordu, {len(dosyalar)} çıktı")
HEDEF.mkdir(parents=True, exist_ok=True)
for f in dosyalar:
    shutil.copy2(f, HEDEF / f.name)
shutil.rmtree(is_klasoru)
print(f"{len(dosyalar)} dosya → {HEDEF}")
