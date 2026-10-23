/* Üretim (Mars): iki hat dakika dakika plana göre çalışır. Birime başlarken ürün ağacındaki malzemeler
   stoktan düşer; malzeme yoksa hat durur. Makine duruşu ve yeniden işleme hattı durdurur.
   İkinci vardiya gün kapanınca 8 saat daha çalışır: önce bugünün kalanı, sonra yarının planı. */
import { AYARLAR } from "../ayarlar.js";
import { URUN, MALZEME, HAT, HAT_IDLER, hatUrunleri } from "../veri/katalog.js";
import { simdi } from "./zaman.js";
import { kalanPlan, hatVerimi } from "./mrp.js";
import { puanEkle } from "./puan.js";
import { bildir } from "./ortak.js";

function eksikMalzeme(durum, urun) {
  for (const [m, adet] of Object.entries(durum.urunAgaci[urun])) if (durum.stok[m] < adet) return m;
  return null;
}

function tuket(durum, urun) {
  for (const [m, adet] of Object.entries(durum.urunAgaci[urun])) durum.stok[m] -= adet;
}

/* Hattın bu dakikası. gunler: plan günleri (sırayla); gece: ikinci vardiya (duruş ve ceza sayılmaz) */
function hatDakikasi(durum, hatId, gunler, gece) {
  const h = durum.hatlar[hatId];
  const isVar = () => gunler.some((g) => hatUrunleri(hatId).some((u) => kalanPlan(durum, u, g) > 0));
  if (!gece && simdi(durum) < h.durusSonDk) {
    if (h.aktif || isVar()) h.durusDk += 1;
    return;
  }
  if (!h.aktif) {
    let eksik = null;
    let bekleyen = false;
    dongu: for (const g of gunler) {
      for (const u of hatUrunleri(hatId)) {
        if (kalanPlan(durum, u, g) <= 0) continue;
        bekleyen = true;
        const m = eksikMalzeme(durum, u);
        if (m) { eksik = eksik || m; continue; }
        tuket(durum, u);
        h.aktif = { urun: u, gun: g, kalanIs: URUN[u].dakika };
        break dongu;
      }
    }
    const onceki = h.eksik;
    h.eksik = h.aktif ? null : eksik;
    if (h.eksik !== onceki) durum.degisim += 1;
    if (!h.aktif) {
      if (bekleyen && !gece) {
        h.durusDk += 1;
        const anahtar = `${hatId}:${eksik}`;
        if (!h.cezalar[anahtar]) {
          h.cezalar[anahtar] = true;
          puanEkle(durum, "MALZEME_BITTI", `Hatta malzeme bitti: ${HAT[hatId].ad} · ${MALZEME[eksik].ad}`);
          bildir(durum, "uretim", `Üretim: ${HAT[hatId].ad} durdu, ${MALZEME[eksik].ad} bitti.`, "acil");
        }
      }
      return;
    }
  }
  h.aktif.kalanIs -= hatVerimi(durum, hatId, durum.gun);
  if (!gece) h.calisanDk += 1;
  if (h.aktif.kalanIs <= 1e-9) {
    const { urun, gun } = h.aktif;
    durum.uretilen[gun] = durum.uretilen[gun] || {};
    durum.uretilen[gun][urun] = (durum.uretilen[gun][urun] || 0) + 1;
    durum.mamul[urun] += 1;
    if (!gece) durum.gunUretim[urun] = (durum.gunUretim[urun] || 0) + 1;
    h.aktif = null;
    durum.degisim += 1;
  }
}

export function uretimDakikasi(durum) {
  for (const hatId of HAT_IDLER) hatDakikasi(durum, hatId, [durum.gun], false);
}

/* Gün kapanınca: ikinci vardiyası açık hatlar 8 saat daha çalışır (bugünün kalanı, sonra yarının planı) */
export function ikinciVardiya(durum) {
  const sonuc = {};
  for (const hatId of HAT_IDLER) {
    if (!durum.hatlar[hatId].ikinciVardiya) continue;
    const once = { ...durum.mamul };
    for (let i = 0; i < AYARLAR.IKINCI_VARDIYA.dakika; i++) hatDakikasi(durum, hatId, [durum.gun, durum.gun + 1], true);
    sonuc[hatId] = Object.fromEntries(hatUrunleri(hatId).map((u) => [u, durum.mamul[u] - once[u]]));
  }
  return sonuc;
}

/* Hattın şu anki hâli (arayüz ve oda ışığı için) */
export function hatHali(durum, hatId) {
  const h = durum.hatlar[hatId];
  const kalanDurus = h.durusSonDk - simdi(durum);
  if (durum.evre === "oyun" && kalanDurus > 0) return { tur: "durus", neden: h.durusNeden, kalanDk: kalanDurus };
  if (h.aktif) return { tur: "calisiyor", urun: h.aktif.urun };
  if (h.eksik) return { tur: "malzeme", malzeme: h.eksik };
  return { tur: "bos" };
}
