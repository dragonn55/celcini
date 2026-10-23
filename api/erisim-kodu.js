/* Fabricakit erişim kodu doğrulama (Vercel sunucusuz işlevi).
   GET  /api/erisim-kodu        → { satista }   (ERISIM_KOD_HASHLERI tanımlı mı)
   POST /api/erisim-kodu {kod}  → { satista, gecerli }
   Kodun SHA-256'sı ERISIM_KOD_HASHLERI listesiyle karşılaştırılır. Kod saklanmaz, günlüğe yazılmaz. */
const { hashListesi, kodGecerli, govde, bekle } = require("./_ortak.js");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const satista = hashListesi().length > 0;
  if (req.method === "GET") return res.status(200).json({ satista });
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ hata: "Yalnızca GET ve POST." });
  }
  if (!satista) return res.status(200).json({ satista: false, gecerli: false });
  const kod = govde(req).kod;
  const gecerli = typeof kod === "string" && kodGecerli(kod);
  if (!gecerli) await bekle(400); /* deneme-yanılmayı yavaşlatır */
  return res.status(200).json({ satista: true, gecerli });
};
