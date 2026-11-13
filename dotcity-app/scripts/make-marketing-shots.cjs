// Store screenshots with a caption on top: takes the plain shots from store/screenshots (run make-screenshots.cjs first)
// and writes store/screenshots/marketing/{ios,ipad,android}[-en]-NN.png in App Store order.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'store', 'screenshots'), out = path.join(dir, 'marketing');
const fonts = 'file://' + path.join(__dirname, '..', 'www', 'fonts.css');
// [plain shot, ko title, ko line, en title, en line]
const SHOTS = [
  ['14-dusk-lights', '해 질 녘 켜지는 불빛', '창문마다 불이 켜지고 차들이 전조등을 켜요', 'City Lights at Dusk', 'Windows light up one by one as cars head home'],
  ['15-autumn', '단풍이 물드는 가을', '벚꽃부터 단풍, 눈 덮인 겨울까지 계절이 흘러요', 'Autumn Colours', 'Cherry blossom, autumn leaves and snowy winters'],
  ['16-xmas-night', '눈 내리는 크리스마스', '12월이면 집집마다 전구가 반짝여요', 'A Snowy Christmas', 'Every house lights up all December'],
  ['18-future-night', '네온이 빛나는 미래 도시', '홀로그램 광고 타워와 사이버펑크 거리', 'A Neon Future City', 'Hologram ad towers and cyberpunk streets'],
  ['17-spring', '벚꽃 핀 한옥 마을', '봄이면 기와지붕 위로 벚꽃이 피어요', 'Cherry Blossom Village', 'Spring brings blossom to the hanok roofs'],
  ['10-fireworks', '밤하늘의 불꽃 축제', '시대마다 다른 축제가 열려요', 'Fireworks Over Your City', 'Every era throws its own festival'],
  ['7-themeparks', '세계 테마파크 20종', '나라마다 하나씩, 세계 명소를 모아 보세요', '20 World Theme Parks', 'Collect a landmark park from every country'],
  ['6-airport', '기차, 배, 비행기까지', '공항과 철도, 항구를 지어 보세요', 'Trains, Ships & Planes', 'Build airports, railways and harbours'],
  ['9-lantern-festival', '연등회가 열리는 밤', '한옥 지붕 위로 연등회가 열려요', 'A Lantern Festival Night', 'Lanterns drift up over the hanok roofs'],
  ['1-stone', '석기시대 움집에서 시작', '모닥불 곁 작은 마을이 대도시가 되기까지', 'Start in the Stone Age', 'Grow a campfire village into a big city'],
];
const DEV = { ios: { w: 402, h: 874, dpr: 3, t: 33, s: 17, top: 21, iw: 84, r: 26 }, ipad: { w: 1032, h: 1376, dpr: 2, t: 62, s: 30, top: 19, iw: 80, r: 34 },
  android: { w: 360, h: 640, dpr: 3, t: 29, s: 15, top: 20, iw: 76, r: 20 } };
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [dev, d] of Object.entries(DEV).filter(([k]) => !process.env.DEV || k === process.env.DEV)) {
    const p = await b.newPage({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr });
    for (const lang of ['ko', 'en']) for (let n = 0; n < (dev === 'android' ? 8 : SHOTS.length); n++) {
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
        .shot.card{border-radius:6px;border-width:0;top:${d.top + 9}%;transform:rotate(-2deg)}
      </style></head><body>${stars}<div class="cap"><div class="t">${lang === 'ko' ? kt : et}</div><div class="s">${lang === 'ko' ? ks : es}</div></div><div class="shot${name === '13-postcard' ? ' card' : ''}"><img src="${img}"></div></body></html>`);
      await p.evaluate(() => document.fonts.ready);
      await p.screenshot({ path: path.join(out, `${dev}${lang === 'en' ? '-en' : ''}-${String(n + 1).padStart(2, '0')}.png`) });
    }
    await p.close();
  }
  await b.close(); console.log('Marketing screenshots saved to store/screenshots/marketing');
})();
