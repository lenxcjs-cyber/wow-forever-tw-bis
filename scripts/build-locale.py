"""Build zhTW display maps from matching client-table IDs.
Only accept Chinese text, do not guess names or expand unresolved spell tokens.
"""
import csv,json,re,sys
from pathlib import Path
CJK=re.compile(r"[\u3400-\u9fff]")
def read_table(path,fields):
    with Path(path).open(encoding="utf-8-sig",newline="") as f:
        rows=csv.DictReader(f)
        names=rows.fieldnames or []
        idkey=next((x for x in ("ID","Id","id") if x in names),None)
        namekey=next((x for x in fields if x in names),None)
        if not idkey or not namekey: raise ValueError("Unexpected CSV schema: "+str(path))
        return {r[idkey]:r[namekey].strip() for r in rows if r.get(idkey) and r.get(namekey)}
def normalize_description(s):
    return " ".join(str(s).split())

def description_map(en, zh):
    matches={}
    for k,v in en.items():
        z=zh.get(k,"")
        # Never resolve variable tokens by guessing. Match the same ID and literal numbers.
        if not CJK.search(z) or any(c in v+z for c in ("$","|","<",">")):
            continue
        if re.findall(r"\d+(?:\.\d+)?",v)!=re.findall(r"\d+(?:\.\d+)?",z):
            continue
        matches.setdefault(normalize_description(v),set()).add(normalize_description(z))
    return {k:next(iter(v)) for k,v in matches.items() if k and len(v)==1}

def build(root,build_id):
    result={"build":build_id,"items":{},"spells":{},"effects":{},"source":"WoW Forever zhTW client tables via wago.tools"}
    try:
        items=read_table(root/"items-zhTW.csv",("Display_lang","Display","Name_lang"))
        result["items"]={k:v for k,v in items.items() if k.isdigit() and CJK.search(v)}
    except (OSError,ValueError) as e: print("Item locale unavailable:",e)
    try:
        en=read_table(root/"spells-enUS.csv",("Name_lang","Name"))
        zh=read_table(root/"spells-zhTW.csv",("Name_lang","Name"))
        matches={}
        for k,v in en.items():
            z=zh.get(k,"")
            if CJK.search(z): matches.setdefault(v,set()).add(z)
        result["spells"]={k:next(iter(v)) for k,v in matches.items() if len(v)==1}
    except (OSError,ValueError) as e: print("Spell locale unavailable:",e)
    try:
        en=read_table(root/"effects-enUS.csv",("Description_lang","Description"))
        zh=read_table(root/"effects-zhTW.csv",("Description_lang","Description"))
        result["effects"]=description_map(en,zh)
    except (OSError,ValueError) as e: print("Spell effects locale unavailable:",e)
    print("zhTW literal effects:",len(result["effects"]))
    print("zhTW items:",len(result["items"]),"unambiguous spell names:",len(result["spells"]))
    return result
if __name__=="__main__":
    root=Path(sys.argv[1]); build_id=sys.argv[2]
    data=build(root,build_id)
    Path("locale-data.js").write_text("globalThis.GTLocaleData="+json.dumps(data,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
