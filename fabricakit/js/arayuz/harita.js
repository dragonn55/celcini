/* Fabrika haritası: üstten bakılan plan. Ofisler, iki üretim hattı, kalite, depo ve sevkiyat kapısı.
   Gezegenler yalnızca kapı tabelasıdır. Her odada durum ışığı (renk + metin). */
import { ODALAR, tabela, fabrikaTabelasi, FABRIKA } from "../odalar.js";
import { HAT, URUN, MALZEME, HAT_IDLER, hatUrunleri } from "../veri/katalog.js";
import { SEVIYE_ADI } from "../motor/durumlar.js";
import { hatHali } from "../motor/uretim.js";
import { acikSatirlar, teslimSirasi } from "../motor/siparis.js";
import { sayi, sure } from "../bicim.js";
import { h, gezegen, ikon } from "./dom.js";

const OFISLER = ["satis", "arge", "planlama", "ik", "finans", "satinalma"];

export function haritaKur(kok, { odaSec }) {
  const fab = fabrikaTabelasi();
  const odaEl = {};

  const odaDugmesi = (oda, ...ek) => {
    const t = tabela(oda);
    const el = h("button", { sinif: `fk-oda fk-oda-${oda.id}`, type: "button", "data-oda": oda.id, on: { click: () => odaSec(oda.id) } },
      h("span", { sinif: "fk-tabela" },
        oda.kod ? gezegen(oda.simge, "fk-simge") : null,
        h("span", { sinif: "fk-kod", metin: t.buyuk }),
        t.kucuk ? h("span", { sinif: "fk-ad", metin: t.kucuk }) : null),
      h("span", { sinif: "fk-isik" }, h("span", { sinif: "fk-isik-nokta" }), h("span", { sinif: "fk-isik-metin", metin: "Yolunda" })),
      ...ek);
    odaEl[oda.id] = el;
    return el;
  };

  const hatEl = {};
  const hatlar = h("span", { sinif: "fk-hatlar" }, HAT_IDLER.map((id) => {
    const durumMetni = h("span", { sinif: "fk-hat-durum", metin: "Boşta" });
    const bant = h("span", { sinif: "fk-bant" }, h("span", { sinif: "fk-makine" }), h("span", { sinif: "fk-makine" }), h("span", { sinif: "fk-makine" }));
    hatEl[id] = { bant, durumMetni };
    return h("span", { sinif: "fk-hat" }, h("span", { sinif: "fk-hat-ad", metin: HAT[id].ad }), bant, durumMetni);
  }));
  const depoMetni = h("span", { sinif: "fk-alan-metin", metin: "" });
  const sevkMetni = h("span", { sinif: "fk-alan-metin", metin: "" });

  const oda = (id) => ODALAR.find((o) => o.id === id);
  const plan = h("div", { sinif: "fk-plan" },
    h("span", { sinif: "fk-bolge fk-bolge-ofis", metin: "Ofisler" }),
    OFISLER.map((id) => odaDugmesi(oda(id))),
    odaDugmesi(oda("uretim"), h("span", { sinif: "fk-bolge-ic", metin: "Üretim holü" }), hatlar),
    odaDugmesi(oda("kalite")),
    odaDugmesi(oda("depo"), h("span", { sinif: "fk-raflar", "aria-hidden": "true" }, h("span"), h("span"), h("span")), depoMetni),
    h("div", { sinif: "fk-sevk" }, ikon("kamyon", "fk-ikon fk-sevk-ikon"), h("span", { sinif: "fk-sevk-ad", metin: "Sevkiyat kapısı" }), sevkMetni));

  const kap = h("section", { sinif: "fk-harita", "aria-label": `Fabrika planı: ${fab.buyuk}${fab.kucuk ? `, ${fab.kucuk}` : ""}` },
    h("div", { sinif: "fk-harita-bas" },
      FABRIKA.kod ? gezegen(FABRIKA.simge, "fk-simge fk-simge-kucuk") : null,
      h("span", { sinif: "fk-fabrika-kod", metin: fab.buyuk }),
      fab.kucuk ? h("span", { sinif: "fk-fabrika-ad", metin: fab.kucuk }) : null),
    plan);
  kok.appendChild(kap);

  return {
    guncelle(durum, isiklar, secili) {
      for (const o of ODALAR) {
        const el = odaEl[o.id];
        const isik = isiklar[o.id] || { seviye: "yolunda", neden: "" };
        el.className = `fk-oda fk-oda-${o.id} fk-durum-${isik.seviye}${secili === o.id ? " fk-secili" : ""}`;
        el.setAttribute("aria-pressed", String(secili === o.id));
        const t = tabela(o);
        el.setAttribute("aria-label", `${t.buyuk}${t.kucuk ? `, ${t.kucuk}` : ""}. Durum: ${SEVIYE_ADI[isik.seviye]}${isik.neden ? `, ${isik.neden}` : ""}`);
        el.querySelector(".fk-isik-metin").textContent = SEVIYE_ADI[isik.seviye];
      }
      for (const id of HAT_IDLER) {
        const hal = hatHali(durum, id);
        const { bant, durumMetni } = hatEl[id];
        bant.className = `fk-bant fk-bant-${hal.tur}`;
        const uretilen = durum.uretilen[durum.gun] || {};
        const hedef = hatUrunleri(id).map((u) => `${URUN[u].ad} ${uretilen[u] || 0}/${(durum.plan[durum.gun] || {})[u] || 0}`).join(" · ");
        durumMetni.textContent =
          hal.tur === "calisiyor" ? `Çalışıyor · ${hedef}`
          : hal.tur === "durus" ? `Durdu: ${hal.neden} (${sure(hal.kalanDk)})`
          : hal.tur === "malzeme" ? `Durdu: ${MALZEME[hal.malzeme].ad} yok`
          : durum.evre === "oyun" ? `Boşta · ${hedef}` : `Gün bitti · ${hedef}`;
      }
      const kapida = durum.satinalma.filter((s) => s.durum === "kapida").length;
      const yolda = durum.satinalma.filter((s) => s.durum === "onaylandi").length;
      depoMetni.textContent = kapida ? `Kapıda ${kapida} teslimat bekliyor` : yolda ? `Yolda ${yolda} teslimat` : "Kapıda teslimat yok";
      const bugunku = acikSatirlar(durum).filter((s) => s.gun <= durum.gun).sort(teslimSirasi);
      const kalan = { ...durum.mamul };
      let hazir = 0;
      for (const s of bugunku) if (kalan[s.urun] >= s.miktar) { kalan[s.urun] -= s.miktar; hazir += 1; }
      sevkMetni.textContent = bugunku.length ? `18:00 sevkiyat: ${sayi(bugunku.length)} satır, ${sayi(hazir)} hazır` : "Bugün sevkiyat yok";
    },
  };
}
