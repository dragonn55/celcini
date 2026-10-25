#!/usr/bin/env python3
"""Celcini site derleyicisi (yalnızca Python standart kütüphanesi).

    python3 scripts/derle.py              üretim: depo köküne yazar (Vercel bunu yayınlar)
    python3 scripts/derle.py --onizleme   önizleme: _onizleme/ klasörüne yazar, örnek kayıtlar "ÖRNEK" etiketiyle görünür

Üretimde "ornek": true olan kayıtlar ve shopier_url'si boş olup "yakinda": true olmayan kayıtlar hiçbir yerde görünmez.
Tüm ürünler data/urunler.json'dan gelir. Bağlantılar (Shopier mağaza, form, e-posta, Instagram)
tarayıcıda assets/js/config.js'den uygulanır.
Fabricakit'in dokuz odası fabricakit/js/odalar.js'den okunur (ana sayfadaki oda şeridi).
/fabricakit/ sayfasının yalnızca kabuğu burada üretilir; simülatörün kendisi fabricakit/js/ altındadır.
Rehberli Excel dersleri (REHBERLER; ilki Datakit) data/<urun>/'dan üretilir: açılış ve ders sayfaları, herkese açık
<taban>/veri/ ve kilitli dersler için api/_dersler/<urun>/ (yalnızca api/ders.js okur).
Üretim Arşivi data/arsiv.json'dan üretilir: /arsiv/ dizini ve kategori başına /arsiv/<kategori>/ sayfası.
"""
import datetime
import hashlib
import html
import json
import re
import shutil
import struct
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ikonlar import ikon  # noqa: E402

KOK = Path(__file__).resolve().parent.parent
# Sitenin kök adresi: canonical, og:url, sitemap ve robots buradan üretilir. Alan adı henüz alınmadı; alınıp Vercel'e
# bağlanınca "https://celcini.com" yapıp yeniden derle (robots.txt de buradan yazılır).
SITE = "https://celcini.vercel.app"
ONIZLEME = "--onizleme" in sys.argv
CIKTI = KOK / "_onizleme" if ONIZLEME else KOK
BUGUN = datetime.date.today().isoformat()

SLOGAN = "İşini kurgula, ajanı sorgula."
FK_ALT = ("Tarayıcıda fabrika simülasyonu. Yapay zeka genel müdür Ajan GM seni değerlendirir, "
          "sen de onu sorgularsın.")
ALT_BILGI = "Tarayıcıda fabrika simülasyonu ve derin Excel havuzu. İstanbul, 2026."
# Sayfa açıklamalarının sonundaki site cümlesi: önce Fabricakit
SITE_CUMLESI = "Celcini: Fabricakit fabrika simülasyonu ve Excel dosyaları."
FORMUL_TESTI = ("Her dosya havuza girmeden önce yeniden hesaplanır; "
                "sıfır formül hatasıyla geçmeyen dosya satışa çıkmaz.")

RAFLAR = [
    {"slug": "fabrika", "ad": "Fabrika Dosyaları", "ikon": "fabrika",
     "aciklama": "Fabrika programları (MRP, vardiya, stok, ithalat maliyet)"},
    {"slug": "excel-klinigi", "ad": "Excel Kliniği", "ikon": "klinik",
     "aciklama": "Veri analizi motorları (stok, müşteri, fiyat, iade, tahmin, sepet) ve ücretsiz iş şablonları",
     "ucretli_baslik": "Analiz motorları", "etiket_esigi": 2},
    {"slug": "datakit", "ad": "Datakit", "ikon": "grafik",
     "aciklama": "Veri analizi süreçleri (satış analizi, ölü stok, talep tahmini)"},
]
RAF = {r["slug"]: r for r in RAFLAR}
# Rehberli Excel dersleri: kaynak data/<urun>/ (dersler.json + sayfalar/), sayfalar <taban>/ ve <taban>/<id>/.
# Raf sayfası yerine açılış sayfası çıkar; "urun_slug" dosyaların Shopier ürünü (data/urunler.json).
REHBERLER = [
    {"urun": "datakit", "raf": "datakit", "taban": "/datakit/", "urun_slug": "satis-analizi"},
    {"urun": "motor", "raf": "fabrika", "taban": "/motor/", "urun_slug": "fabrika-motoru"},
]


def rehber_raf_yerine(rh):
    """Rehberin açılış sayfası rafın kendi adresindeyse raf sayfası yerine geçer (Datakit); yoksa raf sayfası kalır (Motor)."""
    return rh["taban"] == f"/{rh['raf']}/"
# Menü: ("/yol/", "Ad") ya da ("Ad", [alt öğeler]) — alt menü
MENU = [("/fabricakit/", "Fabricakit"),
        ("Dosyalar", [(f"/{r['slug']}/", r["ad"]) for r in RAFLAR]),
        ("/arsiv/", "Arşiv"), ("/uzay/", "Uzay"), ("/hakkinda/", "Hakkında")]
GEZEGENLER = "/fabricakit/img/gezegenler.svg"

SSS = [
    ("Dosyayı nasıl satın alırım?",
     "Ürün sayfasındaki “Shopier'de al” butonu sizi Shopier'deki ürün sayfasına götürür. "
     "Ödeme ve dosyanın teslimi Shopier üzerinden yapılır."),
    ("Kurulum ya da abonelik gerekir mi?",
     "Hayır. Dosyayı bir kez alırsınız, Excel'de açar ve kullanırsınız. Dosya için ek program, eklenti ya da abonelik gerekmez."),
    ("Verilerim bir yere gönderiliyor mu?",
     "Hayır. Dosya kendi bilgisayarınızda çalışır; girdiğiniz veriler dosyanın içinde kalır, Celcini'ye ya da başka bir yere gönderilmez."),
    ("Hangi Excel sürümü gerekir?",
     "Her ürün sayfasının “Teknik bilgi” bölümünde yazar. Örneğin PLANLA, Excel 2016 ve sonrası sürümlerde çalışır."),
    ("Dosyalarda makro var mı?",
     "Ürün sayfasında belirtilir. Makrosuz dosyalar makro izni istemeden açılır."),
    ("Formül testi ne demek?", FORMUL_TESTI),
    ("Google E-Tablolar ya da LibreOffice'te çalışır mı?",
     "Dosyalar Microsoft Excel için hazırlanır ve testler Excel'de yapılır. Başka programlarda çalışması garanti edilmez."),
    ("Satın aldıktan sonra sorun yaşarsam?",
     "İletişim sayfasındaki kanallardan ya da Shopier sipariş mesajından yazın. Teslimat ve iade koşulları ayrı sayfada anlatılır."),
]

e = html.escape


# ---------------------------------------------------------------- yardımcılar
def tl(sayi):
    return f"{int(sayi):,}".replace(",", ".") + " TL"


def fiyat_var(u):
    return bool(u.get("fiyat"))


def surum(yol):
    return hashlib.md5((KOK / yol.lstrip("/")).read_bytes()).hexdigest()[:8]


def ucretsiz(u):
    """Sitede duran, ücretsiz indirilen dosya: "ucretsiz_dosya": "/dosyalar/<raf>/<dosya>.xlsx" (Shopier yok)."""
    return bool((u.get("ucretsiz_dosya") or "").strip())


def dosya_boyutu(yol):
    kb = max(1, round((KOK / yol.lstrip("/")).stat().st_size / 1024))
    return f"{kb:,} KB".replace(",", ".")


def gorunur(u):
    if ONIZLEME:
        return True
    if u.get("ornek"):
        return False
    # "yakinda": true → Shopier bağlantısı gelene kadar sayfa "Shopier'de yakında" düğmesiyle görünür
    return bool((u.get("shopier_url") or "").strip()) or bool(u.get("yakinda")) or ucretsiz(u)


def png_boyutu(yol):
    """PNG başlığından (IHDR) genişlik ve yükseklik; dosya PNG değilse None."""
    dosya = KOK / yol.lstrip("/")
    if not yol.endswith(".png") or not dosya.exists():
        return None
    bas = dosya.read_bytes()[:24]
    return struct.unpack(">II", bas[16:24]) if bas[:8] == b"\x89PNG\r\n\x1a\n" else None


def gorsel_listesi(u):
    sonuc = []
    for g in u.get("gorseller") or []:
        if isinstance(g, str):
            g = {"src": g}
        if not isinstance(g, dict) or not g.get("src"):
            continue
        o = {"src": g["src"], "alt": g.get("alt") or f"{u['ad']} ekran görüntüsü", "webp": "", "boyut": png_boyutu(g["src"])}
        webp = re.sub(r"\.png$", ".webp", g["src"])
        if webp != g["src"] and (KOK / webp.lstrip("/")).exists():  # yanında WebP varsa önce o yüklenir
            o["webp"] = webp
        sonuc.append(o)
    return sonuc


def resim(g, ek=""):
    """<picture>: WebP varsa önce o, yoksa PNG; boyut biliniyorsa width/height (sayfa zıplamaz)."""
    boyut = f' width="{g["boyut"][0]}" height="{g["boyut"][1]}"' if g["boyut"] else ""
    kaynak = f'<source type="image/webp" srcset="{e(g["webp"])}">' if g["webp"] else ""
    return f'<picture>{kaynak}<img src="{e(g["src"])}"{boyut}{ek}></picture>'


def mutlak(yol):
    return yol if yol.startswith("http") else SITE + yol


