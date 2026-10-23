/* Uzay aracı şablonu: mantığı buraya yazın.
   Yapay zeka çağrısı için Vercel fonksiyonu (api/<arac-adi>.js) kullanın; API anahtarı tarayıcıya girmez.
   Kullanıcı verisi işlem sonrası saklanmaz. */
(function () {
  "use strict";
  var girdi = document.getElementById("arac-girdi");
  var calistir = document.getElementById("arac-calistir");
  var durum = document.getElementById("arac-durum");
  var cikti = document.getElementById("arac-cikti");
  if (!girdi || !calistir) return;

  calistir.addEventListener("click", function () {
    var metin = girdi.value.trim();
    if (!metin) { durum.textContent = "Önce bir girdi yazın."; return; }
    durum.textContent = "Çalışıyor…";
    calistir.disabled = true;
    cikti.hidden = true;
    /* Örnek sunucu çağrısı:
       fetch("/api/ARAC-ADI", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metin: metin }) })
         .then(function (r) { return r.json(); })
         .then(function (veri) { cikti.textContent = veri.sonuc; }) */
    cikti.textContent = "Şablon çıktısı: " + metin; /* yer tutucu */
    cikti.hidden = false;
    durum.textContent = "";
    calistir.disabled = false;
  });
})();
