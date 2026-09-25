alter table public.vanta_orders
add column if not exists delivery_instructions text not null
default 'Deliver safely and confirm at the door.';

update public.vanta_orders set delivery_instructions = case id
  when 'ORD-001' then 'Call on arrival. Hand the parcel directly to the recipient.'
  when 'ORD-002' then 'Use the main entrance and ask security for the customer.'
  when 'ORD-003' then 'Fragile package. Keep upright and obtain recipient confirmation.'
  when 'ORD-004' then 'Gate access required. Call the customer two minutes before arrival.'
  when 'ORD-005' then 'Leave only with the named recipient; do not leave unattended.'
  when 'ORD-006' then 'Priority delivery. Confirm identity before handover.'
  when 'ORD-007' then 'Use the side entrance near the pharmacy.'
  when 'ORD-008' then 'Apartment delivery. Call from the lobby.'
  when 'ORD-009' then 'Handle with care and capture proof of delivery.'
  when 'ORD-010' then 'Shopfront delivery. Ask for the floor manager.'
  else delivery_instructions end;
