# Celcini · Fabricakit ve derin Excel havuzu

Celcini'nin ana gövdesi **Fabricakit**: tarayıcıda oynanan fabrika simülatörü (`/fabricakit/`).
Excel dosyaları "Dosyalar" altında üç rafta durur (`/fabrika/`, `/excel-klinigi/`, `/datakit/`); Datakit'in açılış sayfası
rehberli dersleri de taşır (`/datakit/<ders>/`: Excel sayfası sitede, notlarıyla); Fabrika Motoru'nun dersleri `/motor/` altında
(Fabrika rafından ve ürün sayfasından bağlanır);
tarayıcı araçları `/uzay/` altında (ROTA 3D `/uzay/rota/`, Fabrika İkizi `/uzay/ikiz/`). Üretim Arşivi (`/arsiv/`) fabrikada
sık görülen sorunları belirti, kök neden ve çözüm adımlarıyla konu konu toplar.

Celcini sitesinin kaynağı (yayın adresi `https://celcini.vercel.app`; alan adı alınınca `scripts/derle.py` → `SITE` değiştirilir): saf HTML, CSS ve JS. Çerçeve yok. Sayfalar `data/urunler.json`'dan
`scripts/derle.py` ile üretilir ve **derlenmiş HTML depoda durur**; Vercel'de derleme adımı yoktur.
Fabricakit ES modülleriyle yazılmıştır, o da derleme istemez.

## Klasör yapısı

