/* Grok Heist Crew - procedural rounded 3D models (vertex coloured, merged per part) */
(function () {
  'use strict';
  const GH = window.GH, U = GH.U, T = THREE;
  const M = GH.M = {};
  M.low = false;
  const seg = (n) => M.low ? Math.max(6, Math.round(n * 0.6)) : n;
  M.mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.02 });
  M.matGloss = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.05 });
  M.matGlow = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: '#ffffff', emissiveIntensity: 0.55 });
  M.winMat = new T.MeshStandardMaterial({ color: '#bfe6ff', roughness: 0.15, metalness: 0.1, emissive: '#ffcf6b', emissiveIntensity: 0.0 });
  M.lampMat = new T.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcf6b', emissiveIntensity: 0.2, roughness: 0.4 });
  M.glassMat = new T.MeshStandardMaterial({ color: '#d6f3ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45 });
  const solid = {};
  M.solid = function (c, o) { const k = c + JSON.stringify(o || {}); if (!solid[k]) solid[k] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55 }, o || {})); return solid[k]; };

  /* ---------- builder: collects painted geometry into buckets ---------- */
  function B() { this.parts = { main: [], gloss: [], glow: [] }; }
  B.prototype.add = function (g, col, b, x, y, z, rx, ry, rz, sx, sy, sz) { U.xf(g, x, y, z, rx, ry, rz, sx, sy, sz); (this.parts[b || 'main']).push(U.paint(g, col)); return this; };
  B.prototype.sph = function (r, col, x, y, z, sx, sy, sz, rx, ry, rz, b, s1, s2) { return this.add(new T.SphereGeometry(r, seg(s1 || 12), seg(s2 || 9)), col, b, x, y, z, rx, ry, rz, sx, sy, sz); };
  B.prototype.cyl = function (r1, r2, h, col, x, y, z, rx, ry, rz, b, n) { return this.add(new T.CylinderGeometry(r1, r2, h, seg(n || 14), 1), col, b, x, y, z, rx, ry, rz); };
  B.prototype.cone = function (r, h, col, x, y, z, rx, ry, rz, b, n) { return this.add(new T.ConeGeometry(r, h, seg(n || 14), 1), col, b, x, y, z, rx, ry, rz); };
  B.prototype.tor = function (r, t, col, x, y, z, rx, ry, rz, b, arc) { return this.add(new T.TorusGeometry(r, t, seg(8), seg(20), arc || Math.PI * 2), col, b, x, y, z, rx, ry, rz); };
  B.prototype.box = function (w, h, d, r, col, x, y, z, rx, ry, rz, b) { return this.add(U.rbox(w, h, d, r, M.low ? 1 : 2), col, b, x, y, z, rx, ry, rz); };
  B.prototype.cap = function (r, len, col, x, y, z, rx, ry, rz, b) { return this.add(capsule(r, len), col, b, x, y, z, rx, ry, rz); };
  B.prototype.geo = function (g, col, x, y, z, rx, ry, rz, sx, sy, sz, b) { return this.add(g, col, b, x, y, z, rx, ry, rz, sx, sy, sz); };
  B.prototype.meshes = function (castShadow) {
    const out = [];
    if (this.parts.main.length) out.push(new T.Mesh(U.merge(this.parts.main), M.mat));
    if (this.parts.gloss.length) out.push(new T.Mesh(U.merge(this.parts.gloss), M.matGloss));
    if (this.parts.glow.length) { const m = new T.Mesh(U.merge(this.parts.glow), M.matGlow); m.userData.glow = true; out.push(m); }
    out.forEach((m) => { m.castShadow = castShadow !== false; m.receiveShadow = false; });
    return out;
  };
  // x-ray cutaway: level geometry between the camera and the hero is cut away (dithered edge) so walls never hide you
  M.cutU = { uHero: { value: new T.Vector3() }, uCam: { value: new T.Vector3() }, uCut: { value: 0 } };
  const cutCache = new Map();
  M.cut = function (mat) {
    if (cutCache.has(mat)) return cutCache.get(mat); const m = mat.clone();
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, M.cutU);
      sh.vertexShader = 'varying vec3 vCutW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vCutW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vCutW;\nuniform vec3 uHero;\nuniform vec3 uCam;\nuniform float uCut;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  if (uCut > 0.5 && vCutW.y > 0.35) {
    vec3 ab = uHero - uCam; float t = dot(vCutW - uCam, ab) / max(dot(ab, ab), 0.001);
    if (t > 0.0 && t < 0.97) { float d = length(vCutW - (uCam + ab * t)); float r = 1.25 + 0.9 * t;
      if (d < r) discard;
      if (d < r + 0.45) { vec2 q = floor(gl_FragCoord.xy * 0.5); if (mod(q.x + q.y, 2.0) < 1.0) discard; } }
  }`); };
    m.customProgramCacheKey = () => 'cut' + mat.uuid; cutCache.set(mat, m); return m; };
  B.prototype.group = function (castShadow) { const g = new T.Group(); this.meshes(castShadow).forEach((m) => g.add(m)); return g; };
  B.prototype.geometry = function () { return U.merge(this.parts.main.concat(this.parts.gloss)); };
  M.B = B;
  const capCache = {};
  function capsule(r, len) {
    const k = r.toFixed(3) + ',' + len.toFixed(3) + (M.low ? 'l' : '');
    if (!capCache[k]) { const pts = [], n = seg(5); for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI / 2; pts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r - len / 2)); } for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push(new T.Vector2(Math.cos(a) * r, Math.sin(a) * r + len / 2)); } capCache[k] = new T.LatheGeometry(pts, seg(14)); }
    return capCache[k].clone();
  }
  M.capsule = capsule;
  function pivot(parent, x, y, z) { const p = new T.Group(); p.position.set(x, y, z); parent.add(p); return p; }
  function attach(p, b, shadow) { b.meshes(shadow).forEach((m) => p.add(m)); return p; }

  /* ---------- colours ---------- */
  const _h = { h: 0, s: 0, l: 0 };
  M.shift = function (hex, dh, ds, dl) { const c = new T.Color(hex); c.getHSL(_h); c.setHSL((_h.h + (dh || 0) + 1) % 1, U.clamp(_h.s + (ds || 0), 0, 1), U.clamp(_h.l + (dl || 0), 0, 1)); return '#' + c.getHexString(); };
  M.darker = (hex, k) => M.shift(hex, 0, 0, -(k || 0.15));

  /* ---------- people ---------- */
  const SKINS = ['#ffd7b5', '#f1c095', '#d9a066', '#a8704a', '#7a4b2e'];
  M.SKINS = SKINS;
  M.person = function (o) {
    o = o || {};
    const skin = o.skin || SKINS[0], shirt = o.shirt || '#4ade80', pants = o.pants || '#6b4b2a', hair = o.hair || '#6b3e1f', sc = o.scale || 1;
    const root = new T.Group(), body = pivot(root, 0, 0, 0);
    const b = new B();
    // torso: rounded tunic
    const tun = new T.LatheGeometry([[0, 0.62], [0.26, 0.64], [0.33, 0.78], [0.3, 1.0], [0.27, 1.12], [0.22, 1.2], [0, 1.22]].map((p) => new T.Vector2(p[0], p[1])), seg(18));
    b.geo(tun, shirt);
    if (o.dress) b.geo(new T.LatheGeometry([[0, 0.42], [0.42, 0.42], [0.34, 0.7], [0, 0.72]].map((p) => new T.Vector2(p[0], p[1])), seg(18)), shirt);
    b.tor(0.29, 0.045, o.belt || '#5b3a1e', 0, 0.8, 0, Math.PI / 2, 0, 0);
    b.box(0.12, 0.1, 0.05, 0.02, '#ffd23f', 0, 0.8, 0.3, 0, 0, 0, 'gloss');
    // head
    const hy = 1.5;
    b.sph(0.3, skin, 0, hy, 0, 1, 0.97, 1, 0, 0, 0, null, 20, 14);
    b.sph(0.07, skin, -0.29, hy, 0.01); b.sph(0.07, skin, 0.29, hy, 0.01);
    b.sph(0.045, M.darker(skin, 0.06), 0, hy - 0.04, 0.29);
    // eyes (glossy, with highlight)
    [-1, 1].forEach((s) => { b.sph(0.055, '#1b1530', s * 0.11, hy + 0.03, 0.255, 0.85, 1.15, 0.6, 0, 0, 0, 'gloss'); b.sph(0.018, '#ffffff', s * 0.11 + 0.018, hy + 0.06, 0.29, 1, 1, 1, 0, 0, 0, 'gloss'); });
    b.sph(0.05, '#ff9fb3', -0.18, hy - 0.07, 0.23, 1, 0.6, 0.4); b.sph(0.05, '#ff9fb3', 0.18, hy - 0.07, 0.23, 1, 0.6, 0.4);
    b.tor(0.05, 0.012, '#8a3a3a', 0, hy - 0.1, 0.27, 0, 0, Math.PI, null, Math.PI);
    // hair
    if (o.bald) b.sph(0.305, skin, 0, hy + 0.02, -0.02, 1, 0.9, 1);
    else { b.sph(0.315, hair, 0, hy + 0.06, -0.04, 1.02, 0.92, 1.0, -0.3, 0, 0, null, 20, 14); if (o.long) b.cap(0.2, 0.35, hair, 0, hy - 0.2, -0.18, 0.2, 0, 0); if (o.bun) b.sph(0.13, hair, 0, hy + 0.3, -0.18); if (o.pig) { b.sph(0.11, hair, -0.3, hy - 0.05, -0.1); b.sph(0.11, hair, 0.3, hy - 0.05, -0.1); } }
    if (o.beard) b.sph(0.22, o.beard, 0, hy - 0.2, 0.15, 1, 1.1, 0.6);
    // hats
    if (o.hat === 'cap') { b.cone(0.3, 0.62, o.hatCol || shirt, 0, hy + 0.36, -0.12, -0.55, 0, 0); b.tor(0.29, 0.05, M.darker(o.hatCol || shirt, 0.1), 0, hy + 0.17, -0.02, Math.PI / 2 - 0.2, 0, 0); b.sph(0.06, '#ffffff', 0.05, hy + 0.5, -0.5, 1.4, 0.4, 2.2, 0.4, 0.6, 0); }
    else if (o.hat === 'wizard') b.cone(0.33, 0.7, o.hatCol || '#7c3aed', 0, hy + 0.5, 0, -0.15, 0, 0);
    else if (o.hat === 'straw') { b.cyl(0.5, 0.5, 0.04, '#f2d27a', 0, hy + 0.22, 0); b.sph(0.26, '#f2d27a', 0, hy + 0.26, 0, 1, 0.55, 1); b.tor(0.26, 0.03, '#e8453c', 0, hy + 0.27, 0, Math.PI / 2, 0, 0); }
    else if (o.hat === 'beanie') { b.sph(0.32, o.hatCol || '#e8453c', 0, hy + 0.1, -0.02, 1, 0.85, 1); b.sph(0.08, '#ffffff', 0, hy + 0.4, -0.04); }
    else if (o.hat === 'bandana') b.sph(0.318, o.hatCol || '#e8453c', 0, hy + 0.08, -0.03, 1, 0.8, 1);
    else if (o.hat === 'chef') { b.cyl(0.24, 0.22, 0.25, '#ffffff', 0, hy + 0.35, 0); b.sph(0.27, '#ffffff', 0, hy + 0.5, 0, 1, 0.7, 1); }
    else if (o.hat === 'crown') { b.cyl(0.22, 0.2, 0.14, '#ffd23f', 0, hy + 0.32, 0, 0, 0, 0, 'gloss'); }
    if (o.glasses) { b.tor(0.07, 0.012, '#333', -0.11, hy + 0.03, 0.27); b.tor(0.07, 0.012, '#333', 0.11, hy + 0.03, 0.27); }
    if (o.coat) b.geo(new T.LatheGeometry([[0, 0.5], [0.36, 0.5], [0.36, 0.9], [0.32, 1.15], [0, 1.2]].map((p) => new T.Vector2(p[0], p[1])), seg(18), Math.PI * 0.15, Math.PI * 1.7), o.coat, 0, 0, 0, 0, Math.PI, 0);
    if (o.extra) o.extra(b, hy);
    attach(body, b);
    // limbs on pivots
    const legs = [], arms = [];
    [-1, 1].forEach((s) => {
      const lp = pivot(body, s * 0.13, 0.66, 0); const lb = new B(); lb.cap(0.1, 0.36, pants, 0, -0.3, 0); lb.sph(0.13, o.boots || '#5b3a1e', 0, -0.58, 0.05, 1, 0.75, 1.35); attach(lp, lb); legs.push(lp);
      const ap = pivot(body, s * 0.34, 1.12, 0); const ab = new B(); ab.cap(0.085, 0.3, o.sleeve || shirt, 0, -0.2, 0); ab.sph(0.095, skin, 0, -0.43, 0); attach(ap, ab); arms.push(ap); ap.rotation.z = s * 0.12;
    });
    root.userData = { body, legs, arms, head: null, kind: 'person', walk: 0 };
    root.scale.setScalar(sc);
    return root;
  };
  M.animPerson = function (m, dt, spd, t) {
    const u = m.userData; if (!u.legs) return;
    u.walk += dt * (2 + spd * 2.2);
    const sw = Math.min(1, spd / 4) * 0.75, s = Math.sin(u.walk * 1.6);
    u.legs[0].rotation.x = s * sw; u.legs[1].rotation.x = -s * sw;
    if (!u.armBusy) { u.arms[0].rotation.x = -s * sw * 0.8; u.arms[1].rotation.x = s * sw * 0.8; }
    u.body.position.y = Math.abs(Math.cos(u.walk * 1.6)) * 0.06 * Math.min(1, spd / 3) + (spd < 0.1 ? Math.sin(t * 2) * 0.012 : 0);
  };


  M.pivot = pivot; M.attach = attach;
  const V2 = (a) => a.map((p) => new T.Vector2(p[0], p[1]));
  M.lathe = (p, n, a0, a1) => new T.LatheGeometry(V2(p), seg(n || 18), a0, a1);

  /* ---------- crew ---------- */
  const TINTS = {
    hacker: { classic: ['#8b5cf6', '#2d2a4a'], midnight: ['#1e1b4b', '#0f0d24'], gold: ['#f5b400', '#5b3a00'], party: ['#22d3ee', '#ff4fd8'], royal: ['#7c3aed', '#ffd23f'], cowboy: ['#b45309', '#3b82f6'] },
    lookout: { classic: ['#22c55e', '#3b4a2a'], midnight: ['#14532d', '#0f1f14'], gold: ['#f5b400', '#5b3a00'], party: ['#a3e635', '#f97316'], royal: ['#059669', '#ffd23f'], cowboy: ['#a16207', '#2563eb'] },
    acrobat: { classic: ['#ff4fd8', '#5b1650'], midnight: ['#4c1d95', '#1a0b2e'], gold: ['#f5b400', '#5b3a00'], party: ['#fb7185', '#22d3ee'], royal: ['#db2777', '#ffd23f'], cowboy: ['#c2410c', '#1d4ed8'] },
    muscle: { classic: ['#ff8a1f', '#3a3f58'], midnight: ['#1f2937', '#0b0f19'], gold: ['#f5b400', '#5b3a00'], party: ['#facc15', '#8b5cf6'], royal: ['#dc2626', '#ffd23f'], cowboy: ['#92400e', '#1e40af'] }
  };
  M.TINTS = TINTS;
  function hatParts(b, hy, hat, col) {
    if (hat === 'beanie') { b.sph(0.33, col, 0, hy + 0.1, -0.02, 1, 0.82, 1); b.tor(0.3, 0.06, M.darker(col, 0.1), 0, hy + 0.02, 0, Math.PI / 2, 0, 0); b.sph(0.09, '#ffffff', 0, hy + 0.4, -0.04); }
    else if (hat === 'tophat') { b.cyl(0.42, 0.42, 0.04, '#1f1a2e', 0, hy + 0.24, 0); b.cyl(0.24, 0.26, 0.42, '#1f1a2e', 0, hy + 0.46, 0); b.cyl(0.265, 0.265, 0.08, '#ffd23f', 0, hy + 0.3, 0, 0, 0, 0, 'gloss'); }
    else if (hat === 'party') { b.cone(0.2, 0.5, '#ff4fd8', 0, hy + 0.5, 0, -0.1, 0, 0); b.sph(0.07, '#ffd23f', 0, hy + 0.76, -0.03); b.tor(0.15, 0.03, '#22d3ee', 0, hy + 0.4, 0, Math.PI / 2 - 0.1, 0, 0); }
    else if (hat === 'crown') { b.cyl(0.22, 0.2, 0.16, '#ffd23f', 0, hy + 0.33, 0, 0, 0, 0, 'gloss'); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; b.cone(0.05, 0.14, '#ffd23f', Math.sin(a) * 0.19, hy + 0.47, Math.cos(a) * 0.19, 0, 0, 0, 'gloss', 6); b.sph(0.035, '#ff3b6b', Math.sin(a) * 0.21, hy + 0.34, Math.cos(a) * 0.21, 1, 1, 1, 0, 0, 0, 'gloss'); } }
    else if (hat === 'cowboy') { b.sph(0.5, '#a0662b', 0, hy + 0.24, 0, 1, 0.1, 1); b.sph(0.25, '#a0662b', 0, hy + 0.36, 0, 1, 0.8, 1.1); b.tor(0.25, 0.035, '#5b3a1e', 0, hy + 0.3, 0, Math.PI / 2, 0, 0); }
  }
  // heist eye-mask (raccoon style)
  function mask(b, hy, col) { b.tor(0.29, 0.06, col || '#1f1a2e', 0, hy + 0.03, 0, Math.PI / 2, 0, 0, 'gloss'); b.sph(0.1, col || '#1f1a2e', -0.11, hy + 0.03, 0.24, 1.25, 0.8, 0.5); b.sph(0.1, col || '#1f1a2e', 0.11, hy + 0.03, 0.24, 1.25, 0.8, 0.5); }
  M.crew = function (role, outfit) {
    outfit = outfit || 'classic'; const od = (GH.D.OUTFITS.find((o) => o.id === outfit) || GH.D.OUTFITS[0]); const tc = (TINTS[role] || TINTS.hacker)[outfit] || TINTS[role].classic;
    const main = tc[0], acc = tc[1];
    let o = {};
    if (role === 'hacker') o = { skin: '#f1c095', shirt: main, pants: '#2d2a4a', hair: '#3b2412', boots: '#22223a', belt: acc, extra: (b, hy) => {
      b.tor(0.33, 0.04, '#2b2b3a', 0, hy + 0.08, 0, 0, 0, 0); [-1, 1].forEach((s) => { b.cyl(0.11, 0.11, 0.1, '#2b2b3a', s * 0.33, hy, 0, 0, 0, Math.PI / 2); b.cyl(0.08, 0.08, 0.11, '#22d3ee', s * 0.33, hy, 0, 0, 0, Math.PI / 2, 'glow'); });
      b.tor(0.075, 0.016, '#111827', -0.11, hy + 0.03, 0.275); b.tor(0.075, 0.016, '#111827', 0.11, hy + 0.03, 0.275); b.box(0.08, 0.02, 0.02, 0.008, '#111827', 0, hy + 0.04, 0.29);
      b.geo(M.lathe([[0, 0.98], [0.3, 1.0], [0.36, 1.16], [0.28, 1.28], [0, 1.3]], 16), M.darker(main, 0.08), 0, 0, -0.06, 0.2, 0, 0, 1, 1, 0.9);
      if (!od.hat) b.sph(0.33, main, 0, hy + 0.06, -0.1, 1.04, 1.0, 1.05, -0.2, 0, 0); // hood
      b.box(0.36, 0.26, 0.04, 0.03, '#334155', 0.0, 0.92, 0.36, -0.3, 0, 0, 'gloss'); b.box(0.3, 0.18, 0.02, 0.02, '#22d3ee', 0, 0.93, 0.38, -0.3, 0, 0, 'glow'); } };
    else if (role === 'lookout') o = { skin: '#d9a066', shirt: main, pants: '#6b5a3a', hair: '#1f140c', boots: '#3b2a1a', hat: od.hat ? null : 'cap', hatCol: main, belt: acc, extra: (b, hy) => {
      mask(b, hy, '#1f2a1a'); [-1, 1].forEach((s) => { b.cyl(0.07, 0.07, 0.22, '#1f2937', s * 0.09, 1.0, 0.33, Math.PI / 2, 0, 0); b.cyl(0.055, 0.055, 0.02, '#7dd3fc', s * 0.09, 1.0, 0.45, Math.PI / 2, 0, 0, 'glow'); });
      b.tor(0.2, 0.02, '#1f2937', 0, 1.18, 0.12, 1.2, 0, 0); b.cyl(0.015, 0.015, 0.4, '#9ca3af', 0.2, hy + 0.4, -0.1, 0, 0, 0.2); b.sph(0.04, '#ef4444', 0.24, hy + 0.6, -0.1, 1, 1, 1, 0, 0, 0, 'glow'); } };
    else if (role === 'acrobat') o = { skin: '#ffd7b5', shirt: main, pants: main, hair: '#ffcf3f', boots: '#ffffff', long: true, belt: '#ffffff', extra: (b, hy) => {
      mask(b, hy, acc); b.tor(0.31, 0.05, '#ffffff', 0, hy + 0.17, -0.02, Math.PI / 2 + 0.25, 0, 0); b.sph(0.09, '#ffffff', 0, hy + 0.16, -0.34, 1.4, 0.6, 0.6);
      b.geo(M.lathe([[0, 0.6], [0.24, 0.62], [0.3, 0.8], [0.28, 1.0], [0, 1.02]], 16), M.shift(main, 0, 0, 0.12), 0, 0.02, 0.012, 0, 0, 0, 1.02, 1, 1.02);
      for (let i = 0; i < 3; i++) b.sph(0.045, '#ffffff', 0, 0.75 + i * 0.12, 0.29, 1, 1, 0.5, 0, 0, 0, 'gloss'); } };
    else o = { skin: '#a8704a', shirt: main, pants: acc, hair: '#2a1a0e', boots: '#1f2937', bald: true, beard: '#2a1a0e', belt: '#1f2937', extra: (b, hy) => {
      b.tor(0.3, 0.06, '#ffffff', 0, hy + 0.12, 0, Math.PI / 2 + 0.2, 0, 0); b.sph(0.08, '#ffffff', 0, hy + 0.1, -0.33, 1.3, 0.7, 0.7);
      b.sph(0.36, main, 0, 1.08, 0, 1.25, 0.8, 1.05); [-1, 1].forEach((s) => b.sph(0.2, main, s * 0.38, 1.12, 0, 1, 0.85, 1)); } };
    o.extra2 = o.extra; o.extra = (b, hy) => { o.extra2(b, hy); if (od.hat) hatParts(b, hy, od.hat, acc); };
    const m = M.person(o);
    const u = m.userData; u.role = role; u.main = main;
    if (role === 'muscle') { m.scale.set(1.18, 1.08, 1.15); u.arms.forEach((a) => { a.scale.set(1.5, 1.05, 1.5); }); }
    if (role === 'acrobat') m.scale.set(0.95, 1.0, 0.95);
    // carried items anchor (above head / in hands)
    u.carry = pivot(m, 0, 2.15, 0.15);
    // shadow blob
    const sh = new T.Mesh(new T.CircleGeometry(0.55, 20), new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; m.add(sh); u.blob = sh;
    return m;
  };

  /* ---------- guards / bots ---------- */
  M.guard = function (kind) {
    let m;
    if (kind === 'robot' || kind === 'toybot') {
      m = new T.Group(); const body = pivot(m, 0, 0, 0); const b = new B();
      const c1 = kind === 'robot' ? '#dfe6f5' : '#ffd23f', c2 = kind === 'robot' ? '#7c5cff' : '#ef4444', c3 = kind === 'robot' ? '#9aa6c8' : '#3b82f6';
      b.geo(M.lathe([[0, 0.3], [0.42, 0.34], [0.55, 0.7], [0.5, 1.15], [0.3, 1.3], [0, 1.32]], 22), c1);
      b.tor(0.5, 0.05, c2, 0, 0.72, 0, Math.PI / 2, 0, 0, 'gloss'); b.sph(0.42, c1, 0, 1.62, 0, 1, 0.9, 1, 0, 0, 0, 'gloss', 22, 16);
      b.box(0.56, 0.24, 0.1, 0.1, '#1f1a2e', 0, 1.66, 0.36, 0, 0, 0, 'gloss'); b.sph(0.085, '#ff3b6b', -0.12, 1.66, 0.42, 1, 1, 0.5, 0, 0, 0, 'glow'); b.sph(0.085, '#ff3b6b', 0.12, 1.66, 0.42, 1, 1, 0.5, 0, 0, 0, 'glow');
      b.cyl(0.03, 0.03, 0.35, c3, 0, 2.15, 0); b.sph(0.08, c2, 0, 2.35, 0, 1, 1, 1, 0, 0, 0, 'glow');
      if (kind === 'robot') { b.cone(0.45, 0.35, c2, 0, 2.0, 0, 0, 0, 0, 'gloss'); b.sph(0.14, '#ffd23f', 0, 1.05, 0.48, 1, 1, 0.4, 0, 0, 0, 'glow'); }
      else { b.cyl(0.18, 0.18, 0.1, '#3b82f6', -0.5, 1.6, 0, 0, 0, Math.PI / 2); b.cyl(0.18, 0.18, 0.1, '#3b82f6', 0.5, 1.6, 0, 0, 0, Math.PI / 2); b.box(0.3, 0.3, 0.05, 0.05, '#4ade80', 0, 1.0, 0.5, 0, 0, 0, 'glow'); }
      attach(body, b);
      const legs = [], arms = [];
      [-1, 1].forEach((s) => { const lp = pivot(body, s * 0.22, 0.4, 0); const lb = new B(); lb.cyl(0.09, 0.09, 0.3, c3, 0, -0.15, 0); lb.sph(0.17, c2, 0, -0.32, 0.05, 1, 0.6, 1.3, 0, 0, 0, 'gloss'); attach(lp, lb); legs.push(lp);
        const ap = pivot(body, s * 0.58, 1.05, 0); const ab = new B(); ab.cyl(0.07, 0.07, 0.4, c3, 0, -0.2, 0); ab.sph(0.13, c2, 0, -0.45, 0, 1, 1, 1, 0, 0, 0, 'gloss'); attach(ap, ab); arms.push(ap); });
      m.userData = { body, legs, arms, kind: 'person', walk: 0 };
    } else if (kind === 'sailor') {
      m = M.person({ skin: '#f1c095', shirt: '#ffffff', pants: '#1e3a8a', hair: '#5b3a1e', boots: '#1f2937', belt: '#1e3a8a', extra: (b, hy) => {
        b.cyl(0.3, 0.32, 0.14, '#ffffff', 0, hy + 0.26, 0); b.cyl(0.33, 0.33, 0.04, '#1e3a8a', 0, hy + 0.2, 0); b.geo(M.lathe([[0, 1.0], [0.34, 1.02], [0.38, 1.12], [0, 1.14]], 16), '#1e3a8a', 0, 0, -0.02); b.box(0.16, 0.12, 0.04, 0.03, '#ef4444', 0, 1.0, 0.31, 0, 0, 0, 'gloss');
        b.sph(0.36, '#ffffff', 0, 0.98, 0, 1.0, 0.85, 1.0); b.sph(0.12, '#6b3e1f', 0, hy - 0.12, 0.22, 1.6, 0.4, 0.6); } });
    } else {
      m = M.person({ skin: '#f1c095', shirt: '#2563eb', pants: '#1e293b', hair: '#3b2412', boots: '#111827', belt: '#111827', extra: (b, hy) => {
        b.cyl(0.33, 0.3, 0.12, '#1e3a8a', 0, hy + 0.24, -0.02); b.sph(0.31, '#1e3a8a', 0, hy + 0.27, -0.02, 1, 0.45, 1); b.sph(0.22, '#111827', 0, hy + 0.2, 0.22, 1, 0.15, 0.8); b.sph(0.06, '#ffd23f', 0, hy + 0.32, 0.29, 1, 1, 0.4, 0, 0, 0, 'gloss');
        b.sph(0.4, '#2563eb', 0, 0.92, 0.04, 1.0, 0.9, 1.05); b.box(0.12, 0.14, 0.04, 0.03, '#ffd23f', -0.15, 1.08, 0.33, 0, 0, 0, 'gloss'); b.sph(0.13, '#5b3a1e', 0, hy - 0.13, 0.22, 1.7, 0.45, 0.7); } });
      m.scale.setScalar(1.08);
    }
    const u = m.userData;
    // flashlight in right hand
    const fl = new B(); fl.cyl(0.06, 0.08, 0.32, '#374151', 0, -0.48, 0.1, Math.PI / 2, 0, 0); fl.cyl(0.075, 0.075, 0.02, '#fff7c2', 0, -0.48, 0.27, Math.PI / 2, 0, 0, 'glow'); attach(u.arms[1], fl);
    // status icon (?, !)
    const ic = new T.Group(); ic.position.y = 2.75; m.add(ic); u.icon = ic;
    const sh = new T.Mesh(new T.CircleGeometry(0.6, 20), new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; m.add(sh);
    return m;
  };
  M.icon = function (ch) { const b = new B(); const col = ch === '!' ? '#ff3b3b' : ch === 'z' ? '#7dd3fc' : '#ffd23f';
    if (ch === '!') { b.cap(0.11, 0.42, col, 0, 0.3, 0, 0, 0, 0, 'glow'); b.sph(0.12, col, 0, -0.18, 0, 1, 1, 1, 0, 0, 0, 'glow'); }
    else if (ch === '?') { b.tor(0.18, 0.07, col, 0, 0.32, 0, 0, 0, -0.6, 'glow', Math.PI * 1.4); b.cap(0.07, 0.08, col, 0.02, 0.06, 0, 0, 0, 0, 'glow'); b.sph(0.09, col, 0, -0.2, 0, 1, 1, 1, 0, 0, 0, 'glow'); }
    else { for (let i = 0; i < 3; i++) b.box(0.2 - i * 0.04, 0.05, 0.05, 0.02, col, i * 0.2, i * 0.25, 0, 0, 0, 0, 'glow'); }
    return b.group(false); };

  /* ---------- loot ---------- */
  M.loot = function (kind) {
    const b = new B();
    switch (kind) {
      case 'gumball': b.cyl(0.28, 0.34, 0.25, '#ef4444', 0, 0.12, 0, 0, 0, 0, 'gloss'); b.sph(0.42, '#ffd23f', 0, 0.62, 0, 1, 1, 1, 0, 0, 0, 'glow', 24, 16); b.sph(0.1, '#fff7c2', 0.15, 0.8, 0.28, 1, 1, 1, 0, 0, 0, 'glow'); break;
      case 'diamond': b.add(new T.OctahedronGeometry(0.42, 0), '#9be7ff', 'glow', 0, 0.62, 0, 0, 0.4, 0, 1, 1.25, 1); b.cyl(0.3, 0.4, 0.18, '#ffd23f', 0, 0.09, 0, 0, 0, 0, 'gloss'); break;
      case 'duck': b.sph(0.38, '#ffd23f', 0, 0.42, 0, 1.2, 0.9, 1, 0, 0, 0, 'glow'); b.sph(0.26, '#ffd23f', 0, 0.85, 0.2, 1, 1, 1, 0, 0, 0, 'glow'); b.sph(0.12, '#ff8a1f', 0, 0.82, 0.45, 1.3, 0.5, 1, 0, 0, 0, 'gloss'); b.sph(0.05, '#111', -0.1, 0.92, 0.4); b.sph(0.05, '#111', 0.1, 0.92, 0.4); b.sph(0.14, '#f5b400', 0, 0.5, -0.38, 1, 1.4, 0.6, 0.6, 0, 0, 'glow'); break;
      case 'crown': b.cyl(0.36, 0.32, 0.3, '#ffd23f', 0, 0.3, 0, 0, 0, 0, 'glow'); ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'].forEach((c, i) => { const a = i / 6 * Math.PI * 2; b.cone(0.08, 0.3, '#ffd23f', Math.sin(a) * 0.32, 0.58, Math.cos(a) * 0.32, 0, 0, 0, 'glow', 6); b.sph(0.08, c, Math.sin(a) * 0.36, 0.3, Math.cos(a) * 0.36, 1, 1, 1, 0, 0, 0, 'glow'); }); break;
      case 'robo': b.box(0.9, 1.0, 0.7, 0.25, '#e5e7eb', 0, 1.0, 0, 0, 0, 0, 'gloss'); b.sph(0.4, '#e5e7eb', 0, 1.8, 0, 1.1, 0.9, 1, 0, 0, 0, 'gloss'); b.box(0.5, 0.18, 0.05, 0.08, '#22d3ee', 0, 1.82, 0.36, 0, 0, 0, 'glow'); b.box(0.4, 0.3, 0.05, 0.08, '#ff4fd8', 0, 1.1, 0.36, 0, 0, 0, 'glow');
        [-1, 1].forEach((s) => { b.cap(0.13, 0.5, '#3b82f6', s * 0.6, 1.05, 0, 0, 0, s * 0.2); b.cap(0.15, 0.35, '#3b82f6', s * 0.25, 0.3, 0); b.sph(0.1, '#ffd23f', s * 0.3, 2.3, 0, 1, 1, 1, 0, 0, 0, 'glow'); b.cyl(0.02, 0.02, 0.3, '#9ca3af', s * 0.3, 2.12, 0); }); break;
      case 'jawbreaker': b.sph(0.6, '#ff4fd8', 0, 0.62, 0, 1, 1, 1, 0, 0, 0, 'gloss', 24, 16); b.tor(0.6, 0.06, '#22d3ee', 0, 0.62, 0, Math.PI / 2, 0, 0); b.tor(0.6, 0.06, '#ffd23f', 0, 0.62, 0, 0, 0, 0); break;
      case 'chococrate': b.box(1.0, 0.7, 0.8, 0.12, '#7b3f1d', 0, 0.36, 0); for (let i = 0; i < 3; i++) b.box(0.28, 0.12, 0.7, 0.05, '#5a2b12', -0.32 + i * 0.32, 0.76, 0); b.box(1.02, 0.18, 0.82, 0.05, '#ef4444', 0, 0.36, 0); break;
      case 'dinoegg': b.sph(0.5, '#a3e635', 0, 0.62, 0, 1, 1.3, 1, 0, 0, 0, 'gloss'); for (let i = 0; i < 6; i++) b.sph(0.1, '#4d7c0f', Math.sin(i * 2.3) * 0.45, 0.5 + (i % 3) * 0.25, Math.cos(i * 2.3) * 0.45, 1, 1, 0.4); break;
      case 'mask': b.sph(0.5, '#ffd23f', 0, 0.72, 0, 0.9, 1.2, 0.5, 0, 0, 0, 'glow'); b.box(0.9, 0.12, 0.4, 0.05, '#2563eb', 0, 0.9, -0.05); b.sph(0.08, '#1e3a8a', -0.18, 0.82, 0.24); b.sph(0.08, '#1e3a8a', 0.18, 0.82, 0.24); b.cyl(0.4, 0.45, 0.12, '#7c5a2e', 0, 0.06, 0); break;
      case 'meteor': { const g = new T.IcosahedronGeometry(0.55, 1); b.geo(g, '#6b5b8a', 0, 0.6, 0); for (let i = 0; i < 5; i++) b.sph(0.12, '#c084fc', Math.sin(i * 1.7) * 0.5, 0.5 + (i % 2) * 0.3, Math.cos(i * 1.7) * 0.5, 1, 1, 1, 0, 0, 0, 'glow'); break; }
      case 'cake': b.cyl(0.65, 0.65, 0.45, '#ffd6e8', 0, 0.25, 0); b.cyl(0.48, 0.48, 0.4, '#fff1f7', 0, 0.68, 0); b.cyl(0.3, 0.3, 0.32, '#ffd6e8', 0, 1.02, 0); for (let i = 0; i < 8; i++) b.sph(0.07, '#ef4444', Math.sin(i * 0.8) * 0.6, 0.5, Math.cos(i * 0.8) * 0.6, 1, 1, 1, 0, 0, 0, 'gloss'); b.cyl(0.03, 0.03, 0.25, '#60a5fa', 0, 1.3, 0); b.sph(0.05, '#ffb020', 0, 1.46, 0, 1, 1.5, 1, 0, 0, 0, 'glow'); break;
      case 'chest': b.box(1.0, 0.55, 0.65, 0.1, '#9a5b2a', 0, 0.3, 0); b.cyl(0.33, 0.33, 1.0, '#b06a32', 0, 0.58, 0, 0, 0, Math.PI / 2, null); b.box(1.04, 0.1, 0.69, 0.03, '#ffd23f', 0, 0.55, 0, 0, 0, 0, 'gloss'); b.box(0.16, 0.2, 0.06, 0.03, '#ffd23f', 0, 0.55, 0.35, 0, 0, 0, 'gloss'); b.sph(0.2, '#ffd23f', 0, 0.85, 0, 1.6, 0.4, 1, 0, 0, 0, 'glow'); break;
      case 'anchor': b.cyl(0.08, 0.08, 1.1, '#ffd23f', 0, 0.75, 0, 0, 0, 0, 'gloss'); b.tor(0.14, 0.04, '#ffd23f', 0, 1.38, 0, 0, 0, 0, 'gloss'); b.tor(0.45, 0.08, '#ffd23f', 0, 0.58, 0, 0, 0, Math.PI, 'gloss', Math.PI); b.box(0.6, 0.1, 0.1, 0.04, '#ffd23f', 0, 1.1, 0, 0, 0, 0, 'gloss'); break;
      case 'goldegg': b.sph(0.45, '#ffd23f', 0, 0.62, 0, 1, 1.3, 1, 0, 0, 0, 'glow'); b.tor(0.45, 0.04, '#fff7c2', 0, 0.62, 0, Math.PI / 2, 0, 0, 'glow'); b.cyl(0.35, 0.42, 0.12, '#b48cff', 0, 0.06, 0); break;
      case 'harp': b.tor(0.55, 0.07, '#ffd23f', 0, 0.85, 0, 0, Math.PI / 2, 0, 'gloss', Math.PI * 1.2); b.cyl(0.06, 0.06, 1.3, '#ffd23f', 0, 0.7, -0.3, 0, 0, 0, 'gloss'); for (let i = 0; i < 6; i++) b.cyl(0.01, 0.01, 0.6 + i * 0.08, '#ffffff', 0, 0.6, -0.2 + i * 0.1, 0, 0, 0, 'glow'); b.cyl(0.35, 0.4, 0.12, '#b48cff', 0, 0.06, 0); break;
      case 'pillow': b.sph(0.6, '#f0e6ff', 0, 0.42, 0, 1.3, 0.55, 1, 0, 0, 0, 'gloss'); for (let i = 0; i < 4; i++) b.sph(0.14, '#c4b5fd', Math.sin(i * 1.57) * 0.7, 0.42, Math.cos(i * 1.57) * 0.55); break;
      case 'teddy': b.sph(0.5, '#b7793e', 0, 0.55, 0, 1, 1.05, 0.9); b.sph(0.38, '#b7793e', 0, 1.25, 0); b.sph(0.14, '#b7793e', -0.28, 1.55, 0); b.sph(0.14, '#b7793e', 0.28, 1.55, 0); b.sph(0.16, '#f2d2a9', 0, 1.18, 0.32, 1, 0.8, 0.6); b.sph(0.05, '#111', -0.13, 1.33, 0.33); b.sph(0.05, '#111', 0.13, 1.33, 0.33); b.sph(0.05, '#111', 0, 1.22, 0.43); b.tor(0.25, 0.05, '#ef4444', 0, 0.95, 0.05, Math.PI / 2, 0, 0); [-1, 1].forEach((s) => { b.sph(0.18, '#b7793e', s * 0.45, 0.65, 0.1); b.sph(0.2, '#b7793e', s * 0.25, 0.15, 0.25); }); break;
      case 'console': b.box(1.0, 0.25, 0.7, 0.1, '#ffd23f', 0, 0.2, 0, 0, 0, 0, 'glow'); b.box(0.5, 0.3, 0.12, 0.06, '#1f2937', -0.6, 0.18, 0.5, 0, 0.4, 0); b.sph(0.05, '#ef4444', -0.5, 0.36, 0.55, 1, 1, 1, 0, 0, 0, 'glow'); b.box(0.3, 0.04, 0.3, 0.02, '#22d3ee', 0.2, 0.34, 0, 0, 0, 0, 'glow'); break;
      case 'coin': b.cyl(0.24, 0.24, 0.08, '#ffd23f', 0, 0, 0, Math.PI / 2, 0, 0, 'glow'); b.cyl(0.15, 0.15, 0.09, '#f5b400', 0, 0, 0, Math.PI / 2, 0, 0, 'gloss'); break;
      case 'bag': b.sph(0.32, '#5ec26a', 0, 0.3, 0, 1, 1.05, 1); b.cyl(0.12, 0.16, 0.12, '#4ca85a', 0, 0.62, 0); b.tor(0.13, 0.03, '#ffd23f', 0, 0.58, 0, Math.PI / 2, 0, 0, 'gloss'); b.sph(0.12, '#ffd23f', 0, 0.32, 0.29, 1, 1, 0.3, 0, 0, 0, 'glow'); break;
      case 'candy': b.sph(0.22, '#ff4fd8', 0, 0.3, 0, 1.3, 1, 1, 0, 0, 0, 'gloss'); b.cone(0.14, 0.2, '#ff9ae8', -0.36, 0.3, 0, 0, 0, Math.PI / 2); b.cone(0.14, 0.2, '#ff9ae8', 0.36, 0.3, 0, 0, 0, -Math.PI / 2); break;
      case 'gem': b.add(new T.OctahedronGeometry(0.2, 0), '#ff4fd8', 'glow', 0, 0.35, 0, 0, 0, 0, 1, 1.4, 1); break;
      case 'pearl': b.sph(0.2, '#fff1fb', 0, 0.3, 0, 1, 1, 1, 0, 0, 0, 'glow'); b.geo(new T.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#ff9ac8', 0, 0.3, 0, 0, 0, 0, 1, 0.6, 1, 'gloss'); break;
      default: b.sph(0.25, '#ffd23f', 0, 0.3, 0, 1, 1, 1, 0, 0, 0, 'glow');
    }
    return b.group(true);
  };

  /* ---------- gadgets ---------- */
  M.banana = function () { const b = new B(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.3; b.cap(0.08, 0.3, '#ffe14d', Math.sin(a) * 0.18, 0.06, Math.cos(a) * 0.18, Math.PI / 2, a, 0); } b.sph(0.1, '#f5d020', 0, 0.1, 0); b.cyl(0.03, 0.03, 0.1, '#6b4b2a', 0, 0.2, 0); return b.group(); };
  M.decoy = function () { const g = new T.Group(); const b = new B(); b.sph(0.32, '#ff7ab8', 0, 0.42, 0, 1, 0.9, 1.1); b.sph(0.22, '#ff7ab8', 0, 0.82, 0.12); b.sph(0.09, '#ff7ab8', -0.16, 1.0, 0.1); b.sph(0.09, '#ff7ab8', 0.16, 1.0, 0.1); b.sph(0.04, '#111', -0.07, 0.86, 0.32); b.sph(0.04, '#111', 0.07, 0.86, 0.32); b.cyl(0.06, 0.06, 0.08, '#ffd23f', 0, 0.78, 0.33, Math.PI / 2, 0, 0, 'gloss');
    b.cyl(0.03, 0.03, 0.3, '#9ca3af', 0, 0.45, -0.38, Math.PI / 2, 0, 0); attach(g, b); const key = new B(); key.tor(0.1, 0.025, '#ffd23f', 0, 0, 0, 0, Math.PI / 2, 0, 'gloss'); key.tor(0.1, 0.025, '#ffd23f', 0, 0, 0, 0, 0, 0, 'gloss'); const kp = pivot(g, 0, 0.45, -0.55); attach(kp, key); g.userData.key = kp; return g; };
  M.mirror = function () { const g = new T.Group(); const b = new B(); b.cyl(0.25, 0.3, 0.1, '#64748b', 0, 0.05, 0); b.cyl(0.04, 0.04, 0.8, '#94a3b8', 0, 0.45, 0); b.tor(0.32, 0.05, '#ffd23f', 0, 1.05, 0, 0, 0, 0, 'gloss'); b.cyl(0.3, 0.3, 0.03, '#e0f7ff', 0, 1.05, 0, Math.PI / 2, 0, 0, 'glow'); attach(g, b); return g; };
  M.smoke = function () { const b = new B(); for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 0.8 + (i % 4) * 0.55; b.sph(0.9 + (i % 3) * 0.35, i % 2 ? '#ffc4ec' : '#f5d0fe', Math.sin(a) * r, 0.7 + (i % 5) * 0.45, Math.cos(a) * r, 1, 0.85, 1, 0, 0, 0, null, 10, 8); }
    const m = new T.Mesh(b.geometry(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: '#ffd6f5', emissiveIntensity: 0.35, transparent: true, opacity: 0.85, depthWrite: false })); return m; };
  M.hook = function () { const b = new B(); b.cyl(0.04, 0.04, 0.3, '#64748b', 0, 0, 0); for (let i = 0; i < 3; i++) b.tor(0.12, 0.03, '#94a3b8', Math.sin(i * 2.1) * 0.08, -0.15, Math.cos(i * 2.1) * 0.08, 0, i * 2.1, 0, 'gloss', Math.PI); return b.group(); };

  /* ---------- getaway vehicles ---------- */
  function wheels(b, xs, zs, r, col) { xs.forEach((x) => zs.forEach((z) => { b.cyl(r, r, 0.32, '#1f2937', x, r, z, 0, 0, Math.PI / 2); b.cyl(r * 0.55, r * 0.55, 0.34, col || '#e5e7eb', x, r, z, 0, 0, Math.PI / 2, 'gloss'); })); }
  M.vehicle = function (kind) {
    const g = new T.Group(); const b = new B();
    if (kind === 'icecream' || kind === 'van') {
      const c = kind === 'icecream' ? '#fff1f7' : '#3b82f6', c2 = kind === 'icecream' ? '#ff7ab8' : '#1e3a8a';
      b.box(2.4, 1.9, 5.2, 0.45, c, 0, 1.55, -0.2); b.box(2.42, 0.35, 5.22, 0.15, c2, 0, 0.75, -0.2); b.box(2.3, 1.0, 1.4, 0.4, c, 0, 1.1, 2.6);
      b.box(2.0, 0.75, 0.1, 0.12, '#9be7ff', 0, 1.95, 2.0, -0.25, 0, 0, 'gloss'); [-1, 1].forEach((s) => { b.box(0.08, 0.6, 0.9, 0.1, '#9be7ff', s * 1.2, 1.95, 1.3, 0, 0, 0, 'gloss'); b.sph(0.16, '#fff7c2', s * 0.8, 1.15, 3.32, 1, 1, 0.5, 0, 0, 0, 'glow'); });
      wheels(b, [-1.15, 1.15], [-1.9, 2.1], 0.48);
      if (kind === 'icecream') { b.cyl(0.35, 0.05, 0.9, '#f2c27a', 0, 3.0, -1, Math.PI, 0, 0); b.sph(0.45, '#ff9ae8', 0, 3.55, -1, 1, 0.9, 1, 0, 0, 0, 'gloss'); b.sph(0.12, '#ef4444', 0, 4.0, -1, 1, 1, 1, 0, 0, 0, 'gloss'); b.box(0.1, 1.0, 2.6, 0.08, '#ffd23f', 1.21, 1.6, -0.6, 0, 0, 0, 'gloss'); }
      else { b.box(0.1, 0.5, 3.0, 0.08, '#ffd23f', 1.21, 1.7, -0.6, 0, 0, 0, 'gloss'); b.box(0.1, 0.5, 3.0, 0.08, '#ffd23f', -1.21, 1.7, -0.6, 0, 0, 0, 'gloss'); b.box(1.6, 0.12, 2.6, 0.06, '#334155', 0, 2.55, -0.6); }
    } else if (kind === 'boat') {
      b.geo(M.lathe([[0, 0], [0.9, 0.05], [1.3, 0.6], [1.35, 1.0], [0, 1.0]], 20), '#ffffff', 0, 0, 0, 0, 0, 0, 1, 1, 2.6);
      b.tor(1.33, 0.12, '#ef4444', 0, 0.95, 0, Math.PI / 2, 0, 0, 'gloss'); b.geo(M.lathe([[0, 0], [0.95, 0.0], [0.95, 0.12], [0, 0.12]], 20), '#d9a066', 0, 0.85, 0, 0, 0, 0, 1, 1, 2.4);
      b.box(1.6, 0.8, 0.1, 0.1, '#9be7ff', 0, 1.4, 0.6, -0.4, 0, 0, 'gloss'); b.box(1.0, 0.5, 0.8, 0.2, '#1f2937', 0, 1.1, -2.3); b.box(0.6, 0.5, 0.9, 0.2, '#ffffff', -0.45, 1.2, -0.5); b.box(0.6, 0.5, 0.9, 0.2, '#ffffff', 0.45, 1.2, -0.5);
    } else if (kind === 'balloon') {
      b.box(1.8, 1.0, 1.8, 0.3, '#b7793e', 0, 0.5, 0); b.tor(0.9, 0.08, '#8a5a32', 0, 1.0, 0, Math.PI / 2, 0, 0); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; b.cyl(0.03, 0.03, 2.4, '#5b3a1e', Math.sin(a) * 0.95, 2.2, Math.cos(a) * 0.95); }
      const cols = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'];
      for (let i = 0; i < 12; i++) b.geo(new T.SphereGeometry(2.6, seg(4), seg(16), (i / 12) * Math.PI * 2, Math.PI * 2 / 12), cols[i % 6], 0, 5.6, 0, 0, 0, 0, 1, 1.15, 1, 'gloss');
      b.cone(1.2, 1.3, '#facc15', 0, 3.2, 0, Math.PI, 0, 0); b.sph(0.25, '#ffb020', 0, 3.4, 0, 1, 1.5, 1, 0, 0, 0, 'glow');
    } else { // rocket kart
      b.box(1.6, 0.5, 2.8, 0.22, '#ef4444', 0, 0.55, 0, 0, 0, 0, 'gloss'); b.box(1.1, 0.7, 1.0, 0.3, '#1f2937', 0, 0.9, -0.3); b.cyl(0.35, 0.35, 1.4, '#e5e7eb', 0, 0.9, -1.4, Math.PI / 2, 0, 0, 'gloss'); b.cone(0.38, 0.6, '#ffd23f', 0, 0.9, 0.6, Math.PI / 2, 0, 0, 'gloss');
      b.cyl(0.3, 0.2, 0.3, '#475569', 0, 0.9, -2.2, Math.PI / 2, 0, 0); b.cone(0.28, 0.8, '#ff7a1a', 0, 0.9, -2.7, -Math.PI / 2, 0, 0, 'glow'); wheels(b, [-0.85, 0.85], [-0.9, 1.0], 0.38, '#ffd23f'); b.box(0.9, 0.08, 0.3, 0.04, '#22d3ee', 0, 0.82, 1.35, 0, 0, 0, 'glow');
    }
    attach(g, b); return g;
  };
  M.MAT = { laser: new T.MeshBasicMaterial({ color: '#ff2a4a', transparent: true, opacity: 0.9 }), laserGlow: new T.MeshBasicMaterial({ color: '#ff6b81', transparent: true, opacity: 0.25, depthWrite: false }),
    cone: new T.MeshBasicMaterial({ color: '#fff27a', transparent: true, opacity: 0.32, depthWrite: false, side: T.DoubleSide }), water: new T.MeshStandardMaterial({ color: '#29b6f6', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }),
    choco: new T.MeshStandardMaterial({ color: '#7b3f1d', roughness: 0.25, metalness: 0.05 }), glass: new T.MeshStandardMaterial({ color: '#d6f3ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }),
    marker: new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.9, depthTest: false }), xray: new T.MeshBasicMaterial({ color: '#ff3b6b', transparent: true, opacity: 0.6, depthTest: false }) };
})();
