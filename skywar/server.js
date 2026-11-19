// SKY WAR — 온라인 픽셀 전투기 대전 서버
// 실행: npm install && npm start  →  http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const SKY = require('./public/parts.js');
const { PARTS, SLOTS, PAINTS, DEFAULT_LOADOUT, WORLD } = SKY;

const PORT = process.env.PORT || 3000;
const TICK = 1 / 30;
const MIN_PLAYERS = 5; // 사람이 적으면 AI 전투기로 채움
const START_COINS = 500;

// ---------- 정적 파일 ----------
const PUB = path.join(__dirname, 'public');
const FONT = path.join(__dirname, 'node_modules', 'galmuri', 'dist', 'Galmuri11.woff2');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  let file;
  if (url === '/font.woff2') file = FONT;
  else {
    if (url === '/') url = '/index.html';
    file = path.join(PUB, path.normalize(url));
    if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

// ---------- 프로필 저장 (코인·보유 부품·장착 상태) ----------
const DATA_DIR = path.join(__dirname, 'data');
const PROFILE_FILE = path.join(DATA_DIR, 'profiles.json');
let profiles = {};
try { profiles = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8')); } catch (e) { profiles = {}; }
let saveTimer = null;
function saveProfiles() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFile(PROFILE_FILE, JSON.stringify(profiles), () => {});
  }, 1000);
}
function newProfile() {
  return {
    coins: START_COINS,
    owned: Object.keys(PARTS).filter(k => PARTS[k].price === 0),
    loadout: { ...DEFAULT_LOADOUT },
    color: PAINTS[0],
    kills: 0, deaths: 0,
  };
}

// ---------- 게임 상태 ----------
let nextId = 1;
const planes = new Map(); // id -> plane (전장에 있는 것만)
const clients = new Set();
let shots = [];
let shotId = 1;
let fx = [];

let colorIdx = 0;
const BOT_NAMES = ['송골매', '독수리', '올빼미', '까마귀', '제비', '갈매기', '참매', '황조롱이', '수리부엉이', '물총새'];

function rand(a, b) { return a + Math.random() * (b - a); }
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

function spawnPos(p) {
  const r = WORLD * 0.42, t = Math.random() * Math.PI * 2;
  p.x = WORLD / 2 + Math.cos(t) * r;
  p.y = WORLD / 2 + Math.sin(t) * r;
  p.a = Math.atan2(WORLD / 2 - p.y, WORLD / 2 - p.x) + rand(-0.4, 0.4);
  p.v = p.st.minV + (p.st.maxV - p.st.minV) * 0.6;
  p.hp = p.st.hp;
  p.alive = true;
  p.inv = 2; // 무적 시간
  p.gunCd = 0; p.spCd = 0; p.out = 0;
  p.lastHit = null;
}

function makePlane(name, loadout, human, color) {
  const p = {
    id: nextId++, name, human, lo: { ...loadout }, st: SKY.stats(loadout),
    color: color || PAINTS[1 + (colorIdx++ % (PAINTS.length - 1))],
    input: { turn: 0, thr: 0, fire: false, sp: false },
    kills: 0, deaths: 0, respawn: 0, x: 0, y: 0, a: 0, v: 0, hp: 0,
  };
  spawnPos(p);
  return p;
}

function pinfo(p) {
  return { t: 'pinfo', id: p.id, name: p.name, lo: p.lo, color: p.color, maxHp: p.st.hp, bot: !p.human, stealth: p.st.stealth };
}
function broadcast(msg, filter) {
  const s = JSON.stringify(msg);
  for (const c of clients) if (c.plane && (!filter || filter(c))) send(c, s);
}
function send(c, msg) {
  if (c.ws.readyState === 1) c.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
}

function addPlane(p) {
  planes.set(p.id, p);
  broadcast(pinfo(p));
}
function removePlane(p) {
  planes.delete(p.id);
  broadcast({ t: 'pgone', id: p.id });
}

