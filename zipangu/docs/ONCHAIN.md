# ⛓ 万華京オンチェーン — Kaleidoscope Zipangu on Solana devnet

Built for Colosseum **Crypto World's Fair** (2026-09-14 → 2026-10-13).

The explorer already runs an autonomous economy: 32 AI agents buy, carry, craft
and sell 136 goods across 81 districts, and settle accounts at 明け六つ / 暮れ六つ
(`js/sim.js`). **Chain mode** turns every one of those decisions into a real
Solana devnet transaction you can watch leave the agent on the map and land in
a block — and lets you hire an agent yourself with an x402-style payment from
Phantom.

## Honesty rules (non-negotiable)

1. **Never fake a signature, slot or balance.** Anything shown as on-chain was
   returned by the RPC. Until confirmed it is drawn as *pending*; if it fails it
   is drawn as *failed* with the error. With chain mode off or unreachable the
   UI says `SIM` — it never invents chain data.
2. **Devnet only.** Hard-coded cluster `devnet`; no mainnet code path. The
   in-browser keys (treasury, agents, places) are throwaway devnet keys stored in
   `localStorage` and labelled as such. The user's own wallet is only touched
   through Phantom's own approval prompt.
3. **The sim stays the source of truth.** Chain mode is an append-only receipt
   layer: it reads sim events, it never changes sim state, except one path —
   a *verified* x402 payment queues a request through the existing
   `stories.request()` API, exactly as the request buttons already do.
4. Chain code is lazy-loaded. With chain mode off, the explorer makes no network
   request to any RPC or CDN and the single-file build keeps working offline.

## Model

| Sim concept | On-chain object |
| --- | --- |
| base currency 光金 | SPL token **KOGANE** (2 decimals) — mint authority = treasury |
| the world engine | **treasury** keypair: fee payer, mint authority, delegate |
| each agent (32) | keypair + KOGANE ATA; ATA approves treasury as delegate |
| each era / realm market (18) | "place vault" keypair + KOGANE ATA; same delegate approval |
| `trade` buy / craft | transfer agent ATA → vault of the district's era/realm |
| `trade` sell | transfer vault → agent ATA |
| `settle` (明け六つ / 暮れ六つ) | memo-only tx: day, sales, volume, top earner |
| user hires agent (x402) | user's Phantom → agent address, SOL + memo `zipangu:x402:<requestId>` |

