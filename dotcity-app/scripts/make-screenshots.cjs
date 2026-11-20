// Renders store screenshots in Korean and English (-en) (iPhone with Dynamic Island 1206x2622, iPad 13" 2064x2752, Android 1080x1920) from the built www/.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'store', 'screenshots');
const scenes = [
  ['1-stone', 0, false], ['2-dynasty', 2, false], ['3-modern-night', 4, true], ['4-future', 5, false], ['5-shop', 1, false, true], ['6-airport', 4, false, false, true],
  ['7-themeparks', 4, false, false, 'parks'], ['8-themeparks-night', 4, true, false, 'parks'],
  ['9-lantern-festival', 2, true, false, 'fest:lantern'], ['10-fireworks', 4, true, false, 'fest:firework'], ['11-cranes', 4, false, false, 'build'], ['12-decor', 4, false, false, 'decor'],
  ['13-postcard', 4, true, false, 'postcard'],   // 13 is the postcard image itself (1080x1350), not a screen
  // 1.0.8: the living day, the seasons and the new buildings
  ['14-dusk-lights', 4, false, false, 'dusk'], ['15-autumn', 4, false, false, 'season:9.6'], ['16-xmas-night', 4, true, false, 'xmas'],
  ['17-spring', 2, false, false, 'season:3.5'], ['18-future-night', 5, true, false, 'adtw'],
];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const lang of ['ko', 'en']) for (const [dev, vp, dpr] of [['ios', { width: 402, height: 874 }, 3], ['ipad', { width: 1032, height: 1376 }, 2], ['android', { width: 360, height: 640 }, 3]].filter(d => !process.env.DEV || d[0] === process.env.DEV)) {
    for (const [name, era, night, shop, feat] of scenes.filter(s => !process.env.ONLY || s[0].includes(process.env.ONLY))) {
      const p = await (await b.newContext({ viewport: vp, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, ...(dev === 'android' ? { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' } : {}), locale: lang === 'ko' ? 'ko-KR' : 'en-US' })).newPage();
      await p.goto('file://' + path.join(__dirname, '..', 'www', 'index.html')); await p.waitForFunction(() => { const b = document.getElementById('boot'); return !b || b.hidden; }, null, { timeout: 30000 });
      await p.evaluate(([era, night, shop, feat]) => {
        closeEra(); try { localStorage.clear(); } catch (e) {}
        document.querySelectorAll('.devonly').forEach(e => e.remove());   // test-page tools (fast-forward etc.) are not in the app
        W = blankWorld(77); genTerrain(W); W.era = era; W.cm = 5; W.ct = 10;   // early summer unless a scene says otherwise
        for (let i = 0; i < N * N; i++) if (Math.hypot(i % N - 32, (i / N | 0) - 32) < (feat === true ? 20 : 13)) { W.terrain[i] = 0; W.trees[i] = 0; } derive(W);
        const road = (x, y) => { if (inb(x, y) && W.terrain[idx(x, y)] !== 1 && W.kind[idx(x, y)] !== K.ROAD) placeRaw(K.ROAD, x, y); };
        const R = era === 0 ? 5 : 9;
        for (let c = 32 - R; c <= 32 + R; c++) for (let k = 32 - R; k <= 32 + R; k++) { if ((c - 32) % 4 === 0) road(c, k); if ((k - 32) % 4 === 0) road(k, c); }
        const civ = era === 0 ? [[K.FIREPIT, 31, 31], [K.FIREPIT, 34, 34], [K.PARK, 29, 34]] : era === 2 ? [[K.WELL, 30, 30], [K.WELL, 34, 35], [K.PALACE, 33, 29], [K.SCHOOL, 25, 33], [K.POLICE, 30, 34]]
          : [[K.COAL, 18, 30], [K.SCHOOL, 25, 33], [K.STADIUM, 33, 25], [K.HALL, 29, 29], [K.TOWER, 34, 34], [K.FIRE, 30, 37]];
        for (const [k, x, y] of civ) if (validAt({ id: 'x', size: sizeOf(k) }, x, y) || true) placeRaw(k, x, y);
        const mx = ERAS[era].maxL;
        for (let y = 32 - R; y <= 32 + R; y++) for (let x = 32 - R; x <= 32 + R; x++) { const i = idx(x, y); if (W.kind[i] || W.terrain[i] === 1) continue; const d = Math.max(Math.abs(x - 32), Math.abs(y - 32));
          const k = x > 32 + R - 3 && y > 32 + R - 3 ? K.IND : d < 3 ? K.COM : (x * 3 + y) % 11 === 0 ? K.PARK : K.RES; placeRaw(k, x, y);
          if (k !== K.PARK) W.level[i] = Math.max(1, mx[k] - ((x * 7 + y * 3) % 2) - (d > R - 2 ? 1 : 0)); }
        recompute(); for (let i = 0; i < N * N; i++) W.fire[i] = 0;
        cars = []; for (let k = 0; k < 140; k++) spawnCar(); buildTools(); setTool('inspect'); updateHud(true);
        W.powered.fill(1); W.grid.fill(1); W.road.fill(1);
        if (feat === 'parks') { // world theme parks filling the 3×3 blocks between the roads, with the country picker open by day
          const spots = [[33, 33, 0], [29, 29, 5], [33, 29, 7], [29, 33, 1], [37, 29, 3], [33, 25, 10], [25, 33, 6], [37, 33, 11], [29, 37, 12], [33, 37, 2], [25, 29, 9], [29, 25, 4]];
          for (const [x, y, n] of spots) { for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) clearTile(x + dx, y + dy); placeRaw(K.THEME, x, y); W.level[idx(x, y)] = n; }
          for (let i = 0; i < N * N; i++) if (W.kind[i] >= K.RES && W.kind[i] <= K.IND) W.level[i] = Math.min(W.level[i], 2); // low-rise around the parks so they stand out
          recompute(); W.powered.fill(1); W.grid.fill(1); W.road.fill(1); cars = []; for (let k = 0; k < 140; k++) spawnCar();
          if (!night) { W.st.pop = Math.max(W.st.pop, 2000); setTool('theme'); subSel.theme = 0; }
        }
        if (feat === true) { // the newer things: an airport with a plane landing, a railway with a train, a harbour, decorations and a name tag
          for (let y = 18; y <= 22; y++) for (let x = 42; x <= 46; x++) clearTile(x, y);
          placeRaw(K.AIRPORT, 42, 18);
          for (let x = 22; x <= 41; x++) { clearTile(x, 21); placeRaw(K.RAIL, x, 21); W.rail[idx(x, 21)] = 1; }
          clearTile(30, 20); placeRaw(K.DEPOT, 30, 20); clearTile(36, 20); placeRaw(K.DEPOT, 36, 20);
          for (let y = 11; y <= 16; y++) for (let x = 34; x <= 40; x++) { clearTile(x, y); W.terrain[idx(x, y)] = 1; W.trees[idx(x, y)] = 0; } derive(W);
          clearTile(37, 17); placeRaw(K.PORT, 37, 17); clearTile(33, 13); placeRaw(K.PORT, 33, 13);
          for (let y = 17; y <= 20; y++) for (let x = 38; x <= 41; x++) if (!W.kind[idx(x, y)]) { clearTile(x, y); }
          const deco = (L, x, y, r) => { clearTile(x, y); placeRaw(K.DECO, x, y); W.level[idx(x, y)] = L; W.vari[idx(x, y)] = r || 0; };
          deco(8, 33, 33); deco(7, 31, 33); deco(7, 35, 31); deco(9, 31, 31); deco(4, 34, 34, 1); deco(6, 30, 34, 2); deco(11, 29, 31); deco(12, 35, 35);
          W.labels[idx(33, 33)] = LANG === 'en' ? 'Town fountain' : '우리 동네 분수'; W.wx = 3; W.wxEnd = Date.now() + 1e9;
          recompute(); W.powered.fill(1); W.grid.fill(1); W.road.fill(1);
          trains = []; for (let k = 0; k < 400; k++) stepTrains(.1); boats = []; for (let k = 0; k < 300; k++) stepBoats(.3);
          planes.clear(); planes.set(idx(42, 18), { ph: 'land', u: -1.5, alt: 0, dir: 1, e: 4, t: 0 }); stepPlanes(.01);
        }
        if (typeof feat === 'string' && feat.startsWith('fest:')) { W.ev = { c: 0, nf: 1e9, nd: 1e9, fest: { k: feat.slice(5), end: 60 }, dis: null }; festSrc = null; festFxs = []; }
        if (feat === 'build') { // a town rebuilding after an earthquake: cranes swinging over a dozen sites, the recovery card showing progress
          const ts = []; for (let i = 0; i < N * N; i++) if (isBld(i) && hash(i % N, i / N | 0, 5) < .16) { W.build[i] = 99999; W.te[i] = era; ts.push(i); }
          const t12 = ts.slice(0, 12); for (const i of t12.slice(0, 3)) W.build[i] = 0; W.ev = { c: 0, nf: 1e9, nd: 1e9, fest: null, dis: { k: 'quake', ph: 'fix', tiles: t12, n: t12.length } };
        }
        if (feat === 'decor') { // three blocks turned into a plaza: fountain and flower beds, a statue, a clock tower with a pavilion and a playground
          const deco = (L, x, y, r) => { clearTile(x, y); placeRaw(K.DECO, x, y); W.level[idx(x, y)] = L; W.vari[idx(x, y)] = r || 0; };
          for (const [x, y, L, r] of [[33,33,0],[34,33,7],[35,33,0],[33,34,7],[34,34,8],[35,34,7],[33,35,0],[34,35,4,1],[35,35,0],
            [30,34,9],[29,33,6,2],[31,33,0],[29,35,0],[31,35,6],[30,33,4],[30,35,4,2],[29,34,7],[31,34,7],
            [34,30,10],[33,29,11],[35,31,12],[33,31,7],[35,29,7],[34,29,0],[34,31,0],[33,30,0],[35,30,0]]) deco(L, x, y, r);
          for (let i = 0; i < N * N; i++) if (W.kind[i] >= K.RES && W.kind[i] <= K.IND && Math.hypot(i % N - 32, (i / N | 0) - 32) < 8) W.level[i] = Math.min(W.level[i], 2);   // low-rise round the plaza so it shows
          W.labels[idx(34, 34)] = LANG === 'en' ? 'Town fountain' : '우리 동네 분수'; recompute(); W.powered.fill(1); W.grid.fill(1); W.road.fill(1);
        }
        const woods = () => { for (let i = 0; i < N * N; i++) { const d = Math.hypot(i % N - 32, (i / N | 0) - 32); if (d >= 10.5 && d < 18 && !W.kind[i] && W.terrain[i] === 0) W.trees[i] = 1 + (i * 7) % 3; } };
        if (typeof feat === 'string' && feat.startsWith('season:')) { const m = +feat.slice(7); W.cm = Math.floor(m); W.ct = Math.round((m % 1) * CAL_T); W.wx = 0; W.wxEnd = Date.now() + 1e9; W.snow = 0; woods(); }
        if (feat === 'dusk') { W.tod = 19.1; dayMode = 'auto'; paintDayBtn(); W.wx = 0; W.wxEnd = Date.now() + 1e9; cars = []; for (let k = 0; k < 200; k++) spawnCar(); }
        if (feat === 'xmas') { // a snowy Christmas night: lights on every house, a tree and snowmen in the middle of town
          xmasTest = true; W.cm = 11; W.ct = 10; W.snow = .8; W.wx = 2; W.wxEnd = Date.now() + 1e9; woods();
          const deco = (L, x, y) => { clearTile(x, y); placeRaw(K.DECO, x, y); W.level[idx(x, y)] = L; W.vari[idx(x, y)] = 0; };
          deco(25, 33, 33); deco(26, 34, 34); deco(26, 31, 33); recompute(); W.powered.fill(1); W.grid.fill(1); W.road.fill(1); }
        if (feat === 'adtw') { for (const [x, y] of [[33, 33], [34, 33], [33, 34], [34, 34]]) clearTile(x, y); placeRaw(K.AD, 33, 33); recompute(); W.powered.fill(1); W.grid.fill(1); W.road.fill(1); }
        if (feat === 'decor' || (typeof feat === 'string' && feat.startsWith('fest:'))) cam.s = 4; else if (typeof feat === 'string' && feat !== 'parks') cam.s = 3;
        cam.x = feat === true ? 330 : feat ? 0 : 0; cam.y = feat === true ? 500 : feat ? 31 * 16 + 30 : 32 * 16 + 20; if (feat === true) cam.s = 3; if (feat === 'parks') cam.s = 3.3; if (innerWidth > 700) cam.s = Math.round(cam.s * 1.8 * 10) / 10; // tablets show far more map: zoom in so the city fills the shot
        if (night) { dayMode = 'night'; W.tod = 22; paintDayBtn(); } setSpeed(0); document.querySelectorAll('.toast').forEach(t => t.remove());
        if (shop) { // the top-up screen with store-style prices (the real app shows the App Store's own prices)
          window.DotIAP = { products: () => Promise.resolve([['dotcity.coins.small', 2200], ['dotcity.coins.medium', 5500], ['dotcity.coins.large', 13000]]
            .map(([identifier, price]) => ({ identifier, price, priceString: '₩' + price.toLocaleString('ko-KR') }))), buy: () => new Promise(() => {}) };
          window.DotAds = { show: () => new Promise(() => {}) }; openShop();
        }
      }, [era, night, shop, feat]);
      await p.waitForTimeout(feat && typeof feat === 'string' && feat.startsWith('fest:') ? 9000 : 1500);   // let lanterns rise and rockets burst
      if (feat === 'fest:firework') { await p.evaluate(() => { const cols = ['#ff5f7a', '#ffd84a', '#5fe0ff', '#9aff6a', '#ffffff', '#c28bff'], lw = view.width / cam.s, lh = view.height / cam.s;   // a sky full of bursts over what is on screen
          for (let b = 0; b < 9; b++) { const x = X0 + lw * (.12 + .76 * ((b * .37) % 1)), y = Y0 + lh * (.28 + .3 * ((b * .61) % 1)), c = cols[b % cols.length], d = (b % 3) * .12;
            for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2, sp = 20 + (k % 4) * 4; parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .8, life: -d, max: 1.8, sz: 1, kind: 'fw', c, g: 14 }); } } });
        await p.waitForTimeout(650); }
      const file = path.join(out, `${dev}${lang === 'en' ? '-en' : ''}-${name}.png`);
      if (feat === 'postcard') { const url = await p.evaluate(async () => { const bl = await makePostcard(); return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(bl); }); });
        fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); }
      else await p.screenshot({ path: file }); await p.context().close();
      await p.close();
    }
  }
  await b.close(); console.log('Screenshots saved to store/screenshots');
})();
