/* Bildirimler: günlükteki yeni kayıtlar üst şeridin hemen altında, ortada görünür; aynı anda tek balon, gerisi kuyrukta
   bekler (üst üste binmez). Her balon SURE_MS sonra kendiliğinden kapanır; dokununca ilgili oda açılır.
   Kaçan bildirim kaybolmaz: son 10 bildirim "Gün özeti"nde listelenir (panel.js).
   Metinler gerçek oda adını kullanır. Ekran okuyucu için kibar (polite) duyurulur. */
import { GUN_BASI } from "../motor/zaman.js";
import { h, ikon } from "./dom.js";

const SURE_MS = 6000;
/* Kuyrukta en fazla bu kadar balon bekler; daha eskisi yalnızca Gün özeti'nde kalır (hızlı ilerlemede gecikme birikmesin) */
const KUYRUK_EN_FAZLA = 3;

export function bildirimKur(kap, { odaAc }) {
  let sonId = 0;
  let kuyruk = [];
  let gorunen = null;
  const no = (g) => Number(g.id.slice(1)) || 0;

  function siraYaz() {
    if (gorunen) gorunen.sira.textContent = kuyruk.length ? `+${kuyruk.length}` : "";
  }

  function kapat() {
    if (!gorunen) return;
    clearTimeout(gorunen.sayac);
    gorunen.el.remove();
    gorunen = null;
    siradaki();
  }

  function siradaki() {
    if (gorunen || !kuyruk.length) return;
    const g = kuyruk.shift();
    const metin = g.oda
      ? h("button", { sinif: "fk-bildirim-metin", type: "button", on: { click: () => { kapat(); odaAc(g.oda); } } }, g.metin)
      : h("span", { sinif: "fk-bildirim-metin", metin: g.metin });
    const sira = h("span", { sinif: "fk-bildirim-sira", "aria-hidden": "true" });
    const el = h("div", { sinif: `fk-bildirim fk-bildirim-${g.seviye}` }, metin, sira,
      h("button", { sinif: "fk-bildirim-kapat", type: "button", "aria-label": "Bildirimi kapat", on: { click: kapat } }, ikon("kapat")));
    gorunen = { el, sira, sayac: setTimeout(kapat, SURE_MS) };
    kap.appendChild(el);
    siraYaz();
  }

  function ekle(g) {
    kuyruk.push(g);
    if (kuyruk.length > KUYRUK_EN_FAZLA) kuyruk = kuyruk.slice(-KUYRUK_EN_FAZLA);
    siradaki();
    siraYaz();
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
      for (const g of yeni) {
        sonId = Math.max(sonId, no(g));
        ekle(g);
      }
    },
    /* Eylem hatası (oda yok): aynı kuyruktan geçer */
    hata(metin) {
      ekle({ metin, seviye: "acil", oda: null });
    },
  };
}
