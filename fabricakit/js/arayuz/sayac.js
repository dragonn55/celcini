/* Sayaç şeridi: onay bekleyen siparişler, kalite kararları ve teslimatlar. Aynı anda birden çok sayaç olabilir.
   Şerit yalnız sayaç listesi değişince yeniden çizilir; kalan süreler yerinde güncellenir (düğmeler kaybolmaz). */
import { AYARLAR } from "../ayarlar.js";
import { MALZEME, TEDARIKCI } from "../veri/katalog.js";
import { gercekAd } from "../odalar.js";
import { sayaclar } from "../motor/sayac.js";
import { sayi, geriSayim, gunAdi, goreli } from "../bicim.js";
import { h, ikon, temizle } from "./dom.js";

export function sayacKur(kap, { gonder, odaAc }) {
  let imza = "";
  const kalanEl = new Map();

  /* yapisal: false ise (oyuncu bir düğmeye basılı tutarken) şerit yeniden kurulmaz, yalnız süreler güncellenir */
  function ciz(durum, { yapisal = true } = {}) {
    const liste = sayaclar(durum);
    const teslimat = durum.satinalma.filter((s) => s.durum === "onaylandi" || s.durum === "kapida")
      .sort((a, b) => (a.durum === "kapida" ? -1 : 0) - (b.durum === "kapida" ? -1 : 0) || a.varisGun - b.varisGun);
    const yeniImza = JSON.stringify([liste.map((s) => [s.id, s.hazir]), teslimat.map((s) => [s.id, s.durum]), durum.gun, durum.evre]);
    if (yeniImza !== imza && yapisal) {
      imza = yeniImza;
      kalanEl.clear();
      temizle(kap);
      kap.hidden = !liste.length && !teslimat.length;
      for (const s of liste) kap.appendChild(sayacCipi(durum, s));
      for (const s of teslimat) kap.appendChild(teslimatCipi(durum, s));
    }
    for (const s of liste) {
      const el = kalanEl.get(s.id);
      if (!el) continue;
      el.textContent = geriSayim(s.kalanDk);
      el.closest(".fk-cip").classList.toggle("fk-cip-acil", s.kalanDk <= AYARLAR.SAYAC_ACIL_DK);
    }
  }

  function sayacCipi(durum, s) {
    const m = MALZEME[s.malzeme];
    const kalan = h("span", { sinif: "fk-cip-sure", metin: geriSayim(s.kalanDk) });
    kalanEl.set(s.id, kalan);
    if (s.tur === "onay") {
      return h("div", { sinif: `fk-cip${s.hazir ? " fk-cip-hazir" : ""}` },
        ikon("saat"),
        h("span", { sinif: "fk-cip-metin" },
          h("strong", { metin: `${gercekAd("satinalma")}: ${m.ad} · ${sayi(s.miktar)} ${m.birim}` }),
          h("span", { metin: `${TEDARIKCI[s.tedarikci].ad} · ${s.hazir ? "onaya hazır" : "yanıt bekleniyor"} · ` }, kalan, " kaldı")),
        s.hazir ? h("button", { sinif: "dugme-cizgi fk-kucuk-dugme", type: "button", disabled: durum.evre !== "oyun", on: { click: () => gonder({ tip: "ONAY_AL", id: s.id }) } }, "Onayı al") : null);
    }
    return h("div", { sinif: "fk-cip fk-cip-hazir" },
      ikon("uyari"),
      h("span", { sinif: "fk-cip-metin" },
        h("strong", { metin: `${gercekAd(s.oda)}: ${m.ad} · ${sayi(s.miktar)} ${m.birim} bozuk` }),
        h("span", { metin: "Karar için " }, kalan, " kaldı")),
      h("button", { sinif: "dugme-cizgi fk-kucuk-dugme", type: "button", on: { click: () => odaAc(s.oda) } }, "Karara git"));
  }

  function teslimatCipi(durum, s) {
    const m = MALZEME[s.malzeme];
    if (s.durum === "kapida") {
      return h("div", { sinif: "fk-cip fk-cip-hazir" },
        ikon("kamyon"),
        h("span", { sinif: "fk-cip-metin" },
          h("strong", { metin: `${gercekAd("depo")}: ${m.ad} · ${sayi(s.miktar)} ${m.birim}` }), h("span", { metin: "Kapıda, teslim alın" })),
        h("button", { sinif: "dugme-cizgi fk-kucuk-dugme", type: "button", disabled: durum.evre !== "oyun", on: { click: () => gonder({ tip: "TESLIM_AL", id: s.id }) } }, "Teslim al"));
    }
    return h("div", { sinif: "fk-cip fk-cip-yolda" },
      ikon("kamyon"),
      h("span", { sinif: "fk-cip-metin" },
        h("strong", { metin: `${m.ad} · ${sayi(s.miktar)} ${m.birim}` }),
        h("span", { metin: `Teslimat ${gunAdi(s.varisGun)} · ${goreli(s.varisGun, durum.gun)}` })));
  }

  return { ciz };
}
