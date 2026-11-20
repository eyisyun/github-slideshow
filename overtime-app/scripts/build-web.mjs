// ../overtime (게임 원본)을 www/ 로 복사해 Capacitor 앱에 넣습니다.
// 앱 안에서는 상태 표시줄을 숨기고, 화면을 켜 둔 채로 유지하며, 홈 화면으로 나가면 일시정지합니다(게임 쪽에서 처리).
import { cp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, '..', 'overtime');
const www = join(root, 'www');

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });
for (const dir of ['js', 'fonts', 'sprites']) await cp(join(src, dir), join(www, dir), { recursive: true });

let html = await readFile(join(src, 'index.html'), 'utf8');
// 네이티브 연결: 상태 표시줄 숨김, 진동(햅틱)
const glue = `<script type="module">
  const C = window.Capacitor;
  if (C && C.isNativePlatform && C.isNativePlatform()) {
    document.documentElement.classList.add('native');
    const P = C.Plugins || {};
    try { P.StatusBar && P.StatusBar.hide(); } catch (e) {}
    window.__haptic = (style) => { try { P.Haptics && P.Haptics.impact({ style: style || 'LIGHT' }); } catch (e) {} };
  }
</script>
`;
html = html.replace('<script src="js/art.js"></script>', glue + '<script src="js/art.js"></script>');
if (!html.includes('__haptic')) throw new Error('index.html 구조가 바뀌어 네이티브 연결 코드를 넣지 못했습니다');
await writeFile(join(www, 'index.html'), html);
console.log('www/ 준비 완료');
