"""Join version-matched item appearances with the community texture listfile."""
import csv,json,re,sys
from pathlib import Path

def table(path,required):
    with Path(path).open(encoding="utf-8-sig",newline="") as f:
        rows=csv.DictReader(f)
        if not set(required).issubset(rows.fieldnames or []):
            raise ValueError("Unexpected schema: "+str(path))
        return list(rows)

def map_items(appearances,modified,lines):
    icons={}
    for line in lines:
        key,_,path=line.strip().partition(";")
        m=re.search(r"(?:^|/)icons/([a-z0-9_]+)[.]blp$",path.replace(chr(92),"/").lower())
        if key.isdigit() and m:icons[key]=m.group(1)
    by_appearance={r["ID"]:icons.get(r["IconFileDataID"]) for r in appearances}
    candidates={}
    for r in modified:
        if r.get("ItemAppearanceModifierID")!="0":continue
        iid=r["ItemID"];icon=by_appearance.get(r["ItemAppearanceID"])
        if iid.isdigit() and int(iid)>0 and icon:candidates.setdefault(iid,set()).add(icon)
    return {k:next(iter(v)) for k,v in candidates.items() if len(v)==1}

def main():
    root,listing,output,build=sys.argv[1:]
    root=Path(root)
    a=table(root/"ItemAppearance.csv",["ID","IconFileDataID"])
    m=table(root/"ItemModifiedAppearance.csv",["ItemID","ItemAppearanceID","ItemAppearanceModifierID"])
    with open(listing,encoding="utf-8-sig",errors="replace") as f:items=map_items(a,m,f)
    if not items:raise ValueError("No verified item icon mappings")
    Path(output).write_text(json.dumps({"build":build,"items":items},separators=(",",":")),encoding="utf-8")
    print("Mapped item icons:",len(items))
if __name__=="__main__":main()
