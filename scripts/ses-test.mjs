#!/usr/bin/env node
/* Ajan GM ses denetimi (npm run check):
   - Cümle listesi (fabricakit/js/ajan-gm/cumleler.js) en fazla 40, kimlikler tekil ve dosya adına uygun, hiçbir cümle
     bir başkasının içinde geçmiyor; her kalıbın sabit parçası metinde bulunuyor (parcala).
   - data/ses/cumleler.json listeyle aynı (değilse: node scripts/ses-cumleler.mjs).
   - assets/ses/ajan-gm/ ya boş (sesler henüz üretilmedi: uyarı, cihaz sesi kullanılır) ya da listeyle birebir:
     her cümlenin mp3'ü var, fazla dosya yok, toplam ≤ 3 MB; ffprobe varsa her dosya mp3, tek kanal, en fazla 64 kbps
     ve en az 0,3 sn.
   - fabricakit/js/ajan-gm/ses-dosyalari.js dosyalarla uyumlu: dosya yoksa SES_DOSYALARI_HAZIR false, varsa true ve
     SES_KAYNAGI dolu (üretim betikleri yazar).
   Çalıştırma: node scripts/ses-test.mjs */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { CUMLELER, EN_FAZLA_CUMLE, parcala, KILIT_SOZU } from "../fabricakit/js/ajan-gm/cumleler.js";
import { ACILIS, TALIMAT } from "../fabricakit/js/ajan-gm/yorumlar.js";
import { SES_DOSYALARI_HAZIR, SES_KAYNAGI } from "../fabricakit/js/ajan-gm/ses-dosyalari.js";
import { JSON_YOLU, listeMetni } from "./ses-cumleler.mjs";

const KLASOR = new URL("../assets/ses/ajan-gm/", import.meta.url);
const EN_FAZLA_BAYT = 3 * 1024 * 1024;
const EN_KISA_SN = 0.3;

let hataSayisi = 0;
const hata = (m) => { console.error("✗ " + m); hataSayisi += 1; };

/* Liste */
if (CUMLELER.length > EN_FAZLA_CUMLE) hata(`cümle sayısı ${CUMLELER.length}, en fazla ${EN_FAZLA_CUMLE}`);
const kimlikler = new Set();
for (const c of CUMLELER) {
  if (!/^[a-z0-9-]+$/.test(c.id)) hata(`dosya adına uymayan kimlik: ${c.id}`);
  if (kimlikler.has(c.id)) hata(`yinelenen kimlik: ${c.id}`);
  kimlikler.add(c.id);
  if (!c.metin || !c.metin.trim()) hata(`boş cümle: ${c.id}`);
  for (const d of CUMLELER) if (d !== c && d.metin.includes(c.metin)) hata(`"${c.id}" cümlesi "${d.id}" içinde geçiyor (bölme belirsizleşir)`);
}

/* Bölme: her kalıbın sabit parçası, kalıbın ürettiği metinde bulunur */
const bulunanlar = (metin) => parcala(metin).filter((p) => p.id).map((p) => p.id);
const v = { puan: "77" };
for (const [harf, liste] of Object.entries(ACILIS)) {
  liste.forEach((f, i) => {
    const id = `not-${harf.toLowerCase()}-${i + 1}`;
    if (!bulunanlar(f(v).replace("{hitap}", "Ayşe Hanım")).includes(id)) hata(`harf notu kalıbında sabit parça bulunamadı: ${id}`);
  });
}
for (const [anahtar, liste] of Object.entries(TALIMAT)) {
  liste.forEach((f, i) => {
    const id = `talimat-${anahtar.toLowerCase().replace(/_/g, "-")}-${i + 1}`;
    const ids = bulunanlar(f());
    if (!ids.includes("talimat")) hata(`talimat girişi bulunamadı: ${anahtar}:${i}`);
    if (kimlikler.has(id) && !ids.includes(id)) hata(`talimat bulunamadı: ${id}`);
  });
}
const kilit = parcala(`Ayşe Hanım, ${KILIT_SOZU}`);
if (kilit.length !== 2 || kilit[0].metin !== "Ayşe Hanım," || kilit[1].id !== "kilit") hata(`kilit sözü yanlış bölündü: ${JSON.stringify(kilit)}`);

