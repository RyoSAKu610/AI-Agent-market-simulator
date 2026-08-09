#!/usr/bin/env python3
"""Wire the errand UX to Neon Mythos' staged game build.

Runs after apply-offline-actions.py. It keeps the generated source untouched and
patches only _site/index.html plus the staged experience JS. Exact anchors make
source drift fail the Pages build instead of silently shipping a broken bridge.
"""
from pathlib import Path
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one source anchor, found {count}")
    return text.replace(old, new, 1)


def patch_index(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    anchor = '''    window.addEventListener("nm:ltt-command", handler);
    return () => window.removeEventListener("nm:ltt-command", handler);
  }, [agents, resi, lttAssign]);
'''
    route_hook = anchor + '''
  // ── Errand mode: after replying/thinking, physically send the assigned
  // agent toward a goal-relevant building. This uses the real walk state, so
  // the "AI went to do it" moment happens on the city map rather than in UI only.
  useEffect(() => {
    const norm = value => String(value || "").toLowerCase().replace(/[\\s_-]/g, "");
    const routeAgent = event => {
      const d = event.detail || {}, roster = [...agents, ...resi], key = norm(d.target);
      const agent = roster.find(c => key && [c.id, c.name, c.jp, c.spriteId].some(v => norm(v) === key || norm(v).includes(key) || key.includes(norm(v)))) || roster.find(c => c.id === "nego") || roster[0];
      const goalKey = LTT_GOALS[d.goalKey] ? d.goalKey : "district_control";
      if (!agent) return;
      const candidates = LTT_CAT_BUILDINGS(LTT_GOALS[goalKey].cats)
        .map(id => BUILDINGS.find(b => b.id === id)).filter(Boolean)
        .sort((a, b) => (Math.abs(a.x - agent.x) + Math.abs(a.y - agent.y)) - (Math.abs(b.x - agent.x) + Math.abs(b.y - agent.y)));
      if (!candidates.length) return;
      const dest = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
      const patch = rosterState => rosterState.map(c => c.id !== agent.id ? c : ({
        ...c,
        tx: dest.x + Math.floor(dest.w / 2),
        ty: dest.y + dest.h,
        state: "walk",
        timer: 0,
        expression: "focus",
        behaviorState: "mission-route",
        currentBuilding: "",
        currentAction: `MISSION ROUTE → ${dest.name || dest.id}`,
        lastReaction: `Heading to ${dest.name || dest.id}`
      }));
      setAgents(patch);
      setResi(patch);
      setSel(agent.id);
      log(agent.jp || agent.name, `🏃 ${dest.name || dest.id}へ向かう`, agent.color);
      setTimeout(() => window.dispatchEvent(new CustomEvent("nm:agent-routed", { detail: {
        requestId: d.requestId || null,
        agentId: agent.id,
        agentName: agent.jp || agent.name,
        goalKey,
        siteId: dest.id,
        siteName: dest.name || dest.id
      } })), 0);
    };
    window.addEventListener("nm:route-agent", routeAgent);
    return () => window.removeEventListener("nm:route-agent", routeAgent);
  }, [agents, resi, log]);
'''
    text = replace_once(text, anchor, route_hook, "errand route hook")
    script = '  <script defer src="./neon-mythos-experience.js"></script>\n'
    text = replace_once(text, script, script + '  <script defer src="./neon-mythos-errand.js"></script>\n', "errand script injection")
    path.write_text(text, encoding="utf-8")


def patch_experience(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    old = "function buddy(){return get(S.buddy,null)}function task(text,g){let b=buddy(),k=g||goal(text),target=b?.id||'nego';fire('nm:ltt-command',{target,goalKey:k,text});fire('nm:agent-command',{target,intent:intent(text),message:text,note:'LONG TASK: '+text});toast('AI AGENT','「'+text+'」を長期タスクとして開始します。')}"
    new = "function buddy(){return get(S.buddy,null)}function task(text,g){let b=buddy(),k=g||goal(text),target=b?.id||'nego',requestId='errand-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),detail={target,goalKey:k,text,requestId,handled:false};fire('nm:errand-request',detail);setTimeout(()=>{if(!detail.handled){fire('nm:ltt-command',{target,goalKey:k,text,requestId});toast('AI AGENT','「'+text+'」を長期タスクとして開始します。')}},4200)}"
    text = replace_once(text, old, new, "experience task dispatch")
    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: apply-errand-mode.py <index.html> <experience.js>")
    patch_index(Path(sys.argv[1]))
    patch_experience(Path(sys.argv[2]))
    print("Neon Mythos errand mode wired")


if __name__ == "__main__":
    main()
