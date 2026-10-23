/* Planlama (Dünya) paneli: plan ve kapasite, malzeme ihtiyacı (PLANLA mantığı). */
import { AYARLAR } from "../ayarlar.js";
import { URUN, URUN_IDLER, MALZEME, TEDARIKCI, HAT, tedarikEdebilir, birimFiyat, tedarikSuresi } from "../veri/katalog.js";
import { kapasiteTablosu, malzemeIhtiyaci, kalanPlan } from "../motor/mrp.js";
import { sayi, saat, gunAdi, goreli, yuzde } from "../bicim.js";
import { h, cubuk, ikon } from "./dom.js";
import { bolum, rozet, bos, not } from "./ortak.js";

export const MRP_ETIKET = {
  "gec-kaldi": ["GEÇ KALINDI", "acil"],
  "bugun-ver": ["BUGÜN VER", "dikkat"],
  sonra: ["İleride", "bilgi"],
  yeterli: ["Yeterli", "yolunda"],
  "onay-bekliyor": ["Sipariş verildi", "bilgi"],
};

export function mrpEtiketi(m, bugun) {
  if (m.durum === "sonra") return [`${m.verGun - bugun} gün sonra ver`, "bilgi"];
  return MRP_ETIKET[m.durum];
}

/* Kalemin neden bugün (ya da geç) olduğunu söyleyen cümle: Planlama'nın malzeme ihtiyacı ve Satın Alma'nın formu aynı cümleyi gösterir */
export function mrpIpucu(m) {
  if (m.durum === "gec-kaldi") return m.yetisen.length ? `${m.yetisen.map((t) => TEDARIKCI[t].ad).join(", ")} yetişir.` : "Hiçbir tedarikçi bitişten önce getiremez; en hızlısı açığı kısaltır.";
  if (m.durum === "bugun-ver") return `${TEDARIKCI[m.standart].ad} ile bugün verilirse tam zamanında gelir.`;
  return "";
}

/* Önerilen tedarikçi: geç kalındıysa yetişenlerin en ucuzu (yoksa en hızlısı), değilse standart */
export function onerilenTedarikci(m) {
  if (m.durum === "gec-kaldi" || m.durum === "bugun-ver") {
    if (m.yetisen.length) return m.yetisen.slice().sort((a, b) => birimFiyat(m.id, a) - birimFiyat(m.id, b))[0];
    return AYARLAR.TEDARIKCILER.filter((t) => tedarikEdebilir(m.id, t.id)).sort((a, b) => tedarikSuresi(m.id, a.id) - tedarikSuresi(m.id, b.id))[0].id;
  }
  return m.standart;
}

export function planlamaPaneli(b) {
  const { durum, ui, gonder } = b;
  const sekme = ui.planSekme || "plan";
  const sec = (s) => {
    ui.planSekme = s;
    if (s === "ihtiyac") gonder({ tip: "IHTIYAC_GORULDU" });
    b.yenile();
  };
  const sekmeDugmesi = (id, ad) => h("button", {
    sinif: "fk-sekme", type: "button", role: "tab", "aria-selected": String(sekme === id), "data-odak": `sekme-${id}`,
    on: { click: () => sec(id) },
  }, ad);
  return h("div", {},
    h("div", { sinif: "fk-sekmeler", role: "tablist", "aria-label": "Planlama" }, sekmeDugmesi("plan", "Plan ve kapasite"), sekmeDugmesi("ihtiyac", "Malzeme ihtiyacı")),
    h("div", { role: "tabpanel" }, sekme === "plan" ? planSekmesi(b) : ihtiyacSekmesi(b)));
}

/* "Siparişi plana al"dan sonra panel kendiliğinden "Malzeme ihtiyacı" sekmesine geçer (görev notunun sıradaki adımı) */
function planaAlIhtiyacaGec(b) {
  b.ui.planSekme = "ihtiyac";
  b.gonder({ tip: "PLANA_AL" });
  b.gonder({ tip: "IHTIYAC_GORULDU" });
  b.yenile();
  const sekme = document.querySelector('.fk-panel [data-odak="sekme-ihtiyac"]');
  if (sekme) sekme.focus({ preventScroll: true });
}

