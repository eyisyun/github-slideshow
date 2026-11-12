// Renders the app icon, splash images and the loading-screen picture from the game's own pixel sprites (needs Playwright + Chromium).
// The scene is a 3x3 island whose buildings climb through the ages from front to back: a Stone Age hut, hanok, brick houses,
// a present-day office block and a neon future tower.
//   icon (day sky):      assets/icon-only.png, icon-foreground.png, icon-background.png
//   splash (dusk sky):   assets/splash.png, splash-dark.png
//   loading screen:      assets/boot-isle.png (transparent dusk island, embedded into dotcity/index.html with --boot)
// Run `node scripts/build-web.mjs` first (it reads www/), then `npm run assets` to make the iOS / Android sizes.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, '..', 'www', 'index.html'));
  await p.waitForFunction(() => { const e = document.getElementById('boot'); return !e || e.hidden; }, null, { timeout: 40000 });
  await p.evaluate(() => document.fonts.load('160px "Do Hyeon"', '도트시티'));
  const out = await p.evaluate(() => {
    const S = (e, k, l, v) => { const a = SP.E[e][k], arr = a[Math.min(l, a.length - 1)]; return arr[v % arr.length]; };
    const R = K.RES, C = K.COM;
    const objs = { '0,0': S(5, C, 3, 0), '1,0': S(4, C, 3, 1), '2,0': S(3, C, 2, 0), '0,1': S(4, R, 3, 1), '1,1': S(2, R, 3, 0),
      '2,1': S(2, R, 2, 1), '0,2': S(3, R, 2, 1), '1,2': S(0, R, 2, 0), '2,2': SP.tree[2] };
    // the island at native pixel size, cropped tight; `night` blends the night sprites in, glows are returned for a later 'lighter' pass
    function island(night) {
      const N = 3, W = N * 32 + 64, H = 420, c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      const ox = W / 2, oy = H - N * 16 - 30, tv = (x, y) => [ox + (x - y) * 16, oy + (x + y) * 8];
      const order = Object.keys(objs).map(k => k.split(',').map(Number)).sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
      const draw = (ctx, key) => {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const [tx, ty] = tv(x, y);
          for (const s of [SP.grass[1], x === N - 1 && SP.slab.g[1], y === N - 1 && SP.slab.g[0]]) if (s) ctx.drawImage(s[key] || s.c, tx - 16, ty); }
        for (const [x, y] of order) { const sp = objs[x + ',' + y], [tx, ty] = tv(x, y); ctx.drawImage(sp[key] || sp.c, tx + sp.ox, ty + sp.oy); }
      };
      draw(g, 'c');
      if (night) { const n = document.createElement('canvas'); n.width = W; n.height = H; const ng = n.getContext('2d'); ng.imageSmoothingEnabled = false;
        draw(ng, 'n'); g.globalAlpha = night; g.drawImage(n, 0, 0); g.globalAlpha = 1; }
      const d = g.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const r = document.createElement('canvas'); r.width = x1 - x0 + 1; r.height = y1 - y0 + 1; r.getContext('2d').drawImage(c, -x0, -y0);
      r.glow = order.map(([x, y]) => { const [tx, ty] = tv(x, y); return [objs[x + ',' + y], tx - x0, ty - y0]; });
      return r;
    }
    const day = island(0), dusk = island(.3);
    const sky = (g, w, h, top, bot, halo) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const m = Math.min(w, h), hl = g.createRadialGradient(w / 2, h * .5, 0, w / 2, h * .5, m * .7); hl.addColorStop(0, halo); hl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hl; g.fillRect(0, 0, w, h); };
    // draws the island scaled by whole/eighth steps so the pixels stay crisp; adds the window glows of a dusk scene on top
    const put = (g, sc, cx, cy, size, glowF) => { const k = Math.floor(size / Math.max(sc.width, sc.height) * 8) / 8, w = sc.width * k, h = sc.height * k, X = Math.round(cx - w / 2), Y = Math.round(cy - h / 2);
      g.imageSmoothingEnabled = false; g.drawImage(sc, X, Y, w, h);
      if (glowF) { const gl = document.createElement('canvas'); gl.width = sc.width; gl.height = sc.height; const q = gl.getContext('2d');
        try { nightF = glowF; } catch (e) {} for (const [sp, tx, ty] of sc.glow) { try { winGlow(q, sp, tx, ty); if (sp.lights) drawGlows(q, sp, tx, ty); } catch (e) {} }
        g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(gl, X, Y, w, h); g.restore(); }
      return [X, Y, w, h]; };
    const DAY = ['#8fd3ff', '#4a8ad8', 'rgba(255,255,255,.35)'], DUSK = ['#ffb06a', '#6a4a9a', 'rgba(255,230,160,.45)'];
    const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
    const icon = () => { const [c, g] = canvas(1024, 1024); sky(g, 1024, 1024, ...DAY); put(g, day, 512, 512 + 41, 1024 * .86); return c.toDataURL('image/png'); };
    // Android adaptive icon: the island on a transparent layer (the launcher shows this whole layer through its mask, see mipmap-anydpi-v26), the sky as the background layer
    const fg = () => { const [c, g] = canvas(1024, 1024); put(g, day, 512, 530, 1024 * .78); return c.toDataURL('image/png'); };
    const bg = () => { const [c, g] = canvas(1024, 1024); sky(g, 1024, 1024, ...DAY); return c.toDataURL('image/png'); };
    const splash = () => { const S0 = 2732, [c, g] = canvas(S0, S0); sky(g, S0, S0, ...DUSK); const [, Y, , h] = put(g, dusk, S0 / 2, S0 * .45, S0 * .34, .6);
      g.fillStyle = '#ffcc4d'; g.font = `${Math.round(S0 * .06)}px "Do Hyeon"`; g.textAlign = 'center'; g.shadowColor = 'rgba(60,30,60,.45)'; g.shadowOffsetY = S0 * .004;
      g.fillText('도트시티', S0 / 2, Y + h + S0 * .09); return c.toDataURL('image/png'); };
    // loading screen: the dusk island alone (transparent, native pixels x2) with its glows baked over a matching dusk backdrop sample
    const boot = () => { const [c, g] = canvas(dusk.width * 2, dusk.height * 2); g.imageSmoothingEnabled = false; g.drawImage(dusk, 0, 0, c.width, c.height); return c.toDataURL('image/png'); };
    return { 'icon-only.png': icon(), 'icon-foreground.png': fg(), 'icon-background.png': bg(), 'splash.png': splash(), 'splash-dark.png': splash(), 'boot-isle.png': boot() };
  });
  const assets = path.join(__dirname, '..', 'assets');
  for (const [name, url] of Object.entries(out)) fs.writeFileSync(path.join(assets, name), Buffer.from(url.split(',')[1], 'base64'));
  console.log('Wrote', Object.keys(out).join(', '));
  if (process.argv.includes('--boot')) { // put the new island into the game's loading screen
    const f = path.join(__dirname, '..', '..', 'dotcity', 'index.html'), s = fs.readFileSync(f, 'utf8');
    const t = s.replace(/(<img class="bt-isle" alt="" src=")data:image\/png;base64,[^"]*/, '$1' + out['boot-isle.png']);
    if (!/<img class="bt-isle" alt="" src="data:image\/png;base64,/.test(s)) throw new Error('bt-isle image not found'); fs.writeFileSync(f, t); console.log('Updated the loading-screen island in dotcity/index.html');
  }
  await b.close();
})();
