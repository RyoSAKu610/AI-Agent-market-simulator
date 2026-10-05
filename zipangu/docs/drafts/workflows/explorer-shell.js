export const meta = {
  name: 'zipangu-explorer-shell',
  description: 'Build the Kaleidoscope Zipangu explorer shell on the finished engines, then visual + functional QA and fixes',
  phases: [
    { title: 'Shell', detail: 'map.js, app.js, index.html, style.css, build-single.mjs' },
    { title: 'QA', detail: 'visual/UX critic and functional/perf critic' },
    { title: 'Fix', detail: 'apply QA findings' },
  ],
}

// Absolute path of the repository checkout (edit if yours differs).
const REPO = '/home/user/AI-Agent-market-simulator'

const Z = REPO + '/zipangu'
const G = REPO + '/zipangu/docs/drafts/briefs/_global.json'
const SHOTS = '/tmp/'
const BROWSER = `To look at your work in a real browser: serve the directory with \`python3 -m http.server PORT --directory ${Z}\` (run it in the background), then use Playwright from Node with \`NODE_PATH=$(npm root -g)\` and \`chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })\`. Take screenshots at 390×844 (deviceScaleFactor 2) and 1280×800 into ${SHOTS} and LOOK at them with the Read tool; iterate until they are genuinely beautiful. Capture console errors and page errors; there must be none. External fonts may fail to load in this sandbox (proxy certificate) — expected; always provide a system-font fallback. Kill your server when done.`
const COMMON = `Project: "NEON MYTHOS 万華京ジパング" — an alternate-history Japan wonderland (10 eras + 8 literary/mythic realms) where AI agents run the economy autonomously. Read ${Z}/js/INTERFACES.md (binding module contracts), ${Z}/SPEC.md (data shapes), ${Z}/AGENTS.md (rules) and the "visual_identity" and "style_guide" fields of ${G}. ${Z}/world/*.json is the REAL world content (Japanese). Never hard-code ids, counts or names. Visual direction: ネオン万華鏡×日本工芸 — deep indigo (never flat black), lamplight gold (never garish), structural-colour iridescence (玉虫・螺鈿・宝石蝶), a jewel butterfly somewhere on every screen. Vanilla ES modules only, no npm packages, no build step. Code quality: small clear functions, comments only where the why is not obvious.`

const ENGINES = `Finished engines (do not rewrite them; read their exports before using them):
- js/creature-art.js: exports SHAPES, drawCreature(ctx, creature, t, size), creatureCanvas(creature, size, {animate}). Renders every kind/shape/pattern beautifully (jewel butterflies with perspective wing beats, iridescence, stained glass, crystal facets, phosphor scales; fish, jellyfish, birds, beasts incl. cloud whale, dragons, plants, spirits, minerals). Shared rAF loop, IntersectionObserver, reduced-motion aware, per-creature static-layer cache.
- js/data.js: loadWorld(base) (fetch or window.__ZIPANGU_WORLD__), buildWorld(raw) → World with byId maps (era, realm, place, district, creature, good, currency, agent, event, work), placeOf(id), baseCurrency, plus W.places, W.districtsIn(placeId), W.textOf(workId).
- js/sim.js: createEconomy(W, {seed, secondsPerDay=240, startSekki=4, state}) per INTERFACES.md, plus exports clockAt, KOKU_LABELS, SEKKI, VIA (Japanese label, speed, fare per route mode), GOAL_LABELS; economy also exposes time, stats, seed, priceOf and richer clock fields (dawn, dusk, season). One game day = one 節気 (a year = 24 days). Agents decide on their own from prices, fares, events, goals and personality; stages react→think→travel/trade. Feed messages are Japanese one-liners. tools/sim.test.mjs passes.`

