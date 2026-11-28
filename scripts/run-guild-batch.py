"""Run a Tomb guild batch exported by the site with a trusted local v1.0.12 CLI.

Usage: python3 scripts/run-guild-batch.py /path/to/wowsimcli batch.json result.json
Requires Python 3.10+, local CLI v1.0.12 and its normal runtime data.
This runs locally, not in GitHub Pages. Only compare within each encounter.
Input and output contain character configurations: share only if intended.
"""
import copy, hashlib, json, math, re, subprocess, sys, tempfile
from pathlib import Path

COMMIT="3b9c125a9b1387cd53ce2bb12969e0c6b54b813e"
SCENARIOS={"guild-50k":(60,50000,1,60),"guild-boss":(63,300000,1,180),"guild-5x50k":(60,50000,5,60)}
FIELDS="dpsWarrior dpsWarrior protectionWarrior holyPaladin protectionPaladin retributionPaladin hunter hunter hunter rogue rogue rogue healerPriest healerPriest dpsPriest elementalShaman enhancementShaman restorationShaman mage mage mage warlock warlock warlock balanceDruid feralCatDruid feralBearDruid restorationDruid".split()
TANKS={"spec-3","spec-5","spec-27"}
HEALS={"spec-4","spec-13","spec-14","spec-18","spec-28"}
def finite(v):return type(v) in (int,float) and math.isfinite(v)
def get_player(request):
    if request.get("type") not in (1,"SimTypeIndividual"):raise ValueError("Requires individual simulation")
    parties=request.get("raid",{}).get("parties",[])
    players=[p for party in parties for p in party.get("players",[]) if p]
    if len(players)!=1:raise ValueError("Requires one character")
    return players[0]
def controlled_signature(req,across_scenarios=False):
    base=copy.deepcopy(req);get_player(base).pop("equipment",None)
    if across_scenarios:base.pop("encounter",None)
    return json.dumps(base,sort_keys=True,allow_nan=False,separators=(",",":"))
def validate(data):
    if data.get("format")!="tomb-guild-batch/1" or data.get("commit")!=COMMIT:raise ValueError("Wrong batch version")
    sid=data.get("spec")
    if not isinstance(sid,str) or not re.fullmatch(r"spec-(?:[1-9]|1[0-9]|2[0-8])",sid):raise ValueError("Invalid specialization")
    cases=data.get("cases")
    if not isinstance(cases,list) or len(cases) not in (6,9,12,15,18):raise ValueError("Expected 6–18 cases")
    expected=len(cases)//3
    by={}
    for c in cases:
        key=c["scenario"];idx=c["variant"];name=c["name"];req=c["request"]
        if key not in SCENARIOS or type(idx) is not int or not 0<=idx<expected or not isinstance(name,str) or not name.strip() or len(name)>80 or (key,idx) in by:raise ValueError("Invalid or duplicate case")
        p=get_player(req)
        if FIELDS[int(sid.split("-")[1])-1] not in p or not p.get("rotation"):raise ValueError("Wrong player specialization or missing rotation")
        gear=p.get("equipment",{}).get("items",[])
        ids=[x.get("id") for x in gear if x.get("id")]
        if len(gear)!=17 or len(ids)!=len(set(ids)) or any(type(i) is not int or not 1<=i<=999999999 for i in ids):raise ValueError("Invalid equipment")
        if any(type(x.get(k,0)) is not int or not 0<=x.get(k,0)<=999999999 for x in gear for k in ("enchant","randomSuffix")):raise ValueError("Invalid enchant or suffix")
        if p.get("enableItemSwap") or any(x.get("id") for x in p.get("itemSwap",{}).get("items",[]) if isinstance(x,dict)) or '"itemSwap":' in json.dumps(p["rotation"]):raise ValueError("Item swap unsupported")
        opt=req.get("simOptions",{});n=opt.get("iterations")
        if type(n) is not int or not 1<=n<=10000 or opt.get("interactive"):raise ValueError("Iterations must be 1–10000, noninteractive")
        level,hp,count,duration=SCENARIOS[key]
        e=req["encounter"];targets=e["targets"];tank=sid in TANKS
        if e.get("duration")!=duration or e.get("durationVariation",0)!=0 or e.get("executeProportion20")!=0.2 or e.get("executeProportion35")!=0.35 or len(targets)!=count or p.get("inFrontOfTarget") is not tank:raise ValueError("Guild encounter mismatch")
        if req["raid"].get("tanks",[])!=([{"type":"Player","index":0}] if tank else []):raise ValueError("Tank assignment mismatch")
        if any(re.search(r"sunder|exposeArmor|faerieFire|curseOfRecklessness|curseOfElements|curseOfShadow|armor|resistance",name,re.I) for name in req["raid"].get("debuffs",{})):raise ValueError("External armor/resistance debuff present")
        if any(t.get("level")!=level or t.get("stats")!=[hp if i==29 else 0 for i in range(39)] or t.get("tankIndex")!=(0 if tank else -1) or t.get("id") or t.get("targetInputs") or t.get("disabledAtStart") or t.get("swingSpeed")!=2 or t.get("minBaseDamage")!=(1000 if level==63 else 300) or t.get("damageSpread",0)!=0 or t.get("mobType")!="MobTypeUnknown" or t.get("canCrush") is not (level==63) or t.get("parryHaste") for t in targets):raise ValueError("Guild target stats mismatch")
        by[key,idx]=c
    common=controlled_signature(by["guild-50k",0]["request"],True)
    for key in SCENARIOS:
        base=by[key,0]
        if controlled_signature(base["request"],True)!=common:raise ValueError("Non-encounter settings changed across scenarios")
        if base["name"]!="原始配裝":raise ValueError("Missing original gear")
        sig=controlled_signature(base["request"])
        for i in range(expected):
            c=by[key,i]
            if controlled_signature(c["request"])!=sig:raise ValueError("A/B changes more than equipment")
            if c["name"]!=by["guild-50k",i]["name"]:raise ValueError("Variant name mismatch")
            if get_player(c["request"])["equipment"]!=get_player(by["guild-50k",i]["request"])["equipment"]:raise ValueError("Variant gear mismatch across scenarios")
    return sid,[by[key,i] for key in SCENARIOS for i in range(expected)]

