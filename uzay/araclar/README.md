# Uzay — Web Tabanlı AI Araçları

Bu klasör, Uzay modülüne eklenecek **web tabanlı yapay zekâ araçlarına** ayrılmıştır.
Her araç kendi alt klasöründe, bağımsız bir statik sayfa olarak yaşar ve
`/uzay/araclar/<arac-adi>/` adresinden yayınlanır.

## Yeni araç ekleme

1. `uzay/araclar/_sablon/` klasörünü kopyalayın ve `kebab-case` bir ad verin:
   ```
   uzay/araclar/excel-asistani/
   ├── index.html   # araç arayüzü (ortak header/footer ve style.css kullanır)
   ├── app.js       # aracın mantığı
   └── app.css      # (isteğe bağlı) araca özel stiller
   ```
2. `index.html` içinde `<title>`, `description`, `canonical` ve breadcrumb
   JSON-LD alanlarını araca göre güncelleyin.
3. `/uzay/index.html` sayfasındaki "Planlanan ilk araçlar" kartına aracın
   bağlantısını ekleyin ve rozeti "Yayında" yapın.
4. `sitemap.xml` dosyasına yeni URL'yi ekleyin.

## Yapay zekâ API çağrıları

Statik site tarayıcıdan doğrudan bir yapay zekâ API'sine anahtar göndermemelidir.
Sunucu tarafı için önerilen yol **Vercel Serverless Functions**:

```
api/
└── uzay/
    └── <arac-adi>.js   # POST isteğini alır, API anahtarını ortam değişkeninden okur
```

- Anahtarı Vercel panelinde *Environment Variables* altında tanımlayın (ör. `AI_API_KEY`).
- Araç `app.js` dosyası `fetch("/api/uzay/<arac-adi>", { method: "POST", ... })` ile çağırır.
- `vercel.json` içinde ek yönlendirme gerekmez; `api/` klasörü otomatik tanınır.

## Ortak kurallar

- Türkçe arayüz, mobil öncelikli düzen, `style.css` değişkenleri (`--accent`, `--bg` …) kullanılır.
- Her araç tek bir işi yapar; yükleme/ilerleme durumu ve hata mesajı görünür olmalıdır.
- Kullanıcı verisi işlem sonrası saklanmaz; bu ilke `/uzay/` sayfasında ilan edilmiştir.
