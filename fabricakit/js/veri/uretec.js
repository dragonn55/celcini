/* Sentetik veri üreteci: sipariş defteri, gece değişimleri, günün olay planı, başlangıç stoku.
   Gerçek firma, gerçek müşteri, gerçek kişi yoktur. Oyun sayıları ayarlar.js'den gelir; burada yalnızca
   yuvarlama adımları ve yazı-tura (0,5) seçimleri var. */
import { AYARLAR } from "../ayarlar.js";
import { tamSayi, aralik, sec, karisik, rastgele } from "./tohum.js";
import { MALZEME_IDLER, MALZEME, URUN_IDLER, yuvarlaYukari } from "./katalog.js";

const adim = (urun) => AYARLAR.SATIR_YUVARLAMA[urun] || 1;
const yuvarla = (sayi, a) => Math.max(a, Math.round(sayi / a) * a);
const musteriTanimi = (ad) => AYARLAR.MUSTERILER.find((m) => m.ad === ad) || AYARLAR.MUSTERILER[0];
/* alt..ust arasında, TESLIM_YIGILMA ile başa yığılmış gün */
const yigilmisGun = (a, alt, ust) => alt + Math.floor((ust - alt + 1) * Math.pow(rastgele(a), AYARLAR.TESLIM_YIGILMA));

export function satirMiktari(a, urun) {
  const [alt, ust] = AYARLAR.SATIR_MIKTARI[urun];
  return yuvarla(tamSayi(a, alt, ust), adim(urun));
}

/* 1. gün sabahı gelen defter: 2–4 müşteri, 10–20 satır, 30 günlük ufuk.
   Oyunun her gününde (1–5) en az ILK_GUNLER_EN_AZ_SATIR satır teslim edilir; kalan satırlar ufka dağılır. */
export function ilkDefter(a, yeniId) {
  const musteriler = karisik(a, AYARLAR.MUSTERILER).slice(0, tamSayi(a, ...AYARLAR.MUSTERI_SAYISI));
  const satirSayisi = tamSayi(a, ...AYARLAR.SATIR_SAYISI);
  const oyunGunu = AYARLAR.GUNLER.length;
  const teslimler = [];
  for (let g = 1; g <= oyunGunu; g++) for (let k = 0; k < AYARLAR.ILK_GUNLER_EN_AZ_SATIR; k++) teslimler.push(g);
  while (teslimler.length < satirSayisi) teslimler.push(yigilmisGun(a, oyunGunu + 1, AYARLAR.UFUK_GUN));
  const satirlar = teslimler.map((gun, i) => {
    const m = musteriler[i % musteriler.length];
    const urun = sec(a, m.urunler);
    let miktar = satirMiktari(a, urun);
    if (gun <= AYARLAR.YAKIN_SATIR_GUN) miktar = yuvarla(miktar * AYARLAR.YAKIN_SATIR_CARPANI, adim(urun));
    return { id: yeniId("M"), musteri: m.ad, urun, miktar, gun, durum: "acik", degisim: { tur: "yeni" } };
  });
  return { musteriler: musteriler.map((m) => m.ad), satirlar };
}

/* Gece değişimi: açık satırların %60–85'inin miktarı değişir, çoğu öne çekilir, net toplam az oynar.
   Bugün teslim edilecek satırlara dokunulmaz; öne çekilen satır en erken yarına gelir. */
