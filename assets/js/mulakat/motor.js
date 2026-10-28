/* Mülakat Testi · puanlama ve rapor motoru (saf fonksiyonlar; DOM'a dokunmaz, tarayıcıda ve Node'da aynı çalışır).
   veri: /mulakat/veri/test.json (alanlar, tarzlar, kararlar, sorular → secenekler { metin, puan, tarz }).
   cevaplar: 30 öğe, her biri { k: şıkın veri içindeki sırası, ms: o soruda geçen süre }.
   kilitli: /api/mulakat/'tan gelen { sorular: [{ no, olcer, ornek, not?, yorumlar[4] }] } ya da null.
   Puan: güçlü cevap 3, eksik 2, zayıf 1, kırmızı bayrak 0. Tarzlar: G hazırlıklı, E kalıp, F filtresiz, C çekingen, A iddialı. */

export const ETIKET = { 0: "Kırmızı bayrak", 1: "Zayıf", 2: "Eksik" };
const HATA_TARZLARI = ["F", "A", "C", "E"]; // eşitlikte soldaki ağır basar

/* Karar: puan eşiği ve kırmızı bayrak sınırı birlikte */
export function kararVer(puan, kirmizi) {
  if (puan >= 85 && kirmizi === 0) return "teklif";
  if (puan >= 70 && kirmizi <= 1) return "ikinci";
  if (puan >= 50 && kirmizi <= 3) return "bekleme";
  return "olumsuz";
}

/* Yalnız puana göre karar (kırmızı bayrak kararı aşağı çektiyse raporda söylenir) */
export function puanKarari(puan) {
  if (puan >= 85) return "teklif";
  if (puan >= 70) return "ikinci";
  if (puan >= 50) return "bekleme";
  return "olumsuz";
}

export function sureYazi(ms) {
  const sn = Math.max(0, Math.round(ms / 1000));
  const dk = Math.floor(sn / 60);
  return dk ? `${dk} dk ${sn % 60} sn` : `${sn} sn`;
}

const kucuk = (metin) => metin.toLocaleLowerCase("tr-TR");

export function degerlendir(veri, cevaplar) {
  const sorular = veri.sorular;
  const n = sorular.length;
  const alanSira = Object.keys(veri.alanlar);
  let toplam = 0;
  const kirmizi = [], guclu = [], eksik = [];
  const alanP = {}, alanM = {};
  const tarzSay = { G: 0, E: 0, F: 0, C: 0, A: 0 };
  const tarzVar = { E: 0, F: 0, C: 0, A: 0 };
  const tarzSecim = { G: [], E: [], F: [], C: [], A: [] };

  sorular.forEach((q, i) => {
    const o = q.secenekler[cevaplar[i].k];
    toplam += o.puan;
    alanP[q.alan] = (alanP[q.alan] || 0) + o.puan;
    alanM[q.alan] = (alanM[q.alan] || 0) + 3;
    tarzSay[o.tarz]++;
    tarzSecim[o.tarz].push(i);
    q.secenekler.forEach((x) => { if (x.tarz !== "G") tarzVar[x.tarz]++; });
    if (o.tarz === "G") guclu.push(i); else eksik.push(i);
    if (o.puan === 0) kirmizi.push(i);
  });

  const puan = Math.round((toplam / (n * 3)) * 100);
  const alanlar = alanSira.map((kod) => ({
    kod, ad: veri.alanlar[kod].ad, puan: alanP[kod], max: alanM[kod],
    yuzde: Math.round((alanP[kod] / alanM[kod]) * 100),
  }));
  const zayifSira = [...alanlar].sort((a, b) => a.yuzde - b.yuzde || alanSira.indexOf(a.kod) - alanSira.indexOf(b.kod));

  /* Cevap profili: 30'da 24 ve üstü güçlü cevap "Hazırlıklı"; değilse seçilme oranı (seçilen / testte o tarzda şık) en yüksek hata tarzı */
  let profil = "G";
  if (tarzSay.G < 24) {
    let enYuksek = -1;
    for (const t of HATA_TARZLARI) {
      const oran = tarzSay[t] / tarzVar[t];
      if (oran > enYuksek + 1e-9) { enYuksek = oran; profil = t; }
    }
  }
  let egilim = null, egilimSay = 0;
  for (const t of HATA_TARZLARI) if (tarzSay[t] > egilimSay) { egilimSay = tarzSay[t]; egilim = t; }

  const p = (i) => sorular[i].secenekler[cevaplar[i].k].puan;
  eksik.sort((a, b) => p(a) - p(b) || a - b);

  /* Duraksama: en az 8 sn ve sürelerin ortancasının 1,6 katı; en uzun üç soru */
  const sureler = cevaplar.map((c) => c.ms || 0);
  const sirali = [...sureler].sort((a, b) => a - b);
  const ortanca = sirali[Math.floor(sirali.length / 2)];
  const tereddut = sureler
    .map((ms, i) => ({ i, ms }))
    .filter((x) => x.ms >= 8000 && x.ms >= 1.6 * ortanca)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 3)
    .map((x) => x.i);

  return {
    toplam, puan, kirmizi, guclu, eksik, alanlar, zayifSira, tarzSay, tarzVar, tarzSecim,
    profil, egilim, karar: kararVer(puan, kirmizi.length), puanKarari: puanKarari(puan),
    tereddut, sureler, sure: sureler.reduce((a, b) => a + b, 0),
  };
}

