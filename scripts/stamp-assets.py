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
    for name in ("index.html", "talents.html", "blue-posts.html"):
        p = root / name
        if p.exists():
            old = p.read_text(encoding="utf-8")
            new = stamp(old, root)
            if new != old:
                p.write_text(new, encoding="utf-8")
                print("Stamped", name)
