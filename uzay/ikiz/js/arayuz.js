/* Fabrika İkizi · ARAYÜZ — giriş modülü. Sayfa iskeleti scripts/derle.py'de (ikiz_sayfasi), stiller uzay/ikiz/css/ikiz.css.
   Veri uzay/ikiz/js/veri.js (Fabrika Motoru'nun örnek, kurgusal tesisi), model hesap.js, 3D sahne sahne.js.
   Telefonda kontroller alttan açılan çekmecede (Fabricakit görev notuyla aynı bileşen), masaüstünde sahnenin yanında.
   Satır içi style yok (CSP): genişlikler el.style ile verilir. Sayfa veri almaz, hiçbir şey göndermez. */
import { VERI } from "./veri.js";
import { hesapla, senaryoVarsayilan, hatIsMerkezleri } from "./hesap.js";
import { Sahne } from "./sahne.js";

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const fmt = (n, d = 0) => (+n).toLocaleString("tr-TR", { maximumFractionDigits: d, minimumFractionDigits: d });
const yuzde = (x, d = 0) => "%" + fmt(x * 100, d);
const GUN_ADI = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"], AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const tarihYaz = iso => { const d = new Date(iso + "T00:00:00"); return `${d.getDate()} ${AY[d.getMonth()]} ${GUN_ADI[d.getDay()]}`; };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const masaustu = matchMedia("(min-width: 960px)");
const G = VERI.gunler.length;

let sen = senaryoVarsayilan(), sonuc = hesapla(VERI, sen), baz = hesapla(VERI, senaryoVarsayilan());
let gun = 1, oynuyor = false, hiz = 1, zamanlayici = null, seciliIm = null, hatSira = 0;
const enCokUretim = Math.max(...baz.gunler.flatMap(g => Object.values(g.hatUretim)));

