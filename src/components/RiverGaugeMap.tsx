/// <reference types="google.maps" />
import { useState, useCallback, useEffect, useRef } from 'react';
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
  
  const { map, isLoaded, error: mapError, resetView, loadPlacesLibrary, loadVisualizationLibrary } = useGoogleMaps({ apiKey });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<{ fetched: number; total?: number } | null>(null);
  const [stations, setStations] = useState<GaugeStation[]>([]);
  const [basicGaugeLocations, setBasicGaugeLocations] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<GaugeStation | null>(null);
  const [showRiverData, setShowRiverData] = useState(false);
  const [isUsingDemoData, setIsUsingDemoData] = useState(false);
  const [tooManyInExtent, setTooManyInExtent] = useState<null | { total: number }>(null);
  const [countUnavailable, setCountUnavailable] = useState(false);
  const [showVectorLayer, setShowVectorLayer] = useState(false);
  const heatmapRef = useRef<any>(null);
  const { toast } = useToast();
  const searchInitializedRef = useRef(false);

  const handleSearchFocus = useCallback(async () => {
    if (searchInitializedRef.current) return;
    try {
      await loadPlacesLibrary?.();
      const input = document.getElementById('search-input') as HTMLInputElement | null;
      if (!input || !window.google?.maps?.places?.Autocomplete) return;
      const autocomplete = new window.google.maps.places.Autocomplete(input);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location && map) {
          map.setCenter(place.geometry.location);
          map.setZoom(10);
        }
      });
      searchInitializedRef.current = true;
      console.log('Search Autocomplete initialized on demand');
    } catch (err) {
      console.warn('Deferred search initialization failed:', err);
    }
  }, [loadPlacesLibrary, map]);

  // Load gauge locations (progressive, abortable) when map bounds change
  const loadGaugeLocations = useCallback(async () => {
    if (!map || isLoading) return;

    const bounds = map.getBounds();
    if (!bounds) {
      console.log('No map bounds available');
      return;
    }

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    // Normalize bbox to avoid floating jitter and improve cache hits
    const round = (v: number) => Math.round(v * 1000) / 1000; // ~100m grid
    const bbox: [number, number, number, number] = [
      round(sw.lng()), round(sw.lat()), round(ne.lng()), round(ne.lat())
    ];

    console.log('Map bounds:', {
      southwest: [sw.lat(), sw.lng()],
      northeast: [ne.lat(), ne.lng()],
      bbox: bbox
    });

    setIsLoading(true);
    setFetchProgress({ fetched: 0, total: undefined });
    setTooManyInExtent(null);
    setCountUnavailable(false);
    setShowVectorLayer(false);
    // Cancel any in-flight request
    (loadGaugeLocations as any).abortController?.abort?.();
    const abortController = new AbortController();
    (loadGaugeLocations as any).abortController = abortController;
    console.log('Starting gauge location load for bbox:', bbox);
    try {
      const LIMIT = 1000;
      // Preflight count with safe fallback
      let total: number | null = null;
      try {
        total = await usgsService.fetchMonitoringLocationsCount(bbox);
      } catch (countErr) {
        console.warn('Count preflight failed; blocking markers per policy', countErr);
      }
      if (total === null) {
        // Strict block when count unavailable
        setCountUnavailable(true);
        setShowVectorLayer(false);
        setBasicGaugeLocations([]);
        if (heatmapRef.current) {
          heatmapRef.current.setMap(null);
          heatmapRef.current = null;
        }
        return;
      }
      if (total > LIMIT) {
        setTooManyInExtent({ total });
        setShowVectorLayer(true);
        // Render heatmap overlay
        try {
          await loadVisualizationLibrary();
          const sample = await usgsService.fetchMonitoringLocations(bbox, { maxFeatures: 1000 });
          const points = sample.map((f: any) => {
            const [lng, lat] = (f.geometry?.coordinates || f.properties?.coordinates) as [number, number];
            return new window.google.maps.LatLng(lat, lng);
          }).filter(Boolean);
          if (heatmapRef.current) {
            heatmapRef.current.setMap(null);
          }
          const subtleGradient = [
            'rgba(0, 0, 255, 0)',
            'rgba(0, 128, 255, 0.15)',
            'rgba(0, 128, 255, 0.3)',
            'rgba(0, 128, 255, 0.5)',
            'rgba(0, 128, 255, 0.7)'
          ];
          heatmapRef.current = new (window as any).google.maps.visualization.HeatmapLayer({
            data: points,
            map,
            radius: 14,
            dissipating: true,
            opacity: 0.45,
            gradient: subtleGradient,
          });
        } catch (e) {
          console.warn('Heatmap overlay failed:', e);
        }
        return; // skip marker fetching
      }
      const locations = await usgsService.getGaugeLocationsOnly(bbox, {
        onProgress: (fetched, total) => {
          setFetchProgress({ fetched, total });
        },
        onPage: (features) => {
          const valid = features.map((f: any) => ({
            id: f.id || f.properties?.monitoring_location_number,
            name: f.properties?.monitoring_location_name || `Site ${f.properties?.monitoring_location_number}`,
            siteId: f.properties?.monitoring_location_number,
            coordinates: (f.geometry?.coordinates || f.properties?.coordinates) as [number, number],
            siteType: f.properties?.site_type_cd || f.properties?.site_type_code || 'ST',
            isDemo: false,
          })).filter((l: any) => Array.isArray(l.coordinates) && l.coordinates.length === 2);
          // Deduplicate by siteId while streaming pages
          setBasicGaugeLocations(prev => {
            const map = new Map<string, any>(prev.map(p => [p.siteId, p]));
            for (const v of valid) {
              map.set(v.siteId, v);
            }
            return Array.from(map.values());
          });
        },
        signal: abortController.signal,
      });
      console.log('Received locations:', locations);
      
      // Filter out any locations with invalid coordinates
      const validLocations = locations.filter(location => {
        const [lng, lat] = location.coordinates;
        if (typeof lng !== 'number' || typeof lat !== 'number' || 
            isNaN(lng) || isNaN(lat) || 
            lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          console.warn('Filtering out invalid location:', location.name, location.coordinates);
          return false;
        }
        return true;
      });

      console.log(`Filtered ${validLocations.length} valid locations from ${locations.length} total`);
      setBasicGaugeLocations(validLocations);
      setIsUsingDemoData(false);
      console.log(`Loaded ${validLocations.length} gauge locations, isDemo: ${validLocations.length > 0 && validLocations[0].isDemo}`);
    } catch (error) {
      console.error('Error loading gauge locations:', error);
    } finally {
      setIsLoading(false);
      setFetchProgress(null);
      if ((loadGaugeLocations as any).abortController === abortController) {
        (loadGaugeLocations as any).abortController = null;
      }
    }
  }, [map, isLoading]);

  // Load enhanced station data when requested
  const loadStations = useCallback(async () => {
    if (!showRiverData || basicGaugeLocations.length === 0 || isLoadingData || !map) return;
    
    // Get current map bounds for bulk API optimization
    const bounds = map.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const bbox: [number, number, number, number] = [
      sw.lng(), sw.lat(), ne.lng(), ne.lat()
    ];
    
    setIsLoadingData(true);
    console.log('Loading water data for stations:', basicGaugeLocations);
    try {
      const enhancedStations = await usgsService.enhanceGaugeStationsWithData(basicGaugeLocations, bbox);
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
  }, [showRiverData, basicGaugeLocations, isLoadingData, map, toast]);

  // Set up map listeners once when map is loaded
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Debounced loader to avoid spamming requests while user pans/zooms
    let debounceTimer: any = null;
    const debouncedLoad = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        loadGaugeLocations();
      }, 400);
    };

    // Listen continuously so locations update with viewport changes
    const idleListener = window.google.maps.event.addListener(map, 'idle', debouncedLoad);

    return () => {
      if (idleListener) {
        window.google.maps.event.removeListener(idleListener as google.maps.MapsEventListener);
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [map, isLoaded, loadGaugeLocations]);

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
      {!showVectorLayer && (
        <GaugeMarkers 
          map={map}
          basicLocations={basicGaugeLocations}
          stations={stations}
          showRiverData={showRiverData}
          onStationSelect={setSelectedStation}
        />
      )}

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-3 items-center">
        <Card className="flex-1 max-w-md">
          <CardContent className="p-3">
            <input
              id="search-input"
              type="text"
              placeholder="Search for a location..."
              onFocus={handleSearchFocus}
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
      {(isLoading || isLoadingData) && !tooManyInExtent && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                {isLoading
                  ? fetchProgress
                    ? `Fetching gauges${fetchProgress.total ? `: ${fetchProgress.fetched} of ${fetchProgress.total}` : `: ${fetchProgress.fetched}...`}`
                    : 'Fetching gauges...'
                  : 'Loading water level data...'}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Too many markers notice */}
      {tooManyInExtent && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
          <Card>
            <CardContent className="p-3">
              <div className="text-sm">
                Too many gauges in view ({tooManyInExtent.total.toLocaleString()}). Showing a density preview. Zoom in to see individual gauges (up to 1,000).
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Count unavailable notice */}
      {countUnavailable && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
          <Card>
            <CardContent className="p-3">
              <div className="text-sm">
                Gauge count is currently unavailable. Zoom in or try again.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Heatmap overlay is attached directly to the Google Map (no DOM overlay needed) */}

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