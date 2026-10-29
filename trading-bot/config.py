import os
from dataclasses import dataclass


def _load_dotenv(path: str = os.path.join(os.path.dirname(__file__), ".env")) -> None:
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())


@dataclass(frozen=True)
class Config:
    api_key: str
    secret_key: str
    paper: bool
    symbols: list
    short_window: int
    long_window: int
    max_position_usd: float
    max_daily_loss_usd: float


def load() -> Config:
    _load_dotenv()
    env = os.environ
    paper = env.get("ALPACA_PAPER", "true").lower() != "false"
    if not paper and env.get("LIVE_TRADING_CONFIRM") != "YES":
        raise SystemExit(
            "실전 매매가 설정됐지만 LIVE_TRADING_CONFIRM=YES 가 없습니다. 실수 방지를 위해 종료합니다."
        )
    api_key, secret_key = env.get("ALPACA_API_KEY", ""), env.get("ALPACA_SECRET_KEY", "")
    if not api_key or not secret_key:
        raise SystemExit("ALPACA_API_KEY / ALPACA_SECRET_KEY 를 .env 에 설정하세요.")
    return Config(
        api_key=api_key,
        secret_key=secret_key,
        paper=paper,
        symbols=[s.strip().upper() for s in env.get("SYMBOLS", "SPY").split(",") if s.strip()],
        short_window=int(env.get("SHORT_WINDOW", "20")),
        long_window=int(env.get("LONG_WINDOW", "50")),
        max_position_usd=float(env.get("MAX_POSITION_USD", "500")),
        max_daily_loss_usd=float(env.get("MAX_DAILY_LOSS_USD", "100")),
    )
