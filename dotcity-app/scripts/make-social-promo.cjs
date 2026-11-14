// Short 9:16 promo videos for TikTok / Instagram Reels / YouTube Shorts, rendered from the built app (www/) with a manual clock and
// encoded with ffmpeg (silent: pick a trending track in the app when posting).
//   node scripts/make-social-promo.cjs <eras|festivals|life|watch|seasons> [ko|en]   ->   store/promo/dotcity-<video>-<lang>.mp4
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const VID = process.argv[2] || 'eras', LANG = process.argv[3] || 'ko', FPS = 24;
const OUT = path.join(require('os').tmpdir(), `sframes_${VID}_${LANG}`);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
const ko = LANG === 'ko';
// a scene: [era, night, setup, caption, seconds, zoom0, zoom1, [dx0,dy0], [dx1,dy1]] (camera offsets from the town centre, world px)
const VIDEOS = {
  eras: { badge: ko ? '혼자 만든 픽셀 도시 게임' : 'A pixel city game, made solo', scenes: [
    [0, 0, '', ko ? '모닥불 곁 움집 몇 채가' : 'A few huts by a campfire', 2.6, 5, 4.4, [0, 10], [0, 0]],
    [1, 0, '', ko ? '초가 마을이 되고' : 'become a thatched village', 2.4, 4.4, 4, [-20, 0], [20, -6]],
    [2, 0, '', ko ? '한옥 마을로 자라고' : 'grow into a hanok town', 2.4, 4, 3.6, [10, 0], [-10, -8]],
    [3, 0, '', ko ? '벽돌 도시를 지나' : 'turn into a brick city', 2.4, 3.6, 3.3, [0, 0], [0, -14]],
    [4, 1, '', ko ? '불빛 가득한 대도시' : 'a city of lights', 2.6, 3.4, 3, [-16, 0], [16, -10]],
    [5, 1, '', ko ? '네온 미래 도시까지!' : 'all the way to a neon future!', 2.8, 3.2, 2.7, [0, 0], [0, -16]]],
    end: ko ? ['석기시대부터 미래까지\n나만의 픽셀 도시', 'App Store에서 무료'] : ['From the Stone Age to the future\nyour own pixel city', 'Free on the App Store'] },
  festivals: { badge: ko ? 'NEW 업데이트' : 'NEW UPDATE', scenes: [
    [4, 1, 'fest:firework', ko ? '밤하늘에 불꽃 축제 🎆' : 'Fireworks over the city 🎆', 3.4, 4, 3.4, [0, -10], [0, -24]],
    [2, 1, 'fest:lantern', ko ? '연등이 떠오르는 연등회' : 'Lanterns drift up at the Lantern Festival', 3.2, 4.4, 4, [-10, 0], [10, -14]],
    [3, 0, 'fest:expo', ko ? '알록달록 풍선 축제' : 'A sky of balloons', 3, 5.4, 5, [10, 0], [-6, -14]],
    [2, 0, 'fest:kite', ko ? '설날엔 연날리기' : 'Kites for the New Year', 3, 5, 4.6, [0, 0], [0, -16]],
    [4, 1, 'fest:xmas', ko ? '크리스마스엔 반짝반짝 ✨' : 'Christmas lights everywhere ✨', 3.2, 4.4, 4, [10, 0], [-10, -8]]],
    end: ko ? ['시대마다 다른 축제가 열려요', 'App Store에서 무료'] : ['Every era has its festival', 'Free on the App Store'] },
  life: { badge: ko ? 'NEW 업데이트' : 'NEW UPDATE', scenes: [
    [4, 0, 'build', ko ? '크레인이 움직이는 도시' : 'Cranes swing as the city grows', 3.4, 4.2, 3.6, [0, -6], [0, -20]],
    [4, 0, 'quake', ko ? '지진이 와도…' : 'When an earthquake hits…', 2.8, 3.6, 3.6, [0, -4], [0, -4]],
    [4, 0, 'rebuild', ko ? '힘을 모아 다시 일어서요' : 'the town pulls together and rebuilds', 3, 3.6, 4.2, [0, -4], [0, -12]],
    [4, 0, 'decor', ko ? '분수와 시계탑으로 꾸미고' : 'Decorate with fountains and clock towers', 3.4, 5.2, 4.6, [24, -10], [8, -20]],
    [4, 1, 'postcard', ko ? '엽서로 만들어 친구에게!' : 'and send it as a postcard!', 3, 1, 1, [0, 0], [0, 0]]],
    end: ko ? ['살아 움직이는 나만의 픽셀 도시', 'App Store에서 무료'] : ['A pixel city that comes alive', 'Free on the App Store'] },
  watch: { badge: ko ? 'NEW 업데이트' : 'NEW UPDATE', scenes: [
    [4, 0, 'scout', ko ? '누군가 당신의 도시를<br>지켜보고 있다…' : 'Something is watching<br>your city…', 5.8, 4.8, 4.4, [0, -66], [0, -60], 1.2],
    [0, 0, '', ko ? '석기시대 움집 마을이' : 'From a Stone Age village', 2.2, 5, 4.4, [0, 10], [0, 0]],
    [5, 1, '', ko ? '네온 사이버펑크 도시로!' : 'to a neon cyberpunk city!', 2.8, 3.2, 2.7, [0, 0], [0, -16]],
    [3, 0, 'squid', ko ? '깊은 바다에선…' : 'And deep in the sea…', 4.6, 7, 6.4, [0, -2], [0, -6], 2.3],
    [3, 0, 'whale', ko ? '고래가 숨을 쉬어요 🐋' : 'a whale comes up for air 🐋', 4.8, 6.4, 6, [0, 0], [-6, -4], 2.4]],
    end: ko ? ['바다 괴물부터 외계 손님까지\n살아 있는 나만의 픽셀 도시', 'App Store에서 무료'] : ['Sea monsters, alien visitors\nand a pixel city that lives', 'Free on the App Store'] },
  seasons: { badge: ko ? 'NEW 업데이트' : 'NEW UPDATE', scenes: [
    [4, 0, 'dusk', ko ? '해가 지면<br>불이 하나씩 켜지고' : 'As the sun goes down<br>the lights come on one by one', 5.2, 3.6, 3.1, [0, -6], [0, -18]],
    [4, 0, 'rush', ko ? '퇴근길 차들은<br>전조등을 켜요' : 'Cars head home<br>with their headlights on', 3.6, 5, 4.4, [0, 0], [0, -6]],
    [2, 0, 'spring', ko ? '봄이면 벚꽃이 피고 🌸' : 'Cherry blossom in spring 🌸', 3.6, 3.8, 3.4, [10, 0], [-10, -10]],
    [4, 0, 'rain', ko ? '비 오는 날엔<br>우산을 쓰고 ☔' : 'Umbrellas out<br>on rainy days ☔', 3.4, 5.4, 5, [0, -4], [0, -8]],
    [4, 0, 'autumn', ko ? '가을엔 단풍이<br>하나둘 물들어요 🍁' : 'Autumn colours<br>creep across town 🍁', 5, 3.4, 3, [0, 0], [0, -14]],
    [4, 1, 'winter', ko ? '겨울밤엔 눈이 내려요 ❄' : 'Snow falls on winter nights ❄', 3.8, 3.8, 3.4, [0, -4], [0, -16]]],
    end: ko ? ['하루가 흐르고 계절이 바뀌는\n살아 있는 픽셀 도시', 'App Store에서 무료'] : ['Days pass and seasons turn\nin a pixel city that lives', 'Free on the App Store'] },
}[VID];
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: ko ? 'ko-KR' : 'en-US' });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'www', 'index.html'));
  await p.waitForFunction(() => { const b = document.getElementById('boot'); return b && b.hidden; }, null, { timeout: 60000 });
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; simDay = () => {};   // a frozen town: no growth, outages or fires, just the life on it
    const st = document.createElement('style');
    st.textContent = `body>*:not(#view):not(#vig):not(#cap):not(#endc):not(#pcard){visibility:hidden!important}
 #cap{position:fixed;left:0;right:0;top:96px;text-align:center;z-index:99;font:30px/1.25 "Do Hyeon",sans-serif;color:#fff;
  text-shadow:0 3px 0 #141a30,0 -2px 0 #141a30,3px 0 0 #141a30,-3px 0 0 #141a30,0 6px 16px rgba(0,0,0,.55);padding:0 18px}
 #cap b{display:inline-block;margin-bottom:8px;font:18px "Do Hyeon",sans-serif;color:#1a1404;background:#ffcc4d;padding:4px 12px;border-radius:10px;text-shadow:none;box-shadow:0 3px 0 #a37a1a}
 #pcard{position:fixed;left:8%;right:8%;top:24%;z-index:98;opacity:0}#pcard img{width:100%;display:block;box-shadow:0 18px 40px rgba(0,0,0,.6);border-radius:4px}
 #endc{position:fixed;inset:0;z-index:100;background:radial-gradient(circle at 50% 38%,#2a3566,#141a30 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#fff;font-family:"Do Hyeon",sans-serif;text-align:center;opacity:0}
 #endc img{width:150px;height:150px;border-radius:34px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
 #endc .t{font-size:54px;color:#ffcc4d;text-shadow:0 4px 0 #6a4a10}#endc .s{font-size:24px;white-space:pre-line;color:#d6dcf5;line-height:1.3}
 #endc .c{margin-top:14px;font-size:22px;background:#ffcc4d;color:#1a1404;padding:12px 26px;border-radius:14px;box-shadow:0 5px 0 #a37a1a}`;
    document.head.append(st); const c = document.createElement('div'); c.id = 'cap'; document.body.append(c); });
  const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png')).toString('base64');
  let n = 0, t = 1000; const shot = async () => { await p.screenshot({ path: `${OUT}/${String(n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 }); };
  for (let k = 0; k < VIDEOS.scenes.length; k++) { if (process.env.ONLY && !process.env.ONLY.split(',').includes(String(k))) continue;   // ONLY=1,3 renders just those scenes (for checking)
    const [era, night, setup, cap, sec, z0, z1, [x0, y0], [x1, y1], evOff = 0] = VIDEOS.scenes[k];
    await p.evaluate(([era, night, setup]) => {   // the same town builder as the store screenshots, plus the scene's setup
      closeEra(); try { localStorage.clear(); } catch (e) {}
      W = blankWorld(77); genTerrain(W); W.era = era; W.cm = 5; W.ct = 10;   // early summer unless the scene sets a season
      for (let i = 0; i < N * N; i++) if (Math.hypot(i % N - 32, (i / N | 0) - 32) < 14) { W.terrain[i] = 0; W.trees[i] = 0; } derive(W);
      const road = (x, y) => { if (inb(x, y) && W.terrain[idx(x, y)] !== 1 && W.kind[idx(x, y)] !== K.ROAD) placeRaw(K.ROAD, x, y); };
      const R = era === 0 ? 5 : 9;
      for (let c = 32 - R; c <= 32 + R; c++) for (let k = 32 - R; k <= 32 + R; k++) { if ((c - 32) % 4 === 0) road(c, k); if ((k - 32) % 4 === 0) road(k, c); }
      const civ = era === 0 ? [[K.FIREPIT, 31, 31], [K.FIREPIT, 34, 34]] : era < 3 ? [[K.WELL, 30, 30], [K.WELL, 34, 35]].concat(era === 2 ? [[K.PALACE, 33, 29]] : []) : [[K.COAL, 18, 30], [K.STADIUM, 33, 25], [K.TOWER, 34, 34], [K.FIRE, 30, 37]];
      for (const [k, x, y] of civ) placeRaw(k, x, y);
      const mx = ERAS[era].maxL;
      for (let y = 32 - R; y <= 32 + R; y++) for (let x = 32 - R; x <= 32 + R; x++) { const i = idx(x, y); if (W.kind[i] || W.terrain[i] === 1) continue; const d = Math.max(Math.abs(x - 32), Math.abs(y - 32));
        const k = x > 32 + R - 3 && y > 32 + R - 3 ? K.IND : d < 3 ? K.COM : (x * 3 + y) % 11 === 0 ? K.PARK : K.RES; placeRaw(k, x, y);
        if (k !== K.PARK) W.level[i] = Math.max(1, mx[k] - ((x * 7 + y * 3) % 2) - (d > R - 2 ? 1 : 0)); W.vari[i] = (x * 31 + y * 17) & 255; }
      if (setup === 'decor') {
        const deco = (L, x, y, r) => { clearTile(x, y); placeRaw(K.DECO, x, y); W.level[idx(x, y)] = L; W.vari[idx(x, y)] = r || 0; };
        for (const [x, y, L, r] of [[33,33,0],[34,33,7],[35,33,0],[33,34,7],[34,34,8],[35,34,7],[33,35,0],[34,35,4,1],[35,35,0],[30,34,9],[29,33,6,2],[31,33,0],[29,35,0],[31,35,6],[30,33,4],[30,35,4,2],[29,34,7],[31,34,7],
          [34,30,10],[33,29,11],[35,31,12],[33,31,7],[35,29,7],[34,29,0],[34,31,0],[33,30,0],[35,30,0]]) deco(L, x, y, r);
        for (let i = 0; i < N * N; i++) if (W.kind[i] >= K.RES && W.kind[i] <= K.IND && Math.hypot(i % N - 32, (i / N | 0) - 32) < 8) W.level[i] = Math.min(W.level[i], 2);
      }
      recompute(); for (let i = 0; i < N * N; i++) W.fire[i] = 0; W.powered.fill(1); W.grid.fill(1); W.road.fill(1);
      W.ev = { c: 0, nf: 1e9, nd: 1e9, fest: null, dis: null }; W.wx = 0; W.wxEnd = Date.now() + 1e9; W.snow = 0; W.month = 5; incidents.length = 0;
      if (setup.startsWith('fest:')) { W.ev.fest = { k: setup.slice(5), end: 1e9 }; festSrc = null; festFxs = []; if (setup === 'fest:xmas') { W.wx = 2; W.snow = 1; } }
      if (setup === 'build' || setup === 'rebuild') for (let i = 0; i < N * N; i++) if (isBld(i) && hash(i % N, i / N | 0, 5) < (setup === 'build' ? .14 : .1)) { W.build[i] = 99999; W.te[i] = era; }
      if (['spring', 'autumn', 'winter'].includes(setup)) for (let i = 0; i < N * N; i++) { const d = Math.hypot(i % N - 32, (i / N | 0) - 32); if (d >= 10.5 && d < 18 && !W.kind[i] && W.terrain[i] === 0) W.trees[i] = 1 + (i * 7) % 3; }   // woods round the town
      if (setup === 'spring') { W.cm = 3; W.ct = 10; }
      if (setup === 'rush' || setup === 'rain') for (let i = 0; i < N * N; i++) if (W.kind[i] >= K.RES && W.kind[i] <= K.IND && Math.hypot(i % N - 32, (i / N | 0) - 32) < 9) W.level[i] = Math.min(W.level[i], 2);   // low-rise so the street shows
      if (setup === 'winter') { xmasTest = true; W.cm = 11; W.ct = 10; W.snow = .8; W.wx = 2; }
      if (setup === 'rain') { W.cm = 6; W.wx = 1; }
      cars = []; for (let k = 0; k < (setup === 'rush' || setup === 'rain' ? 240 : 140); k++) spawnCar(); buildTools(); setTool('inspect'); setSpeed(1);
      dayMode = night ? 'night' : 'day'; W.tod = night ? 22 : 11; document.querySelectorAll('.toast').forEach(t => t.remove());
      if (setup === 'dusk' || setup === 'rush') { dayMode = 'auto'; W.tod = setup === 'dusk' ? 17.2 : 19.6; }
      if (setup === 'autumn') { W.cm = 9; W.ct = 0; }
      for (let i = 0; i < 30; i++) frame(performance.now() + i * 40);
    }, [era, night, setup]);
    if (setup === 'postcard') {   // the postcard itself, made from a night view of the town, slides in over it
      const url = await p.evaluate(async () => { cam.s = 3; cam.x = 0; cam.y = 32 * 16 + 20; frame(performance.now()); const bl = await makePostcard();
        return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(bl); }); });
      await p.evaluate(url => { const d = document.createElement('div'); d.id = 'pcard'; d.innerHTML = `<img src="${url}">`; document.body.append(d); }, url);
    }
    let F = Math.round(sec * FPS), cx0 = 0, cy0 = 32 * 16 + 20;
    if (setup === 'scout' || setup === 'squid' || setup === 'whale') {   // start the sky / sea visitor part-way through, and centre the camera on it
      const at = await p.evaluate(([setup, t, off, cx, cy]) => { seaNext = scoutNext = 1e15; seaEv = null; scoutEv = null; cam.s = 3; cam.x = cx; cam.y = cy; frame(t);
        if (setup === 'scout') { scoutSpawn(true); scoutEv.t0 = t - off * 1000; scoutEv.last = t; return [(scoutEv.x - scoutEv.y) * 16, (scoutEv.x + scoutEv.y) * 8]; }
        let best = null, bd = 1e9; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (seaDeep(x, y) < 6) continue; const d = Math.hypot(x - 32, y - 32); if (d < bd) { bd = d; best = [x, y]; } }
        if (!best || !seaSpawn(setup, best)) return null; seaEv.t0 = t - off * 1000; seaEv.last = t; return [(seaEv.x - seaEv.y) * 16, (seaEv.x + seaEv.y) * 8 - 4]; }, [setup, t, evOff, cx0, cy0]);
      if (!at) throw new Error('no deep water for ' + setup); [cx0, cy0] = at; }
    if (setup === 'rush' || setup === 'rain') {   // centre on a traffic-light crossing, or on someone walking in the rain
      const at = await p.evaluate(setup => { if (setup === 'rush') { for (let d = 0; d < 12; d++) for (let y = 32 - d; y <= 32 + d; y++) for (let x = 32 - d; x <= 32 + d; x++) if (hasSignal(x, y)) return [(x - y) * 16, (x + y) * 8 + 8]; return null; }
        const w = cars.filter(c => c.ped).sort((a, b) => Math.hypot(a.x - 32, a.y - 32) - Math.hypot(b.x - 32, b.y - 32))[0]; if (!w) return null; w.sp *= .5; return [(w.x - w.y) * 16, (w.x + w.y) * 8 + 4]; }, setup);
      if (at) [cx0, cy0] = at; }
    if (setup.startsWith('fest:') || setup === 'build' || setup === 'decor') {   // run the scene for a few seconds first so lanterns, balloons and cranes are already up
      await p.evaluate(([cx, cy, s, t]) => { cam.s = s; cam.x = cx; cam.y = cy; for (let i = 0; i < 160; i++) frame(t + i * 50); }, [cx0 + x0, cy0 + y0, z0, t]); t += 160 * 50; }
    for (let f = 0; f < F; f++) { const u = f / (F - 1), e = u * u * (3 - 2 * u); t += 1000 / FPS;
      if (setup === 'fest:firework' && f % 5 === 0) await p.evaluate(() => { const cols = ['#ff5f7a', '#ffd84a', '#5fe0ff', '#9aff6a', '#ffffff', '#c28bff'], lw = view.width / cam.s, lh = view.height / cam.s, c = cols[(Math.random() * 6) | 0];
        const x = X0 + lw * (.15 + .7 * Math.random()), y = Y0 + lh * (.3 + .3 * Math.random()); for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2, sp = 20 + (k % 4) * 4; parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .8, life: 0, max: 1.6, sz: 1, kind: 'fw', c, g: 14 }); } });
      if (setup === 'dusk') await p.evaluate(u => { W.tod = 17.2 + 5.4 * u; }, u);   // time-lapse from late afternoon to night
      if (setup === 'rush') await p.evaluate(() => { W.tod = 19.6; });
      if (setup === 'autumn') await p.evaluate(u => { const m = 9 + 1.5 * u; W.cm = Math.floor(m); W.ct = Math.round((m % 1) * CAL_T); }, u);   // September into October: the trees turn one by one
      if (setup === 'quake' && f === Math.round(F * .3)) await p.evaluate(() => { const ev = W.ev; ev.dis = { k: 'quake', ph: 'hit', t: 0, tiles: [], n: 0 }; disTick(ev.dis, ev); shakeT = 2.2; W.powered.fill(1); W.road.fill(1); });
      if (setup === 'rebuild' && f > F * .35 && f % 6 === 0) await p.evaluate(() => { const l = []; for (let i = 0; i < N * N; i++) if (W.build[i] > 9000) l.push(i); const i = l[(Math.random() * l.length) | 0];
        if (i != null) { W.build[i] = 0; dust(i % N + .5, (i / N | 0) + .5, '#d8cfc0'); } });
      await p.evaluate(([cx, cy, s, t, txt, a, pc]) => { cam.s = s; cam.x = cx; cam.y = cy; frame(t); const c = document.getElementById('cap'); c.innerHTML = txt; c.style.opacity = a; c.style.transform = `translateY(${(1 - a) * 10}px)`;
        const d = document.getElementById('pcard'); if (d) { d.style.opacity = pc; d.style.transform = `translateY(${(1 - pc) * 60}px) rotate(${-3 + pc * 1.5}deg)`; } },
        [cx0 + x0 + (x1 - x0) * e, cy0 + y0 + (y1 - y0) * e, setup === 'postcard' ? 3 : z0 + (z1 - z0) * e, t, (k === 0 ? `<b>${VIDEOS.badge}</b><br>` : '') + cap, Math.min(1, f / 6, (F - f) / 5), Math.min(1, f / 10)]);
      await shot(); }
    await p.evaluate(() => { const d = document.getElementById('pcard'); if (d) d.remove(); });
  }
  await p.evaluate(([icon, t, s, c]) => { document.getElementById('cap').style.opacity = 0; const d = document.createElement('div'); d.id = 'endc';
    d.innerHTML = `<img src="${icon}"><div class="t">${t}</div><div class="s">${s}</div><div class="c">${c}</div>`; document.body.append(d); }, [icon, ko ? '도트시티' : 'Dot City', VIDEOS.end[0], VIDEOS.end[1]]);
  for (let f = 0; f < Math.round(2.6 * FPS); f++) { await p.evaluate(a => { const d = document.getElementById('endc'); d.style.opacity = a; d.querySelector('img').style.transform = `scale(${.85 + .15 * a})`; }, Math.min(1, f / 8)); await shot(); }
  await b.close();
  const dst = path.join(__dirname, '..', 'store', 'promo', `dotcity-${VID}-${LANG}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${OUT}/%05d.jpg`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', dst]);
  fs.rmSync(OUT, { recursive: true, force: true }); console.log('saved', dst, n, 'frames');
})();
