# MMS — Material / Master List Management

Monorepo for the MMS frontend (TanStack / React) and FastAPI backend.

## Project structure

```
MMS/
├── frontend/            # TanStack / React UI
├── backend/             # FastAPI MMS API (app, migrations, main.py, …)
└── docs/ARCHITECTURE.md
```

## Development

### Frontend

```sh
cd frontend
npm i
npm run dev
```

Or from repo root:

```sh
npm run dev
```

### Backend

```sh
cd backend
pip install -r requirements.txt
pip install -e .
python -m uvicorn main:app --reload --port 8001
```

Or from repo root: `npm run dev:backend`

API: `http://localhost:8001/api/v1/health`  
Vite proxies `/api/v1` → backend during frontend `npm run dev`.

For air-gapped install (wheels in `backend/offline_packages/`), see [backend/README.md](backend/README.md#offline-install-air-gapped).

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- FastAPI + SQLAlchemy + Oracle (`backend/`)
