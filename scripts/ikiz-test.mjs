#!/usr/bin/env node
/* Fabrika İkizi model testi (DOM'suz): uzay/ikiz/js/hesap.js ve veri.js.
   Denetler: verinin bütünlüğü (3 hat, 11 iş merkezi, 20 mamul, her mamulün rotası ve 20 günlük planı), ilk günün plan yükü
   oranlarının Fabrika Motoru'nun KAPASİTE sayfasıyla aynı olması (veri.js'teki dosya değerleri), akış korunumu
   (plan = üretim + hatta kalan), stok dengesi, kapasite 0 (arıza) olan iş merkezinin önünde işin birikmesi, kolların yönü
   (üçüncü vardiya ve fason aşımı azaltır, talep artışı artırır), senaryo adlarının dosyayla eşleşmesi.
   Çalıştırma: node scripts/ikiz-test.mjs */
import { VERI } from "../uzay/ikiz/js/veri.js";
import { hesapla, senaryoVarsayilan, kapasiteDk, hatIsMerkezleri } from "../uzay/ikiz/js/hesap.js";

let hataSayisi = 0, denetim = 0;
const hata = (m) => { console.error("✗ " + m); hataSayisi += 1; };
const bekle = (kosul, m) => { denetim += 1; if (!kosul) hata(m); };
const toplam = (o) => Object.values(o).reduce((a, b) => a + b, 0);

/* Veri bütünlüğü */
bekle(VERI.hatlar.length === 3, `hat sayısı ${VERI.hatlar.length} ≠ 3`);
bekle(VERI.is_merkezleri.length === 11, `iş merkezi sayısı ${VERI.is_merkezleri.length} ≠ 11`);
bekle(VERI.mamuller.length === 20, `mamul sayısı ${VERI.mamuller.length} ≠ 20`);
bekle(VERI.gunler.length === 20, `gün sayısı ${VERI.gunler.length} ≠ 20`);
bekle(VERI.gunler[0] === VERI.bugun, "ilk gün planlama tarihi değil");
VERI.mamuller.forEach(m => {
  bekle((VERI.rota[m.kod] || []).length >= 3, `${m.kod}: rota eksik`);
  bekle((VERI.mps[m.kod] || []).length === 20, `${m.kod}: 20 günlük plan yok`);
  bekle(VERI.hatlar.some(h => h.kod === m.hat), `${m.kod}: hat ${m.hat} tanımsız`);
  (VERI.rota[m.kod] || []).forEach(r => bekle(VERI.is_merkezleri.some(i => i.kod === r.im), `${m.kod}: iş merkezi ${r.im} tanımsız`));
});
VERI.hatlar.forEach(h => {
  const ims = hatIsMerkezleri(VERI, h.kod);
  bekle(ims.length >= 3, `${h.kod}: iş merkezi az`);
  VERI.mamuller.filter(m => m.hat === h.kod).forEach(m => {
    const sira = (VERI.rota[m.kod] || []).map(r => ims.findIndex(i => i.kod === r.im));
    bekle(sira.every((s, k) => s >= 0 && (k === 0 || s > sira[k - 1])), `${m.kod}: rota hattın proses sırasına uymuyor (${sira})`);
  });
});
const anahtarlar = new Set();
VERI.is_merkezleri.forEach(i => { bekle(!anahtarlar.has(i.kod), `yinelenen iş merkezi ${i.kod}`); anahtarlar.add(i.kod);
  bekle(i.istasyon >= 1 && i.verim > 0 && i.verim <= 1, `${i.kod}: istasyon/verim`); });
/* Gizlilik: veri yalnız örnek tesise ait olmalı — tesis adı "Örnek" ile başlar, kodlar kalıba uyar, müşteri adları
   jenerik (… Müşterisi/Üreticisi/Distribütörü + harf); e-posta ve telefon yok. Gerçek ad listesi tutulmaz. */
