import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Key } from 'lucide-react';

interface GoogleMapsLoaderProps {
  onApiKeySet: (apiKey: string) => void;
}

export const GoogleMapsLoader = ({ onApiKeySet }: GoogleMapsLoaderProps) => {
  const [apiKey, setApiKey] = useState('');
  const [storedKey, setStoredKey] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('google-maps-api-key');
    if (stored) {
      setStoredKey(stored);
      onApiKeySet(stored);
    }
  }, [onApiKeySet]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('google-maps-api-key', apiKey.trim());
      setStoredKey(apiKey.trim());
      onApiKeySet(apiKey.trim());
    }
  };

  const handleClear = () => {
    localStorage.removeItem('google-maps-api-key');
    setStoredKey('');
    setApiKey('');
  };

  if (storedKey) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-2 flex items-center justify-center">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-primary">API Key Configured</CardTitle>
          <CardDescription>
            Google Maps API key is ready. The map will load shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleClear} variant="outline" className="w-full">
            Use Different API Key
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-primary">Google Maps Setup Required</CardTitle>
        <CardDescription>
          Enter your Google Maps JavaScript API key to load the interactive map with USGS river gauge data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="Enter Google Maps API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Get your free API key from the{' '}
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Cloud Console
              </a>
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={!apiKey.trim()}>
            Load Map
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};