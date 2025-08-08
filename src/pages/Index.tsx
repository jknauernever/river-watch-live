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
      const candidate = stored || envKey || "";
      if (candidate) {
        setApiKey(candidate);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("get-google-maps-key");
        if (error) {
          console.warn("Failed to fetch Google Maps key from Supabase:", error);
          return;
        }
        if (data?.apiKey) {
          setApiKey(data.apiKey);
        }
      } catch (e) {
        console.warn("Network error fetching Google Maps key", e);
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
