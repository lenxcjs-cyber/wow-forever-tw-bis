/* 墓鐘資料庫 V22.0 beta · 2026-11-27
   Existing candidates plus external gear catalog; local build weights remain in the browser. */
(function(){
"use strict";
const $=(sel,root=document)=>root.querySelector(sel);
const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
const zhDisplay=v=>globalThis.GTLocale?.text(String(v))??String(v);
const zhItem=x=>globalThis.GTLocale?.item(x.id,x.name)||x.name;
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=zhDisplay(text);if(cls)e.className=cls;return e;};
const link=(text,url)=>{const e=node("a",text);e.href=url;e.target="_blank";e.rel="noopener noreferrer";return e;};
const add=(parent,...children)=>{parent.append(...children);return parent;};
const box=(parent,title,body)=>{const e=node("section",undefined,"gt-card");add(e,node("h4",title),node("p",body));parent.append(e);return e;};
const field=(label,input)=>add(node("label",undefined,"gt-field"),node("span",label),input);
const select=(pairs,first)=>{const e=node("select");if(first)e.add(new Option(first,""));for(const [v,t] of pairs)e.add(new Option(zhDisplay(t),v));return e;};
const inp=(placeholder,type="search")=>{const e=node("input");e.type=type;e.placeholder=placeholder;return e;};
const button=(t,fn)=>{const e=node("button",t);e.type="button";e.addEventListener("click",fn);return e;};
const text=(e,sel)=>$(sel,e)?.textContent.trim()||"";
if(typeof document.title==="string")document.title="墓鐘資料庫";
for(const h of $$("h1"))if(h.textContent.includes("墓鐘公會用資料庫"))h.textContent=h.textContent.replaceAll("墓鐘公會用資料庫","墓鐘資料庫");
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
 if((role==="physical"||role==="tank")&&keys.some(k=>spellOnly.test(k))&&!keys.some(k=>physicalUseful.test(k)||(/^spec-[78]$/.test(id)&&/智力|intellect/i.test(k))))return "法系屬性為主，未見物理或生存屬性；需核對"+(weapon?"武器DPS、攻速與特殊效果":"特殊效果");
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
   item.card=card;item.review=suitability(id,item);
   if(item.review){
    const warning=node("p","⚠ "+item.review+"；原順位暫不視為推薦。","gt-muted");
    warning.style.color="#f2c47d";card.append(warning);
    const rankEl=$(".rank",card);if(rankEl)rankEl.title="舊版順位，適用性待複核";
   }
   rows.push(item);
   if(!byItem.has(item.id))byItem.set(item.id,{...item,uses:[]});
   const row=byItem.get(item.id);row.uses.push({id,name,slot:title,type:item.type,rank:item.rank,review:item.review});
  }
  slots.set(title,rows);
 }
 bySpec.set(id,{id,name,slots,weights,sec});
}
// V15.5: skill requirements are hard gates; talent multipliers are not stat weights.
const rogueProfiles={
 "spec-1":[["twohand","雙手武器：武器專精"]],
 "spec-2":[["dual","雙持：狂怒"]],
 "spec-3":[["shield","盾牌坦克：盾牌猛擊"]],
 "spec-4":[["general","神聖：團隊治療"]],
 "spec-5":[["shield","盾牌坦克：Holy Shield／Shieldsworn"]],
 "spec-6":[["twohand","雙手武器：懲戒"]],
 "spec-7":[["pet","獸王：寵物＋遠程"]],
 "spec-8":[["lonewolf","射擊：獨行遠程"]],
 "spec-9":[["weaving","生存：雙手武器近遠穿插"],["melee","生存：純近戰（逐項配點待查）"]],
 "spec-16":[["general","元素：法術輸出"]],
 "spec-17":[["twohand","增強：雙手武器"]],
 "spec-18":[["general","恢復：團隊治療"]],
 "spec-10":[["mutilate","截肢：雙匕首"],["general","其他構築（未驗證）"]],
 "spec-11":[["general","邪惡攻擊／通用武器"],["backstab","背刺：主手匕首"]],
 "spec-12":[["backstab","背刺／伏擊：主手匕首"],["hemo","出血：非匕首亦可"]]
};
const extraProfiles={"spec-1":[["arms_raid","武器：團本不受擊變體","32/17/2","雙手武器；改配怒氣天賦","twohand"]],"spec-2":[["fury_dungeon","狂怒：五人副本","17/34/0","雙持；怒氣與範圍戰鬥","dual"],["fury_spear","狂怒：Spearing Strike 變體","18/33/0","雙持；依敵人類型","dual"]],"spec-3":[["prot_dungeon","防護：五人副本雷霆一擊","4/15/32","盾牌；多目標仇恨","shield"],["prot_defensive","防護：防禦變體","5/15/31","盾牌；生存與仇恨","shield"]],"spec-4":[["holy_defensive","神聖：防禦／命中變體","32/11/8","治療；法術命中不可通用","general"]],"spec-5":[["pal_dungeon","防護：五人副本","0/32/19","盾牌；多目標與控制","shield"]],"spec-6":[["ret_shock","懲戒：Holy Shock 混合流","23/0/28","混合傷害；獨立武器與法傷分析待補","general"],["ret_vindication","懲戒：Vindication 變體","10/8/33","雙手武器；團隊減益","twohand"]],"spec-7":[["pet_aura","獸王：已有強擊光環變體","31/20/0","寵物與遠程；Mortal Shots 調整","general"]],"spec-8":[["mm_pet","射擊：帶寵物","16/35/0","遠程與寵物；不套獨行者權重","general"],["mm_surv","射擊：生存混合","5/33/13","遠程輸出；額外生存系天賦","general"]],"spec-9":[["melee","生存：純近戰","16/10/25","以近戰技能為主；武器配置待查","general"],["weave_alt","生存：另一近遠穿插構築","15/10/26","穿插近戰與遠程；具體武器配置待查","general"]],"spec-10":[["mutilate_alt","刺殺：另一截肢構築","33/18/0","雙匕首；毒藥及連擊點","mutilate"]],"spec-11":[["venom","戰鬥：Venom 毒藥流","21/30/0","毒藥收益與武器速度；不同於深戰鬥","general"]],"spec-12":[["hemo_alt","敏銳：流血變體","14/6/31","出血與流血；精準點數不同","hemo"],["hemo_alt2","敏銳：另一流血變體","15/5/31","出血與流血；逐項待查","hemo"]],"spec-13":[["disc_renew","戒律：恢復術變體","31/20/0","護盾與恢復術；治療及吸收獨立","general"],["disc_threat","戒律：降低仇恨變體","34/17/0","護盾及治療仇恨管理","general"]],"spec-14":[["holy_17","神聖：17/34 治療變體","17/34/0","直接治療與範圍治療","general"],["holy_20","神聖：20/31 治療變體","20/31/0","治療與續航","general"]],"spec-15":[["shadow_alt","暗影：團本變體","14/3/34","暗影傷害與技能頻率","general"]],"spec-16":[["ele_raid","元素：團本智力／圖騰流","31/9/11","智力及圖騰耗魔","general"],["ele_dungeon","元素：五人副本","32/11/8","副本輸出與續航","general"],["ele_mana","元素：恢復混合","31/0/20","法力及治療支援","general"]],"spec-17":[["enh_standard","增強：標準混合流","12/35/4","雙手武器；火焰／法術比例","twohand"],["enh_aoe","增強：範圍輸出流","17/34/0","雙手武器；多目標法術","twohand"]],"spec-18":[["resto_dungeon","恢復：五人副本","0/17/34","智力轉換及機動性","general"]],"spec-19":[["arc_pure","秘法：純秘法流","38/10/3","秘法技能與法力管理","general"]],"spec-20":[["fire_frost","火法：冰火混合流","0/29/22","火焰與冰霜比例分開","general"],["fire_alt","火法：Burning Soul 變體","14/34/3","火焰施法穩定性","general"]],"spec-21":[["frost_aoe","冰法：五人副本範圍流","9/5/37","暴風雪與群體傷害","general"],["frost_single","冰法：另一單體流","14/5/32","單體技能與觸發","general"]],"spec-22":[["aff_dungeon","痛苦：五人副本暗影箭流","30/0/21","移動戰、暗影箭；非 Wrack 團本流","general"],["aff_raid_alt","痛苦：團本續航變體","37/11/3","持續傷害與生命分流","general"]],"spec-23":[["demo_shadow","惡魔：暗影流","2/31/18","犧牲小鬼、保留魅魔；暗影收益","general"]],"spec-24":[["dest_sayaad","毀滅：魅魔流","14/4/33","保留魅魔；本體與寵物分開","general"],["dest_imp","毀滅：小鬼流","14/6/31","保留小鬼；寵物收益","general"],["dest_sac_alt","毀滅：犧牲續航變體","7/11/33","犧牲惡魔；生命分流","general"]],"spec-25":[["balance_mana","平衡：法力充足變體","41/0/10","11/23 舊點法；11/25 日月蝕更新待重驗","general"]],"spec-26":[["cat_no_lotp","野性貓：隊伍已有獸群領袖","9/32/10","純貓輸出；Rend and Tear 變體","general"]],"spec-27":[["bear_deep","野性熊：深野性坦克","0/41/10","純熊生存及仇恨","general"],["bear_cat","野性熊：貓熊混合","8/33/10","同場坦克與輸出；權重獨立","general"]],"spec-28":[["tree_dungeon","恢復：五人副本","11/0/40","降低仇恨而非強化寧靜","general"]]};
const primaryExtraSplits={"spec-13":"31/20/0","spec-14":"18/33/0","spec-15":"15/3/33","spec-19":"32/16/3","spec-20":"16/32/3","spec-21":"18/0/33","spec-22":"35/11/5","spec-23":"2/31/18","spec-24":"5/11/35","spec-25":"38/0/13","spec-26":"9/32/10","spec-27":"9/32/10","spec-28":"11/0/40"};
Object.assign(rogueProfiles,{"spec-13":[["general","戒律：護盾團隊治療"]],"spec-14":[["general","神聖：團隊治療"]],"spec-15":[["general","暗影：團本輸出"]],"spec-19":[["general","秘法：秘火混合"]],"spec-20":[["general","火法：團本火焰"]],"spec-21":[["general","冰法：團本單體"]],"spec-22":[["general","痛苦：團本 Wrack 引導流"]],"spec-23":[["general","惡魔：火焰流"]],"spec-24":[["general","毀滅：犧牲惡魔"]],"spec-25":[["general","平衡：團本法力續航"]],"spec-26":[["general","野性貓：純貓輸出"]],"spec-27":[["general","野性熊：純熊坦克"]],"spec-28":[["general","恢復：團本治療"]]});
for(const [id,entries] of Object.entries(extraProfiles)){for(const [key,label] of entries){const at=rogueProfiles[id].findIndex(x=>x[0]===key);if(at>=0)rogueProfiles[id][at]=[key,label];else rogueProfiles[id].push([key,label]);}}
function variantFor(id){return extraProfiles[id]?.find(x=>x[0]===buildFor(id));}
for(const id of ["spec-26","spec-27"])rogueProfiles[id].push(["feral_onehand","單手＋持有型副手（替代比較）"]);
const buildChoice={};
try{const old=JSON.parse(localStorage.getItem("gt-build-selection-v1")||"{}");for(const [id,profiles] of Object.entries(rogueProfiles))if(profiles.some(p=>p[0]===old[id]))buildChoice[id]=old[id];}catch(e){}
const buildFor=id=>buildChoice[id]||rogueProfiles[id]?.[0][0]||"general";
function chooseBuild(id,key){if(!rogueProfiles[id]?.some(p=>p[0]===key))return;buildChoice[id]=key;try{localStorage.setItem("gt-build-selection-v1",JSON.stringify(buildChoice));}catch(e){}}
function feralSpec(id){return id==="spec-26"||id==="spec-27";}
const rawWeaponWeightKeys=["武器DPS","主手DPS","副手DPS","雙手DPS","遠程DPS"];
function effectiveGearWeights(id,weights){if(!feralSpec(id))return weights;return Object.fromEntries(Object.entries(weights||{}).filter(([key])=>!rawWeaponWeightKeys.includes(key)));}
function omittedFeralWeights(id,weights){return feralSpec(id)?rawWeaponWeightKeys.filter(k=>Number(weights?.[k])>0):[];}
function feralWeaponMode(id){return feralSpec(id)?(buildFor(id)==="feral_onehand"?"onehand":"twohand"):"";}

function isTwoHand(type){return /雙手|two.hand|法杖|長柄|staff|staves|polearm/i.test(type||"");}
function classWeaponGate(id,x){
 const n=Number(String(id).split("-")[1]),slot=String(x.slot||""),type=String(x.type||"");
 if(!/副手|盾牌|off.hand/i.test(slot))return "";
 if(/盾牌|shield/i.test(type)&&![1,2,3,4,5,6,16,17,18].includes(n))return "此職業無盾牌資格";
 if(/持有|副手物品|法器|書籍|held in off.hand|off.hand frill|盾牌|shield/i.test(type))return "";
 if(/單手|匕首|拳套|拳刃|one.hand|dagger|fist|主手限定|主手武器/i.test(type)&&!(n>=1&&n<=3||n>=7&&n<=12))return "此職業副手武器資格未成立；僅保留合法持有型副手或盾牌";
 return "";
}
function skillGate(id,x){
 const classReason=classWeaponGate(id,x);if(classReason)return classReason;
 const n=Number(String(id).split("-")[1]),armor=String(x.type||"").trim(),tier={"布甲":0,"皮甲":1,"鎖甲":2,"鎧甲":3,"板甲":3,Cloth:0,Leather:1,Mail:2,Plate:3}[armor],max=[3,3,2,1,0,2,0,0,1][Math.min(8,Math.floor((n-1)/3))];
 if(tier!==undefined&&max!==undefined&&tier>max)return "超出職業可穿護甲等級";
 const build=variantFor(id)?.[4]||buildFor(id),slot=x.slot||"",type=x.type||"";
 if(feralSpec(id)&&!/遠程|遠距|聖物|塑像|relic|idol|ranged/i.test(slot+" "+type)){
  const mode=feralWeaponMode(id),off=/副手|盾牌|off.hand/i.test(slot),main=/主手|單手|雙手|近戰|武器|main.hand|weapon/i.test(slot)&&!off;
  const two=/雙手|two.hand|法杖|長柄|staff|staves|polearm/i.test(type),one=/單手|one.hand|匕首|dagger|拳套|拳刃|fist/i.test(type);
  const held=/持有|副手物品|法器|書籍|held in off.hand|off.hand frill/i.test(type);
  if(off){if(mode==="twohand")return "野性雙手構築不裝副手";if(!held||/盾牌|shield|匕首|dagger|拳套|拳刃|fist|單手|one.hand/i.test(type))return "野性不雙持、不裝盾牌；僅比較持有型副手";return "";}
  if(main||two||one){if(/劍|斧|sword|axe|盾牌|shield/i.test(type))return "德魯伊武器資格不符";if(mode==="twohand"&&!two)return "野性預設雙手武器構築；單手請切換替代比較";if(mode==="onehand"&&(two||!one))return "單手替代比較需合法單手主武器";return "";}
 }
 const off=/副手|盾牌|off.hand/i.test(slot);
 const ranged=/遠程|遠距|魔杖|聖物|塑像|圖騰|聖契|ranged|relic/i.test(slot);
 const main=/主手|單手|雙手|近戰|^武器$|main.hand/i.test(slot)&&!off&&!ranged;
 const shield=/盾牌|shield/i;
 if(off&&(isTwoHand(type)||/主手限定|主手武器|main.hand/i.test(type)))return "副手不能使用雙手或主手限定武器";
 if(main&&shield.test(type))return "盾牌不能作主手武器";
 if(build==="dual"&&off&&(shield.test(type)||/持有|副手物品|off.hand frill|held in off.hand|法器|書籍/i.test(type)))return "雙持構築的副手需為近戰武器，不能使用盾牌或施法副手";
 if(build==="shield"&&off&&!shield.test(type))return "此盾坦構築要求盾牌；非盾牌或類型未確認";
 if((build==="shield"||build==="dual")&&isTwoHand(type))return "此構築不使用雙手武器";
 if(["twohand","weaving"].includes(build)&&off)return "雙手武器構築不使用副手";
 if(["twohand","weaving"].includes(build)&&main&&!isTwoHand(type))return "雙手武器構築要求雙手武器；類型未確認";
 if(!((main&&["backstab","mutilate"].includes(build))||(off&&build==="mutilate")))return "";
 if(/匕首|dagger/i.test(type))return "";
 return "核心技能要求匕首；目前物品類型「"+(type||"未標示")+"」不符合或尚未確認";
}
function allowed(id,x){return !skillGate(id,x);}
function syncWeaponCards(id){
 const spec=bySpec.get(id);if(!spec)return;
 for(const slot of spec.slots.values())for(const x of slot){
  const card=x.card;if(!card)continue;
  const reason=skillGate(id,x);let msg=$(".gt-build-warning",card);
  if(reason){if(!msg){msg=node("p",undefined,"gt-build-warning");card.append(msg);}msg.textContent=reason;msg.style.color="#f2c47d";}
  else if(msg)msg.remove();
  if(reason){if(!card.dataset.gtBuildHidden){card.dataset.gtBuildDisplay=card.style.getPropertyValue("display");card.dataset.gtBuildPriority=card.style.getPropertyPriority("display");card.dataset.gtBuildWasHidden=String(card.hidden);}card.style.setProperty("display","none","important");card.hidden=true;card.dataset.gtBuildHidden="1";}
  else if(card.dataset.gtBuildHidden){if(card.dataset.gtBuildDisplay)card.style.setProperty("display",card.dataset.gtBuildDisplay,card.dataset.gtBuildPriority);else card.style.removeProperty("display");card.hidden=card.dataset.gtBuildWasHidden==="true";for(const k of ["gtBuildHidden","gtBuildDisplay","gtBuildPriority","gtBuildWasHidden"])delete card.dataset[k];}
 }
}
const talentResearch=[["武器傷害與怒氣","致死打擊、武器專精、斬殺","依武器類型及技能頻率測量傷害；不可只用白字DPS比較。"],["雙持傷害與怒氣","嗜血、亂舞、雙持專精","主副手DPS分開，白字與技能命中分開；攻速影響怒氣及觸發。"],["仇恨與承傷","盾牌猛擊、復仇、盾牌格擋","盾牌構築須有盾牌；仇恨與有效生命分開評估，法傷不當作物理仇恨權重。"],["有效治療與續航","聖光術、聖光閃現、治療爆擊","以有效治療及耗魔比較，扣除溢補。"],["法術仇恨與生存","正義之怒、奉獻、審判","按實際法術係數和盾牌防禦評估；不可套用防戰權重。"],["混合傷害","聖印、審判、近戰技能","物理及法術貢獻分開，武器速度依聖印構築評估。"],["本體與寵物傷害","寵物增益、自動射擊","量測寵物繼承與存活率；遠程DPS與近戰武器DPS分開。"],["遠程傷害","自動射擊、瞄準射擊、多重射擊","遠程攻速與射擊時序影響輸出，近戰武器主要看適用屬性。"],["構築分流","近戰或遠程技能","先確認實際使用技能，再選對應武器與權重。"],["雙匕首與毒藥","截肢、毒藥、終結技","主副手武器資格先檢查，分開計算毒藥觸發及能量收益。"],["雙持與能量","邪惡攻擊、切割、武器專精","武器專精及主副手速度影響收益；白字命中不等於技能命中。"],["匕首或出血構築","背刺、伏擊、出血","先確認主手資格，按實際技能使用頻率計算武器傷害收益。"],["吸收與治療","護盾、直接治療","吸收量與有效治療分開，勿假定治療加成等比例增加護盾。"],["有效治療","直接治療、群體治療","依團隊傷害及溢補計算治療與回魔的邊際價值。"],["暗影法術","持續傷害、心靈震爆、精神鞭笞","命中及各技能可爆擊條件分開核對。"],["自然法術","閃電箭、閃電鏈、圖騰","按單體及多目標技能比例、施法時間與法力計算。"],["武器與混合傷害","風怒、近戰技能、法術觸發","武器DPS與速度、法術傷害依實際觸發與構築分開。"],["治療與續航","治療鏈、直接治療、圖騰","按跳躍有效治療及戰鬥長度計算治療與回魔。"],["秘法傷害與法力","秘法主力技能、法力管理","短戰與長戰不同，智力及回魔效益依戰鬥時間計算。"],["火焰傷害","火焰直傷、爆擊觸發","核對爆擊觸發及持續效果，不直接套用經典係數。"],["冰霜傷害","冰霜主力法術、觸發","首領免疫控制與觸發條件分開，不假設目標可凍結。"],["持續傷害","詛咒、持續法術、生命分流","依覆蓋率、跳數及生命分流成本評估法傷與續航。"],["寵物與法術","惡魔增益、本體法術","寵物繼承、攻擊頻率及存活率納入評估。"],["直擊法術","火焰及暗影直傷","依構築分開傷害學派、命中、爆擊與施法時間。"],["日月蝕與法術","憤怒、星火術、日月蝕","依11/25後機制重新估算不同法術比例及爆擊收益。"],["能量與形態","貓形態、連擊點、持續傷害","武器面板速度不等於形態攻速；核對形態武器DPS轉換。"],["承傷與形態","熊形態、怒氣、仇恨","護甲與耐力的生存收益分開；核對形態武器DPS轉換。"],["持續治療","回春、癒合、直接治療","按有效跳數、溢補及法力消耗評估權重。"]];
const rogueTalentBuilds={"spec-10":[{"Malice":5,"Ruthlessness":3,"Improved Slice and Dice":3,"Vigor":1,"Blood Splatter":1,"Lethality":2,"Vile Poisons":3,"Cold Blood":1,"Improved Poisons":2,"Relentless Strikes":5,"Venom":1,"Seal Fate":3,"Mutilate":1},{"Coup de Grace":3,"Efficient Strikes":2,"Puncturing Wounds":3,"Precision":3,"Endurance":2,"Composure":2,"Flawless Execution":1,"Aggression":3},{"Opportunity":1}],"spec-11":[{"Malice":5,"Ruthlessness":3,"Improved Expose Armor":2,"Improved Slice and Dice":3,"Lethality":2,"Cold Blood":1},{"Coup de Grace":3,"Efficient Strikes":2,"Deflection":1,"Precision":3,"Improved Sprint":2,"Endurance":2,"Composure":2,"Flawless Execution":1,"Weapon Expertise":2,"Aggression":3,"Dual Wield Specialization":2,"Blade Flurry":1,"Hack and Slash":5,"Flash of Steel":5,"Adrenaline Rush":1},{}],"spec-12":[{"Malice":5,"Ruthlessness":3,"Improved Slice and Dice":3,"Blood Splatter":1},{"Coup de Grace":3,"Efficient Strikes":2,"Precision":3},{"Setup":3,"Opportunity":5,"Dirty Deeds":2,"Camouflage":3,"Initiative":3,"Premeditation":1,"Serrated Blades":3,"Elusiveness":2,"Ghostly Strike":1,"Preparation":1,"Hemorrhage":1,"Boot Knife":5,"Death Mark":1}]};
const plateTalentBuilds={"spec-1":[{"Improved Heroic Strike":3,"Improved Rend":3,"Improved Tactical Mastery":3,"Improved Overpower":2,"Anger Management":1,"Deep Wounds":3,"Spearing Strike":1,"Two-Handed Weapon Specialization":3,"Impale":2,"Bloodthrill":2,"Sweeping Strikes":1,"Weaponmaster":5,"Improved Slam":2,"Mortal Strike":1},{"Cruelty":5,"Lingering Rage":5,"Enrage":5,"Improved Execute":2},{"Improved Bloodrage":2}],"spec-2":[{"Improved Heroic Strike":3,"Improved Rend":3,"Improved Tactical Mastery":3,"Improved Overpower":2,"Anger Management":1,"Deep Wounds":3,"Impale":2},{"Cruelty":5,"Unbridled Wrath":5,"Furious Precision":3,"Enrage":4,"Dual Wield Specialization":5,"Reckless Swings":1,"Improved Execute":2,"Improved Berserker Rage":2,"Death Wish":1,"Improved Whirlwind":2,"Flurry":3,"Bloodthirst":1},{}],"spec-3":[{"Deflection":4},{"Cruelty":5,"Unbridled Wrath":5,"Enrage":5},{"Shield Specialization":5,"Anticipation":5,"Improved Revenge":3,"Last Stand":1,"Master of Defense":2,"Defiance":3,"Vanguard":1,"Improved Shield Wall":2,"Concussion Blow":1,"Focused Rage":3,"Bastion":5,"Shield Slam":1}],"spec-4":[{"Spiritual Focus":5,"Healing Light":3,"Reverence":2,"Purifying Power":2,"Divine Favor":1,"Illumination":5,"Divine Precision":2,"Infusion of Light":2,"Oath of Light":1,"Holy Shock":1,"Boundless Light":2,"Holy Power":5,"Light's Vigil":1},{"Divine Intellect":5,"Guardian's Favor":2},{"Benediction":5,"Improved Judgement":2,"Conviction":3,"Pursuit of Justice":2}],"spec-5":[{},{"Redoubt":5,"Precision":3,"Sacred Duty":2,"Templar's Bulwark":1,"Shield Specialization":2,"Toughness":3,"Swift Judgement":1,"Improved Righteous Fury":3,"Anticipation":5,"Holy Shield":1,"Reckoning":5,"Iron Creed":3,"Shieldsworn":1},{"Deflection":5,"Improved Judgement":2,"Conviction":3,"Sanctified Judgement":3,"Pursuit of Justice":2,"Sacred Arbiter":1}],"spec-6":[{"Divine Strength":5,"Improved Seals":5,"Holy Conduit":2},{"Divine Intellect":5,"Precision":3},{"Benediction":5,"Improved Judgement":2,"Conviction":3,"Sanctified Judgement":3,"Unyielding Faith":1,"Seal of Command":1,"Pursuit of Justice":2,"Sacred Arbiter":1,"Two-Handed Weapon Specialization":3,"Repentance":1,"Vengeance":3,"Champion of the Light":5,"Unsealed Wrath":1}]};
const hunterShamanTalentBuilds={"spec-7":[{"Deadly Aspects":5,"Endurance Training":3,"Focused Fire":2,"Bestial Swiftness":1,"Unleashed Fury":5,"Ferocity":5,"Summon Hawk":1,"Intimidation":1,"Bestial Discipline":2,"Frenzy":5,"Bestial Wrath":1},{"Lethal Attacks":5,"Improved Stings":3,"Careful Aim":5,"Rapid Killing":2,"Trueshot Aura":1,"Mortal Shots":4},{}],"spec-8":[{"Deadly Aspects":5},{"Lethal Attacks":5,"Improved Stings":3,"Efficiency":5,"Careful Aim":5,"Rapid Killing":2,"Improved Arcane Shot":5,"Lone Wolf":1,"Trueshot Aura":1,"Mortal Shots":5,"Rapid Recuperation":2,"Barrage":1,"Ranged Weapon Specialization":5,"Sniper Shot":1},{"Improved Tracking":5}],"spec-9":[{},{"Lethal Attacks":5,"Improved Stings":3,"Careful Aim":5,"Improved Arcane Shot":1,"Lone Wolf":1,"Trueshot Aura":1,"Mortal Shots":4},{"Improved Tracking":5,"Savage Strikes":2,"Survivalist":3,"Clever Traps":2,"Surefooted":3,"Predator's Edge":5,"Resourcefulness":2,"Expose Prey":2,"Strider Kick":1,"Lightning Reflexes":5,"Lacerating Strikes":1}],"spec-16":[{"Convection":5,"Concussion":5,"Elemental Alacrity":3,"Call of Flame":3,"Elemental Focus":1,"Trial by Fire":2,"Eye of the Storm":3,"Earthbound":1,"Elemental Reach":2,"Call of Thunder":1,"Lightning Overload":3,"Elemental Fury":5,"Lightning Mastery":1},{"Thundering Strikes":5},{"Tidal Focus":5,"Mindfulness":3,"Natural Grace":2,"Water Shield":1}],"spec-17":[{"Concussion":5,"Elemental Devastation":3},{"Thundering Strikes":5,"Ancestral Knowledge":5,"Mental Dexterity":3,"Elemental Weapons":3,"Shamanistic Focus":1,"Anticipation":3,"Flurry":5,"Stormstrike":1,"Improved Ghost Wolf":2,"Spirit Weapons":1,"Mental Quickness":2,"Improved Stormstrike":2,"Maelstrom Weapon":5,"Rage of the Farseer":1},{"Tidal Focus":4}],"spec-18":[{},{"Thundering Strikes":5,"Ancestral Knowledge":5},{"Improved Healing Wave":5,"Tidal Focus":5,"Mindfulness":3,"Ancestral Healing":3,"Healing Focus":3,"Water Shield":1,"Tidal Mastery":5,"Restorative Totems":5,"Mana Tide Totem":1,"Healing Way":3,"Nature's Swiftness":1,"Purification":5,"Riptide":1}]};
const casterFeralTalentBuilds={"spec-13":[{"Twin Disciplines":5,"Mental Strength":5,"Mental Agility":3,"Inner Focus":1,"Improved Power Word: Shield":3,"Meditation":3,"Soul Warding":1,"Penance":1,"Renewed Hope":5,"Divine Aegis":3,"Power Infusion":1},{"Twilight Focus":3,"Holy Specialization":5,"Divine Fury":5,"Inspiration":3,"Improved Healing":3,"Holy Binding":1},{}],"spec-14":[{"Twin Disciplines":5,"Mental Strength":5,"Inner Focus":1,"Improved Power Word: Shield":3,"Meditation":3,"Soul Warding":1},{"Improved Renew":3,"Holy Specialization":5,"Divine Fury":5,"Holy Nova":1,"Inspiration":3,"Improved Healing":3,"Holy Binding":1,"Litany of Light":2,"Spirit of Redemption":1,"Spiritual Guidance":5,"Spiritual Healing":3,"Prayer of Mending":1},{}],"spec-15":[{"Twin Disciplines":5,"Silent Resolve":3,"Mental Strength":4,"Meditation":3},{"Twilight Focus":3},{"Shadow Focus":5,"Improved Mind Blast":4,"Improved Shadow Word: Pain":2,"Shadow Reach":1,"Mind Flay":1,"Improved Mind Flay":2,"Dark Inspiration":5,"Vampiric Embrace":1,"Shadow Weaving":3,"Silence":1,"Devouring Contagion":2,"Darkness":5,"Shadowform":1}],"spec-19":[{"Improved Channeling":5,"Arcane Subtlety":2,"Arcane Concentration":5,"Missile Barrage":2,"Arcane Impact":3,"Arcane Blast":1,"Arcane Meditation":3,"Arcane Wrath":1,"Presence of Mind":1,"Arcane Mind":5,"Arcane Instability":3,"Arcane Power":1},{"Incineration":5,"Accelerant":2,"Ignite":5,"Pyroblast":1,"Improved Fire Blast":2,"Heating Up":1},{"Precision":3}],"spec-20":[{"Improved Channeling":5,"Arcane Subtlety":2,"Arcane Concentration":5,"Missile Barrage":2,"Arcane Blast":1,"Arcane Meditation":1},{"Incineration":5,"Accelerant":5,"Ignite":5,"Pyroblast":1,"Improved Fire Blast":2,"Improved Scorch":3,"Heating Up":1,"Master of Elements":3,"Critical Mass":3,"Fire Power":3,"Combustion":1},{"Precision":3}],"spec-21":[{"Wand Specialization":2,"Arcane Resilience":3,"Arcane Subtlety":2,"Magic Absorption":2,"Arcane Concentration":5,"Arcane Geometry":1,"Arcane Meditation":3},{},{"Improved Frostbolt":5,"Precision":3,"Ice Shards":5,"Improved Blizzard":1,"Ice Lance":1,"Arctic Reach":2,"Ice Block":1,"Shatter":3,"Improved Cone of Cold":3,"Cold Snap":1,"Fingers of Frost":2,"Winter's Chill":5,"Ice Barrier":1}],"spec-22":[{"Suppression":5,"Improved Corruption":5,"Improved Drains":3,"Improved Bane of Agony":2,"Pandemic":3,"Malevolence":5,"Nightfall":2,"Siphon Life":1,"Soul Siphon":3,"Shadow Mastery":5,"Wrack":1},{"Demonic Embrace":5,"Demonic Aegis":2,"Fel Vitality":3,"Demonic Sacrifice":1},{"Improved Shadow Bolt":5}],"spec-23":[{"Suppression":1,"Improved Corruption":1},{"Improved Imp":3,"Unholy Power":5,"Fel Vitality":3,"Demonic Energies":2,"Demonic Sacrifice":1,"Master Summoner":2,"Decimation":2,"Demonic Brand":3,"Soul Link":1,"Demonic Knowledge":3,"Master Demonologist":5,"Demonic Pact":1},{"Bane":5,"Aftermath":5,"Ruin":5,"Agonizing Flames":3}],"spec-24":[{"Suppression":5},{"Demonic Embrace":5,"Demonic Aegis":2,"Fel Vitality":3,"Demonic Sacrifice":1},{"Destructive Reach":2,"Bane":5,"Cataclysm":3,"Aftermath":5,"Ruin":5,"Shadowburn":1,"Agonizing Flames":3,"Conflagrate":1,"Bane of Havoc":1,"Fire and Brimstone":3,"Shadow and Flame":5,"Incinerate":1}],"spec-26":[{"Genesis":5,"Nature's Majesty":2,"Nature's Reach":2},{"Ferocity":5,"Furor":3,"Feral Swiftness":2,"Shredding Attacks":3,"Savage Fury":2,"Feral Charge":1,"Sharpened Claws":2,"Predatory Strikes":3,"Predatory Discipline":1,"Blood Frenzy":2,"Leader of the Pack":1,"Natural Instinct":2,"Rend and Tear":4,"Shifting Power":1},{"Heart of the Wild":5,"Naturalist":5}],"spec-27":[{"Genesis":5,"Nature's Majesty":2,"Nature's Reach":2},{"Ferocity":5,"Feral Swiftness":2,"Feral Instinct":3,"Thick Hide":3,"Savage Fury":2,"Feral Charge":1,"Sharpened Claws":2,"Predatory Strikes":3,"Lacerate":1,"Blood Frenzy":1,"Leader of the Pack":1,"Natural Instinct":2,"Rend and Tear":5,"Primal Bite":1},{"Heart of the Wild":5,"Naturalist":5}],"spec-28":[{"Genesis":5,"Moonglow":3,"Nature's Majesty":2,"Nature's Splendor":1},{},{"Nature's Focus":5,"Heart of the Wild":5,"Naturalist":5,"Reflection":3,"Gift of Nature":5,"Bloom":1,"Improved Rejuvenation":3,"Swiftmend":1,"Nature's Swiftness":1,"Living Spirit":3,"Improved Tranquility":2,"Improved Regrowth":5,"Wild Growth":1}]};
const variantTalentBuilds={"spec-2:fury_dungeon":[{"Improved Heroic Strike":3,"Improved Rend":3,"Improved Tactical Mastery":3,"Improved Overpower":2,"Anger Management":1,"Deep Wounds":3,"Impale":2},{"Cruelty":5,"Unbridled Wrath":5,"Furious Precision":3,"Enrage":5,"Dual Wield Specialization":5,"Reckless Swings":1,"Improved Execute":2,"Death Wish":1,"Improved Whirlwind":2,"Flurry":3,"Bloodthirst":1,"Lingering Rage":1},{}],"spec-3:prot_dungeon":[{"Deflection":4},{"Cruelty":5,"Unbridled Wrath":5,"Enrage":5},{"Shield Specialization":5,"Anticipation":2,"Improved Revenge":3,"Last Stand":1,"Master of Defense":2,"Defiance":3,"Vanguard":1,"Improved Shield Wall":2,"Concussion Blow":1,"Focused Rage":3,"Bastion":5,"Shield Slam":1,"Improved Thunder Clap":3}],"spec-3:prot_defensive":[{"Deflection":5},{"Cruelty":5,"Unbridled Wrath":5,"Enrage":5},{"Shield Specialization":5,"Anticipation":5,"Improved Revenge":3,"Last Stand":1,"Master of Defense":2,"Defiance":3,"Vanguard":1,"Concussion Blow":1,"Focused Rage":3,"Bastion":5,"Shield Slam":1,"Improved Thunder Clap":1}],"spec-5:pal_dungeon":[{},{"Redoubt":5,"Precision":3,"Sacred Duty":2,"Templar's Bulwark":1,"Shield Specialization":2,"Toughness":3,"Swift Judgement":1,"Improved Righteous Fury":3,"Holy Shield":1,"Reckoning":5,"Iron Creed":3,"Shieldsworn":1,"Guardian's Favor":2},{"Deflection":5,"Improved Judgement":2,"Conviction":3,"Sanctified Judgement":3,"Pursuit of Justice":2,"Sacred Arbiter":1,"Vindication":3}],"spec-7:pet_aura":[{"Deadly Aspects":5,"Endurance Training":3,"Focused Fire":2,"Bestial Swiftness":1,"Unleashed Fury":5,"Ferocity":5,"Summon Hawk":1,"Intimidation":1,"Bestial Discipline":2,"Frenzy":5,"Bestial Wrath":1},{"Lethal Attacks":5,"Improved Stings":3,"Careful Aim":5,"Rapid Killing":2,"Mortal Shots":5},{}],"spec-11:venom":[{"Malice":5,"Ruthlessness":3,"Improved Expose Armor":2,"Improved Slice and Dice":3,"Lethality":2,"Cold Blood":1,"Vile Poisons":4,"Venom":1},{"Coup de Grace":3,"Efficient Strikes":2,"Deflection":1,"Precision":3,"Improved Sprint":2,"Endurance":2,"Composure":2,"Flawless Execution":1,"Weapon Expertise":2,"Aggression":3,"Dual Wield Specialization":2,"Blade Flurry":1,"Hack and Slash":1,"Flash of Steel":5},{}],"spec-12:hemo_alt":[{"Malice":5,"Ruthlessness":3,"Improved Slice and Dice":3,"Blood Splatter":1,"Lethality":2},{"Coup de Grace":3,"Efficient Strikes":2,"Precision":1},{"Opportunity":5,"Dirty Deeds":2,"Camouflage":3,"Initiative":3,"Premeditation":1,"Serrated Blades":3,"Elusiveness":2,"Ghostly Strike":1,"Preparation":1,"Hemorrhage":1,"Boot Knife":5,"Death Mark":1,"Master of Deception":3}],"spec-13:disc_renew":[{"Twin Disciplines":5,"Mental Strength":5,"Mental Agility":3,"Inner Focus":1,"Improved Power Word: Shield":3,"Meditation":3,"Soul Warding":1,"Penance":1,"Renewed Hope":5,"Divine Aegis":3,"Power Infusion":1},{"Holy Specialization":5,"Divine Fury":5,"Inspiration":3,"Improved Healing":3,"Holy Binding":1,"Improved Renew":3},{}],"spec-16:ele_raid":[{"Convection":5,"Concussion":5,"Elemental Alacrity":3,"Call of Flame":3,"Elemental Focus":1,"Trial by Fire":1,"Eye of the Storm":3,"Call of Thunder":1,"Lightning Overload":3,"Elemental Fury":5,"Lightning Mastery":1},{"Thundering Strikes":5,"Ancestral Knowledge":4},{"Tidal Focus":5,"Mindfulness":3,"Water Shield":1,"Totemic Focus":2}],"spec-17:enh_standard":[{"Concussion":5,"Elemental Devastation":3,"Call of Flame":3,"Elemental Focus":1},{"Thundering Strikes":5,"Ancestral Knowledge":4,"Mental Dexterity":3,"Elemental Weapons":3,"Shamanistic Focus":1,"Flurry":5,"Stormstrike":1,"Improved Ghost Wolf":2,"Spirit Weapons":1,"Mental Quickness":2,"Improved Stormstrike":2,"Maelstrom Weapon":5,"Rage of the Farseer":1},{"Tidal Focus":4}],"spec-18:resto_dungeon":[{},{"Thundering Strikes":5,"Ancestral Knowledge":5,"Mental Dexterity":3,"Guardian Totems":2,"Improved Ghost Wolf":2},{"Improved Healing Wave":5,"Tidal Focus":3,"Mindfulness":3,"Ancestral Healing":3,"Healing Focus":3,"Water Shield":1,"Tidal Mastery":5,"Mana Tide Totem":1,"Healing Way":3,"Nature's Swiftness":1,"Purification":5,"Riptide":1}],"spec-19:arc_pure":[{"Improved Channeling":5,"Arcane Subtlety":2,"Arcane Concentration":5,"Missile Barrage":2,"Arcane Impact":3,"Arcane Blast":1,"Arcane Meditation":3,"Arcane Wrath":1,"Presence of Mind":1,"Arcane Mind":5,"Arcane Instability":3,"Arcane Power":1,"Wand Specialization":2,"Arcane Geometry":2,"Improved Counterspell":2},{"Incineration":5,"Accelerant":5},{"Precision":3}],"spec-20:fire_alt":[{"Improved Channeling":5,"Arcane Subtlety":2,"Arcane Concentration":5,"Missile Barrage":2},{"Incineration":5,"Accelerant":5,"Ignite":5,"Pyroblast":1,"Improved Fire Blast":2,"Improved Scorch":3,"Heating Up":1,"Master of Elements":3,"Critical Mass":3,"Fire Power":3,"Combustion":1,"Burning Soul":2},{"Precision":3}],"spec-22:aff_dungeon":[{"Improved Life Tap":2,"Suppression":5,"Improved Corruption":5,"Improved Bane of Agony":1,"Amplify Curse":1,"Pandemic":3,"Malevolence":5,"Nightfall":2,"Siphon Life":1,"Shadow Mastery":5},{},{"Improved Shadow Bolt":5,"Bane":5,"Cataclysm":2,"Ruin":5,"Shadowburn":1,"Agonizing Flames":3}],"spec-23:demo_shadow":[{"Suppression":1,"Improved Corruption":1},{"Unholy Power":5,"Fel Vitality":3,"Demonic Energies":2,"Demonic Sacrifice":1,"Master Summoner":2,"Decimation":2,"Demonic Brand":3,"Soul Link":1,"Demonic Knowledge":3,"Master Demonologist":5,"Demonic Pact":1,"Improved Sayaad":3},{"Bane":5,"Ruin":5,"Agonizing Flames":3,"Improved Shadow Bolt":5}],"spec-24:dest_sac_alt":[{"Improved Corruption":5,"Improved Life Tap":2},{"Demonic Embrace":5,"Demonic Aegis":2,"Fel Vitality":3,"Demonic Sacrifice":1},{"Bane":5,"Cataclysm":3,"Aftermath":5,"Ruin":5,"Shadowburn":1,"Agonizing Flames":3,"Conflagrate":1,"Bane of Havoc":1,"Fire and Brimstone":3,"Shadow and Flame":5,"Incinerate":1}],"spec-26:cat_no_lotp":[{"Genesis":5,"Nature's Majesty":2,"Nature's Reach":2},{"Ferocity":5,"Furor":3,"Feral Swiftness":2,"Shredding Attacks":3,"Savage Fury":2,"Feral Charge":1,"Sharpened Claws":2,"Predatory Strikes":3,"Predatory Discipline":1,"Blood Frenzy":2,"Natural Instinct":2,"Rend and Tear":5,"Shifting Power":1},{"Heart of the Wild":5,"Naturalist":5}],"spec-28:tree_dungeon":[{"Genesis":5,"Moonglow":3,"Nature's Majesty":2,"Nature's Splendor":1},{},{"Nature's Focus":5,"Heart of the Wild":5,"Naturalist":5,"Reflection":3,"Gift of Nature":5,"Bloom":1,"Improved Rejuvenation":3,"Swiftmend":1,"Nature's Swiftness":1,"Living Spirit":3,"Improved Regrowth":5,"Wild Growth":1,"Subtlety":2}]};
function referenceTalent(id){if(buildFor(id)==="feral_onehand")return null;if(variantFor(id))return variantTalentBuilds[id+":"+buildFor(id)]||null;if(casterFeralTalentBuilds[id])return casterFeralTalentBuilds[id];if(hunterShamanTalentBuilds[id])return id==="spec-9"&&buildFor(id)!=="weaving"?null:hunterShamanTalentBuilds[id];if(plateTalentBuilds[id])return plateTalentBuilds[id];const trees=rogueTalentBuilds[id],b=buildFor(id);if(!trees)return null;
 return ((id==="spec-10"&&b==="mutilate")||(id==="spec-11"&&b==="general")||(id==="spec-12"&&b==="hemo"))?trees:null;
}
function plateTalentView(id,parent){
 const trees=plateTalentBuilds[id];if(!trees)return;
 const warrior=Number(id.split("-")[1])<=3;
 const c=box(parent,"逐項天賦 · "+trees.map(t=>Object.values(t).reduce((a,b)=>a+b,0)).join("/"),"11/23 團本 PvE 參考；逐樹點數合計51，未經本站完整模擬。");
 const names=warrior?["武器","狂怒","防護"]:["神聖","防護","懲戒"];
 const effects=warrior?{"Furious Precision":"副手限定命中，3/3為10%；不可加入通用命中。","Shield Slam":"盾牌格擋值影響傷害與仇恨。","Weaponmaster":"武器類型分別影響爆擊、護甲穿透或額外攻擊。","Dual Wield Specialization":"副手傷害及怒氣收益獨立計算。"}:{"Precision":"每點1%命中，可套用至通用命中試算。","Divine Precision":"神聖法術限定命中，不可套入一般物理命中。","Shieldsworn":"盾牌相關技能與法術格擋；此構築需裝備盾牌。","Holy Shield":"格擋與神聖反傷；須依實際承傷與觸發評估。","Improved Righteous Fury":"仇恨與承傷效果需獨立評估。"};
 for(const [i,t] of trees.entries()){const d=node("details");d.append(node("summary",names[i]+" · "+Object.values(t).reduce((a,b)=>a+b,0)+"點"));for(const [k,v] of Object.entries(t))add(d,node("p",k+" · "+v+" 點"+(effects[k]?"｜"+effects[k]:"")));c.append(d);}
 add(c,link("11/23 逐項參考配置",warrior?"https://wofwforever.com/en/guides/wow-forever-warrior-level-60-talents/":"https://www.wofwforever.com/en/guides/wow-forever-paladin-level-60-talents/"),node("p",""),link("天賦機制核對",warrior?"https://www.zockify.com/forever/warrior/talents/":"https://talentsforever.com/paladin/talents"));
}
function hunterShamanTalentView(id,parent){
 const trees=hunterShamanTalentBuilds[id];if(!trees)return;
 const hunter=Number(id.split("-")[1])<10;
 const names=hunter?["野獸控制","射擊","生存"]:["元素","增強","恢復"];
 const c=box(parent,"逐項參考天賦 · "+trees.map(t=>Object.values(t).reduce((a,b)=>a+b,0)).join("/"),"11/23 團本前 PvE 參考，51點總數已檢查，非模擬最優解。");
 if(!referenceTalent(id))add(c,node("p","下列是穿插流配點，不套用至純近戰構築。純近戰參考16/10/25，逐項仍待查。","gt-muted"));
 const notes={"Lone Wolf":"不帶寵物時的傷害收益，勿套用獸王寵物權重。","Predator's Edge":"每點增加近戰技能爆擊傷害6%、副手傷害10%；僅適用對應攻擊。","Strider Kick":"近戰武器傷害技能；不以遠程DPS替代。","Trueshot Aura":"獸王／生存20點射擊配置存在解鎖門檻差異；如無法點出，來源建議改為Mortal Shots第5點。","Mental Dexterity":"須核對智力轉換及版本係數，不直接使用純物理權重。","Mental Quickness":"須核對攻強及法術傷害轉換。","Maelstrom Weapon":"觸發率、攻速與法術比例共同影響權重。","Lightning Overload":"額外法術傷害與觸發機制須納入模擬。","Mana Tide Totem":"以實際回魔、戰鬥長度與團隊受益評估。"};
 for(const [i,t] of trees.entries()){const d=node("details");d.append(node("summary",names[i]+" · "+Object.values(t).reduce((a,b)=>a+b,0)+"點"));for(const [k,v] of Object.entries(t))add(d,node("p",k+" · "+v+" 點"+(notes[k]?"｜"+notes[k]:"")));c.append(d);}
 if(id==="spec-7"||id==="spec-9")add(c,node("p",notes["Trueshot Aura"],"gt-muted"));
 add(c,link("11/23 逐項配置來源",hunter?"https://www.wofwforever.com/en/guides/wow-forever-hunter-level-60-talents/":"https://www.wofwforever.com/en/guides/wow-forever-shaman-level-60-talents/"),node("p",""),link("11/26 天賦機制查證",hunter?"https://talentsforever.com/hunter/talents":"https://playfulls.com/talent-calculator/shaman/talents"));
}
function selectedTalentView(id,parent){
 const trees=referenceTalent(id);if(!trees)return;
 const i=Number(id.split("-")[1])-1,names=treeNames[Math.min(8,Math.floor(i/3))];
 const c=box(parent,"目前構築 · 逐項天賦","11/23 攻略參考與來源明示的配點調整；51點總數已驗證，本站尚未逐點驗證先決條件與戰鬥模擬。");
 for(const [j,t] of trees.entries()){const d=node("details");d.append(node("summary",names[j]+" · "+Object.values(t).reduce((a,b)=>a+b,0)+"點"));for(const [k,n] of Object.entries(t))add(d,node("p",k+" · "+n+" 點"));c.append(d);}
 const slug=["warrior","paladin","hunter","rogue","priest","shaman","mage","warlock","druid"][Math.min(8,Math.floor(i/3))];add(c,link("逐項天賦與變體來源","https://www.wofwforever.com/en/guides/wow-forever-"+slug+"-level-60-talents/"));
}
function rogueTalentView(id,parent){
 const trees=rogueTalentBuilds[id];if(!trees)return;
 const c=box(parent,"逐項天賦 · 51 點（盜賊）","11/23 PvE 參考構築，與1.60.1.71139天賦資料交叉核對部分核心機制。");
 if(!referenceTalent(id))c.append(node("p","注意：下列是來源參考構築，不是目前選定構築的已驗證點法；不自動套用。","gt-muted"));
 const effects={
 "Precision":n=>"命中 +"+n+"%；可由配裝試算手動套用。",
 "Malice":n=>"攻擊與毒藥爆擊率 +"+n+"%。",
 "Opportunity":n=>"背刺、絞喉、伏擊、截肢傷害 +"+4*n+"%。",
 "Puncturing Wounds":n=>"背刺爆擊 +"+10*n+"%；截肢爆擊 +"+5*n+"%；背刺額外連擊點機率 "+15*n+"%。",
 "Weapon Expertise":n=>"被閃躲／招架機率降低 "+n+"%。",
 "Dual Wield Specialization":n=>"副手武器傷害 +"+25*n+"%。",
 "Serrated Blades":n=>"忽略目標護甲 "+3*n+"%；割裂傷害 +"+10*n+"%。",
 "Hemorrhage":()=>"武器傷害係數：一般100%、匕首145%；自身割裂與絞喉傷害提高15%。",
 "Ghostly Strike":()=>"武器傷害係數：一般125%、主手匕首180%。",
 "Boot Knife":n=>"Shank 追加2連擊點機率 "+20*n+"%。",
 "Coup de Grace":n=>"剔骨傷害與Death Mark傷害／儲存率 +"+[0,7,13,20][n]+"%。",
 "Mutilate":()=>"雙匕首限定；主副手傷害及毒藥狀態須分別模擬。",
 "Seal Fate":n=>"產生連擊點的技能爆擊時，追加1點機率 "+[0,33,66,100][n]+"%。"
 };
 for(const [i,t] of trees.entries()){const d=node("details");d.open=true;d.append(node("summary",["刺殺","戰鬥","敏銳"][i]+" · "+Object.values(t).reduce((a,b)=>a+b,0)+"點"));for(const [name,n] of Object.entries(t))add(d,node("p",name+" · "+n+" 點"+(effects[name]?"｜"+effects[name](n):"")));c.append(d);}
 add(c,link("逐項配點來源（11/23）","https://wofwforever.com/en/guides/wow-forever-rogue-level-60-talents/"),node("p",""),link("客戶端技能與天賦（1.60.1.71139）","https://wowfdb.com/talents/rogue/"),node("p","技能係數不是裝備屬性權重；完整天賦先決條件仍待逐項驗證。","gt-muted"));
}
const referenceSplits=["32/17/2","17/33/1","5/15/31","23/0/28","12/32/7","14/6/31","31/16/4","5/41/5","1/20/30","31/19/1","16/35/0","12/8/31","32/19/0","31/17/3","15/3/33","32/11/8","17/31/3","0/20/31","35/13/3","16/32/3","18/0/33","35/11/5","2/31/18","18/0/33","38/0/13","9/32/10","9/32/10","11/0/40"];
const treeNames=[["武器","狂怒","防護"],["神聖","防護","懲戒"],["野獸控制","射擊","生存"],["刺殺","戰鬥","敏銳"],["戒律","神聖","暗影"],["元素","增強","恢復"],["秘法","火焰","冰霜"],["痛苦","惡魔學識","毀滅"],["平衡","野性戰鬥","恢復"]];
function splitView(id,parent){
 if(buildFor(id)==="feral_onehand"){box(parent,"單手武器替代比較","非獨立已驗證天賦；需以相同貓／熊構築的模擬結果比較整組武器。");return;}
 const i=Number(id.split("-")[1])-1,v=variantFor(id),trees=referenceTalent(id),split=v?v[2]:trees?trees.map(t=>Object.values(t).reduce((a,b)=>a+b,0)).join("/"):primaryExtraSplits[id]||((id==="spec-12"&&buildFor(id)==="backstab")||(id==="spec-11"&&buildFor(id)==="backstab")||(id==="spec-10"&&buildFor(id)==="general")?null:referenceSplits[i]);
 if(!split){box(parent,"目前構築天賦","尚無已查證的51點配置；不可套用其他構築點數。");return;}
 const names=treeNames[Math.min(8,Math.floor(i/3))],c=box(parent,"滿等天賦參考 · "+split,trees?"11/23 逐項構築參考；合計51點。":"11/23 攻略三系配點參考；逐項待補，不代表已驗證權重。");
 for(const [j,p] of split.split("/").entries())add(c,node("p",names[j]+"："+p+" 點"));
 if(v)add(c,node("p",v[3],"gt-muted"));if(id==="spec-25")add(c,node("p","11/25天賦變動後舊配點必須重新驗證。","gt-muted"));
 if(id==="spec-12")add(c,node("p","其他來源配置：15/5/31、14/6/31。12/8/31 為出血構築參考，不能等同純背刺構築。"),link("11/23 盜賊構築交叉比對","https://wofwforever.com/en/guides/wow-forever-rogue-level-60-talents/"));
 if(id==="spec-10")add(c,node("p","另有33/18/0截肢構築。"));
 if(id==="spec-11")add(c,node("p","另有21/30/0毒藥構築。"));
 const slug=["warrior","paladin","hunter","rogue","priest","shaman","mage","warlock","druid"][Math.min(8,Math.floor(i/3))];add(c,link("11/23 該職業構築及變體來源","https://www.wofwforever.com/en/guides/wow-forever-"+slug+"-level-60-talents/"),node("p","配點總數已檢查；單項天賦、先決條件、最新熱修正與模擬權重仍需驗證。","gt-muted"));
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
const tabs=[["combat","實戰模擬"],["v8","天賦流派"],["v9","掉落反查"],["v10","收集進度"],["v11","團本準備"],["v13","配方材料"],["v14","配裝試算"],["audit","天賦＋BiS 裝備"]];
const nav=node("div",undefined,"gt-tabs"),panel=node("div",undefined,"gt-panel");
// Move the real legacy section, not a clone: preserve recipe controls, IDs and original item nodes.
let legacyMount=null;
function restoreLegacy(){
 if(!legacyMount)return;
 const {sec,anchor}=legacyMount;legacyMount=null;
 sec.classList.remove("gt-legacy-in-audit","gt-legacy-show-items");
 if(anchor.parentNode){anchor.parentNode.insertBefore(sec,anchor);anchor.remove();}
}
function attachLegacy(spec){
 const sec=spec?.sec;if(!sec||!sec.parentNode||sec.contains(root)||root.contains(sec))return;
 const d=node("details",undefined,"gt-card gt-legacy-details");
 const toggle=node("input");toggle.type="checkbox";
 toggle.addEventListener("change",()=>sec.classList.toggle("gt-legacy-show-items",toggle.checked));
 add(d,node("summary","武器搭配、附魔與消耗品（舊版資料備查）"),node("p","保留原始武器組合、附魔、消耗品及估算權重。這些是舊版參考，尚未依目前構築重算，不可視為已驗證BiS。","gt-muted"),button("前往配方材料與採買清單",()=>show("v13")),add(node("label",undefined,"gt-check"),toggle,node("span","同時顯示原始裝備卡片（預設隱藏，避免重複）")));
 const anchor=document.createComment("gt-legacy-position");
 sec.before(anchor);legacyMount={sec,anchor};
 sec.classList.add("gt-legacy-in-audit");
 d.append(sec);panel.append(d);
}
function enableLegacyConsolidation(){
 if(specEls.some(sec=>sec.contains(root)||root.contains(sec)))return;
 const style=node("style");style.textContent="html.gt-bis-consolidated section.spec:not(.gt-legacy-in-audit){display:none!important}html.gt-bis-consolidated section.spec.gt-legacy-in-audit{display:block!important;margin:12px 0 0!important}html.gt-bis-consolidated section.spec.gt-legacy-in-audit:not(.gt-legacy-show-items) .slot{display:none!important}.gt-legacy-details>summary{font-weight:700;color:#e9c78c;cursor:pointer}.gt-legacy-details>.gt-check{margin:12px 0}";
 document.head.append(style);document.documentElement.classList.add("gt-bis-consolidated");
}
const navLabel=node("p","功能","gt-section-label");navLabel.hidden=true;add(root,navLabel,nav,panel);
let active="";
const specPairs=[...bySpec.values()].map(s=>[s.id,s.name]);
const getSpec=()=>{const el=$("#spec-select");return el&&!el.disabled&&bySpec.has(el.value)?el.value:"";};
const buildBar=node("div");buildBar.id="gt-build-bar";root.insertBefore(buildBar,nav);
function syncBuild(){
 const id=getSpec();buildBar.replaceChildren();
 if(!rogueProfiles[id])return;
 const pick=select(rogueProfiles[id]);pick.id="gt-build-select";pick.value=buildFor(id);
 pick.addEventListener("change",()=>{chooseBuild(id,pick.value);lastSpecKey=id+":"+buildFor(id);syncBuild();if(active)show(active);});
 add(buildBar,field("天賦構築",pick));pick.title="依構築篩選武器資格，獨立保存配裝權重。";
 syncWeaponCards(id);
}
function specPicker(){return {value:getSpec()};}
function specLabel(){const id=getSpec();return node("p","目前專精："+(bySpec.get(id)?.name||"尚未選擇")+(id?" ｜ "+(rogueProfiles[id]?.find(p=>p[0]===buildFor(id))?.[1]||""):""),"gt-muted");}
function title(t,desc){panel.replaceChildren(node("h3",t),node("p",desc,"gt-muted"));}
function guide(){title("V16.6 · 天賦與實戰手法","全 28 專精研究重點與多來源天賦查證。團本前 PvE；非已驗證的唯一最佳點法。");const out=node("div");const render=id=>{const s=bySpec.get(id),g=guides[Number(id.split("-")[1])-1];out.replaceChildren();const c=box(out,s.name,g[0]);splitView(id,out);if(feralSpec(id)){const f=box(out,"野性武器專項查證","預設雙手；單手＋持有型副手獨立比較，未取得完整組合前不視為BiS。");add(f,link("貓形態團本前配裝參考","https://foreverbis.net/druid/feral-cat/alliance/"),node("p",""),link("熊形態團本前配裝參考","https://foreverbis.net/druid/feral-bear/alliance/"));}if(variantFor(id)||casterFeralTalentBuilds[id])selectedTalentView(id,out);else if(referenceTalent(id)){plateTalentView(id,out);hunterShamanTalentView(id,out);rogueTalentView(id,out);}const builds=box(out,"此專精所有已收錄構築","切換上方構築即可使用各自的武器限制與本機權重；沒有逐項資料的構築不借用其他配置。");for(const [key,label] of rogueProfiles[id]||[]){const v=extraProfiles[id]?.find(x=>x[0]===key);add(builds,button((key===buildFor(id)?"目前：":"切換：")+label+(v?" · "+v[2]:""),()=>{chooseBuild(id,key);syncBuild();show("v8");}),node("p",v?v[3]+(variantTalentBuilds[id+":"+key]?"（有逐項參考）":"（逐項待補）"):"基準構築；請核對點數與版本","gt-muted"));}const research=talentResearch[Number(id.split("-")[1])-1];if(research){const analysis=box(out,"天賦與裝備收益研究",research[0]);add(analysis,node("p","需核對核心技能／天賦："+research[1]),node("p",research[2]),node("p","研究清單：非已驗證天賦點法、係數或數值權重。","gt-muted"),link("11/26 客戶端天賦資料（1.60.1.71139）","https://wowforevertalents.com/"),node("p",""),link("11/24 團本前構築與配裝","https://www.zockify.com/forever/bis/"),node("p",""),link("11/25 客戶端配裝參考","https://foreverbis.net/"));}add(c,node("p",g[1]),node("h4","構築與手法查證"),link("11/26 客戶端天賦樹（METAMMO）","https://metammo.com/wow-forever/talents"),node("p",""),link("11/25 天賦樹（The Forever Era）","https://theforeverera.com/en/talents/"),node("p",""),link("ForeverSpec 天賦計算器","https://foreverspec.com/talent-calculator/"),node("p",""),node("p","先依職責選擇滿等 PvE 天賦，再以遊戲內技能、最新熱修正及相同構築的實測確認優先序。"),link("ForeverSpec 滿等構築與版本更新","https://foreverspec.com/"),node("p",""),link("11/24 Zockify 全專精團本前配裝與構築","https://www.zockify.com/forever/bis/"),node("p",""),link("11/25 Forever BiS 客戶端資料與配裝","https://foreverbis.net/"),node("p",""),link("60.tools 全專精配裝與天賦","https://www.60.tools/bis"),node("p",""),link("AltGearer 屬性優先級（非完整BiS）","https://altgearer.com/forever/bis/"),node("p",""),link("Azeroth DB 天賦計算器與技能資料","https://azeroth-db.github.io/"),node("p",""),link("WoWGuildHub 天賦與技能資料","https://wowguildhub.com/wow-forever/guide"),node("p",""),link("永恆職業指南／天賦與手法", "https://nossuary.com/guides/wow-forever/"+g[2]+"/"),node("p","另以官方熱修正、Icy Veins 與遊戲內技能說明交叉核對。","gt-muted"),link("Icy Veins 永恆職業指南","https://www.icy-veins.com/wow-forever/class-guides"));if(id==="spec-12"){add(c,node("h4","構築機制與裝備連動"),node("p","背刺與伏擊需要主手匕首；出血可用其他武器，但匕首係數為145%，一般武器100%。伺機而動5/5使背刺、伏擊、絞喉、截肢傷害增加20%。這些是技能係數，不可直接當成敏捷或攻強權重。"),link("永恆敏銳天賦與技能","https://azerothprime.com/en/forever/classes/rogue/subtlety/talents"),node("p",""),link("ForeverSpec 敏銳構築","https://foreverspec.com/classes/rogue/subtlety/"));}if(id==="spec-25")add(c,node("p","11/25：平衡天賦改名、星火術天賦降為2點、日月蝕增加憤怒爆擊，舊配置須重查。"),link("官方11/25熱修正","https://news.blizzard.com/en-us/article/24315281/wow-forever-hotfixes-november-25-2026"));};const p=specPicker(render);add(panel,specLabel(),out);render(p.value);}
function sourceGroup(source){return String(source||"來源待查").split(/\s*[－—–]\s*|\s+-\s+/)[0].trim()||"來源待查";}
function drops(){title("掉落反查與刷裝路線","含跨來源新增候選，按來源、專精、部位及舊順位查詢。順位不是掉率；來源未經逐件交叉驗證。");
const spec=bySpec.get(getSpec()),lookup=new Map();if(spec)for(const [slot,items] of expandCandidateSlots(spec))for(const x of items){if(!lookup.has(x.id))lookup.set(x.id,{...x,uses:[]});lookup.get(x.id).uses.push({id:spec.id,name:spec.name,slot,type:x.type,rank:x.rank,review:x.review});}
const q=inp("裝備、首領、副本、任務、物品 ID（空格分隔）"),sp={value:getSpec()},slot=select([...new Set(spec?[...expandCandidateSlots(spec).keys()]:[])].sort().map(x=>[x,x]),"所有部位"),source=select([...new Set([...lookup.values()].map(x=>sourceGroup(x.source)))].sort().map(v=>[v,v]),"所有取得來源"),rank=select([["0","不限順位"],["1","第一順位"],["3","前三順位"]]),mode=select([["items","裝備清單"],["routes","依來源整理"]]),out=node("div");
let limit=40;function draw(){out.replaceChildren();const terms=q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);const rows=[...lookup.values()].map(x=>({...x,matched:x.uses.filter(u=>(!sp.value||u.id===sp.value)&&allowed(u.id,{...x,slot:u.slot,type:u.type||x.type})&&(!slot.value||u.slot===slot.value)&&(!Number(rank.value)||(u.rank>0&&u.rank<=Number(rank.value))))})).filter(x=>x.matched.length&&(!source.value||sourceGroup(x.source)===source.value)&&terms.every(t=>[x.name,zhItem(x),x.source,zhDisplay(x.source),x.type,x.id,...x.matched.map(u=>u.name+" "+u.slot)].join(" ").toLowerCase().includes(t)));
const groups=new Map();for(const x of rows){const k=sourceGroup(x.source);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}
out.append(node("p",rows.length+" 件符合條件的物品 · "+groups.size+" 個來源分類（依原卡片文字）","gt-muted"));
function card(x){const c=node("article",undefined,"gt-card");add(c,link(zhItem(x),x.url),node("p",x.source),node("small",x.type+" · ID "+x.id),node("p",Object.entries(x.stats).map(([k,v])=>k+" "+v).join(" · "),"gt-muted"),node("p",x.matched.map(u=>u.name+" / "+u.slot+(u.rank?" #"+u.rank:"（新增候選）")+(u.review?"（適用性待複核）":"")).join("、")),node("p",x.evidence||"缺少證據文字，請查證","gt-muted"));return c;}
if(mode.value==="routes"){const sorted=[...groups].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0],"zh-Hant"));for(const [name,items] of sorted.slice(0,limit)){const d=node("details",undefined,"gt-card");d.append(node("summary",name+"｜"+items.length+" 件候選"));for(const x of items)d.append(card(x));out.append(d);}if(sorted.length>limit)out.append(button("顯示更多來源",()=>{limit+=40;draw();}));}else{rows.sort((a,b)=>Math.min(...a.matched.map(u=>u.rank||999))-Math.min(...b.matched.map(u=>u.rank||999))||a.name.localeCompare(b.name,"zh-Hant"));for(const x of rows.slice(0,limit))out.append(card(x));if(rows.length>limit)out.append(button("顯示更多裝備",()=>{limit+=40;draw();}));}
if(!rows.length)out.append(node("p","沒有符合條件的候選；不代表遊戲內沒有此物品。"));}
for(const el of [q,slot,source,rank,mode])el.addEventListener(el===q?"input":"change",()=>{limit=40;draw();});add(panel,field("搜尋",q),specLabel(),field("部位",slot),field("來源",source),field("候選順位",rank),field("檢視方式",mode),out,box(panel,"完整遊戲資料查證","本站非全物品掉落庫。外部資料也可能包含舊版推定掉落，須確認永恆版本。"));add(panel,link("Eternadex 物品與來源資料庫","https://eternadex.com/en/datenbank/"),node("p",""),link("Azeroth DB 副本掉落與物品","https://azeroth-db.github.io/"));draw();}
const storeKey="tomb-bis-collected-v1";let collected={};let storageOK=true;try{collected=JSON.parse(localStorage.getItem(storeKey)||"{}");if(!collected||typeof collected!=="object")collected={};}catch(e){storageOK=false;collected={};}
function save(){try{localStorage.setItem(storeKey,JSON.stringify(collected));}catch(e){storageOK=false;}}
function collectionCoverage(slotRows,owned){
 const match=new Map();
 function assign(i,seen){for(const x of slotRows[i]){const key=String(x.id);if(!owned[key]||seen.has(key))continue;seen.add(key);const other=match.get(key);if(other===undefined||assign(other,seen)){match.set(key,i);return true;}}return false;}
 let have=0;for(let i=0;i<slotRows.length;i++)if(assign(i,new Set()))have++;return {have,total:slotRows.length};
}
function checklist(){title("個人裝備收集","每個專精獨立保存。只存在本瀏覽器，清除網站資料或換裝置不會同步。選擇某件第一順位並不代表整套最佳。");const out=node("div");const render=id=>{const base=bySpec.get(id),s={...base,slots:expandCandidateSlots(base)},state=collected[id]||{};out.replaceChildren();const partition=auditWeaponGroups([...s.slots].map(([name,items])=>({name,items:items.filter(x=>allowed(id,x))}))),modes=partition.modes.length?partition.modes:["one"],coverage=modes.map(m=>({mode:m,...collectionCoverage(auditEquipmentSlots(partition,m).map(x=>x.items),state)})),best=coverage.sort((a,b)=>b.have/b.total-a.have/a.total)[0],{total,have}=best;const status=node("p",coverage.map(x=>(x.mode==="two"?"雙手":"單手／副手")+" "+x.have+" / "+x.total).join("；")+" 戰鬥位置（戒指及飾品各兩格、遠程／聖物共一格；同ID保守只計一件，未有候選或不適用欄仍列空位）"+(storageOK?"":"（目前無法永久儲存）"),"gt-muted");const progress=node("progress");progress.max=total||1;progress.value=have;add(out,status,progress,button("清除此專精紀錄",()=>{if(confirm("確定清除此專精的收集紀錄？")){delete collected[id];save();render(id);}}));for(const [slot,items] of s.slots){if(!items.some(x=>allowed(id,x)))continue;const c=node("div",undefined,"gt-card");c.append(node("h4",slot));for(const x of items.filter(x=>allowed(id,x))){const chk=node("input");chk.type="checkbox";chk.checked=!!state[x.id];chk.addEventListener("change",()=>{collected[id]??={};collected[id][x.id]=chk.checked;save();render(id);});add(c,add(node("label",undefined,"gt-check"),chk,node("span",(x.rank?"#"+x.rank+" ":"候選 ") +zhItem(x)+(x.review?"（適用性待複核）":"")),node("small",x.source)));}out.append(c);}};const p=specPicker(render);add(panel,specLabel(),out);render(p.value);}
const official="https://news.blizzard.com/en-us/article/24315281/wow-forever-hotfixes-november-25-2026";
function raid(){title("團本準備","2026/11/27：首批團本尚未開放。以下是官方已公布的規模及前置，尚未加入首領技能推測。");const r=[["地深獸穴（Barrow Deeps）","10人 · 8首領 · 60級 · 官方公告12/9（台灣日期依維護公告）"],["海加爾山之巔（Hyjal Summit）","20人 · 13首領 · 60級 · 官方公告12/9"],["奧妮克希亞巢穴","40人 · 60級 · 每位玩家準備龍火護符；聯盟／部落前置不同。"]];for(const [a,b] of r)box(panel,a,b);const c=box(panel,"開荒通用檢查","先完成滿等技能與裝備、按職責準備消耗品、抗性按官方機制決定、預先分配坦補與斷法。世界增益進團本會移除（11/23熱修正）。");add(c,link("官方團本概覽","https://news.blizzard.com/en-gb/article/24303009/world-of-warcraft-forever-raid-overviewlocations-raid-sizes-and-attunement"),node("p","首領打法等正式資料出現後再補齊。","gt-muted"),link("官方熱修正",official));}
const news=[["2026/11/25","平衡德天賦調整","憤怒與星火相關天賦重新整理，日月蝕增加憤怒爆擊，梟獸形態強化秘法與自然傷害。3點以上舊強化星火術可能被重置。"],["2026/11/25","獵人／術士寵物","修正寵物普通近戰攻擊爆擊率為0%的問題；野獸控制獵召喚的鷹亦有行為和爆擊修正。"],["2026/11/25","聖騎士／盜賊／薩滿","修正審判刷新及驅邪術爆擊；聖光誓約延長。毒藥與致盲粉暫時拾取綁定；薩滿閃電鏈的節能施法修正。"],["2026/11/23","團本世界增益與套裝","區域切換不再移除世界增益，但進團本仍移除；野性之心4件能量回復修正，數個武器過度觸發問題也已修正。"],["2026/11/17","聖坦魂鑄套裝","坦克版魂鑄套裝以法術能量取代力量。Whiteout Staff、Crackling Staff 的屬性統一為25耐、25智、74武器法傷。"]];
function hotfix(){title("V12 · 官方藍帖繁中摘要","截至 2026/11/27 查得的最新官方熱修正為 11/25。此區為手動更新摘要，不是即時爬蟲。");const q=inp("搜尋日期、職業或關鍵字"),out=node("div");function draw(){out.replaceChildren();for(const [d,t,b] of news.filter(x=>x.join(" ").includes(q.value.trim()))){const c=box(out,d+" · "+t,b);c.append(link("官方原文",official));}}q.addEventListener("input",draw);add(panel,field("搜尋",q),out,link("暴雪魔獸世界最新消息","https://news.blizzard.com/en-us/world-of-warcraft"));draw();}
function parseRecipeMaterials(mat){
 const rows=[];
 for(const part of String(mat??"").split(/[、；;\n]+/)){
  const text=part.trim();if(!text)continue;
  const m=text.match(/^([^×]+?)\s*×\s*(\d+)$/),qty=m?Number(m[2]):0;
  rows.push(m&&m[1].trim()&&Number.isSafeInteger(qty)&&qty>0?{name:m[1].trim(),qty,text}:{name:"",qty:null,text});
 }
 return rows.length?rows:[{name:"",qty:null,text:"材料資料缺漏"}];
}
function recipeMaterialTotals(entries){
 const totals=new Map(),unknown=[];
 for(const {recipe,count} of entries){
  if(!Number.isSafeInteger(count)||count<1)continue;
  for(const part of parseRecipeMaterials(recipe.mat)){
   if(part.qty===null){unknown.push({name:recipe.name,text:part.text,count});continue;}
   const qty=part.qty*count+(totals.get(part.name)||0);
   if(!Number.isSafeInteger(qty)){unknown.push({name:recipe.name,text:part.text,count});continue;}totals.set(part.name,qty);
  }
 }
 return {totals:[...totals.entries()].sort((a,b)=>a[0].localeCompare(b[0],"zh-Hant")),unknown};
}
function recipeShoppingRows(totals,owned={}){
 return totals.map(([name,required])=>{const n=Object.prototype.hasOwnProperty.call(owned,name)?owned[name]:0,have=Number.isSafeInteger(n)&&n>=0?n:0;return {name,required,have,remaining:Math.max(0,required-have)};});
}
function recipeSearchMatches(recipe,term,translate=v=>v){
 const terms=String(term||"").trim().toLowerCase().split(/\s+/).filter(Boolean),fields=[recipe.name,recipe.prof,recipe.fx,recipe.mat,recipe.where,recipe.state].filter(v=>typeof v==="string");
 const hay=fields.concat(fields.map(translate)).join(" ").toLowerCase();
 return terms.every(t=>hay.includes(t));
}
function material(){
 title("附魔、消耗品與材料","依構築保存準備清單。候選配方及取得來源仍待逐項核對。");
 let data;try{data=JSON.parse($("#v6-prep-data").textContent);}catch(e){panel.append(node("p","配方資料無法讀取"));return;}
 const rows=Object.entries(data.recipes||{}).filter(([,x])=>x&&typeof x==="object"),routes=data.routes||{},id=getSpec(),profile=id?buildFor(id):"",key=id?"gt-prep-v1:"+id+":"+profile:null;
 let chosen=Object.create(null),owned=Object.create(null);try{const v=key?JSON.parse(localStorage.getItem(key)||"{}"):{};if(v&&typeof v==="object"&&!Array.isArray(v))for(const [k] of rows)if(Number.isSafeInteger(v[k])&&v[k]>0&&v[k]<=999)chosen[k]=v[k];}catch(e){}
 try{const v=key?JSON.parse(localStorage.getItem(key+":owned")||"{}"):{};if(v&&typeof v==="object"&&!Array.isArray(v))for(const [n,qty] of Object.entries(v))if(Number.isSafeInteger(qty)&&qty>=0)owned[n]=qty;}catch(e){}
 const q=inp("配方、效果、材料、來源（空格分隔）"),prof=select([...new Set(rows.map(([,x])=>x.prof).filter(Boolean))].sort().map(x=>[x,x]),"全部專業"),mode=select([["all","全部候選"],["chosen","僅顯示已選配方"]]),out=node("div"),summary=node("div"),msg=node("p","","gt-muted");
 function persist(){if(!key)return;try{localStorage.setItem(key,JSON.stringify(chosen));localStorage.setItem(key+":owned",JSON.stringify(owned));msg.textContent="已儲存於本瀏覽器："+profile;}catch(e){msg.textContent="本機儲存失敗，重新整理後可能遺失。";}}
 function drawSummary(){summary.replaceChildren();if(!key){summary.append(node("p","請先選擇職業及專精，才能使用獨立準備清單。","gt-muted"));return;}
  const selected=rows.filter(([k])=>chosen[k]>0).map(([k,recipe])=>({recipe,count:chosen[k]}));
  const {totals,unknown}=recipeMaterialTotals(selected);
  const c=box(summary,"本構築材料採買清單",selected.length+" 種配方；數量為配方製作次數，不一定等於成品數。");
  if(!selected.length){c.append(node("p","尚未加入配方。"));return;}
  const chosenDetails=node("details");chosenDetails.append(node("summary","已選配方（"+selected.length+"）"));
  for(const {recipe,count} of selected)chosenDetails.append(node("p",recipe.name+" × "+count));c.append(chosenDetails);
  const table=node("div",undefined,"gt-shopping-grid");add(table,...["材料／來源","需求","已有","尚缺"].map(t=>node("strong",t)));
  for(const row of recipeShoppingRows(totals,owned)){
   const qty=inp("0","number");qty.min="0";qty.max="999999999";qty.step="1";qty.value=String(row.have);qty.setAttribute("aria-label",row.name+" 已有數量");
   qty.addEventListener("change",()=>{owned[row.name]=Math.min(999999999,Math.max(0,Math.floor(Number(qty.value)||0)));persist();drawSummary();});
   add(table,add(node("div"),node("strong",row.name),node("p",routes[row.name]||"來源未核對","gt-muted")),node("span",String(row.required)),qty,node("span",String(row.remaining),"gt-shopping-remaining"));
  }
  c.append(table);
  if(unknown.length){const d=node("details");d.open=true;d.append(node("summary","未能自動合計的材料（"+unknown.length+"）"));for(const x of unknown)d.append(node("p",x.name+" × "+x.count+"： "+x.text));c.append(d);}
  add(c,node("p","合計只處理明確的「材料×整數」；未確認配方與材料來源保留待查，不推算成品產量。","gt-muted"));
  const exportArea=node("textarea");exportArea.rows=4;exportArea.style.width="100%";exportArea.readOnly=true;exportArea.value=["墓鐘資料庫｜尚缺材料（來源待核）",bySpec.get(id)?.name+" / "+profile,...recipeShoppingRows(totals,owned).filter(x=>x.remaining>0).map(x=>x.name+" × "+x.remaining+"（需求 "+x.required+"／已有 "+x.have+"）"),...unknown.map(x=>"待核算："+x.name+" × "+x.count+" / "+x.text)].join("\n");const d=node("details");add(d,node("summary","複製尚缺材料清單"),exportArea,button("複製清單",async()=>{try{await navigator.clipboard.writeText(exportArea.value);msg.textContent="已複製尚缺材料清單。";}catch(e){exportArea.focus();exportArea.select();msg.textContent="請手動複製已選取文字。";}}));c.append(d);
 }
 function draw(){out.replaceChildren();const term=q.value.trim().toLowerCase(),list=rows.filter(([k,x])=>(mode.value!=="chosen"||chosen[k]>0)&&(!prof.value||x.prof===prof.value)&&recipeSearchMatches(x,term,zhDisplay));out.append(node("p",list.length+" 個配方候選","gt-muted"));
  for(const [k,x] of list){const c=box(out,x.name+" · "+x.prof,x.fx);add(c,node("small",x.state),node("p","配方取得："+x.where),node("p","材料及來源："));const ul=node("ul");for(const material of parseRecipeMaterials(x.mat))add(ul,node("li",material.text+" — "+(material.name&&routes[material.name]||"來源未核對")));add(c,ul,link("永恆專業資料","https://wowamobi.com/professions"),node("p",x.why,"gt-muted"));
   if(key){const qty=inp("0","number");qty.min="0";qty.max="999";qty.step="1";qty.value=String(chosen[k]||0);qty.addEventListener("change",()=>{const n=Math.min(999,Math.max(0,Math.floor(Number(qty.value)||0)));if(n)chosen[k]=n;else delete chosen[k];qty.value=String(n);persist();drawSummary();if(mode.value==="chosen"&&!n)draw();});add(c,field("製作次數（0＝未選）",qty));}
  }
  if(q.value.trim()&&routes[q.value.trim()])box(out,"材料來源："+q.value.trim(),routes[q.value.trim()]);
 }
 q.addEventListener("input",draw);prof.addEventListener("change",draw);mode.addEventListener("change",draw);
 add(panel,specLabel(),summary,msg,field("配方／材料搜尋",q),field("專業",prof),field("檢視範圍",mode),out);drawSummary();draw();
}
function statScore(stats,weights,currentHit,hitTarget){let total=0;for(const [k,v] of Object.entries(stats)){let qty=v;if(k==="命中機率"&&hitTarget!==null)qty=Math.min(v,Math.max(0,hitTarget-currentHit));total+=qty*(weights[k]||0);}return total;}
function epProfilesFor(data,id){
 if(data?.commit!==combatPresetCommit||!Array.isArray(data.profiles))return [];
 const seen=new Set(),labels=new Set(Object.values(catalogWeightFields));
 return data.profiles.filter(x=>{
  if(!x||x.spec!==id||typeof x.label!=="string"||!x.label.trim()||typeof x.variant!=="string"||seen.has(x.variant)||typeof x.source!=="string"||!/^ui\/specs\/[a-zA-Z0-9_/]+\.ts$/.test(x.source)||typeof x.declaration!=="string"||!/^\w+$/.test(x.declaration)||!x.panelWeights||typeof x.panelWeights!=="object"||Array.isArray(x.panelWeights))return false;
  const entries=Object.entries(x.panelWeights);
  if(!entries.length||!entries.every(([k,v])=>labels.has(k)&&Number.isFinite(v)&&v>0))return false;
  seen.add(x.variant);return true;
 });
}
let epProfilesPromise=null;
function loadEpProfiles(){
 if(!epProfilesPromise)epProfilesPromise=fetch("ep-presets.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();}).catch(()=>null);
 return epProfilesPromise;
}
function optimizer(){
 title("配裝試算","使用選定構築的武器資格及可匯入的模擬屬性權重。預設為舊版估算，不代表最新實測；不同構築、角色與目標不可混用權重。");
 const id=getSpec(),baseSpec=bySpec.get(id);if(!baseSpec)return;const s={...baseSpec,slots:expandCandidateSlots(baseSpec)};
 const out=node("div"),slot=select([...s.slots].map(([k])=>[k,k])),current=inp("0","number"),target=inp("留空＝不限制","number"),result=node("div");
 current.value="0";current.min="0";current.step="0.1";target.min="0";target.step="0.1";const talentHit=inp("0","number");talentHit.value="0";talentHit.min="0";talentHit.step="0.1";
 const research=talentResearch[Number(id.split("-")[1])-1];
 const profile=buildFor(id),storageKey="gt-sim-weights-v1:"+id+":"+profile;
 const hasLegacy=!variantFor(id)&&!!referenceTalent(id);const defaults=hasLegacy?{...s.weights}:Object.fromEntries(Object.keys(s.weights).map(k=>[k,0]));if(["physical","tank"].includes(roleFor(id)))for(const k of Object.keys(defaults))if(spellOnly.test(k)&&!(/^spec-[78]$/.test(id)&&/智力|intellect/i.test(k)))defaults[k]=0;
 const weights={...defaults},keys=[...new Set([...Object.keys(defaults),...[...s.slots.values()].flatMap(xs=>xs.flatMap(x=>Object.keys(x.stats))),"武器DPS","主手DPS","副手DPS","雙手DPS","遠程DPS",...Object.values(catalogWeightFields)])];
 for(const k of keys)if(!(k in weights))weights[k]=0;
 let provenance=(variantFor(id)||!referenceTalent(id))?"此構築無權重，請匯入專屬模擬資料":"舊版估算／未驗證",saved=savedModel(id);if(saved?.hitBySlot?.[slot.value]){current.value=String(saved.hitBySlot[slot.value].base);target.value=saved.hitBySlot[slot.value].cap??"";talentHit.value=String(saved.hitBySlot[slot.value].talent??0);}
 if(saved&&saved.weights&&typeof saved.weights==="object"){for(const k of keys)if(Number.isFinite(saved.weights[k])&&saved.weights[k]>=0)weights[k]=saved.weights[k];provenance=(saved.source||"使用者設定")+"（未經本站驗證）";}
 const source=inp("例如 WoWSims 版本、天賦連結、戰鬥時間","text");source.value=saved?.source||"";
 const indicator=node("p",provenance,"gt-muted"),message=node("p","","gt-muted"),weightBox=node("details"),grid=node("div",undefined,"gt-weight-grid"),inputs={};
 weightBox.append(node("summary","屬性權重與模擬資料匯入"));
 const raw=node("textarea");raw.rows=5;raw.style.width="100%";raw.placeholder='{"力量":1,"敏捷":1.5,"武器DPS":2}（格式示意，非推薦值）';
 function refresh(){for(const k of keys)inputs[k].value=String(weights[k]);indicator.textContent=provenance;draw();}
 const importBtn=button("匯入 JSON 權重",()=>{try{const o=JSON.parse(raw.value);if(!o||typeof o!=="object"||Array.isArray(o))throw Error("需要物件");const entries=Object.entries(o);if(!entries.length||entries.some(([k,v])=>!keys.includes(k)||typeof v!=="number"||!Number.isFinite(v)||v<0))throw Error("欄位必須為本頁已列屬性，數值須為非負有限數");for(const k of keys)weights[k]=Object.prototype.hasOwnProperty.call(o,k)?o[k]:0;provenance="使用者匯入／未經本站驗證";message.textContent="匯入成功；未指定的屬性已設為0。";refresh();}catch(e){message.textContent="匯入失敗："+e.message;}});
 for(const k of keys){const el=inp("0","number");el.step="0.01";el.min="0";el.value=String(weights[k]);inputs[k]=el;el.addEventListener("input",()=>{weights[k]=Math.max(0,Number(el.value)||0);provenance="使用者調整／未經本站驗證";indicator.textContent=provenance;draw();});grid.append(field(k,el));}
 const saveBtn=button("儲存此專精與構築權重",()=>{if(!source.value.trim()){message.textContent="請填寫資料來源或計算假設。";return;}if(!Object.values(effectiveGearWeights(id,weights)).some(v=>v>0)){message.textContent="至少需有一項適用於此構築的非零權重，才可儲存配裝模型。";return;}try{localStorage.setItem(storageKey,JSON.stringify({weights,source:source.value.trim(),hitBySlot:{...(saved?.hitBySlot||{}),[slot.value]:{base:Math.max(0,Number(current.value)||0),cap:target.value===""?null:Math.max(0,Number(target.value)||0),talent:Math.max(0,Number(talentHit.value)||0)}}}));saved=savedModel(id);provenance=source.value.trim()+"（使用者提供，未驗證）";indicator.textContent=provenance;message.textContent="已儲存於本瀏覽器。";}catch(e){message.textContent="無法儲存。";}});
 const resetBtn=button(hasLegacy?"恢復舊版估算":"清除本構築權重",()=>{for(const k of keys)weights[k]=defaults[k]||0;provenance=hasLegacy?"舊版估算／未驗證":"此構築無權重，請匯入專屬模擬資料";source.value="";saved=null;current.value="0";target.value="";talentHit.value="0";try{localStorage.removeItem(storageKey);}catch(e){}refresh();});
 const exportBtn=button("輸出目前權重 JSON",()=>{raw.value=JSON.stringify(weights,null,2);raw.focus();raw.select();message.textContent="已填入目前權重，可複製分享；不包含天賦、命中設定及來源，請一併告知接收者。";});
 const epBox=node("div",undefined,"gt-card");epBox.append(node("p","讀取上游固定版本參考權重…","gt-muted"));
 loadEpProfiles().then(data=>{
  if(!epBox.isConnected)return;
  const rows=epProfilesFor(data,id);
  epBox.replaceChildren(node("h4","上游原始 EP 權重參考"));
  if(!rows.length){epBox.append(node("p","此專精尚無可核對的上游數字權重；保留自行匯入功能。","gt-muted"));return;}
  const pick=select(rows.map(x=>[x.variant,x.label])),detail=node("div");
  function showEp(){
   const x=rows.find(v=>v.variant===pick.value);detail.replaceChildren();
   if(!x)return;
   add(detail,node("p",Object.entries(x.panelWeights).map(([k,v])=>k+" "+v.toFixed(3)).join(" ｜ ")),node("p","未採用的上游欄位："+(Array.isArray(x.omitted)?x.omitted.join("、"):"未知")+"。評分只用可映射的正數面板權重；不包含觸發、套裝、命中門檻與真實戰鬥環境。","gt-muted"),link("查看上游原始權重","https://github.com/wowsims/forever/blob/"+combatPresetCommit+"/"+x.source));
  }
  pick.addEventListener("change",showEp);add(epBox,field("參考構築（須核對目前天賦）",pick),detail,button("載入此參考權重（部分欄位）",()=>{
   const x=rows.find(v=>v.variant===pick.value);if(!x)return;
   for(const k of keys)weights[k]=x.panelWeights[k]||0;
   source.value="WoWSims "+combatPresetCommit.slice(0,7)+" "+x.label+" / "+x.declaration+"（部分面板權重）";
   provenance="固定版本上游參考，非本站實跑；須核對構築";message.textContent="已載入部分權重，未自動儲存。請確認適用天賦、遭遇及缺少欄位，再儲存。";refresh();
  }));showEp();
 });
 add(weightBox,epBox,grid,field("模擬來源與假設",source),field("JSON 權重（以本頁繁中屬性名稱為鍵）",raw),importBtn,exportBtn,saveBtn,resetBtn,message);
 function draw(){result.replaceChildren();const effective=effectiveGearWeights(id,weights);if(!Object.values(effective).some(v=>v>0)){result.append(node("p","此構築尚無非零權重；不產生排名，請匯入專屬模擬資料。"));return;}const rows=(s.slots.get(slot.value)||[]).filter(x=>allowed(id,x));const base=Math.max(0,Number(current.value)||0),cap=target.value===""?null:Math.max(0,Number(target.value)||0);
 const sorted=rows.map(x=>{const m=modelScore(x,effective,{base,cap,talent:Math.max(0,Number(talentHit.value)||0)});return {...x,calc:m.total,parts:m.parts,missingDps:m.incomplete};}).sort((a,b)=>Number(!!a.review)-Number(!!b.review)||Number(a.missingDps)-Number(b.missingDps)||b.calc-a.calc);
 if(!sorted.length){result.append(node("p","本站沒有符合此構築的候選裝備，請查證外部資料。"));return;}
 for(const [i,x] of sorted.entries()){const c=box(result,(x.review?"待複核 · ":"比較 "+(i+1)+" · ")+zhItem(x),"試算分："+x.calc.toFixed(2));add(c,node("p",x.source),node("p",x.review||"未觸發適用性警示；非已驗證","gt-muted"));if(x.missingDps)add(c,node("p","缺武器DPS，分數不完整","gt-muted"));const d=node("details");d.append(node("summary","查看各屬性分數貢獻"));for(const [k,v] of Object.entries(x.parts))if(v!==0)d.append(node("p",k+"："+v.toFixed(2)));add(c,d,link("物品來源",x.url));}}
 slot.addEventListener("change",()=>{const h=saved?.hitBySlot?.[slot.value];current.value=String(h?.base??0);target.value=h?.cap??"";talentHit.value=String(h?.talent??0);draw();});for(const el of [current,target,talentHit])el.addEventListener("input",draw);
 add(out,specLabel(),node("p",research?"權重研究："+research[2]:"尚無研究資料","gt-muted"),node("p","構築："+(rogueProfiles[id]?.find(x=>x[0]===profile)?.[1]||"既有專精／待建立完整構築")),indicator,...(feralSpec(id)?[node("p","野性形態的武器DPS轉換尚未驗證，本工具不把原始武器DPS納入貓／熊形態分數；保留原始數字供查證。","gt-muted")]:[]),field("比較部位",slot),field("其他部位命中 (%)；不含下方天賦命中",current),field("額外天賦命中 (%)；已包含於上方則填0",talentHit),...((referenceTalent(id)?.[1]?.Precision||0)>0?[button("套用參考配點的精準命中 +"+(referenceTalent(id)[1].Precision||0)+"%",()=>{talentHit.value=String(referenceTalent(id)[1].Precision||0);draw();})]:[]),field("命中目標 (%)",target),weightBox,node("p","各手位DPS權重可獨立輸入；只要有一項手位權重非零，就完全改用手位權重（其他手位0代表不計分）；全為0才沿用通用DPS。盾牌、法器、聖物不計武器DPS。未計套裝、觸發、整套互斥或完整技能循環。","gt-muted"),result,link("WoWSims Forever","https://wowsims.com/forever/"),node("p",""),link("VoidSim 屬性權重","https://voidsim.io/forever"));panel.append(out);draw();
}
// Saved simulation weights are local to the selected specialization and build.
function savedModel(id){
 try{const v=JSON.parse(localStorage.getItem("gt-sim-weights-v1:"+id+":"+buildFor(id))||"null");if(v&&v.weights&&typeof v.weights==="object"&&!Array.isArray(v.weights)&&Object.values(v.weights).every(n=>typeof n==="number"&&Number.isFinite(n)&&n>=0)&&Object.values(v.weights).some(n=>n>0))return v;}catch(e){}return null;
}
function weaponDpsKey(x){
 const slot=String(x.slot||""),type=String(x.type||"");
 if(/盾牌|shield|法器|聖物|魔印|圖騰|聖契|塑像|持有|副手物品|held in off.hand|off.hand frill|relic|彈藥|箭矢|彈丸|箭袋/i.test(type+" "+slot))return "";
 if(/遠程|遠距|ranged|魔杖/i.test(slot))return "遠程DPS";
 if(/副手|off.hand/i.test(slot))return "副手DPS";
 if(/雙手|two.hand|法杖|長柄|staff|staves|polearm/i.test(slot+" "+type))return "雙手DPS";
 if(/主手|單手武器|近戰武器|main.hand/i.test(slot))return "主手DPS";
 return "";
}
function modelScore(x,weights,hit={}){
 const parts={},base=(Number.isFinite(hit.base)?Math.max(0,hit.base):0)+(Number.isFinite(hit.talent)?Math.max(0,hit.talent):0),cap=Number.isFinite(hit.cap)?Math.max(0,hit.cap):null;
 for(const [k,v] of Object.entries(x.stats||{})){if(!Number.isFinite(v))continue;const qty=k==="命中機率"&&cap!==null?Math.min(v,Math.max(0,cap-base)):v;parts[k]=qty*(weights[k]||0);}
 const key=weaponDpsKey(x),specific=["主手DPS","副手DPS","雙手DPS","遠程DPS"].some(k=>(weights[k]||0)>0),weight=key?(specific?(weights[key]||0):(weights["武器DPS"]||0)):0;
 const dps=Object.entries(x.wm||{}).find(([k])=>/每秒傷害|DPS/i.test(k));
 const wd=dps?Number(String(dps[1]).match(/\d+(?:\.\d+)?/)?.[0]):NaN;
 if(key&&weight&&Number.isFinite(wd))parts[specific?key:"武器DPS"]=wd*weight;
 return {total:Object.values(parts).reduce((a,b)=>a+b,0),parts,incomplete:!!weight&&!Number.isFinite(wd)};
}

// Pair scoring uses a shared hit budget, not per-slot hit caps.
function weaponPosition(x){
 const slot=String(x.slot||""),type=String(x.type||"");
 if(/遠程|遠距|魔杖|聖物|圖騰|聖契|塑像|relic|ranged/i.test(slot+" "+type))return "";
 if(/雙手|two.hand|法杖|長柄|staff|staves|polearm/i.test(type))return /副手|off.hand/i.test(slot)?"":"two";
 if(/副手|盾牌|off.hand/i.test(slot))return /主手限定|主手武器|main.hand/i.test(type)?"":"off";
 if(/主手|單手|近戰武器|main.hand/i.test(slot)&&!/盾牌|shield|副手物品|持有|法器/i.test(type))return "main";
 return "";
}
function weaponSets(items,eligible,kind){
 const pools={two:[],main:[],off:[]},seen=new Set();
 for(const x of items){if(!eligible(x))continue;const pos=weaponPosition(x);if(!pos)continue;const k=pos+":"+x.id;if(seen.has(k))continue;seen.add(k);pools[pos].push(x);}
 const rows=[];
 if(!["dual","shield","mutilate","backstab","hemo"].includes(kind))for(const x of pools.two)rows.push({items:[x],kind:"雙手武器"});
 if(!["twohand","weaving"].includes(kind))for(const main of pools.main)for(const off of pools.off){
  // Unknown unique-equipped limits: do not recommend two copies of the same ID.
  if(main.id===off.id)continue;
  if(/盾牌|shield|副手物品|持有|法器|off.hand frill/i.test(off.type||"")&&["dual","mutilate","backstab","hemo"].includes(kind))continue;
  rows.push({items:[main,off],kind:/盾牌|shield/i.test(off.type||"")?"主手＋盾牌":"主手＋副手"});
 }
 return rows;
}
function weaponSetScore(items,weights,hit={}){
 const parts={};let incomplete=false,rawHit=0;
 for(const x of items){const result=modelScore(x,weights,{});incomplete||=result.incomplete;for(const [k,v] of Object.entries(result.parts))if(k!=="命中機率")parts[k]=(parts[k]||0)+v;
 if(Number.isFinite(x.stats?.["命中機率"]))rawHit+=x.stats["命中機率"];}
 const base=(Number.isFinite(hit.base)?Math.max(0,hit.base):0)+(Number.isFinite(hit.talent)?Math.max(0,hit.talent):0);
 const usable=Number.isFinite(hit.cap)?Math.min(rawHit,Math.max(0,hit.cap-base)):rawHit;
 parts["命中機率"]=usable*(weights["命中機率"]||0);
 return {total:Object.values(parts).reduce((a,b)=>a+b,0),parts,incomplete,rawHit,usable};
}
function weaponSetView(spec,model){
 const d=node("details",undefined,"gt-card");d.open=false;d.append(node("summary","進階武器組合試算（選用）"));
 const id=spec.id,kind=feralWeaponMode(id)==="twohand"?"twohand":feralWeaponMode(id)==="onehand"?"general":variantFor(id)?.[4]||buildFor(id),rows=weaponSets([...expandCandidateSlots(spec).values()].flat(),x=>allowed(id,x),kind);
 const out=node("div"),base=inp("0","number"),talent=inp("0","number"),cap=inp("留空＝不設上限","number");
 for(const e of [base,talent,cap]){e.min="0";e.step="0.1";}base.value="0";talent.value="0";
 let limit=10;
 const note=node("p","僅使用本站候選及已知武器資格；同ID不重複配戴，未驗證唯一裝備群組、武器速度觸發、套裝與其他特殊效果。非整套BiS。","gt-muted");
 function draw(){
  out.replaceChildren();if(!rows.length){out.append(node("p","尚無符合目前構築的完整武器組合。"));return;}
  if(!model){out.append(node("p","尚未儲存此構築的權重，不產生武器組合分數或新排名。以下依既有候選順序供查證。","gt-muted"));}
  const hit={base:Math.max(0,Number(base.value)||0),talent:Math.max(0,Number(talent.value)||0),cap:cap.value===""?null:Math.max(0,Number(cap.value)||0)};
  const list=rows.map(r=>({...r,review:r.items.some(x=>!!x.review),score:model?weaponSetScore(r.items,effectiveGearWeights(id,model.weights),hit):null}));
  if(model)list.sort((a,b)=>Number(a.review)-Number(b.review)||Number(a.score.incomplete)-Number(b.score.incomplete)||b.score.total-a.score.total);
  out.append(node("p","符合條件的武器組合："+list.length+" 組","gt-muted"));
  for(const [i,r] of list.slice(0,limit).entries()){
   const c=box(out,r.kind+(r.review?" · 適用性待複核":""),r.score?"試算分："+r.score.total.toFixed(2)+(r.score.incomplete?"（缺武器DPS）":"")+"；有效命中 "+r.score.usable+"/"+r.score.rawHit+"%":"候選組合 "+(i+1)+"（未排名）");
   for(const x of r.items)add(c,link(zhItem(x),x.url),node("p",x.source,"gt-muted"),...(x.review?[node("p",x.review,"gt-muted")]:[]));
   if(r.score){const details=node("details");details.append(node("summary","查看合計屬性分數"));for(const [k,v] of Object.entries(r.score.parts))if(v)details.append(node("p",k+"："+v.toFixed(2)));c.append(details);}
  }
  if(list.length>limit)out.append(button("顯示更多武器組合",()=>{limit+=10;draw();}));
 }
 add(d,note,button("設定／匯入本構築權重",()=>show("v14")));
 if(model)add(d,node("p","命中以整組共同門檻計算；其他裝備命中不含這組武器。","gt-muted"),field("其他裝備命中 (%)",base),field("額外天賦命中 (%)",talent),field("自訂命中目標 (%)",cap));
 for(const e of [base,talent,cap])e.addEventListener("input",()=>{limit=10;draw();});
 d.append(out);draw();return d;
}
// External recommendations are evidence, not local combat simulation.
const communityBiS={"spec-1":{"path":"warrior/arms","method":"dps","builds":["twohand"],"picks":[{"id":"12592","name":"Blackblade of Shahram","slot":"雙手武器","type":"雙手劍","where":"黑石塔上層・General Drakkisath","known":true}],"community":"Arcanite Reaper","weighted":"Legionite Glaive"},"spec-2":{"path":"warrior/fury","method":"dps","builds":["dual"],"picks":[{"id":"11684","name":"Ironfoe","slot":"主手","type":"單手錘","where":"黑石深淵・Emperor Dagran Thaurissan","known":true},{"id":"12590","name":"Felstriker","slot":"副手","type":"匕首","where":"黑石塔上層・Warchief Rend Blackhand","known":true}],"community":"Persuader","weighted":"Ironwood Blade"},"spec-3":{"path":"warrior/protection","method":"tank","builds":["shield"],"picks":[{"id":"13006","name":"Mass of McGowan","slot":"主手","type":"主手錘","where":"取得來源未確認","known":false},{"id":"18696","name":"Intricately Runed Shield","slot":"副手","type":"盾牌","where":"通靈學院・Ras Frostwhisper","known":true}],"community":"Persuader","weighted":"Greenhammer"},"spec-4":{"path":"paladin/holy","method":"heal","builds":["general"],"picks":[{"id":"22315","name":"Hammer of Revitalization","slot":"主手","type":"單手錘","where":"厄運之槌・Isalien","known":true},{"id":"22319","name":"Tome of Divine Right","slot":"副手","type":"持有型副手","where":"黑石塔下層・Mor Grayhoof","known":true}],"community":"Hand of Righteousness","weighted":"Stormcarver"},"spec-5":{"path":"paladin/protection","method":"tank","builds":["shield"],"picks":[{"id":"18396","name":"Mind Carver","slot":"主手","type":"主手劍","where":"厄運之槌・Prince Tortheldrin","known":true},{"id":"18696","name":"Intricately Runed Shield","slot":"副手","type":"盾牌","where":"通靈學院・Ras Frostwhisper","known":true}],"community":"Sageblade","weighted":"Greenhammer"},"spec-6":{"path":"paladin/retribution","method":"dps","builds":["twohand"],"picks":[{"id":"13285","name":"The Blackrock Slicer","slot":"雙手武器","type":"雙手斧","where":"黑石塔下層・Spirestone Battle Lord","known":true}],"community":"Stormcarver","weighted":"Legionite Glaive"},"spec-7":{"path":"hunter/beast-mastery","method":"dps","builds":["pet"],"picks":[{"id":"13023","name":"Eaglehorn Long Bow","slot":"遠程","type":"弓","where":"取得來源未確認","known":false}],"community":"Legionite Glaive（近戰欄）","weighted":"Core Marksman Rifle"},"spec-8":{"path":"hunter/marksmanship","method":"dps","builds":["lonewolf"],"picks":[{"id":"13023","name":"Eaglehorn Long Bow","slot":"遠程","type":"弓","where":"取得來源未確認","known":false}],"community":"Legionite Glaive（近戰欄）","weighted":"Core Marksman Rifle"},"spec-9":{"path":"hunter/survival","method":"dps","builds":["weaving"],"picks":[{"id":"18738","name":"Carapace Spine Crossbow","slot":"遠程","type":"弩","where":"斯坦索姆・Nerub'enkan","known":true}],"community":"Legionite Glaive（近戰欄）","weighted":"Core Marksman Rifle"},"spec-10":{"path":"rogue/assassination","method":"dps","builds":["mutilate"],"picks":[{"id":"12590","name":"Felstriker","slot":"主手","type":"匕首","where":"黑石塔上層・Warchief Rend Blackhand","known":true},{"id":"12590","name":"Felstriker","slot":"副手","type":"匕首","where":"黑石塔上層・Warchief Rend Blackhand","known":true}],"community":"Heartseeker","weighted":"Greenhammer"},"spec-11":{"path":"rogue/combat","method":"dps","builds":["general"],"picks":[{"id":"11684","name":"Ironfoe","slot":"主手","type":"單手錘","where":"黑石深淵・Emperor Dagran Thaurissan","known":true},{"id":"10847","name":"Dragon's Call","slot":"副手","type":"單手劍","where":"阿塔哈卡神廟・Shade of Eranikus","known":true}],"community":"Persuader","weighted":"Greenhammer"},"spec-12":{"path":"rogue/subtlety","method":"dps","builds":["backstab"],"picks":[{"id":"12590","name":"Felstriker","slot":"主手","type":"匕首","where":"黑石塔上層・Warchief Rend Blackhand","known":true},{"id":"12590","name":"Felstriker","slot":"副手","type":"匕首","where":"黑石塔上層・Warchief Rend Blackhand","known":true}],"community":"Heartseeker","weighted":"Greenhammer"},"spec-13":{"path":"priest/discipline","method":"heal","builds":["general"],"picks":[{"id":"13360","name":"Gift of the Elven Magi","slot":"主手","type":"單手武器","where":"斯坦索姆・Balnazzar","known":true},{"id":"15805","name":"Penelope's Rose","slot":"副手","type":"持有型副手","where":"任務 Kirtonos the Herald","known":true}],"community":"Dreamstaff","weighted":"Lavastone Hammer"},"spec-14":{"path":"priest/holy","method":"heal","builds":["general"],"picks":[{"id":"13360","name":"Gift of the Elven Magi","slot":"主手","type":"單手武器","where":"斯坦索姆・Balnazzar","known":true},{"id":"15805","name":"Penelope's Rose","slot":"副手","type":"持有型副手","where":"任務 Kirtonos the Herald","known":true}],"community":"Resurgence Rod","weighted":"Lavastone Hammer"},"spec-15":{"path":"priest/shadow","method":"dps","builds":["general"],"picks":[{"id":"13937","name":"Headmaster's Charge","slot":"雙手武器","type":"法杖","where":"通靈學院・Darkmaster Gandling","known":true}],"community":"Wisepaw Totem","weighted":"Impervious Giant"},"spec-16":{"path":"shaman/elemental","method":"dps","builds":["general"],"picks":[{"id":"13937","name":"Headmaster's Charge","slot":"雙手武器","type":"法杖","where":"通靈學院・Darkmaster Gandling","known":true}],"community":"Galgann's Firehammer","weighted":"Stormcarver"},"spec-17":{"path":"shaman/enhancement","method":"dps","builds":["twohand"],"picks":[{"id":"13285","name":"The Blackrock Slicer","slot":"雙手武器","type":"雙手斧","where":"黑石塔下層・Spirestone Battle Lord","known":true}],"community":"Stormcarver","weighted":"Persuader"},"spec-18":{"path":"shaman/restoration","method":"heal","builds":["general"],"picks":[{"id":"13360","name":"Gift of the Elven Magi","slot":"主手","type":"單手武器","where":"斯坦索姆・Balnazzar","known":true},{"id":"15805","name":"Penelope's Rose","slot":"副手","type":"持有型副手","where":"任務 Kirtonos the Herald","known":true}],"community":"Hand of Righteousness","weighted":"Stormcarver"},"spec-19":{"path":"mage/arcane","method":"dps","builds":["general"],"picks":[{"id":"13937","name":"Headmaster's Charge","slot":"雙手武器","type":"法杖","where":"通靈學院・Darkmaster Gandling","known":true}],"community":"Sageblade","weighted":"Ironbark Staff"},"spec-20":{"path":"mage/fire","method":"dps","builds":["general"],"picks":[{"id":"280082","name":"Staff of Sorrow","slot":"雙手武器","type":"法杖","where":"取得來源未確認","known":false}],"community":"Sageblade","weighted":"Elemental Mage Staff"},"spec-21":{"path":"mage/frost","method":"dps","builds":["general"],"picks":[{"id":"280082","name":"Staff of Sorrow","slot":"雙手武器","type":"法杖","where":"取得來源未確認","known":false}],"community":"Sageblade","weighted":"Elemental Mage Staff"},"spec-22":{"path":"warlock/affliction","method":"dps","builds":["general"],"picks":[{"id":"13937","name":"Headmaster's Charge","slot":"雙手武器","type":"法杖","where":"通靈學院・Darkmaster Gandling","known":true}],"community":"Sageblade","weighted":"Ironbark Staff"},"spec-23":{"path":"warlock/demonology","method":"dps","builds":["general"],"picks":[{"id":"13937","name":"Headmaster's Charge","slot":"雙手武器","type":"法杖","where":"通靈學院・Darkmaster Gandling","known":true}],"community":"Sageblade","weighted":"Elemental Mage Staff"},"spec-24":{"path":"warlock/destruction","method":"dps","builds":["general"],"picks":[{"id":"13937","name":"Headmaster's Charge","slot":"雙手武器","type":"法杖","where":"通靈學院・Darkmaster Gandling","known":true}],"community":"Sageblade","weighted":"Elemental Mage Staff"},"spec-25":{"path":"druid/balance","method":"dps","builds":["general"],"picks":[{"id":"13937","name":"Headmaster's Charge","slot":"雙手武器","type":"法杖","where":"通靈學院・Darkmaster Gandling","known":true}],"community":"Galgann's Firehammer","weighted":"Impervious Giant"},"spec-26":{"path":"druid/feral-cat","method":"dps","builds":["general"],"picks":[{"id":"18420","name":"Bonecrusher","slot":"雙手武器","type":"雙手錘","where":"厄運之槌任務 The Treasure of the Shen'dralar","known":true}],"community":"Legionite Glaive","weighted":"Legionite Glaive（貓熊合併）"},"spec-27":{"path":"druid/feral-bear","method":"tank","builds":["general"],"picks":[{"id":"18531","name":"Unyielding Maul","slot":"雙手武器","type":"雙手錘","where":"厄運之槌北區・貢品","known":true}],"community":"Legionite Glaive","weighted":"Legionite Glaive（貓熊合併）"},"spec-28":{"path":"druid/restoration","method":"heal","builds":["general"],"picks":[{"id":"13360","name":"Gift of the Elven Magi","slot":"主手","type":"單手武器","where":"斯坦索姆・Balnazzar","known":true},{"id":"15805","name":"Penelope's Rose","slot":"副手","type":"持有型副手","where":"任務 Kirtonos the Herald","known":true}],"community":"Hand of Righteousness","weighted":"Lavastone Hammer"}};
const playerBiSNotes={"spec-2":["Cynara · 11/18","預算方案比較雷德雙劍套裝，昂貴製作品須先確認開放。"],"spec-5":["DwarfLord · 11/21","比較坦克版魂鑄套裝與命中需求。"],"spec-6":["Darens To Hero! · 11/25","懲戒法傷收益不可沿用純物理模型。"],"spec-10":["Teddys · 11/18（盜賊通用）","比較暗幕及雷暴套裝能量觸發，不代表截肢專用結論。"],"spec-11":["Teddys · 11/18（盜賊通用）","套裝能量收益與白字命中需另外計算。"],"spec-12":["Teddys · 11/18（盜賊通用）","比較套裝能量收益，背刺武器限制仍優先。"],"spec-13":["DoubleZug · 11/22（治療牧師）","比較副本裝及完整套裝，戒律護盾收益待獨立驗證。"],"spec-14":["DoubleZug · 11/22","易取得副本裝與完整套裝分開比較。"],"spec-17":["NickTew · 11/16","增強需計入法傷及套裝效果。"],"spec-22":["Kalamazi · 11/25","暗影、火焰及構築分開比較。"],"spec-23":["Kalamazi · 11/25","各構築的寵物及法術學派收益分開。"],"spec-24":["Kalamazi · 11/25","火焰與暗影流分開，核對寵物收益。"],"spec-28":["DoubleZug · 11/24","以副本裝作基準，另比較昂貴裝備與套裝。"]};
function sourceSlotMatches(ref,x){const slot=String(x.slot||"");if(ref.slot==="遠程")return /遠程|遠距|ranged/i.test(slot);if(ref.slot==="副手")return /副手|盾牌|off.hand/i.test(slot);if(ref.slot==="雙手武器")return isTwoHand(x.type)&&!/副手|遠程/i.test(slot);return /主手|單手|近戰|^武器$/i.test(slot)&&!/副手|遠程/i.test(slot)&&!isTwoHand(x.type);}
function communityMatch(id,key,x){const ref=communityBiS[id];if(!ref||!ref.builds.includes(key))return null;return ref.picks.find(p=>p.id===String(x.id)&&sourceSlotMatches(p,x))||null;}
function communityEvidenceView(spec,slots){
 const ref=communityBiS[spec.id];if(!ref)return null;const key=buildFor(spec.id);
 const d=node("details",undefined,"gt-card gt-community-bis");d.append(node("summary","外部 BiS 與玩家配裝交叉參考（11/25）"));
 const applicable=ref.builds.includes(key),melee=spec.id==="spec-9"&&key==="melee";
 add(d,node("p","Forever BiS：1.60.1.71091，11/25，聯盟團本前；"+({dps:"模擬輸出",tank:"模擬仇恨與承傷尖峰",heal:"技能資料加權，非戰鬥模擬"}[ref.method])+"。外站完整天賦、種族與實戰假設未逐一比對。","gt-muted"),link("Forever BiS 聯盟完整各部位","https://foreverbis.net/"+ref.path+"/alliance/"),node("p",""),link("Forever BiS 部落完整各部位","https://foreverbis.net/"+ref.path+"/horde/"));
 if(melee){add(d,node("p","純近戰不套用遠程生存獵排名。以下為 Skidrowtdd 11/20 玩家分享的5/13/33獨行雙持構築，與本站原16/10/25點法不同。"),node("p","主手：Dal'Rend's Sacred Charge — 黑石塔上層雷德；副手：Tooth of the Matriarch — Direhorn Matriarch（副本待查），或雷德套裝另一把劍；遠程屬性裝：Blackcrow — 黑石塔下層 Vosh'gajin。"),node("p","Careful Aim 智力轉攻強，Lone Wolf 無寵物，Predator's Edge 副手及近戰爆擊收益。未驗證獨立數值權重。","gt-muted"),link("玩家完整配裝、附魔與消耗品分享","https://www.reddit.com/user/Skidrow-543/comments/1y1br4n/skidrowtdds_wow_forever_melee_survival_hunter/"));}
 else if(!applicable)add(d,node("p","目前為另一玩法，僅提供專精層級來源，不套用基準候選順位。","gt-muted"));
 else{
  for(const p of ref.picks){const valid=!skillGate(spec.id,p),found=slots.flatMap(z=>z.items).find(x=>String(x.id)===p.id&&sourceSlotMatches(p,x));const c=box(d,p.slot+"｜"+p.name+"（ID "+p.id+"）",p.where);add(c,node("p",!valid?"與本站構築限制衝突，排除":!p.known?"外站高分但取得待查，不列已可刷取":found?"本站相同ID及部位已收錄；非完整BiS驗證":"本站候選未收錄此ID／部位，列入新增待核對","gt-muted"));}
  if(ref.picks.length>1&&ref.picks[0].id===ref.picks[1].id)add(d,node("p","外站主副手均列相同ID，未核對唯一裝備限制前，不當作整套武器推薦。","gt-muted"));
  add(d,node("p","其他來源首頁摘要：60.tools（較舊客戶端70888）："+ref.community+"；METAMMO（71139，單件加權）："+ref.weighted+"。各來源可能比較不同手位或天賦，不能視為一致結論。","gt-muted"));
 }
 add(d,link("60.tools 跨攻略排行","https://www.60.tools/bis"),node("p",""),link("METAMMO 客戶端加權","https://metammo.com/wow-forever/bis"),node("p",""),link("Zockify 配裝與附魔","https://www.zockify.com/forever/bis/"));
 if(playerBiSNotes[spec.id]){const [author,note]=playerBiSNotes[spec.id];add(d,node("p",author+"："+note),link("玩家攻略彙整與原影片","https://wowforever.vi.ki/pre-raid-best-in-slot-by-class-before-dec-9"));}
 return d;
}
const catWeaponEvidence=[{"id":"18420","name":"碎骨者（Bonecrusher，中文名待核）","dps":53.8,"str":26,"crit":14,"source":"厄運之槌西區任務 The Treasure of the Shen'dralar","reason":"較早外站模擬首選，但任務取得狀態有衝突；26力量帶來52攻強，14爆擊等級增加爆擊收益，對亡靈額外30攻強不計入通用模擬。固定任務獎勵，不必反覆刷掉落。","delta":0},{"id":"280018","name":"Hammer of Thundering Hooves（雷蹄戰錘，暫譯）","dps":53.9,"str":24,"crit":14,"sta":17,"source":"The Shaper's Terrace・Thunderhoof","reason":"武器DPS略高，但比碎骨者少2力量；17耐力提供生存。外站模擬單體落後1.4 DPS，實際差距很小。","delta":-1.4},{"id":"13393","name":"郵差戰錘（Malown's Slam，譯名待核）","dps":52.1,"source":"斯坦索姆・郵差 Malown","reason":"命中時可能增加53力量，持續20秒；觸發已納入外站模擬。雖然面板DPS略低，仍值得比較。","delta":-7},{"id":"250619","name":"Legionite Glaive（軍團戰戟，暫譯）","dps":53.9,"agi":16,"ap":54,"hit":10,"source":"鍛造300；拾取綁定及製作條件需核對","reason":"高武器DPS、敏捷、攻強及命中同時提供收益；Wowhead列替代BiS，單件加權網站亦偏好此物。未取得與上列相同模擬條件的數據，不強行排名。"},{"id":"19323","name":"無堅不摧之力（The Unstoppable Force）","dps":56.5,"str":18,"sta":17,"source":"奧特蘭克山谷聲望崇拜","reason":"Wowhead與多份攻略首選；56.5武器DPS、28爆擊等級。聲望商人與模擬資料庫開放狀態有衝突，已納入主要候選而非直接排除。"}];
const bisReasons=["雙手武器傷害、怒氣及技能使用比例；命中與爆擊需配合武器專精。","雙持主副手分別計算，白字命中及武器觸發另計；套裝不能用單件分數代替。","盾牌護甲、格擋、生存與仇恨；不能只依武器DPS。","治療加成、有效治療、法力續航及爆擊；以戰鬥時間分情境。","盾牌與承傷、神聖仇恨、法力續航；法傷不能套用純物理坦克權重。","雙手武器、神聖傷害與物理傷害比例；混合構築另算。","遠程DPS、寵物傷害及命中；近戰欄以實際使用方式評估。","遠程DPS、攻強、命中及爆擊；帶寵物與獨行者分開。","純近戰與近遠穿插分開；遠程DPS、近戰武器傷害及智力轉換需按技能比例。","雙匕首技能資格優先；毒藥、能量、命中及雙持觸發分開。","主副手類型、攻速、能量與命中；背刺變體要求匕首。","背刺／伏擊要求主手匕首；出血玩法另比較武器傷害。","護盾吸收、有效治療、法力續航；不得直接套神聖牧師結果。","有效治療、法力與施法節奏；團隊與坦克治療分開。","暗影傷害、命中、法力與持續傷害比例；治療裝非通用輸出。","自然／火焰法傷、法術命中及爆擊；近戰DPS不直接等於法術收益。","雙手近戰武器DPS、攻強、法術傷害與風怒觸發；永恆版本無雙持，另考量武器速度與技能循環。","治療加成、法力回復與多目標治療；圖騰與戰鬥時長影響選擇。","秘法傷害及法力消耗、爆擊、命中；不同法力策略需重算。","火焰法傷、命中與爆擊；持續效果及爆擊觸發依循環評估。","冰霜法傷、命中及爆擊；控制免疫與可凍結目標分情境。","暗影持續傷害、命中與法力；寵物及詛咒選擇影響權重。","寵物及本體傷害比例、法傷、命中；不能借用痛苦或毀滅排名。","火焰或暗影直傷、命中、爆擊；不同犧牲及寵物構築另計。","秘法／自然法術比例、命中與法力；11/25熱修後舊權重待重算。","形態武器DPS、力量、敏捷、爆擊、命中及武器觸發；慢速本身非優勢。","形態武器DPS、護甲、耐力、閃躲及仇恨；與貓德輸出排名不同。","持續治療、法力續航與實際有效治療；團隊及坦克場景分開。"];
const bluePosts=[{"key":"203","date":"2026-11-25","title":"線上修正－11月25日","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/wow-forever-hotfixes-november-25-2026/2403040/16","sections":[{"category":"職業","title":"德魯伊","body":"修復颶風最後一跳；起源天賦可正確影響颶風和寧靜。平衡詳細天賦改動另見同日專篇。","impact":"範圍輸出、治療模型須核對。","specs":[25,26,27,28]},{"category":"職業","title":"獵人","body":"寵物白字爆擊恢復正常；獵鷹即使寵物被動仍可攻擊，解散野獸或右鍵圖示可取消獵鷹。獵鷹爆擊偏低約5%的問題也已修復。","impact":"獸王寵物傷害不可套用熱修前結果。","specs":[7,8,9]},{"category":"職業","title":"聖騎士","body":"審判刷新問題修復，驅邪術可爆擊；神聖的聖光誓言延長到60分鐘。","impact":"懲戒與神聖循環需重新核對。","specs":[4,5,6]},{"category":"職業","title":"盜賊","body":"毒藥及致盲粉暫改拾取綁定；潛行中悶棍或擾亂會正確取消備戰狀態。","impact":"消耗品不能假設可由他人交易。","specs":[10,11,12]},{"category":"職業","title":"薩滿、術士與戰士","body":"閃電鏈正常消耗節能施法；術士寵物白字爆擊修正，魅魔與夢魔異常多出的約5%爆擊修復；戰場死亡後武器大師可重新套用。","impact":"寵物、節能及觸發收益待重算。","specs":[1,16,17,18,22,23,24]},{"category":"團本與物品","title":"副本與裝備","body":"黑澗深淵祭壇3秒後可再互動；哈卡化身生成修正。沙赫拉姆黑劍的加速僅對持有人生效，律法聖契開始影響命令審判。黑手飾物不再被抵抗。","impact":"黑劍不能按全隊加速計分；聖契收益須重核。","specs":[1,6]},{"category":"專業與附魔","title":"揭露附魔","body":"範圍傷害按波次而非每個目標判定觸發；不再覆蓋整段引導法術。","impact":"多目標與引導法術附魔排名需重新驗證。","specs":[15,16,19,20,21,22,23,24,25]},{"category":"戰場","title":"奧山","body":"將軍擊殺獎勵下降，目標及敵方NPC獎勵提升。額外聲望門檻20分鐘；將軍與元帥初始4層增益，每完成一項目標減少一層。","impact":"改以目標作戰，不以舊速刷聲望估算。","specs":[]},{"category":"任務與系統","title":"騎術及任務","body":"完成指定職業坐騎任務的聖騎士及術士可取得中級騎術，已完成者可找職業相關NPC免費補學。希利蘇斯暮光加密文件任務掉落修復，重複聲望任務仍未開放。","impact":"","specs":[]}]},{"key":"194","date":"2026-11-23","title":"線上修正－11月23日","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/wow-forever-hotfixes-november-25-2026/2403040/15","sections":[{"category":"職業","title":"野性德魯伊套裝","body":"Feralheart 四件套裝回能修正為每秒4點、共5秒。","impact":"套裝完整效果不能只按面板屬性排名；實際觸發頻率仍待驗證。","specs":[26,27]},{"category":"職業","title":"牧師、術士、戰士","body":"心靈視界不再觸發效果；暗牧精神鞭笞觸發的精神增益及暗影形態中的譴責修復；強烈可影響燒盡；未學致死打擊不可使用該技能。","impact":"相關技能及裝備權重需重驗。","specs":[1,15,24]},{"category":"團本與物品","title":"副本與世界增益","body":"奧達曼黑曜石哨兵恢復掉落；竊賊風帽移除等級限制。切換地區不再清除世界增益，但進入團本仍會清除。部分武器過量觸發已修復，芬古斯與暗月馬戲團的異常雙倍收益也已校正。","impact":"團本試算不可直接納入世界增益。","specs":[]},{"category":"專業與附魔","title":"料理及製作","body":"多種蚌肉餐改列耐力食物並修正進食收益，魚人鰭湯提升一個食物級距。迫擊砲重載配方與半人馬暖蹄鞋圖樣可正常學習。","impact":"重新核對耐力食物、材料及取得方式。","specs":[]}]},{"key":"192","date":"2026-11-20","title":"線上修正－11月20日","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/wow-forever-hotfixes-november-25-2026/2403040/14","sections":[{"category":"職業","title":"戰鬥盜賊、惡魔術士","body":"戳刺可藉劍刃亂舞命中第二目標；取消惡魔庇護時不再保留強化的護甲增益。","impact":"多目標及護甲收益要用新版條件。","specs":[11,23]},{"category":"團本與物品","title":"雷暴護甲三件套","body":"近戰觸發由4%回30能量改為3%回18能量。","impact":"平均每次符合條件的攻擊期望回能由1.2降至0.54，下降55%；未計額外觸發限制。","specs":[10,11,12]},{"category":"團本與物品","title":"副本重置","body":"每小時每座地城的重置進入上限由10次降至5次。","impact":"刷裝路線須納入時間限制。","specs":[]}]},{"key":"190","date":"2026-11-19","title":"線上修正－11月19日","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/wow-forever-hotfixes-november-25-2026/2403040/13","sections":[{"category":"職業","title":"懲戒騎士","body":"裝備雙手武器時，雙手武器專精的收益正確覆蓋神聖傷害。","impact":"舊純物理權重不適合直接沿用。","specs":[6]},{"category":"專業與附魔","title":"種子雜交","body":"重新啟用，加入失敗機率並排除稀少草藥種子。","impact":"","specs":[]},{"category":"團本與物品","title":"副本與掉落","body":"達拉然城大法師之影戰鬥中不再立刻消失；塑造者殿堂維崔斯毒性震擊降低傷害；大河林地稀有掉落修復。","impact":"","specs":[]}]},{"key":"179","date":"2026-11-13","title":"線上修正－11月13日","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/wow-forever-hotfixes-november-25-2026/2403040/10","sections":[{"category":"職業","title":"恢復德魯伊","body":"野性痊癒不可移動施法；治療係數由3.3%提高至6.6%。","impact":"治療屬性及移動情境需重算。","specs":[28]},{"category":"職業","title":"法師與聖騎士","body":"觸發傷害與暴風雪可解除冰霜新星；命令審判屬近戰攻擊並可觸發命中效果，其他審判屬遠程。","impact":"審判不能使用相同觸發模型。","specs":[4,5,6,21]},{"category":"職業","title":"風怒圖騰","body":"近戰技能即使未使用主手也能觸發；但雙手各自攻擊的技能只允許主手部分觸發。","impact":"截肢、旋風斬等不應計入副手風怒。","specs":[1,2,3,10,11,12,16,17,18]},{"category":"團本與物品","title":"裝備資料修正","body":"Taran Icebreaker 更正為雙手錘。祝福聖光指環移除命中，導魔師戒指改為法術能量，團本開放前可單向兌換；其他戒指、飾品及帽子屬性也有校正。","impact":"核對舊武器類型及戒指屬性，不以舊資料排名。","specs":[4,5,6,13,14,15,16,18,19,20,21,22,23,24,25,28]}]},{"key":"178","date":"2026-11-13","title":"技能訓練費用退款","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/lost-training-purchase-refunds-november-13/2415068/1","sections":[{"category":"客服與系統","title":"技能訓練費用退款","body":"受11月9日伺服器異常影響而遺失已購技能的玩家，可檢查遊戲信箱是否收到退款。"}]},{"key":"local-7","date":"2026-11-10","title":"拍賣場最低寄售金額調整","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/2403040/1","sections":[{"category":"客服與系統","title":"拍賣場最低寄售金額調整","body":"最低寄售金額下調至1銅幣，另修正部分郵件寄件人及送達時間異常。（官方彙整串可按日期查閱。）"}]},{"key":"local-8","date":"2026-11-08","title":"地城擊殺經驗值提高","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/2403040/1","sections":[{"category":"練等","title":"地城擊殺經驗值提高","body":"地城擊殺經驗值較先前提高50%。（官方彙整串可按日期查閱。）"}]},{"key":"199","date":"2026-11-25","title":"平衡德魯伊調整－11月25日","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/balance-druid-adjustments-november-25/2429007/1","sections":[{"category":"職業","title":"星光之怒（原強化憤怒）","body":"星火術額外縮短施法時間，每點0.1秒，最高0.5秒。","impact":"星火術施法頻率與法力消耗模型需重算。","specs":[25]},{"category":"職業","title":"月亮與星辰（原強化月火術）","body":"受到傷害時，星火術有50%／100%機率避免施法退條。","impact":"練等與受傷情境的天賦價值改變。","specs":[25]},{"category":"職業","title":"強化星火術","body":"由5階縮為2階，機率分別為8%及15%；已投3點以上的角色會獲得全數天賦點返還。","impact":"舊版天賦配置必須重新核對。","specs":[25]},{"category":"職業","title":"蝕星蔽月","body":"憤怒額外爆擊機率按階級增加7%、13%、20%，不再只依特定觸發狀態。","impact":"憤怒與星火術循環比例待重算。","specs":[25]},{"category":"職業","title":"夢境取代月怒","body":"對其他角色施放啟動時，自身可獲得20%、40%、60%、80%或100%的啟動收益。","impact":"法力續航及輔助價值改變。","specs":[25]},{"category":"職業","title":"梟獸形態","body":"形態內秘法、自然傷害均額外增加10%。","impact":"不要直接沿用熱修前的輸出排名。","specs":[25]}]},{"key":"202","date":"2026-11-25","title":"奧特蘭克山谷調整－11月25日","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/2429074/1","sections":[{"category":"戰場","title":"長時間對戰門檻","body":"額外聲望的對戰時長由60分鐘降為20分鐘。","impact":"","specs":[]},{"category":"戰場","title":"聲望分配","body":"中尉、墓地及礦坑的長局聲望獎勵提高；塔樓等目標的完成狀況仍影響總收益。","impact":"刷奧山崇拜的玩家應重視戰場目標；此公告本身不證明個別聲望物品已開放。","specs":[]}]},{"key":"175","date":"2026-11-11","title":"線上修正－11月11日（薩滿）","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/wow-forever-hotfixes-november-25-2026/2403040/9","sections":[{"category":"職業","title":"武器灌注與圖騰","body":"武器附加法術與武器圖騰可同時作用。 公告原列11/11，實際於11/12太平洋時間10:45上線。","impact":"武器附魔、風怒與灌注須分開記錄。","specs":[16,17,18]},{"category":"職業","title":"風暴打擊、心靈迅敏","body":"風暴打擊傷害從150%武器傷害降為100%，冷卻6秒增至8秒；智力轉攻強由50/100/150%降為33/66/100%。","impact":"增強薩滿不可套用舊版智力及武器DPS收益。","specs":[17]},{"category":"職業","title":"氣漩武器","body":"每層縮短20%施法時間及法力消耗，依天賦階數每分鐘觸發6至10次（原20次）。滿階3.6秒武器顯示60%機率，2秒武器約33%。","impact":"攻速與每分鐘觸發要分開計算。","specs":[17]}]},{"key":"182","date":"2026-11-16","title":"線上修正－11月16日","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/wow-forever-hotfixes-november-20-2026/2403040/11","sections":[{"category":"職業","title":"德魯伊與暗影牧師","body":"野性痊癒各階冷卻修復，起源可影響突襲流血。暗黑鼓舞不能在隊內疊加；維護後吸血鬼的擁抱團隊治療係數20%降至10%，施法者自身收益加倍。","impact":"暗牧團隊治療及多暗牧增益需重核。","specs":[15,26,28]},{"category":"職業","title":"薩滿與風怒","body":"風怒不再忽略護甲，恢復內部冷卻和怒氣生成；截肢、斬殺等額外判定修復，盾牌攻擊不應觸發。氣漩武器不能同時影響兩次施法。","impact":"風怒與氣漩武器模型需重新驗證。","specs":[1,2,3,10,16,17]},{"category":"職業","title":"盜賊及狂戰","body":"毒藥最高等級修正；戳刺不再誤消其他目標連擊點。英勇打擊及順劈斬的怒不可遏、亂舞及魯莽揮擊判定修正。","impact":"狂戰怒氣與攻速模型、盜賊連擊點模型待更新。","specs":[2,10,11,12]},{"category":"專業與附魔","title":"鞋子加速","body":"聲望購買的鞋子加速公式改為拾取綁定。","impact":"公式取得與成品附魔服務不可混為一談。","specs":[]}]},{"key":"187","date":"2026-11-17","title":"線上修正－11月17日","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/wow-forever-hotfixes-november-20-2026/2403040/12","sections":[{"category":"職業","title":"薩滿及世界增益","body":"風怒命中不再消耗亂舞層數；暴風城之力與酋長的祝福在死亡後正常取消，且不套用非玩家。","impact":"攻速、團隊增益需使用新版條件。","specs":[2,17]},{"category":"團本與物品","title":"防騎套裝與法杖","body":"坦克魂鑄套裝由力量轉為法術能量；雪白法杖與細碎法杖統一為25耐力、25智力及74武器傷害衍生法術能量。","impact":"防騎法術能量是重要仇恨屬性；法杖不可重複計入武器衍生法能。","specs":[5,13,14,15,16,18,19,20,21,22,23,24,25,28]},{"category":"團本與物品","title":"黑石塔上層","body":"敵人生命與傷害恢復預期難度。","impact":"刷裝路線不能按修正前的難度估算。","specs":[]},{"category":"戰場","title":"奧山戰役","body":"戰役任務需58級才可接。","impact":"","specs":[]}]},{"key":"180","date":"2026-11-14","title":"地城經驗值限制調整－11月14日","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/player-level-dungeon-xp-adjustment-november-14/2416343/1","sections":[{"category":"練等","title":"高等級隊友限制","body":"隊內高等級玩家比敵人高出超過12級（13級或更多）時，該敵人擊殺經驗值才會被取消；部署時已開始的副本不受此次改動。","impact":"舊版帶刷練等建議需更新。","specs":[]}]},{"key":"lockbox-20261123","date":"2026-11-23","title":"鎖箱功能修復進度","author":"Kaivax","url":"https://us.forums.blizzard.com/en/wow/t/2426335/4","sections":[{"category":"客服與系統","title":"鎖箱暫時限制","body":"暴雪說明11月22日美西時間上午9:55起採取暫時措施，正在修復查看鎖箱內容及部分拾取的功能，尚未公布修復完成時間。"}]}];
function specHotfixes(id){
 const n=Number(String(id).split("-")[1]);return bluePosts.flatMap(p=>p.sections.filter(x=>x.impact&&x.specs?.includes(n)).map(x=>({date:p.date,title:x.title,impact:x.impact,url:p.url}))).sort((a,b)=>b.date.localeCompare(a.date));
}
function feralSetView(spec){
 if(spec.id!=="spec-26")return null;
 const d=node("details",undefined,"gt-card gt-feral-set");
 add(d,node("summary","貓德整套方案：T0.5 四件與散件比較"),node("p","Wowhead 的四件套方案使用頭、肩、腕、腳；另一份11/27攻略偏向散件。四件裝的任務成本較高，但不應因取得難度而排除。"),node("p","2件：全抗性+8；3件：每5秒回8法力；4件：近戰觸發5秒共20能量（每秒4）；6件：40攻強及23法術傷害／治療。觸發率與角色輸出仍待同條件模擬。"),node("p","四件套效果只能計一次。下面四件是候選，不代表一定要穿滿六件。","gt-muted"));
 for(const p of expandedGear.filter(x=>x.setGroup==="feralheart-cat"))add(d,link(zhItem(p),p.refs[0]),node("p",p.kind+" · "+p.source,"gt-muted"));
 add(d,link("四件方案及附魔參考","https://www.wowhead.com/forever/guide/classes/druid/feral/bis-gear-dps"),node("p",""),link("11/27 散件及取得資料","https://www.zockify.com/forever/bis/?class=druid&faction=alliance&phase=pre-raid&spec=feral"),node("p",""),link("11/23 套裝熱修","https://us.forums.blizzard.com/en/wow/t/2403040/15"));return d;
}
function liveClassHotfixView(spec){
 const d=node("details",undefined,"gt-card gt-live-hotfix");
 const out=node("div");add(d,node("summary","自動藍帖 · 此職業可能受影響"),node("p","依官方英文公告中的職業名稱自動辨識；不是專精、技能或裝備影響的已驗證結論，不會直接改動BiS排名。","gt-muted"),out);
 let loaded=false;
 d.addEventListener("toggle",async()=>{if(!d.open||loaded)return;loaded=true;out.replaceChildren(node("p","讀取自動同步資料…"));
 try{const r=await fetch("official-blue-live.json",{cache:"no-cache"});if(!r.ok)throw Error("HTTP");const data=await r.json();if(!d.isConnected)return;if(data.format!==1||!Array.isArray(data.posts))throw Error("format");
 const posts=liveClassPosts(spec.id,data.posts);out.replaceChildren(node("p",blueCheckpointText(data),"gt-muted"));
 for(const p of posts)add(out,node("p",p.date+"｜"+p.title),node("p",p.translationStatus==="pending"?"翻譯待處理":"機器重點待人工核對","gt-muted"),link("閱讀官方公告",p.url));
 if(!posts.length)out.append(node("p","目前自動同步資料未標記此職業；不代表沒有相關改動。","gt-muted"));
 }catch(e){loaded=false;out.replaceChildren(node("p","自動資料暫時無法讀取；收合再展開可重試。"));}
 });return d;
}
function bisReasonView(spec){
 const d=node("section",undefined,"gt-card");add(d,node("h4","本專精配裝判斷依據"),node("p",bisReasons[Number(spec.id.split("-")[1])-1]),node("p","本段是裝備評估原則，不是已驗證的屬性權重。未模擬套裝、觸發與完整角色配置前，不將舊單件排名當作最終BiS。","gt-muted"));const updates=specHotfixes(spec.id);if(updates.length){const hot=node("details",undefined,"gt-spec-hotfix");hot.append(node("summary","影響此專精的近期熱修（"+updates.length+" 項）"));for(const x of updates){add(hot,node("p",x.date+"｜"+x.title+"："+x.impact),link("公告來源",x.url));}d.append(hot);}d.append(liveClassHotfixView(spec));return d;
}
function catWeaponResearch(spec){
 if(spec.id!=="spec-26"||feralWeaponMode(spec.id)!=="twohand")return null;
 const d=node("section",undefined,"gt-card gt-cat-evidence");
 add(d,node("h4","為什麼貓德推薦這些武器？"),node("p","永恆版貓形態的基礎武器傷害按裝備DPS換算，固定1秒攻速；武器附魔及觸發效果在形態中生效。不能用面板慢速直接判定技能傷害較高。"),link("暴雪官方職業機制（9/30）","https://worldofwarcraft.blizzard.com/en-us/news/24301515/"),node("p","力量每點提供2攻強；敏捷、爆擊、命中與特殊效果另計。下列外站11/25模擬差距是角色輸出DPS，不是武器DPS；未在本站重跑。","gt-muted"));
 for(const p of catWeaponEvidence){
  const c=node("details");if(p.delta===0)c.open=true;add(c,node("summary",p.name+" ｜ 武器 "+p.dps.toFixed(1)+" DPS"+(p.delta!==undefined?" ｜ 外站單體 "+(p.delta===0?"基準":p.delta+" DPS"):" ｜ 不同來源候選")),node("p",p.source),node("p",p.reason));
  const stats=[["力量",p.str],["敏捷",p.agi],["攻強",p.ap],["爆擊等級",p.crit],["命中等級",p.hit],["耐力",p.sta]].filter(x=>x[1]!==undefined).map(x=>x.join(" +")).join(" · ");if(stats)c.append(node("p",stats,"gt-muted"));c.append(link("物品資料（ID "+p.id+"）","https://www.wowhead.com/forever/item="+p.id));d.append(c);
 }
 add(d,node("p","舊版和平製造者（50.4武器DPS）等候選僅屬舊資料，不再視為已驗證BiS；對比53.8的Bonecrusher少3.4武器DPS，仍需看其餘屬性。聲望裝、製作裝及掉落裝分開比較；外站對Bonecrusher取得狀態也有不同紀錄，接任務前請核對遊戲內獎勵。","gt-muted"),link("Forever BiS 11/25 模擬及完整配裝","https://foreverbis.net/druid/feral-cat/alliance/"),node("p",""),link("Wowhead 貓德配裝（不同排序）","https://www.wowhead.com/forever/guide/classes/druid/feral/bis-gear-dps"),node("p",""),link("軍團戰戟客戶端物品資料","https://bindonforever.com/item/250619"));
 return d;
}
// V18.5 acquisition evidence: sources are not automatically equivalent to confirmed BiS.
const expandedGear=[{"id":19323,"name":"無堅不摧之力（豬頭槌）","type":"雙手錘","kind":"雙手武器","specs":[1,6,17,26,27],"stats":{"力量":18,"耐力":17,"致命一擊等級":28},"wm":{"每秒傷害":"56.5","速度（秒）":"3.60","傷害範圍":"152–255"},"source":"奧特蘭克山谷・雷矛衛隊／霜狼氏族崇拜商人","tag":"聲望","bond":"拾取綁定","availability":"多攻略列可購；模擬資料庫開放標記衝突，遊戲內商人待核","reason":"貓德形態武器DPS高，另有力量與爆擊；Wowhead 貓德主手首選。昏迷觸發不等於團本DPS。","refs":["https://www.wowhead.com/forever/guide/classes/druid/feral/bis-gear-dps","https://wowbis.app/bis/druid/feral/"]},{"id":19325,"name":"胡里奧指環（Don Julio's Band）","type":"戒指","kind":"戒指","specs":[1,2,3,5,6,7,8,9,10,11,12,17,26,27],"stats":{"耐力":10,"命中等級":10,"致命一擊等級":14,"攻擊強度":14},"source":"奧特蘭克山谷・雷矛衛隊／霜狼氏族崇拜商人","tag":"聲望","bond":"拾取綁定","availability":"多攻略列可購；遊戲內商人待核","reason":"物理命中、爆擊與攻強；唯一裝備，不能在兩個戒指欄同時裝備兩枚。","refs":["https://wowbis.app/bis/druid/feral/","https://foreverbis.net/item/19325/"]},{"id":252484,"name":"木喉外衣（Timbermaw Tunic，暫譯）","type":"皮甲","kind":"胸部","specs":[1,2,6,17,26,27],"stats":{"力量":33,"敏捷":18,"致命一擊等級":14,"護甲":187},"source":"製皮300；裝備綁定，可從拍賣場購買","tag":"製作","bond":"裝備綁定","availability":"11/25 歐美PvP拍賣場有掛單紀錄","reason":"力量與敏捷及爆擊適合物理輸出；貓德攻略列胸甲首選，實戰須計套裝收益。","refs":["https://www.wowhead.com/forever/guide/classes/druid/feral/bis-gear-dps","https://metammo.com/guides/wow-forever-boe-epics-prices"]},{"id":14554,"name":"踏雲腿鎧（Cloudkeeper Legplates，暫譯）","type":"鎧甲","kind":"腿部","specs":[1,2,3,5,6],"stats":{"力量":20,"敏捷":20,"耐力":20,"護甲":617},"source":"世界掉落（經典來源推定，永恆確切怪物待核）；裝綁","tag":"世界掉落","bond":"裝備綁定","availability":"物品資料標記已開放；掉落來源待核","reason":"使用可增加100攻強30秒，冷卻15分鐘；短戰與長戰收益不同。武器戰攻略列入配裝。","refs":["https://foreverbis.net/item/14554/","https://www.zockify.com/forever/bis/?class=warrior&faction=alliance&phase=pre-raid&spec=arms"]},{"id":14552,"name":"牢獄肩鎧（Stockade Pauldrons，暫譯）","type":"鎧甲","kind":"肩部","specs":[3,5],"stats":{"耐力":20,"護甲":472,"防禦等級":10,"法術傷害與治療":12},"source":"世界掉落（攻略記載，永恆確切怪物待核）；裝綁","tag":"世界掉落","bond":"裝備綁定","availability":"物品資料標記已開放；掉落來源待核","reason":"護甲、防禦與法傷；防騎可兼顧生存與神聖仇恨。","refs":["https://foreverbis.net/item/14552/","https://frostyboost.com/blog/guides/wow-forever-bis-list"]},{"id":18405,"name":"大法師腰帶","type":"布甲","kind":"腰部","specs":[4,13,14,15,16,18,19,20,21,22,23,24,25,28],"stats":{"耐力":10,"智力":16,"致命一擊等級":14,"法術傷害與治療":20,"護甲":54},"source":"裁縫製作；裝備綁定","tag":"製作","bond":"裝備綁定","availability":"11/25 歐美PvP拍賣場有掛單紀錄","reason":"法傷、爆擊及智力；與專用治療腰帶比較時需分開計算。","refs":["https://foreverbis.net/item/18405/","https://metammo.com/guides/wow-forever-boe-epics-prices"]},{"id":22384,"name":"說服者（Persuader，譯名待核）","type":"單手錘","kind":"主手","specs":[2,3,5,11],"stats":{"命中等級":10,"致命一擊等級":14},"wm":{"每秒傷害":"45.7","速度（秒）":"2.80","傷害範圍":"89–167"},"source":"鍛造製作；裝備綁定","tag":"製作","bond":"裝備綁定","availability":"11/25 歐美PvP拍賣場有掛單紀錄","reason":"命中與爆擊加上慢速主手；唯一裝備，需比較完整雙持組合。","refs":["https://foreverbis.net/item/22384/","https://metammo.com/guides/wow-forever-boe-epics-prices"]},{"id":22383,"name":"賢者之刃（Sageblade，暫譯）","type":"主手劍","kind":"主手","specs":[4,5,19,20,21,22,23,24],"stats":{"耐力":14,"智力":6,"命中等級":10},"wm":{"每秒傷害":"31.1","速度（秒）":"1.80","傷害範圍":"39–73"},"source":"鍛造製作；裝備綁定","tag":"製作","bond":"裝備綁定","availability":"11/25 歐美PvP拍賣場有掛單紀錄","reason":"外站記載94法術傷害與治療，但標為未顯示在遊戲提示，暫不加入計分；需核對實際收益。","refs":["https://foreverbis.net/item/22383/","https://metammo.com/guides/wow-forever-boe-epics-prices"]},{"id":226792,"name":"Feralheart Cap","type":"皮甲","kind":"頭部","specs":[26],"stats":{"力量":17,"敏捷":16,"耐力":17,"智力":14,"護甲":150,"致命一擊等級":14},"source":"T0.5 野性之心升級任務及兌換；聯盟鐵爐堡 Deliana／部落奧格瑪 Mokvar；各件前置依任務鏈","tag":"任務","bond":"拾取綁定","availability":"外部資料標示已開放；完整升級任務及當前可取得進度須核對","reason":"貓德 T0.5 四件方案候選。11/23 熱修後近戰觸發每秒回4能量、持續5秒；未驗證觸發頻率及整套收益。不可將四件效果重複加在每一件。","refs":["https://foreverbis.net/item/226792/","https://www.wowhead.com/forever/guide/classes/druid/feral/bis-gear-dps","https://us.forums.blizzard.com/en/wow/t/2403040/15"],"setGroup":"feralheart-cat"},{"id":226790,"name":"Feralheart Epaulets","type":"皮甲","kind":"肩部","specs":[26],"stats":{"力量":10,"敏捷":10,"耐力":11,"智力":11,"護甲":136,"致命一擊等級":7},"source":"T0.5 野性之心升級任務及兌換；聯盟鐵爐堡 Deliana／部落奧格瑪 Mokvar；各件前置依任務鏈","tag":"任務","bond":"拾取綁定","availability":"外部資料標示已開放；完整升級任務及當前可取得進度須核對","reason":"貓德 T0.5 四件方案候選。11/23 熱修後近戰觸發每秒回4能量、持續5秒；未驗證觸發頻率及整套收益。不可將四件效果重複加在每一件。","refs":["https://foreverbis.net/item/226790/","https://www.wowhead.com/forever/guide/classes/druid/feral/bis-gear-dps","https://us.forums.blizzard.com/en/wow/t/2403040/15"],"setGroup":"feralheart-cat"},{"id":226788,"name":"Feralheart Bands","type":"皮甲","kind":"手腕","specs":[26],"stats":{"力量":10,"敏捷":8,"耐力":9,"智力":9,"護甲":79},"source":"T0.5 野性之心升級任務及兌換；聯盟鐵爐堡 Deliana／部落奧格瑪 Mokvar；各件前置依任務鏈","tag":"任務","bond":"拾取綁定","availability":"外部資料標示已開放；完整升級任務及當前可取得進度須核對","reason":"貓德 T0.5 四件方案候選。11/23 熱修後近戰觸發每秒回4能量、持續5秒；未驗證觸發頻率及整套收益。不可將四件效果重複加在每一件。","refs":["https://foreverbis.net/item/226788/","https://www.wowhead.com/forever/guide/classes/druid/feral/bis-gear-dps","https://us.forums.blizzard.com/en/wow/t/2403040/15"],"setGroup":"feralheart-cat"},{"id":226794,"name":"Feralheart Walkers","type":"皮甲","kind":"腳部","specs":[26],"stats":{"力量":12,"敏捷":11,"耐力":13,"智力":12,"護甲":127,"精神":10},"source":"T0.5 野性之心升級任務及兌換；聯盟鐵爐堡 Deliana／部落奧格瑪 Mokvar；各件前置依任務鏈","tag":"任務","bond":"拾取綁定","availability":"外部資料標示已開放；完整升級任務及當前可取得進度須核對","reason":"貓德 T0.5 四件方案候選。11/23 熱修後近戰觸發每秒回4能量、持續5秒；未驗證觸發頻率及整套收益。不可將四件效果重複加在每一件。","refs":["https://foreverbis.net/item/226794/","https://www.wowhead.com/forever/guide/classes/druid/feral/bis-gear-dps","https://us.forums.blizzard.com/en/wow/t/2403040/15"],"setGroup":"feralheart-cat"},{"id":2915,"name":"Taran Icebreaker","type":"雙手錘","kind":"雙手武器","specs":[1,6,17,26,27],"stats":{"耐力":14,"雙手錘技能":1},"wm":{"每秒傷害":"49.7","速度（秒）":"3.80","傷害範圍":"151–227"},"source":"裝備綁定；永恆確切掉落來源待查","tag":"裝綁","bond":"裝備綁定","availability":"11/24 伺服器快取已確認物品提示；當前掉落待核","reason":"11/13 更正為雙手錘。命中觸發火球造成270–330火傷，另有8秒100火傷；觸發機率與形態收益尚待實測。較低武器DPS不代表必定較差，也不列為已驗證BiS。","refs":["https://bindonforever.com/item/2915","https://us.forums.blizzard.com/en/wow/t/2403040/10"]}];
function expandedSlot(kind,slots){
 const keys=Array.from(slots.keys());
 const tests={"雙手武器":/雙手武器|雙手/,"主手":/主手|單手武器/,"戒指":/戒指|指環/,"胸部":/胸部|胸甲|胸/,"腿部":/腿部|腿甲|腿/,"肩部":/肩部|肩甲|肩/,"腰部":/腰部|腰帶|腰/,"頭部":/頭部|頭盔|頭|帽/,"手腕":/手腕|護腕|腕/,"腳部":/腳部|足部|鞋|靴|腳/};
 return keys.filter(k=>tests[kind]?.test(k)&&!(kind==="主手"&&/副手|雙手/.test(k)));
}
function expandCandidateSlots(spec){
 const result=new Map(Array.from(spec.slots,([k,items])=>[k,items.filter(x=>String(x.id)!=="2915")]));
 for(const p of expandedGear.filter(x=>x.specs.includes(Number(spec.id.split("-")[1])))){
  let keys=expandedSlot(p.kind,result);if(!keys.length){keys=[p.kind];result.set(p.kind,[]);}
  for(const slot of keys){
   const items=result.get(slot),idx=items.findIndex(x=>String(x.id)===String(p.id)),old=idx>=0?items[idx]:null;
   const x={...(old||{}),id:String(p.id),name:p.name,url:"https://foreverbis.net/item/"+p.id+"/",slot,type:p.type,stats:p.stats,wm:p.wm||{},rank:0,source:p.source,evidence:p.refs.join(" ｜ "),note:p.reason,review:"",acquisition:p.tag,bond:p.bond,availability:p.availability,sourceRefs:p.refs,setGroup:p.setGroup||"",externalCandidate:true,priority:spec.id==="spec-26"&&p.id===19323&&feralWeaponMode(spec.id)==="twohand"};
   if(idx>=0)items[idx]=x;else items.push(x);
  }
 }
 return result;
}
function acquisitionMatches(x,selected){
 if(!selected)return true;
 const source=String(x.source||""),bond=String(x.bond||"");
 if(selected==="裝綁")return /裝備(?:後)?綁定|裝綁|binds when equipped|\bboe\b/i.test(source+" "+bond)||acquisitionType(x)==="裝綁";
 return acquisitionType(x)===selected;
}
function acquisitionType(x){if(x.acquisition)return x.acquisition;const s=String(x.source||"");if(/聲望|崇拜|尊敬|崇敬|reputation/i.test(s))return "聲望";if(/世界掉落|world drop/i.test(s))return "世界掉落";if(/製作|鍛造|製皮|裁縫|工程|crafted/i.test(s))return "製作";if(/裝備綁定|裝綁|拍賣|BoE/i.test(s))return "裝綁";if(/任務|quest/i.test(s))return "任務";if(/商人|購買|兌換|vendor/i.test(s))return "商人";return "其他";}
const gearCatalogClasses=["Warrior","Paladin","Hunter","Rogue","Priest","Shaman","Mage","Warlock","Druid"],gearClassBits=[1,2,3,4,5,7,8,9,11];
const gearSlotNames={"Head":"頭部","Neck":"頸部","Shoulder":"肩部","Back":"背部","Chest":"胸部","Robe":"胸部","Wrist":"手腕","Hands":"手部","Waist":"腰部","Legs":"腿部","Feet":"腳部","Finger":"戒指","Trinket":"飾品","One-Hand":"主手","Main Hand":"主手","Off Hand":"副手","Held In Off-hand":"副手","Shield":"副手","Two-Hand":"雙手武器","Ranged":"遠程","Thrown":"遠程","Relic":"聖物"};
const gearStatNames={strength:"力量",agility:"敏捷",stamina:"耐力",intellect:"智力",spirit:"精神",attack_power:"攻擊強度",ranged_attack_power:"遠程攻強",hit:"命中（來源單位）",crit:"爆擊（來源單位）",haste:"急速（來源單位）",spell_power:"法術能量",healing:"治療",spell_damage:"法術傷害",mp5:"每5秒法力",armor:"護甲",bonus_armor:"額外護甲",defense:"防禦",dodge:"閃躲",parry:"招架",block:"格擋",block_value:"格擋值",fire_res:"火焰抗性",frost_res:"冰霜抗性",nature_res:"自然抗性",shadow_res:"暗影抗性",arcane_res:"秘法抗性"};
function gearClassIndex(id){const n=Number(String(id).split("-")[1]);return Number.isInteger(n)&&n>=1&&n<=28?Math.min(8,Math.floor((n-1)/3)):-1;}
function gearType(x){const map={"One-Handed Axe":"單手斧","Two-Handed Axe":"雙手斧","One-Handed Mace":"單手錘","Two-Handed Mace":"雙手錘","One-Handed Sword":"單手劍","Two-Handed Sword":"雙手劍","Bow":"弓","Gun":"槍械","Crossbow":"弩","Wand":"魔杖","Thrown":"投擲武器","Spear":"長矛","Dagger":"匕首","Fist Weapon":"拳套","Staff":"法杖","Polearm":"長柄武器","Shield":"盾牌","Miscellaneous":"持有型副手","Idol":"塑像","Totem":"圖騰","Libram":"聖契","Cloth":"布甲","Leather":"皮甲","Mail":"鎖甲","Plate":"鎧甲"};if(x.slot==="Held In Off-hand")return "持有型副手";if(x.slot==="Shield")return "盾牌";const type=map[x.subclass]||x.subclass||"";return (x.slot==="Two-Hand"&&!/雙手/.test(type)?"雙手":x.slot==="Main Hand"?"主手限定":x.slot==="One-Hand"&&!/單手/.test(type)?"單手":"")+type;}
const gearArmorTier={Cloth:0,Leather:1,Mail:2,Plate:3};
const gearArmorMax={Warrior:3,Paladin:3,Hunter:2,Shaman:2,Rogue:1,Druid:1,Priest:0,Mage:0,Warlock:0};
function gearArmorEligible(cls,subclass,p){
 if(Object.hasOwn(gearArmorTier,subclass))return Object.hasOwn(gearArmorMax,cls)&&gearArmorTier[subclass]<=gearArmorMax[cls];
 return subclass==="Shield"&&["Warrior","Paladin","Shaman"].includes(cls)&&p?.armor?.Shield!==undefined&&Number(p.armor.Shield)<=60;
}
function gearCrossArmor(cls,x){return x.item_class==="Armor"&&Object.hasOwn(gearArmorTier,x.subclass)&&gearArmorTier[x.subclass]<gearArmorMax[cls]&&!["Back"].includes(x.slot);}
function gearCatalogEligible(spec,x,prof,position=""){
 if(String(x.id)==="2915"&&(x.slot!=="Two-Hand"||x.subclass!=="Two-Handed Mace"))return false;
 const index=gearClassIndex(spec.id);if(index<0)return false;const cls=gearCatalogClasses[index],bit=1<<(gearClassBits[index]-1),p=prof[cls]||prof[cls?.toLowerCase()];
 if(!p||!gearSlotNames[x.slot]||Number(x.required_level||0)>60||!["Weapon","Armor"].includes(x.item_class))return false;
 const mask=Number(x.class_mask??-1);if(mask!==-1&&mask!==0&&!(mask&bit))return false;
 // The API's proficiency list is explicitly Classic-era; Forever added rogue axes and druid polearms.
 if(x.item_class==="Weapon"&&!p.weapons?.includes(x.subclass)&&!(cls==="Druid"&&x.subclass==="Polearm")&&!(cls==="Rogue"&&x.subclass==="One-Handed Axe"))return false;
 if(x.item_class==="Weapon"&&x.slot==="Off Hand"&&!["Warrior","Hunter","Rogue"].includes(cls))return false;
 if(x.item_class==="Armor"&&["Cloth","Leather","Mail","Plate","Shield"].includes(x.subclass)&&!gearArmorEligible(cls,x.subclass,p))return false;
 if(x.item_class==="Armor"&&["Idol","Libram","Totem"].includes(x.subclass)&&!({Druid:"Idol",Paladin:"Libram",Shaman:"Totem"}[cls]===x.subclass))return false;
 const candidate={slot:gearSlotNames[x.slot],type:gearType(x)};
 // Generic one-hand weapons may also be usable in off-hand; check both without inventing a dual-wield permission.
 const main=allowed(spec.id,candidate),off=x.slot==="One-Hand"&&allowed(spec.id,{...candidate,slot:"副手"})&&["Warrior","Hunter","Rogue"].includes(cls);
 if(position==="副手")return (gearSlotNames[x.slot]==="副手"&&main)||off;
 if(position)return gearSlotNames[x.slot]===position&&main;
 return main||off;
}
function gearCatalogTags(x){const src=String(x.source_summary||""),rep=String(x.required_reputation||""),bond=String(x.bonding||"");const tags=[];if(/world.drop/i.test(src))tags.push("世界掉落");if(/equip|BoE|裝備綁定/i.test(bond))tags.push("裝綁");if(/craft/i.test(src))tags.push("製作");if(rep||/reputation|exalted|revered|honored/i.test(src))tags.push("聲望");if(/quest/i.test(src))tags.push("任務");if(/vendor/i.test(src))tags.push("商人");if(/drop/i.test(src)&&!tags.includes("世界掉落"))tags.push("掉落");return tags.length?tags:["待查"];}
// Compare only identical catalog fields, never equate rating and percentage.
function catalogDiff(a,b){
 const fields=[["dps","武器DPS"],...Object.entries(gearStatNames)];
 return fields.map(([key,label])=>({key,label,a:Number(a[key]||0),b:Number(b[key]||0)})).filter(x=>Number.isFinite(x.a)&&Number.isFinite(x.b)&&x.a!==x.b).map(x=>({...x,delta:Math.round((x.a-x.b)*100)/100}));
}
// Only unambiguous base fields are shared with the legacy model. No implicit rating/percent conversion.
const catalogWeightFields={strength:"力量",agility:"敏捷",stamina:"耐力",intellect:"智力",spirit:"精神",armor:"護甲",attack_power:"攻擊強度",ranged_attack_power:"遠程攻強",spell_power:"法術能量",spell_damage:"法術傷害",healing:"治療加成",mp5:"每5秒法力",block_value:"格擋值"};
// The catalog keeps spell_power, spell_damage and healing as separate client stat fields.
function catalogWeightCoverage(weights){
 const labels=new Set(Object.values(catalogWeightFields));
 return Object.entries(weights||{}).filter(([k,v])=>Number.isFinite(v)&&v>0&&!labels.has(k)).map(([k])=>k);
}
function catalogWeightScore(x,weights){
 let total=0,used=0;const parts=[];
 for(const [field,label] of Object.entries(catalogWeightFields)){
  const weight=weights?.[label];if(!Number.isFinite(weight)||weight<=0)continue;
  const value=Number(x[field]??0);if(!Number.isFinite(value))continue;
  used++;total+=value*weight; if(value)parts.push({label,value,weight});
 }
 return {total,used,parts};
}
function catalogSameSlot(a,b){return !!a&&!!b&&!!gearSlotNames[a.slot]&&gearSlotNames[a.slot]===gearSlotNames[b.slot];}
function catalogCandidateIds(spec){return new Set([...expandCandidateSlots(spec).values()].flat().filter(x=>allowed(spec.id,x)).map(x=>String(x.id)));}
function catalogCandidateFilter(x,knownIds,mode){return mode==="new"?!knownIds.has(String(x.id)):mode==="known"?knownIds.has(String(x.id)):true;}
function catalogSourceRecorded(x){return !Number(x.estimated)&&typeof x.source_summary==="string"&&!!x.source_summary.trim();}
function validGearCatalog(d){return !!d&&Array.isArray(d.items)&&d.items.length>0&&!!d.prof&&typeof d.prof==="object"&&!Array.isArray(d.prof)&&gearCatalogClasses.every(cls=>!!(d.prof[cls]||d.prof[cls.toLowerCase()]))&&typeof d.meta?.client_build==="string"&&!!d.meta.client_build.trim();}
function catalogSlotCheck(candidate,record){
 const slot=String(candidate.slot||""),type=String(candidate.type||"");
 if(!record||!gearSlotNames[record.slot])return null;
 if(/副手|盾牌|off.hand/i.test(slot)){
  if(/盾牌|shield/i.test(slot+" "+type))return record.slot==="Shield";
  if(/持有|副手物品|法器|書籍|held in off.hand|off.hand frill/i.test(type))return record.slot==="Held In Off-hand";
  if(/單手|匕首|拳套|拳刃|one.hand|dagger|fist/i.test(type))return ["Off Hand","One-Hand"].includes(record.slot);
  return ["Off Hand","Held In Off-hand","Shield","One-Hand"].includes(record.slot);
 }
 if(/遠程|遠距|聖物|魔杖|塑像|圖騰|聖契/i.test(slot)){
  if(/聖物|塑像|圖騰|聖契|relic|idol|totem|libram/i.test(slot+" "+type))return record.slot==="Relic";
  if(/弓|槍|弩|魔杖|投擲|bow|gun|wand|thrown/i.test(slot+" "+type))return ["Ranged","Thrown"].includes(record.slot);
  return ["Ranged","Thrown","Relic"].includes(record.slot);
 }
 if(/主手|單手|雙手|近戰|^武器$/i.test(slot))return isTwoHand(type)||/雙手/.test(slot)?record.slot==="Two-Hand":["Main Hand","One-Hand"].includes(record.slot);
 const rules=[[/頭部|頭盔|^頭$/,"Head"],[/頸部|項鍊/,"Neck"],[/肩部|肩甲/,"Shoulder"],[/背部|披風/,"Back"],[/胸部|胸甲/,"Chest"],[/手腕|護腕/,"Wrist"],[/手部|手套/,"Hands"],[/腰部|腰帶/,"Waist"],[/腿部|腿甲/,"Legs"],[/腳部|足部|鞋|靴/,"Feet"],[/戒指|指環/,"Finger"],[/飾品/,"Trinket"]];
 for(const [re,key] of rules)if(re.test(slot))return record.slot===key||(key==="Chest"&&record.slot==="Robe");
 return null;
}
// This is an additive panel-stat proposal, not a full combat simulator.
function candidateCatalogPosition(candidate,record){
 if(!record||catalogSlotCheck(candidate,record)!==true)return "";
 const slot=String(candidate.slot||"");
 if(/副手|盾牌|off.hand/i.test(slot))return "副手";
 return gearSlotNames[record.slot]||"";
}
function catalogHasEffect(value){
 if(value==null||value===false||value===0)return false;
 if(Array.isArray(value))return value.some(catalogHasEffect);
 if(typeof value==="object")return Object.values(value).some(catalogHasEffect);
 return !["","0","[]","{}","null"].includes(String(value).trim());
}
function catalogHasSpecial(x){return !!catalogSetName(x)||catalogHasEffect(x.effects)||catalogHasEffect(x.other_stats);}
function catalogPlanSourceAllowed(x,options={}){
 if(!catalogSourceRecorded(x))return false;
 const tags=gearCatalogTags(x);
 if(options.excludeReputation&&(catalogHasEffect(x.required_reputation)||tags.includes("聲望")))return false;
 if(options.boeOnly&&!tags.includes("裝綁"))return false;
 return true;
}
const catalogArmorGroups=[["頭部",1],["頸部",1],["肩部",1],["背部",1],["胸部",1],["手腕",1],["手部",1],["腰部",1],["腿部",1],["腳部",1],["戒指",2],["飾品",2]];
function catalogArmorPlan(spec,records,prof,weights,options={}){
 const pools=catalogSetPools(spec,records,prof,weights,options);
 const groups=catalogArmorGroups.map(([slot,count])=>{
  const rows=pools.get(slot).filter(p=>p.score.total>0);
  return {slot,count,eligible:rows.length,picks:rows.slice(0,count)};
 });
 return {groups,total:groups.reduce((n,g)=>n+g.picks.reduce((a,p)=>a+p.score.total,0),0),filled:groups.reduce((n,g)=>n+g.picks.length,0),expected:catalogArmorGroups.reduce((n,g)=>n+g[1],0)};
}
// Compare an armor-set constraint against the unconstrained additive armor plan.
function catalogSetName(x){return typeof x.item_set==="string"?x.item_set.trim():"";}
function catalogSetPools(spec,records,prof,weights,options={}){
 const pools=new Map(catalogArmorGroups.map(([slot])=>[slot,[]])),seen=new Set();
 for(const x of records){
  const slot=gearSlotNames[x.slot],id=String(x.id??"");
  if(!id||seen.has(id)||!pools.has(slot)||!catalogPlanSourceAllowed(x,options)||!gearCatalogEligible(spec,x,prof)||Number(x.quality||0)<Number(options.minQuality||0))continue;
  if(options.excludeEffects&&catalogHasSpecial(x))continue;
  const score=catalogWeightScore(x,weights);if(!score.used||!Number.isFinite(score.total))continue;
  seen.add(id);pools.get(slot).push({item:x,score});
 }
 for(const rows of pools.values())rows.sort((a,b)=>b.score.total-a.score.total||Number(a.item.id)-Number(b.item.id));
 return pools;
}
function catalogSetCounts(picks){
 const counts=new Map();
 for(const p of picks){const name=catalogSetName(p.item);if(name)counts.set(name,(counts.get(name)||0)+1);}
 return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
}
function catalogSetOptions(pools){
 const names=new Map();
 for(const [slot,rows] of pools){const max=catalogArmorGroups.find(g=>g[0]===slot)[1],local=new Map();
  for(const p of rows){const name=catalogSetName(p.item);if(name)local.set(name,(local.get(name)||0)+1);}
  for(const [name,count] of local)names.set(name,(names.get(name)||0)+Math.min(count,max));
 }
 return [...names].filter(([,n])=>n>=2).sort((a,b)=>a[0].localeCompare(b[0]));
}
function catalogSetAlternative(pools,name,minimum){
 if(!name||!Number.isInteger(minimum)||minimum<2||minimum>14)return null;
 let states=new Map([[0,{total:0,picks:[]}]]);
 for(const [slot,capacity] of catalogArmorGroups){
  const rows=pools.get(slot)||[],yes=rows.filter(p=>catalogSetName(p.item)===name),no=rows.filter(p=>catalogSetName(p.item)!==name&&p.score.total>0);
  const next=new Map();
  for(let count=0;count<=Math.min(capacity,yes.length);count++){
   const chosen=[...yes.slice(0,count),...no.slice(0,capacity-count)].map(p=>({...p,slot}));
   const score=chosen.reduce((sum,p)=>sum+p.score.total,0);
   for(const [oldCount,prev] of states){const total=prev.total+score,key=oldCount+count,existing=next.get(key);
    if(!existing||total>existing.total)next.set(key,{total,picks:[...prev.picks,...chosen]});
   }
  }
  states=next;
 }
 const feasible=[...states].filter(([count])=>count>=minimum).sort((a,b)=>b[1].total-a[1].total||b[0]-a[0]);
 return feasible.length?{count:feasible[0][0],...feasible[0][1]}:null;
}
function catalogMultiSetAlternative(pools,requirements){
 if(!Array.isArray(requirements)||requirements.length<1||requirements.length>2||requirements.some(r=>!r||typeof r.name!=="string"||!r.name||!Number.isInteger(r.minimum)||r.minimum<2||r.minimum>14)||new Set(requirements.map(r=>r.name)).size!==requirements.length||requirements.reduce((n,r)=>n+r.minimum,0)>14)return null;
 const names=requirements.map(r=>r.name),minima=requirements.map(r=>r.minimum),zero=names.map(()=>0);
 let states=new Map([[zero.join(","),{counts:zero,total:0,picks:[]}]]);
 for(const [slot,capacity] of catalogArmorGroups){
  const rows=pools.get(slot)||[],buckets=names.map(name=>rows.filter(p=>catalogSetName(p.item)===name));
  const other=rows.filter(p=>!names.includes(catalogSetName(p.item))&&p.score.total>0);
  const choices=[];
  function choose(index,counts,remaining,selected){
   if(index===names.length){const picks=[...selected,...other.slice(0,remaining)].map(p=>({...p,slot}));choices.push({counts,picks,total:picks.reduce((n,p)=>n+p.score.total,0)});return;}
   for(let n=0;n<=Math.min(remaining,buckets[index].length);n++)choose(index+1,[...counts,n],remaining-n,[...selected,...buckets[index].slice(0,n)]);
  }
  choose(0,[],capacity,[]);
  const next=new Map();
  for(const prev of states.values())for(const c of choices){
   const counts=prev.counts.map((n,i)=>n+c.counts[i]),key=counts.map((n,i)=>Math.min(n,minima[i])).join(","),total=prev.total+c.total;
   if(!next.has(key)||total>next.get(key).total)next.set(key,{counts,total,picks:[...prev.picks,...c.picks]});
  }
  states=next;
 }
 const result=states.get(minima.join(","));
 return result?{...result,sets:names.map((name,i)=>({name,count:result.counts[i],minimum:minima[i]}))}:null;
}
function catalogSameCoverage(a,b){
 const count=picks=>catalogArmorGroups.map(([slot])=>picks.filter(x=>x.slot===slot).length).join(",");
 return Array.isArray(a)&&Array.isArray(b)&&count(a)===count(b);
}
function catalogExactSet(pools,name,count){
 if(typeof name!=="string"||!name||!Number.isInteger(count)||count<0||count>14)return null;
 let states=new Map([[0,{total:0,picks:[]}]]);
 for(const [slot,capacity] of catalogArmorGroups){
  const rows=pools.get(slot)||[],yes=rows.filter(p=>catalogSetName(p.item)===name),no=rows.filter(p=>catalogSetName(p.item)!==name&&p.score.total>0),next=new Map();
  for(const [old,prev] of states)for(let n=0;n<=Math.min(count-old,capacity,yes.length);n++){
   const picks=[...yes.slice(0,n),...no.slice(0,capacity-n)].map(p=>({...p,slot}));
   const total=prev.total+picks.reduce((sum,p)=>sum+p.score.total,0),k=old+n;
   const combined=[...prev.picks,...picks],prior=next.get(k);
   if(!prior||combined.length>prior.picks.length||combined.length===prior.picks.length&&total>prior.total)next.set(k,{total,picks:combined});
  }
  states=next;
 }
 const r=states.get(count);return r?{count,...r}:null;
}
function catalogSetTierComparison(pools,name,max,bonuses=[]){
 if(!Number.isInteger(max)||max<1||max>14||!Array.isArray(bonuses))return null;
 const base=catalogExactSet(pools,name,0);if(!base)return null;
 const rows=[];
 for(let n=1;n<=max;n++){
  const plan=catalogExactSet(pools,name,n);if(!plan)continue;
  const active=bonuses.filter(b=>Number.isInteger(b.pieces)&&b.pieces>0&&b.pieces<=n);
  const complete=active.length>0&&new Set(active.map(b=>b.pieces)).size===active.length&&active.every(b=>Number.isFinite(b.value));
  const value=complete?active.reduce((sum,b)=>sum+b.value,0):null;
  const comparable=catalogSameCoverage(base.picks,plan.picks);
  rows.push({...plan,comparable,loss:comparable?base.total-plan.total:null,active,bonus:value,net:value===null||!comparable?null:plan.total+value-base.total});
 }
 return {base,rows,firstWin:rows.find(x=>x.net!==null&&x.net>1e-8)?.count??null};
}
let setEffectsPromise=null;
function loadSetEffects(){
 if(!setEffectsPromise)setEffectsPromise=fetch("set-effects.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("套裝資料未生成");return r.json();}).then(d=>d?.commit===combatPresetCommit&&Array.isArray(d.sets)?d.sets:[]).catch(()=>[]);
 return setEffectsPromise;
}
function nativeSetUncertainty(a,b,metric){
 const n=a?.iterations,m=b?.iterations,x=a?.metrics?.[metric+"Stdev"],y=b?.metrics?.[metric+"Stdev"];
 if(!Number.isInteger(n)||n<30||!Number.isInteger(m)||m<30||![x,y].every(v=>Number.isFinite(v)&&v>=0))return null;
 // Conservative normal-approximation bound allowing arbitrary correlation
 // between paired case means; do not assume independent same-seed runs.
 return 1.96*(x/Math.sqrt(n)+y/Math.sqrt(m));
}
function nativeSetComparison(trial,role){
 if(!trial||!Array.isArray(trial.cases)||!["tank","dps","heal"].includes(role))return null;
 const metric=role==="tank"?"tps":role==="heal"?"hps":"dps";
 const valid=c=>c&&Number.isInteger(c.pieces)&&c.pieces>=0&&c.pieces<=14&&Number.isFinite(c.duration)&&c.duration>0&&Number.isFinite(c.metrics?.[metric])&&c.metrics[metric]>=0;
 const baselines=trial.cases.filter(c=>valid(c)&&c.pieces===0);if(baselines.length!==1)return null;const baseline=baselines[0];
 const counts=new Map();for(const c of trial.cases.filter(valid))counts.set(c.pieces,(counts.get(c.pieces)||0)+1);
 const rows=trial.cases.filter(c=>valid(c)&&c.pieces>0&&counts.get(c.pieces)===1&&Math.abs(c.duration-baseline.duration)<1e-6).sort((a,b)=>a.pieces-b.pieces).map(c=>{
  const delta=c.metrics[metric]-baseline.metrics[metric];
  const survival=role==="tank"?(["dtps","death"].every(k=>[c.metrics[k],baseline.metrics[k]].every(v=>Number.isFinite(v)&&v>=0&&(k!=="death"||v<=1)))?c.metrics.dtps<=baseline.metrics.dtps+1e-8&&c.metrics.death<=baseline.metrics.death+1e-8:null):true;
  const uncertainty=nativeSetUncertainty(baseline,c,metric),win=delta>1e-8&&survival===true;
  return {...c,delta,percent:baseline.metrics[metric]>0?100*delta/baseline.metrics[metric]:null,win,survival,uncertainty,confirmedWin:win&&uncertainty!==null&&delta>uncertainty};
 });
 const best=rows.filter(x=>x.win).sort((a,b)=>b.metrics[metric]-a.metrics[metric]||a.pieces-b.pieces)[0]||null,bestConfirmed=rows.filter(x=>x.confirmedWin).sort((a,b)=>b.metrics[metric]-a.metrics[metric]||a.pieces-b.pieces)[0]||null;
 const expected=Array.isArray(trial.thresholds)?[...new Set(trial.thresholds.filter(n=>Number.isInteger(n)&&n>0&&n<=14))].sort((a,b)=>a-b):[];
 const adjacent=Array.isArray(trial.adjacentCounts)?[...new Set(trial.adjacentCounts.filter(n=>Number.isInteger(n)&&n>0&&n<=14&&!expected.includes(n)))]:[];
 for(const row of rows){
  row.activation=expected.includes(row.pieces);
  const previous=row.pieces===1?baseline:rows.find(x=>x.pieces===row.pieces-1);
  row.previousDelta=previous?row.metrics[metric]-previous.metrics[metric]:null;
 }
 return {metric,baseline,rows,best,bestConfirmed,firstWin:rows.find(x=>x.win)?.pieces??null,firstConfirmed:rows.find(x=>x.confirmedWin)?.pieces??null,missing:expected.filter(n=>!rows.some(x=>x.pieces===n)),missingAdjacent:adjacent.filter(n=>!rows.some(x=>x.pieces===n))};
}
let nativeSetTrialsPromise=null;
function nativeSetTrialView(parent,id){
 const c=box(parent,"套裝效果原生實戰比較","比較同一目標、技能策略、天賦與團隊條件的0件散裝對照與各已登錄套裝門檻；原生引擎自動計入已實作效果。");
 if(!nativeSetTrialsPromise)nativeSetTrialsPromise=fetch("set-trials.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();}).then(d=>{if(d?.commit!==combatPresetCommit||!Array.isArray(d.trials))throw Error("版本不符");return d;}).catch(()=>null);
 nativeSetTrialsPromise.then(data=>{
  if(!c.isConnected)return;
  const trials=data?.trials.filter(t=>t?.spec===id)||[];
  if(!trials.length){c.append(node("p","此專精尚無已產出的原生套裝對照；不以假設收益判定 BiS。","gt-muted"));return;}
  const role=combatRole(id);
  for(const t of trials){
   const d=node("details");d.append(node("summary",zhDisplay(t.setName||"未知套裝")+" ｜ "+(guildScenarios[t.scenario]?.label||t.scenario)));
   const result=nativeSetComparison(t,role);
   add(d,node("p","引擎登錄件數："+(Array.isArray(t.thresholds)?t.thresholds.join("／"):"未知")+" ｜ 基準："+(t.baseLabel||"")+"。"+(t.epProfile?"散件依上游部分EP權重挑選；":"散件以接近物品等級選取；")+(t.crossArmor?"同部位合法跨甲；":"同部位、同護甲類型；")+"換裝位置的附魔均清除，非全目錄最優。","gt-muted"));
   if(t.requiredProfession)d.append(node("p","效果啟動需要專業："+zhDisplay(t.requiredProfession),"gt-muted"));
   if(t.epProfile){d.append(node("p","參考權重："+t.epProfile.label+" ｜ "+Object.entries(t.epProfile.catalogWeights||{}).map(([k,v])=>(catalogWeightFields[k]||k)+" "+v).join("、")+"；未納入："+(t.epProfile.omitted||[]).join("、"),"gt-muted"));}
   if(typeof t.source==="string"&&/^sim\/[a-zA-Z0-9_/.]+\.go$/.test(t.source)&&!t.source.includes(".."))d.append(link("套裝原生效果實作","https://github.com/wowsims/forever/blob/"+combatPresetCommit+"/"+t.source));
   if(Array.isArray(t.registeredThresholds)){const unplanned=t.registeredThresholds.filter(n=>Number.isInteger(n)&&!t.thresholds?.includes(n));if(unplanned.length)d.append(node("p","尚無合資格候選可測的登錄門檻："+unplanned.join("／")+" 件","gt-muted"));}
   if(Array.isArray(t.items)&&t.items.length){const gear=node("details");gear.append(node("summary","實際套裝與散件替換部位"));for(const x of t.items.slice(0,14)){if(!x||!Number.isSafeInteger(x.setId)||x.setId<=0||!Number.isSafeInteger(x.scatterId)||x.scatterId<=0)continue;const line=node("p");add(line,node("span",(gearSlotNames[x.slot]||x.slot)+"："),link("套裝 "+x.setId,"https://www.wowhead.com/forever/tw/item="+x.setId),node("span"," ／ "),link("散裝 "+x.scatterId,"https://www.wowhead.com/forever/tw/item="+x.scatterId));if(x.setArmor&&x.scatterArmor&&x.setArmor!==x.scatterArmor)line.append(node("span"," ｜ "+gearType({subclass:x.setArmor})+"／"+gearType({subclass:x.scatterArmor})+"（跨甲對照）"));if(Number.isFinite(x.setScore)&&Number.isFinite(x.scatterScore))line.append(node("span"," ｜ 部分EP "+x.setScore.toFixed(2)+"／"+x.scatterScore.toFixed(2)));gear.append(line);}d.append(gear);}
   if(!result)d.append(node("p","0件基準尚未成功，不能判定勝負。","gt-muted"));
   else{
    const m=result.metric.toUpperCase();
    const line=(x,label)=>{const part=node("p",label+" ｜ "+m+" "+x.metrics[result.metric].toFixed(2)+(role==="tank"&&Number.isFinite(x.metrics.dtps)?" ｜ DTPS "+x.metrics.dtps.toFixed(2):"")+(role==="tank"&&Number.isFinite(x.metrics.death)?" ｜ 死亡 "+(100*x.metrics.death).toFixed(1)+"%":""));d.append(part);const path=combatRequestPath(x.requestFile,id);if(path)d.append(link("下載完整 "+label+" 請求",path));};
    line(result.baseline,"0件散裝對照");
    for(const x of result.rows){line(x,x.pieces+"件"+(x.activation?"（套裝效果門檻）":"（件數對照）"));if(x.previousDelta!==null)d.append(node("p","相較少1件 "+(x.previousDelta>=0?"+":"")+x.previousDelta.toFixed(2)+" "+m+"（包含換裝本身差異，非純套裝效果）","gt-muted"));d.append(node("p","相較0件 "+(x.delta>=0?"+":"")+x.delta.toFixed(2)+" "+m+(x.percent!==null?"（"+x.percent.toFixed(2)+"%）":"")+(x.uncertainty===null?"；未提供完整波動資料":"；差值保守近似95%範圍 ±"+x.uncertainty.toFixed(2))+(x.confirmedWin?"；超出波動門檻":x.win?"；平均值較高，尚未超出波動門檻":role==="tank"&&x.delta>0?"；生存未同時勝出或資料不足":"；平均值未勝出"),"gt-muted"));}
    d.append(node("p",result.firstWin===null?"目前成功的門檻平均值未勝過0件對照。":"本次已測件數中，最少 "+result.firstWin+" 件平均值較高；"+(result.firstConfirmed===null?"尚無足夠波動證據。":"最少 "+result.firstConfirmed+" 件超出保守近似95%差值範圍。")+"不是所有可能散件的全域 BiS。","gt-muted"));if(result.best)d.append(node("p","本次最高平均值："+result.best.pieces+" 件；"+(result.bestConfirmed?"有勝出證據的最高平均值："+result.bestConfirmed.pieces+" 件。":"尚無超出波動門檻的候選。"),"gt-muted"));d.append(node("p","近似範圍為 1.96 ×（兩組標準誤之和），不假定同種子結果獨立。未修正多重比較；坦克承傷及死亡仍以平均值判定。","gt-muted"));if(result.missing.length)d.append(node("p","未取得可比較效果門檻："+result.missing.join("／")+" 件；不能排除其中有更早勝出門檻。","gt-muted"));if(result.missingAdjacent.length)d.append(node("p","門檻前一件對照尚缺："+result.missingAdjacent.join("／")+" 件。","gt-muted"));
   }
   if(Array.isArray(t.failed)&&t.failed.length)d.append(node("p","未成功："+t.failed.map(x=>x.pieces+"件").join("、"),"gt-muted"));
   c.append(d);
  }
 });
 return c;
}
function catalogSetTradeoff(base,alternative,netBonus=null){
 if(!Number.isFinite(base)||!Number.isFinite(alternative)||!Number.isFinite(base-alternative))return null;
 const gap=base-alternative;
 return {gap,required:Math.max(0,gap),net:Number.isFinite(netBonus)?netBonus-gap:null};
}
function catalogPlanText(meta,picks){
 const clean=v=>String(v??"").replace(/[\r\n\t]+/g," ").trim();
 const rows=["墓鐘資料庫｜配裝面板試算（非實戰BiS）","專精："+clean(meta.spec)+"｜構築："+clean(meta.build),"資料版本："+clean(meta.version),"權重來源："+clean(meta.source),"篩選："+clean(meta.filter),"方案："+clean(meta.label),"面板總分："+Number(meta.total).toFixed(2),"未計權重："+(meta.omitted||[]).map(clean).join("、"),"未驗證取得階段、陣營及唯一群組；未計套裝、觸發及實戰循環。"];
 const positions=new Map();for(const p of picks){const slot=clean(p.slot||p.position),n=(positions.get(slot)||0)+1;positions.set(slot,n);rows.push(slot+(/^(戒指|飾品)$/.test(slot)?" "+n:"")+"｜"+clean(p.name||p.item.name)+"｜ID "+clean(p.item.id)+"｜"+p.score.total.toFixed(2)+"｜"+clean(p.item.source_summary));}
 return rows.join("\n");
}
const catalogDpsKeys={"主手":"主手DPS","副手":"副手DPS","雙手武器":"雙手DPS","遠程":"遠程DPS"};
function catalogWeaponScore(x,position,weights){
 const score=catalogWeightScore(x,weights);
 const key=x.item_class==="Weapon"?catalogDpsKeys[position]:null;
 const specific=Object.values(catalogDpsKeys).some(k=>Number(weights[k])>0),label=specific?key:"武器DPS",weight=key?Number(weights[label]||0):0;
 if(weight>0){
  const value=Number(x.dps);
  if(!Number.isFinite(value)||value<=0||Number(x.dps_approx))return {...score,incomplete:true};
  score.total+=value*weight;score.parts.push({label,value,weight});score.used++;
 }
 return {...score,incomplete:false};
}
function catalogWeaponPlan(spec,records,prof,weights,options={}){
 weights=effectiveGearWeights(spec.id,weights);
 const pools=new Map(["主手","副手","雙手武器","遠程","聖物"].map(k=>[k,[]])),seen=new Set();
 const kind=variantFor(spec.id)?.[4]||buildFor(spec.id),rogue=gearClassIndex(spec.id)===3,feral=feralWeaponMode(spec.id),requirePair=rogue||["dual","shield","mutilate","backstab","hemo"].includes(kind)||feral==="onehand",requireTwo=feral==="twohand"||["twohand","weaving"].includes(kind),allowTwo=!requirePair&&options.weaponMode!=="one",allowOne=!requireTwo&&options.weaponMode!=="two";
 for(const x of records){
  if(!String(x.id??"")||!catalogPlanSourceAllowed(x,options)||Number(x.quality||0)<Number(options.minQuality||0)||options.excludeEffects&&catalogHasSpecial(x))continue;
  for(const [position,pool] of pools){
   const id=position+":"+x.id;
   if(seen.has(id)||!gearCatalogEligible(spec,x,prof,position))continue;
   if(position==="副手"&&rogue&&x.item_class!=="Weapon")continue;
   const score=catalogWeaponScore(x,position,weights);
   if(score.incomplete||!Number.isFinite(score.total))continue;
   seen.add(id);pool.push({item:x,position,score});
  }
 }
 for(const pool of pools.values())pool.sort((a,b)=>b.score.total-a.score.total||Number(a.item.id)-Number(b.item.id));
 const choices=[],push=(kind,picks)=>{const total=picks.reduce((n,p)=>n+p.score.total,0);if(total>0)choices.push({kind,picks,total});};
 if(allowTwo&&pools.get("雙手武器").length)push("雙手武器",[pools.get("雙手武器")[0]]);
 if(allowOne){
  const main=pools.get("主手").slice(0,2),off=pools.get("副手").slice(0,2);
  for(const m of main){
   if(!requirePair)push("單主手",[m]);
   for(const o of off)if(String(m.item.id)!==String(o.item.id))push(o.item.slot==="Shield"?"主手＋盾牌":"主手＋副手",[m,o]);
  }
 }
 choices.sort((a,b)=>b.total-a.total||b.picks.length-a.picks.length);
 const melee=choices[0]||null,extra=["遠程","聖物"].map(k=>pools.get(k)[0]).filter(x=>x&&x.score.total>0).sort((a,b)=>b.score.total-a.score.total).slice(0,1); // Shared ranged/relic equipment slot.
 return {melee,extra,total:(melee?.total||0)+extra.reduce((n,p)=>n+p.score.total,0),requirePair,requireTwo};
}
function candidateCatalogCheck(candidate,record){
 if(!record)return {state:"未收錄",differences:[]};
 if(Number(record.estimated))return {state:"經典推定",differences:[]};
 const differences=[];let compared=0;
 const baseFields=catalogWeightFields;
 for(const [key,label] of Object.entries(baseFields)){
  const a=candidate.stats?.[label],b=record[key];if(Number.isFinite(a)&&Number.isFinite(b)){compared++;if(a!==b)differences.push({label,old:a,current:b});}
 }
 const wd=Object.entries(candidate.wm||{}).find(([k])=>/每秒傷害|DPS/i.test(k));const a=wd?Number(wd[1]):NaN,b=record.dps;
 if(Number.isFinite(a)&&Number.isFinite(b)&&!Number(record.dps_approx)){compared++;if(Math.abs(a-b)>0.11)differences.push({label:"武器DPS",old:a,current:b});}
 return {state:differences.length?"數值差異待核":compared?"已比對（有限欄位）":"沒有可直接比較的數值",compared,differences};
}
let gearCatalogPromise=null;
function loadGearCatalog(){
 if(!gearCatalogPromise)gearCatalogPromise=(async()=>{const read=async url=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),18000);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw Error("HTTP "+r.status);return await r.json();}finally{clearTimeout(t);}};
 let d;try{d=await read("gear-catalog.json");if(!validGearCatalog(d))throw Error("本地目錄格式不符");}catch(e){const base="https://gblaku.github.io/wow-forever-kb/api/";const [items,prof,meta]=await Promise.all([read(base+"items.json"),read(base+"proficiency.json"),read(base+"meta.json")]);d={items,prof,meta};}
 if(!validGearCatalog(d))throw Error("資料格式不符");return d;
 })().catch(e=>{gearCatalogPromise=null;throw e;});return gearCatalogPromise;
}
function candidateAuditView(spec,slots){
 const d=node("details",undefined,"gt-card gt-catalog-audit");add(d,node("summary","BiS 候選與客戶端資料交叉核對"),node("p","以物品ID比對既有候選，檢查職業資格、武器DPS及可明確對應的基本屬性。來源記載不等於當前可取得；不自動覆寫有衝突的數字或排行。","gt-muted"));
 const out=node("div");d.append(out);let started=false;
 d.addEventListener("toggle",async()=>{if(!d.open||started)return;started=true;out.replaceChildren(node("p","正在核對物品資料…"));
 try{const data=await loadGearCatalog();if(!d.isConnected)return;const index=new Map(data.items.map(x=>[String(x.id),x]));
 const rows=slots.flatMap(s=>s.items.map(x=>{const rec=index.get(String(x.id)),check=candidateCatalogCheck(x,rec),slotOK=catalogSlotCheck(x,rec),position=candidateCatalogPosition(x,rec);return {x,rec,check,slotOK,eligible:rec?gearCatalogEligible(spec,rec,data.prof,position):null};}));
 const mode=select([["issues","只顯示待核對"],["all","全部候選"]]),list=node("div");
 const issue=r=>r.check.state!=="已比對（有限欄位）"||r.eligible!==true||r.slotOK!==true||!r.rec?.source_summary;
 add(out,node("p","資料版本："+data.meta.client_build+"｜"+rows.length+" 筆部位候選｜"+rows.filter(r=>!issue(r)).length+" 筆有限欄位相符且有來源文字｜"+rows.filter(issue).length+" 筆待核對","gt-muted"),field("核對範圍",mode),list);
 function draw(){list.replaceChildren();const visible=rows.filter(r=>mode.value==="all"||issue(r));for(const {x,rec,check,eligible,slotOK} of visible){
 const c=node("article",undefined,"gt-card");add(c,link(zhItem(x)+"（"+x.slot+"）",x.url),node("p",check.state+(check.compared?"｜"+check.compared+" 個可比欄位":"")+(eligible===false?"｜資料目錄初步資格不符":"")+(slotOK===false?"｜裝備部位與目錄不符":rec&&slotOK===null?"｜裝備部位待核":"")+(rec&&!rec.source_summary?"｜目錄缺取得來源":""),"gt-muted"));
 for(const v of check.differences)add(c,node("p",v.label+"：本站 "+v.old+" ／ 目錄 "+v.current));
 if(rec)add(c,node("p","目錄來源："+(rec.source_summary||"待查")+"；掉落及階段須另核","gt-muted"),link("依物品ID查閱繁中遊戲資料","https://www.wowhead.com/forever/tw/item="+rec.id));
 list.append(c);}
 if(!visible.length)list.append(node("p","這個篩選範圍沒有待核對候選。"));
 }
 mode.addEventListener("change",draw);draw();
 }catch(e){started=false;out.replaceChildren(node("p","目錄無法載入，收合後可重試。"));}
 });return d;
}
function catalogArmorPlanView(spec,displayMode=()=> "auto"){
 const d=node("details",undefined,"gt-card gt-armor-plan");add(d,node("summary","整套裝備 · 面板權重試算（含合法跨甲）"),node("p","從全來源裝備目錄逐部位選擇已儲存面板權重的最高分；含十個單件部位及兩個戒指、兩個飾品，另比較合法武器組合、遠程與聖物。只列有客戶端資料及來源文字的正分候選，取得階段仍待核對。同一物品ID不重複；不同ID的唯一群組尚未確認。","gt-muted"));
 const out=node("div");d.append(out);let started=false;
 d.addEventListener("toggle",async()=>{
  if(!d.open||started)return;
  const model=savedModel(spec.id),weights=effectiveGearWeights(spec.id,model?.weights||{});
  if(![...Object.values(catalogWeightFields),...Object.values(catalogDpsKeys),"武器DPS"].some(k=>Number.isFinite(weights[k])&&weights[k]>0)){out.replaceChildren(node("p","尚無適用的已儲存面板權重，請先在配裝試算儲存本專精構築的權重。"),button("前往配裝試算",()=>show("v14")));return;}
  started=true;out.replaceChildren(node("p","正在讀取全來源裝備目錄…"));
  try{
   const [data,effectRows]=await Promise.all([loadGearCatalog(),loadSetEffects()]);if(!d.isConnected)return;
   const quality=select([["0","不限品質"],["2","優良以上"],["3","精良以上"],["4","史詩以上"]]),effect=select([["all","保留特殊效果與套裝（不計效果）"],["plain","排除有特殊效果或套裝文字的物品"]]),sourceFilter=select([["all","所有已記載來源"],["no-rep","排除已標記聲望裝備"],["boe","只看已標記裝備綁定"]]),planWeapon=select([["follow","沿用上方武器配置"],["auto","比較所有合法配置"],["two","僅雙手武器"],["one","僅單手／副手"]]),rows=node("div");
   const omitted=[...catalogWeightCoverage(weights).filter(k=>!Object.values(catalogDpsKeys).includes(k)&&k!=="武器DPS"),...omittedFeralWeights(spec.id,model?.weights).map(k=>k+"（野性形態待驗證）")];out.replaceChildren(node("p","權重來源："+(model.source||"使用者設定")+"｜資料版本："+data.meta.client_build,"gt-muted"),node("p","未計入權重："+(omitted.join("、")||"無其他已設定欄位")+"；尚未計算命中門檻、套裝、特殊效果、陣營、職業以外限制及戰鬥環境。","gt-muted"),field("品質",quality),field("取得條件（依來源標記，非開放驗證）",sourceFilter),field("特殊效果範圍",effect),field("武器配置",planWeapon),rows);
   function draw(){
    const options={minQuality:Number(quality.value),excludeEffects:effect.value==="plain",excludeReputation:sourceFilter.value==="no-rep",boeOnly:sourceFilter.value==="boe",weaponMode:planWeapon.value==="follow"?displayMode():planWeapon.value},plan=catalogArmorPlan(spec,data.items,data.prof,weights,options),weapon=catalogWeaponPlan(spec,data.items,data.prof,weights,options);
    rows.replaceChildren(node("p","已選 "+plan.filled+" / "+plan.expected+" 個部位｜防具與飾品分 "+plan.total.toFixed(2)+"｜武器與遠程／聖物分 "+weapon.total.toFixed(2)+"｜合計 "+(plan.total+weapon.total).toFixed(2)+"（非整套BiS）","gt-muted"));
    for(const group of plan.groups){
     const c=node("article",undefined,"gt-card");add(c,node("h4",group.slot+"｜"+group.picks.length+"/"+group.count),node("p",group.eligible+" 件有正分的合資格候選","gt-muted"));
     for(const [i,{item:x,score}] of group.picks.entries()){if(group.count===2)c.append(node("p",group.slot+" "+(i+1),"gt-muted"));
      const name=zhItem(x),cross=gearCrossArmor(gearCatalogClasses[gearClassIndex(spec.id)],x);
      add(c,link(name+"（"+gearType(x)+(cross?"・跨甲":"")+"）","https://www.wowhead.com/forever/tw/item="+x.id),node("p","面板分 "+score.total.toFixed(2)+"｜"+score.parts.map(v=>v.label+" "+v.value+" × "+v.weight).join("；"),"gt-muted"),node("p",x.source_summary||"來源待查"),node("p",(x.item_set?"套裝："+x.item_set+"；":"")+(x.effects||x.other_stats?"含未計特殊效果；":"")+"取得階段及唯一限制待核","gt-muted"));
     }
     if(group.picks.length<group.count)for(let i=group.picks.length;i<group.count;i++)c.append(node("p",(group.count===2?group.slot+" "+(i+1)+"｜":"")+"候選不足：保留空位，不以零分物品補滿。","gt-muted"));
     rows.append(c);
    }
    const w=node("section",undefined,"gt-card gt-catalog-weapon-plan");add(w,node("h4","武器與遠程／聖物"),node("p",weapon.melee?weapon.melee.kind+"｜"+weapon.melee.total.toFixed(2):"沒有可計分的合法近戰武器組合；保留空位","gt-muted"),node("p","武器DPS採用已儲存的對應手位權重；缺少或僅有估算DPS的武器在需要DPS權重時排除。盾牌、持有型副手、聖物不計武器DPS；貓／熊形態不採原始武器DPS，轉換及觸發尚未模擬。","gt-muted"));
    for(const {item:x,position,score} of [...(weapon.melee?.picks||[]),...weapon.extra])add(w,node("p",position+"｜"+score.total.toFixed(2)),link(zhItem(x)+"（"+gearType(x)+"）","https://www.wowhead.com/forever/tw/item="+x.id),node("p",score.parts.map(v=>v.label+" "+v.value+" × "+v.weight).join("；")||"無已計分屬性","gt-muted"),node("p",x.source_summary||"來源待查"));
    rows.append(w);
    const setPanel=node("section",undefined,"gt-card gt-catalog-set-plan"),baseline=plan.groups.flatMap(g=>g.picks.map(p=>({...p,slot:g.slot}))),setCounts=catalogSetCounts(baseline);
    add(setPanel,node("h4","套裝件數與散件取捨"),node("p",setCounts.length?"目前防具方案："+setCounts.map(([n,c])=>zhDisplay(n)+" "+c+" 件").join("；"):"目前防具方案未包含已標記套裝。","gt-muted"),node("p","僅依客戶端套裝名稱辨識，名稱相同不保證套裝ID一致。可同時指定一至兩套裝的最低件數，搜尋符合條件的最高面板防具方案；套裝效果須使用版本相符的啟動門檻與收益，下面另有逐件比較。","gt-muted"));
    const pools=catalogSetPools(spec,data.items,data.prof,weights,options),sets=catalogSetOptions(pools);
    const weaponPicks=[...(weapon.melee?.picks||[]),...weapon.extra],exportPlan=(armor,label,total)=>{
     const text=catalogPlanText({spec:spec.name||spec.id,build:buildFor(spec.id),version:data.meta.client_build,source:model.source,filter:quality.options[quality.selectedIndex]?.text+"；"+sourceFilter.options[sourceFilter.selectedIndex]?.text+"；"+effect.options[effect.selectedIndex]?.text+"；武器："+({two:"雙手",one:"單手／副手"}[options.weaponMode]||"所有合法配置"),label,total:total+weapon.total,omitted},[...armor,...weaponPicks].map(p=>({...p,name:zhItem(p.item)})));
     const exportBox=node("textarea");exportBox.readOnly=true;exportBox.rows=10;exportBox.style.width="100%";exportBox.value=text;
     share.replaceChildren(node("p","可選取或複製以下配置分享給公會成員。"),exportBox,button("複製方案",async()=>{try{await navigator.clipboard.writeText(text);shareStatus.textContent="已複製。";}catch(e){exportBox.focus();exportBox.select();shareStatus.textContent="請手動複製已選取的文字。";}}),button("下載此整套 EquipmentSpec JSON",()=>{try{const plan=combatPlanEquipment(armor,weaponPicks);combatDownloadJSON(plan.equipment,"tomb-"+spec.id+"-plan.json");}catch(e){shareStatus.textContent="匯出失敗："+e.message;}}),button("將此整套帶入實戰模擬",()=>{try{const plan=combatPlanEquipment(armor,weaponPicks);const slots=Object.fromEntries(combatEquipmentRows(plan.equipment,plan.mode).map(x=>[x.name,x.id]));localStorage.setItem("gt-combat-gear-v1:"+spec.id+":"+buildFor(spec.id),JSON.stringify({mode:plan.mode,slots,source:"全目錄面板方案："+label}));show("combat");}catch(e){shareStatus.textContent="帶入失敗："+e.message;}}),shareStatus);
    };
    const share=node("div",undefined,"gt-plan-export"),shareStatus=node("p","","gt-muted");
    add(rows,button("匯出目前整套面板方案",()=>exportPlan(baseline,"最高面板防具",plan.total)),share);
    if(sets.length){
     const setSelect=select(sets.map(([n,c])=>[n,zhDisplay(n)+"（最多 "+c+" 件）"])),target=select([]),secondSet=select([]),secondTarget=select([]),detail=node("div"),tiers=node("div"),tierFields=node("div"),bonus=inp("留空＝未知","number");bonus.step="0.01";
     function targets(){const count=sets.find(([n])=>n===setSelect.value)?.[1]||2;target.replaceChildren(...Array.from({length:count-1},(_,i)=>new Option((i+2)+" 件",String(i+2))));target.value=String(Math.min(4,count));const old=secondSet.value;secondSet.replaceChildren(new Option("不指定第二套",""),...sets.filter(([n])=>n!==setSelect.value).map(([n,c])=>new Option(zhDisplay(n)+"（最多 "+c+" 件）",n)));if([...secondSet.options].some(o=>o.value===old))secondSet.value=old;secondTargets();}
     function secondTargets(){const count=sets.find(([n])=>n===secondSet.value)?.[1]||0;secondTarget.replaceChildren(...Array.from({length:Math.max(0,count-1)},(_,i)=>new Option((i+2)+" 件",String(i+2))));secondTarget.disabled=!count;if(count)secondTarget.value="2";}
     let tierInputs=[];
     function drawTiers(){
      tiers.replaceChildren();
      const name=setSelect.value,max=sets.find(([n])=>n===name)?.[1]||0;
      const bonuses=tierInputs.map(x=>({pieces:x.pieces,value:x.input.value.trim()===""?null:Number(x.input.value)}));
      const study=catalogSetTierComparison(pools,name,max,bonuses);if(!study)return;
      add(tiers,node("h4","指定套裝逐件損益（相對完全不穿此套裝）"),node("p","基準：0 件指定套裝，面板分 "+study.base.total.toFixed(2)+"。其他套裝與觸發未計入；表中收益為手動輸入的額外面板等價分數，不是 DPS。","gt-muted"));
      for(const x of study.rows){const activated=x.active.map(b=>b.pieces+"件").join("＋")||"無已知門檻";const line=node("div",undefined,"gt-card");add(line,node("p",x.count+" 件 ｜ 啟動 "+activated+" ｜ 面板 "+x.total.toFixed(2)+" ｜ "+(x.comparable?"相對0件 "+(-x.loss).toFixed(2):"裝備欄覆蓋不一致")),node("p",!x.comparable?"散件與套裝的已填裝備欄不同，不判定勝負。":x.net===null?"需額外淨收益超過 "+Math.max(0,x.loss).toFixed(2)+" 分；效果未核算。":"計入已填效果後差額 "+x.net.toFixed(2)+" 分"+(x.net>0?"（勝過0件）":"")));line.append(button("匯出 "+x.count+" 件方案",()=>exportPlan(x.picks,name+" "+x.count+" 件",x.total)));tiers.append(line);}
      tiers.append(node("p",study.firstWin===null?"尚無已填收益證明哪個件數勝過0件。":"依已填收益，最少 "+study.firstWin+" 件勝過0件（仍需原生驗證）。","gt-muted"));
      tiers.append(button("匯出0件對照組",()=>exportPlan(study.base.picks,name+" 0 件對照",study.base.total)));
     }
     function setupTiers(){
      tierFields.replaceChildren();tierInputs=[];
      const name=setSelect.value,max=sets.find(([n])=>n===name)?.[1]||0,match=effectRows.filter(r=>r.name===name||r.alternativeName===name);
      const thresholds=match.length===1?match[0].bonuses:[]; 
      add(tierFields,node("h4","套裝效果啟動門檻"),node("p",thresholds.length?"來自固定版本 WoWSims 已登錄套裝實作；不保證所有遊戲效果皆已支援。":"未取得唯一對應的引擎套裝門檻。可填寫已核對的件數收益，但不能當作正式 BiS。","gt-muted"));
      if(match.length===1&&match[0].requiredProfession)tierFields.append(node("p","啟動專業要求："+zhDisplay(match[0].requiredProfession)+"；手動權重試算不驗證角色專業。","gt-muted"));
      if(match.length===1&&match[0].source)tierFields.append(link("引擎套裝實作","https://github.com/wowsims/forever/blob/"+combatPresetCommit+"/"+match[0].source));
      for(const row of thresholds.filter(x=>x.pieces<=max)){
       const input=inp("未知＝留空","number");input.step="0.01";tierInputs.push({pieces:row.pieces,input});input.addEventListener("input",drawTiers);add(tierFields,field(row.pieces+" 件額外收益（面板分）",input),node("p",row.effect||"引擎實作已登錄，效果數值待核","gt-muted"));
      }
      drawTiers();
     }
     function compare(){
      const requirements=[{name:setSelect.value,minimum:Number(target.value)},...(secondSet.value?[{name:secondSet.value,minimum:Number(secondTarget.value)}]:[])],result=catalogMultiSetAlternative(pools,requirements);detail.replaceChildren();
      if(!result){detail.append(node("p","未找到符合件數要求的方案。"));return;}
      const sameCoverage=catalogSameCoverage(baseline,result.picks),comparison=catalogSetTradeoff(plan.total,result.total,bonus.value.trim()!==""?Number(bonus.value):null),delta=comparison.gap,baseIds=new Set(baseline.map(p=>String(p.item.id))),newIds=new Set(result.picks.map(p=>String(p.item.id)));
      const setLabel=result.sets.map(x=>zhDisplay(x.name)+" "+x.count+" 件（至少 "+x.minimum+"）").join("＋");add(detail,node("p","替代防具："+setLabel+"｜面板分 "+result.total.toFixed(2)+"｜"+(sameCoverage?"相較原面板方案差額 "+delta.toFixed(2):"欄位覆蓋不同，不比較勝負")+"；需比較相較原方案新增或失去的套裝／特殊效果淨收益。","gt-muted"));
      if(sameCoverage&&comparison.net!==null)detail.append(node("p","假設淨收益後差值："+comparison.net.toFixed(2)+" 分｜"+(comparison.net>0?"替代方案較高":comparison.net<0?"原方案較高":"兩者相同")+"（使用者假設，非實測）","gt-muted"));
      detail.append(button("匯出指定套裝替代方案",()=>exportPlan(result.picks,setLabel,result.total)));
      for(const p of result.picks.filter(p=>!baseIds.has(String(p.item.id))))add(detail,node("p","加入 "+p.slot+"｜"+zhItem(p.item)+"｜"+p.score.total.toFixed(2)),link("物品資料","https://www.wowhead.com/forever/tw/item="+p.item.id));
      for(const p of baseline.filter(p=>!newIds.has(String(p.item.id))))detail.append(node("p","移除 "+p.slot+"｜"+zhItem(p.item)+"｜"+p.score.total.toFixed(2),"gt-muted"));
      if(result.picks.every(p=>baseIds.has(String(p.item.id)))&&baseline.every(p=>newIds.has(String(p.item.id))))detail.append(node("p","原方案已符合指定套裝件數。"));
     }
     setSelect.addEventListener("change",()=>{bonus.value="";targets();compare();setupTiers();});target.addEventListener("change",()=>{bonus.value="";compare();});secondSet.addEventListener("change",()=>{bonus.value="";secondTargets();compare();});secondTarget.addEventListener("change",()=>{bonus.value="";compare();});bonus.addEventListener("input",compare);add(setPanel,field("指定防具套裝",setSelect),field("最低套裝件數",target),field("第二套裝（選填）",secondSet),field("第二套裝最低件數",secondTarget),field("額外效果淨收益（與原方案相同面板分數單位，可負值）",bonus),detail,tierFields,tiers);targets();compare();setupTiers();
    }else setPanel.append(node("p","此篩選條件下沒有至少兩件的已標記套裝候選。","gt-muted"));
    rows.append(setPanel);
   }
   quality.addEventListener("change",draw);effect.addEventListener("change",draw);sourceFilter.addEventListener("change",draw);planWeapon.addEventListener("change",draw);d.addEventListener("gt-weapon-mode-change",()=>{if(planWeapon.value==="follow")draw();});draw();
  }catch(e){started=false;out.replaceChildren(node("p","裝備目錄暫時無法讀取，收合後重試。"));}
 });return d;
}
function gearCatalogView(spec){
 const d=node("details",undefined,"gt-card gt-full-gear");add(d,node("summary","全來源裝備資料庫（世界掉落、裝綁、聲望、製作、任務及副本）"),node("p","預設納入所有合法跨甲散件，不限制本職最高護甲。依本專精的職業資格和構築武器規則查詢；來源含經典推定，不代表全部已開放。預設只顯示有客戶端數值及來源記載的物品；來源可能沿用舊版，並非已驗證可取得。不是 BiS 排名。","gt-muted"));
 const status=node("p","展開後載入裝備資料。","gt-muted"),out=node("div");add(d,link("完整資料 API 與來源說明","https://github.com/gBlaku/wow-forever-kb#data-api"),status,out);
 let started=false;
 d.addEventListener("toggle",async()=>{if(!d.open||started)return;started=true;status.textContent="正在讀取裝備資料…";
 try{const data=await loadGearCatalog();if(!d.isConnected)return;
 const eligible=data.items.filter(x=>gearCatalogEligible(spec,x,data.prof)),q=inp("名稱、物品ID、來源、屬性"),sl=select([["","全部部位"],...Array.from(new Set(Object.values(gearSlotNames))).map(v=>[v,v])]),kind=select([["","全部取得方式"],...["世界掉落","裝綁","製作","聲望","任務","商人","掉落","待查"].map(v=>[v,v])]),scope=select([["live","客戶端數值＋來源記載"],["all","含經典推定及來源待查"]]),sort=select([["item_level","物品等級"],["dps","武器DPS"],...Object.entries(gearStatNames).map(([k,v])=>[k,v])]),quality=select([["","不限品質"],["2","優良以上（綠裝起）"],["3","精良以上（藍裝起）"],["4","史詩以上（紫裝起）"]]),levelMin=inp("最低需求等級（不限）","number"),list=node("div"),comparison=node("div");let limit=40,compareBase=null;const knownIds=catalogCandidateIds(spec),cls=gearCatalogClasses[gearClassIndex(spec.id)],armorFilter=select([["","全部合法護甲（含跨甲）"],["cross","只看跨甲"],["native","排除跨甲"]]);levelMin.min="0";levelMin.max="60";
 const coverageFilter=select([["","全部候選"],["new","只看尚未納入本站的物品"],["known","只看已收錄物品"]]);
 const model=savedModel(spec.id),rankWeights=model?.weights||{},rankable=Object.values(catalogWeightFields).some(k=>Number.isFinite(rankWeights[k])&&rankWeights[k]>0);
 if(rankable)sort.add(new Option("已儲存權重（部分面板試算）","weighted"));
 const omitted=catalogWeightCoverage(rankWeights);const rankNote=node("p",rankable?"已讀取本構築權重："+(model.source||"使用者提供")+"。全目錄試算使用已明確對應的面板欄位（基本屬性、攻強、獨立法傷／治療、回魔、格擋值）。法術能量不自動併入法傷或治療；不換算命中、爆擊等不同單位。":"可至配裝試算儲存本構築可對應的面板權重，以解鎖全目錄跨甲比較。","gt-muted");
 const omittedNote=node("p",omitted.length?"本目錄未計入的非零權重："+omitted.join("、")+"。因此分數不是完整配裝結果。":"未計套裝、觸發、唯一裝備限制及完整技能循環。","gt-muted");
 status.textContent="來源版本："+data.meta.client_build+"｜"+eligible.length+" 件符合初步裝備資格（含待查）｜"+eligible.filter(x=>catalogSourceRecorded(x)&&!knownIds.has(String(x.id))).length+" 件有來源記載但尚未納入本站候選";
 function draw(){list.replaceChildren();const weighted=sort.value==="weighted";if(weighted&&!sl.value){list.append(node("p","請先選擇同一裝備部位，避免不同部位分數互相比較。","gt-muted"));return;}const terms=q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);const scoreCache=weighted?new Map(eligible.map(x=>[x,catalogWeightScore(x,rankWeights)])):null;const rows=eligible.filter(x=>catalogCandidateFilter(x,knownIds,coverageFilter.value)&&(!armorFilter.value||(armorFilter.value==="cross"?gearCrossArmor(cls,x):!gearCrossArmor(cls,x)))&&(scope.value==="all"||catalogSourceRecorded(x))&&(!quality.value||Number(x.quality)>=Number(quality.value))&&(!levelMin.value||Number(x.required_level||0)>=Number(levelMin.value))&&(!sl.value||gearCatalogEligible(spec,x,data.prof,sl.value))&&(!kind.value||gearCatalogTags(x).includes(kind.value))&&terms.every(t=>[x.name,globalThis.GTLocale?.item(x.id,x.name),x.id,x.source_summary,zhDisplay(x.source_summary||""),x.required_reputation,gearType(x),gearCatalogTags(x).join(" "),gearSlotNames[x.slot],...Object.keys(gearStatNames).filter(k=>x[k]).map(k=>gearStatNames[k])].join(" ").toLowerCase().includes(t))).sort((a,b)=>(weighted?scoreCache.get(b).total-scoreCache.get(a).total:Number(b[sort.value]||0)-Number(a[sort.value]||0))||Number(b.item_level||0)-Number(a.item_level||0)||a.id-b.id);
 list.append(node("p",rows.length+" 件候選；"+(weighted?"依部分已儲存權重排序（非完整BiS）。":"依單項數值排序，非專精BiS。"),"gt-muted"));
 for(const x of rows.slice(0,limit)){const c=node("article",undefined,"gt-card");add(c,add(node("div",undefined,"gt-item-heading"),itemIcon(x.id),link((globalThis.GTLocale?.item(x.id,x.name)||x.name)+"（ID "+x.id+"）","https://www.wowhead.com/forever/tw/item="+x.id)),node("p",(sl.value==="副手"&&x.slot==="One-Hand"?"副手可用（通用單手）":gearSlotNames[x.slot])+"｜"+gearType(x)+(gearCrossArmor(cls,x)?"（跨甲）":"")+"｜"+gearCatalogTags(x).join("・")+"｜"+(Number(x.estimated)?"經典推定":"客戶端資料；取得狀態待逐件確認"),"gt-muted"),node("p",x.source_summary||"取得來源待查"));
 const stats=Object.entries(gearStatNames).filter(([k])=>Number(x[k])).map(([k,v])=>v+" "+x[k]);if(x.dps)stats.unshift("武器DPS "+x.dps+(Number(x.dps_approx)?"（估算）":""));if(stats.length)c.append(node("p",stats.join(" · ")));
 if(weighted){const score=scoreCache.get(x);c.append(node("p","部分面板試算："+score.total.toFixed(2)+"｜"+(score.parts.map(v=>v.label+" "+v.value+" × "+v.weight).join("；")||"無已計分面板屬性"),"gt-muted"));}
 const qualityLabel=["粗糙","普通","優良","精良","史詩","傳說","神器","傳家寶"][Number(x.quality)]||"品質待查";
 add(c,node("p",qualityLabel+"｜需求等級 "+(x.required_level||"未標示")+"｜物品等級 "+(x.item_level||"未標示")+(x.bonding?"｜"+x.bonding:"")+(Number(x.is_unique)?"｜唯一限制（詳見物品提示）":"")+(knownIds.has(String(x.id))?"｜已在本站候選":"｜尚未納入本站候選"),"gt-muted"));
 if(x.speed)add(c,node("p","速度 "+x.speed+" 秒"+(x.min_damage&&x.max_damage?"｜傷害 "+x.min_damage+"–"+x.max_damage:""),"gt-muted"));
 if(x.item_set||x.effects||x.other_stats||x.required_reputation){const detail=node("details");detail.append(node("summary","套裝、特殊效果與額外限制"));if(x.item_set)detail.append(node("p","套裝："+x.item_set));if(x.effects)detail.append(node("p",String(x.effects)));if(x.other_stats)detail.append(node("p","額外屬性："+x.other_stats));if(x.required_reputation)detail.append(node("p","聲望條件："+x.required_reputation));detail.append(node("p","特殊效果尚未納入實戰計分；英文原文若無可靠翻譯仍保留。","gt-muted"));c.append(detail);}
 const baseline=button("設為同部位比較基準",()=>{compareBase=x;comparison.replaceChildren(node("p","比較基準："+zhItem(x)),button("清除比較基準",()=>{compareBase=null;comparison.replaceChildren();draw();}));if(!(sl.value&&gearCatalogEligible(spec,x,data.prof,sl.value)))sl.value=gearSlotNames[x.slot];q.value="";armorFilter.value="";coverageFilter.value="";kind.value="";quality.value="";levelMin.value="";limit=40;draw();});c.append(baseline);
 if(compareBase&&(catalogSameSlot(x,compareBase)||(sl.value==="副手"&&gearCatalogEligible(spec,x,data.prof,"副手")&&gearCatalogEligible(spec,compareBase,data.prof,"副手")))&&String(x.id)!==String(compareBase.id)){const differences=catalogDiff(x,compareBase);const diff=node("details");diff.append(node("summary","相較基準的屬性差異"));for(const v of differences)diff.append(node("p",v.label+"："+v.b+" → "+v.a+"（"+(v.delta>0?"+":"")+v.delta+"）"));if(!differences.length)diff.append(node("p","已收錄面板數值無差異"));diff.append(node("p","不含特殊效果、套裝、命中上限及實際戰鬥；不是角色DPS差異。","gt-muted"));c.append(diff);}
 list.append(c);}
 if(rows.length>limit)list.append(button("顯示更多40件",()=>{limit+=40;draw();}));if(!rows.length)list.append(node("p","沒有符合條件的裝備。"));
 }
 for(const e of [q,sl,kind,scope,sort,quality,levelMin,armorFilter,coverageFilter])e.addEventListener(e===q||e===levelMin?"input":"change",()=>{limit=40;draw();});add(out,field("搜尋",q),field("部位",sl),field("來源",kind),field("資料範圍",scope),field("護甲範圍",armorFilter),field("候選收錄狀態",coverageFilter),field("品質",quality),field("最低需求等級",levelMin),field("排序（非BiS）",sort),rankNote,omittedNote,comparison,list);draw();
 }catch(e){started=false;status.textContent="資料來源暫時無法讀取；收合後再次展開可重試，原有候選不受影響。";out.replaceChildren(link("開啟外部完整裝備查詢","https://gblaku.github.io/wow-forever-kb/"));}
 });return d;
}
function itemIconURL(map,id){
 const key=String(id??"");
 if(!/^\d+$/.test(key)||map?.build!=="1.60.1.71139")return "";
 const icon=map.items?.[key];
 return typeof icon==="string"&&/^[a-z0-9_]+$/.test(icon)?"https://wow.zamimg.com/images/wow/icons/medium/"+icon+".jpg":"";
}
let itemIconPromise=null;
function loadItemIcons(){
 if(!itemIconPromise)itemIconPromise=fetch("item-icons.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP");return r.json();}).catch(()=>null);
 return itemIconPromise;
}
function itemIcon(id){
 const box=node("span",undefined,"gt-item-icon");box.hidden=true;box.setAttribute("aria-hidden","true");
 loadItemIcons().then(map=>{if(!box.isConnected)return;const url=itemIconURL(map,id);if(!url)return;
 const img=node("img");img.alt="";img.width=36;img.height=36;img.loading="lazy";img.referrerPolicy="no-referrer";
 img.onerror=()=>{box.hidden=true;};box.hidden=false;box.append(img);img.src=url;
 });return box;
}
function candidateDataCoverage(ids,locale,iconMap){
 const unique=[...new Set(ids.map(String).filter(id=>/^\d+$/.test(id)))];
 const localized=locale?.build==="1.60.1.71139"?unique.filter(id=>typeof locale.items?.[id]==="string"&&/[\u3400-\u9fff]/.test(locale.items[id])).length:null;
 const icons=iconMap?.build==="1.60.1.71139"?unique.filter(id=>!!itemIconURL(iconMap,id)).length:null;
 return {total:unique.length,localized,icons};
}
function candidateDataCoverageView(items){
 const d=node("details",undefined,"gt-card gt-display-coverage"),out=node("div");
 add(d,node("summary","繁中名稱與圖示涵蓋率"),node("p","只統計此構築候選中的不同物品ID；原始圖示有對應，不代表外部圖片一定能成功載入。","gt-muted"),out);
 let loaded=false;
 d.addEventListener("toggle",async()=>{if(!d.open||loaded)return;loaded=true;
 const map=await loadItemIcons();if(!d.isConnected)return;
 const v=candidateDataCoverage(items.map(x=>x.id),globalThis.GTLocaleData,map);
 out.replaceChildren(node("p","候選物品："+v.total+" 件"),node("p","官方繁中名稱："+(v.localized===null?"指定版本資料未取得":v.localized+" / "+v.total)),node("p","原始圖示對應："+(v.icons===null?"指定版本圖示資料未取得":v.icons+" / "+v.total)),node("p","未對應的物品維持參考譯名／英文或不顯示圖示，不猜測。","gt-muted"));
 });return d;
}
function auditSlotOrder(name){
 const s=String(name||"");const groups=[/頭部|頭盔|^頭$/,/頸部|項鍊/,/肩部|肩甲/,/背部|披風/,/胸部|胸甲/,/手腕|護腕/,/手部|手套/,/腰部|腰帶/,/腿部|腿甲/,/腳部|足部|鞋|靴/,/戒指|指環/,/飾品/,/副手|盾牌/,/遠程|遠距|聖物|魔杖|塑像|圖騰|聖契/,/主手|單手|雙手|近戰|武器/];
 const n=groups.findIndex(re=>re.test(s));return n===12?13:n===13?14:n===14?12:n<0?99:n;
}
function auditMatches(x,slot,terms){
 const fields=[slot,x.name,globalThis.GTLocale?.item(x.id,x.name),x.source,x.id,x.type,...Object.keys(x.stats||{}),...Object.keys(x.wm||{})];
 return terms.every(t=>fields.concat(fields.map(v=>typeof zhDisplay==="function"?zhDisplay(v??""):v)).join(" ").toLowerCase().includes(t));
}
// Mutually exclusive display groups, not a new BiS recommendation.
function auditWeaponSlot(name,type=""){
 const slot=String(name||"");
 if(/遠程|遠距|聖物|魔杖|塑像|圖騰|聖契|ranged|relic/i.test(slot))return "";
 if(/副手|盾牌|off.hand/i.test(slot))return "off";
 if(/主手|單手|雙手|近戰|武器|main.hand/i.test(slot)){
  if(/雙手|two.hand|法杖|長柄|staff|staves|polearm/i.test(type)||/雙手/.test(slot))return "two";
  return "main";
 }
 return "";
}
function auditWeaponGroups(slots,compare=()=>0){
 const common=[],groups={two:[],main:[],off:[]},seen={two:new Set(),main:new Set(),off:new Set()};
 for(const slot of slots){
  if(!auditWeaponSlot(slot.name)){common.push(slot);continue;}
  for(const x of slot.items){
   const kind=auditWeaponSlot(slot.name,x.type),id=String(x.id);
   if(!kind||seen[kind].has(id))continue;seen[kind].add(id);groups[kind].push(x);
  }
 }
 for(const items of Object.values(groups))items.sort(compare);
 return {common,groups,modes:[...(groups.two.length?["two"]:[]),...(groups.main.length||groups.off.length?["one"]:[])]};
}
function auditWeaponVisible(partition,mode){
 const {common,groups}=partition,selected=mode==="two"?[["雙手武器",groups.two]]:[["主手武器",groups.main],["副手物品",groups.off]];
 return [...common,...selected.filter(([,items])=>items.length).map(([name,items])=>({name,items}))].sort((a,b)=>auditSlotOrder(a.name)-auditSlotOrder(b.name));
}
// Character paper-doll positions, not item categories. Ranged and relic share one position.
function auditEquipmentSlots(partition,mode,compare=()=>0){
 const labels=["頭部","頸部","肩部","背部","胸部","手腕","手部","腰部","腿部","腳部","戒指","飾品"];
 const pools=new Map(labels.concat("遠程／聖物").map(n=>[n,[]]));
 for(const slot of partition.common){
  const order=auditSlotOrder(slot.name),name=order===14?"遠程／聖物":labels[order];
  if(name)pools.get(name).push(...slot.items);
 }
 const unique=items=>{const seen=new Set();return [...items].sort(compare).filter(x=>{const id=String(x.id??"");if(!id||seen.has(id))return false;seen.add(id);return true;});};
 const rows=labels.flatMap(name=>{const items=unique(pools.get(name)),count=name==="戒指"||name==="飾品"?2:1;return Array.from({length:count},(_,i)=>({name:count===2?name+" "+(i+1):name,group:name,items}));});
 const melee=mode==="two"?[["雙手武器",partition.groups.two]]:[["主手武器",partition.groups.main],["副手物品",partition.groups.off]];
 return [...rows,...melee.map(([name,items])=>({name,group:name,items:unique(items)})),{name:"遠程／聖物",group:"遠程／聖物",items:unique(pools.get("遠程／聖物"))}];
}
function auditEquipmentChoices(slots,match=()=>true){
 const used=new Set();
 return slots.map(slot=>{
  const matches=slot.items.filter(x=>match(x,slot.name));
  const available=matches.filter(x=>!used.has(String(x.id)));
  const featured=available.find(x=>!x.review&&!x.model?.incomplete)||available[0]||null;
  if(featured)used.add(String(featured.id));
  return {...slot,matches,featured};
 });
}
function auditWeaponPreference(modes,stored){return modes.includes(stored)?stored:modes[0]||"";}
function auditOtherWeaponMatches(partition,mode,match){
 const other=partition.modes.find(m=>m!==mode);
 if(!other)return {mode:"",count:0};
 const names=other==="two"?[["雙手武器",partition.groups.two]]:[["主手武器",partition.groups.main],["副手物品",partition.groups.off]];
 return {mode:other,count:names.reduce((n,[slot,items])=>n+items.filter(x=>match(x,slot)).length,0)};
}
function audit(){
 panel.replaceChildren();
 const spec=bySpec.get(getSpec());if(!spec)return;
 const q=inp("搜尋裝備、部位、來源或物品 ID（可用空格分隔）"),mode=select([["all","全部部位"],["missing","僅顯示缺資料候選"]]),acq=select([["","全部取得方式"],["聲望","聲望"],["世界掉落","世界掉落"],["製作","專業製作"],["裝綁","裝備綁定／拍賣場"],["任務","任務"],["商人","商人／兌換"],["其他","其他（含副本）"]]),out=node("div");acq.id="gt-acquisition-filter";acq.setAttribute("aria-label","取得方式");
 const saved=savedModel(spec.id),effective=effectiveGearWeights(spec.id,saved?.weights||{}),model=saved&&Object.values(effective).some(v=>v>0)?{...saved,weights:effective}:null;
 const workspace=node("div",undefined,"gt-build-workspace"),left=node("section",undefined,"gt-build-column"),right=node("section",undefined,"gt-build-column"),gearScroll=node("div",undefined,"gt-gear-scroll"),gearFilters=node("div",undefined,"gt-gear-filters"),jump=select([["","跳至裝備部位"]]),compact=select([["full","完整屬性"],["compact","精簡裝備列表"]]);
 const candidateSlots=expandCandidateSlots(spec);
 const compare=(a,b)=>Number(!!a.review)-Number(!!b.review)||(model?(Number(a.model.incomplete)-Number(b.model.incomplete)||b.model.total-a.model.total):0)||Number(!!b.priority)-Number(!!a.priority)||(a.rank||999)-(b.rank||999);
 const slots=[...candidateSlots].sort((a,b)=>auditSlotOrder(a[0])-auditSlotOrder(b[0])).map(([name,items])=>({name,items:items.filter(x=>allowed(spec.id,x)).map(x=>model?{...x,model:modelScore(x,model.weights,model.hitBySlot?.[name])}:x).sort(compare)}));
 const excluded=[...candidateSlots.values()].flat().filter(x=>!allowed(spec.id,x));
 if(feralWeaponMode(spec.id)==="twohand"){for(let i=slots.length-1;i>=0;i--){if(/副手|盾牌|單手|主手/.test(slots[i].name)&&!slots[i].items.length)slots.splice(i,1);}}
 const partition=auditWeaponGroups(slots,compare),weaponMode=select(partition.modes.map(m=>[m,m==="two"?"雙手武器":"單手＋副手（或雙持）"]));
 const weaponModeKey="gt-weapon-view-v1:"+spec.id+":"+buildFor(spec.id);
 let storedMode="";try{storedMode=localStorage.getItem(weaponModeKey)||"";}catch(e){}
 weaponMode.value=auditWeaponPreference(partition.modes,storedMode);
 weaponMode.id="gt-gear-weapon-mode";
 function chooseWeaponMode(value){if(!partition.modes.includes(value))return;weaponMode.value=value;try{localStorage.setItem(weaponModeKey,value);}catch(e){}draw();armorPlan.dispatchEvent(new Event("gt-weapon-mode-change"));}
 const all=slots.flatMap(x=>x.items),sourceMissing=x=>!x.source||/待查|待核|未知|未確認|衝突/.test(x.source+" "+(x.availability||"")),evidenceMissing=x=>!x.evidence,missing=x=>sourceMissing(x)||evidenceMissing(x)||!!x.review||!!x.model?.incomplete;
 const populated=slots.filter(x=>x.items.length),firsts=slots.map(x=>x.items.find(i=>!i.review&&!i.model?.incomplete)).filter(Boolean);
 const metrics=node("div",undefined,"gt-bis-summary");
 for(const [v,label] of [[populated.length+"/"+slots.length,"已有候選部位"],[firsts.filter(x=>!missing(x)).length+"/"+slots.length,"優先候選有來源及證據文字"],[all.length,"候選裝備筆數"],[all.filter(evidenceMissing).length,"缺證據文字"],[all.filter(sourceMissing).length,"來源待查"],[all.filter(missing).length,"需補資料候選"]]){const c=node("div",undefined,"gt-bis-metric");add(c,node("strong",String(v)),node("small",label));metrics.append(c);}
 const progress=node("div",undefined,"gt-bis-progress"),bar=node("span");bar.style.width=(slots.length?100*firsts.filter(x=>!missing(x)).length/slots.length:0)+"%";progress.append(bar);progress.setAttribute("role","progressbar");progress.setAttribute("aria-label","優先候選來源及證據文字完整度");progress.setAttribute("aria-valuenow",String(Math.round(slots.length?100*firsts.filter(x=>!missing(x)).length/slots.length:0)));
 function status(x){if(x.model?.incomplete)return node("span","計分資料不足","gt-bis-status gt-bis-review");if(x.review)return node("span","適用性待複核","gt-bis-status gt-bis-review");if(sourceMissing(x))return node("span","來源待核","gt-bis-status gt-bis-missing");if(x.externalCandidate)return node("span",x.priority?"外部攻略首選":"跨來源候選","gt-bis-status gt-bis-present");return null;}
 function statGroup(label,entries,weapon=false){
  if(!entries.length)return null;
  const wrap=node("div"),grid=node("div",undefined,"gt-stat-group"+(weapon?" gt-stat-weapon":""));
  for(const [k,v] of entries){
   const category=weapon?"":/耐力|護甲|防禦|閃躲|躲閃|招架|格擋|抗性|stamina|armor|defen[cs]e|dodge|parry|block/i.test(k)?" gt-stat-defense":/法術|法傷|治療|智力|精神|法力|spell|healing|mana|intellect/i.test(k)?" gt-stat-magic":/力量|敏捷|攻擊|命中|爆擊|致命|急速|精準|strength|agility|attack|hit|crit/i.test(k)?" gt-stat-offense":"";
   const tile=node("div",undefined,"gt-stat-chip"+category);
   add(tile,node("small",k),node("b",String(v)));grid.append(tile);
  }
  add(wrap,node("div",label,"gt-stat-title"),grid);return wrap;
 }
 function itemView(x){
  const c=node("div",undefined,"gt-bis-alt"),name=link((x.rank?"#"+x.rank+" ":"")+(globalThis.GTLocale?.item(x.id,x.name)||x.name),x.url);name.className="gt-bis-name";
  const source=node("div",undefined,"gt-bis-source");add(source,node("small","取得來源"),node("strong",x.source));
  const heading=node("div",undefined,"gt-item-heading");add(heading,itemIcon(x.id),name);c.append(heading);const warning=status(x);if(warning)c.append(warning);c.append(source);if(x.model)add(c,node("p","試算分："+x.model.total.toFixed(2)+(x.model.incomplete?"（缺武器DPS）":""),"gt-muted"));if(x.review)add(c,node("p",x.review,"gt-stat-warning"));
  const stats=node("div",undefined,"gt-stat-wrap");
  const weapon=Object.entries(x.wm||{}).filter(([k,v])=>k&&v!==""),normal=Object.entries(x.stats||{}).filter(([k])=>k);
  const order=k=>/每秒傷害|DPS/i.test(k)?0:/速度|speed/i.test(k)?1:/傷害範圍|damage/i.test(k)?2:3;
  weapon.sort((a,b)=>order(a[0])-order(b[0]));
  for(const group of [statGroup("武器數值",weapon,true),statGroup("一般屬性",normal)])if(group)stats.append(group);
  if(stats.childElementCount)c.append(stats);return c;
 }
 function evidenceView(x){const d=node("details");add(d,node("summary","來源與備註"),node("p",x.evidence||"未提供證據文字","gt-muted"));if(x.externalCandidate)add(d,node("p",[x.acquisition,x.bond,x.availability].filter(Boolean).join("｜"),"gt-muted"));const ref=communityMatch(spec.id,buildFor(spec.id),x);if(ref)add(d,node("p","外部同ID／手位推薦："+(ref.known?"來源有記錄":"取得待查")+"（11/25；非本站已驗證BiS）","gt-muted"));if(x.note)add(d,node("p",x.note,"gt-muted"));for(const [i,url] of (x.sourceRefs||[]).entries())add(d,link("外部查證來源 "+(i+1),url),node("p",""));return d;}
 function draw(){out.replaceChildren();const term=q.value.trim().toLowerCase(),terms=term.split(/\s+/).filter(Boolean),grid=node("div",undefined,"gt-bis-grid");let count=0;
 const match=(x,slot)=>(mode.value!=="missing"||missing(x))&&acquisitionMatches(x,acq.value)&&auditMatches(x,slot,terms);
 const visibleSlots=auditEquipmentChoices(auditEquipmentSlots(partition,weaponMode.value,compare),match),filtered=!!(term||acq.value||mode.value==="missing");
 const chosen=new Set(visibleSlots.filter(x=>x.featured).map(x=>String(x.featured.id)));
 for(const slot of visibleSlots){const {featured,matches}=slot;if(filtered&&!matches.length)continue;count++;
 const c=node("article",undefined,"gt-bis-slot");c.dataset.slot=slot.name;c.append(node("h4",slot.name));
 if(featured){c.dataset.featuredId=String(featured.id);add(c,itemView(featured),evidenceView(featured));}else c.append(node("span",slot.items.length?"沒有另一件符合條件的不同物品":"尚無候選／職業不適用","gt-bis-status gt-bis-missing"));
 const alternatives=matches.filter(x=>!chosen.has(String(x.id)));if(alternatives.length){const d=node("details");d.append(node("summary","展開其他候選（"+alternatives.length+"）"));for(const x of alternatives)add(d,itemView(x),evidenceView(x));c.append(d);}grid.append(c);}
 add(out,node("p","顯示 "+count+" / "+visibleSlots.length+" 個戰鬥裝備位置｜候選首列 "+visibleSlots.filter(x=>x.featured).length+" 件不同物品；襯衣與外袍不列入BiS。","gt-muted"));if(term||acq.value||mode.value==="missing"){const other=auditOtherWeaponMatches(partition,weaponMode.value,match);if(other.count){const hint=node("div",undefined,"gt-other-weapon-matches");add(hint,node("span","另一種武器配置另有 "+other.count+" 件符合條件。"),button(other.mode==="two"?"查看雙手武器":"查看單手＋副手",()=>chooseWeaponMode(other.mode)));out.append(hint);}}out.append(grid);if(!count)out.append(node("p","沒有符合條件的候選。"));jump.replaceChildren(new Option("跳至裝備部位",""),...Array.from(grid.children).map(c=>new Option(c.dataset.slot,c.dataset.slot)));gearScroll.scrollTop=0;}
 const excludedDetails=node("details");excludedDetails.append(node("summary","檢視構築排除清單（"+excluded.length+"）"));for(const x of excluded)add(excludedDetails,node("p",x.slot+" · "+x.name+" — "+skillGate(spec.id,x),"gt-muted"),link("原物品資料",x.url));q.addEventListener("input",draw);mode.addEventListener("change",draw);acq.addEventListener("change",draw);weaponMode.addEventListener("change",()=>chooseWeaponMode(weaponMode.value));
 const frame=node("iframe",undefined,"gt-build-talent-frame");frame.title="並排天賦流派";frame.src=talentPageURL(true)+"&layout=workspace&v=21.8";frame.loading="lazy";
 const leftHead=node("div",undefined,"gt-build-column-head"),rightHead=node("div",undefined,"gt-build-column-head");
 add(leftHead,node("h4","天賦流派"),link("獨立開啟天賦",talentPageURL(false)));
 const filterToggle=button("收合篩選",()=>{gearFilters.hidden=!gearFilters.hidden;filterToggle.textContent=gearFilters.hidden?"展開篩選":"收合篩選";filterToggle.setAttribute("aria-expanded",String(!gearFilters.hidden));});filterToggle.setAttribute("aria-expanded","true");gearFilters.id="gt-gear-filter-panel";filterToggle.setAttribute("aria-controls",gearFilters.id);add(rightHead,node("h4","BiS 裝備候選"),add(node("div",undefined,"gt-gear-head-actions"),filterToggle,button("回到頂端",()=>{gearScroll.scrollTop=0;jump.value="";})));
 jump.id="gt-gear-slot-jump";compact.id="gt-gear-density";compact.addEventListener("change",()=>{gearScroll.classList.toggle("gt-gear-compact",compact.value==="compact");});
 gearScroll.tabIndex=0;gearScroll.setAttribute("role","region");gearScroll.setAttribute("aria-label","依部位捲動裝備候選");
 jump.addEventListener("change",()=>{const target=Array.from(out.querySelectorAll(".gt-bis-slot")).find(c=>c.dataset.slot===jump.value);if(target)gearScroll.scrollTop+=target.getBoundingClientRect().top-gearScroll.getBoundingClientRect().top-8;});
 const moreFilters=node("details",undefined,"gt-gear-more-filters"),moreFields=node("div",undefined,"gt-gear-more-fields");add(moreFields,field("取得方式",acq),field("篩選",mode),field("顯示密度",compact),button("清除篩選",()=>{q.value="";acq.value="";mode.value="all";draw();}));add(moreFilters,node("summary","更多篩選與顯示設定"),moreFields);add(gearFilters,field("搜尋",q),field("跳至部位",jump),...(partition.modes.length>1?[field("武器配置（擇一）",weaponMode)]:[]),moreFilters);add(gearScroll,out);add(left,leftHead,frame);add(right,rightHead,gearFilters,gearScroll);add(workspace,left,right);
 const research=node("details",undefined,"gt-card gt-audit-research"),tools=node("details",undefined,"gt-card gt-audit-tools");
 add(research,node("summary","配裝研究與資料核對"),bisReasonView(spec),...(spec.id==="spec-26"?[feralSetView(spec)]:[]),...(spec.id==="spec-26"&&feralWeaponMode(spec.id)==="twohand"?[catWeaponResearch(spec)]:[]),communityEvidenceView(spec,slots),candidateAuditView(spec,slots),candidateDataCoverageView(all),excludedDetails,node("p","構築排除 "+excluded.length+" 筆不適用候選。","gt-muted"),metrics,progress,node("p","完整度僅統計已列部位及文字資料，不代表已驗證。","gt-muted"));
 const armorPlan=catalogArmorPlanView(spec,()=>weaponMode.value||"auto");add(tools,node("summary","進階配裝與全裝備查詢"),armorPlan,gearCatalogView(spec),...(model&&feralWeaponMode(spec.id)!=="twohand"?[weaponSetView(spec,model)]:[]));
 nativeSetTrialView(panel,spec.id);
 add(panel,workspace,node("p",(model?"排序："+(model.source||"本機權重")+"（部分面板試算）":"排序：既有候選及外部攻略，非實戰BiS。")+(omittedFeralWeights(spec.id,saved?.weights).length?" 野性武器DPS未計入。":""),"gt-muted"),button("前往實戰模擬／配裝 JSON 匯出",()=>show("combat")),tools,research);draw();attachLegacy(spec);
}
function talentPageURL(embedded=false){
 const id=getSpec(),p=new URLSearchParams();
 if(id){const i=Number(id.split("-")[1])-1,classes=["warrior","paladin","hunter","rogue","priest","shaman","mage","warlock","druid"];p.set("class",classes[Math.min(8,Math.floor(i/3))]);p.set("spec",id);p.set("build",buildFor(id));}
 if(embedded)p.set("embed","1");return "talents.html"+(p.size?"?"+p.toString():"");
}
let frameCleanup=null;
function cleanupFrame(){if(frameCleanup){frameCleanup();frameCleanup=null;}}
function fitEmbedded(frame){
 cleanupFrame();
 let observer=null,child=null,stopped=false;
 const onload=()=>{if(stopped)return;observer?.disconnect();observer=null;try{const doc=frame.contentDocument,win=frame.contentWindow;if(!doc?.body||!win)return;child=doc.querySelector("main")||doc.body;const fit=()=>{if(stopped||!frame.isConnected)return;const height=Math.max(280,Math.ceil(child.getBoundingClientRect().height)+24);if(Math.abs(frame.getBoundingClientRect().height-height)>2)frame.style.height=height+"px";};observer=typeof win.ResizeObserver==="function"?new win.ResizeObserver(fit):null;observer?.observe(child);fit();}catch(e){}};
 frame.addEventListener("load",onload);frameCleanup=()=>{stopped=true;observer?.disconnect();frame.removeEventListener("load",onload);};
}
// Local deterministic scheduling model. No inferred game coefficients or gear-to-DPS conversion.
const combatPaths=["warrior/dps","warrior/dps","warrior/protection","paladin/holy","paladin/protection","paladin/retribution","hunter/dps","hunter/dps","hunter/dps","rogue/dps","rogue/dps","rogue/dps","priest/healer","priest/healer","priest/dps","shaman/elemental","shaman/enhancement","shaman/restoration","mage/dps","mage/dps","mage/dps","warlock/dps","warlock/dps","warlock/dps","druid/balance","druid/feralcat","druid/feralbear","druid/restoration"];
function combatEngineURL(id){const p=/^spec-(?:[1-9]|1[0-9]|2[0-8])$/.test(String(id))?combatPaths[Number(String(id).split("-")[1])-1]:null;return p?"https://www.wowsims.com/forever/"+p+"/":null;}
function simulatePriority(raw,reverse=false,killHealth=null){
 const finite=(v,min,max)=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
 if(!raw||!finite(raw.duration,1,600)||!finite(raw.gcd,.1,10)||!finite(raw.cap,1,1000000)||!finite(raw.initial,0,raw.cap)||!finite(raw.regen,0,100000)||!Array.isArray(raw.skills)||raw.skills.length<1||raw.skills.length>30)throw Error("戰鬥時間、資源、共用冷卻或技能數量不合法");
 const targets=raw.targets??1;
 if(!Number.isInteger(targets)||targets<1||targets>20)throw Error("目標數必須為 1–20 的整數");
 if(killHealth!==null&&!finite(killHealth,1,1e9))throw Error("每個目標血量不合法");
 const remaining=killHealth===null?null:Array(targets).fill(killHealth),deathTimes=Array(targets).fill(null);let overkill=0;
 const metrics=["damage","threat","healing"];
 const demand=raw.healingDemand;
 if(demand!=null&&(typeof demand!=="object"||Array.isArray(demand)||!finite(demand.initial??0,0,1e9)||!finite(demand.rate??0,0,1e7)||demand.bursts!=null&&(!Array.isArray(demand.bursts)||demand.bursts.length>30||demand.bursts.some(b=>!b||!finite(b.time,0,600)||!finite(b.amount,0,1e9)))))throw Error("治療需求參數不合法");
 const incoming=demand?(demand.bursts??[]).slice().sort((a,b)=>a.time-b.time):[];
 let deficit=demand?.initial??0,peakDeficit=deficit,burstIndex=0,effective=0,overheal=0,incomingTotal=deficit;
 const parseBuff=(b,external=false)=>{
  if(!b||typeof b.name!=="string"||!b.name.trim()||b.name.length>80||!finite(b.duration,.1,600)||external&&!finite(b.start,0,600)||metrics.some(k=>!finite(b[k]??1,0,3)))throw Error("增益名稱、起始時間、持續時間或倍率不合法");
  return {...b,...Object.fromEntries(metrics.map(k=>[k,b[k]??1]))};
 };
 if(raw.buffs!=null&&(!Array.isArray(raw.buffs)||raw.buffs.length>8))throw Error("外部增益最多 8 個");
 const external=(raw.buffs??[]).map(b=>parseBuff(b,true));
 const skills=raw.skills.map(x=>{if(!x||typeof x.name!=="string"||!x.name.trim()||x.name.length>80||!finite(x.cost,0,raw.cap)||!finite(x.gain,0,raw.cap)||!finite(x.cd,0,600)||!finite(x.cast,0,60)||!finite(x.damage,0,1e9)||!finite(x.threat,0,1e9)||!finite(x.healing??0,0,1e9))throw Error("技能欄位必須填入非負有限數值，且消耗不超過資源上限");if(!finite(x.earliest??0,0,600)||!finite(x.latest??600,0,600)||(x.earliest??0)>(x.latest??600)||!finite(x.reserve??0,0,raw.cap))throw Error("技能可用時間窗或保留資源不合法");if(!Number.isInteger(x.targetCap??1)||(x.targetCap??1)<1||(x.targetCap??1)>20)throw Error("技能目標上限必須為 1–20 的整數");if(x.group!=null&&(typeof x.group!=="string"||!x.group.trim()||x.group.length>80||!finite(x.groupCd,.1,600))||x.group==null&&x.groupCd!=null)throw Error("共用冷卻組別或秒數不合法");return {...x,healing:x.healing??0,earliest:x.earliest??0,latest:x.latest??600,reserve:x.reserve??0,targetCap:x.targetCap??1,buff:x.buff==null?null:parseBuff(x.buff),healMin:x.healMin??0};});
 if(new Set(skills.map(x=>x.name)).size!==skills.length)throw Error("技能名稱不得重複");
 if(skills.some(x=>!finite(x.healMin,0,1e9)||x.healMin>0&&!demand))throw Error("治療技能缺口門檻不合法，須先設定 healingDemand");
 if(new Set([...external,...skills.flatMap(x=>x.buff?[x.buff]:[])].map(b=>b.name)).size>8)throw Error("不同名稱的增益最多 8 個");
 if(reverse)skills.reverse();
 const ready=new Map(),groups=new Map(),active=new Map(),events=[],totals={damage:0,threat:0,healing:0},targetThreat=Array(targets).fill(0),targetDamage=Array(targets).fill(0);let t=0,resource=raw.initial,idle=0,wasted=0;
 const groupReady=x=>x.group?(groups.get(x.group)||0):0;
 const buffsAt=time=>{
  const buffs=new Map();
  for(const b of external)if(time>=b.start-1e-8&&time<b.start+b.duration-1e-8)buffs.set(b.name,b);
  for(const [name,b] of active)if(time<b.end-1e-8)buffs.set(name,b);
  return [...buffs.values()];
 };
 const advance=to=>{
  const dt=to-t,next=resource+raw.regen*dt;wasted+=Math.max(0,next-raw.cap);resource=Math.min(raw.cap,next);
  if(demand){const damage=(demand.rate??0)*dt;deficit+=damage;incomingTotal+=damage;while(burstIndex<incoming.length&&incoming[burstIndex].time<=to+1e-8){const v=incoming[burstIndex++].amount;deficit+=v;incomingTotal+=v;}peakDeficit=Math.max(peakDeficit,deficit);}
  t=to;
 };
 advance(0);
 const nextHealTime=min=>{
  if(!demand||deficit+1e-8>=min)return t;
  const rate=demand.rate??0;let at=t,missing=min-deficit;
  for(let i=burstIndex;i<incoming.length;i++){const b=incoming[i],dt=b.time-at;if(rate>0&&missing<=rate*dt)return at+missing/rate;missing-=rate*dt+b.amount;at=b.time;if(missing<=1e-8)return at;}
  return rate>0?at+missing/rate:Infinity;
 };
 while(t<raw.duration-1e-8&&(!remaining||remaining.some(v=>v>0))){
  const skill=skills.find(x=>t+1e-8>=x.earliest&&t<=x.latest+1e-8&&(ready.get(x.name)||0)<=t+1e-8&&groupReady(x)<=t+1e-8&&x.cost+x.reserve<=resource+1e-8&&x.healMin<=deficit+1e-8&&t+x.cast<=raw.duration+1e-8);
  if(!skill){
   // Jump to the next real eligibility boundary rather than polling every 100 ms.
   let next=raw.duration;
   for(const x of skills){
    const need=x.cost+x.reserve;if(need>raw.cap+1e-8)continue;
    const wait=need<=resource+1e-8?0:raw.regen>0?(need-resource)/raw.regen:Infinity;
    const candidate=Math.max(t+wait,x.earliest,ready.get(x.name)||0,groupReady(x),nextHealTime(x.healMin));
    if(candidate>t+1e-8&&candidate<=x.latest+1e-8&&candidate+x.cast<=raw.duration+1e-8)next=Math.min(next,candidate);
   }
   idle+=next-t;advance(next);continue;
  }
  const start=t,before=resource;resource=Math.max(0,resource-skill.cost);advance(Math.min(raw.duration,t+skill.cast));wasted+=Math.max(0,resource+skill.gain-raw.cap);resource=Math.min(raw.cap,resource+skill.gain);
  ready.set(skill.name,t+skill.cd);
  if(skill.group)groups.set(skill.group,t+skill.groupCd);
  const hitIds=Array.from({length:targets},(_,i)=>i).filter(i=>!remaining||remaining[i]>0).slice(0,skill.targetCap),hits=hitIds.length,buffs=buffsAt(t);
  const multiplier=k=>buffs.reduce((n,b)=>n*b[k],1);
  const perDamage=skill.damage*multiplier("damage"),perThreat=skill.threat*multiplier("threat");
  let applied=0,excess=0;for(const i of hitIds){const amount=remaining?Math.min(remaining[i],perDamage):perDamage;applied+=amount;excess+=perDamage-amount;targetThreat[i]+=perThreat;targetDamage[i]+=amount;if(remaining){remaining[i]=Math.max(0,remaining[i]-amount);if(remaining[i]===0)deathTimes[i]=t;}}overkill+=excess;
  const delta={damage:applied,threat:perThreat*hits,healing:skill.healing*multiplier("healing")};
  for(const k of metrics)totals[k]+=delta[k];
  const healed=demand?Math.min(deficit,delta.healing):0;if(demand){deficit-=healed;effective+=healed;overheal+=delta.healing-healed;}
  events.push({time:start,finish:t,name:skill.name,before,after:resource,...totals,delta,hits,buffs:buffs.map(b=>b.name),effective:healed,deficit:demand?deficit:null,...(remaining?{hitIds,overkill:excess,remaining:[...remaining]}:{})});
  if(skill.buff)active.set(skill.buff.name,{...skill.buff,end:t+skill.buff.duration});
  if(remaining&&remaining.every(v=>v===0))break;
  advance(Math.min(raw.duration,Math.max(t,start+raw.gcd)));
 }
 return {duration:raw.duration,targets,targetThreat,targetDamage,events,totals,idle,wasted,...(remaining?{kill:{health:killHealth,remaining,deathTimes,overkill,elapsed:t,cleared:remaining.every(v=>v===0),killTime:remaining.every(v=>v===0)?t:null}}:{}),healingDemand:demand?{incoming:incomingTotal,effective,overheal,deficit,peakDeficit}:null,rate:{...Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,v/raw.duration])),...(demand?{effective:effective/raw.duration}:{})}};
}
function combatBestPriority(raw,metric,mode="total"){
 if(!["damage","threat","healing","effective"].includes(metric)||metric==="effective"&&!raw?.healingDemand||!["total","weakest"].includes(mode))throw Error("未知最佳化目標");
 simulatePriority(raw);
 if(raw.skills.length>5)throw Error("完整優先序搜尋最多 5 個技能（120 種排列），請縮小範圍");
 let best=null,count=0;function visit(prefix,left){if(!left.length){const r=simulatePriority({...raw,skills:prefix});count++;if(!best||(combatObjective(r,metric,mode)>combatObjective(best.result,metric,mode)+1e-8||metric==="effective"&&Math.abs(combatObjective(r,metric,mode)-combatObjective(best.result,metric,mode))<=1e-8&&r.healingDemand.peakDeficit<best.result.healingDemand.peakDeficit-1e-8))best={order:prefix.map(x=>x.name),result:r};return;}for(let i=0;i<left.length;i++)visit([...prefix,left[i]],left.filter((_,j)=>i!==j));}
 visit([],raw.skills);return {...best,count,metric};
}
function combatObjective(result,metric,mode="total"){
 if(metric==="threat"&&mode==="weakest")return Math.min(...result.targetThreat)/result.duration;
 return result.rate[metric];
}
function combatTargetSweep(raw,metric,mode="total"){
 if(!["damage","threat","healing"].includes(metric)||!["total","weakest"].includes(mode))throw Error("未知最佳化目標");
 simulatePriority(raw);
 return [1,2,3,5,8].map(targets=>{
  const data={...raw,targets},original=simulatePriority(data),reverse=simulatePriority(data,true);
  return {targets,original,reverse,best:raw.skills.length<=5?combatBestPriority(data,metric,mode):null};
 });
}
function combatSkillStats(result){
 const by=new Map();
 for(const e of result.events){const x=by.get(e.name)||{name:e.name,count:0,first:e.time,last:e.time,damage:0,threat:0,healing:0};x.count++;x.last=e.time;for(const k of ["damage","threat","healing"])x[k]+=e.delta[k];by.set(e.name,x);}
 return [...by.values()].map(x=>({...x,dps:x.damage/result.duration,tps:x.threat/result.duration,hps:x.healing/result.duration}));
}
function combatDurationSweep(raw,metric){
 if(!["damage","threat","healing"].includes(metric))throw Error("未知最佳化目標");
 simulatePriority(raw);
 return [30,60,120,180].map(duration=>{
  const data={...raw,duration},original=simulatePriority(data),reverse=simulatePriority(data,true);
  const best=raw.skills.length<=5?combatBestPriority(data,metric):null;
  return {duration,original,reverse,best};
 });
}
function combatTimingSweep(raw,skillName,metric){
 if(!["damage","threat","healing"].includes(metric))throw Error("未知最佳化目標");
 const baseline=simulatePriority(raw),skill=raw.skills.find(x=>x.name===skillName);
 if(!skill)throw Error("找不到指定技能，請輸入完整技能名稱");
 const earliest=skill.earliest??0,latest=skill.latest??600;
 const offsets=[0,1,3,5,10,15,20,30].filter(offset=>earliest+offset<=latest&&earliest+offset<raw.duration);
 const rows=offsets.map(offset=>{
  const result=offset===0?baseline:simulatePriority({...raw,skills:raw.skills.map(x=>x===skill?{...x,earliest:earliest+offset}:x)});
  const uses=result.events.filter(e=>e.name===skillName);
  return {offset,earliest:earliest+offset,result,first:uses[0]?.time??null,count:uses.length};
 });
 if(!rows.length)throw Error("指定技能不在此次戰鬥的有效時間窗內");
 return {rows,best:[...rows].sort((a,b)=>b.result.rate[metric]-a.result.rate[metric]||a.offset-b.offset)[0],baseline,skillName,metric};
}
function combatSkillView(parent,result){
 const d=node("details");d.append(node("summary","各技能施放與貢獻（假設模型）"));
 for(const x of combatSkillStats(result))d.append(node("p",x.name+" ｜ "+x.count+" 次 ｜ 首次 "+x.first.toFixed(2)+"s ｜ 最後 "+x.last.toFixed(2)+"s ｜ DPS "+x.dps.toFixed(2)+" ｜ TPS "+x.tps.toFixed(2)+" ｜ HPS "+x.hps.toFixed(2)));
 if(!result.events.length)d.append(node("p","本輪沒有完成技能。","gt-muted"));
 parent.append(d);
}
const combatPresetCommit="3b9c125a9b1387cd53ce2bb12969e0c6b54b813e";
const combatHealSpecs=new Set(["spec-4","spec-13","spec-14","spec-18","spec-28"]),combatTankSpecs=new Set(["spec-3","spec-5","spec-27"]);
function combatRole(id){return combatTankSpecs.has(id)?"tank":combatHealSpecs.has(id)?"heal":"dps";}
function combatMetric(id){return {tank:"threat",heal:"healing",dps:"damage"}[combatRole(id)];}
function combatSnapshotValid(data){return !!data&&data.format===1&&data.release==="v1.0.12"&&data.commit===combatPresetCommit&&Array.isArray(data.cases);}
function combatFailureLabel(reason){const labels={timeout:"引擎逾時","missing-source":"上游設定檔缺少","engine-exit":"引擎執行失敗","invalid-json":"輸出 JSON 無效",validation:"結果或設定未通過驗證",io:"檔案讀寫失敗"};return typeof reason==="string"&&Object.hasOwn(labels,reason)?labels[reason]:"原因未提供";}
function combatCoverage(data){const valid=combatSnapshotValid(data);return Array.from({length:28},(_,i)=>{const id="spec-"+(i+1),count=combatPresetCases(data,id).length,failed=valid&&Array.isArray(data.failed)?data.failed.filter(x=>x?.spec===id).length:0,planned=valid&&Number.isSafeInteger(data.plannedBySpec?.[id])&&data.plannedBySpec[id]>=count+failed?data.plannedBySpec[id]:null;return {id,role:combatRole(id),count,failed,planned,pending:planned===null?null:planned-count-failed};});}
function combatPresetCases(data,id){
 if(!combatSnapshotValid(data))return [];
 return data.cases.filter(x=>x&&x.spec===id&&typeof x.label==="string"&&Number.isFinite(x.dps)&&x.dps>=0&&Number.isFinite(x.duration)&&x.duration>0&&Number.isInteger(x.iterations)&&x.iterations>0&&((Array.isArray(x.timeline)&&x.timeline.length>0)||(x.nativeMetrics&&Number.isFinite(x.nativeMetrics.dps)&&x.nativeMetrics.dps===x.dps))&&[x.settings,x.apl].every(p=>typeof p==="string"&&/^ui\/specs\/[a-zA-Z_0-9/.-]+\.(?:siml|json|ts)$/.test(p)&&!p.includes("..")));
}
function combatGuildCoverage(data,id){
 const planned=data?.plannedScenarios?.[id],cases=Array.isArray(data?.cases)?data.cases:[],failed=Array.isArray(data?.failed)?data.failed:[];
 return Object.entries(guildScenarios).map(([key,cfg])=>{
  const ok=cases.filter(c=>c?.spec===id&&c.scenario===key&&Number.isInteger(c.iterations)&&c.iterations>0&&Number.isFinite(c.duration)&&Math.abs(c.duration-cfg.duration)<1e-6&&Number.isFinite(c.dps)&&c.dps>=0&&c.targetCount===cfg.count&&c.targetHealth===cfg.health&&c.targetLevel===cfg.level&&c.inFrontOfTarget===(combatRole(id)==="tank")).length;
  const failures=failed.filter(c=>c?.spec===id&&c.scenario===key).length,n=planned?.[key];
  return {key,cfg,ok,failures,planned:Number.isInteger(n)&&n>=ok+failures?n:null};
 });
}
function combatNativeGroups(cases){
 const groups=new Map();
 for(const x of cases){if(typeof x.comparisonGroup!=="string"||!x.comparisonGroup.trim())continue;const key=x.comparisonGroup.trim().slice(0,120),rows=groups.get(key)||[];rows.push(x);groups.set(key,rows);}
 return [...groups].map(([label,rows])=>({label,rows}));
}
function combatTimelineText(timeline){
 return (Array.isArray(timeline)?timeline:[]).filter(e=>e&&Number.isFinite(e.timeMs)&&typeof e.label==="string").slice(0,1000).map(e=>(e.timeMs/1000).toFixed(3)+"s ｜ "+e.label).join("\n");
}
function combatPhaseMetrics(result){
 const windows=[[0,Math.min(10,result.duration)],[10,Math.min(30,result.duration)],[30,result.duration]].filter(([a,b])=>b>a);
 return windows.map(([start,end],i)=>{const ev=result.events.filter(e=>e.finish>=start&&(e.finish<end||(end===result.duration&&e.finish===end)));const metrics={damage:0,threat:0,healing:0};for(const e of ev)for(const k of Object.keys(metrics))metrics[k]+=e.delta[k];return {start,end,count:ev.length,...Object.fromEntries(Object.entries(metrics).map(([k,v])=>[k,v/(end-start)]))};});
}
function combatPhaseView(parent,result){
 const d=node("details");d.append(node("summary","分段輸出／仇恨與資源效率"));
 for(const p of combatPhaseMetrics(result))d.append(node("p",p.start+"–"+p.end+" 秒 ｜ 完成 "+p.count+" 次 ｜ DPS "+p.damage.toFixed(2)+" ｜ TPS "+p.threat.toFixed(2)+" ｜ HPS "+p.healing.toFixed(2)));
 d.append(node("p","資源溢出 "+result.wasted.toFixed(1)+"；以技能完成時間歸入區段。","gt-muted"));parent.append(d);combatSkillView(parent,result);
 const targets=node("details");targets.append(node("summary","各目標傷害與仇恨（假設模型）"));
 for(let i=0;i<result.targets;i++)targets.append(node("p","目標 "+(i+1)+" ｜ DPS "+(result.targetDamage[i]/result.duration).toFixed(2)+" ｜ TPS "+(result.targetThreat[i]/result.duration).toFixed(2)));
 targets.append(node("p","固定由第一目標起算，不模擬切換目標、嘲諷、仇恨轉移或真實 AoE 傷害衰減。","gt-muted"));parent.append(targets);
 if(result.healingDemand){const h=result.healingDemand,c=node("details");add(c,node("summary","治療需求、有效治療與溢補（假設模型）"),node("p","有效 HPS "+result.rate.effective.toFixed(2)+" ｜ 溢補 "+h.overheal.toFixed(1)+" ｜ 溢補率 "+(result.totals.healing?100*h.overheal/result.totals.healing:0).toFixed(1)+"%"),node("p","累積治療需求 "+h.incoming.toFixed(1)+" ｜ 最終未補缺口 "+h.deficit.toFixed(1)+" ｜ 最大缺口 "+h.peakDeficit.toFixed(1)),node("p","單一合併缺口模型：不含真實血量、死亡、護盾、HoT、分散目標或治療吸收。","gt-muted"));parent.append(c);}

}
function combatNativeTimeline(parent,timeline){
 const events=(Array.isArray(timeline)?timeline:[]).filter(e=>e&&Number.isFinite(e.timeMs)&&typeof e.label==="string").slice(0,400).sort((a,b)=>a.timeMs-b.timeMs);
 const d=node("details"),pre=node("pre"),q=inp("輸入技能或紀錄關鍵字"),phase=select([["all","全部事件"],["pre","開戰前"],["open","開場 0–10 秒"],["burst","10–30 秒"],["later","30 秒後"]]);pre.className="gt-combat-log";
 const count=node("p","","gt-muted");
 function draw(){const key=q.value.trim().toLowerCase();const filtered=events.filter(e=>{const t=e.timeMs;return (phase.value==="all"||phase.value==="pre"&&t<0||phase.value==="open"&&t>=0&&t<10000||phase.value==="burst"&&t>=10000&&t<30000||phase.value==="later"&&t>=30000)&&(!key||e.label.toLowerCase().includes(key)||zhDisplay(e.label).toLowerCase().includes(key));});pre.textContent=combatTimelineText(filtered)||"沒有符合條件的事件。";count.textContent="顯示 "+filtered.length+" / "+events.length+" 個記錄事件；不是施放次數統計。";}
 q.addEventListener("input",draw);phase.addEventListener("change",draw);
 add(d,node("summary","第一輪技能時間軸（最多400個事件）"),field("戰鬥區段",phase),field("技能／紀錄搜尋",q),count,pre,node("p","引擎的單次隨機戰鬥紀錄；不同戰鬥的觸發與資源會改變實際施放時機。","gt-muted"));parent.append(d);draw();
}
function combatResultPlayers(raw){
 if(!raw||typeof raw!=="object"||raw.error||!Number.isInteger(raw.iterationsDone)||raw.iterationsDone<1)throw Error("請提供成功完成的 WoWSims RaidSimResult");
 const parties=raw.raidMetrics?.parties;if(!Array.isArray(parties)||parties.some(p=>p?.players!=null&&!Array.isArray(p.players)))throw Error("隊伍資料格式不合法");
 const valid=v=>Number.isFinite(v)&&v>=0;
 return parties.flatMap((party,pi)=>(party?.players||[]).flatMap((p,ui)=>p&&[p.dps,p.threat,p.hps,p.dtps].some(m=>valid(m?.avg))?[{key:pi+":"+ui,name:typeof p.name==="string"&&p.name.trim()?p.name:"未命名角色",dummy:/^Target Dummy \d+(?: \(#\d+\))?$/.test(p.name||""),player:p}]:[]));
}
function combatResult(raw,playerKey=""){
 const validMetric=v=>Number.isFinite(v)&&v>=0,validDeath=v=>Number.isFinite(v)&&v>=0&&v<=1;
 if(!raw||typeof raw!=="object"||raw.error)throw Error("模擬未成功或結果格式不合法");
 if(raw&&Number.isInteger(raw.iterations)&&raw.iterations>0&&Number.isFinite(raw.dps?.mean)&&raw.dps.mean>=0&&!raw.error){return {name:raw.character?.source||"SIML 模擬",iterations:raw.iterations,duration:Number.isFinite(raw.duration)&&raw.duration>0?raw.duration:null,dps:raw.dps.mean,tps:null,hps:null,dtps:null,death:null,logs:combatTimelineText(raw.timeline)};}
 if(!raw||typeof raw.error==="string"&&raw.error||raw.error?.message||raw.error?.type==="ErrorOutcomeAborted"||!Number.isInteger(raw.iterationsDone)||raw.iterationsDone<1)throw Error("請提供成功完成的 WoWSims RaidSimResult 或 SIML sim JSON");
 const players=combatResultPlayers(raw);
 const chosen=playerKey?players.find(x=>x.key===playerKey):players.length===1?players[0]:null;
 if(!chosen)throw Error("含多名角色或治療假人；請先讀取並明確選擇角色，避免誤用團隊總值");
 const p=chosen.player,metric=k=>validMetric(p[k]?.avg)?p[k].avg:null;
 return {name:p.name||"角色",playerKey:chosen.key,iterations:raw.iterationsDone,duration:Number.isFinite(raw.avgIterationDuration)&&raw.avgIterationDuration>0?raw.avgIterationDuration:null,dps:metric("dps"),tps:metric("threat"),hps:metric("hps"),dtps:metric("dtps"),death:validDeath(p.chanceOfDeath)?p.chanceOfDeath:null,stdev:Object.fromEntries([["dps","dps"],["tps","threat"],["hps","hps"],["dtps","dtps"]].map(([k,f])=>[k,validMetric(p[f]?.stdev)?p[f].stdev:null])),oom:validMetric(p.secondsOomAvg)?p.secondsOomAvg:null,logs:typeof raw.logs==="string"?raw.logs.slice(0,200000):""};
}
function combatResultDelta(a,b,role){
 const metrics=role==="tank"?["tps","dtps","death"]:role==="heal"?["hps","oom"]:["dps"];
 return {rows:metrics.filter(k=>Number.isFinite(a[k])&&Number.isFinite(b[k])).map(k=>({metric:k,a:a[k],b:b[k],delta:b[k]-a[k],percent:a[k]>0?(b[k]-a[k])/a[k]*100:null})),warnings:[...(a.duration===null||b.duration===null?["缺少平均戰鬥時間"]:Math.abs(a.duration-b.duration)>Math.max(1,a.duration*.03)?["平均戰鬥時間不同，可能不是同遭遇"]:[]),...(a.iterations!==b.iterations?["迭代次數不同"]:[])]};
}
function combatCoverageView(parent,data){
 const rows=combatCoverage(data),done=rows.filter(x=>x.count>0).length;
 const d=node("details");d.append(node("summary","全28專精原生案例覆蓋："+done+" / 28"));
 for(const [role,label] of [["dps","輸出"],["tank","坦克"],["heal","治療"]]){
  const filtered=rows.filter(x=>x.role===role),part=box(d,label+"專精",filtered.filter(x=>x.count>0).length+" / "+filtered.length+" 已有成功案例");
  for(const x of filtered){const name=bySpec.get(x.id)?.name||x.id;part.append(node("p",name+" ｜ "+(x.count?x.count+" 個成功案例":role==="heal"?"待驗證治療遭遇與技能策略":"尚無成功案例")+(x.planned!==null?" ／ 計畫 "+x.planned+" 個":"")+(x.failed?" ｜ "+x.failed+" 個已失敗案例":"")+(x.pending?" ｜ "+x.pending+" 個未執行或未記錄":"")));}
 }
 d.append(node("p","沒有成功案例不代表該專精無法遊玩；資料缺口不以推估數值填補。","gt-muted"));parent.append(d);
}
function combatResearchView(parent,id){
 const idx=Number(id.split("-")[1])-1,guide=guides[idx],research=talentResearch[idx],role=combatRole(id);
 if(!guide)return;
 const c=box(parent,"此專精的配裝與循環研究",guide[0]);
 add(c,node("p",guide[1]),node("p",role==="tank"?"優先比最低單目標 TPS、承傷、死亡機率與團隊治療需求；高 TPS 不等同最佳生存。":role==="heal"?"分開比較坦克持續承傷、團隊群傷、爆發救急、法力續航及溢補；不可只看總治療量。":"比較不同武器或裝備套裝、技能優先序、30–180 秒爆發及單體／多目標。"));
 if(research)add(c,node("p","核心技能／天賦："+research[1]),node("p",research[2]));
 add(c,link("固定版本上游構築原始碼","https://github.com/wowsims/forever/blob/"+combatPresetCommit+"/ui/specs/"+combatPaths[idx]+"/presets.ts"),node("p","上述為研究方向；只有成功執行的引擎案例才列正式模擬數據。","gt-muted"));
}
const combatEquipmentNames=["頭部","頸部","肩部","背部","胸部","手腕","手部","腰部","腿部","腳部","戒指 1","戒指 2","飾品 1","飾品 2","主手武器","副手物品","遠程／聖物"];
const combatPlayerFields=["dpsWarrior","dpsWarrior","protectionWarrior","holyPaladin","protectionPaladin","retributionPaladin","hunter","hunter","hunter","rogue","rogue","rogue","healerPriest","healerPriest","dpsPriest","elementalShaman","enhancementShaman","restorationShaman","mage","mage","mage","warlock","warlock","warlock","balanceDruid","feralCatDruid","feralBearDruid","restorationDruid"];
function combatEquipmentSpec(rows,mode){
 if(!["one","two"].includes(mode)||!Array.isArray(rows))throw Error("配裝模式不合法");
 const items=Array.from({length:17},()=>({})),used=new Set(),positions=new Set();
 for(const row of rows){
  if(!row||typeof row.name!=="string")throw Error("裝備部位不合法");
  const index=row.name==="雙手武器"?14:combatEquipmentNames.indexOf(row.name);
  if(index<0||positions.has(index)||mode==="two"&&(index===15||index===14&&row.name!=="雙手武器")||mode==="one"&&row.name==="雙手武器")throw Error("裝備部位重複或武器模式不符");
  positions.add(index);
  if(row.id==null||row.id==="")continue;
  if(!/^[1-9]\d{0,8}$/.test(String(row.id)))throw Error("物品 ID 不合法");
  const id=Number(row.id);
  if(used.has(id))throw Error("同一物品 ID 不可重複選擇："+id);
  used.add(id);items[index]={id};
  for(const k of ["enchant","randomSuffix"]){
   const v=row[k];if(v==null||v==="")continue;
   if(!(k==="randomSuffix"?/^-?\d{1,10}$/:/^\d{1,10}$/).test(String(v))||!Number.isSafeInteger(Number(v))||Math.abs(Number(v))>2147483647)throw Error("附魔或詞綴 ID 不合法");
   items[index][k]=Number(v);
  }
 }
 return {items};
}
function combatPlanEquipment(armor,weapons){
 if(!Array.isArray(armor)||!Array.isArray(weapons))throw Error("配裝清單格式不合法");
 const counts=new Map(),mode=weapons.some(x=>x.position==="雙手武器")?"two":"one",rows=[];
 for(const p of armor){
  let name=p.slot;if(name==="戒指"||name==="飾品"){const n=(counts.get(name)||0)+1;counts.set(name,n);name+=" "+n;}
  rows.push({name,id:p.item?.id});
 }
 for(const p of weapons){const name=({"主手":"主手武器","副手":"副手物品","雙手武器":"雙手武器","遠程":"遠程／聖物","聖物":"遠程／聖物"})[p.position];if(!name)throw Error("武器位置不合法");rows.push({name,id:p.item?.id});}
 return {mode,equipment:combatEquipmentSpec(rows,mode)};
}
function combatEquipmentRows(equipment,mode){
 if(!["one","two"].includes(mode)||!Array.isArray(equipment?.items)||equipment.items.length!==17)throw Error("需為17格裝備資料與合法武器模式");
 if(mode==="two"&&equipment.items[15]?.id)throw Error("雙手武器不能同時裝備副手");
 const rows=equipment.items.map((x,i)=>({name:i===14&&mode==="two"?"雙手武器":combatEquipmentNames[i],id:x?.id??"",enchant:x?.enchant??"",randomSuffix:x?.randomSuffix??""})).filter((_,i)=>mode!=="two"||i!==15);
 combatEquipmentSpec(rows,mode);
 return rows.map(x=>({...x,id:String(x.id),enchant:String(x.enchant),randomSuffix:String(x.randomSuffix)}));
}
function combatEquipmentDiff(before,after){
 if(!Array.isArray(before?.items)||before.items.length!==17||!Array.isArray(after?.items)||after.items.length!==17)throw Error("比較需要兩套17格裝備");
 const val=x=>({id:x?.id??0,enchant:x?.enchant??0,randomSuffix:x?.randomSuffix??0});
 return combatEquipmentNames.flatMap((name,i)=>{const a=val(before.items[i]),b=val(after.items[i]);return Object.keys(a).some(k=>a[k]!==b[k])?[{name,index:i,before:a,after:b}]:[];});
}
function combatRequestPlayer(request,id){
 const index=Number(String(id).split("-")[1])-1,field=combatPlayerFields[index];
 if(!combatEngineURL(id)||!field||!request||typeof request!=="object"||request.type!=="SimTypeIndividual"&&request.type!==1)throw Error("請提供對應專精的個人 RaidSimRequest");
 const parties=request.raid?.parties;
 if(!Array.isArray(parties)||parties.some(p=>p?.players!=null&&!Array.isArray(p.players)))throw Error("RaidSimRequest 隊伍格式不合法");
 const players=parties.flatMap(p=>p?.players||[]).filter(p=>p&&typeof p==="object"&&Object.keys(p).length);
 if(players.length!==1||!players[0][field]||!players[0].rotation||!Array.isArray(request.encounter?.targets)||!request.encounter.targets.length||!request.simOptions)throw Error("引擎請求的職業、技能策略或遭遇不符");
 return players[0];
}
function combatApplyEquipment(request,equipment,id,keepMatching=true,preserveEmpty=false){
 const copy=JSON.parse(JSON.stringify(request)),p=combatRequestPlayer(copy,id);
 if(p.enableItemSwap||p.itemSwap?.items?.some(x=>x?.id)||p.itemSwap?.swapSets?.length||JSON.stringify(p.rotation).includes('"itemSwap":'))throw Error("原請求含換裝；請在引擎停用換裝後再匯入，避免破壞技能策略");
 if(!Array.isArray(equipment?.items)||equipment.items.length!==17)throw Error("須為17格 EquipmentSpec");
 const seen=new Set();
 p.equipment={items:equipment.items.map((x,i)=>{
  const old=p.equipment?.items?.[i];
  const item=preserveEmpty&&!x?.id?old:x;
  if(!item?.id)return {};
  if(!Number.isSafeInteger(item.id)||item.id<1||item.id>999999999||seen.has(item.id))throw Error("無效或重複的物品 ID");
  seen.add(item.id);
  if(preserveEmpty&&!x?.id)return old;
  const next=keepMatching&&old?.id===item.id?{...old}:{id:item.id};
  for(const k of ["enchant","randomSuffix"])if(Object.hasOwn(item,k)){if(!Number.isSafeInteger(item[k])||k==="enchant"&&item[k]<0||Math.abs(item[k])>2147483647)throw Error("附魔或詞綴 ID 不合法");if(item[k]===0)delete next[k];else next[k]=item[k];}
  return next;
 })};
 return copy;
}
const guildScenarios={"guild-50k":{label:"60級單體／5萬血",level:60,health:50000,count:1,duration:60},"guild-boss":{label:"63級首領／30萬血",level:63,health:300000,count:1,duration:180},"guild-5x50k":{label:"60級五目標／各5萬血",level:60,health:50000,count:5,duration:60}};
function combatGuildScenario(request,id,key){
 const cfg=guildScenarios[key];if(!cfg)throw Error("不明公會標準遭遇");
 const result=JSON.parse(JSON.stringify(request)),p=combatRequestPlayer(result,id),tank=combatRole(id)==="tank",stats=Array(39).fill(0);stats[29]=cfg.health;
 p.inFrontOfTarget=tank;result.raid.tanks=tank?[{type:"Player",index:0}]:[];
 result.encounter={apiVersion:result.encounter.apiVersion??2,duration:cfg.duration,durationVariation:0,executeProportion20:.2,executeProportion35:.35,targets:Array.from({length:cfg.count},(_,i)=>({name:cfg.label+" "+(i+1),level:cfg.level,mobType:"MobTypeUnknown",stats:[...stats],minBaseDamage:cfg.level===63?1000:300,damageSpread:0,swingSpeed:2,tankIndex:tank?0:-1,canCrush:cfg.level===63,parryHaste:false}))};
 for(const k of Object.keys(result.raid.debuffs||{}))if(/sunder|exposeArmor|faerieFire|curseOfRecklessness|curseOfElements|curseOfShadow|armor|resistance/i.test(k))delete result.raid.debuffs[k];
 return result;
}
function combatNativeTargetRows(rows,cfg){
 if(!cfg||!Array.isArray(rows)||rows.length!==cfg.count)return [];
 const seen=new Set(),valid=[];
 for(const x of rows){
  if(!x||!Number.isInteger(x.index)||x.index<0||x.index>=cfg.count||seen.has(x.index)||x.health!==cfg.health||!Number.isFinite(x.dps)||x.dps<0)return [];
  seen.add(x.index);valid.push({...x,timeEstimate:x.dps>0?x.health/x.dps:null});
 }
 return valid.sort((a,b)=>a.index-b.index);
}
function combatNativeTargetView(parent,rows,cfg){
 const valid=combatNativeTargetRows(rows,cfg);if(!valid.length)return;
 const d=node("details");add(d,node("summary","逐目標原生平均傷害"),node("p","以固定時間遭遇的目標承受DPS計算。沒有動態轉火或死亡停止；若有未受傷目標，不使用總DPS判定清場時間。","gt-muted"));
 for(const x of valid)d.append(node("p","目標 "+(x.index+1)+" ｜ 承受 DPS "+x.dps.toFixed(2)+" ｜ 固定速率估算 "+(x.timeEstimate===null?"未造成傷害":x.timeEstimate.toFixed(1)+"s")));
 d.append(node("p",valid.some(x=>x.timeEstimate===null)?"至少一隻目標未受傷；不能由此分配估算全部擊殺。":"最慢目標固定速率估算 "+Math.max(...valid.map(x=>x.timeEstimate)).toFixed(1)+" 秒（不等於實際清場）。","gt-muted"));
 parent.append(d);
}
function combatGuildKill(raw,key,maxSeconds=600){
 const cfg=guildScenarios[key];if(!cfg||!Number.isFinite(maxSeconds)||maxSeconds<1||maxSeconds>600)throw Error("公會目標或時間上限不合法");
 const data={...raw,targets:cfg.count,duration:maxSeconds};
 const original=simulatePriority(data,false,cfg.health),reverse=simulatePriority(data,true,cfg.health);
 const better=(a,b)=>Number(b.kill.cleared)-Number(a.kill.cleared)||(a.kill.cleared?a.kill.killTime-b.kill.killTime:b.totals.damage-a.totals.damage)||a.kill.overkill-b.kill.overkill;
 let best=null,count=0;
 if(Array.isArray(data.skills)&&data.skills.length<=5){
  const visit=(prefix,left)=>{if(!left.length){const r=simulatePriority({...data,skills:prefix},false,cfg.health);count++;if(!best||better(r,best.result)<0)best={result:r,order:prefix.map(x=>x.name)};return;}for(let i=0;i<left.length;i++)visit([...prefix,left[i]],left.filter((_,j)=>j!==i));};
  visit([],data.skills);best.count=count;
 }
 return {original,reverse,best,scenario:cfg};
}
function combatScenarioRequest(request,id,options={}){
 const result=options.guild?combatGuildScenario(request,id,options.guild):JSON.parse(JSON.stringify(request));combatRequestPlayer(result,id);
 const e=result.encounter;
 if(options.duration!=null){
  if(!Number.isFinite(options.duration)||options.duration<10||options.duration>600)throw Error("戰鬥時間必須為 10–600 秒");
  const variation=options.variation??0;
  if(!Number.isFinite(variation)||variation<0||variation>=options.duration)throw Error("戰鬥時間浮動不合法");
  e.duration=options.duration;e.durationVariation=variation;
 }
 if(options.targets!=null){
  if(!Number.isInteger(options.targets)||options.targets<1||options.targets>8||e.targets.length!==1)throw Error("目標變更僅接受單體基準及 1–8 個目標");
  const base=e.targets[0];
  if(!base||typeof base!=="object"||base.disabledAtStart||base.targetInputs?.length||base.secondTankIndex)throw Error("複雜首領設定不可直接複製為群體目標");
  if(options.targets>1)e.targets=Array.from({length:options.targets},(_,i)=>({...JSON.parse(JSON.stringify(base)),name:(base.name||"Raid Target")+" "+(i+1)}));
 }
 return result;
}
function combatGuildBatch(request,id,variants){
 if(!Array.isArray(variants)||variants.length<1||variants.length>5)throw Error("批次比較需1–5組候選配裝");
 combatRequestPlayer(request,id);
 const names=new Set(["原始配裝"]);
 for(const v of variants){
  if(!v||typeof v.name!=="string"||!v.name.trim()||v.name.length>80||names.has(v.name)||!["one","two"].includes(v.mode))throw Error("方案名稱不得重複，且需合法武器模式");
  names.add(v.name);combatEquipmentRows(v.equipment,v.mode);
 }
 const cases=[];
 for(const key of Object.keys(guildScenarios)){
  const base=combatGuildScenario(request,id,key);
  cases.push({scenario:key,variant:0,name:"原始配裝",request:base});
  for(const [i,v] of variants.entries()){
   const trial=combatGearTrial(base,v.equipment,id,v.mode,v.keepMatching!==false,v.preserveEmpty===true);
   cases.push({scenario:key,variant:i+1,name:v.name,request:trial.candidate});
  }
 }
 return {format:"tomb-guild-batch/1",commit:combatPresetCommit,spec:id,cases};
}
function combatGuildBatchResults(data,id){
 if(!data||data.format!=="tomb-guild-results/1"||data.commit!==combatPresetCommit||data.spec!==id||!Array.isArray(data.cases)||data.cases.length>18||!combatEngineURL(id))throw Error("批次結果格式、版本或專精不符");
 const role=combatRole(id),metric=role==="tank"?"tps":role==="heal"?"hps":"dps",seen=new Set(),groups=[];
 for(const [key,cfg] of Object.entries(guildScenarios)){
  const rows=[];
  for(const x of data.cases.filter(x=>x?.scenario===key)){
   if(!Number.isInteger(x.variant)||x.variant<0||x.variant>5||typeof x.name!=="string"||!x.name.trim()||x.name.length>80||seen.has(key+":"+x.variant))throw Error("批次包含重複或無效方案");
   seen.add(key+":"+x.variant);
   if(x.error){rows.push({variant:x.variant,name:x.name,error:true});continue;}
   if(!Number.isInteger(x.iterations)||x.iterations<1||x.iterations>10000||!Number.isFinite(x.duration)||Math.abs(x.duration-cfg.duration)>1e-6||!Number.isFinite(x.metrics?.[metric])||x.metrics[metric]<=0)throw Error("批次結果的迭代、時間或角色指標無效");
   rows.push(x);
  }
  const base=rows.find(x=>x.variant===0&&!x.error);
  if(base&&base.name!=="原始配裝")throw Error("原始配裝標記不合法");
  const comparisons=rows.filter(x=>x.variant>0&&!x.error&&base&&x.iterations===base.iterations).map(x=>{
   const delta=x.metrics[metric]-base.metrics[metric],uncertainty=nativeSetUncertainty(base,x,metric);
   const tankOK=role!=="tank"||["dtps","death"].every(k=>[x.metrics[k],base.metrics[k]].every(v=>Number.isFinite(v)&&v>=0&&(k!=="death"||v<=1))&&x.metrics[k]<=base.metrics[k]+1e-8);
   return {...x,delta,uncertainty,tankOK,confirmed:delta>0&&tankOK&&uncertainty!==null&&delta>uncertainty};
  }).sort((a,b)=>b.metrics[metric]-a.metrics[metric]);
  groups.push({key,cfg,rows,base,comparisons,best:comparisons.find(x=>x.confirmed)||null});
 }
 if(seen.size!==data.cases.length)throw Error("包含未知遭遇");
 return {role,metric,groups,finished:data.finished===true};
}
function combatGuildBatchResultView(parent,id){
 const c=box(parent,"多方案原生批次結果匯入","匯入本機批次工具的結果，分開比較三種遭遇。只接受對應專精及固定版本格式；本站不能證明外部檔案未遭修改。");
 const area=node("textarea"),msg=node("p","","gt-muted"),out=node("div");area.rows=4;area.setAttribute("aria-label","三遭遇批次結果 JSON");area.placeholder="貼上 tomb-guild-results/1 JSON";
 const render=()=>{out.replaceChildren();try{
  const data=combatGuildBatchResults(combatReadJSON(area.value),id);
  for(const g of data.groups){
   const section=box(out,g.cfg.label,"各自比較原始配裝與候選；不跨遭遇排名。");
   if(!g.base){section.append(node("p","未取得成功原始配裝，不排名。","gt-muted"));continue;}
   const m=data.metric.toUpperCase();section.append(node("p","原始配裝 "+m+" "+g.base.metrics[data.metric].toFixed(2)));
   for(const x of g.comparisons){section.append(node("p",x.name+" ｜ "+m+" "+x.metrics[data.metric].toFixed(2)+" ｜ 相較原裝 "+(x.delta>=0?"+":"")+x.delta.toFixed(2)+(x.uncertainty===null?" ｜ 波動未知":" ｜ 近似波動 ±"+x.uncertainty.toFixed(2))+(x.confirmed?" ｜ 超出波動門檻":!x.tankOK?" ｜ 生存不符":" ｜ 未證實勝出")));if(data.role==="tank")section.append(node("p","DTPS "+(Number.isFinite(x.metrics.dtps)?x.metrics.dtps.toFixed(2):"未知")+" ｜ 死亡 "+(Number.isFinite(x.metrics.death)?(x.metrics.death*100).toFixed(2)+"%":"未知"),"gt-muted"));}
   const ignored=g.rows.filter(x=>x.error||x.variant>0&&!g.comparisons.some(y=>y.variant===x.variant));if(ignored.length)section.append(node("p","無法比較："+ignored.map(x=>x.name).join("、"),"gt-muted"));
   section.append(node("p",g.best?"本次候選中具勝出證據的最高平均值："+g.best.name:"沒有候選具足夠勝出證據。","gt-muted"));
  }msg.textContent=data.finished?"批次已結束；只排名成功且可比較的候選。":"部分快照，仍有未記錄方案。";
 }catch(e){msg.textContent="匯入失敗："+e.message;}};
 add(c,area,combatFileInput(area,msg,"上傳三遭遇批次結果"),button("比較三遭遇批次結果",render),msg,out);
}
function combatGearTrial(request,equipment,id,mode,keepMatching=true,preserveEmpty=false){
 if(!["one","two"].includes(mode))throw Error("武器模式不合法");
 combatEquipmentRows(equipment,mode);
 const before=combatRequestPlayer(request,id).equipment;
 if(!Array.isArray(before?.items)||before.items.length!==17)throw Error("原請求沒有完整17格裝備，不能做控制變因比較");
 const candidate=combatApplyEquipment(request,equipment,id,keepMatching,preserveEmpty);
 const after=combatRequestPlayer(candidate,id).equipment;
 if(mode==="two"&&after.items[15]?.id)throw Error("雙手模式仍有副手；請關閉保留空欄原裝備或先清空原副手");
 const changes=combatEquipmentDiff(before,after);
 return {baseline:JSON.parse(JSON.stringify(request)),candidate,changes};
}
function combatNativeActions(rows,metric="damage"){
 if(!["damage","threat","healing","shielding"].includes(metric)||!Array.isArray(rows))return [];
 return rows.filter(x=>x&&typeof x.owner==="string"&&["spellId","itemId","otherId"].includes(x.kind)&&(x.kind==="otherId"?typeof x.id==="string"||Number.isSafeInteger(x.id):Number.isSafeInteger(x.id)&&x.id>0)&&Number.isFinite(x[metric])&&x[metric]>0).sort((a,b)=>b[metric]-a[metric]).slice(0,80);
}
function combatNativeActionView(parent,rows,id){
 if(!Array.isArray(rows)||!rows.length)return;
 const d=node("details"),role=combatRole(id),metric=select([["damage","傷害"],["threat","仇恨"],["healing","治療"],["shielding","護盾吸收"]]),out=node("div");
 metric.value=role==="tank"?"threat":role==="heal"?"healing":"damage";
 function draw(){
  out.replaceChildren();
  const valid=combatNativeActions(rows,metric.value);
  if(!valid.length){out.append(node("p","未取得此類技能貢獻資料。","gt-muted"));return;}
  for(const x of valid){
   const name=(x.kind==="spellId"?"技能":x.kind==="itemId"?"物品":"其他動作")+" "+x.id+(x.rank?"（等級 "+x.rank+"）":"")+(x.tag?"［"+x.tag+"］":"");
   const row=node("p");row.append(node("span",x.owner+" ｜ "));
   if(x.kind==="spellId"||x.kind==="itemId")row.append(link(name,"https://www.wowhead.com/forever/tw/"+(x.kind==="spellId"?"spell=":"item=")+x.id));else row.append(node("span",name));
   row.append(node("span"," ｜ "+x[metric.value].toFixed(2)+(Number.isFinite(x.manualCasts)?" ｜ 平均手動施放目標事件 "+x.manualCasts.toFixed(2):"")+(x.passive?" ｜ 被動":"")));
   out.append(row);
  }
 }
 metric.addEventListener("change",draw);add(d,node("summary","原生技能貢獻（每場平均總量）"),field("貢獻指標",metric),node("p","依目標動作統計加總並除以迭代數；寵物獨立列出。多目標事件數不等於獨立施法次數，前80列不一定涵蓋所有傷害或仇恨。","gt-muted"),out);parent.append(d);draw();
}
function combatRequestPath(path,id){
 if(typeof path!=="string"||!combatEngineURL(id))return null;
 return /^combat-requests\/spec-(?:[1-9]|1[0-9]|2[0-8])-[a-f0-9]{16}\.json$/.test(path)&&path.startsWith("combat-requests/"+id+"-")?path:null;
}
function combatDownloadJSON(data,name){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})),a=node("a");
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function combatReadJSON(text){
 if(typeof text!=="string"||text.length>8000000)throw Error("JSON 檔案超過 8 MB 字元限制");
 return JSON.parse(text);
}
function combatFileInput(area,status,label){
 const input=node("input");input.type="file";input.accept=".json,application/json";input.setAttribute("aria-label",label);
 input.addEventListener("change",async()=>{const file=input.files?.[0];if(!file)return;try{if(file.size>8000000)throw Error("檔案超過 8 MB");const value=await file.text();combatReadJSON(value);area.value=value;area.dispatchEvent(new Event("input",{bubbles:true}));status.textContent="已讀取 "+file.name+"，請確認內容後執行。";}catch(e){status.textContent="讀取失敗："+e.message;}finally{input.value="";}});
 return input;
}
function combatGearView(parent,id,build,nativeView){
 const spec=bySpec.get(id);if(!spec)return;
 const c=box(parent,"配裝匯出與原生模擬串接","由本站候選選擇裝備，匯出固定 17 格 EquipmentSpec，或替換已取得的個人 RaidSimRequest 的裝備；不自動宣稱 BiS。");
 const saved=savedModel(id),weights=effectiveGearWeights(id,saved?.weights||{}),hasModel=!!saved&&Object.values(weights).some(v=>v>0);
 const compare=(a,b)=>Number(!!a.review)-Number(!!b.review)||(hasModel?Number(a.model.incomplete)-Number(b.model.incomplete)||b.model.total-a.model.total:0)||Number(!!b.priority)-Number(!!a.priority)||(a.rank||999)-(b.rank||999);
 const slots=[...expandCandidateSlots(spec)].map(([name,items])=>({name,items:items.filter(x=>allowed(id,x)).map(x=>hasModel?{...x,model:modelScore(x,weights,saved.hitBySlot?.[name])}:x).sort(compare)}));
 const partition=auditWeaponGroups(slots,compare),mode=select((partition.modes.length?partition.modes:["one"]).map(m=>[m,m==="two"?"雙手武器":"單手／副手"]));
 const key="gt-combat-gear-v1:"+id+":"+build,output=node("textarea"),request=node("textarea"),msg=node("p","","gt-muted"),editor=node("div"),selected=new Map(),modifiers=new Map();
 let stored={};try{stored=JSON.parse(localStorage.getItem(key)||"{}")||{};}catch(e){}
 if(!stored||typeof stored!=="object"||Array.isArray(stored))stored={};
 if(["one","two"].includes(stored.mode)){if(![...mode.options].some(o=>o.value===stored.mode))mode.add(new Option((stored.mode==="two"?"雙手武器":"單手／副手")+"（匯入，資格待核）",stored.mode));mode.value=stored.mode;}
 output.rows=5;output.readOnly=true;output.setAttribute("aria-label","模擬配裝 JSON");
 request.rows=4;request.placeholder="貼上原生個人 RaidSimRequest（不是 RaidSimResult）";request.setAttribute("aria-label","原生模擬請求");
 const all=()=>[...selected].map(([name,el])=>({name,id:el.value,enchant:modifiers.get(name)?.enchant.value??"",randomSuffix:modifiers.get(name)?.randomSuffix.value??""}));
 const current=()=>combatEquipmentSpec(all(),mode.value);
 function refresh(){
  preview.replaceChildren();
  try{const gear=current();output.value=JSON.stringify(gear,null,2);msg.textContent="已選 "+gear.items.filter(x=>x.id).length+" 件；未選欄位保留空白。可手動設定附魔／詞綴 ID；空白時沿用相同裝備或不設定。須在引擎核對合法性。";}catch(e){output.value="";msg.textContent="配裝無法匯出："+e.message;}
 }
 function draw(){
  editor.replaceChildren();selected.clear();modifiers.clear();
  const rows=auditEquipmentChoices(auditEquipmentSlots(partition,mode.value,compare));
  for(const row of rows){
   const el=select([["","未選／空欄"],...row.items.map(x=>[String(x.id),zhItem(x)+"（"+x.id+"）"+(x.review?" · 待核":"")])]);
   const old=stored.mode===mode.value?stored.slots?.[row.name]:undefined;
   if(typeof old==="string"&&/^[1-9]\d{0,8}$/.test(old)&&![...el.options].some(o=>o.value===old))el.add(new Option("匯入物品 ID "+old+"（資格及部位待核）",old));
   if(typeof old==="string"&&[...el.options].some(o=>o.value===old))el.value=old;
   const enchant=inp("留空＝不指定","number"),randomSuffix=inp("留空＝不指定","number");
   for(const [k,input] of [["enchant",enchant],["randomSuffix",randomSuffix]]){
    input.min="0";input.max="999999999";input.step="1";input.setAttribute("aria-label",row.name+(k==="enchant"?" 附魔 ID":" 隨機詞綴 ID"));
    const v=stored.mode===mode.value?stored.mods?.[row.name]?.[k]:null;
    if(typeof v==="string"&&/^\d{1,9}$/.test(v))input.value=v;
    input.addEventListener("input",refresh);
   }
   el.addEventListener("change",()=>{enchant.value="";randomSuffix.value="";refresh();});
   selected.set(row.name,el);modifiers.set(row.name,{enchant,randomSuffix});
   const detail=node("details");add(detail,node("summary","附魔／隨機詞綴 ID（選填）"),field("附魔 ID",enchant),field("詞綴 ID",randomSuffix),node("p","留空不指定；0 明確清除原值。請以引擎的合法 ID 為準，不是物品名稱或附魔法術 ID 的自動轉換。","gt-muted"));
   add(editor,field(row.name,el),detail);
  }refresh();
 }
 function save(){try{const gear=current();stored={...stored,mode:mode.value,slots:Object.fromEntries(all().map(x=>[x.name,x.id])),mods:Object.fromEntries(all().map(x=>[x.name,{enchant:x.enchant,randomSuffix:x.randomSuffix}])),source:stored.source};localStorage.setItem(key,JSON.stringify(stored));msg.textContent="已儲存本專精／構築的 "+gear.items.filter(x=>x.id).length+" 件選擇。";}catch(e){msg.textContent="儲存失敗："+e.message;}}
 const details=node("details"),keep=node("input"),preserve=node("input");keep.type="checkbox";keep.checked=true;preserve.type="checkbox";
 const imported=node("textarea");imported.rows=3;imported.placeholder="貼上17格 EquipmentSpec JSON";imported.setAttribute("aria-label","匯入配裝 JSON");
 const importMode=select([["one","單手／副手"],["two","雙手武器"]]);importMode.value=mode.value;
 function loadEquipment(){
  try{const gear=combatReadJSON(imported.value),rows=combatEquipmentRows(gear,importMode.value);stored={mode:importMode.value,slots:Object.fromEntries(rows.map(x=>[x.name,x.id])),mods:Object.fromEntries(rows.map(x=>[x.name,{enchant:x.enchant,randomSuffix:x.randomSuffix}])),source:"外部配裝（資格待核）"};if(![...mode.options].some(o=>o.value===stored.mode))mode.add(new Option((stored.mode==="two"?"雙手武器":"單手／副手")+"（匯入，資格待核）",stored.mode));mode.value=stored.mode;draw();msg.textContent="已載入 "+rows.filter(x=>x.id).length+" 件物品 ID；匯入不代表職業、部位、唯一群組或取得資格已驗證，已保留 JSON 中的附魔與詞綴 ID，仍須核對合法性。";}catch(e){msg.textContent="匯入失敗："+e.message;}
 }
 const importBox=node("details");add(importBox,node("summary","匯入外部或整套面板配裝"),field("匯入武器模式",importMode),imported,combatFileInput(imported,msg,"上傳配裝 JSON"),button("載入17格配裝",loadEquipment));
 const preview=node("div"),guildPick=select([...Object.entries(guildScenarios).map(([k,v])=>[k,v.label]),["","沿用原遭遇／自訂"]]),durationPick=select([["","沿用原遭遇"],["30","30秒"],["60","60秒"],["120","120秒"],["180","180秒"],["300","300秒"]]),targetPick=select([["","沿用原遭遇"],["1","1個目標"],["3","3個相同目標"],["5","5個相同目標"],["8","8個相同目標"]]),variation=inp("0","number");
 variation.value="0";variation.min="0";variation.max="60";variation.step="1";variation.disabled=true;durationPick.addEventListener("change",()=>{variation.disabled=!durationPick.value;preview.replaceChildren();});
 targetPick.addEventListener("change",()=>preview.replaceChildren());variation.addEventListener("input",()=>preview.replaceChildren());request.addEventListener("input",()=>preview.replaceChildren());keep.addEventListener("change",()=>preview.replaceChildren());preserve.addEventListener("change",()=>preview.replaceChildren());
 const scenario=node("details");scenario.open=true;add(scenario,node("summary","A／B 共用戰鬥情境"),field("公會標準目標",guildPick),node("p","標準遭遇：零基礎護甲、零抗性；非坦克背面，坦克正面。首領暫定63級；固定時間而非血量擊殺停止。坦克假設每2秒受到300或首領1000基礎傷害。","gt-muted"),field("名義戰鬥時間",durationPick),field("時間浮動秒數",variation),field("相同目標數",targetPick),node("p","只在原遭遇為單體且無複雜目標設定時允許複製敵人；兩份請求使用完全相同遭遇。群體目標仍可能需要在引擎確認仇恨與技能策略。","gt-muted"));
 function syncGuild(){targetPick.disabled=!!guildPick.value;preview.replaceChildren();}guildPick.addEventListener("change",syncGuild);syncGuild();
 function trial(){const base=combatScenarioRequest(combatReadJSON(request.value),id,{guild:guildPick.value||null,duration:durationPick.value?Number(durationPick.value):null,variation:durationPick.value?Number(variation.value):null,targets:!guildPick.value&&targetPick.value?Number(targetPick.value):null});return combatGearTrial(base,current(),id,mode.value,keep.checked,preserve.checked);}
 const batchVariants=[],batchName=inp("例如：4件套裝＋雙手武器"),batchList=node("div");
 const batchBox=node("details");
 function drawBatch(){
  batchList.replaceChildren();
  for(const [i,v] of batchVariants.entries()){const line=node("div");add(line,node("p",(i+1)+"｜"+v.name+"｜"+v.equipment.items.filter(x=>x.id).length+" 件明確選取"+(v.preserveEmpty?"｜保留未選原裝":"")),button("移除此方案",()=>{batchVariants.splice(i,1);drawBatch();}));batchList.append(line);}
  if(!batchVariants.length)batchList.append(node("p","目前尚未加入方案。","gt-muted"));
 }
 add(batchBox,node("summary","三種公會遭遇 × 多套配裝批次"),node("p","每次加入會保存當時的裝備、附魔、詞綴及空欄保留設定。最多5組候選，另加原始配裝。三種標準遭遇各自固定其他設定，輸出最多18個請求。","gt-muted"),field("批次方案名稱",batchName),button("加入目前配裝至批次",()=>{try{const name=batchName.value.trim();if(!name||name.length>80||name==="原始配裝"||batchVariants.some(v=>v.name===name)||batchVariants.length>=5)throw Error("請填不重複的方案名稱，最多5組");batchVariants.push({name,mode:mode.value,equipment:current(),keepMatching:keep.checked,preserveEmpty:preserve.checked});batchName.value="";drawBatch();msg.textContent="已加入配裝方案；尚未執行模擬。";}catch(e){msg.textContent=e.message;}}),batchList,button("下載三遭遇批次 JSON",()=>{try{const data=combatGuildBatch(combatReadJSON(request.value),id,batchVariants);const json=JSON.stringify(data);if(json.length>8000000)throw Error("批次過大，請減少方案");combatDownloadJSON(data,"tomb-"+id+"-guild-batch.json");msg.textContent="已匯出 "+data.cases.length+" 個原生請求，請用批次工具實跑。";}catch(e){msg.textContent="批次匯出失敗："+e.message;}}),button("在本站執行三遭遇多套比較",()=>{try{if(!nativeView)throw Error("站內引擎介面未載入");const data=combatGuildBatch(combatReadJSON(request.value),id,batchVariants);nativeView.runBatch(data);}catch(e){msg.textContent=e.message;}}),link("選用：原生批次工具與操作說明","https://github.com/lenxcjs-cyber/wow-forever-tw-bis/blob/main/scripts/run-guild-batch.py"));
 drawBatch();
 function compareGear(){
  preview.replaceChildren();
  try{const result=trial();const part=box(preview,"A／B 配裝變更","A 為原始裝備與本次共用遭遇；B 只變更裝備。兩份請求的天賦、增益、消耗品、戰鬥時間及迭代設定完全相同。");
   const fmt=x=>x.id?String(x.id)+(x.enchant?"（附魔 "+x.enchant+"）":"")+(x.randomSuffix?"（詞綴 "+x.randomSuffix+"）":""):"空欄";
   if(!result.changes.length)part.append(node("p","裝備與附魔沒有變化。","gt-muted"));
   for(const x of result.changes)part.append(node("p",x.name+" ｜ "+fmt(x.before)+" → "+fmt(x.after)));
   add(part,button("下載 A 基準請求",()=>combatDownloadJSON(result.baseline,"tomb-"+id+"-A.json")),button("下載 B 替換裝備請求",()=>combatDownloadJSON(result.candidate,"tomb-"+id+"-B.json")));
   msg.textContent="比較 "+result.changes.length+" 個裝備位置；下載的是同一基準設定的 A／B 請求，並非模擬結果。";
  }catch(e){msg.textContent="比較失敗："+e.message;}
 }
 add(details,node("summary","選擇配裝與匯出（17 格）"),field("武器配置",mode),importBox,button("載入本站首列候選（非已驗證 BiS）",()=>{const rows=auditEquipmentChoices(auditEquipmentSlots(partition,mode.value,compare));for(const x of rows){selected.get(x.name).value=x.featured?String(x.featured.id):"";modifiers.get(x.name).enchant.value="";modifiers.get(x.name).randomSuffix.value="";}refresh();}),editor,button("儲存此構築配裝",save),output,button("下載 EquipmentSpec JSON",()=>{try{combatDownloadJSON(current(),"tomb-"+id+"-equipment.json");}catch(e){msg.textContent=e.message;}}),node("h4","套用至原生個人模擬請求"),node("p","匯入成功案例的完整請求或自行準備的請求。保留請求中的天賦、技能策略、消耗品與遭遇；預設未選欄位清空原裝備，也可改為保留。同職業不同專精可能共用引擎欄位，請手動核對天賦與武器。未在本站執行引擎。","gt-muted"),request,combatFileInput(request,msg,"上傳原生模擬請求 JSON"),scenario,add(node("label",undefined,"gt-check"),keep,node("span","保留同欄同 ID 原有附魔及詞綴")),add(node("label",undefined,"gt-check"),preserve,node("span","未選欄位保留原裝備（單件替換模式）")),button("預覽 A／B 配裝變更",compareGear),preview,button("將替換配裝送至本站原生模擬",()=>{try{if(!nativeView)throw Error("站內引擎介面未載入");nativeView.load(trial().candidate);msg.textContent="已送往站內原生模擬區，請核對後開始。";}catch(e){msg.textContent=e.message;}}),batchBox,button("下載替換配裝後的 RaidSimRequest",()=>{try{const data=trial().candidate;combatDownloadJSON(data,"tomb-"+id+"-request.json");msg.textContent="已產生請求；請核對構築、附魔、空欄及 APL 再用原生 CLI 執行。";}catch(e){msg.textContent="無法產生請求："+e.message;}}),msg);
 mode.addEventListener("change",()=>{const old=stored.slots||{},rows=all();stored={...stored,mode:mode.value,slots:{...old,...Object.fromEntries(rows.map(x=>[x.name,x.id]))},mods:{...stored.mods,...Object.fromEntries(rows.map(x=>[x.name,{enchant:x.enchant,randomSuffix:x.randomSuffix}]))}};draw();});c.append(details);draw();if(stored.source){details.open=true;msg.textContent="已帶入："+stored.source+"；請核對裝備與附魔。";}
 const receiveNative=e=>{if(!c.isConnected){parent.removeEventListener("gt-native-request",receiveNative);return;}try{combatRequestPlayer(e.detail,id);request.value=JSON.stringify(e.detail,null,2);details.open=true;msg.textContent="已帶入角色原生請求；請選配裝，或保留未選原裝。";request.dispatchEvent(new Event("input",{bubbles:true}));}catch(err){msg.textContent=err.message;}};parent.addEventListener("gt-native-request",receiveNative);
 return async path=>{
  const valid=combatRequestPath(path,id);if(!valid)throw Error("請求檔案路徑不合法");
  const response=await fetch(valid,{cache:"no-cache"});if(!response.ok)throw Error("HTTP "+response.status);
  const content=await response.text();combatReadJSON(content);
  if(!c.isConnected)return;
  request.value=content;request.dispatchEvent(new Event("input",{bubbles:true}));details.open=true;msg.textContent="已載入原生案例請求；請確認天賦、技能與裝備後再匯出。";request.focus();request.scrollIntoView({block:"nearest"});
 };
}
const nativeClassNames=["warrior","paladin","hunter","rogue","priest","shaman","mage","warlock","druid"];
const nativeRaceNames={bloodelf:"RaceBloodElf",dwarf:"RaceDwarf",gnome:"RaceGnome",human:"RaceHuman",nightelf:"RaceNightElf",orc:"RaceOrc",tauren:"RaceTauren",troll:"RaceTroll",undead:"RaceUndead",highorderskyborne:"RaceHighOrderSkyborne",windshaperskyborne:"RaceWindshaperSkyborne"};
const nativeProfessionNames=["Alchemy","Blacksmithing","Enchanting","Engineering","Herbalism","Inscription","Leatherworking","Mining","Skinning","Tailoring"];
function nativeImportGear(gear,meta){
 if(!Array.isArray(gear?.items)||gear.items.length>17||!meta?.items)throw Error("缺少有效裝備清單或引擎物品索引");
 const items=Array.from({length:17},()=>({})),seen=new Set(),uniqueSlots={1:0,2:1,3:2,4:3,5:4,6:5,7:6,8:7,9:8,10:9,14:16};
 let two=false;
 const positive=(v,max=2147483647)=>Number.isInteger(v)&&v>0&&v<=max;
 for(const [sourceIndex,x] of gear.items.entries()){
  if(x==null||x?.id===0||x&&typeof x==="object"&&!Object.keys(x).length)continue;
  if(!x||!positive(x.id)||!Array.isArray(meta.items[x.id]))throw Error("引擎缺少物品 ID "+(x?.id??"未知"));
  if(seen.has(x.id))throw Error("同 ID 重複裝備，唯一裝備資格尚未驗證："+x.id);
  seen.add(x.id);
  const [type,hand,weapon]=meta.items[x.id];let slot=uniqueSlots[type];
  if(type===11)slot=items[10].id?11:10;
  if(type===12)slot=items[12].id?13:12;
  if(type===13){
   if(hand===4){slot=14;two=true;}
   else if(hand===3||weapon===5||weapon===7)slot=15;
   else if(hand===1)slot=14;
   else if(hand===2)slot=items[14].id?15:14;
   else throw Error("無法辨識武器手位："+x.id);
  }
  if(!Number.isInteger(slot))throw Error("部位不明："+x.id);
  if(gear.items.length===17){
   if(type===11&&[10,11].includes(sourceIndex)||type===12&&[12,13].includes(sourceIndex)||type===13&&hand===2&&![5,7].includes(weapon)&&[14,15].includes(sourceIndex))slot=sourceIndex;
   else if(sourceIndex!==slot)throw Error("17格資料的原始位置與物品類型不符："+x.id);
  }
  if(items[slot].id)throw Error("重複裝備位置");
  const item={id:x.id},enchant=x.enchant??0,suffix=x.randomSuffix??x.random_suffix??0;
  if(x.randomSuffix!=null&&x.random_suffix!=null&&x.randomSuffix!==x.random_suffix)throw Error("詞綴欄位互相矛盾");
  if(enchant!==0){if(!positive(enchant)||!meta.enchants?.[enchant])throw Error("引擎缺少附魔效果 ID "+enchant);item.enchant=enchant;}
  if(suffix!==0){if(!Number.isInteger(suffix)||Math.abs(suffix)>2147483647||!meta.suffixes?.[suffix])throw Error("引擎缺少隨機詞綴 ID "+suffix);item.randomSuffix=suffix;}
  items[slot]=item;
 }
 if(two&&items[15].id)throw Error("雙手武器不可同時裝副手");
 if(!items.some(x=>x.id))throw Error("角色沒有可辨識裝備");
 return {items};
}
function nativeCharacterRequest(raw,template,id,meta){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("角色資料必須是 JSON 物件");
 if(raw.raid&&raw.encounter){const r=JSON.parse(JSON.stringify(raw)),p=combatRequestPlayer(r,id);p.equipment=nativeImportGear(p.equipment,meta);return {request:r,notes:["完整原生請求；請核對技能策略與目前專精。"]};}
 if(raw.player&&raw.encounter){
  const r={type:"SimTypeIndividual",raid:{parties:[{players:[raw.player],buffs:raw.partyBuffs||{}},{},{},{},{}],buffs:raw.raidBuffs||{},debuffs:raw.debuffs||{},tanks:raw.tanks||[],targetDummies:raw.targetDummies||0},encounter:raw.encounter,simOptions:{iterations:50,randomSeed:"1"}};
  const request=JSON.parse(JSON.stringify(r)),p=combatRequestPlayer(request,id);
  p.equipment=nativeImportGear(p.equipment,meta);
  return {request,notes:["完整個人設定；使用本站迭代設定。"]};
 }
 if(!template)throw Error("請先選擇本站對應專精的原生範本");
 const r=JSON.parse(JSON.stringify(template)),p=combatRequestPlayer(r,id),notes=[];
 const isAddon=typeof raw.class==="string",gear=isAddon?raw.gear:raw.items?raw:raw.equipment;
 if(isAddon){
  if(raw.flavor!=="forever")throw Error("請使用永恆版 WoWSims Exporter 匯出，不能混用其他版本");
  if(raw.level!==60)throw Error("本站原生引擎目前限60級角色");
  if(raw.class.toLowerCase()!==nativeClassNames[gearClassIndex(id)])throw Error("角色職業與本站選擇不符");
  const specNames=["arms","fury","protection","holy","protection","retribution","beast_mastery","marksman","survival","assassination","combat","subtlety","holy_disc","holy_disc","shadow","elemental","enhancement","restoration","arcane","fire","frost","affliction","demonology","destruction","balance","feral","feral","restoration"];
  if(typeof raw.spec==="string"&&raw.spec&&raw.spec!==specNames[Number(id.split("-")[1])-1])throw Error("角色專精與本站選擇不符，請先切換專精");
  if(raw.race!=null){const race=nativeRaceNames[String(raw.race).replace(/[\s_-]/g,"").toLowerCase()];if(!race)throw Error("無法辨識種族");p.race=race;}else notes.push("未匯出種族，沿用範本。");
  if(typeof raw.name==="string"&&raw.name.trim())p.name=raw.name.trim().slice(0,80);
  if(typeof raw.talents==="string"&&/^[0-5]+(?:-[0-5]*){2}$|^[0-5]*(?:-[0-5]*){2}$/.test(raw.talents)&&raw.talents.replace(/-/g,"").length){p.talentsString=raw.talents;}else notes.push("未取得可用永恆天賦碼，沿用範本。");
  if(raw.professions!=null){
   if(!Array.isArray(raw.professions)||raw.professions.length>2)throw Error("專業資料格式不符");
   for(let i=0;i<2;i++){const x=raw.professions[i],name=x&&nativeProfessionNames.find(v=>v.toLowerCase()===String(x.name).toLowerCase());if(x&&!name)throw Error("未知專業："+x.name);p["profession"+(i+1)]=name||"ProfessionUnknown";const rank=x?.level;if(x&&(!Number.isInteger(rank)||rank<1||rank>300))throw Error("專業技能等級不合法");p["prof"+(i+1)+"Rank"]=rank||0;}
  }else notes.push("未匯出專業，沿用範本。");
  if(raw.rotation!=null){if(typeof raw.rotation!=="object"||Array.isArray(raw.rotation))throw Error("技能策略格式不合法");p.rotation=JSON.parse(JSON.stringify(raw.rotation));}
  else notes.push("遊戲匯出不含技能策略，沿用本站選擇的構築 APL。");
 }else notes.push("只匯入裝備：種族、天賦與專業沿用範本。");
 if(!gear)throw Error("角色匯出缺少 gear.items");
 p.equipment=nativeImportGear(gear,meta);
 notes.push("消耗品、團隊增減益、寵物及其他戰鬥設定沿用範本；請核對。");
 if(gear.items.length!==17)notes.push("匯出省略空欄，依引擎物品類型重新排列；戒指／飾品的原始空欄及單手武器手位請特別核對。");
 if(p.enableItemSwap||p.itemSwap?.items?.some(x=>x?.id)||p.itemSwap?.swapSets?.length)notes.push("範本含換裝設定，請核對額外武器與技能策略。");
 return {request:r,notes};
}
function nativeBrowserRequest(request,id,scenario,iterations,seed=1){
 if(!Number.isInteger(iterations)||iterations<1||iterations>1000||!Number.isSafeInteger(seed)||seed<1)throw Error("迭代數須為1–1000，種子須為正整數");
 const result=combatGuildScenario(request,id,scenario),p=combatRequestPlayer(result,id);
 if(p.database)throw Error("本站不接受匯入自訂引擎資料庫");
 const expectedClass=nativeClassNames[gearClassIndex(id)],classId=[1,2,3,4,5,7,8,9,11][gearClassIndex(id)];if(p.class!=null&&p.class!==classId&&String(p.class).toLowerCase()!=="class"+expectedClass)throw Error("原生角色職業與專精不符");
 if(!Array.isArray(p.equipment?.items)||p.equipment.items.length!==17)throw Error("缺少完整17格原生裝備");
 if(!p.rotation||typeof p.rotation!=="object")throw Error("缺少技能優先序");
 if(!Number.isInteger(result.raid.targetDummies??0)||(result.raid.targetDummies??0)<0||(result.raid.targetDummies??0)>25)throw Error("治療假人數量不合法");
 result.simOptions={iterations,randomSeed:String(seed),debugFirstIteration:true};
 delete result.requestId;
 if(JSON.stringify(result).length>8000000)throw Error("請求超過8MB");
 return result;
}
function nativeBrowserResult(raw,id,iterations){
 if(raw?.iterationsDone!==iterations)throw Error("引擎未完成指定迭代");
 const players=combatResultPlayers(raw).filter(x=>!x.dummy);
 if(players.length!==1)throw Error("無法辨識唯一角色結果");
 const result=combatResult(raw,players[0].key),metric=combatRole(id)==="tank"?"tps":combatRole(id)==="heal"?"hps":"dps";
 if(!(result[metric]>0))throw Error("未取得正數 "+metric.toUpperCase()+"；可能是技能策略、裝備或遭遇不適用");
 return result;
}
function nativeBrowserBatchJobs(batch,id,meta,n){
 if(batch?.format!=="tomb-guild-batch/1"||batch.commit!==combatPresetCommit||batch.spec!==id||!Array.isArray(batch.cases)||![6,9,12,15,18].includes(batch.cases.length))throw Error("無效配裝批次");
 const expected=batch.cases.length/3,seen=new Set(),jobs=[];
 for(const x of batch.cases){
  if(!guildScenarios[x.scenario]||!Number.isInteger(x.variant)||x.variant<0||x.variant>=expected||typeof x.name!=="string"||!x.name.trim()||seen.has(x.scenario+":"+x.variant))throw Error("無效或重複配裝案例");
  seen.add(x.scenario+":"+x.variant);
  const request=nativeBrowserRequest(x.request,id,x.scenario,n),p=combatRequestPlayer(request,id);
  p.equipment=nativeImportGear(p.equipment,meta);
  jobs.push({scenario:x.scenario,variant:x.variant,name:x.name,request});
 }
 const signature=req=>{const r=JSON.parse(JSON.stringify(req));delete combatRequestPlayer(r,id).equipment;return JSON.stringify(r);};
 for(const k of Object.keys(guildScenarios)){
  const rows=jobs.filter(x=>x.scenario===k),base=rows.find(x=>x.variant===0);
  if(rows.length!==expected||base?.name!=="原始配裝"||rows.some(x=>signature(x.request)!==signature(base.request)))throw Error("批次比較條件不一致");
 }
 return jobs;
}
function nativeBrowserView(parent,id){
 const c=box(parent,"站內原生實戰模擬","本機瀏覽器 WebAssembly 運算；角色 JSON 不傳送外部模擬服務。引擎載入及運算會消耗記憶體與 CPU。");
 const status=node("p","檢查站內引擎與固定版本裝備資料…","gt-muted"),templatePick=select([["","尚未載入範本"]]),area=node("textarea"),readyText=node("p","","gt-muted"),preview=node("div"),results=node("div"),scenario=select([["all","全部三種公會遭遇"],...Object.entries(guildScenarios).map(([k,v])=>[k,v.label])]),iterations=select([["50","50次快速測試"],["200","200次初步比較"],["1000","1000次正式比較"]]);
 area.rows=6;area.placeholder='貼上 WoWSims Exporter /wse export 的完整 JSON，或個人 RaidSimRequest';area.setAttribute("aria-label","角色匯入 JSON");
 let manifest=null,metadata=null,templates=[],character=null,worker=null,active=0,ready=false;
 const runBtn=button("在本站開始模擬",()=>run()),stopBtn=button("停止模擬",()=>stop("已停止，保留完成的結果。")),importBtn=button("匯入並核對角色",()=>importCharacter(false)),defaultBtn=button("直接載入範本角色",()=>importCharacter(true)),sendBtn=button("帶入目前原生配裝編輯器",()=>{if(character)c.dispatchEvent(new CustomEvent("gt-native-request",{bubbles:true,detail:character.request}));}),downloadBtn=button("下載已核對角色請求",()=>{if(character)combatDownloadJSON(character.request,"tomb-"+id+"-character.json");});
 function sync(){runBtn.disabled=!ready||!character||!!worker;stopBtn.disabled=!worker;importBtn.disabled=!ready||!!worker;defaultBtn.disabled=!ready||!templatePick.value||!!worker;downloadBtn.disabled=!character;sendBtn.disabled=!character;templatePick.disabled=!!worker;area.disabled=!!worker;scenario.disabled=!!worker;iterations.disabled=!!worker;}
 function stop(message){active++;if(worker)worker.terminate();worker=null;status.textContent=message;sync();}
 function clear(){active++;character=null;preview.replaceChildren();results.replaceChildren();sync();}
 area.addEventListener("input",clear);templatePick.addEventListener("change",clear);
 async function read(url){const res=await fetch(url,{cache:"no-cache",credentials:"same-origin"});if(!res.ok)throw Error("HTTP "+res.status);return res.json();}
 async function importCharacter(useDefault){
  clear();const token=++active;
  try{
   const templatePath=combatRequestPath(templatePick.value,id),raw=useDefault?null:combatReadJSON(area.value),template=templatePath?await read(templatePath):null;
   if(token!==active||!c.isConnected)return;
   if(useDefault&&!template)throw Error("尚無此專精範本");
   character=nativeCharacterRequest(useDefault?template:raw,template,id,metadata);
   const p=combatRequestPlayer(character.request,id);
   add(preview,node("h4","角色資料核對"),node("p",(p.name||"未命名角色")+" ｜ "+zhDisplay(p.race||"未知種族")+" ｜ 天賦 "+(p.talentsString||"未設定")),node("p","專業："+[p.profession1,p.profession2].filter(Boolean).map(zhDisplay).join("、")),node("p","裝備 "+p.equipment.items.filter(x=>x.id).length+"／17格"));
   for(const note of character.notes)preview.append(node("p",note,"gt-muted"));
   const gear=node("details");gear.append(node("summary","核對17格裝備與附魔"));
   for(const [i,x] of p.equipment.items.entries()){
    const line=node("p");line.append(node("span",combatEquipmentNames[i]+"："));if(x.id)line.append(link(zhItem({id:x.id,name:"物品 "+x.id})+"（"+x.id+"）","https://www.wowhead.com/forever/tw/item="+x.id),node("span",(x.enchant?" ｜ 附魔 "+x.enchant:"")+(x.randomSuffix?" ｜ 詞綴 "+x.randomSuffix:"")));else line.append(node("span","空欄"));gear.append(line);
   }preview.append(gear);
   const config=node("details"),rawPreview=node("textarea"),configMsg=node("p","","gt-muted");
   const editable=()=>({talentsString:p.talentsString||"",rotation:p.rotation,consumables:p.consumables||{},buffs:p.buffs||{},raidBuffs:character.request.raid.buffs||{},partyBuffs:character.request.raid.parties[0].buffs||{},debuffs:character.request.raid.debuffs||{}});
   rawPreview.rows=10;rawPreview.value=JSON.stringify(editable(),null,2);rawPreview.setAttribute("aria-label","原生戰鬥設定 JSON");
   const applyConfig=button("套用戰鬥設定修改",()=>{try{
    if(worker)throw Error("請先停止模擬");
    const o=combatReadJSON(rawPreview.value),allowed=["talentsString","rotation","consumables","buffs","raidBuffs","partyBuffs","debuffs"];
    if(!o||typeof o!=="object"||Array.isArray(o)||Object.keys(o).length!==allowed.length||!allowed.every(k=>Object.hasOwn(o,k))||typeof o.talentsString!=="string"||!/^[0-5]*-[0-5]*-[0-5]*$/.test(o.talentsString)||allowed.slice(1).some(k=>!o[k]||typeof o[k]!=="object"||Array.isArray(o[k])))throw Error("請保留全部欄位，天賦碼及設定須為合法 JSON");
    for(const k of ["talentsString","rotation","consumables","buffs"])p[k]=o[k];
    character.request.raid.buffs=o.raidBuffs;character.request.raid.parties[0].buffs=o.partyBuffs;character.request.raid.debuffs=o.debuffs;
    results.replaceChildren();configMsg.textContent="已套用；重新執行才會取得新結果。";status.textContent="戰鬥設定已更新，請核對天賦與技能策略。";
   }catch(e){configMsg.textContent="修改失敗："+e.message;}});
   add(config,node("summary","核對／修改技能策略、消耗品及團隊增益"),node("p","初次使用建議沿用範本。進階使用者可修改原生 JSON；技能與消耗品使用引擎 ID，輸入內容由原生引擎驗證。","gt-muted"),rawPreview,applyConfig,button("還原為目前已套用設定",()=>{rawPreview.value=JSON.stringify(editable(),null,2);configMsg.textContent="已還原未儲存變更。";}),configMsg);preview.append(config);
   status.textContent="已匯入，請確認構築、裝備與戰鬥設定。";
  }catch(e){status.textContent="匯入失敗："+e.message;character=null;}sync();
 }
 async function run(batch=null){
  if(!ready||worker||(!batch&&!character)){if(!ready)status.textContent="站內原生引擎尚未可用。";return;}
  const token=++active,n=Number(iterations.value),keys=scenario.value==="all"?Object.keys(guildScenarios):[scenario.value];
  results.replaceChildren();
  let jobs;try{jobs=batch?nativeBrowserBatchJobs(batch,id,metadata,n):keys.map(k=>({scenario:k,name:"匯入角色",request:nativeBrowserRequest(character.request,id,k,n)}));}catch(e){status.textContent=e.message;return;}
  const batchRows=[];
  function reportBatch(){
   if(!batch)return;
   const payload={format:"tomb-guild-results/1",commit:combatPresetCommit,spec:id,cases:batchRows,finished:batchRows.length===jobs.length};
   const part=box(results,"三遭遇原生配裝比較","各遭遇獨立排名；同一迭代數、天賦、消耗品及 APL。");
   const summary=combatGuildBatchResults(payload,id);
   for(const group of summary.groups){
    part.append(node("h5",group.cfg.label));
    if(!group.base){part.append(node("p","缺少成功基準，不排名。","gt-muted"));continue;}
    const m=summary.metric.toUpperCase();part.append(node("p","原始配裝 "+m+" "+group.base.metrics[summary.metric].toFixed(2)));
    for(const x of group.comparisons)part.append(node("p",x.name+" ｜ "+m+" "+x.metrics[summary.metric].toFixed(2)+" ｜ "+(x.delta>=0?"+":"")+x.delta.toFixed(2)+(x.confirmed?" ｜ 超出波動門檻":!x.tankOK?" ｜ 生存不符":" ｜ 未證實勝出")));
    part.append(node("p",group.best?"本次最高已證實候選："+group.best.name:"未確認候選勝出。","gt-muted"));
   }
   part.append(button("下載批次比較結果",()=>combatDownloadJSON(payload,"tomb-"+id+"-guild-results.json")));
  }
  status.textContent="載入同站引擎中…";
  let index=0,timer=null;
  try{worker=new Worker("native-engine/worker.js?v="+combatPresetCommit.slice(0,8));}catch(e){status.textContent="無法啟動 Worker："+e.message;worker=null;sync();return;}
  const w=worker;sync();
  const resetTimer=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(active===token)stop("模擬超過時間限制；請減少迭代數或改為單一遭遇。");},180000);};
  const next=()=>{if(token!==active||!c.isConnected){clearTimeout(timer);w.terminate();return;}if(index>=jobs.length){clearTimeout(timer);try{reportBatch();stop("全部所選遭遇完成。");}catch(e){stop("原生運算已結束，但批次排名無法驗證："+e.message);}return;}const job=jobs[index];status.textContent="原生運算 "+(index+1)+"／"+jobs.length+"："+guildScenarios[job.scenario].label+"／"+job.name+"（"+n+"次）";resetTimer();w.postMessage({type:"run",request:JSON.stringify(job.request)});};
  w.onmessage=e=>{
   if(token!==active||worker!==w)return;
   if(!c.isConnected){clearTimeout(timer);stop("頁面已切換，停止模擬。");return;}
   if(e.data?.type==="ready"){next();return;}
   if(e.data?.type==="error"){clearTimeout(timer);stop("原生引擎失敗："+e.data.message);return;}
   if(e.data?.type!=="result")return;
   clearTimeout(timer);
   const job=jobs[index],cfg=guildScenarios[job.scenario],part=box(results,cfg.label+"｜"+job.name,n+"次原生迭代");
   try{
    const raw=e.data.result,m=nativeBrowserResult(raw,id,n);
    if(batch&&Math.abs(m.duration-cfg.duration)>1e-6)throw Error("實際平均時間與標準遭遇不符，不能納入批次比較");
    if(batch){const metrics={};for(const k of ["dps","tps","hps","dtps","death"])if(Number.isFinite(m[k]))metrics[k]=m[k];for(const [k,v] of Object.entries(m.stdev||{}))if(Number.isFinite(v))metrics[k+"Stdev"]=v;batchRows.push({scenario:job.scenario,variant:job.variant,name:job.name,metrics,iterations:n,duration:m.duration});}
    for(const [key,label] of [["dps","DPS"],["tps","TPS"],["hps","HPS"],["dtps","DTPS"]])if(Number.isFinite(m[key]))part.append(node("p",label+" "+m[key].toFixed(2)+(Number.isFinite(m.stdev?.[key])?" ｜ 標準差 "+m.stdev[key].toFixed(2):"")));
    if(m.death!==null)part.append(node("p","死亡機率 "+(m.death*100).toFixed(2)+"%"));
    const targets=raw.encounterMetrics?.targets;
    if(Array.isArray(targets))combatNativeTargetView(part,targets.map((t,i)=>({index:i,health:cfg.health,dps:t?.dtps?.avg})),cfg);
    if(m.logs){const d=node("details"),pre=node("pre");pre.className="gt-combat-log";pre.textContent=m.logs;add(d,node("summary","首次迭代戰鬥紀錄"),pre);part.append(d);}
    add(part,node("p","固定時間原生模擬；不是血量歸零停止的真實擊殺時間。","gt-muted"),button("下載此原生結果",()=>combatDownloadJSON(raw,"tomb-"+id+"-"+job.scenario+"-"+(job.variant??0)+"-result.json")));
   }catch(err){if(batch)batchRows.push({scenario:job.scenario,variant:job.variant,name:job.name,error:"validation"});part.append(node("p","此遭遇未取得有效指標："+err.message,"gt-muted"));}
   index++;next();
  };
  w.onerror=e=>{clearTimeout(timer);if(active===token)stop("Worker 啟動或運算失敗："+(e.message||"未知錯誤"));};
  resetTimer();
 }
 const help=node("details");help.open=true;add(help,node("summary","如何匯入遊戲角色？"),node("p","1. 安裝支援永恆版的 WoWSims Exporter 插件並在遊戲啟用。"),link("下載 WoWSims Exporter 插件","https://www.curseforge.com/wow/addons/wowsimsexporter"),node("p","2. 登入60級角色，穿好要測的裝備，在聊天欄輸入 /wse export，複製產生的完整 JSON。"),node("p","3. 本站切換相符職業專精，選擇對應技能構築範本，貼上 JSON 或上傳檔案，按「匯入並核對角色」。"),node("p","4. 核對種族、天賦、裝備、附魔、消耗品與 APL；選擇公會遭遇及迭代數，按「在本站開始模擬」。"),node("p","插件資料通常不含團隊增益、消耗品及戰鬥循環，這些沿用範本。也可直接匯入完整原生 RaidSimRequest，不需要外部網站。","gt-muted"));
 add(c,help,readyText,field("原生構築範本",templatePick),defaultBtn,field("角色 JSON",area),combatFileInput(area,status,"上傳角色 JSON"),importBtn,preview,downloadBtn,sendBtn,field("實戰目標",scenario),field("原生迭代數",iterations),runBtn,stopBtn,status,results,link("原生引擎來源 WoWSims Forever（MIT）","https://github.com/wowsims/forever"));
 sync();Promise.all([read("native-engine/manifest.json"),read("native-engine/items.json"),read("combat-templates.json").catch(()=>null)]).then(([m,meta,t])=>{
  if(!c.isConnected)return;
  if(m?.format!=="tomb-wasm/1"||m.commit!==combatPresetCommit||m.verified!==true||!meta?.items||Object.keys(meta.items).length<1000)throw Error("引擎或物品資料版本不符");
  manifest=m;metadata=meta;ready=true;
  templates=t?.commit===combatPresetCommit&&Array.isArray(t.templates)?t.templates.filter(x=>x.spec===id&&combatRequestPath(x.requestFile,id)):[];
  templatePick.replaceChildren(new Option(templates.length?"選擇構築範本":"此專精尚無原生範本",""),...templates.map(x=>new Option(zhDisplay(x.label),x.requestFile)));
  if(templates.length)templatePick.value=templates[0].requestFile;
  readyText.textContent="已找到通過真實 WASM 冒煙測試的固定版本引擎。"+(templates.length?" 此專精有 "+templates.length+" 組匯入範本。":" 此專精僅接受完整原生請求；尚無可核對的自動範本。");
  status.textContent="可匯入角色。";sync();
 }).catch(e=>{if(!c.isConnected)return;readyText.textContent="站內原生引擎尚未發布或載入失敗："+e.message+"。不以自訂模型冒充原生模擬。";status.textContent="目前無法在本站執行原生引擎。";sync();});
 // Stop CPU work if the user navigates away from the combat view.
 const watch=new MutationObserver(()=>{if(!c.isConnected){watch.disconnect();if(worker)stop("頁面切換，已停止。");}});watch.observe(parent,{childList:true});
 return {load:raw=>{if(worker){status.textContent="請先停止目前運算。";return;}area.value=JSON.stringify(raw,null,2);clear();c.scrollIntoView({block:"start"});return importCharacter(false);},runBatch:batch=>{if(worker){status.textContent="請先停止目前運算。";return;}c.scrollIntoView({block:"start"});return run(batch);}};
}
function combatLab(){
 title("實戰模擬","站內原生引擎、角色匯入與三種公會遭遇；另保留獨立自訂簡化模型。");
 const id=getSpec(),build=buildFor(id);
 panel.append(specLabel());
 const nativeView=nativeBrowserView(panel,id);
 combatResearchView(panel,id);
 const standards=box(panel,"公會標準實戰目標","三種情境使用零基礎護甲與抗性，非坦克背後攻擊，坦克正面。首領暫定63級。");for(const x of Object.values(guildScenarios))standards.append(node("p",x.label+" ｜ "+x.count+" 個目標 ｜ 每隻 "+x.health.toLocaleString("zh-TW")+" HP ｜ 固定 "+x.duration+" 秒"));standards.append(node("p","原生引擎以時間結束，血量不是停止條件；血量／平均DPS只能估算擊殺時間。60／180秒及坦克受擊設定為本站暫定測試條件。","gt-muted"));
 const loadGearTemplate=combatGearView(panel,id,build,nativeView);nativeSetTrialView(panel,id);combatGuildBatchResultView(panel,id);
 const presets=box(panel,"開源引擎實跑預設案例","讀取固定版本實跑結果中…");presets.classList.add("gt-combat-presets");
 fetch("combat-presets.json",{cache:"no-cache"}).then(res=>{if(!res.ok)throw Error("HTTP "+res.status);return res.json();}).then(data=>{
  if(!presets.isConnected)return;if(!combatSnapshotValid(data))throw Error("版本或快照格式不符");const cases=combatPresetCases(data,id);presets.replaceChildren(node("h4","開源引擎實跑預設案例"));combatCoverageView(presets,data);
  if(Number.isInteger(data.planned)&&Array.isArray(data.cases)&&data.planned>=data.cases.length){const failures=Array.isArray(data.failed)?data.failed.length:0;presets.append(node("p","本次快照：全站 "+data.cases.length+" / "+data.planned+" 個計畫案例已成功產出；失敗 "+failures+" 個；尚未執行或未記錄 "+Math.max(0,data.planned-data.cases.length-failures)+" 個。","gt-muted"));}
  if(typeof data.finished==="boolean"){const stamp=typeof data.startedAt==="string"?new Date(data.startedAt):null;presets.append(node("p","批次狀態："+(data.finished?"已結束（可能仍有未執行案例）":"部分快照／未確認正常結束")+(stamp&&Number.isFinite(stamp.getTime())?" ｜ 開始 "+stamp.toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})+"（台灣時間）":"")+(Number.isFinite(data.elapsedSeconds)&&data.elapsedSeconds>=0?" ｜ 已記錄 "+data.elapsedSeconds.toFixed(1)+" 秒":""),"gt-muted"));}
  if(Array.isArray(data.failed)){const failed=data.failed.filter(x=>x?.spec===id&&typeof x.label==="string");if(failed.length){const d=node("details");d.append(node("summary","此專精未產出案例（"+failed.length+"）"));for(const x of failed)d.append(node("p",x.label+" ｜ "+combatFailureLabel(x.reason),"gt-muted"));presets.append(d);}}
  const coverage=node("details");coverage.append(node("summary","三種標準遭遇的案例覆蓋"));for(const x of combatGuildCoverage(data,id))coverage.append(node("p",x.cfg.label+" ｜ 成功 "+x.ok+(x.planned!==null?" / "+x.planned+" ｜ 未執行或未記錄 "+(x.planned-x.ok-x.failures):" ｜ 計畫數未知")+" ｜ 失敗 "+x.failures));presets.append(coverage);
  if(!cases.length){const pending=Array.isArray(data.healerPending)?data.healerPending.find(x=>x?.spec===id):null;presets.append(node("p",pending?.reason||"目前此專精沒有已成功匯入的原生引擎案例；可查看上方站內引擎是否有可用範本。","gt-muted"));if(pending&&typeof pending.source==="string"&&/^ui\/specs\/[a-z/]+\/presets\.ts$/.test(pending.source))presets.append(link("上游治療專精原始設定","https://github.com/wowsims/forever/blob/"+combatPresetCommit+"/"+pending.source));return;}
  add(presets,node("p","WoWSims v1.0.12 ｜ 固定種子 "+data.seed+" ｜ 上游預設或本站明示的控制變因案例，不代表本站目前構築或最佳 BiS。CLI 未自動加入網頁生成的藥水／魔法物品 APL 行。","gt-muted"));
  const caseFilter=select([["all","所有案例"],...Object.entries(guildScenarios).map(([k,v])=>[k,v.label]),["legacy","舊版／其他遭遇"]]),caseCards=[];add(presets,field("原生案例遭遇篩選",caseFilter));
  caseFilter.addEventListener("change",()=>{for(const [x,c] of caseCards)c.hidden=caseFilter.value!=="all"&&(caseFilter.value==="legacy"?!!guildScenarios[x.scenario]:x.scenario!==caseFilter.value);});
  for(const x of cases){const c=box(presets,x.label,x.iterations+" 次迭代 ｜ 平均 "+x.duration.toFixed(1)+" 秒");caseCards.push([x,c]);add(c,node("p","DPS "+x.dps.toFixed(2),"gt-combat-metric"));if(guildScenarios[x.scenario]){const cfg=guildScenarios[x.scenario];add(c,node("p",cfg.label+" ｜ 零基礎護甲／抗性 ｜ "+(x.inFrontOfTarget?"正面":"背面")+" ｜ 固定時間","gt-muted"));if(x.dps>0)add(c,node("p","總血量 ÷ 平均DPS："+(cfg.health*cfg.count/x.dps).toFixed(1)+" 秒（粗估；非實際擊殺，不反映逐隻死亡或斬殺階段變化）","gt-muted"));combatNativeTargetView(c,x.nativeTargets,cfg);}
   if(x.tank&&Number.isFinite(x.tank.tps))add(c,node("p","另一次完整引擎坦克測試：TPS "+x.tank.tps.toFixed(2)+(Number.isFinite(x.tank.dtps)?" ｜ DTPS "+x.tank.dtps.toFixed(2):"")+(Number.isFinite(x.tank.death)?" ｜ 死亡機率 "+(x.tank.death*100).toFixed(1)+"%":"")));
   add(c,link("裝備、天賦與設定來源","https://github.com/wowsims/forever/blob/"+combatPresetCommit+"/"+x.settings),link("技能優先序（APL）來源","https://github.com/wowsims/forever/blob/"+combatPresetCommit+"/"+x.apl));
   if(typeof x.configuration==="string"&&x.configuration){add(c,node("p",x.configuration,"gt-muted"),link("本站控制變因配置與產生程式","https://github.com/lenxcjs-cyber/wow-forever-tw-bis/blob/main/scripts/run-combat-presets.py"));}
   const requestPath=combatRequestPath(x.requestFile,id),templatePath=combatRequestPath(x.templateFile,id),path=requestPath||templatePath;
   if(path){
    const download=node("a",requestPath?"下載完整原生 RaidSimRequest":"下載解析後的 SIML 設定範本");download.href=path;download.download=path.split("/").pop();
    const msg=node("p",requestPath?"完整請求為本案例實際送入原生 CLI 的設定。":"此檔由 SIML 設定解析而來，未保證與上方特殊 APL 執行完全一致。"+(typeof x.templateNote==="string"?x.templateNote:""),"gt-muted");
    add(c,download,msg,button("載入此案例作為配裝範本",async()=>{try{if(loadGearTemplate)await loadGearTemplate(path);}catch(e){msg.textContent="讀取失敗："+e.message;}}));
   }
   const character=x.character||{};if(character.talents)add(c,node("p","天賦碼："+character.talents,"gt-muted"));if(character.race)add(c,node("p","種族："+character.race,"gt-muted"));
   if(x.nativeMetrics){
    const m=x.nativeMetrics,valid=k=>Number.isFinite(m[k])&&m[k]>=0;
    add(c,node("p",["tps","dtps","hps"].filter(valid).map(k=>k.toUpperCase()+" "+m[k].toFixed(2)).join(" ｜ ")+(Number.isFinite(m.death)&&m.death>=0&&m.death<=1?" ｜ 死亡機率 "+(100*m.death).toFixed(1)+"%":"")));
    const deviation=["dps","tps","hps","dtps"].filter(k=>valid(k+"Stdev")).map(k=>k.toUpperCase()+" 標準差 "+m[k+"Stdev"].toFixed(2));
    if(deviation.length)c.append(node("p",deviation.join(" ｜ ")+"（迭代間波動，不是平均值誤差）","gt-muted"));
    if(valid("secondsOomAvg")||valid("tto"))c.append(node("p",[valid("secondsOomAvg")?"平均缺資源秒數 "+m.secondsOomAvg.toFixed(2):"",valid("tto")?"平均耗盡法力時間 "+m.tto.toFixed(2)+"s":""].filter(Boolean).join(" ｜ "),"gt-muted"));
    if(typeof x.nativeLog==="string"&&x.nativeLog.trim()){
     const d=node("details"),q=inp("輸入技能或事件關鍵字"),pre=node("pre"),lines=x.nativeLog.slice(0,80000).split("\n");pre.className="gt-combat-log";
     const draw=()=>{const term=q.value.trim().toLowerCase();pre.textContent=lines.filter(l=>!term||l.toLowerCase().includes(term)||zhDisplay(l).toLowerCase().includes(term)).join("\n")||"沒有符合的紀錄。";};
     q.addEventListener("input",draw);add(d,node("summary","原生引擎戰鬥時間紀錄"),field("技能／紀錄搜尋",q),pre,node("p","單次原生紀錄可能截斷，不是固定循環或平均施放次數。","gt-muted"));c.append(d);draw();
    }else c.append(node("p","此原生案例未取得可顯示的單次戰鬥紀錄。","gt-muted"));
   }else combatNativeTimeline(c,x.timeline);
   if(typeof x.tank?.logs==="string"&&x.tank.logs.trim()){
    const d=node("details"),q=inp("搜尋威脅、傷害或技能原文"),pre=node("pre"),lines=x.tank.logs.slice(0,80000).split("\n");pre.className="gt-combat-log";
    const count=node("p","","gt-muted");function draw(){const k=q.value.trim().toLowerCase(),matches=lines.filter(line=>!k||line.toLowerCase().includes(k));pre.textContent=matches.join("\n")||"沒有符合紀錄";count.textContent="顯示 "+matches.length+" / "+lines.length+" 行（記錄可能截斷）。";}
    q.addEventListener("input",draw);add(d,node("summary","坦克原生戰鬥紀錄（另一次模擬）"),node("p","用於查閱仇恨、技能及承傷事件；不是上方 DPS 時間軸的同一輪。","gt-muted"),field("紀錄搜尋",q),count,pre);c.append(d);draw();
   }
   if(Array.isArray(x.sources)&&x.sources.length){
    const d=node("details");d.append(node("summary","實際配裝與技能優先序設定檔（原文）"));
    for(const src of x.sources.slice(0,16)){if(typeof src?.path!=="string"||typeof src?.text!=="string")continue;const part=node("details"),pre=node("pre");pre.className="gt-combat-log";pre.textContent=src.text.slice(0,24000);add(part,node("summary",src.path),pre);d.append(part);}
    d.append(node("p","設定語法保留原文以便重現；若來源有截斷或缺少檔案，請查閱上游及本站控制變因程式。","gt-muted"));c.append(d);
   }
   combatNativeActionView(c,x.nativeActions,id);
   if(Array.isArray(x.spells)&&x.spells.length){const a=node("details"),p=node("pre");p.className="gt-combat-log";p.textContent=x.spells.filter(y=>Number.isFinite(y.dps)).map(y=>y.name+" ｜ DPS "+y.dps.toFixed(2)+(Number.isFinite(y.casts)?" ｜ 平均施放 "+y.casts.toFixed(2):"")).join("\n");add(a,node("summary","各技能傷害貢獻"),p);c.append(a);}
   if(Array.isArray(character.warnings)&&character.warnings.length){const a=node("details"),p=node("pre");p.className="gt-combat-log";p.textContent=character.warnings.join("\n");add(a,node("summary","引擎限制與警告"),p);c.append(a);}
  }
  if(cases.length>1){
   const tankSpec=["spec-3","spec-5","spec-27"].includes(id),healSpec=["spec-4","spec-13","spec-14","spec-18","spec-28"].includes(id);
   const metric=tankSpec?"TPS":healSpec?"HPS":"DPS",value=x=>tankSpec?(x.nativeMetrics?.tps??x.tank?.tps):healSpec?(x.nativeMetrics?.hps??x.tank?.hps):x.dps;
   const comparison=box(presets,"方案數值比較",tankSpec?"坦克以 TPS 為輸出指標，同時核對承傷、死亡機率與治療模型；不以最高 DPS 作為坦克推薦。":healSpec?"治療方案須核對 HPS、有效治療與團隊承傷。":"只對標示為同遭遇的案例做組內比較；不同戰鬥長度不混合排名。");
   const groups=combatNativeGroups(cases);
   for(const group of groups){
    const c=box(comparison,group.label,"同組遭遇；請核對裝備及技能策略差異，不等同於全域最佳。");
    const sorted=group.rows.filter(x=>Number.isFinite(value(x))&&value(x)>=0).sort((a,b)=>value(b)-value(a));
    if(sorted.length<2)c.append(node("p","此組缺少至少兩個可比較的引擎數值。","gt-muted"));
    else for(const x of sorted){const delta=value(x)-value(sorted[0]);c.append(node("p",x.label+" ｜ "+metric+" "+value(x).toFixed(2)+" ｜ 與本組最高差 "+delta.toFixed(2)+(tankSpec&&Number.isFinite((x.nativeMetrics??x.tank)?.dtps)?" ｜ DTPS "+(x.nativeMetrics??x.tank).dtps.toFixed(2):"")+(tankSpec&&Number.isFinite((x.nativeMetrics??x.tank)?.death)?" ｜ 死亡機率 "+(100*(x.nativeMetrics??x.tank).death).toFixed(1)+"%":"")));}
   }
   if(cases.some(x=>typeof x.comparisonGroup!=="string"||!x.comparisonGroup.trim()))comparison.append(node("p","未標示共同遭遇的案例只提供個別數值，不做最佳排名。","gt-muted"));
  }
 }).catch(()=>{if(presets.isConnected)presets.replaceChildren(node("h4","開源引擎實跑預設案例"),node("p","實跑快照未取得；不顯示估算數值。可使用上方引擎連結。","gt-muted"));});
 const importBox=box(panel,"比較完整模擬結果","可貼上 WoWSims CLI 的 RaidSimResult 或 SIML sim JSON；結果來源與配置由使用者填寫，本站不替其驗證。");
 const resultInputs=[],labels=[],players=[],results=node("div"),msg=node("p","","gt-muted");
 for(const name of ["A","B"]){
  const label=inp("裝備／構築／遭遇與迭代條件"),area=node("textarea"),pick=select([["","單一角色自動辨識"]]);area.rows=3;area.placeholder="貼上 RaidSimResult／SIML sim JSON "+name;area.setAttribute("aria-label","模擬結果 "+name);labels.push(label);resultInputs.push(area);players.push(pick);
  let source="";
  const readPlayers=button("讀取方案 "+name+" 的角色",()=>{try{const raw=combatReadJSON(area.value);if(Number.isInteger(raw.iterations)){pick.replaceChildren(new Option("SIML 單一角色",""));msg.textContent="SIML 個人結果。";source=area.value;return;}const list=combatResultPlayers(raw);pick.replaceChildren(new Option("請選擇角色",""),...list.map(x=>new Option(x.name+"（隊伍 "+(Number(x.key.split(":")[0])+1)+"／位置 "+(Number(x.key.split(":")[1])+1)+(x.dummy?"；治療假人":"")+"）",x.key)));if(list.length===1)pick.value=list[0].key;source=area.value;msg.textContent="方案 "+name+" 共 "+list.length+" 個角色；請選擇要比較的角色。";}catch(e){pick.replaceChildren(new Option("無可用角色",""));msg.textContent="讀取失敗："+e.message;}});
  area.addEventListener("input",()=>{pick.replaceChildren(new Option("單一角色自動辨識",""));source="";});
  const upload=combatFileInput(area,msg,"上傳模擬結果 "+name+" JSON");upload.addEventListener("change",()=>{pick.replaceChildren(new Option("單一角色自動辨識",""));source="";});
  players[players.length-1]={pick,current:()=>source===area.value?pick.value:""};
  add(importBox,field("方案 "+name+" 說明",label),area,upload,readPlayers,field("方案 "+name+" 分析角色",pick));
 }
 const compare=button("比較已完成的模擬",()=>{results.replaceChildren();try{
  const rows=resultInputs.map((v,i)=>v.value.trim()?{...combatResult(combatReadJSON(v.value),players[i].current()),label:labels[i].value.trim()||"方案 "+["A","B"][i]}:null).filter(Boolean);if(!rows.length)throw Error("至少貼上一份結果");
  for(const r of rows){
   const b=box(results,r.label,r.iterations+" 次迭代"+(r.duration?" ｜ 平均 "+r.duration.toFixed(1)+" 秒":""));
   add(b,node("p",["DPS","TPS","HPS","DTPS"].map(k=>k+" "+(r[k.toLowerCase()]===null?"未提供":r[k.toLowerCase()].toFixed(2))).join(" ｜ ")),node("p","分析角色："+r.name,"gt-muted"));
   if(r.death!==null)add(b,node("p","死亡機率 "+(r.death*100).toFixed(1)+"%"));
   if(Number.isFinite(r.oom))b.append(node("p","平均資源耗盡秒數 "+r.oom.toFixed(2)));
   const deviations=Object.entries(r.stdev||{}).filter(([,v])=>Number.isFinite(v));if(deviations.length)b.append(node("p",deviations.map(([k,v])=>k.toUpperCase()+" 標準差 "+v.toFixed(2)).join(" ｜ "),"gt-muted"));
   if(r.logs){const d=node("details"),pre=node("pre");pre.textContent=r.logs;pre.className="gt-combat-log";add(d,node("summary","原始戰鬥時間紀錄"),node("p","完整隊伍紀錄，未依角色過濾。","gt-muted"),pre);b.append(d);}
  }
  if(rows.length===2){const a=rows[0],b=rows[1],delta=combatResultDelta(a,b,combatRole(id));add(results,node("p","B − A："+["dps","tps","hps","dtps"].filter(k=>a[k]!==null&&b[k]!==null).map(k=>k.toUpperCase()+" "+(b[k]-a[k]).toFixed(2)).join(" ｜ "),"gt-muted"));const c=box(results,"依目前職責比較","差額為 B − A，不自動判定最佳。");
   for(const x of delta.rows)c.append(node("p",x.metric==="death"?"死亡機率差 "+(100*x.delta).toFixed(2)+" 個百分點":x.metric==="oom"?"資源耗盡時間差 "+x.delta.toFixed(2)+" 秒":x.metric.toUpperCase()+" 差 "+x.delta.toFixed(2)+(x.percent===null?"（基準為零）":" ｜ "+x.percent.toFixed(2)+"%")));
   if(!delta.rows.length)c.append(node("p","缺少本職責可比較數值。","gt-muted"));for(const warning of delta.warnings)c.append(node("p","注意："+warning,"gt-muted"));
  }
  msg.textContent="比較完成；不同遭遇、增益、迭代或生存條件的結果不可直接判為最佳。";
 }catch(e){msg.textContent="匯入失敗："+e.message;}});
 add(importBox,compare,msg,results);
 const local=box(panel,"自訂技能時間軸試算","使用自行填寫的每次平均傷害、仇恨、治療、冷卻及資源值；以技能清單由上到下作為優先序。可選填技能 earliest／latest（最早／最晚開始秒數）與 reserve（扣除技能消耗後至少預留的資源），用於比較開場爆發或延後技能。可選 targets（敵人數）、targetCap（技能命中上限）、group／groupCd（共用冷卻）、buff／buffs（技能／外部定時倍率）、healingDemand／healMin（合併治療需求及施法缺口門檻）。每個技能仍佔用 GCD，無命中、爆擊、DoT、連擊點、普攻、觸發、承傷、仇恨轉移等真實遊戲模型。");
 const raw=node("textarea");raw.rows=10;raw.placeholder="請輸入模型 JSON，或載入教學範例";raw.setAttribute("aria-label","自訂模擬模型");
 const key="gt-combat-model-v1:"+id+":"+build;try{raw.value=localStorage.getItem(key)||"";}catch(e){}
 const demo={duration:30,gcd:1.5,cap:100,initial:100,regen:10,skills:[{name:"示意技能 A",cost:40,gain:0,cd:6,cast:0,damage:300,threat:450,healing:0},{name:"示意技能 B",cost:20,gain:0,cd:0,cast:0,damage:100,threat:100,healing:0}]};
 const modelResult=node("div"),status=node("p","","gt-muted"),objective=select([["damage","最大每秒傷害"],["threat","最大每秒仇恨"],["healing","最大每秒治療"]]);objective.value=combatMetric(id);
 const run=button("執行 A／B 優先序試算",()=>{modelResult.replaceChildren();try{const data=JSON.parse(raw.value),a=simulatePriority(data),b=simulatePriority(data,true);try{localStorage.setItem(key,raw.value);}catch(e){}for(const [name,r] of [["A：原優先序",a],["B：反轉優先序",b]]){const c=box(modelResult,name,"假設模型 ｜ 非遊戲實測");add(c,node("p","每秒傷害 "+r.rate.damage.toFixed(2)+" ｜ 每秒仇恨 "+r.rate.threat.toFixed(2)+" ｜ 每秒治療 "+r.rate.healing.toFixed(2)),node("p","施放 "+r.events.length+" 次 ｜ 無技能可用等待 "+r.idle.toFixed(1)+" 秒","gt-muted"));const d=node("details"),pre=node("pre");pre.className="gt-combat-log";pre.textContent=r.events.map(e=>e.time.toFixed(2)+"s → "+e.finish.toFixed(2)+"s ｜ "+e.name+" ｜ 資源 "+e.before.toFixed(1)+" → "+e.after.toFixed(1)+" ｜ 累積傷害 "+e.damage.toFixed(0)+" ｜ 累積仇恨 "+e.threat.toFixed(0)).join("\n");add(d,node("summary","逐次施放時間軸"),pre);c.append(d);combatPhaseView(c,r);}status.textContent="A、B 僅比較這兩個自訂優先序，沒有證明全域最佳。";}catch(e){status.textContent="試算失敗："+e.message;}});
 const optimize=button("搜尋最佳固定優先序（最多5技能）",()=>{modelResult.replaceChildren();try{const data=JSON.parse(raw.value),best=combatBestPriority(data,objective.value),r=best.result,c=box(modelResult,"假設模型最佳固定優先序",best.count+" 種排列已比較；僅限本模型，非遊戲最大值。");add(c,node("p",best.order.join(" → ")),node("p","每秒傷害 "+r.rate.damage.toFixed(2)+" ｜ 每秒仇恨 "+r.rate.threat.toFixed(2)+" ｜ 每秒治療 "+r.rate.healing.toFixed(2)));const d=node("details"),pre=node("pre");pre.className="gt-combat-log";pre.textContent=r.events.map(e=>e.time.toFixed(2)+"s ｜ "+e.name+" ｜ 資源 "+e.before.toFixed(1)+" → "+e.after.toFixed(1)+" ｜ 累積傷害 "+e.damage.toFixed(0)+" ｜ 累積仇恨 "+e.threat.toFixed(0)).join("\n");add(d,node("summary","最佳方案施放時間軸"),pre);c.append(d);combatPhaseView(c,r);status.textContent="已比較全部固定優先序；未搜尋任意等待、條件式技能策略或裝備組合。";}catch(e){status.textContent="試算失敗："+e.message;}});
 const advancedDemo={duration:30,gcd:1.5,cap:100,initial:100,regen:15,targets:3,buffs:[{name:"示意團隊增益",start:10,duration:10,damage:1.2}],skills:[{name:"示意爆發",cost:0,gain:0,cd:60,cast:0,damage:0,threat:0,group:"示意共用組",groupCd:20,buff:{name:"示意個人增益",duration:10,damage:1.5,threat:1.5}},{name:"示意群體技能",cost:20,gain:0,cd:3,cast:0,damage:90,threat:160,targetCap:5},{name:"示意單體技能",cost:20,gain:0,cd:0,cast:0,damage:180,threat:220}]};
 const targetMode=select([["total","總傷害／總仇恨／總治療"],["weakest","最低單一目標 TPS（僅仇恨目標）"]]);if(combatRole(id)==="tank")targetMode.value="weakest";
 const targetSweep=button("比較 1／2／3／5／8 個目標",()=>{modelResult.replaceChildren();try{
  const data=JSON.parse(raw.value),metric=objective.value,mode=targetMode.value,rows=combatTargetSweep(data,metric,mode);
  const label=metric==="threat"&&mode==="weakest"?"最低單目標 TPS":objectiveLabel();
  const c=box(modelResult,"多目標技能優先序比較","固定從第一個目標起算；所有敵人全程存活。群體技能每個目標套用同一數值。非遊戲實測。");
  for(const x of rows){const value=r=>combatObjective(r,metric,mode).toFixed(2),part=box(c,x.targets+" 個目標","原優先序 "+label+" "+value(x.original)+" ｜ 反轉 "+label+" "+value(x.reverse));
   if(x.best){add(part,node("p","本組最佳固定優先序："+x.best.order.join(" → ")+" ｜ "+label+" "+value(x.best.result)));combatPhaseView(part,x.best.result);}
   else part.append(node("p","超過 5 個技能，僅比較兩種優先序。","gt-muted"));
  }status.textContent="已完成五種目標數的假設試算；最低 TPS 不等於實際仇恨安全。";
 }catch(e){status.textContent="試算失敗："+e.message;}});
 const healingDemo={duration:60,gcd:1.5,cap:2000,initial:2000,regen:15,healingDemand:{initial:0,rate:90,bursts:[{time:10,amount:700},{time:25,amount:1000},{time:45,amount:700}]},skills:[{name:"示意大補",cost:180,gain:0,cd:0,cast:2.5,damage:0,threat:0,healing:620,healMin:400},{name:"示意快速補",cost:100,gain:0,cd:0,cast:1.5,damage:0,threat:0,healing:240,healMin:150},{name:"示意回魔",cost:0,gain:300,cd:30,cast:0,damage:0,threat:0,healing:0}]};
 const healingRun=button("比較有效治療及溢補",()=>{modelResult.replaceChildren();try{
  const data=JSON.parse(raw.value);if(!data.healingDemand)throw Error("請先設定 healingDemand 或載入治療教學範例");
  const original=simulatePriority(data),reverse=simulatePriority(data,true),rows=[["A：原優先序",original],["B：反轉優先序",reverse]];
  if(data.skills.length<=5){const best=combatBestPriority(data,"effective");rows.push(["本模型最佳固定優先序："+best.order.join(" → "),best.result]);}
  const c=box(modelResult,"治療情境比較","有效治療以同一合併缺口計算；相同有效治療時優先較低最大缺口。非遊戲實測。");
  for(const [label,r] of rows){const h=r.healingDemand,part=box(c,label,"有效 HPS "+r.rate.effective.toFixed(2)+" ｜ 原始 HPS "+r.rate.healing.toFixed(2)+" ｜ 最終缺口 "+h.deficit.toFixed(1));combatPhaseView(part,r);const d=node("details"),p=node("pre");p.className="gt-combat-log";p.textContent=r.events.map(e=>e.time.toFixed(2)+"s → "+e.finish.toFixed(2)+"s ｜ "+e.name+" ｜ 有效補量 "+e.effective.toFixed(1)+" ｜ 缺口 "+e.deficit.toFixed(1)+" ｜ 資源 "+e.after.toFixed(1)).join("\n");add(d,node("summary","治療施放時間軸"),p);part.append(d);}
  status.textContent="完成治療策略比較；不代表實際首領治療量或最佳裝備。";
 }catch(e){status.textContent="試算失敗："+e.message;}});
 const killPick=select(Object.entries(guildScenarios).map(([k,v])=>[k,v.label])),killLimit=select([["60","60秒"],["120","120秒"],["180","180秒"],["300","300秒"],["600","600秒"]]);killLimit.value="600";
 const killRun=button("比較公會目標擊殺時間（自訂模型）",()=>{modelResult.replaceChildren();try{
  const result=combatGuildKill(combatReadJSON(raw.value),killPick.value,Number(killLimit.value)),c=box(modelResult,"目標血量與轉火比較","自訂每次命中傷害；扣血至0後移除目標、順序轉火、全部死亡立即停止。未模擬真實遊戲命中、斬殺、DoT、護甲或抗性；不代表原生實測。");
  for(const [label,r] of [["A：原優先序",result.original],["B：反轉優先序",result.reverse],...(result.best?[["本模型最佳："+result.best.order.join(" → "),result.best.result]]:[])]){
   const k=r.kill,part=box(c,label,k.cleared?"全部擊殺："+k.killTime.toFixed(2)+" 秒":"未擊殺全部 ｜ 上限 "+k.elapsed.toFixed(2)+" 秒");
   add(part,node("p","有效傷害 "+r.totals.damage.toFixed(0)+" ｜ 溢出傷害 "+k.overkill.toFixed(0)+" ｜ 剩餘血量 "+k.remaining.reduce((a,b)=>a+b,0).toFixed(0)));
   for(let i=0;i<k.remaining.length;i++)part.append(node("p","目標 "+(i+1)+" ｜ "+(k.deathTimes[i]===null?"剩餘 "+k.remaining[i].toFixed(0)+" HP":"擊殺 "+k.deathTimes[i].toFixed(2)+"s")));
   const log=node("details"),pre=node("pre");pre.className="gt-combat-log";pre.textContent=r.events.map(e=>e.finish.toFixed(2)+"s ｜ "+e.name+" ｜ 命中 "+e.hitIds.map(i=>i+1).join("、")+" ｜ 剩餘 "+e.remaining.map(v=>v.toFixed(0)).join(" / ")).join("\n");add(log,node("summary","擊殺與轉火時間軸"),pre);part.append(log);
  }status.textContent="假設模型："+(result.best?"已比較 "+result.best.count+" 種固定優先序。":"超過5技能，僅比較A/B。");
 }catch(e){status.textContent="試算失敗："+e.message;}});
 const timingSkill=inp("完整技能名稱；留空則使用第一個技能");
 const objectiveLabel=()=>({damage:"DPS",threat:"TPS",healing:"HPS"})[objective.value];
 const durationSweep=button("比較 30／60／120／180 秒",()=>{modelResult.replaceChildren();try{
  const data=JSON.parse(raw.value),rows=combatDurationSweep(data,objective.value),metric=objective.value;
  const c=box(modelResult,"不同戰鬥時間的優先序比較","同一自訂參數；保留原本技能時間窗。非正式遊戲傷害模型。");
  for(const x of rows){const r=x.best?.result,part=box(c,x.duration+" 秒","原優先序 "+objectiveLabel()+" "+x.original.rate[metric].toFixed(2)+" ｜ 反轉 "+x.reverse.rate[metric].toFixed(2));
   if(r){add(part,node("p","最佳固定優先序："+x.best.order.join(" → ")+" ｜ "+objectiveLabel()+" "+r.rate[metric].toFixed(2)),node("p","搜尋 "+x.best.count+" 組固定優先序","gt-muted"));combatPhaseView(part,r);}
   else part.append(node("p","超過 5 技能，僅比較原始與反轉兩種方案。","gt-muted"));
  }status.textContent="已比較四種戰鬥長度；沒有重新搜尋裝備、天賦或遊戲 APL。";
 }catch(e){status.textContent="試算失敗："+e.message;}});
 const timingSweep=button("比較指定技能的開場延後時機",()=>{modelResult.replaceChildren();try{
  const data=JSON.parse(raw.value),name=timingSkill.value.trim()||data.skills?.[0]?.name,t=combatTimingSweep(data,name,objective.value),metric=objective.value;
  const c=box(modelResult,"技能開場時機比較："+t.skillName,"固定其餘技能優先序，只調整指定技能最早可用時間。");
  for(const x of t.rows)add(c,node("p","延後 "+x.offset+"s ｜ 最早 "+x.earliest+"s ｜ 實際首次 "+(x.first===null?"未施放":x.first.toFixed(2)+"s")+" ｜ "+x.count+" 次 ｜ "+objectiveLabel()+" "+x.result.rate[metric].toFixed(2)));
  add(c,node("p","本組最佳：延後 "+t.best.offset+"s ｜ 相較原方案 "+objectiveLabel()+" "+(t.best.result.rate[metric]-t.baseline.rate[metric]).toFixed(2)));
  combatPhaseView(c,t.best.result);
  const d=node("details"),pre=node("pre");pre.className="gt-combat-log";pre.textContent=t.best.result.events.map(e=>e.time.toFixed(2)+"s → "+e.finish.toFixed(2)+"s ｜ "+e.name+" ｜ 資源 "+e.before.toFixed(1)+" → "+e.after.toFixed(1)).join("\n");add(d,node("summary","本組最佳施放時間軸"),pre);c.append(d);
  status.textContent="只測試列出的延後秒數；不代表全域最優，增益僅使用自行輸入的假設倍率。";
 }catch(e){status.textContent="試算失敗："+e.message;}});
 add(local,button("載入純教學範例（非遊戲數值）",()=>{raw.value=JSON.stringify(demo,null,2);modelResult.replaceChildren();status.textContent="這是假設數值，請勿視為目前專精的實際數據。";}),button("載入群體／增益教學範例（非遊戲數值）",()=>{raw.value=JSON.stringify(advancedDemo,null,2);modelResult.replaceChildren();status.textContent="假設的目標數及增益倍率，不代表實際職業技能。";}),button("載入治療教學範例（非遊戲數值）",()=>{raw.value=JSON.stringify(healingDemo,null,2);modelResult.replaceChildren();status.textContent="合併缺口與補量皆是假設數值，可自行修改。";}),raw,run,field("最佳化目標",objective),optimize,durationSweep,healingRun,field("多目標比較指標",targetMode),targetSweep,field("公會擊殺目標",killPick),field("擊殺測試時間上限",killLimit),killRun,field("延後測試技能",timingSkill),timingSweep,status,modelResult);
}
function talentHub(){
 title("天賦流派與野外練等","使用首頁的職業、專精與玩法選單，直接查看天賦及練等。");
 if(!getSpec()){panel.append(node("p","請先在上方選擇職業及專精。"));return;}
 const frame=node("iframe");frame.title="天賦流派與野外練等";frame.style.cssText="display:block;width:100%;height:950px;border:0;border-radius:8px;background:#0e131c";
 fitEmbedded(frame);
 frame.src=talentPageURL(true)+"&v=21.8";
 add(panel,frame);
}
const renderers={combat:combatLab,audit,v8:talentHub,v9:drops,v10:checklist,v11:raid,v12:hotfix,v13:material,v14:optimizer};
function show(key){if(siteMode==="blue")return;cleanupFrame();restoreLegacy();active=key;navMoreSummary.textContent=["audit","v13","combat"].includes(key)?"更多功能":"更多功能 · "+(tabs.find(t=>t[0]===key)?.[1]||"");for(const b of $$("button",nav)){b.setAttribute("aria-pressed",String(b.dataset.tab===key));}try{if(["v9","v10","v14","audit","combat"].includes(key)&&!getSpec()){panel.replaceChildren(node("p","請先在上方選擇職業與專精，即可查看對應資料。","gt-muted"));return;}renderers[key]();}catch(e){panel.replaceChildren(node("p","此工具載入失敗，原有職業裝備區仍可使用。"));console.error(e);}}
const navPrimary=node("div",undefined,"gt-nav-primary"),navMore=node("details",undefined,"gt-nav-more"),navMoreSummary=node("summary","更多功能"),navMoreBody=node("div",undefined,"gt-nav-more-body");add(navMore,navMoreSummary,navMoreBody);add(nav,navPrimary,navMore);
const dashboardMeta={combat:["⚔️","實戰模擬及方案比較"],v8:["⚔️","天賦樹、玩法與練等"],v9:["🔎","首領與裝備來源"],v10:["📋","個人裝備清單"],v11:["🛡️","開荒前置準備"],v12:["📜","繁中藍帖專頁"],v13:["🧪","附魔與消耗品"],v14:["⚖️","比較候選裝備"],audit:["✅","左右並排天賦與裝備"]};
for(const [key,label] of [...tabs].sort((a,b)=>Number(b[0]==="audit")-Number(a[0]==="audit"))){const b=button(label,()=>{show(key);navMore.open=false;});b.dataset.tab=key;b.title=dashboardMeta[key][1];b.textContent=key==="v13"?"附魔與消耗品":label;(["audit","v13","combat"].includes(key)?navPrimary:navMoreBody).append(b);}
let pickerArea=null,siteMode="class",lastClassTab="audit";
const toolboxDetails=root.closest("details");
const mainSpec=$("#spec-select");
if(toolboxDetails&&mainSpec){
 let picker=mainSpec.parentElement;
 while(picker&&picker.parentElement&&picker.parentElement!==toolboxDetails.parentElement&&!picker.parentElement.contains(toolboxDetails))picker=picker.parentElement;
 if(picker&&picker.parentElement===toolboxDetails.parentElement&&picker!==toolboxDetails&&!picker.contains(root)&&picker.querySelectorAll("select").length>=2&&!picker.querySelector("section.spec")){
  const group=node("div",undefined,"gt-unified");
  picker.before(group);group.append(picker,root);pickerArea=picker;
  toolboxDetails.hidden=true;
  if(toolboxDetails.id){const alias=node("span");alias.id=toolboxDetails.id;toolboxDetails.removeAttribute("id");group.prepend(alias);}
 }else{toolboxDetails.open=true;root.classList.add("gt-flat");const summary=toolboxDetails.querySelector("summary");if(summary)summary.style.display="none";}
}else{root.classList.add("gt-flat");}

let lastSpecKey=null;const syncSpec=()=>{if(siteMode==="blue")return;const id=getSpec(),key=id+":"+(id?buildFor(id):"");if(key===lastSpecKey)return;lastSpecKey=key;syncBuild();if(!active&&getSpec()){show("audit");return;}if(["v8","v9","v10","v13","v14","audit","combat"].includes(active))show(active);};
mainSpec?.addEventListener("change",()=>queueMicrotask(syncSpec));$("#class-select")?.addEventListener("change",()=>queueMicrotask(syncSpec));for(const id of bySpec.keys())syncWeaponCards(id);syncBuild();if(specEls.length&&bySpec.size){enableLegacyConsolidation();}if(getSpec()&&!active)show("audit");
// Archive only explicitly identified historical banners, never move controls or equipment data.
function archiveLegacyHeader(){
 const safe=e=>e&&e.isConnected&&!root.contains(e)&&!e.contains(root)&&!e.closest("section.spec")&&!e.querySelector("select,input,button,iframe,script,section.spec,#guild-tools")&&e.textContent.length<4000;
 const textOf=e=>e.textContent.trim().replace(/\s+/g," ");
 const rules=[/^(?:2026\/11\/27\s*[｜|]\s*)?V6\s*修正法系與物理裝備混排/,/^V7\s*[｜|]\s*全專精資料稽核/,/^V8\s*[–—-]\s*V14\s*功能試用版/];
 const selected=[];
 for(const rule of rules){
  const candidates=$$("p,div,section,aside,article,blockquote,h2,h3,h4").filter(e=>safe(e)&&rule.test(textOf(e)));
  // The V7 audit heading belongs to a card with multiple paragraphs.
  const full=candidates.filter(e=>!/^H[2-4]$/.test(e.tagName));
  const choice=(full.length?full:candidates).find(e=>!full.some(p=>p!==e&&p.contains(e)));
  if(choice&&!selected.some(e=>e.contains(choice)||choice.contains(e)))selected.push(choice);
 }
 if(!selected.length)return;
 const archive=node("details",undefined,"gt-legacy-history");
 add(archive,node("summary","歷史版本與資料說明"));
 const target=root.closest(".gt-unified")||root;
 target.after(archive);
 for(const e of selected)archive.append(e);
}
archiveLegacyHeader();
const selectorGroup=mainSpec?.closest(".gt-unified")||mainSpec?.parentElement?.parentElement;
selectorGroup?.addEventListener("change",e=>{if(e.target!==mainSpec&&e.target.tagName==="SELECT"&&!root.contains(e.target))queueMicrotask(syncSpec);});
const modeBar=node("div",undefined,"gt-site-mode"),classMode=button("職業資料",()=>switchMode("class")),blueMode=button("官方藍帖",()=>switchMode("blue"));classMode.id="gt-mode-class";blueMode.id="gt-mode-blue";
modeBar.style.cssText="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px";
for(const b of [classMode,blueMode])b.style.cssText="padding:6px 12px;border:1px solid #52647b;border-radius:8px;background:#172230;color:#e9c88c;font-weight:700";
add(modeBar,classMode,blueMode);
if(pickerArea)pickerArea.before(modeBar);else root.prepend(modeBar);
const fallbackControls=[];
if(!pickerArea&&mainSpec){let p=mainSpec.parentElement;while(p&&p!==root&&!p.contains(root)&&p.querySelectorAll("select").length<2)p=p.parentElement;if(p&&p!==root&&!p.contains(root))fallbackControls.push(p);else for(const e of [$("#class-select"),mainSpec])if(e)fallbackControls.push(e.closest("label")||e);}
function setModeHidden(e,hidden){if(!e)return;if(hidden){if(!e.hasAttribute("data-gt-mode-hidden")){e.dataset.gtModeHidden=e.style.getPropertyValue("display");e.dataset.gtModePriority=e.style.getPropertyPriority("display");}e.style.setProperty("display","none","important");}else if(e.hasAttribute("data-gt-mode-hidden")){const v=e.dataset.gtModeHidden,p=e.dataset.gtModePriority;if(v)e.style.setProperty("display",v,p);else e.style.removeProperty("display");delete e.dataset.gtModeHidden;delete e.dataset.gtModePriority;}}
function validOfficialPost(p){
 if(!p||typeof p.key!=="string"||typeof p.title!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Array.isArray(p.sections)||!p.sections.length)return false;
 return /^https:\/\/(?:us|eu)\.forums\.blizzard\.com\/en\/wow\/t\/(?:[a-z0-9-]+\/)?\d+(?:\/\d+)?\/?$/i.test(String(p.url||""))&&p.sections.every(s=>s&&typeof s.title==="string"&&typeof s.body==="string"&&typeof s.category==="string");
}
function combineOfficialBlue(seed,live){
 const map=new Map(seed.filter(validOfficialPost).map(p=>[p.key,p]));
 for(const p of live||[])if(validOfficialPost(p)&&["machine","title-only","pending"].includes(p.translationStatus))map.set(p.key,p);
 return [...map.values()].sort((a,b)=>(b.updatedAt||b.date).localeCompare(a.updatedAt||a.date));
}
const blueClassKeys=["warrior","paladin","hunter","rogue","priest","shaman","mage","warlock","druid"];
const blueClassZh=["戰士","聖騎士","獵人","盜賊","牧師","薩滿","法師","術士","德魯伊"];
function liveClassPosts(specId,posts){
 const n=Number(String(specId).split("-")[1]);if(!Number.isInteger(n)||n<1||n>28)return [];
 const key=blueClassKeys[Math.min(8,Math.floor((n-1)/3))];
 return combineOfficialBlue([],posts).filter(p=>Array.isArray(p.classMentions)&&p.classMentions.includes(key));
}
function blueClassLabels(p){return Array.isArray(p.classMentions)?blueClassKeys.filter(k=>p.classMentions.includes(k)).map(k=>blueClassZh[blueClassKeys.indexOf(k)]):[];}
function blueCheckpointText(d,now=Date.now()){
 const check=d?.lastCheck,at=Date.parse(check?.at||"");
 const date=v=>new Date(v).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"});
 const published=Number.isFinite(Date.parse(d?.lastPublished||""))?"｜公告資料最後變動："+date(d.lastPublished):"｜尚無自動新增公告";
 if(!Number.isFinite(at)||!["ok","partial"].includes(check.status))return "尚無已發布的抓取紀錄"+published+"；請查同步執行紀錄。";
 const counts=Object.entries(check.regions||{}).filter(([k,v])=>["us","eu"].includes(k)&&Number.isInteger(v?.read)&&Number.isInteger(v?.attempted)).map(([k,v])=>k.toUpperCase()+" "+v.read+"/"+v.attempted).join("、");
 return "最近發布的抓取紀錄："+date(at)+"（台灣時間）｜"+(check.status==="partial"?"部分抽查未成功":"抽查主題均讀取成功")+(counts?"｜"+counts:"")+published+(now-at>7*3600000?"｜紀錄已逾7小時，請檢查排程或發布狀態。":"｜紀錄最多每6小時更新，非即時排程狀態。");
}
function renderBlueBoard(host){
 const board=node("section",undefined,"gt-blue-board");board.dataset.release="19.9";board.id="gt-blue-board";
 const sourceURL="https://us.forums.blizzard.com/en/wow/c/wow-forever/346";
 add(board,node("h3","永恆官方藍帖"),node("p","V19.9 · 暴雪官方直連","gt-muted"),node("p","只追蹤暴雪官方永恆論壇；每10分鐘排程抽查（可能延遲，非完整論壇掃描）。人工整理與機器翻譯分開標示；每則公告獨立收合。","gt-muted"));
 const src=node("div",undefined,"gt-blue-source");add(src,link("暴雪美服永恆論壇",sourceURL),link("暴雪歐服永恆論壇","https://eu.forums.blizzard.com/en/wow/c/wow-forever/359"),link("藍帖同步執行紀錄","https://github.com/lenxcjs-cyber/wow-forever-tw-bis/actions/workflows/official-blue.yml"));board.append(src);const syncStatus=node("p","官方歷史公告已載入；正在檢查自動更新資料。","gt-muted");syncStatus.id="blue-sync-status";board.append(syncStatus);let entries=combineOfficialBlue(bluePosts,[]);
 const filter=node("div",undefined,"gt-blue-filters"),q=inp("職業、技能、日期"),category=select([["","全部"],...Array.from(new Set(bluePosts.flatMap(p=>p.sections.map(x=>x.category)))).map(x=>[x,x])]),count=node("p",undefined,"gt-muted"),out=node("div");q.id="blue-query";category.id="blue-category";count.setAttribute("role","status");out.id="blue-list";
 add(filter,field("搜尋公告",q),field("分類",category));add(board,filter,count,out);
 const expanded=new Set();
 function draw(){
  for(const d of out.querySelectorAll("details")){if(d.open)expanded.add(d.dataset.postKey);else expanded.delete(d.dataset.postKey);}
  out.replaceChildren();
  const terms=q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list=entries.filter(p=>(!category.value||p.sections.some(x=>x.category===category.value))&&terms.every(t=>[p.title,p.author,p.date,...blueClassLabels(p),...p.sections.flatMap(x=>[x.category,x.title,x.body,x.impact||""])].join(" ").toLowerCase().includes(t)));
  count.textContent="顯示 "+list.length+" 篇公告";
  for(const p of list){
   const article=node("article"),d=node("details"),head=node("summary"),meta=node("div"),body=node("div",undefined,"gt-blue-body");d.dataset.postKey=p.key;
   add(meta,node("div",p.title,"gt-blue-title"),node("div","永恆服 · "+p.date+" · "+[...new Set(p.sections.map(x=>x.category))].join("／")+(p.author?" · "+p.author:""),"gt-blue-meta"));head.append(meta);
   body.append(node("p",p.translationStatus==="pending"?"官方公告已偵測 · 翻譯待處理":p.translationStatus==="machine"?"機器繁中重點 · 未人工校對 · 非全文":p.translationStatus==="title-only"?"機器繁中標題 · 內文待整理":"公會繁中改動整理（非官方全文）","gt-muted"));if(blueClassLabels(p).length)body.append(node("p","自動辨識職業（待核對）："+blueClassLabels(p).join("、"),"gt-muted"));if(p.updatedAt)body.append(node("p","官方更新時間："+new Date(p.updatedAt).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})+"（台灣時間）"+(p.revision?"｜修訂版":""),"gt-muted"));
   for(const section of p.sections){add(body,node("h4",section.title),node("p",section.body));if(section.impact)add(body,node("p","配裝／遊玩提醒："+section.impact,"gt-blue-impact"));}
   const links=node("div",undefined,"gt-blue-source");links.append(link("閱讀暴雪官方原文",p.url||sourceURL));body.append(links);
   add(d,head,body);d.open=expanded.has(p.key);d.addEventListener("toggle",()=>{if(!d.isConnected)return;if(d.open)expanded.add(p.key);else expanded.delete(p.key);});article.append(d);out.append(article);
  }
  if(!list.length)out.append(node("p","沒有符合搜尋的公告。","gt-muted"));
 }
 q.addEventListener("input",draw);category.addEventListener("change",draw);host.append(board);draw();
 fetch("official-blue-live.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();}).then(d=>{if(!board.isConnected)return;if(d.format!==1||!Array.isArray(d.posts))throw Error("format");entries=combineOfficialBlue(bluePosts,d.posts);for(const cat of new Set(entries.flatMap(p=>p.sections.map(s=>s.category))))if(!Array.from(category.options).some(o=>o.value===cat))category.add(new Option(cat,cat));syncStatus.textContent=blueCheckpointText(d);draw();}).catch(()=>{if(board.isConnected)syncStatus.textContent="自動資料暫未取得；目前顯示已整理的官方歷史公告。";});
}
function renderBlueMode(){
 cleanupFrame();restoreLegacy();active="v12";panel.replaceChildren();renderBlueBoard(panel);
}
function switchMode(next,record=true){
 if(!["class","blue"].includes(next))return;
 if(next===siteMode)return;
 if(next==="blue"&&siteMode!=="blue"&&active&&active!=="v12")lastClassTab=active;
 siteMode=next;const blue=next==="blue";document.documentElement.classList.toggle("gt-blue-mode",blue);root.dataset.mode=next;
 classMode.setAttribute("aria-pressed",String(!blue));blueMode.setAttribute("aria-pressed",String(blue));
 classMode.style.borderColor=blue?"#52647b":"#e9c88c";blueMode.style.borderColor=blue?"#e9c88c":"#52647b";
 for(const e of [pickerArea,...fallbackControls,buildBar,navLabel,nav])setModeHidden(e,blue);
 if(record){try{const u=new URL(location.href);if(blue)u.searchParams.set("view","blue");else u.searchParams.delete("view");history.pushState(null,"",u);}catch(e){}}
 if(blue)renderBlueMode();else{lastSpecKey=null;syncBuild();show(lastClassTab);}
}
root.dataset.mode="class";classMode.setAttribute("aria-pressed","true");blueMode.setAttribute("aria-pressed","false");classMode.style.borderColor="#e9c88c";
if(new URLSearchParams(location.search).get("view")==="blue")switchMode("blue",false);
window.addEventListener("popstate",()=>switchMode(new URLSearchParams(location.search).get("view")==="blue"?"blue":"class",false));


})();