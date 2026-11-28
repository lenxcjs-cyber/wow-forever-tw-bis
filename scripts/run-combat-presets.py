"""Run a bounded subset of upstream WoWSims presets; never invent missing values."""
import copy, hashlib, json, math, re, subprocess, sys, tempfile, time
from collections import Counter
from datetime import datetime, timezone
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
GUILD_SCENARIOS={"guild-50k":{"label":"60級單體／5萬血","level":60,"health":50000,"count":1,"duration":60},"guild-boss":{"label":"63級首領／30萬血","level":63,"health":300000,"count":1,"duration":180},"guild-5x50k":{"label":"60級五目標／各5萬血","level":60,"health":50000,"count":5,"duration":60}}
def guild_scenario(request,spec,key,duration=None):
    """Fixed-duration engine fixture; health is not a kill-stop condition."""
    cfg=GUILD_SCENARIOS[key]
    result=copy.deepcopy(request)
    p=result["raid"]["parties"][0]["players"][0]
    tank=spec in TANKS
    p["inFrontOfTarget"]=tank
    result["raid"]["tanks"]=[{"type":"Player","index":0}] if tank else []
    stats=[0]*39
    stats[29]=cfg["health"]
    swing=1000 if cfg["level"]==63 else 300
    result["encounter"]={"apiVersion":result["encounter"].get("apiVersion",2),"duration":cfg["duration"] if duration is None else duration,"durationVariation":0,"executeProportion20":0.2,"executeProportion35":0.35,"targets":[{"name":cfg["label"]+" "+str(i+1),"level":cfg["level"],"mobType":"MobTypeUnknown","stats":stats.copy(),"minBaseDamage":swing,"damageSpread":0,"swingSpeed":2,"tankIndex":0 if tank else -1,"canCrush":cfg["level"]==63,"parryHaste":False} for i in range(cfg["count"])]}
    debuffs=result["raid"].get("debuffs",{})
    for name in list(debuffs):
        if re.search(r"sunder|exposeArmor|faerieFire|curseOfRecklessness|curseOfElements|curseOfShadow|armor|resistance",name,re.I):
            del debuffs[name]
    return result
def finite(x): return type(x) in (float,int) and math.isfinite(x)
def invoke(cli,root,args,payload=None):
    result=subprocess.run([str(cli),*args],cwd=root,input=payload,text=True,capture_output=True,timeout=45,check=True)
    data=json.loads(result.stdout)
    if not isinstance(data,dict):raise ValueError("Engine output must be a JSON object")
    if data.get("error"):raise ValueError("Engine reported error: "+str(data.get("error"))[:500])
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
    if len(players)!=1 or result.get("iterationsDone")!=ITERATIONS or not raid["tanks"]:
        raise ValueError("Incomplete tank result or no tank assignment")
    p=players[0]
    if not finite(p.get("dtps",{}).get("avg")) or p["dtps"]["avg"]<0 or p["threat"]["avg"]<0:
        raise ValueError("Missing or invalid tank threat/incoming damage")
    death=p.get("chanceOfDeath")
    return {k:p[field]["avg"] for k,field in (("dps","dps"),("tps","threat"),("dtps","dtps"),("hps","hps")) if finite(p.get(field,{}).get("avg")) and p[field]["avg"]>=0}|{"iterations":ITERATIONS,"death":death if finite(death) and 0<=death<=1 else None,"logs":str(result.get("logs") or "")[:80000]}
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

def ensure_encounter(data,root):
    encounter=data.get("encounter")
    if isinstance(encounter,dict) and encounter.get("targets"):
        return False
    data["encounter"]=common_encounter(root)
    return True

def failure_kind(error):
    if isinstance(error,subprocess.TimeoutExpired):
        return "timeout"
    if isinstance(error,FileNotFoundError):
        return "missing-source"
    if isinstance(error,subprocess.CalledProcessError):
        return "engine-exit"
    if isinstance(error,json.JSONDecodeError):
        return "invalid-json"
    if isinstance(error,(ValueError,KeyError,TypeError)):
        return "validation"
    return "io"

