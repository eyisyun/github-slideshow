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
   - 앱 콘텐츠: 개인정보처리방침 URL, 광고 없음, 콘텐츠 등급 설문(폭력·도박 없음 → 전체이용가 예상),
     타깃 연령, **데이터 보안: 수집·공유하는 데이터 없음**
4. **개인 개발자 계정이면** 프로덕션 출시 전에 비공개 테스트(테스터 12명 이상, 14일 이상)를 거쳐야 합니다.
5. 테스트를 마치면 프로덕션 트랙에 `.aab`를 올리고 검토를 요청합니다.

## 5. App Store에 올리기

1. [Apple Developer Program](https://developer.apple.com/programs/)에 가입합니다.
2. [App Store Connect](https://appstoreconnect.apple.com) → **나의 앱 → +** → 번들 ID `com.eyisyun.dotcity`로 새 앱을 만듭니다.
3. Xcode에서 기기를 **Any iOS Device**로 두고 **Product → Archive** → **Distribute App → App Store Connect**.
4. App Store Connect에서 채울 것:
   - 스크린샷: `store/screenshots/ios-*.png` (1290×2796)
   - 설명·키워드(아래 예시), 카테고리 **게임 → 시뮬레이션**, 연령 등급 설문
   - 개인정보처리방침 URL, **앱 개인정보: 데이터를 수집하지 않음**
   - 수출 규정 질문은 `Info.plist`에 `ITSAppUsesNonExemptEncryption = NO`를 넣어 두어 생략됩니다.
5. 빌드를 선택하고 **심사에 제출**.

> 애플 심사 가이드라인 4.2는 "웹사이트를 감싸기만 한 앱"을 거절합니다. 도트시티는 인터넷 없이 완전히 동작하는
> 게임이고 뒤로가기·자동저장 같은 네이티브 처리가 있어 통과 가능성이 높지만, 거절되면 사유에 맞춰 보완하면 됩니다.

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
• 인터넷 없이 플레이, 광고 없음, 개인정보 수집 없음

**키워드 (iOS, 100자 이내)**
도시,시뮬레이션,픽셀,도트,시대,석기시대,한옥,건설,타이쿤,도시건설

## 8. 확인한 것과 못 한 것

- 확인함: `www/` 빌드가 인터넷 없이 오류 없이 실행되고 폰트가 내장 파일로 불러와짐,
  `cap add android`·`cap add ios`·`cap sync` 성공, 아이콘·시작 화면 생성(Android 74개, iOS 7개).
- 못 함: 실제 APK/IPA 빌드와 기기 실행. 이 저장소를 만든 클라우드 환경에서는 Android SDK를 받을 수 없고
  iOS 빌드는 Mac이 필요합니다. 처음 빌드할 때 Android Studio가 Gradle·SDK를 자동으로 받습니다.
