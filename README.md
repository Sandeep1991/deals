# DealFinder

A ChatGPT-style interface for querying deals from third-party partner ads. Uses hybrid search (keyword + semantic overlap) over a hardcoded ads catalog.

## Deploy to Azure Static Web Apps (recommended)

This app is a static React SPA — no Docker or server required on Azure.

### One-time setup

1. In [Azure Portal](https://portal.azure.com), create a **Static Web App**
2. Connect it to `Sandeep1991/deals` on GitHub
3. Use these build settings:

   | Setting | Value |
   |---|---|
   | App location | `frontend` |
   | API location | *(leave empty)* |
   | Output location | `dist` |

4. Azure creates a GitHub Actions workflow and adds a deployment token secret automatically (e.g. `AZURE_STATIC_WEB_APPS_API_TOKEN_*`)

The workflow in this repo builds from `frontend/` and outputs to `dist/`. If you created the Static Web App in Azure Portal, update the portal build settings to match:

   | Setting | Value |
   |---|---|
   | App location | `frontend` |
   | API location | *(leave empty)* |
   | Output location | `dist` |

   > **Important:** Azure's default template often sets output to `build` — change it to `dist` for Vite.

### After deploy

Push to `main` and GitHub Actions builds + deploys automatically. Your app will be available at:

`https://<your-app-name>.azurestaticapps.net`

Try queries like:
- `black tea` → links to [Tetley USA](https://www.tetleyusa.com/)
- `soap` → links to [Irish Spring](https://www.irishspring.com/en-us)

## Quick start with Docker

```bash
docker compose up --build
```

Open **http://localhost:3000**

## Project structure

```
deals/
├── data/ads.txt              # Source ad catalog (pipe-delimited)
├── frontend/                 # React + Vite app
│   ├── staticwebapp.config.json
│   ├── src/data/ads.txt      # Bundled into JS at build time
│   └── src/
│       ├── search.ts         # Hybrid search logic
│       └── components/       # Chat UI components
├── .github/workflows/        # Azure Static Web Apps CI/CD
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

Edit this file to add or update partner deals. The `prebuild` script syncs it into `frontend/src/data/ads.txt` before each build.
