"""Bounded native set-vs-scatter trials using successful guild requests.
Candidate selection is a transparent same-slot/item-level heuristic, not BiS.
All cases use the exact same encounter/APL/buffs and native engine effects.
"""
import copy,importlib.util,json,sys,time
from collections import Counter
from pathlib import Path

spec=importlib.util.spec_from_file_location("presets",Path(__file__).with_name("run-combat-presets.py"))
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
SLOTS=["Head","Neck","Shoulder","Back","Chest","Wrist","Hands","Waist","Legs","Feet","Finger","Finger","Trinket","Trinket"]
CLASSES=["Warrior","Warrior","Warrior","Paladin","Paladin","Paladin","Hunter","Hunter","Hunter","Rogue","Rogue","Rogue","Priest","Priest","Priest","Shaman","Shaman","Shaman","Mage","Mage","Mage","Warlock","Warlock","Warlock","Druid","Druid","Druid","Druid"]
CLASS_IDS={"Warrior":1,"Paladin":2,"Hunter":3,"Rogue":4,"Priest":5,"Shaman":7,"Mage":8,"Warlock":9,"Druid":11}
ARMOR={"Warrior":3,"Paladin":3,"Hunter":2,"Shaman":2,"Rogue":1,"Druid":1,"Priest":0,"Mage":0,"Warlock":0}
ARMOR_ORDER={"Cloth":0,"Leather":1,"Mail":2,"Plate":3}
def num(value,default=0):
    try:return int(value)
    except (ValueError,TypeError):return default
def eligible(item,cls):
    if item.get("item_class")!="Armor" or num(item.get("estimated")) or not item.get("source_summary") or num(item.get("required_level"))>60 or item.get("required_reputation") or item.get("required_skill") or item.get("required_profession"):return False
    mask=num(item.get("class_mask"),-1)
    if mask not in (0,-1) and not mask&(1<<(CLASS_IDS[cls]-1)):return False
    sub=item.get("subclass")
    return sub not in ARMOR_ORDER or ARMOR_ORDER[sub]<=ARMOR[cls]
def slot_matches(item,slot):
    return item.get("slot")==slot or slot=="Chest" and item.get("slot")=="Robe"
def item_set(item):
    return str(item.get("item_set") or "").strip()
def player(request):
    return request["raid"]["parties"][0]["players"][0]

def prepare_catalog(items):
    """Index source-qualified gear once, shared by all scenarios/spec trials."""
    by_id={num(x.get("id")):x for x in items if isinstance(x,dict)}
    classes={}
    for cls in CLASS_IDS:
        sets={};scatter={};class_sets=Counter();bit=1<<(CLASS_IDS[cls]-1)
        for x in by_id.values():
            if num(x.get("id"))<=0 or not eligible(x,cls):continue
            name=item_set(x)
            slot="Chest" if x.get("slot")=="Robe" else x.get("slot")
            key=(slot,x.get("subclass"))
            if name:
                sets.setdefault(name,{}).setdefault(key,[]).append(x)
                mask=num(x.get("class_mask"),-1)
                if mask not in (-1,0) and mask&bit:class_sets[name]+=1
            else:scatter.setdefault(key,[]).append(x)
        classes[cls]=(sets,scatter,class_sets)
    return by_id,classes

