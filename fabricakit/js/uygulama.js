/* Fabricakit · tarayıcı giriş noktası. Store'u kurar, oyun saatini çalıştırır, ekranları çizer.
   Kayıt yalnızca bu tarayıcıda (localStorage) tutulur; üyelik ve sunucuda oyuncu verisi yoktur. */
import { AYARLAR } from "./ayarlar.js";
import { olusturStore } from "./motor/durum.js";
import { kaydaYaz, kayittanOku } from "./motor/kayit.js";
import { odaDurumlari } from "./motor/durumlar.js";
import { verilmeyenSiparisler } from "./motor/mrp.js";
import { bitirmeDuragi } from "./motor/sayac.js";
import { GUN_BASI } from "./motor/zaman.js";
import { gercekAd, FABRIKA } from "./odalar.js";
import { saat, gunAdi, sayi } from "./bicim.js";
import { h, temizle, ikon } from "./arayuz/dom.js";
import { haritaKur } from "./arayuz/harita.js";
import { panelCiz, canliGuncelle } from "./arayuz/panel.js";
import { gorevNotu, gorevAdimlari, gorevOzeti } from "./arayuz/gorevnotu.js";
import { sayacKur } from "./arayuz/sayac.js";
import { bildirimKur } from "./arayuz/bildirim.js";
import { karneEkrani } from "./arayuz/karne.js";
import { gmBolumu } from "./arayuz/ajan.js";
import { kilitEkrani } from "./arayuz/kilit.js";
import { girisEkrani, VARSAYILAN_HITAP } from "./arayuz/giris.js";
import { onayKutusu } from "./arayuz/onay.js";
import { efekt, sesIzleyici, sesiBaslat, okumayiDurdur, sesDugmesi } from "./arayuz/ses.js";

