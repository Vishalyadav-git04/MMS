# MMS — Architecture

Material / Master List Management. Layout mirrors **miso-5.0** (ORBAT pattern).

## Decisions

| Area | Decision |
|------|----------|
| Frontend | **`frontend/`** — TanStack Start / React app (existing screens preserved) |
| Backend | **FastAPI MMS service** under `backend/mms`, same shape as miso `backend/orbat` |
| Shared lib | Auth, DB, and utils live inside `backend/mms/app` (no separate core package) |
| Database | Oracle via `python-oracledb` + SQLAlchemy 2 + Alembic; local FreeDB tables owned by **SYSTEM** (`MMS_*`) |
| API | `/api/v1` on port **8001**; Vite proxies `/api/v1` → backend |

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
│   └── vite.config.ts        # proxies /api/v1 → :8001
├── backend/
│   ├── mms/                  # FastAPI service
│   │   ├── main.py
│   │   ├── app/
│   │   │   ├── settings.py
│   │   │   ├── deps.py
│   │   │   ├── auth/         # JWT, principal, RBAC
│   │   │   ├── db/           # Oracle pool / SQLAlchemy
│   │   │   ├── api/
│   │   │   ├── admin/
│   │   │   ├── ep/
│   │   │   ├── mlccs/
│   │   │   ├── ro/
│   │   │   └── transfer/
│   │   └── migrations/
│   ├── requirements.txt
│   └── requirements-dev.txt
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
pip install -e ./mms
cd mms
python -m uvicorn main:app --reload --port 8001
```

From repo root: `npm run dev` / `npm run dev:backend`
