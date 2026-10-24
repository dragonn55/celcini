/* api/ ortak yardımcıları ("_" ile başladığı için Vercel bunu fonksiyon yapmaz).
   Erişim kodu: SHA-256'sı ortam değişkenindeki (virgülle ayrılmış) listeyle karşılaştırılır. Varsayılan liste Fabricakit'in
   ERISIM_KOD_HASHLERI'dir; rehberli dersler kendi listesini verir (api/ders.js: DATAKIT_KOD_HASHLERI).
   Kod hiçbir yerde saklanmaz ve günlüğe yazılmaz. scripts/kod-hash.mjs de aynı normalleştirmeyi kullanır. */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/* Büyük-küçük harf, boşluk ve tire fark etmez: "abcd-efgh-jklm" = "ABCDEFGHJKLM" */
function normalKod(kod) {
  return String(kod || "").normalize("NFKC").replace(/[ıİ]/g, "I").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function kodHash(kod) {
  return crypto.createHash("sha256").update(normalKod(kod), "utf8").digest("hex");
}

function hashListesi(degisken = "ERISIM_KOD_HASHLERI") {
  return String(process.env[degisken] || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[0-9a-f]{64}$/.test(s));
}

function kodGecerli(kod, degisken = "ERISIM_KOD_HASHLERI") {
  const n = normalKod(kod);
  if (n.length < 6 || n.length > 64) return false;
  const h = Buffer.from(kodHash(kod), "hex");
  let bulundu = false;
  for (const x of hashListesi(degisken)) if (crypto.timingSafeEqual(Buffer.from(x, "hex"), h)) bulundu = true;
  return bulundu;
}

/* Oyun dosyaları tek kaynaktır: fabricakit/js/ayarlar.js ve odalar.js (vercel.json → functions.includeFiles).
   Dosya okunamazsa en güvenli değerler kullanılır: kural modu (yapay zeka kapalı). */
function oyunDosyasi(ad) {
  for (const yol of [path.join(process.cwd(), "fabricakit/js", ad), path.join(__dirname, "..", "fabricakit/js", ad)]) {
    try { return fs.readFileSync(yol, "utf8"); } catch { /* sonrakini dene */ }
  }
  return "";
}

function ayarlar() {
  const metin = oyunDosyasi("ayarlar.js");
  const metinAl = (ad, varsayilan) => {
    const m = metin.match(new RegExp(`${ad}\\s*:\\s*["']([^"']*)["']`));
    return m ? m[1] : varsayilan;
  };
  const sayiAl = (ad, varsayilan) => {
    const m = metin.match(new RegExp(`${ad}\\s*:\\s*(\\d+)`));
    return m ? Number(m[1]) : varsayilan;
  };
  return {
    kaynak: metinAl("AJAN_GM_KAYNAK", "kural"),
    kime: metinAl("AJAN_GM_YAPAY_ZEKA_KIME", "kodlu"),
    soruUzunlugu: sayiAl("AJAN_GM_SORU_UZUNLUGU", 200),
  };
}

/* Fabrika ve dokuz oda: kod adı boşsa Ajan GM o odayı gerçek adıyla söyler */
function odalar() {
  const metin = oyunDosyasi("odalar.js");
  const f = metin.match(/FABRIKA\s*=\s*\{\s*kod:\s*"([^"]*)",\s*ad:\s*"([^"]*)"/);
  const liste = [...metin.matchAll(/\{\s*id:\s*"([^"]+)",\s*kod:\s*"([^"]*)",\s*ad:\s*"([^"]+)"/g)]
    .map((m) => ({ id: m[1], kod: m[2], ad: m[3] }));
  return { fabrika: f ? { kod: f[1], ad: f[2] } : null, odalar: liste };
}

/* İstek gövdesi: Vercel JSON'u req.body'ye ayrıştırır; ayrıştırılmamışsa metinden dene */
function govde(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

const bekle = (ms) => new Promise((coz) => setTimeout(coz, ms));

module.exports = { normalKod, kodHash, hashListesi, kodGecerli, ayarlar, odalar, govde, bekle };
