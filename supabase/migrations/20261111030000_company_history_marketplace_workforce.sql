-- IntelliStack company history foundation
-- Founding date: 2020-02-10. Additive only; preserves existing operational records.
create table if not exists public.company_history_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  batch_key text not null unique,
  founding_date date not null default date '2020-02-10',
  through_date date not null default current_date,
  status text not null default 'prepared' check (status in ('prepared','running','completed','failed')),
  record_counts jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.marketplace_customer_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  customer_company_id uuid not null unique references public.marketplace_companies(id),
  account_number text not null unique,
  account_status text not null default 'active' check (account_status in ('active','prospect','at_risk','suspended','closed')),
  customer_since date not null,
  industry text,
  company_size text,
  account_manager_person_id uuid references public.workforce_people(id),
  source_channel text not null default 'direct',
  metadata jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_customer_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  customer_account_id uuid not null references public.marketplace_customer_accounts(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  contact_email text not null,
  job_title text not null,
  department text,
  contact_role text not null check (contact_role in ('ceo','cfo','cio','it_director','hr_director','procurement','billing','primary')),
  is_primary boolean not null default false,
  contact_status text not null default 'active' check (contact_status in ('active','inactive')),
  metadata jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now(),
  unique(customer_account_id, contact_email)
);

create table if not exists public.marketplace_sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  customer_account_id uuid not null references public.marketplace_customer_accounts(id),
  sales_rep_person_id uuid references public.workforce_people(id),
  sale_number text not null unique,
  sale_date date not null,
  status text not null check (status in ('closed_won','active','cancelled','refunded')),
  currency char(3) not null default 'USD',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(14,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(14,2) not null default 0 check (tax_total >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  payment_status text not null check (payment_status in ('paid','partial','overdue','refunded','not_due')),
  payment_terms text not null default 'Net 30',
  sales_channel text not null default 'direct',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_sale_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  sale_id uuid not null references public.marketplace_sales(id) on delete cascade,
  product_id uuid references public.marketplace_products(id),
  product_key text not null,
  product_name text not null,
  sku text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_monthly_price numeric(12,2) not null default 0,
  setup_fee numeric(12,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  price_snapshot jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  customer_account_id uuid not null references public.marketplace_customer_accounts(id),
  source_sale_id uuid references public.marketplace_sales(id),
  subscription_number text not null unique,
  plan_key text not null,
  billing_cycle text not null check (billing_cycle in ('monthly','annual')),
  monthly_amount numeric(12,2) not null default 0,
  status text not null check (status in ('active','trial','past_due','paused','cancelled','expired')),
  starts_at date not null,
  current_period_start date,
  current_period_end date,
  next_billing_at date,
  cancelled_at date,
  metadata jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_customer_subscription_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  subscription_id uuid not null references public.marketplace_customer_subscriptions(id) on delete cascade,
  event_type text not null check (event_type in ('created','activated','renewed','upgraded','downgraded','payment_received','payment_missed','paused','resumed','cancelled','expired')),
  event_at timestamptz not null,
  description text not null,
  previous_value jsonb not null default '{}'::jsonb,
  new_value jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now()
);

create table if not exists public.company_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  customer_account_id uuid not null references public.marketplace_customer_accounts(id),
  sale_id uuid references public.marketplace_sales(id),
  invoice_number text not null unique,
  issued_at date not null,
  due_at date not null,
  invoice_status text not null check (invoice_status in ('paid','partially_paid','overdue','open','void','refunded')),
  currency char(3) not null default 'USD',
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  paid_at date,
  metadata jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now(),
  check (due_at >= issued_at),
  check (amount_paid <= total),
  check (balance_due = greatest(total - amount_paid, 0))
);

create table if not exists public.company_financial_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  customer_account_id uuid references public.marketplace_customer_accounts(id),
  invoice_id uuid references public.company_invoices(id),
  sale_id uuid references public.marketplace_sales(id),
  transaction_number text not null unique,
  transaction_date date not null,
  transaction_type text not null check (transaction_type in ('revenue','expense','credit','refund','adjustment')),
  category text not null,
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency char(3) not null default 'USD',
  transaction_status text not null default 'posted' check (transaction_status in ('draft','posted','void')),
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workforce_employment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  workforce_person_id uuid not null references public.workforce_people(id) on delete cascade,
  event_number text not null unique,
  event_type text not null check (event_type in ('hire','rehire','promotion','transfer','compensation_change','leave_started','leave_returned','status_change','manager_change','termination')),
  event_date date not null,
  previous_title text,
  new_title text,
  previous_department_id uuid references public.departments(id),
  new_department_id uuid references public.departments(id),
  previous_status text,
  new_status text,
  compensation_amount numeric(14,2),
  currency char(3) not null default 'USD',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workforce_staffing_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  workforce_person_id uuid not null references public.workforce_people(id),
  customer_account_id uuid not null references public.marketplace_customer_accounts(id),
  assignment_number text not null unique,
  role_title text not null,
  project_name text not null,
  assignment_type text not null check (assignment_type in ('employee','contractor','consultant','project')),
  assignment_status text not null check (assignment_status in ('planned','active','completed','cancelled')),
  starts_at date not null,
  ends_at date,
  hourly_rate numeric(10,2),
  bill_rate numeric(10,2),
  currency char(3) not null default 'USD',
  supervisor_person_id uuid references public.workforce_people(id),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.intellihire_requisitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  department_id uuid references public.departments(id),
  hiring_manager_person_id uuid references public.workforce_people(id),
  requisition_number text not null unique,
  title text not null,
  job_description text not null,
  employment_type text not null,
  headcount integer not null default 1 check (headcount > 0),
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  currency char(3) not null default 'USD',
  location_city text,
  location_region text,
  requisition_status text not null check (requisition_status in ('open','on_hold','filled','closed','cancelled')),
  opened_at date not null,
  closed_at date,
  metadata jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now(),
  check (closed_at is null or closed_at >= opened_at)
);

