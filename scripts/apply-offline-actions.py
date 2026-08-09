#!/usr/bin/env python3
"""Inject the minimal long-term-task offline catch-up into the staged site.

This intentionally patches only the deployed index.html so the large generated
HTML file does not need to be rewritten by hand. The patch is exact-match and
fails loudly if the expected source anchors change.
"""

from pathlib import Path
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one source anchor, found {count}")
    return text.replace(old, new, 1)


def patch(path: Path) -> None:
    text = path.read_text(encoding="utf-8")

    old_persistence = '''// ── Persistence: the goal survives reload and session end ───────
const lttSave = list => {
  try {
    window.localStorage.setItem(LTT_STORAGE_KEY, JSON.stringify({ v: 1, savedAt: Date.now(), list }));
  } catch (e) { /* storage unavailable — run in-memory */ }
};
const lttLoad = () => {
  try {
    const raw = window.localStorage.getItem(LTT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.list)) return [];
    return parsed.list.filter(x => x && x.id && LTT_GOALS[x.goalKey]).map(x => ({
      ...x,
      fx: null,
      resumed: true,
      accum: x.accum || 0,
      lastRaw: null,
      weights: x.weights || {},
      memory: x.memory || { wins: [], losses: [], notes: [] },
      history: x.history || [],
      allies: x.allies || [],
      betrayedBy: x.betrayedBy || []
    }));
  } catch (e) { return []; }
};
const lttClear = () => { try { window.localStorage.removeItem(LTT_STORAGE_KEY); } catch (e) {} };
'''

    new_persistence = '''// ── Persistence + minimal offline catch-up ───────────────────────
// The saved world clock keeps simulation time monotonic across reloads.
// Offline progress is NOT a fixed/free reward: it extrapolates only the
// progress rate this task actually demonstrated while online.
const lttSave = (list, clock = {}) => {
  try {
    window.localStorage.setItem(LTT_STORAGE_KEY, JSON.stringify({
      v: 2,
      savedAt: Date.now(),
      clock: {
        day: Number.isFinite(clock.day) ? clock.day : 1,
        tick: Number.isFinite(clock.tick) ? clock.tick : 0
      },
      list
    }));
  } catch (e) { /* storage unavailable — run in-memory */ }
};

const lttLoadSnapshot = () => {
  const empty = { list: [], day: 1, tick: 0, offlineTicks: 0, offlineGain: 0 };
  try {
    const raw = window.localStorage.getItem(LTT_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.list)) return empty;

    const hasClock = !!(parsed.clock && Number.isFinite(parsed.clock.tick) && Number.isFinite(parsed.clock.day));
    const legacyTick = parsed.list.reduce((m, x) => Math.max(m,
      Number.isFinite(x?.createdTick) ? x.createdTick : 0,
      ...(Array.isArray(x?.milestones) ? x.milestones.map(ms => Number.isFinite(ms?.doneTick) ? ms.doneTick : 0) : [0])
    ), 0);
    const legacyDay = parsed.list.reduce((m, x) => Math.max(m,
      Number.isFinite(x?.createdDay) ? x.createdDay : 1,
      Number.isFinite(x?.lastProgressDay) ? x.lastProgressDay : 1,
      Number.isFinite(x?.lastReportDay) ? x.lastReportDay : 1
    ), 1);

    const savedTick = hasClock ? Math.max(0, Math.floor(parsed.clock.tick)) : legacyTick;
    const savedDay = hasClock ? Math.max(1, Math.floor(parsed.clock.day)) : legacyDay;
    const elapsedMs = hasClock && Number.isFinite(parsed.savedAt) ? Math.max(0, Date.now() - parsed.savedAt) : 0;
    const offlineTicks = Math.floor(elapsedMs / TICK_MS);
    const bootTick = savedTick + offlineTicks;
    const bootDay = Math.max(savedDay, Math.floor(bootTick / DAY_TICKS) + 1);
    let totalOfflineGain = 0;

    const list = parsed.list.filter(x => x && x.id && LTT_GOALS[x.goalKey]).map(x => {
      const accum = x.accum || 0;
      const baseTick = Number.isFinite(x.offlineBaseTick)
        ? x.offlineBaseTick
        : hasClock ? (Number.isFinite(x.createdTick) ? x.createdTick : savedTick) : savedTick;
      const baseAccum = Number.isFinite(x.offlineBaseAccum)
        ? x.offlineBaseAccum
        : hasClock ? 0 : accum;
      let next = {
        ...x,
        fx: null,
        resumed: true,
        accum,
        lastRaw: null,
        weights: x.weights || {},
        memory: x.memory || { wins: [], losses: [], notes: [] },
        history: x.history || [],
        allies: x.allies || [],
        betrayedBy: x.betrayedBy || [],
        offlineBaseTick: baseTick,
        offlineBaseAccum: baseAccum,
        offlineTicksApplied: 0,
        offlineGain: 0
      };

      if (!hasClock || offlineTicks <= 0 || next.status !== "active") return next;

      const observedTicks = Math.max(0, savedTick - baseTick);
      const observedGain = Math.max(0, accum - baseAccum);
      const ratePerTick = observedTicks > 0 ? observedGain / observedTicks : 0;
      const currentValue = next.baseline + accum;
      const remaining = Math.max(0, next.target - currentValue);
      const offlineGain = Math.min(remaining, Math.max(0, Math.floor(ratePerTick * offlineTicks)));

      if (offlineGain > 0) {
        next.accum = accum + offlineGain;
        next.value = next.baseline + next.accum;
        next.progress = lttProgressPct(next);
        next.lastProgressDay = bootDay;
        next.offlineGain = offlineGain;
        totalOfflineGain += offlineGain;
        next.history = [{
          day: bootDay,
          kind: "offline",
          detail: `+${offlineGain} over ${offlineTicks} ticks`
        }, ...next.history].slice(0, 24);

        while (next.milestoneIdx < next.milestones.length && next.value >= next.milestones[next.milestoneIdx].target) {
          const idx = next.milestoneIdx;
          const milestones = next.milestones.slice();
          milestones[idx] = { ...milestones[idx], done: true, doneDay: bootDay, doneTick: bootTick };
          next.milestones = milestones;
          next.milestoneIdx += 1;
        }
      }

      next.offlineTicksApplied = offlineTicks;
      if (next.milestoneIdx >= next.milestones.length) {
        next.status = "done";
      } else if (bootDay > next.deadlineDay) {
        next.status = "failed";
      }
      return next;
    });

    return { list, day: bootDay, tick: bootTick, offlineTicks, offlineGain: totalOfflineGain };
  } catch (e) {
    console.warn("[LTT] offline catch-up skipped", e);
    return empty;
  }
};

const LTT_BOOT = lttLoadSnapshot();
const lttLoad = () => LTT_BOOT.list;
const lttClear = () => { try { window.localStorage.removeItem(LTT_STORAGE_KEY); } catch (e) {} };
'''

    text = replace_once(text, old_persistence, new_persistence, "persistence block")

    text = replace_once(
        text,
        '''  const [tick, setTick] = useState(0);\n  const [day, setDay] = useState(1);''',
        '''  const [tick, setTick] = useState(() => LTT_BOOT.tick);\n  const [day, setDay] = useState(() => LTT_BOOT.day);''',
        "world clock state",
    )

    text = replace_once(
        text,
        '''  useEffect(() => { lttSave(ltts); }, [ltts]);''',
        '''  useEffect(() => { lttSave(ltts, { day, tick }); }, [ltts]);''',
        "long-term-task save effect",
    )

    text = replace_once(
        text,
        '''    if (live.length) log("LTT", `${live.length} × ${lttT(lang).resume}`, "#00E5FF");''',
        '''    if (live.length) {
      const offline = LTT_BOOT.offlineTicks > 0
        ? ` · OFFLINE +${(LTT_BOOT.offlineTicks / DAY_TICKS).toFixed(1)}D / +${LTT_BOOT.offlineGain}`
        : "";
      log("LTT", `${live.length} × ${lttT(lang).resume}${offline}`, "#00E5FF");
    }''',
        "resume log",
    )

    path.write_text(text, encoding="utf-8")
    print(f"offline actions injected: {path}")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: apply-offline-actions.py <index.html>")
    patch(Path(sys.argv[1]))


if __name__ == "__main__":
    main()
