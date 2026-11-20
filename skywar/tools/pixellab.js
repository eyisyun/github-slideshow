#!/usr/bin/env node
// PixelLab API로 전투기 부품 스프라이트를 생성해 public/sprites/<부품ID>.png 로 저장합니다.
//
//   PIXELLAB_API_KEY=키 node tools/pixellab.js            # 아직 그림이 없는 부품 전부
//   PIXELLAB_API_KEY=키 node tools/pixellab.js w2 b3      # 지정한 부품만
//   ... --force    이미 있는 그림도 다시 생성
//   ... --dry      API를 부르지 않고 무엇을 보낼지만 출력
//   ... --seed 42  같은 시드로 비슷한 결과 재현
//
// 각 부품은 public/sprites/templates/<부품ID>.png 를 초기 이미지(init_image)로 보내므로
// 결과가 템플릿과 같은 위치에 그려져 조립했을 때 서로 맞습니다.
// 프롬프트·스타일은 public/sprites/prompts.json 에서 고칩니다.
const fs = require('fs');
const path = require('path');
const { PARTS } = require('../public/parts.js');

const ROOT = path.join(__dirname, '..', 'public', 'sprites');
const API = 'https://api.pixellab.ai/v1/generate-image-pixflux';
const SIZE = 32;

const args = process.argv.slice(2);
const force = args.includes('--force');
const dry = args.includes('--dry');
const seedIdx = args.indexOf('--seed');
const seed = seedIdx >= 0 ? parseInt(args[seedIdx + 1], 10) : undefined;
const only = args.filter((a, i) => !a.startsWith('--') && !(seedIdx >= 0 && i === seedIdx + 1));

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'prompts.json'), 'utf8'));
const key = process.env.PIXELLAB_API_KEY;
if (!key && !dry) {
  console.error('PIXELLAB_API_KEY 환경 변수에 PixelLab API 키를 넣어 주세요. (pixellab.ai → Account → API)');
  process.exit(1);
}

const ids = (only.length ? only : Object.keys(cfg.parts)).filter(id => {
  if (!PARTS[id] || !cfg.parts[id]) { console.warn(`알 수 없는 부품: ${id}`); return false; }
  if (!force && fs.existsSync(path.join(ROOT, `${id}.png`))) { console.log(`${id}: 이미 있음 (다시 만들려면 --force)`); return false; }
  return true;
});

async function generate(id) {
  const s = cfg.settings || {};
  const tpl = path.join(ROOT, 'templates', `${id}.png`);
  const body = {
    description: `${cfg.parts[id]}, ${cfg.style}`,
    image_size: { width: SIZE, height: SIZE },
    no_background: true,
    view: s.view, direction: s.direction, outline: s.outline, shading: s.shading, detail: s.detail,
    text_guidance_scale: s.text_guidance_scale,
  };
  if (fs.existsSync(tpl)) {
    body.init_image = { type: 'base64', base64: fs.readFileSync(tpl).toString('base64') };
    body.init_image_strength = s.init_image_strength;
  }
  if (Number.isFinite(seed)) body.seed = seed;
  if (dry) {
    console.log(`${id}: ${body.description}${body.init_image ? ' [템플릿 사용]' : ''}`);
    return;
  }
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  const b64 = data.image && data.image.base64;
  if (!b64) throw new Error('응답에 이미지가 없습니다');
  fs.writeFileSync(path.join(ROOT, `${id}.png`), Buffer.from(b64.replace(/^data:image\/png;base64,/, ''), 'base64'));
  const cost = data.usage && data.usage.usd !== undefined ? ` ($${data.usage.usd})` : '';
  console.log(`${id}: 저장 완료 → public/sprites/${id}.png${cost}`);
}

(async () => {
  if (!ids.length) return console.log('생성할 부품이 없습니다.');
  console.log(`${ids.length}개 부품 생성: ${ids.join(', ')}`);
  let failed = 0;
  for (const id of ids) {
    try { await generate(id); }
    catch (e) { failed++; console.error(`${id}: 실패 — ${e.message}`); if (/40[12]/.test(e.message)) break; }
  }
  if (failed) process.exitCode = 1;
})();
