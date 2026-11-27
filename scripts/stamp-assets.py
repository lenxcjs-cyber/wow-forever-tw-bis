"""Version local JS/CSS asset references using content hashes before Pages deploy."""
from pathlib import Path
import hashlib
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
    for name in ("index.html", "talents.html", "blue-posts.html", "blue-18-3.html"):
        p = root / name
        if p.exists():
            old = p.read_text(encoding="utf-8")
            new = old.replace("墓鐘公會用資料庫", "墓鐘資料庫")
            new = re.sub(r"<title>[^<]*</title>", "<title>墓鐘資料庫</title>", new, count=1)
            if name in ("index.html", "talents.html") and "locale-zhTW.js" not in new:
                scripts = '<script src="locale-data.js"></script><script src="locale-zhTW.js"></script>'
                new = re.sub(r'<script\b[^>]*src=["\'](?:guild-tools|talents-page)\.js[^"\']*["\'][^>]*>', lambda m: scripts + m.group(0), new, count=1)
            new = stamp(new, root)
            if new != old:
                p.write_text(new, encoding="utf-8")
                print("Stamped", name)
