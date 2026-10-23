/* Olay üreten odaların panelleri: Satış-Pazarlama, Ar-Ge, Üretim, Depo, Kalite, İnsan Kaynakları, Finans-Muhasebe.
   Odaların içi gerçek iş: sipariş defteri, ürün ağacı, makineler ve vardiya, stok ve mal kabul, kararlar. */
import { AYARLAR } from "../ayarlar.js";
import { URUN, URUN_IDLER, MALZEME, HAT, HAT_IDLER, TEDARIKCI, hatUrunleri } from "../veri/katalog.js";
import { acikSatirlar, teslimSirasi } from "../motor/siparis.js";
import { hatVerimi } from "../motor/mrp.js";
import { hatHali } from "../motor/uretim.js";
import { bagliPara } from "../motor/karne.js";
import { sayi, tl, gunAdi, goreli, sure, geriSayim, yuzde } from "../bicim.js";
import { h, cubuk } from "./dom.js";
import { bolum, rozet, bos, not, bilgi, olayListesi } from "./ortak.js";
import { butceBilgisi, siparisSatiri } from "./panel-satinalma.js";

/* ---- Satış-Pazarlama (Merkür): sipariş defteri ---- */
export function satisPaneli({ durum }) {
  const satirlar = durum.siparisler.filter((s) => s.durum === "acik" || s.sevkGun === durum.gun || (s.sevkGun === durum.gun - 1 && durum.evre !== "oyun"));
  const musteriler = [...new Set(satirlar.map((s) => s.musteri))];
  const degisimRozeti = (s) => {
    const d = s.degisim;
    if (!d) return null;
    if (d.tur === "yeni") return rozet("Yeni", "bilgi");
    if (d.tur === "acil") return rozet("Acil", "acil");
    if (d.tur === "one") return rozet(`Öne çekildi: ${gunAdi(d.eskiGun)} → ${gunAdi(s.gun)}${d.eskiMiktar !== s.miktar ? `, ${sayi(d.eskiMiktar)} → ${sayi(s.miktar)}` : ""}`, "dikkat");
    return rozet(`Miktar ${sayi(d.eskiMiktar)} → ${sayi(s.miktar)}`, "dikkat");
  };
  const bugunku = acikSatirlar(durum).filter((s) => s.gun <= durum.gun).sort(teslimSirasi);
  const kalan = { ...durum.mamul };
  const sevk = bugunku.map((s) => {
    const hazir = kalan[s.urun] >= s.miktar;
    if (hazir) kalan[s.urun] -= s.miktar;
    return h("li", {}, h("span", { metin: `${s.musteri} · ${sayi(s.miktar)} ${URUN[s.urun].ad.toLocaleLowerCase("tr")}${s.gun < durum.gun ? " (gecikmiş)" : ""}` }),
      rozet(hazir ? "Depoda hazır" : `Eksik: ${sayi(s.miktar - Math.max(0, kalan[s.urun]))}`, hazir ? "yolunda" : "acil"));
  });
  return h("div", {},
    bolum("Bugün 18:00 sevkiyatı", sevk.length ? h("ul", { sinif: "fk-liste" }, sevk) : bos("Bugün teslim edilecek satır yok.")),
    bolum(`Sipariş defteri · ${musteriler.length} müşteri, ${acikSatirlar(durum).length} açık satır`,
      musteriler.map((ad) => h("div", { sinif: "fk-musteri" },
        h("h4", { metin: ad }),
        h("ul", { sinif: "fk-liste" }, satirlar.filter((s) => s.musteri === ad).sort(teslimSirasi).map((s) =>
          h("li", { sinif: s.gec ? "fk-gec" : "" },
            h("span", { metin: `${sayi(s.miktar)} ${URUN[s.urun].ad.toLocaleLowerCase("tr")}` }),
            h("span", { sinif: "fk-soluk", metin: s.durum === "sevk" ? `sevk edildi (${gunAdi(s.sevkGun)})` : `teslim ${gunAdi(s.gun)} · ${goreli(s.gun, durum.gun)}` }),
            s.gec && s.durum === "acik" ? rozet("Gecikti", "acil") : null,
            degisimRozeti(s))))))),
    not(`Siparişler ${AYARLAR.UFUK_GUN} günlük ufukla gelir ve her gece değişebilir. Değişen satırlar işaretlidir.`),
    bolum("Bugün", olayListesi(durum, "satis")));
}

