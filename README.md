# Celcini — Web Sitesi

Celcini, Türkiye merkezli bir yapay zekâ ve iş çözümleri markasıdır. Bu depo markanın
resmî web sitesini içerir: bağımlılıksız, statik, hızlı ve Vercel'e dağıtıma hazır.

**Teknoloji:** saf HTML + CSS + JavaScript. Derleme adımı yoktur; framework gerekmez.

## Sayfalar

| Yol | İçerik |
|---|---|
| `/` | Ana sayfa: marka, üç modülün özeti, nasıl çalışır, bekleme listesi çağrısı |
| `/fabricakit/` | Modül 01 — fabrika yönetimi Excel şablonları (Shopier'e satış bağlantıları) |
| `/excel-klinigi/` | Modül 02 — genel iş Excel şablonları (Shopier'e satış bağlantıları) |
| `/uzay/` | Modül 03 — yapay zekâ araçları, "yakında" sayfası + Google Form bekleme listesi |
| `/404.html` | Özel hata sayfası (Vercel otomatik kullanır) |

## Klasör yapısı

```
celcini/
├── index.html                 # Ana sayfa
├── 404.html
├── fabricakit/index.html
├── excel-klinigi/index.html
├── uzay/
│   ├── index.html             # "Yakında" sayfası
│   └── araclar/               # İleride eklenecek web tabanlı AI araçları
│       ├── README.md          # Araç ekleme rehberi
│       └── _sablon/           # Yeni araç için kopyalanacak iskelet
├── assets/
│   ├── css/style.css          # Tüm site stilleri (tasarım değişkenleri :root altında)
│   ├── js/config.js           # ⚠️ Shopier ve Google Form bağlantıları — tek yerden yönetilir
│   ├── js/main.js             # Mobil menü, bağlantı uygulama, animasyonlar
│   └── img/logo.svg           # Yer tutucu gül logosu (nihai logo ile değiştirin)
├── scripts/check.js           # Yayın öncesi basit SEO / kırık bağlantı kontrolü
├── vercel.json                # Temiz URL'ler, güvenlik ve önbellek başlıkları
├── robots.txt · sitemap.xml · site.webmanifest
└── package.json               # Yalnızca yardımcı komutlar (dev, check)
```

## Kurulum ve yerel çalıştırma

Node.js 18+ yeterlidir (yalnızca yerel sunucu ve kontrol betiği için).

```bash
git clone https://github.com/dragonn55/celcini.git
cd celcini
npm run dev        # http://localhost:3000
```

Alternatif: herhangi bir statik sunucu da çalışır, örn. `python3 -m http.server 3000`.

> Mutlak yollar (`/assets/...`) kullanıldığı için siteyi dosyadan (`file://`) değil,
> bir sunucu üzerinden açın.

Yayın öncesi kontrol:

```bash
npm run check      # her HTML'de title/description/viewport var mı, iç bağlantılar kırık mı
```

## Bağlantıları güncelleme (Shopier ve Google Form)

Tüm dış bağlantılar **`assets/js/config.js`** dosyasında toplanmıştır. HTML'deki
`data-link="anahtar"` öznitelikli bağlantılar sayfa yüklenince bu dosyadaki değerle
güncellenir; HTML'i tek tek düzenlemeniz gerekmez.

```js
window.CELCINI_LINKS = {
  "shopier.magaza": "https://www.shopier.com/celcini",
  "shopier.fabricakit.paket": "https://www.shopier.com/...",   // ürün bağlantısı
  "form.uzay.bekleme": "https://forms.gle/...",                 // Google Form
  ...
};
```

JavaScript kapalıyken HTML'deki `href` değerleri devreye girer; bu yüzden önemli
bağlantıları (mağaza, bekleme listesi) hem `config.js`'de hem HTML'de güncel tutmak
iyi bir alışkanlıktır.

## Vercel'e yayınlama

### Seçenek A — GitHub entegrasyonu (önerilen)

1. [vercel.com](https://vercel.com) hesabınıza girin → **Add New → Project**.
2. `dragonn55/celcini` deposunu seçin.
3. **Framework Preset:** `Other`. Build Command ve Output Directory **boş** kalsın
   (kök dizin doğrudan yayınlanır).
4. **Deploy**'a basın. Sonraki her `main` push'u otomatik yayınlanır; diğer dallar
   önizleme adresi alır.

### Seçenek B — Vercel CLI

```bash
npm i -g vercel
vercel          # ilk kurulum: proje adı ve ayarlar sorulur, boş bırakın
vercel --prod   # canlıya al
```

### Alan adı

Vercel panelinde **Settings → Domains** altında `celcini.com` ekleyin ve verilen
DNS kayıtlarını alan adı sağlayıcınıza girin. Ardından şu dosyalardaki alan adını
doğrulayın: `sitemap.xml`, `robots.txt` ve her HTML'in `canonical` / `og:url` etiketleri
(hepsi şimdilik `https://celcini.com/`).

## Yayın öncesi yapılacaklar

- [ ] `assets/js/config.js` içindeki Shopier ve Google Form bağlantılarını gerçek adreslerle değiştirin.
- [ ] `assets/img/logo.svg` ve `favicon.svg` dosyalarını nihai logo ile değiştirin.
- [ ] `assets/img/og-cover.png` (1200×630) sosyal paylaşım görselini ekleyin.
- [ ] İletişim e-postasını (`info@celcini.com`) doğrulayın.
- [ ] Şablon adlarını / açıklamalarını Shopier'deki ürünlerle eşleştirin.

## Tasarım sistemi

Renkler ve ölçüler `assets/css/style.css` dosyasının başındaki `:root` bloğunda tanımlıdır:

| Değişken | Değer | Kullanım |
|---|---|---|
| `--bg` | `#0B1326` | Koyu lacivert zemin |
| `--accent` | `#2DD4BF` | Turkuaz vurgu (butonlar, ikonlar, logo) |
| `--text` / `--text-muted` | `#E6EDF7` / `#A3B1C6` | Metin tonları |

Yazı tipi: Inter (Google Fonts), sistem fontuna otomatik geri düşer.

## Uzay'a yeni AI aracı ekleme

Adım adım rehber ve iskelet dosyaları `uzay/araclar/README.md` içindedir. Özetle:
`_sablon/` klasörünü kopyalayın, adını verin, mantığı `app.js`'e yazın; yapay zekâ
API çağrıları için `api/` altında Vercel Serverless Function kullanın ve anahtarı
Vercel ortam değişkeninde tutun.

## Lisans

Tüm hakları saklıdır © Celcini.
