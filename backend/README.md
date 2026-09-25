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

Set these values in the local, ignored `.env` file:

```env
SUPABASE_URL=https://vlehuwrquiprjumjrkbi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_backend_only_service_role_key
```

The service-role key must never be committed or exposed to the frontend.

Apply `migrations/20260926_create_vanta_core.sql` once through the Supabase SQL editor. It creates the VANTA schema and seeds three Hyderabad drivers and ten synthetic orders.

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

## Current MVP behavior

- Supabase stores orders, drivers, versioned plans and executable tasks.
- openrouteservice provides real road matrices and GeoJSON route geometry.
- OR-Tools produces capacity- and time-window-aware assignments.
- Delay simulation updates driver availability and creates a new plan version.
- Reassigned orders include an explicit before/after change reason.
- The API serializes frontend-facing fields in camelCase.
