/* Grok Heist Crew - tiny WebAudio synth */
(function () {
  'use strict';
  const GP = window.GH;
  const S = GP.Snd = { on: true, music: true };
  let ctx = null, master = null, mus = null;
  try { const s = JSON.parse(localStorage.getItem('grokHeist.snd') || 'null'); if (s) { S.on = s.on !== false; S.music = s.music !== false; } } catch (e) {}
  S.save = () => { try { localStorage.setItem('grokHeist.snd', JSON.stringify({ on: S.on, music: S.music })); } catch (e) {} };
  S.unlock = function () { if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; } try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); mus = ctx.createGain(); mus.gain.value = 0.16; mus.connect(master); } catch (e) { ctx = null; } };
  function tone(f, d, type, vol, slide, when, dest) { if (!ctx) return; const t = ctx.currentTime + (when || 0); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + 0.02); }
  function noise(d, vol, f) { if (!ctx) return; const n = ctx.sampleRate * d, b = ctx.createBuffer(1, n, ctx.sampleRate), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = ctx.createBufferSource(); s.buffer = b; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f || 1200; const g = ctx.createGain(); g.gain.value = vol || 0.3; s.connect(fl); fl.connect(g); g.connect(master); s.start(); }
  const FX = {
    swing: () => noise(0.12, 0.25, 2600), hit: () => { tone(220, 0.12, 'square', 0.18, 0.5); noise(0.08, 0.3, 1800); }, hurt: () => tone(330, 0.25, 'sawtooth', 0.2, 0.4),
    coin: () => { tone(988, 0.08, 'square', 0.12); tone(1319, 0.2, 'square', 0.12, 1, 0.08); }, chest: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.22, 1, i * 0.11)),
    item: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.22, 1, i * 0.1)), chime: () => { tone(1047, 0.3, 'sine', 0.2); tone(1568, 0.4, 'sine', 0.15, 1, 0.1); },
    boom: () => { tone(90, 0.5, 'sine', 0.5, 0.3); noise(0.4, 0.4, 500); }, throw: () => tone(500, 0.2, 'sine', 0.2, 2.2), shake: () => tone(180, 0.1, 'triangle', 0.3, 0.8),
    caught: () => [523, 659, 784, 659, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.14, 1, i * 0.12)), broke: () => tone(600, 0.3, 'sawtooth', 0.15, 0.3),
    level: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.12, 1, i * 0.08)), evolve: () => [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.2, 1, i * 0.14)),
    ui: () => tone(660, 0.06, 'sine', 0.15), jump: () => tone(300, 0.15, 'sine', 0.18, 2), roll: () => noise(0.18, 0.18, 900), faint: () => tone(440, 0.6, 'triangle', 0.2, 0.3),
    zap: () => { tone(880, 0.12, 'sawtooth', 0.12, 0.5); tone(1200, 0.12, 'square', 0.08, 0.6, 0.05); }, fire: () => noise(0.35, 0.3, 700), water: () => { noise(0.25, 0.2, 1500); tone(400, 0.2, 'sine', 0.1, 1.6); },
    leaf: () => noise(0.2, 0.2, 3000), rock: () => { tone(120, 0.2, 'square', 0.2, 0.5); noise(0.15, 0.3, 600); }, frost: () => tone(1400, 0.25, 'sine', 0.12, 0.5), gust: () => noise(0.3, 0.2, 2000), gloom: () => tone(200, 0.4, 'sine', 0.2, 0.6), fluff: () => tone(700, 0.15, 'sine', 0.15, 1.5),
    door: () => tone(220, 0.2, 'triangle', 0.18, 1.3), switch: () => { tone(700, 0.08, 'square', 0.15); tone(1050, 0.12, 'square', 0.12, 1, 0.08); }, secret: () => [784, 740, 622, 440, 415, 659, 831, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, 1, i * 0.11)),
    boss: () => { tone(110, 0.6, 'sawtooth', 0.2, 0.8); tone(116, 0.6, 'sawtooth', 0.2, 0.8, 0.05); }, heal: () => [523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.25, 'sine', 0.15, 1, i * 0.09)), cry: () => { tone(500 + Math.random() * 400, 0.18, 'triangle', 0.15, 1.4); tone(700 + Math.random() * 300, 0.15, 'triangle', 0.12, 0.8, 0.12); }
  };
  Object.assign(FX, {
    hackstart: () => [880, 990, 1100].forEach((f, i) => tone(f, 0.06, 'square', 0.1, 1, i * 0.06)), hackok: () => [660, 880, 1320].forEach((f, i) => tone(f, 0.12, 'square', 0.12, 1, i * 0.08)), hacktick: () => tone(1500, 0.03, 'square', 0.06), hackmiss: () => tone(200, 0.2, 'sawtooth', 0.15, 0.6),
    alarm: () => { for (let i = 0; i < 4; i++) { tone(660, 0.25, 'sawtooth', 0.12, 1, i * 0.5); tone(880, 0.25, 'sawtooth', 0.12, 1, i * 0.5 + 0.25); } }, sus: () => tone(500, 0.25, 'triangle', 0.15, 1.6), spotted: () => { tone(880, 0.1, 'square', 0.15); tone(1175, 0.25, 'square', 0.15, 1, 0.1); },
    camera: () => [1200, 900, 1200].forEach((f, i) => tone(f, 0.1, 'square', 0.12, 1, i * 0.12)), laser: () => { tone(1400, 0.4, 'sawtooth', 0.15, 0.3); },
    slip: () => { tone(300, 0.5, 'sine', 0.25, 3); noise(0.2, 0.2, 2000); }, smoke: () => noise(0.6, 0.35, 900), decoy: () => tone(500, 0.15, 'square', 0.12, 1.3), honk: () => { tone(420, 0.12, 'square', 0.1); tone(420, 0.12, 'square', 0.1, 1, 0.16); },
    banana: () => tone(700, 0.15, 'sine', 0.15, 0.6), mirror: () => [1568, 1976].forEach((f, i) => tone(f, 0.25, 'sine', 0.12, 1, i * 0.1)), whoosh: () => noise(0.25, 0.25, 2500), lift: () => tone(150, 0.3, 'square', 0.2, 1.5), thud: () => { tone(90, 0.3, 'sine', 0.4, 0.5); noise(0.15, 0.3, 400); },
    flex: () => tone(200, 0.3, 'sawtooth', 0.15, 1.4), ping: () => { tone(1320, 0.4, 'sine', 0.2, 0.98); tone(1980, 0.5, 'sine', 0.12, 0.98, 0.15); }, swap: () => [523, 784].forEach((f, i) => tone(f, 0.1, 'triangle', 0.15, 1, i * 0.07)),
    grab: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.2, 1, i * 0.08)), cash: () => [988, 1319, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.12, 1, i * 0.07)), engine: () => { tone(80, 1.2, 'sawtooth', 0.2, 2.5); },
    hook: () => { tone(900, 0.15, 'sine', 0.15, 0.5); noise(0.3, 0.15, 3000); }, vent: () => noise(0.4, 0.2, 700), win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.2, 1, i * 0.12)), star: () => tone(1319, 0.3, 'triangle', 0.2, 1.2)
  });
  S.fx = function (k) { if (!S.on || !ctx) return; try { (FX[k] || FX.ui)(); } catch (e) {} };
  // music: soft arpeggios per region
  const SCALES = [[262, 330, 392, 440, 523, 587], [220, 262, 294, 330, 392, 440], [294, 370, 440, 494, 587, 659], [196, 233, 262, 294, 349, 392], [330, 392, 494, 523, 659, 784], [208, 247, 277, 311, 370, 415], [175, 208, 233, 262, 311, 349]];
  let mt = 0, step = 0, cur = 0;
  S.setMusic = (i) => { cur = Math.max(0, i | 0); };
  S.tick = function (dt, alarm) {
    if (!ctx || !S.on || !S.music) return; mt -= dt; if (mt > 0) return; mt = alarm ? 0.2 : 0.3;
    const sc = SCALES[cur % SCALES.length]; const pat = [0, 2, 4, 2, 1, 3, 5, 3]; const f = sc[pat[step % 8]] * (step % 16 < 8 ? 1 : 0.75);
    tone(f, 0.5, 'triangle', 0.25, 1, 0, mus); if (step % 4 === 0) tone(sc[0] / 2, 1.2, 'sine', 0.3, 1, 0, mus); step++;
  };
})();
