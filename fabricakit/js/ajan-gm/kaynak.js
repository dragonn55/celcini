/* Ajan GM · kaynak seçimi. AJAN_GM_KAYNAK "kural"sa her şey şablonlardan gelir; sunucuya istek gitmez.
   "yapay-zeka"da günün yorumu ve serbest soru /api/ajan-gm/ işlevine gider. Yanıt gelmezse, süre dolarsa
   ya da sunucu "kural" derse null döner ve arayüz sessizce şablonlara düşer.
   Sunucuya yalnızca günün karnesi, soru ve ("kodlu" modda) erişim kodu gider; hitap gitmez. */
import { AYARLAR } from "../ayarlar.js";

export function yapayZekaAcik(erisim) {
  if (AYARLAR.AJAN_GM_KAYNAK !== "yapay-zeka") return false;
  if (AYARLAR.AJAN_GM_YAPAY_ZEKA_KIME === "herkes") return true;
  return Boolean(erisim && erisim.acik && erisim.kod);
}

async function iste(govde, erisim) {
  if (!yapayZekaAcik(erisim)) return null;
  if (AYARLAR.AJAN_GM_YAPAY_ZEKA_KIME !== "herkes") govde.kod = erisim.kod;
  const kontrol = new AbortController();
  const zaman = setTimeout(() => kontrol.abort(), AYARLAR.AJAN_GM_ZAMAN_ASIMI_MS);
  try {
    const yanit = await fetch("/api/ajan-gm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(govde),
      signal: kontrol.signal,
    });
    if (!yanit.ok) return null;
    const veri = await yanit.json();
    return veri && veri.kaynak === "yapay-zeka" && typeof veri.metin === "string" && veri.metin.includes("{hitap}") ? veri.metin : null;
  } catch {
    return null;
  } finally {
    clearTimeout(zaman);
  }
}

/* Günün yorumu: {hitap} yer tutuculu metin ya da null (şablon kullanılır) */
export function gmYorumuIste(karne, erisim) {
  return iste({ tur: "yorum", karne }, erisim);
}

/* Serbest soru: hitap soruda geçiyorsa {hitap} yapılır, böylece sunucuya gitmez */
export function soruyuHazirla(soru, hitap) {
  let s = String(soru || "").replace(/\s+/g, " ").trim().slice(0, AYARLAR.AJAN_GM_SORU_UZUNLUGU);
  const h = String(hitap || "").trim();
  if (h) s = s.replace(new RegExp(h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), "{hitap}");
  return s;
}

export function gmCevabiIste(karne, soru, erisim) {
  return iste({ tur: "soru", karne, soru }, erisim);
}
