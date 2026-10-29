import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from strategy import backtest, signal, sma  # noqa: E402


def test_sma():
    assert sma([1, 2, 3, 4], 2) == 3.5


def test_signal_needs_enough_data():
    assert signal([1, 2, 3], 2, 5) == "hold"


def test_signal_uptrend_buys_downtrend_sells():
    assert signal(list(range(1, 60)), 5, 20) == "buy"
    assert signal(list(range(60, 1, -1)), 5, 20) == "sell"


def test_signal_rejects_bad_windows():
    with pytest.raises(ValueError):
        signal(list(range(100)), 20, 20)


def test_backtest_rise_then_fall_exits():
    closes = [float(x) for x in list(range(10, 60)) + list(range(60, 20, -1))]
    result = backtest(closes, 5, 20)
    assert result["trades"] == 2
    assert result["return_pct"] > result["buy_hold_return_pct"]
