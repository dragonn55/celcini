/* Gün sonu karnesi: zamanında teslim, hat duruşu, depoda bağlanan para, unutulan işler, puan ve harf notu;
   ardından Ajan GM yorumu ve "Yarına geç". Sayılar yalnızca o günün durumundan gelir. */
import { AYARLAR } from "../ayarlar.js";
import { PUAN_TURU_ADI } from "../motor/puan.js";
import { sayi, tl, ondalik, saat, gunAdi } from "../bicim.js";
import { h, ikon } from "./dom.js";
import { bolum, bos } from "./ortak.js";

/* Ajan GM'nin daire avatarı (giriş, karne, sorgula, kilit): tarayıcı destekliyorsa WebP, yoksa PNG */
export function ajanGmGorseli(sinif = "fk-gm") {
  const { webp, png } = AYARLAR.AJAN_GM_AVATAR;
  return h("picture", { sinif },
    h("source", { type: "image/webp", srcset: webp }),
    h("img", { src: png, alt: "", width: "512", height: "512", decoding: "async" }));
}

export const hitapla = (metin, hitap) => metin.split("{hitap}").join(hitap);

/* Karnenin dört göstergesi (simülatör karnesi ve ana sayfadaki karne örneği aynı metni kullanır) */
export function karneOlculeri(k) {
  return [
    { ad: "Zamanında teslim", deger: k.teslim.yuzde === null ? "—" : `%${k.teslim.yuzde}`,
      alt: k.teslim.toplam ? `${sayi(k.teslim.zamaninda)} / ${sayi(k.teslim.toplam)} satır${k.teslim.gecSevk ? ` · ${sayi(k.teslim.gecSevk)} gecikmiş satır da çıktı` : ""}` : "Bugün teslim günü gelen satır yoktu" },
    { ad: "Hat duruşu", deger: `${ondalik(k.durus.saat)} saat`, alt: `Ahşap\u00a0${ondalik(k.durus.hatlar.ahsap ?? 0)} · Metal\u00a0${ondalik(k.durus.hatlar.metal ?? 0)}` },
    { ad: "Depoda bağlanan para", deger: tl(k.bagliPara), alt: "Malzeme ve mamul stoğu" },
    { ad: "Unutulan iş", deger: sayi(k.unutulan.sayi), alt: k.unutulan.sayi ? "Her biri puan düşürdü" : "Hiç yok" },
  ];
}

const olcu = ({ ad, deger, alt }) => h("div", { sinif: "fk-olcu" }, h("dt", { metin: ad }), h("dd", {}, h("span", { sinif: "fk-olcu-deger", metin: deger }), alt ? h("span", { sinif: "fk-olcu-alt", metin: alt }) : null));

export function karneEkrani({ durum, eylemler, gmBolumu, kilitli }) {
  const k = durum.karne;
  const son = durum.gun >= AYARLAR.GUNLER.length;
  const gece = Object.values(k.gece || {}).length;

  const defter = k.defter.length
    ? h("ul", { sinif: "fk-defter" }, k.defter.map((x) => h("li", { sinif: x.puan < 0 ? "fk-eksi" : "fk-arti" },
      h("span", { metin: x.metin }), h("span", { sinif: "fk-sayi", metin: `${x.puan > 0 ? "+" : ""}${x.puan}` }))))
    : bos("Bugün puanı değiştiren bir kayıt yok.");

  const olaylar = k.olaylar.length
    ? h("ul", { sinif: "fk-olaylar" }, k.olaylar.map((o) => h("li", { sinif: "fk-olay" }, h("span", { sinif: "fk-olay-saat", metin: saat(o.dk) }), h("span", { metin: o.metin }))))
    : bos("Bugün olay yaşanmadı.");

  return h("div", { sinif: "kap fk-karne" },
    h("div", { sinif: "kart fk-karne-kart" },
      h("div", { sinif: "fk-karne-bas" },
        h("div", {},
          h("p", { sinif: "ust-yazi", metin: "Gün sonu karnesi" }),
          h("h1", { tabindex: "-1", id: "fk-karne-baslik", metin: gunAdi(k.gun) })),
        h("div", { sinif: `fk-harf fk-harf-${k.harf}`, "aria-label": `Harf notu ${k.harf}, puan ${k.puan}` },
          h("span", { sinif: "fk-harf-harf", metin: k.harf }), h("span", { sinif: "fk-harf-puan", metin: `${sayi(k.puan)} puan` }))),
      h("dl", { sinif: "fk-olculer" }, karneOlculeri(k).map(olcu)),
      gmBolumu,
      bolum("Puan dökümü", defter, h("p", { sinif: "fk-soluk", metin: `Gün ${sayi(AYARLAR.PUAN.BASLANGIC)} puanla başlar; puan ${AYARLAR.PUAN.ALT}–${AYARLAR.PUAN.UST} arasında tutulur.` })),
      bolum("Bugünün olayları", olaylar),
      bolum("Bugünkü üretim", h("p", { metin: `Masa ${sayi(k.uretim.masa)} · Sandalye ${sayi(k.uretim.sandalye)} · Çelik raf ${sayi(k.uretim.raf)}${gece ? " · İkinci vardiya çalıştı" : ""}` }),
        h("p", { sinif: "fk-soluk", metin: `Harcama ${tl(k.harcama.harcanan)} / bütçe ${tl(k.harcama.limit)}. Satın alma: ${sayi(k.satinAlma.verilen)} sipariş, ${sayi(k.satinAlma.onaylanan)} onay, ${sayi(k.satinAlma.dusen)} düşen.` })),
      son ? sonOzet(durum) : null,
      h("div", { sinif: "fk-satir fk-karne-eylem" },
        !son ? h("button", { sinif: "dugme", type: "button", on: { click: eylemler.yarinaGec } }, kilitli ? ikon("kilit") : null, "Yarına geç", kilitli ? null : ikon("ok")) : null,
        h("button", { sinif: "dugme-cizgi", type: "button", on: { click: eylemler.gunuTekrarla } }, ikon("dongu"), `${k.gun}. günü baştan oyna`),
        son ? h("button", { sinif: "dugme-cizgi", type: "button", on: { click: eylemler.bastanBasla } }, "Baştan başla") : null),
      !son && kilitli ? h("p", { sinif: "fk-soluk", metin: `${k.gun + 1}. gün erişim koduyla açılır.` }) : null));
}

function sonOzet(durum) {
  return bolum("Beş gün tamamlandı",
    h("p", { metin: "Fabrikadaki beş gün bitti. Günlerin notları:" }),
    h("ul", { sinif: "fk-liste" }, durum.gecmis.map((g) => h("li", {}, h("span", { metin: gunAdi(g.gun) }), h("span", { sinif: "fk-sayi", metin: `${g.harf} · ${sayi(g.puan)} puan` })))));
}

export { PUAN_TURU_ADI };
