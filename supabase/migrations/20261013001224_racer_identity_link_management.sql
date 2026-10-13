-- Admin-only racer identity linking. These routines never delete result rows.
-- Linking changes only results.racer_id (and updated_at), preserving names, classes,
-- running order, passes, calculations, and every row used by the Results tab.

create or replace function public.create_racer_identity(
  p_display_name text,
  p_result_ids uuid[] default '{}'::uuid[]
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := nullif(trim(p_display_name), '');
  v_ids uuid[];
  v_found_count integer := 0;
  v_racer_id uuid;
  v_race_ids uuid[];
  v_race_id uuid;
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;

  if v_name is null or length(v_name) > 120 then
    raise exception 'Racer name must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct item order by item), '{}'::uuid[])
  into v_ids
  from unnest(coalesce(p_result_ids, '{}'::uuid[])) item
  where item is not null;

  if cardinality(v_ids) <> cardinality(coalesce(p_result_ids, '{}'::uuid[])) then
    raise exception 'Result selections must contain unique, non-null IDs'
      using errcode = '22023';
  end if;

  perform 1
  from public.results r
  where r.id = any(v_ids)
  order by r.id
  for update;

  select count(*) into v_found_count
  from public.results r
  where r.id = any(v_ids);

  if v_found_count <> cardinality(v_ids) then
    raise exception 'One or more result entries were not found'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.results r
    where r.id = any(v_ids) and r.racer_id is not null
  ) then
    raise exception 'One or more result entries are already linked to a racer'
      using errcode = '23503';
  end if;

  insert into public.racers(display_name, updated_at)
  values (v_name, now())
  returning id into v_racer_id;

  select coalesce(array_agg(distinct c.race_id order by c.race_id), '{}'::uuid[])
  into v_race_ids
  from public.results r
  join public.classes c on c.id = r.class_id
  where r.id = any(v_ids) and c.race_id is not null;

  update public.results r
  set racer_id = v_racer_id,
      updated_at = now()
  where r.id = any(v_ids);

  foreach v_race_id in array v_race_ids loop
    perform public._advance_race_revision(v_race_id);
  end loop;

  return v_racer_id;
end;
$$;

create or replace function public.link_race_results_to_racer(
  p_racer_id uuid,
  p_result_ids uuid[]
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
  v_found_count integer := 0;
  v_changed integer := 0;
  v_race_ids uuid[];
  v_race_id uuid;
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;

  perform 1 from public.racers where id = p_racer_id for update;
  if not found then
    raise exception 'Racer identity not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct item order by item), '{}'::uuid[])
  into v_ids
  from unnest(coalesce(p_result_ids, '{}'::uuid[])) item
  where item is not null;

  if cardinality(v_ids) = 0 then
    raise exception 'Choose at least one result entry to link'
      using errcode = '22023';
  end if;

  if cardinality(v_ids) <> cardinality(coalesce(p_result_ids, '{}'::uuid[])) then
    raise exception 'Result selections must contain unique, non-null IDs'
      using errcode = '22023';
  end if;

  perform 1
  from public.results r
  where r.id = any(v_ids)
  order by r.id
  for update;

  select count(*) into v_found_count
  from public.results r
  where r.id = any(v_ids);

  if v_found_count <> cardinality(v_ids) then
    raise exception 'One or more result entries were not found'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.results r
    where r.id = any(v_ids)
      and r.racer_id is not null
      and r.racer_id <> p_racer_id
  ) then
    raise exception 'A selected result entry belongs to another racer identity'
      using errcode = '23503';
  end if;

  select coalesce(array_agg(distinct c.race_id order by c.race_id), '{}'::uuid[])
  into v_race_ids
  from public.results r
  join public.classes c on c.id = r.class_id
  where r.id = any(v_ids)
    and r.racer_id is distinct from p_racer_id
    and c.race_id is not null;

  update public.results r
  set racer_id = p_racer_id,
      updated_at = now()
  where r.id = any(v_ids)
    and r.racer_id is distinct from p_racer_id;
  get diagnostics v_changed = row_count;

  foreach v_race_id in array v_race_ids loop
    perform public._advance_race_revision(v_race_id);
  end loop;

  return v_changed;
end;
$$;

