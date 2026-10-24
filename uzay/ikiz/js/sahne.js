/* Fabrika İkizi · SAHNE — Three.js sahne (r128, /assets/js/vendor/three/ klasik betik olarak önce yüklenir).
   Malzeme deposu solda, üç hat ortada (soldan sağa proses sırası: iş merkezleri istasyon kutularıyla), bitmiş ürün rafı ve
   sevkiyat rampası sağda. Her iş merkezi günün yük oranına göre renklenir; darboğazın önünde bekleyen iş palet yığını olur;
   hat boyunca akan parçalar günün üretimiyle hızlanır; her gün sonunda kamyon çıkar. WebGL yoksa aynı arayüzü taşıyan
   boş sahne döner (sayılar ve senaryo karşılaştırması yine çalışır). */
const THREE = globalThis.THREE;

/* Renkler sitenin paletinden (assets/css/style.css :root) */
const C = {
  bg: 0x07172C, floor: 0x0B1F3A, grid: 0x1E3A5F, cizgi: 0x9CCBEA, post: 0x5B87AD, mavi: 0x0096C7,
  turuncu: 0xF4A27A, acil: 0xB42318, gri: 0x46586D, beyaz: 0xFFFFFF, kamyon: 0xEAF4FB, konveyor: 0x2B4466, palet: 0xD9B38C,
};
const YAZI = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const IM_ARA = 5.0;          // iş merkezleri arası (x)
const HAT_Z = [-7.5, 0, 7.5]; // üç hattın z konumu
const X0 = -8.5;             // ilk iş merkezi
const X_GIRIS = -12, X_CIKIS = 14, X_RAMPA = 17.5;

function bosSahne() {
  const bos = () => {};
  const onTick = f => (function loop(t) { requestAnimationFrame(loop); f(t); })(performance.now());
  return { ok: false, kur: bos, gunuGoster: bos, sec: bos, kamera: bos, kamyonCikar: bos, onTick, onSec: bos };
}

