-- Additive race-operations upgrade. Existing columns, URLs, rows, and scoring modes remain valid.
alter table public.races
  add column if not exists working_revision bigint not null default 0,
  add column if not exists published_revision bigint not null default 0;

alter table public.classes
  add column if not exists catalog_class_id uuid references public.class_catalog(id) on delete set null,
  add column if not exists rules_snapshot text,
  add column if not exists entry_fee_snapshot text,
  add column if not exists scoring_version smallint not null default 1;

alter table public.results
  add column if not exists racer_id uuid,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.racers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  normalized_name text generated always as (lower(regexp_replace(trim(display_name), '\s+', ' ', 'g'))) stored,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists racers_normalized_name_key
  on public.racers(normalized_name);
create index if not exists results_racer_id_idx
  on public.results(racer_id) where racer_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'results_racer_id_fkey'
  ) then
    alter table public.results
      add constraint results_racer_id_fkey foreign key (racer_id)
      references public.racers(id) on delete set null not valid;
    alter table public.results validate constraint results_racer_id_fkey;
  end if;
end $$;

create table if not exists public.race_result_versions (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  revision bigint not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('publish', 'published-edit')),
  snapshot jsonb not null,
  unique (race_id, revision)
);

create index if not exists race_result_versions_race_revision_idx
  on public.race_result_versions(race_id, revision desc);

alter table public.racers enable row level security;
alter table public.race_result_versions enable row level security;

drop policy if exists "race admins read racers" on public.racers;
create policy "race admins read racers" on public.racers
for select to authenticated using ((select public.is_current_race_admin()));

drop policy if exists "race admins manage racers" on public.racers;
create policy "race admins manage racers" on public.racers
for all to authenticated
using ((select public.is_current_race_admin()))
with check ((select public.is_current_race_admin()));

drop policy if exists "race admins read result versions" on public.race_result_versions;
create policy "race admins read result versions" on public.race_result_versions
for select to authenticated using ((select public.is_current_race_admin()));

revoke all on public.racers from anon;
revoke all on public.race_result_versions from anon;
grant select, insert, update, delete on public.racers to authenticated;
grant select on public.race_result_versions to authenticated;

