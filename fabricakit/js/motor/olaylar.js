/* Olay üreten odalar. Olay planı gün başında tohumla çekilir (veri/uretec.js); burada tetiklenir.
   Satürn bozuk parti (sayaçlı karar), Uranüs usta ayrıldı, Venüs ürün değişikliği, Mars makine duruşu,
   Jüpiter sayım farkı, Neptün nakit sınırı, Merkür sipariş değişikliği ya da acil sipariş. */
import { AYARLAR } from "../ayarlar.js";
import { MALZEME, MALZEME_IDLER, URUN, HAT, malzemeninHatti, yuvarlaYukari } from "../veri/katalog.js";
import { satirMiktari } from "../veri/uretec.js";
import { akis } from "../veri/tohum.js";
import { sayi, tl, sure, gunAdi, yuzde } from "../bicim.js";
import { simdi } from "./zaman.js";
import { puanEkle } from "./puan.js";
import { bildir, yeniId } from "./ortak.js";
import { harca, malzemeMetni } from "./satinalma.js";
import { acikSatirlar, satirMetni, teslimSirasi } from "./siparis.js";

const planEskidi = (durum) => {
  if (durum.planBilgi.guncel) durum.planBilgi = { ...durum.planBilgi, guncel: false };
};

function kayit(durum, olay, metin) {
  durum.olayKaydi.push({ id: olay.id, tur: olay.tur, oda: olay.oda, dk: durum.dk, metin });
}

