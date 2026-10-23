#!/usr/bin/env python3
"""Celcini site derleyicisi (yalnızca Python standart kütüphanesi).

    python3 scripts/derle.py              üretim: depo köküne yazar (Vercel bunu yayınlar)
    python3 scripts/derle.py --onizleme   önizleme: _onizleme/ klasörüne yazar, örnek kayıtlar "ÖRNEK" etiketiyle görünür

Üretimde "ornek": true olan ve shopier_url'si boş olan kayıtlar hiçbir yerde görünmez.
Tüm ürünler data/urunler.json'dan gelir. Bağlantılar (Shopier mağaza, form, e-posta, Instagram)
tarayıcıda assets/js/config.js'den uygulanır.
Fabricakit'in dokuz odası fabricakit/js/odalar.js'den okunur (ana sayfadaki oda şeridi).
/fabricakit/ sayfasının yalnızca kabuğu burada üretilir; simülatörün kendisi fabricakit/js/ altındadır.
"""
import datetime
import hashlib
import html
import json
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ikonlar import ikon  # noqa: E402

KOK = Path(__file__).resolve().parent.parent
SITE = "https://celcini.com"
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
     "aciklama": "Genel iş şablonları (kasa, alacak-borç, sipariş, personel)"},
    {"slug": "datakit", "ad": "Datakit", "ikon": "grafik",
     "aciklama": "Veri analizi süreçleri (satış analizi, ölü stok, talep tahmini)"},
]
RAF = {r["slug"]: r for r in RAFLAR}
# Menü: ("/yol/", "Ad") ya da ("Ad", [alt öğeler]) — alt menü
MENU = [("/fabricakit/", "Fabricakit"),
        ("Dosyalar", [(f"/{r['slug']}/", r["ad"]) for r in RAFLAR]),
        ("/uzay/", "Uzay"), ("/hakkinda/", "Hakkında")]
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


def surum(yol):
    return hashlib.md5((KOK / yol.lstrip("/")).read_bytes()).hexdigest()[:8]


def gorunur(u):
    if ONIZLEME:
        return True
    return not u.get("ornek") and bool((u.get("shopier_url") or "").strip())


def gorsel_listesi(u):
    sonuc = []
    for g in u.get("gorseller") or []:
        if isinstance(g, str):
            sonuc.append({"src": g, "alt": f"{u['ad']} ekran görüntüsü"})
        elif isinstance(g, dict) and g.get("src"):
            sonuc.append({"src": g["src"], "alt": g.get("alt") or f"{u['ad']} ekran görüntüsü"})
    return sonuc


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
    ara = " ".join([u["ad"], u["kisa"], " ".join(u.get("etiketler", []))])
    return f"""<li data-urun data-ara="{e(ara)}" data-etiketler="{e("|".join(u.get("etiketler", [])))}">
  <article class="kart urun-kart">
    <div class="ust">{"".join(ust)}</div>
    <h3><a href="/urun/{e(u["slug"])}/">{e(u["ad"])}</a></h3>
    <p>{e(u["kisa"])}</p>
    <div class="alt"><span class="liste-fiyat"><span class="gizli">Liste fiyatı </span>{tl(u["liste_fiyat"])}</span><span class="fiyat"><span class="gizli">Açılış fiyatı </span>{tl(u["fiyat"])}</span></div>
  </article>
</li>"""


