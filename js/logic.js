/* Grok Heist Crew - level logic: parse maps, collision/vision grids, BFS + A* (no THREE; also runs in node for map checks) */
(function () {
  'use strict';
  const GH = window.GH = window.GH || {};
  const D = GH.D, C = D.CELL;
  const LG = GH.LG = {};
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  LG.N4 = N4;
  LG.wx = (cx) => cx * C + C / 2; LG.cx = (wx) => Math.floor(wx / C);

  LG.parse = function (def) {
    const W = def.W, H = def.H, map = def.map;
    const P = { def, W, H, ch: [], room: [], vents: [], lasers: [], cams: [], loot: [], big: [], crates: [], levers: [], secret: [], sky: [], roofPts: [], locks: [], target: null, start: null, exit: null, deco: [], roofCell: [], rooms: [] };
    for (let z = 0; z < H; z++) { P.ch.push(map[z].split('')); P.room.push(new Array(W).fill(-1)); P.deco.push(new Array(W).fill(0)); P.roofCell.push(new Array(W).fill(false)); }
    def.rooms.forEach((r, i) => { P.rooms.push({ i, name: r[0], x0: r[1], z0: r[2], x1: r[3], z1: r[4], kind: r[5], floor: r[6], wall: r[7], open: !!r[8] });
      for (let z = r[2] + 1; z < r[4]; z++) for (let x = r[1] + 1; x < r[3]; x++) P.room[z][x] = i;
      if (!r[8]) for (let z = r[2]; z <= r[4]; z++) for (let x = r[1]; x <= r[3]; x++) P.roofCell[z][x] = true; });
    const vmap = {}; let li = 0, bi = 0;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const c = P.ch[z][x];
      if (c >= '1' && c <= '9') { (vmap[c] = vmap[c] || []).push([x, z]); P.ch[z][x] = '.'; }
      else if (c === 'c') { P.cams.push({ id: P.cams.length, x, z }); P.ch[z][x] = '.'; }
      else if (c === 'b') { P.loot.push({ id: 'b' + (li++), x, z, big: false }); P.ch[z][x] = '.'; }
      else if (c === 'B') { const bd = (def.big || [])[bi] || { name: 'Big Loot', model: 'chest', v: 120 }; P.loot.push({ id: 'B' + bi, x, z, big: true, name: bd.name, model: bd.model, v: bd.v }); bi++; P.ch[z][x] = '.'; }
      else if (c === 'T') { P.target = { x, z }; P.ch[z][x] = '.'; }
      else if (c === 'C') { P.crates.push({ id: P.crates.length, x, z, x0: x, z0: z }); P.ch[z][x] = '.'; }
      else if (c === 'l') { P.levers.push({ x, z }); P.ch[z][x] = '.'; }
      else if (c === 'K') { P.sky.push({ x, z }); P.ch[z][x] = '.'; }
      else if (c === 'R') { P.roofPts.push({ x, z }); P.ch[z][x] = ' '; }
      else if (c === 'E') { P.start = { x, z }; P.ch[z][x] = P.room[z][x] >= 0 ? '.' : ' '; }
      else if (c === 'X') { P.exit = { x, z }; P.ch[z][x] = ' '; }
      else if (c === 'S') P.secret.push({ x, z });
    }
    Object.keys(vmap).forEach((k) => { const v = vmap[k]; if (v.length === 2) P.vents.push({ id: P.vents.length, a: v[0], b: v[1] }); });
    // locked doors: group adjacent L cells
    const seenL = {};
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (P.ch[z][x] === 'L' && !seenL[x + ',' + z]) { const cells = []; flood(x, z, 'L', cells, seenL); P.locks.push({ id: P.locks.length, cells }); }
    const seenZ = {};
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (P.ch[z][x] === 'Z' && !seenZ[x + ',' + z]) { const cells = []; flood(x, z, 'Z', cells, seenZ); const blink = (def.blink || []).some((b) => cells.some((c) => c[0] === b[0] && c[1] === b[1])); P.lasers.push({ id: P.lasers.length, cells, blink }); }
    function flood(x0, z0, ch, out, seen) { const st = [[x0, z0]]; seen[x0 + ',' + z0] = 1; while (st.length) { const [x, z] = st.pop(); out.push([x, z]); N4.forEach(([dx, dz]) => { const nx = x + dx, nz = z + dz; if (nx >= 0 && nz >= 0 && nx < W && nz < H && P.ch[nz][nx] === ch && !seen[nx + ',' + nz]) { seen[nx + ',' + nz] = 1; st.push([nx, nz]); } }); } }
    P.laserAt = {}; P.lasers.forEach((g) => g.cells.forEach((c) => { P.laserAt[c[0] + ',' + c[1]] = g.id; }));
    P.lockAt = {}; P.locks.forEach((g) => g.cells.forEach((c) => { P.lockAt[c[0] + ',' + c[1]] = g.id; }));
    // camera facing: away from adjacent walls
    P.cams.forEach((c) => { let dx = 0, dz = 0; N4.forEach(([ax, az]) => { if (LG.isWallCh(P.ch[c.z + az] && P.ch[c.z + az][c.x + ax])) { dx -= ax; dz -= az; } }); if (!dx && !dz) dz = 1; c.yaw = Math.atan2(dx, dz); c.wall = [-Math.sign(dx), -Math.sign(dz)]; });
    // building bounding box
    let bx0 = W, bz0 = H, bx1 = 0, bz1 = 0; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (P.ch[z][x] === '#') { bx0 = Math.min(bx0, x); bz0 = Math.min(bz0, z); bx1 = Math.max(bx1, x); bz1 = Math.max(bz1, z); }
    P.bbox = [bx0, bz0, bx1, bz1];
    P.state = { locks: {}, lasers: {}, cams: {}, crates: {}, secret: false, loot: {}, target: 'home', mirrors: {} };
    return P;
  };
  LG.isWallCh = (c) => c === '#' || c === 'L' || c === 'S' || c === 'G';
  LG.inside = (P, x, z) => x >= 0 && z >= 0 && x < P.W && z < P.H;
  LG.crateAt = (P, x, z) => P.crates.find((c) => { const s = P.state.crates[c.id]; const cx = s ? s[0] : c.x, cz = s ? s[1] : c.z; return cx === x && cz === z; });
  // walk-blocking for heroes (and guards: guard=true ignores nothing extra)
  LG.solid = function (P, x, z) {
    if (!LG.inside(P, x, z)) return true;
    const c = P.ch[z][x];
    if (c === '#' || c === 'G' || c === '=' || c === '~' || c === 'w') return true;
    if (c === 'L') return !P.state.locks[P.lockAt[x + ',' + z]];
    if (c === 'S') return !P.state.secret;
    if (P.deco[z][x]) return true;
    if (P.exit && x === P.exit.x && z === P.exit.z) return true;
    if (P.crates.length && LG.crateAt(P, x, z)) return true;
    return false;
  };
  LG.opaque = function (P, x, z) {
    if (!LG.inside(P, x, z)) return true;
    const c = P.ch[z][x];
    if (c === '#') return true;
    if (c === 'L') return !P.state.locks[P.lockAt[x + ',' + z]];
    if (c === 'S') return !P.state.secret;
    if (P.deco[z][x] === 2) return true;
    if (P.crates.length && LG.crateAt(P, x, z)) return true;
    return false;
  };
  // line of sight in world coords (grid DDA)
  LG.los = function (P, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz); const n = Math.ceil(d / (C * 0.25));
    let lx = -1, lz = -1;
    for (let i = 1; i < n; i++) { const t = i / n, cx = Math.floor((ax + dx * t) / C), cz = Math.floor((az + dz * t) / C); if (cx === lx && cz === lz) continue; lx = cx; lz = cz; if (LG.opaque(P, cx, cz)) return false; }
    return true;
  };
  // distance a ray travels before hitting an opaque cell
  LG.ray = function (P, ax, az, ang, max) {
    const sx = Math.sin(ang), sz = Math.cos(ang), st = C * 0.2;
    for (let d = st; d < max; d += st) { const cx = Math.floor((ax + sx * d) / C), cz = Math.floor((az + sz * d) / C); if (LG.opaque(P, cx, cz)) return Math.max(0, d - st * 0.5); }
    return max;
  };
  // BFS over walkable cells; opts.pass(x,z) overrides
  LG.bfs = function (P, sx, sz, pass) {
    const seen = new Uint8Array(P.W * P.H), q = [[sx, sz]]; seen[sz * P.W + sx] = 1; let n = 0;
    for (let qi = 0; qi < q.length; qi++) { const [x, z] = q[qi]; n++; N4.forEach(([dx, dz]) => { const nx = x + dx, nz = z + dz; if (!LG.inside(P, nx, nz) || seen[nz * P.W + nx]) return; if (!pass(nx, nz)) return; seen[nz * P.W + nx] = 1; q.push([nx, nz]); }); }
    seen.count = n; return seen;
  };
  // A* for guards (4-neighbour + diagonals when free)
  LG.path = function (P, sx, sz, tx, tz, blocked) {
    if (sx === tx && sz === tz) return [[tx, tz]];
    const W = P.W, H = P.H, key = (x, z) => z * W + x, g = new Float32Array(W * H).fill(1e9), from = new Int32Array(W * H).fill(-1), closed = new Uint8Array(W * H);
    const open = [[sx, sz, 0]]; g[key(sx, sz)] = 0;
    const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let it = 0;
    while (open.length && it++ < 4000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][2] < open[bi][2]) bi = i;
      const [x, z] = open.splice(bi, 1)[0]; const k = key(x, z); if (closed[k]) continue; closed[k] = 1;
      if (x === tx && z === tz) { const out = []; let c = k; while (c !== -1) { out.push([c % W, Math.floor(c / W)]); c = from[c]; } return out.reverse(); }
      for (const [dx, dz, cost] of DIRS) { const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue; if (blocked(nx, nz)) continue; if (dx && dz && (blocked(x + dx, z) || blocked(x, z + dz))) continue;
        const nk = key(nx, nz), ng = g[k] + cost; if (ng < g[nk]) { g[nk] = ng; from[nk] = k; open.push([nx, nz, ng + Math.hypot(tx - nx, tz - nz)]); } }
    }
    return null;
  };
  // static connectivity used while placing decor (doors/crates/lasers count as passable, gaps/counters don't)
  LG.layoutPass = (P) => (x, z) => { const c = P.ch[z][x]; if (c === '#' || c === 'G' || c === '=' || c === '~' || c === 'w') return false; if (P.deco[z][x]) return false; if (P.exit && x === P.exit.x && z === P.exit.z) return false; return true; };
  // cells that must stay clear of decor
  LG.reserved = function (P) {
    const r = {}; const add = (x, z, rad) => { for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) r[(x + dx) + ',' + (z + dz)] = 1; };
    for (let z = 0; z < P.H; z++) for (let x = 0; x < P.W; x++) { const c = P.ch[z][x]; if (c === 'D' || c === 'L' || c === 'S' || c === 'Z' || c === '=' || c === '~') add(x, z, 1); }
    P.vents.forEach((v) => { add(v.a[0], v.a[1], 1); add(v.b[0], v.b[1], 1); });
    P.cams.forEach((c) => add(c.x, c.z, 0)); P.loot.forEach((l) => add(l.x, l.z, l.big ? 1 : 0)); P.crates.forEach((c) => add(c.x, c.z, 1)); P.levers.forEach((l) => add(l.x, l.z, 1)); P.sky.forEach((s) => add(s.x, s.z, 1));
    if (P.target) add(P.target.x, P.target.z, 1); if (P.start) add(P.start.x, P.start.z, 2); if (P.exit) add(P.exit.x, P.exit.z, 2); P.roofPts.forEach((p) => add(p.x, p.z, 1));
    (P.def.guards || []).forEach((gd) => { if (Array.isArray(gd)) { gd.forEach((w) => add(w[0], w[1], 0)); for (let i = 0; i < gd.length; i++) { const a = gd[i], b = gd[(i + 1) % gd.length]; const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (let k = 0; k <= n; k++) { const x = Math.round(a[0] + (b[0] - a[0]) * k / Math.max(1, n)), z = Math.round(a[1] + (b[1] - a[1]) * k / Math.max(1, n)); r[x + ',' + z] = 1; } } } else add(gd.at[0], gd.at[1], 1); });
    (P.def.stations || []).forEach((s) => add(s.x, s.z, 2));
    return r;
  };
})();
