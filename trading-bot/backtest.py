"""과거 일봉으로 전략 성과 확인. 실전 전에 반드시 돌려보세요.

  python backtest.py --days 730
"""

import argparse

from alpaca.data.historical import StockHistoricalDataClient

import config
from data import daily_closes
from strategy import backtest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=730, help="거래일 수")
    args = parser.parse_args()
    cfg = config.load()
    market = StockHistoricalDataClient(cfg.api_key, cfg.secret_key)
    for symbol in cfg.symbols:
        closes = daily_closes(market, symbol, args.days)
        print(symbol, backtest(closes, cfg.short_window, cfg.long_window))


if __name__ == "__main__":
    main()
