import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

export const config = {
  runtime: 'edge',
};

// Simple allowlist for USGS OGC API hostnames
const ALLOWED_HOSTS = new Set([
  'api.waterdata.usgs.gov',
]);

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Support both GET querystring and POST body usage
    let upstreamParam = url.searchParams.get('upstream');
    if (!upstreamParam && (req.method === 'POST')) {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.upstream === 'string') upstreamParam = body.upstream;
    }

    if (!upstreamParam) {
      return new Response(JSON.stringify({ error: 'Missing upstream URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate upstream URL
    let upstream: URL;
    try {
      upstream = new URL(upstreamParam);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid upstream URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ALLOWED_HOSTS.has(upstream.host)) {
      return new Response(JSON.stringify({ error: 'Upstream host not allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Inject API key if configured
    const apiKey = Deno.env.get('USGS_API_KEY') || '';
    if (apiKey && !upstream.searchParams.has('api_key')) {
      upstream.searchParams.set('api_key', apiKey);
    }

    // Forward request to upstream
    const upstreamResp = await fetch(upstream.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', upstreamResp.headers.get('Content-Type') || 'application/json');
    // Cache for a short time to reduce pressure on upstream
    headers.set('Cache-Control', 'public, max-age=30');

    const body = await upstreamResp.arrayBuffer();
    return new Response(body, { status: upstreamResp.status, headers });
  } catch (e) {
    console.error('[usgs-proxy] error', e);
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
