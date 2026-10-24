/* api/ işlevlerinin testi: erişim kodu doğrulama, rehberli dersler (api/ders.js) ve Ajan GM (yapay zeka modu).
   Ağa çıkmaz: Claude API çağrısı sahte fetch ile taklit edilir; anahtar ve kodlar test değerleridir.
   Çalıştırma: node scripts/api-test.mjs (npm run check içinde de çalışır) */
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { yeniOyun, uygula } from "../fabricakit/js/motor/oyun.js";
import { yapayZekaAcik, gmYorumuIste, soruyuHazirla } from "../fabricakit/js/ajan-gm/kaynak.js";

const require = createRequire(import.meta.url);
const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ortak = require("../api/_ortak.js");
const erisimKodu = require("../api/erisim-kodu.js");
const dersApi = require("../api/ders.js");
const ajanGm = require("../api/ajan-gm.js");

let hatalar = 0;
const dogrula = (kosul, mesaj) => { if (!kosul) { hatalar += 1; console.error(`✗ ${mesaj}`); } };

/* Vercel req/res taklidi */
async function cagir(handler, method, body) {
  const res = { statusCode: 200, basliklar: {}, govde: undefined };
  res.setHeader = (k, v) => { res.basliklar[k.toLowerCase()] = v; };
  res.status = (k) => { res.statusCode = k; return res; };
  res.json = (v) => { res.govde = v; return res; };
  await handler({ method, body, headers: {} }, res);
  return res;
}

/* Sahte fetch: Claude API isteklerini kaydeder, sıradaki yanıtı döndürür */
const cagrilar = [];
let siradaki = () => { throw new Error("beklenmeyen ağ isteği"); };
globalThis.fetch = async (url, init = {}) => {
  cagrilar.push({ url: String(url), govde: init.body ? JSON.parse(init.body) : null });
  return siradaki();
};
const mesaj = (metin, stop = "end_turn") => () => new Response(JSON.stringify({
  id: "msg_test", type: "message", role: "assistant", model: "claude-haiku-5-5",
  content: [{ type: "thinking", thinking: "", signature: "test" }, { type: "text", text: metin }],
  stop_reason: stop, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 },
}), { status: 200, headers: { "content-type": "application/json" } });

/* Gerçek bir karne: motor 1. günü baştan sona oynar ("Günü bitir" duraklarında karar verilir) */
const durum = yeniOyun();
for (let r = uygula(durum, { tip: "GUNU_BITIR" }), i = 0; r.durak && i < 20; i++) {
  uygula(durum, { tip: "KARAR", id: r.durak.id, secim: "yeniden-isle" });
  r = uygula(durum, { tip: "GUNU_BITIR" });
}
const karne = durum.karne;
dogrula(karne && durum.evre === "gun-sonu", "motor karne üretmedi");

const TEST_KOD = "TEST-KOD-0001";
const env = (ad, deger) => { if (deger === undefined) delete process.env[ad]; else process.env[ad] = deger; };

/* ---------- erişim kodu ---------- */
dogrula(ortak.normalKod("test-kod 0001") === ortak.normalKod(TEST_KOD), "normalleştirme büyük-küçük harf ve tireyi yok saymalı");
env("ERISIM_KOD_HASHLERI", undefined);
dogrula(!ortak.kodGecerli(TEST_KOD), "liste yokken kod geçersiz olmalı");
let r = await cagir(erisimKodu, "GET");
dogrula(r.govde && r.govde.satista === false, "liste yokken satista: false olmalı");
dogrula(r.basliklar["cache-control"] === "no-store", "erişim kodu yanıtı önbelleğe alınmamalı");
r = await cagir(erisimKodu, "POST", { kod: TEST_KOD });
dogrula(r.govde && r.govde.satista === false && r.govde.gecerli === false, "liste yokken POST satista: false döndürmeli");

env("ERISIM_KOD_HASHLERI", ` ${ortak.kodHash(TEST_KOD).toUpperCase()} , bozuk-deger,${ortak.kodHash("BASKA-KOD-0002")}`);
dogrula(ortak.hashListesi().length === 2, "geçersiz hash girdileri ayıklanmalı");
dogrula(ortak.kodGecerli("test kod 0001"), "listedeki kod geçerli olmalı");
dogrula(!ortak.kodGecerli("TEST-KOD-0003"), "listede olmayan kod geçersiz olmalı");
dogrula(!ortak.kodGecerli("AB1"), "çok kısa kod geçersiz olmalı");
r = await cagir(erisimKodu, "GET");
dogrula(r.govde.satista === true, "liste varken satista: true olmalı");
r = await cagir(erisimKodu, "POST", JSON.stringify({ kod: TEST_KOD }));
dogrula(r.govde.gecerli === true, "metin gövdeli POST doğru kodu kabul etmeli");
r = await cagir(erisimKodu, "POST", { kod: "YANLIS-KOD-99" });
dogrula(r.govde.gecerli === false && r.statusCode === 200, "yanlış kod reddedilmeli");
r = await cagir(erisimKodu, "PUT");
dogrula(r.statusCode === 405, "GET/POST dışı istek 405 almalı");

