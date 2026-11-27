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
const score=new Function(section("function weaponDpsKey(","function audit(")+";return modelScore;")();
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
assert.equal(score(x,{"主手DPS":2}).total,85);
assert.equal(score(x,{"遠程DPS":2,"武器DPS":1}).total,0);
assert.equal(score({...x,slot:"副手",type:"盾牌",wm:{}},{"武器DPS":2}).incomplete,false);
assert.equal(score({...x,slot:"遠程武器",type:"弓"},{"遠程DPS":2}).total,85);
assert.equal(score({...x,slot:"主手",type:"雙手斧"},{"雙手DPS":2}).total,85);
assert.equal(score({...x,slot:"副手",type:"匕首",wm:{}},{"副手DPS":2}).incomplete,true);
assert.ok(gate.skillGate("spec-2",{slot:"副手",type:"副手物品"}));
const materialTotals=new Function(section("function recipeMaterialTotals(","function material(")+";return recipeMaterialTotals;")();
const list=materialTotals([{recipe:{name:"A",mat:"夢葉草×2、水晶瓶×1"},count:3},{recipe:{name:"B",mat:"夢葉草×1、特殊材料"},count:2}]);
assert.equal(new Map(list.totals).get("夢葉草"),8);
assert.equal(new Map(list.totals).get("水晶瓶"),3);
assert.equal(list.unknown.length,1);
const combo=new Function(section("function weaponDpsKey(","function audit(")+";return {weaponPosition,weaponSets,weaponSetScore};")();
const mh={id:"1",slot:"主手",type:"單手劍",stats:{"命中機率":2},wm:{DPS:"30"}};
const oh={id:"2",slot:"副手",type:"匕首",stats:{"命中機率":2},wm:{DPS:"20"}};
const th={id:"3",slot:"雙手武器",type:"雙手劍",stats:{"命中機率":4},wm:{DPS:"50"}};
const sh={id:"4",slot:"副手",type:"盾牌",stats:{"命中機率":1},wm:{}};
assert.equal(combo.weaponSets([mh,oh,th],()=>true,"general").length,2);
assert.equal(combo.weaponSets([mh,oh,th,sh],()=>true,"dual").length,1);
assert.equal(combo.weaponSets([mh,oh,th],()=>true,"twohand").length,1);
assert.equal(combo.weaponSets([mh,{...oh,id:"1"}],()=>true,"dual").length,0);
assert.equal(combo.weaponSets([mh,oh,th],x=>x.id!=="2","general").length,1);
assert.equal(combo.weaponPosition({...mh,slot:"遠程武器",type:"弓"}),"");
assert.equal(combo.weaponPosition({...oh,type:"主手武器"}),"");
assert.equal(combo.weaponSetScore([mh,oh],{"命中機率":2,"主手DPS":1,"副手DPS":1},{base:6,talent:1,cap:9}).total,54);
assert.equal(combo.weaponSetScore([mh,oh],{"命中機率":2},{base:9,cap:9}).usable,0);
assert.equal(combo.weaponSetScore([mh,oh],{"命中機率":2},{}).total,8);
assert.equal(combo.weaponSetScore([mh,{...oh,wm:{}}],{"副手DPS":1},{}).incomplete,true);
assert.equal(combo.weaponSetScore([mh,sh],{"武器DPS":1},{}).incomplete,false);
console.log("PASS: syntax, build registry, talent totals, weapon scopes, shared hit cap, 12 weapon-set tests and material totals");

// Feral defaults and explicit one-hand alternatives.
const feralItems=[
 {id:"f1",slot:"主手",type:"雙手錘",stats:{},wm:{DPS:"50"}},
 {id:"f2",slot:"主手",type:"單手錘",stats:{},wm:{DPS:"32"}},
 {id:"f3",slot:"副手",type:"持有型副手",stats:{},wm:{}},
 {id:"f4",slot:"副手",type:"匕首",stats:{},wm:{DPS:"20"}},
 {id:"f5",slot:"副手",type:"盾牌",stats:{},wm:{}},
 {id:"f6",slot:"主手",type:"法杖",stats:{},wm:{DPS:"48"}},
 {id:"f7",slot:"主手",type:"雙手斧",stats:{},wm:{DPS:"60"}},
 {id:"f8",slot:"遠程",type:"塑像",stats:{},wm:{}}
];
for(const id of ["spec-26","spec-27"]){
 for(const [slot,type,ok] of [["主手","雙手錘",true],["主手","單手錘",false],["副手","持有型副手",false],["主手","雙手斧",false],["主手","法杖",true],["遠程","塑像",true]])assert.equal(!gate.skillGate(id,{slot,type}),ok,id+" "+type);
 assert.equal(combo.weaponSets(feralItems,x=>!gate.skillGate(id,x),"twohand").length,2);
 gate.buildChoice[id]="feral_onehand";
 for(const [slot,type,ok] of [["主手","單手錘",true],["主手","雙手錘",false],["副手","持有型副手",true],["副手","匕首",false],["副手","盾牌",false],["遠程","塑像",true]])assert.equal(!gate.skillGate(id,{slot,type}),ok,id+" "+type);
 const sets=combo.weaponSets(feralItems,x=>!gate.skillGate(id,x),"general");
 assert.equal(sets.length,1);assert.deepEqual(sets[0].items.map(x=>x.id),["f2","f3"]);
}
gate.buildChoice["spec-27"]="bear_cat";
assert.ok(gate.skillGate("spec-27",{slot:"主手",type:"單手錘"}));
assert.equal(score(feralItems[5],{"雙手DPS":2}).total,96);
console.log("PASS: feral weapon eligibility, complete combinations, staff DPS and hybrid build");