export function raporCumleleri(veri, d) {
  const n = veri.sorular.length;
  const g = d.tarzSay.G, hata = n - g, k = d.kirmizi.length;
  const tarz = veri.tarzlar, alan = veri.alanlar;

  let profilGiris = `${n} cevabınızın ${g} tanesi en güçlü cevaptı.`;
  if (d.profil === "G") {
    if (d.egilim && d.tarzSay[d.egilim] >= 2) profilGiris += ` Kaydığınız yerlerde en sık ${tarz[d.egilim].sifat} cevaba gittiniz.`;
  } else {
    profilGiris += ` Kaydığınız ${hata} cevabın ${d.tarzSay[d.profil]} tanesi ${tarz[d.profil].sifat} cevap.`;
  }

  const kirmiziCumle = k === 0
    ? "Kırmızı bayrak yok. Bu tek başına bir avantajdır."
    : k === 1
      ? "Bir cevabınız kırmızı bayrak. Gerçek bir görüşmede tek başına eleme sebebi olabilir."
      : `${k} cevabınız kırmızı bayrak. Gerçek bir görüşmede bunlardan biri bile tek başına eleme sebebi olabilir.`;

  const kisitCumle = d.puanKarari !== d.karar
    ? `Puanınız “${kucuk(veri.kararlar[d.puanKarari].ad)}” için yeterliydi; ${k === 1 ? "kırmızı bayrak" : "kırmızı bayraklar"} kararı aşağı çekti.`
    : "";

  const z = d.zayifSira;
  const talimatlar = [tarz[d.profil].talimat];
  if (z[0].yuzde === 100) {
    talimatlar.push(alan.motivasyon.talimat);
    talimatlar.push("Bu testi bir kez daha çözün; bu kez her şıkkı seçmeden önce cevabı kendi cümlenizle sesli söyleyin.");
  } else {
    talimatlar.push(alan[z[0].kod].talimat);
    if (k > 0) {
      talimatlar.push(`Kırmızı bayrak taşıyan ${k === 1 ? "cevabınızı" : `${k} cevabınızı`} bir kâğıda yazın, yanına bu rapordaki örnek cevabı koyun ve görüşmeden önce yüksek sesle okuyun.`);
    } else if (d.tereddut.length) {
      const adlar = d.tereddut.map((i) => kucuk(veri.sorular[i].kisa)).join(", ");
      talimatlar.push(`En uzun düşündüğünüz sorular için (${adlar}) bir arkadaşınızla sesli prova yapın.`);
    } else {
      talimatlar.push(alan[z[1].kod].talimat);
    }
  }

  const eksikGiris = d.eksik.length
    ? `${n} cevabın ${d.eksik.length} tanesinde daha güçlü bir cevap vardı.${k ? " Önce kırmızı bayraklar." : ""}`
    : "Bütün sorularda en güçlü cevabı seçtiniz. Örnek cevapları yine de okuyun ve kendi hikâyenizi onlara göre kurun.";

  return { profilGiris, kirmiziCumle, kisitCumle, talimatlar, eksikGiris };
}

