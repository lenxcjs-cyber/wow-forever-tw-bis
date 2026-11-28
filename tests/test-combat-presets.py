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

if __name__=="__main__":
    unittest.main()
