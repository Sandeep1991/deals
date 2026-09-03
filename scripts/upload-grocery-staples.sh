#!/usr/bin/env bash
# Upload data/grocery-staples.json to Azure AI Search.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JSON="$ROOT/data/grocery-staples.json"

if [[ -f "$ROOT/../deals-backend/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/../deals-backend/.env"
  set +a
elif [[ -f "$ROOT/backend/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/backend/.env"
  set +a
fi

: "${AZURE_SEARCH_ENDPOINT:?Set AZURE_SEARCH_ENDPOINT}"
: "${AZURE_SEARCH_API_KEY:?Set AZURE_SEARCH_API_KEY}"
INDEX="${AZURE_SEARCH_INDEX:-ads}"

python3 - <<PY
import json, os, urllib.request
from pathlib import Path

endpoint = os.environ["AZURE_SEARCH_ENDPOINT"].rstrip("/")
key = os.environ["AZURE_SEARCH_API_KEY"]
index = os.environ.get("AZURE_SEARCH_INDEX", "ads")
ads = json.loads(Path("$JSON").read_text())["ads"]
payload = {"value": [{"@search.action": "mergeOrUpload", **ad} for ad in ads]}
url = f"{endpoint}/indexes/{index}/docs/index?api-version=2024-07-01"
req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json", "api-key": key}, method="POST")
with urllib.request.urlopen(req) as resp:
    body = json.loads(resp.read().decode())
ok = sum(1 for r in body["value"] if r.get("status"))
print(f"Uploaded {ok}/{len(ads)} grocery staples to {index}")
PY