def set_plan(request,spec_id,items,registry,excluded=(),prepared=None):
    p=player(request);gear=p.get("equipment",{}).get("items",[])
    if len(gear)!=17 or p.get("enableItemSwap") or any(x.get("id") for x in p.get("itemSwap",{}).get("items",[]) if isinstance(x,dict)) or '"itemSwap":' in json.dumps(p.get("rotation",{})):return None
    cls=CLASSES[int(spec_id.split("-")[1])-1]
    index,classes=prepared if prepared is not None else prepare_catalog(items)
    sets,scatter,class_sets=classes[cls]
    current=[index.get(num(x.get("id"))) for x in gear[:14]]
    if any(x is None and gear[i].get("id") for i,x in enumerate(current)):return None
    # Prefer worn sets, then explicitly class-restricted candidate sets.
    names=Counter(item_set(x) for x in current if x and item_set(x))
    order=list(set(names)|set(class_sets))
    order.sort(key=lambda name:(-names.get(name,0),-class_sets.get(name,0),name))
    for name in order:
        if name in excluded:continue
        matches=[s for s in registry if name in (s.get("name"),s.get("alternativeName"))]
        if len(matches)!=1:continue
        registered=matches[0]
        thresholds=sorted({num(b.get("pieces")) for b in registered.get("bonuses",[]) if 1<num(b.get("pieces"))<=14})
        if not thresholds:continue
        available=sets.get(name,{})
        # Restrict to positions already occupied by this set or a compatible
        # same-subclass piece. Include both rings and trinkets; weapons remain fixed.
        positions=[]
        reserved={num(x.get("id")) for x in gear if x.get("id")}
        used=set()
        for i,slot in enumerate(SLOTS):
            old=current[i]
            if not old:continue
            old_id=num(old.get("id"));old_set=item_set(old)==name
            candidates=[x for x in available.get((slot,old.get("subclass")),[]) if (num(x["id"]) not in reserved or num(x["id"])==old_id) and num(x["id"]) not in used]
            if not candidates:continue
            # Closest item level to original piece, then quality and ID.
            key=lambda x:(abs(num(x.get("item_level"))-num(old.get("item_level"))),-num(x.get("quality")),num(x["id"]))
            chosen=old if old_set else min(candidates,key=key)
            if old_set:
                alternatives=[x for x in scatter.get((slot,old.get("subclass")),[]) if num(x["id"]) not in reserved|used]
                if not alternatives:continue
                loose=min(alternatives,key=key)
            else:
                if item_set(old):continue # do not remove another set
                loose=old
            used.update((num(chosen["id"]),num(loose["id"])))
            positions.append((i,chosen,loose,abs(num(chosen.get("item_level"))-num(loose.get("item_level")))))
        worn={i for i,x in enumerate(current) if x and item_set(x)==name}
        if not worn<={i for i,_,_,_ in positions}:continue
        possible=[n for n in thresholds if n<=len(positions)]
        if not possible:continue
        swapped=p.get("itemSwap",{}).get("items",[])
        if any(i<len(swapped) and swapped[i].get("id") for i,_,_,_ in positions):continue
        positions.sort(key=lambda x:(x[3],x[0]))
        cases=[]
        # Prioritize registered thresholds, then adjacent pre-threshold counts.
        adjacent=sorted({n-1 for n in possible if n>1 and n-1 not in possible})
        for count in [0,*possible,*adjacent]:
            req=copy.deepcopy(request);g=player(req)["equipment"]["items"]
            for rank,(i,yes,no,_) in enumerate(positions):
                g[i]={"id":num((yes if rank<count else no)["id"])}
            cases.append((count,req))
        return {"name":name,"setId":registered.get("id"),"source":registered.get("source"),"thresholds":possible,"registeredThresholds":thresholds,"adjacentCounts":adjacent,"cases":cases,"positions":[i for i,_,_,_ in positions],"items":[{"slot":SLOTS[i],"setId":num(yes["id"]),"scatterId":num(no["id"])} for i,yes,no,_ in positions]}
    return None