const sourceGroup=new Function(section("function sourceGroup(","function drops(")+";return sourceGroup;")();
for(const x of ["斯坦索姆－瑞文戴爾","斯坦索姆 - 瑞文戴爾","斯坦索姆 – 瑞文戴爾","斯坦索姆—瑞文戴爾"])assert.equal(sourceGroup(x),"斯坦索姆");
assert.equal(sourceGroup("LBRS-Boss"),"LBRS-Boss");
for(const [id,slot,type,ok] of [["spec-1","主手 / 單手武器","法杖",true],["spec-2","副手","法杖",false],["spec-12","武器","單手劍",false],["spec-12","主手","匕首",true],["spec-3","主手","盾牌",false],["spec-17","雙手武器","法杖",true]])assert.equal(!registry.skillGate(id,{slot,type}),ok,id+type);
console.log("PASS: cross-class weapon classification and source normalization");

const externalRef=new Function(section("function isTwoHand(","function skillGate(")+section("const communityBiS=","function communityEvidenceView(")+";return {communityBiS,communityMatch};")();
assert.equal(Object.keys(externalRef.communityBiS).length,28);
for(const [id,ref] of Object.entries(externalRef.communityBiS)){assert.ok(ref.picks.length);for(const p of ref.picks){assert.ok(/^\d+$/.test(p.id));assert.equal(typeof p.known,"boolean");assert.ok(registry.rogueProfiles[id].some(b=>ref.builds.includes(b[0])));}}
assert.equal(externalRef.communityMatch("spec-9","melee",{id:"18738",slot:"遠程"}),null);
assert.equal(externalRef.communityMatch("spec-12","backstab",{id:"12590",slot:"主手",type:"匕首"}).slot,"主手");
assert.equal(externalRef.communityMatch("spec-12","backstab",{id:"12590",slot:"副手",type:"匕首"}).slot,"副手");
assert.equal(externalRef.communityMatch("spec-12","hemo",{id:"12590",slot:"主手",type:"匕首"}),null);
assert.equal(externalRef.communityMatch("spec-26","general",{id:"18420",slot:"主手",type:"雙手錘"}).id,"18420");
assert.equal(externalRef.communityMatch("spec-26","feral_onehand",{id:"18420",slot:"主手",type:"雙手錘"}),null);
assert.equal(externalRef.communityMatch("spec-7","pet",{id:"13023",slot:"遠程",type:"弓"}).known,false);
console.log("PASS: 28-spec external evidence, slot identity, source uncertainty and build separation");

const restored=new Function("localStorage",section("const rogueProfiles=","function syncWeaponCards")+";return {buildFor,skillGate};")({getItem:()=>JSON.stringify({"spec-26":"feral_onehand","spec-27":"feral_onehand"})});
for(const id of ["spec-26","spec-27"]){assert.equal(restored.buildFor(id),"feral_onehand");assert.equal(restored.skillGate(id,{slot:"主手",type:"單手錘"}),"");assert.ok(restored.skillGate(id,{slot:"主手",type:"雙手錘"}));}
console.log("PASS: feral alternative builds persist after reload");

