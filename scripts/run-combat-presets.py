"""Run a bounded subset of upstream WoWSims presets; never invent missing values."""
import copy, json, math, re, subprocess, sys, tempfile, time
from pathlib import Path

RELEASE="v1.0.12"
COMMIT="3b9c125a9b1387cd53ce2bb12969e0c6b54b813e"
ITERATIONS=1000
SEED=1
CASES=[
 ("spec-7","獸王／寵物遠程","ui/specs/hunter/dps/builds/bm.siml","ui/specs/hunter/dps/apls/turret_hawk.apl.siml"),
 ("spec-8","射擊／獨行遠程","ui/specs/hunter/dps/builds/mm.siml","ui/specs/hunter/dps/apls/turret.apl.siml"),
 ("spec-9","生存／近遠穿插","ui/specs/hunter/dps/builds/sv_weave.siml","ui/specs/hunter/dps/apls/default.apl.siml"),
 ("spec-5","防護騎／盾牌坦克","ui/specs/paladin/protection/defaults.siml","ui/specs/paladin/protection/apls/default.apl.siml"),
 ("spec-9","生存／純近戰","ui/specs/hunter/dps/builds/sv_melee.siml","ui/specs/hunter/dps/apls/melee.apl.siml"),
 ("spec-6","懲戒／聖印連動","ui/specs/paladin/retribution/builds/unsealed_wrath.siml","ui/specs/paladin/retribution/apls/uw_sor_sof.apl.siml"),
 ("spec-6","懲戒／神聖震擊","ui/specs/paladin/retribution/builds/holy_shock.siml","ui/specs/paladin/retribution/apls/holy_shock.apl.siml"),
]
# Exact upstream paths and talent strings verified at COMMIT. Reconstructed JSON
# trials intentionally omit consumables; they are not copies of the UI defaults.
JSON_BUILDS=[
 ("spec-17","增強／上游預設","shaman/enhancement/builds/default.build.json"),
 ("spec-22","痛苦／Wrack","warlock/dps/builds/aff_wrack.build.json"),
 ("spec-23","惡魔／Fire Brand","warlock/dps/builds/demo_fire_brand.build.json"),
 ("spec-24","毀滅／上游預設","warlock/dps/builds/destro.build.json"),
 ("spec-23","惡魔／Shadow Brand","warlock/dps/builds/demo_shadow_brand.build.json"),
 ("spec-22","痛苦／SM Ruin","warlock/dps/builds/sm_ruin.build.json"),
]
SIML_BUILDS=[
 ("spec-15","暗影／上游預設","priest/dps/defaults.siml"),
 ("spec-16","元素／上游預設","shaman/elemental/defaults.siml"),
 ("spec-25","平衡／上游預設","druid/balance/defaults.siml"),
]
# spec, label, folder, gear stem, APL stem, talent code, player oneof field.
RECONSTRUCTED=[
 ("spec-1","武器／雙手","warrior/dps","prebis_arms","arms","30303213132215201-55050000002-2","dpsWarrior"),
 ("spec-2","狂怒／雙持","warrior/dps","prebis_fury","fury","30303213002-050530045122100231","dpsWarrior"),
 ("spec-3","防護戰／平衡","warrior/protection","prebis_balanced","default","05-05050005-150531120300001351","protectionWarrior"),
 ("spec-10","刺殺／截肢","rogue/dps","muti","default","00530311231251031-32030302020103-001","rogue"),
 ("spec-11","戰鬥／邪惡攻擊","rogue/dps","sinister","default","00530320201-3200132202012321551","rogue"),
 ("spec-12","敏銳／出血","rogue/dps","hemo","default","00530301-320003-005233031321001151","rogue"),
 ("spec-19","秘法／上游 APL","mage/dps","preraid","arcane","050205223101311531-5500003-003","mage"),
 ("spec-20","火焰／上游 APL","mage/dps","preraidFire","deepFire","0502052001001-55500001230133031-003","mage"),
 ("spec-21","冰霜／上游 APL","mage/dps","preraidFrost","frost","203205-5-053500011121331251","mage"),
 ("spec-3","防護戰／進攻","warrior/protection","prebis_offensive","default","3-0505000501-050032120331021351","protectionWarrior"),
 ("spec-2","狂怒／雙手","warrior/dps","prebis_fury_2h","fury_2h","30303213032-050500350122110231","dpsWarrior"),
 ("spec-11","戰鬥／背刺","rogue/dps","backstab","default","005303002-3203030202012321351-005","rogue"),
 ("spec-19","秘法／秘火","mage/dps","preraid","arcaneFireFill","050205203100311531-525000012001-003","mage"),
 ("spec-21","冰霜／冥想","mage/dps","preraidFrost","frost","2032250100003--053500001121331251","mage"),
]
HEALERS={"spec-4":"paladin/holy","spec-13":"priest/healer","spec-14":"priest/healer","spec-18":"shaman/restoration","spec-28":"druid/restoration"}
TANKS={"spec-3","spec-5","spec-27"}
def finite(x): return type(x) in (float,int) and math.isfinite(x)
def invoke(cli,root,args,payload=None):
    result=subprocess.run([str(cli),*args],cwd=root,input=payload,text=True,capture_output=True,timeout=45,check=True)
    data=json.loads(result.stdout)
    if not isinstance(data,dict) or data.get("error"):
        raise ValueError("Engine reported error: "+str(data.get("error"))[:500])
    return data
