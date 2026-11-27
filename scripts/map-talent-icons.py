import json
import re
import sys
from pathlib import Path

def map_icons(data, lines):
    wanted = {str(t.get("icon")) for c in data["classes"] for t in c["talents"]}
    icons = {}
    for line in lines:
        key, _, value = line.strip().partition(";")
        if key not in wanted:
            continue
        normalized = value.replace(chr(92), "/").lower()
        match = re.search(r"(?:^|/)icons/([a-z0-9_]+)[.]blp$", normalized)
        if match:
            icons[key] = match.group(1)
    for c in data["classes"]:
        for t in c["talents"]:
            name = icons.get(str(t.get("icon")))
            if name:
                icons[c["token"].lower() + ":" + t["name"]] = name
    return icons

if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("usage: map-talent-icons.py SNAPSHOT LISTFILE OUTPUT")
    data = json.loads(Path(sys.argv[1]).read_text())
    with open(sys.argv[2], encoding="utf-8-sig", errors="replace") as lines:
        result = map_icons(data, lines)
    if not result:
        raise SystemExit("No matching icon IDs")
    Path(sys.argv[3]).write_text(json.dumps(result, ensure_ascii=False))
    print("Mapped texture IDs:", sum(k.isdigit() for k in result))
