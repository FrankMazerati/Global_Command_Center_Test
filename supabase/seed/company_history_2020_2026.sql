-- Idempotent historical company dataset for IntelliStack Systems.
-- Company history begins 2020-02-10. Contacts use reserved .example domains.
begin;

insert into public.company_history_batches
  (id, organization_id, batch_key, founding_date, through_date, status, notes)
select
  md5('intellistack-company-history-2020-2026-v1')::uuid,
  o.id,
  'intellistack-company-history-2020-2026-v1',
  date '2020-02-10',
  (now() at time zone 'America/Chicago')::date,
  'running',
  'Founding-to-current company history: marketplace, finance, hiring, staffing, and employment.'
from public.organizations o
where o.slug = 'intellistack-managed-services'
on conflict (batch_key) do update
set status='running', through_date=(now() at time zone 'America/Chicago')::date;

-- 1,000 customer companies and customer accounts.
with src as (
  select g as n,
    (array['Northstar','Blue Horizon','Cedar Ridge','Summit','Granite','Pioneer','Evergreen','Lakeshore','Redwood','Silverline','Westbridge','Brightpath','Meridian','Ironwood','Clearwater','Skyline','Atlas','Harborview','Oakstone','Crestview'])[((g-1)%20)+1]
      || ' ' ||
    (array['Technologies','Health Group','Logistics','Financial Partners','Manufacturing','Consulting','Retail Group','Energy Systems','Hospitality','Research Group','Digital Services','Construction','Education Network','Media Group','Distribution','Professional Services','Data Systems','Industrial Solutions','Communications','Supply Group'])[((g*7-1)%20)+1]
      || ' ' || lpad(g::text,4,'0') as company_name,
    (array['Technology','Healthcare','Logistics','Financial Services','Manufacturing','Consulting','Retail','Energy','Hospitality','Education','Media','Construction','Professional Services','Telecommunications'])[((g*11-1)%14)+1] as industry,
    (array['1-25','26-100','101-500','501-2,000','2,001-10,000','10,000+'])[((g*5-1)%6)+1] as company_size,
    date '2020-02-10' + ((g*17)%2200) as customer_since
  from generate_series(1,1000) g
),
ins_companies as (
  insert into public.marketplace_companies
    (id, legal_name, display_name, company_type, verification_status, industry, company_size,
     headquarters_city, headquarters_region, description, created_at, updated_at)
  select
    md5('history-customer-company-'||n)::uuid,
    company_name || ' LLC',
    company_name,
    'customer',
    'unverified',
    industry,
    company_size,
    (array['Chicago','New York','Dallas','Atlanta','Denver','Seattle','Austin','Boston','Phoenix','Minneapolis'])[((n*3-1)%10)+1],
    (array['IL','NY','TX','GA','CO','WA','TX','MA','AZ','MN'])[((n*3-1)%10)+1],
    'Enterprise customer account in the '||industry||' sector.',
    customer_since::timestamptz,
    customer_since::timestamptz
  from src
  on conflict (id) do nothing
  returning id
)
insert into public.marketplace_customer_accounts
  (id, organization_id, customer_company_id, account_number, account_status, customer_since,
   industry, company_size, source_channel, metadata, history_batch_id, created_at, updated_at)
select
  md5('history-customer-account-'||s.n)::uuid,
  o.id,
  md5('history-customer-company-'||s.n)::uuid,
  'IS-CUST-'||lpad(s.n::text,6,'0'),
  case when s.n%97=0 then 'at_risk' when s.n%131=0 then 'closed' else 'active' end,
  s.customer_since,
  s.industry,
  s.company_size,
  (array['direct','partner','referral','marketplace'])[((s.n*7-1)%4)+1],
  jsonb_build_object('record_lineage','company_history_seed_v1','customer_segment',case when s.n%6=0 then 'enterprise' when s.n%3=0 then 'mid_market' else 'growth' end),
  b.id,
  s.customer_since::timestamptz,
  s.customer_since::timestamptz
from src s
cross join public.organizations o
cross join public.company_history_batches b
where o.slug='intellistack-managed-services'
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

-- CEO, CFO, CIO, and HR contacts for every customer account.
with contact_roles as (
  select * from (values
    (1,'ceo','Chief Executive Officer','Executive'),
    (2,'cfo','Chief Financial Officer','Finance'),
    (3,'cio','Chief Information Officer','Information Technology'),
    (4,'hr_director','Human Resources Director','Human Resources')
  ) v(n,role,title,department)
),
accounts as (
  select a.id,a.account_number,a.organization_id,
         row_number() over(order by a.account_number) as n
  from public.marketplace_customer_accounts a
  where a.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
)
insert into public.marketplace_customer_contacts
  (id,organization_id,customer_account_id,first_name,last_name,contact_email,job_title,department,contact_role,is_primary,metadata,history_batch_id)