def json_ld(veri):
    metin = json.dumps(veri, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f'<script type="application/ld+json">{metin}</script>'


def tr_buyuk(metin):
    """Türkçe büyük harf: i → İ, ı → I (Python'un upper()'ı 'Jüpiter'i 'JÜPITER' yapar)."""
    return metin.replace("i", "İ").replace("ı", "I").upper()


def js_degeri(kaynak, ad):
    """fabricakit/js/odalar.js içindeki `export const AD = ...;` değerini JSON'a çevirip okur.
    Yorumları atar, tırnaksız anahtarları tırnaklar, sondaki virgülleri siler (metinlere dokunmaz)."""
    m = re.search(r"export const " + ad + r"\s*=\s*", kaynak)
    if not m:
        sys.exit(f"HATA: odalar.js içinde {ad} bulunamadı")
    i, derinlik, cikti, metinde = m.end(), 0, [], False
    while i < len(kaynak):
        c = kaynak[i]
        if metinde:
            cikti.append(c)
            if c == "\\":
                cikti.append(kaynak[i + 1])
                i += 1
            elif c == '"':
                metinde = False
        elif c == '"':
            metinde = True
            cikti.append(c)
        elif kaynak.startswith("//", i):
            i = kaynak.index("\n", i)
            continue
        elif kaynak.startswith("/*", i):
            i = kaynak.index("*/", i) + 2
            continue
        elif c.isalpha() or c == "_":
            k = re.match(r"[A-Za-z_][A-Za-z0-9_]*", kaynak[i:]).group(0)
            sonra = kaynak[i + len(k):].lstrip()
            cikti.append(f'"{k}"' if sonra.startswith(":") else k)  # tırnaksız anahtar → "anahtar"
            i += len(k)
            continue
        else:
            if c in "[{":
                derinlik += 1
            elif c in "]}":
                derinlik -= 1
                while cikti and cikti[-1].isspace():
                    cikti.pop()
                if cikti and cikti[-1] == ",":  # sondaki virgül
                    cikti.pop()
            cikti.append(c)
            if derinlik == 0 and c in "]}":
                break
        i += 1
    return json.loads("".join(cikti))


def odalari_oku():
    kaynak = (KOK / "fabricakit" / "js" / "odalar.js").read_text(encoding="utf-8")
    return js_degeri(kaynak, "FABRIKA"), js_degeri(kaynak, "ODALAR")


def tabela(oda):
    """odalar.js'deki tabela() ile aynı kural: kod adı büyük, gerçek ad küçük; kod adı boşsa yalnız gerçek ad."""
    if oda.get("kod"):
        return tr_buyuk(oda["kod"]), oda["ad"]
    return tr_buyuk(oda["ad"]), ""


def galaksi_basligi(fabrika):
    """odalar.js'deki galaksiBasligi() ile aynı kural: haritanın tek başlığı galaksi adı (kod adı boşsa fabrika adı)."""
    return tr_buyuk(f'{fabrika["kod"]} galaksisi' if fabrika.get("kod") else fabrika["ad"])


def harita_basligi(fabrika):
    """Çizimin hemen üstündeki tek başlık: küçük galaksi simgesi ve "SAMANYOLU GALAKSİSİ"; başka yazı yok."""
    simge = gezegen(fabrika["simge"], "oda-simge oda-simge-kucuk") if fabrika.get("kod") else ""
    return f'<p class="fp-baslik">{simge}<span>{e(galaksi_basligi(fabrika))}</span></p>'


def gezegen(simge, sinif="oda-simge"):
    return (f'<svg class="{sinif}" aria-hidden="true" focusable="false">'
            f'<use href="{GEZEGENLER}#{e(simge)}"/></svg>')


# ---------------------------------------------------------------- iskelet
def menu_linki(y, a, etkin):
    return f'<a href="{y}"{" aria-current=\"page\"" if y == etkin else ""}>{e(a)}</a>'


def ust_serit(etkin):
    ogeler = []
    for y, a in MENU:
        if isinstance(a, list):  # alt menü: y başlık, a öğeler
            secili = " etkin" if any(alt_y == etkin for alt_y, _ in a) else ""
            alt = "".join(f"<li>{menu_linki(alt_y, alt_a, etkin)}</li>" for alt_y, alt_a in a)
            ogeler.append(
                f'<li class="menu-grup"><button class="menu-alt-dugme{secili}" type="button" aria-expanded="false" '
                f'aria-controls="menu-dosyalar">{e(y)}{ikon("asagi")}</button>'
                f'<ul class="menu-alt" id="menu-dosyalar">{alt}</ul></li>')
        else:
            ogeler.append(f"<li>{menu_linki(y, a, etkin)}</li>")
    ogeler = "".join(ogeler)
    return f"""<header class="serit">
  <div class="kap">
    <a class="serit-logo" href="/" aria-label="Celcini ana sayfa"><img src="/assets/img/logo-tam-beyaz.png" alt="Celcini" width="105" height="52"></a>
    <button class="menu-dugme" type="button" aria-expanded="false" aria-controls="ust-menu" aria-label="Menü">{ikon("menu", "ikon ac-ikon")}{ikon("kapat", "ikon kapat-ikon")}</button>
    <nav class="menu" id="ust-menu" aria-label="Ana menü"><ul>{ogeler}</ul></nav>
  </div>
</header>"""


def alt_bilgi():
    raflar = "".join(f'<li><a href="/{r["slug"]}/">{e(r["ad"])}</a></li>' for r in RAFLAR)
    return f"""<footer class="alt-bilgi">
  <div class="kap">
    <div class="alt-marka">
      <a class="logo-rozet" href="/" aria-label="Celcini ana sayfa"><img src="/assets/img/logo-tam-beyaz.png" alt="Celcini" width="113" height="56" loading="lazy"></a>
      <p>{e(ALT_BILGI)}</p>
    </div>
    <nav aria-label="Raflar"><h2>Raflar</h2><ul>{raflar}</ul></nav>
    <nav aria-label="Bilgi"><h2>Bilgi</h2><ul>
      <li><a href="/hakkinda/">Hakkında</a></li>
      <li><a href="/iletisim/">İletişim</a></li>
      <li><a href="/sss/">SSS</a></li>
      <li><a href="/gizlilik/">Gizlilik ve KVKK</a></li>
      <li><a href="/teslimat-ve-iade/">Teslimat ve iade</a></li>
      <li><a data-link="shopier_magaza" href="#" hidden>Shopier mağazası</a></li>
      <li><a data-link="instagram" href="#" hidden>{ikon("instagram")}Instagram</a></li>
    </ul></nav>
    <p class="telif">© 2026 Celcini · İstanbul</p>
  </div>
</footer>"""


def sayfa(yol, baslik, aciklama, govde, *, etkin="", og_gorsel="/assets/img/og-cover.png",
          tur="website", ek_head="", tam_baslik=False, ek_css=(), modul="", noindex=False):
    title = baslik if tam_baslik else f"{baslik} · Celcini"
    kanonik = SITE + (yol if yol != "/404.html" else "/")
    robots = '<meta name="robots" content="noindex">' if (ONIZLEME or noindex or yol == "/404.html") else ""
    serit = ('<div class="onizleme-serit">Önizleme: örnek kayıtlar görünür, bu derleme yayınlanmaz.</div>'
             if ONIZLEME else "")
    css, js_c, js_m = surum("/assets/css/style.css"), surum("/assets/js/config.js"), surum("/assets/js/main.js")
    for c in ek_css:
        ek_head += f'\n<link rel="stylesheet" href="{c}?v={surum(c)}">'
    if modul:  # ES modülü (Fabricakit); alt modüller her açılışta yeniden doğrulanır (vercel.json)
        ek_head += f'\n<script type="module" src="{modul}?v={surum(modul)}"></script>'
    return f"""<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(aciklama)}">
<link rel="canonical" href="{kanonik}">
{robots}
<meta property="og:type" content="{tur}">
<meta property="og:site_name" content="Celcini">
<meta property="og:locale" content="tr_TR">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(aciklama)}">
<meta property="og:url" content="{kanonik}">
<meta property="og:image" content="{mutlak(og_gorsel)}">
<meta property="og:image:alt" content="Celcini">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0096C7">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/assets/css/style.css?v={css}">
<noscript><link rel="stylesheet" href="/assets/css/noscript.css"></noscript>
<script src="/assets/js/config.js?v={js_c}" defer></script>
<script src="/assets/js/main.js?v={js_m}" defer></script>
{ek_head}
</head>
<body>
<a class="atla" href="#icerik">İçeriğe geç</a>
{serit}
{ust_serit(etkin)}
<main id="icerik">
{govde}
</main>
{alt_bilgi()}
</body>
</html>
"""


# ---------------------------------------------------------------- parçalar
def etiket_html(t):
    sinif = "etiket etiket-turuncu" if t.lower() == "yapay zeka" else "etiket"
    return f'<span class="{sinif}">{e(t)}</span>'


def urun_karti(u, raf_goster=True):
    ust = []
    if raf_goster:
        ust.append(f'<span>{e(RAF[u["raf"]]["ad"])}</span>')
    if u.get("ornek"):
        ust.append('<span class="etiket etiket-ornek">ÖRNEK</span>')
    if u.get("one_cikan"):
        ust.append('<span class="etiket etiket-turuncu">Öne çıkan</span>')
    if any(t.lower() == "yapay zeka" for t in u.get("etiketler", [])):
        ust.append('<span class="etiket etiket-turuncu">yapay zeka</span>')
    etiketler = u.get("etiketler", []) + (["ücretsiz"] if ucretsiz(u) else [])  # raftaki "ücretsiz" süzgeci için
    ara = " ".join([u["ad"], u["kisa"], " ".join(etiketler)])
    if fiyat_var(u):
        alt = (f'<span class="liste-fiyat"><span class="gizli">Liste fiyatı </span>{tl(u["liste_fiyat"])}</span>'
               f'<span class="fiyat"><span class="gizli">Açılış fiyatı </span>{tl(u["fiyat"])}</span>')
    elif ucretsiz(u):
        alt = '<span class="fiyat">Ücretsiz</span>'
    else:
        durum = "Fiyatı Shopier'de" if (u.get("shopier_url") or "").strip() else "Shopier'de yakında"
        alt = f'<span class="fiyat-yok">{durum}</span>'
    return f"""<li data-urun data-ara="{e(ara)}" data-etiketler="{e("|".join(etiketler))}">
  <article class="kart urun-kart">
    <div class="ust">{"".join(ust)}</div>
    <h3><a href="/urun/{e(u["slug"])}/">{e(u["ad"])}</a></h3>
    <p>{e(u["kisa"])}</p>
    <div class="alt">{alt}</div>
  </article>
</li>"""


def raf_karti(r, sayi, ucretsiz_sayi=0):
    sayi_metin = (f"{sayi} ürün" + (f" · {ucretsiz_sayi} ücretsiz" if ucretsiz_sayi else "")) if sayi else "Raf hazırlanıyor"
    return f"""<li><a class="kart raf-kart" href="/{r["slug"]}/">
  {ikon(r["ikon"], "ikon ikon-buyuk")}
  <h3>{e(r["ad"])}</h3>
  <p>{e(r["aciklama"])}</p>
  <span class="raf-sayi">{sayi_metin}{ikon("ok")}</span>
</a></li>"""


def sss_html(liste):
    return "".join(
        f'<details><summary>{e(s)}{ikon("asagi")}</summary><div class="cevap"><p>{e(c)}</p></div></details>'
        for s, c in liste)


def yol_izi(ogeler):
    li = "".join(f'<li><a href="{y}">{e(a)}</a></li>' if y else f'<li aria-current="page">{e(a)}</li>'
                 for y, a in ogeler)
    return f'<nav class="yol" aria-label="Konum"><ol>{li}</ol></nav>'


# ---------------------------------------------------------------- sayfalar
def fabrika_plani(odalar):
    """Kahraman alandaki çizim: üstten bakılan fabrika planı. Gezegenler yalnızca kapı tabelası."""
    oda = {o["id"]: o for o in odalar}

    def tabela_simge(oda_id, x, y, boy=26):
        o = oda.get(oda_id)
        if not o or not o.get("kod"):
            return f'<rect class="fp-kapi-isaret" x="{x + boy / 2 - 5}" y="{y + boy / 2 - 2}" width="10" height="4" rx="2"/>'
        return f'<use href="{GEZEGENLER}#{e(o["simge"])}" x="{x}" y="{y}" width="{boy}" height="{boy}"/>'

    ofisler = ["satis", "arge", "planlama", "ik", "finans", "satinalma"]
    gen = 464 / 6
    duvarlar = "".join(f'<path d="M{8 + gen * i:.1f} 8V104"/>' for i in range(1, 6))
    koridor, x0 = [], 8.0
    for i in range(6):
        cx = 8 + gen * i + gen / 2
        koridor.append(f"M{x0:.1f} 104H{cx - 12:.1f}")
        x0 = cx + 12
    koridor.append(f"M{x0:.1f} 104H472")
    simgeler = "".join(tabela_simge(k, 8 + gen * i + gen / 2 - 13, 43) for i, k in enumerate(ofisler))

    def hat(y):
        makara = "".join(f"M{x} {y + 3}v14" for x in range(64, 330, 16))
        makineler = "".join(f'<rect class="fp-makine" x="{x}" y="{y - 10}" width="34" height="40" rx="4"/>'
                            for x in (82, 172, 262))
        kutular = "".join(f'<rect class="fp-kutu" x="{x}" y="{y + 4}" width="12" height="12" rx="2"/>'
                          for x in (132, 222, 308))
        return (f'<rect class="fp-hat" x="48" y="{y}" width="284" height="20" rx="10"/>'
                f'<path class="fp-makara" d="{makara}"/>{makineler}{kutular}'
                f'<path class="fp-ok" d="M338 {y + 10}h22m-6-6 6 6-6 6"/>')

    raflar = "".join(f'<rect class="fp-raf" x="56" y="{y}" width="236" height="10" rx="2"/>'
                     f'<path class="fp-raf-ic" d="{"".join(f"M{x} {y}v10" for x in range(86, 292, 30))}"/>'
                     for y in (280, 304, 328))
    return f"""<svg class="fp" viewBox="0 0 480 360" aria-hidden="true" focusable="false">
  <rect class="fp-bina" x="8" y="8" width="464" height="344" rx="14"/>
  <g class="fp-duvar">{duvarlar}<path d="{"".join(koridor)}"/>
    <path d="M8 252H178M202 252H410M434 252H472"/><path d="M372 104V160M372 184V252"/><path d="M330 252V292M330 316V352"/></g>
  {simgeler}
  {tabela_simge("uretim", 20, 116, 24)}
  {hat(146)}{hat(204)}
  {tabela_simge("kalite", 408, 164, 28)}
  {tabela_simge("depo", 178, 258, 24)}
  {raflar}
  <g class="fp-kamyon"><rect x="350" y="282" width="68" height="40" rx="4"/><path d="M418 292h18l12 12v18h-30z"/><circle cx="368" cy="326" r="5"/><circle cx="432" cy="326" r="5"/></g>
  <path class="fp-sevk" d="M472 286v44"/>
</svg>"""


def oda_seridi(odalar):
    ogeler = []
    for o in odalar:
        buyuk, kucuk = tabela(o)
        simge = gezegen(o["simge"]) if o.get("kod") else ""
        alt = f'<span class="oda-ad">{e(kucuk)}</span>' if kucuk else ""
        ogeler.append(f'<li class="oda-kart">{simge}<span class="oda-kod">{e(buyuk)}</span>{alt}</li>')
    # Telefonda şerit yatay kayar; klavyeyle de kaydırılabilsin diye odaklanabilir
    return f'<ul class="oda-serit" tabindex="0" aria-label="Dokuz oda">{"".join(ogeler)}</ul>'


def ajan_gm_portresi():
    """Kahraman alandaki büyük, kare Ajan GM portresi: WebP head'de önceden yüklenir, PNG yedek.
    Görsel gelene kadar aynı boyda koyu kart yer tutar; sayfa zıplamaz."""
    webp, png = "/assets/img/ajan-gm.webp", "/assets/img/ajan-gm.png"
    return (f'<picture class="gm-portre"><source type="image/webp" srcset="{webp}?v={surum(webp)}">'
            f'<img src="{png}?v={surum(png)}" alt="" width="1024" height="1024" fetchpriority="high" decoding="async"></picture>')


def ajan_gm_avatari():
    """Karne örneğindeki daire avatar (simülatördeki karneyle aynı görsel)."""
    webp, png = "/assets/img/ajan-gm-avatar.webp", "/assets/img/ajan-gm-avatar.png"
    return (f'<picture class="karne-gm-gorsel"><source type="image/webp" srcset="{webp}?v={surum(webp)}">'
            f'<img src="{png}?v={surum(png)}" alt="" width="512" height="512" loading="lazy" decoding="async"></picture>')


def karne_ornegi():
    """"Akşam Ajan GM karneni verir": motorun 1. gün için ürettiği gerçek karneden kesit. Veri data/karne-ornegi.json'da
    (scripts/karne-ornegi.mjs üretir, sim-test güncelliğini denetler). Sorgula düğmeleri görünür, tıklanmaz."""
    k = json.loads((KOK / "data" / "karne-ornegi.json").read_text(encoding="utf-8"))
    # Telefonda Ajan GM'in yalnızca ilk cümlesi görünür (devamı .karne-gm-devam)
    ilk, *devam = re.split(r"(?<=[.!?])\s+", k["gmYorum"], maxsplit=1)
    devam_html = f'<span class="karne-gm-devam"> {e(devam[0])}</span>' if devam else ""
    olculer = "".join(f'<div class="karne-olcu"><dt>{e(o["ad"])}</dt><dd><span class="karne-olcu-deger">{e(o["deger"])}</span>'
                      f'<span class="karne-olcu-alt">{e(o["alt"])}</span></dd></div>' for o in k["olculer"])
    sorular = "".join(f'<li class="karne-soru">{e(s)}</li>' for s in k["sorular"])
    return f"""<section class="bolum bolum-sik" id="karne" aria-labelledby="karne-baslik">
  <div class="kap karne-duzen">
    <div class="bolum-bas">
      <p class="ust-yazi karne-ust-yazi">Gün sonu karnesi</p>
      <h2 id="karne-baslik">Akşam Ajan GM karneni verir</h2>
      <p>Oynamadan önce ne alacağını gör: buradaki kesit, Fabricakit'in 1. gün için ürettiği gerçek bir karneden.</p>
    </div>
    <article class="kart karne-ornek" aria-labelledby="karne-gun">
      <div class="karne-bas">
        <p class="karne-gun"><span class="ust-yazi">Gün sonu karnesi</span><span class="karne-gun-ad" id="karne-gun">{e(k["gun"])}</span></p>
        <p class="karne-harf karne-harf-{e(k["harf"])}"><span class="gizli">Harf notu </span><span class="karne-harf-harf">{e(k["harf"])}</span><span class="karne-harf-puan">{k["puan"]} puan</span></p>
      </div>
      <dl class="karne-olculer">{olculer}</dl>
      <div class="karne-gm">
        {ajan_gm_avatari()}
        <div class="karne-gm-metin"><p class="karne-gm-ad">Ajan GM</p><p class="karne-gm-yorum">{e(ilk)}{devam_html}</p></div>
      </div>
      <div class="karne-sorgula">
        <p class="karne-sorgula-baslik">Ajanı sorgula</p>
        <ul class="karne-sorular">{sorular}</ul>
        <p class="karne-not">Örnektir, tıklanmaz. Oyunda bu sorulara Ajan GM o günün sayılarıyla cevap verir.</p>
      </div>
    </article>
    <p class="karne-senaryo">Bu karneyi veren oyun: {e(k["senaryo"])}</p>
    <div class="karne-eylem"><a class="dugme" href="/fabricakit/">Kendi karneni al{ikon("ok")}</a></div>
  </div>
</section>"""


def ana_sayfa(urunler, arsiv):
    arsiv_toplam, arsiv_konu = arsiv_sayilari(arsiv)
    sayilar = {r["slug"]: sum(1 for u in urunler if u["raf"] == r["slug"]) for r in RAFLAR}
    ucretsiz_sayilar = {r["slug"]: sum(1 for u in urunler if u["raf"] == r["slug"] and ucretsiz(u)) for r in RAFLAR}
    raf_kartlari = "".join(raf_karti(r, sayilar[r["slug"]], ucretsiz_sayilar[r["slug"]]) for r in RAFLAR)
    ucretsiz_cumlesi = "".join(f" {RAF[s]['ad']} rafında {n} dosya ücretsiz indirilir." for s, n in ucretsiz_sayilar.items() if n)
    fabrika, odalar = odalari_oku()
    # Telefonda ikinci cümle gizlenir (şerit aynı şeyi gösterir: gezegen adı büyük, gerçek ad küçük)
    tabela_cumlesi = ('<span class="tabela-cumlesi"> Kapı tabelasında gezegen adı büyük, gerçek adı küçük yazar; Ajan GM odaları gezegen adıyla anar.</span>'
                      if any(o.get("kod") for o in odalar) else "")
    # Sıra: kahraman (Ajan GM) → Dokuz oda + harita → Nasıl çalışır → Karne örneği → Dosyalar → Üretim Arşivi ve Uzay (tek bölüm).
    # Kahramanda portre ve balon önce gelir: telefonda ziyaretçiyi ilk Ajan GM karşılar; masaüstünde sağda durur.
    govde = f"""<section class="hero hero-fk" aria-labelledby="fk-baslik">
  <div class="kap">
    <div class="gm-sahne belir">
      <figure class="gm-figur">
        {ajan_gm_portresi()}
        <blockquote class="gm-balon"><p>Hoş geldiniz. Fabrika sizin, not benim.</p></blockquote>
        <figcaption><strong>Ajan GM</strong> · Yapay zeka genel müdür</figcaption>
      </figure>
    </div>
    <div class="hero-metin belir belir-2">
      <h1 id="fk-baslik">Fabricakit</h1>
      <p class="hero-slogan">{e(SLOGAN)}</p>
      <p class="hero-alt">{e(FK_ALT)}</p>
      <div class="hero-eylem">
        <a class="dugme" href="/fabricakit/">Oynamaya başla{ikon("ok")}</a>
        <a class="dugme-cizgi" href="#nasil">Nasıl çalışır</a>
      </div>
      <p class="not-satiri"><span>{ikon("tik")}1. gün ücretsiz</span><span>{ikon("tik")}Üyelik yok</span><span>{ikon("kilit")}İlerleme yalnızca tarayıcında</span></p>
    </div>
  </div>
</section>

<section class="bolum bolum-sik" aria-labelledby="odalar-baslik">
  <div class="kap">
    <div class="bolum-bas">
      <h2 id="odalar-baslik">Dokuz oda</h2>
      <p>Fabrikanın adı {e(fabrika["ad"])}; her departmanı bir oda.{tabela_cumlesi}</p>
    </div>
    <div class="odalar-harita">
      {oda_seridi(odalar)}
      <div class="kart fp-kart">{harita_basligi(fabrika)}{fabrika_plani(odalar)}</div>
    </div>
  </div>
</section>

<section class="bolum bolum-sik" id="nasil" aria-labelledby="nasil-baslik">
  <div class="kap">
    <div class="bolum-bas"><h2 id="nasil-baslik">Nasıl çalışır</h2><p>Bir oyun günü 08:00'de başlar, 18:00'de biter. Saati istediğin an durdurabilirsin.</p></div>
    <ol class="izgara izgara-3 adimlar">
      <li class="kart adim">{ikon("posta", "ikon ikon-buyuk")}<span class="no">1. Sipariş gelir</span><p>Sabah Satış-Pazarlama'dan günün siparişleri düşer: birkaç müşteri, 30 günlük ufuk. Yanında görev notu açılır.</p></li>
      <li class="kart adim">{ikon("tablo", "ikon ikon-buyuk")}<span class="no">2. Planla, satın al</span><p>Siparişi plana koy, malzeme ihtiyacını gör, eksik malzemeyi sipariş et. Tedarikçi onayını sayaç dolmadan al.</p></li>
      <li class="kart adim">{ikon("kalkan", "ikon ikon-buyuk")}<span class="no">3. Karneni al</span><p>Gün sonunda zamanında teslim, hat duruşu, depoda bağlanan para ve unutulan işler karnede. Notu Ajan GM verir.</p></li>
    </ol>
  </div>
</section>

{karne_ornegi()}

<section class="bolum bolum-sik" id="dosyalar" aria-labelledby="dosyalar-baslik">
  <div class="kap">
    <div class="bolum-bas"><p class="ust-yazi">Dosyalar</p><h2 id="dosyalar-baslik">Derin Excel havuzu</h2><p>Kurulumsuz Excel dosyaları; işe göre üç rafta.{e(ucretsiz_cumlesi)}</p></div>
    <ul class="izgara izgara-3 raf-izgara">{raf_kartlari}</ul>
  </div>
</section>

<section class="bolum bolum-sik" aria-label="Üretim Arşivi ve Uzay">
  <div class="kap kisayollar">
    <a class="kart uzay-kart" href="{ARSIV_YOLU}">
      {ikon("kitap", "ikon ikon-buyuk")}
      <span class="uzay-metin"><span class="ust-yazi">{e(ARSIV_AD)}</span><h2 id="arsiv-baslik" class="h3-boy">{arsiv_toplam} sorun ve çözümü</h2>
      <span class="uzay-alt">Belirti, kök neden ve üç adımlık çözüm; {arsiv_konu} konuda.</span></span>
      <span class="uzay-git">Arşive git{ikon("ok")}</span>
    </a>
    <a class="kart uzay-kart" href="/uzay/">
      {ikon("roket", "ikon ikon-buyuk")}
      <span class="uzay-metin"><span class="ust-yazi">Uzay</span><h2 id="uzay-baslik" class="h3-boy">Tarayıcıda çalışan araçlar</h2>
      <span class="uzay-alt">Yeni: Fabrika İkizi, örnek tesis 3D'de gün gün. Yanında ROTA 3D ve Fabricakit; sırada Ölü Stok Dedektörü var.</span></span>
      <span class="uzay-git">Uzay'a git{ikon("ok")}</span>
    </a>
  </div>
</section>"""
    org = json_ld({"@context": "https://schema.org", "@type": "Organization", "name": "Celcini",
                   "url": SITE + "/", "logo": SITE + "/assets/img/favicon-512.png", "slogan": SLOGAN})
    # Portre ilk ekranda: WebP'yi tarayıcı HTML'i ayrıştırırken istemeye başlasın
    webp = "/assets/img/ajan-gm.webp"
    on_yukle = f'\n<link rel="preload" as="image" type="image/webp" href="{webp}?v={surum(webp)}" fetchpriority="high">'
    return sayfa("/", "Fabricakit: tarayıcıda fabrika simülasyonu · Celcini",
                 f"Fabricakit: {FK_ALT[0].lower()}{FK_ALT[1:]} {SLOGAN}", govde, tam_baslik=True, ek_head=org + on_yukle)


def raf_sayfasi(r, urunler):
    # Öne çıkan ürün rafın başında; ötekiler data/urunler.json sırasıyla aynı ızgarada
    liste = sorted((u for u in urunler if u["raf"] == r["slug"]), key=lambda u: not u.get("one_cikan"))
    if liste:
        # Kalabalık rafta (RAFLAR'da "etiket_esigi") tek ürünlük etiket düğme olmaz; ürün aramada yine bulunur
        sayim = Counter(t for u in liste for t in u.get("etiketler", []))
        etiketler = sorted((t for t, n in sayim.items() if n >= r.get("etiket_esigi", 1)), key=lambda s: s.lower())
        ucretli = [u for u in liste if not ucretsiz(u)]
        bedava = [u for u in liste if ucretsiz(u)]
        iki_bolum = bool(ucretli and bedava)
        if iki_bolum:
            etiketler = ["ücretsiz"] + [t for t in etiketler if t != "ücretsiz"]
        etiket_dugmeleri = '<button class="etiket-dugme" type="button" data-etiket="" aria-pressed="true">Tümü</button>' + "".join(
            f'<button class="etiket-dugme" type="button" data-etiket="{e(t)}" aria-pressed="false">{e(t)}</button>'
            for t in etiketler)

        def izgara(us):
            return f'<ul class="izgara izgara-urun">{"".join(urun_karti(u, raf_goster=False) for u in us)}</ul>'
        if iki_bolum:
            # Üstte Shopier'deki dosyalar, altta sitede duran ücretsiz dosyalar; süzgeç ikisinde birlikte çalışır
            hepsi_yakinda = not any((u.get("shopier_url") or "").strip() for u in ucretli)
            ucretli_notu = "Shopier'de yakında satışa açılacak dosyalar." if hepsi_yakinda else "Shopier'den satılan dosyalar."
            urun_listesi = f"""<section class="raf-bolum" data-urun-bolum aria-labelledby="ucretli-baslik">
      <h2 id="ucretli-baslik" class="h3-boy">{e(r.get("ucretli_baslik", "Shopier'deki dosyalar"))} · {len(ucretli)}</h2>
      <p>{ucretli_notu}</p>
      {izgara(ucretli)}
    </section>
    <section class="raf-bolum" data-urun-bolum aria-labelledby="ucretsiz-baslik">
      <h2 id="ucretsiz-baslik" class="h3-boy">Ücretsiz dosyalar · {len(bedava)}</h2>
      <p>Dosyayı sayfasından indirin; kayıt ya da ödeme gerekmez.</p>
      {izgara(bedava)}
    </section>"""
        else:
            urun_listesi = izgara(liste)
        gizli_baslik = "" if iki_bolum else f'<h2 class="gizli">{e(r["ad"])} ürünleri</h2>\n    '
        icerik = f"""{gizli_baslik}<div class="filtre" data-filtre>
      <div class="arama">{ikon("ara")}<label class="gizli" for="ara">{e(r["ad"])} rafında ara</label><input id="ara" type="search" placeholder="Rafta ara" autocomplete="off"></div>
      <div class="etiketler" role="group" aria-label="Etikete göre süz">{etiket_dugmeleri}</div>
    </div>
    <p class="sonuc" data-sonuc aria-live="polite"></p>
    {urun_listesi}"""
    else:
        icerik = f"""<div class="kart bos-kutu">
      {ikon("kutu", "ikon ikon-buyuk")}
      <h2 class="gizli">Ürünler</h2>
      <p>Bu rafa henüz ürün eklenmedi.</p>
      <div class="eylemler">
        <a class="dugme" data-link="google_form" href="#" hidden>Yeni dosyalardan haberdar ol{ikon("ok")}</a>
        <a class="dugme-cizgi" href="/{RAFLAR[0]["slug"]}/">{e(RAFLAR[0]["ad"])} rafına bak</a>
      </div>
    </div>"""
    rehber_kutusu = ""
    for rh in REHBERLER:
        if rh["raf"] == r["slug"] and not rehber_raf_yerine(rh):
            k = rehber_kaynagi(rh)
            rehber_kutusu = f"""
    <a class="kart rh-raf-kutu" href="{rh["taban"]}">{ikon("tablo")}<span><strong>{e(k["acilis"]["baslik"])}:</strong> {e(k["acilis"]["alt_baslik"])}. {len(k["dersler"])} rehberli ders, ilk {k["ucretsiz_ders"]} ders ücretsiz.</span>{ikon("ok")}</a>"""
    govde = f"""<section class="sayfa-bas">
  <div class="kap">
    {yol_izi([("/", "Ana sayfa"), ("/#dosyalar", "Dosyalar"), (None, r["ad"])])}
    {ikon(r["ikon"], "ikon ikon-buyuk")}
    <h1>{e(r["ad"])}</h1>
    <p>{e(r["aciklama"])}</p>{rehber_kutusu}
  </div>
</section>
<section class="bolum-raf" aria-label="{e(r["ad"])} ürünleri">
  <div class="kap">
    {icerik}
  </div>
</section>"""
    return sayfa(f"/{r['slug']}/", r["ad"], f"{r['ad']}: {r['aciklama']}. {SITE_CUMLESI}", govde,
                 etkin=f"/{r['slug']}/")


def urun_sayfasi(u, urunler, arsiv_kartlari=()):
    r = RAF[u["raf"]]
    gorseller = gorsel_listesi(u)
    if gorseller:
        ilk = gorseller[0]
        kucukler = ""
        if len(gorseller) > 1:
            kucuk_ek = ' alt="" loading="lazy" decoding="async"'
            kucukler = '<ul class="galeri-kucuk">' + "".join(
                f'<li><button type="button" data-galeri-kucuk data-src="{e(g["src"])}" data-webp="{e(g["webp"])}" '
                f'data-alt="{e(g["alt"])}" data-boyut="{"x".join(map(str, g["boyut"] or ()))}" '
                f'aria-current="{"true" if i == 0 else "false"}" aria-label="Görsel {i + 1}">'
                f'{resim(g, kucuk_ek)}</button></li>'
                for i, g in enumerate(gorseller)) + "</ul>"
        ana_ek = f' alt="{e(ilk["alt"])}" data-galeri-ana'
        galeri = f'<div class="galeri"><div class="kart galeri-ana">{resim(ilk, ana_ek)}</div>{kucukler}</div>'
    else:
        galeri = (f'<div class="kart galeri-bos">{ikon("gorsel", "ikon ikon-buyuk")}'
                  f'<p>Ekran görüntüleri hazırlanıyor.</p></div>')

    rozetler = [f'<a href="/{r["slug"]}/">{e(r["ad"])}</a>']
    if u.get("ornek"):
        rozetler.append('<span class="etiket etiket-ornek">ÖRNEK</span>')
    if u.get("one_cikan"):
        rozetler.append('<span class="etiket etiket-turuncu">Öne çıkan</span>')
    dosya = (u.get("ucretsiz_dosya") or "").strip()
    if dosya:
        rozetler.append('<span class="etiket">Ücretsiz</span>')

    url = (u.get("shopier_url") or "").strip()
    if dosya:
        al = f'<a class="dugme" href="{e(dosya)}" download>Ücretsiz indir{ikon("indir")}</a>'
    elif url:
        al = (f'<a class="dugme" href="{e(url)}" rel="noopener">Shopier\'de al{ikon("ok")}</a>')
    elif u.get("yakinda"):
        # Bağlantı gelince yalnızca shopier_url doldurulur; mağaza adresi assets/js/config.js'ten uygulanır
        al = ('<div class="eylemler"><span class="dugme-pasif" aria-disabled="true">Shopier\'de yakında</span>'
              f'<a class="dugme-cizgi" data-link="shopier_magaza" href="#" hidden>Shopier mağazasına git{ikon("ok")}</a></div>')
    else:
        al = '<span class="dugme-pasif">Shopier bağlantısı henüz yok</span>'
    if dosya:
        fiyatlar = f"""<div class="fiyatlar"><span class="fiyat">Ücretsiz</span></div>
        <p class="not">Kayıt ya da ödeme gerekmez: Excel dosyası ({dosya_boyutu(dosya)}) doğrudan bilgisayarınıza iner. Dosyaya yazdıklarınız bilgisayarınızda kalır.</p>"""
    elif fiyat_var(u):
        fiyatlar = f"""<div class="fiyatlar">
          <span class="liste-fiyat"><span class="gizli">Liste fiyatı </span>{tl(u["liste_fiyat"])}</span>
          <span class="fiyat"><span class="gizli">Açılış fiyatı </span>{tl(u["fiyat"])}</span>
        </div>
        <p class="not">Açılış fiyatı. Ödeme ve teslim Shopier'de yapılır; ayrıntılar <a href="/teslimat-ve-iade/">Teslimat ve iade</a> sayfasında.</p>"""
    else:
        fiyatlar = """<p class="not">Dosya Shopier'den satılır; fiyatı satışa açılınca orada yazar. Ödeme ve teslim Shopier'de yapılır; ayrıntılar <a href="/teslimat-ve-iade/">Teslimat ve iade</a> sayfasında.</p>"""

    ozellikler = "".join(f'<li>{ikon("tik")}<span>{e(o)}</span></li>' for o in u.get("ozellikler", []))
    etiketler = "".join(etiket_html(t) for t in u.get("etiketler", []))
    makro = "Var" if u.get("makro") else "Yok (makrosuz)"
    dosya_satiri = (f"\n          <dt>Dosya</dt><dd>Excel (.xlsx), {dosya_boyutu(dosya)}</dd>"
                    "\n          <dt>Doğrulama</dt><dd>Formüller örnek veriyle LibreOffice'te hesaplatılıp denetlendi</dd>") if dosya else ""
    # Genişletilmiş ürün sayfası: "icindekiler", "adimlar", "teknik_not" ve "sss" alanları olan kayıtlarda ek bölümler
    teknik_not = f'\n        <p class="kimin">{e(u["teknik_not"])}</p>' if u.get("teknik_not") else ""
    ek_bolumler = ""
    if u.get("icindekiler") or u.get("adimlar"):
        icindekiler = "".join(f'<div><dt>{e(x["sayfa"])}</dt><dd>{e(x["aciklama"])}</dd></div>'
                              for x in u.get("icindekiler", []))
        adimlar = "".join(f"<li>{e(a)}</li>" for a in u.get("adimlar", []))
        ek_bolumler += f"""
  <section class="bolum" aria-labelledby="icinde-baslik">
    <div class="iki-sutun">
      <div class="kart">
        <h2 id="icinde-baslik" class="h3-boy">İçinde ne var</h2>
        <dl class="icindekiler">{icindekiler}</dl>
      </div>
      <div class="kart">
        <h2 class="h3-boy">Nasıl kullanılır</h2>
        <ol class="adim-listesi">{adimlar}</ol>
      </div>
    </div>
  </section>"""
    if u.get("sss"):
        ek_bolumler += f"""
  <section class="bolum" aria-labelledby="urun-sss-baslik">
    <div class="bolum-bas"><h2 id="urun-sss-baslik">Sık sorulan sorular</h2></div>
    <div class="sss">{sss_html([(x["soru"], x["cevap"]) for x in u["sss"]])}</div>
  </section>"""

    benzer = [x for x in urunler if x["raf"] == u["raf"] and x["slug"] != u["slug"]]
    if dosya:  # ücretsiz dosyanın sayfasında yine ücretsizler, ortak etiketi çok olan önce
        benzer = sorted((x for x in benzer if ucretsiz(x)),
                        key=lambda x: -len(set(x.get("etiketler", [])) & set(u.get("etiketler", []))))
    benzer = benzer[:3]
    benzer_bolum = ""
    if benzer:
        benzer_bolum = f"""<section class="bolum" aria-labelledby="benzer-baslik">
  <div class="bolum-bas"><h2 id="benzer-baslik">Aynı raftan</h2></div>
  <ul class="izgara izgara-urun">{"".join(urun_karti(x, raf_goster=False) for x in benzer)}</ul>
</section>"""

    # Üretim Arşivi'nde bu ürüne bağlanan kartlar (data/arsiv.json "ilgili")
    arsiv_bolum = ""
    if arsiv_kartlari:
        satirlar = "".join(f'<li><a href="{ARSIV_YOLU}{kat["slug"]}/#{k["slug"]}">{e(k["baslik"])}</a>'
                           f'<span>{e(kat["ad"])}</span></li>' for kat, k in arsiv_kartlari)
        arsiv_bolum = f"""<section class="bolum" aria-labelledby="arsiv-ilgili-baslik">
  <div class="bolum-bas"><h2 id="arsiv-ilgili-baslik">{e(ARSIV_AD)}'nde</h2><p>Bu dosyayla ilgili sorunlar; her biri belirti, kök neden ve çözüm adımlarıyla.</p></div>
  <ul class="kart arsiv-urun-liste">{satirlar}</ul>
</section>
  """

    # Rehberli dersi olan ürün (REHBERLER): dosyanın sayfaları sitede derslerle anlatılır
    rh = next((x for x in REHBERLER if x["urun_slug"] == u["slug"]), None)
    rehber_linki = (f'\n        <p class="not">Dosyanın ana sayfaları sitede rehberli derslerle anlatılır; ilk dersler ücretsiz.</p>'
                    f'\n        <div class="eylemler"><a class="dugme-cizgi" href="{rh["taban"]}">Dersleri aç{ikon("ok")}</a></div>') if rh else ""
    govde = f"""<div class="kap urun-sayfa">
  <div class="sayfa-bas">{yol_izi([("/", "Ana sayfa"), ("/#dosyalar", "Dosyalar"), (f"/{r['slug']}/", r["ad"]), (None, u["ad"])])}</div>
  <div class="urun-ust">
    <div class="urun-bilgi">
      <div class="ust">{"".join(rozetler)}</div>
      <h1>{e(u["ad"])}</h1>
      <p class="ozet">{e(u.get("soz") or u["kisa"])}</p>
      <p class="aciklama">{e(u["aciklama"])}</p>
      <div class="kart satin-al">
        {fiyatlar}
        {al}{rehber_linki}
      </div>
    </div>
    {galeri}
  </div>
  <section class="bolum" aria-labelledby="ne-baslik">
    <div class="iki-sutun">
      <div class="kart">
        <h2 id="ne-baslik" class="h3-boy">{"Ne işe yarar" if u.get("icindekiler") else "Ne yapar"}</h2>
        <ul class="ozellikler">{ozellikler}</ul>
      </div>
      <div class="kart">
        <h2 class="h3-boy">Teknik bilgi</h2>
        <dl class="teknik">
          <dt>Raf</dt><dd>{e(r["ad"])}</dd>
          <dt>Excel sürümü</dt><dd>{e(u["excel_surum"])}</dd>
          <dt>Makro</dt><dd>{makro}</dd>
          <dt>Sayfa sayısı</dt><dd>{int(u["sayfa_sayisi"])}</dd>{dosya_satiri}
          <dt>Kurulum</dt><dd>Gerekmez</dd>
        </dl>{teknik_not}
        <h2 class="h3-boy">Kimin için</h2>
        <p class="kimin">{e(u["kimin_icin"])}</p>
        <div class="etiketler">{etiketler}</div>
      </div>
    </div>
  </section>{ek_bolumler}
  {arsiv_bolum}{benzer_bolum}
</div>"""

    ek = ""
    if url and fiyat_var(u) and not u.get("ornek"):
        resimler = [mutlak(g["src"]) for g in gorseller] or [SITE + "/assets/img/og-cover.png"]
        ek = json_ld({
            "@context": "https://schema.org", "@type": "Product",
            "name": u["ad"], "description": u["kisa"], "sku": u["slug"], "image": resimler,
            "url": f"{SITE}/urun/{u['slug']}/", "category": r["ad"],
            "brand": {"@type": "Brand", "name": "Celcini"},
            "offers": {"@type": "Offer", "url": url, "priceCurrency": "TRY", "price": f"{u['fiyat']:.2f}",
                       "availability": "https://schema.org/InStock",
                       "itemCondition": "https://schema.org/NewCondition",
                       "seller": {"@type": "Organization", "name": "Celcini"}},
        })
    og = gorseller[0]["src"] if gorseller else "/assets/img/og-cover.png"
    baslik = f"{u['ad']} · Ücretsiz Excel" if dosya else f"{u['ad']} · {r['ad']}"
    aciklama = f"Ücretsiz Excel dosyası. {u['kisa']}" if dosya and len(u["kisa"]) <= 134 else u["kisa"]
    return sayfa(f"/urun/{u['slug']}/", baslik, aciklama, govde,
                 etkin=f"/{r['slug']}/", og_gorsel=og, tur="product", ek_head=ek)


def metin_sayfasi(yol, baslik, aciklama, ic, etkin=""):
    govde = f"""<section class="sayfa-bas"><div class="kap">
  {yol_izi([("/", "Ana sayfa"), (None, baslik)])}
  <h1>{e(baslik)}</h1>
</div></section>
<div class="kap"><div class="metin">{ic}</div></div>"""
    return sayfa(yol, baslik, aciklama, govde, etkin=etkin)


def hakkinda():
    ic = f"""<p>Celcini bir platform. Ana gövdesi <a href="/fabricakit/">Fabricakit</a>: tarayıcıda oynanan bir fabrika simülatörü. Siparişi plana koyar, malzemeyi zamanında alırsın; gün sonunda yapay zeka genel müdür Ajan GM karneni verir, sen de onu sorgularsın.</p>
<p>Celcini'yi Burak Çakır hazırlıyor. Çıkış noktası, fabrikada ve ofiste karşılaşılan gerçek işler: üretimi planlamak, stoğu izlemek, satın almayı zamanında yapmak, maliyeti hesaplamak.</p>
<h2>Fabricakit</h2>
<ul>
  <li>Tarayıcıda çalışır; kurulum ve üyelik gerekmez.</li>
  <li>1. gün ücretsizdir; 2–5. günler erişim koduyla açılır.</li>
  <li>İlerleme yalnızca senin tarayıcında saklanır; sunucuda oyuncu verisi tutulmaz.</li>
</ul>
<h2>Dosyalar: derin Excel havuzu</h2>
<p>Sahada çalışmış bir endüstri mühendisinin hazırladığı, kurulum gerektirmeyen Excel dosyaları üç rafta durur:</p>
<ul>{"".join(f'<li><a href="/{r["slug"]}/">{e(r["ad"])}</a>: {e(r["aciklama"][0].lower() + r["aciklama"][1:])}</li>' for r in RAFLAR)}</ul>
<p>Kurulum yok, abonelik yok: dosyayı alır, Excel'de açarsınız. Girdiğiniz bilgiler sizin bilgisayarınızdaki dosyada kalır. {e(FORMUL_TESTI)}</p>
<h2>Üretim Arşivi</h2>
<p><a href="{ARSIV_YOLU}">{ARSIV_AD}</a>, fabrikada sık görülen sorunları konu konu toplar: her biri için belirti, kök neden ve üç adımlık çözüm. Ücretsizdir, üyelik gerekmez.</p>
<h2>Uzay</h2>
<p><a href="/uzay/">Uzay</a>, yapay zeka araçlarının modülü: Fabricakit, ROTA 3D ve Fabrika İkizi; sırada Ölü Stok Dedektörü var.</p>
<p>İstanbul, 2026.</p>"""
    return metin_sayfasi("/hakkinda/", "Hakkında",
                         "Fabricakit, Celcini'nin ana gövdesi: tarayıcıda fabrika simülasyonu. Yanında Excel dosyaları ve yapay zeka araçları; Burak Çakır hazırlıyor.",
                         ic, etkin="/hakkinda/")


def iletisim():
    ic = f"""<p>Ürünler, siparişler ya da önerileriniz için aşağıdaki kanallardan ulaşabilirsiniz. Sipariş sorularında Shopier sipariş numaranızı yazmanız işi hızlandırır.</p>
<ul class="iletisim">
  <li><a class="kart" data-link="eposta" href="#" hidden>{ikon("posta")}<span data-link-metin="eposta">E-posta</span></a></li>
  <li><a class="kart" data-link="instagram" href="#" hidden>{ikon("instagram")}<span data-link-metin="instagram">Instagram</span></a></li>
  <li><a class="kart" data-link="shopier_magaza" href="#" hidden>{ikon("sepet")}<span>Shopier mağazası</span></a></li>
</ul>
<noscript><p>İletişim bağlantılarını görmek için tarayıcınızda JavaScript'i açın.</p></noscript>"""
    return metin_sayfasi("/iletisim/", "İletişim", "Fabricakit ve Celcini ile iletişim: Instagram, e-posta ve Shopier mağazası.", ic)


def sss_sayfasi():
    ic = f'<div class="sss">{sss_html(SSS)}</div>'
    return metin_sayfasi("/sss/", "Sık sorulan sorular",
                         "Celcini Excel dosyaları hakkında sık sorulan sorular: satın alma, Excel sürümü, makro, veri gizliliği.", ic)


def gizlilik():
    ic = """<p>Bu sayfa, Celcini sitesini kullandığınızda kişisel verilerinizin nasıl işlendiğini 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) çerçevesinde açıklar.</p>
<h2>Bu site ne toplar?</h2>
<ul>
  <li>Site çerez kullanmaz, reklam ya da ziyaretçi analizi aracı çalıştırmaz.</li>
  <li>Site sizden ad, e-posta ya da ödeme bilgisi istemez. Fabricakit'teki hitap ve erişim kodu alanları aşağıda açıklanmıştır.</li>
  <li>Siteyi barındıran Vercel, güvenlik ve işletim için standart sunucu kayıtları (IP adresi, tarayıcı bilgisi, istek zamanı) tutabilir.</li>
</ul>
<h2>Fabricakit</h2>
<ul>
  <li>Oyun ilerlemeniz, ses tercihiniz, Ajan GM'nin size nasıl hitap edeceği ve açtığınız günler yalnızca bu tarayıcının yerel deposunda (localStorage) tutulur. Üyelik yoktur; bu bilgiler sunucuya gönderilmez. Tarayıcı verilerini sildiğinizde kayıt da silinir.</li>
  <li>Sesler: efekt sesleri tarayıcıda üretilir. "Sesli oku" ve "Ajan GM konuşsun" cihazınızdaki erkek Türkçe sesi kullanır; Ajan GM'nin sabit cümleleri, bu sitede ses dosyası olarak bulunduğunda oradan çalınır. Okunan metin hiçbir sunucuya gönderilmez. Ses kapalıyken hiçbir ses çalmaz.</li>
  <li>Erişim kodu: Kilidi açmak için girdiğiniz kod doğrulama için sunucuya gönderilir. Sunucu yalnızca kodun SHA-256 özetini satılan kodların listesiyle karşılaştırır; kodu saklamaz, kayıtlara yazmaz. Doğrulanan kod, kilidin açık kalması için yalnızca bu tarayıcıda tutulur.</li>
  <li>Ajan GM: Yorumlar varsayılan olarak tarayıcıda, hazır şablonlardan üretilir ve hiçbir veri gönderilmez. Yapay zeka modu açılırsa günün karnesindeki oyun verileri (puan, teslim, hat duruşu, olaylar gibi) ve Ajan GM'ye yazdığınız soru, yanıt üretmek için ABD merkezli yapay zeka sağlayıcısı Anthropic'e iletilir; bu mod yalnızca kod girenlere açıksa erişim kodunuz da her istekte yeniden doğrulanmak üzere sunucuya gönderilir. Hitabınız gönderilmez ve bu veriler Celcini tarafından saklanmaz. Sorularınıza kişisel bilgi yazmayın.</li>
</ul>
<h2>Datakit dersleri</h2>
<ul>
  <li>Kilitli bir dersi açmak için girdiğiniz erişim kodu doğrulama için sunucuya gönderilir. Sunucu yalnızca kodun SHA-256 özetini satılan kodların listesiyle karşılaştırır; kodu saklamaz, kayıtlara yazmaz. Doğrulanan kod ve ders sorularına verdiğiniz cevaplar yalnızca bu tarayıcının yerel deposunda (localStorage) tutulur.</li>
  <li>Derslerdeki tablolar dosyanın kurgusal örnek verisidir. Site sizden veri almaz; kendi verinizi yalnızca bilgisayarınızdaki Excel dosyasına girersiniz.</li>
</ul>
<h2>Ödeme ve teslim: Shopier</h2>
<p>Satın alma, ödeme ve teslim Shopier üzerinden yapılır. Bu adımlarda verdiğiniz bilgiler (ad, iletişim, ödeme bilgileri) Shopier tarafından işlenir ve Shopier'in gizlilik politikasına tabidir. Shopier'in siparişi teslim etmek için satıcıya ilettiği sipariş bilgileri yalnızca bu amaçla kullanılır.</p>
<h2>E-posta listesi: Google Form</h2>
<p>E-posta listesine katılmak isterseniz kayıt Google Form üzerinden alınır ve Google'ın sunucularında saklanır. Adresiniz yalnızca yeni dosya duyuruları için kullanılır, üçüncü kişilerle paylaşılmaz. Listeden çıkmak için yazmanız yeterlidir.</p>
<h2>Excel dosyaları</h2>
<p>Satın aldığınız dosyalar sizin bilgisayarınızda çalışır. Dosyalara girdiğiniz veriler Celcini'ye ya da başka bir yere gönderilmez.</p>
<h2>Haklarınız</h2>
<p>KVKK'nın 11. maddesi uyarınca kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini ya da silinmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz. Başvurularınızı <a href="/iletisim/">İletişim</a> sayfasındaki kanallardan iletebilirsiniz.</p>
<p>Veri sorumlusu: Celcini.</p>"""
    return metin_sayfasi("/gizlilik/", "Gizlilik ve KVKK",
                         "Fabricakit ve Celcini gizlilik, KVKK aydınlatma metni: Fabricakit kaydı yalnızca tarayıcınızda kalır, site çerez kullanmaz, ödeme Shopier'de yapılır.", ic)


def teslimat():
    ic = """<p>Celcini'deki ürünler dijital ürünlerdir: fiziksel kargo yoktur, size bir Excel dosyası teslim edilir.</p>
<h2>Ödeme ve teslim</h2>
<ul>
  <li>Ödeme ve teslim Shopier üzerinden yapılır. Ürün sayfasındaki “Shopier'de al” butonu sizi ilgili Shopier sayfasına götürür.</li>
  <li>Ödeme tamamlandığında dosya Shopier'in teslim adımlarıyla size iletilir.</li>
  <li>Teslimde sorun yaşarsanız <a href="/iletisim/">İletişim</a> sayfasındaki kanallardan sipariş numaranızla yazın.</li>
</ul>
<h2>İade ve cayma hakkı</h2>
<p>Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesine göre elektronik ortamda anında teslim edilen gayrimaddi mallarda (dijital dosyalar) cayma hakkı kullanılamaz. Dosya teslim edildikten sonra iade bu nedenle genel kural olarak mümkün değildir.</p>
<p>Dosya açılmıyorsa ya da ürün sayfasında yazanı yapmıyorsa bize yazın; durumu birlikte inceleriz.</p>
<h2>Satın almadan önce</h2>
<p>Her ürün sayfasındaki “Teknik bilgi” bölümünde Excel sürümü, makro durumu ve sayfa sayısı yazar. Satın almadan önce kendi Excel sürümünüzle uyumu kontrol edin.</p>"""
    return metin_sayfasi("/teslimat-ve-iade/", "Teslimat ve iade",
                         "Celcini dijital ürünlerinde teslimat ve iade: ödeme ve teslim Shopier'de yapılır.", ic)


def fabricakit_sayfasi():
    """Simülatörün kabuğu: uygulama #fk içine kurulur (fabricakit/js/uygulama.js)."""
    govde = f"""<div class="fk" id="fk">
  <div class="kap fk-kabuk">
    <h1>Fabricakit</h1>
    <p class="hero-slogan">{e(SLOGAN)}</p>
    <p class="fk-yukleniyor">Fabrika açılıyor…</p>
    <noscript><p>Fabricakit tarayıcıda çalışır; oynamak için JavaScript'i açın.</p></noscript>
    <p class="fk-excel">Excel dosyalarını mı arıyorsunuz? <a href="/{RAFLAR[0]["slug"]}/">{e(RAFLAR[0]["ad"])}</a> rafına geçin.</p>
  </div>
</div>"""
    return sayfa("/fabricakit/", "Fabricakit · Fabrika simülasyonu",
                 f"{FK_ALT} 1. gün ücretsiz, üyelik yok. {SLOGAN}", govde, etkin="/fabricakit/",
                 ek_css=["/fabricakit/css/fabricakit.css"], modul="/fabricakit/js/uygulama.js")


def uzay_sayfasi():
    govde = f"""<section class="sayfa-bas">
  <div class="kap">
    {yol_izi([("/", "Ana sayfa"), (None, "Uzay")])}
    {ikon("roket", "ikon ikon-buyuk")}
    <h1>Uzay</h1>
    <p>Tarayıcıda çalışan araçlar. Kurulum ve üyelik istemez.</p>
  </div>
</section>
<section class="bolum-raf" aria-label="Uzay araçları">
  <div class="kap">
    <ul class="izgara izgara-3">
      <li><article class="kart arac-kart">
        <div class="ust">{ikon("rota", "ikon ikon-buyuk")}<span class="etiket">Yayında</span></div>
        <h2 class="h3-boy">ROTA 3D</h2>
        <p>Depo toplama rotası: raf kodlarından en kısa yürüme yolunu hesaplar, sıralı toplamaya göre tasarrufu gösterir, 3D depoda adım adım çizer.</p>
        <a class="dugme" href="/uzay/rota/">Dene{ikon("ok")}</a>
      </article></li>
      <li><article class="kart arac-kart">
        <div class="ust">{ikon("fabrika", "ikon ikon-buyuk")}<span class="etiket">Yayında</span></div>
        <h2 class="h3-boy">Fabrika İkizi</h2>
        <p>Fabrika Motoru'nun örnek tesisi 3D'de gün gün: üç hat, on bir iş merkezi, 20 günlük plan. Talep, kapasite, vardiya, fason ve arıza senaryolarını deneyip darboğazı ve sevk etkisini görün.</p>
        <a class="dugme" href="/uzay/ikiz/">Dene{ikon("ok")}</a>
      </article></li>
      <li><article class="kart arac-kart">
        <div class="ust">{gezegen("samanyolu", "ikon ikon-buyuk")}<span class="etiket">Yayında</span></div>
        <h2 class="h3-boy">Fabricakit</h2>
        <p>{e(FK_ALT)}</p>
        <a class="dugme" href="/fabricakit/">Oyna{ikon("ok")}</a>
      </article></li>
      <li><article class="kart arac-kart">
        <div class="ust">{ikon("ara", "ikon ikon-buyuk")}<span class="etiket etiket-turuncu">Yakında</span></div>
        <h2 class="h3-boy">Ölü Stok Dedektörü</h2>
        <p>Depoda hareket görmeyen stoğu bulmak için bir araç.</p>
      </article></li>
    </ul>
    <p class="not-satiri"><span>{ikon("kilit")}Uzay araçlarına girdiğin veri işlem sonrası sunucuda saklanmaz.</span></p>
  </div>
</section>"""
    return sayfa("/uzay/", "Uzay · Tarayıcı araçları",
                 "Uzay, Celcini'nin tarayıcıda çalışan araçları: ROTA 3D depo toplama rotası, Fabrika İkizi (örnek tesis 3D'de gün gün) ve Fabricakit fabrika simülasyonu; sırada Ölü Stok Dedektörü var.",
                 govde, etkin="/uzay/")


def uzay_araci(slug, ad, aciklama, noindex=False):
    """Uzay aracı sayfası. Yeni araç: uzay/araclar/_sablon/ klasörünü kopyala, main()'e bir satır ekle, derle."""
    kok = f"/uzay/araclar/{slug}/"
    govde = f"""<section class="sayfa-bas">
  <div class="kap">
    {yol_izi([("/", "Ana sayfa"), ("/uzay/", "Uzay"), (None, ad)])}
    <h1>{e(ad)}</h1>
    <p>{e(aciklama)}</p>
  </div>
</section>
<section class="bolum-raf" aria-label="{e(ad)}">
  <div class="kap">
    <div class="kart arac-panel">
      <label for="arac-girdi"><strong>Girdi</strong></label>
      <textarea id="arac-girdi" rows="6" placeholder="Metninizi buraya yazın"></textarea>
      <div class="eylemler"><button class="dugme" id="arac-calistir" type="button">Çalıştır</button><span id="arac-durum" aria-live="polite"></span></div>
      <div class="arac-cikti" id="arac-cikti" hidden></div>
    </div>
  </div>
</section>"""
    return sayfa(kok, f"{ad} · Uzay", aciklama, govde, etkin="/uzay/", noindex=noindex,
                 ek_css=[kok + "app.css"], ek_head=f'<script src="{kok}app.js?v={surum(kok + "app.js")}" defer></script>')


ROTA_NASIL = ("Depo sorumlusuna ve toplayıcıya yarar: liste sırasıyla yürümeye göre kaç metre ve ne kadar süre kazanıldığını görürsünüz. "
              "Raf kodlarını yazın ya da Excel'den yapıştırın, “Rotayı hesapla”ya basın; deponuzun düzenini Depo sekmesinden girin.")
ROTA_ACIKLAMA = ("ROTA 3D, depoda toplanacak ürünler için en kısa yürüme rotasını hesaplar, sıralı toplamaya göre "
                 "tasarrufu gösterir ve rotayı 3D depo planında adım adım çizer. Tarayıcıda çalışır, kurulum istemez.")


def rota_sayfasi():
    """ROTA 3D: depo toplama rotası. Uygulama uzay/rota/js/ (ES modülleri: layout, router, scene3d, ui), stil uzay/rota/css/rota.css.
    Three.js r128 ve OrbitControls assets/js/vendor/three/ altından klasik betik olarak modülden önce yüklenir (CSP: her şey self).
    Telefonda kontroller Fabricakit görev notunun çekmecesinde (.fk-gorev-kap / .fk-gorev; fabricakit.css)."""
    kok = "/uzay/rota/"
    vendor = "".join(f'\n<script src="{y}?v={surum(y)}" defer></script>' for y in (
        "/assets/js/vendor/three/three.min.js", "/assets/js/vendor/three/OrbitControls.js"))
    sekmeler = [("tabPick", "Ürünler"), ("tabLayout", "Depo"), ("tabRoute", "Rota"), ("tabHeat", "Isı haritası"), ("tabSet", "Ayarlar")]
    sekme_html = "".join(
        f'<button type="button" class="etiket-dugme" role="tab" id="s-{i}" data-tab="{i}" aria-controls="{i}" '
        f'aria-selected="{"true" if n == 0 else "false"}">{e(a)}</button>' for n, (i, a) in enumerate(sekmeler))
    govde = f"""<section class="sayfa-bas rota-bas">
  <div class="kap">
    {yol_izi([("/", "Ana sayfa"), ("/uzay/", "Uzay"), (None, "ROTA 3D")])}
    <h1>ROTA 3D</h1>
    <p class="rota-giris"><span class="rota-giris-tam">ROTA 3D, depoda toplanacak ürünler için en kısa yürüme rotasını hesaplar ve 3D depo planında adım adım gösterir.
    {ROTA_NASIL}</span><span class="rota-giris-kisa">Depodaki en kısa toplama rotasını hesaplar, 3D depo planında adım adım gösterir.</span></p>
    <details class="rota-nasil"><summary>Nasıl kullanılır{ikon("asagi")}</summary><p>{ROTA_NASIL}</p></details>
  </div>
</section>
<section class="rota" aria-label="ROTA 3D aracı">
  <div class="kap rota-duzen">
    <div class="rota-sahne">
      <canvas id="scene" aria-label="Deponun 3D görünümü ve toplama rotası"></canvas>
      <div class="rota-hud">
        <p class="rota-cip">Durum: <b id="hudState">hazır</b></p>
        <p class="rota-cip">İlerleme: <b id="hudProg">%0</b></p>
        <div class="rota-cip rota-cip-mod" id="hudMode" hidden><span id="hudModeText"></span><button type="button" id="btnModeDone" hidden>Bitti</button></div>
        <div class="rota-kameralar" role="group" aria-label="Kamera">
          <button type="button" id="camIso" aria-pressed="true" title="İzometrik">İzo</button>
          <button type="button" id="camTop" aria-pressed="false" title="Üstten">Üst</button>
          <button type="button" id="camFollow" aria-pressed="false" title="Toplayıcıyı takip et">Takip</button>
        </div>
      </div>
      <p class="rota-lejant" aria-hidden="true"><span><i class="l-rota"></i>ROTA</span><span><i class="l-sirali"></i>Sıralı toplama</span><span><i class="l-raf"></i>Raf</span><span><i class="l-secili"></i>Listedeki göz</span><span><i class="l-sevk"></i>Sevkiyat</span><span><i class="l-engel"></i>Engel</span></p>
      <p class="rota-uyari" id="glUyari" hidden>Tarayıcınız 3D çizimi (WebGL) açamadı. Rota hesabı, karşılaştırma ve adım adım liste yine çalışır.</p>
      <p class="rota-toast" id="toast" role="status" aria-live="polite"></p>
    </div>
    <div class="rota-yan">
      <div class="kart rota-ozet">
        <dl class="rota-stat">
          <div class="rota-stat-ana"><dt>ROTA mesafe</dt><dd id="sDist">0<small>m</small></dd></div>
          <div><dt>Tahmini süre</dt><dd id="sTime">0<small>sn</small></dd></div>
          <div><dt>Durak</dt><dd id="sStops">0</dd></div>
        </dl>
        <div class="rota-karsilastir">
          <div><p class="rota-cubuk-etiket"><span>Sıralı</span><span id="cSeq">—</span></p><div class="rota-cubuk rota-cubuk-sirali"><i id="bSeq"></i></div></div>
          <p class="rota-tasarruf" id="cSave">—</p>
          <div><p class="rota-cubuk-etiket"><span>ROTA</span><span id="cOpt">—</span></p><div class="rota-cubuk rota-cubuk-opt"><i id="bOpt"></i></div></div>
        </div>
        <p class="rota-yontem" id="sMethod">—</p>
      </div>
      <div class="fk-gorev-kap rota-cekmece-kap" id="cekmeceKap">
        <p class="rota-ornek-not" id="ornekNot" hidden>Örnek liste: <span id="ornekSayi">10</span> ürün. Kendi listenizi Kontroller'den girin.</p>
        <button type="button" class="dugme rota-serit-dugme" id="btnRunSerit">Rotayı hesapla</button>
        <details class="fk-gorev rota-cekmece" id="cekmece">
          <summary><span class="fk-gorev-baslik">Kontroller</span><span class="rota-serit-satir"><span class="fk-gorev-sayac" id="cekmeceSayac">0 ürün</span>{ikon("yukari", "ikon fk-gorev-ok")}</span></summary>
          <div class="rota-sekmeler" role="tablist" aria-label="Kontroller">{sekme_html}</div>

          <div class="rota-panel" id="tabPick" role="tabpanel" aria-labelledby="s-tabPick">
            <div class="rota-grup">
              <h2 class="rota-h"><label for="inPicks">Toplanacak ürünler</label></h2>
              <p class="rota-ipucu">Raf harfi + göz no, isteğe bağlı kat (<code>C07-2</code>). Virgül ya da satırla ayırın.</p>
              <textarea id="inPicks" rows="3" spellcheck="false"></textarea>
              <p class="rota-hata" id="pickErr" hidden></p>
              <div class="rota-dugmeler">
                <button type="button" class="dugme" id="btnRun">Rotayı hesapla</button>
                <button type="button" class="dugme-cizgi" id="btnReplay">Tekrar oynat</button>
                <button type="button" class="dugme-cizgi" id="btnClear">Temizle</button>
              </div>
              <p class="rota-ipucu">3D sahnede bir göze dokunarak da listeye ekleyip çıkarabilirsiniz.</p>
            </div>
            <div class="rota-grup">
              <h2 class="rota-h"><label for="inPaste">Listeyi yapıştır</label></h2>
              <p class="rota-ipucu">Excel'den raf kodu sütununu kopyalayıp buraya yapıştırın; satır satır ya da virgüllü olabilir. Kodlar tek seferde listenin yerine geçer ve rota hesaplanır.</p>
              <textarea id="inPaste" rows="2" spellcheck="false" placeholder="Excel'den yapıştırın"></textarea>
              <div class="rota-dugmeler"><button type="button" class="dugme-cizgi" id="btnPaste">Listeye al</button></div>
              <p class="rota-ipucu" id="pasteDurum" aria-live="polite" hidden></p>
            </div>
            <div class="rota-grup">
              <h2 class="rota-h">Toplama sırası</h2>
              <ol class="rota-sira" id="orderList"></ol>
            </div>
          </div>

          <div class="rota-panel" id="tabLayout" role="tabpanel" aria-labelledby="s-tabLayout" hidden>
            <div class="rota-grup">
              <h2 class="rota-h">Depo düzeni</h2>
              <div class="rota-satir rota-satir-3">
                <label for="inPairs">Raf bloğu<input id="inPairs" type="number" inputmode="numeric" min="1" max="10" value="4"></label>
                <label for="inBays">Göz / raf<input id="inBays" type="number" inputmode="numeric" min="3" max="30" value="12"></label>
                <label for="inLevels">Kat<input id="inLevels" type="number" inputmode="numeric" min="1" max="5" value="3"></label>
              </div>
              <div class="rota-satir">
                <label for="inCell">Göz genişliği (m)<input id="inCell" type="number" inputmode="decimal" min="0.5" max="5" step="0.1" value="1.2"></label>
                <label for="inDepot">Sevkiyat noktası<select id="inDepot"><option value="left">Sol ön</option><option value="center">Orta ön</option><option value="right">Sağ ön</option></select></label>
              </div>
              <p class="rota-ipucu" id="layoutHint"></p>
            </div>
            <div class="rota-grup">
              <h2 class="rota-h">Sahnede düzenleme</h2>
              <div class="rota-secim" id="editMode" role="group" aria-label="Sahnede düzenleme">
                <button type="button" class="etiket-dugme" data-mode="pick" aria-pressed="true">Ürün seç</button>
                <button type="button" class="etiket-dugme" data-mode="block" aria-pressed="false">Engel koy</button>
                <button type="button" class="etiket-dugme" data-mode="view" aria-pressed="false">Sadece bak</button>
              </div>
              <p class="rota-ipucu">Engel modunda koridordaki bir kareye dokunun: palet, forklift ya da kapalı geçit gibi davranır, rota etrafından dolaşır. Tekrar dokunursanız kalkar.</p>
              <div class="rota-dugmeler"><button type="button" class="dugme-cizgi" id="btnClearBlocks">Engelleri kaldır</button><button type="button" class="dugme-cizgi" id="btnSample">Örnek depo</button></div>
            </div>
          </div>

          <div class="rota-panel" id="tabRoute" role="tabpanel" aria-labelledby="s-tabRoute" hidden>
            <div class="rota-grup">
              <h2 class="rota-h">Adım adım</h2>
              <ol class="rota-adimlar" id="stepList"></ol>
              <div class="rota-dugmeler"><button type="button" class="dugme-cizgi" id="btnCopy">Rota listesini kopyala</button></div>
            </div>
          </div>

          <div class="rota-panel" id="tabHeat" role="tabpanel" aria-labelledby="s-tabHeat" hidden>
            <div class="rota-grup">
              <h2 class="rota-h"><label for="inHist">Sipariş geçmişi</label></h2>
              <p class="rota-ipucu">Her satır bir sipariş. Rafların ne sıklıkla ziyaret edildiğini renklendirir.</p>
              <textarea id="inHist" rows="5" spellcheck="false"></textarea>
              <div class="rota-dugmeler"><button type="button" class="dugme-cizgi" id="btnHeat">Isı haritasını göster</button><button type="button" class="dugme-cizgi" id="btnHeatOff">Kapat</button></div>
              <p class="rota-isi" aria-hidden="true"><span>seyrek</span><i></i><span>sık</span></p>
            </div>
            <div class="rota-grup">
              <h2 class="rota-h">En sık toplanan gözler</h2>
              <ul class="rota-sik" id="hotList"></ul>
              <p class="rota-ipucu" id="heatHint">Sık toplananlar sevkiyata uzak kalıyorsa, onları ön gözlere taşımak her siparişte metre kazandırır.</p>
            </div>
          </div>

          <div class="rota-panel" id="tabSet" role="tabpanel" aria-labelledby="s-tabSet" hidden>
            <div class="rota-grup">
              <h2 class="rota-h">Toplayıcı</h2>
              <label for="inSpeed">Yürüme hızı: <b id="speedVal">1,0</b> m/sn<input id="inSpeed" type="range" min="0.5" max="2.5" step="0.1" value="1.0"></label>
              <label for="inPickTime">Göz başına alma süresi: <b id="pickVal">15</b> sn<input id="inPickTime" type="range" min="0" max="30" step="1" value="15"></label>
              <p class="rota-ipucu">Varsayılan alma süresi 15 sn: gözü bulma, sayma ve barkod okutma dahil. Varsayılan yürüme hızı 1,0 m/sn.</p>
              <label for="inAnim">Animasyon hızı: <b id="animVal">1×</b><input id="inAnim" type="range" min="0.25" max="4" step="0.25" value="1"></label>
            </div>
            <div class="rota-grup">
              <h2 class="rota-h">Görünüm</h2>
              <label class="rota-kutu"><input type="checkbox" id="chkSeq" checked> Sıralı toplama yolunu da göster</label>
              <label class="rota-kutu"><input type="checkbox" id="chkLabels" checked> Durak numaralarını göster</label>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
  <noscript><div class="kap"><p class="rota-ipucu">ROTA 3D tarayıcıda çalışır; kullanmak için JavaScript'i açın.</p></div></noscript>
</section>
<section class="bolum-raf rota-alt" aria-labelledby="kendi-baslik">
  <div class="kap">
    <div class="kart rota-kendi">
      {gezegen("jupiter", "ikon ikon-buyuk")}
      <div class="rota-kendi-metin">
        <h2 id="kendi-baslik" class="h3-boy">Kendi deponuz için</h2>
        <p>Deponuzun düzenini Depo sekmesinden girin: raf bloğu, göz sayısı, kat ve göz genişliği. Depo işinin fabrikadaki yerini görmek isterseniz Fabricakit'i açıp haritada Jüpiter (Depo) odasına girin; gelen mal orada teslim alınır, sayım orada yapılır.</p>
      </div>
      <a class="dugme-cizgi" href="/fabricakit/">Jüpiter (Depo) odası{ikon("ok")}</a>
    </div>
    <p class="not-satiri"><span>{ikon("kilit")}Girdiğiniz raf kodları yalnızca bu sayfada işlenir; hiçbir yere gönderilmez, saklanmaz.</span></p>
  </div>
</section>"""
    return sayfa(kok, "ROTA 3D · Depo toplama rotası", ROTA_ACIKLAMA, govde, etkin="/uzay/",
                 ek_css=["/fabricakit/css/fabricakit.css", kok + "css/rota.css"], ek_head=vendor, modul=kok + "js/ui.js")


IKIZ_NASIL = ("Üretim planlamacısına ve fabrika yöneticisine yarar: planı gün gün akıtınca hangi iş merkezinin ne zaman dolduğunu, "
              "darboğazın önünde işin nasıl biriktiğini ve sevkin bundan nasıl etkilendiğini görürsünüz. "
              "Hazır senaryolardan birini seçin ya da talep, kapasite, vardiya, fason ve arıza kollarını kendiniz çevirin; sonuç tablosu Baz ile karşılaştırır.")
IKIZ_ACIKLAMA = ("Fabrika İkizi, Fabrika Motoru'nun örnek tesisini 3D'de gün gün oynatır; talep, kapasite, vardiya, fason ve arıza "
                 "senaryolarında darboğazı ve sevk etkisini gösterir. Tarayıcıda çalışır.")


def ikiz_sayfasi():
    """Fabrika İkizi: Fabrika Motoru'nun örnek (kurgusal) tesisi 3D'de, gün gün. Uygulama uzay/ikiz/js/ (ES modülleri: veri, hesap, sahne,
    arayuz), stil uzay/ikiz/css/ikiz.css. Three.js r128 ve OrbitControls ROTA 3D ile aynı yerden klasik betik olarak yüklenir.
    Telefonda kontroller Fabricakit görev notunun çekmecesinde (.fk-gorev-kap / .fk-gorev; fabricakit.css)."""
    kok = "/uzay/ikiz/"
    vendor = "".join(f'\n<script src="{y}?v={surum(y)}" defer></script>' for y in (
        "/assets/js/vendor/three/three.min.js", "/assets/js/vendor/three/OrbitControls.js"))
    sekmeler = [("tabSenaryo", "Senaryo"), ("tabGun", "Gün"), ("tabSonuc", "Sonuç"), ("tabModel", "Model")]
    sekme_html = "".join(
        f'<button type="button" class="etiket-dugme" role="tab" id="s-{i}" data-tab="{i}" aria-controls="{i}" '
        f'aria-selected="{"true" if n == 0 else "false"}">{e(a)}</button>' for n, (i, a) in enumerate(sekmeler))
    hazir = "".join(f'<button type="button" class="etiket-dugme" data-sira="{n}" data-ad="{e(s)}" aria-pressed="{"true" if n == 0 else "false"}">{e(s)}</button>'
                    for n, s in enumerate(("Baz", "Büyüme +%10, kur +%10", "Sıçrama +%25, ek vardiya", "Daralma −%15")))
    govde = f"""<section class="sayfa-bas ikiz-bas">
  <div class="kap">
    {yol_izi([("/", "Ana sayfa"), ("/uzay/", "Uzay"), (None, "Fabrika İkizi")])}
    <h1>Fabrika İkizi</h1>
    <p class="ikiz-giris"><span class="ikiz-giris-tam">Fabrika Motoru'nun örnek tesisi 3D'de, gün gün: üç hat, on bir iş merkezi, 20 iş günlük plan.
    {IKIZ_NASIL}</span><span class="ikiz-giris-kisa">Örnek tesis 3D'de gün gün oynar; senaryoyu değiştirip darboğazı ve sevk etkisini görün.</span></p>
    <details class="ikiz-nasil"><summary>Nasıl kullanılır{ikon("asagi")}</summary><p>{IKIZ_NASIL}</p></details>
  </div>
</section>
<section class="ikiz" aria-label="Fabrika İkizi aracı">
  <div class="kap ikiz-duzen">
    <div class="ikiz-sahne">
      <canvas id="sahne" aria-label="Örnek tesisin 3D görünümü: hatlar, iş merkezleri, depo ve sevkiyat"></canvas>
      <div class="ikiz-hud">
        <p class="ikiz-cip"><b id="hudGun">Gün 1 / 20</b> <span id="hudTarih">—</span></p>
        <p class="ikiz-cip ikiz-cip-senaryo">Senaryo: <b id="hudSenaryo">Baz</b></p>
        <div class="ikiz-kameralar" role="group" aria-label="Kamera">
          <button type="button" id="camGenel" aria-pressed="true" title="Genel görünüm">Genel</button>
          <button type="button" id="camUst" aria-pressed="false" title="Üstten">Üst</button>
          <button type="button" id="camHat" aria-pressed="false" title="Hatlara yakından, sırayla">Hat</button>
        </div>
      </div>
      <div class="ikiz-oynatici" role="group" aria-label="Gün gün oynat">
        <button type="button" id="btnOnceki" class="ikiz-yuvarlak" aria-label="Önceki gün">‹</button>
        <button type="button" id="btnOynat" class="ikiz-oynat" aria-pressed="false">Oynat</button>
        <button type="button" id="btnSonraki" class="ikiz-yuvarlak" aria-label="Sonraki gün">›</button>
        <label class="ikiz-gun-kaydirici"><span class="gizli">Gün</span><input id="inGun" type="range" min="1" max="20" step="1" value="1"></label>
        <div class="ikiz-hiz" id="hizSec" role="group" aria-label="Hız">
          <button type="button" data-hiz="1" aria-pressed="true">1×</button><button type="button" data-hiz="2" aria-pressed="false">2×</button><button type="button" data-hiz="4" aria-pressed="false">4×</button>
        </div>
      </div>
      <p class="ikiz-lejant" aria-hidden="true"><span><i class="l-normal"></i>Normal</span><span><i class="l-dolu"></i>Dolu (&gt;%85)</span><span><i class="l-asim"></i>Aşım (&gt;%100)</span><span><i class="l-ariza"></i>Arıza</span><span><i class="l-palet"></i>Bekleyen iş</span><span><i class="l-parca"></i>Parça akışı</span></p>
      <p class="ikiz-uyari" id="glUyari" hidden>Tarayıcınız 3D çizimi (WebGL) açamadı. Gün tablosu, senaryo karşılaştırması ve öneriler yine çalışır.</p>
    </div>
    <div class="ikiz-yan">
      <div class="kart ikiz-ozet">
        <dl class="ikiz-stat">
          <div><dt>Bugün üretim</dt><dd id="sUretim">0</dd></div>
          <div><dt>Bugün sevk</dt><dd id="sSevk">0</dd></div>
          <div><dt>Aşan iş merkezi</dt><dd id="sAsim">0</dd></div>
          <div><dt>En yüksek yük</dt><dd id="sYuk">%0</dd></div>
        </dl>
        <div class="ikiz-cubuklar"><p class="ikiz-cubuk-baslik">20 gün · en yüksek iş merkezi yükü (çizgi: %100)</p><div class="ikiz-gun-cubuk" id="gunCubuk"></div></div>
      </div>
      <div class="fk-gorev-kap ikiz-cekmece-kap" id="cekmeceKap">
        <details class="fk-gorev ikiz-cekmece" id="cekmece">
          <summary><span class="fk-gorev-baslik">Senaryo ve sonuçlar</span><span class="fk-gorev-sayac" id="cekmeceSayac">Baz</span>{ikon("yukari", "ikon fk-gorev-ok")}</summary>
          <div class="ikiz-sekmeler" role="tablist" aria-label="Kontroller">{sekme_html}</div>

          <div class="ikiz-panel" id="tabSenaryo" role="tabpanel" aria-labelledby="s-tabSenaryo">
            <div class="ikiz-grup">
              <h2 class="ikiz-h">Hazır senaryolar</h2>
              <p class="ikiz-ipucu">Fabrika Motoru'nun SİMÜLASYON sayfasındaki dört senaryo: talep ve kapasite değişimi.</p>
              <div class="ikiz-secim" id="hazirSenaryo" role="group" aria-label="Hazır senaryolar">{hazir}</div>
            </div>
            <div class="ikiz-grup">
              <h2 class="ikiz-h">Kollar</h2>
              <label for="inTalep"><span>Talep: <b id="lblTalep">+%0</b></span><input id="inTalep" type="range" min="-30" max="30" step="5" value="0"></label>
              <label for="inKapasite"><span>Kapasite: <b id="lblKapasite">+%0</b></span><input id="inKapasite" type="range" min="-20" max="30" step="5" value="0"></label>
              <label class="ikiz-kutu"><input type="checkbox" id="chkVardiya"> Üçüncü vardiya (kapasite ×1,5; personel ihtiyacı artar)</label>
              <label class="ikiz-kutu"><input type="checkbox" id="chkFason"> Fason (fason mümkün iş merkezlerine günlük fason dakikası eklenir)</label>
              <div class="ikiz-satir ikiz-satir-3">
                <label for="inAriza">Arıza<select id="inAriza"><option value="">Yok</option></select></label>
                <label for="inArizaBas">Başlangıç<select id="inArizaBas"></select></label>
                <label for="inArizaBit">Bitiş<select id="inArizaBit"></select></label>
              </div>
              <div class="ikiz-dugmeler"><button type="button" class="dugme-cizgi" id="btnSifirla">Baz'a dön</button><button type="button" class="dugme ikiz-telefon" id="btnSahneyeDon">Sahneye dön</button></div>
            </div>
          </div>

          <div class="ikiz-panel" id="tabGun" role="tabpanel" aria-labelledby="s-tabGun" hidden>
            <div class="ikiz-grup">
              <h2 class="ikiz-h">Seçili iş merkezi</h2>
              <div id="imDetay"></div>
            </div>
            <div class="ikiz-grup">
              <h2 class="ikiz-h">Günün iş merkezleri</h2>
              <table class="ikiz-tablo"><thead><tr><th>İş merkezi</th><th>Yük</th><th>Bekleyen</th><th>Durum</th></tr></thead><tbody id="imTablo"></tbody></table>
            </div>
          </div>

          <div class="ikiz-panel" id="tabSonuc" role="tabpanel" aria-labelledby="s-tabSonuc" hidden>
            <div class="ikiz-grup">
              <h2 class="ikiz-h">20 günün sonucu</h2>
              <table class="ikiz-tablo"><thead><tr><th>Gösterge</th><th>Senaryo</th><th>Baz</th></tr></thead><tbody id="sonucTablo"></tbody></table>
            </div>
            <div class="ikiz-grup">
              <h2 class="ikiz-h">Ne yapmalı?</h2>
              <ul class="ikiz-oneriler" id="oneriler"></ul>
              <p class="ikiz-ipucu">Öneriler aynı modelle kolları tek tek deneyerek bulunur; yapay zeka çağrısı yoktur.</p>
            </div>
          </div>

          <div class="ikiz-panel" id="tabModel" role="tabpanel" aria-labelledby="s-tabModel" hidden>
            <div class="ikiz-grup">
              <h2 class="ikiz-h">Model</h2>
              <p class="ikiz-ipucu">Veri, Fabrika Motoru'nun örnekli dosyasındaki kurgusal tesistir (HAT, MAMUL, STD_SÜRE, MPS, KAPASİTE, SİMÜLASYON sayfaları); gerçek bir firmaya ait değildir.</p>
              <ul class="ikiz-liste">
                <li>İş merkezi yükü = Σ plan × standart süre + hazırlık; günlük kapasite = istasyon × 900 dk × verim (iki vardiya). Dosyanın KAPASİTE sayfası bu yükü planın tamamı için hesaplar; ilk günün plan yükü oranları dosyayla aynıdır.</li>
                <li>Parça aynı gün rotanın tamamından geçer; kapasite yetmeyince darboğazın önünde bekler ve ertesi güne devreder (palet yığını). Bu yüzden bir iş merkezine gelen iş plan yükünden az (üst iş merkezi aşımda) ya da fazla (önceki günlerden devreden iş) olabilir; ayrıntıda ikisi de görünür. Toplam aşım ve en yüksek yük devreden işi içerdiği için dosyanın KAPASİTE ve SİMÜLASYON sayfalarındaki değerlerden farklıdır.</li>
                <li>Sevk = 20 iş günlük net talebin eşit dağılımı (birikimli yuvarlama; talep kolu sıfırken toplam dosyadaki net taleple aynı); karşılanmayan sevk ertesi güne kalır, OTD bundan hesaplanır. "Baz", dosyadaki plan ve kapasiteyle hiçbir kol çevrilmeden yapılan hesaptır.</li>
                <li>Üçüncü vardiya kapasiteyi 1,5 katına çıkarır ve personel ihtiyacını birinci vardiya kadar artırır (dosyada üçüncü vardiya personeli 0); fason, fason mümkün iş merkezlerine dosyadaki günlük fason dakikasını ekler; arıza o günlerde kapasiteyi sıfırlar. Sonuç tablosundaki adam-saat "ihtiyaç / mevcut"tur.</li>
                <li>Malzeme eksikleri, hurda ve duruşlar modelde yoktur; bunlar Fabrika Motoru'nun MRP, ALARM ve ÜRETİM sayfalarındadır.</li>
              </ul>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
  <noscript><div class="kap"><p class="ikiz-ipucu">Fabrika İkizi tarayıcıda çalışır; kullanmak için JavaScript'i açın.</p></div></noscript>
</section>
<section class="bolum-raf ikiz-alt" aria-labelledby="motor-baslik">
  <div class="kap">
    <div class="kart ikiz-motor">
      {ikon("fabrika", "ikon ikon-buyuk")}
      <div class="ikiz-motor-metin">
        <h2 id="motor-baslik" class="h3-boy">Bu tesis Fabrika Motoru'ndan</h2>
        <p>Hatlar, iş merkezleri, standart süreler ve 20 günlük plan Fabrika Motoru'nun örnek dosyasından geliyor. Dosyanın 12 ana sayfasını Ajan GM'nin notlarıyla sayfa sayfa okumak için Motor derslerine, dosyanın kendisi için ürün sayfasına gidin.</p>
      </div>
      <div class="ikiz-motor-dugmeler"><a class="dugme-cizgi" href="/motor/">Motor dersleri{ikon("ok")}</a><a class="dugme-cizgi" href="/urun/fabrika-motoru/">Fabrika Motoru</a></div>
    </div>
    <p class="not-satiri"><span>{ikon("kilit")}Sayfa veri almaz; senaryo seçimleriniz yalnızca bu sayfada işlenir, hiçbir yere gönderilmez, saklanmaz.</span></p>
  </div>
</section>"""
    return sayfa(kok, "Fabrika İkizi · Örnek tesis 3D'de gün gün", IKIZ_ACIKLAMA, govde, etkin="/uzay/",
                 ek_css=["/fabricakit/css/fabricakit.css", kok + "css/ikiz.css"], ek_head=vendor, modul=kok + "js/arayuz.js")


# ---------------------------------------------------------------- Üretim Arşivi
ARSIV_YOLU = "/arsiv/"
ARSIV_AD = "Üretim Arşivi"
ARSIV_KART_ALANLARI = ("slug", "baslik", "belirti", "kok_neden", "cozum", "ilke")  # zorunlu; "ilgili" isteğe bağlı
ARSIV_NOTU = ("Kartlar genel uygulama önerileridir; kendi işletmenize uyarlayarak kullanın. "
              "İş güvenliği ve yasal yükümlülüklerde mevzuat ve iş güvenliği uzmanınız esastır.")
SLUG_DESENI = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
SAYFA_KIMLIKLERI = {"icerik", "ust-menu", "menu-dosyalar"}  # konu sayfasında kart dışındaki id'ler (kart id'si = slug)


def arsivi_oku(urunler):
    """data/arsiv.json: bölüm → kategori → kart. Kategori slug'ı adrestir (/arsiv/<kategori>/), kart slug'ı sayfa içi
    çapadır (#<kart>). Kartın isteğe bağlı "ilgili" alanı sitede görünen bir ürünün slug'ıdır ("İlgili dosya" bağlantısı)."""
    veri = json.loads((KOK / "data" / "arsiv.json").read_text(encoding="utf-8"))
    gorunen = {u["slug"] for u in urunler if not u.get("ornek")}  # örnek kayıt üretimde yoktur; önizleme de reddeder
    sluglar = {"bölüm": set(), "kategori": set(), "kart": set()}

    def slug_denetle(tur, s):
        if not isinstance(s, str) or not SLUG_DESENI.fullmatch(s):
            sys.exit(f"HATA: arsiv.json: geçersiz {tur} slug'ı '{s}' (yalnızca küçük harf, rakam ve tire)")
        if s in sluglar[tur]:
            sys.exit(f"HATA: arsiv.json: tekrarlanan {tur} slug'ı '{s}'")
        sluglar[tur].add(s)

    if not veri.get("bolumler"):
        sys.exit("HATA: arsiv.json: bölüm yok")
    for b in veri["bolumler"]:
        slug_denetle("bölüm", b.get("slug"))
        if not (b.get("ad") or "").strip() or not b.get("kategoriler"):
            sys.exit(f"HATA: arsiv.json: {b['slug']} bölümünün adı ya da kategorisi yok")
        for kat in b["kategoriler"]:
            slug_denetle("kategori", kat.get("slug"))
            if not (kat.get("ad") or "").strip() or not kat.get("kartlar"):
                sys.exit(f"HATA: arsiv.json: {kat['slug']} kategorisinin adı ya da kartı yok")
            for k in kat["kartlar"]:
                eksik = [a for a in ARSIV_KART_ALANLARI if not k.get(a)]
                if eksik:
                    ad = k.get("slug") or k.get("baslik") or f"{len(sluglar['kart']) + 1}. kart"
                    sys.exit(f"HATA: arsiv.json: {kat['slug']} / {ad}: eksik alan: {', '.join(eksik)}")
                slug_denetle("kart", k["slug"])
                # Kart slug'ı konu sayfasında id'dir; başlığının id'si <slug>-baslik
                if k["slug"] in SAYFA_KIMLIKLERI or k["slug"].endswith("-baslik"):
                    sys.exit(f"HATA: arsiv.json: kart slug'ı '{k['slug']}' sayfadaki bir id ile çakışır")
                # Yazım hatalı alan adı (ör. "ilgli") sessizce yok sayılmasın
                bilinmeyen = sorted(set(k) - set(ARSIV_KART_ALANLARI) - {"ilgili"})
                if bilinmeyen:
                    sys.exit(f"HATA: arsiv.json: {k['slug']}: bilinmeyen alan: {', '.join(bilinmeyen)}")
                if not isinstance(k["cozum"], list):
                    sys.exit(f"HATA: arsiv.json: {k['slug']}: çözüm bir liste olmalı")
                metinler = [k["baslik"], k["belirti"], k["kok_neden"], k["ilke"], *k["cozum"]]
                if len(k["cozum"]) != 3 or not all(isinstance(m, str) and m.strip() for m in metinler):
                    sys.exit(f"HATA: arsiv.json: {k['slug']}: çözüm üç adım olmalı, metinler boş olamaz")
                if k.get("ilgili") and k["ilgili"] not in gorunen:
                    sys.exit(f"HATA: arsiv.json: {k['slug']}: ilgili ürün '{k['ilgili']}' sitede görünmüyor")
    return veri


def arsiv_sayilari(veri):
    kategoriler = [kat for b in veri["bolumler"] for kat in b["kategoriler"]]
    return sum(len(kat["kartlar"]) for kat in kategoriler), len(kategoriler)


def arsiv_urun_baglantilari(veri):
    """Ürün slug'ı → o ürüne bağlanan kartlar [(kategori, kart)]: ürün sayfasındaki "Üretim Arşivi'nde" bölümü için."""
    sonuc = {}
    for b in veri["bolumler"]:
        for kat in b["kategoriler"]:
            for k in kat["kartlar"]:
                if k.get("ilgili"):
                    sonuc.setdefault(k["ilgili"], []).append((kat, k))
    return sonuc


def arsiv_karti(k, urun_bilgisi):
    cozum = "".join(f"<li>{e(c)}</li>" for c in k["cozum"])
    ilgili = ""
    if k.get("ilgili"):
        ad, bedava = urun_bilgisi[k["ilgili"]]
        ilgili = (f'\n  <p class="arsiv-ilgili">İlgili dosya: <a href="/urun/{e(k["ilgili"])}/">{e(ad)}</a>'
                  f'{" (ücretsiz)" if bedava else ""}</p>')
    return f"""<article class="kart arsiv-kart" id="{e(k["slug"])}" aria-labelledby="{e(k["slug"])}-baslik">
  <h2 class="h3-boy" id="{e(k["slug"])}-baslik"><a href="#{e(k["slug"])}">{e(k["baslik"])}</a></h2>
  <div class="arsiv-ic">
    <dl class="arsiv-durum">
      <div><dt class="arsiv-etiket">Belirti</dt><dd>{e(k["belirti"])}</dd></div>
      <div><dt class="arsiv-etiket">Kök neden</dt><dd>{e(k["kok_neden"])}</dd></div>
    </dl>
    <div class="arsiv-cozum">
      <p class="arsiv-etiket">Çözüm</p>
      <ol>{cozum}</ol>
    </div>
  </div>
  <p class="arsiv-ilke">{e(k["ilke"])}</p>{ilgili}
</article>"""


def arsiv_sayfasi(veri):
    toplam, n_kat = arsiv_sayilari(veri)
    bolumler = []
    for b in veri["bolumler"]:
        kategoriler = []
        for kat in b["kategoriler"]:
            basliklar = "".join(
                f'<li data-urun data-ara="{e(" ".join([k["baslik"], k["belirti"], k["kok_neden"], *k["cozum"], k["ilke"], kat["ad"], b["ad"]]))}">'
                f'<a href="{ARSIV_YOLU}{kat["slug"]}/#{k["slug"]}">{e(k["baslik"])}</a></li>'
                for k in kat["kartlar"])
            kategoriler.append(f"""<li class="kart arsiv-kategori" data-urun-bolum>
          <h3><a href="{ARSIV_YOLU}{kat["slug"]}/">{e(kat["ad"])}</a></h3>
          <p class="arsiv-sayi" data-arama-gizle>{len(kat["kartlar"])} sorun</p>
          <ul class="arsiv-basliklar">{basliklar}</ul>
        </li>""")
        bolumler.append(f"""<section class="arsiv-bolum" data-urun-bolum aria-labelledby="bolum-{b["slug"]}">
      <h2 id="bolum-{b["slug"]}" class="h3-boy">{e(b["ad"])}</h2>
      <ul class="arsiv-kategoriler">{"".join(kategoriler)}</ul>
    </section>""")
    atla = "".join(f'<li><a href="#bolum-{b["slug"]}">{e(b["ad"])}</a></li>' for b in veri["bolumler"])
    govde = f"""<section class="sayfa-bas">
  <div class="kap">
    {yol_izi([("/", "Ana sayfa"), (None, ARSIV_AD)])}
    {ikon("kitap", "ikon ikon-buyuk")}
    <h1>{e(ARSIV_AD)}</h1>
    <p>Fabrikada sık görülen {toplam} sorun, {n_kat} konuda: her biri için belirti, kök neden ve üç adımlık çözüm.</p>
  </div>
</section>
<section class="bolum-raf" aria-label="Arşiv dizini">
  <div class="kap">
    <div class="filtre" data-filtre data-birim="sorun">
      <div class="arama">{ikon("ara")}<label class="gizli" for="ara">Arşivde ara</label><input id="ara" type="search" placeholder="Sorun ara: termin, sayım, kalıp…" autocomplete="off"></div>
    </div>
    <p class="sonuc" data-sonuc aria-live="polite"></p>
    <nav class="arsiv-atla" aria-label="Bölümler" data-arama-gizle><ul>{atla}</ul></nav>
    {"".join(bolumler)}
    <p class="arsiv-not">{e(ARSIV_NOTU)}</p>
  </div>
</section>"""
    return sayfa(ARSIV_YOLU, f"{ARSIV_AD}: {toplam} fabrika sorunu ve çözümü",
                 f"Üretim planlamadan stoğa, kaliteden bakıma {toplam} fabrika sorunu: her biri için belirti, kök neden "
                 f"ve üç adımlık çözüm. Ücretsiz, üyelik yok.", govde, etkin=ARSIV_YOLU)


def arsiv_kategori_sayfasi(b, kat, onceki, sonraki, urun_bilgisi):
    kartlar = kat["kartlar"]
    icindekiler = "".join(f'<li><a href="#{e(k["slug"])}">{e(k["baslik"])}</a></li>' for k in kartlar)
    gezinti = []
    if onceki:
        gezinti.append(f'<a class="dugme-cizgi" href="{ARSIV_YOLU}{onceki["slug"]}/" rel="prev">{ikon("geri")}{e(onceki["ad"])}</a>')
    gezinti.append(f'<a class="dugme-cizgi" href="{ARSIV_YOLU}">Tüm arşiv</a>')
    if sonraki:
        gezinti.append(f'<a class="dugme-cizgi" href="{ARSIV_YOLU}{sonraki["slug"]}/" rel="next">{e(sonraki["ad"])}{ikon("ok")}</a>')
    govde = f"""<section class="sayfa-bas">
  <div class="kap">
    {yol_izi([("/", "Ana sayfa"), (ARSIV_YOLU, ARSIV_AD), (None, kat["ad"])])}
    <p class="ust-yazi">{e(b["ad"])}</p>
    <h1>{e(kat["ad"])}</h1>
    <p>{len(kartlar)} sorun; her biri için belirti, kök neden ve üç adımlık çözüm.</p>
  </div>
</section>
<section class="bolum-raf" aria-label="{e(kat["ad"])} sorunları">
  <div class="kap">
    <nav class="arsiv-icindekiler" aria-label="Bu sayfadaki sorunlar"><ol>{icindekiler}</ol></nav>
    <div class="arsiv-kartlar">
{"".join(arsiv_karti(k, urun_bilgisi) for k in kartlar)}
    </div>
    <nav class="arsiv-gezinti" aria-label="Arşivde gezin">{"".join(gezinti)}</nav>
    <p class="arsiv-not">{e(ARSIV_NOTU)}</p>
  </div>
</section>"""
    kalan = len(kartlar) - 1
    aciklama = (f'{kat["ad"]}: "{kartlar[0]["baslik"]}"{f" ve {kalan} sorun daha" if kalan else ""}; '
                "belirti, kök neden ve üç adımlık çözümle.")
    baslik = f"{kat['ad']} sorunları ve çözümleri"
    if len(baslik) + len(" · Celcini") > 60:
        baslik = f"{kat['ad']} sorunları"
    return sayfa(f"{ARSIV_YOLU}{kat['slug']}/", baslik, aciklama, govde, etkin=ARSIV_YOLU)


def sayfa_404():
    govde = f"""<section class="yok"><div class="kap">
  <p class="ust-yazi">404</p>
  <h1>Bu sayfa bulunamadı.</h1>
  <p>Adres değişmiş ya da yanlış yazılmış olabilir.</p>
  <div class="eylemler">
    <a class="dugme" href="/">Ana sayfaya dön{ikon("ok")}</a>
    <a class="dugme-cizgi" href="/fabricakit/">Fabricakit</a>
    {"".join(f'<a class="dugme-cizgi" href="/{r["slug"]}/">{e(r["ad"])}</a>' for r in RAFLAR)}
  </div>
</div></section>"""
    return sayfa("/404.html", "Sayfa bulunamadı", "Aradığınız sayfa bulunamadı.", govde)


# ---------------------------------------------------------------- doğrulama ve yazma
ZORUNLU = ["slug", "ad", "raf", "kisa", "aciklama", "ozellikler", "kimin_icin", "etiketler", "fiyat",
           "liste_fiyat", "shopier_url", "gorseller", "excel_surum", "makro", "sayfa_sayisi", "one_cikan", "ornek"]


# ---------------------------------------------------------------- rehberli dersler (Datakit; sonra Motor)
REHBER_ACIK = ("id", "sira", "sayfa_adi", "baslik", "ozet", "ucretsiz", "ajan_gm")


def rehber_kaynagi(rh):
    """data/<urun>/dersler.json'u okur ve denetler (sayfa dosyası, sıra, ücretsiz dersler başta)."""
    kaynak = json.loads((KOK / "data" / rh["urun"] / "dersler.json").read_text(encoding="utf-8"))
    for i, d in enumerate(kaynak["dersler"], 1):
        if d["sira"] != i:
            sys.exit(f"HATA: {rh['urun']}: {d['id']} dersinin sırası {d['sira']}, {i} olmalı")
        if d["ucretsiz"] != (i <= kaynak["ucretsiz_ders"]):
            sys.exit(f"HATA: {rh['urun']}: ücretsiz dersler ilk {kaynak['ucretsiz_ders']} ders olmalı ({d['id']})")
        if not (KOK / "data" / rh["urun"] / "sayfalar" / f"{d['id']}.json").exists():
            sys.exit(f"HATA: {rh['urun']}: data/{rh['urun']}/sayfalar/{d['id']}.json yok")
    return kaynak


def rehber_verisi(rh, kaynak):
    """Yayın verisi: herkese açık dizin (notların yalnız başlıkları) ve ücretsiz dersler <taban>veri/ altına;
    kilitli derslerin notları, sorusu ve sayfası api/_dersler/<urun>/ altına (yalnızca api/ders.js okur, statik yayınlanmaz).
    Önizlemede kilitli dersler yazılmaz (api çalışmaz)."""
    def json_yaz(yol, veri, girintili=False):
        yol.parent.mkdir(parents=True, exist_ok=True)
        metin = json.dumps(veri, ensure_ascii=False, indent=1) if girintili else json.dumps(veri, ensure_ascii=False, separators=(",", ":"))
        yol.write_text(metin + "\n", encoding="utf-8")

    acik = CIKTI / rh["taban"].strip("/") / "veri"
    gizli = KOK / "api" / "_dersler" / rh["urun"]
    for klasor in (acik / "ders",) + (() if ONIZLEME else (gizli,)):
        if klasor.exists():
            for f in klasor.glob("*.json"):
                f.unlink()
    dizin = {"surum": kaynak["surum"], "urun": rh["urun"], "ad": kaynak["ad"], "ucretsiz_ders": kaynak["ucretsiz_ders"], "dersler": []}
    for d in kaynak["dersler"]:
        kayit = {k: d[k] for k in REHBER_ACIK}
        if d.get("ajan_gm_ses"):
            kayit["ajan_gm_ses"] = d["ajan_gm_ses"]
        kayit["konular"] = [n["baslik"] for n in d["notlar"]]
        dizin["dersler"].append(kayit)
        sayfa_verisi = json.loads((KOK / "data" / rh["urun"] / "sayfalar" / f"{d['id']}.json").read_text(encoding="utf-8"))
        icerik = {"id": d["id"], "notlar": d["notlar"], "soru": d["soru"], "sayfa": sayfa_verisi}
        if d["ucretsiz"]:
            json_yaz(acik / "ders" / f"{d['id']}.json", icerik)
        elif not ONIZLEME:
            json_yaz(gizli / f"{d['id']}.json", icerik)
    json_yaz(acik / "dersler.json", dizin, girintili=True)


def rehber_gm_karti(metin, ses="", sinif=""):
    """Ajan GM kartı: avatar, cümle ve "Sesli oku" yeri (düğmeyi rehber.js koyar; cihazda erkek ses yoksa görünmez)."""
    webp, png = "/assets/img/ajan-gm-avatar.webp", "/assets/img/ajan-gm-avatar.png"
    ses_oz = f' data-ses="{e(ses)}"' if ses else ""
    siniflar = " ".join(["kart", "rh-gm"] + ([sinif] if sinif else []))
    return f"""<div class="{siniflar}">
      <picture class="rh-gm-gorsel"><source type="image/webp" srcset="{webp}?v={surum(webp)}"><img src="{png}?v={surum(png)}" alt="" width="512" height="512" decoding="async"></picture>
      <div class="rh-gm-metin">
        <p class="rh-gm-ad">Ajan GM</p>
        <p class="rh-gm-soz" data-rehber-gm{ses_oz}>{e(metin)}</p>
        <span class="rh-gm-ses" data-rehber-ses></span>
      </div>
    </div>"""


def rehber_urunu(rh, urunler):
    return next((u for u in urunler if u["slug"] == rh["urun_slug"]), None)


def rehber_ders_sayfasi(rh, kaynak, d, urunler):
    taban, n = rh["taban"], len(kaynak["dersler"])
    u = rehber_urunu(rh, urunler)
    shopier = (u.get("shopier_url") or "").strip() if u else ""
    durum = "Ücretsiz" if d["ucretsiz"] else "Erişim koduyla"
    konular = "".join(f"<li>{e(x['baslik'])}</li>" for x in d["notlar"])
    govde = f"""<section class="sayfa-bas rh-bas">
  <div class="kap">
    {yol_izi([("/", "Ana sayfa")] + ([] if rehber_raf_yerine(rh) else [(f"/{rh['raf']}/", RAF[rh["raf"]]["ad"])]) + [(taban, kaynak["ad"]), (None, d["sayfa_adi"])])}
    <p class="rh-ders-no">Ders {d["sira"]} / {n} · {durum}</p>
    <h1>{e(d["sayfa_adi"])}</h1>
    <p>{e(d["baslik"])}</p>
    {rehber_gm_karti(d["ajan_gm"], d.get("ajan_gm_ses", ""))}
    <p class="rh-veri-satiri">{e(d.get("veri_notu") or kaynak["acilis"]["ders_veri_notu"])}</p>
  </div>
</section>
<section class="rh-govde" aria-label="{e(d["sayfa_adi"])} sayfası ve notları">
  <div class="kap">
    <div class="rehber" data-rehber data-urun="{rh["urun"]}" data-ders="{d["id"]}" data-veri="{taban}veri/" data-api="/api/ders/" data-taban="{taban}" data-shopier="{e(shopier)}">
      <div class="rh-onbilgi">
        <p>{e(d["ozet"])}</p>
        <h2 class="h3-boy">Bu derste</h2>
        <ul>{konular}</ul>
        <noscript><p>Excel sayfasını ve notları görmek için tarayıcınızda JavaScript'i açın.</p></noscript>
      </div>
    </div>
  </div>
</section>"""
    return sayfa(f"{taban}{d['id']}/", f"{d['sayfa_adi']} · {kaynak['ad']}", d["ozet"], govde,
                 etkin=f"/{rh['raf']}/", ek_css=("/assets/css/rehber.css",), modul="/assets/js/rehber/rehber.js")


def rehber_acilis_sayfasi(rh, kaynak, urunler):
    """Rehberin açılış sayfası (raf sayfasının yerine): Ajan GM, nasıl çalışır, ders haritası, dosyalar ve SSS."""
    r, a, taban = RAF[rh["raf"]], kaynak["acilis"], rh["taban"]
    dersler = kaynak["dersler"]
    ilk_kilitli = next((d for d in dersler if not d["ucretsiz"]), None)
    kartlar = "".join(f"""<li><a class="kart rh-ders-kart" href="{taban}{d["id"]}/" data-ders-id="{d["id"]}">
      <span class="rh-ders-ust"><span>Ders {d["sira"]} · {"Ücretsiz" if d["ucretsiz"] else "Erişim koduyla"}</span>{ikon("tablo" if d["ucretsiz"] else "kilit")}</span>
      <h3>{e(d["sayfa_adi"])}</h3>
      <p>{e(d["baslik"])}</p>
    </a></li>""" for d in dersler)
    adimlar = "".join(f'<li class="kart rh-adim"><h3>{e(x["baslik"])}</h3><p>{e(x["metin"])}</p></li>' for x in a["adimlar"])
    paket = "".join(f"<li>{ikon('tik')}<span>{e(x)}</span></li>" for x in a["paket"])
    u = rehber_urunu(rh, urunler)
    url = (u.get("shopier_url") or "").strip() if u else ""
    if url:
        al = f'<a class="dugme" href="{e(url)}" rel="noopener">Shopier\'de al{ikon("ok")}</a>'
    else:
        al = ('<span class="dugme-pasif" aria-disabled="true">Shopier\'de yakında</span>'
              f'<a class="dugme-cizgi" data-link="shopier_magaza" href="#" hidden>Shopier mağazasına git{ikon("ok")}</a>')
    urun_linki = f'<a class="dugme-cizgi" href="/urun/{e(u["slug"])}/">Dosyanın ayrıntıları</a>' if u else ""
    gorseller = gorsel_listesi(u) if u else []
    onizleme = ""
    if gorseller:
        g = gorseller[0]
        gorsel_ek = ' alt="' + e(g["alt"]) + '" decoding="async"'
        onizleme = (f'<a class="kart rh-onizleme" href="{taban}{dersler[0]["id"]}/">{resim(g, gorsel_ek)}'
                    f'<span class="rh-onizleme-yazi">{e(dersler[0]["sayfa_adi"])} dersi: dosyadaki değerler, renkler ve grafikler{ikon("ok")}</span></a>')
    raf_urunleri = [x for x in urunler if x["raf"] == r["slug"]] if rehber_raf_yerine(rh) else []
    raf_bolumu = ""
    if raf_urunleri:
        raf_bolumu = f"""<section class="bolum" aria-labelledby="raf-baslik">
  <div class="kap">
    <div class="bolum-bas"><h2 id="raf-baslik">{e(r["ad"])} rafı</h2><p>{e(r["aciklama"])}</p></div>
    <ul class="izgara izgara-urun">{"".join(urun_karti(x, raf_goster=False) for x in raf_urunleri)}</ul>
  </div>
</section>"""
    govde = f"""<section class="sayfa-bas rh-bas">
  <div class="kap">
    {yol_izi([("/", "Ana sayfa"), ("/#dosyalar", "Dosyalar") if rehber_raf_yerine(rh) else (f"/{r['slug']}/", r["ad"]), (None, a["baslik"])])}
    {ikon(r["ikon"], "ikon ikon-buyuk")}
    <h1>{e(a["baslik"])}</h1>
    <p>{e(a["alt_baslik"])}</p>
    {rehber_gm_karti(a["ajan_gm"], a.get("ajan_gm_ses", ""), "rh-acilis-gm")}
    <div class="eylemler">
      <a class="dugme" href="{taban}{dersler[0]["id"]}/">İlk derse başla{ikon("ok")}</a>
      <a class="dugme-cizgi" href="#dersler">{len(dersler)} dersin listesi</a>
    </div>
    {onizleme}
  </div>
</section>
<section class="bolum" aria-labelledby="nasil-baslik">
  <div class="kap">
    <div class="bolum-bas"><h2 id="nasil-baslik">Nasıl çalışır</h2><p>{e(a["aciklama"])}</p></div>
    <ol class="rh-adimlar">{adimlar}</ol>
  </div>
</section>
<section class="bolum" id="dersler" aria-labelledby="dersler-baslik">
  <div class="kap">
    <div class="bolum-bas"><h2 id="dersler-baslik">{len(dersler)} ders</h2><p>İlk {kaynak["ucretsiz_ders"]} ders ücretsiz.{f" {ilk_kilitli['sira']}. dersten itibaren dersler, dosyalarla gelen erişim koduyla açılır." if ilk_kilitli else ""}</p></div>
    <ol class="rh-dersler" data-rehber-dersler data-urun="{rh["urun"]}">{kartlar}</ol>
  </div>
</section>
<section class="bolum" aria-labelledby="paket-baslik">
  <div class="kap iki-sutun">
    <div class="kart">
      <h2 id="paket-baslik" class="h3-boy">Dosyalar ve erişim kodu</h2>
      <ul class="rh-paket">{paket}</ul>
      <div class="eylemler">{al}{urun_linki}</div>
    </div>
    <div class="sss">{sss_html([(x["soru"], x["cevap"]) for x in a["sss"]])}</div>
  </div>
</section>
{raf_bolumu}
<section class="bolum" aria-label="Örnek veri">
  <div class="kap"><p class="rh-veri-notu">{e(a["veri_notu"])}</p></div>
</section>"""
    aciklama = f"{a['baslik']}: {a['alt_baslik'].lower()}. {len(dersler)} rehberli ders, ilk {kaynak['ucretsiz_ders']} ders ücretsiz. {SITE_CUMLESI}"
    return sayfa(taban, f"{a['baslik']}: {a['alt_baslik']}", aciklama, govde, etkin=f"/{r['slug']}/",
                 ek_css=("/assets/css/rehber.css",), modul="/assets/js/rehber/rehber.js")


def urunleri_oku():
    veri = json.loads((KOK / "data" / "urunler.json").read_text(encoding="utf-8"))
    sluglar = set()
    for u in veri:
        eksik = [a for a in ZORUNLU if a not in u]
        if eksik:
            sys.exit(f"HATA: {u.get('slug', '?')} kaydında eksik alan: {', '.join(eksik)}")
        if u["raf"] not in RAF:
            sys.exit(f"HATA: {u['slug']}: bilinmeyen raf '{u['raf']}'")
        if not u["slug"].replace("-", "").isalnum() or u["slug"] != u["slug"].lower() or not u["slug"].isascii():
            sys.exit(f"HATA: geçersiz slug '{u['slug']}' (yalnızca küçük harf, rakam ve tire)")
        if u["slug"] in sluglar:
            sys.exit(f"HATA: tekrarlanan slug '{u['slug']}'")
        sluglar.add(u["slug"])
        url = (u["shopier_url"] or "").strip()
        if url and not url.startswith("https://"):
            sys.exit(f"HATA: {u['slug']}: shopier_url https:// ile başlamalı")
        dosya = (u.get("ucretsiz_dosya") or "").strip()
        if dosya and (url or fiyat_var(u)):
            sys.exit(f"HATA: {u['slug']}: ücretsiz dosyanın shopier_url'si ve fiyatı boş olmalı")
        if dosya and not (dosya.startswith("/dosyalar/") and dosya.endswith(".xlsx") and (KOK / dosya.lstrip("/")).is_file()):
            sys.exit(f"HATA: {u['slug']}: ucretsiz_dosya /dosyalar/ altında var olan bir .xlsx olmalı ({dosya})")

    return veri


def yaz(yol, icerik):
    hedef = CIKTI / ("404.html" if yol == "/404.html" else yol.strip("/") + "/index.html" if yol != "/" else "index.html")
    hedef.parent.mkdir(parents=True, exist_ok=True)
    hedef.write_text(icerik, encoding="utf-8")
    return hedef


def main():
    tumu = urunleri_oku()
    urunler = [u for u in tumu if gorunur(u)]
    gizlenen = [u["slug"] for u in tumu if not gorunur(u)]
    arsiv = arsivi_oku(urunler)
    arsiv_kategorileri = [(b, kat) for b in arsiv["bolumler"] for kat in b["kategoriler"]]
    arsiv_bag = arsiv_urun_baglantilari(arsiv)
    urun_bilgisi = {u["slug"]: (u["ad"], ucretsiz(u)) for u in urunler}

    if ONIZLEME:
        if CIKTI.exists():
            shutil.rmtree(CIKTI)
        CIKTI.mkdir()
        shutil.copytree(KOK / "assets", CIKTI / "assets")
        for d in ("fabricakit/css", "fabricakit/js", "fabricakit/img", "uzay/araclar/_sablon", "uzay/rota/css", "uzay/rota/js", "uzay/ikiz/css", "uzay/ikiz/js"):
            shutil.copytree(KOK / d, CIKTI / d, ignore=shutil.ignore_patterns("index.html"))
        for f in ("favicon.ico", "site.webmanifest"):
            shutil.copy2(KOK / f, CIKTI / f)
        if (KOK / "dosyalar").exists():  # ücretsiz dosyalar (data/urunler.json: ucretsiz_dosya)
            shutil.copytree(KOK / "dosyalar", CIKTI / "dosyalar")
        (CIKTI / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
    else:
        (CIKTI / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
        # Artık JSON'da olmayan (ya da gizlenen) ürünlerin eski sayfalarını sil
        urun_dizin = CIKTI / "urun"
        if urun_dizin.exists():
            gecerli = {u["slug"] for u in urunler}
            for d in urun_dizin.iterdir():
                if d.is_dir() and d.name not in gecerli:
                    shutil.rmtree(d)
        # Arşivden çıkan ya da adı değişen kategorilerin eski sayfalarını sil
        assert ARSIV_YOLU.strip("/"), "ARSIV_YOLU kök olamaz (temizlik depo kökünü silerdi)"
        arsiv_dizin = CIKTI / ARSIV_YOLU.strip("/")
        if arsiv_dizin.exists():
            gecerli = {kat["slug"] for _, kat in arsiv_kategorileri}
            for d in arsiv_dizin.iterdir():
                if d.is_dir() and d.name not in gecerli:
                    shutil.rmtree(d)

    yollar = []
    yollar.append(yaz("/", ana_sayfa(urunler, arsiv)))
    yollar.append(yaz("/fabricakit/", fabricakit_sayfasi()))
    rehber_raflari = {rh["raf"] for rh in REHBERLER if rehber_raf_yerine(rh)}
    rehber_adresleri = []
    for rh in REHBERLER:
        kaynak = rehber_kaynagi(rh)
        rehber_verisi(rh, kaynak)
        yollar.append(yaz(rh["taban"], rehber_acilis_sayfasi(rh, kaynak, urunler)))
        for d in kaynak["dersler"]:
            yollar.append(yaz(f"{rh['taban']}{d['id']}/", rehber_ders_sayfasi(rh, kaynak, d, urunler)))
            rehber_adresleri.append(f"{rh['taban']}{d['id']}/")
        if not rehber_raf_yerine(rh):
            rehber_adresleri.insert(len(rehber_adresleri) - len(kaynak["dersler"]), rh["taban"])
    for r in RAFLAR:
        if r["slug"] not in rehber_raflari:
            yollar.append(yaz(f"/{r['slug']}/", raf_sayfasi(r, urunler)))
    for u in urunler:
        yollar.append(yaz(f"/urun/{u['slug']}/", urun_sayfasi(u, urunler, arsiv_bag.get(u["slug"], ()))))
    yollar.append(yaz(ARSIV_YOLU, arsiv_sayfasi(arsiv)))
    for i, (b, kat) in enumerate(arsiv_kategorileri):
        onceki = arsiv_kategorileri[i - 1][1] if i > 0 else None
        sonraki = arsiv_kategorileri[i + 1][1] if i + 1 < len(arsiv_kategorileri) else None
        yollar.append(yaz(f"{ARSIV_YOLU}{kat['slug']}/", arsiv_kategori_sayfasi(b, kat, onceki, sonraki, urun_bilgisi)))
    yollar.append(yaz("/uzay/", uzay_sayfasi()))
    yollar.append(yaz("/uzay/rota/", rota_sayfasi()))
    yollar.append(yaz("/uzay/ikiz/", ikiz_sayfasi()))
    yollar.append(yaz("/uzay/araclar/_sablon/", uzay_araci(
        "_sablon", "Araç adı", "Aracın ne yaptığını bir cümlede anlatın.", noindex=True)))
    yollar.append(yaz("/hakkinda/", hakkinda()))
    yollar.append(yaz("/iletisim/", iletisim()))
    yollar.append(yaz("/sss/", sss_sayfasi()))
    yollar.append(yaz("/gizlilik/", gizlilik()))
    yollar.append(yaz("/teslimat-ve-iade/", teslimat()))
    yollar.append(yaz("/404.html", sayfa_404()))

    adresler = ["/", "/fabricakit/"] + [f"/{r['slug']}/" for r in RAFLAR] + rehber_adresleri + [f"/urun/{u['slug']}/" for u in urunler] + [
        ARSIV_YOLU] + [f"{ARSIV_YOLU}{kat['slug']}/" for _, kat in arsiv_kategorileri] + [
        "/uzay/", "/uzay/rota/", "/uzay/ikiz/", "/hakkinda/", "/iletisim/", "/sss/", "/gizlilik/", "/teslimat-ve-iade/"]
    harita = ['<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for a in adresler:
        harita.append(f"  <url><loc>{SITE}{a}</loc><lastmod>{BUGUN}</lastmod></url>")
    harita.append("</urlset>\n")
    (CIKTI / "sitemap.xml").write_text("\n".join(harita), encoding="utf-8")

    kip = "ÖNİZLEME → _onizleme/" if ONIZLEME else "ÜRETİM → depo kökü"
    bedava = sum(1 for u in urunler if ucretsiz(u))
    kart_sayisi, _ = arsiv_sayilari(arsiv)
    print(f"{kip}: {len(yollar)} sayfa, {len(urunler)} ürün{f' ({bedava} ücretsiz)' if bedava else ''}, "
          f"arşiv {len(arsiv_kategorileri)} kategori / {kart_sayisi} kart, sitemap {len(adresler)} adres.")
    if gizlenen:
        print(f"Gizlenen kayıtlar (örnek ya da Shopier bağlantısı boş): {', '.join(gizlenen)}")
    yakinda = [u["slug"] for u in urunler if u.get("yakinda") and not (u.get("shopier_url") or "").strip()]
    if yakinda and not ONIZLEME:
        print(f"Shopier'de yakında (bağlantı bekleniyor): {', '.join(yakinda)}")


if __name__ == "__main__":
    main()
