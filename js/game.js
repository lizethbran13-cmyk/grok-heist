/* Grok Heist Crew - core: renderer, levels, hero, abilities, gadgets, events, camera, main loop */
(function () {
  'use strict';
  const GH = window.GH, U = GH.U, M = GH.M, D = GH.D, LG = GH.LG, T = THREE;
  const C = D.CELL, wx = LG.wx;
  const G = GH.G = { t: 0, ready: false, playing: false, mode: 'title', remotes: {}, room: null, camYaw: 0.3, camPitch: 0.62, camDist: 7.2, phase: 'none', stats: {}, inv: {}, sel: 'banana', loot: {} };
  let UI, AI, Snd, FX;
  const SAVE_KEY = 'grokHeist.save';
  function defSave() { return { v: 1, coins: 0, stars: {}, best: {}, done: {}, unlocked: ['candy'], up: {}, owned: ['classic'], outfit: { hacker: 'classic', lookout: 'classic', acrobat: 'classic', muscle: 'classic' }, role: 'hacker', trophies: {}, heists: 0, lootTotal: 0, seenHow: false }; }
  G.load = function () { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === 1) return Object.assign(defSave(), s); } catch (e) {} return defSave(); };
  G.persist = function () { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) {} };
  G.gfx = localStorage.getItem('grokHeist.gfx') || 'high'; G.gfxUser = !!localStorage.getItem('grokHeist.gfx');

  G.init = function () {
    UI = GH.UI; AI = GH.AI; Snd = GH.Snd; FX = GH.FX;
    G.save = G.load(); M.low = G.gfx === 'low';
    const cv = document.getElementById('c');
    const R = G.renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    G.prMax = Math.min(window.devicePixelRatio || 1, 2); R.setPixelRatio(G.gfx === 'low' ? 1 : G.prMax);
    R.outputEncoding = T.LinearEncoding; R.toneMapping = T.NoToneMapping; // colours authored in display space: show them vivid, no filmic wash
    R.shadowMap.enabled = G.gfx !== 'low'; R.shadowMap.type = T.PCFSoftShadowMap;
    G.cam = new T.PerspectiveCamera(62, 1, 0.1, 900);
    onResize(); window.addEventListener('resize', onResize);
    UI.init(G); FX.init(G);
    G.loadLevel('hideout', { title: true });
    G.ready = true; requestAnimationFrame(loop);
  };
  function onResize() { const w = innerWidth, h = innerHeight; G.renderer.setSize(w, h); G.cam.aspect = w / h; G.cam.fov = w < h ? 66 : 55; G.cam.updateProjectionMatrix(); }
  G.isGuest = () => !!(G.room && G.room.opened && !G.room.isHost);
  G.isHost = () => !G.room || !G.room.opened || G.room.isHost;
  G.myPid = () => (G.room && G.room.opened ? G.room.pid : 'me');
  G.myName = () => GH.GN_name || 'Player';

  /* ---------- level loading ---------- */
  function dispose(scene) { scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  G.loadLevel = function (id, opt) {
    opt = opt || {};
    if (G.L) { AI.clear(); dispose(G.L.scene); FX.clear(); }
    for (const k in G.remotes) { G.remotes[k].model = null; }
    const def = D.LEVELS[id]; const L = G.L = GH.Build(def, { low: G.gfx === 'low' }); G.P = L.P; G.lvl = id; G.hub = !!def.hub;
    G.escape = null; G.camOverride = null; G.t = 0; G.time = 0; G.phase = G.hub ? 'hub' : 'sneak'; G.stats = { caught: 0, alarms: 0, loot: 0, lootN: 0, big: 0 }; G.loot = {}; G.carryRemote = {};
    // inventory
    const up = G.save.up; G.inv = { hook: 3, banana: 2 + (up.banana || 0), smoke: 2 + (up.smoke || 0), decoy: 2 + (up.decoy || 0), mirror: 1 + (up.mirror || 0) };
    if (!G.inv[G.sel]) G.sel = 'banana';
    // loot objects
    const lk = { candy: 'candy', museum: 'gem', ship: 'coin', castle: 'pearl', toys: 'bag' }[id] || 'coin';
    L.lootM = {}; G.P.loot.forEach((l) => { const m = M.loot(l.big ? l.model : lk); m.position.set(wx(l.x), 0, wx(l.z)); if (!l.big) m.position.y = 0.15; L.scene.add(m); L.lootM[l.id] = m; l.home = [wx(l.x), wx(l.z)]; l.pos = l.home.slice(); });
    if (G.P.target) { const tg = def.target; const g = new T.Group(); const b = new M.B(); b.cyl(0.75, 0.9, 0.9, '#f5f0e6', 0, 0.45, 0); b.tor(0.76, 0.06, '#ffd23f', 0, 0.9, 0, Math.PI / 2, 0, 0, 'gloss'); b.cyl(0.95, 1.0, 0.12, '#ffd23f', 0, 0.06, 0, 0, 0, 0, 'gloss'); b.meshes(true).forEach((m) => g.add(m));
      const tm = M.loot(tg.model); tm.position.y = 0.95; tm.scale.setScalar(tg.big ? 1 : 1.3); g.add(tm); g.position.set(wx(G.P.target.x), 0, wx(G.P.target.z)); L.scene.add(g); L.targetG = g; L.targetM = tm;
      const halo = new T.Mesh(new T.TorusGeometry(1.1, 0.06, 8, 32), new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.8 })); halo.rotation.x = Math.PI / 2; halo.position.y = 0.95; g.add(halo); L.halo = halo; }
    // objective marker (visible through walls)
    const mk = new T.Group(); const mb = new M.B(); mb.add(new T.OctahedronGeometry(0.4, 0), '#ffd23f', 'glow', 0, 0, 0, 0, 0, 0, 0.8, 1.3, 0.8); mb.meshes(false).forEach((m) => { m.material = M.MAT.marker; mk.add(m); }); mk.renderOrder = 10; L.scene.add(mk); L.marker = mk;
    // xray ping markers pool
    L.xray = [];
    // hero
    const st = G.P.start; G.hero = { x: wx(st.x), z: wx(st.z), y: 0, yaw: G.hub ? Math.PI : Math.PI, spd: 0, vx: 0, vz: 0, role: G.save.role || 'hacker', carry: null, roof: false, vent: false, inv: 0, anim: null, hack: null, abCd: 0, pingT: 0, check: [wx(st.x), wx(st.z)] };
    if (!G.hub) G.hero.yaw = Math.atan2(wx(st.x) - G.hero.x, (wx(G.P.bbox[1]) - G.hero.z)) || Math.PI;
    G.hero.yaw = G.hub ? Math.PI : (G.P.start.z > G.P.bbox[3] ? Math.PI : 0);
    if (G.hub) { let best = -1; [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((yw) => { let n = 0; for (let k = 1; k < 6; k++) { const x = st.x - Math.round(Math.sin(yw)) * k, z = st.z - Math.round(Math.cos(yw)) * k; if (!LG.inside(G.P, x, z) || LG.solid(G.P, x, z)) break; n++; } if (n > best) { best = n; G.hero.yaw = yw; } }); }
    G.setRole(G.hero.role, true);
    G.camYaw = G.hero.yaw + Math.PI; G.camPitch = G.hub ? 0.7 : 0.62;
    if (G.hub) { G.buildTrophies(); G.buildLineup(); }
    AI.init(G);
    G.lastSnap = null; G.mode = opt.title ? 'title' : (G.hub ? 'hub' : 'heist');
    if (!opt.title) { G.playing = true; UI.enterPlay(); }
    Snd.setMusic(G.hub ? 0 : (def.n || 1));
    UI.levelChanged && UI.levelChanged();
    return L;
  };
  G.buildTrophies = function () { const L = G.L; (L.trophySpots || []).forEach(([x, z], i) => { const id = D.ORDER[i]; if (!G.save.trophies[id]) { const q = new M.B(); q.sph(0.25, '#cbd5e1', wx(x), 1.45, wx(z), 1, 1, 1, 0, 0, 0, null); const g = q.group(false); L.scene.add(g); return; } const m = M.loot(D.LEVELS[id].target.model); m.position.set(wx(x), 1.1, wx(z)); m.scale.setScalar(D.LEVELS[id].target.big ? 0.6 : 1); L.scene.add(m); L.anim.push((dt) => { m.rotation.y += dt * 0.8; }); }); };
  G.buildLineup = function () { const L = G.L; L.crewM = D.ROLE_IDS.map((r, i) => { const m = M.crew(r, G.save.outfit[r]); const p = L.lineup[i]; m.position.set(p[0], p[1], p[2]); m.rotation.y = 0; L.scene.add(m); return m; }); };
  G.refreshLineup = function () { if (!G.L || !G.L.crewM) return; G.L.crewM.forEach((m) => G.L.scene.remove(m)); G.buildLineup(); };

  G.setRole = function (role, quiet) {
    const h = G.hero; if (!h) return; if (h.model) G.L.scene.remove(h.model);
    if (h.carry && h.carry.indexOf('big') === 0 && role !== 'muscle') G.ev('uncarry', { id: h.carry.slice(4), x: h.x, z: h.z });
    if (h.carry === 'target' && D.LEVELS[G.lvl].target && D.LEVELS[G.lvl].target.big && role !== 'muscle') G.ev('tdrop', { x: h.x, z: h.z });
    h.role = role; G.save.role = role; h.model = M.crew(role, G.save.outfit[role]); h.model.position.set(h.x, h.y, h.z); G.L.scene.add(h.model); h.carryM = null;
    if (!quiet) { G.fx('swap', h.x, h.z); UI.toast(D.ROLES[role].icon + ' You are the ' + D.ROLES[role].name + '!'); }
    if (G.room && G.room.opened) G.room.setState({ role });
    UI.roleChanged && UI.roleChanged();
  };
  G.takenRoles = function () { const t = {}; if (G.room && G.room.opened) G.room.players().forEach((p) => { if (p.pid !== G.room.pid && p.state && p.state.role) t[p.state.role] = p.name; }); return t; };
  G.trySwap = function (role) { const t = G.takenRoles(); if (t[role]) { UI.toast(t[role] + ' is the ' + D.ROLES[role].name + '. Ask them for help!', true); return false; } G.setRole(role); return true; };
  G.cycleRole = function () { const i = D.ROLE_IDS.indexOf(G.hero.role); const t = G.takenRoles(); for (let k = 1; k <= 4; k++) { const r = D.ROLE_IDS[(i + k) % 4]; if (!t[r]) { G.setRole(r); return; } } };

  /* ---------- players list (for AI) ---------- */
  G.players = function () {
    const h = G.hero, out = [{ pid: G.myPid(), x: h.x, z: h.z, roof: h.roof, vent: h.vent, inv: h.inv, anim: !!(h.anim && h.anim.safe), carry: h.carry ? (h.carry === 'target' ? 'target' : 'big') : null, safe: G.phase === 'done' }];
    for (const k in G.remotes) { const r = G.remotes[k]; if (r.lvl !== G.lvl || !r.seen) continue; out.push({ pid: k, x: r.x, z: r.z, roof: r.roof, vent: r.vent, inv: r.inv || 0, anim: !!r.an, carry: r.carry ? (r.carry === 'target' ? 'target' : 'big') : null }); }
    return out;
  };

  /* ---------- events (host authoritative) ---------- */
  G.ev = function (type, data) { data = data || {}; data.by = data.by || G.myPid(); if (G.isGuest()) { G.room.send({ t: 'req', e: type, d: data, lv: G.lvl }); return; } G.applyEv(type, data); if (G.room && G.room.opened) G.room.broadcast({ t: 'ev', e: type, d: data, lv: G.lvl, id: G.room.pid }); };
  G.applyEv = function (type, d) {
    const P = G.P, L = G.L, S = P.state, me = d.by === G.myPid();
    const host = G.isHost();
    switch (type) {
      case 'lock': if (S.locks[d.id]) return; S.locks[d.id] = 1; G.fx('door', wx(P.locks[d.id].cells[0][0]), wx(P.locks[d.id].cells[0][1])); if (me) UI.toast('🔓 Vault door open!'); break;
      case 'cam': S.cams[d.id] = 1; G.fx('hackok'); if (me) UI.toast('📷 Camera off!'); break;
      case 'laser': if (S.lasers[d.id]) return; S.lasers[d.id] = 1; G.fx('hackok'); if (d.mirror && host) AI.spawnGadget('mirror', d.x, d.z, 0); if (me) UI.toast(d.mirror ? '🪞 Lasers bounced away!' : '⚡ Lasers off!'); break;
      case 'secret': if (S.secret) return; S.secret = true; G.fx('secret'); UI.toast('🕯️ A secret passage opened!'); break;
      case 'crate': S.crates[d.id] = d.to; G.fx('thud', wx(d.to[0]), wx(d.to[1])); { const dc = L.dyn.crates[d.id]; dc.anim = { t: 0, from: dc.g.position.clone(), to: new T.Vector3(wx(d.to[0]), 0, wx(d.to[1])) }; } break;
      case 'loot': { if (S.loot[d.id]) return; S.loot[d.id] = d.by; const l = P.loot.find((q) => q.id === d.id); const m = L.lootM[d.id]; if (m) m.visible = false; if (l && !l.big) { G.stats.loot += 25; G.stats.lootN++; G.fx('coin', wx(l.x), wx(l.z)); G.pop(wx(l.x), 1.4, wx(l.z), '+25'); } break; }
      case 'carry': { const l = P.loot.find((q) => q.id === d.id); if (!l || l.carried || S.loot[d.id]) return; l.carried = d.by; L.lootM[d.id].visible = false; if (me) { G.hero.carry = 'big:' + d.id; UI.toast('💪 Carrying the ' + l.name + '! Bring it to the getaway ride.'); } else G.carryRemote[d.by] = 'big:' + d.id; G.fx('lift'); break; }
      case 'uncarry': { const l = P.loot.find((q) => q.id === d.id); if (!l) return; l.carried = null; l.pos = d.home ? l.home.slice() : [d.x, d.z]; const m = L.lootM[d.id]; m.visible = true; m.position.set(l.pos[0], 0, l.pos[1]); if (G.hero.carry === 'big:' + d.id) G.hero.carry = null; for (const k in G.carryRemote) if (G.carryRemote[k] === 'big:' + d.id) delete G.carryRemote[k]; break; }
      case 'deliver': { const l = P.loot.find((q) => q.id === d.id); if (!l || S.loot[d.id]) return; S.loot[d.id] = d.by; l.carried = null; G.stats.loot += l.v; G.stats.big++; if (G.hero.carry === 'big:' + d.id) G.hero.carry = null; for (const k in G.carryRemote) if (G.carryRemote[k] === 'big:' + d.id) delete G.carryRemote[k]; G.fx('cash'); G.pop(L.dyn.vehicle.position.x, 3, L.dyn.vehicle.position.z, '+' + l.v + ' 💰'); UI.toast('📦 ' + l.name + ' loaded! +' + l.v); break; }
      case 'target': if (S.target !== 'home' && !(S.target && S.target.drop)) return; S.target = { by: d.by }; L.targetM.visible = false; L.halo.visible = false; if (me) G.hero.carry = 'target'; else G.carryRemote[d.by] = 'target';
        if (G.phase === 'sneak') { G.phase = 'escape'; G.say('🎉 Got the ' + D.LEVELS[G.lvl].target.name + '! Now ESCAPE to the getaway ride!'); G.fx('grab'); if (host) AI.addHeat(10, wx(P.target.x), wx(P.target.z)); }
        if (me) G.hero.check = [wx(P.target.x), wx(P.target.z)]; break;
      case 'tdrop': S.target = { drop: [d.x, d.z] }; if (G.hero.carry === 'target') G.hero.carry = null; for (const k in G.carryRemote) if (G.carryRemote[k] === 'target') delete G.carryRemote[k]; L.targetG.position.set(d.x, 0, d.z); L.targetM.visible = true; L.halo.visible = true; L.targetG.children.slice(0, 1).forEach((m) => { m.visible = false; }); break;
      case 'gadget': if (host) AI.spawnGadget(d.k, d.x, d.z, d.yaw, d.uid); G.fx(d.k, d.x, d.z); break;
      case 'heat': if (host) { AI.addHeat(d.n, d.x, d.z); if (d.alert) AI.alertNear(d.x, d.z, 2); } break;
      case 'finish': if (G.phase === 'done') return; G.phase = 'done'; G.finishRes = d.res; G.startEscape(d.res); break;
      case 'lvl': if (!host || d.by !== G.myPid()) G.goLevel(d.id, true); break;
      case 'ping': if (!me) G.showPing(false); break;
    }
  };

  /* ---------- level transitions ---------- */
  G.goLevel = function (id, fromNet) {
    if (G.room && G.room.opened && !fromNet) { if (!G.room.isHost) { UI.toast('Only the host can start a heist - ask them! 🙂', true); return; } G.room.broadcast({ t: 'ev', e: 'lvl', d: { id, by: G.room.pid }, lv: G.lvl, id: G.room.pid }); }
    UI.fade(() => { G.loadLevel(id); if (!D.LEVELS[id].hub) UI.briefing(id); });
  };
  G.startHeist = function (id) { G.save.lastHeist = id; G.goLevel(id); };
  G.toHideout = function () { G.goLevel('hideout'); };

  /* ---------- hero actions ---------- */
  const DIR4 = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const dirsByYaw = (yaw) => DIR4.slice().sort((a, b) => Math.abs(U.ang(Math.atan2(a[0], a[1]) - yaw)) - Math.abs(U.ang(Math.atan2(b[0], b[1]) - yaw)));
  function heroCell() { return [LG.cx(G.hero.x), LG.cx(G.hero.z)]; }
  // find a crossing over a gap / counter / laser in the facing direction
  G.findCross = function (kinds, maxN) {
    const h = G.hero, P = G.P; const [cx, cz] = heroCell();
    for (const [dx, dz] of dirsByYaw(h.yaw).slice(0, 2)) {
      // the obstacle must be within reach ahead
      const ax = LG.cx(h.x + dx * 1.3), az = LG.cx(h.z + dz * 1.3); let sx = ax, sz = az; if (sx === cx && sz === cz) continue;
      const c0 = P.ch[sz] && P.ch[sz][sx]; if (!c0 || kinds.indexOf(c0) < 0) continue;
      if (c0 === 'Z' && !AI.laserOn(P.laserAt[sx + ',' + sz])) continue;
      for (let k = 1; k <= (maxN || 6); k++) { const x = sx + dx * k, z = sz + dz * k; if (!LG.inside(P, x, z)) break; const c = P.ch[z][x]; if (kinds.indexOf(c) >= 0) continue; if (LG.solid(P, x, z)) break; return { to: [wx(x), wx(z)], kind: c0, dir: [dx, dz] }; }
    }
    return null;
  };
  G.near = function () {
    const h = G.hero, P = G.P, S = P.state, out = {};
    const d2 = (x, z) => Math.hypot(x - h.x, z - h.z);
    out.vent = P.vents.map((v) => { const da = d2(wx(v.a[0]), wx(v.a[1])), db = d2(wx(v.b[0]), wx(v.b[1])); return da < 1.7 ? { v, to: v.b } : db < 1.7 ? { v, to: v.a } : null; }).find((x) => x);
    out.lock = P.locks.find((l) => !S.locks[l.id] && l.cells.some((c) => d2(wx(c[0]), wx(c[1])) < 3.1));
    out.cam = AI.cams.filter((c) => !S.cams[c.id] && d2(c.X, c.Z) < 5).sort((a, b) => d2(a.X, a.Z) - d2(b.X, b.Z))[0];
    out.laser = P.lasers.find((g) => !S.lasers[g.id] && g.cells.some((c) => d2(wx(c[0]), wx(c[1])) < 3.2));
    out.crate = P.crates.find((c) => { const s = S.crates[c.id]; const x = s ? s[0] : c.x, z = s ? s[1] : c.z; return !L().dyn.crates[c.id].anim && d2(wx(x), wx(z)) < 2.2; });
    out.big = P.loot.find((l) => l.big && !S.loot[l.id] && !l.carried && d2(l.pos[0], l.pos[1]) < 1.9);
    out.lever = !S.secret && P.levers.find((l) => d2(wx(l.x), wx(l.z)) < 1.9);
    out.roofPt = P.roofPts.find((p) => d2(wx(p.x), wx(p.z)) < 2.0);
    const tp = S.target === 'home' ? [wx(P.target.x), wx(P.target.z)] : (S.target && S.target.drop) ? S.target.drop : null;
    out.target = tp && d2(tp[0], tp[1]) < 1.9;
    out.van = L().dyn.vehicle && d2(L().dyn.vehicle.position.x, L().dyn.vehicle.position.z) < 4.6;
    out.gap = G.findCross(['~'], 6); out.vault = G.findCross(['=', 'Z'], 4);
    return out;
  };
  const L = () => G.L;
  // context for ACTION + ABILITY buttons
  G.context = function () {
    const h = G.hero, role = h.role; const act = { label: '', fn: null }, ab = { label: D.ROLES[role].ab, fn: null, on: false };
    if (h.anim || h.hack || G.phase === 'done') return { act, ab };
    if (G.hub) { const s = (G.L.stationPts || []).map((q) => ({ q, d: Math.hypot(q.X - h.x, q.Z - h.z) })).filter((q) => q.d < 3.8).sort((a, b) => a.d - b.d)[0]; if (s) { act.label = s.q.label; act.fn = () => UI.station(s.q.k); } ab.label = D.ROLES[role].ab; ab.fn = () => UI.toast('Use your ' + D.ROLES[role].name + ' skills on a heist! Head to the 🗺️ planning table.'); ab.on = false; return { act, ab }; }
    if (h.roof) {
      const P = G.P; const sk = P.sky.find((s) => Math.hypot(wx(s.x) - h.x, wx(s.z) - h.z) < 1.6); if (sk) { act.label = '⬇️ DROP IN'; act.fn = () => G.heroAnim({ kind: 'drop', to: [wx(sk.x), 0, wx(sk.z)], dur: 0.8, arc: 0.5, safe: true, done: () => { h.roof = false; } }); }
      const rp = P.roofPts.find((p) => Math.hypot(wx(p.x) - h.x, wx(p.z) - h.z) < 3.4); if (rp && !sk) { act.label = '⬇️ CLIMB DOWN'; act.fn = () => G.heroAnim({ kind: 'climb', to: [wx(rp.x), 0, wx(rp.z)], dur: 0.9, arc: 0.3, safe: true, done: () => { h.roof = false; } }); }
      if (role === 'lookout') { ab.on = h.abCd <= 0; ab.fn = () => G.ping(); ab.label = 'PING'; } return { act, ab };
    }
    const n = G.near(); const S = G.P.state; const def = D.LEVELS[G.lvl];
    const need = (r, what) => () => { if (!G.room || !G.room.opened) { if (G.trySwap(r)) UI.toast(D.ROLES[r].icon + ' Swapped to ' + D.ROLES[r].name + ' - now tap ' + D.ROLES[r].ab + '!'); } else { const t = G.takenRoles(); if (t[r]) UI.toast('🙋 ' + t[r] + ' (' + D.ROLES[r].name + ') can ' + what + '!', true); else G.trySwap(r); } };
    // ACTION
    if (n.van && (h.carry === 'target' || (S.target && S.target.by && S.target.by !== G.myPid() && G.phase === 'escape'))) { act.label = '🚀 GETAWAY!'; act.fn = () => G.tryFinish(); }
    else if (n.van && h.carry && h.carry.indexOf('big') === 0) { act.label = '📦 LOAD LOOT'; act.fn = () => G.ev('deliver', { id: h.carry.slice(4) }); }
    else if (n.target && !h.carry) { if (def.target.big && role !== 'muscle') { act.label = '💪 TOO HEAVY'; act.fn = need('muscle', 'carry it'); } else { act.label = '✋ GRAB ' + def.target.icon; act.fn = () => G.ev('target', {}); } }
    else if (n.big && !h.carry) { if (role === 'muscle') { act.label = '💪 LIFT ' + n.big.name.toUpperCase(); act.fn = () => G.ev('carry', { id: n.big.id }); } else { act.label = '💪 TOO HEAVY'; act.fn = need('muscle', 'carry it'); } }
    else if (h.carry && h.carry.indexOf('big') === 0 && !n.van) { act.label = '⬇️ PUT DOWN'; act.fn = () => G.ev('uncarry', { id: h.carry.slice(4), x: h.x + Math.sin(h.yaw) * 1.2, z: h.z + Math.cos(h.yaw) * 1.2 }); }
    else if (n.lever) { act.label = '🕯️ PULL LEVER'; act.fn = () => { const lv = L().dyn.levers.find((q) => q.l === n.lever); if (lv) lv.pull = 1; G.ev('secret', {}); }; }
    else if (n.roofPt) { act.label = '🪝 GRAPPLE UP'; act.fn = () => G.useHookRoof(n.roofPt); }
    else if (n.lock) { if (role === 'hacker') { act.label = '💻 HACK DOOR'; act.fn = () => G.startHack('lock', n.lock.id); } else { act.label = '🔒 NEED HACKER'; act.fn = need('hacker', 'open it'); } }
    else if (n.crate) { if (role === 'muscle') { act.label = '💪 MOVE CRATE'; act.fn = () => G.liftCrate(n.crate); } else { act.label = '📦 NEED MUSCLE'; act.fn = need('muscle', 'move it'); } }
    else if (n.vent) { if (role === 'acrobat') { act.label = '🤸 CRAWL IN'; act.fn = () => G.crawl(n.vent); } else { act.label = '🕳️ VENT: ACROBAT'; act.fn = need('acrobat', 'fit in there'); } }
    else if (n.gap) { if (role === 'acrobat') { act.label = '🤸 WALL-RUN!'; act.fn = () => G.leap(n.gap); } else if (G.inv.hook > 0) { act.label = '🪝 GRAPPLE ACROSS'; act.fn = () => { G.inv.hook--; G.leap(n.gap, true); }; } }
    else if (n.van) { act.label = G.phase === 'escape' ? '🎯 BRING THE ' + def.target.icon : '🎯 FIND THE ' + def.target.icon + ' FIRST'; act.fn = () => UI.toast('Bring the ' + def.target.name + ' here to escape!'); }
    // ABILITY
    if (role === 'hacker') { const tgt = n.lock ? ['lock', n.lock.id, 'DOOR'] : n.cam ? ['cam', n.cam.id, 'CAMERA'] : n.laser ? ['laser', n.laser.id, 'LASERS'] : null; if (tgt) { ab.on = true; ab.label = 'HACK ' + tgt[2]; ab.fn = () => G.startHack(tgt[0], tgt[1]); } else { ab.on = false; ab.label = 'HACK'; ab.fn = () => UI.toast('💻 Get close to a vault door, camera or lasers to hack them.'); } }
    else if (role === 'lookout') { ab.on = h.abCd <= 0; ab.label = h.abCd > 0 ? 'PING ' + Math.ceil(h.abCd) : 'PING'; ab.fn = () => G.ping(); }
    else if (role === 'acrobat') { ab.on = true; if (n.vent) { ab.label = 'CRAWL'; ab.fn = () => G.crawl(n.vent); } else if (n.gap) { ab.label = 'WALL-RUN'; ab.fn = () => G.leap(n.gap); } else if (n.vault) { ab.label = n.vault.kind === 'Z' ? 'LASER FLIP' : 'VAULT'; ab.fn = () => G.leap(n.vault); } else { ab.label = 'FLIP'; ab.fn = () => G.flip(); } }
    else if (role === 'muscle') { if (n.crate) { ab.on = true; ab.label = 'LIFT CRATE'; ab.fn = () => G.liftCrate(n.crate); } else if (n.big && !h.carry) { ab.on = true; ab.label = 'LIFT LOOT'; ab.fn = () => G.ev('carry', { id: n.big.id }); } else if (n.target && !h.carry && def.target.big) { ab.on = true; ab.label = 'LIFT'; ab.fn = () => G.ev('target', {}); } else { ab.on = true; ab.label = 'FLEX'; ab.fn = () => { G.fx('flex', h.x, h.z); G.pop(h.x, 2.6, h.z, '💪 HUP!'); }; } }
    return { act, ab };
  };
  G.heroAnim = function (a) { const h = G.hero; a.t = 0; a.from = [h.x, h.y, h.z]; G.hero.anim = a; if (a.kind !== 'vent') G.fx(a.kind === 'hook' ? 'hook' : 'whoosh', h.x, h.z); };
  G.crawl = function (v) { const h = G.hero; G.fx('vent', h.x, h.z); G.heroAnim({ kind: 'vent', to: [wx(v.to[0]), 0, wx(v.to[1])], dur: 1.5, hide: true, safe: true, done: () => { G.fx('vent', h.x, h.z); UI.toast('🤸 Squeezed through the vent!'); } }); };
  G.leap = function (c, hook) { const h = G.hero; h.yaw = Math.atan2(c.dir[0], c.dir[1]); const dist = Math.hypot(c.to[0] - h.x, c.to[2 - 1] - h.z); G.heroAnim({ kind: hook ? 'hook' : (c.kind === '~' ? 'leap' : 'vault'), to: [c.to[0], 0, c.to[1]], dur: 0.35 + dist * 0.07, arc: c.kind === '~' ? 1.6 : 1.3, safe: true, wallrun: c.kind === '~' && !hook }); };
  G.flip = function () { const h = G.hero; let d = 0; for (let s = 0.4; s <= 3.4; s += 0.2) { const x = h.x + Math.sin(h.yaw) * s, z = h.z + Math.cos(h.yaw) * s; if (LG.solid(G.P, LG.cx(x), LG.cx(z))) break; d = s; } d = Math.max(0, d - 0.4); G.heroAnim({ kind: 'flip', to: [h.x + Math.sin(h.yaw) * d, 0, h.z + Math.cos(h.yaw) * d], dur: 0.45, arc: 1.0, safe: false, spin: true }); };
  G.useHookRoof = function (rp) { const h = G.hero; if (G.inv.hook <= 0 && h.role !== 'acrobat') { UI.toast('🪝 Out of grappling hooks!', true); return; } if (h.role !== 'acrobat') G.inv.hook--; const P = G.P; let best = null, bd = 99; for (const [dx, dz] of DIR4) { const x = rp.x + dx, z = rp.z + dz; if (LG.inside(P, x, z) && P.roofCell[z][x]) { const tx = x + dx, tz = z + dz; const ok = LG.inside(P, tx, tz) && P.roofCell[tz][tx] ? [tx, tz] : [x, z]; best = ok; break; } } if (!best) return;
    G.heroAnim({ kind: 'hook', to: [wx(best[0]), D.ROOF_H, wx(best[1])], dur: 1.0, arc: 1.2, safe: true, done: () => { h.roof = true; UI.toast('🏙️ On the roof! Find the glass skylight to drop in.'); } }); };
  G.liftCrate = function (cr) { const P = G.P, S = P.state; const cur = S.crates[cr.id] || [cr.x, cr.z]; const [hx, hz] = heroCell(); const res = LG.reserved(P);
    const reach = () => LG.bfs(P, hx, hz, (x, z) => !LG.solid(P, x, z)).count; const before = reach(); let best = null;
    const cands = []; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const x = cur[0] + dx, z = cur[1] + dz; if ((!dx && !dz) || !LG.inside(P, x, z) || (x === hx && z === hz)) continue; if (P.ch[z][x] !== '.' || LG.solid(P, x, z) || res[x + ',' + z]) continue; cands.push([x, z, Math.abs(dx) + Math.abs(dz)]); } cands.sort((a, b) => a[2] - b[2]);
    for (const c of cands) { S.crates[cr.id] = [c[0], c[1]]; const after = reach(); S.crates[cr.id] = cur; if (after >= before) { best = c; break; } }
    if (!best) { UI.toast('💪 No room to put it down here!', true); return; }
    G.ev('crate', { id: cr.id, to: [best[0], best[1]] }); G.pop(G.hero.x, 2.6, G.hero.z, '💪 HEAVE!'); };
  G.ping = function () { const h = G.hero; if (h.abCd > 0) return; h.abCd = 9; G.showPing(true); G.ev('ping', {}); };
  G.showPing = function (mine) { const L = G.L; G.hero.pingT = 6 + (G.save.up.radar ? 4 : 0); G.fx('ping', G.hero.x, G.hero.z); if (mine) { const n = AI.guards.filter((g) => Math.hypot(g.x - G.hero.x, g.z - G.hero.z) < 30).length; UI.toast('📡 PING! ' + n + ' guard' + (n === 1 ? '' : 's') + ' nearby - see them through walls!'); } else UI.toast('📡 Your Lookout pinged the guards!'); };
  G.startHack = function (kind, id) { if (G.hero.hack) return; G.hero.hack = { kind, id }; G.fx('hackstart'); UI.hack((ok) => { const hk = G.hero.hack; G.hero.hack = null; if (!ok || !hk) return; G.ev(hk.kind, { id: hk.id }); }); };
  G.useGadget = function () {
    const h = G.hero, k = G.sel; if (G.hub || h.anim || h.hack || G.phase === 'done') return; if (!G.inv[k]) { UI.toast(D.GADGETS[k].icon + ' Out of ' + D.GADGETS[k].name + 's!', true); return; }
    const n = G.near();
    if (k === 'hook') { if (h.roof) return; if (n.roofPt) { G.useHookRoof(n.roofPt); return; } if (n.gap) { G.inv.hook--; G.leap(n.gap, true); return; } UI.toast('🪝 Use it at a gap or a golden 🪝 roof spot!', true); return; }
    if (k === 'mirror') { if (!n.laser) { UI.toast('🪞 Stand next to some lasers first!', true); return; } G.inv.mirror--; const c = n.laser.cells[0]; G.ev('laser', { id: n.laser.id, mirror: true, x: h.x + Math.sin(h.yaw) * 0.6, z: h.z + Math.cos(h.yaw) * 0.6 }); return; }
    G.inv[k]--; const x = k === 'decoy' ? h.x + Math.sin(h.yaw) * 1.2 : k === 'banana' ? h.x - Math.sin(h.yaw) * 0.6 : h.x, z = k === 'decoy' ? h.z + Math.cos(h.yaw) * 1.2 : k === 'banana' ? h.z - Math.cos(h.yaw) * 0.6 : h.z;
    G.ev('gadget', { k, x, z, yaw: h.yaw, uid: U.uid() }); if (k === 'smoke') UI.toast('💨 Poof! Guards can\u2019t see through the smoke.'); if (k === 'decoy') UI.toast('🧸 Honk honk! Guards will go check it out.'); if (k === 'banana') UI.toast('🍌 Banana peel down! Lead a guard over it.');
  };
  G.tryFinish = function () { if (G.isGuest()) { G.room.send({ t: 'req', e: 'finishReq', d: { by: G.myPid() }, lv: G.lvl }); return; } G.finish(); };
  G.finish = function () {
    if (G.phase === 'done') return; const P = G.P, def = D.LEVELS[G.lvl];
    // big loot carried by anyone at the end counts if they are near the ride
    const v = G.L.dyn.vehicle.position; if (G.hero.carry && G.hero.carry.indexOf('big') === 0 && Math.hypot(G.hero.x - v.x, G.hero.z - v.z) < 8) G.applyEv('deliver', { id: G.hero.carry.slice(4), by: G.myPid() });
    const total = P.loot.reduce((s, l) => s + (l.big ? l.v : 25), 0);
    const st = G.stats; const stealth = st.caught === 0 && st.alarms === 0, speed = G.time <= def.par, lootS = st.loot >= total * 0.6;
    const stars = [stealth, speed, lootS];
    const res = { id: G.lvl, time: Math.round(G.time), caught: st.caught, alarms: st.alarms, loot: st.loot, total, lootN: st.lootN, big: st.big, stars, coins: 100 + st.loot + stars.filter((s) => s).length * 50 };
    G.ev('finish', { res });
  };
  G.startEscape = function (res) {
    const h = G.hero; h.carry = null; G.carryRemote = {}; h.model.visible = false; for (const k in G.remotes) if (G.remotes[k].model) G.remotes[k].model.visible = false;
    G.escape = { t: 0, res }; G.fx('engine'); UI.escapeStart();
    // award
    const s = G.save, id = res.id; s.coins += res.coins; s.heists++; s.lootTotal += res.loot; const prev = s.stars[id] || [false, false, false]; s.stars[id] = prev.map((v, i) => v || res.stars[i]); if (!s.best[id] || res.time < s.best[id]) s.best[id] = res.time;
    const first = !s.done[id]; s.done[id] = true; s.trophies[id] = true; const ni = D.ORDER.indexOf(id) + 1; if (ni < D.ORDER.length && s.unlocked.indexOf(D.ORDER[ni]) < 0) { s.unlocked.push(D.ORDER[ni]); res.unlocked = D.ORDER[ni]; } res.first = first; G.persist();
  };
  G.catchPlayer = function (pid, gu) { if (pid === G.myPid()) G.onCaught(); else if (G.room) { G.room.sendTo ? G.room.sendTo(pid, { t: 'caught', id: G.room.pid }) : G.room.broadcast({ t: 'caught', to: pid, id: G.room.pid }); } G.stats.caught++; if (G.isHost()) AI.heat = Math.max(0, AI.heat - 35); };
  G.onCaught = function () {
    const h = G.hero; if (h.inv > 0 || G.phase === 'done') return; if (UI.hackOpen && UI.hackOpen()) UI.hackCancel();
    G.fx('caught'); UI.caught();
    if (h.carry && h.carry.indexOf('big') === 0) G.ev('uncarry', { id: h.carry.slice(4), home: true });
    h.anim = null; h.roof = false; h.vent = false; h.x = h.check[0]; h.z = h.check[1]; h.y = 0; h.inv = 3; h.spd = 0;
    if (G.isGuest()) G.stats.caught++;
  };

  /* ---------- per-frame hero ---------- */
  function solidAt(x, z) { const P = G.P, h = G.hero; const cx = LG.cx(x), cz = LG.cx(z); if (h.roof) return !LG.inside(P, cx, cz) || !P.roofCell[cz][cx]; return LG.solid(P, cx, cz); }
  function collide(px, pz, r) {
    for (let it = 0; it < 3; it++) { let moved = false; const x0 = LG.cx(px - r), x1 = LG.cx(px + r), z0 = LG.cx(pz - r), z1 = LG.cx(pz + r);
      for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) { if (!solidAt(cx * C + 1, cz * C + 1)) continue; const qx = U.clamp(px, cx * C, cx * C + C), qz = U.clamp(pz, cz * C, cz * C + C); let dx = px - qx, dz = pz - qz, d = Math.hypot(dx, dz);
        if (d < r) { if (d < 1e-5) { const l = px - cx * C, rr = cx * C + C - px, t = pz - cz * C, b = cz * C + C - pz, m = Math.min(l, rr, t, b); if (m === l) px = cx * C - r; else if (m === rr) px = cx * C + C + r; else if (m === t) pz = cz * C - r; else pz = cz * C + C + r; } else { px = qx + dx / d * r; pz = qz + dz / d * r; } moved = true; } }
      // getaway vehicle body
      const v = G.L.dyn.vehicle; if (v && !G.hero.roof) { const dx = px - v.position.x, dz = pz - v.position.z, d = Math.hypot(dx, dz); if (d < 2.4 && d > 1e-4) { px = v.position.x + dx / d * 2.4; pz = v.position.z + dz / d * 2.4; } }
      if (!moved) break; }
    return [px, pz];
  }
  G.collide = collide;
  function heroStep(dt) {
    const h = G.hero; h.inv = Math.max(0, h.inv - dt); h.abCd = Math.max(0, h.abCd - dt); h.pingT = Math.max(0, h.pingT - dt);
    if (h.anim) { const a = h.anim; a.t += dt; const k = Math.min(1, a.t / a.dur), e = k * k * (3 - 2 * k);
      h.x = U.lerp(a.from[0], a.to[0], e); h.z = U.lerp(a.from[2], a.to[2], e); h.y = U.lerp(a.from[1], a.to[1], e) + Math.sin(k * Math.PI) * (a.arc || 0); h.vent = !!a.hide && k > 0.15 && k < 0.85;
      if (k >= 1) { h.anim = null; h.vent = false; h.y = a.to[1]; if (a.done) a.done(); } h.spd = 0; return; }
    if (h.hack) { h.spd = 0; return; }
    const inp = UI.inp; const a = G.camYaw; let mx = inp.mx, mz = inp.mz; const mag = Math.min(1, Math.hypot(mx, mz));
    const fx = -Math.sin(a), fz = -Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a);
    let vx = fx * mz + rx * mx, vz = fz * mz + rz * mx; const vl = Math.hypot(vx, vz) || 1; vx /= vl; vz /= vl;
    const maxS = 5.4 * (1 + 0.08 * (G.save.up.speed || 0)) * (h.carry && (h.carry.indexOf('big') === 0 || (h.carry === 'target' && D.LEVELS[G.lvl].target && D.LEVELS[G.lvl].target.big)) ? 0.72 : 1);
    const want = mag > 0.05 ? maxS * mag : 0; h.spd = U.lerp(h.spd, want, Math.min(1, dt * 10));
    if (mag > 0.05) h.yaw = U.lerpAng(h.yaw, Math.atan2(vx, vz), Math.min(1, dt * 12));
    if (h.spd > 0.01) { const dirx = mag > 0.05 ? vx : Math.sin(h.yaw), dirz = mag > 0.05 ? vz : Math.cos(h.yaw); const [nx, nz] = collide(h.x + dirx * h.spd * dt, h.z + dirz * h.spd * dt, 0.42); h.x = nx; h.z = nz; }
    h.y = h.roof ? D.ROOF_H : 0;
    // auto loot pickup
    if (!G.hub && !h.roof) G.P.loot.forEach((l) => { if (!l.big && !G.P.state.loot[l.id] && !G.loot[l.id] && Math.hypot(wx(l.x) - h.x, wx(l.z) - h.z) < 1.2) { G.loot[l.id] = 1; G.ev('loot', { id: l.id }); } });
  }
  function heroDraw(dt) {
    const h = G.hero, m = h.model; if (!m) return; m.position.set(h.x, h.y, h.z); m.rotation.y = h.yaw; m.visible = !h.vent && G.phase !== 'done';
    const u = m.userData; M.animPerson(m, dt, h.anim ? 0 : h.spd, G.t);
    u.body.rotation.x = 0; u.body.rotation.z = 0;
    if (h.anim) { const k = h.anim.t / h.anim.dur; if (h.anim.spin || h.anim.kind === 'vault' || h.anim.kind === 'leap') u.body.rotation.x = k * Math.PI * 2; if (h.anim.wallrun) u.body.rotation.z = Math.sin(k * Math.PI) * 0.6; if (h.anim.kind === 'hook') { u.arms[1].rotation.x = -2.8; } }
    if (h.hack) { u.arms[0].rotation.x = -1.2; u.arms[1].rotation.x = -1.2 + Math.sin(G.t * 20) * 0.15; }
    u.blob.visible = !h.roof && !h.anim;
    // carried item
    const want = h.carry === 'target' ? 't' : h.carry ? h.carry : ''; if (want !== (h.carryK || '')) { h.carryK = want; while (u.carry.children.length) u.carry.remove(u.carry.children[0]); if (want) { const mm = want === 't' ? M.loot(D.LEVELS[G.lvl].target.model) : M.loot((G.P.loot.find((l) => 'big:' + l.id === want) || {}).model); mm.scale.setScalar(want === 't' && !D.LEVELS[G.lvl].target.big ? 0.8 : 0.7); u.carry.add(mm); } }
    if (want) { u.arms[0].rotation.x = -2.9; u.arms[1].rotation.x = -2.9; u.carry.position.y = 2.1 + Math.sin(G.t * 6) * 0.04; }
    if (h.inv > 0 && !h.anim) m.visible = m.visible && (Math.floor(G.t * 10) % 2 === 0 || h.inv < 0.2);
  }

  /* ---------- camera ---------- */
  function camStep(dt) {
    const h = G.hero; const c = UI.cam; G.camYaw -= c.dx * 0.0065; G.camPitch = U.clamp(G.camPitch + c.dy * 0.004, 0.22, 1.2); c.dx = 0; c.dy = 0;
    if (G.escape) { const v = G.L.dyn.vehicle.position; G.camYaw += dt * 0.5; const tx = v.x, ty = v.y + 1.5, tz = v.z; const d = 9.5; G.cam.position.set(tx + Math.sin(G.camYaw) * d, ty + 7.5, tz + Math.cos(G.camYaw) * d); G.cam.lookAt(tx, ty, tz); return; }
    if (G.mode === 'title') { G.camYaw += dt * 0.12; const cx = G.P.W, cz = G.P.H; G.cam.position.set(cx + Math.sin(G.camYaw) * 46, 22, cz + Math.cos(G.camYaw) * 46); G.cam.lookAt(cx, 2, cz); return; }
    if (G.camOverride) { G.cam.position.copy(G.camOverride.pos); G.cam.lookAt(G.camOverride.look); return; }
    const tx = h.x, ty = h.y + 1.5, tz = h.z; let dist = G.camDist; const p = G.camPitch;
    // walls between hero and camera: tilt the camera up (more top-down) so walls never fill the screen
    const ch = (h.roof ? 0 : 1); let hmax = 99; const cs = Math.sin(G.camYaw), cc = Math.cos(G.camYaw);
    if (ch) for (let s = 0.5; s < dist; s += 0.25) { const cx = LG.cx(tx + cs * s), cz = LG.cx(tz + cc * s); if (!LG.inside(G.P, cx, cz)) break; const q = G.P.ch[cz][cx]; if (q === '#' || q === 'S' && !G.P.state.secret || q === 'L' && !G.P.state.locks[G.P.lockAt[cx + ',' + cz]]) { hmax = Math.max(0.6, s - 0.45); break; } }
    let pe = p; if (dist * Math.cos(pe) > hmax) { pe = Math.max(p, Math.min(0.95, Math.acos(U.clamp(hmax / dist, 0, 1)))); } // gentle tilt; the x-ray cutaway handles the rest
    G.camPE = U.lerp(G.camPE == null ? pe : G.camPE, pe, Math.min(1, dt * 6));
    const dx = Math.sin(G.camYaw) * Math.cos(G.camPE), dy = Math.sin(G.camPE), dz = Math.cos(G.camYaw) * Math.cos(G.camPE);
    G.camD = U.lerp(G.camD || dist, dist, Math.min(1, dt * (dist < (G.camD || dist) ? 20 : 4)));
    G.cam.position.set(tx + dx * G.camD, ty + dy * G.camD, tz + dz * G.camD); G.cam.lookAt(tx, ty, tz);
  }

  /* ---------- main step ---------- */
  G.step = function (dt) {
    G.t += dt; const L = G.L; if (!L) return;
    UI.read(dt);
    if (G.playing && !G.paused) {
      if (!G.hub && G.phase !== 'done') G.time += dt;
      if (G.phase !== 'done') heroStep(dt);
      if (!G.hub && G.isHost() && !G.freezeAI) AI.step(dt);
      // host: finish requests handled in net; remote target carrier reaching van
    }
    // escape cinematic
    if (G.escape) { const e = G.escape; e.t += dt; const v = L.dyn.vehicle; const kind = D.LEVELS[G.lvl].vehicle; const sp = Math.min(14, e.t * 6);
      if (kind === 'balloon') v.position.y += dt * Math.min(4, e.t * 1.5); else { const f = new T.Vector3(0, 0, 1).applyAxisAngle(new T.Vector3(0, 1, 0), v.rotation.y); if (e.t > 0.6) v.position.addScaledVector(f, sp * dt); }
      if (e.t > 0.6 && Math.random() < 0.5) FX.burst(v.position.x, v.position.y + 0.6, v.position.z, kind === 'boat' ? '#ffffff' : '#ffd23f', 2, 0.4);
      if (e.t > 3.6 && !e.shown) { e.shown = true; UI.results(e.res); } }
    // dynamic level objects
    const P = G.P;
    L.dyn.locks.forEach((d) => { if (!d) return; const open = P.state.locks[d.lk.id]; d.open = U.lerp(d.open, open ? 1 : 0, Math.min(1, dt * 3)); d.leaf.position.y = -d.open * 2.85; d.leaf.visible = d.open < 0.98; d.light.material.color.set(open ? '#22c55e' : '#ff3b3b'); });
    L.dyn.secret.forEach((s) => { s.t = U.lerp(s.t, P.state.secret ? 1 : 0, Math.min(1, dt * 1.5)); s.g.position.y = -s.t * (D.WALL_H + 0.1); });
    L.dyn.levers.forEach((lv) => { lv.g.rotation.x = U.lerp(lv.g.rotation.x, P.state.secret ? 0.9 : -0.5, Math.min(1, dt * 6)); });
    L.dyn.crates.forEach((dc) => { if (!dc || !dc.anim) return; const a = dc.anim; a.t += dt; const k = Math.min(1, a.t / 0.7); dc.g.position.lerpVectors(a.from, a.to, k); dc.g.position.y = Math.sin(k * Math.PI) * 2.2; dc.g.rotation.y = k * Math.PI; if (k >= 1) { dc.anim = null; dc.g.position.y = 0; G.fx('thud', a.to.x, a.to.z); } });
    if (L.halo) { L.halo.rotation.z += dt; L.targetM.rotation.y += dt * 1.2; L.targetM.position.y = 0.95 + Math.sin(G.t * 2) * 0.08; }
    for (const id in L.lootM) { const m = L.lootM[id]; if (m.visible && !id.startsWith('B')) { m.rotation.y += dt * 2; m.position.y = 0.15 + Math.sin(G.t * 3 + id.length) * 0.06; } }
    L.dyn.roofPts.forEach((r) => { r.scale.setScalar(1 + Math.sin(G.t * 4) * 0.08); });
    if (L.dyn.holo) { L.dyn.holo.rotation.y += dt * 0.6; L.dyn.holo.position.y = 1.6 + Math.sin(G.t * 1.5) * 0.08; }
    L.anim.forEach((f) => f(dt));
    if (L.water) L.water.position.y = -0.55 + Math.sin(G.t * 1.2) * 0.05;
    if (L.crewM) L.crewM.forEach((m, i) => { M.animPerson(m, dt, 0, G.t + i); m.rotation.y = Math.sin(G.t * 0.8 + i) * 0.25; });
    if (!G.hub) AI.draw(dt);
    heroDraw(dt);
    if (GH.Net) GH.Net.tick(dt);
    // roof visibility: hide when inside
    { const h = G.hero; const cx = LG.cx(h.x), cz = LG.cx(h.z); const inside = !h.roof && LG.inside(P, cx, cz) && P.room[cz] && (P.room[cz][cx] >= 0 || 'DLSZ'.indexOf(P.ch[cz][cx]) >= 0) && G.mode !== 'title' && !G.escape; L.roof.visible = !inside || !!(G.camOverride && G.camOverride.roof); }
    // objective marker
    { const mk = L.marker; let pos = null; const S = P.state; if (G.phase === 'sneak' && P.target) pos = S.target === 'home' ? [wx(P.target.x), wx(P.target.z)] : S.target.drop; else if (G.phase === 'escape') { if (G.hero.carry === 'target' || (S.target && S.target.by)) pos = [L.dyn.vehicle.position.x, L.dyn.vehicle.position.z]; else if (S.target && S.target.drop) pos = S.target.drop; }
      mk.visible = !!pos && G.mode !== 'title'; if (pos) { mk.position.set(pos[0], 3.6 + Math.sin(G.t * 3) * 0.25, pos[1]); mk.rotation.y += dt * 2; } G.objPos = pos; }
    // lookout ping xray
    FX.xray(G.hero.pingT > 0);
    // sun follows
    const h = G.hero; L.sun.position.set(h.x + L.sunOff.x, L.sunOff.y, h.z + L.sunOff.z); L.sun.target.position.set(h.x, 0, h.z); L.dome.position.copy(G.cam.position);
    camStep(dt); FX.step(dt);
    { const cu = M.cutU; cu.uCut.value = (G.playing && !G.escape && G.mode !== 'title' && !G.camOverride && !h.roof) ? 1 : 0; cu.uHero.value.set(h.x, h.y + 1.0, h.z); cu.uCam.value.copy(G.cam.position); } Snd.tick(dt, AI.alarmT > 0);
  };

  /* ---------- quality ---------- */
  G.setQuality = function (q, user) {
    G.gfx = q; M.low = q === 'low'; if (user) { localStorage.setItem('grokHeist.gfx', q); G.gfxUser = true; }
    const R = G.renderer; R.setPixelRatio(q === 'low' ? 1 : G.prMax); onResize(); R.shadowMap.enabled = q !== 'low'; if (G.L) { G.L.sun.castShadow = q !== 'low'; G.L.scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); }); }
    G.fpsLow = 0; UI.toast(q === 'low' ? '⚡ Low graphics: faster!' : '✨ High graphics: prettier!'); UI.gfxChanged && UI.gfxChanged();
  };

  /* ---------- loop ---------- */
  let last = performance.now(), fpsT = 0, fpsN = 0;
  function loop(now) {
    requestAnimationFrame(loop); if (G.noLoop) return;
    const raw = Math.min(0.1, (now - last) / 1000); last = now;
    try { G.step(raw); G.renderer.render(G.L.scene, G.cam); UI.frame(raw); } catch (e) { console.error(e); }
    fpsN++; fpsT += raw; if (fpsT > 4) { G.fps = fpsN / fpsT; fpsN = 0; fpsT = 0; if (G.playing && G.gfx === 'high' && !G.gfxUser && !G.noAuto) { if (G.fps < 24) { G.fpsLow = (G.fpsLow || 0) + 1; if (G.fpsLow >= 2) G.setQuality('low', false); } else G.fpsLow = 0; } }
  }
  G.fx = function (k, x, z) { Snd.fx(k); if (FX.event) FX.event(k, x, z); };
  G.pop = function (x, y, z, txt) { FX.pop(x, y, z, txt); };
  G.say = function (txt, bad) { UI.banner(txt, bad); };

  /* ---------- test hooks ---------- */
  window.__gh = { G, GH, get AI() { return GH.AI; }, sim(sec, dt) { dt = dt || 1 / 30; const n = Math.round(sec / dt); for (let i = 0; i < n; i++) G.step(dt); }, draw() { G.renderer.render(G.L.scene, G.cam); },
    tp(x, z, yaw) { const h = G.hero; h.x = x; h.z = z; h.y = 0; h.roof = false; if (yaw != null) h.yaw = yaw; h.anim = null; }, tpc(cx, cz, yaw) { this.tp(wx(cx), wx(cz), yaw); },
    state() { const h = G.hero; return { x: h.x, z: h.z, y: h.y, roof: h.roof, role: h.role, carry: h.carry, lvl: G.lvl, phase: G.phase, heat: Math.round(AI.heat), alarm: AI.alarmT, caught: G.stats.caught, loot: G.stats.loot, fps: G.fps, gfx: G.gfx, mode: G.mode, inv: Object.assign({}, G.inv), anim: h.anim ? h.anim.kind : null, hack: !!h.hack }; } };
})();
