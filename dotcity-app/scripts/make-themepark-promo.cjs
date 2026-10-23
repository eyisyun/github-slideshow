// Theme-park promo: 9:16 frames rendered from the built app with a manual clock, then encoded with ffmpeg.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const LANG=process.argv[2]||'ko',OUT=require('os').tmpdir()+'/tframes_'+LANG,FPS=24;
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT);
const T={ko:{s:['세계 테마파크 20종 등장!','피라미드부터 시계탑까지','내 도시에 쏙 지어 보세요','풍차가 돌고','열기구가 떠올라요','밤이 되면 더 반짝반짝'],
  t:'도트시티',sub:'나라마다 하나씩\n세계 명소를 모아 보세요',cta:'App Store에서 무료'},
 en:{s:['20 World Theme Parks are here!','From pyramids to clock towers','Build them right in your city','Windmills turn','balloons rise','and it all sparkles at night'],
  t:'Dot City',sub:'Collect a landmark park\nfrom every country',cta:'Free on the App Store'}}[LANG];
// park blocks between the roads: [x, y, park]
const PARKS=[[25,25,5],[29,25,4],[33,25,10],[37,25,8],[25,29,9],[29,29,17],[33,29,7],[37,29,3],[25,33,6],[33,33,0],[37,33,11],[25,37,19],[29,37,2],[33,37,12],[37,37,15]];
const BUILD=[29,33,1];  // built on camera in scene 3
const at=(x,y,dy=0)=>[(x-y)*16,(x+y+3)*8+dy];
// [zoom0, zoom1, [x0,y0], [x1,y1], seconds, night, build]
const SC=[[5.2,4.4,at(33,33,-18),at(33,33,-26),2.6,0,0],
  [3.2,3.2,at(25,27,-40),at(35,25,-46),3.2,0,0],
  [4.6,4.6,at(29,33,-16),at(29,33,-22),3.0,0,1],
  [5.6,5.6,at(37,25,-38),at(37,25,-42),2.4,0,0],
  [4.8,4.6,at(25,37,-40),at(25,37,-48),2.2,0,0],
  [2.8,3.4,at(29,35,-10),at(31,29,-30),3.4,1,0]];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale:LANG==='ko'?'ko-KR':'en-US'});
const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+require('path').join(__dirname,'..','www','index.html')+'');
await p.waitForFunction(()=>{const b=document.getElementById('boot');return b&&b.hidden;},null,{timeout:60000});
await p.evaluate(()=>{window.requestAnimationFrame=()=>0;const st=document.createElement('style');st.textContent=`body>*:not(#view):not(#cap):not(#endc){visibility:hidden!important}
 #cap{position:fixed;left:0;right:0;top:92px;text-align:center;z-index:99;font:30px/1.25 "Do Hyeon",sans-serif;color:#fff;letter-spacing:.01em;
  text-shadow:0 3px 0 #141a30,0 -2px 0 #141a30,3px 0 0 #141a30,-3px 0 0 #141a30,0 6px 16px rgba(0,0,0,.55);padding:0 18px}
 #cap b{display:inline-block;margin-bottom:6px;font:18px "Do Hyeon",sans-serif;color:#1a1404;background:#ffcc4d;padding:4px 12px;border-radius:10px;text-shadow:none;box-shadow:0 3px 0 #a37a1a}
 #endc{position:fixed;inset:0;z-index:100;background:radial-gradient(circle at 50% 38%,#2a3566,#141a30 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#fff;font-family:"Do Hyeon",sans-serif;text-align:center;opacity:0}
 #endc img{width:150px;height:150px;border-radius:34px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
 #endc .t{font-size:54px;color:#ffcc4d;text-shadow:0 4px 0 #6a4a10}#endc .s{font-size:24px;white-space:pre-line;color:#d6dcf5;line-height:1.3}
 #endc .c{margin-top:14px;font-size:22px;background:#ffcc4d;color:#1a1404;padding:12px 26px;border-radius:14px;box-shadow:0 5px 0 #a37a1a}`;document.head.append(st);
 const c=document.createElement('div');c.id='cap';document.body.append(c);});
