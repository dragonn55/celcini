/* ROTA 3D · UI — giriş modülü. Sayfa iskeleti scripts/derle.py'de (rota_sayfasi), stiller uzay/rota/css/rota.css'te.
   Telefonda kontroller alttan açılan çekmecede (Fabricakit görev notuyla aynı bileşen: .fk-gorev-kap / .fk-gorev);
   masaüstünde çekmece hep açık, sahnenin yanında durur. Satır içi style yok (CSP): genişlikler el.style ile verilir.
   Girilen kodlar yalnızca bu sayfada işlenir; hiçbir yere gönderilmez, saklanmaz. */
import { Layout, Heat } from "./layout.js";
import { Router } from "./router.js";
import { Scene3D } from "./scene3d.js";

const $ = id => document.getElementById(id);
const SAMPLE = { pairs:4, bays:12, levels:3, cell:1.2, depot:"left",
  picks:"A03, B11-2, C06, D02-3, E09\nF12, G04-2, H08, C10, F05",
  hist:"A03, C06, F05, H08\nA03, B11, C06, F12\nC06, F05, G04, A03\nA03, D02, F05, C10\nF05, A03, C06, E09\nB11, C06, A03, H08\nF05, C06, G04\nA03, F12, C10, F05" };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const masaustu = matchMedia("(min-width: 960px)");
let layout = null, result = null, seqResult = null, anim = null, mode = "pick", heatOn = false;

const fmt = (n, d=1) => n.toLocaleString("tr-TR", { maximumFractionDigits:d });
const toast = (msg) => { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2200); };
const cellM = () => Math.max(0.5, +$("inCell").value || 1.2);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

function readLayout(force){
  const pairs = Math.min(10, Math.max(1, +$("inPairs").value || 4));
  const bays = Math.min(30, Math.max(3, +$("inBays").value || 12));
  const levels = Math.min(5, Math.max(1, +$("inLevels").value || 1));
  const depot = $("inDepot").value;
  const key = [pairs,bays,levels,depot].join("|");
  if (force || !layout || layout.key !== key){
    const blocked = layout ? layout.blocked : new Set();
    layout = Layout.build(pairs, bays, levels, depot); layout.key = key;
    blocked.forEach(k => { const [x,z] = k.split(",").map(Number); if (x<layout.W && z<layout.H && layout.walk[x][z]) layout.blocked.add(k); });
    Scene3D.buildWarehouse(layout);
    if (heatOn) Scene3D.setHeat(Heat.count($("inHist").value, layout));
  }
  const last = layout.racks[layout.racks.length-1].letter;
  $("layoutHint").innerHTML = `Raflar <code>A</code>–<code>${last}</code>, gözler <code>1</code>–<code>${bays}</code>${levels>1?`, katlar <code>1</code>–<code>${levels}</code>`:""}. Örnek: <code>C07${levels>1?"-2":""}</code>`;
}

function run(){
  readLayout();
  const { ok, bad } = Layout.parsePicks($("inPicks").value, layout);
  $("cekmeceSayac").textContent = `${ok.length} ürün`;
  $("pickErr").hidden = bad.length === 0;
  if (bad.length) $("pickErr").textContent = `Tanınmayan kod: ${bad.join(", ")}. Geçerli biçim: harf + göz no${layout.levels>1?" + kat (C07-2)":""}.`;
  Scene3D.highlight(ok.map(p => p.code));
  if (!ok.length){ result = seqResult = null; Scene3D.setRoute(null); show(); renderSteps(); return; }
  const r = Router.solve(layout, ok, "opt");
  if (r.error){ result = seqResult = null; Scene3D.setRoute(null); show(); renderSteps(); $("pickErr").hidden = false; $("pickErr").textContent = r.error; return; }
  result = r; seqResult = Router.solve(layout, ok, "seq");
  Scene3D.setRoute(result, $("chkSeq").checked ? seqResult : null, $("chkLabels").checked);
  show(); renderSteps(); play();
}

function timeFor(r){ if (!r) return 0; const v = +$("inSpeed").value, pt = +$("inPickTime").value; return r.moves*cellM()/v + r.itemCount*pt; }
const fmtTime = (s) => s >= 90 ? `${fmt(s/60,1)}<small>dk</small>` : `${Math.round(s)}<small>sn</small>`;

