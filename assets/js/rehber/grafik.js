/* Rehber · Excel grafiklerini SVG olarak çizer. Dış kütüphane yok; renkler ve seriler sayfa JSON'undan gelir.
   Türler: "cizgi" (çok seri, boş değerde çizgi kesilir), "cubuk" (dikey, kümeli; her kategoride tek seri doluysa
   çubuklar üst üste biner, Excel'deki %100 örtüşme), "yatay-cubuk" (ilk kategori üstte, değer çubuğun ucunda).
   Satır içi style kullanılmaz (CSP): yalnızca SVG öznitelikleri. */

const NS = "http://www.w3.org/2000/svg";
const YAZI = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const IZGARA = "#E3E8EE";
const EKSEN = "#8A97A6";
const ETIKET = "#46586D";
const BASLIK = "#0B1F3A";

const sayi = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const bicim = (v) => (v === null || v === undefined ? "" : sayi.format(Math.round(v)));

function el(ad, oz = {}, ...cocuklar) {
  const e = document.createElementNS(NS, ad);
  for (const [k, v] of Object.entries(oz)) if (v !== null && v !== undefined) e.setAttribute(k, String(v));
  for (const c of cocuklar) if (c !== null && c !== undefined) e.append(c);
  return e;
}

const metin = (x, y, t, oz = {}) => el("text", { x, y, fill: ETIKET, "font-family": YAZI, ...oz }, String(t));
const ipucu = (t) => el("title", {}, t);

/* Yaklaşık yazı genişliği (px): sistem yazısında ortalama harf ≈ 0,56 em */
const genislikTahmin = (t, boy) => String(t).length * boy * 0.56;

/* 0'dan başlayan "yuvarlak" eksen: adım 1, 2, 2,5 ya da 5 × 10^n */
function eksen(enBuyuk, aralikSayisi = 4) {
  if (!(enBuyuk > 0)) return { ust: 1, adim: 1 };
  const ham = enBuyuk / aralikSayisi;
  const us = 10 ** Math.floor(Math.log10(ham));
  const adim = [1, 2, 2.5, 5, 10].map((k) => k * us).find((a) => a >= ham);
  return { ust: Math.ceil(enBuyuk / adim) * adim, adim };
}

function lejant(svg, seriler, x, y, gen, boy) {
  const ogeler = seriler.filter((s) => s.ad);
  if (ogeler.length < 2) return 0;
  const parcalar = ogeler.map((s) => ({ s, w: 22 + genislikTahmin(s.ad, boy) + 18 }));
  const toplam = parcalar.reduce((a, p) => a + p.w, 0);
  let cx = x + Math.max(0, (gen - toplam) / 2);
  for (const { s, w } of parcalar) {
    svg.append(el("rect", { x: cx, y: y - boy * 0.45, width: 14, height: 4, rx: 1, fill: s.renk || "#4F81BD" }));
    svg.append(metin(cx + 20, y, s.ad, { "font-size": boy, "dominant-baseline": "middle" }));
    cx += w;
  }
  return boy * 2;
}

/* Kategori etiketlerinden kaçta birinin yazılacağı (üst üste binmesin) */
function etiketAdimi(kategoriler, aralik, boy) {
  const enUzun = Math.max(...kategoriler.map((k) => genislikTahmin(k, boy)), 1);
  return Math.max(1, Math.ceil((enUzun + 8) / Math.max(aralik, 1)));
}

