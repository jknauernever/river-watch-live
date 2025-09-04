import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("QuickBooks Time callback function started");
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    console.log("QuickBooks Time callback received:", {
      code: code ? "present" : "missing",
      state,
      hasCode: !!code,
      codeLength: code ? code.length : 0
    });

    if (!code) {
      throw new Error("Missing authorization code from QuickBooks Time callback");
    }

    // Get credentials from environment
    const clientId = Deno.env.get("QB_TIME_CLIENT_ID");
    const clientSecret = Deno.env.get("QB_TIME_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.log("Environment variables not configured, returning test response");
      // Return test response when environment variables are not configured
      const redirectUrl = new URL("https://lcebfbqjwgwgmwajujwq.lovable.app");
      redirectUrl.searchParams.set("qb_time_error", "true");
      redirectUrl.searchParams.set("error_message", "Environment variables not configured. Please set QB_TIME_CLIENT_ID and QB_TIME_CLIENT_SECRET in Supabase secrets.");

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": redirectUrl.toString(),
        },
      });
    }

    // Exchange authorization code for access token using Intuit OAuth endpoint
    const tokenResponse = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "https://lcebfbqjwgwgmwajujwq.supabase.co/functions/v1/qbo-time-callback",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("Token exchange successful:", {
      access_token: tokenData.access_token ? "present" : "missing",
      refresh_token: tokenData.refresh_token ? "present" : "missing",
      expires_in: tokenData.expires_in,
    });

    // For now, just return a test response to verify the function works
    console.log("Function working - would exchange token in production");

    // Redirect back to the app with success status
    const redirectUrl = new URL("https://lcebfbqjwgwgmwajujwq.lovable.app");
    redirectUrl.searchParams.set("qb_time_connected", "true");
    redirectUrl.searchParams.set("company", "Test Company");

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": redirectUrl.toString(),
      },
    });

  } catch (error) {
    console.error("QuickBooks Time callback error:", error);
    
    // Redirect back to app with error status
    const redirectUrl = new URL("https://lcebfbqjwgwgmwajujwq.lovable.app");
    redirectUrl.searchParams.set("qb_time_error", "true");
    redirectUrl.searchParams.set("error_message", error.message);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": redirectUrl.toString(),
      },
    });
  }
});

