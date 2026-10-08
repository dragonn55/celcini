/* Araç şablonu — mantığı buraya yazın.
   Yapay zekâ çağrısı için Vercel Serverless Function (api/uzay/<arac-adi>.js) kullanın;
   API anahtarını asla tarayıcıya koymayın. */
(function () {
  "use strict";
  var input = document.getElementById("tool-input");
  var run = document.getElementById("tool-run");
  var status = document.getElementById("tool-status");
  var output = document.getElementById("tool-output");

  run.addEventListener("click", async function () {
    var text = input.value.trim();
    if (!text) { status.textContent = "Lütfen bir girdi yazın."; return; }
    status.textContent = "Çalışıyor…";
    run.disabled = true;
    output.hidden = true;
    try {
      // Örnek: sunucu tarafı fonksiyona POST
      // var res = await fetch("/api/uzay/ARAC-ADI", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ text: text })
      // });
      // var data = await res.json();
      // output.textContent = data.result;

      output.textContent = "Şablon çıktısı: " + text; // yer tutucu
      output.hidden = false;
      status.textContent = "";
    } catch (err) {
      status.textContent = "Bir hata oluştu. Lütfen tekrar deneyin.";
    } finally {
      run.disabled = false;
    }
  });
})();
