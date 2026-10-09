/* Grok Heist Crew - particles, popups, x-ray ping markers, screen effects */
(function () {
  'use strict';
  const GH = window.GH, U = GH.U, M = GH.M, T = THREE;
  const FX = GH.FX = {}; let G = null; const parts = []; const geo = new T.SphereGeometry(1, 8, 6);
  FX.init = function (g) { G = g; FX.pops = document.getElementById('pops'); };
  FX.clear = function () { parts.length = 0; FX.xr = null; };
  FX.burst = function (x, y, z, col, n, sz) { const L = G.L; if (!L) return; for (let i = 0; i < (n || 10); i++) { const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: col, transparent: true })); const s = (sz || 0.18) * (0.6 + Math.random() * 0.8); m.scale.setScalar(s); m.position.set(x, y, z); L.scene.add(m); parts.push({ m, vx: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 4, vz: (Math.random() - 0.5) * 6, t: 0.7 + Math.random() * 0.4, life: 1.1, g: 9 }); } };
  FX.puff = function (x, y, z, col, n) { const L = G.L; for (let i = 0; i < (n || 8); i++) { const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: col || '#ffffff', transparent: true, opacity: 0.8 })); m.scale.setScalar(0.4 + Math.random() * 0.4); m.position.set(x + (Math.random() - 0.5), y, z + (Math.random() - 0.5)); L.scene.add(m); parts.push({ m, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random(), vz: (Math.random() - 0.5) * 2, t: 0.9, life: 0.9, g: -0.5, grow: 1.5 }); } };
  FX.step = function (dt) { for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t -= dt; p.vy -= p.g * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vx * 0 + p.vz * dt; if (p.grow) p.m.scale.multiplyScalar(1 + p.grow * dt); p.m.material.opacity = Math.max(0, p.t / p.life); if (p.t <= 0) { if (p.m.parent) p.m.parent.remove(p.m); p.m.material.dispose(); parts.splice(i, 1); } }
    // popups follow
    if (FX.pops) { const kids = FX.pops.children; for (let i = kids.length - 1; i >= 0; i--) { const el = kids[i]; el._t -= dt; const v = new T.Vector3(el._x, el._y + ((el._l || 1.4) - el._t) * 0.8, el._z).project(G.cam); if (v.z > 1 || el._t <= 0) { if (el._t <= 0) el.remove(); else el.style.display = 'none'; continue; } el.style.display = ''; el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * innerWidth) + 'px,' + ((-v.y * 0.5 + 0.5) * innerHeight) + 'px) translate(-50%,-50%)'; el.style.opacity = Math.min(1, el._t * 2); } } };
  FX.pop = function (x, y, z, txt, life) { if (!FX.pops) return; const el = document.createElement('div'); el.className = 'pop'; el.textContent = txt; el._x = x; el._y = y; el._z = z; el._t = el._l = life || 1.4; FX.pops.appendChild(el); };
  const COL = { coin: '#ffd23f', cash: '#4ade80', grab: '#ffd23f', door: '#22c55e', hackok: '#22d3ee', secret: '#a78bfa', slip: '#ffe14d', swap: '#ff4fd8', lift: '#ff8a1f', flex: '#ff8a1f', ping: '#22c55e', caught: '#ff3b3b', laser: '#ff3b3b', camera: '#ff3b3b', spotted: '#ff3b3b', thud: '#d9a066', vent: '#94a3b8', whoosh: '#ffffff', hook: '#ffd23f' };
  FX.event = function (k, x, z) {
    if (!G.L) return; const h = G.hero; if (x == null && h) { x = h.x; z = h.z; }
    if (k === 'smoke') { FX.puff(x, 1, z, '#ffc4ec', 14); return; }
    if (k === 'ping') { const ring = new T.Mesh(new T.RingGeometry(0.8, 1.1, 40), new T.MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.8, side: T.DoubleSide, depthTest: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.3, z); G.L.scene.add(ring); parts.push({ m: ring, vx: 0, vy: 0, vz: 0, t: 1.2, life: 1.2, g: 0, grow: 3.2 }); return; }
    if (k === 'alarm') { document.body.classList.add('alarm'); return; }
    if (k === 'thud' || k === 'vent') { FX.puff(x, 0.3, z, k === 'vent' ? '#cbd5e1' : '#e5d3b3', 8); return; }
    if (COL[k] && x != null) FX.burst(x, 1.4, z, COL[k], k === 'coin' ? 8 : 14);
  };
  // lookout ping: red outlines through walls over guards/cameras, gold over loot
  FX.xray = function (on) {
    const L = G.L; if (!L) return; const AI = GH.AI;
    if (!FX.xr || FX.xr.L !== L) { FX.xr = { L, g: [], c: [], l: [] }; }
    const xr = FX.xr; const need = on ? (AI.guards || []).length : 0;
    while (xr.g.length < need) { const b = new M.B(); b.cap(0.45, 1.0, '#ff3b6b', 0, 1.1, 0); b.sph(0.4, '#ff3b6b', 0, 2.0, 0); const m = new T.Mesh(b.geometry(), M.MAT.xray); m.renderOrder = 20; L.scene.add(m); xr.g.push(m); }
    xr.g.forEach((m, i) => { const gu = AI.guards[i]; m.visible = on && !!gu; if (gu) { m.position.set(gu.m.position.x, 0, gu.m.position.z); m.material.opacity = 0.45 + Math.sin(G.t * 8) * 0.15; } });
    if (on && !xr.l.length) { G.P.loot.forEach((l) => { const m = new T.Mesh(new T.OctahedronGeometry(0.35, 0), new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.8, depthTest: false })); m.renderOrder = 20; L.scene.add(m); m.userData.l = l; xr.l.push(m); }); }
    xr.l.forEach((m) => { const l = m.userData.l; m.visible = on && !G.P.state.loot[l.id] && !l.carried; m.position.set(l.pos ? l.pos[0] : 0, 2.2 + Math.sin(G.t * 4) * 0.15, l.pos ? l.pos[1] : 0); m.rotation.y += 0.05; });
  };
})();
