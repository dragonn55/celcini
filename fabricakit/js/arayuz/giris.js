/* Başlangıç ekranı: tek alan "Ajan GM size nasıl hitap etsin?". Hitap yalnızca bu tarayıcıda kalır.
   Kayıtlı oyun varsa alan sorulmaz: tek düğme "Bay Çakır, devam et: 1. gün 08:06", altında küçük "Baştan başla"
   (onaydan sonra hitap alanıyla yeni başlangıç ekranı açılır; hitap orada değiştirilebilir). */
import { AYARLAR } from "../ayarlar.js";
import { galaksiBasligi, FABRIKA } from "../odalar.js";
import { saat, gunAdi } from "../bicim.js";
import { h, gezegen } from "./dom.js";
import { ajanGmGorseli } from "./karne.js";
import { sesliOkuDugmesi } from "./ses.js";

const GM_SOZU = "Fabrikanın genel müdürüyüm. Gün boyu her kararınızı izlerim; akşam notunuzu veririm. Sabah 08:00'de siparişler gelecek.";

export const VARSAYILAN_HITAP = "Sayın Yönetici";

export function girisEkrani({ kayit, uyari, hitap, basla }) {
  const girdi = kayit ? null : h("input", { id: "fk-hitap", type: "text", maxlength: "40", autocomplete: "off", placeholder: "Örnek: Ayşe Hanım", deger: hitap || "" });
  const gonder = (yeni) => (e) => {
    if (e) e.preventDefault();
    basla({ hitap: girdi ? girdi.value.trim().slice(0, 40) : hitap || "", yeni });
  };
  const form = kayit
    ? h("form", { sinif: "fk-giris-form fk-devam", on: { submit: gonder(false) } },
      /* "1. gün 08:06" bölünmez: uzun hitapta satır "devam et:"ten sonra kırılır */
      h("button", { sinif: "dugme", type: "submit" }, `${hitap || VARSAYILAN_HITAP}, devam et: ${`${gunAdi(kayit.durum.gun)} ${saat(kayit.durum.dk)}`.replace(/ /g, "\u00a0")}`),
      h("button", { sinif: "fk-bastan", type: "button", on: { click: gonder(true) } }, "Baştan başla"))
    : h("form", { sinif: "fk-giris-form", on: { submit: gonder(true) } },
      h("label", { for: "fk-hitap", metin: "Ajan GM size nasıl hitap etsin?" }),
      girdi,
      h("p", { sinif: "fk-soluk", metin: `Hitap yalnızca bu tarayıcıda kalır, sunucuya gönderilmez. Boş bırakırsanız "${VARSAYILAN_HITAP}".` }),
      h("div", { sinif: "fk-satir" }, h("button", { sinif: "dugme", type: "submit" }, "Başla")));

  return h("div", { sinif: "kap fk-giris" },
    h("div", { sinif: "kart fk-giris-kart" },
      h("div", { sinif: "fk-fabrika-tabela" },
        h("p", { sinif: "ust-yazi fk-fabrika-satir" }, FABRIKA.kod ? gezegen(FABRIKA.simge, "fk-simge fk-simge-kucuk") : null, galaksiBasligi()),
        FABRIKA.kod ? h("p", { sinif: "fk-fabrika-alt", metin: FABRIKA.ad }) : null),
      h("h1", { metin: "Fabricakit" }),
      h("p", { sinif: "hero-slogan", metin: "İşini kurgula, ajanı sorgula." }),
      h("div", { sinif: "fk-gm-satir" }, ajanGmGorseli("fk-gm"),
        h("div", { sinif: "fk-gm-soz" }, h("p", { metin: `Ajan GM: ${GM_SOZU}` }), sesliOkuDugmesi(() => [GM_SOZU]))),
      uyari ? h("p", { sinif: "fk-not fk-not-dikkat", metin: uyari }) : null,
      form,
      h("p", { sinif: "fk-soluk", metin: `${AYARLAR.UCRETSIZ_GUN}. gün ücretsiz; ${AYARLAR.UCRETSIZ_GUN + 1}–${AYARLAR.GUNLER.length}. günler erişim koduyla açılır. Bir oyun saati gerçekte ${AYARLAR.OYUN_SAATI_SANIYE} saniye sürer; saati istediğiniz an durdurabilirsiniz.` }),
      h("p", { sinif: "fk-excel" }, "Excel dosyalarını mı arıyorsunuz? ", h("a", { href: "/fabrika/", metin: "Fabrika Dosyaları" }), " rafına geçin.")));
}
