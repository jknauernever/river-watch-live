
-- 1) Fix the remaining ERROR: enable RLS on spatial_ref_sys and allow read-only access
alter table public.spatial_ref_sys enable row level security;

drop policy if exists "Allow read access to spatial_ref_sys" on public.spatial_ref_sys;

create policy "Allow read access to spatial_ref_sys"
  on public.spatial_ref_sys
  for select
  to anon, authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies are defined, so writes remain blocked by default.

-- 2) Reduce linter warnings: pin search_path for SECURITY DEFINER functions we control
-- is_admin(_user_id uuid)
alter function public.is_admin(_user_id uuid) set search_path = public;

-- set_auth_user_id()
alter function public.set_auth_user_id() set search_path = public;

-- get_features_in_bounds(p_layer_id text, p_minx numeric, p_miny numeric, p_maxx numeric, p_maxy numeric)
alter function public.get_features_in_bounds(p_layer_id text, p_minx numeric, p_miny numeric, p_maxx numeric, p_maxy numeric)
  set search_path = public;
