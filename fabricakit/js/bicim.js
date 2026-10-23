/* Sayı, para, saat ve süre biçimleri (Türkçe). Motor, Ajan GM ve arayüz ortak kullanır. */

export const sayi = (n) => Math.round(n).toLocaleString("tr-TR");
export const tl = (n) => `${sayi(n)} TL`;
export const ondalik = (n, basamak = 1) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: basamak });
export const yuzde = (n) => `%${Math.round(n)}`;

const iki = (n) => String(n).padStart(2, "0");
/* Günün dakikası → "09:05" */
export const saat = (dk) => `${iki(Math.floor(dk / 60) % 24)}:${iki(dk % 60)}`;

/* Süre (dakika) → "1 sa 20 dk", "45 dk" */
export function sure(dk) {
  const d = Math.max(0, Math.round(dk));
  if (d < 60) return `${d} dk`;
  const s = Math.floor(d / 60);
  return d % 60 ? `${s} sa ${d % 60} dk` : `${s} sa`;
}

/* Geri sayım → "1:05" (saat:dakika) */
export const geriSayim = (dk) => `${Math.floor(Math.max(0, dk) / 60)}:${iki(Math.max(0, dk) % 60)}`;

export const gunAdi = (gun) => `${gun}. gün`;

/* Bugüne göre göreli gün: "bugün", "yarın", "3 gün sonra", "2 gün önce" */
export function goreli(gun, bugun) {
  const f = gun - bugun;
  if (f === 0) return "bugün";
  if (f === 1) return "yarın";
  if (f === -1) return "dün";
  return f > 0 ? `${f} gün sonra` : `${-f} gün önce`;
}

/* Özel ada Türkçe hâl eki: ek("Mars", "de") → "Mars'ta", ek("Dünya", "e") → "Dünya'ya",
   ek("İnsan Kaynakları", "de") → "İnsan Kaynakları'nda". tur: "e" | "de" | "deki" | "den" */
const UNLU = "aeıioöuü";
export function ek(ad, tur) {
  const k = ad.toLocaleLowerCase("tr");
  const unluler = [...k].filter((c) => UNLU.includes(c));
  const kalin = "aıou".includes(unluler[unluler.length - 1] || "e");
  const son = k[k.length - 1];
  const unluyleBiter = UNLU.includes(son);
  const sert = "fstkçşhp".includes(son);
  const tamlama = /(ları|leri)$/.test(k);
  const a = kalin ? "a" : "e";
  const d = sert ? "t" : "d";
  let e;
  if (tur === "e") e = tamlama ? `n${a}` : unluyleBiter ? `y${a}` : a;
  else if (tur === "den") e = `${tamlama ? "n" : ""}${d}${a}n`;
  else e = `${tamlama ? "n" : ""}${d}${a}${tur === "deki" ? "ki" : ""}`;
  return `${ad}'${e}`;
}
