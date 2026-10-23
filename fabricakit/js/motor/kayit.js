/* Kayıt: durum JSON olarak saklanır, sürüm alanıyla. Sürüm uymuyorsa ya da kayıt bozuksa okunmaz;
   arayüz oyunu sıfırlar ve oyuncuya söyler. Kayıt yalnızca tarayıcıda (localStorage) tutulur. */
import { AYARLAR } from "../ayarlar.js";

export function kaydaYaz({ durum, gunBasi }) {
  return JSON.stringify({ surum: AYARLAR.KAYIT_SURUMU, durum, gunBasi });
}

/* → { tamam: true, durum, gunBasi } | { tamam: false, neden: "yok" | "surum" | "bozuk" } */
export function kayittanOku(metin) {
  if (!metin) return { tamam: false, neden: "yok" };
  let veri;
  try {
    veri = JSON.parse(metin);
  } catch {
    return { tamam: false, neden: "bozuk" };
  }
  if (!veri || typeof veri !== "object") return { tamam: false, neden: "bozuk" };
  if (veri.surum !== AYARLAR.KAYIT_SURUMU) return { tamam: false, neden: "surum" };
  if (!veri.durum || typeof veri.durum.gun !== "number" || !Array.isArray(veri.durum.siparisler)) return { tamam: false, neden: "bozuk" };
  return { tamam: true, durum: veri.durum, gunBasi: veri.gunBasi || null };
}

export const kopya = (x) => JSON.parse(JSON.stringify(x));
