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
const ZH={"Improved Heroic Strike":"強化英勇打擊","Improved Rend":"強化撕裂","Improved Tactical Mastery":"強化戰術專精","Improved Overpower":"強化壓制","Anger Management":"憤怒掌控","Deep Wounds":"重傷","Spearing Strike":"穿刺打擊","Two-Handed Weapon Specialization":"雙手武器專精","Impale":"刺穿","Bloodthrill":"嗜血狂熱","Sweeping Strikes":"橫掃攻擊","Weaponmaster":"武器大師","Improved Slam":"強化猛擊","Mortal Strike":"致死打擊","Cruelty":"殘忍","Lingering Rage":"怒氣延續","Enrage":"狂怒","Improved Execute":"強化斬殺","Improved Bloodrage":"強化血性狂暴","Unbridled Wrath":"怒不可遏","Furious Precision":"狂怒精準","Dual Wield Specialization":"雙武器專精","Reckless Swings":"魯莽揮擊","Improved Berserker Rage":"強化狂暴之怒","Death Wish":"死亡之願","Improved Whirlwind":"強化旋風斬","Flurry":"亂舞","Bloodthirst":"嗜血","Deflection":"偏斜","Shield Specialization":"盾牌專精","Anticipation":"預知","Improved Revenge":"強化復仇","Last Stand":"破釜沉舟","Master of Defense":"防禦大師","Defiance":"挑釁","Vanguard":"先鋒","Improved Shield Wall":"強化盾牆","Concussion Blow":"震盪猛擊","Focused Rage":"專注怒氣","Bastion":"堡壘","Shield Slam":"盾牌猛擊","Improved Thunder Clap":"強化雷霆一擊","Spiritual Focus":"精神集中","Healing Light":"治療之光","Reverence":"敬畏","Purifying Power":"淨化之力","Divine Favor":"神恩術","Illumination":"啟發","Divine Precision":"神聖精準","Infusion of Light":"聖光灌注","Oath of Light":"聖光誓約","Holy Shock":"神聖震擊","Boundless Light":"無盡聖光","Holy Power":"神聖力量","Light's Vigil":"聖光守望","Divine Intellect":"神聖智力","Guardian's Favor":"守護者的寵愛","Benediction":"祈福","Improved Judgement":"強化審判","Conviction":"定罪","Pursuit of Justice":"正義追擊","Redoubt":"盾牌壁壘","Precision":"精準","Sacred Duty":"神聖使命","Templar's Bulwark":"聖殿騎士壁壘","Toughness":"堅韌","Swift Judgement":"迅捷審判","Improved Righteous Fury":"強化正義之怒","Holy Shield":"神聖之盾","Reckoning":"清算","Iron Creed":"鋼鐵信條","Shieldsworn":"盾誓","Sanctified Judgement":"聖化審判","Sacred Arbiter":"神聖仲裁者","Vindication":"辯護","Divine Strength":"神聖之力","Improved Seals":"強化聖印","Holy Conduit":"神聖導引","Unyielding Faith":"不屈信念","Seal of Command":"命令聖印","Repentance":"懺悔","Vengeance":"復仇","Champion of the Light":"聖光勇士","Unsealed Wrath":"解封之怒","Deadly Aspects":"致命守護","Endurance Training":"耐力訓練","Focused Fire":"專注火力","Bestial Swiftness":"野獸迅捷","Unleashed Fury":"狂怒釋放","Ferocity":"兇暴","Summon Hawk":"召喚獵鷹","Intimidation":"脅迫","Bestial Discipline":"野獸戒律","Frenzy":"狂亂","Bestial Wrath":"狂野怒火","Lethal Attacks":"致命攻擊","Improved Stings":"強化釘刺","Careful Aim":"精確瞄準","Rapid Killing":"迅速殺戮","Trueshot Aura":"強擊光環","Mortal Shots":"致死射擊","Efficiency":"效率","Improved Arcane Shot":"強化秘法射擊","Lone Wolf":"獨行者","Rapid Recuperation":"迅速恢復","Barrage":"彈幕","Ranged Weapon Specialization":"遠程武器專精","Sniper Shot":"狙擊射擊","Improved Tracking":"強化追蹤","Savage Strikes":"野蠻打擊","Survivalist":"生存專家","Clever Traps":"靈巧陷阱","Surefooted":"穩固步伐","Predator's Edge":"掠食者之鋒","Resourcefulness":"足智多謀","Expose Prey":"揭露獵物","Strider Kick":"迅步踢擊","Lightning Reflexes":"閃電反射","Lacerating Strikes":"撕裂打擊","Malice":"惡意","Ruthlessness":"無情","Improved Slice and Dice":"強化切割","Vigor":"精力","Blood Splatter":"血濺","Lethality":"致命偷襲","Vile Poisons":"惡性毒藥","Cold Blood":"冷血","Improved Poisons":"強化毒藥","Relentless Strikes":"無情打擊","Venom":"劇毒","Seal Fate":"封印命運","Mutilate":"截肢","Coup de Grace":"致命一擊","Efficient Strikes":"高效打擊","Puncturing Wounds":"穿刺傷口","Endurance":"耐久","Composure":"沉著","Flawless Execution":"完美處決","Aggression":"侵略","Opportunity":"伺機而動","Improved Expose Armor":"強化破甲","Improved Sprint":"強化疾跑","Weapon Expertise":"武器專家","Blade Flurry":"劍刃亂舞","Hack and Slash":"砍劈","Flash of Steel":"鋼刃閃光","Adrenaline Rush":"能量刺激","Setup":"先發制人","Dirty Deeds":"卑鄙伎倆","Camouflage":"偽裝","Initiative":"主動","Premeditation":"預謀","Serrated Blades":"鋸齒利刃","Elusiveness":"飄忽不定","Ghostly Strike":"鬼魅攻擊","Preparation":"準備","Hemorrhage":"出血","Boot Knife":"靴中匕首","Death Mark":"死亡標記","Master of Deception":"欺詐高手","Twin Disciplines":"雙重戒律","Mental Strength":"心靈之力","Mental Agility":"心靈敏銳","Inner Focus":"心靈專注","Improved Power Word: Shield":"強化真言術：盾","Meditation":"冥想","Soul Warding":"靈魂守護","Penance":"懺悟","Renewed Hope":"新生希望","Divine Aegis":"神聖庇護","Power Infusion":"注入能量","Twilight Focus":"暮光專注","Holy Specialization":"神聖專精","Divine Fury":"神聖之怒","Inspiration":"靈感","Improved Healing":"強化治療術","Holy Binding":"神聖連結","Improved Renew":"強化恢復","Holy Nova":"神聖新星","Litany of Light":"聖光禱文","Spirit of Redemption":"救贖之魂","Spiritual Guidance":"精神導引","Spiritual Healing":"精神治療","Prayer of Mending":"癒合禱言","Silent Resolve":"無聲消退","Shadow Focus":"暗影專注","Improved Mind Blast":"強化心靈震爆","Improved Shadow Word: Pain":"強化暗言術：痛","Shadow Reach":"暗影延伸","Mind Flay":"精神鞭笞","Improved Mind Flay":"強化精神鞭笞","Dark Inspiration":"黑暗靈感","Vampiric Embrace":"吸血鬼的擁抱","Shadow Weaving":"暗影交織","Silence":"沉默","Devouring Contagion":"吞噬傳染","Darkness":"黑暗","Shadowform":"暗影形態","Convection":"傳導","Concussion":"震盪","Elemental Alacrity":"元素迅捷","Call of Flame":"烈焰召喚","Elemental Focus":"元素集中","Trial by Fire":"烈火試煉","Eye of the Storm":"風暴之眼","Earthbound":"大地束縛","Elemental Reach":"元素延伸","Call of Thunder":"雷霆召喚","Lightning Overload":"閃電超載","Elemental Fury":"元素之怒","Lightning Mastery":"閃電專精","Thundering Strikes":"雷鳴猛擊","Tidal Focus":"潮汐集中","Mindfulness":"專念","Natural Grace":"自然恩典","Water Shield":"水之盾","Ancestral Knowledge":"先祖知識","Totemic Focus":"圖騰集中","Elemental Devastation":"元素浩劫","Mental Dexterity":"心智敏銳","Elemental Weapons":"元素武器","Shamanistic Focus":"薩滿專注","Stormstrike":"風暴打擊","Improved Ghost Wolf":"強化幽魂之狼","Spirit Weapons":"靈魂武器","Mental Quickness":"心智迅捷","Improved Stormstrike":"強化風暴打擊","Maelstrom Weapon":"氣漩武器","Rage of the Farseer":"先知之怒","Improved Healing Wave":"強化治療波","Ancestral Healing":"先祖治療","Healing Focus":"治療專注","Tidal Mastery":"潮汐專精","Restorative Totems":"恢復圖騰","Mana Tide Totem":"法力之潮圖騰","Healing Way":"治療之道","Nature's Swiftness":"自然迅捷","Purification":"淨化","Riptide":"激流","Guardian Totems":"守護圖騰","Improved Channeling":"強化引導","Arcane Subtlety":"秘法精妙","Arcane Concentration":"秘法專注","Missile Barrage":"飛彈彈幕","Arcane Impact":"秘法衝擊","Arcane Blast":"秘法衝擊術","Arcane Meditation":"秘法冥想","Arcane Wrath":"秘法之怒","Presence of Mind":"氣定神閒","Arcane Mind":"秘法心智","Arcane Instability":"秘法不穩定","Arcane Power":"秘法強化","Incineration":"燒盡","Accelerant":"助燃","Ignite":"點燃","Pyroblast":"炎爆術","Improved Fire Blast":"強化火焰衝擊","Heating Up":"升溫","Wand Specialization":"魔杖專精","Arcane Geometry":"秘法幾何","Improved Counterspell":"強化法術反制","Improved Scorch":"強化灼燒","Master of Elements":"元素大師","Critical Mass":"臨界質量","Fire Power":"火焰強化","Combustion":"燃燒","Burning Soul":"燃燒之魂","Arcane Resilience":"秘法韌性","Magic Absorption":"魔法吸收","Improved Frostbolt":"強化寒冰箭","Ice Shards":"寒冰碎片","Improved Blizzard":"強化暴風雪","Ice Lance":"冰霜長矛","Arctic Reach":"極寒延伸","Ice Block":"寒冰屏障","Shatter":"碎冰","Improved Cone of Cold":"強化冰錐術","Cold Snap":"急速冷卻","Fingers of Frost":"冰霜之指","Winter's Chill":"深冬之寒","Ice Barrier":"寒冰護體","Suppression":"鎮壓","Improved Corruption":"強化腐蝕術","Improved Drains":"強化吸取","Improved Bane of Agony":"強化痛苦災禍","Pandemic":"瘟疫","Malevolence":"惡毒","Nightfall":"夜幕","Siphon Life":"生命虹吸","Soul Siphon":"靈魂虹吸","Shadow Mastery":"暗影專精","Wrack":"折磨","Demonic Embrace":"惡魔之擁","Demonic Aegis":"惡魔庇護","Fel Vitality":"魔化活力","Demonic Sacrifice":"惡魔犧牲","Improved Shadow Bolt":"強化暗影箭","Improved Life Tap":"強化生命分流","Amplify Curse":"詛咒增幅","Bane":"災禍","Cataclysm":"災變","Ruin":"毀滅","Shadowburn":"暗影灼燒","Agonizing Flames":"苦痛烈焰","Improved Imp":"強化小鬼","Unholy Power":"邪惡力量","Demonic Energies":"惡魔能量","Master Summoner":"召喚大師","Decimation":"屠戮","Demonic Brand":"惡魔烙印","Soul Link":"靈魂鏈結","Demonic Knowledge":"惡魔知識","Master Demonologist":"惡魔學識大師","Demonic Pact":"惡魔契約","Aftermath":"餘波","Improved Sayaad":"強化薩亞德","Destructive Reach":"毀滅延伸","Conflagrate":"焚燒","Bane of Havoc":"浩劫災禍","Fire and Brimstone":"硫磺烈火","Shadow and Flame":"暗影與烈焰","Incinerate":"燒盡","Genesis":"創生","Nature's Majesty":"自然威嚴","Nature's Reach":"自然延伸","Furor":"激怒","Feral Swiftness":"野性迅捷","Shredding Attacks":"撕碎攻擊","Savage Fury":"野蠻暴怒","Feral Charge":"野性衝鋒","Sharpened Claws":"鋒利獸爪","Predatory Strikes":"猛獸攻擊","Predatory Discipline":"掠食者戒律","Blood Frenzy":"血之狂暴","Leader of the Pack":"獸群領袖","Natural Instinct":"自然本能","Rend and Tear":"撕扯","Shifting Power":"變形之力","Heart of the Wild":"野性之心","Naturalist":"自然主義","Feral Instinct":"野性本能","Thick Hide":"厚皮","Lacerate":"割傷","Primal Bite":"原始撕咬","Moonglow":"月光","Nature's Splendor":"自然之輝","Nature's Focus":"自然專注","Reflection":"反射","Gift of Nature":"自然賜福","Bloom":"綻放","Improved Rejuvenation":"強化回春術","Swiftmend":"迅癒","Living Spirit":"生命之魂","Improved Tranquility":"強化寧靜","Improved Regrowth":"強化癒合","Wild Growth":"野性痊癒","Subtlety":"微妙","Improved Charge":"強化衝鋒","Blood Craze":"血之狂熱","Riposte":"還擊","Spirit Tap":"精神分流","Improved Frost Nova":"強化冰霜新星","Improved Voidwalker":"強化虛無行者"};
Object.assign(ZH,{"Starlight Wrath":"星光之怒","Moon and Stars":"月亮與星辰","Improved Entangling Roots":"強化糾纏根鬚","Insect Swarm":"蟲群","Improved Starfire":"強化星火術","Overgrowth":"蔓生","Nature's Grace":"自然之賜","Eclipse":"日月蝕","Dreamstate":"夢境","Moonkin Form":"梟獸形態","Brutal Impact":"野蠻衝擊","Natural Reaction":"自然反應","Natural Shapeshifter":"自然變形者","Tranquil Spirit":"寧靜之魂","Iron Will":"鋼鐵意志","Improved Disarm":"強化繳械","Booming Voice":"震耳嗓音","Piercing Howl":"刺耳怒吼","Improved Ambush":"強化伏擊","Dirty Tricks":"骯髒詭計","Heightened Senses":"感官強化","Power in Light":"聖光之力","Blackout":"昏厥"});
const zh=name=>globalThis.GTLocale?.spell(name)||ZH[name]||name+"（譯名待核）";
function talentSymbol(name,tree){if(/heal|light|holy|renew|restor|nature|bloom|rejuv/i.test(name))return "✦";if(/shield|armor|defen|hide|block|ward/i.test(name))return "◆";if(/fire|flame|burn|ignite/i.test(name))return "♨";if(/frost|ice|cold|winter/i.test(name))return "❄";if(/blood|rend|claw|bite|feral|predat/i.test(name))return "✧";if(/shadow|dark|demon|poison|venom/i.test(name))return "☾";return ["✦","⚔","✧"][tree]||"✦";}
let iconIndex={},localeIndex={},partialIndex={};
function iconFile(t,cls,index=iconIndex){
 const valid=v=>typeof v==="string"&&/^[a-z][a-z0-9_]+$/i.test(v)&&!/^inv_misc_questionmark$/i.test(v),raw=t?.icon;
 if(valid(raw))return raw.toLowerCase();
 // A numeric FileDataID is authoritative. Never replace it with a differently named talent.
 const mapped=raw!=null&&/^\d+$/.test(String(raw))?index[String(raw)]:index[cls+":"+t?.tree+":"+t?.name];
 return valid(mapped)?mapped.toLowerCase():"";
}
function mergeTalentIconIndex(base,generated){
 const out=Object.create(null);
 const valid=v=>typeof v==="string"&&/^[a-z][a-z0-9_]+$/i.test(v)&&!/^inv_misc_questionmark$/i.test(v);
 for(const map of [base?.format===1&&base.build==="1.60.1.71139"?base.icons:null,generated]){
  if(!map||typeof map!=="object"||Array.isArray(map))continue;
  for(const [k,v] of Object.entries(map))if((/^\d+$/.test(k)||/^(warrior|paladin|hunter|rogue|priest|shaman|mage|warlock|druid):[012]:.+$/.test(k))&&valid(v)){
   if(Object.hasOwn(out,k)&&out[k]!==v.toLowerCase())continue;
   out[k]=v.toLowerCase();
  }
 }
 return out;
}
function talentIconURLs(t,cls,index=iconIndex){
 const key=iconFile(t,cls,index);return key?["https://render-classic-us.worldofwarcraft.com/icons/56/"+key+".jpg","https://render-us.worldofwarcraft.com/icons/56/"+key+".jpg","https://wow.zamimg.com/images/wow/icons/large/"+key+".jpg"]:[];
}
function sumIcon(t,cls){return talentIconURLs(t,cls)[0]||"";}
const sum=(m)=>Object.values(m).reduce((a,b)=>a+b,0);
function treeSum(cls,ranks,tree){return cls.talents.filter(t=>t.tree===tree).reduce((a,t)=>a+(ranks[t.id]||0),0);}
function deps(cls,t){return (cls.arrows||[]).filter(a=>String(a.to)===String(t.id)&&a.required!==false).map(a=>cls.talents.find(x=>String(x.id)===String(a.from))||null);}
function lowerPoints(cls,t,ranks){return cls.talents.filter(x=>x.tree===t.tree&&x.row<t.row).reduce((a,x)=>a+(ranks[x.id]||0),0);}
function available(cls,t,ranks){return !t.notYetAvailable&&(ranks[t.id]||0)<t.maxRank&&lowerPoints(cls,t,ranks)>=t.pointsInTreeRequired&&deps(cls,t).every(d=>d&&(ranks[d.id]||0)>=d.maxRank);}
function levelAt(value){const n=Number(value);return Number.isFinite(n)?Math.min(60,Math.max(1,Math.floor(n))):10;}
function levelState(steps,value){const level=levelAt(value),ranks={};for(const step of steps)if(step.level<=level)ranks[step.talent.id]=step.rank;return {level,ranks,step:steps.find(x=>x.level===level)||null};}
function questPath(cls,plan){
 const ranks={},steps=[];
 for(let level=10;level<=60;level++){
  const mainCount=treeSum(cls,ranks,plan.main),active=mainCount<31?plan.main:plan.second;
  const capstone=cls.talents.find(t=>t.tree===plan.main&&t.pointsInTreeRequired===30&&plan.priority.includes(t.name));
  const candidates=cls.talents.filter(t=>available(cls,t,ranks));
  const preference=t=>{const index=plan.priority.findIndex(n=>n.toLowerCase()===t.name.toLowerCase());const critical=capstone&&t.id===capstone.id&&!(ranks[t.id]>0);const prereq=cls.talents.some(x=>x.tree===active&&plan.priority.includes(x.name)&&!(ranks[x.id]>=x.maxRank)&&deps(cls,x).some(d=>d&&d.id===t.id));return (critical?30000:0)+(t.tree===active?10000:t.tree===plan.main?1000:0)+(index>=0?500-index*5:0)+(prereq?160:0)+t.row*2+(ranks[t.id]?1:0);};
  candidates.sort((a,b)=>preference(b)-preference(a)||a.id-b.id);
  const t=candidates[0];if(!t)break;
  ranks[t.id]=(ranks[t.id]||0)+1;const preferred=plan.priority.some(n=>n.toLowerCase()===t.name.toLowerCase());steps.push({level,talent:t,rank:ranks[t.id],reason:preferred?"練等優先天賦": "補足解鎖或可用點數（演算法候選，需實戰複核）"});
 }
 return steps;
}
function validateClass(cls){return !!cls&&Array.isArray(cls.talents)&&cls.talents.length>30&&Array.isArray(cls.trees)&&cls.trees.length===3&&Array.isArray(cls.arrows)&&cls.talents.every(t=>Number.isInteger(t.id)&&Number.isInteger(t.tree)&&t.tree>=0&&t.tree<=2&&Number.isInteger(t.maxRank)&&t.maxRank>0&&Number.isFinite(t.pointsInTreeRequired)&&Number.isInteger(t.column)&&Number.isInteger(t.row))&&cls.arrows.every(a=>cls.talents.some(t=>String(t.id)===String(a.from))&&cls.talents.some(t=>String(t.id)===String(a.to)));}
function mapBuild(cls,profile){
 const ranks={},issues=[];if(!profile.talents)return {ranks,issues:["此構築尚無逐項配點資料。"],complete:false};
 for(const [tree,entries] of profile.talents.entries())for(const [name,n] of Object.entries(entries)){const t=cls.talents.find(x=>x.tree===tree&&x.name.toLowerCase()===name.toLowerCase());if(!t){issues.push(name+"：新版同系找不到此天賦");continue;}ranks[t.id]=n;if(!Number.isInteger(n)||n<1||n>t.maxRank||t.notYetAvailable)issues.push(name+"：參考 "+n+" 點，現版上限 "+t.maxRank+" 或尚未開放");}
 for(const t of cls.talents.filter(x=>ranks[x.id]>0)){const lower=lowerPoints(cls,t,ranks);if(lower<t.pointsInTreeRequired)issues.push(t.name+"：低層點數不足");if(deps(cls,t).some(d=>!d||(ranks[d.id]||0)<d.maxRank))issues.push(t.name+"：前置天賦未滿");}
 if(sum(ranks)!==51)issues.push("新版對應總點數 "+sum(ranks)+"/51");
 return {ranks,issues,complete:!issues.length};
}
function validateCommunitySnapshot(d){return !!d&&d.format==="gt-community-talents/1"&&d.source==="Talents Forever"&&Array.isArray(d.classes)&&d.classes.length===9&&CLASSES.every(k=>validateClass(d.classes.find(c=>c.token===k)));}
function validateSnapshot(d){return !!d&&d.format==="zephras-talents/1"&&d.build==="1.60.1.71139"&&Array.isArray(d.classes)&&CLASSES.every(k=>validateClass(d.classes.find(c=>String(c.token).toLowerCase()===k)));}
function partialBuildCheck(p,index){
 const issues=[];let matched=0,total=0;
 for(const [tree,t] of (p?.talents||[]).entries()){
  for(const [name,n] of Object.entries(t)){
   total++;const x=index[p.cls+":"+tree+":"+name];if(!x)continue;matched++;
   if(n>x.maxRank)issues.push(name+"：投入"+n+"點，高於已核對上限"+x.maxRank+"點");
   const lower=Object.entries(t).reduce((a,[k,v])=>{const z=index[p.cls+":"+tree+":"+k];return a+(z&&z.pointsInTreeRequired<x.pointsInTreeRequired?v:0);},0);
   if(Object.keys(t).every(k=>index[p.cls+":"+tree+":"+k])&&lower<x.pointsInTreeRequired)issues.push(name+"：已知低層點數"+lower+"，需"+x.pointsInTreeRequired+"點");
  }
 }
 return {issues,matched,total};
}
function exactProfile(profiles,cls,id,key){return (profiles||[]).find(p=>p.cls===cls&&p.id===id&&p.key===key)||null;}
function skillBuildNote(data,profile){
 if(!profile||!data?.buildNotes)return null;
 const note=data.buildNotes[profile.id+":"+profile.key];return note&&typeof note.note==="string"&&Array.isArray(note.focus)?note:null;
}
function skillScenarios(data,profile){
 if(!profile||data?.specs?.[profile.id]?.class!==profile.cls)return [];
 const rows=data.scenarios?.[profile.id];
 if(!Array.isArray(rows))return [];
 return rows.filter(x=>x&&typeof x.label==="string"&&x.label.trim()&&typeof x.note==="string"&&Array.isArray(x.skills)&&x.skills.length&&x.skills.every(n=>typeof n==="string"));
}
function skillClientRecord(data,cls,name){
 if(data?.build!=="1.60.1.71139")return null;
 const x=data.classes?.[cls]?.[name];if(!x||!Array.isArray(x.records)||!x.records.length)return null;
 const records=x.records.filter(r=>Number.isSafeInteger(r.id)&&r.id>0);if(!records.length)return null;
 const label=typeof x.name==="string"&&/[\u3400-\u9fff]/.test(x.name)&&records.every(r=>r.name===x.name)?x.name:null;
 return {name:label,records};
}
function skillGuideMatch(row,filters,condition,focus){
 const {terms=[],category="全部用途",acq="all",scenario=null,focusOnly=false,localizedName=""}=filters;
 return (category==="全部用途"||category===row[2])&&(acq==="all"||acq===condition.kind)&&(!scenario||scenario.skills.includes(row[1]))&&(!focusOnly||focus.has(row[1]))&&terms.every(t=>[...row,localizedName].join(" ").toLowerCase().includes(t));
}
function investedTalentRows(profile,cls){
 if(!Array.isArray(profile?.talents))return [];
 return profile.talents.flatMap((tree,i)=>Object.entries(tree||{}).filter(([,n])=>Number.isInteger(n)&&n>0).map(([name,points])=>{
  const t=cls?.talents?.find(x=>x.tree===i&&x.name.toLowerCase()===name.toLowerCase());
  return {name,points,tree:i,talent:t||null,valid:t?points<=t.maxRank&&!t.notYetAvailable:null};
 }));
}
if(typeof module!=="undefined"&&module.exports)module.exports={skillBuildNote,skillScenarios,skillGuideMatch,skillClientRecord,investedTalentRows,validateCommunitySnapshot,partialBuildCheck,exactProfile,zh,talentSymbol,iconFile,sumIcon,talentIconURLs,mergeTalentIconIndex,LEVEL,questPath,validateClass,mapBuild,available,levelAt,levelState,lowerPoints,validateSnapshot};
if(typeof document!=="undefined"){
const $=id=>document.getElementById(id),el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;},add=(p,...xs)=>{p.append(...xs);return p;},link=(text,url)=>{const a=el("a",text);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a;};
const options=(e,rows,value)=>{e.replaceChildren(...rows.map(([v,t])=>new Option(t,v)));if(rows.some(x=>x[0]===value))e.value=value;};
let skillClient=null,skillGuides=null,catalog=null,db=null,mode="build",level=10,selected=null,steps=[],ranks={};
const classSel=$("classSelect"),specSel=$("specSelect"),buildSel=$("buildSelect");
const q=new URLSearchParams(location.search),embedded=q.get("embed")==="1",workspaceLayout=embedded&&q.get("layout")==="workspace";
if(embedded)document.documentElement.classList.add("embedded");if(workspaceLayout)document.documentElement.classList.add("workspace-talents");
options(classSel,CLASSES.map((x,i)=>[x,NAMES[i]]),q.get("class")||"rogue");
function getClass(){return db?.classes.find(c=>String(c.token).toLowerCase()===classSel.value);}
function getProfile(){return embedded?exactProfile(catalog?.profiles,q.get("class"),q.get("spec"),q.get("build")):exactProfile(catalog?.profiles,classSel.value,specSel.value,buildSel.value);}
function syncSelectors(){if(!catalog)return;const profiles=catalog.profiles.filter(p=>p.cls===classSel.value);const prev=specSel.value||q.get("spec"),key=buildSel.value||q.get("build");options(specSel,[...new Map(profiles.map(p=>[p.id,p.spec])).entries()],prev);options(buildSel,profiles.filter(p=>p.id===specSel.value).map(p=>[p.key,p.label]),key);}
function purpose(t){const name=t.name,desc=(t.ranks||[]).join(" ");const reasons=[];if(/damage|critical|attack power|spell power/i.test(desc))reasons.push("傷害／爆擊：依實際技能使用比例衡量輸出收益");if(/mana|rage|energy|combo point/i.test(desc))reasons.push("資源管理：影響續航、技能施放頻率或連擊點");if(/heal|absorb|armor|health|dodge|parry|block|damage taken/i.test(desc))reasons.push("治療／生存：依實際承傷與治療需求評估");if(/movement speed|slow|root|stun|cooldown|cast time/i.test(desc))reasons.push("機動／控制／施法節奏：降低跑圖或戰鬥耗時");if(/chance to hit|hit chance/i.test(desc))reasons.push("命中：只套用原文所指的攻擊類別，勿直接當通用命中");return reasons.length?reasons.join("；"):"按此天賦原文及解鎖技能評估；本站尚未提供專屬數值權重。";}
function localized(t){return localeIndex[classSel.value+":"+t.tree+":"+t.name]?.name||zh(t.name);}
function localizedRanks(t){const ranks=localeIndex[classSel.value+":"+t.tree+":"+t.name]?.ranks;return Array.isArray(ranks)&&ranks.length===t.ranks?.length?ranks:null;}
function talentArt(t,tree){
 const known=partialIndex[classSel.value+":"+tree+":"+t.name],holder=el("span","圖示待查","talent-symbol talent-icon-missing"),urls=talentIconURLs({...t,tree,icon:t.icon||known?.icon},classSel.value);
 holder.dataset.iconState=urls.length?"loading":"unmapped";holder.title=urls.length?"正在載入遊戲原始圖示":"未取得原始圖示對應";
 if(urls.length){const img=el("img");img.alt="";img.width=56;img.height=56;img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";let i=0;
  img.onload=()=>{holder.dataset.iconState="loaded";holder.title="遊戲原始圖示";holder.classList.remove("talent-icon-missing");label.hidden=true;};
  img.onerror=()=>{if(++i<urls.length){img.src=urls[i];return;}holder.dataset.iconState="unavailable";holder.title="原始圖示暫不可用";img.remove();label.textContent="圖示未載入";};
  const label=el("span","載入中","talent-icon-label");holder.replaceChildren(label,img);img.src=urls[0];
 }return holder;
}
function detail(t){selected=t.id;const d=$("detail"),n=ranks[t.id]||0;d.replaceChildren(el("h2",localized(t)),el("p","目前投入 "+n+"/"+t.maxRank+" ｜ 第 "+t.row+" 層，需該系 "+t.pointsInTreeRequired+" 點"),el("p",purpose(t)),el("p",localizedRanks(t)?"以下為版本相符的繁中技能效果。":"已知句型顯示繁中參考譯文；未核對的效果保留英文原文並標示待譯。","muted"));const list=el("ol",undefined,"ranklist");for(const [i,v] of (localizedRanks(t)||t.ranks||[]).entries()){const translated=localizedRanks(t)?v:globalThis.GTLocale?.effect?.(v);const li=el("li",translated||v+"（技能效果待譯）","detail");if(i+1===n)li.classList.add("ok");list.append(li);}d.append(list);if(mode==="level"){const cls=getClass();if(cls)d.append(el("p",available(cls,t,ranks)?"依目前點數可再投入1點。":(n>=t.maxRank?"已達此天賦上限。":"尚未符合加點條件；低層已投入 "+lowerPoints(cls,t,ranks)+"/"+t.pointsInTreeRequired+" 點。"),"muted"));}const pre=deps(getClass(),t);if(pre.length)d.append(el("p","前置："+pre.map(x=>x?localized(x)+" "+x.maxRank+"/"+x.maxRank:"未知").join("、")));document.querySelectorAll(".talent").forEach(b=>b.classList.toggle("selected",b.dataset.id===String(t.id)));}
function renderSkillGuide(profile){
 const host=$("skillGuide");if(!host)return;host.replaceChildren();host.hidden=mode!=="build"||!profile;
 if(host.hidden)return;
 const data=skillGuides?.format===1?skillGuides:null,guide=data?.specs?.[profile.id];
 host.append(el("h2","專精技能使用指南"));
 if(!guide||guide.class!==classSel.value){host.append(el("p","逐項技能指南尚未取得；請參考遊戲技能書。","muted"));return;}
 const buildNote=skillBuildNote(data,profile),focus=new Set(buildNote?.focus||[]),scenarios=skillScenarios(data,profile);const client=en=>skillClientRecord(skillClient,guide.class,en);
 const entries=(list)=>Array.isArray(list)?list.filter(x=>Array.isArray(x)&&x.length===4&&x.every(v=>typeof v==="string"&&v.trim())):[];
 const core=entries(guide.skills),common=entries(data.common?.[guide.class]).filter(x=>!core.some(y=>y[1]===x[1]));
 const talentNames=new Set([...(catalog?.profiles||[]).filter(p=>p.cls===profile.cls).flatMap(p=>(p.talents||[]).flatMap(t=>Object.keys(t))),...(getClass()?.talents||[]).map(t=>t.name)]);
 const learned=new Set((profile.talents||[]).flatMap(t=>Object.entries(t).filter(([,n])=>Number.isInteger(n)&&n>0).map(([k])=>k.toLowerCase())));
 const unlocks=data.unlocks?.[guide.class]||{};
 function acquisition(en){
  const type=unlocks[en];
  if(type==="trainer")return {kind:"trainer",text:"職業習得技能；等級、訓練與任務條件以遊戲內為準。"};
  if(type==="talent"||type==="passive"){
   const prefix=type==="passive"?"被動天賦，不是獨立施放技能。":"需對應天賦解鎖。";
   return {kind:!profile.talents?"unknown":learned.has(en.toLowerCase())?"talent":"unlisted",text:prefix+(!profile.talents?" 此構築無逐項配點；習得狀態待查。":learned.has(en.toLowerCase())?" 參考配點已列同名天賦；仍須確認實際習得。":" 參考配點未列同名天賦；請勿假定可用。")};
  }
  if(talentNames.has(en))return {kind:"unknown",text:"技能與天賦同名；實際取得方式及是否習得仍待核對。"};
  return {kind:"unknown",text:"取得條件尚未逐項核對。"};
 }
 add(host,el("h3",guide.title+" · "+core.length+" 項核心／情境技能"),el("p",guide.priority),el("p","以下為專精共通滿等 PvE 操作參考；不是固定循環。部分技能需天賦、武器、形態、種族或任務解鎖。","muted"));
 const buildBox=el("details",undefined,"skill-build-note");
 add(buildBox,el("summary","目前構築："+profile.label),el("p",profile.style||"構築說明待補"),el("p",profile.rotation||"構築操作待查"),el("p",buildNote?.note||"此構築尚無獨立逐項手法；下方為專精共通建議。","muted"));
 if(buildNote?.focus.length)buildBox.append(el("p","重點查閱標記只表示此構築的研究方向，不是技能優先序。","muted"));
 buildBox.open=!!buildNote;host.append(buildBox);
 if(!profile.talents)host.append(el("p","此構築未收錄逐項配點：不假定已習得天賦技能。","warn"));
 const scenarioBox=el("details",undefined,"skill-scenarios"),scenarioButtons=el("div",undefined,"skill-scenario-buttons"),scenarioNote=el("p","選擇情境即可篩選下方技能。所有情境均為專精共通參考，需配合目前構築及實際習得。","muted");let selectedScenario=null,focusOnly=false;
 if(scenarios.length){add(scenarioBox,el("summary","戰鬥情境快速查閱"),scenarioButtons,scenarioNote);host.append(scenarioBox);}
 const search=el("input");search.type="search";search.placeholder="搜尋技能、用途或英文原名";search.setAttribute("aria-label","搜尋專精技能");const list=el("div",undefined,"skill-list"),commonBox=el("details",undefined,"skill-common"),commonRows=el("div",undefined,"skill-list"),count=el("p",undefined,"muted");
 const filters=el("div",undefined,"skill-filters"),category=el("select"),acq=el("select");category.setAttribute("aria-label","技能用途分類");acq.setAttribute("aria-label","技能取得條件");for(const value of ["全部用途",...new Set([...core,...common].map(x=>x[2]))])category.append(new Option(value,value));for(const [value,label] of [["all","全部取得狀態"],["trainer","已標記職業習得"],["talent","參考配點已列天賦"],["unlisted","參考配點未列天賦"],["unknown","取得條件待查"]])acq.append(new Option(label,value));add(filters,category,acq);const focusButton=el("button","只看本構築重點"),reset=el("button","清除技能篩選"),actions=el("div",undefined,"skill-filter-actions");focusButton.type=reset.type="button";focusButton.setAttribute("aria-pressed","false");if(focus.size)actions.append(focusButton);actions.append(reset);add(host,search,filters,actions,count,list,commonBox);
 function card(row){const [name,en,kind,use]=row,c=el("article",undefined,"skill-card"),metadata=client(en);add(c,add(el("div",undefined,"skill-name"),el("strong",metadata?.name||name),el("small",kind,"skill-kind")),el("small",en+(metadata?.name?" · 客戶端繁中名稱":" · 教學參考名稱"),"muted"),el("p",use));
  const condition=acquisition(en);c.dataset.acquisition=condition.kind;c.dataset.skill=en;c.append(el("p",condition.text,"skill-condition"));if(focus.has(en))c.append(el("small","本構築重點查閱","skill-focus"));
  if(metadata){const raw=el("details",undefined,"skill-client-records");add(raw,el("summary","客戶端技能紀錄（"+metadata.records.length+" 筆）"),el("p","同職業遮罩及英文名稱對應；不代表每筆均可習得，也不自動認定最高階級。基礎冷卻不包含天賦、觸發、共用鎖定或熱修改動。","muted"));for(const r of metadata.records){const line=el("p");add(line,link("技能 ID "+r.id,"https://www.wowhead.com/forever/spell="+r.id));const fields=[];if(Number.isSafeInteger(r.level)&&r.level>0)fields.push("技能等級欄位 "+r.level);if(Number.isSafeInteger(r.cooldownMs)&&r.cooldownMs>0)fields.push("基礎冷卻 "+r.cooldownMs/1000+" 秒");if(Number.isSafeInteger(r.categoryCooldownMs)&&r.categoryCooldownMs>0)fields.push("類別冷卻 "+r.categoryCooldownMs/1000+" 秒");if(fields.length)line.append(document.createTextNode(" ｜ "+fields.join(" ｜ ")));if(!fields.length)line.append(document.createTextNode(" ｜ 等級及冷卻待核"));raw.append(line);}c.append(raw);}
  return c;
 }
 function draw(){const terms=search.value.trim().toLowerCase().split(/\s+/).filter(Boolean),matches=x=>skillGuideMatch(x,{terms,category:category.value,acq:acq.value,scenario:selectedScenario,focusOnly,localizedName:client(x[1])?.name||""},acquisition(x[1]),focus),a=core.filter(matches),b=common.filter(matches);list.replaceChildren(...a.map(card));commonRows.replaceChildren(...b.map(card));commonBox.replaceChildren(el("summary","職業共通技能（"+b.length+"）"),commonRows);commonBox.hidden=!b.length;if(terms.length||category.value!=="全部用途"||acq.value!=="all"||selectedScenario||focusOnly)commonBox.open=true;count.textContent="顯示 "+(a.length+b.length)+" / "+(core.length+common.length)+" 項已整理技能";if(!a.length&&!b.length)list.append(el("p","沒有符合條件的已整理技能。","muted"));}
 function selectScenario(row){selectedScenario=row;for(const b of scenarioButtons.children)b.setAttribute("aria-pressed",String(b.dataset.scenario===(row?.label||"")));scenarioNote.textContent=row?row.note+"（專精共通參考，非固定施放順序）":"選擇情境即可篩選下方技能。所有情境均為專精共通參考，需配合目前構築及實際習得。";draw();}
 for(const row of [null,...scenarios]){const b=el("button",row?.label||"全部情境");b.type="button";b.dataset.scenario=row?.label||"";b.setAttribute("aria-pressed",String(!row));b.onclick=()=>selectScenario(row);scenarioButtons.append(b);}
 focusButton.onclick=()=>{focusOnly=!focusOnly;focusButton.setAttribute("aria-pressed",String(focusOnly));draw();};reset.onclick=()=>{search.value="";category.value="全部用途";acq.value="all";focusOnly=false;focusButton.setAttribute("aria-pressed","false");selectScenario(null);commonBox.open=false;};
 search.addEventListener("input",draw);category.addEventListener("change",draw);acq.addEventListener("change",draw);draw();
 const refs=el("details");add(refs,el("summary","資料來源與涵蓋限制"),el("p",data.scope,"muted"),el("p","整理日期："+data.reviewed,"muted"),link("職業技能書、階級與資源消耗（The Forever Era；版本可能較舊）","https://theforeverera.com/en/spells/"+guide.class+"/"),link("ForeverDB 技能資料","https://foreverdb.net/spells?cls="+[1,2,3,4,5,7,8,9,11][CLASSES.indexOf(guide.class)]),link("Method 職業攻略","https://www.method.gg/wow-forever/class-guides"),link("Icy Veins 職業攻略","https://www.icy-veins.com/wow-forever/class-guides"));
 if(profile.id==="spec-26")add(refs,link("Method 11/27 貓德輸出手法","https://www.method.gg/wow-forever/class-guides/feral-dps-druid/rotation-and-playstyle"),link("Wowhead 貓德輸出手法","https://www.wowhead.com/forever/guide/classes/druid/feral/rotation-cooldowns-pve-dps"));
 if(profile.id==="spec-26"||profile.id==="spec-27")refs.append(link("11/27 野性德實戰參考","https://mobalytics.gg/wow-forever/classes/"+(profile.id==="spec-26"?"feral-druid-guide":"feral-druid-tank-guide")));
 const picked=investedTalentRows(profile,getClass());
 if(picked.length){
  const talentPanel=el("details",undefined,"skill-invested");talentPanel.append(el("summary","已投入天賦效果（"+picked.length+" 項）"));
  talentPanel.append(el("p","按參考配點列出；天賦不一定是主動技能。格位、上限與完整前置核對結果以天賦區為準。","muted"));
  for(const row of picked){
   const t=row.talent,card=el("details",undefined,"skill-invested-row");
   card.append(el("summary",(t?localized(t):zh(row.name))+" · "+row.points+" 點"));
   if(t){
    const effects=localizedRanks(t),raw=t.ranks?.[row.points-1],value=effects?.[row.points-1]||globalThis.GTLocale?.effect?.(raw||"")||raw;
    add(card,el("p",row.valid?purpose(t):"參考點數超出上限或尚未開放，效果不可當作有效配點。",row.valid?"muted":"warn"),el("p",value||"目前階級效果未取得；不推算數值。"),el("small",effects?.[row.points-1]?"指定版本繁中效果": "來源效果或參考譯文，待核對","muted"));
    const btn=el("button","查看完整天賦階級");btn.type="button";btn.onclick=()=>{detail(t);$("detail").scrollIntoView({block:"start"});};card.append(btn);
   }else card.append(el("p","目前資料找不到同系同名天賦，保留參考配點但不借用其他天賦效果。","warn"));
   talentPanel.append(card);
  }
  host.append(talentPanel);
 }
 host.append(refs);
}
function syncTreeNavigation(){
 const nav=$("treeJump");if(!nav)return;
 nav.replaceChildren();const trees=[...$("treeArea").querySelectorAll(".tree")];const skills=$("skillGuide");nav.hidden=!workspaceLayout||(!trees.length&&(!skills||skills.hidden));
 if(nav.hidden)return;
 for(const card of trees){const b=el("button",card.querySelector("h3")?.textContent||"天賦系");b.type="button";b.onclick=()=>card.scrollIntoView({block:"start"});nav.append(b);}
 if(skills&&!skills.hidden){const b=el("button","技能使用指南");b.type="button";b.onclick=()=>skills.scrollIntoView({block:"start"});nav.append(b);}
 const d=el("button","技能效果");d.type="button";d.onclick=()=>$("detail").scrollIntoView({block:"start"});nav.append(d);
}
function renderTree(cls,issues){const a=$("treeArea");a.replaceChildren();for(const tree of cls.trees){const card=el("section",undefined,"tree"),grid=el("div",undefined,"talents");add(card,el("h3",TREE_NAMES[CLASSES.indexOf(classSel.value)][tree.index]+" · "+treeSum(cls,ranks,tree.index)+"點"),grid);for(const t of cls.talents.filter(x=>x.tree===tree.index)){const n=ranks[t.id]||0,b=el("button",undefined,"talent"+(n?" picked":"")+(n>t.maxRank?" invalid":""));b.type="button";b.dataset.id=t.id;b.style.gridRow=String(t.row);b.style.gridColumn=String(t.column);b.title=localized(t)+"（"+t.name+"） "+n+"/"+t.maxRank;add(b,talentArt(t,t.tree),el("strong",n+"/"+t.maxRank),el("span",localized(t)));b.onclick=()=>detail(t);grid.append(b);}a.append(card);}syncTreeNavigation();const focus=cls.talents.find(t=>t.id===selected)||cls.talents.find(t=>ranks[t.id]>0)||cls.talents[0];if(focus)detail(focus);}
function updateURL(){if(embedded)return;const p=new URLSearchParams({class:classSel.value,mode});if(q.get("embed")==="1")p.set("embed","1");if(mode==="build"){p.set("spec",specSel.value);p.set("build",buildSel.value);}else p.set("level",String(level));history.replaceState(null,"","?"+p.toString());const share=$("shareLink");if(share){p.delete("embed");share.href="talents.html?"+p.toString();}}
function sources(){const s=$("sources");s.replaceChildren(el("h2","資料來源與限制"),link("Zephras 客戶端天賦資料 1.60.1.71139",DATA_URL),el("p"),link("繁中天賦計算器（外部對照）","https://wowforeverpath.com/zh-TW/talents/"),el("p","圖示採遊戲原始材質檔名／FileDataID 對應，優先讀取 Blizzard 圖片服務，備援為同檔名的 Wowhead 原始材質；缺少或無法載入時明確標示，不使用自創符號。繁中名稱優先採已核對資料，其他為參考譯名。","muted"),el("p",db?.format==="gt-community-talents/1"?"格位、圖示及前置關係來自 Talents Forever；各職業來源日期不一，路線為本站演算法建議。":"天賦位置、上限與先決條件來自指定版客戶端。本站配點不是官方最佳解，也不是完整輸出模擬。","muted"),link("Talents Forever（CC BY 4.0）","https://talentsforever.com/about"),el("p",getClass()?.generated?"社群資料日期："+getClass().generated:"","muted"),link("MMonster 各職業練等路線（外部參考）","https://mmonster.co/wow-forever/tools/talent-path"),el("p"),link("ForeverSpec 天賦計算器","https://foreverspec.com/talent-calculator/"),el("p"),link("逐項滿等構築研究來源","https://www.wofwforever.com/en/guides/wow-forever-"+classSel.value+"-level-60-talents/"));}
function render(){const cls=getClass(),p=getProfile(),o=$("overview"),l=$("levelControls"),rows=$("levelList");o.replaceChildren();$("treeArea").replaceChildren();renderSkillGuide(p);syncTreeNavigation();$("detail").replaceChildren(el("h2","天賦用途"),el("p","選取天賦，查看各階效果及用途。"));l.hidden=rows.hidden=mode!=="level";$("specField").hidden=$("buildField").hidden=mode==="level";$("buildMode").setAttribute("aria-pressed",String(mode==="build"));$("levelMode").setAttribute("aria-pressed",String(mode==="level"));sources();updateURL();
 if(mode==="build"){
  if(!p){o.append(el("p",catalog?"目前選擇的玩法尚無獨立天賦資料；不會自動替換為其他構築。":"構築資料尚未載入。","warn"));return;}
  add(o,el("h2",p.className+" · "+p.label),el("div",p.split||"配點待查","split"));const notes=el("div");add(notes,el("p","玩法："+p.style),el("p","實戰手法參考："+p.rotation),el("p","裝備收益："+p.research),el("p","手法為專精共通研究與構築摘要，不代表已完整驗證的專屬循環。","muted"));if(workspaceLayout){const extra=el("details");add(extra,el("summary","玩法與配裝說明"),notes);o.append(extra);}else o.append(notes);
  if(!p.talents){o.append(el("p","此玩法尚無已收錄的逐項配點；不借用其他玩法。","warn"));return;}
  if(!cls){const check=partialBuildCheck(p,partialIndex);if(check.matched){o.append(el("p","指定版本部分核對："+check.matched+"/"+check.total+"項；尚未驗證完整前置連線與技能效果。","muted"));if(check.issues.length){const warn=el("details");warn.open=true;warn.append(el("summary","已發現配點差異（"+check.issues.length+"）"));for(const issue of check.issues)warn.append(el("p",issue,"warn"));o.append(warn);}}
  o.append(el("p","客戶端格位尚未載入；下方為已收錄配點的圖示卡片，非遊戲原始天賦樹。名稱為繁中參考譯名，尚未逐項核對官方譯名。","warn"));if(p.talents){const area=$("treeArea");for(const [i,t] of p.talents.entries()){const card=el("section",undefined,"tree"),grid=el("div",undefined,"talents fallback-talents");add(card,el("h3",TREE_NAMES[CLASSES.indexOf(classSel.value)][i]+" · "+sum(t)+"點"),grid);for(const [k,n] of Object.entries(t)){const b=el("button",undefined,"talent picked");b.type="button";b.title=zh(k)+"（"+k+"）";add(b,talentArt({name:k,tree:i},i),el("strong",n+"點"),el("span",localized({name:k,tree:i})));b.onclick=()=>{$("detail").replaceChildren(el("h2",localized({name:k,tree:i})),el("p","英文原名："+k),el("p","參考投入："+n+"點"),el("p","完整技能效果、上限及前置條件待客戶端資料載入後查證。","muted"));area.querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));};grid.append(b);}if(!Object.keys(t).length)grid.append(el("p","未投入點數","muted"));area.append(card);}}syncTreeNavigation();return;}
  const m=mapBuild(cls,p);ranks=m.ranks;add(o,el("p",m.complete?"已通過格位、點數與前置條件檢查；實戰權重仍待驗證。":"尚未通過完整構築核對，請勿視為可直接照點。",m.complete?"ok":"warn"));if(m.issues.length){const d=el("details");d.open=true;d.append(el("summary","資料差異（"+m.issues.length+"）"));for(const issue of m.issues)d.append(el("p",issue,"warn"));o.append(d);}renderTree(cls,m.issues);
 }else{
  const plan=LEVEL[classSel.value];add(o,el("h2",NAMES[CLASSES.indexOf(classSel.value)]+" · "+plan.name),el("p",plan.play),el("p","1–9 級無一般天賦；10–60 級每級1點。本路線未採用傳承天賦提前解鎖、洗點或雙天賦。","muted"),el("p","依來源的天賦格位、前置條件與野外優先序產生建議；非逐級實戰驗證的最快路線。","warn"));l.replaceChildren();rows.replaceChildren();
  if(!cls){add(o,el("p","尚未取得完整天賦資料，不能安全產生逐級點法。","warn"),link("查看外部逐級練等攻略","https://mmonster.co/wow-forever/tools/talent-path"));l.hidden=rows.hidden=true;return;}
  steps=questPath(cls,plan);if(steps.length!==51){o.append(el("p","只產生 "+steps.length+" 點；資料先決條件需複核。","warn"));l.hidden=rows.hidden=true;return;}const range=el("input");range.type="range";range.min="1";range.max="60";range.value=String(level);range.className="slider";const label=el("h2"),prev=el("button","上一級"),next=el("button","下一級"),summary=el("p");const bar=el("div",undefined,"tabs");add(bar,prev,next);add(l,label,range,bar,summary);rows.append(el("h2","1–60 級逐點配法"),el("p","Lv.1–9：一般角色尚未取得天賦點。","muted"));const list=el("div",undefined,"levelrows");rows.append(list);
  const stepButtons=[];for(let lv=1;lv<10;lv++){const b=el("button",undefined,"levelrow");add(b,el("strong","Lv."+lv),el("span","尚無一般天賦點"),el("small","0 點"));b.onclick=()=>{level=lv;refresh();};list.append(b);stepButtons.push(b);}for(const step of steps){const b=el("button",undefined,"levelrow");add(b,el("strong","Lv."+step.level),add(el("span"),talentArt(step.talent,step.talent.tree),el("span",localized(step.talent)),el("br"),el("small",step.reason)),el("small",step.rank+"/"+step.talent.maxRank));b.onclick=()=>{level=step.level;refresh();};list.append(b);stepButtons.push(b);}
  function refresh(){const state=levelState(steps,level);level=state.level;ranks=state.ranks;range.value=String(level);label.textContent="目前等級 "+level;prev.disabled=level===1;next.disabled=level===60;const st=state.step;selected=st?.talent.id??null;summary.textContent=st?"本級： "+localized(st.talent)+" "+st.rank+"/"+st.talent.maxRank+" ｜ 已投入 "+sum(ranks)+" 點 ｜ "+st.reason:"本級尚無一般天賦點；已投入 0 點";stepButtons.forEach((b,i)=>b.classList.toggle("active",i===level-1));renderTree(cls,[]);updateURL();}
  prev.onclick=()=>{level=Math.max(1,level-1);refresh();};next.onclick=()=>{level=Math.min(60,level+1);refresh();};range.oninput=()=>{level=Number(range.value);refresh();};refresh();
 }
}
async function loadJSON(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const res=await fetch(url,{signal:controller.signal});if(!res.ok)throw Error("HTTP "+res.status);return await res.json();}finally{clearTimeout(timer);}}
function snapshotStatus(source){$("status").textContent=db?(db.format==="gt-community-talents/1"?"Talents Forever 社群資料已載入（"+source+"）；各職業版本及熱修日期以來源為準，非71139完整客戶端。":"客戶端資料 1.60.1.71139 已載入（"+source+"）；舊構築將逐項核對。"):"天賦樹資料未載入，可使用原始資料入口或本機匯入。";$("dataFallback").hidden=!!db;}
async function init(){mode=q.get("mode")==="level"?"level":"build";level=levelAt(q.get("level")||10);classSel.onchange=()=>{selected=null;syncSelectors();render();};specSel.onchange=()=>{selected=null;syncSelectors();render();};buildSel.onchange=()=>{selected=null;render();};$("buildMode").onclick=()=>{mode="build";selected=null;render();};$("levelMode").onclick=()=>{mode="level";selected=null;render();};
 try{catalog=await loadJSON("talent-builds.json");syncSelectors();render();}catch(e){$("status").textContent="構築資料載入失敗："+e.message;}
 await Promise.all([loadJSON("skill-client.json").then(v=>{if(v?.build==="1.60.1.71139"&&v.classes)skillClient=v;}).catch(()=>{}),loadJSON("spec-skill-guides.json").then(v=>{if(v?.format===1&&v.specs&&v.common)skillGuides=v;}).catch(()=>{}),Promise.all([loadJSON("talent-icons-fallback.json").catch(()=>null),loadJSON("talent-icons.json").catch(()=>null)]).then(([base,generated])=>{iconIndex=mergeTalentIconIndex(base,generated);}),loadJSON("talent-reference-partial.json").then(v=>{if(v?.build==="1.60.1.71139")for(const c of v.classes||[])for(const t of c.talents||[])partialIndex[c.token+":"+t.tree+":"+t.name]=t;}).catch(()=>{}),loadJSON("talent-zhTW.json").then(v=>{if(v?.build==="1.60.1.71139"&&v.entries&&typeof v.entries==="object")localeIndex=v.entries;}).catch(()=>{})]);render();
 let source="",importRevision=0;const upload=$("clientImport");
 upload.onchange=async()=>{const file=upload.files?.[0];if(!file)return;const revision=++importRevision;try{if(file.size>5*1024*1024)throw Error("檔案超過5MB");const raw=await file.text();if(revision!==importRevision)return;const d=JSON.parse(raw);if(!validateSnapshot(d))throw Error("版本、格式或九職業資料不完整");db=d;source="本機匯入";try{localStorage.setItem("gt-talent-client-71139",raw);}catch(e){}snapshotStatus("本機匯入");render();}catch(e){if(revision===importRevision)$("status").textContent="匯入失敗："+e.message;}finally{if(revision===importRevision)upload.value="";}};
 try{const cached=JSON.parse(localStorage.getItem("gt-talent-client-71139")||"null");if(validateSnapshot(cached)){db=cached;source="本機快取";}}catch(e){}
 for(const url of ["talent-client.json","talent-community.json",DATA_URL]){if(db)break;try{const d=await loadJSON(url);if(db)break;if(!validateSnapshot(d)&&!validateCommunitySnapshot(d))throw Error("資料格式或前置條件不完整");db=d;source=url==="talent-community.json"?"網站內建社群快照":url==="talent-client.json"?"網站快照":"公開來源";}catch(e){}}
 snapshotStatus(source);render();
}
init();
}