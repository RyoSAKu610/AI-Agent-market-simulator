#!/usr/bin/env python3
"""Add DOM identity + route geometry for the errand route visual FX."""
from pathlib import Path
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one source anchor, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: apply-route-fx.py <index.html>")
    path = Path(sys.argv[1])
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''  color,\n  onClick,\n  x,''',
        '''  color,\n  onClick,\n  id,\n  x,''',
        "PixelChar id prop",
    )
    text = replace_once(
        text,
        '''    "data-agent-sprite": spriteId,''',
        '''    "data-agent-id": id,\n    "data-agent-sprite": spriteId,''',
        "PixelChar DOM id",
    )
    text = replace_once(
        text,
        '''        siteId: dest.id,\n        siteName: dest.name || dest.id\n      } })), 0);''',
        '''        siteId: dest.id,\n        siteName: dest.name || dest.id,\n        fromX: agent.x, fromY: agent.y,\n        toX: dest.x + Math.floor(dest.w / 2), toY: dest.y + dest.h,\n        tile: TILE\n      } })), 0);''',
        "route geometry event",
    )
    text = replace_once(
        text,
        '''  <script defer src="./neon-mythos-errand.js"></script>\n''',
        '''  <script defer src="./neon-mythos-errand.js"></script>\n  <script defer src="./neon-mythos-route-fx.js"></script>\n''',
        "route FX script",
    )
    path.write_text(text, encoding="utf-8")
    print("Neon Mythos route FX wired")


if __name__ == "__main__":
    main()
