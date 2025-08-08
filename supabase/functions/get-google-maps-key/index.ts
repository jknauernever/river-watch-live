import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Read the Google Maps browser key from Supabase secrets
    const apiKey = Deno.env.get('GOOGLE_MAPS_BROWSER_KEY')

    if (!apiKey) {
      console.error('GOOGLE_MAPS_BROWSER_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps key not configured',
          message: 'Please add GOOGLE_MAPS_BROWSER_KEY to Supabase Edge Function secrets (use a referrer-restricted browser key)'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Return the key (this is a browser key, expected to be public at runtime)
    return new Response(
      JSON.stringify({ 
        apiKey,
        success: true
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in get-google-maps-key function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: (error as Error).message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})