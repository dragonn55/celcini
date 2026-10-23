/* Bildirimler: günlükteki yeni kayıtlar kısa süre ekranda görünür; dokununca ilgili oda açılır.
   Metinler gerçek oda adını kullanır. Ekran okuyucu için kibar (polite) duyurulur. */
import { GUN_BASI } from "../motor/zaman.js";
import { h, ikon } from "./dom.js";

const SURE = { bilgi: 3500, dikkat: 7000, acil: 9000 };
const EN_FAZLA = 3;

export function bildirimKur(kap, { odaAc }) {
  let sonId = 0;
  const no = (g) => Number(g.id.slice(1)) || 0;

  function goster(g) {
    const kapat = () => el.remove();
    const el = h("div", { sinif: `fk-bildirim fk-bildirim-${g.seviye}` },
      h("button", { sinif: "fk-bildirim-metin", type: "button", on: { click: () => { kapat(); odaAc(g.oda); } } }, g.metin),
      h("button", { sinif: "fk-bildirim-kapat", type: "button", "aria-label": "Bildirimi kapat", on: { click: kapat } }, ikon("kapat")));
    kap.prepend(el);
    while (kap.children.length > EN_FAZLA) kap.lastElementChild.remove();
    setTimeout(kapat, SURE[g.seviye] || SURE.bilgi);
  }

  return {
    /* Kayıttan açılışta eski bildirimleri gösterme. Gün başındaysa (08:00) sabahın "Sipariş geldi" kaydı gösterilir:
       3. günden sonra görev notu yok, oyuncuya yalnızca bu bildirim gelir. */
    sifirla(durum) {
      const gunBasi = durum.evre === "oyun" && durum.dk === GUN_BASI;
      sonId = durum.gunluk.reduce((m, g) => (gunBasi && g.dk === GUN_BASI ? m : Math.max(m, no(g))), 0);
    },
    guncelle(durum) {
      const yeni = durum.gunluk.filter((g) => no(g) > sonId);
      for (const g of yeni) sonId = Math.max(sonId, no(g));
      for (const g of yeni.slice(-EN_FAZLA)) goster(g);
    },
  };
}
