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

## Location and Google Maps

Every `POST /api/issues` request must include `latitude` and `longitude`. The frontend should request the browser's current location when the user selects a photo, show a Google Maps marker, and let the user correct the pin before submission.

Optional location fields are:

- `location_accuracy_meters`: value from `position.coords.accuracy`.
- `location_source`: `gps` or `manual`.
- `address`: a Google Maps formatted address, when already resolved by the frontend.

Set `GOOGLE_MAPS_API_KEY` on the backend to reverse-geocode coordinates when the frontend does not supply an address. Keep this server key out of frontend code. The frontend should use a separate browser-restricted Maps JavaScript API key.

Example multipart payload:

```text
image=<file>
description=Large pothole blocking the left lane
latitude=17.3850
longitude=78.4867
location_accuracy_meters=12.4
location_source=gps
```

## Current MVP behavior

- Supabase Postgres stores issues, departments, reports, and status events.
- Supabase Storage stores citizen images and CCTV frames.
- Exact duplicate submissions are grouped using an idempotency key.
- Nearby existing issues increase the duplicate count.
- Nearby means the same predicted category within `DUPLICATE_RADIUS_METERS` using GPS distance.
- Groq classification is optional and returns structured JSON when configured.
- YOLO and CCTV are adapter points with safe mock behavior until model weights and a camera source are connected.
- Department routing and priority calculation are deterministic.
