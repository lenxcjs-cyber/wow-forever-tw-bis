"""Poll public Blizzard Forever forum JSON, retaining only staff-authored notices.
No third-party tracker, paid translation API, raw post HTML, or player content is published.
"""
import json, re, time, hashlib, sys, os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"official-blue-live.json"
QUEUE=Path(os.environ.get("RUNNER_TEMP","/tmp"))/"tomb-blue-queue.json"
CATEGORIES={"us":["wow-forever/world-of-warcraft-forever-general-discussion/347","wow-forever/wow-forever-bug-report/352"],"eu":["wow-forever/359"]}
SEEDS={"us":[2403040,2429007,2429074,2416343,2415068,2426335],"eu":[]}
AGENT="TombGuildDatabase/1.0 (public WoW notices; low-rate polling)"
MAX_TOPICS=18
MAX_TRANSLATIONS=6
ROBOTS={}
BLOCKED=set()
def now(): return datetime.now(timezone.utc).isoformat()
def base(region): return "https://"+region+".forums.blizzard.com"
def fetch(url, parse=True):
    p=urlparse(url)
    if p.scheme!="https" or p.netloc not in ("us.forums.blizzard.com","eu.forums.blizzard.com"): raise ValueError("untrusted source")
    if p.path!="/robots.txt":
        if p.netloc not in ROBOTS:
            rp=RobotFileParser();rp.parse(fetch("https://"+p.netloc+"/robots.txt",False).splitlines());ROBOTS[p.netloc]=rp
        if not ROBOTS[p.netloc].can_fetch(AGENT,url): raise ValueError("robots policy excludes path")
    if p.netloc in BLOCKED:raise ValueError("host rate limited; retry next scheduled run")
    time.sleep(1.0)
    try:
        with urlopen(Request(url,headers={"User-Agent":AGENT,"Accept":"application/json" if parse else "text/plain"}),timeout=15) as r:
            if urlparse(r.geturl()).netloc!=p.netloc: raise ValueError("redirect outside official host")
            raw=r.read(8_000_001)
            if len(raw)>8_000_000: raise ValueError("response too large")
            return json.loads(raw) if parse else raw.decode("utf-8")
    except HTTPError as e:
        if e.code==429:BLOCKED.add(p.netloc)
        raise
class Plain(HTMLParser):
    def __init__(self): super().__init__(convert_charrefs=True);self.parts=[];self.skip=0
    def handle_starttag(self,t,a):
        if t in ("blockquote","script","style","aside"):self.skip+=1
        if not self.skip and t in ("p","li","br","h1","h2","h3","h4"):self.parts.append("\n")
    def handle_endtag(self,t):
        if t in ("blockquote","script","style","aside"):self.skip=max(0,self.skip-1)
        if not self.skip and t in ("p","li","h1","h2","h3","h4"):self.parts.append("\n")
    def handle_data(self,d):
        if not self.skip:self.parts.append(d)
def plain(html):
    p=Plain();p.feed(html);return "\n".join(" ".join(x.split()) for x in "".join(p.parts).splitlines() if x.strip())
def is_staff(p):
    return p.get("staff") is True or p.get("admin") is True or p.get("moderator") is True or p.get("primary_group_name")=="blizzard-tracker"
def canon(region,tid,n):return f"{region}:{int(tid)}:{int(n)}"
def official_key(url):
    p=urlparse(url or "")
    if p.netloc not in ("us.forums.blizzard.com","eu.forums.blizzard.com"):return None
    if "/t/" not in p.path:return None
    parts=p.path.split("/t/",1)[1].strip("/").split("/")
    if parts and not parts[0].isdigit():parts=parts[1:]
    if not parts or not parts[0].isdigit() or (len(parts)>1 and not parts[1].isdigit()):return None
    return canon(p.netloc.split(".")[0],parts[0],parts[1] if len(parts)>1 else 1)
def archive_keys():
    s=(ROOT/"guild-tools.js").read_text(encoding="utf-8")
    m=re.search(r"const bluePosts=(\[.*?\]);\nfunction specHotfixes",s,re.S)
    return {official_key(p.get("url")):p["key"] for p in json.loads(m[1]) if official_key(p.get("url"))} if m else {}
