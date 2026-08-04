# MMS — Material / Master List Management System

Monorepo for the MMS frontend (TanStack Start / React) and FastAPI backend.

---

## Project Structure

```
MMS/
├── frontend/            # TanStack / React UI (Port 3000) - See frontend/README.md
├── backend/             # FastAPI MMS API (Port 8000, /api) - See backend/README.md
└── docs/                # Architecture and FAQ documentation
```

---

## Environment Specifications

| Environment | Frontend URL | Backend API Base URL | Document Upload Path | Oracle Database Details |
|---|---|---|---|---|
| **Local** | `http://localhost:3000` | `http://localhost:8000/api/` | `D:/miso/` | `localhost:1521/FREEPDB1` (user/schema: `MMS`) |
| **Staging** | `http://131.3.54.120` | `http://131.3.54.120/api/` | `/srv/` | `131.3.54.122:1521/ORCLPDB1` |

---

## Development Setup

### 1. Frontend Setup (Port 3000)

```sh
cd frontend
npm install
npm run dev
```

Or from repo root:
```sh
npm run dev
```

The frontend interface will open on **http://localhost:3000**.

### 2. Backend Setup (Port 8000)

```sh
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -e .
python -m uvicorn main:app --reload --port 8000
```

Or from repo root:
```sh
npm run dev:backend
```

Backend API: `http://localhost:8000/api/health`  
Vite proxies `/api` → `http://localhost:8000` during frontend `npm run dev`.

For air-gapped installation details, see [backend/README.md](backend/README.md#offline-installation-air-gapped-environment).

---

## Production Build Verification

To verify production readiness:

```sh
npm run build
```

This runs `vite build` inside `frontend/` to generate production output in `frontend/.output`.

---

## Sub-module Documentation
- [Frontend Documentation](frontend/README.md)
- [Backend Documentation](backend/README.md)
