/* Fabricakit sesleri. Dış servis yok.
   Efektler Web Audio API ile kodda üretilir; hepsi kısa ve kısık, hat çalışırken sürekli ses (uğultu) yoktur.
   Her efektin ekranda bir karşılığı var (bildirim, sayaç, karne): ses kapalıyken hiçbir bilgi kaybolmaz.
   Ses tercihi yalnızca bu tarayıcıda (localStorage), varsayılan açık; kapalıyken hiçbir ses çalmaz (Ajan GM dahil).
   Tarayıcı kuralı gereği AudioContext ilk dokunuşta ("Başla", "Devam et" ya da hoparlör düğmesi) kurulur.
   Ajan GM'nin sesi aşağıda: sabit cümleler sitedeki ses dosyalarından, değişken parçalar cihaz sesiyle. */
import { AYARLAR } from "../ayarlar.js";
import { SES_KLASORU, parcala } from "../ajan-gm/cumleler.js";
import { SES_DOSYALARI_HAZIR } from "../ajan-gm/ses-dosyalari.js";
import { h, ikon, temizle } from "./dom.js";

const TERCIH = "fabricakit-ses";
const SEVIYE = 0.08;                 // efektlerin en yüksek ses seviyesi (0–1)
const TIK_DK = 10;                   // onay sayacı tiki: her 10 oyun dakikasında bir
const TIK_ACIL_DK = 2;               // son SAYAC_ACIL_DK oyun dakikasında her 2 dakikada bir
const GM_SESI = { lang: "tr-TR", rate: 0.95, pitch: 0.85 };

let baglam = null;
let acik = (() => { try { return localStorage.getItem(TERCIH) !== "kapali"; } catch { return true; } })();

export const sesAcik = () => acik;

export function sesiDegistir() {
  acik = !acik;
  try { localStorage.setItem(TERCIH, acik ? "acik" : "kapali"); } catch { /* özel pencere: tercih yalnız bu oturumda */ }
  if (acik) sesiBaslat();
  else okumayiDurdur();
  dugmeleriGuncelle();
  return acik;
}

/* Hoparlör düğmesinin yanındaki ipucu (iPhone'da Web Audio sessiz anahtara uyar) */
export const SESSIZ_ANAHTAR_IPUCU = "iPhone'da sessiz anahtarı açıksa ses çıkmaz.";

/* Kullanıcı dokunuşunun içinde çağrılır */
export function sesiBaslat() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!baglam) baglam = new AC();
  if (baglam.state === "suspended") baglam.resume().catch(() => {});
}

/* Tek nota: frekans (Hz), başlangıç ve süre (sn), dalga biçimi, göreli seviye. Yumuşak başlar, üstel söner. */
function nota(frekans, bas, sure, dalga = "sine", seviye = 1) {
  const t = baglam.currentTime + bas;
  const osilator = baglam.createOscillator();
  const kazanc = baglam.createGain();
  osilator.type = dalga;
  osilator.frequency.value = frekans;
  kazanc.gain.setValueAtTime(0.0001, t);
  kazanc.gain.exponentialRampToValueAtTime(SEVIYE * seviye, t + 0.01);
  kazanc.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  osilator.connect(kazanc);
  kazanc.connect(baglam.destination);
  osilator.start(t);
  osilator.stop(t + sure + 0.02);
}

const EFEKT = {
  siparis: () => { nota(880, 0, 0.18); nota(1318.5, 0.12, 0.3); },                                  // sipariş geldi: iki tonlu ding
  tik: () => nota(1600, 0, 0.03, "square", 0.2),                                                     // onay sayacı
  onay: () => { nota(659.3, 0, 0.12, "triangle"); nota(987.8, 0.1, 0.2, "triangle"); },              // yükselen iki nota
  dustu: () => { nota(493.9, 0, 0.16, "triangle"); nota(329.6, 0.14, 0.28, "triangle"); },           // alçalan iki nota
  olay: () => { nota(740, 0, 0.07, "square", 0.35); nota(740, 0.11, 0.07, "square", 0.35); },        // kısa uyarı
  zil: () => [1, 2, 2.76, 5.4].forEach((k, i) => nota(523.3 * k, 0, 1.3 - i * 0.25, "sine", 0.6 / (i + 1))), // gün sonu zili
};