function tetikle(durum, o) {
  o.durum = "oldu";
  const p = o.p;
  switch (o.tur) {
    case "bozuk-parti": {
      const sira = MALZEME_IDLER.filter((m) => !MALZEME[m].ithal);
      const bas = Math.max(0, sira.indexOf(p.malzeme));
      const m = [...sira.slice(bas), ...sira.slice(0, bas)].find((x) => durum.stok[x] > 0);
      if (!m) { kayit(durum, o, "Kalite: kontrol edilecek parti yoktu."); return; }
      const miktar = Math.max(1, Math.round(durum.stok[m] * p.oran));
      durum.stok[m] -= miktar;
      durum.kararlar.push({
        id: yeniId(durum, "K"), olayId: o.id, tur: o.tur, oda: "kalite", malzeme: m, miktar,
        kalanDk: AYARLAR.KALITE_KARAR_DK, durum: "bekliyor", dk: durum.dk,
      });
      const metin = `Kalite: bozuk parti — ${malzemeMetni(m, miktar)} stoktan ayrıldı. Yeniden sipariş mi, yeniden işleme mi?`;
      kayit(durum, o, metin);
      bildir(durum, "kalite", metin, "acil");
      return;
    }
    case "usta-ayrildi": {
      const h = durum.hatlar[p.hat];
      h.verim = AYARLAR.USTA_AYRILDI.verim;
      h.verimSonGun = durum.gun + AYARLAR.USTA_AYRILDI.gun - 1;
      planEskidi(durum);
      const metin = `İnsan Kaynakları: ${HAT[p.hat].ad} ustası ayrıldı. Hattın kapasitesi ${yuzde(100 * (1 - h.verim))} düştü (${AYARLAR.USTA_AYRILDI.gun} gün).`;
      kayit(durum, o, metin);
      bildir(durum, "ik", metin, "dikkat");
      return;
    }
    case "urun-degisikligi": {
      const liste = AYARLAR.URUN_DEGISIKLIKLERI;
      let d = null;
      for (let i = 0; i < liste.length && !d; i++) {
        const aday = liste[(p.sira + i) % liste.length];
        if ((durum.urunAgaci[aday.urun] || {})[aday.malzeme] !== aday.yeni) d = aday;
      }
      if (!d) { kayit(durum, o, "Ar-Ge: ürün ağacında değişiklik yok."); return; }
      const eski = durum.urunAgaci[d.urun][d.malzeme] || 0;
      durum.urunAgaci[d.urun][d.malzeme] = d.yeni;
      durum.agacDegisiklikleri.push({ ...d, eski, gun: durum.gun });
      const metin = `Ar-Ge: ürün değişikliği — ${URUN[d.urun].ad} için ${MALZEME[d.malzeme].ad} ${eski} → ${d.yeni} ${MALZEME[d.malzeme].birim}. Malzeme ihtiyacı değişti.`;
      kayit(durum, o, metin);
      bildir(durum, "arge", metin, "dikkat");
      return;
    }
    case "makine-durusu": {
      const h = durum.hatlar[p.hat];
      h.durusSonDk = Math.max(h.durusSonDk, simdi(durum)) + p.sure;
      h.durusNeden = "makine arızası";
      durum.kararlar.push({
        id: yeniId(durum, "K"), olayId: o.id, tur: o.tur, oda: "uretim", hat: p.hat, sure: p.sure,
        kalanDk: null, durum: "bekliyor", dk: durum.dk,
      });
      const metin = `Üretim: ${HAT[p.hat].ad} makine arızasıyla durdu, tahmini ${sure(p.sure)}.`;
      kayit(durum, o, metin);
      bildir(durum, "uretim", metin, "acil");
      return;
    }
    case "sayim-farki": {
      const m = p.malzeme;
      const fark = Math.max(1, Math.round(durum.stok[m] * p.oran)) * p.yon;
      const yeni = Math.max(0, durum.stok[m] + fark);
      const gercekFark = yeni - durum.stok[m];
      durum.stok[m] = yeni;
      const metin = gercekFark < 0
        ? `Depo: sayım farkı — ${MALZEME[m].ad} rafta ${sayi(-gercekFark)} ${MALZEME[m].birim} eksik çıktı, stok düzeltildi.`
        : `Depo: sayım farkı — ${MALZEME[m].ad} rafta ${sayi(gercekFark)} ${MALZEME[m].birim} fazla çıktı, stok düzeltildi.`;
      kayit(durum, o, metin);
      bildir(durum, "depo", metin, "dikkat");
      return;
    }
    case "nakit-siniri": {
      durum.butce.limit = Math.round((AYARLAR.GUNLUK_BUTCE * p.oran) / 1000) * 1000;
      const metin = `Finans-Muhasebe: nakit sınırı — bugünkü satın alma bütçesi ${tl(durum.butce.limit)}'ye indi.`;
      kayit(durum, o, metin);
      bildir(durum, "finans", metin, "dikkat");
      return;
    }
    case "siparis-degisti": {
      const gelecek = acikSatirlar(durum).filter((s) => s.gun > durum.gun).sort(teslimSirasi);
      let metin;
      if (p.alt === "artis" && gelecek.length) {
        const s = gelecek[Math.floor(p.secim * gelecek.length)];
        const eski = s.miktar;
        const adim = AYARLAR.SATIR_YUVARLAMA[s.urun] || 1;
        s.miktar = yuvarlaYukari(s.miktar * (1 + p.oran), adim);
        s.degisim = { tur: "artis", eskiMiktar: eski, eskiGun: s.gun };
        metin = `Satış-Pazarlama: sipariş değişti — ${s.musteri}, ${URUN[s.urun].ad.toLocaleLowerCase("tr")} ${sayi(eski)} → ${sayi(s.miktar)} (teslim ${gunAdi(s.gun)}).`;
      } else {
        const musteri = durum.musteriler[Math.floor(p.secim * durum.musteriler.length)];
        const tanim = AYARLAR.MUSTERILER.find((m) => m.ad === musteri);
        const urun = tanim && tanim.urunler.includes(p.urun) ? p.urun : (tanim ? tanim.urunler[0] : p.urun);
        const s = {
          id: yeniId(durum, "M"), musteri, urun, miktar: satirMiktari(akis(Math.floor(p.secim * 1e9)), urun),
          gun: durum.gun + p.gun, durum: "acik", acil: true, degisim: { tur: "acil" },
        };
        durum.siparisler.push(s);
        metin = `Satış-Pazarlama: acil sipariş — ${satirMetni(s)}, teslim ${gunAdi(s.gun)}.`;
      }
      planEskidi(durum);
      kayit(durum, o, metin);
      bildir(durum, "satis", metin, "dikkat");
      return;
    }
    default:
  }
}

