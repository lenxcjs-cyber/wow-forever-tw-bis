// Real Go/WASM execution, not a mocked result.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const [dir,site]=process.argv.slice(2);
globalThis.crypto ||= require("node:crypto").webcrypto;
globalThis.performance ||= require("node:perf_hooks").performance;
require(path.join(dir,"wasm_exec.js"));
const snapshot=JSON.parse(fs.readFileSync(path.join(site,"combat-templates.json"),"utf8"));
assert.equal(snapshot.commit,"3b9c125a9b1387cd53ce2bb12969e0c6b54b813e");
const row=snapshot.templates.find(x=>x.spec==="spec-1")||snapshot.templates.find(x=>x.spec==="spec-17");
assert.ok(row,"No reproducible DPS template for real WASM smoke");
const req=JSON.parse(fs.readFileSync(path.join(site,row.requestFile),"utf8"));
req.simOptions={iterations:2,randomSeed:"1",debugFirstIteration:false};
const meta=JSON.parse(fs.readFileSync(path.join(dir,"items.json"),"utf8"));
for(const p of req.raid.parties.flatMap(p=>p.players||[])){
 for(const item of p.equipment.items)if(item.id)assert.ok(meta.items[item.id],"Missing embedded item "+item.id);
}
const timeout=setTimeout(()=>{console.error("WASM smoke timed out");process.exit(1)},180000);
globalThis.wasmready=()=>setTimeout(()=>{
 try{
  const raw=globalThis.raidSimJson(JSON.stringify(req)),result=JSON.parse(raw);
  assert.ok(!result.error,result.error?.message);
  assert.equal(result.iterationsDone,2);
  const players=result.raidMetrics.parties.flatMap(p=>p.players||[]).filter(p=>p.dps?.avg>0);
  assert.equal(players.length,1);
  console.log("REAL WASM smoke passed",row.spec,players[0].dps.avg);
  clearTimeout(timeout);process.exit(0);
 }catch(e){console.error(e);process.exit(1);}
},0);
(async()=>{const go=new Go();const {instance}=await WebAssembly.instantiate(fs.readFileSync(path.join(dir,"lib.wasm")),go.importObject);await go.run(instance);throw Error("WASM runtime ended");})().catch(e=>{console.error(e);process.exit(1);});
