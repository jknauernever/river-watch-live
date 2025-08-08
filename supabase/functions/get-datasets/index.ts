import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching datasets from Vercel API...');
    
    // Get API key from environment
    const apiKey = Deno.env.get('GEE_TILE_SERVER_API_KEY');
    if (!apiKey) {
      console.error('GEE_TILE_SERVER_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const response = await fetch(`https://gee-tile-server.vercel.app/api/datasets?apikey=${apiKey}`);
    
    if (!response.ok) {
      console.error('Vercel API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: `Vercel API error: ${response.status} ${response.statusText}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const data = await response.json();
    console.log('Raw API response:', data);
    
    // Transform the datasets object into an array format expected by frontend
    const datasetsObj = data.datasets || {};
    const datasets = Object.entries(datasetsObj).map(([key, dataset]: [string, any]) => ({
      id: key,
      name: key.toUpperCase(), // Convert 'ndvi' to 'NDVI', etc.
      description: dataset.description || '',
      category: dataset.category || 'Other',
      collection: dataset.collection || '',
      band: dataset.band || '',
      temporalResolution: dataset.temporalResolution || '',
      spatialResolution: dataset.spatialResolution || '',
      defaultPalette: dataset.defaultPalette || '',
      min: dataset.min || 0,
      max: dataset.max || 100
    }));
    
    console.log('Transformed datasets:', datasets);
    
    return new Response(
      JSON.stringify({ 
        datasets,
        count: datasets.length,
        success: true,
        categories: data.categories || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching datasets:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});