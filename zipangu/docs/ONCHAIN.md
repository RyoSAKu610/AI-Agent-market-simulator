# ⛓ 万華京オンチェーン — Kaleidoscope Zipangu on test networks

Built for Colosseum **Crypto World's Fair** (2026-09-14 → 2026-10-13) on Solana devnet, and now
also on **Robinhood Chain Testnet**, **Arc Testnet** and **Zcash testnet**.

The explorer already runs an autonomous economy: 32 AI agents buy, carry, craft
and sell 136 goods across 81 districts, and settle accounts at 明け六つ / 暮れ六つ
(`js/sim.js`). **Chain mode** turns every one of those decisions into a real
test-network transaction you can watch leave the agent on the map and land in
a block — and lets you hire an agent yourself with an x402-style payment from
your own wallet, in the network's own coin.

## Networks

Pick one on `#/chain`; each keeps its own keys and ledger on this device (`js/networks.js`).

| | Solana devnet | Robinhood Chain Testnet | Arc Testnet | Zcash testnet |
| --- | --- | --- | --- | --- |
| engine | `js/chain.js` | `js/chain-evm.js` | `js/chain-evm.js` | `js/chain-zcash.js` + `js/zcash.js` |
| chain id | — | 46630 | 5042002 | (node must report `chain: "test"`) |
| coin (fees, hires) | SOL (9 decimals) | ETH (18) | USDC (18, native gas) | TAZ (8) |
| KOGANE | SPL token, treasury is every account's delegate | ERC-20 `contracts/Kogane.sol`, treasury is operator | same | none (ZSAs are not deployed): stays in the sim |
| a batch of trades | ≤ 4 SPL transfers + memo | one `batch()`: ≤ 12 moves + `Memo` event | same | one receipt: OP_RETURN memo (≤ 80 bytes), one per block |
| settle / birth | SPL Memo | 0-value self-transaction, memo as UTF-8 calldata | same | OP_RETURN |
| hire (x402-style) | Phantom: SOL + memo | EIP-1193 wallet: ETH + memo calldata | USDC + memo calldata | ZIP 321 QR; a transparent address carries no memo, so the price has a 1–999 zat per-request tag |
| funding | airdrop, Phantom, faucet.solana.com | wallet, faucet.testnet.chain.robinhood.com, Alchemy faucet | wallet, faucet.circle.com | ZIP 321 QR, Valar / jinolabs faucets |
| RPC | api.devnet.solana.com | rpc.testnet.chain.robinhood.com/rpc (+2 fallbacks) | rpc.testnet.arc.io (+2) | the site's relay or your own node |
| explorer | explorer.solana.com (devnet) | explorer.testnet.chain.robinhood.com | explorer.testnet.arc.io | testnet.zcashexplorer.app |

Chain ids, RPCs and explorers are those of ethereum-lists (`eip155-46630`, `eip155-5042002`); the
Zcash consensus branch is read from the node (`getblockchaininfo`) and must be one under which a
v5 transaction is valid (NU5 … NU7; testnet runs NU7 since height 4,465,026).

## Honesty rules (non-negotiable)

1. **Never fake a signature, slot or balance.** Anything shown as on-chain was
   returned by the RPC. Until confirmed it is drawn as *pending*; if it fails it
   is drawn as *failed* with the error. With chain mode off or unreachable the
   UI says `SIM` — it never invents chain data. On Zcash the txid the node
   returns must equal the one computed from the transaction we built.
2. **Test networks only.** No mainnet code path. The EVM engine refuses an RPC and
   a wallet that report any chain id but the test network's (the wallet is also
   given the chain id in `eth_sendTransaction`, so it refuses on any other chain);
   the Zcash engine and the relay refuse a node that is not on the test chain. The
   in-browser keys (treasury, agents, places) are throwaway test keys stored in
   `localStorage` and labelled as such. The user's own wallet is only touched
   through that wallet's own approval prompt.
3. **The sim stays the source of truth.** Chain mode is an append-only receipt
   layer: it reads sim events, it never changes sim state, except one path —
   a *verified* x402 payment queues a request through the existing
   `stories.request()` API, exactly as the request buttons already do.
4. Chain code is lazy-loaded. With chain mode off, the explorer makes no network
   request to any RPC or CDN and the single-file build keeps working offline.

## Model — Solana devnet

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

### `js/chain.js` — Solana devnet engine (no DOM, no rendering)

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

### Every engine also has (`js/chain-evm.js`, `js/chain-zcash.js`, and `js/chain.js`)

