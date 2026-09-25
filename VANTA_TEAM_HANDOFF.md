# VANTA Team Handoff

## 1. Product we are building

VANTA is an autonomous delivery operations engine. It decides which driver should deliver each order, in what sequence, and on which route. When a driver is delayed, a vehicle becomes unavailable, or an urgent order arrives, VANTA recalculates the remaining plan.

VANTA is not a new customer delivery application. It is a backend decision engine with:

- A dispatcher web dashboard.
- A small mobile-friendly driver view.
- APIs that could later connect to an existing order or driver application.

The hackathon demonstration must prove this loop:

```text
Observe -> Optimize -> Assign -> Monitor -> Re-plan
```

## 2. MVP demo story

1. The dispatcher opens a map containing 3 drivers and 10 unassigned orders.
2. The dispatcher clicks **Generate Plan**.
3. VANTA assigns orders to drivers and returns an ordered route for each driver.
4. The UI draws each route in a different color and displays ETAs and utilization.
5. The presenter simulates a delay for one driver.
6. VANTA recalculates only the unfinished work.
7. The UI highlights what changed and shows the estimated time/distance saved.
8. The driver view shows only that driver's next stop and ordered task list.

Do not add payments, chat, ratings, full customer accounts, or production navigation. Those features do not prove the core intelligence.

## 3. Free technology stack

### Frontend

- React + Vite + TypeScript
- Tailwind CSS
- MapLibre GL JS
- OpenFreeMap map style/tiles
- TanStack Query for API state and polling
- Recharts only if a small metrics chart is useful
- Browser Fetch API through one typed API module

### Backend

- Python 3.12
- FastAPI
- Supabase Postgres
- Google OR-Tools installed locally for vehicle-routing optimization
- openrouteservice for road distance/time matrices and route geometry
- Pytest

### Important map rule

Do not use Google Maps, Mapbox, or paid map services. The frontend map must use MapLibre and OpenFreeMap. GPS uses the browser's built-in geolocation API and has no API cost.

## 4. Ownership split

| Area | Frontend developer - Antigravity | Backend developer - Codex |
|---|---|---|
| Product UI | Own | Support contract |
| Map rendering and markers | Own | Return coordinates and route GeoJSON |
| Forms and validation feedback | Own | Validate again on server |
| Loading/error/empty states | Own | Return consistent HTTP errors |
| Orders, drivers, tasks database | Consume | Own |
| Optimization algorithm | Display results | Own |
| Distance/time matrix | Never call provider directly | Own |
| Re-planning and simulations | Trigger and visualize | Own |
| Supabase secrets | Never receive | Own |
| openrouteservice key | Never receive | Own |
| End-to-end tests | UI smoke tests | API and optimizer tests |
| Git branch | `frontend/dashboard` | `codex/backend-ai` |

## 5. Frontend developer responsibilities

### Required screens

#### A. Operations Dashboard - `/`

This is the main demo screen.

Layout:

- Top bar: VANTA logo/name, backend health indicator, current plan status.
- Left panel: orders and drivers summary.
- Center: MapLibre map.
- Right panel: active plan, alerts and simulation controls.
- Top metrics: unassigned orders, active drivers, on-time percentage, total planned distance.

Map requirements:

- Order markers must visually distinguish unassigned, assigned, delivered and failed states.
- Driver markers must show available, active, delayed and offline states.
- Every driver route must have a stable, distinct color.
- Clicking a marker opens a small popup with only useful details.
- Fit the camera to all active orders and drivers after data loads.
- Preserve OpenStreetMap/OpenFreeMap attribution.

Actions:

- **Generate Plan** calls `POST /api/plans/optimize`.
- **Simulate Delay** calls `POST /api/simulations/driver-delay`.
- Selecting a driver highlights only that route.
- A before/after panel shows changed assignments after re-planning.

#### B. Orders - `/orders`

- Search and filter by status and priority.
- Create-order form.
- Fields: customer name, address label, latitude, longitude, demand, service minutes, time-window start and end, priority.
- Allow selecting coordinates by clicking the map.
- Show inline validation errors returned by the backend.

#### C. Drivers - `/drivers`

- Driver list and availability.
- Create-driver form.
- Fields: name, capacity, shift start/end, start latitude/longitude and status.
- Show assigned load and remaining capacity.

#### D. Driver View - `/driver/:driverId`

- Mobile-first layout.
- Driver identity and status.
- Current/next stop.
- Ordered list of assigned tasks.
- Buttons: Start task, Complete task, Report delay.
- Do not implement turn-by-turn navigation; provide an external map link only if needed.

### Frontend state rules

