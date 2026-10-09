/* Grok Heist Crew - HUD, touch controls, menus, hack mini-game, minimap */
(function () {
  'use strict';
  const GH = window.GH, U = GH.U, D = GH.D, LG = GH.LG, M = GH.M, T = THREE, GN = window.GrokNet;
  const UI = GH.UI = { inp: { mx: 0, mz: 0 }, cam: { dx: 0, dy: 0 } };
  const $ = (id) => document.getElementById(id);
  let G = null; const keys = {};
  const esc = U.esc;
  const stars = (a) => (a || [false, false, false]).map((s) => s ? '⭐' : '☆').join('');

  UI.init = function (g) {
    G = g;
    // profile
    const prof = GN.savedProfile(); $('nameIn').value = prof.hasName ? prof.name : ''; UI.color = prof.color; GH.GN_name = prof.hasName ? prof.name : 'Player';
    const sw = $('colorRow'); GN.COLORS.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.style.background = c; if (c === UI.color) b.className = 'on'; b.onclick = () => { UI.color = c; [...sw.children].forEach((x) => x.classList.remove('on')); b.classList.add('on'); }; sw.appendChild(b); });
    const saveProf = () => { const n = GN.cleanName($('nameIn').value || 'Player'); GN.saveProfile(n, UI.color); GH.GN_name = n; };
    $('bSolo').onclick = () => { GH.Snd.unlock(); saveProf(); $('scrTitle').classList.add('hidden'); G.goLevel('hideout'); setTimeout(() => { if (!G.save.seenHow) { G.save.seenHow = true; G.persist(); UI.howTo(true); } }, 700); };
    $('bOnline').onclick = () => { GH.Snd.unlock(); saveProf(); $('scrTitle').classList.add('hidden'); $('scrOnline').classList.remove('hidden'); };
    $('bOnlineBack').onclick = () => { $('scrOnline').classList.add('hidden'); $('scrTitle').classList.remove('hidden'); };
    $('bHost').onclick = () => GH.Net.host(); $('bJoin').onclick = () => { const c = GN.normalizeCode($('codeIn').value); if (!GN.validCode(c)) { $('onlineMsg').textContent = 'Type the 5-letter code.'; return; } GH.Net.join(c); };
    $('bHow').onclick = () => UI.howTo(true);
    // joystick + camera drag
    const joy = $('joy'), knob = $('joyKnob'), base = $('joyBase'); let jid = null, jx = 0, jy = 0; const camT = {};
    const isBtn = (el) => el && el.closest && el.closest('button, .card, #hackUI, #minimap');
    window.addEventListener('touchstart', (e) => { if (!G.playing) return; for (const t of e.changedTouches) { if (isBtn(t.target)) continue; if (t.clientX < innerWidth * 0.46 && t.clientY > innerHeight * 0.45 && jid == null) { jid = t.identifier; jx = t.clientX; jy = t.clientY; base.style.left = (jx - 60) + 'px'; base.style.top = (jy - 60) + 'px'; joy.classList.add('on'); knob.style.transform = 'translate(0px,0px)'; } else camT[t.identifier] = { x: t.clientX, y: t.clientY }; } if (e.target === $('c')) e.preventDefault(); }, { passive: false });
    window.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) { if (t.identifier === jid) { let dx = t.clientX - jx, dy = t.clientY - jy; const d = Math.hypot(dx, dy), mx = 52; if (d > mx) { dx *= mx / d; dy *= mx / d; } knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; UI.joy = { mx: dx / mx, mz: -dy / mx }; if (Math.hypot(UI.joy.mx, UI.joy.mz) < 0.15) UI.joy = { mx: 0, mz: 0 }; } else if (camT[t.identifier]) { const c = camT[t.identifier]; UI.cam.dx += t.clientX - c.x; UI.cam.dy += t.clientY - c.y; c.x = t.clientX; c.y = t.clientY; } } if (G.playing) e.preventDefault(); }, { passive: false });
    const tend = (e) => { for (const t of e.changedTouches) { if (t.identifier === jid) { jid = null; UI.joy = null; joy.classList.remove('on'); base.style.left = ''; base.style.top = ''; knob.style.transform = 'translate(0px,0px)'; } delete camT[t.identifier]; } };
    window.addEventListener('touchend', tend); window.addEventListener('touchcancel', tend);
    let md = null; $('c').addEventListener('mousedown', (e) => { md = { x: e.clientX, y: e.clientY }; }); window.addEventListener('mousemove', (e) => { if (!md) return; UI.cam.dx += e.clientX - md.x; UI.cam.dy += e.clientY - md.y; md = { x: e.clientX, y: e.clientY }; }); window.addEventListener('mouseup', () => { md = null; });
    const press = (id, fn) => { const b = $(id); const dn = (e) => { e.preventDefault(); e.stopPropagation(); GH.Snd.unlock(); b.classList.add('down'); fn(); }; const up = () => b.classList.remove('down'); b.addEventListener('touchstart', dn, { passive: false }); b.addEventListener('touchend', up); b.addEventListener('mousedown', dn); b.addEventListener('mouseup', up); b.addEventListener('mouseleave', up); };
    press('bAct', () => UI.doAct()); press('bAbility', () => UI.doAb()); press('bGadget', () => G.useGadget()); press('bGadNext', () => UI.nextGadget());
    $('bMenu').onclick = () => UI.pause(); $('bRole').onclick = () => UI.roleSelect();
    $('minimap').onclick = () => UI.mapPanel();
    $('bHackGo').addEventListener('touchstart', (e) => { e.preventDefault(); UI.hackTap(); }, { passive: false }); $('bHackGo').addEventListener('mousedown', (e) => { e.preventDefault(); UI.hackTap(); }); $('bHackX').onclick = () => UI.hackCancel();
    window.addEventListener('keydown', (e) => { if (e.target && e.target.tagName === 'INPUT') return; const k = e.key.toLowerCase(); if (keys[k]) return; keys[k] = true; if (!G.playing) return;
      if (k === 'escape' || k === 'p') { if (UI.panelOpen()) UI.close(); else UI.pause(); return; } if (UI.hackOpen()) { if (k === ' ' || k === 'e') { UI.hackTap(); e.preventDefault(); } return; } if (UI.panelOpen()) return;
      if (k === 'e' || k === ' ') { UI.doAct(); e.preventDefault(); } if (k === 'q') UI.doAb(); if (k === 'f') G.useGadget(); if (k === 'r') UI.nextGadget(); if (k === 'tab') { e.preventDefault(); UI.roleSelect(); } if (k === 'm') UI.mapPanel(); });
    window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; }); window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    UI.mmT = 0; UI.ctxT = 0;
  };
  UI.read = function (dt) {
    let mx = 0, mz = 0; if (keys.w) mz += 1; if (keys.s) mz -= 1; if (keys.a) mx -= 1; if (keys.d) mx += 1;
    if (keys.arrowleft) UI.cam.dx -= 260 * dt; if (keys.arrowright) UI.cam.dx += 260 * dt; if (keys.arrowup) UI.cam.dy += 160 * dt; if (keys.arrowdown) UI.cam.dy -= 160 * dt;
    if (UI.joy) { mx = UI.joy.mx; mz = UI.joy.mz; }
    if (UI.force) { mx = UI.force.mx; mz = UI.force.mz; }
    if (UI.panelOpen() || UI.hackOpen() || !G.playing) { mx = 0; mz = 0; }
    UI.inp.mx = mx; UI.inp.mz = mz;
    G.paused = UI.panelOpen() && !(G.room && G.room.opened);
  };
  UI.doAct = function () { const c = UI.ctx; if (c && c.act.fn) { c.act.fn(); UI.ctxT = 0; } };
  UI.doAb = function () { const c = UI.ctx; if (c && c.ab.fn) { c.ab.fn(); UI.ctxT = 0; } };
  UI.nextGadget = function () { const ids = D.GADGET_IDS; let i = ids.indexOf(G.sel); G.sel = ids[(i + 1) % ids.length]; GH.Snd.fx('ui'); UI.toast(D.GADGETS[G.sel].icon + ' ' + D.GADGETS[G.sel].name + ': ' + D.GADGETS[G.sel].desc); };
  UI.enterPlay = function () { $('hud').classList.remove('hidden'); $('scrTitle').classList.add('hidden'); $('scrOnline').classList.add('hidden'); document.body.classList.remove('alarm'); UI.mapImg = null; UI.close(); UI.levelChanged(); };
  UI.levelChanged = function () { UI.mapImg = null; const hub = G.hub; ['row2', 'bGadget', 'bGadNext'].forEach((id) => $(id).classList.toggle('hidden', !!hub)); $('lootPill').classList.toggle('hidden', !!hub); UI.roleChanged(); };
  UI.roleChanged = function () { if (!G.hero) return; const r = D.ROLES[G.hero.role]; $('roleI').textContent = r.icon; $('roleN').textContent = r.name.toUpperCase(); $('bRole').style.background = r.col; $('bAbility').style.background = r.col; $('abI').textContent = r.abIcon; };

  /* ---------- per-frame HUD ---------- */
  UI.frame = function (dt) {
    if (!G.playing || !G.hero) { UI.labels(); return; }
    UI.ctxT -= dt; if (UI.ctxT <= 0) { UI.ctxT = 0.12; UI.ctx = G.context(); const c = UI.ctx; $('actL').textContent = c.act.label || ''; $('bAct').classList.toggle('off', !c.act.fn); $('bAct').classList.toggle('hidden', !c.act.label); $('abL').textContent = c.ab.label; $('bAbility').classList.toggle('off', !c.ab.on); }
    $('coinN').textContent = U.fmt(G.save.coins);
    if (!G.hub) { const AI = GH.AI; $('heatFill').style.width = AI.heat + '%'; $('heat').classList.toggle('alarm', AI.alarmT > 0); $('heatT').textContent = AI.alarmT > 0 ? 'ALARM!' : AI.heat > 60 ? 'HOT!' : AI.heat > 25 ? 'WARM' : 'COOL'; if (AI.alarmT <= 0) document.body.classList.remove('alarm');
      $('lootN').textContent = G.stats.loot; const t = Math.floor(G.time); $('timeN').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
      $('gadI').textContent = D.GADGETS[G.sel].icon; $('gadN').textContent = G.inv[G.sel] > 50 ? '∞' : G.inv[G.sel]; $('bGadget').classList.toggle('off', !G.inv[G.sel]); }
    const def = D.LEVELS[G.lvl]; let obj = '';
    if (G.hub) obj = '🏠 Crew Hideout - walk to the 🗺️ planning table'; else if (G.phase === 'sneak') obj = '🎯 Find the ' + def.target.icon + ' ' + def.target.name + (def.target.big ? ' (needs 💪)' : ''); else if (G.phase === 'escape') obj = G.hero.carry === 'target' ? '🚀 Run to the getaway ride!' : '🚀 Escape! Get to the getaway ride'; else obj = '🎉 Heist complete!';
    if (G.hero.roof) obj = '🏙️ On the roof - find the glass skylight';
    $('objT').textContent = obj;
    UI.mmT -= dt; if (UI.mmT <= 0) { UI.mmT = 0.1; UI.minimap(); }
    UI.labels();
  };
  UI.labels = function () {
    const box = $('labels'); const want = [];
    if (G.L && G.hub && G.L.stationPts && G.mode === 'hub') G.L.stationPts.forEach((s) => want.push({ x: s.X, y: 3.2, z: s.Z, t: s.label, c: '#7c3aed' }));
    for (const k in G.remotes) { const r = G.remotes[k]; if (r.model && r.model.visible) want.push({ x: r.x, y: r.y + 2.8, z: r.z, t: (D.ROLES[r.role] ? D.ROLES[r.role].icon + ' ' : '') + r.name, c: r.color || '#ff4fd8' }); }
    while (box.children.length < want.length) { const el = document.createElement('div'); el.className = 'lbl'; box.appendChild(el); }
    [...box.children].forEach((el, i) => { const w = want[i]; if (!w) { el.style.display = 'none'; return; } const v = new T.Vector3(w.x, w.y, w.z).project(G.cam); const d = Math.hypot(w.x - G.cam.position.x, w.z - G.cam.position.z); if (v.z > 1 || d > 26) { el.style.display = 'none'; return; } el.style.display = ''; el.textContent = w.t; el.style.background = w.c; el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * innerWidth) + 'px,' + ((-v.y * 0.5 + 0.5) * innerHeight) + 'px) translate(-50%,-50%)'; });
  };

  /* ---------- minimap ---------- */
  function mapImage() {
    const P = G.P, S = 8, cv = document.createElement('canvas'); cv.width = P.W * S; cv.height = P.H * S; const cx = cv.getContext('2d');
    for (let z = 0; z < P.H; z++) for (let x = 0; x < P.W; x++) { const c = P.ch[z][x]; let col = null; const r = P.room[z][x];
      if (c === '#') col = '#f5f0ff'; else if (c === 'w') col = '#2b7bd8'; else if (c === '~') col = '#ff7ab8'; else if (c === 'G') col = '#9be7ff'; else if (c === '=') col = '#c4b5fd'; else if (r >= 0 || 'DLSZ'.indexOf(c) >= 0) col = '#5b4b8a'; else if (c === ' ') col = '#3d6b4a';
      if (P.deco[z][x] && c === '.') col = '#4a3d72'; if (col) { cx.fillStyle = col; cx.fillRect(x * S, z * S, S, S); } }
    return cv;
  }
  UI.minimap = function () {
    const cv = $('minimap'), cx = cv.getContext('2d'), Sz = cv.width, P = G.P; if (!P) return; if (!UI.mapImg || UI.mapImg.P !== P) { UI.mapImg = mapImage(); UI.mapImg.P = P; }
    const h = G.hero, R = 26, k = Sz / (2 * R), S = 8; cx.clearRect(0, 0, Sz, Sz); cx.save(); cx.beginPath(); cx.arc(Sz / 2, Sz / 2, Sz / 2, 0, Math.PI * 2); cx.clip(); cx.fillStyle = '#2a1f4a'; cx.fillRect(0, 0, Sz, Sz);
    cx.translate(Sz / 2, Sz / 2); cx.rotate(G.camYaw); cx.scale(k, k); cx.translate(-h.x, -h.z);
    cx.imageSmoothingEnabled = false; cx.drawImage(UI.mapImg, 0, 0, P.W * 2, P.H * 2);
    const S2 = P.state; P.locks.forEach((l) => l.cells.forEach((c) => { cx.fillStyle = S2.locks[l.id] ? '#4ade80' : '#ff3b3b'; cx.fillRect(c[0] * 2, c[1] * 2, 2, 2); }));
    if (!S2.secret) P.secret.forEach((s) => { cx.fillStyle = '#f5f0ff'; cx.fillRect(s.x * 2, s.z * 2, 2, 2); });
    P.lasers.forEach((g) => { if (!GH.AI.laserOn(g.id)) return; cx.fillStyle = '#ff2a4a'; g.cells.forEach((c) => cx.fillRect(c[0] * 2 + 0.6, c[1] * 2 + 0.6, 0.8, 0.8)); });
    const dot = (x, z, r, col, ring) => { cx.beginPath(); cx.arc(x, z, r, 0, Math.PI * 2); cx.fillStyle = col; cx.fill(); if (ring) { cx.lineWidth = 0.35; cx.strokeStyle = '#fff'; cx.stroke(); } };
    P.vents.forEach((v) => [v.a, v.b].forEach((e) => dot(LG.wx(e[0]), LG.wx(e[1]), 0.6, '#22d3ee')));
    P.roofPts.forEach((p) => dot(LG.wx(p.x), LG.wx(p.z), 0.8, '#ffd23f', true));
    const seeAll = h.role === 'lookout' || h.pingT > 0;
    if (!G.hub) { P.loot.forEach((l) => { if (S2.loot[l.id] || l.carried) return; if (seeAll || Math.hypot(l.pos[0] - h.x, l.pos[1] - h.z) < 12) dot(l.pos[0], l.pos[1], l.big ? 0.9 : 0.5, '#ffd23f'); });
      (GH.AI.cams || []).forEach((c) => { if (!S2.cams[c.id]) dot(c.X, c.Z, 0.7, '#ffb020', true); });
      (GH.AI.guards || []).forEach((g) => { const gx = g.x, gz = g.z; if (!seeAll && Math.hypot(gx - h.x, gz - h.z) > 16) return; cx.beginPath(); cx.moveTo(gx, gz); const yw = g.yaw; cx.arc(gx, gz, 5, Math.PI / 2 - yw - 0.6, Math.PI / 2 - yw + 0.6); cx.closePath(); cx.fillStyle = g.st === 'chase' ? 'rgba(255,59,59,.45)' : 'rgba(255,240,120,.35)'; cx.fill(); dot(gx, gz, 0.9, g.st === 'chase' ? '#ff3b3b' : '#ff6b81', true); }); }
    if (G.L.dyn.vehicle) dot(G.L.dyn.vehicle.position.x, G.L.dyn.vehicle.position.z, 1.4, '#22c55e', true);
    if (G.objPos) { cx.font = '3px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; dot(G.objPos[0], G.objPos[1], 1.3, '#ffd23f', true); }
    for (const kk in G.remotes) { const r = G.remotes[kk]; if (r.lvl === G.lvl) dot(r.x, r.z, 0.9, r.color || '#ff4fd8', true); }
    cx.restore();
    // player arrow
    cx.save(); cx.translate(Sz / 2, Sz / 2); cx.rotate(-(h.yaw - G.camYaw) + Math.PI); cx.fillStyle = D.ROLES[h.role].col; cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(0, -12); cx.lineTo(9, 9); cx.lineTo(-9, 9); cx.closePath(); cx.fill(); cx.stroke(); cx.restore();
  };
  UI.mapPanel = function () { if (G.hub || !G.P) return; const cv = mapImage(); const url = cv.toDataURL(); UI.panel('<h2>🗺️ BLUEPRINT</h2><p class="sub">' + esc(D.LEVELS[G.lvl].full) + '</p><img src="' + url + '" style="width:100%;image-rendering:pixelated;border-radius:12px;border:3px solid #e9d5ff"><div class="chips"><span class="chip">⬜ walls</span><span class="chip">🟥 vault door</span><span class="chip">🟦 vents</span><span class="chip">🩷 gaps</span><span class="chip">🟡 roof hook</span></div><div class="btnrow"><button class="btn primary" data-close>OK</button></div>'); };

  /* ---------- panels ---------- */
  UI.panelOpen = () => !$('pnl').classList.contains('hidden');
  UI.panel = function (html, bind, cls) { const p = $('pnl'), c = $('pnlCard'); c.innerHTML = html; c.className = 'card' + (cls ? ' ' + cls : ''); p.className = 'screen top' + (cls && cls.indexOf('low') >= 0 ? ' low' : ''); p.classList.remove('hidden'); c.scrollTop = 0; if (G && !(G.room && G.room.opened)) G.paused = true; c.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => UI.close()); if (bind) bind(c); };
  UI.close = function () { $('pnl').classList.add('hidden'); if (G) G.paused = false; if (G) G.camOverride = null; GH.Snd.fx && GH.Snd.fx('ui'); if (UI.onClose) { const f = UI.onClose; UI.onClose = null; f(); } };
  UI.toast = function (msg, bad) { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; const box = $('toasts'); box.appendChild(t); while (box.children.length > 3) box.removeChild(box.children[0]); UI.lastToast = msg; setTimeout(() => t.remove(), 2600); };
  UI.banner = function (msg, bad) { const b = $('banner'); b.textContent = msg; b.className = bad ? 'bad' : ''; clearTimeout(UI.bT); UI.bT = setTimeout(() => b.classList.add('hidden'), 2800); UI.lastBanner = msg; };
  UI.fade = function (fn) { const f = $('fade'); f.classList.add('on'); setTimeout(() => { try { fn(); } catch (e) { console.error(e); } setTimeout(() => f.classList.remove('on'), 120); }, 360); };
  UI.caught = function () { const c = $('caughtFx'); c.classList.remove('hidden'); clearTimeout(UI.cT); UI.cT = setTimeout(() => c.classList.add('hidden'), 1700); };
  UI.howTo = function (fromTitle) {
    UI.panel('<h2>❓ HOW TO PLAY</h2><ul class="help"><li><b>Move</b> with the joystick (left thumb). <b>Drag</b> anywhere else to look around.</li><li>Sneak in, grab the <b>🎯 target</b> and escape to the <b>getaway ride</b>! Guards and robots never hurt you - if they catch you, you just go back to a checkpoint.</li><li>Stay out of the <b>yellow vision cones</b>. Orange = suspicious, red = chasing! Cameras 📷 and lasers ⚡ raise the <b>🔥 heat</b>. Full heat = ALARM.</li><li><b>Roles</b> (tap your role chip to swap):<br>💻 <b>Hacker</b> opens vault doors, turns off cameras and lasers.<br>🔭 <b>Lookout</b> PINGs guards so you see them through walls.<br>🤸 <b>Acrobat</b> vaults lasers, wall-runs over gaps and crawls through vents.<br>💪 <b>Muscle</b> moves heavy crates and carries big loot.</li><li><b>Gadgets</b>: 🪝 hook, 🍌 banana peel, 💨 smoke bomb, 🧸 decoy, 🪞 laser mirror.</li><li>Every heist has secret routes: vents, rooftops 🪝, levers 🕯️ and crates 📦. Collect 💰 bonus loot for coins and earn ⭐⭐⭐!</li><li>Keyboard: WASD move · arrows look · E action · Q ability · F gadget · R next gadget · Tab role · Esc pause</li></ul><div class="btnrow"><button class="btn primary" data-close>GOT IT!</button></div>');
  };
  UI.pause = function () {
    if (!G.playing) return; const q = G.gfx, S = GH.Snd;
    UI.panel('<h2>⏸️ PAUSED</h2>' + (G.room && G.room.opened ? '<p class="sub">Room code <b>' + esc(G.room.code) + '</b> · ' + G.room.players().length + '/3 players</p>' : '') +
      '<h3>🎨 GRAPHICS</h3><div class="seg"><button class="btn ' + (q === 'high' ? 'green on' : 'alt') + '" id="gHigh">✨ HIGH</button><button class="btn ' + (q === 'low' ? 'green on' : 'alt') + '" id="gLow">⚡ LOW</button></div><p class="sub" style="margin-top:6px;font-size:12px">High = shadows + sharper. Low = faster on older phones.' + (G.gfxUser ? '' : ' (Auto: switches to Low if the game gets slow.)') + '</p>' +
      '<h3>🔊 SOUND</h3><div class="seg"><button class="btn ' + (S.on ? 'green on' : 'alt') + '" id="sOn">Sound ' + (S.on ? 'ON' : 'OFF') + '</button><button class="btn ' + (S.music ? 'green on' : 'alt') + '" id="mOn">Music ' + (S.music ? 'ON' : 'OFF') + '</button></div>' +
      '<div class="btncol"><button class="btn primary" data-close>▶ RESUME</button><button class="btn blue small" id="pHow">❓ HOW TO PLAY</button>' + (!G.hub ? '<button class="btn pink small" id="pLeave">🏠 BACK TO HIDEOUT</button>' : '') + '<button class="btn red small" id="pQuit">🚪 QUIT TO TITLE</button></div>',
      (c) => { c.querySelector('#gHigh').onclick = () => { G.setQuality('high', true); UI.pause(); }; c.querySelector('#gLow').onclick = () => { G.setQuality('low', true); UI.pause(); };
        c.querySelector('#sOn').onclick = () => { S.on = !S.on; S.save(); UI.pause(); }; c.querySelector('#mOn').onclick = () => { S.music = !S.music; S.save(); UI.pause(); };
        c.querySelector('#pHow').onclick = () => UI.howTo(); const pl = c.querySelector('#pLeave'); if (pl) pl.onclick = () => { UI.close(); if (G.room && G.room.opened && !G.room.isHost) { UI.toast('Only the host can end the heist.', true); return; } G.toHideout(); };
        c.querySelector('#pQuit').onclick = () => { UI.close(); if (GH.Net) GH.Net.leave(); G.playing = false; $('hud').classList.add('hidden'); UI.fade(() => { G.loadLevel('hideout', { title: true }); $('scrTitle').classList.remove('hidden'); }); }; });
  };
  UI.station = function (k) {
    if (k === 'plan' || k === 'van') return UI.heistSelect(); if (k === 'upgrade') return UI.upgrades(); if (k === 'outfit') return UI.outfits(); if (k === 'crew') return UI.roleSelect(); if (k === 'trophy') return UI.trophies();
  };
  UI.heistSelect = function () {
    const s = G.save; let h = '<h2>🗺️ PICK A HEIST</h2><p class="sub">Baron Grumble stole treasures all over town. Time to take them back!</p>';
    D.ORDER.forEach((id) => { const L = D.LEVELS[id], open = s.unlocked.indexOf(id) >= 0; h += '<button class="heist' + (open ? '' : ' lock') + '" data-h="' + id + '"><span class="hi">' + L.icon + '</span><span style="flex:1"><span class="hn">' + (L.n) + '. ' + esc(L.name) + (L.bonus ? ' <span class="lvl">BONUS</span>' : '') + '</span><br><span class="hs">' + (open ? '🎯 ' + esc(L.target.name) + ' · ' + stars(s.stars[id]) + (s.best[id] ? ' · best ' + Math.floor(s.best[id] / 60) + ':' + String(s.best[id] % 60).padStart(2, '0') : '') : '🔒 Finish the heist before this one') + '</span></span></button>'; });
    h += '<div class="btnrow"><button class="btn alt small" data-close>BACK</button></div>';
    UI.panel(h, (c) => c.querySelectorAll('[data-h]').forEach((b) => b.onclick = () => { const id = b.dataset.h; if (s.unlocked.indexOf(id) < 0) { UI.toast('🔒 Finish the heist before this one first!', true); return; } UI.close(); G.startHeist(id); }));
  };
  UI.briefing = function (id) {
    const L = D.LEVELS[id]; const P = G.P;
    const tips = []; if (P.locks.length) tips.push('🔒 Vault door: 💻 Hacker'); if (P.lasers.length) tips.push('⚡ Lasers: 💻 hack, 🤸 flip or 🪞 mirror'); if (P.vents.length) tips.push('🕳️ Vents: 🤸 Acrobat'); if (P.crates.length) tips.push('📦 Crates: 💪 Muscle'); if (P.secret.length) tips.push('🕯️ Find the secret lever'); if (P.roofPts.length) tips.push('🪝 Roof route + skylight'); if (P.ch.some((r) => r.indexOf('~') >= 0)) tips.push('🌊 Gaps: 🤸 wall-run or 🪝 hook');
    UI.panel('<h2>' + L.icon + ' ' + esc(L.full).toUpperCase() + '</h2><div class="brief">' + esc(L.story) + '</div><div class="chips"><span class="chip">🎯 ' + esc(L.target.name) + '</span><span class="chip">⏱️ Speed star under ' + Math.floor(L.par / 60) + ':' + String(L.par % 60).padStart(2, '0') + '</span><span class="chip">💰 ' + P.loot.length + ' bonus loot</span></div><h3>ROUTES</h3><div class="chips">' + tips.map((t) => '<span class="chip">' + t + '</span>').join('') + '</div><h3>PICK YOUR ROLE</h3>' + roleCards() + '<div class="btnrow"><button class="btn primary" data-close>🚀 START HEIST!</button></div>', bindRoles);
  };
  function roleCards() { const t = G.takenRoles(); return '<div class="rolecards">' + D.ROLE_IDS.map((r) => { const R = D.ROLES[r]; return '<button class="rc' + (G.hero.role === r ? ' on' : '') + (t[r] ? ' taken' : '') + '" data-r="' + r + '" style="background:' + R.col + '"><div class="ri">' + R.icon + '</div><div class="rn">' + R.name + '</div><div class="rd">' + (t[r] ? esc(t[r]) : R.ab) + '</div></button>'; }).join('') + '</div>'; }
  function bindRoles(c) { c.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => { if (G.trySwap(b.dataset.r)) { c.querySelectorAll('[data-r]').forEach((x) => x.classList.toggle('on', x.dataset.r === b.dataset.r)); const d = c.querySelector('#roleDesc'); if (d) d.textContent = D.ROLES[b.dataset.r].desc; } }); }
  UI.roleSelect = function () {
    if (G.hub && G.L.lineup) { const p = G.L.lineup; G.camOverride = { pos: new T.Vector3(15, 3.0, 39.2), look: new T.Vector3(15, 0.15, 29) }; }
    UI.panel('<h2>🦹 PICK YOUR ROLE</h2>' + roleCards() + '<p class="sub" id="roleDesc" style="margin-top:8px">' + D.ROLES[G.hero.role].desc + '</p><p class="sub" style="font-size:12px">' + (G.room && G.room.opened ? 'Each friend picks a different role. You can swap any time to a free role.' : 'Playing solo? Swap roles any time - even in the middle of a heist!') + '</p><div class="btnrow"><button class="btn primary" data-close>OK!</button></div>', bindRoles, G.hub ? 'low' : '');
  };
  UI.upgrades = function () {
    const s = G.save; let h = '<h2>🔧 GADGET LAB</h2><p class="sub">You have 🪙 <b>' + U.fmt(s.coins) + '</b> coins</p>';
    D.UPGRADES.forEach((u) => { const lv = s.up[u.id] || 0, max = lv >= u.max, cost = max ? 0 : u.cost[lv]; h += '<div class="uprow"><span class="ui">' + u.icon + '</span><span class="ut">' + u.name + ' <span class="lvl">' + '●'.repeat(lv) + '○'.repeat(u.max - lv) + '</span><small>' + u.desc + '</small></span><button class="btn ' + (max ? 'alt' : 'green') + ' small" data-u="' + u.id + '" ' + (max || s.coins < cost ? 'disabled' : '') + '>' + (max ? 'MAX' : '🪙 ' + cost) + '</button></div>'; });
    h += '<div class="btnrow"><button class="btn alt small" data-close>BACK</button></div>';
    UI.panel(h, (c) => c.querySelectorAll('[data-u]').forEach((b) => b.onclick = () => { const u = D.UPGRADES.find((q) => q.id === b.dataset.u); const lv = s.up[u.id] || 0; if (lv >= u.max || s.coins < u.cost[lv]) return; s.coins -= u.cost[lv]; s.up[u.id] = lv + 1; G.persist(); GH.Snd.fx('cash'); UI.toast(u.icon + ' ' + u.name + ' upgraded!'); UI.upgrades(); }));
  };
  UI.outfits = function () {
    const s = G.save, role = G.hero.role; let h = '<h2>👕 WARDROBE</h2><p class="sub">Outfit for your <b>' + D.ROLES[role].icon + ' ' + D.ROLES[role].name + '</b> · 🪙 ' + U.fmt(s.coins) + '</p><div class="grid">';
    D.OUTFITS.forEach((o) => { const own = s.owned.indexOf(o.id) >= 0, on = s.outfit[role] === o.id; const tc = M.TINTS[role][o.id]; h += '<button class="tile' + (on ? ' on' : '') + '" data-o="' + o.id + '"><div class="ti" style="display:flex;justify-content:center;gap:4px"><span style="width:30px;height:30px;border-radius:50%;background:' + tc[0] + ';border:3px solid #fff;box-shadow:0 0 0 2px #ddd"></span><span style="width:30px;height:30px;border-radius:50%;background:' + tc[1] + ';border:3px solid #fff;box-shadow:0 0 0 2px #ddd"></span></div><div class="tn">' + o.name + '</div><div class="td">' + (o.hat ? '🎩 ' + o.hat : 'mask + gear') + '</div><div class="td">' + (on ? '✅ WEARING' : own ? 'Tap to wear' : '🪙 ' + o.cost) + '</div></button>'; });
    h += '</div><div class="btnrow"><button class="btn blue small" id="oRole">⇄ OTHER ROLE</button><button class="btn alt small" data-close>BACK</button></div>';
    UI.panel(h, (c) => { c.querySelectorAll('[data-o]').forEach((b) => b.onclick = () => { const o = D.OUTFITS.find((q) => q.id === b.dataset.o); if (s.owned.indexOf(o.id) < 0) { if (s.coins < o.cost) { UI.toast('Need 🪙 ' + o.cost + ' coins - pull off more heists!', true); return; } s.coins -= o.cost; s.owned.push(o.id); GH.Snd.fx('cash'); } s.outfit[role] = o.id; G.persist(); G.setRole(role, true); G.refreshLineup(); UI.outfits(); }); c.querySelector('#oRole').onclick = () => { G.cycleRole(); UI.outfits(); }; });
  };
  UI.trophies = function () {
    const s = G.save; let h = '<h2>🏆 TROPHY ROOM</h2><p class="sub">' + s.heists + ' heists · 💰 ' + U.fmt(s.lootTotal) + ' loot recovered</p><div class="grid">';
    D.ORDER.forEach((id) => { const L = D.LEVELS[id]; const got = s.trophies[id]; h += '<div class="tile' + (got ? ' on' : ' lock') + '"><div class="ti">' + (got ? L.target.icon : '❔') + '</div><div class="tn">' + (got ? esc(L.target.name) : '???') + '</div><div class="td">' + L.icon + ' ' + esc(L.name) + '</div><div class="stars">' + stars(s.stars[id]) + '</div></div>'; });
    h += '</div><div class="btnrow"><button class="btn alt small" data-close>BACK</button></div>'; UI.panel(h);
  };
  UI.escapeStart = function () { $('hud').classList.add('hidden'); GH.Snd.fx('win'); UI.banner('🚀 GETAWAY! See you later, Baron Grumble!'); };
  UI.results = function (r) {
    const L = D.LEVELS[r.id], t = r.time; const lab = ['🤫 Stealth', '⚡ Speed', '💰 Loot'];
    let h = '<h2>🎉 HEIST COMPLETE!</h2><p class="sub">' + L.icon + ' ' + esc(L.full) + ' · ' + L.target.icon + ' ' + esc(L.target.name) + ' recovered!</p><div class="bigstars">' + r.stars.map((s, i) => '<span class="' + (s ? '' : 'off') + '" style="animation-delay:' + (0.2 + i * 0.35) + 's">⭐</span>').join('') + '</div>' +
      '<div class="statrow"><span>' + lab[0] + '</span><b>' + (r.stars[0] ? 'Ghost! ✅' : r.caught + ' caught · ' + r.alarms + ' alarms') + '</b></div>' +
      '<div class="statrow"><span>' + lab[1] + '</span><b>' + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') + ' / ' + Math.floor(L.par / 60) + ':' + String(L.par % 60).padStart(2, '0') + (r.stars[1] ? ' ✅' : '') + '</b></div>' +
      '<div class="statrow"><span>' + lab[2] + '</span><b>💰 ' + r.loot + ' / ' + r.total + (r.stars[2] ? ' ✅' : '') + '</b></div>' +
      '<div class="coinsbig">+ 🪙 ' + U.fmt(r.coins) + '</div>' + (r.unlocked ? '<div class="brief" style="text-align:center">🔓 NEW HEIST UNLOCKED: ' + D.LEVELS[r.unlocked].icon + ' <b>' + esc(D.LEVELS[r.unlocked].name) + '</b>!</div>' : '') +
      '<div class="btnrow"><button class="btn pink small" id="rAgain">🔁 AGAIN</button>' + (r.unlocked || (D.ORDER.indexOf(r.id) < D.ORDER.length - 1 && G.save.unlocked.indexOf(D.ORDER[D.ORDER.indexOf(r.id) + 1]) >= 0) ? '<button class="btn primary small" id="rNext">▶ NEXT HEIST</button>' : '') + '<button class="btn blue small" id="rHome">🏠 HIDEOUT</button></div>';
    UI.panel(h, (c) => { r.stars.forEach((s, i) => { if (s) setTimeout(() => GH.Snd.fx('star'), 300 + i * 350); }); const go = (id) => { UI.close(); G.escape = null; if (G.room && G.room.opened && !G.room.isHost) { UI.toast('Waiting for the host to pick the next heist…'); return; } if (id === 'hideout') G.toHideout(); else G.startHeist(id); };
      c.querySelector('#rAgain').onclick = () => go(r.id); const n = c.querySelector('#rNext'); if (n) n.onclick = () => go(D.ORDER[D.ORDER.indexOf(r.id) + 1]); c.querySelector('#rHome').onclick = () => go('hideout'); });
    UI.lastResults = r;
  };

  /* ---------- hack mini-game ---------- */
  const HK = {};
  UI.hackOpen = () => !$('hackUI').classList.contains('hidden');
  UI.hack = function (cb) { HK.cb = cb; HK.a = 0; HK.spd = 2.4; HK.need = G.save.up.hackfast ? 2 : 3; HK.got = 0; HK.miss = 0; newZone(); $('hackUI').classList.remove('hidden'); HK.raf = true; HK.last = performance.now(); requestAnimationFrame(hackLoop); UI.hackDraw(); };
  function newZone() { HK.z0 = Math.random() * Math.PI * 2; HK.zw = Math.max(0.75, 1.25 - HK.got * 0.15); }
  function hackLoop(now) { if (!UI.hackOpen()) return; const dt = Math.min(0.1, (now - HK.last) / 1000); HK.last = now; HK.a = (HK.a + HK.spd * dt) % (Math.PI * 2); HK.flash = Math.max(0, (HK.flash || 0) - dt * 3); UI.hackDraw(); requestAnimationFrame(hackLoop); }
  UI.hackDraw = function () { const cv = $('hackDial'), cx = cv.getContext('2d'), s = cv.width, r = s * 0.4; cx.clearRect(0, 0, s, s); cx.save(); cx.translate(s / 2, s / 2);
    cx.beginPath(); cx.arc(0, 0, r, 0, Math.PI * 2); cx.lineWidth = 22; cx.strokeStyle = HK.flash > 0 ? (HK.ok ? '#4ade80' : '#ff3b3b') : '#1e293b'; cx.stroke();
    cx.beginPath(); cx.arc(0, 0, r, HK.z0 - Math.PI / 2, HK.z0 + HK.zw - Math.PI / 2); cx.strokeStyle = '#4ade80'; cx.lineWidth = 22; cx.stroke();
    for (let i = 0; i < HK.need; i++) { cx.beginPath(); cx.arc((i - (HK.need - 1) / 2) * 30, 0, 10, 0, Math.PI * 2); cx.fillStyle = i < HK.got ? '#4ade80' : '#334155'; cx.fill(); cx.lineWidth = 3; cx.strokeStyle = '#22d3ee'; cx.stroke(); }
    cx.rotate(HK.a); cx.beginPath(); cx.moveTo(0, -r - 18); cx.lineTo(-11, -r + 12); cx.lineTo(11, -r + 12); cx.closePath(); cx.fillStyle = '#ffd23f'; cx.fill(); cx.lineWidth = 3; cx.strokeStyle = '#fff'; cx.stroke(); cx.restore(); $('hackStep').textContent = HK.got + '/' + HK.need; };
  UI.hackTap = function () { if (!UI.hackOpen()) return; const d = ((HK.a - HK.z0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); const hit = d <= HK.zw + 0.08; HK.flash = 1; HK.ok = hit;
    if (hit) { HK.got++; GH.Snd.fx('hacktick'); if (HK.got >= HK.need) { $('hackUI').classList.add('hidden'); const cb = HK.cb; HK.cb = null; cb && cb(true); return; } HK.spd *= 1.18; newZone(); } else { HK.miss++; GH.Snd.fx('hackmiss'); newZone(); if (HK.miss >= 3) { HK.spd = Math.max(1.8, HK.spd * 0.85); } } };
  UI.hackCancel = function () { if (!UI.hackOpen()) return; $('hackUI').classList.add('hidden'); const cb = HK.cb; HK.cb = null; cb && cb(false); };
  UI.hackWin = function () { while (UI.hackOpen()) { HK.a = HK.z0 + HK.zw / 2; UI.hackTap(); } };
  UI.gfxChanged = function () {};
})();
