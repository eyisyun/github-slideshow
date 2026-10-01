// Renders store screenshots (iPhone 6.7"/6.9" class 1290x2796, Android 1080x1920) from the built www/.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'store', 'screenshots');
const scenes = [
  ['1-stone', 0, false], ['2-dynasty', 2, false], ['3-modern-night', 4, true],
];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [dev, vp, dpr] of [['ios', { width: 430, height: 932 }, 3], ['android', { width: 360, height: 640 }, 3]]) {
    for (const [name, era, night] of scenes) {
      const p = await b.newPage({ viewport: vp, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
      await p.goto('file://' + path.join(__dirname, '..', 'www', 'index.html')); await p.waitForTimeout(900);
      await p.evaluate(([era, night]) => {
        closeEra(); try { localStorage.clear(); } catch (e) {}
        W = blankWorld(77); genTerrain(W); W.era = era;
        for (let i = 0; i < N * N; i++) if (Math.hypot(i % N - 32, (i / N | 0) - 32) < 13) { W.terrain[i] = 0; W.trees[i] = 0; } derive(W);
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
        cam.x = 0; cam.y = 32 * 16 + 20; if (night) { dayMode = 'night'; W.tod = 22; paintDayBtn(); } setSpeed(0); document.querySelectorAll('.toast').forEach(t => t.remove());
      }, [era, night]);
      await p.waitForTimeout(1500);
      await p.screenshot({ path: path.join(out, `${dev}-${name}.png`) });
      await p.close();
    }
  }
  await b.close(); console.log('Screenshots saved to store/screenshots');
})();
