/* Karar paneli: masaüstünde haritanın sağında, telefonda alttan açılır. Oda seçilmemişse gün özeti görünür.
   Yeniden çizimde odak ve imleç korunur (data-odak). */
import { odaBul, tabela } from "../odalar.js";
import { SEVIYE_ADI } from "../motor/durumlar.js";
import { acikSatirlar } from "../motor/siparis.js";
import { saat, sayi } from "../bicim.js";
import { h, gezegen, ikon, temizle } from "./dom.js";
import { bolum, bos } from "./ortak.js";
import { planlamaPaneli } from "./panel-planlama.js";
import { satinAlmaPaneli } from "./panel-satinalma.js";
import { satisPaneli, argePaneli, uretimPaneli, depoPaneli, kalitePaneli, ikPaneli, finansPaneli } from "./panel-odalar.js";

const ICERIK = {
  planlama: planlamaPaneli, satinalma: satinAlmaPaneli, satis: satisPaneli, arge: argePaneli,
  uretim: uretimPaneli, depo: depoPaneli, kalite: kalitePaneli, ik: ikPaneli, finans: finansPaneli,
};

/* Gün özeti: sevkiyat ve son bildirimler (kaçan bildirim kaybolmasın). Telefonda özet satırından alttan açılır. */
const SON_BILDIRIM = 10;

function ozet(b) {
  const { durum } = b;
  const kayit = durum.gunluk.slice().reverse().slice(0, SON_BILDIRIM);
  const bugunku = acikSatirlar(durum).filter((s) => s.gun <= durum.gun).length;
  return h("div", { sinif: "fk-ozet" },
    h("div", { sinif: "fk-panel-bas" },
      h("h2", { sinif: "fk-panel-baslik", id: "fk-panel-baslik", tabindex: "-1" }, "Gün özeti"),
      h("button", { sinif: "fk-kapat fk-ozet-kapat", type: "button", "aria-label": "Gün özetini kapat", "data-odak": "kapat", on: { click: b.kapat } }, ikon("kapat"))),
    h("p", { sinif: "fk-panel-aciklama", metin: "Bir odaya dokunun: karar paneli burada açılır. Işıklar odaların durumunu gösterir." }),
    h("p", { metin: `Bugün 18:00'de ${sayi(bugunku)} satır sevk edilecek. Açık satır: ${sayi(acikSatirlar(durum).length)}.` }),
    bolum(`Son ${SON_BILDIRIM} bildirim`, kayit.length ? h("ul", { sinif: "fk-olaylar" }, kayit.map((g) =>
      h("li", { sinif: `fk-olay fk-olay-${g.seviye}` },
        h("span", { sinif: "fk-olay-saat", metin: saat(g.dk) }),
        h("button", { sinif: "fk-olay-dugme", type: "button", on: { click: () => b.odaAc(g.oda) } }, g.metin)))) : bos("Henüz olay yok.")));
}

export function panelCiz(kap, b) {
  const aktif = document.activeElement;
  let odak = null;
  if (aktif && kap.contains(aktif) && aktif.dataset && aktif.dataset.odak) {
    odak = { anahtar: aktif.dataset.odak, bas: null, son: null };
    try { odak.bas = aktif.selectionStart; odak.son = aktif.selectionEnd; } catch { /* sayı alanında seçim yok */ }
  }
  const kaydirma = kap.scrollTop;
  temizle(kap);
  const id = b.ui.secili;
  if (!id) {
    kap.appendChild(ozet(b));
  } else {
    const oda = odaBul(id);
    const t = tabela(oda);
    const isik = b.isiklar[id] || { seviye: "yolunda", neden: "" };
    kap.appendChild(h("div", { sinif: "fk-panel-bas" },
      oda.kod ? gezegen(oda.simge, "fk-simge") : null,
      h("h2", { sinif: "fk-panel-baslik", id: "fk-panel-baslik", tabindex: "-1" },
        h("span", { sinif: "fk-kod", metin: t.buyuk }), t.kucuk ? h("span", { sinif: "fk-ad", metin: t.kucuk }) : null),
      h("span", { sinif: `fk-isik fk-durum-${isik.seviye}` }, h("span", { sinif: "fk-isik-nokta" }), h("span", { metin: SEVIYE_ADI[isik.seviye] })),
      h("button", { sinif: "fk-kapat", type: "button", "aria-label": "Paneli kapat", "data-odak": "kapat", on: { click: b.kapat } }, ikon("kapat"))));
    if (isik.neden) kap.appendChild(h("p", { sinif: `fk-panel-neden fk-durum-${isik.seviye}`, metin: isik.neden }));
    kap.appendChild(h("p", { sinif: "fk-panel-aciklama", metin: oda.aciklama }));
    kap.appendChild(ICERIK[id](b));
  }
  kap.scrollTop = kaydirma;
  if (odak) {
    const el = kap.querySelector(`[data-odak="${CSS.escape(odak.anahtar)}"]`);
    if (el) {
      el.focus({ preventScroll: true });
      try { if (odak.bas != null) el.setSelectionRange(odak.bas, odak.son); } catch { /* yok */ }
    }
  }
}

/* Sayaç metinlerini yeniden çizmeden günceller ("1:05 kaldı") */
export function canliGuncelle(kap, durum) {
  for (const el of kap.querySelectorAll("[data-kalan]")) {
    const id = el.getAttribute("data-kalan");
    const kayit = durum.satinalma.find((s) => s.id === id) || durum.kararlar.find((k) => k.id === id);
    if (kayit && kayit.kalanDk != null) {
      const dk = Math.max(0, kayit.kalanDk);
      el.textContent = `${Math.floor(dk / 60)}:${String(dk % 60).padStart(2, "0")} kaldı`;
    }
  }
}