```
data/urunler.json        Tüm ürünler (tek kaynak)
data/arsiv.json          Üretim Arşivi: bölüm → konu → kart (belirti, kök neden, 3 çözüm adımı, ilke)
data/karne-ornegi.json   Ana sayfadaki karne örneği (scripts/karne-ornegi.mjs üretir; elle düzenlenmez)
data/datakit/            Datakit rehberli dersleri: dersler.json (notlar, sorular, açılış metinleri), sayfalar/<id>.json (Excel dışa aktarımı)
data/motor/              Motor (Fabrika Motoru) rehberli dersleri, aynı yapı
assets/js/rehber/        Rehberli dersler: rehber.js (sayfa, notlar, kilit, soru), tablo.js (Excel ızgarası), grafik.js (SVG grafikler)
assets/css/rehber.css    Rehberli derslerin stili
api/_dersler/<urun>/     Kilitli dersler (derle.py yazar; statik yayınlanmaz, yalnızca api/ders.js okur)
datakit/veri/, motor/veri/  Herkese açık ders dizini ve ücretsiz dersler (derle.py yazar)
fabricakit/js/odalar.js  Fabricakit'in dokuz odası (tek liste; ana sayfadaki oda şeridi de buradan)
fabricakit/              Simülatör: css/, js/, img/ (index.html kabuğu derle.py üretir)
api/                     Vercel işlevleri: erisim-kodu.js, ajan-gm.js (_ortak.js işlev değildir)
uzay/araclar/_sablon/    Uzay aracı iskeleti (app.js, app.css)
uzay/rota/               ROTA 3D depo toplama rotası: js/ (layout, router, scene3d, ui; ES modülü), css/rota.css (index.html derle.py üretir)
uzay/ikiz/               Fabrika İkizi: js/ (veri, hesap, sahne, arayuz; ES modülü), css/ikiz.css (index.html derle.py üretir)
assets/js/vendor/three/  Three.js r128 (npm three@0.128.0: build/three.min.js, examples/js/controls/OrbitControls.js) ve LICENSE (MIT)
scripts/derle.py         JSON → HTML sayfaları + sitemap.xml (yalnızca Python standart kütüphanesi)
scripts/ikonlar.py       Lucide çizgi ikonları (inline SVG)
scripts/gorsel-uret.py   favicon ve og-cover.png üretimi (Pillow gerekir, yalnızca logo değişince)
scripts/check.js         Yayın öncesi kontrol (SEO etiketleri, kırık link, örnek kayıt sızıntısı, dil kuralları)
scripts/sim-test.mjs     Fabricakit motor testi: 3 oyuncu tipi × 5 gün, kayıt-yükleme, tohum, 1. gün puan dağılımı
scripts/karne-ornegi.mjs Motorun 1. gün karnesinden ana sayfa örneğini üretir (senaryo dosyanın başında)
scripts/rota-test.mjs    ROTA 3D yönlendirici testi: engel dolanma, erişilemeyen göz, optimum ≤ sıralı, Held-Karp = kaba kuvvet
scripts/ikiz-test.mjs    Fabrika İkizi model testi: veri bütünlüğü, 1. gün plan yükü = dosya, akış korunumu, kolların yönü
scripts/ikiz-veri.py     Fabrika Motoru'nun örnekli dosyasından uzay/ikiz/js/veri.js üretir (openpyxl; derlemenin parçası değildir)
scripts/api-test.mjs     api/ işlevlerinin ağsız testi (Claude API sahte fetch ile taklit edilir)
scripts/kod-hash.mjs     Erişim kodu üretimi ve SHA-256 listesi
scripts/rehber-disa-aktar.py  Excel sayfalarını rehber JSON'una çevirir (openpyxl gerekir; derlemenin parçası değildir)
scripts/excel-klinigi/   Excel Kliniği'nin 43 ücretsiz dosyasının derleme betikleri; uret.py hepsini dosyalar/excel-klinigi/'ye üretir
scripts/ses-*.mjs        Ajan GM sesi: ses-cumleler (→ data/ses/cumleler.json), ses-test (liste, JSON, dosyalar)
scripts/ses-piper.py     Ajan GM ses dosyaları, Piper ile (Linux/macOS; model huggingface.co'dan bir kez iner)
scripts/ses-tolga.ps1    Ajan GM ses dosyaları, Windows'ta "Microsoft Tolga" ile
data/ses/cumleler.json   Ajan GM'nin ses dosyası olan 40 sabit cümlesi (ses-cumleler üretir; elle düzenlenmez)
assets/ses/ajan-gm/      Ajan GM ses dosyaları (<id>.mp3; üretim betikleri yazar)
assets/css/style.css     Tüm stiller; palet ve ölçüler :root'ta
assets/js/config.js      Dış bağlantılar (Shopier mağaza, Google Form, e-posta, Instagram)
assets/js/main.js        Mobil menü, bağlantıları uygulama, raf ve arşiv araması (Türkçe harfe duyarsız), galeri
assets/img/              Logolar (beyaz, şeffaf), favicon'lar, og-cover.png
dosyalar/<raf>/          Ücretsiz indirilen dosyalar (data/urunler.json: ucretsiz_dosya); Excel Kliniği'nde 43 xlsx

index.html, fabricakit/index.html, fabrika/, excel-klinigi/, datakit/ (ve datakit/<ders>/), motor/ (ve motor/<ders>/), urun/<slug>/, uzay/, uzay/rota/index.html, uzay/ikiz/index.html,
uzay/araclar/_sablon/index.html, arsiv/ (ve arsiv/<konu>/), hakkinda/, iletisim/, sss/, gizlilik/, teslimat-ve-iade/,
404.html, sitemap.xml   ← derlenmiş çıktı, elle düzenlenmez
```

## Komutlar

```bash
python3 scripts/derle.py              # üretim derlemesi (depo köküne yazar)
python3 scripts/derle.py --onizleme   # önizleme: _onizleme/ klasörüne, örnek kayıtlar "ÖRNEK" etiketiyle
npm install                           # yalnızca api/ için gereken @anthropic-ai/sdk (api-test'in tamamı için)
npm run check                         # üretim çıktısı + sim-test + rota-test + ikiz-test + api-test + ses-test
npm run ses-cumleler                  # Ajan GM cümle listesi değişince data/ses/cumleler.json'ı yenile (sonra sesleri üret)
node scripts/karne-ornegi.mjs         # oyun kuralı ya da Ajan GM şablonu değişince karne örneğini yenile, sonra derle
npm run check:onizleme                # önizleme çıktısını kontrol et
npm run dev                           # http://localhost:3000 (üretim)
npm run onizleme                      # önizlemeyi derle ve http://localhost:3001'de aç
```

`_onizleme/` git'e girmez ve yayınlanmaz.

## Ürün ekleme

Ürün görselleri (`assets/img/urun/<slug>/`): 1600 px genişlik, PNG + yanında WebP. Excel sayfasının görseli için sayfa
`scripts/rehber-disa-aktar.py` ile JSON'a çevrilip sitenin ızgarasıyla (`assets/js/rehber/tablo.js`) çizilir ve ekran görüntüsü
alınır; Excel Kliniği'ndeki yedi analiz motorunun görselleri böyle üretildi.

