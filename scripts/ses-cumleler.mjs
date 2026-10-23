#!/usr/bin/env node
/* Ajan GM ses listesi: fabricakit/js/ajan-gm/cumleler.js → data/ses/cumleler.json.
   Her satır: id, metin (ekranda geçen parça), okunus (seseHazirla: sayılar yazıyla), dosya (assets/ses/ajan-gm/ altında).
   Ses üretim betikleri (scripts/ses-piper.py, scripts/ses-tolga.ps1) bu dosyayı okur; scripts/ses-test.mjs güncelliğini denetler.
   Çalıştırma: node scripts/ses-cumleler.mjs */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CUMLELER } from "../fabricakit/js/ajan-gm/cumleler.js";
import { seseHazirla } from "../fabricakit/js/arayuz/ses.js";

export const JSON_YOLU = new URL("../data/ses/cumleler.json", import.meta.url);

export const cumleListesi = () => CUMLELER.map((c) => ({ id: c.id, metin: c.metin, okunus: seseHazirla(c.metin), dosya: `${c.id}.mp3` }));
export const listeMetni = () => `${JSON.stringify(cumleListesi(), null, 2)}\n`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(new URL(".", JSON_YOLU), { recursive: true });
  fs.writeFileSync(JSON_YOLU, listeMetni());
  console.log(`data/ses/cumleler.json yazıldı: ${CUMLELER.length} cümle.`);
}
