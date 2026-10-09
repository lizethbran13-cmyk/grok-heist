/* Grok Heist Crew - online co-op (up to 3) over GrokNet. Host runs guards/cameras/heat; everyone sends their own hero. */
(function () {
  'use strict';
  const GH = window.GH, GN = window.GrokNet, U = GH.U, M = GH.M, D = GH.D;
  const $ = (id) => document.getElementById(id);
  const N = GH.Net = {};
  let pT = 0, wT = 0;
  const G = () => GH.G;
  function msg(t, ok) { const m = $('onlineMsg'); if (m) { m.textContent = t; m.className = 'msg' + (ok ? ' ok' : ''); } }
  function bind(room) {
    const g = G(); g.room = room; N.room = room;
    room.on('status', (t) => { if (!g.playing) msg(t, true); });
    room.on('open', () => {
      msg('Connected!', true); $('scrOnline').classList.add('hidden');
      N.badge = GN.ui.badge(room, { pos: 'bc', label: room.code }); if (N.badge && N.badge.el) N.badge.el.style.bottom = 'calc(4px + env(safe-area-inset-bottom))';
      if (room.isHost) { GH.UI.fade(() => g.loadLevel('hideout')); GH.UI.toast('Room ' + room.code + ' is open! Friends join with this code. 🤝'); room.setState({ role: g.save.role }); }
      else { GH.UI.toast('Joined room ' + room.code + '! 🤝'); N.waitSync = true; GH.UI.fade(() => { g.loadLevel('hideout'); N.fixRole(); }); }
      GH.Snd.fx('ping');
    });
    room.on('join', (p) => { if (p.pid === room.pid) return; GH.UI.toast('👋 ' + p.name + ' joined the crew!'); GH.Snd.fx('swap'); pT = 1; if (room.isHost) setTimeout(() => N.sync(p.pid), 400); });
    room.on('leave', (p) => { removeRemote(p.pid); GH.UI.toast(p.name + ' left the crew', true); });
    room.on('players', () => { pT = 1; });
    room.on('message', (d, from) => onMsg(d, from));
    room.on('reconnecting', () => GH.UI.toast('Lost the host - reconnecting…', true));
    room.on('error', (e) => { if (!g.playing) { msg(e.title + ': ' + e.message); g.room = null; N.room = null; return; } GH.UI.toast(e.title + ' - you can keep playing solo.', true); N.leave(); });
    room.start();
  }
  N.host = function () { const g = G(); msg('Opening a room…', true); bind(GN.createRoom({ role: 'host', name: g.myName(), color: GH.UI.color, max: 3 })); };
  N.join = function (code) { const g = G(); msg('Joining ' + code + '…', true); bind(GN.createRoom({ role: 'join', code, name: g.myName(), color: GH.UI.color })); };
  N.leave = function () {
    const g = G(); if (!g.room) return; try { g.room.leave(); } catch (e) {} g.room = null; N.room = null;
    if (N.badge) { try { N.badge.remove(); } catch (e) {} N.badge = null; }
    for (const k in g.remotes) removeRemote(k);
  };
  // guests pick a free role if theirs is taken
  N.fixRole = function () { const g = G(); const t = g.takenRoles(); if (t[g.hero.role]) { const free = D.ROLE_IDS.find((r) => !t[r]); if (free) { g.setRole(free, true); GH.UI.toast(D.ROLES[free].icon + ' That role was taken - you are the ' + D.ROLES[free].name + '!'); } } };
  function isHostPid(pid) { const r = N.room; if (!r) return false; const h = r.players().find((q) => q.host); return !!h && h.pid === pid; }
  function removeRemote(pid) { const g = G(), r = g.remotes[pid]; if (!r) return; if (r.model && r.model.parent) r.model.parent.remove(r.model); delete g.remotes[pid]; }

  /* host -> a guest: full level state so late joiners match */
  N.sync = function (pid) {
    const g = G(), room = g.room; if (!room || !room.isHost || !g.P) return; const P = g.P;
    const m = { t: 'sync', id: room.pid, lv: g.lvl, st: P.state, loot: P.loot.map((l) => [l.id, l.pos, l.carried || null]), ph: g.phase, tm: g.time, stats: g.stats, cr: g.carryRemote, hc: g.hero.carry ? [room.pid, g.hero.carry] : null };
    if (pid && room.sendTo) room.sendTo(pid, m); else room.broadcast(m);
  };
  function applySync(d) {
    const g = G(); const go = () => { const P = g.P, L = g.L, S = P.state, s = d.st || {};
      Object.assign(S.locks, s.locks || {}); Object.assign(S.lasers, s.lasers || {}); Object.assign(S.cams, s.cams || {}); S.secret = !!s.secret;
      for (const k in (s.crates || {})) { S.crates[k] = s.crates[k]; const dc = L.dyn.crates[k]; if (dc) dc.g.position.set(GH.LG.wx(s.crates[k][0]), 0, GH.LG.wx(s.crates[k][1])); }
      Object.assign(S.loot, s.loot || {}); (d.loot || []).forEach(([id, pos, car]) => { const l = P.loot.find((q) => q.id === id); if (!l) return; l.pos = pos; l.carried = car; const mm = L.lootM[id]; if (mm) { mm.visible = !S.loot[id] && !car; mm.position.x = pos[0]; mm.position.z = pos[1]; } });
      if (s.target && s.target !== 'home') { S.target = s.target; if (s.target.drop) { L.targetG.position.set(s.target.drop[0], 0, s.target.drop[1]); L.targetG.children[0].visible = false; } else { L.targetM.visible = false; L.halo.visible = false; } }
      if (d.ph && d.ph !== 'done') g.phase = d.ph; g.time = d.tm || 0; if (d.stats) Object.assign(g.stats, d.stats); g.carryRemote = Object.assign({}, d.cr || {}); if (d.hc) g.carryRemote[d.hc[0]] = d.hc[1];
      N.fixRole(); };
    if (g.lvl !== d.lv) GH.UI.fade(() => { g.loadLevel(d.lv); go(); if (!D.LEVELS[d.lv].hub) GH.UI.briefing(d.lv); }); else go();
    N.waitSync = false;
  }

  /* ---------- per-frame ---------- */
  N.tick = function (dt) {
    const g = G(), room = g.room; if (!room || !room.opened || !g.hero) return;
    pT += dt; const h = g.hero;
    if (pT >= 0.1) { pT = 0; room.broadcast({ t: 'p', id: room.pid, n: g.myName(), c: GH.UI.color, lv: g.lvl, x: +h.x.toFixed(2), y: +h.y.toFixed(2), z: +h.z.toFixed(2), yw: +h.yaw.toFixed(2), sp: +h.spd.toFixed(1), rf: h.roof ? 1 : 0, vt: h.vent ? 1 : 0, iv: +h.inv.toFixed(1), an: h.grab ? 2 : h.anim ? (h.anim.safe ? 2 : 1) : 0, ak: h.grab ? 'grab' : h.anim ? h.anim.kind : '', hk: h.hack ? 1 : 0, ca: h.carry || '', ro: h.role, o: g.save.outfit[h.role], ph: g.phase }); }
    if (room.isHost && !g.hub) { wT += dt; if (wT >= 0.1) { wT = 0; room.broadcast({ t: 'w', id: room.pid, lv: g.lvl, s: GH.AI.snap(), tm: +g.time.toFixed(1) }); } }
    // remote avatars
    for (const k in g.remotes) { const r = g.remotes[k]; const same = r.lvl === g.lvl;
      if (same && (!r.model || r.mRole !== r.role || r.mOut !== r.outfit)) { if (r.model && r.model.parent) r.model.parent.remove(r.model); r.model = M.crew(r.role || 'hacker', r.outfit || 'classic'); r.mRole = r.role; r.mOut = r.outfit; r.model.position.set(r.x, r.y, r.z); r.carryK = ''; }
      if (!r.model) continue; if (r.model.parent !== g.L.scene) g.L.scene.add(r.model);
      r.model.visible = same && !r.vent && g.phase !== 'done' && !g.escape; if (!same) continue;
      const k2 = Math.min(1, dt * 10), mp = r.model.position; mp.x = U.lerp(mp.x, r.x, k2); mp.y = U.lerp(mp.y, r.y, k2); mp.z = U.lerp(mp.z, r.z, k2); r.model.rotation.y = U.lerpAng(r.model.rotation.y, r.yw, k2);
      M.animPerson(r.model, dt, r.an ? 0 : r.sp, g.t); const u = r.model.userData; u.body.rotation.x = 0;
      u.body.rotation.z = 0; if (r.ak === 'flip' || r.ak === 'leap' || r.ak === 'vault') u.body.rotation.x = (g.t * 12) % (Math.PI * 2);
      if (r.ak === 'grab') { u.body.rotation.z = Math.PI / 2 * 0.92 + Math.sin(g.t * 11) * 0.08; u.legs[0].rotation.x = Math.sin(g.t * 26); u.legs[1].rotation.x = -Math.sin(g.t * 26); u.arms[0].rotation.x = -2.2 + Math.sin(g.t * 21) * 0.8; u.arms[1].rotation.x = -2.2 - Math.sin(g.t * 21) * 0.8; }
      if (r.hk) { u.arms[0].rotation.x = -1.2; u.arms[1].rotation.x = -1.2 + Math.sin(g.t * 20) * 0.15; }
      const want = r.carry === 'target' ? 't' : (r.carry || ''); if (want !== r.carryK) { r.carryK = want; while (u.carry.children.length) u.carry.remove(u.carry.children[0]); if (want) { const mm = want === 't' ? M.loot(D.LEVELS[g.lvl].target.model) : M.loot((g.P.loot.find((l) => 'big:' + l.id === want) || {}).model); mm.scale.setScalar(0.75); u.carry.add(mm); } }
      if (want) { u.arms[0].rotation.x = -2.9; u.arms[1].rotation.x = -2.9; u.carry.position.y = 2.1; }
      if (r.inv > 0) r.model.visible = r.model.visible && Math.floor(g.t * 10) % 2 === 0; }
  };

  function onMsg(d, from) {
    const g = G(); if (!d || !g.room) return; const room = g.room;
    if (d.id === room.pid) return;
    if (d.t === 'p') {
      let r = g.remotes[d.id]; if (!r) { r = g.remotes[d.id] = { pid: d.id }; }
      const role = D.ROLES[d.ro] ? d.ro : 'hacker', outfit = D.OUTFITS.some((o) => o.id === d.o) ? d.o : 'classic';
      Object.assign(r, { name: GN.cleanName(d.n), color: GN.cleanColor(d.c), lvl: d.lv, x: +d.x || 0, y: +d.y || 0, z: +d.z || 0, yw: +d.yw || 0, sp: +d.sp || 0, roof: !!d.rf, vent: !!d.vt, inv: +d.iv || 0, an: d.an, ak: String(d.ak || ''), hk: d.hk, carry: d.ca || null, role, outfit, seen: performance.now() });
      if (!room.isHost && role === g.hero.role && (isHostPid(d.id) || d.id < room.pid)) N.fixRole();
    } else if (d.t === 'w') { if (room.isHost || d.lv !== g.lvl) return; GH.AI.applySnap(d.s); if (Math.abs((d.tm || 0) - g.time) > 2 && g.phase !== 'done') g.time = d.tm; }
    else if (d.t === 'req') { if (!room.isHost || d.lv !== g.lvl) return; const dd = Object.assign({}, d.d || {}, { by: from || d.id }); if (d.e === 'finishReq') { g.finish(); return; } if (['lock', 'cam', 'laser', 'secret', 'crate', 'loot', 'carry', 'uncarry', 'deliver', 'target', 'tdrop', 'gadget', 'heat', 'ping'].indexOf(d.e) < 0) return; g.ev(d.e, dd); }
    else if (d.t === 'ev') { if (room.isHost) return; if (d.e !== 'lvl' && d.lv !== g.lvl) return; g.applyEv(d.e, d.d || {}); }
    else if (d.t === 'caught') { if (d.to && d.to !== room.pid) return; g.onCaught(d.g != null ? (d.g | 0) : -1); }
    else if (d.t === 'sync') { if (room.isHost) return; applySync(d); }
  }
})();
