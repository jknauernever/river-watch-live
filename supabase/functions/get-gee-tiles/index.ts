import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Simple in-memory cache for GEE tile URLs
const geeUrlCache = new Map<string, string>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geeApiKey = Deno.env.get('GEE_TILE_SERVER_API_KEY');
    
    if (!geeApiKey) {
      console.error('GEE_TILE_SERVER_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'GEE API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let dataset, year, month, z, x, y;

    // Handle both query parameters and request body
    if (req.method === 'POST') {
      const body = await req.json();
      dataset = body.dataset;
      year = body.year;
      month = body.month;
      z = body.z;
      x = body.x;
      y = body.y;
      console.log('POST body:', body);
    } else {
      const url = new URL(req.url);
      dataset = url.searchParams.get('dataset');
      year = url.searchParams.get('year');
      month = url.searchParams.get('month');
      z = url.searchParams.get('z');
      x = url.searchParams.get('x');
      y = url.searchParams.get('y');
      console.log('Query params:', { dataset, year, month, z, x, y });
    }

    if (!dataset) {
      return new Response(
        JSON.stringify({ error: 'Dataset parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // If z, x, y are provided, this is a tile request - fetch the actual tile
    if (z && x && y) {
      console.log('🔄 Fetching tile for coordinates:', { z, x, y, dataset, year, month });
      
      // Get the GEE tile URL (from cache or fetch)
      const cacheKey = `${dataset}-${year}-${month}`;
      let geeTileUrl = geeUrlCache.get(cacheKey);
      
      if (!geeTileUrl) {
        console.log('📡 Fetching GEE tile URL from Vercel API...');
        
        // Get the tile URL from the Vercel API
        const apiUrl = `https://gee-tile-server.vercel.app/api/tiles?dataset=${dataset}&year=${year}&month=${month}&apikey=${geeApiKey}`;
        
        try {
          const apiResponse = await fetch(apiUrl);
          
          if (!apiResponse.ok) {
            console.error('❌ API response failed:', apiResponse.status);
            
            // Try to get the error details
            let errorDetails = '';
            try {
              const errorData = await apiResponse.json();
              errorDetails = errorData.error || errorData.message || '';
            } catch (e) {
              errorDetails = apiResponse.statusText;
            }
            
            return new Response(
              JSON.stringify({ 
                error: `API failed: ${apiResponse.status}`,
                details: errorDetails,
                suggestion: apiResponse.status === 404 ? "Try a different year, month, or dataset" : "Check API configuration"
              }),
              { 
                status: apiResponse.status, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
          const apiData = await apiResponse.json();
          
          if (!apiData.tile_url) {
            console.error('❌ No tile_url in API response:', apiData);
            return new Response(
              JSON.stringify({ 
                error: 'No tile URL available',
                details: 'The API response did not contain a valid tile URL',
                suggestion: 'Check if the dataset and parameters are valid'
              }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
          // Check if the response indicates no data
          if (apiData.error && apiData.error.includes('No data available')) {
            console.warn('⚠️ No data available for requested parameters:', apiData);
            return new Response(
              JSON.stringify({
                error: apiData.error,
                suggestion: apiData.suggestion || 'Try different parameters',
                dataset: apiData.dataset,
                requestedParams: apiData.requestedParams
              }),
              { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
          geeTileUrl = apiData.tile_url;
          geeUrlCache.set(cacheKey, geeTileUrl);
          console.log('✅ Cached GEE tile URL:', geeTileUrl);
          
          // Log data info if available
          if (apiData.dataInfo) {
            console.log('📊 Data info:', {
              imageCount: apiData.dataInfo.imageCount,
              dateRange: apiData.dataInfo.dateRange,
              hasValidData: apiData.dataInfo.hasValidData
            });
          }
          
        } catch (error) {
          console.error('❌ Error fetching GEE tile URL:', error);
          return new Response(
            JSON.stringify({ 
              error: `Failed to get GEE tile URL: ${error.message}`,
              suggestion: 'Check network connectivity and API configuration'
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } else {
        console.log('✅ Using cached GEE tile URL');
      }
      
      // Now fetch the actual tile from GEE
      const tileUrl = geeTileUrl.replace('{z}', z).replace('{x}', x).replace('{y}', y);
      console.log('🖼️ Fetching tile from GEE:', tileUrl);
      
      try {
        const tileResponse = await fetch(tileUrl);
        
        if (!tileResponse.ok) {
          console.error('❌ Tile fetch failed:', tileResponse.status, tileResponse.statusText);
          return new Response(
            JSON.stringify({ error: `Tile fetch failed: ${tileResponse.status}` }),
            { 
              status: tileResponse.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Return the tile data with appropriate headers
        const tileData = await tileResponse.arrayBuffer();
        console.log('✅ Successfully fetched tile data, size:', tileData.byteLength);
        
        return new Response(tileData, {
          headers: {
            ...corsHeaders,
            'Content-Type': tileResponse.headers.get('Content-Type') || 'image/png',
            'Cache-Control': 'public, max-age=3600', // Cache tiles for 1 hour
          }
        });
        
      } catch (error) {
        console.error('❌ Error fetching tile from GEE:', error);
        return new Response(
          JSON.stringify({ error: `Tile fetch error: ${error.message}` }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // If no tile coordinates, return the template URL that points to this function
    console.log('📋 Returning tile URL template for:', dataset, year, month);
    
    // Return our custom URL that points back to this Supabase function
    const customTileUrl = `https://sereallctpcqrdjmvwrs.supabase.co/functions/v1/get-gee-tiles?dataset=${dataset}&year=${year}&month=${month}&z={z}&x={x}&y={y}`;
    
    return new Response(JSON.stringify({
      tileUrl: customTileUrl,
      dataset: dataset,
      description: "Proxied through Supabase",
      parameters: { year, month }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Error in get-gee-tiles function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});