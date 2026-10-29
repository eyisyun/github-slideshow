from datetime import datetime, timedelta, timezone

from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame


def daily_closes(client: StockHistoricalDataClient, symbol: str, days: int) -> list:
    """Return daily closing prices, oldest first. Calendar days are padded for weekends/holidays."""
    start = datetime.now(timezone.utc) - timedelta(days=int(days * 1.6) + 10)
    req = StockBarsRequest(symbol_or_symbols=symbol, timeframe=TimeFrame.Day, start=start, feed="iex")
    bars = client.get_stock_bars(req).data.get(symbol, [])
    return [float(b.close) for b in bars]
