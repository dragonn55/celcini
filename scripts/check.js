#!/usr/bin/env node
/* Yayın öncesi kontrol: SEO etiketleri, kırık iç bağlantı, uydurma/yer tutucu, örnek kayıt sızıntısı,
   dil kuralları, ana sayfadaki oda şeridinin fabricakit/js/odalar.js ile uyumu.
   node scripts/check.js              → depo kökü (üretim)
   node scripts/check.js _onizleme    → önizleme derlemesi */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const depo = path.resolve(__dirname, "..");
const root = path.resolve(depo, process.argv[2] || ".");
const uretim = root === depo;
const atla = new Set(["node_modules", ".git", ".vercel", ".claude", "_onizleme", "scripts", "data", "docs"]);
const htmlFiles = [];
const jsFiles = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (atla.has(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) htmlFiles.push(p);
    else if (/\.(c|m)?js$/.test(name)) jsFiles.push(p);
  }
})(root);

let errors = 0;
const hata = (m) => { console.error("✗ " + m); errors++; };
const required = ["<title>", 'name="description"', 'name="viewport"', '<html lang="tr">', 'rel="canonical"',
  'property="og:title"', 'property="og:description"', 'property="og:url"', 'property="og:image"'];
/* Dil kuralları: "yapay zeka" şapkasız; Fabricakit C ile ve bitişik; simülasyonda "sipariş" denir */
const dil = [
  [/yapay zekâ/i, '"yapay zekâ" yerine "yapay zeka" yazılmalı'],
  [/Fabrikakit|FabricaKit|Fabrica Kit|Fabricakıt/, '"Fabricakit" C ile ve bitişik yazılır'],
  [/mektup/i, 'simülasyonda "mektup" değil "sipariş" denir'],
];

const urunler = JSON.parse(fs.readFileSync(path.join(depo, "data/urunler.json"), "utf8"));
/* derle.py gorunur() ile aynı kural: örnek kayıt ya da bağlantısı boş ve "yakinda" olmayan kayıt üretimde görünmez */
const gizli = urunler.filter((u) => u.ornek || (!String(u.shopier_url || "").trim() && !u.yakinda)).map((u) => u.slug);