function dikeyGrafik(svg, g, gen, yuk, k) {
  const boy = 11 * k;
  const seriler = g.seriler;
  const kategoriler = seriler[0].kategoriler.map(String);
  const n = kategoriler.length;
  const tum = seriler.flatMap((s) => s.degerler.filter((v) => typeof v === "number"));
  const { ust, adim } = eksen(Math.max(...tum, 0));
  const solBosluk = Math.max(...[0, ust].map((v) => genislikTahmin(bicim(v), boy))) + 12 * k;
  const ustBosluk = (g.baslik ? 30 : 12) * k;
  const lejantYuk = seriler.filter((s) => s.ad).length > 1 ? boy * 2 : 0;
  const altBosluk = boy * 2.2 + lejantYuk;
  const x0 = solBosluk, x1 = gen - 12 * k, y0 = ustBosluk, y1 = yuk - altBosluk;
  const yx = (v) => y1 - (v / ust) * (y1 - y0);
  for (let v = 0; v <= ust + adim / 2; v += adim) {
    svg.append(el("line", { x1: x0, x2: x1, y1: yx(v), y2: yx(v), stroke: IZGARA, "stroke-width": 1 }));
    svg.append(metin(x0 - 6 * k, yx(v), bicim(v), { "font-size": boy, "text-anchor": "end", "dominant-baseline": "middle" }));
  }
  svg.append(el("line", { x1: x0, x2: x1, y1: y1, y2: y1, stroke: EKSEN, "stroke-width": 1 }));
  const aralik = (x1 - x0) / n;
  const xOrta = (i) => x0 + aralik * (i + 0.5);
  const adimEt = etiketAdimi(kategoriler, aralik, boy);
  kategoriler.forEach((kat, i) => {
    if (i % adimEt === 0) svg.append(metin(xOrta(i), y1 + boy * 1.2, kat, { "font-size": boy, "text-anchor": "middle", "dominant-baseline": "middle" }));
  });
  if (g.tur === "cubuk") {
    /* Kategoride tek dolu seri varsa çubuk ortalanır (Excel'de örtüşme %100); yoksa yan yana */
    const tekli = kategoriler.every((_, i) => seriler.filter((s) => typeof s.degerler[i] === "number").length <= 1);
    const grup = aralik / 2.5;           // boşluk genişliği %150
    const dilim = tekli ? grup : grup / seriler.length;
    seriler.forEach((s, si) => s.degerler.forEach((v, i) => {
      if (typeof v !== "number") return;
      const x = xOrta(i) - grup / 2 + (tekli ? 0 : si * dilim);
      const r = el("rect", { x, y: yx(Math.max(v, 0)), width: Math.max(dilim, 1), height: Math.abs(yx(v) - yx(0)), fill: s.renk || "#4F81BD" });
      r.append(ipucu(`${kategoriler[i]} · ${s.ad || "Değer"}: ${bicim(v)}`));
      svg.append(r);
    }));
  } else {
    for (const s of seriler) {
      let yol = "", acik = false;
      s.degerler.forEach((v, i) => {
        if (typeof v !== "number") { acik = false; return; }
        yol += `${acik ? "L" : "M"}${xOrta(i).toFixed(1)} ${yx(v).toFixed(1)} `;
        acik = true;
      });
      svg.append(el("path", { d: yol.trim(), fill: "none", stroke: s.renk || "#4A7EBB", "stroke-width": 2.25 * k, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      s.degerler.forEach((v, i) => {
        if (typeof v !== "number") return;
        const c = el("circle", { cx: xOrta(i), cy: yx(v), r: Math.max(aralik / 2, 4), fill: "transparent" });
        c.append(ipucu(`${kategoriler[i]} · ${s.ad || "Değer"}: ${bicim(v)}`));
        svg.append(c);
      });
    }
  }
  lejant(svg, seriler, x0, yuk - boy * 0.9, x1 - x0, boy);
}

function yatayGrafik(svg, g, gen, yuk, k) {
  const boy = 11 * k;
  const s = g.seriler[0];
  /* Grafik aralığındaki boş satırlar (adı ve değeri olmayan kategori) Excel'de boş yer olarak kalır; burada atlanır */
  const dolu = s.kategoriler.map((kat, i) => i).filter((i) => (s.kategoriler[i] ?? "") !== "" || (typeof s.degerler[i] === "number" && s.degerler[i] !== 0));
  const kategoriler = dolu.map((i) => String(s.kategoriler[i] ?? ""));
  const degerler = dolu.map((i) => s.degerler[i]);
  const n = kategoriler.length;
  const tum = degerler.filter((v) => typeof v === "number");
  const { ust, adim } = eksen(Math.max(...tum, 0), 3);
  const enUzun = Math.max(...kategoriler.map((t) => genislikTahmin(t, boy)));
  const solBosluk = Math.min(enUzun, gen * 0.42) + 10 * k;
  const ustBosluk = (g.baslik ? 30 : 12) * k;
  const degerPay = genislikTahmin(bicim(Math.max(...tum, 0)), boy) + 10 * k;
  const x0 = solBosluk, x1 = gen - degerPay, y0 = ustBosluk, y1 = yuk - boy * 2;
  const xx = (v) => x0 + (v / ust) * (x1 - x0);
  for (let v = 0; v <= ust + adim / 2; v += adim) {
    svg.append(el("line", { x1: xx(v), x2: xx(v), y1: y0, y2: y1, stroke: IZGARA, "stroke-width": 1 }));
    svg.append(metin(xx(v), y1 + boy * 1.1, bicim(v), { "font-size": boy, "text-anchor": "middle", "dominant-baseline": "middle" }));
  }
  const aralik = (y1 - y0) / n;
  const kalinlik = aralik / 2.5 * 1.5;
  kategoriler.forEach((kat, i) => {
    const yOrta = y0 + aralik * (i + 0.5);
    let ad = kat;
    while (genislikTahmin(ad, boy) > solBosluk - 10 * k && ad.length > 4) ad = ad.slice(0, -2);
    if (ad !== kat) ad = `${ad.trimEnd()}…`;
    const t = metin(x0 - 6 * k, yOrta, ad, { "font-size": boy, "text-anchor": "end", "dominant-baseline": "middle" });
    t.append(ipucu(kat));
    svg.append(t);
    const v = degerler[i];
    if (typeof v !== "number") return;
    const r = el("rect", { x: x0, y: yOrta - kalinlik / 2, width: Math.max(xx(v) - x0, 0), height: kalinlik, fill: s.renk || "#4F81BD" });
    r.append(ipucu(`${kat}: ${bicim(v)}`));
    svg.append(r);
    svg.append(metin(xx(v) + 4 * k, yOrta, bicim(v), { "font-size": boy * 0.92, "dominant-baseline": "middle" }));
  });
  svg.append(el("line", { x1: x0, x2: x0, y1: y0, y2: y1, stroke: EKSEN, "stroke-width": 1 }));
}

/* Grafik kutusu: { tur, baslik, seriler[{ ad, kategoriler, degerler, renk }] } → <svg> (genislik × yukseklik px) */
export function grafikCiz(g, genislik, yukseklik, k = 1) {
  const svg = el("svg", {
    class: "rt-svg", viewBox: `0 0 ${genislik} ${yukseklik}`, width: genislik, height: yukseklik,
    role: "img", "aria-label": g.baslik || "Grafik",
  });
  svg.append(el("rect", { x: 0, y: 0, width: genislik, height: yukseklik, fill: "#FFFFFF" }));
  if (g.baslik) {
    svg.append(metin(genislik / 2, 18 * k, g.baslik, { "font-size": 13 * k, "font-weight": 700, fill: BASLIK, "text-anchor": "middle", "dominant-baseline": "middle" }));
  }
  if (!g.seriler || !g.seriler.length || !g.seriler[0].kategoriler.length) return svg;
  if (g.tur === "yatay-cubuk") yatayGrafik(svg, g, genislik, yukseklik, k);
  else dikeyGrafik(svg, g, genislik, yukseklik, k);
  return svg;
}
