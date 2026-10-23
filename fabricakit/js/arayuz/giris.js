/* Başlangıç ekranı: tek alan "Ajan GM size nasıl hitap etsin?". Hitap yalnızca bu tarayıcıda kalır. */
import { AYARLAR } from "../ayarlar.js";
import { fabrikaTabelasi, FABRIKA } from "../odalar.js";
import { saat, gunAdi } from "../bicim.js";
import { h, gezegen } from "./dom.js";
import { ajanGmGorseli } from "./karne.js";

export const VARSAYILAN_HITAP = "Sayın Yönetici";

export function girisEkrani({ kayit, uyari, hitap, basla }) {
  const fab = fabrikaTabelasi();
  const girdi = h("input", { id: "fk-hitap", type: "text", maxlength: "40", autocomplete: "off", placeholder: "Örnek: Bay Çakır", deger: hitap || "" });
  const gonder = (yeni) => (e) => {
    if (e) e.preventDefault();
    basla({ hitap: girdi.value.trim().slice(0, 40), yeni });
  };
  const form = h("form", { sinif: "fk-giris-form", on: { submit: gonder(!kayit) } },
    h("label", { for: "fk-hitap", metin: "Ajan GM size nasıl hitap etsin?" }),
    girdi,
    h("p", { sinif: "fk-soluk", metin: `Hitap yalnızca bu tarayıcıda kalır, sunucuya gönderilmez. Boş bırakırsanız "${VARSAYILAN_HITAP}".` }),
    h("div", { sinif: "fk-satir" },
      kayit
        ? h("button", { sinif: "dugme", type: "submit" }, `Devam et: ${gunAdi(kayit.durum.gun)}, ${saat(kayit.durum.dk)}`)
        : h("button", { sinif: "dugme", type: "submit" }, "Başla"),
      kayit ? h("button", { sinif: "dugme-cizgi", type: "button", on: { click: gonder(true) } }, "Baştan başla") : null));

  return h("div", { sinif: "kap fk-giris" },
    h("div", { sinif: "kart fk-giris-kart" },
      h("p", { sinif: "ust-yazi fk-fabrika-satir" }, FABRIKA.kod ? gezegen(FABRIKA.simge, "fk-simge fk-simge-kucuk") : null, `${fab.buyuk}${fab.kucuk ? ` · ${fab.kucuk}` : ""}`),
      h("h1", { metin: "Fabricakit" }),
      h("p", { sinif: "hero-slogan", metin: "İşini kurgula, ajanı sorgula." }),
      h("div", { sinif: "fk-gm-satir" }, ajanGmGorseli("fk-gm"),
        h("p", { metin: "Ajan GM: Fabrikanın genel müdürüyüm. Gün boyu her kararınızı izlerim; akşam notunuzu veririm. Sabah 08:00'de siparişler gelecek." })),
      uyari ? h("p", { sinif: "fk-not fk-not-dikkat", metin: uyari }) : null,
      form,
      h("p", { sinif: "fk-soluk", metin: `${AYARLAR.UCRETSIZ_GUN}. gün ücretsiz; ${AYARLAR.UCRETSIZ_GUN + 1}–${AYARLAR.GUNLER.length}. günler erişim koduyla açılır. Bir oyun saati gerçekte ${AYARLAR.OYUN_SAATI_SANIYE} saniye sürer; saati istediğiniz an durdurabilirsiniz.` }),
      h("p", { sinif: "fk-excel" }, "Excel dosyalarını mı arıyorsunuz? ", h("a", { href: "/fabrika/", metin: "Fabrika Dosyaları" }), " rafına geçin.")));
}
