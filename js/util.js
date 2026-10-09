/* Grok Heist Crew - shared helpers */
(function () {
  'use strict';
  const GH = window.GH = window.GH || {};
  const U = GH.U = {};
  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (e0, e1, x) => { const t = U.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  U.ang = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  U.lerpAng = (a, b, t) => a + U.ang(b - a) * t;
  U.dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  U.rng = function (seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  function hash(ix, iz) { let h = (ix * 374761393 + iz * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  U.hash = hash;
  U.noise = function (x, z) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    return (a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz) * 2 - 1;
  };
  U.fbm = (x, z, o) => { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < (o || 3); i++) { s += U.noise(x * f + i * 17.3, z * f - i * 9.1) * a; n += a; a *= 0.5; f *= 2; } return s / n; };
  U.pick = (arr, r) => arr[Math.floor((r == null ? Math.random() : r) * arr.length) % arr.length];
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.uid = () => Math.random().toString(36).slice(2, 9);

  // merge (non-indexed) geometries with position/normal/color
  U.merge = function (geos) {
    let total = 0; const list = [];
    geos.forEach((g) => { if (!g) return; const gg = g.index ? g.toNonIndexed() : g; if (!gg.attributes.normal) gg.computeVertexNormals(); list.push(gg); total += gg.attributes.position.count; });
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
    let o = 0;
    list.forEach((g) => {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.color) col.set(g.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + c) * 3);
      o += c;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  };
  const _c = new THREE.Color();
  U.paint = function (g, color, jitter) {
    const gg = g.index ? g.toNonIndexed() : g; _c.set(color);
    const n = gg.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const j = jitter ? 1 + (Math.random() - 0.5) * jitter : 1; a[i * 3] = _c.r * j; a[i * 3 + 1] = _c.g * j; a[i * 3 + 2] = _c.b * j; }
    gg.setAttribute('color', new THREE.BufferAttribute(a, 3)); return gg;
  };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  U.xf = function (g, x, y, z, rx, ry, rz, sx, sy, sz) {
    _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e); _v.set(x || 0, y || 0, z || 0);
    _s.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz);
    _m.compose(_v, _q, _s); g.applyMatrix4(_m); return g;
  };
  // smooth rounded box (beveled extrude, centred)
  const rbCache = {};
  U.rbox = function (w, h, d, r, seg) {
    r = Math.min(r == null ? 0.15 : r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001); seg = seg || 3;
    const key = [w, h, d, r, seg].map((v) => v.toFixed(3)).join(',');
    if (rbCache[key]) return rbCache[key].clone();
    const s = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r, W = w - 2 * r, H = h - 2 * r;
    s.moveTo(x, y); s.lineTo(x + W, y); s.lineTo(x + W, y + H); s.lineTo(x, y + H); s.lineTo(x, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg, curveSegments: 4 });
    g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals();
    const ng = g.index ? g.toNonIndexed() : g; ng.computeVertexNormals(); rbCache[key] = ng; return ng.clone();
  };
  // rounded rectangle shape
  U.rrShape = function (w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  };
  U.fmt = (n) => Math.round(n).toLocaleString('en-US');
  // simple spatial hash of circle colliders
  U.Grid = function (cell) { this.cell = cell || 16; this.m = new Map(); };
  U.Grid.prototype.key = function (ix, iz) { return ix * 73856093 ^ iz * 19349663; };
  U.Grid.prototype.add = function (o) {
    const c = this.cell, r = o.r || Math.max(o.hw || 0, o.hd || 0) || 1;
    const x0 = Math.floor((o.x - r) / c), x1 = Math.floor((o.x + r) / c), z0 = Math.floor((o.z - r) / c), z1 = Math.floor((o.z + r) / c);
    o._cells = [];
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = this.key(i, j); let a = this.m.get(k); if (!a) { a = []; this.m.set(k, a); } a.push(o); o._cells.push(k); }
  };
  U.Grid.prototype.remove = function (o) { if (!o._cells) return; o._cells.forEach((k) => { const a = this.m.get(k); if (a) { const i = a.indexOf(o); if (i >= 0) a.splice(i, 1); } }); o._cells = null; };
  U.Grid.prototype.near = function (x, z, out) {
    out = out || []; out.length = 0; const c = this.cell, ix = Math.floor(x / c), iz = Math.floor(z / c);
    for (let i = ix - 1; i <= ix + 1; i++) for (let j = iz - 1; j <= iz + 1; j++) { const a = this.m.get(this.key(i, j)); if (a) for (let k = 0; k < a.length; k++) if (out.indexOf(a[k]) < 0) out.push(a[k]); }
    return out;
  };
  // push a circle (x,z,r) out of colliders; returns {x,z,hit}
  const _near = [];
  U.collide = function (grid, x, z, r, y, extra) {
    let hit = false; const list = grid ? grid.near(x, z, _near) : [];
    const all = extra ? list.concat(extra) : list;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < all.length; i++) {
      const o = all[i]; if (o.off) continue; if (y != null && o.top != null && y >= o.top - 0.05) continue; if (y != null && o.bot != null && y + 1.6 < o.bot) continue;
      if (o.hw != null) { // axis box
        const dx = x - o.x, dz = z - o.z, px = o.hw + r - Math.abs(dx), pz = o.hd + r - Math.abs(dz);
        if (px > 0 && pz > 0) { hit = true; if (px < pz) x += px * Math.sign(dx || 1); else z += pz * Math.sign(dz || 1); }
      } else {
        const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), m = o.r + r;
        if (d < m) { hit = true; const k = d > 1e-4 ? (m - d) / d : 0; x += dx * k; z += dz * k; if (d <= 1e-4) x += m; }
      }
    }
    return { x, z, hit };
  };
})();
