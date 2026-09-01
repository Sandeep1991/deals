# DealFinder API

FastAPI backend for Azure AI Search retrieval and optional RAG replies.

## Architecture

```
React  →  FastAPI (this service)  →  Azure AI Search
                ↓
         template / Ollama / Azure OpenAI (reply only)
```

Search runs in **Azure AI Search** (managed, scalable). This API is a thin orchestration layer — no vector DB or GPU required here unless you enable Ollama locally.

## Why not LangChain?

For this app, LangChain adds little value:

- Search is one Azure SDK call, not a multi-step agent
- Reply generation is a single prompt with retrieved context
- Fewer dependencies, easier debugging, lower cold-start time

Use LangChain later if you add agents, tool calling, or multi-step pipelines. Start with direct SDK calls.

## LLM strategy (cost vs quality)

| Provider | Cost | Speed | When to use |
|---|---|---|---|
| `template` (default) | Free | &lt;10ms | MVP, most queries |
| `ollama` + `llama3.2:1b` | Free (CPU) | 1–5s | Local dev, no Azure OpenAI |
| `azure_openai` + `gpt-4o-mini` | ~$0.15/1M tokens | &lt;1s | Production natural replies |

**Recommendation:** ship with `REPLY_PROVIDER=template`. Search quality comes from Azure AI Search (hybrid + semantic), not the LLM. Add `azure_openai` only when you want more conversational replies.

Avoid self-hosted Llama on Azure CPU at scale — cost and latency grow fast. If you need LLM in production, `gpt-4o-mini` is usually cheaper than running many CPU Container App replicas.

## Azure deployment: App Service vs Container Apps

| | App Service (Linux) | Container Apps |
|---|---|---|
| **Cost (low traffic)** | B1 ~$13/mo predictable | Consumption, can scale to zero |
| **Simplicity** | Excellent — `git deploy` or ZIP | Good — needs ACR + env config |
| **Scale out** | Manual / autoscale rules | KEDA, per-revision scaling |
| **Best for this API** | **Yes** — thin FastAPI, no GPU | Yes if you already use containers everywhere |

**Recommendation:** deploy this FastAPI API to **Azure App Service (Linux, B1 or S1)**. Keep Azure AI Search as the managed search tier. Do **not** run Llama in production on App Service unless you accept slow CPU inference.

Use **Container Apps** only if you need scale-to-zero or want Ollama as a separate internal service later.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/chat` | Search + generate reply |
| POST | `/api/search` | Search only |
| POST | `/api/ads` | Bulk upsert ads (pipeline) |
| PUT | `/api/ads/{id}` | Upsert single ad |
| DELETE | `/api/ads/{id}` | Delete ad |

### Chat request/response

```json
POST /api/chat
{ "query": "shower", "limit": 5 }

{
  "query": "shower",
  "reply": "I found 1 deal for \"shower\"...",
  "ads": [{ "id": "2", "title": "Irish Spring Body Wash", ... }],
  "results": [{ "ad": {...}, "score": 2.04, "keywordScore": 4.81, "semanticScore": 2.04 }]
}
```

## Local development

### Quick start (recommended)

```bash
cd backend
./run.sh
```

This creates `.venv`, installs dependencies, creates `.env` from `.env.example` if missing, and starts the server.

Then open http://localhost:8000/docs

### Manual start

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then set AZURE_SEARCH_API_KEY
uvicorn app.main:app --reload --port 8000
```

**Important:** always run from the `backend/` directory (or use `./run.sh`). Running `uvicorn` from the repo root will fail with `ModuleNotFoundError: No module named 'app'`.

### Configure Azure Search

Edit `backend/.env`:

```env
AZURE_SEARCH_ENDPOINT=https://dealssearch.search.windows.net
AZURE_SEARCH_API_KEY=<your-admin-or-query-key>
AZURE_SEARCH_INDEX=ads
AZURE_SEARCH_SEMANTIC_CONFIG=ads-semantic
```

Get the key from Azure Portal → your Search service → **Keys**.

Verify:

```bash
curl http://localhost:8000/health
# search_configured should be true after setting the key

curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"shower"}'
```

### Docker

```bash
cp backend/.env.example backend/.env   # add your API key
docker compose up --build api
```

### Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: No module named 'app'` | Run from `backend/` or use `./run.sh` |
| `search_configured: false` | Set `AZURE_SEARCH_API_KEY` in `backend/.env` and restart |
| `503` on `/api/chat` | Same — missing or invalid Search credentials |
| `docker compose up` only starts frontend | Run `docker compose up api` (api is a separate service) |
| Port 8000 in use | `lsof -i :8000` and stop the other process |

## Environment variables

See `.env.example`. Required for search:

- `AZURE_SEARCH_ENDPOINT`
- `AZURE_SEARCH_API_KEY`
- `AZURE_SEARCH_INDEX` (default: `ads`)
- `AZURE_SEARCH_SEMANTIC_CONFIG` (default: `ads-semantic`)

## Search behavior

- **Literal queries** (`shower`, `soap`, `tea`): keyword search first, score threshold filters weak matches
- **Meaning queries** (`discount`, `deal`, `cheap`): hybrid + semantic + vector
- **Fallback**: if keyword returns nothing, retries with hybrid (catches paraphrases)

Tune thresholds via `MIN_RERANKER_SCORE` and `MIN_SEARCH_SCORE`.

## Pipeline integration

After extraction, push ads to the index:

```bash
curl -X POST http://localhost:8000/api/ads \
  -H "Content-Type: application/json" \
  -d '{
    "ads": [{
      "id": "7",
      "title": "Starbucks Pike Place Roast",
      "description": "Medium roast ground coffee. 20% off with subscription.",
      "category": "beverages",
      "keywords": "coffee,ground coffee,morning,beverage,discount,deal",
      "price": "$11.99",
      "url": "https://www.starbucks.com/"
    }]
  }'
```

Delete:

```bash
curl -X DELETE http://localhost:8000/api/ads/7
```

Note: upserting via this API updates searchable fields in Azure AI Search. If your index uses integrated vectorization, re-indexing may require the indexer/wizard to regenerate `contentVector` — check your index setup.
