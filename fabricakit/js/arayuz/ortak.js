/* Panel yardımcıları: bölüm, rozet, bilgi satırı, boş durum, olay listesi. */
import { saat, goreli, gunAdi } from "../bicim.js";
import { h } from "./dom.js";

export const bolum = (baslik, ...icerik) => h("section", { sinif: "fk-bolum" }, baslik ? h("h3", { sinif: "fk-bolum-baslik", metin: baslik }) : null, ...icerik);

/* seviye: "yolunda" | "dikkat" | "acil" | "bilgi" */
export const rozet = (metin, seviye = "bilgi") => h("span", { sinif: `fk-rozet fk-rozet-${seviye}`, metin });

export const bos = (metin) => h("p", { sinif: "fk-bos", metin });

export const not = (metin, seviye = "") => h("p", { sinif: `fk-not ${seviye ? `fk-not-${seviye}` : ""}`.trim(), metin });

/* Teslim/varış günü: "3. gün (yarın)" */
export const gunGoreli = (gun, bugun) => `${gunAdi(gun)} (${goreli(gun, bugun)})`;

/* Bilgi listesi: [["Stok", "120 adet"], ...] */
export function bilgi(satirlar) {
  return h("dl", { sinif: "fk-bilgi" }, satirlar.filter(Boolean).map(([k, v]) => [h("dt", { metin: k }), h("dd", { metin: v })]));
}

/* Odanın bugünkü bildirimleri (en yeni üstte) */
export function olayListesi(durum, oda, bosMetin = "Bugün bu odada olay yok.") {
  const liste = durum.gunluk.filter((g) => g.oda === oda).slice().reverse();
  if (!liste.length) return bos(bosMetin);
  return h("ul", { sinif: "fk-olaylar" }, liste.map((g) =>
    h("li", { sinif: `fk-olay fk-olay-${g.seviye}` }, h("span", { sinif: "fk-olay-saat", metin: saat(g.dk) }), h("span", { metin: g.metin }))));
}