def raf_karti(r, sayi):
    sayi_metin = f"{sayi} ürün" if sayi else "Raf hazırlanıyor"
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
    return f'<ul class="oda-serit">{"".join(ogeler)}</ul>'


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
    olculer = "".join(f'<div class="karne-olcu"><dt>{e(o["ad"])}</dt><dd><span class="karne-olcu-deger">{e(o["deger"])}</span>'
                      f'<span class="karne-olcu-alt">{e(o["alt"])}</span></dd></div>' for o in k["olculer"])
    sorular = "".join(f'<li class="karne-soru">{e(s)}</li>' for s in k["sorular"])
    return f"""<section class="bolum" id="karne" aria-labelledby="karne-baslik">
  <div class="kap karne-duzen">
    <div class="bolum-bas">
      <p class="ust-yazi">Gün sonu karnesi</p>
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
        <div class="karne-gm-metin"><p class="karne-gm-ad">Ajan GM</p><p class="karne-gm-yorum">{e(k["gmYorum"])}</p></div>
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


def ana_sayfa(urunler):
    sayilar = {r["slug"]: sum(1 for u in urunler if u["raf"] == r["slug"]) for r in RAFLAR}
    raf_kartlari = "".join(raf_karti(r, sayilar[r["slug"]]) for r in RAFLAR)
    fabrika, odalar = odalari_oku()
    tabela_cumlesi = (" Kapı tabelasında gezegen adı büyük, gerçek adı küçük yazar; Ajan GM odaları gezegen adıyla anar."
                      if any(o.get("kod") for o in odalar) else "")
    # Sıra: kahraman (Ajan GM) → Dokuz oda + harita → Nasıl çalışır → Karne örneği → Dosyalar → Uzay.
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

<section class="bolum" aria-labelledby="odalar-baslik">
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

<section class="bolum" id="nasil" aria-labelledby="nasil-baslik">
  <div class="kap">
    <div class="bolum-bas"><h2 id="nasil-baslik">Nasıl çalışır</h2><p>Bir oyun günü 08:00'de başlar, 18:00'de biter. Saati istediğin an durdurabilirsin.</p></div>
    <ol class="izgara izgara-3">
      <li class="kart adim">{ikon("posta", "ikon ikon-buyuk")}<span class="no">1. Sipariş gelir</span><p>Sabah Satış-Pazarlama'dan günün siparişleri düşer: birkaç müşteri, 30 günlük ufuk. Yanında görev notu açılır.</p></li>
      <li class="kart adim">{ikon("tablo", "ikon ikon-buyuk")}<span class="no">2. Planla, satın al</span><p>Siparişi plana koy, malzeme ihtiyacını gör, eksik malzemeyi sipariş et. Tedarikçi onayını sayaç dolmadan al.</p></li>
      <li class="kart adim">{ikon("kalkan", "ikon ikon-buyuk")}<span class="no">3. Karneni al</span><p>Gün sonunda zamanında teslim, hat duruşu, depoda bağlanan para ve unutulan işler karnede. Notu Ajan GM verir.</p></li>
    </ol>
  </div>
</section>

{karne_ornegi()}

<section class="bolum" id="dosyalar" aria-labelledby="dosyalar-baslik">
  <div class="kap">
    <div class="bolum-bas"><p class="ust-yazi">Dosyalar</p><h2 id="dosyalar-baslik">Derin Excel havuzu</h2><p>Sahada test edilmiş, kurulumsuz Excel dosyaları; işe göre üç rafta.</p></div>
    <ul class="izgara izgara-3">{raf_kartlari}</ul>
  </div>
</section>

<section class="bolum" aria-labelledby="uzay-baslik">
  <div class="kap">
    <a class="kart uzay-kart" href="/uzay/">
      {ikon("roket", "ikon ikon-buyuk")}
      <span class="uzay-metin"><span class="ust-yazi">Uzay</span><h2 id="uzay-baslik" class="h3-boy">Yapay zeka araçları</h2>
      <span class="uzay-alt">İlk araç Fabricakit. Sırada Ölü Stok Dedektörü var.</span></span>
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
    liste = [u for u in urunler if u["raf"] == r["slug"]]
    if liste:
        etiketler = sorted({t for u in liste for t in u.get("etiketler", [])}, key=lambda s: s.lower())
        etiket_dugmeleri = '<button class="etiket-dugme" type="button" data-etiket="" aria-pressed="true">Tümü</button>' + "".join(
            f'<button class="etiket-dugme" type="button" data-etiket="{e(t)}" aria-pressed="false">{e(t)}</button>'
            for t in etiketler)
        icerik = f"""<h2 class="gizli">{e(r["ad"])} ürünleri</h2>
    <div class="filtre" data-filtre>
      <div class="arama">{ikon("ara")}<label class="gizli" for="ara">{e(r["ad"])} rafında ara</label><input id="ara" type="search" placeholder="Rafta ara" autocomplete="off"></div>
      <div class="etiketler" role="group" aria-label="Etikete göre süz">{etiket_dugmeleri}</div>
    </div>
    <p class="sonuc" data-sonuc aria-live="polite"></p>
    <ul class="izgara izgara-urun">{"".join(urun_karti(u, raf_goster=False) for u in liste)}</ul>"""
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
    govde = f"""<section class="sayfa-bas">
  <div class="kap">
    {yol_izi([("/", "Ana sayfa"), ("/#dosyalar", "Dosyalar"), (None, r["ad"])])}
    {ikon(r["ikon"], "ikon ikon-buyuk")}
    <h1>{e(r["ad"])}</h1>
    <p>{e(r["aciklama"])}</p>
  </div>
