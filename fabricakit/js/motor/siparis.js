/* Sipariş defteri (Satış-Pazarlama): açık satırlar, mamulün satırlara ayrılması, gün sonu sevkiyatı. */
import { URUN } from "../veri/katalog.js";
import { sayi } from "../bicim.js";
import { puanEkle } from "./puan.js";
import { kimlikSirasi } from "./ortak.js";

export const acikSatirlar = (durum) => durum.siparisler.filter((s) => s.durum === "acik");
export const teslimSirasi = (a, b) => a.gun - b.gun || kimlikSirasi(a, b);
export const urunAdi = (urun) => URUN[urun].ad.toLocaleLowerCase("tr");
export const satirMetni = (s) => `${s.musteri} · ${sayi(s.miktar)} ${urunAdi(s.urun)}`;

/* Depodaki (ve hatta yapılmakta olan) mamul, teslim sırasına göre satırlara ayrılır;
   her satır için üretilmesi gereken eksik miktar döner. */
export function netIhtiyac(durum) {
  const hazir = { ...durum.mamul };
  for (const h of Object.values(durum.hatlar)) if (h.aktif) hazir[h.aktif.urun] += 1;
  return acikSatirlar(durum).sort(teslimSirasi).map((s) => {
    const ayrilan = Math.min(hazir[s.urun], s.miktar);
    hazir[s.urun] -= ayrilan;
    return { satir: s, eksik: s.miktar - ayrilan };
  });
}

/* Gün sonu sevkiyatı (18:00): teslim günü gelmiş açık satırlar, önce en eski teslim, mamul yetiyorsa sevk edilir.
   Satır bölünmez. Bugün teslim edilemeyen satır gecikmiş sayılır. */
export function sevkiyat(durum) {
  const bugun = durum.gun;
  const sonuc = { zamaninda: 0, toplam: 0, gecSevk: 0, gecKalan: [] };
  const satirlar = acikSatirlar(durum).filter((s) => s.gun <= bugun).sort(teslimSirasi);
  for (const s of satirlar) {
    const bugunku = s.gun === bugun;
    if (bugunku) sonuc.toplam += 1;
    if (durum.mamul[s.urun] >= s.miktar) {
      durum.mamul[s.urun] -= s.miktar;
      s.durum = "sevk";
      s.sevkGun = bugun;
      if (bugunku) {
        sonuc.zamaninda += 1;
        puanEkle(durum, "ZAMANINDA_TESLIM", `Zamanında teslim: ${satirMetni(s)}`);
      } else sonuc.gecSevk += 1;
    } else if (bugunku) {
      s.gec = true;
      sonuc.gecKalan.push(s.id);
      puanEkle(durum, "GEC_TESLIM", `Geç teslim: ${satirMetni(s)}`);
    }
  }
  return sonuc;
}