await p.evaluate(([PARKS,BUILD])=>{closeEra();try{localStorage.clear();}catch(e){}
  W=blankWorld(77);genTerrain(W);W.era=4;for(let i=0;i<N*N;i++)if(Math.hypot(i%N-32,(i/N|0)-32)<16){W.terrain[i]=0;W.trees[i]=0;}derive(W);
  const road=(x,y)=>{if(inb(x,y)&&W.kind[idx(x,y)]!==K.ROAD)placeRaw(K.ROAD,x,y);};
  for(let c=23;c<=41;c++)for(let k=23;k<=41;k++){if((c-32)%4===0)road(c,k);if((k-32)%4===0)road(k,c);}
  for(let y=23;y<=41;y++)for(let x=23;x<=41;x++){const i=idx(x,y);if(W.kind[i])continue;const k=(x*3+y)%13===0?K.PARK:(x+y)%7===0?K.COM:K.RES;placeRaw(k,x,y);if(k!==K.PARK)W.level[i]=1+((x*7+y*3)%2);W.vari[i]=(x*31+y*17)&255;}
  for(const[x,y,n]of PARKS){for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)clearTile(x+dx,y+dy);placeRaw(K.THEME,x,y);W.level[idx(x,y)]=n;}
  {const[x,y]=BUILD;for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)clearTile(x+dx,y+dy);}
  recompute();for(let i=0;i<N*N;i++)W.fire[i]=0;W.powered.fill(1);W.grid.fill(1);W.road.fill(1);W.wx=0;W.wxEnd=Date.now()+1e9;W.month=5;W.snow=0;
  cars=[];for(let k=0;k<160;k++)spawnCar();buildTools();setTool('inspect');setSpeed(1);document.querySelectorAll('.toast').forEach(t=>t.remove());},[PARKS,BUILD]);
const icon='data:image/png;base64,'+fs.readFileSync(require('path').join(__dirname,'..','ios')+'/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png').toString('base64');
let n=0,t=1000;const shot=async()=>{await p.screenshot({path:`${OUT}/${String(n++).padStart(5,'0')}.jpg`,type:'jpeg',quality:92});};
const badge=LANG==='ko'?'NEW 업데이트':'NEW UPDATE';
for(let k=0;k<SC.length;k++){const[z0,z1,[x0,y0],[x1,y1],sec,night,build]=SC[k];
  await p.evaluate(([night,BUILD])=>{if(night){dayMode='night';W.tod=22;}else{dayMode='day';W.tod=11;}
    if(BUILD){const[x,y]=BUILD;for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)clearTile(x+dx,y+dy);recompute();W.powered.fill(1);W.grid.fill(1);W.road.fill(1);}
    W.wx=0;W.snow=0;for(let i=0;i<20;i++)frame(performance.now()+i*50);},[night,build?BUILD:null]);
  const F=Math.round(sec*FPS),bf=Math.round(F*.35);
  for(let f=0;f<F;f++){const u=f/(F-1),e=u*u*(3-2*u);t+=1000/FPS;
    if(build&&f===bf)await p.evaluate(BUILD=>{const[x,y,n]=BUILD;placeRaw(K.THEME,x,y);W.level[idx(x,y)]=n;recompute();W.powered.fill(1);W.grid.fill(1);W.road.fill(1);
      for(let k=0;k<6;k++)dust(x+.5+Math.random()*2,y+.5+Math.random()*2,'#d8cfc0');},BUILD);
    await p.evaluate(([cx,cy,s,t,txt,a])=>{cam.s=s;cam.x=cx;cam.y=cy;W.wx=0;W.snow=0;frame(t);const c=document.getElementById('cap');c.innerHTML=txt;c.style.opacity=a;c.style.transform=`translateY(${(1-a)*10}px)`;},
      [x0+(x1-x0)*e,y0+(y1-y0)*e,z0+(z1-z0)*e,t,(k===0?`<b>${badge}</b><br>`:'')+T.s[k],Math.min(1,f/6,(F-f)/5)]);
    await shot();}}
await p.evaluate(([icon,T])=>{document.getElementById('cap').style.opacity=0;const d=document.createElement('div');d.id='endc';d.innerHTML=`<img src="${icon}"><div class="t">${T.t}</div><div class="s">${T.sub}</div><div class="c">${T.cta}</div>`;document.body.append(d);},[icon,T]);
for(let f=0;f<Math.round(2.8*FPS);f++){await p.evaluate(a=>{const d=document.getElementById('endc');d.style.opacity=a;d.querySelector('img').style.transform=`scale(${.85+.15*a})`;},Math.min(1,f/8));await shot();}
console.log('frames',n);await b.close();})();
