from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from collections import deque
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import websocket


WS_BASE = "wss://fstream.binance.com/ws"
JST = ZoneInfo("Asia/Tokyo")


def post_webhook(url: str, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        if resp.status >= 300:
            raise RuntimeError(f"webhook returned HTTP {resp.status}")


class MinuteFlow:
    """Build 1-minute bars from aggTrades and retain proxy + actual taker flow."""

    def __init__(self, window_bars: int) -> None:
        self.window_bars = window_bars
        self.current_minute = None
        self.current_close = None
        self.current_volume = 0.0
        self.current_taker_buy = 0.0
        self.current_taker_sell = 0.0
        self.prev_close = None
        self.rows: deque[tuple[float, float, float, float]] = deque(maxlen=window_bars)

    def update_trade(self, ts_ms: int, price: float, qty: float, buyer_is_maker: bool):
        minute = ts_ms // 60_000
        taker_buy = 0.0 if buyer_is_maker else qty
        taker_sell = qty if buyer_is_maker else 0.0

        if self.current_minute is None:
            self.current_minute = minute
            self.current_close = price
            self.current_volume = qty
            self.current_taker_buy = taker_buy
            self.current_taker_sell = taker_sell
            return None

        if minute == self.current_minute:
            self.current_close = price
            self.current_volume += qty
            self.current_taker_buy += taker_buy
            self.current_taker_sell += taker_sell
            return None

        closed_ts_ms = self.current_minute * 60_000 + 59_999
        proxy_buy = proxy_sell = 0.0
        if self.prev_close is not None:
            if self.current_close > self.prev_close:
                proxy_buy = self.current_volume
            elif self.current_close < self.prev_close:
                proxy_sell = self.current_volume

        self.rows.append((proxy_buy, proxy_sell, self.current_taker_buy, self.current_taker_sell))
        self.prev_close = self.current_close

        snap = None
        if len(self.rows) == self.window_bars:
            vkb = sum(x[0] for x in self.rows)
            vks = sum(x[1] for x in self.rows)
            tb = sum(x[2] for x in self.rows)
            ts = sum(x[3] for x in self.rows)
            proxy_total = vkb + vks
            taker_total = tb + ts
            if proxy_total > 0 and taker_total > 0:
                snap = {
                    "bar_close_ts_ms": closed_ts_ms,
                    "price": self.current_close,
                    "vkb": vkb,
                    "vks": vks,
                    "buy_ratio": vkb / proxy_total,
                    "sell_ratio": vks / proxy_total,
                    "imbalance": (vkb - vks) / proxy_total,
                    "taker_buy": tb,
                    "taker_sell": ts,
                    "taker_buy_ratio": tb / taker_total,
                    "taker_sell_ratio": ts / taker_total,
                    "taker_imbalance": (tb - ts) / taker_total,
                }

        self.current_minute = minute
        self.current_close = price
        self.current_volume = qty
        self.current_taker_buy = taker_buy
        self.current_taker_sell = taker_sell
        return snap


def signed_threshold(value: float, threshold: float) -> int:
    return 1 if value >= threshold else (-1 if value <= -threshold else 0)


def model_signal(cfg: dict, snap: dict) -> tuple[int, str]:
    model = cfg.get("model", "proxy")
    mode = int(cfg.get("mode", 1))
    proxy = float(snap["imbalance"])
    taker = float(snap["taker_imbalance"])

    if model == "proxy":
        threshold = float(cfg["threshold"])
        base = signed_threshold(proxy, threshold)
        reason = f"proxy |imbalance| >= {threshold:.6f}"
    elif model == "taker":
        threshold = float(cfg["taker_threshold"])
        base = signed_threshold(taker, threshold)
        reason = f"actual taker |imbalance| >= {threshold:.6f}"
    elif model == "agreement":
        tth = float(cfg["taker_threshold"])
        pth = float(cfg["proxy_threshold"])
        t = signed_threshold(taker, tth)
        p = signed_threshold(proxy, pth)
        base = t if t != 0 and t == p else 0
        reason = f"proxy+taker agreement; thresholds proxy={pth:.6f}, taker={tth:.6f}"
    elif model == "taker_price_divergence":
        tth = float(cfg["taker_threshold"])
        pth = float(cfg["proxy_threshold"])
        if taker >= tth and proxy <= -pth:
            base = 1
        elif taker <= -tth and proxy >= pth:
            base = -1
        else:
            base = 0
        reason = f"taker/price divergence; thresholds proxy={pth:.6f}, taker={tth:.6f}"
    else:
        raise ValueError(f"unsupported model: {model}")

    return base * mode, reason + f"; mode={mode}"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--config", required=True)
    args = p.parse_args()

    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    if cfg.get("status") != "PROMISING_OOS":
        raise SystemExit("Refusing live trade alerts: config is not PROMISING_OOS.")

    symbol = cfg["symbol"].lower()
    flow = MinuteFlow(int(cfg["window_bars"]))
    webhook = os.getenv("ALERT_WEBHOOK_URL")
    last_signal = 0

    def on_message(_ws, raw: str) -> None:
        nonlocal last_signal
        msg = json.loads(raw)
        snap = flow.update_trade(
            int(msg["T"]),
            float(msg["p"]),
            float(msg["q"]),
            bool(msg["m"]),
        )
        if snap is None:
            return

        signal, reason = model_signal(cfg, snap)
        changed = signal != last_signal
        last_signal = signal
        if signal == 0 or not changed:
            return

        side = "LONG" if signal > 0 else "SHORT"
        payload = {
            "timestamp_jst": datetime.fromtimestamp(snap["bar_close_ts_ms"] / 1000, tz=JST).isoformat(),
            "symbol": cfg["symbol"],
            "model": cfg.get("model", "proxy"),
            "price": snap["price"],
            "vkb": snap["vkb"],
            "vks": snap["vks"],
            "buy_ratio": snap["buy_ratio"],
            "sell_ratio": snap["sell_ratio"],
            "imbalance": snap["imbalance"],
            "taker_buy": snap["taker_buy"],
            "taker_sell": snap["taker_sell"],
            "taker_buy_ratio": snap["taker_buy_ratio"],
            "taker_sell_ratio": snap["taker_sell_ratio"],
            "taker_imbalance": snap["taker_imbalance"],
            "signal": side,
            "reason": reason,
            "suggested_holding_minutes_from_research": cfg["hold_bars"],
            "validated_expectancy": cfg["validation"]["expectancy"],
            "untouched_test_expectancy": cfg["test"]["expectancy"],
            "untouched_test_profit_factor": cfg["test"]["profit_factor"],
            "auto_execution": False,
        }
        print(json.dumps(payload, ensure_ascii=False), flush=True)
        if webhook:
            post_webhook(webhook, payload)

    def on_error(_ws, err) -> None:
        print(f"websocket error: {err}", file=sys.stderr, flush=True)

    url = f"{WS_BASE}/{symbol}@aggTrade"
    ws = websocket.WebSocketApp(url, on_message=on_message, on_error=on_error)
    ws.run_forever(ping_interval=180, ping_timeout=60)


if __name__ == "__main__":
    main()
