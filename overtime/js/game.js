// 퇴근하겠습니다! — 챕터 1 시제품
(() => {
  const $ = id => document.getElementById(id);
  const L = LEVEL.build(), T = LEVEL.T, TS = L.TS;
  const MAP_W = L.W * TS, MAP_H = L.H * TS;
  const STEP = 1 / 60;
  const GRAV = 980, MAXFALL = 420, RUN = 112, JUMP = 335, DASH = 255;
  const SOLID = new Set([T.SOLID, T.CAB, T.GATE, T.CEIL]);
  const ONEWAY = new Set([T.DESK, T.SHELF]);
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const F11 = '12px G11, monospace', F9 = '10px G9, monospace';

  // ===================== 저장 =====================
  const SAVE_KEY = 'overtime_save_v1';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } },
  };
  function loadSave() { try { return JSON.parse(store.get(SAVE_KEY)); } catch (e) { return null; } }
  function writeSave() {
    if (!G) return;
    store.set(SAVE_KEY, JSON.stringify({ eventDone: G.eventDone, cp: G.cp, money: G.money, rescued: [...G.rescued], clock: G.clock, time: G.stats.time, kills: G.stats.kills, maxCombo: G.stats.maxCombo }));
  }

  // ===================== 소리 =====================
  let actx = null, soundOn = store.get('overtime_sound') !== '0';
  function unlockAudio() {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { }
  }
  function tone(type, f0, f1, dur, vol) {
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq) {
    const t = actx.currentTime, buf = actx.createBuffer(1, Math.floor(actx.sampleRate * dur), actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(actx.destination); s.start(t);
  }
  function sfx(n) {
    if (!soundOn || !actx) return;
    try {
      switch (n) {
        case 'jump': tone('square', 300, 600, 0.12, 0.06); break;
        case 'swing': noise(0.08, 0.12, 2500); break;
        case 'hit': tone('square', 220, 90, 0.08, 0.1); noise(0.06, 0.15, 1800); break;
        case 'hit3': tone('square', 160, 50, 0.18, 0.14); noise(0.15, 0.25, 900); break;
        case 'stamp': tone('triangle', 120, 40, 0.2, 0.25); noise(0.12, 0.2, 600); break;
        case 'dash': tone('sawtooth', 500, 200, 0.15, 0.05); break;
        case 'coin': tone('square', 900, 1400, 0.08, 0.05); break;
        case 'hurt': tone('square', 400, 120, 0.25, 0.1); break;
        case 'die': tone('square', 300, 60, 0.35, 0.1); noise(0.2, 0.15, 1200); break;
        case 'paper': noise(0.1, 0.08, 4000); break;
        case 'staple': tone('square', 1200, 700, 0.05, 0.04); break;
        case 'cooler': tone('sine', 500, 900, 0.3, 0.1); break;
        case 'boom': noise(0.6, 0.35, 400); tone('sine', 90, 30, 0.6, 0.2); break;
        case 'blip': tone('square', 700, 700, 0.025, 0.02); break;
        case 'ult': tone('sawtooth', 200, 900, 0.5, 0.08); break;
        case 'mail': tone('triangle', 800, 1600, 0.2, 0.06); break;
      }
    } catch (e) { }
  }

  // ===================== 화면 크기 =====================
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const RES = 2;
  let VW = 320, VH = 180, SCALE = 4, insetL = 0, insetR = 0;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(innerWidth * dpr), ph = Math.round(innerHeight * dpr);
    // SCALE = 월드 1단위당 기기 픽셀(짝수). 캔버스는 월드의 RES배 해상도 → 고해상도 캐릭터를 원래 픽셀대로 그림
    SCALE = Math.max(2, 2 * Math.round(ph / 384));
    VW = Math.ceil(pw / SCALE); VH = Math.ceil(ph / SCALE);
    if (VW / VH < 1.3) { SCALE = Math.max(2, 2 * Math.round(pw / 600)); VW = Math.ceil(pw / SCALE); VH = Math.ceil(ph / SCALE); }
    canvas.width = VW * RES; canvas.height = VH * RES;
    canvas.style.width = (VW * SCALE / dpr) + 'px'; canvas.style.height = (VH * SCALE / dpr) + 'px';
    const cs = getComputedStyle($('probe'));
    insetL = Math.ceil(parseFloat(cs.paddingLeft) * dpr / SCALE) || 0;
    insetR = Math.ceil(parseFloat(cs.paddingRight) * dpr / SCALE) || 0;
  }
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();

  // ===================== 입력 =====================
  const input = { held: {}, pressed: {} };
  const NOINPUT = { held: {}, pressed: {} };
  function press(a) { if (!input.held[a]) input.pressed[a] = true; input.held[a] = true; }
  function release(a) { input.held[a] = false; }
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyJ: 'atk', KeyZ: 'atk', KeyK: 'dash', KeyX: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash',
    KeyU: 's1', KeyC: 's1', KeyI: 's2', KeyV: 's2', KeyO: 'ult', KeyB: 'ult', Enter: 'confirm',
  };
  addEventListener('keydown', e => {
    unlockAudio();
    if (e.code === 'Escape' || e.code === 'KeyP') { if (mode === 'play') pauseGame(); else if (mode === 'pause') resumeGame(); return; }
    const a = KEYMAP[e.code];
    if (a) { e.preventDefault(); if (!e.repeat) press(a); }
  });
  addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) release(a); });
  addEventListener('blur', () => { for (const k in input.held) input.held[k] = false; if (mode === 'play') pauseGame(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') pauseGame(); });

  // 터치: 손가락마다 아래에 있는 버튼을 누른 것으로 처리 (손가락을 미끄러뜨려도 됨)
  const pointers = new Map();
  const padButtons = [...document.querySelectorAll('#pad button')];
  function refreshTouch() {
    const now = new Set();
    for (const [, pt] of pointers) {
      const el = document.elementFromPoint(pt.x, pt.y);
      const b = el && el.closest && el.closest('#pad button');
      if (b) now.add(b.dataset.a);
    }
    for (const b of padButtons) {
      const a = b.dataset.a, on = now.has(a);
      if (on && !input.held[a]) press(a);
      if (!on && input.held[a] && b.classList.contains('on')) release(a);
      b.classList.toggle('on', on);
    }
  }
  $('pad').addEventListener('pointerdown', e => { if (e.target.closest('#pad button')) { e.preventDefault(); unlockAudio(); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); refreshTouch(); } });
  addEventListener('pointermove', e => { if (pointers.has(e.pointerId)) { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); refreshTouch(); } });
  const endPtr = e => { if (pointers.delete(e.pointerId)) refreshTouch(); };
  addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
  canvas.addEventListener('pointerdown', e => { unlockAudio(); press('confirm'); setTimeout(() => release('confirm'), 50); e.preventDefault(); });

  // ===================== 유틸 =====================
  const approach = (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t);
  const rand = (a, b) => a + Math.random() * (b - a);
  const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const box = e => ({ x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y - e.h, y1: e.y });
  const won = n => '₩ ' + n.toLocaleString('ko-KR');
  function clockText(m) {
    m = Math.floor(m);
    const h = Math.floor(m / 60) % 24, mm = m % 60;
    return `${h < 12 ? 'AM' : 'PM'} ${String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // ===================== 세계 =====================
  let G = null, mode = 'title';

  function tileAt(tx, ty) {
    if (tx < 0 || tx >= L.W) return T.SOLID;
    if (ty < 0) return T.CEIL;
    if (ty >= L.H) return T.EMPTY;
    return G.tiles[ty * L.W + tx];
  }
  function physics(e, dt) {
    // 가로
    e.x += e.vx * dt;
    e.hitWall = 0;
    let top = e.y - e.h + 0.5, bot = e.y - 0.5;
    const ty0 = Math.floor(top / TS), ty1 = Math.floor(bot / TS);
    if (e.vx > 0) {
      const tx = Math.floor((e.x + e.w / 2) / TS);
      for (let ty = ty0; ty <= ty1; ty++) if (SOLID.has(tileAt(tx, ty))) { e.x = tx * TS - e.w / 2 - 0.01; e.vx = 0; e.hitWall = 1; break; }
    } else if (e.vx < 0) {
      const tx = Math.floor((e.x - e.w / 2) / TS);
      for (let ty = ty0; ty <= ty1; ty++) if (SOLID.has(tileAt(tx, ty))) { e.x = (tx + 1) * TS + e.w / 2 + 0.01; e.vx = 0; e.hitWall = -1; break; }
    }
    // 세로
    const prev = e.y;
    e.vy = Math.min(e.vy + (e.grav === undefined ? GRAV : e.grav) * dt, MAXFALL);
    e.y += e.vy * dt;
    e.onGround = false;
    const tx0 = Math.floor((e.x - e.w / 2 + 0.5) / TS), tx1 = Math.floor((e.x + e.w / 2 - 0.5) / TS);
    if (e.vy >= 0) {
      const ty = Math.floor(e.y / TS);
      for (let tx = tx0; tx <= tx1; tx++) {
        const t = tileAt(tx, ty);
        if (SOLID.has(t) || (ONEWAY.has(t) && prev <= ty * TS + 0.5 && !(e.dropping > 0))) { e.y = ty * TS; e.vy = 0; e.onGround = true; break; }
      }
    } else {
      const ty = Math.floor((e.y - e.h) / TS);
      for (let tx = tx0; tx <= tx1; tx++) if (SOLID.has(tileAt(tx, ty))) { e.y = (ty + 1) * TS + e.h; e.vy = 0; break; }
    }
  }
  function groundTile(e) {
    const ty = Math.floor((e.y + 1) / TS);
    return [tileAt(Math.floor((e.x - e.w / 2 + 1) / TS), ty), tileAt(Math.floor((e.x + e.w / 2 - 1) / TS), ty)];
  }

  function createWorld(save) {
    G = {
      tiles: L.tiles.slice(), ents: [], shots: [], parts: [], pops: [],
      cam: { x: 0, y: MAP_H - 200 }, shake: 0, hitstop: 0, flash: 0, fade: 1, fadeTo: 0,
      night: !!(save && save.eventDone), eventDone: !!(save && save.eventDone), flicker: 0,
      cut: null, hint: null, banner: null,
      clock: save && save.clock ? save.clock : 9 * 60, clockRun: !!(save && save.eventDone),
      cp: save ? save.cp : 0, money: save ? save.money : 0, rescued: new Set(save ? save.rescued : []),
      stats: { time: save ? save.time || 0 : 0, kills: save ? save.kills || 0 : 0, combo: 0, comboT: 0, maxCombo: save ? save.maxCombo || 0 : 0 },
      time: 0, atkId: 0, clearing: false, seen: {},
    };
    if (G.eventDone) openGate();
    G.player = makePlayer(L.startX, 192);
    spawnAll();
  }
  function spawnAll() {
    G.ents = G.ents.filter(e => e.type === 'npc' && e.keep);
    for (const s of L.spawns) {
      if (s.type === 'npc') { if (!G.eventDone && !G.ents.some(e => e.id === s.id)) G.ents.push(makeNpc(s.who, s.x, s.y, s.face, s.id)); continue; }
      if (s.type === 'zombie' && G.rescued.has(s.id)) continue;
      const e = makeEnt(s);
      if (e) G.ents.push(e);
    }
  }
  function openGate() { for (let y = 2; y <= 11; y++) G.tiles[y * L.W + L.gateX] = T.EMPTY; }

  // ===================== 플레이어 =====================
  function makePlayer(x, y) {
    return { x, y, w: 14, h: 52, vx: 0, vy: 0, face: 1, state: 'normal', t: 0, anim: 'idle', animT: 0,
      hp: 100, maxHp: 100, mental: 100, gauge: 0, inv: 0, coyote: 0, jbuf: 0, dashCd: 0, combo: 0, queued: false, lastAtk: -9,
      dropping: 0, mash: 0, grabbedBy: null, safe: { x, y }, onGround: true, fired: 0, ultHit: new Set() };
  }
  const ATK = [null,
    { dur: 0.26, a0: 0.06, a1: 0.15, dmg: 10, bx: 2, by: -46, bw: 34, bh: 30, kb: 110, anim: 'atk1', lunge: 60 },
    { dur: 0.26, a0: 0.06, a1: 0.15, dmg: 12, bx: -2, by: -66, bw: 32, bh: 56, kb: 130, anim: 'atk2', lunge: 50 },
    { dur: 0.42, a0: 0.15, a1: 0.27, dmg: 22, bx: -2, by: -60, bw: 40, bh: 62, kb: 240, anim: 'atk3', lunge: 110, big: true }];

  function beginAttack(n) {
    const p = G.player;
    p.state = 'attack'; p.combo = n; p.t = 0; p.queued = false; p.atkId = ++G.atkId; p.shouted = false;
    sfx('swing');
  }
  function updatePlayer(dt, inp) {
    const p = G.player;
    p.inv = Math.max(0, p.inv - dt); p.dashCd -= dt; p.dropping = Math.max(0, p.dropping - dt);
    p.mental = Math.min(100, p.mental + 6 * dt);
    p.t += dt; p.animT += dt;
    const dir = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0);
    let anim = p.anim;
    p.grav = GRAV;
    if (p.onGround) p.coyote = 0.09; else p.coyote -= dt;
    p.jbuf -= dt;

    switch (p.state) {
      case 'normal': {
        p.vx = approach(p.vx, dir * RUN, (p.onGround ? 1500 : 950) * dt);
        if (dir) p.face = dir;
        if (inp.pressed.jump) p.jbuf = 0.12;
        if (p.jbuf > 0 && p.coyote > 0) {
          const gt = groundTile(p);
          if (inp.held.down && p.onGround && gt.every(t => ONEWAY.has(t) || t === T.EMPTY)) { p.dropping = 0.25; p.y += 2; }
          else { p.vy = -JUMP; sfx('jump'); dust(p.x, p.y, 4); }
          p.jbuf = 0; p.coyote = 0;
        }
        if (!inp.held.jump && p.vy < -150) p.vy = -150;
        if (inp.pressed.atk) {
          if (!p.onGround && inp.held.down) { p.state = 'stamp'; p.t = 0; p.atkId = ++G.atkId; sfx('swing'); }
          else beginAttack(G.time - p.lastAtk < 0.22 && p.combo < 3 ? p.combo + 1 : 1);
        } else if (inp.pressed.dash && p.dashCd <= 0) startDash();
        else if (inp.pressed.s1) skillStapler();
        else if (inp.pressed.s2) skillMail();
        else if (inp.pressed.ult) skillUlt();
        anim = !p.onGround ? (p.vy < 0 ? 'jump' : 'fall') : Math.abs(p.vx) > 12 ? 'run' : 'idle';
        break;
      }
      case 'attack': {
        const A = ATK[p.combo];
        const active = p.t >= A.a0 && p.t <= A.a1;
        if (p.onGround) p.vx = approach(p.vx, active ? p.face * A.lunge : 0, 1000 * dt);
        else p.vx = approach(p.vx, dir * RUN * 0.6, 500 * dt);
        if (inp.pressed.atk && p.t > A.a0 * 0.5) p.queued = true;
        if (active) meleeHit(A.bx, A.by, A.bw, A.bh, A.dmg, A.kb, A.big);
        anim = A.anim;
        if (inp.pressed.dash && p.dashCd <= 0 && p.t > A.a1) { startDash(); break; }
        if (inp.pressed.jump && p.onGround && p.t > A.a1) { p.state = 'normal'; p.vy = -JUMP; sfx('jump'); break; }
        if (p.t >= A.dur) {
          if (p.queued && p.combo < 3) { if (dir) p.face = dir; beginAttack(p.combo + 1); }
          else { p.state = 'normal'; p.lastAtk = G.time; }
        }
        break;
      }
      case 'stamp': {
        p.vy = 400; p.vx = approach(p.vx, 0, 400 * dt);
        anim = 'stamp';
        if (meleeHit(-14, -8, 28, 18, 18, 60, false, true)) { p.state = 'normal'; p.vy = -270; pop(p.x, p.y - 58, '반려!', '#ff6464', true); G.hitstop = 0.06; break; }
        if (p.onGround) {
          p.state = 'landing'; p.t = 0; G.shake = Math.max(G.shake, 4); sfx('stamp');
          meleeHit(-22, -10, 44, 12, 8, 80, false, true);
          dust(p.x - 8, p.y, 5); dust(p.x + 8, p.y, 5);
        }
        break;
      }
      case 'landing': p.vx = 0; anim = 'stamp'; if (p.t > 0.12) p.state = 'normal'; break;
      case 'dash': {
        p.vx = p.face * DASH; p.vy = 0; p.grav = 0; anim = 'dash';
        if (Math.random() < 0.5) G.parts.push({ x: p.x - p.face * 6, y: p.y - 2, vx: -p.face * 20, vy: -10, life: 0.25, max: 0.25, c: '#c8c8d8', s: 1, g: 0 });
        if (p.t >= 0.24) { p.state = 'normal'; p.dashCd = 0.42; p.vx = p.face * RUN; }
        break;
      }
      case 'hurt': p.vx = approach(p.vx, 0, 300 * dt); anim = 'hurt'; if (p.t > 0.35) p.state = 'normal'; break;
      case 'grabbed': {
        p.vx = 0; anim = 'grabbed';
        if (inp.pressed.atk || inp.pressed.jump || inp.pressed.dash || inp.pressed.left || inp.pressed.right) {
          p.mash++; G.shake = Math.max(G.shake, 1.5); sfx('blip');
        }
        break;
      }
      case 'shoot': {
        p.vx = approach(p.vx, 0, 900 * dt); anim = 'shoot';
        while (p.fired < 3 && p.t >= p.fired * 0.06) {
          G.shots.push({ k: 'staple', x: p.x + p.face * 20, y: p.y - 34 + (p.fired - 1) * 3, vx: p.face * 340, vy: 0, g: 0, dmg: 7, friendly: true, life: 0.8, w: 6, h: 3 });
          p.fired++; sfx('staple');
        }
        if (p.t > 0.24) p.state = 'normal';
        break;
      }
      case 'cast': {
        p.vx = approach(p.vx, 0, 900 * dt); anim = 'cast';
        if (!p.fired && p.t > 0.3) { p.fired = 1; mailStorm(); }
        if (p.t > 0.6) p.state = 'normal';
        break;
      }
      case 'ult': {
        p.vx = p.face * 330; anim = 'ult';
        for (const e of G.ents) if (e.enemy && !e.dead && !p.ultHit.has(e) && overlap(box(e), { x0: p.x - 18, x1: p.x + 18, y0: p.y - 56, y1: p.y + 2 })) {
          p.ultHit.add(e); hitEnemy(e, 60, p.face, 260, true);
        }
        if (Math.random() < 0.8) G.parts.push({ x: p.x - p.face * 10, y: p.y - rand(4, 54), vx: -p.face * 200, vy: 0, life: 0.2, max: 0.2, c: '#ffd34d', s: 1, g: 0 });
        if (p.t > 0.95 || p.hitWall) { p.state = 'normal'; p.inv = 0.4; }
        break;
      }
      case 'dead': p.vx = approach(p.vx, 0, 400 * dt); anim = 'dead'; if (p.t > 1.4 && mode === 'play') showDead(); break;
    }
    if (anim !== p.anim) { p.anim = anim; p.animT = 0; }
    physics(p, dt);

    if (p.onGround) {
      const gt = groundTile(p);
      if (gt[0] !== T.EMPTY && gt[1] !== T.EMPTY) p.safe = { x: p.x, y: p.y };
    }
    if (p.y > MAP_H + 30 && p.state !== 'dead') { // 공사중 구멍에 빠짐
      p.x = p.safe.x - p.face * 4; p.y = p.safe.y; p.vx = 0; p.vy = 0;
      if (p.state === 'dash' || p.state === 'ult') p.state = 'normal';
      p.inv = 0; hurtPlayer(15, p.x + p.face * 10, true);
      pop(p.x, p.y - 62, '공사중이라니까!', '#ffd34d');
    }
  }
  function startDash() {
    const p = G.player;
    p.state = 'dash'; p.t = 0; sfx('dash');
    if (!G.seen.dash) G.seen.dash = true;
  }
  function skillStapler() {
    const p = G.player;
    if (p.mental < 12) return pop(p.x, p.y - 62, '멘탈 부족…', '#a8a3b8');
    p.mental -= 12; p.state = 'shoot'; p.t = 0; p.fired = 0;
  }
  function skillMail() {
    const p = G.player;
    if (p.mental < 45) return pop(p.x, p.y - 62, '멘탈 부족…', '#a8a3b8');
    p.mental -= 45; p.state = 'cast'; p.t = 0; p.fired = 0;
    pop(p.x, p.y - 66, '전체 회신!!', '#7fb4ff', true);
  }
  function skillUlt() {
    const p = G.player;
    if (p.gauge < 100) return;
    p.gauge = 0; p.state = 'ult'; p.t = 0; p.ultHit = new Set();
    G.banner = { text: '퇴근하겠습니다!!', t: 0 }; G.flash = 0.3; G.shake = 5; sfx('ult');
  }
  function mailStorm() {
    sfx('mail');
    const x0 = G.cam.x, x1 = G.cam.x + VW;
    for (let i = 0; i < 16; i++) G.parts.push({ k: 'mail', x: rand(x0, x1), y: G.cam.y - rand(0, 60), vx: rand(-20, 20), vy: rand(160, 240), life: 1.2, max: 1.2, g: 0 });
    for (const e of G.ents) if (e.enemy && !e.dead && e.x > x0 - 10 && e.x < x1 + 10) setTimeout(() => { if (G && !e.dead) hitEnemy(e, 25, e.x < G.player.x ? -1 : 1, 60); }, 250);
  }

  // 공격 판정. 맞힌 적이 있으면 true
  function meleeHit(bx, by, bw, bh, dmg, kb, big, centered) {
    const p = G.player;
    const x0 = centered ? p.x + bx : (p.face > 0 ? p.x + bx : p.x - bx - bw);
    const hb = { x0, x1: x0 + bw, y0: p.y + by, y1: p.y + by + bh };
    let any = false;
    for (const e of G.ents) {
      if (!e.enemy || e.dead || e.lastAtk === p.atkId) continue;
      if (!overlap(box(e), hb)) continue;
      e.lastAtk = p.atkId;
      hitEnemy(e, dmg, centered ? (e.x < p.x ? -1 : 1) : p.face, kb, big);
      any = true;
    }
    for (const s of G.shots) if (!s.friendly && !s.dead && overlap({ x0: s.x - s.w / 2, x1: s.x + s.w / 2, y0: s.y - s.h / 2, y1: s.y + s.h / 2 }, hb)) {
      s.dead = true; pop(s.x, s.y - 8, '반려!', '#ff6464'); sfx('paper');
      for (let i = 0; i < 4; i++) G.parts.push({ x: s.x, y: s.y, vx: rand(-60, 60), vy: rand(-80, 0), life: 0.4, max: 0.4, c: '#f7f7f2', s: 2, g: 300 });
    }
    if (any && big && !p.shouted) { p.shouted = true; pop(p.x + p.face * 4, p.y - 66, '넵!', '#ffffff', true); }
    return any;
  }

  function hitEnemy(e, dmg, dir, kb, big) {
    if (e.dead) return;
    e.hp -= dmg; e.flash = 0.12;
    const m = e.kbMul === undefined ? 1 : e.kbMul;
    e.vx = dir * kb * m;
    if (!e.flying && m > 0) e.vy = Math.min(e.vy, -90 * m);
    if (e.onHit) e.onHit(dmg);
    const p = G.player;
    p.gauge = Math.min(100, p.gauge + (big ? 7 : 4));
    G.stats.combo++; G.stats.comboT = 1.6; G.stats.maxCombo = Math.max(G.stats.maxCombo, G.stats.combo);
    G.hitstop = big ? 0.09 : 0.045;
    G.shake = Math.max(G.shake, big ? 4 : 1.5);
    sfx(big ? 'hit3' : 'hit');
    pop(e.x + rand(-4, 4), e.y - e.h - 4, String(dmg), big ? '#ffd34d' : '#ffffff');
    for (let i = 0; i < (big ? 8 : 4); i++) G.parts.push({ x: e.x, y: e.y - e.h / 2, vx: dir * rand(30, 140), vy: rand(-120, 20), life: 0.3, max: 0.3, c: Math.random() < 0.5 ? '#ffe066' : '#ffffff', s: 1, g: 300 });
    if (e.hp <= 0) { e.hp = 0; e.die(); }
  }
  function hurtPlayer(dmg, fromX, silent) {
    const p = G.player;
    if (p.state === 'dead') return;
    if (!silent && (p.inv > 0 || p.state === 'dash' || p.state === 'ult' || p.state === 'grabbed')) return;
    p.hp = Math.max(0, p.hp - dmg);
    G.stats.combo = 0;
    pop(p.x, p.y - 62, `-${dmg}`, '#ff6464');
    G.shake = Math.max(G.shake, 4); G.flash = Math.max(G.flash, 0.15); sfx('hurt');
    if (p.hp <= 0) return killPlayer();
    p.inv = 1.0; p.state = 'hurt'; p.t = 0; p.vx = (p.x < fromX ? -1 : 1) * 140; p.vy = -170;
  }
  function killPlayer() {
    const p = G.player;
    if (p.grabbedBy) { p.grabbedBy.state = 'recover'; p.grabbedBy.t = 0; p.grabbedBy = null; }
    p.hp = 0; p.state = 'dead'; p.t = 0; p.vy = -200; p.vx = -p.face * 60; sfx('die');
  }

  // ===================== 등장인물·적 =====================
  function makeNpc(who, x, y, face, id) {
    return { type: 'npc', who, id, x, y, w: 14, h: 46, vx: 0, vy: 0, face: face || 1, anim: 'idle', animT: 0, keep: false, alpha: 1,
      update(dt) { this.animT += dt; this.x += this.vx * dt; } }; // 컷신 인물은 장애물을 무시하고 걸어감
  }
  function makeEnt(s) {
    const x = s.x + (s.xOff || 0), y = s.y;
    switch (s.type) {
      case 'slime': return makeSlime(x, y, false);
      case 'bat': return makeBat(x, y);
      case 'zombie': return makeZombie(x, y, s.id, s.look);
      case 'copier': return makeCopier(x, y, s.id, s.passive);
      case 'money': return makePickup('money', x, y - 4, 3000);
      case 'coin': return makePickup('coin', x, y - 4, 1000);
      case 'coffee': return makePickup('coffee', x, y - 4, 0);
      case 'cooler': return makeCooler(x, y, s.cp);
    }
  }
  function enemyBase(o) {
    return Object.assign({ enemy: true, vx: 0, vy: 0, face: -1, flash: 0, t: 0, animT: 0, dead: false, lastAtk: -1, onGround: false }, o);
  }
  function asleep(e) { return !G.night && e.x > L.gateX * TS; }
  function dropMoney(x, y, n, value) {
    for (let i = 0; i < n; i++) { const m = makePickup(value >= 3000 ? 'money' : 'coin', x, y, value); m.vx = rand(-70, 70); m.vy = rand(-200, -120); G.ents.push(m); }
  }
  function enemyDied(e, money) {
    e.dead = true; G.stats.kills++; sfx('die');
    for (let i = 0; i < 10; i++) G.parts.push({ x: e.x, y: e.y - e.h / 2, vx: rand(-90, 90), vy: rand(-150, -20), life: 0.6, max: 0.6, c: ['#f7f7f2', '#c8d0dc', '#ffe066'][i % 3], s: 2, g: 400 });
    if (money) dropMoney(e.x, e.y - e.h, money[0], money[1]);
  }

  function makeSlime(x, y, small) {
    return enemyBase({
      type: 'slime', small, x, y, w: small ? 10 : 16, h: small ? 7 : 11, hp: small ? 10 : 30, hopT: rand(0.3, 1), contact: small ? 6 : 10,
      update(dt) {
        const p = G.player, dx = p.x - this.x;
        this.hopT -= dt; this.animT += dt;
        if (this.onGround) {
          this.vx = approach(this.vx, 0, 500 * dt);
          if (this.hopT <= 0 && Math.abs(dx) < 220 && Math.abs(p.y - this.y) < 80) {
            this.face = Math.sign(dx) || 1;
            this.vy = small ? -150 : -175; this.vx = this.face * (small ? 75 : 58); this.hopT = rand(0.9, 1.4);
          }
        }
        physics(this, dt);
        if (this.y > MAP_H + 40) this.dead = true;
      },
      frame() { return this.onGround && this.hopT < 0.25 ? 1 : 0; },
      die() {
        enemyDied(this, small ? [1, 500] : [1, 3000]);
        if (!small) for (const d of [-1, 1]) { const s = makeSlime(this.x + d * 4, this.y, true); s.vx = d * 90; s.vy = -160; s.hopT = 0.8; G.ents.push(s); }
      },
    });
  }
  function makeBat(x, y) {
    return enemyBase({
      type: 'bat', flying: true, x, y, w: 20, h: 14, hp: 20, contact: 8, home: { x, y }, state: 'hover', cd: rand(0.5, 1.5), kbMul: 0.6,
      update(dt) {
        const p = G.player; this.t += dt; this.animT += dt; this.cd -= dt;
        const dx = p.x - this.x;
        this.face = Math.sign(dx) || 1;
        if (this.state === 'hover') {
          this.x = approach(this.x, this.home.x + Math.sin(this.t * 1.3) * 14, 60 * dt);
          this.y = approach(this.y, this.home.y + Math.sin(this.t * 2.6) * 4, 60 * dt);
          if (this.cd <= 0 && Math.abs(dx) < 120 && p.y - 30 > this.y && p.state !== 'dead') {
            this.state = 'swoop'; this.t2 = 0;
            const tx = p.x, ty = p.y - 30, d = Math.hypot(tx - this.x, ty - this.y) || 1;
            this.svx = (tx - this.x) / d * 175; this.svy = (ty - this.y) / d * 175;
          }
        } else if (this.state === 'swoop') {
          this.t2 += dt;
          this.x += (this.svx + this.vx) * dt; this.y += this.svy * dt;
          this.vx = approach(this.vx, 0, 400 * dt);
          if (this.t2 > 0.9 || this.y > 188) { this.state = 'back'; }
        } else {
          const ddx = this.home.x - this.x, ddy = this.home.y - this.y, d = Math.hypot(ddx, ddy);
          this.x += this.vx * dt; this.vx = approach(this.vx, 0, 300 * dt);
          if (d < 3) { this.state = 'hover'; this.cd = rand(1.2, 2); }
          else { this.x += ddx / d * 90 * dt; this.y += ddy / d * 90 * dt; }
        }
      },
      onHit() { this.state = 'back'; },
      frame() { return Math.floor(this.animT * (this.state === 'swoop' ? 14 : 8)) % 2; },
      die() { enemyDied(this, [1, 3000]); },
    });
  }
  const ZLINES = ['이것 좀 봐줄래?', '잠깐 시간 돼?', '5분이면 돼~', '이것만 하고 가'];
  const RESCUED_LINES = ['…어? 내가 왜 여기 있지?', '퇴근… 퇴근해야지!', '고마워요, 신입 씨!', '나 오늘 몇 시간째야…?'];
  function makeZombie(x, y, id, look) {
    return enemyBase({
      type: 'zombie', id, look: look || 'zombie', x, y, w: 16, h: 50, hp: 60, state: 'walk', grabCd: 0, kbMul: 0.5, contact: 0,
      update(dt) {
        const p = G.player, dx = p.x - this.x, dy = p.y - this.y;
        this.t += dt; this.animT += dt; this.grabCd -= dt;
        switch (this.state) {
          case 'walk':
            if (Math.abs(dx) < 200 && Math.abs(dy) < 50 && p.state !== 'dead') { this.face = Math.sign(dx) || 1; this.vx = approach(this.vx, this.face * 26, 200 * dt); }
            else this.vx = approach(this.vx, 0, 200 * dt);
            if (Math.abs(dx) < 32 && Math.abs(dy) < 20 && this.grabCd <= 0 && p.state !== 'dead' && p.state !== 'grabbed') {
              this.state = 'wind'; this.t = 0; this.vx = 0; this.line = ZLINES[Math.floor(Math.random() * ZLINES.length)];
            }
            break;
          case 'wind': this.vx = approach(this.vx, 0, 400 * dt); if (this.t > 0.55) { this.state = 'lunge'; this.t = 0; this.vx = this.face * 150; } break;
          case 'lunge': {
            this.vx = approach(this.vx, 0, 300 * dt);
            if (p.state !== 'dash' && p.state !== 'ult' && p.state !== 'dead' && p.inv <= 0 && p.state !== 'grabbed' && overlap(box(this), box(p))) {
              this.state = 'grab'; this.t = 0; p.state = 'grabbed'; p.t = 0; p.mash = 0; p.grabbedBy = this; p.face = -this.face;
              pop(p.x, p.y - 70, '연타로 탈출!', '#ffd34d', true);
            } else if (this.t > 0.3) { this.state = 'recover'; this.t = 0; this.grabCd = 1.2; }
            break;
          }
          case 'grab':
            this.vx = 0; this.x = approach(this.x, p.x - this.face * 18, 200 * dt);
            p.hp -= 7 * dt;
            if (p.hp <= 0) { killPlayer(); this.state = 'recover'; this.t = 0; break; }
            if (p.mash >= 6) {
              p.state = 'normal'; p.grabbedBy = null; p.inv = 0.8; p.vx = this.face * 120;
              this.state = 'stun'; this.t = 0; this.vx = -this.face * 120; this.grabCd = 2;
              pop(p.x, p.y - 66, '칼같이 거절!', '#7fb4ff', true); G.shake = 3; sfx('hit');
            }
            break;
          case 'stun': this.vx = approach(this.vx, 0, 300 * dt); if (this.t > 1.0) { this.state = 'walk'; } break;
          case 'recover': case 'stagger': this.vx = approach(this.vx, 0, 300 * dt); if (this.t > (this.state === 'stagger' ? 0.3 : 0.7)) { this.state = 'walk'; this.grabCd = Math.max(this.grabCd, 0.6); } break;
          case 'rescued':
            this.vx = -28; this.face = -1; this.alpha = Math.max(0, 1 - Math.max(0, this.t - 2) / 1.2);
            if (this.t > 3.2) this.gone = true;
            break;
        }
        physics(this, dt);
        if (this.y > MAP_H + 40) this.dead = true;
      },
      onHit() {
        if (this.state === 'wind' || this.state === 'lunge') { this.state = 'stagger'; this.t = 0; }
        if (this.state === 'grab') { const p = G.player; p.state = 'normal'; p.grabbedBy = null; p.inv = 0.6; this.state = 'stagger'; this.t = 0; }
      },
      anim() {
        if (this.state === 'rescued') return { ch: this.look === 'zombie2' ? 'worker2' : 'worker', a: 'run' };
        const a = { walk: Math.abs(this.vx) > 3 ? 'zwalk' : 'zwalk', wind: 'zwind', lunge: 'zgrab', grab: 'zgrab', stun: 'zdaze', recover: 'zwalk', stagger: 'zdaze' }[this.state] || 'zwalk';
        return { ch: this.look, a };
      },
      die() {
        // 쓰러뜨리면 정신을 차리고 퇴근함
        this.enemy = false; this.state = 'rescued'; this.t = 0; this.hp = 0;
        G.stats.kills++; G.rescued.add(this.id); sfx('cooler');
        const p = G.player;
        if (p.grabbedBy === this) { p.state = 'normal'; p.grabbedBy = null; }
        G.pops.push({ x: this.x, y: this.y - 62, text: RESCUED_LINES[G.rescued.size % RESCUED_LINES.length], c: '#ffffff', t: 0, life: 2.8, bubble: true, follow: this });
        const c = makePickup('coffee', this.x, this.y - 20, 0); c.vy = -180; c.vx = 30; G.ents.push(c);
        dropMoney(this.x, this.y - 20, 2, 3000);
      },
    });
  }
  function makeCopier(x, y, id, passive) {
    return enemyBase({
      type: 'copier', id, passive, x, y, w: 30, h: 34, hp: 50, kbMul: 0, fireT: 1.5, contact: 0,
      update(dt) {
        this.animT += dt;
        const p = G.player, dx = p.x - this.x;
        if (!this.passive) {
          this.face = Math.sign(dx) || 1;
          if (Math.abs(dx) < 230 && Math.abs(p.y - this.y) < 70 && p.state !== 'dead') this.fireT -= dt;
          if (this.fireT <= 0) {
            this.fireT = 2.2; sfx('paper');
            G.shots.push({ k: 'paper', x: this.x + this.face * 10, y: this.y - 10, vx: this.face * 150, vy: -35, g: 70, dmg: 10, life: 2.5, w: 8, h: 6 });
          }
        }
        this.vx = 0; physics(this, dt);
      },
      frame() { return !this.passive && this.fireT < 0.35 ? 1 : 0; },
      shakeX() { return !this.passive && this.fireT < 0.35 ? (Math.random() < 0.5 ? -1 : 1) : 0; },
      die() { enemyDied(this, [3, 3000]); G.shake = Math.max(G.shake, 4); for (let i = 0; i < 14; i++) G.parts.push({ x: this.x, y: this.y - 12, vx: rand(-120, 120), vy: rand(-220, -40), life: 0.9, max: 0.9, c: '#f7f7f2', s: 3, g: 350 }); },
    });
  }
  function makePickup(kind, x, y, value) {
    return { type: 'pickup', kind, value, x, y, w: 8, h: 7, vx: 0, vy: 0, t: 0, magnet: false,
      update(dt) {
        this.t += dt;
        const p = G.player, d = Math.hypot(p.x - this.x, p.y - 24 - this.y);
        if (d < 40 && this.t > 0.3 && p.state !== 'dead') this.magnet = true;
        if (this.magnet) { this.x += (p.x - this.x) * Math.min(1, dt * 10); this.y += (p.y - 24 - this.y) * Math.min(1, dt * 10); }
        else { this.vx = approach(this.vx, 0, (this.onGround ? 400 : 30) * dt); physics(this, dt); if (this.y > MAP_H + 40) this.gone = true; }
        if (d < 16 && this.t > 0.2) {
          this.gone = true;
          if (this.kind === 'coffee') { p.hp = Math.min(p.maxHp, p.hp + 30); p.mental = Math.min(100, p.mental + 30); pop(p.x, p.y - 64, '커피 충전!', '#5fe07a'); sfx('cooler'); }
          else { G.money += this.value; sfx('coin'); }
        }
      } };
  }
  function makeCooler(x, y, cp) {
    return { type: 'cooler', cp, x, y, w: 14, h: 30, vx: 0, vy: 0, active: false,
      update() {
        const p = G.player;
        if (Math.abs(p.x - this.x) < 14 && Math.abs(p.y - this.y) < 20 && p.state !== 'dead') {
          if (!this.touched) {
            this.touched = true;
            p.hp = p.maxHp; p.mental = 100;
            if (G.eventDone && G.cp !== this.cp) { G.cp = this.cp; writeSave(); }
            pop(this.x, this.y - 36, G.eventDone ? '꿀꺽… 저장 완료!' : '꿀꺽!', '#7fd8ff', true); sfx('cooler');
          }
        } else this.touched = false;
      } };
  }

  // ===================== 효과 =====================
  function pop(x, y, text, c, big) { G.pops.push({ x, y, text, c, t: 0, life: big ? 1.1 : 0.7, big }); }
  function dust(x, y, n) { for (let i = 0; i < n; i++) G.parts.push({ x: x + rand(-4, 4), y: y - 1, vx: rand(-30, 30), vy: rand(-30, -5), life: 0.35, max: 0.35, c: '#cfc8b8', s: 1, g: 0 }); }

  // ===================== 이야기(컷신) =====================
  const say = (who, text) => ({ t: 'say', who, text });
  const wait = s => ({ t: 'wait', s });
  const until = (fn, ctrl = true) => ({ t: 'until', fn, ctrl });
  const act = fn => ({ t: 'do', fn });
  const walk = (ent, x, speed = 45) => ({ t: 'walk', ent, x, speed });
  const NAMES = { jiwoo: ['한지우', '#7fb4ff'], oh: ['오대리', '#f0a860'], bujang: ['마부장', '#ff7a7a'], room: ['회의실 안', '#b8b4c8'] };

  function runCut(gen) { G.cut = { gen, cur: null }; nextCmd(); }
  function nextCmd() {
    for (; ;) {
      const r = G.cut.gen.next();
      if (r.done) { G.cut = null; return; }
      const c = r.value;
      if (c.t === 'do') { c.fn(); continue; }
      if (c.t === 'say') { c.shown = 0; c.done = false; }
      G.cut.cur = c; return;
    }
  }
  function updateCut(dt) {
    if (!G.cut) return;
    const c = G.cut.cur;
    switch (c.t) {
      case 'say': {
        const before = Math.floor(c.shown);
        c.shown = Math.min(c.text.length, c.shown + dt * 32);
        if (Math.floor(c.shown) !== before && Math.floor(c.shown) % 3 === 0) sfx('blip');
        const ok = input.pressed.confirm || input.pressed.atk || input.pressed.jump;
        if (ok) { if (c.shown < c.text.length) c.shown = c.text.length; else nextCmd(); }
        for (const e of G.ents) if (e.type === 'npc') e.anim = e.who === c.who ? 'talk' : 'idle';
        break;
      }
      case 'wait': c.s -= dt; if (c.s <= 0) nextCmd(); break;
      case 'until': if (c.fn()) nextCmd(); break;
      case 'walk': {
        const e = c.ent; const d = c.x - e.x;
        e.face = Math.sign(d) || e.face; e.anim = 'run';
        if (Math.abs(d) < 2) { e.vx = 0; e.anim = 'idle'; nextCmd(); } else e.vx = Math.sign(d) * c.speed;
        break;
      }
    }
  }
  function hint(text) { G.hint = text ? { text, t: 0 } : null; }
  const H = isTouch ? {
    move: '◀ ▶ 이동 · 점프 버튼으로 책상 위에 올라가요', atk: '공격 버튼 연타 → 3단 콤보! (공중에서 ▼+공격: 결재 도장)',
    dash: '대시 = 회전의자 슬라이딩! 미끄러지는 동안 무적', cooler: '정수기에서 물을 마시면 체력 회복 + 저장',
    skills: '스테이플러 · 전체회신: 멘탈을 써요 / 칼퇴 게이지가 차면 필살!', go: '오른쪽으로! 회의실을 찾아가자',
  } : {
    move: '←→ 이동 · Space 점프 (꾹 누르면 더 높이)', atk: 'J 연타 → 3단 콤보! (공중에서 ↓+J: 결재 도장)',
    dash: 'K: 회전의자 슬라이딩! 미끄러지는 동안 무적', cooler: '정수기에서 물을 마시면 체력 회복 + 저장',
    skills: 'U 스테이플러 · I 전체회신 (멘탈 사용) / 칼퇴 게이지가 차면 O 필살!', go: '오른쪽으로! 회의실을 찾아가자',
  };

  function* prologue() {
    const p = G.player;
    const oh = G.ents.find(e => e.id === 'oh');
    yield act(() => { G.fade = 1; G.fadeTo = 0; });
    yield wait(0.8);
    yield say('oh', '어서 와요, 지우 씨! 오늘부터 우리 팀이에요.');
    yield say('oh', '저는 지우 씨 사수, 오대리예요. 모르는 건 뭐든 물어봐요!');
    yield say('jiwoo', '잘 부탁드립니다! (목표는 단 하나… 칼퇴!)');
    yield say('oh', '첫 업무는… 저기 복사기 좀 봐 줄래요? 또 종이가 걸렸대요.');
    yield act(() => hint(H.move));
    const copier = G.ents.find(e => e.id === 'tutCopier');
    yield until(() => p.x > copier.x - 80);
    yield act(() => {
      hint(null); G.shake = 4; sfx('paper');
      const s = makeSlime(copier.x - 14, copier.y - 6, false); s.vx = -70; s.vy = -170; s.hopT = 1.2; G.ents.push(s);
      copier.passive = true;
    });
    yield wait(0.7);
    yield say('jiwoo', '복사기에서… 종이가 기어 나왔다?!');
    yield say('oh', '아, 그거 종이걸림이에요. 그냥 때리면 돼요!');
    yield act(() => hint(H.atk));
    yield until(() => !G.ents.some(e => e.enemy && !e.dead && e.type === 'slime' && !asleep(e)));
    yield act(() => hint(null));
    yield say('oh', '오… 신입이 복사기를 때려서 고치네? 인재다!');
    yield say('oh', '참, 바닥에 떨어진 돈은 주워요. 이 회사는 월급을 그렇게 줘요.');
    yield act(() => hint(H.dash));
    yield until(() => G.seen.dash);
    yield wait(1.2);
    yield act(() => hint(H.cooler));
    yield until(() => Math.abs(p.x - L.cps[0]) < 14);
    yield act(() => hint(null));
    yield say('jiwoo', '(꿀꺽… 정수기 물이 이렇게 맛있었나?)');

    // ---- 오후 5시 59분 ----
    yield act(() => { G.fadeTo = 1; });
    yield wait(0.7);
    yield act(() => {
      G.clock = 17 * 60 + 59;
      p.x = L.jiwooDeskX + 30; p.y = 192; p.vx = 0; p.face = 1; p.state = 'normal';
      p.hp = p.maxHp; p.mental = 100;
      oh.x = L.ohDeskX; oh.face = -1;
      G.cam.x = 0;
      G.banner = { text: '그리고… 오후 5시 59분', t: 0, quiet: true };
      G.fadeTo = 0;
    });
    yield wait(1.6);
    yield say('jiwoo', '(드디어 퇴근 1분 전… 가방 챙기고… 자연스럽게…)');
    let bu;
    yield act(() => { openGate(); sfx('hit'); bu = makeNpc('bujang', (L.gateX - 1) * TS, 192, -1, 'bujang'); G.ents.push(bu); });
    yield walk(bu, p.x + 34, 40);
    yield say('bujang', '아, 지우 씨~ 첫날 고생 많았어.');
    yield say('bujang', '근데 이것만 하고 가.');
    yield say('jiwoo', '네…? 지금 6시인데요…');
    yield act(() => { G.clock = 18 * 60; G.flicker = 1.6; sfx('boom'); G.shake = 6; });
    yield wait(1.7);
    yield act(() => { G.night = true; G.flicker = 0; });
    yield say('bujang', '흐흐흐… 이것만… 이것만… 이것만 하고 가…');
    yield act(() => { const b = G.ents.find(e => e.id === 'bujang'); b.face = 1; });
    yield walk(G.ents.find(e => e.id === 'bujang'), (L.gateX + 8) * TS, 70);
    yield act(() => { const b = G.ents.find(e => e.id === 'bujang'); b.gone = true; });
    yield act(() => { oh.x = p.x - 40; oh.face = 1; G.flash = 0.2; });
    yield say('oh', '지우 씨, 잘 들어요! 이 회사는 6시가 되면 이상해져요.');
    yield say('oh', '사람들 스트레스가 괴물이 되고… 붙잡히면 영원히 야근하게 돼요.');
    yield say('oh', '자정 전에 꼭 빠져나가야 해요! 일단 회의실 쪽으로—');
    yield act(() => { G.flicker = 0.6; sfx('boom'); });
    yield wait(0.6);
    yield act(() => { oh.gone = true; G.flicker = 0; });
    yield wait(0.5);
    yield say('jiwoo', '…오대리님? …저 오늘 첫 출근인데요?');
    yield act(() => {
      G.eventDone = true; G.clockRun = true; G.cp = 0; writeSave();
      hint(H.skills);
      setTimeout(() => { if (G && G.hint && G.hint.text === H.skills) hint(H.go); }, 6000);
    });
  }
  function* ending() {
    const p = G.player;
    yield act(() => { hint(null); p.vx = 0; });
    yield say('jiwoo', '회의실… 오대리님이 여기로 오라고 했는데.');
    yield say('room', '그럼 처음부터 다시 정리해 보면…');
    yield say('room', '그럼 처음부터 다시 정리해 보면…');
    yield say('room', '그럼… 처음부터… 다시…');
    yield say('jiwoo', '…이 회의, 끝나긴 하는 거야?');
    yield act(() => { G.fadeTo = 1; });
    yield wait(0.8);
    yield act(() => showClear());
  }

  // ===================== 갱신 =====================
  function update(dt) {
    if (G.hitstop > 0) { G.hitstop -= dt; return; }
    G.time += dt;
    if (G.clockRun && mode === 'play') G.clock += dt * 0.2;
    if (!G.cut || G.clockRun) G.stats.time += dt;
    G.stats.comboT -= dt; if (G.stats.comboT <= 0) G.stats.combo = 0;
    updateCut(dt);
    const ctrl = !G.cut || (G.cut.cur && G.cut.cur.t === 'until' && G.cut.cur.ctrl);
    updatePlayer(dt, ctrl ? input : NOINPUT);
    const freeze = G.cut && !ctrl;
    const p = G.player;

    for (const e of G.ents) {
      if (e.enemy && (freeze || asleep(e))) { e.animT = (e.animT || 0) + dt; continue; }
      e.flash = Math.max(0, (e.flash || 0) - dt);
      e.update(dt);
      if (e.enemy && !e.dead && e.contact && p.state !== 'dead' && overlap(box(e), box(p))) hurtPlayer(e.contact, e.x);
    }
    G.ents = G.ents.filter(e => !e.dead && !e.gone);

    for (const s of G.shots) {
      s.life -= dt; s.vy += (s.g || 0) * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const sb = { x0: s.x - s.w / 2, x1: s.x + s.w / 2, y0: s.y - s.h / 2, y1: s.y + s.h / 2 };
      const tx = Math.floor(s.x / TS), ty = Math.floor(s.y / TS);
      if (s.life <= 0 || SOLID.has(tileAt(tx, ty))) { s.dead = true; continue; }
      if (s.friendly) {
        for (const e of G.ents) if (e.enemy && !e.dead && overlap(box(e), sb)) { hitEnemy(e, s.dmg, Math.sign(s.vx), 40); s.dead = true; break; }
      } else if (overlap(box(p), sb) && p.state !== 'dash' && p.state !== 'ult' && p.inv <= 0 && p.state !== 'dead') {
        hurtPlayer(s.dmg, s.x - s.vx); s.dead = true;
      }
    }
    G.shots = G.shots.filter(s => !s.dead);
    for (const q of G.parts) { q.life -= dt; q.vy += (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    G.parts = G.parts.filter(q => q.life > 0);
    for (const q of G.pops) { q.t += dt; if (q.follow) { q.x = q.follow.x; q.y = q.follow.y - 62; } }
    G.pops = G.pops.filter(q => q.t < q.life);
    if (G.banner) { G.banner.t += dt; if (G.banner.t > 1.8) G.banner = null; }
    if (G.hint) G.hint.t += dt;
    G.flicker = Math.max(0, G.flicker - (G.cut ? 0 : dt));
    G.flash = Math.max(0, G.flash - dt);
    G.shake = Math.max(0, G.shake - dt * 14);
    G.fade = approach(G.fade, G.fadeTo, dt * 2.5);

    // 카메라
    const look = p.state === 'dead' ? 0 : p.face * 28;
    let tx = p.x + look - VW / 2, ty = p.y - VH * 0.66;
    const maxX = G.eventDone || G.night ? MAP_W - VW : Math.max(0, (L.gateX + 1) * TS - VW);
    tx = Math.max(0, Math.min(maxX, tx)); ty = Math.max(0, Math.min(MAP_H - VH, ty));
    if (MAP_H < VH) ty = MAP_H - VH;
    G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 6);
    G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 6);

    // 끝
    if (G.eventDone && !G.clearing && p.x >= L.exitX && !G.cut) { G.clearing = true; runCut(ending()); }
  }

  // ===================== 그리기 =====================
  const skyline = [];
  for (let i = 0, x = 0; x < MAP_W * 0.5 + 400; i++) { const w = 14 + Math.floor(Math.random() * 20); skyline.push({ x, w, h: 20 + Math.floor(Math.random() * 60), seed: i }); x += w + 2; }

  function theme() {
    if (G.flicker > 0) return Math.random() < 0.5 ? 'day' : 'night';
    return G.night ? 'night' : 'day';
  }
  function drawText(t, x, y, c, font = F11, align = 'left', shadow = true) {
    ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'top';
    if (shadow) { ctx.fillStyle = '#000000b0'; ctx.fillText(t, x + 1, y + 1); }
    ctx.fillStyle = c; ctx.fillText(t, x, y);
  }
  function wrap(text, maxW, font) {
    ctx.font = font;
    const out = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const ch of para) {
        if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch.trim() ? ch : ''; }
        else line += ch;
      }
      out.push(line);
    }
    return out;
  }

  const WALL_W = 156, WALL_H = 160; // 벽 그림 한 장 = 월드 156×160 (고해상도 312×320)
  function drawWorld(now) {
    const night = theme() === 'night';
    const wallArt = ART.img(night ? 'bg_wall_night' : 'bg_wall_day') || ART.img('bg_wall_day');
    // 벽 그림이 있으면 소품은 낮 색으로 그리고 밤에는 어둡게 덧칠함
    const th = wallArt ? 'day' : (night ? 'night' : 'day'), C = ART.THEMES[th];
    const sx = G.shake ? Math.round(rand(-G.shake, G.shake)) : 0, sy = G.shake ? Math.round(rand(-G.shake, G.shake)) : 0;
    const cx = Math.round(G.cam.x) + sx, cy = Math.round(G.cam.y) + sy;
    const x0 = Math.floor(cx / TS) - 1, x1 = Math.ceil((cx + VW) / TS) + 1;
    ctx.clearRect(0, 0, VW, VH);

    if (!wallArt) { // 그림이 없을 때의 코드 벽
      ctx.fillStyle = C.wall; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = C.wall2;
      for (let x = x0 * TS; x < x1 * TS; x += 32) ctx.fillRect(x - cx, 2 * TS - cy, 16, 10 * TS);
    }
    ctx.fillStyle = C.base; ctx.fillRect(0, 12 * TS - 4 - cy, VW, 4);

    for (const d of L.decor) {
      if (wallArt && (d.k === 'window' || d.k === 'light')) continue;
      const dx = (d.x !== undefined ? d.x : d.x0) * TS - cx;
      if (dx > VW + 80 || dx + (d.w || d.len || 4) * TS < -80) continue;
      drawDecor(d, dx, cy, C, th, now);
    }

    // 타일
    for (let ty = 0; ty < L.H; ty++) for (let tx = Math.max(0, x0); tx < Math.min(L.W, x1); tx++) {
      const t = G.tiles[ty * L.W + tx];
      if (!t) continue;
      let name;
      if (t === T.DESK && ART.img('bg_desk')) continue; // 책상 그림이 윗면까지 그림
      if (t === T.CAB && ART.img('bg_cabinet')) { ctx.drawImage(ART.img('bg_cabinet'), tx * TS - cx, ty * TS - cy, TS, TS); continue; }
      if (t === T.SOLID) name = (ty > 0 && SOLID.has(G.tiles[(ty - 1) * L.W + tx])) ? 'under' : 'floor';
      else name = { [T.DESK]: 'desk', [T.CAB]: 'cab', [T.SHELF]: 'shelf', [T.GATE]: 'gate', [T.CEIL]: 'ceil' }[t];
      ctx.drawImage(ART.tile(name, th), tx * TS - cx, ty * TS - cy);
    }
    // 부장실 표지판
    if (G.tiles[5 * L.W + L.gateX] === T.GATE) {
      const d = L.decor.find(q => q.k === 'sign');
      drawSign(d.x * TS - 6 - cx, d.y * TS - cy, d.text, '#c0392b');
    }
    if (wallArt) {
      // 밤: 지금까지 그린 소품만 어둡게
      if (night) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(14,18,58,0.55)'; ctx.fillRect(0, 0, VW, VH);
      }
      // 벽 그림을 맨 뒤에 깔기
      ctx.globalCompositeOperation = 'destination-over';
      for (let wx = Math.floor(cx / WALL_W) * WALL_W; wx < cx + VW; wx += WALL_W) ctx.drawImage(wallArt, wx - cx, 2 * TS - cy, WALL_W, WALL_H);
      ctx.fillStyle = night ? '#141626' : C.ceil2; ctx.fillRect(0, 0, VW, VH);
      ctx.globalCompositeOperation = 'source-over';
    }

    // 엔티티
    const all = [...G.ents].sort((a, b) => (a.type === 'cooler' ? -1 : 0) - (b.type === 'cooler' ? -1 : 0));
    for (const e of all) drawEnt(e, cx, cy, now);
    drawPlayer(cx, cy, now);
    for (const s of G.shots) {
      const img = ART.item(s.k);
      ctx.drawImage(img, Math.round(s.x - img.width / 2 - cx), Math.round(s.y - img.height / 2 - cy));
    }
    for (const q of G.parts) {
      ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5);
      if (q.k === 'mail') { const img = ART.item('mail'); ctx.drawImage(img, Math.round(q.x - cx), Math.round(q.y - cy)); }
      else { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), q.s, q.s); }
    }
    ctx.globalAlpha = 1;

    // 밤 조명
    if (th === 'night') {
      ctx.globalCompositeOperation = 'lighter';
      for (const d of L.decor) {
        if (d.k !== 'light') continue;
        const lx = d.x * TS + 8 - cx;
        if (lx < -60 || lx > VW + 60) continue;
        if (d.flicker && Math.sin(now / 90 + d.x) > 0.6) continue;
        ctx.fillStyle = 'rgba(200,255,190,0.07)';
        ctx.beginPath(); ctx.moveTo(lx - 8, 2 * TS + 3 - cy); ctx.lineTo(lx + 8, 2 * TS + 3 - cy); ctx.lineTo(lx + 34, 12 * TS - cy); ctx.lineTo(lx - 34, 12 * TS - cy); ctx.fill();
        ctx.fillStyle = 'rgba(200,255,190,0.05)';
        ctx.fillRect(lx - 34, 12 * TS - 3 - cy, 68, 3);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // 말풍선·숫자
    for (const q of G.pops) {
      const k = q.t / q.life, yy = q.y - (q.bubble ? 0 : k * 16) - cy, xx = q.x - cx;
      ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
      if (q.bubble) bubble(xx, yy, q.text);
      else drawText(q.text, Math.round(xx), Math.round(yy), q.c, q.big ? F11 : F9, 'center');
    }
    ctx.globalAlpha = 1;
    // 좀비 말풍선
    for (const e of G.ents) if (e.type === 'zombie' && e.state === 'wind') bubble(e.x - cx, e.y - 62 - cy, e.line);
  }

  function bubble(x, y, text) {
    ctx.font = F9;
    const w = Math.ceil(ctx.measureText(text).width) + 8, h = 14;
    const bx = Math.round(Math.max(2, Math.min(VW - w - 2, x - w / 2))), by = Math.round(y - h);
    ctx.fillStyle = '#1b1626'; ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, w, h);
    ctx.fillRect(Math.round(x) - 2, by + h, 4, 2); ctx.fillRect(Math.round(x) - 1, by + h + 2, 2, 1);
    drawText(text, bx + 4, by + 2, '#1b1626', F9, 'left', false);
  }
  function drawSign(x, y, text, c) {
    const lines = text.split('\n');
    ctx.fillStyle = '#1b1626'; ctx.fillRect(x - 1, y - 1, 30, lines.length * 11 + 6);
    ctx.fillStyle = '#f4f1ea'; ctx.fillRect(x, y, 28, lines.length * 11 + 4);
    ctx.fillStyle = c; ctx.fillRect(x, y, 28, 2);
    lines.forEach((l, i) => drawText(l, x + 14, y + 3 + i * 11, '#1b1626', F9, 'center', false));
  }

  function drawDecor(d, dx, cy, C, th, now) {
    switch (d.k) {
      case 'window': {
        const wx = Math.round(dx), wy = 3 * TS - cy, ww = d.w * TS, wh = 5 * TS;
        ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
        ctx.fillStyle = C.sky; ctx.fillRect(wx, wy, ww, wh);
        ctx.fillStyle = C.sky2; ctx.fillRect(wx, wy + wh - 30, ww, 30);
        if (th === 'night') { ctx.fillStyle = '#fff6c8'; ctx.fillRect(wx + 40 - Math.round(G.cam.x * 0.02) % 20, wy + 10, 6, 6); }
        for (const b of skyline) {
          const sxp = Math.round(b.x - G.cam.x * 0.35);
          if (sxp + b.w < wx || sxp > wx + ww) continue;
          ctx.fillStyle = b.seed % 2 ? C.city : C.city2;
          ctx.fillRect(sxp, wy + wh - b.h, b.w, b.h);
          ctx.fillStyle = C.cityWin;
          for (let yy = wy + wh - b.h + 3; yy < wy + wh - 2; yy += 5) for (let xx = sxp + 2; xx < sxp + b.w - 2; xx += 4)
            if (((xx * 13 + yy * 7 + b.seed) % 5) < (th === 'night' ? 2 : 1)) ctx.fillRect(xx, yy, 2, 2);
        }
        ctx.restore();
        ctx.fillStyle = th === 'night' ? '#1e2030' : '#cfc6b2';
        ctx.fillRect(wx - 2, wy - 2, ww + 4, 2); ctx.fillRect(wx - 2, wy + wh, ww + 4, 3);
        ctx.fillRect(wx - 2, wy, 2, wh); ctx.fillRect(wx + ww, wy, 2, wh); ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        break;
      }
      case 'light': {
        const lx = Math.round(dx) + 2;
        const off = th === 'night' && d.flicker && Math.sin(now / 90 + d.x) > 0.6;
        ctx.fillStyle = '#8a8a96'; ctx.fillRect(lx, 2 * TS - cy, 24, 3);
        ctx.fillStyle = off ? '#55556a' : C.light; ctx.fillRect(lx + 2, 2 * TS + 2 - cy, 20, 2);
        break;
      }
      case 'poster': {
        const px = Math.round(dx) - 4, py = 4 * TS - cy + 4;
        const lines = d.text.split('\n');
        ctx.font = F9;
        const w = Math.max(...lines.map(l => Math.ceil(ctx.measureText(l).width))) + 10, h = 10 + lines.length * 11;
        ctx.fillStyle = '#1b1626'; ctx.fillRect(px - 1, py - 1, w + 2, h + 2);
        ctx.fillStyle = th === 'night' ? '#8a8aa0' : '#fbf8ef'; ctx.fillRect(px, py, w, h);
        ctx.fillStyle = th === 'night' ? '#7a3a4a' : '#d24a3a'; ctx.fillRect(px, py, w, 4);
        lines.forEach((l, i) => drawText(l, px + w / 2, py + 7 + i * 11, '#1b1626', F9, 'center', false));
        break;
      }
      case 'clock': {
        const x = Math.round(dx), y = 3 * TS - cy + 4;
        ctx.fillStyle = '#1b1626'; ctx.fillRect(x - 1, y - 1, 34, 14);
        ctx.fillStyle = '#2a3a2a'; ctx.fillRect(x, y, 32, 12);
        const m = Math.floor(G.clock), t = `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        drawText(t, x + 16, y + 1, G.night ? '#ff6464' : '#7fe08a', F9, 'center', false);
        break;
      }
      case 'desk': {
        const x = Math.round(dx), top = 10 * TS - cy, w = d.len * TS;
        const deskArt = ART.img('bg_desk');
        if (deskArt) {
          ctx.drawImage(deskArt, x + w / 2 - 24, 12 * TS - cy - 48, 48, 48);
          if (d.name) { ctx.fillStyle = '#1b1626'; ctx.fillRect(x + 3, top - 6, 18, 6); ctx.fillStyle = '#e9c46a'; ctx.fillRect(x + 4, top - 5, 16, 4); }
          break;
        }
        ctx.fillStyle = ART.shade(C.desk2, 0.85);
        ctx.fillRect(x + 1, top + 4, 2, 2 * TS - 4); ctx.fillRect(x + w - 3, top + 4, 2, 2 * TS - 4);
        ctx.fillStyle = C.cab2; ctx.fillRect(x + w - 16, top + 4, 12, 18);
        ctx.fillStyle = C.cab; ctx.fillRect(x + w - 15, top + 6, 10, 1); ctx.fillRect(x + w - 15, top + 13, 10, 1);
        // 모니터
        const mx = x + Math.floor(w / 2) - 8;
        ctx.fillStyle = '#2a2a33'; ctx.fillRect(mx, top - 13, 16, 11); ctx.fillRect(mx + 7, top - 2, 2, 2);
        ctx.fillStyle = th === 'night' ? (Math.floor(now / 400 + d.x) % 7 ? '#304080' : '#4060c0') : '#6fb0e0';
        ctx.fillRect(mx + 1, top - 12, 14, 8);
        if (th === 'night') { ctx.fillStyle = '#ff6464'; ctx.fillRect(mx + 3, top - 10, 6, 1); ctx.fillRect(mx + 3, top - 8, 9, 1); }
        ctx.fillStyle = '#d8d8e0'; ctx.fillRect(mx - 6, top - 1, 10, 1);
        if (d.name) {
          ctx.fillStyle = '#1b1626'; ctx.fillRect(x + 3, top - 7, 20, 7);
          ctx.fillStyle = '#e9c46a'; ctx.fillRect(x + 4, top - 6, 18, 5);
        }
        break;
      }
      case 'pit': {
        const x = Math.round(d.x0 * TS - G.cam.x), w = (d.x1 - d.x0 + 1) * TS, y = 12 * TS - cy;
        for (let i = 0; i < w; i += 4) { ctx.fillStyle = (i / 4) % 2 ? '#1b1626' : '#ffd34d'; ctx.fillRect(x + i, y - 1, 4, 2); }
        ctx.fillStyle = '#0a0810'; ctx.fillRect(x, y + 1, w, 2 * TS);
        drawSign(x - 22, y - 30, '공사중', '#ffd34d');
        ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - 9, y - 16, 2, 16);
        break;
      }
      case 'plant': { const im = ART.img('bg_plant'); if (im) ctx.drawImage(im, Math.round(dx), 12 * TS - cy - 32, 16, 32); break; }
      case 'door': {
        const x = Math.round(dx), y = 12 * TS - cy - 52;
        const doorArt = ART.img('bg_door');
        if (doorArt) {
          ctx.drawImage(doorArt, x, 12 * TS - cy - 56, 32, 56);
          if (th === 'night' || G.night) { ctx.fillStyle = `rgba(255,240,180,${0.45 + Math.sin(now / 200) * 0.2})`; ctx.fillRect(x, 12 * TS - cy - 2, 32, 2); }
          drawSign(x + 2, 12 * TS - cy - 74, d.text, '#3a6ad8');
          break;
        }
        ctx.fillStyle = '#1b1626'; ctx.fillRect(x - 2, y - 2, 36, 54);
        ctx.fillStyle = th === 'night' ? '#5a4030' : '#8a5a3a'; ctx.fillRect(x, y, 32, 52);
        ctx.fillStyle = '#1b1626'; ctx.fillRect(x + 15, y, 2, 52);
        ctx.fillStyle = '#ffd34d'; ctx.fillRect(x + 12, y + 26, 2, 3); ctx.fillRect(x + 18, y + 26, 2, 3);
        if (th === 'night') { ctx.fillStyle = `rgba(255,240,180,${0.5 + Math.sin(now / 200) * 0.2})`; ctx.fillRect(x, y + 50, 32, 2); }
        drawSign(x + 2, y - 18, d.text, '#3a6ad8');
        break;
      }
    }
  }

  function drawFrames(frames, idx, x, y, flip, flash, alpha, k = 1) {
    const img = frames[idx % frames.length];
    const S = img.width;
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x * RES) / RES, Math.round(y * RES) / RES);
    ctx.scale(flip ? -k : k, k);
    ctx.drawImage(flash ? ART.white(img) : img, -Math.floor(S / 2), -img.height + (S === 48 ? 2 : 1));
    ctx.restore();
  }
  // 고해상도(PixelLab) 캐릭터: 스프라이트 1픽셀 = 캔버스 1픽셀, 손 위치에 소품을 그림
  const PROPS = { atk1: 'folder', atk2: 'folder', atk3: 'folder', stamp: 'stamp', shoot: 'stapler', cast: 'phone' };
  function drawHero(ch, anim, idx, x, y, flip, flash, alpha) {
    const meta = ART.metas[ch], frames = ART.char(ch, anim);
    const img = frames[idx % frames.length];
    if (!meta || img.width < 96) return drawFrames(frames, idx, x, y, flip, flash, alpha);
    const S = img.width, k = 1 / RES, m = (meta.anims[anim] || [])[idx % frames.length];
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x * RES) / RES, Math.round(y * RES) / RES);
    ctx.scale(flip ? -k : k, k);
    ctx.translate(-S / 2, -meta.foot - 1);
    if (anim === 'dash' && m) ctx.drawImage(ART.prop('chair'), Math.round(m.hx - 26), Math.round(m.hy - 14));
    ctx.drawImage(flash ? ART.white(img) : img, 0, 0);
    const pk = PROPS[anim];
    if (pk && m) {
      const pr = ART.prop(pk);
      ctx.translate(Math.round(m.x), Math.round(m.y));
      ctx.rotate(m.a);
      ctx.drawImage(pr, -3, -Math.floor(pr.height / 2));
    }
    ctx.restore();
  }
  function drawPlayer(cx, cy) {
    const p = G.player;
    if (p.inv > 0 && p.state !== 'hurt' && p.state !== 'dead' && Math.floor(G.time * 15) % 2) return;
    const A = ART.ANIMS[p.anim];
    let idx;
    if (p.state === 'attack') { const a = ATK[p.combo]; idx = p.t < a.a0 ? 0 : p.t < a.a1 ? 1 : 2; }
    else idx = Math.floor(p.animT * A.fps);
    drawHero('jiwoo', p.anim, idx, p.x - cx, p.y - cy, p.face < 0);
    if (p.state === 'attack' && ATK[p.combo].big && p.t >= ATK[p.combo].a0 && p.t < ATK[p.combo].a1 + 0.05) {
      ctx.fillStyle = '#ffffffaa';
      const sx = p.x - cx + p.face * 26;
      for (let i = 0; i < 8; i++) ctx.fillRect(Math.round(sx + p.face * i * 2), Math.round(p.y - cy - 56 + i * 6), 2, 3);
    }
  }
  function drawEnt(e, cx, cy) {
    const x = e.x - cx, y = e.y - cy;
    if (x < -60 || x > VW + 60) return;
    switch (e.type) {
      case 'npc': {
        const A = ART.ANIMS[e.anim] || ART.ANIMS.idle;
        if (ART.metas[e.who]) drawHero(e.who, e.anim, Math.floor(e.animT * A.fps), x, y, e.face < 0, false, e.alpha);
        else drawFrames(ART.char(e.who, e.anim), Math.floor(e.animT * A.fps), x, y, e.face < 0, false, e.alpha, 1.75);
        break;
      }
      case 'zombie': {
        const { ch, a } = e.anim();
        const A = ART.ANIMS[a], base = ch.replace(/2$/, '');
        if (ART.metas[base]) drawHero(base, a, Math.floor(e.animT * A.fps), x, y, e.face < 0, e.flash > 0, e.alpha);
        else drawFrames(ART.char(ch, a), Math.floor(e.animT * A.fps), x, y, e.face < 0, e.flash > 0, e.alpha, 1.75);
        break;
      }
      case 'slime': { const f = ART.enemy(e.small ? 'slime_small' : 'slime'); drawFrames(f, e.frame(), x, y + (f.hd ? 2 : 0), e.face > 0, e.flash > 0, undefined, f.hd ? (e.small ? 0.3 : 0.5) : 1); break; }
      case 'bat': { const f = ART.enemy('bat'); drawFrames(f, e.frame(), x, y + (f.hd ? 12 : 7), e.face > 0, e.flash > 0, undefined, f.hd ? 0.5 : 1); break; }
      case 'copier': { const f = ART.enemy('copier'); drawFrames(f, e.frame(), x + e.shakeX(), y + (f.hd ? 2 : 0), e.face > 0, e.flash > 0, undefined, f.hd ? 0.5 : 1); break; }
      case 'pickup': {
        const img = ART.item(e.kind), bob = e.onGround && !e.magnet ? Math.round(Math.sin(G.time * 5 + e.x) * 1) : 0;
        ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height + bob));
        break;
      }
      case 'cooler': {
        const on = G.eventDone ? (e.cp === G.cp) : e.cp === 0;
        const art = ART.img('bg_cooler');
        if (art) {
          ctx.drawImage(art, Math.round(x - 8), Math.round(y - 32), 16, 32);
          if (on) { ctx.fillStyle = Math.floor(G.time * 3) % 2 ? '#5fe07a' : '#3fb05a'; ctx.fillRect(Math.round(x + 4), Math.round(y - 20), 2, 2); }
        } else ctx.drawImage(ART.item(on ? 'cooler_on' : 'cooler'), Math.round(x - 8), Math.round(y - 32));
        break;
      }
    }
  }

  function drawHud(now) {
    const p = G.player, l = 6 + insetL, r = VW - 6 - insetR;
    // 사회생활 배터리
    drawText('배터리', l, 4, '#f4f1ea', F9);
    const bx = l + 34, by = 5;
    ctx.fillStyle = '#1b1626'; ctx.fillRect(bx - 1, by - 1, 44, 11); ctx.fillRect(bx + 43, by + 2, 3, 5);
    ctx.fillStyle = '#3a3448'; ctx.fillRect(bx, by, 42, 9);
    const segs = Math.ceil(p.hp / 20), segC = p.hp > 50 ? '#5fe07a' : p.hp > 25 ? '#ffd34d' : '#ff6464';
    for (let i = 0; i < 5; i++) if (i < segs) { ctx.fillStyle = segC; ctx.fillRect(bx + 1 + i * 8, by + 1, 7, 7); }
    drawText(`${Math.ceil(p.hp)}%`, bx + 50, 4, segC, F9);
    // 멘탈
    drawText('멘탈', l, 17, '#a8c8ff', F9);
    ctx.fillStyle = '#1b1626'; ctx.fillRect(bx - 1, 19, 44, 6);
    ctx.fillStyle = '#7fb4ff'; ctx.fillRect(bx, 20, Math.round(42 * p.mental / 100), 4);
    // 칼퇴 게이지
    const full = p.gauge >= 100;
    drawText('칼퇴', l, 28, full && Math.floor(now / 200) % 2 ? '#ffd34d' : '#ffb070', F9);
    ctx.fillStyle = '#1b1626'; ctx.fillRect(bx - 1, 30, 44, 6);
    ctx.fillStyle = full ? (Math.floor(now / 150) % 2 ? '#ffd34d' : '#ff9a2a') : '#ff9a2a'; ctx.fillRect(bx, 31, Math.round(42 * p.gauge / 100), 4);
    if (full) drawText('필살 OK!', bx + 48, 28, '#ffd34d', F9);
    // 시계·월급
    const rr = r - 34; // 일시정지 버튼 자리
    drawText(clockText(G.clock), rr, 4, G.night ? '#ff8a8a' : '#f4f1ea', F11, 'right');
    drawText(`월급 ${won(G.money)}`, rr, 18, '#ffd34d', F9, 'right');
    if (G.stats.combo >= 3) drawText(`${G.stats.combo} 콤보!`, rr, 30, '#ffffff', F9, 'right');
    // 힌트
    if (G.hint && !(G.cut && G.cut.cur && G.cut.cur.t === 'say')) {
      const lines = wrap(G.hint.text, Math.min(VW - 40, 280), F9);
      const w = Math.min(VW - 40, 290), h = lines.length * 11 + 8, hx = Math.round(VW / 2 - w / 2), hy = 42;
      ctx.fillStyle = '#000000a0'; ctx.fillRect(hx, hy, w, h);
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(hx, hy, 2, h);
      lines.forEach((t, i) => drawText(t, VW / 2, hy + 4 + i * 11, '#ffffff', F9, 'center'));
    }
    // 배너
    if (G.banner) {
      const k = G.banner.t;
      const a = k < 0.2 ? k / 0.2 : k > 1.5 ? (1.8 - k) / 0.3 : 1;
      ctx.globalAlpha = Math.max(0, a);
      if (!G.banner.quiet) { ctx.fillStyle = '#c0392b'; ctx.fillRect(0, VH / 2 - 16, VW, 30); ctx.fillStyle = '#ffd34d'; ctx.fillRect(0, VH / 2 - 16, VW, 2); ctx.fillRect(0, VH / 2 + 12, VW, 2); }
      drawText(G.banner.text, VW / 2 + (G.banner.quiet ? 0 : Math.round((1 - Math.min(1, k * 4)) * 60)), VH / 2 - 7, '#ffffff', F11, 'center');
      ctx.globalAlpha = 1;
    }
  }
  function drawDialog(now) {
    const c = G.cut && G.cut.cur;
    if (!c || c.t !== 'say') return;
    const [name, col] = NAMES[c.who];
    const w = Math.min(VW - 16 - insetL - insetR, 380), x = Math.round((VW - w) / 2), h = 46, y = VH - h - 8;
    ctx.fillStyle = '#1b1626'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#f4f1ea'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#231f30'; ctx.fillRect(x, y, w, h);
    ctx.font = F11;
    const nw = Math.ceil(ctx.measureText(name).width) + 10;
    ctx.fillStyle = col; ctx.fillRect(x + 6, y - 9, nw, 13);
    drawText(name, x + 11, y - 8, '#1b1626', F11, 'left', false);
    const lines = wrap(c.text.slice(0, Math.floor(c.shown)), w - 16, F11);
    lines.slice(0, 3).forEach((t, i) => drawText(t, x + 8, y + 8 + i * 13, '#f4f1ea'));
    if (c.shown >= c.text.length && Math.floor(now / 300) % 2) drawText('▼', x + w - 12, y + h - 13, '#ffd34d', F9);
  }

  function render(now) {
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (!G) { ctx.fillStyle = '#14121c'; ctx.fillRect(0, 0, VW, VH); return; }
    drawWorld(now);
    if (mode !== 'title') { drawHud(now); drawDialog(now); }
    if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.6, G.flash * 2)})`; ctx.fillRect(0, 0, VW, VH); }
    if (G.fade > 0) { ctx.fillStyle = `rgba(10,8,16,${G.fade})`; ctx.fillRect(0, 0, VW, VH); }
  }

  // ===================== 흐름 =====================
  function showScreen(id) {
    for (const s of ['title', 'pause', 'dead', 'clear']) $(s).classList.toggle('hidden', s !== id);
    const playing = id === null;
    $('pad').classList.toggle('hidden', !playing || !isTouch);
    $('pauseBtn').classList.toggle('hidden', !playing);
  }
  function refreshTitle() {
    const s = loadSave();
    $('bCont').classList.toggle('hidden', !(s && s.eventDone));
    $('bSound').textContent = $('bSound2').textContent = `소리: ${soundOn ? '켜짐' : '꺼짐'}`;
    $('keysNote').classList.toggle('hidden', isTouch);
  }
  function toTitle() {
    mode = 'title';
    createWorld(null);
    G.fade = 0; G.cam.x = 0; G.cam.y = MAP_H - VH;
    G.player.x = L.jiwooDeskX + 24;
    refreshTitle();
    showScreen('title');
  }
  function startNew() {
    store.del(SAVE_KEY);
    createWorld(null);
    G.cam.x = 0; G.cam.y = MAP_H - VH;
    mode = 'play'; showScreen(null);
    runCut(prologue());
  }
  function continueGame() {
    const s = loadSave();
    if (!s || !s.eventDone) return startNew();
    createWorld(s);
    placeAtCheckpoint();
    mode = 'play'; showScreen(null);
    G.fade = 1; G.fadeTo = 0;
    hint(H.go); setTimeout(() => { if (G && G.hint && G.hint.text === H.go) hint(null); }, 4000);
  }
  function placeAtCheckpoint() {
    const p = G.player;
    p.x = L.cps[G.cp] + 16; p.y = 192; p.safe = { x: p.x, y: p.y };
    G.cam.x = Math.max(0, p.x - VW / 2); G.cam.y = MAP_H - VH;
  }
  function retry() {
    const keep = { money: G.money, rescued: [...G.rescued], cp: G.cp, eventDone: G.eventDone, clock: G.clock, time: G.stats.time, kills: G.stats.kills, maxCombo: G.stats.maxCombo };
    if (!keep.eventDone) return startNew();
    createWorld(keep);
    placeAtCheckpoint();
    G.fade = 1; G.fadeTo = 0;
    mode = 'play'; showScreen(null);
  }
  function showDead() { mode = 'dead'; showScreen('dead'); }
  function showClear() {
    mode = 'clear';
    const s = G.stats, m = Math.floor(s.time / 60), sec = Math.floor(s.time % 60);
    const total = L.spawns.filter(q => q.type === 'zombie').length;
    $('clearStats').innerHTML = [
      ['걸린 시간', `${m}분 ${String(sec).padStart(2, '0')}초`], ['퇴근 시각', clockText(G.clock)], ['번 월급', won(G.money)],
      ['구한 동료', `${G.rescued.size} / ${total}명`], ['최대 콤보', `${s.maxCombo}`],
    ].map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('');
    writeSave();
    showScreen('clear');
  }
  function pauseGame() { if (mode !== 'play') return; mode = 'pause'; for (const k in input.held) input.held[k] = false; showScreen('pause'); }
  function resumeGame() { mode = 'play'; showScreen(null); }
  function toggleSound() { soundOn = !soundOn; store.set('overtime_sound', soundOn ? '1' : '0'); refreshTitle(); unlockAudio(); }

  $('bNew').onclick = () => { unlockAudio(); const s = loadSave(); if (s && s.eventDone && !confirm('저장된 기록을 지우고 새로 입사할까요?')) return; startNew(); };
  $('bCont').onclick = () => { unlockAudio(); continueGame(); };
  $('bSound').onclick = $('bSound2').onclick = toggleSound;
  $('bResume').onclick = resumeGame;
  $('pauseBtn').onclick = pauseGame;
  $('bRetry').onclick = retry;
  $('bQuit').onclick = $('bQuit2').onclick = $('bQuit3').onclick = () => { if (mode === 'pause') writeSave(); toTitle(); };

  // ===================== 버튼 상태(터치) =====================
  let lastPadState = '';
  function updatePadState() {
    if (!isTouch || mode !== 'play') return;
    const p = G.player;
    const st = `${p.mental >= 12}|${p.mental >= 45}|${p.gauge >= 100}`;
    if (st === lastPadState) return;
    lastPadState = st;
    document.querySelector('[data-a=s1]').classList.toggle('off', p.mental < 12);
    document.querySelector('[data-a=s2]').classList.toggle('off', p.mental < 45);
    const u = document.querySelector('[data-a=ult]');
    u.classList.toggle('off', p.gauge < 100); u.classList.toggle('ready', p.gauge >= 100);
  }

  // ===================== 루프 =====================
  let acc = 0, last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (mode === 'play' && G) {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 6) { update(STEP); acc -= STEP; n++; input.pressed = {}; }
      updatePadState();
    } else if (G && mode === 'title') {
      G.player.animT += dt; G.time += dt;
      for (const e of G.ents) if (e.type === 'npc') e.animT += dt;
    }
    render(now);
  }

  window.__OT = { get G() { return G; }, get mode() { return mode; }, press, release, input };
  ART.loadOverrides();
  Promise.all([document.fonts.load(F11), document.fonts.load(F9)]).catch(() => { }).then(() => {
    toTitle();
    requestAnimationFrame(loop);
  });
})();
