// #/bench — 🏆 人間らしさランキング: how much each player's choices look like people's
// (js/bench.js, bench/README.md). The board is bench/leaderboard.json, built by
// `node tools/bench.mjs board`; results come from people who ran the benchmark.
import { h, clear } from './util.js';
import { plaque, sectionHead, progressBar } from './components.js';
import { t } from './i18n.js';
import { BENCH_VERSION } from './bench.js';

const REPO = 'https://github.com/RyoSAKu610/AI-Agent-market-simulator';

export function benchView(ctx) {
    const status = h('div', { class: 'bench-status' });
    const board = h('div', { class: 'research-table bench-board' });
    const f = (v, d = 2) => (v == null ? '—' : Number(v).toFixed(d));

    function paint(data) {
        const sets = (data && data.sets) || [];
        const n = sets.reduce((s, x) => s + (x.n || 0), 0), donors = sets.reduce((s, x) => s + (x.donors || 0), 0);
        const target = (data && data.target) || 300;
        clear(status).append(
            h('p', { class: 'eyebrow' }, t('bench.collected')),
            h('h2', null, t('bench.count', { n, target })),
            progressBar(Math.min(1, n / target), t('bench.collected')),
            h('p', { class: 'ar-role' }, n < target ? t('bench.growing', { donors }) : t('bench.ready', { donors })),
            h('p', { class: 'mind-actions' },
                h('a', { class: 'btn btn-primary', href: '#/agents' }, t('bench.decide')),
                h('a', { class: 'btn', href: '#/settings' }, t('bench.donate'))));
        clear(board);
        const rows = (data && data.entries) || [];
        if (!rows.length) { board.append(h('p', { class: 'ar-role' }, t('bench.empty'))); return; }
        board.append(h('table', null,
            h('thead', null, h('tr', null, ...['#', t('bench.player'), t('bench.score'), 'κ', t('bench.accuracy'), t('bench.mix'), 'n', ''].map(x => h('th', { scope: 'col' }, x)))),
            h('tbody', null, rows.map((r, i) => h('tr', { class: r.baseline ? 'is-baseline' : '' },
                h('td', null, r.baseline ? '—' : String(rows.filter(x => !x.baseline).indexOf(r) + 1)),
                h('th', { scope: 'row' }, r.name, r.model && r.model !== r.name ? h('small', null, ` ${r.model}`) : null, r.baseline ? h('small', null, ` (${t('bench.baseline')})`) : null),
                h('td', null, f(r.score, 1), r.ci ? h('small', null, ` [${f(r.ci[0], 1)}–${f(r.ci[1], 1)}]`) : null),
                h('td', null, f(r.kappa)), h('td', null, r.accuracy == null ? '—' : Math.round(r.accuracy * 100) + '%'), h('td', null, f(r.mix)),
                h('td', null, String(r.n)), h('td', null, r.verified ? '✓' : ''))))));
    }

    const el = h('div', { class: 'page page-narrow page-bench' },
        h('header', { class: 'page-head' }, h('h1', null, t('bench.title')), h('p', { class: 'lead' }, t('bench.lead'))),
        h('section', { class: 'sec', 'aria-labelledby': 'bn-status' }, sectionHead(t('bench.statusTitle'), '', 'bn-status'), plaque({ class: 'settings-card' }, status)),
        h('section', { class: 'sec', 'aria-labelledby': 'bn-board' }, sectionHead(t('bench.boardTitle'), BENCH_VERSION, 'bn-board'), plaque({ class: 'settings-card' }, board)),
        h('section', { class: 'sec', 'aria-labelledby': 'bn-how' }, sectionHead(t('bench.howTitle'), '', 'bn-how'),
            plaque({ class: 'settings-card' },
                h('p', null, t('bench.how')),
                h('ul', { class: 'decide-list' },
                    h('li', null, h('b', null, 'κ — '), t('bench.kappa')),
                    h('li', null, h('b', null, t('bench.mix') + ' — '), t('bench.mixHelp')),
                    h('li', null, h('b', null, t('bench.top1') + ' — '), t('bench.top1Help')),
                    h('li', null, h('b', null, t('bench.score') + ' — '), t('bench.scoreHelp'))))),
        h('section', { class: 'sec', 'aria-labelledby': 'bn-join' }, sectionHead(t('bench.joinTitle'), '', 'bn-join'),
            plaque({ class: 'settings-card' },
                h('ol', { class: 'decide-list' },
                    h('li', null, t('bench.join1')),
                    h('li', null, t('bench.join2'), h('pre', { class: 'donate-preview' }, 'node tools/bench.mjs run --set bench/sets/<set>.dev.jsonl \\\n  --player llm --base <OpenAI互換URL> --model <model> \\\n  --name "<表示名>" --out bench/results/<name>.json')),
                    h('li', null, t('bench.join3'), ' ', h('a', { href: REPO + '/tree/main/zipangu/bench', target: '_blank', rel: 'noopener noreferrer' }, 'zipangu/bench'))),
                h('p', { class: 'ar-role' }, t('bench.rules')))));

    paint(null);
    fetch('bench/leaderboard.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).then(d => paint(d)).catch(() => paint(null));
    return { el, title: t('bench.title') };
}
