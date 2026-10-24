/* Rehberli dersler: kilitli dersin notları, sorusu ve Excel sayfası (Vercel sunucusuz işlevi).
   GET  /api/ders/?urun=datakit         → { satista }   (o ürünün kod listesi tanımlı mı)
   POST /api/ders/ { urun, id, kod }    → { satista, gecerli, ders? }
   Ürün başına ayrı kod listesi: datakit → DATAKIT_KOD_HASHLERI, motor → MOTOR_KOD_HASHLERI (Fabricakit'in
   ERISIM_KOD_HASHLERI'nden ayrı; bir ürünün kodu ötekini açmaz).
   Ders dosyaları api/_dersler/<urun>/<id>.json'dadır: scripts/derle.py yazar, vercel.json includeFiles ile işleve
   eklenir; api/ altı statik yayınlanmaz. Kod saklanmaz, günlüğe yazılmaz. */
const fs = require("fs");
const path = require("path");
const { hashListesi, kodGecerli, govde, bekle } = require("./_ortak.js");

const KOD_LISTESI = { datakit: "DATAKIT_KOD_HASHLERI", motor: "MOTOR_KOD_HASHLERI" };

function dersOku(urun, id) {
  if (!/^[a-z0-9-]{1,40}$/.test(id)) return null;
  for (const kok of [path.join(__dirname, "_dersler"), path.join(process.cwd(), "api", "_dersler")]) {
    try { return JSON.parse(fs.readFileSync(path.join(kok, urun, `${id}.json`), "utf8")); } catch { /* sonrakini dene */ }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ hata: "Yalnızca GET ve POST." });
  }
  const g = req.method === "POST" ? govde(req) : (req.query || {});
  const urun = typeof g.urun === "string" && Object.prototype.hasOwnProperty.call(KOD_LISTESI, g.urun) ? g.urun : null;
  if (!urun) return res.status(400).json({ hata: "Geçersiz ürün." });
  const liste = KOD_LISTESI[urun];
  const satista = hashListesi(liste).length > 0;
  if (req.method === "GET") return res.status(200).json({ satista });
  if (!satista) return res.status(200).json({ satista: false, gecerli: false });
  const gecerli = typeof g.kod === "string" && kodGecerli(g.kod, liste);
  if (!gecerli) {
    await bekle(400); /* deneme-yanılmayı yavaşlatır */
    return res.status(200).json({ satista: true, gecerli: false });
  }
  const ders = typeof g.id === "string" ? dersOku(urun, g.id) : null;
  if (!ders) return res.status(404).json({ satista: true, gecerli: true, hata: "Ders bulunamadı." });
  return res.status(200).json({ satista: true, gecerli: true, ders });
};
