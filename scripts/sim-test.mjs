#!/usr/bin/env node
/* Fabricakit motor testi (arayüzsüz). 1–5. günleri üç oyuncu tipiyle oynar:
   pasif (hiçbir şey yapmaz), doğru (her şeyi zamanında yapar), rastgele (tohumlu rastgele eylemler).
   Denetler: karnede NaN / sonsuz / tanımsız yok, eksi stok yok, puan sınır içinde, harf A–E,
   kayıt → yükleme aynı durumu verir ve aynı eylemlerle aynı yere varır, aynı tohum aynı sonucu verir,
   "Günü bitir" olayları atlamaz ve karar isteyen olayda durur.
   Çalıştırma: node scripts/sim-test.mjs */
import { AYARLAR } from "../fabricakit/js/ayarlar.js";
import { olusturStore } from "../fabricakit/js/motor/durum.js";
import { malzemeIhtiyaci, verilmeyenSiparisler } from "../fabricakit/js/motor/mrp.js";
import { gorevSayaclari } from "../fabricakit/js/motor/satinalma.js";
import { odaDurumlari } from "../fabricakit/js/motor/durumlar.js";
import { sayaclar } from "../fabricakit/js/motor/sayac.js";
import { kaydaYaz, kayittanOku, kopya } from "../fabricakit/js/motor/kayit.js";
import { akis, rastgele, tamSayi, sec } from "../fabricakit/js/veri/tohum.js";
import { MALZEME_IDLER, HAT_IDLER, tedarikEdebilir, tedarikSuresi, birimFiyat } from "../fabricakit/js/veri/katalog.js";
import { ODALAR } from "../fabricakit/js/odalar.js";
import { kuralCevap, SORULAR } from "../fabricakit/js/ajan-gm/yorumlar.js";
import { ornekMetni } from "./karne-ornegi.mjs";
import fs from "node:fs";

let hataSayisi = 0;
const hata = (m) => { console.error("✗ " + m); hataSayisi += 1; };

