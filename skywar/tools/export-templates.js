#!/usr/bin/env node
// 코드로 그린 기본 부품을 32×32 PNG 템플릿으로 내보냅니다.
// → public/sprites/templates/<부품ID>.png  (PixelLab의 초기 이미지 / 위치 가이드)
// 부품 모양을 코드에서 바꿨을 때만 다시 실행하면 됩니다. Playwright가 필요합니다.
//   node tools/export-templates.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3199;
const OUT = path.join(__dirname, '..', 'public', 'sprites', 'templates');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { console.error('playwright가 필요합니다: npm install --no-save playwright'); process.exit(1); }

  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  try {
    await new Promise(r => setTimeout(r, 800));
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForFunction(() => typeof window.SKYWAR_TEMPLATES === 'function');
    const urls = await page.evaluate(() => window.SKYWAR_TEMPLATES());
    await browser.close();
    fs.mkdirSync(OUT, { recursive: true });
    for (const [id, url] of Object.entries(urls)) {
      fs.writeFileSync(path.join(OUT, `${id}.png`), Buffer.from(url.split(',')[1], 'base64'));
    }
    console.log(`템플릿 ${Object.keys(urls).length}개 저장 → ${path.relative(process.cwd(), OUT)}`);
  } finally {
    server.kill();
  }
})();