const metin = JSON.stringify(VERI);
bekle(!/[\w.-]+@[\w.-]+\.\w+/.test(metin), "veride e-posta var");
bekle(!/\b0?5\d{2}[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}\b/.test(metin), "veride telefon var");
bekle(/^Örnek /.test(VERI.tesis), "tesis adı örnek tesis değil");
VERI.mamuller.forEach(m => { bekle(/^MML-\d{3}$/.test(m.kod) && /^MUS-\d{2}$/.test(m.musteri), `${m.kod}: kod kalıbı`);
  bekle(/ (Müşterisi|Üreticisi|Distribütörü) [A-Z]$/.test(m.musteri_adi), `${m.kod}: müşteri adı jenerik değil`); });
VERI.hatlar.forEach(h => bekle(/^HT-\d{2}$/.test(h.kod) && / Hattı$/.test(h.ad), `${h.kod}: hat adı kalıbı`));
VERI.is_merkezleri.forEach(i => bekle(/^IM-\d{2}$/.test(i.kod), `${i.kod}: iş merkezi kodu kalıbı`));

/* Kapasite: iki vardiya × 450 dk × istasyon × verim; dosyadaki günlük kapasiteyle aynı */
VERI.is_merkezleri.forEach(i => bekle(Math.abs(kapasiteDk(i, senaryoVarsayilan(), 1) - i.kapasite_dk) < 0.5, `${i.kod}: kapasite ${kapasiteDk(i, senaryoVarsayilan(), 1)} ≠ dosya ${i.kapasite_dk}`));

/* Baz: ilk günün plan yükü oranı (üst iş merkezinden bağımsız, dosyadaki tanım) KAPASİTE sayfasıyla aynı;
   akışla gelen oran, önündeki iş merkezi kapasiteyi aşmıyorsa plan oranına eşit, aşıyorsa ondan küçük */
const baz = hesapla(VERI);
VERI.is_merkezleri.forEach(i => bekle(Math.abs(baz.gunler[0].planOran[i.kod] - VERI.yuk[i.kod][0]) < 1e-4, `${i.kod}: 1. gün plan oranı ${baz.gunler[0].planOran[i.kod].toFixed(4)} ≠ dosya ${VERI.yuk[i.kod][0]}`));
/* 20 günün tamamı: plan yükü oranı (devreden iş hariç) dosyanın KAPASİTE sayfasındaki günlük oranla aynı */
baz.gunler.forEach((g, k) => VERI.is_merkezleri.forEach(i => bekle(Math.abs(g.planOran[i.kod] - VERI.yuk[i.kod][k]) < 1e-4, `${i.kod} g${k + 1}: plan oranı ${g.planOran[i.kod].toFixed(4)} ≠ dosya ${VERI.yuk[i.kod][k]}`)));
VERI.is_merkezleri.forEach(i => bekle(baz.gunler[0].oran[i.kod] <= baz.gunler[0].planOran[i.kod] + 1e-9, `${i.kod}: akış oranı plan oranını aşıyor`));
bekle(Math.abs(baz.gunler[0].oran["IM-11"] - VERI.yuk["IM-11"][0]) < 0.002, "ilk iş merkezinde akış oranı dosyayla aynı olmalı");
bekle(baz.gunler[0].oran["IM-32"] < baz.gunler[0].planOran["IM-32"], "IM-31 aşımdayken IM-32'ye daha az iş gelmeli");
/* Akış korunumu: Σ plan = Σ üretim + hatta kalan; stok = açılış + üretim − sevk */
const planT = baz.gunler.reduce((a, g) => a + toplam(g.plan), 0);
bekle(planT === baz.ozet.uretim + baz.ozet.birikim, `akış: plan ${planT} ≠ üretim ${baz.ozet.uretim} + kalan ${baz.ozet.birikim}`);
const acilis = VERI.mamuller.reduce((a, m) => a + m.acilis_stok, 0);
bekle(toplam(baz.gunler[19].stok) === acilis + baz.ozet.uretim - baz.ozet.sevk, "stok dengesi tutmuyor");
baz.gunler.forEach(g => { VERI.mamuller.forEach(m => bekle(g.stok[m.kod] >= 0 && g.birikim[m.kod] >= 0, `${m.kod} g${g.gun}: eksi stok/birikim`)); });
bekle(baz.ozet.otd > 0.9 && baz.ozet.otd <= 1, `Baz OTD ${baz.ozet.otd}`);
bekle(baz.ozet.talep === Object.values(VERI.talep20).reduce((a, b) => a + b, 0), `20 günlük sevk talebi ${baz.ozet.talep} ≠ dosyadaki net talep toplamı`);
bekle(baz.ozet.asim > 0, "Baz'da aşım yok (dosyada darboğaz var)");
bekle(baz.ozet.enYuksekIm === "IM-32", `Baz darboğaz ${baz.ozet.enYuksekIm} ≠ IM-32 (dosya: Lehim ve Montaj)`);

