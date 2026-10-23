/* Puan: her gün 100'den başlar; defterdeki her kayıt ayarlar.js'deki PUAN değerini ekler ya da düşer.
   Gösterilen puan ALT–UST aralığında tutulur. */
import { AYARLAR } from "../ayarlar.js";
import { simdi } from "./zaman.js";

const P = AYARLAR.PUAN;

export const PUAN_TURU_ADI = {
  GEC_TESLIM: "Geç teslim",
  UNUTULAN_ONAY: "Unutulan onay",
  MALZEME_BITTI: "Hatta malzeme bitti",
  BUTCE_ASIMI: "Bütçe aşımı",
  FAZLA_SIPARIS: "Gereksiz fazla sipariş",
  UNUTULAN_IS: "Unutulan iş",
  ZAMANINDA_PLAN: "Zamanında plan",
  ZAMANINDA_TESLIM: "Zamanında teslim",
};

export const yeniPuan = () => ({ deger: P.BASLANGIC, defter: [] });
export const sinirla = (n) => Math.max(P.ALT, Math.min(P.UST, n));

export function puanEkle(durum, tur, metin) {
  durum.puan.defter.push({ dk: simdi(durum), tur, puan: P[tur], metin });
  durum.puan.deger = sinirla(P.BASLANGIC + durum.puan.defter.reduce((t, k) => t + k.puan, 0));
  durum.degisim += 1;
}

export function harfNotu(puan) {
  for (const h of AYARLAR.HARF_NOTU) if (puan >= h.alt) return h.harf;
  return AYARLAR.HARF_NOTU[AYARLAR.HARF_NOTU.length - 1].harf;
}

/* Türlere göre toplam: { GEC_TESLIM: { adet, puan }, ... } */
export function puanOzeti(defter) {
  const ozet = {};
  for (const k of defter) {
    const o = (ozet[k.tur] = ozet[k.tur] || { adet: 0, puan: 0 });
    o.adet += 1;
    o.puan += k.puan;
  }
  return ozet;
}