1. `data/urunler.json`'a bir kayıt ekle. Alanlar:

   | Alan | Açıklama |
   |---|---|
   | `slug` | Adres: `/urun/<slug>/`. Küçük harf, rakam, tire. |
   | `ad`, `kisa`, `aciklama` | Ürün adı, tek cümle özet, paragraf. |
   | `raf` | `fabrika` (Fabrika Dosyaları) · `excel-klinigi` · `datakit` |
   | `ozellikler[]` | "Ne yapar" maddeleri. |
   | `kimin_icin` | Tek paragraf. |
   | `etiketler[]` | Raf sayfasındaki etiket süzgecine girer. `yapay zeka` etiketi turuncu rozet olur. |
   | `fiyat`, `liste_fiyat` | TL, tam sayı. Açılış fiyatı ve üstü çizili liste fiyatı. `null` ise fiyat yazmaz ("Shopier'de yakında" / "Fiyatı Shopier'de"). |
   | `shopier_url` | Shopier ürün bağlantısı. **Boşsa ürün üretimde görünmez** (`yakinda: true` değilse). |
   | `yakinda` | İsteğe bağlı. `true` ise bağlantı boşken de sayfa çıkar: pasif "Shopier'de yakında" düğmesi ve mağaza ana sayfası bağlantısı (`config.js`). Bağlantı gelince yalnızca `shopier_url` doldurulur. |
   | `ucretsiz_dosya` | İsteğe bağlı. Sitede duran ücretsiz dosya: `"/dosyalar/<raf>/<dosya>.xlsx"`. Doluysa `shopier_url` ve `fiyat` boş olmalı. Sayfada "Ücretsiz indir" düğmesi ve dosya boyutu çıkar. Rafta bu ürünler "Ücretsiz dosyalar" bölümünde, "ücretsiz" süzgeciyle görünür. |
   | `gorseller[]` | `"/assets/img/urun/<slug>/1-panel.png"` ya da `{"src": "...", "alt": "..."}`. Yanında aynı adlı `.webp` varsa önce o yüklenir; boyut PNG'den okunur. Boşsa "Ekran görüntüleri hazırlanıyor" kutusu çıkar. |
   | `excel_surum`, `makro`, `sayfa_sayisi` | Teknik bilgi. |
   | `one_cikan` | `true` ise ana sayfada "Öne çıkan" bölümüne girer. |
   | `ornek` | `true` ise yalnızca önizlemede görünür. |
   | `soz`, `icindekiler[]`, `adimlar[]`, `teknik_not`, `sss[]` | İsteğe bağlı, genişletilmiş ürün sayfası: tek cümlelik söz (yoksa `kisa`), "İçinde ne var" (`{"sayfa", "aciklama"}`), "Nasıl kullanılır" adımları, teknik not, ürün SSS'si (`{"soru", "cevap"}`). |

2. `python3 scripts/derle.py` çalıştır, `npm run check` ile kontrol et, commit et.

Üretim derlemesi; `ornek: true` olan ve `shopier_url`'si boş (`yakinda` ya da `ucretsiz_dosya` olmayan) kayıtların sayfasını üretmez,
raf sayılarına, öne çıkanlara ve sitemap'e katmaz, eski sayfası varsa `urun/` altından siler.

