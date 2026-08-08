# MMS — Architecture

Material / Master List Management.

## Decisions

| Area | Decision |
|------|----------|
| Frontend | **`frontend/`** — TanStack Start / React app (existing screens preserved) |
| Backend | **FastAPI MMS service** under `backend/`, with `app/` as the package |
| Shared lib | Auth, DB, and utils live inside `backend/app` (no separate core package) |
| Database | Oracle via `python-oracledb` + SQLAlchemy 2 + Alembic; local FreeDB tables owned by **SYSTEM** (`MMS_*`) |
| API | FastAPI service on port **8000**; Vite proxies API routes → backend |

## Layout

```
MMS/
├── frontend/                 # React + TanStack Start + TS
│   ├── src/
│   │   └── components/
│   │       ├── ep/
│   │       ├── mlccs/
│   │       ├── mms/
│   │       ├── ro/
│   │       ├── transfer/
│   │       └── ui/
│   ├── package.json
│   └── vite.config.ts        # proxies API routes → :8000
├── backend/
│   ├── main.py
│   ├── app/
│   │   ├── settings.py
│   │   ├── deps.py
│   │   ├── auth/             # JWT, principal, RBAC
│   │   ├── db/               # Oracle pool / SQLAlchemy
│   │   ├── api/
│   │   ├── admin/
│   │   ├── ep/
│   │   ├── mlccs/
│   │   ├── ro/
│   │   └── transfer/
│   ├── migrations/
│   ├── tests/
│   ├── pyproject.toml
│   └── requirements.txt
├── package.json              # root helpers → frontend / backend
└── docs/ARCHITECTURE.md
```

## Run

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend
pip install -r requirements.txt
pip install -e .
python -m uvicorn main:app --reload --port 8001
```

From repo root: `npm run dev` / `npm run dev:backend`
