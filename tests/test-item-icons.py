import importlib.util,unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]/"scripts"/"map-item-icons.py"
spec=importlib.util.spec_from_file_location("icons",p)
icons=importlib.util.module_from_spec(spec);spec.loader.exec_module(icons)
class Tests(unittest.TestCase):
    def test_mapping(self):
        a=[{"ID":"1","IconFileDataID":"100"},{"ID":"2","IconFileDataID":"200"},{"ID":"3","IconFileDataID":"999"}]
        def row(i,a,m="0"):return {"ItemID":i,"ItemAppearanceID":a,"ItemAppearanceModifierID":m}
        rows=[row("10","1"),row("11","2"),row("12","1"),row("12","2"),row("13","2","1"),row("14","3"),row("15","1"),row("15","2","1")]
        self.assertEqual(icons.map_items(a,rows,["100;Interface/Icons/INV_Sword_01.blp","200;interface/icons/inv_shield_02.blp"]),{"10":"inv_sword_01","11":"inv_shield_02","15":"inv_sword_01"})
if __name__=="__main__":unittest.main()