Ücretsiz dosyalar `dosyalar/<raf>/` altında durur (önizleme derlemesine de kopyalanır). Excel Kliniği'nin 43 ücretsiz dosyası
5 Ekim 2026 sohbetindeki derleme betiklerinden üretildi; betikler `scripts/excel-klinigi/` altında. Örnek kişi ve firma adları
"Müşteri Alfa, Beta, Gama…" biçimindedir. Yeniden üretmek için `python3 scripts/excel-klinigi/uret.py`. Bunun için openpyxl,
LibreOffice, `recalc.py` (`RECALC` ortam değişkeni) ve libfaketime gerekir. Betikler örnek veriyi 4 Ekim 2026'ya göre doğrular;
tarih o güne sabitlenir. Her dosyanın sayfası `rehber-disa-aktar.py` ve `tablo.js` ile tek görsel (`1-ozet`) olarak çizildi.
Bir rafta hem Shopier'deki hem ücretsiz ürün varsa raf iki bölümle çıkar. Rafın `RAFLAR` kaydında `ucretli_baslik` üst bölümün
başlığını, `etiket_esigi` süzgeç düğmesi olacak etiketin en az kaç üründe geçmesi gerektiğini belirler (Excel Kliniği'nde 2).

## Bağlantılar

`assets/js/config.js` tek yerdir. Boş bırakılan bağlantının bölümü sayfada gizlenir (örneğin `google_form`
boşsa e-posta listesi bölümü, `eposta` boşsa iletişimdeki e-posta satırı). JavaScript kapalıyken de bu
öğeler gizli kalır; kırık link oluşmaz. `config.js` değişince yeniden derlemek gerekmez.

## Fabricakit

Tarayıcıda çalışan tek sayfalık uygulama: `fabricakit/index.html` kabuğu, `fabricakit/css/`, `fabricakit/js/`.
Harici kütüphane ve derleme yok; motor arayüzden bağımsızdır ve Node'da da çalışır (`npm run sim-test`).

```
fabricakit/js/ayarlar.js   Oyunun kural ve denge sayıları: puanlar, sayaçlar, tedarik süreleri, oyun saati, eşikler, tohumlar, Ajan GM ayarları
fabricakit/js/odalar.js    Dokuz oda ve fabrika adı (kod adı "" yapılırsa her yerde gerçek ad görünür)
fabricakit/js/veri/        Tohumlu rastgelelik, katalog, sipariş ve olay üretimi
fabricakit/js/motor/       Tek store, eylemler, MRP, satın alma, üretim, olaylar, gün sonu, karne, kayıt
fabricakit/js/ajan-gm/     Kural şablonları (yorumlar.js) ve yapay zeka kaynağı (kaynak.js)
fabricakit/js/arayuz/      Harita, paneller, görev notu, sayaçlar, bildirimler, karne, kilit ekranı, sesler (ses.js)
fabricakit/js/uygulama.js  Tarayıcı giriş noktası
```

- Kayıt yalnızca tarayıcıda: `fabricakit-kayit` (oyun, `KAYIT_SURUMU` alanıyla), `fabricakit-oyuncu` (hitap, açılan kilit)
  ve `fabricakit-ses` (ses açık/kapalı).
  Kayıt yapısını bozan bir değişiklikte `KAYIT_SURUMU`'nu bir artırın; eski kayıtlar sıfırlanır ve oyuncuya söylenir.
- Efektler dosyasız: `arayuz/ses.js`'te Web Audio API ile üretilir. Ses motoru askıdayken (iPhone'da ilk dokunuştan hemen
  sonra) gelen efekt atlanmaz, motor açılınca çalar. Ses kapalıyken hiçbir ses çalmaz (Ajan GM dahil).
