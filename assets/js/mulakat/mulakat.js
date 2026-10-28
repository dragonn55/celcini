/* Mülakat Testi · arayüz (ES modülü).
   Sayfa kabuğunu scripts/derle.py üretir: giriş (#mk-giris), nasıl çalışır (#mk-nasil) ve test bölümü (#mk-test içinde
   <div data-mulakat …> kökü). Bu modül soru ekranını, hesap ekranını ve Ajan GM'in raporunu kökün içine kurar.
   Kök öznitelikleri: data-veri (/mulakat/veri/test.json), data-api (/api/mulakat/), data-adres (kopyalanan rapordaki adres).
   Cevaplar yalnızca bellekte tutulur; hiçbir yere gönderilmez, saklanmaz. Puanlama motor.js'te.
   Kilitli metinler (Ajan GM yorumları, örnek cevaplar, ölçer): POST {api} { kod } → { satista, gecerli, sorular }.
   Kod yalnızca bu tarayıcıda saklanır (localStorage "celcini-kod-mulakat"); sunucu kodu saklamaz. Satır içi style yazılmaz (CSP). */
import { h, temizle } from "/fabricakit/js/arayuz/dom.js";
import { ETIKET, degerlendir, raporCumleleri, raporMetni, sureYazi, yorumTemiz } from "./motor.js";

const KOD_ANAHTARI = "celcini-kod-mulakat";
const HARF = ["A", "B", "C", "D"];
const ILK_KART = 5; /* "Şunu dediniz" bölümünde açık gelen kart sayısı; kalanı "Diğer cevaplarınız" altında */

const SVG = "http://www.w3.org/2000/svg";
/* Lucide çizgi ikonları (ISC lisansı) */
const IKON = {
  ok: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  geri: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  kilit: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  bayrak: '<path d="M4 22V4a1 1 0 0 1 1-1h12l-2 4 2 4H5"/>',
  tekrar: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  kopya: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  asagi: '<path d="m6 9 6 6 6-6"/>',
};
function ikon(ad, sinif = "ikon") {
  const s = document.createElementNS(SVG, "svg");
  s.setAttribute("class", sinif);
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("focusable", "false");
  s.innerHTML = IKON[ad];
  return s;
}

const oku = (a) => { try { return localStorage.getItem(a); } catch { return null; } };
const yaz = (a, d) => { try { if (d === null) localStorage.removeItem(a); else localStorage.setItem(a, d); } catch { /* özel pencere */ } };
const hareketAz = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const simdi = () => (window.performance && performance.now ? performance.now() : Date.now());
const karistir = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const linkler = () => window.CELCINI_LINKS || {};
const gecerliAdres = (s) => /^https:\/\/\S+$/.test(String(s || "").trim());

async function jsonAl(url, secenek) {
  const y = await fetch(url, secenek);
  if (!y.ok) throw new Error(String(y.status));
  return y.json();
}

function avatar(ek = "") {
  return h("picture", { sinif: `mk-gm-gorsel${ek ? " " + ek : ""}` },
    h("source", { type: "image/webp", srcset: "/assets/img/ajan-gm-avatar.webp" }),
    h("img", { src: "/assets/img/ajan-gm-avatar.png", alt: "", width: "512", height: "512", decoding: "async" }));
}

const kok = document.querySelector("[data-mulakat]");
if (kok) kur(kok);