def direct_settings(root,cli,job):
    spec,label,kind,path,row=job
    if kind=="json":
        data=read_json(root,path)
        fallback=ensure_encounter(data,root)
        return data,path,path,[path],"上游完整 JSON 構築。"+("原始檔無遭遇；本站使用增強薩預設63級單體遭遇。" if fallback else "保留原始遭遇。")
    if kind=="siml":
        if path.startswith("__LOCAL__:"):
            actual=path.split(":",1)[1]
            source,apl,config=row
            data=invoke(cli,root,["siml","parse","-json",actual])
            fallback=ensure_encounter(data,root)
            return data,source,apl,[actual,apl],re.sub(r"\d+±\d+秒","原始戰鬥",config)+" 使用解析後 SIML 設定；調整名義時間或目標數。"+("原始構築未附目標，使用增強薩預設63級單體遭遇。" if fallback else "")
        data=invoke(cli,root,["siml","parse","-json",path])
        fallback=ensure_encounter(data,root)
        return data,path,path,[path],"上游 SIML 構築，保留原始 APL。"+("原始構築未附目標，使用增強薩預設63級單體遭遇。" if fallback else "保留原始遭遇。")
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

def direct_request(data,duration=None,targets=None):
    p=copy.deepcopy(data.get("player"))
    encounter=copy.deepcopy(data.get("encounter"))
    if not isinstance(p,dict) or not p.get("rotation") or not isinstance(encounter,dict) or not encounter.get("targets"):
        raise ValueError("Missing character, rotation or encounter")
    if duration is not None:
        if type(duration) not in (int,float) or not 1<=duration<=600:
            raise ValueError("Invalid encounter duration")
        encounter["duration"]=duration
    if targets is not None:
        if type(targets) is not int or not 1<=targets<=8 or len(encounter["targets"])!=1:
            raise ValueError("Target variant requires a single-target base and 1–8 targets")
        base=encounter["targets"][0]
        if not isinstance(base,dict) or base.get("disabledAtStart") or base.get("targetInputs") or base.get("secondTankIndex"):
            raise ValueError("Complex encounter is not a valid identical-target template")
        encounter["targets"]=[copy.deepcopy(base) for _ in range(targets)]
        for i,target in enumerate(encounter["targets"]):
            target["name"]=str(base.get("name") or "Raid Target")+" "+str(i+1)
            # Every copy has the same tank assignment as the source.
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
    for k,field in (("dps","dps"),("tps","threat"),("dtps","dtps"),("hps","hps")):
        deviation=p.get(field,{}).get("stdev")
        if finite(deviation) and deviation>=0:
            metrics[k+"Stdev"]=deviation
    if finite(p.get("secondsOomAvg")) and p["secondsOomAvg"]>=0:
        metrics["secondsOomAvg"]=p["secondsOomAvg"]
    tto=p.get("tto",{}).get("avg")
    if finite(tto) and tto>=0:
        metrics["tto"]=tto
    if finite(p.get("chanceOfDeath")) and 0<=p["chanceOfDeath"]<=1:
        metrics["death"]=p["chanceOfDeath"]
    return metrics,duration,str(result.get("logs") or "")[:80000]

def native_target_damage(result,request):
    """Mean received DPS per target, from engine encounter metrics.
    A weakest target can take much longer than total HP / total DPS suggests.
    These are stationary-target extrapolations, not kill times.
    """
    targets=result.get("encounterMetrics",{}).get("targets",[])
    config=request.get("encounter",{}).get("targets",[])
    if not isinstance(targets,list) or len(targets)!=len(config):return []
    rows=[]
    for i,(t,c) in enumerate(zip(targets,config)):
        if not isinstance(t,dict) or not isinstance(c,dict):return []
        d=t.get("dtps",{}).get("avg")
        stats=c.get("stats",[])
        hp=stats[29] if len(stats)>29 else None
        if not finite(d) or d<0 or not finite(hp) or hp<=0:return []
        rows.append({"index":i,"health":hp,"dps":d,"timeEstimate":hp/d if d>0 else None})
    return rows

