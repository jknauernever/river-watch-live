import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Property {
  id: string;
  name?: string;
  address?: string;
  geometry: any;
  area_hectares: number;
  created_at: string;
  updated_at: string;
}

interface CarbonCalculation {
  id: string;
  property_id: string;
  total_co2e: number;
  above_ground_biomass: number;
  below_ground_biomass: number;
  soil_organic_carbon: number;
  calculation_method: string;
  data_sources?: any;
  created_at: string;
}

export const useProperty = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [carbonCalculation, setCarbonCalculation] = useState<CarbonCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculationLoading, setCalculationLoading] = useState(false);

  const fetchProperties = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('properties' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    }
  };

  const createProperty = async (propertyData: {
    name?: string;
    address?: string;
    geometry: any;
    area_hectares: number;
  }) => {

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('properties' as any)
        .insert([
          {
            ...propertyData,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setProperties(prev => [data, ...prev]);
      setSelectedProperty(data);
      toast.success('Property saved successfully!');
      return data;
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error('Failed to save property');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const calculateCarbon = async (property: Property) => {
    setCalculationLoading(true);
    try {
      // First check if calculation already exists
      const { data: existingCalculation, error: fetchError } = await (supabase as any)
        .from('carbon_calculations' as any)
        .select('*')
        .eq('property_id', property.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingCalculation) {
        setCarbonCalculation(existingCalculation);
        toast.success('Loaded existing carbon calculation');
        return existingCalculation;
      }

      // Call enhanced GEE edge function to calculate carbon
      const { data, error } = await supabase.functions.invoke('calculate-carbon-gee', {
        body: {
          propertyId: property.id,
          geometry: property.geometry,
          areaHectares: property.area_hectares,
        },
      });

      if (error) throw error;

      if (data.success && data.calculation) {
        setCarbonCalculation(data.calculation);
        toast.success('Carbon calculation completed!');
        return data.calculation;
      } else {
        throw new Error('Calculation failed');
      }
    } catch (error) {
      console.error('Error calculating carbon:', error);
      toast.error('Failed to calculate carbon storage');
      return null;
    } finally {
      setCalculationLoading(false);
    }
  };

  const selectProperty = (property: Property) => {
    setSelectedProperty(property);
    setCarbonCalculation(null);
  };

  return {
    properties,
    selectedProperty,
    carbonCalculation,
    loading,
    calculationLoading,
    createProperty,
    calculateCarbon,
    selectProperty,
    setSelectedProperty,
  };
};