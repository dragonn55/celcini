/* Gün sonu karnesi. Her sayı o günün gerçek durumundan gelir; bölme sıfırsa sayı yerine null döner (NaN olmaz). */
import { AYARLAR } from "../ayarlar.js";
import { MALZEME, URUN, HAT_IDLER } from "../veri/katalog.js";
import { harfNotu, puanOzeti } from "./puan.js";

const birOndalik = (n) => Math.round(n * 10) / 10;

export function bagliPara(durum) {
  let t = 0;
  for (const m of AYARLAR.MALZEMELER) t += durum.stok[m.id] * m.fiyat;
  for (const u of AYARLAR.URUNLER) t += durum.mamul[u.id] * u.maliyet;
  return Math.round(t);
}

export function karneOlustur(durum, { sevk, gece, unutulanMalzemeler }) {
  const ozet = puanOzeti(durum.puan.defter);
  const durusHat = Object.fromEntries(HAT_IDLER.map((h) => [h, birOndalik(durum.hatlar[h].durusDk / 60)]));
  const unutulan = durum.puan.defter.filter((k) => k.tur === "UNUTULAN_IS" || k.tur === "UNUTULAN_ONAY");
  const olumsuz = Object.entries(ozet).filter(([, o]) => o.puan < 0).sort((a, b) => a[1].puan - b[1].puan);
  const bugunSiparis = durum.satinalma.filter((s) => s.gun === durum.gun && !s.oncedenVerilmis);
  return {
    gun: durum.gun,
    puan: durum.puan.deger,
    harf: harfNotu(durum.puan.deger),
    teslim: {
      zamaninda: sevk.zamaninda,
      toplam: sevk.toplam,
      yuzde: sevk.toplam ? Math.round((100 * sevk.zamaninda) / sevk.toplam) : null,
      gecSevk: sevk.gecSevk,
      gecKalan: sevk.gecKalan.length,
    },
    durus: { saat: birOndalik(HAT_IDLER.reduce((t, h) => t + durum.hatlar[h].durusDk, 0) / 60), hatlar: durusHat },
    bagliPara: bagliPara(durum),
    unutulan: { sayi: unutulan.length, liste: unutulan.map((k) => k.metin) },
    unutulanMalzemeler: unutulanMalzemeler || [],
    harcama: { harcanan: durum.butce.harcanan, limit: durum.butce.limit },
    uretim: Object.fromEntries(Object.keys(URUN).map((u) => [u, durum.gunUretim[u] || 0])),
    gece,
    planDk: durum.gunPlanDk,
    satinAlma: {
      verilen: bugunSiparis.length,
      onaylanan: bugunSiparis.filter((s) => ["onaylandi", "kapida", "teslim"].includes(s.durum)).length,
      dusen: bugunSiparis.filter((s) => s.durum === "dustu").length,
      fazla: bugunSiparis.filter((s) => s.fazla).length,
    },
    teslimAlinan: durum.satinalma.filter((s) => s.teslimDk != null && Math.floor(s.teslimDk / 1440) + 1 === durum.gun).length,
    ozet,
    enBuyukSorun: olumsuz.length ? { tur: olumsuz[0][0], adet: olumsuz[0][1].adet, puan: olumsuz[0][1].puan } : null,
    defter: durum.puan.defter.map((k) => ({ ...k })),
    olaylar: durum.olayKaydi.map((o) => ({ ...o })),
    malzemeAdi: Object.fromEntries(Object.values(MALZEME).map((m) => [m.id, m.ad])),
  };
}