function planDurumu(b) {
  const { durum, gonder } = b;
  const pb = durum.planBilgi;
  const oyunda = durum.evre === "oyun";
  const dugme = (metin, birincil, tikla = () => gonder({ tip: "PLANA_AL" })) => h("button", {
    sinif: birincil ? "dugme fk-dugme" : "dugme-cizgi", type: "button", disabled: !oyunda, "data-odak": "plana-al",
    on: { click: tikla },
  }, metin);
  if (pb.dk == null) return h("div", { sinif: "fk-kutu fk-kutu-acil" }, h("p", {}, h("strong", { metin: "Plan yok. " }), "Sabah gelen siparişler henüz plana alınmadı; hatlar ne üreteceğini bilmiyor."), dugme("Siparişi plana al", true, () => planaAlIhtiyacaGec(b)));
  if (!pb.guncel) return h("div", { sinif: "fk-kutu fk-kutu-dikkat" }, h("p", {}, h("strong", { metin: "Plan güncel değil. " }), "Siparişler ya da kapasite değişti; plan eski siparişlere göre."), dugme("Planı güncelle", true));
  return h("div", { sinif: "fk-kutu" }, h("p", {}, h("strong", { metin: "Plan güncel. " }), `Son planlama: ${gunAdi(Math.floor(pb.dk / 1440) + 1)}, saat ${saat(pb.dk % 1440)}.`), dugme("Yeniden planla", false));
}

function planSekmesi(b) {
  const { durum } = b;
  const tablo = kapasiteTablosu(durum, 5);
  const gec = durum.planBilgi.guncel ? durum.planBilgi.gecKalacak : [];
  const gunEtiketi = (g) => (g === durum.gun ? "Bugün" : g === durum.gun + 1 ? "Yarın" : gunAdi(g));

  const uyarilar = gec.length
    ? bolum("Kapasite uyarısı",
      h("ul", { sinif: "fk-uyarilar" }, gec.map((g) => h("li", {}, ikon("uyari"), h("span", { metin: `${HAT[g.hat].ad} yetmiyor: ${g.metin} (teslim ${gunAdi(g.teslim)}) geç kalacak, eksik ${sayi(g.eksik)}.` })))),
      not("Üretim odasından bu gece ikinci vardiya açıp planı güncellerseniz geciken satırlar bu geceye alınır."),
      h("button", { sinif: "dugme-cizgi", type: "button", on: { click: () => b.odaAc("uretim") } }, "Üretim odasına git"))
    : null;

  const kapasite = bolum("Hat kapasitesi (5 gün)",
    tablo.map((t) => h("div", { sinif: "fk-kapasite" },
      h("p", { sinif: "fk-kapasite-ad" }, h("strong", { metin: t.ad }), t.verim < 1 ? rozet(`Kapasite ${yuzde(t.verim * 100)}`, "dikkat") : null),
      h("ol", { sinif: "fk-kapasite-gunler" }, t.gunler.map((g) => {
        const oran = g.kapasite > 0 ? g.yuk / g.kapasite : g.yuk > 0 ? 2 : 0;
        const seviye = oran > 1 ? "acil" : oran > AYARLAR.KAPASITE_UYARI_ORANI ? "dikkat" : "yolunda";
        return h("li", { sinif: `fk-kapasite-gun fk-seviye-${seviye}` },
          h("span", { sinif: "fk-kapasite-gun-ad", metin: gunEtiketi(g.gun) }),
          cubuk(Math.min(1, oran), `fk-cubuk-${seviye}`),
          h("span", { sinif: "fk-kapasite-oran", metin: g.kapasite > 0 ? yuzde(oran * 100) : g.yuk > 0 ? "dolu" : "—" }));
      })))),
    not("Yük: plandaki işin dakikası. Bugünün kapasitesi kalan saatten hesaplanır."));

  const bugun = durum.plan[durum.gun] || {};
  const uretilen = durum.uretilen[durum.gun] || {};
  const bugunku = URUN_IDLER.filter((u) => bugun[u]).map((u) =>
    h("li", { sinif: "fk-uretim-satir" }, h("span", { metin: URUN[u].ad }), cubuk((uretilen[u] || 0) / bugun[u]), h("span", { sinif: "fk-sayi", metin: `${sayi(uretilen[u] || 0)} / ${sayi(bugun[u])}` })));

  const gunler = Array.from({ length: 5 }, (_, i) => durum.gun + i);
  const planTablosu = h("table", { sinif: "fk-tablo" },
    h("caption", { sinif: "gizli", metin: "Önümüzdeki 5 günün üretim planı" }),
    h("thead", {}, h("tr", {}, h("th", { scope: "col", metin: "Ürün" }), gunler.map((g) => h("th", { scope: "col", metin: gunEtiketi(g) })))),
    h("tbody", {}, URUN_IDLER.map((u) => h("tr", {}, h("th", { scope: "row", metin: URUN[u].ad }),
      gunler.map((g) => h("td", { sinif: "fk-sayi", metin: sayi(g === durum.gun ? kalanPlan(durum, u, g) : ((durum.plan[g] || {})[u] || 0)) }))))));

  return h("div", {}, planDurumu(b), uyarilar, kapasite,
    bolum("Bugünkü üretim", bugunku.length ? h("ul", { sinif: "fk-uretim" }, bugunku) : bos("Bugün için plan yok.")),
    bolum("Plan (adet; bugün: kalan)", h("div", { sinif: "fk-tablo-kap" }, planTablosu)));
}