/* ---------- Sahne ve gün ---------- */
Sahne.kur(VERI);
function gunuUygula() {
  const g = sonuc.gunler[gun - 1];
  Sahne.gunuGoster(g, enCokUretim);
  $("hudGun").textContent = `Gün ${gun} / ${G}`; $("hudTarih").textContent = tarihYaz(g.tarih);
  const uretim = Object.values(g.uretim).reduce((a, b) => a + b, 0), sevk = Object.values(g.sevk).reduce((a, b) => a + b, 0);
  const asim = VERI.is_merkezleri.filter(i => g.oran[i.kod] > 1).length, enY = Math.max(...Object.values(g.oran).filter(isFinite), 0);
  $("sUretim").textContent = fmt(uretim); $("sSevk").textContent = fmt(sevk); $("sAsim").textContent = String(asim);
  $("sYuk").textContent = yuzde(enY); $("sYuk").classList.toggle("ikiz-kirmizi", enY > 1); $("sYuk").classList.toggle("ikiz-turuncu", enY > 0.85 && enY <= 1);
  $("inGun").value = String(gun);
  if (!oynuyor) $("btnOynat").textContent = gun >= G ? "Baştan oynat" : "Oynat";
  document.querySelectorAll("#gunCubuk .ikiz-bar").forEach(b => b.classList.toggle("secili", +b.dataset.gun === gun));
  gunTablosu(); imDetay();
}
function gunGit(n, kamyon = false) {
  gun = Math.min(G, Math.max(1, n)); gunuUygula();
  if (kamyon && !reduceMotion) { const s = Object.values(sonuc.gunler[gun - 1].sevk).reduce((a, b) => a + b, 0); if (s > 0) Sahne.kamyonCikar(); }
}
function oynat(ac) {
  oynuyor = ac; $("btnOynat").setAttribute("aria-pressed", String(ac)); $("btnOynat").textContent = ac ? "Durdur" : (gun >= G ? "Baştan oynat" : "Oynat");
  clearInterval(zamanlayici); zamanlayici = null;
  if (!ac) return;
  if (gun >= G) gunGit(1);
  zamanlayici = setInterval(() => { if (gun >= G) { oynat(false); return; } gunGit(gun + 1, true); }, 2400 / hiz);
}
$("btnOynat").onclick = () => oynat(!oynuyor);
$("btnOnceki").onclick = () => { oynat(false); gunGit(gun - 1); };
$("btnSonraki").onclick = () => { oynat(false); gunGit(gun + 1, true); };
$("inGun").oninput = () => { oynat(false); gunGit(+$("inGun").value); };
document.querySelectorAll("#hizSec button").forEach(b => b.onclick = () => {
  hiz = +b.dataset.hiz; document.querySelectorAll("#hizSec button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  if (oynuyor) oynat(true);
});
const kameralar = [["camGenel", "genel"], ["camUst", "ust"], ["camHat", "hat"]];
kameralar.forEach(([id, mod]) => $(id).onclick = () => {
  kameralar.forEach(([x]) => $(x).setAttribute("aria-pressed", String(x === id)));
  if (mod === "hat") { const h = VERI.hatlar[hatSira % VERI.hatlar.length]; hatSira += 1; Sahne.kamera("hat:" + h.kod); $("camHat").textContent = h.kod; }
  else { Sahne.kamera(mod); $("camHat").textContent = "Hat"; }
});

/* ---------- 20 günlük çubuk (en yüksek iş merkezi yükü) ---------- */
function gunCubugu() {
  const kap = $("gunCubuk"); kap.textContent = "";
  sonuc.gunler.forEach(g => {
    const enY = Math.max(...Object.values(g.oran).filter(isFinite), 0);
    const b = el("button", "ikiz-bar"); b.type = "button"; b.dataset.gun = String(g.gun);
    b.title = `Gün ${g.gun} · ${tarihYaz(g.tarih)} · en yüksek yük ${yuzde(enY)}`; b.setAttribute("aria-label", b.title);
    const i = el("i"); i.style.height = Math.min(100, enY / 2 * 100) + "%";
    i.className = enY > 1 ? "asim" : enY > 0.85 ? "dolu" : "";
    b.append(i); b.onclick = () => { oynat(false); gunGit(g.gun); };
    kap.append(b);
  });
}

/* ---------- Senaryo ---------- */
function senaryoOku() {
  const s = senaryoVarsayilan();
  s.talep = +$("inTalep").value / 100; s.kapasite = +$("inKapasite").value / 100;
  s.vardiya3 = $("chkVardiya").checked; s.fason = $("chkFason").checked;
  const im = $("inAriza").value;
  if (im) s.ariza = { im, bas: Math.min(+$("inArizaBas").value, +$("inArizaBit").value), bit: Math.max(+$("inArizaBas").value, +$("inArizaBit").value) };
  const hazir = VERI.senaryolar.find(p => Math.abs(p.talep - s.talep) < 1e-9 && Math.abs(p.kapasite - s.kapasite) < 1e-9);
  s.ad = (!s.vardiya3 && !s.fason && !s.ariza && hazir) ? hazir.ad : "Kendi senaryom";
  return s;
}
function senaryoUygula() {
  sen = senaryoOku(); sonuc = hesapla(VERI, sen);
  $("hudSenaryo").textContent = sen.ad; $("cekmeceSayac").textContent = sen.ad;
  $("lblTalep").textContent = (sen.talep >= 0 ? "+" : "−") + yuzde(Math.abs(sen.talep)); $("lblKapasite").textContent = (sen.kapasite >= 0 ? "+" : "−") + yuzde(Math.abs(sen.kapasite));
  document.querySelectorAll("#hazirSenaryo button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ad === sen.ad)));
  gunCubugu(); gunuUygula(); sonucTablosu(); oneriler();
}
document.querySelectorAll("#hazirSenaryo button").forEach(b => b.onclick = () => {
  const p = VERI.senaryolar[+b.dataset.sira];
  $("inTalep").value = String(Math.round(p.talep * 100)); $("inKapasite").value = String(Math.round(p.kapasite * 100));
  $("chkVardiya").checked = false; $("chkFason").checked = false; $("inAriza").value = "";
  senaryoUygula();
});
["inTalep", "inKapasite", "chkVardiya", "chkFason", "inAriza", "inArizaBas", "inArizaBit"].forEach(id => $(id).addEventListener("input", senaryoUygula));
$("btnSifirla").onclick = () => document.querySelector("#hazirSenaryo button").click();
// arıza seçimi: iş merkezleri
const arizaSec = $("inAriza");
VERI.is_merkezleri.forEach(i => { const o = el("option", "", `${i.kod} · ${i.ad}`); o.value = i.kod; arizaSec.append(o); });
[$("inArizaBas"), $("inArizaBit")].forEach((s, k) => { for (let g = 1; g <= G; g++) { const o = el("option", "", `Gün ${g}`); o.value = String(g); if (g === (k ? 4 : 3)) o.selected = true; s.append(o); } });

/* ---------- Gün tablosu ve iş merkezi ayrıntısı ---------- */
function gunTablosu() {
  const g = sonuc.gunler[gun - 1], tb = $("imTablo"); tb.textContent = "";
  VERI.hatlar.forEach(h => {
    const tr = el("tr", "ikiz-hat-satir"); const td = el("td", "", `${h.kod} · ${h.ad}`); td.colSpan = 4; tr.append(td); tb.append(tr);
    hatIsMerkezleri(VERI, h.kod).forEach(i => {
      const o = g.oran[i.kod], kap = g.kap[i.kod];
      const tr = el("tr", "ikiz-im-satir" + (i.kod === seciliIm ? " secili" : "")); tr.dataset.im = i.kod; tr.tabIndex = 0;
      const durum = kap <= 0 ? "Arıza" : o > 1 ? "Aşım" : o > 0.85 ? "Dolu" : o > 0 ? "Normal" : "Boş";
      tr.append(el("td", "", `${i.kod} ${i.ad}`), el("td", "ikiz-sayi", kap > 0 ? yuzde(o) : "—"), el("td", "ikiz-sayi", g.kuyruk[i.kod] ? fmt(g.kuyruk[i.kod]) : "–"),
        el("td", "ikiz-durum " + durum.toLowerCase().replace("ş", "s").replace("ı", "i"), durum));
      tr.onclick = () => imSec(i.kod === seciliIm ? null : i.kod); tr.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tr.click(); } };
      tb.append(tr);
    });
  });
}
function imSec(kod) { seciliIm = kod; Sahne.sec(kod); gunTablosu(); imDetay(); if (kod && !masaustu.matches) sekmeAc("tabGun"); }
Sahne.onSec(kod => imSec(kod));
function imDetay() {
  const kap = $("imDetay"); kap.textContent = "";
  if (!seciliIm) { kap.append(el("p", "ikiz-ipucu", "Sahnede ya da tabloda bir iş merkezine dokunun: o günkü yükü, kapasitesi ve önünde bekleyen iş burada görünür.")); return; }
  const i = VERI.is_merkezleri.find(x => x.kod === seciliIm), g = sonuc.gunler[gun - 1], h = VERI.hatlar.find(x => x.kod === i.hat);
  kap.append(el("h3", "ikiz-detay-baslik", `${i.kod} · ${i.ad}`));
  const dl = el("dl", "ikiz-detay");
  const satir = (k, v) => { dl.append(el("dt", "", k), el("dd", "", v)); };
  satir("Hat", `${h.kod} ${h.ad}`); satir("Proses", i.proses); satir("İstasyon", `${i.istasyon} × ${i.operator} operatör`);
  satir("Günlük kapasite", g.kap[i.kod] > 0 ? `${fmt(g.kap[i.kod])} dk (verim ${yuzde(i.verim)})` : "0 dk · arıza");
  satir("Gelen yük", `${fmt(g.yuk[i.kod])} dk` + (g.kap[i.kod] > 0 ? ` · ${yuzde(g.oran[i.kod])}` : ""));
  if (g.kap[i.kod] > 0 && Math.abs(g.planOran[i.kod] - g.oran[i.kod]) > 0.005)
    satir("Plan yükü (dosyadaki gibi)", `${yuzde(g.planOran[i.kod])} · ` + (g.oran[i.kod] < g.planOran[i.kod] ? "üst iş merkezi aşımda, gelen iş az" : "önceki günlerden devreden iş var"));
  satir("Önünde bekleyen iş", g.kuyruk[i.kod] ? `${fmt(g.kuyruk[i.kod])} adet (ertesi güne devreder)` : "yok");
  satir("Fason", i.fason ? `mümkün, ${fmt(i.fason_dk)} dk/gün` + (sen.fason ? " (açık)" : " (kapalı)") : "mümkün değil");
  const mamuller = VERI.mamuller.filter(m => (VERI.rota[m.kod] || []).some(r => r.im === i.kod) && g.plan[m.kod] > 0);
  satir("Bugün geçen mamul", mamuller.length ? mamuller.map(m => m.kod).join(", ") : "—");
  kap.append(dl);
}