const expansion=new Function(section("const rogueProfiles=","function syncWeaponCards")+section("const expandedGear=","let gearCatalogPromise=")+";return {expandedGear,expandCandidateSlots,gearCatalogEligible,gearCatalogTags,gearClassIndex,gearType,catalogDiff,catalogSameSlot,candidateCatalogCheck,acquisitionMatches,allowed,buildChoice};")();
const cat={id:"spec-26",slots:new Map([["主手 / 單手武器",[]],["雙手武器",[]],["戒指1",[]],["戒指2",[]],["胸部",[]]])};
const catSlots=expansion.expandCandidateSlots(cat);
assert.equal(catSlots.get("雙手武器").find(x=>x.id==="19323").wm["每秒傷害"],"56.5");
assert.ok(catSlots.get("雙手武器").find(x=>x.id==="19323").priority);
assert.equal(catSlots.get("戒指1").filter(x=>x.id==="19325").length,1);
assert.equal(catSlots.get("戒指2").filter(x=>x.id==="19325").length,1);
assert.equal(cat.slots.get("雙手武器").length,0);
expansion.buildChoice["spec-26"]="feral_onehand";
assert.equal(expansion.allowed("spec-26",catSlots.get("雙手武器")[0]),false);
const p={Druid:{weapons:["Staff","Dagger","Two-Handed Mace"],armor:{Cloth:1,Leather:1}}};
expansion.buildChoice["spec-26"]="general";
assert.ok(expansion.gearCatalogEligible(cat,{item_class:"Weapon",slot:"Two-Hand",subclass:"Two-Handed Mace",class_mask:1024,required_level:55},p));
assert.equal(expansion.gearCatalogEligible(cat,{item_class:"Weapon",slot:"One-Hand",subclass:"Dagger"},p),false);
assert.equal(expansion.gearCatalogEligible(cat,{item_class:"Armor",slot:"Chest",subclass:"Plate"},p),false);
// Cross-armor candidates must not disappear when the upstream proficiency table lists only the highest tier.
for(const [id,cls,max] of [["spec-1","Warrior",3],["spec-4","Paladin",3],["spec-7","Hunter",2],["spec-10","Rogue",1],["spec-13","Priest",0],["spec-16","Shaman",2],["spec-19","Mage",0],["spec-22","Warlock",0],["spec-28","Druid",1]]){
 const tiers=["Cloth","Leather","Mail","Plate"],prof={[cls]:{armor:{[tiers[max]]:1},weapons:[]}};
 for(const [i,subclass] of tiers.entries())assert.equal(expansion.gearCatalogEligible({id},{item_class:"Armor",slot:"Chest",subclass,required_level:60},prof),i<=max,cls+" "+subclass);
}
assert.equal(expansion.gearCatalogEligible({id:"spec-1"},{item_class:"Armor",slot:"Chest",subclass:"Cloth",required_level:61},{Warrior:{armor:{Plate:40}}}),false);
assert.ok(gate.skillGate("spec-13",{slot:"胸部",type:"皮甲"}));
assert.equal(gate.skillGate("spec-4",{slot:"胸部",type:"布甲"}),"");
assert.equal(expansion.gearCatalogEligible(cat,{item_class:"Armor",slot:"Chest",subclass:"Leather",class_mask:1},p),false);
assert.deepEqual(expansion.gearCatalogTags({source_summary:"World drop",bonding:"Binds when equipped"}),["世界掉落","裝綁"]);
assert.deepEqual(expansion.gearCatalogTags({source_summary:"Crafted: Leatherworking",bonding:"Binds when equipped"}),["裝綁","製作"]);
console.log("PASS: expanded gear candidates, feral reputation weapon, class eligibility, source and binding filters");

assert.equal(expansion.gearClassIndex("spec-28"),8);
assert.equal(expansion.gearClassIndex("spec-29"),-1);
assert.ok(expansion.gearCatalogEligible({id:"spec-28"},{item_class:"Armor",slot:"Chest",subclass:"Leather",class_mask:1024,required_level:55},p));
assert.equal(expansion.gearType({slot:"Two-Hand",subclass:"Two-Handed Mace"}),"雙手錘");
assert.equal(expansion.catalogSameSlot({slot:"Chest"},{slot:"Robe"}),true);
assert.equal(expansion.catalogSameSlot({slot:"One-Hand"},{slot:"Two-Hand"}),false);
const diffs=expansion.catalogDiff({dps:56.5,strength:18,crit:28},{dps:53.8,strength:26,crit:14});
assert.deepEqual(diffs.map(x=>[x.key,x.delta]),[["dps",2.7],["strength",-8],["crit",14]]);
console.log("PASS: restoration druid catalog eligibility and same-slot raw stat differences");