def metrics(raw,request,sid):
    n=request["simOptions"]["iterations"]
    if not isinstance(raw,dict) or raw.get("error") or raw.get("iterationsDone")!=n:raise ValueError("Engine did not complete requested iterations")
    duration=raw.get("avgIterationDuration")
    if not finite(duration) or abs(duration-request["encounter"]["duration"])>1e-6:raise ValueError("Unexpected duration")
    players=[p for party in raw.get("raidMetrics",{}).get("parties",[]) for p in party.get("players",[]) if isinstance(p,dict) and any(finite(p.get(k,{}).get("avg")) for k in ("dps","threat","hps")) and not re.match(r"^Target Dummy \d+",p.get("name",""))]
    if len(players)!=1:raise ValueError("Cannot uniquely identify character metrics")
    p=players[0];out={}
    for k,f in (("dps","dps"),("tps","threat"),("hps","hps"),("dtps","dtps")):
        for suffix,field in (("","avg"),("Stdev","stdev")):
            v=p.get(f,{}).get(field)
            if finite(v) and v>=0:out[k+suffix]=v
    death=p.get("chanceOfDeath")
    if finite(death) and 0<=death<=1:out["death"]=death
    key="tps" if sid in TANKS else "hps" if sid in HEALS else "dps"
    if out.get(key,0)<=0:raise ValueError("Missing positive role metric")
    if sid in TANKS and not {"dtps","death"}<=out.keys():raise ValueError("Missing tank survival metrics")
    return {"metrics":out,"iterations":n,"duration":duration}
def run(cli,source,dest):
    cli=Path(cli).resolve();source=Path(source).resolve();dest=Path(dest).resolve()
    if source==dest:raise ValueError("Input and output must differ")
    if source.stat().st_size>8_000_000:raise ValueError("Input too large")
    raw=source.read_bytes();data=json.loads(raw);sid,cases=validate(data)
    result={"format":"tomb-guild-results/1","commit":COMMIT,"spec":sid,"inputSha256":hashlib.sha256(raw).hexdigest(),"cases":[],"finished":False}
    def save():
        temp=dest.with_suffix(dest.suffix+".tmp")
        temp.write_text(json.dumps(result,ensure_ascii=False,allow_nan=False,indent=2),encoding="utf-8");temp.replace(dest)
    save()
    with tempfile.TemporaryDirectory() as tmp:
        path=Path(tmp)/"request.json"
        for case in cases:
            row={k:case[k] for k in ("scenario","variant","name")}
            req=case["request"]
            try:
                path.write_text(json.dumps(req,allow_nan=False),encoding="utf-8")
                proc=subprocess.run([str(cli),"sim","--infile",str(path)],capture_output=True,text=True,timeout=180,check=True)
                row.update(metrics(json.loads(proc.stdout),req,sid))
            except (OSError,ValueError,TypeError,KeyError,subprocess.SubprocessError) as e:row["error"]=type(e).__name__
            result["cases"].append(row);save()
            print(row["scenario"],row["name"],row.get("error","OK"),flush=True)
    result["finished"]=True;save()
if __name__=="__main__":
    if len(sys.argv)!=4:raise SystemExit(__doc__)
    run(*sys.argv[1:])
