-- A verified racer can own multiple result rows in a class. Protect new
-- registrations and identity changes while allowing explicit historical links.

create or replace function public.register_race_contestant(
  p_race_id uuid,
  p_class_id uuid,
  p_display_name text,
  p_order_num integer default null,
  p_racer_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result_id uuid;
  v_order integer;
  v_name text := nullif(trim(p_display_name), '');
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;

  -- The race lock serializes duplicate checks across roster edits.
  perform 1 from public.races where id = p_race_id for update;
  if not found then raise exception 'Race not found' using errcode = 'P0002'; end if;

  perform 1 from public.classes where id = p_class_id and race_id = p_race_id;
  if not found then
    raise exception 'Choose a class from this race' using errcode = '22023';
  end if;

  if p_racer_id is not null then
    if not exists (select 1 from public.racers where id = p_racer_id) then
      raise exception 'Racer identity not found' using errcode = 'P0002';
    end if;
    if v_name is null then
      select display_name into v_name from public.racers where id = p_racer_id;
    end if;
  end if;

  if v_name is null or length(v_name) > 120 then
    raise exception 'Contestant name must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  if p_order_num is not null and p_order_num < 1 then
    raise exception 'Running order must be a positive integer' using errcode = '22023';
  end if;

  if p_racer_id is not null and exists (
    select 1 from public.results r
    where r.class_id = p_class_id and r.racer_id = p_racer_id
  ) then
    raise exception 'That verified racer is already registered in this class.'
      using errcode = '23505';
  end if;

  select coalesce(p_order_num, max(order_num) + 1, 1)
  into v_order
  from public.results
  where class_id = p_class_id;

  insert into public.results(
    class_id, order_num, name, first_half, second_half,
    fastest, consistency, racer_id, updated_at
  ) values (
    p_class_id, v_order, v_name, null, null,
    null, null, p_racer_id, now()
  )
  returning id into v_result_id;

  perform public._advance_race_revision(p_race_id);
  return v_result_id;
end;
$$;

create or replace function public.update_race_contestant(
  p_race_id uuid,
  p_result_id uuid,
  p_display_name text,
  p_order_num integer,
  p_racer_id uuid default null
) returns table(working_revision bigint, published_revision bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry public.results%rowtype;
  v_name text := nullif(trim(p_display_name), '');
begin
  if not public.is_current_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;

  perform 1 from public.races where id = p_race_id for update;
  if not found then raise exception 'Race not found' using errcode = 'P0002'; end if;

  select rs.* into v_entry
  from public.results rs
  join public.classes c on c.id = rs.class_id
  where rs.id = p_result_id and c.race_id = p_race_id
  for update of rs;
  if not found then raise exception 'Contestant not found in this race' using errcode = 'P0002'; end if;

  if p_racer_id is not null then
    if not exists (select 1 from public.racers where id = p_racer_id) then
      raise exception 'Racer identity not found' using errcode = 'P0002';
    end if;
    if v_name is null then
      select display_name into v_name from public.racers where id = p_racer_id;
    end if;
  end if;

  if v_name is null or length(v_name) > 120 then
    raise exception 'Contestant name must be between 1 and 120 characters'
      using errcode = '22023';
  end if;
  if p_order_num is null or p_order_num < 1 then
    raise exception 'Running order must be a positive integer' using errcode = '22023';
  end if;

  if p_racer_id is not null and p_racer_id is distinct from v_entry.racer_id and exists (
    select 1 from public.results r
    where r.class_id = v_entry.class_id and r.racer_id = p_racer_id
  ) then
    raise exception 'That verified racer is already registered in this class.'
      using errcode = '23505';
  end if;

  update public.results
  set name = v_name,
      order_num = p_order_num,
      racer_id = p_racer_id,
      updated_at = now()
  where id = p_result_id;

  return query
    select revised.working_revision, revised.published_revision
    from public._advance_race_revision(p_race_id) revised;
end;
$$;

drop index public.results_class_racer_unique;
