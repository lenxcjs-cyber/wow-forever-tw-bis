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
  const errors=[];page.on("pageerror",e=>{errors.push(e.message);console.error("Browser page error:",e.message);});
  await page.route("**/*",route=>route.request().url().startsWith(origin+"/")?route.continue():route.abort());
  // Isolate UI behavior from actual external icon availability with explicit test fixtures.
  await page.route("**/item-icons.json",route=>route.fulfill({json:{build:"1.60.1.71139",items:{"19323":"fixture_mace","252484":"fixture_missing"}}}));
  await page.route("https://wow.zamimg.com/images/wow/icons/medium/fixture_mace.jpg",route=>route.fulfill({contentType:"image/svg+xml",body:'<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><rect width="36" height="36" fill="green"/></svg>'}));
  await page.route("https://wow.zamimg.com/images/wow/icons/medium/fixture_missing.jpg",route=>route.abort());
  await page.goto(origin+"/index.html");
  await page.locator("#gt-mode-class").waitFor({state:"visible"});
  await page.locator("#class-select").waitFor({state:"visible"});
  const history=page.locator(".gt-legacy-history");
  assert.equal(await history.count(),1,"legacy homepage version notes should be archived");
  assert.equal(await history.getAttribute("open"),null);
  for(const label of ["V6 修正法系與物理裝備混排","全專精資料稽核","V8–V14 功能試用版"]){
   assert.ok((await history.textContent()).includes(label),"missing archived note "+label);
   assert.equal(await history.getByText(label,{exact:false}).first().isVisible(),false);
  }
  await history.locator("summary").click();
  assert.ok(await history.getByText("全專精資料稽核",{exact:false}).first().isVisible());
  await history.locator("summary").click();
  console.log("PASS: legacy V6/V7/V8–V14 homepage banners archived with original text");

  const spec=page.locator("#spec-select"),build=page.locator("#gt-build-select"),classes=page.locator("#class-select");
  const moreNav=page.locator(".gt-nav-more");
  assert.equal(await moreNav.getAttribute("open"),null);
  assert.ok(await page.locator('#guild-tools button[data-tab="audit"]').isVisible());
  assert.ok(await page.locator('#guild-tools button[data-tab="v13"]').isVisible());
  assert.equal(await page.locator('#guild-tools button[data-tab="v11"]').isVisible(),false);
  async function openTab(key){const b=page.locator('#guild-tools button[data-tab="'+key+'"]');if(!await b.isVisible())await moreNav.locator("summary").click();await b.click();}

  await openTab("v11");
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
    const weaponMode=page.locator("#gt-gear-weapon-mode");
    const verifyWeaponView=async()=>{const names=await page.locator(".gt-bis-slot h4").allTextContents();assert.ok(!(names.some(n=>/雙手武器/.test(n))&&names.some(n=>/主手武器|副手物品/.test(n))),"mutually exclusive weapon slots rendered together "+id);};
    await verifyWeaponView();
    if(await weaponMode.isVisible()){
     await weaponMode.selectOption("one");await verifyWeaponView();
     await page.locator('#guild-tools button[data-tab="audit"]').click();
     assert.equal(await weaponMode.inputValue(),"one","per-build weapon view should persist");

     assert.equal(await page.locator('.gt-bis-slot[data-slot="雙手武器"]').count(),0);
     await weaponMode.selectOption("two");await verifyWeaponView();
     assert.equal(await page.locator('.gt-bis-slot[data-slot="副手物品"], .gt-bis-slot[data-slot="主手武器"]').count(),0);
     assert.equal(await page.locator('#gt-gear-slot-jump option[value="副手物品"]').count(),0);
     const other=page.locator(".gt-bis-slot[data-slot='雙手武器'] .gt-bis-name").first();
     if(await other.count()){
      const href=await other.getAttribute("href"),match=href?.match(/(?:item\/|item=)(\d+)/);
      if(match){
       await weaponMode.selectOption("one");
       await page.locator(".gt-gear-filters input").fill(match[1]);
       await page.locator(".gt-other-weapon-matches").getByRole("button",{name:"查看雙手武器"}).click();
       assert.equal(await weaponMode.inputValue(),"two");
       assert.ok(await page.locator(".gt-bis-slot[data-slot='雙手武器']").count());
       await page.locator(".gt-gear-filters input").fill("");
      }
     }
    }
    await page.locator(".gt-audit-research > summary").waitFor({state:"visible"});
    assert.equal(await page.locator(".gt-audit-research").getAttribute("open"),null);
    assert.equal(await page.locator(".gt-community-bis > summary").isVisible(),false);
    await openTab("v11");
    seen.add(id);classFor[id]=c.value;buildCount+=expected.length;
   }
  }
  assert.equal(seen.size,new Set(catalog.map(p=>p.id)).size,"all classes/specs accessible");
  assert.equal(buildCount,catalog.length,"all profile options accessible");
  assert.equal(await page.title(),"墓鐘資料庫");
  console.log("PASS: actual homepage class/spec/build selection",seen.size,buildCount);
  if(fs.existsSync(path.join(root,"gear-catalog.json"))){
    await classes.selectOption(classFor["spec-28"]);await spec.selectOption("spec-28");
    await page.locator('#guild-tools button[data-tab="audit"]').click();
    await page.locator(".gt-audit-tools > summary").click();
    assert.ok(await page.locator(".gt-full-gear > summary").isVisible());
    const full=page.locator(".gt-full-gear");
    await full.locator("summary").first().click();
    await full.locator('select:has(option[value="live"])').selectOption("all");
    await full.locator("article").first().waitFor({state:"visible"});
    assert.ok(await full.locator("article").count()>0,"restoration Druid gear catalog not empty");
    const coverage=full.locator('select:has(option[value="new"])');
    await coverage.selectOption("new");
    await full.locator("article").first().waitFor({state:"visible"});
    assert.ok((await full.locator("article").first().innerText()).includes("尚未納入本站候選"));
    await full.getByRole("button",{name:"設為同部位比較基準"}).first().click();
    assert.equal(await coverage.inputValue(),"");
    await full.getByRole("button",{name:"清除比較基準"}).waitFor({state:"visible"});
    await full.getByRole("button",{name:"清除比較基準"}).click();
    await page.locator(".gt-audit-research > summary").click();
    const audit=page.locator(".gt-catalog-audit");
    await audit.locator("summary").first().click();
    await audit.locator("select").selectOption("all");
    await audit.locator("article").first().waitFor({state:"visible"});
    assert.ok(await audit.locator("article").count()>0);
    assert.ok((await audit.innerText()).includes("資料版本："));
    const profile=await build.inputValue();
    const weightKey="gt-sim-weights-v1:spec-28:"+profile;
    await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({weights:{"智力":1,"精神":1,"治療加成":2},source:"browser test"})),weightKey);
    await page.locator('#guild-tools button[data-tab="audit"]').click();
    await page.locator(".gt-audit-tools > summary").click();
    const plan=page.locator(".gt-armor-plan");
    await plan.locator("summary").first().click();
    await plan.locator("article").first().waitFor({state:"visible"});
    assert.equal(await plan.locator("article").count(),12);
    assert.ok((await plan.innerText()).includes("/ 14 個部位"));
    assert.ok(await plan.locator(".gt-catalog-weapon-plan").isVisible());
    assert.ok(await plan.locator(".gt-catalog-set-plan").isVisible());
    await plan.getByRole("button",{name:"匯出目前整套面板方案"}).click();
    assert.ok((await plan.locator(".gt-plan-export textarea").inputValue()).includes("非實戰BiS"));
    assert.ok((await plan.locator(".gt-plan-export textarea").inputValue()).includes("資料版本："));
    const setPicker=plan.locator(".gt-catalog-set-plan select").first();
    if(await setPicker.count()){assert.ok((await plan.locator(".gt-catalog-set-plan").innerText()).includes("替代防具"));}
    assert.ok((await plan.innerText()).includes("武器與遠程／聖物分"));
    await plan.locator('select:has(option[value="no-rep"])').selectOption("no-rep");
    await plan.getByRole("button",{name:"匯出目前整套面板方案"}).click();
    assert.ok((await plan.locator(".gt-plan-export textarea").inputValue()).includes("排除已標記聲望裝備"));
    await plan.locator('select:has(option[value="no-rep"])').selectOption("boe");
    assert.equal(await plan.locator("article").count(),12);
    await plan.locator('select:has(option[value="no-rep"])').selectOption("all");
    await plan.locator('select:has(option[value="plain"])').selectOption("plain");
    assert.equal(await plan.locator("article").count(),12);
    await page.evaluate(key=>localStorage.removeItem(key),weightKey);
    console.log("PASS: full-catalog armor plan with saved weights and effect filter");
    console.log("PASS: actual candidate-ID catalog reconciliation view");
    console.log("PASS: real catalog for restoration Druid and same-slot comparison controls");
  }
  await classes.selectOption(classFor["spec-26"]);await spec.selectOption("spec-26");
  await build.waitFor({state:"visible"});await build.selectOption("general");
  await page.locator('#guild-tools button[data-tab="audit"]').click();
  assert.equal(await page.locator(".gt-cat-evidence details").count(),5);
  await page.locator('.gt-bis-slot a[href*="/item/19323/"]').first().waitFor({state:"visible"});
  assert.equal(await page.locator(".gt-feral-set > summary").isVisible(),false);
  await page.locator(".gt-audit-research > summary").click();
  await page.locator(".gt-feral-set > summary").click();
  assert.equal(await page.locator('.gt-feral-set a[href*="/item/22679"], .gt-feral-set a[href*="/item/226788/"]').count(),4);
  assert.ok(await page.locator(".gt-spec-hotfix > summary").isVisible());
  await page.locator(".gt-spec-hotfix > summary").click();
  assert.ok((await page.locator(".gt-spec-hotfix").innerText()).includes("野性德魯伊套裝"));
  console.log("PASS: cat four-piece research and relevant hotfix links in actual UI");
  assert.equal(await page.locator(".gt-full-gear > summary").isVisible(),false);
  await page.locator(".gt-audit-tools > summary").click();
  assert.ok(await page.locator(".gt-full-gear > summary").isVisible());
  await page.locator(".gt-audit-tools > summary").click();
  await page.locator(".gt-audit-research > summary").click();
  const acquisition=page.locator("#gt-acquisition-filter");
  assert.equal(await acquisition.isVisible(),false);
  await page.locator(".gt-gear-more-filters > summary").click();
  await acquisition.selectOption("聲望");
  assert.ok(await page.locator('.gt-bis-slot a[href*="/item/19323/"]').first().isVisible());
  await acquisition.selectOption("裝綁");
  assert.equal(await page.locator('.gt-bis-slot a[href*="/item/19323/"]').count(),0);
  assert.ok(await page.locator('.gt-bis-slot a[href*="/item/252484/"]').count()>0);
  await acquisition.selectOption("");
  const maceIcon=page.locator('.gt-bis-slot .gt-item-heading:has(a[href*="/item/19323/"]) img').first();
  await maceIcon.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll(".gt-item-icon img")).some(i=>i.src.includes("fixture_mace")&&i.complete&&i.naturalWidth>0));
  await page.locator('.gt-bis-slot .gt-item-heading:has(a[href*="/item/19323/"]) .gt-item-icon').first().waitFor({state:"visible"});
  console.log("PASS: original item icon UI with isolated image fixture");
  console.log("PASS: AV mace in main cat gear and acquisition/BoE filters");
  const slots=await page.locator(".gt-bis-slot h4").allTextContents();
  assert.ok(slots.length,"feral candidate cards missing");
  assert.ok(!slots.some(x=>/副手|單手/.test(x)),"feral invalid slot: "+slots.join(","));
  console.log("PASS: actual feral default cards exclude one-hand/offhand slots");
  const workspace=page.locator(".gt-build-workspace"),pane=workspace.locator(".gt-gear-scroll");
  await workspace.getByRole("button",{name:"收合篩選"}).click();
  assert.equal(await workspace.locator("#gt-gear-filter-panel").isVisible(),false);
  assert.ok(await pane.isVisible());
  await workspace.getByRole("button",{name:"展開篩選"}).click();
  assert.ok(await workspace.locator("#gt-gear-filter-panel").isVisible());

  const talentFrame=workspace.frameLocator('iframe[title="並排天賦流派"]');
  await talentFrame.locator("#overview").getByText("9/32/10",{exact:true}).waitFor({state:"visible"});
  const columns=workspace.locator(".gt-build-column");
  const left=await columns.nth(0).boundingBox(),right=await columns.nth(1).boundingBox();
  assert.ok(left.x<right.x&&Math.abs(left.y-right.y)<3,"desktop columns must sit side by side");
  assert.ok(await pane.evaluate(el=>el.scrollHeight>el.clientHeight),"equipment panel must scroll independently");
  const jump=workspace.locator("#gt-gear-slot-jump");
  const density=workspace.locator("#gt-gear-density");
  await density.selectOption("compact");
  assert.ok(await pane.evaluate(el=>el.classList.contains("gt-gear-compact")));
  assert.equal(await pane.locator(".gt-stat-wrap:visible").count(),0);
  await density.selectOption("full");
  assert.ok(await pane.locator(".gt-stat-wrap:visible").count()>0);
  await workspace.locator(".gt-gear-filters input").fill("not-a-real-item-xyz");
  assert.equal(await pane.locator(".gt-bis-slot").count(),0);
  await workspace.getByRole("button",{name:"清除篩選"}).click();
  await workspace.locator(".gt-gear-more-filters > summary").click();
  assert.equal(await density.isVisible(),false);
  assert.ok(await pane.locator(".gt-bis-slot").count()>0);
  assert.ok((await talentFrame.locator("#treeJump button").count())>=4);
  assert.equal(await talentFrame.locator("#overview details").first().getAttribute("open"),null);
  await talentFrame.locator("#treeJump button").last().click();
  assert.ok(await talentFrame.locator("#detail").isVisible());
  const lastSlot=await jump.locator("option").last().getAttribute("value");
  await jump.selectOption(lastSlot);
  assert.ok(await pane.evaluate(el=>el.scrollTop>0),"slot selector must scroll the gear pane");
  await workspace.getByRole("button",{name:"回到頂端"}).click();
  assert.equal(await pane.evaluate(el=>el.scrollTop),0);
  await page.setViewportSize({width:390,height:844});
  const mobileLeft=await columns.nth(0).boundingBox(),mobileRight=await columns.nth(1).boundingBox();
  assert.ok(mobileRight.y>=mobileLeft.y+mobileLeft.height-2,"mobile columns must stack vertically");
  assert.ok(await workspace.evaluate(el=>el.scrollWidth<=el.clientWidth+2),"workspace must not overflow horizontally");
  await page.setViewportSize({width:1366,height:900});
  await build.selectOption("feral_onehand");
  await talentFrame.locator("#overview").getByText("單手＋持有型副手（替代比較）",{exact:false}).first().waitFor({state:"visible"});
  assert.equal(await talentFrame.locator("#treeArea .talent").count(),0);
  assert.ok((await workspace.locator("iframe").getAttribute("src")).includes("build=feral_onehand"));
  await build.selectOption("general");
  console.log("PASS: synchronized desktop talent/gear layout, independent gear scroll, mobile stacking and build switching");
  await openTab("v8");
  const tf=page.frameLocator('iframe[title="天賦流派與野外練等"]');
  await tf.locator("#overview").getByText("9/32/10",{exact:true}).waitFor({state:"visible"});
  assert.equal(await tf.locator("#classSelect").isVisible(),false);
  await build.selectOption("feral_onehand");
  await tf.locator("#overview").getByText("單手＋持有型副手（替代比較）",{exact:false}).first().waitFor({state:"visible"});
  assert.equal(await tf.locator("#treeArea .talent").count(),0,"alternative must not borrow another build");
  if(fs.existsSync(path.join(root,"talent-community.json"))){
   await tf.locator("#levelMode").click();
   await tf.locator("#levelList .levelrow").first().waitFor({state:"visible"});
   assert.equal(await tf.locator("#levelList .levelrow").count(),60);
   assert.ok(await tf.locator("#treeArea .talent").count()>30);
   console.log("PASS: imported Druid leveling route, talent grid and 60-level controls");
  }
  console.log("PASS: embedded talent exact-match and safe missing-build mode");
  await page.locator("#gt-mode-blue").click();
  for(const selector of ["#class-select","#spec-select","#gt-build-bar","#guild-tools .gt-tabs"]){assert.equal(await page.locator(selector).isVisible(),false,selector);}
  assert.equal(await page.locator("section.spec:visible").count(),0);
  const bf=page.locator("#gt-blue-board");
  assert.match(await bf.getAttribute("data-release"),/^19\.\d+$/);
  assert.equal(await page.locator("iframe").count(),0,"no homepage iframe in blue mode");
  await bf.locator("#blue-list article").first().waitFor({state:"visible"});
  assert.ok(await bf.locator("#blue-list article").count()>=15);
  await bf.locator('#blue-list details[data-post-key="199"] > summary').click();
  assert.equal(await bf.locator('#blue-list details[data-post-key="199"] .gt-blue-body h4').count(),6);
  assert.ok((await bf.locator('#blue-list details[data-post-key="199"]').innerText()).includes("20%、40%、60%、80%或100%"));
  await bf.locator('#blue-list details[data-post-key="199"] > summary').click();
  assert.equal(await bf.locator("#blue-list details[open]").count(),0,"posts initially collapsed");
  assert.equal(await bf.locator("iframe").count(),0,"no external frame before user action");
  await bf.locator("#blue-list details > summary").first().click();
  assert.equal(await bf.locator("#blue-list details[open]").count(),1);
  assert.equal(await bf.locator("#expand-posts, #collapse-posts").count(),0);
  await bf.locator("#blue-list details > summary").nth(1).click();
  assert.equal(await bf.locator("#blue-list details[open]").count(),2);
  await bf.locator("#blue-list details > summary").first().click();
  assert.equal(await bf.locator("#blue-list details[open]").count(),1);
  assert.equal(await bf.locator("#blue-list details").nth(1).getAttribute("open"),"");
  await bf.locator("#blue-list details > summary").nth(1).click();
  assert.equal(await bf.locator("#blue-list details[open]").count(),0);
  assert.equal(await bf.locator(":scope > .gt-blue-source a").count(),3);
  assert.ok(await bf.getByRole("link",{name:"藍帖同步執行紀錄"}).isVisible());
  assert.equal(await bf.locator(":scope > .gt-blue-source a").first().getAttribute("href"),"https://us.forums.blizzard.com/en/wow/c/wow-forever/346");
  assert.equal(await bf.locator('a[href*="exwind.net"]').count(),0);
  await bf.locator("#blue-list details > summary").first().click();
  assert.equal(await bf.locator("iframe").count(),0,"never create blocked external frames");
  assert.equal(await bf.locator('#blue-list details[open] a[href*="forums.blizzard.com/en/wow/t/"]').count(),1);
  assert.equal(await bf.locator('#blue-list details[open] a[href*="forums.blizzard.com/en/wow/t/"]').getAttribute("target"),"_blank");
  const articleKeys=await bf.locator("#blue-list details").evaluateAll(xs=>xs.map(x=>x.dataset.postKey));
  assert.equal(new Set(articleKeys).size,articleKeys.length,"unique source article");
  await bf.locator("#blue-list details > summary").first().click();
  console.log("PASS: independent grouped blue posts, direct source link and no blocked iframes");
  await bf.locator("#blue-query").fill("德魯伊 2026-11-25");
  assert.ok(await bf.locator("#blue-list article").count()>0);
  await bf.locator("#blue-query").fill("no-such-post-123");
  assert.equal(await bf.locator("#blue-list article").count(),0);
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
  await page.goto(origin+"/blue-18-3.html");
  await page.locator("#gt-blue-board").waitFor({state:"visible"});
  assert.equal(await page.locator("iframe").count(),0);
  assert.equal(await page.locator('#gt-blue-board a[href*="exwind.net"]').count(),0);
  console.log("PASS: legacy blue URL redirects to canonical official board");
  assert.deepEqual(errors,[],"page errors");
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
