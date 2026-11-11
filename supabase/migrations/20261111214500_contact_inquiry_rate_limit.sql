-- Basic server-side contact intake throttling.
-- This is an email-based abuse guard, not a replacement for CAPTCHA/WAF controls.
create index if not exists site_contact_email_created_idx
  on public.site_contact_submissions (lower(email), created_at desc);

create or replace function public.enforce_site_contact_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  recent_count integer;
begin
  new.name := trim(new.name);
  new.email := lower(trim(new.email));
  new.company := nullif(trim(coalesce(new.company,'')), '');
  perform pg_advisory_xact_lock(hashtextextended(new.email, 0));
  select count(*) into recent_count
    from public.site_contact_submissions
    where lower(email) = new.email
      and created_at > now() - interval '15 minutes';
  if recent_count >= 3 then
    raise exception using
      errcode = 'P0001',
      message = 'Please wait before submitting another inquiry.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_site_contact_rate_limit() from public, anon, authenticated;
drop trigger if exists site_contact_rate_limit_before_insert on public.site_contact_submissions;
create trigger site_contact_rate_limit_before_insert
  before insert on public.site_contact_submissions
  for each row execute function public.enforce_site_contact_rate_limit();
