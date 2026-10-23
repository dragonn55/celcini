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

/* Metinler cümle cümle okunur (uzun konuşmada bazı tarayıcılar sesi keser) */
function oku(metinler, dugme) {
  okumayiDurdur();
  const cumleler = metinler.filter(Boolean).flatMap((m) => m.match(/[^.!?]+[.!?]*/g) || []).map((c) => c.trim()).filter(Boolean);
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
    temizle(dugme).append(ikon(acik ? "ses" : "sessiz"), h("span", { sinif: "fk-dugme-metin", metin: acik ? "Sesi kapat" : "Sesi aç" }));
    dugme.setAttribute("aria-label", acik ? "Sesi kapat" : "Sesi aç");
  };
  dugme.addEventListener("click", () => { sesiDegistir(); ciz(); });
  ciz();
  return dugme;
}