/* Bağlam askıdaysa (iPhone'da ilk dokunuştan hemen sonra resume henüz bitmemişken) efekt atlanmaz: kuyruğa girer ve
   bağlam açılınca çalar. Bayat efekt çalmasın diye kuyrukta en fazla son KUYRUK_EN_FAZLA efekt, KUYRUK_SURE_MS içinde. */
const KUYRUK_EN_FAZLA = 2;
const KUYRUK_SURE_MS = 2000;
let kuyruk = [];

export function efekt(ad) {
  if (!acik || !baglam || baglam.state === "closed") return;
  if (baglam.state === "running") { EFEKT[ad](); return; }
  kuyruk = kuyruk.concat({ ad, an: Date.now() }).slice(-KUYRUK_EN_FAZLA);
  baglam.resume().then(() => {
    const bekleyenler = kuyruk;
    kuyruk = [];
    for (const e of bekleyenler) if (acik && Date.now() - e.an <= KUYRUK_SURE_MS) EFEKT[e.ad]();
  }).catch(() => {});
}

/* Oyun durumundan efekt: her çizimde en fazla bir efekt (düşen sipariş > olay > onay > sipariş geldi), yoksa sayaç tiki.
   Sayaç tiki onaya hazır sipariş varken çalar; son SAYAC_ACIL_DK oyun dakikasında sıklaşır. */
export function sesIzleyici(durum) {
  const no = (g) => Number(g.id.slice(1)) || 0;
  const say = (d) => ({
    gun: d.gun,
    dusen: d.satinalma.filter((s) => s.durum === "dustu").length,
    onay: d.satinalma.filter((s) => s.onayDk != null).length,
    olay: d.olayKaydi.length,
    siparis: d.gunluk.reduce((m, g) => (g.oda === "satis" && g.seviye === "dikkat" ? Math.max(m, no(g)) : m), 0),
  });
  let once = say(durum);
  let sonrakiTik = null;
  return (d) => {
    const simdi = say(d);
    const ad = simdi.gun !== once.gun ? null
      : simdi.dusen > once.dusen ? "dustu" : simdi.olay > once.olay ? "olay" : simdi.onay > once.onay ? "onay" : simdi.siparis > once.siparis ? "siparis" : null;
    once = simdi;
    if (ad) { efekt(ad); return; }
    const kalan = d.satinalma.reduce((m, s) => (s.durum === "onay-bekliyor" ? Math.min(m, s.kalanDk) : m), Infinity);
    if (kalan === Infinity) { sonrakiTik = null; return; }
    const an = (d.gun - 1) * 1440 + d.dk;
    if (sonrakiTik !== null && an < sonrakiTik) return;
    if (sonrakiTik !== null) efekt("tik");
    sonrakiTik = an + (kalan <= AYARLAR.SAYAC_ACIL_DK ? TIK_ACIL_DK : TIK_DK);
  };
}

/* ---------------- Metni sese hazırlama ----------------
   Ses motoru rakamı kendi okursa "135.200 TL"yi noktadan böler ("135." ve "200 TL"). Okumadan önce sayılar yazıya çevrilir:
   "135.200 TL" → "yüz otuz beş bin iki yüz lira", "%80" → "yüzde seksen", "10:00" → "saat on", "08:06" → "saat sekiz sıfır altı",
   "1. gün" → "birinci gün", "(4/5)" → "(beşte dört)", "(-15)" → "(eksi on beş)", "1,5" → "bir buçuk".
   Kesme işaretli ek okunuşa yapışır: "08:00'de" → "saat sekizde", "TL'ye" → "liraya". Orta nokta virgül olur:
   "Ahşap hattı · MDF levha" → "Ahşap hattı, MDF levha". */
