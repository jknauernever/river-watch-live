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
    } else {
      // Set default API key if none exists
      const defaultKey = 'AIzaSyD3jjY3_Ck3ETbUk9al0uvh5Z-XU5P08vc';
      localStorage.setItem('google-maps-api-key', defaultKey);
      setApiKey(defaultKey);
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
