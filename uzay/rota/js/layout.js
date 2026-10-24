/* ROTA 3D · LAYOUT — depo ızgarası ve raf kodları (DOM'suz; scripts/rota-test.mjs Node'da da yükler)
   x: koridor | raf | raf | koridor | raf | raf | koridor ...
   z: 0 = ön ara koridor (sevkiyat), 1..L = gözler, L+1 = arka ara koridor */
export const Layout = {
  build(pairs, bays, levels, depotPos){
    const W = 1 + 3*pairs, H = bays + 2;
    const walk = Array.from({length:W}, () => new Array(H).fill(true));
    const racks = [];
    for (let k = 0; k < pairs*2; k++){
      const p = Math.floor(k/2), x = 1 + 3*p + (k%2);
      racks.push({ letter: String.fromCharCode(65+k), x, aisleX: (k%2===0) ? x-1 : x+1 });
      for (let z = 1; z <= bays; z++) walk[x][z] = false;
    }
    const dx = depotPos==="center" ? 3*Math.floor(pairs/2) : depotPos==="right" ? W-1 : 0;
    return { W, H, pairs, bays, levels, walk, racks, depot:{x:dx, z:0}, blocked:new Set() };
  },
  key(x,z){ return x+","+z; },
  isWalk(L, x, z){ return x>=0 && z>=0 && x<L.W && z<L.H && L.walk[x][z] && !L.blocked.has(this.key(x,z)); },
  toggleBlock(L, x, z){
    if (!L.walk[x][z] || (x===L.depot.x && z===L.depot.z)) return false;
    const k = this.key(x,z); L.blocked.has(k) ? L.blocked.delete(k) : L.blocked.add(k); return true;
  },
  parseCode(tok, L){
    const m = tok.toUpperCase().match(/^([A-Z])-?0*(\d{1,3})(?:[-\/K]0*(\d))?$/);
    if (!m) return null;
    const rack = L.racks.find(r => r.letter === m[1]); const bay = +m[2]; const level = m[3] ? +m[3] : 1;
    if (!rack || bay<1 || bay>L.bays || level<1 || level>L.levels) return null;
    const code = m[1] + String(bay).padStart(2,"0") + (L.levels>1 ? "-"+level : "");
    return { code, rack, bay, level, cell:{x:rack.aisleX, z:bay} };
  },
  parsePicks(text, L){
    const ok = [], bad = [];
    text.split(/[\s,;]+/).filter(Boolean).forEach(tok => {
      const p = this.parseCode(tok, L);
      if (!p){ bad.push(tok); return; }
      if (!ok.some(o => o.code === p.code)) ok.push(p);
    });
    return { ok, bad };
  }
};

/* ısı haritası: sipariş geçmişinden göz frekansı */
export const Heat = {
  count(text, L){
    const freq = new Map();
    text.split(/\n/).forEach(line => line.split(/[\s,;]+/).filter(Boolean).forEach(tok => {
      const p = Layout.parseCode(tok, L); if (!p) return;
      const key = p.rack.letter + String(p.bay).padStart(2,"0");
      freq.set(key, (freq.get(key)||0)+1);
    }));
    return freq;
  }
};