const BIRLER = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const ONLAR = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
const BUYUKLER = ["", "bin", "milyon", "milyar", "trilyon"];
const UNLU = "aeıioöuü";
const sonUnlu = (s) => [...s].reverse().find((c) => UNLU.includes(c)) || "e";

/* 135200 → "yüz otuz beş bin iki yüz" */
export function sayiYazi(n) {
  if (!Number.isSafeInteger(n) || n < 0 || n >= 1e15) return String(n);
  if (n === 0) return "sıfır";
  const parcalar = [];
  for (let i = 0; n > 0; i++, n = Math.floor(n / 1000)) {
    const u = n % 1000;
    if (!u) continue;
    const y = Math.floor(u / 100);
    const uclu = i === 1 && u === 1 ? "" : [y > 1 ? BIRLER[y] : "", y ? "yüz" : "", ONLAR[Math.floor(u / 10) % 10], BIRLER[u % 10]].filter(Boolean).join(" ");
    parcalar.unshift([uclu, BUYUKLER[i]].filter(Boolean).join(" "));
  }
  return parcalar.join(" ");
}

/* 4 → "dördüncü" */
const SIRA_UNLUSU = { a: "ı", ı: "ı", o: "u", u: "u", e: "i", i: "i", ö: "ü", ü: "ü" };
function siraYazi(n) {
  const s = sayiYazi(n).replace(/dört$/, "dörd");
  const u = SIRA_UNLUSU[sonUnlu(s)];
  return UNLU.includes(s[s.length - 1]) ? `${s}nc${u}` : `${s}${u}nc${u}`;
}

/* "beş" → "beşte" (kesir: "4/5" → "beşte dört") */
const bulunma = (s) => `${s}${"fstkçşhp".includes(s[s.length - 1]) ? "t" : "d"}${"aıou".includes(sonUnlu(s)) ? "a" : "e"}`;

/* "135.200" ve "5" (virgülden sonrası) → "yüz otuz beş bin iki yüz buçuk" */
function ondalikYazi(tam, kesir) {
  const t = Number(tam.replace(/\./g, ""));
  if (!kesir) return sayiYazi(t);
  if (kesir === "5") return t ? `${sayiYazi(t)} buçuk` : "yarım";
  return `${sayiYazi(t)} virgül ${"sıfır ".repeat(kesir.match(/^0*/)[0].length)}${sayiYazi(Number(kesir))}`;
}

const saatYazi = (sa, dk) => `${sayiYazi(Number(sa))}${Number(dk) ? ` ${Number(dk) < 10 ? "sıfır " : ""}${sayiYazi(Number(dk))}` : ""}`;
/* "TL" (te le) için yazılmış ek "lira"da kalın ünlü alır: "TL'ye" → "liraya" */
const kalinEk = (e) => e.replace(/[eiöü]/g, (c) => ({ e: "a", i: "ı", ö: "o", ü: "u" })[c]);
const SAYI = String.raw`(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?`;

