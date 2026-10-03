# 도트시티 앱 (iOS · Android)

웹 게임 `../dotcity/index.html`을 [Capacitor](https://capacitorjs.com) 8로 감싼 네이티브 앱 프로젝트입니다.
게임 코드는 한 곳(`dotcity/index.html`)에만 있고, 앱 빌드는 그 파일을 가져와 앱용으로 포장합니다.

```
dotcity-app/
├─ capacitor.config.json   앱 ID, 이름, 시작 화면·상태 표시줄 설정
├─ package.json            빌드 명령
├─ scripts/
│  ├─ build-web.mjs        dotcity/index.html → www/ (폰트 내장, 뒤로가기·자동저장 연결)
│  ├─ fetch-fonts.mjs      Google 폰트를 assets/fonts 에 내려받기 (이미 받아둠)
│  ├─ make-art.cjs         게임 스프라이트로 앱 아이콘·시작 화면 그리기
│  └─ make-screenshots.cjs 스토어 스크린샷 그리기
├─ assets/                 아이콘·시작 화면 원본, 내장 폰트
├─ store/screenshots/      스토어용 스크린샷 (iPhone 1290×2796, Android 1080×1920)
├─ android/                Android Studio 프로젝트
└─ ios/                    Xcode 프로젝트 (Swift Package Manager, CocoaPods 불필요)
```

앱에서만 동작하는 것:
- 인터넷 없이 실행 (폰트까지 앱에 포함)
- 안드로이드 뒤로가기: 창 닫기 → 살펴보기 도구로 → 앱 내리기
- 앱이 백그라운드로 가면 자동 저장
- 확대·튕김 스크롤 막음, 노치·홈 바 영역 피해서 배치

## 1. 준비물

| | Android | iOS |
|---|---|---|
| 컴퓨터 | Windows · Mac · Linux | **Mac 필수** |
| 도구 | [Android Studio](https://developer.android.com/studio) 최신판 | Xcode 최신판 (App Store) |
| 공통 | [Node.js](https://nodejs.org) 22 이상 | |
| 개발자 계정 | Google Play Console (1회 $25) | Apple Developer Program (연 $99) |

## 2. 빌드해서 내 폰에서 실행

```bash
cd dotcity-app
npm install
npm run sync       # 게임 → www/ → android/·ios/ 로 복사
npm run android    # Android Studio 열기 → ▶ Run
npm run ios        # Xcode 열기 → 내 iPhone 선택 → ▶ Run
```

Xcode에서는 처음 한 번 **App 타깃 → Signing & Capabilities → Team**에 내 Apple 계정을 고르세요.

게임을 고쳤다면 `dotcity/index.html`만 수정하고 `npm run sync`를 다시 실행하면 됩니다.
아이콘을 바꾸려면 `assets/` 의 PNG를 교체한 뒤 `npm run assets`.

## 3. 출시 전에 꼭 정할 것

- **앱 ID** `com.eyisyun.dotcity` — 스토어에 한 번 올리면 바꿀 수 없습니다. 바꾸려면 첫 업로드 전에
  `capacitor.config.json`의 `appId`, `android/app/build.gradle`의 `namespace`·`applicationId`,
  Xcode의 Bundle Identifier를 같은 값으로 맞추세요.
- **버전** — 업로드할 때마다 올려야 합니다.
  Android: `android/app/build.gradle`의 `versionCode`(1, 2, 3…)와 `versionName`("1.0.1").
  iOS: Xcode → App 타깃 → General → Version / Build.

## 4. Google Play에 올리기

1. [Play Console](https://play.google.com/console)에서 개발자 계정을 만듭니다.
2. Android Studio → **Build → Generate Signed App Bundle or APK → Android App Bundle**
   → *Create new…*로 업로드 키(.jks)를 만들고 **release**로 빌드하면 `.aab` 파일이 나옵니다.
   키 파일과 비밀번호는 잃어버리면 안 되고, 이 저장소에 커밋하지 마세요.
3. Play Console → **앱 만들기** → 다음을 채웁니다.
   - 스토어 등록정보: 앱 이름, 짧은 설명, 전체 설명(아래 예시), 아이콘 512×512(`assets/icon-only.png`를 줄여서),
     그래픽 이미지 1024×500, 스크린샷 `store/screenshots/android-*.png`
   - 앱 콘텐츠: 개인정보처리방침 URL, **광고 포함(보상형 광고)**, 콘텐츠 등급 설문(폭력·도박 없음 → 전체이용가 예상),
     타깃 연령, **데이터 보안**: 광고 ID(AdMob) 표시, **광고 포함: 예** — 5-2 참고
4. **개인 개발자 계정이면** 프로덕션 출시 전에 비공개 테스트(테스터 12명 이상, 14일 이상)를 거쳐야 합니다.
5. 테스트를 마치면 프로덕션 트랙에 `.aab`를 올리고 검토를 요청합니다.

## 5. App Store에 올리기

1. [Apple Developer Program](https://developer.apple.com/programs/)에 가입합니다.
2. [App Store Connect](https://appstoreconnect.apple.com) → **나의 앱 → +** → 번들 ID `com.eyisyun.dotcity`로 새 앱을 만듭니다.
3. Xcode에서 기기를 **Any iOS Device**로 두고 **Product → Archive** → **Distribute App → App Store Connect**.
4. App Store Connect에서 채울 것:
   - 스크린샷: `store/screenshots/ios-*.png` (1290×2796)
   - 설명·키워드(아래 예시), 카테고리 **게임 → 시뮬레이션**, 연령 등급 설문
   - 개인정보처리방침 URL, **앱 개인정보**: 광고(AdMob) 때문에 '기기 ID' 등을 표시 — 아래 5-2 참고
   - 수출 규정 질문은 `Info.plist`에 `ITSAppUsesNonExemptEncryption = NO`를 넣어 두어 생략됩니다.
5. 빌드를 선택하고 **심사에 제출**.

> 애플 심사 가이드라인 4.2는 "웹사이트를 감싸기만 한 앱"을 거절합니다. 도트시티는 인터넷 없이 완전히 동작하는
> 게임이고 뒤로가기·자동저장 같은 네이티브 처리가 있어 통과 가능성이 높지만, 거절되면 사유에 맞춰 보완하면 됩니다.

## 5-1. 자금 충전 (인앱 결제) — iOS

자금 칸(＋)을 누르면 충전 상점이 열립니다. 결제는 [`@capgo/native-purchases`](https://github.com/Cap-go/native-purchases)
(StoreKit 2)로 처리하고, 같은 거래가 두 번 지급되지 않도록 거래 번호를 기기에 기록합니다.
웹 버전(브라우저·Claude 링크)에서는 결제가 꺼져 있고 "앱에서만 충전할 수 있어요"가 보입니다.

| 상품 ID | 스토어 표시 이름 | 받는 게임머니 (석기 → 미래) | 권장 가격 |
|---|---|---|---|
| `dotcity.coins.small` | 게임머니 충전 1 | 100 조개 → ₩20,000 | ₩2,200 |
| `dotcity.coins.medium` | 게임머니 충전 3배 | 300 조개 → ₩60,000 | ₩5,500 |
| `dotcity.coins.large` | 게임머니 충전 8배 | 800 조개 → ₩160,000 | ₩13,000 |

게임 안에서는 "게임머니 +100 조개"처럼 지금 시대에 받는 금액이 그대로 보입니다. 받는 양이 시대마다 달라서
스토어 이름에는 금액 대신 배수를 적었습니다. 큰 상품의 '+○% 더'는 스토어에서 받은 실제 가격으로 계산하므로
App Store Connect에서 가격을 바꿔도 자동으로 맞춰집니다.
받는 양은 `dotcity/index.html`의 `PACKS`(배수)와 `PACK_BASE`(시대별 기준)에서 바꿉니다.

**1) Mac에서 바로 시험 (App Store Connect 등록 전)**
`ios/App/App/Products.storekit`에 세 상품이 들어 있고, 공유 스킴 `App`이 실행할 때 이 파일을 씁니다.
Xcode에서 시뮬레이터로 ▶ Run → 자금 칸 → 상품을 누르면 가짜 결제 창이 뜹니다(실제 돈 안 나감).
가격이 '—'로만 나오면 **Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration**에서
`Products.storekit`을 고르세요. 결제 기록은 **Debug → StoreKit → Manage Transactions**에서 지울 수 있습니다.

**2) App Store Connect 설정 (실제 판매)**
1. **비즈니스(계약, 세금 및 금융 정보)**에서 **유료 앱 계약**에 동의하고 은행 계좌·세금 정보를 입력합니다. 이게 끝나야 결제가 동작합니다.
2. 앱 → **수익화 → 앱 내 구입** → ＋ → 유형 **소모품(Consumable)** 으로 위 표의 상품 ID 세 개를 그대로 만듭니다.
   각각 가격, 한국어 표시 이름·설명, 심사용 스크린샷(충전 상점 화면)을 넣습니다.
3. 상품 상태가 **제출 준비 완료**가 되면, 앱 버전을 심사에 제출할 때 **앱 내 구입** 항목에서 세 상품을 함께 선택합니다.
   처음 출시하는 상품은 앱과 같이 심사받아야 합니다.
4. 실제 기기 시험: **사용자 및 액세스 → Sandbox 테스터**를 만들고, iPhone **설정 → App Store → 샌드박스 계정**으로 로그인한 뒤
   Xcode로 기기에 설치해서 결제해 봅니다. TestFlight 빌드에서도 샌드박스 결제가 됩니다.
5. 앱 정보 → 연령 등급 설문에서 앱 내 구입이 있다고 표시됩니다. 결제 정보는 Apple이 처리하고 앱은 받지 않지만,
   광고(AdMob) 때문에 앱 개인정보 항목은 바꿔야 합니다(5-2 참고). [`PRIVACY.md`](PRIVACY.md)에 앱 내 구매 항목을 추가해 두었습니다.

Xcode에서 따로 켤 기능(Capability)은 없습니다. iOS 15 이상에서 동작합니다(프로젝트 최소 버전 15).

## 5-2. 광고 보고 충전 (AdMob 보상형 광고)

충전 화면 맨 위 "광고 보고 받기"를 누르면 보상형 광고가 나오고, 끝까지 보면 게임머니(작은 충전의 절반,
석기 50 조개 → 미래 ₩10,000)를 받습니다. 하루 3번까지이며(기기 기준, 자정에 초기화), `dotcity/index.html`의
`AD_DAILY`, `adAmount`에서 바꿉니다. 플러그인은 [`@capacitor-community/admob`](https://github.com/capacitor-community/admob)입니다.

**지금은 Google 공식 테스트 광고 ID가 들어 있습니다.** 테스트 ID로는 "Test Ad" 광고만 나오고 수익이 생기지 않습니다.
출시 전에 아래 세 곳을 내 ID로 바꾸세요. 테스트 ID 그대로 출시하거나, 개발 중에 내 진짜 광고를 직접 누르면 계정이 정지될 수 있습니다.

| 어디 | 무엇 | 지금 값 (테스트) |
|---|---|---|
| `ios/App/App/Info.plist` → `GADApplicationIdentifier` | AdMob **iOS 앱 ID** (`~` 포함) | `ca-app-pub-3940256099942544~1458002511` |
| `android/app/src/main/AndroidManifest.xml` → `APPLICATION_ID` | AdMob **Android 앱 ID** | `ca-app-pub-3940256099942544~3347511713` |
| `scripts/build-web.mjs` → `UNIT` | **보상형 광고 단위 ID** (`/` 포함, iOS·Android 각각) | `.../1712485313`, `.../5224354917` |

**AdMob 설정 순서 (iOS)**
1. [AdMob](https://admob.google.com)에 가입하고 결제(지급) 정보를 입력합니다.
2. **앱 → 앱 추가 → iOS** → App Store에 올린 앱을 연결합니다(출시 전이면 나중에 연결). **앱 ID**를 `Info.plist`에 넣습니다.
3. 그 앱에서 **광고 단위 → 보상형**을 만들고 **광고 단위 ID**를 `build-web.mjs`의 `UNIT`(iOS 쪽)에 넣은 뒤 `npm run sync`.
4. **개인정보 보호 및 메시지**에서 GDPR 동의 메시지와 iOS 추적(ATT) 안내 메시지를 만들면, 앱이 필요한 지역에서 자동으로 띄웁니다.
5. 웹사이트가 있다면 `app-ads.txt`를 등록합니다(권장).

**App Store Connect에서 바꿔야 할 것**
- **앱 개인정보**: '데이터를 수집하지 않음'에서 바꿔야 합니다. 최소한 **식별자 → 기기 ID**(제3자 광고, 사용자 추적에 사용),
  **사용 데이터 → 광고 데이터**, **진단**(Google SDK)을 '추적에 사용됨/제3자 광고'로 표시하세요. Google의 안내:
  https://developers.google.com/admob/ios/privacy/data-disclosure
- 스토어 설명의 "광고 없음"을 빼고 "선택형 보상 광고"로 바꿉니다(아래 문구 예시 수정해 둠).
- 개인정보처리방침 URL에 새 [`PRIVACY.md`](PRIVACY.md) 내용을 올립니다(광고 항목 추가됨).
- `Info.plist`에 추적 허용 문구(`NSUserTrackingUsageDescription`)와 Google 광고 네트워크 목록(`SKAdNetworkItems`)을 넣어 두었습니다.

Android에서 출시할 때는 Play Console **데이터 보안**에 "기기 또는 기타 ID — 광고"를 표시하고, **광고 포함**을 '예'로 바꿉니다.

## 6. 개인정보처리방침

[`PRIVACY.md`](PRIVACY.md)를 GitHub Pages, 노션 등 공개 주소에 올리고 그 URL을 두 스토어에 입력하세요.

## 7. 스토어 문구 예시

**짧은 설명 (80자 이내)**
움집 한 채에서 미래 도시까지. 시대를 건너며 키우는 픽셀 도시.

**전체 설명**
모닥불 곁에 모인 석기시대 부족에서 시작하세요.
길을 내고 마을을 칠하면 사람들이 모여들어 움집을 짓습니다.
인구를 모으고 고인돌을 세우면 청동기시대, 고분을 쌓으면 기와지붕 한옥의 왕조시대,
궁궐 정문을 세우면 벽돌과 증기기관의 근대, 기차역을 세우면 고층 빌딩이 솟는 현대,
우주 엘리베이터를 세우면 하늘을 나는 차와 아콜로지가 솟는 미래가 열립니다.

• 석기 · 청동기 · 왕조 · 근대 · 현대 · 미래, 시대마다 바뀌는 집과 길과 탈것
• 옛 마을이 한 채씩 새 시대 양식으로 다시 지어지는 모습
• 모닥불·우물·발전소, 교통 체증, 화재, 학교, 땅값까지 살아 있는 도시 시뮬레이션
• 밤이 되면 창문마다 불이 켜지는 픽셀 야경
• 인터넷 없이 플레이 (광고 보고 충전·자금 충전은 원할 때만, 강제 광고 없음)

**키워드 (iOS, 100자 이내)**
도시,시뮬레이션,픽셀,도트,시대,석기시대,한옥,건설,타이쿤,도시건설

## 8. 확인한 것과 못 한 것

- 확인함: `www/` 빌드가 인터넷 없이 오류 없이 실행되고 폰트가 내장 파일로 불러와짐,
  `cap add android`·`cap add ios`·`cap sync` 성공, 아이콘·시작 화면 생성(Android 74개, iOS 7개).
- 결제·광고는 가짜 StoreKit/AdMob으로 앱 빌드 코드의 흐름(가격 표시, 지급, 중복 방지, 하루 3번 제한)만 확인함. 실제 결제·광고는 기기에서 시험해야 함.
- 못 함: 실제 APK/IPA 빌드와 기기 실행. 이 저장소를 만든 클라우드 환경에서는 Android SDK를 받을 수 없고
  iOS 빌드는 Mac이 필요합니다. 처음 빌드할 때 Android Studio가 Gradle·SDK를 자동으로 받습니다.