function show(){
  const cell = cellM(), m = result ? result.moves*cell : 0, ms = seqResult ? seqResult.moves*cell : 0;
  $("sDist").innerHTML = `${fmt(m)}<small>m</small>`;
  $("sTime").innerHTML = fmtTime(timeFor(result));
  $("sStops").textContent = result ? result.stopCount : "0";
  $("sMethod").textContent = result ? `${result.method} · ${result.moves} göz × ${fmt(cell)} m · ${result.itemCount} ürün` : "Ürün girilmedi";
  if (result && seqResult){
    const mx = Math.max(m, ms, 0.01);
    $("cSeq").textContent = fmt(ms)+" m"; $("cOpt").textContent = fmt(m)+" m";
    $("bSeq").style.width = (ms/mx*100)+"%"; $("bOpt").style.width = (m/mx*100)+"%";
    const sv = ms > 0 ? (1 - m/ms)*100 : 0;
    $("cSave").textContent = sv > 0.5 ? `%${fmt(sv,0)} tasarruf` : "eşit";
    $("cSave").title = `Sıralı toplamaya göre ${fmt(ms-m)} m daha kısa`;
  } else { $("cSeq").textContent = $("cOpt").textContent = "—"; $("cSave").textContent = "—"; $("cSave").title = ""; $("bSeq").style.width = "100%"; $("bOpt").style.width = "0%"; }
  const ol = $("orderList"); ol.textContent = "";
  if (!result) return;
  const add = (txt, cls) => ol.appendChild(el("li", cls, txt));
  add("Başlangıç", "depot"); result.arrive.forEach((a,k) => add(`${k+1}. ${a.stop.codes.join(" + ")}`)); add("Sevkiyat", "depot");
}

let stepItems = [], copyLines = [];
function renderSteps(){
  const ol = $("stepList"); ol.textContent = ""; stepItems = []; copyLines = [];
  const row = (arr, what, m, cls, sub) => {
    const li = el("li", cls); const w = el("span", "what", what);
    if (sub) w.append(el("span", "alt", sub));
    li.append(el("span", "arr", arr), w, el("span", "m", m)); ol.appendChild(li); return li;
  };
  if (!result){ row("·", "Rota yok", ""); return; }
  const cell = cellM(); let acc = 0;
  Router.steps(layout, result).forEach(s => {
    let li;
    if (s.type === "move"){ acc += s.cells; li = row(s.arr, s.text, `${fmt(s.cells*cell)} m`); copyLines.push(`${s.arr} ${s.text} · ${fmt(s.cells*cell)} m`); }
    else if (s.type === "stop"){ li = row("●", s.text, `${fmt(acc*cell)} m`, "stop", s.sub); copyLines.push(`● ${s.text} · ${s.sub} · ${fmt(acc*cell)} m`); }
    else { li = row("■", s.text, `${fmt(acc*cell)} m`, "stop"); copyLines.push(`■ ${s.text} · ${fmt(acc*cell)} m`); }
    li.dataset.at = s.at; stepItems.push(li);
  });
}

function play(){
  if (!result) return;
  const speed = +$("inAnim").value;
  const dur = reduceMotion ? 1 : Math.min(14000, Math.max(2000, result.moves*110)) / speed;
  [...document.querySelectorAll("#orderList li, #stepList li")].forEach(li => li.classList.remove("done"));
  anim = { t0: performance.now(), dur, doneK: -1, items:[...document.querySelectorAll("#orderList li")] };
  $("hudState").textContent = "toplama sürüyor";
}
Scene3D.onTick(now => {
  if (!anim || !result) return;
  const p = Math.min(1, (now - anim.t0)/anim.dur); Scene3D.setProgress(p);
  const atMove = p * result.moves;
  result.arrive.forEach((a,k) => { if (atMove >= a.at - 1e-6 && k > anim.doneK){ anim.doneK = k; Scene3D.markDone(k); anim.items[k+1]?.classList.add("done"); } });
  stepItems.forEach(li => { if (atMove >= +li.dataset.at - 1e-6) li.classList.add("done"); });
  $("hudProg").textContent = "%" + Math.max(0, Math.round(p*100));
  if (p >= 1){ anim.items[0]?.classList.add("done"); anim.items[anim.items.length-1]?.classList.add("done"); $("hudState").textContent = "tamamlandı"; anim = null; }
});

// sahne tıklamaları
Scene3D.onPick(h => {
  if (mode === "view") return;
  if (h.kind === "bay" && mode === "pick"){
    const codes = $("inPicks").value.split(/[\s,;]+/).filter(Boolean);
    const norm = c => Layout.parseCode(c, layout)?.code;
    const idx = codes.findIndex(c => norm(c) === h.code);
    if (idx >= 0){ codes.splice(idx,1); toast(`${h.code} listeden çıkarıldı`); } else { codes.push(h.code); toast(`${h.code} listeye eklendi`); }
    $("inPicks").value = codes.join(", "); run();
  } else if (h.kind === "cell" && mode === "block"){
    if (Layout.toggleBlock(layout, h.x, h.z)){ Scene3D.drawBlocks(); run(); } else toast("Buraya engel konamaz");
  }
});