def read_state():
    if not OUT.exists():return {"format":1,"posts":[],"seen":{},"topics":{},"lastPublished":None}
    d=json.loads(OUT.read_text());assert d["format"]==1 and isinstance(d["posts"],list);return d
def atomic_write(path,obj):
    tmp=path.with_suffix(".tmp");tmp.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");tmp.replace(path)
def get_topics(region, state):
    known={i:{"id":i,"pinned":True} for i in SEEDS[region]}
    # Recent categories are each sampled independently; pinned and staff-associated topics prioritized.
    selected={}
    for cat in CATEGORIES[region]:
        try:
            d=fetch(base(region)+f"/en/wow/c/{cat}/l/latest.json")
            rows=d["topic_list"]["topics"]
            staff_ids={u["id"] for u in d.get("users",[]) if u.get("id") and is_staff(u)}
            def priority(t):
                staff=any(p.get("user_id") in staff_ids for p in t.get("posters",[]))
                return (0 if staff else 1,0 if t.get("pinned") else 1)
            for t in sorted(rows,key=priority)[:6]:
                if t.get("id"):selected[t["id"]]=t
        except Exception as e: print("Category unavailable",region,cat,type(e).__name__,str(e)[:160])
    # Previously found official notices can be edited even when no longer near the top.
    for p in state["posts"][:30]:
        if p.get("region","").lower()==region and p.get("identity"):
            tid=int(p["identity"].split(":")[1])
            if len(known)<8:known.setdefault(tid,{"id":tid})
    return list({**known,**selected}.values())[:MAX_TOPICS]
def selected_facts(body):
    # Only a short selection of factual changes, not a complete translated article.
    # Avoid copying long passages or quoted player messages.
    lines=[x for x in body.splitlines() if 5<=len(x.split())<=25 and re.search(r"\b(fixed|now|increased|reduced|decreased|will|changed|no longer|adjusted|removed|added)\b",x,re.I)]
    result=[];budget=25
    for x in lines:
        words=x.split()
        if len(words)>budget:continue
        result.append(x);budget-=len(words)
        if len(result)>=2:break
    return result
