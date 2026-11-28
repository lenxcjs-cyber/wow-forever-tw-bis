"""Read numeric EP presets from a pinned upstream checkout without executing TypeScript.
Only exact stat-name mappings are used for catalog ranking. Rating fields and
raw feral weapon DPS are excluded until their catalog units are verified.
"""
import json,re,sys,math
from pathlib import Path

# spec, source relative to ui/specs, declaration, label, variant identifier
PROFILES=[
(1,"warrior/dps/presets.ts","PreBiSArmsEpWeights","武器戰雙手","arms"),
(2,"warrior/dps/presets.ts","PreBiSFuryEpWeights","狂怒戰雙持","fury"),
(2,"warrior/dps/presets.ts","PreBiSFury2HEpWeights","狂怒戰雙手","fury2h"),
(3,"warrior/protection/presets.ts","PreBiSBalancedEpWeights","防護戰平衡","balanced"),
(3,"warrior/protection/presets.ts","PreBiSOffensiveEpWeights","防護戰進攻","offensive"),
(6,"paladin/retribution/presets.ts","UnsealedWrathEpWeights","懲戒聖印","unsealed"),
(6,"paladin/retribution/presets.ts","HolyShockEpWeights","懲戒神聖震擊","holyshock"),
(7,"hunter/dps/presets.ts","TurretEpWeights","獸王遠程參考","turret"),
(8,"hunter/dps/presets.ts","TurretEpWeights","射擊遠程","turret"),
(9,"hunter/dps/presets.ts","WeaveEpWeights","生存近遠穿插","weave"),
(9,"hunter/dps/presets.ts","MeleeEpWeights","生存近戰","melee"),
(10,"rogue/dps/presets.ts","EP_PRESET_ASSASSINATION","刺殺","assassination"),
(11,"rogue/dps/presets.ts","EP_PRESET_COMBAT_SINISTER","戰鬥邪惡攻擊","sinister"),
(11,"rogue/dps/presets.ts","EP_PRESET_COMBAT_DAGS","戰鬥匕首","daggers"),
(12,"rogue/dps/presets.ts","EP_PRESET_SUBTLETY","敏銳","subtlety"),
(13,"priest/healer/presets.ts","DiscSingleTargetEpWeights","戒律單體","single"),
(13,"priest/healer/presets.ts","DiscRaidHealingEpWeights","戒律團隊","raid"),
(14,"priest/healer/presets.ts","HolySingleTargetEpWeights","神聖單體","single"),
(14,"priest/healer/presets.ts","HolyRaidHealingEpWeights","神聖團隊","raid"),
(15,"priest/dps/presets.ts","ShadowEpWeights","暗影","shadow"),
(16,"shaman/elemental/presets.ts","DefaultEpWeights","元素","elemental"),
(17,"shaman/enhancement/presets.ts","PreBiSEpWeights","增強","enhancement"),
(25,"druid/balance/presets.ts","DefaultEpWeights","平衡","balance"),
(26,"druid/feral_ep.ts","CatEp","野性貓","cat"),
(27,"druid/feral_ep.ts","BearEp","野性熊","bear"),
]
FIELDS={"Strength":"strength","Agility":"agility","Stamina":"stamina","Intellect":"intellect","Spirit":"spirit","AttackPower":"attack_power","RangedAttackPower":"ranged_attack_power","SpellDamage":"spell_damage","HealingPower":"healing","MP5":"mp5","Armor":"armor","BlockValue":"block_value"}
LABELS={"strength":"力量","agility":"敏捷","stamina":"耐力","intellect":"智力","spirit":"精神","attack_power":"攻擊強度","ranged_attack_power":"遠程攻強","spell_damage":"法術傷害","healing":"治療加成","mp5":"每5秒法力","armor":"護甲","block_value":"格擋值"}

def parse_weights(text,name):
    # Restrict to a single declaration, then a literal Stats.fromMap.
    clean=re.sub(r"/\*[\s\S]*?\*/|//[^\n]*","",text)
    m=re.search(r"\b(?:export\s+)?const\s+"+re.escape(name)+r"\s*=\s*([\s\S]*?);",clean)
    if not m or "Stats.fromMap(" not in m.group(1):return None
    raw=m.group(1);stats={};pseudo={};unsupported=[]
    for kind,key,value in re.findall(r"\[(Stat|PseudoStat)\.(\w+)\]\s*:\s*([^,\n}]+)",raw):
        prefix=kind
        if not key.startswith(prefix):continue
        key=key[len(prefix):]
        try:v=float(value.strip())
        except ValueError:unsupported.append(kind+"."+key);continue
        if not math.isfinite(v):continue
        dest=stats if kind=="Stat" else pseudo
        if key in dest:raise ValueError("Duplicate stat "+key)
        dest[key]=v
    if not stats:return None
    mapped={FIELDS[k]:v for k,v in stats.items() if k in FIELDS and v>0}
    omitted=[k for k,v in stats.items() if k not in FIELDS or v<0]+["PseudoStat."+k for k in pseudo]+unsupported
    return {"catalogWeights":mapped,"panelWeights":{LABELS[k]:v for k,v in mapped.items()},"rawStats":stats,"rawPseudo":pseudo,"omitted":omitted}

def build(root,commit):
    rows=[];missing=[]
    for sid,source,name,label,variant in PROFILES:
        path="ui/specs/"+source
        try:
            weights=parse_weights((Path(root)/path).read_text(encoding="utf-8"),name)
            if not weights or not weights["catalogWeights"]:raise ValueError("No mapped weights")
        except (OSError,ValueError):
            missing.append({"spec":"spec-"+str(sid),"source":path,"declaration":name});continue
        rows.append({"spec":"spec-"+str(sid),"source":path,"declaration":name,"label":label,"variant":variant,**weights})
    return {"commit":commit,"profiles":rows,"missing":missing,"scope":"Upstream EP presets, partial catalog fields; no caps, effects or universal BiS."}

if __name__=="__main__":
    root,output,commit=sys.argv[1:]
    data=build(root,commit)
    if not data["profiles"]:raise SystemExit("No EP presets found")
    Path(output).write_text(json.dumps(data,ensure_ascii=False,allow_nan=False),encoding="utf-8")
    print("Verified source EP profiles:",len(data["profiles"]),"missing:",len(data["missing"]))
