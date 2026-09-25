# CivicMind Backend

## Local setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

## Supabase configuration

The backend uses the `civic-minds` Supabase project. Set these values in the local, ignored `.env` file:

```env
SUPABASE_URL=https://vlehuwrquiprjumjrkbi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_backend_only_service_role_key
```

The service-role key must never be committed or exposed to the frontend.

The project contains private Storage buckets named `issue-images` and `cctv-frames`.

## Groq configuration

Set `GROQ_API_KEY` in the local, ignored `.env` file. Never commit `.env` or an API key. If the key is not configured, the backend returns a safe manual-review result so the rest of the demo still works.

## Current MVP behavior

- Supabase Postgres stores issues, departments, reports, and status events.
- Supabase Storage stores citizen images and CCTV frames.
- Exact duplicate submissions are grouped using an idempotency key.
- Nearby existing issues increase the duplicate count.
- Groq classification is optional and returns structured JSON when configured.
- YOLO and CCTV are adapter points with safe mock behavior until model weights and a camera source are connected.
- Department routing and priority calculation are deterministic.
