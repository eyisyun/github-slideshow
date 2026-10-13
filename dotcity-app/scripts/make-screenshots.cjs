// Renders store screenshots (iPhone with Dynamic Island 1206x2622, Android 1080x1920) from the built www/.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'store', 'screenshots');
const scenes = [
  ['1-stone', 0, false], ['2-dynasty', 2, false], ['3-modern-night', 4, true], ['4-future', 5, false], ['5-shop', 1, false, true], ['6-airport', 4, false, false, true],
];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [dev, vp, dpr] of [['ios', { width: 402, height: 874 }, 3], ['android', { width: 360, height: 640 }, 3]]) {
    for (const [name, era, night, shop, feat] of scenes) {
      const p = await b.newPage({ viewport: vp, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
      await p.goto('file://' + path.join(__dirname, '..', 'www', 'index.html')); await p.waitForTimeout(900);
      await p.evaluate(([era, night, shop, feat]) => {
        closeEra(); try { localStorage.clear(); } catch (e) {}
        W = blankWorld(77); genTerrain(W); W.era = era;
        for (let i = 0; i < N * N; i++) if (Math.hypot(i % N - 32, (i / N | 0) - 32) < (feat ? 20 : 13)) { W.terrain[i] = 0; W.trees[i] = 0; } derive(W);
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
        if (feat) { // the newer things: an airport with a plane landing, a railway with a train, a harbour, decorations and a name tag
          for (let y = 18; y <= 22; y++) for (let x = 42; x <= 46; x++) clearTile(x, y);
          placeRaw(K.AIRPORT, 42, 18);
          for (let x = 22; x <= 41; x++) { clearTile(x, 21); placeRaw(K.RAIL, x, 21); W.rail[idx(x, 21)] = 1; }
          clearTile(30, 20); placeRaw(K.DEPOT, 30, 20); clearTile(36, 20); placeRaw(K.DEPOT, 36, 20);
          for (let y = 11; y <= 16; y++) for (let x = 34; x <= 40; x++) { clearTile(x, y); W.terrain[idx(x, y)] = 1; W.trees[idx(x, y)] = 0; } derive(W);
          clearTile(37, 17); placeRaw(K.PORT, 37, 17); clearTile(33, 13); placeRaw(K.PORT, 33, 13);
          for (let y = 17; y <= 20; y++) for (let x = 38; x <= 41; x++) if (!W.kind[idx(x, y)]) { clearTile(x, y); }
          const deco = (L, x, y, r) => { clearTile(x, y); placeRaw(K.DECO, x, y); W.level[idx(x, y)] = L; W.vari[idx(x, y)] = r || 0; };
          deco(8, 33, 33); deco(7, 31, 33); deco(7, 35, 31); deco(9, 31, 31); deco(4, 34, 34, 1); deco(6, 30, 34, 2); deco(11, 29, 31); deco(12, 35, 35);
          W.labels[idx(33, 33)] = '우리 동네 분수'; W.wx = 3; W.wxEnd = Date.now() + 1e9;
          recompute(); W.powered.fill(1); W.grid.fill(1); W.road.fill(1);
          trains = []; for (let k = 0; k < 400; k++) stepTrains(.1); boats = []; for (let k = 0; k < 300; k++) stepBoats(.3);
          planes.clear(); planes.set(idx(42, 18), { ph: 'land', u: -1.5, alt: 0, dir: 1, e: 4, t: 0 }); stepPlanes(.01);
        }
        cam.x = feat ? 330 : 0; cam.y = feat ? 500 : 32 * 16 + 20; if (feat) cam.s = 3; if (night) { dayMode = 'night'; W.tod = 22; paintDayBtn(); } setSpeed(0); document.querySelectorAll('.toast').forEach(t => t.remove());
        if (shop) { // the top-up screen with store-style prices (the real app shows the App Store's own prices)
          window.DotIAP = { products: () => Promise.resolve([['dotcity.coins.small', 2200], ['dotcity.coins.medium', 5500], ['dotcity.coins.large', 13000]]
            .map(([identifier, price]) => ({ identifier, price, priceString: '₩' + price.toLocaleString('ko-KR') }))), buy: () => new Promise(() => {}) };
          window.DotAds = { show: () => new Promise(() => {}) }; openShop();
        }
      }, [era, night, shop, feat]);
      await p.waitForTimeout(1500);
      await p.screenshot({ path: path.join(out, `${dev}-${name}.png`) });
      await p.close();
    }
  }
  await b.close(); console.log('Screenshots saved to store/screenshots');
})();