// ---------- AI ----------
function randomBotLoadout() {
  const lo = {};
  const maxTier = Math.random() < 0.6 ? 1 : 2;
  for (const s of SLOTS) {
    const opts = Object.keys(PARTS).filter(k => PARTS[k].slot === s.id && PARTS[k].tier <= maxTier);
    lo[s.id] = opts[Math.floor(Math.random() * opts.length)];
  }
  return lo;
}
function balanceBots() {
  const humans = [...planes.values()].filter(p => p.human).length;
  const bots = [...planes.values()].filter(p => !p.human);
  const want = humans === 0 ? 0 : Math.max(0, MIN_PLAYERS - humans);
  if (bots.length < want) {
    const used = new Set(bots.map(b => b.name));
    const free = BOT_NAMES.filter(n => !used.has('AI ' + n));
    const p = makePlane('AI ' + (free[0] || BOT_NAMES[0]), randomBotLoadout(), false);
    p.ai = { target: null, think: 0, wander: rand(0, 6.28) };
    addPlane(p);
  } else if (bots.length > want) {
    removePlane(bots[0]);
  }
}
function botThink(p, dt) {
  const ai = p.ai;
  ai.think -= dt;
  if (ai.think <= 0 || !ai.target || !ai.target.alive || !planes.has(ai.target.id)) {
    ai.think = rand(1.5, 3);
    ai.aimErr = rand(-0.25, 0.25); // 사람처럼 약간 빗나가게
    let best = null, bd = 1e9;
    for (const q of planes.values()) {
      if (q === p || !q.alive) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y) * (q.human ? 0.8 : 1);
      if (d < bd) { bd = d; best = q; }
    }
    ai.target = best;
  }
  let goal;
  const cx = WORLD / 2, cy = WORLD / 2;
  const edge = p.x < 200 || p.y < 200 || p.x > WORLD - 200 || p.y > WORLD - 200;
  const t = ai.target;
  let dist = 1e9, aim = 0;
  if (edge) goal = Math.atan2(cy - p.y, cx - p.x);
  else if (t) {
    dist = Math.hypot(t.x - p.x, t.y - p.y);
    const lead = dist / (p.st.gun.speed + p.v) * 0.9;
    const tx = t.x + Math.cos(t.a) * t.v * lead, ty = t.y + Math.sin(t.a) * t.v * lead;
    goal = Math.atan2(ty - p.y, tx - p.x) + (ai.aimErr || 0) * Math.min(1, dist / 300);
    aim = Math.abs(angDiff(p.a, goal));
  } else {
    ai.wander += rand(-0.5, 0.5) * dt;
    goal = ai.wander;
  }
  const d = angDiff(p.a, goal);
  p.input.turn = Math.abs(d) < 0.05 ? 0 : Math.sign(d) * Math.min(1, Math.abs(d) * 2.5);
  p.input.thr = dist < 160 ? -1 : (dist > 500 ? 1 : 0);
  p.input.fire = dist < 360 && aim < 0.15 && Math.random() < 0.6;
  p.input.sp = dist < 520 && aim < 0.3 && Math.random() < 0.05;
}

// ---------- 시뮬레이션 ----------
function fire(p) {
  const g = p.st.gun;
  const cos = Math.cos(p.a), sin = Math.sin(p.a);
  const offs = g.twin ? [-5, 5] : [0];
  for (const o of offs) {
    const a = p.a + rand(-g.spread, g.spread);
    const sp = g.speed + p.v;
    shots.push({
      id: shotId++, k: g.laser ? 'l' : 'b', owner: p.id, dmg: g.dmg,
      x: p.x + cos * 12 - sin * o, y: p.y + sin * 12 + cos * o,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a, life: 0.9 * g.range, r: 6,
    });
  }
  p.gunCd = 1 / g.rate;
}
function fireSpecial(p) {
  const s = p.st.special;
  if (s.kind === 'none') return;
  const cos = Math.cos(p.a), sin = Math.sin(p.a);
  for (let i = 0; i < s.count; i++) {
    const side = s.count === 1 ? 0 : (i - (s.count - 1) / 2) * 9;
    const a = p.a + (s.count > 2 ? (i - 1) * 0.25 : 0);
    const base = { id: shotId++, owner: p.id, dmg: s.dmg, x: p.x - sin * side, y: p.y + cos * side, a, r: 9 };
    if (s.kind === 'rocket') shots.push({ ...base, k: 'r', vx: Math.cos(a) * (p.v + 420), vy: Math.sin(a) * (p.v + 420), life: 1.6 });
    else {
      // 전방 원뿔 안에서 가장 가까운 적을 조준
      let best = null, bd = 900;
      for (const q of planes.values()) {
        if (q === p || !q.alive) continue;
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        const ad = Math.abs(angDiff(p.a, Math.atan2(q.y - p.y, q.x - p.x)));
        if (ad < 0.9 && d < bd) { bd = d; best = q; }
      }
      shots.push({ ...base, k: 'm', spd: p.v + 60, vx: 0, vy: 0, life: 4.5, target: best ? best.id : null, delay: 0.25 });
    }
  }
  p.spCd = s.cd;
}

