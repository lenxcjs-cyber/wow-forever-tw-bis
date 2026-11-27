"""Version local JS/CSS asset references using content hashes before Pages deploy."""
from pathlib import Path
import hashlib
import json
import re

def stamp(text, root):
    def replace(match):
        attr, quote, filename = match.groups()
        source = root / filename
        if not source.is_file():
            return match.group(0)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
        return f"{attr}={quote}{filename}?v={digest}{quote}"
    return re.sub(r'''(src|href)=(["'])([A-Za-z0-9_-]+[.](?:js|css))(?:[?][^"']*)?\2''', replace, text)

if __name__ == "__main__":
    root = Path(".")
    # Keep legacy standalone blue pages identical to the current homepage dataset.
    main_js = (root / "guild-tools.js").read_text(encoding="utf-8")
    blue_match = re.search(r"const bluePosts=(\[.*?\]);\nfunction specHotfixes", main_js, re.S)
    if not blue_match:
        raise ValueError("Homepage blue-post registry missing")
    posts = json.loads(blue_match.group(1))
    assert len({p["key"] for p in posts}) == len(posts)
    blue_json = json.dumps(posts, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    for name in ("index.html", "talents.html", "blue-posts.html", "blue-18-3.html"):
        p = root / name
        if p.exists():
            old = p.read_text(encoding="utf-8")
            new = old.replace("墓鐘公會用資料庫", "墓鐘資料庫")
            new = re.sub(r"<title>[^<]*</title>", "<title>墓鐘資料庫</title>", new, count=1)
            if name in ("index.html", "talents.html") and "locale-zhTW.js" not in new:
                scripts = '<script src="locale-data.js"></script><script src="locale-zhTW.js"></script>'
                new = re.sub(r'<script\b[^>]*src=["\'](?:guild-tools|talents-page)\.js[^"\']*["\'][^>]*>', lambda m: scripts + m.group(0), new, count=1)
            if name in ("blue-posts.html", "blue-18-3.html"):
                new, n = re.subn(r"const posts=\[.*?\];const q=", lambda _: "const posts="+blue_json+";const q=", new, count=1, flags=re.S)
                if n != 1:
                    raise ValueError("Standalone blue-post data missing: "+name)
                new = new.replace("V18.3｜", "V18.9｜")
                new = new.replace("下方摘要預設收合", "下方改動整理預設收合")
                new = new.replace("[s.title,s.body,s.category]", "[s.title,s.body,s.category,s.impact||'']")
                new = new.replace('content.append(el("h3",section.title),el("p",section.body));', 'content.append(el("h3",section.title),el("p",section.body));if(section.impact)content.append(el("p","配裝／遊玩提醒："+section.impact,"muted"));')
                new = new.replace('const expanded=new Set();', 'const expanded=new Set();for(const cat of new Set(posts.flatMap(p=>p.sections.map(s=>s.category)))){if(!Array.from(c.options).some(o=>o.value===cat)){const o=el("option",cat);o.value=cat;c.append(o);}}')
            new = stamp(new, root)
            if new != old:
                p.write_text(new, encoding="utf-8")
                print("Stamped", name)
