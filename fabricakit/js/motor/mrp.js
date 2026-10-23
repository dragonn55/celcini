/* Planlama (Dünya) — PLANLA mantığı: sabah sayımı, ürün ağacı, günlük plan → günlük ihtiyaç,
   stok bitiş günü, sipariş takvimi, "GEÇ KALINDI" ve "BUGÜN VER". Kapasite hat bazındadır. */
import { AYARLAR } from "../ayarlar.js";
import {
  URUN, HAT, HAT_IDLER, URUN_IDLER, hatUrunleri, tedarikSuresi, tedarikEdebilir, standartTedarikci, yuvarlaYukari,
} from "../veri/katalog.js";
import { GUN_SONU, simdi } from "./zaman.js";
import { netIhtiyac, satirMetni } from "./siparis.js";
import { kopya } from "./kayit.js";

const UFUK = AYARLAR.UFUK_GUN;

export function hatVerimi(durum, hatId, gun) {
  const h = durum.hatlar[hatId];
  return h.verimSonGun >= gun ? h.verim : 1;
}

/* Hattın o günkü kapasitesi (iş dakikası). Bugün için kalan saat, süren duruş, bu geceki ikinci vardiya
   ve yarım kalan birim hesaba katılır. */
export function hatKapasitesi(durum, hatId, gun) {
  const verim = hatVerimi(durum, hatId, gun);
  if (gun !== durum.gun) return AYARLAR.HAT_DAKIKA * verim;
  const h = durum.hatlar[hatId];
  const kalanSaat = durum.evre === "oyun" ? Math.max(0, GUN_SONU - durum.dk) : 0;
  const durus = Math.max(0, Math.min(kalanSaat, h.durusSonDk - simdi(durum)));
  const gece = h.ikinciVardiya ? AYARLAR.IKINCI_VARDIYA.dakika : 0;
  const yarim = h.aktif ? h.aktif.kalanIs : 0;
  return Math.max(0, (kalanSaat - durus + gece) * verim - yarim);
}

/* Plandan kalan (henüz başlanmamış) adet */
export function kalanPlan(durum, urun, gun) {
  const plan = (durum.plan[gun] || {})[urun] || 0;
  const yapilan = (durum.uretilen[gun] || {})[urun] || 0;
  const a = durum.hatlar[URUN[urun].hat].aktif;
  const surer = a && a.urun === urun && a.gun === gun ? 1 : 0;
  return Math.max(0, plan - yapilan - surer);
}

/* Siparişi plana koy: her açık satırın eksiği, teslimden bir gün önceye (bugün ya da yarın teslimse bugüne)
   yerleştirilir; o gün doluysa geriye doğru boş kapasiteye kaydırılır. Teslimden önce sığmayan satır
   "geç kalacak" diye işaretlenir ve teslimden sonraki ilk boş kapasiteye konur. */
