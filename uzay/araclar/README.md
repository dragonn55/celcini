# Uzay · yapay zeka araçları

Her araç kendi klasöründe durur ve `/uzay/araclar/<arac-adi>/` adresinden yayınlanır.
Sayfa iskeleti (`index.html`) `scripts/derle.py` ile üretilir; elle düzenlenmez.

## Yeni araç ekleme

1. `uzay/araclar/_sablon/` klasörünü kopyala, `kebab-case` bir ad ver (ör. `olu-stok-dedektoru/`).
   Klasörde `app.js` (aracın mantığı) ve `app.css` (araca özel stiller) durur.
2. `scripts/derle.py` içindeki `main()`'de `_sablon` satırının altına yeni aracı ekle:
   `yaz("/uzay/araclar/olu-stok-dedektoru/", uzay_araci("olu-stok-dedektoru", "Ölü Stok Dedektörü", "Bir cümlelik açıklama."))`
   ve adresi `adresler` listesine (sitemap) ekle.
3. `uzay_sayfasi()` içindeki kartı "Yakında"dan bağlantılı karta çevir.
4. `python3 scripts/derle.py` ve `npm run check`.

## Yapay zeka çağrıları

Tarayıcı kodu hiçbir API anahtarı taşımaz. Sunucu tarafı için Vercel fonksiyonu kullanılır:
`api/<arac-adi>.js` POST isteğini alır, anahtarı ortam değişkeninden okur (örnek: `api/ajan-gm.js`).
`_` ile başlayan `api/` dosyaları fonksiyon olmaz, ortak yardımcılar içindir.

## Ortak kurallar

- Türkçe arayüz, mobil öncelikli düzen, `assets/css/style.css` değişkenleri.
- Her araç tek bir işi yapar; çalışma durumu ve hata mesajı görünür olur.
- Kullanıcı verisi işlem sonrası saklanmaz.
