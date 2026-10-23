/* Görev notu: sipariş gelince açılır, adımlar yapıldıkça kendiliğinden işaretlenir; sıradaki adım vurgulanır.
   Masaüstünde haritanın yanında; telefonda alttan açılan çekmece (tutamaç "Görev notu 2/5", varsayılan kapalı).
   1. gün her adım başlık + tek satır (oda › yapılacak iş); uzun açıklama adımın yanındaki ok düğmesiyle açılır
   (adımın kendisine dokunmak odayı açar). 2. gün yalnız başlıklar, 3. gün ve sonrası not yok (yalnız "Sipariş geldi" bildirimi).
   Sipariş ve onay adımları sayaçlıdır: "Eksik malzemeyi sipariş et (1/2)".
   Gün eşikleri ayarlar.js'te (GOREV_NOTU_AYRINTILI_SON_GUN, GOREV_NOTU_SON_GUN).
   Not, karne ve uyarılar gerçek oda adlarını kullanır. */
import { AYARLAR } from "../ayarlar.js";
import { gercekAd } from "../odalar.js";
import { gorevSayaclari } from "../motor/satinalma.js";
import { ek } from "../bicim.js";
import { h, ikon } from "./dom.js";

const ADIMLAR = [
  { id: "plana", baslik: "Siparişi plana koy", oda: "planlama", sekme: "plan", kisa: () => `${gercekAd("planlama")} › "Siparişi plana al"`,
    ayrinti: () => `${ek(gercekAd("planlama"), "de")} "Siparişi plana al" düğmesine basın.` },
  { id: "ihtiyac", baslik: "Malzeme ihtiyacını gör", oda: "planlama", sekme: "ihtiyac", kisa: () => `${gercekAd("planlama")} › Malzeme ihtiyacı`,
    ayrinti: () => `${ek(gercekAd("planlama"), "de")} "Malzeme ihtiyacı" sekmesini açın; GEÇ KALINDI ve BUGÜN VER yazan kalemlere bakın.` },
  { id: "siparis", baslik: "Eksik malzemeyi sipariş et", oda: "satinalma", kisa: () => `${gercekAd("satinalma")} › eksik kalemler`,
    ayrinti: () => `${ek(gercekAd("satinalma"), "de")} her GEÇ KALINDI ve BUGÜN VER kalemi için tedarikçiyi ve miktarı seçip sipariş verin.` },
  { id: "onay", baslik: "Tedarikçi onayını al", oda: "satinalma", kisa: () => `${gercekAd("satinalma")} › "Onayı al"`,
    ayrinti: () => "Tedarikçi yanıt verince sayaç dolmadan her sipariş için \"Onayı al\" deyin." },
  { id: "teslim", baslik: "Gelen malı teslim al", oda: "depo", kisa: () => `${gercekAd("depo")} › "Teslim al"`,
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

/* Açılan ayrıntılar (adım id'leri) yeniden çizimde korunur */
const acikAyrinti = new Set();

/* acik: başlangıç hâli; degisti(acik): oyuncu açıp kapatınca */
export function gorevNotu(durum, adimlar, { acik, degisti, odaAc }) {
  const ayrintili = durum.gun <= AYARLAR.GOREV_NOTU_AYRINTILI_SON_GUN;
  const siradaki = adimlar.find((a) => !a.tamam);
  const el = h("details", { sinif: "fk-gorev", open: acik },
    h("summary", {},
      h("span", { sinif: "fk-gorev-baslik", metin: "Görev notu" }),
      h("span", { sinif: "fk-gorev-sayac", metin: gorevOzeti(adimlar) }),
      ikon("yukari", "fk-ikon fk-gorev-ok")),
    h("p", { sinif: "fk-gorev-giris", metin: siradaki ? "Sipariş geldi. Sırayla:" : "Bugünkü adımların hepsi tamam." }),
    h("ol", { sinif: "fk-gorev-adimlar" }, adimlar.map((a, i) => adim(a, i, { ayrintili: ayrintili && !a.tamam, siradaki: a === siradaki, odaAc }))));
  /* Yeniden çizimde eski öğenin gecikmiş toggle olayı yeni hâli bozmasın */
  el.addEventListener("toggle", () => { if (el.isConnected) degisti(el.open); });
  return el;
}

/* Tek adım: dokununca oda açılır. 1. gün başlığın altında tek satır, yanındaki ok uzun açıklamayı açıp kapatır. */
function adim(a, i, { ayrintili, siradaki, odaAc }) {
  const id = `fk-gorev-ayrinti-${a.id}`;
  const acik = ayrintili && acikAyrinti.has(a.id);
  const metin = ayrintili ? h("p", { sinif: "fk-gorev-ayrinti", id, hidden: !acik, metin: a.ayrinti() }) : null;
  const ac = ayrintili ? h("button", {
    type: "button", sinif: "fk-gorev-ac", "aria-expanded": String(acik), "aria-controls": id, "aria-label": `Ayrıntı: ${a.baslik}`,
    on: { click: (e) => {
      const yeni = !acikAyrinti.has(a.id);
      if (yeni) acikAyrinti.add(a.id); else acikAyrinti.delete(a.id);
      metin.hidden = !yeni;
      e.currentTarget.setAttribute("aria-expanded", String(yeni));
    } },
  }, ikon("yukari", "fk-ikon fk-gorev-ac-ok")) : null;
  return h("li", { sinif: `${a.tamam ? "fk-yapildi" : ""}${siradaki ? " fk-siradaki" : ""}`.trim() || null },
    h("div", { sinif: "fk-gorev-satir" },
      h("button", { type: "button", sinif: "fk-gorev-adim", on: { click: () => odaAc(a.oda, null, a.sekme) } },
        h("span", { sinif: "fk-gorev-isaret", "aria-hidden": "true" }, a.tamam ? ikon("tik") : String(i + 1)),
        h("span", { sinif: "fk-gorev-metin" },
          h("strong", { metin: a.sayac ? `${a.baslik} (${a.sayac.yapilan}/${a.sayac.toplam})` : a.baslik }),
          a.tamam ? h("span", { sinif: "gizli", metin: " (yapıldı)" }) : siradaki ? h("span", { sinif: "gizli", metin: " (sıradaki)" }) : null,
          ayrintili ? h("span", { sinif: "fk-gorev-kisa", metin: a.kisa() }) : null)),
      ac),
    metin);
}
