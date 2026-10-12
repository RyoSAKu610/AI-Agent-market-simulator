# Crypto World's Fair — submission draft

> 提出ポータル（colosseum.com → Crypto World's Fair → Submit）に貼る下書き。
> 締切 **2026-10-13 06:59 UTC（日本時間 10/13 15:59）**。提出はチームリーダーが行う。
> `[要記入]` はあなたにしか書けない欄。数字は実機で確認してから入れる（盛らない）。

## Product name
Kaleidoscope Zipangu — 万華京ジパング (an AI-agent economy you can watch settle on Solana)

## One-liner
32 autonomous AI agents trade across an alternate-history Japan, and every buy, sell and
daily settlement is a real Solana devnet transaction you can watch fly across the map and
open on the explorer. You can hire an agent yourself with an x402-style payment from Phantom.

## What are you building?
Agent payment rails are arriving (x402, agentic commerce), but nobody can *see* what an
agent does with money. Logs and dashboards don't build trust; watching does.

Kaleidoscope Zipangu is a living world where AI agents run the economy on their own:
they read local prices, plan cross-era arbitrage, travel trade routes, craft goods and
settle accounts at dawn and dusk. In chain mode each of those decisions becomes an SPL
token (KOGANE) transfer on Solana devnet with a `zipangu:` memo describing what the agent
did and why. A gold coin leaves the agent on the map when the tx is sent, lands when
the RPC confirms it, and the feed line links to the explorer. Nothing is simulated on the
chain side: unconfirmed is shown as pending, failures as failed, and with chain mode off
the UI says SIM.

Humans can step in: open an agent, get an HTTP-402-style quote, pay from Phantom, and
the agent only accepts the job after the payment is verified on-chain (recipient, amount,
memo). Then you watch it set off.

## Why now?
Agent-to-agent and machine payments are becoming standard (x402, MCP payment middleware),
and teams are starting to give agents wallets. The missing piece is observability that
ordinary people understand: a place where an agent's economic behaviour, over days, is
visible, auditable on-chain and fun to watch.

## Insight / why us
[要記入: あなた自身の視点。例: 前回Frontierの Agent Arcade で「短いデモではエージェントは強く見えるが、
長期・複数ステップ・支払いが絡むと信頼できない」と分かった → 今回は「見えること」と「チェーン上の領収書」
で信頼を作る、という流れ。]

## Blockchains & tools
- Solana devnet — SPL Token (KOGANE mint, ATAs, delegate approvals), SPL Memo, System Program
- @solana/web3.js 1.98, @solana/spl-token 0.4 (loaded only when chain mode is on)
- Phantom (user funding + x402-style hire)
- Vanilla ES modules + Canvas 2D (no build step), GitHub Pages
- Built with Claude Code; researched with Colosseum Copilot

## Technical architecture (short)
See `zipangu/docs/ONCHAIN.md`. Treasury keypair = fee payer, mint authority and delegate
for 32 agent ATAs + 18 market vaults, so a single signature settles up to 4 agent
transfers + memo per tx. Sim stays the source of truth; the chain is an append-only
receipt layer. Devnet only, throwaway in-browser keys, honest pending/failed states.

## Links
- GitHub: https://github.com/RyoSAKu610/AI-Agent-market-simulator (folder `zipangu/`)
- Live: https://ryosaku610.github.io/AI-Agent-market-simulator/zipangu/#/chain  [デプロイ後に確認]
- Pitch video (≤3 min): [要記入]
- Technical demo (≤3 min): [要記入]

## Team / location
[要記入] — Tokyo, Japan

## Traction / market validation
None yet — this is a hackathon prototype on devnet. [あれば要記入。無ければ正直に無しと書く]

## Monetization (hypothesis)
[要記入: 例: エージェント開発者向けの「観測できるサンドボックス」（自分のエージェントを
この世界に入れて長期の経済行動をテストし、オンチェーン記録で評価）を有料にする]

---

## 3分デモ台本（technical demo）
1. 0:00 地図。エージェントが ！→💭→🏃 で交易路を走る（SIM表示）。
2. 0:20 `#/chain` → 起動 → 資金（Phantom 0.5 devnet SOL）→ 開設（mint + 50 ATA を explorer で見せる）。
3. 0:50 地図に戻る。売買のたびに金貨が飛び、確定で着地・波紋・⛓。feed の ⛓ → explorer で memo を見せる。
4. 1:40 エージェントを開く → 雇う (x402) → 402見積 → Phantom承認 → 検証済 ✓ → エージェントが走り出す。
5. 2:30 明け六つ／暮れ六つの決算 memo（鐘）。台帳で、確定した tx の件数と KOGANE 総量を見せる。
6. 2:50 誠実さのルール（devnet、偽の署名は出さない、off のときは SIM）で締める。
