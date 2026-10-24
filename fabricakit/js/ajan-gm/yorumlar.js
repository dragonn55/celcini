/* Ajan GM · kural modu: değişkenli şablon havuzu. Yorumlar günün karnesindeki sayılarla doldurulur.
   Karakter: kısa, kesin, nazik ama sert; hakaret etmez. Odaları kod adıyla söyler. Her yorum yarın için
   tek somut talimatla biter. Metinde {hitap} yer tutucusu kalır; tarayıcı oyuncunun hitabıyla değiştirir. */
import { AYARLAR } from "../ayarlar.js";
import { gmAdi } from "../odalar.js";
import { sayi, tl, ondalik, ek, saat } from "../bicim.js";
import { PUAN_TURU_ADI } from "../motor/puan.js";

const oda = (id, tur) => (tur ? ek(gmAdi(id), tur) : gmAdi(id));
const planSaati = () => saat(AYARLAR.ZAMANINDA_PLAN_SAAT * 60);
/* Cümle içine alınan metnin ilk harfi küçülür; kısaltmayla başlıyorsa ("MDF levha") dokunulmaz */
const kucukBas = (s) => (s && !/^\p{Lu}{2}/u.test(s) ? s.charAt(0).toLocaleLowerCase("tr") + s.slice(1) : s);
/* "İlki:" ile yarının talimatı aynı kaleme bakar: ilk "Unutulan iş", yoksa ilk kalem (unutulan onay) */
const ilkKalem = (k) => k.unutulan.liste.find((m) => m.startsWith("Unutulan iş")) || k.unutulan.liste[0] || "";
const ilkUnutulan = (k) => kucukBas(ilkKalem(k).replace(/^Unutulan (iş|onay): /, ""));
/* Koşullu şablon yalnızca koşulu tutan günde seçilir */
const kosullu = (kosul, f) => Object.assign(f, { kosul });
/* Açılış kalıbı: sayısız sabit parça (ajan-gm/cumleler.js'te ses dosyası olur) + hitap ve puan. Metin ekranda aynıdır. */
const acilis = (sabit, kalip) => Object.assign((v) => kalip(sabit, v), { sabit });
const cezasiz = (k) => !k.defter.some((x) => x.puan < 0);
const gecTeslimYok = (k) => !k.defter.some((x) => x.tur === "GEC_TESLIM");

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

export const ACILIS = {
  A: [
    kosullu(cezasiz, acilis("bugünü temiz kapattınız", (s, v) => `{hitap}, ${s}: ${v.puan} puan, harf notu A.`)),
    kosullu(gecTeslimYok, acilis("fabrika bugün sözünü tuttu.", (s, v) => `{hitap}, ${s} Not: A, puan ${v.puan}.`)),
    acilis("kayıtlarıma A notuyla geçiyorsunuz", (s, v) => `{hitap}, ${s}: ${v.puan} puan.`),
  ],
  B: [
    acilis("iyi bir gün ama kusursuz değil", (s, v) => `{hitap}, ${s}: ${v.puan} puan, B.`),
    acilis("hedefe yakın kaldınız.", (s, v) => `{hitap}, ${s} Not: B, puan ${v.puan}.`),
    acilis("işler büyük ölçüde yürüdü.", (s, v) => `{hitap}, ${s} B notu, ${v.puan} puan.`),
  ],
  C: [
    acilis("fabrika bugün yarım güçle çalıştı", (s, v) => `{hitap}, ${s}: ${v.puan} puan, C.`),
    acilis("ortalama bir gün.", (s, v) => `{hitap}, ${s} Not: C, puan ${v.puan}.`),
    acilis("kaçan işler kazanılanları dengeledi.", (s, v) => `{hitap}, ${s} C notu, ${v.puan} puan.`),
  ],
  D: [
    acilis("bugün çok şey elden kaçtı", (s, v) => `{hitap}, ${s}: ${v.puan} puan, D.`),
    acilis("zayıf bir gün.", (s, v) => `{hitap}, ${s} Not: D, puan ${v.puan}.`),
    acilis("bu gün kontrol sizde değildi.", (s, v) => `{hitap}, ${s} D notu, ${v.puan} puan.`),
  ],
  E: [
    acilis("bu günü olduğu gibi kayda geçiriyorum", (s, v) => `{hitap}, ${s}: ${v.puan} puan, E.`),
    acilis("fabrika bugün kendi başına kaldı.", (s, v) => `{hitap}, ${s} Not: E, puan ${v.puan}.`),
    acilis("bugün yönetim yoktu, yalnızca olaylar vardı.", (s, v) => `{hitap}, ${s} E notu, ${v.puan} puan.`),
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
    (v) => `Günlük bütçe aşıldı: ${v.harcanan} harcandı, sınır ${v.limit}.`,
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

/* Her talimat "Yarın için talimatım: " ile başlar; giriş ve talimatın gövdesi ayrı ses dosyasıdır (ajan-gm/cumleler.js) */
export const TALIMAT_GIRISI = "Yarın için talimatım:";
export const TALIMAT = {
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
  ],
  UNUTULAN_IS_GUNCELLE: [
    () => `Yarın için talimatım: gün içinde sipariş ya da kapasite değişirse bir saat içinde planı güncelleyin.`,
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
  const ilk = ilkKalem(k);
  if (/plana alınmadı/.test(ilk)) return "UNUTULAN_IS_PLAN";
  if (/plan güncellenmedi/.test(ilk)) return "UNUTULAN_IS_GUNCELLE";
  if (/sipariş verilmedi/.test(ilk)) return "UNUTULAN_IS_SIPARIS";
  if (/teslimat alınmadı/.test(ilk)) return "UNUTULAN_IS_TESLIM";
  if (/bozuk parti/.test(ilk)) return "UNUTULAN_IS_KALITE";
  return "UNUTULAN_IS_PLAN";
}

/* Havuzdan sıradaki kullanılmamış şablon (koşullu şablon yalnızca koşulu tutan günde); hepsi kullanıldıysa güne göre döner */
function sec(havuz, anahtar, gun, kullanilan, karne) {
  const liste = havuz[anahtar];
  const sira = liste.map((_, i) => (gun - 1 + i) % liste.length).filter((j) => !liste[j].kosul || liste[j].kosul(karne));
  const j = sira.find((x) => !kullanilan.includes(`${anahtar}:${x}`)) ?? sira[0];
  return { id: `${anahtar}:${j}`, f: liste[j] };
}

/* Günün yorumu → { metin, sablonlar }. Metinde {hitap} yer tutucusu vardır. */
export function kuralYorumu(karne, kullanilan = []) {
  const v = degiskenler(karne);
  const sorunTuru = karne.enBuyukSorun && SORUN[karne.enBuyukSorun.tur] ? karne.enBuyukSorun.tur : "YOK";
  const parcalar = [
    sec(ACILIS, karne.harf, karne.gun, kullanilan, karne),
    sec(SORUN, sorunTuru, karne.gun, kullanilan, karne),
    sec(TALIMAT, talimatAnahtari(karne), karne.gun, kullanilan, karne),
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
  const talimat = sec(TALIMAT, talimatAnahtari(karne), karne.gun, [], karne).f(v).replace(`${TALIMAT_GIRISI} `, "");
  return `{hitap}, tek iş: ${talimat}`;
}
