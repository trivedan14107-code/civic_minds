alter table public.vanta_orders
  add column if not exists customer_availability text not null default 'confirmed_available'
    check (
      customer_availability in (
        'confirmed_available',
        'pending_verification',
        'unavailable_reschedule'
      )
    );
