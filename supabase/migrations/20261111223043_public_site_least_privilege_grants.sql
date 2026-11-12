-- Tighten table grants to match the public website's intended access model.
-- RLS remains the row-level authorization boundary; grants are least-privilege too.
revoke all on table public.site_pages from anon, authenticated;
revoke all on table public.site_social_links from anon, authenticated;
revoke all on table public.site_contact_submissions from anon, authenticated;

grant select on table public.site_pages to anon, authenticated;
grant insert, update, delete on table public.site_pages to authenticated;

grant select on table public.site_social_links to anon, authenticated;
grant insert, update, delete on table public.site_social_links to authenticated;

grant insert on table public.site_contact_submissions to anon, authenticated;
grant select, update on table public.site_contact_submissions to authenticated;
