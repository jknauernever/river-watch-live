import { useEffect, useState } from "react";
import { RiverGaugeMap } from "@/components/RiverGaugeMap";
import { GoogleMapsLoader } from "@/components/GoogleMapsLoader";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [apiKey, setApiKey] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem("google-maps-api-key");
      const envKey = (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY || "";
      const urlKey = new URLSearchParams(window.location.search).get("gmaps_api_key") || "";

      // If a key is provided via URL, prefer it and persist for subsequent loads (dev convenience)
      if (urlKey) {
        localStorage.setItem("google-maps-api-key", urlKey);
        setApiKey(urlKey);
      }

      const candidate = stored || envKey || "";
      if (candidate) {
        setApiKey(candidate);
      }

      // Optional: try Supabase function if configured in your environment
      try {
        const { data, error } = await supabase.functions.invoke("get-google-maps-key");
        if (!error && data?.apiKey) {
          setApiKey(data.apiKey);
        }
      } catch {
        /* noop */
      }

      // Fetch USGS API key from Supabase and persist for request helper
      try {
        const { data, error } = await supabase.functions.invoke("get-usgs-api-key");
        const usgsKey = (data as any)?.apiKey as string | undefined;
        if (!error && usgsKey) {
          localStorage.setItem('usgs-api-key', usgsKey);
        }
      } catch {
        /* noop */
      }
    };
    init();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {apiKey ? (
          <RiverGaugeMap apiKey={apiKey} />
        ) : (
          <GoogleMapsLoader onApiKeySet={(key) => setApiKey(key)} />
        )}
      </div>
    </div>
  );
};

export default Index;
