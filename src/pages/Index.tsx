import { useState } from 'react';
import { GoogleMapsLoader } from '@/components/GoogleMapsLoader';
import { RiverGaugeMap } from '@/components/RiverGaugeMap';

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('');

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
