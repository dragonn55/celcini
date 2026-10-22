/* Celcini · menü, config bağlantıları, raf araması, galeri. Çerçeve yok. */
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

  /* ---- 3. Raf: arama + etiket süzgeci ---- */
  var filtre = document.querySelector("[data-filtre]");
  if (filtre) {
    var kutu = filtre.querySelector("input[type=search]");
    var etiketDugmeleri = filtre.querySelectorAll("[data-etiket]");
    var kartlar = document.querySelectorAll("[data-urun]");
    var sonuc = document.querySelector("[data-sonuc]");
    var secili = "";
    var kucuk = function (s) { return (s || "").toLocaleLowerCase("tr"); };
    var uygula = function () {
      var q = kucuk(kutu.value).trim();
      var n = 0;
      kartlar.forEach(function (k) {
        var metinUyar = !q || kucuk(k.getAttribute("data-ara")).indexOf(q) !== -1;
        var etiketUyar = !secili || ("|" + k.getAttribute("data-etiketler") + "|").indexOf("|" + secili + "|") !== -1;
        var gor = metinUyar && etiketUyar;
        k.hidden = !gor;
        if (gor) n++;
      });
      if (sonuc) sonuc.textContent = n === kartlar.length ? "" : (n ? n + " ürün gösteriliyor." : "Aramanıza uyan ürün yok.");
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
        ana.src = b.getAttribute("data-src");
        ana.alt = b.getAttribute("data-alt");
        kucukler.forEach(function (x) { x.setAttribute("aria-current", String(x === b)); });
      });
    });
  }
})();
