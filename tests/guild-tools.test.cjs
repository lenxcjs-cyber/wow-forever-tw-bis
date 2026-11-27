// Run with: node tests/guild-tools.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const src = fs.readFileSync(path.join(__dirname,"..","guild-tools.js"),"utf8");
new vm.Script(src).runInNewContext({document:{querySelectorAll:()=>[],querySelector:()=>null}});
function section(from,to){const a=src.indexOf(from),b=src.indexOf(to,a+from.length);assert.ok(a>=0&&b>a,from);return src.slice(a,b);}
const gate=new Function(section("const rogueProfiles=","function syncWeaponCards")+";return {skillGate,buildChoice};")();
const cases=[
 ["spec-2","副手","盾牌",false],["spec-2","副手","單手劍",true],
 ["spec-9","主手","雙手斧",true],["spec-9","雙手武器","單手劍",false],["spec-9","副手","單手劍",false],
 ["spec-12","主手","匕首",true],["spec-12","主手","單手劍",false],
 ["spec-3","副手","盾牌",true],["spec-3","副手","單手劍",false],
 ["spec-17","主手","雙手錘",true],["spec-17","主手","單手錘",false]
];
for(const [id,slot,type,expected] of cases)assert.equal(!gate.skillGate(id,{slot,type}),expected,id+" "+slot+" "+type);
gate.buildChoice["spec-9"]="melee";assert.equal(gate.skillGate("spec-9",{slot:"副手",type:"單手劍"}),"");
const score=new Function(section("function modelScore(","function audit(")+";return modelScore;")();
const x={slot:"主手",stats:{"命中機率":3,"敏捷":4},wm:{"DPS":"42.5"}},w={"命中機率":2,"敏捷":1,"武器DPS":1};
assert.equal(score(x,w,{base:4,talent:3,cap:9}).total,50.5);
assert.equal(score(x,w,{base:9,talent:3,cap:9}).parts["命中機率"],0);
assert.equal(score(x,w,{}).parts["命中機率"],6);
assert.equal(score({...x,wm:{}},w).incomplete,true);
for(const name of ["rogueTalentBuilds","plateTalentBuilds","hunterShamanTalentBuilds","casterFeralTalentBuilds","variantTalentBuilds"]){
 const match=src.match(new RegExp("const "+name+"=(.*?);"));
 assert.ok(match,name);
 for(const [id,trees] of Object.entries(JSON.parse(match[1])))assert.equal(trees.flatMap(t=>Object.values(t)).reduce((a,b)=>a+b,0),51,id);
}
const registry=new Function(section("const rogueProfiles=","function syncWeaponCards")+";return {skillGate,buildChoice,rogueProfiles,extraProfiles};")();
assert.equal(Object.keys(registry.rogueProfiles).length,28);
for(const [id,profiles] of Object.entries(registry.rogueProfiles))assert.equal(new Set(profiles.map(p=>p[0])).size,profiles.length,id);
for(const entries of Object.values(registry.extraProfiles))for(const v of entries)assert.equal(v[2].split("/").reduce((a,b)=>a+Number(b),0),51,v[0]);
registry.buildChoice["spec-10"]="mutilate_alt";assert.ok(registry.skillGate("spec-10",{slot:"主手",type:"單手劍"}));
registry.buildChoice["spec-5"]="pal_dungeon";assert.ok(registry.skillGate("spec-5",{slot:"副手",type:"單手劍"}));
console.log("PASS: syntax, weapon gates, scoring, 45 detailed talent totals and all registered variants");
