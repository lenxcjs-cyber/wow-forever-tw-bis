import importlib.util, unittest, tempfile, json
from pathlib import Path
from unittest.mock import patch
from datetime import datetime,timezone
p=Path(__file__).resolve().parents[1]/"scripts"/"sync-official-blue.py"
spec=importlib.util.spec_from_file_location("blue",p);blue=importlib.util.module_from_spec(spec);spec.loader.exec_module(blue)
class Tests(unittest.TestCase):
    def test_url(self):
        self.assertEqual(blue.official_key("https://us.forums.blizzard.com/en/wow/t/2403040/15"),"us:2403040:15")
        self.assertEqual(blue.official_key("https://eu.forums.blizzard.com/en/wow/t/example-title/42/7"),"eu:42:7")
        self.assertIsNone(blue.official_key("https://example.com/en/wow/t/42/7"))
    def test_staff(self):
        self.assertFalse(blue.is_staff({"username":"Kaivax","staff":False}))
        self.assertTrue(blue.is_staff({"staff":True}))
        self.assertTrue(blue.is_staff({"primary_group_name":"blizzard-tracker"}))
    def test_html(self):
        self.assertEqual(blue.plain("<p>One &amp; two</p><blockquote><p>Player quote</p></blockquote><script>x</script><li>Three</li>"),"One & two\nThree")
    def test_facts(self):
        text="Damage increased to 10 percent for the ability.\nMana cost reduced by 5 percent.\n"+"Long "*60
        facts=blue.selected_facts(text);self.assertEqual(len(facts),2)
        self.assertLessEqual(sum(len(x.split()) for x in facts),25)
    def test_poll_and_dedup(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);stamp=datetime.now(timezone.utc).isoformat()
            posts=[{"id":1,"post_number":1,"staff":True,"username":"Staff","created_at":stamp,"updated_at":stamp,"cooked":"<p>Damage increased to 10 percent for the ability.</p>"},{"id":2,"post_number":2,"username":"Other","created_at":stamp,"cooked":"<p>Unverified player claims.</p>"}]
            payload={"title":"Fixture notice","post_stream":{"posts":posts,"stream":[1,2]}}
            with patch.object(blue,"OUT",root/"live.json"),patch.object(blue,"QUEUE",root/"queue.json"),patch.object(blue,"CATEGORIES",{"us":[]}),patch.object(blue,"SEEDS",{"us":[42]}),patch.object(blue,"archive_keys",return_value={}),patch.object(blue,"fetch",return_value=payload):
                blue.poll();first=json.loads(blue.OUT.read_text());self.assertEqual(len(first["posts"]),1)
                self.assertEqual(first["posts"][0]["translationStatus"],"pending")
                self.assertNotIn("Unverified player",blue.OUT.read_text())
                self.assertNotIn("Damage increased",blue.OUT.read_text())
                blue.poll();self.assertEqual(json.loads(blue.OUT.read_text()),first)
                posts[0]["cooked"]="<p>Damage reduced to 5 percent for the ability.</p>"
                blue.poll();second=json.loads(blue.OUT.read_text());self.assertEqual(len(second["posts"]),1);self.assertTrue(second["posts"][0]["revision"])
if __name__=="__main__":unittest.main()
