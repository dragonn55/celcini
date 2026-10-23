#!/usr/bin/env node
/* Fabricakit erişim kodu → SHA-256 (Vercel ortam değişkeni ERISIM_KOD_HASHLERI için).
   Kullanım:
     node scripts/kod-hash.mjs KOD1 KOD2 ...   verilen kodların hash'leri
     node scripts/kod-hash.mjs --uret 20       20 yeni rastgele kod ve hash'leri
   Son satırdaki listeyi Vercel'de ERISIM_KOD_HASHLERI değerine yapıştırın; önceden kod varsa virgülle sonuna ekleyin.
   Kodların kendisini yalnızca satış için saklayın: repoya, sohbete ya da günlüğe yazmayın.
   Normalleştirme api/_ortak.js ile aynıdır: büyük-küçük harf, boşluk ve tire fark etmez. */
import { createRequire } from "node:module";
import { randomInt } from "node:crypto";

const require = createRequire(import.meta.url);
const { normalKod, kodHash } = require("../api/_ortak.js");

const ALFABE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; /* 0-O ve 1-I karışmasın diye yok */

function yeniKod() {
  let s = "";
  for (let i = 0; i < 12; i++) s += ALFABE[randomInt(ALFABE.length)];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

const argumanlar = process.argv.slice(2);
let kodlar = argumanlar;
if (argumanlar[0] === "--uret") {
  const adet = Number(argumanlar[1] || 10);
  if (!Number.isInteger(adet) || adet < 1 || adet > 1000) {
    console.error("Adet 1 ile 1000 arasında bir tam sayı olmalı.");
    process.exit(1);
  }
  kodlar = Array.from({ length: adet }, yeniKod);
}
if (!kodlar.length) {
  console.error("Kullanım: node scripts/kod-hash.mjs KOD1 KOD2 ...  ya da  node scripts/kod-hash.mjs --uret 20");
  process.exit(1);
}

const hatali = kodlar.filter((k) => normalKod(k).length < 6 || normalKod(k).length > 64);
if (hatali.length) {
  console.error(`Şu kodlar 6–64 harf/rakam arasında değil: ${hatali.join(", ")}`);
  process.exit(1);
}

const hashler = kodlar.map((k) => kodHash(k));
const genislik = Math.max(...kodlar.map((k) => k.length), 3);
console.log(`${"KOD".padEnd(genislik)}  SHA-256`);
kodlar.forEach((k, i) => console.log(`${k.padEnd(genislik)}  ${hashler[i]}`));
console.log("\nERISIM_KOD_HASHLERI için:");
console.log([...new Set(hashler)].join(","));
