// QuickBooks Time Auth URL Generator - Version 3
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
};

Deno.serve(async (req: Request) => {
  console.log("=== QB TIME AUTH URL FUNCTION CALLED ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Function started");
    
    // Get the QuickBooks Time client ID from secrets
    const clientId = Deno.env.get("QB_TIME_CLIENT_ID");
    console.log("Can access QB_TIME_CLIENT_ID:", clientId ? "YES" : "NO");
    
    if (!clientId) {
      // Return test response when environment variables are not configured
      console.log("Environment variables not configured, returning test response");
      let sessionId = req.headers.get('x-session-id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
      }
      
      // Use the correct Intuit OAuth endpoint that actually exists
      const testAuthUrl = `https://appcenter.intuit.com/app/connect/oauth2?` +
        `client_id=test_client_id&` +
        `redirect_uri=${encodeURIComponent("https://lcebfbqjwgwgmwajujwq.supabase.co/functions/v1/qbo-time-callback")}&` +
        `response_type=code&` +
        `state=${sessionId}&` +
        `scope=${encodeURIComponent('com.intuit.quickbooks.payroll')}&` +
        `response_mode=query`;
      
      return new Response(
        JSON.stringify({ 
          authUrl: testAuthUrl, 
          sessionId,
          message: "TEST MODE - Environment variables not configured. Please set QB_TIME_CLIENT_ID and QB_TIME_CLIENT_SECRET in Supabase secrets."
        }),
        {
          headers: { "content-type": "application/json", ...corsHeaders },
          status: 200,
        }
      );
    }

    // Generate a simple session ID instead of requiring authentication
    let sessionId = req.headers.get('x-session-id');
    if (!sessionId) {
      // Generate a new session ID
      sessionId = crypto.randomUUID();
    }

    console.log("Using session ID:", sessionId.substring(0, 8) + "...");

    const redirectUri = "https://lcebfbqjwgwgmwajujwq.supabase.co/functions/v1/qbo-time-callback";
    const responseType = "code";
    const state = sessionId; // Use session ID as state
    
    // Use the correct Intuit OAuth endpoint for QuickBooks Time
    const authUrl = `https://appcenter.intuit.com/app/connect/oauth2?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `state=${state}&` +
      `scope=${encodeURIComponent('com.intuit.quickbooks.payroll')}&` +
      `response_mode=query`;

    console.log("Generated auth URL successfully");

    return new Response(
      JSON.stringify({ authUrl, sessionId }),
      {
        headers: { "content-type": "application/json", ...corsHeaders },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      {
        headers: { "content-type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});