function kur3d(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.Fog(C.bg, 40, 95);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 6; controls.maxDistance = 90;
  scene.add(new THREE.HemisphereLight(0xEAF4FB, C.floor, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.55); sun.position.set(14, 24, 10); scene.add(sun);

  const world = new THREE.Group(); scene.add(world);
  let V = null, imler = new Map(), hatlar = new Map(), secili = null, kamMod = "genel", kamHedef = null;
  let tokenMesh = null, tokenler = [], kamyon = null, kamyonAnim = null, oranlar = {};
  const mat = (color, ek = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7, metalness: 0.05 }, ek));

  function etiket(satirlar, opts = {}) {
    const w = 256, h = 112, cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d");
    if (opts.bg) { g.fillStyle = opts.bg; g.beginPath(); g.roundRect ? g.roundRect(4, 4, w - 8, h - 8, 18) : g.rect(4, 4, w - 8, h - 8); g.fill();
      if (opts.ring) { g.strokeStyle = opts.ring; g.lineWidth = 4; g.stroke(); } }
    g.textAlign = "center"; g.textBaseline = "middle";
    const sigdir = (metin, boy, agirlik) => { let b = boy; do { g.font = `${agirlik} ${b}px ${YAZI}`; b -= 2; } while (b > 12 && g.measureText(metin).width > w - 24); };
    g.fillStyle = opts.fg || "#CBE6F6"; sigdir(satirlar[0], opts.size || 40, 700); g.fillText(satirlar[0], w / 2, satirlar[1] ? 38 : h / 2);
    if (satirlar[1]) { g.fillStyle = opts.fg2 || "#9CCBEA"; sigdir(satirlar[1], opts.size2 || 26, 600); g.fillText(satirlar[1], w / 2, 78); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
    sp.renderOrder = 10; sp.scale.set(2.6, 1.14, 1); return sp;
  }
  function dispose(o) { o.traverse(n => { n.geometry?.dispose(); if (n.material) { n.material.map?.dispose(); n.material.dispose(); } }); }

  function kutu(w, h, d, m, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); const k = new THREE.Mesh(g, m); k.position.set(x, y, z); return k; }

  function raflar(x0, z0, sira, goz, kat, yon) {
    // basit raf bloğu: dikmeler + göz kutuları (instanced)
    const g = new THREE.BoxGeometry(0.9, 0.5, 0.9); g.translate(0, 0.25, 0);
    const m = new THREE.InstancedMesh(g, mat(C.cizgi), sira * goz * kat); const m4 = new THREE.Matrix4(); let i = 0;
    for (let s = 0; s < sira; s++) for (let b = 0; b < goz; b++) for (let k = 0; k < kat; k++) {
      const x = yon === "x" ? x0 + b : x0 + s * 1.4, z = yon === "x" ? z0 + s * 1.4 : z0 + b;
      m4.makeTranslation(x, k * 0.62, z); m.setMatrixAt(i++, m4);
    }
    world.add(m);
  }

  function kur(veri) {
    V = veri; imler.clear(); hatlar.clear(); secili = null;
    while (world.children.length) { const c = world.children[0]; world.remove(c); dispose(c); }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 28), mat(C.floor, { roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; world.add(floor);
    const grid = new THREE.GridHelper(48, 48, C.grid, C.grid); grid.material.transparent = true; grid.material.opacity = 0.5; world.add(grid);
    // malzeme deposu (sol): A bölgesi 2 sıra × 6 göz × 2 kat; bitmiş ürün rafı (sağ): S bölgesi 6 göz
    raflar(-19, -1.2, 2, 6, 2, "x");
    { const e = etiket(["Malzeme deposu", `A bölgesi · ${V.raf_bolge?.A ?? 24} göz`], { bg: "#0B1F3A", ring: "#5B87AD", size: 30, size2: 22 }); e.position.set(-16.5, 2.4, -3.4); world.add(e); }
    raflar(X_CIKIS + 1.2, -3, 1, 6, 1, "z");
    { const e = etiket(["Bitmiş ürün", `S bölgesi · ${V.raf_bolge?.S ?? 6} göz`], { bg: "#0B1F3A", ring: "#5B87AD", size: 30, size2: 22 }); e.position.set(X_CIKIS + 1.2, 2.2, -5); world.add(e); }
    // sevkiyat rampası + kamyon
    world.add(kutu(3, 0.25, 12, mat(C.gri), X_RAMPA, 0, 0));
    { const e = etiket(["Sevkiyat", "rampa"], { bg: "#0B1F3A", ring: "#5B87AD", size: 30, size2: 22 }); e.position.set(X_RAMPA, 2.2, -7.5); world.add(e); }
    kamyon = new THREE.Group();
    kamyon.add(kutu(3.6, 1.8, 1.9, mat(C.kamyon), 0, 0.5, 0)); kamyon.add(kutu(1.3, 1.3, 1.7, mat(C.mavi), 2.5, 0.5, 0));
    [[-1.2, -0.95], [-1.2, 0.95], [1.0, -0.95], [1.0, 0.95], [2.5, -0.95], [2.5, 0.95]].forEach(([x, z]) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), mat(0x1B2A3F)); t.rotation.x = Math.PI / 2; t.position.set(x, 0.45, z); kamyon.add(t); });
    kamyon.position.set(X_RAMPA - 1.5, 0, 9.5); world.add(kamyon);
    // hatlar
    V.hatlar.forEach((h, hi) => {
      const z = HAT_Z[hi] ?? hi * 7.5, ims = V.is_merkezleri.filter(i => i.hat === h.kod);
      const hatGrup = new THREE.Group(); world.add(hatGrup);
      hatlar.set(h.kod, { z, hiz: 0, grup: hatGrup, ims: ims.map(i => i.kod) });
      // giriş paleti ve etiket
      hatGrup.add(kutu(1.4, 0.3, 1.4, mat(C.palet), X_GIRIS, 0, z));
      const e = etiket([h.kod, h.ad], { bg: "#0B1F3A", ring: "#9CCBEA", size: 36, size2: 20 }); e.position.set(X_GIRIS - 2.2, 1.9, z); e.scale.set(3.2, 1.4, 1); hatGrup.add(e);
      // konveyör: giriş → son iş merkezi → çıkış
      const xSon = X0 + (ims.length - 1) * IM_ARA;
      hatGrup.add(kutu(X_CIKIS - X_GIRIS, 0.14, 0.6, mat(C.konveyor), (X_CIKIS + X_GIRIS) / 2, 0.3, z));
      hatGrup.add(kutu(1.4, 0.3, 1.4, mat(C.palet), X_CIKIS, 0, z));
      ims.forEach((im, k) => {
        const x = X0 + k * IM_ARA, g = new THREE.Group(); g.position.set(x, 0, z); hatGrup.add(g);
        const n = Math.max(1, im.istasyon), makineler = [], lambalar = [];
        for (let s = 0; s < n; s++) {
          const dz = (s - (n - 1) / 2) * 1.35;
          const taban = kutu(2.0, 0.12, 1.2, mat(C.gri), 0, 0, dz); g.add(taban);
          const mk = kutu(1.6, 1.1, 1.0, mat(C.cizgi), 0, 0.12, dz); g.add(mk); makineler.push(mk);
          const lamba = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12), mat(C.cizgi, { emissive: C.cizgi, emissiveIntensity: 0.4 }));
          lamba.position.set(-0.6, 1.35, dz - 0.3); g.add(lamba); lambalar.push(lamba);
        }
        const halka = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.7, 48), new THREE.MeshBasicMaterial({ color: C.mavi, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
        halka.rotation.x = -Math.PI / 2; halka.position.y = 0.02; halka.scale.set(1, (n * 1.35 + 1) / 3.2, 1); halka.visible = false; g.add(halka);
        const et = etiket([im.kod, im.ad], { bg: "#0B1F3A", ring: "#5B87AD", size: 36, size2: 22 }); et.position.set(0, 2.1 + (n > 3 ? 0.2 : 0), 0); g.add(et);
        const yigin = kutu(1.1, 1, 1.1, mat(C.palet), -2.0, 0, 0); yigin.visible = false; g.add(yigin);
        const uyari = etiket(["ARIZA"], { bg: "#B42318", fg: "#FFFFFF", size: 40 }); uyari.position.set(0, 3.2, 0); uyari.scale.set(1.6, 0.7, 1); uyari.visible = false; g.add(uyari);
        imler.set(im.kod, { im, grup: g, makineler, lambalar, halka, yigin, uyari, x, z, durum: "bos" });
      });
    });
    // akan parçalar: hat başına 10 parça (instanced)
    const tg = new THREE.BoxGeometry(0.42, 0.26, 0.42); tg.translate(0, 0.5, 0);
    tokenMesh = new THREE.InstancedMesh(tg, mat(C.turuncu, { emissive: C.turuncu, emissiveIntensity: 0.25 }), V.hatlar.length * 10);
    tokenler = []; let ti = 0;
    V.hatlar.forEach(h => { for (let k = 0; k < 10; k++) tokenler.push({ hat: h.kod, t: k / 10, i: ti++ }); });
    world.add(tokenMesh); tokenGuncelle();
    kamera(kamMod, true);
  }

  const m4 = new THREE.Matrix4();
  function tokenGuncelle() {
    if (!tokenMesh) return;
    tokenler.forEach(tk => { const h = hatlar.get(tk.hat); if (!h) return; const x = X_GIRIS + tk.t * (X_CIKIS - X_GIRIS);
      m4.makeTranslation(x, 0, h.z); tokenMesh.setMatrixAt(tk.i, m4); });
    tokenMesh.instanceMatrix.needsUpdate = true;
  }

  function renk(durum) { return durum === "asim" ? C.acil : durum === "dolu" ? C.turuncu : durum === "ariza" ? C.gri : durum === "bos" ? C.post : C.cizgi; }
  /* Günün kaydını sahneye uygular: oran{im}, kuyruk{im} (adet), hatUretim{hat} (adet), kapasite 0 = arıza */
  function gunuGoster(gun, enCok) {
    if (!V) return; oranlar = gun.oran;
    imler.forEach((o, kod) => {
      const oran = gun.oran[kod] || 0, kap = gun.kap[kod];
      const durum = kap <= 0 ? "ariza" : oran > 1 ? "asim" : oran > 0.85 ? "dolu" : oran > 0 ? "normal" : "bos";
      o.durum = durum;
      const c = new THREE.Color(renk(durum));
      o.makineler.forEach(m => m.material.color.copy(c));
      o.lambalar.forEach(l => { l.material.color.copy(c); l.material.emissive.copy(c); l.material.emissiveIntensity = durum === "asim" || durum === "ariza" ? 0.9 : 0.4; });
      o.uyari.visible = durum === "ariza";
      const k = gun.kuyruk?.[kod] || 0;
      o.yigin.visible = k > 0;
      if (k > 0) { const h = Math.min(2.2, 0.25 + 0.35 * Math.log2(1 + k / 50)); o.yigin.scale.y = h; }
    });
    hatlar.forEach((h, kod) => { const u = gun.hatUretim?.[kod] || 0; h.hiz = enCok > 0 ? 0.015 + 0.09 * Math.min(1, u / enCok) : 0; });
  }

  function sec(kod) {
    secili = kod || null;
    imler.forEach((o, k) => { o.halka.visible = k === secili; });
  }

  function kamera(mod, hemen) {
    kamMod = mod; const aspect = Math.max(0.3, camera.aspect);
    // sahne ~48 birim geniş: yatay görüş açısına göre uzaklık (dar ekranda geri çekil)
    const uzak = Math.min(95, Math.max(36, 56 / aspect)), k = Math.min(2.4, Math.max(1, 1.45 / aspect));
    let poz, hedef = new THREE.Vector3(2, 0, -2.5);
    if (mod === "ust") { hedef.set(1, 0, 0); poz = new THREE.Vector3(1, Math.max(38, uzak), 0.01); }
    else if (mod.startsWith("hat:")) { const h = hatlar.get(mod.slice(4)); if (h) { hedef.set(0, 0.5, h.z); poz = new THREE.Vector3(-17 * k, 7 * k, h.z + 7.5 * k); } }
    if (!poz) { poz = new THREE.Vector3(0.12, 0.58, 0.8).multiplyScalar(uzak).add(hedef); }
    kamHedef = { poz, hedef, hemen: !!hemen };
    if (hemen) { camera.position.copy(poz); controls.target.copy(hedef); controls.update(); kamHedef = null; }
  }

  function kamyonCikar() { kamyonAnim = { t0: performance.now() }; }

  // tıklama: iş merkezi
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null, onSec = null;
  canvas.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener("pointerup", e => {
    if (!down || !onSec) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
    if (moved > 6 || dt > 600) return;
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hedefler = []; imler.forEach(o => o.makineler.forEach(m => hedefler.push(m)));
    const hit = ray.intersectObjects(hedefler)[0];
    if (!hit) { onSec(null); return; }
    for (const [kod, o] of imler) if (o.makineler.includes(hit.object)) { onSec(kod); return; }
  });

  let fitted = false;
  function resize() { const r = canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
    if (V && !fitted && r.width > 0) { fitted = true; kamera(kamMod, true); } }
  new ResizeObserver(resize).observe(canvas.parentElement);
  const tickers = []; let son = 0;
  const azHareket = matchMedia("(prefers-reduced-motion: reduce)").matches;
  (function loop(t) {
    requestAnimationFrame(loop); const dt = Math.min(0.1, (t - son) / 1000); son = t;
    tickers.forEach(f => f(t));
    if (tokenMesh && !azHareket) { tokenler.forEach(tk => { const h = hatlar.get(tk.hat); if (h) tk.t = (tk.t + h.hiz * dt) % 1; }); tokenGuncelle(); }
    if (kamyon && kamyonAnim) { const p = (t - kamyonAnim.t0) / 1500; if (p >= 1) { kamyonAnim = null; kamyon.position.x = X_RAMPA - 1.5; }
      else { kamyon.position.x = X_RAMPA - 1.5 + (p < 0.5 ? p * 2 * 16 : 16 - (p - 0.5) * 2 * 16); } }
    if (!azHareket) imler.forEach(o => { if (o.durum === "asim" || o.durum === "ariza") { const y = 0.5 + 0.5 * Math.sin(t / 180); o.lambalar.forEach(l => l.material.emissiveIntensity = 0.3 + 0.7 * y); } });
    if (kamHedef) { camera.position.lerp(kamHedef.poz, 0.08); controls.target.lerp(kamHedef.hedef, 0.08);
      if (camera.position.distanceTo(kamHedef.poz) < 0.05) { camera.position.copy(kamHedef.poz); controls.target.copy(kamHedef.hedef); kamHedef = null; } }
    controls.update(); renderer.render(scene, camera);
  })(0);

  return { ok: true, kur, gunuGoster, sec, kamera, kamyonCikar, onTick: f => tickers.push(f), onSec: f => onSec = f };
}

export const Sahne = (() => {
  const canvas = document.getElementById("sahne");
  if (!THREE || !THREE.OrbitControls || !canvas) return bosSahne();
  try { return kur3d(canvas); } catch { return bosSahne(); }
})();
