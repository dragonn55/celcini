/* Küçük DOM yardımcıları. Metinler her zaman textContent ile yazılır (oyuncunun girdiği hitap dahil);
   satır içi style kullanılmaz (CSP). Genişlik gibi değerler el.style üzerinden verilir. */

const SVG = "http://www.w3.org/2000/svg";

/* h("button", { sinif: "dugme", on: { click }, "aria-label": "…" }, "Metin", altEleman) */
export function h(etiket, ozellik = {}, ...cocuklar) {
  const el = document.createElement(etiket);
  for (const [k, v] of Object.entries(ozellik || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "sinif") el.className = v;
    else if (k === "on") for (const [olay, f] of Object.entries(v)) el.addEventListener(olay, f);
    else if (k === "metin") el.textContent = v;
    else if (k === "deger") el.value = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  ekle(el, cocuklar);
  return el;
}

export function ekle(el, cocuklar) {
  for (const c of cocuklar.flat(Infinity)) {
    if (c === null || c === undefined || c === false || c === "") continue;
    el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  return el;
}

export function temizle(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/* Kapı tabelası simgesi (gezegenler.svg) */
export function gezegen(simge, sinif = "fk-simge") {
  const s = document.createElementNS(SVG, "svg");
  s.setAttribute("class", sinif);
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("focusable", "false");
  const u = document.createElementNS(SVG, "use");
  u.setAttribute("href", `/fabricakit/img/gezegenler.svg#${simge}`);
  s.appendChild(u);
  return s;
}

/* Çizgi ikonlar (Lucide, ISC lisansı), kalınlık CSS'te 1,5 */
const IKON = {
  duraklat: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  oynat: '<path d="M6 4.5v15a1 1 0 0 0 1.5.87l12-7.5a1 1 0 0 0 0-1.74l-12-7.5A1 1 0 0 0 6 4.5z"/>',
  bayrak: '<path d="M4 22V4a1 1 0 0 1 1-1h12l-2 4 2 4H5"/>',
  kapat: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  tik: '<path d="M20 6 9 17l-5-5"/>',
  saat: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ok: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  geri: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  kamyon: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  uyari: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  kilit: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  dongu: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  soru: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  yukari: '<path d="m18 15-6-6-6 6"/>',
};

export function ikon(ad, sinif = "fk-ikon") {
  const s = document.createElementNS(SVG, "svg");
  s.setAttribute("class", sinif);
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("focusable", "false");
  s.innerHTML = IKON[ad];
  return s;
}

/* Oran çubuğu: <span class="fk-cubuk"><span style=width></span></span> (genişlik CSSOM ile; CSP uyumlu) */
export function cubuk(oran, sinif = "") {
  const ic = h("span", { sinif: "fk-cubuk-ic" });
  ic.style.width = `${Math.max(0, Math.min(100, Math.round(oran * 100)))}%`;
  return h("span", { sinif: `fk-cubuk ${sinif}`.trim(), "aria-hidden": "true" }, ic);
}
