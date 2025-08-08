-- Create properties table for storing user-selected areas
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT,
  address TEXT,
  geometry JSONB NOT NULL, -- GeoJSON geometry
  area_hectares DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create carbon_calculations table for storing calculation results
CREATE TABLE public.carbon_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  total_co2e DECIMAL(10,2) NOT NULL,
  above_ground_biomass DECIMAL(10,2) NOT NULL,
  below_ground_biomass DECIMAL(10,2) NOT NULL,
  soil_organic_carbon DECIMAL(10,2) NOT NULL,
  calculation_method TEXT NOT NULL DEFAULT 'ndvi-regression',
  data_sources JSONB, -- Store metadata about data sources used
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_calculations ENABLE ROW LEVEL SECURITY;

-- Create policies for properties
CREATE POLICY "Users can view their own properties" 
ON public.properties 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own properties" 
ON public.properties 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties" 
ON public.properties 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties" 
ON public.properties 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for carbon calculations
CREATE POLICY "Users can view calculations for their properties" 
ON public.carbon_calculations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = carbon_calculations.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "System can create calculations" 
ON public.carbon_calculations 
FOR INSERT 
WITH CHECK (true); -- Edge functions will handle this

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_properties_user_id ON public.properties(user_id);
CREATE INDEX idx_carbon_calculations_property_id ON public.carbon_calculations(property_id);
CREATE INDEX idx_properties_geometry ON public.properties USING GIN(geometry);