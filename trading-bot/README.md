# 이동평균 교차 자동매매 봇 (Alpaca / 미국 주식)

단기 SMA(기본 20일)가 장기 SMA(기본 50일)보다 위면 매수, 아래면 전량 매도하는 롱 전용 봇입니다.

## 안전장치
- 기본값은 **모의투자**. 실전은 `ALPACA_PAPER=false` 와 `LIVE_TRADING_CONFIRM=YES` 를 둘 다 설정해야 동작
- 종목당 최대 매수 금액 `MAX_POSITION_USD`
- 하루 손실이 `MAX_DAILY_LOSS_USD` 를 넘으면 신규 매수 중단
- 미체결 주문이 있는 종목은 건너뜀, 장이 닫혀 있으면 아무것도 하지 않음

## 시작하기
```bash
cd trading-bot
pip install -r requirements.txt
cp .env.example .env   # 키 입력
python backtest.py --days 730   # 1. 과거 성과 확인
python bot.py --dry-run         # 2. 주문 없이 신호 확인
python bot.py                   # 3. 실제 주문 (모의/실전은 .env 설정대로)
```

## 정기 실행
일봉 전략이라 하루 한 번이면 충분합니다. 장 마감 30분 전(미 동부 15:30)에 실행하는 cron 예시:
```
CRON_TZ=America/New_York
30 15 * * 1-5 cd /path/to/trading-bot && python bot.py
```

## 테스트
```bash
python -m pytest -q tests
```

> 투자 손실 책임은 본인에게 있습니다. 실전 전 최소 몇 주는 모의투자로 돌려보세요.
