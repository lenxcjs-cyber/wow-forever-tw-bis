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
