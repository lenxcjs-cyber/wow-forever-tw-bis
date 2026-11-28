"""Offline regression checks for the preset generator; no WoWSims download needed."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/"scripts/run-combat-presets.py"
spec=importlib.util.spec_from_file_location("combat_presets",SCRIPT)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class PresetTests(unittest.TestCase):
    def test_controlled_variants(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            base=Path("ui/specs/druid/feralcat")
            (root/base/"apls").mkdir(parents=True)
            (root/base/"gear_sets").mkdir()
            apl=base/"apls/adaptive.apl.siml"
            threshold="var $"+ "{Shifting Power energy ceiling} = 53"
            (root/apl).write_text("siml 1\n"+threshold+"\npriority:\n  cast shred\n",encoding="utf-8")
            gear=base/"gear_sets/pre_raid.gear.siml"
            (root/gear).write_text("siml 1\nmain_hand the_unstoppable_force\n",encoding="utf-8")
            cases=[]
            for weapon in ("the_unstoppable_force","bonecrusher"):
                settings=base/f"gt_{weapon}.siml"
                source='siml 1\nuse "gear_sets/pre_raid.gear.siml"\nuse "apls/adaptive.apl.siml"\nencounter:\n  duration 180\n  duration_variation 5\n'
                (root/settings).write_text(source,encoding="utf-8")
                cases.append(("spec-26",weapon,str(settings),str(apl),str(gear),"180±5秒"))
            variants=mod.feral_variants(root,cases)
            self.assertEqual(len(variants),8)
            for _,label,settings,actual_apl,source,configuration in variants:
                raw=(root/settings).read_text(encoding="utf-8")
                group=mod.comparison_group("spec-26",settings)
                if "變形門檻" in label:
                    changed=(root/actual_apl).read_text(encoding="utf-8")
                    value=int(label.rsplit("門檻",1)[1])
                    self.assertEqual(changed,(root/apl).read_text(encoding="utf-8").replace(threshold,threshold.rsplit(" ",1)[0]+f" {value}"))
                    self.assertIn("duration 180\n",raw)
                    self.assertIn("180±5",group)
                else:
                    value=int(label.rsplit("／",1)[1].rstrip("秒"))
                    self.assertIn(f"duration {value}\n",raw)
                    self.assertIn(f"{value}±5",group)
                    self.assertEqual(actual_apl,str(apl))
                self.assertIn("duration_variation 5",raw)
                collected=mod.collect_sources(root,settings,actual_apl)
                self.assertEqual(collected[0]["path"],settings)
                self.assertIn(actual_apl,[x["path"] for x in collected])
                self.assertIn(str(gear),[x["path"] for x in collected])
            self.assertIsNone(mod.comparison_group("spec-27",cases[0][2]))
            self.assertIn("duration 180\n",(root/cases[0][2]).read_text(encoding="utf-8"))

    def test_sources_do_not_leave_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"source"
            root.mkdir()
            (root.parent/"private.siml").write_text("private",encoding="utf-8")
            (root/"main.siml").write_text('use "../private.siml"\n',encoding="utf-8")
            self.assertEqual([x["path"] for x in mod.collect_sources(root,"main.siml")],["main.siml"])

    def test_all_specs_are_accounted_for(self):
        first,extra=mod.direct_jobs()
        self.assertEqual(len({x[0] for x in first}),len(first))
        self.assertTrue({x[0] for x in extra}<={x[0] for x in first})
        native={x[0] for x in first}|{x[0] for x in mod.CASES}|{"spec-26","spec-27"}
        self.assertEqual(len(native),23)
        self.assertFalse(native&set(mod.HEALERS))
        self.assertEqual(native|set(mod.HEALERS),{"spec-"+str(i) for i in range(1,29)})

    def test_direct_request_preserves_source(self):
        original={"player":{"rotation":{"type":"TypeAPL"},"talentsString":"fixture"},
                  "encounter":{"duration":180,"durationVariation":5,"targets":[{"id":31146}]},
                  "partyBuffs":{"fixture":True},"tanks":[{"type":"Player","index":0}]}
        request=mod.direct_request(original,60)
        self.assertEqual(request["encounter"]["duration"],60)
        self.assertEqual(original["encounter"]["duration"],180)
        self.assertEqual(request["encounter"]["durationVariation"],5)
        self.assertEqual(request["raid"]["parties"][0]["players"][0]["talentsString"],"fixture")
        self.assertEqual(request["raid"]["tanks"],original["tanks"])
        self.assertEqual(request["simOptions"]["iterations"],mod.ITERATIONS)
        with self.assertRaises(ValueError):
            mod.direct_request({"player":{},"encounter":{}})

    def test_native_target_variants_and_request_files(self):
        import json
        original={"player":{"rotation":{"type":"TypeAPL"},"talentsString":"fixture"},
                  "encounter":{"duration":180,"durationVariation":5,"targets":[{"id":31146,"name":"Raid Target","tankIndex":0,"level":63}]},
                  "tanks":[{"type":"Player","index":0}]}
        request=mod.direct_request(original,60,3)
        targets=request["encounter"]["targets"]
        self.assertEqual(len(targets),3)
        self.assertEqual(len(original["encounter"]["targets"]),1)
        self.assertEqual([x["name"] for x in targets],["Raid Target 1","Raid Target 2","Raid Target 3"])
        self.assertTrue(all(x["tankIndex"]==0 and x["level"]==63 for x in targets))
        targets[1]["level"]=62
        self.assertEqual(targets[0]["level"],63)
        self.assertNotEqual(mod.direct_comparison_group(request),mod.direct_comparison_group(mod.direct_request(original,60)))
        with self.assertRaises(ValueError):
            mod.direct_request(original,60,9)
        with self.assertRaises(ValueError):
            mod.direct_request(original,0)
        with tempfile.TemporaryDirectory() as tmp:
            name=mod.write_request_file(tmp,"spec-3",request)
            self.assertRegex(name,r"^combat-requests/spec-3-[a-f0-9]{16}\.json$")
            self.assertEqual(json.loads((Path(tmp)/name).read_text(encoding="utf-8")),request)
            self.assertEqual(mod.write_request_file(tmp,"spec-3",request),name)
            with self.assertRaises(ValueError):
                mod.write_request_file(tmp,"../spec-3",request)

    def test_direct_comparison_groups(self):
        source={"player":{"rotation":{"type":"TypeAPL"},"talentsString":"A","buffs":{"greaterBlessingOfKings":True}},
                "encounter":{"duration":180,"durationVariation":5,"targets":[{"id":31146}]},
                "raidBuffs":{"arcaneIntellect":True}}
        original=mod.direct_request(source)
        modified=mod.direct_request({**source,"player":{**source["player"],"talentsString":"B"}})
        self.assertEqual(mod.direct_comparison_group(original),mod.direct_comparison_group(modified))
        short=mod.direct_request(source,60)
        self.assertNotEqual(mod.direct_comparison_group(original),mod.direct_comparison_group(short))
        changed_buff=mod.direct_request({**source,"raidBuffs":{"arcaneIntellect":False}})
        self.assertNotEqual(mod.direct_comparison_group(original),mod.direct_comparison_group(changed_buff))

    def test_missing_encounter_fallback_and_failure_categories(self):
        import json
        import subprocess
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            path=root/"ui/specs/shaman/enhancement/builds/default.build.json"
            path.parent.mkdir(parents=True)
            encounter={"duration":180,"targets":[{"id":31146,"level":63}]}
            path.write_text(json.dumps({"encounter":encounter}),encoding="utf-8")
            settings={"player":{"rotation":{"type":"TypeAPL"}}}
            self.assertTrue(mod.ensure_encounter(settings,root))
            self.assertEqual(settings["encounter"],encounter)
            self.assertFalse(mod.ensure_encounter(settings,root))
            settings["encounter"]["targets"][0]["level"]=60
            self.assertEqual(mod.common_encounter(root)["targets"][0]["level"],63)
        self.assertEqual(mod.failure_kind(subprocess.TimeoutExpired("cli",45)),"timeout")
        self.assertEqual(mod.failure_kind(FileNotFoundError()),"missing-source")
        self.assertEqual(mod.failure_kind(subprocess.CalledProcessError(1,"cli")),"engine-exit")
        self.assertEqual(mod.failure_kind(json.JSONDecodeError("bad","x",0)),"invalid-json")
        self.assertEqual(mod.failure_kind(ValueError()),"validation")

    def test_native_action_aggregation(self):
        result={"iterationsDone":10,"raidMetrics":{"parties":[{"players":[{"dps":{"avg":100},"actions":[
            {"id":{"spellId":123,"rank":2},"targets":[{"damage":200,"threat":300,"manualCasts":10},{"damage":400,"threat":100,"manualCasts":10}]},
            {"id":{"itemId":99},"isPassive":True,"targets":[{"damage":100}]},
            {"id":{"spellId":456},"targets":[{"damage":-2}]}],
            "pets":[{"name":"Wolf","actions":[{"id":{"spellId":789},"targets":[{"damage":500}]}]}]}]}]}}
        rows=mod.direct_action_rows(result)
        self.assertEqual(len(rows),3)
        self.assertEqual(rows[0]["id"],123)
        self.assertEqual(rows[0]["damage"],60)
        self.assertEqual(rows[0]["threat"],40)
        self.assertEqual(rows[0]["manualCasts"],2)
        self.assertEqual(rows[1]["owner"],"角色／Wolf")
        self.assertEqual(rows[1]["damage"],50)
        self.assertTrue(rows[2]["passive"])

    def test_direct_metrics(self):
        valid={"iterationsDone":mod.ITERATIONS,"avgIterationDuration":180,
               "raidMetrics":{"parties":[{"players":[{"dps":{"avg":321},"threat":{"avg":456},"dtps":{"avg":-5},"hps":{"avg":0},"chanceOfDeath":0.1}]}]},"logs":"fixture"}
        metrics,duration,logs=mod.direct_metrics(valid)
        self.assertEqual(metrics,{"dps":321,"tps":456,"hps":0,"death":0.1})
        self.assertEqual(duration,180)
        self.assertEqual(logs,"fixture")
        with self.assertRaises(ValueError):
            mod.direct_metrics({**valid,"iterationsDone":0})
        with self.assertRaises(ValueError):
            mod.direct_metrics({**valid,"raidMetrics":{"parties":[{"players":[{"dps":{"avg":0}}]}]}})

    def test_set_trials_plan_preserves_control_conditions(self):
        import copy
        path=SCRIPT.with_name("run-set-trials.py")
        loader=importlib.util.spec_from_file_location("set_trials",path)
        sets=importlib.util.module_from_spec(loader)
        loader.loader.exec_module(sets)
        def item(i,slot,name="",**kwargs):
            return {"id":i,"slot":slot,"item_class":"Armor","subclass":"Plate","item_set":name,
                    "source_summary":"Dungeon fixture","item_level":60,"quality":3,"required_level":60,**kwargs}
        items=[item(1,"Head","Fixture"),item(2,"Shoulder","Fixture"),item(3,"Chest"),
               item(4,"Head"),item(5,"Shoulder"),item(6,"Chest","Fixture"),
               item(7,"Head",required_reputation="Exalted")]
        gear=[{} for _ in range(17)]
        for i,j in [(0,1),(2,2),(4,3)]:gear[i]={"id":j,"enchant":99}
        request={"raid":{"parties":[{"players":[{"equipment":{"items":gear},"rotation":{"type":"TypeAPL"},"talentsString":"fixture"}]}]},"encounter":{"duration":180},"simOptions":{"iterations":1000}}
        before=copy.deepcopy(request)
        registry=[{"name":"Fixture","id":99,"bonuses":[{"pieces":2},{"pieces":3},{"pieces":4}]}]
        plan=sets.set_plan(request,"spec-1",items,registry)
        self.assertIsNotNone(plan)
        self.assertEqual(plan["thresholds"],[2,3])
        self.assertEqual(plan["registeredThresholds"],[2,3,4])
        self.assertEqual([x[0] for x in plan["cases"]],[0,2,3])
        self.assertEqual(len(plan["items"]),3)
        self.assertEqual(request,before)
        for n,req in plan["cases"]:
            g=sets.player(req)["equipment"]["items"]
            self.assertEqual(sum(x.get("id") in (1,2,6) for x in g),n)
            self.assertTrue(all("enchant" not in g[i] for i in (0,2,4)))
            self.assertNotIn(7,[x.get("id") for x in g])
            self.assertEqual(req["encounter"],request["encounter"])
            self.assertEqual(req["simOptions"],request["simOptions"])
        swapped=copy.deepcopy(request)
        sets.player(swapped)["enableItemSwap"]=True
        self.assertIsNone(sets.set_plan(swapped,"spec-1",items,registry))

    def test_guild_standard_targets(self):
        source={"player":{"rotation":{"type":"TypeAPL"},"inFrontOfTarget":True},"encounter":{"duration":180,"targets":[{}]},"debuffs":{"sunderArmor":True,"curseOfElements":True,"judgementOfWisdom":True}}
        request=mod.direct_request(source)
        for key,level,hp,count in (("guild-50k",60,50000,1),("guild-boss",63,300000,1),("guild-5x50k",60,50000,5)):
            for sid,tank in (("spec-1",False),("spec-3",True)):
                result=mod.guild_scenario(request,sid,key)
                self.assertEqual(result["raid"]["parties"][0]["players"][0]["inFrontOfTarget"],tank)
                self.assertEqual(len(result["encounter"]["targets"]),count)
                for target in result["encounter"]["targets"]:
                    self.assertEqual(target["level"],level)
                    self.assertEqual(target["stats"][29],hp)
                    self.assertEqual(sum(target["stats"]),hp)
                    self.assertEqual(target["tankIndex"],0 if tank else -1)
                self.assertEqual(result["raid"]["debuffs"],{"judgementOfWisdom":True})
        self.assertTrue(request["raid"]["parties"][0]["players"][0]["inFrontOfTarget"])
        self.assertEqual(len(request["encounter"]["targets"]),1)

if __name__=="__main__":
    unittest.main()
