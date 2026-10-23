/* Kilit ekranı: 1. gün ücretsiz, sonraki günler erişim koduyla açılır.
   Kod /api/erisim-kodu/ ile doğrulanır; sunucuda saklanmaz. Açılan kilit bu tarayıcıda kalır.
   Shopier bağlantısı assets/js/config.js'ten (window.CELCINI_LINKS.shopier_magaza) okunur; boşsa düğme gizlenir. */
import { AYARLAR } from "../ayarlar.js";
import { gunAdi } from "../bicim.js";
import { h, ikon } from "./dom.js";
import { ajanGmGorseli, hitapla } from "./karne.js";

const SATISTA_DEGIL = "Erişim kodları henüz satışta değil.";

async function istek(yontem, govde) {
  const yanit = await fetch("/api/erisim-kodu/", {
    method: yontem,
    headers: govde ? { "Content-Type": "application/json" } : undefined,
    body: govde ? JSON.stringify(govde) : undefined,
  });
  if (!yanit.ok) throw new Error(String(yanit.status));
  return yanit.json();
}

/* secenek: { metin, f } — kilit açılmadan geri dönüş (günü baştan oynamak ya da baştan başlamak) */
export function kilitEkrani({ gun, hitap, ac, secenek, karneyeDon }) {
  const shopier = (window.CELCINI_LINKS && window.CELCINI_LINKS.shopier_magaza) || "";
  const son = AYARLAR.GUNLER.length;
  const girdi = h("input", {
    id: "fk-kod", type: "text", maxlength: "40", autocomplete: "off", autocapitalize: "characters", spellcheck: "false",
    placeholder: "Örnek: ABCD-EFGH-JKLM", "aria-describedby": "fk-kod-durum",
  });
  const durum = h("p", { sinif: "fk-kod-durum", id: "fk-kod-durum", role: "status" });
  const dugme = h("button", { sinif: "dugme", type: "submit" }, ikon("kilit"), "Kilidi aç");
  const yaz = (metin, tur = "") => {
    durum.textContent = metin;
    durum.className = `fk-kod-durum${tur ? ` fk-not-${tur} fk-not` : ""}`;
  };

  async function gonder(e) {
    e.preventDefault();
    const kod = girdi.value.trim();
    if (!kod) { yaz("Erişim kodunu yazın.", "dikkat"); girdi.focus(); return; }
    dugme.disabled = true;
    yaz("Kod doğrulanıyor…");
    try {
      const sonuc = await istek("POST", { kod });
      if (!sonuc.satista) yaz(SATISTA_DEGIL, "dikkat");
      else if (sonuc.gecerli) { yaz("Kod doğrulandı. Fabrika açılıyor…"); ac(kod); return; }
      else { yaz("Kod geçersiz. Harfleri ve rakamları kontrol edip yeniden deneyin.", "acil"); girdi.select(); }
    } catch {
      yaz("Kod şu an doğrulanamadı. Bağlantınızı kontrol edip yeniden deneyin.", "dikkat");
    }
    dugme.disabled = false;
  }

  /* Kodlar satışta değilse ekran baştan söyler */
  istek("GET").then((s) => { if (s && s.satista === false) yaz(SATISTA_DEGIL, "dikkat"); }).catch(() => {});

  return h("div", { sinif: "kap fk-giris fk-kilit" },
    h("div", { sinif: "kart fk-giris-kart" },
      h("p", { sinif: "ust-yazi fk-fabrika-satir" }, ikon("kilit"), `${gunAdi(gun)} kilitli`),
      h("h1", { tabindex: "-1", id: "fk-kilit-baslik", metin: `${AYARLAR.UCRETSIZ_GUN + 1}–${son}. günler erişim koduyla açılır` }),
      h("div", { sinif: "fk-gm-satir" }, ajanGmGorseli("fk-gm"),
        h("p", { metin: hitapla(`Ajan GM: {hitap}, ${AYARLAR.UCRETSIZ_GUN}. gün ücretsizdi. Sonraki günlerde siparişler gece değişir, olaylar sıklaşır. Devam etmek için erişim kodunuzu girin.`, hitap) })),
      h("form", { sinif: "fk-giris-form", on: { submit: gonder } },
        h("label", { for: "fk-kod", metin: "Erişim kodu" }),
        girdi,
        durum,
        h("div", { sinif: "fk-satir" }, dugme,
          shopier ? h("a", { sinif: "dugme-cizgi", href: shopier, target: "_blank", rel: "noopener" }, "Kodu Shopier'den al") : null)),
      h("p", { sinif: "fk-soluk" }, "Kod doğrulama için sunucuya gönderilir; sunucuda saklanmaz. İlerlemeniz, açılan kilit ve kodunuz yalnızca bu tarayıcıda tutulur. ",
        h("a", { href: "/gizlilik/", metin: "Gizlilik ve KVKK" })),
      h("div", { sinif: "fk-satir" },
        karneyeDon ? h("button", { sinif: "dugme-cizgi", type: "button", on: { click: karneyeDon } }, ikon("geri"), "Karneye dön") : null,
        h("button", { sinif: "dugme-cizgi", type: "button", on: { click: secenek.f } }, ikon("dongu"), secenek.metin))));
}
