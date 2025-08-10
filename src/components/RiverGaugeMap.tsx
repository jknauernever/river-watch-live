/// <reference types="google.maps" />
import { useState, useCallback, useEffect, useRef } from 'react';

import { usgsService } from '@/services/usgs-api';

import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { MapContainer } from '@/components/MapContainer';
import { GaugeMarkers } from '@/components/GaugeMarkers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';


interface RiverGaugeMapProps {
  apiKey: string;
}

export const RiverGaugeMap = ({ apiKey }: RiverGaugeMapProps) => {
  console.log('NEW RiverGaugeMap rendering with apiKey:', apiKey ? 'present' : 'missing');
  
  const { map, isLoaded, error: mapError, resetView, loadPlacesLibrary } = useGoogleMaps({ apiKey });
  const [isLoading, setIsLoading] = useState(false);
  
  const [fetchProgress, setFetchProgress] = useState<{ fetched: number; total?: number } | null>(null);
  
  const [basicGaugeLocations, setBasicGaugeLocations] = useState<any[]>([]);
  
  
  
  const [isUsingDemoData, setIsUsingDemoData] = useState(false);
  const [tooManyInExtent, setTooManyInExtent] = useState<null | { total: number }>(null);
  const [countUnavailable, setCountUnavailable] = useState(false);
  const [renderMode, setRenderMode] = useState<'loading' | 'blocked' | 'markers' | 'countUnavailable'>('loading');
  
  const requestIdRef = useRef(0);
  const [debugInfo, setDebugInfo] = useState<{ bbox: [number, number, number, number]; preflight?: { numberReturned?: number; elapsedMs?: number; exceeds?: boolean }; full?: { total: number; pages: number; elapsedMs: number; capped: boolean } | null; running: boolean; match?: { stations: number; matched: number } } | null>(null);
  const preflightPendingRef = useRef(false);
  
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
    if (!map) return;

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
    setRenderMode('loading');
    setBasicGaugeLocations([]);
    const myRequestId = ++requestIdRef.current;
    // Cancel any in-flight request
    (loadGaugeLocations as any).abortController?.abort?.();
    const abortController = new AbortController();
    (loadGaugeLocations as any).abortController = abortController;
    console.log('Starting gauge location load for bbox:', bbox);
      try {
        // Use OGC latest-continuous clipped to bbox so we only show sites with recent data
        setRenderMode('markers');
        setTooManyInExtent(null);
        setCountUnavailable(false);
        setFetchProgress({ fetched: 0, total: undefined });

        const bulkMap = await usgsService.fetchBulkGaugeData(bbox, {
          parameterCodes: ['00060', '00065'],
          limit: 10000,
        });

        const seen = new Set<string>();
        const valid: any[] = [];
        for (const feature of bulkMap.values()) {
          const f: any = feature as any;
          const props = f?.properties || {};
          let id: string = String(
            props.monitoring_location_number ||
            props.monitoring_location_id ||
            props.monitoring_location_identifier ||
            f.id ||
            props.site_no || ''
          ).replace(/^USGS[:\-]?/i, '');
          if (!id) continue;
          if (seen.has(id)) continue;

          const coords = Array.isArray(f?.geometry?.coordinates) ? f.geometry.coordinates as [number, number] : null;
          if (!coords) continue;
          const [lng, lat] = coords;
          if (typeof lng !== 'number' || typeof lat !== 'number') continue;
          if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) continue;

          seen.add(id);
          valid.push({
            id,
            name: props.monitoring_location_name || `Site ${id}`,
            siteId: id,
            coordinates: [lng, lat] as [number, number],
            siteType: props.site_type_code || 'ST',
            isDemo: false,
          });
        }

        setBasicGaugeLocations(valid);
        setIsUsingDemoData(false);
        console.log(`Loaded ${valid.length} latest sites with recent data in view`);
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

  // Monitor rate limiting status

  // Load enhanced station data when requested

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


  // Load stations when showRiverData becomes true

  // Periodically update rate limit status

  const getUSGSApiKey = useCallback(() => {
    try {
      const local = typeof window !== 'undefined' ? localStorage.getItem('usgs-api-key') : '';
      const envKey = (import.meta as any)?.env?.VITE_USGS_API_KEY || '';
      return (local && local.trim()) || envKey;
    } catch {
      const envKey = (import.meta as any)?.env?.VITE_USGS_API_KEY || '';
      return envKey;
    }
  }, []);

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
      {basicGaugeLocations.length > 0 && (
        <GaugeMarkers 
          map={map}
          basicLocations={basicGaugeLocations}
        />
      )}

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-3 items-center pointer-events-none">
        <Card className="flex-1 max-w-md pointer-events-auto">
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
        

      </div>

      {/* Rate Limiting Status */}

      {/* Demo Data Warning */}
      {isUsingDemoData && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <div className="bg-red-600 text-white px-3 py-2 rounded-md shadow-lg font-bold text-sm pointer-events-auto">
            Warning: Demo Data
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && renderMode === 'loading' && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <Card className="pointer-events-auto">
            <CardContent className="p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                {fetchProgress
                  ? `Fetching gauges${fetchProgress.total ? `: ${fetchProgress.fetched} of ${fetchProgress.total}` : `: ${fetchProgress.fetched}...`}`
                  : 'Fetching gauges...'}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Too many markers notice */}
      {renderMode === 'blocked' && tooManyInExtent && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <Card className="pointer-events-auto">
            <CardContent className="p-3">
              <div className="text-sm">Zoom in closer to see markers.</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Count unavailable notice */}
      {countUnavailable && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <Card className="pointer-events-auto">
            <CardContent className="p-3">
              <div className="text-sm">Gauge count is currently unavailable. Zoom in closer or try again.</div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Legend */}

      {/* Gauge count - always show when locations are loaded */}
      {renderMode === 'markers' && basicGaugeLocations.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
          <Badge variant="secondary">
            {basicGaugeLocations.length} gauge{basicGaugeLocations.length !== 1 ? 's' : ''} in view
          </Badge>
        </div>
      )}
    </div>
  );
};