/* Kuyruk: arıza günlerinde iş merkezinin önünde iş birikir, sonra erir */
const ariza = hesapla(VERI, Object.assign(senaryoVarsayilan(), { ariza: { im: "IM-11", bas: 2, bit: 3 } }));
bekle(ariza.gunler[1].kap["IM-11"] === 0 && ariza.gunler[2].kap["IM-11"] === 0 && ariza.gunler[3].kap["IM-11"] > 0, "arıza kapasiteyi sıfırlamıyor");
bekle(ariza.gunler[2].kuyruk["IM-11"] > baz.gunler[2].kuyruk["IM-11"], "arızada iş birikmiyor");
bekle(ariza.gunler[19].kuyruk["IM-11"] === 0, "arızadan sonra kuyruk erimedi");
bekle(ariza.ozet.uretim <= baz.ozet.uretim && ariza.ozet.otd <= baz.ozet.otd, "arıza üretimi/OTD'yi düşürmüyor");

/* Kolların yönü */
const vardiya = hesapla(VERI, Object.assign(senaryoVarsayilan(), { vardiya3: true }));
const fason = hesapla(VERI, Object.assign(senaryoVarsayilan(), { fason: true }));
const talep = hesapla(VERI, Object.assign(senaryoVarsayilan(), { talep: 0.25 }));
bekle(vardiya.ozet.asim < baz.ozet.asim, "üçüncü vardiya aşımı düşürmüyor");
bekle(fason.ozet.asim < baz.ozet.asim, "fason aşımı düşürmüyor");
bekle(talep.ozet.asim > baz.ozet.asim && talep.ozet.uretim > baz.ozet.uretim, "talep artışı yük ve üretimi artırmıyor");
bekle(vardiya.ozet.hatlar[0].mevcutAdamSaat > baz.ozet.hatlar[0].mevcutAdamSaat, "üçüncü vardiya personeli artırmıyor");
VERI.is_merkezleri.forEach(i => bekle(kapasiteDk(i, Object.assign(senaryoVarsayilan(), { vardiya3: true }), 1) > kapasiteDk(i, senaryoVarsayilan(), 1), `${i.kod}: vardiya kapasiteyi artırmıyor`));
VERI.is_merkezleri.filter(i => !i.fason).forEach(i => bekle(kapasiteDk(i, Object.assign(senaryoVarsayilan(), { fason: true }), 1) === kapasiteDk(i, senaryoVarsayilan(), 1), `${i.kod}: fason mümkün değilken kapasite değişti`));

/* Senaryolar dosyayla aynı */
bekle(VERI.senaryolar.length === 4 && VERI.senaryolar[0].ad === "Baz", "senaryo listesi");
VERI.senaryolar.forEach(s => { const r = hesapla(VERI, Object.assign(senaryoVarsayilan(), { talep: s.talep, kapasite: s.kapasite })); bekle(r.gunler.length === 20, `${s.ad}: hesap`); });
/* Belirlenimci: aynı girdi aynı sonuç */
bekle(JSON.stringify(hesapla(VERI).ozet) === JSON.stringify(baz.ozet), "model belirlenimci değil");

if (hataSayisi) { console.error(`✗ ikiz-test: ${hataSayisi} hata (${denetim} denetim)`); process.exit(1); }
console.log(`✓ ikiz-test: ${denetim} denetim geçti. Baz: aşım ${baz.ozet.asim}, en yüksek yük %${Math.round(baz.ozet.enYuksek * 100)} (${baz.ozet.enYuksekIm}), OTD %${(baz.ozet.otd * 100).toFixed(1)}; fason açık: aşım ${fason.ozet.asim}; üçüncü vardiya: aşım ${vardiya.ozet.asim}.`);
