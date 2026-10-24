// ⛓ The networks chain mode can run on (docs/ONCHAIN.md). Test networks only: every entry is a
// devnet or testnet whose coins have no value, and nothing here knows a mainnet. The EVM engine
// refuses an RPC or a wallet that reports any other chain id; the Zcash engine refuses a node
// that is not on the test chain.
//
// Pure data and small helpers; importing this file does nothing.

export const NETWORK_KEY = 'zipangu.chain.net';
export const DEFAULT_NETWORK = 'solana-devnet';

// The Zcash testnet JSON-RPC relay (netlify/functions/zipangu-zcash.mjs). GitHub Pages has no
// functions, so the page calls the Netlify build of the same site; on Netlify it is same-origin.
export const ZCASH_RELAY = 'https://neonmyths.netlify.app/.netlify/functions/zipangu-zcash';

export const NETWORKS = Object.freeze({
    'solana-devnet': {
        id: 'solana-devnet', family: 'solana', kind: 'devnet', name: 'Solana devnet', short: 'DEVNET',
        currency: { symbol: 'SOL', name: 'devnet SOL', decimals: 9, unit: 'lamports' },
        token: 'KOGANE', tokenKind: 'SPL',
        rpc: ['https://api.devnet.solana.com'],
        explorer: { home: 'https://explorer.solana.com/?cluster=devnet', tx: 'https://explorer.solana.com/tx/{id}?cluster=devnet', addr: 'https://explorer.solana.com/address/{id}?cluster=devnet' },
        faucets: [{ label: 'faucet.solana.com', url: 'https://faucet.solana.com/' }],
        airdrop: true,
        wallet: { kind: 'phantom', name: 'Phantom', url: 'https://phantom.app/' },
        hire: { amount: '10000000', text: '0.01' },        // base units (lamports)
        fund: { text: '0.5' },
        flushMs: 2500, maxOps: 4, memoBytes: 400,
        storageKey: 'zipangu.chain.v1'
    },
    'robinhood-testnet': {
        id: 'robinhood-testnet', family: 'evm', kind: 'testnet', name: 'Robinhood Chain Testnet', short: 'ROBINHOOD',
        chainId: 46630,
        currency: { symbol: 'ETH', name: 'Robinhood Chain Testnet ETH', decimals: 18, unit: 'wei' },
        token: 'KOGANE', tokenKind: 'ERC-20',
        rpc: ['https://rpc.testnet.chain.robinhood.com/rpc', 'https://robinhood-sepolia-rpc.publicnode.com', 'https://robinhood-testnet.drpc.org'],
        explorer: { home: 'https://explorer.testnet.chain.robinhood.com', tx: 'https://explorer.testnet.chain.robinhood.com/tx/{id}', addr: 'https://explorer.testnet.chain.robinhood.com/address/{id}' },
        faucets: [
            { label: 'faucet.testnet.chain.robinhood.com', url: 'https://faucet.testnet.chain.robinhood.com/' },
            { label: 'Alchemy faucet', url: 'https://www.alchemy.com/faucets/robinhood-testnet' }
        ],
        airdrop: false,
        wallet: { kind: 'eip1193', name: 'MetaMask などの EVM ウォレット', url: 'https://metamask.io/' },
        hire: { amount: '100000000000000', text: '0.0001' },   // 1e14 wei
        fund: { text: '0.002' },
        flushMs: 20000, maxOps: 12, memoBytes: 400,
        storageKey: 'zipangu.chain.robinhood-testnet.v1'
    },
    'arc-testnet': {
        id: 'arc-testnet', family: 'evm', kind: 'testnet', name: 'Arc Testnet', short: 'ARC',
        chainId: 5042002,
        // Arc's gas token is USDC. The native balance has 18 decimals; the ERC-20 view of the same
        // USDC (0x3600…0000) has 6. Everything here is native, so 18.
        currency: { symbol: 'USDC', name: 'Arc Testnet USDC', decimals: 18, unit: 'wei' },
        token: 'KOGANE', tokenKind: 'ERC-20',
        rpc: ['https://rpc.testnet.arc.io', 'https://arc-testnet.drpc.org', 'https://rpc.quicknode.testnet.arc.io'],
        explorer: { home: 'https://explorer.testnet.arc.io', tx: 'https://explorer.testnet.arc.io/tx/{id}', addr: 'https://explorer.testnet.arc.io/address/{id}' },
        faucets: [{ label: 'faucet.circle.com', url: 'https://faucet.circle.com/' }],
        airdrop: false,
        wallet: { kind: 'eip1193', name: 'MetaMask などの EVM ウォレット', url: 'https://metamask.io/' },
        hire: { amount: '10000000000000000', text: '0.01' },   // 0.01 USDC at 18 decimals
        fund: { text: '2' },
        flushMs: 20000, maxOps: 12, memoBytes: 400,
        storageKey: 'zipangu.chain.arc-testnet.v1'
    },
    'zcash-testnet': {
        id: 'zcash-testnet', family: 'zcash', kind: 'testnet', name: 'Zcash testnet', short: 'ZCASH',
        currency: { symbol: 'TAZ', name: 'testnet ZEC (TAZ)', decimals: 8, unit: 'zatoshi' },
        // Zcash has no tokens yet (ZSAs are not deployed), so trades are written as receipts:
        // transparent transactions whose OP_RETURN output carries the memo.
        token: null, tokenKind: null,
        rpc: [ZCASH_RELAY],
        explorer: { home: 'https://testnet.zcashexplorer.app/', tx: 'https://testnet.zcashexplorer.app/transactions/{id}', addr: 'https://testnet.zcashexplorer.app/address/{id}' },
        faucets: [
            { label: 'faucet.testnet.valargroup.dev', url: 'https://faucet.testnet.valargroup.dev/' },
            { label: 'zcashfaucet.jinolabs.xyz', url: 'https://zcashfaucet.jinolabs.xyz/' }
        ],
        airdrop: false,
        wallet: { kind: 'zip321', name: 'Zcash testnet ウォレット（ZIP-321 の QR）', url: 'https://z.cash/wallets/' },
        hire: { amount: '100000', text: '0.001' },             // zatoshis; a request tag of 1–999 zats is added
        fund: { text: '0.05' },
        flushMs: 30000, maxOps: 60, memoBytes: 80,
        storageKey: 'zipangu.chain.zcash-testnet.v1'
    }
});

