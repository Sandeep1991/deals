# DealFinder

A ChatGPT-style interface for querying deals from third-party partner ads. Uses hybrid search (keyword + semantic overlap) over a hardcoded ads catalog.

## Quick start with Docker

```bash
docker compose up --build
```

Open **http://localhost:3000**

Try queries like:
- `black tea` → links to [Tetley USA](https://www.tetleyusa.com/)
- `soap` → links to [Irish Spring](https://www.irishspring.com/en-us)

## Project structure

```
deals/
├── data/ads.txt          # Source ad catalog (pipe-delimited)
├── frontend/             # React + Vite app
│   ├── public/data/      # Ads served to the browser
│   └── src/
│       ├── search.ts     # Hybrid search logic
│       └── components/   # Chat UI components
├── Dockerfile
└── docker-compose.yml
```

## Local development (without Docker)

```bash
cd frontend
npm install
npm run dev
```

Runs at http://localhost:5173

## Ads data format

`data/ads.txt` uses pipe-delimited columns:

```
id|title|description|category|keywords|price|url
```

Edit this file to add or update partner deals.
