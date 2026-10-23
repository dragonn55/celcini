/* Ajan GM · kural modu: değişkenli şablon havuzu. Yorumlar günün karnesindeki sayılarla doldurulur.
   Karakter: kısa, kesin, nazik ama sert; hakaret etmez. Odaları kod adıyla söyler. Her yorum yarın için
   tek somut talimatla biter. Metinde {hitap} yer tutucusu kalır; tarayıcı oyuncunun hitabıyla değiştirir. */
import { AYARLAR } from "../ayarlar.js";
import { gmAdi } from "../odalar.js";
import { sayi, tl, ondalik, ek, saat } from "../bicim.js";
import { PUAN_TURU_ADI } from "../motor/puan.js";

const oda = (id, tur) => (tur ? ek(gmAdi(id), tur) : gmAdi(id));
const planSaati = () => saat(AYARLAR.ZAMANINDA_PLAN_SAAT * 60);
const kucukBas = (s) => (s ? s.charAt(0).toLocaleLowerCase("tr") + s.slice(1) : s);
const ilkUnutulan = (k) => {
  const t = k.unutulan.liste[0] || "";
  return kucukBas(t.replace(/^Unutulan (iş|onay): /, ""));
};

/* Karneden şablon değişkenleri */
function degiskenler(k) {
  return {
    puan: sayi(k.puan),
    harf: k.harf,
    zamaninda: sayi(k.teslim.zamaninda),
    toplam: sayi(k.teslim.toplam),
    gec: sayi(k.teslim.toplam - k.teslim.zamaninda),
    oran: k.teslim.yuzde === null ? null : `%${k.teslim.yuzde}`,
    durus: ondalik(k.durus.saat),
    bagli: tl(k.bagliPara),
    harcanan: tl(k.harcama.harcanan),
    limit: tl(k.harcama.limit),
    unutulan: sayi(k.unutulan.sayi),
    ilkUnutulan: ilkUnutulan(k),
    dusen: sayi(k.satinAlma.dusen),
    fazla: sayi(k.satinAlma.fazla),
  };
}

const ACILIS = {
  A: [
    (v) => `{hitap}, bugünü temiz kapattınız: ${v.puan} puan, harf notu A.`,
    (v) => `{hitap}, fabrika bugün sözünü tuttu. Not: A, puan ${v.puan}.`,
    (v) => `{hitap}, kayıtlarıma A notuyla geçiyorsunuz: ${v.puan} puan.`,
  ],
  B: [
    (v) => `{hitap}, iyi bir gün ama kusursuz değil: ${v.puan} puan, B.`,
    (v) => `{hitap}, hedefe yakın kaldınız. Not: B, puan ${v.puan}.`,
    (v) => `{hitap}, işler büyük ölçüde yürüdü. B notu, ${v.puan} puan.`,
  ],
  C: [
    (v) => `{hitap}, fabrika bugün yarım güçle çalıştı: ${v.puan} puan, C.`,
    (v) => `{hitap}, ortalama bir gün. Not: C, puan ${v.puan}.`,
    (v) => `{hitap}, kaçan işler kazanılanları dengeledi. C notu, ${v.puan} puan.`,
  ],
  D: [
    (v) => `{hitap}, bugün çok şey elden kaçtı: ${v.puan} puan, D.`,
    (v) => `{hitap}, zayıf bir gün. Not: D, puan ${v.puan}.`,
    (v) => `{hitap}, bu gün kontrol sizde değildi. D notu, ${v.puan} puan.`,
  ],
  E: [
    (v) => `{hitap}, bu günü olduğu gibi kayda geçiriyorum: ${v.puan} puan, E.`,
    (v) => `{hitap}, fabrika bugün kendi başına kaldı. Not: E, puan ${v.puan}.`,
    (v) => `{hitap}, bugün yönetim yoktu, yalnızca olaylar vardı. E notu, ${v.puan} puan.`,
  ],
};

