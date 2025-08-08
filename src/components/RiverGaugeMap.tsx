import { useState, useCallback, useEffect } from 'react';
import { GaugeStation } from '@/types/usgs';
import { usgsService } from '@/services/usgs-api';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { MapContainer } from '@/components/MapContainer';
import { GaugeMarkers } from '@/components/GaugeMarkers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Droplets } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RiverGaugeMapProps {
  apiKey: string;
}

export const RiverGaugeMap = ({ apiKey }: RiverGaugeMapProps) => {
  console.log('NEW RiverGaugeMap rendering with apiKey:', apiKey ? 'present' : 'missing');
  
  const { map, isLoaded, error: mapError, resetView } = useGoogleMaps({ apiKey });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [stations, setStations] = useState<GaugeStation[]>([]);
  const [basicGaugeLocations, setBasicGaugeLocations] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<GaugeStation | null>(null);
  const [showRiverData, setShowRiverData] = useState(false);
  const [isUsingDemoData, setIsUsingDemoData] = useState(false);
  const { toast } = useToast();

  // Load gauge locations only once when map bounds change
  const loadGaugeLocations = useCallback(async () => {
    if (!map || isLoading) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const bbox: [number, number, number, number] = [
      sw.lng(), sw.lat(), ne.lng(), ne.lat()
    ];

    setIsLoading(true);
    console.log('Starting gauge location load for bbox:', bbox);
    try {
      const locations = await usgsService.getGaugeLocationsOnly(bbox);
      console.log('Received locations:', locations);
      setBasicGaugeLocations(locations);
      setIsUsingDemoData(locations.length > 0 && locations[0].isDemo);
      console.log(`Loaded ${locations.length} gauge locations, isDemo: ${locations.length > 0 && locations[0].isDemo}`);
    } catch (error) {
      console.error('Error loading gauge locations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [map, isLoading]);

  // Load enhanced station data when requested
  const loadStations = useCallback(async () => {
    if (!showRiverData || basicGaugeLocations.length === 0 || isLoadingData) return;
    
    setIsLoadingData(true);
    console.log('Loading water data for stations:', basicGaugeLocations);
    try {
      const enhancedStations = await usgsService.enhanceGaugeStationsWithData(basicGaugeLocations);
      console.log('Enhanced stations received:', enhancedStations);
      setStations(enhancedStations);

      toast({
        title: "Water Data Loaded",
        description: `Enhanced ${enhancedStations.length} gauges with current water levels`,
      });
    } catch (error) {
      console.error('Error loading water data:', error);
      toast({
        title: "Error Loading Water Data",
        description: "Failed to load current water levels. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [showRiverData, basicGaugeLocations, isLoadingData, toast]);

  // Set up map listeners once when map is loaded
  useEffect(() => {
    if (!map || !isLoaded) return;

    let timeoutId: NodeJS.Timeout;
    let lastBounds: string | null = null;

    // Set up search functionality
    try {
      const autocomplete = new window.google.maps.places.Autocomplete(
        document.getElementById('search-input') as HTMLInputElement
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          map.setCenter(place.geometry.location);
          map.setZoom(10);
        }
      });
    } catch (error) {
      console.warn('Search functionality unavailable:', error);
    }

    // Load initial gauge locations - only once
    window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      setTimeout(() => loadGaugeLocations(), 1000);
    });

    // Note: Removed automatic bounds_changed listener to prevent markers from moving during zoom/pan
    // Users can manually refresh if they want to see gauges in new areas

    return () => {
      clearTimeout(timeoutId);
    };
  }, [map, isLoaded, loadGaugeLocations, isLoading]);

  const toggleRiverData = useCallback(() => {
    setShowRiverData(prev => {
      const newValue = !prev;
      
      if (newValue) {
        loadStations();
      } else {
        setStations([]);
        setSelectedStation(null);
      }
      
      return newValue;
    });
  }, [loadStations]);

  // Show error state if map failed to load
  if (mapError) {
    return (
      <div className="relative w-full h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <h2 className="text-xl font-semibold mb-2">Map Unavailable</h2>
            <p className="text-muted-foreground mb-4">
              {mapError.includes('quota') 
                ? 'The Google Maps API key has reached its usage limit. Please try again later or contact support.'
                : 'Unable to load the map. Please check your internet connection and try again.'
              }
            </p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Map Container */}
      <MapContainer />
      
      {/* Markers Component */}
      <GaugeMarkers 
        map={map}
        basicLocations={basicGaugeLocations}
        stations={stations}
        showRiverData={showRiverData}
        onStationSelect={setSelectedStation}
      />

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-3 items-center">
        <Card className="flex-1 max-w-md">
          <CardContent className="p-3">
            <input
              id="search-input"
              type="text"
              placeholder="Search for a location..."
              className="w-full border-0 outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
            />
          </CardContent>
        </Card>
        
        <Button 
          onClick={toggleRiverData} 
          variant={showRiverData ? "default" : "outline"} 
          size="sm"
          disabled={basicGaugeLocations.length === 0}
        >
          <Droplets className="w-4 h-4 mr-2" />
          {showRiverData ? "Hide" : "Show"} Water Data
        </Button>
        
        <Button onClick={resetView} variant="secondary" size="sm">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Demo Data Warning */}
      {isUsingDemoData && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-red-600 text-white px-3 py-2 rounded-md shadow-lg font-bold text-sm">
            Warning: Demo Data
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoadingData && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading water level data...</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      {showRiverData && (
        <Card className="absolute bottom-4 left-4 z-10">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-2">
              <Droplets className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Water Levels</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-water-low"></div>
                <span>Low (&lt; 2 ft)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-water-medium"></div>
                <span>Medium (2-5 ft)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-water-high"></div>
                <span>High (5-10 ft)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-water-critical"></div>
                <span>Critical (&gt; 10 ft)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gauge count - always show when locations are loaded */}
      {basicGaugeLocations.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10">
          <Badge variant="secondary">
            {basicGaugeLocations.length} gauge{basicGaugeLocations.length !== 1 ? 's' : ''} in view
            {showRiverData && stations.length > 0 && ` • ${stations.length} with data`}
          </Badge>
        </div>
      )}
    </div>
  );
};