export function geceDegisimi(a, durum, gunAyari, yeniId) {
  const bugun = durum.gun;
  for (const s of durum.siparisler) delete s.degisim;
  const adaylar = durum.siparisler.filter((s) => s.durum === "acik" && s.gun > bugun);
  const oran = aralik(a, ...gunAyari.degisim);
  const secilen = karisik(a, adaylar).slice(0, Math.round(adaylar.length * oran));
  const toplam = (liste) => liste.reduce((t, s) => t + s.miktar, 0);
  const onceToplam = toplam(adaylar);

  for (const s of secilen) {
    const eski = { miktar: s.miktar, gun: s.gun };
    const a1 = adim(s.urun);
    let yeni = yuvarla(s.miktar * (1 + aralik(a, -gunAyari.siddet, gunAyari.siddet)), a1);
    if (yeni === s.miktar) yeni = rastgele(a) < 0.5 && s.miktar > a1 ? s.miktar - a1 : s.miktar + a1;
    s.miktar = yeni;
    if (rastgele(a) < AYARLAR.ONE_CEKME_ORANI) s.gun = Math.max(bugun + 1, s.gun - tamSayi(a, ...AYARLAR.ONE_CEKME_GUN));
    s.degisim = { eskiMiktar: eski.miktar, eskiGun: eski.gun };
  }

  /* Net toplam: fark sınırı aşarsa değişen satırları adım adım geri çek (satır yine değişmiş kalır) */
  let fark = toplam(adaylar) - onceToplam;
  const sinir = onceToplam * AYARLAR.NET_DEGISIM_SINIRI;
  let oynadi = true;
  while (Math.abs(fark) > sinir && oynadi) {
    oynadi = false;
    for (const s of secilen) {
      if (Math.abs(fark) <= sinir) break;
      const a1 = adim(s.urun);
      const yon = fark > 0 ? -1 : 1;
      const yeni = s.miktar + yon * a1;
      const eski = s.degisim.eskiMiktar;
      if (yeni < a1 || Math.abs(yeni - eski) < a1 || Math.sign(yeni - eski) !== Math.sign(s.miktar - eski)) continue;
      s.miktar = yeni;
      fark += yon * a1;
      oynadi = true;
    }
  }
  for (const s of secilen) {
    const d = s.degisim;
    d.tur = s.gun < d.eskiGun ? "one" : "miktar";
    if (s.miktar === d.eskiMiktar && s.gun === d.eskiGun) delete s.degisim;
  }

  /* Yeni satırlar (en erken YENI_SATIR_EN_ERKEN_GUN gün sonrasına) */
  const yeniSayisi = tamSayi(a, ...gunAyari.yeniSatir);
  for (let i = 0; i < yeniSayisi; i++) {
    const m = musteriTanimi(sec(a, durum.musteriler));
    const urun = sec(a, m.urunler);
    durum.siparisler.push({
      id: yeniId("M"), musteri: m.ad, urun, miktar: satirMiktari(a, urun),
      gun: yigilmisGun(a, bugun + AYARLAR.YENI_SATIR_EN_ERKEN_GUN, bugun + AYARLAR.UFUK_GUN - 1), durum: "acik", degisim: { tur: "yeni" },
    });
  }
  return { degisen: durum.siparisler.filter((s) => s.degisim && s.degisim.tur !== "yeni").length, yeni: yeniSayisi };
}

/* Günün olay planı: tür, saat ve parametreler gün başında çekilir; tetiklenince rastgelelik kullanılmaz. */
const OLAY_ODASI = {
  "bozuk-parti": "kalite",
  "usta-ayrildi": "ik",
  "urun-degisikligi": "arge",
  "makine-durusu": "uretim",
  "sayim-farki": "depo",
  "nakit-siniri": "finans",
  "siparis-degisti": "satis",
};
export const OLAY_TURLERI = Object.keys(OLAY_ODASI);

export function gunOlaylari(a, gun, gunAyari, dunku = []) {
  const sayi = Math.min(OLAY_TURLERI.length, tamSayi(a, ...gunAyari.olay));
  /* Dün yaşanan türler sona itilir: aynı olay art arda günlerde tekrar etmesin */
  const turler = karisik(a, OLAY_TURLERI).sort((x, y) => dunku.includes(x) - dunku.includes(y)).slice(0, sayi);
  const [bas, son] = AYARLAR.OLAY_SAATI;
  const dakikalar = new Set();
  while (dakikalar.size < turler.length) dakikalar.add(Math.round(aralik(a, bas * 60, son * 60) / 5) * 5);
  const sirali = [...dakikalar].sort((x, y) => x - y);
  return turler.map((tur, i) => ({
    id: `O${gun}-${i + 1}`, tur, oda: OLAY_ODASI[tur], dk: sirali[i], durum: "bekliyor", p: olayParametreleri(a, tur),
  }));
}

