import { useEffect, useState } from "react";
import { RiverGaugeMap } from "@/components/RiverGaugeMap";
import { GoogleMapsLoader } from "@/components/GoogleMapsLoader";

const Index = () => {
  const [apiKey, setApiKey] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("google-maps-api-key");
    const envKey = (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY || "";
    setApiKey(stored || envKey || "");
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
