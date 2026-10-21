from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from sol_volume_alert.flow import add_flow_features
from sol_volume_alert.research import Metrics, load_months, metrics, month_range


@dataclass(frozen=True)
class CandidateV2:
    model: str  # taker | agreement
    window: int
    hold: int
    quantile: float
    mode: int  # +1 continuation, -1 fade


def candidate_grid() -> list[CandidateV2]:
    # Same measurement lattice as phase 1 so only the classification method changes.
    models = ["taker", "agreement"]
    windows = [2, 4, 8, 16, 32, 64]
    holds = [1, 2, 4, 8, 16, 32]
    quantiles = [0.50, 0.60, 0.70, 0.80, 0.90, 0.95]
    modes = [1, -1]
    return [CandidateV2(model, w, h, q, m) for model in models for w in windows for h in holds for q in quantiles for m in modes]


def add_v2_features(df: pd.DataFrame, window: int) -> pd.DataFrame:
    out = add_flow_features(df, window)
    taker_buy = out["taker_buy_base"].clip(lower=0)
    taker_sell = (out["volume"] - taker_buy).clip(lower=0)
    rb = taker_buy.rolling(window, min_periods=window).sum()
    rs = taker_sell.rolling(window, min_periods=window).sum()
    total = rb + rs
    out["roll_taker_buy"] = rb
    out["roll_taker_sell"] = rs
    out["taker_imbalance_roll"] = np.where(total > 0, (rb - rs) / total, np.nan)
    return out


def feature_cache(df: pd.DataFrame, months: list[str], windows: list[int]) -> dict[int, dict[str, pd.DataFrame]]:
    cache: dict[int, dict[str, pd.DataFrame]] = {}
    for w in windows:
        cache[w] = {}
        for month in months:
            part = df[df["month"] == month].copy().reset_index(drop=True)
            cache[w][month] = add_v2_features(part, w)
    return cache


def thresholds_from_dev(cache: dict[int, dict[str, pd.DataFrame]], c: CandidateV2) -> dict[str, float]:
    fs = list(cache[c.window].values())
    taker = np.concatenate([f["taker_imbalance_roll"].abs().dropna().to_numpy(float) for f in fs])
    if taker.size == 0:
        return {"taker": float("nan"), "proxy": float("nan")}
    t = float(np.quantile(taker, c.quantile))
    if c.model == "taker":
        return {"taker": t, "proxy": float("nan")}
    proxy = np.concatenate([f["imbalance"].abs().dropna().to_numpy(float) for f in fs])
    p = float(np.quantile(proxy, c.quantile)) if proxy.size else float("nan")
    return {"taker": t, "proxy": p}


def raw_side(x: pd.DataFrame, c: CandidateV2, th: dict[str, float]) -> np.ndarray:
    taker = x["taker_imbalance_roll"].to_numpy(float)
    if c.model == "taker":
        side = np.where(taker >= th["taker"], 1, np.where(taker <= -th["taker"], -1, 0))
    elif c.model == "agreement":
        proxy = x["imbalance"].to_numpy(float)
        buy = (taker >= th["taker"]) & (proxy >= th["proxy"])
        sell = (taker <= -th["taker"]) & (proxy <= -th["proxy"])
        side = np.where(buy, 1, np.where(sell, -1, 0))
    else:
        raise ValueError(c.model)
    return side.astype(np.int8) * c.mode


def trades_from_features(x: pd.DataFrame, c: CandidateV2, th: dict[str, float], fee_per_side: float) -> pd.DataFrame:
    side = raw_side(x, c, th)
    signal_idx = np.flatnonzero(side)
    if signal_idx.size == 0:
        return pd.DataFrame(columns=["gross_return", "net_return"])

    opens = x["open"].to_numpy(float)
    n = len(x)
    pos = int(np.searchsorted(signal_idx, max(c.window, 1), side="left"))
    gross_returns = []
    while pos < signal_idx.size:
        i = int(signal_idx[pos])
        entry_i = i + 1
        exit_i = entry_i + c.hold
        if exit_i >= n:
            break
        gross = int(side[i]) * (float(opens[exit_i]) / float(opens[entry_i]) - 1.0)
        gross_returns.append(gross)
        pos = int(np.searchsorted(signal_idx, exit_i, side="left"))

    if not gross_returns:
        return pd.DataFrame(columns=["gross_return", "net_return"])
    gross = np.asarray(gross_returns, dtype=float)
    return pd.DataFrame({"gross_return": gross, "net_return": gross - 2.0 * fee_per_side})


