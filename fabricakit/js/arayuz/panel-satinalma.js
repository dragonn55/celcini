/* Satın Alma (Plüton) paneli: bütçe, sipariş formu, tedarikçiler, açık siparişler ve sayaçlar. */
import { AYARLAR } from "../ayarlar.js";
import { MALZEME, TEDARIKCI, tedarikEdebilir, tedarikSuresi, birimFiyat } from "../veri/katalog.js";
import { malzemeIhtiyaci } from "../motor/mrp.js";
import { sayi, tl, gunAdi, geriSayim, goreli } from "../bicim.js";
import { h, cubuk, temizle } from "./dom.js";
import { bolum, rozet, bos, not } from "./ortak.js";
import { mrpEtiketi, onerilenTedarikci } from "./panel-planlama.js";

export function butceBilgisi(durum) {
  const { harcanan, limit } = durum.butce;
  const asim = harcanan > limit;
  return h("div", { sinif: "fk-butce" },
    h("p", {}, h("strong", { metin: "Günlük bütçe " }), `${tl(limit)} · harcanan ${tl(harcanan)} · ${asim ? `aşım ${tl(harcanan - limit)}` : `kalan ${tl(limit - harcanan)}`}`),
    cubuk(limit > 0 ? harcanan / limit : 1, asim ? "fk-cubuk-acil" : harcanan > limit * AYARLAR.BUTCE_UYARI_ORANI ? "fk-cubuk-dikkat" : ""));
}

export function siparisSatiri(durum, s, gonder) {
  const m = MALZEME[s.malzeme];
  let durumMetni;
  let eylem = null;
  if (s.durum === "yanit-bekliyor") durumMetni = [rozet("Yanıt bekleniyor", "bilgi"), h("span", { sinif: "fk-geri-sayim", "data-kalan": s.id, metin: `${geriSayim(s.kalanDk)} kaldı` })];
  else if (s.durum === "onay-bekliyor") {
    durumMetni = [rozet("Onaya hazır", s.kalanDk <= AYARLAR.SAYAC_ACIL_DK ? "acil" : "dikkat"), h("span", { sinif: "fk-geri-sayim", "data-kalan": s.id, metin: `${geriSayim(s.kalanDk)} kaldı` })];
    eylem = h("button", { sinif: "dugme fk-dugme fk-kucuk-dugme", type: "button", "data-odak": `onay-${s.id}`, disabled: durum.evre !== "oyun", on: { click: () => gonder({ tip: "ONAY_AL", id: s.id }) } }, "Onayı al");
  } else if (s.durum === "onaylandi") durumMetni = [rozet("Onaylandı", "yolunda"), h("span", { metin: `Teslimat ${gunAdi(s.varisGun)} (${goreli(s.varisGun, durum.gun)})` })];
  else if (s.durum === "kapida") durumMetni = [rozet("Kapıda", "dikkat"), h("span", { metin: "Depoda teslim alın" })];
  else if (s.durum === "teslim") durumMetni = [rozet("Teslim alındı", "yolunda")];
  else durumMetni = [rozet("Düştü", "acil"), h("span", { metin: "Onay alınmadı" })];
  return h("li", { sinif: `fk-siparis fk-siparis-${s.durum}`, "data-durak": s.id },
    h("div", { sinif: "fk-siparis-bas" }, h("strong", { metin: `${m.ad} · ${sayi(s.miktar)} ${m.birim}` }), h("span", { sinif: "fk-soluk", metin: `${TEDARIKCI[s.tedarikci].ad} · ${tl(s.tutar)}` })),
    h("div", { sinif: "fk-siparis-durum" }, durumMetni, eylem));
}

