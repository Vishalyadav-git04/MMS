# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Project structure

```
MMS/
├── frontend/            # TanStack / React UI (existing screens)
├── backend/
│   ├── core/            # Shared Oracle/config/auth (miso-5.0 pattern)
│   └── mms/             # FastAPI MMS API (Orbat-style service)
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
pip install -e ./core
pip install -e ./mms
cd mms
python -m uvicorn main:app --reload --port 8001
```

Or from repo root: `npm run dev:backend`

API: `http://localhost:8001/api/v1/health`  
Vite proxies `/api/v1` → backend during frontend `npm run dev`.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- FastAPI + SQLAlchemy + Oracle (`backend/`)
