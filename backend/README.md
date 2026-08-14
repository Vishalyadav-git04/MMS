# MMS Backend — Material / Master List Management Service

FastAPI service for MMS providing REST APIs for all MMS modules.

---

## Directory Structure

```
backend/
├── app/                 # FastAPI application source
│   ├── admin/           # Admin module APIs (MLCCS Capture, Domain Master, Links, Unit Obsn)
│   ├── api/             # API Router, public/health/auth routes, file upload routes
│   │   ├── routes/      # Individual API route handlers (auth, health, upload)
│   │   └── router.py    # Aggregated API router mounted at root
│   ├── auth/            # Authentication & JWT services
│   ├── dashboard/       # Dashboard counts & metrics APIs
│   ├── db/              # SQLAlchemy & Oracle pool session management
│   ├── deps.py          # Dependency injection & Auth guards
│   ├── ep/              # EP Stores module APIs (Domain Master, Gen Census, Capture, IUT)
│   ├── mlccs/           # MLCCS View module APIs
│   ├── models/          # SQLAlchemy ORM models (mapped to MMS Oracle schema)
│   ├── ro/              # Release Order (RO) module APIs
│   ├── services/        # Service layer (Document upload to UPLOAD_PATH, etc.)
│   ├── settings.py      # App settings (Pydantic BaseSettings loading from .env)
│   ├── transfer/        # Transfer module APIs (Inter Unit, Depot to Depot, Unit to Depot)
│   └── unit_holding/    # Unit Holding module APIs (Add/Approve/Update Eqpt Data)
├── migrations/          # DB migrations
├── offline_packages/    # Pre-downloaded wheels for air-gapped installation
├── tests/               # Backend pytest test suite
├── main.py              # Application entrypoint (FastAPI app & lifecycle pool creation)
├── pyproject.toml       # Package metadata
├── requirements.txt     # Pinned Python dependencies
├── .env                 # Local environment configuration
├── .env.staging         # Staging environment configuration
└── .env.example         # Example environment template
```

---

## Environment Setup & Configuration

The service loads configuration parameters via environment variables or `.env` files.

### Environment Specification

| Setting | Local Environment | Staging Environment |
|---|---|---|
| **API Base URL** | `http://localhost:8000/` | `http://131.3.54.120/` |
| **API Prefix** | `""` | `""` |
| **Upload Path** | `D:/MISO/MMS/` | `/srv/` |
| **DB DSN** | `localhost:1521/FREEPDB1` | `131.3.54.122:1521/ORCLPDB1` |
| **DB User / Schema** | `MMS` / `MMS` | `MMS` / `ORCLPDB1` |
| **CORS Origins** | `http://localhost:3000`, `http://localhost:8000`, `http://131.3.54.120`, `https://131.3.54.120` | `http://131.3.54.120`, `https://131.3.54.120` |

---

## Online Installation & Execution

```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Install runtime dependencies:
pip install -r requirements.txt

# Run MMS backend API on port 8000:
python -m uvicorn main:app --reload --port 8000
```

The API will be live at:
- **Base URL**: `http://localhost:8000`
- **Health check**: `http://localhost:8000/health`
- **OpenAPI Docs**: `http://localhost:8000/docs`

---

## Document Upload to File System

Uploaded documents are saved to the file system at `UPLOAD_PATH` (`D:/MISO/MMS/` locally, `/srv/` on staging).

- **Upload Endpoint**: `POST /upload`
- **Request**: Multipart Form Data (`file`)
- **Response**: Returns document filename, relative path, absolute path, and file size.
- **Service Handler**: `app/services/upload.py`

---

## Offline Installation (Air-Gapped Environment)

Target: **Python 3.11** on **Windows amd64**.

### On an Internet-Connected PC (to refresh offline packages)

```powershell
cd backend
python -m venv venv-offline
.\venv-offline\Scripts\Activate.ps1
pip install -r requirements.txt
pip download -r requirements.txt -d offline_packages
```

### On the Air-Gapped / Offline Machine

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --no-index --find-links=offline_packages -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
