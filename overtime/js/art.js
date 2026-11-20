// 퇴근하겠습니다! — 픽셀 아트 (코드로 그림)
// sprites/<키>.png 가 있으면 그 그림을 대신 씀 (PixelLab 등). 가로로 이어 붙인 정사각형 프레임 띠.
(function () {
  const OUTLINE = '#1b1626';

  // ---------- 격자 그리기 도구 ----------
  function grid(w, h) { return { w, h, px: new Array(w * h).fill(null) }; }
  function P(g, x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.px[y * g.w + x] = c; }
  function rect(g, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P(g, x + i, y + j, c); }
  function brush(g, x, y, c, w) { const o = Math.floor((w - 1) / 2); for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) P(g, x - o + i, y - o + j, c); }
  function line(g, x0, y0, x1, y1, c, w = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    for (let s = 0; s <= n; s++) { const t = s / n; brush(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c, w); }
  }
  function ellipse(g, cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.05) P(g, cx + x, cy + y, c);
  }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
  }
  function toCanvas(g, outline = true) {
    const cv = document.createElement('canvas');
    cv.width = g.w; cv.height = g.h;
    const cx = cv.getContext('2d');
    const at = (x, y) => x >= 0 && y >= 0 && x < g.w && y < g.h ? g.px[y * g.w + x] : null;
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      let c = at(x, y);
      if (!c && outline && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) c = OUTLINE;
      if (c) { cx.fillStyle = c; cx.fillRect(x, y, 1, 1); }
    }
    return cv;
  }

  // ---------- 사람 인형(관절) ----------
  // 48×48 칸, 오른쪽을 봄. 발바닥 y=45.
  const FOOT = 45;
  const CHARS = {
    jiwoo: { skin: '#f3c9a1', hair: '#26212f', hairStyle: 'bob', shirt: '#eef1f7', tie: '#2d4a8a', pants: '#3a3f55', shoes: '#211b25', eye: '#26212f', badge: true },
    oh: { skin: '#eebd93', hair: '#5a3a28', hairStyle: 'short', shirt: '#b8743e', inner: '#f0ead8', pants: '#4b4f63', shoes: '#2a2020', eye: '#2a2020', glasses: true },
    bujang: { skin: '#eaa98a', hair: '#3a3a42', hairStyle: 'bald', shirt: '#4a4e60', inner: '#e4e7ee', tie: '#b02a2a', pants: '#4a4e60', shoes: '#1a1a1e', eye: '#2a2020', belly: true, mustache: true },
    zombie: { skin: '#a9c2a0', hair: '#3e3a48', hairStyle: 'messy', shirt: '#c7ccc0', tie: '#6a4a7a', pants: '#555a68', shoes: '#25222a', eye: '#ff4848', tired: true },
    zombie2: { skin: '#b3bf9c', hair: '#6a4a30', hairStyle: 'short', shirt: '#9fb0c8', tie: '#3a5a4a', pants: '#4a4a52', shoes: '#25222a', eye: '#ff4848', tired: true, glasses: true },
    worker: { skin: '#f0c49c', hair: '#3e3a48', hairStyle: 'messy', shirt: '#e8ecef', tie: '#6a4a7a', pants: '#555a68', shoes: '#25222a', eye: '#2a2020' },
    worker2: { skin: '#f0c49c', hair: '#6a4a30', hairStyle: 'short', shirt: '#b8c8de', tie: '#3a5a4a', pants: '#4a4a52', shoes: '#25222a', eye: '#2a2020', glasses: true },
  };

  function drawPuppet(d, pose) {
    const g = grid(48, 48);
    const hip = { x: 24 + (pose.hx || 0), y: FOOT - 14 + (pose.hy || 0) };
    const lean = pose.lean || 0;
    const sh = { x: hip.x + lean, y: hip.y - 11 };
    const hd = { x: sh.x + 1 + (pose.headX || 0), y: sh.y - 6 + (pose.headY || 0) };
    const leg = (a, dx) => {
      const h = { x: hip.x + dx, y: hip.y };
      const k = { x: h.x + Math.sin(a[0]) * 7, y: h.y + Math.cos(a[0]) * 7 };
      const f = { x: k.x + Math.sin(a[0] - a[1]) * 7, y: k.y + Math.cos(a[0] - a[1]) * 7 };
      return [h, k, f];
    };
    const arm = a => {
      const s = { x: sh.x, y: sh.y + 1 };
      const e = { x: s.x + Math.sin(a[0]) * 6, y: s.y + Math.cos(a[0]) * 6 };
      const h = { x: e.x + Math.sin(a[0] + a[1]) * 6, y: e.y + Math.cos(a[0] + a[1]) * 6 };
      return [s, e, h, a[0] + a[1]];
    };
    const drawLeg = (L, dark) => {
      const c = dark ? shade(d.pants, 0.75) : d.pants;
      line(g, L[0].x, L[0].y, L[1].x, L[1].y, c, 3);
      line(g, L[1].x, L[1].y, L[2].x, L[2].y, c, 3);
      rect(g, L[2].x - 1, L[2].y, 5, 2, dark ? shade(d.shoes, 0.8) : d.shoes);
    };
    const drawArm = (A, dark) => {
      const c = dark ? shade(d.shirt, 0.8) : d.shirt;
      line(g, A[0].x, A[0].y, A[1].x, A[1].y, c, 2);
      line(g, A[1].x, A[1].y, A[2].x, A[2].y, c, 2);
      rect(g, A[2].x - 1, A[2].y - 1, 2, 2, dark ? shade(d.skin, 0.85) : d.skin);
    };
    const LB = leg(pose.lb || [0, 0], -1), LF = leg(pose.lf || [0, 0], 1);
    const AB = arm(pose.ab || [0, 0]), AF = arm(pose.af || [0, 0]);

    if (pose.chair) { // 회전의자 (대시)
      const cx = hip.x, cy = hip.y;
      rect(g, cx - 7, cy + 1, 13, 2, '#2b2b33');
      rect(g, cx - 8, cy - 9, 2, 11, '#2b2b33'); rect(g, cx - 8, cy - 9, 2, 1, '#44444f');
      rect(g, cx - 1, cy + 3, 2, 4, '#77777f');
      rect(g, cx - 6, cy + 7, 12, 1, '#3a3a44');
      P(g, cx - 6, cy + 8, '#111'); P(g, cx, cy + 8, '#111'); P(g, cx + 5, cy + 8, '#111');
    }
    drawLeg(LB, true);
    drawArm(AB, true);
    if (pose.propBack === 'briefcase') rect(g, AB[2].x - 3, AB[2].y, 7, 5, '#6a4426');
    // 몸통
    const tw = d.belly ? 9 : 7;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, x = sh.x + (hip.x - sh.x) * t, y = sh.y + (hip.y - sh.y) * t;
      const bw = d.belly ? tw + Math.round(Math.sin(t * Math.PI) * 3) : tw;
      rect(g, x - Math.floor(bw / 2), y, bw, 1, d.shirt);
    }
    if (d.inner) line(g, sh.x + 2, sh.y + 1, sh.x + 2 + (hip.x - sh.x) * 0.5, sh.y + 6, d.inner, 2);
    if (d.tie) line(g, sh.x + 2, sh.y + 1, sh.x + 2 + (hip.x - sh.x) * 0.6, sh.y + 7, d.tie, 1);
    if (d.badge) { line(g, sh.x + 1, sh.y, sh.x + 1, sh.y + 4, '#3a6ad8', 1); rect(g, sh.x, sh.y + 5, 3, 3, '#f7f7f7'); P(g, sh.x + 1, sh.y + 6, '#3a6ad8'); }
    rect(g, hip.x - 4, hip.y - 1, 8, 2, shade(d.pants, 0.9)); // 허리
    drawLeg(LF, false);

    // 머리
    const hx = Math.round(hd.x), hy = Math.round(hd.y);
    rect(g, hx - 4, hy - 4, 9, 9, d.skin);
    P(g, hx - 4, hy + 4, null); P(g, hx + 4, hy + 4, null);
    rect(g, hx - 1, hy + 5, 3, 1, d.skin); // 목
    const H = d.hair;
    switch (d.hairStyle) {
      case 'bob': rect(g, hx - 5, hy - 6, 10, 3, H); rect(g, hx - 5, hy - 3, 4, 8, H); rect(g, hx - 1, hy - 3, 6, 1, H); P(g, hx + 4, hy - 2, H); rect(g, hx - 2, hy - 7, 6, 1, H); break;
      case 'short': rect(g, hx - 4, hy - 6, 9, 3, H); rect(g, hx - 5, hy - 4, 3, 4, H); P(g, hx + 4, hy - 3, H); break;
      case 'bald': rect(g, hx - 5, hy - 2, 2, 4, H); P(g, hx + 1, hy - 4, '#ffd0b8'); P(g, hx + 2, hy - 4, '#ffd0b8'); break;
      case 'messy': rect(g, hx - 4, hy - 6, 9, 3, H); rect(g, hx - 5, hy - 4, 3, 5, H); P(g, hx - 3, hy - 7, H); P(g, hx + 1, hy - 7, H); P(g, hx + 4, hy - 6, H); break;
    }
    const face = pose.face || 'normal';
    const E = d.eye;
    if (face === 'hurt') { P(g, hx + 1, hy - 1, E); P(g, hx + 2, hy, E); P(g, hx + 1, hy + 1, E); }
    else if (face === 'cool') { rect(g, hx, hy - 1, 5, 2, '#141418'); }
    else { P(g, hx + 2, hy - 1, E); P(g, hx + 2, hy, E); }
    if (d.glasses && face !== 'cool') { rect(g, hx + 1, hy - 2, 3, 1, '#2a2a30'); P(g, hx + 1, hy - 1, '#2a2a30'); P(g, hx + 3, hy - 1, '#2a2a30'); }
    if (d.tired) { P(g, hx + 1, hy + 1, '#6f5d8f'); P(g, hx + 2, hy + 1, '#6f5d8f'); }
    if (d.mustache) rect(g, hx + 1, hy + 2, 4, 1, H);
    if (face === 'shout') rect(g, hx + 2, hy + 2, 2, 2, '#7a2a2a');
    else if (face === 'smile') { P(g, hx + 2, hy + 2, '#7a3a2a'); P(g, hx + 3, hy + 3, '#7a3a2a'); P(g, hx + 4, hy + 2, '#7a3a2a'); }
    else if (face === 'zombie') { rect(g, hx + 2, hy + 2, 3, 1, '#4a2a3a'); P(g, hx + 3, hy + 3, '#e8e8e8'); }

    drawArm(AF, false);
    // 들고 있는 물건
    const hand = AF[2], dir = AF[3];
    const ux = Math.sin(dir), uy = Math.cos(dir);
    switch (pose.prop) {
      case 'folder': {
        line(g, hand.x, hand.y, hand.x + ux * 9, hand.y + uy * 9, '#e9c46a', 4);
        line(g, hand.x + ux * 2 - uy * 2, hand.y + uy * 2 + ux * 2, hand.x + ux * 7 - uy * 2, hand.y + uy * 7 + ux * 2, '#c99a3a', 1);
        break;
      }
      case 'stamp': line(g, hand.x, hand.y, hand.x + ux * 3, hand.y + uy * 3, '#7a3a2a', 2); line(g, hand.x + ux * 4, hand.y + uy * 4, hand.x + ux * 5, hand.y + uy * 5, '#d23a3a', 4); break;
      case 'stapler': rect(g, hand.x - 1, hand.y - 2, 7, 2, '#5a6070'); rect(g, hand.x - 1, hand.y, 7, 1, '#9aa0b0'); break;
      case 'phone': rect(g, hand.x - 1, hand.y - 4, 3, 5, '#2a2a33'); P(g, hand.x, hand.y - 3, '#7fd8ff'); break;
      case 'mug': rect(g, hand.x, hand.y - 2, 3, 3, '#f2f2f2'); P(g, hand.x + 3, hand.y - 1, '#f2f2f2'); break;
      case 'paper': rect(g, hand.x, hand.y - 4, 5, 6, '#f7f7f2'); line(g, hand.x + 1, hand.y - 2, hand.x + 3, hand.y - 2, '#9aa'); break;
    }
    return toCanvas(g);
  }

  // ---------- 동작(애니메이션) ----------
  const TAU = Math.PI * 2;
  const ANIMS = {
    idle: { n: 2, fps: 2.5, f: i => ({ hy: i, af: [0.15, 0.25], ab: [-0.15, 0.25], lf: [0.12, 0], lb: [-0.12, 0] }) },
    run: { n: 6, fps: 12, f: i => { const p = i / 6 * TAU, s = Math.sin(p); return { lean: 2, hy: -Math.round(Math.abs(Math.cos(p))), lf: [s * 0.75, Math.max(0, -s) * 1.2 + 0.15], lb: [-s * 0.75, Math.max(0, s) * 1.2 + 0.15], af: [-s * 0.8, 0.7], ab: [s * 0.8, 0.7] }; } },
    jump: { n: 1, fps: 1, f: () => ({ lean: 1, hy: -1, lf: [0.7, 1.3], lb: [-0.1, 0.7], af: [2.6, 0.3], ab: [1.8, 0.3] }) },
    fall: { n: 1, fps: 1, f: () => ({ lf: [0.35, 0.4], lb: [-0.35, 0.3], af: [2.1, 0.6], ab: [1.3, 0.5] }) },
    atk1: { n: 3, fps: 1, f: i => [
      { lean: -1, lf: [0.4, 0.3], lb: [-0.5, 0.2], af: [-1.4, 0.4], ab: [0.3, 0.3], prop: 'folder' },
      { lean: 3, hx: 1, lf: [0.6, 0.4], lb: [-0.6, 0.2], af: [1.65, 0], ab: [-0.6, 0.4], prop: 'folder' },
      { lean: 2, lf: [0.5, 0.3], lb: [-0.5, 0.2], af: [1.1, 0.5], ab: [-0.4, 0.4], prop: 'folder' }][i] },
    atk2: { n: 3, fps: 1, f: i => [
      { lean: 1, lf: [0.5, 0.3], lb: [-0.5, 0.2], af: [0.5, 0.3], ab: [-0.5, 0.4], prop: 'folder' },
      { lean: 1, hy: -1, lf: [0.5, 0.3], lb: [-0.5, 0.2], af: [2.8, 0], ab: [-0.8, 0.4], prop: 'folder' },
      { lean: 0, lf: [0.4, 0.3], lb: [-0.4, 0.2], af: [2.3, 0.6], ab: [-0.6, 0.4], prop: 'folder' }][i] },
    atk3: { n: 3, fps: 1, f: i => [
      { lean: -2, hy: -1, lf: [0.3, 0.2], lb: [-0.4, 0.2], af: [3.2, 0.2], ab: [2.8, 0.3], prop: 'folder', face: 'shout' },
      { lean: 4, hy: 2, lf: [0.8, 0.9], lb: [-0.7, 0.3], af: [1.0, 0.1], ab: [-0.8, 0.5], prop: 'folder', face: 'shout' },
      { lean: 3, hy: 2, lf: [0.8, 0.9], lb: [-0.7, 0.3], af: [0.8, 0.2], ab: [-0.6, 0.5], prop: 'folder', face: 'smile' }][i] },
    stamp: { n: 1, fps: 1, f: () => ({ hy: -2, lf: [0.9, 1.6], lb: [0.4, 1.4], af: [0.05, 0], ab: [-0.6, 0.6], prop: 'stamp', face: 'shout' }) },
    dash: { n: 1, fps: 1, f: () => ({ chair: true, hy: 6, lean: -2, lf: [1.5, 1.5], lb: [1.35, 1.35], af: [1.2, 0.6], ab: [-0.4, 0.6], face: 'cool' }) },
    hurt: { n: 1, fps: 1, f: () => ({ lean: -3, lf: [0.35, 0.2], lb: [-0.45, 0.2], af: [-0.8, 0.9], ab: [-1.3, 0.5], face: 'hurt' }) },
    grabbed: { n: 2, fps: 8, f: i => ({ lean: -2, lf: [0.2 + i * 0.2, 0.3], lb: [-0.3, 0.2], af: [2.4 + i * 0.4, 0.5], ab: [1.9 - i * 0.4, 0.8], face: 'hurt' }) },
    shoot: { n: 1, fps: 1, f: () => ({ lean: 1, lf: [0.4, 0.2], lb: [-0.4, 0.2], af: [1.57, 0], ab: [0.4, 0.4], prop: 'stapler' }) },
    cast: { n: 2, fps: 6, f: i => ({ lean: 0, hy: -i, lf: [0.2, 0], lb: [-0.2, 0], af: [2.9, 0.1], ab: [-0.6, 0.6], prop: 'phone', face: 'shout' }) },
    ult: { n: 6, fps: 18, f: i => { const p = i / 6 * TAU, s = Math.sin(p); return { lean: 4, hy: -Math.round(Math.abs(Math.cos(p))), lf: [s * 0.95, Math.max(0, -s) * 1.3 + 0.2], lb: [-s * 0.95, Math.max(0, s) * 1.3 + 0.2], af: [1.6, 0.2], ab: [-1.2, 0.5], propBack: 'briefcase', face: 'shout' }; } },
    talk: { n: 2, fps: 3, f: i => ({ af: [0.7 + i * 0.3, 1.1], ab: [-0.15, 0.25], lf: [0.12, 0], lb: [-0.12, 0], face: i ? 'smile' : 'normal' }) },
    dead: { n: 1, fps: 1, f: () => ({ lean: -4, hy: 3, lf: [1.2, 1.4], lb: [0.9, 1.2], af: [2.8, 0.4], ab: [2.2, 0.4], face: 'hurt' }) },
    // 야근 좀비
    zwalk: { n: 4, fps: 5, f: i => { const s = Math.sin(i / 4 * TAU); return { lean: 2, headY: 1, hy: i % 2, lf: [s * 0.35, 0.2], lb: [-s * 0.35, 0.2], af: [1.45, 0.1], ab: [1.3, 0.15], prop: i < 2 ? 'mug' : 'mug', face: 'zombie' }; } },
    zwind: { n: 2, fps: 8, f: i => ({ lean: -1 + i, lf: [0.3, 0.2], lb: [-0.3, 0.2], af: [2.5, 0.2], ab: [2.3, 0.2], face: 'zombie' }) },
    zgrab: { n: 1, fps: 1, f: () => ({ lean: 4, lf: [0.6, 0.4], lb: [-0.6, 0.2], af: [1.6, 0], ab: [1.5, 0], face: 'zombie' }) },
    zdaze: { n: 2, fps: 4, f: i => ({ lean: -1, headX: i ? 1 : -1, lf: [0.1, 0], lb: [-0.1, 0], af: [0.2, 0.3], ab: [-0.2, 0.3], face: 'hurt' }) },
    wave: { n: 2, fps: 4, f: i => ({ af: [2.6 + i * 0.4, 0.4], ab: [-0.1, 0.2], lf: [0.1, 0], lb: [-0.1, 0], face: 'smile' }) },
  };

  // ---------- 적 ----------
  function slime(small, frame) {
    const S = small ? 16 : 24, g = grid(S, S);
    const rx = small ? 6 : 9, ry = (small ? 4 : 6) + (frame ? -1 : 0), rxx = rx + (frame ? 1 : 0);
    const cx = S / 2, cy = S - 2 - ry;
    ellipse(g, cx, cy, rxx, ry, '#f4f4ee');
    for (let x = -rxx; x <= rxx; x++) P(g, cx + x, cy + ry - 1, '#c9d3e3');
    for (let x = -rxx + 1; x < rxx; x++) P(g, cx + x, cy + ry, '#c9d3e3');
    // 접힌 모서리
    P(g, cx + rxx - 2, cy - ry + 1, '#d8d8cc'); P(g, cx + rxx - 1, cy - ry + 2, '#d8d8cc'); P(g, cx + rxx - 2, cy - ry + 2, '#bfc0b4');
    if (!small) { line(g, cx - 5, cy + 2, cx - 1, cy + 2, '#aab3c4'); line(g, cx + 2, cy + 2, cx + 5, cy + 2, '#aab3c4'); }
    // 화난 눈
    const ey = cy - (small ? 1 : 2);
    P(g, cx - 2, ey, '#26212f'); P(g, cx + 2, ey, '#26212f'); P(g, cx - 2, ey + 1, '#26212f'); P(g, cx + 2, ey + 1, '#26212f');
    P(g, cx - 3, ey - 1, '#26212f'); P(g, cx + 3, ey - 1, '#26212f');
    if (!small) { P(g, cx - 1, ey + 3, '#d23a3a'); P(g, cx, ey + 3, '#d23a3a'); P(g, cx + 1, ey + 3, '#d23a3a'); }
    return toCanvas(g);
  }
  function bat(frame) {
    const g = grid(24, 24);
    const cx = 12, cy = 12;
    // 종이 날개
    const up = frame === 0;
    for (let i = 0; i < 7; i++) {
      const y = up ? cy - 1 - Math.floor(i * 0.7) : cy + Math.floor(i * 0.5);
      line(g, cx - 4 - i, cy - 1, cx - 4 - i, y, '#f7f7f2'); line(g, cx + 4 + i, cy - 1, cx + 4 + i, y, '#f7f7f2');
    }
    line(g, cx - 6, up ? cy - 3 : cy + 1, cx - 9, up ? cy - 5 : cy + 2, '#b8c0cc'); line(g, cx + 6, up ? cy - 3 : cy + 1, cx + 9, up ? cy - 5 : cy + 2, '#b8c0cc');
    // 서류철 몸통
    rect(g, cx - 4, cy - 4, 9, 8, '#e9c46a'); rect(g, cx - 4, cy - 5, 4, 1, '#e9c46a'); rect(g, cx - 4, cy + 3, 9, 1, '#c99a3a');
    P(g, cx - 2, cy - 2, '#26212f'); P(g, cx + 2, cy - 2, '#26212f'); P(g, cx - 2, cy - 1, '#ff4848'); P(g, cx + 2, cy - 1, '#ff4848');
    rect(g, cx - 1, cy + 1, 3, 1, '#7a2a2a'); P(g, cx - 1, cy + 2, '#f7f7f7'); P(g, cx + 1, cy + 2, '#f7f7f7');
    return toCanvas(g);
  }
  function copier(frame) {
    const g = grid(32, 32);
    rect(g, 3, 9, 26, 21, '#b9bdc6');
    rect(g, 2, 6, 28, 4, '#8d929e'); rect(g, 4, 5, 24, 1, '#a4a9b4');
    rect(g, 3, 27, 26, 3, '#7b808c');
    // 눈(LED)
    const ang = frame === 1;
    rect(g, 7, 12, 5, 3, '#2a2a33'); rect(g, 20, 12, 5, 3, '#2a2a33');
    rect(g, 8, 13, 3, 1, ang ? '#ffe066' : '#ff4848'); rect(g, 21, 13, 3, 1, ang ? '#ffe066' : '#ff4848');
    line(g, 6, 10, 12, 12, '#2a2a33'); line(g, 26, 10, 20, 12, '#2a2a33');
    // 입(용지함)
    rect(g, 9, 18, 14, ang ? 6 : 3, '#2a2a33');
    if (ang) { rect(g, 11, 19, 10, 4, '#f7f7f2'); }
    else for (let x = 10; x < 22; x += 2) P(g, x, 18, '#f7f7f2');
    rect(g, 25, 23, 3, 2, '#5fe07a');
    return toCanvas(g);
  }

  // ---------- 작은 물건 ----------
  function small(kind) {
    let g;
    switch (kind) {
      case 'paper': g = grid(10, 8); rect(g, 1, 1, 8, 6, '#f7f7f2'); line(g, 2, 3, 6, 3, '#9aa3b5'); line(g, 2, 5, 7, 5, '#9aa3b5'); P(g, 8, 1, '#c8c8c0'); break;
      case 'staple': g = grid(6, 4); rect(g, 0, 1, 6, 1, '#d8dde6'); P(g, 0, 2, '#d8dde6'); P(g, 5, 2, '#d8dde6'); return toCanvas(g, false);
      case 'mail': g = grid(12, 9); rect(g, 1, 1, 10, 7, '#f7f7f2'); line(g, 1, 1, 6, 5, '#c8c8d8'); line(g, 11, 1, 6, 5, '#c8c8d8'); rect(g, 1, 7, 10, 1, '#d23a3a'); break;
      case 'coffee': g = grid(10, 12); rect(g, 2, 3, 6, 8, '#f2f2ee'); rect(g, 2, 5, 6, 3, '#8a5a3a'); rect(g, 1, 2, 8, 1, '#5a3a2a'); P(g, 4, 0, '#c8d0dc'); P(g, 5, 1, '#c8d0dc'); break;
      case 'money': g = grid(10, 7); rect(g, 1, 1, 8, 5, '#6cc070'); rect(g, 2, 2, 6, 3, '#4fa055'); rect(g, 4, 2, 2, 3, '#c8f0c0'); break;
      case 'coin': g = grid(7, 7); ellipse(g, 3, 3, 2, 2, '#ffd34d'); P(g, 3, 3, '#c99a2a'); break;
      case 'cooler': {
        g = grid(16, 32);
        rect(g, 4, 1, 8, 10, '#7fc8f8'); rect(g, 5, 2, 2, 7, '#bfe6ff'); rect(g, 6, 0, 4, 1, '#5aa8e0');
        rect(g, 3, 11, 10, 20, '#eceff4'); rect(g, 3, 11, 10, 2, '#cfd4de');
        rect(g, 5, 16, 2, 2, '#3a6ad8'); rect(g, 9, 16, 2, 2, '#d23a3a'); rect(g, 4, 22, 8, 1, '#b8bfcc');
        break;
      }
      case 'cooler_on': {
        g = grid(16, 32);
        rect(g, 4, 1, 8, 10, '#9fe0ff'); rect(g, 5, 2, 2, 7, '#e8f8ff'); rect(g, 6, 0, 4, 1, '#5aa8e0');
        rect(g, 3, 11, 10, 20, '#eceff4'); rect(g, 3, 11, 10, 2, '#cfd4de');
        rect(g, 5, 16, 2, 2, '#5fe07a'); rect(g, 9, 16, 2, 2, '#5fe07a'); rect(g, 4, 22, 8, 1, '#b8bfcc');
        P(g, 6, 5, '#ffffff'); P(g, 9, 7, '#ffffff');
        break;
      }
    }
    return toCanvas(g);
  }

  // ---------- 타일 (16×16) ----------
  const THEMES = {
    day: { wall: '#e6dcc8', wall2: '#d9ceb8', base: '#9a8466', carpet: '#5f6f92', carpet2: '#55648a', floor: '#6b6258', ceil: '#d8d6cc', ceil2: '#c4c2b8', desk: '#c8955a', desk2: '#a87440', cab: '#97a0ae', cab2: '#7d8696', sky: '#9fd4ff', sky2: '#c8e8ff', city: '#8aa4c4', city2: '#6f8bb0', cityWin: '#d8ecff', gate: '#a3acbf', light: '#fffbe0' },
    night: { wall: '#3b3f57', wall2: '#33364c', base: '#262838', carpet: '#2a3150', carpet2: '#252b47', floor: '#22202c', ceil: '#2f3144', ceil2: '#272a3a', desk: '#7a5a3e', desk2: '#5e432c', cab: '#4f5668', cab2: '#424858', sky: '#141a38', sky2: '#1d2550', city: '#232a4a', city2: '#1a2040', cityWin: '#ffd76a', gate: '#454b62', light: '#e8ffd8' },
  };
  function tile(type, th) {
    const T = THEMES[th], g = grid(16, 16);
    switch (type) {
      case 'floor': rect(g, 0, 0, 16, 16, T.floor); rect(g, 0, 0, 16, 4, T.carpet); for (let x = 0; x < 16; x += 2) P(g, x + 1, 2, T.carpet2); rect(g, 0, 4, 16, 1, shade(T.floor, 0.8)); break;
      case 'under': rect(g, 0, 0, 16, 16, T.floor); P(g, 4, 6, shade(T.floor, 0.85)); P(g, 11, 11, shade(T.floor, 0.85)); break;
      case 'ceil': rect(g, 0, 0, 16, 16, T.ceil); rect(g, 0, 15, 16, 1, T.ceil2); rect(g, 15, 0, 1, 16, T.ceil2); P(g, 5, 5, T.ceil2); P(g, 10, 9, T.ceil2); break;
      case 'desk': rect(g, 0, 0, 16, 3, T.desk); rect(g, 0, 3, 16, 1, T.desk2); break;
      case 'cab': rect(g, 0, 0, 16, 16, T.cab); rect(g, 0, 0, 16, 1, shade(T.cab, 1.15)); rect(g, 1, 7, 14, 1, T.cab2); rect(g, 1, 15, 14, 1, T.cab2); rect(g, 6, 3, 4, 1, T.cab2); rect(g, 6, 11, 4, 1, T.cab2); break;
      case 'shelf': rect(g, 0, 0, 16, 3, T.desk); rect(g, 0, 3, 16, 1, T.desk2); P(g, 2, 4, T.cab2); P(g, 2, 5, T.cab2); P(g, 13, 4, T.cab2); P(g, 13, 5, T.cab2); break;
      case 'gate': rect(g, 0, 0, 16, 16, T.gate); rect(g, 0, 0, 2, 16, shade(T.gate, 0.8)); rect(g, 14, 0, 2, 16, shade(T.gate, 0.8)); for (let y = 2; y < 16; y += 5) rect(g, 3, y, 10, 1, shade(T.gate, 1.15)); break;
    }
    return toCanvas(g, false);
  }

  // ---------- PixelLab 그림 덮어쓰기 ----------
  const overrides = {};
  const OVERRIDE_KEYS = [];
  for (const c of ['jiwoo', 'oh', 'bujang', 'zombie', 'worker']) for (const a of Object.keys(ANIMS)) OVERRIDE_KEYS.push(`${c}_${a}`);
  OVERRIDE_KEYS.push('slime', 'bat', 'bat_b', 'copier', 'copier_b');
  // 배경 소품 그림 (한 장짜리)
  const imgs = {};
  const BG_KEYS = ['bg_desk', 'bg_cabinet', 'bg_cooler', 'bg_door', 'bg_plant', 'bg_wall_day', 'bg_wall_night'];
  function loadImages() {
    for (const k of BG_KEYS) { const im = new Image(); im.onload = () => { imgs[k] = im; }; im.src = `sprites/${k}.png`; }
  }
  // 납작하게 눌린 프레임 (슬라임이 뛰기 전)
  function squash(cv) {
    const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height;
    const c = o.getContext('2d'); c.imageSmoothingEnabled = false;
    const w = Math.round(cv.width * 1.12), h = Math.round(cv.height * 0.84);
    c.drawImage(cv, Math.round((cv.width - w) / 2), cv.height - h, w, h);
    return o;
  }
  // 고해상도(PixelLab) 캐릭터의 손·엉덩이 위치 정보 — 소품을 그릴 자리
  const metas = {};
  function loadMeta(ch) {
    fetch(`sprites/${ch}_meta.json`).then(r => r.ok ? r.json() : null).then(m => { if (m) metas[ch] = m; }).catch(() => { });
  }

  // 고해상도 소품 (스프라이트 픽셀 단위, 오른쪽을 봄, 손잡이가 왼쪽 가운데)
  function prop(kind) {
    let g;
    switch (kind) {
      case 'folder':
        g = grid(28, 14);
        rect(g, 2, 1, 24, 12, '#e9c46a'); rect(g, 2, 1, 24, 2, '#f6dc94'); rect(g, 2, 11, 24, 2, '#c99a3a');
        rect(g, 20, 0, 6, 2, '#e9c46a'); rect(g, 4, 4, 18, 1, '#ffffff'); rect(g, 4, 7, 14, 1, '#ffffff');
        rect(g, 0, 5, 3, 4, '#c99a3a');
        break;
      case 'stamp':
        g = grid(18, 12);
        rect(g, 0, 4, 9, 4, '#6a3a24'); rect(g, 0, 4, 9, 1, '#8a5234'); rect(g, 9, 2, 3, 8, '#3a3a44'); rect(g, 12, 0, 5, 12, '#d23a3a'); rect(g, 12, 0, 5, 2, '#ff6a6a');
        break;
      case 'stapler':
        g = grid(24, 10);
        rect(g, 0, 1, 22, 4, '#5a6070'); rect(g, 0, 1, 22, 1, '#8a90a0'); rect(g, 0, 6, 23, 3, '#3a3e4a'); rect(g, 18, 4, 4, 2, '#c8ccd8');
        break;
      case 'phone':
        g = grid(16, 10);
        rect(g, 0, 0, 16, 10, '#24242c'); rect(g, 2, 1, 12, 8, '#7fd8ff'); rect(g, 3, 2, 5, 1, '#ffffff'); rect(g, 3, 4, 8, 1, '#3a6ad8');
        break;
      case 'chair':
        g = grid(44, 50);
        rect(g, 2, 0, 7, 26, '#2b2b33'); rect(g, 3, 1, 5, 24, '#3d3d48');
        rect(g, 4, 24, 34, 6, '#2b2b33'); rect(g, 5, 25, 32, 3, '#3d3d48');
        rect(g, 19, 30, 4, 12, '#8a8a96'); rect(g, 6, 42, 32, 3, '#3a3a44');
        for (const x of [6, 21, 36]) rect(g, x - 2, 45, 4, 4, '#141418');
        break;
    }
    return toCanvas(g);
  }

  function loadOverrides(onChange) {
    loadImages();
    for (const c of ['jiwoo', 'oh', 'bujang', 'worker', 'zombie']) loadMeta(c);
    for (const key of OVERRIDE_KEYS) {
      const img = new Image();
      img.onload = () => {
        const S = img.height, n = Math.max(1, Math.floor(img.width / S));
        const frames = [];
        for (let i = 0; i < n; i++) {
          const cv = document.createElement('canvas'); cv.width = cv.height = S;
          const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false;
          cx.drawImage(img, i * S, 0, S, S, 0, 0, S, S);
          frames.push(cv);
        }
        overrides[key] = frames;
        cache.clear();
        if (onChange) onChange(key);
      };
      img.src = `sprites/${key}.png`;
    }
  }

  // ---------- 캐시 ----------
  const cache = new Map();
  function memo(key, make) { let v = cache.get(key); if (!v) { v = make(); cache.set(key, v); } return v; }
  function charFrames(ch, anim) {
    return memo(`c:${ch}:${anim}`, () => {
      // 고해상도 그림이 있으면 같은 계열(zombie2→zombie, worker2→worker)도 그 그림을 씀
      const base = ch.replace(/2$/, '');
      if (overrides[`${base}_${anim}`]) return overrides[`${base}_${anim}`];
      const A = ANIMS[anim];
      const frames = [];
      for (let i = 0; i < A.n; i++) frames.push(drawPuppet(CHARS[ch], A.f(i)));
      return frames;
    });
  }
  function enemyFrames(kind) {
    return memo(`e:${kind}`, () => {
      const hd = f => { f.hd = true; return f; };
      if ((kind === 'slime' || kind === 'slime_small') && overrides.slime) return hd([overrides.slime[0], squash(overrides.slime[0])]);
      if (kind === 'bat' && overrides.bat) return hd([...overrides.bat, ...(overrides.bat_b || [squash(overrides.bat[0])])]);
      if (kind === 'copier' && overrides.copier) return hd([...overrides.copier, ...(overrides.copier_b || overrides.copier)]);
      if (kind === 'slime') return [slime(false, 0), slime(false, 1)];
      if (kind === 'slime_small') return [slime(true, 0), slime(true, 1)];
      if (kind === 'bat') return [bat(0), bat(1)];
      if (kind === 'copier') return [copier(0), copier(1)];
    });
  }
  function white(cv) {
    return memo(cv, () => {
      const w = document.createElement('canvas'); w.width = cv.width; w.height = cv.height;
      const c = w.getContext('2d'); c.drawImage(cv, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fff'; c.fillRect(0, 0, w.width, w.height);
      return w;
    });
  }

  window.ART = {
    THEMES, ANIMS, CHARS,
    char: charFrames, enemy: enemyFrames, white,
    item: kind => memo(`i:${kind}`, () => small(kind)),
    tile: (type, th) => memo(`t:${type}:${th}`, () => tile(type, th)),
    loadOverrides, shade, metas, img: k => imgs[k] || null,
    prop: kind => memo(`p:${kind}`, () => prop(kind)),
  };
})();
