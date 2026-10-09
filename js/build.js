/* Grok Heist Crew - builds a level scene: floors, walls, doors, facades, roofs, decor, exteriors, sky + lights */
(function () {
  'use strict';
  const GH = window.GH, U = GH.U, M = GH.M, D = GH.D, LG = GH.LG, PR = GH.PR, T = THREE;
  const C = D.CELL, WH = D.WALL_H, RH = D.ROOF_H;
  const wx = LG.wx;
  const THEME = {
    hideout: { facade: '#e07a52', trim: '#fff3e0', roof: '#56607a', base: '#8a3f2a', ext: 'park', win: 'square' },
    candy: { facade: '#ff8fd0', trim: '#ffffff', roof: '#fff1f7', base: '#d9468f', ext: 'candy', gap: 'choco', win: 'round' },
    museum: { facade: '#f2e9da', trim: '#d6c39c', roof: '#7287b8', base: '#b9a27e', ext: 'plaza', win: 'arch' },
    ship: { facade: '#ffffff', trim: '#1e3a8a', roof: '#e3b47c', base: '#1e3a8a', ext: 'dock', gap: 'pool', win: 'porthole' },
    castle: { facade: '#ece6ff', trim: '#ffd23f', roof: '#a593ff', base: '#c4b5fd', ext: 'clouds', gap: 'sky', win: 'arch' },
    toys: { facade: '#ffcf33', trim: '#ef4444', roof: '#3b82f6', base: '#2563eb', ext: 'night', gap: 'balls', win: 'square' }
  };
  GH.THEME = THEME;
  const SKIES = {
    day: { top: '#2f8ff0', hor: '#c4ecff', sun: '#fff1d6', si: 1.35, hs: '#e3f4ff', hg: '#a6d98a', hi: 0.72, fog: '#cdeeff' },
    sunset: { top: '#5560d6', hor: '#ffb78e', sun: '#ffd1a0', si: 1.25, hs: '#ffe2cf', hg: '#9aa47a', hi: 0.75, fog: '#f5c9b0' },
    sky: { top: '#4f9dff', hor: '#ffe3f6', sun: '#fffaf0', si: 1.3, hs: '#ffffff', hg: '#eadcff', hi: 0.8, fog: '#f4e8ff' },
    night: { top: '#121845', hor: '#4b4aa0', sun: '#c2ccff', si: 0.85, hs: '#b8c2ff', hg: '#5a4d8a', hi: 0.95, fog: '#2c2f6c' }
  };
  const DECOR = {
    plan: { W: ['bookshelf', 'cabinet', 'plant', 'lockers'], H: ['chalkboard', 'poster', 'clock'] },
    glab: { W: ['workbench', 'gadgetRack', 'crateStack', 'plant'], H: ['toolwall', 'poster', 'sconce'] },
    lounge: { W: ['sofa', 'tv', 'arcade', 'plant', 'bookshelf'], H: ['poster', 'painting'], rug: 1 },
    trophy: { W: ['plant'], H: ['banner', 'sconce'], rug: 1 },
    garage: { W: ['tireStack', 'gasPump', 'workbench', 'crateStack', 'punchBag'], H: ['toolwall'] },
    taffy: { W: ['taffy', 'candyVat', 'sacks', 'gumballMachine'], C: ['candyCane', 'lollipop', 'cupcake'], H: ['poster', 'pipes'] },
    wrap: { W: ['wrapMachine', 'conveyor', 'sacks', 'crateStack'], C: ['conveyor', 'candyVat'], H: ['clock', 'poster'] },
    vault: { W: ['gumballMachine', 'sacks', 'lollipop'], H: ['sconce'] },
    storage: { W: ['crateStack', 'barrel', 'sacks', 'cabinet'], C: ['crateStack', 'barrel'], H: ['pipes'] },
    river: { W: ['lollipop', 'candyCane', 'cupcake', 'plant'], H: ['sconce', 'poster'] },
    office: { W: ['desk', 'bookshelf', 'cabinet', 'plant', 'cooler'], C: ['table'], H: ['painting', 'clock'] },
    lobby: { W: ['sofa', 'plant', 'gumballMachine', 'lollipop'], H: ['painting', 'poster'], rug: 1 },
    security: { W: ['monitorDesk', 'cabinet', 'cooler', 'lockers'], H: ['clock', 'poster'] },
    gems: { W: ['pedestal', 'ropePosts', 'pedestal'], H: ['painting', 'sconce'] },
    space: { W: ['planet', 'rocket', 'pedestal'], C: ['planet'], H: ['poster'] },
    dino: { W: ['pedestal', 'plant', 'bench'], H: ['painting', 'banner'] },
    art: { W: ['bench', 'pedestal', 'plant'], H: ['painting'] },
    entrance: { W: ['plant', 'bench', 'column'], C: ['column'], H: ['banner', 'painting'], rug: 1 },
    egypt: { W: ['sarcophagus', 'pyramid', 'pedestal'], C: ['pyramid'], H: ['banner', 'sconce'] },
    buffet: { W: ['buffet', 'plant'], C: ['table'], H: ['painting', 'porthole'] },
    deck: { W: ['deckChair', 'umbrella', 'deckChair', 'palm'], H: ['lifebuoy'] },
    captain: { W: ['bookshelf', 'helm', 'plant', 'cabinet'], C: ['mapTable'], H: ['porthole', 'painting'], rug: 1 },
    cabin: { W: ['bed', 'plant', 'cabinet'], H: ['porthole', 'painting'] },
    hall: { W: ['plant'], H: ['porthole', 'painting', 'sconce'] },
    atrium: { W: ['piano', 'plant', 'sofa', 'bench'], C: ['plant'], H: ['painting', 'sconce'], rug: 1 },
    engine: { W: ['boiler', 'barrel', 'crateStack'], C: ['boiler'], H: ['pipes'] },
    treasury: { W: ['sacks', 'pedestal', 'armor'], H: ['banner', 'sconce'] },
    tower: { W: ['armor', 'bookshelf', 'plant', 'cauldron'], H: ['banner', 'sconce'] },
    ghall: { W: ['pillar', 'armor', 'throne', 'pillar'], H: ['banner', 'sconce'], rug: 1 },
    library: { W: ['bookshelf', 'bookshelf', 'readTable'], C: ['readTable'], H: ['sconce'] },
    court: { W: ['cloudBush', 'bench', 'pillar'], C: ['cloudBush'] },
    kitchen: { W: ['oven', 'cauldron', 'buffet', 'barrel'], C: ['table'], H: ['pipes', 'clock'] },
    stock: { W: ['crateStack', 'toyShelf', 'gifts'], H: ['poster'] },
    lab: { W: ['workbench', 'robotDisplay', 'cabinet'], H: ['poster', 'chalkboard'] },
    plush: { W: ['plushPile', 'toyShelf', 'horse'], C: ['plushPile'], H: ['poster'] },
    blocks: { W: ['toyShelf', 'trainTable', 'gifts'], C: ['trainTable'], H: ['poster'] },
    games: { W: ['arcade', 'arcade', 'toyShelf'], C: ['arcade'], H: ['poster'] },
    giftwrap: { W: ['gifts', 'gifts', 'crateStack'], H: ['poster'] },
    showroom: { W: ['toyShelf', 'robotDisplay', 'plushPile', 'ballBin', 'horse', 'gifts'], C: ['robotDisplay', 'ballBin', 'trainTable'], H: ['poster', 'clock'] }
  };
  const FLOOR = { tile: ['taffy', 'wrap', 'river', 'lobby', 'entrance', 'art', 'atrium', 'kitchen', 'showroom', 'lab', 'glab', 'vault', 'egypt', 'space', 'security', 'court', 'ghall', 'treasury'], wood: ['storage', 'office', 'buffet', 'deck', 'cabin', 'captain', 'library', 'plan', 'lounge', 'blocks', 'plush', 'tower', 'stock', 'dino', 'giftwrap', 'garage'], carpet: ['hall', 'games', 'trophy', 'gems', 'engine'] };
  const floorStyle = (k) => FLOOR.wood.includes(k) ? 'wood' : FLOOR.carpet.includes(k) ? 'carpet' : 'tile';
  const pale = (c, k) => { const a = new T.Color(c), b = new T.Color('#ffffff'); a.lerp(b, k); return '#' + a.getHexString(); };

  GH.Build = function (def, opt) {
    opt = opt || {}; const low = !!opt.low; M.low = low;
    const P = LG.parse(def), th = THEME[def.id] || THEME.hideout;
    const scene = new T.Scene();
    const S = new M.B(), Rf = new M.B(), FL = new M.B(); // static, roof (hidden inside), floors
    const L = { def, P, scene, th, low, dyn: { locks: [], lasers: [], cams: [], crates: [], secret: [], levers: [], loot: {}, target: null, vehicle: null, sky: [], roofPts: [] }, anim: [] };
    const W = P.W, H = P.H;
    const ch = (x, z) => (x < 0 || z < 0 || x >= W || z >= H) ? 'O' : P.ch[z][x];
    const isWall = (x, z) => ch(x, z) === '#';
    const isOut = (x, z) => { const c = ch(x, z); return c === ' ' || c === 'w' || c === 'O'; };
    const roomOf = (x, z) => { let r = P.room[z] && P.room[z][x]; if (r >= 0) return P.rooms[r]; for (const [dx, dz] of LG.N4) { const q = P.room[z + dz] && P.room[z + dz][x + dx]; if (q >= 0) return P.rooms[q]; } return null; };
    const rnd = (a, b) => U.hash(a * 31 + 7, b * 17 + def.id.length);

    /* ---------- environment ---------- */
    const sk = SKIES[def.sky] || SKIES.day; L.sky = sk;
    scene.background = new T.Color(sk.hor); scene.fog = new T.Fog(sk.fog, low ? 60 : 80, low ? 170 : 230);
    const dome = new T.Mesh(new T.SphereGeometry(400, 24, 12), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new T.Color(sk.top) }, hor: { value: new T.Color(sk.hor) } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying vec3 vD; void main(){ float h = max(vD.y, 0.0); gl_FragColor = vec4(mix(hor, top, pow(h, 0.6)), 1.0); }' }));
    dome.renderOrder = -10; scene.add(dome); L.dome = dome;
    const hemi = new T.HemisphereLight(sk.hs, def.water ? '#a9dcf2' : sk.hg, sk.hi * 0.62); scene.add(hemi);
    const sun = new T.DirectionalLight(sk.sun, sk.si * 0.6); sun.position.set(30, 50, 22); scene.add(sun); scene.add(sun.target); L.sun = sun; L.sunOff = new T.Vector3(18, 34, 14);
    sun.castShadow = !low; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
    const fill = new T.DirectionalLight(def.sky === 'night' ? '#ff9ae8' : '#ffffff', def.sky === 'night' ? 0.35 : 0.3); fill.position.set(-20, 18, -30); scene.add(fill);
    if (def.sky === 'night') { // stars + moon
      const n = 600, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.3; pos[i * 3] = Math.cos(a) * Math.cos(e) * 380; pos[i * 3 + 1] = Math.sin(e) * 380; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 380; }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); scene.add(new T.Points(g, new T.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false })));
      const moon = new T.Mesh(new T.SphereGeometry(18, 20, 14), new T.MeshBasicMaterial({ color: '#fff7d6', fog: false })); moon.position.set(-150, 170, -260); scene.add(moon);
    }
    // sky clouds (real 3D puffs)
    const cb = new M.B(); for (let i = 0; i < (low ? 6 : 12); i++) { const a = i / 12 * Math.PI * 2 + rnd(i, 1), r = 180 + rnd(i, 2) * 80, y = 60 + rnd(i, 3) * 50; for (let k = 0; k < 5; k++) cb.sph(9 + (k % 3) * 4, '#ffffff', Math.cos(a) * r + (k - 2) * 9, y + (k % 2) * 4, Math.sin(a) * r + Math.sin(k) * 5, 1, 0.6, 0.9, 0, 0, 0, null, 10, 7); }
    const cm = new T.Mesh(cb.geometry(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: def.sky === 'night' ? '#3b3f80' : '#ffffff', emissiveIntensity: def.sky === 'night' ? 0.3 : 0.45, fog: false })); scene.add(cm);

    /* ---------- ground ---------- */
    const cxm = W * C / 2, czm = H * C / 2;
    if (def.water) { const wm = new T.Mesh(new T.PlaneGeometry(900, 900, 1, 1), M.MAT.water); wm.rotation.x = -Math.PI / 2; const WY = def.waterY != null ? def.waterY : -0.55; L.waterY = WY; wm.position.set(cxm, WY, czm); wm.receiveShadow = true; scene.add(wm); L.water = wm;
      const sb = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshStandardMaterial({ color: '#0e7fb8', roughness: 1 })); sb.rotation.x = -Math.PI / 2; sb.position.set(cxm, L.waterY - 2.5, czm); scene.add(sb); }
    else if (def.clouds) { const g = new M.B(); for (let i = 0; i < (low ? 40 : 90); i++) { const a = rnd(i, 5) * Math.PI * 2, r = 30 + rnd(i, 6) * 150; g.sph(6 + rnd(i, 7) * 8, i % 3 ? '#ffffff' : '#f5ecff', cxm + Math.cos(a) * r, -5 - rnd(i, 8) * 3, czm + Math.sin(a) * r, 1, 0.45, 1, 0, 0, 0, null, 10, 7); }
      const m = new T.Mesh(g.geometry(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.25 })); scene.add(m);
      const base = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshStandardMaterial({ color: '#f2e9ff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.15 })); base.rotation.x = -Math.PI / 2; base.position.set(cxm, -6, czm); scene.add(base); }
    else { const gm = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshStandardMaterial({ color: def.ground || '#7cd36b', roughness: 0.95 })); gm.rotation.x = -Math.PI / 2; gm.position.set(cxm, -0.12, czm); gm.receiveShadow = true; scene.add(gm); }

    /* ---------- floors ---------- */
    const tileGeo = (w, d, h) => low ? new T.BoxGeometry(w, h, d) : U.rbox(w, h, d, Math.min(0.05, h / 2 - 0.01), 1);
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const c = P.ch[z][x], X = wx(x), Z = wx(z);
      if (c === '#' || c === '~' || c === 'w' || c === 'G' || c === '=') { if (c === 'G' || c === '=') { const r = roomOf(x, z); if (r) FL.geo(tileGeo(1.96, 1.96, 0.14), r.floor, X, -0.07, Z); } continue; }
      if (c === ' ') { // exterior paving
        if (def.water) { for (let k = 0; k < 4; k++) FL.geo(tileGeo(1.96, 0.46, 0.16), (x + k) % 3 ? '#c99a62' : '#b98a52', X, -0.08, Z - 0.75 + k * 0.5); if ((x + z) % 3 === 0) { const ph = -L.waterY + 1.0; FL.cyl(0.18, 0.18, ph, '#8a5a32', X, -ph / 2, Z); FL.cyl(0.2, 0.2, 0.12, '#5b3a1e', X, L.waterY + 0.1, Z); } if (z === H - 1 || !LG.inside(P, x, z + 1) || P.ch[z + 1][x] !== ' ') FL.box(2.0, 0.22, 0.2, 0.05, '#8a5a32', X, -0.18, Z + 0.92); }
        else { const street = def.street || '#e7dccb'; const k = (x + z) % 2 ? 0 : 0.04; FL.geo(tileGeo(1.94, 1.94, 0.14), M.shift(street, 0, 0, k), X, -0.07, Z); }
        continue;
      }
      const r = roomOf(x, z); if (!r) continue; const st = floorStyle(r.kind);
      if (st === 'tile') FL.geo(tileGeo(1.94, 1.94, 0.14), (x + z) % 2 ? r.floor : M.shift(r.floor, 0, 0.04, -0.07), X, -0.07, Z);
      else if (st === 'wood') { for (let k = 0; k < 3; k++) FL.geo(tileGeo(1.98, 0.62, 0.14), M.shift(r.floor, 0, 0, ((x * 3 + k + z) % 4) * 0.025 - 0.03), X, -0.07, Z - 0.66 + k * 0.66); }
      else FL.geo(new T.BoxGeometry(2.0, 0.14, 2.0), r.floor, X, -0.07, Z);
    }
    // grout / sub-floor under building
    { const [x0, z0, x1, z1] = P.bbox; for (let z = z0; z <= z1; z++) { let a = -1; for (let x = x0; x <= x1 + 1; x++) { const gap = x > x1 || P.ch[z][x] === '~'; if (!gap && a < 0) a = x; if (gap && a >= 0) { S.box((x - a) * C, 0.1, C, 0.02, '#5b4b5f', (a + x) * C / 2, -0.16, wx(z)); a = -1; } } } } // sub-floor under the tiles, open over gaps/pits

    /* ---------- walls ---------- */
    const used = {}; const runs = [];
    for (let z = 0; z < H; z++) { let x = 0; while (x < W) { if (isWall(x, z)) { let e = x; while (e + 1 < W && isWall(e + 1, z)) e++; if (e > x) { runs.push([x, z, e, z]); for (let k = x; k <= e; k++) used[k + ',' + z] = 1; } x = e + 1; } else x++; } }
    for (let x = 0; x < W; x++) { let z = 0; while (z < H) { if (isWall(x, z) && !used[x + ',' + z]) { let e = z; while (e + 1 < H && isWall(x, e + 1) && !used[x + ',' + (e + 1)]) e++; runs.push([x, z, x, e]); for (let k = z; k <= e; k++) used[x + ',' + k] = 1; z = e + 1; } else z++; } }
    runs.forEach(([x0, z0, x1, z1]) => { const w = (x1 - x0 + 1) * C, d = (z1 - z0 + 1) * C, cx = (x0 + x1 + 1) * C / 2, cz = (z0 + z1 + 1) * C / 2;
      S.box(w, WH, d, 0.1, th.facade, cx, WH / 2, cz); S.box(w + 0.12, 0.24, d + 0.12, 0.1, th.trim, cx, WH + 0.1, cz); });
    // per-face panels (interior: room colours; exterior: facade details)
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const panel = (b, X, Z, dx, dz, w, h, y, t, col, out) => { // panel on face of cell (X,Z) toward dir; out = offset from face
      const fx = X + dx * (C / 2 - out), fz = Z + dz * (C / 2 - out); if (dx) b.geo(new T.BoxGeometry(t, h, w), col, fx, y, fz); else b.geo(new T.BoxGeometry(w, h, t), col, fx, y, fz); };
    let winN = 0;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const c = P.ch[z][x]; const X = wx(x), Z = wx(z);
      const floorish = !(c === '#' || c === ' ' || c === 'w' || c === '~');
      if (floorish && P.room[z][x] >= 0) { const r = P.rooms[P.room[z][x]];
        DIRS.forEach(([dx, dz]) => { if (!isWall(x + dx, z + dz)) return; const up = pale(r.wall, 0.62), wa = r.wall;
          panel(S, X, Z, dx, dz, 2.0, WH - 1.15, 1.15 + (WH - 1.15) / 2, 0.06, up, -0.03); panel(S, X, Z, dx, dz, 2.0, 1.0, 0.6, 0.09, wa, -0.045);
          panel(S, X, Z, dx, dz, 2.0, 0.1, 1.13, 0.14, '#ffffff', -0.07); panel(S, X, Z, dx, dz, 2.0, 0.16, 0.08, 0.13, M.darker(wa, 0.18), -0.065);
          panel(S, X, Z, dx, dz, 2.0, 0.14, WH - 0.07, 0.12, '#ffffff', -0.06); }); }
      if (c === '#') { // exterior faces
        DIRS.forEach(([dx, dz]) => { const n = ch(x + dx, z + dz); if (!(n === ' ' || n === 'w' || n === 'O')) return;
          const fx = X + dx * C / 2, fz = Z + dz * C / 2, rot = Math.atan2(dx, dz); const a = PR.at(S, fx, fz, rot);
          a.box(2.02, 0.7, 0.16, 0.05, th.base, 0, 0.35, 0.02); a.box(2.02, 0.2, 0.2, 0.06, th.trim, 0, WH - 0.35, 0.04);
          const nearDoor = [-1, 1].some((s) => { const q = ch(x + (dz ? s : 0), z + (dx ? s : 0)); return q === 'D' || q === 'L'; }) || P.roofPts.some((p) => p.x === x + dx && p.z === z + dz);
          if (!nearDoor && (x + z) % 2 === 0) { winN++;
            if (th.win === 'round' || th.win === 'porthole') { a.cyl(0.6, 0.6, 0.14, th.win === 'porthole' ? '#e2e8f0' : th.trim, 0, 2.0, 0.04, Math.PI / 2, 0, 0); a.tor(0.48, 0.1, th.win === 'porthole' ? '#c9962e' : th.trim, 0, 2.0, 0.14, 0, 0, 0, 'gloss'); a.cyl(0.42, 0.42, 0.08, '#2f5f8f', 0, 2.0, 0.1, Math.PI / 2, 0, 0); a.cyl(0.38, 0.38, 0.04, '#8fd8ff', 0, 2.0, 0.13, Math.PI / 2, 0, 0, 'gloss'); a.box(0.1, 0.5, 0.02, 0.01, '#e8f8ff', -0.1, 2.05, 0.16, 0, 0, 0.6, 'glow'); for (let k = 0; k < 6; k++) a.sph(0.04, '#c9962e', Math.sin(k * 1.047) * 0.48, 2.0 + Math.cos(k * 1.047) * 0.48, 0.2, 1, 1, 1, 0, 0, 0, 'gloss'); }
            else if (th.win === 'arch') { a.box(1.1, 1.5, 0.12, 0.05, th.trim, 0, 1.85, 0.04); a.cyl(0.55, 0.55, 0.12, th.trim, 0, 2.6, 0.04, Math.PI / 2, 0, 0); a.box(0.9, 1.4, 0.06, 0.03, '#8fd8ff', 0, 1.85, 0.08, 0, 0, 0, 'gloss'); a.cyl(0.45, 0.45, 0.06, '#8fd8ff', 0, 2.55, 0.08, Math.PI / 2, 0, 0, 'gloss'); a.box(1.3, 0.12, 0.34, 0.04, th.trim, 0, 1.1, 0.14); a.box(0.06, 1.85, 0.06, 0.02, th.trim, 0, 2.0, 0.12); a.box(0.9, 0.06, 0.06, 0.02, th.trim, 0, 2.1, 0.12); a.box(0.12, 0.9, 0.02, 0.01, '#e8f8ff', -0.22, 1.9, 0.12, 0, 0, 0.5, 'glow'); a.sph(0.14, th.trim, 0, 3.15, 0.12, 1, 1.2, 0.6, 0, 0, 0, 'gloss'); }
            else { const night = def.sky === 'night'; a.box(1.3, 1.4, 0.2, 0.06, th.trim, 0, 2.0, 0.08); a.box(1.04, 1.14, 0.1, 0.02, night ? '#c98a2a' : '#2f5f8f', 0, 2.0, 0.14); a.box(0.96, 1.06, 0.04, 0.02, night ? '#ffe9a0' : '#8fd8ff', 0, 2.0, 0.12, 0, 0, 0, night ? 'glow' : 'gloss');
              if (!night) { a.box(0.12, 0.9, 0.02, 0.01, '#e8f8ff', -0.2, 2.05, 0.15, 0, 0, 0.5, 'glow'); a.box(0.06, 0.5, 0.02, 0.01, '#e8f8ff', 0.02, 2.2, 0.15, 0, 0, 0.5, 'glow'); }
              a.box(0.07, 1.06, 0.06, 0.02, th.trim, 0, 2.0, 0.17); a.box(1.0, 0.07, 0.06, 0.02, th.trim, 0, 2.05, 0.17); a.box(1.5, 0.12, 0.36, 0.04, th.trim, 0, 1.27, 0.2); a.box(1.46, 0.14, 0.26, 0.05, th.trim, 0, 2.76, 0.16);
              if (def.id === 'hideout' || def.id === 'toys') { a.box(1.2, 0.26, 0.3, 0.06, def.id === 'toys' ? '#ef4444' : '#8a3f2a', 0, 1.1, 0.3); for (let k = 0; k < 4; k++) { a.sph(0.13, '#22a447', -0.42 + k * 0.28, 1.28, 0.3, 1, 0.8, 1); a.sph(0.07, ['#ff4f9a', '#ffd23f', '#ffffff', '#a855f7'][(k + x) % 4], -0.42 + k * 0.28, 1.38, 0.38, 1, 1, 1, 0, 0, 0, 'glow'); } } }
          }
          if (def.id === 'candy') { a.box(2.02, 0.22, 0.12, 0.05, (x + z) % 2 ? '#ffffff' : '#ff4f9a', 0, 3.0, 0.08); for (let k = 0; k < 3; k++) a.sph(0.16 + (k % 2) * 0.06, '#ffffff', -0.7 + k * 0.7, 3.42, 0.12, 1, 1.4 - (k % 2) * 0.3, 0.8); }
          if (def.id === 'ship') a.box(2.02, 0.35, 0.1, 0.03, '#ef4444', 0, 2.95, 0.06);
          if (def.id === 'toys') a.box(0.5, 0.5, 0.1, 0.1, ['#ef4444', '#22c55e', '#3b82f6', '#ff4fd8'][(x + z) % 4], 0.6, 3.0, 0.06, 0, 0, 0, 'gloss');
        }); }
    }

    /* ---------- openings ---------- */
    const axisAt = (x, z) => (isWall(x - 1, z) || ch(x - 1, z) === 'L' || ch(x - 1, z) === 'S' || ch(x - 1, z) === 'Z' || ch(x - 1, z) === 'D') && (isWall(x + 1, z) || ch(x + 1, z) === 'L' || ch(x + 1, z) === 'S' || ch(x + 1, z) === 'Z' || ch(x + 1, z) === 'D') ? 'x' : 'z';
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const c = P.ch[z][x], X = wx(x), Z = wx(z);
      const inWallLine = (isWall(x - 1, z) && isWall(x + 1, z)) || (isWall(x, z - 1) && isWall(x, z + 1)) || ((c === 'D' || c === 'L' || c === 'Z' || c === 'S') && ((isWall(x - 1, z) || isWall(x + 1, z)) && (ch(x - 1, z) !== '.' || ch(x + 1, z) !== '.')));
      if ((c === 'D' || c === 'L' || (c === 'Z' && inWallLine)) && inWallLine) {
        const ax = axisAt(x, z); const rot = ax === 'x' ? 0 : Math.PI / 2; const a = PR.at(S, X, Z, rot);
        a.box(2.0, WH - 2.8, 1.96, 0.06, th.facade, 0, 2.8 + (WH - 2.8) / 2, 0); a.box(2.04, 0.18, 2.04, 0.06, th.trim, 0, 2.86, 0);
        [-1, 1].forEach((s) => { if (ch(x + (ax === 'x' ? s : 0), z + (ax === 'x' ? 0 : s)) === '#') a.box(0.2, 2.8, 2.04, 0.08, c === 'L' ? '#475569' : th.trim, s * 0.92, 1.4, 0); });
        const outside = (ax === 'x') ? [isOut(x, z - 1), isOut(x, z + 1)] : [isOut(x - 1, z), isOut(x + 1, z)];
        outside.forEach((o, i) => { if (!o) return; const s = i ? 1 : -1; // awning
          const aw = PR.at(S, X + (ax === 'x' ? 0 : s * 1.3), Z + (ax === 'x' ? s * 1.3 : 0), ax === 'x' ? (s > 0 ? 0 : Math.PI) : (s > 0 ? Math.PI / 2 : -Math.PI / 2));
          for (let k = 0; k < 4; k++) aw.box(0.55, 0.12, 1.2, 0.05, k % 2 ? '#ffffff' : th.base, -0.82 + k * 0.55, 3.15, 0.1, -0.35); aw.box(2.0, 0.06, 1.0, 0.03, '#e5d3b3', 0, 0.01, 0.4); });
      }
      if (c === 'G') {
        const pane = (isWall(x - 1, z) || ch(x - 1, z) === 'G') && (isWall(x + 1, z) || ch(x + 1, z) === 'G') || (isWall(x, z - 1) || ch(x, z - 1) === 'G') && (isWall(x, z + 1) || ch(x, z + 1) === 'G');
        if (pane) { const ax = (isWall(x - 1, z) || ch(x - 1, z) === 'G') ? 0 : Math.PI / 2; const a = PR.at(S, X, Z, ax); a.box(2.0, 0.5, 0.5, 0.1, th.trim, 0, 0.25, 0); a.box(2.0, 0.2, 0.4, 0.08, th.trim, 0, WH - 0.1, 0); const gm = new T.Mesh(new T.BoxGeometry(ax ? 0.08 : 2, WH - 0.7, ax ? 2 : 0.08), M.MAT.glass); gm.position.set(X, 0.5 + (WH - 0.7) / 2, Z); scene.add(gm); }
        else { S.box(1.7, 0.9, 1.7, 0.1, '#f5f0e6', X, 0.45, Z); S.box(1.8, 0.08, 1.8, 0.03, '#d6c39c', X, 0.92, Z); const gm = new T.Mesh(U.rbox(1.6, 1.1, 1.6, 0.08, 2), M.MAT.glass); gm.position.set(X, 1.5, Z); scene.add(gm);
          const k = (x * 7 + z) % 3; if (k === 0) S.add(new T.OctahedronGeometry(0.3, 0), '#ff4fd8', 'glow', X, 1.4, Z, 0, 0, 0, 1, 1.3, 1); else if (k === 1) S.sph(0.3, '#22d3ee', X, 1.35, Z, 1, 1, 1, 0, 0, 0, 'glow'); else S.box(0.5, 0.4, 0.3, 0.12, '#ffd23f', X, 1.2, Z, 0, 0.5, 0, 'gloss'); }
      }
      if (c === '=') { const r = roomOf(x, z); const col = r ? r.wall : th.trim; S.box(1.98, 1.0, 1.4, 0.15, col, X, 0.5, Z); S.box(2.0, 0.12, 1.6, 0.06, pale(col, 0.7), X, 1.04, Z); S.box(1.9, 0.5, 0.06, 0.04, M.darker(col, 0.1), X, 0.5, Z + 0.71); if ((x + z) % 3 === 0) { S.box(0.5, 0.3, 0.4, 0.05, '#1f2937', X, 1.25, Z); S.box(0.4, 0.2, 0.02, 0.02, '#22d3ee', X, 1.27, Z + 0.21, 0, 0, 0, 'glow'); } else S.sph(0.18, '#ff4fd8', X, 1.25, Z, 1, 1, 1, 0, 0, 0, 'gloss'); }
      if (c === '~') buildGap(x, z, X, Z);
    }
    function buildGap(x, z, X, Z) {
      const g = th.gap || 'choco', depth = g === 'sky' ? 5 : g === 'balls' ? 1.2 : 1.0;
      DIRS.forEach(([dx, dz]) => { if (ch(x + dx, z + dz) === '~') return; const fx = X + dx * 0.98, fz = Z + dz * 0.98; const col = g === 'pool' ? '#e0f2fe' : g === 'sky' ? '#efeaff' : g === 'balls' ? '#2563eb' : '#c2185b';
        if (dx) S.geo(new T.BoxGeometry(0.12, depth, 2.0), col, fx, -depth / 2, fz); else S.geo(new T.BoxGeometry(2.0, depth, 0.12), col, fx, -depth / 2, fz);
        const rim = g === 'pool' ? '#ffffff' : g === 'sky' ? '#ffd23f' : g === 'balls' ? '#ffd23f' : '#ff9ad5'; if (dx) S.box(0.3, 0.2, 2.0, 0.08, rim, X + dx * 0.9, 0.06, Z); else S.box(2.0, 0.2, 0.3, 0.08, rim, X, 0.06, Z + dz * 0.9); });
      if (g === 'choco') { const m = new T.Mesh(new T.BoxGeometry(2, 0.1, 2), M.MAT.choco); m.position.set(X, -0.55, Z); scene.add(m); if (rnd(x, z) < 0.3) S.box(0.4, 0.3, 0.4, 0.12, '#ffffff', X + 0.3, -0.42, Z - 0.2, 0, rnd(z, x) * 3, 0); }
      else if (g === 'pool') { S.geo(new T.BoxGeometry(2, 0.1, 2), (x + z) % 2 ? '#38bdf8' : '#7dd3fc', X, -1.0, Z); const m = new T.Mesh(new T.BoxGeometry(2, 0.08, 2), M.MAT.water); m.position.set(X, -0.3, Z); scene.add(m); }
      else if (g === 'sky') { S.sph(1.25, '#ffffff', X + (rnd(x, z) - 0.5) * 0.6, -3.9, Z + (rnd(z, x) - 0.5) * 0.6, 1, 0.5, 1, 0, 0, 0, 'glow'); if (rnd(x, z) < 0.5) S.sph(0.8, '#fde7ff', X - 0.5, -3.4, Z + 0.4, 1, 0.6, 1, 0, 0, 0, 'glow'); S.geo(new T.BoxGeometry(2, 0.1, 2), '#8fd0ff', X, -5.0, Z, 0, 0, 0, 1, 1, 1, 'glow'); }
      else { for (let k = 0; k < (low ? 5 : 10); k++) S.sph(0.24, PR.F && ['#ef4444', '#22d3ee', '#ffd23f', '#4ade80', '#ff4fd8', '#a78bfa'][(x + z + k) % 6], X - 0.7 + rnd(x + k, z) * 1.4, -0.25 - (k % 2) * 0.2, Z - 0.7 + rnd(z + k, x) * 1.4, 1, 1, 1, 0, 0, 0, 'gloss', 10, 8); }
    }

    /* ---------- lasers ---------- */
    P.lasers.forEach((gr) => { const g = new T.Group(); scene.add(g); const posts = new M.B();
      gr.cells.forEach(([x, z]) => { const X = wx(x), Z = wx(z); const ax = axisAt(x, z);
        [0.45, 0.95, 1.45].forEach((y) => { const beam = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 2.0, 6), M.MAT.laser); const glow = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 2.0, 8), M.MAT.laserGlow); [beam, glow].forEach((m) => { m.position.set(X, y, Z); if (ax === 'x') m.rotation.z = Math.PI / 2; else m.rotation.x = Math.PI / 2; g.add(m); }); });
        [-1, 1].forEach((s) => { const nx = x + (ax === 'x' ? s : 0), nz = z + (ax === 'x' ? 0 : s); if (ch(nx, nz) === 'Z') return; const px = X + (ax === 'x' ? s * 0.95 : 0), pz = Z + (ax === 'x' ? 0 : s * 0.95);
          posts.box(0.26, 1.75, 0.26, 0.08, '#334155', px, 0.88, pz); posts.sph(0.1, '#ff2a4a', px - (ax === 'x' ? s * 0.13 : 0), 0.95, pz - (ax === 'x' ? 0 : s * 0.13), 1, 1, 1, 0, 0, 0, 'glow'); posts.cyl(0.18, 0.18, 0.1, '#ffd23f', px, 1.8, pz, 0, 0, 0, 'gloss'); });
      });
      const pg = posts.group(true); scene.add(pg);
      L.dyn.lasers[gr.id] = { g, gr }; });

    /* ---------- locks (vault doors) ---------- */
    P.locks.forEach((lk) => { const xs = lk.cells.map((c) => c[0]), zs = lk.cells.map((c) => c[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
      const cx = (x0 + x1 + 1) * C / 2, cz = (z0 + z1 + 1) * C / 2, ax = axisAt(x0, z0), w = ax === 'x' ? (x1 - x0 + 1) * C : (z1 - z0 + 1) * C;
      const g = new T.Group(); g.position.set(cx, 0, cz); g.rotation.y = ax === 'x' ? 0 : Math.PI / 2; scene.add(g); const b = new M.B();
      b.box(w - 0.1, 2.75, 0.36, 0.14, '#94a3b8', 0, 1.4, 0, 0, 0, 0, 'gloss'); for (let k = 0; k < 4; k++) b.box(w - 0.3, 0.16, 0.4, 0.05, k % 2 ? '#1f2937' : '#ffd23f', 0, 0.3 + k * 0.18, 0);
      b.tor(0.5, 0.09, '#ffd23f', 0, 1.7, 0.22, 0, 0, 0, 'gloss'); b.tor(0.5, 0.09, '#ffd23f', 0, 1.7, -0.22, 0, 0, 0, 'gloss'); for (let k = 0; k < 3; k++) { b.cyl(0.05, 0.05, 1.0, '#ffd23f', 0, 1.7, 0.22, 0, 0, k * Math.PI / 3, 'gloss'); b.cyl(0.05, 0.05, 1.0, '#ffd23f', 0, 1.7, -0.22, 0, 0, k * Math.PI / 3, 'gloss'); }
      b.cyl(0.15, 0.15, 0.5, '#64748b', 0, 1.7, 0, Math.PI / 2, 0, 0, 'gloss'); const leaf = new T.Group(); g.add(leaf); b.meshes(true).forEach((m) => leaf.add(m));
      const light = new T.Mesh(new T.SphereGeometry(0.13, 12, 8), new T.MeshBasicMaterial({ color: '#ff3b3b' })); light.position.set(w / 2 + 0.25, 1.5, 0.95); g.add(light);
      const light2 = light.clone(); light2.material = light.material; light2.position.set(-w / 2 - 0.25, 1.5, -0.95); g.add(light2);
      const kp = new M.B(); [0.95, -0.95].forEach((s) => { kp.box(0.36, 0.55, 0.08, 0.04, '#1f2937', (s > 0 ? 1 : -1) * (w / 2 + 0.25), 1.35, s); }); kp.meshes(false).forEach((m) => g.add(m));
      L.dyn.locks[lk.id] = { g, leaf, light, lk, open: 0 }; });

    /* ---------- secret walls ---------- */
    P.secret.forEach((s) => { const X = wx(s.x), Z = wx(s.z); const ax = axisAt(s.x, s.z); const g = new T.Group(); g.position.set(X, 0, Z); g.rotation.y = ax === 'x' ? 0 : Math.PI / 2; scene.add(g); const b = new M.B();
      b.box(2.0, WH, 1.9, 0.06, th.facade, 0, WH / 2, 0); [1, -1].forEach((side) => { const a = PR.at(b, 0, side * 0.95, side > 0 ? 0 : Math.PI); a.box(1.9, 3.3, 0.12, 0.05, '#8a5a32', 0, 1.65, 0.05); for (let r = 0; r < 4; r++) { a.box(1.75, 0.06, 0.2, 0.02, '#6b4423', 0, 0.4 + r * 0.75, 0.15); for (let k = 0; k < 7; k++) { const h = 0.4 + ((r * 7 + k) % 3) * 0.08; a.box(0.18, h, 0.22, 0.03, ['#ef4444', '#3b82f6', '#22c55e', '#ffd23f', '#a855f7'][(r + k + s.x) % 5], -0.7 + k * 0.23, 0.43 + r * 0.75 + h / 2, 0.2); } } });
      b.meshes(true).forEach((m) => g.add(m)); L.dyn.secret.push({ g, s, t: 0 }); });

    /* ---------- vents, levers, cameras, crates, skylights, grapple points ---------- */
    const wallDir = (x, z) => { for (const [dx, dz] of DIRS) if (isWall(x + dx, z + dz)) return [dx, dz]; return [0, -1]; };
    P.vents.forEach((v) => [v.a, v.b].forEach((e) => { const [dx, dz] = wallDir(e[0], e[1]); const a = PR.at(S, wx(e[0]) + dx * 0.98, wx(e[1]) + dz * 0.98, Math.atan2(-dx, -dz));
      a.box(1.3, 0.95, 0.14, 0.08, '#64748b', 0, 0.55, 0.04); for (let k = 0; k < 4; k++) a.box(1.05, 0.08, 0.16, 0.03, '#1f2937', 0, 0.25 + k * 0.2, 0.06); a.box(1.36, 0.08, 0.18, 0.04, '#22d3ee', 0, 1.06, 0.06, 0, 0, 0, 'glow'); a.box(1.36, 0.08, 0.18, 0.04, '#22d3ee', 0, 0.04, 0.06, 0, 0, 0, 'glow'); }));
    P.levers.forEach((l) => { const [dx, dz] = wallDir(l.x, l.z); const X = wx(l.x) + dx * 0.95, Z = wx(l.z) + dz * 0.95, rot = Math.atan2(-dx, -dz); const a = PR.at(S, X, Z, rot);
      a.box(0.5, 0.8, 0.1, 0.05, '#8a5a32', 0, 1.3, 0.05); a.sph(0.1, '#c9962e', 0, 1.3, 0.12, 1, 1, 1, 'gloss');
      const hp = new T.Group(); hp.position.set(X + Math.sin(rot) * 0.15, 1.3, Z + Math.cos(rot) * 0.15); hp.rotation.y = rot; scene.add(hp); const hb = new M.B(); hb.cyl(0.04, 0.04, 0.6, '#c9962e', 0, 0.3, 0, 0, 0, 0, 'gloss'); hb.sph(0.11, '#ef4444', 0, 0.62, 0, 1, 1, 1, 0, 0, 0, 'gloss'); hb.meshes(true).forEach((m) => hp.add(m)); hp.rotation.x = -0.5; hp.rotation.order = 'YXZ';
      L.dyn.levers.push({ g: hp, l, rot }); });
    P.cams.forEach((cm) => { const X = wx(cm.x) + cm.wall[0] * 0.85, Z = wx(cm.z) + cm.wall[1] * 0.85; const g = new T.Group(); g.position.set(X, 3.0, Z); scene.add(g);
      const b = new M.B(); b.box(0.3, 0.3, 0.3, 0.08, '#cbd5e1', 0, 0, 0); b.cyl(0.04, 0.04, 0.4, '#94a3b8', 0, -0.1, 0); b.meshes(false).forEach((m) => g.add(m));
      const head = new T.Group(); head.position.y = -0.25; g.add(head); const hb = new M.B(); hb.cap(0.17, 0.4, '#f1f5f9', 0, 0, 0.2, Math.PI / 2, 0, 0, 'gloss'); hb.cyl(0.12, 0.12, 0.05, '#1f2937', 0, 0, 0.6, Math.PI / 2, 0, 0); hb.meshes(false).forEach((m) => head.add(m));
      const led = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), new T.MeshBasicMaterial({ color: '#ff3b3b' })); led.position.set(0.12, 0.12, 0.3); head.add(led);
      L.dyn.cams[cm.id] = { g, head, led, cm, X, Z }; });
    P.crates.forEach((cr) => { const g = new T.Group(); const b = new M.B(); b.box(1.85, 1.75, 1.85, 0.18, '#b7793e', 0, 0.88, 0); for (const s of [-1, 1]) { b.box(1.9, 0.18, 0.2, 0.05, '#7c4a1e', 0, 0.88, s * 0.86); b.box(0.2, 0.18, 1.9, 0.05, '#7c4a1e', s * 0.86, 0.88, 0); b.box(1.9, 0.16, 1.9, 0.05, '#7c4a1e', 0, s > 0 ? 1.68 : 0.1, 0); }
      b.box(0.9, 0.55, 0.05, 0.05, '#ffd23f', 0, 0.9, 0.95, 0, 0, 0, 'gloss'); b.sph(0.12, '#1f2937', 0, 0.95, 0.98, 1, 1, 0.3); b.box(0.9, 0.55, 0.05, 0.05, '#ffd23f', 0, 0.9, -0.95, 0, 0, 0, 'gloss');
      b.meshes(true).forEach((m) => g.add(m)); g.position.set(wx(cr.x), 0, wx(cr.z)); scene.add(g); L.dyn.crates[cr.id] = { g, cr }; });
    P.sky.forEach((s) => { const X = wx(s.x), Z = wx(s.z); const m = new T.Mesh(new T.CircleGeometry(0.9, 24), new T.MeshBasicMaterial({ color: '#fff7c2', transparent: true, opacity: 0.45, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(X, 0.03, Z); scene.add(m);
      Rf.box(1.9, 0.3, 1.9, 0.1, th.trim, X, RH + 0.05, Z); const gm = new T.Mesh(new T.SphereGeometry(0.85, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.MAT.glass); gm.position.set(X, RH + 0.2, Z); gm.scale.y = 0.6; L.dyn.sky.push(gm); });
    P.roofPts.forEach((p) => { const [dx, dz] = wallDir(p.x, p.z); const X = wx(p.x) + dx * 0.6, Z = wx(p.z) + dz * 0.6;
      S.tor(0.35, 0.08, '#ffd23f', X + dx * 0.3, RH + 0.2, Z + dz * 0.3, Math.PI / 2, 0, 0, 'glow'); S.cyl(0.05, 0.05, RH - 0.5, '#c48a4a', X, (RH + 0.5) / 2, Z); for (let k = 0; k < 5; k++) S.sph(0.09, '#a0662b', X, 0.8 + k * 0.6, Z);
      const ring = new T.Mesh(new T.TorusGeometry(0.85, 0.08, 8, 28), M.MAT.marker.clone()); ring.material.color.set('#ffd23f'); ring.material.depthTest = true; ring.rotation.x = Math.PI / 2; ring.position.set(wx(p.x), 0.08, wx(p.z)); scene.add(ring); L.dyn.roofPts.push(ring); });

    /* ---------- decor ---------- */
    const res = LG.reserved(P); const pass = LG.layoutPass(P);
    if (def.stations) { const fx = (cells, t) => cells.forEach(([x, z]) => { P.deco[z][x] = t ? 2 : 1; });
      fx([[8, 6], [9, 6], [10, 6], [8, 7], [9, 7], [10, 7]]); PR.F.planTable(PR.at(S, 19, 14, 0));
      const holo = new T.Group(); holo.position.set(19, 1.6, 14); scene.add(holo); const hb = new M.B(); hb.box(1.6, 0.06, 1.2, 0.02, '#22d3ee', 0, 0, 0, 0, 0, 0, 'glow'); hb.box(0.5, 0.8, 0.5, 0.04, '#7dd3fc', -0.4, 0.45, -0.2, 0, 0, 0, 'glow'); hb.box(0.4, 0.5, 0.4, 0.04, '#a78bfa', 0.4, 0.3, 0.2, 0, 0, 0, 'glow'); hb.cone(0.25, 0.5, '#ff4fd8', 0.4, 0.8, 0.2, 0, 0, 0, 'glow');
      hb.meshes(false).forEach((m) => { m.material = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false }); holo.add(m); }); L.dyn.holo = holo;
      fx([[23, 5], [24, 5], [25, 5]]); PR.F.workbench(PR.at(S, 47, 11, 0)); PR.F.workbench(PR.at(S, 51, 11, 0)); PR.F.gadgetRack(PR.at(S, 49, 11, 0));
      fx([[3, 21], [3, 19], [3, 23]], true); PR.F.mirror(PR.at(S, 6.6, 43, Math.PI / 2)); PR.F.clothesRack(PR.at(S, 7.2, 39, Math.PI / 2), 1); PR.F.clothesRack(PR.at(S, 7.2, 47, Math.PI / 2), 4);
      const stage = []; for (let x = 4; x <= 10; x++) stage.push([x, 14]); fx(stage); S.box(14, 0.35, 2.2, 0.15, '#7c3aed', 15, 0.17, 29); S.box(14.2, 0.08, 2.3, 0.04, '#ffd23f', 15, 0.36, 29, 0, 0, 0, 'glow');
      for (let k = 0; k < 4; k++) { S.cyl(0.9, 0.9, 0.05, '#fff3c4', 9.5 + k * 3.7, 0.4, 29, 0, 0, 0, 'glow'); } S.box(14, 0.5, 0.3, 0.1, '#1f2937', 15, 3.3, 27.2); for (let k = 0; k < 4; k++) S.cyl(0.18, 0.28, 0.4, '#fff3c4', 9.5 + k * 3.7, 3.0, 27.4, 0.6, 0, 0, 'glow');
      L.lineup = [0, 1, 2, 3].map((k) => [12.45 + k * 1.7, 0.38, 29]);
      L.trophySpots = [[14, 15], [17, 14], [20, 15], [14, 21], [20, 21]]; fx(L.trophySpots); L.trophySpots.forEach(([x, z], i) => PR.F.trophyPed(PR.at(S, wx(x), wx(z), 0), i));
      fx([[26, 15], [27, 15], [26, 16], [27, 16], [26, 17], [27, 17]]); const van = M.vehicle('van'); van.position.set(54, 0, 33); scene.add(van); L.dyn.hubVan = van;
      L.stationPts = def.stations.map((s) => Object.assign({}, s, { X: s.k === 'plan' ? 19 : s.k === 'van' ? 54 : s.k === 'crew' ? 15 : s.k === 'outfit' ? 6.6 : wx(s.x), Z: s.k === 'plan' ? 14 : s.k === 'van' ? 33 : s.k === 'crew' ? 29 : s.k === 'outfit' ? 43 : wx(s.z) }));
    }
    let reach = P.start ? LG.bfs(P, P.start.x, P.start.z, pass).count : 0;
    const tryBlock = (cells) => { if (cells.some(([x, z]) => !LG.inside(P, x, z) || res[x + ',' + z] || P.deco[z][x] || !pass(x, z))) return false; cells.forEach(([x, z]) => { P.deco[z][x] = 1; }); const n = P.start ? LG.bfs(P, P.start.x, P.start.z, pass).count : reach - cells.length;
      if (n !== reach - cells.length) { cells.forEach(([x, z]) => { P.deco[z][x] = 0; }); return false; } reach = n; return true; };
    const place = (kind, x, z, rot, i, b, dx, dz) => { const f = PR.F[kind]; if (!f) return; f(PR.at(b || S, wx(x) + (dx || 0), wx(z) + (dz || 0), rot), i); };
    // big centrepieces
    const centre = (r, kind, w, d, rot) => { const cx = Math.floor((r.x0 + r.x1) / 2), cz = Math.floor((r.z0 + r.z1) / 2);
      for (const [ox, oz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) { const x0 = cx + ox - Math.floor((w - 1) / 2), z0 = cz + oz - Math.floor((d - 1) / 2); const cells = []; for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) cells.push([x, z]);
        if (cells.every(([x, z]) => P.room[z] && P.room[z][x] === r.i) && tryBlock(cells)) { cells.forEach(([x, z]) => { P.deco[z][x] = PR.TALL[kind] ? 2 : 1; }); PR.F[kind](PR.at(S, (x0 + w / 2) * C, (z0 + d / 2) * C, rot || 0), r.i); return true; } } return false; };
    P.rooms.forEach((r) => {
      const dc = DECOR[r.kind]; if (!dc) return;
      if (r.kind === 'dino') centre(r, 'dino', 1, 4, 0);
      if (r.kind === 'court') centre(r, 'fountain', 2, 2, 0);
      if (dc.rug) { const cx = (r.x0 + r.x1 + 1) / 2 * C, cz = (r.z0 + r.z1 + 1) / 2 * C; PR.F.rug(PR.at(S, cx, cz, 0), r.i); }
      let wi = 0, hi = 0;
      for (let z = r.z0 + 1; z < r.z1; z++) for (let x = r.x0 + 1; x < r.x1; x++) {
        if (P.ch[z][x] !== '.') continue; const walls = DIRS.filter(([dx, dz]) => isWall(x + dx, z + dz));
        if (!walls.length) continue; const [dx, dz] = walls[0]; const rot = Math.atan2(-dx, -dz);
        const nearSpecial = DIRS.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]).some(([ax, az]) => { const q = ch(x + ax, z + az); return q === 'D' || q === 'L' || q === 'S' || q === 'Z'; });
        let tall = false;
        if (!nearSpecial && (x + z * 3 + r.i) % 2 === 0 && !res[x + ',' + z] && dc.W) { const kind = dc.W[wi % dc.W.length]; if (tryBlock([[x, z]])) { wi++; P.deco[z][x] = PR.TALL[kind] ? 2 : 1; tall = !!PR.TALL[kind]; place(kind, x, z, rot, wi + r.i, S, dx * 0.12, dz * 0.12); } }
        if (dc.H && !tall && !nearSpecial && (x * 2 + z) % 3 === 0 && !P.cams.some((c) => c.x === x && c.z === z) && !P.levers.some((l) => l.x === x && l.z === z) && !P.vents.some((v) => (v.a[0] === x && v.a[1] === z) || (v.b[0] === x && v.b[1] === z))) { const kind = dc.H[hi++ % dc.H.length]; place(kind, x, z, rot, hi + r.i * 3, S, dx * 0.97, dz * 0.97); }
      }
      if (dc.C) { let ci = 0; for (let z = r.z0 + 3; z < r.z1 - 2; z += 4) for (let x = r.x0 + 3; x < r.x1 - 2; x += 4) { if (P.ch[z][x] !== '.' || res[x + ',' + z]) continue; const kind = dc.C[ci % dc.C.length]; if (tryBlock([[x, z]])) { ci++; P.deco[z][x] = PR.TALL[kind] ? 2 : 1; place(kind, x, z, (ci % 4) * Math.PI / 2, ci + r.i); } } }
    });
    // exterior ring decor
    const extKinds = { park: ['tree', 'bush', 'streetLamp', 'bench', 'tree', 'mailbox'], candy: ['lollipop', 'gumdrop', 'candyLamp', 'cupcake', 'gumdrop'], plaza: ['tree', 'streetLamp', 'bush', 'bench', 'tree'], dock: ['bollard', 'barrel', 'crateStack', 'bollard'], clouds: ['cloudBush', 'cloudPuff', 'cloudBush'], night: ['tree', 'streetLamp', 'bush', 'bench', 'gifts'] }[th.ext] || ['tree'];
    let ei = 0;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (P.ch[z][x] !== ' ' || res[x + ',' + z]) continue; let near = false; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (isWall(x + dx, z + dz) || ch(x + dx, z + dz) === 'D') near = true; if (near) continue;
      const edge = x === 0 || z === 0 || x === W - 1 || z === H - 1; if (!(edge ? rnd(x, z) < 0.55 : rnd(x, z) < 0.12)) continue; const kind = extKinds[ei % extKinds.length]; if (tryBlock([[x, z]])) { ei++; place(kind, x, z, rnd(z, x) * 6, ei); } }
    // scenery beyond the map edge (no collision)
    const scen = new M.B(); const outK = th.ext === 'candy' ? ['lollipop', 'gumdrop', 'tree', 'cupcake'] : th.ext === 'clouds' ? ['cloudPuff', 'cloudBush'] : th.ext === 'dock' ? [] : ['tree', 'pine', 'tree', 'bush'];
    if (outK.length) for (let i = 0; i < (low ? 70 : 150); i++) { const a = rnd(i, 11) * Math.PI * 2, r = Math.max(W, H) * C * 0.62 + 6 + rnd(i, 12) * 40; const X = cxm + Math.cos(a) * r * (W / Math.max(W, H)) * 1.1, Z = czm + Math.sin(a) * r * (H / Math.max(W, H)) * 1.15; if (X > -1 && X < W * C + 1 && Z > -1 && Z < H * C + 1) continue; const k = outK[i % outK.length]; PR.F[k](PR.at(scen, X, Z, rnd(i, 3) * 6), i); if (th.ext === 'clouds') scen.sph(3 + rnd(i, 9) * 3, '#ffffff', X, -1.2, Z, 1.4, 0.5, 1.2); }
    if (!def.water && !def.clouds) { // hills + road in front
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = 150 + rnd(i, 4) * 40; scen.sph(30 + rnd(i, 5) * 20, i % 2 ? M.shift(def.ground || '#7cd36b', 0, 0, -0.05) : def.ground || '#7cd36b', cxm + Math.cos(a) * r, -12, czm + Math.sin(a) * r, 1.4, 0.55, 1.2, 0, 0, 0, null, 14, 10); }
      scen.box(W * C + 120, 0.08, 7, 0.02, '#4b5563', cxm, -0.05, H * C + 4.5); for (let k = -15; k < 15; k++) scen.box(2.4, 0.09, 0.25, 0.02, '#ffffff', cxm + k * 5, -0.0, H * C + 4.5); scen.box(W * C + 120, 0.2, 0.5, 0.05, '#d1d5db', cxm, 0.0, H * C + 0.9);
    }
    if (def.water) { // the ship: curved hull with bow + rounded stern, wrap-around deck with railings, lifeboats on davits, funnels; far islands
      const [x0, z0, x1, z1] = P.bbox; const zN = z0 * C - 3, zS = (z1 + 1) * C, mz = (zN + zS) / 2, xa = x0 * C - 5, xb = (x1 + 1) * C, tip = xb + 20, WY = L.waterY;
      const sh = new T.Shape(); const P2 = (x, z) => [x, -z]; // shape y = -world z (after rotateX(-90deg))
      sh.moveTo(...P2(xa + 5, zN)); sh.lineTo(...P2(xb, zN)); sh.quadraticCurveTo(...P2(xb + 14, zN), ...P2(tip, mz)); sh.quadraticCurveTo(...P2(xb + 14, zS), ...P2(xb, zS)); sh.lineTo(...P2(xa + 5, zS)); sh.quadraticCurveTo(...P2(xa, zS), ...P2(xa, mz)); sh.quadraticCurveTo(...P2(xa, zN), ...P2(xa + 5, zN));
      const slab = (y0, y1, col, inset) => { let s2 = sh; if (inset) { const pts = sh.getSpacedPoints(160); const cx = (xa + tip) / 2, cy = -mz; s2 = new T.Shape(pts.map((p) => { const dx = p.x - cx, dy = p.y - cy, l = Math.hypot(dx * 0.35, dy) || 1; return new T.Vector2(p.x - dx * 0.35 / l * inset * 0.35 * 2.0, p.y - dy / l * inset); })); }
        const g = new T.ExtrudeGeometry(s2, { depth: y1 - y0, bevelEnabled: false, curveSegments: M.low ? 6 : 14 }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); scen.geo(g, col, 0, 0, 0); };
      slab(WY - 3, WY + 0.25, '#1e3a8a'); slab(WY + 0.25, WY + 0.6, '#ef4444'); slab(WY + 0.6, -0.42, '#ffffff'); slab(-0.42, -0.24, '#1e3a8a'); slab(-0.24, -0.05, '#d9a066');
      // portholes along the visible hull sides
      for (let x = xa + 6; x < xb + 6; x += 3.2) { scen.cyl(0.32, 0.32, 0.1, '#7dd3fc', x, (WY + 0.6 - 0.42) / 2, zS + 0.03, Math.PI / 2, 0, 0, 'glow', 14); scen.tor(0.34, 0.07, '#1e3a8a', x, (WY + 0.6 - 0.42) / 2, zS + 0.06, 0, 0, 0, 'gloss'); scen.cyl(0.32, 0.32, 0.1, '#7dd3fc', x, (WY + 0.6 - 0.42) / 2, zN - 0.03, Math.PI / 2, 0, 0, 'glow', 14); }
      // railings along the deck edge (not on the dock side, where the gangway is)
      const pts = sh.getSpacedPoints(M.low ? 90 : 180).map((p) => [p.x, -p.y]); let prev = null;
      pts.forEach(([x, z], i) => { const keep = z < zS - 0.6; if (keep && i % 2 === 0) scen.cyl(0.05, 0.05, 1.0, '#ffffff', x, 0.45, z, 0, 0, 0, 'gloss', 6); if (keep && prev) { const dx = x - prev[0], dz = z - prev[1], l = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx); scen.box(l + 0.06, 0.09, 0.09, 0.03, '#ffffff', (x + prev[0]) / 2, 0.95, (z + prev[1]) / 2, 0, ry, 0, 'gloss'); scen.box(l + 0.06, 0.05, 0.05, 0.02, '#cbd5e1', (x + prev[0]) / 2, 0.5, (z + prev[1]) / 2, 0, ry, 0); } prev = keep ? [x, z] : null; });
      // foredeck: anchor winch, mast with flags, bollards; stern: flag + lifebuoys
      scen.cyl(0.8, 0.8, 0.7, '#64748b', xb + 6, 0.35, mz, Math.PI / 2, 0, 0); scen.cyl(0.95, 0.95, 0.12, '#1e3a8a', xb + 6, 0.35, mz - 0.6, Math.PI / 2, 0, 0); scen.cyl(0.95, 0.95, 0.12, '#1e3a8a', xb + 6, 0.35, mz + 0.6, Math.PI / 2, 0, 0);
      scen.cyl(0.12, 0.16, 9, '#ffffff', xb + 11, 4.5, mz); for (let k = 0; k < 9; k++) { const t = k / 8; scen.cone(0.35, 0.6, ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ff4fd8'][k % 5], xb + 11 - t * 10.5, 8.6 - t * (8.6 - RH - 0.6) - Math.sin(t * Math.PI) * 0.8, mz, Math.PI, 0, 0, 'glow', 3); }
      [[xb + 3, zN + 1.2], [xb + 3, zS - 1.2], [xb + 9, mz - 2.5], [xb + 9, mz + 2.5]].forEach(([x, z]) => { scen.cyl(0.25, 0.3, 0.5, '#1f2937', x, 0.25, z); scen.cyl(0.35, 0.35, 0.08, '#1f2937', x, 0.52, z); });
      scen.cyl(0.06, 0.06, 4, '#ffffff', xa + 0.8, 2, mz); scen.box(1.8, 1.1, 0.05, 0.02, '#1e3a8a', xa + 0.8 - 0.95, 3.4, mz); scen.box(0.6, 0.4, 0.06, 0.02, '#ef4444', xa + 0.8 - 1.4, 3.65, mz);
      // lifeboats hanging on davits along both long sides of the upper storey
      const boat = (x, z, side) => { const y = WH + 0.9, o = side * 1.25; const bz = z + o; scen.sph(1.0, '#ff7a1a', x, y, bz, 1.9, 0.55, 0.62, 0, 0, 0, 'gloss'); scen.box(3.2, 0.12, 1.1, 0.05, '#ffffff', x, y + 0.08, bz); scen.sph(0.9, '#ffffff', x, y + 0.18, bz, 1.7, 0.42, 0.55); scen.box(3.4, 0.08, 0.08, 0.02, '#1e3a8a', x, y - 0.1, bz + side * 0.6);
        [-1.3, 1.3].forEach((dx) => { scen.cyl(0.07, 0.07, 1.6, '#e5e7eb', x + dx, y + 0.9, z + side * 0.3, side * 0.6, 0, 0); scen.cyl(0.07, 0.07, 1.4, '#e5e7eb', x + dx, y + 1.45, z + side * 0.85, Math.PI / 2, 0, 0); scen.cyl(0.015, 0.015, 1.1, '#334155', x + dx, y + 0.9, bz); }); };
      const signX = P.start ? wx(P.start.x) : -99; for (let x = x0 * C + 6; x < xb - 4; x += 9) { if (Math.abs(x - signX) > 6.5) boat(x, zS, 1); boat(x, z0 * C, -1); }
      // funnels: tapered, striped, black caps, a puff of steam
      [[x0 * C + 24, 0], [x0 * C + 44, 1]].forEach(([sx]) => { const fz = mz + 4; scen.cyl(1.7, 2.1, 5, '#ffffff', sx, RH + 2.5, fz, 0, 0, -0.12, null, 22); scen.cyl(1.68, 1.82, 1.1, '#ef4444', sx - 0.36, RH + 3.9, fz, 0, 0, -0.12, null, 22); scen.cyl(1.6, 1.66, 0.45, '#1f2937', sx - 0.6, RH + 5.05, fz, 0, 0, -0.12, null, 22); scen.cyl(2.3, 2.3, 0.3, '#1e3a8a', sx + 0.05, RH + 0.15, fz, 0, 0, 0, null, 22); });
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.4, r = 160 + rnd(i, 2) * 50; scen.sph(18 + rnd(i, 3) * 10, '#f2d27a', cxm + Math.cos(a) * r, -6, czm + Math.sin(a) * r, 1.3, 0.4, 1.1); PR.F.palm(PR.at(scen, cxm + Math.cos(a) * r, czm + Math.sin(a) * r, 0), i); }
      L.funnels = [[x0 * C + 24, mz + 4], [x0 * C + 44, mz + 4]];
    }
    if (def.clouds) { const [x0, z0, x1, z1] = P.bbox; const rb = PR.at(scen, cxm, czm - H * C * 0.6 - 25, 0); ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'].forEach((c, k) => rb.tor(60 - k * 2.5, 1.2, c, 0, -5, 0, 0, 0, 0, 'glow', Math.PI)); }
    const scm = scen.group(false); scene.add(scm);

    /* ---------- roofs ---------- */
    const roofCol = th.roof;
    // rooftop props are solid (P.roofBlock) - but only when that never cuts a skylight or a grapple landing off from the rest of the roof
    P.roofBlock = P.roofCell.map((r) => r.map(() => false));
    const rNeed = []; P.sky.forEach((q) => rNeed.push([q.x, q.z])); P.roofPts.forEach((q) => DIRS.forEach(([dx, dz]) => { [1, 2].forEach((k) => { const x = q.x + dx * k, z = q.z + dz * k; if (LG.inside(P, x, z) && P.roofCell[z][x]) rNeed.push([x, z]); }); }));
    const rComp = () => { const comp = new Int32Array(W * H).fill(-1); let id = 0; const pass = (x, z) => P.roofCell[z][x] && !P.roofBlock[z][x];
      return rNeed.map(([x, z]) => { if (!pass(x, z)) return -2; if (comp[z * W + x] < 0) { const seen = LG.bfs(P, x, z, pass); for (let i = 0; i < seen.length; i++) if (seen[i]) comp[i] = id; id++; } return comp[z * W + x]; }); };
    const rBase = rComp();
    const roofBlock = (cells) => { cells = cells.filter(([x, z]) => LG.inside(P, x, z) && P.roofCell[z][x] && !P.roofBlock[z][x]); if (cells.some(([x, z]) => rNeed.some((q) => q[0] === x && q[1] === z))) return false; cells.forEach(([x, z]) => { P.roofBlock[z][x] = true; });
      const now = rComp(); let ok = now.every((c) => c !== -2); for (let i = 0; ok && i < rNeed.length; i++) for (let j = i + 1; j < rNeed.length; j++) if (rBase[i] === rBase[j] && now[i] !== now[j]) { ok = false; break; }
      if (!ok) cells.forEach(([x, z]) => { P.roofBlock[z][x] = false; }); return ok; };
    const roofWater = [];
    (L.funnels || []).forEach(([fx, fz]) => { const cs = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (Math.hypot(wx(x) - fx, wx(z) - fz) < 2.6) cs.push([x, z]); roofBlock(cs); });
    if (def.id === 'ship') { // sun deck pool on the biggest roofed room, ringed with loungers + umbrellas
      const rr = P.rooms.filter((r) => !r.open).sort((a, b) => (b.x1 - b.x0) * (b.z1 - b.z0) - (a.x1 - a.x0) * (a.z1 - a.z0))[0];
      if (rr) { const cx = Math.floor((rr.x0 + rr.x1) / 2), cz = Math.floor((rr.z0 + rr.z1) / 2), px0 = cx - 3, px1 = cx + 2, pz0 = cz - 1, pz1 = cz + 1; const cells = []; for (let z = pz0; z <= pz1; z++) for (let x = px0; x <= px1; x++) cells.push([x, z]);
        if (roofBlock(cells)) { const X0 = px0 * C + 0.1, X1 = (px1 + 1) * C - 0.1, Z0 = pz0 * C + 0.1, Z1 = (pz1 + 1) * C - 0.1, mx = (X0 + X1) / 2, mzp = (Z0 + Z1) / 2, w = X1 - X0, d = Z1 - Z0;
          Rf.box(w, 0.1, d, 0.03, '#38bdf8', mx, RH + 0.05, mzp); Rf.box(w, 0.6, 0.3, 0.1, '#ffffff', mx, RH + 0.3, Z0); Rf.box(w, 0.6, 0.3, 0.1, '#ffffff', mx, RH + 0.3, Z1); Rf.box(0.3, 0.6, d, 0.1, '#ffffff', X0, RH + 0.3, mzp); Rf.box(0.3, 0.6, d, 0.1, '#ffffff', X1, RH + 0.3, mzp);
          for (let k = 0; k < 5; k++) Rf.box(w - 0.3, 0.06, 0.12, 0.02, k % 2 ? '#0ea5e9' : '#7dd3fc', mx, RH + 0.12, Z0 + 0.6 + k * (d - 1.2) / 4);
          [[X1 - 0.5, -1], [X0 + 0.5, 1]].forEach(([lx]) => { [-0.3, 0.3].forEach((o) => Rf.tor(0.28, 0.04, '#e5e7eb', lx + o, RH + 0.62, Z0 - 0.05, 0, 0, 0, 'gloss', Math.PI)); });
          Rf.cyl(0.25, 0.25, 0.08, '#ffffff', X1 - 1.2, RH + 0.66, Z1 + 0.05); PR.F.lifebuoy(PR.at(Rf, X0 + 1.4, Z1 + 0.25, 0)); // (lifebuoy ring hangs on the rim)
          const wm = new T.Mesh(new T.BoxGeometry(w - 0.3, 0.06, d - 0.3), M.MAT.water); wm.position.set(mx, RH + 0.48, mzp); roofWater.push(wm);
          const lounge = [[px0 - 1, pz1 + 2, 0], [px0 + 1, pz1 + 2, 0], [px0 + 3, pz1 + 2, 0], [px1 + 2, pz0, Math.PI / 2], [px1 + 2, pz1, Math.PI / 2]];
          lounge.forEach(([x, z, ry], i) => { if (!roofBlock([[x, z]])) return; PR.F.deckChair(PR.at(Rf, wx(x), wx(z), ry), i); });
          [[px0 - 1, pz0 - 2], [px1 + 1, pz0 - 2], [px0 + 2, pz1 + 3]].forEach(([x, z], i) => { if (!roofBlock([[x, z]])) return; const a = PR.at(Rf, wx(x), wx(z), 0); PR.F.umbrella(a, i + 2); }); } } }
    // upper storey: facade wall between the rooms' wall tops and the walkable roof, with windows + cornices (hidden with the roof when you are inside)
    const UPH = RH - 0.5 - WH, winC = def.sky === 'night' ? '#ffe9a8' : '#bfe6ff';
    function upper(X, Z, dx, dz, x, z) {
      const ex = X + dx * 0.85, ez = Z + dz * 0.85, len = 2.3, yc = WH + UPH / 2;
      if (dx) Rf.box(0.32, UPH + 0.02, len, 0.04, th.facade, ex, yc, Z); else Rf.box(len, UPH + 0.02, 0.32, 0.04, th.facade, X, yc, ez);
      // cornice bands
      if (dx) { Rf.box(0.46, 0.26, len, 0.08, th.trim, ex + dx * 0.05, WH + 0.1, Z); Rf.box(0.5, 0.3, len, 0.1, th.base, ex + dx * 0.06, RH - 0.45, Z); }
      else { Rf.box(len, 0.26, 0.46, 0.08, th.trim, X, WH + 0.1, ez + dz * 0.05); Rf.box(len, 0.3, 0.5, 0.1, th.base, X, RH - 0.45, ez + dz * 0.06); }
      // window on the outer face
      const ox = ex + dx * 0.17, oz = ez + dz * 0.17, wy = WH + UPH / 2 + 0.05, rx = dz ? Math.PI / 2 : 0, rz = dx ? Math.PI / 2 : 0;
      const w = PR.at(Rf, ex + dx * 0.16, ez + dz * 0.16, Math.atan2(dx, dz)), glass = def.sky === 'night' ? '#ffe9a8' : '#8fd8ff', deep = def.sky === 'night' ? '#c98a2a' : '#2f5f8f';
      if (th.win === 'round' || th.win === 'porthole') { w.cyl(0.62, 0.62, 0.1, th.win === 'porthole' ? '#e2e8f0' : th.trim, 0, wy, 0.0, Math.PI / 2, 0, 0); w.tor(0.52, 0.09, th.win === 'porthole' ? '#c9962e' : th.trim, 0, wy, 0.1, 0, 0, 0, 'gloss'); w.cyl(0.44, 0.44, 0.06, deep, 0, wy, 0.06, Math.PI / 2, 0, 0); w.cyl(0.4, 0.4, 0.04, glass, 0, wy, 0.09, Math.PI / 2, 0, 0, def.sky === 'night' ? 'glow' : 'gloss'); w.box(0.1, 0.5, 0.02, 0.01, '#e8f8ff', -0.1, wy + 0.05, 0.12, 0, 0, 0.6, 'glow'); }
      else if (th.win === 'arch') { w.box(1.1, 1.3, 0.1, 0.04, th.trim, 0, wy - 0.1, 0.02); w.cyl(0.55, 0.55, 0.1, th.trim, 0, wy + 0.55, 0.02, Math.PI / 2, 0, 0); w.box(0.9, 1.2, 0.06, 0.02, glass, 0, wy - 0.1, 0.06, 0, 0, 0, 'gloss'); w.cyl(0.45, 0.45, 0.06, glass, 0, wy + 0.5, 0.06, Math.PI / 2, 0, 0, 'gloss'); w.box(0.06, 1.6, 0.06, 0.02, th.trim, 0, wy + 0.1, 0.1); w.box(1.3, 0.12, 0.3, 0.04, th.trim, 0, wy - 0.78, 0.12); w.box(0.12, 0.8, 0.02, 0.01, '#e8f8ff', -0.22, wy, 0.1, 0, 0, 0.5, 'glow'); }
      else { w.box(1.3, 1.3, 0.16, 0.05, th.trim, 0, wy, 0.04); w.box(1.04, 1.04, 0.06, 0.02, deep, 0, wy, 0.1); w.box(0.96, 0.96, 0.04, 0.02, glass, 0, wy, 0.09, 0, 0, 0, def.sky === 'night' ? 'glow' : 'gloss'); w.box(0.07, 0.96, 0.05, 0.02, th.trim, 0, wy, 0.13); w.box(0.96, 0.07, 0.05, 0.02, th.trim, 0, wy, 0.13); w.box(1.5, 0.12, 0.34, 0.04, th.trim, 0, wy - 0.72, 0.15); if (def.sky !== 'night') w.box(0.12, 0.8, 0.02, 0.01, '#e8f8ff', -0.2, wy + 0.05, 0.13, 0, 0, 0.5, 'glow'); }
    }
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (!P.roofCell[z][x]) continue; const X = wx(x), Z = wx(z); const sky = P.sky.some((s) => s.x === x && s.z === z); if (sky) continue;
      const rmo = roomOf(x, z), ri = rmo ? rmo.i : 0, rc = M.shift(roofCol, ((ri * 7) % 5 - 2) * 0.012, 0, ((ri * 3) % 5 - 2) * 0.03);
      Rf.geo(new T.BoxGeometry(2.0, 0.5, 2.0), (x + z) % 2 ? rc : M.shift(rc, 0, 0, -0.025), X, RH - 0.25, Z);
      if (def.id === 'ship') for (let k = 0; k < 2; k++) Rf.geo(new T.BoxGeometry(2.0, 0.02, 0.09), M.shift(rc, 0, 0, -0.07), X, RH + 0.005, Z - 0.5 + k * 1.0);
      [[1, 0], [0, 1]].forEach(([dx, dz]) => { if (!LG.inside(P, x + dx, z + dz) || !P.roofCell[z + dz][x + dx]) return; const o = roomOf(x + dx, z + dz); if (!o || !rmo || o.i === rmo.i) return; if (dx) Rf.box(0.3, 0.3, 2.05, 0.1, th.trim, X + 1, RH + 0.1, Z); else Rf.box(2.05, 0.3, 0.3, 0.1, th.trim, X, RH + 0.1, Z + 1); });
      DIRS.forEach(([dx, dz]) => { if (LG.inside(P, x + dx, z + dz) && P.roofCell[z + dz][x + dx]) return; upper(X, Z, dx, dz, x, z); if (dx) Rf.box(0.3, 0.45, 2.0, 0.1, th.trim, X + dx * 0.9, RH + 0.2, Z); else Rf.box(2.0, 0.45, 0.3, 0.1, th.trim, X, RH + 0.2, Z + dz * 0.9);
        if (def.id === 'castle' && (x + z) % 2 === 0) { if (dx) Rf.box(0.4, 0.7, 0.9, 0.1, '#ece6ff', X + dx * 0.9, RH + 0.75, Z); else Rf.box(0.9, 0.7, 0.4, 0.1, '#ece6ff', X, RH + 0.75, Z + dz * 0.9); }
        if (def.id === 'candy') Rf.sph(0.3, '#ffffff', X + dx * 0.95, RH - 0.1, Z + dz * 0.95, 1, 1.6, 1); });
      const rr = rnd(x * 3, z * 5); const nearSky = P.sky.some((s) => Math.abs(s.x - x) <= 1 && Math.abs(s.z - z) <= 1) || P.roofPts.some((p) => Math.abs(p.x - x) <= 1 && Math.abs(p.z - z) <= 1);
      if (!nearSky && rr < 0.025 && roofBlock([[x, z]])) { const a = PR.at(Rf, X, Z, rr * 60); if (def.id === 'ship') { if ((x + z) % 2) PR.F.deckChair(a, x); else PR.F.umbrella(a, z); } else if (def.id === 'candy') PR.F.lollipop(a, x + z); else if (def.id === 'castle') a.cone(0.6, 1.2, '#ffd23f', 0, RH + 1.0, 0, 0, 0, 0, 'gloss'); else if (def.id === 'toys') a.box(1.2, 1.2, 1.2, 0.2, ['#ef4444', '#22c55e', '#3b82f6'][(x + z) % 3], 0, RH + 0.6, 0, 0, rr * 9, 0, 'gloss'); else { a.box(1.4, 0.9, 1.0, 0.15, '#cbd5e1', 0, RH + 0.45, 0); a.cyl(0.35, 0.35, 0.1, '#64748b', 0, RH + 0.92, 0); } }
    }
    if (def.id === 'castle') { const [x0, z0, x1, z1] = P.bbox; [[x0, z0 + 4], [x1, z0 + 4], [x0, z1], [x1, z1], [16, 1], [28, 1]].forEach(([x, z]) => { roofBlock([[x, z]]); const X = wx(x), Z = wx(z); Rf.cyl(1.6, 1.8, 10.5, '#ece6ff', X, 5.25, Z, 0, 0, 0, null, 18); Rf.tor(1.7, 0.18, '#ffd23f', X, 10.4, Z, Math.PI / 2, 0, 0, 'gloss'); Rf.cone(2.2, 3.4, '#a593ff', X, 12.2, Z, 0, 0, 0, null, 18); Rf.cyl(0.04, 0.04, 1.6, '#64748b', X, 14.6, Z); Rf.box(0.9, 0.5, 0.04, 0.02, '#ff4fd8', X + 0.45, 15.1, Z); for (let k = 0; k < 3; k++) Rf.cap(0.18, 0.4, '#5b4b8a', X + Math.sin(k * 2.1 + 0.5) * 1.62, 8 + k * 0.3, Z + Math.cos(k * 2.1 + 0.5) * 1.62, 0, k * 2.1 + 0.5, 0); }); }
    if (def.id === 'candy') { [[8, 8], [8, 20], [33, 19]].forEach(([x, z], i) => { if (!roofBlock([[x, z]])) return; Rf.cyl(0.9, 1.1, 5, '#ffffff', wx(x), RH + 2.5, wx(z)); for (let k = 0; k < 3; k++) Rf.tor(0.95, 0.15, '#ff4f9a', wx(x), RH + 1 + k * 1.5, wx(z), Math.PI / 2, 0, 0, 'gloss'); }); }
    if (def.id === 'museum') { const fz = wx(30) + 1.4, fx = wx(21) + 1; const a = PR.at(Rf, fx, fz, 0); { const tri = (w, h, d, col, y, z) => { const sh = new T.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.lineTo(-w / 2, 0); const g = new T.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); a.geo(g, col, 0, y, z); };
        tri(17.2, 2.6, 3.9, '#d6c39c', WH + 0.4, 0.8); tri(16.4, 2.25, 3.95, '#f2e9da', WH + 0.52, 0.86); tri(13.2, 1.6, 0.1, '#c9b48a', WH + 0.75, 2.84); a.cyl(0.55, 0.55, 0.14, '#ffd23f', 0, WH + 1.3, 2.9, Math.PI / 2, 0, 0, 'gloss', 20); a.sph(0.3, '#7dd3fc', 0, WH + 1.3, 2.98, 1, 1, 0.4, 0, 0, 0, 'glow'); a.box(16.6, 0.25, 3.9, 0.06, '#d6c39c', 0, WH + 0.42, 0.8); } for (let k = -2; k <= 2; k++) if (k) { PR.F.column(PR.at(S, fx + k * 2.4, fz + 1.4, 0)); } a.box(16, 0.4, 3.5, 0.1, '#e8e0d0', 0, WH + 0.2, 0.8); }
    if (def.id === 'toys') { roofBlock([[18, 28], [19, 28], [20, 28], [21, 28]]); const a = PR.at(Rf, wx(20), wx(28) - 0.3, 0); ['#ef4444', '#22c55e', '#3b82f6', '#ffd23f'].forEach((c, k) => { a.box(1.6, 1.6, 1.6, 0.3, c, -3.6 + k * 2.4, RH + 1.0, 0, 0, (k - 1.5) * 0.15, 0, 'gloss'); a.sph(0.4, '#ffffff', -3.6 + k * 2.4, RH + 1.0, 0.82, 1, 1, 0.3, 'glow'); }); PR.F.teddy && 0; }
    if (def.id === 'hideout') { roofBlock([[26, 6], [20, 7]]); const a = PR.at(Rf, wx(26), wx(6), 0); a.cyl(0.08, 0.08, 1.4, '#94a3b8', 0, RH + 0.7, 0); a.sph(0.9, '#e5e7eb', 0, RH + 1.6, 0.3, 1, 1, 0.35, 'gloss'); a.box(1.0, 2.2, 1.0, 0.1, '#8a3f2a', -12, RH + 1.1, 2); }
    // one big rooftop feature per room (gives every roof some character)
    const ROOFP = { candy: ['cupcake', 'gumballMachine', 'lollipop', 'gumdrop', 'candyCane'], museum: ['pyramid', 'planet', 'fountain', 'column'], ship: ['umbrella', 'deckChair', 'lifebuoy', 'palm', 'barrel'], castle: ['cloudBush', 'rainbowArch', 'cloudPuff', 'horse'], toys: ['rocket', 'dino', 'gifts', 'plushPile', 'ballBin'], hideout: ['umbrella', 'plant', 'cooler'] }[def.id] || [];
    const roofProps = [];
    P.rooms.forEach((r, i) => { if (!ROOFP.length) return; const cx = Math.floor((r.x0 + r.x1) / 2), cz = Math.floor((r.z0 + r.z1) / 2); if (!P.roofCell[cz] || !P.roofCell[cz][cx]) return; if ((r.x1 - r.x0) < 3 || (r.z1 - r.z0) < 3) return;
      if (P.sky.some((q) => Math.abs(q.x - cx) <= 2 && Math.abs(q.z - cz) <= 2) || P.roofPts.some((q) => Math.abs(q.x - cx) <= 2 && Math.abs(q.z - cz) <= 2)) return;
      const k = ROOFP[i % ROOFP.length]; if (!PR.F[k]) return; if (P.roofBlock[cz][cx] || !roofBlock([[cx, cz]])) return; const pb = new M.B(); try { PR.F[k](PR.at(pb, 0, 0, (i * 1.3) % 6.28), i); } catch (e) { return; } const g = pb.group(true); const sc = def.id === 'castle' ? 1.6 : 1.5; g.scale.setScalar(sc); g.position.set(wx(cx), RH, wx(cz)); roofProps.push(g); });
    const roofG = Rf.group(true); L.roof = new T.Group(); roofProps.forEach((g) => L.roof.add(g)); roofWater.forEach((m) => L.roof.add(m)); L.roof.add(roofG); L.dyn.sky.forEach((m) => L.roof.add(m)); scene.add(L.roof);
    if (P.start && !def.hub || def.hub) { // big name sign over the entrance
      const [x0, z0, x1, z1] = P.bbox, st = P.start; let sx, sz, ry;
      if (st.z > z1) { sx = wx(st.x); sz = (z1 + 1) * C + 0.25; ry = 0; } else if (st.z < z0) { sx = wx(st.x); sz = z0 * C - 0.25; ry = Math.PI; } else if (st.x > x1) { sx = (x1 + 1) * C + 0.25; sz = wx(st.z); ry = Math.PI / 2; } else { sx = x0 * C - 0.25; sz = wx(st.z); ry = -Math.PI / 2; }
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 224; const cx = cv.getContext('2d');
      cx.fillStyle = th.trim; cx.fillRect(0, 0, 1024, 224); cx.fillStyle = th.base; cx.fillRect(10, 10, 1004, 204); cx.fillStyle = th.trim; cx.fillRect(22, 22, 980, 180);
      const txt = (def.full || def.name).toUpperCase(); let fs = 120; cx.font = '900 ' + fs + 'px "Lilita One", "Arial Black", sans-serif'; while (cx.measureText(txt).width > 920 && fs > 40) { fs -= 4; cx.font = '900 ' + fs + 'px "Lilita One", "Arial Black", sans-serif'; }
      cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.lineWidth = 14; cx.strokeStyle = '#ffffff'; cx.strokeText(txt, 512, 118); cx.fillStyle = th.base; cx.fillText(txt, 512, 118);
      const tex = new T.CanvasTexture(cv); tex.anisotropy = 4; const sign = new T.Mesh(new T.PlaneGeometry(9, 1.97), new T.MeshBasicMaterial({ map: tex }));
      const g = new T.Group(); g.position.set(sx, WH + UPH / 2 + 0.05, sz); g.rotation.y = ry; sign.position.z = 0.16; g.add(sign);
      const fb = new M.B(); fb.box(9.5, 2.4, 0.26, 0.1, th.base, 0, 0, 0, 0, 0, 0, 'gloss'); [-1, 1].forEach((k) => fb.sph(0.22, '#ffd23f', k * 4.75, 1.2, 0.15, 1, 1, 1, 0, 0, 0, 'glow')); fb.meshes(true).forEach((m) => g.add(m)); L.roof.add(g); L.sign = g; }


    /* ---------- room lids: rooms you are not near get a ceiling cap (so the building never looks like open-top boxes) ---------- */
    L.lids = [];
    P.rooms.forEach((r) => { if (r.open) return; const x0 = (r.x0 + 0.5) * C, x1 = (r.x1 + 0.5) * C, z0 = (r.z0 + 0.5) * C, z1 = (r.z1 + 0.5) * C, w = x1 - x0, d = z1 - z0; if (w < 2 || d < 2) return;
      const lb = new M.B(), col = M.shift(th.roof, ((r.i * 7) % 5 - 2) * 0.012, 0, ((r.i * 3) % 5 - 2) * 0.03 - 0.02), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, y = WH + 0.3;
      lb.box(w, 0.2, d, 0.06, col, cx, y, cz); lb.box(w + 0.3, 0.12, 0.34, 0.05, th.trim, cx, y + 0.1, z0); lb.box(w + 0.3, 0.12, 0.34, 0.05, th.trim, cx, y + 0.1, z1); lb.box(0.34, 0.12, d + 0.3, 0.05, th.trim, x0, y + 0.1, cz); lb.box(0.34, 0.12, d + 0.3, 0.05, th.trim, x1, y + 0.1, cz);
      for (let gx = x0 + 3; gx < x1 - 1.5; gx += 4) for (let gz = z0 + 3; gz < z1 - 1.5; gz += 4) lb.box(1.2, 0.08, 1.2, 0.04, M.shift(col, 0, 0, 0.05), gx, y + 0.12, gz);
      const g = lb.group(false); g.visible = false; scene.add(g); L.lids.push({ m: g, x0, x1, z0, z1 }); });

    /* ---------- getaway vehicle ---------- */
    if (P.exit) { const v = M.vehicle(def.vehicle || 'van'); v.position.set(wx(P.exit.x), def.water ? L.waterY - 0.05 : 0, wx(P.exit.z)); v.rotation.y = def.water ? Math.PI / 2 : -Math.PI / 2; scene.add(v); L.dyn.vehicle = v; }

    /* ---------- assemble static ---------- */
    const sg = S.group(true); sg.children.forEach((m) => { m.receiveShadow = true; }); scene.add(sg);
    const fg = FL.group(false); fg.children.forEach((m) => { m.receiveShadow = true; m.castShadow = false; }); scene.add(fg);
    L.static = [sg, fg];
    { const base = [M.mat, M.matGloss, M.matGlow], list = []; scene.traverse((o) => { if (o.isMesh && base.indexOf(o.material) >= 0) list.push(o); }); L.caps = [];
      list.forEach((o) => { o.material = M.cut(o.material); o.customDepthMaterial = M.cutDepth; const c = new T.Mesh(o.geometry, M.capMat); c.position.copy(o.position); c.rotation.copy(o.rotation); c.scale.copy(o.scale); c.visible = false; c.castShadow = false; c.receiveShadow = false; c.matrixAutoUpdate = o.matrixAutoUpdate; if (o.parent) o.parent.add(c); c.updateMatrix(); L.caps.push({ c, o }); }); }
    L.windows = winN;
    return L;
  };
})();