function damage(victim, dmg, attacker) {
  if (!victim.alive || victim.inv > 0) return;
  victim.hp -= dmg;
  if (attacker) {
    victim.lastHit = attacker.id;
    if (attacker.human && attacker.client) attacker.client.earn(Math.round(dmg * 0.5));
  }
  if (victim.hp <= 0) kill(victim, attacker);
}
function kill(victim, attacker) {
  victim.alive = false;
  victim.hp = 0;
  victim.respawn = 3;
  victim.deaths++;
  fx.push([Math.round(victim.x), Math.round(victim.y), 'x']);
  if (victim.human && victim.client) { victim.client.profile.deaths++; saveProfiles(); }
  if (attacker && attacker !== victim) {
    attacker.kills++;
    if (attacker.human && attacker.client) { attacker.client.earn(80); attacker.client.profile.kills++; }
  }
  broadcast({ t: 'kill', k: attacker && attacker !== victim ? attacker.name : null, v: victim.name, kc: attacker ? attacker.color : null, vc: victim.color });
}

function step(dt) {
  for (const p of planes.values()) {
    if (!p.alive) {
      p.respawn -= dt;
      if (p.respawn <= 0) spawnPos(p);
      continue;
    }
    if (p.ai) botThink(p, dt);
    const st = p.st, inp = p.input;
    p.inv = Math.max(0, p.inv - dt);
    const cruise = st.minV + (st.maxV - st.minV) * 0.6;
    const target = inp.thr > 0 ? st.maxV : inp.thr < 0 ? st.minV : cruise;
    const acc = st.accel * dt;
    p.v += Math.max(-acc, Math.min(acc, target - p.v));
    // 속도가 느릴수록 조금 더 잘 돈다
    const turnK = 1.15 - 0.3 * (p.v - st.minV) / (st.maxV - st.minV);
    p.a += inp.turn * st.turn * turnK * dt;
    if (p.a > Math.PI) p.a -= 2 * Math.PI; else if (p.a < -Math.PI) p.a += 2 * Math.PI;
    p.x += Math.cos(p.a) * p.v * dt;
    p.y += Math.sin(p.a) * p.v * dt;
    // 작전 구역 밖에서는 연료 손상
    const out = p.x < 0 || p.y < 0 || p.x > WORLD || p.y > WORLD;
    p.out = out ? 1 : 0;
    if (out) {
      p.x = Math.max(-300, Math.min(WORLD + 300, p.x));
      p.y = Math.max(-300, Math.min(WORLD + 300, p.y));
      damage(p, 20 * dt, p.lastHit ? planes.get(p.lastHit) : null);
      if (!p.alive) continue;
    }
    p.gunCd -= dt; p.spCd -= dt;
    if (inp.fire && p.gunCd <= 0 && p.inv <= 0) fire(p);
    if (inp.sp && p.spCd <= 0 && p.inv <= 0) fireSpecial(p);
  }

  // 탄환·미사일
  const keep = [];
  for (const s of shots) {
    s.life -= dt;
    if (s.life <= 0) { if (s.k === 'm' || s.k === 'r') fx.push([Math.round(s.x), Math.round(s.y), 's']); continue; }
    if (s.k === 'm') {
      s.spd = Math.min(400, s.spd + 300 * dt);
      if (s.delay > 0) s.delay -= dt;
      else {
        const t = s.target && planes.get(s.target);
        if (t && t.alive) {
          const want = Math.atan2(t.y - s.y, t.x - s.x);
          const d = angDiff(s.a, want);
          s.a += Math.sign(d) * Math.min(Math.abs(d), 2.6 * dt);
        }
      }
      s.vx = Math.cos(s.a) * s.spd; s.vy = Math.sin(s.a) * s.spd;
    }
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
    let hit = null;
    for (const p of planes.values()) {
      if (!p.alive || p.id === s.owner) continue;
      if (segDist(s.x, s.y, nx, ny, p.x, p.y) < 10 + s.r * 0.5) { hit = p; break; }
    }
    s.x = nx; s.y = ny;
    if (hit) {
      damage(hit, s.dmg, planes.get(s.owner));
      fx.push([Math.round(s.x), Math.round(s.y), s.k === 'm' || s.k === 'r' ? 'e' : 'h']);
      continue;
    }
    keep.push(s);
  }
  shots = keep;

  // 비행기끼리 충돌
  const arr = [...planes.values()].filter(p => p.alive && p.inv <= 0);
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
    const a = arr[i], b = arr[j];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 14) {
      damage(a, 60, b); damage(b, 60, a);
    }
  }
}
function segDist(x1, y1, x2, y2, px, py) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x1 + dx * t - px, y1 + dy * t - py);
}

