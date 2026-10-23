# Celcini · Claude çalışma kuralları

## Proje
- Celcini'nin resmî sitesi: saf HTML + CSS + JS. Sayfalar `data/urunler.json`'dan `scripts/derle.py` ile üretilir, derlenmiş HTML depoda durur; Vercel'de derleme adımı yok. Ayrıntılar `README.md`'de.
- Site Vercel'e bağlı: `main`'e giren her değişiklik doğrudan canlıya çıkar; diğer dallar önizleme adresi alır.
- Komutlar: `python3 scripts/derle.py` (üretim) · `python3 scripts/derle.py --onizleme` (önizleme, `_onizleme/`) · `npm run dev` (yerel sunucu, port 3000) · `npm run check` (SEO etiketleri, kırık iç bağlantı, örnek kayıt sızıntısı, dil kuralları, Fabricakit sim-test ve api-test).

## Proje kuralları
- Mağaza, Google Form, e-posta ve Instagram bağlantıları yalnızca `assets/js/config.js`'te değişir. Ürünlerin Shopier bağlantıları `data/urunler.json`'da.
- Derlenmiş HTML elle düzenlenmez: kaynağı (`scripts/derle.py`, `data/urunler.json`) değiştir, yeniden derle.
- Yeni sayfada title, description, canonical ve og:url olsun; sayfa `sitemap.xml`'e eklensin (`derle.py` içindeki adres listesi).
- Renk ve ölçüler için `assets/css/style.css` başındaki `:root` değişkenlerini kullan.
- Arayüz Türkçe ve mobil öncelikli.
- Yapay zekâ API anahtarı tarayıcı koduna girmez; `api/` altında Vercel fonksiyonu ve ortam değişkeni kullanılır.
- Kullanıcı verisi işlem sonrası saklanmaz.

## Kod yazarken
- Önce düşün: belirsizlik varsa varsayımını söyle ya da sor; sessizce tahmin etme.
- Sade tut: istenenden fazlasını ekleme, gereksiz soyutlama yapma.
- Cerrahi değişiklik yap: yalnızca işin gerektirdiği satırlara dokun.
- Hedefe göre çalış: başlamadan "bitti" ölçütünü belirle, sonunda doğrula.

## Denetim ve birleştirme
- Küçük iş (tek dosya, birkaç satır): diff'e kendin bak ve `npm run check` çalıştır.
- Orta ve büyük iş: önce kısa bir brif yaz (GÖREV · SENİN DOSYALARIN · DOKUNMA · ÖNCE OKU · BİTTİ TANIMI · RAPOR), bitince `denetci` ajanına kontrol ettir.
- DUZELT gelirse yalnızca engelleri düzelt; en fazla 3 tur, sonra bana sor.
- `main`'e yalnızca `npm run check` geçtikten, denetçi ONAY verdikten ve ben onayladıktan sonra birleştir.
- Model: varsayılan sonnet; mekanik alt işler haiku; opus yalnızca zor tasarım ya da riskli denetimde. Alt ajana modeli açıkça ver.

## Değişmez kurallar
- Uydurma yok: fiyat, ürün adı, müşteri yorumu, rakam ya da kaynak uydurulmaz; bilinmiyorsa yer tutucu koy ve söyle.
- Sırlar (API anahtarı, şifre) koda, loga ya da sohbete yazılmaz.
- Tehlikeli git komutları yok: `stash`, `reset --hard`, `rebase`, `push --force`.
- Ücretli bir hizmet ya da kaynak açmadan önce aylık tutarı yaz ve onay al.
- İşin gerektirmediği kişisel veri toplanmaz.
