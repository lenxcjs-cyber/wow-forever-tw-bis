"use strict";
// True headless Chromium worker execution; no mock results, no external service.
const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),assert=require("node:assert/strict");
const {chromium}=require("playwright"),root=path.resolve(__dirname,"..");
const manifest=path.join(root,"native-engine/manifest.json");
if(!fs.existsSync(manifest)){console.log("SKIP: native engine not generated");process.exit(0);}
const data=JSON.parse(fs.readFileSync(manifest,"utf8"));
assert.equal(data.verified,true);
const templates=JSON.parse(fs.readFileSync(path.join(root,"combat-templates.json"),"utf8")).templates;
const row=templates.find(x=>x.spec==="spec-1")||templates.find(x=>x.spec==="spec-17");
assert.ok(row,"Missing actual character template");
const request=JSON.parse(fs.readFileSync(path.join(root,row.requestFile),"utf8"));
request.simOptions={iterations:2,randomSeed:"1",debugFirstIteration:false};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,"http://localhost");
 if(url.pathname==="/"){res.writeHead(200,{"Content-Type":"text/html"}).end("<!doctype html><title>Native engine worker smoke</title>");return;}
 const file=path.resolve(root,"."+decodeURIComponent(url.pathname));
 if(!file.startsWith(path.join(root,"native-engine")+path.sep)){res.writeHead(404).end();return;}
 const mime=file.endsWith(".js")?"text/javascript":file.endsWith(".json")?"application/json":"application/octet-stream";
 const stream=fs.createReadStream(file);stream.on("error",()=>res.writeHead(404).end());stream.on("open",()=>{res.writeHead(200,{"Content-Type":mime});stream.pipe(res);});
});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:["--no-sandbox"]});
  const page=await browser.newPage();
  await page.route("**/*",route=>route.request().url().startsWith(origin+"/")?route.continue():route.abort());
  await page.goto(origin);
  const result=await page.evaluate(req=>new Promise((resolve,reject)=>{
   const worker=new Worker("native-engine/worker.js"),timeout=setTimeout(()=>{worker.terminate();reject(Error("Real browser WASM timeout"));},180000);
   const finish=(err,data)=>{clearTimeout(timeout);worker.terminate();err?reject(err):resolve(data);};
   let job=0;const replies=[];
   worker.onmessage=e=>{
    if(e.data.type==="ready")worker.postMessage({type:"run",jobId:job,request:JSON.stringify(req)});
    else if(e.data.type==="result"){
     if(e.data.jobId!==job){finish(Error("Worker response matched the wrong job"));return;}
     replies.push(e.data.result);
     if(job===0){job=1;worker.postMessage({type:"run",jobId:job,request:JSON.stringify(req)});}
     else finish(null,replies);
    }
    else if(e.data.type==="error")finish(Error(e.data.message));
   };
   worker.onerror=e=>finish(Error(e.message||"Worker failure"));
  }),request);
  assert.equal(result.length,2);
  for(const reply of result){assert.ok(!reply.error,reply.error?.message);assert.equal(reply.iterationsDone,2);assert.equal(reply.raidMetrics.parties.flatMap(p=>p.players||[]).filter(p=>p.dps?.avg>0).length,1);}
  const players=result[0].raidMetrics.parties.flatMap(p=>p.players||[]).filter(p=>p.dps?.avg>0);
  data.browserVerified=true;
  fs.writeFileSync(manifest,JSON.stringify(data));
  console.log("PASS: actual Chromium same-origin Go/WASM worker, DPS",players[0].dps.avg);
 }catch(e){console.error(e);process.exitCode=1;}
 finally{if(browser)await browser.close();server.close();}
})();
