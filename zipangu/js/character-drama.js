// 【創作】Short dramatic readings of real simulation events. No economic effects.
import { CHARACTER_PROFILES } from './character-profiles.js';

// Each person brings a different unfinished question to a meeting and a journey.
export const DRAMA_VOICES = {
    dogu: ['森の歌と、この町の拍子を結びたい。', '縄目の低い音が、帰る森のほうへ続く。'],
    oracle: ['当たらなかった予報も、一緒に見ていただけますか。', '水の一滴ごとに、まだ知らない刻があります。'],
    kamifuda: ['紙一枚の距離でも、宛先は大事にしたい。', '次の観測者へ。紙端をそっと風に合わせる。'],
    hoshiito: ['遠い月の道しるべは、どんなかさねがよいでしょう。', 'この道の色を、次の織り目に覚えておきたい。'],
    kane: ['光を巡らせる順番を、もう一度数えませんか。', '動かさない光も、運ぶ約束も、気にかかります。'],
    hakuuchi: ['薄く、でも丈夫に。次の一枚をどう打つか。', '帰ったら四拍。いまは道の拍を数えます。'],
    nego: ['違う値を見ていても、同じ茶の席には座れます。', '次の茶の席へ、急がず段取りを運びましょう。'],
    nejikiri: ['この一山、違う時代の道具にも合うだろうか。', '道の先にも、確かめたいねじ山がある。'],
    sage: ['答えの手前にある理由を、一緒に考えたい。', '歩いた道筋も、解き紙の途中式に似ています。'],
    chahakobi: ['盆を水平に保ち、相手の拍子を待つ。', '急がず、傾けず。車輪の拍を次の座へ。'],
    neon: ['川の群れの拍、今度はみんなで聴きたい。', '灯りを穏やかに。川の光は自由のままに。'],
    gennai_maru: ['おお、この段取りから新しい仕掛けを考えられそうだ！', 'ひらめきだけで走らず、確かめる一頁も持って行こう。'],
    hanshichi: ['小さな手がかりから、話の裏を確かめましょう。', '行き先は確かめました。足もとから順に辿りましょう。'],
    kisuke: ['今日はここまで。それで足りるかもしれません。', '今日を漕ぎ切る。その先は明日の水に聞きます。'],
    drone: ['宛名を間違えずに届く速さを、いちばんにしたい！', '開けない、落とさない。次の便へ！'],
    jubei: ['段取りを飛ばせば、あとで誰かが困る。', '重い一歩でも、近道で手を抜くよりいい。'],
    lira: ['雑音の間にも、誰かの拍子があるね。', '帰り道の拍を、ひとつ覚えて帰ろう。'],
    budori: ['誰か一人に重荷を寄せない備えを、考えたいんだ。', '村のみんなに見せられる記録を、一枚ずつ。'],
    goldjack: ['笑われた計画にも、最初の一頁を置こうぜ！', '夢の先へ！でも今日は、この道からだな。'],
    chomei: ['その望みは、一丈四方に入りますか。', '持つものと手放すもの。歩きながら選びましょう。'],
    zero: ['最後の駅の信号と、今日の歯車の音を比べたい。', 'まだ青くない信号も、今日の道も覚えておく。'],
    pixel: ['図鑑を閉じたあと、外へ出たくなる頁にしたいんだ。', 'この道の余白、次の図鑑にも残そう。'],
    yaji_kita: ['弥次「道は任せろ」喜多「まず宛名を確かめよう」。', '弥次は先を指し、喜多は天秤棒の釣り合いを直す。'],
    yami: ['べつに興味ないけど……その帳面、最後まで見ておく。', '市がはねたあとの道も、誰かが見ていないとね。'],
    kitsune: ['母狐に見せられる、誠実な取引にしたい。', '右手の貨を隠さず、次の相手へ。'],
    zashiki: ['約束はしないよ。笑い声のするほうが好き。', 'ここも楽しかった。次はどこで笑おうかな。'],
    human: ['違う刻にいても、置き去りにはしません。', '辿り着いた刻を、縁の帳へ残して行きます。'],
    otohime: ['時差で置き去りになる人を、増やしたくないのです。', '閉じた箱の封印と、次のお茶の刻を確かめます。'],
    ryugu_nayotake: ['地上の物語、その続きも聞かせてください。', '次の茶の席には、どんな一話が待つでしょう。'],
    eyevoid: ['忘れたくない名を、星図のそばで確かめる。', '地上の縁を忘れずに、次の観測の窓へ。'],
    tenshu_momoroku: ['木のほうが正しいこともある。まず聴こう。', '削る前に、道の音も聴いておこう。'],
    tenshu_yurimori: ['待つことも、約束の一部です。', '次に会う日も、根付きのつぼみを急かさずに。']
};

