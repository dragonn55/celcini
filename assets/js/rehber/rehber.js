/* Rehber · rehberli Excel dersleri (Datakit; sonra Motor aynı bileşenle).
   Sayfa kabuğunu scripts/derle.py üretir: başlık, Ajan GM kartı ve <div data-rehber …> kökü. Bu modül kökün içine
   araç çubuğunu, ad kutusunu, Excel ızgarasını (tablo.js), sayfa sekmelerini, not listesini, not balonunu ve ders sorusunu kurar.
   Kök öznitelikleri: data-urun (datakit), data-ders (dashboard), data-veri (/datakit/veri/), data-api (/api/ders/),
   data-taban (/datakit/), data-shopier (ürünün Shopier bağlantısı; boş olabilir).
   Ücretsiz ders: GET {veri}ders/{id}.json. Kilitli ders: POST {api} { urun, id, kod } → { satista, gecerli, ders }.
   Kod yalnızca bu tarayıcıda saklanır (localStorage "celcini-kod-{urun}"); sunucu kodu saklamaz.
   Ders ilerlemesi (soru cevapları) localStorage "celcini-rehber"de. Satır içi style yazılmaz (CSP). */
import { tabloKur } from "./tablo.js";
import { grafikCiz } from "./grafik.js";
import { h, temizle } from "/fabricakit/js/arayuz/dom.js";
import { sesliOkuDugmesi, okumayiDurdur } from "/fabricakit/js/arayuz/ses.js";