</section>
<section class="bolum-raf" aria-label="{e(r["ad"])} ürünleri">
  <div class="kap">
    {icerik}
  </div>
</section>"""
    return sayfa(f"/{r['slug']}/", r["ad"], f"{r['ad']}: {r['aciklama']}. {SITE_CUMLESI}", govde,
                 etkin=f"/{r['slug']}/")


def urun_sayfasi(u, urunler):
    r = RAF[u["raf"]]
    gorseller = gorsel_listesi(u)
    if gorseller:
        ilk = gorseller[0]
        kucukler = ""
        if len(gorseller) > 1:
            kucukler = '<ul class="galeri-kucuk">' + "".join(
                f'<li><button type="button" data-galeri-kucuk data-src="{e(g["src"])}" data-alt="{e(g["alt"])}" '
                f'aria-current="{"true" if i == 0 else "false"}" aria-label="Görsel {i + 1}">'
                f'<img src="{e(g["src"])}" alt="" loading="lazy"></button></li>'
                for i, g in enumerate(gorseller)) + "</ul>"
        galeri = (f'<div class="galeri"><div class="kart galeri-ana"><img data-galeri-ana src="{e(ilk["src"])}" '
                  f'alt="{e(ilk["alt"])}"></div>{kucukler}</div>')
    else:
        galeri = (f'<div class="kart galeri-bos">{ikon("gorsel", "ikon ikon-buyuk")}'
                  f'<p>Ekran görüntüleri hazırlanıyor.</p></div>')

    rozetler = [f'<a href="/{r["slug"]}/">{e(r["ad"])}</a>']
    if u.get("ornek"):
        rozetler.append('<span class="etiket etiket-ornek">ÖRNEK</span>')
    if u.get("one_cikan"):
        rozetler.append('<span class="etiket etiket-turuncu">Öne çıkan</span>')

    url = (u.get("shopier_url") or "").strip()
    if url:
        al = (f'<a class="dugme" href="{e(url)}" rel="noopener">Shopier\'de al{ikon("ok")}</a>')
    else:
        al = '<span class="dugme-pasif">Shopier bağlantısı henüz yok</span>'

    ozellikler = "".join(f'<li>{ikon("tik")}<span>{e(o)}</span></li>' for o in u.get("ozellikler", []))
    etiketler = "".join(etiket_html(t) for t in u.get("etiketler", []))
    makro = "Var" if u.get("makro") else "Yok (makrosuz)"

    benzer = [x for x in urunler if x["raf"] == u["raf"] and x["slug"] != u["slug"]][:3]
    benzer_bolum = ""
    if benzer:
        benzer_bolum = f"""<section class="bolum" aria-labelledby="benzer-baslik">
  <div class="bolum-bas"><h2 id="benzer-baslik">Aynı raftan</h2></div>
  <ul class="izgara izgara-urun">{"".join(urun_karti(x, raf_goster=False) for x in benzer)}</ul>
