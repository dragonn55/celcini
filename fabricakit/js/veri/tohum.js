/* Tohumlu rastgelelik. Akış durumu tek bir 32 bitlik sayıdır ({ s }) ve oyun durumunun içinde saklanır;
   böylece kaydedip yükleyince aynı dizi kaldığı yerden devam eder. Aynı tohum → aynı sonuç. */

/* Sayı ve metinlerden 32 bitlik tohum üretir (FNV-1a). */
export function karistir(...parcalar) {
  let h = 2166136261 >>> 0;
  for (const p of parcalar) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= 0x7c;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function akis(tohum) {
  return { s: tohum >>> 0 };
}

/* mulberry32: akışı bir adım ilerletir, [0, 1) döndürür */
export function rastgele(a) {
  a.s = (a.s + 0x6d2b79f5) >>> 0;
  let t = a.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const tamSayi = (a, alt, ust) => alt + Math.floor(rastgele(a) * (ust - alt + 1));
export const aralik = (a, alt, ust) => alt + rastgele(a) * (ust - alt);
export const sec = (a, liste) => liste[Math.floor(rastgele(a) * liste.length)];

export function karisik(a, liste) {
  const l = liste.slice();
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(rastgele(a) * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

/* Tek seferlik sayı: tohum ve anahtarlardan doğrudan [0, 1) (akış tutmadan) */
export function tekSefer(...parcalar) {
  return rastgele(akis(karistir(...parcalar)));
}