export function planla(durum) {
  const bugun = durum.gun;
  const son = bugun + UFUK - 1;
  const yuk = Object.fromEntries(HAT_IDLER.map((h) => [h, {}]));
  const kapasite = {};
  const kap = (h, d) => (kapasite[`${h}:${d}`] ??= hatKapasitesi(durum, h, d));
  const yeni = {};
  const ekle = (h, d, u, n) => {
    yeni[d] = yeni[d] || {};
    yeni[d][u] = (yeni[d][u] || 0) + n;
    yuk[h][d] = (yuk[h][d] || 0) + n * URUN[u].dakika;
  };
  const sigar = (h, d, u) => Math.floor(Math.max(0, kap(h, d) - (yuk[h][d] || 0)) / URUN[u].dakika);
  const gecKalacak = [];

  for (const { satir, eksik } of netIhtiyac(durum)) {
    if (eksik <= 0) continue;
    const u = satir.urun;
    const h = URUN[u].hat;
    const hedef = Math.min(son, Math.max(bugun, satir.gun - 1));
    let kalan = eksik;
    for (let d = hedef; d >= bugun && kalan > 0; d--) {
      const n = Math.min(kalan, sigar(h, d, u));
      if (n > 0) { ekle(h, d, u, n); kalan -= n; }
    }
    if (kalan > 0) {
      gecKalacak.push({ satirId: satir.id, hat: h, metin: satirMetni(satir), teslim: satir.gun, eksik: kalan });
      for (let d = hedef + 1; d <= son && kalan > 0; d++) {
        const n = Math.min(kalan, sigar(h, d, u));
        if (n > 0) { ekle(h, d, u, n); kalan -= n; }
      }
      if (kalan > 0) ekle(h, son, u, kalan);
    }
  }

  const plan = {};
  for (const [g, v] of Object.entries(durum.plan)) if (Number(g) < bugun) plan[g] = v;
  for (let d = bugun; d <= son; d++) {
    const gunPlani = {};
    for (const u of URUN_IDLER) {
      const yapilan = (durum.uretilen[d] || {})[u] || 0;
      const a = durum.hatlar[URUN[u].hat].aktif;
      const surer = a && a.urun === u && a.gun === d ? 1 : 0;
      const n = yapilan + surer + ((yeni[d] || {})[u] || 0);
      if (n > 0) gunPlani[u] = n;
    }
    if (Object.keys(gunPlani).length) plan[d] = gunPlani;
  }
  durum.plan = plan;
  durum.planBilgi = { guncel: true, dk: simdi(durum), gecKalacak };
  durum.degisim += 1;
  return durum.planBilgi;
}

/* Kapasite tablosu: her hat için bugünden itibaren gün gün yük ve kapasite (iş dakikası) */
export function kapasiteTablosu(durum, gunSayisi = 7) {
  return HAT_IDLER.map((h) => ({
    hat: h,
    ad: HAT[h].ad,
    verim: hatVerimi(durum, h, durum.gun),
    gunler: Array.from({ length: gunSayisi }, (_, i) => {
      const d = durum.gun + i;
      const yukDk = hatUrunleri(h).reduce((t, u) => t + kalanPlan(durum, u, d) * URUN[u].dakika, 0);
      return { gun: d, yuk: yukDk, kapasite: hatKapasitesi(durum, h, d) };
    }),
  }));
}

/* Malzeme ihtiyacı: her malzeme için stok, bugünkü ihtiyaç, bitiş günü, sipariş günü ve durum.
   durum: "yeterli" | "sonra" | "bugun-ver" | "gec-kaldi" | "onay-bekliyor" */