export function satinAlmaPaneli(b) {
  const { durum, ui, gonder } = b;
  const ihtiyac = malzemeIhtiyaci(durum);
  const form = ui.form || (ui.form = {});
  if (!form.malzeme || !MALZEME[form.malzeme]) {
    const acil = ihtiyac.find((m) => (m.durum === "gec-kaldi" || m.durum === "bugun-ver") && m.onerilen > 0) || ihtiyac[0];
    form.malzeme = acil.id;
    form.tedarikci = onerilenTedarikci(acil);
    form.miktar = acil.onerilen || MALZEME[acil.id].paket;
  }
  const m = ihtiyac.find((x) => x.id === form.malzeme);
  if (!form.tedarikci || !tedarikEdebilir(m.id, form.tedarikci)) form.tedarikci = onerilenTedarikci(m);
  const birim = MALZEME[m.id].birim;
  const oyunda = durum.evre === "oyun";

  /* Tutar, uyarılar ve düğme: miktar yazılırken paneli yeniden çizmeden güncellenir */
  const tutarEl = h("strong", { metin: "—" });
  const uyariKap = h("div", { sinif: "fk-uyari-kap", "aria-live": "polite" });
  const ver = h("button", {
    sinif: "dugme fk-dugme", type: "button", "data-odak": "sa-ver",
    on: { click: () => {
      const miktar = Number.parseInt(form.miktar, 10);
      const sonuc = gonder({ tip: "SIPARIS_VER", malzeme: m.id, tedarikci: form.tedarikci, miktar });
      if (!sonuc.hata) ui.form = null;
    } },
  }, "Sipariş ver");
  const ozetiGuncelle = () => {
    const miktar = Number.parseInt(form.miktar, 10);
    const gecerli = /^\d+$/.test(String(form.miktar).trim()) && miktar >= 1 && miktar <= 1000000;
    const tutar = gecerli ? miktar * birimFiyat(m.id, form.tedarikci) : 0;
    tutarEl.textContent = gecerli ? tl(tutar) : "—";
    ver.disabled = !oyunda || !gecerli;
    temizle(uyariKap);
    if (gecerli && durum.butce.harcanan + tutar > durum.butce.limit) uyariKap.appendChild(not(`Bu sipariş günlük bütçeyi aşar (${tl(durum.butce.harcanan + tutar)} / ${tl(durum.butce.limit)}).`, "dikkat"));
    if (gecerli && m.onerilen > 0 && miktar > m.onerilen * AYARLAR.FAZLA_MIKTAR_UYARI_KATI) uyariKap.appendChild(not(`Miktar önerilenin ${AYARLAR.FAZLA_MIKTAR_UYARI_KATI} katından fazla; gereksiz fazla sipariş puan düşürür.`, "dikkat"));
    if (!gecerli && String(form.miktar).trim() !== "") uyariKap.appendChild(not("Miktar 1 ile 1.000.000 arasında tam sayı olmalı.", "acil"));
  };

  const malzemeSecimi = h("select", {
    id: "fk-sa-malzeme", "data-odak": "sa-malzeme",
    on: { change: (e) => {
      const yeni = ihtiyac.find((x) => x.id === e.target.value);
      form.malzeme = yeni.id;
      form.tedarikci = onerilenTedarikci(yeni);
      form.miktar = yeni.onerilen || MALZEME[yeni.id].paket;
      b.yenile();
    } },
  }, ihtiyac.map((x) => {
    const [etiket] = mrpEtiketi(x, durum.gun);
    return h("option", { value: x.id, selected: x.id === m.id, metin: `${x.ad} — ${etiket}` });
  }));

  const tedarikciler = h("fieldset", { sinif: "fk-tedarikciler" }, h("legend", { metin: "Tedarikçi" }),
    AYARLAR.TEDARIKCILER.map((t) => {
      const olur = tedarikEdebilir(m.id, t.id);
      const varis = durum.gun + tedarikSuresi(m.id, t.id);
      const yetisir = m.bitis == null || varis <= m.bitis;
      return h("label", { sinif: `fk-tedarikci${olur ? "" : " fk-pasif"}` },
        h("input", { type: "radio", name: "fk-tedarikci", value: t.id, checked: form.tedarikci === t.id, disabled: !olur, "data-odak": `sa-ted-${t.id}`,
          on: { change: () => { form.tedarikci = t.id; b.yenile(); } } }),
        h("span", { sinif: "fk-tedarikci-metin" },
          h("strong", { metin: `${t.ad} · ${tedarikSuresi(m.id, t.id)} gün` }),
          h("span", { metin: olur ? `${tl(birimFiyat(m.id, t.id))}/${birim} · varış ${gunAdi(varis)}` : "Bu kalemi vermez (ithal)" }),
          olur && m.bitis != null ? rozet(yetisir ? "Yetişir" : "Geç gelir", yetisir ? "yolunda" : "acil") : null));
    }));

  const miktarGirdisi = h("input", { id: "fk-sa-miktar", type: "text", inputmode: "numeric", autocomplete: "off", deger: String(form.miktar ?? ""), "data-odak": "sa-miktar",
    on: { input: (e) => { form.miktar = e.target.value; ozetiGuncelle(); } } });
  const miktarAlani = h("div", { sinif: "fk-alan" },
    h("label", { for: "fk-sa-miktar", metin: `Miktar (${birim})` }),
    h("div", { sinif: "fk-satir" },
      miktarGirdisi,
      m.onerilen > 0 ? h("button", { sinif: "dugme-cizgi fk-kucuk-dugme", type: "button", on: { click: () => { form.miktar = m.onerilen; miktarGirdisi.value = String(m.onerilen); ozetiGuncelle(); } } }, `Önerilen: ${sayi(m.onerilen)}`) : null));
  ozetiGuncelle();

  const [etiket, seviye] = mrpEtiketi(m, durum.gun);
  const formBolumu = bolum("Yeni sipariş",
    h("div", { sinif: "fk-alan" }, h("label", { for: "fk-sa-malzeme", metin: "Malzeme" }), malzemeSecimi),
    h("p", { sinif: "fk-sa-ozet" }, rozet(etiket, seviye),
      ` Stok ${sayi(m.stok)} ${birim} · bugün ${sayi(m.bugunIhtiyac)} · bitiş ${m.bitis ? gunAdi(m.bitis) : "ufukta yok"}${m.bekleyen ? ` · onay bekleyen ${sayi(m.bekleyen)}` : ""}`),
    tedarikciler, miktarAlani,
    h("p", { sinif: "fk-tutar" }, "Tutar: ", tutarEl),
    uyariKap, ver,
    not(`Sipariş verilince tedarikçi ${AYARLAR.YANIT_SURESI_DK[0]}–${AYARLAR.YANIT_SURESI_DK[1]} dakikada yanıt verir; onayı ${AYARLAR.ONAY_SURESI_DK / 60} oyun saati dolmadan almazsanız sipariş düşer.`));

  const siparisler = durum.satinalma.filter((s) => !s.oncedenVerilmis || s.durum !== "teslim").slice().reverse()
    .filter((s) => ["yanit-bekliyor", "onay-bekliyor", "onaylandi", "kapida"].includes(s.durum) || s.gun === durum.gun);

  return h("div", {},
    butceBilgisi(durum),
    formBolumu,
    bolum("Siparişler", siparisler.length ? h("ul", { sinif: "fk-siparisler" }, siparisler.map((s) => siparisSatiri(durum, s, gonder))) : bos("Açık sipariş yok.")));
}
