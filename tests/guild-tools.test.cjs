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
const materialTotals=new Function(section("function parseRecipeMaterials(","function material(")+";return recipeMaterialTotals;")();
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

const expansion=new Function(section("const rogueProfiles=","function syncWeaponCards")+section("const expandedGear=","let gearCatalogPromise=")+";return {expandedGear,expandCandidateSlots,gearCatalogEligible,gearCatalogTags,gearClassIndex,gearType,catalogDiff,catalogWeightScore,catalogWeightCoverage,catalogSameSlot,catalogCandidateFilter,catalogSourceRecorded,validGearCatalog,catalogSlotCheck,candidateCatalogPosition,catalogHasSpecial,catalogPlanSourceAllowed,catalogArmorPlan,catalogSetPools,catalogSetOptions,catalogSetAlternative,catalogSetCounts,catalogSetTradeoff,catalogPlanText,catalogWeaponPlan,catalogWeaponScore,effectiveGearWeights,omittedFeralWeights,candidateCatalogCheck,acquisitionMatches,allowed,buildChoice};")();
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

const officialMerge=new Function(section("function validOfficialPost(","function renderBlueBoard(")+";return {validOfficialPost,combineOfficialBlue,blueCheckpointText,liveClassPosts,blueClassLabels};")();
assert.ok(news.bluePosts.every(officialMerge.validOfficialPost));
const incoming={key:"official-us:123:1",date:"2026-11-27",title:"新公告",url:"https://us.forums.blizzard.com/en/wow/t/123/1",translationStatus:"pending",sections:[{category:"官方公告",title:"待翻譯",body:"請閱官方"}]};
assert.ok(officialMerge.validOfficialPost(incoming));
assert.equal(officialMerge.validOfficialPost({...incoming,url:"https://untrusted.example/en/wow/t/123/1"}),false);
assert.equal(officialMerge.validOfficialPost({...incoming,url:"javascript:alert(1)"}),false);
assert.equal(officialMerge.combineOfficialBlue(news.bluePosts,[incoming,incoming]).length,16);
assert.equal(officialMerge.combineOfficialBlue(news.bluePosts,[incoming])[0].key,incoming.key);
assert.equal(officialMerge.combineOfficialBlue(news.bluePosts,[{...incoming,translationStatus:"untrusted"}]).length,15);
console.log("PASS: official-source URL validation, deduplication, translation status and newest-first ordering");

// Catalog score deliberately excludes ambiguous rating/percentage fields and armor type itself.
const catalogWeights={"敏捷":2,"力量":1,"護甲":0,"命中機率":99};
const leather=expansion.catalogWeightScore({subclass:"Leather",agility:20,strength:10,armor:80,hit:0},catalogWeights);
const plate=expansion.catalogWeightScore({subclass:"Plate",agility:5,strength:20,armor:400,hit:10},catalogWeights);
assert.equal(leather.total,50);assert.equal(plate.total,30);
assert.ok(leather.total>plate.total);
assert.equal(expansion.catalogWeightScore({armor:400},{"護甲":2}).total,800);
assert.equal(expansion.catalogWeightScore({hit:10},{"命中機率":2}).used,0);

// Expanded raw stat fields are independent; ambiguous ratings are still excluded.
assert.equal(expansion.catalogWeightScore({attack_power:30,ranged_attack_power:20,spell_power:15,spell_damage:10,healing:40,mp5:5,block_value:8},{"攻擊強度":1,"遠程攻強":2,"法術能量":3,"法術傷害":4,"治療加成":5,"每5秒法力":6,"格擋值":7}).total,441);
assert.equal(expansion.catalogWeightScore({spell_power:30,spell_damage:10,healing:40},{"治療加成":1}).total,40);
assert.deepEqual(expansion.catalogWeightCoverage({"力量":1,"命中機率":2,"武器DPS":3,"爆擊":0}),["命中機率","武器DPS"]);
console.log("PASS: expanded catalog raw stat mappings and omitted-weight disclosure");

// Candidate coverage, data validity and hand/slot mismatch regression tests.
const ids=new Set(["1","2"]);
assert.equal(expansion.catalogCandidateFilter({id:1},ids,"new"),false);
assert.equal(expansion.catalogCandidateFilter({id:3},ids,"new"),true);
assert.equal(expansion.catalogCandidateFilter({id:1},ids,"known"),true);
assert.equal(expansion.catalogCandidateFilter({id:3},ids,"known"),false);
assert.equal(expansion.catalogSourceRecorded({estimated:1,source_summary:"World drop"}),false);
assert.equal(expansion.catalogSourceRecorded({source_summary:" "}),false);
assert.equal(expansion.catalogSourceRecorded({source_summary:"World drop"}),true);
assert.equal(expansion.validGearCatalog({items:[],prof:{},meta:{client_build:"x"}}),false);
assert.equal(expansion.validGearCatalog({items:[{}],prof:{},meta:{client_build:"x"}}),false);
const completeProf=Object.fromEntries(["Warrior","Paladin","Hunter","Rogue","Priest","Shaman","Mage","Warlock","Druid"].map(k=>[k,{}]));
assert.equal(expansion.validGearCatalog({items:[{}],prof:completeProf,meta:{client_build:"x"}}),true);
assert.equal(expansion.validGearCatalog({items:[{}],prof:completeProf,meta:{client_build:" "}}),false);
assert.equal(expansion.catalogSlotCheck({slot:"主手",type:"雙手錘"},{slot:"Two-Hand"}),true);
assert.equal(expansion.catalogSlotCheck({slot:"主手",type:"單手錘"},{slot:"Two-Hand"}),false);
assert.equal(expansion.catalogSlotCheck({slot:"副手",type:"匕首"},{slot:"One-Hand"}),true);
assert.equal(expansion.catalogSlotCheck({slot:"副手",type:"匕首"},{slot:"Main Hand"}),false);
assert.equal(expansion.catalogSlotCheck({slot:"胸部"},{slot:"Robe"}),true);
assert.equal(expansion.catalogSlotCheck({slot:"戒指2"},{slot:"Trinket"}),false);
assert.equal(expansion.catalogSlotCheck({slot:"特殊"},{slot:"Head"}),null);
console.log("PASS: missing candidate discovery, catalog validation and slot mismatch checks");

// A generic dagger may be equipped in either hand for a dual-dagger build; main-hand-only may not.
const daggerRecord={item_class:"Weapon",slot:"One-Hand",subclass:"Dagger"};
assert.equal(expansion.gearCatalogEligible({id:"spec-10"},daggerRecord,rogue,"主手"),true);
assert.equal(expansion.gearCatalogEligible({id:"spec-10"},daggerRecord,rogue,"副手"),true);
assert.equal(expansion.gearCatalogEligible({id:"spec-10"},{...daggerRecord,slot:"Main Hand"},rogue,"副手"),false);
assert.equal(expansion.gearCatalogEligible({id:"spec-13"},daggerRecord,priest,"副手"),false);
assert.equal(expansion.gearCatalogEligible({id:"spec-13"},daggerRecord,priest,"主手"),true);
assert.deepEqual(expansion.candidateCatalogCheck({stats:{"攻擊強度":30,"治療加成":20,"命中機率":2}},{attack_power:35,healing:20,hit:5}).differences,[{label:"攻擊強度",old:30,current:35}]);
console.log("PASS: hand-specific catalog eligibility, complete proficiency validation and expanded stat audits");