function kur(kok) {
  const ayar = { veri: kok.dataset.veri, api: kok.dataset.api, adres: kok.dataset.adres || location.href };
  const giris = document.getElementById("mk-giris");
  const nasil = document.getElementById("mk-nasil");
  const bolum = document.getElementById("mk-test");
  const girisDurum = document.querySelector("[data-mk-durum]");
  let veri = null;
  const yukleme = jsonAl(ayar.veri).then((v) => { veri = v; return v; }, () => null);

  const durum = { ekran: "giris", i: 0, sira: [], cevaplar: [], dosyaNo: "", tarih: "", kilit: false, soruBas: 0 };
  /* Kilit: kilitli = sunucudan gelen metinler (açıldıysa); satista = kodlar satışta mı (null: bilinmiyor) */
  const kilit = { kilitli: null, satista: null, satistaSoruldu: false };
  let ekranlar = null;   /* { soru, hesap, rapor } */
  let p = null;          /* soru ve hesap ekranının parçaları */
  let d = null;          /* son değerlendirme */
  let duzKap = null;     /* "Şunu dediniz, şunu deyin" kartlarının kabı */
  let yaziZamanlayici = null;

  document.querySelectorAll("[data-mk-basla]").forEach((b) => b.addEventListener("click", async () => {
    if (!veri) {
      b.disabled = true;
      await yukleme;
      b.disabled = false;
    }
    if (!veri) {
      if (girisDurum) { girisDurum.textContent = "Sorular yüklenemedi. Sayfayı yenileyip yeniden deneyin."; girisDurum.hidden = false; }
      return;
    }
    testiBaslat();
  }));

  function ekranGoster(ad) {
    for (const [k, el] of Object.entries(ekranlar)) el.hidden = k !== ad;
    durum.ekran = ad;
  }

  function bolumeKaydir() {
    const ust = bolum.getBoundingClientRect().top;
    if (ust < 0 || ust > window.innerHeight * 0.4) window.scrollBy(0, ust - 8);
  }

  /* ---------------- Ekranlar (bir kez kurulur) ---------------- */
  function ekranlariKur() {
    const n = veri.sorular.length;
    const sayac = h("span", { sinif: "mk-sayac" });
    const evre = h("span", {});
    const dolu = h("span", {});
    const cubuk = h("div", { sinif: "mk-cubuk", role: "progressbar", "aria-label": "İlerleme", "aria-valuemin": "0", "aria-valuemax": String(n), "aria-valuenow": "0" }, dolu);
    const on = h("p", { sinif: "mk-soru-on" });
    const soruMetni = h("h2", { sinif: "mk-soru-metni", id: "mk-soru-metni", tabindex: "-1" });
    const siklar = h("div", { sinif: "mk-siklar", role: "group", "aria-labelledby": "mk-soru-metni" });
    const geriDugme = h("button", { sinif: "dugme-cizgi", type: "button", on: { click: geri } }, ikon("geri"), "Önceki soru");
    const notDurum = h("p", { sinif: "mk-not-durum", "aria-live": "polite" });
    const kart = h("div", { sinif: "mk-soru-kart" },
      h("div", { sinif: "kart mk-gm" }, avatar(),
        h("div", { sinif: "mk-gm-metin" }, h("p", { sinif: "mk-gm-ad", metin: "Ajan GM" }), on, soruMetni)),
      h("p", { sinif: "mk-ipucu", metin: "Siz olsaydınız hangisini derdiniz?" }),
      siklar);
    const soru = h("div", { sinif: "mk-ekran mk-soru-ekran" },
      h("div", { sinif: "mk-ilerleme" }, h("p", { sinif: "mk-ilerleme-ust" }, sayac, evre), cubuk),
      kart,
      h("div", { sinif: "mk-soru-alt" }, geriDugme, notDurum));

    const hesapBaslik = h("h2", { id: "mk-hesap-baslik", tabindex: "-1", metin: "Dosyanız hazırlanıyor" });
    const adimlar = h("ol", { sinif: "mk-hesap-adim" },
      [`${n} cevap sayıldı`, "Kırmızı bayraklar işaretlendi", "Cevap profili çıkarıldı", "Talimatlar yazıldı"].map((a) => h("li", { metin: a })));
    const hesap = h("div", { sinif: "mk-ekran kart mk-hesap" }, avatar("mk-gm-buyuk"), hesapBaslik, adimlar);

    const rapor = h("div", { sinif: "mk-ekran mk-rapor" });
    temizle(kok).append(soru, hesap, rapor);
    ekranlar = { soru, hesap, rapor };
    return { sayac, evre, dolu, cubuk, on, soruMetni, siklar, geriDugme, notDurum, kart, hesapBaslik, adimlar };
  }

  /* ---------------- Test akışı ---------------- */
  function testiBaslat() {
    if (!ekranlar) p = ekranlariKur();
    clearInterval(yaziZamanlayici);
    durum.sira = veri.sorular.map((q) => karistir(q.secenekler.map((_, k) => k)));
    durum.cevaplar = veri.sorular.map(() => ({ k: null, ms: 0 }));
    durum.i = 0;
    durum.kilit = false;
    durum.dosyaNo = "CLC-" + String(1000 + Math.floor(Math.random() * 9000));
    durum.tarih = new Date().toLocaleDateString("tr-TR");
    if (giris) giris.hidden = true;
    if (nasil) nasil.hidden = true;
    bolum.hidden = false;
    ekranGoster("soru");
    soruCiz(true);
    window.scrollTo(0, 0);
    bolumeKaydir();
  }

  function soruCiz(odakla) {
    const n = veri.sorular.length, i = durum.i, q = veri.sorular[i];
    p.sayac.textContent = `Soru ${i + 1} / ${n}`;
    p.evre.textContent = q.evre;
    p.cubuk.setAttribute("aria-valuenow", String(i));
    p.cubuk.setAttribute("aria-valuetext", `${n} sorudan ${i} tanesi cevaplandı`);
    p.dolu.style.width = `${(i / n) * 100}%`;
    p.on.hidden = !q.on;
    p.on.textContent = q.on || "";
    p.soruMetni.textContent = q.soru;
    temizle(p.siklar);
    durum.sira[i].forEach((k, g) => {
      const secili = durum.cevaplar[i].k === k;
      p.siklar.append(h("button", {
        sinif: `mk-sik${secili ? " secili" : ""}`, type: "button", "aria-pressed": secili ? "true" : "false",
        on: { click: () => sec(g) },
      }, h("span", { sinif: "mk-sik-harf", "aria-hidden": "true", metin: HARF[g] }), h("span", { sinif: "mk-sik-metin", metin: q.secenekler[k].metin })));
    });
    p.geriDugme.hidden = i === 0;
    p.notDurum.textContent = "";
    durum.soruBas = simdi();
    if (odakla) p.soruMetni.focus({ preventScroll: true });
  }

  function gecis(fn) {
    if (hareketAz()) { fn(); bolumeKaydir(); return; }
    p.kart.classList.add("mk-cikis");
    setTimeout(() => {
      fn();
      p.kart.classList.remove("mk-cikis");
      p.kart.classList.add("mk-gir");
      setTimeout(() => p.kart.classList.remove("mk-gir"), 260);
      bolumeKaydir();
    }, 170);
  }

  function sec(g) {
    if (durum.kilit || durum.ekran !== "soru") return;
    durum.kilit = true;
    const i = durum.i, n = veri.sorular.length;
    durum.cevaplar[i].k = durum.sira[i][g];
    durum.cevaplar[i].ms += simdi() - durum.soruBas;
    [...p.siklar.children].forEach((b, j) => {
      b.classList.toggle("secili", j === g);
      b.setAttribute("aria-pressed", j === g ? "true" : "false");
      b.disabled = j !== g;
    });
    p.notDurum.textContent = "Not alındı.";
    setTimeout(() => {
      if (i < n - 1) gecis(() => { durum.i = i + 1; soruCiz(true); durum.kilit = false; });
      else hesapla();
    }, hareketAz() ? 150 : 420);
  }

  function geri() {
    if (durum.kilit || durum.ekran !== "soru" || durum.i === 0) return;
    durum.cevaplar[durum.i].ms += simdi() - durum.soruBas;
    gecis(() => { durum.i -= 1; soruCiz(true); });
  }

  function hesapla() {
    ekranGoster("hesap");
    bolumeKaydir();
    const li = [...p.adimlar.children];
    li.forEach((x) => x.classList.remove("tamam"));
    const bekle = hareketAz() ? 120 : 520;
    li.forEach((x, j) => setTimeout(() => x.classList.add("tamam"), bekle * (j + 1)));
    p.hesapBaslik.focus({ preventScroll: true });
    setTimeout(() => { durum.kilit = false; raporCiz(); }, bekle * (li.length + 1));
  }

  /* ---------------- Rapor ---------------- */
  function cubukSatiri(ad, deger, oran, sinif, ek) {
    const dolgu = h("span", {});
    dolgu.style.width = `${Math.max(0, Math.min(100, Math.round(oran)))}%`;
    return h("div", { sinif: `mk-cubuk-satir${sinif ? " " + sinif : ""}` },
      h("span", { sinif: "mk-cubuk-ad" }, ad, ek ? h("span", { sinif: "mk-etiket", metin: ek }) : null),
      h("span", { sinif: "mk-cubuk-deger", metin: deger }),
      h("span", { sinif: "mk-cubuk-iz", "aria-hidden": "true" }, dolgu));
  }

  function gmBlok(cocuk, ek = "") {
    return h("div", { sinif: `mk-gm-blok${ek ? " " + ek : ""}` }, avatar(),
      h("div", { sinif: "mk-gm-metin" }, ...cocuk));
  }

  function raporCiz() {
    d = degerlendir(veri, durum.cevaplar);
    const c = raporCumleleri(veri, d);
    const kr = veri.kararlar[d.karar];
    const tz = veri.tarzlar[d.profil];
    const n = veri.sorular.length;
    const k = d.kirmizi.length;
    const secilen = (i) => veri.sorular[i].secenekler[durum.cevaplar[i].k];

    const zayiflar = new Set();
    if (d.zayifSira[0].yuzde < 100) {
      zayiflar.add(d.zayifSira[0].kod);
      if (d.zayifSira[1] && d.zayifSira[1].yuzde < 70) zayiflar.add(d.zayifSira[1].kod);
    }
    const alintilar = d.profil === "G" ? [] : [...d.tarzSecim[d.profil]]
      .sort((a, b) => secilen(a).puan - secilen(b).puan || a - b).slice(0, 3);

    const yazi = h("span", { "aria-hidden": "true", metin: kr.acilis });
    const acilis = h("p", { sinif: "mk-gm-acilis" }, h("span", { sinif: "gizli", metin: kr.acilis }), yazi);
    const puanSayi = h("span", { sinif: "mk-olcu-deger", metin: String(d.puan) });
    const olcu = (ad, deger, alt, ek = "") => h("div", { sinif: `mk-olcu${ek ? " " + ek : ""}` },
      h("dt", { metin: ad }), h("dd", {}, typeof deger === "string" ? h("span", { sinif: "mk-olcu-deger", metin: deger }) : deger, h("span", { sinif: "mk-olcu-alt", metin: alt })));

    duzKap = h("div", { sinif: "mk-duz-kap" });
    const kopyaDurum = h("p", { sinif: "mk-kopya-durum", "aria-live": "polite" });
    const kopyaAlan = h("textarea", { sinif: "mk-kopya-alan", id: "mk-kopya-alan", readonly: true, "aria-label": "Rapor metni" });
    kopyaAlan.hidden = true;
    const baslik = h("h2", { sinif: "gizli", id: "mk-rapor-baslik", tabindex: "-1", metin: "Ajan GM'in aday raporu" });

    const govde = [
      h("div", { sinif: "mk-rapor-ust" },
        h("p", { sinif: "ust-yazi", metin: "Aday raporu" }),
        h("p", { sinif: "mk-rapor-meta", metin: `Dosya ${durum.dosyaNo} · ${durum.tarih} · Süre ${sureYazi(d.sure)}` })),
      baslik,
      gmBlok([h("p", { sinif: "mk-gm-ad", metin: "Ajan GM" }), acilis]),

      h("section", { sinif: `kart mk-karar mk-karar-${d.karar}`, "aria-label": "Karar" },
        h("div", { sinif: "mk-karar-bas" },
          h("p", { sinif: "ust-yazi", metin: "Karar" }),
          h("p", { sinif: "mk-karar-ad", metin: kr.ad }),
          h("p", { sinif: "mk-karar-alt", metin: kr.alt })),
        h("dl", { sinif: "mk-olculer" },
          olcu("Puan", puanSayi, "100 üzerinden"),
          olcu("Güçlü cevap", `${d.tarzSay.G} / ${n}`, "en güçlü şık"),
          olcu("Kırmızı bayrak", String(k), "tek başına eleyebilir", k ? "mk-olcu-kirmizi" : ""),
          olcu("Süre", sureYazi(d.sure), `${n} soru`)),
        h("p", { sinif: "mk-karar-not", metin: c.kirmiziCumle + (c.kisitCumle ? " " + c.kisitCumle : "") })),

      h("section", { sinif: "mk-bolum", "aria-labelledby": "mk-b-profil" },
        h("h3", { id: "mk-b-profil", metin: "Cevap profiliniz" }),
        h("div", { sinif: "kart mk-profil" },
          h("p", { sinif: "mk-profil-ad", metin: tz.profil }),
          h("p", { sinif: "mk-profil-ozet", metin: tz.ozet }),
          h("p", { metin: c.profilGiris }),
          h("p", { metin: tz.metin }),
          alintilar.length ? h("figure", { sinif: "mk-alintilar" },
            h("figcaption", { metin: "Bu profili çizen cümleleriniz" }),
            alintilar.map((i) => h("blockquote", {},
              h("p", { metin: `“${secilen(i).metin}”` }),
              h("cite", { metin: `S${veri.sorular[i].no} · ${veri.sorular[i].kisa}` })))) : null,
          h("div", { sinif: "mk-dagilim" },
            h("p", { sinif: "mk-dagilim-baslik", metin: "Cevap tarzlarınız" }),
            h("div", { sinif: "mk-cubuklar" }, ["G", "E", "F", "C", "A"].map((t) => cubukSatiri(
              veri.tarzlar[t].ad, `${d.tarzSay[t]} / ${n}`, (d.tarzSay[t] / n) * 100,
              t === "G" ? "" : t === d.profil ? "vurgu" : "koyu",
              t !== "G" && t === d.profil ? "baskın" : "")))))),

      h("section", { sinif: "mk-bolum", "aria-labelledby": "mk-b-alan" },
        h("h3", { id: "mk-b-alan", metin: "Alanlara göre" }),
        h("div", { sinif: "kart mk-cubuklar" }, d.alanlar.map((a) => cubukSatiri(
          a.ad, `%${a.yuzde}`, a.yuzde, zayiflar.has(a.kod) ? "vurgu" : "",
          !zayiflar.has(a.kod) ? "" : a.kod === d.zayifSira[0].kod ? "en zayıf" : "zayıf")))),

      h("section", { sinif: "mk-bolum", "aria-labelledby": "mk-b-talimat" },
        h("h3", { id: "mk-b-talimat", metin: "Bir sonraki görüşmeniz için talimatım" }),
        h("ol", { sinif: "mk-talimatlar" }, c.talimatlar.map((t) => h("li", {}, h("span", { metin: t }))))),

      h("section", { sinif: "mk-bolum", "aria-labelledby": "mk-b-duzelt" },
        h("h3", { id: "mk-b-duzelt", metin: "Şunu dediniz, şunu deyin" }),
        h("p", { sinif: "mk-bolum-giris", metin: c.eksikGiris }),
        duzKap),

      d.tereddut.length ? h("section", { sinif: "mk-bolum", "aria-labelledby": "mk-b-tereddut" },
        h("h3", { id: "mk-b-tereddut", metin: "Duraksadığınız yerler" }),
        h("p", { sinif: "mk-bolum-giris", metin: "Bu sorularda en uzun siz düşündünüz. Gerçek görüşmede duraksama kararsızlık gibi okunur; önce bunları prova edin." }),
        h("ul", { sinif: "mk-tereddut" }, d.tereddut.map((i) => h("li", {},
          h("span", { metin: `S${veri.sorular[i].no} · ${veri.sorular[i].kisa}` }),
          h("span", { sinif: "mk-sn", metin: sureYazi(d.sureler[i]) }))))) : null,

      h("section", { sinif: "mk-bolum", "aria-labelledby": "mk-b-guclu" },
        h("h3", { id: "mk-b-guclu", metin: `Güçlü cevaplarınız (${d.guclu.length})` }),
        d.guclu.length
          ? h("ul", { sinif: "mk-cipler" }, d.guclu.map((i) => h("li", { metin: `S${veri.sorular[i].no} · ${veri.sorular[i].kisa}` })))
          : h("p", { sinif: "mk-bolum-giris", metin: "Bu denemede yok. Yukarıdaki talimatlar bir sonraki denemenin başlangıç noktası." })),

      gmBlok([
        h("p", { sinif: "mk-gm-acilis", metin: "Gerçek görüşmede karşınızda ben olmayacağım. Ama sorular aynı olacak, bakan gözler de." }),
        h("p", { sinif: "mk-gm-imza", metin: "Ajan GM · Yapay zeka genel müdür" }),
      ], "mk-kapanis"),

      h("div", { sinif: "mk-eylem" },
        h("button", { sinif: "dugme", type: "button", on: { click: () => testiBaslat() } }, ikon("tekrar"), "Testi yeniden çöz"),
        h("button", { sinif: "dugme-cizgi", type: "button", on: { click: () => kopyala(kopyaDurum, kopyaAlan) } }, ikon("kopya"), "Raporu kopyala"),
        kopyaDurum, kopyaAlan),
    ];

    temizle(ekranlar.rapor).append(...govde.filter(Boolean));
    ekranGoster("rapor");
    window.scrollTo(0, 0);
    bolumeKaydir();
    baslik.focus({ preventScroll: true });
    duzeltmeleriCiz();
    kilitKontrol();
    yaziYaz(yazi, kr.acilis);
    sayiSay(puanSayi, d.puan);
  }

  /* "Şunu dediniz, şunu deyin": kilit açıksa Ajan GM yorumu, örnek cevap ve ölçer; değilse kilit kartı ve cevaplar */
  function duzeltmeleriCiz(kilitKarti = null) {
    if (!duzKap || !d) return;
    const acik = kilit.kilitli;
    const kart = (i) => {
      const q = veri.sorular[i], k = durum.cevaplar[i].k, o = q.secenekler[k];
      const ks = acik ? acik.find((x) => x.no === q.no) : null;
      return h("article", { sinif: "kart mk-duz" },
        h("header", { sinif: "mk-duz-ust" },
          h("span", { sinif: "mk-duz-no", metin: `S${q.no} · ${q.kisa}` }),
          h("span", { sinif: `mk-rozet mk-rozet-${o.puan}` }, o.puan === 0 ? ikon("bayrak") : null, ETIKET[o.puan])),
        h("p", { sinif: "mk-duz-soru", metin: q.soru }),
        h("div", { sinif: "mk-duz-satir" }, h("p", { sinif: "mk-duz-etiket", metin: "Sizin cevabınız" }), h("p", { metin: `“${o.metin}”` })),
        ks ? [
          h("div", { sinif: "mk-duz-satir mk-duz-gm" }, h("p", { sinif: "mk-duz-etiket", metin: "Ajan GM" }), h("p", { metin: yorumTemiz(ks.yorumlar[k]) })),
          h("div", { sinif: "mk-duz-satir mk-duz-ornek" }, h("p", { sinif: "mk-duz-etiket", metin: "Şöyle deyin" }), h("p", { metin: ks.ornek }),
            ks.not ? h("p", { sinif: "mk-duz-not", metin: ks.not }) : null),
          h("p", { sinif: "mk-duz-olcer" }, h("strong", { metin: "Bu soru şunu ölçer: " }), ks.olcer),
        ] : h("p", { sinif: "mk-duz-kilitli" }, ikon("kilit"), "Ajan GM'in yorumu ve örnek cevap erişim koduyla açılır."));
    };
    const ilk = d.eksik.slice(0, ILK_KART), kalan = d.eksik.slice(ILK_KART);
    temizle(duzKap).append(
      !acik && d.eksik.length ? (kilitKarti || kilitKartiKur("bekle")) : "",
      ilk.length ? h("div", { sinif: "mk-duzeltmeler" }, ilk.map(kart)) : "",
      kalan.length ? h("details", { sinif: "mk-diger" },
        h("summary", {}, `Diğer ${kalan.length} cevabınız`, ikon("asagi")),
        h("div", { sinif: "mk-duzeltmeler" }, kalan.map(kart))) : "");
  }

  /* Rapor açılınca: kod kayıtlıysa sessizce dene; değilse kodların satışta olup olmadığını sor ve kilit kartını kur */
  function kilitKontrol() {
    if (kilit.kilitli || !d || !d.eksik.length) return;
    const kayitli = oku(KOD_ANAHTARI);
    if (kayitli) {
      kodDene(kayitli).then((y) => {
        if (y.tamam) return;
        /* Bağlantı hatasında kod silinmez; kutuya yazılı gelir, yeniden denenebilir */
        if (y.hata === "ag") { duzeltmeleriCiz(kilitKartiKur("", "ag", kayitli)); return; }
        yaz(KOD_ANAHTARI, null);
        duzeltmeleriCiz(kilitKartiKur(y.hata === "satista-degil" ? "satista-degil" : "", y.hata === "satista-degil" ? "" : y.hata));
      });
      return;
    }
    satistaSor().then(() => duzeltmeleriCiz(kilitKartiKur(kilit.satista === false ? "satista-degil" : "")));
  }

  function satistaSor() {
    if (kilit.satistaSoruldu) return Promise.resolve(kilit.satista);
    kilit.satistaSoruldu = true;
    return jsonAl(ayar.api).then((y) => { kilit.satista = y && typeof y.satista === "boolean" ? y.satista : null; return kilit.satista; },
      () => { kilit.satista = null; return null; });
  }

  /* Kod denemesi: { tamam } ya da { tamam: false, satista, hata } */
  function kodDene(kod) {
    return jsonAl(ayar.api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kod }) }).then((y) => {
      if (y && y.gecerli && Array.isArray(y.sorular)) {
        kilit.kilitli = y.sorular;
        kilit.satista = true;
        yaz(KOD_ANAHTARI, kod);
        duzeltmeleriCiz();
        return { tamam: true };
      }
      if (y && y.satista === false) kilit.satista = false;
      return { tamam: false, satista: y ? y.satista : null, hata: y && y.satista === false ? "satista-degil" : "gecersiz" };
    }, () => ({ tamam: false, satista: null, hata: "ag" }));
  }

  /* Kilit kartı. hal: "bekle" (kontrol sürüyor), "satista-degil" ya da "" (form). hata: gecersiz | ag. onDeger: kutuya yazılı gelen kod */
  function kilitKartiKur(hal, hata = "", onDeger = "") {
    const HATA = {
      gecersiz: "Bu kod geçerli değil. Büyük-küçük harf ve tire fark etmez; kodu eksiksiz yazdığınızdan emin olun.",
      "satista-degil": "Erişim kodları henüz satışta değil.",
      ag: "Bağlantı kurulamadı. Biraz sonra yeniden deneyin.",
    };
    const L = linkler();
    const kodLinki = gecerliAdres(L.mulakat_kod) ? L.mulakat_kod.trim() : "";
    const fiyat = String(L.mulakat_kod_fiyat || "").trim();
    const magaza = gecerliAdres(L.shopier_magaza) ? L.shopier_magaza.trim() : "";
    const form = gecerliAdres(L.google_form) ? L.google_form.trim() : "";
    const satistaDegil = hal === "satista-degil";

    let formEl = null;
    if (!satistaDegil) {
      const girdi = h("input", {
        id: "mk-kod", name: "kod", type: "text", autocomplete: "off", autocapitalize: "characters", spellcheck: "false",
        autocorrect: "off", enterkeyhint: "go", inputmode: "text", maxlength: "64", placeholder: "ABCD-EFGH-JKLM", required: true,
        disabled: hal === "bekle",
      });
      if (onDeger) girdi.value = onDeger;
      const mesaj = h("p", { sinif: "mk-kilit-hata", role: "alert", metin: HATA[hata] || "" });
      mesaj.hidden = !hata;
      const gonder = h("button", { sinif: "dugme", type: "submit", disabled: hal === "bekle" }, hal === "bekle" ? "Kontrol ediliyor…" : "Cevapları aç");
      formEl = h("form", { sinif: "mk-kilit-form", novalidate: true },
        h("label", { for: "mk-kod", metin: "Erişim kodu" }),
        h("div", { sinif: "mk-kilit-satir" }, girdi, gonder),
        mesaj);
      formEl.addEventListener("submit", (e) => {
        e.preventDefault();
        const kod = girdi.value.trim();
        if (kod.replace(/[^0-9a-z]/gi, "").length < 6) { mesaj.textContent = "Kodu eksiksiz yazın."; mesaj.hidden = false; girdi.focus(); return; }
        gonder.disabled = true; gonder.textContent = "Kontrol ediliyor…"; mesaj.hidden = true;
        kodDene(kod).then((y) => {
          if (y.tamam) return;
          if (y.hata === "satista-degil") { duzeltmeleriCiz(kilitKartiKur("satista-degil")); return; }
          mesaj.textContent = HATA[y.hata] || HATA.gecersiz; mesaj.hidden = false;
          gonder.disabled = false; gonder.textContent = "Cevapları aç"; girdi.select();
        });
      });
    }

    const al = kodLinki
      ? h("a", { sinif: "dugme-cizgi", href: kodLinki, rel: "noopener" }, fiyat ? `Erişim kodu al · ${fiyat}` : "Erişim kodu al", ikon("ok"))
      : h("span", { sinif: "dugme-pasif", metin: "Shopier'de yakında" });
    const haberVer = !kodLinki && form ? h("a", { sinif: "dugme-cizgi", href: form, rel: "noopener", metin: "Açılınca haber ver" }) : null;
    const magazaLinki = !kodLinki && magaza ? h("a", { sinif: "dugme-cizgi", href: magaza, rel: "noopener", metin: "Shopier mağazası" }) : null;

    return h("section", { sinif: "kart mk-kilit", "aria-labelledby": "mk-kilit-baslik" },
      h("div", { sinif: "mk-kilit-ust" }, ikon("kilit", "ikon ikon-buyuk"),
        h("h4", { id: "mk-kilit-baslik", sinif: "h3-boy", metin: "Ajan GM'in yorumları ve örnek cevaplar erişim koduyla açılır" })),
      h("p", { metin: "Her zayıf cevabınız için Ajan GM ne düşündüğünü yazar, yerine söyleyebileceğiniz örnek cevabı verir ve sorunun neyi ölçtüğünü açıklar. Kodu bir kez girmeniz yeter; bu tarayıcı hatırlar." }),
      satistaDegil ? h("p", { sinif: "mk-kilit-hata", metin: HATA["satista-degil"] }) : formEl,
      h("div", { sinif: "eylemler" }, al, haberVer, magazaLinki));
  }

  function yaziYaz(el, metin) {
    clearInterval(yaziZamanlayici);
    if (hareketAz()) { el.textContent = metin; return; }
    let n = 0;
    el.textContent = "";
    yaziZamanlayici = setInterval(() => {
      n += 2;
      el.textContent = metin.slice(0, n);
      if (n >= metin.length) clearInterval(yaziZamanlayici);
    }, 18);
    el.parentElement.addEventListener("click", () => { clearInterval(yaziZamanlayici); el.textContent = metin; }, { once: true });
  }

  function sayiSay(el, hedef) {
    if (hareketAz() || !window.requestAnimationFrame) { el.textContent = String(hedef); return; }
    const bas = simdi(), sure = 700;
    const adim = () => {
      const t = Math.min(1, (simdi() - bas) / sure);
      el.textContent = String(Math.round(hedef * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(adim);
    };
    requestAnimationFrame(adim);
  }

  function kopyala(st, alan) {
    if (!d) return;
    const metin = raporMetni(veri, d, durum.cevaplar, { dosyaNo: durum.dosyaNo, tarih: durum.tarih, adres: ayar.adres }, kilit.kilitli ? { sorular: kilit.kilitli } : null);
    const yedek = () => {
      alan.hidden = false;
      alan.value = metin;
      alan.focus();
      alan.select();
      st.textContent = "Otomatik kopyalama bu tarayıcıda kapalı. Metni aşağıda seçtim; kopyalayıp saklayabilirsiniz.";
    };
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) { yedek(); return; }
      navigator.clipboard.writeText(metin).then(() => { st.textContent = "Rapor panoya kopyalandı."; }, yedek);
    } catch { yedek(); }
  }

  /* ---------------- Klavye: 1–4 ya da A–D seçer, sol ok önceki soru ---------------- */
  document.addEventListener("keydown", (e) => {
    if (durum.ekran !== "soru" || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const tus = String(e.key || "").toLocaleLowerCase("tr-TR");
    let g = ["1", "2", "3", "4"].indexOf(tus);
    if (g < 0) g = ["a", "b", "c", "d"].indexOf(tus);
    if (g >= 0) { e.preventDefault(); sec(g); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); geri(); }
  });
}