```js
//   network                 // the js/networks.js entry
//   balance → number|null   // treasury, in the network's coin (SOL / ETH / USDC / TAZ)
//   setupNeed → number      // what setup (or, on Zcash, going live) needs, same unit
//   hasSetup, canAirdrop, balanceSymbol ('KOGANE' | 'TAZ')
//   contract → string|null  // the KOGANE mint (Solana) or contract (EVM)
//   quote(agentId, requestId) → { status: 402, network, payTo, amount (base units), amountText, memo, uri?, tag? }
//   hire(agentId, { amount?, request, signal? }) → Promise<{ ok, sig?, reason? }>
//   readMemo(txid) → Promise<{ status: 'ok'|'failed'|'pending'|'notfound', memo, slot }>
//   checkFunds()            // after a faucet sent coins: read the balance and continue
//   walletPresent() → bool
//   fundUri(amountText)     // Zcash only: the ZIP 321 request for funding the treasury
```

Shared, pure pieces: `js/chain-core.js` (ops, memo encoding with a byte cap, the batcher, the
ledger plumbing) and `js/chain-read.js` (reading a transaction back on any network with `fetch`
alone, used by birth certificates).

## EVM test networks (Robinhood Chain Testnet, Arc Testnet)

- **KOGANE** is `contracts/Kogane.sol`: an ERC-20 (2 decimals) whose deployer, the treasury, is
  the only minter and the operator that moves balances between the residents' and markets'
  addresses in one `batch(mintTo, mintAmount, from, to, amount, memo)` call, which also emits
  `Memo(memo)`. Holders can transfer their own balance like any ERC-20. `js/kogane.js` holds the
  ABI and bytecode, built by `node tools/kogane-build.mjs --solc <solc 0.8.28>` (optimizer 200,
  EVM paris so every chain runs it, no metadata hash); `--check` (run by the tests) fails if
  `js/kogane.js` was not built from the current source.
- **Setup** = deploy + two mint batches (agents get their sim wallets, markets 1,000,000), then
  live. It is resumable: whoever already holds KOGANE is not minted again.
- **Live**: every 20 s at most one `batch()` of ≤ 12 ops (with a labelled top-up mint when a
  source runs short), settlements as memo-only self-transactions. Below ~1.5M gas worth of coin
  the engine stops writing and says so (`needs-funds`); `checkFunds()` resumes.
- **Hire**: `wallet_switchEthereumChain` (or `wallet_addEthereumChain`) to the test network, then
  `eth_sendTransaction { to: agent, value, data: memo, chainId }`; the engine waits for the
  receipt on *its own* RPC and checks recipient, amount, memo calldata, payer, chain id and status
  (`verifyEvmPayment`) before the sim hears of it.
- **ethers 6.17.0** is loaded from esm.sh / jsDelivr only when chain mode starts; the provider
  refuses JSON-RPC batches and caches nothing, so a balance read right after a payment is fresh.

## Zcash testnet

- **Keys and addresses**: throwaway secp256k1 keys (signing with `@noble/curves` 1.9.7, loaded
  only when chain mode starts) and transparent testnet P2PKH addresses (`tm…`, prefix 0x1d25).
- **Receipts**: `js/zcash.js` builds version-5 transparent transactions (ZIP 225), computes the
  ZIP 244 txid and SIGHASH_ALL digests, pays the ZIP 317 conventional fee (5,000 zat per logical
  action; a receipt with change and an 80-byte memo is 4 actions), and returns the change to the
  treasury. One receipt spends one *confirmed* coin, so at most one receipt per block; trades wait
  in the batcher and are summarised (`zipangu:trade|n=…|v=…`). A receipt not in a block by its
  expiry height (tip + 40) is marked failed and its coin freed.
- **Hire**: the quote is a ZIP 321 URI (and QR) paying the resident 0.001 TAZ plus a 1–999 zat
  tag derived from the request id. The engine looks for a transaction *in a block*, from the block
  the quote was first shown at, that pays the resident exactly that amount and was not used before.
- **Checked offline** (`tools/zcash.test.mjs`): SHA-256, RIPEMD-160 and BLAKE2b against Node and
  Python; base58check against the ZIP 320 vectors and a real testnet address; txid and signature
  digests against the official ZIP 244 vectors (`tools/fixtures/`).

### The relay (`netlify/functions/zipangu-zcash.mjs`)