// Full-catalog armor plan: cross-armor is legal, same IDs are never duplicated, and unsupported effects do not inflate scores.
const planProf={Warrior:{armor:{Plate:40},weapons:[]}};
const itemForPlan=(id,slot,subclass,agility,extra={})=>({id,slot,subclass,agility,item_class:"Armor",quality:3,source_summary:"World drop",...extra});
const planItems=[itemForPlan(101,"Chest","Plate",10),itemForPlan(102,"Chest","Leather",20),itemForPlan(103,"Chest","Cloth",100,{estimated:1}),itemForPlan(104,"Finger","Miscellaneous",9),itemForPlan(104,"Finger","Miscellaneous",9),itemForPlan(105,"Finger","Miscellaneous",8),itemForPlan(106,"Finger","Miscellaneous",1),itemForPlan(107,"Trinket","Miscellaneous",12,{effects:"Proc"}),itemForPlan(108,"Trinket","Miscellaneous",0),itemForPlan(109,"Head","Plate",99,{source_summary:" "})];
const armorPlan=expansion.catalogArmorPlan({id:"spec-2"},planItems,planProf,{"敏捷":1});
assert.deepEqual(armorPlan.groups.find(g=>g.slot==="胸部").picks.map(p=>p.item.id),[102]);
assert.deepEqual(armorPlan.groups.find(g=>g.slot==="戒指").picks.map(p=>p.item.id),[104,105]);
assert.equal(armorPlan.expected,14);assert.equal(armorPlan.filled,4);assert.equal(armorPlan.total,49);
assert.equal(expansion.catalogArmorPlan({id:"spec-2"},planItems,planProf,{"敏捷":1},{excludeEffects:true}).total,37);
assert.equal(expansion.catalogArmorPlan({id:"spec-2"},planItems,planProf,{"敏捷":1},{minQuality:4}).filled,0);
assert.equal(expansion.catalogArmorPlan({id:"spec-2"},planItems,planProf,{"命中機率":1}).filled,0);
console.log("PASS: catalog armor plan honors cross-armor, distinct ring IDs, quality, source evidence and score limitations");

// Full catalog weapons: exact DPS, distinct IDs, main/off restrictions and shield requirements.
const wp={Warrior:{armor:{Plate:40,Shield:1},weapons:["One-Handed Sword","Two-Handed Sword"]},Rogue:{armor:{Leather:1},weapons:["Dagger"]}};
const weaponForPlan=(id,slot,subclass,dps,extra={})=>({id,slot,subclass,dps,item_class:"Weapon",quality:3,source_summary:"World drop",...extra});
const wpItems=[weaponForPlan(201,"One-Hand","One-Handed Sword",50),weaponForPlan(202,"One-Hand","One-Handed Sword",40),weaponForPlan(203,"Main Hand","One-Handed Sword",45),weaponForPlan(204,"Two-Hand","Two-Handed Sword",70),weaponForPlan(205,"One-Hand","One-Handed Sword",100,{dps_approx:1}),{id:206,slot:"Shield",subclass:"Shield",item_class:"Armor",armor:100,source_summary:"Vendor",quality:3}];
const dualPlan=expansion.catalogWeaponPlan({id:"spec-2"},wpItems,wp,{"主手DPS":2,"副手DPS":1});
assert.deepEqual(dualPlan.melee.picks.map(p=>p.item.id),[201,202]);assert.equal(dualPlan.total,140);
assert.equal(expansion.catalogWeaponPlan({id:"spec-1"},wpItems,wp,{"雙手DPS":1}).melee.picks[0].item.id,204);
const shieldPlan=expansion.catalogWeaponPlan({id:"spec-3"},wpItems,wp,{"主手DPS":1,"護甲":1});
assert.equal(shieldPlan.melee.kind,"主手＋盾牌");assert.deepEqual(shieldPlan.melee.picks.map(p=>p.item.id),[201,206]);assert.equal(shieldPlan.total,150);
assert.equal(expansion.catalogWeaponPlan({id:"spec-3"},wpItems.filter(x=>x.id!==206),wp,{"主手DPS":1}).melee,null);
assert.equal(expansion.catalogWeaponScore(wpItems[5],"副手",{"武器DPS":5,"護甲":1}).total,100);
assert.equal(expansion.catalogWeaponScore(wpItems[4],"主手",{"武器DPS":1}).incomplete,true);
assert.equal(expansion.catalogWeaponPlan({id:"spec-10"},[weaponForPlan(211,"One-Hand","Dagger",50)],wp,{"武器DPS":1}).melee,null);
console.log("PASS: full catalog weapon configurations and hand-specific DPS");

const checkpointFixture={lastCheck:{at:"2026-11-27T12:00:00Z",status:"partial",regions:{us:{read:10,attempted:10},eu:{read:0,attempted:3}}}};
assert.ok(officialMerge.blueCheckpointText(checkpointFixture,Date.parse("2026-11-27T12:10:00Z")).includes("部分抽查未成功"));
assert.ok(officialMerge.blueCheckpointText(checkpointFixture,Date.parse("2026-11-27T20:00:00Z")).includes("紀錄已逾7小時"));
assert.ok(officialMerge.blueCheckpointText({}).includes("尚無已發布的抓取紀錄"));
console.log("PASS: blue-post checkpoint and stale status display");

const tagged={...incoming,classMentions:["druid","mage","invalid"]};
assert.equal(officialMerge.liveClassPosts("spec-28",[tagged]).length,1);
assert.equal(officialMerge.liveClassPosts("spec-19",[tagged]).length,1);
assert.equal(officialMerge.liveClassPosts("spec-1",[tagged]).length,0);
assert.equal(officialMerge.liveClassPosts("spec-29",[tagged]).length,0);
assert.deepEqual(officialMerge.blueClassLabels(tagged),["法師","德魯伊"]);
assert.equal(officialMerge.liveClassPosts("spec-28",[{...tagged,url:"https://untrusted.example"}]).length,0);
console.log("PASS: tentative live notice class mapping and trusted sources");

