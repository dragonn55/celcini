/* Görev notu: sipariş gelince açılır, adımlar yapıldıkça kendiliğinden işaretlenir.
   Masaüstünde haritanın yanında; telefonda alttan açılan çekmece (tutamaç "Görev notu 2/5", varsayılan kapalı).
   1. gün bütün adımlar ayrıntılı, 2. gün yalnız başlıklar, 3. gün ve sonrası not yok (yalnız "Sipariş geldi" bildirimi).
   Sipariş ve onay adımları sayaçlıdır: "Eksik malzemeyi sipariş et (1/2)".
   Gün eşikleri ayarlar.js'te (GOREV_NOTU_AYRINTILI_SON_GUN, GOREV_NOTU_SON_GUN).
   Not, karne ve uyarılar gerçek oda adlarını kullanır. */
import { AYARLAR } from "../ayarlar.js";
import { gercekAd } from "../odalar.js";
import { gorevSayaclari } from "../motor/satinalma.js";
import { ek } from "../bicim.js";
import { h, ikon } from "./dom.js";

const ADIMLAR = [
  { id: "plana", baslik: "Siparişi plana koy", oda: "planlama",
    ayrinti: () => `${ek(gercekAd("planlama"), "de")} "Siparişi plana al" düğmesine basın.` },
  { id: "ihtiyac", baslik: "Malzeme ihtiyacını gör", oda: "planlama", sekme: "ihtiyac",
    ayrinti: () => `${ek(gercekAd("planlama"), "de")} "Malzeme ihtiyacı" sekmesini açın; GEÇ KALINDI ve BUGÜN VER yazan kalemlere bakın.` },
  { id: "siparis", baslik: "Eksik malzemeyi sipariş et", oda: "satinalma",
    ayrinti: () => `${ek(gercekAd("satinalma"), "de")} her GEÇ KALINDI ve BUGÜN VER kalemi için tedarikçiyi ve miktarı seçip sipariş verin.` },
  { id: "onay", baslik: "Tedarikçi onayını al", oda: "satinalma",
    ayrinti: () => "Tedarikçi yanıt verince sayaç dolmadan her sipariş için \"Onayı al\" deyin." },
  { id: "teslim", baslik: "Gelen malı teslim al", oda: "depo",
    ayrinti: () => `Mal kapıya gelince ${ek(gercekAd("depo"), "de")} "Teslim al" deyin.` },
];

/* Bugünkü adımlar ya da (not yoksa) null: [{ ...adım, tamam, sayac: { yapilan, toplam } | null }].
   Yapılacak kalemi olmayan sayaçlı adım, plan yapılınca tamam sayılır. */
export function gorevAdimlari(durum) {
  if (durum.gun > AYARLAR.GOREV_NOTU_SON_GUN) return null;
  const sayac = gorevSayaclari(durum);
  const plana = Boolean(durum.gorev.plana);
  const bos = { siparis: plana, onay: plana && !sayac.siparis.toplam };
  return ADIMLAR.map((a) => {
    const s = sayac[a.id];
    if (!s) return { ...a, sayac: null, tamam: Boolean(durum.gorev[a.id]) };
    return { ...a, sayac: s.toplam ? s : null, tamam: s.toplam ? s.yapilan === s.toplam : bos[a.id] };
  });
}

export const gorevOzeti = (adimlar) => `${adimlar.filter((a) => a.tamam).length}/${adimlar.length}`;

/* acik: başlangıç hâli; degisti(acik): oyuncu açıp kapatınca */
export function gorevNotu(durum, adimlar, { acik, degisti, odaAc }) {
  const ayrintili = durum.gun <= AYARLAR.GOREV_NOTU_AYRINTILI_SON_GUN;
  const hepsi = adimlar.every((a) => a.tamam);
  const el = h("details", { sinif: "fk-gorev", open: acik },
    h("summary", {},
      h("span", { sinif: "fk-gorev-baslik", metin: "Görev notu" }),
      h("span", { sinif: "fk-gorev-sayac", metin: gorevOzeti(adimlar) }),
      ikon("yukari", "fk-ikon fk-gorev-ok")),
    h("p", { sinif: "fk-gorev-giris", metin: hepsi ? "Bugünkü adımların hepsi tamam." : "Sipariş geldi. Sırayla:" }),
    h("ol", { sinif: "fk-gorev-adimlar" }, adimlar.map((a, i) =>
      h("li", { sinif: a.tamam ? "fk-yapildi" : "" },
        h("button", { type: "button", sinif: "fk-gorev-adim", on: { click: () => odaAc(a.oda, null, a.sekme) } },
          h("span", { sinif: "fk-gorev-isaret", "aria-hidden": "true" }, a.tamam ? ikon("tik") : String(i + 1)),
          h("span", { sinif: "fk-gorev-metin" },
            h("strong", { metin: a.sayac ? `${a.baslik} (${a.sayac.yapilan}/${a.sayac.toplam})` : a.baslik }),
            a.tamam ? h("span", { sinif: "gizli", metin: " (yapıldı)" }) : null,
            ayrintili && !a.tamam ? h("span", { sinif: "fk-gorev-ayrinti", metin: a.ayrinti() }) : null))))));
  /* Yeniden çizimde eski öğenin gecikmiş toggle olayı yeni hâli bozmasın */
  el.addEventListener("toggle", () => { if (el.isConnected) degisti(el.open); });
  return el;
}