- Ajan GM'nin sesi iki parçalı: sabit cümleler (en fazla 40; `ajan-gm/cumleler.js`) `assets/ses/ajan-gm/<id>.mp3`'ten sabit
  erkek sesle çalar, aradaki değişken parçalar (hitap, sayı, ürün adı) tarayıcının SpeechSynthesis API'siyle cihazdaki erkek
  Türkçe sesle okunur (tr-TR, hız 0,95, perde 0,85). Ajan GM yalnızca erkek sesle konuşur: cihaz sesi, adı `ayarlar.js`'teki
  `ERKEK_SESLER` listesinden birini içeren yerel sestir (başlangıçta yalnızca "Tolga"); iPhone'daki Yelda gibi sesler kullanılmaz.
  Böyle bir ses yoksa değişken parça atlanır; ses dosyaları henüz üretilmediyse (`ajan-gm/ses-dosyalari.js`) sabit cümleler de
  cihazdaki erkek sesle okunur. Ne ses dosyası ne yerel erkek ses varsa "Sesli oku" ve "Ajan GM konuşsun" düğmeleri görünmez
  (yazı zaten ekranda); efektler ve hoparlör düğmesi bundan etkilenmez.
  Cümle listesi değişince: `npm run ses-cumleler` (→ `data/ses/cumleler.json`), sonra sesleri yeniden üretin:
  `scripts/ses-piper.py` (Piper, Türkçe erkek ses; modeli bir kez huggingface.co'dan indirir) ya da Windows'ta
  `powershell -ExecutionPolicy Bypass -File scripts\ses-tolga.ps1` ("Microsoft Tolga" + ffmpeg). İkisi de aynı dosya adlarını
  yazar, sesi -30 LUFS'a eşitler (oyunun en yüksek efektleri yaklaşık -35 LUFS; değiştirmek için `--duzey` / `-Duzey`) ve
  `ses-dosyalari.js`'i günceller. `npm run check` (`scripts/ses-test.mjs`) liste, JSON ve dosyaların birebir eşleştiğini denetler.
  Metin okunmadan önce sese hazırlanır: sayı, tutar, yüzde ve saat yazıya çevrilir ("135.200 TL" → "yüz otuz beş bin iki yüz lira",
  "08:00'de" → "saat sekizde"); `npm run sim-test` Ajan GM metinlerinde okunmamış rakam kalmadığını denetler.
- Ajan GM görselleri `assets/img/` altında: büyük portre `ajan-gm.webp` / `ajan-gm.png` (ana sayfanın açılışı) ve daire
  avatar `ajan-gm-avatar.webp` / `ajan-gm-avatar.png` (giriş, karne, sorgula, kilit ekranı ve ana sayfadaki karne örneği). Tarayıcı WebP destekliyorsa
  WebP, değilse PNG yüklenir (`<picture>`). Görsel değişirse `python3 scripts/derle.py` ana sayfadaki sürüm etiketini yeniler.
- Oda kod adı değişirse ana sayfadaki oda şeridi için yeniden derleyin; `npm run check` ikisinin uyumunu denetler.

### Ajan GM

| Ayar (`ayarlar.js`) | Değerler |
|---|---|
| `AJAN_GM_KAYNAK` | `"kural"` (varsayılan; şablonlar, sunucuya istek yok) · `"yapay-zeka"` (`api/ajan-gm.js`) |
| `AJAN_GM_YAPAY_ZEKA_KIME` | `"kodlu"` (varsayılan; yalnız geçerli erişim kodu girenler, kod her istekte yeniden doğrulanır) · `"herkes"` |

Yapay zeka modunda sağlayıcıya yalnızca günün karnesinden seçilen oyun verisi ve oyuncunun kısa sorusu gider;
hitap gönderilmez. Anahtar yoksa, süre dolarsa ya da yanıt kurallara uymazsa Ajan GM sessizce şablonlara döner.
Sunucu da `ayarlar.js`'i okur: ayar `"kural"`sa işlev sağlayıcıyı hiç çağırmaz.

### Erişim kodu

1. `node scripts/kod-hash.mjs --uret 20` 20 yeni kod ve hash'lerini yazar (var olan kodlar için:
   `node scripts/kod-hash.mjs KOD1 KOD2`). Büyük-küçük harf, boşluk ve tire fark etmez.
2. Son satırdaki listeyi Vercel'de `ERISIM_KOD_HASHLERI` değerine yapıştırın (yeni kodları virgülle sona ekleyin),
   ardından yeniden yayınlayın.
3. Kodları Shopier'deki erişim kodu ürünüyle teslim edin. Kodları repoya, sohbete ya da günlüğe yazmayın.

`ERISIM_KOD_HASHLERI` boşsa kilit ekranı "Erişim kodları henüz satışta değil." der. Kilit tarayıcıda tutulur;
bu statik bir oyun için yumuşak bir kilittir (günlerin verisi tarayıcı kodundadır).

### Ortam değişkenleri (Vercel)

| Ad | Gerekli mi | Açıklama |
|---|---|---|
| `ERISIM_KOD_HASHLERI` | Kod satışı için | Virgülle ayrılmış SHA-256 listesi (`scripts/kod-hash.mjs`) |
| `DATAKIT_KOD_HASHLERI` | Datakit kodu için | Datakit'in kilitli derslerini açan kodların listesi (Fabricakit'inkinden ayrı; aynı betikle) |
| `MOTOR_KOD_HASHLERI` | Motor kodu için | Motor'un kilitli derslerini açan kodların listesi (Datakit'inkinden ayrı; aynı betikle) |
| `ANTHROPIC_API_KEY` | Yalnız yapay zeka modunda | Claude API anahtarı. Koda ya da repoya yazılmaz. |
| `AJAN_GM_MODEL` | Hayır | Varsayılan `claude-haiku-5-5` (en ucuz güncel Claude modeli) |