const SVG = "http://www.w3.org/2000/svg";
/* Lucide çizgi ikonları (ISC lisansı) */
const IKON = {
  kilit: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  kapat: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  tik: '<path d="M20 6 9 17l-5-5"/>',
  sol: '<path d="m15 18-6-6 6-6"/>',
  sag: '<path d="m9 18 6-6-6-6"/>',
  arti: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  eksi: '<path d="M5 12h14"/>',
  sigdir: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  oynat: '<path d="M6 4.5v15a1 1 0 0 0 1.5.87l12-7.5a1 1 0 0 0 0-1.74l-12-7.5A1 1 0 0 0 6 4.5z"/>',
  ok: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  geri: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  sayfa: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
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

const TELEFON = window.matchMedia("(max-width: 759px)");
const ILERLEME = "celcini-rehber";

const oku = (anahtar) => { try { return localStorage.getItem(anahtar); } catch { return null; } };
const yaz = (anahtar, deger) => { try { if (deger === null) localStorage.removeItem(anahtar); else localStorage.setItem(anahtar, deger); } catch { /* özel pencere */ } };
const ilerleme = () => { try { return JSON.parse(oku(ILERLEME) || "{}") || {}; } catch { return {}; } };

/* Ekrandaki işaretler okunurken sese çevrilir ya da atlanır ("✓ Temiz" → "Temiz", "Fiyat ↑" → "Fiyat yukarı") */
export function seseUygun(m) {
  return String(m || "")
    .replace(/[✓⚠✗▲▼•]/g, "")
    .replace(/↑/g, " yukarı ").replace(/↓/g, " aşağı ")
    .replace(/\s×\s/g, " çarpı ").replace(/\s÷\s/g, " bölü ").replace(/≈/g, " yaklaşık ")
    .replace(/₺/g, " TL")
    .replace(/\s{2,}/g, " ").trim();
}

function sesDugmesi(metinler) {
  return sesliOkuDugmesi(() => metinler().map(seseUygun), { yalnizCihaz: true });
}

async function jsonAl(url, secenek) {
  const y = await fetch(url, secenek);
  if (!y.ok) throw new Error(`${y.status}`);
  return y.json();
}

/* Açılış sayfasındaki ders kartları: biten ders "Tamamlandı", kod girilmişse kilitli dersler "Kodla açık" */
function acilisIsaretle() {
  const liste = document.querySelector("[data-rehber-dersler]");
  if (!liste) return;
  const urun = liste.dataset.urun;
  const biten = ilerleme()[urun] || {};
  const kodVar = !!oku(`celcini-kod-${urun}`);
  for (const kart of liste.querySelectorAll("[data-ders-id]")) {
    const ust = kart.querySelector(".rh-ders-ust span");
    if (biten[kart.dataset.dersId]) {
      kart.classList.add("rh-ders-bitti");
      if (ust) ust.textContent = `${ust.textContent.split(" · ")[0]} · Tamamlandı`;
      kart.querySelector(".rh-ders-ust svg")?.replaceWith(ikon("tik"));
    } else if (kodVar && ust && ust.textContent.includes("Erişim koduyla")) {
      ust.textContent = ust.textContent.replace("Erişim koduyla", "Kodla açık");
      kart.querySelector(".rh-ders-ust svg")?.replaceWith(ikon("sayfa"));
    }
  }
}

function baslat() {
  /* Ajan GM kartındaki "Sesli oku" (yalnız cihazda erkek ses varsa görünür); açılış sayfasında da */
  const gmSes = document.querySelector("[data-rehber-ses]");
  const gmMetin = document.querySelector("[data-rehber-gm]");
  if (gmSes && gmMetin) gmSes.append(sesDugmesi(() => [gmMetin.dataset.ses || gmMetin.textContent]));
  acilisIsaretle();

  const kok = document.querySelector("[data-rehber]");
  if (!kok) return;
  const ayar = {
    urun: kok.dataset.urun, id: kok.dataset.ders, veri: kok.dataset.veri, api: kok.dataset.api,
    taban: kok.dataset.taban, shopier: kok.dataset.shopier || "",
  };
  const kodAnahtari = `celcini-kod-${ayar.urun}`;

  const durum = h("p", { sinif: "rh-durum", role: "status" }, "Sayfa yükleniyor…");
  temizle(kok).append(durum);

  jsonAl(`${ayar.veri}dersler.json`).then((dizin) => {
    const ders = dizin.dersler.find((d) => d.id === ayar.id);
    if (!ders) { durum.textContent = "Bu ders bulunamadı."; return; }
    if (ders.ucretsiz) {
      return jsonAl(`${ayar.veri}ders/${ders.id}.json`).then((icerik) => kur(dizin, ders, icerik), () => { durum.textContent = "Ders yüklenemedi. Sayfayı yenileyin."; });
    }
    const kod = oku(kodAnahtari);
    if (!kod) return kilitGoster(dizin, ders);
    durum.textContent = "Ders açılıyor…";
    return kilitliIste(ders, kod).then((y) => {
      if (y.gecerli && y.ders) kur(dizin, ders, y.ders);
      else { yaz(kodAnahtari, null); kilitGoster(dizin, ders, y.satista === false ? "satista-degil" : "gecersiz"); }
    }, () => kilitGoster(dizin, ders, "ag"));
  }, () => { durum.textContent = "Ders listesi yüklenemedi. Sayfayı yenileyin."; });

  function kilitliIste(ders, kod) {
    return jsonAl(ayar.api, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urun: ayar.urun, id: ders.id, kod }),
    });
  }

  /* ---------------- Kilit ---------------- */
  function kilitGoster(dizin, ders, hata = "") {
    const HATA = {
      gecersiz: "Bu kod geçerli değil. Büyük-küçük harf ve tire fark etmez; kodu Shopier'deki teslimat notundan kopyalayın.",
      "satista-degil": "Erişim kodları henüz satışta değil.",
      ag: "Bağlantı kurulamadı. Biraz sonra yeniden deneyin.",
    };
    const girdi = h("input", {
      id: "rh-kod", name: "kod", type: "text", autocomplete: "off", autocapitalize: "characters", spellcheck: "false",
      inputmode: "text", maxlength: "64", placeholder: "ABCD-EFGH-JKLM", required: true,
    });
    const mesaj = h("p", { sinif: "rh-kilit-hata", role: "alert" }, HATA[hata] || "");
    mesaj.hidden = !hata;
    const gonder = h("button", { sinif: "dugme", type: "submit" }, "Dersi aç");
    const form = h("form", { sinif: "rh-kilit-form", novalidate: true },
      h("label", { for: "rh-kod" }, "Erişim kodu"),
      h("div", { sinif: "rh-kilit-satir" }, girdi, gonder),
      mesaj);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const kod = girdi.value.trim();
      if (kod.replace(/[^0-9a-z]/gi, "").length < 6) { mesaj.textContent = "Kodu eksiksiz yazın."; mesaj.hidden = false; girdi.focus(); return; }
      gonder.disabled = true; gonder.textContent = "Kontrol ediliyor…"; mesaj.hidden = true;
      kilitliIste(ders, kod).then((y) => {
        if (y.gecerli && y.ders) { yaz(kodAnahtari, kod); kur(dizin, ders, y.ders); return; }
        mesaj.textContent = y.satista === false ? HATA["satista-degil"] : HATA.gecersiz;
        mesaj.hidden = false; gonder.disabled = false; gonder.textContent = "Dersi aç"; girdi.select();
      }, () => { mesaj.textContent = HATA.ag; mesaj.hidden = false; gonder.disabled = false; gonder.textContent = "Dersi aç"; });
    });
    const magaza = (window.CELCINI_LINKS && window.CELCINI_LINKS.shopier_magaza) || "";
    const al = ayar.shopier
      ? h("a", { sinif: "dugme-cizgi", href: ayar.shopier, rel: "noopener" }, `${dizin.ad} dosyalarını al`, ikon("ok"))
      : h("span", { sinif: "dugme-pasif" }, "Shopier'de yakında");
    const konular = (ders.konular || []).length
      ? h("div", { sinif: "rh-kilit-konular" }, h("h3", { metin: "Bu derste" }), h("ul", {}, ders.konular.map((k) => h("li", { metin: k })))) : null;
    temizle(kok).append(
      h("section", { sinif: "rh-kilit kart", "aria-labelledby": "rh-kilit-baslik" },
        h("div", { sinif: "rh-kilit-ust" }, ikon("kilit", "ikon ikon-buyuk"),
          h("h2", { id: "rh-kilit-baslik", sinif: "h3-boy" }, "Bu ders erişim koduyla açılır")),
        h("p", {}, `${dizin.ad} dosyalarını aldığınızda erişim kodu da gelir. Kodu bir kez girmeniz yeter; bu tarayıcı hatırlar. İlk ${dizin.ucretsiz_ders} ders ücretsizdir.`),
        form,
        h("div", { sinif: "eylemler" }, al, !ayar.shopier && magaza ? h("a", { sinif: "dugme-cizgi", href: magaza, rel: "noopener" }, "Shopier mağazası") : null),
        konular || ""),
      sekmeler(dizin, ders),
    );
  }

  /* ---------------- Sayfa sekmeleri (Excel'deki sayfa sekmeleri gibi) ---------------- */
  function sekmeler(dizin, ders) {
    const kodVar = !!oku(kodAnahtari);
    const biten = ilerleme()[ayar.urun] || {};
    const sira = dizin.dersler.findIndex((d) => d.id === ders.id);
    const onceki = dizin.dersler[sira - 1], sonraki = dizin.dersler[sira + 1];
    const okDugme = (d, yon) => d
      ? h("a", { sinif: "rh-sekme-ok", href: `${ayar.taban}${d.id}/`, "aria-label": `${yon === "sol" ? "Önceki" : "Sonraki"} sayfa: ${d.sayfa_adi}` }, ikon(yon))
      : h("span", { sinif: "rh-sekme-ok rh-sekme-ok-bos", "aria-hidden": "true" }, ikon(yon));
    const liste = h("ol", { sinif: "rh-sekme-liste" }, dizin.dersler.map((d) => {
      const kilitli = !d.ucretsiz && !kodVar;
      const ic = [kilitli ? ikon("kilit", "ikon rh-sekme-ikon") : biten[d.id] ? ikon("tik", "ikon rh-sekme-ikon") : null, d.sayfa_adi];
      return h("li", {}, d.id === ders.id
        ? h("span", { sinif: "rh-sekme rh-sekme-etkin", "aria-current": "page" }, ...ic)
        : h("a", { sinif: "rh-sekme", href: `${ayar.taban}${d.id}/`, title: kilitli ? "Erişim koduyla açılır" : d.baslik }, ...ic));
    }));
    const nav = h("nav", { sinif: "rh-sekmeler", "aria-label": "Sayfa haritası" }, okDugme(onceki, "sol"), okDugme(sonraki, "sag"), liste);
    requestAnimationFrame(() => {
      const etkin = liste.querySelector(".rh-sekme-etkin");
      if (etkin) liste.scrollLeft = Math.max(0, etkin.offsetLeft - liste.clientWidth / 2 + etkin.offsetWidth / 2);
    });
    return nav;
  }

  /* ---------------- Ders ---------------- */
  function kur(dizin, ders, icerik) {
    const notlar = icerik.notlar || [];
    const sayfa = icerik.sayfa;
    let tablo = null, acikNot = null;

    /* Ad kutusu ve formül çubuğu: tıklanan hücrenin adresi ve değeri */
    const adKutusu = h("span", { sinif: "rh-ad", "aria-label": "Hücre" }, "A1");
    const degerKutusu = h("span", { sinif: "rh-deger" }, "Bir hücreye dokunun; değeri burada görünür.");
    const tipKutusu = h("span", { sinif: "rh-tip" });
    const formulCubugu = h("div", { sinif: "rh-formul", "aria-live": "polite" }, adKutusu, h("span", { sinif: "rh-fx", "aria-hidden": "true" }, "ƒx"), degerKutusu, tipKutusu);

    const kutu = h("div", { sinif: "rt-kutu", tabindex: "0", role: "region", "aria-label": `${sayfa.ad} sayfası, kaydırılabilir` });

    /* Ölçek: telefonda %85, masaüstünde %100; "Sığdır" sayfayı genişliğe sığdırır */
    const olcekYazi = h("span", { sinif: "rh-olcek-deger" }, "%100");
    const olcekDugme = (ad, etiket, f) => h("button", { sinif: "rh-arac-dugme", type: "button", "aria-label": etiket, title: etiket, on: { click: f } }, ikon(ad));
    const olcekGuncelle = () => { olcekYazi.textContent = `%${Math.round(tablo.olcek * 100)}`; };
    const olcek = h("div", { sinif: "rh-olcek", role: "group", "aria-label": "Yakınlaştırma" },
      olcekDugme("eksi", "Uzaklaştır", () => { tablo.olcekAyarla(Math.round((tablo.olcek - 0.1) * 10) / 10); olcekGuncelle(); }),
      olcekYazi,
      olcekDugme("arti", "Yakınlaştır", () => { tablo.olcekAyarla(Math.round((tablo.olcek + 0.1) * 10) / 10); olcekGuncelle(); }),
      olcekDugme("sigdir", "Sayfayı genişliğe sığdır", () => { tablo.olcekAyarla(Math.max(0.4, Math.min(1, (kutu.clientWidth - 4) / tablo.genislik()))); olcekGuncelle(); }));
    const turDugme = h("button", { sinif: "dugme-cizgi rh-tur", type: "button", on: { click: () => notAc(0) } }, ikon("oynat"), "Notları sırayla gez");
    const arac = h("div", { sinif: "rh-arac" }, turDugme, h("span", { sinif: "rh-not-sayi" }, `${notlar.length} not · turuncu üçgenli hücrelere dokunun`), olcek);

    const disGrafikler = (sayfa.grafikler || []).filter((g) => g.disarida);
    const disKap = disGrafikler.length ? h("div", { sinif: "rh-dis-grafikler" }) : null;

    /* Not listesi */
    const notListesi = h("ol", { sinif: "rh-not-liste" }, notlar.map((n, i) => h("li", { sinif: "rh-not kart", id: `not-${i + 1}` },
      h("div", { sinif: "rh-not-ust" }, h("span", { sinif: "rh-not-no", "aria-hidden": "true" }, String(i + 1)), h("h3", { sinif: "rh-not-baslik", metin: n.baslik })),
      h("p", { metin: n.metin }),
      h("p", { sinif: "rh-karar" }, h("strong", {}, "Ne yapmalı? "), n.karar),
      h("button", { sinif: "rh-hucrede", type: "button", on: { click: () => notAc(i) } }, `Hücrede göster (${n.aralik})`))));

    /* Not balonu: masaüstünde pinin yanında, telefonda alttan açılan kart */
    const balonBaslik = h("h3", { id: "rh-balon-baslik", sinif: "rh-balon-baslik" });
    const balonNo = h("span", { sinif: "rh-balon-no" });
    const balonMetin = h("p", { sinif: "rh-balon-metin" });
    const balonKarar = h("p", { sinif: "rh-karar" });
    const balonSes = h("span", { sinif: "rh-balon-ses" });
    const oncekiDugme = h("button", { sinif: "rh-arac-dugme", type: "button", "aria-label": "Önceki not", on: { click: () => notAc(acikNot - 1) } }, ikon("sol"));
    const sonrakiDugme = h("button", { sinif: "dugme-cizgi rh-sonraki", type: "button", on: { click: () => (acikNot < notlar.length - 1 ? notAc(acikNot + 1) : soruyaGec()) } });
    const balon = h("div", { sinif: "rh-balon", role: "dialog", "aria-labelledby": "rh-balon-baslik", hidden: true },
      h("div", { sinif: "rh-balon-ust" }, balonNo, h("button", { sinif: "rh-arac-dugme rh-kapat", type: "button", "aria-label": "Notu kapat", on: { click: () => notKapat() } }, ikon("kapat"))),
      balonBaslik, balonMetin, balonKarar,
      h("div", { sinif: "rh-balon-alt" }, balonSes, h("span", { sinif: "rh-bosluk" }), oncekiDugme, sonrakiDugme));
    document.body.append(balon);

    function balonYerlestir() {
      if (acikNot === null || balon.hidden) return;
      if (TELEFON.matches) { balon.classList.add("rh-balon-alt-kart"); balon.style.left = ""; balon.style.top = ""; return; }
      balon.classList.remove("rh-balon-alt-kart");
      const pin = tablo.pin(acikNot);
      if (!pin) return;
      const p = pin.getBoundingClientRect(), k = kutu.getBoundingClientRect();
      const gen = balon.offsetWidth, yuk = balon.offsetHeight;
      const x = Math.min(Math.max(8, Math.min(p.left, k.right) - gen + 24), window.innerWidth - gen - 8);
      let y = Math.min(Math.max(p.bottom, k.top), k.bottom) + 10;
      if (y + yuk > window.innerHeight - 8) y = Math.max(8, Math.min(p.top, k.bottom) - yuk - 10);
      balon.style.left = `${Math.round(x + window.scrollX)}px`;
      balon.style.top = `${Math.round(y + window.scrollY)}px`;
    }

    function notAc(i) {
      if (i < 0 || i >= notlar.length) return;
      okumayiDurdur();
      acikNot = i;
      const n = notlar[i];
      balonNo.textContent = `Not ${i + 1} / ${notlar.length} · ${n.aralik}`;
      balonBaslik.textContent = n.baslik;
      balonMetin.textContent = n.metin;
      temizle(balonKarar).append(h("strong", {}, "Ne yapmalı? "), n.karar);
      temizle(balonSes).append(sesDugmesi(() => [n.ses || `${n.metin} ${n.karar}`]));
      oncekiDugme.disabled = i === 0;
      temizle(sonrakiDugme).append(i < notlar.length - 1 ? "Sonraki not" : "Soruya geç", ikon("sag"));
      balon.hidden = false;
      const kutuUst = kutu.getBoundingClientRect().top;
      if (kutuUst < 0 || kutuUst > window.innerHeight * 0.6) kutu.scrollIntoView({ block: "start", behavior: "smooth" });
      tablo.notGoster(i);
      requestAnimationFrame(() => { balonYerlestir(); if (!TELEFON.matches) sonrakiDugme.focus({ preventScroll: true }); });
      setTimeout(balonYerlestir, 400);
    }
    function notKapat() {
      okumayiDurdur();
      if (acikNot !== null) tablo.pin(acikNot)?.focus({ preventScroll: true });
      acikNot = null;
      balon.hidden = true;
      tablo.notGoster(null);
    }
    function soruyaGec() {
      notKapat();
      soruBolum.scrollIntoView({ block: "start", behavior: "smooth" });
      soruBolum.querySelector("button")?.focus({ preventScroll: true });
    }
    document.addEventListener("keydown", (e) => {
      if (balon.hidden) return;
      if (e.key === "Escape") notKapat();
      else if (e.key === "ArrowRight" && e.target.tagName !== "INPUT") notAc(acikNot + 1);
      else if (e.key === "ArrowLeft" && e.target.tagName !== "INPUT") notAc(acikNot - 1);
    });
    let bekleyen = false;
    const yeniden = () => { if (bekleyen) return; bekleyen = true; requestAnimationFrame(() => { bekleyen = false; balonYerlestir(); }); };
    window.addEventListener("scroll", yeniden, { passive: true });
    window.addEventListener("resize", yeniden);
    kutu.addEventListener("scroll", yeniden, { passive: true });

    /* Ders sorusu */
    const soru = icerik.soru;
    const kayitli = (ilerleme()[ayar.urun] || {})[ders.id];
    const sonuc = h("div", { sinif: "rh-sonuc", "aria-live": "polite" });
    const secenekler = h("div", { sinif: "rh-secenekler", role: "group", "aria-label": "Seçenekler" });
    const cevapla = (j, kaydet = true) => {
      for (const [x, b] of [...secenekler.children].entries()) {
        b.disabled = true;
        b.classList.toggle("rh-dogru", x === soru.dogru);
        b.classList.toggle("rh-yanlis", x === j && j !== soru.dogru);
        b.setAttribute("aria-pressed", String(x === j));
      }
      const dogru = j === soru.dogru;
      temizle(sonuc).append(h("p", { sinif: "rh-sonuc-baslik" }, ikon(dogru ? "tik" : "kapat"), dogru ? "Doğru." : `Doğru cevap: ${soru.secenekler[soru.dogru]}`), h("p", { metin: soru.aciklama }));
      tekrar.hidden = false;
      if (kaydet) {
        const t = ilerleme(); t[ayar.urun] = t[ayar.urun] || {}; t[ayar.urun][ders.id] = { cevap: j, dogru };
        yaz(ILERLEME, JSON.stringify(t));
      }
    };
    soru.secenekler.forEach((s, j) => secenekler.append(h("button", { sinif: "rh-secenek", type: "button", on: { click: () => cevapla(j) } }, h("span", { sinif: "rh-harf", "aria-hidden": "true" }, "ABCD"[j]), h("span", { metin: s }))));
    const tekrar = h("button", { sinif: "rh-tekrar", type: "button", hidden: true, on: { click: () => {
      for (const b of secenekler.children) { b.disabled = false; b.classList.remove("rh-dogru", "rh-yanlis"); b.removeAttribute("aria-pressed"); }
      temizle(sonuc); tekrar.hidden = true; secenekler.firstChild.focus();
    } } }, "Yeniden dene");
    const soruBolum = h("section", { sinif: "rh-soru kart", id: "ders-sorusu", "aria-labelledby": "rh-soru-baslik" },
      h("p", { sinif: "rh-ust-yazi" }, "Ders sorusu"),
      h("h2", { id: "rh-soru-baslik", sinif: "h3-boy", metin: soru.metin }), secenekler, sonuc, tekrar);
    if (kayitli && Number.isInteger(kayitli.cevap)) cevapla(kayitli.cevap, false);

    /* Önceki / sonraki ders */
    const sira = dizin.dersler.findIndex((d) => d.id === ders.id);
    const onceki = dizin.dersler[sira - 1], sonraki = dizin.dersler[sira + 1];
    const kodVar = !!oku(kodAnahtari);
    const gezinti = h("nav", { sinif: "rh-gezinti", "aria-label": "Dersler arasında" },
      onceki ? h("a", { sinif: "rh-gez rh-gez-onceki", href: `${ayar.taban}${onceki.id}/` }, ikon("geri"), h("span", {}, h("small", {}, "Önceki ders"), onceki.sayfa_adi)) : h("span"),
      sonraki ? h("a", { sinif: "rh-gez rh-gez-sonraki", href: `${ayar.taban}${sonraki.id}/` },
        h("span", {}, h("small", {}, !sonraki.ucretsiz && !kodVar ? "Sonraki ders · erişim koduyla" : "Sonraki ders"), sonraki.sayfa_adi), ikon(!sonraki.ucretsiz && !kodVar ? "kilit" : "ok"))
        : h("a", { sinif: "rh-gez rh-gez-sonraki", href: ayar.taban }, h("span", {}, h("small", {}, "Bitti"), `${dizin.ad} ana sayfası`), ikon("ok")));

    temizle(kok).append(...[
      arac,
      disKap,
      formulCubugu,
      kutu,
      sekmeler(dizin, ders),
      h("section", { sinif: "rh-notlar", "aria-labelledby": "rh-notlar-baslik" },
        h("h2", { id: "rh-notlar-baslik", sinif: "h3-boy" }, "Bu sayfadaki notlar"), notListesi),
      soruBolum,
      gezinti,
    ].filter(Boolean));

    tablo = tabloKur(kutu, sayfa, {
      notlar,
      olcek: TELEFON.matches ? 0.85 : 1,
      hucreSec: ({ adres, deger, formul }) => {
        adKutusu.textContent = adres;
        degerKutusu.textContent = deger === "" ? "(boş)" : deger;
        tipKutusu.textContent = deger === "" ? "" : formul ? "formül sonucu" : "girilen değer";
      },
      notSec: (i) => notAc(i),
    });
    olcekGuncelle();
    if (disKap) {
      const ciz = () => {
        temizle(disKap);
        const gen = Math.min(disKap.clientWidth || 600, 1100);
        for (const g of disGrafikler) disKap.append(h("figure", { sinif: "rh-dis-grafik kart" }, grafikCiz(g, gen - 2, Math.round(Math.max(240, Math.min(340, gen * 0.42))), TELEFON.matches ? 0.9 : 1)));
      };
      ciz();
      let gecikme = null;
      window.addEventListener("resize", () => { clearTimeout(gecikme); gecikme = setTimeout(ciz, 150); });
    }
    if (location.hash.startsWith("#not-")) {
      const i = Number(location.hash.slice(5)) - 1;
      if (i >= 0 && i < notlar.length) setTimeout(() => notAc(i), 100);
    }
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", baslat);
else baslat();