const name = a => String(a?.name || a?.name_ja || '').replace(/（[^）]*）/g, '');
const EVENT_TYPES = new Set(['encounter', 'depart', 'arrive', 'trade', 'request', 'message-received', 'goal']);
const POSE = { idle: 0, react: 0, think: 1, travel: 2, trade: 3 };
const PAIR_SCENES = [
    [['lira', 'zero'], ['雑音の拍子まで揃えたら、逢う刻の合図も同じ音になるかな。', '音だけを揃えて、刻がずれていたら困る。万世時計のどの拍に合わせる？', 'まず一つの文字盤と拍子を比べたい。全時片で鳴らす試験は、その次に考えよう。']],
    [['oracle', 'eyevoid'], ['同じ客星を見ても、判詞は揃わないのですね。', '揃わない頁も残そう。どの刻に見たか、そこから比べる。', 'では次の観測で、違いが残った刻をもう一度確かめましょう。']],
    [['kane', 'hakuuchi'], ['光を手元に残すか、帆へ巡らすか……また数えてしまう。', '溜めた光だけでは帆は進まないよ。薄くても丈夫な一枚を考えよう。', 'うん。次の一枚に必要な光から、順番を考え直す。']],
    [['nejikiri', 'goldjack'], ['高く急ぐ前に、ねじの一山を確かめたい。', '夢は大きく、だが一山を飛ばしたら君は乗ってくれないか！', '夢を小さくしろとは言わない。次は、規格を守れる段取りを見せてくれ。']],
    [['kamifuda', 'drone'], ['速さを競っても、宛先を先に確かめたい。', 'そこは同じ！届いた先を間違えたら、一番速くても嬉しくない。', '次の便では、刻と宛名を並べて見比べよう。']],
    [['nego', 'otohime'], ['運べる品の線引き、また茶の席で話しましょう。', 'ええ。でも時差で人が置き去りになる線は、譲れません。', 'ならば次の帳は、値より先に帰る刻から開きましょう。']],
    [['kitsune', 'zashiki'], ['今日は店の宣伝の話ではないよ。どこが楽しかった？', '小さな窓のところ！約束はしないけど、笑えたの。', '君の名は看板にしない。楽しかった話だけ、聞かせておくれ。']],
    [['dogu', 'lira'], ['縄目の低い響きが、森の拍を問いかける。', '急いで歌を値に変えないよ。この間の長さを、まず聴かせて。', '結び目の間を空け、次の響きを待つ。']],
    [['sage', 'chahakobi'], ['計算は進んだけれど、一礼の拍子はまだ難しいです。', '水平の盆を保ち、急ぐ筆先へゆっくり一礼する。', '答えを急がず、次はこの間も解き紙に残してみます。']]
];
const RESPONSE = {
    forest: '残せる記録と、手を出さず見守るものを分けて考えよう。',
    clock: '違う値なら、観測した刻と場所から比べよう。',
    workshop: '急ぐ前に、素材と段取りを一つずつ確かめたい。',
    market: '値だけで決めず、続けられる順番を考えたい。',
    guide: '先を急ぐより、誰も置き去りにならない道を選びたい。',
    story: '結末を急がず、次の一話を聞く余白を残そう。',
    garden: '待つ時間も消さず、次に会う頁へ残しておこう。'
};
export function encounterLines(W, first, other, relationship = '') {
    const pair = PAIR_SCENES.find(([ids]) => ids.includes(first) && ids.includes(other));
    if (pair) return pair[1].map((text, i) => ({ speaker: pair[0][i % 2], text, pose: i === 2 ? 0 : 1, mode: 'speech' }));
    const p = CHARACTER_PROFILES[first], q = CHARACTER_PROFILES[other];
    const disputed = /対立|警戒|好敵手|苦手|綱引/.test(relationship);
    const reply = other === 'zashiki' ? '難しい約束の話はしないよ。でも、楽しいところの話なら聞く。'
        : `${name(W.byId.agent.get(first))}、${disputed ? 'すぐには同じ答えになれないけれど、' : ''}${RESPONSE[p.mode]}\n${q.wish}`;
    return [ { speaker: first, text: DRAMA_VOICES[first][0], pose: 1, mode: 'speech' },
        { speaker: other, text: `${q.gesture}\n${reply}`, pose: 1, mode: 'speech' },
        { speaker: first, text: first === 'zashiki' ? DRAMA_VOICES[first][1] : `その見方も、この道で覚えておこう。\n${p.wish}`, pose: 0, mode: 'speech' } ];
}
export const DRAMA_LIMIT = 96;
export function createDrama(W, eco, saved = null, person = () => null, arc = () => null) {
    const state = saved || { scenes: [], readers: {} };
    const placeName = id => W.byId.district.get(id)?.name_ja || '道中';
    const line = (speaker, text, pose = 0, mode = 'speech') => ({ speaker, text, pose, mode });
    function solo(id, kind, evidence) {
        const live = eco.agents.get(id), profile = CHARACTER_PROFILES[id];
        const road = kind === 'depart' || (!evidence && live.stage === 'travel');
        const district = evidence?.district || evidence?.to || live.at || live.target || live.home;
        const memory = person(id)?.memories.filter(m => m.seq !== evidence?.seq).at(-1);
        const wish = arc(id)?.next || profile.wish;
        const lines = [line(id, profile.gesture, road ? 2 : 1, 'gesture')];
        lines.push(line(id, road ? DRAMA_VOICES[id][1] : DRAMA_VOICES[id][0], road ? 2 : 1));
        if (kind === 'message-received') {
            lines.push(line(null, `${name(W.byId.agent.get(evidence.from))}からの封じた伝言：「${evidence.body}」`, 0, 'letter'));
            lines.push(line(id, profile.answer, 3));
        } else if (kind === 'request' && evidence.status === 'done') {
            lines.push(line(id, profile.answer, 3));
        } else if (kind === 'trade') {
            const good = W.byId.good.get(evidence.good)?.name_ja || evidence.good;
            const money = Math.round(evidence.total).toLocaleString('ja-JP');
            const result = evidence.action === 'craft' ? `${good}を${evidence.qty}、細工した。次の一枚は、どこへ運ぼう。`
                : evidence.action === 'buy' ? `${good}を${evidence.qty}、${money}で仕入れた。運ぶ刻も、この値と一緒に考えよう。`
                    : `${good}を${evidence.qty}、${money}で売った。${evidence.profit < 0 ? '差額は負になった。次は道と刻を見直そう。' : 'この商いの記録を、次の段取りへ。'}`;
            lines.push(line(id, result, 3));
        } else if (memory && kind !== 'request') {
            lines.push(line(null, `前の頁を思い返す：${memory.text}`, 0, 'memory'));
        }
        lines.push(line(id, wish, road ? 2 : 0));
        return { district, cast: [id], lines };
    }
    function current(id) {
        const live = eco.agents.get(id);
        const reading = solo(id, 'now');
        reading.lines[0].pose = POSE[live.stage] || 0;
        reading.lines[1].pose = POSE[live.stage] || 0;
        return { id: `now:${id}:${eco.time}`, seq: eco.snapshot().eventSeq || 0, kind: 'now', agent: id, T: eco.time,
            day: eco.clock.day, label: eco.clock.label, title: live.stage === 'travel' ? 'ひとり、次の場所へ' : live.stage === 'think' ? '次の一手を思う' : '今日の仕事の合間',
            fact: live.at ? `${placeName(live.at)}・${live.activity}` : `${placeName(live.target)}へ向かう途中・${live.activity}`,
            ...reading };
    }
    function record(e) {
        if (!EVENT_TYPES.has(e.type) || !CHARACTER_PROFILES[e.agent] || state.scenes.some(s => s.id === `event:${e.seq}`)) return null;
        if (e.type === 'request' && e.status === 'queued') return null;
        const live = eco.agents.get(e.agent);
        // Arrival/trade/request events must have the actual location they describe.
        if (['arrive', 'trade', 'encounter'].includes(e.type) && (!e.district || live.at !== e.district)) return null;
        if (e.type === 'request' && e.status === 'done' && live.at !== e.district) return null;
        if (e.type === 'message-received' && (live.at !== live.home || !W.byId.agent.has(e.from))) return null;
        const scene = { id: `event:${e.seq}`, seq: e.seq, kind: e.type, agent: e.agent, T: e.T, day: e.day, label: e.label,
            title: ({ encounter: '道が重なる、その一刻', depart: 'ひとり、次の場所へ', arrive: '辿り着いた頁', trade: e.action === 'craft' ? '次の一枚を作る' : '値と望みのあいだ', request: e.status === 'done' ? 'あなたとの約束が、記録になる' : '約束へ向けた思案', 'message-received': '帰ってきた人へ、封じた便り', goal: '願いに向かう小さな節目' })[e.type],
            fact: e.message, ...solo(e.agent, e.type, e) };
        if (e.type === 'encounter') {
            const other = eco.agents.get(e.other);
            if (!other || e.other === e.agent || other.trip || live.trip || other.at !== e.district) return null;
            scene.cast.push(e.other);
            const relationship = W.byId.agent.get(e.agent).relationships?.find(r => r.agent === e.other)
                || W.byId.agent.get(e.other).relationships?.find(r => r.agent === e.agent);
            scene.relationship = relationship?.type || '';
            scene.lines = [line(null, `${placeName(e.district)}で、二人の道が重なった。`, 0, 'narration'),
                ...encounterLines(W, e.agent, e.other, scene.relationship)];
            const prior = person(e.agent)?.memories.at(-1);
            if (prior) scene.lines.push(line(null, `その前の頁：${prior.text}`, 0, 'memory'));
        }
        if (e.type === 'message-received') scene.sender = e.from;
        scene.cast = [...new Set(scene.cast)];
        state.scenes.push(scene); state.scenes = state.scenes.slice(-DRAMA_LIMIT);
        return scene;
    }
    function scenes(id) { return state.scenes.filter(s => s.cast.includes(id)).slice(-12); }
    function reader(id) { return state.readers[id] || (state.readers[id] = { scene: '', beat: 0, auto: false }); }
    return { record, current, scenes, reader, snapshot: () => JSON.parse(JSON.stringify(state)) };
}

// Wall time, not simulation speed. A long utterance earns more time to read.
export function dramaReadSeconds(text) { return Math.max(5, Math.min(13, 3 + [...text].length * 0.105)); }
export function dramaAdvance(scene, reader) {
    if (reader.beat < scene.lines.length - 1) { reader.beat++; return true; }
    return false;
}
export function dramaChoose(scene, reader) { reader.scene = scene.id; reader.held = scene; reader.beat = 0; }
export function dramaPose(scene, beat, id) { return scene.lines[beat]?.speaker === id ? scene.lines[beat].pose : POSE.idle; }
