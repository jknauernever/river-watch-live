import { useState, useEffect } from 'react';
import { GoogleMapsLoader } from '@/components/GoogleMapsLoader';
import { RiverGaugeMap } from '@/components/RiverGaugeMap';

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    // Check if API key is already stored
    const stored = localStorage.getItem('google-maps-api-key');
    if (stored) {
      setApiKey(stored);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {!apiKey ? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <GoogleMapsLoader onApiKeySet={setApiKey} />
        </div>
      ) : (
        <RiverGaugeMap apiKey={apiKey} />
      )}
    </div>
  );
};

export default Index;
