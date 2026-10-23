/* Fabricakit · tarayıcı giriş noktası. Store'u kurar, oyun saatini çalıştırır, ekranları çizer.
   Kayıt yalnızca bu tarayıcıda (localStorage) tutulur; üyelik ve sunucuda oyuncu verisi yoktur. */
import { AYARLAR } from "./ayarlar.js";
import { fabrikaTabelasi } from "./odalar.js";
import { olusturStore } from "./motor/durum.js";
import { kaydaYaz, kayittanOku } from "./motor/kayit.js";
import { odaDurumlari } from "./motor/durumlar.js";
import { saat, gunAdi, sayi } from "./bicim.js";
import { h, temizle, ikon } from "./arayuz/dom.js";
import { haritaKur } from "./arayuz/harita.js";
import { panelCiz, canliGuncelle } from "./arayuz/panel.js";

const KAYIT = "fabricakit-kayit";
const depo = {
  oku(k) { try { return localStorage.getItem(k); } catch { return null; } },
  yaz(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  sil(k) { try { localStorage.removeItem(k); } catch { /* yok */ } },
};

const kok = document.getElementById("fk");
const ui = { secili: null, planSekme: "plan", form: null };
let store = null;
let ekran = null;
let saatAcik = true;

/* ---------------- kayıt ---------------- */
let sonKayit = 0;
function kaydet(zorla = false) {
  if (!store) return;
  const simdi = Date.now();
  if (!zorla && simdi - sonKayit < 1500) return;
  sonKayit = simdi;
  depo.yaz(KAYIT, kaydaYaz({ durum: store.durum, gunBasi: store.gunBasi }));
}

/* ---------------- giriş ---------------- */
function girisEkrani({ kayit, uyari }) {
  ekran = "giris";
  temizle(kok);
  const fab = fabrikaTabelasi();
  const basla = (yeni) => {
    store = olusturStore(yeni ? null : kayit);
    if (yeni) kaydet(true);
    oyunEkrani();
  };
  kok.appendChild(h("div", { sinif: "kap fk-giris" },
    h("div", { sinif: "kart fk-giris-kart" },
      h("p", { sinif: "ust-yazi", metin: `${fab.buyuk}${fab.kucuk ? ` · ${fab.kucuk}` : ""}` }),
      h("h1", { metin: "Fabricakit" }),
      h("p", { sinif: "hero-slogan", metin: "İşini kurgula, ajanı sorgula." }),
      uyari ? h("p", { sinif: "fk-not fk-not-dikkat", metin: uyari }) : null,
      h("div", { sinif: "fk-satir" },
        kayit ? h("button", { sinif: "dugme", type: "button", on: { click: () => basla(false) } }, `Devam et: ${gunAdi(kayit.durum.gun)}, ${saat(kayit.durum.dk)}`) : null,
        h("button", { sinif: kayit ? "dugme-cizgi" : "dugme", type: "button", on: { click: () => basla(true) } }, kayit ? "Baştan başla" : "Fabrikaya gir")),
      h("p", { sinif: "fk-excel" }, "Excel dosyalarını mı arıyorsunuz? ", h("a", { href: "/fabrika/", metin: "Fabrika Dosyaları" }), " rafına geçin."))));
}

/* ---------------- oyun ---------------- */
function oyunEkrani() {
  ekran = "oyun";
  temizle(kok);
  ui.secili = null;

  const gunEl = h("span", { sinif: "fk-gun" });
  const saatEl = h("span", { sinif: "fk-saat", "aria-live": "off" });
  const durakEl = h("span", { sinif: "fk-durak", metin: "" });
  const puanEl = h("span", { sinif: "fk-puan" });
  const duraklat = h("button", { sinif: "fk-ust-dugme", type: "button", on: { click: () => { saatAcik = !saatAcik; ustCiz(); } } });
  const bitir = h("button", { sinif: "fk-ust-dugme fk-bitir", type: "button", on: { click: gunuBitir } }, ikon("bayrak"), h("span", { sinif: "fk-dugme-metin", metin: "Günü bitir" }));
  const ust = h("div", { sinif: "fk-ust" },
    h("div", { sinif: "fk-ust-sol" }, gunEl, h("span", { sinif: "fk-saat-kap" }, ikon("saat"), saatEl), durakEl),
    h("div", { sinif: "fk-ust-sag" }, puanEl, duraklat, bitir));
  const haritaKap = h("div", { sinif: "fk-harita-kap" });
  const panelKap = h("aside", { sinif: "fk-panel", id: "fk-panel", "aria-labelledby": "fk-panel-baslik" });
  const perde = h("div", { sinif: "fk-perde", on: { click: paneliKapat } });
  const uygulama = h("div", { sinif: "fk-uygulama" }, ust, h("div", { sinif: "fk-govde" }, haritaKap, panelKap));
  kok.append(uygulama, perde);

  const harita = haritaKur(haritaKap, { odaSec });
  let sonDegisim = -1;
  let isiklar = {};

  function ustCiz() {
    const d = store.durum;
    gunEl.textContent = gunAdi(d.gun);
    saatEl.textContent = saat(d.dk);
    puanEl.textContent = `Puan ${sayi(d.puan.deger)}`;
    durakEl.textContent = saatAcik ? "" : "Duraklatıldı";
    temizle(duraklat).append(ikon(saatAcik ? "duraklat" : "oynat"), h("span", { sinif: "fk-dugme-metin", metin: saatAcik ? "Duraklat" : "Devam" }));
    duraklat.setAttribute("aria-pressed", String(!saatAcik));
  }

  const baglam = () => ({
    durum: store.durum, isiklar, ui,
    gonder: (e) => store.gonder(e),
    yenile: () => panelCiz(panelKap, baglam()),
    odaAc: (id, form) => { if (form) ui.form = form; odaSec(id); },
    kapat: paneliKapat,
  });

  function ciz(durum, eylem) {
    if (durum.evre !== "oyun") { kaydet(true); gunSonuEkrani(); return; }
    isiklar = odaDurumlari(durum);
    ustCiz();
    harita.guncelle(durum, isiklar, ui.secili);
    if (durum.degisim !== sonDegisim || eylem.tip !== "ILERLE") {
      sonDegisim = durum.degisim;
      panelCiz(panelKap, baglam());
    } else canliGuncelle(panelKap, durum);
    kaydet(eylem.tip !== "ILERLE");
  }

  function odaSec(id) {
    ui.secili = id;
    store.gonder({ tip: "GORULDU", oda: id });
    uygulama.classList.add("fk-panel-acik");
    perde.classList.add("fk-acik");
    panelCiz(panelKap, baglam());
    harita.guncelle(store.durum, isiklar, ui.secili);
    const baslik = panelKap.querySelector("#fk-panel-baslik");
    if (baslik) baslik.focus({ preventScroll: !window.matchMedia("(max-width: 959px)").matches });
  }

  function paneliKapat() {
    const onceki = ui.secili;
    ui.secili = null;
    uygulama.classList.remove("fk-panel-acik");
    perde.classList.remove("fk-acik");
    panelCiz(panelKap, baglam());
    harita.guncelle(store.durum, isiklar, null);
    const dugme = onceki && kok.querySelector(`.fk-oda[data-oda="${onceki}"]`);
    if (dugme) dugme.focus();
  }

  function gunuBitir() {
    store.gonder({ tip: "GUNU_BITIR" });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ekran === "oyun" && ui.secili) paneliKapat();
  });

  store.abone(ciz);
  ciz(store.durum, { tip: "BASLA" });
}

