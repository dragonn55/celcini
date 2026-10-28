/* Mülakat Testi: raporun kilitli metinleri (Vercel sunucusuz işlevi).
   GET  /api/mulakat/          → { satista }   (MULAKAT_KOD_HASHLERI tanımlı mı)
   POST /api/mulakat/ { kod }  → { satista, gecerli, sorular? }   sorular: [{ no, olcer, ornek, not?, yorumlar[4] }]
   Kod listesi ürüne özel: MULAKAT_KOD_HASHLERI (Fabricakit, Datakit ya da Motor kodu bunu açmaz).
   Metinler api/_mulakat/kilitli.json'dadır: scripts/derle.py yazar, vercel.json includeFiles ile işleve eklenir;
   api/ altı statik yayınlanmaz. Kod saklanmaz, günlüğe yazılmaz. Testin cevapları bu işleve hiç gelmez. */
const fs = require("fs");
const path = require("path");
const { hashListesi, kodGecerli, govde, bekle } = require("./_ortak.js");

const LISTE = "MULAKAT_KOD_HASHLERI";

function kilitliOku() {
  for (const kok of [path.join(__dirname, "_mulakat"), path.join(process.cwd(), "api", "_mulakat")]) {
    try { return JSON.parse(fs.readFileSync(path.join(kok, "kilitli.json"), "utf8")); } catch { /* sonrakini dene */ }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ hata: "Yalnızca GET ve POST." });
  }
  const satista = hashListesi(LISTE).length > 0;
  if (req.method === "GET") return res.status(200).json({ satista });
  if (!satista) return res.status(200).json({ satista: false, gecerli: false });
  const g = govde(req);
  const gecerli = typeof g.kod === "string" && kodGecerli(g.kod, LISTE);
  if (!gecerli) {
    await bekle(400); /* deneme-yanılmayı yavaşlatır */
    return res.status(200).json({ satista: true, gecerli: false });
  }
  const veri = kilitliOku();
  if (!veri || !Array.isArray(veri.sorular)) return res.status(500).json({ satista: true, gecerli: true, hata: "Rapor metinleri okunamadı." });
  return res.status(200).json({ satista: true, gecerli: true, surum: veri.surum, sorular: veri.sorular });
};
