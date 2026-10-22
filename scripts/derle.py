#!/usr/bin/env python3
"""Celcini site derleyicisi (yalnızca Python standart kütüphanesi).

    python3 scripts/derle.py              üretim: depo köküne yazar (Vercel bunu yayınlar)
    python3 scripts/derle.py --onizleme   önizleme: _onizleme/ klasörüne yazar, örnek kayıtlar "ÖRNEK" etiketiyle görünür

Üretimde "ornek": true olan ve shopier_url'si boş olan kayıtlar hiçbir yerde görünmez.
Tüm ürünler data/urunler.json'dan gelir. Bağlantılar (Shopier mağaza, form, e-posta, Instagram)
tarayıcıda assets/js/config.js'den uygulanır.
"""
import datetime
import hashlib
import html
import json
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

SOZ = "Derin Excel havuzu."
ALT_SATIR = "Sahada test edilmiş, kurulumsuz Excel dosyaları. İstanbul, 2026."
FORMUL_TESTI = ("Her dosya havuza girmeden önce yeniden hesaplanır; "
                "sıfır formül hatasıyla geçmeyen dosya satışa çıkmaz.")

RAFLAR = [
    {"slug": "fabricakit", "ad": "Fabricakit", "ikon": "fabrika",
     "aciklama": "Fabrika programları (MRP, vardiya, stok, ithalat maliyet)"},
    {"slug": "excel-klinigi", "ad": "Excel Kliniği", "ikon": "klinik",
     "aciklama": "Genel iş şablonları (kasa, alacak-borç, sipariş, personel)"},
    {"slug": "datakit", "ad": "Datakit", "ikon": "grafik",
     "aciklama": "Veri analizi süreçleri (satış analizi, ölü stok, talep tahmini)"},
]
RAF = {r["slug"]: r for r in RAFLAR}
MENU = [("/fabricakit/", "Fabricakit"), ("/excel-klinigi/", "Excel Kliniği"),
        ("/datakit/", "Datakit"), ("/hakkinda/", "Hakkında")]

SSS = [
    ("Dosyayı nasıl satın alırım?",
     "Ürün sayfasındaki “Shopier'de al” butonu sizi Shopier'deki ürün sayfasına götürür. "
     "Ödeme ve dosyanın teslimi Shopier üzerinden yapılır."),
    ("Kurulum ya da abonelik gerekir mi?",
     "Hayır. Dosyayı bir kez alırsınız, Excel'de açar ve kullanırsınız. Ek program, eklenti ya da üyelik gerekmez."),
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


# ---------------------------------------------------------------- iskelet
def ust_serit(etkin):
    ogeler = "".join(
        f'<li><a href="{y}"{" aria-current=\"page\"" if y == etkin else ""}>{e(a)}</a></li>' for y, a in MENU)
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
      <p>{e(SOZ)} {e(ALT_SATIR)}</p>
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
          tur="website", ek_head="", tam_baslik=False):
    title = baslik if tam_baslik else f"{baslik} · Celcini"
    kanonik = SITE + (yol if yol != "/404.html" else "/")
    robots = '<meta name="robots" content="noindex">' if (ONIZLEME or yol == "/404.html") else ""
    serit = ('<div class="onizleme-serit">Önizleme: örnek kayıtlar görünür, bu derleme yayınlanmaz.</div>'
             if ONIZLEME else "")
    css, js_c, js_m = surum("/assets/css/style.css"), surum("/assets/js/config.js"), surum("/assets/js/main.js")
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


def eposta_listesi_bolumu():
    return f"""<section class="bolum" aria-labelledby="liste-baslik" data-gerekli="google_form" hidden>
  <div class="kap">
    <div class="kart liste-kutu">
      {ikon("posta", "ikon ikon-buyuk")}
      <h2 id="liste-baslik">Yeni dosyalardan haberdar olun</h2>
      <p>Havuza yeni dosya girdiğinde kısa bir e-posta gönderilir. Kayıt Google Form üzerinden alınır; istediğiniz zaman listeden çıkabilirsiniz.</p>
      <a class="dugme" data-link="google_form" href="#" hidden>Listeye katıl{ikon("ok")}</a>
    </div>
  </div>
</section>"""


