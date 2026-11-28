"""Regression tests for local batch input validation (no WoWSims CLI needed).
Run: python3 tests/test_guild_batch.py
"""
import copy
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location("guild_batch",Path(__file__).resolve().parents[1]/"scripts"/"run-guild-batch.py")
batch=importlib.util.module_from_spec(spec)
spec.loader.exec_module(batch)

def fixture(keys=("guild-50k",), tank=False):
    sid="spec-3" if tank else "spec-1"
    cases=[]
    for key in keys:
        level,hp,count,duration=batch.SCENARIOS[key]
        for variant in range(2):
            gear=[{"id":100,"randomSuffix":-15,"enchant":2147483647 if variant else 10}]+[{} for _ in range(16)]
            player={batch.FIELDS[int(sid.split("-")[1])-1]:{},"rotation":{"type":"TypeAPL"},"equipment":{"items":gear},"inFrontOfTarget":tank}
            target={"level":level,"stats":[hp if i==29 else 0 for i in range(39)],"tankIndex":0 if tank else -1,"swingSpeed":2,"minBaseDamage":1000 if level==63 else 300,"mobType":"MobTypeUnknown","canCrush":level==63}
            req={"type":"SimTypeIndividual","raid":{"parties":[{},{"players":[{},player]}],"tanks":[{"type":"Player","index":6}] if tank else []},"encounter":{"duration":duration,"durationVariation":0,"executeProportion20":.2,"executeProportion35":.35,"targets":[copy.deepcopy(target) for _ in range(count)]},"simOptions":{"iterations":50}}
            cases.append({"scenario":key,"variant":variant,"name":"候選" if variant else "原始配裝","request":req})
    return {"format":"tomb-guild-batch/1","commit":batch.COMMIT,"spec":sid,"scenarios":list(keys),"cases":cases}

class BatchValidation(unittest.TestCase):
    def test_scoped_signed_suffix_and_sorted_order(self):
        data=fixture(("guild-boss",))
        data["cases"].reverse()
        sid,cases=batch.validate(data)
        self.assertEqual(sid,"spec-1")
        self.assertEqual([c["variant"] for c in cases],[0,1])
    def test_legacy_three_scenarios(self):
        data=fixture(tuple(batch.SCENARIOS))
        del data["scenarios"]
        self.assertEqual(len(batch.validate(data)[1]),6)
    def test_nonfirst_party_tank(self):
        data=fixture(tank=True)
        self.assertEqual(len(batch.validate(data)[1]),2)
        data["cases"][0]["request"]["raid"]["tanks"][0]["index"]=0
        with self.assertRaisesRegex(ValueError,"Tank assignment"):
            batch.validate(data)
    def test_duplicate_gear(self):
        data=fixture()
        a,b=data["cases"]
        batch.get_player(b["request"])["equipment"]=copy.deepcopy(batch.get_player(a["request"])["equipment"])
        with self.assertRaisesRegex(ValueError,"Duplicate equipment"):
            batch.validate(data)
    def test_duplicate_or_padded_names(self):
        for name in ("原始配裝","原始配裝 "):
            data=fixture()
            data["cases"][1]["name"]=name
            with self.assertRaises(ValueError):
                batch.validate(data)
    def test_bad_suffix_and_scope(self):
        data=fixture()
        batch.get_player(data["cases"][1]["request"])["equipment"]["items"][0]["randomSuffix"]=-2147483648
        with self.assertRaisesRegex(ValueError,"Invalid enchant or suffix"):
            batch.validate(data)
        data=fixture()
        data["scenarios"]=["guild-50k","guild-boss"]
        with self.assertRaisesRegex(ValueError,"Invalid scenario scope"):
            batch.validate(data)

if __name__=="__main__":
    unittest.main()
