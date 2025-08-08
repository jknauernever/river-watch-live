import { useState, useEffect, lazy, Suspense } from 'react';
import { GoogleMapsLoader } from '@/components/GoogleMapsLoader';
const RiverGaugeMap = lazy(() => import('@/components/RiverGaugeMap').then(m => ({ default: m.RiverGaugeMap })));

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('');
  console.log('Index page loading...');

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
      {apiKey ? (
        <RiverGaugeMap apiKey={apiKey} />
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <GoogleMapsLoader onApiKeySet={setApiKey} />
        </div>
      )}
    </div>
  );
};

export default Index;