// Exact additive set constraint across slots; two rings cannot reuse the same item ID.
const setItems=[itemForPlan(301,"Head","Plate",30),itemForPlan(302,"Head","Leather",20,{item_set:"Example Set"}),itemForPlan(303,"Chest","Plate",50),itemForPlan(304,"Chest","Leather",25,{item_set:"Example Set"}),itemForPlan(305,"Finger","Miscellaneous",15),itemForPlan(306,"Finger","Miscellaneous",12,{item_set:"Example Set"}),itemForPlan(306,"Finger","Miscellaneous",12,{item_set:"Example Set"}),itemForPlan(307,"Finger","Miscellaneous",0,{item_set:"Example Set"}),itemForPlan(308,"Shoulder","Plate",99,{item_set:"Example Set",estimated:1})];
const setPools=expansion.catalogSetPools({id:"spec-2"},setItems,planProf,{"敏捷":1});
assert.deepEqual(expansion.catalogSetOptions(setPools),[["Example Set",4]]);
const twoSet=expansion.catalogSetAlternative(setPools,"Example Set",2);
assert.equal(twoSet.total,97);assert.deepEqual(expansion.catalogSetCounts(twoSet.picks),[["Example Set",2]]);
const fourSet=expansion.catalogSetAlternative(setPools,"Example Set",4);
assert.equal(fourSet.total,57);assert.equal(new Set(fourSet.picks.map(p=>p.item.id)).size,4);
assert.equal(expansion.catalogSetAlternative(setPools,"Example Set",5),null);
assert.deepEqual(expansion.catalogSetOptions(expansion.catalogSetPools({id:"spec-2"},setItems,planProf,{"敏捷":1},{excludeEffects:true})),[]);
console.log("PASS: exact armor set constraints, zero-stat set pieces, duplicate ID handling and trade-off scores");

// Net effect is incremental versus the baseline, not the total set bonus.
assert.deepEqual(expansion.catalogSetTradeoff(107,97),{gap:10,required:10,net:null});
assert.deepEqual(expansion.catalogSetTradeoff(107,97,12),{gap:10,required:10,net:2});
assert.deepEqual(expansion.catalogSetTradeoff(107,97,-5),{gap:10,required:10,net:-15});
assert.equal(expansion.catalogSetTradeoff(Infinity,97,12),null);
const exportText=expansion.catalogPlanText({spec:"狂暴",build:"dual",version:"1.60",source:"test",filter:"不限品質",label:"測試",total:97,omitted:["命中機率"]},[{slot:"頭部",name:"測試\n頭盔",item:{id:302,source_summary:"World drop"},score:{total:20}}]);
assert.ok(exportText.includes("非實戰BiS"));assert.ok(exportText.includes("頭部｜測試 頭盔｜ID 302｜20.00｜World drop"));assert.ok(exportText.includes("未計權重：命中機率"));
console.log("PASS: net set benefit comparison and shareable gear plan export");

const auditHelpers=new Function(section("function auditSlotOrder(","function audit(")+";return {auditSlotOrder,auditMatches};")();
assert.deepEqual(["遠程武器","頭部","副手","主手","戒指"].sort((a,b)=>auditHelpers.auditSlotOrder(a)-auditHelpers.auditSlotOrder(b)),["頭部","戒指","主手","副手","遠程武器"]);
assert.equal(auditHelpers.auditMatches({name:"Example",id:123,stats:{"敏捷":20},wm:{"武器DPS":10}},"主手",["敏捷","123"]),true);
assert.equal(auditHelpers.auditMatches({name:"Example",stats:{"敏捷":20}},"主手",["智力"]),false);
console.log("PASS: ordered equipment slots and multi-term stat search");

const iconHelper=new Function(section("function itemIconURL(","let itemIconPromise=")+";return itemIconURL;")();
const iconFixture={build:"1.60.1.71139",items:{"19323":"inv_mace_01","2":"../bad","3":"https://example.com/x"}};
assert.equal(iconHelper(iconFixture,19323),"https://wow.zamimg.com/images/wow/icons/medium/inv_mace_01.jpg");
assert.equal(iconHelper(iconFixture,2),"");assert.equal(iconHelper(iconFixture,3),"");assert.equal(iconHelper(iconFixture,999),"");
assert.equal(iconHelper({...iconFixture,build:"other"},19323),"");
console.log("PASS: item icon URL validation and exact version matching");

const coverageHelper=new Function(section("function itemIconURL(","function auditSlotOrder(")+";return candidateDataCoverage;")();
const localeFixture={build:"1.60.1.71139",items:{"19323":"測試名稱","2":"English"}};
assert.deepEqual(coverageHelper([19323,"19323",2,3,"invalid"],localeFixture,iconFixture),{total:3,localized:1,icons:1});
assert.deepEqual(coverageHelper([19323],{...localeFixture,build:"other"},null),{total:1,localized:null,icons:null});
console.log("PASS: distinct candidate IDs, version-aware localized name and icon coverage");

assert.equal(expansion.catalogSlotCheck({slot:"副手",type:"盾牌"},{slot:"One-Hand"}),false);
assert.equal(expansion.catalogSlotCheck({slot:"副手",type:"匕首"},{slot:"Shield"}),false);
assert.equal(expansion.catalogSlotCheck({slot:"副手",type:"持有型副手"},{slot:"Held In Off-hand"}),true);
assert.equal(expansion.catalogSlotCheck({slot:"聖物",type:"塑像"},{slot:"Ranged"}),false);
assert.equal(expansion.catalogSlotCheck({slot:"遠程",type:"弓"},{slot:"Relic"}),false);
assert.equal(expansion.catalogSlotCheck({slot:"雙手武器"},{slot:"Two-Hand"}),true);
assert.equal(expansion.candidateCatalogPosition({slot:"副手",type:"匕首"},{slot:"One-Hand"}),"副手");
assert.equal(expansion.candidateCatalogPosition({slot:"主手",type:"雙手錘"},{slot:"Two-Hand"}),"雙手武器");
assert.equal(expansion.catalogHasSpecial({effects:[],other_stats:{},item_set:" "}),false);
assert.equal(expansion.catalogHasSpecial({effects:[""],other_stats:"[]"}),false);
assert.equal(expansion.catalogHasSpecial({effects:["Equip: effect"]}),true);
assert.equal(expansion.catalogHasSpecial({item_set:"Set"}),true);
console.log("PASS: strict weapon slot reconciliation and empty effect handling");

const feralWeights={"敏捷":1,"武器DPS":10,"雙手DPS":2};
assert.deepEqual(expansion.effectiveGearWeights("spec-26",feralWeights),{"敏捷":1});
assert.deepEqual(expansion.effectiveGearWeights("spec-27",feralWeights),{"敏捷":1});
assert.deepEqual(expansion.effectiveGearWeights("spec-28",feralWeights),feralWeights);
assert.deepEqual(expansion.omittedFeralWeights("spec-26",feralWeights),["武器DPS","雙手DPS"]);
const feralWeapons=[{...weaponForPlan(501,"Two-Hand","Two-Handed Mace",100),agility:1},{...weaponForPlan(502,"Two-Hand","Two-Handed Mace",10),agility:20}];
const feralProf={Druid:{armor:{Leather:1},weapons:["Two-Handed Mace"]}};
assert.equal(expansion.catalogWeaponPlan({id:"spec-26"},feralWeapons,feralProf,feralWeights).melee.picks[0].item.id,502);
assert.equal(expansion.catalogWeaponPlan({id:"spec-27"},feralWeapons,feralProf,{"武器DPS":1}).melee,null);
console.log("PASS: raw weapon DPS excluded from unverified feral form scores");

