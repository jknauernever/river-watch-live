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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';


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
  
  // Parameter filtering and thresholds
  const [activeCodes, setActiveCodes] = useState<string[]>(['00060','00065']);
  const [thresholds, setThresholds] = useState<Record<string, { q33:number; q66:number; min:number; max:number }>>({});
  const [availableCodes, setAvailableCodes] = useState<Set<string>>(new Set());
  const [unitsByCode, setUnitsByCode] = useState<Record<string, string | undefined>>({});
  
  const requestIdRef = useRef(0);
  const [debugInfo, setDebugInfo] = useState<{ bbox: [number, number, number, number]; preflight?: { numberReturned?: number; elapsedMs?: number; exceeds?: boolean }; full?: { total: number; pages: number; elapsedMs: number; capped: boolean } | null; running: boolean; match?: { stations: number; matched: number } } | null>(null);
  const preflightPendingRef = useRef(false);
  
  const PARAM_LABEL: Record<string, string> = {
    '00060': 'Discharge',
    '00065': 'Gage height',
    '00010': 'Water temp',
    '00400': 'pH',
    '00300': 'Dissolved oxygen',
    '99133': 'NO₃+NO₂ (as N)',
    '63680': 'Turbidity',
    '80154': 'Susp. sediment conc',
    '00095': 'Specific conductance',
  };
  
  const searchInitializedRef = useRef(false);

  type DatasetKey =
    | 'Gage height' | 'Discharge' | 'Water temperature' | 'pH'
    | 'Dissolved oxygen' | 'NO3+NO2 (as N)' | 'Turbidity'
    | 'Susp. sediment conc' | 'Specific conductance';

  const DATASETS: Record<DatasetKey, string[]> = {
    'Gage height': ['00065'],
    'Discharge': ['00060'],
    'Water temperature': ['00010'],
    'pH': ['00400'],
    'Dissolved oxygen': ['00300'],
    'NO3+NO2 (as N)': ['99133'],
    'Turbidity': ['63680'],
    'Susp. sediment conc': ['80154'],
    'Specific conductance': ['00095'],
  };
  const DEFAULT_DATASET: DatasetKey = 'Gage height';

  const [selectedDataset, setSelectedDataset] = useState<DatasetKey>(DEFAULT_DATASET);
  const [datasetAvailability, setDatasetAvailability] = useState<Record<DatasetKey, boolean>>({
    'Gage height': true,
    'Discharge': true,
    'Water temperature': true,
    'pH': true,
    'Dissolved oxygen': true,
    'NO3+NO2 (as N)': true,
    'Turbidity': true,
    'Susp. sediment conc': true,
    'Specific conductance': true,
  });

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

  // Check availability of each dataset within the bbox
  const updateDatasetAvailability = useCallback(async (bbox: [number, number, number, number]) => {
    try {
      const entries = Object.entries(DATASETS) as [DatasetKey, string[]][];
      const results = await Promise.all(entries.map(async ([name, codes]) => {
        try {
          const m = await usgsService.fetchBulkGaugeData(bbox, { parameterCodes: codes, limit: 1 });
          return [name, m.size > 0] as const;
        } catch {
          return [name, false] as const;
        }
      }));
      const next: Record<DatasetKey, boolean> = { ...datasetAvailability } as any;
      results.forEach(([name, ok]) => { next[name] = ok; });
      setDatasetAvailability(next);
      // Auto-switch if current becomes unavailable
      if (!next[selectedDataset]) {
        const firstEnabled = (Object.keys(DATASETS) as DatasetKey[]).find(k => next[k]);
        if (firstEnabled && firstEnabled !== selectedDataset) setSelectedDataset(firstEnabled);
      }
    } catch (e) {
      console.warn('updateDatasetAvailability failed', e);
    }
  }, [datasetAvailability, selectedDataset]);

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
        // Only show sites with recent data for selected parameters
        setRenderMode('markers');
        setTooManyInExtent(null);
        setCountUnavailable(false);
        setFetchProgress({ fetched: 0, total: undefined });

        // Update dataset availability in the background
        updateDatasetAvailability(bbox);

        const codes = DATASETS[selectedDataset];
        const bulkMap = await usgsService.fetchBulkGaugeData(bbox, {
          parameterCodes: codes,
          limit: 10000,
        });

        type Site = {
          id: string; name: string; siteId: string; coordinates: [number, number]; siteType: string; isDemo: boolean;
          params: Array<{ code: string; value: number; unit?: string; time?: string; label?: string }>;
        };

        const featuresBySite = new Map<string, Site>();
        const units: Record<string, string | undefined> = {};
        const presentCodes = new Set<string>();

        for (const feature of bulkMap.values()) {
          const f: any = feature as any;
          const props = f?.properties || {};
          const code: string | undefined = props.parameter_code || props.observed_property_code;
          if (!code) continue;
          presentCodes.add(code);

          let id: string = String(
            props.monitoring_location_number || props.monitoring_location_id || props.monitoring_location_identifier || f.id || props.site_no || ''
          ).replace(/^USGS[:\-]?/i, '');
          if (!id) continue;

          const coords = Array.isArray(f?.geometry?.coordinates) ? (f.geometry.coordinates as [number, number]) : null;
          if (!coords) continue;
          const [lng, lat] = coords;
          if (typeof lng !== 'number' || typeof lat !== 'number') continue;
          if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) continue;

          const value = Number(props.value ?? props.result);
          if (!Number.isFinite(value)) continue;
          const unit = props.unit || props.unit_of_measurement || props.unit_of_measure || undefined;
          const time = props.time || props.datetime || props.result_time || undefined;
          const label = props.parameter_name || props.observed_property_name || undefined;
          if (unit && !units[code]) units[code] = unit;

          const existing = featuresBySite.get(id);
          if (!existing) {
            featuresBySite.set(id, {
              id,
              name: props.monitoring_location_name || `Site ${id}`,
              siteId: id,
              coordinates: [lng, lat],
              siteType: props.site_type_code || 'ST',
              isDemo: false,
              params: [{ code, value, unit, time, label }],
            });
          } else {
            existing.params.push({ code, value, unit, time, label });
          }
        }

        // Build thresholds from values per parameter (q33/q66)
        const quantile = (sorted: number[], q: number) => {
          if (!sorted.length) return NaN;
          const pos = (sorted.length - 1) * q;
          const base = Math.floor(pos);
          const rest = pos - base;
          return sorted[base] + (rest ? (sorted[base + 1] - sorted[base]) * rest : 0);
        };
        const valuesByCode: Record<string, number[]> = {};
        for (const site of featuresBySite.values()) {
          for (const p of site.params) {
            (valuesByCode[p.code] ||= []).push(p.value);
          }
        }
        const th: Record<string, { q33:number; q66:number; min:number; max:number }> = {};
        Object.entries(valuesByCode).forEach(([code, arr]) => {
          arr.sort((a,b)=>a-b);
          th[code] = { q33: quantile(arr, 0.33), q66: quantile(arr, 0.66), min: arr[0], max: arr[arr.length-1] };
        });

        const sites = Array.from(featuresBySite.values());
        setBasicGaugeLocations(sites);
        setThresholds(th);
        setAvailableCodes(presentCodes);
        setUnitsByCode(units);
        setIsUsingDemoData(false);
        console.log(`Loaded ${sites.length} sites with recent data in view across ${Array.from(presentCodes).join(', ')}`);
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

  // Sync active codes to selected dataset
  useEffect(() => {
    setActiveCodes(DATASETS[selectedDataset]);
  }, [selectedDataset]);

  // Re-fetch on dataset change
  useEffect(() => {
    if (!map || !isLoaded) return;
    loadGaugeLocations();
  }, [selectedDataset, map, isLoaded, loadGaugeLocations]);

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

      {/* Markers */}
      {basicGaugeLocations.length > 0 && (
        <GaugeMarkers
          map={map}
          basicLocations={basicGaugeLocations}
          activeCodes={activeCodes}
          thresholds={thresholds}
        />
      )}
      
      {/* Header: search + mobile dataset trigger */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
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

        {/* Mobile: Dataset drawer trigger */}
        <div className="ml-3 md:hidden pointer-events-auto">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">Dataset</Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <div className="p-4 space-y-4">
                <div>
                  <div className="text-sm font-semibold mb-2">Dataset</div>
                  <RadioGroup value={selectedDataset} onValueChange={(v) => setSelectedDataset(v as any)}>
                    {(Object.keys(DATASETS) as DatasetKey[]).map((name) => {
                      const code = DATASETS[name][0];
                      const id = `ds-mobile-${code}`;
                      const disabled = datasetAvailability[name] === false;
                      return (
                        <div key={name} className="flex items-center gap-2 py-1">
                          <RadioGroupItem id={id} value={name} disabled={disabled} />
                          <Label htmlFor={id} className={disabled ? 'text-muted-foreground' : ''}>
                            {name} <span className="ml-1 text-xs text-muted-foreground">· {code}</span>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                {/* Legend (compact) */}
                <div>
                  <div className="text-sm font-semibold mb-2">Legend</div>
                  <div className="text-sm mb-1">{PARAM_LABEL[DATASETS[selectedDataset][0]] || selectedDataset}</div>
                  <div className="h-2 rounded" style={{ background: 'linear-gradient(to right, #d4f0ff, #4a90e2, #08306b)' }} />
                  {(() => {
                    const code = DATASETS[selectedDataset][0];
                    const t = thresholds[code];
                    const unit = unitsByCode[code] ? ` ${unitsByCode[code]}` : '';
                    const fmt = (n: number) => Number.isFinite(n) ? n.toLocaleString() : '—';
                    return t ? (
                      <div className="mt-1 text-xs text-muted-foreground">{`${fmt(t.min)} | ${fmt(t.q33)} | ${fmt(t.q66)} | ${fmt(t.max)}${unit}`}</div>
                    ) : null;
                  })()}
                </div>

                {/* Status */}
                <div aria-live="polite" className="text-xs text-muted-foreground">
                  {basicGaugeLocations.length > 0
                    ? `${basicGaugeLocations.length} gauges in view`
                    : `No gauges with latest ${selectedDataset} in view.`}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop left sidebar */}
      <div className="hidden md:block absolute top-24 left-4 z-10 w-80 pointer-events-none">
        <Card className="pointer-events-auto">
          <CardContent className="p-4 space-y-4">
            <div>
              <div className="text-sm font-semibold mb-2">Dataset</div>
              <RadioGroup value={selectedDataset} onValueChange={(v) => setSelectedDataset(v as any)}>
                {(Object.keys(DATASETS) as DatasetKey[]).map((name) => {
                  const code = DATASETS[name][0];
                  const id = `ds-${code}`;
                  const disabled = datasetAvailability[name] === false;
                  return (
                    <div key={name} className="flex items-center gap-2 py-1">
                      <RadioGroupItem id={id} value={name} disabled={disabled} />
                      <Label htmlFor={id} className={disabled ? 'text-muted-foreground' : ''}>
                        {name} <span className="ml-1 text-xs text-muted-foreground">· {code}</span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Legend (compact) */}
            <div>
              <div className="text-sm font-semibold mb-2">Legend</div>
              <div className="text-sm mb-1">{PARAM_LABEL[DATASETS[selectedDataset][0]] || selectedDataset}</div>
              <div className="h-2 rounded" style={{ background: 'linear-gradient(to right, #d4f0ff, #4a90e2, #08306b)' }} />
              {(() => {
                const code = DATASETS[selectedDataset][0];
                const t = thresholds[code];
                const unit = unitsByCode[code] ? ` ${unitsByCode[code]}` : '';
                const fmt = (n: number) => Number.isFinite(n) ? n.toLocaleString() : '—';
                return t ? (
                  <div className="mt-1 text-xs text-muted-foreground">{`${fmt(t.min)} | ${fmt(t.q33)} | ${fmt(t.q66)} | ${fmt(t.max)}${unit}`}</div>
                ) : null;
              })()}
            </div>

            {/* Status */}
            <div aria-live="polite" className="text-xs text-muted-foreground">
              {basicGaugeLocations.length > 0
                ? `${basicGaugeLocations.length} gauges in view`
                : `No gauges with latest ${selectedDataset} in view.`}
            </div>
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


    </div>
  );
};