create table if not exists public.intellihire_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  candidate_number text not null unique,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  headline text,
  summary text,
  years_experience numeric(4,1) not null default 0,
  skills jsonb not null default '[]'::jsonb,
  candidate_source text not null,
  candidate_status text not null check (candidate_status in ('new','screening','interviewing','offered','hired','rejected','withdrawn','talent_pool')),
  home_city text,
  home_region text,
  hired_workforce_person_id uuid references public.workforce_people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  history_batch_id uuid references public.company_history_batches(id)
);

create table if not exists public.intellihire_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  application_number text not null unique,
  candidate_id uuid not null references public.intellihire_candidates(id) on delete cascade,
  requisition_id uuid not null references public.intellihire_requisitions(id),
  application_status text not null check (application_status in ('submitted','screening','shortlisted','interview','offer','hired','rejected','withdrawn')),
  stage text not null,
  fit_score numeric(5,2),
  recruiter_person_id uuid references public.workforce_people(id),
  hired_workforce_person_id uuid references public.workforce_people(id),
  applied_at date not null,
  last_activity_at date not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now()
);

create table if not exists public.intellihire_interviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  interview_number text not null unique,
  application_id uuid not null references public.intellihire_applications(id) on delete cascade,
  interviewer_person_id uuid references public.workforce_people(id),
  interview_type text not null,
  scheduled_at timestamptz not null,
  outcome text not null check (outcome in ('scheduled','passed','hold','failed','cancelled')),
  feedback text,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workforce_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  document_number text not null unique,
  module_key text not null check (module_key in ('intellistaff','intellihire','intelliwork')),
  document_type text not null,
  title text not null,
  workforce_person_id uuid references public.workforce_people(id),
  candidate_id uuid references public.intellihire_candidates(id),
  staffing_assignment_id uuid references public.workforce_staffing_assignments(id),
  effective_date date,
  expires_at date,
  document_status text not null check (document_status in ('draft','issued','signed','active','archived','expired')),
  content_markdown text not null,
  issued_by_person_id uuid references public.workforce_people(id),
  metadata jsonb not null default '{}'::jsonb,
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now(),
  check (num_nonnulls(workforce_person_id,candidate_id,staffing_assignment_id) >= 1)
);