create or replace function public.create_race_with_classes(
  p_name text,
  p_date date,
  p_special_label text default null,
  p_event_status text default 'scheduled',
  p_show_on_schedule boolean default true,
  p_pdf_url text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_race_id uuid;
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'Race name is required' using errcode = '22023';
  end if;
  if p_event_status not in ('scheduled', 'completed', 'cancelled', 'postponed') then
    raise exception 'Invalid event status' using errcode = '22023';
  end if;

  insert into public.races(name, date, special_label, event_status, show_on_schedule, published, pdf_url)
  values (trim(p_name), p_date, nullif(trim(p_special_label), ''), p_event_status, p_show_on_schedule, false, nullif(trim(p_pdf_url), ''))
  returning id into v_race_id;

  insert into public.classes(
    race_id, name, display_mode, order_num, catalog_class_id,
    rules_snapshot, entry_fee_snapshot, scoring_version
  )
  select v_race_id, name, default_display_mode, sort_order, id, rules, entry_fee, 1
  from public.class_catalog
  where active
  order by sort_order;

  return v_race_id;
end $$;

create or replace function public.save_race_workspace(
  p_race_id uuid,
  p_expected_revision bigint,
  p_classes jsonb,
  p_results jsonb,
  p_delete_ids uuid[] default '{}'::uuid[]
) returns table(working_revision bigint, published_revision bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_race public.races%rowtype;
  v_new_working bigint;
  v_new_published bigint;
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_classes, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_results, '[]'::jsonb)) <> 'array' then
    raise exception 'Classes and results must be arrays' using errcode = '22023';
  end if;

  select * into v_race from public.races where id = p_race_id for update;
  if not found then raise exception 'Race not found' using errcode = 'P0002'; end if;
  if v_race.working_revision <> p_expected_revision then
    raise exception 'Race results changed in another window. Refresh before saving.'
      using errcode = '40001',
      detail = format('expected=%s actual=%s', p_expected_revision, v_race.working_revision);
  end if;

  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_classes, '[]'::jsonb))
      as x(id uuid, display_mode text)
    where x.display_mode not in ('fastest', 'consistency', 'both')
  ) then
    raise exception 'Only fastest, consistency, and both scoring are supported'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_classes, '[]'::jsonb))
      as x(id uuid, race_id uuid)
    where x.race_id is distinct from p_race_id
  ) then
    raise exception 'Class does not belong to this race' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_classes, '[]'::jsonb)) as x(id uuid)
    join public.classes c on c.id = x.id
    where c.race_id is distinct from p_race_id
  ) then
    raise exception 'Existing class belongs to another race' using errcode = '22023';
  end if;

  insert into public.classes(id, race_id, name, display_mode, order_num)
  select x.id, p_race_id, trim(x.name), x.display_mode, x.order_num
  from jsonb_to_recordset(coalesce(p_classes, '[]'::jsonb))
    as x(id uuid, race_id uuid, name text, display_mode text, order_num integer)
  where nullif(trim(x.name), '') is not null
  on conflict (id) do update set
    name = excluded.name,
    display_mode = excluded.display_mode,
    order_num = excluded.order_num
  where public.classes.race_id = p_race_id;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_results, '[]'::jsonb))
      as x(id uuid, class_id uuid)
    left join public.classes c on c.id = x.class_id and c.race_id = p_race_id
    where c.id is null
  ) then
    raise exception 'Result class does not belong to this race' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_results, '[]'::jsonb)) as x(id uuid)
    join public.results rs on rs.id = x.id
    join public.classes c on c.id = rs.class_id
    where c.race_id is distinct from p_race_id
  ) then
    raise exception 'Existing result belongs to another race' using errcode = '22023';
  end if;

  insert into public.results(
    id, class_id, order_num, name, first_half, second_half, fastest, consistency, racer_id, updated_at
  )
  select x.id, x.class_id, x.order_num, nullif(trim(x.name), ''),
    nullif(trim(x.first_half), ''), nullif(trim(x.second_half), ''),
    nullif(trim(x.fastest), ''), x.consistency, x.racer_id, now()
  from jsonb_to_recordset(coalesce(p_results, '[]'::jsonb))
    as x(
      id uuid, class_id uuid, order_num integer, name text,
      first_half text, second_half text, fastest text, consistency numeric, racer_id uuid
    )
  on conflict (id) do update set
    class_id = excluded.class_id,
    order_num = excluded.order_num,
    name = excluded.name,
    first_half = excluded.first_half,
    second_half = excluded.second_half,
    fastest = excluded.fastest,
    consistency = excluded.consistency,
    racer_id = coalesce(excluded.racer_id, public.results.racer_id),
    updated_at = now();

  delete from public.results r
  using public.classes c
  where r.class_id = c.id
    and c.race_id = p_race_id
    and r.id = any(coalesce(p_delete_ids, '{}'::uuid[]));

  update public.races
  set working_revision = public.races.working_revision + 1
  where id = p_race_id
  returning public.races.working_revision, public.races.published_revision
  into v_new_working, v_new_published;

  if v_race.published then
    v_new_published := v_new_published + 1;
    update public.races set published_revision = v_new_published where id = p_race_id;
    insert into public.race_result_versions(race_id, revision, created_by, reason, snapshot)
    select p_race_id, v_new_published, auth.uid(), 'published-edit',
      jsonb_build_object(
        'race', to_jsonb(r),
        'classes', coalesce((
          select jsonb_agg(
            to_jsonb(c) || jsonb_build_object(
              'results', coalesce((
                select jsonb_agg(to_jsonb(rs) order by rs.order_num, rs.id)
                from public.results rs where rs.class_id = c.id
              ), '[]'::jsonb)
            ) order by c.order_num, c.id
          ) from public.classes c where c.race_id = p_race_id
        ), '[]'::jsonb)
      )
    from public.races r where r.id = p_race_id;
  end if;

  return query select v_new_working, v_new_published;
end $$;

