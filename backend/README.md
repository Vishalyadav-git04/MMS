# MMS — Material / Master List Management Service

FastAPI service for MMS.

```
backend/
├── app/                 # FastAPI application
├── migrations/          # Alembic migrations
├── tests/
├── main.py
├── pyproject.toml
├── alembic.ini
├── .env / .env.example
├── requirements.txt     # pinned runtime deps (offline-ready)
└── offline_packages/    # local wheels (build on online PC, copy offline)
```

## Online install

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -e .
```

Run MMS API on port 8001:

```bash
cd backend
python -m uvicorn main:app --reload --port 8001
```

API prefix: `/api/v1`

## Offline install (air-gapped)

Target: **Python 3.11** on **Windows amd64** (wheels match that platform).

### On a machine with internet (rebuild wheels if needed)

```powershell
cd backend
python -m venv venv-offline
.\venv-offline\Scripts\Activate.ps1
pip install -r requirements.txt
pip download -r requirements.txt -d offline_packages
```

Zip and copy to the offline PC:

- `backend/requirements.txt`
- `backend/offline_packages/`
- `backend/` app source (`app/`, `main.py`, `pyproject.toml`, `.env` as needed)

### On the offline machine

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --no-index --find-links=offline_packages -r requirements.txt
pip install --no-index --find-links=offline_packages -e .
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

To recreate the venv later: `Remove-Item -Recurse -Force venv` (cmd: `rmdir /s /q venv`), then repeat the offline install steps.

## Feature map (frontend ↔ backend)

| Frontend (`frontend/src/components/…`) | Backend (`app/…`) |
|----------------------------------------|-------------------|
| `mms/*` admin screens | `app/admin/*` |
| `ep/*` | `app/ep/` (scaffold) |
| `mlccs/*` | `app/mlccs/` (scaffold) |
| `ro/*` | `app/ro/` (scaffold) |
| `transfer/*` | `app/transfer/` (scaffold) |

## Oracle connection

Copy `.env.example` → `.env` (already matches SQL Developer **MISO 5.0**:
`SYSTEM` / `oracle` @ `localhost:1521/FREEPDB1`). Tables are owned by **SYSTEM**.

Check: `GET /api/v1/health/ready` → `{"status":"ready"}` when the pool is up.

## Admin endpoints (wired to Oracle)

| Method | Path | Table |
|--------|------|-------|
| POST | `/admin/capture-mlccs-details/generate` | `MMS_MLCCS_EQUIPMENT_MASTER` |
| POST | `/admin/capture-mlccs-details/lookup` | same |
| POST | `/admin/capture-mlccs-details/` | same |
| GET | `/admin/capture-mlccs-details/options` | MLCCS + `MMS_DOMAIN_VALUES` |
| GET/POST | `/admin/mms-domain-master/*` | `MMS_DOMAIN_VALUES` |
| GET | `/admin/mms-domain-master/suggest-domains` | same |
| POST | `/admin/search-regn-no/search` | `MMS_UNIT_MSTR_DETL` |
| POST | `/admin/unit-obsn-status/search` | `MMS_OBSN_DETL` |
| GET | `/admin/link-census-no-with-item-code/suggest-census` | `MMS_MLCCS_EQUIPMENT_MASTER` |
| GET | `/admin/link-census-no-with-item-code/lookup/{census_no}` | same |
| POST | `/admin/link-census-no-with-item-code/link` | same |