/* ---- Ar-Ge (Venüs): ürün ağaçları ---- */
export function argePaneli({ durum }) {
  const degisen = new Set(durum.agacDegisiklikleri.map((d) => `${d.urun}:${d.malzeme}`));
  return h("div", {},
    URUN_IDLER.map((u) => bolum(`${URUN[u].ad} · ${HAT[URUN[u].hat].ad}, ${URUN[u].dakika} dk/adet`,
      h("ul", { sinif: "fk-liste" }, Object.entries(durum.urunAgaci[u]).map(([m, adet]) =>
        h("li", {}, h("span", { metin: MALZEME[m].ad }), h("span", { sinif: "fk-sayi", metin: `${sayi(adet)} ${MALZEME[m].birim}` }), degisen.has(`${u}:${m}`) ? rozet("Değişti", "dikkat") : null))))),
    durum.agacDegisiklikleri.length ? bolum("Değişiklik geçmişi", h("ul", { sinif: "fk-liste" }, durum.agacDegisiklikleri.map((d) =>
      h("li", {}, h("span", { metin: `${gunAdi(d.gun)}: ${URUN[d.urun].ad}, ${MALZEME[d.malzeme].ad} ${d.eski} → ${d.yeni}` }))))) : null,
    bolum("Bugün", olayListesi(durum, "arge")));
}

/* ---- Üretim (Mars): hatlar, makineler, vardiya ---- */
export function uretimPaneli({ durum, gonder }) {
  const oyunda = durum.evre === "oyun";
  const hatlar = HAT_IDLER.map((id) => {
    const hal = hatHali(durum, id);
    const h0 = durum.hatlar[id];
    const verim = hatVerimi(durum, id, durum.gun);
    const plan = durum.plan[durum.gun] || {};
    const uretilen = durum.uretilen[durum.gun] || {};
    const halMetni =
      hal.tur === "calisiyor" ? ["Çalışıyor", "yolunda"]
      : hal.tur === "durus" ? [`Durdu: ${hal.neden}, ${sure(hal.kalanDk)} daha`, "acil"]
      : hal.tur === "malzeme" ? [`Durdu: ${MALZEME[hal.malzeme].ad} yok`, "acil"]
      : [oyunda ? "Boşta (planda iş yok)" : "Gün bitti", "bilgi"];
    const karar = durum.kararlar.find((k) => k.durum === "bekliyor" && k.tur === "makine-durusu" && k.hat === id);
    return bolum(HAT[id].ad,
      h("p", {}, rozet(halMetni[0], halMetni[1]), verim < 1 ? rozet(`Kapasite ${yuzde(verim * 100)} (usta eksik)`, "dikkat") : null),
      h("ul", { sinif: "fk-uretim" }, hatUrunleri(id).map((u) => h("li", { sinif: "fk-uretim-satir" },
        h("span", { metin: URUN[u].ad }), cubuk(plan[u] ? (uretilen[u] || 0) / plan[u] : 0), h("span", { sinif: "fk-sayi", metin: `${sayi(uretilen[u] || 0)} / ${sayi(plan[u] || 0)}` })))),
      bilgi([["Bugün duruş", sure(h0.durusDk)], ["Bugün çalışma", sure(h0.calisanDk)], ["Kadro", `${HAT[id].usta} usta, ${HAT[id].operator} operatör`]]),
      karar ? h("div", { sinif: "fk-kutu fk-kutu-acil", "data-durak": karar.id },
        h("p", { metin: `Makine arızası: tahmini ${sure(Math.max(0, h0.durusSonDk - ((durum.gun - 1) * 1440 + durum.dk)))} daha duracak. Acil bakım ${tl(AYARLAR.ACIL_BAKIM.maliyet)}; hat en geç ${sure(AYARLAR.ACIL_BAKIM.durusDk)} içinde çalışır.` }),
        h("div", { sinif: "fk-satir" },
          h("button", { sinif: "dugme fk-dugme fk-kucuk-dugme", type: "button", disabled: !oyunda, "data-odak": `bakim-${id}`, on: { click: () => gonder({ tip: "KARAR", id: karar.id, secim: "acil-bakim" }) } }, "Acil bakım çağır"),
          h("button", { sinif: "dugme-cizgi fk-kucuk-dugme", type: "button", disabled: !oyunda, on: { click: () => gonder({ tip: "KARAR", id: karar.id, secim: "bekle" }) } }, "Bekle"))) : null,
      h("label", { sinif: "fk-anahtar" },
        h("input", { type: "checkbox", checked: h0.ikinciVardiya, disabled: !oyunda, "data-odak": `vardiya-${id}`, on: { change: (e) => gonder({ tip: "VARDIYA", hat: id, acik: e.target.checked }) } }),
        h("span", { metin: `Bu gece ikinci vardiya (${AYARLAR.IKINCI_VARDIYA.dakika / 60} saat, ${tl(AYARLAR.IKINCI_VARDIYA.maliyet)})` })));
  });
  return h("div", {},
    not("Tek vardiya 08:00–18:00. İkinci vardiya gece çalışır: önce bugünün kalanını, sonra yarının planını üretir; maliyeti günlük bütçeden düşer."),
    hatlar,
    bolum("Bugün", olayListesi(durum, "uretim")));
}

