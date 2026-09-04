from __future__ import annotations

from dataclasses import dataclass
from collections import deque
from typing import Iterable, Optional

import numpy as np
import pandas as pd


def classify_bar_volume(df: pd.DataFrame) -> pd.DataFrame:
    """Apply the user's rule to bar data.

    close_t > close_{t-1}: all bar volume -> Vkb
    close_t < close_{t-1}: all bar volume -> Vks
    unchanged: excluded from directional calculation
    """
    out = df.copy()
    delta = out["close"].diff()
    out["vkb"] = np.where(delta > 0, out["volume"], 0.0)
    out["vks"] = np.where(delta < 0, out["volume"], 0.0)
    out["flat_volume"] = np.where(delta == 0, out["volume"], 0.0)
    out["directional_volume"] = out["vkb"] + out["vks"]
    out["signed_volume"] = out["vkb"] - out["vks"]
    return out


def add_flow_features(df: pd.DataFrame, window: int) -> pd.DataFrame:
    if window < 1:
        raise ValueError("window must be >= 1")
    out = classify_bar_volume(df)
    buy = out["vkb"].rolling(window, min_periods=window).sum()
    sell = out["vks"].rolling(window, min_periods=window).sum()
    total = buy + sell
    out["roll_vkb"] = buy
    out["roll_vks"] = sell
    out["imbalance"] = np.where(total > 0, (buy - sell) / total, np.nan)
    out["buy_ratio"] = np.where(total > 0, buy / total, np.nan)
    out["sell_ratio"] = np.where(total > 0, sell / total, np.nan)

    if "taker_buy_base" in out.columns:
        actual_sell = (out["volume"] - out["taker_buy_base"]).clip(lower=0)
        actual_total = out["taker_buy_base"] + actual_sell
        out["actual_taker_imbalance"] = np.where(
            actual_total > 0,
            (out["taker_buy_base"] - actual_sell) / actual_total,
            np.nan,
        )
    return out


@dataclass(frozen=True)
class TickFlowEvent:
    ts_ms: int
    price: float
    qty: float
    side: int  # +1 inferred buy, -1 inferred sell, 0 unchanged


class TickRule:
    """Stateful tick-rule classifier faithful to the user-provided hypothesis."""

    def __init__(self) -> None:
        self.prev_price: Optional[float] = None

    def update(self, ts_ms: int, price: float, qty: float) -> TickFlowEvent:
        if self.prev_price is None:
            side = 0
        elif price > self.prev_price:
            side = 1
        elif price < self.prev_price:
            side = -1
        else:
            side = 0
        self.prev_price = price
        return TickFlowEvent(ts_ms=ts_ms, price=price, qty=qty, side=side)


class RollingTickFlow:
    """Time-windowed Vkb/Vks over tick-classified trades."""

    def __init__(self, window_ms: int) -> None:
        if window_ms <= 0:
            raise ValueError("window_ms must be > 0")
        self.window_ms = window_ms
        self.events: deque[TickFlowEvent] = deque()
        self.vkb = 0.0
        self.vks = 0.0

    def push(self, event: TickFlowEvent) -> None:
        self.events.append(event)
        if event.side > 0:
            self.vkb += event.qty
        elif event.side < 0:
            self.vks += event.qty
        self._evict(event.ts_ms)

    def _evict(self, now_ms: int) -> None:
        cutoff = now_ms - self.window_ms
        while self.events and self.events[0].ts_ms < cutoff:
            old = self.events.popleft()
            if old.side > 0:
                self.vkb -= old.qty
            elif old.side < 0:
                self.vks -= old.qty

    def snapshot(self) -> dict[str, float]:
        total = self.vkb + self.vks
        if total <= 0:
            return {
                "vkb": self.vkb,
                "vks": self.vks,
                "buy_ratio": float("nan"),
                "sell_ratio": float("nan"),
                "imbalance": float("nan"),
            }
        return {
            "vkb": self.vkb,
            "vks": self.vks,
            "buy_ratio": self.vkb / total,
            "sell_ratio": self.vks / total,
            "imbalance": (self.vkb - self.vks) / total,
        }