# ---------------------------------------------------------------- sayfalar
def ana_sayfa(urunler):
    sayilar = {r["slug"]: sum(1 for u in urunler if u["raf"] == r["slug"]) for r in RAFLAR}
    raf_kartlari = "".join(raf_karti(r, sayilar[r["slug"]]) for r in RAFLAR)
    one = [u for u in urunler if u.get("one_cikan")][:6]
    one_bolum = ""
    if one:
        one_bolum = f"""<section class="bolum" aria-labelledby="one-baslik">
  <div class="kap">
    <div class="bolum-bas"><h2 id="one-baslik">Öne çıkan dosyalar</h2></div>
    <ul class="izgara izgara-urun">{"".join(urun_karti(u) for u in one)}</ul>
  </div>
</section>"""
    govde = f"""<section class="hero" aria-labelledby="soz">
  <div class="kap">
    <div class="hero-metin belir">
      <h1 id="soz">{e(SOZ)}</h1>
      <p class="hero-alt">{e(ALT_SATIR)}</p>
      <div class="hero-eylem">
        <a class="dugme" href="#raflar">Havuzu gez{ikon("ok")}</a>
        <span class="rozet">{ikon("kalkan")}Formül testinden geçer</span>
      </div>
    </div>
    <div class="gul-kart belir belir-2"><img src="/assets/img/logo-gul-beyaz.png" alt="" width="342" height="942" fetchpriority="high"></div>
  </div>
</section>

<section class="bolum" id="raflar" aria-labelledby="raflar-baslik">
  <div class="kap">
    <div class="bolum-bas"><h2 id="raflar-baslik">Üç raf</h2><p>Havuzdaki dosyalar işe göre üç rafta durur.</p></div>
    <ul class="izgara izgara-3">{raf_kartlari}</ul>
  </div>
</section>

{one_bolum}

<section class="bolum" aria-labelledby="nasil-baslik">
  <div class="kap">
    <div class="bolum-bas"><h2 id="nasil-baslik">Nasıl çalışır</h2></div>
    <ol class="izgara izgara-3">
      <li class="kart adim">{ikon("sepet", "ikon ikon-buyuk")}<span class="no">1. Al</span><p>Dosyayı Shopier üzerinden satın alın; ödeme ve teslim orada yapılır.</p></li>
      <li class="kart adim">{ikon("tablo", "ikon ikon-buyuk")}<span class="no">2. Excel'de aç</span><p>İndirdiğiniz dosyayı Excel'de açın. Kurulacak program ya da eklenti yok.</p></li>
      <li class="kart adim">{ikon("kalem", "ikon ikon-buyuk")}<span class="no">3. Kendi verini gir</span><p>Kendi rakamlarınızı girin; hesaplar dosyanın içinde yapılır.</p></li>
    </ol>
    <p class="not-satiri"><span>{ikon("tik")}Kurulum yok</span><span>{ikon("tik")}Abonelik yok</span><span>{ikon("kilit")}Veri dışarı çıkmaz</span></p>
  </div>
</section>

<section class="bolum" aria-labelledby="neden-baslik">
  <div class="kap">
    <div class="bolum-bas"><h2 id="neden-baslik">Neden Celcini</h2></div>
    <div class="neden">
      <article class="kart">{ikon("baret", "ikon ikon-buyuk")}<h3>Sahada çalışmış bir endüstri mühendisi</h3><p>Dosyalar fabrikada, depoda ve ofiste her gün karşılaşılan işler için hazırlanır: planlama, stok, maliyet, takip.</p></article>
      <article class="kart">{ikon("kalkan", "ikon ikon-buyuk")}<h3>Formül testinden geçer</h3><p class="vurgu">{e(FORMUL_TESTI)}</p></article>
    </div>
  </div>
</section>

<section class="bolum" aria-labelledby="sss-baslik">
  <div class="kap">
    <div class="bolum-bas"><h2 id="sss-baslik">Sık sorulan sorular</h2></div>
    <div class="sss">{sss_html(SSS[:5])}</div>
    <p class="not-satiri"><a class="dugme-cizgi" href="/sss/">Tüm sorular</a></p>
  </div>
</section>

{eposta_listesi_bolumu()}"""
    org = json_ld({"@context": "https://schema.org", "@type": "Organization", "name": "Celcini",
                   "url": SITE + "/", "logo": SITE + "/assets/img/favicon-512.png", "slogan": SOZ})
    return sayfa("/", f"Celcini · {SOZ}", ALT_SATIR + " Fabricakit, Excel Kliniği ve Datakit rafları.",
                 govde, tam_baslik=True, ek_head=org)


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
        <a class="dugme-cizgi" href="/fabricakit/">Fabricakit rafına bak</a>
      </div>
    </div>"""
    govde = f"""<section class="sayfa-bas">
  <div class="kap">
    {yol_izi([("/", "Ana sayfa"), (None, r["ad"])])}
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
    return sayfa(f"/{r['slug']}/", r["ad"], f"{r['ad']}: {r['aciklama']}. Celcini Excel havuzu.", govde,
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
  <div class="sayfa-bas">{yol_izi([("/", "Ana sayfa"), (f"/{r['slug']}/", r["ad"]), (None, u["ad"])])}</div>
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
    ic = f"""<p>Celcini bir Excel havuzudur: işletmelerin her gün yaptığı işler için hazırlanmış, kurulum gerektirmeyen Excel dosyaları.</p>
<p>Dosyaları sahada çalışmış bir endüstri mühendisi hazırlar. Çıkış noktası, fabrikada ve ofiste karşılaşılan gerçek işlerdir: üretimi planlamak, stoğu izlemek, maliyeti hesaplamak, alacağı ve borcu takip etmek.</p>
<h2>Raflar</h2>
<ul>{"".join(f'<li><a href="/{r["slug"]}/">{e(r["ad"])}</a>: {e(r["aciklama"][0].lower() + r["aciklama"][1:])}</li>' for r in RAFLAR)}</ul>
<h2>İlkeler</h2>
<ul>
  <li>Kurulum yok, abonelik yok: dosyayı alır, Excel'de açarsınız.</li>
  <li>Veri dışarı çıkmaz: girdiğiniz bilgiler sizin bilgisayarınızdaki dosyada kalır.</li>
  <li>Formül testi: {e(FORMUL_TESTI)}</li>
</ul>
<p>{e(ALT_SATIR)}</p>"""
    return metin_sayfasi("/hakkinda/", "Hakkında",
                         "Celcini, sahada çalışmış bir endüstri mühendisinin hazırladığı kurulumsuz Excel dosyalarından oluşan bir havuzdur.",
                         ic, etkin="/hakkinda/")


def iletisim():
    ic = f"""<p>Ürünler, siparişler ya da önerileriniz için aşağıdaki kanallardan ulaşabilirsiniz. Sipariş sorularında Shopier sipariş numaranızı yazmanız işi hızlandırır.</p>
<ul class="iletisim">
  <li><a class="kart" data-link="eposta" href="#" hidden>{ikon("posta")}<span data-link-metin="eposta">E-posta</span></a></li>
  <li><a class="kart" data-link="instagram" href="#" hidden>{ikon("instagram")}<span data-link-metin="instagram">Instagram</span></a></li>
  <li><a class="kart" data-link="shopier_magaza" href="#" hidden>{ikon("sepet")}<span>Shopier mağazası</span></a></li>
</ul>
<noscript><p>Bağlantıları görmek için JavaScript'i açın ya da Instagram'da @celciniai hesabına yazın.</p></noscript>"""
    return metin_sayfasi("/iletisim/", "İletişim", "Celcini ile iletişim: Instagram, e-posta ve Shopier mağazası.", ic)


def sss_sayfasi():
    ic = f'<div class="sss">{sss_html(SSS)}</div>'
    return metin_sayfasi("/sss/", "Sık sorulan sorular",
                         "Celcini Excel dosyaları hakkında sık sorulan sorular: satın alma, Excel sürümü, makro, veri gizliliği.", ic)


def gizlilik():
    ic = """<p>Bu sayfa, celcini.com sitesini kullandığınızda kişisel verilerinizin nasıl işlendiğini 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) çerçevesinde açıklar.</p>
<h2>Bu site ne toplar?</h2>
<ul>
  <li>Site çerez kullanmaz, reklam ya da ziyaretçi analizi aracı çalıştırmaz.</li>
  <li>Sitede veri giren bir form yoktur; site sizden ad, e-posta ya da ödeme bilgisi istemez.</li>
  <li>Siteyi barındıran Vercel, güvenlik ve işletim için standart sunucu kayıtları (IP adresi, tarayıcı bilgisi, istek zamanı) tutabilir.</li>
</ul>
<h2>Ödeme ve teslim: Shopier</h2>
<p>Satın alma, ödeme ve teslim Shopier üzerinden yapılır. Bu adımlarda verdiğiniz bilgiler (ad, iletişim, ödeme bilgileri) Shopier tarafından işlenir ve Shopier'in gizlilik politikasına tabidir. Sipariş sonrası, siparişi yerine getirmek için gereken bilgiler (ad, e-posta, sipariş içeriği) satıcıyla paylaşılır ve yalnızca bu amaçla kullanılır.</p>
<h2>E-posta listesi: Google Form</h2>
<p>E-posta listesine katılmak isterseniz kayıt Google Form üzerinden alınır ve Google'ın sunucularında saklanır. Adresiniz yalnızca yeni dosya duyuruları için kullanılır, üçüncü kişilerle paylaşılmaz. Listeden çıkmak için yazmanız yeterlidir.</p>
<h2>Excel dosyaları</h2>
<p>Satın aldığınız dosyalar sizin bilgisayarınızda çalışır. Dosyalara girdiğiniz veriler Celcini'ye ya da başka bir yere gönderilmez.</p>
<h2>Haklarınız</h2>
<p>KVKK'nın 11. maddesi uyarınca kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini ya da silinmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz. Başvurularınızı <a href="/iletisim/">İletişim</a> sayfasındaki kanallardan iletebilirsiniz.</p>
<p>Veri sorumlusu: Celcini.</p>"""
    return metin_sayfasi("/gizlilik/", "Gizlilik ve KVKK",
                         "Celcini gizlilik ve KVKK aydınlatma metni: site çerez kullanmaz, ödeme ve teslim Shopier'de yapılır.", ic)


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


def sayfa_404():
    govde = f"""<section class="yok"><div class="kap">
  <p class="ust-yazi">404</p>
  <h1>Bu sayfa havuzda yok.</h1>
  <p>Adres değişmiş ya da yanlış yazılmış olabilir.</p>
  <div class="eylemler">
    <a class="dugme" href="/">Ana sayfaya dön{ikon("ok")}</a>
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
    for r in RAFLAR:
        yollar.append(yaz(f"/{r['slug']}/", raf_sayfasi(r, urunler)))
    for u in urunler:
        yollar.append(yaz(f"/urun/{u['slug']}/", urun_sayfasi(u, urunler)))
    yollar.append(yaz("/hakkinda/", hakkinda()))
    yollar.append(yaz("/iletisim/", iletisim()))
    yollar.append(yaz("/sss/", sss_sayfasi()))
    yollar.append(yaz("/gizlilik/", gizlilik()))
    yollar.append(yaz("/teslimat-ve-iade/", teslimat()))
    yollar.append(yaz("/404.html", sayfa_404()))

    adresler = ["/"] + [f"/{r['slug']}/" for r in RAFLAR] + [f"/urun/{u['slug']}/" for u in urunler] + [
        "/hakkinda/", "/iletisim/", "/sss/", "/gizlilik/", "/teslimat-ve-iade/"]
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
