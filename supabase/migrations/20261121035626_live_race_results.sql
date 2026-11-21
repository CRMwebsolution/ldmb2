alter table public.races add column live_results boolean not null default false;

create policy "Spectators can read live race classes" on public.classes
for select to anon, authenticated
using (exists (
  select 1 from public.races r
  where r.id = classes.race_id and r.live_results
));

create policy "Spectators can read live race entries" on public.results
for select to anon, authenticated
using (exists (
  select 1 from public.classes c join public.races r on r.id = c.race_id
  where c.id = results.class_id and r.live_results
));

-- Every entry path uses results, including contestant registration and bulk saves.
create function private.open_live_race_results() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.races r set live_results = true
  from public.classes c
  where c.id = new.class_id and r.id = c.race_id
    and not coalesce(r.published, false) and not r.live_results;
  return new;
end;
$$;

revoke all on function private.open_live_race_results() from public, anon, authenticated;

create trigger open_live_race_results
after insert or update of name, first_half, second_half on public.results
for each row
when (
  nullif(btrim(new.name), '') is not null
  or nullif(btrim(new.first_half), '') is not null
  or nullif(btrim(new.second_half), '') is not null
)
execute function private.open_live_race_results();

-- Include entries already saved for upcoming public races.
update public.races r set live_results = true
where not coalesce(r.published, false)
  and r.show_on_schedule and r.event_status = 'scheduled'
  and r.date >= (now() at time zone 'America/New_York')::date
  and exists (
    select 1 from public.classes c join public.results rs on rs.class_id = c.id
    where c.race_id = r.id and (
      nullif(btrim(rs.name), '') is not null
      or nullif(btrim(rs.first_half), '') is not null
      or nullif(btrim(rs.second_half), '') is not null
    )
  );

-- Serialize autosaves with registration and bulk edits, then advance the existing
-- race revision so spectators can subscribe to a single race and refresh.
create function private.save_race_result(
  p_race_id uuid,
  p_result jsonb,
  p_expected_updated_at timestamptz
) returns table(
  working_revision bigint, published_revision bigint, live_results boolean,
  published boolean, updated_at timestamptz, order_num integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry record;
  v_previous public.results%rowtype;
  v_order integer;
  v_saved_at timestamptz;
begin
  if not private.is_race_admin() then
    raise exception 'Race admin access required' using errcode = '42501';
  end if;

  select * into v_entry from jsonb_to_record(p_result) as entry(
    id uuid, class_id uuid, order_num integer, name text, first_half text,
    second_half text, fastest text, consistency double precision, racer_id uuid
  );
  if v_entry.id is null or v_entry.order_num is null or v_entry.order_num < 1 then
    raise exception 'An entry ID and a positive running order are required' using errcode = '22023';
  end if;

  perform 1 from public.races r where r.id = p_race_id for update;
  if not found then raise exception 'Race not found' using errcode = 'P0002'; end if;

  perform 1 from public.classes c where c.id = v_entry.class_id and c.race_id = p_race_id;
  if not found then raise exception 'Class does not belong to this race' using errcode = '22023'; end if;

  select * into v_previous from public.results rs where rs.id = v_entry.id for update;
  if v_previous.id is not null and v_previous.class_id is distinct from v_entry.class_id then
    raise exception 'Entry does not belong to this class' using errcode = '22023';
  end if;
  if v_previous.updated_at is distinct from p_expected_updated_at then
    raise exception 'This entry changed in another window. Refresh before editing it again.'
      using errcode = '40001';
  end if;

  if v_entry.name is null and v_entry.first_half is null and v_entry.second_half is null
     and v_entry.racer_id is null then
    delete from public.results rs where rs.id = v_entry.id;
  elsif v_previous.id is not null then
    update public.results rs set
      name = v_entry.name, first_half = v_entry.first_half, second_half = v_entry.second_half,
      fastest = v_entry.fastest, consistency = v_entry.consistency,
      racer_id = v_entry.racer_id, updated_at = clock_timestamp()
    where rs.id = v_entry.id
    returning rs.updated_at, rs.order_num into v_saved_at, v_order;
  else
    v_order := v_entry.order_num;
    if exists (select 1 from public.results rs where rs.class_id = v_entry.class_id and rs.order_num = v_order) then
      select coalesce(max(rs.order_num), 0) + 1 into v_order
      from public.results rs where rs.class_id = v_entry.class_id;
    end if;
    insert into public.results as rs (
      id, class_id, order_num, name, first_half, second_half, fastest, consistency, racer_id, updated_at
    ) values (
      v_entry.id, v_entry.class_id, v_order, v_entry.name, v_entry.first_half, v_entry.second_half,
      v_entry.fastest, v_entry.consistency, v_entry.racer_id, clock_timestamp()
    ) returning rs.updated_at into v_saved_at;
  end if;

  perform public._advance_race_revision(p_race_id);
  return query select r.working_revision, r.published_revision, r.live_results,
    coalesce(r.published, false), v_saved_at, v_order
  from public.races r where r.id = p_race_id;
end;
$$;

create function public.save_race_result(
  p_race_id uuid,
  p_result jsonb,
  p_expected_updated_at timestamptz
) returns table(
  working_revision bigint, published_revision bigint, live_results boolean,
  published boolean, updated_at timestamptz, order_num integer
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.save_race_result(p_race_id, p_result, p_expected_updated_at);
$$;

revoke all on function private.save_race_result(uuid, jsonb, timestamptz) from public, anon;
revoke all on function public.save_race_result(uuid, jsonb, timestamptz) from public, anon;
grant execute on function private.save_race_result(uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.save_race_result(uuid, jsonb, timestamptz) to authenticated;
