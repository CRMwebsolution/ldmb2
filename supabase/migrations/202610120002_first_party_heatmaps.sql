-- Isolated first-party behavioral analytics. No customer, booking, order, or racer tables are modified.
create table if not exists public.web_analytics_site_versions (
  site_id text not null,
  deployment_version text not null,
  layout_version text not null,
  preview_url text,
  created_at timestamptz not null default now(),
  primary key (site_id, deployment_version)
);

create table if not exists public.web_analytics_sessions (
  id uuid primary key,
  site_id text not null,
  deployment_version text not null,
  layout_version text not null,
  device_class text not null check (device_class in ('desktop', 'tablet', 'mobile')),
  initial_viewport_width integer not null check (initial_viewport_width between 200 and 10000),
  initial_viewport_height integer not null check (initial_viewport_height between 200 and 10000),
  movement_sampled boolean not null default false,
  started_at timestamptz not null,
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.web_analytics_pageviews (
  id uuid primary key,
  session_id uuid not null references public.web_analytics_sessions(id) on delete cascade,
  site_id text not null,
  deployment_version text not null,
  layout_version text not null,
  pathname text not null check (pathname = '/' or pathname ~ '^/[a-z0-9][a-z0-9/_-]*$'),
  device_class text not null check (device_class in ('desktop', 'tablet', 'mobile')),
  viewport_width integer not null check (viewport_width between 200 and 10000),
  viewport_height integer not null check (viewport_height between 200 and 10000),
  document_width integer not null check (document_width between 200 and 30000),
  document_height integer not null check (document_height between 200 and 200000),
  started_at timestamptz not null,
  completed_at timestamptz,
  active_ms integer not null default 0 check (active_ms between 0 and 86400000),
  max_scroll_y integer not null default 0 check (max_scroll_y between 0 and 200000),
  max_scroll_ratio numeric(6,5) not null default 0 check (max_scroll_ratio between 0 and 1),
  created_at timestamptz not null default now()
);

create table if not exists public.web_analytics_interactions (
  id bigint generated always as identity primary key,
  pageview_id uuid not null references public.web_analytics_pageviews(id) on delete cascade,
  client_event_id uuid not null,
  event_kind text not null check (event_kind in ('click', 'move')),
  occurred_offset_ms integer not null check (occurred_offset_ms between 0 and 86400000),
  document_x integer not null check (document_x between 0 and 30000),
  document_y integer not null check (document_y between 0 and 200000),
  viewport_x integer not null check (viewport_x between -1000 and 11000),
  viewport_y integer not null check (viewport_y between -1000 and 11000),
  normalized_x numeric(8,7) not null check (normalized_x between 0 and 1),
  normalized_y numeric(8,7) not null check (normalized_y between 0 and 1),
  viewport_width integer not null,
  viewport_height integer not null,
  document_width integer not null,
  document_height integer not null,
  device_class text not null check (device_class in ('desktop', 'tablet', 'mobile')),
  element_key text,
  element_label text,
  element_tag text,
  element_role text,
  element_offset_x numeric(8,7),
  element_offset_y numeric(8,7),
  position_context text check (position_context is null or position_context in ('document', 'fixed', 'sticky')),
  probable_dead_click boolean not null default false,
  dead_click_reason text,
  created_at timestamptz not null default now(),
  unique(pageview_id, client_event_id)
);

create table if not exists public.web_analytics_section_views (
  pageview_id uuid not null references public.web_analytics_pageviews(id) on delete cascade,
  section_key text not null,
  reached boolean not null default true,
  visible_ms integer not null default 0 check (visible_ms between 0 and 86400000),
  max_visible_ratio numeric(6,5) not null default 0 check (max_visible_ratio between 0 and 1),
  section_top integer not null default 0,
  section_height integer not null default 0,
  primary key (pageview_id, section_key)
);

create table if not exists public.web_analytics_attention_cells (
  pageview_id uuid not null references public.web_analytics_pageviews(id) on delete cascade,
  cell_x smallint not null check (cell_x between 0 and 47),
  cell_y smallint not null check (cell_y between 0 and 191),
  visible_ms integer not null check (visible_ms between 0 and 86400000),
  primary key (pageview_id, cell_x, cell_y)
);

create index if not exists web_analytics_pageviews_filter_idx
  on public.web_analytics_pageviews(site_id, pathname, deployment_version, device_class, started_at desc);
create index if not exists web_analytics_pageviews_session_idx
  on public.web_analytics_pageviews(session_id, started_at desc);
create index if not exists web_analytics_interactions_page_kind_idx
  on public.web_analytics_interactions(pageview_id, event_kind);
create index if not exists web_analytics_interactions_dead_idx
  on public.web_analytics_interactions(pageview_id, created_at desc)
  where probable_dead_click;
create index if not exists web_analytics_sections_key_idx
  on public.web_analytics_section_views(section_key, pageview_id);

alter table public.web_analytics_site_versions enable row level security;
alter table public.web_analytics_sessions enable row level security;
alter table public.web_analytics_pageviews enable row level security;
alter table public.web_analytics_interactions enable row level security;
alter table public.web_analytics_section_views enable row level security;
alter table public.web_analytics_attention_cells enable row level security;

revoke all on public.web_analytics_site_versions from anon, authenticated;
revoke all on public.web_analytics_sessions from anon, authenticated;
revoke all on public.web_analytics_pageviews from anon, authenticated;
revoke all on public.web_analytics_interactions from anon, authenticated;
revoke all on public.web_analytics_section_views from anon, authenticated;
revoke all on public.web_analytics_attention_cells from anon, authenticated;
grant select on public.web_analytics_site_versions to authenticated;
grant select on public.web_analytics_sessions to authenticated;
grant select on public.web_analytics_pageviews to authenticated;
grant select on public.web_analytics_interactions to authenticated;
grant select on public.web_analytics_section_views to authenticated;
grant select on public.web_analytics_attention_cells to authenticated;

drop policy if exists "race admins read web_analytics_site_versions" on public.web_analytics_site_versions;
create policy "race admins read web_analytics_site_versions" on public.web_analytics_site_versions
for select to authenticated using ((select public.is_current_race_admin()));

drop policy if exists "race admins read web_analytics_sessions" on public.web_analytics_sessions;
create policy "race admins read web_analytics_sessions" on public.web_analytics_sessions
for select to authenticated using ((select public.is_current_race_admin()));

drop policy if exists "race admins read web_analytics_pageviews" on public.web_analytics_pageviews;
create policy "race admins read web_analytics_pageviews" on public.web_analytics_pageviews
for select to authenticated using ((select public.is_current_race_admin()));

drop policy if exists "race admins read web_analytics_interactions" on public.web_analytics_interactions;
create policy "race admins read web_analytics_interactions" on public.web_analytics_interactions
for select to authenticated using ((select public.is_current_race_admin()));

drop policy if exists "race admins read web_analytics_section_views" on public.web_analytics_section_views;
create policy "race admins read web_analytics_section_views" on public.web_analytics_section_views
for select to authenticated using ((select public.is_current_race_admin()));

drop policy if exists "race admins read web_analytics_attention_cells" on public.web_analytics_attention_cells;
create policy "race admins read web_analytics_attention_cells" on public.web_analytics_attention_cells
for select to authenticated using ((select public.is_current_race_admin()));

grant all on public.web_analytics_site_versions to service_role;
grant all on public.web_analytics_sessions to service_role;
grant all on public.web_analytics_pageviews to service_role;
grant all on public.web_analytics_interactions to service_role;
grant all on public.web_analytics_section_views to service_role;
grant all on public.web_analytics_attention_cells to service_role;
grant usage, select on sequence public.web_analytics_interactions_id_seq to service_role;

create or replace function public.purge_expired_web_analytics(p_keep_days integer default 120)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;
  if p_keep_days < 30 then
    raise exception 'Retention cannot be shorter than 30 days' using errcode = '22023';
  end if;
  delete from public.web_analytics_sessions
  where last_seen_at < now() - make_interval(days => p_keep_days);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.purge_expired_web_analytics(integer) from public;
grant execute on function public.purge_expired_web_analytics(integer) to authenticated;
