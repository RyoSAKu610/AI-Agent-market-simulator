// 江戸前 Edomae — what each resident looks like in ink, derived deterministically
// from the agent (id, sprite_hint words) and the era of its home place.
// Pure: no DOM, no imports, so Node tests load it as is.
//
// Faceless figures (style guide): character comes from garment, hair, hat, prop
// and one flat accent colour, never from a face.

function hash01(...parts) {
    let x = 0x811c9dc5;
    for (const ch of parts.join('|')) { x ^= ch.codePointAt(0); x = Math.imul(x, 0x01000193); }
    x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b);
    x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
}
const pick = (arr, u) => arr[Math.min(arr.length - 1, Math.floor(u * arr.length))];

// Colour words in the sprite hints → flat, slightly muted ink-friendly colours.
// Longer words first so 海老茶 is not read as 茶, 濃紺 not as 紺.
export const COLOUR_WORDS = [
    ['海老茶', '#6e3430'], ['濃紺', '#24304f'], ['からし', '#c49a2c'], ['臙脂', '#7a2e3a'], ['珊瑚', '#d9725e'],
    ['生成り', '#e6dcc4'], ['白銅', '#c3beb0'], ['赤褐', '#9c5538'], ['墨染', '#3b3a40'], ['なよ竹', '#a9b98a'],
    ['萌黄', '#93a85a'], ['淡金', '#d8c27a'], ['藍', '#34507a'], ['紺', '#2b3a5e'], ['紫', '#6a4a8a'], ['檜', '#c49a6c'],
    ['白', '#ece6d8'], ['黒', '#2c2a2a'], ['朱', '#b3412d'], ['紅', '#b8323a'], ['藤', '#9b87c4'], ['橙', '#d9813a'],
    ['金', '#c9a23a'], ['銀', '#a8adb5'], ['茶', '#7a5a3c']
];

// garment keyword → garment kind (first that occurs wins)
const GARMENTS = [
    ['袴', 'hakama'], ['狩衣', 'robe'], ['袿', 'robe'], ['十徳', 'robe'], ['土偶', 'dogu'], ['和紙を折った', 'paper'],
    ['法被', 'short'], ['半纏', 'short'], ['作務衣', 'short'], ['筒袖', 'short'], ['作業着', 'coat'], ['ジャケット', 'coat'],
    ['服', 'coat'], ['着流し', 'kimono'], ['小袖', 'kimono'], ['着物', 'kimono'], ['銘仙', 'kimono'], ['打掛', 'kimono'],
    ['羽織', 'kimono'], ['合羽', 'kimono'], ['簡素な衣', 'robe']
];
const BY_FAMILY = {
    jomon: ['robe', 'short'], heian: ['robe', 'kimono'], hiraizumi: ['robe', 'kimono'], sengoku: ['short', 'kimono', 'hakama'],
    edo: ['kimono', 'short'], meiji: ['coat', 'hakama'], taisho: ['coat', 'hakama', 'kimono'], showa: ['coat', 'short'],
    reiwa: ['coat', 'short', 'kimono'], ginga: ['coat'], ihatov: ['coat', 'short'], tono: ['short', 'kimono'],
    sakura: ['kimono'], ryugu: ['kimono', 'robe'], tsuki: ['robe', 'kimono'], tenshu: ['kimono', 'hakama'], yume: ['robe', 'short']
};
const HATS = [
    ['三度笠', 'kasa'], ['烏帽子', 'eboshi'], ['飛行帽', 'flightcap'], ['ほおかむり', 'hokamuri'], ['鉢巻', 'hachimaki'],
    ['頭に手ぬぐい', 'hachimaki'], ['耳当て', 'earmuffs'], ['歯車を重ねた', 'gearhead'], ['遮光器', 'goggles'], ['折り鶴', 'origami']
];
const HAIRS = [['おかっぱ', 'bob'], ['切りそろえ', 'bob'], ['総髪', 'tied'], ['長い黒髪', 'long'], ['水引のあわじ結び', 'bun'], ['簪', 'bun'], ['髪留め', 'bun']];
const PROPS = [
    ['天秤棒', 'carry'], ['盆', 'tray'], ['算盤', 'abacus'], ['提灯', 'lantern'], ['竿', 'pole'], ['指し棒', 'pole'],
    ['天秤', 'scales'], ['玉手箱', 'box'], ['お手玉', 'ball'], ['帳面', 'book'], ['大原簿', 'book'], ['図面', 'scroll'],
    ['巻物を一本', 'scroll'], ['マイク', 'mic'], ['槌', 'hammer'], ['鎚', 'hammer'], ['彫刻刀', 'hammer'], ['絵筆', 'brush'],
    ['匙', 'brush'], ['杼', 'brush'], ['鍵', 'keys'], ['郵便鞄', 'satchel'], ['結縄の束', 'cords']
];
const PATTERNS = [['矢絣', 'arrows'], ['縞', 'stripes'], ['筋', 'stripes'], ['絣', 'kasuri'], ['星', 'stars'], ['稲妻', 'bolts'], ['雪華', 'snow'], ['縄目', 'spiral']];