// ısı haritası
function heatShow(){
  readLayout(); const freq = Heat.count($("inHist").value, layout); heatOn = true; Scene3D.setHeat(freq);
  const arr = [...freq.entries()].sort((a,b) => b[1]-a[1]).slice(0,8), mx = arr[0]?.[1] || 1;
  const ul = $("hotList"); ul.textContent = "";
  arr.forEach(([k,v]) => { const li = el("li"), bar = el("i"); bar.style.width = (v/mx*100)+"%"; li.append(el("span", "", k), bar, el("span", "", `${v}×`)); ul.appendChild(li); });
  if (!arr.length) ul.appendChild(el("li", "bos", "Geçmiş boş"));
  // sık toplananların sevkiyata ortalama uzaklığı
  if (arr.length){ const tree = Router.bfs(layout, layout.depot); let tot = 0, n = 0;
    arr.forEach(([k,v]) => { const p = Layout.parseCode(k, layout); if (p){ tot += tree.dist[p.cell.x][p.cell.z]*v; n += v; } });
    $("heatHint").textContent = `En sık 8 gözün sevkiyata ağırlıklı ortalama uzaklığı ${fmt(tot/n*cellM())} m. Bunları ön gözlere taşımak her siparişte metre kazandırır.`; }
}
function heatOff(){ heatOn = false; Scene3D.setHeat(null); }

function loadSample(){
  $("inPairs").value = SAMPLE.pairs; $("inBays").value = SAMPLE.bays; $("inLevels").value = SAMPLE.levels; $("inCell").value = SAMPLE.cell; $("inDepot").value = SAMPLE.depot;
  $("inPicks").value = SAMPLE.picks; $("inHist").value = SAMPLE.hist; layout = null; run();
}
function copySteps(){
  const lines = [`ROTA 3D — ${result ? fmt(result.moves*cellM()) : 0} m, ${result?.stopCount||0} durak`, ...copyLines].join("\n");
  if (!navigator.clipboard){ toast("Kopyalanamadı; listeyi elle seçebilirsiniz"); return; }
  navigator.clipboard.writeText(lines).then(() => toast("Kopyalandı"), () => toast("Kopyalanamadı; listeyi elle seçebilirsiniz"));
}

// olaylar
$("btnRun").onclick = run; $("btnReplay").onclick = play; $("btnSample").onclick = loadSample; $("btnCopy").onclick = copySteps;
$("btnClear").onclick = () => { $("inPicks").value = ""; run(); };
$("btnClearBlocks").onclick = () => { layout.blocked.clear(); Scene3D.drawBlocks(); run(); };
$("btnHeat").onclick = heatShow; $("btnHeatOff").onclick = heatOff;
["inPairs","inBays","inLevels","inDepot"].forEach(id => $(id).addEventListener("change", () => { layout = null; run(); }));
$("inCell").addEventListener("input", () => { show(); renderSteps(); });
$("chkSeq").onchange = $("chkLabels").onchange = () => { if (result) Scene3D.setRoute(result, $("chkSeq").checked ? seqResult : null, $("chkLabels").checked); if (result) Scene3D.setProgress(anim ? 0 : 1); };
const bind = (id, out, f) => $(id).addEventListener("input", () => { $(out).textContent = f(+$(id).value); show(); });
bind("inSpeed", "speedVal", v => fmt(v,1)); bind("inPickTime", "pickVal", v => v); bind("inAnim", "animVal", v => fmt(v,2)+"×");
const tabs = [...document.querySelectorAll(".rota-sekmeler [role=tab]")];
tabs.forEach(b => b.onclick = () => {
  tabs.forEach(x => x.setAttribute("aria-selected", String(x===b)));
  document.querySelectorAll(".rota-panel").forEach(p => p.hidden = p.id !== b.dataset.tab);
});
const modes = [...document.querySelectorAll("#editMode button")];
modes.forEach(b => b.onclick = () => {
  mode = b.dataset.mode; modes.forEach(x => x.setAttribute("aria-pressed", String(x===b)));
  const hm = $("hudMode"); hm.hidden = mode === "pick"; hm.textContent = mode === "block" ? "Engel modu: koridora dokunun" : "Sadece bak";
});
const cams = [["camIso","iso"],["camTop","top"],["camFollow","follow"]];
cams.forEach(([id,m]) => $(id).onclick = () => {
  cams.forEach(([x]) => $(x).setAttribute("aria-pressed", String(x===id))); Scene3D.setCamera(m);
});

// çekmece: masaüstünde hep açık; telefonda kapalı başlar, sahne tam görünür
const cekmece = $("cekmece");
const yerlesim = () => { cekmece.open = masaustu.matches; };
masaustu.addEventListener("change", yerlesim); yerlesim();
cekmece.addEventListener("toggle", () => { if (masaustu.matches && !cekmece.open) cekmece.open = true; });
document.body.classList.add("fk-cekmeceli");
if (!Scene3D.ok) $("glUyari").hidden = false;

loadSample();