const rogue={Rogue:{weapons:["Dagger","One-Handed Sword"],armor:{Cloth:1,Leather:1}}};
assert.ok(expansion.gearCatalogEligible({id:"spec-11"},{item_class:"Weapon",slot:"One-Hand",subclass:"One-Handed Axe"},rogue));
assert.equal(expansion.gearCatalogEligible({id:"spec-10"},{item_class:"Weapon",slot:"One-Hand",subclass:"One-Handed Axe"},rogue),false);
const priest={Priest:{weapons:["Dagger"],armor:{Cloth:1}}};
assert.equal(expansion.gearCatalogEligible({id:"spec-13"},{item_class:"Weapon",slot:"Off Hand",subclass:"Dagger"},priest),false);
assert.ok(expansion.gearCatalogEligible({id:"spec-13"},{item_class:"Armor",slot:"Held In Off-hand",subclass:"Miscellaneous"},priest));
assert.equal(expansion.candidateCatalogCheck({},null).state,"未收錄");
assert.equal(expansion.candidateCatalogCheck({stats:{"力量":18}},{estimated:1,strength:20}).state,"經典推定");
assert.deepEqual(expansion.candidateCatalogCheck({stats:{"力量":18,"命中機率":2},wm:{"每秒傷害":"56.5"}},{strength:20,hit:10,dps:56.5}).differences,[{label:"力量",old:18,current:20}]);
assert.equal(expansion.candidateCatalogCheck({wm:{"每秒傷害":"56.5"}},{dps:58,dps_approx:1}).differences.length,0);
assert.equal(expansion.catalogSameSlot({slot:"invalid"},{slot:"invalid"}),false);
console.log("PASS: Forever weapon eligibility and candidate catalog discrepancies without mixing stat units");

assert.ok(expansion.acquisitionMatches({acquisition:"世界掉落",source:"世界掉落；裝備後綁定"},"裝綁"));
assert.ok(expansion.acquisitionMatches({acquisition:"製作",bond:"裝備綁定"},"裝綁"));
assert.ok(!expansion.acquisitionMatches({acquisition:"聲望",bond:"拾取綁定"},"裝綁"));
const oldTaran={id:"2915",type:"單手錘",slot:"主手"};
const fixedCat=expansion.expandCandidateSlots({id:"spec-26",slots:new Map([["主手",[oldTaran]],["雙手武器",[]],["頭部",[]],["肩部",[]],["手腕",[]],["腳部",[]]])});
assert.equal(fixedCat.get("主手").length,0);
assert.equal(fixedCat.get("雙手武器").find(x=>x.id==="2915").type,"雙手錘");
assert.equal([...fixedCat.values()].flat().filter(x=>x.setGroup==="feralheart-cat").length,4);
assert.equal(expansion.gearCatalogEligible({id:"spec-26"},{id:2915,item_class:"Weapon",slot:"One-Hand",subclass:"One-Handed Mace"},p),false);
const coverage=new Function(section("function collectionCoverage(","function checklist(")+";return collectionCoverage;")();
assert.deepEqual(coverage([[{id:"a"}],[{id:"a"}]],{a:true}),{have:1,total:2});
assert.deepEqual(coverage([[{id:"a"},{id:"b"}],[{id:"a"}]],{a:true,b:true}),{have:2,total:2});
assert.deepEqual(coverage([[{id:"a"}]],{}),{have:0,total:1});
const news=new Function(section("const bluePosts=","function feralSetView(")+";return {bluePosts,specHotfixes};")();
assert.equal(news.bluePosts.length,15);
assert.equal(new Set(news.bluePosts.map(p=>p.key)).size,15);
assert.equal(news.bluePosts.find(p=>p.key==="199").sections.length,6);
assert.ok(news.bluePosts.find(p=>p.key==="180").sections[0].body.includes("13級"));
assert.ok(news.specHotfixes("spec-17").some(x=>x.date==="2026-11-11"));
assert.ok(news.specHotfixes("spec-25").some(x=>x.title==="梟獸形態"));
assert.ok(news.specHotfixes("spec-26").some(x=>x.title==="野性德魯伊套裝"));
assert.ok(news.specHotfixes("spec-29").length===0);
console.log("PASS: hotfix mapping, set candidates, Taran correction, overlapping acquisition and distinct collection coverage");

const officialMerge=new Function(section("function validOfficialPost(","function renderBlueBoard(")+";return {validOfficialPost,combineOfficialBlue};")();
assert.ok(news.bluePosts.every(officialMerge.validOfficialPost));
const incoming={key:"official-us:123:1",date:"2026-11-27",title:"新公告",url:"https://us.forums.blizzard.com/en/wow/t/123/1",translationStatus:"pending",sections:[{category:"官方公告",title:"待翻譯",body:"請閱官方"}]};
assert.ok(officialMerge.validOfficialPost(incoming));
assert.equal(officialMerge.validOfficialPost({...incoming,url:"https://untrusted.example/en/wow/t/123/1"}),false);
assert.equal(officialMerge.validOfficialPost({...incoming,url:"javascript:alert(1)"}),false);
assert.equal(officialMerge.combineOfficialBlue(news.bluePosts,[incoming,incoming]).length,16);
assert.equal(officialMerge.combineOfficialBlue(news.bluePosts,[incoming])[0].key,incoming.key);
assert.equal(officialMerge.combineOfficialBlue(news.bluePosts,[{...incoming,translationStatus:"untrusted"}]).length,15);
console.log("PASS: official-source URL validation, deduplication, translation status and newest-first ordering");