</section>"""

    govde = f"""<div class="kap urun-sayfa">
  <div class="sayfa-bas">{yol_izi([("/", "Ana sayfa"), ("/#dosyalar", "Dosyalar"), (f"/{r['slug']}/", r["ad"]), (None, u["ad"])])}</div>
  <div class="urun-ust">
    <div class="urun-bilgi">
      <div class="ust">{"".join(rozetler)}</div>
      <h1>{e(u["ad"])}</h1>
      <p class="ozet">{e(u["kisa"])}</p>
      <p class="aciklama">{e(u["aciklama"])}</p>
      <div class="kart satin-al">
        <div class="fiyatlar">
          <span class="liste-fiyat"><span class="gizli">Liste fiyatı </span>{tl(u["liste_fiyat"])}</span>
          <span class="fiyat"><span class="gizli">Açılış fiyatı </span>{tl(u["fiyat"])}</span>
        </div>
        <p class="not">Açılış fiyatı. Ödeme ve teslim Shopier'de yapılır; ayrıntılar <a href="/teslimat-ve-iade/">Teslimat ve iade</a> sayfasında.</p>
        {al}
      </div>
    </div>
    {galeri}
  </div>
  <section class="bolum" aria-labelledby="ne-baslik">
    <div class="iki-sutun">
      <div class="kart">
        <h2 id="ne-baslik" class="h3-boy">Ne yapar</h2>
        <ul class="ozellikler">{ozellikler}</ul>
      </div>
      <div class="kart">
        <h2 class="h3-boy">Teknik bilgi</h2>
        <dl class="teknik">
          <dt>Raf</dt><dd>{e(r["ad"])}</dd>
          <dt>Excel sürümü</dt><dd>{e(u["excel_surum"])}</dd>
          <dt>Makro</dt><dd>{makro}</dd>
          <dt>Sayfa sayısı</dt><dd>{int(u["sayfa_sayisi"])}</dd>
          <dt>Kurulum</dt><dd>Gerekmez</dd>
        </dl>
        <h2 class="h3-boy">Kimin için</h2>
        <p class="kimin">{e(u["kimin_icin"])}</p>
        <div class="etiketler">{etiketler}</div>
      </div>
    </div>
  </section>
  {benzer_bolum}
</div>"""

    ek = ""
    if url and not u.get("ornek"):
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
    return sayfa(f"/urun/{u['slug']}/", f"{u['ad']} · {r['ad']}", u["kisa"], govde,
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
<h2>Uzay</h2>
<p><a href="/uzay/">Uzay</a>, yapay zeka araçlarının modülü. İlk araç Fabricakit; sırada Ölü Stok Dedektörü var.</p>
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
    ic = """<p>Bu sayfa, celcini.com sitesini kullandığınızda kişisel verilerinizin nasıl işlendiğini 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) çerçevesinde açıklar.</p>
<h2>Bu site ne toplar?</h2>
<ul>
  <li>Site çerez kullanmaz, reklam ya da ziyaretçi analizi aracı çalıştırmaz.</li>
  <li>Site sizden ad, e-posta ya da ödeme bilgisi istemez. Fabricakit'teki hitap ve erişim kodu alanları aşağıda açıklanmıştır.</li>
  <li>Siteyi barındıran Vercel, güvenlik ve işletim için standart sunucu kayıtları (IP adresi, tarayıcı bilgisi, istek zamanı) tutabilir.</li>
</ul>
<h2>Fabricakit</h2>
<ul>
  <li>Oyun ilerlemeniz, Ajan GM'nin size nasıl hitap edeceği ve açtığınız günler yalnızca bu tarayıcının yerel deposunda (localStorage) tutulur. Üyelik yoktur; bu bilgiler sunucuya gönderilmez. Tarayıcı verilerini sildiğinizde kayıt da silinir.</li>
  <li>Erişim kodu: Kilidi açmak için girdiğiniz kod doğrulama için sunucuya gönderilir. Sunucu yalnızca kodun SHA-256 özetini satılan kodların listesiyle karşılaştırır; kodu saklamaz, kayıtlara yazmaz. Doğrulanan kod, kilidin açık kalması için yalnızca bu tarayıcıda tutulur.</li>
  <li>Ajan GM: Yorumlar varsayılan olarak tarayıcıda, hazır şablonlardan üretilir ve hiçbir veri gönderilmez. Yapay zeka modu açılırsa günün karnesindeki oyun verileri (puan, teslim, hat duruşu, olaylar gibi) ve Ajan GM'ye yazdığınız soru, yanıt üretmek için ABD merkezli yapay zeka sağlayıcısı Anthropic'e iletilir; bu mod yalnızca kod girenlere açıksa erişim kodunuz da her istekte yeniden doğrulanmak üzere sunucuya gönderilir. Hitabınız gönderilmez ve bu veriler Celcini tarafından saklanmaz. Sorularınıza kişisel bilgi yazmayın.</li>
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
    <p>Yapay zeka araçları. Tarayıcıda çalışır, kurulum istemez.</p>
  </div>
