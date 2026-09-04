# SOL/USDT Volume Direction Alert Lab

This subproject implements and falsifies the volume rule supplied for SOL/USDT:

- if price rises, assign the entire observed volume to `Vkb` (buy-side inferred volume)
- if price falls, assign the entire observed volume to `Vks` (sell-side inferred volume)
- if price is unchanged, exclude that volume from the directional calculation
- `Vk = Vkb + Vks` for directionally assigned volume

It deliberately starts with that simple rule before adding any more market-microstructure assumptions.

## What is implemented

1. **Historical research on Binance SOLUSDT USDⓈ-M perpetual 1-minute data**
   - public Binance Vision monthly archives with public REST fallback
   - no API key required
   - kline volume is directionally reclassified using the rule above
   - Binance's `taker_buy_base` field is retained only as a diagnostic comparator; it is not used to create the inferred signal

2. **No-lookahead backtest**
   - signal is computed only after minute `t` closes
   - entry occurs at minute `t+1` open
   - one position at a time
   - long and short are tested
   - both continuation and fade interpretations are tested

3. **Out-of-sample gate**
   - latest six requested complete calendar months are used
   - first four: development / parameter selection
   - fifth: validation filter
   - sixth: untouched final test
   - a configuration is marked `PROMISING_OOS` only when validation and untouched test both retain positive expectancy and profit factor > 1 after fees
   - otherwise the tool exits with `NO_ROBUST_EDGE`; this is intentional

4. **Live alert engine**
   - consumes Binance USDⓈ-M `SOLUSDT@aggTrade`
   - reconstructs 1-minute bars and applies the exact same price-change volume rule as research
   - emits rolling `Vkb`, `Vks`, ratios and imbalance
   - refuses to produce trade alerts unless the config status is `PROMISING_OOS`
   - emits JSON to stdout and optionally an HTTP webhook
   - **never places an order**

## Research model

For a rolling window:

```text
B = Σ Vkb
S = Σ Vks
imbalance = (B - S) / (B + S)
buy_ratio  = B / (B + S)
sell_ratio = S / (B + S)
```

The trigger magnitude is learned from the development data as a quantile of `|imbalance|`, rather than hard-coding a claim that a specific threshold is profitable.

## Cost model

The default research fee is `0.0005` per side, matching the Binance regular-user USDT futures taker fee shown in Binance's fee schedule when this tool was created. It is a CLI parameter because actual VIP level, BNB discount, venue, maker/taker mix and promotions may differ.

No arbitrary slippage number is inserted into the headline result. Instead the report calculates **break-even extra execution cost per side**: the additional symmetric spread/slippage cost that would reduce observed mean expectancy to zero.

Funding is not yet modeled. This first contract is an intraday alert study; if a surviving configuration's holding horizon makes funding material, adding actual funding history becomes necessary before live use.

## Run locally

```bash
cd sol-volume-alert
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=src

python -m sol_volume_alert.research \
  --start-month 2026-03 \
  --end-month 2026-08 \
  --fee-per-side 0.0005 \
  --out reports
```

Outputs:

- `reports/REPORT.md`
- `reports/candidate_scores.csv`
- `reports/best_config.json`

The command exits with code `2` when the untouched test does not confirm an edge. That is a research result, not a software-runtime failure.

## Live alerts

Only after `reports/best_config.json` says `"status": "PROMISING_OOS"`:

```bash
export PYTHONPATH=src
python -m sol_volume_alert.live --config reports/best_config.json
```

Optional webhook:

```bash
export ALERT_WEBHOOK_URL='https://your-webhook.example/path'
python -m sol_volume_alert.live --config reports/best_config.json
```

Alert fields include JST time, price, `Vkb`, `Vks`, buy/sell ratio, imbalance, direction, reason, research holding horizon, validation expectancy, final-test expectancy and final-test PF.

## Interpretation

A profitable in-sample result is not enough. The tool's default behavior is to **disable** live alerts if the untouched period does not confirm the edge.

Even `PROMISING_OOS` is not a profit guarantee. Latency, spread, slippage, funding, liquidation risk, exchange access rules and regime changes can remove the historical edge. Keep this as an alert/research system until paper/live-forward results confirm execution quality.
