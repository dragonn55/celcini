# Celcini · Fabricakit ve derin Excel havuzu

Celcini'nin ana gövdesi **Fabricakit**: tarayıcıda oynanan fabrika simülatörü (`/fabricakit/`).
Excel dosyaları "Dosyalar" altında üç rafta durur (`/fabrika/`, `/excel-klinigi/`, `/datakit/`);
yapay zeka araçları `/uzay/` altında.

celcini.com'un kaynağı: saf HTML, CSS ve JS. Çerçeve yok. Sayfalar `data/urunler.json`'dan
`scripts/derle.py` ile üretilir ve **derlenmiş HTML depoda durur**; Vercel'de derleme adımı yoktur.
Fabricakit ES modülleriyle yazılmıştır, o da derleme istemez.

## Klasör yapısı

```
data/urunler.json        Tüm ürünler (tek kaynak)
data/karne-ornegi.json   Ana sayfadaki karne örneği (scripts/karne-ornegi.mjs üretir; elle düzenlenmez)
fabricakit/js/odalar.js  Fabricakit'in dokuz odası (tek liste; ana sayfadaki oda şeridi de buradan)
fabricakit/              Simülatör: css/, js/, img/ (index.html kabuğu derle.py üretir)
api/                     Vercel işlevleri: erisim-kodu.js, ajan-gm.js (_ortak.js işlev değildir)
uzay/araclar/_sablon/    Uzay aracı iskeleti (app.js, app.css)
scripts/derle.py         JSON → HTML sayfaları + sitemap.xml (yalnızca Python standart kütüphanesi)
scripts/ikonlar.py       Lucide çizgi ikonları (inline SVG)
scripts/gorsel-uret.py   favicon ve og-cover.png üretimi (Pillow gerekir, yalnızca logo değişince)
scripts/check.js         Yayın öncesi kontrol (SEO etiketleri, kırık link, örnek kayıt sızıntısı, dil kuralları)
scripts/sim-test.mjs     Fabricakit motor testi: 3 oyuncu tipi × 5 gün, kayıt-yükleme, tohum, 1. gün puan dağılımı
scripts/karne-ornegi.mjs Motorun 1. gün karnesinden ana sayfa örneğini üretir (senaryo dosyanın başında)
scripts/api-test.mjs     api/ işlevlerinin ağsız testi (Claude API sahte fetch ile taklit edilir)
scripts/kod-hash.mjs     Erişim kodu üretimi ve SHA-256 listesi
scripts/ses-*.mjs        Ajan GM sesi: ses-cumleler (→ data/ses/cumleler.json), ses-test (liste, JSON, dosyalar)
scripts/ses-piper.py     Ajan GM ses dosyaları, Piper ile (Linux/macOS; model huggingface.co'dan bir kez iner)
scripts/ses-tolga.ps1    Ajan GM ses dosyaları, Windows'ta "Microsoft Tolga" ile
data/ses/cumleler.json   Ajan GM'nin ses dosyası olan 40 sabit cümlesi (ses-cumleler üretir; elle düzenlenmez)
assets/ses/ajan-gm/      Ajan GM ses dosyaları (<id>.mp3; üretim betikleri yazar)
assets/css/style.css     Tüm stiller; palet ve ölçüler :root'ta
assets/js/config.js      Dış bağlantılar (Shopier mağaza, Google Form, e-posta, Instagram)
assets/js/main.js        Mobil menü, bağlantıları uygulama, raf araması, galeri
assets/img/              Logolar (beyaz, şeffaf), favicon'lar, og-cover.png

index.html, fabricakit/index.html, fabrika/, excel-klinigi/, datakit/, urun/<slug>/, uzay/,
uzay/araclar/_sablon/index.html, hakkinda/, iletisim/, sss/, gizlilik/, teslimat-ve-iade/,
404.html, sitemap.xml   ← derlenmiş çıktı, elle düzenlenmez
```

## Komutlar

```bash
python3 scripts/derle.py              # üretim derlemesi (depo köküne yazar)
python3 scripts/derle.py --onizleme   # önizleme: _onizleme/ klasörüne, örnek kayıtlar "ÖRNEK" etiketiyle
npm install                           # yalnızca api/ için gereken @anthropic-ai/sdk (api-test'in tamamı için)
npm run check                         # üretim çıktısı + sim-test + api-test + ses-test
npm run ses-cumleler                  # Ajan GM cümle listesi değişince data/ses/cumleler.json'ı yenile (sonra sesleri üret)
node scripts/karne-ornegi.mjs         # oyun kuralı ya da Ajan GM şablonu değişince karne örneğini yenile, sonra derle
npm run check:onizleme                # önizleme çıktısını kontrol et
npm run dev                           # http://localhost:3000 (üretim)
npm run onizleme                      # önizlemeyi derle ve http://localhost:3001'de aç
```

`_onizleme/` git'e girmez ve yayınlanmaz.

## Ürün ekleme

1. `data/urunler.json`'a bir kayıt ekle. Alanlar:

   | Alan | Açıklama |
   |---|---|
   | `slug` | Adres: `/urun/<slug>/`. Küçük harf, rakam, tire. |
   | `ad`, `kisa`, `aciklama` | Ürün adı, tek cümle özet, paragraf. |
   | `raf` | `fabrika` (Fabrika Dosyaları) · `excel-klinigi` · `datakit` |
   | `ozellikler[]` | "Ne yapar" maddeleri. |
   | `kimin_icin` | Tek paragraf. |
   | `etiketler[]` | Raf sayfasındaki etiket süzgecine girer. `yapay zeka` etiketi turuncu rozet olur. |
   | `fiyat`, `liste_fiyat` | TL, tam sayı. Açılış fiyatı ve üstü çizili liste fiyatı. |
   | `shopier_url` | Shopier ürün bağlantısı. **Boşsa ürün üretimde görünmez.** |
   | `gorseller[]` | `"/assets/img/urun/planla-1.png"` ya da `{"src": "...", "alt": "..."}`. Boşsa "Ekran görüntüleri hazırlanıyor" kutusu çıkar. |
   | `excel_surum`, `makro`, `sayfa_sayisi` | Teknik bilgi. |
   | `one_cikan` | `true` ise ana sayfada "Öne çıkan" bölümüne girer. |
   | `ornek` | `true` ise yalnızca önizlemede görünür. |

2. `python3 scripts/derle.py` çalıştır, `npm run check` ile kontrol et, commit et.

Üretim derlemesi; `ornek: true` olan ve `shopier_url`'si boş kayıtların sayfasını üretmez, raf sayılarına,
öne çıkanlara ve sitemap'e katmaz, eski sayfası varsa `urun/` altından siler.

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
  erkek sesle çalar, aradaki değişken parçalar (hitap, sayı, ürün adı) tarayıcının SpeechSynthesis API'siyle cihazdaki Türkçe
  sesle okunur (tr-TR, hız 0,95, perde 0,85). Cihazda yerel Türkçe ses yoksa değişken parça atlanır; ses dosyaları henüz
  üretilmediyse (`ajan-gm/ses-dosyalari.js`) sabit cümleler de cihaz sesiyle okunur.
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
| `ANTHROPIC_API_KEY` | Yalnız yapay zeka modunda | Claude API anahtarı. Koda ya da repoya yazılmaz. |
| `AJAN_GM_MODEL` | Hayır | Varsayılan `claude-haiku-5-5` (en ucuz güncel Claude modeli) |

`npm run dev` yalnızca statik dosyaları sunar; `/api` işlevlerini yerelde denemek için Vercel CLI ile `vercel dev`.

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
