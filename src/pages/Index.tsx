import { useState, useEffect } from 'react';
import { GoogleMapsLoader } from '@/components/GoogleMapsLoader';
import { RiverGaugeMap } from '@/components/RiverGaugeMap';
import { OfflineMapFallback } from '@/components/OfflineMapFallback';

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [useOfflineMode, setUseOfflineMode] = useState(false);

  useEffect(() => {
    // Force offline mode due to current API quota limitations
    setUseOfflineMode(true);
    
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

  // Always use offline mode for now due to API quota issues
  return (
    <div className="min-h-screen bg-background">
      <OfflineMapFallback />
    </div>
  );
};

export default Index;