def apl_result(data):
    if not finite(data.get("dps",{}).get("mean")) or data["dps"]["mean"]<0 or not finite(data.get("duration")) or data["duration"]<=0 or data.get("iterations")!=ITERATIONS:
        raise ValueError("Incomplete APL simulation")
    events=[{"timeMs":x["timeMs"],"label":str(x.get("label") or x.get("path") or "")[:500]} for x in data.get("timeline",[]) if isinstance(x,dict) and finite(x.get("timeMs"))]
    if not events: raise ValueError("No recorded APL actions")
    spells=[{"name":str(x.get("name") or x.get("id") or "")[:100],"dps":x["dps"],"casts":x.get("casts")} for x in data.get("spells",[]) if isinstance(x,dict) and finite(x.get("dps"))]
    return {"dps":data["dps"]["mean"],"duration":data["duration"],"iterations":data["iterations"],"timeline":events[:400],"spells":sorted(spells,key=lambda x:-x["dps"])[:30],"character":data.get("character",{})}
def tank_result(cli,root,settings_file):
    # Mirror individualSimRequest's single-player party, buffs, debuffs, tank and encounter fields.
    # This preset has Enchanting; no ring-enchant stripping is needed.
    d=invoke(cli,root,["siml","parse","-json",settings_file])
    p=d.get("player")
    if not isinstance(p,dict) or not ("protectionPaladin" in p or "feralBearDruid" in p) or not p.get("rotation") or not d.get("encounter"):
        raise ValueError("Tank preset settings incomplete")
    raid={"parties":[{"players":[p],"buffs":d.get("partyBuffs",{})},{},{},{},{}],
          "buffs":d.get("raidBuffs",{}),"debuffs":d.get("debuffs",{}),"tanks":d.get("tanks",[]),"targetDummies":d.get("targetDummies",0)}
    request={"raid":raid,"encounter":d["encounter"],"simOptions":{"iterations":ITERATIONS,"randomSeed":str(SEED),"debugFirstIteration":True},"type":"SimTypeIndividual"}
    with tempfile.TemporaryDirectory() as tmp:
        path=Path(tmp)/"request.json";path.write_text(json.dumps(request),encoding="utf-8")
        result=invoke(cli,root,["sim","--infile",str(path)])
    players=[p for party in result.get("raidMetrics",{}).get("parties",[]) for p in party.get("players",[]) if finite(p.get("threat",{}).get("avg"))]
    if len(players)!=1 or result.get("iterationsDone")!=ITERATIONS:
        raise ValueError("Incomplete tank result")
    p=players[0]
    return {k:p[field]["avg"] for k,field in (("dps","dps"),("tps","threat"),("dtps","dtps"),("hps","hps")) if finite(p.get(field,{}).get("avg"))}|{"iterations":ITERATIONS,"death":p.get("chanceOfDeath"),"logs":str(result.get("logs") or "")[:80000]}