export const NETWORK_IDS = Object.keys(NETWORKS);
export const isNetwork = id => Object.prototype.hasOwnProperty.call(NETWORKS, id);
export const networkOf = id => NETWORKS[isNetwork(id) ? id : DEFAULT_NETWORK];

const fill = (template, id) => template.replace('{id}', encodeURIComponent(String(id)));
export const explorerTxOf = (net, id) => fill(networkOf(net).explorer.tx, id);
export const explorerAddrOf = (net, id) => fill(networkOf(net).explorer.addr, id);

// Base units (a string, number or BigInt of the smallest unit) → a decimal string, without the
// rounding a Number would add: 1e16 wei on Arc → "0.01".
export function formatUnits(units, decimals) {
    let v;
    try { v = BigInt(units); } catch { return '—'; }
    const neg = v < 0n; if (neg) v = -v;
    const s = v.toString().padStart(decimals + 1, '0');
    const whole = s.slice(0, s.length - decimals), frac = s.slice(s.length - decimals).replace(/0+$/, '');
    return (neg ? '-' : '') + whole + (frac ? '.' + frac : '');
}
// A decimal string → base units as a BigInt; null when it is not a plain non-negative decimal or
// has more fractional digits than the currency can hold.
export function parseUnits(text, decimals) {
    const m = /^\s*(\d{1,30})(?:\.(\d+))?\s*$/.exec(String(text ?? ''));
    if (!m || (m[2] && m[2].length > decimals)) return null;
    return BigInt(m[1] + (m[2] || '').padEnd(decimals, '0'));
}
export const amountText = (net, units) => `${formatUnits(units, networkOf(net).currency.decimals)} ${networkOf(net).currency.symbol}`;

// What an EVM wallet needs to add the network (EIP-3085 wallet_addEthereumChain).
export function addChainParams(net) {
    const n = networkOf(net);
    if (n.family !== 'evm') return null;
    return {
        chainId: '0x' + n.chainId.toString(16), chainName: n.name,
        nativeCurrency: { name: n.currency.name, symbol: n.currency.symbol, decimals: n.currency.decimals },
        rpcUrls: [n.rpc[0]], blockExplorerUrls: [n.explorer.home]
    };
}
