-- Fix: ensure is_admin function can be recreated by dropping first (param name conflicts)
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- 1) Create is_admin helper function (used in RLS policies)
CREATE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
    LIMIT 1
  );
$$;

-- 2) Create generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3) Ensure properties table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text,
  address text,
  geometry jsonb NOT NULL,
  area_hectares numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Ensure carbon_calculations table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.carbon_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid,
  total_co2e numeric NOT NULL,
  above_ground_biomass numeric NOT NULL,
  below_ground_biomass numeric NOT NULL,
  soil_organic_carbon numeric NOT NULL,
  calculation_method text NOT NULL,
  data_sources jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_calculations_property_id ON public.carbon_calculations(property_id);
CREATE INDEX IF NOT EXISTS idx_calculations_user_id ON public.carbon_calculations(user_id);

-- 6) Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_calculations ENABLE ROW LEVEL SECURITY;

-- 7) Apply updated_at triggers
DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_carbon_calculations_updated_at ON public.carbon_calculations;
CREATE TRIGGER update_carbon_calculations_updated_at
BEFORE UPDATE ON public.carbon_calculations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Auto-assign user_id from auth in insert triggers (uses existing public.set_auth_user_id())
DROP TRIGGER IF EXISTS set_properties_user_id ON public.properties;
CREATE TRIGGER set_properties_user_id
BEFORE INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.set_auth_user_id();

DROP TRIGGER IF EXISTS set_carbon_calculations_user_id ON public.carbon_calculations;
CREATE TRIGGER set_carbon_calculations_user_id
BEFORE INSERT ON public.carbon_calculations
FOR EACH ROW EXECUTE FUNCTION public.set_auth_user_id();

-- 9) Properties policies
DROP POLICY IF EXISTS "Users can view their properties" ON public.properties;
CREATE POLICY "Users can view their properties"
ON public.properties FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their properties" ON public.properties;
CREATE POLICY "Users can insert their properties"
ON public.properties FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their properties" ON public.properties;
CREATE POLICY "Users can update their properties"
ON public.properties FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their properties" ON public.properties;
CREATE POLICY "Users can delete their properties"
ON public.properties FOR DELETE
USING (auth.uid() = user_id);

-- 10) Carbon calculation policies (scoped via owning property)
DROP POLICY IF EXISTS "Users can view their calculations" ON public.carbon_calculations;
CREATE POLICY "Users can view their calculations"
ON public.carbon_calculations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert their calculations" ON public.carbon_calculations;
CREATE POLICY "Users can insert their calculations"
ON public.carbon_calculations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update their calculations" ON public.carbon_calculations;
CREATE POLICY "Users can update their calculations"
ON public.carbon_calculations FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete their calculations" ON public.carbon_calculations;
CREATE POLICY "Users can delete their calculations"
ON public.carbon_calculations FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid()
));