for (const file of htmlFiles) {
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file, "utf8");
  for (const tag of required) if (!html.includes(tag)) hata(`${rel}: eksik ${tag}`);
  if (/\sstyle="/.test(html)) hata(`${rel}: satır içi style (CSP engeller)`);
  if (/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(html)) hata(`${rel}: satır içi script (CSP engeller)`);
  for (const [re, mesaj] of dil) if (re.test(html)) hata(`${rel}: ${mesaj}`);
  const links = [...html.matchAll(/(?:href|src|srcset|data-src)="(\/[^"#?\s]*)(?:[?#\s][^"]*)?"/g)].map((m) => m[1]);
  for (const l of links) {
    const target = l.endsWith("/") ? path.join(root, l, "index.html") : path.join(root, l);
    if (!fs.existsSync(target)) hata(`${rel}: kırık bağlantı ${l}`);
  }
  if (uretim) {
    if (html.includes("ÖRNEK")) hata(`${rel}: üretimde ÖRNEK etiketi görünüyor`);
    for (const s of gizli) if (html.includes(`/urun/${s}/`)) hata(`${rel}: gizli kayda bağlantı /urun/${s}/`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { hata(`${rel}: geçersiz JSON-LD`); }
  }
}
for (const file of jsFiles) {
  const rel = path.relative(root, file);
  const js = fs.readFileSync(file, "utf8");
  for (const [re, mesaj] of dil) if (re.test(js)) hata(`${rel}: ${mesaj}`);
}
if (uretim) for (const s of gizli) if (fs.existsSync(path.join(root, "urun", s))) hata(`urun/${s}/ üretimde olmamalı`);

/* Rehberli dersler (data/<urun>/dersler.json → derle.py): kilitli dersin notu ve sorusu herkese açık dosyalara sızmasın,
   ücretsiz dersin dosyası olsun, not aralıkları sayfanın içinde ve soru geçerli olsun. */
const harfNo = (h) => [...h].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
const REHBERLER = [{ urun: "datakit", taban: "datakit" }];
for (const rh of REHBERLER) {
  const kaynakYolu = path.join(depo, "data", rh.urun, "dersler.json");
  if (!fs.existsSync(kaynakYolu)) continue;
  const kaynak = JSON.parse(fs.readFileSync(kaynakYolu, "utf8"));
  const veri = path.join(root, rh.taban, "veri");
  const dizinYolu = path.join(veri, "dersler.json");
  if (!fs.existsSync(dizinYolu)) { hata(`${rh.taban}/veri/dersler.json yok (python3 scripts/derle.py)`); continue; }
  const dizin = JSON.parse(fs.readFileSync(dizinYolu, "utf8"));
  if (dizin.dersler.length !== kaynak.dersler.length) hata(`${rh.taban}/veri/dersler.json eski (python3 scripts/derle.py)`);
  for (const d of dizin.dersler) if (d.notlar || d.soru) hata(`${rh.taban}/veri/dersler.json: ${d.id} dersinin notları herkese açık dizinde`);
  const acikMetin = [...htmlFiles, ...fs.readdirSync(veri, { recursive: true }).map((f) => path.join(veri, f)).filter((f) => f.endsWith(".json"))]
    .map((f) => fs.readFileSync(f, "utf8")).join("\n");
  for (const d of kaynak.dersler) {
    const acik = path.join(veri, "ders", `${d.id}.json`);
    const gizli = path.join(depo, "api", "_dersler", rh.urun, `${d.id}.json`);
    if (d.ucretsiz && !fs.existsSync(acik)) hata(`${rh.taban}/veri/ders/${d.id}.json yok (ücretsiz ders)`);
    if (!d.ucretsiz) {
      if (fs.existsSync(acik)) hata(`kilitli ders herkese açık: ${rh.taban}/veri/ders/${d.id}.json`);
      if (uretim && !fs.existsSync(gizli)) hata(`api/_dersler/${rh.urun}/${d.id}.json yok (python3 scripts/derle.py)`);
      for (const n of d.notlar) for (const alan of ["metin", "karar", "ses"]) {
        if (n[alan] && acikMetin.includes(n[alan])) hata(`kilitli dersin notu herkese açık dosyada: ${d.id} · ${n.baslik} (${alan})`);
      }
      for (const t of [d.soru.metin, d.soru.aciklama, ...d.soru.secenekler]) {
        if (t && t.length > 24 && acikMetin.includes(t)) hata(`kilitli dersin sorusu herkese açık dosyada: ${d.id}`);
      }
    }
    const sayfaYolu = path.join(depo, "data", rh.urun, "sayfalar", `${d.id}.json`);
    if (!fs.existsSync(sayfaYolu)) { hata(`data/${rh.urun}/sayfalar/${d.id}.json yok`); continue; }
    const sayfa = JSON.parse(fs.readFileSync(sayfaYolu, "utf8"));
    const sonSutun = sayfa.sutunlar.length, sonSatir = sayfa.satirlar[sayfa.satirlar.length - 1].r;
    d.notlar.forEach((n, i) => {
      const m = String(n.aralik).match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
      if (!m) { hata(`${rh.urun}/${d.id} not ${i + 1}: aralık "${n.aralik}" geçersiz`); return; }
      const c2 = harfNo(m[3] || m[1]), r2 = Number(m[4] || m[2]);
      if (c2 > sonSutun || r2 > sonSatir) hata(`${rh.urun}/${d.id} not ${i + 1}: ${n.aralik} sayfanın dışında`);
      for (const alan of ["baslik", "metin", "karar"]) if (!String(n[alan] || "").trim()) hata(`${rh.urun}/${d.id} not ${i + 1}: ${alan} boş`);
      for (const [re, mesaj] of dil) if (re.test(`${n.metin} ${n.karar} ${n.ses || ""}`)) hata(`${rh.urun}/${d.id} not ${i + 1}: ${mesaj}`);
    });
    const s = d.soru;
    if (!Array.isArray(s.secenekler) || s.secenekler.length < 2 || !(s.dogru >= 0 && s.dogru < s.secenekler.length)) hata(`${rh.urun}/${d.id}: soru geçersiz`);
  }
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const m of sitemap.matchAll(/<loc>https:\/\/celcini\.com(\/[^<]*)<\/loc>/g)) {
  if (!fs.existsSync(path.join(root, m[1], "index.html"))) hata(`sitemap: sayfa yok ${m[1]}`);
}

(async () => {
  /* Oda şeridi odalar.js ile aynı mı? Değilse derleme eskidir: python3 scripts/derle.py */
  const { ODALAR, tabela } = await import(pathToFileURL(path.join(depo, "fabricakit/js/odalar.js")).href);
  const ana = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const kacis = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const oda of ODALAR) {
    const t = tabela(oda);
    const bekle = `<span class="oda-kod">${kacis(t.buyuk)}</span>` + (t.kucuk ? `<span class="oda-ad">${kacis(t.kucuk)}</span>` : "</li>");
    if (!ana.includes(bekle)) hata(`index.html: "${oda.id}" odası odalar.js ile uyuşmuyor (python3 scripts/derle.py çalıştırın)`);
  }
  if (errors) { console.error(`\n${errors} sorun bulundu.`); process.exit(1); }
  console.log(`✓ ${htmlFiles.length} HTML, ${jsFiles.length} JS dosyası kontrol edildi (${uretim ? "üretim" : path.relative(depo, root)}), sorun yok.`);
})();
