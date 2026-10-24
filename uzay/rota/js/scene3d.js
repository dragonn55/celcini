/* ROTA 3D · SCENE3D — Three.js sahne. THREE ve THREE.OrbitControls /assets/js/vendor/three/ altından
   klasik betik olarak önce yüklenir (r128). WebGL yoksa aynı arayüzü taşıyan boş sahne döner: rota hesabı
   ve adım listesi yine çalışır, sahnede bir uyarı görünür. */
const THREE = globalThis.THREE;

/* Sahne koyu kalır; renkler sitenin paletinden (assets/css/style.css :root) */
const C = {
  bg: 0x07172C,        // arka plan: zeminden bir ton koyu
  floor: 0x0B1F3A,     // zemin (--metin)
  grid: 0x1E3A5F,
  rack: 0x9CCBEA,      // raflar açık mavi (--cizgi)
  post: 0x5B87AD,      // raf dikmeleri
  pick: 0x0096C7,      // listedeki gözler, toplayıcıyla aynı renk (--mavi)
  route: 0xF4A27A,     // rota çizgisi (--turuncu)
  picker: 0x0096C7,    // toplayıcı (--mavi)
  cart: 0x46586D,      // toplama arabası (--metin-2)
  depot: 0xFFFFFF,     // sevkiyat noktası
  block: 0xB42318,     // engel (--acil)
  seq: 0x8FA3BC,       // sıralı toplama yolu (kesik çizgi)
  heatMid: 0xFDEBDD,   // ısı haritası orta (--turuncu-zemin), sık = --turuncu
};
const YAZI = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/* WebGL ya da Three.js yoksa: aynı yöntemler, hiçbir şey çizmez (listedeki ilerleme yine işler) */
function bosSahne(){
  const bos = () => {};
  const onTick = f => (function loop(t){ requestAnimationFrame(loop); f(t); })(performance.now());
  return { ok:false, buildWarehouse:bos, highlight:bos, setHeat:bos, setRoute:bos, setProgress:bos, markDone:bos,
    setCamera:bos, drawBlocks:bos, onTick, onPick:bos };
}