select
  md5('history-customer-contact-'||a.n||'-'||r.n)::uuid,
  a.organization_id,
  a.id,
  (array['Jordan','Taylor','Morgan','Avery','Riley','Cameron','Parker','Quinn','Reese','Drew','Alex','Casey','Jamie','Rowan','Skyler'])[((a.n*3+r.n*5-1)%15)+1],
  (array['Bennett','Brooks','Carter','Collins','Edwards','Foster','Gray','Hayes','Jenkins','Morgan','Parker','Reed','Sullivan','Turner','Warren'])[((a.n*7+r.n*3-1)%15)+1],
  'contact.'||lpad(a.n::text,4,'0')||'.'||r.n||'@customer.intellistack.example',
  r.title,
  r.department,
  r.role,
  r.n=1,
  jsonb_build_object('record_lineage','company_history_seed_v1'),
  (select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
from accounts a cross join contact_roles r
on conflict (id) do nothing;

-- 5,000 marketplace sales, two product lines per sale.
with product_list as (
  select id,product_key,name,sku,row_number() over(order by sort_order,product_key) as rn,
         count(*) over() as total
  from public.marketplace_products
  where active_status='active'
),
sales_people as (
  select array_agg(w.id order by w.employee_id) as ids
  from public.workforce_people w
  join public.departments d on d.id=w.department_id
  where d.name='Sales'
),
sale_base as (
  select g n,
    (((g*37-1)%1000)+1) customer_n,
    least(
      date '2020-02-10' + ((((g*37-1)%1000)+1)*17 % 2200) + (g%365),
      (now() at time zone 'America/Chicago')::date
    ) sale_date,
    (400 + (g%31)*125)::numeric(14,2) subtotal,
    case when g%10=0 then (400 + (g%31)*125)*0.05 else 0 end::numeric(14,2) discount_total,
    case when g%100 in (95,96) then 'cancelled'
         when g%100 in (97,98) then 'refunded'
         when g%100 between 90 and 94 then 'active'
         else 'closed_won' end sale_status,
    case when g%100 in (95,96) then 'not_due'
         when g%100 in (97,98) then 'refunded'
         when g%100 between 85 and 89 then 'partial'
         when g%100 between 80 and 84 then 'overdue'
         else 'paid' end pay_status
  from generate_series(1,5000) g
)
insert into public.marketplace_sales
  (id,organization_id,customer_account_id,sales_rep_person_id,sale_number,sale_date,status,currency,
   subtotal,discount_total,tax_total,total_amount,payment_status,payment_terms,sales_channel,
   notes,metadata,history_batch_id,created_at,updated_at)
select
  md5('history-sale-'||s.n)::uuid,
  o.id,
  md5('history-customer-account-'||s.customer_n)::uuid,
  sp.ids[((s.n-1)%cardinality(sp.ids))+1],
  'IS-SALE-'||to_char(s.sale_date,'YYYY')||'-'||lpad(s.n::text,6,'0'),
  s.sale_date,
  s.sale_status,
  'USD',
  s.subtotal,
  s.discount_total,
  round((s.subtotal-s.discount_total)*0.085,2),
  round(s.subtotal-s.discount_total+(s.subtotal-s.discount_total)*0.085,2),
  s.pay_status,
  case when s.n%4=0 then 'Net 45' when s.n%3=0 then 'Net 15' else 'Net 30' end,
  (array['direct','partner','marketplace','enterprise_sales'])[((s.n*5-1)%4)+1],
  'Historical customer purchase recorded in the company sales ledger.',
  jsonb_build_object('record_lineage','company_history_seed_v1','currency_basis','USD'),
  b.id,
  s.sale_date::timestamptz,
  s.sale_date::timestamptz
from sale_base s
cross join public.organizations o
cross join sales_people sp
cross join public.company_history_batches b
where o.slug='intellistack-managed-services'
  and b.batch_key='intellistack-company-history-2020-2026-v1'
  and cardinality(sp.ids)>0
on conflict (id) do nothing;

with product_list as (
  select id,product_key,name,sku,row_number() over(order by sort_order,product_key) rn,count(*) over() total
  from public.marketplace_products where active_status='active'
),
sales as (
  select s.id,s.organization_id,s.sale_number,s.subtotal,s.sale_date,
         row_number() over(order by s.sale_number) n
  from public.marketplace_sales s
  where s.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
)
insert into public.marketplace_sale_items
  (id,organization_id,sale_id,product_id,product_key,product_name,sku,quantity,unit_monthly_price,setup_fee,line_total,price_snapshot,history_batch_id,created_at)
select
  md5('history-sale-item-'||s.n||'-'||line_no)::uuid,
  s.organization_id,
  s.id,
  p.id,
  p.product_key,
  p.name,
  p.sku,
  case when s.n%5=0 then 2 else 1 end,
  round((case when line_no=1 then s.subtotal*0.60 else s.subtotal-(s.subtotal*0.60) end) / case when s.n%5=0 then 2 else 1 end,2),
  case when line_no=1 and s.n%7=0 then 250 else 0 end,
  case when line_no=1 then round(s.subtotal*0.60,2) else s.subtotal-round(s.subtotal*0.60,2) end,
  jsonb_build_object('historical_unit_price',true,'product_key',p.product_key),
  (select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1'),
  s.sale_date::timestamptz
from sales s
cross join generate_series(1,2) line_no
join product_list p on p.rn = (((s.n*3 + line_no*5 - 2) % p.total)+1)
on conflict (id) do nothing;

-- Subscription lifecycle for closed-won and active sales.
with sales as (
  select s.*, row_number() over(order by s.sale_number) n
  from public.marketplace_sales s
  where s.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
    and s.status in ('closed_won','active')
)
insert into public.marketplace_customer_subscriptions
  (id,organization_id,customer_account_id,source_sale_id,subscription_number,plan_key,billing_cycle,
   monthly_amount,status,starts_at,current_period_start,current_period_end,next_billing_at,cancelled_at,
   metadata,history_batch_id,created_at,updated_at)
select
  md5('history-subscription-'||s.n)::uuid,
  s.organization_id,
  s.customer_account_id,
  s.id,
  'IS-SUB-'||to_char(s.sale_date,'YYYY')||'-'||lpad(s.n::text,6,'0'),
  'level-'||(((s.n-1)%5)+1),
  case when s.n%3=0 then 'annual' else 'monthly' end,
  round(s.total_amount / case when s.n%3=0 then 12 else 1 end,2),
  case when s.sale_date > (now() at time zone 'America/Chicago')::date-180 then 'active'
       when s.n%17=0 then 'past_due'
       when s.n%11=0 then 'paused'
       when s.n%7=0 then 'cancelled'
       else 'expired' end,
  s.sale_date,
  s.sale_date,
  case when s.n%3=0 then (s.sale_date + interval '1 year')::date else (s.sale_date + interval '1 month')::date end,
  case when s.sale_date > (now() at time zone 'America/Chicago')::date-180 then
    case when s.n%3=0 then (s.sale_date + interval '1 year')::date else (s.sale_date + interval '1 month')::date end
    else null end,
  case when s.sale_date <= (now() at time zone 'America/Chicago')::date-180 and (s.n%7=0 or s.n%11=0) then least((now() at time zone 'America/Chicago')::date,s.sale_date+interval '18 months')::date else null end,
  jsonb_build_object('record_lineage','company_history_seed_v1','source_sale_number',s.sale_number),
  (select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1'),
  s.sale_date::timestamptz,
  s.sale_date::timestamptz
from sales s
on conflict (id) do nothing;

insert into public.marketplace_customer_subscription_events
  (id,organization_id,subscription_id,event_type,event_at,description,new_value,history_batch_id,created_at)
select
  md5('history-sub-event-'||s.subscription_number||'-created')::uuid,
  s.organization_id,s.id,'created',s.starts_at::timestamptz,
  'Subscription created from marketplace purchase.',
  jsonb_build_object('plan_key',s.plan_key,'billing_cycle',s.billing_cycle,'monthly_amount',s.monthly_amount),
  s.history_batch_id,s.starts_at::timestamptz
from public.marketplace_customer_subscriptions s
where s.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
on conflict (id) do nothing;

insert into public.marketplace_customer_subscription_events
  (id,organization_id,subscription_id,event_type,event_at,description,previous_value,new_value,history_batch_id,created_at)
select
  md5('history-sub-event-'||s.subscription_number||'-renewal')::uuid,
  s.organization_id,s.id,'renewed',
  least((now() at time zone 'America/Chicago')::date,s.starts_at + interval '1 year')::timestamptz,
  'Subscription renewal recorded in account history.',
  jsonb_build_object('status','active'),
  jsonb_build_object('renewal_cycle',case when s.billing_cycle='annual' then 'annual' else 'monthly' end),
  s.history_batch_id,
  least((now() at time zone 'America/Chicago')::date,s.starts_at + interval '1 year')::timestamptz
from public.marketplace_customer_subscriptions s
where s.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
  and s.starts_at < (now() at time zone 'America/Chicago')::date-interval '1 year'
on conflict (id) do nothing;

-- One invoice per sale; balances reconcile exactly to amount paid.
insert into public.company_invoices
  (id,organization_id,customer_account_id,sale_id,invoice_number,issued_at,due_at,invoice_status,currency,
   subtotal,tax_total,total,amount_paid,balance_due,paid_at,metadata,history_batch_id,created_at)
select
  md5('history-invoice-'||s.sale_number)::uuid,
  s.organization_id,s.customer_account_id,s.id,
  'IS-INV-'||to_char(s.sale_date,'YYYY')||'-'||lpad(row_number() over(order by s.sale_number)::text,6,'0'),
  s.sale_date,s.sale_date+30,
  case when s.payment_status='paid' then 'paid'
       when s.payment_status='partial' then 'partially_paid'
       when s.payment_status='overdue' then 'overdue'
       when s.payment_status='refunded' then 'refunded'
       else 'open' end,
  s.currency,s.subtotal,s.tax_total,s.total_amount,
  case when s.payment_status='paid' then s.total_amount
       when s.payment_status='partial' then round(s.total_amount*0.5,2)
       when s.payment_status='refunded' then s.total_amount
       else 0 end,
  case when s.payment_status='paid' or s.payment_status='refunded' then 0
       when s.payment_status='partial' then s.total_amount-round(s.total_amount*0.5,2)
       else s.total_amount end,
  case when s.payment_status in ('paid','refunded') then least((now() at time zone 'America/Chicago')::date,s.sale_date+20) else null end,
  jsonb_build_object('record_lineage','company_history_seed_v1'),
  s.history_batch_id,s.sale_date::timestamptz
from public.marketplace_sales s
where s.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
on conflict (id) do nothing;

-- Accrual revenue and operating expenses; these are ledger entries, not payment-provider events.
insert into public.company_financial_transactions
  (id,organization_id,customer_account_id,invoice_id,sale_id,transaction_number,transaction_date,
   transaction_type,category,description,amount,currency,transaction_status,reference,metadata,history_batch_id,created_at)
select
  md5('history-finance-revenue-'||s.sale_number)::uuid,
  s.organization_id,s.customer_account_id,i.id,s.id,
  'IS-FIN-REV-'||lpad(row_number() over(order by s.sale_number)::text,7,'0'),
  s.sale_date,'revenue','Marketplace subscription and product revenue',
  'Recognized marketplace revenue for sale '||s.sale_number,
  s.total_amount,s.currency,'posted',s.sale_number,
  jsonb_build_object('record_lineage','company_history_seed_v1','basis','fictional_company_ledger'),
  s.history_batch_id,s.sale_date::timestamptz
from public.marketplace_sales s
join public.company_invoices i on i.sale_id=s.id
where s.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
on conflict (id) do nothing;

insert into public.company_financial_transactions
  (id,organization_id,transaction_number,transaction_date,transaction_type,category,description,amount,
   currency,transaction_status,reference,metadata,history_batch_id,created_at)
select
  md5('history-finance-expense-'||g)::uuid,
  o.id,
  'IS-FIN-EXP-'||lpad(g::text,7,'0'),
  date '2020-02-10' + ((g*29)%2465),
  'expense',
  (array['Payroll','Cloud infrastructure','Product development','Facilities','Marketing','Insurance','Professional services','Hardware and equipment'])[((g*7-1)%8)+1],
  'Operating expense record for historical reporting period.',
  (2500 + (g%60)*425)::numeric(14,2),
  'USD','posted',
  'IS-EXP-'||lpad(g::text,7,'0'),
  jsonb_build_object('record_lineage','company_history_seed_v1','basis','fictional_company_ledger'),
  b.id,
  (date '2020-02-10' + ((g*29)%2465))::timestamptz
from generate_series(1,5000) g
cross join public.organizations o
cross join public.company_history_batches b
where o.slug='intellistack-managed-services'
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

-- Employment lifecycle: a hire event for every existing workforce member, plus career movement.
with people as (
  select w.*, row_number() over(order by w.employee_id) n
  from public.workforce_people w
  where w.organization_id=(select id from public.organizations where slug='intellistack-managed-services')
),
hire_dates as (
  select p.*,
    date '2020-02-10' + (((p.n*97)%2400)::int) as hire_date
  from people p
)
insert into public.workforce_employment_events
  (id,organization_id,workforce_person_id,event_number,event_type,event_date,new_title,new_department_id,
   new_status,notes,metadata,history_batch_id,created_at)
select
  md5('history-employment-hire-'||p.employee_id)::uuid,
  p.organization_id,p.id,'IS-EMP-EVT-HIRE-'||p.employee_id,'hire',p.hire_date,
  p.job_title,p.department_id,'active',
  'Original hire record in the company employment timeline.',
  jsonb_build_object('record_lineage','company_history_seed_v1','employee_id',p.employee_id),
  (select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1'),
  p.hire_date::timestamptz
from hire_dates p
on conflict (id) do nothing;

with people as (
  select w.*, row_number() over(order by w.employee_id) n
  from public.workforce_people w
  where w.organization_id=(select id from public.organizations where slug='intellistack-managed-services')
)
insert into public.workforce_employment_events
  (id,organization_id,workforce_person_id,event_number,event_type,event_date,previous_title,new_title,
   previous_department_id,new_department_id,notes,metadata,history_batch_id,created_at)
select
  md5('history-employment-promotion-'||p.employee_id)::uuid,
  p.organization_id,p.id,'IS-EMP-EVT-PROMO-'||p.employee_id,'promotion',
  least((now() at time zone 'America/Chicago')::date,date '2020-02-10' + (((p.n*97)%2400)::int) + interval '18 months')::date,
  p.job_title,
  case when p.job_level in ('Senior','Manager','Director','Executive') then p.job_title
       else 'Senior '||p.job_title end,
  p.department_id,p.department_id,
  'Career progression and role-level review.',
  jsonb_build_object('record_lineage','company_history_seed_v1'),
  (select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1'),
  least((now() at time zone 'America/Chicago')::date,date '2020-02-10' + (((p.n*97)%2400)::int) + interval '18 months')::timestamptz
from people p
where p.n%3=0
on conflict (id) do nothing;

-- 2,500 customer staffing assignments.
with people as (
  select id,job_title,row_number() over(order by employee_id) n
  from public.workforce_people
  where organization_id=(select id from public.organizations where slug='intellistack-managed-services')
),
accounts as (
  select id,row_number() over(order by account_number) n
  from public.marketplace_customer_accounts
  where history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
)
insert into public.workforce_staffing_assignments
  (id,organization_id,workforce_person_id,customer_account_id,assignment_number,role_title,project_name,
   assignment_type,assignment_status,starts_at,ends_at,hourly_rate,bill_rate,currency,supervisor_person_id,
   notes,metadata,history_batch_id,created_at)
select
  md5('history-staffing-assignment-'||g)::uuid,
  (select id from public.organizations where slug='intellistack-managed-services'),
  p.id,a.id,'IS-STAFF-'||lpad(g::text,6,'0'),
  p.job_title,
  (array['Enterprise rollout','Identity modernization','Cloud migration','Security operations','Network transformation','Service desk optimization','Workforce platform deployment','Data governance program'])[((g*3-1)%8)+1],
  case when g%9=0 then 'contractor' when g%7=0 then 'consultant' else 'employee' end,
  case when g%29=0 then 'cancelled'
       when date '2020-02-10'+((g*19)%2200) > (now() at time zone 'America/Chicago')::date-180 then 'active'
       else 'completed' end,
  date '2020-02-10'+((g*19)%2200),
  case when g%29=0 or date '2020-02-10'+((g*19)%2200) <= (now() at time zone 'America/Chicago')::date-180
       then least((now() at time zone 'America/Chicago')::date,date '2020-02-10'+((g*19)%2200)+90+(g%270)) else null end,
  35+(g%50),75+(g%90),'USD',
  (select id from public.workforce_people where job_title='Chief Operating Officer' order by employee_id limit 1),
  'Customer-facing workforce assignment with recorded delivery and closeout history.',
  jsonb_build_object('record_lineage','company_history_seed_v1'),
  (select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1'),
  (date '2020-02-10'+((g*19)%2200))::timestamptz
from generate_series(1,2500) g
join people p on p.n=((g*7-1)%3500)+1
join accounts a on a.n=((g*13-1)%1000)+1
on conflict (id) do nothing;

-- 400 hiring requisitions across the founding-to-current timeline.
with departments as (
  select id,row_number() over(order by name) n,count(*) over() total
  from public.departments
  where organization_id=(select id from public.organizations where slug='intellistack-managed-services')
),
managers as (
  select id,row_number() over(order by employee_id) n,count(*) over() total
  from public.workforce_people
  where organization_id=(select id from public.organizations where slug='intellistack-managed-services')
    and department_id in (
      select id from public.departments where name in ('Executive','Human Resources')
    )
)
insert into public.intellihire_requisitions
  (id,organization_id,department_id,hiring_manager_person_id,requisition_number,title,job_description,
   employment_type,headcount,salary_min,salary_max,currency,location_city,location_region,
   requisition_status,opened_at,closed_at,metadata,history_batch_id,created_at)
select
  md5('history-requisition-'||g)::uuid,
  o.id,d.id,m.id,'IS-REQ-'||lpad(g::text,6,'0'),
  (array['Help Desk Analyst','Systems Administrator','Security Operations Analyst','Network Engineer','Software Engineer','Product Manager','Financial Analyst','Human Resources Partner','Customer Success Manager','Cloud Architect','Data Analyst','IT Asset Manager'])[((g*5-1)%12)+1],
  'Position supporting IntelliStack enterprise operations, customer delivery, and company growth.',
  (array['full_time','contract','part_time','temporary'])[((g*3-1)%4)+1],
  1+(g%4),55000+(g%12)*5000,75000+(g%15)*6500,'USD',
  (array['Chicago','Dallas','Atlanta','Denver','Seattle','Remote'])[((g*7-1)%6)+1],
  (array['IL','TX','GA','CO','WA','US'])[((g*7-1)%6)+1],
  case when g%100<65 then 'filled' when g%100<82 then 'closed'
       when g%100<92 then 'open' when g%100<97 then 'on_hold' else 'cancelled' end,
  date '2020-02-10'+((g*23)%2300),
  case when g%100<82 or g%100>=97
       then least((now() at time zone 'America/Chicago')::date,date '2020-02-10'+((g*23)%2300)+30+(g%180))
       else null end,
  jsonb_build_object('record_lineage','company_history_seed_v1'),
  b.id,
  (date '2020-02-10'+((g*23)%2300))::timestamptz
from generate_series(1,400) g
cross join public.organizations o
cross join public.company_history_batches b
join departments d on d.n=((g*3-1)%d.total)+1
join managers m on m.n=((g*7-1)%m.total)+1
where o.slug='intellistack-managed-services'
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

-- 5,000 candidate profiles; hired candidates map to existing employee records.
with people as (
  select id,row_number() over(order by employee_id) n
  from public.workforce_people
  where organization_id=(select id from public.organizations where slug='intellistack-managed-services')
)
insert into public.intellihire_candidates
  (id,organization_id,candidate_number,first_name,last_name,email,phone,headline,summary,
   years_experience,skills,candidate_source,candidate_status,home_city,home_region,
   hired_workforce_person_id,created_at,updated_at,history_batch_id)
select
  md5('history-candidate-'||g)::uuid,
  o.id,'IS-CAN-'||lpad(g::text,6,'0'),
  (array['Jordan','Taylor','Morgan','Avery','Riley','Cameron','Parker','Quinn','Reese','Drew','Alex','Casey','Jamie','Rowan','Skyler','Emerson','Harper','Blake','Devon','Payton'])[((g*3-1)%20)+1],
  (array['Bennett','Brooks','Carter','Collins','Edwards','Foster','Gray','Hayes','Jenkins','Morgan','Parker','Reed','Sullivan','Turner','Warren','Miller','Nelson','Torres','Lewis','Thompson'])[((g*7-1)%20)+1],
  'candidate.'||lpad(g::text,6,'0')||'@talent.intellistack.example',
  '+1-312-555-'||lpad((1000+(g%8999))::text,4,'0'),
  (array['IT Operations Professional','Enterprise Technology Leader','Security and Compliance Analyst','Cloud Platform Engineer','Business Operations Specialist','People and Talent Partner','Financial Operations Analyst'])[((g*5-1)%7)+1],
  'Experienced professional with a background in enterprise delivery, collaboration, and operational improvement.',
  (g%21)::numeric(4,1),
  jsonb_build_array(
    (array['ITIL','Microsoft 365','Networking','Security','Project Management','Finance','Recruiting','Cloud','Data Analysis','Customer Support'])[((g*3-1)%10)+1],
    (array['Leadership','Incident Management','Automation','Compliance','Communication','Documentation','Analytics','Systems Administration'])[((g*7-1)%8)+1]
  ),
  (array['career_site','employee_referral','agency','professional_network','direct'])[((g*11-1)%5)+1],
  case when g<=1750 then 'hired'
       when g%10<2 then 'interviewing'
       when g%10<4 then 'screening'
       when g%10<6 then 'rejected'
       when g%10=6 then 'withdrawn'
       else 'talent_pool' end,
  (array['Chicago','Oak Park','Naperville','Evanston','Dallas','Atlanta','Denver','Seattle','Remote'])[((g*13-1)%9)+1],
  (array['IL','IL','IL','IL','TX','GA','CO','WA','US'])[((g*13-1)%9)+1],
  case when g<=1750 then p.id else null end,
  (date '2020-02-10'+((g*19)%2300))::timestamptz,
  (date '2020-02-10'+((g*19)%2300))::timestamptz,
  b.id
from generate_series(1,5000) g
cross join public.organizations o
cross join public.company_history_batches b
left join people p on p.n=g
where o.slug='intellistack-managed-services'
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

-- 8,000 applications with recruiter and requisition links.
with app_src as (
  select g n,(((g*31-1)%5000)+1) candidate_n,(((g*17-1)%400)+1) req_n
  from generate_series(1,8000) g
),
recruiters as (
  select array_agg(id order by employee_id) ids
  from public.workforce_people
  where department_id=(select id from public.departments where name='Human Resources' and organization_id=(select id from public.organizations where slug='intellistack-managed-services'))
)
insert into public.intellihire_applications
  (id,organization_id,application_number,candidate_id,requisition_id,application_status,stage,fit_score,
   recruiter_person_id,hired_workforce_person_id,applied_at,last_activity_at,notes,metadata,history_batch_id,created_at)
select
  md5('history-application-'||a.n)::uuid,
  o.id,'IS-APP-'||lpad(a.n::text,7,'0'),
  md5('history-candidate-'||a.candidate_n)::uuid,
  md5('history-requisition-'||a.req_n)::uuid,
  case when a.n%100<12 then 'hired'
       when a.n%100<28 then 'interview'
       when a.n%100<40 then 'offer'
       when a.n%100<60 then 'screening'
       when a.n%100<75 then 'shortlisted'
       when a.n%100<90 then 'rejected'
       else 'withdrawn' end,
  case when a.n%100<12 then 'hired'
       when a.n%100<28 then 'interview'
       when a.n%100<40 then 'offer'
       when a.n%100<60 then 'screening'
       else 'closed' end,
  (55+(a.n%46))::numeric(5,2),
  r.ids[((a.n-1)%cardinality(r.ids))+1],
  case when a.n%100<12 then (select hired_workforce_person_id from public.intellihire_candidates where id=md5('history-candidate-'||a.candidate_n)::uuid) else null end,
  greatest(c.created_at::date,date '2020-02-10'+((a.n*41)%2300)),
  least((now() at time zone 'America/Chicago')::date,greatest(c.created_at::date,date '2020-02-10'+((a.n*41)%2300))+ (a.n%45)),
  'Application history includes screening, evaluation, and hiring-stage decisions.',
  jsonb_build_object('record_lineage','company_history_seed_v1'),
  b.id,
  greatest(c.created_at::date,date '2020-02-10'+((a.n*41)%2300))::timestamptz
from app_src a
join public.intellihire_candidates c on c.id=md5('history-candidate-'||a.candidate_n)::uuid
join public.intellihire_requisitions q on q.id=md5('history-requisition-'||a.req_n)::uuid
cross join public.organizations o
cross join public.company_history_batches b
cross join recruiters r
where o.slug='intellistack-managed-services'
  and b.batch_key='intellistack-company-history-2020-2026-v1'
  and cardinality(r.ids)>0
on conflict (id) do nothing;

-- 3,000 interview records.
insert into public.intellihire_interviews
  (id,organization_id,interview_number,application_id,interviewer_person_id,interview_type,
   scheduled_at,outcome,feedback,history_batch_id,created_at)
select
  md5('history-interview-'||g)::uuid,
  o.id,'IS-INT-'||lpad(g::text,6,'0'),
  md5('history-application-'||(((g*13-1)%8000)+1))::uuid,
  (select id from public.workforce_people where job_title in ('Chief Executive Officer','Chief Financial Officer','Human Resources Director','Recruitment Manager') order by employee_id offset (g%5) limit 1),
  (array['recruiter_screen','technical','panel','executive','culture'])[((g*3-1)%5)+1],
  (date '2020-02-10'+((g*31)%2400)+(g%30))::timestamptz + interval '10 hours',
  case when g%20<11 then 'passed' when g%20<16 then 'failed' when g%20<19 then 'hold' else 'cancelled' end,
  'Interview feedback recorded for role alignment, skills, and team fit.',
  b.id,
  (date '2020-02-10'+((g*31)%2400)+(g%30))::timestamptz
from generate_series(1,3000) g
cross join public.organizations o
cross join public.company_history_batches b
where o.slug='intellistack-managed-services'
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

-- IntelliWork: three employment documents per employee.
with people as (
  select w.*,row_number() over(order by w.employee_id) n
  from public.workforce_people w
  where w.organization_id=(select id from public.organizations where slug='intellistack-managed-services')
),
doc_types as (
  select * from (values
    (1,'employment_agreement','Employment Agreement','intelliwork'),
    (2,'policy_acknowledgement','Employee Policy Acknowledgement','intelliwork'),
    (3,'annual_performance_review','Annual Performance Review','intelliwork')
  ) v(n,doc_type,title,module_key)
)
insert into public.workforce_documents
  (id,organization_id,document_number,module_key,document_type,title,workforce_person_id,
   effective_date,expires_at,document_status,content_markdown,issued_by_person_id,metadata,history_batch_id,created_at)
select
  md5('history-intelliwork-doc-'||p.employee_id||'-'||d.n)::uuid,
  p.organization_id,
  'IS-WORK-DOC-'||p.employee_id||'-'||d.n,
  d.module_key,d.doc_type,d.title,p.id,
  date '2020-02-10'+(((p.n*97)%2400)::int),
  case when d.n=2 then date '2020-02-10'+(((p.n*97)%2400)::int)+365 else null end,
  case when d.n=3 and p.n%5=0 then 'archived' else 'signed' end,
  '# '||d.title||E'\n\nEmployee: '||p.display_name||E'\nEmployee ID: '||p.employee_id||
  E'\nEffective date: '||(date '2020-02-10'+(((p.n*97)%2400)::int))::text||
  E'\n\nThis document is part of the employee''s IntelliWork employment record. It records the applicable policy, role expectations, acknowledgement, and review history.',
  (select id from public.workforce_people where job_title='Chief Human Resources Officer' order by employee_id limit 1),
  jsonb_build_object('record_lineage','company_history_seed_v1','employee_id',p.employee_id),
  (select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1'),
  (date '2020-02-10'+(((p.n*97)%2400)::int))::timestamptz
from people p cross join doc_types d
on conflict (id) do nothing;

-- IntelliHire: one candidate file per candidate.
insert into public.workforce_documents
  (id,organization_id,document_number,module_key,document_type,title,candidate_id,
   effective_date,document_status,content_markdown,metadata,history_batch_id,created_at)
select
  md5('history-intellihire-doc-'||c.candidate_number)::uuid,
  c.organization_id,
  'IS-HIRE-DOC-'||c.candidate_number,
  'intellihire','candidate_profile','Candidate Profile and Resume Summary',c.id,
  c.created_at::date,
  case when c.candidate_status in ('hired','rejected','withdrawn') then 'archived' else 'active' end,
  '# Candidate Profile'||E'\n\n'||c.first_name||' '||c.last_name||
  E'\n'||coalesce(c.headline,'Professional candidate')||
  E'\n\n'||coalesce(c.summary,'Candidate profile maintained by IntelliHire.')||
  E'\n\nSkills: '||c.skills::text,
  jsonb_build_object('record_lineage','company_history_seed_v1','candidate_number',c.candidate_number),
  c.history_batch_id,
  c.created_at
from public.intellihire_candidates c
where c.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
on conflict (id) do nothing;

-- IntelliStaff: two documents for each customer staffing assignment.
insert into public.workforce_documents
  (id,organization_id,document_number,module_key,document_type,title,workforce_person_id,
   staffing_assignment_id,effective_date,document_status,content_markdown,metadata,history_batch_id,created_at)
select
  md5('history-intellistaff-doc-'||a.assignment_number||'-'||d.n)::uuid,
  a.organization_id,
  'IS-STAFF-DOC-'||a.assignment_number||'-'||d.n,
  'intellistaff',d.doc_type,d.title,a.workforce_person_id,a.id,a.starts_at,
  case when a.assignment_status='completed' then 'archived' else 'signed' end,
  '# '||d.title||E'\n\nAssignment: '||a.assignment_number||
  E'\nProject: '||a.project_name||
  E'\nRole: '||a.role_title||
  E'\nStart: '||a.starts_at::text||
  E'\n\nThis record documents the customer assignment, responsibilities, service expectations, and delivery closeout.',
  jsonb_build_object('record_lineage','company_history_seed_v1','assignment_number',a.assignment_number),
  a.history_batch_id,
  a.starts_at::timestamptz
from public.workforce_staffing_assignments a
cross join (values (1,'assignment_agreement','Staffing Assignment Agreement'),(2,'project_delivery_record','Project Delivery Record')) d(n,doc_type,title)
where a.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
on conflict (id) do nothing;

-- CEO and CFO annual reports, 2020-2026.
with years as (
  select generate_series(2020,2026) yr
),
execs as (
  select
    (select id from public.workforce_people where job_title='Chief Executive Officer' order by employee_id limit 1) ceo_id,
    (select id from public.workforce_people where job_title='Chief Financial Officer' order by employee_id limit 1) cfo_id
),
annual as (
  select y.yr,
    case when y.yr=2020 then date '2020-02-10' else make_date(y.yr,1,1) end period_start,
    case when y.yr=2026 then (now() at time zone 'America/Chicago')::date else make_date(y.yr,12,31) end period_end,
    coalesce(sum(s.total_amount),0) revenue,
    count(s.id) sales_count
  from years y
  left join public.marketplace_sales s
    on s.sale_date >= case when y.yr=2020 then date '2020-02-10' else make_date(y.yr,1,1) end
   and s.sale_date <= case when y.yr=2026 then (now() at time zone 'America/Chicago')::date else make_date(y.yr,12,31) end
   and s.status in ('closed_won','active')
  group by y.yr
)
insert into public.executive_period_reports
  (id,organization_id,report_number,report_type,period_start,period_end,title,executive_summary,metrics,
   prepared_by_person_id,report_status,history_batch_id,created_at)
select
  md5('history-exec-report-'||a.yr||'-'||t.report_type)::uuid,
  o.id,
  'IS-EXEC-'||a.yr||'-'||upper(t.report_type),
  t.report_type,a.period_start,a.period_end,
  case when t.report_type='ceo' then 'CEO Annual Operating Review '||a.yr else 'CFO Annual Financial Review '||a.yr end,
  case when t.report_type='ceo'
    then 'Annual executive review covering customer acquisition, product adoption, workforce growth, and operating priorities.'
    else 'Annual financial review covering recognized marketplace revenue, customer sales, operating costs, and financial planning.'
  end,
  jsonb_build_object('revenue',round(a.revenue,2),'sales_count',a.sales_count,'period_year',a.yr,
    'workforce_count',(select count(*) from public.workforce_people),
    'customer_accounts',(select count(*) from public.marketplace_customer_accounts)),
  case when t.report_type='ceo' then e.ceo_id else e.cfo_id end,
  'approved',b.id,a.period_end::timestamptz
from annual a
cross join execs e
cross join (values ('ceo'),('cfo')) t(report_type)
cross join public.organizations o
cross join public.company_history_batches b
where o.slug='intellistack-managed-services'
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

update public.company_history_batches
set status='completed',
    completed_at=now(),
    record_counts=jsonb_build_object(
      'customer_accounts',(select count(*) from public.marketplace_customer_accounts where history_batch_id=company_history_batches.id),
      'customer_contacts',(select count(*) from public.marketplace_customer_contacts where history_batch_id=company_history_batches.id),
      'sales',(select count(*) from public.marketplace_sales where history_batch_id=company_history_batches.id),
      'sale_items',(select count(*) from public.marketplace_sale_items where history_batch_id=company_history_batches.id),
      'subscriptions',(select count(*) from public.marketplace_customer_subscriptions where history_batch_id=company_history_batches.id),
      'subscription_events',(select count(*) from public.marketplace_customer_subscription_events where history_batch_id=company_history_batches.id),
      'invoices',(select count(*) from public.company_invoices where history_batch_id=company_history_batches.id),
      'financial_transactions',(select count(*) from public.company_financial_transactions where history_batch_id=company_history_batches.id),
      'employment_events',(select count(*) from public.workforce_employment_events where history_batch_id=company_history_batches.id),
      'staffing_assignments',(select count(*) from public.workforce_staffing_assignments where history_batch_id=company_history_batches.id),
      'requisitions',(select count(*) from public.intellihire_requisitions where history_batch_id=company_history_batches.id),
      'candidates',(select count(*) from public.intellihire_candidates where history_batch_id=company_history_batches.id),
      'applications',(select count(*) from public.intellihire_applications where history_batch_id=company_history_batches.id),
      'interviews',(select count(*) from public.intellihire_interviews where history_batch_id=company_history_batches.id),
      'documents',(select count(*) from public.workforce_documents where history_batch_id=company_history_batches.id),
      'executive_reports',(select count(*) from public.executive_period_reports where history_batch_id=company_history_batches.id)
    )
where batch_key='intellistack-company-history-2020-2026-v1';

commit;