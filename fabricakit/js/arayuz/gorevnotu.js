/* Görev notu: sipariş gelince yanda açılır, adımlar yapıldıkça kendiliğinden işaretlenir.
   1. gün bütün adımlar ayrıntılı, 2. gün yalnız başlıklar, 3. gün ve sonrası not yok (yalnız "Sipariş geldi" bildirimi).
   Gün eşikleri ayarlar.js'te (GOREV_NOTU_AYRINTILI_SON_GUN, GOREV_NOTU_SON_GUN).
   Not, karne ve uyarılar gerçek oda adlarını kullanır. */
import { AYARLAR } from "../ayarlar.js";
import { gercekAd } from "../odalar.js";
import { ek } from "../bicim.js";
import { h, ikon } from "./dom.js";

const ADIMLAR = [
  { id: "plana", baslik: "Siparişi plana koy", oda: "planlama",
    ayrinti: () => `${ek(gercekAd("planlama"), "de")} "Siparişi plana al" düğmesine basın.` },
  { id: "ihtiyac", baslik: "Malzeme ihtiyacını gör", oda: "planlama", sekme: "ihtiyac",
    ayrinti: () => `${ek(gercekAd("planlama"), "de")} "Malzeme ihtiyacı" sekmesini açın; GEÇ KALINDI ve BUGÜN VER yazan kalemlere bakın.` },
  { id: "siparis", baslik: "Eksik malzemeyi sipariş et", oda: "satinalma",
    ayrinti: () => `${ek(gercekAd("satinalma"), "de")} tedarikçiyi ve miktarı seçip sipariş verin.` },
  { id: "onay", baslik: "Tedarikçi onayını al", oda: "satinalma",
    ayrinti: () => "Tedarikçi yanıt verince sayaç dolmadan \"Onayı al\" deyin." },
  { id: "teslim", baslik: "Gelen malı teslim al", oda: "depo",
    ayrinti: () => `Mal kapıya gelince ${ek(gercekAd("depo"), "de")} "Teslim al" deyin.` },
];

export function gorevNotu(durum, ui, { odaAc }) {
  if (durum.gun > AYARLAR.GOREV_NOTU_SON_GUN) return null;
  const ayrintili = durum.gun <= AYARLAR.GOREV_NOTU_AYRINTILI_SON_GUN;
  const yapilan = ADIMLAR.filter((a) => durum.gorev[a.id]).length;
  const acik = ui.gorevAcik !== false;
  const el = h("details", { sinif: "fk-gorev", open: acik },
    h("summary", {},
      h("span", { sinif: "fk-gorev-baslik", metin: "Görev notu" }),
      h("span", { sinif: "fk-gorev-sayac", metin: `${yapilan}/${ADIMLAR.length}` })),
    h("p", { sinif: "fk-gorev-giris", metin: yapilan === ADIMLAR.length ? "Bugünkü adımların hepsi tamam." : "Sipariş geldi. Sırayla:" }),
    h("ol", { sinif: "fk-gorev-adimlar" }, ADIMLAR.map((a, i) => {
      const tamam = Boolean(durum.gorev[a.id]);
      return h("li", { sinif: tamam ? "fk-yapildi" : "" },
        h("button", { type: "button", sinif: "fk-gorev-adim", on: { click: () => odaAc(a.oda, null, a.sekme) } },
          h("span", { sinif: "fk-gorev-isaret", "aria-hidden": "true" }, tamam ? ikon("tik") : String(i + 1)),
          h("span", { sinif: "fk-gorev-metin" },
            h("strong", { metin: a.baslik }),
            tamam ? h("span", { sinif: "gizli", metin: " (yapıldı)" }) : null,
            ayrintili && !tamam ? h("span", { sinif: "fk-gorev-ayrinti", metin: a.ayrinti() }) : null)));
    })));
  el.addEventListener("toggle", () => { ui.gorevAcik = el.open; });
  return el;
}
