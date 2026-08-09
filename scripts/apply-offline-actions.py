#!/usr/bin/env python3
"""Patch staged Neon Mythos index with offline LTT + lightweight experience hooks.

The repository keeps index.html as a generated/precompiled artifact. We patch
only the staged Pages copy. Replacements are exact-match and fail the build if
the expected source contract changes.
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
// Offline progress extrapolates only the progress rate that this task actually
// demonstrated while online. A task with no observed progress earns nothing.
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
      const baseTick = Number.isFinite(x.offlineBaseTick) ? x.offlineBaseTick : hasClock ? (Number.isFinite(x.createdTick) ? x.createdTick : savedTick) : savedTick;
      const baseAccum = Number.isFinite(x.offlineBaseAccum) ? x.offlineBaseAccum : hasClock ? 0 : accum;
      let next = {
        ...x, fx: null, resumed: true, accum, lastRaw: null,
        weights: x.weights || {}, memory: x.memory || { wins: [], losses: [], notes: [] },
        history: x.history || [], allies: x.allies || [], betrayedBy: x.betrayedBy || [],
        offlineBaseTick: baseTick, offlineBaseAccum: baseAccum, offlineTicksApplied: 0, offlineGain: 0
      };
      if (!hasClock || offlineTicks <= 0 || next.status !== "active") return next;
      const observedTicks = Math.max(0, savedTick - baseTick);
      const observedGain = Math.max(0, accum - baseAccum);
      const ratePerTick = observedTicks > 0 ? observedGain / observedTicks : 0;
      const remaining = Math.max(0, next.target - (next.baseline + accum));
      const offlineGain = Math.min(remaining, Math.max(0, Math.floor(ratePerTick * offlineTicks)));
      if (offlineGain > 0) {
        next.accum = accum + offlineGain;
        next.value = next.baseline + next.accum;
        next.progress = lttProgressPct(next);
        next.lastProgressDay = bootDay;
        next.offlineGain = offlineGain;
        totalOfflineGain += offlineGain;
        next.history = [{ day: bootDay, kind: "offline", detail: `+${offlineGain} over ${offlineTicks} ticks` }, ...next.history].slice(0, 24);
        while (next.milestoneIdx < next.milestones.length && next.value >= next.milestones[next.milestoneIdx].target) {
          const idx = next.milestoneIdx;
          const milestones = next.milestones.slice();
          milestones[idx] = { ...milestones[idx], done: true, doneDay: bootDay, doneTick: bootTick };
          next.milestones = milestones;
          next.milestoneIdx += 1;
        }
      }
      next.offlineTicksApplied = offlineTicks;
      if (next.milestoneIdx >= next.milestones.length) next.status = "done";
      else if (bootDay > next.deadlineDay) next.status = "failed";
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
    text = replace_once(text,
        '''  const [tick, setTick] = useState(0);\n  const [day, setDay] = useState(1);''',
        '''  const [tick, setTick] = useState(() => LTT_BOOT.tick);\n  const [day, setDay] = useState(() => LTT_BOOT.day);''',
        "world clock state")
    text = replace_once(text,
        '''  useEffect(() => { lttSave(ltts); }, [ltts]);''',
        '''  useEffect(() => { lttSave(ltts, { day, tick }); }, [ltts]);''',
        "long-term-task save effect")
    text = replace_once(text,
        '''    if (live.length) log("LTT", `${live.length} × ${lttT(lang).resume}`, "#00E5FF");''',
        '''    if (live.length) {
      const offline = LTT_BOOT.offlineTicks > 0 ? ` · OFFLINE +${(LTT_BOOT.offlineTicks / DAY_TICKS).toFixed(1)}D / +${LTT_BOOT.offlineGain}` : "";
      log("LTT", `${live.length} × ${lttT(lang).resume}${offline}`, "#00E5FF");
    }''', "resume log")

    old_pick = '''  const pickAvatar = r => {
    setAvatar(r);
    setShowAvSel(false);
    log("SYSTEM", `${r.jp} — ${t.sub}`, r.color);
  };
'''
    new_pick = '''  const pickAvatar = r => {
    setAvatar(r);
    setShowAvSel(false);
    log("SYSTEM", `${r.jp} — ${t.sub}`, r.color);
    setTimeout(() => window.dispatchEvent(new CustomEvent("nm:game-ready", { detail: { avatar: r.id } })), 0);
  };
  useEffect(() => {
    const quickStart = event => {
      const code = event.detail?.lang || "ja";
      const r = RES_POOL.find(x => x.id === "neon") || RES_POOL[0];
      setLang(code); setAvatar(r); setShowLangSel(false); setShowAvSel(false);
      log("SYSTEM", `⚡ QUICK START — ${r.jp}`, r.color);
      setTimeout(() => window.dispatchEvent(new CustomEvent("nm:game-ready", { detail: { avatar: r.id, quick: true } })), 0);
    };
    window.addEventListener("nm:quick-start", quickStart);
    return () => window.removeEventListener("nm:quick-start", quickStart);
  }, [log]);
  useEffect(() => {
    const personality = {
      bold: { g: .82, s: .52, c: .62, e: .9 }, social: { g: .48, s: .95, c: .58, e: .82 },
      analytical: { g: .35, s: .42, c: .98, e: .72 }, steady: { g: .42, s: .62, c: .72, e: .68 }
    };
    const prefs = { investor: ["bank", "market", "shrine"], analyst: ["tower", "academy", "hacklab"], trader: ["market", "arena", "tavern"], engineer: ["hacklab", "port", "academy"] };
    const colors = { investor: "#FFD700", analyst: "#00E5FF", trader: "#FF69B4", engineer: "#BF40FF" };
    const createCompanion = event => {
      const d = event.detail || {};
      const base = AGENTS.find(a => a.spriteId === d.spriteId || a.id === d.spriteId) || AGENTS.find(a => a.id === "neon") || AGENTS[0];
      const id = String(d.id || `buddy-${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
      if (!id) return;
      const specialty = prefs[d.specialty] ? d.specialty : "analyst";
      const pref = prefs[specialty];
      const act = { ...(base.act || {}) };
      pref.forEach(site => { if (!act[site]) act[site] = ["Personal mission in progress", "Long-term objective updated"]; });
      const template = { ...base, id, name: d.name || "MY BUDDY", jp: d.name || "MY BUDDY", color: colors[specialty], specialty, p: personality[d.personality] || personality.analytical, pref, act, title: d.guest ? "Guest AI" : "Personal AI", tier: "sp" };
      setResi(prev => prev.some(c => c.id === id) ? prev : [...prev, createCharacterEntity(template, {
        x: Math.max(1, Math.floor(MAP_W / 2) + Math.floor(Math.random() * 5) - 2),
        y: Math.max(1, Math.floor(MAP_H / 2) + Math.floor(Math.random() * 3) - 1), timer: 2
      })]);
      setTimeout(() => window.dispatchEvent(new CustomEvent("nm:companion-created", { detail: { ...d, id, specialty } })), 0);
    };
    window.addEventListener("nm:create-companion", createCompanion);
    return () => window.removeEventListener("nm:create-companion", createCompanion);
  }, []);
'''
    text = replace_once(text, old_pick, new_pick, "quick start / companion hook")

    old_assign = '''  const lttAssign = useCallback((agentId, goalKey, confirmMode) => {
    const agent = [...agents, ...resi].find(a => a.id === agentId);
    if (!agent) return;
    setLtts(prev => {
      const ctx = { day, tick, res, districtVisits: districtVisitsRef.current };
      const created = lttCreate(agent, goalKey, ctx, { confirmMode });
      const L = lttT(lang);
      log(agent.jp, `🎯 ${L["g_" + goalKey]}`, agent.color);
      return [created, ...prev.filter(l => !(l.agentId === agentId && l.status === "active"))].slice(0, 12);
    });
  }, [agents, resi, day, tick, res, lang, log]);
'''
    new_assign = old_assign + '''
  useEffect(() => {
    const norm = value => String(value || "").toLowerCase().replace(/[\\s_-]/g, "");
    const handler = event => {
      const d = event.detail || {}, roster = [...agents, ...resi], key = norm(d.target);
      const agent = roster.find(c => key && [c.id, c.name, c.jp, c.spriteId].some(v => norm(v) === key || norm(v).includes(key) || key.includes(norm(v)))) || roster.find(c => c.id === "nego") || roster[0];
      const goalKey = LTT_GOALS[d.goalKey] ? d.goalKey : "district_control";
      if (agent) lttAssign(agent.id, goalKey, !!d.confirmMode);
    };
    window.addEventListener("nm:ltt-command", handler);
    return () => window.removeEventListener("nm:ltt-command", handler);
  }, [agents, resi, lttAssign]);
'''
    text = replace_once(text, old_assign, new_assign, "external long-term-task hook")

    old_events = '''        const who = nextLtt.agentName;
        const col = nextLtt.color || LTT_GOALS[nextLtt.goalKey].color;
        events.forEach(ev => {
          if (ev.kind === "milestone") {'''
    new_events = '''        const who = nextLtt.agentName;
        const col = nextLtt.color || LTT_GOALS[nextLtt.goalKey].color;
        events.forEach(ev => {
          window.dispatchEvent(new CustomEvent("nm:ltt-event", { detail: {
            ...ev, agentId: nextLtt.agentId, agentName: who, goalKey: nextLtt.goalKey,
            goalLabel: L["g_" + nextLtt.goalKey], progress: nextLtt.progress, day
          } }));
          if (ev.kind === "milestone") {'''
    text = replace_once(text, old_events, new_events, "long-term-task event bridge")

    head = '''  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="icon" href="./pwa-icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="./pwa-icon.svg">
  <meta name="mobile-web-app-capable" content="yes">
'''
    text = replace_once(text, "</head>", head + "</head>", "PWA head injection")
    text = replace_once(text, "</body>", '  <script defer src="./neon-mythos-experience.js"></script>\n</body>', "experience script injection")
    path.write_text(text, encoding="utf-8")
    print(f"Neon Mythos staged enhancements injected: {path}")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: apply-offline-actions.py <index.html>")
    patch(Path(sys.argv[1]))


if __name__ == "__main__":
    main()
