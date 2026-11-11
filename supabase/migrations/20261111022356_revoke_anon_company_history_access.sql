-- Keep company-history tables private to authenticated, policy-authorized users.
do $$
declare t text;
begin
  foreach t in array array[
    'company_history_batches','marketplace_customer_accounts','marketplace_customer_contacts',
    'marketplace_sales','marketplace_sale_items','marketplace_customer_subscriptions',
    'marketplace_customer_subscription_events','company_invoices','company_financial_transactions',
    'workforce_employment_events','workforce_staffing_assignments','intellihire_requisitions',
    'intellihire_candidates','intellihire_applications','intellihire_interviews',
    'workforce_documents','executive_period_reports'
  ] loop
    execute format('revoke all on table public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated, service_role', t);
  end loop;
end $$;