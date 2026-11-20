# SKY WAR — 픽셀 전투기 온라인 대전

위에서 내려다보는(탑다운) 픽셀 아트 전투기 대전 게임입니다.
여러 명이 같은 하늘에서 실시간으로 싸우고, 번 코인으로 부품을 사서 전투기를 조립·강화합니다.

## 실행

```bash
cd skywar
npm install
npm start
```

브라우저에서 `http://localhost:3000` 을 엽니다. 같은 와이파이의 친구는 `http://<내 PC IP>:3000` 으로 접속하면 함께 싸울 수 있습니다.
접속한 사람이 5명보다 적으면 AI 전투기가 자리를 채웁니다.

## 게임 방법

- **격납고**: 부품을 사고(구매하면 바로 장착) 장착을 바꾸고 도색 색상을 고릅니다. 부품 카드에 마우스를 올리면 능력치 변화(초록=상승, 빨강=하락)를 미리 봅니다.
- **조립 슬롯 5개**: 동체(체력·무게) / 날개(선회력) / 엔진(가속·최고속도) / 주무기 / 보조무기(로켓·유도 미사일)
- **코인**: 적에게 준 피해 2당 1코인 + 격추 보너스 80코인. 처음 시작하면 500코인.
- **조작**: `A`/`D` 선회, `W` 가속, `S` 감속, `Space` 주무기, `Shift` 보조무기, `Tab` 순위표, `Esc` 격납고. 휴대폰은 화면 조이스틱과 버튼.
- 빨간 점선 밖(작전 구역 밖)으로 나가면 기체가 계속 손상됩니다.

## PixelLab으로 그림 바꾸기

전투기는 부품 5개(날개 → 엔진 → 동체 → 주무기 → 보조무기 순서)를 겹쳐 그립니다.
`public/sprites/<부품ID>.png` 파일이 있으면 그 그림을, 없으면 코드로 그린 기본 그림을 씁니다. 한 부품씩 바꿔도 됩니다.

**그림 규칙**: 32×32 픽셀 · 투명 배경 · 위에서 내려다본 모습 · 기수(앞)가 위쪽 · `public/sprites/templates/<부품ID>.png` 와 같은 위치

### 방법 1 — 스크립트로 한 번에 (API 크레딧 필요)

```bash
PIXELLAB_API_KEY=내키 node tools/pixellab.js          # 그림이 없는 부품 전부
PIXELLAB_API_KEY=내키 node tools/pixellab.js w2 b3    # 원하는 부품만
node tools/pixellab.js --dry                         # 보낼 프롬프트만 확인
```

각 부품의 템플릿을 초기 이미지(`init_image`)로 보내서, 결과가 제자리에 그려지고 조립했을 때 맞물립니다.
부품 설명·스타일은 `public/sprites/prompts.json` 에서 고칩니다. 이미 있는 그림은 건너뛰고, `--force` 로 다시 만듭니다.

### 방법 2 — PixelLab 웹사이트에서 직접

1. PixelLab에서 크기 32×32, 투명 배경, View: high top-down, Direction: north 로 설정
2. `public/sprites/templates/<부품ID>.png` 를 초기 이미지(Init image)로 올리고 `prompts.json` 의 설명을 참고해 생성
3. 결과를 `public/sprites/<부품ID>.png` 로 저장 → 브라우저 새로고침하면 바로 반영

`templates/example.png` 는 부품을 모두 겹친 전체 모습 참고용입니다.
그림 파일로 바꾼 부품은 도색 색상이 적용되지 않고 그림 색 그대로 나옵니다(전장에서는 이름 색으로 구분).
부품 모양을 코드에서 바꿨다면 `node tools/export-templates.js` 로 템플릿을 다시 만듭니다(Playwright 필요).

## 구조

| 파일 | 역할 |
| --- | --- |
| `server.js` | HTTP + WebSocket 서버. 30Hz로 물리·충돌·AI를 계산하는 권위 서버이고, 코인·부품 구매를 검증합니다. |
| `public/parts.js` | 부품 데이터와 능력치 계산 (서버·클라이언트 공용) — 새 부품은 여기에 추가 |
| `public/game.js` | 클라이언트: 부품 조합으로 픽셀 스프라이트 생성, 지형 생성, 렌더링, 보간, HUD, 격납고 UI |
| `public/sprites/` | 부품 그림(PNG), PixelLab 프롬프트(`prompts.json`), 위치 템플릿(`templates/`) |
| `tools/` | `pixellab.js` 그림 생성, `export-templates.js` 템플릿 내보내기 |
| `data/profiles.json` | 플레이어 코인·보유 부품 저장 (자동 생성, 브라우저에 저장된 토큰으로 식별) |

폰트: [Galmuri](https://github.com/quiple/galmuri) (SIL OFL).
