-- Validate public CMS URLs at the database boundary, not only in the form.
alter table public.site_pages
  add constraint site_pages_seo_title_length check (seo_title is null or char_length(seo_title) <= 180),
  add constraint site_pages_canonical_path_local check (canonical_path is null or (left(canonical_path,1)='/' and left(canonical_path,2)<>'//')),
  add constraint site_pages_og_image_https check (og_image_url is null or og_image_url ~ '^https://');

alter table public.site_social_links
  add constraint site_social_links_url_length check (char_length(url) <= 2048),
  add constraint site_social_links_platform_host check (
    (lower(platform)='linkedin' and url ~* '^https://([a-z0-9-]+\.)*linkedin\.com(/|$)')
    or (lower(platform)='facebook' and url ~* '^https://([a-z0-9-]+\.)*facebook\.com(/|$)')
    or (lower(platform)='instagram' and url ~* '^https://([a-z0-9-]+\.)*instagram\.com(/|$)')
    or (lower(platform)='x' and url ~* '^https://([a-z0-9-]+\.)*(x\.com|twitter\.com)(/|$)')
    or (lower(platform)='youtube' and url ~* '^https://([a-z0-9-]+\.)*youtube\.com(/|$)|^https://youtu\.be(/|$)')
    or (lower(platform)='tiktok' and url ~* '^https://([a-z0-9-]+\.)*tiktok\.com(/|$)')
    or (lower(platform)='threads' and url ~* '^https://([a-z0-9-]+\.)*threads\.net(/|$)')
    or (lower(platform)='github' and url ~* '^https://([a-z0-9-]+\.)*github\.com(/|$)')
  );
