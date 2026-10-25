/* Celcini · menü, config bağlantıları, raf ve arşiv araması, galeri, uygulama içi tarayıcı uyarısı. Çerçeve yok. */
(function () {
  "use strict";

  /* ---- 1. config.js bağlantıları ---- */
  var L = window.CELCINI_LINKS || {};
  function deger(anahtar) {
    var v = typeof L[anahtar] === "string" ? L[anahtar].trim() : "";
    if (!v) return "";
    if (anahtar === "eposta") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : "";
    return /^https:\/\/[^\s]+$/.test(v) ? v : "";
  }
  document.querySelectorAll("[data-link]").forEach(function (el) {
    var k = el.getAttribute("data-link");
    var v = deger(k);
    if (!v) { el.hidden = true; return; }
    el.setAttribute("href", k === "eposta" ? "mailto:" + v : v);
    el.hidden = false;
  });
  document.querySelectorAll("[data-link-metin]").forEach(function (el) {
    var v = deger(el.getAttribute("data-link-metin"));
    if (v) el.textContent = el.getAttribute("data-link-metin") === "instagram" ? "@" + v.replace(/\/+$/, "").split("/").pop() : v;
  });
  /* data-gerekli="google_form eposta": listelenen bağlantılardan biri bile varsa bölüm görünür */
  document.querySelectorAll("[data-gerekli]").forEach(function (el) {
    var var_ = el.getAttribute("data-gerekli").split(/\s+/).some(function (k) { return deger(k); });
    el.hidden = !var_;
  });

  /* ---- 2. Mobil menü ---- */
  var dugme = document.querySelector(".menu-dugme");
  var menu = document.getElementById("ust-menu");
  if (dugme && menu) {
    var kapat = function () { dugme.setAttribute("aria-expanded", "false"); menu.classList.remove("acik"); };
    dugme.addEventListener("click", function () {
      var acik = dugme.getAttribute("aria-expanded") === "true";
      dugme.setAttribute("aria-expanded", String(!acik));
      menu.classList.toggle("acik", !acik);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dugme.getAttribute("aria-expanded") === "true") { kapat(); dugme.focus(); }
    });
    window.addEventListener("resize", function () { if (window.innerWidth >= 860) kapat(); });
  }

  /* ---- 2b. Alt menü (Dosyalar) ---- */
  document.querySelectorAll(".menu-alt-dugme").forEach(function (b) {
    var grup = b.parentNode;
    var ac = function (durum) { b.setAttribute("aria-expanded", String(durum)); };
    b.addEventListener("click", function () { ac(b.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("click", function (e) { if (!grup.contains(e.target)) ac(false); });
    grup.addEventListener("focusout", function (e) { if (e.relatedTarget && !grup.contains(e.relatedTarget)) ac(false); });
    grup.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && b.getAttribute("aria-expanded") === "true") { e.stopPropagation(); ac(false); b.focus(); }
    });
  });

  /* ---- 3. Raf: arama + etiket süzgeci ---- */
  var filtre = document.querySelector("[data-filtre]");
  if (filtre) {
    var kutu = filtre.querySelector("input[type=search]");
    var etiketDugmeleri = filtre.querySelectorAll("[data-etiket]");
    var kartlar = document.querySelectorAll("[data-urun]");
    var sonuc = document.querySelector("[data-sonuc]");
    var secili = "";
    var birim = filtre.getAttribute("data-birim") || "ürün";
    /* Arama kelime başından eşleşir: "kalite" "kalitesi"ni bulur, "isi" "kişi"yi bulmaz (Türkçe ek alır, önek almaz).
       Sorguda Türkçe harf yoksa metnin harfleri de sadeleşir: "sayim" "sayım"ı, "kalip" "Kalıp"ı bulur. Türkçe harfle
       yazılan sorgu harfi harfine aranır: "kâr" "karar"ı, "kış" "kişi"yi bulmaz. Şapkasız sorgu şapkalı yazımı da bulur:
       "şikayet" "şikâyet"i, "kağıt" "kâğıt"ı bulur. */
    var kucuk = function (s) { return (s || "").normalize("NFC").toLocaleLowerCase("tr").replace(/\s+/g, " "); };
    var sapkasiz = function (s) { return s.replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u"); };
    var sade = function (s) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i"); };
    var metinler = [], sapkasizMetinler = [], sadeMetinler = [];
    kartlar.forEach(function (k) {
      var m = kucuk(k.getAttribute("data-ara"));
      metinler.push(m);
      sapkasizMetinler.push(sapkasiz(m));
      sadeMetinler.push(sade(m));
    });
    var kacir = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    var uygula = function () {
      /* Türkçe harf denetimi ham sorguda: tr küçültmesi ASCII "I"yı "ı" yapar, "ISG" / "IADE" yine bulunmalı.
         "İ" sınıfta yok: telefon baştaki "i"yi kendiliğinden "İ" yapar ("İletisim" de "iletisim" gibi aranır). */
      var ham = kutu.value.normalize("NFC");
      var turkce = /[çğıöşüâîûÇĞÖŞÜÂÎÛ]/.test(ham);
      var q = (turkce ? kucuk(ham) : sade(ham.toLowerCase().replace(/\s+/g, " "))).trim();
      var hedef = !turkce ? sadeMetinler : (/[âîûÂÎÛ]/.test(ham) ? metinler : sapkasizMetinler);
      var desen = q ? new RegExp("(^|[^a-z0-9çğıöşüâîû])" + kacir(q)) : null;
      var n = 0;
      kartlar.forEach(function (k, i) {
        var metinUyar = !desen || desen.test(hedef[i]);
        var etiketUyar = !secili || ("|" + k.getAttribute("data-etiketler") + "|").indexOf("|" + secili + "|") !== -1;
        var gor = metinUyar && etiketUyar;
        k.hidden = !gor;
        if (gor) n++;
      });
      if (sonuc) sonuc.textContent = n === kartlar.length ? "" : (n ? n + " " + birim + " gösteriliyor." : "Aramanıza uyan " + birim + " yok.");
      /* Arama sürerken bölüm kısayolları ve toplam sayılar gizlenir (süzülmüş listeyle çelişmesin) */
      document.querySelectorAll("[data-arama-gizle]").forEach(function (el) { el.hidden = !!q; });
      /* İki bölümlü rafta (Shopier + ücretsiz) kartı kalmayan bölümün başlığı da gizlenir */
      document.querySelectorAll("[data-urun-bolum]").forEach(function (b) {
        b.hidden = !b.querySelector("[data-urun]:not([hidden])");
      });
    };
    kutu.addEventListener("input", uygula);
    etiketDugmeleri.forEach(function (b) {
      b.addEventListener("click", function () {
        secili = b.getAttribute("data-etiket");
        etiketDugmeleri.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        uygula();
      });
    });
  }

  /* ---- 4. Ürün galerisi ---- */
  var ana = document.querySelector("[data-galeri-ana]");
  if (ana) {
    var kucukler = document.querySelectorAll("[data-galeri-kucuk]");
    kucukler.forEach(function (b) {
      b.addEventListener("click", function () {
        /* <picture> ise WebP kaynağı da değişir; boyut "1600x831" biçiminde */
        var kaynak = ana.parentNode.querySelector("source");
        if (kaynak) kaynak.srcset = b.getAttribute("data-webp") || b.getAttribute("data-src");
        var boyut = (b.getAttribute("data-boyut") || "").split("x");
        if (boyut.length === 2) { ana.width = +boyut[0]; ana.height = +boyut[1]; }
        ana.src = b.getAttribute("data-src");
        ana.alt = b.getAttribute("data-alt");
        kucukler.forEach(function (x) { x.setAttribute("aria-current", String(x === b)); });
      });
    });
  }

  /* ---- 5. Instagram ve Facebook'un uygulama içi tarayıcısı ----
     Ziyaretçilerin çoğu Instagram'dan gelir; o tarayıcıda dosya indirme çalışmayabilir. Yalnızca dosya indirilen
     sayfalarda (a[download]) üstte kısa bir uyarı çıkar; Android'de Chrome'da açma düğmesi de olur.
     Kapatılınca o oturumda bir daha çıkmaz. Ana sayfa ve oyun bu uyarıyla kalabalıklaşmaz. */
  (function () {
    var ua = navigator.userAgent || "";
    var instagram = /Instagram/i.test(ua);
    if (!instagram && !/FBAN|FBAV/i.test(ua)) return;
    if (!document.querySelector("a[download]")) return;
    var ANAHTAR = "celcini-uygulama-ici";
    try { if (sessionStorage.getItem(ANAHTAR) === "kapandi") return; } catch (e) { /* depolama kapalı: uyarı yine çıkar */ }
    var serit = document.createElement("div");
    serit.className = "uygulama-ici";
    serit.setAttribute("role", "note");
    var kap = document.createElement("div");
    kap.className = "kap";
    var yazi = document.createElement("p");
    yazi.textContent = (instagram ? "Instagram'ın" : "Facebook'un") + " içindesiniz; dosya indirme burada çalışmayabilir. " +
      "Menüden sayfayı tarayıcıda açın.";
    kap.appendChild(yazi);
    if (/Android/i.test(ua)) {
      var chrome = document.createElement("a");
      chrome.className = "dugme-cizgi";
      chrome.href = "intent://" + location.host + location.pathname + location.search +
        "#Intent;scheme=https;package=com.android.chrome;end";
      chrome.textContent = "Chrome'da aç";
      kap.appendChild(chrome);
    }
    var kapat = document.createElement("button");
    kapat.type = "button";
    kapat.className = "dugme-cizgi";
    kapat.textContent = "Kapat";
    kapat.addEventListener("click", function () {
      if (serit.parentNode) serit.parentNode.removeChild(serit);
      try { sessionStorage.setItem(ANAHTAR, "kapandi"); } catch (e) { /* depolama kapalı */ }
    });
    kap.appendChild(kapat);
    serit.appendChild(kap);
    var icerik = document.getElementById("icerik");
    if (icerik && icerik.parentNode) icerik.parentNode.insertBefore(serit, icerik);
  })();
})();