/* Ajan GM yorumunun başındaki "Kırmızı bayrak." işareti rozet olarak ayrıca gösterilir */
export function yorumTemiz(y) {
  return String(y || "").replace(/^Kırmızı bayrak\.\s*/, "");
}

/* "Raporu kopyala" metni. Kilit açık değilse Ajan GM yorumları ve örnek cevaplar yerine kilit notu yazılır. */
export function raporMetni(veri, d, cevaplar, ek, kilitli) {
  const c = raporCumleleri(veri, d);
  const kr = veri.kararlar[d.karar];
  const tz = veri.tarzlar[d.profil];
  const n = veri.sorular.length;
  const sat = [];
  sat.push("AJAN GM · ADAY RAPORU");
  sat.push(`Dosya ${ek.dosyaNo} · ${ek.tarih} · Süre ${sureYazi(d.sure)}`);
  sat.push("");
  sat.push(`KARAR: ${kr.ad} (${kr.alt})`);
  sat.push(`Puan ${d.puan}/100 · Güçlü cevap ${d.tarzSay.G}/${n} · Kırmızı bayrak ${d.kirmizi.length}`);
  sat.push(c.kirmiziCumle + (c.kisitCumle ? " " + c.kisitCumle : ""));
  sat.push("");
  sat.push(kr.acilis);
  sat.push("");
  sat.push(`CEVAP PROFİLİ: ${tz.profil}. ${tz.ozet}`);
  sat.push(c.profilGiris);
  sat.push(tz.metin);
  sat.push("");
  sat.push("ALANLAR");
  d.alanlar.forEach((a) => sat.push(`- ${a.ad}: %${a.yuzde}`));
  sat.push("");
  sat.push("BİR SONRAKİ GÖRÜŞMENİZ İÇİN TALİMATIM");
  c.talimatlar.forEach((t, i) => sat.push(`${i + 1}. ${t}`));
  sat.push("");
  sat.push("ŞUNU DEDİNİZ, ŞUNU DEYİN");
  sat.push(c.eksikGiris);
  d.eksik.forEach((i) => {
    const q = veri.sorular[i], k = cevaplar[i].k, o = q.secenekler[k];
    const ks = kilitli && kilitli.sorular ? kilitli.sorular.find((x) => x.no === q.no) : null;
    sat.push("");
    sat.push(`S${q.no} · ${q.soru} [${ETIKET[o.puan]}]`);
    sat.push(`Cevabınız: ${o.metin}`);
    if (ks) {
      sat.push(`Ajan GM: ${yorumTemiz(ks.yorumlar[k])}`);
      sat.push(`Şöyle deyin: ${ks.ornek}${ks.not ? " (" + ks.not + ")" : ""}`);
    }
  });
  if (d.eksik.length && !kilitli) {
    sat.push("");
    sat.push(`Ajan GM'in yorumları ve örnek cevaplar erişim koduyla açılır: ${ek.adres}`);
  }
  sat.push("");
  sat.push("Gerçek görüşmede karşınızda ben olmayacağım. Ama sorular aynı olacak, bakan gözler de. (Ajan GM)");
  sat.push("Celcini Mülakat Testi · Alıştırma ve öz değerlendirme aracıdır, iş garantisi vermez.");
  return sat.join("\n");
}