create table if not exists public.executive_period_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  report_number text not null unique,
  report_type text not null check (report_type in ('ceo','cfo','operations','people')),
  period_start date not null,
  period_end date not null,
  title text not null,
  executive_summary text not null,
  metrics jsonb not null default '{}'::jsonb,
  prepared_by_person_id uuid references public.workforce_people(id),
  report_status text not null default 'approved' check (report_status in ('draft','review','approved','archived')),
  history_batch_id uuid references public.company_history_batches(id),
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index if not exists marketplace_customer_accounts_org_idx on public.marketplace_customer_accounts(organization_id, customer_since);
create index if not exists marketplace_customer_contacts_account_idx on public.marketplace_customer_contacts(customer_account_id);
create index if not exists marketplace_sales_date_idx on public.marketplace_sales(organization_id, sale_date desc);
create index if not exists marketplace_sales_customer_idx on public.marketplace_sales(customer_account_id, sale_date desc);
create index if not exists marketplace_sale_items_sale_idx on public.marketplace_sale_items(sale_id);
create index if not exists marketplace_customer_subscriptions_customer_idx on public.marketplace_customer_subscriptions(customer_account_id, status);
create index if not exists marketplace_subscription_events_sub_idx on public.marketplace_customer_subscription_events(subscription_id, event_at);
create index if not exists company_invoices_customer_idx on public.company_invoices(customer_account_id, issued_at desc);
create index if not exists company_financial_transactions_date_idx on public.company_financial_transactions(organization_id, transaction_date desc);
create index if not exists workforce_employment_events_person_idx on public.workforce_employment_events(workforce_person_id, event_date desc);
create index if not exists workforce_staffing_assignments_person_idx on public.workforce_staffing_assignments(workforce_person_id, starts_at desc);
create index if not exists workforce_staffing_assignments_customer_idx on public.workforce_staffing_assignments(customer_account_id, starts_at desc);
create index if not exists intellihire_requisitions_status_idx on public.intellihire_requisitions(organization_id, requisition_status, opened_at desc);
create index if not exists intellihire_candidates_status_idx on public.intellihire_candidates(organization_id, candidate_status);
create index if not exists intellihire_applications_candidate_idx on public.intellihire_applications(candidate_id, applied_at desc);
create index if not exists intellihire_applications_req_idx on public.intellihire_applications(requisition_id, application_status);
create index if not exists workforce_documents_module_idx on public.workforce_documents(organization_id, module_key, effective_date desc);
create index if not exists executive_period_reports_period_idx on public.executive_period_reports(organization_id, period_start desc);

do $$
declare
  t text;
begin
  foreach t in array array[
    'company_history_batches','marketplace_customer_accounts','marketplace_customer_contacts',
    'marketplace_sales','marketplace_sale_items','marketplace_customer_subscriptions',
    'marketplace_customer_subscription_events','company_invoices','company_financial_transactions',
    'workforce_employment_events','workforce_staffing_assignments','intellihire_requisitions',
    'intellihire_candidates','intellihire_applications','intellihire_interviews',
    'workforce_documents','executive_period_reports'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_company_history_access', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (
        private.is_global_admin()
        or exists (
          select 1 from public.profile_roles pr
          join public.roles r on r.id = pr.role_id
          where pr.profile_id = auth.uid()
            and pr.organization_id = public.%I.organization_id
            and pr.is_active
            and (pr.starts_at is null or pr.starts_at <= now())
            and (pr.expires_at is null or pr.expires_at > now())
            and r.role_key = any(array[
              ''ceo'',''cfo'',''finance_manager'',''finance_admin'',
              ''hr_manager'',''hr_admin'',''recruiter'',''staffing_manager'',
              ''marketplace_admin'',''super_admin'',''global_admin''
            ])
        )
      ) with check (
        private.is_global_admin()
        or exists (
          select 1 from public.profile_roles pr
          join public.roles r on r.id = pr.role_id
          where pr.profile_id = auth.uid()
            and pr.organization_id = public.%I.organization_id
            and pr.is_active
            and (pr.starts_at is null or pr.starts_at <= now())
            and (pr.expires_at is null or pr.expires_at > now())
            and r.role_key = any(array[
              ''ceo'',''cfo'',''finance_manager'',''finance_admin'',
              ''hr_manager'',''hr_admin'',''recruiter'',''staffing_manager'',
              ''marketplace_admin'',''super_admin'',''global_admin''
            ])
        )
      )',
      t || '_company_history_access', t, t, t
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