def feral_setups(root):
    # The upstream cat/bear defaults are TypeScript, not complete SIML setups.
    # Rebuild explicit controlled, no-consumable/no-item-swap cases using the upstream
    # talent strings, gear files and adaptive APL. Do not claim they equal web defaults.
    out=[]
    for spec,folder,code,gear,weapon,label in [
        ("spec-26","feralcat","050021-53200032123012125001-055","pre_raid.gear.siml","the_unstoppable_force","貓德／無堅不摧之力"),
        ("spec-26","feralcat","050021-53200032123012125001-055","pre_raid.gear.siml","bonecrusher","貓德／碎骨者"),
        ("spec-27","feralbear","050022-5023030212310112501-055","default.gear.siml",None,"熊德／上游60級裝備"),
    ]:
        base=Path("ui/specs/druid")/folder
        original=base/"gear_sets"/gear
        selected=original
        if weapon=="bonecrusher":
            raw=(root/original).read_text(encoding="utf-8")
            if raw.count("the_unstoppable_force")!=1:raise ValueError("Cat reference weapon changed")
            selected=base/"gear_sets"/"gt_bonecrusher.gear.siml"
            (root/selected).write_text(raw.replace("the_unstoppable_force","bonecrusher"),encoding="utf-8")
        bear=spec=="spec-27"
        filename=base/("gt_"+(weapon or "bear")+".siml")
        apl=base/"apls/adaptive.apl.siml"
        setup=f"""siml 1
spec {'feral_bear_druid' if bear else 'feral_cat_druid'}
talents "{code}"
use "gear_sets/{selected.name}"
use "apls/adaptive.apl.siml"

settings:
  race tauren
  profession1 engineering
  profession2 enchanting
  reaction_time 250ms
  distance_from_target 25
  assume_bleed_active
"""
        if bear:setup+="  in_front_of_target\n  tanks player1\n  healing_model(hps=2200, cadence_seconds=0.4, cadence_variation=1.2, absorb_frac=0.02, burst_window=6, inspiration_uptime=0.25)\n"
        setup+="""\nbuffs:
  greater_blessing_of_kings
  greater_blessing_of_might 1

party_buffs: mana_spring_totem

raid_buffs:
  arcane_intellect, prayer_of_spirit, mark_of_the_wild, power_word_fortitude
  strength_of_earth_totem 1
  grace_of_air_totem 1
  windfury_totem
  battle_shout 1

debuffs:
  judgement_of_wisdom, sunder_armor, gift_of_arthas, vindication

encounter:
  duration 180
  duration_variation 5
  execute_proportion_20 0.2
  execute_proportion_35 0.35
  targets(id=31146, name="Raid Target", level=63, mob_type=dragonkin, stats(attack_power=320, block_value=54, armor=3731, health=1428900), min_base_damage="""+("6000" if bear else "2601")+""", damage_spread=0.5, swing_speed=2, parry_haste, can_crush)
"""
        (root/filename).write_text(setup,encoding="utf-8")
        config="本站控制變因測試；牛頭人、團隊增益、180±5秒、63級單體首領、隊友維持流血；無消耗品、無換武器。"+("熊坦承傷假設與上游預設裝備（不保證當前可取得），治療模型2200 HPS。" if bear else "同一天賦、附魔與其他裝備，只變更雙手武器。")
        out.append((spec,label,str(filename),str(apl),str(original),config))
    return out
