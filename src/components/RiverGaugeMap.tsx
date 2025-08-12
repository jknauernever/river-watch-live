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
import { DATASETS, DatasetKey, PARAM_LABEL, COLOR_BY_CODE, computeThresholds, legendTicks } from '@/lib/datasets';
import InfoPopover from '@/components/InfoPopover';
import { DATASET_INFO_HTML } from '@/constants/datasetInfo';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';



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
  const [thresholds, setThresholds] = useState<Record<string, any>>({});
  const [availableCodes, setAvailableCodes] = useState<Set<string>>(new Set());
  const [unitsByCode, setUnitsByCode] = useState<Record<string, string | undefined>>({});
  const availabilityTimerRef = useRef<number | null>(null);
  const availabilityCacheRef = useRef<Map<string, { timestamp: number; result: Record<DatasetKey, boolean> }>>(new Map());
  
  const requestIdRef = useRef(0);
  const [debugInfo, setDebugInfo] = useState<{ bbox: [number, number, number, number]; preflight?: { numberReturned?: number; elapsedMs?: number; exceeds?: boolean }; full?: { total: number; pages: number; elapsedMs: number; capped: boolean } | null; running: boolean; match?: { stations: number; matched: number } } | null>(null);
  const preflightPendingRef = useRef(false);
  
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

  // Check availability of each dataset within the bbox (debounced + cached)
  const updateDatasetAvailability = useCallback(async (bbox: [number, number, number, number], signal?: AbortSignal) => {
    try {
      const key = bbox.join(',');
      const ttl = 30_000; // 30s
      const cached = availabilityCacheRef.current.get(key);
      if (cached && Date.now() - cached.timestamp < ttl) {
        setDatasetAvailability(prev => ({ ...prev, ...cached.result }));
        if (!cached.result[selectedDataset]) {
          const firstEnabled = (Object.keys(DATASETS) as DatasetKey[]).find(k => cached.result[k]);
          if (firstEnabled && firstEnabled !== selectedDataset) setSelectedDataset(firstEnabled);
        }
        return;
      }

      const entries = Object.entries(DATASETS) as [DatasetKey, string[]][];
      const results = await Promise.all(entries.map(async ([name, codes]) => {
        if (signal?.aborted) return [name, false] as const;
        try {
          const m = await usgsService.fetchBulkGaugeData(bbox, { parameterCodes: codes, limit: 1, signal });
          return [name, m.size > 0] as const;
        } catch {
          return [name, false] as const;
        }
      }));

      if (signal?.aborted) return;
      const resultObj: Record<DatasetKey, boolean> = {} as any;
      results.forEach(([name, ok]) => { (resultObj as any)[name] = ok; });

      availabilityCacheRef.current.set(key, { timestamp: Date.now(), result: resultObj });
      setDatasetAvailability(prev => ({ ...prev, ...resultObj }));
      if (!resultObj[selectedDataset]) {
        const firstEnabled = (Object.keys(DATASETS) as DatasetKey[]).find(k => resultObj[k]);
        if (firstEnabled && firstEnabled !== selectedDataset) setSelectedDataset(firstEnabled);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.warn('updateDatasetAvailability failed', e);
    }
  }, [selectedDataset]);

  const updateDatasetAvailabilityDebounced = useCallback((bbox: [number, number, number, number], signal?: AbortSignal) => {
    if (availabilityTimerRef.current) {
      clearTimeout(availabilityTimerRef.current as any);
    }
    availabilityTimerRef.current = window.setTimeout(() => {
      updateDatasetAvailability(bbox, signal);
    }, 800);
  }, [updateDatasetAvailability]);

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

        // Update dataset availability in the background (debounced)
        updateDatasetAvailabilityDebounced(bbox, abortController.signal);

        const codes = DATASETS[selectedDataset];
        const bulkMap = await usgsService.fetchBulkGaugeData(bbox, {
          parameterCodes: codes,
          limit: 10000,
          signal: abortController.signal,
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

          let value = Number(props.value ?? props.result);
          if (!Number.isFinite(value)) continue;
          let unit = props.unit || props.unit_of_measurement || props.unit_of_measure || undefined;
          const time = props.time || props.datetime || props.result_time || undefined;
          const label = props.parameter_name || props.observed_property_name || undefined;

          // Normalize stage (00065) to feet
          if (code === '00065') {
            const u = (unit || '').toLowerCase();
            if (u === 'm' || u === 'meter' || u === 'metre' || u === 'meters') { value = value * 3.28084; unit = 'ft'; }
            else if (u === 'cm' || u === 'centimeter' || u === 'centimeters') { value = value / 30.48; unit = 'ft'; }
            else if (u === 'mm' || u === 'millimeter' || u === 'millimeters') { value = value / 304.8; unit = 'ft'; }
            else if (!u) {
              if (value > 200 && value < 20000) { value = value / 30.48; unit = 'ft'; }
            }
          }

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

        // Build thresholds for the single active code
        const code = codes[0];
        const values: number[] = [];
        for (const site of featuresBySite.values()) {
          const p = site.params.find(x => x.code === code);
          if (p && Number.isFinite(p.value)) values.push(p.value);
        }
const t = computeThresholds(values);
const th: Record<string, any> = t
  ? { [code]: { q33: t.q33, q66: t.q66, q90: t.q90, min: t.min, max: t.max } }
  : {};

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
   }, [map, selectedDataset]);

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

      {/* Loading overlay to prevent white screen */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-md bg-background/80 backdrop-blur-sm px-3 py-2 text-sm">
            Loading map…
          </div>
        </div>
      )}

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
            <SheetContent side="left" className="w-72 p-0">
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
                          <div className="flex items-center">
                            <Label htmlFor={id} className={disabled ? 'text-muted-foreground' : ''}>{name}</Label>
                            <InfoPopover title={name} html={DATASET_INFO_HTML[name] || "No description yet."} side="right" />
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                {/* Legend (compact) */}
                <div>
                  <div className="text-sm font-semibold mb-2">Legend</div>
                  <div className="text-sm mb-1">{PARAM_LABEL[DATASETS[selectedDataset][0]] || selectedDataset}</div>
                  {(() => {
                    const code = DATASETS[selectedDataset][0];
                    if (code === '00065') {
                      const colors = (COLOR_BY_CODE['00065']?.colors as any) || {};
                      return (
                        <div className="w-48">
                          <div className="grid grid-cols-2 gap-1 items-center">
                            <div className="flex items-center gap-1">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colors.low }} />
                              <span className="text-xs">Low</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colors.med }} />
                              <span className="text-xs">Med</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colors.high }} />
                              <span className="text-xs">High</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colors.extreme || colors.high }} />
                              <span className="text-xs">Extreme</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const colors = COLOR_BY_CODE[code]?.colors || { low:'#d4f0ff', med:'#4a90e2', high:'#08306b' };
                    const gradient = `linear-gradient(to right, ${colors.low}, ${colors.med}, ${colors.high})`;
                    const t = thresholds[code];
                    const unit = unitsByCode[code] ? ` ${unitsByCode[code]}` : '';
                    return (
                      <>
                        <div className="h-2 rounded w-48" style={{ background: gradient }} />
                        {t ? (
                          <div className="mt-1 text-xs text-muted-foreground">{legendTicks({ min:t.min, q33:t.q33, q66:t.q66, max:t.max }, unit)}</div>
                        ) : null}
                      </>
                    );
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
      <div className="hidden md:block absolute top-24 left-4 z-10 w-64 pointer-events-none">
        <Card className="pointer-events-auto">
          <CardContent className="p-4">
            <Collapsible defaultOpen>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Dataset</div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="px-2">Toggle</Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-4 pt-2">
                <div>
                  <RadioGroup value={selectedDataset} onValueChange={(v) => setSelectedDataset(v as any)}>
                    {(Object.keys(DATASETS) as DatasetKey[]).map((name) => {
                      const code = DATASETS[name][0];
                      const id = `ds-${code}`;
                      const disabled = datasetAvailability[name] === false;
                      return (
                        <div key={name} className="flex items-center gap-2 py-1">
                          <RadioGroupItem id={id} value={name} disabled={disabled} />
                          <div className="flex items-center">
                            <Label htmlFor={id} className={disabled ? 'text-muted-foreground' : ''}>{name}</Label>
                            <InfoPopover title={name} html={DATASET_INFO_HTML[name] || "No description yet."} side="right" />
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                {/* Legend (compact) */}
                <div>
                  <div className="text-sm font-semibold mb-2">Legend</div>
                  <div className="text-sm mb-1">{PARAM_LABEL[DATASETS[selectedDataset][0]] || selectedDataset}</div>
                  {(() => {
                    const code = DATASETS[selectedDataset][0];
                    if (code === '00065') {
                      const colors = (COLOR_BY_CODE['00065']?.colors as any) || {};
                      return (
                        <div className="w-48">
                          <div className="grid grid-cols-2 gap-1 items-center">
                            <div className="flex items-center gap-1">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colors.low }} />
                              <span className="text-xs">Low</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colors.med }} />
                              <span className="text-xs">Med</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colors.high }} />
                              <span className="text-xs">High</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colors.extreme || colors.high }} />
                              <span className="text-xs">Extreme</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const colors = COLOR_BY_CODE[code]?.colors || { low:'#d4f0ff', med:'#4a90e2', high:'#08306b' };
                    const gradient = `linear-gradient(to right, ${colors.low}, ${colors.med}, ${colors.high})`;
                    const t = thresholds[code];
                    const unit = unitsByCode[code] ? ` ${unitsByCode[code]}` : '';
                    return (
                      <>
                        <div className="h-2 rounded w-48" style={{ background: gradient }} />
                        {t ? (
                          <div className="mt-1 text-xs text-muted-foreground">{legendTicks({ min:t.min, q33:t.q33, q66:t.q66, max:t.max }, unit)}</div>
                        ) : null}
                      </>
                    );
                  })()}

                </div>

                {/* Status */}
                <div aria-live="polite" className="text-xs text-muted-foreground">
                  {basicGaugeLocations.length > 0
                    ? `${basicGaugeLocations.length} gauges in view`
                    : `No gauges with latest ${selectedDataset} in view.`}
                </div>
              </CollapsibleContent>
            </Collapsible>
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