const SORUN = {
  GEC_TESLIM: [
    (v) => `Teslim gününde ${v.toplam} satırdan yalnızca ${v.zamaninda} tanesi çıktı.`,
    (v) => `${v.gec} satır teslim gününü kaçırdı; zamanında teslim oranı ${v.oran}.`,
    (v) => `Müşteri bekledi: ${v.gec} satır bugün yola çıkmadı.`,
  ],
  UNUTULAN_ONAY: [
    (v) => `${oda("satinalma")} tarafında ${v.dusen} sipariş, onay alınmadığı için düştü.`,
    (v) => `Tedarikçi yanıt verdi, siz onaylamadınız: ${v.dusen} sipariş düştü.`,
    (v) => `Sayaç doldu, sipariş gitti. Bugün böyle ${v.dusen} sipariş kaybettiniz.`,
  ],
  MALZEME_BITTI: [
    (v) => `Hatlar toplam ${v.durus} saat durdu; sebep malzeme.`,
    (v) => `${oda("uretim", "de")} malzeme bitti, toplam duruş ${v.durus} saat.`,
    (v) => `Plan vardı, malzeme yoktu: hatlar ${v.durus} saat bekledi.`,
  ],
  BUTCE_ASIMI: [
    (v) => `${oda("finans")} bütçeyi ${v.limit} verdi, siz ${v.harcanan} harcadınız.`,
    (v) => `Günlük bütçe aşıldı: ${v.harcanan} / ${v.limit}.`,
    (v) => `Bütçe bir sınırdır, öneri değil: harcama ${v.harcanan}, sınır ${v.limit}.`,
  ],
  FAZLA_SIPARIS: [
    (v) => `${v.fazla} sipariş ihtiyacın çok üstündeydi; depoda ${v.bagli} bağlı duruyor.`,
    (v) => `Gereksiz sipariş depoya para gömdü: bağlanan para ${v.bagli}.`,
    (v) => `İhtiyaçtan fazla aldınız. Depo ${v.bagli} taşıyor.`,
  ],
  UNUTULAN_IS: [
    (v) => `${v.unutulan} iş zamanında yapılmadı. İlki: ${v.ilkUnutulan}.`,
    (v) => `Listemde ${v.unutulan} açık iş kaldı; en önemlisi: ${v.ilkUnutulan}.`,
    (v) => `Bugün ${v.unutulan} iş sahipsiz kaldı. Başta: ${v.ilkUnutulan}.`,
  ],
  YOK: [
    () => "Kayıtlarda tek bir eksik yok.",
    () => "Bugün hiçbir iş sahipsiz kalmadı.",
    () => "Ne geç teslim var ne unutulan iş.",
  ],
};

const TALIMAT = {
  GEC_TESLIM: [
    () => `Yarın için talimatım: saat 09:00 olmadan ${oda("planlama", "de")} kapasite tablosuna bakın, yüzde yüzü aşan günü ${oda("uretim", "de")} ikinci vardiyayla kapatın.`,
    () => `Yarın için talimatım: siparişler gelir gelmez ${oda("planlama", "de")} planı güncelleyin ve geç kalacak satır uyarısını aynı saat içinde kapatın.`,
    () => `Yarın için talimatım: geç kalacak her satır için ${oda("uretim", "de")} ikinci vardiyayı 12:00'den önce açın.`,
  ],
  UNUTULAN_ONAY: [
    () => `Yarın için talimatım: ${oda("satinalma", "de")} her siparişin onayını sayaç bir saatin altına inmeden alın.`,
    () => `Yarın için talimatım: sipariş verdikten sonra sayaç şeridini izleyin; "Onaya hazır" yazınca hemen onaylayın.`,
    () => `Yarın için talimatım: aynı anda en fazla iki onay bekletin; üçüncüyü vermeden öncekini kapatın.`,
  ],
  MALZEME_BITTI: [
    () => `Yarın için talimatım: sabah ilk iş ${oda("planlama", "de")} malzeme ihtiyacını açın ve GEÇ KALINDI yazan her kalemi en hızlı tedarikçiye verin.`,
    () => `Yarın için talimatım: BUGÜN VER yazan kalemi o gün, öğleden önce sipariş edin.`,
    () => `Yarın için talimatım: stoğu iki gün içinde bitecek her kalemi sabah sipariş edin.`,
  ],
  BUTCE_ASIMI: [
    () => `Yarın için talimatım: sipariş vermeden önce ${oda("finans", "deki")} kalan bütçeye bakın.`,
    () => `Yarın için talimatım: önerilen miktarın üstüne çıkmayın; pahalı tedarikçiyi yalnızca GEÇ KALINDI kalemde kullanın.`,
    () => `Yarın için talimatım: ikinci vardiyayı yalnızca kapasite uyarısı varsa açın.`,
  ],
  FAZLA_SIPARIS: [
    () => `Yarın için talimatım: ${oda("satinalma", "de")} önerilen miktarı aşmayın.`,
    () => `Yarın için talimatım: "İleride" yazan kalemi bugün almayın; günü gelince alın.`,
    () => `Yarın için talimatım: her siparişten önce malzemenin bitiş gününe bakın.`,
  ],
  UNUTULAN_IS_PLAN: [
    () => `Yarın için talimatım: saat ${planSaati()} olmadan siparişleri ${oda("planlama", "de")} plana alın.`,
    () => `Yarın için talimatım: gün içinde sipariş değişirse bir saat içinde planı güncelleyin.`,
  ],
  UNUTULAN_IS_SIPARIS: [
    () => `Yarın için talimatım: BUGÜN VER yazan her kalemi aynı gün ${oda("satinalma", "e")} taşıyın.`,
    () => `Yarın için talimatım: gün bitmeden ${oda("planlama", "de")} malzeme ihtiyacını bir kez daha kontrol edin.`,
  ],
  UNUTULAN_IS_TESLIM: [
    () => `Yarın için talimatım: kapıya gelen her teslimatı bir saat içinde ${oda("depo", "de")} teslim alın.`,
    () => `Yarın için talimatım: ${oda("depo")} ışığı yandığında önce kapıdaki teslimatı alın.`,
  ],
  UNUTULAN_IS_KALITE: [
    () => `Yarın için talimatım: ${oda("kalite", "den")} gelen kararı sayaç bitmeden verin.`,
    () => `Yarın için talimatım: bozuk parti bildirimi gelince ${oda("kalite", "e")} hemen gidin.`,
  ],
  YOK: [
    () => `Yarın için talimatım: siparişler gece yine değişecek; saat 09:00 olmadan planı güncelleyin.`,
    () => `Yarın için talimatım: aynı disiplini koruyun; sabah planını saat ${planSaati()} olmadan bitirin.`,
    () => `Yarın için talimatım: ithal kalemin sipariş gününü kaçırmayın; ${oda("planlama", "de")} her sabah kontrol edin.`,
  ],
};

