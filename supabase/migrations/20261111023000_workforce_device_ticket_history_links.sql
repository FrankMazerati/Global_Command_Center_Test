-- Extend existing people, asset and ticket records with company-history lineage and workforce links.
alter table public.workforce_people
  add column if not exists history_batch_id uuid references public.company_history_batches(id);

alter table public.devices
  add column if not exists history_batch_id uuid references public.company_history_batches(id);

alter table public.device_assignment_history
  add column if not exists history_batch_id uuid references public.company_history_batches(id);

alter table public.device_lifecycle_events
  add column if not exists history_batch_id uuid references public.company_history_batches(id);

alter table public.device_compliance_checks
  add column if not exists history_batch_id uuid references public.company_history_batches(id);

alter table public.tickets
  add column if not exists requester_workforce_person_id uuid references public.workforce_people(id),
  add column if not exists assigned_workforce_person_id uuid references public.workforce_people(id),
  add column if not exists history_batch_id uuid references public.company_history_batches(id);

alter table public.ticket_lifecycle_events
  add column if not exists history_batch_id uuid references public.company_history_batches(id);

alter table public.ticket_escalations
  add column if not exists history_batch_id uuid references public.company_history_batches(id);

alter table public.ticket_sla_clock_events
  add column if not exists history_batch_id uuid references public.company_history_batches(id);

create index if not exists workforce_people_history_batch_idx on public.workforce_people(history_batch_id);
create index if not exists devices_history_batch_idx on public.devices(history_batch_id);
create index if not exists tickets_requester_workforce_person_idx on public.tickets(requester_workforce_person_id);
create index if not exists tickets_assigned_workforce_person_idx on public.tickets(assigned_workforce_person_id);
create index if not exists tickets_history_batch_idx on public.tickets(history_batch_id);
create index if not exists ticket_lifecycle_events_history_batch_idx on public.ticket_lifecycle_events(history_batch_id);
create index if not exists ticket_escalations_history_batch_idx on public.ticket_escalations(history_batch_id);
create index if not exists ticket_sla_clock_events_history_batch_idx on public.ticket_sla_clock_events(history_batch_id);