from __future__ import annotations

import argparse
import io
import json
import math
import urllib.parse
import urllib.request
import zipfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd

from sol_volume_alert.flow import add_flow_features


BINANCE_VISION = "https://data.binance.vision/data/futures/um/monthly/klines"
FAPI_KLINES = "https://fapi.binance.com/fapi/v1/klines"
COLUMNS = [
    "open_time", "open", "high", "low", "close", "volume",
    "close_time", "quote_volume", "trades", "taker_buy_base",
    "taker_buy_quote", "ignore",
]


@dataclass(frozen=True)
class Candidate:
    window: int
    hold: int
    quantile: float
    mode: int  # +1 continuation, -1 fade


@dataclass
class Metrics:
    trades: int
    win_rate: float
    expectancy: float
    profit_factor: float
    max_drawdown: float
    total_return: float
    break_even_extra_cost_per_side: float


def month_range(start: str, end: str) -> list[str]:
    p = pd.period_range(start=start, end=end, freq="M")
    return [str(x) for x in p]


def fetch_month(symbol: str, month: str, cache: Path) -> pd.DataFrame:
    cache.mkdir(parents=True, exist_ok=True)
    zip_path = cache / f"{symbol}-1m-{month}.zip"
    url = f"{BINANCE_VISION}/{symbol}/1m/{symbol}-1m-{month}.zip"
    raw = None
    if not zip_path.exists():
        try:
            urllib.request.urlretrieve(url, zip_path)
        except Exception:
            # A completed month can briefly be absent from Vision. Fall back to
            # the public futures REST endpoint rather than changing the split.
            zip_path.unlink(missing_ok=True)
    if zip_path.exists():
        with zipfile.ZipFile(zip_path) as zf:
            members = [n for n in zf.namelist() if n.endswith(".csv")]
            if len(members) != 1:
                raise RuntimeError(f"unexpected archive contents: {members}")
            raw = zf.read(members[0])

    if raw is not None:
        first = raw.splitlines()[0].decode("utf-8", errors="replace")
        has_header = not first.split(",", 1)[0].strip().isdigit()
        df = pd.read_csv(io.BytesIO(raw), header=0 if has_header else None)
        if has_header:
            df = df.iloc[:, :12]
            df.columns = COLUMNS
        else:
            df.columns = COLUMNS
    else:
        period = pd.Period(month, freq="M")
        start_ms = int(period.start_time.tz_localize("UTC").timestamp() * 1000)
        end_ms = int(period.end_time.tz_localize("UTC").timestamp() * 1000)
        rows = []
        cursor = start_ms
        while cursor <= end_ms:
            query = urllib.parse.urlencode({
                "symbol": symbol,
                "interval": "1m",
                "startTime": cursor,
                "endTime": end_ms,
                "limit": 1000,
            })
            with urllib.request.urlopen(f"{FAPI_KLINES}?{query}", timeout=30) as resp:
                chunk = json.load(resp)
            if not chunk:
                break
            rows.extend(chunk)
            next_cursor = int(chunk[-1][0]) + 60_000
            if next_cursor <= cursor:
                raise RuntimeError("Binance pagination did not advance")
            cursor = next_cursor
        df = pd.DataFrame(rows, columns=COLUMNS)

    for c in ["open", "high", "low", "close", "volume", "taker_buy_base"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["open_time"] = pd.to_numeric(df["open_time"], errors="coerce")
    df = df.dropna(subset=["open_time", "open", "close", "volume"])
    df["open_time"] = df["open_time"].astype("int64")
    if int(df["open_time"].iloc[0]) > 10**14:
        df["open_time"] = df["open_time"] // 1000
    df["ts"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
    df["month"] = df["ts"].dt.tz_convert(None).dt.to_period("M").astype(str)
    return df.sort_values("open_time").reset_index(drop=True)


def load_months(symbol: str, months: Iterable[str], cache: Path) -> pd.DataFrame:
    frames = [fetch_month(symbol, m, cache) for m in months]
    out = pd.concat(frames, ignore_index=True)
    out = out.drop_duplicates("open_time", keep="last").sort_values("open_time")
    return out.reset_index(drop=True)


def candidate_grid() -> list[Candidate]:
    # Search lattice, not a trading assumption. Values span short intraday horizons.
    windows = [2, 4, 8, 16, 32, 64]
    holds = [1, 2, 4, 8, 16, 32]
    quantiles = [0.50, 0.60, 0.70, 0.80, 0.90, 0.95]
    modes = [1, -1]
    return [Candidate(w, h, q, m) for w in windows for h in holds for q in quantiles for m in modes]


def build_trades(
    df: pd.DataFrame,
    candidate: Candidate,
    threshold: float,
    fee_per_side: float,
) -> pd.DataFrame:
    x = add_flow_features(df, candidate.window)
    imb = x["imbalance"]
    raw_side = np.where(imb >= threshold, 1, np.where(imb <= -threshold, -1, 0))
    raw_side = raw_side * candidate.mode

    entries: list[dict] = []
    i = max(candidate.window, 1)
    n = len(x)
    while i + 1 + candidate.hold < n:
        side = int(raw_side[i])
        if side == 0:
            i += 1
            continue
        entry_i = i + 1
        exit_i = entry_i + candidate.hold
        entry = float(x.iloc[entry_i]["open"])
        exit_ = float(x.iloc[exit_i]["open"])
        gross = side * (exit_ / entry - 1.0)
        net = gross - (2.0 * fee_per_side)
        entries.append({
            "signal_time": x.iloc[i]["ts"],
            "entry_time": x.iloc[entry_i]["ts"],
            "exit_time": x.iloc[exit_i]["ts"],
            "side": side,
            "imbalance": float(imb.iloc[i]),
            "entry": entry,
            "exit": exit_,
            "gross_return": gross,
            "net_return": net,
        })
        i = exit_i
    return pd.DataFrame(entries)


def metrics(trades: pd.DataFrame, fee_per_side: float) -> Metrics:
    if trades.empty:
        return Metrics(0, float("nan"), float("nan"), 0.0, 0.0, 0.0, float("nan"))
    r = trades["net_return"].to_numpy(float)
    gross = trades["gross_return"].to_numpy(float)
    wins = r[r > 0]
    losses = r[r < 0]
    pf = wins.sum() / abs(losses.sum()) if losses.size else float("inf")
    equity = np.cumsum(r)
    with_zero = np.r_[0.0, equity]
    peak = np.maximum.accumulate(with_zero)
    dd = with_zero - peak
    be = max(0.0, float(gross.mean()) / 2.0 - fee_per_side)
    return Metrics(
        trades=int(r.size),
        win_rate=float((r > 0).mean()),
        expectancy=float(r.mean()),
        profit_factor=float(pf),
        max_drawdown=float(dd.min()),
        total_return=float(r.sum()),
        break_even_extra_cost_per_side=be,
    )


def infer_threshold(train: pd.DataFrame, candidate: Candidate) -> float:
    feat = add_flow_features(train, candidate.window)
    vals = feat["imbalance"].abs().dropna()
    if vals.empty:
        return float("nan")
    return float(vals.quantile(candidate.quantile))


def score_candidate(
    train: pd.DataFrame,
    dev_months: list[str],
    candidate: Candidate,
    fee_per_side: float,
) -> dict:
    threshold = infer_threshold(train, candidate)
    if not np.isfinite(threshold):
        return {"candidate": candidate, "threshold": threshold, "median_expectancy": -np.inf, "months": []}
    month_metrics = []
    for m in dev_months:
        d = train[train["month"] == m].copy()
        t = build_trades(d, candidate, threshold, fee_per_side)
        mm = metrics(t, fee_per_side)
        month_metrics.append({"month": m, **asdict(mm)})
    finite = [x["expectancy"] for x in month_metrics if np.isfinite(x["expectancy"])]
    med = float(np.median(finite)) if finite else -np.inf
    return {"candidate": candidate, "threshold": threshold, "median_expectancy": med, "months": month_metrics}


def diagnostics(df: pd.DataFrame, window: int) -> dict:
    f = add_flow_features(df, window)
    pair = f[["imbalance", "actual_taker_imbalance"]].dropna()
    corr = float(pair.corr().iloc[0, 1]) if len(pair) > 2 else float("nan")
    directional = float((f["directional_volume"] > 0).mean())
    flat_share = float(f["flat_volume"].sum() / f["volume"].sum()) if f["volume"].sum() else float("nan")
    return {
        "proxy_vs_actual_taker_imbalance_corr": corr,
        "bars_with_directional_assignment_share": directional,
        "flat_volume_share_excluded": flat_share,
    }


def fmt_pct(x: float) -> str:
    return "n/a" if not np.isfinite(x) else f"{x * 100:.4f}%"


def write_report(
    out_dir: Path,
    symbol: str,
    dev_months: list[str],
    valid_month: str,
    test_month: str,
    selected: dict | None,
    validation: Metrics | None,
    test: Metrics | None,
    diag: dict | None,
    fee_per_side: float,
    status: str,
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    lines = [
        "# SOL/USDT Volume-Direction Research Report",
        "",
        f"- Symbol: `{symbol}` USDⓈ-M perpetual",
        "- Base hypothesis: price up => all volume Vkb; price down => all volume Vks; unchanged => excluded.",
        "- Execution: signal on bar close, entry on next bar open; one position at a time.",
        f"- Fee model: `{fee_per_side:.6f}` per side (configurable).",
        f"- Development months: {', '.join(dev_months)}",
        f"- Validation month: {valid_month}",
        f"- Untouched test month: {test_month}",
        f"- Result status: **{status}**",
        "",
    ]
    if selected is not None:
        c: Candidate = selected["candidate"]
        lines += [
            "## Selected rule", "",
            f"- rolling window: {c.window} minute bars",
            f"- holding period: {c.hold} minute bars",
            f"- threshold training quantile: {c.quantile:.2f}",
            f"- learned |imbalance| threshold: {selected['threshold']:.6f}",
            f"- mode: {'continuation' if c.mode == 1 else 'fade'}", "",
        ]
    if validation is not None and test is not None:
        lines += [
            "## Out-of-sample performance", "",
            "| split | trades | win rate | expectancy/trade | PF | total return* | max DD* | extra cost/side to break even |",
            "|---|---:|---:|---:|---:|---:|---:|---:|",
            f"| validation | {validation.trades} | {fmt_pct(validation.win_rate)} | {fmt_pct(validation.expectancy)} | {validation.profit_factor:.3f} | {fmt_pct(validation.total_return)} | {fmt_pct(validation.max_drawdown)} | {fmt_pct(validation.break_even_extra_cost_per_side)} |",
            f"| untouched test | {test.trades} | {fmt_pct(test.win_rate)} | {fmt_pct(test.expectancy)} | {test.profit_factor:.3f} | {fmt_pct(test.total_return)} | {fmt_pct(test.max_drawdown)} | {fmt_pct(test.break_even_extra_cost_per_side)} |",
            "", "\\* Additive fixed-notional return, not leveraged account equity.", "",
        ]
    if diag:
        lines += [
            "## Proxy diagnostic", "",
            f"- Correlation, inferred imbalance vs Binance taker imbalance: `{diag['proxy_vs_actual_taker_imbalance_corr']:.4f}`",
            f"- Bars receiving directional assignment: `{diag['bars_with_directional_assignment_share']:.4f}`",
            f"- Volume excluded because close was unchanged: `{diag['flat_volume_share_excluded']:.4f}`", "",
        ]
    lines += [
        "## Interpretation", "",
        "The tool does not promote a parameter set merely because it wins in development data.",
        "A rule must have positive expectancy and profit factor above 1 in the separate validation month before it is evaluated as a candidate for live alerts.",
        "The final test month is never used to select parameters. If the untouched test fails, status is `NO_ROBUST_EDGE` and live alerts remain disabled by default.", "",
        "This is research infrastructure, not a guarantee of profit. Market regime changes, latency, spread, slippage, funding, and venue differences can erase an observed edge.",
    ]
    (out_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def json_safe(value):
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    if isinstance(value, (np.floating, float)):
        v = float(value)
        return v if math.isfinite(v) else None
    if isinstance(value, (np.integer, int)):
        return int(value)
    return value


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--symbol", default="SOLUSDT")
    p.add_argument("--start-month", required=True, help="YYYY-MM")
    p.add_argument("--end-month", required=True, help="YYYY-MM")
    p.add_argument("--fee-per-side", type=float, default=0.0005)
    p.add_argument("--cache", default=".cache/binance")
    p.add_argument("--out", default="reports")
    args = p.parse_args()

    months = month_range(args.start_month, args.end_month)
    if len(months) < 6:
        raise SystemExit("Need at least 6 complete calendar months: 4 development + 1 validation + 1 untouched test.")
    months = months[-6:]
    dev_months, valid_month, test_month = months[:4], months[4], months[5]
    df = load_months(args.symbol, months, Path(args.cache))
    dev = df[df["month"].isin(dev_months)].copy()
    valid = df[df["month"] == valid_month].copy()
    test = df[df["month"] == test_month].copy()

    rows = [score_candidate(dev, dev_months, c, args.fee_per_side) for c in candidate_grid()]
    viable_dev = [r for r in rows if np.isfinite(r["median_expectancy"]) and r["median_expectancy"] > 0]
    viable_dev.sort(key=lambda r: r["median_expectancy"], reverse=True)

    selected = None
    validation_metrics = None
    test_metrics = None
    diag = None
    status = "NO_ROBUST_EDGE"

    for r in viable_dev:
        t = build_trades(valid, r["candidate"], r["threshold"], args.fee_per_side)
        vm = metrics(t, args.fee_per_side)
        if vm.trades and vm.expectancy > 0 and vm.profit_factor > 1:
            selected = r
            validation_metrics = vm
            break

    if selected is not None:
        tt = build_trades(test, selected["candidate"], selected["threshold"], args.fee_per_side)
        test_metrics = metrics(tt, args.fee_per_side)
        diag = diagnostics(test, selected["candidate"].window)
        if test_metrics.trades and test_metrics.expectancy > 0 and test_metrics.profit_factor > 1:
            status = "PROMISING_OOS"

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([{
        "window": r["candidate"].window,
        "hold": r["candidate"].hold,
        "quantile": r["candidate"].quantile,
        "mode": r["candidate"].mode,
        "threshold": r["threshold"],
        "dev_median_expectancy": r["median_expectancy"],
    } for r in rows]).to_csv(out / "candidate_scores.csv", index=False)

    active = {
        "status": status,
        "symbol": args.symbol,
        "fee_per_side": args.fee_per_side,
        "months": {"development": dev_months, "validation": valid_month, "test": test_month},
    }
    if selected is not None:
        active.update({
            "window_bars": selected["candidate"].window,
            "hold_bars": selected["candidate"].hold,
            "threshold": selected["threshold"],
            "mode": selected["candidate"].mode,
            "validation": asdict(validation_metrics),
            "test": asdict(test_metrics),
            "diagnostics": diag,
        })
    (out / "best_config.json").write_text(json.dumps(json_safe(active), indent=2, allow_nan=False), encoding="utf-8")
    write_report(out, args.symbol, dev_months, valid_month, test_month, selected, validation_metrics, test_metrics, diag, args.fee_per_side, status)
    print(json.dumps(json_safe(active), indent=2))
    if status != "PROMISING_OOS":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
