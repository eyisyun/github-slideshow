// Downloads the game's Google Fonts (Do Hyeon, Silkscreen) into assets/fonts so the app works offline.
// Run once with network access: npm run fonts
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'fonts');
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Do+Hyeon&family=Silkscreen:wght@400;700&display=swap';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

await mkdir(outDir, { recursive: true });
let css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();
const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]))];
let n = 0;
for (const url of urls) {
  const name = `f${String(n++).padStart(3, '0')}.woff2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font download failed (${res.status}): ${url}`);
  await writeFile(join(outDir, name), Buffer.from(await res.arrayBuffer()));
  css = css.split(url).join(`fonts/${name}`);
}
await writeFile(join(outDir, 'fonts.css'), css);
console.log(`Saved ${urls.length} font files to assets/fonts`);
