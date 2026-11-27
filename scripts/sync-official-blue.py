"""Poll public Blizzard Forever forum JSON, retaining only staff-authored notices.
No third-party tracker, paid translation API, raw post HTML, or player content is published.
"""
import json, re, time, hashlib, sys, os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"official-blue-live.json"
QUEUE=Path(os.environ.get("RUNNER_TEMP","/tmp"))/"tomb-blue-queue.json"
CATEGORIES={"us":[347,352],"eu":[359]}
SEEDS={"us":[2403040,2429007,2429074,2416343,2415068],"eu":[]}
AGENT="TombGuildDatabase/1.0 (public WoW notices; low-rate polling)"
MAX_TOPICS=12
MAX_TRANSLATIONS=6
ROBOTS={}
def now(): return datetime.now(timezone.utc).isoformat()
def base(region): return "https://"+region+".forums.blizzard.com"
def fetch(url, parse=True):
    p=urlparse(url)
    if p.scheme!="https" or p.netloc not in ("us.forums.blizzard.com","eu.forums.blizzard.com"): raise ValueError("untrusted source")
    if p.path!="/robots.txt":
        if p.netloc not in ROBOTS:
            rp=RobotFileParser();rp.parse(fetch("https://"+p.netloc+"/robots.txt",False).splitlines());ROBOTS[p.netloc]=rp
        if not ROBOTS[p.netloc].can_fetch(AGENT,url): raise ValueError("robots policy excludes path")
    time.sleep(.8)
    with urlopen(Request(url,headers={"User-Agent":AGENT,"Accept":"application/json" if parse else "text/plain"}),timeout=15) as r:
        if urlparse(r.geturl()).netloc!=p.netloc: raise ValueError("redirect outside official host")
        raw=r.read(8_000_001)
        if len(raw)>8_000_000: raise ValueError("response too large")
        return json.loads(raw) if parse else raw.decode("utf-8")
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
    m=re.search(r"/t/(?:[^/]+/)?(\d+)(?:/(\d+))?/?$",p.path)
    return canon(p.netloc.split(".")[0],m[1],m[2] or 1) if m else None
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
    topics={i:{"id":i,"pinned":True} for i in SEEDS[region]}
    for cat in CATEGORIES[region]:
        try:
            d=fetch(base(region)+f"/en/wow/c/{cat}/l/latest.json")
            for t in d["topic_list"]["topics"]:
                if t.get("id"):topics[t["id"]]=t
        except Exception as e: print("Category unavailable",region,cat,type(e).__name__,str(e)[:160])
    def priority(t):
        key=region+":"+str(t["id"])
        return (0 if t["id"] in SEEDS[region] else 1,0 if t.get("pinned") else 1,0 if key not in state["topics"] else 1)
    candidates=sorted(topics.values(),key=priority)
    return candidates[:MAX_TOPICS]
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
    state=read_state();original=json.dumps(state,sort_keys=True);archive=archive_keys();by={p["identity"]:p for p in state["posts"]};queue=[];successful=0
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
                if missing and tid in SEEDS[region]:
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
                    fingerprint=hashlib.sha256((title+"\n"+body).encode()).hexdigest()
                    old=state["seen"].get(identity)
                    state["seen"][identity]=fingerprint
                    if identity in archive and old is None and identity not in by:continue
                    if old==fingerprint and by.get(identity,{}).get("translationStatus")=="machine":continue
                    if old==fingerprint and identity in archive and identity not in by:continue
                    url=base(region)+f"/en/wow/t/{tid}/{n}"
                    changed=identity in by or identity in archive
                    item={"identity":identity,"key":archive.get(identity,"official-"+identity),"date":stamp.date().isoformat(),"publishedAt":p.get("created_at"),"updatedAt":dt,"title":"官方新公告（繁中翻譯待處理）","author":str(p.get("username") or "Blizzard"),"url":url,"region":region.upper(),"translationStatus":"pending","sections":[{"category":"官方公告","title":"官方已發布","body":"已偵測到暴雪公告；繁中重點尚未完成，請先閱讀官方原文。"}],"revision":changed}
                    if identity not in by or old!=fingerprint:by[identity]=item
                    queue.append({"identity":identity,"title":title,"facts":selected_facts(body)})
                state["topics"][region+":"+str(tid)]=str(d.get("last_posted_at") or t.get("last_posted_at") or "")
            except Exception as e:print("Topic unavailable",region,tid,type(e).__name__,str(e)[:160])
    if not successful:raise RuntimeError("No official topic could be read; retain previous published data")
    state["posts"]=sorted(by.values(),key=lambda p:p.get("updatedAt") or "",reverse=True)[:150]
    # Keep fingerprints bounded; no update timestamp or commit for identical results.
    state["seen"]=dict(list(state["seen"].items())[-1500:]);state["topics"]=dict(list(state["topics"].items())[-600:])
    if json.dumps(state,sort_keys=True)!=original:
        state["lastPublished"]=now();atomic_write(OUT,state)
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
            for fact in q["facts"]:
                value=zh(fact)
                if Counter(re.findall(r"\d+(?:\.\d+)?",fact))!=Counter(re.findall(r"\d+(?:\.\d+)?",value)):continue
                sections.append({"category":"官方公告","title":"機器翻譯重點（待校對）","body":value})
            if not sections:sections=[{"category":"官方公告","title":"標題已翻譯","body":"內容未通過自動數值檢查或無可安全節錄的短條目，請閱官方原文。"}]
            p.update(title=title,sections=sections,translationStatus="machine",translationEngine="Argos Translate + OpenCC")
            done+=1
        except Exception as e:print("Translation pending",q["identity"],type(e).__name__)
    if done:state["lastPublished"]=now();atomic_write(OUT,state)
    print("Translated notices:",done)
if __name__=="__main__":
    {"poll":poll,"translate":translate}[sys.argv[1]]()
