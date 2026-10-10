// Presence of four exceptional species in the living map. Atlas paintings
// remain viewable at any time; general activity and map duty stay with map.js.
import { clockAt, SEKKI } from './sim.js';

const NOTES = {
    hiraizumi_kinkei: '元旦の明け六つに現れる一対の設定画。地図は圧縮暦の初鳴き祭の最初の明け六つに同期します。',
    icho_dori: '晩秋の渡りの姿。地図の飛行は寒露・霜降から立冬の頃までに限り、図鑑では季節を問わず鑑賞できます。',
    tono_shijima_usagi: '花の盛りに現れる静兎の設定画。地図では清明のころから穀雨の花しまいまでの圧縮暦に同期します。',
    tenshu_shachi: '夜明け・夕暮れに棟を離れて空へ泳ぐ一対の設定画。ほかの刻は棟で休み、図鑑ではいつでも鑑賞できます。'
};

function sekkiIndex(clock) {
    return Number.isInteger(clock.sekkiIndex) ? clock.sekkiIndex : SEKKI.indexOf(clock.sekki);
}

function firstFestivalDawn(clock, startedAt) {
    // clockAt uses the simulation's saved startSekki. Recover that offset
    // from its public day/sekkiIndex rather than assuming a Gregorian New Year.
    if (!Number.isFinite(startedAt) || !Number.isInteger(clock.day) || sekkiIndex(clock) < 0) return null;
    const offset = ((sekkiIndex(clock) - (clock.day - 1)) % 24 + 24) % 24;
    const startDay = Math.floor(startedAt);
    const dawn = startDay + clockAt(startDay + 0.5, offset).dawn;
    const day = startedAt <= dawn ? startDay : startDay + 1;
    return day;
}

/**
 * creaturePresence(id, { clock: eco.clock, activeEvents: eco.activeEvents,
 *                         time: eco.time }) -> { present, reason, viewingNote }
 * Gold rooster uses the real first-crow event's startedAt and only its first
 * dawn. The current simulator compresses a year into 24 seasonal days; this
 * is an event-calendar adaptation, not a claim to model the Gregorian date.
 */
export function creaturePresence(id, { clock = {}, activeEvents = [], time } = {}) {
    const viewingNote = NOTES[id] || '';
    if (!viewingNote) return { present: true, reason: '固有の出現制限なし。活動時間は通常の地図描画に従います。', viewingNote };
    const koku = clock.koku;
    let present = false, reason;
    switch (id) {
    case 'hiraizumi_kinkei': {
        const festival = activeEvents.find(a => a.event?.id === 'hiraizumi_kinkei_hatsunaki');
        const now = Number.isFinite(time) ? time : clock.day - 1 + clock.t;
        const day = festival ? firstFestivalDawn(clock, festival.startedAt) : null;
        present = !!festival && day !== null && clock.day - 1 === day && koku === 0
            && Number.isFinite(now) && now >= festival.startedAt
            && (!Number.isFinite(festival.endsAt) || now < festival.endsAt);
        reason = present ? '圧縮暦の初鳴き祭、最初の明け六つ。' : '金鶏は初鳴き祭の最初の明け六つ以外は姿を見せません。';
        break;
    }
    case 'icho_dori': {
        const index = sekkiIndex(clock);
        // 晩秋の寒露・霜降, and the canon's explicit 「立冬の頃」渡り.
        present = index >= 16 && index <= 18;
        reason = present ? '晩秋から立冬の頃の渡り。' : '銀杏鳥の渡りの飛行は晩秋から立冬の頃に限られます。';
        break;
    }
    case 'tono_shijima_usagi':
        present = sekkiIndex(clock) === 4; // [清明, 穀雨): one compressed seasonal day.
        reason = present ? '清明の花の盛り。' : '静兎は花の盛りだけ現れ、穀雨の花しまいから休みます。';
        break;
    case 'tenshu_shachi':
        present = koku === 0 || koku === 6;
        reason = present ? '明け六つ・暮れ六つの空泳ぎ。' : '鯱は棟で休み、空へ泳ぎ出しません。';
        break;
    }
    return { present, reason, viewingNote };
}