/* ---------- Rehberli dersler (api/ders.js): ürüne özel kod listesi, kilitli ders içeriği ---------- */
const dersCagir = async (method, { query, body } = {}) => {
  const res = { statusCode: 200, basliklar: {}, govde: undefined };
  res.setHeader = (k, v) => { res.basliklar[k.toLowerCase()] = v; };
  res.status = (k) => { res.statusCode = k; return res; };
  res.json = (v) => { res.govde = v; return res; };
  await dersApi({ method, query, body, headers: {} }, res);
  return res;
};
const DERS_KOD = "DERS-KOD-0001";
const kilitliDers = JSON.parse(fs.readFileSync(path.join(KOK, "data/datakit/dersler.json"), "utf8")).dersler.find((d) => !d.ucretsiz);
const acikDers = JSON.parse(fs.readFileSync(path.join(KOK, "data/datakit/dersler.json"), "utf8")).dersler.find((d) => d.ucretsiz);
env("DATAKIT_KOD_HASHLERI", undefined);
r = await dersCagir("GET", { query: { urun: "datakit" } });
dogrula(r.govde.satista === false && r.basliklar["cache-control"] === "no-store", "ders: liste yokken satista: false ve no-store");
r = await dersCagir("GET", { query: {} });
dogrula(r.statusCode === 400, "ders: ürün yoksa 400");
r = await dersCagir("GET", { query: { urun: "toString" } });
dogrula(r.statusCode === 400, "ders: bilinmeyen ürün 400");
r = await dersCagir("POST", { body: { urun: "datakit", id: kilitliDers.id, kod: DERS_KOD } });
dogrula(r.govde.satista === false && r.govde.gecerli === false && !r.govde.ders, "ders: liste yokken içerik verilmemeli");
env("DATAKIT_KOD_HASHLERI", ortak.kodHash(DERS_KOD));
r = await dersCagir("GET", { query: { urun: "datakit" } });
dogrula(r.govde.satista === true, "ders: liste varken satista: true");
r = await dersCagir("POST", { body: { urun: "datakit", id: kilitliDers.id, kod: TEST_KOD } });
dogrula(r.govde.gecerli === false && !r.govde.ders, "ders: Fabricakit kodu Datakit dersini açmamalı");
r = await dersCagir("POST", { body: { urun: "datakit", id: kilitliDers.id, kod: "YANLIS-KOD-99" } });
dogrula(r.govde.gecerli === false && !r.govde.ders, "ders: yanlış kod reddedilmeli");
r = await dersCagir("POST", { body: JSON.stringify({ urun: "datakit", id: kilitliDers.id, kod: "ders kod 0001" }) });
dogrula(r.govde.gecerli === true && r.govde.ders && r.govde.ders.id === kilitliDers.id && r.govde.ders.notlar.length === kilitliDers.notlar.length && r.govde.ders.sayfa,
  "ders: doğru kodla kilitli dersin notları ve sayfası gelmeli");
r = await dersCagir("POST", { body: { urun: "datakit", id: "../../vercel", kod: DERS_KOD } });
dogrula(r.statusCode === 404 && !r.govde.ders, "ders: geçersiz kimlik 404");
r = await dersCagir("POST", { body: { urun: "datakit", id: acikDers.id, kod: DERS_KOD } });
dogrula(r.statusCode === 404, "ders: ücretsiz ders api/_dersler'de olmamalı (herkese açık klasörde)");
r = await dersCagir("PUT");
dogrula(r.statusCode === 405, "ders: GET/POST dışı istek 405");
dogrula(!ortak.kodGecerli(DERS_KOD), "Datakit kodu Fabricakit listesinde geçmemeli");
env("DATAKIT_KOD_HASHLERI", undefined);

