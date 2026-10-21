import numpy as np
import pandas as pd

from sol_volume_alert.flow import RollingTickFlow, TickRule, add_flow_features, classify_bar_volume
from sol_volume_alert.live import SignalGate


def test_bar_classification_excludes_flat_price_volume():
    df = pd.DataFrame({
        "close": [100, 101, 101, 99],
        "volume": [10, 20, 30, 40],
    })
    out = classify_bar_volume(df)
    assert out.loc[1, "vkb"] == 20
    assert out.loc[2, "vkb"] == 0
    assert out.loc[2, "vks"] == 0
    assert out.loc[2, "flat_volume"] == 30
    assert out.loc[3, "vks"] == 40


def test_tick_rule_and_rolling_flow():
    rule = TickRule()
    flow = RollingTickFlow(1000)
    events = [
        rule.update(0, 100, 1),
        rule.update(100, 101, 2),
        rule.update(200, 101, 3),
        rule.update(300, 100, 4),
    ]
    for e in events:
        flow.push(e)
    s = flow.snapshot()
    assert s["vkb"] == 2
    assert s["vks"] == 4
    assert np.isclose(s["imbalance"], -2 / 6)

    e = rule.update(1500, 102, 5)
    flow.push(e)
    s = flow.snapshot()
    assert s["vkb"] == 5
    assert s["vks"] == 0

def test_actual_taker_imbalance_uses_the_same_rolling_window():
    df = pd.DataFrame({
        "close": [100, 101, 99],
        "volume": [10.0, 20.0, 30.0],
        "taker_buy_base": [6.0, 15.0, 6.0],
    })
    out = add_flow_features(df, 2)
    assert np.isnan(out.loc[0, "actual_taker_imbalance"])
    assert np.isclose(out.loc[1, "actual_taker_imbalance"], (21.0 - 9.0) / 30.0)
    assert np.isclose(out.loc[2, "actual_taker_imbalance"], (21.0 - 29.0) / 50.0)


def test_live_signal_gate_matches_non_overlapping_holding_period():
    gate = SignalGate(holding_bars=1)
    first_close = 59_999
    assert gate.should_emit(1, first_close)
    assert not gate.should_emit(-1, first_close + 60_000)
    assert not gate.should_emit(0, first_close + 60_000)
    # The backtest can enter again on the close of the first position's exit bar.
    assert gate.should_emit(-1, first_close + 120_000)
    assert not gate.should_emit(1, first_close + 120_001)
    assert gate.should_emit(1, first_close + 240_000)

