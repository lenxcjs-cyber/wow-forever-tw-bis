"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {LEVEL,questPath,available,validateClass,mapBuild,levelAt,levelState}=require("../talents-page.js");
const fixture={token:"warrior",trees:[{index:0},{index:1},{index:2}],arrows:[{from:1,to:2,required:true}],talents:[]};
for(let tree=0;tree<3;tree++)for(let i=0;i<14;i++){const id=tree*100+i+1;fixture.talents.push({id,tree,row:i<2?1:Math.floor(i/2)+1,column:i%2+1,pointsInTreeRequired:i<2?0:5*Math.floor(i/2),maxRank:5,name:"Talent "+id,ranks:["Example only"]});}
assert.ok(validateClass(fixture));assert.equal(available(fixture,fixture.talents[1],{}),false);
const run=(cls,plan)=>{const steps=questPath(cls,plan),r={};assert.equal(steps.length,51,cls.token);for(let i=0;i<steps.length;i++){const x=steps[i];assert.equal(x.level,i+10);assert.ok(available(cls,x.talent,r),cls.token+" invalid level "+x.level);r[x.talent.id]=(r[x.talent.id]||0)+1;assert.equal(r[x.talent.id],x.rank);}};
run(fixture,{main:0,second:1,priority:["Talent 1","Talent 2"]});
const pathSteps=questPath(fixture,{main:0,second:1,priority:["Talent 1","Talent 2"]});
assert.equal(levelState(pathSteps,1).step,null);
assert.equal(Object.keys(levelState(pathSteps,9).ranks).length,0);
assert.equal(levelState(pathSteps,10).step.rank,1);
assert.equal(Object.values(levelState(pathSteps,60).ranks).reduce((a,b)=>a+b,0),51);
assert.equal(levelAt(12.5),12);assert.equal(levelAt(-10),1);assert.equal(levelAt(999),60);
const tier2=fixture.talents[2],later=fixture.talents[4];
assert.equal(available(fixture,tier2,{[later.id]:5}),false);
assert.equal(available(fixture,tier2,{[fixture.talents[0].id]:5}),true);
assert.equal(available(fixture,{...tier2,notYetAvailable:true},{[fixture.talents[0].id]:5}),false);

const mismatch=mapBuild(fixture,{talents:[{"Talent 1":6,"Unknown":1},{},{}]});assert.equal(mismatch.complete,false);assert.ok(mismatch.issues.length>=2);
const dataFile=path.join(__dirname,"..","talent-client.json");
if(fs.existsSync(dataFile)){const data=JSON.parse(fs.readFileSync(dataFile,"utf8"));assert.equal(data.build,"1.60.1.71139");assert.equal(data.format,"zephras-talents/1");for(const [k,plan] of Object.entries(LEVEL)){const cls=data.classes.find(c=>c.token.toLowerCase()===k);assert.ok(validateClass(cls),k);run(cls,plan);}console.log("PASS: all nine client-data leveling paths (459 legal points)");}else console.log("SKIP live dataset: client snapshot unavailable; fixture checks passed");
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,"..","talent-builds.json"),"utf8"));assert.equal(new Set(catalog.profiles.map(p=>p.id)).size,28);assert.equal(new Set(catalog.profiles.map(p=>p.id+":"+p.key)).size,catalog.profiles.length);for(const p of catalog.profiles.filter(p=>p.talents))assert.equal(p.talents.flatMap(Object.values).reduce((a,b)=>a+b,0),51,p.label);
console.log("PASS: fixture, profile registry and talent totals");

const {exactProfile}=require("../talents-page.js");
for(const p of catalog.profiles)assert.equal(exactProfile(catalog.profiles,p.cls,p.id,p.key),p);
assert.equal(exactProfile(catalog.profiles,"rogue","spec-10","not-registered"),null);
assert.equal(exactProfile(catalog.profiles,"warrior","spec-10","mutilate"),null);
for(const id of ["spec-26","spec-27"]){const p=exactProfile(catalog.profiles,"druid",id,"feral_onehand");assert.ok(p);assert.equal(p.talents,null);}
console.log("PASS: exact profile identity, missing profiles do not fall back");