/* ---------------- gün sonu ---------------- */
function gunSonuEkrani() {
  if (ekran === "karne") return;
  ekran = "karne";
  temizle(kok);
  const d = store.durum;
  const k = d.karne;
  const son = d.gun >= AYARLAR.GUNLER.length;
  kok.appendChild(h("div", { sinif: "kap fk-giris" },
    h("div", { sinif: "kart fk-giris-kart" },
      h("h1", { metin: `${gunAdi(d.gun)} karnesi` }),
      h("p", { metin: `Puan ${sayi(k.puan)} · Not ${k.harf}` }),
      h("div", { sinif: "fk-satir" },
        !son ? h("button", { sinif: "dugme", type: "button", on: { click: () => { store.gonder({ tip: "YARINA_GEC" }); kaydet(true); oyunEkrani(); } } }, "Yarına geç") : null,
        h("button", { sinif: "dugme-cizgi", type: "button", on: { click: () => { store.gonder({ tip: "GUNU_TEKRARLA" }); kaydet(true); oyunEkrani(); } } }, "Günü baştan oyna")))));
}

/* ---------------- oyun saati ---------------- */
let sonTik = performance.now();
let birikim = 0;
setInterval(() => {
  const simdi = performance.now();
  const fark = simdi - sonTik;
  sonTik = simdi;
  if (!store || ekran !== "oyun" || !saatAcik || document.hidden || store.durum.evre !== "oyun") return;
  birikim += (fark * 60) / (AYARLAR.OYUN_SAATI_SANIYE * 1000);
  const dk = Math.min(30, Math.floor(birikim));
  if (dk > 0) {
    birikim -= dk;
    store.gonder({ tip: "ILERLE", dk });
  }
}, 200);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) kaydet(true);
});
window.addEventListener("pagehide", () => kaydet(true));

/* ---------------- başlat ---------------- */
const okunan = kayittanOku(depo.oku(KAYIT));
let uyari = null;
if (!okunan.tamam && okunan.neden !== "yok") {
  depo.sil(KAYIT);
  uyari = okunan.neden === "surum"
    ? "Fabricakit güncellendi; eski kayıt bu sürümle uyumlu olmadığı için sıfırlandı."
    : "Kayıt okunamadı; oyun sıfırlandı.";
}
girisEkrani({ kayit: okunan.tamam ? okunan : null, uyari });
