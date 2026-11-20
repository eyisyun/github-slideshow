// SKY WAR 클라이언트
(() => {
  const { SLOTS, PARTS, PAINTS, stats, WORLD } = window.SKY;
  const $ = id => document.getElementById(id);
  const FONT = '12px Galmuri, monospace';

  // ===================== 픽셀 스프라이트 =====================
  const OUT = '#1a1c2c';
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
  }
  // 스프라이트 캔버스: 32×32 (PixelLab 최소 크기와 같음), 기수는 위쪽(북쪽)
  // 코드로 그리는 기본 그림은 24×24 설계를 가운데(OFF)로 옮겨서 그림
  const N = 32, OFF = 4, PAD = 1, SZ = N + PAD * 2;
  const LAYER_ORDER = ['wing', 'engine', 'body', 'gun', 'special'];
  // 엔진 노즐 위치(32×32 스프라이트 좌표) — 불꽃을 그릴 곳
  const NOZZLES = { e1: [], e2: [[16, 27]], e3: [[14, 27], [19, 27]], e4: [[16, 28]] };

  // PixelLab 등에서 만든 부품 그림: public/sprites/<부품ID>.png (없으면 코드 그림 사용)
  const partImages = {};
  function loadPartImages() {
    for (const id of Object.keys(PARTS)) {
      if (PARTS[id].kind === 'none') continue;
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = N;
        const cx = cv.getContext('2d');
        cx.imageSmoothingEnabled = false;
        cx.drawImage(img, 0, 0, N, N);
        partImages[id] = cx.getImageData(0, 0, N, N).data;
        spriteCache.clear();
        if (!G) renderHangar();
      };
      img.src = `/sprites/${id}.png`;
    }
  }

  // 코드로 그리는 부품 한 개 (격자 배열 반환)
  function proceduralLayer(slot, id, color, frame) {
    const g = new Array(N * N).fill(null);
    const set = (x, y, c) => { x += OFF; y += OFF; if (x >= 0 && y >= 0 && x < N && y < N) g[y * N + x] = c; };
    const sym = (x, y, c) => { set(x, y, c); set(23 - x, y, c); };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sym(x, y, c); };
    const C = color, D = shade(color, 0.62), L = shade(color, 1.35);
    const M = '#9aa0a8', MD = '#5b616b', K = '#2b2e36', G = '#8fe3ff', W = '#f4f4f4', R = '#e43b44';

    if (slot === 'wing') switch (id) {
      case 'w1':
        rect(1, 10, 11, 12, C); rect(1, 13, 11, 13, D); rect(1, 10, 1, 12, L);
        rect(7, 19, 11, 20, C); rect(7, 21, 11, 21, D);
        break;
      case 'w2':
        for (let r = 0; r <= 6; r++) { const y = 9 + r, x0 = Math.round(10 - r * 1.5); rect(x0, y, 11, y, r === 6 ? D : C); sym(x0, y, L); }
        for (let r = 0; r <= 2; r++) { const y = 18 + r; rect(9 - r, y, 11, y, r === 2 ? D : C); }
        break;
      case 'w3':
        for (let y = 5; y <= 19; y++) { const x0 = Math.max(1, Math.round(11 - (y - 5) * 0.75)); rect(x0, y, 11, y, y === 19 ? D : C); sym(x0, y, L); }
        break;
      case 'w4':
        for (let r = 0; r <= 5; r++) { const y = 10 + r, x0 = Math.max(0, Math.round(9 - r * 1.7)); rect(x0, y, 11, y, r === 5 ? D : C); sym(x0, y, L); }
        sym(8, 11, MD);
        rect(8, 6, 9, 7, C); sym(7, 7, L);
        for (let r = 0; r <= 2; r++) { const y = 19 + r; rect(8 - r, y, 11, y, D); }
        break;
    }
    if (slot === 'engine') switch (id) {
      case 'e1':
        rect(11, 20, 11, 21, D);
        if (frame === 0) rect(6, 2, 10, 2, M); else { rect(10, 1, 10, 1, M); rect(9, 3, 9, 3, M); }
        break;
      case 'e2': rect(10, 19, 11, 21, MD); sym(10, 22, MD); sym(11, 22, K); break;
      case 'e3': rect(8, 19, 10, 21, MD); sym(8, 22, MD); sym(9, 22, K); sym(10, 22, MD); break;
      case 'e4': rect(9, 18, 11, 22, MD); rect(10, 23, 11, 23, K); sym(9, 23, MD); rect(8, 8, 8, 12, MD); break;
    }
    if (slot === 'body') switch (id) {
      case 'b1':
        rect(10, 3, 11, 19, C); rect(10, 4, 10, 19, D); sym(11, 2, C);
        rect(11, 6, 11, 8, G); sym(11, 6, W);
        break;
      case 'b2':
        rect(10, 3, 11, 20, C); rect(9, 8, 9, 16, D); sym(11, 2, C);
        rect(9, 12, 11, 12, MD); rect(9, 15, 11, 15, MD);
        rect(11, 5, 11, 7, G); sym(11, 5, W);
        break;
      case 'b3':
        rect(9, 3, 11, 21, C); rect(8, 7, 8, 18, D); rect(10, 2, 11, 2, D);
        rect(8, 10, 9, 10, M); rect(8, 14, 9, 14, M); rect(8, 18, 9, 18, M);
        rect(10, 5, 11, 8, G); sym(11, 5, W);
        break;
      case 'b4': {
        const S = '#3b3f4a', S2 = '#2c2f38';
        for (let y = 2; y <= 21; y++) {
          const hw = Math.min((y - 1) * 0.6, 4, (22 - y) * 0.8);
          const x0 = Math.round(11.5 - hw);
          rect(x0, y, 11, y, S); sym(x0, y, S2);
        }
        rect(8, 12, 9, 13, C); sym(10, 17, C);
        rect(11, 6, 11, 8, '#d9b030'); sym(11, 6, '#fff3a0');
        break;
      }
    }
    if (slot === 'gun') switch (id) {
      case 'g1': rect(9, 3, 9, 5, MD); sym(9, 3, K); break;
      case 'g2': rect(11, 0, 11, 2, MD); sym(11, 0, K); break;
      case 'g3': rect(9, 1, 9, 5, MD); sym(9, 1, K); rect(8, 4, 8, 6, M); break;
      case 'g4': rect(10, 1, 10, 3, M); rect(11, 0, 11, 2, '#aaffff'); sym(11, 0, '#ffffff'); break;
    }
    if (slot === 'special') switch (id) {
      case 's1': for (const x of [5, 7]) { rect(x, 11, x, 14, MD); sym(x, 10, R); } break;
      case 's2': rect(6, 9, 6, 15, W); sym(6, 8, R); sym(5, 15, MD); sym(7, 15, MD); break;
      case 's3': for (const x of [3, 5, 7]) { rect(x, 11, x, 14, W); sym(x, 10, R); } break;
    }
    return g;
  }

  // 그림 파일 → 격자 배열 (반투명 픽셀은 버림 — 픽셀 아트 유지)
  function imageLayer(data) {
    const g = new Array(N * N).fill(null);
    for (let i = 0; i < N * N; i++) {
      if (data[i * 4 + 3] < 128) continue;
      g[i] = '#' + [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
    }
    return g;
  }

  function gridToCanvas(g, outline, pad = PAD) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = N + pad * 2;
    const cx = cv.getContext('2d');
    const filled = (x, y) => x >= 0 && y >= 0 && x < N && y < N && g[y * N + x];
    for (let y = -pad; y < N + pad; y++) for (let x = -pad; x < N + pad; x++) {
      let c = filled(x, y) ? g[y * N + x] : null;
      if (!c && outline && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) c = OUT;
      if (c) { cx.fillStyle = c; cx.fillRect(x + pad, y + pad, 1, 1); }
    }
    return cv;
  }

  function buildSprite(lo, color, frame = 0) {
    const g = new Array(N * N).fill(null);
    for (const slot of LAYER_ORDER) {
      const id = lo[slot];
      const layer = partImages[id] ? imageLayer(partImages[id]) : proceduralLayer(slot, id, color, frame);
      for (let i = 0; i < g.length; i++) if (layer[i]) g[i] = layer[i];
    }
    return gridToCanvas(g, true);
  }
  function silhouette(src) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = SZ;
    const cx = cv.getContext('2d');
    cx.drawImage(src, 0, 0);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, SZ, SZ);
    return cv;
  }
  const spriteCache = new Map();
  function sprites(lo, color) {
    const key = SLOTS.map(s => lo[s.id]).join('|') + color;
    let s = spriteCache.get(key);
    if (!s) {
      const f0 = buildSprite(lo, color, 0);
      const animated = lo.engine === 'e1' && !partImages.e1;
      s = { frames: animated ? [f0, buildSprite(lo, color, 1)] : [f0], shadow: silhouette(f0), noz: NOZZLES[lo.engine] };
      spriteCache.set(key, s);
    }
    return s;
  }

  // PixelLab 초기 이미지(init_image)로 쓸 위치 템플릿 — tools/export-templates.js 가 호출
  window.SKYWAR_TEMPLATES = (color = PAINTS[0]) => {
    const out = {};
    for (const id of Object.keys(PARTS)) {
      const p = PARTS[id];
      if (p.kind === 'none') continue;
      out[id] = gridToCanvas(proceduralLayer(p.slot, id, color, 0), true, 0).toDataURL('image/png');
    }
    // 전체 조립 예시 (참고용): 부품을 모두 겹친 모습
    const lo = { body: 'b2', wing: 'w2', engine: 'e2', gun: 'g2', special: 's2' };
    const g = new Array(N * N).fill(null);
    for (const slot of LAYER_ORDER) {
      const l = proceduralLayer(slot, lo[slot], color, 0);
      for (let i = 0; i < g.length; i++) if (l[i]) g[i] = l[i];
    }
    out.example = gridToCanvas(g, true, 0).toDataURL('image/png');
    return out;
  };

  // ===================== 지형 (시드 노이즈) =====================
  const TPAD = 320, TS = 2; // 지도 1픽셀 = 월드 2단위
  const MAPW = Math.ceil((WORLD + TPAD * 2) / TS);
  let terrain = null, heights = null;
  function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function buildTerrain() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = MAPW;
    const cx = cv.getContext('2d');
    const img = cx.createImageData(MAPW, MAPW);
    heights = new Float32Array(MAPW * MAPW);
    const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const P = {
      deep: hex('#1b3a6b'), sea: hex('#245a9c'), shallow: hex('#2f7bc8'), foam: hex('#7cc4f0'), sand: hex('#e8d79a'), sand2: hex('#d6c286'),
      grass: hex('#5aa84a'), grass2: hex('#4e9a42'), forest: hex('#2f7a3a'), forest2: hex('#246030'),
      hill: hex('#7a6a4a'), hill2: hex('#6a5b3e'), rock: hex('#9a9a9a'), snow: hex('#ececec'), roof: hex('#c0392b'), wall: hex('#f0e6d0'),
    };
    for (let j = 0; j < MAPW; j++) for (let i = 0; i < MAPW; i++) {
      const wx = i * TS - TPAD, wy = j * TS - TPAD;
      let h = 0, amp = 1, f = 1 / 420, tot = 0;
      for (let o = 0; o < 5; o++) { h += vnoise(wx * f, wy * f, 7 + o) * amp; tot += amp; amp *= 0.5; f *= 2; }
      h /= tot;
      h = h * 1.25 - 0.17;
      heights[j * MAPW + i] = h;
      const d = hash(i, j, 3); // 디더링
      let c;
      if (h < 0.36) c = P.deep;
      else if (h < 0.45) c = d < (h - 0.36) * 6 ? P.sea : P.deep;
      else if (h < 0.5) c = P.sea;
      else if (h < 0.525) c = P.shallow;
      else if (h < 0.535) c = P.foam;
      else if (h < 0.56) c = d < 0.3 ? P.sand2 : P.sand;
      else if (h < 0.66) c = d < 0.004 ? P.roof : d < 0.008 ? P.wall : d < 0.35 ? P.grass2 : P.grass;
      else if (h < 0.75) c = d < 0.45 ? P.forest2 : P.forest;
      else if (h < 0.83) c = d < 0.4 ? P.hill2 : P.hill;
      else c = h > 0.88 ? P.snow : P.rock;
      const k = (i * 4 + j * MAPW * 4);
      const outside = wx < 0 || wy < 0 || wx > WORLD || wy > WORLD;
      let m = outside ? 0.55 : 1;
      if (outside && ((i + j) >> 3) % 4 === 0) m = 0.45;
      img.data[k] = c[0] * m; img.data[k + 1] = c[1] * m * (outside ? 0.85 : 1); img.data[k + 2] = c[2] * m * (outside ? 0.85 : 1); img.data[k + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    // 작전 구역 경계선
    cx.fillStyle = '#ff4a4a';
    const b0 = TPAD / TS, b1 = (TPAD + WORLD) / TS;
    for (let t = b0; t <= b1; t += 4) { cx.fillRect(t, b0, 2, 1); cx.fillRect(t, b1, 2, 1); cx.fillRect(b0, t, 1, 2); cx.fillRect(b1, t, 1, 2); }
    terrain = cv;
  }
  function heightAt(wx, wy) {
    const i = Math.floor((wx + TPAD) / TS), j = Math.floor((wy + TPAD) / TS);
    if (i < 0 || j < 0 || i >= MAPW || j >= MAPW) return 0;
    return heights[j * MAPW + i];
  }

  // 구름
  function buildCloud(seed) {
    const w = 60 + Math.floor(hash(seed, 1, 9) * 70), h = 30 + Math.floor(hash(seed, 2, 9) * 30);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const cx = cv.getContext('2d');
    const blobs = [];
    for (let i = 0; i < 7; i++) blobs.push([w * (0.2 + 0.6 * hash(seed, i, 1)), h * (0.35 + 0.3 * hash(seed, i, 2)), Math.min(w, h) * (0.25 + 0.2 * hash(seed, i, 4))]);
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      let inside = 0;
      for (const [bx, by, br] of blobs) { const d = Math.hypot(x - bx, (y - by) * 1.3); if (d < br) inside = Math.max(inside, 1 - d / br); }
      if (inside > 0) { cx.fillStyle = y > h * 0.62 ? '#d3dcec' : '#ffffff'; cx.fillRect(x, y, 2, 2); }
    }
    return cv;
  }
  const clouds = [];
  for (let i = 0; i < 26; i++) clouds.push({ x: hash(i, 5, 2) * 3200, y: hash(i, 6, 2) * 3200, img: null, seed: i });

  // ===================== 소리 =====================
  let actx = null;
  function sfx(type, vol = 1) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, g = actx.createGain();
      g.connect(actx.destination);
      if (type === 'shot' || type === 'laser') {
        const o = actx.createOscillator();
        o.type = type === 'laser' ? 'sawtooth' : 'square';
        o.frequency.setValueAtTime(type === 'laser' ? 1400 : 700, t);
        o.frequency.exponentialRampToValueAtTime(type === 'laser' ? 300 : 120, t + 0.06);
        g.gain.setValueAtTime(0.035 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        o.connect(g); o.start(t); o.stop(t + 0.08);
      } else {
        const len = type === 'boom' ? 0.6 : 0.25;
        const buf = actx.createBuffer(1, actx.sampleRate * len, actx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
        const src = actx.createBufferSource(); src.buffer = buf;
        const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = type === 'boom' ? 600 : 1500;
        g.gain.value = (type === 'boom' ? 0.25 : 0.08) * vol;
        src.connect(f); f.connect(g); src.start(t);
      }
    } catch (e) { /* 소리 없이 진행 */ }
  }

  // ===================== 네트워크 =====================
  let ws = null, profile = null;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
  };
  function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
  function connect() {
    $('status').classList.remove('hidden');
    $('status').textContent = '서버에 연결 중…';
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = () => {
      $('status').classList.add('hidden');
      send({ t: 'hello', token: store.get('skywar_token'), name: $('name').value });
    };
    ws.onclose = () => {
      $('status').classList.remove('hidden');
      $('status').textContent = '연결이 끊겼습니다. 다시 연결 중…';
      if (G) exitBattle(false);
      setTimeout(connect, 2000);
    };
    ws.onmessage = e => onMsg(JSON.parse(e.data));
  }
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.add('hidden'), 2000);
  }

  let G = null; // 전투 상태
  function onMsg(m) {
    switch (m.t) {
      case 'welcome': store.set('skywar_token', m.token); break;
      case 'profile': profile = m; renderHangar(); break;
      case 'coins': if (profile) { profile.coins = m.coins; $('coins').textContent = m.coins; } break;
      case 'err': toast(m.msg); break;
      case 'start': startBattle(m); break;
      default: if (G) battleMsg(m);
    }
  }

  // ===================== 격납고 =====================
  let tab = 'body', hoverPart = null;
  const previewCv = $('preview'), pctx = previewCv.getContext('2d');
  const myColor = () => (profile && profile.color) || PAINTS[0];
  $('name').value = store.get('skywar_name') || '';
  $('name').addEventListener('change', () => {
    store.set('skywar_name', $('name').value);
    if (ws && ws.readyState === 1) send({ t: 'hello', token: store.get('skywar_token'), name: $('name').value });
  });

  function previewLoadout() {
    const lo = { ...profile.loadout };
    if (hoverPart) lo[PARTS[hoverPart].slot] = hoverPart;
    return lo;
  }
  function statRows(lo) {
    const s = stats(lo), g = s.gun, sp = s.special;
    const dps = g.dmg * g.rate * (g.twin ? 2 : 1);
    const spv = sp.kind === 'none' ? 0 : sp.dmg * sp.count / sp.cd;
    return [
      ['체력', s.hp, 230, s.hp],
      ['선회력', s.turn, 4, s.turn.toFixed(1)],
      ['가속', s.accel, 300, Math.round(s.accel)],
      ['최고속도', s.maxV, 310, s.maxV],
      ['화력', dps, 130, Math.round(dps)],
      ['보조무기', spv, 16, sp.kind === 'none' ? '-' : spv.toFixed(1)],
    ];
  }
  function renderStats() {
    const now = statRows(profile.loadout), pv = statRows(previewLoadout());
    $('stats').innerHTML = pv.map((r, i) => {
      const cur = now[i][1], w = Math.min(100, r[1] / r[2] * 100), wc = Math.min(100, cur / r[2] * 100);
      const cls = r[1] > cur + 1e-6 ? 'up' : r[1] < cur - 1e-6 ? 'down' : '';
      return `<div class="stat">${r[0]}<div class="bar"><i class="${cls}" style="width:${Math.max(w, wc)}%"></i>${cls ? `<i style="width:${Math.min(w, wc)}%"></i>` : ''}</div><b>${r[3]}</b></div>`;
    }).join('');
  }
  function partSpec(p) {
    switch (p.slot) {
      case 'body': return `체력 ${p.hp} · 무게 ${p.mass}${p.stealth ? ' · 스텔스' : ''}`;
      case 'wing': return `선회 ${p.turn}`;
      case 'engine': return `가속 ${p.thrust} · 최고 ${p.maxV}`;
      case 'gun': return `피해 ${p.dmg}${p.twin ? '×2' : ''} · 연사 ${p.rate}/초`;
      case 'special': return p.kind === 'none' ? '—' : `피해 ${p.dmg}×${p.count} · 대기 ${p.cd}초`;
    }
  }
  function renderHangar() {
    if (!profile) return;
    $('coins').textContent = profile.coins;
    $('record').textContent = `${profile.kills} 격추 / ${profile.deaths} 피격`;
    $('paints').innerHTML = PAINTS.map(c => `<button data-paint="${c}" class="${c === myColor() ? 'on' : ''}" style="background:${c}" aria-label="도색 ${c}"></button>`).join('');
    $('tabs').innerHTML = SLOTS.map(s => `<button data-tab="${s.id}" class="${s.id === tab ? 'on' : ''}">${s.name}</button>`).join('');
    const list = Object.keys(PARTS).filter(k => PARTS[k].slot === tab);
    $('parts').innerHTML = list.map(k => {
      const p = PARTS[k], own = profile.owned.includes(k), eq = profile.loadout[p.slot] === k;
      let btn;
      if (eq) btn = `<button class="on" disabled>장착 중</button>`;
      else if (own) btn = `<button class="equip" data-equip="${k}">장착</button>`;
      else btn = `<button class="buy" data-buy="${k}" ${profile.coins < p.price ? 'disabled' : ''}>구매 · ${p.price} 코인</button>`;
      return `<div class="card ${eq ? 'eq' : ''}" data-part="${k}"><canvas width="${SZ}" height="${SZ}" data-icon="${k}"></canvas><div class="nm">${p.name}</div><div class="ds">${p.desc}</div><div class="ds">${'★'.repeat(p.tier)}</div><div class="sp">${partSpec(p)}</div>${btn}</div>`;
    }).join('');
    for (const cv of document.querySelectorAll('[data-icon]')) {
      const lo = { ...profile.loadout, [PARTS[cv.dataset.icon].slot]: cv.dataset.icon };
      cv.getContext('2d').drawImage(sprites(lo, myColor()).frames[0], 0, 0);
    }
    renderStats();
  }
  $('paints').addEventListener('click', e => { const c = e.target.dataset.paint; if (c) send({ t: 'paint', color: c }); });
  $('tabs').addEventListener('click', e => { const t = e.target.dataset.tab; if (t) { tab = t; hoverPart = null; renderHangar(); } });
  $('parts').addEventListener('click', e => {
    const b = e.target.dataset.buy, q = e.target.dataset.equip;
    if (b) send({ t: 'buy', part: b });
    if (q) send({ t: 'equip', part: q });
  });
  $('parts').addEventListener('mouseover', e => {
    const card = e.target.closest('.card');
    const k = card ? card.dataset.part : null;
    if (k !== hoverPart) { hoverPart = k; renderStats(); }
  });
  $('parts').addEventListener('mouseleave', () => { hoverPart = null; renderStats(); });

  function drawPreview(t) {
    if (!profile || G) return;
    const W = 150; // 내부 해상도 (CSS로 확대)
    if (previewCv.width !== W) { previewCv.width = previewCv.height = W; }
    pctx.imageSmoothingEnabled = false;
    // 격납고 바닥
    pctx.fillStyle = '#2b3330'; pctx.fillRect(0, 0, W, W);
    pctx.fillStyle = '#323b37';
    for (let y = 0; y < W; y += 16) for (let x = (y / 16) % 2 * 16; x < W; x += 32) pctx.fillRect(x, y, 16, 16);
    pctx.fillStyle = '#d9b030';
    for (let x = 4; x < W; x += 12) { pctx.fillRect(x, 8, 6, 2); pctx.fillRect(x, W - 10, 6, 2); }
    const lo = previewLoadout();
    const sp = sprites(lo, myColor());
    const bob = Math.round(Math.sin(t / 500) * 1.5);
    const S = 4, ox = Math.floor(W / 2 - SZ * S / 2), oy = Math.floor(W / 2 - SZ * S / 2);
    pctx.globalAlpha = 0.35;
    pctx.drawImage(sp.shadow, ox + 6, oy + 10, SZ * S, SZ * S);
    pctx.globalAlpha = 1;
    pctx.drawImage(sp.frames[Math.floor(t / 60) % sp.frames.length], ox, oy + bob, SZ * S, SZ * S);
    for (const [nx, ny] of sp.noz) {
      const f = 2 + Math.floor(Math.random() * 3);
      pctx.fillStyle = '#ffd34d'; pctx.fillRect(ox + nx * S - 2, oy + bob + ny * S, 4, f * S * 0.6);
      pctx.fillStyle = '#ff7a2a'; pctx.fillRect(ox + nx * S - 2, oy + bob + ny * S + f * S * 0.6, 4, S);
    }
  }

  // ===================== 전투 =====================
  const canvas = $('game'), ctx = canvas.getContext('2d');
  let VW = 480, VH = 270, SCALE = 2;
  function resize() {
    SCALE = Math.max(1, Math.min(8, Math.round(Math.min(innerWidth / 480, innerHeight / (isTouch ? 190 : 280)))));
    VW = Math.ceil(innerWidth / SCALE); VH = Math.ceil(innerHeight / SCALE);
    canvas.width = VW; canvas.height = VH;
    canvas.style.width = VW * SCALE + 'px'; canvas.style.height = VH * SCALE + 'px';
  }
  addEventListener('resize', resize);

  const keys = {};
  const touch = { turn: 0, thr: 0, fire: false, sp: false, active: false };
  addEventListener('keydown', e => {
    if (!G) return;
    keys[e.code] = true;
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape') exitBattle(true);
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function readInput() {
    const k = keys;
    let turn = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    let thr = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    if (touch.active) { if (!turn) turn = touch.turn; if (!thr) thr = touch.thr; }
    return {
      turn, thr,
      fire: !!(k.Space || k.KeyJ || touch.fire),
      sp: !!(k.ShiftLeft || k.ShiftRight || k.KeyK || touch.sp),
    };
  }

  // 터치 조작
  const isTouch = 'ontouchstart' in window;
  (function setupTouch() {
    const stick = $('stick'), knob = $('knob');
    let sid = null;
    const moveStick = t => {
      const r = stick.getBoundingClientRect();
      let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
      const l = Math.hypot(dx, dy), max = r.width / 2;
      if (l > max) { dx *= max / l; dy *= max / l; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      touch.turn = Math.abs(dx) > 10 ? Math.max(-1, Math.min(1, dx / (max * 0.7))) : 0;
      touch.thr = dy < -max * 0.45 ? 1 : dy > max * 0.45 ? -1 : 0;
    };
    stick.addEventListener('touchstart', e => { touch.active = true; sid = e.changedTouches[0].identifier; moveStick(e.changedTouches[0]); e.preventDefault(); }, { passive: false });
    stick.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === sid) moveStick(t); e.preventDefault(); }, { passive: false });
    const endStick = e => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; touch.turn = 0; touch.thr = 0; knob.style.transform = ''; } };
    stick.addEventListener('touchend', endStick); stick.addEventListener('touchcancel', endStick);
    const hold = (el, key) => {
      el.addEventListener('touchstart', e => { touch.active = true; touch[key] = true; e.preventDefault(); }, { passive: false });
      el.addEventListener('touchend', () => { touch[key] = false; });
      el.addEventListener('touchcancel', () => { touch[key] = false; });
    };
    hold($('tFire'), 'fire'); hold($('tSp'), 'sp');
    $('tExit').addEventListener('click', () => exitBattle(true));
  })();

  function startBattle(m) {
    G = {
      you: m.you, info: new Map(), snaps: [], parts: [], feed: [], sb: [], respawnIn: 0,
      cam: { x: WORLD / 2, y: WORLD / 2 }, look: { x: 0, y: 0 }, shake: 0, flash: 0,
      lastIn: '', lastInT: 0, myHp: null, coins0: profile ? profile.coins : 0, gunT: 0, spT: 0,
      deadPos: null, smokeT: 0,
    };
    if (!terrain) buildTerrain();
    for (const c of clouds) if (!c.img) c.img = buildCloud(c.seed);
    $('hangar').classList.add('hidden');
    canvas.classList.remove('hidden');
    if (isTouch) $('touch').classList.remove('hidden');
    resize();
  }
  function exitBattle(tell) {
    if (tell) send({ t: 'leave' });
    G = null;
    for (const k in keys) keys[k] = false;
    canvas.classList.add('hidden');
    $('touch').classList.add('hidden');
    $('hangar').classList.remove('hidden');
    renderHangar();
  }
  $('fly').addEventListener('click', () => {
    if (!profile) return;
    sfx('shot', 0); // 오디오 잠금 해제
    send({ t: 'play' });
  });

  function battleMsg(m) {
    switch (m.t) {
      case 'pinfo': G.info.set(m.id, m); break;
      case 'pgone': G.info.delete(m.id); break;
      case 's': {
        const planes = new Map(), shots = new Map();
        for (const p of m.p) planes.set(p[0], p);
        for (const s of m.s) shots.set(s[0], s);
        G.snaps.push({ time: performance.now(), planes, shots });
        if (G.snaps.length > 30) G.snaps.shift();
        for (const f of m.fx) spawnFx(f[0], f[1], f[2]);
        break;
      }
      case 'kill':
        G.feed.push({ ...m, time: performance.now() });
        if (G.feed.length > 5) G.feed.shift();
        break;
      case 'sb': G.sb = m.list; break;
      case 'respawn': G.respawnIn = m.in; break;
    }
  }

  // 파티클
  function part(x, y, vx, vy, life, c, size, kind) { G.parts.push({ x, y, vx, vy, life, max: life, c, size, kind }); }
  function spawnFx(x, y, type) {
    const near = Math.hypot(x - G.cam.x, y - G.cam.y) < 400;
    if (type === 'h') {
      for (let i = 0; i < 5; i++) part(x, y, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, 0.25, Math.random() < 0.5 ? '#ffe066' : '#ffffff', 1);
      if (near) sfx('hit', 0.4);
    } else if (type === 'e' || type === 'x') {
      const big = type === 'x';
      const n = big ? 40 : 18;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, s = Math.random() * (big ? 120 : 70);
        const c = ['#ffffff', '#ffe066', '#ff9a2a', '#e43b44'][Math.floor(Math.random() * 4)];
        part(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.3 + Math.random() * (big ? 0.7 : 0.4), c, big ? 3 : 2, 'fire');
      }
      for (let i = 0; i < (big ? 14 : 6); i++) part(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 1 + Math.random(), '#55555a', 3, 'smoke');
      if (big) for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28; part(x, y, Math.cos(a) * 90, Math.sin(a) * 90, 0.8, '#2b2e36', 2, 'debris'); }
      if (near) { sfx(big ? 'boom' : 'hit', big ? 1 : 0.7); if (big) G.shake = Math.max(G.shake, 5); }
    } else if (type === 's') {
      for (let i = 0; i < 6; i++) part(x, y, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, 0.6, '#8a8a90', 2, 'smoke');
    }
  }

  function lerpAng(a, b, t) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }
  function interpolate(now) {
    const snaps = G.snaps;
    if (!snaps.length) return null;
    const rt = now - 80;
    let a = snaps[0], b = snaps[snaps.length - 1];
    for (let i = snaps.length - 1; i > 0; i--) if (snaps[i - 1].time <= rt) { a = snaps[i - 1]; b = snaps[i]; break; }
    const t = b.time === a.time ? 1 : Math.max(0, Math.min(1, (rt - a.time) / (b.time - a.time)));
    const planes = [], shots = [];
    for (const [id, pb] of b.planes) {
      const pa = a.planes.get(id);
      if (pa && pa[5] && pb[5]) planes.push({ id, x: pa[1] + (pb[1] - pa[1]) * t, y: pa[2] + (pb[2] - pa[2]) * t, a: lerpAng(pa[3], pb[3], t), hp: pb[4], alive: 1, thr: pb[6], inv: pb[7], out: pb[8] });
      else planes.push({ id, x: pb[1], y: pb[2], a: pb[3], hp: pb[4], alive: pb[5], thr: pb[6], inv: pb[7], out: pb[8] });
    }
    for (const [id, sb] of b.shots) {
      const sa = a.shots.get(id);
      if (sa) shots.push({ x: sa[1] + (sb[1] - sa[1]) * t, y: sa[2] + (sb[2] - sa[2]) * t, k: sb[3], a: sb[4] });
      else if (t > 0.5) shots.push({ x: sb[1], y: sb[2], k: sb[3], a: sb[4] });
    }
    return { planes, shots };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!G) { drawPreview(now); return; }
    const dt = Math.min(0.05, (now - (G.lastFrame || now)) / 1000);
    G.lastFrame = now;

    // 입력 전송
    const inp = readInput();
    const js = JSON.stringify(inp);
    if (js !== G.lastIn || now - G.lastInT > 250) { send({ t: 'in', ...inp }); G.lastIn = js; G.lastInT = now; }

    const st = interpolate(now);
    ctx.imageSmoothingEnabled = false;
    if (!st) { ctx.fillStyle = '#1b3a6b'; ctx.fillRect(0, 0, VW, VH); return; }
    const me = st.planes.find(p => p.id === G.you);
    const myInfo = G.info.get(G.you);

    // 내 비행기 상태 → 효과음·흔들림
    if (me && me.alive) {
      if (G.myHp !== null && me.hp < G.myHp) { G.shake = Math.max(G.shake, 3); G.flash = 0.25; }
      G.myHp = me.hp;
      G.deadPos = null;
      if (myInfo && inp.fire && !me.inv) {
        const gun = PARTS[myInfo.lo.gun];
        G.gunT -= dt;
        if (G.gunT <= 0) { sfx(gun.laser ? 'laser' : 'shot'); G.gunT = 1 / gun.rate; }
      }
    } else { G.myHp = null; if (me && !G.deadPos) G.deadPos = { x: me.x, y: me.y }; }

    // 카메라
    if (me && me.alive) {
      const tx = Math.cos(me.a) * 50, ty = Math.sin(me.a) * 50;
      G.look.x += (tx - G.look.x) * Math.min(1, dt * 2); G.look.y += (ty - G.look.y) * Math.min(1, dt * 2);
      G.cam.x = me.x + G.look.x; G.cam.y = me.y + G.look.y;
    }
    G.shake = Math.max(0, G.shake - dt * 12);
    const sx = (Math.random() - 0.5) * G.shake, sy = (Math.random() - 0.5) * G.shake;
    const camX = Math.round(G.cam.x - VW / 2 + sx), camY = Math.round(G.cam.y - VH / 2 + sy);

    // 지형
    ctx.fillStyle = '#0f2140'; ctx.fillRect(0, 0, VW, VH);
    const mx = (camX + TPAD) / TS, my = (camY + TPAD) / TS;
    const fx0 = Math.floor(mx), fy0 = Math.floor(my);
    ctx.drawImage(terrain, fx0, fy0, Math.ceil(VW / TS) + 2, Math.ceil(VH / TS) + 2,
      Math.round((fx0 - mx) * TS), Math.round((fy0 - my) * TS), (Math.ceil(VW / TS) + 2) * TS, (Math.ceil(VH / TS) + 2) * TS);
    // 반짝이는 파도
    ctx.fillStyle = '#9fd4ff';
    const C = 18, tt = now / 1000;
    for (let gy = Math.floor(camY / C); gy <= (camY + VH) / C; gy++) for (let gx = Math.floor(camX / C); gx <= (camX + VW) / C; gx++) {
      const h = hash(gx, gy, 11);
      if (h > 0.25) continue;
      const wx = gx * C + Math.floor(h * 40) % C, wy = gy * C + Math.floor(h * 97) % C;
      const hh = heightAt(wx, wy);
      if (hh > 0.5 || hh < 0.3) continue;
      const ph = (tt * 0.8 + h * 10) % 2;
      if (ph < 1) { const w = ph < 0.5 ? 2 : 3; ctx.fillRect(wx - camX, wy - camY, w, 1); }
    }

    // 그림자
    for (const p of st.planes) {
      if (!p.alive) continue;
      const info = G.info.get(p.id); if (!info) continue;
      const sp = sprites(info.lo, info.color);
      ctx.save(); ctx.globalAlpha = 0.28;
      ctx.translate(Math.round(p.x - camX + 10), Math.round(p.y - camY + 14)); ctx.rotate(p.a + Math.PI / 2);
      ctx.drawImage(sp.shadow, -SZ / 2, -SZ / 2); ctx.restore();
    }

    // 파티클 (아래층: 연기)
    G.smokeT -= dt;
    const emitSmoke = G.smokeT <= 0;
    if (emitSmoke) G.smokeT = 0.05;
    for (const p of G.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 2; p.vy *= 1 - dt * 2; }
    G.parts = G.parts.filter(p => p.life > 0);
    if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
    for (const p of G.parts) {
      if (p.kind !== 'smoke') continue;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(0.7, k);
      ctx.fillStyle = p.c;
      const s = Math.round(p.size + (1 - k) * 3);
      ctx.fillRect(Math.round(p.x - camX - s / 2), Math.round(p.y - camY - s / 2), s, s);
    }
    ctx.globalAlpha = 1;

    // 탄환
    for (const s of st.shots) {
      const x = Math.round(s.x - camX), y = Math.round(s.y - camY);
      if (x < -20 || y < -20 || x > VW + 20 || y > VH + 20) continue;
      const c = Math.cos(s.a), n = Math.sin(s.a);
      if (s.k === 'b') {
        ctx.fillStyle = '#ffb02e'; ctx.fillRect(Math.round(x - c * 3), Math.round(y - n * 3), 1, 1);
        ctx.fillStyle = '#fff3a0'; ctx.fillRect(x, y, 2, 2);
      } else if (s.k === 'l') {
        ctx.fillStyle = '#5ff7ff';
        for (let i = 0; i < 7; i++) ctx.fillRect(Math.round(x - c * i), Math.round(y - n * i), 1, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1);
      } else {
        ctx.fillStyle = s.k === 'm' ? '#f4f4f4' : '#aab0b8';
        for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x - c * i), Math.round(y - n * i), 2, 2);
        ctx.fillStyle = '#e43b44'; ctx.fillRect(x, y, 2, 2);
        ctx.fillStyle = Math.random() < 0.5 ? '#ffd34d' : '#ff7a2a'; ctx.fillRect(Math.round(x - c * 6), Math.round(y - n * 6), 2, 2);
        if (emitSmoke) part(s.x - c * 7, s.y - n * 7, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 0.9, '#c8c8d0', 2, 'smoke');
      }
    }

    // 비행기
    for (const p of st.planes) {
      if (!p.alive) continue;
      const info = G.info.get(p.id); if (!info) continue;
      const sp = sprites(info.lo, info.color);
      const x = Math.round(p.x - camX), y = Math.round(p.y - camY);
      if (x < -30 || y < -30 || x > VW + 30 || y > VH + 30) continue;
      if (p.inv && Math.floor(now / 100) % 2) continue; // 무적 깜빡임
      ctx.save();
      ctx.translate(x, y); ctx.rotate(p.a + Math.PI / 2);
      // 엔진 불꽃
      for (const [nx, ny] of sp.noz) {
        const len = (p.thr > 0 ? 5 : p.thr < 0 ? 1 : 3) + Math.floor(Math.random() * 2);
        const bx = nx + PAD - SZ / 2 - 1, by = ny + PAD - SZ / 2;
        ctx.fillStyle = '#ff7a2a'; ctx.fillRect(bx, by, 2, len + 1);
        ctx.fillStyle = '#ffe066'; ctx.fillRect(bx, by, 2, Math.ceil(len / 2));
      }
      ctx.drawImage(sp.frames[Math.floor(now / 50) % sp.frames.length], -SZ / 2, -SZ / 2);
      ctx.restore();
      // 손상 연기
      const hpk = p.hp / info.maxHp;
      if (emitSmoke && hpk < 0.4) part(p.x - Math.cos(p.a) * 10, p.y - Math.sin(p.a) * 10, 0, 0, 0.8, hpk < 0.2 ? '#333338' : '#77777d', 2, 'smoke');
      if (emitSmoke && hpk < 0.2 && Math.random() < 0.5) part(p.x - Math.cos(p.a) * 8, p.y - Math.sin(p.a) * 8, 0, 0, 0.3, '#ff9a2a', 2, 'fire');
      // 이름·체력
      if (p.id !== G.you) {
        ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#000a'; ctx.fillText(info.name, x + 1, y - 15);
        ctx.fillStyle = info.color; ctx.fillText(info.name, x, y - 16);
        ctx.fillStyle = '#000a'; ctx.fillRect(x - 12, y - 15, 24, 3);
        ctx.fillStyle = hpk > 0.5 ? '#5fe07a' : hpk > 0.25 ? '#ffcc4d' : '#ff5a5a';
        ctx.fillRect(x - 11, y - 14, Math.max(0, Math.round(22 * hpk)), 1);
      }
    }

    // 파티클 (위층: 불꽃·파편)
    for (const p of G.parts) {
      if (p.kind === 'smoke') continue;
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // 구름 (시차 효과로 더 빠르게 지나감)
    const SPAN = 3200;
    ctx.globalAlpha = 0.82;
    for (const c of clouds) {
      const cx = ((c.x - G.cam.x * 1.35 + tt * 6) % SPAN + SPAN) % SPAN - 400;
      const cy = ((c.y - G.cam.y * 1.35) % SPAN + SPAN) % SPAN - 400;
      if (cx > VW || cy > VH || cx + c.img.width < 0 || cy + c.img.height < 0) continue;
      ctx.drawImage(c.img, Math.round(cx), Math.round(cy));
    }
    ctx.globalAlpha = 1;

    drawHud(now, st, me, myInfo);
  }

  // ===================== HUD =====================
  function text(s, x, y, c = '#fff', align = 'left') {
    ctx.font = FONT; ctx.textAlign = align; ctx.textBaseline = 'top';
    ctx.fillStyle = '#000b'; ctx.fillText(s, x + 1, y + 1);
    ctx.fillStyle = c; ctx.fillText(s, x, y);
  }
  function drawHud(now, st, me, myInfo) {
    // 피격 섬광
    if (G.flash > 0) { G.flash -= 1 / 60; ctx.fillStyle = `rgba(255,40,40,${Math.max(0, G.flash)})`; ctx.fillRect(0, 0, VW, VH); }

    // 화면 밖 적 방향 표시
    if (me && me.alive) for (const p of st.planes) {
      if (p.id === G.you || !p.alive) continue;
      const info = G.info.get(p.id); if (!info || info.stealth) continue;
      const dx = p.x - G.cam.x, dy = p.y - G.cam.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) < VW / 2 - 10 && Math.abs(dy) < VH / 2 - 10) continue;
      if (d > 1100) continue;
      const k = Math.min((VW / 2 - 14) / Math.abs(dx || 1e-6), (VH / 2 - 14) / Math.abs(dy || 1e-6));
      const ax = VW / 2 + dx * k, ay = VH / 2 + dy * k, a = Math.atan2(dy, dx);
      ctx.save(); ctx.translate(Math.round(ax), Math.round(ay)); ctx.rotate(a);
      ctx.fillStyle = info.color;
      ctx.fillRect(0, -1, 3, 3); ctx.fillRect(-2, -2, 2, 5); ctx.fillRect(-4, -3, 2, 7);
      ctx.restore();
    }

    // 왼쪽 위: 체력·속도·보조무기
    if (me && myInfo) {
      const maxHp = myInfo.maxHp, hp = me.alive ? me.hp : 0;
      text('체력', 8, 7);
      ctx.fillStyle = '#000a'; ctx.fillRect(36, 8, 82, 10);
      ctx.fillStyle = '#3b4360'; ctx.fillRect(37, 9, 80, 8);
      const w = Math.round(80 * hp / maxHp);
      ctx.fillStyle = hp / maxHp > 0.5 ? '#5fe07a' : hp / maxHp > 0.25 ? '#ffcc4d' : '#ff5a5a';
      ctx.fillRect(37, 9, w, 8);
      ctx.fillStyle = '#ffffff55'; ctx.fillRect(37, 9, w, 2);
      text(`${hp}`, 122, 7);
      const spk = PARTS[myInfo.lo.special];
      if (spk.kind !== 'none') {
        // 보조무기 재사용 대기 (클라이언트 추정)
        const inp = readInput();
        if (me.alive && inp.sp && G.spT <= 0 && !me.inv) G.spT = spk.cd;
        G.spT = Math.max(0, G.spT - 1 / 60);
        text(spk.name, 8, 21, G.spT > 0 ? '#8d95b0' : '#4ab3ff');
        ctx.fillStyle = '#000a'; ctx.fillRect(8, 35, 60, 4);
        ctx.fillStyle = G.spT > 0 ? '#8d95b0' : '#4ab3ff';
        ctx.fillRect(9, 36, Math.round(58 * (1 - G.spT / spk.cd)), 2);
      }
    }
    // 코인
    if (profile) text(`코인 ${profile.coins}  (+${profile.coins - G.coins0})`, 8, VH - 18, '#ffcc4d');

    // 미니맵
    const MS = Math.min(80, Math.round(VH * 0.28)), mx0 = VW - MS - 8, my0 = 8, k = MS / WORLD;
    ctx.fillStyle = '#000a'; ctx.fillRect(mx0 - 1, my0 - 1, MS + 2, MS + 2);
    ctx.fillStyle = '#1f3d6acc'; ctx.fillRect(mx0, my0, MS, MS);
    ctx.fillStyle = '#ffffff30';
    ctx.fillRect(Math.round(mx0 + (G.cam.x - VW / 2) * k), Math.round(my0 + (G.cam.y - VH / 2) * k), Math.max(2, Math.round(VW * k)), Math.max(2, Math.round(VH * k)));
    for (const p of st.planes) {
      if (!p.alive) continue;
      const info = G.info.get(p.id); if (!info) continue;
      const self = p.id === G.you;
      if (!self && info.stealth) continue;
      const x = Math.round(mx0 + Math.max(0, Math.min(WORLD, p.x)) * k), y = Math.round(my0 + Math.max(0, Math.min(WORLD, p.y)) * k);
      ctx.fillStyle = self ? (Math.floor(now / 250) % 2 ? '#ffffff' : '#4ab3ff') : info.color;
      ctx.fillRect(x - 1, y - 1, self ? 3 : 2, self ? 3 : 2);
    }

    // 킬 피드
    let fy = 8;
    for (const f of G.feed) {
      if (now - f.time > 6000) continue;
      const s = f.k ? `${f.k}  ▶  ${f.v}` : `${f.v} 추락`;
      text(s, VW / 2, fy, f.k === (G.info.get(G.you) || {}).name ? '#ffcc4d' : '#ffffff', 'center');
      fy += 14;
    }

    // 경고·사망
    if (me && me.alive && me.out && Math.floor(now / 300) % 2) text('⚠ 작전 구역 이탈! 기체가 손상됩니다 ⚠', VW / 2, VH / 2 - 50, '#ff5a5a', 'center');
    if (me && !me.alive) {
      text('격추당했습니다!', VW / 2, VH / 2 - 20, '#ff5a5a', 'center');
      text(`${Math.max(0, Math.ceil(G.respawnIn))}초 후 재출격 · Esc: 격납고`, VW / 2, VH / 2 - 4, '#ffffff', 'center');
    }

    // 순위표
    if (keys.Tab) {
      const rows = G.sb.filter(r => G.info.has(r[0]));
      const w = 200, h = 26 + rows.length * 14, x0 = Math.round(VW / 2 - w / 2), y0 = Math.round(VH / 2 - h / 2);
      ctx.fillStyle = '#000c'; ctx.fillRect(x0, y0, w, h);
      ctx.fillStyle = '#3b4360'; ctx.fillRect(x0, y0, w, 1); ctx.fillRect(x0, y0 + h - 1, w, 1);
      text('조종사', x0 + 8, y0 + 6, '#8d95b0'); text('격추', x0 + 140, y0 + 6, '#8d95b0', 'right'); text('피격', x0 + 190, y0 + 6, '#8d95b0', 'right');
      rows.forEach((r, i) => {
        const info = G.info.get(r[0]); const y = y0 + 22 + i * 14;
        text(`${i + 1}. ${info.name}`, x0 + 8, y, r[0] === G.you ? '#ffcc4d' : info.color);
        text(String(r[1]), x0 + 140, y, '#fff', 'right'); text(String(r[2]), x0 + 190, y, '#fff', 'right');
      });
    } else if (!isTouch) text('Tab 순위표 · Esc 격납고', VW - 8, VH - 18, '#ffffff80', 'right');
  }

  loadPartImages();
  connect();
  requestAnimationFrame(frame);
})();
