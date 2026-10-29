"""이동평균 교차 자동매매 봇 (Alpaca, 미국 주식, 롱 전용).

사용법:
  python bot.py --dry-run   # 주문 없이 신호만 출력
  python bot.py             # 한 번 실행 (장중에 cron 등으로 하루 1회 실행 권장)
"""

import argparse
import logging

from alpaca.data.historical import StockHistoricalDataClient
from alpaca.trading.client import TradingClient
from alpaca.trading.enums import OrderSide, TimeInForce
from alpaca.trading.requests import MarketOrderRequest

import config
from data import daily_closes
from strategy import signal

log = logging.getLogger("bot")


def run(dry_run: bool) -> None:
    cfg = config.load()
    trading = TradingClient(cfg.api_key, cfg.secret_key, paper=cfg.paper)
    market = StockHistoricalDataClient(cfg.api_key, cfg.secret_key)

    log.info("모드: %s%s", "모의투자" if cfg.paper else "*** 실전 ***", " (dry-run)" if dry_run else "")

    if not trading.get_clock().is_open:
        log.info("장이 닫혀 있어 종료합니다.")
        return

    account = trading.get_account()
    if account.trading_blocked:
        log.error("계좌 거래가 차단돼 있습니다.")
        return
    daily_pnl = float(account.equity) - float(account.last_equity)
    can_buy = daily_pnl > -cfg.max_daily_loss_usd
    if not can_buy:
        log.warning("오늘 손실 %.2f USD 가 한도를 넘어 신규 매수를 중단합니다.", daily_pnl)

    positions = {p.symbol: p for p in trading.get_all_positions()}
    open_orders = {o.symbol for o in trading.get_orders()}

    for symbol in cfg.symbols:
        closes = daily_closes(market, symbol, cfg.long_window)
        sig = signal(closes, cfg.short_window, cfg.long_window)
        held = symbol in positions
        log.info("%s: 종가 %d개, 신호=%s, 보유=%s", symbol, len(closes), sig, held)

        if symbol in open_orders:
            log.info("%s: 미체결 주문이 있어 건너뜁니다.", symbol)
            continue

        if sig == "buy" and not held and can_buy:
            notional = min(cfg.max_position_usd, float(account.buying_power))
            if notional < 1:
                log.warning("%s: 매수 가능 금액이 부족합니다.", symbol)
                continue
            log.info("%s: %.2f USD 매수", symbol, notional)
            if not dry_run:
                trading.submit_order(MarketOrderRequest(
                    symbol=symbol, notional=round(notional, 2),
                    side=OrderSide.BUY, time_in_force=TimeInForce.DAY,
                ))
        elif sig == "sell" and held:
            log.info("%s: 전량 매도 (%s주)", symbol, positions[symbol].qty)
            if not dry_run:
                trading.close_position(symbol)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="주문을 넣지 않고 신호만 출력")
    args = parser.parse_args()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.StreamHandler(), logging.FileHandler("bot.log")],
    )
    run(args.dry_run)


if __name__ == "__main__":
    main()
