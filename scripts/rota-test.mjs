#!/usr/bin/env node
/* ROTA 3D yönlendirici testi (DOM'suz): uzay/rota/js/router.js ve layout.js.
   Denetler: engel çevresinden dolanma (en kısa yol, engelden geçmez), erişilemeyen göz uyarısı,
   optimum ≤ sıralı mesafe (≤12 durak Held-Karp, fazlası en yakın komşu + 2-opt; tohumlu rastgele listeler),
   Held-Karp'ın kaba kuvvetle aynı en kısa turu bulması, yolların geçerliliği (komşu adımlar, yürünebilir hücre,
   sevkiyatta başlar ve biter, her durağa uğrar), adım adım listenin toplamı, raf kodu ve "Listeyi yapıştır" ayrıştırması,
   sayfadaki varsayılanlar (yürüme 1,0 m/sn, göz başına alma 15 sn) ve örnek listenin tahmini süresi.
   Çalıştırma: node scripts/rota-test.mjs */
import { Layout } from "../uzay/rota/js/layout.js";
import { Router } from "../uzay/rota/js/router.js";
import fs from "node:fs";

let hataSayisi = 0, denetim = 0;
const hata = (m) => { console.error("✗ " + m); hataSayisi += 1; };
const bekle = (kosul, m) => { denetim += 1; if (!kosul) hata(m); };