def feral_variants(root, base_cases):
    """Additional controlled trials: keep the base gear, buffs and APL fixed
    except for the explicitly changed encounter length or energy threshold."""
    variants=[]
    for spec,label,settings,apl,source,configuration in base_cases:
        if spec!="spec-26":
            continue
        path=Path(settings)
        raw=(root/path).read_text(encoding="utf-8")
        if raw.count("  duration 180\n")!=1:
            print("Feral duration template changed:",label)
            continue
        for duration in (30,60,120):
            target=path.with_name(path.stem+f"_d{duration}.siml")
            (root/target).write_text(raw.replace("  duration 180\n",f"  duration {duration}\n"),encoding="utf-8")
            config=configuration.replace("180±5秒",f"{duration}±5秒")
            variants.append((spec,label+f"／{duration}秒",str(target),apl,source,config))
        # Test the verified upstream Shifting Power threshold on one weapon only.
        if path.stem!="gt_the_unstoppable_force":
            continue
        ap=Path(apl)
        ar=(root/ap).read_text(encoding="utf-8")
        declaration="var $"+ "{Shifting Power energy ceiling} = 53"
        if ar.count(declaration)!=1 or raw.count('use "apls/adaptive.apl.siml"')!=1:
            print("Feral APL threshold template changed:",label)
            continue
        for threshold in (40,65):
            target_ap=ap.with_name(f"gt_shift_{threshold}.apl.siml")
            (root/target_ap).write_text(ar.replace(declaration,declaration.rsplit(" ",1)[0]+f" {threshold}"),encoding="utf-8")
            target=path.with_name(path.stem+f"_shift{threshold}.siml")
            (root/target).write_text(raw.replace('use "apls/adaptive.apl.siml"',f'use "apls/{target_ap.name}"'),encoding="utf-8")
            config=configuration+" 本案例僅與無堅不摧之力基準比較：Shifting Power 能量門檻由53改為"+str(threshold)+"，其他條件不變。"
            variants.append((spec,label+f"／變形門檻{threshold}",str(target),str(target_ap),source,config))
    return variants

def comparison_group(spec, settings):
    if spec!="spec-26":
        return None
    match=re.search(r"_d(30|60|120)$",Path(settings).stem)
    return "貓德 "+(match.group(1) if match else "180")+"±5秒／相同遭遇"

def collect_sources(root, *entries):
    """Capture the exact generated and upstream SIML settings used by a case.
    Follow only quoted use paths under the pinned checkout; limit size/count.
    This is evidence for review, not a new executable input path.
    """
    seen=set()
    out=[]
    queue=[root/entry for entry in entries]
    while queue and len(out)<16:
        path=queue.pop(0).resolve()
        if path in seen or not path.is_relative_to(root) or path.suffix!=".siml":
            continue
        seen.add(path)
        try: raw=path.read_text(encoding="utf-8")
        except (OSError,UnicodeError): continue
        out.append({"path":str(path.relative_to(root)),"text":raw[:24000],"truncated":len(raw)>24000})
        for match in re.finditer(r'^\s*use\s+"([^"\n]+)"',raw,re.MULTILINE):
            queue.append(path.parent/match.group(1))
    return out

def read_json(root, relative):
    data=json.loads((root/relative).read_text(encoding="utf-8"))
    if not isinstance(data,dict):
        raise ValueError("Expected JSON object: "+relative)
    return data

def direct_jobs():
    out=[(spec,label,"json","ui/specs/"+path,None) for spec,label,path in JSON_BUILDS]
    out.extend((spec,label,"siml","ui/specs/"+path,None) for spec,label,path in SIML_BUILDS)
    out.extend((row[0],row[1],"reconstructed",None,row) for row in RECONSTRUCTED)
    # One case per spec before second builds or fight-length variants.
    seen=set()
    first=[]
    extra=[]
    for job in out:
        (extra if job[0] in seen else first).append(job)
        seen.add(job[0])
    return first,extra

def common_encounter(root):
    return copy.deepcopy(read_json(root,"ui/specs/shaman/enhancement/builds/default.build.json")["encounter"])

