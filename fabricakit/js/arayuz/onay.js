/* Onay kutusu: "Günü bitir", "Baştan başla" gibi geri alınamayan işlerden önce sorar. Promise<boolean> döner. */
import { h } from "./dom.js";

export function onayKutusu({ baslik, metin, evet, hayir = "Vazgeç" }) {
  return new Promise((coz) => {
    const onceki = document.activeElement;
    const bitir = (sonuc) => {
      document.removeEventListener("keydown", tus);
      perde.remove();
      if (onceki && onceki.focus) onceki.focus();
      coz(sonuc);
    };
    const tus = (e) => { if (e.key === "Escape") bitir(false); };
    const evetDugme = h("button", { sinif: "dugme fk-dugme", type: "button", on: { click: () => bitir(true) } }, evet);
    const hayirDugme = h("button", { sinif: "dugme-cizgi", type: "button", on: { click: () => bitir(false) } }, hayir);
    const kutu = h("div", { sinif: "kart fk-onay", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "fk-onay-baslik", "aria-describedby": "fk-onay-metin" },
      h("h2", { id: "fk-onay-baslik", metin: baslik }),
      h("div", { id: "fk-onay-metin" }, (Array.isArray(metin) ? metin : [metin]).map((m) => h("p", { metin: m }))),
      h("div", { sinif: "fk-satir" }, evetDugme, hayirDugme));
    const perde = h("div", { sinif: "fk-onay-perde", on: { click: (e) => { if (e.target === perde) bitir(false); } } }, kutu);
    document.body.appendChild(perde);
    document.addEventListener("keydown", tus);
    hayirDugme.focus();
  });
}
