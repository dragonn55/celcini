/* ROTA 3D · ROUTER — BFS mesafe matrisi + TSP (≤12 durak Held-Karp, fazlası NN + 2-opt)
   DOM'suz; scripts/rota-test.mjs Node'da test eder. */
import { Layout } from "./layout.js";

export const Router = {
  bfs(L, s){
    const dist = Array.from({length:L.W}, () => new Array(L.H).fill(Infinity));
    const prev = Array.from({length:L.W}, () => new Array(L.H).fill(null));
    dist[s.x][s.z] = 0; const q = [s];
    for (let i = 0; i < q.length; i++){
      const c = q[i];
      for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx = c.x+dx, nz = c.z+dz;
        if (!Layout.isWalk(L,nx,nz) || dist[nx][nz]!==Infinity) continue;
        dist[nx][nz] = dist[c.x][c.z]+1; prev[nx][nz] = c; q.push({x:nx,z:nz});
      }
    }
    return { dist, prev };
  },
  trace(tree, t){ const out=[]; let c=t; while(c){ out.push(c); c=tree.prev[c.x][c.z]; } return out.reverse(); },
  groupStops(picks){
    const stops = [];
    picks.forEach(p => {
      let s = stops.find(s => s.cell.x===p.cell.x && s.cell.z===p.cell.z);
      if (!s){ s = { cell:p.cell, codes:[], picks:[] }; stops.push(s); }
      s.codes.push(p.code); s.picks.push(p);
    });
    return stops;
  },
  /* mode: "opt" (ROTA) | "seq" (liste sırası) */
  solve(L, picks, mode="opt"){
    const stops = this.groupStops(picks);
    const nodes = [L.depot, ...stops.map(s => s.cell)];
    const trees = nodes.map(n => this.bfs(L, n));
    const D = nodes.map((_,i) => nodes.map(b => trees[i].dist[b.x][b.z]));
    const unreachable = stops.filter((s,i) => D[0][i+1] === Infinity).map(s => s.codes.join("+"));
    if (unreachable.length) return { error: `Ulaşılamayan göz: ${unreachable.join(", ")} — engeller yolu kapatıyor.` };
    const n = nodes.length; let tour, method;
    if (mode === "seq"){ tour = [0, ...stops.map((_,i)=>i+1), 0]; method = "Liste sırasıyla toplama"; }
    else if (n-1 <= 12){ tour = this.heldKarp(D); method = "Kesin en kısa rota (Held-Karp)"; }
    else { tour = this.twoOpt(D, this.nearest(D)); method = "Yaklaşık en kısa rota (en yakın komşu + 2-opt)"; }
    const path = [nodes[0]], arrive = [];
    for (let i = 0; i < tour.length-1; i++){
      const seg = this.trace(trees[tour[i]], nodes[tour[i+1]]);
      path.push(...seg.slice(1));
      if (tour[i+1] !== 0) arrive.push({ stop: stops[tour[i+1]-1], at: path.length-1 });
    }
    return { path, arrive, moves: path.length-1, method, stopCount: stops.length, itemCount: picks.length, mode };
  },
  heldKarp(D){
    const m = D.length-1; if (m===0) return [0,0];
    const FULL = 1<<m, dp = new Float64Array(FULL*m).fill(Infinity), par = new Int8Array(FULL*m).fill(-1);
    for (let j=0;j<m;j++) dp[(1<<j)*m+j] = D[0][j+1];
    for (let S=1;S<FULL;S++) for (let j=0;j<m;j++){
      if (!(S&(1<<j))) continue; const cur = dp[S*m+j]; if (cur===Infinity) continue;
      for (let k=0;k<m;k++){ if (S&(1<<k)) continue;
        const T = S|(1<<k), v = cur + D[j+1][k+1];
        if (v < dp[T*m+k]){ dp[T*m+k] = v; par[T*m+k] = j; } }
    }
    let best = Infinity, last = -1;
    for (let j=0;j<m;j++){ const v = dp[(FULL-1)*m+j] + D[j+1][0]; if (v<best){best=v;last=j;} }
    const order = []; let S = FULL-1, j = last;
    while (j !== -1){ order.push(j+1); const pj = par[S*m+j]; S &= ~(1<<j); j = pj; }
    return [0, ...order.reverse(), 0];
  },
  nearest(D){
    const n = D.length, used = new Array(n).fill(false), t = [0]; used[0] = true;
    for (let s=1;s<n;s++){ const c = t[t.length-1]; let b=-1;
      for (let j=1;j<n;j++) if (!used[j] && (b<0 || D[c][j]<D[c][b])) b=j;
      used[b]=true; t.push(b); }
    t.push(0); return t;
  },
  twoOpt(D, t){
    let improved = true;
    while (improved){ improved = false;
      for (let i=1;i<t.length-2;i++) for (let k=i+1;k<t.length-1;k++){
        const d = D[t[i-1]][t[k]] + D[t[i]][t[k+1]] - D[t[i-1]][t[i]] - D[t[k]][t[k+1]];
        if (d < -1e-9){ t = t.slice(0,i).concat(t.slice(i,k+1).reverse(), t.slice(k+1)); improved = true; }
      } }
    return t;
  },
  /* Adım adım talimat: yön değişimlerine göre parçala, duraklarda böl */
  steps(L, r){
    const out = []; if (!r || !r.path || r.path.length < 2) return out;
    const stopAt = new Map(r.arrive.map((a,k) => [a.at, {k, stop:a.stop}]));
    let heading = null, run = 0, i = 1, moveIdx = 0;
    const name = (h) => ({ "0,1":"arkaya", "0,-1":"öne", "1,0":"sağa", "-1,0":"sola" })[h];
    const turn = (from, to) => {
      if (!from) return "↑"; if (from===to) return "↑";
      const [fx,fz] = from.split(",").map(Number), [tx,tz] = to.split(",").map(Number);
      const cross = fx*tz - fz*tx; return cross > 0 ? "↱" : cross < 0 ? "↰" : "↓";
    };
    const flush = () => { if (run>0){ out.push({ type:"move", arr: turn(prevHeading, heading), text:`${name(heading)} ${run} göz`, cells:run, at: moveIdx }); } run = 0; };
    let prevHeading = null;
    for (; i < r.path.length; i++){
      const a = r.path[i-1], b = r.path[i], h = (b.x-a.x)+","+(b.z-a.z);
      if (h !== heading){ flush(); prevHeading = heading; heading = h; }
      run++; moveIdx = i;
      if (stopAt.has(i)){ flush(); const s = stopAt.get(i);
        const lvl = s.stop.picks.filter(p=>p.level>1).length;
        out.push({ type:"stop", k:s.k, text:`Durak ${s.k+1}: ${s.stop.codes.join(" + ")}`, sub: `${s.stop.picks.map(p=>p.rack.letter).filter((v,i,a)=>a.indexOf(v)===i).join("/")} rafı${lvl?` · ${lvl} ürün üst katta`:""}`, at:i });
        prevHeading = heading; }
    }
    flush();
    out.push({ type:"end", text:"Sevkiyata dön", at: r.path.length-1 });
    return out;
  }
};