`npm run dev` yalnızca statik dosyaları sunar; `/api` işlevlerini yerelde denemek için Vercel CLI ile `vercel dev`.

## Rehberli dersler (Datakit, Motor)

İki ürünün dersleri aynı kodla çalışır: Datakit (`/datakit/`, 12 ders, ilk 4 ücretsiz) ve Motor (`/motor/`, Fabrika Motoru'nun
12 ana sayfası, ilk 4 ücretsiz). `scripts/derle.py`'deki `REHBERLER` listesi ürünü, rafını ve adresini tanımlar; adres rafın
adresiyle aynıysa (Datakit) raf sayfası açılış sayfasına dönüşür, değilse (Motor) raf sayfası olduğu gibi kalır ve derslere
bir kutuyla bağlanır.

Excel dosyasının sayfaları sitede dosyadaki değerleri, renkleri, birleşik hücreleri, dondurulmuş bölmeleri ve grafikleriyle açılır.
Notlu alanın sağ üst köşesinde turuncu üçgen durur; alandaki bir hücreye dokununca Ajan GM'nin notu açılır (masaüstünde yanında,
telefonda alttan, yatay tutulan telefonda ekranın yarısında yanda; alan kartın örtmediği yere kaydırılır). "Notları sırayla gez"
notları sırayla dolaşır, ad kutusu tıklanan hücrenin değerini ve formül sonucu olup olmadığını gösterir, her dersin sonunda tek soru
vardır (cevap tarayıcıda hatırlanır: `celcini-rehber`). Site veri almaz. Dondurulmuş sütunlar ızgaranın yarısından genişse
(dar telefon) yalnızca sığan kadarı dondurulur; uzaklaştırınca ya da ekran genişleyince (telefon yan çevrilince) yer yettiği
ölçüde dosyadaki dondurma geri gelir (`tablo.js` → `donukSutunAyarla`).

- **İçerik:** `data/<urun>/dersler.json` (`data/datakit/`, `data/motor/`). Her ders: `id`, `sira`, `sayfa_adi`, `baslik`, `ozet`,
  `ucretsiz`, `ajan_gm` (isteğe bağlı `ajan_gm_ses`), `notlar[]` ve `soru`; isteğe bağlı `veri_notu` dersin sayfasının altındaki
  açıklamayı değiştirir (yoksa `acilis.ders_veri_notu`). Not: `aralik` ("B7:M9"), `baslik`, `metin`, `karar` ("Ne yapmalı?"),
  isteğe bağlı `ses` (metinde okunuşu bozan işaret ya da kısaltma varsa sesli okuma bunu okur). Soru: `metin`, `secenekler[]`,
  `dogru` (sıfırdan başlayan sıra), `aciklama`. `acilis` açılış sayfasının metinleridir. Değiştirince
  `python3 scripts/derle.py` ve `npm run check`.
