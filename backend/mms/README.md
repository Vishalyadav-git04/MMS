# MMS — Material / Master List Management Service

FastAPI service for MMS (same pattern as miso-5.0 `backend/orbat`).

## Run

```bash
# from repo: backend/
pip install -r requirements.txt
pip install -e ./core
pip install -e ./mms

cd mms
python -m uvicorn main:app --reload --port 8001
```

API prefix: `/api/v1`

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
| POST | `/admin/search-regn-no/search` | `MMS_UNIT_MSTR_DETL` |
| POST | `/admin/unit-obsn-status/search` | `MMS_OBSN_DETL` |
| POST | `/admin/link-census-no-with-item-code/link` | `MMS_MLCCS_EQUIPMENT_MASTER` |