def poll():
    state=read_state();original=json.dumps(state,sort_keys=True);old_posts=json.dumps(state["posts"],sort_keys=True);archive=archive_keys();by={p["identity"]:p for p in state["posts"]};queue=[];successful=0
    cutoff=datetime.now(timezone.utc)-timedelta(days=7)
    for region in CATEGORIES:
        for t in get_topics(region,state):
            tid=t["id"]
            try:
                d=fetch(base(region)+f"/en/wow/t/{tid}.json")
                posts=d["post_stream"]["posts"]
                if not isinstance(posts,list):raise ValueError("bad post stream")
                successful+=1
                # Staff replies can be absent from the initial stream in large topics.
                # Request recent posts directly when the topic lists more IDs.
                stream=d["post_stream"].get("stream",[])
                have={p["id"] for p in posts}
                missing=[i for i in stream[-20:] if i not in have]
                if missing:
                    try:
                        more=fetch(base(region)+f"/en/wow/t/{tid}/posts.json?"+ "&".join("post_ids%5B%5D="+str(i) for i in missing))
                        posts+=more["post_stream"]["posts"]
                    except Exception as e: print("Recent replies unavailable",region,tid,type(e).__name__)
                for p in posts:
                    if not is_staff(p) or not p.get("cooked") or not p.get("post_number"):continue
                    n=p["post_number"];identity=canon(region,tid,n)
                    # The first post in the long-running hotfix thread is a cumulative archive.
                    if region=="us" and tid==2403040 and n==1:continue
                    dt=p.get("updated_at") or p.get("created_at")
                    try:stamp=datetime.fromisoformat(dt.replace("Z","+00:00"))
                    except Exception:continue
                    if stamp<cutoff and identity not in by:continue
                    body=plain(p["cooked"]);title=str(d.get("title") or t.get("title") or "Official notice")
                    fingerprint=hashlib.sha256(body.encode()).hexdigest()
                    old=state["seen"].get(identity)
                    state["seen"][identity]=fingerprint
                    if identity in archive and old is None and identity not in by:continue
                    if old==fingerprint and by.get(identity,{}).get("translationStatus") in ("machine","title-only"):continue
                    if old==fingerprint and identity in archive and identity not in by:continue
                    url=base(region)+f"/en/wow/t/{tid}/{n}"
                    changed=identity in by or identity in archive
                    item={"identity":identity,"key":"official-"+identity,"date":stamp.date().isoformat(),"publishedAt":p.get("created_at"),"updatedAt":dt,"title":"官方新公告（繁中翻譯待處理）","author":str(p.get("username") or "Blizzard"),"url":url,"region":region.upper(),"translationStatus":"pending","sections":[{"category":"官方公告","title":"官方已發布","body":"已偵測到暴雪公告；繁中重點尚未完成，請先閱讀官方原文。"}],"revision":changed}
                    if identity not in by or old!=fingerprint:by[identity]=item
                    queue.append({"identity":identity,"title":title,"facts":selected_facts(body),"updatedAt":dt})
                # Do not record ordinary player activity as a new official update.
            except Exception as e:print("Topic unavailable",region,tid,type(e).__name__,str(e)[:160])
    if not successful:raise RuntimeError("No official topic could be read; retain previous published data")
    state["posts"]=sorted(by.values(),key=lambda p:p.get("updatedAt") or "",reverse=True)[:150]
    # Keep fingerprints bounded; no update timestamp or commit for identical results.
    state["seen"]=dict(list(state["seen"].items())[-1500:]);state["topics"]=dict(list(state["topics"].items())[-600:])
    if json.dumps(state["posts"],sort_keys=True)!=old_posts:state["lastPublished"]=now()
    if not OUT.exists() or json.dumps(state,sort_keys=True)!=original:atomic_write(OUT,state)
    queue.sort(key=lambda q:q["updatedAt"],reverse=True)
    atomic_write(QUEUE,queue[:MAX_TRANSLATIONS])
    print("Official topic responses:",successful,"translation queue:",min(len(queue),MAX_TRANSLATIONS),"notices:",len(state["posts"]))
def translate():
    queue=json.loads(QUEUE.read_text()) if QUEUE.exists() else []
    if not queue:return
    import argostranslate.package as pkg
    import argostranslate.translate as tr
    from opencc import OpenCC
    if not any(p.from_code=="en" and p.to_code=="zh" for p in pkg.get_installed_packages()):
        pkg.update_package_index()
        model=next(p for p in pkg.get_available_packages() if p.from_code=="en" and p.to_code=="zh")
        pkg.install_from_path(model.download())
    cc=OpenCC("s2twp")
    state=read_state();by={p["identity"]:p for p in state["posts"]}
    def zh(s):
        value=cc.convert(tr.translate(s,"en","zh")).strip()
        if not re.search(r"[\u3400-\u9fff]",value):raise ValueError("No Chinese output")
        return value
    done=0
    for q in queue:
        try:
            p=by[q["identity"]];title=zh(q["title"]);sections=[]
            if Counter(re.findall(r"\d+(?:\.\d+)?",q["title"]))!=Counter(re.findall(r"\d+(?:\.\d+)?",title)):raise ValueError("Title numbers changed")
            for fact in q["facts"]:
                value=zh(fact)
                if Counter(re.findall(r"\d+(?:\.\d+)?",fact))!=Counter(re.findall(r"\d+(?:\.\d+)?",value)):continue
                sections.append({"category":"官方公告","title":"機器翻譯重點（待校對）","body":value})
            status="machine" if sections else "title-only"
            if not sections:sections=[{"category":"官方公告","title":"標題已翻譯","body":"內容未通過自動數值檢查或無可安全節錄的短條目，請閱官方原文。"}]
            p.update(title=title,sections=sections,translationStatus=status,translationEngine="Argos Translate + OpenCC")
            done+=1
        except Exception as e:print("Translation pending",q["identity"],type(e).__name__)
    if done:state["lastPublished"]=now();atomic_write(OUT,state)
    print("Translated notices:",done)
if __name__=="__main__":
    {"poll":poll,"translate":translate}[sys.argv[1]]()
