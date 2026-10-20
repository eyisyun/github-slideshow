# 도트시티 iOS 출시 순서표

iOS를 먼저 출시하고 안드로이드는 나중에 합니다. 안드로이드 프로젝트(`android/`)는 그대로 두었습니다.
위에서부터 순서대로 하면 됩니다. ☐ 칸은 직접 체크하세요.

---

## 0. 준비물

- ☐ Mac + Xcode 최신판 (App Store에서 설치)
- ☐ Node.js 22 이상
- ✅ [Apple Developer Program](https://developer.apple.com/programs/) 가입
- ✅ App Store Connect 유료 앱 계약
- ✅ [AdMob](https://admob.google.com) 가입, iOS 앱 "도트시티"와 보상형 광고 단위 "게임머니 충전" 만들기 (앱 출시 뒤 AdMob에서 App Store 앱 연결)
- ☐ 공개 웹 주소 (GitHub Pages, 저장소에 준비됨 — 아래 0-1)

### 0-1. 공개 웹페이지 켜기 (GitHub Pages)

저장소의 `site/` 폴더와 `.github/workflows/dotcity-pages.yml`이 아래 세 페이지를 만듭니다.

| 페이지 | 주소 | App Store Connect 칸 |
|---|---|---|
| 지원 페이지 (소개·도움말·문의) | `https://eyisyun.github.io/github-slideshow/` | 지원 URL, 마케팅 URL |
| 개인정보처리방침 | `https://eyisyun.github.io/github-slideshow/privacy/` | 개인정보처리방침 URL |
| 웹에서 바로 하기 | `https://eyisyun.github.io/github-slideshow/play/` | (선택) |

1. ☐ GitHub 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿉니다.
2. ☐ 이 작업이 담긴 **PR(claude/sharp-bell-3d1c38 → master)을 머지**합니다. 배포는 `master`에 올라간 내용으로만 됩니다.
3. ☐ **Actions** 탭에서 "dotcity pages"가 초록색으로 끝나면 위 주소가 열립니다(1~2분). 안 돌았으면 그 워크플로에서 **Run workflow**.

- 문의 연락처는 지금 GitHub 이슈 링크입니다. 이메일을 공개하고 싶으면 `site/index.html`의 "문의" 칸 주석대로 바꾸세요.
- 개인정보처리방침을 고치면 `dotcity-app/PRIVACY.md`를 수정하고 저장소 루트에서
  `python3 dotcity-app/scripts/make-privacy-page.py`를 실행한 뒤 커밋하세요(페이지가 같이 갱신됩니다).
- `master`의 `dotcity/index.html`이 바뀌면 `/play/` 웹 게임도 자동으로 새 버전이 됩니다.

## 1. 코드에서 바꿀 것

- ✅ **AdMob 광고 ID 교체** (README "5-2").
  - `ios/App/App/Info.plist` → `GADApplicationIdentifier` = `ca-app-pub-2841633824543051~3550947287`
  - `scripts/build-web.mjs` → `AD_IOS` = `ca-app-pub-2841633824543051/3219774790` (`DOT_TEST=1` 빌드는 테스트 광고)
- ☐ 버전 확인: Xcode → App 타깃 → General → **Version 1.0**, **Build 1** (다시 올릴 때마다 Build를 1씩 올림)
- ☐ 출시용으로 빌드:
  ```bash
  cd dotcity-app
  npm install
  npm run sync      # 출시용: '시대 골라 시작'(확인용 메뉴)이 빠짐
  npm run ios       # Xcode 열기
  ```
  기기에서 시대별로 확인할 때만 `DOT_TEST=1 npm run sync`를 씁니다. **이걸로 만든 빌드를 올리지 마세요.**
- ☐ Xcode → App 타깃 → **Signing & Capabilities → Team**에서 내 개발자 계정 선택

이미 해 둔 것: 앱 ID `com.eyisyun.dotcity`, 이름 `도트시티`, iPhone 전용, 아이콘·시작 화면, 수출 규정
(`ITSAppUsesNonExemptEncryption = NO`), 추적 허용 문구, 광고 네트워크 목록(SKAdNetwork), 결제·광고 플러그인,
사진 모드용 공유 플러그인(`@capacitor/share`, `@capacitor/filesystem`)과 "사진 앱에 저장" 권한 문구(`NSPhotoLibraryAddUsageDescription`).
테스트용 버튼('시대 골라 시작', '✈ 공항 테스트', '🔥 화재 출동 테스트' 등)은 `npm run sync` 출시용 빌드에서 자동으로 빠집니다.

## 2. 내 Mac·iPhone에서 시험

- ☐ **시뮬레이터:** ▶ Run → 자금 칸 ＋ → 상품을 누르면 Xcode 시험용 결제 창이 뜹니다(`Products.storekit`, 돈 안 나감).
  기기·시뮬레이터 시험은 `DOT_TEST=1 npm run sync`로 빌드해서 "광고 보고 받기"가 **테스트 광고**로 뜨게 하세요.
  출시 빌드(`npm run sync`)에서 내 진짜 광고를 직접 누르면 AdMob 계정이 정지될 수 있습니다.
- ☐ **실제 iPhone:** USB로 연결 → 기기 선택 → ▶ Run. 처음 실행하면 "추적 허용" 창이 한 번 뜨는지 확인하세요.
- ☐ 시험할 것: 석기시대 시작 → 모닥불·움집 터·길 → 집이 생김 → 저장 후 앱을 껐다 켜도 이어짐 → 충전 → 광고 3번 → "내일 다시"
- ☐ 새 기능 확인: 배경 음악·효과음(메뉴 → 소리), 사진 모드(카메라 버튼 → 사진 저장 → 공유 창에서 "이미지 저장" → 사진 앱 권한 창),
  꾸미기와 방향 돌리기(확인 창 ↻), 다리·배·기차·공항 비행기, 날씨, 소방차·경찰차·구급차 출동, 무음 모드 스위치에서 소리 상태

## 3. App Store Connect 기본 설정

- ☐ **비즈니스 → 유료 앱 계약**에 동의하고 은행 계좌·세금 정보를 입력합니다. 이게 끝나야 앱 내 구입이 동작합니다.
- ☐ **나의 앱 → ＋ → 새로운 앱**
  - 플랫폼 iOS · 이름 `도트시티` · 기본 언어 한국어 · 번들 ID `com.eyisyun.dotcity` · SKU `dotcity` · 사용자 액세스 전체

## 4. 앱 내 구입 상품 3개

**수익화 → 앱 내 구입 → ＋ → 소모품(Consumable)**으로 아래 3개를 만듭니다. 상품 ID는 글자 하나까지 똑같아야 합니다.

| 참조 이름 | 상품 ID | 가격 | 표시 이름 (한국어) | 설명 |
|---|---|---|---|---|
| 게임머니 충전 1 | `dotcity.coins.small` | ₩2,200 | 게임머니 충전 | 지금 시대 게임머니를 충전해요. |
| 게임머니 충전 3배 | `dotcity.coins.medium` | ₩5,500 | 게임머니 충전 3배 | 지금 시대 게임머니를 3배 충전해요. |
| 게임머니 충전 8배 | `dotcity.coins.large` | ₩13,000 | 게임머니 충전 8배 | 지금 시대 게임머니를 8배 충전해요. |

- ☐ 각 상품의 **심사 정보 → 스크린샷**에 `store/screenshots/ios-5-shop.png`를 올립니다.
- ☐ 상품 상태가 "제출 준비 완료"가 되었는지 확인합니다. 처음 출시하는 상품은 앱과 함께 심사받습니다(6단계).

## 5. 스토어 정보 (그대로 붙여 넣기)

**앱 정보**
- 부제 (30자): `석기시대부터 미래까지, 픽셀 도시`
- 카테고리: 기본 **게임 → 시뮬레이션**, 보조 **게임 → 전략**
- 콘텐츠 권한: 제3자 콘텐츠 없음

**1.0 버전 정보**
- 스크린샷 (Dynamic Island 지원 iPhone, 1206×2622) — `store/screenshots/`의 iOS 6장. 첫 두 장이 가장 많이 보이니 이 순서를 추천합니다:
  `ios-3-modern-night.png`(현대 야경), `ios-6-airport.png`(공항·기차·배), `ios-4-future.png`(미래), `ios-2-dynasty.png`(왕조), `ios-1-stone.png`(석기), `ios-5-shop.png`(충전)
- 프로모션 텍스트 (170자):
  ```
  모닥불 곁의 움집 몇 채에서 시작해 한옥 마을, 벽돌 도시, 고층 빌딩, 하늘을 나는 차의 미래 도시까지. 시대를 건너며 나만의 픽셀 도시를 키워 보세요.
  ```
- 설명:
  ```
  모닥불 곁에 모인 석기시대 부족에서 시작하세요.
  길을 내고 집 터를 정하면 사람들이 모여들어 움집을 짓습니다.

  시대마다 목표를 채우고 그 시대의 기념물을 세우면 다음 시대가 열립니다.
  고인돌을 세우면 청동기시대, 고분을 쌓으면 기와지붕 한옥의 왕조시대,
  궁궐 정문을 세우면 벽돌과 증기기관의 근대, 기차역을 세우면 고층 빌딩이 솟는 현대,
  우주 엘리베이터를 세우면 하늘을 나는 차와 아콜로지가 솟는 미래가 열립니다.

  • 석기 · 청동기 · 왕조 · 근대 · 현대 · 미래, 시대마다 바뀌는 집과 길과 탈것
  • 옛 마을이 한 채씩 새 시대 양식으로 다시 지어지는 모습
  • 통나무 다리부터 스카이 브리지까지 시대별 다리, 나루터의 배, 철길 위의 기차, 공항에 내려앉는 비행기
  • 불이 나면 소방차가, 도둑이 들면 경찰차가, 환자가 생기면 구급차가 길을 따라 출동
  • 꽃밭·정자·놀이터·벚꽃나무·분수로 꾸미고, 물을 파 연못을 만들고, 건물에 이름을 붙이는 나만의 도시
  • 비·눈·꽃잎이 날리는 날씨와 낮과 밤, 창문마다 불이 켜지는 픽셀 야경
  • 사진 모드로 내 도시를 찍어 저장하고 자랑하기
  • 시대마다 다른 배경 음악
  • 기념물 공사는 현실 시간으로 진행되고, 자리를 비운 동안에도 도시가 자랍니다
  • 인터넷 없이 플레이, 강제 광고 없음 (원할 때만 광고 보고 게임머니 받기)
  ```
- 키워드 (100자, 쉼표로 구분, 띄어쓰기 없이):
  ```
  도시,시뮬레이션,픽셀,도트,시대,석기시대,한옥,건설,타이쿤,도시건설,문명,미래도시,경영,힐링,기차,공항,꾸미기
  ```
- 지원 URL · 마케팅 URL(선택): `https://eyisyun.github.io/github-slideshow/`
- 저작권: `2026 eyisyun`
- **앱 내 구입:** 4단계 상품 3개를 체크합니다.

**앱 심사 정보**
- 로그인 필요: **아니요**
- 연락처: 이름, 전화, 이메일
- 메모 (그대로):
  ```
  로그인이 없는 1인용 도시 건설 게임입니다.
  화면 위 '자금' 옆 ＋ 버튼을 누르면 충전 화면이 열립니다.
  - 광고 보고 받기: 사용자가 누를 때만 표시되는 Google AdMob 보상형 광고이며, 하루 3번까지입니다.
  - 게임머니 충전 3종: 소모성 앱 내 구입입니다. 받는 게임머니는 현재 시대에 따라 달라집니다.
  처음 광고를 준비할 때 App Tracking Transparency 권한을 요청합니다. 거부해도 모든 기능을 쓸 수 있습니다.
  사진 모드(화면 위 카메라 버튼 → 사진 저장)는 iOS 공유 시트를 엽니다. 사진 앱에 저장할 때만 사진 추가 권한을 요청합니다.
  ```

## 5-1. 영어 현지화 (해외용)

게임은 폰 언어가 한국어면 한국어, 그 밖의 언어면 영어로 나옵니다(메뉴 → 언어에서 바꿀 수도 있어요).
App Store Connect → 1.x 버전 페이지 오른쪽 위 언어 메뉴 → **영어(미국)** 추가 → 아래를 넣습니다.
스크린샷은 `store/screenshots/ios-en-*.png` (같은 순서: 3, 6, 4, 2, 1, 5).

- 이름: `Dot City: Pixel City Builder` (30자 이내)
- 부제: `From the Stone Age to the future`
- 프로모션 텍스트:
  ```
  Start with a few huts around a campfire and grow a hanok village, a brick town, a skyline of towers and a future city of flying cars. Build your own pixel city through the ages.
  ```
- 설명:
  ```
  Start with a Stone Age tribe gathered around a campfire.
  Lay paths and mark plots, and people move in and build their huts.

  Meet each era's goals and raise its monument to open the next era.
  Raise a dolmen for the Bronze Age, build a royal tomb for a dynasty of tiled-roof hanok houses,
  raise the palace gate for the brick and steam of the Modern Age, build a railway station for the skyscrapers of the Present,
  and raise a space elevator for a Future of flying cars and arcologies.

  • Stone, Bronze, Dynasty, Modern, Present, Future: homes, roads and vehicles change with every era
  • Old neighbourhoods are rebuilt one house at a time in the new era's style
  • Bridges from log bridges to sky bridges, boats at the harbor, trains on the rails, planes landing at the airport
  • Fire engines, police cars and ambulances drive out along the roads when they are needed
  • Decorate with flower beds, pavilions, playgrounds, cherry trees and fountains, dig ponds and name your buildings
  • Rain that leaves puddles and snow that settles on roofs, day and night, and a pixel skyline with every window lit
  • Photo mode to capture and share your city
  • Different music for every era
  • Monuments are built in real time, and your city keeps growing while you are away
  • Plays offline, no forced ads (watch an ad only when you want extra game money)
  ```
- 키워드 (100자, 쉼표로 구분):
  ```
  city builder,pixel,simulation,tycoon,civilization,history,ages,town,sandbox,offline,isometric,retro
  ```
- 지원 URL: `https://eyisyun.github.io/github-slideshow/`

## 6. 개인정보 · 연령 등급

**앱 개인정보** (광고 SDK 때문에 '수집하지 않음'이 아닙니다)
- 개인정보처리방침 URL: `https://eyisyun.github.io/github-slideshow/privacy/`
- "데이터를 수집합니까?" → **예**. 아래는 Google AdMob SDK 기준이며, 최신 내용은
  [Google 안내](https://developers.google.com/admob/ios/privacy/data-disclosure)에서 꼭 한 번 맞춰 보세요.

| 데이터 유형 | 용도 | 사용자와 연결 | 추적에 사용 |
|---|---|---|---|
| 식별자 → 기기 ID | 제3자 광고, 분석 | 아니요 | **예** |
| 위치 → 대략적인 위치 (IP 기반) | 제3자 광고, 분석 | 아니요 | **예** |
| 사용 데이터 → 제품 상호 작용 | 제3자 광고, 분석 | 아니요 | **예** |
| 사용 데이터 → 광고 데이터 | 제3자 광고, 분석 | 아니요 | **예** |
| 진단 → 충돌 데이터, 성능 데이터, 기타 진단 데이터 | 분석 | 아니요 | 아니요 |

**연령 등급 설문**
- 폭력·선정성·도박 등 모든 항목 **없음** (화재·도난 사건은 사이렌 아이콘과 출동 차량으로만 표현되고 폭력 묘사는 없습니다)
- 앱 내 구입 **있음** (자동 표시), 광고 **있음**
- 예상 등급: **4+**

## 7. 업로드와 심사 제출

- ☐ Xcode에서 기기를 **Any iOS Device (arm64)**로 두고 **Product → Archive**
- ☐ Organizer → **Distribute App → App Store Connect → Upload**
- ☐ 10~30분 뒤 App Store Connect → **TestFlight**에 빌드가 나타나면, 내부 테스트로 내 iPhone에서 한 번 더 확인합니다.
  TestFlight에서는 결제가 샌드박스로 되어 실제 돈이 나가지 않습니다.
- ☐ 1.0 버전 페이지 → **빌드** 선택 → **앱 내 구입** 3개 선택 → **심사에 추가 → 제출**
- ☐ 심사는 보통 1~3일 걸립니다. 거절되면 사유를 알려 주세요. 맞춰서 고치겠습니다.

## 자주 거절되는 이유와 대비

| 사유 | 이 앱의 상태 |
|---|---|
| 4.2 웹사이트를 감싼 앱 | 인터넷 없이 동작하는 게임, 네이티브 결제·광고·뒤로가기·자동 저장 처리 |
| 3.1.1 결제 수단 | 게임머니는 Apple 앱 내 구입으로만 판매 |
| 5.1.2 추적 | 추적 허용 창을 띄우고, 거부해도 모든 기능 사용 가능 |
| 2.1 앱 완성도 | 심사 메모에 충전 화면 여는 방법을 적어 둠 |
| 앱 내 구입 상품 누락 | 상품을 버전에 함께 선택해서 제출 (7단계) |

## 출시 뒤 할 일 (안드로이드)

iOS 출시가 끝나면 안드로이드를 진행합니다. README의 Google Play 항목,
AdMob **Android 앱 ID**(`AndroidManifest.xml`)와 광고 단위(`build-web.mjs`의 Android 쪽) 교체,
Play Console 인앱 상품 등록, Android 스크린샷 다시 만들기가 남아 있습니다.


## 업데이트 기록

### 1.0.1
Xcode → App 타깃 → General에서 **Version `1.0.1`, Build `3`**으로 바꾼 뒤 `npm run ios` → Archive → 업로드.
App Store Connect → 앱 → **＋ (iOS 버전 추가) → 1.0.1** → 빌드 3 선택 → "이번 버전의 새로운 기능"에 아래를 넣고 제출.
영어(미국) 현지화는 위 "5-1. 영어 현지화"를 그대로 넣습니다.

- 이번 버전의 새로운 기능 (한국어):
  ```
  • 영어 지원: 폰 언어에 맞춰 바뀌고, 메뉴에서 직접 고를 수도 있어요
  • 청동기 손수레, 왕조시대 소달구지와 가마가 길을 다녀요
  • 눈이 와도 철길이 보여요
  • 울타리도 놓기 전에 방향을 돌릴 수 있어요
  • 건물 이름 붙이기 창이 새로워졌어요
  • 건물을 철거할 때 한 번 더 확인해요
  ```
- What's New (English):
  ```
  • English support: follows your phone's language, or pick it in the menu
  • Handcarts in the Bronze Age, ox carts and palanquins in the Dynasty
  • Railway tracks stay visible under snow
  • Fences can be rotated before you place them
  • A new box for naming your buildings
  • Bulldozing a building now asks first
  ```