const sourceItems=[itemForPlan(601,"Head","Plate",50,{required_reputation:"Frostwolf - Exalted",source_summary:"Vendor"}),itemForPlan(602,"Head","Leather",20,{bonding:"Binds when equipped"}),itemForPlan(603,"Head","Plate",30,{bonding:"Binds when picked up"})];
assert.equal(expansion.catalogArmorPlan({id:"spec-2"},sourceItems,planProf,{"敏捷":1}).total,50);
assert.equal(expansion.catalogArmorPlan({id:"spec-2"},sourceItems,planProf,{"敏捷":1},{excludeReputation:true}).total,30);
assert.equal(expansion.catalogArmorPlan({id:"spec-2"},sourceItems,planProf,{"敏捷":1},{boeOnly:true}).total,20);
assert.equal(expansion.catalogPlanSourceAllowed({source_summary:"World drop",estimated:1},{boeOnly:true}),false);
assert.equal(expansion.catalogPlanSourceAllowed({source_summary:"Reputation vendor"},{excludeReputation:true}),false);
assert.equal(expansion.catalogPlanSourceAllowed({source_summary:"Drop",bonding:"Binds when picked up"},{boeOnly:true}),false);
console.log("PASS: source constraints for reputation and BoE equipment plans");

const weaponDisplay=new Function(section("function auditSlotOrder(","function audit(")+";return {auditWeaponGroups,auditWeaponVisible,auditWeaponPreference,auditOtherWeaponMatches,auditEquipmentSlots,auditEquipmentChoices};")();
const mixedSlots=[{name:"頭部",items:[{id:1,type:"布甲"}]},{name:"主手",items:[{id:2,type:"法杖"},{id:3,type:"單手錘"}]},{name:"雙手武器",items:[{id:2,type:"法杖"}]},{name:"副手物品",items:[{id:4,type:"持有型副手"}]},{name:"遠程武器",items:[{id:5,type:"魔杖"}]}];
const partition=weaponDisplay.auditWeaponGroups(mixedSlots);
assert.deepEqual(partition.modes,["two","one"]);
const twoSlots=weaponDisplay.auditWeaponVisible(partition,"two"),oneSlots=weaponDisplay.auditWeaponVisible(partition,"one");
assert.deepEqual(twoSlots.map(s=>s.name),["頭部","雙手武器","遠程武器"]);
assert.deepEqual(oneSlots.map(s=>s.name),["頭部","主手武器","副手物品","遠程武器"]);
assert.deepEqual(twoSlots.flatMap(s=>s.items.map(x=>x.id)),[1,2,5]);
assert.deepEqual(oneSlots.flatMap(s=>s.items.map(x=>x.id)),[1,3,4,5]);
assert.deepEqual(weaponDisplay.auditWeaponGroups([{name:"雙手武器",items:[{id:1,type:"法杖"}]},{name:"副手",items:[]}]).modes,["two"]);
console.log("PASS: exclusive two-hand and one-hand/offhand display groups, dedup and ranged preservation");

assert.equal(weaponDisplay.auditWeaponPreference(["two","one"],"one"),"one");
assert.equal(weaponDisplay.auditWeaponPreference(["two"],"one"),"two");
assert.equal(weaponDisplay.auditWeaponPreference([],"one"),"");
assert.deepEqual(weaponDisplay.auditOtherWeaponMatches(partition,"two",x=>x.id===4),{mode:"one",count:1});
assert.deepEqual(weaponDisplay.auditOtherWeaponMatches(partition,"one",x=>x.id===2),{mode:"two",count:1});
const sortedPartition=weaponDisplay.auditWeaponGroups([{name:"主手",items:[{id:1,type:"法杖",rank:9}]},{name:"雙手武器",items:[{id:2,type:"法杖",rank:1}]}],(a,b)=>a.rank-b.rank);
assert.equal(sortedPartition.groups.two[0].id,2);
assert.equal(expansion.catalogWeaponPlan({id:"spec-1"},wpItems,wp,{"雙手DPS":1},{weaponMode:"one"}).melee,null);
assert.equal(expansion.catalogWeaponPlan({id:"spec-2"},wpItems,wp,{"主手DPS":2,"副手DPS":1},{weaponMode:"two"}).melee,null);
console.log("PASS: weapon mode preference, hidden-mode search, merged rank and illegal configuration exclusion");

const prepHelpers=new Function(section("function parseRecipeMaterials(","function material(")+";return {parseRecipeMaterials,recipeMaterialTotals,recipeShoppingRows,recipeSearchMatches};")();
assert.deepEqual(prepHelpers.recipeMaterialTotals([{recipe:{name:"A",mat:"夢葉草 × 2；水晶瓶×1\n夢葉草×1"},count:3}]).totals.sort(),[["夢葉草",9],["水晶瓶",3]].sort());
assert.equal(prepHelpers.recipeMaterialTotals([{recipe:{name:"缺資料",mat:""},count:1}]).unknown.length,1);
assert.equal(prepHelpers.parseRecipeMaterials("夢葉草×0、材料×2.5、材料×9007199254740992").filter(x=>x.qty===null).length,3);
assert.deepEqual(prepHelpers.recipeShoppingRows([["草",10],["瓶",2],["石",5]],{"草":4,"瓶":10,"石":-3}).map(x=>x.remaining),[6,0,5]);
assert.equal(prepHelpers.recipeSearchMatches({name:"測試配方",mat:"Dreamfoil×2",where:"商人"},"夢葉草 商人",v=>v.replace("Dreamfoil","夢葉草")),true);
assert.equal(prepHelpers.recipeSearchMatches({name:"測試",mat:"夢葉草×2"},"夢葉草 商人"),false);
console.log("PASS: recipe quantities, missing materials, owned inventory, multilingual multi-term search");

const paper=weaponDisplay.auditWeaponGroups([...mixedSlots,{name:"戒指",items:[{id:6},{id:7},{id:6}]},{name:"指環",items:[{id:8}]},{name:"飾品",items:[{id:9}]},{name:"聖物",items:[{id:10}]}]);
const paperTwo=weaponDisplay.auditEquipmentSlots(paper,"two"),paperOne=weaponDisplay.auditEquipmentSlots(paper,"one");
assert.equal(paperTwo.length,16);
assert.equal(paperOne.length,17);
assert.deepEqual(paperTwo.filter(x=>x.group==="戒指").map(x=>x.name),["戒指 1","戒指 2"]);
assert.deepEqual(paperTwo.filter(x=>x.group==="飾品").map(x=>x.name),["飾品 1","飾品 2"]);
assert.equal(paperTwo.filter(x=>x.group==="遠程／聖物").length,1);
assert.equal(paperTwo.find(x=>x.group==="遠程／聖物").items.length,2);
assert.ok(!paperTwo.some(x=>/副手|主手/.test(x.name)));
const picks=weaponDisplay.auditEquipmentChoices(paperTwo);
assert.deepEqual(picks.filter(x=>x.group==="戒指").map(x=>x.featured.id),[6,7]);
assert.deepEqual(picks.filter(x=>x.group==="飾品").map(x=>x.featured?.id||null),[9,null]);
assert.equal(new Set(picks.filter(x=>x.featured).map(x=>x.featured.id)).size,picks.filter(x=>x.featured).length);
assert.equal(weaponDisplay.auditEquipmentChoices(paperTwo,x=>x.id===6).filter(x=>x.featured).length,1);
assert.equal(coverage(paperTwo.map(x=>x.items),{"6":true,"7":true,"9":true}).have,3);
const jewelryExport=expansion.catalogPlanText({total:10},[1,2].map(id=>({slot:"飾品",item:{id,name:"測試"},score:{total:5}})));
assert.ok(jewelryExport.includes("飾品 1｜")&&jewelryExport.includes("飾品 2｜"));
console.log("PASS: 16/17 physical battle positions, two rings and trinkets, shared ranged/relic, no repeated featured IDs and numbered export");

