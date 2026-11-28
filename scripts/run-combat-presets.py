"""Run a bounded subset of upstream WoWSims presets; never invent missing values."""
import json, math, subprocess, sys, tempfile
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
    if not isinstance(p,dict) or not p.get("protectionPaladin") or not p.get("rotation") or not d.get("encounter"):
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
def main(cli,root,output):
    output=Path(output).resolve();root=Path(root).resolve();cli=Path(cli).resolve()
    cases=[]
    for spec,label,settings,apl in CASES:
        try:
            request={"siml":(root/apl).read_text(encoding="utf-8"),"path":apl,"settingsFile":settings,"iterations":ITERATIONS,"seed":SEED,"timeline":True,"timelineLimit":400}
            d=apl_result(invoke(cli,root,["siml","sim"],json.dumps(request)))
            d.update({"spec":spec,"label":label,"settings":settings,"apl":apl})
            if spec=="spec-5":
                try:d["tank"]=tank_result(cli,root,settings)
                except (OSError,ValueError,subprocess.SubprocessError) as e:print("Tank metrics unavailable:",str(e)[:300])
            cases.append(d);print("Native engine preset:",spec,"iterations",d["iterations"],"timeline",len(d["timeline"]))
            output.write_text(json.dumps({"format":1,"release":RELEASE,"commit":COMMIT,"seed":SEED,"cases":cases,"scope":"Upstream presets, not guild BiS. SIML CLI does not add the UI-generated potion/conjured APL rows. Timeline is one iteration."},ensure_ascii=False,allow_nan=False),encoding="utf-8")
        except (OSError,ValueError,subprocess.SubprocessError) as e:
            print("Preset unavailable:",spec,str(e)[:400])
    if not cases: raise SystemExit("No successful native engine samples")

if __name__=="__main__":main(*sys.argv[1:])
