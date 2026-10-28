/* Mülakat Testi testi: herkese açık veride kilitli alan yok mu, şık uzunluğu dengesi, karar eşikleri, cevap profili,
   kırmızı bayrağın kararı aşağı çekmesi, duraksama, süre yazımı ve rapor metni (kilitli ve kilitsiz).
   Çalıştırma: node scripts/mulakat-test.mjs (npm run check içinde de çalışır; önce python3 scripts/derle.py) */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { degerlendir, raporCumleleri, raporMetni, kararVer, sureYazi, yorumTemiz } from "../assets/js/mulakat/motor.js";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let hatalar = 0;
const dogrula = (kosul, mesaj) => { if (!kosul) { hatalar += 1; console.error(`✗ ${mesaj}`); } };

const kaynak = JSON.parse(fs.readFileSync(path.join(KOK, "data/mulakat.json"), "utf8"));
const acikYol = path.join(KOK, "mulakat/veri/test.json");
if (!fs.existsSync(acikYol)) {
  console.error("✗ mulakat/veri/test.json yok (python3 scripts/derle.py)");
  process.exit(1);
}
const veri = JSON.parse(fs.readFileSync(acikYol, "utf8"));
const n = veri.sorular.length;

/* Herkese açık veri: kaynakla aynı sorular, kilitli alan yok */
dogrula(n === 30 && n === kaynak.sorular.length, `30 soru olmalı (açık ${n}, kaynak ${kaynak.sorular.length})`);
for (const q of veri.sorular) {
  dogrula(!("olcer" in q) && !("ornek" in q) && !("not" in q), `S${q.no}: kilitli alan herkese açık veride`);
  dogrula(q.secenekler.length === 4 && q.secenekler.every((s) => !("yorum" in s)), `S${q.no}: şık yorumu herkese açık veride`);
}

/* Şık uzunluğu: güçlü cevap çoğu soruda en uzun şık olmasın ("en uzununu seç" taktiği işe yaramasın) */
const enUzun = kaynak.sorular.filter((q) => {
  const g = q.secenekler.find((s) => s.tarz === "G").metin.length;
  return q.secenekler.every((s) => s.tarz === "G" || s.metin.length < g);
}).length;
dogrula(enUzun <= 10, `güçlü cevap ${enUzun} soruda en uzun şık (en fazla 10 olmalı)`);

/* Senaryolar */
const cevapla = (f, ms = () => 5000) => veri.sorular.map((q, i) => ({ k: f(q, i), ms: ms(i) }));
const guclu = (q) => q.secenekler.findIndex((s) => s.tarz === "G");
const tarzla = (t) => (q) => { const j = q.secenekler.findIndex((s) => s.tarz === t); return j >= 0 ? j : guclu(q); };
const enKotu = (q) => q.secenekler.reduce((mi, s, j) => (s.puan < q.secenekler[mi].puan ? j : mi), 0);

let d = degerlendir(veri, cevapla(guclu));
dogrula(d.puan === 100 && d.karar === "teklif" && d.profil === "G" && !d.eksik.length && !d.kirmizi.length, "hepsi güçlü: TEKLİF, 100 puan, Hazırlıklı Aday");
dogrula(raporCumleleri(veri, d).talimatlar.length === 3, "hepsi güçlü: üç talimat");
d = degerlendir(veri, cevapla(enKotu));
dogrula(d.karar === "olumsuz" && d.kirmizi.length > 0, "hepsi en kötü: OLUMSUZ");
for (const t of ["E", "F", "C", "A"]) {
  d = degerlendir(veri, cevapla(tarzla(t)));
  dogrula(d.profil === t, `yalnız ${t} tarzı: profil ${t} olmalı (çıkan ${d.profil})`);
}
const kirmiziSoru = veri.sorular.findIndex((q) => q.secenekler.some((s) => s.puan === 0));
d = degerlendir(veri, cevapla((q, i) => (i === kirmiziSoru ? q.secenekler.findIndex((s) => s.puan === 0) : guclu(q))));
dogrula(d.karar === "ikinci" && d.puanKarari === "teklif" && d.kirmizi.length === 1, "tek kırmızı bayrak: İKİNCİ GÖRÜŞME (puan teklif için yeterli)");
const c = raporCumleleri(veri, d);
dogrula(c.kisitCumle.includes("kırmızı bayrak kararı aşağı çekti") && c.talimatlar.length === 3, "tek kırmızı bayrak: kısıt cümlesi ve üç talimat");
dogrula(kararVer(85, 0) === "teklif" && kararVer(85, 1) === "ikinci" && kararVer(70, 2) === "bekleme"
  && kararVer(49, 0) === "olumsuz" && kararVer(90, 4) === "olumsuz", "karar eşikleri");