def direct_action_rows(result):
    """Aggregate per-action totals across iterations, not average DPS.
    Keep pets distinct. Target-level cast counts may not equal unique casts.
    """
    iterations=result.get("iterationsDone")
    if not isinstance(iterations,int) or iterations<=0:
        return []
    players=[p for party in result.get("raidMetrics",{}).get("parties",[]) for p in party.get("players",[]) if finite(p.get("dps",{}).get("avg"))]
    if len(players)!=1:
        return []
    rows=[]
    def visit(unit,owner,depth=0):
        if depth>3 or not isinstance(unit,dict):
            return
        for action in unit.get("actions",[]):
            if not isinstance(action,dict) or not isinstance(action.get("id"),dict):
                continue
            aid=action["id"]
            identifier=next(((k,aid[k]) for k in ("spellId","itemId","otherId") if aid.get(k)),None)
            if not identifier:
                continue
            targets=action.get("targets",[])
            totals={}
            for field in ("damage","threat","healing","shielding","casts","manualCasts"):
                values=[t[field] for t in targets if isinstance(t,dict) and finite(t.get(field)) and t[field]>=0]
                if values:
                    totals[field]=sum(values)/iterations
            if not any(totals.values()):
                continue
            rows.append({"owner":owner[:100],"kind":identifier[0],"id":identifier[1],"tag":aid.get("tag",0),"rank":aid.get("rank",0),"passive":bool(action.get("isPassive")),**totals})
        for i,pet in enumerate(unit.get("pets",[])[:20]):
            if isinstance(pet,dict):
                visit(pet,owner+"／"+str(pet.get("name") or ("Pet "+str(i+1))),depth+1)
    visit(players[0],"角色")
    return sorted(rows,key=lambda x:max(x.get("damage",0),x.get("threat",0),x.get("healing",0)+x.get("shielding",0)),reverse=True)[:80]

def direct_comparison_group(request):
    """Only rank cases with identical encounter and external conditions.
    Builds can differ in gear, talents, rotation, personal consumables and race.
    """
    raid=request["raid"]
    party=raid["parties"][0]
    player=party["players"][0]
    conditions={"encounter":request["encounter"],"raidBuffs":raid.get("buffs",{}),"partyBuffs":party.get("buffs",{}),"debuffs":raid.get("debuffs",{}),"playerBuffs":player.get("buffs",{}),"tanks":raid.get("tanks",[]),"healingModel":player.get("healingModel",{}),"targetDummies":raid.get("targetDummies",0),"inFront":player.get("inFrontOfTarget",False),"simOptions":request["simOptions"]}
    encoded=json.dumps(conditions,sort_keys=True,separators=(",",":"),ensure_ascii=False,allow_nan=False)
    key=hashlib.sha256(encoded.encode("utf-8")).hexdigest()[:12]
    e=request["encounter"]
    return "原生引擎同條件／"+str(e.get("duration"))+"±"+str(e.get("durationVariation",0))+"秒／"+str(len(e.get("targets",[])))+"目標／"+key

def write_request_file(output_dir,spec,request):
    """Store the full validated request as a separate, content-addressed JSON file."""
    if not re.fullmatch(r"spec-(?:[1-9]|1[0-9]|2[0-8])",spec):
        raise ValueError("Invalid spec")
    payload=json.dumps(request,ensure_ascii=False,sort_keys=True,allow_nan=False,indent=2)
    if len(payload.encode("utf-8"))>8000000:
        raise ValueError("Native request too large")
    key=hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]
    directory=Path(output_dir)/"combat-requests"
    directory.mkdir(parents=True,exist_ok=True)
    name=spec+"-"+key+".json"
    path=directory/name
    temp=path.with_suffix(".json.tmp")
    temp.write_text(payload,encoding="utf-8")
    temp.replace(path)
    return "combat-requests/"+name