def score_candidate(cache: dict[int, dict[str, pd.DataFrame]], months: list[str], c: CandidateV2, fee_per_side: float) -> dict:
    th = thresholds_from_dev(cache, c)
    if not np.isfinite(th["taker"]) or (c.model == "agreement" and not np.isfinite(th["proxy"])):
        return {"candidate": c, "thresholds": th, "median_expectancy": -np.inf, "months": []}
    rows = []
    for month in months:
        mm = metrics(trades_from_features(cache[c.window][month], c, th, fee_per_side), fee_per_side)
        rows.append({"month": month, **asdict(mm)})
    exps = [r["expectancy"] for r in rows if np.isfinite(r["expectancy"])]
    return {
        "candidate": c,
        "thresholds": th,
        "median_expectancy": float(np.median(exps)) if exps else -np.inf,
        "months": rows,
    }


def diagnostics(x: pd.DataFrame) -> dict[str, float]:
    pair = x[["imbalance", "taker_imbalance_roll"]].dropna()
    corr = float(pair.corr().iloc[0, 1]) if len(pair) > 2 else float("nan")
    flat_share = float(x["flat_volume"].sum() / x["volume"].sum()) if x["volume"].sum() else float("nan")
    return {
        "rolling_proxy_vs_taker_corr": corr,
        "flat_price_volume_share": flat_share,
    }


def pct(x: float) -> str:
    return "n/a" if not np.isfinite(x) else f"{100*x:.4f}%"


def safe(v):
    if isinstance(v, dict):
        return {k: safe(x) for k, x in v.items()}
    if isinstance(v, list):
        return [safe(x) for x in v]
    if isinstance(v, (np.floating, float)):
        x = float(v)
        return x if math.isfinite(x) else None
    if isinstance(v, (np.integer, int)):
        return int(v)
    return v


