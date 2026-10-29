"""이동평균 교차 전략. 네트워크 없이 테스트할 수 있도록 순수 함수로만 구성."""

from typing import Sequence


def sma(values: Sequence[float], window: int) -> float:
    if len(values) < window:
        raise ValueError(f"need {window} values, got {len(values)}")
    return sum(values[-window:]) / window


def signal(closes: Sequence[float], short: int, long: int) -> str:
    """'buy' if short SMA is above long SMA, 'sell' if below, otherwise 'hold'."""
    if short >= long:
        raise ValueError("short window must be smaller than long window")
    if len(closes) < long:
        return "hold"
    s, l = sma(closes, short), sma(closes, long)
    if s > l:
        return "buy"
    if s < l:
        return "sell"
    return "hold"


def backtest(closes: Sequence[float], short: int, long: int, cash: float = 10_000.0) -> dict:
    """Long-only backtest: all-in on 'buy', flat on 'sell', trading at the close."""
    shares = 0.0
    trades = 0
    for i in range(long, len(closes) + 1):
        price = closes[i - 1]
        sig = signal(closes[:i], short, long)
        if sig == "buy" and shares == 0:
            shares, cash, trades = cash / price, 0.0, trades + 1
        elif sig == "sell" and shares > 0:
            cash, shares, trades = shares * price, 0.0, trades + 1
    final = cash + shares * closes[-1]
    start = 10_000.0
    buy_hold = start * closes[-1] / closes[long - 1] if len(closes) >= long else start
    return {
        "final_value": round(final, 2),
        "return_pct": round((final / start - 1) * 100, 2),
        "buy_hold_return_pct": round((buy_hold / start - 1) * 100, 2),
        "trades": trades,
    }
