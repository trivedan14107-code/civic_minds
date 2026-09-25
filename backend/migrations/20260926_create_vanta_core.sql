-- VANTA delivery orchestration domain.

create table if not exists public.vanta_orders (
  id text primary key,
  customer_name text not null,
  address text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  demand integer not null default 1 check (demand > 0),
  service_minutes integer not null default 10 check (service_minutes > 0),
  window_start timestamptz not null,
  window_end timestamptz not null,
  priority text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  delivery_instructions text not null default 'Deliver safely and confirm at the door.',
  status text not null default 'unassigned' check (
    status in ('unassigned', 'assigned', 'in_progress', 'delivered', 'failed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (window_end > window_start)
);

create table if not exists public.vanta_drivers (
  id text primary key,
  name text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  capacity integer not null check (capacity > 0),
  shift_start timestamptz not null,
  shift_end timestamptz not null,
  status text not null default 'available' check (
    status in ('available', 'active', 'delayed', 'offline')
  ),
  current_delay_minutes integer not null default 0 check (current_delay_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (shift_end > shift_start)
);

create table if not exists public.vanta_plans (
  id text primary key,
  version bigint not null unique,
  status text not null default 'active' check (status in ('active', 'superseded', 'completed')),
  reason text not null,
  total_distance_km double precision not null default 0,
  estimated_minutes integer not null default 0,
  unassigned_order_ids jsonb not null default '[]'::jsonb,
  routes jsonb not null default '[]'::jsonb,
  changes jsonb not null default '[]'::jsonb,
  routing_source text not null default 'haversine_fallback',
  created_at timestamptz not null default now()
);

create table if not exists public.vanta_tasks (
  id text primary key,
  plan_id text not null references public.vanta_plans(id) on delete cascade,
  driver_id text not null references public.vanta_drivers(id),
  order_id text not null references public.vanta_orders(id),
  sequence integer not null check (sequence > 0),
  eta timestamptz not null,
  status text not null default 'assigned' check (
    status in ('assigned', 'in_progress', 'completed', 'failed')
  ),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plan_id, order_id)
);

create index if not exists vanta_orders_status_idx on public.vanta_orders(status);
create index if not exists vanta_drivers_status_idx on public.vanta_drivers(status);
create index if not exists vanta_tasks_plan_idx on public.vanta_tasks(plan_id);
create index if not exists vanta_tasks_driver_idx on public.vanta_tasks(driver_id);

alter table public.vanta_orders enable row level security;
alter table public.vanta_drivers enable row level security;
alter table public.vanta_plans enable row level security;
alter table public.vanta_tasks enable row level security;

-- Demo drivers. Times are regenerated relative to the day this migration is run.
insert into public.vanta_drivers
  (id, name, latitude, longitude, capacity, shift_start, shift_end, status, current_delay_minutes)
values
  ('DRV-001', 'Aarav', 17.3850, 78.4867, 12, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '9 hours') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '18 hours') at time zone 'Asia/Kolkata', 'available', 0),
  ('DRV-002', 'Diya', 17.3850, 78.4867, 10, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '9 hours') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '18 hours') at time zone 'Asia/Kolkata', 'available', 0),
  ('DRV-003', 'Kabir', 17.3850, 78.4867, 14, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '9 hours') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '18 hours') at time zone 'Asia/Kolkata', 'available', 0)
on conflict (id) do update set
  name = excluded.name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  capacity = excluded.capacity,
  shift_start = excluded.shift_start,
  shift_end = excluded.shift_end,
  status = excluded.status,
  current_delay_minutes = 0;

insert into public.vanta_orders
  (id, customer_name, address, latitude, longitude, demand, service_minutes, window_start, window_end, priority, status)
values
  ('ORD-001', 'Ananya', 'Abids', 17.3930, 78.4730, 2, 10, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '10 hours') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '13 hours 30 minutes') at time zone 'Asia/Kolkata', 'urgent', 'unassigned'),
  ('ORD-002', 'Vihaan', 'Himayatnagar', 17.4020, 78.4850, 2, 10, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '10 hours 30 minutes') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '14 hours 30 minutes') at time zone 'Asia/Kolkata', 'normal', 'unassigned'),
  ('ORD-003', 'Meera', 'Banjara Hills', 17.4160, 78.4380, 3, 12, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '11 hours') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '15 hours 30 minutes') at time zone 'Asia/Kolkata', 'high', 'unassigned'),
  ('ORD-004', 'Arjun', 'Jubilee Hills', 17.4310, 78.4070, 4, 15, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '11 hours 30 minutes') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '16 hours 30 minutes') at time zone 'Asia/Kolkata', 'high', 'unassigned'),
  ('ORD-005', 'Ishita', 'Begumpet', 17.4440, 78.4660, 2, 10, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '10 hours') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '14 hours 30 minutes') at time zone 'Asia/Kolkata', 'normal', 'unassigned'),
  ('ORD-006', 'Rohan', 'Secunderabad', 17.4399, 78.4983, 3, 12, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '10 hours 30 minutes') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '15 hours 30 minutes') at time zone 'Asia/Kolkata', 'urgent', 'unassigned'),
  ('ORD-007', 'Saanvi', 'Dilsukhnagar', 17.3688, 78.5247, 2, 10, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '11 hours') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '16 hours 30 minutes') at time zone 'Asia/Kolkata', 'normal', 'unassigned'),
  ('ORD-008', 'Aditya', 'Mehdipatnam', 17.3952, 78.4405, 3, 10, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '11 hours 30 minutes') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '17 hours') at time zone 'Asia/Kolkata', 'normal', 'unassigned'),
  ('ORD-009', 'Kavya', 'Ameerpet', 17.4375, 78.4482, 4, 15, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '10 hours 30 minutes') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '16 hours') at time zone 'Asia/Kolkata', 'high', 'unassigned'),
  ('ORD-010', 'Reyansh', 'Koti', 17.3859, 78.4866, 2, 8, (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '9 hours 30 minutes') at time zone 'Asia/Kolkata', (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '14 hours') at time zone 'Asia/Kolkata', 'normal', 'unassigned')
on conflict (id) do update set
  customer_name = excluded.customer_name,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  demand = excluded.demand,
  service_minutes = excluded.service_minutes,
  window_start = excluded.window_start,
  window_end = excluded.window_end,
  priority = excluded.priority,
  status = 'unassigned';