// Partial source metadata must never be presented as full client data.
const {partialBuildCheck}=require("../talents-page.js");
const partial=JSON.parse(fs.readFileSync(path.join(__dirname,"..","talent-reference-partial.json"),"utf8"));
assert.equal(partial.build,"1.60.1.71139");
const partialRows=partial.classes.flatMap(c=>c.talents.map(t=>[c.token+":"+t.tree+":"+t.name,t]));
const partialIndex=Object.fromEntries(partialRows);
assert.equal(Object.keys(partialIndex).length,partialRows.length);
assert.equal(partialIndex["druid:1:Ferocity"].icon,132190);
const {iconFile,talentIconURLs}=require("../talents-page.js");
const fallbackIcons=JSON.parse(fs.readFileSync(path.join(__dirname,"..","talent-icons-fallback.json"),"utf8"));
assert.equal(fallbackIcons.build,partial.build);
assert.equal(new Set(partialRows.map(([,t])=>String(t.icon))).size,116);
for(const [key,t] of partialRows){
 const cls=key.split(":")[0],name=fallbackIcons.icons[String(t.icon)];
 assert.ok(/^[a-z][a-z0-9_]+$/.test(name),key);
 assert.equal(fallbackIcons.icons[key],name);
 assert.equal(iconFile(t,cls,fallbackIcons.icons),name);
 assert.equal(iconFile({name:t.name,tree:t.tree},cls,fallbackIcons.icons),name);
 const urls=talentIconURLs(t,cls,fallbackIcons.icons);
 assert.equal(urls.length,3);assert.ok(urls[0].startsWith("https://render-classic-us.worldofwarcraft.com/icons/56/"));assert.ok(urls.every(u=>u.endsWith("/"+name+".jpg")));
}
assert.equal(iconFile({name:"Ferocity",tree:1,icon:99999999},"druid",fallbackIcons.icons),"");
assert.equal(iconFile({name:"Ferocity",tree:0},"druid",fallbackIcons.icons),"");
assert.equal(iconFile({icon:"../../other"},"druid",{}),"");
assert.equal(iconFile({icon:"INV_Misc_QuestionMark"},"druid",{}),"");
assert.equal(iconFile({icon:"Ability_Druid_Bash"},"druid",{}),"ability_druid_bash");
console.log("PASS: all 116 partial original FileDataIDs, exact tree aliases, Blizzard-first same-texture URLs and missing icon safeguards");

assert.equal(partialIndex["rogue:1:Precision"].maxRank,3);
assert.equal(partialBuildCheck({cls:"rogue",talents:[{},{"Precision":4},{}]},partialIndex).issues.length,2);
assert.equal(partialBuildCheck({cls:"rogue",talents:[{},{"Unknown":5},{}]},partialIndex).matched,0);
console.log("PASS: partial metadata rank and tier checks");

const communityFile=path.join(__dirname,"..","talent-community.json");
if(fs.existsSync(communityFile)){
 const d=JSON.parse(fs.readFileSync(communityFile,"utf8"));
 const {validateCommunitySnapshot}=require("../talents-page.js");
 assert.ok(validateCommunitySnapshot(d),"community snapshot schema");
 for(const [token,plan] of Object.entries(LEVEL)){
  const cls=d.classes.find(c=>c.token===token);
  assert.ok(cls,token);
  run(cls,plan);
  assert.ok(cls.talents.every(t=>/^[a-z][a-z0-9_]+$/i.test(t.icon)),token+" icon identifiers");
 }
 console.log("PASS: all nine imported community-data leveling paths (459 points against imported rules), icon IDs");
}else console.log("SKIP community dataset: not downloaded");

const skills=JSON.parse(fs.readFileSync(path.join(__dirname,"..","spec-skill-guides.json"),"utf8"));
assert.equal(skills.format,1);
assert.equal(Object.keys(skills.specs).length,28);
assert.equal(Object.keys(skills.common).length,9);
const classTokens=["warrior","paladin","hunter","rogue","priest","shaman","mage","warlock","druid"];
let coreCount=0;
for(const p of catalog.profiles){
 const g=skills.specs[p.id],classKey=classTokens[Math.min(8,Math.floor((Number(p.id.split("-")[1])-1)/3))];
 assert.ok(g&&g.class===classKey,p.id+" mismatched skill guide");
 assert.ok(g.title&&g.priority&&g.skills.length>=6,p.id+" missing core skills");
 const all=[...g.skills,...skills.common[classKey]];
 for(const row of all)assert.ok(row.length===4&&row.every(v=>typeof v==="string"&&v.trim()),p.id+" invalid skill row");
 assert.equal(new Set(g.skills.map(row=>row[1])).size,g.skills.length,p.id+" duplicate core skills");
}
for(const g of Object.values(skills.specs))coreCount+=g.skills.length;
assert.equal(coreCount,185);
assert.equal(Object.values(skills.common).flat().length,46);
console.log("PASS: 28 spec skill guides, 185 core entries, 46 class utility entries, every build mapped");

assert.ok(!skills.specs["spec-26"].skills.some(x=>x[1]==="Primal Bite"));
assert.ok(skills.specs["spec-27"].skills.some(x=>x[1]==="Primal Bite"));

assert.equal(skills.unlocks.hunter.Lacerate,"trainer");
assert.equal(skills.unlocks.druid.Lacerate,"talent");
assert.equal(skills.unlocks.paladin["Unsealed Wrath"],"passive");
assert.equal(skills.unlocks.druid["Shifting Power"],"talent");
assert.ok(skills.specs["spec-26"].skills.some(row=>row[1]==="Shifting Power"));
for(const [cls,rows] of Object.entries(skills.unlocks)){assert.ok(classTokens.includes(cls));for(const type of Object.values(rows))assert.ok(["trainer","talent","passive"].includes(type));}
console.log("PASS: class-specific skill acquisition, passive distinction and Shifting Power");