/* ---------------- denetimler ---------------- */
function sayilariDenetle(nesne, yol, nerede) {
  if (nesne === undefined) { hata(`${nerede}: ${yol} tanımsız`); return; }
  if (typeof nesne === "number") {
    if (!Number.isFinite(nesne)) hata(`${nerede}: ${yol} = ${nesne}`);
    return;
  }
  if (typeof nesne === "string") {
    if (/NaN|undefined|Infinity|\[object/.test(nesne)) hata(`${nerede}: ${yol} metninde "${nesne}"`);
    return;
  }
  if (nesne && typeof nesne === "object") for (const [k, v] of Object.entries(nesne)) sayilariDenetle(v, `${yol}.${k}`, nerede);
}

function durumuDenetle(d, nerede) {
  for (const m of MALZEME_IDLER) {
    if (!Number.isInteger(d.stok[m]) || d.stok[m] < 0) hata(`${nerede}: stok ${m} = ${d.stok[m]}`);
  }
  for (const [u, n] of Object.entries(d.mamul)) if (!Number.isInteger(n) || n < 0) hata(`${nerede}: mamul ${u} = ${n}`);
  if (d.puan.deger < AYARLAR.PUAN.ALT || d.puan.deger > AYARLAR.PUAN.UST) hata(`${nerede}: puan sınır dışı ${d.puan.deger}`);
  if (d.butce.harcanan < 0) hata(`${nerede}: harcama eksi`);
  for (const s of d.satinalma) if (!(s.miktar > 0) || !(s.tutar >= 0)) hata(`${nerede}: satın alma ${s.id} miktar/tutar`);
  for (const s of d.siparisler) if (!(s.miktar > 0) || !Number.isInteger(s.gun)) hata(`${nerede}: sipariş ${s.id}`);
  if (d.dk < AYARLAR.GUN_BASI_SAAT * 60 || d.dk > AYARLAR.GUN_SONU_SAAT * 60) hata(`${nerede}: saat sınır dışı ${d.dk}`);
}

function karneyiDenetle(k, nerede) {
  sayilariDenetle(k, "karne", nerede);
  /* Ajan GM: hitapla başlar, yarın için talimatla biter, NaN/undefined yok */
  if (!k.gmYorum || !k.gmYorum.startsWith("{hitap}, ")) hata(`${nerede}: Ajan GM yorumu hitapla başlamıyor`);
  if (!/Yarın için talimatım: [^.]+\.$/.test(k.gmYorum)) hata(`${nerede}: Ajan GM yorumu talimatla bitmiyor: ${k.gmYorum}`);
  for (const s of SORULAR) {
    const c = kuralCevap(k, s.id);
    if (!c || !c.startsWith("{hitap}, ") || /NaN|undefined|null/.test(c)) hata(`${nerede}: "${s.metin}" cevabı bozuk: ${c}`);
  }
  if (k.puan < AYARLAR.PUAN.ALT || k.puan > AYARLAR.PUAN.UST) hata(`${nerede}: karne puanı sınır dışı ${k.puan}`);
  if (!["A", "B", "C", "D", "E"].includes(k.harf)) hata(`${nerede}: harf ${k.harf}`);
  if (k.teslim.yuzde !== null && (k.teslim.yuzde < 0 || k.teslim.yuzde > 100)) hata(`${nerede}: teslim yüzdesi ${k.teslim.yuzde}`);
  if (k.teslim.zamaninda > k.teslim.toplam) hata(`${nerede}: zamanında > toplam`);
  if (k.durus.saat < 0 || k.durus.saat > 2 * (AYARLAR.GUN_SONU_SAAT - AYARLAR.GUN_BASI_SAAT)) hata(`${nerede}: duruş saati ${k.durus.saat}`);
  if (k.bagliPara < 0) hata(`${nerede}: bağlı para eksi`);
  if (k.unutulan.sayi < 0) hata(`${nerede}: unutulan iş eksi`);
}

/* ---------------- oyuncular ---------------- */
const oyuncular = {
  pasif() {},

  dogru(store) {
    const d = store.durum;
    if (!d.planBilgi.guncel) {
      store.gonder({ tip: "PLANA_AL" });
      /* Kapasite yetmiyorsa geç kalacak satırların hattında bu gece ikinci vardiya, sonra yeniden planla */
      for (const g of d.planBilgi.gecKalacak) {
        if (!d.hatlar[g.hat].ikinciVardiya) {
          store.gonder({ tip: "VARDIYA", hat: g.hat, acik: true });
          store.gonder({ tip: "PLANA_AL" });
        }
      }
    }
    if (!d.gorev.ihtiyac) store.gonder({ tip: "IHTIYAC_GORULDU" });
    for (const m of malzemeIhtiyaci(d)) {
      /* GEÇ KALINDI ve BUGÜN VER hemen; yarın verilecekleri de bugünden standart tedarikçiye */
      const yarin = m.durum === "sonra" && m.verGun === d.gun + 1;
      if (m.durum !== "gec-kaldi" && m.durum !== "bugun-ver" && !yarin) continue;
      if (m.onerilen <= 0) continue;
      /* Yetişenlerin en ucuzu; hiçbiri yetişmiyorsa en hızlısı (açık en kısa sürsün) */
      const t = m.yetisen.length
        ? m.yetisen.slice().sort((a, b) => birimFiyat(m.id, a) - birimFiyat(m.id, b))[0]
        : AYARLAR.TEDARIKCILER.filter((x) => tedarikEdebilir(m.id, x.id)).sort((a, b) => tedarikSuresi(m.id, a.id) - tedarikSuresi(m.id, b.id))[0].id;
      store.gonder({ tip: "SIPARIS_VER", malzeme: m.id, tedarikci: t, miktar: m.onerilen });
    }
    for (const s of d.satinalma) {
      if (s.durum === "onay-bekliyor") store.gonder({ tip: "ONAY_AL", id: s.id });
      if (s.durum === "kapida") store.gonder({ tip: "TESLIM_AL", id: s.id });
    }
    for (const k of d.kararlar) {
      if (k.durum !== "bekliyor") continue;
      if (k.tur === "bozuk-parti") {
        /* Malzeme iki gün içinde bitecekse yeniden işle (hemen stoğa döner), değilse yeniden sipariş */
        const m = malzemeIhtiyaci(d).find((x) => x.id === k.malzeme);
        if (m.bitis !== null && m.bitis <= d.gun + 2) { store.gonder({ tip: "KARAR", id: k.id, secim: "yeniden-isle" }); continue; }
        const sonuc = store.gonder({ tip: "KARAR", id: k.id, secim: "yeniden-siparis" });
        if (sonuc.satinAlma) store.gonder({ tip: "SIPARIS_VER", malzeme: sonuc.satinAlma.malzeme, tedarikci: enHizli(sonuc.satinAlma.malzeme), miktar: sonuc.satinAlma.miktar });
      }
      if (k.tur === "makine-durusu") store.gonder({ tip: "KARAR", id: k.id, secim: "acil-bakim" });
    }
    for (const o of ODALAR) store.gonder({ tip: "GORULDU", oda: o.id });
  },

  rastgele(store, a) {
    const d = store.durum;
    const r = rastgele(a);
    if (r < 0.05) store.gonder({ tip: "PLANA_AL" });
    else if (r < 0.10) {
      const m = sec(a, MALZEME_IDLER);
      store.gonder({ tip: "SIPARIS_VER", malzeme: m, tedarikci: sec(a, ["a", "b", "c"]), miktar: tamSayi(a, 1, 600) });
    } else if (r < 0.13) store.gonder({ tip: "SIPARIS_VER", malzeme: "yok", tedarikci: "z", miktar: -5 });
    else if (r < 0.35) {
      const s = d.satinalma.filter((x) => x.durum === "onay-bekliyor");
      if (s.length) store.gonder({ tip: "ONAY_AL", id: sec(a, s).id });
    } else if (r < 0.45) {
      const s = d.satinalma.filter((x) => x.durum === "kapida");
      if (s.length) store.gonder({ tip: "TESLIM_AL", id: sec(a, s).id });
    } else if (r < 0.55) {
      const k = d.kararlar.filter((x) => x.durum === "bekliyor");
      if (k.length) store.gonder({ tip: "KARAR", id: sec(a, k).id, secim: sec(a, ["yeniden-isle", "yeniden-siparis", "acil-bakim", "bekle", "yok"]) });
    } else if (r < 0.57) store.gonder({ tip: "VARDIYA", hat: sec(a, HAT_IDLER), acik: rastgele(a) < 0.5 });
    else if (r < 0.58) store.gonder({ tip: "IHTIYAC_GORULDU" });
    else if (r < 0.60) store.gonder({ tip: "GORULDU", oda: sec(a, ODALAR).id });
    else if (r < 0.603) store.gonder({ tip: "GUNU_BITIR" });
  },
};

/* "Günü bitir" gün kapanana kadar: duraklarda karar verir (bozuk parti → yeniden işle, makine → bekle) ya da onay alır */
function gunuBitir(store) {
  const duraklar = [];
  let sonuc = store.gonder({ tip: "GUNU_BITIR" });
  while (sonuc.durak && duraklar.length < 50) {
    duraklar.push({ ...sonuc.durak, dk: store.durum.dk });
    const { tur, id } = sonuc.durak;
    if (tur === "onay") store.gonder({ tip: "ONAY_AL", id });
    else store.gonder({ tip: "KARAR", id, secim: store.durum.kararlar.find((k) => k.id === id).tur === "bozuk-parti" ? "yeniden-isle" : "bekle" });
    sonuc = store.gonder({ tip: "GUNU_BITIR" });
  }
  return duraklar;
}
const enHizli = (malzeme) => AYARLAR.TEDARIKCILER.filter((t) => tedarikEdebilir(malzeme, t.id))
  .sort((a, b) => tedarikSuresi(malzeme, a.id) - tedarikSuresi(malzeme, b.id))[0].id;

/* ---------------- oyun döngüsü ---------------- */
function oyna(tip, { kayitDenemesi = false } = {}) {
  const store = olusturStore();
  const a = akis(20261023);
  const karneler = [];
  let adim = 0;
  while (true) {
    const d = store.durum;
    if (d.evre === "oyun") {
      oyuncular[tip](store, a);
      if (store.durum.evre === "oyun") {
        odaDurumlari(store.durum);
        sayaclar(store.durum);
        store.gonder({ tip: "ILERLE", dk: tip === "rastgele" ? tamSayi(a, 1, 20) : 5 });
      }
      adim += 1;
      if (adim % 7 === 0) durumuDenetle(store.durum, `${tip} ${store.durum.gun}. gün ${store.durum.dk}`);
      if (kayitDenemesi && adim % 37 === 0) kayitDongusu(store, tip);
      continue;
    }
    if (d.evre === "gun-sonu") {
      karneyiDenetle(d.karne, `${tip} ${d.gun}. gün karnesi`);
      durumuDenetle(d, `${tip} ${d.gun}. gün sonu`);
      karneler.push(d.karne);
      if (d.gun >= AYARLAR.GUNLER.length) break;
      store.gonder({ tip: "YARINA_GEC" });
      continue;
    }
    hata(`${tip}: bilinmeyen evre ${d.evre}`);
    break;
  }
  sayilariDenetle(store.durum, "durum", `${tip} son durum`);
  return { karneler, store };
}

/* Kayıt → yükleme: aynı durumu verir; aynı eylemlerle iki kopya aynı yere varır */
function kayitDongusu(store, tip) {
  const metin = kaydaYaz({ durum: store.durum, gunBasi: store.gunBasi });
  const okunan = kayittanOku(metin);
  if (!okunan.tamam) { hata(`${tip}: kayıt okunamadı (${okunan.neden})`); return; }
  if (JSON.stringify(okunan.durum) !== JSON.stringify(store.durum)) hata(`${tip}: kayıt-yükleme farklı durum verdi`);
  const ikinci = olusturStore({ durum: kopya(okunan.durum), gunBasi: okunan.gunBasi });
  const ilk = olusturStore({ durum: kopya(store.durum), gunBasi: store.gunBasi });
  for (const s of [ilk, ikinci]) {
    oyuncular.dogru(s);
    s.gonder({ tip: "ILERLE", dk: 45 });
    oyuncular.dogru(s);
  }
  if (JSON.stringify(ilk.durum) !== JSON.stringify(ikinci.durum)) hata(`${tip}: yüklenen kayıt aynı eylemlerle farklı yere vardı`);
}

/* ---------------- çalıştır ---------------- */
const sonuc = {};
for (const tip of ["pasif", "dogru", "rastgele"]) sonuc[tip] = oyna(tip, { kayitDenemesi: true }).karneler;

/* Aynı tohum, aynı eylemler → aynı sonuç */
const tekrar = oyna("dogru").karneler;
if (JSON.stringify(tekrar) !== JSON.stringify(sonuc.dogru)) hata("aynı tohum ve eylemler farklı karne verdi");

/* Sürümü uymayan ve bozuk kayıt okunmaz */
const bozuk = kaydaYaz({ durum: olusturStore().durum, gunBasi: null }).replace(`"surum":${AYARLAR.KAYIT_SURUMU}`, '"surum":-1');
if (kayittanOku(bozuk).neden !== "surum") hata("sürümü uymayan kayıt reddedilmedi");
if (kayittanOku("{bozuk").neden !== "bozuk") hata("bozuk kayıt reddedilmedi");

/* "Günü baştan oyna" gün başına döner */
{
  const s = olusturStore();
  const bas = JSON.stringify(s.durum);
  s.gonder({ tip: "PLANA_AL" });
  s.gonder({ tip: "ILERLE", dk: 120 });
  s.gonder({ tip: "GUNU_TEKRARLA" });
  if (JSON.stringify(s.durum) !== bas) hata("Günü baştan oyna gün başına dönmedi");
}

/* Yapay zeka yorumu yalnızca o günün karnesine yazılır ve kayıtla taşınır */
{
  const s = olusturStore();
  s.gonder({ tip: "GM_YORUMU", gun: 1, metin: "{hitap}, erken." });
  if (s.durum.karne !== null) hata("gün bitmeden Ajan GM yorumu yazıldı");
  gunuBitir(s);
  const sablon = s.durum.karne.gmYorum;
  s.gonder({ tip: "GM_YORUMU", gun: 2, metin: "{hitap}, yanlış gün." });
  s.gonder({ tip: "GM_YORUMU", gun: 1, metin: "Hitapsız metin." });
  if (s.durum.karne.gmYorum !== sablon || s.durum.karne.gmKaynak) hata("geçersiz Ajan GM yorumu kabul edildi");
  s.gonder({ tip: "GM_YORUMU", gun: 1, metin: "{hitap}, yapay zeka yorumu. Yarın için talimatım: planı erken yapın." });
  const okunan = kayittanOku(kaydaYaz({ durum: s.durum, gunBasi: s.gunBasi }));
  if (!okunan.tamam || okunan.durum.karne.gmKaynak !== "yapay-zeka" || !okunan.durum.karne.gmYorum.startsWith("{hitap}, yapay")) hata("yapay zeka yorumu kayda geçmedi");
}

/* "Günü bitir" olayları da işletir. 1. gün: en az 2 olay, 09:00–16:00 arasında, her biri kendi diliminde, biri Kalite
   bozuk parti. 09:00'da bitiren oyuncu bütün olayları görür; karar isteyen olayda ilerleme durur ve karar verilmeden
   sürmez; karar verilince 18:00'e kadar sürer. */
let erken = null;
{
  const [bas, son] = AYARLAR.OLAY_SAATI.map((x) => x * 60);
  const s = olusturStore();
  const plan = s.durum.olayPlani;
  const dilim = (son - bas) / plan.length;
  if (plan.length < 2) hata(`1. günde ${plan.length} olay var, en az 2 olmalı`);
  if (plan.some((o, i) => o.dk < bas + i * dilim || o.dk >= bas + (i + 1) * dilim)) hata(`olaylar 09:00–16:00 dilimlerine dağılmadı: ${plan.map((o) => o.dk).join(", ")}`);
  for (const t of AYARLAR.GUNLER[0].zorunluOlay || []) if (!plan.some((o) => o.tur === t)) hata(`1. günde zorunlu olay yok: ${t}`);
  while (s.durum.dk < 9 * 60) { oyuncular.dogru(s); s.gonder({ tip: "ILERLE", dk: 5 }); }
  const ilk = s.gonder({ tip: "GUNU_BITIR" });
  if (!ilk.durak || ilk.durak.tur !== "karar") hata("Günü bitir karar isteyen olayda durmadı");
  else {
    const dk = s.durum.dk;
    const ikinci = s.gonder({ tip: "GUNU_BITIR" });
    if (!ikinci.durak || ikinci.durak.id !== ilk.durak.id || s.durum.dk !== dk) hata("karar verilmeden Günü bitir sürdü");
    if (s.durum.olayPlani.some((o) => o.dk < dk - 1 && o.durum !== "oldu")) hata("Günü bitir durağa kadar olay atladı");
  }
  gunuBitir(s);
  const k = s.durum.karne;
  if (s.durum.evre !== "gun-sonu" || !k) hata("Günü bitir günü kapatmadı");
  else {
    if (s.durum.olayPlani.some((o) => o.durum !== "oldu")) hata("Günü bitir olay atladı");
    if (k.olaylar.length !== plan.length) hata(`karnede ${k.olaylar.length} olay var, planda ${plan.length}`);
    if (s.durum.kararlar.some((x) => x.durum === "zaman-asimi")) hata("Günü bitir durağındaki karar zaman aşımına düştü");
    erken = k;
  }
}
/* Durakta "Yeniden sipariş" seçip sipariş veren oyuncu: ilerleme siparişin onayında da durur, sipariş düşmez */
{
  const s = olusturStore();
  const r = s.gonder({ tip: "GUNU_BITIR" });
  const k = r.durak && s.durum.kararlar.find((x) => x.id === r.durak.id);
  if (!k || k.tur !== "bozuk-parti") hata("08:00'da Günü bitir bozuk partide durmadı");
  else {
    const { satinAlma } = s.gonder({ tip: "KARAR", id: k.id, secim: "yeniden-siparis" });
    if (!s.durum.bitirme || s.durum.bitirme.siparis !== satinAlma.malzeme) hata("yeniden sipariş kararı ilerlemeyi bekletmedi");
    const { id } = s.gonder({ tip: "SIPARIS_VER", malzeme: satinAlma.malzeme, tedarikci: enHizli(satinAlma.malzeme), miktar: satinAlma.miktar });
    const r2 = s.gonder({ tip: "GUNU_BITIR" });
    if (!r2.durak || r2.durak.tur !== "onay" || r2.durak.id !== id) hata("durakta verilen siparişin onayında durmadı");
    gunuBitir(s);
    const sip = s.durum.satinalma.find((x) => x.id === id);
    if (!sip || sip.durum === "dustu") hata("durakta verilen sipariş onaysız düştü");
    if (s.durum.bitirme !== null) hata("gün kapanınca Günü bitir durumu temizlenmedi");
  }
}

/* Görev notu sayaçları: sipariş adımı her GEÇ KALINDI / BUGÜN VER kalemiyle bir artar ("1/2");
   onay adımı bugün verilen siparişleri, onay alındıkça sayar */
{
  const s = olusturStore();
  s.gonder({ tip: "PLANA_AL" });
  const kalemler = verilmeyenSiparisler(s.durum);
  const bas = gorevSayaclari(s.durum);
  if (kalemler.length < 2 || bas.siparis.yapilan !== 0 || bas.siparis.toplam !== kalemler.length) hata(`görev sayacı başta ${JSON.stringify(bas.siparis)}, kalem ${kalemler.length}`);
  kalemler.forEach((m, i) => {
    s.gonder({ tip: "SIPARIS_VER", malzeme: m.id, tedarikci: m.yetisen.length ? m.yetisen[0] : enHizli(m.id), miktar: m.onerilen });
    const c = gorevSayaclari(s.durum);
    if (c.siparis.yapilan !== i + 1 || c.siparis.toplam !== kalemler.length) hata(`${i + 1}. siparişten sonra sipariş sayacı ${JSON.stringify(c.siparis)}`);
    if (c.onay.yapilan !== 0 || c.onay.toplam !== i + 1) hata(`${i + 1}. siparişten sonra onay sayacı ${JSON.stringify(c.onay)}`);
  });
  s.gonder({ tip: "ILERLE", dk: AYARLAR.YANIT_SURESI_DK[1] + 1 });
  s.durum.satinalma.filter((x) => x.durum === "onay-bekliyor").forEach((x, i) => {
    s.gonder({ tip: "ONAY_AL", id: x.id });
    const c = gorevSayaclari(s.durum);
    if (c.onay.yapilan !== i + 1) hata(`${i + 1}. onaydan sonra onay sayacı ${JSON.stringify(c.onay)}`);
  });
  const son = gorevSayaclari(s.durum);
  if (son.onay.yapilan !== son.onay.toplam || son.siparis.yapilan !== son.siparis.toplam) hata(`görev sayaçları tamamlanmadı: ${JSON.stringify(son)}`);
}

/* Ana sayfadaki karne örneği motorun bugünkü çıktısıyla aynı olmalı (uydurma ya da eskimiş sayı yok) */
if (fs.readFileSync(new URL("../data/karne-ornegi.json", import.meta.url), "utf8") !== ornekMetni()) {
  hata("data/karne-ornegi.json motorun çıktısıyla uyuşmuyor: node scripts/karne-ornegi.mjs && python3 scripts/derle.py");
}

/* Denge (1. gün): hiçbir şey yapmayan E, rastgele oynayan C–D, her şeyi doğru yapan A–B. Rastgele oyuncu
   DENGE_TOHUM farklı tohumla oynar; en az %80'i C–D olmalı. Eşikler ayarlar.js'te (HARF_NOTU, PUAN). */
const DENGE_TOHUM = 200;
const ort = (l) => l.reduce((t, k) => t + k.puan, 0) / l.length;
if (ort(sonuc.dogru) < ort(sonuc.pasif) + 20) hata(`denge: doğru oyuncu (${ort(sonuc.dogru)}) pasiften (${ort(sonuc.pasif)}) yeterince iyi değil`);
if (!["A", "B"].includes(sonuc.dogru[0].harf)) hata(`denge: doğru oyuncu 1. gün ${sonuc.dogru[0].harf} aldı`);
if (sonuc.pasif[0].harf !== "E") hata(`denge: pasif oyuncu 1. gün ${sonuc.pasif[0].harf} aldı`);
const rastgele1 = Array.from({ length: DENGE_TOHUM }, (_, i) => {
  const s = olusturStore();
  const a = akis(20261023 + i);
  while (s.durum.evre === "oyun") {
    oyuncular.rastgele(s, a);
    if (s.durum.evre === "oyun") s.gonder({ tip: "ILERLE", dk: tamSayi(a, 1, 20) });
  }
  return s.durum.karne;
});
const harfSayisi = (l) => ["A", "B", "C", "D", "E"].map((h) => `${h} ${l.filter((k) => k.harf === h).length}`).join(" · ");
const rPuan = rastgele1.map((k) => k.puan).sort((x, y) => x - y);
const dilimPuan = (q) => rPuan[Math.min(rPuan.length - 1, Math.floor(q * rPuan.length))];
const cdOrani = rastgele1.filter((k) => k.harf === "C" || k.harf === "D").length / DENGE_TOHUM;
if (cdOrani < 0.8) hata(`denge: rastgele oyuncunun 1. gün C–D oranı %${Math.round(cdOrani * 100)}`);

console.log("gün  " + Object.keys(sonuc).map((t) => `${t} (ort. ${Math.round(ort(sonuc[t]))})`.padEnd(30)).join(""));
for (let i = 0; i < AYARLAR.GUNLER.length; i++) {
  console.log(`${String(i + 1).padEnd(5)}` + Object.values(sonuc).map((l) => {
    const k = l[i];
    return `${k.harf} ${String(k.puan).padStart(3)}  teslim ${k.teslim.zamaninda}/${k.teslim.toplam}  duruş ${k.durus.saat} sa  unutulan ${k.unutulan.sayi}`.padEnd(30).slice(0, 29) + " ";
  }).join(""));
}
console.log(`\n1. gün puan dağılımı (harf eşikleri ${AYARLAR.HARF_NOTU.map((h) => `${h.harf} ≥ ${h.alt}`).join(", ")})`);
console.log(`  hiçbir şey yapmayan: ${sonuc.pasif[0].harf} ${sonuc.pasif[0].puan}`);
console.log(`  her şeyi doğru yapan: ${sonuc.dogru[0].harf} ${sonuc.dogru[0].puan}`);
console.log(`  rastgele oynayan (${DENGE_TOHUM} tohum): en düşük ${rPuan[0]} · %10 ${dilimPuan(0.1)} · medyan ${dilimPuan(0.5)} · %90 ${dilimPuan(0.9)} · en yüksek ${rPuan[rPuan.length - 1]}; ${harfSayisi(rastgele1)} (C–D %${Math.round(cdOrani * 100)})`);
if (erken) console.log(`  09:00'da "Günü bitir"e basan (duraklarda karar veren doğru oyuncu): ${erken.harf} ${erken.puan}, ${erken.olaylar.length} olay`);
if (hataSayisi) { console.error(`\n${hataSayisi} sorun bulundu.`); process.exit(1); }
console.log("\n✓ sim-test: 3 oyuncu × 5 gün, kayıt-yükleme, tohum, Günü bitir olayları, görev sayaçları, karne örneği ve Ajan GM yorumu denetimleri geçti.");