/* ---------- Sonuç: senaryo × Baz ---------- */
function sonucTablosu() {
  const o = sonuc.ozet, b = baz.ozet, tb = $("sonucTablo"); tb.textContent = "";
  const satir = (ad, v, bv, iyi) => { const tr = el("tr"); tr.append(el("td", "", ad), el("td", "ikiz-sayi", v), el("td", "ikiz-sayi ikiz-baz", bv));
    if (iyi !== undefined) tr.classList.add(iyi ? "iyi" : "kotu"); tb.append(tr); };
  satir("Kapasite aşımı (iş merkezi × gün)", String(o.asim), String(b.asim), o.asim === b.asim ? undefined : o.asim < b.asim);
  satir("En yüksek günlük yük", `${yuzde(o.enYuksek)} · ${o.enYuksekIm} g${o.enYuksekGun}`, `${yuzde(b.enYuksek)} · ${b.enYuksekIm}`, o.enYuksek === b.enYuksek ? undefined : o.enYuksek < b.enYuksek);
  satir("Zamanında sevk (OTD)", yuzde(o.otd, 1), yuzde(b.otd, 1), o.otd === b.otd ? undefined : o.otd > b.otd);
  satir(`Üretim (${G} gün, adet)`, fmt(o.uretim), fmt(b.uretim));
  satir("Sevk (adet)", fmt(o.sevk), fmt(b.sevk));
  satir("Hatta kalan iş (son gün, adet)", fmt(o.birikim), fmt(b.birikim), o.birikim === b.birikim ? undefined : o.birikim < b.birikim);
  satir("Karşılanmayan sevk (son gün, adet)", fmt(o.bekleyen), fmt(b.bekleyen), o.bekleyen === b.bekleyen ? undefined : o.bekleyen < b.bekleyen);
  o.hatlar.forEach((h, k) => satir(`${h.kod} doluluk · adam-saat (ihtiyaç / mevcut)`, `${yuzde(h.doluluk)} · ${fmt(h.adamSaat)} / ${fmt(h.mevcutAdamSaat)}`, `${yuzde(b.hatlar[k].doluluk)} · ${fmt(b.hatlar[k].adamSaat)} / ${fmt(b.hatlar[k].mevcutAdamSaat)}`));
}
/* Öneriler: kolları tek tek deneyip aşımı en çok düşüreni söyler (yapay zeka değil; aynı model) */
function oneriler() {
  const ul = $("oneriler"); ul.textContent = "";
  const o = sonuc.ozet; if (o.asim === 0) { ul.append(el("li", "", "Bu senaryoda hiçbir iş merkezi kapasiteyi aşmıyor; en yüksek günlük yük " + yuzde(o.enYuksek) + ".")); return; }
  const dene = (ad, degis) => { const s = Object.assign({}, sen, degis); const r = hesapla(VERI, s).ozet; return { ad, asim: r.asim, enY: r.enYuksek, otd: r.otd }; };
  const adaylar = [];
  if (!sen.fason) adaylar.push(dene("Fason açmak (fason mümkün iş merkezlerinde)", { fason: true }));
  if (!sen.vardiya3) adaylar.push(dene("Üçüncü vardiya (kapasite ×1,5)", { vardiya3: true }));
  if (sen.kapasite < 0.3) adaylar.push(dene("Kapasite +%15 (ek istasyon / verim)", { kapasite: sen.kapasite + 0.15 }));
  if (sen.ariza) adaylar.push(dene("Arızayı gidermek", { ariza: null }));
  adaylar.sort((a, b) => a.asim - b.asim);
  const dar = VERI.is_merkezleri.find(i => i.kod === o.enYuksekIm);
  ul.append(el("li", "", `Darboğaz ${o.enYuksekIm} ${dar ? dar.ad : ""}: kapasiteyi aşan gün ${sonuc.gunler.filter(g => g.oran[o.enYuksekIm] > 1).length} / ${G} (en yüksek ${yuzde(o.enYuksek)}, gün ${o.enYuksekGun}).`));
  adaylar.slice(0, 3).forEach(a => ul.append(el("li", "", `${a.ad}: aşım ${o.asim} → ${a.asim}, en yüksek yük ${yuzde(a.enY)}, OTD ${yuzde(a.otd, 1)}.`)));
}

