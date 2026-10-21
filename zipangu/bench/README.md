# 🏆 人間らしさランキング（Zipangu Human-likeness Bench, `zhb-1`）

人が住人の代わりに決めた場面（🙋 あなたが決める）を、AI に **まったく同じ言葉** で問い、どれだけ人と同じように
選ぶかで順位をつけます。基準は、同意のうえ寄付された（🤝、`docs/DATA.md`）本物の人の選択です。ページ：`#/bench`。

## 1. 問題（item）

1件 = 人が決めた1回の場面です。

```json
{ "id": "i3f2a…", "agent": "chomei",
  "situation": { "day": 2, "label": "暁七つ", "sekki": "立夏", "at": "…", "wallet": 22360, "cargo": [] },
  "options": [ { "n": 1, "kind": "craft", "text": "作って売る：ここで…（見込みの儲け 3,757刻、およそ2刻）", "score": 1.1, "profit": 3757 }, … ],
  "human": 5, "thought": "…", "donor": "d-…" }
```

- 候補は、ルールの評価の高い順に並んでいます（1番＝ルールの第一候補）。
- モデルへの問いかけは、街の住人に使っている `js/mind.js` の `buildPrompt` そのものです（住人の人物像つき）。
  `recent`（最近のこと）は空にしています。

## 2. 採点

| 指標 | 意味 |
|---|---|
| κ（カッパ） | 人と同じ候補を選んだ割合を、でたらめに選んだ場合（各問題 1/候補数）との差で正規化（0＝でたらめ並み、1＝常に一致） |
| 行動の混ざり方の差 | 仕入れ・売り・細工・見物・仕事・休みの選び方の分布の Jensen–Shannon 距離（0＝同じ） |
| 「第一候補」好みの差 | 1番（儲け最大）を選ぶ割合の、人との差 |
| **人間らしさ** | 100 × 平均（max(κ, 0)、1 − 混ざり方の差、1 − 第一候補の差） |

- 95% 区間は問題のブートストラップ（500回、種固定）。
- 参考に β（合理性、`fitBeta`）も結果ファイルに残します。
- 基準線として「ルール（常に1番）」と「ランダム」も同じ問題で採点して載せます。

## 3. セット

- `bench/sets/vN.dev.jsonl`：公開（寄付者単位で約3割）。手元での確認・開発用。
- `vN.test.jsonl`：**非公開**（残り約7割）。順位は運営がこちらで採点し直した値（✓）を正とします。
- 同じ寄付者の問題は必ず同じ側に入ります（`splitByDonor`）。

運営の作り方：

```bash
node tools/bench.mjs build <寄付の保管庫>/donations --out bench/sets/v1 --dev 0.3 --seed 1
node tools/bench.mjs run --set bench/sets/v1.dev.jsonl --player rules  --out bench/results/rules.json
node tools/bench.mjs run --set bench/sets/v1.dev.jsonl --player random --out bench/results/random.json
node tools/bench.mjs board bench/results --out bench/leaderboard.json
```

## 4. 参加のしかた

```bash
cd zipangu
# OpenAI 互換の URL ならどれでも（Ollama、OpenRouter、vLLM、LM Studio …）
export ZIPANGU_LLM_KEY=...        # 必要なときだけ。ファイルには書かない
node tools/bench.mjs run --set bench/sets/v1.dev.jsonl --player llm \
     --base https://openrouter.ai/api/v1 --model qwen/qwen-2.5-72b-instruct \
     --name "Qwen2.5-72B（素のまま）" --rpm 20 --out bench/results/qwen-2.5-72b.json
```

結果ファイル（`bench/results/*.json`）をプルリクエストで送ってください。運営が非公開の test セットで同じモデルを
採点し直し、`"verified": true` を付けて掲載します。

### ルール

- 問いかけ（プロンプト）は変えない。変えたい場合は別部門（今後追加）で。
- test セットで学習しない。人の答えを見て調整しない。
- データは CC BY-NC 4.0（非営利）。商用の評価に使う場合は運営に相談。

## 5. 限界（論文に書くこと）

- 基準は「寄付してくれた人たち」の選択で、人間一般の代表ではありません。人数・属性を必ず併記します。
- 1つの場面に人の答えは1つだけです。人どうしでも選択は揺れるので、満点（100）は現実的な上限ではありません。
  同じ場面を複数人が解いたデータが集まれば「人どうしの一致率」を上限の目安として示します。
- 指標は選択の **表面の似かた** を測るもので、内面や意識の近さを示すものではありません。

---

**English summary.** `zhb-1` puts moments where a person decided for a resident to any model, worded
exactly as the city words them, and scores how human-like its choices are: chance-corrected agreement (κ),
the action-mix distance, and the first-candidate gap, averaged into a 0–100 score with a bootstrap 95%
interval. The rules and a random chooser are scored as baselines. Public dev items are published; the
held-back test set is scored by maintainers. Data: CC BY-NC 4.0.

## Maintainer verification

Participant result files are untrusted input: a `verified` field inside a result JSON is ignored. After re-running a model on the held-back test set, a maintainer can create an exact result key with:

```bash
node tools/bench.mjs verify-key bench/results/verified-test-result.json
```

Add the printed string as one `key` entry in `bench/verified.json` in a maintainer-controlled change, then rebuild the board. The verification key includes the result's set identity, model identity, metrics and confidence interval; changing those fields invalidates the approval. Keep test-set files and raw test results out of public pull requests.

The `--dev` split requires a donor ID for every item. Raw research-log JSONL does not carry donor IDs and is rejected for donor-level dev/test splitting; build a combined set without `--dev`, or use consented donation files with donor IDs.
