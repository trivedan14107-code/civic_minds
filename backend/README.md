# VANTA Backend

VANTA is an autonomous delivery operations engine. It assigns orders to drivers with OR-Tools, uses openrouteservice for road distance/time and route geometry, and re-plans unfinished deliveries when conditions change.

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

The backend currently uses the existing `civic-minds` Supabase project while keeping VANTA data in separate `vanta_*` tables. Set these values in the local, ignored `.env` file:

```env
SUPABASE_URL=https://vlehuwrquiprjumjrkbi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_backend_only_service_role_key
```

The service-role key must never be committed or exposed to the frontend.

Apply `migrations/20260926_create_vanta_core.sql` once through the Supabase SQL editor. It creates and seeds three Hyderabad drivers and ten synthetic orders without changing the older CivicMind tables.

## Routing configuration

Create a free openrouteservice key and add it to the ignored `.env` file:

```env
OPENROUTESERVICE_API_KEY=your_key
```

The backend calls openrouteservice only from the server. Matrix responses are cached in memory. When the provider or key is unavailable, VANTA falls back to straight-line distance with a conservative city-road multiplier so the demo remains usable.

## Optimization

Google OR-Tools runs locally and has no per-request cost. The current vehicle-routing model supports:

- Driver capacities.
- Driver shift windows.
- Order delivery windows.
- Service time at each stop.
- High and urgent order penalties.
- Locked in-progress tasks during re-planning.
- A short deterministic solve limit suitable for a demo.

Groq is optional and must not calculate routes or assignments.

## VANTA API

- `GET /api/health`
- `GET /api/dashboard`
- `GET|POST /api/orders`
- `GET /api/orders/{order_id}`
- `GET|POST /api/drivers`
- `GET /api/drivers/{driver_id}`
- `GET /api/plans/active`
- `POST /api/plans/optimize`
- `POST /api/simulations/driver-delay`
- `PATCH /api/tasks/{task_id}/status`

OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

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

- Supabase stores orders, drivers, versioned plans and executable tasks.
- openrouteservice provides real road matrices and GeoJSON route geometry.
- OR-Tools produces capacity- and time-window-aware assignments.
- Delay simulation updates driver availability and creates a new plan version.
- Reassigned orders include an explicit before/after change reason.
- The API serializes frontend-facing fields in camelCase.

The older CivicMind endpoints and tables remain temporarily available for rollback while the team completes the product pivot.