- Server state comes from TanStack Query.
- Poll dashboard/plan every 5 seconds during the demo.
- Never duplicate optimization logic in the browser.
- Never calculate authoritative ETAs in the browser.
- Keep API calls in `src/lib/api.ts`; components must not contain raw endpoint URLs.
- Read backend base URL from `VITE_API_BASE_URL`.
- Provide clear loading, retry, empty and offline states.
- Use a toast for actions, but keep persistent failures visible near the failed control.

### Suggested frontend structure

```text
src/
  components/
    map/OperationsMap.tsx
    dashboard/MetricCards.tsx
    dashboard/PlanPanel.tsx
    dashboard/SimulationPanel.tsx
    orders/OrderForm.tsx
    drivers/DriverForm.tsx
  pages/
    DashboardPage.tsx
    OrdersPage.tsx
    DriversPage.tsx
    DriverPage.tsx
  hooks/
    useDashboard.ts
    usePlan.ts
  lib/
    api.ts
    map.ts
    types.ts
  App.tsx
  main.tsx
```

## 6. Backend developer responsibilities

Codex owns:

- Supabase schema and migrations.
- Seeded demo orders, drivers and depot.
- CRUD endpoints for orders and drivers.
- openrouteservice server-side adapter.
- Matrix caching to conserve free quota.
- OR-Tools vehicle-routing model.
- Capacity, shift and delivery time-window constraints.
- Priority handling and unassigned-order explanations.
- Re-planning unfinished work after a delay or urgent order.
- Plan versioning so the UI can compare before and after.
- Deterministic demo simulation endpoints.
- API tests and optimizer tests.
- Safe fallback to straight-line distance if openrouteservice is unavailable.

### Optimization inputs

- Drivers and their start positions.
- Driver capacity.
- Driver shift windows.
- Order coordinates.
- Order demand.
- Service duration.
- Delivery time windows.
- Priority.
- Existing completed/in-progress tasks, which must remain locked during re-planning.

### Optimization objective

Minimize, in this order:

1. Unserved high-priority orders.
2. Late deliveries.
3. Total travel time/distance.
4. Workload imbalance between drivers.

## 7. API contract

The frontend may initially mock these responses, but field names must remain unchanged.

### Health

`GET /api/health`

```json
{
  "status": "ok",
  "service": "vanta-backend"
}
```

### Dashboard

`GET /api/dashboard`

```json
{
  "metrics": {
    "unassigned_orders": 10,
    "active_drivers": 3,
    "on_time_percentage": 100,
    "total_distance_km": 0
  },
  "orders": [],
  "drivers": [],
  "active_plan": null,
  "alerts": []
}
```

### Order

```ts
type Order = {
  id: string;
  customerName: string;
  address: string;
  latitude: number;
  longitude: number;
  demand: number;
  serviceMinutes: number;
  windowStart: string;
  windowEnd: string;
  priority: "normal" | "high" | "urgent";
  status: "unassigned" | "assigned" | "in_progress" | "delivered" | "failed";
};
```

Endpoints:

- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/{order_id}`

### Driver

```ts
type Driver = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  shiftStart: string;
  shiftEnd: string;
  status: "available" | "active" | "delayed" | "offline";
};
```

Endpoints:

- `GET /api/drivers`
- `POST /api/drivers`
- `GET /api/drivers/{driver_id}`

### Generate plan

`POST /api/plans/optimize`

Request:

```json
{
  "reason": "initial_plan"
}
```

Response:

```json
{
  "id": "PLAN-002",
  "version": 2,
  "status": "active",
  "reason": "initial_plan",
  "totalDistanceKm": 42.8,
  "estimatedMinutes": 186,
  "unassignedOrderIds": [],
  "routes": [
    {
      "driverId": "DRV-001",
      "color": "#2563eb",
      "distanceKm": 14.2,
      "estimatedMinutes": 61,
      "load": 8,
      "capacity": 10,
      "geometry": {
        "type": "LineString",
        "coordinates": [[78.4867, 17.385], [78.49, 17.39]]
      },
      "stops": [
        {
          "sequence": 1,
          "orderId": "ORD-001",
          "eta": "2026-09-26T10:20:00+05:30",
          "status": "assigned"
        }
      ]
    }
  ],
  "changes": []
}
```

GeoJSON coordinates are always `[longitude, latitude]`. This order must not be reversed.

### Simulate delay

`POST /api/simulations/driver-delay`

```json
{
  "driverId": "DRV-001",
  "delayMinutes": 30
}
```

The response uses the same plan shape and includes:

```json
{
  "changes": [
    {
      "orderId": "ORD-004",
      "fromDriverId": "DRV-001",
      "toDriverId": "DRV-002",
      "reason": "Avoided a predicted late delivery"
    }
  ]
}
```

### Update task status

`PATCH /api/tasks/{task_id}/status`

```json
{
  "status": "completed",
  "latitude": 17.385,
  "longitude": 78.4867
}
```

## 8. Error contract

The backend will return errors in this form:

```json
{
  "detail": {
    "code": "OPTIMIZATION_INFEASIBLE",
    "message": "Two urgent orders cannot fit within the available driver shifts."
  }
}
```

The frontend must display `detail.message`. It must not show raw JSON or a blank page.

Expected cases:

- Backend unavailable.
- No drivers available.
- No unassigned orders.
- Invalid coordinates.
- Optimization infeasible.
- Routing provider unavailable and fallback used.

## 9. Integration order

### Phase 1 - work independently

Frontend:

1. Scaffold UI and routing.
2. Create TypeScript types exactly as specified.
3. Build the dashboard using local mock fixtures.
4. Implement MapLibre/OpenFreeMap markers and GeoJSON routes.
5. Build simulation UI using a mocked before/after plan.

Backend:

1. Use only the VANTA order, driver, plan and task domain models.
2. Add schema and seed data.
3. Add CRUD APIs.
4. Implement matrix provider and cache.
5. Implement OR-Tools optimization.
6. Add re-planning and simulation.

### Phase 2 - integrate

1. Frontend sets `VITE_API_BASE_URL` to the FastAPI URL.
2. Replace mock functions only inside `src/lib/api.ts`.
3. Verify list APIs first.
4. Verify initial optimization.
5. Verify delay simulation and changed assignments.
6. Verify driver task completion.
7. Run the full presentation flow twice from clean seed data.

## 10. Git workflow

- Frontend developer works only on `frontend/dashboard`.
- Backend developer works only on `codex/backend-ai`.
- Do not commit `.env`, API keys, generated build folders or dependency folders.
- Frontend developer should commit small milestones.
- Merge the backend branch first, then rebase/merge the frontend branch and resolve integration only in the API module.
- Do not rename API fields independently. Discuss contract changes before coding them.

## 11. Definition of done

The MVP is complete only when:

- The map loads without a paid map key.
- Seeded orders and drivers appear correctly.
- Generate Plan returns and draws optimized routes.
- Every route has ordered stops and ETAs.
- Delay simulation produces a new plan version.
- Reassigned orders are visually highlighted.
- Completed tasks are not moved during re-planning.
- The frontend handles backend and routing-provider failures.
- No secret appears in frontend source or Git history.
- The demo can be reset and repeated reliably.

## 12. Prompt for the Antigravity frontend developer

Copy everything below into Antigravity:

---

You are the frontend developer for VANTA, an autonomous delivery operations engine. VANTA decides which driver should deliver each order, in what sequence and by which route. It automatically recalculates unfinished work when a driver is delayed or an urgent order arrives. It is not a consumer delivery application; it is a dispatcher dashboard plus a mobile-friendly driver view.

Build only the frontend using React, Vite, TypeScript and Tailwind CSS. Use MapLibre GL JS with OpenFreeMap. Do not use Google Maps, Mapbox or any paid map API. Read the repository file `VANTA_TEAM_HANDOFF.md` completely and follow its API types, field names, routes, error shape, integration order and definition of done exactly.

Create these screens:

1. `/` Operations Dashboard with metric cards, orders/drivers summary, a large operations map, current plan panel, alerts and deterministic simulation controls.
2. `/orders` with order list, filters and create-order form. Coordinates can be selected on the map.
3. `/drivers` with driver list, availability, capacity and create-driver form.
4. `/driver/:driverId` as a mobile-first task list showing the next stop and buttons for start, complete and report delay.

The main demo must show 3 drivers and 10 orders, generate an optimized plan, render one colored GeoJSON route per driver, simulate a 30-minute delay and clearly highlight orders moved to another driver. GeoJSON coordinates are `[longitude, latitude]`.

Use TanStack Query for server state and polling. Put all API calls in `src/lib/api.ts`, all shared TypeScript contracts in `src/lib/types.ts`, and read the backend URL from `VITE_API_BASE_URL`. Initially create mock fixtures behind the same API functions so development can continue before the backend is ready. Make switching from mocks to the real backend require changes only in the API module.

Implement loading, empty, retry, validation, offline and optimization-infeasible states. Display the backend's `detail.message` and never render raw JSON to users. Keep the interface professional and operational: readable map, stable route colors, useful marker popups, responsive panels and no decorative features that distract from the optimization demo.

Do not implement backend logic, optimization, authoritative ETAs, authentication, payments, customer chat, ratings or turn-by-turn navigation. Do not expose Supabase, routing or AI keys in frontend code. Commit work to `frontend/dashboard` and do not modify backend files.

Before declaring completion, verify the full definition-of-done checklist in `VANTA_TEAM_HANDOFF.md` and report any API mismatch explicitly instead of silently changing the contract.

---
