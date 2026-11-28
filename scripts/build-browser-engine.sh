#!/usr/bin/env bash
# Build the exact upstream engine with embedded version-matched item DB.
# No remote requests are made by the resulting browser worker.
set -euo pipefail
site="$(realpath "$1")"
root="$(realpath "$2")"
commit=3b9c125a9b1387cd53ce2bb12969e0c6b54b813e
test "$(git -C "$root" rev-parse HEAD)" = "$commit"
cd "$root"
test -s assets/database/db.bin
test -f assets/database/leftover_db.bin
go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.36.12
export PATH="$(go env GOPATH)/bin:$PATH"
make sim/core/proto/api.pb.go
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# with_db is essential: upstream browser normally injects UI database rows per request.
GOOS=js GOARCH=wasm CGO_ENABLED=0 go build -tags=with_db -ldflags="-w -s" -o "$tmp/lib.wasm" ./sim/wasm
if command -v wasm-opt >/dev/null 2>&1; then
  wasm-opt -O3 --enable-sign-ext --enable-nontrapping-float-to-int --enable-mutable-globals --enable-bulk-memory "$tmp/lib.wasm" -o "$tmp/lib.opt.wasm"
  mv "$tmp/lib.opt.wasm" "$tmp/lib.wasm"
fi
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" "$tmp/wasm_exec.js"
cp LICENSE "$tmp/LICENSE"
cp "$site/scripts/export-engine-items.go" "$root/gt_export_engine_items.go"
go run "$root/gt_export_engine_items.go" > "$tmp/items.json"
rm "$root/gt_export_engine_items.go"
# Verify a real engine call before exposing the ready manifest.
node "$site/tests/wasm-engine-smoke.cjs" "$tmp" "$site"
gzip -9 -n "$tmp/lib.wasm"
python3 - "$tmp" "$commit" <<'PY'
import hashlib,json,sys
from pathlib import Path
p=Path(sys.argv[1]); names=["lib.wasm.gz","wasm_exec.js","items.json","LICENSE"]
d={"format":"tomb-wasm/1","commit":sys.argv[2],"engine":"WoWSims Forever v1.0.12","verified":True,"assets":{n:{"bytes":(p/n).stat().st_size,"sha256":hashlib.sha256((p/n).read_bytes()).hexdigest()} for n in names}}
(p/"manifest.json").write_text(json.dumps(d),encoding="utf-8")
PY
mkdir -p "$site/native-engine"
for f in lib.wasm.gz wasm_exec.js items.json LICENSE; do cp "$tmp/$f" "$site/native-engine/$f"; done
cp "$tmp/manifest.json" "$site/native-engine/manifest.json"