function snapshot() {
  const p = [];
  for (const q of planes.values()) {
    p.push([q.id, Math.round(q.x), Math.round(q.y), +q.a.toFixed(3), Math.ceil(q.hp), q.alive ? 1 : 0, q.input.thr, q.inv > 0 ? 1 : 0, q.out]);
  }
  const s = shots.map(x => [x.id, Math.round(x.x), Math.round(x.y), x.k, +x.a.toFixed(2)]);
  const msg = JSON.stringify({ t: 's', p, s, fx });
  fx = [];
  for (const c of clients) if (c.plane) send(c, msg);
}

let sbTimer = 0, botTimer = 0, last = Date.now();
setInterval(() => {
  const now = Date.now();
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  step(dt);
  snapshot();
  sbTimer += dt; botTimer += dt;
  if (botTimer > 1) { botTimer = 0; balanceBots(); }
  if (sbTimer > 1) {
    sbTimer = 0;
    const list = [...planes.values()].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)
      .map(q => [q.id, q.kills, q.deaths]);
    broadcast({ t: 'sb', list });
    for (const c of clients) if (c.plane && c.plane.alive === false) send(c, { t: 'respawn', in: +c.plane.respawn.toFixed(1) });
  }
}, TICK * 1000);

// ---------- 접속 처리 ----------
const wss = new WebSocketServer({ server });
wss.on('connection', ws => {
  const c = { ws, profile: null, token: null, plane: null, name: '조종사' };
  c.earn = n => {
    if (!c.profile || n <= 0) return;
    c.profile.coins += n;
    saveProfiles();
    send(c, { t: 'coins', coins: c.profile.coins });
  };
  clients.add(c);
  const sendProfile = () => send(c, { t: 'profile', ...c.profile });

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === 'hello') {
      let token = typeof m.token === 'string' && profiles[m.token] ? m.token : null;
      if (!token) { token = crypto.randomBytes(12).toString('hex'); profiles[token] = newProfile(); saveProfiles(); }
      c.token = token; c.profile = profiles[token];
      c.name = String(m.name || '조종사').replace(/[<>]/g, '').slice(0, 10) || '조종사';
      send(c, { t: 'welcome', token });
      sendProfile();
      return;
    }
    if (!c.profile) return;
    const pr = c.profile;
    switch (m.t) {
      case 'buy': {
        const part = PARTS[m.part];
        if (!part || pr.owned.includes(m.part)) return;
        if (pr.coins < part.price) return send(c, { t: 'err', msg: '코인이 부족합니다' });
        pr.coins -= part.price;
        pr.owned.push(m.part);
        pr.loadout[part.slot] = m.part; // 구매하면 바로 장착
        saveProfiles(); sendProfile();
        break;
      }
      case 'equip': {
        const part = PARTS[m.part];
        if (!part || !pr.owned.includes(m.part)) return;
        pr.loadout[part.slot] = m.part;
        saveProfiles(); sendProfile();
        break;
      }
      case 'play': {
        if (c.plane) return;
        if (!SKY.validLoadout(pr.loadout, pr.owned)) pr.loadout = { ...DEFAULT_LOADOUT };
        const p = makePlane(c.name, pr.loadout, true, pr.color || PAINTS[0]);
        p.client = c;
        c.plane = p;
        send(c, { t: 'start', you: p.id, world: WORLD });
        for (const q of planes.values()) send(c, pinfo(q));
        addPlane(p);
        balanceBots();
        break;
      }
      case 'paint': {
        if (!PAINTS.includes(m.color)) return;
        pr.color = m.color;
        saveProfiles(); sendProfile();
        break;
      }
      case 'leave': leave(c); sendProfile(); break;
      case 'in': {
        if (!c.plane) return;
        const i = c.plane.input;
        i.turn = Math.max(-1, Math.min(1, +m.turn || 0));
        i.thr = Math.sign(+m.thr || 0);
        i.fire = !!m.fire; i.sp = !!m.sp;
        break;
      }
    }
  });
  ws.on('close', () => { leave(c); clients.delete(c); });
});
function leave(c) {
  if (!c.plane) return;
  const p = c.plane;
  c.plane = null;
  removePlane(p);
}

server.listen(PORT, () => console.log(`SKY WAR 서버 실행 중: http://localhost:${PORT}`));
