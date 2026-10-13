// Renders the app icon and splash images from the game's own pixel sprites (needs Playwright + Chromium).
// Output: assets/icon-only.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, '..', 'www', 'index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.fonts.load('160px "Do Hyeon"', '도트시티'));
  const out = await p.evaluate(() => {
    // 128px pixel scene: a 2x2 diorama with a pit house, campfire, hanok and an office tower
    const scene = document.createElement('canvas'); scene.width = 128; scene.height = 128;
    const g = scene.getContext('2d'); g.imageSmoothingEnabled = false;
    const tiles = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const objs = { '0,0': SP.bld[K.COM][3][1], '1,0': SP.E[2][K.RES][2][0], '0,1': SP.E[0][K.RES][1][1], '1,1': SP.firepit };
    let top = 1e9; const y0 = 0;
    for (const [x, y] of tiles) { const sp = objs[x + ',' + y]; top = Math.min(top, y0 + (x + y) * 8 + sp.top); }
    const bottom = y0 + 32 + 12, h = bottom - top, oy = Math.round((128 - h) / 2 - top), ox = 64;
    const tv = (x, y) => [ox + (x - y) * 16, oy + (x + y) * 8];
    for (const [x, y] of tiles) { const [tx, ty] = tv(x, y); g.drawImage(SP.grass[(x * 3 + y) % 8].c, tx - 16, ty);
      if (x === 1) g.drawImage(SP.slab.g[1].c, tx - 16, ty); if (y === 1) g.drawImage(SP.slab.g[0].c, tx - 16, ty); }
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const sp = objs[x + ',' + y], [tx, ty] = tv(x, y); g.drawImage(sp.c, tx + sp.ox, ty + sp.oy); }
    { const [tx, ty] = tv(1, 1); g.fillStyle = '#ffb04a'; for (const [dx, dy] of [[0, 4], [1, 3], [-1, 5], [0, 2], [1, 5]]) g.fillRect(tx + dx, ty + 8 + dy - 6, 1, 2); }
    const bg = (c, size) => { const gr = c.createLinearGradient(0, 0, 0, size); gr.addColorStop(0, '#2b3a66'); gr.addColorStop(1, '#141a30'); c.fillStyle = gr; c.fillRect(0, 0, size, size);
      c.fillStyle = 'rgba(255,240,200,.55)'; const s = size / 128; for (let i = 0; i < 22; i++) { const x = (i * 53 % 128), y = (i * 29 % 60); c.fillRect(Math.round(x * s), Math.round(y * s), Math.ceil(s), Math.ceil(s)); } };
    const make = (size, scale, withBg, text) => { const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      if (withBg) bg(x, size); const w = 128 * scale, off = Math.round((size - w) / 2) - (text ? Math.round(size * .05) : 0);
      x.drawImage(scene, Math.round((size - w) / 2), off, w, w);
      if (text) { x.fillStyle = '#ffcc4d'; x.font = `${Math.round(size * .06)}px "Do Hyeon"`; x.textAlign = 'center'; x.fillText(text, size / 2, off + w + Math.round(size * .07)); }
      return c.toDataURL('image/png'); };
    const solid = size => { const c = document.createElement('canvas'); c.width = c.height = size; bg(c.getContext('2d'), size); return c.toDataURL('image/png'); };
    return { 'icon-only.png': make(1024, 8, true), 'icon-foreground.png': make(1024, 5, false), 'icon-background.png': solid(1024),
      'splash.png': make(2732, 8, true, '도트시티'), 'splash-dark.png': make(2732, 8, true, '도트시티') };
  });
  for (const [name, url] of Object.entries(out)) fs.writeFileSync(path.join(__dirname, '..', 'assets', name), Buffer.from(url.split(',')[1], 'base64'));
  console.log('Wrote', Object.keys(out).join(', '));
  await b.close();
})();