const pattern0 = text => firstOf(text, PATTERNS);
const firstOf = (text, table) => {
    let best = null, at = Infinity;
    for (const [word, value] of table) { const i = text.indexOf(word); if (i >= 0 && i < at) { at = i; best = value; } }
    return best;
};
const has = (text, ...words) => words.some(w => text.includes(w));

// All colour words in order of appearance: [{ word, hex, at }]
function coloursIn(text) {
    const out = [];
    for (const [word, hex] of COLOUR_WORDS) {
        let i = text.indexOf(word);
        while (i >= 0) {
            // skip a shorter word inside a longer one already found (紺 in 濃紺)
            if (!out.some(c => i >= c.at && i < c.at + c.word.length)) out.push({ word, hex, at: i });
            i = text.indexOf(word, i + 1);
        }
    }
    return out.sort((a, b) => a.at - b.at);
}

const MUTED = ['#5a6b7a', '#7a5a4a', '#56705a', '#8a6a3a', '#6a5a7a', '#7a4a4a', '#4a5a6a', '#8a7a5a'];

// agent: world agent def; place: its home era/realm; family: layout family of that place.
export function lookOf(agent, place, family = 'reiwa') {
    const id = String(agent && agent.id || 'x');
    const text = String(agent && agent.sprite_hint || '') + ' ' + String(agent && agent.name || '');
    const u = k => hash01(id, k);

    let garment = text.includes('袴') ? 'hakama' : firstOf(text, GARMENTS) || pick(BY_FAMILY[family] || ['kimono', 'coat'], u('garment'));
    const colours = coloursIn(text);
    const hexAccent = (text.match(/#[0-9A-Fa-f]{6}/) || [null])[0];
    const palette = (place && place.aesthetic && place.aesthetic.palette) || [];
    const apronWord = text.match(/(\S{0,3})の前掛け/);
    const apron = apronWord ? ((coloursIn(apronWord[1])[0] || {}).hex || '#2b3a5e') : (has(text, '革の前掛け') ? '#7a5a3c' : null);
    // main colour: the colour word nearest before the garment word; else the first; else a muted pick
    const gWord = GARMENTS.find(([w]) => text.includes(w));
    const gAt = gWord ? text.indexOf(gWord[0]) : -1;
    const near = colours.filter(c => gAt < 0 || (c.at < gAt + 2 && gAt - c.at < 14)).pop();
    const usable = colours.filter(c => c.word !== '金' || garment !== 'hakama');
    let main = (near || usable[0] || {}).hex || pick(MUTED, u('main'));
    if (apron && main === apron && colours.length > 1) main = colours.find(c => c.hex !== apron)?.hex || main;
    const rest = colours.filter(c => c.hex !== main && c.hex !== apron);
    const sub = garment === 'hakama' ? ((colours.find(c => /海老茶|紺|黒/.test(c.word) && c.hex !== main) || {}).hex || '#6e3430')
        : (rest[0] || {}).hex || pick(['#2c2a2a', '#b3412d', '#c9a23a', '#34507a', '#7a2e3a'], u('sub'));
    if (garment === 'hakama' && main === sub) main = (colours.find(c => c.hex !== sub) || {}).hex || (pattern0(text) === 'arrows' ? '#6a4a8a' : '#ece6d8');
    const momo = text.match(/(\S{0,3})の股引/);
    const legs = momo ? ((coloursIn(momo[1])[0] || {}).hex || '#2b3a5e') : garment === 'short' ? pick(['#2b3a5e', '#3b3a40', '#4a4038'], u('legs')) : sub;
    const accent = hexAccent || (rest[1] || rest[0] || {}).hex || palette.find(c => /^#/.test(c)) || '#b3412d';

    let hat = firstOf(text, HATS) || 'none';
    let hair = firstOf(text, HAIRS);
    const ears = /NEKO|KITSUNE|猫|狐/.test(String(agent && agent.name || ''));
    if (ears) hat = 'ears';
    if (!hair) {
        const pool = garment === 'robe' || family === 'heian' ? ['tied', 'bun', 'long'] : family === 'edo' || family === 'sengoku' ? ['topknot', 'bun', 'tied', 'short'] : ['short', 'bun', 'tied', 'bob'];
        hair = pick(pool, u('hair'));
    }
    if (hat === 'gearhead' || hat === 'origami' || hat === 'goggles') hair = 'none';
    const prop = firstOf(text, PROPS) || pick(['none', 'book', 'bundle', 'none'], u('prop'));
    const pattern = firstOf(text, PATTERNS) || 'none';
    if (garment === 'dogu') { const c = colours.find(c => c.word === '赤褐'); if (c) main = c.hex; }
    const back = has(text, '背負', '背中に巻いた', '背中には折りたたんだ', '背中には小さな', '背中に傍書') ? 'pack' : 'none';
    const hip = has(text, '雷瓶を二本', '雷瓶の灯り') ? 'jar' : has(text, '腰に') ? 'pouch' : 'none';
    const scarf = has(text, 'えりまき', 'スカーフ', '領巾') ? (has(text, '領巾') ? 'hire' : 'scarf') : 'none';
    let scale = 1;
    if (has(text, '手のひら大')) scale = 0.62;
    else if (has(text, '背丈1m')) scale = 0.74;
    else if (has(text, '子どもほど', 'おかっぱ')) scale = 0.8;
    else if (has(text, '小柄', '筆子')) scale = 0.86;
    else if (has(text, '背の高い')) scale = 1.07;
    const gaitKind = garment === 'kimono' || garment === 'robe' || garment === 'paper' || garment === 'dogu' ? 'shuffle' : 'walk';
    return {
        id, garment, gaitKind, main, sub, legs, accent, packColour: pick(['#b08850', '#8a6a4a', '#c9b48a', '#6e7a5a'], u('pack')), apron, pattern, hat, hair, prop, back, hip, scarf,
        tail: ears, stoop: has(text, '前かがみ') ? 1 : 0, barefoot: has(text, '裸足'), wheels: has(text, '車輪'),
        hairColour: has(text, '紫 #8800FF の髪') ? '#6a2aa8' : has(text, '栗色の髪') ? '#6a4a30' : null,
        glow: has(text, '光る', '灯り', '灯', 'あかり') ? accent : null,
        scale,
        lane: Math.floor(u('lane') * 3),
        breath: 3.4 + 1.6 * u('breath')
    };
}

// A short signature for tests: residents must be told apart at a glance.
export const lookKey = L => [L.garment, L.hat, L.hair, L.prop, L.main, L.pattern].join('|');