A page cannot call a Zcash node directly, so it sends JSON-RPC to the site's relay, which forwards
only `getblockchaininfo`, `getaddressbalance`, `getaddressutxos`, `getaddresstxids`,
`getrawtransaction` and `sendrawtransaction` (version-5 only), only for testnet transparent
addresses, rate-limited per visitor, and refuses everything if the node is not on testnet.

| Netlify variable | |
| --- | --- |
| `ZIPANGU_ZCASH_RPC_URL` | JSON-RPC URL of a Zebra (or zcashd / Zaino) node on **testnet**. Without it the relay answers 503 `not_configured`. |
| `ZIPANGU_ZCASH_RPC_HEADER` | optional `Name: value` header the node wants (e.g. a provider's `x-api-key: …`) |
| `ZIPANGU_ZCASH_RPC_AUTH` | optional `user:password` (HTTP basic auth) |
| `ZIPANGU_ZCASH_ORIGINS` | optional extra allowed origins (default: the site and https://ryosaku610.github.io) |

On `#/chain` a visitor can instead give their own node's URL (stored as `zipangu.chain.zcash.rpc`;
https, or http on localhost), e.g. a local Zebra behind a CORS proxy. Such a URL can hold an access
token, so backup files (`js/backup.js`) leave it out; set it again on the new device.

## 📜 Birth certificates (`js/birth.js`, `js/view-birth.js`)

When a visitor brings an AI in (`#/summon`), its soul card is sealed on this
device with a salted SHA-256 commitment:

```
digest = SHA-256("ZIPANGU-BIRTH/1\n" + salt + "\n" + canonicalCard(card))
salt   = 16 random bytes (hex), kept on this device only (localStorage zipangu.births.v1)
memo   = "zipangu:birth|v=1|id=<trav_… random id>|h=<digest>"
```

- **What goes on chain:** only the memo above, on the network chain mode runs on, in a
  memo-only transaction paid by the treasury (`chain.inscribe('birth', memo)`). It needs
  only the fee, so it works before the KOGANE setup; on Solana devnet one airdrop is tried
  if the treasury is empty. On Zcash the memo must fit an OP_RETURN, so it is compact:
  `zipangu:b1|<id>|<base64url digest>` (≤ 73 bytes).
- **What never goes on chain:** the card, its name, or the salt. Because of the
  salt, nobody can test a guessed card against the digest.
- **Verify:** `js/chain-read.js` reads the transaction back from the network the
  certificate was written to (`birth.chain.net`), whichever network chain mode is on now.
  `checkBirthMemo` requires that it succeeded (in a block, on Zcash) and that its memo equals
  that network's memo for the certificate. Only then does the page show ✓.
- **Keep:** "証明書を保存" downloads a JSON file with the canonical card, the salt,
  the digest and the signature. With it, anyone the owner chooses can recompute
  the digest and find the memo on devnet. Sending an AI off deletes the local
  salt; the file still proves the birth.
- **Privacy before sealing:** `soul.js` masks anything that looks private (e-mail,
  phone and card numbers, postal codes, URLs, API keys and tokens, private keys,
  values after "password:") with `［伏せ字］` before a card is shown, saved,
  hashed or sent to a model. Cards saved earlier are masked when read back.

## What was tested, and what was not

- **Solana devnet**: unchanged engine; `tools/chain.test.mjs`.
- **EVM**: `tools/chain-evm.test.mjs` (offline, a stand-in for ethers); and, while building, the
  real engine with real ethers 6.17.0 against a local EVM (ganache) set to chain id 46630 and
  then 5042002: fund from a wallet, deploy, mint, 12-move batches (≈119k gas), top-up mints,
  settle and birth memos, hire with verification, reload, wrong-chain RPC and wallet refused.
- **Zcash**: `tools/zcash.test.mjs` (official vectors) and `tools/chain-zcash.test.mjs` (a
  stand-in Zebra node with a UTXO set, mempool and blocks; the relay's checks); and, while
  building, the engine with the real `@noble/curves` signing, every signature verified against
  our ZIP 244 digest.
- **Browser**: `#/chain` and agent pages in Chromium with the network answered locally: Arc and
  Robinhood flows end to end, Zcash funding QR → live → receipts → hire QR → verified, a birth
  certificate inscribed on Arc and verified again while chain mode was on Zcash; 1280×800 and 390×844.
- **Not run**: the live testnets themselves (the development container could not reach them).
  Watch the first live run of each network, especially the public RPCs' CORS and rate limits, and
  the Zcash node's mempool policy for OP_RETURN receipts.
