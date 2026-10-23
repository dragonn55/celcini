/* Karnedeki Ajan GM bölümü: günün yorumu ve "Ajanı sorgula".
   Kural modunda üç hazır soru şablonlardan yanıtlanır. Yapay zeka modu açıksa yorum sunucudan istenir ve
   serbest soru alanı görünür; yanıt gelmezse sessizce şablonlar kullanılır. */
import { AYARLAR } from "../ayarlar.js";
import { SORULAR, kuralCevap } from "../ajan-gm/yorumlar.js";
import { yapayZekaAcik, gmYorumuIste, gmCevabiIste, soruyuHazirla } from "../ajan-gm/kaynak.js";
import { sayi } from "../bicim.js";
import { h } from "./dom.js";
import { ajanGmGorseli, hitapla } from "./karne.js";
import { sesliOkuDugmesi } from "./ses.js";

const YANITSIZ = "{hitap}, bu soruyu şu an yanıtlayamıyorum. Hazır sorulardan birini seçin.";

/* Aynı karne için yorum bir kez istenir */
const istenen = new WeakSet();

export function gmBolumu({ durum, hitap, erisim, yorumKaydet }) {
  const k = durum.karne;
  const yz = yapayZekaAcik(erisim);
  const yorum = h("p", { sinif: "fk-gm-yorum", id: "fk-gm-yorum", "aria-live": "polite" });
  const soruListesi = h("ol", { sinif: "fk-sorular", "aria-live": "polite" });
  let hak = AYARLAR.AJAN_GM_SORU_HAKKI;

  const yorumGoster = (metin) => {
    yorum.textContent = hitapla(metin, hitap);
    yorum.removeAttribute("aria-busy");
    yorum.classList.remove("fk-bekliyor");
  };
  if (yz && k.gmKaynak !== "yapay-zeka" && !istenen.has(k)) {
    istenen.add(k);
    yorum.textContent = "Ajan GM değerlendiriyor…";
    yorum.setAttribute("aria-busy", "true");
    yorum.classList.add("fk-bekliyor");
    gmYorumuIste(k, erisim).then((metin) => {
      if (metin) yorumKaydet(metin);
      yorumGoster(metin || k.gmYorum);
    });
  } else {
    yorumGoster(k.gmYorum);
  }

  function soruEkle(soru, cevap) {
    const yanit = h("p", { sinif: "fk-cevap" }, h("strong", { metin: "Ajan GM: " }), h("span", { metin: cevap === null ? "Yanıtlıyor…" : hitapla(cevap, hitap) }));
    const satir = h("li", { sinif: "fk-soru" }, h("p", { sinif: "fk-soru-metin" }, h("strong", { metin: "Siz: " }), h("span", { metin: soru })), yanit);
    soruListesi.appendChild(satir);
    return (metin) => { yanit.lastChild.textContent = hitapla(metin, hitap); };
  }

  const hazir = h("div", { sinif: "fk-satir fk-hazir-sorular" }, SORULAR.map((s) => {
    const dugme = h("button", { sinif: "dugme-cizgi fk-kucuk-dugme", type: "button" }, s.metin);
    dugme.addEventListener("click", () => {
      dugme.disabled = true;
      soruEkle(s.metin, kuralCevap(k, s.id));
    });
    return dugme;
  }));

  let serbest = null;
  if (yz) {
    const enFazla = AYARLAR.AJAN_GM_SORU_UZUNLUGU;
    const girdi = h("textarea", { id: "fk-soru", rows: "2", maxlength: String(enFazla), placeholder: "Örnek: Bütçeyi nerede aştım?", "aria-describedby": "fk-soru-not" });
    const sayac = h("span", { sinif: "fk-soluk", metin: `0 / ${enFazla}` });
    const sor = h("button", { sinif: "dugme fk-dugme", type: "submit" }, "Sor");
    const hakEl = h("span", { sinif: "fk-soluk" });
    const hakYaz = () => {
      hakEl.textContent = hak > 0 ? `Bugün ${sayi(hak)} soru hakkınız var.` : "Bugünkü soru hakkınız bitti.";
      sor.disabled = hak <= 0;
      girdi.disabled = hak <= 0;
    };
    girdi.addEventListener("input", () => { sayac.textContent = `${girdi.value.length} / ${enFazla}`; });
    serbest = h("form", { sinif: "fk-serbest-soru", on: { submit: async (e) => {
      e.preventDefault();
      const soru = soruyuHazirla(girdi.value, hitap);
      if (!soru || hak <= 0) return;
      hak -= 1;
      hakYaz();
      sor.disabled = true;
      const yaz = soruEkle(girdi.value.trim().slice(0, enFazla), null);
      girdi.value = "";
      sayac.textContent = `0 / ${enFazla}`;
      yaz((await gmCevabiIste(k, soru, erisim)) || YANITSIZ);
      sor.disabled = hak <= 0;
    } } },
      h("label", { for: "fk-soru", metin: "Kendi sorunuz" }),
      girdi,
      h("div", { sinif: "fk-satir" }, sor, sayac, hakEl),
      h("p", { sinif: "fk-soluk", id: "fk-soru-not", metin: "Sorunuz ve günün karnesi yanıt için yapay zeka sağlayıcısına gönderilir; hitabınız gönderilmez. Celcini bunları saklamaz. Kişisel bilgi yazmayın." }));
    hakYaz();
  }

  /* Sesli oku: günün yorumu, ardından sorulan soruların cevapları */
  const sesli = sesliOkuDugmesi(() => [yorum.textContent, ...[...soruListesi.querySelectorAll(".fk-cevap span")].map((el) => el.textContent)]);

  return h("section", { sinif: "fk-bolum fk-gm-bolum", "aria-labelledby": "fk-gm-baslik" },
    h("div", { sinif: "fk-gm-satir" }, ajanGmGorseli("fk-gm"),
      h("div", { sinif: "fk-gm-govde" },
        h("div", { sinif: "fk-gm-baslik-satir" }, h("h2", { sinif: "fk-bolum-baslik", id: "fk-gm-baslik", metin: "Ajan GM" }), sesli),
        yorum)),
    h("div", { sinif: "fk-sorgula" },
      h("h3", { sinif: "fk-sorgula-baslik", metin: "Ajanı sorgula" }),
      hazir,
      serbest,
      soruListesi));
}