phase('Shell')
const shell = await agent(`${COMMON}

${ENGINES}

YOUR TASK: build the explorer people will actually SEE and EXPERIENCE:
- ${Z}/js/map.js per INTERFACES.md: the kaleidoscope map. Eras sit as kaleidoscope shards around the hub (positions from each place's map {x,y} — 0–100 coordinates), coloured by their aesthetic.palette; realms glow at the rim with their own character; districts as small lit glyphs; trade routes (world.trade_routes) as animated light threads styled per via (銀河鉄道 = starry rail visible at night, 蝶道 = dotted butterfly trail, 鳥居 = vermilion dashes, 蜘蛛糸 = fine silver vertical thread, 押絵 = flicker, 方丈 = slow capsule, 玉虫車 = green-gold streak, 烏飛脚 = small wing marks); agents as luminous chips with names that show ！ then 💭 then 🏃 while reacting/thinking/travelling, moving smoothly; jewel butterflies and other creatures drifting over their home districts using creature-art; a day/night wash from the economy clock (明け六つ dawn sweep, 逢う刻 lantern light). Pan, pinch/wheel zoom, tap to select. Smooth on a phone.
- ${Z}/js/app.js + ${Z}/index.html + ${Z}/style.css: routes and views from INTERFACES.md. HUD with a 万世時計 dial (十二支 ring, 不定時法 hand, phase label, 節気) and a live feed of sim events; a base-currency ticker. Place view: hero with palette gradient and a fluttering butterfly, divergence (【史実】 and 【創作】 visibly distinguished), cascade as a timeline, alt-present wonders, signature tech, districts (landmarks, what they make and want), creatures (creature-art cards), agents (live activity from the sim), books, events, and the chapter from ${Z}/docs/eras|realms/<id>.md rendered as prose when present (fetch it; minimal markdown: headings, paragraphs, lists, bold). Bestiary: filterable grid of animated creature cards (kind, place, rarity) and a creature detail page with large art, description, ecology, lore, behaviour, what it produces. Library: works by place with in-world role; if the work's text has status "ok" show the excerpt with 青空文庫 credits (底本/入力/校正) and the card link, else show "青空文庫から抜粋予定" with a short reason. Market: prices per district with sparklines and arbitrage hints, the four currencies. Agents: roster with goal type, progress, wallet, current stage; agent detail with routines, ambitions and relationships. About: premise, how eras coexist, the trade rules, the charter, and the 考証記録 link (${Z}/docs/CORRECTIONS.md).
- Frames inspired by 算額/絵馬 plaques, mincho headings (Google Fonts "Shippori Mincho", serif fallback), "DotGothic16" for HUD numerals (monospace fallback). Respect prefers-reduced-motion. Accessible: semantic HTML, focus styles, aria-labels for canvases, sufficient contrast.
- ${Z}/tools/build-single.mjs: writes ${Z}/dist/zipangu-single.html with every world/*.json inlined as window.__ZIPANGU_WORLD__ (library.texts.json → key "texts"), every chapter markdown inlined, every js module and the css inlined, so the whole explorer works from one file with no network (Google Fonts link may stay external). Add dist/ to ${Z}/.gitignore.
- Start the economy on load (seed from ?seed= or 1) at a pleasant pace (one in-world day ≈ 4 real minutes; speed control 1×/4×/16×). Persist nothing that breaks if storage is unavailable.
- Add js/map.js and js/app.js syntax to ${Z}/tools/check.sh only if not already covered (it checks js/*.js).
${BROWSER} Use port 8812. Check every route at both sizes. Return a report with screenshot paths.`, { label: 'shell', phase: 'Shell', effort: 'high' })

phase('QA')
const FINDINGS = { type: 'object', required: ['findings'], properties: { findings: { type: 'array', items: { type: 'object', required: ['severity', 'area', 'problem', 'evidence', 'fix'], properties: {
  severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, area: { type: 'string' }, problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } } } } } }
const critics = await parallel([
  () => agent(`${COMMON}

You are a demanding art director and UX critic. The explorer in ${Z} is built. Experience it as a first-time visitor on a phone (390×844, deviceScaleFactor 2) and on desktop (1280×800): every route, tap the map, open places, creatures, library, market, agents. ${BROWSER} Use port 8813.
Judge against the visual direction and the owner's wish ("ロマンに溢れた", "ワンダーランドを見たり体験できる", "宝石のような美しい蝶", AI agents visibly running the economy on their own). Report concrete findings with screenshot evidence: anything ugly, cramped, illegible, confusing, empty-looking, off-palette, janky, or not beautiful enough; especially the map, the butterflies, and whether the autonomous economy is legible. Do NOT edit files.`, { label: 'critic:visual', phase: 'QA', schema: FINDINGS }),
  () => agent(`${COMMON}

You are a meticulous QA engineer. Test the explorer in ${Z} for correctness and robustness: console/page errors on every route; broken links; data edge cases (every creature renders; works with and without texts; places with no books; empty lists); the sim running 10+ in-world days at 16× without NaN, stalls or runaway prices; frame time on the map with all agents and creatures; offscreen canvases not leaking when navigating between routes; keyboard navigation and focus; reduced motion; dist/zipangu-single.html (after node tools/build-single.mjs) working from a file:// URL with no network; bash tools/check.sh passing. ${BROWSER} Use port 8814. Report concrete findings with evidence. Do NOT edit files.`, { label: 'critic:qa', phase: 'QA', schema: FINDINGS }),
])
const findings = critics.filter(Boolean).flatMap(c => c.findings)
log(`${findings.length} findings: ${findings.filter(f => f.severity === 'blocker').length} blocker, ${findings.filter(f => f.severity === 'major').length} major`)

phase('Fix')
const fix = findings.length ? await agent(`${COMMON}

${ENGINES}

Apply these QA findings to the explorer in ${Z}. Fix every blocker and major; fix minors when cheap. Never simplify the creature renderer or reduce visual richness to fix performance — make it faster instead. Re-verify each fix in the browser (${BROWSER} Use port 8815) and re-run bash tools/check.sh and node tools/build-single.mjs. Return what you fixed and anything you could not.

Findings:
${JSON.stringify(findings)}`, { label: 'fix', phase: 'Fix', effort: 'high' }) : 'no findings'

return { shell, findings, fix }
