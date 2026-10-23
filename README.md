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
fabricakit/js/odalar.js  Fabricakit'in dokuz odası (tek liste; ana sayfadaki oda şeridi de buradan)
fabricakit/              Simülatör: css/, js/, img/ (index.html kabuğu derle.py üretir)
uzay/araclar/_sablon/    Uzay aracı iskeleti (app.js, app.css)
scripts/derle.py         JSON → HTML sayfaları + sitemap.xml (yalnızca Python standart kütüphanesi)
scripts/ikonlar.py       Lucide çizgi ikonları (inline SVG)
scripts/gorsel-uret.py   favicon ve og-cover.png üretimi (Pillow gerekir, yalnızca logo değişince)
scripts/check.js         Yayın öncesi kontrol (SEO etiketleri, kırık link, örnek kayıt sızıntısı)
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
npm run check                         # üretim çıktısını kontrol et
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

## Tasarım kuralları (özet)

- Palet: zemin `#CBE6F6`, kart `#FFFFFF`, çizgi `#9CCBEA`, okyanus mavisi `#0096C7`, koyu okyanus `#005F93`,
  metin `#0B1F3A` / `#46586D`, turuncu çizgi `#F4A27A`, turuncu zemin `#FDEBDD`.
- `#0096C7` üstünde beyaz yazı yalnızca ≥ 20px kalın (kontrast 3,39). Açık zeminde link ve ikon `#005F93`.
- Turuncu yalnızca vurgu: rozet zemini, fiyat alt çizgisi, ince çizgi. Turuncu renkte yazı yok.
- Logolar beyaz ve şeffaf; her zaman `#0096C7` zemin üstünde. Yeniden çizilmez, yalnızca boyutlandırılır.
- İkonlar Lucide, çizgi kalınlığı 1,5. Kartlar ince çizgi çerçeveli, gölge yok.
- Tek yazı ailesi (sistem yazısı), üç boyut: 16 / 20 / 32–48px.

## Yayın (Vercel)

Framework Preset: **Other**. Build Command ve Output Directory **boş**. Depo kökü doğrudan yayınlanır.
`vercel.json` temiz URL'leri, güvenlik başlıklarını ve Content-Security-Policy'yi tanımlar
(yalnızca kendi alan adından script, stil ve görsel; satır içi script/stil yok).
`.vercelignore` derleme kaynaklarını, önizlemeyi ve Claude çalışma dosyalarını yayından çıkarır.

## Lisans

Tüm hakları saklıdır © Celcini. İkonlar: Lucide (ISC lisansı).
