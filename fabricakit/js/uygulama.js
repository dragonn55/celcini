/* Fabricakit · tarayıcı giriş noktası. Store'u kurar, oyun saatini çalıştırır, ekranları çizer.
   Kayıt yalnızca bu tarayıcıda (localStorage) tutulur; üyelik ve sunucuda oyuncu verisi yoktur. */
import { AYARLAR } from "./ayarlar.js";
import { olusturStore } from "./motor/durum.js";
import { kaydaYaz, kayittanOku } from "./motor/kayit.js";
import { odaDurumlari } from "./motor/durumlar.js";
import { saat, gunAdi, sayi } from "./bicim.js";
import { h, temizle, ikon } from "./arayuz/dom.js";
import { haritaKur } from "./arayuz/harita.js";
import { panelCiz, canliGuncelle } from "./arayuz/panel.js";
import { gorevNotu } from "./arayuz/gorevnotu.js";
import { sayacKur } from "./arayuz/sayac.js";
import { bildirimKur } from "./arayuz/bildirim.js";
import { karneEkrani, ajanGmGorseli, hitapla } from "./arayuz/karne.js";
import { girisEkrani, VARSAYILAN_HITAP } from "./arayuz/giris.js";
import { onayKutusu } from "./arayuz/onay.js";

const KAYIT = "fabricakit-kayit";
const OYUNCU = "fabricakit-oyuncu";
const depo = {
  oku(k) { try { return localStorage.getItem(k); } catch { return null; } },
  yaz(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  sil(k) { try { localStorage.removeItem(k); } catch { /* yok */ } },
};

/* Oyuncu kaydı (oyundan ayrı): hitap ve erişim kodu. Oyun kaydı sıfırlansa da korunur. */
function oyuncuOku() {
  try {
    const o = JSON.parse(depo.oku(OYUNCU) || "{}");
    return { hitap: typeof o.hitap === "string" ? o.hitap.slice(0, 40) : "", erisim: o.erisim && typeof o.erisim === "object" ? o.erisim : {} };
  } catch {
    return { hitap: "", erisim: {} };
  }
}
const oyuncuYaz = () => depo.yaz(OYUNCU, JSON.stringify(oyuncu));
const hitap = () => oyuncu.hitap || VARSAYILAN_HITAP;

const kok = document.getElementById("fk");
const ui = { secili: null, planSekme: "plan", form: null, gorevAcik: true };
let oyuncu = oyuncuOku();
let store = null;
let ekran = null;
let saatAcik = true;
let aboneCik = null;
/* Panelde düğmeye basılıyken yeniden çizim ertelenir (tık kaybolmasın) */
let basili = false;
let ertelenen = null;
window.addEventListener("pointerdown", (e) => { basili = Boolean(e.target.closest && e.target.closest(".fk-panel, .fk-sayaclar")); });
window.addEventListener("pointerup", () => { basili = false; if (ertelenen) { const f = ertelenen; ertelenen = null; setTimeout(f, 0); } });
window.addEventListener("pointercancel", () => { basili = false; });

/* ---------------- kayıt ---------------- */
let sonKayit = 0;
function kaydet(zorla = false) {
  if (!store) return;
  const simdi = Date.now();
  if (!zorla && simdi - sonKayit < 1500) return;
  sonKayit = simdi;
  depo.yaz(KAYIT, kaydaYaz({ durum: store.durum, gunBasi: store.gunBasi }));
}

function storeKur(kayit) {
  if (aboneCik) aboneCik();
  store = olusturStore(kayit);
  aboneCik = null;
  kaydet(true);
}

/* ---------------- giriş ---------------- */
function giris({ kayit, uyari }) {
  ekran = "giris";
  temizle(kok);
  kok.appendChild(girisEkrani({
    kayit, uyari, hitap: oyuncu.hitap,
    basla: async ({ hitap: yeniHitap, yeni }) => {
      if (yeni && kayit) {
        const tamam = await onayKutusu({ baslik: "Baştan başlansın mı?", metin: "Bu tarayıcıdaki kayıtlı oyun silinir ve 1. günün sabahına dönülür.", evet: "Baştan başla" });
        if (!tamam) return;
      }
      oyuncu.hitap = yeniHitap;
      oyuncuYaz();
      storeKur(yeni ? null : kayit);
      oyun();
    },
  }));
  const girdi = kok.querySelector("#fk-hitap");
  if (girdi && !kayit) girdi.focus({ preventScroll: true });
}

/* ---------------- oyun ---------------- */
function oyun() {
  if (aboneCik) { aboneCik(); aboneCik = null; }
  if (store.durum.evre !== "oyun") { karne(); return; }
  ekran = "oyun";
  temizle(kok);
  ui.secili = null;

  const gunEl = h("span", { sinif: "fk-gun" });
  const saatEl = h("span", { sinif: "fk-saat" });
  const durakEl = h("span", { sinif: "fk-durak" });
  const puanEl = h("span", { sinif: "fk-puan" });
  const duraklat = h("button", { sinif: "fk-ust-dugme", type: "button", on: { click: () => { saatAcik = !saatAcik; ustCiz(); } } });
  const bitir = h("button", { sinif: "fk-ust-dugme fk-bitir", type: "button", "aria-label": "Günü bitir", on: { click: gunuBitir } }, ikon("bayrak"), h("span", { sinif: "fk-dugme-metin", metin: "Günü bitir" }));
  const ust = h("div", { sinif: "fk-ust" },
    h("div", { sinif: "fk-ust-sol" }, gunEl, h("span", { sinif: "fk-saat-kap" }, ikon("saat"), saatEl), durakEl),
    h("div", { sinif: "fk-ust-sag" }, puanEl, duraklat, bitir));
  const sayacKap = h("div", { sinif: "fk-sayaclar", "aria-label": "Sayaçlar ve teslimatlar" });
  const gorevKap = h("div", { sinif: "fk-gorev-kap" });
  const haritaKap = h("div", { sinif: "fk-harita-kap" });
  const panelKap = h("aside", { sinif: "fk-panel", id: "fk-panel", "aria-labelledby": "fk-panel-baslik" });
  const perde = h("div", { sinif: "fk-perde", on: { click: paneliKapat } });
  const bildirimKap = h("div", { sinif: "fk-bildirimler", "aria-live": "polite" });
  const uygulama = h("div", { sinif: "fk-uygulama" }, ust, sayacKap, h("div", { sinif: "fk-govde" }, gorevKap, haritaKap, panelKap));
  kok.append(uygulama, perde, bildirimKap);

  const harita = haritaKur(haritaKap, { odaSec: (id) => odaSec(id) });
  const sayac = sayacKur(sayacKap, { gonder, odaAc });
  const bildirim = bildirimKur(bildirimKap, { odaAc: (id) => odaSec(id) });
  bildirim.sifirla(store.durum);
  let sonDegisim = -1;
  let isiklar = {};

  function gonder(eylem) {
    const sonuc = store.gonder(eylem);
    if (sonuc && sonuc.hata) bildirimKap.prepend(h("div", { sinif: "fk-bildirim fk-bildirim-acil" }, h("span", { sinif: "fk-bildirim-metin", metin: sonuc.hata })));
    return sonuc || {};
  }

  function odaAc(id, form, sekme) {
    if (form) ui.form = form;
    if (sekme) ui.planSekme = sekme;
    odaSec(id);
    if (sekme === "ihtiyac") gonder({ tip: "IHTIYAC_GORULDU" });
  }

  function ustCiz() {
    const d = store.durum;
    gunEl.textContent = gunAdi(d.gun);
    saatEl.textContent = saat(d.dk);
    puanEl.textContent = `Puan ${sayi(d.puan.deger)}`;
    durakEl.textContent = saatAcik ? "" : "Duraklatıldı";
    temizle(duraklat).append(ikon(saatAcik ? "duraklat" : "oynat"), h("span", { sinif: "fk-dugme-metin", metin: saatAcik ? "Duraklat" : "Devam" }));
    duraklat.setAttribute("aria-label", saatAcik ? "Saati duraklat" : "Saati devam ettir");
    duraklat.setAttribute("aria-pressed", String(!saatAcik));
  }

  const baglam = () => ({
    durum: store.durum, isiklar, ui, gonder, odaAc,
    yenile: () => panelCiz(panelKap, baglam()),
    kapat: paneliKapat,
  });

  function yapisalCiz() {
    if (basili) { ertelenen = yapisalCiz; return; }
    sonDegisim = store.durum.degisim;
    panelCiz(panelKap, baglam());
    temizle(gorevKap);
    const not = gorevNotu(store.durum, ui, { odaAc });
    if (not) gorevKap.appendChild(not);
    gorevKap.hidden = !not;
  }

  function ciz(durum, eylem) {
    if (ekran !== "oyun") return;
    if (durum.evre !== "oyun") { kaydet(true); karne(); return; }
    isiklar = odaDurumlari(durum);
    ustCiz();
    harita.guncelle(durum, isiklar, ui.secili);
    sayac.ciz(durum, { yapisal: !basili });
    bildirim.guncelle(durum);
    if (durum.degisim !== sonDegisim || eylem.tip !== "ILERLE") yapisalCiz();
    else canliGuncelle(panelKap, durum);
    kaydet(eylem.tip !== "ILERLE");
  }

  function odaSec(id) {
    ui.secili = id;
    gonder({ tip: "GORULDU", oda: id });
    uygulama.classList.add("fk-panel-acik");
    perde.classList.add("fk-acik");
    yapisalCiz();
    harita.guncelle(store.durum, isiklar, ui.secili);
    const baslik = panelKap.querySelector("#fk-panel-baslik");
    if (baslik) baslik.focus({ preventScroll: true });
    if (window.matchMedia("(min-width: 960px)").matches) panelKap.scrollTop = 0;
  }

  function paneliKapat() {
    const onceki = ui.secili;
    ui.secili = null;
    uygulama.classList.remove("fk-panel-acik");
    perde.classList.remove("fk-acik");
    yapisalCiz();
    harita.guncelle(store.durum, isiklar, null);
    const dugme = onceki && kok.querySelector(`.fk-oda[data-oda="${onceki}"]`);
    if (dugme) dugme.focus({ preventScroll: true });
  }

  async function gunuBitir() {
    const d = store.durum;
    const onay = d.satinalma.filter((s) => s.durum === "yanit-bekliyor" || s.durum === "onay-bekliyor").length;
    const karar = d.kararlar.filter((k) => k.durum === "bekliyor" && k.kalanDk != null).length;
    const kapida = d.satinalma.filter((s) => s.durum === "kapida").length;
    const acik = [
      !d.planBilgi.guncel ? "plan güncel değil" : null,
      onay ? `${onay} sipariş onay bekliyor` : null,
      karar ? `${karar} kalite kararı bekliyor` : null,
      kapida ? `${kapida} teslimat kapıda` : null,
    ].filter(Boolean);
    const onceki = saatAcik;
    saatAcik = false;
    ustCiz();
    const tamam = await onayKutusu({
      baslik: "Gün bitsin mi?",
      metin: [
        "Saat 18:00'e kadar hızlı ilerler: hatlar çalışır, sayaçlar akar; henüz gelmemiş olaylar gelmez.",
        acik.length ? `Açık işler: ${acik.join(", ")}. Süresi dolan işler puan düşürür.` : "Açık iş görünmüyor.",
      ],
      evet: "Günü bitir",
    });
    saatAcik = onceki;
    if (tamam) gonder({ tip: "GUNU_BITIR" });
    else ustCiz();
  }

  aboneCik = store.abone(ciz);
  ciz(store.durum, { tip: "BASLA" });
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || ekran !== "oyun" || !ui.secili || document.querySelector(".fk-onay-perde")) return;
  const kapat = kok.querySelector(".fk-panel .fk-kapat");
  if (kapat) kapat.click();
});

