"""Extract registered item-set thresholds from the pinned WoWSims Go source.
Only top-level active entries are read; commented TODOs are never bonuses.
No inferred numeric effect or claim of complete implementation.
"""
import json,re,sys
from pathlib import Path

TOKEN=re.compile(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|`[^`]*`|[A-Za-z_]\w*|\d+|[{}()[\]:,.=]')

def parse_sets(text,source):
    ts=[m.group() for m in TOKEN.finditer(text) if not m.group().startswith(("//","/*"))]
    rows=[]
    for i in range(len(ts)-6):
        if ts[i:i+6]!=["core",".","NewItemSet","(","core","."] or ts[i+6:i+8]!=["ItemSet","{"]:continue
        j=i+8;depth=1;fields={};bonuses=[]
        while j<len(ts) and depth:
            t=ts[j]
            if depth==1 and j+2<len(ts) and ts[j+1]==":":
                k,v=t,ts[j+2]
                if k in ("Name","AlternativeName") and v.startswith('"'):
                    fields[k]=json.loads(v)
                if k=="ID" and v.isdigit():fields[k]=int(v)
                if k=="Bonuses":
                    start=j+2
                    while start<len(ts) and ts[start]!="{":start+=1
                    if start>=len(ts):break
                    q=start+1;d=1
                    while q<len(ts) and d:
                        if d==1 and ts[q].isdigit() and q+2<len(ts) and ts[q+1]==":":
                            n=int(ts[q]);effect=ts[q+2]
                            if effect=="shared" and ts[q+3:q+5]==[".","ParsedSetBonus"]:
                                effect="ParsedSetBonus（客戶端法術效果）"
                            elif effect=="func":effect="內嵌原生效果"
                            if 1<=n<=14:bonuses.append({"pieces":n,"effect":effect})
                        if ts[q]=="{":d+=1
                        elif ts[q]=="}":d-=1
                        q+=1
                    j=q;continue
            if t=="{":depth+=1
            elif t=="}":depth-=1
            j+=1
        if fields.get("Name") and bonuses:
            rows.append({"name":fields["Name"],"id":fields.get("ID"),"alternativeName":fields.get("AlternativeName",""),"source":source,"bonuses":sorted(bonuses,key=lambda b:b["pieces"])})
    return rows

def main(root,output,commit):
    root=Path(root);rows=[]
    for path in sorted((root/"sim").rglob("*.go")):
        if path.name.endswith("_test.go"):continue
        text=path.read_text(encoding="utf-8")
        if "core.NewItemSet" in text:rows.extend(parse_sets(text,path.relative_to(root).as_posix()))
    if not rows:raise SystemExit("No registered set thresholds found")
    Path(output).write_text(json.dumps({"commit":commit,"sets":rows},ensure_ascii=False),encoding="utf-8")
    print("Registered set thresholds:",len(rows))
if __name__=="__main__":main(*sys.argv[1:])