Every chain tx carries an SPL Memo (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`)
whose text starts with `zipangu:` so the whole world history is filterable on
an explorer.

Setup (one click, ~0.15 devnet SOL from the treasury): create mint, create 50
ATAs, approve delegate, mint each agent its current sim wallet and each vault
1,000,000 KOGANE of liquidity. Balances then drift from the sim only by
rounding; if a source account is short, the tx includes a labelled
`mintTo` top-up so receipts never silently drop.

## Module contracts

### `js/chain.js` — engine (no DOM, no rendering)

```js
export const CLUSTER = 'devnet';
export function explorerTx(sig)  → string  // https://explorer.solana.com/tx/<sig>?cluster=devnet
export function explorerAddr(a)  → string
export function createChain(W, eco, { storage = localStorage, rpc = 'https://api.devnet.solana.com', loadLib } = {})
// → Chain {
//   state: 'off' | 'loading' | 'needs-funds' | 'setting-up' | 'live' | 'error'
//   error: string | null
//   treasury: string | null          // base58, after enable()
//   treasuryLamports: number | null
//   mint: string | null
//   addressOf(id) → string | null     // agent id or place id → owner pubkey (base58)
//   ataOf(id) → string | null
//   txs: ChainTx[]                    // newest first, capped at 300, persisted (sig/status only)
//   stats: { confirmed, failed, pending, volume /* KOGANE moved, confirmed only */, since /* ms */ }
//   enable()           → Promise     // lazy-load libs, load or create keys, read balance; state → needs-funds | setting-up | live
//   requestAirdrop()   → Promise<{ok, reason?}>
//   fundFromWallet(sol)→ Promise<{ok, sig?, reason?}>   // Phantom (devnet) → treasury
//   setup()            → Promise     // idempotent; resumes a half-finished setup
//   disable()                        // stop listening, keep keys
//   balanceOf(id)      → Promise<number|null>          // KOGANE ui amount, via RPC
//   hire(agentId, { lamports, request }) → Promise<{ok, sig?, reason?}>
//        // x402-style: 402 quote → Phantom signAndSend → confirm → verify on-chain
//        // (amount, recipient, memo) → stories.request(...) by the caller's callback
//   on(type, fn)       // 'tx' (ChainTx changed), 'state', 'hire'
//   reset()            // forget keys (devnet throwaway) after confirm()
// }
// ChainTx = { id, kind: 'trade'|'settle'|'setup'|'fund'|'hire',
//             status: 'queued'|'sent'|'confirmed'|'failed',
//             sig: string|null, slot: number|null, error: string|null,
//             ops: [{ action, agent, district, place, good, qty, amount }],   // what the memo says
//             memo: string, at: number /* Date.now() */ }
```

Batching and limits: trade ops queue and flush every ~2.5 s into one tx of at
most 4 transfers (one memo); at most one tx in flight; queue cap 60 — beyond it,
ops for the same (agent, place) are merged and the memo says `batched`. Retries:
one retry on blockhash expiry, then `failed`.

### `js/chain-fx.js` — map overlay (pure drawing)

```js
export function attachChainFx(chain)                // subscribe to 'tx'
export function drawChainFx(ctx, api, t)
// api = { sx, sy, S, agentPos(id) → {x,y}|null, placePos(id) → {x,y}|null, night }
// pending: hollow gold coin travelling agent → place (or place → agent for sells)
// confirmed: solid coin + glint, ring pulse at the place, tiny "⛓" tag that fades
// failed: red coin that drops and fades. settle: gold bell ring at the hub.
// Draws nothing when chain.state !== 'live'. Respects prefers-reduced-motion (static glyphs).
```

### UI

- HUD chip: `⛓ SIM` / `⛓ DEVNET LIVE · 128 tx · 9,410 KOGANE` → opens `#/chain`.
- `#/chain` ledger: enable / fund / setup wizard, treasury + mint links, live tx
  list (status, kind, memo summary, slot, explorer link), and the honesty rules.
- Agent page / panel: address, on-chain KOGANE balance (RPC), explorer link,
  and **雇う (x402)** — shows the HTTP-402-style quote, pays via Phantom, waits
  for verification, then queues the request and the agent visibly sets off.
- Feed lines from `trade` get a ⛓ link once their tx confirms.

## 📜 Birth certificates (`js/birth.js`, `js/view-birth.js`)

When a visitor brings an AI in (`#/summon`), its soul card is sealed on this
device with a salted SHA-256 commitment:

```
digest = SHA-256("ZIPANGU-BIRTH/1\n" + salt + "\n" + canonicalCard(card))
salt   = 16 random bytes (hex), kept on this device only (localStorage zipangu.births.v1)
memo   = "zipangu:birth|v=1|id=<trav_… random id>|h=<digest>"
```

- **What goes on chain:** only the memo above, in a memo-only devnet transaction
  paid by the treasury (`chain.inscribe('birth', memo)`). It needs only the fee, so
  it works before the KOGANE setup; if the treasury is empty, one devnet airdrop
  is tried first.
- **What never goes on chain:** the card, its name, or the salt. Because of the
  salt, nobody can test a guessed card against the digest.
- **Verify:** `chain.parsedTx(sig)` reads the transaction back from the RPC.
  `checkBirthTx` requires that it succeeded and that its memo equals the
  certificate's memo. Only then does the page show ✓.
- **Keep:** "証明書を保存" downloads a JSON file with the canonical card, the salt,
  the digest and the signature. With it, anyone the owner chooses can recompute
  the digest and find the memo on devnet. Sending an AI off deletes the local
  salt; the file still proves the birth.
- **Privacy before sealing:** `soul.js` masks anything that looks private (e-mail,
  phone and card numbers, postal codes, URLs, API keys and tokens, private keys,
  values after "password:") with `［伏せ字］` before a card is shown, saved,
  hashed or sent to a model. Cards saved earlier are masked when read back.