def direct_settings(root,cli,job):
    spec,label,kind,path,row=job
    if kind=="json":
        data=read_json(root,path)
        fallback=not bool(data.get("encounter"))
        if fallback:
            data["encounter"]=common_encounter(root)
        return data,path,path,[path],"上游完整 JSON 構築。"+("原始檔無遭遇；本站使用增強薩預設63級單體遭遇。" if fallback else "保留原始遭遇。")
    if kind=="siml":
        if path.startswith("__LOCAL__:"):
            actual=path.split(":",1)[1]
            source,apl,config=row
            data=invoke(cli,root,["siml","parse","-json",actual])
            return data,source,apl,[actual,apl],re.sub(r"\d+±\d+秒","原始戰鬥",config)+" 使用相同完整 SIML 設定，僅調整遭遇時間。"
        data=invoke(cli,root,["siml","parse","-json",path])
        return data,path,path,[path],"上游完整 SIML 構築，保留原始遭遇與 APL。"
    _,_,folder,gear,apl,talents,field=row
    base="ui/specs/"+folder
    gear_path=base+"/gear_sets/"+gear+".gear.json"
    apl_path=base+"/apls/"+apl+".apl.json"
    rotation=read_json(root,apl_path)
    tank=spec in TANKS
    warrior=field in ("dpsWarrior","protectionWarrior")
    mage=field=="mage"
    options={"classOptions":{}}
    if warrior:
        options["classOptions"]={"queueDelay":250,"startingRage":0 if tank else 50,"useBattleShout":True,"defaultStance":"WarriorStanceDefensive" if tank else "WarriorStanceBerserker","hasBsT2":False,"stanceSnapshot":True}
    if mage:
        options["classOptions"]={"defaultMageArmor":"MageArmorMageArmor"}
    if spec=="spec-11" and gear=="backstab":
        for var in rotation.get("valueVariables",[]):
            if var.get("name")=="Use Backstab":
                var["value"]={"const":{"val":"true"}}
    player={"apiVersion":2,"name":label,"race":"RaceOrc" if warrior else "RaceHuman","class":"ClassWarrior" if warrior else "ClassMage" if mage else "ClassRogue","equipment":read_json(root,gear_path),"talentsString":talents,"rotation":rotation,field:{"options":options},"reactionTimeMs":100,"distanceFromTarget":0 if tank else 20 if mage else 5,"profession1":"Engineering","profession2":"Enchanting","buffs":{"greaterBlessingOfKings":True,"greaterBlessingOfMight":1,"greaterBlessingOfWisdom":1}}
    template=read_json(root,"ui/specs/shaman/enhancement/builds/default.build.json")
    data={"player":player,"encounter":copy.deepcopy(template["encounter"]),"raidBuffs":template.get("raidBuffs",{}),"partyBuffs":template.get("partyBuffs",{}),"debuffs":template.get("debuffs",{})}
    if tank:
        player["inFrontOfTarget"]=True
        player["healingModel"]={"hps":760,"cadenceSeconds":0.3,"cadenceVariation":0.64,"absorbFrac":0.015,"burstWindow":6,"inspirationUptime":0.25}
        data["tanks"]=[{"type":"Player","index":0}]
    desc="本站控制構築：採上游裝備、天賦與 JSON APL，工程／附魔、同一團隊增減益與63級單體遭遇；戰士獸人，其他人類；無消耗品、毒藥或換裝，並非上游網頁完整預設。"
    if tank: desc+=" 採上游防戰治療模型760 HPS。"
    return data,gear_path,apl_path,[gear_path,apl_path,base+"/presets.ts"],desc

def direct_request(data,duration=None):
    p=copy.deepcopy(data.get("player"))
    encounter=copy.deepcopy(data.get("encounter"))
    if not isinstance(p,dict) or not p.get("rotation") or not isinstance(encounter,dict) or not encounter.get("targets"):
        raise ValueError("Missing character, rotation or encounter")
    if duration is not None:
        encounter["duration"]=duration
    raid={"parties":[{"players":[p],"buffs":data.get("partyBuffs",{})},{},{},{},{}],"buffs":data.get("raidBuffs",{}),"debuffs":data.get("debuffs",{}),"tanks":data.get("tanks",[]),"targetDummies":data.get("targetDummies",0)}
    return {"raid":raid,"encounter":encounter,"simOptions":{"iterations":ITERATIONS,"randomSeed":str(SEED),"debugFirstIteration":True},"type":"SimTypeIndividual"}