/* ---------------- gün sonu ---------------- */
function karne() {
  if (aboneCik) { aboneCik(); aboneCik = null; }
  ekran = "karne";
  temizle(kok);
  const d = store.durum;
  const gm = h("section", { sinif: "fk-bolum fk-gm-bolum", "aria-labelledby": "fk-gm-baslik" },
    h("div", { sinif: "fk-gm-satir" }, ajanGmGorseli("fk-gm"),
      h("div", {}, h("h2", { sinif: "fk-bolum-baslik", id: "fk-gm-baslik", metin: "Ajan GM" }),
        h("p", { sinif: "fk-gm-yorum", metin: hitapla(d.karne.gmYorum, hitap()) }))));
  kok.appendChild(karneEkrani({
    durum: d, hitap: hitap(), gmBolumu: gm,
    eylemler: {
      yarinaGec: () => { store.gonder({ tip: "YARINA_GEC" }); kaydet(true); oyun(); window.scrollTo(0, 0); },
      gunuTekrarla: async () => {
        const tamam = await onayKutusu({ baslik: `${d.gun}. gün baştan oynansın mı?`, metin: "Bu günün sabahına dönülür; bugünkü karne silinir.", evet: "Baştan oyna" });
        if (!tamam) return;
        store.gonder({ tip: "GUNU_TEKRARLA" });
        kaydet(true);
        oyun();
        window.scrollTo(0, 0);
      },
      bastanBasla: async () => {
        const tamam = await onayKutusu({ baslik: "Baştan başlansın mı?", metin: "Kayıtlı oyun silinir ve 1. günün sabahına dönülür.", evet: "Baştan başla" });
        if (!tamam) return;
        storeKur(null);
        oyun();
        window.scrollTo(0, 0);
      },
    },
  }));
  const baslik = kok.querySelector("#fk-karne-baslik");
  if (baslik) baslik.focus({ preventScroll: true });
}

/* ---------------- oyun saati ---------------- */
let sonTik = performance.now();
let birikim = 0;
setInterval(() => {
  const simdi = performance.now();
  const fark = Math.min(1000, simdi - sonTik);
  sonTik = simdi;
  if (!store || ekran !== "oyun" || !saatAcik || document.hidden || store.durum.evre !== "oyun") return;
  birikim += (fark * 60) / (AYARLAR.OYUN_SAATI_SANIYE * 1000);
  const dk = Math.floor(birikim);
  if (dk > 0) {
    birikim -= dk;
    store.gonder({ tip: "ILERLE", dk });
  }
}, 200);

document.addEventListener("visibilitychange", () => { if (document.hidden) kaydet(true); });
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
giris({ kayit: okunan.tamam ? okunan : null, uyari });
