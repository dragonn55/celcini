/* Ajan GM'nin ses dosyası olan sabit cümleleri. Liste koddaki metinlerden kurulur, elle yazılmaz; en fazla 40 cümle.
   Sesli okuma metinde bu parçaları birebir arar: bulduğunu assets/ses/ajan-gm/<id>.mp3'ten (sabit erkek ses) çalar,
   aradaki değişken parçaları (hitap, sayı, ürün adı) cihaz sesiyle okur (arayuz/ses.js).
   Liste değişince: node scripts/ses-cumleler.mjs → data/ses/cumleler.json; sonra sesleri yeniden üretin
   (scripts/ses-piper.py ya da Windows'ta scripts/ses-tolga.ps1). npm run check (scripts/ses-test.mjs) eşleşmeyi denetler. */
import { AYARLAR } from "../ayarlar.js";
import { ACILIS, TALIMAT, TALIMAT_GIRISI } from "./yorumlar.js";

export const SES_KLASORU = "/assets/ses/ajan-gm/";
export const EN_FAZLA_CUMLE = 40;

/* Açılış ekranı; kilit ekranında önce hitap gelir (cihaz sesinde) */
export const GM_SOZU = "Fabrikanın genel müdürüyüm. Gün boyu her kararınızı izlerim; akşam notunuzu veririm. Sabah 08:00'de siparişler gelecek.";
export const KILIT_SOZU = `${AYARLAR.UCRETSIZ_GUN}. gün ücretsizdi. Sonraki günlerde siparişler gece değişir, olaylar sıklaşır. Devam etmek için erişim kodunuzu girin.`;

/* 40 sınırı yüzünden kayda alınmayan talimatlar (cihaz sesinde okunur): bütçe aşımı ve fazla siparişin 2. ve 3. kalıbı.
   Bunlar ancak 2. günden sonra ve o sorun günün en büyüğü olursa seçilir. */
const KAYITSIZ_TALIMAT = new Set(["BUTCE_ASIMI:1", "BUTCE_ASIMI:2", "FAZLA_SIPARIS:1", "FAZLA_SIPARIS:2"]);
const kimlik = (s) => s.toLowerCase().replace(/_/g, "-");

export const CUMLELER = [
  { id: "acilis", metin: GM_SOZU },
  { id: "kilit", metin: KILIT_SOZU },
  ...Object.entries(ACILIS).flatMap(([harf, liste]) => liste.map((f, i) => ({ id: `not-${kimlik(harf)}-${i + 1}`, metin: f.sabit }))),
  { id: "talimat", metin: TALIMAT_GIRISI },
  ...Object.entries(TALIMAT).flatMap(([anahtar, liste]) => liste.flatMap((f, i) => (KAYITSIZ_TALIMAT.has(`${anahtar}:${i}`) ? []
    : [{ id: `talimat-${kimlik(anahtar)}-${i + 1}`, metin: f().slice(TALIMAT_GIRISI.length + 1) }]))),
];

/* Metni sabit parçalara ({ id, metin }) ve aradaki değişken parçalara ({ metin }) böler. Metinde en önce geçen parça
   alınır (aynı yerde uzun olan); okunacak harf ya da rakam içermeyen ara parça (": ", ".") atılır. */
export function parcala(metin) {
  const sonuc = [];
  let kalan = String(metin || "");
  const ekle = (m) => { if (/[\p{L}\p{N}]/u.test(m)) sonuc.push({ metin: m.trim() }); };
  while (kalan) {
    let ilk = null;
    for (const c of CUMLELER) {
      const i = kalan.indexOf(c.metin);
      if (i >= 0 && (!ilk || i < ilk.i || (i === ilk.i && c.metin.length > ilk.c.metin.length))) ilk = { i, c };
    }
    if (!ilk) { ekle(kalan); break; }
    ekle(kalan.slice(0, ilk.i));
    sonuc.push({ id: ilk.c.id, metin: ilk.c.metin });
    kalan = kalan.slice(ilk.i + ilk.c.metin.length);
  }
  return sonuc;
}
