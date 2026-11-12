revoke all privileges on all tables in schema public from anon;
grant select on table public.company_site_pages, public.site_pages, public.site_social_links to anon;
grant insert on table public.site_contact_submissions to anon;
revoke all privileges on all sequences in schema public from anon;
