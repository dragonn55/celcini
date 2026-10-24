/* Rehber · Excel sayfasını tarayıcıda çizer.
   Sütun harfleri ve satır numaraları, hücre biçimleri (dolgu, yazı rengi, kalın/italik, boyut, hizalama, sarma, kenarlık),
   birleşik hücreler, Excel'deki gibi metin taşması (tasma), dondurulmuş bölmeler (sticky), grafikler ve not pinleri.
   Her şey tek bir CSS ızgarasına yerleşir; ölçek değişince ızgara yeniden çizilir.
   Satır içi style özniteliği yazılmaz (CSP): değerler el.style (CSSOM) ile verilir. */
import { grafikCiz } from "./grafik.js";

const BASLIK_Y = 22;      // sütun harfleri satırının yüksekliği (px, ölçek 1)
const NUMARA_G = 40;      // satır numarası sütununun genişliği
const PT_PX = 1.2;        // 1 pt yazı → 1,2 px (Calibri dar bir yazı; sistem yazısında bu oran Excel'deki sığmayı korur)
const VARSAYILAN_PT = 10; // dışa aktarım 10 pt'yi yazmaz
const HIZA = { left: "flex-start", center: "center", right: "flex-end" };

export function harfNo(harf) {
  let n = 0;
  for (const ch of harf) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/* "B7:M9" → { c1: 2, r1: 7, c2: 13, r2: 9 }; tek hücre de olur ("A10") */
export function aralikCoz(aralik) {
  const [bas, son = bas] = String(aralik).split(":");
  const a = bas.match(/^([A-Z]+)(\d+)$/), b = son.match(/^([A-Z]+)(\d+)$/);
  if (!a || !b) return null;
  const c1 = harfNo(a[1]), c2 = harfNo(b[1]), r1 = Number(a[2]), r2 = Number(b[2]);
  return { c1: Math.min(c1, c2), c2: Math.max(c1, c2), r1: Math.min(r1, r2), r2: Math.max(r1, r2) };
}

const icinde = (a, r, c) => a && r >= a.r1 && r <= a.r2 && c >= a.c1 && c <= a.c2;
const alan = (a) => (a.r2 - a.r1 + 1) * (a.c2 - a.c1 + 1);
const px = (n) => `${Math.round(n * 100) / 100}px`;

function div(sinif, metin) {
  const d = document.createElement("div");
  d.className = sinif;
  if (metin) d.textContent = metin;
  return d;
}

/* sayfa: dışa aktarılmış sayfa JSON'u. notlar: [{ aralik, baslik }]. Geri dönen nesne ızgarayı yönetir. */
export function tabloKur(kutu, sayfa, { notlar = [], olcek = 1, hucreSec = () => {}, notSec = () => {} } = {}) {
  /* Hücreler satır sırasıyla eklenir: ekran okuyucu sayfayı satır satır okur (ARIA grid rolü verilmez; satır öğesi yok) */
  const izgara = div("rt-izgara");
  kutu.append(izgara);

  const sutunlar = sayfa.sutunlar;
  const satirlar = sayfa.satirlar;
  const C = sutunlar.length;
  const satirSira = new Map(satirlar.map((s, i) => [s.r, i]));       // satır no → ızgara sırası
  const hucre = new Map();                                            // "r,c" → hücre
  for (const s of satirlar) for (const h of s.hucreler) hucre.set(`${s.r},${harfNo(h.c)}`, h);

  const birlesik = new Map(); const ortulu = new Set();
  const sonSatir = satirlar[satirlar.length - 1].r;
  for (const m of sayfa.birlesik || []) {
    const a = aralikCoz(m);
    if (!a || a.c1 > C || a.r1 > sonSatir) continue;
    a.c2 = Math.min(a.c2, C); a.r2 = Math.min(a.r2, sonSatir);   /* sayfanın dışına taşan birleşik alan kırpılır */
    birlesik.set(`${a.r1},${a.c1}`, a);
    for (let r = a.r1; r <= a.r2; r++) for (let c = a.c1; c <= a.c2; c++) if (r !== a.r1 || c !== a.c1) ortulu.add(`${r},${c}`);
  }
  /* Taşan metin sağdaki boş hücreleri örter (dışa aktarım yalnızca boş komşuları sayar) */
  const tasma = new Map();
  for (const [anahtar, h] of hucre) {
    if (!h.tasma) continue;
    const [r, c] = anahtar.split(",").map(Number);
    const k = Math.min(h.tasma, C - c);
    tasma.set(anahtar, k);
    for (let i = 1; i <= k; i++) ortulu.add(`${r},${c + i}`);
  }
  const stil = (h) => (h && h.s !== undefined ? sayfa.stiller[h.s] || {} : {});
  const kenarli = (r, c) => {
    const kok = [...birlesik.values()].find((a) => icinde(a, r, c));
    const h = kok ? hucre.get(`${kok.r1},${kok.c1}`) : hucre.get(`${r},${c}`);
    return !!stil(h).kenar;
  };

  const donuk = (() => {
    const m = String(sayfa.dondur || "").match(/^([A-Z]+)(\d+)$/);
    return m ? { c: harfNo(m[1]), r: Number(m[2]) } : { c: 1, r: 1 };
  })();

  const notAlanlari = notlar.map((n) => aralikCoz(n.aralik));
  let k = olcek;
  let solKenar = [], ustKenar = [], secili = null, etkinNot = null, uzerindeNot = null;
  const katmanlar = { alan: [], pin: [] };

  function yerlestir(el, r1, c1, rs = 1, cs = 1) {
    el.style.gridRow = `${satirSira.get(r1) + 2} / span ${rs}`;
    el.style.gridColumn = `${c1 + 1} / span ${cs}`;
  }

  /* Dondurulmuş bölge: satır < donuk.r ve/veya sütun < donuk.c → sticky */
  function dondur(el, r1, c1, r2, c2, zKat) {
    const ust = r2 < donuk.r, sol = c2 < donuk.c;
    if (!ust && !sol) return false;
    el.classList.add("rt-donuk");
    if (ust) el.style.top = px(ustKenar[r1]);
    if (sol) el.style.left = px(solKenar[c1]);
    el.style.zIndex = String(zKat + (ust && sol ? 1 : 0));
    return true;
  }

  function hucreCiz(r, c) {
    const anahtar = `${r},${c}`;
    const h = hucre.get(anahtar);
    const b = birlesik.get(anahtar);
    const rs = b ? b.r2 - b.r1 + 1 : 1;
    const cs = b ? b.c2 - b.c1 + 1 : 1 + (tasma.get(anahtar) || 0);
    const st = stil(h);
    const d = div("rt-h");
    d.dataset.r = r; d.dataset.c = c;
    yerlestir(d, r, c, rs, cs);
    if (h && h.v !== undefined) {
      const ic = div("rt-ic", h.v);
      d.append(ic);
      if (h.f) d.classList.add("rt-formul");
    }
    if (st.dolgu) { d.style.backgroundColor = st.dolgu; d.classList.add("rt-dolu"); }
    if (st.yazi) d.style.color = st.yazi;
    if (st.kalin) d.style.fontWeight = "700";
    if (st.italik) d.style.fontStyle = "italic";
    if (st.boyut && st.boyut !== VARSAYILAN_PT) d.style.fontSize = px((st.boyut) * PT_PX * k);
    if (st.hiza) { d.style.justifyContent = HIZA[st.hiza] || "flex-start"; d.style.textAlign = st.hiza; }
    if (st.dikey) d.style.alignItems = st.dikey === "top" ? "flex-start" : "center";
    if (st.sar) d.classList.add("rt-sar");
    if (tasma.get(anahtar)) d.classList.add("rt-tasan");
    if (st.kenar) {
      d.classList.add("rt-kenar");
      const golge = [];
      if (!kenarli(r, c - 1)) golge.push("inset 1px 0 0 var(--rt-kenar)");
      if (!kenarli(r - 1, c)) golge.push("inset 0 1px 0 var(--rt-kenar)");
      if (golge.length) d.style.boxShadow = golge.join(", ");
    }
    const r2 = r + rs - 1, c2 = c + cs - 1;
    if (dondur(d, r, c, r2, c2, 3)) {
      if (!st.dolgu) d.classList.add("rt-donuk-zemin");
      if (r2 === donuk.r - 1) d.classList.add("rt-donuk-alt");
      if (c2 === donuk.c - 1) d.classList.add("rt-donuk-sag");
    }
    /* Dondurulmuş sütundan taşan metin (ör. başlık): Excel'deki gibi sol bölmede kırpılmış bir kopyası yerinde kalır,
       taşan kısmı sağ bölmeyle birlikte kayar. Kopya aynı yerde durduğu için kaydırılmamışken tek metin görünür. */
    if (c < donuk.c && c2 >= donuk.c && r2 >= r) {
      const kopya = d.cloneNode(true);
      /* Ortalı ya da sağa dayalı birleşik hücrede kopyanın yazısı farklı yerde dururdu: kopya yalnızca zemini örter */
      if (st.hiza === "center" || st.hiza === "right") kopya.textContent = "";
      kopya.classList.remove("rt-donuk-sag");
      kopya.setAttribute("aria-hidden", "true");
      kopya.style.gridColumn = `${c + 1} / span ${donuk.c - c}`;
      dondur(kopya, r, c, r2, donuk.c - 1, 3);
      if (!st.dolgu) kopya.classList.add("rt-donuk-zemin");
      kopya.classList.add("rt-donuk-sag");
      if (r2 === donuk.r - 1) kopya.classList.add("rt-donuk-alt");
      const parca = document.createDocumentFragment();
      parca.append(d, kopya);
      return parca;
    }
    return d;
  }

  function ciz() {
    while (izgara.firstChild) izgara.removeChild(izgara.firstChild);
    katmanlar.alan = []; katmanlar.pin = [];
    const gen = sutunlar.map((s) => s.genislik * k);
    const yuk = satirlar.map((s) => s.yukseklik * k);
    solKenar = [0, NUMARA_G * k];
    for (let i = 0; i < C; i++) solKenar.push(solKenar[i + 1] + gen[i]);
    ustKenar = [];
    let y = BASLIK_Y * k;
    for (const s of satirlar) { ustKenar[s.r] = y; y += s.yukseklik * k; }
    izgara.style.gridTemplateColumns = [NUMARA_G * k, ...gen].map(px).join(" ");
    izgara.style.gridTemplateRows = [BASLIK_Y * k, ...yuk].map(px).join(" ");
    izgara.style.width = px(solKenar[C + 1]);
    izgara.style.height = px(y);
    izgara.style.fontSize = px(VARSAYILAN_PT * PT_PX * k);
    izgara.style.setProperty("--rt-k", String(k));

    const parca = document.createDocumentFragment();
    const kose = div("rt-kose");
    kose.style.gridRow = "1"; kose.style.gridColumn = "1";
    parca.append(kose);
    /* Dondurulmuş sütunların harfleri ve dondurulmuş satırların numaraları da yerinde kalır (Excel'deki gibi) */
    sutunlar.forEach((s, i) => {
      const d = div("rt-sb", s.harf);
      d.style.gridRow = "1"; d.style.gridColumn = String(i + 2);
      d.dataset.c = i + 1;
      if (i + 1 < donuk.c) { d.style.left = px(solKenar[i + 1]); d.style.zIndex = "9"; }
      d.setAttribute("aria-hidden", "true");
      parca.append(d);
    });
    for (const s of satirlar) {
      const d = div("rt-sn", String(s.r));
      d.style.gridRow = String(satirSira.get(s.r) + 2); d.style.gridColumn = "1";
      d.dataset.r = s.r;
      if (s.r < donuk.r) { d.style.top = px(ustKenar[s.r]); d.style.zIndex = "8"; }
      d.setAttribute("aria-hidden", "true");
      parca.append(d);
      for (let c = 1; c <= C; c++) if (!ortulu.has(`${s.r},${c}`)) parca.append(hucreCiz(s.r, c));
    }

    for (const g of sayfa.grafikler || []) {
      if (g.disarida) continue;
      const a = aralikCoz(`${g.konum.bas}:${g.konum.son}`);
      if (!a || !satirSira.has(a.r1)) continue;
      const r2 = Math.min(a.r2, satirlar[satirlar.length - 1].r), c2 = Math.min(a.c2, C);
      const kap = div("rt-grafik");
      yerlestir(kap, a.r1, a.c1, satirSira.get(r2) - satirSira.get(a.r1) + 1, c2 - a.c1 + 1);
      kap.dataset.r = a.r1; kap.dataset.c = a.c1;
      const w = solKenar[c2 + 1] - solKenar[a.c1];
      const hgt = (ustKenar[r2] + satirlar[satirSira.get(r2)].yukseklik * k) - ustKenar[a.r1];
      kap.append(grafikCiz(g, Math.max(w - 2, 40), Math.max(hgt - 2, 40), k));
      parca.append(kap);
    }

    notAlanlari.forEach((a, i) => {
      if (!a) return;
      const r1 = Math.max(a.r1, satirlar[0].r), r2 = Math.min(a.r2, satirlar[satirlar.length - 1].r);
      const c2 = Math.min(a.c2, C);
      const al = div("rt-alan");
      al.setAttribute("aria-hidden", "true");
      yerlestir(al, r1, a.c1, satirSira.get(r2) - satirSira.get(r1) + 1, c2 - a.c1 + 1);
      dondur(al, r1, a.c1, r2, c2, 5);
      katmanlar.alan[i] = al;
      parca.append(al);
      /* Excel'deki not üçgeni: alanın sağ üst hücresinin köşesinde (dokunma alanı CSS'te büyütülür) */
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "rt-pin";
      pin.setAttribute("aria-label", `Not ${i + 1}: ${notlar[i].baslik}`);
      pin.title = `Not ${i + 1}: ${notlar[i].baslik}`;
      pin.dataset.not = i;
      yerlestir(pin, r1, c2);
      dondur(pin, r1, c2, r1, c2, 6);
      katmanlar.pin[i] = pin;
      parca.append(pin);
    });
    izgara.append(parca);
    if (secili) secimiGoster(secili.r, secili.c, false);
    if (etkinNot !== null) katmanlar.alan[etkinNot]?.classList.add("rt-etkin");
  }

  /* Bir hücreyi içeren en küçük not alanı */
  function notBul(r, c) {
    let enIyi = null;
    notAlanlari.forEach((a, i) => { if (icinde(a, r, c) && (enIyi === null || alan(a) < alan(notAlanlari[enIyi]))) enIyi = i; });
    return enIyi;
  }

  function secimiGoster(r, c, bildir = true) {
    for (const el of izgara.querySelectorAll(".rt-secili, .rt-sb.rt-sec, .rt-sn.rt-sec")) el.classList.remove("rt-secili", "rt-sec");
    const el = izgara.querySelector(`.rt-h[data-r="${r}"][data-c="${c}"]`);
    if (!el) return;
    el.classList.add("rt-secili");
    izgara.querySelector(`.rt-sb[data-c="${c}"]`)?.classList.add("rt-sec");
    izgara.querySelector(`.rt-sn[data-r="${r}"]`)?.classList.add("rt-sec");
    secili = { r, c };
    if (bildir) {
      const h = hucre.get(`${r},${c}`);
      hucreSec({ adres: `${sutunlar[c - 1].harf}${r}`, deger: h && h.v !== undefined ? h.v : "", formul: !!(h && h.f) });
    }
  }

  izgara.addEventListener("click", (e) => {
    const pin = e.target.closest(".rt-pin");
    if (pin) { notSec(Number(pin.dataset.not)); return; }
    const el = e.target.closest(".rt-h, .rt-grafik");
    if (!el) return;
    const r = Number(el.dataset.r), c = Number(el.dataset.c);
    if (el.classList.contains("rt-h")) secimiGoster(r, c);
    const i = notBul(r, c);
    if (i !== null) notSec(i);
  });
  izgara.addEventListener("pointerover", (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const el = e.target.closest(".rt-h, .rt-grafik, .rt-pin");
    const i = !el ? null : el.classList.contains("rt-pin") ? Number(el.dataset.not) : notBul(Number(el.dataset.r), Number(el.dataset.c));
    if (i === uzerindeNot) return;
    if (uzerindeNot !== null) katmanlar.alan[uzerindeNot]?.classList.remove("rt-uzerinde");
    uzerindeNot = i;
    if (i !== null) katmanlar.alan[i]?.classList.add("rt-uzerinde");
  });
  izgara.addEventListener("pointerleave", () => {
    if (uzerindeNot !== null) katmanlar.alan[uzerindeNot]?.classList.remove("rt-uzerinde");
    uzerindeNot = null;
  });

  ciz();

  return {
    get olcek() { return k; },
    genislik: () => sutunlar.reduce((t, s) => t + s.genislik, NUMARA_G),
    olcekAyarla(yeni) {
      const merkezX = (kutu.scrollLeft + kutu.clientWidth / 2) / k, merkezY = (kutu.scrollTop + kutu.clientHeight / 2) / k;
      k = Math.max(0.4, Math.min(1.6, yeni));
      ciz();
      kutu.scrollLeft = merkezX * k - kutu.clientWidth / 2;
      kutu.scrollTop = merkezY * k - kutu.clientHeight / 2;
    },
    /* Not alanını vurgula ve görünür yap; i = null → vurguyu kaldır */
    notGoster(i, { kaydir = true } = {}) {
      if (etkinNot !== null) katmanlar.alan[etkinNot]?.classList.remove("rt-etkin");
      for (const p of katmanlar.pin) p?.classList.remove("rt-pin-etkin");
      etkinNot = i;
      if (i === null || !notAlanlari[i]) return null;
      const al = katmanlar.alan[i];
      al.classList.add("rt-etkin");
      katmanlar.pin[i].classList.add("rt-pin-etkin");
      if (kaydir) {
        const a = notAlanlari[i];
        const sol = solKenar[a.c1] - NUMARA_G * k - 24, ust = (ustKenar[a.r1] ?? 0) - BASLIK_Y * k - 24;
        const sag = solKenar[Math.min(a.c2, C) + 1];
        const solDonuk = solKenar[donuk.c] - NUMARA_G * k;
        if (sol < kutu.scrollLeft + solDonuk || sag > kutu.scrollLeft + kutu.clientWidth) kutu.scrollLeft = Math.max(0, sol - solDonuk);
        if (kutu.scrollHeight > kutu.clientHeight + 1 && (ust < kutu.scrollTop || ust > kutu.scrollTop + kutu.clientHeight - 80)) {
          kutu.scrollTop = Math.max(0, ust - (a.r1 >= donuk.r ? (ustKenar[donuk.r] ?? BASLIK_Y * k) - BASLIK_Y * k : 0));
        }
      }
      return katmanlar.pin[i];
    },
    pin: (i) => katmanlar.pin[i] || null,
  };
}
