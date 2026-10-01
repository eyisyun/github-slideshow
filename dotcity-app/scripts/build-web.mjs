// Builds www/ for Capacitor from the single game source (../dotcity/index.html).
// The game file is authored as a page body; this wraps it in a full HTML document,
// swaps Google Fonts for the bundled copies, and adds the native-app glue.
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, '..', 'dotcity', 'index.html');
const www = join(root, 'www');

let game = await readFile(src, 'utf8');
const title = (game.match(/<title>([^<]*)<\/title>/) || [, '도트시티'])[1];
game = game
  .replace(/<title>[^<]*<\/title>\s*/, '')
  .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '');

if (!existsSync(join(root, 'assets', 'fonts', 'fonts.css'))) {
  throw new Error('assets/fonts is missing. Run `npm run fonts` once with network access.');
}

const head = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#141a30">
<meta name="color-scheme" content="dark">
<meta name="format-detection" content="telephone=no">
<title>${title}</title>
<link rel="stylesheet" href="fonts.css">
<style>
  html, body { margin: 0; height: 100%; background: #141a30; overscroll-behavior: none; }
  body { -webkit-touch-callout: none; -webkit-text-size-adjust: 100%; touch-action: manipulation; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
`;

// Native glue: Android back button, auto-save when the app goes to the background, status bar.
const native = `
<script>
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var P = C.Plugins || {}, App = P.App, Bar = P.StatusBar, Splash = P.SplashScreen;
  var $ = function (s) { return document.querySelector(s); };
  try { if (Bar) { Bar.setStyle({ style: 'DARK' }); if (C.getPlatform() === 'android') Bar.setBackgroundColor({ color: '#141a30' }); } } catch (e) {}
  try { if (Splash) Splash.hide(); } catch (e) {}
  function persist() { try { save(); } catch (e) {} }
  if (App) {
    App.addListener('backButton', function () {
      if (!$('#eraModal').hidden) { closeEra(); return; }
      if (!$('#menu').hidden) { closeMenu(); return; }
      if (!$('#info').hidden) { $('#info').hidden = true; selected = null; return; }
      if (tool !== 'inspect') { setTool('inspect'); return; }
      persist(); if (App.minimizeApp) App.minimizeApp();
    });
    App.addListener('pause', persist);
    App.addListener('appStateChange', function (s) { if (!s.isActive) persist(); });
  }
  window.addEventListener('pagehide', persist);
})();
</script>
`;

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });
await cp(join(root, 'assets', 'fonts'), join(www, 'fonts'), { recursive: true });
await cp(join(root, 'assets', 'fonts', 'fonts.css'), join(www, 'fonts.css'));
await writeFile(join(www, 'index.html'), head + game + native + '</body>\n</html>\n');
console.log('Built www/index.html from dotcity/index.html');