/* Her oyun dakikası: önce süren kararların sayaçları, sonra bu dakikanın olayları */
export function olayDakikasi(durum) {
  for (const k of durum.kararlar) {
    if (k.durum !== "bekliyor") continue;
    if (k.tur === "makine-durusu" && simdi(durum) >= durum.hatlar[k.hat].durusSonDk) {
      k.durum = "kapandi";
      durum.degisim += 1;
      continue;
    }
    if (k.kalanDk != null && k.dk !== durum.dk) {
      k.kalanDk -= 1;
      if (k.kalanDk <= 0) zamanAsimi(durum, k);
    }
  }
  for (const o of durum.olayPlani) if (o.durum === "bekliyor" && o.dk === durum.dk) tetikle(durum, o);
}

function zamanAsimi(durum, k) {
  k.durum = "zaman-asimi";
  if (k.tur === "bozuk-parti") {
    puanEkle(durum, "UNUTULAN_IS", `Unutulan iş: bozuk parti için karar verilmedi (${malzemeMetni(k.malzeme, k.miktar)} hurdaya ayrıldı)`);
    bildir(durum, "kalite", `Kalite: karar verilmedi, bozuk parti hurdaya ayrıldı — ${malzemeMetni(k.malzeme, k.miktar)}.`, "acil");
  }
}

/* Oyuncunun kararı. secim: "yeniden-isle" | "yeniden-siparis" | "acil-bakim" | "bekle" */
export function kararVer(durum, id, secim) {
  const k = durum.kararlar.find((x) => x.id === id);
  if (!k || k.durum !== "bekliyor") return { hata: "Bu karar artık geçerli değil." };
  if (k.tur === "bozuk-parti" && secim === "yeniden-isle") {
    const kurtarilan = Math.floor(k.miktar * AYARLAR.YENIDEN_ISLEME.kurtarma);
    durum.stok[k.malzeme] += kurtarilan;
    const hatId = malzemeninHatti(k.malzeme, durum.urunAgaci);
    const h = durum.hatlar[hatId];
    h.durusSonDk = Math.max(h.durusSonDk, simdi(durum)) + AYARLAR.YENIDEN_ISLEME.hatDakika;
    h.durusNeden = "yeniden işleme";
    k.durum = "verildi";
    k.secim = secim;
    bildir(durum, "kalite", `Kalite: yeniden işleme — ${malzemeMetni(k.malzeme, kurtarilan)} stoğa döndü, ${HAT[hatId].ad} ${sure(AYARLAR.YENIDEN_ISLEME.hatDakika)} bu işle meşgul.`);
    return {};
  }
  if (k.tur === "bozuk-parti" && secim === "yeniden-siparis") {
    k.durum = "verildi";
    k.secim = secim;
    bildir(durum, "kalite", `Kalite: bozuk parti hurdaya ayrıldı, yerine Satın Alma'dan sipariş verilecek — ${malzemeMetni(k.malzeme, k.miktar)}.`);
    return { satinAlma: { malzeme: k.malzeme, miktar: yuvarlaYukari(k.miktar, MALZEME[k.malzeme].paket) } };
  }
  if (k.tur === "makine-durusu" && (secim === "acil-bakim" || secim === "bekle")) {
    k.durum = "verildi";
    k.secim = secim;
    if (secim === "acil-bakim") {
      const h = durum.hatlar[k.hat];
      h.durusSonDk = Math.min(h.durusSonDk, simdi(durum) + AYARLAR.ACIL_BAKIM.durusDk);
      bildir(durum, "uretim", `Üretim: acil bakım çağrıldı (${tl(AYARLAR.ACIL_BAKIM.maliyet)}), ${HAT[k.hat].ad} en geç ${sure(AYARLAR.ACIL_BAKIM.durusDk)} içinde çalışır.`);
      harca(durum, AYARLAR.ACIL_BAKIM.maliyet, "acil bakım");
    } else {
      durum.degisim += 1;
    }
    return {};
  }
  return { hata: "Geçersiz karar." };
}
