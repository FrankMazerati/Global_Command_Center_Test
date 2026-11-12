-- Public website CMS, social destinations, and contact intake.
-- Only published page content and active social links are public.
-- Global-admin-only mutations are enforced by RLS, not by UI visibility.

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  content_markdown text not null default '',
  page_type text not null default 'standard' check (page_type in ('standard','legal','marketing','trust','support')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  locale text not null default 'en-US',
  seo_title text,
  seo_description text,
  canonical_path text,
  og_image_url text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_pages_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint site_pages_title_length check (char_length(title) between 1 and 180),
  constraint site_pages_summary_length check (char_length(summary) <= 500),
  constraint site_pages_content_length check (char_length(content_markdown) <= 100000),
  constraint site_pages_seo_description_length check (seo_description is null or char_length(seo_description) <= 320)
);

create table if not exists public.site_social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text not null,
  url text not null,
  icon_key text not null default 'link',
  sort_order integer not null default 0,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_social_links_platform_length check (char_length(platform) between 1 and 50),
  constraint site_social_links_label_length check (char_length(label) between 1 and 80),
  constraint site_social_links_url_https check (url ~ '^https://'),
  constraint site_social_links_icon_key check (icon_key in ('linkedin','facebook','instagram','x','youtube','tiktok','threads','github','link'))
);

create table if not exists public.site_contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  topic text not null default 'General inquiry',
  message text not null,
  consent boolean not null default false,
  status text not null default 'new' check (status in ('new','in_review','responded','closed','spam')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_contact_name_length check (char_length(name) between 1 and 160),
  constraint site_contact_email_length check (char_length(email) between 3 and 254),
  constraint site_contact_message_length check (char_length(message) between 10 and 10000),
  constraint site_contact_consent_required check (consent = true)
);

create index if not exists site_pages_status_locale_idx on public.site_pages(status, locale);
create index if not exists site_social_links_active_sort_idx on public.site_social_links(is_active, sort_order);
create index if not exists site_contact_submissions_status_created_idx on public.site_contact_submissions(status, created_at desc);

alter table public.site_pages enable row level security;
alter table public.site_social_links enable row level security;
alter table public.site_contact_submissions enable row level security;

drop policy if exists site_pages_public_read on public.site_pages;
create policy site_pages_public_read on public.site_pages
  for select to anon, authenticated using (status = 'published');

drop policy if exists site_pages_global_admin_all on public.site_pages;
create policy site_pages_global_admin_all on public.site_pages
  for all to authenticated using (public.is_global_admin()) with check (public.is_global_admin());

drop policy if exists site_social_links_public_read on public.site_social_links;
create policy site_social_links_public_read on public.site_social_links
  for select to anon, authenticated using (is_active = true);

drop policy if exists site_social_links_global_admin_all on public.site_social_links;
create policy site_social_links_global_admin_all on public.site_social_links
  for all to authenticated using (public.is_global_admin()) with check (public.is_global_admin());

drop policy if exists site_contact_public_submit on public.site_contact_submissions;
create policy site_contact_public_submit on public.site_contact_submissions
  for insert to anon, authenticated with check (
    consent = true
    and status = 'new'
    and assigned_to is null
    and char_length(trim(name)) between 1 and 160
    and char_length(trim(email)) between 3 and 254
    and char_length(trim(message)) between 10 and 10000
  );

drop policy if exists site_contact_global_admin_read on public.site_contact_submissions;
create policy site_contact_global_admin_read on public.site_contact_submissions
  for select to authenticated using (public.is_global_admin());

drop policy if exists site_contact_global_admin_update on public.site_contact_submissions;
create policy site_contact_global_admin_update on public.site_contact_submissions
  for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin());

grant select on public.site_pages to anon, authenticated;
grant insert, update, delete on public.site_pages to authenticated;
grant select on public.site_social_links to anon, authenticated;
grant insert, update, delete on public.site_social_links to authenticated;
grant insert on public.site_contact_submissions to anon, authenticated;
grant select, update on public.site_contact_submissions to authenticated;

-- Seed public corporate pages as drafts. They must be reviewed and published by a Global Admin.
insert into public.site_pages (slug,title,summary,content_markdown,page_type,seo_title,seo_description)
values
('about','About IntelliStack Systems','Learn about IntelliStack Systems and the Maximus Optimus Command Center.','## About IntelliStack Systems\n\nIntelliStack Systems is building a connected enterprise operations platform. This page is a draft for company-approved history, leadership, mission, and corporate details.\n\n**Editorial review required:** replace this placeholder with verified company information before publication.','marketing','About IntelliStack Systems','About IntelliStack Systems and the Maximus Optimus Command Center.'),
('contact','Contact IntelliStack Systems','Contact the IntelliStack Systems team.','## Contact IntelliStack Systems\n\nUse the secure inquiry form on this page. Do not submit passwords, payment details, or confidential incident evidence.','support','Contact IntelliStack Systems','Contact IntelliStack Systems for business, product, and support inquiries.'),
('privacy','Privacy Policy','How IntelliStack Systems collects, uses, protects, and retains information.','## Privacy Policy\n\n**Draft — not a legal notice. Do not publish until reviewed by qualified privacy/legal counsel.**\n\nThis draft requires verified details about the legal entity, data controller, categories of personal information, purposes and legal bases, processors and subprocessors, international transfers, retention periods, user rights, contact details, and jurisdiction-specific notices.','legal','Privacy Policy | IntelliStack Systems','Draft privacy policy requiring legal review before publication.'),
('terms','Terms of Service','Terms governing access to IntelliStack products and services.','## Terms of Service\n\n**Draft — not binding terms. Do not publish until reviewed by qualified legal counsel.**\n\nThis draft requires verified legal entity and address, service scope, account responsibilities, fees, renewals, acceptable use, intellectual property, disclaimers, liability, dispute resolution, governing law, termination, and effective date.','legal','Terms of Service | IntelliStack Systems','Draft terms of service requiring legal review before publication.'),
('security','Security Center','Security practices, reporting, and responsible disclosure information.','## Security Center\n\nThis page must describe only verified implemented security controls. Add approved encryption, access control, incident response, vulnerability reporting, data handling, and security contact details after internal validation. Do not claim certifications or attestations unless independently verified.','trust','Security Center | IntelliStack Systems','Security information and responsible disclosure for IntelliStack Systems.'),
('accessibility','Accessibility Statement','Accessibility commitment and ways to report barriers.','## Accessibility Statement\n\nThis page is a draft. Confirm the accessibility standard, conformance testing scope, known limitations, remediation process, and contact channel before publication.','legal','Accessibility | IntelliStack Systems','Accessibility information and support contact details.'),
('responsible-disclosure','Responsible Disclosure','How to report suspected security vulnerabilities responsibly.','## Responsible Disclosure\n\nPublish only after the security team confirms a monitored reporting channel, response process, scope, safe-harbor terms, and escalation contact. Do not publish an unmonitored email address.','trust','Responsible Disclosure | IntelliStack Systems','How to report a suspected security vulnerability to IntelliStack Systems.')
on conflict (slug) do nothing;
