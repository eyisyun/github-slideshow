# 도트시티 Android(Google Play) 출시 순서표

위에서부터 순서대로 하면 됩니다. ☐ 칸은 직접 체크하세요. 첫 안드로이드 버전은 iOS와 같은 **1.0.8**입니다.

---

## 0. 준비물

- ☐ [Android Studio](https://developer.android.com/studio) 최신판 (Mac에 같이 설치하면 됩니다)
- ☐ Node.js 22 이상 (iOS 때 설치한 것 그대로)
- ☐ [Google Play Console](https://play.google.com/console) 개발자 계정 (1회 $25, 신분 확인에 며칠 걸릴 수 있음)
- ☐ 안드로이드 폰 1대 (USB 디버깅 켜기: 설정 → 휴대전화 정보 → 빌드번호 7번 탭 → 개발자 옵션 → USB 디버깅)

> **중요: 개인 개발자 계정이면** (2023년 11월 이후 만든 계정) 프로덕션에 바로 못 올립니다.
> **비공개 테스트에 테스터 12명 이상이 14일 연속 참여**한 뒤에야 프로덕션 출시 신청 버튼이 열립니다.
> 그래서 테스트용 빌드를 최대한 빨리 올려 14일을 먼저 시작하는 것이 핵심입니다(6단계).
> 조직(사업자) 계정이면 이 조건이 없습니다.

## 1. AdMob에 Android 앱 만들기

1. ☐ [AdMob](https://admob.google.com) → **앱 → 앱 추가 → Android** → "앱이 지원되는 스토어에 등록되어 있나요?" **아니요** → 이름 `도트시티`
2. ☐ 만든 앱 → **광고 단위 → 보상형** → 이름 `게임머니 충전` (보상 설정은 기본값 그대로, 게임이 직접 계산함)
3. ☐ 두 ID를 코드에 넣습니다 (Claude에게 ID 두 개를 알려주면 넣어 드립니다).
   - **앱 ID** `ca-app-pub-...~...` → `android/app/build.gradle`의 `def admobAppId = '...'`
   - **광고 단위 ID** `ca-app-pub-.../...` → `scripts/build-web.mjs`의 `const AD_AND_REAL = '...'`
   - 비어 있으면 빌드할 때 `!! Android: AD_AND_REAL is empty` 경고가 나오고 테스트 광고가 뜹니다. **그 빌드는 올리면 안 됩니다.**
4. ☐ 출시 후 AdMob → 앱 설정 → **스토어 연결**로 Google Play 앱을 연결합니다.

## 2. 업로드 키 만들기 (처음 한 번)

Google Play는 앱에 **업로드 키**로 서명된 파일만 받습니다. 실제 배포 서명은 Google이 해 줍니다(Play 앱 서명).

1. ☐ 터미널에서 (비밀번호는 직접 정해서 두 번 입력):
   ```bash
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"   # Mac: Android Studio에 들어 있는 Java 사용
   export PATH="$JAVA_HOME/bin:$PATH"
   cd dotcity-app/android/app
   keytool -genkeypair -v -keystore dotcity-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   이름·조직 질문은 아무거나 적어도 됩니다(`eyisyun` 등). 마지막에 `y`.
2. ☐ 같은 폴더(`dotcity-app/android/app/`)에 `keystore.properties` 파일을 만들고:
   ```
   storeFile=dotcity-upload.jks
   storePassword=정한비밀번호
   keyAlias=upload
   keyPassword=정한비밀번호
   ```
3. ☐ **`dotcity-upload.jks`와 비밀번호를 다른 곳(클라우드·USB)에 꼭 백업하세요.** 잃어버리면 Play Console에서 키 재설정을 요청해야 합니다.
   두 파일은 `.gitignore`에 들어 있어서 저장소에 올라가지 않습니다.

## 3. 출시용 빌드 (매번 이 순서)

```bash
cd dotcity-app
git pull
npm install
npm run sync                 # 게임 → www → android/ios 로 복사 (cap sync 만 따로 하지 마세요)
```

☐ **올리기 전 확인** — 세 줄 모두 결과가 맞아야 합니다:
```bash
grep -c "function scoutSprite" android/app/src/main/assets/public/index.html     # 1 이상 = 최신 게임
grep -c "Google Play'" android/app/src/main/assets/public/index.html             # 1 = 최신 게임
grep -c "3940256099942544" android/app/src/main/assets/public/index.html          # 0 = 진짜 광고 (1 이상이면 테스트 광고, 올리지 말 것)
```

☐ 앱 번들(.aab) 만들기:
```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"   # 새 터미널 창이면 다시
cd android
./gradlew bundleRelease
```
결과 파일: `android/app/build/outputs/bundle/release/app-release.aab`
(Android Studio에서 하려면 `npm run android` → **Build → Generate Signed App Bundle or APK → Android App Bundle → release**)

☐ 버전: `android/app/build.gradle`의 `versionCode`(매 업로드마다 +1)와 `versionName`. 지금 `versionCode 10`, `versionName "1.0.8"`.

## 4. 내 폰에서 먼저 실행

- ☐ 폰을 USB로 연결 → `npm run android` → Android Studio 위쪽에서 내 폰 선택 → ▶ Run
- ☐ 확인할 것: 시작 화면, 저장 후 다시 켜기, **뒤로가기 버튼**(창 닫기 → 앱 내리기), 화면 위·아래가 상태 표시줄·내비게이션 바에 가리지 않는지,
  사진 모드 공유, "광고 보고 받기"(이 단계는 `DOT_TEST=1 npm run sync`로 빌드해 테스트 광고로 확인)
- 결제는 Play에 올린 빌드에서만 됩니다(6단계 내부 테스트에서 확인).

## 5. Play Console에 앱 만들기

☐ **앱 만들기**
- 앱 이름 `도트시티` · 기본 언어 **한국어 – ko-KR** · 앱 또는 게임 **게임** · 무료 또는 유료 **무료**
- 정책 동의 체크 두 개

☐ **대시보드 → 앱 설정** 항목들 (왼쪽 메뉴 **정책 → 앱 콘텐츠**)

| 항목 | 답 |
|---|---|
| 개인정보처리방침 | `https://eyisyun.github.io/github-slideshow/privacy/` |
| 앱 액세스 권한 | 모든 기능을 제한 없이 이용 가능 (로그인 없음) |
| 광고 | **예, 광고가 포함되어 있습니다** |
| 콘텐츠 등급 | 설문: 카테고리 **게임**. 폭력·성·언어·약물·도박 모두 **아니요**, 사용자 상호작용·위치 공유 **아니요**, 디지털 구매 **예** → 전체이용가 예상 |
| 타겟층 | **13세 이상**만 체크 (13세 미만을 고르면 가족 정책 심사가 붙고 AdMob 설정을 따로 해야 함) |
| 뉴스 앱 / 정부 앱 / 금융 기능 / 건강 | 모두 **아니요** |
| 광고 ID | **예** → 용도 **광고 또는 마케팅** (AdMob) |
| 데이터 보안 | 아래 표 |

**데이터 보안** (Google AdMob SDK 기준, [Google 안내](https://developers.google.com/admob/android/privacy/play-data-disclosure)와 한 번 맞춰 보세요)
- 데이터 수집·공유 **예** · 전송 중 암호화 **예** · 삭제 요청 방법 제공 **아니요**(계정 없음, 기기에만 저장)

| 데이터 유형 | 수집 | 공유 | 용도 |
|---|---|---|---|
| 위치 → 대략적인 위치 (IP) | 예 | 예 | 광고 또는 마케팅, 분석, 사기 방지·보안 |
| 앱 활동 → 앱 상호작용 | 예 | 예 | 광고 또는 마케팅, 분석, 사기 방지·보안 |
| 앱 정보 및 성능 → 비정상 종료 로그, 진단 | 예 | 예 | 분석 |
| 기기 또는 기타 ID | 예 | 예 | 광고 또는 마케팅, 분석, 사기 방지·보안 |

모두 "일시적 처리 아님", "사용자가 선택 불가(필수)".

## 6. 첫 업로드와 테스트 (가장 먼저 시작)

1. ☐ **테스트 → 내부 테스트 → 새 버전 만들기** → `app-release.aab` 업로드 → 출시 노트(아래 9) → 저장 → 검토 → 출시
   (첫 업로드 때 "Play 앱 서명 사용"에 동의)
2. ☐ 내부 테스트 → **테스터** 탭에 내 Gmail 추가 → 링크로 폰에 설치 → 결제·광고·저장 확인
3. ☐ **설정 → 라이선스 테스트**에 내 Gmail 추가 → 결제가 실제 돈 없이 테스트 카드로 됩니다
4. ☐ **(개인 계정이면) 테스트 → 비공개 테스트 → 새 트랙** → 같은 .aab → 국가 **대한민국** 등 → 테스터 이메일 목록에 **12명 이상** → 출시
   테스터 각자 참여 링크에서 **"테스터 되기"를 누르고 앱을 설치**해야 1명으로 셉니다. 14일 동안 지우지 말아 달라고 부탁하세요.

## 7. 인앱 상품 3개 (첫 .aab 업로드 뒤에 메뉴가 열림)

**수익 창출 → 제품 → 인앱 상품 → 상품 만들기**. 상품 ID는 iOS와 글자 하나까지 같아야 합니다.

| 상품 ID | 이름 | 설명 | 가격 |
|---|---|---|---|
| `dotcity.coins.small` | 게임머니 충전 | 지금 시대 게임머니를 충전해요. | ₩2,200 |
| `dotcity.coins.medium` | 게임머니 충전 3배 | 지금 시대 게임머니를 3배 충전해요. | ₩5,500 |
| `dotcity.coins.large` | 게임머니 충전 8배 | 지금 시대 게임머니를 8배 충전해요. | ₩13,000 |

- 가격은 **대한민국 가격을 직접 입력** → 다른 나라는 "환율 기준 자동"으로 둡니다.
- 각 상품 저장 후 **활성화**.
- 결제 대금을 받으려면 **설정 → 결제 프로필**(판매자 계정, 은행 계좌, 세금 정보)을 먼저 만들어야 합니다.

## 8. 스토어 등록정보 (그대로 붙여 넣기)

**성장 → 스토어 등록정보 → 기본 스토어 등록정보** (한국어)

- 앱 이름 (30자): `도트시티`
- 간단한 설명 (80자):
  ```
  석기시대 움집에서 네온 미래 도시까지, 시대를 건너며 키우는 픽셀 도시
  ```
- 자세한 설명: iOS 설명(IOS_RELEASE.md 5번)과 같고 마지막 줄 위에 두 줄 추가
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
  • 바다 한가운데 고래와 대왕오징어, 하늘을 지나가는 정체불명의 비행선
  • 발견, 부탁, 희귀 건물 도감, 12월 크리스마스 이벤트
  • 사진 모드로 내 도시를 찍어 저장하고 자랑하기
  • 시대마다 다른 배경 음악
  • 기념물 공사는 현실 시간으로 진행되고, 자리를 비운 동안에도 도시가 자랍니다
  • 인터넷 없이 플레이, 강제 광고 없음 (원할 때만 광고 보고 게임머니 받기)
  ```
- 그래픽 (모두 `dotcity-app/store/` 안)
  - 앱 아이콘 512×512: `play/icon-512.png`
  - 그래픽 이미지 1024×500: `play/feature-graphic.png`
  - 휴대전화 스크린샷 (1080×1920, 최대 8장): `screenshots/marketing/android-01.png` ~ `android-08.png` 순서대로
    (01 불꽃 축제, 02 테마파크, 03 연등회, 04 광장 꾸미기, 05 지진 복구, 06 미래 도시, 07 현대 야경, 08 공항·기차·배)
- 카테고리: **시뮬레이션** · 태그: 도시 건설, 픽셀 아트, 캐주얼 등 최대 5개
- 연락처 이메일(필수), 웹사이트 `https://eyisyun.github.io/github-slideshow/`

**영어 번역 추가** (같은 화면 → 번역 관리 → 직접 번역 추가 → 영어(미국) en-US)
- 앱 이름: `Dot City: Pixel City Builder`
- 간단한 설명:
  ```
  Grow a pixel city from Stone Age huts to a neon future, one era at a time
  ```
- 자세한 설명: IOS_RELEASE.md 5-1의 영어 설명 + 마지막 줄 위에
  ```
  • Whales and a giant squid out at sea, and a mysterious craft that sweeps over town
  • Discoveries, requests, a book of rare buildings, and a Christmas event every December
  ```
- 그래픽: `play/feature-graphic-en.png`, 스크린샷 `screenshots/marketing/android-en-01.png` ~ `08.png`

## 9. 출시 노트 (첫 버전)

한국어:
```
도트시티가 안드로이드에 나왔어요.
석기시대 움집에서 시작해 한옥 마을, 근대 도시, 현대 빌딩숲, 네온 미래 도시까지 키워 보세요.
12월에는 크리스마스 이벤트가 열려요.
```
English:
```
Dot City is now on Android.
Grow a Stone Age camp into a hanok village, a brick town, a skyline of towers and a neon future city.
A Christmas event runs all December.
```

## 10. 프로덕션 출시

- ☐ (개인 계정) 비공개 테스트 12명 · 14일이 차면 **대시보드 → 프로덕션 액세스 신청** → 테스트 관련 질문에 답 → 승인(보통 며칠)
- ☐ **프로덕션 → 국가/지역** 추가 (전 세계 추천) → **새 버전 만들기 → 라이브러리에서 추가**로 테스트한 .aab 선택 → 검토 → 출시
- 첫 심사는 며칠에서 1주일 정도 걸릴 수 있습니다.

## 업데이트할 때

1. `git pull` → `npm run sync` → 3단계 grep 확인
2. `build.gradle`의 `versionCode` +1, `versionName`은 iOS 버전과 맞춤
3. `./gradlew bundleRelease` → Play Console **프로덕션 → 새 버전 만들기**
