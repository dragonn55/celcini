/* Oda ışıkları: yolunda / dikkat / acil. Işık her zaman metin etiketiyle gösterilir.
   Neden metinleri gerçek adları kullanır. */
import { AYARLAR } from "../ayarlar.js";
import { HAT, HAT_IDLER, MALZEME } from "../veri/katalog.js";
import { ODALAR } from "../odalar.js";
import { simdi } from "./zaman.js";
import { acikSatirlar } from "./siparis.js";
import { malzemeIhtiyaci, kalanPlan } from "./mrp.js";
import { hatHali } from "./uretim.js";

export const SEVIYE_ADI = { yolunda: "Yolunda", dikkat: "Dikkat", acil: "Acil" };
const SIRA = { yolunda: 0, dikkat: 1, acil: 2 };
const sayiId = (id) => Number(String(id).slice(1)) || 0;

export function gorulmemis(durum, oda) {
  const son = durum.gorulen[oda] || 0;
  return durum.gunluk.filter((g) => g.oda === oda && g.seviye !== "bilgi" && sayiId(g.id) > son);
}

export function odaDurumlari(durum, ihtiyac = malzemeIhtiyaci(durum)) {
  const sonuc = Object.fromEntries(ODALAR.map((o) => [o.id, { seviye: "yolunda", neden: "" }]));
  const yaz = (oda, seviye, neden) => {
    if (SIRA[seviye] > SIRA[sonuc[oda].seviye]) sonuc[oda] = { seviye, neden };
  };
  if (durum.evre !== "oyun") return sonuc;
  const bugun = durum.gun;

  /* Satış-Pazarlama: bugünkü sevkiyat yetişecek mi, değişen siparişler görüldü mü */
  const bugunku = acikSatirlar(durum).filter((s) => s.gun <= bugun);
  const gerekli = {};
  for (const s of bugunku) gerekli[s.urun] = (gerekli[s.urun] || 0) + s.miktar;
  for (const [u, adet] of Object.entries(gerekli)) {
    const surer = Object.values(durum.hatlar).some((x) => x.aktif && x.aktif.urun === u) ? 1 : 0;
    if (durum.mamul[u] + surer + kalanPlan(durum, u, bugun) < adet) yaz("satis", "acil", "Bugünkü sevkiyat eksik kalacak");
  }
  if (gorulmemis(durum, "satis").length) yaz("satis", "dikkat", "Sipariş defteri değişti");

  /* Ar-Ge */
  if (gorulmemis(durum, "arge").length) yaz("arge", "dikkat", "Ürün ağacı değişti");

  /* Planlama */
  if (!durum.planBilgi.guncel) {
    const yakin = acikSatirlar(durum).some((s) => s.gun <= bugun + 1);
    yaz("planlama", yakin ? "acil" : "dikkat", durum.planBilgi.dk == null ? "Plan yok" : "Plan güncel değil");
  }
  if (durum.planBilgi.guncel && durum.planBilgi.gecKalacak.length) yaz("planlama", "dikkat", "Kapasite yetmiyor");
  if (ihtiyac.some((m) => m.durum === "gec-kaldi")) yaz("planlama", "dikkat", "Geç kalınan malzeme var");

  /* Üretim */
  for (const h of HAT_IDLER) {
    const hal = hatHali(durum, h);
    if (hal.tur === "durus") yaz("uretim", "acil", `${HAT[h].ad} durdu (${hal.neden})`);
    if (hal.tur === "malzeme") yaz("uretim", "acil", `${HAT[h].ad} durdu: ${MALZEME[hal.malzeme].ad} yok`);
    if (durum.hatlar[h].verimSonGun >= bugun && durum.hatlar[h].verim < 1) yaz("uretim", "dikkat", `${HAT[h].ad} düşük kapasitede`);
  }
  if (durum.kararlar.some((k) => k.durum === "bekliyor" && k.oda === "uretim")) yaz("uretim", "acil", "Karar bekliyor");

  /* Depo */
  for (const s of durum.satinalma) {
    if (s.durum !== "kapida") continue;
    yaz("depo", simdi(durum) - s.kapidaDk >= AYARLAR.KAPIDA_BEKLEME_DK ? "acil" : "dikkat", "Kapıda teslimat bekliyor");
  }
  if (gorulmemis(durum, "depo").length) yaz("depo", "dikkat", "Sayım farkı");

  /* Kalite */
  if (durum.kararlar.some((k) => k.durum === "bekliyor" && k.oda === "kalite")) yaz("kalite", "acil", "Bozuk parti: karar bekliyor");

  /* İnsan Kaynakları */
  for (const h of HAT_IDLER) {
    if (durum.hatlar[h].verimSonGun >= bugun && durum.hatlar[h].verim < 1) yaz("ik", "dikkat", `${HAT[h].ad} ustası eksik`);
  }

  /* Finans-Muhasebe */
  const { harcanan, limit } = durum.butce;
  if (harcanan > limit) yaz("finans", "acil", "Bütçe aşıldı");
  else if (harcanan > limit * AYARLAR.BUTCE_UYARI_ORANI) yaz("finans", "dikkat", `Harcama, bütçenin %${Math.round(AYARLAR.BUTCE_UYARI_ORANI * 100)} sınırını geçti`);
  if (gorulmemis(durum, "finans").length) yaz("finans", "dikkat", "Bütçe değişti");

  /* Satın Alma */
  for (const s of durum.satinalma) {
    if (s.durum === "onay-bekliyor") yaz("satinalma", s.kalanDk <= AYARLAR.SAYAC_ACIL_DK ? "acil" : "dikkat", "Onay bekleyen sipariş");
    if (s.durum === "yanit-bekliyor") yaz("satinalma", "dikkat", "Tedarikçi yanıtı bekleniyor");
  }
  if (ihtiyac.some((m) => m.durum === "gec-kaldi")) yaz("satinalma", "acil", "Geç kalınan malzeme");
  else if (ihtiyac.some((m) => m.durum === "bugun-ver")) yaz("satinalma", "dikkat", "Bugün verilecek sipariş");

  return sonuc;
}