function talimatAnahtari(k) {
  const tur = k.enBuyukSorun ? k.enBuyukSorun.tur : null;
  if (tur !== "UNUTULAN_IS") return tur && TALIMAT[tur] ? tur : "YOK";
  const ilk = k.unutulan.liste.find((m) => m.startsWith("Unutulan iş")) || "";
  if (/plana alınmadı|plan güncellenmedi/.test(ilk)) return "UNUTULAN_IS_PLAN";
  if (/sipariş verilmedi/.test(ilk)) return "UNUTULAN_IS_SIPARIS";
  if (/teslimat alınmadı/.test(ilk)) return "UNUTULAN_IS_TESLIM";
  if (/bozuk parti/.test(ilk)) return "UNUTULAN_IS_KALITE";
  return "UNUTULAN_IS_PLAN";
}

/* Havuzdan sıradaki kullanılmamış şablon; hepsi kullanıldıysa güne göre döner */
function sec(havuz, anahtar, gun, kullanilan) {
  const liste = havuz[anahtar];
  for (let i = 0; i < liste.length; i++) {
    const j = (gun - 1 + i) % liste.length;
    const id = `${anahtar}:${j}`;
    if (!kullanilan.includes(id)) return { id, f: liste[j] };
  }
  const j = (gun - 1) % liste.length;
  return { id: `${anahtar}:${j}`, f: liste[j] };
}

/* Günün yorumu → { metin, sablonlar }. Metinde {hitap} yer tutucusu vardır. */
export function kuralYorumu(karne, kullanilan = []) {
  const v = degiskenler(karne);
  const sorunTuru = karne.enBuyukSorun && SORUN[karne.enBuyukSorun.tur] ? karne.enBuyukSorun.tur : "YOK";
  const parcalar = [
    sec(ACILIS, karne.harf, karne.gun, kullanilan),
    sec(SORUN, sorunTuru, karne.gun, kullanilan),
    sec(TALIMAT, talimatAnahtari(karne), karne.gun, kullanilan),
  ];
  return { metin: parcalar.map((p) => p.f(v)).join(" "), sablonlar: parcalar.map((p) => p.id) };
}

/* "Ajanı sorgula" (kural modu): üç hazır soru, cevaplar günün sayılarıyla */
export const SORULAR = [
  { id: "neden", metin: "Neden bu not?" },
  { id: "hata", metin: "En büyük hatam neydi?" },
  { id: "yarin", metin: "Yarın ne yapmalıyım?" },
];

export function kuralCevap(karne, soruId) {
  const v = degiskenler(karne);
  if (soruId === "neden") {
    const kalemler = karne.defter.slice().sort((a, b) => Math.abs(b.puan) - Math.abs(a.puan)).slice(0, 3)
      .map((k) => `${k.metin} (${k.puan > 0 ? "+" : ""}${k.puan})`);
    const arti = karne.defter.filter((k) => k.puan > 0).reduce((t, k) => t + k.puan, 0);
    const eksi = karne.defter.filter((k) => k.puan < 0).reduce((t, k) => t + k.puan, 0);
    const teslim = v.oran === null ? "Bugün teslim günü gelen satır yoktu." : `Zamanında teslim ${v.oran} (${v.zamaninda}/${v.toplam}).`;
    return `{hitap}, gün başında puanınız ${sayi(AYARLAR.PUAN.BASLANGIC)} idi; ${sayi(arti)} kazandınız, ${sayi(Math.abs(eksi))} kaybettiniz ve ${v.puan} puanla ${v.harf} aldınız. ${teslim}` +
      (kalemler.length ? ` En ağır kalemler: ${kalemler.join("; ")}.` : " Defterde başka kalem yok.");
  }
  if (soruId === "hata") {
    const s = karne.enBuyukSorun;
    if (!s) return "{hitap}, bugün puan kaybettiren bir hata yok. Bu yüzden size yarın için daha zor bir hedef veriyorum: bütün onayları ilk bir saatte alın.";
    const ornek = karne.defter.find((k) => k.tur === s.tur);
    return `{hitap}, en büyük kaybınız ${PUAN_TURU_ADI[s.tur].toLocaleLowerCase("tr")}: ${sayi(s.adet)} kez, toplam ${sayi(s.puan)} puan. Örnek: ${kucukBas(ornek ? ornek.metin.replace(/^[^:]+: /, "") : "")}.`;
  }
  const talimat = sec(TALIMAT, talimatAnahtari(karne), karne.gun, []).f(v).replace("Yarın için talimatım: ", "");
  return `{hitap}, tek iş: ${talimat}`;
}