function olayParametreleri(a, tur) {
  const hat = () => sec(a, AYARLAR.HATLAR).id;
  const yerliMalzeme = () => sec(a, MALZEME_IDLER.filter((m) => !MALZEME[m].ithal));
  switch (tur) {
    case "bozuk-parti": return { malzeme: yerliMalzeme(), oran: aralik(a, ...AYARLAR.BOZUK_PARTI_ORANI) };
    case "usta-ayrildi": return { hat: hat() };
    case "urun-degisikligi": return { sira: tamSayi(a, 0, AYARLAR.URUN_DEGISIKLIKLERI.length - 1) };
    case "makine-durusu": return { hat: hat(), sure: Math.round(tamSayi(a, ...AYARLAR.MAKINE_DURUSU_DK) / 15) * 15 };
    case "sayim-farki": return { malzeme: yerliMalzeme(), oran: aralik(a, ...AYARLAR.SAYIM_FARKI_ORANI), yon: rastgele(a) < AYARLAR.SAYIM_EKSIK_OLASILIGI ? -1 : 1 };
    case "nakit-siniri": return { oran: aralik(a, ...AYARLAR.NAKIT_SINIRI_ORANI) };
    case "siparis-degisti": return {
      alt: rastgele(a) < AYARLAR.ACIL_SIPARIS_OLASILIGI ? "acil" : "artis", urun: sec(a, URUN_IDLER), secim: rastgele(a),
      oran: aralik(a, ...AYARLAR.SIPARIS_ARTIS_ORANI), gun: tamSayi(a, ...AYARLAR.ACIL_SIPARIS_GUN),
    };
    default: return {};
  }
}

/* Başlangıç stoku: 1. gün sabahki siparişler zamanında plana alınırsa her malzemenin stoğu tam "kapsama"
   günlük üretime yeter. tuketim[i] = (i+1). gündeki referans plan tüketimi { malzeme: adet }. */
export function baslangicStoku(tuketim) {
  const birikim = (m, gunSayisi) => {
    let t = 0;
    const tam = Math.floor(gunSayisi);
    for (let i = 0; i < tam && i < tuketim.length; i++) t += tuketim[i][m] || 0;
    if (tam < tuketim.length) t += (gunSayisi - tam) * (tuketim[tam][m] || 0);
    return t;
  };
  const stok = {};
  for (const m of AYARLAR.MALZEMELER) stok[m.id] = Math.max(m.paket, Math.round(birikim(m.id, m.kapsama)));
  const yoldaki = AYARLAR.YOLDAKI_SIPARISLER.map((y) => {
    const m = MALZEME[y.malzeme];
    const ek = birikim(y.malzeme, m.kapsama + y.kapsama) - birikim(y.malzeme, m.kapsama);
    return { ...y, miktar: Math.max(m.paket, yuvarlaYukari(ek, m.paket)) };
  });
  return { stok, yoldaki };
}

/* Başlangıçta depoda hazır mamul: 1. ve 2. gün teslimlerinin bir kısmı */
export function baslangicMamulu(satirlar) {
  const mamul = Object.fromEntries(URUN_IDLER.map((u) => [u, 0]));
  AYARLAR.BASLANGIC_MAMUL_ORANI.forEach((oran, i) => {
    const gun = i + 1;
    const toplam = Object.fromEntries(URUN_IDLER.map((u) => [u, 0]));
    for (const s of satirlar) if (s.gun === gun) toplam[s.urun] += s.miktar;
    for (const u of URUN_IDLER) mamul[u] += Math.floor(toplam[u] * oran);
  });
  return mamul;
}
