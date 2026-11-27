"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {LEVEL,questPath,available,validateClass,mapBuild}=require("../talents-page.js");
const fixture={token:"warrior",trees:[{index:0},{index:1},{index:2}],arrows:[{from:1,to:2,required:true}],talents:[]};
for(let tree=0;tree<3;tree++)for(let i=0;i<14;i++){const id=tree*100+i+1;fixture.talents.push({id,tree,row:i<2?1:Math.floor(i/2)+1,column:i%2+1,pointsInTreeRequired:i<2?0:5*Math.floor(i/2),maxRank:5,name:"Talent "+id,ranks:["Example only"]});}
assert.ok(validateClass(fixture));assert.equal(available(fixture,fixture.talents[1],{}),false);
const run=(cls,plan)=>{const steps=questPath(cls,plan),r={};assert.equal(steps.length,51,cls.token);for(let i=0;i<steps.length;i++){const x=steps[i];assert.equal(x.level,i+10);assert.ok(available(cls,x.talent,r),cls.token+" invalid level "+x.level);r[x.talent.id]=(r[x.talent.id]||0)+1;assert.equal(r[x.talent.id],x.rank);}};
run(fixture,{main:0,second:1,priority:["Talent 1","Talent 2"]});
const mismatch=mapBuild(fixture,{talents:[{"Talent 1":6,"Unknown":1},{},{}]});assert.equal(mismatch.complete,false);assert.ok(mismatch.issues.length>=2);
const dataFile=path.join(__dirname,"..","talent-client.json");
if(fs.existsSync(dataFile)){const data=JSON.parse(fs.readFileSync(dataFile,"utf8"));assert.equal(data.build,"1.60.1.71139");assert.equal(data.format,"zephras-talents/1");for(const [k,plan] of Object.entries(LEVEL)){const cls=data.classes.find(c=>c.token.toLowerCase()===k);assert.ok(validateClass(cls),k);run(cls,plan);}console.log("PASS: all nine client-data leveling paths (459 legal points)");}else console.log("SKIP live dataset: client snapshot unavailable; fixture checks passed");
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,"..","talent-builds.json"),"utf8"));assert.equal(new Set(catalog.profiles.map(p=>p.id)).size,28);assert.equal(new Set(catalog.profiles.map(p=>p.id+":"+p.key)).size,catalog.profiles.length);for(const p of catalog.profiles.filter(p=>p.talents))assert.equal(p.talents.flatMap(Object.values).reduce((a,b)=>a+b,0),51,p.label);
console.log("PASS: fixture, profile registry and talent totals");
