/* 墓鐘公會用資料庫 V8–V14 beta · 2026-11-27
   Uses the existing V7 candidate cards and V6 recipe JSON. No third-party scripts, no network calls, no personal data sent. */
(function(){
"use strict";
const $=(sel,root=document)=>root.querySelector(sel);
const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const link=(text,url)=>{const e=node("a",text);e.href=url;e.target="_blank";e.rel="noopener noreferrer";return e;};
const add=(parent,...children)=>{parent.append(...children);return parent;};
const box=(parent,title,body)=>{const e=node("section",undefined,"gt-card");add(e,node("h4",title),node("p",body));parent.append(e);return e;};
const field=(label,input)=>add(node("label",undefined,"gt-field"),node("span",label),input);
const select=(pairs,first)=>{const e=node("select");if(first)e.add(new Option(first,""));for(const [v,t] of pairs)e.add(new Option(t,v));return e;};
const inp=(placeholder,type="search")=>{const e=node("input");e.type=type;e.placeholder=placeholder;return e;};
const button=(t,fn)=>{const e=node("button",t);e.type="button";e.addEventListener("click",fn);return e;};
const text=(e,sel)=>$(sel,e)?.textContent.trim()||"";
const specEls=$$("section.spec");
const bySpec=new Map();
const byItem=new Map();
const parseNum=s=>{const v=Number(String(s).replace(/[%,+]/g,"").trim());return Number.isFinite(v)?v:0;};
for(const sec of specEls){
 const id=sec.id,name=text(sec,"h2"),slots=new Map(),weights={};
 for(const el of $$(".weights span",sec)){const [k,v]=el.textContent.split(" × ");if(k&&v!==undefined)weights[k]=parseNum(v);}
 for(const slot of $$(".slot",sec)){
  const title=text(slot,".slothead h3");if(!title)continue;
  const rows=[];
  for(const card of $$(".cards > article.item",slot)){
   const anchor=$("h4 a",card);const m=anchor?.href.match(/\/(?:items|item)\/(\d+)/);if(!m)continue;
   const stats={};for(const st of $$(".stat",card))stats[text(st,"span")]=parseNum(text(st,"b"));
   const score=parseNum(($(".score",card)?.firstChild?.textContent||"").trim());
   const src=$(".source",card)?.cloneNode(true);if(src)$("b",src)?.remove();
   const type=text(card,".itemhead small").replace(/\s*· ID \d+$/,"");
   const wm={};for(const v of $$(".weaponmetrics > div",card))wm[text(v,"small")]=text(v,"b");
   const item={id:m[1],name:anchor.textContent.trim(),url:anchor.href,slot:title,type,stats,score,rank:parseNum(text(card,".rank")),source:src?.textContent.trim()||"來源待查",note:text(card,".note"),evidence:text(card,".audit-evidence"),wm};
   rows.push(item);
   if(!byItem.has(item.id))byItem.set(item.id,{...item,uses:[]});
   const row=byItem.get(item.id);row.uses.push({id,name,slot:title,rank:item.rank});
  }
  slots.set(title,rows);
 }
 bySpec.set(id,{id,name,slots,weights,sec});
}
const guides=[
["雙手武器傷害、怒氣效率與致死打擊構築","主動技能前預留怒氣；單體維持主要傷害技能，斬殺階段依怒氣調整。","warrior"],
["雙持、怒氣與爆發窗口","維持近戰自動攻擊；比較主副手組合，避免怒氣不足時過度使用耗怒技能。","warrior"],
["盾牌、生存、仇恨與怒氣","先維持減傷與仇恨；嘲諷與防禦技能保留給失控或高傷窗口。","warrior"],
["智力、治療與法力續航","以坦克與優先目標治療為主；依團隊傷害與法力使用群補和祝福。","paladin/holy"],
["法傷、智力、防禦與盾牌","正義之怒；奉獻、審判與盾牌技能建立仇恨；依怪物數量和法力決定施放頻率。","paladin/protection"],
["雙手武器、聖印與審判","維持適合構築的聖印，依審判、近戰技能與法力分配爆發。","paladin/retribution"],
["寵物、遠程輸出與命中","維持自動射擊與寵物攻擊，安排寵物爆發及轉火。","hunter/beast-mastery"],
["遠程武器、命中與射擊時序","安排射擊技能，避免無必要中斷自動射擊。","hunter/marksmanship"],
["近戰與遠程兩套構築","近戰流看雙手武器與近戰天賦；遠程流以自動射擊及射擊技能為主，別混用單一武器排名。","hunter/survival"],
["匕首、能量、連擊點與毒藥","由潛行起手，維持需要的增益與毒藥；按能量和連擊點施放終結技。","rogue/assassination"],
["主副手搭配、命中與攻擊事件","穩定維持攻速增益，規劃能量和終結技；雙手各自塗毒。","rogue/combat"],
["潛行、爆發與連擊點","規劃起手與爆發窗口；不同武器構築需用相應技能。","rogue/subtlety"],
["護盾、治療、法力管理","預判傷害，安排吸收與直接治療；不能把單純治療加成當作所有護盾的固定倍率。","priest/discipline"],
["直接治療、群補與續航","以目標掉血速度選治療，避免溢補與缺魔；依遭遇安排群補。","priest/holy"],
["暗影傷害與持續法術","保持主要持續傷害，安排引導與填充法術；留意暗影形態與法力。","priest/shadow"],
["自然傷害、命中與爆擊","以閃電類法術與圖騰效益為核心；按目標數與法力使用閃電鏈。","shaman/elemental"],
["雙手武器、近戰與混合屬性","兼顧風怒及武器傷害；依天賦與觸發處理瞬發法術、圖騰及法力。","shaman/enhancement"],
["治療鏈、圖騰與法力","依坦克單體及團隊群傷切換治療，保持需要的圖騰；規劃續航。","shaman/restoration"],
["秘法傷害、智力與法力","依戰鬥時間安排爆發與保魔，避免把短戰高耗魔循環當長戰最佳。","mage/arcane"],
["火焰傷害、命中與爆擊","安排主要火系法術、觸發技能與爆發；依目標抗性調整。","mage/fire"],
["冰霜傷害與觸發管理","使用冰霜主力法術與適用觸發；別將凍結控制等同首領可受控。","mage/frost"],
["暗影持續傷害與生命分流","維持適用詛咒及DoT，按法力使用生命分流；顧及生存。","warlock/affliction"],
["寵物與自身法術效益","選擇符合構築的惡魔，安排寵物輸出、詛咒及法術；寵物繼承須另外計算。","warlock/demonology"],
["火焰／暗影直傷與爆擊","按構築使用火焰或暗影主力技能；依觸發及詛咒安排爆發。","warlock/destruction"],
["秘法、自然與月蝕／日蝕構築","11/25平衡天賦改動後應重配；按日月蝕、持續傷害與法力安排施法。","druid/balance"],
["武器DPS、能量與連擊點","維持適用持續效果，避免能量溢出；武器原始攻速不是貓形態攻速。","druid/feral-cat"],
["護甲、耐力、敏捷與武器DPS","熊形態承傷與怒氣優先，按目標數使用仇恨技能；保留生存手段。","druid/feral-bear"],
["持續治療、直接治療及法力","預判傷害安排HoT，按緊急程度補直接治療，管理啟動及續航。","druid/restoration"]
];
const root=$("#guild-tools");if(!root)return;
const tabs=[["v8","天賦手法"],["v9","掉落反查"],["v10","收集進度"],["v11","團本準備"],["v12","官方藍帖"],["v13","配方材料"],["v14","配裝試算"],["audit","BiS 資料稽核"]];
const nav=node("div",undefined,"gt-tabs"),panel=node("div",undefined,"gt-panel");
const info=node("p","選擇工具；原有職業、專精與裝備選單保留在下方。","gt-muted");
add(root,node("h2","公會工具箱"),info,nav,panel);
let active="v8";
const specPairs=[...bySpec.values()].map(s=>[s.id,s.name]);
const getSpec=()=>$("#spec-select")?.value||"spec-5";
function specPicker(onChange){const p=select(specPairs);p.value=bySpec.has(getSpec())?getSpec():(bySpec.has("spec-5")?"spec-5":(specPairs[0]?.[0]||""));p.addEventListener("change",()=>onChange(p.value));return p;}
function title(t,desc){panel.replaceChildren(node("h3",t),node("p",desc,"gt-muted"));}
function guide(){title("V8 · 天賦與實戰手法","全 28 專精的練習重點與永恆攻略入口。下列為研究建議，不是已驗證的 51 點唯一最佳天賦。");const out=node("div");const render=id=>{const s=bySpec.get(id),g=guides[Number(id.split("-")[1])-1];out.replaceChildren();const c=box(out,s.name,g[0]);add(c,node("p",g[1]),link("永恆職業指南／天賦與手法", "https://nossuary.com/guides/wow-forever/"+g[2]+"/"),node("p","另以官方熱修正、Icy Veins 與遊戲內技能說明交叉核對。","gt-muted"),link("Icy Veins 永恆職業指南","https://www.icy-veins.com/wow-forever/class-guides"));if(id==="spec-25")add(c,node("p","11/25：平衡天賦改名、星火術天賦降為2點、日月蝕增加憤怒爆擊，舊配置須重查。"),link("官方11/25熱修正","https://news.blizzard.com/en-us/article/24315281/wow-forever-hotfixes-november-25-2026"));};const p=specPicker(render);add(panel,field("專精",p),out);render(p.value);}
function drops(){title("V9 · 掉落反向查詢","從 V7 已收錄的裝備卡片建立反向索引；來源沿用卡片，不表示本次逐件證實。");const q=inp("輸入裝備、首領、副本、任務名稱"),sp=select(specPairs,"所有專精");const source=select([...new Set([...byItem.values()].map(x=>x.source.split("－")[0].trim()))].sort().map(v=>[v,v]),"所有取得來源");const out=node("div");function draw(){out.replaceChildren();const term=q.value.trim().toLowerCase();const list=[...byItem.values()].filter(x=>(!term||[x.name,x.source,x.type,x.id].join(" ").toLowerCase().includes(term))&&(!source.value||x.source.split("－")[0].trim()===source.value)&&(!sp.value||x.uses.some(u=>u.id===sp.value))).sort((a,b)=>a.source.localeCompare(b.source,"zh-Hant")||a.name.localeCompare(b.name,"zh-Hant"));out.append(node("p",list.length+" 件獨立物品","gt-muted"));for(const x of list){const c=node("article",undefined,"gt-card");add(c,link(x.name,x.url),node("small",x.slot+" · "+x.type),node("p",x.source),node("p","入榜專精："+x.uses.filter(u=>!sp.value||u.id===sp.value).map(u=>u.name+" #"+u.rank).join("、"),"gt-muted"));out.append(c);}}for(const el of [q,sp,source])el.addEventListener(el===q?"input":"change",draw);add(panel,field("搜尋",q),field("來源",source),field("職業專精",sp),out);draw();}
const storeKey="tomb-bis-collected-v1";let collected={};let storageOK=true;try{collected=JSON.parse(localStorage.getItem(storeKey)||"{}");if(!collected||typeof collected!=="object")collected={};}catch(e){storageOK=false;collected={};}
function save(){try{localStorage.setItem(storeKey,JSON.stringify(collected));}catch(e){storageOK=false;}}
function checklist(){title("V10 · 個人裝備收集","每個專精獨立保存。只存在本瀏覽器，清除網站資料或換裝置不會同步。選擇某件第一順位並不代表整套最佳。");const out=node("div");const render=id=>{const s=bySpec.get(id),state=collected[id]||{};out.replaceChildren();let total=0,have=0;for(const [slot,items] of s.slots){if(!items.length)continue;total+=1;if(items.some(x=>state[x.id]))have++;}const status=node("p","已收集至少一件候選： "+have+" / "+total+" 部位"+(storageOK?"":"（目前無法永久儲存）"),"gt-muted");const progress=node("progress");progress.max=total||1;progress.value=have;add(out,status,progress,button("清除此專精紀錄",()=>{if(confirm("確定清除此專精的收集紀錄？")){delete collected[id];save();render(id);}}));for(const [slot,items] of s.slots){if(!items.length)continue;const c=node("div",undefined,"gt-card");c.append(node("h4",slot));for(const x of items){const chk=node("input");chk.type="checkbox";chk.checked=!!state[x.id];chk.addEventListener("change",()=>{collected[id]??={};collected[id][x.id]=chk.checked;save();render(id);});add(c,add(node("label",undefined,"gt-check"),chk,node("span","#"+x.rank+" "+x.name),node("small",x.source)));}out.append(c);}};const p=specPicker(render);add(panel,field("專精",p),out);render(p.value);}
const official="https://news.blizzard.com/en-us/article/24315281/wow-forever-hotfixes-november-25-2026";
function raid(){title("V11 · 團本準備","2026/11/27：首批團本尚未開放。以下是官方已公布的規模及前置，尚未加入首領技能推測。");const r=[["地深獸穴（Barrow Deeps）","10人 · 8首領 · 60級 · 官方公告12/9（台灣日期依維護公告）"],["海加爾山之巔（Hyjal Summit）","20人 · 13首領 · 60級 · 官方公告12/9"],["奧妮克希亞巢穴","40人 · 60級 · 每位玩家準備龍火護符；聯盟／部落前置不同。"]];for(const [a,b] of r)box(panel,a,b);const c=box(panel,"開荒通用檢查","先完成滿等技能與裝備、按職責準備消耗品、抗性按官方機制決定、預先分配坦補與斷法。世界增益進團本會移除（11/23熱修正）。");add(c,link("官方團本概覽","https://news.blizzard.com/en-gb/article/24303009/world-of-warcraft-forever-raid-overviewlocations-raid-sizes-and-attunement"),node("p","首領打法等正式資料出現後再補齊。","gt-muted"),link("官方熱修正",official));}
const news=[["2026/11/25","平衡德天賦調整","憤怒與星火相關天賦重新整理，日月蝕增加憤怒爆擊，梟獸形態強化秘法與自然傷害。3點以上舊強化星火術可能被重置。"],["2026/11/25","獵人／術士寵物","修正寵物普通近戰攻擊爆擊率為0%的問題；野獸控制獵召喚的鷹亦有行為和爆擊修正。"],["2026/11/25","聖騎士／盜賊／薩滿","修正審判刷新及驅邪術爆擊；聖光誓約延長。毒藥與致盲粉暫時拾取綁定；薩滿閃電鏈的節能施法修正。"],["2026/11/23","團本世界增益與套裝","區域切換不再移除世界增益，但進團本仍移除；野性之心4件能量回復修正，數個武器過度觸發問題也已修正。"],["2026/11/17","聖坦魂鑄套裝","坦克版魂鑄套裝以法術能量取代力量。Whiteout Staff、Crackling Staff 的屬性統一為25耐、25智、74武器法傷。"]];
function hotfix(){title("V12 · 官方藍帖繁中摘要","截至 2026/11/27 查得的最新官方熱修正為 11/25。此區為手動更新摘要，不是即時爬蟲。");const q=inp("搜尋日期、職業或關鍵字"),out=node("div");function draw(){out.replaceChildren();for(const [d,t,b] of news.filter(x=>x.join(" ").includes(q.value.trim()))){const c=box(out,d+" · "+t,b);c.append(link("官方原文",official));}}q.addEventListener("input",draw);add(panel,field("搜尋",q),out,link("暴雪魔獸世界最新消息","https://news.blizzard.com/en-us/world-of-warcraft"));draw();}
function material(){title("V13 · 配方與材料索引","從 V6 結構化配方建立可搜尋索引，保留原配方狀態與來源線索；尚未證實的成品不可當作一定能取得。");let data;try{data=JSON.parse($("#v6-prep-data").textContent);}catch(e){panel.append(node("p","配方資料無法讀取"));return;}const rows=Object.values(data.recipes||{});const q=inp("例如：大塊魔光碎片、法術能量、夢葉草"),prof=select([...new Set(rows.map(x=>x.prof))].sort().map(x=>[x,x]),"全部專業"),out=node("div");function draw(){out.replaceChildren();const term=q.value.trim(),list=rows.filter(x=>(!prof.value||x.prof===prof.value)&&(!term||[x.name,x.fx,x.mat,x.where].join(" ").includes(term)));out.append(node("p",list.length+" 個配方候選","gt-muted"));for(const x of list){const c=box(out,x.name+" · "+x.prof,x.fx);add(c,node("small",x.state),node("p","配方取得："+x.where),node("p",x.mat));const ul=node("ul");for(const material of String(x.mat).split("、")){const key=material.split("×")[0].trim();add(ul,node("li",material+" — "+(data.routes[key]||"來源未核對")));}add(c,ul,link("永恆專業資料","https://wowamobi.com/professions"),node("p",x.why,"gt-muted"));}if(term&&data.routes[term])box(out,"材料來源："+term,data.routes[term]);}q.addEventListener("input",draw);prof.addEventListener("change",draw);add(panel,field("配方／材料搜尋",q),field("專業",prof),out);draw();}
function statScore(stats,weights,currentHit,hitTarget){let total=0;for(const [k,v] of Object.entries(stats)){let qty=v;if(k==="命中機率"&&hitTarget!==null)qty=Math.min(v,Math.max(0,hitTarget-currentHit));total+=qty*(weights[k]||0);}return total;}
function optimizer(){title("V14 · 個人化配裝比較（試算版）","比較同一部位的候選裝備，可自行修改屬性權重、命中門檻及現有命中。不是完整戰鬥模擬；不估算觸發、套裝、天賦、武器手位及裝備互斥。");const out=node("div");const render=id=>{const s=bySpec.get(id);out.replaceChildren();const slot=select([...s.slots].filter(([k,v])=>v.length>0).map(([k])=>[k,k]));if(s.slots.has("頭部"))slot.value="頭部";const current=inp("0","number");current.value="0";current.min="0";current.step="0.1";const target=inp("留空＝不限制","number");target.min="0";target.step="0.1";const weights={...s.weights};const weightBox=node("details");weightBox.append(node("summary","自訂屬性權重（各專精分數不可互比）"));const grid=node("div",undefined,"gt-weight-grid");weightBox.append(grid);const result=node("div");function draw(){const rows=s.slots.get(slot.value)||[];result.replaceChildren();const base=Number(current.value)||0;const cap=target.value===""?null:Math.max(0,Number(target.value)||0);const sorted=rows.map(x=>({...x,calc:statScore(x.stats,weights,base,cap)})).sort((a,b)=>b.calc-a.calc);const basePick=select(sorted.map(x=>[x.id,x.name]),"選擇目前穿戴候選（可略過）");const results=node("div");function show(){results.replaceChildren();const compare=sorted.find(x=>x.id===basePick.value);for(const [i,x] of sorted.entries()){const c=box(results,"#"+(i+1)+" "+x.name,"屬性加權分："+x.calc.toFixed(2)+(compare?" · 相對目前："+(x.calc-compare.calc>=0?"+":"")+(x.calc-compare.calc).toFixed(2):""));add(c,node("p",Object.entries(x.stats).map(([k,v])=>k+" "+v).join(" · "),"gt-muted"),node("p",x.source),link("物品來源",x.url));}}basePick.addEventListener("change",show);add(result,field("目前穿戴",basePick),results);show();}for(const k of Object.keys(weights)){const el=inp("0","number");el.step="0.01";el.min="0";el.value=String(weights[k]);el.addEventListener("input",()=>{weights[k]=Math.max(0,Number(el.value)||0);draw();});grid.append(field(k,el));}for(const e of [slot,current,target])e.addEventListener(e===slot?"change":"input",draw);add(out,field("比較部位",slot),field("不含此部位的目前命中 (%)",current),field("自訂命中目標 (%)；依種族天賦與敵人等級",target),weightBox,node("p","武器僅比較卡片列出的通用屬性，不加入DPS或手位修正；最佳化武器組合請使用原有專精武器區。","gt-muted"),result,link("WoWSims 永恆完整戰鬥模擬（外部）","https://wowsims.com/forever/"));draw();};const p=specPicker(render);add(panel,field("專精",p),out);render(p.value);}
function audit(){title("V14.1 · BiS 資料稽核","檢查既有候選卡片的完整性，不等於外部來源交叉驗證。即使卡片有證據文字，也不代表已確認為整套 BiS。");const out=node("div"),q=inp("搜尋裝備、部位或來源"),mode=select([["all","全部候選"],["missing","缺少來源或證據"]]);const p=specPicker(draw);function draw(){const spec=bySpec.get(p.value);if(!spec)return;out.replaceChildren();const all=[...spec.slots.values()].flat();const missing=x=>!x.evidence||!x.source||/待查|待核|未知/.test(x.source);const empty=[...spec.slots].filter(([k,v])=>!v.length).map(([k])=>k);add(out,node("p",spec.name+" · "+all.length+" 筆候選 · "+all.filter(missing).length+" 筆缺來源或證據文字"),node("p","空白候選部位："+(empty.join("、")||"無（僅指已列出的部位）"),"gt-muted"));for(const x of all.filter(x=>(mode.value!=="missing"||missing(x))&&[x.name,x.slot,x.source,x.id].join(" ").toLowerCase().includes(q.value.trim().toLowerCase()))){const c=box(out,x.slot+" · #"+x.rank+" "+x.name,missing(x)?"資料缺項，優先複核":"已有來源與證據文字，仍需外部複核");add(c,node("p",x.source),node("p",x.evidence||"未提供證據文字","gt-muted"),link("原物品資料",x.url));}}q.addEventListener("input",draw);mode.addEventListener("change",draw);add(panel,field("專精",p),field("篩選",mode),field("搜尋",q),out);draw();}
const renderers={audit,v8:guide,v9:drops,v10:checklist,v11:raid,v12:hotfix,v13:material,v14:optimizer};
function show(key){active=key;for(const b of $$("button",nav)){b.setAttribute("aria-pressed",String(b.dataset.tab===key));}try{renderers[key]();}catch(e){panel.replaceChildren(node("p","此工具載入失敗，原有職業裝備區仍可使用。"));console.error(e);}}
for(const [key,label] of tabs){const b=button(label,()=>show(key));b.dataset.tab=key;nav.append(b);}
$("#spec-select")?.addEventListener("change",()=>{if(["v8","v10","v14","audit"].includes(active))show(active);});
show("v8");
})();