-- Supabase applies explicit default EXECUTE grants to API roles for newly-created
-- functions. Keep the retention RPC callable by signed-in race admins only; the
-- function also enforces public.is_current_race_admin() internally.
revoke all on function public.purge_expired_web_analytics(integer) from public, anon, authenticated;
grant execute on function public.purge_expired_web_analytics(integer) to authenticated;
