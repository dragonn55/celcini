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
const sayiOndalik = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const bicim = (v) => (v === null || v === undefined ? "" : sayi.format(Math.round(v)));
/* Eksen etiketi: yüzde serisi → %12; küçük aralık → ondalık; yoksa tam sayı */
const bicimEksen = (v, yuzde, adim) => (yuzde ? `%${sayiOndalik.format(Math.round(v * 1000) / 10)}` : adim < 1 ? sayiOndalik.format(v) : bicim(v));
const yuzdeSeri = (s) => /%/.test(String(s.bicim || ""));
const degerYazisi = (v, yuzde) => (yuzde ? `%${sayiOndalik.format(Math.round(v * 1000) / 10)}` : bicim(v));

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
  /* Yüzde biçimli seriler, öteki serilerin ölçeği 10'u aşıyorsa Excel'deki gibi sağdaki ikincil eksende çizgi olarak çizilir */
  const tumSeri = g.seriler;
  const buyuk = Math.max(...tumSeri.filter((s) => !yuzdeSeri(s)).flatMap((s) => s.degerler.filter((v) => typeof v === "number")), 0);
  const ikincil = tumSeri.filter((s) => yuzdeSeri(s) && buyuk > 10);
  const seriler = tumSeri.filter((s) => !ikincil.includes(s));
  const kategoriler = tumSeri[0].kategoriler.map(String);
  const n = kategoriler.length;
  const yuzde = seriler.length > 0 && seriler.every(yuzdeSeri);
  const tum = seriler.flatMap((s) => s.degerler.filter((v) => typeof v === "number"));
  const { ust, adim } = eksen(Math.max(...tum, 0));
  const solBosluk = Math.max(...[0, ust].map((v) => genislikTahmin(bicimEksen(v, yuzde, adim), boy))) + 12 * k;
  const ustBosluk = (g.baslik ? 30 : 12) * k;
  const lejantYuk = tumSeri.filter((s) => s.ad).length > 1 ? boy * 2 : 0;
  const altBosluk = boy * 2.2 + lejantYuk;
  const ikincilUst = ikincil.length ? eksen(Math.max(...ikincil.flatMap((s) => s.degerler.filter((v) => typeof v === "number")), 0)) : null;
  const sagBosluk = ikincilUst ? genislikTahmin(bicimEksen(ikincilUst.ust, true, ikincilUst.adim), boy) + 12 * k : 12 * k;
  const x0 = solBosluk, x1 = gen - sagBosluk, y0 = ustBosluk, y1 = yuk - altBosluk;
  const yx = (v) => y1 - (v / ust) * (y1 - y0);
  for (let v = 0; v <= ust + adim / 2; v += adim) {
    svg.append(el("line", { x1: x0, x2: x1, y1: yx(v), y2: yx(v), stroke: IZGARA, "stroke-width": 1 }));
    svg.append(metin(x0 - 6 * k, yx(v), bicimEksen(v, yuzde, adim), { "font-size": boy, "text-anchor": "end", "dominant-baseline": "middle" }));
  }
  if (ikincilUst) {
    const yx2 = (v) => y1 - (v / ikincilUst.ust) * (y1 - y0);
    for (let v = 0; v <= ikincilUst.ust + ikincilUst.adim / 2; v += ikincilUst.adim) {
      svg.append(metin(x1 + 6 * k, yx2(v), bicimEksen(v, true, ikincilUst.adim), { "font-size": boy, "dominant-baseline": "middle" }));
    }
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
      r.append(ipucu(`${kategoriler[i]} · ${s.ad || "Değer"}: ${degerYazisi(v, yuzde)}`));
      svg.append(r);
    }));
  }
  if (g.tur !== "cubuk" || ikincil.length) {
    const cizgiler = g.tur === "cubuk" ? ikincil : seriler;
    const yEks = (s) => (ikincil.includes(s) ? (v) => y1 - (v / ikincilUst.ust) * (y1 - y0) : yx);
    for (const s of cizgiler) {
      const yy = yEks(s);
      let yol = "", acik = false;
      s.degerler.forEach((v, i) => {
        if (typeof v !== "number") { acik = false; return; }
        yol += `${acik ? "L" : "M"}${xOrta(i).toFixed(1)} ${yy(v).toFixed(1)} `;
        acik = true;
      });
      svg.append(el("path", { d: yol.trim(), fill: "none", stroke: s.renk || "#4A7EBB", "stroke-width": 2.25 * k, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      s.degerler.forEach((v, i) => {
        if (typeof v !== "number") return;
        const c = el("circle", { cx: xOrta(i), cy: yy(v), r: Math.max(aralik / 2, 4), fill: "transparent" });
        c.append(ipucu(`${kategoriler[i]} · ${s.ad || "Değer"}: ${degerYazisi(v, yuzdeSeri(s))}`));
        svg.append(c);
      });
    }
  }
  lejant(svg, tumSeri, x0, yuk - boy * 0.9, x1 - x0, boy);
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

/* Halka ve pasta: ilk serinin dilimleri; renk veri noktasından (renkler[i]), yoksa paletten. Sağda lejant ve yüzde. */
const PALET = ["#4F81BD", "#C0504D", "#9BBB59", "#8064A2", "#4BACC6", "#F79646", "#2C4D75", "#772C2A", "#5F7530", "#4D3B62", "#276A7C", "#B65708"];
function halkaGrafik(svg, g, gen, yuk, k) {
  const boy = 11 * k;
  const s = g.seriler[0];
  const dilimler = s.kategoriler.map((kat, i) => ({ ad: String(kat ?? ""), v: s.degerler[i], renk: (s.renkler && s.renkler[i]) || PALET[i % PALET.length] }))
    .filter((d) => typeof d.v === "number" && d.v > 0);
  const toplam = dilimler.reduce((t, d) => t + d.v, 0);
  if (!toplam) return;
  const ustBosluk = (g.baslik ? 30 : 12) * k;
  const lejantGen = Math.min(gen * 0.5, Math.max(...dilimler.map((d) => genislikTahmin(`${d.ad} %100`, boy))) + 28 * k);
  const cap = Math.min(yuk - ustBosluk - 10 * k, gen - lejantGen - 16 * k);
  const cx = (gen - lejantGen) / 2, cy = ustBosluk + (yuk - ustBosluk) / 2, R = cap / 2, r0 = g.tur === "halka" ? R * 0.5 : 0;
  let aci = -Math.PI / 2;
  for (const d of dilimler) {
    const pay = d.v / toplam, bitis = aci + pay * 2 * Math.PI;
    const buyuk = pay > 0.5 ? 1 : 0;
    const x1 = cx + R * Math.cos(aci), y1 = cy + R * Math.sin(aci), x2 = cx + R * Math.cos(bitis), y2 = cy + R * Math.sin(bitis);
    let yol;
    if (pay >= 0.9999) {
      yol = r0 ? `M${cx + R} ${cy} A${R} ${R} 0 1 1 ${cx - R} ${cy} A${R} ${R} 0 1 1 ${cx + R} ${cy} M${cx + r0} ${cy} A${r0} ${r0} 0 1 0 ${cx - r0} ${cy} A${r0} ${r0} 0 1 0 ${cx + r0} ${cy}`
               : `M${cx + R} ${cy} A${R} ${R} 0 1 1 ${cx - R} ${cy} A${R} ${R} 0 1 1 ${cx + R} ${cy}`;
    } else if (r0) {
      const ix1 = cx + r0 * Math.cos(bitis), iy1 = cy + r0 * Math.sin(bitis), ix2 = cx + r0 * Math.cos(aci), iy2 = cy + r0 * Math.sin(aci);
      yol = `M${x1} ${y1} A${R} ${R} 0 ${buyuk} 1 ${x2} ${y2} L${ix1} ${iy1} A${r0} ${r0} 0 ${buyuk} 0 ${ix2} ${iy2} Z`;
    } else {
      yol = `M${cx} ${cy} L${x1} ${y1} A${R} ${R} 0 ${buyuk} 1 ${x2} ${y2} Z`;
    }
    const p = el("path", { d: yol, fill: d.renk, stroke: "#FFFFFF", "stroke-width": 1.5 * k, "fill-rule": "evenodd" });
    p.append(ipucu(`${d.ad}: ${bicim(d.v)} (%${Math.round(pay * 100)})`));
    svg.append(p);
    aci = bitis;
  }
  const lx = gen - lejantGen + 8 * k, satir = boy * 1.7;
  const enCok = Math.max(1, Math.floor((yuk - ustBosluk) / satir));
  let ly = cy - (Math.min(dilimler.length, enCok) - 1) * satir / 2;
  dilimler.slice(0, enCok).forEach((d, i) => {
    svg.append(el("rect", { x: lx, y: ly - boy * 0.5, width: boy, height: boy, rx: 2, fill: d.renk }));
    let ad = d.ad;
    while (genislikTahmin(`${ad} %${Math.round(d.v / toplam * 100)}`, boy) > lejantGen - boy - 12 * k && ad.length > 4) ad = ad.slice(0, -2);
    if (ad !== d.ad) ad = `${ad.trimEnd()}…`;
    const t = metin(lx + boy + 6 * k, ly, `${ad} %${Math.round(d.v / toplam * 100)}`, { "font-size": boy, "dominant-baseline": "middle" });
    t.append(ipucu(`${d.ad}: ${bicim(d.v)}`));
    svg.append(t);
    ly += satir;
  });
  if (dilimler.length > enCok) svg.append(metin(lx, ly, `+${dilimler.length - enCok} dilim`, { "font-size": boy, "dominant-baseline": "middle" }));
}

/* Grafik kutusu: { tur, baslik, seriler[{ ad, kategoriler, degerler, renk, renkler? }] } → <svg> (genislik × yukseklik px) */
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
  else if (g.tur === "halka" || g.tur === "pasta") halkaGrafik(svg, g, genislik, yukseklik, k);
  else dikeyGrafik(svg, g, genislik, yukseklik, k);
  return svg;
}
