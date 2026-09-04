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
    """Build 1-minute bars from aggTrades, then apply the exact research rule."""

    def __init__(self, window_bars: int) -> None:
        self.window_bars = window_bars
        self.current_minute = None
        self.current_close = None
        self.current_volume = 0.0
        self.prev_close = None
        self.directional: deque[tuple[float, float]] = deque(maxlen=window_bars)

    def update_trade(self, ts_ms: int, price: float, qty: float):
        minute = ts_ms // 60_000
        if self.current_minute is None:
            self.current_minute = minute
            self.current_close = price
            self.current_volume = qty
            return None

        if minute == self.current_minute:
            self.current_close = price
            self.current_volume += qty
            return None

        closed_ts_ms = self.current_minute * 60_000 + 59_999
        buy = sell = 0.0
        if self.prev_close is not None:
            if self.current_close > self.prev_close:
                buy = self.current_volume
            elif self.current_close < self.prev_close:
                sell = self.current_volume
        self.directional.append((buy, sell))
        self.prev_close = self.current_close

        vkb = sum(x[0] for x in self.directional)
        vks = sum(x[1] for x in self.directional)
        total = vkb + vks
        snap = None
        if len(self.directional) == self.window_bars and total > 0:
            snap = {
                "bar_close_ts_ms": closed_ts_ms,
                "price": self.current_close,
                "vkb": vkb,
                "vks": vks,
                "buy_ratio": vkb / total,
                "sell_ratio": vks / total,
                "imbalance": (vkb - vks) / total,
            }

        self.current_minute = minute
        self.current_close = price
        self.current_volume = qty
        return snap


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--config", default="reports/best_config.json")
    args = p.parse_args()

    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    if cfg.get("status") != "PROMISING_OOS":
        raise SystemExit("Refusing live alerts: config is not PROMISING_OOS.")

    symbol = cfg["symbol"].lower()
    window_bars = int(cfg["window_bars"])
    threshold = float(cfg["threshold"])
    mode = int(cfg["mode"])
    webhook = os.getenv("ALERT_WEBHOOK_URL")

    flow = MinuteFlow(window_bars)
    last_signal = 0

    def on_message(_ws, raw: str) -> None:
        nonlocal last_signal
        msg = json.loads(raw)
        snap = flow.update_trade(int(msg["T"]), float(msg["p"]), float(msg["q"]))
        if snap is None:
            return

        imb = snap["imbalance"]
        inferred = 1 if imb >= threshold else (-1 if imb <= -threshold else 0)
        signal = inferred * mode
        changed = signal != last_signal
        last_signal = signal
        if signal == 0 or not changed:
            return

        side = "LONG" if signal > 0 else "SHORT"
        payload = {
            "timestamp_jst": datetime.fromtimestamp(snap["bar_close_ts_ms"] / 1000, tz=JST).isoformat(),
            "symbol": cfg["symbol"],
            "price": snap["price"],
            "vkb": snap["vkb"],
            "vks": snap["vks"],
            "buy_ratio": snap["buy_ratio"],
            "sell_ratio": snap["sell_ratio"],
            "imbalance": imb,
            "signal": side,
            "reason": f"|imbalance| >= learned threshold {threshold:.6f}; mode={'continuation' if mode == 1 else 'fade'}",
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
