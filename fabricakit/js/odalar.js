/* Fabricakit · dokuz oda (tek liste)

   Ad kuralı:
   - Kapı tabelasında kod adı (gezegen) büyük, gerçek ad küçük yazılır: "DÜNYA / Planlama".
   - Ajan GM odaları kod adıyla söyler.
   - Görev notu, karne ve uyarılar her zaman gerçek adı kullanır.
   - Bir odanın kod adını "" yaparsanız o oda her yerde yalnızca gerçek adıyla görünür
     (gezegen simgesi de kalkar). Ana sayfadaki oda şeridi için ardından: python3 scripts/derle.py

   Biçim: anahtarlar tırnaksız, metinler çift tırnaklı. scripts/derle.py bu dosyayı okur. */

export const FABRIKA = {
  kod: "Samanyolu",
  ad: "Dokuzkapı Mobilya ve Metal",
  simge: "samanyolu",
};

export const ODALAR = [
  { id: "satis", kod: "Merkür", ad: "Satış-Pazarlama", simge: "merkur", tamOynanir: false,
    aciklama: "Müşteri siparişleri sabah buradan gelir; gün içinde değişiklik ve acil sipariş de buradan düşer." },
  { id: "arge", kod: "Venüs", ad: "Ar-Ge", simge: "venus", tamOynanir: false,
    aciklama: "Ürün ağaçları burada tutulur. Ürün değişikliği olunca malzeme listesi değişir." },
  { id: "planlama", kod: "Dünya", ad: "Planlama", simge: "dunya", tamOynanir: true,
    aciklama: "Siparişi plana koyar, hat kapasitesini izler, malzeme ihtiyacını ve sipariş takvimini çıkarır." },
  { id: "uretim", kod: "Mars", ad: "Üretim", simge: "mars", tamOynanir: false,
    aciklama: "Ahşap ve metal hattı. Makine duruşu, vardiya ve günlük üretim burada izlenir." },
  { id: "depo", kod: "Jüpiter", ad: "Depo", simge: "jupiter", tamOynanir: false,
    aciklama: "Malzeme ve mamul stoku. Gelen mal burada teslim alınır, sayım burada yapılır." },
  { id: "kalite", kod: "Satürn", ad: "Kalite", simge: "saturn", tamOynanir: false,
    aciklama: "Gelen partiler kontrol edilir. Bozuk parti çıkarsa karar burada verilir." },
  { id: "ik", kod: "Uranüs", ad: "İnsan Kaynakları", simge: "uranus", tamOynanir: false,
    aciklama: "Hatların ustaları ve operatörleri. Ayrılan usta hattın kapasitesini düşürür." },
  { id: "finans", kod: "Neptün", ad: "Finans-Muhasebe", simge: "neptun", tamOynanir: false,
    aciklama: "Günlük satın alma bütçesi ve depoda bağlanan para burada izlenir." },
  { id: "satinalma", kod: "Plüton", ad: "Satın Alma", simge: "pluton", tamOynanir: true,
    aciklama: "Tedarikçi seçilir, sipariş verilir, tedarikçi onayı alınır." },
];

const BUYUK_HARF = (metin) => metin.toLocaleUpperCase("tr");

export function odaBul(id) {
  return ODALAR.find((o) => o.id === id) || null;
}

/* Kapı tabelası: { buyuk: "DÜNYA", kucuk: "Planlama" }; kod adı boşsa { buyuk: "PLANLAMA", kucuk: "" } */
export function tabela(oda) {
  return oda.kod ? { buyuk: BUYUK_HARF(oda.kod), kucuk: oda.ad } : { buyuk: BUYUK_HARF(oda.ad), kucuk: "" };
}

/* Ajan GM'nin söylediği ad: kod adı, yoksa gerçek ad */
export function gmAdi(odaVeyaId) {
  const oda = typeof odaVeyaId === "string" ? odaBul(odaVeyaId) : odaVeyaId;
  if (!oda) return "";
  return oda.kod || oda.ad;
}

/* Görev notu, karne ve uyarılarda kullanılan ad: her zaman gerçek ad */
export function gercekAd(odaVeyaId) {
  const oda = typeof odaVeyaId === "string" ? odaBul(odaVeyaId) : odaVeyaId;
  return oda ? oda.ad : "";
}

/* Haritanın tek başlığı: "SAMANYOLU GALAKSİSİ" (galaksi kod adı boşsa fabrika adı). Fabrika adı ayrıca üst şeritte yazar. */
export function galaksiBasligi() {
  return BUYUK_HARF(FABRIKA.kod ? `${FABRIKA.kod} galaksisi` : FABRIKA.ad);
}
