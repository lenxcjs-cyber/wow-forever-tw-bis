"""Convert Talents Forever's CC BY 4.0 public class exports, preserving source provenance.
Game text/icons remain Blizzard's. No inferred prerequisite may be silently dropped.
"""
import json
import re
import sys
from pathlib import Path

CLASSES = "warrior paladin hunter rogue priest shaman mage warlock druid".split()
def convert(token, data):
    if str(data.get("class", "")).lower() != token:
        raise ValueError("Class mismatch: " + token)
    source = data["talents"]
    trees, talents, arrows = [], [], []
    if len(source["trees"]) != 3:
        raise ValueError("Expected three trees")
    for i, tree in enumerate(source["trees"]):
        trees.append({"index": i, "name": tree["name"], "icon": tree.get("icon", "")})
        nodes = tree["talents"]
        names = {}
        coords = set()
        for t in nodes:
            name, row, col, cap = t["name"], t["row"], t["col"], t["max"]
            if name in names or (row, col) in coords or not (1 <= row <= 7 and 1 <= col <= 4 and 1 <= cap <= 5):
                raise ValueError("Invalid node: " + token + " " + name)
            tid = (i+1)*100 + row*10 + col
            names[name] = tid
            coords.add((row, col))
            icon = t.get("icon", "")
            if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]+", icon):
                raise ValueError("Unexpected icon: " + name)
            desc = t.get("desc", [])
            if not isinstance(desc, list) or not all(isinstance(x,str) for x in desc):
                raise ValueError("Invalid ranks: " + name)
            talents.append({"id":tid,"tree":i,"row":row,"column":col,"name":name,"icon":icon,
                "maxRank":cap,"pointsInTreeRequired":5*(row-1),"ranks":desc,
                "notYetAvailable":bool(t.get("placeholder") or t.get("notYetAvailable")),
                "sourceConfirmedRanks":t.get("confirmed",[]),"sourceHotfix":t.get("hotfix","")})
        for t in nodes:
            req = t.get("req")
            if not req: continue
            reqs = req if isinstance(req,list) else [req]
            for name in reqs:
                if not isinstance(name,str) or name not in names:
                    raise ValueError("Unresolved prerequisite: " + token + " " + repr(name))
                arrows.append({"from":names[name],"to":names[t["name"]],"required":True})
    if len(talents)<35:
        raise ValueError("Incomplete class: " + token)
    return {"token":token,"trees":trees,"talents":talents,"arrows":arrows,
            "generated":data.get("generated",""),"source":source.get("source",""),
            "sourceURL":"https://talentsforever.com/export/"+token+".json"}

def main():
    directory, output = map(Path,sys.argv[1:3])
    classes = [convert(c,json.loads((directory/(c+".json")).read_text())) for c in CLASSES]
    result = {"format":"gt-community-talents/1","source":"Talents Forever",
        "sourceURL":"https://talentsforever.com/about","license":"CC BY 4.0 (data arrangement only; game assets belong to Blizzard)",
        "classes":classes}
    output.write_text(json.dumps(result,ensure_ascii=False),encoding="utf-8")
    print("Imported",len(classes),"classes,",sum(len(c["talents"]) for c in classes),"talents,",sum(len(c["arrows"]) for c in classes),"prerequisites")
if __name__ == "__main__":
    main()
