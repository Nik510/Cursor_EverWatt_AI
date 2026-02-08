## hvac_compute (Python FastAPI)

This is the HVAC compute microservice (QA → FDD → hybrid calibration → optimization).

### Run locally

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

### Endpoints

- `GET /health`
- `POST /v1/analyze` (contract mirrors `src/modules/hvac/optimizer-contract.ts`)

