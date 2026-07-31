# Backend — MMS

```
backend/
├── mms/                 # FastAPI service
├── requirements.txt     # pinned runtime deps (offline-ready)
└── offline_packages/    # local wheels (build on online PC, copy offline)
```

## Online install

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -e ./mms
```

Run MMS API on port 8001:

```bash
cd mms
python -m uvicorn main:app --reload --port 8001
```

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
- `backend/mms/` (app source, including `.env` as needed)

### On the offline machine

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --no-index --find-links=offline_packages -r requirements.txt
pip install --no-index --find-links=offline_packages -e ./mms
cd mms
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

To recreate the venv later: `Remove-Item -Recurse -Force venv` (cmd: `rmdir /s /q venv`), then repeat the offline install steps.
