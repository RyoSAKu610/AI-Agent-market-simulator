import numpy as np
import pandas as pd

from sol_volume_alert.flow import RollingTickFlow, TickRule, classify_bar_volume


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