def run(cli,root,site):
    site=Path(site).resolve();root=Path(root).resolve();cli=Path(cli).resolve()
    def read(name):return json.loads((site/name).read_text(encoding="utf-8"))
    snapshot=read("combat-presets.json");catalog=read("gear-catalog.json");registry=read("set-effects.json")
    if snapshot.get("commit")!=mod.COMMIT or registry.get("commit")!=mod.COMMIT:raise ValueError("Mismatched native snapshot")
    results=[];jobs=[];seen=set();prepared=prepare_catalog(catalog["items"])
    # First boss, then single mob, then five mobs. Round-robin specs within each.
    order={"guild-boss":0,"guild-50k":1,"guild-5x50k":2}
    for case in sorted(snapshot.get("cases",[]),key=lambda x:(order.get(x.get("scenario"),9),num(str(x.get("spec","")).split("-")[-1]))):
        sid=case.get("spec");scenario=case.get("scenario");file=case.get("requestFile")
        if scenario not in order or not isinstance(sid,str) or sid not in {"spec-"+str(i) for i in range(1,29)} or not file or (sid,scenario) in seen:continue
        if not isinstance(file,str) or not file.startswith("combat-requests/"+sid+"-") or ".." in file:continue
        try:
            request=read(file);excluded=set()
            for rank in range(3):
                plan=set_plan(request,sid,catalog["items"],registry["sets"],excluded,prepared)
                if not plan:break
                excluded.add(plan["name"])
                row={"spec":sid,"scenario":scenario,"setName":plan["name"],"setId":plan["setId"],"source":plan["source"],"thresholds":plan["thresholds"],"registeredThresholds":plan["registeredThresholds"],"adjacentCounts":plan["adjacentCounts"],"positions":plan["positions"],"items":plan["items"],"baseLabel":case.get("label"),"candidateRank":rank,"cases":[],"failed":[]}
                results.append(row);jobs.append((row,plan["cases"]))
            if excluded:seen.add((sid,scenario))
        except (ValueError,KeyError,TypeError,OSError):continue
    start=time.monotonic()
    def save(finished=False):
        dest=site/"set-trials.json";temp=dest.with_suffix(".tmp")
        temp.write_text(json.dumps({"commit":mod.COMMIT,"release":mod.RELEASE,"catalogBuild":catalog["meta"].get("client_build"),"scope":"同部位、同護甲類型、接近物品等級的原生套裝控制比較；每專精遭遇最多3套候選，優先已穿套裝及明確職業限定套裝，不代表最佳散件或完整BiS。","finished":finished,"elapsedSeconds":round(time.monotonic()-start,1),"trials":results},ensure_ascii=False,allow_nan=False),encoding="utf-8");temp.replace(dest)
    save()
    def execute(row,count,request):
        try:
            import tempfile
            with tempfile.TemporaryDirectory() as tmp:
                path=Path(tmp)/"request.json";path.write_text(json.dumps(request),encoding="utf-8")
                raw=mod.invoke(cli,root,["sim","--infile",str(path)])
            metrics,duration,_=mod.direct_metrics(raw)
            if row["spec"] in mod.TANKS and not all(mod.finite(metrics.get(k)) for k in ("tps","dtps","death")):raise ValueError("Tank metrics missing")
            file=mod.write_request_file(site,row["spec"],request)
            row["cases"].append({"pieces":count,"metrics":metrics,"duration":duration,"iterations":raw["iterationsDone"],"requestFile":file})
            print("Set trial:",row["spec"],row["scenario"],row["setName"],count,flush=True)
        except (OSError,ValueError,KeyError,TypeError,mod.subprocess.SubprocessError) as e:
            row["failed"].append({"pieces":count,"reason":mod.failure_kind(e)})
        save()
    # Pair 0 pieces with the first threshold so limited CI time produces
    # useful comparisons instead of many isolated controls. Then add higher
    # thresholds in rounds, prioritizing the same boss for each spec.
    for rank in range(3):
      for scenario in order:
        cohort=[(row,cases) for row,cases in jobs if row["scenario"]==scenario and row["candidateRank"]==rank]
        for row,cases in cohort:
            if time.monotonic()-start>660:save(True);return
            execute(row,*cases[0])
            if not row["cases"]:continue
            if len(cases)>1 and time.monotonic()-start<=660:execute(row,*cases[1])
        for step in range(2,max((len(row["thresholds"])+1 for row,_ in cohort),default=0)):
            for row,cases in cohort:
                if time.monotonic()-start>660:save(True);return
                if step<=len(row["thresholds"]) and any(c["pieces"]==0 for c in row["cases"]):execute(row,*cases[step])
      # Additional adjacent-count trials follow all three encounters for this rank.
      for scenario in order:
        for row,cases in jobs:
            if row["scenario"]!=scenario or row["candidateRank"]!=rank or not any(c["pieces"]==0 for c in row["cases"]):continue
            for count,request in cases[len(row["thresholds"])+1:]:
                if time.monotonic()-start>660:save(True);return
                execute(row,count,request)
    save(True)
if __name__=="__main__":run(*sys.argv[1:])
