/* Oyun: başlangıç durumu, gün başı ve bütün eylemlerin tek giriş noktası (uygula).
   Motor arayüzden bağımsızdır; Node'da da aynı şekilde çalışır (scripts/sim-test.mjs). */
import { AYARLAR } from "../ayarlar.js";
import { HAT, HAT_IDLER, birimFiyat, tedarikSuresi } from "../veri/katalog.js";
import { akis } from "../veri/tohum.js";
import { ilkDefter, geceDegisimi, gunOlaylari, baslangicStoku, baslangicMamulu } from "../veri/uretec.js";
import { saat, tl } from "../bicim.js";
import { GUN_BASI, gunAyari, sonGun } from "./zaman.js";
import { yeniPuan, puanEkle } from "./puan.js";
import { bildir, yeniId } from "./ortak.js";
import { acikSatirlar } from "./siparis.js";
import { planla } from "./mrp.js";
import { siparisVer, onayAl, teslimAl, harca, iade } from "./satinalma.js";
import { kararVer } from "./olaylar.js";
import { ilerle, hizliBitir } from "./sayac.js";

const yeniHat = () => ({
  verim: 1, verimSonGun: 0, durusSonDk: 0, durusNeden: "", aktif: null, eksik: null,
  durusDk: 0, calisanDk: 0, cezalar: {}, ikinciVardiya: false,
});

/* 1. günün sabahı: sipariş defteri, başlangıç stoku, depodaki mamul ve yoldaki siparişler tohumdan gelir */
export function yeniOyun() {
  const durum = {
    surum: AYARLAR.KAYIT_SURUMU,
    gun: 1, dk: GUN_BASI, evre: "oyun", bitirDk: null,
    rng: akis(gunAyari(1).tohum), degisim: 0, sonId: 0,
    musteriler: [], siparisler: [], mamul: {}, stok: {}, sabahStok: {},
    urunAgaci: JSON.parse(JSON.stringify(AYARLAR.URUN_AGACI)), agacDegisiklikleri: [],
    plan: {}, uretilen: {}, planBilgi: { guncel: false, dk: null, gecKalacak: [] },
    hatlar: Object.fromEntries(HAT_IDLER.map((h) => [h, yeniHat()])),
    satinalma: [], butce: { limit: AYARLAR.GUNLUK_BUTCE, harcanan: 0 },
    olayPlani: [], olayKaydi: [], kararlar: [], gunluk: [], gorulen: {},
    puan: yeniPuan(), gorev: {}, gunUretim: {}, gunPlanDk: null, karne: null, gecmis: [], gmKullanilan: [],
  };
  const defter = ilkDefter(durum.rng, (onek) => yeniId(durum, onek));
  durum.musteriler = defter.musteriler;
  durum.siparisler = defter.satirlar;
  durum.mamul = baslangicMamulu(defter.satirlar);
  /* Referans plan: siparişler 08:00'de plana alınsaydı günlük malzeme tüketimi ne olurdu? Stok buna göre kurulur. */
  planla(durum);
  const tuketim = Array.from({ length: AYARLAR.UFUK_GUN }, (_, i) => {
    const t = {};
    for (const [u, adet] of Object.entries(durum.plan[i + 1] || {})) {
      for (const [m, birim] of Object.entries(durum.urunAgaci[u])) t[m] = (t[m] || 0) + adet * birim;
    }
    return t;
  });
  durum.plan = {};
  durum.planBilgi = { guncel: false, dk: null, gecKalacak: [] };
  const { stok, yoldaki } = baslangicStoku(tuketim);
  durum.stok = stok;
  for (const y of yoldaki) {
    durum.satinalma.push({
      id: yeniId(durum, "S"), malzeme: y.malzeme, tedarikci: y.tedarikci, miktar: y.miktar,
      tutar: y.miktar * birimFiyat(y.malzeme, y.tedarikci), gun: y.gelecegiGun - tedarikSuresi(y.malzeme, y.tedarikci),
      dk: GUN_BASI, durum: "onaylandi", yanitDk: 0, kalanDk: 0, varisGun: y.gelecegiGun,
      varisDk: Math.round(y.saat * 60), kapidaDk: null, teslimDk: null, oncedenVerilmis: true,
    });
  }
  gunuBaslat(durum);
  return durum;
}

