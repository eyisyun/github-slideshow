// Builds www/ for Capacitor from the single game source (../dotcity/index.html).
// The game file is a full HTML page; this strips its document shell, rewraps it,
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
  .replace(/<!doctype html>\s*|<\/?html[^>]*>\s*|<\/?head>\s*|<\/?body>\s*|<meta charset="[^"]*">\s*/gi, '')
  .replace(/<title>[^<]*<\/title>\s*/, '')
  .replace(/<meta name="viewport"[^>]*>\s*/, '')
  .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '');

// "시대 골라 시작" is a testing aid (it hands out late-era funds), so store builds leave it out.
// Keep it for device testing with: DOT_TEST=1 npm run sync
if (!process.env.DOT_TEST) {
  const before = game.length;
  game = game.replace(/\s*<h3 class="msub">[\s\S]*?<\/h3>\s*<div class="eras" id="mEras">[\s\S]*?<\/div>/, '');
  if (game.length === before) throw new Error('era picker markup not found; update build-web.mjs');
}

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

// Native glue: Android back button, auto-save when the app goes to the background, status bar, in-app purchases, rewarded ads.
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

  // In-app purchase (consumable fund packs) through @capgo/native-purchases (StoreKit 2 / Play Billing).
  // Every transaction id is recorded on the device so a pack is never granted twice.
  var NP = P.NativePurchases;
  if (NP) {
    var IDS = ['dotcity.coins.small', 'dotcity.coins.medium', 'dotcity.coins.large'];
    var KEY = 'dotcity.iap.done', done = [];
    try { done = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
    var android = C.getPlatform() === 'android';
    var grant = function (t) {
      if (!t || IDS.indexOf(t.productIdentifier) < 0) return false;
      if (android && t.purchaseState && t.purchaseState !== '1') return false; // pending, not paid yet
      var id = t.transactionId || t.purchaseToken;
      if (!id || done.indexOf(id) >= 0) return false;
      done.push(id); if (done.length > 200) done = done.slice(-200);
      try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {}
      try { window.dotGrantPack(t.productIdentifier); } catch (e) {}
      return true;
    };
    window.DotIAP = {
      products: function () {
        return NP.getProducts({ productIdentifiers: IDS, productType: 'inapp' }).then(function (r) { return r.products || []; });
      },
      buy: function (id) {
        return NP.purchaseProduct({ productIdentifier: id, productType: 'inapp', quantity: 1, isConsumable: true })
          .then(function (t) { grant(t); return t; });
      }
    };
    // Purchases finished outside the buy() call: Ask to Buy approvals, interrupted payments, app killed mid-purchase.
    try { NP.addListener('transactionUpdated', function (t) { grant(t); }); } catch (e) {}
    if (android) {
      NP.getPurchases({ productType: 'inapp' }).then(function (r) {
        (r.purchases || []).forEach(function (t) {
          if (IDS.indexOf(t.productIdentifier) < 0 || t.purchaseState !== '1') return;
          grant(t);
          if (t.purchaseToken) NP.consumePurchase({ purchaseToken: t.purchaseToken }).catch(function () {});
        });
      }).catch(function () {});
    }
  }

  // Rewarded ads (AdMob). These are Google's public TEST unit ids: replace them with your own before release.
  var AM = P.AdMob;
  if (AM) {
    var IOS = C.getPlatform() === 'ios';
    var UNIT = IOS ? 'ca-app-pub-3940256099942544/1712485313' : 'ca-app-pub-3940256099942544/5224354917';
    var adReady = false, adLoading = null;
    var adInit = AM.initialize({})
      .then(function () { // iOS 14.5+: ask once for tracking; ads still work when declined (non-personalised)
        if (!IOS) return;
        return AM.trackingAuthorizationStatus().then(function (r) { if (r.status === 'notDetermined') return AM.requestTrackingAuthorization(); });
      }).catch(function () {})
      .then(function () { // GDPR/US-state consent form when Google says one is required for this user
        return AM.requestConsentInfo().then(function (ci) { if (ci.isConsentFormAvailable && ci.status === 'REQUIRED') return AM.showConsentForm(); });
      }).catch(function () {});
    var loadAd = function () {
      if (adReady) return Promise.resolve(true);
      if (adLoading) return adLoading;
      adLoading = adInit.then(function () { return AM.prepareRewardVideoAd({ adId: UNIT }); })
        .then(function () { adReady = true; adLoading = null; return true; }, function () { adLoading = null; return false; });
      return adLoading;
    };
    window.DotAds = {
      ready: loadAd,
      // resolves true only when the viewer watched long enough to earn the reward
      show: function () {
        return loadAd().then(function (ok) {
          if (!ok) throw new Error('noad');
          adReady = false;
          var earned = false, hs = [];
          var on = function (ev, fn) { return AM.addListener(ev, fn).then(function (h) { hs.push(h); }); };
          var done = function () { hs.forEach(function (h) { try { h.remove(); } catch (e) {} }); loadAd(); };
          return new Promise(function (resolve, reject) {
            Promise.all([
              on('onRewardedVideoAdReward', function () { earned = true; }),
              on('onRewardedVideoAdDismissed', function () { done(); resolve(earned); }),
              on('onRewardedVideoAdFailedToShow', function (e) { done(); reject(e); })
            ]).then(function () {
              AM.showRewardVideoAd().then(function () { earned = true; }, function (e) { done(); reject(e); });
            });
          });
        });
      }
    };
    loadAd();
  }
})();
</script>
`;

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });
await cp(join(root, 'assets', 'fonts'), join(www, 'fonts'), { recursive: true });
await cp(join(root, 'assets', 'fonts', 'fonts.css'), join(www, 'fonts.css'));
await writeFile(join(www, 'index.html'), head + game + native + '</body>\n</html>\n');
console.log('Built www/index.html from dotcity/index.html' + (process.env.DOT_TEST ? ' (test build: era picker kept)' : ''));
