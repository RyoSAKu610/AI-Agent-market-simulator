from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from sol_volume_alert.research import Metrics, load_months, metrics, month_range
from sol_volume_alert.research_v2 import add_v2_features, feature_cache


@dataclass(frozen=True)
class Candidate:
    window: int
    hold: int
    quantile: float
    mode: int  # +1 follow taker, -1 fade taker / absorption


def candidate_grid() -> list[Candidate]:
    windows = [2, 4, 8, 16, 32, 64]
    holds = [1, 2, 4, 8, 16, 32]
    quantiles = [0.50, 0.60, 0.70, 0.80, 0.90, 0.95]
    modes = [1, -1]
    return [Candidate(w, h, q, m) for w in windows for h in holds for q in quantiles for m in modes]


def thresholds(cache: dict[int, dict[str, pd.DataFrame]], c: Candidate) -> tuple[float, float]:
    fs = list(cache[c.window].values())
    taker = np.concatenate([f["taker_imbalance_roll"].abs().dropna().to_numpy(float) for f in fs])
    proxy = np.concatenate([f["imbalance"].abs().dropna().to_numpy(float) for f in fs])
    if not taker.size or not proxy.size:
        return float("nan"), float("nan")
    return float(np.quantile(taker, c.quantile)), float(np.quantile(proxy, c.quantile))


def sides(x: pd.DataFrame, c: Candidate, taker_th: float, proxy_th: float) -> np.ndarray:
    taker = x["taker_imbalance_roll"].to_numpy(float)
    proxy = x["imbalance"].to_numpy(float)
    # Divergence: strong aggressive flow meets equally strong price-direction
    # evidence in the opposite direction. Base direction follows the taker;
    # mode=-1 tests the absorption interpretation.
    taker_buy_absorbed = (taker >= taker_th) & (proxy <= -proxy_th)
    taker_sell_absorbed = (taker <= -taker_th) & (proxy >= proxy_th)
    base = np.where(taker_buy_absorbed, 1, np.where(taker_sell_absorbed, -1, 0))
    return base.astype(np.int8) * c.mode


def trades(x: pd.DataFrame, c: Candidate, taker_th: float, proxy_th: float, fee_per_side: float) -> pd.DataFrame:
    side = sides(x, c, taker_th, proxy_th)
    signal_idx = np.flatnonzero(side)
    if signal_idx.size == 0:
        return pd.DataFrame(columns=["gross_return", "net_return"])
    opens = x["open"].to_numpy(float)
    n = len(x)
    pos = int(np.searchsorted(signal_idx, max(c.window, 1), side="left"))
    gross_returns: list[float] = []
    while pos < signal_idx.size:
        i = int(signal_idx[pos])
        entry_i = i + 1
        exit_i = entry_i + c.hold
        if exit_i >= n:
            break
        gross_returns.append(int(side[i]) * (float(opens[exit_i]) / float(opens[entry_i]) - 1.0))
        pos = int(np.searchsorted(signal_idx, exit_i, side="left"))
    if not gross_returns:
        return pd.DataFrame(columns=["gross_return", "net_return"])
    gross = np.asarray(gross_returns, dtype=float)
    return pd.DataFrame({"gross_return": gross, "net_return": gross - 2.0 * fee_per_side})


def score(cache: dict[int, dict[str, pd.DataFrame]], months: list[str], c: Candidate, fee: float) -> dict:
    tth, pth = thresholds(cache, c)
    if not np.isfinite(tth) or not np.isfinite(pth):
        return {"candidate": c, "taker_threshold": tth, "proxy_threshold": pth, "median_expectancy": -np.inf}
    ms = [metrics(trades(cache[c.window][m], c, tth, pth, fee), fee) for m in months]
    vals = [x.expectancy for x in ms if np.isfinite(x.expectancy)]
    return {
        "candidate": c,
        "taker_threshold": tth,
        "proxy_threshold": pth,
        "median_expectancy": float(np.median(vals)) if vals else -np.inf,
    }


def safe(v):
    if isinstance(v, dict):
        return {k: safe(x) for k, x in v.items()}
    if isinstance(v, (np.floating, float)):
        x = float(v)
        return x if math.isfinite(x) else None
    if isinstance(v, (np.integer, int)):
        return int(v)
    return v