/* ---------- Ajan GM: varsayılan ayar "kural" ---------- */
env("ANTHROPIC_API_KEY", "test-anahtar");
r = await cagir(ajanGm, "POST", { tur: "yorum", karne, kod: TEST_KOD });
dogrula(r.govde.kaynak === "kural" && !cagrilar.length, "AJAN_GM_KAYNAK \"kural\"ken sağlayıcıya istek gitmemeli");
r = await cagir(ajanGm, "GET");
dogrula(r.statusCode === 405, "Ajan GM yalnızca POST kabul etmeli");
dogrula(!yapayZekaAcik({ acik: true, kod: TEST_KOD }), "tarayıcıda kural modu varsayılan olmalı");
dogrula(await gmYorumuIste(karne, { acik: true, kod: TEST_KOD }) === null && !cagrilar.length, "tarayıcı kural modunda sunucuya istek atmamalı");
dogrula(soruyuHazirla("sayın yönetici olarak bütçeyi nerede aştım?", "Sayın Yönetici") === "{hitap} olarak bütçeyi nerede aştım?", "hitap sorudan ayıklanmalı");

/* ---------- Ajan GM: yapay zeka modu (ayarlar geçici klasörden) ---------- */
let sdkVar = true;
try { require.resolve("@anthropic-ai/sdk"); } catch { sdkVar = false; }
const gecici = fs.mkdtempSync(path.join(os.tmpdir(), "fk-api-"));
const ayarYaz = (kaynak, kime, odalar = (s) => s) => {
  fs.mkdirSync(path.join(gecici, "fabricakit/js"), { recursive: true });
  const ayar = fs.readFileSync(path.join(KOK, "fabricakit/js/ayarlar.js"), "utf8")
    .replace(/AJAN_GM_KAYNAK: "[^"]*"/, `AJAN_GM_KAYNAK: "${kaynak}"`)
    .replace(/AJAN_GM_YAPAY_ZEKA_KIME: "[^"]*"/, `AJAN_GM_YAPAY_ZEKA_KIME: "${kime}"`);
  fs.writeFileSync(path.join(gecici, "fabricakit/js/ayarlar.js"), ayar);
  fs.writeFileSync(path.join(gecici, "fabricakit/js/odalar.js"), odalar(fs.readFileSync(path.join(KOK, "fabricakit/js/odalar.js"), "utf8")));
};
const uyari = console.warn;
console.warn = () => {};
process.chdir(gecici);
try {
  ayarYaz("yapay-zeka", "kodlu");
  env("ANTHROPIC_API_KEY", undefined);
  r = await cagir(ajanGm, "POST", { tur: "yorum", karne, kod: TEST_KOD });
  dogrula(r.govde.kaynak === "kural" && !cagrilar.length, "anahtar yokken kural moduna düşmeli");
  env("ANTHROPIC_API_KEY", "test-anahtar");
  r = await cagir(ajanGm, "POST", { tur: "yorum", karne });
  dogrula(r.govde.kaynak === "kural" && !cagrilar.length, "\"kodlu\" modda kodsuz istek kurala düşmeli");
  r = await cagir(ajanGm, "POST", { tur: "yorum", karne, kod: "YANLIS-KOD-99" });
  dogrula(r.govde.kaynak === "kural" && !cagrilar.length, "\"kodlu\" modda yanlış kod kurala düşmeli");
  r = await cagir(ajanGm, "POST", { tur: "yorum", karne: { gun: "bir" }, kod: TEST_KOD });
  dogrula(r.govde.kaynak === "kural" && !cagrilar.length, "bozuk karne kurala düşmeli");

  if (sdkVar) {
    siradaki = mesaj("{hitap}, bugün Dünya'da plan geç kaldı. Yarın için talimatım: saat 09:00 olmadan Dünya'da planı güncelleyin.");
    r = await cagir(ajanGm, "POST", { tur: "yorum", karne, kod: TEST_KOD });
    dogrula(r.govde.kaynak === "yapay-zeka" && r.govde.metin.startsWith("{hitap}, "), "geçerli yanıt yapay zeka yorumu olarak dönmeli");
    const istek = cagrilar[cagrilar.length - 1];
    dogrula(istek && /api\.anthropic\.com\/v1\/messages/.test(istek.url), "istek Claude Messages API'ye gitmeli");
    const g = istek ? istek.govde : {};
    dogrula(g.model === "claude-haiku-5-5" && g.max_tokens === 1024, "varsayılan model ve token sınırı");
    dogrula(g.output_config && g.output_config.effort === "low" && !("temperature" in g) && !("thinking" in g), "effort low; sampling ve thinking parametresi yok");
    dogrula(/Merkür = Satış-Pazarlama/.test(g.system) && /Plüton = Satın Alma/.test(g.system), "sistem metni kod adlarını vermeli");
    const icerik = JSON.stringify(g.messages);
    dogrula(icerik.includes("zamanindaTeslim") && !icerik.includes(TEST_KOD) && !icerik.includes("malzemeAdi"), "sağlayıcıya yalnızca seçili karne verisi gitmeli (kod gitmemeli)");

    env("AJAN_GM_MODEL", "claude-test-model");
    siradaki = mesaj("{hitap}, kısa. Yarın için talimatım: onayları ilk saatte alın.");
    await cagir(ajanGm, "POST", { tur: "yorum", karne, kod: TEST_KOD });
    dogrula(cagrilar[cagrilar.length - 1].govde.model === "claude-test-model", "AJAN_GM_MODEL ortam değişkeni kullanılmalı");
    env("AJAN_GM_MODEL", undefined);

    siradaki = mesaj("Bugün iyi geçti.");
    r = await cagir(ajanGm, "POST", { tur: "yorum", karne, kod: TEST_KOD });
    dogrula(r.govde.kaynak === "kural", "talimatsız yorum kurala düşmeli");
    siradaki = mesaj("{hitap}, yanıt veremem.", "refusal");
    r = await cagir(ajanGm, "POST", { tur: "yorum", karne, kod: TEST_KOD });
    dogrula(r.govde.kaynak === "kural", "refusal kurala düşmeli");
    siradaki = mesaj("{hitap}, yarım", "max_tokens");
    r = await cagir(ajanGm, "POST", { tur: "yorum", karne, kod: TEST_KOD });
    dogrula(r.govde.kaynak === "kural", "max_tokens kurala düşmeli");
    siradaki = () => { throw new TypeError("ağ yok"); };
    r = await cagir(ajanGm, "POST", { tur: "yorum", karne, kod: TEST_KOD });
    dogrula(r.govde.kaynak === "kural", "ağ hatası kurala düşmeli");
    siradaki = () => new Response(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "x" } }), { status: 401, headers: { "content-type": "application/json" } });
    r = await cagir(ajanGm, "POST", { tur: "yorum", karne, kod: TEST_KOD });
    dogrula(r.govde.kaynak === "kural", "API hatası kurala düşmeli");

    siradaki = mesaj("Bütçeyi **Plüton** tarafında aştınız.");
    r = await cagir(ajanGm, "POST", { tur: "soru", karne, soru: "{hitap} olarak bütçeyi nerede aştım?", kod: TEST_KOD });
    dogrula(r.govde.kaynak === "yapay-zeka" && r.govde.metin === "{hitap}, bütçeyi Plüton tarafında aştınız.", `soru yanıtı hitapla başlamalı ve biçim işaretleri temizlenmeli: ${r.govde.metin}`);
    dogrula(cagrilar[cagrilar.length - 1].govde.messages[0].content.includes("Oyuncunun sorusu: {hitap} olarak"), "soru sağlayıcıya gitmeli");
    const once = cagrilar.length;
    r = await cagir(ajanGm, "POST", { tur: "soru", karne, soru: "   ", kod: TEST_KOD });
    dogrula(r.govde.kaynak === "kural" && cagrilar.length === once, "boş soru kurala düşmeli");

    ayarYaz("yapay-zeka", "herkes", (s) => s.replace('kod: "Dünya"', 'kod: ""'));
    siradaki = mesaj("{hitap}, tamam. Yarın için talimatım: planı 10:00'dan önce bitirin.");
    r = await cagir(ajanGm, "POST", { tur: "yorum", karne });
    dogrula(r.govde.kaynak === "yapay-zeka", "\"herkes\" modda kod gerekmemeli");
    const sistem = cagrilar[cagrilar.length - 1].govde.system;
    dogrula(sistem.includes("; Planlama;") && !sistem.includes("Dünya"), "kod adı boş oda gerçek adıyla anılmalı");
  } else {
    console.log("• @anthropic-ai/sdk kurulu değil (npm install); yapay zeka yanıt testleri atlandı.");
  }
} finally {
  process.chdir(KOK);
  console.warn = uyari;
  fs.rmSync(gecici, { recursive: true, force: true });
}

if (hatalar) {
  console.error(`\n✗ api-test: ${hatalar} hata`);
  process.exit(1);
}
console.log(`✓ api-test: erişim kodu, rehberli dersler ve Ajan GM işlevleri${sdkVar ? "" : " (SDK'sız kısım)"} geçti.`);
