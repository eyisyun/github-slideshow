// Store screenshots with a caption on top: takes the plain shots from store/screenshots (run make-screenshots.cjs first)
// and writes store/screenshots/marketing/{ios,ipad}[-en]-NN.png in App Store order.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'store', 'screenshots'), out = path.join(dir, 'marketing');
const fonts = 'file://' + path.join(__dirname, '..', 'www', 'fonts.css');
// [plain shot, ko title, ko line, en title, en line]
const SHOTS = [
  ['7-themeparks', '세계 테마파크 20종', '나라마다 하나씩, 세계 명소를 모아 보세요', '20 World Theme Parks', 'Collect a landmark park from every country'],
  ['4-future', '네온이 빛나는 미래 도시', '캡슐 하우스부터 메가 아콜로지까지', 'A Neon Future City', 'From capsule homes to mega arcologies'],
  ['3-modern-night', '불빛 가득한 밤의 대도시', '밤이 되면 창문마다 불이 켜져요', 'A City That Glows at Night', 'Every window lights up after dark'],
  ['6-airport', '기차, 배, 비행기까지', '공항과 철도, 항구를 지어 보세요', 'Trains, Ships & Planes', 'Build airports, railways and harbours'],
  ['1-stone', '석기시대 움집에서 시작', '모닥불 곁 작은 마을이 대도시가 되기까지', 'Start in the Stone Age', 'Grow a campfire village into a big city'],
  ['2-dynasty', '한옥 마을로 성장', '시대를 건널 때마다 도시가 바뀌어요', 'Grow a Hanok Village', 'Your city changes with every era'],
  ['8-themeparks-night', '밤에 더 빛나는 테마파크', '명소마다 불빛이 반짝여요', 'Theme Parks That Sparkle', 'Every landmark lights up at night'],
];
const DEV = { ios: { w: 402, h: 874, dpr: 3, t: 33, s: 17, top: 21, iw: 84, r: 26 }, ipad: { w: 1032, h: 1376, dpr: 2, t: 62, s: 30, top: 19, iw: 80, r: 34 } };
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [dev, d] of Object.entries(DEV)) {
    const p = await b.newPage({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr });
    for (const lang of ['ko', 'en']) for (let n = 0; n < SHOTS.length; n++) {
      const [name, kt, ks, et, es] = SHOTS[n], src = path.join(dir, `${dev}${lang === 'en' ? '-en' : ''}-${name}.png`);
      if (!fs.existsSync(src)) { console.log('missing', src); continue; }
      const img = 'data:image/png;base64,' + fs.readFileSync(src).toString('base64');
      const stars = Array.from({ length: 30 }, (_, i) => [(i * 37 + 11) % 97, (i * 53 + 7) % (d.top - 3)]).filter(([, y]) => y < d.top * .25 || y > d.top * .75) // keep clear of the caption
        .map(([x, y]) => `<i style="left:${x}%;top:${y}%"></i>`).join('');
      await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${fonts}"><style>
        html,body{margin:0;width:${d.w}px;height:${d.h}px;overflow:hidden;background:linear-gradient(180deg,#2b3966,#141a30 70%);font-family:"Do Hyeon",sans-serif}
        i{position:absolute;width:${d.dpr === 3 ? 2 : 3}px;height:${d.dpr === 3 ? 2 : 3}px;background:#a9a69d;opacity:.7}
        .cap{position:absolute;left:0;right:0;top:${d.top * .3}%;text-align:center;padding:0 18px}
        .t{font-size:${d.t}px;line-height:1.15;color:#ffcc4d;text-shadow:0 3px 0 #6a4a10,0 6px 18px rgba(0,0,0,.45)}
        .s{margin-top:${Math.round(d.s * .55)}px;font-size:${d.s}px;color:#d6dcf5}
        .shot{position:absolute;left:${(100 - d.iw) / 2}%;width:${d.iw}%;top:${d.top}%;border-radius:${d.r}px;overflow:hidden;border:${d.dpr === 3 ? 5 : 8}px solid #0c1024;box-shadow:0 18px 50px rgba(0,0,0,.55)}
        .shot img{display:block;width:100%}
      </style></head><body>${stars}<div class="cap"><div class="t">${lang === 'ko' ? kt : et}</div><div class="s">${lang === 'ko' ? ks : es}</div></div><div class="shot"><img src="${img}"></div></body></html>`);
      await p.evaluate(() => document.fonts.ready);
      await p.screenshot({ path: path.join(out, `${dev}${lang === 'en' ? '-en' : ''}-${String(n + 1).padStart(2, '0')}.png`) });
    }
    await p.close();
  }
  await b.close(); console.log('Marketing screenshots saved to store/screenshots/marketing');
})();