- **Kilit:** ilk `ucretsiz_ders` ders herkese açıktır (`<urun>/veri/ders/<id>.json`); kalanların notu, sorusu ve sayfası yalnızca
  `api/_dersler/<urun>/<id>.json`'dadır ve `POST /api/ders/ { urun, id, kod }` geçerli kodla döndürür. Kod listesi Vercel'de
  üründen ürüne ayrıdır (`api/ders.js` → `KOD_LISTESI`): Datakit `DATAKIT_KOD_HASHLERI`, Motor `MOTOR_KOD_HASHLERI`
  (`node scripts/kod-hash.mjs --uret 20`; bir ürünün kodu ötekini, Fabricakit'in kodları hiçbirini açmaz). Kod tarayıcıda
  `celcini-kod-<urun>` olarak saklanır; sunucu saklamaz. `npm run check` kilitli bir dersin herkese açık dosyalara
  sızmadığını denetler. Liste boşsa kilit paneli "Erişim kodları henüz satışta değil." der.
- **Sayfaları yeniden dışa aktarma** (Excel değişince): `pip install openpyxl`, sonra
  `python3 scripts/rehber-disa-aktar.py <dosya.xlsx> data/datakit/sayfalar "Dashboard=dashboard" "Otomatik Yorum=otomatik-yorum" …`.
  Büyük sayfanın yalnız dolu bölümünü göstermek için seçime satır ve son sütun eklenir:
  `"MPS=mps:satir=1-45,328:sutun=CQ"` (Motor'un 12 sayfası böyle aktarıldı; seçim dışında kalan grafik `disarida` olur).
  Son sütun dolu alandan genişse araya boş sütunlar eklenir (taşan metin ve dolu alanın sağındaki grafik görünsün diye).
  Hücrelerin önbellekteki değerleri okunur (dosya Excel'de hesaplanıp kaydedilmiş olmalı); sayı biçimleri Türkçeye (bölümlü ve
  koşullu biçimler dahil), koşullu biçimler renge ve veri çubuğuna çevrilir; çubuk, halka ve pasta grafikler SVG ile çizilir.
  Excel dosyası repoda durmaz.
- **Sesli oku:** yalnızca cihazda erkek Türkçe ses (`ERKEK_SESLER`) varsa görünür; derslerde ses dosyası kullanılmaz.
- Yeni bir ürün (ör. Motor): `scripts/derle.py`'deki `REHBERLER` listesine kayıt, `api/ders.js`'teki `KOD_LISTESI`'ne ürün,
  `scripts/check.js`'teki `REHBERLER`'e satır ve `data/<urun>/`.

## Fabrika İkizi (`/uzay/ikiz/`)

Fabrika Motoru'nun örnekli dosyasındaki **kurgusal** tesis ("Örnek Isıtma-Soğutma Yan Sanayi Tesisi": 3 hat, 11 iş merkezi,
20 mamul, 20 iş günlük MPS) 3D'de gün gün oynar; hazır senaryolar (SİMÜLASYON sayfasındaki dört senaryo) ve kollar (talep,
kapasite, üçüncü vardiya, fason, arıza) sonucu Baz ile karşılaştırır. Gerçek bir firmanın verisi değildir; başka bir tesisin
verisi eklenmez.

- **Veri:** `uzay/ikiz/js/veri.js` — `python3 scripts/ikiz-veri.py <FABRICAKIT_MOTOR_ORNEKLI.xlsx>` üretir (openpyxl; Excel
  dosyası repoda durmaz). HAT, MAMUL, STD_SÜRE, MPS (G01–G20 ve 20 iş günlük net talep), KAPASİTE (plan günleri ve dosyadaki
  yük oranları), SİMÜLASYON (senaryolar) ve RAF (bölge göz sayıları) sayfalarından okur.
