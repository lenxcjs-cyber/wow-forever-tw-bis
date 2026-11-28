"""Fixtures: only exact spell name, class mask, ID and base difficulty may match."""
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location("guide",Path(__file__).resolve().parents[1]/"scripts/map-guide-spells.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
g={"specs":{"a":{"class":"hunter","skills":[["割傷","Lacerate","core","note"]]},"b":{"class":"druid","skills":[["割傷","Lacerate","core","note"]]}}, "common":{"hunter":[["無","Missing","core","note"]]}}
en=[{"ID":str(i),"Name_lang":"Lacerate"} for i in [1,2,3,4]]
zh=[{"ID":"1","Name_lang":"割裂"},{"ID":"2","Name_lang":"割傷"},{"ID":"3","Name_lang":"另一個"},{"ID":"4","Name_lang":"割傷"}]
a=[{"Spell":"1","ClassMask":"4"},{"Spell":"2","ClassMask":"1024"},{"Spell":"3","ClassMask":"0"},{"Spell":"4","ClassMask":"1024"}]
lv=[{"SpellID":"2","DifficultyID":"0","SpellLevel":"40"},{"SpellID":"2","DifficultyID":"1","SpellLevel":"99"},{"SpellID":"4","DifficultyID":"0","SpellLevel":"50"},{"SpellID":"4","DifficultyID":"0","SpellLevel":"51"}]
cd=[{"SpellID":"2","DifficultyID":"0","RecoveryTime":"6000","CategoryRecoveryTime":"0"},{"SpellID":"4","DifficultyID":"0","RecoveryTime":"-1","CategoryRecoveryTime":"0"}]
d=m.build(g,en,zh,a,lv,cd)
assert d["hunter"]["Lacerate"]=={"name":"割裂","records":[{"id":1,"name":"割裂"}]}
assert d["druid"]["Lacerate"]=={"name":"割傷","records":[{"id":2,"name":"割傷","level":40,"cooldownMs":6000,"categoryCooldownMs":0},{"id":4,"name":"割傷"}]}
assert "Missing" not in d["hunter"]
zh[-1]["Name_lang"]="撕裂"
assert "name" not in m.build(g,en,zh,a)["druid"]["Lacerate"]
print("PASS: exact class spell IDs, ambiguous names/levels, missing data and base-difficulty cooldowns")
