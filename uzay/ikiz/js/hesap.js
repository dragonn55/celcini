/* Fabrika İkizi · HESAP — gün gün akış modeli (DOM'suz; scripts/ikiz-test.mjs Node'da da yükler).
   Veri: uzay/ikiz/js/veri.js (Fabrika Motoru'nun ÖRNEK tesisi; kurgusal). Model, Motor dosyasıyla aynı sadeleştirmeyi
   kullanır: iş merkezi yükü = Σ plan × standart süre + hazırlık; günlük kapasite = istasyon × 900 dk × verim
   (iki vardiya; üçüncü vardiya ×1,5 ve personel ihtiyacı birinci vardiya kadar artar). İş merkezleri proses sırasıyla
   işlenir: parça aynı gün rotanın tamamından geçer, kapasite yetmeyince darboğazın önünde bekler ve ertesi güne devreder.
   Sevk = 20 iş günlük net talebin eşit dağılımı (birikimli yuvarlama). */

export const VARDIYA_DK = 450;            // bir vardiyanın net dakikası (Motor: 2 vardiya × 450 = 900 dk/gün)
const yuvarla = (x) => Math.round(x * 1000) / 1000;

/* Varsayılan senaryo: Motor'un "Baz" sütunu */
export function senaryoVarsayilan() {
  return { ad: "Baz", talep: 0, kapasite: 0, vardiya3: false, fason: false, ariza: null /* {im, bas, bit} 1 tabanlı gün */ };
}

/* İş merkezinin o günkü kapasitesi (dk) */
export function kapasiteDk(im, sen, gun) {
  if (sen.ariza && sen.ariza.im === im.kod && gun >= sen.ariza.bas && gun <= sen.ariza.bit) return 0;
  let dk = im.istasyon * 2 * VARDIYA_DK * im.verim;
  if (sen.vardiya3) dk *= 1.5;
  dk *= 1 + (sen.kapasite || 0);
  if (sen.fason && im.fason) dk += im.fason_dk;
  return dk;
}

/* Tüm 20 günü hesaplar. Dönen: günler[] (her gün: yuk{im: dk}, kap{im: dk}, oran{im}, uretim{mamul}, sevk{mamul},
   stok{mamul}, birikim{mamul}, karsilanmayan{mamul}), ozet (aşım sayısı, en yüksek oran, OTD, toplamlar). */