</section>
<section class="bolum-raf" aria-label="Uzay araçları">
  <div class="kap">
    <ul class="izgara izgara-2">
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
    return sayfa("/uzay/", "Uzay · Yapay zeka araçları",
                 "Uzay, Celcini'nin yapay zeka araçları. İlk araç Fabricakit, tarayıcıda fabrika simülasyonu; sırada Ölü Stok Dedektörü var.",
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

    if ONIZLEME:
        if CIKTI.exists():
            shutil.rmtree(CIKTI)
        CIKTI.mkdir()
        shutil.copytree(KOK / "assets", CIKTI / "assets")
        for d in ("fabricakit/css", "fabricakit/js", "fabricakit/img", "uzay/araclar/_sablon"):
            shutil.copytree(KOK / d, CIKTI / d, ignore=shutil.ignore_patterns("index.html"))
        for f in ("favicon.ico", "site.webmanifest"):
            shutil.copy2(KOK / f, CIKTI / f)
        (CIKTI / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
    else:
        # Artık JSON'da olmayan (ya da gizlenen) ürünlerin eski sayfalarını sil
        urun_dizin = CIKTI / "urun"
        if urun_dizin.exists():
            gecerli = {u["slug"] for u in urunler}
            for d in urun_dizin.iterdir():
                if d.is_dir() and d.name not in gecerli:
                    shutil.rmtree(d)

    yollar = []
    yollar.append(yaz("/", ana_sayfa(urunler)))
    yollar.append(yaz("/fabricakit/", fabricakit_sayfasi()))
    for r in RAFLAR:
        yollar.append(yaz(f"/{r['slug']}/", raf_sayfasi(r, urunler)))
    for u in urunler:
        yollar.append(yaz(f"/urun/{u['slug']}/", urun_sayfasi(u, urunler)))
    yollar.append(yaz("/uzay/", uzay_sayfasi()))
    yollar.append(yaz("/uzay/araclar/_sablon/", uzay_araci(
        "_sablon", "Araç adı", "Aracın ne yaptığını bir cümlede anlatın.", noindex=True)))
    yollar.append(yaz("/hakkinda/", hakkinda()))
    yollar.append(yaz("/iletisim/", iletisim()))
    yollar.append(yaz("/sss/", sss_sayfasi()))
    yollar.append(yaz("/gizlilik/", gizlilik()))
    yollar.append(yaz("/teslimat-ve-iade/", teslimat()))
    yollar.append(yaz("/404.html", sayfa_404()))

    adresler = ["/", "/fabricakit/"] + [f"/{r['slug']}/" for r in RAFLAR] + [f"/urun/{u['slug']}/" for u in urunler] + [
        "/uzay/", "/hakkinda/", "/iletisim/", "/sss/", "/gizlilik/", "/teslimat-ve-iade/"]
    harita = ['<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for a in adresler:
        harita.append(f"  <url><loc>{SITE}{a}</loc><lastmod>{BUGUN}</lastmod></url>")
    harita.append("</urlset>\n")
    (CIKTI / "sitemap.xml").write_text("\n".join(harita), encoding="utf-8")

    kip = "ÖNİZLEME → _onizleme/" if ONIZLEME else "ÜRETİM → depo kökü"
    print(f"{kip}: {len(yollar)} sayfa, {len(urunler)} ürün, sitemap {len(adresler)} adres.")
    if gizlenen:
        print(f"Gizlenen kayıtlar (örnek ya da Shopier bağlantısı boş): {', '.join(gizlenen)}")


if __name__ == "__main__":
    main()