/* ---------- Sekmeler ve çekmece ---------- */
const tabs = [...document.querySelectorAll(".ikiz-sekmeler [role=tab]")];
function sekmeAc(id) { tabs.forEach(x => x.setAttribute("aria-selected", String(x.dataset.tab === id))); document.querySelectorAll(".ikiz-panel").forEach(p => p.hidden = p.id !== id); if (!masaustu.matches) cekmece.open = true; }
tabs.forEach(b => b.onclick = () => sekmeAc(b.dataset.tab));
const cekmece = $("cekmece"), kap = $("cekmeceKap"), sahneKutu = document.querySelector(".ikiz-sahne");
const kaydirma = reduceMotion ? "auto" : "smooth";
function serit() {
  kap.classList.toggle("acik", cekmece.open);
  if (masaustu.matches) { document.body.style.paddingBottom = ""; return; }
  if (!cekmece.open) document.body.style.paddingBottom = kap.offsetHeight + "px";
}
const yerlesim = () => { cekmece.open = masaustu.matches; serit(); };
masaustu.addEventListener("change", yerlesim); yerlesim();
cekmece.addEventListener("toggle", () => {
  if (masaustu.matches && !cekmece.open) cekmece.open = true;
  if (!masaustu.matches && cekmece.open) sahneKutu.scrollIntoView({ block: "start", behavior: kaydirma });
  serit();
});
new ResizeObserver(serit).observe(kap);
$("btnSahneyeDon").onclick = () => { cekmece.open = false; sahneKutu.scrollIntoView({ block: "start", behavior: kaydirma }); };
if (!Sahne.ok) $("glUyari").hidden = false;

senaryoUygula();
if (!reduceMotion) setTimeout(() => oynat(true), 900);