export function hesapla(V, sen = senaryoVarsayilan()) {
  const G = V.gunler.length, imler = V.is_merkezleri, mam = V.mamuller;
  // iş merkezleri proses sırasıyla işlenir (Kesim → Büküm → Havşa → Lehim → Test); bir parça kapasite yettiği sürece
  // aynı gün rotanın tamamından geçer, yetmeyince darboğazın önünde bekler (wip[mamul][aşama])
  const sira = imler.slice().sort((a, b) => PROSES_SIRA.indexOf(a.proses) - PROSES_SIRA.indexOf(b.proses));
  const stok = {}, wip = {}, bekleyenTalep = {};
  mam.forEach(m => { stok[m.kod] = m.acilis_stok; wip[m.kod] = new Array((V.rota[m.kod] || []).length + 1).fill(0); bekleyenTalep[m.kod] = 0; });
  const gunler = [];
  let asim = 0, enYuksek = 0, enYuksekIm = null, enYuksekGun = 0, sevkToplam = 0, talepToplam = 0, zamaninda = 0, uretimToplam = 0;
  for (let g = 0; g < G; g++) {
    const yuk = {}, kap = {}, oran = {}, uretim = {}, sevk = {}, plan = {}, birikim = {};
    imler.forEach(i => { yuk[i.kod] = 0; kap[i.kod] = kapasiteDk(i, sen, g + 1); });
    // günün planı rotanın başına girer: MPS × (1 + talep)
    mam.forEach(m => {
      const p = Math.round((V.mps[m.kod]?.[g] || 0) * (1 + (sen.talep || 0)));
      plan[m.kod] = p; wip[m.kod][0] += p; uretim[m.kod] = 0;
    });
    // dosyadaki gibi statik plan yükü (üst iş merkezinden bağımsız): KAPASİTE sayfasının oranı
    const planOran = {};
    imler.forEach(i => { let dk = 0; mam.forEach(m => { const p = plan[m.kod]; if (p > 0) (V.rota[m.kod] || []).forEach(r => { if (r.im === i.kod) dk += p * r.dk + r.hazirlik; }); });
      planOran[i.kod] = kap[i.kod] > 0 ? dk / kap[i.kod] : (dk > 0 ? Infinity : 0); });
    // iş merkezleri proses sırasıyla: önündeki bekleyen iş kadar yük, kapasite oranında geçiş
    sira.forEach(i => {
      const isler = [];
      mam.forEach(m => (V.rota[m.kod] || []).forEach((r, k) => { if (r.im === i.kod && wip[m.kod][k] > 0) isler.push({ m: m.kod, k, r }); }));
      let talepDk = 0; isler.forEach(x => { talepDk += wip[x.m][x.k] * x.r.dk + x.r.hazirlik; });
      yuk[i.kod] = talepDk;
      const o = kap[i.kod] > 0 ? talepDk / kap[i.kod] : (talepDk > 0 ? Infinity : 0);
      oran[i.kod] = o;
      if (o > 1) asim += 1;
      if (o > enYuksek && isFinite(o)) { enYuksek = o; enYuksekIm = i.kod; enYuksekGun = g + 1; }
      const pay = o > 1 ? (kap[i.kod] > 0 ? kap[i.kod] / talepDk : 0) : 1;
      isler.forEach(x => {
        const gecen = Math.floor(wip[x.m][x.k] * pay);
        wip[x.m][x.k] -= gecen; wip[x.m][x.k + 1] += gecen;
        if (x.k + 1 === (V.rota[x.m] || []).length) { uretim[x.m] += gecen; }
      });
    });
    // rotası olmayan mamul (veri eksikse) doğrudan biter
    mam.forEach(m => { if (!(V.rota[m.kod] || []).length) { uretim[m.kod] += wip[m.kod][0]; wip[m.kod][0] = 0; } });
    mam.forEach(m => {
      const n = (V.rota[m.kod] || []).length;
      const u = wip[m.kod][n]; wip[m.kod][n] = 0;              // biten parçalar stoğa
      stok[m.kod] += u; uretimToplam += u; uretim[m.kod] = u;
      birikim[m.kod] = wip[m.kod].reduce((a, b) => a + b, 0);   // hatta bekleyen iş (WIP)
      // sevk: günlük talep (net talebin eşit dağılımı, birikimli yuvarlama: 20 günün toplamı net taleple aynı) + karşılanmayan
      const netTalep = (V.talep20[m.kod] || 0) * (1 + (sen.talep || 0));
      const gunluk = Math.round(netTalep * (g + 1) / G) - Math.round(netTalep * g / G);
      const istenen = gunluk + bekleyenTalep[m.kod];
      const s = Math.min(stok[m.kod], istenen);
      sevk[m.kod] = s; stok[m.kod] -= s;
      talepToplam += gunluk; sevkToplam += s; zamaninda += Math.min(s, gunluk);
      bekleyenTalep[m.kod] = istenen - s;
    });
    // iş merkezinin önünde bekleyen iş (adet) ve hat başına günün üretimi
    const kuyruk = {}, hatUretim = {};
    imler.forEach(i => { kuyruk[i.kod] = 0; });
    mam.forEach(m => (V.rota[m.kod] || []).forEach((r, k) => { kuyruk[r.im] += wip[m.kod][k]; }));
    V.hatlar.forEach(h => { hatUretim[h.kod] = 0; });
    mam.forEach(m => { if (hatUretim[m.hat] !== undefined) hatUretim[m.hat] += uretim[m.kod]; });
    gunler.push({ gun: g + 1, tarih: V.gunler[g], yuk: kopya(yuk), kap: kopya(kap), oran: kopya(oran), plan: kopya(plan),
      uretim: kopya(uretim), sevk: kopya(sevk), stok: kopya(stok), birikim: kopya(birikim), bekleyen: kopya(bekleyenTalep),
      kuyruk, hatUretim, planOran });
  }
  const sonBirikim = Object.values(wip).reduce((a, w) => a + w.reduce((x, y) => x + y, 0), 0);
  const sonBekleyen = Object.values(bekleyenTalep).reduce((a, b) => a + b, 0);
  const hatlar = hatYuku(V, gunler, sen);
  return { senaryo: sen, gunler, ozet: { asim, enYuksek: yuvarla(enYuksek), enYuksekIm, enYuksekGun, otd: talepToplam ? yuvarla(zamaninda / talepToplam) : 1,
    uretim: uretimToplam, sevk: sevkToplam, talep: talepToplam, birikim: sonBirikim, bekleyen: sonBekleyen, hatlar } };
}

/* Hat başına ortalama doluluk ve adam-saat ihtiyacı (operatör × yük / 60) */
function hatYuku(V, gunler, sen) {
  const imMap = Object.fromEntries(V.is_merkezleri.map(i => [i.kod, i]));
  return V.hatlar.map(h => {
    let yuk = 0, kap = 0, adamSaat = 0;
    gunler.forEach(g => V.is_merkezleri.filter(i => i.hat === h.kod).forEach(i => {
      yuk += g.yuk[i.kod]; kap += g.kap[i.kod]; adamSaat += g.yuk[i.kod] * i.operator / 60;
    }));
    const mevcut = (h.v1 + h.v2 + (sen.vardiya3 ? h.v1 : 0)) * 7.5 * gunler.length;
    return { kod: h.kod, ad: h.ad, doluluk: kap ? yuvarla(yuk / kap) : 0, adamSaat: Math.round(adamSaat), mevcutAdamSaat: Math.round(mevcut) };
  });
}

function kopya(o) { return Object.assign({}, o); }

/* Hat üzerinde iş merkezlerinin proses sırası (Kesim → Büküm → Havşa → Lehim → Test) */
export const PROSES_SIRA = ["Kesim", "Büküm", "Havşa", "Lehim", "Test"];
export function hatIsMerkezleri(V, hatKod) {
  return V.is_merkezleri.filter(i => i.hat === hatKod).sort((a, b) => PROSES_SIRA.indexOf(a.proses) - PROSES_SIRA.indexOf(b.proses));
}