def direct_metrics(result):
    players=[p for party in result.get("raidMetrics",{}).get("parties",[]) for p in party.get("players",[]) if finite(p.get("dps",{}).get("avg"))]
    duration=result.get("avgIterationDuration")
    if len(players)!=1 or result.get("iterationsDone")!=ITERATIONS or not finite(duration) or duration<=0:
        raise ValueError("Incomplete native RaidSimResult")
    p=players[0]
    metrics={k:p[field]["avg"] for k,field in (("dps","dps"),("tps","threat"),("dtps","dtps"),("hps","hps")) if finite(p.get(field,{}).get("avg")) and p[field]["avg"]>=0}
    if "dps" not in metrics or metrics["dps"]<=0:
        raise ValueError("No positive DPS; rotation may be incomplete")
    if finite(p.get("chanceOfDeath")) and 0<=p["chanceOfDeath"]<=1:
        metrics["death"]=p["chanceOfDeath"]
    return metrics,duration,str(result.get("logs") or "")[:80000]

def direct_case(cli,root,job,duration=None):
    spec,label,kind,_,_=job
    data,settings,apl,source_paths,config=direct_settings(root,cli,job)
    request=direct_request(data,duration)
    with tempfile.TemporaryDirectory() as tmp:
        path=Path(tmp)/"request.json"
        path.write_text(json.dumps(request),encoding="utf-8")
        result=invoke(cli,root,["sim","--infile",str(path)])
    metrics,actual,logs=direct_metrics(result)
    if spec in TANKS and not finite(metrics.get("tps")):
        raise ValueError("Tank threat missing")
    p=data["player"]
    nominal=request["encounter"].get("duration")
    variation=request["encounter"].get("durationVariation",0)
    sources=[]
    for name in dict.fromkeys(source_paths):
        raw=(root/name).read_text(encoding="utf-8")
        sources.append({"path":name,"text":raw[:24000],"truncated":len(raw)>24000})
    raw=json.dumps(request,ensure_ascii=False,indent=2)
    sources.insert(0,{"path":"本站實際 RaidSimRequest（JSON）","text":raw[:24000],"truncated":len(raw)>24000})
    group=label+"／"+str(nominal)+"秒"
    # Compare reconstructed builds only when they use the same controlled encounter.
    if kind=="reconstructed":
        group="本站控制構築／"+str(nominal)+"秒（±"+str(variation)+"秒）"
    return {"spec":spec,"label":label+("／"+str(duration)+"秒" if duration is not None else ""),"settings":settings,"apl":apl,"configuration":config+" 名義戰鬥 "+str(nominal)+"±"+str(variation)+" 秒。","comparisonGroup":group,"duration":actual,"iterations":ITERATIONS,"dps":metrics["dps"],"nativeMetrics":metrics,"nativeLog":logs,"timeline":[],"sources":sources,"character":{"talents":p.get("talentsString",""),"race":p.get("race","")}}