const {skillBuildNote,investedTalentRows}=require("../talents-page.js");
assert.equal(Object.keys(skills.buildNotes).length,22);
for(const [key,note] of Object.entries(skills.buildNotes)){
 const p=catalog.profiles.find(p=>p.id+":"+p.key===key);
 assert.ok(p,key+" missing build");
 assert.equal(skillBuildNote(skills,p),note);
 const g=skills.specs[p.id],names=new Set([...g.skills,...skills.common[g.class]].map(x=>x[1]));
 for(const name of note.focus)assert.ok(names.has(name),key+" missing skill "+name);
}
assert.equal(skillBuildNote(skills,{id:"spec-26",key:"unknown"}),null);
assert.equal(skillBuildNote(skills,{id:"spec-26",key:"feral_onehand"}).focus.length,0);
assert.deepEqual(investedTalentRows({talents:null},fixture),[]);
const invested=investedTalentRows({talents:[{"Talent 1":2,"Talent 101":1,"Unknown":3,"Invalid":0,"Talent 2":6},{},{}]},fixture);
assert.equal(invested.length,4);assert.equal(invested[0].valid,true);assert.equal(invested[1].talent,null);assert.equal(invested[2].valid,null);assert.equal(invested[3].valid,false);
assert.equal(investedTalentRows({talents:[{"talent 1":1},{},{}]},fixture)[0].talent.id,1);
console.log("PASS: exact build skill notes, valid focus references, invested talent same-tree matching and missing rank handling");

const {skillScenarios,skillGuideMatch}=require("../talents-page.js");
assert.equal(Object.keys(skills.scenarios).length,28);
let scenarioCount=0;
for(const p of catalog.profiles){
 const sc=skillScenarios(skills,p),g=skills.specs[p.id],names=new Set([...g.skills,...skills.common[g.class]].map(x=>x[1]));
 assert.equal(sc.length,3,p.id);
 assert.equal(new Set(sc.map(x=>x.label)).size,sc.length);
 for(const row of sc){
  assert.ok(row.note.trim());assert.equal(new Set(row.skills).size,row.skills.length);
  for(const name of row.skills)assert.ok(names.has(name),p.id+" invalid scenario skill "+name);
 }
}
for(const rows of Object.values(skills.scenarios))scenarioCount+=rows.length;
assert.equal(scenarioCount,84);
assert.deepEqual(skillScenarios(skills,{id:"spec-26",cls:"warrior"}),[]);
const cat=skills.specs["spec-26"],shred=cat.skills.find(x=>x[1]==="Shred"),shift=cat.skills.find(x=>x[1]==="Shifting Power"),focus=new Set(["Shred"]);
const filters={scenario:skills.scenarios["spec-26"][0],terms:["shred"],focusOnly:true};
assert.equal(skillGuideMatch(shred,filters,{kind:"unknown"},focus),true);
assert.equal(skillGuideMatch(shift,filters,{kind:"talent"},focus),false);
assert.equal(skillGuideMatch(shred,{...filters,acq:"talent"},{kind:"unknown"},focus),false);
assert.equal(skillGuideMatch(shred,{...filters,category:"回能"},{kind:"unknown"},focus),false);
assert.equal(skillGuideMatch(shift,{scenario:skills.scenarios["spec-26"][2]},{kind:"talent"},focus),true);
console.log("PASS: all 84 combat scenarios, correct class mapping and combined skill filters");

const {skillClientRecord}=require("../talents-page.js");
const spellFixture={build:"1.60.1.71139",classes:{hunter:{Lacerate:{name:"割裂",records:[{id:1,name:"割裂"}]}},druid:{Lacerate:{name:"割傷",records:[{id:2,name:"割傷",cooldownMs:6000}]}}}};
assert.equal(skillClientRecord(spellFixture,"hunter","Lacerate").records[0].id,1);
assert.equal(skillClientRecord(spellFixture,"druid","Lacerate").name,"割傷");
assert.equal(skillClientRecord(spellFixture,"warrior","Lacerate"),null);
assert.equal(skillClientRecord({...spellFixture,build:"old"},"druid","Lacerate"),null);
assert.equal(skillClientRecord({build:spellFixture.build,classes:{druid:{X:{name:"錯誤",records:[{id:3,name:"另一名"}]}}}},"druid","X").name,null);
assert.equal(skillGuideMatch(shred,{terms:["測試名稱"],localizedName:"測試名稱"},{kind:"unknown"},focus),true);
console.log("PASS: exact version/class spell metadata and localized aliases");