def direct_case(cli,root,job,duration=None,output_dir=None,targets=None,scenario=None):
    spec,label,kind,_,_=job
    data,settings,apl,source_paths,config=direct_settings(root,cli,job)
    request=direct_request(data,duration,targets)
    if scenario is not None:request=guild_scenario(request,spec,scenario,duration)
    with tempfile.TemporaryDirectory() as tmp:
        path=Path(tmp)/"request.json"
        path.write_text(json.dumps(request),encoding="utf-8")
        result=invoke(cli,root,["sim","--infile",str(path)])
    metrics,actual,logs=direct_metrics(result)
    if spec in TANKS and (not finite(metrics.get("tps")) or not finite(metrics.get("dtps")) or not request["raid"].get("tanks")):
        raise ValueError("Tank threat, incoming damage or assignment missing")
    p=request["raid"]["parties"][0]["players"][0]
    nominal=request["encounter"].get("duration")
    variation=request["encounter"].get("durationVariation",0)
    sources=[]
    for name in dict.fromkeys(source_paths):
        raw=(root/name).read_text(encoding="utf-8")
        sources.append({"path":name,"text":raw[:24000],"truncated":len(raw)>24000})
    raw=json.dumps(request,ensure_ascii=False,indent=2)
    sources.insert(0,{"path":"本站實際 RaidSimRequest（JSON）","text":raw[:24000],"truncated":len(raw)>24000})
    group=direct_comparison_group(request)
    request_file=write_request_file(output_dir,spec,request) if output_dir is not None else None
    suffix=("／"+GUILD_SCENARIOS[scenario]["label"] if scenario else "")+("／"+str(duration)+"秒" if duration is not None else "")+("／"+str(targets)+"目標" if targets is not None else "")
    if scenario:config+=" 公會標準遭遇覆蓋原目標；零基礎護甲及抗性、固定時間、坦克正面／其他背面；坦克受擊為示意每2秒300（首領1000）基礎傷害。非擊殺模擬。"
    return {"requestFile":request_file,"spec":spec,"label":label+suffix,"nominalDuration":nominal,"targetCount":len(request["encounter"]["targets"]),"scenario":scenario,"targetHealth":GUILD_SCENARIOS[scenario]["health"] if scenario else None,"targetLevel":GUILD_SCENARIOS[scenario]["level"] if scenario else None,"inFrontOfTarget":request["raid"]["parties"][0]["players"][0].get("inFrontOfTarget"),"settings":settings,"apl":apl,"configuration":config+" 名義戰鬥 "+str(nominal)+"±"+str(variation)+" 秒；"+str(len(request["encounter"]["targets"]))+" 個相同屬性目標。","comparisonGroup":group,"duration":actual,"iterations":ITERATIONS,"dps":metrics["dps"],"nativeMetrics":metrics,"nativeTargets":native_target_damage(result,request) if scenario else [],"nativeActions":direct_action_rows(result),"nativeLog":logs,"timeline":[],"sources":sources,"character":{"talents":p.get("talentsString",""),"race":p.get("race","")}}

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
    all_base=first_direct+[(spec,label,"siml","__LOCAL__:"+settings,(source,apl,configuration)) for spec,label,settings,apl,source,configuration in siml_first]
    scenario_grid=[(job,key) for key in GUILD_SCENARIOS for job in all_base]
    planned_by_spec=Counter([x[0] for x in cases_to_run+feral_extra+first_direct+extra_direct]+[job[0] for job,_ in scenario_grid])
    planned=sum(planned_by_spec.values())
    start=time.monotonic()
    started_at=datetime.now(timezone.utc).isoformat()
    def publish(complete=False):
        payload={"format":1,"release":RELEASE,"commit":COMMIT,"seed":SEED,"cases":cases,"planned":planned,"plannedBySpec":dict(planned_by_spec),"failed":failed,"finished":complete,"startedAt":started_at,"elapsedSeconds":round(time.monotonic()-start,1),"healerPending":[{"spec":spec,"source":"ui/specs/"+folder+"/presets.ts","reason":"尚缺可驗證的治療遭遇、完整技能策略及有效治療基準；不以 DPS 代替 HPS。"} for spec,folder in HEALERS.items()],"guildScenarios":GUILD_SCENARIOS,"scope":"Upstream and controlled presets, not guild BiS. SIML CLI does not add the UI-generated potion/conjured APL rows. Timeline is one iteration."}
        temp=output.with_suffix(output.suffix+".tmp")
        temp.write_text(json.dumps(payload,ensure_ascii=False,allow_nan=False),encoding="utf-8")
        temp.replace(output)
    def run_direct(job,duration=None,targets=None,scenario=None):
        spec,label=job[:2]
        try:
            d=direct_case(cli,root,job,duration,output.parent,targets,scenario)
            json.dumps(d,ensure_ascii=False,allow_nan=False)
            cases.append(d)
            print("Native raw preset:",spec,d["label"],flush=True)
        except (OSError,ValueError,KeyError,TypeError,subprocess.SubprocessError) as e:
            print("Native raw preset unavailable:",spec,str(e)[:300],flush=True)
            failed.append({"spec":spec,"label":label+("／"+GUILD_SCENARIOS[scenario]["label"] if scenario else "")+("／"+str(duration)+"秒" if duration else "")+("／"+str(targets)+"目標" if targets else ""),"reason":failure_kind(e),"scenario":scenario})
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
                except (OSError,ValueError,KeyError,TypeError,subprocess.SubprocessError) as e:print("Tank metrics unavailable:",str(e)[:300])
            # A parsed settings request is a reproducible starting template, not
            # necessarily identical to the special SIML APL simulation above.
            try:
                parsed=invoke(cli,root,["siml","parse","-json",settings])
                fallback=ensure_encounter(parsed,root)
                d["templateFile"]=write_request_file(output.parent,spec,direct_request(parsed))
                if fallback:d["templateNote"]="原始構築未附目標；解析範本使用增強薩預設63級單體遭遇。"
            except (OSError,ValueError,KeyError,TypeError,subprocess.SubprocessError) as e:
                print("Parsed settings template unavailable:",spec,str(e)[:200])
            # Reject invalid numeric payloads before adding them to the partial snapshot.
            json.dumps(d,ensure_ascii=False,allow_nan=False)
            cases.append(d);print("Native engine preset:",spec,"iterations",d["iterations"],"timeline",len(d["timeline"]))
            publish()
        except (OSError,ValueError,KeyError,TypeError,subprocess.SubprocessError) as e:
            print("Preset unavailable:",spec,str(e)[:400])
            failed.append({"spec":spec,"label":label,"reason":failure_kind(e)})
            publish()
    # Publish even when no case has completed yet; failures remain visible.
    publish()
    # The three guild fixtures take priority over legacy encounters and variants.
    for job,key in scenario_grid:
        if time.monotonic()-start>1200:break
        run_direct(job,scenario=key)
    # Preserve legacy baseline evidence only if time remains.
    for index in range(max(len(first_direct),len(siml_first))):
        if time.monotonic()-start>1200:break
        if index<len(first_direct):run_direct(first_direct[index])
        if index<len(siml_first):run_siml_case(siml_first[index])
    for entry in siml_extra:
        if time.monotonic()-start>1200:break
        run_siml_case(entry)
    for job in extra_direct:
        if time.monotonic()-start>1200:break
        run_direct(job)
    for entry in feral_extra:
        if time.monotonic()-start>1200:break
        run_siml_case(entry)
    publish(complete=True)
    if not cases: raise SystemExit("No successful native engine samples")

if __name__=="__main__":main(*sys.argv[1:])
