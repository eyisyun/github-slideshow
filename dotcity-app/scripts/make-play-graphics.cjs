// Google Play listing art: the 1024x500 feature graphic (ko/en) and the 512x512 hi-res icon, written to store/play/.
// Uses the plain night shot from store/screenshots (run make-screenshots.cjs first) and assets/icon-only.png.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'store', 'play');
const fonts = 'file://' + path.join(root, 'www', 'fonts.css');
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(path.join(root, f)).toString('base64');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1024, height: 500 } });
  const icon = b64('assets/icon-only.png');
  for (const [lang, title, sub] of [['ko', '도트시티', '석기시대부터 미래까지, 픽셀 도시'], ['en', 'Dot City', 'Pixel city builder, Stone Age to the future']]) {
    const shot = b64(`store/screenshots/ipad${lang === 'en' ? '-en' : ''}-3-modern-night.png`);
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${fonts}"><style>
      html,body{margin:0;width:1024px;height:500px;overflow:hidden;background:#141a30;font-family:"Do Hyeon",sans-serif}
      .bg{position:absolute;inset:0;background:url(${shot}) center 62%/1100px auto no-repeat;image-rendering:pixelated}
      .fade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(20,26,48,.96) 0,rgba(20,26,48,.88) 42%,rgba(20,26,48,0) 72%)}
      .box{position:absolute;left:56px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:26px}
      img{width:132px;height:132px;border-radius:30px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
      .t{font-size:${lang === 'ko' ? 84 : 76}px;line-height:1;color:#ffcc4d;text-shadow:0 4px 0 #6a4a10,0 8px 22px rgba(0,0,0,.5)}
      .s{margin-top:14px;font-size:${lang === 'ko' ? 30 : 26}px;color:#e3e7fa;white-space:nowrap}
    </style></head><body><div class="bg"></div><div class="fade"></div><div class="box"><img src="${icon}"><div><div class="t">${title}</div><div class="s">${sub}</div></div></div></body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(out, `feature-graphic${lang === 'en' ? '-en' : ''}.png`) });
  }
  await p.setViewportSize({ width: 512, height: 512 });
  await p.setContent(`<html><body style="margin:0"><img src="${icon}" style="width:512px;height:512px;display:block"></body></html>`);
  await p.screenshot({ path: path.join(out, 'icon-512.png') });
  await b.close(); console.log('Play graphics saved to store/play');
})();