function ihtiyacSekmesi(b) {
  const { durum } = b;
  const ihtiyac = malzemeIhtiyaci(durum);
  const sira = { "gec-kaldi": 0, "bugun-ver": 1, "onay-bekliyor": 2, sonra: 3, yeterli: 4 };
  ihtiyac.sort((x, y) => sira[x.durum] - sira[y.durum] || (x.verGun ?? 99) - (y.verGun ?? 99));
  const planYok = durum.planBilgi.dk == null;

  const satirlar = ihtiyac.map((m) => {
    const [etiket, seviye] = mrpEtiketi(m, durum.gun);
    const birim = MALZEME[m.id].birim;
    const ipucu = mrpIpucu(m);
    const satinAl = (m.durum === "gec-kaldi" || m.durum === "bugun-ver" || m.durum === "sonra") && m.onerilen > 0 && durum.evre === "oyun"
      ? h("button", { sinif: "dugme-cizgi fk-kucuk-dugme", type: "button", "data-odak": `al-${m.id}`,
        on: { click: () => b.odaAc("satinalma", { malzeme: m.id, miktar: m.onerilen, tedarikci: onerilenTedarikci(m) }) } }, "Satın al", ikon("ok"))
      : null;
    return h("li", { sinif: `fk-mrp fk-mrp-${seviye}` },
      h("div", { sinif: "fk-mrp-bas" }, h("strong", { metin: m.ad }), rozet(etiket, seviye)),
      h("dl", { sinif: "fk-mrp-sayilar" },
        h("div", {}, h("dt", { metin: "Sabah sayımı" }), h("dd", { metin: `${sayi(m.sabah)} ${birim}` })),
        h("div", {}, h("dt", { metin: "Stok" }), h("dd", { metin: sayi(m.stok) })),
        h("div", {}, h("dt", { metin: "Bugün ihtiyaç" }), h("dd", { metin: sayi(m.bugunIhtiyac) })),
        h("div", {}, h("dt", { metin: "Stok bitiş" }), h("dd", { metin: m.bitis ? `${gunAdi(m.bitis)} (${goreli(m.bitis, durum.gun)})` : "Ufukta bitmez" })),
        h("div", {}, h("dt", { metin: "Sipariş günü" }), h("dd", { metin: m.verGun == null ? "—" : `${gunAdi(m.verGun)} (${TEDARIKCI[m.standart].ad}, ${tedarikSuresi(m.id, m.standart)} gün)` })),
        m.bekleyen || m.gelecek ? h("div", {}, h("dt", { metin: "Yolda / bekleyen" }), h("dd", { metin: `${sayi(m.gelecek)} / ${sayi(m.bekleyen)}` })) : null),
      ipucu ? h("p", { sinif: "fk-mrp-ipucu", metin: ipucu }) : null,
      satinAl);
  });

  const agac = h("details", { sinif: "fk-agac" }, h("summary", { metin: "Ürün ağacı (bir ürün için malzeme)" }),
    h("div", { sinif: "fk-tablo-kap" }, h("table", { sinif: "fk-tablo" },
      h("thead", {}, h("tr", {}, h("th", { scope: "col", metin: "Malzeme" }), URUN_IDLER.map((u) => h("th", { scope: "col", metin: URUN[u].ad })))),
      h("tbody", {}, AYARLAR.MALZEMELER.map((m) => h("tr", {}, h("th", { scope: "row", metin: m.ad }),
        URUN_IDLER.map((u) => h("td", { sinif: "fk-sayi", metin: (durum.urunAgaci[u] || {})[m.id] ? sayi(durum.urunAgaci[u][m.id]) : "·" }))))))));

  return h("div", {},
    planYok ? h("div", { sinif: "fk-kutu fk-kutu-dikkat" }, h("p", { metin: "Plan yok: günlük ihtiyaç plandan hesaplanır. Önce siparişi plana alın." }),
      h("button", { sinif: "dugme fk-dugme", type: "button", disabled: durum.evre !== "oyun", on: { click: () => b.gonder({ tip: "PLANA_AL" }) } }, "Siparişi plana al")) : null,
    not(`Sabah sayımı saat 08:00'de yapıldı. Sipariş günü, ${TEDARIKCI[AYARLAR.STANDART_TEDARIKCI].ad} (ithal kalemde ithalatçı) tedarik süresiyle hesaplanır.`),
    h("ul", { sinif: "fk-mrp-liste" }, satirlar),
    agac);
}
