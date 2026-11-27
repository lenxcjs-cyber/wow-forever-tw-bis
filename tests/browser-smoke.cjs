"use strict";
// Real DOM smoke tests: serve the actual repository, use an isolated Chromium profile,
// and block external calls so results do not depend on third-party availability.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
const root=path.join(__dirname,"..");
const catalog=JSON.parse(fs.readFileSync(path.join(root,"talent-builds.json"),"utf8")).profiles;
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8"};
const server=http.createServer((req,res)=>{
 let file;
 try{file=path.resolve(root,"."+decodeURIComponent(new URL(req.url,"http://localhost").pathname));if(file===root)file=path.join(root,"index.html");if(!file.startsWith(root+path.sep))throw Error("path");}
 catch(e){res.writeHead(400).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"}).end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const origin="http://127.0.0.1:"+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  page.setDefaultTimeout(10000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",route=>route.request().url().startsWith(origin+"/")?route.continue():route.abort());
  await page.goto(origin+"/index.html");
  await page.locator("#gt-mode-class").waitFor({state:"visible"});
  await page.locator("#class-select").waitFor({state:"visible"});
  const spec=page.locator("#spec-select"),build=page.locator("#gt-build-select"),classes=page.locator("#class-select");
  await page.locator('#guild-tools button[data-tab="v11"]').click();
  const classOptions=await classes.evaluate(e=>Array.from(e.options).filter(o=>o.value&&!o.disabled).map(o=>({value:o.value,label:o.textContent})));
  const seen=new Set(),classFor={};let buildCount=0;
  for(const c of classOptions){
   await classes.selectOption(c.value);
   const ids=await spec.evaluate(e=>Array.from(e.options).map(o=>o.value).filter(v=>/^spec-\d+$/.test(v)));
   for(const id of ids){
    if(seen.has(id))continue;
    await spec.selectOption(id);
    const expected=catalog.filter(p=>p.id===id).map(p=>p.key).sort();
    assert.ok(expected.length,"missing catalog "+id);
    await page.waitForFunction(({expected})=>{const e=document.getElementById("gt-build-select");return !!e&&JSON.stringify(Array.from(e.options).map(o=>o.value).sort())===JSON.stringify(expected);},{expected});
    await page.locator('#guild-tools button[data-tab="audit"]').click();
    assert.ok(await page.locator(".gt-bis-slot").count()>0,"missing candidate cards "+id);
    await page.locator(".gt-community-bis > summary").waitFor({state:"visible"});
    await page.locator('#guild-tools button[data-tab="v11"]').click();
    seen.add(id);classFor[id]=c.value;buildCount+=expected.length;
   }
  }
  assert.equal(seen.size,new Set(catalog.map(p=>p.id)).size,"all classes/specs accessible");
  assert.equal(buildCount,catalog.length,"all profile options accessible");
  console.log("PASS: actual homepage class/spec/build selection",seen.size,buildCount);
  await classes.selectOption(classFor["spec-26"]);await spec.selectOption("spec-26");
  await build.waitFor({state:"visible"});await build.selectOption("general");
  await page.locator('#guild-tools button[data-tab="audit"]').click();
  const slots=await page.locator(".gt-bis-slot h4").allTextContents();
  assert.ok(slots.length,"feral candidate cards missing");
  assert.ok(!slots.some(x=>/副手|單手/.test(x)),"feral invalid slot: "+slots.join(","));
  console.log("PASS: actual feral default cards exclude one-hand/offhand slots");
  await page.locator('#guild-tools button[data-tab="v8"]').click();
  const tf=page.frameLocator('iframe[title="天賦流派與野外練等"]');
  await tf.locator("#overview").getByText("9/32/10",{exact:true}).waitFor({state:"visible"});
  assert.equal(await tf.locator("#classSelect").isVisible(),false);
  await build.selectOption("feral_onehand");
  await tf.locator("#overview").getByText("單手＋持有型副手（替代比較）",{exact:false}).first().waitFor({state:"visible"});
  assert.equal(await tf.locator("#treeArea .talent").count(),0,"alternative must not borrow another build");
  console.log("PASS: embedded talent exact-match and safe missing-build mode");
  await page.locator("#gt-mode-blue").click();
  for(const selector of ["#class-select","#spec-select","#gt-build-bar","#guild-tools .gt-tabs"]){assert.equal(await page.locator(selector).isVisible(),false,selector);}
  assert.equal(await page.locator("section.spec:visible").count(),0);
  const bf=page.frameLocator('iframe[title="繁體中文官方藍帖"]');
  await bf.locator("#posts article").first().waitFor({state:"visible"});
  assert.equal(await bf.locator("#posts details.post-toggle[open]").count(),0,"posts initially collapsed");
  assert.equal(await bf.locator("iframe").count(),0,"no external frame before user action");
  await bf.locator("#posts details.post-toggle > summary").first().click();
  assert.equal(await bf.locator("#posts details.post-toggle[open]").count(),1);
  assert.equal(await bf.locator("#expand-posts, #collapse-posts").count(),0);
  await bf.locator("#posts details.post-toggle > summary").nth(1).click();
  assert.equal(await bf.locator("#posts details.post-toggle[open]").count(),2);
  await bf.locator("#posts details.post-toggle > summary").first().click();
  assert.equal(await bf.locator("#posts details.post-toggle[open]").count(),1);
  assert.equal(await bf.locator("#posts details.post-toggle").nth(1).getAttribute("open"),"");
  await bf.locator("#posts details.post-toggle > summary").nth(1).click();
  assert.equal(await bf.locator("#posts details[open]").count(),0);
  assert.equal(await bf.locator("#live-source a").count(),2);
  assert.equal(await bf.locator("#live-source a").first().getAttribute("href"),"https://exwind.net/zhTW/blue/forever/");
  await bf.locator("#posts details.post-toggle > summary").first().click();
  assert.equal(await bf.locator("iframe").count(),0,"never create blocked external frames");
  assert.equal(await bf.locator('#posts details.post-toggle[open] a[href*="/post/blue/"]').count(),1);
  assert.equal(await bf.locator('#posts details.post-toggle[open] a[href*="/post/blue/"]').getAttribute("target"),"_blank");
  const articleKeys=await bf.locator("#posts details.post-toggle").evaluateAll(xs=>xs.map(x=>x.dataset.postKey));
  assert.equal(new Set(articleKeys).size,articleKeys.length,"unique source article");
  await bf.locator("#posts details.post-toggle > summary").first().click();
  console.log("PASS: independent grouped blue posts, direct source link and no blocked iframes");
  await bf.locator("#q").fill("德魯伊 2026-11-25");
  assert.ok(await bf.locator("#posts article").count()>0);
  await bf.locator("#q").fill("no-such-post-123");
  assert.equal(await bf.locator("#posts article").count(),0);
  await page.locator("#gt-mode-class").click();
  await page.locator("#gt-build-select").waitFor({state:"visible"});
  assert.equal(await spec.inputValue(),"spec-26");
  assert.equal(await build.inputValue(),"feral_onehand");
  console.log("PASS: inline blue-post view, search and return to unchanged selection");
  await page.goto(origin+"/index.html?view=blue");
  await page.locator("#gt-mode-blue").waitFor({state:"visible"});
  await page.waitForFunction(()=>document.getElementById("guild-tools")?.dataset.mode==="blue");
  assert.equal(await page.locator("#class-select").isVisible(),false);
  await page.locator("#gt-mode-class").click();
  await page.goBack();await page.waitForFunction(()=>document.getElementById("guild-tools")?.dataset.mode==="blue");
  console.log("PASS: blue mode deep link and browser history");
  assert.deepEqual(errors,[],"page errors");
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