/* tohumlu rastgele (mulberry32) */
function rastgele(tohum) {
  return () => { tohum |= 0; tohum = (tohum + 0x6D2B79F5) | 0; let t = Math.imul(tohum ^ (tohum >>> 15), 1 | tohum);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const kodlar = (L, metin) => { const { ok, bad } = Layout.parsePicks(metin, L); if (bad.length) hata(`tanınmayan test kodu: ${bad}`); return ok; };

/* Yol geçerli mi: sevkiyatta başlar/biter, her adım tek kare, engel ve raftan geçmez, her durağa varılır */
function yoluDenetle(L, r, ad) {
  const { path } = r, d = L.depot;
  bekle(path[0].x === d.x && path[0].z === d.z, `${ad}: yol sevkiyatta başlamıyor`);
  bekle(path.at(-1).x === d.x && path.at(-1).z === d.z, `${ad}: yol sevkiyatta bitmiyor`);
  bekle(r.moves === path.length - 1, `${ad}: moves ${r.moves} ≠ yol uzunluğu ${path.length - 1}`);
  for (let i = 0; i < path.length; i++) {
    const c = path[i];
    if (!Layout.isWalk(L, c.x, c.z)) { hata(`${ad}: ${i}. adım yürünemez hücrede (${c.x},${c.z})`); break; }
    if (i && Math.abs(c.x - path[i - 1].x) + Math.abs(c.z - path[i - 1].z) !== 1) { hata(`${ad}: ${i}. adım komşu değil`); break; }
  }
  for (const a of r.arrive) {
    const c = path[a.at];
    if (c.x !== a.stop.cell.x || c.z !== a.stop.cell.z) hata(`${ad}: ${a.stop.codes} durağına varılmıyor`);
  }
  bekle(r.arrive.length === r.stopCount, `${ad}: ${r.stopCount} duraktan ${r.arrive.length}'ine uğranıyor`);
  const adimlar = Router.steps(L, r);
  const toplam = adimlar.filter((s) => s.type === "move").reduce((t, s) => t + s.cells, 0);
  bekle(toplam === r.moves, `${ad}: adım adım toplamı ${toplam} ≠ ${r.moves}`);
  bekle(adimlar.at(-1)?.text === "Sevkiyata dön", `${ad}: son adım "Sevkiyata dön" değil`);
  bekle(adimlar.filter((s) => s.type === "stop").length === r.stopCount, `${ad}: adım listesinde durak sayısı tutmuyor`);
}

/* ---------------- 1. Engel çevresinden dolanma ---------------- */
{
  // 2 blok, 6 göz, tek kat, sevkiyat sol ön (0,0). A03'ün koridor karesi (0,3).
  const L = Layout.build(2, 6, 1, "left");
  const picks = kodlar(L, "A03");
  const acik = Router.solve(L, picks, "opt");
  bekle(acik.moves === 6, `engelsiz A03 gidiş-dönüş 6 göz olmalı, ${acik.moves}`);
  Layout.toggleBlock(L, 0, 2);
  const r = Router.solve(L, picks, "opt");
  bekle(!r.error, `engel varken A03'e yol bulunmalı: ${r.error}`);
  if (!r.error) {
    yoluDenetle(L, r, "engel");
    bekle(!r.path.some((c) => c.x === 0 && c.z === 2), "yol engelli kareden (0,2) geçiyor");
    // en kısa dolanma: (0,0)→(3,0)→(3,7)→(0,7)→(0,3) = 3+7+3+4 = 17; gidiş-dönüş 34
    const bfs = Router.bfs(L, L.depot);
    bekle(r.moves === 2 * bfs.dist[0][3], `dolanma en kısa değil: ${r.moves} ≠ ${2 * bfs.dist[0][3]}`);
    bekle(r.moves === 34, `dolanma 34 göz olmalı, ${r.moves}`);
  }
  bekle(!Layout.toggleBlock(L, 1, 3), "raf hücresine engel konmamalı");
  bekle(!Layout.toggleBlock(L, 0, 0), "sevkiyat noktasına engel konmamalı");
  Layout.toggleBlock(L, 0, 2);
  bekle(Router.solve(L, picks).moves === 6, "engel kalkınca yol eski haline dönmeli");
}

/* ---------------- 2. Erişilemeyen göz uyarısı ---------------- */
{
  const L = Layout.build(2, 6, 1, "left");
  Layout.toggleBlock(L, 0, 2); Layout.toggleBlock(L, 0, 4);
  const r = Router.solve(L, kodlar(L, "A03, B05"), "opt");
  bekle(Boolean(r.error), "kapalı kalan A03 için uyarı dönmeli");
  bekle(/Ulaşılamayan göz: A03\b/.test(r.error || ""), `uyarı metni A03'ü anmalı: ${r.error}`);
  bekle(!/B05/.test(r.error || ""), "ulaşılabilen B05 uyarıda olmamalı");
  bekle(Boolean(Router.solve(L, kodlar(L, "A03"), "seq").error), "sıralı modda da uyarı dönmeli");
  // aynı gözün iki katı aynı koridor karesinde: tek durak
  const L2 = Layout.build(2, 6, 3, "left");
  const r2 = Router.solve(L2, kodlar(L2, "A03-1, A03-3"), "opt");
  bekle(r2.stopCount === 1 && r2.itemCount === 2, "aynı gözün iki katı tek durak, iki ürün olmalı");
}

/* ---------------- 3. Optimum ≤ sıralı; Held-Karp = kaba kuvvet ---------------- */
function kabaKuvvet(D) {
  const m = D.length - 1; let en = Infinity;
  const gez = (yol, kalan, t) => {
    if (t >= en) return;
    if (!kalan.length) { en = Math.min(en, t + D[yol.at(-1)][0]); return; }
    kalan.forEach((k, i) => gez([...yol, k], kalan.filter((_, j) => j !== i), t + D[yol.at(-1)][k]));
  };
  gez([0], Array.from({ length: m }, (_, i) => i + 1), 0);
  return en;
}
let hkSayi = 0, ikiOptSayi = 0, kabaSayi = 0, toplamOpt = 0, toplamSeq = 0;
for (let tohum = 1; tohum <= 300; tohum++) {
  const r = rastgele(tohum);
  const pairs = 1 + Math.floor(r() * 5), bays = 3 + Math.floor(r() * 18), levels = 1 + Math.floor(r() * 3);
  const depot = ["left", "center", "right"][Math.floor(r() * 3)];
  const L = Layout.build(pairs, bays, levels, depot);
  // koridorlara rastgele birkaç engel (sevkiyat ve raf hariç)
  for (let b = Math.floor(r() * 4); b > 0; b--) Layout.toggleBlock(L, Math.floor(r() * L.W), Math.floor(r() * L.H));
  const n = tohum % 3 === 0 ? 13 + Math.floor(r() * 10) : 1 + Math.floor(r() * 12);
  const liste = Array.from({ length: n }, () => {
    const rack = L.racks[Math.floor(r() * L.racks.length)];
    return `${rack.letter}${1 + Math.floor(r() * bays)}-${1 + Math.floor(r() * levels)}`;
  }).join(", ");
  const picks = kodlar(L, liste);
  const opt = Router.solve(L, picks, "opt"), seq = Router.solve(L, picks, "seq");
  if (opt.error || seq.error) { bekle(Boolean(opt.error) === Boolean(seq.error), `tohum ${tohum}: yalnız bir modda uyarı`); continue; }
  yoluDenetle(L, opt, `tohum ${tohum} opt`); yoluDenetle(L, seq, `tohum ${tohum} seq`);
  bekle(opt.moves <= seq.moves, `tohum ${tohum}: optimum ${opt.moves} > sıralı ${seq.moves} (${opt.method}, ${opt.stopCount} durak)`);
  toplamOpt += opt.moves; toplamSeq += seq.moves;
  if (opt.stopCount <= 12) hkSayi += 1; else ikiOptSayi += 1;
  bekle(opt.stopCount <= 12 ? /Held-Karp/.test(opt.method) : /2-opt/.test(opt.method), `tohum ${tohum}: yöntem ${opt.method}`);
  if (opt.stopCount <= 7) {
    const stops = Router.groupStops(picks), nodes = [L.depot, ...stops.map((s) => s.cell)];
    const D = nodes.map((a) => { const t = Router.bfs(L, a); return nodes.map((b) => t.dist[b.x][b.z]); });
    bekle(opt.moves === kabaKuvvet(D), `tohum ${tohum}: Held-Karp ${opt.moves} ≠ kaba kuvvet ${kabaKuvvet(D)}`);
    kabaSayi += 1;
  }
}
bekle(hkSayi > 100 && ikiOptSayi > 30, `yeterli örnek yok: Held-Karp ${hkSayi}, 2-opt ${ikiOptSayi}`);

/* ---------------- 4. Raf kodu ve "Listeyi yapıştır" ---------------- */
{
  const L = Layout.build(4, 12, 3, "left");
  const kod = (t) => Layout.parseCode(t, L)?.code ?? null;
  bekle(kod("C07-2") === "C07-2" && kod("c7/2") === "C07-2" && kod("C07K2") === "C07-2" && kod("C-07-2") === "C07-2", "C07-2 biçimleri");
  bekle(kod("C07") === "C07-1", "katsız kod 1. kat olmalı");
  bekle(kod("C13") === null && kod("I01") === null && kod("C07-4") === null && kod("7C") === null, "sınır dışı kodlar reddedilmeli");
  const C = Layout.parseCode("C07-2", L);
  bekle(C.cell.x === C.rack.aisleX && C.cell.z === 7, "C07-2 koridor karesi");
  const { ok, bad } = Layout.parsePaste('Raf kodu\tAdet\r\nA03\t2\r\n"C 07-2"\r\nb11/2; D02-3, A03\r\n\r\nZ99', L);
  bekle(ok.map((p) => p.code).join(",") === "A03-1,C07-2,B11-2,D02-3", `yapıştır kodları: ${ok.map((p) => p.code)}`);
  bekle(bad.join("|") === "Raf kodu|Adet|2|Z99", `yapıştır tanınmayanlar: ${bad}`);
}

/* ---------------- 5. Varsayılan süreler (derlenmiş sayfa) ve örnek listenin süresi ---------------- */
let ornekSure = "";
{
  const sayfa = fs.readFileSync(new URL("../uzay/rota/index.html", import.meta.url), "utf8");
  const ui = fs.readFileSync(new URL("../uzay/rota/js/ui.js", import.meta.url), "utf8");
  const deger = (id) => sayfa.match(new RegExp(`id="${id}"[^>]*value="([^"]+)"`))?.[1];
  const hiz = +deger("inSpeed"), alma = +deger("inPickTime"), goz = +deger("inCell");
  bekle(hiz === 1, `varsayılan yürüme hızı 1,0 m/sn olmalı: ${deger("inSpeed")}`);
  bekle(alma === 15, `varsayılan göz başına alma süresi 15 sn olmalı: ${deger("inPickTime")}`);
  bekle(/<b id="pickVal">15<\/b> sn/.test(sayfa), "ayarlar etiketi 15 sn yazmalı");
  bekle(/Varsayılan alma süresi 15 sn: gözü bulma, sayma ve barkod okutma dahil/.test(sayfa), "ayarlarda 15 sn açıklaması olmalı");
  // örnek depo ve liste ui.js'teki SAMPLE'dan; süre = mesafe / hız + ürün × alma (ui.js timeFor)
  const ornek = ui.match(/SAMPLE = \{ pairs:(\d+), bays:(\d+), levels:(\d+), cell:([\d.]+), depot:"(\w+)",\s*picks:"([^"]+)"/);
  bekle(Boolean(ornek), "ui.js'te SAMPLE bulunamadı");
  if (ornek) {
    const L = Layout.build(+ornek[1], +ornek[2], +ornek[3], ornek[5]);
    const r = Router.solve(L, kodlar(L, ornek[6].replace(/\\n/g, "\n")), "opt");
    bekle(+ornek[4] === goz, `örnek göz genişliği sayfayla aynı olmalı: ${ornek[4]} / ${goz}`);
    const sn = r.moves * goz / hiz + r.itemCount * alma;
    bekle(r.moves === 78 && r.itemCount === 10, `örnek rota 78 göz, 10 ürün olmalı: ${r.moves}, ${r.itemCount}`);
    bekle(Math.abs(sn - 243.6) < 1e-9, `örnek süre 93,6 m / 1,0 + 10 × 15 = 243,6 sn olmalı: ${sn}`);
    const tr = (n) => n.toFixed(1).replace(".", ",");
    ornekSure = ` Örnek liste: ${tr(r.moves * goz)} m, ${tr(sn / 60)} dk (alma 15 sn).`;
  }
}

if (hataSayisi) { console.error(`\n✗ rota-test: ${hataSayisi} sorun (${denetim} denetim).`); process.exit(1); }
console.log(`✓ rota-test: ${denetim} denetim geçti. 300 rastgele depo (Held-Karp ${hkSayi}, 2-opt ${ikiOptSayi}, kaba kuvvetle ${kabaSayi}); ` +
  `toplam sıralı ${toplamSeq} göz → ROTA ${toplamOpt} göz (%${Math.round((1 - toplamOpt / toplamSeq) * 100)} kısa). Engel dolanma ve erişilemeyen göz uyarısı doğru.${ornekSure}`);
