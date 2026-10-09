/* Grok Heist Crew - guards (patrol, vision cones, chase, catch), cameras, lasers, gadgets, heat + alarm (host-authoritative) */
(function () {
  'use strict';
  const GH = window.GH, U = GH.U, M = GH.M, D = GH.D, LG = GH.LG, T = THREE;
  const C = D.CELL, wx = LG.wx;
  const AI = GH.AI = {};
  let G = null;
  const RAYS = 16;
  const coneMats = { patrol: new T.MeshBasicMaterial({ color: '#fff27a', transparent: true, opacity: 0.3, depthWrite: false, side: T.DoubleSide }), sus: new T.MeshBasicMaterial({ color: '#ffb020', transparent: true, opacity: 0.38, depthWrite: false, side: T.DoubleSide }), alert: new T.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: 0.4, depthWrite: false, side: T.DoubleSide }), off: new T.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.2, depthWrite: false, side: T.DoubleSide }) };
  AI.coneMats = coneMats;
  function fan(n) { const g = new T.BufferGeometry(); const pos = new Float32Array((n + 1) * 3), idx = []; for (let i = 1; i < n; i++) idx.push(0, i, i + 1); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setIndex(idx); const m = new T.Mesh(g, coneMats.patrol); m.frustumCulled = false; m.renderOrder = 2; return m; }
  function updFan(m, P, ox, oz, yaw, half, range, y) { const p = m.geometry.attributes.position; p.setXYZ(0, ox, y, oz); for (let i = 0; i <= RAYS; i++) { const a = yaw - half + (i / RAYS) * half * 2; const d = LG.ray(P, ox, oz, a, range); p.setXYZ(i + 1, ox + Math.sin(a) * d, y, oz + Math.cos(a) * d); } p.needsUpdate = true; m.geometry.computeBoundingSphere(); }
  AI.fan = fan; AI.updFan = updFan;

  AI.init = function (g) {
    G = g; const L = G.L, P = L.P, def = L.def;
    AI.guards = []; AI.gad = []; AI.heat = 0; AI.alarmT = 0; AI.camT = {}; AI.laserCd = {}; AI.blinkT = 0; AI.flash = 0;
    (def.guards || []).forEach((gd, i) => {
      const sleep = !Array.isArray(gd); const way = sleep ? [gd.at] : gd; const m = M.guard(def.guard || 'guard'); L.scene.add(m);
      const cone = fan(RAYS + 1); cone.geometry.setIndex([].concat(...Array.from({ length: RAYS }, (_, k) => [0, k + 1, k + 2]))); L.scene.add(cone);
      const gu = { id: i, m, cone, way, wi: sleep ? 0 : 1 % way.length, x: wx(way[0][0]), z: wx(way[0][1]), yaw: 0, st: sleep ? 'sleep' : 'patrol', meter: {}, t: 0, route: null, ri: 0, rT: 0, look: 0, tgt: null, last: null, lostT: 0, stunT: 0, spd: 0, sleep, slipImm: 0, icon: '', anim: 0 };
      if (!sleep && way.length > 1) gu.yaw = Math.atan2(wx(way[1][0]) - gu.x, wx(way[1][1]) - gu.z); else gu.yaw = Math.PI;
      m.position.set(gu.x, 0, gu.z); AI.guards.push(gu);
    });
    AI.cams = P.cams.map((c) => { const cone = fan(RAYS + 1); cone.geometry.setIndex([].concat(...Array.from({ length: RAYS }, (_, k) => [0, k + 1, k + 2]))); L.scene.add(cone); return { id: c.id, c, cone, yaw: c.yaw, seen: 0, cd: 0, X: L.dyn.cams[c.id].X, Z: L.dyn.cams[c.id].Z }; });
  };
  AI.clear = function () { (AI.gad || []).forEach((q) => { if (q.m && q.m.parent) q.m.parent.remove(q.m); }); AI.guards = []; AI.cams = []; AI.gad = []; };

  const range = (gu) => gu.st === 'sleep' ? 2.2 : (AI.alarmT > 0 || gu.st === 'chase' || gu.st === 'search') ? 11 : 9;
  const half = (gu) => gu.st === 'sleep' ? Math.PI : 0.62;
  function smokeBlocks(ax, az, bx, bz) { for (const q of AI.gad) { if (q.k !== 'smoke' || q.t <= 0) continue; const r = q.r; const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1; const t = U.clamp(((q.x - ax) * dx + (q.z - az) * dz) / l2, 0, 1); if (Math.hypot(ax + dx * t - q.x, az + dz * t - q.z) < r) return true; } return false; }
  AI.inSmoke = (x, z) => AI.gad.some((q) => q.k === 'smoke' && q.t > 0 && Math.hypot(q.x - x, q.z - z) < q.r);
  function canSee(ox, oz, yaw, hf, rg, p) {
    const dx = p.x - ox, dz = p.z - oz, d = Math.hypot(dx, dz); if (d > rg) return 0;
    if (d > 1.3) { const a = Math.abs(U.ang(Math.atan2(dx, dz) - yaw)); if (a > hf) return 0; }
    if (!LG.los(G.P, ox, oz, p.x, p.z)) return 0; if (smokeBlocks(ox, oz, p.x, p.z)) return 0; return d;
  }
  AI.canSee = canSee;
  function goTo(gu, x, z) { const P = G.P; const sx = LG.cx(gu.x), sz = LG.cx(gu.z), tx = LG.cx(x), tz = LG.cx(z); const r = LG.path(P, sx, sz, tx, tz, (cx, cz) => LG.solid(P, cx, cz)); gu.route = r ? r.map((c) => [wx(c[0]), wx(c[1])]) : null; if (gu.route && gu.route.length) { gu.route[gu.route.length - 1] = [x, z]; } gu.ri = 1; }
  function follow(gu, spd, dt) {
    if (!gu.route || gu.ri >= gu.route.length) return true;
    const [tx, tz] = gu.route[gu.ri]; const dx = tx - gu.x, dz = tz - gu.z, d = Math.hypot(dx, dz);
    if (d < 0.25) { gu.ri++; return gu.ri >= gu.route.length; }
    const s = Math.min(d, spd * dt); gu.x += dx / d * s; gu.z += dz / d * s; gu.yaw = U.lerpAng(gu.yaw, Math.atan2(dx, dz), Math.min(1, dt * 8)); gu.spd = spd; return false;
  }
  AI.addHeat = function (n, x, z, why) {
    if (G.phase === 'done') return; AI.heat = U.clamp(AI.heat + n, 0, 100); AI.flash = 1;
    if (AI.heat >= 100 && AI.alarmT <= 0) { AI.alarmT = 18; G.stats.alarms++; G.fx('alarm'); G.say('🚨 ALARM! Hide until it calms down!', true); AI.guards.forEach((gu) => { if (gu.st !== 'chase' && gu.st !== 'stun') investigate(gu, x, z, 8); }); }
  };
  function investigate(gu, x, z, t) { if (gu.st === 'sleep' && t < 8) return; if (gu.st === 'stun') return; gu.st = 'investigate'; gu.inv = [x, z]; gu.t = t || 5; goTo(gu, x, z); }
  AI.investigate = investigate;
  AI.alertNear = function (x, z, n, rad) { AI.guards.filter((gu) => gu.st !== 'chase' && gu.st !== 'stun' && Math.hypot(gu.x - x, gu.z - z) < (rad || 30)).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z)).slice(0, n || 2).forEach((gu) => investigate(gu, x, z, 5)); };

  /* ---------- host simulation ---------- */
  AI.step = function (dt) {
    const P = G.P, players = G.players().filter((p) => !p.safe && !p.vent && !p.roof && p.inv <= 0 && !p.anim);
    const shoes = 1 - 0.15 * (G.save.up.shoes || 0);
    AI.blinkT += dt; AI.flash = Math.max(0, AI.flash - dt * 2);
    if (AI.alarmT > 0) { AI.alarmT -= dt; if (AI.alarmT <= 0) { AI.heat = 55; G.say('😮‍💨 The alarm stopped. Phew!'); } } else AI.heat = Math.max(0, AI.heat - dt * (AI.guards.some((g) => g.st === 'chase') ? 0 : 1.4));
    // guards
    AI.guards.forEach((gu) => {
      gu.slipImm = Math.max(0, gu.slipImm - dt); gu.anim += dt;
      if (gu.st === 'grab') { gu.spd = 0; gu.t -= dt; if (gu.t <= 0) { gu.st = 'return'; gu.slipImm = 1; backToPatrol(gu); } return; }
      if (gu.st === 'stun') { gu.t -= dt; gu.yaw += dt * 9 * Math.max(0, gu.t - 3); gu.spd = 0; if (gu.t <= 0) { gu.st = 'return'; gu.slipImm = 3; backToPatrol(gu); } return; }
      // banana slip
      for (const q of AI.gad) if (q.k === 'banana' && !q.used && gu.slipImm <= 0 && gu.st !== 'sleep' && Math.hypot(q.x - gu.x, q.z - gu.z) < 0.9) { q.used = true; q.t = 0; gu.st = 'stun'; gu.t = 4.5; gu.meter = {}; G.fx('slip', gu.x, gu.z); G.pop(gu.x, 2.6, gu.z, 'WHOA! 🍌'); return; }
      // vision
      const rg = range(gu), hf = half(gu); let best = null, bestD = 99;
      players.forEach((p) => { const d = canSee(gu.x, gu.z, gu.yaw, hf, rg, p); if (d) { if (d < bestD) { bestD = d; best = p; } const rate = (gu.st === 'chase' ? 3 : 1.05) * (1.7 - d / rg) * shoes * (p.carry === 'big' ? 1.25 : 1) * (AI.alarmT > 0 ? 1.4 : 1) * (d < 1.4 ? 3 : 1); gu.meter[p.pid] = Math.min(1.2, (gu.meter[p.pid] || 0) + dt * rate); } else gu.meter[p.pid] = Math.max(0, (gu.meter[p.pid] || 0) - dt * 0.3); });
      const top = best ? gu.meter[best.pid] : 0;
      if (gu.st === 'sleep') { gu.spd = 0; if (best && top > 0.5) { gu.st = 'sus'; gu.t = 2; G.pop(gu.x, 2.8, gu.z, 'Huh?!'); } return; }
      if (best && top >= 1 && gu.st !== 'chase') { gu.st = 'chase'; gu.tgt = best.pid; gu.last = [best.x, best.z]; gu.lostT = 0; gu.rT = 0; AI.addHeat(16, best.x, best.z, 'seen'); G.fx('spotted', gu.x, gu.z); G.pop(gu.x, 2.9, gu.z, '!'); }
      else if (best && top >= 0.35 && (gu.st === 'patrol' || gu.st === 'return' || gu.st === 'investigate' || gu.st === 'search')) { if (gu.st !== 'sus') G.fx('sus'); gu.st = 'sus'; gu.t = 2.5; gu.last = [best.x, best.z]; }
      const spdMul = AI.alarmT > 0 ? 1.15 : 1;
      if (gu.st === 'chase') {
        const p = players.find((q) => q.pid === gu.tgt); const vis = p && canSee(gu.x, gu.z, gu.yaw, 1.2, rg + 2, p);
        if (vis) { gu.last = [p.x, p.z]; gu.lostT = 0; } else gu.lostT += dt;
        if (gu.lostT > 2.6 || !p) { gu.st = 'search'; gu.t = 4; goTo(gu, gu.last[0], gu.last[1]); gu.meter = {}; }
        else { gu.rT -= dt; if (gu.rT <= 0 || !gu.route) { gu.rT = 0.35; goTo(gu, gu.last[0], gu.last[1]); } follow(gu, 4.3 * spdMul, dt);
          if (p && Math.hypot(p.x - gu.x, p.z - gu.z) < 1.05) { gu.yaw = Math.atan2(p.x - gu.x, p.z - gu.z); G.catchPlayer(p.pid, gu); gu.st = 'grab'; gu.meter = {}; gu.t = G.GRAB_T; gu.spd = 0; gu.route = null; } }
      } else if (gu.st === 'sus') { gu.spd = 0; gu.t -= dt; if (gu.last) gu.yaw = U.lerpAng(gu.yaw, Math.atan2(gu.last[0] - gu.x, gu.last[1] - gu.z), Math.min(1, dt * 4)); if (gu.t <= 0 && top < 0.35) { investigate(gu, gu.last[0], gu.last[1], 3); } }
      else if (gu.st === 'investigate' || gu.st === 'search') { const decoy = gu.decoy && AI.gad.find((q) => q === gu.decoy && q.t > 0); if (decoy) { gu.inv = [decoy.x, decoy.z]; gu.rT -= dt; if (gu.rT <= 0) { gu.rT = 0.5; goTo(gu, decoy.x, decoy.z); } }
        const arrived = follow(gu, (gu.st === 'search' ? 3.2 : 2.9) * spdMul, dt); if (arrived || (gu.inv && Math.hypot(gu.inv[0] - gu.x, gu.inv[1] - gu.z) < 1.4)) { gu.spd = 0; gu.t -= dt; gu.yaw += Math.sin(gu.anim * 2) * dt * 1.6; if (gu.t <= 0) { gu.decoy = null; gu.st = 'return'; backToPatrol(gu); } } }
      else { // patrol / return
        if (gu.way.length === 1) { const [tx, tz] = [wx(gu.way[0][0]), wx(gu.way[0][1])]; if (Math.hypot(tx - gu.x, tz - gu.z) > 0.4) { if (!gu.route) goTo(gu, tx, tz); follow(gu, 2.2 * spdMul, dt); } else { gu.spd = 0; gu.st = gu.sleep ? 'sleep' : 'patrol'; gu.yaw += dt * 0.5; } return; }
        if (gu.look > 0) { gu.look -= dt; gu.spd = 0; gu.yaw += Math.sin(gu.anim * 1.5) * dt * 1.2; if (gu.look <= 0) { gu.wi = (gu.wi + 1) % gu.way.length; gu.route = null; } return; }
        if (!gu.route) goTo(gu, wx(gu.way[gu.wi][0]), wx(gu.way[gu.wi][1]));
        if (!gu.route) { gu.look = 1; return; }
        if (follow(gu, 2.2 * spdMul, dt)) { gu.st = 'patrol'; gu.look = 1.2; gu.route = null; }
      }
    });
    // cameras
    AI.cams.forEach((cm) => { if (G.P.state.cams[cm.id]) return; cm.yaw = cm.c.yaw + Math.sin(AI.blinkT * 0.55 + cm.id * 1.7) * 0.75; cm.cd = Math.max(0, cm.cd - dt);
      let seen = null; players.forEach((p) => { if (canSee(cm.X, cm.Z, cm.yaw, 0.42, 8.5, p)) seen = p; });
      if (seen) { cm.seen += dt; if (cm.seen > 0.7 && cm.cd <= 0) { cm.cd = 4; cm.seen = 0; AI.addHeat(22, seen.x, seen.z, 'camera'); AI.alertNear(seen.x, seen.z, 2); G.fx('camera', cm.X, cm.Z); G.say('📷 A camera saw you! Guards are coming!', true); } } else cm.seen = Math.max(0, cm.seen - dt); });
    // lasers
    G.P.lasers.forEach((gr) => { if (!AI.laserOn(gr.id)) return; AI.laserCd[gr.id] = Math.max(0, (AI.laserCd[gr.id] || 0) - dt);
      players.forEach((p) => { const cx = LG.cx(p.x), cz = LG.cx(p.z); if (G.P.laserAt[cx + ',' + cz] === gr.id && AI.laserCd[gr.id] <= 0) { AI.laserCd[gr.id] = 3; AI.addHeat(30, p.x, p.z, 'laser'); AI.alertNear(p.x, p.z, 3); G.fx('laser', p.x, p.z); G.say('⚡ You tripped a laser!', true); } }); });
    // gadgets
    AI.gad.forEach((q) => {
      q.t -= dt;
      if (q.k === 'decoy' && q.t > 0) { const nx = q.x + Math.sin(q.yaw) * 1.1 * dt, nz = q.z + Math.cos(q.yaw) * 1.1 * dt; if (!LG.solid(G.P, LG.cx(nx), LG.cx(nz))) { q.x = nx; q.z = nz; } else q.yaw += Math.PI * 0.6; q.honk = (q.honk || 0) - dt; if (q.honk <= 0) { q.honk = 1.1; G.fx('honk', q.x, q.z);
          AI.guards.forEach((gu) => { if ((gu.st === 'patrol' || gu.st === 'return' || gu.st === 'search' || gu.st === 'investigate') && !gu.decoy && Math.hypot(gu.x - q.x, gu.z - q.z) < 14 + (G.save.up.decoy || 0) * 2) { investigate(gu, q.x, q.z, 3 + (G.save.up.decoy || 0)); gu.decoy = q; } }); } }
      if (q.k === 'smoke') AI.guards.forEach((gu) => { if (gu.st === 'chase' && q.t > 0) { const p = players.find((pp) => pp.pid === gu.tgt); if (p && Math.hypot(p.x - q.x, p.z - q.z) < q.r) { gu.st = 'search'; gu.t = 3; gu.meter = {}; G.pop(gu.x, 2.7, gu.z, '*cough*'); } } });
    });
    AI.gad = AI.gad.filter((q) => { if (q.t > -0.5 || q.k === 'mirror') return true; if (q.m && q.m.parent) q.m.parent.remove(q.m); return false; });
  };
  function backToPatrol(gu) { gu.route = null; let bi = 0, bd = 1e9; gu.way.forEach((w, i) => { const d = Math.hypot(wx(w[0]) - gu.x, wx(w[1]) - gu.z); if (d < bd) { bd = d; bi = i; } }); gu.wi = bi; }
  AI.laserOn = function (id) { const P = G.P; if (P.state.lasers[id]) return false; const gr = P.lasers[id]; if (gr.blink) return (AI.blinkT % 4.2) < 2.6; return true; };

  /* ---------- visuals (host and guests) ---------- */
  const icons = {};
  AI.draw = function (dt) {
    const P = G.P, L = G.L, t = G.t;
    AI.guards.forEach((gu) => {
      const m = gu.m; const k = Math.min(1, dt * 12); if (G.isGuest()) { m.position.x = U.lerp(m.position.x, gu.x, k); m.position.z = U.lerp(m.position.z, gu.z, k); m.rotation.y = U.lerpAng(m.rotation.y, gu.yaw, k); } else { m.position.set(gu.x, 0, gu.z); m.rotation.y = gu.yaw; }
      M.animPerson(m, dt, gu.st === 'stun' || gu.st === 'sleep' ? 0 : gu.spd || 0, t);
      if (gu.st === 'grab') { const u = m.userData; u.arms[0].rotation.x = -2.95 + Math.sin(t * 16) * 0.12; u.arms[1].rotation.x = -2.95 - Math.sin(t * 16) * 0.12; u.arms[0].rotation.z = -0.3; u.arms[1].rotation.z = 0.3; u.body.position.y = Math.abs(Math.sin(t * 8)) * 0.08; } else if (m.userData.arms) { m.userData.arms[0].rotation.z = -0.12; m.userData.arms[1].rotation.z = 0.12; }
      if (gu.st === 'sleep') { m.userData.body.rotation.x = 0.25; } else m.userData.body.rotation.x = gu.st === 'stun' ? Math.sin(t * 10) * 0.3 : 0;
      const ic = gu.st === 'grab' ? '' : gu.st === 'chase' ? '!' : (gu.st === 'sus' || gu.st === 'investigate' || gu.st === 'search') ? '?' : (gu.st === 'sleep' || gu.st === 'stun') ? 'z' : '';
      if (ic !== gu.icon) { gu.icon = ic; const u = m.userData.icon; while (u.children.length) u.remove(u.children[0]); if (ic) u.add(M.icon(ic)); }
      if (ic) { m.userData.icon.position.y = 2.75 + Math.sin(t * 5) * 0.08; m.userData.icon.rotation.y = G.camYaw - m.rotation.y + Math.PI; }
      // cone
      const pos = m.position; const st = gu.st; gu.cone.material = st === 'chase' ? coneMats.alert : (st === 'sus' || st === 'search' || st === 'investigate') ? coneMats.sus : st === 'stun' ? coneMats.off : coneMats.patrol;
      gu.cone.visible = st !== 'stun' && G.gfxCones !== false;
      if (gu.cone.visible) updFan(gu.cone, P, pos.x, pos.z, m.rotation.y, half(gu) === Math.PI ? Math.PI : half(gu), st === 'sleep' ? 2.2 : range(gu), 0.07 + gu.id * 0.002);
    });
    AI.cams.forEach((cm) => { const dc = L.dyn.cams[cm.id]; const off = !!P.state.cams[cm.id]; dc.head.rotation.y = U.lerpAng(dc.head.rotation.y, off ? cm.c.yaw : cm.yaw, Math.min(1, dt * 8)); dc.head.rotation.x = off ? 0.7 : 0.45; dc.led.material.color.set(off ? '#334155' : (Math.sin(t * 6) > 0 ? '#ff3b3b' : '#7f1d1d'));
      cm.cone.visible = !off; if (!off) { cm.cone.material = cm.seen > 0.2 ? coneMats.alert : coneMats.sus; updFan(cm.cone, P, cm.X, cm.Z, dc.head.rotation.y, 0.42, 8.5, 0.09); } });
    P.lasers.forEach((gr) => { const d = L.dyn.lasers[gr.id]; d.g.visible = AI.laserOn(gr.id); });
    AI.gad.forEach((q) => { if (!q.m) { q.m = q.k === 'banana' ? M.banana() : q.k === 'decoy' ? M.decoy() : q.k === 'smoke' ? M.smoke() : M.mirror(); L.scene.add(q.m); if (q.k === 'mirror') { const beam = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 6, 6), M.MAT.laser); beam.position.set(0, 4, 0); beam.rotation.z = 0.5; q.m.add(beam); } }
      q.m.position.set(q.x, 0, q.z); if (q.k === 'decoy') { q.m.rotation.y = q.yaw; q.m.userData.key.rotation.z += dt * 8; q.m.position.y = Math.abs(Math.sin(t * 12)) * 0.08; }
      if (q.k === 'smoke') { const life = q.life || 6, a = q.t / life; const s = q.r / 3 * (a > 0.9 ? (1 - a) * 10 : 1); q.m.scale.setScalar(Math.max(0.05, s)); q.m.material.opacity = U.clamp(q.t, 0, 1) * 0.92; q.m.rotation.y += dt * 0.3; q.m.position.y = Math.sin(t * 1.3 + q.x) * 0.08; const br = 1 + Math.sin(t * 2.1 + q.z) * 0.04; q.m.scale.x *= br; q.m.scale.z *= 2 - br; }
      if (q.k === 'banana') q.m.visible = !q.used; });
  };

  /* ---------- net snapshot ---------- */
  AI.snap = function () { return { g: AI.guards.map((gu) => [+gu.x.toFixed(2), +gu.z.toFixed(2), +gu.yaw.toFixed(2), gu.st, +(gu.spd || 0).toFixed(1)]), c: AI.cams.map((c) => +c.yaw.toFixed(2)), h: Math.round(AI.heat), a: +AI.alarmT.toFixed(1), b: +AI.blinkT.toFixed(2), q: AI.gad.map((q) => [q.k, +q.x.toFixed(2), +q.z.toFixed(2), +q.t.toFixed(1), +(q.yaw || 0).toFixed(2), q.used ? 1 : 0, q.r || 0, q.uid]) }; };
  AI.applySnap = function (s) {
    if (!s || !AI.guards) return; s.g.forEach((a, i) => { const gu = AI.guards[i]; if (!gu) return; gu.x = a[0]; gu.z = a[1]; gu.yaw = a[2]; gu.st = a[3]; gu.spd = a[4]; });
    s.c.forEach((y, i) => { if (AI.cams[i]) AI.cams[i].yaw = y; }); if (s.h > AI.heat + 5) AI.flash = 1; AI.heat = s.h; if (s.a > 0 && AI.alarmT <= 0) G.fx('alarm'); AI.alarmT = s.a; AI.blinkT = s.b;
    const keep = {}; s.q.forEach((a) => { keep[a[7]] = 1; let q = AI.gad.find((g) => g.uid === a[7]); if (!q) { q = { k: a[0], uid: a[7] }; AI.gad.push(q); } q.x = a[1]; q.z = a[2]; q.t = a[3]; q.yaw = a[4]; q.used = !!a[5]; q.r = a[6]; q.life = q.life || q.t; });
    AI.gad = AI.gad.filter((q) => { if (keep[q.uid]) return true; if (q.m && q.m.parent) q.m.parent.remove(q.m); return false; });
  };
  AI.spawnGadget = function (k, x, z, yaw, uid) { const up = G.save.up; const q = { k, x, z, yaw: yaw || 0, uid: uid || U.uid() }; if (k === 'banana') q.t = 60; if (k === 'smoke') { q.t = q.life = 6 + (up.smoke || 0); q.r = 3 + (up.smoke || 0) * 0.5; } if (k === 'decoy') q.t = 7 + (up.decoy || 0) * 1.5; if (k === 'mirror') q.t = 9999; AI.gad.push(q); return q; };
})();