- **Model (`hesap.js`, DOM'suz):** iş merkezi yükü = Σ plan × standart süre + hazırlık; günlük kapasite = istasyon × 900 dk ×
  verim (iki vardiya; üçüncü vardiya ×1,5; fason, fason mümkün iş merkezine dosyadaki günlük fason dakikasını ekler; arıza
  kapasiteyi sıfırlar). İş merkezleri proses sırasıyla işlenir; parça aynı gün rotanın tamamından geçer, kapasite yetmeyince
  darboğazın önünde bekler ve ertesi güne devreder; toplam aşım ve en yüksek yük bu devreden işi içerdiği için dosyadaki
  statik değerlerden farklıdır. Sevk = 20 iş günlük net talebin eşit dağılımı (birikimli yuvarlama); karşılanmayan sevk ertesi
  güne kalır (OTD). Üçüncü vardiya personel ihtiyacını birinci vardiya kadar artırır (dosyada üçüncü vardiya personeli 0). İlk günün plan yükü oranları dosyanın KAPASİTE sayfasıyla aynıdır (`scripts/ikiz-test.mjs` denetler).
- **Sahne (`sahne.js`):** Three.js r128 (ROTA 3D ile aynı vendor dosyaları). İş merkezi rengi günün yük oranına göre (normal /
  dolu >%85 / aşım >%100 / arıza), darboğazın önünde palet yığını (bekleyen iş), hat boyunca akan parçalar günün üretimiyle
  hızlanır, gün sonunda kamyon çıkar. WebGL yoksa tablo, karşılaştırma ve öneriler yine çalışır.
- **Arayüz (`arayuz.js`):** oynatıcı (gün; hız düğmeleri masaüstünde), kamera (genel / üst / hat), sekmeler Senaryo · Gün · Sonuç · Model; telefonda
  kontroller Fabricakit görev notunun çekmecesinde. "Ne yapmalı?" önerileri aynı modelle kolları tek tek deneyerek bulunur;
  yapay zeka çağrısı yoktur. Sayfa veri almaz.

## Üretim Arşivi (`/arsiv/`)

Kaynak `data/arsiv.json`; içerik Fabricakit Üretim Arşivi sunumlarından aktarıldı ve site için düzenlendi (sunum dosyaları
repoda durmaz). `scripts/derle.py` `/arsiv/` dizinini (arama kutusu, bölüm bölüm konu kartları ve sorun başlıkları) ve konu
başına `/arsiv/<konu>/` sayfasını üretir, adresleri sitemap'e ekler. Bir sorunun adresi `/arsiv/<konu>/#<kart>`.

- **Yapı:** `bolumler[]` (`slug`, `ad`) → `kategoriler[]` (`slug`, `ad`) → `kartlar[]`. Kart alanları: `slug`, `baslik`,
  `belirti`, `kok_neden`, `cozum[]` (tam üç adım), `ilke` (tek cümle), isteğe bağlı `ilgili` (ürün slug'ı).
- **İlgili dosya:** `ilgili` yalnızca üretimde görünen bir ürünü gösterebilir. Kartın altında "İlgili dosya" bağlantısı,
  ürün sayfasında "Üretim Arşivi'nde" listesi çıkar. Bağlantı yalnızca dosya o sorunu gerçekten çözüyorsa verilir.
- **Denetim:** derleme slug biçimini ve tekliğini, boş alanı, üç çözüm adımını ve `ilgili` ürünün varlığını denetler;
  hata varsa durur. Üretim derlemesi `data/arsiv.json`'da artık olmayan `/arsiv/<konu>/` klasörünü siler.
- **İçerik kuralı:** kartlar genel uygulama önerisidir; her sayfanın altında iş güvenliği ve mevzuat notu durur. Gerçek
  firma adı, müşteri ya da rakam yazılmaz; kesin yargı yerine uygulanabilir öneri yazılır.

## Tasarım kuralları (özet)

- Palet: zemin `#CBE6F6`, kart `#FFFFFF`, çizgi `#9CCBEA`, okyanus mavisi `#0096C7`, koyu okyanus `#005F93`,
  metin `#0B1F3A` / `#46586D`, turuncu çizgi `#F4A27A`, turuncu zemin `#FDEBDD`.
- `#0096C7` üstünde beyaz yazı yalnızca ≥ 20px kalın (kontrast 3,39). Açık zeminde link ve ikon `#005F93`.
- Turuncu yalnızca vurgu: rozet zemini, fiyat alt çizgisi, ince çizgi. Turuncu renkte yazı yok.
- Logolar beyaz ve şeffaf; her zaman `#0096C7` zemin üstünde. Yeniden çizilmez, yalnızca boyutlandırılır.
- İkonlar Lucide, çizgi kalınlığı 1,5. Kartlar ince çizgi çerçeveli, gölge yok.
- Tek yazı ailesi (sistem yazısı), üç boyut: 16 / 20 / 32–48px. Fabricakit'in yoğun ekranında ikincil etiket 14px;
  telefonda üst şerit düğmelerinin ikon altı etiketi (Ses · Durdur · Bitir) 10px.

## Yayın (Vercel)

Framework Preset: **Other**. Build Command ve Output Directory **boş**. Depo kökü doğrudan yayınlanır.
`package.json`'daki tek bağımlılık (`@anthropic-ai/sdk`) yalnızca `api/` işlevleri içindir; Vercel kurar.
`vercel.json` temiz URL'leri, güvenlik başlıklarını ve Content-Security-Policy'yi tanımlar
(yalnızca kendi alan adından script, stil ve görsel; satır içi script/stil yok).
`.vercelignore` derleme kaynaklarını, önizlemeyi ve Claude çalışma dosyalarını yayından çıkarır.

## Lisans

Tüm hakları saklıdır © Celcini. İkonlar: Lucide (ISC lisansı).
