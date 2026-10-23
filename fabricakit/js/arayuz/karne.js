/* Gün sonu karnesi: zamanında teslim, hat duruşu, depoda bağlanan para, unutulan işler, puan ve harf notu;
   ardından Ajan GM yorumu ve "Yarına geç". Sayılar yalnızca o günün durumundan gelir. */
import { AYARLAR } from "../ayarlar.js";
import { PUAN_TURU_ADI } from "../motor/puan.js";
import { sayi, tl, ondalik, saat, gunAdi } from "../bicim.js";
import { h, ikon } from "./dom.js";
import { bolum, bos } from "./ortak.js";

/* Ajan GM görseli: derleme assets/img/ajan-gm.png'yi bulduysa görsel, yoksa koyu zeminde beyaz "GM" */
export function ajanGmGorseli(sinif = "fk-gm") {
  const yer = h("span", { sinif: `${sinif} fk-gm-yer`, "aria-hidden": "true", metin: "GM" });
  const kok = document.getElementById("fk");
  if (!kok || kok.dataset.ajanGorsel !== "1") return yer;
  const img = h("img", { sinif: `${sinif} fk-gm-gorsel`, src: AYARLAR.AJAN_GM_GORSEL, alt: "", width: "96", height: "96" });
  img.addEventListener("error", () => img.replaceWith(yer));
  return img;
}

export const hitapla = (metin, hitap) => metin.split("{hitap}").join(hitap);

const olcu = (ad, deger, alt) => h("div", { sinif: "fk-olcu" }, h("dt", { metin: ad }), h("dd", {}, h("span", { sinif: "fk-olcu-deger", metin: deger }), alt ? h("span", { sinif: "fk-olcu-alt", metin: alt }) : null));

export function karneEkrani({ durum, eylemler, gmBolumu, kilitli }) {
  const k = durum.karne;
  const son = durum.gun >= AYARLAR.GUNLER.length;
  const teslim = k.teslim.yuzde === null ? "—" : `%${k.teslim.yuzde}`;
  const teslimAlt = k.teslim.toplam ? `${sayi(k.teslim.zamaninda)} / ${sayi(k.teslim.toplam)} satır${k.teslim.gecSevk ? ` · ${sayi(k.teslim.gecSevk)} gecikmiş satır da çıktı` : ""}` : "Bugün teslim günü gelen satır yoktu";
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
      h("dl", { sinif: "fk-olculer" },
        olcu("Zamanında teslim", teslim, teslimAlt),
        olcu("Hat duruşu", `${ondalik(k.durus.saat)} saat`, `Ahşap ${ondalik(k.durus.hatlar.ahsap ?? 0)} · Metal ${ondalik(k.durus.hatlar.metal ?? 0)}`),
        olcu("Depoda bağlanan para", tl(k.bagliPara), "Malzeme ve mamul stoğu"),
        olcu("Unutulan iş", sayi(k.unutulan.sayi), k.unutulan.sayi ? "Ayrıntı puan dökümünde" : "Hiç yok")),
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