/* Duraksama: en az 8 sn ve ortancanın 1,6 katı, en uzun önce */
d = degerlendir(veri, cevapla(guclu, (i) => (i === 3 ? 25000 : i === 11 ? 19000 : 6000)));
dogrula(d.tereddut.length === 2 && d.tereddut[0] === 3 && d.tereddut[1] === 11, "duraksama: en uzun iki soru, sırayla");
dogrula(sureYazi(212000) === "3 dk 32 sn" && sureYazi(9000) === "9 sn", "süre yazımı");

/* Rapor metni: kilitsizken örnek cevap ve yorum yok, kilit notu var; kilit açıkken ikisi de var */
const cev = cevapla((q, i) => (i === 0 ? q.secenekler.findIndex((s) => s.tarz === "E") : guclu(q)));
d = degerlendir(veri, cev);
const ek = { dosyaNo: "CLC-1234", tarih: "28.10.2026", adres: "https://celcini.vercel.app/mulakat/" };
const yorum0 = yorumTemiz(kaynak.sorular[0].secenekler[cev[0].k].yorum);
const kilitsiz = raporMetni(veri, d, cev, ek, null);
dogrula(!kilitsiz.includes(kaynak.sorular[0].ornek) && !kilitsiz.includes(yorum0) && kilitsiz.includes("erişim koduyla açılır"),
  "kilitsiz rapor metninde örnek cevap ve yorum olmamalı, kilit notu olmalı");
const kilitliYol = path.join(KOK, "api/_mulakat/kilitli.json");
if (fs.existsSync(kilitliYol)) {
  const kilitli = JSON.parse(fs.readFileSync(kilitliYol, "utf8"));
  dogrula(kilitli.sorular.length === n && kilitli.sorular.every((x, i) => x.no === i + 1 && x.yorumlar.length === 4 && x.ornek && x.olcer),
    "kilitli dosya: 30 soru, her birinde örnek cevap, ölçer ve 4 yorum");
  const tam = raporMetni(veri, d, cev, ek, kilitli);
  dogrula(tam.includes(kaynak.sorular[0].ornek) && tam.includes(yorum0) && !tam.includes("erişim koduyla açılır"),
    "kilit açıkken rapor metninde örnek cevap ve Ajan GM yorumu olmalı");
} else {
  console.log("• api/_mulakat/kilitli.json yok (önizleme ya da derlenmemiş); kilitli rapor testi atlandı.");
}

/* Rastgele cevaplayan teklif almamalı */
let teklif = 0;
for (let r = 0; r < 2000; r++) if (degerlendir(veri, cevapla(() => Math.floor(Math.random() * 4))).karar === "teklif") teklif++;
dogrula(teklif === 0, `rastgele cevaplayan ${teklif} kez teklif aldı`);

if (hatalar) {
  console.error(`\n✗ mulakat-test: ${hatalar} hata`);
  process.exit(1);
}
console.log(`✓ mulakat-test: ${n} soru, veri ayrımı, karar, profil, duraksama ve rapor metni geçti.`);
