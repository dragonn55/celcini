#!/usr/bin/env node
/* Basit yayın öncesi kontrol: her HTML'de temel SEO etiketleri ve kırık iç bağlantı var mı? */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlFiles = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (["node_modules", ".git", ".vercel"].includes(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) htmlFiles.push(p);
  }
})(root);

let errors = 0;
const required = ["<title>", 'name="description"', 'name="viewport"', '<html lang="tr">'];

for (const file of htmlFiles) {
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file, "utf8");
  for (const tag of required) {
    if (!html.includes(tag)) { console.error(`✗ ${rel}: eksik ${tag}`); errors++; }
  }
  const links = [...html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)].map(m => m[1]);
  for (const l of links) {
    const target = l.endsWith("/") ? path.join(root, l, "index.html") : path.join(root, l);
    if (!fs.existsSync(target)) { console.error(`✗ ${rel}: kırık bağlantı ${l}`); errors++; }
  }
}

if (errors) { console.error(`\n${errors} sorun bulundu.`); process.exit(1); }
console.log(`✓ ${htmlFiles.length} HTML dosyası kontrol edildi, sorun yok.`);