export function seseHazirla(metin) {
  return String(metin)
    .replace(/\s·\s/g, ", ")
    .replace(/(\d)\s?TL(?:['’](\p{L}+))?(?!\p{L})/gu, (_, r, e = "") => `${r} lira${kalinEk(e)}`)
    .replace(/(saat\s+)?\b([01]?\d|2[0-3]):([0-5]\d)(?!\d)(?:['’](\p{L}+))?/giu, (_, onu, sa, dk, e = "") => `${onu || "saat "}${saatYazi(sa, dk)}${e}`)
    .replace(new RegExp(`%\\s?${SAYI}(?:['’](\\p{L}+))?`, "gu"), (_, t, k, e = "") => `yüzde ${ondalikYazi(t, k)}${e}`)
    .replace(/\b(\d+)\.(?=\s+[a-zçğıöşü])/g, (_, n) => siraYazi(Number(n)))
    .replace(/(^|[\s(])([+\-−])(?=\d)/g, (_, o, i) => `${o}${i === "+" ? "artı" : "eksi"} `)
    .replace(/\b(\d+)\/(\d+)\b/g, (_, a, b) => `${bulunma(sayiYazi(Number(b)))} ${sayiYazi(Number(a))}`)
    .replace(new RegExp(`\\b${SAYI}(?:['’](\\p{L}+))?`, "gu"), (_, t, k, e = "") => `${ondalikYazi(t, k)}${e}`)
    /* Büyük harfli söz ("GEÇ KALINDI") bazı seslerde harf harf okunur; ünlüsüz kısaltma ("MDF") harf harf kalır */
    .replace(/(^|[^\p{L}])(\p{Lu}{3,})(?!\p{L})/gu, (s, o, w) => (/[AEIİOÖUÜ]/.test(w) ? o + w.toLocaleLowerCase("tr") : s));
}

/* ---------------- Ajan GM'nin sesi ----------------
   Okunacak metin sabit ve değişken parçalara bölünür (ajan-gm/cumleler.js: parcala). Sabit parça sitedeki ses dosyasından
   çalar (assets/ses/ajan-gm/<id>.mp3; tek HTMLAudioElement, aynı köken), değişken parça (hitap, sayı, ürün adı) cihaz
   sesiyle okunur: SpeechSynthesis, tr-TR, hız 0,95, perde 0,85. Ses dosyaları henüz üretilmediyse (ajan-gm/ses-dosyalari.js)
   ya da bir dosya açılamazsa o parça da cihaz sesiyle okunur.
   Yalnızca cihazdaki (yerel) erkek Türkçe ses kullanılır (AYARLAR.ERKEK_SESLER; iPhone'daki Yelda gibi kadın sesleri
   kullanılmaz): okunan metin hitabı içerir, bulut sesine gönderilmez. Böyle bir ses yoksa değişken parça atlanır (yazı
   ekranda); ne ses dosyası ne yerel erkek ses varsa düğme görünmez. Ses kapalıyken düğme
   pasiftir, yanında "Sesi aç" çıkar. Ekran ya da panel değişince okuma kesilir (okumayiDurdur).
   iPhone'da ses dosyası da konuşma da ancak dokunuşla başlar: ilk parça dokunuşun içinde çalar, öteki türün kilidi aynı
   dokunuşta açılır (kilitleriAc). */
const sentez = typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis : null;
let turkce = null;           // yerel erkek Türkçe ses (yoksa null)
let calar = null;            // ortak HTMLAudioElement, ilk dokunuşta kurulur
let okuyan = null;           // okuyan düğmenin kaydı
let oturum = 0;              // her okuma ve durdurma yeni oturumdur; eski oturumun geri çağrıları yok sayılır
let bekleyen = null;         // çalan parçayı bitiren işlev (durdurulunca çağrılır)
const dugmeler = new Map();  // ses düğmesi → çizim; ses açılıp kapanınca ve cihaz sesleri yüklenince yeniden çizilir

function dugmeleriGuncelle() {
  for (const [el, ciz] of dugmeler) {
    if (!el.isConnected) dugmeler.delete(el);
    else ciz();
  }
}

function sesleriBul() {
  const kucuk = (m) => String(m || "").toLocaleLowerCase("tr");
  const erkek = (v) => AYARLAR.ERKEK_SESLER.some((ad) => kucuk(v.name).includes(kucuk(ad)));
  const yerel = (sentez ? sentez.getVoices() : []).filter((v) => v.localService && erkek(v));
  turkce = yerel.find((v) => v.lang === "tr-TR") || yerel.find((v) => /^tr([-_]|$)/i.test(v.lang)) || null;
  dugmeleriGuncelle();
}
if (sentez) {
  sesleriBul();
  if (sentez.addEventListener) sentez.addEventListener("voiceschanged", sesleriBul);
}

export function okumayiDurdur() {
  oturum += 1;
  if (bekleyen) bekleyen(false);
  if (calar && !calar.paused) calar.pause();
  if (sentez && (sentez.speaking || sentez.pending)) sentez.cancel();
  const k = okuyan;
  okuyan = null;
  if (k) k.ciz();
}

/* Metinler sese hazırlanıp cümle cümle okunur (uzun konuşmada bazı tarayıcılar sesi keser).
   Cümle yalnızca noktalamadan sonra boşluk gelince biter. */
export const cumlelereBol = (metinler) => metinler.filter(Boolean)
  .flatMap((m) => seseHazirla(m).replace(/([.!?…]+)\s+/g, "$1\n").split("\n")).map((c) => c.trim()).filter(Boolean);

/* Okuma planı: { dosya, metin } ses dosyasından, { cumleler } cihaz sesiyle (ardışık konuşma parçaları birleşir) */
function planKur(metinler, dosyasiz = false) {
  const plan = [];
  const konusma = (metin) => {
    const cumleler = turkce ? cumlelereBol([metin]) : [];
    const son = plan[plan.length - 1];
    if (!cumleler.length) return;
    if (son && son.cumleler) son.cumleler.push(...cumleler);
    else plan.push({ cumleler });
  };
  for (const m of metinler.filter(Boolean)) {
    if (!SES_DOSYALARI_HAZIR || dosyasiz) { konusma(m); continue; }
    for (const p of parcala(m)) {
      if (p.id) plan.push({ dosya: `${SES_KLASORU}${p.id}.mp3`, metin: p.metin });
      else konusma(p.metin);
    }
  }
  return plan;
}

/* Ses dosyası çalar; bitince true, açılamazsa ya da durdurulunca false */
function dosyaCal(adim) {
  return new Promise((coz) => {
    const bitir = (oldu) => {
      if (bekleyen !== bitir) return;
      bekleyen = null;
      calar.onended = calar.onerror = null;
      coz(oldu);
    };
    bekleyen = bitir;
    calar.onended = () => bitir(true);
    calar.onerror = () => bitir(false);
    calar.muted = false;
    calar.src = adim.dosya;
    const p = calar.play();
    if (p) p.catch(() => bitir(false));
  });
}

/* Cümleleri cihaz sesiyle okur; bitince, hata verince ya da durdurulunca biter */
function konus(cumleler) {
  return new Promise((coz) => {
    let sozler = [];
    try {
      sozler = cumleler.map((c) => Object.assign(new SpeechSynthesisUtterance(c), GM_SESI, { voice: turkce }));
    } catch { /* SpeechSynthesisUtterance yok */ }
    if (!sozler.length) { coz(); return; }
    const bitir = () => {
      if (bekleyen !== bitir) return;
      bekleyen = null;
      coz();
    };
    bekleyen = bitir;
    sozler[sozler.length - 1].onend = bitir;
    for (const s of sozler) {
      s.onerror = () => { if (bekleyen === bitir) { sentez.cancel(); bitir(); } };
      sentez.speak(s);
    }
  });
}

/* iPhone: ses öğesi ancak dokunuşla bir kez çalınca, konuşma da dokunuşla bir kez başlayınca sonradan kendiliğinden
   çalabilir. İlk parça dokunuşun içinde başlar; burada öteki türün kilidi açılır: ses öğesi sessiz başlayıp durur,
   konuşma boş sözle başlayıp kesilir (plan yalnız dosyaysa da: dosya açılamazsa cihaz sesine düşebilsin). */
function kilitleriAc(plan) {
  const ilkDosya = plan.find((a) => a.dosya);
  if (ilkDosya && !calar) calar = new Audio();
  if (ilkDosya && !plan[0].dosya) {
    calar.muted = true;
    calar.src = ilkDosya.dosya;
    const p = calar.play();
    if (p) p.then(() => { if (calar.muted) calar.pause(); }, () => {});
  }
  if (turkce && plan[0].dosya) {
    try { sentez.speak(new SpeechSynthesisUtterance("")); } catch { /* SpeechSynthesisUtterance yok */ }
    sentez.cancel();
  }
}

async function cal(plan, kayit, no) {
  for (const adim of plan) {
    const caldi = adim.dosya ? await dosyaCal(adim) : false;
    if (no !== oturum) return;
    if (!caldi && turkce) await konus(adim.cumleler || cumlelereBol([adim.metin]));
    if (no !== oturum) return;
  }
  okuyan = null;
  kayit.ciz();
}

function oku(metinler, kayit, dosyasiz = false) {
  okumayiDurdur();
  const plan = acik ? planKur(metinler, dosyasiz) : [];
  if (!plan.length) return;
  kilitleriAc(plan);
  okuyan = kayit;
  kayit.ciz();
  cal(plan, kayit, oturum);
}

/* "Sesli oku" düğmesi: metin() okunacak metinleri (dizi) verir. Okurken düğme "Durdur" olur.
   Ses kapalıyken düğme pasif, yanındaki "Sesi aç" sesi açar.
   yalnizCihaz: metin Fabricakit'in sabit cümlelerinden değilse (rehberli dersler) ses dosyası aranmaz; düğme yalnızca
   cihazda erkek Türkçe ses varken görünür (yoksa gizli; yazı zaten ekranda). */
export function sesliOkuDugmesi(metin, { etiket = "Sesli oku", yalnizCihaz = false } = {}) {
  const dugme = h("button", { sinif: "dugme-cizgi fk-kucuk-dugme fk-sesli-oku", type: "button" });
  const ac = h("button", { sinif: "dugme-cizgi fk-kucuk-dugme fk-ses-ac", type: "button" }, ikon("sessiz"), "Sesi aç");
  const kutu = h("span", { sinif: "fk-sesli" }, dugme, ac);
  const kayit = {
    ciz() {
      const okuyor = okuyan === kayit;
      temizle(dugme).append(ikon(okuyor ? "durdur" : "ses"), okuyor ? "Durdur" : etiket);
      dugme.setAttribute("aria-pressed", String(okuyor));
      dugme.disabled = !acik;
      ac.hidden = acik;
      kutu.hidden = yalnizCihaz ? !turkce : !SES_DOSYALARI_HAZIR && !turkce;
    },
  };
  dugme.addEventListener("click", () => { if (okuyan === kayit) okumayiDurdur(); else oku(metin(), kayit, yalnizCihaz); });
  ac.addEventListener("click", () => { if (!acik) sesiDegistir(); dugme.focus(); });
  kayit.ciz();
  dugmeler.set(kutu, kayit.ciz);
  return kutu;
}

/* Üst şeritteki hoparlör düğmesi. İpucu masaüstünde düğmenin üzerinde (title); telefonda ses açılınca acilinca()
   (oyun ekranı bildirim balonunda gösterir). */
export function sesDugmesi({ acilinca } = {}) {
  const dugme = h("button", { sinif: "fk-ust-dugme fk-ses", type: "button", title: SESSIZ_ANAHTAR_IPUCU });
  const ciz = () => {
    temizle(dugme).append(ikon(acik ? "ses" : "sessiz"), h("span", { sinif: "fk-dugme-metin", metin: acik ? "Sesi kapat" : "Sesi aç" }),
      h("span", { sinif: "fk-dugme-kisa", "aria-hidden": "true", metin: "Ses" }));
    dugme.setAttribute("aria-label", acik ? "Sesi kapat" : "Sesi aç");
  };
  dugme.addEventListener("click", () => { if (sesiDegistir() && acilinca) acilinca(); });
  ciz();
  dugmeler.set(dugme, ciz);
  return dugme;
}
