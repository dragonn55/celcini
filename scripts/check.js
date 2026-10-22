#!/usr/bin/env node
/* Yayın öncesi kontrol: SEO etiketleri, kırık iç bağlantı, uydurma/yer tutucu, örnek kayıt sızıntısı.
   node scripts/check.js              → depo kökü (üretim)
   node scripts/check.js _onizleme    → önizleme derlemesi */
const fs = require("fs");
const path = require("path");

const depo = path.resolve(__dirname, "..");
const root = path.resolve(depo, process.argv[2] || ".");
const uretim = root === depo;
const atla = new Set(["node_modules", ".git", ".vercel", ".claude", "_onizleme", "scripts", "data"]);
const htmlFiles = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (atla.has(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) htmlFiles.push(p);
  }
})(root);

let errors = 0;
const hata = (m) => { console.error("✗ " + m); errors++; };
const required = ["<title>", 'name="description"', 'name="viewport"', '<html lang="tr">', 'rel="canonical"',
  'property="og:title"', 'property="og:description"', 'property="og:url"', 'property="og:image"'];

const urunler = JSON.parse(fs.readFileSync(path.join(depo, "data/urunler.json"), "utf8"));
const gizli = urunler.filter((u) => u.ornek || !String(u.shopier_url || "").trim()).map((u) => u.slug);

for (const file of htmlFiles) {
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file, "utf8");
  for (const tag of required) if (!html.includes(tag)) hata(`${rel}: eksik ${tag}`);
  if (/\sstyle="/.test(html)) hata(`${rel}: satır içi style (CSP engeller)`);
  if (/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(html)) hata(`${rel}: satır içi script (CSP engeller)`);
  if (/yapay zekâ/i.test(html)) hata(`${rel}: "yapay zekâ" yerine "yapay zeka" yazılmalı`);
  const links = [...html.matchAll(/(?:href|src|data-src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)].map((m) => m[1]);
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
if (uretim) for (const s of gizli) if (fs.existsSync(path.join(root, "urun", s))) hata(`urun/${s}/ üretimde olmamalı`);

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const m of sitemap.matchAll(/<loc>https:\/\/celcini\.com(\/[^<]*)<\/loc>/g)) {
  if (!fs.existsSync(path.join(root, m[1], "index.html"))) hata(`sitemap: sayfa yok ${m[1]}`);
}

if (errors) { console.error(`\n${errors} sorun bulundu.`); process.exit(1); }
console.log(`✓ ${htmlFiles.length} HTML dosyası kontrol edildi (${uretim ? "üretim" : path.relative(depo, root)}), sorun yok.`);