const combat=new Function(section("const combatPaths=","function combatLab(")+";return {combatEngineURL,simulatePriority,combatBestPriority,combatResult,combatPresetCases,combatTimelineText,combatPresetCommit,combatPhaseMetrics,combatDurationSweep,combatTimingSweep,combatSkillStats,combatNativeGroups,combatTargetSweep,combatObjective,combatCoverage,combatRole,combatMetric,combatEquipmentSpec,combatApplyEquipment,combatRequestPath,combatReadJSON,combatNativeActions,combatEquipmentRows,combatPlanEquipment,combatGearTrial,combatEquipmentDiff,combatScenarioRequest,combatResultPlayers,combatResultDelta,combatSnapshotValid,combatFailureLabel};")();
for(let i=1;i<=28;i++)assert.match(combat.combatEngineURL("spec-"+i),/^https:\/\/www\.wowsims\.com\/forever\//);
assert.equal(combat.combatEngineURL("spec-26"),"https://www.wowsims.com/forever/druid/feralcat/");
assert.equal(combat.combatEngineURL("spec-27"),"https://www.wowsims.com/forever/druid/feralbear/");
assert.equal(combat.combatEngineURL("spec-29"),null);
const demo={duration:6,gcd:1,cap:100,initial:100,regen:0,skills:[{name:"A",cost:40,gain:0,cd:2,cast:0,damage:100,threat:100},{name:"B",cost:10,gain:0,cd:0,cast:0,damage:20,threat:150}]};
const first=combat.simulatePriority(demo),last=combat.simulatePriority(demo,true);
assert.deepEqual(first.events.map(e=>e.name),["A","B","A","B"]);
assert.deepEqual(first.events.map(e=>e.time),[0,1,2,3]);
assert.equal(first.totals.damage,240);
assert.equal(last.totals.threat,900);
assert.equal(combat.combatBestPriority(demo,"damage").order[0],"A");
assert.equal(combat.combatBestPriority(demo,"threat").order[0],"B");
assert.equal(combat.combatBestPriority(demo,"damage").count,2);
assert.throws(()=>combat.simulatePriority({...demo,initial:101}));
assert.throws(()=>combat.simulatePriority({...demo,skills:[demo.skills[0],demo.skills[0]]}));
assert.throws(()=>combat.simulatePriority({...demo,skills:[{...demo.skills[0],damage:NaN}]}));
const longCast=combat.simulatePriority({...demo,duration:1,skills:[{...demo.skills[0],cast:2}]});
assert.equal(longCast.events.length,0);
const result=combat.combatResult({iterationsDone:1000,avgIterationDuration:180,raidMetrics:{parties:[{players:[{name:"test",dps:{avg:500},threat:{avg:700}}]}]}});
assert.equal(result.dps,500);assert.equal(result.tps,700);assert.equal(result.hps,null);
assert.throws(()=>combat.combatResult({iterationsDone:100,raidMetrics:{parties:[{players:[{dps:{avg:1}},{dps:{avg:2}}]}]}}));
assert.equal(combat.combatResult({iterations:1000,duration:180,dps:{mean:123},timeline:[{timeMs:-1500,label:"prepull"}]}).logs,"-1.500s ｜ prepull");
assert.equal(combat.combatTimelineText([{timeMs:0,label:"A"},{timeMs:1250,label:"B"}]),"0.000s ｜ A\n1.250s ｜ B");
const native={format:1,release:"v1.0.12",commit:combat.combatPresetCommit,cases:[{spec:"spec-7",label:"fixture",dps:10,duration:180,iterations:1000,timeline:[{timeMs:0,label:"test"}],settings:"ui/specs/hunter/dps/builds/bm.siml",apl:"ui/specs/hunter/dps/apls/turret_hawk.apl.siml"}]};
assert.equal(combat.combatPresetCases(native,"spec-7").length,1);
assert.equal(combat.combatPresetCases(native,"spec-8").length,0);
assert.equal(combat.combatPresetCases({...native,commit:"old"},"spec-7").length,0);
console.log("PASS: all 28 engine routes, bounded priority scheduling, resource exhaustion, objective optimization and real result format validation");


// Time-limited skill usage and pooling, exact encounter end, and phase conservation.
const timedSkill={name:"Timed",cost:20,gain:0,cd:0,cast:1,damage:100,threat:150};
const timedBase={duration:10,gcd:1,cap:100,initial:100,regen:0,skills:[timedSkill]};
const pooled=combat.simulatePriority({...timedBase,skills:[{...timedSkill,earliest:2,latest:4,reserve:60}]});
assert.equal(pooled.events.length,2);
assert.ok(pooled.events[0].time>=2-1e-8);
assert.equal(pooled.events[1].after,60);
assert.throws(()=>combat.simulatePriority({...timedBase,skills:[{...timedSkill,earliest:5,latest:2}]}));
assert.throws(()=>combat.simulatePriority({...timedBase,skills:[{...timedSkill,reserve:101}]}));
const onBoundary=combat.simulatePriority({...timedBase,duration:1});
assert.equal(onBoundary.events.length,1);
assert.equal(onBoundary.events[0].finish,1);
const phaseRun=combat.simulatePriority({...timedBase,duration:40,regen:100});
const phases=combat.combatPhaseMetrics(phaseRun);
assert.equal(phases.length,3);
assert.equal(phases.reduce((a,p)=>a+p.count,0),phaseRun.events.length);
for(const metric of ["damage","threat","healing"])assert.ok(Math.abs(phases.reduce((a,p)=>a+p[metric]*(p.end-p.start),0)-phaseRun.totals[metric])<1e-6);
assert.ok(phaseRun.wasted>0);
const invalidMetrics={iterationsDone:20,raidMetrics:{parties:[{players:[{dps:{avg:10},threat:{avg:-5},chanceOfDeath:4}]}]}};
const sanitized=combat.combatResult(invalidMetrics);
assert.equal(sanitized.dps,10);assert.equal(sanitized.tps,null);assert.equal(sanitized.death,null);
assert.throws(()=>combat.combatResult({...invalidMetrics,error:{type:"Error"}}));
assert.throws(()=>combat.combatResult({...invalidMetrics,raidMetrics:{parties:{}}}));
console.log("PASS: timed priorities, resource pooling, encounter boundary, phase conservation, overcap and invalid metric handling");


// Exact event boundaries, encounter length sweeps and delayed opening comparisons.
const thresholdSkill={name:"Threshold",cost:10,gain:0,cd:0,cast:0,damage:100,threat:20};
const thresholdBase={duration:10,gcd:1,cap:100,initial:0,regen:3,skills:[thresholdSkill]};
const thresholdResult=combat.simulatePriority(thresholdBase);
assert.ok(Math.abs(thresholdResult.events[0].time-10/3)<1e-8);
assert.equal(combat.simulatePriority({...thresholdBase,initial:100,skills:[{...thresholdSkill,earliest:1.037}]}).events[0].time,1.037);
assert.equal(combat.simulatePriority({...thresholdBase,regen:0}).events.length,0);
assert.equal(combat.simulatePriority({...thresholdBase,skills:[{...thresholdSkill,reserve:100}]}).events.length,0);
const durationRows=combat.combatDurationSweep(thresholdBase,"damage");
assert.deepEqual(durationRows.map(x=>x.duration),[30,60,120,180]);
assert.ok(durationRows.every(x=>x.best&&x.best.result.duration===x.duration));
assert.equal(combat.combatDurationSweep({...thresholdBase,skills:[{...thresholdSkill,earliest:45}]},"damage")[0].original.events.length,0);
const timingRows=combat.combatTimingSweep(thresholdBase,"Threshold","damage");
assert.deepEqual(timingRows.rows.map(x=>x.offset),[0,1,3,5]);
assert.ok(timingRows.best.result.rate.damage>=timingRows.baseline.rate.damage);
assert.throws(()=>combat.combatTimingSweep(thresholdBase,"missing","damage"));
assert.equal(combat.combatSkillStats(thresholdResult).reduce((sum,x)=>sum+x.damage,0),thresholdResult.totals.damage);
assert.equal(combat.combatEngineURL("x-26"),null);
assert.equal(combat.combatEngineURL("spec-026"),null);
console.log("PASS: exact resource thresholds, encounter length comparisons, opening delay grid and skill contribution");

const nativeGroups=combat.combatNativeGroups([{comparisonGroup:"30",dps:1},{comparisonGroup:"180",dps:100},{comparisonGroup:"30",dps:2},{dps:4}]);
assert.deepEqual(nativeGroups.map(x=>[x.label,x.rows.length]),[["30",2],["180",1]]);
assert.equal(combat.combatNativeGroups([{comparisonGroup:" ",dps:10}]).length,0);
console.log("PASS: native results remain grouped by explicit encounter; unknown groups excluded");


// Multi-target damage and threat, healing not duplicated, bounded buff intervals, shared cooldown.
const aoeSkill={name:"AoE",cost:0,gain:0,cd:0,cast:0,damage:10,threat:20,healing:5,targetCap:2};
const aoeBase={duration:3,gcd:1,cap:100,initial:100,regen:0,targets:3,skills:[aoeSkill]};
const aoeResult=combat.simulatePriority(aoeBase);
assert.equal(aoeResult.totals.damage,60);assert.equal(aoeResult.totals.threat,120);assert.equal(aoeResult.totals.healing,15);
assert.deepEqual(aoeResult.targetThreat,[60,60,0]);
assert.equal(combat.combatObjective(aoeResult,"threat","weakest"),0);
assert.equal(combat.combatObjective(aoeResult,"threat","total"),40);
const timedBuff=combat.simulatePriority({...aoeBase,buffs:[{name:"external",start:1,duration:1,damage:2}]});
assert.equal(timedBuff.totals.damage,80);
assert.deepEqual(timedBuff.events.map(x=>x.buffs),[[],["external"],[]]);
const buffSkill={...aoeSkill,name:"Buff",cd:10,damage:0,threat:0,healing:0,buff:{name:"active",duration:2,damage:2}};
const personalBuff=combat.simulatePriority({...aoeBase,skills:[buffSkill,aoeSkill]});
assert.equal(personalBuff.totals.damage,60);
assert.deepEqual(personalBuff.events.map(x=>x.buffs),[[],["active"],[]]);
const cooldownGroup=combat.simulatePriority({...aoeBase,duration:4,skills:[{...aoeSkill,cd:10,group:"g",groupCd:2},{...aoeSkill,name:"B",group:"g",groupCd:2}]});
assert.deepEqual(cooldownGroup.events.map(x=>x.time),[0,2]);
const single={...aoeSkill,name:"single",targetCap:1,threat:200};
const many={...aoeSkill,name:"many",targetCap:3,threat:30};
const targetCompare={...aoeBase,skills:[single,many]};
assert.equal(combat.combatBestPriority(targetCompare,"threat","total").order[0],"single");
assert.equal(combat.combatBestPriority(targetCompare,"threat","weakest").order[0],"many");
assert.deepEqual(combat.combatTargetSweep(aoeBase,"threat","weakest").map(x=>x.targets),[1,2,3,5,8]);
for(const invalid of [{targets:0},{targets:21},{targets:1.5},{buffs:[{name:"bad",start:0,duration:1,damage:4}]},{skills:[{...aoeSkill,targetCap:0}]},{skills:[{...aoeSkill,group:"g"}]}])assert.throws(()=>combat.simulatePriority({...aoeBase,...invalid}));
console.log("PASS: multi-target caps, per-target threat, minimum-target optimization, timed buffs, shared cooldown and invalid input");


// All roles are represented and raw native JSON cases need not have SIML timelines.
const nativeJson={spec:"spec-1",label:"fixture",dps:10,nativeMetrics:{dps:10},duration:180,iterations:1000,timeline:[],settings:"ui/specs/warrior/dps/gear_sets/prebis_arms.gear.json",apl:"ui/specs/warrior/dps/apls/arms.apl.json"};
const allCoverage=combat.combatCoverage({...native,cases:[nativeJson,null]});
assert.equal(allCoverage.length,28);
assert.equal(allCoverage.filter(x=>x.role==="dps").length,20);
assert.equal(allCoverage.filter(x=>x.role==="tank").length,3);
assert.equal(allCoverage.filter(x=>x.role==="heal").length,5);
assert.equal(allCoverage[0].count,1);
assert.equal(combat.combatMetric("spec-4"),"healing");
assert.equal(combat.combatMetric("spec-3"),"threat");
assert.equal(combat.combatMetric("spec-19"),"damage");
assert.equal(combat.combatPresetCases({...native,cases:[{...nativeJson,nativeMetrics:{dps:5}}]},"spec-1").length,0);
assert.equal(combat.combatPresetCases({...native,cases:[{...nativeJson,settings:"ui/specs/../private.json"}]},"spec-1").length,0);
const healSkill={name:"heal",cost:0,gain:0,cd:0,cast:0,damage:0,threat:0,healing:10};
const healBase={duration:3,gcd:1,cap:100,initial:100,regen:0,healingDemand:{initial:5,rate:2,bursts:[{time:1,amount:8}]},skills:[healSkill]};
const healed=combat.simulatePriority(healBase);
assert.equal(healed.healingDemand.effective,17);
assert.equal(healed.healingDemand.overheal,13);
assert.equal(healed.healingDemand.deficit,2);
assert.equal(healed.healingDemand.incoming,19);
assert.equal(healed.healingDemand.effective+healed.healingDemand.deficit,healed.healingDemand.incoming);
assert.equal(healed.healingDemand.effective+healed.healingDemand.overheal,healed.totals.healing);
const waitingHeal=combat.simulatePriority({...healBase,healingDemand:{rate:2},skills:[{...healSkill,healMin:3}]});
assert.equal(waitingHeal.events[0].time,1.5);
const burstHeal=combat.simulatePriority({...healBase,healingDemand:{bursts:[{time:1.2,amount:6}]},skills:[{...healSkill,healMin:4}]});
assert.equal(burstHeal.events[0].time,1.2);
assert.equal(combat.combatBestPriority({...healBase,skills:[healSkill,{...healSkill,name:"small",healing:2}]},"effective").order[0],"heal");
assert.throws(()=>combat.simulatePriority({...healBase,healingDemand:{rate:-1}}));
assert.throws(()=>combat.simulatePriority({...healBase,healingDemand:undefined,skills:[{...healSkill,healMin:4}]}));
console.log("PASS: all-spec coverage, role objective defaults, raw native JSON validation and effective healing conservation");


// Native equipment export uses 17 fixed protocol positions including empty offhand.
const gearExport=combat.combatEquipmentSpec([{name:"戒指 1",id:"101"},{name:"戒指 2",id:"102"},{name:"飾品 1",id:"103"},{name:"飾品 2",id:"104"},{name:"雙手武器",id:"105"},{name:"遠程／聖物",id:"106"}],"two");
assert.equal(gearExport.items.length,17);
assert.deepEqual(gearExport.items.slice(10),[{id:101},{id:102},{id:103},{id:104},{id:105},{},{id:106}]);
assert.throws(()=>combat.combatEquipmentSpec([{name:"雙手武器",id:"1"},{name:"副手物品",id:"2"}],"two"));
assert.throws(()=>combat.combatEquipmentSpec([{name:"戒指 1",id:"101"},{name:"戒指 2",id:"101"}],"one"));
assert.throws(()=>combat.combatEquipmentSpec([{name:"肩部",id:"-1"}],"one"));
assert.throws(()=>combat.combatEquipmentSpec([{name:"肩部",id:"1"},{name:"肩部",id:"2"}],"one"));
const gearRequest={type:"SimTypeIndividual",raid:{parties:[{players:[{dpsWarrior:{},rotation:{type:"TypeAPL"},equipment:{items:Array.from({length:17},(_,i)=>i===10?{id:101,enchant:88,randomSuffix:9}:i===14?{id:333,enchant:77}:{})},talentsString:"fixture",consumables:{foodId:12}}]}]},encounter:{targets:[{}],duration:180},simOptions:{iterations:1000}};
const modifiedGear=combat.combatApplyEquipment(gearRequest,gearExport,"spec-1");
const player=modifiedGear.raid.parties[0].players[0];
assert.deepEqual(player.equipment.items[10],{id:101,enchant:88,randomSuffix:9});
assert.deepEqual(player.equipment.items[14],{id:105});
assert.deepEqual(player.equipment.items[15],{});
assert.equal(player.talentsString,"fixture");
assert.equal(player.consumables.foodId,12);
assert.equal(modifiedGear.encounter.duration,180);
assert.equal(gearRequest.raid.parties[0].players[0].equipment.items[14].id,333);
assert.deepEqual(combat.combatApplyEquipment(gearRequest,gearExport,"spec-1",false).raid.parties[0].players[0].equipment.items[10],{id:101});
assert.throws(()=>combat.combatApplyEquipment(gearRequest,gearExport,"spec-19"));
assert.throws(()=>combat.combatApplyEquipment({...gearRequest,type:"SimTypeRaid"},gearExport,"spec-1"));
const swapRequest=JSON.parse(JSON.stringify(gearRequest));swapRequest.raid.parties[0].players[0].enableItemSwap=true;
assert.throws(()=>combat.combatApplyEquipment(swapRequest,gearExport,"spec-1"));
assert.equal(combat.combatRequestPath("combat-requests/spec-1-0123456789abcdef.json","spec-1"),"combat-requests/spec-1-0123456789abcdef.json");
assert.equal(combat.combatRequestPath("combat-requests/spec-1-0123456789abcdef.json","spec-2"),null);
assert.equal(combat.combatRequestPath("../combat-requests/spec-1-0123456789abcdef.json","spec-1"),null);
assert.throws(()=>combat.combatReadJSON("not json"));
console.log("PASS: fixed 17-slot export, duplicate rejection, native request copy/enchants/spec guards and scoped paths");


const actionRows=[{owner:"角色",kind:"spellId",id:123,damage:30,threat:20},{owner:"寵物",kind:"spellId",id:456,damage:50,threat:10},{owner:"角色",kind:"itemId",id:789,damage:0,threat:100},{owner:"bad",kind:"spellId",id:0,damage:1000},null];
assert.deepEqual(combat.combatNativeActions(actionRows,"damage").map(x=>x.id),[456,123]);
assert.deepEqual(combat.combatNativeActions(actionRows,"threat").map(x=>x.id),[789,123,456]);
assert.equal(combat.combatNativeActions(actionRows,"healing").length,0);
assert.equal(combat.combatNativeActions(actionRows,"bad").length,0);
console.log("PASS: native action contribution filtering and role-specific ranking");


// Whole-catalog plans retain protocol order and modifier IDs; single-item swaps preserve baseline.
const wholePlan=combat.combatPlanEquipment([{slot:"戒指",item:{id:101}},{slot:"戒指",item:{id:102}},{slot:"飾品",item:{id:103}},{slot:"飾品",item:{id:104}}],[{position:"雙手武器",item:{id:105}},{position:"聖物",item:{id:106}}]);
assert.equal(wholePlan.mode,"two");
assert.deepEqual(wholePlan.equipment,gearExport);
assert.equal(combat.combatEquipmentRows(wholePlan.equipment,"two").length,16);
assert.throws(()=>combat.combatPlanEquipment([],[{position:"遠程",item:{id:1}},{position:"聖物",item:{id:2}}]));
const explicitEnchant=combat.combatEquipmentSpec([{name:"戒指 1",id:"101",enchant:"0",randomSuffix:"11"}],"one");
assert.deepEqual(explicitEnchant.items[10],{id:101,enchant:0,randomSuffix:11});
assert.equal(combat.combatEquipmentRows(explicitEnchant,"one")[10].randomSuffix,"11");
assert.throws(()=>combat.combatEquipmentSpec([{name:"頭部",id:"1",enchant:"-3"}],"one"));
const controlled=combat.combatGearTrial(gearRequest,explicitEnchant,"spec-1","one",true,true);
assert.equal(controlled.changes.length,1);
assert.equal(controlled.changes[0].name,"戒指 1");
assert.deepEqual(controlled.candidate.raid.parties[0].players[0].equipment.items[10],{id:101,randomSuffix:11});
assert.deepEqual(controlled.candidate.raid.parties[0].players[0].equipment.items[14],{id:333,enchant:77});
assert.deepEqual(controlled.baseline,gearRequest);
assert.deepEqual(gearRequest.raid.parties[0].players[0].equipment.items[10],{id:101,enchant:88,randomSuffix:9});
const offhandTrial=JSON.parse(JSON.stringify(gearRequest));offhandTrial.raid.parties[0].players[0].equipment.items[15]={id:777};
assert.throws(()=>combat.combatGearTrial(offhandTrial,gearExport,"spec-1","two",true,true));
const twoCleared=combat.combatGearTrial(offhandTrial,gearExport,"spec-1","two",true,false);
assert.deepEqual(twoCleared.candidate.raid.parties[0].players[0].equipment.items[15],{});
const nestedSwap=JSON.parse(JSON.stringify(gearRequest));nestedSwap.raid.parties[0].players[0].rotation.groups=[{actions:[{itemSwap:{}}]}];
assert.throws(()=>combat.combatApplyEquipment(nestedSwap,gearExport,"spec-1"));
console.log("PASS: catalog-to-combat gear bridge, explicit enchant/affix, A/B partial swap and weapon-mode guard");

// Exact simultaneous minimum-piece constraints across disjoint sets, including two ring slots.
const multiSet=new Function(section("const catalogArmorGroups=","function catalogPlanText(")+";return {catalogMultiSetAlternative,catalogSetAlternative};")();
const mkSet=(id,item_set,total)=>({item:{id,item_set},score:{total}});
const dualPools=new Map([["頭部",[mkSet(1,"A",10),mkSet(2,"B",9)]],["頸部",[mkSet(3,"A",8),mkSet(4,"B",7)]],["戒指",[mkSet(8,"",20),mkSet(5,"A",6),mkSet(6,"B",5),mkSet(7,"B",4)]]]);
const dualSet=multiSet.catalogMultiSetAlternative(dualPools,[{name:"A",minimum:2},{name:"B",minimum:2}]);
assert.equal(dualSet.total,28);
assert.deepEqual(dualSet.counts,[2,2]);
assert.equal(new Set(dualSet.picks.map(x=>x.item.id)).size,4);
assert.equal(multiSet.catalogMultiSetAlternative(dualPools,[{name:"A",minimum:2}]).total,multiSet.catalogSetAlternative(dualPools,"A",2).total);
assert.equal(multiSet.catalogMultiSetAlternative(dualPools,[{name:"A",minimum:3},{name:"B",minimum:2}]),null);
assert.equal(multiSet.catalogMultiSetAlternative(dualPools,[{name:"A",minimum:2},{name:"A",minimum:2}]),null);
console.log("PASS: simultaneous two-set piece constraints and infeasible combination rejection");


// Shared native encounter parameters and explicit healer/dummy selection.
const scenarioRequest=combat.combatScenarioRequest(gearRequest,"spec-1",{duration:60,variation:5,targets:3});
assert.equal(scenarioRequest.encounter.duration,60);
assert.equal(scenarioRequest.encounter.durationVariation,5);
assert.equal(scenarioRequest.encounter.targets.length,3);
assert.equal(gearRequest.encounter.targets.length,1);
assert.equal(gearRequest.encounter.duration,180);
const scenarioTrial=combat.combatGearTrial(scenarioRequest,explicitEnchant,"spec-1","one",true,true);
assert.deepEqual(scenarioTrial.baseline.encounter,scenarioTrial.candidate.encounter);
assert.deepEqual(scenarioTrial.baseline.simOptions,scenarioTrial.candidate.simOptions);
assert.throws(()=>combat.combatScenarioRequest(scenarioRequest,"spec-1",{targets:5}));
assert.throws(()=>combat.combatScenarioRequest(gearRequest,"spec-1",{duration:30,variation:30}));
const complex=JSON.parse(JSON.stringify(gearRequest));complex.encounter.targets[0].targetInputs=[{}];
assert.throws(()=>combat.combatScenarioRequest(complex,"spec-1",{targets:3}));
const healerRaw={iterationsDone:1000,avgIterationDuration:60,raidMetrics:{parties:[{players:[{name:"Priest",hps:{avg:200,stdev:10},dps:{avg:0},secondsOomAvg:3},{name:"Target Dummy 1",hps:{avg:0},dtps:{avg:100}}]}]}};
assert.equal(combat.combatResultPlayers(healerRaw).length,2);
assert.equal(combat.combatResultPlayers(healerRaw)[1].dummy,true);
assert.throws(()=>combat.combatResult(healerRaw));
assert.throws(()=>combat.combatResult(healerRaw,"0:3"));
const healerResult=combat.combatResult(healerRaw,"0:0");
assert.equal(healerResult.hps,200);
assert.equal(healerResult.oom,3);
assert.equal(healerResult.stdev.hps,10);
const resultDelta=combat.combatResultDelta(healerResult,{...healerResult,hps:250,oom:1,duration:90,iterations:500},"heal");
assert.equal(resultDelta.rows[0].percent,25);
assert.equal(resultDelta.rows[1].delta,-2);
assert.equal(resultDelta.warnings.length,2);
assert.equal(combat.combatResultDelta({dps:0,iterations:1,duration:60},{dps:20,iterations:1,duration:60},"dps").rows[0].percent,null);
console.log("PASS: shared A/B encounter, explicit native character selection, healer metrics and comparison warnings");


// Distinguish a valid empty snapshot from version mismatches and pending native trials.
const pendingSnapshot={...native,cases:[],failed:[{spec:"spec-1",reason:"timeout"}],plannedBySpec:{"spec-1":3},finished:false};
assert.equal(combat.combatSnapshotValid(pendingSnapshot),true);
assert.deepEqual(combat.combatCoverage(pendingSnapshot)[0],{id:"spec-1",role:"dps",count:0,failed:1,planned:3,pending:2});
assert.equal(combat.combatCoverage({...pendingSnapshot,commit:"wrong"})[0].failed,0);
assert.equal(combat.combatCoverage({...pendingSnapshot,plannedBySpec:{"spec-1":0}})[0].planned,null);
assert.equal(combat.combatFailureLabel("timeout"),"引擎逾時");
assert.equal(combat.combatFailureLabel("constructor"),"原因未提供");
assert.throws(()=>combat.combatGearTrial(gearRequest,gearExport,"spec-1","invalid"));
console.log("PASS: snapshot version guards, per-spec pending accounting and safe localized failure codes");
