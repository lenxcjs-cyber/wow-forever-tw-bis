"use strict";
const DATA_URL="https://zephras.com/data/forever/enUS/talents/1.60.1.71139.json";
const CLASSES=["warrior","paladin","hunter","rogue","priest","shaman","mage","warlock","druid"];
const NAMES=["戰士","聖騎士","獵人","盜賊","牧師","薩滿","法師","術士","德魯伊"];
const TREE_NAMES=[["武器","狂怒","防護"],["神聖","防護","懲戒"],["野獸控制","射擊","生存"],["刺殺","戰鬥","敏銳"],["戒律","神聖","暗影"],["元素","增強","恢復"],["秘法","火焰","冰霜"],["痛苦","惡魔學識","毀滅"],["平衡","野性戰鬥","恢復"]];
const LEVEL={
 warrior:{name:"武器雙手練等",main:0,second:1,play:"用高傷害雙手武器，衝鋒起手、撕裂與壓制，配合怒氣管理；一次拉少量敵人，保留防禦技能。",priority:["Improved Rend","Improved Heroic Strike","Improved Charge","Improved Overpower","Anger Management","Deep Wounds","Two-Handed Weapon Specialization","Impale","Mortal Strike","Weaponmaster","Cruelty","Lingering Rage","Enrage","Blood Craze"]},
 paladin:{name:"懲戒雙手練等",main:2,second:0,play:"維持合適聖印、審判及近戰技能；保留法力治療自己，利用移動速度縮短任務間的跑圖時間。",priority:["Benediction","Conviction","Improved Judgement","Sanctified Judgement","Seal of Command","Pursuit of Justice","Two-Handed Weapon Specialization","Vengeance","Champion of the Light","Unsealed Wrath","Divine Strength","Improved Seals","Reverence"]},
 hunter:{name:"獸王寵物練等",main:0,second:1,play:"讓寵物先建立仇恨，保持遠程距離；使用射擊、毒蛇釘刺及治療寵物，避免因過度消耗法力而中斷練等。",priority:["Deadly Aspects","Endurance Training","Focused Fire","Bestial Swiftness","Unleashed Fury","Ferocity","Intimidation","Bestial Discipline","Frenzy","Bestial Wrath","Lethal Attacks","Efficiency","Mortal Shots"]},
 rogue:{name:"戰鬥雙持練等",main:1,second:0,play:"以穩定正面近戰為主，維持切割，利用邪惡攻擊累積連擊點；危急時使用閃避、致盲或消失。",priority:["Efficient Strikes","Coup de Grace","Precision","Deflection","Riposte","Endurance","Aggression","Dual Wield Specialization","Blade Flurry","Adrenaline Rush","Malice","Ruthlessness","Improved Slice and Dice","Relentless Strikes"]},
 priest:{name:"暗影續航練等",main:2,second:0,play:"低等級以魔杖收尾、節省法力；使用暗言術、心靈震爆與精神鞭笞，按需要套盾及自療。",priority:["Spirit Tap","Improved Shadow Word: Pain","Shadow Focus","Improved Mind Blast","Mind Flay","Shadow Reach","Improved Mind Flay","Vampiric Embrace","Shadow Weaving","Darkness","Shadowform","Wand Specialization","Twin Disciplines","Meditation"]},
 shaman:{name:"增強近戰練等",main:1,second:2,play:"武器附魔與近戰為主，利用震擊、圖騰及治療；幽魂之狼方便移動，注意法力與圖騰消耗。",priority:["Thundering Strikes","Ancestral Knowledge","Improved Ghost Wolf","Mental Dexterity","Elemental Weapons","Shamanistic Focus","Flurry","Stormstrike","Mental Quickness","Maelstrom Weapon","Rage of the Farseer","Tidal Focus","Improved Healing Wave","Mindfulness"]},
 mage:{name:"冰霜控制練等",main:2,second:0,play:"冰霜法術減速、控制距離；使用寒冰箭與冰霜新星，避免超出自身能力的大量拉怪；利用護盾及回魔降低停機時間。",priority:["Precision","Improved Frostbolt","Ice Shards","Improved Frost Nova","Ice Lance","Arctic Reach","Shatter","Cold Snap","Fingers of Frost","Ice Barrier","Arcane Concentration","Arcane Meditation","Magic Absorption"]},
 warlock:{name:"痛苦寵物續航練等",main:0,second:1,play:"寵物承傷、腐蝕術與詛咒持續輸出，吸取生命與生命分流維持資源；避免一次拉過多怪。",priority:["Improved Corruption","Suppression","Improved Drains","Improved Life Tap","Improved Bane of Agony","Nightfall","Siphon Life","Soul Siphon","Shadow Mastery","Wrack","Demonic Embrace","Improved Voidwalker","Fel Vitality"]},
 druid:{name:"野性貓熊練等",main:1,second:2,play:"貓形態輸出、潛行與移動，遇到多怪或高傷害使用熊形態；戰鬥間用法術自療，避免不必要的變形耗魔。",priority:["Ferocity","Feral Swiftness","Sharpened Claws","Savage Fury","Shredding Attacks","Feral Charge","Predatory Strikes","Blood Frenzy","Leader of the Pack","Rend and Tear","Shifting Power","Furor","Heart of the Wild","Naturalist"]}
};
const sum=(m)=>Object.values(m).reduce((a,b)=>a+b,0);
function treeSum(cls,ranks,tree){return cls.talents.filter(t=>t.tree===tree).reduce((a,t)=>a+(ranks[t.id]||0),0);}
function deps(cls,t){return (cls.arrows||[]).filter(a=>String(a.to)===String(t.id)&&a.required!==false).map(a=>cls.talents.find(x=>String(x.id)===String(a.from))||null);}
function available(cls,t,ranks){return (ranks[t.id]||0)<t.maxRank&&treeSum(cls,ranks,t.tree)>=t.pointsInTreeRequired&&deps(cls,t).every(d=>d&&(ranks[d.id]||0)>=d.maxRank);}
function questPath(cls,plan){
 const ranks={},steps=[];
 for(let level=10;level<=60;level++){
  const mainCount=treeSum(cls,ranks,plan.main),active=mainCount<31?plan.main:plan.second;
  const candidates=cls.talents.filter(t=>available(cls,t,ranks));
  const preference=t=>{const index=plan.priority.findIndex(n=>n.toLowerCase()===t.name.toLowerCase());return (t.tree===active?10000:t.tree===plan.main?1000:0)+(index>=0?500-index*5:0)+t.row*2+(ranks[t.id]?1:0);};
  candidates.sort((a,b)=>preference(b)-preference(a)||a.id-b.id);
  const t=candidates[0];if(!t)break;
  ranks[t.id]=(ranks[t.id]||0)+1;steps.push({level,talent:t,rank:ranks[t.id]});
 }
 return steps;
}
function validateClass(cls){return !!cls&&Array.isArray(cls.talents)&&cls.talents.length>30&&Array.isArray(cls.trees)&&cls.trees.length===3&&Array.isArray(cls.arrows)&&cls.talents.every(t=>Number.isInteger(t.id)&&Number.isInteger(t.tree)&&t.tree>=0&&t.tree<=2&&Number.isInteger(t.maxRank)&&t.maxRank>0&&Number.isFinite(t.pointsInTreeRequired)&&Number.isInteger(t.column)&&Number.isInteger(t.row))&&cls.arrows.every(a=>cls.talents.some(t=>String(t.id)===String(a.from))&&cls.talents.some(t=>String(t.id)===String(a.to)));}
function mapBuild(cls,profile){
 const ranks={},issues=[];if(!profile.talents)return {ranks,issues:["此構築尚無逐項配點資料。"],complete:false};
 for(const [tree,entries] of profile.talents.entries())for(const [name,n] of Object.entries(entries)){const t=cls.talents.find(x=>x.tree===tree&&x.name.toLowerCase()===name.toLowerCase());if(!t){issues.push(name+"：新版同系找不到此天賦");continue;}ranks[t.id]=n;if(n>t.maxRank)issues.push(name+"：參考 "+n+" 點，現版上限 "+t.maxRank);}
 for(const t of cls.talents.filter(x=>ranks[x.id]>0)){const lower=cls.talents.filter(x=>x.tree===t.tree&&x.row<t.row).reduce((a,x)=>a+(ranks[x.id]||0),0);if(lower<t.pointsInTreeRequired)issues.push(t.name+"：低層點數不足");if(deps(cls,t).some(d=>!d||(ranks[d.id]||0)<d.maxRank))issues.push(t.name+"：前置天賦未滿");}
 if(sum(ranks)!==51)issues.push("新版對應總點數 "+sum(ranks)+"/51");
 return {ranks,issues,complete:!issues.length};
}
if(typeof module!=="undefined"&&module.exports)module.exports={LEVEL,questPath,validateClass,mapBuild,available};
if(typeof document!=="undefined"){
const $=id=>document.getElementById(id),el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;},add=(p,...xs)=>{p.append(...xs);return p;},link=(text,url)=>{const a=el("a",text);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a;};
const options=(e,rows,value)=>{e.replaceChildren(...rows.map(([v,t])=>new Option(t,v)));if(rows.some(x=>x[0]===value))e.value=value;};
let catalog=null,db=null,mode="build",level=10,selected=null,steps=[],ranks={};
const classSel=$("classSelect"),specSel=$("specSelect"),buildSel=$("buildSelect");
const q=new URLSearchParams(location.search);
options(classSel,CLASSES.map((x,i)=>[x,NAMES[i]]),q.get("class")||"rogue");
function getClass(){return db?.classes.find(c=>String(c.token).toLowerCase()===classSel.value);}
function getProfile(){return catalog?.profiles.find(p=>p.cls===classSel.value&&p.id===specSel.value&&p.key===buildSel.value);}
function syncSelectors(){if(!catalog)return;const profiles=catalog.profiles.filter(p=>p.cls===classSel.value);const prev=specSel.value||q.get("spec"),key=buildSel.value||q.get("build");options(specSel,[...new Map(profiles.map(p=>[p.id,p.spec])).entries()],prev);options(buildSel,profiles.filter(p=>p.id===specSel.value).map(p=>[p.key,p.label]),key);}
function purpose(t){const name=t.name,desc=(t.ranks||[]).join(" ");const reasons=[];if(/damage|critical|attack power|spell power/i.test(desc))reasons.push("傷害／爆擊：依實際技能使用比例衡量輸出收益");if(/mana|rage|energy|combo point/i.test(desc))reasons.push("資源管理：影響續航、技能施放頻率或連擊點");if(/heal|absorb|armor|health|dodge|parry|block|damage taken/i.test(desc))reasons.push("治療／生存：依實際承傷與治療需求評估");if(/movement speed|slow|root|stun|cooldown|cast time/i.test(desc))reasons.push("機動／控制／施法節奏：降低跑圖或戰鬥耗時");if(/chance to hit|hit chance/i.test(desc))reasons.push("命中：只套用原文所指的攻擊類別，勿直接當通用命中");return reasons.length?reasons.join("；"):"按此天賦原文及解鎖技能評估；本站尚未提供專屬數值權重。";}
function detail(t){selected=t.id;const d=$("detail"),n=ranks[t.id]||0;d.replaceChildren(el("h2",t.name),el("p","目前投入 "+n+"/"+t.maxRank+" ｜ 第 "+t.row+" 層，需該系 "+t.pointsInTreeRequired+" 點"),el("p",purpose(t)),el("p","用途分類為本站輔助判讀；以下為客戶端各階英文原文。","muted"));const list=el("ol",undefined,"ranklist");for(const [i,v] of (t.ranks||[]).entries()){const li=el("li",v,"detail");if(i+1===n)li.classList.add("ok");list.append(li);}d.append(list);const pre=deps(getClass(),t);if(pre.length)d.append(el("p","前置："+pre.map(x=>x?x.name+" "+x.maxRank+"/"+x.maxRank:"未知").join("、")));document.querySelectorAll(".talent").forEach(b=>b.classList.toggle("selected",b.dataset.id===String(t.id)));}
function renderTree(cls,issues){const a=$("treeArea");a.replaceChildren();for(const tree of cls.trees){const card=el("section",undefined,"tree"),grid=el("div",undefined,"talents");add(card,el("h3",TREE_NAMES[CLASSES.indexOf(classSel.value)][tree.index]+" · "+treeSum(cls,ranks,tree.index)+"點"),grid);for(const t of cls.talents.filter(x=>x.tree===tree.index)){const n=ranks[t.id]||0,b=el("button",undefined,"talent"+(n?" picked":"")+(n>t.maxRank?" invalid":""));b.type="button";b.dataset.id=t.id;b.style.gridRow=String(t.row);b.style.gridColumn=String(t.column);b.title=t.name+" "+n+"/"+t.maxRank;add(b,el("strong",n+"/"+t.maxRank),el("span",t.name));b.onclick=()=>detail(t);grid.append(b);}a.append(card);}const focus=cls.talents.find(t=>t.id===selected)||cls.talents.find(t=>ranks[t.id]>0)||cls.talents[0];if(focus)detail(focus);}
function updateURL(){const p=new URLSearchParams({class:classSel.value,mode});if(mode==="build"){p.set("spec",specSel.value);p.set("build",buildSel.value);}else p.set("level",String(level));history.replaceState(null,"","?"+p.toString());}
function sources(){const s=$("sources");s.replaceChildren(el("h2","資料來源與限制"),link("Zephras 客戶端天賦資料 1.60.1.71139",DATA_URL),el("p","天賦位置、上限與先決條件來自指定版客戶端。本站配點不是官方最佳解，也不是完整輸出模擬。","muted"),link("MMonster 各職業練等路線（外部參考）","https://mmonster.co/wow-forever/tools/talent-path"),el("p"),link("ForeverSpec 天賦計算器","https://foreverspec.com/talent-calculator/"),el("p"),link("逐項滿等構築研究來源","https://www.wofwforever.com/en/guides/wow-forever-"+classSel.value+"-level-60-talents/"));}
function render(){const cls=getClass(),p=getProfile(),o=$("overview"),l=$("levelControls"),rows=$("levelList");o.replaceChildren();$("treeArea").replaceChildren();$("detail").replaceChildren(el("h2","天賦用途"),el("p","選取天賦，查看各階效果及用途。"));l.hidden=rows.hidden=mode!=="level";$("specField").hidden=$("buildField").hidden=mode==="level";$("buildMode").setAttribute("aria-pressed",String(mode==="build"));$("levelMode").setAttribute("aria-pressed",String(mode==="level"));sources();updateURL();
 if(mode==="build"){
  if(!p){o.append(el("p","構築資料尚未載入。"));return;}
  add(o,el("h2",p.className+" · "+p.label),el("div",p.split||"配點待查","split"),el("p","玩法："+p.style),el("p","實戰手法參考："+p.rotation),el("p","裝備收益："+p.research),el("p","手法為專精共通研究與構築摘要，不代表已完整驗證的專屬循環。","muted"));
  if(!cls){o.append(el("p","客戶端天賦資料尚未載入；以下僅顯示既有逐項參考。","warn"));if(p.talents)for(const [i,t] of p.talents.entries()){const d=el("details");d.open=true;d.append(el("summary",TREE_NAMES[CLASSES.indexOf(classSel.value)][i]+" · "+sum(t)+"點"));for(const [k,n] of Object.entries(t))d.append(el("p",k+" · "+n+"點"));o.append(d);}return;}
  const m=mapBuild(cls,p);ranks=m.ranks;add(o,el("p",m.complete?"已通過格位、點數與前置條件檢查；實戰權重仍待驗證。":"尚未通過完整構築核對，請勿視為可直接照點。",m.complete?"ok":"warn"));if(m.issues.length){const d=el("details");d.open=true;d.append(el("summary","資料差異（"+m.issues.length+"）"));for(const issue of m.issues)d.append(el("p",issue,"warn"));o.append(d);}renderTree(cls,m.issues);
 }else{
  const plan=LEVEL[classSel.value];add(o,el("h2",NAMES[CLASSES.indexOf(classSel.value)]+" · "+plan.name),el("p",plan.play),el("p","1–9 級無一般天賦；10–60 級每級1點。本路線未採用傳承天賦提前解鎖、洗點或雙天賦。","muted"),el("p","本站以客戶端先決條件與野外優先序產生可行建議；非逐級實戰驗證的最快路線。","warn"));l.replaceChildren();rows.replaceChildren();
  if(!cls){add(o,el("p","尚未取得完整天賦資料，不能安全產生逐級點法。","warn"),link("查看外部逐級練等攻略","https://mmonster.co/wow-forever/tools/talent-path"));l.hidden=rows.hidden=true;return;}
  steps=questPath(cls,plan);if(steps.length!==51){o.append(el("p","只產生 "+steps.length+" 點；資料先決條件需複核。","warn"));return;}const range=el("input");range.type="range";range.min="10";range.max="60";range.value=String(level);range.className="slider";const label=el("h2"),prev=el("button","上一級"),next=el("button","下一級"),summary=el("p");const bar=el("div",undefined,"tabs");add(bar,prev,next);add(l,label,range,bar,summary);rows.append(el("h2","10–60 級逐點配法"));const list=el("div",undefined,"levelrows");rows.append(list);
  const stepButtons=[];for(const step of steps){const b=el("button",undefined,"levelrow");add(b,el("strong","Lv."+step.level),el("span",step.talent.name),el("small",step.rank+"/"+step.talent.maxRank));b.onclick=()=>{level=step.level;refresh();};list.append(b);stepButtons.push(b);}
  function refresh(){range.value=String(level);label.textContent="目前等級 "+level;prev.disabled=level===10;next.disabled=level===60;ranks={};for(const step of steps.filter(x=>x.level<=level))ranks[step.talent.id]=step.rank;const st=steps[level-10];selected=st.talent.id;summary.textContent="本級： "+st.talent.name+" "+st.rank+"/"+st.talent.maxRank+" ｜ 已投入 "+sum(ranks)+" 點";stepButtons.forEach((b,i)=>b.classList.toggle("active",i===level-10));renderTree(cls,[]);updateURL();}
  prev.onclick=()=>{level=Math.max(10,level-1);refresh();};next.onclick=()=>{level=Math.min(60,level+1);refresh();};range.oninput=()=>{level=Number(range.value);refresh();};refresh();
 }
}
async function loadJSON(url){const res=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error("HTTP "+res.status);return res.json();}
async function init(){mode=q.get("mode")==="level"?"level":"build";level=Math.max(10,Math.min(60,Number(q.get("level"))||10));classSel.onchange=()=>{selected=null;syncSelectors();render();};specSel.onchange=()=>{selected=null;syncSelectors();render();};buildSel.onchange=()=>{selected=null;render();};$("buildMode").onclick=()=>{mode="build";selected=null;render();};$("levelMode").onclick=()=>{mode="level";selected=null;render();};
 try{catalog=await loadJSON("talent-builds.json");syncSelectors();render();}catch(e){$("status").textContent="構築資料載入失敗："+e.message;}
 for(const url of ["talent-client.json",DATA_URL]){try{const d=await loadJSON(url);if(d.format!=="zephras-talents/1"||d.build!=="1.60.1.71139"||!CLASSES.every(k=>validateClass(d.classes.find(c=>c.token.toLowerCase()===k))))throw Error("資料格式或前置條件不完整");db=d;break;}catch(e){}}
 $("status").textContent=db?"客戶端資料 1.60.1.71139 已載入；舊構築將逐項核對。":"客戶端資料未載入，逐級點法暫不可用；仍可查看參考構築及外部來源。";render();
}
init();
}