def pct(x: float) -> str:
    return "n/a" if not np.isfinite(x) else f"{x*100:.4f}%"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--symbol", default="SOLUSDT")
    p.add_argument("--start-month", required=True)
    p.add_argument("--end-month", required=True)
    p.add_argument("--fee-per-side", type=float, default=0.0005)
    p.add_argument("--cache", default=".cache/binance")
    p.add_argument("--out", default="reports_divergence")
    args = p.parse_args()

    months = month_range(args.start_month, args.end_month)[-6:]
    if len(months) < 6:
        raise SystemExit("Need at least six complete calendar months")
    dev_months, valid_month, test_month = months[:4], months[4], months[5]
    df = load_months(args.symbol, months, Path(args.cache))
    windows = sorted({c.window for c in candidate_grid()})
    dev_cache = feature_cache(df, dev_months, windows)
    scored = [score(dev_cache, dev_months, c, args.fee_per_side) for c in candidate_grid()]
    viable = [r for r in scored if np.isfinite(r["median_expectancy"]) and r["median_expectancy"] > 0]
    viable.sort(key=lambda r: r["median_expectancy"], reverse=True)

    selected = None
    vm = None
    valid_cache: dict[int, pd.DataFrame] = {}
    for r in viable:
        c = r["candidate"]
        if c.window not in valid_cache:
            part = df[df["month"] == valid_month].copy().reset_index(drop=True)
            valid_cache[c.window] = add_v2_features(part, c.window)
        candidate_metrics = metrics(
            trades(valid_cache[c.window], c, r["taker_threshold"], r["proxy_threshold"], args.fee_per_side),
            args.fee_per_side,
        )
        if candidate_metrics.trades and candidate_metrics.expectancy > 0 and candidate_metrics.profit_factor > 1:
            selected, vm = r, candidate_metrics
            break

    status = "NO_ROBUST_EDGE"
    tm = None
    if selected is not None:
        c = selected["candidate"]
        part = df[df["month"] == test_month].copy().reset_index(drop=True)
        tf = add_v2_features(part, c.window)
        tm = metrics(trades(tf, c, selected["taker_threshold"], selected["proxy_threshold"], args.fee_per_side), args.fee_per_side)
        if tm.trades and tm.expectancy > 0 and tm.profit_factor > 1:
            status = "PROMISING_OOS"

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([{
        "window": r["candidate"].window,
        "hold": r["candidate"].hold,
        "quantile": r["candidate"].quantile,
        "mode": r["candidate"].mode,
        "taker_threshold": r["taker_threshold"],
        "proxy_threshold": r["proxy_threshold"],
        "dev_median_expectancy": r["median_expectancy"],
    } for r in scored]).to_csv(out / "candidate_scores_divergence.csv", index=False)

    cfg = {
        "status": status,
        "symbol": args.symbol,
        "model": "taker_price_divergence",
        "fee_per_side": args.fee_per_side,
        "months": {"development": dev_months, "validation": valid_month, "test": test_month},
    }
    if selected is not None:
        c = selected["candidate"]
        cfg.update({
            "window_bars": c.window,
            "hold_bars": c.hold,
            "quantile": c.quantile,
            "mode": c.mode,
            "taker_threshold": selected["taker_threshold"],
            "proxy_threshold": selected["proxy_threshold"],
            "validation": asdict(vm),
            "test": asdict(tm),
        })
    out.joinpath("best_config_divergence.json").write_text(json.dumps(safe(cfg), indent=2, allow_nan=False), encoding="utf-8")

    lines = [
        "# SOL/USDT Volume Direction Research — Divergence / Absorption", "",
        "Strong rolling taker flow is tested only when the price-derived volume imbalance points strongly in the opposite direction.",
        "Both interpretations are tested: follow the aggressor (`mode=1`) or fade it as absorption (`mode=-1`).", "",
        f"- Development: {', '.join(dev_months)}",
        f"- Validation: {valid_month}",
        f"- Untouched test: {test_month}",
        f"- Fee per side: {args.fee_per_side:.6f}",
        f"- Status: **{status}**", "",
    ]
    if selected is not None and vm is not None and tm is not None:
        c = selected["candidate"]
        lines += [
            "## Selected rule", "",
            f"- window: {c.window} minutes",
            f"- hold: {c.hold} minutes",
            f"- mode: {'follow taker' if c.mode == 1 else 'fade taker / absorption'}",
            f"- quantile: {c.quantile:.2f}",
            f"- taker threshold: {selected['taker_threshold']:.6f}",
            f"- proxy threshold: {selected['proxy_threshold']:.6f}", "",
            "| split | trades | win rate | expectancy/trade | PF | total return* | max DD* |",
            "|---|---:|---:|---:|---:|---:|---:|",
            f"| validation | {vm.trades} | {pct(vm.win_rate)} | {pct(vm.expectancy)} | {vm.profit_factor:.3f} | {pct(vm.total_return)} | {pct(vm.max_drawdown)} |",
            f"| untouched test | {tm.trades} | {pct(tm.win_rate)} | {pct(tm.expectancy)} | {tm.profit_factor:.3f} | {pct(tm.total_return)} | {pct(tm.max_drawdown)} |",
            "", "\\* additive fixed-notional return", "",
        ]
    lines += [
        "The untouched month is never used for parameter selection. Failure remains a falsification result rather than a reason to retune on that month.",
    ]
    out.joinpath("REPORT_DIVERGENCE.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(safe(cfg), indent=2))
    if status != "PROMISING_OOS":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
