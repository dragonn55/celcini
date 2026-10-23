/* Tek durum nesnesi (store). Oyunun her değişikliği gonder() → uygula() yolundan geçer.
   Gün başı kopyası (gunBasi) "Günü baştan oyna" için tutulur. */
import { yeniOyun, uygula } from "./oyun.js";
import { kopya } from "./kayit.js";

export function olusturStore(baslangic = null) {
  let durum = baslangic ? baslangic.durum : yeniOyun();
  let gunBasi = baslangic && baslangic.gunBasi ? baslangic.gunBasi : kopya(durum);
  const aboneler = new Set();
  const haber = (eylem, sonuc) => {
    for (const f of aboneler) f(durum, eylem, sonuc);
  };

  return {
    get durum() { return durum; },
    get gunBasi() { return gunBasi; },
    gonder(eylem) {
      let sonuc = {};
      if (eylem.tip === "YENI_OYUN") {
        durum = yeniOyun();
        gunBasi = kopya(durum);
      } else if (eylem.tip === "GUNU_TEKRARLA") {
        durum = kopya(gunBasi);
      } else {
        sonuc = uygula(durum, eylem) || {};
        if (sonuc.yeniGun) gunBasi = kopya(durum);
      }
      haber(eylem, sonuc);
      return sonuc;
    },
    abone(f) {
      aboneler.add(f);
      return () => aboneler.delete(f);
    },
  };
}