/* JSON güncel mi */
if (!fs.existsSync(JSON_YOLU) || fs.readFileSync(JSON_YOLU, "utf8") !== listeMetni()) {
  hata("data/ses/cumleler.json listeyle uyuşmuyor: node scripts/ses-cumleler.mjs (sonra sesleri yeniden üretin)");
}

/* Ses dosyaları: ya hiç yok ya da listeyle birebir */
const dosyalar = fs.existsSync(KLASOR) ? fs.readdirSync(KLASOR).filter((d) => !d.startsWith(".")) : [];
let ozet;
if (!dosyalar.length) {
  ozet = "ses dosyası yok (henüz üretilmedi): sabit cümleler de cihaz sesiyle okunur";
  console.warn(`! ${ozet}. Üretmek için: scripts/ses-piper.py ya da Windows'ta scripts/ses-tolga.ps1`);
  if (SES_DOSYALARI_HAZIR) hata("ses-dosyalari.js'te SES_DOSYALARI_HAZIR true ama assets/ses/ajan-gm/ boş");
} else {
  if (!SES_DOSYALARI_HAZIR) hata("ses dosyaları var ama ses-dosyalari.js'te SES_DOSYALARI_HAZIR false (üretim yarıda kalmış olabilir; betiği yeniden çalıştırın)");
  if (!String(SES_KAYNAGI).trim()) hata("ses-dosyalari.js'te SES_KAYNAGI boş: hangi sesle üretildiği yazılmalı");
  const beklenen = new Set(CUMLELER.map((c) => `${c.id}.mp3`));
  for (const d of dosyalar) if (!beklenen.has(d)) hata(`listede olmayan dosya: assets/ses/ajan-gm/${d}`);
  for (const d of beklenen) if (!dosyalar.includes(d)) hata(`eksik ses dosyası: assets/ses/ajan-gm/${d}`);
  let toplam = 0;
  let ffprobe = true;
  for (const d of dosyalar.filter((x) => beklenen.has(x))) {
    const yol = new URL(d, KLASOR);
    const boyut = fs.statSync(yol).size;
    toplam += boyut;
    if (boyut < 1024) hata(`ses dosyası boş ya da çok küçük (${boyut} bayt): ${d}`);
    if (!ffprobe) continue;
    try {
      const bilgi = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_name,channels,bit_rate", "-of", "json", fileURLToPath(yol)], { encoding: "utf8" }));
      const sure = Number(bilgi.format && bilgi.format.duration);
      const akis = (bilgi.streams || [])[0] || {};
      if (!(sure >= EN_KISA_SN)) hata(`ses ${EN_KISA_SN} sn'den kısa (${sure} sn): ${d}`);
      if (akis.codec_name !== "mp3" || akis.channels !== 1) hata(`ses mp3 tek kanal değil (${akis.codec_name}, ${akis.channels} kanal): ${d}`);
      if (Number(akis.bit_rate) > 64000) hata(`ses 64 kbps'den yüksek (${Math.round(Number(akis.bit_rate) / 1000)} kbps): ${d}`);
    } catch (e) {
      if (e.code === "ENOENT") { ffprobe = false; console.warn("! ffprobe yok: süre ve biçim denetimi atlandı"); } else hata(`ffprobe okuyamadı: ${d}`);
    }
  }
  if (toplam > EN_FAZLA_BAYT) hata(`ses dosyaları toplam ${(toplam / 1048576).toFixed(2)} MB, en fazla 3 MB`);
  ozet = `${dosyalar.length} ses dosyası (${SES_KAYNAGI}), toplam ${(toplam / 1048576).toFixed(2)} MB`;
}

if (hataSayisi) { console.error(`\n${hataSayisi} sorun bulundu.`); process.exit(1); }
console.log(`✓ ses-test: ${CUMLELER.length} cümle, liste ve JSON eşleşiyor; ${ozet}.`);