create or replace function public.save_racer_identity(
  p_racer_id uuid,
  p_display_name text,
  p_result_ids uuid[]
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := nullif(trim(p_display_name), '');
  v_ids uuid[];
  v_found_count integer := 0;
  v_linked_count integer := 0;
  v_race_ids uuid[];
  v_race_id uuid;
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;

  if v_name is null or length(v_name) > 120 then
    raise exception 'Racer name must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  perform 1 from public.racers where id = p_racer_id for update;
  if not found then
    raise exception 'Racer identity not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct item order by item), '{}'::uuid[])
  into v_ids
  from unnest(coalesce(p_result_ids, '{}'::uuid[])) item
  where item is not null;

  if cardinality(v_ids) <> cardinality(coalesce(p_result_ids, '{}'::uuid[])) then
    raise exception 'Result selections must contain unique, non-null IDs'
      using errcode = '22023';
  end if;

  perform 1
  from public.results r
  where r.racer_id = p_racer_id or r.id = any(v_ids)
  order by r.id
  for update;

  select count(*) into v_found_count
  from public.results r
  where r.id = any(v_ids);

  if v_found_count <> cardinality(v_ids) then
    raise exception 'One or more result entries were not found'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.results r
    where r.id = any(v_ids)
      and r.racer_id is not null
      and r.racer_id <> p_racer_id
  ) then
    raise exception 'A selected result entry belongs to another racer identity'
      using errcode = '23503';
  end if;

  select coalesce(array_agg(distinct c.race_id order by c.race_id), '{}'::uuid[])
  into v_race_ids
  from public.results r
  join public.classes c on c.id = r.class_id
  where (
      (r.racer_id = p_racer_id and not (r.id = any(v_ids)))
      or
      (r.id = any(v_ids) and r.racer_id is distinct from p_racer_id)
    )
    and c.race_id is not null;

  update public.results r
  set racer_id = null,
      updated_at = now()
  where r.racer_id = p_racer_id
    and not (r.id = any(v_ids));

  update public.results r
  set racer_id = p_racer_id,
      updated_at = now()
  where r.id = any(v_ids)
    and r.racer_id is distinct from p_racer_id;

  update public.racers
  set display_name = v_name,
      updated_at = now()
  where id = p_racer_id;

  select count(*) into v_linked_count
  from public.results
  where racer_id = p_racer_id;

  foreach v_race_id in array v_race_ids loop
    perform public._advance_race_revision(v_race_id);
  end loop;

  return v_linked_count;
end;
$$;

create or replace function public.delete_racer_identity(
  p_racer_id uuid
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unlinked_count integer := 0;
  v_race_ids uuid[];
  v_race_id uuid;
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;

  perform 1 from public.racers where id = p_racer_id for update;
  if not found then
    raise exception 'Racer identity not found' using errcode = 'P0002';
  end if;

  perform 1
  from public.results r
  where r.racer_id = p_racer_id
  order by r.id
  for update;

  select coalesce(array_agg(distinct c.race_id order by c.race_id), '{}'::uuid[])
  into v_race_ids
  from public.results r
  join public.classes c on c.id = r.class_id
  where r.racer_id = p_racer_id
    and c.race_id is not null;

  update public.results
  set racer_id = null,
      updated_at = now()
  where racer_id = p_racer_id;
  get diagnostics v_unlinked_count = row_count;

  delete from public.racers where id = p_racer_id;

  foreach v_race_id in array v_race_ids loop
    perform public._advance_race_revision(v_race_id);
  end loop;

  return v_unlinked_count;
end;
$$;

comment on function public.create_racer_identity(text, uuid[]) is
  'Creates a racer identity and optionally links unlinked result rows. Never deletes or rewrites result data.';
comment on function public.link_race_results_to_racer(uuid, uuid[]) is
  'Adds unlinked result rows to an existing racer identity. Never deletes or rewrites result data.';
comment on function public.save_racer_identity(uuid, text, uuid[]) is
  'Renames an identity and replaces only its racer_id links. Result rows and scoring data are preserved.';
comment on function public.delete_racer_identity(uuid) is
  'Unlinks all result rows, then deletes only the racer identity. Result rows and scoring data are preserved.';

revoke all on function public.create_racer_identity(text, uuid[])
  from public, anon, authenticated;
revoke all on function public.link_race_results_to_racer(uuid, uuid[])
  from public, anon, authenticated;
revoke all on function public.save_racer_identity(uuid, text, uuid[])
  from public, anon, authenticated;
revoke all on function public.delete_racer_identity(uuid)
  from public, anon, authenticated;

grant execute on function public.create_racer_identity(text, uuid[])
  to authenticated;
grant execute on function public.link_race_results_to_racer(uuid, uuid[])
  to authenticated;
grant execute on function public.save_racer_identity(uuid, text, uuid[])
  to authenticated;
grant execute on function public.delete_racer_identity(uuid)
  to authenticated;
