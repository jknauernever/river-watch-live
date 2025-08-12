-- Enable RLS on the only public table without it and keep current read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'spatial_ref_sys' AND c.relrowsecurity = true
  ) THEN
    EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Create a permissive SELECT policy so behavior does not change for clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'spatial_ref_sys' AND p.policyname = 'Allow public read of spatial_ref_sys'
  ) THEN
    EXECUTE $$CREATE POLICY "Allow public read of spatial_ref_sys"
      ON public.spatial_ref_sys
      FOR SELECT
      USING (true)$$;
  END IF;
END $$;

-- Harden SECURITY DEFINER functions by setting an explicit search_path
-- 1) set_auth_user_id()
CREATE OR REPLACE FUNCTION public.set_auth_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- 2) get_features_in_bounds(...)
CREATE OR REPLACE FUNCTION public.get_features_in_bounds(
  p_layer_id text,
  p_minx numeric,
  p_miny numeric,
  p_maxx numeric,
  p_maxy numeric
)
RETURNS TABLE(
  id uuid,
  feature_index integer,
  geometry geometry,
  properties jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sf.id,
    sf.feature_index,
    sf.geometry,
    sf.properties
  FROM public.spatial_features sf
  WHERE sf.layer_id = p_layer_id
    AND public.ST_Intersects(
      sf.geometry,
      public.ST_MakeEnvelope(p_minx, p_miny, p_maxx, p_maxy, 4326)
    )
  ORDER BY sf.feature_index;
END;
$$;

-- 3) is_admin(_user_id uuid)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
    LIMIT 1
  );
$$;