/* ---- Depo (Jüpiter): mal kabul, stok, sayım ---- */
export function depoPaneli({ durum, gonder }) {
  const kapida = durum.satinalma.filter((s) => s.durum === "kapida");
  const yolda = durum.satinalma.filter((s) => s.durum === "onaylandi").sort((a, b) => a.varisGun - b.varisGun);
  return h("div", {},
    bolum("Kapıdaki teslimatlar", kapida.length ? h("ul", { sinif: "fk-siparisler" }, kapida.map((s) =>
      h("li", { sinif: "fk-siparis" },
        h("div", { sinif: "fk-siparis-bas" }, h("strong", { metin: `${MALZEME[s.malzeme].ad} · ${sayi(s.miktar)} ${MALZEME[s.malzeme].birim}` }), h("span", { sinif: "fk-soluk", metin: TEDARIKCI[s.tedarikci].ad })),
        h("button", { sinif: "dugme fk-dugme fk-kucuk-dugme", type: "button", disabled: durum.evre !== "oyun", "data-odak": `teslim-${s.id}`, on: { click: () => gonder({ tip: "TESLIM_AL", id: s.id }) } }, "Teslim al")))) : bos("Kapıda bekleyen teslimat yok.")),
    bolum("Yoldaki teslimatlar", yolda.length ? h("ul", { sinif: "fk-liste" }, yolda.map((s) =>
      h("li", {}, h("span", { metin: `${MALZEME[s.malzeme].ad} · ${sayi(s.miktar)} ${MALZEME[s.malzeme].birim}` }), h("span", { sinif: "fk-soluk", metin: `${gunAdi(s.varisGun)} · ${goreli(s.varisGun, durum.gun)}` })))) : bos("Yolda teslimat yok.")),
    bolum("Malzeme stoğu", h("ul", { sinif: "fk-liste fk-iki-sutun" }, AYARLAR.MALZEMELER.map((m) =>
      h("li", {}, h("span", { metin: m.ad }), h("span", { sinif: "fk-sayi", metin: `${sayi(durum.stok[m.id])} ${m.birim}` }))))),
    bolum("Mamul stoğu", h("ul", { sinif: "fk-liste" }, URUN_IDLER.map((u) =>
      h("li", {}, h("span", { metin: URUN[u].ad }), h("span", { sinif: "fk-sayi", metin: `${sayi(durum.mamul[u])} adet` }))))),
    bolum("Bugün", olayListesi(durum, "depo")));
}