function kur(canvas){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.Fog(C.bg, 30, 80);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI*0.48; controls.minDistance = 4; controls.maxDistance = 70;
  scene.add(new THREE.HemisphereLight(0xEAF4FB, C.floor, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.5); sun.position.set(8,16,10); scene.add(sun);

  let world = new THREE.Group(); scene.add(world);
  let bayMesh = null, bayIndex = new Map(), bayCodes = [], route = null, seqLine = null, picker = null, pinSprites = [], blockGroup = null;
  let L = null, off = {x:0,z:0}, levelH = 0.75, camMode = "iso", heat = null, highlighted = new Set();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
  const W2 = (c) => new THREE.Vector3(c.x - off.x, 0, c.z - off.z);
  const toCell = (v) => ({ x: Math.round(v.x + off.x), z: Math.round(v.z + off.z) });

  function label(text, opts={}){
    const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s; const g = cv.getContext("2d");
    if (opts.bg){ g.fillStyle = opts.bg; g.beginPath(); g.arc(s/2,s/2,s/2-6,0,Math.PI*2); g.fill();
      if (opts.ring){ g.strokeStyle = opts.ring; g.lineWidth = 5; g.stroke(); } }
    g.fillStyle = opts.fg || "#CBE6F6"; g.font = `700 ${opts.size||64}px ${YAZI}`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, s/2, s/2+4);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:new THREE.CanvasTexture(cv), depthTest:false, transparent:true }));
    sp.renderOrder = 10; return sp;
  }
  function dispose(o){ o.traverse(n => { n.geometry?.dispose(); if (n.material){ n.material.map?.dispose(); n.material.dispose(); } }); }
  function clear(){ scene.remove(world); dispose(world); world = new THREE.Group(); scene.add(world); route = seqLine = picker = blockGroup = null; pinSprites = []; bayIndex.clear(); bayCodes = []; }

  function buildWarehouse(layout){
    clear(); L = layout; off = { x:(L.W-1)/2, z:(L.H-1)/2 }; levelH = Math.max(0.6, 2.4/L.levels);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(L.W+4, L.H+4), new THREE.MeshStandardMaterial({ color:C.floor, roughness:0.95 }));
    floor.rotation.x = -Math.PI/2; floor.position.y = -0.01; world.add(floor);
    const g = new THREE.GridHelper(Math.max(L.W,L.H)+4, Math.max(L.W,L.H)+4, C.grid, C.grid); g.material.transparent = true; g.material.opacity = 0.6; world.add(g);
    // gözler: raf × göz × kat (instanced)
    const count = L.racks.length * L.bays * L.levels;
    const geo = new THREE.BoxGeometry(0.9, levelH*0.86, 0.94); geo.translate(0, levelH*0.43, 0);
    bayMesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness:0.7, metalness:0.05 }), count);
    const m4 = new THREE.Matrix4(), col = new THREE.Color(C.rack); let i = 0;
    L.racks.forEach(r => { for (let z=1; z<=L.bays; z++) for (let lv=1; lv<=L.levels; lv++){
      const p = W2({x:r.x, z}); m4.makeTranslation(p.x, (lv-1)*levelH, p.z); bayMesh.setMatrixAt(i, m4); bayMesh.setColorAt(i, col);
      const code = r.letter + String(z).padStart(2,"0") + (L.levels>1 ? "-"+lv : "");
      bayIndex.set(code, i); bayCodes[i] = { code, letter:r.letter, bay:z, level:lv }; i++; } });
    world.add(bayMesh);
    // raf dikmeleri
    const post = new THREE.BoxGeometry(0.06, L.levels*levelH, 0.06); post.translate(0, L.levels*levelH/2, 0);
    const posts = new THREE.InstancedMesh(post, new THREE.MeshStandardMaterial({ color:C.post }), L.racks.length*(L.bays+1)*2);
    let j = 0; L.racks.forEach(r => { for (let z=0; z<=L.bays; z++) [-0.47,0.47].forEach(s => { const p = W2({x:r.x, z:z+0.5}); m4.makeTranslation(p.x+s, 0, p.z); posts.setMatrixAt(j++, m4); }); });
    world.add(posts);
    L.racks.forEach(r => { const s = label(r.letter, { bg:"#0B1F3A", ring:"#5B87AD", size:64 }); const p = W2({x:r.x, z:-0.6}); s.position.set(p.x, 0.5, p.z); s.scale.set(0.9,0.9,1); world.add(s); });
    const d = W2(L.depot);
    const dep = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.06,32), new THREE.MeshStandardMaterial({ color:C.depot, emissive:C.depot, emissiveIntensity:0.2 }));
    dep.position.set(d.x, 0.03, d.z); world.add(dep);
    blockGroup = new THREE.Group(); world.add(blockGroup); drawBlocks();
    heat = null; setCamera(camMode, true);
  }

  function drawBlocks(){
    blockGroup.clear();
    const geo = new THREE.BoxGeometry(0.8, 0.5, 0.8); geo.translate(0,0.25,0);
    const mat = new THREE.MeshStandardMaterial({ color:C.block, emissive:C.block, emissiveIntensity:0.3 });
    L.blocked.forEach(k => { const [x,z] = k.split(",").map(Number); const m = new THREE.Mesh(geo, mat); m.position.copy(W2({x,z})); blockGroup.add(m); });
  }

  function recolor(){
    const base = new THREE.Color(C.rack), hot = new THREE.Color(C.pick), tmp = new THREE.Color();
    const c1 = new THREE.Color(C.rack), c2 = new THREE.Color(C.heatMid), c3 = new THREE.Color(C.route);
    let max = 1; if (heat) heat.forEach(v => max = Math.max(max, v));
    bayCodes.forEach((b, i) => {
      if (highlighted.has(b.code)) { bayMesh.setColorAt(i, hot); return; }
      if (heat){ const v = (heat.get(b.letter+String(b.bay).padStart(2,"0"))||0)/max;
        if (v===0) tmp.copy(base).multiplyScalar(0.45); else if (v<0.5) tmp.copy(c1).lerp(c2, v*2); else tmp.copy(c2).lerp(c3, (v-0.5)*2);
        bayMesh.setColorAt(i, tmp); return; }
      bayMesh.setColorAt(i, base);
    });
    bayMesh.instanceColor.needsUpdate = true;
  }
  function highlight(codes){ highlighted = new Set(codes); recolor(); }
  function setHeat(freq){ heat = freq; recolor(); }

  function simplify(pts){
    const s = [pts[0]];
    for (let i=1;i<pts.length-1;i++){ const a=s[s.length-1], b=pts[i], c=pts[i+1];
      const col = (Math.abs(a.x-b.x)<1e-6 && Math.abs(b.x-c.x)<1e-6) || (Math.abs(a.z-b.z)<1e-6 && Math.abs(b.z-c.z)<1e-6);
      if (!col) s.push(b); }
    s.push(pts[pts.length-1]); return s;
  }

  function setRoute(result, seqResult, showLabels){
    if (route){ world.remove(route.mesh); dispose(route.mesh); route = null; }
    if (seqLine){ world.remove(seqLine); dispose(seqLine); seqLine = null; }
    if (picker){ world.remove(picker); picker = null; }
    pinSprites.forEach(s => world.remove(s)); pinSprites = [];
    if (!result || result.path.length < 2) return;
    const simp = simplify(result.path.map(W2));
    const curve = new THREE.CurvePath();
    for (let i=0;i<simp.length-1;i++){ const a = simp[i].clone().setY(0.09), b = simp[i+1].clone().setY(0.09); if (a.distanceTo(b)>1e-6) curve.add(new THREE.LineCurve3(a,b)); }
    const segs = Math.max(8, result.moves*10), radial = 8;
    const geo = new THREE.TubeGeometry(curve, segs, 0.08, radial, false); geo.setDrawRange(0,0);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color:C.route, emissive:C.route, emissiveIntensity:0.35 }));
    world.add(mesh); route = { mesh, curve, segs, radial };
    if (seqResult && seqResult.path){
      const pts = simplify(seqResult.path.map(W2)).map(p => p.clone().setY(0.04));
      seqLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color:C.seq, dashSize:0.35, gapSize:0.2, transparent:true, opacity:0.8 }));
      seqLine.computeLineDistances(); world.add(seqLine);
    }
    // toplayıcı: gövde + baş (tek renk) ve önünde toplama arabası
    picker = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color:C.picker, roughness:0.5 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.9,20), mat); body.position.y = 0.45;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17,20,16), mat); head.position.y = 1.08;
    const cart = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.35,0.6), new THREE.MeshStandardMaterial({ color:C.cart, roughness:0.8 })); cart.position.set(0,0.3,0.55);
    picker.add(body, head, cart); world.add(picker); picker.position.copy(curve.getPointAt(0)).setY(0);
    if (showLabels) result.arrive.forEach((a, k) => {
      const s = label(String(k+1), { bg:"#0B1F3A", fg:"#CBE6F6", ring:"#9CCBEA", size:60 });
      const p = W2(a.stop.cell); s.position.set(p.x, L.levels*levelH + 0.4, p.z); s.scale.set(0.75,0.75,1); world.add(s); pinSprites.push(s);
    });
  }
  function markDone(k){
    const s = pinSprites[k]; if (!s || s.userData.done) return; s.userData.done = true;
    const next = label(String(k+1), { bg:"#F4A27A", fg:"#0B1F3A", size:60 });
    s.material.map.dispose(); s.material.map = next.material.map; s.material.needsUpdate = true;
  }
  function setProgress(p){
    if (!route) return; p = Math.min(1, Math.max(0,p));
    route.mesh.geometry.setDrawRange(0, Math.floor(p*route.segs)*route.radial*6);
    if (picker){ const pos = route.curve.getPointAt(p).setY(0);
      if (p < 0.999){ const ahead = route.curve.getPointAt(Math.min(1,p+0.004)).setY(0); const d = ahead.clone().sub(pos); if (d.lengthSq()>1e-8) picker.rotation.y = Math.atan2(d.x, d.z) + Math.PI; }
      picker.position.copy(pos); }
  }

  function setCamera(mode, snap){
    camMode = mode; const span = Math.max(L.W, L.H) * Math.max(1, 1/camera.aspect); // dikey sahnede (telefon) geri çekil
    if (mode === "iso"){ camera.position.set(span*0.15, span*0.95, span*1.05); controls.target.set(0,0,0); }
    else if (mode === "top"){ camera.position.set(0, span*1.6, 0.01); controls.target.set(0,0,0); }
    controls.update();
  }
  const followTarget = new THREE.Vector3();
  function followTick(){
    if (camMode !== "follow" || !picker) return;
    followTarget.copy(picker.position).setY(0.6);
    controls.target.lerp(followTarget, 0.08);
    const want = followTarget.clone().add(new THREE.Vector3(3.5, 4.5, 5.5));
    camera.position.lerp(want, 0.06);
  }

  // tıklama: göz veya zemin karesi
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null, onPick = null;
  canvas.addEventListener("pointerdown", e => { down = { x:e.clientX, y:e.clientY, t:performance.now() }; });
  canvas.addEventListener("pointerup", e => {
    if (!down || !onPick) return; const moved = Math.hypot(e.clientX-down.x, e.clientY-down.y); const dt = performance.now()-down.t; down = null;
    if (moved > 6 || dt > 600) return;
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
    ray.setFromCamera(ndc, camera);
    const hit = bayMesh ? ray.intersectObject(bayMesh)[0] : null;
    if (hit && hit.instanceId !== undefined){ onPick({ kind:"bay", ...bayCodes[hit.instanceId] }); return; }
    const pt = new THREE.Vector3(); if (ray.ray.intersectPlane(floorPlane, pt)){ const c = toCell(pt); if (c.x>=0 && c.z>=0 && c.x<L.W && c.z<L.H) onPick({ kind:"cell", ...c }); }
  });

  let fitted = false; // ilk ölçüde kamera sahnenin en-boy oranına göre yeniden konur
  function resize(){ const r = canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width/Math.max(1,r.height); camera.updateProjectionMatrix();
    if (L && !fitted && r.width > 0){ fitted = true; if (camMode !== "follow") setCamera(camMode); } }
  new ResizeObserver(resize).observe(canvas.parentElement);
  const tickers = [];
  (function loop(t){ requestAnimationFrame(loop); tickers.forEach(f => f(t)); followTick(); controls.update(); renderer.render(scene, camera); })(0);

  return { ok:true, buildWarehouse, highlight, setHeat, setRoute, setProgress, markDone, setCamera, drawBlocks, onTick:f => tickers.push(f), onPick:f => onPick = f };
}

export const Scene3D = (() => {
  const canvas = document.getElementById("scene");
  if (!THREE || !THREE.OrbitControls || !canvas) return bosSahne();
  try { return kur(canvas); } catch { return bosSahne(); }
})();