export function malzemeIhtiyaci(durum) {
  const bugun = durum.gun;
  const son = bugun + UFUK - 1;
  const agac = durum.urunAgaci;
  const kalan = {};
  for (let d = bugun; d <= son; d++) kalan[d] = Object.fromEntries(URUN_IDLER.map((u) => [u, kalanPlan(durum, u, d)]));

  return AYARLAR.MALZEMELER.map((mz) => {
    const m = mz.id;
    const brut = {};
    let toplamIhtiyac = 0;
    for (let d = bugun; d <= son; d++) {
      let t = 0;
      for (const u of URUN_IDLER) t += kalan[d][u] * ((agac[u] || {})[m] || 0);
      brut[d] = t;
      toplamIhtiyac += t;
    }
    const gelen = {};
    const bekleyenGelis = {};
    let bekleyen = 0;
    let gelecek = 0;
    for (const s of durum.satinalma) {
      if (s.malzeme !== m) continue;
      if (s.durum === "kapida" || s.durum === "onaylandi") {
        const g = s.durum === "kapida" ? bugun : Math.max(bugun, s.varisGun);
        gelen[g] = (gelen[g] || 0) + s.miktar;
        gelecek += s.miktar;
      } else if (s.durum === "yanit-bekliyor" || s.durum === "onay-bekliyor") {
        const g = bugun + tedarikSuresi(m, s.tedarikci);
        bekleyenGelis[g] = (bekleyenGelis[g] || 0) + s.miktar;
        bekleyen += s.miktar;
      }
    }
    const projeksiyon = (ek) => {
      let p = durum.stok[m];
      let bitis = null;
      const seri = [];
      for (let d = bugun; d <= son; d++) {
        p += (gelen[d] || 0) + (ek[d] || 0) - brut[d];
        seri.push(p);
        if (p < 0 && bitis === null) bitis = d;
      }
      return { bitis, seri };
    };
    const asil = projeksiyon({});
    const bekleyenle = projeksiyon(bekleyenGelis);
    const standart = standartTedarikci(m);
    /* Önerilen miktar: bitiş gününden (ya da en erken varış gününden) itibaren KAPSAMA_GUN günü karşılar;
       bekleyen siparişler düşülür. En erken varıştan önceki açık kaçınılmazdır, onun için sipariş önerilmez. */
    const enKisa = Math.min(...AYARLAR.TEDARIKCILER.filter((t) => tedarikEdebilir(m, t.id)).map((t) => tedarikSuresi(m, t.id)));
    let onerilen = 0;
    if (asil.bitis !== null) {
      const i0 = Math.max(asil.bitis, bugun + enKisa) - bugun;
      if (i0 <= UFUK - 1) {
        const i1 = Math.min(UFUK - 1, i0 + AYARLAR.KAPSAMA_GUN - 1);
        const taban = Math.min(0, i0 > 0 ? bekleyenle.seri[i0 - 1] : 0);
        let enAz = 0;
        for (let i = i0; i <= i1; i++) enAz = Math.min(enAz, bekleyenle.seri[i] - taban);
        onerilen = yuvarlaYukari(-enAz, mz.paket);
      }
    }
    let durumu = "yeterli";
    let verGun = null;
    let yetisen = [];
    if (asil.bitis !== null) {
      verGun = asil.bitis - tedarikSuresi(m, standart);
      durumu = verGun > bugun ? "sonra" : verGun === bugun ? "bugun-ver" : "gec-kaldi";
      yetisen = AYARLAR.TEDARIKCILER
        .filter((t) => tedarikEdebilir(m, t.id) && bugun + tedarikSuresi(m, t.id) <= asil.bitis)
        .map((t) => t.id);
      if (bekleyen > 0 && onerilen === 0) durumu = "onay-bekliyor";
    }
    return {
      id: m, ad: mz.ad, birim: mz.birim, ithal: Boolean(mz.ithal),
      sabah: durum.sabahStok[m] ?? durum.stok[m], stok: durum.stok[m],
      bugunIhtiyac: brut[bugun], toplamIhtiyac, bitis: asil.bitis, verGun, durum: durumu,
      yetisen, onerilen, bekleyen, gelecek, standart,
    };
  });
}

/* Gün kapanınca "sipariş verilmedi" sayılacak kalemler: GEÇ KALINDI ya da BUGÜN VER ve önerilen miktar > 0.
   Plan güncel değilse siparişler şimdi plana alınsaydı ne olacağına göre bakılır.
   Gün sonu cezası, "Günü bitir" penceresi ve görev notu aynı ölçütü kullanır. */
export function verilmeyenSiparisler(durum) {
  let d = durum;
  if (!durum.planBilgi.guncel) {
    d = kopya(durum);
    planla(d);
  }
  return malzemeIhtiyaci(d).filter((m) => (m.durum === "gec-kaldi" || m.durum === "bugun-ver") && m.onerilen > 0);
}

/* Sipariş defterine göre (plandan bağımsız) bir malzemenin ufuk boyunca toplam ihtiyacı */
export function siparisIhtiyaci(durum, malzeme) {
  let t = 0;
  for (const { satir, eksik } of netIhtiyac(durum)) t += eksik * ((durum.urunAgaci[satir.urun] || {})[malzeme] || 0);
  return t;
}