/* ---- Kalite (Satürn): bozuk parti kararları ---- */
export function kalitePaneli({ durum, gonder, odaAc }) {
  const oyunda = durum.evre === "oyun";
  const bekleyen = durum.kararlar.filter((k) => k.durum === "bekliyor" && k.oda === "kalite");
  return h("div", {},
    bolum("Karar bekleyen partiler", bekleyen.length ? bekleyen.map((k) => h("div", { sinif: "fk-kutu fk-kutu-acil", "data-durak": k.id },
      h("p", {}, h("strong", { metin: `${MALZEME[k.malzeme].ad} · ${sayi(k.miktar)} ${MALZEME[k.malzeme].birim} bozuk. ` }),
        `Karar için `, h("span", { sinif: "fk-geri-sayim", "data-kalan": k.id, metin: `${geriSayim(k.kalanDk)} kaldı` }), "."),
      h("ul", { sinif: "fk-secenekler" },
        h("li", { metin: `Yeniden işle: partinin yüzde ${Math.round(AYARLAR.YENIDEN_ISLEME.kurtarma * 100)} kadarı hemen stoğa döner, hat ${sure(AYARLAR.YENIDEN_ISLEME.hatDakika)} bu işle meşgul olur.` }),
        h("li", { metin: "Yeniden sipariş: parti hurdaya ayrılır, yerine Satın Alma'dan sipariş verirsiniz." })),
      h("div", { sinif: "fk-satir" },
        h("button", { sinif: "dugme fk-dugme fk-kucuk-dugme", type: "button", disabled: !oyunda, "data-odak": `isle-${k.id}`, on: { click: () => gonder({ tip: "KARAR", id: k.id, secim: "yeniden-isle" }) } }, "Yeniden işle"),
        h("button", { sinif: "dugme-cizgi fk-kucuk-dugme", type: "button", disabled: !oyunda, on: { click: () => {
          const sonuc = gonder({ tip: "KARAR", id: k.id, secim: "yeniden-siparis" });
          if (sonuc.satinAlma) odaAc("satinalma", sonuc.satinAlma);
        } } }, "Yeniden sipariş")))) : bos("Bekleyen karar yok.")),
    not(`Karar süresi dolarsa parti hurdaya ayrılır ve unutulan iş sayılır.`),
    bolum("Bugün", olayListesi(durum, "kalite")));
}

/* ---- İnsan Kaynakları (Uranüs): kadro ---- */
export function ikPaneli({ durum }) {
  return h("div", {},
    HAT_IDLER.map((id) => {
      const h0 = durum.hatlar[id];
      const eksik = h0.verimSonGun >= durum.gun && h0.verim < 1;
      return bolum(HAT[id].ad,
        bilgi([["Usta", `${HAT[id].usta - (eksik ? 1 : 0)} / ${HAT[id].usta}`], ["Operatör", String(HAT[id].operator)],
          ["Kapasite", eksik ? `${yuzde(h0.verim * 100)} (${gunAdi(h0.verimSonGun)} sonuna kadar)` : "%100"]]),
        eksik ? not("Yeni usta gelene kadar hat daha yavaş çalışır; planı güncel tutun.", "dikkat") : null);
    }),
    bolum("Bugün", olayListesi(durum, "ik")));
}

/* ---- Finans-Muhasebe (Neptün): bütçe ve bağlanan para ---- */
export function finansPaneli({ durum }) {
  const bugunSiparis = durum.satinalma.filter((s) => s.gun === durum.gun && !s.oncedenVerilmis && s.durum !== "dustu");
  const satinAlma = bugunSiparis.reduce((t, s) => t + s.tutar, 0);
  return h("div", {},
    butceBilgisi(durum),
    bolum("Bugünkü harcama", bilgi([
      ["Satın alma", tl(satinAlma)],
      ["Diğer (vardiya, bakım)", tl(Math.max(0, durum.butce.harcanan - satinAlma))],
      ["Toplam", tl(durum.butce.harcanan)],
    ])),
    bolum("Depoda bağlanan para", h("p", { sinif: "fk-buyuk-sayi", metin: tl(bagliPara(durum)) }),
      not("Malzeme stoğu alış fiyatıyla, mamul stoğu maliyetiyle hesaplanır.")),
    bolum("Bugün", olayListesi(durum, "finans")));
}

export { siparisSatiri };
