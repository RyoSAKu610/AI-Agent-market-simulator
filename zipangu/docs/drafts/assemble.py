#!/usr/bin/env python3
"""Assemble the zipangu-build-world workflow result into zipangu/world/*.json and docs."""
import json, sys, re
from pathlib import Path

D = Path(__file__).resolve().parent  # zipangu/docs/drafts
Z = D.parent.parent
result_file = Path(sys.argv[1])
raw = json.loads(result_file.read_text())
res = raw.get('result', raw)
units, econ = res['units'], res['econ']
spine = json.loads((Z / 'docs' / 'spine.json').read_text())
report = []

def merge(key):
    out, seen = [], {}
    for u in units:
        for x in u.get(key, []):
            if x['id'] in seen:
                report.append(f'duplicate {key} id {x["id"]} in {u["unit"]} (kept {seen[x["id"]]})')
                continue
            seen[x['id']] = u['unit']
            out.append(x)
    return out

eras = sorted([p['data'] for u in units for p in u['places'] if p['type'] == 'era'], key=lambda e: e.get('order', 99))
realms = [p['data'] for u in units for p in u['places'] if p['type'] == 'realm']
districts, goods, creatures = merge('districts'), merge('goods'), merge('creatures')
agents, events, library = merge('agents'), merge('events'), merge('library')
D = {d['id']: d for d in districts}; G = {g['id']: g for g in goods}
A = {a['id']: a for a in agents}; V = {v['id']: v for v in events}

# economy integration
for o in econ.get('price_overrides', []):
    if o['good'] in G: G[o['good']]['base_price'] = o['base_price']
    else: report.append(f'price override for unknown good {o["good"]}')
for o in econ.get('district_demands_add', []):
    d = D.get(o['district'])
    if not d: report.append(f'demands for unknown district {o["district"]}'); continue
    for g in o['goods']:
        if g in G and g not in d['demands'] and G[g]['origin'] != d['id']: d['demands'].append(g)
        elif g not in G: report.append(f'unknown demanded good {g} at {d["id"]}')
for o in econ.get('agent_updates', []):
    a = A.get(o['agent'])
    if not a: report.append(f'update for unknown agent {o["agent"]}'); continue
    a['favored_goods'] += [g for g in o.get('favored_goods_add', []) if g in G and g not in a['favored_goods']]
    a['routines'] += [r for r in o.get('routines_add', []) if r not in a['routines']]
for o in econ.get('event_effects_add', []):
    v = V.get(o['event'])
    if not v: report.append(f'effects for unknown event {o["event"]}'); continue
    have = {e['good'] for e in v['effects']}
    v['effects'] += [e for e in o['effects'] if e['good'] in G and e['good'] not in have]
routes = [r for r in econ.get('trade_routes', []) if r['from'] in D and r['to'] in D]
for r in routes: r['goods'] = [g for g in r['goods'] if g in G]
report += [f'dropped route {r["id"]}' for r in econ.get('trade_routes', []) if r not in routes]

hub = D.get('kokurin_hiroba')
world = {k: spine[k] for k in ['title_ja', 'title_en', 'tagline', 'premise', 'how_eras_coexist', 'style_guide', 'visual_identity', 'signature_experiences']}
world['hub'] = {'id': 'kokurin_hiroba', 'name_ja': hub['name_ja'] if hub else spine['hub']['name_ja'], 'name_en': hub['name_en'] if hub else 'Kokurin Plaza', 'description': spine['hub']['description']}
world['economy_overview'] = econ.get('economy_overview', '')
world['trade_routes'] = routes

W = Z / 'world'
texts_path = W / 'library.texts.json'
texts = json.loads(texts_path.read_text()) if texts_path.exists() else {}
if texts.get('source') == 'fixture' or not texts:
    texts = {'source': '青空文庫 https://www.aozora.gr.jp/ — public-domain texts; credits per work', 'generated_at': None, 'works': {}}
for name, data in [('world', world), ('eras', eras), ('realms', realms), ('districts', districts), ('creatures', creatures),
                   ('goods', goods), ('currencies', econ['currencies']), ('agents', agents), ('events', events), ('library', library),
                   ('library.texts', texts)]:
    (W / f'{name}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

# chapters and the fact-check log
kinds = {e['id']: 'eras' for e in eras} | {r['id']: 'realms' for r in realms}
for u in units:
    for c in u.get('chapters', []):
        kind = kinds.get(c['place_id'])
        if not kind: report.append(f'chapter for unknown place {c["place_id"]}'); continue
        (Z / 'docs' / kind / f'{c["place_id"]}.md').write_text(c['markdown'].rstrip() + '\n')
log = ['# 考証記録（Fact-check log）', '',
       '各時片・異界の草稿を、史実・文学（著作権）・データ仕様・文体の四つの観点で校閲したときの修正記録です。', '']
for u in units:
    if not u.get('corrections'): continue
    log.append(f'## {u["unit"]}'); log.append('')
    for c in u['corrections']:
        log.append(f'- **{c["where"]}** — {c["was"]} → {c["now"]}（{c["why"]}）')
    log.append('')
(Z / 'docs' / 'CORRECTIONS.md').write_text('\n'.join(log))
print('\n'.join(report) or 'no assembly issues')
print(f'{len(eras)} eras, {len(realms)} realms, {len(districts)} districts, {len(creatures)} creatures, {len(goods)} goods, '
      f'{len(agents)} agents, {len(events)} events, {len(library)} works, {len(routes)} routes, '
      f'{sum(len(u.get("corrections", [])) for u in units)} corrections')