def write_report(out: Path, cfg: dict, selected: dict | None, valid: Metrics | None, test: Metrics | None) -> None:
    m = cfg["months"]
    lines = [
        "# SOL/USDT Volume Direction Research — Phase 2", "",
        "Phase 1 (price-change assigns all bar volume) did not produce a positive development-median expectancy after taker fees.",
        "Phase 2 changes only the volume classification: it tests actual Binance taker-buy/taker-sell flow and a stricter proxy+taker agreement filter.", "",
        f"- Development: {', '.join(m['development'])}",
        f"- Validation: {m['validation']}",
        f"- Untouched test: {m['test']}",
        f"- Fee per side: {cfg['fee_per_side']:.6f}",
        f"- Status: **{cfg['status']}**", "",
    ]
    if selected and valid and test:
        c: CandidateV2 = selected["candidate"]
        th = selected["thresholds"]
        lines += [
            "## Selected rule", "",
            f"- model: `{c.model}`",
            f"- window: {c.window} minutes",
            f"- hold: {c.hold} minutes",
            f"- mode: {'continuation' if c.mode == 1 else 'fade'}",
            f"- quantile: {c.quantile:.2f}",
            f"- taker threshold: {th['taker']:.6f}",
            f"- proxy threshold: {th['proxy']:.6f}" if np.isfinite(th["proxy"]) else "- proxy threshold: not used",
            "",
            "| split | trades | win rate | expectancy/trade | PF | total return* | max DD* |",
            "|---|---:|---:|---:|---:|---:|---:|",
            f"| validation | {valid.trades} | {pct(valid.win_rate)} | {pct(valid.expectancy)} | {valid.profit_factor:.3f} | {pct(valid.total_return)} | {pct(valid.max_drawdown)} |",
            f"| untouched test | {test.trades} | {pct(test.win_rate)} | {pct(test.expectancy)} | {test.profit_factor:.3f} | {pct(test.total_return)} | {pct(test.max_drawdown)} |",
            "", "\\* additive fixed-notional return, not leveraged account equity", "",
        ]
    lines += [
        "## Decision rule", "",
        "Live alerts are enabled only when a candidate is positive in the separate validation month and remains positive with PF > 1 in the untouched final month after the configured fee.",
        "A failed gate is retained as evidence; parameters are not retuned on the untouched month.",
    ]
    out.joinpath("REPORT_V2.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--symbol", default="SOLUSDT")
    p.add_argument("--start-month", required=True)
    p.add_argument("--end-month", required=True)
    p.add_argument("--fee-per-side", type=float, default=0.0005)
    p.add_argument("--cache", default=".cache/binance")
    p.add_argument("--out", default="reports_v2")
    args = p.parse_args()

    months = month_range(args.start_month, args.end_month)
    if len(months) < 6:
        raise SystemExit("Need at least six complete calendar months")
    months = months[-6:]
    dev_months, valid_month, test_month = months[:4], months[4], months[5]
    df = load_months(args.symbol, months, Path(args.cache))

    windows = sorted({c.window for c in candidate_grid()})
    dev_cache = feature_cache(df, dev_months, windows)
    scored = [score_candidate(dev_cache, dev_months, c, args.fee_per_side) for c in candidate_grid()]
    viable = [x for x in scored if np.isfinite(x["median_expectancy"]) and x["median_expectancy"] > 0]
    viable.sort(key=lambda x: x["median_expectancy"], reverse=True)

    valid_cache: dict[int, pd.DataFrame] = {}
    selected = None
    valid_metrics = None
    for row in viable:
        c = row["candidate"]
        if c.window not in valid_cache:
            part = df[df["month"] == valid_month].copy().reset_index(drop=True)
            valid_cache[c.window] = add_v2_features(part, c.window)
        vm = metrics(trades_from_features(valid_cache[c.window], c, row["thresholds"], args.fee_per_side), args.fee_per_side)
        if vm.trades and vm.expectancy > 0 and vm.profit_factor > 1:
            selected, valid_metrics = row, vm
            break

    status = "NO_ROBUST_EDGE"
    test_metrics = None
    diag = None
    if selected is not None:
        c = selected["candidate"]
        test_part = df[df["month"] == test_month].copy().reset_index(drop=True)
        test_feature = add_v2_features(test_part, c.window)
        test_metrics = metrics(trades_from_features(test_feature, c, selected["thresholds"], args.fee_per_side), args.fee_per_side)
        diag = diagnostics(test_feature)
        if test_metrics.trades and test_metrics.expectancy > 0 and test_metrics.profit_factor > 1:
            status = "PROMISING_OOS"

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([{
        "model": r["candidate"].model,
        "window": r["candidate"].window,
        "hold": r["candidate"].hold,
        "quantile": r["candidate"].quantile,
        "mode": r["candidate"].mode,
        "taker_threshold": r["thresholds"]["taker"],
        "proxy_threshold": r["thresholds"]["proxy"],
        "dev_median_expectancy": r["median_expectancy"],
    } for r in scored]).to_csv(out / "candidate_scores_v2.csv", index=False)

    cfg = {
        "status": status,
        "symbol": args.symbol,
        "fee_per_side": args.fee_per_side,
        "months": {"development": dev_months, "validation": valid_month, "test": test_month},
    }
    if selected is not None:
        c = selected["candidate"]
        cfg.update({
            "model": c.model,
            "window_bars": c.window,
            "hold_bars": c.hold,
            "quantile": c.quantile,
            "mode": c.mode,
            "taker_threshold": selected["thresholds"]["taker"],
            "proxy_threshold": selected["thresholds"]["proxy"],
            "validation": asdict(valid_metrics),
            "test": asdict(test_metrics),
            "diagnostics": diag,
        })
    out.joinpath("best_config_v2.json").write_text(json.dumps(safe(cfg), indent=2, allow_nan=False), encoding="utf-8")
    write_report(out, cfg, selected, valid_metrics, test_metrics)
    print(json.dumps(safe(cfg), indent=2))
    if status != "PROMISING_OOS":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
