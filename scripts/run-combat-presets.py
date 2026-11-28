"""Run a bounded subset of upstream WoWSims presets; never invent missing values."""
import json, math, re, subprocess, sys, tempfile
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
def finite(x): return type(x) in (float,int) and math.isfinite(x)
def invoke(cli,root,args,payload=None):
    result=subprocess.run([str(cli),*args],cwd=root,input=payload,text=True,capture_output=True,timeout=45,check=True)
    data=json.loads(result.stdout)
    if not isinstance(data,dict) or data.get("error"):
        raise ValueError("Engine reported error: "+str(data.get("error"))[:500])
    return data
def apl_result(data):
    if not finite(data.get("dps",{}).get("mean")) or not finite(data.get("duration")) or data["duration"]<=0 or data.get("iterations")!=ITERATIONS:
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

def main(cli,root,output):
    output=Path(output).resolve();root=Path(root).resolve();cli=Path(cli).resolve()
    cases=[]
    cases_to_run=[(*case,case[2],"") for case in CASES]
    try:cases_to_run=feral_setups(root)+cases_to_run
    except (OSError,ValueError) as e:print("Feral setup unavailable:",str(e)[:400])
    for spec,label,settings,apl,source,configuration in cases_to_run:
        try:
            request={"siml":(root/apl).read_text(encoding="utf-8"),"path":apl,"settingsFile":settings,"iterations":ITERATIONS,"seed":SEED,"timeline":True,"timelineLimit":400}
            d=apl_result(invoke(cli,root,["siml","sim"],json.dumps(request)))
            d.update({"spec":spec,"label":label,"settings":source,"apl":apl,"configuration":configuration,"sources":collect_sources(root,settings,apl)})
            if spec in ("spec-5","spec-27"):
                try:d["tank"]=tank_result(cli,root,settings)
                except (OSError,ValueError,subprocess.SubprocessError) as e:print("Tank metrics unavailable:",str(e)[:300])
            cases.append(d);print("Native engine preset:",spec,"iterations",d["iterations"],"timeline",len(d["timeline"]))
            output.write_text(json.dumps({"format":1,"release":RELEASE,"commit":COMMIT,"seed":SEED,"cases":cases,"scope":"Upstream presets, not guild BiS. SIML CLI does not add the UI-generated potion/conjured APL rows. Timeline is one iteration."},ensure_ascii=False,allow_nan=False),encoding="utf-8")
        except (OSError,ValueError,subprocess.SubprocessError) as e:
            print("Preset unavailable:",spec,str(e)[:400])
    if not cases: raise SystemExit("No successful native engine samples")

if __name__=="__main__":main(*sys.argv[1:])
