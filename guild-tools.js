/* 墓鐘公會用資料庫 V18.4 beta · 2026-11-27
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
function feralWeaponMode(id){return feralSpec(id)?(buildFor(id)==="feral_onehand"?"onehand":"twohand"):"";}

function isTwoHand(type){return /雙手|two.hand|法杖|長柄|staff|staves|polearm/i.test(type||"");}
function skillGate(id,x){
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
const tabs=[["v8","天賦流派"],["v9","掉落反查"],["v10","收集進度"],["v11","團本準備"],["v13","配方材料"],["v14","配裝試算"],["audit","BiS 資料稽核"]];
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
const info=node("p","V14.2 · 選擇下方功能按鈕，快速查詢公會資料。原有職業與裝備選單維持不變。","gt-muted");
const navLabel=node("p","03 選擇功能","gt-section-label");add(root,navLabel,nav,panel);
let active="";
const specPairs=[...bySpec.values()].map(s=>[s.id,s.name]);
const getSpec=()=>{const el=$("#spec-select");return el&&!el.disabled&&bySpec.has(el.value)?el.value:"";};
const buildBar=node("div");buildBar.id="gt-build-bar";root.insertBefore(buildBar,nav);
function syncBuild(){
 const id=getSpec();buildBar.replaceChildren();
 if(!rogueProfiles[id])return;
 const pick=select(rogueProfiles[id]);pick.id="gt-build-select";pick.value=buildFor(id);
 pick.addEventListener("change",()=>{chooseBuild(id,pick.value);lastSpecKey=id+":"+buildFor(id);syncBuild();if(active)show(active);});
 add(buildBar,field("天賦構築（決定武器資格）",pick),node("p",variantFor(id)?"此構築獨立保存權重；"+(referenceTalent(id)?"已收錄逐項參考；模擬權重待補。":"逐項天賦與模擬權重待補。"):"依核心技能篩選；未收錄符合條件的武器時不自動補造排名。","gt-muted"));
 syncWeaponCards(id);
}
function specPicker(){return {value:getSpec()};}
function specLabel(){const id=getSpec();return node("p","目前專精："+(bySpec.get(id)?.name||"尚未選擇")+(id?" ｜ "+(rogueProfiles[id]?.find(p=>p[0]===buildFor(id))?.[1]||""):""),"gt-muted");}
function title(t,desc){panel.replaceChildren(node("h3",t),node("p",desc,"gt-muted"));}
function guide(){title("V16.6 · 天賦與實戰手法","全 28 專精研究重點與多來源天賦查證。團本前 PvE；非已驗證的唯一最佳點法。");const out=node("div");const render=id=>{const s=bySpec.get(id),g=guides[Number(id.split("-")[1])-1];out.replaceChildren();const c=box(out,s.name,g[0]);splitView(id,out);if(feralSpec(id)){const f=box(out,"野性武器專項查證","預設雙手；單手＋持有型副手獨立比較，未取得完整組合前不視為BiS。");add(f,link("貓形態團本前配裝參考","https://foreverbis.net/druid/feral-cat/alliance/"),node("p",""),link("熊形態團本前配裝參考","https://foreverbis.net/druid/feral-bear/alliance/"));}if(variantFor(id)||casterFeralTalentBuilds[id])selectedTalentView(id,out);else if(referenceTalent(id)){plateTalentView(id,out);hunterShamanTalentView(id,out);rogueTalentView(id,out);}const builds=box(out,"此專精所有已收錄構築","切換上方構築即可使用各自的武器限制與本機權重；沒有逐項資料的構築不借用其他配置。");for(const [key,label] of rogueProfiles[id]||[]){const v=extraProfiles[id]?.find(x=>x[0]===key);add(builds,button((key===buildFor(id)?"目前：":"切換：")+label+(v?" · "+v[2]:""),()=>{chooseBuild(id,key);syncBuild();show("v8");}),node("p",v?v[3]+(variantTalentBuilds[id+":"+key]?"（有逐項參考）":"（逐項待補）"):"基準構築；請核對點數與版本","gt-muted"));}const research=talentResearch[Number(id.split("-")[1])-1];if(research){const analysis=box(out,"天賦與裝備收益研究",research[0]);add(analysis,node("p","需核對核心技能／天賦："+research[1]),node("p",research[2]),node("p","研究清單：非已驗證天賦點法、係數或數值權重。","gt-muted"),link("11/26 客戶端天賦資料（1.60.1.71139）","https://wowforevertalents.com/"),node("p",""),link("11/24 團本前構築與配裝","https://www.zockify.com/forever/bis/"),node("p",""),link("11/25 客戶端配裝參考","https://foreverbis.net/"));}add(c,node("p",g[1]),node("h4","構築與手法查證"),link("11/26 客戶端天賦樹（METAMMO）","https://metammo.com/wow-forever/talents"),node("p",""),link("11/25 天賦樹（The Forever Era）","https://theforeverera.com/en/talents/"),node("p",""),link("ForeverSpec 天賦計算器","https://foreverspec.com/talent-calculator/"),node("p",""),node("p","先依職責選擇滿等 PvE 天賦，再以遊戲內技能、最新熱修正及相同構築的實測確認優先序。"),link("ForeverSpec 滿等構築與版本更新","https://foreverspec.com/"),node("p",""),link("11/24 Zockify 全專精團本前配裝與構築","https://www.zockify.com/forever/bis/"),node("p",""),link("11/25 Forever BiS 客戶端資料與配裝","https://foreverbis.net/"),node("p",""),link("60.tools 全專精配裝與天賦","https://www.60.tools/bis"),node("p",""),link("AltGearer 屬性優先級（非完整BiS）","https://altgearer.com/forever/bis/"),node("p",""),link("Azeroth DB 天賦計算器與技能資料","https://azeroth-db.github.io/"),node("p",""),link("WoWGuildHub 天賦與技能資料","https://wowguildhub.com/wow-forever/guide"),node("p",""),link("永恆職業指南／天賦與手法", "https://nossuary.com/guides/wow-forever/"+g[2]+"/"),node("p","另以官方熱修正、Icy Veins 與遊戲內技能說明交叉核對。","gt-muted"),link("Icy Veins 永恆職業指南","https://www.icy-veins.com/wow-forever/class-guides"));if(id==="spec-12"){add(c,node("h4","構築機制與裝備連動"),node("p","背刺與伏擊需要主手匕首；出血可用其他武器，但匕首係數為145%，一般武器100%。伺機而動5/5使背刺、伏擊、絞喉、截肢傷害增加20%。這些是技能係數，不可直接當成敏捷或攻強權重。"),link("永恆敏銳天賦與技能","https://azerothprime.com/en/forever/classes/rogue/subtlety/talents"),node("p",""),link("ForeverSpec 敏銳構築","https://foreverspec.com/classes/rogue/subtlety/"));}if(id==="spec-25")add(c,node("p","11/25：平衡天賦改名、星火術天賦降為2點、日月蝕增加憤怒爆擊，舊配置須重查。"),link("官方11/25熱修正","https://news.blizzard.com/en-us/article/24315281/wow-forever-hotfixes-november-25-2026"));};const p=specPicker(render);add(panel,specLabel(),out);render(p.value);}
function sourceGroup(source){return String(source||"來源待查").split(/\s*[－—–]\s*|\s+-\s+/)[0].trim()||"來源待查";}
function drops(){title("V15 · 掉落反查與刷裝路線","以網站既有候選裝備為範圍，按來源、專精、部位及順位查詢。順位不是掉率；來源未經逐件交叉驗證。");
const q=inp("裝備、首領、副本、任務、物品 ID（空格分隔）"),sp={value:getSpec()},slot=select([...new Set([...bySpec.values()].flatMap(s=>[...s.slots.keys()]))].sort().map(x=>[x,x]),"所有部位"),source=select([...new Set([...byItem.values()].map(x=>sourceGroup(x.source)))].sort().map(v=>[v,v]),"所有取得來源"),rank=select([["0","不限順位"],["1","第一順位"],["3","前三順位"]]),mode=select([["items","裝備清單"],["routes","依來源整理"]]),out=node("div");
let limit=40;function draw(){out.replaceChildren();const terms=q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);const rows=[...byItem.values()].map(x=>({...x,matched:x.uses.filter(u=>(!sp.value||u.id===sp.value)&&allowed(u.id,{...x,slot:u.slot,type:u.type||x.type})&&(!slot.value||u.slot===slot.value)&&(!Number(rank.value)||(u.rank>0&&u.rank<=Number(rank.value))))})).filter(x=>x.matched.length&&(!source.value||sourceGroup(x.source)===source.value)&&terms.every(t=>[x.name,x.source,x.type,x.id,...x.matched.map(u=>u.name+" "+u.slot)].join(" ").toLowerCase().includes(t)));
const groups=new Map();for(const x of rows){const k=sourceGroup(x.source);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}
out.append(node("p",rows.length+" 件符合條件的物品 · "+groups.size+" 個來源分類（依原卡片文字）","gt-muted"));
function card(x){const c=node("article",undefined,"gt-card");add(c,link(x.name,x.url),node("p",x.source),node("small",x.type+" · ID "+x.id),node("p",Object.entries(x.stats).map(([k,v])=>k+" "+v).join(" · "),"gt-muted"),node("p",x.matched.map(u=>u.name+" / "+u.slot+" #"+u.rank+(u.review?"（適用性待複核）":"")).join("、")),node("p",x.evidence||"缺少證據文字，請查證","gt-muted"));return c;}
if(mode.value==="routes"){const sorted=[...groups].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0],"zh-Hant"));for(const [name,items] of sorted.slice(0,limit)){const d=node("details",undefined,"gt-card");d.append(node("summary",name+"｜"+items.length+" 件候選"));for(const x of items)d.append(card(x));out.append(d);}if(sorted.length>limit)out.append(button("顯示更多來源",()=>{limit+=40;draw();}));}else{rows.sort((a,b)=>Math.min(...a.matched.map(u=>u.rank||999))-Math.min(...b.matched.map(u=>u.rank||999))||a.name.localeCompare(b.name,"zh-Hant"));for(const x of rows.slice(0,limit))out.append(card(x));if(rows.length>limit)out.append(button("顯示更多裝備",()=>{limit+=40;draw();}));}
if(!rows.length)out.append(node("p","沒有符合條件的候選；不代表遊戲內沒有此物品。"));}
for(const el of [q,slot,source,rank,mode])el.addEventListener(el===q?"input":"change",()=>{limit=40;draw();});add(panel,field("搜尋",q),specLabel(),field("部位",slot),field("來源",source),field("候選順位",rank),field("檢視方式",mode),out,box(panel,"完整遊戲資料查證","本站非全物品掉落庫。外部資料也可能包含舊版推定掉落，須確認永恆版本。"));add(panel,link("Eternadex 物品與來源資料庫","https://eternadex.com/en/datenbank/"),node("p",""),link("Azeroth DB 副本掉落與物品","https://azeroth-db.github.io/"));draw();}
const storeKey="tomb-bis-collected-v1";let collected={};let storageOK=true;try{collected=JSON.parse(localStorage.getItem(storeKey)||"{}");if(!collected||typeof collected!=="object")collected={};}catch(e){storageOK=false;collected={};}
function save(){try{localStorage.setItem(storeKey,JSON.stringify(collected));}catch(e){storageOK=false;}}
function checklist(){title("V10 · 個人裝備收集","每個專精獨立保存。只存在本瀏覽器，清除網站資料或換裝置不會同步。選擇某件第一順位並不代表整套最佳。");const out=node("div");const render=id=>{const s=bySpec.get(id),state=collected[id]||{};out.replaceChildren();let total=0,have=0;for(const [slot,items] of s.slots){const eligible=items.filter(x=>allowed(id,x));if(!eligible.length)continue;total+=1;if(eligible.some(x=>state[x.id]))have++;}const status=node("p","已收集至少一件候選： "+have+" / "+total+" 部位"+(storageOK?"":"（目前無法永久儲存）"),"gt-muted");const progress=node("progress");progress.max=total||1;progress.value=have;add(out,status,progress,button("清除此專精紀錄",()=>{if(confirm("確定清除此專精的收集紀錄？")){delete collected[id];save();render(id);}}));for(const [slot,items] of s.slots){if(!items.some(x=>allowed(id,x)))continue;const c=node("div",undefined,"gt-card");c.append(node("h4",slot));for(const x of items.filter(x=>allowed(id,x))){const chk=node("input");chk.type="checkbox";chk.checked=!!state[x.id];chk.addEventListener("change",()=>{collected[id]??={};collected[id][x.id]=chk.checked;save();render(id);});add(c,add(node("label",undefined,"gt-check"),chk,node("span","#"+x.rank+" "+x.name+(x.review?"（適用性待複核）":"")),node("small",x.source)));}out.append(c);}};const p=specPicker(render);add(panel,specLabel(),out);render(p.value);}
const official="https://news.blizzard.com/en-us/article/24315281/wow-forever-hotfixes-november-25-2026";
function raid(){title("V11 · 團本準備","2026/11/27：首批團本尚未開放。以下是官方已公布的規模及前置，尚未加入首領技能推測。");const r=[["地深獸穴（Barrow Deeps）","10人 · 8首領 · 60級 · 官方公告12/9（台灣日期依維護公告）"],["海加爾山之巔（Hyjal Summit）","20人 · 13首領 · 60級 · 官方公告12/9"],["奧妮克希亞巢穴","40人 · 60級 · 每位玩家準備龍火護符；聯盟／部落前置不同。"]];for(const [a,b] of r)box(panel,a,b);const c=box(panel,"開荒通用檢查","先完成滿等技能與裝備、按職責準備消耗品、抗性按官方機制決定、預先分配坦補與斷法。世界增益進團本會移除（11/23熱修正）。");add(c,link("官方團本概覽","https://news.blizzard.com/en-gb/article/24303009/world-of-warcraft-forever-raid-overviewlocations-raid-sizes-and-attunement"),node("p","首領打法等正式資料出現後再補齊。","gt-muted"),link("官方熱修正",official));}
const news=[["2026/11/25","平衡德天賦調整","憤怒與星火相關天賦重新整理，日月蝕增加憤怒爆擊，梟獸形態強化秘法與自然傷害。3點以上舊強化星火術可能被重置。"],["2026/11/25","獵人／術士寵物","修正寵物普通近戰攻擊爆擊率為0%的問題；野獸控制獵召喚的鷹亦有行為和爆擊修正。"],["2026/11/25","聖騎士／盜賊／薩滿","修正審判刷新及驅邪術爆擊；聖光誓約延長。毒藥與致盲粉暫時拾取綁定；薩滿閃電鏈的節能施法修正。"],["2026/11/23","團本世界增益與套裝","區域切換不再移除世界增益，但進團本仍移除；野性之心4件能量回復修正，數個武器過度觸發問題也已修正。"],["2026/11/17","聖坦魂鑄套裝","坦克版魂鑄套裝以法術能量取代力量。Whiteout Staff、Crackling Staff 的屬性統一為25耐、25智、74武器法傷。"]];
function hotfix(){title("V12 · 官方藍帖繁中摘要","截至 2026/11/27 查得的最新官方熱修正為 11/25。此區為手動更新摘要，不是即時爬蟲。");const q=inp("搜尋日期、職業或關鍵字"),out=node("div");function draw(){out.replaceChildren();for(const [d,t,b] of news.filter(x=>x.join(" ").includes(q.value.trim()))){const c=box(out,d+" · "+t,b);c.append(link("官方原文",official));}}q.addEventListener("input",draw);add(panel,field("搜尋",q),out,link("暴雪魔獸世界最新消息","https://news.blizzard.com/en-us/world-of-warcraft"));draw();}
function recipeMaterialTotals(entries){
 const totals=new Map(),unknown=[];
 for(const {recipe,count} of entries){
  if(!Number.isSafeInteger(count)||count<1)continue;
  for(const part of String(recipe.mat||"").split("、")){
   const t=part.trim();if(!t)continue;
   const m=t.match(/^([^×]+)\s*×\s*(\d+)$/);
   if(!m||!m[1].trim()||!Number.isSafeInteger(Number(m[2]))||Number(m[2])<1){unknown.push({name:recipe.name,text:t,count});continue;}
   const key=m[1].trim(),qty=Number(m[2])*count+(totals.get(key)||0);
   if(!Number.isSafeInteger(qty)){unknown.push({name:recipe.name,text:t,count});continue;}totals.set(key,qty);
  }
 }
 return {totals:[...totals.entries()].sort((a,b)=>a[0].localeCompare(b[0],"zh-Hant")),unknown};
}
function material(){
 title("V16.6 · 構築準備與配方材料","原V6配方索引；可依構築儲存個人準備清單及計算材料。候選配方不代表最佳附魔、消耗品或已驗證的永恆掉落。");
 let data;try{data=JSON.parse($("#v6-prep-data").textContent);}catch(e){panel.append(node("p","配方資料無法讀取"));return;}
 const rows=Object.entries(data.recipes||{}).filter(([,x])=>x&&typeof x==="object"),routes=data.routes||{},id=getSpec(),profile=id?buildFor(id):"",key=id?"gt-prep-v1:"+id+":"+profile:null;
 let chosen={};try{const v=key?JSON.parse(localStorage.getItem(key)||"{}"):{};if(v&&typeof v==="object"&&!Array.isArray(v))for(const [k] of rows)if(Number.isSafeInteger(v[k])&&v[k]>0&&v[k]<=999)chosen[k]=v[k];}catch(e){}
 const q=inp("例如：大塊魔光碎片、法術能量、夢葉草"),prof=select([...new Set(rows.map(([,x])=>x.prof).filter(Boolean))].sort().map(x=>[x,x]),"全部專業"),mode=select([["all","全部候選"],["chosen","僅顯示已選配方"]]),out=node("div"),summary=node("div"),msg=node("p","","gt-muted");
 function persist(){if(!key)return;try{localStorage.setItem(key,JSON.stringify(chosen));msg.textContent="已儲存於本瀏覽器："+profile;}catch(e){msg.textContent="本機儲存失敗，重新整理後可能遺失。";}}
 function drawSummary(){summary.replaceChildren();if(!key){summary.append(node("p","請先選擇職業及專精，才能使用獨立準備清單。","gt-muted"));return;}
  const selected=rows.filter(([k])=>chosen[k]>0).map(([k,recipe])=>({recipe,count:chosen[k]}));
  const {totals,unknown}=recipeMaterialTotals(selected);
  const c=box(summary,"本構築材料採買清單",selected.length+" 種配方；數量為配方製作次數，不一定等於成品數。");
  if(!selected.length){c.append(node("p","尚未加入配方。"));return;}
  for(const {recipe,count} of selected)add(c,node("p",recipe.name+" × "+count));
  const ul=node("ul");for(const [name,count] of totals)add(ul,node("li",name+" × "+count+" — "+(routes[name]||"來源未核對")));c.append(ul);
  if(unknown.length){const d=node("details");d.open=true;d.append(node("summary","未能自動合計的材料（"+unknown.length+"）"));for(const x of unknown)d.append(node("p",x.name+" × "+x.count+"： "+x.text));c.append(d);}
  add(c,node("p","合計只處理明確的「材料×整數」；未確認配方與材料來源保留待查，不推算成品產量。","gt-muted"));
  const exportArea=node("textarea");exportArea.rows=4;exportArea.style.width="100%";exportArea.readOnly=true;exportArea.value=[bySpec.get(id)?.name+" / "+profile,...totals.map(([n,v])=>n+" × "+v),...unknown.map(x=>"待核算："+x.name+" × "+x.count+" / "+x.text)].join("\n");const d=node("details");add(d,node("summary","複製材料清單"),exportArea,button("選取清單文字",()=>{exportArea.focus();exportArea.select();}));c.append(d);
 }
 function draw(){out.replaceChildren();const term=q.value.trim().toLowerCase(),list=rows.filter(([k,x])=>(mode.value!=="chosen"||chosen[k]>0)&&(!prof.value||x.prof===prof.value)&&(!term||[x.name,x.fx,x.mat,x.where].join(" ").toLowerCase().includes(term)));out.append(node("p",list.length+" 個配方候選","gt-muted"));
  for(const [k,x] of list){const c=box(out,x.name+" · "+x.prof,x.fx);add(c,node("small",x.state),node("p","配方取得："+x.where),node("p",x.mat));const ul=node("ul");for(const material of String(x.mat||"").split("、")){const name=material.split("×")[0].trim();if(name)add(ul,node("li",material+" — "+(routes[name]||"來源未核對")));}add(c,ul,link("永恆專業資料","https://wowamobi.com/professions"),node("p",x.why,"gt-muted"));
   if(key){const qty=inp("0","number");qty.min="0";qty.max="999";qty.step="1";qty.value=String(chosen[k]||0);qty.addEventListener("change",()=>{const n=Math.min(999,Math.max(0,Math.floor(Number(qty.value)||0)));if(n)chosen[k]=n;else delete chosen[k];qty.value=String(n);persist();drawSummary();if(mode.value==="chosen"&&!n)draw();});add(c,field("製作次數（0＝未選）",qty));}
  }
  if(q.value.trim()&&routes[q.value.trim()])box(out,"材料來源："+q.value.trim(),routes[q.value.trim()]);
 }
 q.addEventListener("input",draw);prof.addEventListener("change",draw);mode.addEventListener("change",draw);
 add(panel,specLabel(),summary,msg,field("配方／材料搜尋",q),field("專業",prof),field("檢視範圍",mode),out);drawSummary();draw();
}
function statScore(stats,weights,currentHit,hitTarget){let total=0;for(const [k,v] of Object.entries(stats)){let qty=v;if(k==="命中機率"&&hitTarget!==null)qty=Math.min(v,Math.max(0,hitTarget-currentHit));total+=qty*(weights[k]||0);}return total;}
function optimizer(){
 title("V16.6 · 天賦連動配裝試算","使用選定構築的武器資格及可匯入的模擬屬性權重。預設為舊版估算，不代表最新實測；不同構築、角色與目標不可混用權重。");
 const id=getSpec(),s=bySpec.get(id);if(!s)return;
 const out=node("div"),slot=select([...s.slots].map(([k])=>[k,k])),current=inp("0","number"),target=inp("留空＝不限制","number"),result=node("div");
 current.value="0";current.min="0";current.step="0.1";target.min="0";target.step="0.1";const talentHit=inp("0","number");talentHit.value="0";talentHit.min="0";talentHit.step="0.1";
 const research=talentResearch[Number(id.split("-")[1])-1];
 const profile=buildFor(id),storageKey="gt-sim-weights-v1:"+id+":"+profile;
 const hasLegacy=!variantFor(id)&&!!referenceTalent(id);const defaults=hasLegacy?{...s.weights}:Object.fromEntries(Object.keys(s.weights).map(k=>[k,0]));if(["physical","tank"].includes(roleFor(id)))for(const k of Object.keys(defaults))if(spellOnly.test(k)&&!(/^spec-[78]$/.test(id)&&/智力|intellect/i.test(k)))defaults[k]=0;
 const weights={...defaults},keys=[...new Set([...Object.keys(defaults),...[...s.slots.values()].flatMap(xs=>xs.flatMap(x=>Object.keys(x.stats))),"武器DPS","主手DPS","副手DPS","雙手DPS","遠程DPS"])];
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
 const saveBtn=button("儲存此專精與構築權重",()=>{if(!source.value.trim()){message.textContent="請填寫資料來源或計算假設。";return;}if(!Object.values(weights).some(v=>v>0)){message.textContent="至少需有一項非零權重，才可儲存配裝模型。";return;}try{localStorage.setItem(storageKey,JSON.stringify({weights,source:source.value.trim(),hitBySlot:{...(saved?.hitBySlot||{}),[slot.value]:{base:Math.max(0,Number(current.value)||0),cap:target.value===""?null:Math.max(0,Number(target.value)||0),talent:Math.max(0,Number(talentHit.value)||0)}}}));saved=savedModel(id);provenance=source.value.trim()+"（使用者提供，未驗證）";indicator.textContent=provenance;message.textContent="已儲存於本瀏覽器。";}catch(e){message.textContent="無法儲存。";}});
 const resetBtn=button(hasLegacy?"恢復舊版估算":"清除本構築權重",()=>{for(const k of keys)weights[k]=defaults[k]||0;provenance=hasLegacy?"舊版估算／未驗證":"此構築無權重，請匯入專屬模擬資料";source.value="";saved=null;current.value="0";target.value="";talentHit.value="0";try{localStorage.removeItem(storageKey);}catch(e){}refresh();});
 const exportBtn=button("輸出目前權重 JSON",()=>{raw.value=JSON.stringify(weights,null,2);raw.focus();raw.select();message.textContent="已填入目前權重，可複製分享；不包含天賦、命中設定及來源，請一併告知接收者。";});
 add(weightBox,grid,field("模擬來源與假設",source),field("JSON 權重（以本頁繁中屬性名稱為鍵）",raw),importBtn,exportBtn,saveBtn,resetBtn,message);
 function draw(){result.replaceChildren();if(!Object.values(weights).some(v=>v>0)){result.append(node("p","此構築尚無非零權重；不產生排名，請匯入專屬模擬資料。"));return;}const rows=(s.slots.get(slot.value)||[]).filter(x=>allowed(id,x));const base=Math.max(0,Number(current.value)||0),cap=target.value===""?null:Math.max(0,Number(target.value)||0);
 const sorted=rows.map(x=>{const m=modelScore(x,weights,{base,cap,talent:Math.max(0,Number(talentHit.value)||0)});return {...x,calc:m.total,parts:m.parts,missingDps:m.incomplete};}).sort((a,b)=>Number(!!a.review)-Number(!!b.review)||Number(a.missingDps)-Number(b.missingDps)||b.calc-a.calc);
 if(!sorted.length){result.append(node("p","本站沒有符合此構築的候選裝備，請查證外部資料。"));return;}
 for(const [i,x] of sorted.entries()){const c=box(result,(x.review?"待複核 · ":"比較 "+(i+1)+" · ")+x.name,"試算分："+x.calc.toFixed(2));add(c,node("p",x.source),node("p",x.review||"未觸發適用性警示；非已驗證","gt-muted"));if(x.missingDps)add(c,node("p","缺武器DPS，分數不完整","gt-muted"));const d=node("details");d.append(node("summary","查看各屬性分數貢獻"));for(const [k,v] of Object.entries(x.parts))if(v!==0)d.append(node("p",k+"："+v.toFixed(2)));add(c,d,link("物品來源",x.url));}}
 slot.addEventListener("change",()=>{const h=saved?.hitBySlot?.[slot.value];current.value=String(h?.base??0);target.value=h?.cap??"";talentHit.value=String(h?.talent??0);draw();});for(const el of [current,target,talentHit])el.addEventListener("input",draw);
 add(out,specLabel(),node("p",research?"權重研究："+research[2]:"尚無研究資料","gt-muted"),node("p","構築："+(rogueProfiles[id]?.find(x=>x[0]===profile)?.[1]||"既有專精／待建立完整構築")),indicator,field("比較部位",slot),field("其他部位命中 (%)；不含下方天賦命中",current),field("額外天賦命中 (%)；已包含於上方則填0",talentHit),...((referenceTalent(id)?.[1]?.Precision||0)>0?[button("套用參考配點的精準命中 +"+(referenceTalent(id)[1].Precision||0)+"%",()=>{talentHit.value=String(referenceTalent(id)[1].Precision||0);draw();})]:[]),field("命中目標 (%)",target),weightBox,node("p","各手位DPS權重可獨立輸入；只要有一項手位權重非零，就完全改用手位權重（其他手位0代表不計分）；全為0才沿用通用DPS。盾牌、法器、聖物不計武器DPS。未計套裝、觸發、整套互斥或完整技能循環。","gt-muted"),result,link("WoWSims Forever","https://wowsims.com/forever/"),node("p",""),link("VoidSim 屬性權重","https://voidsim.io/forever"));panel.append(out);draw();
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
 const id=spec.id,kind=feralWeaponMode(id)==="twohand"?"twohand":feralWeaponMode(id)==="onehand"?"general":variantFor(id)?.[4]||buildFor(id),rows=weaponSets([...spec.slots.values()].flat(),x=>allowed(id,x),kind);
 const out=node("div"),base=inp("0","number"),talent=inp("0","number"),cap=inp("留空＝不設上限","number");
 for(const e of [base,talent,cap]){e.min="0";e.step="0.1";}base.value="0";talent.value="0";
 let limit=10;
 const note=node("p","僅使用本站候選及已知武器資格；同ID不重複配戴，未驗證唯一裝備群組、武器速度觸發、套裝與其他特殊效果。非整套BiS。","gt-muted");
 function draw(){
  out.replaceChildren();if(!rows.length){out.append(node("p","尚無符合目前構築的完整武器組合。"));return;}
  if(!model){out.append(node("p","尚未儲存此構築的權重，不產生武器組合分數或新排名。以下依既有候選順序供查證。","gt-muted"));}
  const hit={base:Math.max(0,Number(base.value)||0),talent:Math.max(0,Number(talent.value)||0),cap:cap.value===""?null:Math.max(0,Number(cap.value)||0)};
  const list=rows.map(r=>({...r,review:r.items.some(x=>!!x.review),score:model?weaponSetScore(r.items,model.weights,hit):null}));
  if(model)list.sort((a,b)=>Number(a.review)-Number(b.review)||Number(a.score.incomplete)-Number(b.score.incomplete)||b.score.total-a.score.total);
  out.append(node("p","符合條件的武器組合："+list.length+" 組","gt-muted"));
  for(const [i,r] of list.slice(0,limit).entries()){
   const c=box(out,r.kind+(r.review?" · 適用性待複核":""),r.score?"試算分："+r.score.total.toFixed(2)+(r.score.incomplete?"（缺武器DPS）":"")+"；有效命中 "+r.score.usable+"/"+r.score.rawHit+"%":"候選組合 "+(i+1)+"（未排名）");
   for(const x of r.items)add(c,link(x.name,x.url),node("p",x.source,"gt-muted"),...(x.review?[node("p",x.review,"gt-muted")]:[]));
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
const catWeaponEvidence=[{"id":"18420","name":"碎骨者（Bonecrusher，中文名待核）","dps":53.8,"str":26,"crit":14,"source":"厄運之槌西區任務 The Treasure of the Shen'dralar","reason":"一般單體模擬首選；26力量帶來52攻強，14爆擊等級增加爆擊收益，對亡靈額外30攻強不計入通用模擬。固定任務獎勵，不必反覆刷掉落。","delta":0},{"id":"280018","name":"Hammer of Thundering Hooves（雷蹄戰錘，暫譯）","dps":53.9,"str":24,"crit":14,"sta":17,"source":"The Shaper's Terrace・Thunderhoof","reason":"武器DPS略高，但比碎骨者少2力量；17耐力提供生存。外站模擬單體落後1.4 DPS，實際差距很小。","delta":-1.4},{"id":"13393","name":"郵差戰錘（Malown's Slam，譯名待核）","dps":52.1,"source":"斯坦索姆・郵差 Malown","reason":"命中時可能增加53力量，持續20秒；觸發已納入外站模擬。雖然面板DPS略低，仍值得比較。","delta":-7},{"id":"250619","name":"Legionite Glaive（軍團戰戟，暫譯）","dps":53.9,"agi":16,"ap":54,"hit":10,"source":"鍛造300；拾取綁定及製作條件需核對","reason":"高武器DPS、敏捷、攻強及命中同時提供收益；Wowhead列替代BiS，單件加權網站亦偏好此物。未取得與上列相同模擬條件的數據，不強行排名。"},{"id":"19323","name":"無堅不摧之力（The Unstoppable Force）","dps":56.5,"str":18,"sta":17,"source":"奧特蘭克山谷聲望崇拜","reason":"Wowhead首選；較高武器DPS與爆擊，惟聲望及目前實際開放取得狀態需要確認。不與已知可取得副本候選混排。"}];
const bisReasons=["雙手武器傷害、怒氣及技能使用比例；命中與爆擊需配合武器專精。","雙持主副手分別計算，白字命中及武器觸發另計；套裝不能用單件分數代替。","盾牌護甲、格擋、生存與仇恨；不能只依武器DPS。","治療加成、有效治療、法力續航及爆擊；以戰鬥時間分情境。","盾牌與承傷、神聖仇恨、法力續航；法傷不能套用純物理坦克權重。","雙手武器、神聖傷害與物理傷害比例；混合構築另算。","遠程DPS、寵物傷害及命中；近戰欄以實際使用方式評估。","遠程DPS、攻強、命中及爆擊；帶寵物與獨行者分開。","純近戰與近遠穿插分開；遠程DPS、近戰武器傷害及智力轉換需按技能比例。","雙匕首技能資格優先；毒藥、能量、命中及雙持觸發分開。","主副手類型、攻速、能量與命中；背刺變體要求匕首。","背刺／伏擊要求主手匕首；出血玩法另比較武器傷害。","護盾吸收、有效治療、法力續航；不得直接套神聖牧師結果。","有效治療、法力與施法節奏；團隊與坦克治療分開。","暗影傷害、命中、法力與持續傷害比例；治療裝非通用輸出。","自然／火焰法傷、法術命中及爆擊；近戰DPS不直接等於法術收益。","近戰武器DPS、攻強、法術傷害與風怒觸發；雙持及雙手需分開。","治療加成、法力回復與多目標治療；圖騰與戰鬥時長影響選擇。","秘法傷害及法力消耗、爆擊、命中；不同法力策略需重算。","火焰法傷、命中與爆擊；持續效果及爆擊觸發依循環評估。","冰霜法傷、命中及爆擊；控制免疫與可凍結目標分情境。","暗影持續傷害、命中與法力；寵物及詛咒選擇影響權重。","寵物及本體傷害比例、法傷、命中；不能借用痛苦或毀滅排名。","火焰或暗影直傷、命中、爆擊；不同犧牲及寵物構築另計。","秘法／自然法術比例、命中與法力；11/25熱修後舊權重待重算。","形態武器DPS、力量、敏捷、爆擊、命中及武器觸發；慢速本身非優勢。","形態武器DPS、護甲、耐力、閃躲及仇恨；與貓德輸出排名不同。","持續治療、法力續航與實際有效治療；團隊及坦克場景分開。"];
function bisReasonView(spec){
 const d=node("section",undefined,"gt-card");add(d,node("h4","本專精配裝判斷依據"),node("p",bisReasons[Number(spec.id.split("-")[1])-1]),node("p","本段是裝備評估原則，不是已驗證的屬性權重。未模擬套裝、觸發與完整角色配置前，不將舊單件排名當作最終BiS。","gt-muted"));return d;
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
function audit(){
 title("V18.4 · BiS 裝備、武器與準備資料總覽","優先顯示未觸發適用性警示的既有候選；仍保留待複核裝備。來源及證據文字完整，不等於已經外部交叉驗證或整套最佳。");
 const spec=bySpec.get(getSpec());if(!spec)return;
 const q=inp("搜尋裝備、部位、來源或物品 ID（可用空格分隔）"),mode=select([["all","全部部位"],["missing","僅顯示缺資料候選"]]),out=node("div");
 const model=savedModel(spec.id);
 const slots=[...spec.slots].map(([name,items])=>({name,items:items.filter(x=>allowed(spec.id,x)).map(x=>model?{...x,model:modelScore(x,model.weights,model.hitBySlot?.[name])}:x).sort((a,b)=>Number(!!a.review)-Number(!!b.review)||(model?(Number(a.model.incomplete)-Number(b.model.incomplete)||b.model.total-a.model.total):0)||(a.rank||999)-(b.rank||999))}));
 const excluded=[...spec.slots.values()].flat().filter(x=>!allowed(spec.id,x));
 if(feralWeaponMode(spec.id)==="twohand"){for(let i=slots.length-1;i>=0;i--){if(/副手|盾牌|單手|主手/.test(slots[i].name)&&!slots[i].items.length)slots.splice(i,1);}}
 const all=slots.flatMap(x=>x.items),sourceMissing=x=>!x.source||/待查|待核|未知|未確認/.test(x.source),evidenceMissing=x=>!x.evidence,missing=x=>sourceMissing(x)||evidenceMissing(x)||!!x.review||!!x.model?.incomplete;
 const populated=slots.filter(x=>x.items.length),firsts=slots.map(x=>x.items.find(i=>!i.review&&!i.model?.incomplete)).filter(Boolean);
 const metrics=node("div",undefined,"gt-bis-summary");
 for(const [v,label] of [[populated.length+"/"+slots.length,"已有候選部位"],[firsts.filter(x=>!missing(x)).length+"/"+slots.length,"優先候選有來源及證據文字"],[all.length,"候選裝備筆數"],[all.filter(evidenceMissing).length,"缺證據文字"],[all.filter(sourceMissing).length,"來源待查"],[all.filter(missing).length,"需補資料候選"]]){const c=node("div",undefined,"gt-bis-metric");add(c,node("strong",String(v)),node("small",label));metrics.append(c);}
 const progress=node("div",undefined,"gt-bis-progress"),bar=node("span");bar.style.width=(slots.length?100*firsts.filter(x=>!missing(x)).length/slots.length:0)+"%";progress.append(bar);progress.setAttribute("role","progressbar");progress.setAttribute("aria-label","優先候選來源及證據文字完整度");progress.setAttribute("aria-valuenow",String(Math.round(slots.length?100*firsts.filter(x=>!missing(x)).length/slots.length:0)));
 function status(x){if(x.model?.incomplete)return node("span","計分資料不足","gt-bis-status gt-bis-review");if(x.review)return node("span","適用性待複核","gt-bis-status gt-bis-review");return node("span",sourceMissing(x)?"來源待查":evidenceMissing(x)?"待補證據":"有來源與證據文字 · 待複核","gt-bis-status "+(sourceMissing(x)?"gt-bis-missing":evidenceMissing(x)?"gt-bis-review":"gt-bis-present"));}
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
  const c=node("div",undefined,"gt-bis-alt"),name=link((x.rank?"#"+x.rank+" ":"")+x.name,x.url);name.className="gt-bis-name";
  const source=node("div",undefined,"gt-bis-source");add(source,node("small","取得來源"),node("strong",x.source));
  add(c,name,status(x),source);const ref=communityMatch(spec.id,buildFor(spec.id),x);if(ref)add(c,node("p","外部同ID／手位推薦："+(ref.known?"來源有記錄":"取得待查")+"（11/25；非本站已驗證BiS）","gt-muted"));if(x.model)add(c,node("p","本機權重試算："+x.model.total.toFixed(2)+(x.model.incomplete?"（缺武器DPS）":""),"gt-muted"));if(x.review)add(c,node("p",x.review,"gt-stat-warning"));
  const stats=node("div",undefined,"gt-stat-wrap");
  const weapon=Object.entries(x.wm||{}).filter(([k,v])=>k&&v!==""),normal=Object.entries(x.stats||{}).filter(([k])=>k);
  const order=k=>/每秒傷害|DPS/i.test(k)?0:/速度|speed/i.test(k)?1:/傷害範圍|damage/i.test(k)?2:3;
  weapon.sort((a,b)=>order(a[0])-order(b[0]));
  for(const group of [statGroup("武器數值",weapon,true),statGroup("一般屬性",normal)])if(group)stats.append(group);
  if(stats.childElementCount)c.append(stats);return c;
 }
 function evidenceView(x){const d=node("details");add(d,node("summary","來源證據與備註"),node("p",x.evidence||"未提供證據文字","gt-muted"));if(x.note)add(d,node("p",x.note,"gt-muted"));return d;}
 function draw(){out.replaceChildren();const term=q.value.trim().toLowerCase(),terms=term.split(/\s+/).filter(Boolean),grid=node("div",undefined,"gt-bis-grid");let count=0;
 for(const slot of slots){const first=slot.items.find(x=>!x.review&&!x.model?.incomplete)||slot.items[0];const matches=slot.items.filter(x=>(mode.value!=="missing"||missing(x))&&terms.every(t=>[slot.name,x.name,x.source,x.id,x.type].join(" ").toLowerCase().includes(t)));if(!matches.length&&(slot.items.length||term))continue;count++;
 const c=node("article",undefined,"gt-bis-slot");c.append(node("h4",slot.name));if(!first){c.append(node("span","尚無候選","gt-bis-status gt-bis-missing"));grid.append(c);continue;}
 const featured=matches.includes(first)?first:matches[0];c.append(node("small",featured.review?"適用性待複核 · 原順位 "+featured.rank:model?"依本機權重比較 · 原順位 "+featured.rank:(featured.rank?"舊版候選 #"+featured.rank+" · 非構築BiS":"候選順位未標示"),"gt-muted"));add(c,itemView(featured),evidenceView(featured));const alternatives=matches.filter(x=>x!==featured);if(alternatives.length){const d=node("details");d.append(node("summary","展開其他候選（"+alternatives.length+"）"));for(const x of alternatives)add(d,itemView(x),evidenceView(x));c.append(d);}grid.append(c);}
 add(out,node("p","顯示 "+count+" / "+slots.length+" 個已列部位","gt-muted"),grid);if(!count)out.append(node("p","沒有符合條件的候選。"));}
 const excludedDetails=node("details");excludedDetails.append(node("summary","檢視構築排除清單（"+excluded.length+"）"));for(const x of excluded)add(excludedDetails,node("p",x.slot+" · "+x.name+" — "+skillGate(spec.id,x),"gt-muted"),link("原物品資料",x.url));q.addEventListener("input",draw);mode.addEventListener("change",draw);add(panel,specLabel(),node("p",model?"排序使用本機儲存權重："+(model.source||"使用者提供")+"；依各部位已儲存命中門檻試算，未驗證、不含整套與套裝效果。":"目前未儲存模擬權重，顯示既有候選供查證；非此構築的最佳排名。","gt-muted"),node("p","構築排除 "+excluded.length+" 筆不符核心技能或武器類型未確認的候選。","gt-muted"),bisReasonView(spec),excludedDetails,...(spec.id==="spec-26"&&feralWeaponMode(spec.id)==="twohand"?[catWeaponResearch(spec)]:[]),communityEvidenceView(spec,slots),metrics,progress,node("p","完整度僅統計本站已列部位及文字資料；不表示裝備已驗證。","gt-muted"),...(model&&feralWeaponMode(spec.id)!=="twohand"?[weaponSetView(spec,model)]:[]),field("篩選",mode),field("搜尋",q),out);draw();attachLegacy(spec);
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
function talentHub(){
 title("天賦流派與野外練等","使用首頁的職業、專精與玩法選單，直接查看天賦及練等。");
 if(!getSpec()){panel.append(node("p","請先在上方選擇職業及專精。"));return;}
 const frame=node("iframe");frame.title="天賦流派與野外練等";frame.style.cssText="display:block;width:100%;height:950px;border:0;border-radius:8px;background:#0e131c";
 fitEmbedded(frame);
 frame.src=talentPageURL(true)+"&v=18.4";
 add(panel,frame);
}
const renderers={audit,v8:talentHub,v9:drops,v10:checklist,v11:raid,v12:hotfix,v13:material,v14:optimizer};
function show(key){if(siteMode==="blue")return;cleanupFrame();restoreLegacy();active=key;for(const b of $$("button",nav)){b.setAttribute("aria-pressed",String(b.dataset.tab===key));}try{if(["v9","v10","v14","audit"].includes(key)&&!getSpec()){panel.replaceChildren(node("p","請先在上方選擇職業與專精，即可查看對應資料。","gt-muted"));return;}renderers[key]();}catch(e){panel.replaceChildren(node("p","此工具載入失敗，原有職業裝備區仍可使用。"));console.error(e);}}
const dashboardMeta={v8:["⚔️","天賦樹、玩法與練等"],v9:["🔎","首領與裝備來源"],v10:["📋","個人裝備清單"],v11:["🛡️","開荒前置準備"],v12:["📜","繁中藍帖專頁"],v13:["🧪","附魔與消耗品"],v14:["⚖️","比較候選裝備"],audit:["✅","檢查來源與證據"]};
for(const [key,label] of tabs){const b=button(label,()=>{if(key==="v12")location.assign("blue-posts.html");else show(key);});b.dataset.tab=key;const [symbol,desc]=dashboardMeta[key];const pict=node("span",symbol,"gt-icon");pict.setAttribute("aria-hidden","true");b.replaceChildren(pict,node("span",label),node("span",desc,"gt-desc"));nav.append(b);}
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

let lastSpecKey=null;const syncSpec=()=>{if(siteMode==="blue")return;const id=getSpec(),key=id+":"+(id?buildFor(id):"");if(key===lastSpecKey)return;lastSpecKey=key;syncBuild();if(!active&&getSpec()){show("audit");return;}if(["v8","v9","v10","v13","v14","audit"].includes(active))show(active);};
mainSpec?.addEventListener("change",()=>queueMicrotask(syncSpec));$("#class-select")?.addEventListener("change",()=>queueMicrotask(syncSpec));for(const id of bySpec.keys())syncWeaponCards(id);syncBuild();if(specEls.length&&bySpec.size){enableLegacyConsolidation();}if(getSpec()&&!active)show("audit");
const selectorGroup=mainSpec?.closest(".gt-unified")||mainSpec?.parentElement?.parentElement;
selectorGroup?.addEventListener("change",e=>{if(e.target!==mainSpec&&e.target.tagName==="SELECT"&&!root.contains(e.target))queueMicrotask(syncSpec);});
const modeBar=node("div",undefined,"gt-site-mode"),classMode=button("職業資料",()=>switchMode("class")),blueMode=button("官方藍帖",()=>switchMode("blue"));classMode.id="gt-mode-class";blueMode.id="gt-mode-blue";
modeBar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px";
for(const b of [classMode,blueMode])b.style.cssText="padding:10px 18px;border:1px solid #52647b;border-radius:8px;background:#172230;color:#e9c88c;font-weight:700";
add(modeBar,classMode,blueMode);
if(pickerArea)pickerArea.before(modeBar);else root.prepend(modeBar);
const fallbackControls=[];
if(!pickerArea&&mainSpec){let p=mainSpec.parentElement;while(p&&p!==root&&!p.contains(root)&&p.querySelectorAll("select").length<2)p=p.parentElement;if(p&&p!==root&&!p.contains(root))fallbackControls.push(p);else for(const e of [$("#class-select"),mainSpec])if(e)fallbackControls.push(e.closest("label")||e);}
function setModeHidden(e,hidden){if(!e)return;if(hidden){if(!e.hasAttribute("data-gt-mode-hidden")){e.dataset.gtModeHidden=e.style.getPropertyValue("display");e.dataset.gtModePriority=e.style.getPropertyPriority("display");}e.style.setProperty("display","none","important");}else if(e.hasAttribute("data-gt-mode-hidden")){const v=e.dataset.gtModeHidden,p=e.dataset.gtModePriority;if(v)e.style.setProperty("display",v,p);else e.style.removeProperty("display");delete e.dataset.gtModeHidden;delete e.dataset.gtModePriority;}}
const bluePosts=[{"key":"203","date":"2026-11-25","title":"線上修正－11月25日","author":"Kaivax","translated":"https://exwind.net/zhTW/post/blue/203/","url":"https://us.forums.blizzard.com/en/wow/t/wow-forever-hotfixes-november-25-2026/2403040/1","sections":[{"category":"職業","title":"德魯伊、獵人及術士修正","body":"颶風最後一次傷害正常結算；修正獵人與術士寵物普通近戰爆擊率異常。平衡德魯伊天賦調整請參閱完整官方原文。"},{"category":"團本與物品","title":"地城與裝備修正","body":"哈卡的化身生成問題已修復，黑劍 Blackblade of Shahram 的加速增益只給武器持有人；律法聖契現可影響命令審判。"},{"category":"專業與附魔","title":"揭露附魔觸發修正","body":"範圍法術改成每波判定一次，而非每個目標分別觸發；引導法術不再全程受到該附魔影響。"}]},{"key":"194","date":"2026-11-23","title":"線上修正－11月23日","author":"Kaivax","translated":"https://exwind.net/zhTW/post/blue/194/","url":"https://news.blizzard.com/en-us/article/24315281/wow-forever-hotfixes-november-23-2026","sections":[{"category":"團本與物品","title":"世界增益與武器觸發","body":"切換區域不再移除世界增益，進入團本仍會移除。修正部分技能造成過多武器觸發的問題。"},{"category":"專業與附魔","title":"烹飪、工程與製皮修正","body":"數種蚌肉料理的進食效果及分類已校正；工程學迫擊砲重載配方與部分製皮圖樣的學習問題修復。"},{"category":"職業","title":"野性德魯伊套裝與其他職業修正","body":"Feralheart 四件套裝修正為5秒內每秒恢復4點能量；另有暗影牧師、毀滅術士及致死打擊天賦修正。"}]},{"key":"192","date":"2026-11-20","title":"線上修正－11月20日","author":"Kaivax","translated":"https://exwind.net/zhTW/post/blue/192/","url":"https://us.forums.blizzard.com/en/wow/t/wow-forever-hotfixes-november-25-2026/2403040/1","sections":[{"category":"職業","title":"戰鬥盜賊及惡魔術士","body":"戰鬥盜賊的戳刺可透過劍刃亂舞攻擊另一目標；取消惡魔庇護天賦後不再保留效果。每小時同一地城最多重置進入5次；雷暴三件套回能改為3%機率恢復18點。"}]},{"key":"190","date":"2026-11-19","title":"線上修正－11月19日","author":"Kaivax","translated":"https://exwind.net/zhTW/post/blue/190/","url":"https://news.blizzard.com/en-us/article/24315281/wow-forever-hotfixes-november-19-2026","sections":[{"category":"職業","title":"懲戒騎士雙手武器專精","body":"裝備雙手武器時，雙手武器專精正確強化所有神聖傷害。"}]},{"key":"179","date":"2026-11-13","title":"線上修正－11月13日","author":"Kaivax","translated":"https://exwind.net/zhTW/post/blue/179/","url":"https://us.forums.blizzard.com/en/wow/t/wow-forever-hotfixes-november-25-2026/2403040/1","sections":[{"category":"職業","title":"命令審判及風怒圖騰","body":"命令審判計為近戰攻擊，其他審判仍為遠程攻擊。風怒圖騰的近戰技能觸發規則修正，副手打擊不觸發。"},{"category":"職業","title":"恢復德魯伊、法師及聖騎士熱修","body":"野性痊癒不再允許移動施法，治療係數調高至6.6%；冰霜新星的傷害解除規則修正；命令審判按近戰攻擊處理。"}]},{"key":"local-5","date":"2026-11-13","title":"技能訓練費用退款","author":"Kaivax","translated":null,"url":null,"sections":[{"category":"客服與系統","title":"技能訓練費用退款","body":"受11月9日伺服器異常影響而遺失已購技能的玩家，可檢查遊戲信箱是否收到退款。"}]},{"key":"local-7","date":"2026-11-10","title":"拍賣場最低寄售金額調整","author":"Kaivax","translated":null,"url":null,"sections":[{"category":"客服與系統","title":"拍賣場最低寄售金額調整","body":"最低寄售金額下調至1銅幣，另修正部分郵件寄件人及送達時間異常。"}]},{"key":"local-8","date":"2026-11-08","title":"地城擊殺經驗值提高","author":"Kaivax","translated":null,"url":null,"sections":[{"category":"練等","title":"地城擊殺經驗值提高","body":"地城擊殺經驗值較先前提高50%。"}]},{"key":"199","date":"2026-11-25","title":"平衡德魯伊調整－11月25日","author":"Kaivax","translated":"https://exwind.net/zhTW/post/blue/199/","url":null,"sections":[{"category":"職業","title":"平衡德魯伊天賦重整","body":"強化星火術上限降至2點，月怒改為夢境；梟獸形態增加10%秘法與自然傷害。舊版配點須重新核對，尤其曾投入3點以上強化星火術的角色。"}]},{"key":"202","date":"2026-11-25","title":"奧特蘭克山谷調整－11月25日","author":"Kaivax","translated":"https://exwind.net/zhTW/post/blue/202/","url":null,"sections":[{"category":"戰場","title":"奧特蘭克山谷目標與聲望調整","body":"長時間對戰的額外聲望門檻改為20分鐘；擊敗中尉、佔領墓地及礦坑的聲望獎勵提高。"}]}];
function renderBlueBoard(host){
 const board=node("section",undefined,"gt-blue-board");board.dataset.release="18.4";board.id="gt-blue-board";
 const sourceURL="https://exwind.net/zhTW/blue/forever/";
 add(board,node("h3","永恆官方藍帖"),node("p","V18.4 · 首頁直接閱讀 · 不使用外部嵌入框","gt-muted"),node("p","繁體中文選錄摘要，最近核對 2026/11/27；非即時同步。每則公告可獨立展開或收合。","gt-muted"));
 const src=node("div",undefined,"gt-blue-source");add(src,link("EXWIND 永恆服最新藍帖",sourceURL),link("暴雪官方繁中熱修全文","https://worldofwarcraft.blizzard.com/zh-tw/news/24315281"));board.append(src);
 const filter=node("div",undefined,"gt-blue-filters"),q=inp("職業、技能、日期"),category=select([["","全部"],...Array.from(new Set(bluePosts.flatMap(p=>p.sections.map(x=>x.category)))).map(x=>[x,x])]),count=node("p",undefined,"gt-muted"),out=node("div");q.id="blue-query";category.id="blue-category";count.setAttribute("role","status");out.id="blue-list";
 add(filter,field("搜尋公告",q),field("分類",category));add(board,filter,count,out);
 const expanded=new Set();
 function draw(){
  for(const d of out.querySelectorAll("details")){if(d.open)expanded.add(d.dataset.postKey);else expanded.delete(d.dataset.postKey);}
  out.replaceChildren();
  const terms=q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list=bluePosts.slice().sort((a,b)=>b.date.localeCompare(a.date)).filter(p=>(!category.value||p.sections.some(x=>x.category===category.value))&&terms.every(t=>[p.title,p.author,p.date,...p.sections.flatMap(x=>[x.category,x.title,x.body])].join(" ").toLowerCase().includes(t)));
  count.textContent="顯示 "+list.length+" 篇公告";
  for(const p of list){
   const article=node("article"),d=node("details"),head=node("summary"),meta=node("div"),body=node("div",undefined,"gt-blue-body");d.dataset.postKey=p.key;
   add(meta,node("div",p.title,"gt-blue-title"),node("div","永恆服 · "+p.date+" · "+[...new Set(p.sections.map(x=>x.category))].join("／")+(p.author?" · "+p.author:""),"gt-blue-meta"));head.append(meta);
   body.append(node("p","公會繁中摘要（非官方全文）","gt-muted"));
   for(const section of p.sections)add(body,node("h4",section.title),node("p",section.body));
   const links=node("div",undefined,"gt-blue-source");links.append(link(p.translated?"閱讀 EXWIND 繁中全文":"EXWIND 永恆藍帖列表",p.translated||sourceURL));if(p.url)links.append(link("閱讀官方原文",p.url));body.append(links);
   add(d,head,body);d.open=expanded.has(p.key);d.addEventListener("toggle",()=>{if(!d.isConnected)return;if(d.open)expanded.add(p.key);else expanded.delete(p.key);});article.append(d);out.append(article);
  }
  if(!list.length)out.append(node("p","沒有符合搜尋的公告。","gt-muted"));
 }
 q.addEventListener("input",draw);category.addEventListener("change",draw);host.append(board);draw();
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