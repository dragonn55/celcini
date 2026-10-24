/* Fabricakit · ayarlar
   Oyunun bütün kural ve denge sayıları burada: puanlar, sayaç süreleri, tedarik süreleri, oyun saati hızı, ürün ağaçları,
   fiyatlar, olasılıklar, uyarı eşikleri, günlerin tohumları ve zorluk. Sayıyı değiştirip sayfayı yenilemeniz yeterli.
   Kodda yalnızca birim dönüşümleri (60 dk, 1440 dk, %100), yuvarlama adımları, ekran düzeni sayıları ve yazı-tura (0,5)
   seçimleri kalır.
   Kayıt yapısını bozan bir değişiklik yaparsanız KAYIT_SURUMU'nu bir artırın: eski kayıtlar sıfırlanır.
   Tüm veriler sentetiktir: gerçek firma, gerçek müşteri ya da gerçek fiyat değildir. */

export const AYARLAR = {
  KAYIT_SURUMU: 1,

  /* ---- Ajan GM ---- */
  AJAN_GM_KAYNAK: "kural",            // "kural" (şablonlar) ya da "yapay-zeka" (api/ajan-gm.js)
  AJAN_GM_YAPAY_ZEKA_KIME: "kodlu",   // "kodlu" (yalnız erişim kodu girenler) ya da "herkes"
  AJAN_GM_ZAMAN_ASIMI_MS: 9000,       // yapay zeka yanıtı bu sürede gelmezse kural moduna düşülür
  AJAN_GM_SORU_UZUNLUGU: 200,         // serbest sorunun en fazla karakter sayısı
  AJAN_GM_SORU_HAKKI: 3,              // yapay zeka modunda bir karnede sorulabilecek serbest soru sayısı
  AJAN_GM_AVATAR: { webp: "/assets/img/ajan-gm-avatar.webp", png: "/assets/img/ajan-gm-avatar.png" }, // daire avatar
  /* Ajan GM yalnızca erkek sesle konuşur. Cihaz sesi, adı bu listedekilerden birini içeren yerel Türkçe sestir
     (ör. Windows'ta "Microsoft Tolga"). Böyle bir ses yoksa ve ses dosyaları da yoksa "Sesli oku" düğmeleri görünmez. */
  ERKEK_SESLER: ["Tolga"],

  /* ---- Oyun saati ---- */
  GUN_BASI_SAAT: 8,                   // 08:00
  GUN_SONU_SAAT: 18,                  // 18:00
  OYUN_SAATI_SANIYE: 20,              // gerçek zamanda 1 oyun saati kaç saniye sürer

  /* ---- Günler: 1. gün ücretsiz, 2–5 erişim koduyla. Aynı tohum her açılışta aynı siparişleri ve olayları verir. ---- */
  UCRETSIZ_GUN: 1,
  GUNLER: [
    { gun: 1, tohum: 410261, olay: [2, 3], degisim: [0.00, 0.00], siddet: 0.00, yeniSatir: [0, 0], zorunluOlay: ["bozuk-parti"] },
    { gun: 2, tohum: 410262, olay: [2, 3], degisim: [0.60, 0.66], siddet: 0.15, yeniSatir: [1, 2] },
    { gun: 3, tohum: 410263, olay: [3, 4], degisim: [0.66, 0.74], siddet: 0.20, yeniSatir: [2, 3] },
    { gun: 4, tohum: 410264, olay: [3, 4], degisim: [0.72, 0.80], siddet: 0.25, yeniSatir: [2, 3] },
    { gun: 5, tohum: 410265, olay: [4, 5], degisim: [0.78, 0.85], siddet: 0.30, yeniSatir: [2, 4] },
  ],
  /* olay: o gün kaç olay gelir (alt, üst); zorunluOlay: o gün her zaman gelen olay türleri (1. gün Kalite bozuk parti:
     karar isteyen olay ücretsiz günde de görülsün); degisim: gece satırların ne kadarının miktarı değişir (alt, üst oran);
     siddet: değişimin büyüklüğü; yeniSatir: gece eklenen yeni satır sayısı. 1. gün defter ilk kez gelir, değişim yoktur.
     ONE_CEKME_ORANI: değişen satırların yaklaşık bu kadarı aynı zamanda öne çekilir */
  ONE_CEKME_ORANI: 0.65,
  ONE_CEKME_GUN: [1, 2],
  NET_DEGISIM_SINIRI: 0.05,           // gece değişiminden sonra toplam miktar en fazla %5 oynar
  YENI_SATIR_EN_ERKEN_GUN: 6,         // gece eklenen yeni satırın teslimi en erken bu kadar gün sonra

  /* ---- Siparişler (Satış-Pazarlama) ---- */
  MUSTERI_SAYISI: [2, 4],
  SATIR_SAYISI: [12, 18],
  UFUK_GUN: 30,                       // siparişler en fazla 30 gün ilerisi için gelir
  MUSTERILER: [                       // sentetik müşteri tipleri; gerçek firma değildir
    { ad: "Ofis zinciri", urunler: ["masa", "sandalye", "raf"] },
    { ad: "Okul projesi", urunler: ["masa", "sandalye"] },
    { ad: "Kafe zinciri", urunler: ["masa", "sandalye"] },
    { ad: "Depo kurulumu", urunler: ["raf"] },
    { ad: "Mağaza zinciri", urunler: ["raf", "masa"] },
    { ad: "Otel tadilatı", urunler: ["masa", "sandalye", "raf"] },
  ],
  SATIR_MIKTARI: { masa: [12, 36], sandalye: [30, 90], raf: [12, 40] },
  SATIR_YUVARLAMA: { masa: 2, sandalye: 6, raf: 4 },
  ILK_GUNLER_EN_AZ_SATIR: 1,          // 1–5. günlerin her birinde en az bu kadar satır teslim edilir
  TESLIM_YIGILMA: 1.6,                // 1'den büyükse kalan satırlar ufkun başına yığılır
  YAKIN_SATIR_GUN: 3,                 // 1. günden bu güne kadar teslim edilecek satırlar küçük gelir
  YAKIN_SATIR_CARPANI: 0.6,           // o satırların miktar çarpanı (ilk günler sığsın)
  BASLANGIC_MAMUL_ORANI: [0.6, 0.3],  // depoda hazır mamul: 1. ve 2. gün teslim edilecek miktarın bu kadarı

  /* ---- Ürünler ve hatlar (Üretim) ---- */
  HATLAR: [
    { id: "ahsap", ad: "Ahşap hattı", usta: 2, operator: 6 },
    { id: "metal", ad: "Metal hattı", usta: 2, operator: 5 },
  ],
  URUNLER: [
    { id: "masa", ad: "Masa", hat: "ahsap", dakika: 24, maliyet: 1850 },
    { id: "sandalye", ad: "Sandalye", hat: "ahsap", dakika: 10, maliyet: 690 },
    { id: "raf", ad: "Çelik raf", hat: "metal", dakika: 20, maliyet: 1420 },
  ],
  HAT_DAKIKA: 600,                    // tek vardiya: 08:00–18:00
  IKINCI_VARDIYA: { dakika: 480, maliyet: 18000 }, // gece vardiyası: 8 saat, günlük bütçeden düşer

  /* ---- Malzemeler ve ürün ağacı (Ar-Ge, Depo) ----
     kapsama: oyun başında depodaki stok kaç günlük üretime yeter (1. gün sabahki siparişler zamanında
     plana alınırsa). 2'nin altı: hızlı tedarikçi bile yetişmez; 2–3: "GEÇ KALINDI" ama Tedarikçi A yetişir;
     ~4,5: "BUGÜN VER"; daha büyük: ileride verilecek. */
  MALZEMELER: [
    { id: "mdf", ad: "MDF levha", birim: "adet", fiyat: 420, paket: 10, kapsama: 2.5 },
    { id: "oturak", ad: "Kontrplak oturak", birim: "adet", fiyat: 140, paket: 20, kapsama: 6 },
    { id: "kereste", ad: "Kayın kereste", birim: "adet", fiyat: 85, paket: 50, kapsama: 4.5 },
    { id: "profil", ad: "Çelik profil", birim: "boy", fiyat: 160, paket: 20, kapsama: 5.5 },
    { id: "tabla", ad: "Raf tablası", birim: "adet", fiyat: 120, paket: 50, kapsama: 8 },
    { id: "vida", ad: "Vida seti", birim: "set", fiyat: 25, paket: 50, kapsama: 2.5 },
    { id: "braket", ad: "Bağlantı braketi", birim: "adet", fiyat: 12, paket: 100, kapsama: 9 },
    { id: "tutkal", ad: "Ahşap tutkalı", birim: "tüp", fiyat: 45, paket: 20, kapsama: 7 },
    { id: "vernik", ad: "Vernik", birim: "kutu", fiyat: 95, paket: 20, kapsama: 6.5 },
    { id: "tozboya", ad: "Toz boya (ithal)", birim: "kg", fiyat: 210, paket: 25, kapsama: 7, ithal: true },
    { id: "tapa", ad: "Ayak tapası", birim: "adet", fiyat: 3, paket: 200, kapsama: 10 },
    { id: "koli", ad: "Ambalaj kolisi", birim: "adet", fiyat: 30, paket: 50, kapsama: 8 },
  ],
  URUN_AGACI: {
    masa: { mdf: 1, kereste: 4, vida: 1, braket: 4, tutkal: 1, vernik: 1, tapa: 4, koli: 1 },
    sandalye: { oturak: 1, kereste: 4, vida: 1, tutkal: 1, vernik: 1, tapa: 4, koli: 1 },
    raf: { profil: 4, tabla: 5, vida: 2, braket: 8, tozboya: 1, tapa: 4, koli: 1 },
  },
  /* Oyundan önce verilmiş, yolda olan siparişler: gelecegiGun = kaçıncı gün kapıya gelir;
     kapsama = stoğun üstüne kaç günlük üretim daha getirir */
  YOLDAKI_SIPARISLER: [
    { malzeme: "vida", tedarikci: "b", kapsama: 2, gelecegiGun: 1, saat: 10.5 },
    { malzeme: "tozboya", tedarikci: "c", kapsama: 7, gelecegiGun: 4, saat: 11 },
    { malzeme: "tabla", tedarikci: "b", kapsama: 4, gelecegiGun: 2, saat: 9.5 },
  ],

  /* ---- Satın Alma ---- */
  TEDARIKCILER: [
    { id: "a", ad: "Tedarikçi A", sure: 2, fiyatKatsayi: 1.15, not: "Hızlı, pahalı" },
    { id: "b", ad: "Tedarikçi B", sure: 4, fiyatKatsayi: 1.0, not: "Standart" },
    { id: "c", ad: "Tedarikçi C", sure: 7, fiyatKatsayi: 0.9, not: "Uzak, ucuz; ithal kalemin tek kaynağı", ithalat: true },
  ],
  STANDART_TEDARIKCI: "b",            // sipariş takvimi bu tedarikçinin süresiyle hesaplanır
  ITHAL_EK_GUN: 5,                    // ithal kalem: C'nin süresine gümrük eklenir (7 + 5 = 12 gün)
  ONAY_SURESI_DK: 120,                // tedarikçi onayı için 2 oyun saati
  YANIT_SURESI_DK: [20, 60],          // tedarikçinin yanıtı (onaya hazır olması) bu kadar sürer
  VARIS_SAATI: [9, 15],               // teslimat kapıya bu saatler arasında gelir
  KAPSAMA_GUN: 5,                     // önerilen miktar, bitiş gününden sonraki bu kadar günü karşılar
  FAZLA_SIPARIS_ORANI: 0.6,           // ihtiyacın bu oranından fazlası "gereksiz fazla sipariş" sayılır
  GUNLUK_BUTCE: 120000,               // günlük harcama bütçesi (TL): satın alma, ikinci vardiya, acil bakım

  /* ---- Olaylar ---- */
  OLAY_SAATI: [9, 16],                // olaylar bu saatler arasında gelir; aralık olay sayısı kadar eşit dilime bölünür
  KALITE_KARAR_DK: 90,                // bozuk parti kararı için süre
  BOZUK_PARTI_ORANI: [0.2, 0.35],     // stoğun bu kadarı bozuk çıkar
  YENIDEN_ISLEME: { kurtarma: 0.6, hatDakika: 60 },
  USTA_AYRILDI: { verim: 0.75, gun: 2 },
  MAKINE_DURUSU_DK: [60, 180],
  ACIL_BAKIM: { maliyet: 4000, durusDk: 45 },
  SAYIM_FARKI_ORANI: [0.08, 0.18],
  SAYIM_EKSIK_OLASILIGI: 0.8,         // sayım farkının eksik yönde çıkma olasılığı (kalanı fazla)
  NAKIT_SINIRI_ORANI: [0.6, 0.75],
  ACIL_SIPARIS_GUN: [2, 3],
  ACIL_SIPARIS_OLASILIGI: 0.5,        // Satış-Pazarlama olayında acil yeni sipariş olasılığı (kalanı miktar artışı)
  SIPARIS_ARTIS_ORANI: [0.2, 0.4],    // miktar artışı olayında artış oranı
  URUN_DEGISIKLIKLERI: [              // Ar-Ge'nin yapabileceği ürün ağacı değişiklikleri
    { urun: "masa", malzeme: "braket", yeni: 6 },
    { urun: "sandalye", malzeme: "vida", yeni: 2 },
    { urun: "raf", malzeme: "tabla", yeni: 6 },
    { urun: "masa", malzeme: "kereste", yeni: 5 },
    { urun: "raf", malzeme: "profil", yeni: 5 },
  ],

  /* ---- Puan ve karne ---- */
  PUAN: {
    BASLANGIC: 100,
    ALT: 0,
    UST: 120,
    GEC_TESLIM: -8,          // teslim günü sevk edilemeyen her satır
    UNUTULAN_ONAY: -5,       // süresi dolup düşen her satın alma siparişi
    MALZEME_BITTI: -8,       // planlı üretim varken hatta malzeme bitmesi (hat ve malzeme başına günde bir kez)
    BUTCE_ASIMI: -5,         // günlük bütçe aşılırsa (günde bir kez)
    FAZLA_SIPARIS: -4,       // ihtiyaçtan belirgin fazla verilen sipariş
    UNUTULAN_IS: -6,         // plana alınmayan sipariş, verilmeyen malzeme siparişi, süresi dolan kalite kararı, kapıda bırakılan teslimat
    ZAMANINDA_PLAN: 5,       // sabah siparişleri saat ZAMANINDA_PLAN_SAAT'ten önce plana alınırsa
    ZAMANINDA_TESLIM: 2,     // teslim gününde sevk edilen her satır
  },
  ZAMANINDA_PLAN_SAAT: 10,
  KAPIDA_BEKLEME_DK: 60,     // en az bu kadar kapıda bekleyen teslimat Depo'yu "acil" yapar; gün sonunda "unutulan iş" sayılır
  UNUTULAN_MALZEME_EN_FAZLA: 3, // gün sonunda verilmemiş sipariş için en fazla bu kadar kalem cezalandırılır

  /* ---- Uyarı eşikleri ve görev notu ---- */
  BUTCE_UYARI_ORANI: 0.8,    // harcama bütçenin bu oranını geçince Finans-Muhasebe ve bütçe çubuğu "dikkat" olur
  KAPASITE_UYARI_ORANI: 0.85, // hat yükü kapasitenin bu oranını geçince kapasite tablosunda "dikkat" görünür
  SAYAC_ACIL_DK: 30,         // onay sayacında bu kadar dakika kalınca sayaç ve Satın Alma "acil" olur
  FAZLA_MIKTAR_UYARI_KATI: 2, // sipariş miktarı önerilenin bu katını aşarsa uyarı çıkar
  GOREV_NOTU_AYRINTILI_SON_GUN: 1, // bu güne kadar görev notu adımları ayrıntılı yazar
  GOREV_NOTU_SON_GUN: 2,     // bu günden sonra görev notu yok, yalnızca "Sipariş geldi" bildirimi
  /* Harf notu: puan bu sınıra eşit ya da üstündeyse o harf. 1. gün hedefi (scripts/sim-test.mjs denetler):
     hiçbir şey yapmayan E, rastgele oynayan C–D, her şeyi doğru yapan A–B. */
  HARF_NOTU: [
    { harf: "A", alt: 100 },
    { harf: "B", alt: 90 },
    { harf: "C", alt: 75 },
    { harf: "D", alt: 60 },
    { harf: "E", alt: 0 },
  ],
};
