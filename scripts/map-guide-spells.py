"""Conservative class-scoped spell guide metadata from exact-build DB2 CSVs."""
import csv,json,re,sys
from pathlib import Path
from collections import defaultdict
BITS={"warrior":1,"paladin":2,"hunter":4,"rogue":8,"priest":16,"shaman":64,"mage":128,"warlock":256,"druid":1024}
CJK=re.compile(r"[\u3400-\u9fff]")
def table(path,required):
    with path.open(encoding="utf-8-sig",newline="") as f:
        reader=csv.DictReader(f)
        if not set(required)<=set(reader.fieldnames or []):
            raise ValueError("Unexpected schema: "+path.name)
        return list(reader)
def integer(value):
    try:
        return int(value)
    except (ValueError,TypeError):
        return None
def by_id(rows,field):
    values=defaultdict(set)
    for r in rows:
        i=integer(r.get("ID")); v=(r.get(field) or "").strip()
        if i and v: values[i].add(v)
    return {i:next(iter(v)) for i,v in values.items() if len(v)==1}
def base_values(rows,fields):
    values=defaultdict(set)
    for r in rows:
        i=integer(r.get("SpellID"))
        if not i or integer(r.get("DifficultyID"))!=0: continue
        vals=tuple(integer(r.get(f)) for f in fields)
        if all(v is not None and v>=0 for v in vals): values[i].add(vals)
    return {i:next(iter(v)) for i,v in values.items() if len(v)==1}
def build(guide,en,zh,abilities,levels=(),cooldowns=()):
    names=by_id(en,"Name_lang"); local=by_id(zh,"Name_lang")
    lv=base_values(levels,("SpellLevel",)); cd=base_values(cooldowns,("RecoveryTime","CategoryRecoveryTime"))
    index=defaultdict(set)
    for r in abilities:
        i=integer(r.get("Spell")); mask=integer(r.get("ClassMask"))
        if not i or i not in names or mask is None or mask<=0: continue
        for cls,bit in BITS.items():
            if mask&bit:index[cls,names[i]].add(i)
    wanted=defaultdict(set)
    for g in guide["specs"].values():wanted[g["class"]].update(x[1] for x in g["skills"])
    for cls,rows in guide["common"].items():wanted[cls].update(x[1] for x in rows)
    out={}
    for cls,keys in wanted.items():
        out[cls]={}
        for name in sorted(keys):
            ids=index.get((cls,name),set())
            if not ids:continue
            records=[]
            for i in sorted(ids):
                row={"id":i}
                if i in local and CJK.search(local[i]):row["name"]=local[i]
                if i in lv:row["level"]=lv[i][0]
                if i in cd:row["cooldownMs"],row["categoryCooldownMs"]=cd[i]
                records.append(row)
            labels={r.get("name") for r in records}
            out[cls][name]={"records":records}
            if len(labels)==1 and None not in labels:out[cls][name]["name"]=next(iter(labels))
    return out
def main(root,guide,build_id,output):
    en=table(root/"spells-enUS.csv",("ID","Name_lang"))
    zh=table(root/"spells-zhTW.csv",("ID","Name_lang"))
    abilities=table(root/"SkillLineAbility.csv",("Spell","ClassMask"))
    def optional(name,fields):
        try:return table(root/name,fields)
        except (OSError,ValueError) as e:
            print("Optional skill table unavailable:",e);return []
    data=build(guide,en,zh,abilities,optional("SpellLevels.csv",("SpellID","DifficultyID","SpellLevel")),optional("SpellCooldowns.csv",("SpellID","DifficultyID","RecoveryTime","CategoryRecoveryTime")))
    count=sum(len(x) for x in data.values())
    if not count:raise ValueError("No class-matched guide skills")
    print("Class-matched skill names:",count,"spell records:",sum(len(x["records"]) for c in data.values() for x in c.values()))
    Path(output).write_text(json.dumps({"build":build_id,"classes":data,"source":"Wago DB2: SpellName, SkillLineAbility, SpellLevels, SpellCooldowns"},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
if __name__=="__main__":
    main(Path(sys.argv[1]),json.loads(Path("spec-skill-guides.json").read_text(encoding="utf-8")),sys.argv[2],sys.argv[3])
