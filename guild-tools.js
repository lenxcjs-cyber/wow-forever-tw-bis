/* 墓鐘公會用資料庫 V15.3 beta · 2026-11-27
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
// Conservative role screen, not a combat simulation. Only flag clear mismatches.
const roleByIndex=["physical","physical","tank","heal","hybrid","hybrid","physical","physical","hybrid","physical","physical","physical","heal","heal","caster","caster","hybrid","heal","caster","caster","caster","caster","caster","caster","caster","physical","tank","heal"];
function roleFor(id){return roleByIndex[Number(id.split("-")[1])-1]||"hybrid";}
const spellOnly=/法術傷害|法術能量|法術強度|法傷|治療加成|治療效果|治療能量|治療強度|智力|法力|spell power|spell damage|healing|intellect|mana/i;
const pureHealing=/治療加成|治療效果|治療能量|治療強度|healing/i;
const physicalUseful=/力量|敏捷|攻擊強度|攻擊能量|攻擊力|命中|爆擊|致命|急速|武器技能|耐力|護甲|防禦|閃躲|躲閃|招架|格擋|盾牌|精準|strength|agility|attack power|hit|crit|stamina|armor|defen[cs]e|dodge|parry|block/i;
const magicUseful=/法術|法傷|智力|精神|法力|治療|命中|爆擊|致命|急速|spell|intellect|spirit|mana|healing|hit|crit/i;
function suitability(id,x){
 const role=roleFor(id),keys=Object.keys(x.stats).filter(k=>x.stats[k]>0),weapon=/武器|主手|副手|雙手|遠程|單手/.test(x.slot+" "+x.type);
 if(!keys.length)return "";
 if((role==="physical"||role==="tank")&&keys.some(k=>spellOnly.test(k))&&!keys.some(k=>physicalUseful.test(k)))return "法系屬性為主，未見物理或生存屬性；需核對"+(weapon?"武器DPS、攻速與特殊效果":"特殊效果");
 if((role==="physical"||role==="tank")&&weapon&&keys.some(k=>spellOnly.test(k)))return "含法系屬性，武器DPS及坦克／物理收益需獨立複核";
 if(role==="caster"&&keys.some(k=>pureHealing.test(k))&&!keys.some(k=>!pureHealing.test(k)&&magicUseful.test(k)))return "偏治療屬性，需確認是否同時提供法術傷害";
 if((role==="caster"||role==="heal")&&keys.some(k=>/力量|敏捷|攻擊強度|attack power|strength|agility/i.test(k))&&!keys.some(k=>magicUseful.test(k)))return "偏物理屬性，需核對施法或治療收益";
 return "";
}
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
   item.review=suitability(id,item);
   if(item.review){
    const warning=node("p","⚠ "+item.review+"；原順位暫不視為推薦。","gt-muted");
    warning.style.color="#f2c47d";card.append(warning);
    const rankEl=$(".rank",card);if(rankEl)rankEl.title="舊版順位，適用性待複核";
   }
   rows.push(item);
   if(!byItem.has(item.id))byItem.set(item.id,{...item,uses:[]});
   const row=byItem.get(item.id);row.uses.push({id,name,slot:title,rank:item.rank,review:item.review});
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
const info=node("p","V14.2 · 選擇下方功能按鈕，快速查詢公會資料。原有職業與裝備選單維持不變。","gt-muted");
add(root,node("p","03 選擇功能","gt-section-label"),nav,panel);
let active="";
const specPairs=[...bySpec.values()].map(s=>[s.id,s.name]);
const getSpec=()=>{const el=$("#spec-select");return el&&!el.disabled&&bySpec.has(el.value)?el.value:"";};
function specPicker(){return {value:getSpec()};}
function specLabel(){return node("p","目前專精："+(bySpec.get(getSpec())?.name||"尚未選擇"),"gt-muted");}
function title(t,desc){panel.replaceChildren(node("h3",t),node("p",desc,"gt-muted"));}
function guide(){title("V15 · 天賦與實戰手法","全 28 專精研究重點與多來源天賦查證。團本前 PvE；非已驗證的唯一最佳點法。");const out=node("div");const render=id=>{const s=bySpec.get(id),g=guides[Number(id.split("-")[1])-1];out.replaceChildren();const c=box(out,s.name,g[0]);add(c,node("p",g[1]),node("h4","構築與手法查證"),node("p","先依職責選擇滿等 PvE 天賦，再以遊戲內技能、最新熱修正及相同構築的實測確認優先序。"),link("ForeverSpec 滿等構築與版本更新","https://foreverspec.com/"),node("p",""),link("Azeroth DB 天賦計算器與技能資料","https://azeroth-db.github.io/"),node("p",""),link("WoWGuildHub 天賦與技能資料","https://wowguildhub.com/wow-forever/guide"),node("p",""),link("永恆職業指南／天賦與手法", "https://nossuary.com/guides/wow-forever/"+g[2]+"/"),node("p","另以官方熱修正、Icy Veins 與遊戲內技能說明交叉核對。","gt-muted"),link("Icy Veins 永恆職業指南","https://www.icy-veins.com/wow-forever/class-guides"));if(id==="spec-25")add(c,node("p","11/25：平衡天賦改名、星火術天賦降為2點、日月蝕增加憤怒爆擊，舊配置須重查。"),link("官方11/25熱修正","https://news.blizzard.com/en-us/article/24315281/wow-forever-hotfixes-november-25-2026"));};const p=specPicker(render);add(panel,specLabel(),out);render(p.value);}
function drops(){title("V15 · 掉落反查與刷裝路線","以網站既有候選裝備為範圍，按來源、專精、部位及順位查詢。順位不是掉率；來源未經逐件交叉驗證。");
const q=inp("裝備、首領、副本、任務、物品 ID（空格分隔）"),sp={value:getSpec()},slot=select([...new Set([...bySpec.values()].flatMap(s=>[...s.slots.keys()]))].sort().map(x=>[x,x]),"所有部位"),source=select([...new Set([...byItem.values()].map(x=>x.source.split("－")[0].trim()))].sort().map(v=>[v,v]),"所有取得來源"),rank=select([["0","不限順位"],["1","第一順位"],["3","前三順位"]]),mode=select([["items","裝備清單"],["routes","依來源整理"]]),out=node("div");
let limit=40;function draw(){out.replaceChildren();const terms=q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);const rows=[...byItem.values()].map(x=>({...x,matched:x.uses.filter(u=>(!sp.value||u.id===sp.value)&&(!slot.value||u.slot===slot.value)&&(!Number(rank.value)||(u.rank>0&&u.rank<=Number(rank.value))))})).filter(x=>x.matched.length&&(!source.value||x.source.split("－")[0].trim()===source.value)&&terms.every(t=>[x.name,x.source,x.type,x.id,...x.matched.map(u=>u.name+" "+u.slot)].join(" ").toLowerCase().includes(t)));
const groups=new Map();for(const x of rows){const k=x.source.split("－")[0].trim();if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}
out.append(node("p",rows.length+" 件符合條件的物品 · "+groups.size+" 個來源分類（依原卡片文字）","gt-muted"));
function card(x){const c=node("article",undefined,"gt-card");add(c,link(x.name,x.url),node("p",x.source),node("small",x.type+" · ID "+x.id),node("p",Object.entries(x.stats).map(([k,v])=>k+" "+v).join(" · "),"gt-muted"),node("p",x.matched.map(u=>u.name+" / "+u.slot+" #"+u.rank+(u.review?"（適用性待複核）":"")).join("、")),node("p",x.evidence||"缺少證據文字，請查證","gt-muted"));return c;}
if(mode.value==="routes"){const sorted=[...groups].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0],"zh-Hant"));for(const [name,items] of sorted.slice(0,limit)){const d=node("details",undefined,"gt-card");d.append(node("summary",name+"｜"+items.length+" 件候選"));for(const x of items)d.append(card(x));out.append(d);}if(sorted.length>limit)out.append(button("顯示更多來源",()=>{limit+=40;draw();}));}else{rows.sort((a,b)=>Math.min(...a.matched.map(u=>u.rank||999))-Math.min(...b.matched.map(u=>u.rank||999))||a.name.localeCompare(b.name,"zh-Hant"));for(const x of rows.slice(0,limit))out.append(card(x));if(rows.length>limit)out.append(button("顯示更多裝備",()=>{limit+=40;draw();}));}
if(!rows.length)out.append(node("p","沒有符合條件的候選；不代表遊戲內沒有此物品。"));}
for(const el of [q,slot,source,rank,mode])el.addEventListener(el===q?"input":"change",()=>{limit=40;draw();});add(panel,field("搜尋",q),specLabel(),field("部位",slot),field("來源",source),field("候選順位",rank),field("檢視方式",mode),out,box(panel,"完整遊戲資料查證","本站非全物品掉落庫。外部資料也可能包含舊版推定掉落，須確認永恆版本。"));add(panel,link("Eternadex 物品與來源資料庫","https://eternadex.com/en/datenbank/"),node("p",""),link("Azeroth DB 副本掉落與物品","https://azeroth-db.github.io/"));draw();}
const storeKey="tomb-bis-collected-v1";let collected={};let storageOK=true;try{collected=JSON.parse(localStorage.getItem(storeKey)||"{}");if(!collected||typeof collected!=="object")collected={};}catch(e){storageOK=false;collected={};}
function save(){try{localStorage.setItem(storeKey,JSON.stringify(collected));}catch(e){storageOK=false;}}
function checklist(){title("V10 · 個人裝備收集","每個專精獨立保存。只存在本瀏覽器，清除網站資料或換裝置不會同步。選擇某件第一順位並不代表整套最佳。");const out=node("div");const render=id=>{const s=bySpec.get(id),state=collected[id]||{};out.replaceChildren();let total=0,have=0;for(const [slot,items] of s.slots){if(!items.length)continue;total+=1;if(items.some(x=>state[x.id]))have++;}const status=node("p","已收集至少一件候選： "+have+" / "+total+" 部位"+(storageOK?"":"（目前無法永久儲存）"),"gt-muted");const progress=node("progress");progress.max=total||1;progress.value=have;add(out,status,progress,button("清除此專精紀錄",()=>{if(confirm("確定清除此專精的收集紀錄？")){delete collected[id];save();render(id);}}));for(const [slot,items] of s.slots){if(!items.length)continue;const c=node("div",undefined,"gt-card");c.append(node("h4",slot));for(const x of items){const chk=node("input");chk.type="checkbox";chk.checked=!!state[x.id];chk.addEventListener("change",()=>{collected[id]??={};collected[id][x.id]=chk.checked;save();render(id);});add(c,add(node("label",undefined,"gt-check"),chk,node("span","#"+x.rank+" "+x.name+(x.review?"（適用性待複核）":"")),node("small",x.source)));}out.append(c);}};const p=specPicker(render);add(panel,specLabel(),out);render(p.value);}
const official="https://news.blizzard.com/en-us/article/24315281/wow-forever-hotfixes-november-25-2026";
function raid(){title("V11 · 團本準備","2026/11/27：首批團本尚未開放。以下是官方已公布的規模及前置，尚未加入首領技能推測。");const r=[["地深獸穴（Barrow Deeps）","10人 · 8首領 · 60級 · 官方公告12/9（台灣日期依維護公告）"],["海加爾山之巔（Hyjal Summit）","20人 · 13首領 · 60級 · 官方公告12/9"],["奧妮克希亞巢穴","40人 · 60級 · 每位玩家準備龍火護符；聯盟／部落前置不同。"]];for(const [a,b] of r)box(panel,a,b);const c=box(panel,"開荒通用檢查","先完成滿等技能與裝備、按職責準備消耗品、抗性按官方機制決定、預先分配坦補與斷法。世界增益進團本會移除（11/23熱修正）。");add(c,link("官方團本概覽","https://news.blizzard.com/en-gb/article/24303009/world-of-warcraft-forever-raid-overviewlocations-raid-sizes-and-attunement"),node("p","首領打法等正式資料出現後再補齊。","gt-muted"),link("官方熱修正",official));}
const news=[["2026/11/25","平衡德天賦調整","憤怒與星火相關天賦重新整理，日月蝕增加憤怒爆擊，梟獸形態強化秘法與自然傷害。3點以上舊強化星火術可能被重置。"],["2026/11/25","獵人／術士寵物","修正寵物普通近戰攻擊爆擊率為0%的問題；野獸控制獵召喚的鷹亦有行為和爆擊修正。"],["2026/11/25","聖騎士／盜賊／薩滿","修正審判刷新及驅邪術爆擊；聖光誓約延長。毒藥與致盲粉暫時拾取綁定；薩滿閃電鏈的節能施法修正。"],["2026/11/23","團本世界增益與套裝","區域切換不再移除世界增益，但進團本仍移除；野性之心4件能量回復修正，數個武器過度觸發問題也已修正。"],["2026/11/17","聖坦魂鑄套裝","坦克版魂鑄套裝以法術能量取代力量。Whiteout Staff、Crackling Staff 的屬性統一為25耐、25智、74武器法傷。"]];
function hotfix(){title("V12 · 官方藍帖繁中摘要","截至 2026/11/27 查得的最新官方熱修正為 11/25。此區為手動更新摘要，不是即時爬蟲。");const q=inp("搜尋日期、職業或關鍵字"),out=node("div");function draw(){out.replaceChildren();for(const [d,t,b] of news.filter(x=>x.join(" ").includes(q.value.trim()))){const c=box(out,d+" · "+t,b);c.append(link("官方原文",official));}}q.addEventListener("input",draw);add(panel,field("搜尋",q),out,link("暴雪魔獸世界最新消息","https://news.blizzard.com/en-us/world-of-warcraft"));draw();}
function material(){title("V13 · 配方與材料索引","從 V6 結構化配方建立可搜尋索引，保留原配方狀態與來源線索；尚未證實的成品不可當作一定能取得。");let data;try{data=JSON.parse($("#v6-prep-data").textContent);}catch(e){panel.append(node("p","配方資料無法讀取"));return;}const rows=Object.values(data.recipes||{});const q=inp("例如：大塊魔光碎片、法術能量、夢葉草"),prof=select([...new Set(rows.map(x=>x.prof))].sort().map(x=>[x,x]),"全部專業"),out=node("div");function draw(){out.replaceChildren();const term=q.value.trim(),list=rows.filter(x=>(!prof.value||x.prof===prof.value)&&(!term||[x.name,x.fx,x.mat,x.where].join(" ").includes(term)));out.append(node("p",list.length+" 個配方候選","gt-muted"));for(const x of list){const c=box(out,x.name+" · "+x.prof,x.fx);add(c,node("small",x.state),node("p","配方取得："+x.where),node("p",x.mat));const ul=node("ul");for(const material of String(x.mat).split("、")){const key=material.split("×")[0].trim();add(ul,node("li",material+" — "+(data.routes[key]||"來源未核對")));}add(c,ul,link("永恆專業資料","https://wowamobi.com/professions"),node("p",x.why,"gt-muted"));}if(term&&data.routes[term])box(out,"材料來源："+term,data.routes[term]);}q.addEventListener("input",draw);prof.addEventListener("change",draw);add(panel,field("配方／材料搜尋",q),field("專業",prof),out);draw();}
function statScore(stats,weights,currentHit,hitTarget){let total=0;for(const [k,v] of Object.entries(stats)){let qty=v;if(k==="命中機率"&&hitTarget!==null)qty=Math.min(v,Math.max(0,hitTarget-currentHit));total+=qty*(weights[k]||0);}return total;}
function optimizer(){title("V14 · 個人化配裝比較（試算版）","比較同一部位的候選裝備，可自行修改屬性權重、命中門檻及現有命中。不是完整戰鬥模擬；不估算觸發、套裝、天賦、武器手位及裝備互斥。");const out=node("div");const render=id=>{const s=bySpec.get(id);out.replaceChildren();const slot=select([...s.slots].filter(([k,v])=>v.length>0).map(([k])=>[k,k]));if(s.slots.has("頭部"))slot.value="頭部";const current=inp("0","number");current.value="0";current.min="0";current.step="0.1";const target=inp("留空＝不限制","number");target.min="0";target.step="0.1";const weights={...s.weights};if(["physical","tank"].includes(roleFor(id)))for(const k of Object.keys(weights))if(spellOnly.test(k))weights[k]=0;const weightBox=node("details");weightBox.append(node("summary","自訂屬性權重（各專精分數不可互比）"));const grid=node("div",undefined,"gt-weight-grid");weightBox.append(grid);const result=node("div");function draw(){const rows=s.slots.get(slot.value)||[];result.replaceChildren();const base=Number(current.value)||0;const cap=target.value===""?null:Math.max(0,Number(target.value)||0);const sorted=rows.map(x=>({...x,calc:statScore(x.stats,weights,base,cap)})).sort((a,b)=>b.calc-a.calc);const basePick=select(sorted.map(x=>[x.id,x.name]),"選擇目前穿戴候選（可略過）");const results=node("div");function show(){results.replaceChildren();const compare=sorted.find(x=>x.id===basePick.value);for(const [i,x] of sorted.entries()){const c=box(results,"#"+(i+1)+" "+x.name,"屬性加權分："+x.calc.toFixed(2)+(compare?" · 相對目前："+(x.calc-compare.calc>=0?"+":"")+(x.calc-compare.calc).toFixed(2):""));add(c,node("p",Object.entries(x.stats).map(([k,v])=>k+" "+v).join(" · "),"gt-muted"),node("p",x.source),node("p",x.review||"未觸發屬性警示；非已驗證","gt-muted"),link("物品來源",x.url));}}basePick.addEventListener("change",show);add(result,field("目前穿戴",basePick),results);show();}for(const k of Object.keys(weights)){const el=inp("0","number");el.step="0.01";el.min="0";el.value=String(weights[k]);el.addEventListener("input",()=>{weights[k]=Math.max(0,Number(el.value)||0);draw();});grid.append(field(k,el));}for(const e of [slot,current,target])e.addEventListener(e===slot?"change":"input",draw);add(out,field("比較部位",slot),field("不含此部位的目前命中 (%)",current),field("自訂命中目標 (%)；依種族天賦與敵人等級",target),weightBox,node("p","武器僅比較卡片列出的通用屬性，不加入DPS或手位修正；最佳化武器組合請使用原有專精武器區。","gt-muted"),result,link("WoWSims 永恆完整戰鬥模擬（外部）","https://wowsims.com/forever/"));draw();};const p=specPicker(render);add(panel,specLabel(),out);render(p.value);}
function audit(){
 title("V15.3 · BiS 推薦總覽與資料稽核","優先顯示未觸發適用性警示的既有候選；仍保留待複核裝備。來源及證據文字完整，不等於已經外部交叉驗證或整套最佳。");
 const spec=bySpec.get(getSpec());if(!spec)return;
 const q=inp("搜尋裝備、部位、來源或物品 ID"),mode=select([["all","全部部位"],["missing","僅顯示缺資料候選"]]),out=node("div");
 const slots=[...spec.slots].map(([name,items])=>({name,items:[...items].sort((a,b)=>(a.rank||999)-(b.rank||999))}));
 const all=slots.flatMap(x=>x.items),sourceMissing=x=>!x.source||/待查|待核|未知|未確認/.test(x.source),evidenceMissing=x=>!x.evidence,missing=x=>sourceMissing(x)||evidenceMissing(x)||!!x.review;
 const populated=slots.filter(x=>x.items.length),firsts=slots.map(x=>x.items.find(i=>i.rank===1)).filter(Boolean);
 const metrics=node("div",undefined,"gt-bis-summary");
 for(const [v,label] of [[populated.length+"/"+slots.length,"已有候選部位"],[firsts.filter(x=>!missing(x)).length+"/"+slots.length,"首推有來源及證據文字"],[all.length,"候選裝備筆數"],[all.filter(evidenceMissing).length,"缺證據文字"],[all.filter(sourceMissing).length,"來源待查"],[all.filter(missing).length,"需補資料候選"]]){const c=node("div",undefined,"gt-bis-metric");add(c,node("strong",String(v)),node("small",label));metrics.append(c);}
 const progress=node("div",undefined,"gt-bis-progress"),bar=node("span");bar.style.width=(slots.length?100*firsts.filter(x=>!missing(x)).length/slots.length:0)+"%";progress.append(bar);progress.setAttribute("role","progressbar");progress.setAttribute("aria-label","首推來源及證據文字完整度");progress.setAttribute("aria-valuenow",String(Math.round(slots.length?100*firsts.filter(x=>!missing(x)).length/slots.length:0)));
 function status(x){if(x.review)return node("span","適用性待複核","gt-bis-status gt-bis-review");return node("span",sourceMissing(x)?"來源待查":evidenceMissing(x)?"待補證據":"有來源與證據文字 · 待複核","gt-bis-status "+(sourceMissing(x)?"gt-bis-missing":evidenceMissing(x)?"gt-bis-review":"gt-bis-present"));}
 function itemView(x){const c=node("div",undefined,"gt-bis-alt"),name=link((x.rank?"#"+x.rank+" ":"")+x.name,x.url);name.className="gt-bis-name";add(c,name,status(x),node("p",x.source));if(x.review)add(c,node("p",x.review,"gt-muted"));const stats=[...Object.entries(x.stats).map(([k,v])=>k+" "+v),...Object.entries(x.wm).map(([k,v])=>k+" "+v)].join(" · ");if(stats)add(c,node("p",stats,"gt-muted"));return c;}
 function evidenceView(x){const d=node("details");add(d,node("summary","來源證據與備註"),node("p",x.evidence||"未提供證據文字","gt-muted"));if(x.note)add(d,node("p",x.note,"gt-muted"));return d;}
 function draw(){out.replaceChildren();const term=q.value.trim().toLowerCase(),grid=node("div",undefined,"gt-bis-grid");let count=0;
 for(const slot of slots){const first=slot.items.find(x=>!x.review)||slot.items[0];const matches=slot.items.filter(x=>(mode.value!=="missing"||missing(x))&&[slot.name,x.name,x.source,x.id].join(" ").toLowerCase().includes(term));if(!matches.length&&(slot.items.length||term))continue;count++;
 const c=node("article",undefined,"gt-bis-slot");c.append(node("h4",slot.name));if(!first){c.append(node("span","尚無候選","gt-bis-status gt-bis-missing"));grid.append(c);continue;}
 const featured=matches.includes(first)?first:matches[0];c.append(node("small",featured.review?"適用性待複核 · 原順位 "+featured.rank:featured.rank===1?"原排名首推":(featured.rank?"符合條件的候選 #"+featured.rank:"候選順位未標示"),"gt-muted"));add(c,itemView(featured),evidenceView(featured));const alternatives=matches.filter(x=>x!==featured);if(alternatives.length){const d=node("details");d.append(node("summary","展開其他候選（"+alternatives.length+"）"));for(const x of alternatives)add(d,itemView(x),evidenceView(x));c.append(d);}grid.append(c);}
 add(out,node("p","顯示 "+count+" / "+slots.length+" 個已列部位","gt-muted"),grid);if(!count)out.append(node("p","沒有符合條件的候選。"));}
 q.addEventListener("input",draw);mode.addEventListener("change",draw);add(panel,specLabel(),metrics,progress,node("p","完整度僅統計本站已列部位及文字資料；不表示裝備已驗證。","gt-muted"),field("篩選",mode),field("搜尋",q),out);draw();
}
const renderers={audit,v8:guide,v9:drops,v10:checklist,v11:raid,v12:hotfix,v13:material,v14:optimizer};
function show(key){active=key;for(const b of $$("button",nav)){b.setAttribute("aria-pressed",String(b.dataset.tab===key));}try{if(["v8","v9","v10","v14","audit"].includes(key)&&!getSpec()){panel.replaceChildren(node("p","請先在上方選擇職業與專精，即可查看對應資料。","gt-muted"));return;}renderers[key]();}catch(e){panel.replaceChildren(node("p","此工具載入失敗，原有職業裝備區仍可使用。"));console.error(e);}}
const dashboardMeta={v8:["⚔️","天賦與實戰技巧"],v9:["🔎","首領與裝備來源"],v10:["📋","個人裝備清單"],v11:["🛡️","開荒前置準備"],v12:["📜","官方更新摘要"],v13:["🧪","附魔與消耗品"],v14:["⚖️","比較候選裝備"],audit:["✅","檢查來源與證據"]};
for(const [key,label] of tabs){const b=button(label,()=>show(key));b.dataset.tab=key;const [symbol,desc]=dashboardMeta[key];const pict=node("span",symbol,"gt-icon");pict.setAttribute("aria-hidden","true");b.replaceChildren(pict,node("span",label),node("span",desc,"gt-desc"));nav.append(b);}
const toolboxDetails=root.closest("details");
const mainSpec=$("#spec-select");
if(toolboxDetails&&mainSpec){
 let picker=mainSpec.parentElement;
 while(picker&&picker.parentElement&&picker.parentElement!==toolboxDetails.parentElement&&!picker.parentElement.contains(toolboxDetails))picker=picker.parentElement;
 if(picker&&picker.parentElement===toolboxDetails.parentElement&&picker!==toolboxDetails&&!picker.contains(root)&&picker.querySelectorAll("select").length>=2&&!picker.querySelector("section.spec")){
  const group=node("div",undefined,"gt-unified");
  picker.before(group);group.append(picker,root);
  toolboxDetails.hidden=true;
  if(toolboxDetails.id){const alias=node("span");alias.id=toolboxDetails.id;toolboxDetails.removeAttribute("id");group.prepend(alias);}
 }else{toolboxDetails.open=true;root.classList.add("gt-flat");const summary=toolboxDetails.querySelector("summary");if(summary)summary.style.display="none";}
}else{root.classList.add("gt-flat");}

const syncSpec=()=>{if(["v8","v9","v10","v14","audit"].includes(active))show(active);};
mainSpec?.addEventListener("change",syncSpec);
const selectorGroup=mainSpec?.closest(".gt-unified")||mainSpec?.parentElement?.parentElement;
selectorGroup?.addEventListener("change",e=>{if(e.target!==mainSpec&&e.target.tagName==="SELECT"&&!root.contains(e.target))queueMicrotask(syncSpec);});

})();