def main(cli,root,output):
    output=Path(output).resolve();root=Path(root).resolve();cli=Path(cli).resolve()
    cases=[]
    feral_extra=[]
    cases_to_run=[(*case,case[2],"") for case in CASES]
    try:
        base=feral_setups(root)
        cases_to_run=base+cases_to_run
        try:feral_extra=feral_variants(root,base)
        except (OSError,ValueError) as e:feral_extra=[];print("Feral variants unavailable:",str(e)[:400])
    except (OSError,ValueError) as e:print("Feral setup unavailable:",str(e)[:400])
    failed=[]
    first_direct,extra_direct=direct_jobs()
    # Prioritize one baseline for every supported spec, then variants for all specs.
    siml_first=[]
    siml_extra=[]
    seen=set()
    for entry in cases_to_run:
        (siml_extra if entry[0] in seen else siml_first).append(entry)
        seen.add(entry[0])
    planned=len(cases_to_run)+len(feral_extra)+len(first_direct)*2+len(extra_direct)+len(siml_first)
    start=time.monotonic()
    def publish():
        payload={"format":1,"release":RELEASE,"commit":COMMIT,"seed":SEED,"cases":cases,"planned":planned,"failed":failed,"healerPending":[{"spec":spec,"source":"ui/specs/"+folder+"/presets.ts","reason":"尚缺可驗證的治療遭遇、完整技能策略及有效治療基準；不以 DPS 代替 HPS。"} for spec,folder in HEALERS.items()],"scope":"Upstream and controlled presets, not guild BiS. SIML CLI does not add the UI-generated potion/conjured APL rows. Timeline is one iteration."}
        temp=output.with_suffix(output.suffix+".tmp")
        temp.write_text(json.dumps(payload,ensure_ascii=False,allow_nan=False),encoding="utf-8")
        temp.replace(output)
    def run_direct(job,duration=None):
        spec,label=job[:2]
        try:
            d=direct_case(cli,root,job,duration)
            json.dumps(d,ensure_ascii=False,allow_nan=False)
            cases.append(d)
            print("Native raw preset:",spec,d["label"],flush=True)
        except (OSError,ValueError,KeyError,TypeError,subprocess.SubprocessError) as e:
            print("Native raw preset unavailable:",spec,str(e)[:300],flush=True)
            failed.append({"spec":spec,"label":label+("／"+str(duration)+"秒" if duration else "")})
        publish()
    def run_siml_case(entry):
        spec,label,settings,apl,source,configuration=entry
        try:
            request={"siml":(root/apl).read_text(encoding="utf-8"),"path":apl,"settingsFile":settings,"iterations":ITERATIONS,"seed":SEED,"timeline":True,"timelineLimit":400}
            d=apl_result(invoke(cli,root,["siml","sim"],json.dumps(request)))
            apl_source=str(Path(apl).with_name("adaptive.apl.siml")) if Path(apl).name.startswith("gt_shift_") else apl
            d.update({"spec":spec,"label":label,"settings":source,"apl":apl_source,"configuration":configuration,"comparisonGroup":comparison_group(spec,settings),"sources":collect_sources(root,settings,apl)})
            if spec in ("spec-5","spec-27"):
                try:d["tank"]=tank_result(cli,root,settings)
                except (OSError,ValueError,subprocess.SubprocessError) as e:print("Tank metrics unavailable:",str(e)[:300])
            # Reject invalid numeric payloads before adding them to the partial snapshot.
            json.dumps(d,ensure_ascii=False,allow_nan=False)
            cases.append(d);print("Native engine preset:",spec,"iterations",d["iterations"],"timeline",len(d["timeline"]))
            publish()
        except (OSError,ValueError,KeyError,TypeError,subprocess.SubprocessError) as e:
            print("Preset unavailable:",spec,str(e)[:400])
            failed.append({"spec":spec,"label":label})
            publish()
    # Execute baseline for every class first, before optional variants.
    # Interleave the two execution formats so neither class group starves.
    for index in range(max(len(first_direct),len(siml_first))):
        if index<len(first_direct):run_direct(first_direct[index])
        if index<len(siml_first):run_siml_case(siml_first[index])
    # Bounded second pass: every DPS/tank spec gets a short encounter trial before optional builds.
    for job in first_direct:
        if time.monotonic()-start>1200:break
        run_direct(job,60)
    for spec,label,settings,apl,source,configuration in siml_first:
        if time.monotonic()-start>1200:break
        # Parse the complete settings into a raw RaidSimRequest, retaining its APL.
        run_direct((spec,label,"siml","__LOCAL__:"+settings,(source,apl,configuration)),60)
    for entry in siml_extra:
        if time.monotonic()-start>1200:break
        run_siml_case(entry)
    for job in extra_direct:
        if time.monotonic()-start>1200:break
        run_direct(job)
    for entry in feral_extra:
        if time.monotonic()-start>1200:break
        run_siml_case(entry)
    publish()
    if not cases: raise SystemExit("No successful native engine samples")

if __name__=="__main__":main(*sys.argv[1:])