create or replace function public.set_race_publication(
  p_race_id uuid,
  p_expected_revision bigint,
  p_published boolean
) returns table(working_revision bigint, published_revision bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_race public.races%rowtype;
  v_new_published bigint;
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;
  select * into v_race from public.races where id = p_race_id for update;
  if not found then raise exception 'Race not found' using errcode = 'P0002'; end if;
  if v_race.working_revision <> p_expected_revision then
    raise exception 'Race results changed in another window. Refresh before publishing.'
      using errcode = '40001';
  end if;

  if p_published and not exists (
    select 1 from public.results rs
    join public.classes c on c.id = rs.class_id
    where c.race_id = p_race_id
      and nullif(trim(rs.name), '') is not null
      and (
        nullif(trim(rs.first_half), '') is not null
        or nullif(trim(rs.second_half), '') is not null
      )
  ) then
    raise exception 'Record at least one named pass before publishing'
      using errcode = '22023';
  end if;

  v_new_published := v_race.published_revision;
  if p_published and not v_race.published then
    v_new_published := v_new_published + 1;
  end if;

  update public.races
  set published = p_published,
      published_revision = v_new_published
  where id = p_race_id;

  if p_published and not v_race.published then
    insert into public.race_result_versions(race_id, revision, created_by, reason, snapshot)
    select p_race_id, v_new_published, auth.uid(), 'publish',
      jsonb_build_object(
        'race', to_jsonb(r),
        'classes', coalesce((
          select jsonb_agg(
            to_jsonb(c) || jsonb_build_object(
              'results', coalesce((
                select jsonb_agg(to_jsonb(rs) order by rs.order_num, rs.id)
                from public.results rs where rs.class_id = c.id
              ), '[]'::jsonb)
            ) order by c.order_num, c.id
          ) from public.classes c where c.race_id = p_race_id
        ), '[]'::jsonb)
      )
    from public.races r where r.id = p_race_id;
  end if;

  return query select v_race.working_revision, v_new_published;
end $$;

create or replace function public.delete_race_safely(p_race_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.races r
    where r.id = p_race_id and (
      r.published
      or exists (
        select 1 from public.classes c join public.results rs on rs.class_id = c.id
        where c.race_id = r.id
      )
    )
  ) then
    raise exception 'Published races or races with results cannot be deleted'
      using errcode = '23503',
      hint = 'Hide the race or remove its results before deleting it.';
  end if;
  delete from public.races where id = p_race_id;
end $$;

create or replace function public.set_race_catalog_class(
  p_race_id uuid,
  p_catalog_class_id uuid,
  p_enabled boolean
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $
declare
  v_catalog public.class_catalog%rowtype;
  v_existing public.classes%rowtype;
  v_id uuid;
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;
  perform 1 from public.races where id = p_race_id for update;
  if not found then raise exception 'Race not found' using errcode = 'P0002'; end if;
  select * into v_catalog from public.class_catalog where id = p_catalog_class_id;
  if not found then raise exception 'Catalog class not found' using errcode = 'P0002'; end if;
  select * into v_existing from public.classes
  where race_id = p_race_id
    and (catalog_class_id = p_catalog_class_id or lower(trim(name)) = lower(trim(v_catalog.name)))
  limit 1;

  if p_enabled then
    if v_existing.id is not null then return v_existing.id; end if;
    insert into public.classes(
      race_id, name, display_mode, order_num, catalog_class_id,
      rules_snapshot, entry_fee_snapshot, scoring_version
    ) values (
      p_race_id, v_catalog.name, v_catalog.default_display_mode,
      coalesce((select max(order_num) + 1 from public.classes where race_id = p_race_id), 1),
      v_catalog.id, v_catalog.rules, v_catalog.entry_fee, 1
    ) returning id into v_id;
    return v_id;
  end if;

  if v_existing.id is null then return null; end if;
  if exists (select 1 from public.results where class_id = v_existing.id) then
    raise exception 'This class has results and cannot be removed'
      using errcode = '23503';
  end if;
  delete from public.classes where id = v_existing.id;
  return null;
end $;

create or replace function public.create_catalog_class_for_race(
  p_race_id uuid,
  p_name text,
  p_entry_fee text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $
declare
  v_catalog public.class_catalog%rowtype;
  v_race_class public.classes%rowtype;
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;
  perform 1 from public.races where id = p_race_id for update;
  if not found then raise exception 'Race not found' using errcode = 'P0002'; end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'Class name is required' using errcode = '22023';
  end if;

  insert into public.class_catalog(name, entry_fee, sort_order, default_display_mode, active)
  values (
    trim(p_name), nullif(trim(p_entry_fee), ''),
    coalesce((select max(sort_order) + 1 from public.class_catalog), 1),
    'fastest', true
  ) returning * into v_catalog;

  insert into public.classes(
    race_id, name, display_mode, order_num, catalog_class_id,
    rules_snapshot, entry_fee_snapshot, scoring_version
  ) values (
    p_race_id, v_catalog.name, 'fastest',
    coalesce((select max(order_num) + 1 from public.classes where race_id = p_race_id), 1),
    v_catalog.id, v_catalog.rules, v_catalog.entry_fee, 1
  ) returning * into v_race_class;

  return jsonb_build_object('catalog', to_jsonb(v_catalog), 'raceClass', to_jsonb(v_race_class));
end $;

revoke all on function public.create_race_with_classes(text, date, text, text, boolean, text) from public;
revoke all on function public.save_race_workspace(uuid, bigint, jsonb, jsonb, uuid[]) from public;
revoke all on function public.set_race_publication(uuid, bigint, boolean) from public;
revoke all on function public.delete_race_safely(uuid) from public;
revoke all on function public.set_race_catalog_class(uuid, uuid, boolean) from public;
revoke all on function public.create_catalog_class_for_race(uuid, text, text) from public;
grant execute on function public.create_race_with_classes(text, date, text, text, boolean, text) to authenticated;
grant execute on function public.save_race_workspace(uuid, bigint, jsonb, jsonb, uuid[]) to authenticated;
grant execute on function public.set_race_publication(uuid, bigint, boolean) to authenticated;
grant execute on function public.delete_race_safely(uuid) to authenticated;
grant execute on function public.set_race_catalog_class(uuid, uuid, boolean) to authenticated;
grant execute on function public.create_catalog_class_for_race(uuid, text, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'races'
  ) then execute 'alter publication supabase_realtime add table public.races'; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'classes'
  ) then execute 'alter publication supabase_realtime add table public.classes'; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'results'
  ) then execute 'alter publication supabase_realtime add table public.results'; end if;
end $$;
