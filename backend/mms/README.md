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

## Admin endpoints (from miso template)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/admin/capture-mlccs-details/generate` | Generate census no |
| POST | `/admin/capture-mlccs-details/lookup` | Load record |
| POST | `/admin/capture-mlccs-details` | Save / update |
| GET | `/admin/capture-mlccs-details/options` | Dropdown options |

Existing UI screens are not modified; connect them to these APIs when ready.
