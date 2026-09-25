# VANTA Frontend

Responsive dispatcher dashboard and mobile driver workflow for the VANTA autonomous delivery operations engine.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- TanStack Query
- MapLibre GL JS with OpenFreeMap/OpenStreetMap data
- Browser Fetch API through `src/lib/api.ts`

No paid map provider or frontend API key is required.

## Run locally

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

The default backend URL is `http://127.0.0.1:8000`. Override it with `VITE_API_BASE_URL` in the ignored `.env` file.

## Screens

- `/` — live operations dashboard, map, route selection and delay simulation.
- `/orders` — searchable order queue and create-order form with map coordinate selection.
- `/drivers` — fleet status, capacity and create-driver form.
- `/driver/:driverId` — mobile-first next-stop and task workflow.

## Validation

```powershell
npm run build
npm audit --omit=dev
```
