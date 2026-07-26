# Backend — MMS (Orbat / miso-5.0 pattern)

```
backend/
├── core/     # shared library (miso-core): config, db pool, auth, audit
├── mms/      # FastAPI service for this app
├── requirements.txt
└── requirements-dev.txt
```

Install:

```bash
pip install -r requirements.txt
pip install -e ./core
pip install -e ./mms
```

Run MMS API on port 8001:

```bash
cd mms
python -m uvicorn main:app --reload --port 8001
```
