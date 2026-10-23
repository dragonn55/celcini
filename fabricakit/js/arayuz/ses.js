/* Fabricakit sesleri. Dış servis yok, ses dosyası yok.
   Efektler Web Audio API ile kodda üretilir; hepsi kısa ve kısık, hat çalışırken sürekli ses (uğultu) yoktur.
   Her efektin ekranda bir karşılığı var (bildirim, sayaç, karne): ses kapalıyken hiçbir bilgi kaybolmaz.
   Ses tercihi yalnızca bu tarayıcıda (localStorage), varsayılan açık. Tarayıcı kuralı gereği AudioContext ilk dokunuşta
   ("Başla", "Devam et" ya da hoparlör düğmesi) kurulur.
   Ajan GM'in sesi tarayıcının SpeechSynthesis API'si: tr-TR, hız 0,95, perde 0,85 (kalın, soğukkanlı).
   Yalnızca cihazdaki (yerel) Türkçe ses kullanılır: okunan metin hitabı içerir, bulut sesine gönderilmez.
   Yerel Türkçe ses yoksa "Sesli oku" düğmesi görünmez. Ekran ya da panel değişince okuma kesilir (okumayiDurdur). */
import { AYARLAR } from "../ayarlar.js";
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
  return acik;
}

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

export function efekt(ad) {
  if (!acik || !baglam || baglam.state !== "running") return;
  EFEKT[ad]();
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

/* ---------------- Ajan GM'in sesi ---------------- */
const sentez = typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis : null;
let turkce = null;
const dugmeler = new Set();
let okuyan = null;

function sesleriBul() {
  const sesler = sentez ? sentez.getVoices() : [];
  const yerel = sesler.filter((v) => v.localService);
  turkce = yerel.find((v) => v.lang === "tr-TR") || yerel.find((v) => /^tr([-_]|$)/i.test(v.lang)) || null;
  for (const d of dugmeler) {
    if (!d.isConnected) dugmeler.delete(d);
    else d.hidden = !turkce;
  }
}
if (sentez) {
  sesleriBul();
  if (sentez.addEventListener) sentez.addEventListener("voiceschanged", sesleriBul);
}

function dugmeCiz(dugme, okuyor) {
  temizle(dugme).append(ikon(okuyor ? "durdur" : "ses"), okuyor ? "Durdur" : "Sesli oku");
  dugme.setAttribute("aria-pressed", String(okuyor));
}

export function okumayiDurdur() {
  if (!sentez) return;
  const d = okuyan;
  okuyan = null;
  if (d) dugmeCiz(d, false);
  if (sentez.speaking || sentez.pending) sentez.cancel();
}

/* Metinler sese hazırlanıp cümle cümle okunur (uzun konuşmada bazı tarayıcılar sesi keser).
   Cümle yalnızca noktalamadan sonra boşluk gelince biter. */
export const cumlelereBol = (metinler) => metinler.filter(Boolean)
  .flatMap((m) => seseHazirla(m).replace(/([.!?…]+)\s+/g, "$1\n").split("\n")).map((c) => c.trim()).filter(Boolean);

function oku(metinler, dugme) {
  okumayiDurdur();
  const cumleler = cumlelereBol(metinler);
  if (!turkce || !cumleler.length) return;
  let sozler;
  try {
    sozler = cumleler.map((c) => Object.assign(new SpeechSynthesisUtterance(c), GM_SESI, { voice: turkce }));
  } catch {
    return;
  }
  okuyan = dugme;
  dugmeCiz(dugme, true);
  sozler[sozler.length - 1].onend = () => { if (okuyan === dugme) { okuyan = null; dugmeCiz(dugme, false); } };
  for (const s of sozler) {
    s.onerror = () => { if (okuyan === dugme) okumayiDurdur(); };
    sentez.speak(s);
  }
}

/* "Sesli oku" düğmesi: metin() okunacak metinleri (dizi) verir. Okurken düğme "Durdur" olur. */
export function sesliOkuDugmesi(metin) {
  const dugme = h("button", { sinif: "dugme-cizgi fk-kucuk-dugme fk-sesli-oku", type: "button", hidden: !turkce });
  dugmeCiz(dugme, false);
  dugme.addEventListener("click", () => { if (okuyan === dugme) okumayiDurdur(); else oku(metin(), dugme); });
  if (sentez) dugmeler.add(dugme);
  return dugme;
}

/* Üst şeritteki hoparlör düğmesi */
export function sesDugmesi() {
  const dugme = h("button", { sinif: "fk-ust-dugme fk-ses", type: "button" });
  const ciz = () => {
    temizle(dugme).append(ikon(acik ? "ses" : "sessiz"), h("span", { sinif: "fk-dugme-metin", metin: acik ? "Sesi kapat" : "Sesi aç" }),
      h("span", { sinif: "fk-dugme-kisa", "aria-hidden": "true", metin: "Ses" }));
    dugme.setAttribute("aria-label", acik ? "Sesi kapat" : "Sesi aç");
  };
  dugme.addEventListener("click", () => { sesiDegistir(); ciz(); });
  ciz();
  return dugme;
}