const KAYIT = "fabricakit-kayit";
const OYUNCU = "fabricakit-oyuncu";
const depo = {
  oku(k) { try { return localStorage.getItem(k); } catch { return null; } },
  yaz(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  sil(k) { try { localStorage.removeItem(k); } catch { /* yok */ } },
};

/* Oyuncu kaydı (oyundan ayrı): hitap ve açılan kilit. Oyun kaydı sıfırlansa da korunur.
   Erişim kodu yalnızca bu tarayıcıda tutulur; yapay zeka "kodlu" modda Ajan GM isteğiyle birlikte doğrulanır. */
function oyuncuOku() {
  try {
    const o = JSON.parse(depo.oku(OYUNCU) || "{}");
    const e = o.erisim && typeof o.erisim === "object" ? o.erisim : {};
    return {
      hitap: typeof o.hitap === "string" ? o.hitap.slice(0, 40) : "",
      erisim: { acik: e.acik === true, kod: typeof e.kod === "string" ? e.kod.slice(0, 64) : "" },
    };
  } catch {
    return { hitap: "", erisim: { acik: false, kod: "" } };
  }
}
const oyuncuYaz = () => depo.yaz(OYUNCU, JSON.stringify(oyuncu));
const hitap = () => oyuncu.hitap || VARSAYILAN_HITAP;
const erisimAcik = () => Boolean(oyuncu.erisim.acik);
const kilitli = (gun) => gun > AYARLAR.UCRETSIZ_GUN && !erisimAcik();

const kok = document.getElementById("fk");
const ui = { secili: null, planSekme: "plan", form: null, gorevAcik: true, cekmeceAcik: false, durak: null };
/* "Günü bitir" durağında karar verilince ilerleme bu kadar bekleyip sürer (sonuç bildirimi görünsün) */
const DEVAM_BEKLEME_MS = 1200;
/* Telefonda görev notu çekmecesi yeni sipariş gelince bu kadar açık kalır */
const CEKMECE_SURE_MS = 5000;
/* Telefon yerleşimi (paneli alttan açan genişlik): özet satırı, harita, sayaç şeridi, görev notu çekmecesi */
const telefon = window.matchMedia("(max-width: 959px)");
let yerlesimDegisti = null;
telefon.addEventListener("change", () => { if (ekran === "oyun" && yerlesimDegisti) yerlesimDegisti(); });
/* Bildirim alanı üst şeridin hemen altında durur; şerit yapışkan olduğu için sayfa kayınca yeri yeniden hesaplanır */
let bildirimYeri = null;
window.addEventListener("scroll", () => { if (bildirimYeri) bildirimYeri(); }, { passive: true });
window.addEventListener("resize", () => { if (bildirimYeri) bildirimYeri(); });
let oyuncu = oyuncuOku();
let store = null;
let ekran = null;
let saatAcik = true;
let aboneCik = null;
/* Panelde düğmeye basılıyken yeniden çizim ertelenir (tık kaybolmasın) */
let basili = false;
let ertelenen = null;
window.addEventListener("pointerdown", (e) => { basili = Boolean(e.target.closest && e.target.closest(".fk-panel, .fk-sayaclar, .fk-gorev-kap, .fk-ozet-satir")); });
window.addEventListener("pointerup", () => { basili = false; if (ertelenen) { const f = ertelenen; ertelenen = null; setTimeout(f, 0); } });
window.addEventListener("pointercancel", () => { basili = false; });

/* Ekran değişince eski ekranın izleri temizlenir (telefonda görev notu çekmecesinin bıraktığı alt boşluk) */
function ekranAc(ad) {
  ekran = ad;
  okumayiDurdur();
  temizle(kok);
  bildirimYeri = null;
  document.body.classList.remove("fk-cekmeceli");
}

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
  ekranAc("giris");
  kok.appendChild(girisEkrani({
    kayit, uyari, hitap: oyuncu.hitap,
    basla: async ({ hitap: yeniHitap, yeni }) => {
      sesiBaslat();
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
  if (kilitli(store.durum.gun)) { kilit(); return; }
  if (store.durum.evre !== "oyun") { karne(); return; }
  ekranAc("oyun");
  ui.secili = null;
  ui.durak = null;

  const gunEl = h("span", { sinif: "fk-gun" });
  const saatEl = h("span", { sinif: "fk-saat" });
  const durakEl = h("span", { sinif: "fk-durak" });
  const puanEl = h("span", { sinif: "fk-puan" });
  const duraklat = h("button", { sinif: "fk-ust-dugme", type: "button", on: { click: () => { saatAcik = !saatAcik; ustCiz(); } } });
  const bitir = h("button", { sinif: "fk-ust-dugme fk-bitir", type: "button", "aria-label": "Günü bitir", on: { click: gunuBitir } }, ikon("bayrak"), h("span", { sinif: "fk-dugme-metin", metin: "Günü bitir" }));
  const bitirmeEl = h("div", { sinif: "fk-bitirme", role: "status", hidden: true });
  const ust = h("div", { sinif: "fk-ust" },
    h("div", { sinif: "fk-ust-satir" },
      h("div", { sinif: "fk-ust-sol" }, gunEl, h("span", { sinif: "fk-saat-kap" }, ikon("saat"), saatEl), h("span", { sinif: "fk-fabrika-adi", metin: FABRIKA.ad }), durakEl),
      h("div", { sinif: "fk-ust-sag" }, puanEl, sesDugmesi(), duraklat, bitir)),
    /* Telefonda fabrika adı şeridin ikinci satırında (gün ve saatin yanına sığmaz); CSS ikisinden birini gösterir */
    h("p", { sinif: "fk-fabrika-adi fk-fabrika-alt-satir", metin: FABRIKA.ad }),
    bitirmeEl);
  const ozetEl = h("div", { sinif: "fk-ozet-satir", role: "group", "aria-label": "Özet" });
  const sayacKap = h("div", { sinif: "fk-sayaclar", "aria-label": "Sayaçlar ve teslimatlar" });
  const gorevKap = h("div", { sinif: "fk-gorev-kap", on: { pointerdown: () => { clearTimeout(cekmeceSayaci); cekmeceSayaci = null; } } });
  const haritaKap = h("div", { sinif: "fk-harita-kap" });
  const panelKap = h("aside", { sinif: "fk-panel", id: "fk-panel", "aria-labelledby": "fk-panel-baslik" });
  const perde = h("div", { sinif: "fk-perde", on: { click: paneliKapat } });
  const bildirimKap = h("div", { sinif: "fk-bildirimler", "aria-live": "polite" });
  const govde = h("div", { sinif: "fk-govde" }, gorevKap, haritaKap, panelKap);
  const uygulama = h("div", { sinif: "fk-uygulama" }, ust, ozetEl, sayacKap, govde);
  kok.append(uygulama, perde, bildirimKap);
  /* Telefonda sayaç şeridi haritanın altına iner (okuma sırası görünen sırayla aynı kalsın diye yeri değişir) */
  const yerlestir = () => { if (telefon.matches) govde.after(sayacKap); else govde.before(sayacKap); };
  yerlestir();
  yerlesimDegisti = () => { yerlestir(); yapisalCiz(); };

  const harita = haritaKur(haritaKap, { odaSec: (id) => odaSec(id) });
  const sayac = sayacKur(sayacKap, { gonder, odaAc });
  const bildirim = bildirimKur(bildirimKap, { odaAc: (id) => odaSec(id) });
  bildirim.sifirla(store.durum);
  bildirimYeri = () => { bildirimKap.style.top = `${Math.max(0, Math.round(ust.getBoundingClientRect().bottom)) + 8}px`; };
  const sesIzle = sesIzleyici(store.durum);
  /* Sabah 08:00'de sipariş gelir: oyun ekranı gün başında açılınca bir kez çalar */
  if (store.durum.evre === "oyun" && store.durum.dk === GUN_BASI) efekt("siparis");
  let sonDegisim = -1;
  let isiklar = {};

  function gonder(eylem) {
    const sonuc = store.gonder(eylem);
    if (sonuc && sonuc.hata) bildirim.hata(sonuc.hata);
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
    durakEl.textContent = saatAcik || d.bitirme ? "" : "Duraklatıldı";
    temizle(duraklat).append(ikon(saatAcik ? "duraklat" : "oynat"), h("span", { sinif: "fk-dugme-metin", metin: saatAcik ? "Duraklat" : "Devam" }));
    duraklat.setAttribute("aria-label", saatAcik ? "Saati duraklat" : "Saati devam ettir");
    duraklat.setAttribute("aria-pressed", String(!saatAcik));
    duraklat.disabled = Boolean(d.bitirme);
    bitir.disabled = Boolean(d.bitirme);
  }

  /* "Günü bitir" sürerken: durakta oda paneli açılır, karar verilip onay alınınca ilerleme kendiliğinden sürer */
  let devamSayaci = null;
  function bitirmeIzle(d) {
    const durak = d.bitirme ? bitirmeDuragi(d) : null;
    temizle(bitirmeEl);
    bitirmeEl.hidden = !d.bitirme;
    if (durak && ui.durak !== durak.id) {
      ui.durak = durak.id;
      setTimeout(() => { if (ekran === "oyun") durakaGit(durak); }, 0);
    }
    if (!durak) ui.durak = null;
    if (!d.bitirme) return;
    let metin;
    let dugme = null;
    if (durak) {
      metin = `Gün sonuna ilerlerken durdu: ${gercekAd(durak.oda)} ${durak.tur === "onay" ? "onayınızı" : "kararınızı"} bekliyor.`;
      dugme = h("button", { sinif: "dugme-cizgi fk-kucuk-dugme", type: "button", on: { click: () => durakaGit(durak) } }, durak.tur === "onay" ? "Onaya git" : "Karara git");
    } else if (d.bitirme.siparis) {
      metin = "Karar verildi. Yeniden siparişi verin; gün sonuna sonra ilerlenir.";
      dugme = h("button", { sinif: "dugme-cizgi fk-kucuk-dugme", type: "button", on: { click: () => gonder({ tip: "GUNU_BITIR" }) } }, "Siparişsiz devam et");
    } else {
      metin = "Gün sonuna ilerleniyor…";
      if (!devamSayaci) {
        devamSayaci = setTimeout(() => {
          devamSayaci = null;
          const s = store.durum;
          if (ekran === "oyun" && s.bitirme && !s.bitirme.siparis && !bitirmeDuragi(s)) gonder({ tip: "GUNU_BITIR" });
        }, DEVAM_BEKLEME_MS);
      }
    }
    bitirmeEl.append(ikon("bayrak"), h("span", { sinif: "fk-bitirme-metin", metin }), dugme);
  }

  /* Durağın kartı panelde görünür, eylem düğmesi odakta */
  function durakaGit(durak) {
    odaSec(durak.oda);
    const kart = panelKap.querySelector(`[data-durak="${durak.id}"]`);
    if (!kart) return;
    panelKap.scrollTop = Math.max(0, kart.offsetTop - 16);
    const dugme = kart.querySelector("button:not(:disabled)");
    if (dugme) dugme.focus({ preventScroll: true });
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
    const adimlar = gorevAdimlari(store.durum);
    gorevCiz(adimlar);
    ozetCiz(store.durum, adimlar);
  }

  /* Görev notu: masaüstünde haritanın yanında, telefonda alttan çekmece (ayrı açık/kapalı hâli) */
  function gorevCiz(adimlar) {
    temizle(gorevKap);
    gorevKap.hidden = !adimlar;
    document.body.classList.toggle("fk-cekmeceli", Boolean(adimlar));
    if (!adimlar) return;
    const tel = telefon.matches;
    gorevKap.appendChild(gorevNotu(store.durum, adimlar, {
      acik: tel ? ui.cekmeceAcik : ui.gorevAcik,
      degisti: (acik) => { if (tel) ui.cekmeceAcik = acik; else ui.gorevAcik = acik; },
      odaAc: (oda, form, sekme) => { if (tel) cekmece(false); odaAc(oda, form, sekme); },
    }));
  }

  let cekmeceSayaci = null;
  function cekmece(acik, sure = 0) {
    clearTimeout(cekmeceSayaci);
    cekmeceSayaci = null;
    ui.cekmeceAcik = acik;
    gorevCiz(gorevAdimlari(store.durum));
    if (acik && sure) cekmeceSayaci = setTimeout(() => { cekmeceSayaci = null; if (ekran === "oyun") cekmece(false); }, sure);
  }

  /* Telefonda yeni sipariş gelince (Satış-Pazarlama "dikkat" kaydı) çekmece bir kez açılır, CEKMECE_SURE_MS sonra kapanır.
     Gün başında (08:00) sabahın "Sipariş geldi" kaydı da yeni sayılır. */
  const kayitNo = (g) => Number(g.id.slice(1)) || 0;
  const gunBasinda = store.durum.evre === "oyun" && store.durum.dk === GUN_BASI;
  let cekmeceSonId = store.durum.gunluk.reduce((m, g) => (gunBasinda && g.dk === GUN_BASI ? m : Math.max(m, kayitNo(g))), 0);
  function cekmeceIzle(d) {
    const yeni = d.gunluk.filter((g) => kayitNo(g) > cekmeceSonId);
    if (!yeni.length) return;
    cekmeceSonId = Math.max(...yeni.map(kayitNo));
    if (telefon.matches && gorevAdimlari(d) && yeni.some((g) => g.oda === "satis" && g.seviye === "dikkat")) cekmece(true, CEKMECE_SURE_MS);
  }

  /* Telefonda tek satır özet: acil işler, teslimatlar, görev notu */
  function ozetCiz(d, adimlar) {
    temizle(ozetEl);
    const karar = d.kararlar.find((k) => k.durum === "bekliyor");
    const onay = d.satinalma.filter((s) => s.durum === "onay-bekliyor");
    const kapida = d.satinalma.filter((s) => s.durum === "kapida").length;
    const yolda = d.satinalma.filter((s) => s.durum === "onaylandi").length;
    const oge = (metin, f, sinif = "") => h("button", { sinif: `fk-ozet-oge ${sinif}`.trim(), type: "button", on: { click: f } }, metin);
    const ogeler = [
      karar ? oge(`${sayi(d.kararlar.filter((k) => k.durum === "bekliyor").length)} karar bekliyor`, () => durakaGit(karar), "fk-ozet-acil") : null,
      onay.length ? oge(`${sayi(onay.length)} onay hazır`, () => durakaGit({ oda: "satinalma", id: onay[0].id }), "fk-ozet-acil") : null,
      kapida ? oge(`Kapıda ${sayi(kapida)} teslimat`, () => odaSec("depo")) : null,
      yolda ? oge(`Yolda ${sayi(yolda)} teslimat`, () => sayacKap.scrollIntoView({ behavior: "smooth", block: "start" })) : null,
      adimlar ? oge(`Görev ${gorevOzeti(adimlar)}`, () => cekmece(true)) : null,
      oge("Gün özeti", ozetAc),
    ].filter(Boolean);
    ogeler.forEach((o, i) => ozetEl.append(i ? h("span", { sinif: "fk-ozet-ayrac", "aria-hidden": "true", metin: "·" }) : "", o));
  }

  function ciz(durum, eylem) {
    if (ekran !== "oyun") return;
    if (durum.evre !== "oyun") { kaydet(true); efekt("zil"); karne(); return; }
    isiklar = odaDurumlari(durum);
    ustCiz();
    harita.guncelle(durum, isiklar, ui.secili);
    sayac.ciz(durum, { yapisal: !basili });
    bildirim.guncelle(durum);
    if (durum.degisim !== sonDegisim || eylem.tip !== "ILERLE") yapisalCiz();
    else canliGuncelle(panelKap, durum);
    cekmeceIzle(durum);
    bitirmeIzle(durum);
    bildirimYeri();
    sesIzle(durum);
    kaydet(eylem.tip !== "ILERLE");
  }

  function odaSec(id) {
    okumayiDurdur();
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

  /* Telefonda Gün özeti (son bildirimler) alttan açılır; masaüstünde panelin varsayılan içeriğidir */
  function ozetAc() {
    okumayiDurdur();
    ui.secili = null;
    uygulama.classList.add("fk-panel-acik");
    perde.classList.add("fk-acik");
    yapisalCiz();
    harita.guncelle(store.durum, isiklar, null);
    panelKap.scrollTop = 0;
    const baslik = panelKap.querySelector("#fk-panel-baslik");
    if (baslik) baslik.focus({ preventScroll: true });
  }

  function paneliKapat() {
    okumayiDurdur();
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
    const gelecek = d.olayPlani.filter((o) => o.durum === "bekliyor").length;
    const karar = d.kararlar.filter((k) => k.durum === "bekliyor").length;
    const onaysiz = d.satinalma.filter((s) => s.durum === "yanit-bekliyor" || s.durum === "onay-bekliyor").length;
    const kapida = d.satinalma.filter((s) => s.durum === "kapida").length;
    const verilmeyen = verilmeyenSiparisler(d);
    const acik = [
      !d.planBilgi.guncel ? "plan güncel değil" : null,
      verilmeyen.length ? `${verilmeyen.length} malzeme siparişi verilmedi (${verilmeyen.map((m) => m.ad).join(", ")})` : null,
      kapida ? `${kapida} teslimat kapıda` : null,
    ].filter(Boolean);
    const onceki = saatAcik;
    saatAcik = false;
    ustCiz();
    const tamam = await onayKutusu({
      baslik: "Gün bitsin mi?",
      metin: [
        "Saat 18:00'e kadar hızlı ilerlenir: hatlar çalışır, sayaçlar akar, olaylar gelir. Karar isteyen bir olayda ilerleme durur; kararınızı verince sürer.",
        h("ul", { sinif: "fk-onay-liste" },
          h("li", { metin: `Bugün gelecek olay: ${sayi(gelecek)}` }),
          h("li", { metin: `Karar bekleyen olay: ${sayi(karar)}` }),
          h("li", { metin: `Onaysız sipariş: ${sayi(onaysiz)}${onaysiz ? " (onay süresi dolan sipariş düşer)" : ""}` })),
        acik.length ? `Açık işler: ${acik.join(", ")}. Süresi dolan işler puan düşürür.` : "Başka açık iş yok.",
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
  ekranAc("karne");
  const d = store.durum;
  const gm = gmBolumu({
    durum: d, hitap: hitap(), erisim: oyuncu.erisim,
    yorumKaydet: (metin) => { store.gonder({ tip: "GM_YORUMU", gun: d.gun, metin }); kaydet(true); },
  });
  const yarin = () => { store.gonder({ tip: "YARINA_GEC" }); kaydet(true); oyun(); window.scrollTo(0, 0); };
  kok.appendChild(karneEkrani({
    durum: d, gmBolumu: gm, kilitli: kilitli(d.gun + 1),
    eylemler: {
      yarinaGec: () => {
        if (kilitli(d.gun + 1)) kilit({ gun: d.gun + 1, sonra: yarin, karneyeDon: karne });
        else yarin();
      },
      gunuTekrarla,
      bastanBasla,
    },
  }));
  /* Ekran değişince sayfa başa döner: telefonda karnenin başı (harf notu) görünsün */
  window.scrollTo(0, 0);
  const baslik = kok.querySelector("#fk-karne-baslik");
  if (baslik) baslik.focus({ preventScroll: true });
}

async function gunuTekrarla() {
  const gun = store.durum.gun;
  const tamam = await onayKutusu({ baslik: `${gun}. gün baştan oynansın mı?`, metin: "Bu günün sabahına dönülür; bugünkü karne silinir.", evet: "Baştan oyna" });
  if (!tamam) return;
  store.gonder({ tip: "GUNU_TEKRARLA" });
  kaydet(true);
  oyun();
  window.scrollTo(0, 0);
}

async function bastanBasla() {
  const tamam = await onayKutusu({ baslik: "Baştan başlansın mı?", metin: "Kayıtlı oyun silinir ve 1. günün sabahına dönülür.", evet: "Baştan başla" });
  if (!tamam) return;
  storeKur(null);
  oyun();
  window.scrollTo(0, 0);
}

/* ---------------- kilit (2. günden sonrası erişim koduyla) ---------------- */
function kilit({ gun = store.durum.gun, sonra = oyun, karneyeDon = null } = {}) {
  if (aboneCik) { aboneCik(); aboneCik = null; }
  ekranAc("kilit");
  const d = store.durum;
  /* Ücretsiz günün karnesinden gelindiyse o gün baştan oynanabilir; kilitli bir kayıttan gelindiyse baştan başlanır */
  const tekrar = d.evre === "gun-sonu" && !kilitli(d.gun);
  kok.appendChild(kilitEkrani({
    gun, hitap: hitap(),
    ac: (kod) => { oyuncu.erisim = { acik: true, kod }; oyuncuYaz(); sonra(); window.scrollTo(0, 0); },
    karneyeDon,
    secenek: tekrar ? { metin: `${d.gun}. günü baştan oyna`, f: gunuTekrarla } : { metin: "Baştan başla", f: bastanBasla },
  }));
  window.scrollTo(0, 0);
  const baslik = kok.querySelector("#fk-kilit-baslik");
  if (baslik) baslik.focus({ preventScroll: true });
}

/* ---------------- oyun saati ---------------- */
let sonTik = performance.now();
let birikim = 0;
setInterval(() => {
  const simdi = performance.now();
  const fark = Math.min(1000, simdi - sonTik);
  sonTik = simdi;
  if (!store || ekran !== "oyun" || !saatAcik || document.hidden || store.durum.evre !== "oyun" || store.durum.bitirme) return;
  birikim += (fark * 60) / (AYARLAR.OYUN_SAATI_SANIYE * 1000);
  const dk = Math.floor(birikim);
  if (dk > 0) {
    birikim -= dk;
    store.gonder({ tip: "ILERLE", dk });
  }
}, 200);

document.addEventListener("visibilitychange", () => { if (document.hidden) kaydet(true); });
window.addEventListener("pagehide", () => { kaydet(true); okumayiDurdur(); });

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