/* Gün başı (08:00): günlük sayaçlar sıfırlanır, gece sipariş değişimi uygulanır, günün olayları çekilir */
function gunuBaslat(durum) {
  const ayar = gunAyari(durum.gun);
  if (durum.gun > 1) durum.rng = akis(ayar.tohum);
  Object.assign(durum, {
    dk: GUN_BASI, evre: "oyun", bitirDk: null, karne: null,
    butce: { limit: AYARLAR.GUNLUK_BUTCE, harcanan: 0 }, puan: yeniPuan(),
    gorev: { plana: false, ihtiyac: false, siparis: false, onay: false, teslim: false },
    gunUretim: {}, gunPlanDk: null, olayKaydi: [], gunluk: [], gorulen: {},
  });
  for (const h of Object.values(durum.hatlar)) {
    Object.assign(h, { durusDk: 0, calisanDk: 0, cezalar: {}, ikinciVardiya: false, eksik: null });
    if (h.verimSonGun < durum.gun) h.verim = 1;
  }
  durum.kararlar = durum.kararlar.filter((k) => k.durum === "bekliyor");
  let degisim = null;
  if (durum.gun > 1) degisim = geceDegisimi(durum.rng, durum, ayar, (onek) => yeniId(durum, onek));
  durum.olayPlani = gunOlaylari(durum.rng, durum.gun, ayar, durum.olayPlani.map((o) => o.tur));
  durum.planBilgi = { ...durum.planBilgi, guncel: false };
  durum.sabahStok = { ...durum.stok };
  const acik = acikSatirlar(durum);
  bildir(durum, "satis", degisim
    ? `Satış-Pazarlama: sipariş geldi — gece ${degisim.degisen} satır değişti, ${degisim.yeni} yeni satır var. Açık satır: ${acik.length}.`
    : `Satış-Pazarlama: sipariş geldi — ${durum.musteriler.length} müşteri, ${acik.length} satır, ${AYARLAR.UFUK_GUN} günlük ufuk.`, "dikkat");
}

/* Bütün değişiklikler buradan geçer. Dönüş: { hata } ya da eyleme özgü sonuç */
export function uygula(durum, eylem) {
  const oyunda = durum.evre === "oyun";
  switch (eylem.tip) {
    case "ILERLE":
      ilerle(durum, Math.max(0, Math.floor(eylem.dk || 0)));
      return {};
    case "PLANA_AL": {
      if (!oyunda) return { hata: "Gün kapandı." };
      const bilgi = planla(durum);
      if (durum.gunPlanDk == null) {
        durum.gunPlanDk = durum.dk;
        if (durum.dk <= AYARLAR.ZAMANINDA_PLAN_SAAT * 60) puanEkle(durum, "ZAMANINDA_PLAN", `Zamanında plan: siparişler saat ${saat(durum.dk)} itibarıyla planda`);
      }
      durum.gorev.plana = true;
      bildir(durum, "planlama", bilgi.gecKalacak.length
        ? `Planlama: siparişler plana alındı. Kapasite yetmiyor: ${bilgi.gecKalacak.length} satır geç kalacak.`
        : "Planlama: siparişler plana alındı. Bütün satırlar teslimden önce sığıyor.", bilgi.gecKalacak.length ? "dikkat" : "bilgi");
      return { bilgi };
    }
    case "IHTIYAC_GORULDU":
      if (!durum.gorev.ihtiyac) {
        durum.gorev.ihtiyac = true;
        durum.degisim += 1;
      }
      return {};
    case "SIPARIS_VER":
      return siparisVer(durum, eylem);
    case "ONAY_AL":
      if (!oyunda) return { hata: "Gün kapandı." };
      return onayAl(durum, eylem.id);
    case "TESLIM_AL":
      if (!oyunda) return { hata: "Gün kapandı." };
      return teslimAl(durum, eylem.id);
    case "KARAR":
      if (!oyunda) return { hata: "Gün kapandı." };
      return kararVer(durum, eylem.id, eylem.secim);
    case "VARDIYA": {
      const h = durum.hatlar[eylem.hat];
      if (!oyunda || !h || Boolean(eylem.acik) === h.ikinciVardiya) return {};
      h.ikinciVardiya = Boolean(eylem.acik);
      const maliyet = AYARLAR.IKINCI_VARDIYA.maliyet;
      if (h.ikinciVardiya) {
        bildir(durum, "uretim", `Üretim: ${HAT[eylem.hat].ad} için bu gece ikinci vardiya açıldı (${tl(maliyet)}).`);
        harca(durum, maliyet, `${HAT[eylem.hat].ad} ikinci vardiyası`);
      } else {
        iade(durum, maliyet);
        bildir(durum, "uretim", `Üretim: ${HAT[eylem.hat].ad} ikinci vardiyası iptal edildi.`);
      }
      return {};
    }
    case "GORULDU": {
      const son = durum.gunluk.filter((g) => g.oda === eylem.oda).reduce((m, g) => Math.max(m, Number(g.id.slice(1))), 0);
      if (son > (durum.gorulen[eylem.oda] || 0)) {
        durum.gorulen[eylem.oda] = son;
        durum.degisim += 1;
      }
      return {};
    }
    case "GUNU_BITIR":
      hizliBitir(durum);
      return {};
    case "GM_YORUMU":
      /* Yapay zeka yorumu gelirse o günün karnesinde şablon yorumunun yerine geçer */
      if (durum.evre !== "gun-sonu" || !durum.karne || durum.karne.gun !== eylem.gun
        || typeof eylem.metin !== "string" || !eylem.metin.includes("{hitap}")) return {};
      durum.karne.gmYorum = eylem.metin.slice(0, 1200);
      durum.karne.gmKaynak = "yapay-zeka";
      return {};
    case "YARINA_GEC":
      if (durum.evre !== "gun-sonu") return { hata: "Gün henüz bitmedi." };
      if (durum.gun >= sonGun()) return { hata: "Son gün tamamlandı." };
      durum.gun += 1;
      gunuBaslat(durum);
      return { yeniGun: durum.gun };
    default:
      return { hata: `Bilinmeyen eylem: ${eylem.tip}` };
  }
}
