#!/usr/bin/env node
/* Yayın öncesi kontrol: SEO etiketleri, kırık iç bağlantı, uydurma/yer tutucu, örnek kayıt sızıntısı,
   dil kuralları, ana sayfadaki oda şeridinin fabricakit/js/odalar.js ile uyumu, CSS'te :root dışında renk kodu.
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
const cssFiles = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (atla.has(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) htmlFiles.push(p);
    else if (/\.(c|m)?js$/.test(name)) jsFiles.push(p);
    else if (name.endsWith(".css")) cssFiles.push(p);
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
const gizli = urunler.filter((u) => u.ornek || !String(u.shopier_url || "").trim()).map((u) => u.slug);

/* Palet tek yerde: CSS'te renk kodu (#hex, rgb/rgba) yalnızca style.css :root içinde yazılır */
for (const file of cssFiles) {
  const rel = path.relative(root, file);
  const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/:root\s*\{[^}]*\}/g, "");
  const kod = css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  if (kod) hata(`${rel}: renk kodu "${kod[0]}" :root dışında; style.css :root'taki bir değişkene bağlanmalı`);
}

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
