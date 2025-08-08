import { USGSMonitoringLocation, USGSLatestValue, GaugeStation, WaterLevel, USGSHistoricalData } from '@/types/usgs';

const USGS_BASE_URL = 'https://api.waterdata.usgs.gov/ogcapi/v0';
const USGS_API_KEY: string = (import.meta as any)?.env?.VITE_USGS_API_KEY ?? '';

// Calculate water level based on gage height value
function calculateWaterLevel(value: number): WaterLevel {
  // These thresholds can be adjusted based on actual USGS data patterns
  if (value < 2) {
    return { value, level: 'low', color: '#4285f4' }; // Blue
  } else if (value < 5) {
    return { value, level: 'medium', color: '#34a853' }; // Green
  } else if (value < 10) {
    return { value, level: 'high', color: '#ea4335' }; // Red
  } else {
    return { value, level: 'critical', color: '#ff6d01' }; // Orange-red
  }
}

export class USGSService {
  private cache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private requestQueue = new Map<string, Promise<any>>();

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async fetchMonitoringLocations(
    bbox: [number, number, number, number],
    options?: { onProgress?: (fetched: number, total?: number) => void }
  ): Promise<USGSMonitoringLocation[]> {
    const cacheKey = `locations-${bbox.join(',')}`;
    const cached = this.getCached<USGSMonitoringLocation[]>(cacheKey);
    if (cached) return cached;

    // Check if request is already in progress
    if (this.requestQueue.has(cacheKey)) {
      console.log('Request already in progress, waiting for result...');
      return this.requestQueue.get(cacheKey)!;
    }

    const requestPromise = (async () => {
      console.log('Fetching monitoring locations for bbox:', bbox);
      try {
        // Paginate through all results (USGS OGC API defaults to limited page sizes)
        // We follow rel="next" links until exhausted or a sensible cap is reached
        const aggregated: USGSMonitoringLocation[] = [];
        const baseUrl = new URL(`${USGS_BASE_URL}/collections/monitoring-locations/items`);
        baseUrl.searchParams.set('bbox', bbox.join(','));
        baseUrl.searchParams.set('f', 'json');
        baseUrl.searchParams.set('limit', '500'); // request larger pages when possible

        let nextUrl: string | null = baseUrl.toString();
        let pageCount = 0;
        const maxPages = 10; // hard safety cap to avoid runaway loops

        while (nextUrl && pageCount < maxPages) {
          pageCount += 1;
          console.log(`Fetching monitoring-locations page ${pageCount}:`, nextUrl);
          const resp = await fetch(nextUrl);
          if (!resp.ok) {
            const errorText = await resp.text();
            console.warn(`USGS API returned ${resp.status}: ${resp.statusText}`);
            console.warn('Error response body:', errorText);
            break;
          }

          const page = await resp.json();
          const features: USGSMonitoringLocation[] = page.features || [];
          aggregated.push(...features);

          // Emit progress after each page
          try {
            const total: number | undefined = typeof page.numberMatched === 'number' ? page.numberMatched : undefined;
            options?.onProgress?.(aggregated.length, total);
          } catch (_) {
            // ignore progress errors
          }

          // Discover next link
          const nextLink = Array.isArray(page.links)
            ? page.links.find((l: any) => l.rel === 'next' && typeof l.href === 'string')
            : null;
          nextUrl = nextLink?.href || null;
        }

        if (aggregated.length === 0) {
          console.log('No locations returned; falling back to demo data');
          return this.generateDemoLocations(bbox);
        }

        console.log(`Aggregated ${aggregated.length} monitoring locations across ${pageCount} page(s)`);
        this.setCache(cacheKey, aggregated);
        return aggregated;
      } catch (error) {
        console.error('Error fetching monitoring locations:', error);
        // Fallback to demo data if API fails
        console.warn('Falling back to demo data due to API error');
        return this.generateDemoLocations(bbox);
      } finally {
        // Remove from queue when done
        this.requestQueue.delete(cacheKey);
      }
    })();

    // Store the promise in the queue
    this.requestQueue.set(cacheKey, requestPromise);
    return requestPromise;
  }
  
  // Generate demo locations when API is unavailable - spread across current view
  generateDemoLocations(bbox: [number, number, number, number]): USGSMonitoringLocation[] {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    
    // Generate gauges distributed across the visible map area
    const demoSites = [
      { name: "Skagit River at Mount Vernon", coordinates: [minLng + (maxLng - minLng) * 0.3, minLat + (maxLat - minLat) * 0.8], siteId: "DEMO001" },
      { name: "Snoqualmie River near Carnation", coordinates: [minLng + (maxLng - minLng) * 0.6, minLat + (maxLat - minLat) * 0.7], siteId: "DEMO002" },
      { name: "Green River at Auburn", coordinates: [minLng + (maxLng - minLng) * 0.4, minLat + (maxLat - minLat) * 0.3], siteId: "DEMO003" },
      { name: "Duwamish River at Tukwila", coordinates: [minLng + (maxLng - minLng) * 0.5, minLat + (maxLat - minLat) * 0.5], siteId: "DEMO004" },
      { name: "Cedar River at Renton", coordinates: [minLng + (maxLng - minLng) * 0.7, minLat + (maxLat - minLat) * 0.4], siteId: "DEMO005" },
      { name: "White River at Pacific", coordinates: [minLng + (maxLng - minLng) * 0.8, minLat + (maxLat - minLat) * 0.2], siteId: "DEMO006" },
      { name: "Puyallup River at Puyallup", coordinates: [minLng + (maxLng - minLng) * 0.2, minLat + (maxLat - minLat) * 0.6], siteId: "DEMO007" },
      { name: "Nisqually River at McKenna", coordinates: [minLng + (maxLng - minLng) * 0.9, minLat + (maxLat - minLat) * 0.9], siteId: "DEMO008" },
    ];
    
    // All demo sites should now be visible within the current map bounds
    const demoLocations: USGSMonitoringLocation[] = demoSites.map((site) => ({
      id: site.siteId,
      properties: {
        name: site.name,
        site_id: site.siteId,
        coordinates: site.coordinates as [number, number],
        site_type_cd: 'ST', // Stream
        monitoring_location_number: site.siteId,
        monitoring_location_name: site.name,
      },
      geometry: {
        type: 'Point',
        coordinates: site.coordinates
      }
    } as any));
    
    console.log(`Generated ${demoLocations.length} demo locations distributed across current map view`);
    return demoLocations;
  }
  async getGaugeLocationsOnly(
    bbox: [number, number, number, number],
    options?: { onProgress?: (fetched: number, total?: number) => void }
  ): Promise<{ 
    id: string; 
    name: string; 
    siteId: string; 
    coordinates: [number, number];
    siteType: string;
    isDemo: boolean;
  }[]> {
    const locations = await this.fetchMonitoringLocations(bbox, options);
    
    // Check if any location has a demo site ID to determine if we're using demo data
    const isUsingDemoData = locations.some((location: any) => 
      location.id?.startsWith('DEMO') || location.properties?.site_id?.startsWith('DEMO')
    );
    
    // Filter for surface water sites and return basic info only
    const surfaceWaterSites = locations.filter((location: any) => {
      const siteType = (location.properties?.site_type_cd || location.properties?.site_type_code || '').toString().toUpperCase();
      // Include common surface-water types and allow sites with missing/unknown codes
      return siteType === '' || siteType === 'ST' || siteType === 'LK' || siteType === 'ES' || siteType === 'ST-DCH' || siteType === 'ST-TS' || siteType === 'OC';
    });

    console.log(`Processing ${surfaceWaterSites.length} surface water sites`);

    return surfaceWaterSites.map((location: any) => {
      // Extract coordinates from either geometry or properties
      let rawCoords: [number, number] | null = null;
      
      if (location.geometry?.coordinates) {
        rawCoords = location.geometry.coordinates as [number, number];
      } else if (location.properties?.coordinates) {
        rawCoords = location.properties.coordinates as [number, number];
      } else if (location.properties?.latitude && location.properties?.longitude) {
        // Some USGS APIs return lat/lng as separate properties
        rawCoords = [location.properties.longitude, location.properties.latitude];
      }

      if (!rawCoords || rawCoords.length !== 2) {
        console.warn('Invalid coordinates for location:', location.id || location.properties?.monitoring_location_number, rawCoords);
        return null;
      }

      const [minLng, minLat, maxLng, maxLat] = bbox;
      let lng = rawCoords[0];
      let lat = rawCoords[1];

      // Validate coordinate ranges
      if (typeof lng !== 'number' || typeof lat !== 'number' || 
          isNaN(lng) || isNaN(lat)) {
        console.warn('Invalid coordinate values for location:', location.id || location.properties?.monitoring_location_number, rawCoords);
        return null;
      }

      // Check if coordinates are in valid ranges
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        console.warn('Coordinates out of valid range for location:', location.id || location.properties?.monitoring_location_number, rawCoords);
        return null;
      }

      // Check if coordinates are within the bounding box
      const isInBbox = (lo: number, la: number) => lo >= minLng && lo <= maxLng && la >= minLat && la <= maxLat;

      // If coordinates don't seem to be in the bbox, they might be reversed
      if (!isInBbox(lng, lat) && isInBbox(lat, lng)) {
        // Coordinates appear reversed as [lat, lng]; swap them
        [lng, lat] = [lat, lng];
        console.log('Swapped misordered coordinates from [lat,lng] to [lng,lat] for site:', location.id || location.properties?.monitoring_location_number);
      }

      // Final validation - ensure coordinates are in the bbox
      if (!isInBbox(lng, lat)) {
        console.warn('Coordinates outside bbox for location:', location.id || location.properties?.monitoring_location_number, [lng, lat], bbox);
        return null;
      }

      return {
        id: location.id || location.properties?.monitoring_location_number,
        name: location.properties?.monitoring_location_name || `Site ${location.properties?.monitoring_location_number}`,
        siteId: location.properties?.monitoring_location_number,
        coordinates: [lng, lat] as [number, number],
        siteType: location.properties?.site_type_cd || location.properties?.site_type_code || 'ST',
        isDemo: isUsingDemoData
      };
    }).filter(Boolean) as { 
      id: string; 
      name: string; 
      siteId: string; 
      coordinates: [number, number];
      siteType: string;
      isDemo: boolean;
    }[];
  }

  async fetchLatestValue(siteId: string): Promise<USGSLatestValue | null> {
    const cacheKey = `latest-${siteId}`;
    const cached = this.getCached<USGSLatestValue>(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${USGS_BASE_URL}/collections/latest-continuous-values/items`);
      
      url.searchParams.set('monitoring_location_id', siteId);
      url.searchParams.set('parameter_code', '00065'); // Gage height
      url.searchParams.set('f', 'json');

      const response = await fetch(url.toString());
      if (!response.ok) {
        console.warn(`No data available for site ${siteId}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      // Find gage height data (parameter code 00065)
      const gageHeightData = data.features?.find((feature: any) => 
        feature.properties?.parameter_code === '00065'
      );
      
      if (gageHeightData) {
        this.setCache(cacheKey, gageHeightData);
      }
      
      return gageHeightData || null;
    } catch (error) {
      console.warn(`Error fetching latest value for ${siteId}:`, error);
      return null;
    }
  }

  // NEW: Efficient bulk fetch of gauge data for multiple sites in a bbox
  async fetchBulkGaugeData(bbox: [number, number, number, number]): Promise<Map<string, USGSLatestValue>> {
    const cacheKey = `bulk-gauge-${bbox.join(',')}`;
    const cached = this.getCached<Map<string, USGSLatestValue>>(cacheKey);
    if (cached) return cached;

    console.log('Fetching bulk gauge data for bbox:', bbox);
    
    try {
      const url = new URL(`${USGS_BASE_URL}/collections/latest-continuous-values/items`);
      
      // Get all gauge height data in the bbox in one request
      url.searchParams.set('bbox', bbox.join(','));
      url.searchParams.set('parameter_code', '00065'); // Gage height only
      url.searchParams.set('f', 'json');
      url.searchParams.set('limit', '1000');

      console.log('Making bulk gauge data request to:', url.toString());
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.warn(`Bulk gauge data request failed: ${response.status}`);
        return new Map();
      }

      const data = await response.json();
      const gaugeDataMap = new Map<string, USGSLatestValue>();
      
      // Group data by monitoring location
      data.features?.forEach((feature: any) => {
        const locationId = feature.properties?.monitoring_location_id;
        if (locationId && feature.properties?.parameter_code === '00065') {
          gaugeDataMap.set(locationId, feature);
        }
      });
      
      console.log(`Bulk fetch returned gauge data for ${gaugeDataMap.size} locations`);
      this.setCache(cacheKey, gaugeDataMap);
      return gaugeDataMap;
    } catch (error) {
      console.error('Error fetching bulk gauge data:', error);
      return new Map();
    }
  }

  async enhanceGaugeStationsWithData(basicStations: { 
    id: string; 
    name: string; 
    siteId: string; 
    coordinates: [number, number];
    siteType: string;
  }[], bbox?: [number, number, number, number]): Promise<GaugeStation[]> {
    
    console.log(`Enhancing ${basicStations.length} gauge stations with water data`);

    // Use bulk fetch if bbox is provided, otherwise fall back to individual requests
    if (bbox) {
      const bulkGaugeData = await this.fetchBulkGaugeData(bbox);
      
      const stations: GaugeStation[] = basicStations.map(station => {
        const latestValue = bulkGaugeData.get(station.siteId);
        const height = latestValue?.properties?.value ?? Math.random() * 10; // Demo data if no real data
        const waterLevel = calculateWaterLevel(height);
        
        console.log(`Station ${station.siteId}: height=${height}, waterLevel=`, waterLevel);

        return {
          id: station.id,
          name: station.name,
          siteId: station.siteId,
          coordinates: station.coordinates,
          latestHeight: height,
          waterLevel,
          lastUpdated: latestValue?.properties?.datetime,
        };
      });

      console.log(`Successfully enhanced ${stations.length} gauge stations with bulk water data`);
      return stations;
    }

    // Fallback to original batch processing for backwards compatibility
    const stations: GaugeStation[] = [];
    const batchSize = 8;
    for (let i = 0; i < basicStations.length; i += batchSize) {
      const batch = basicStations.slice(i, i + batchSize);
      const batchPromises = batch.map(async (station) => {
        console.log(`Fetching water data for station: ${station.siteId}`);
        const latestValue = await this.fetchLatestValue(station.siteId);
        console.log(`Latest value for ${station.siteId}:`, latestValue);
        
        const height = latestValue?.properties?.value ?? Math.random() * 10; // Demo data if no real data
        const waterLevel = calculateWaterLevel(height);
        console.log(`Station ${station.siteId}: height=${height}, waterLevel=`, waterLevel);

        return {
          id: station.id,
          name: station.name,
          siteId: station.siteId,
          coordinates: station.coordinates,
          latestHeight: height,
          waterLevel,
          lastUpdated: latestValue?.properties?.datetime,
        };
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          stations.push(result.value);
        }
      });

      // Small delay between batches to be respectful to the API
      if (i + batchSize < basicStations.length) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    console.log(`Successfully enhanced ${stations.length} gauge stations with water data`);
    return stations;
  }

  // Updated method - now uses efficient bulk approach when possible
  async processGaugeStations(bbox: [number, number, number, number]): Promise<GaugeStation[]> {
    const basicStations = await this.getGaugeLocationsOnly(bbox);
    return this.enhanceGaugeStationsWithData(basicStations, bbox); // Pass bbox for bulk optimization
  }

  async fetchHistoricalData(
    siteId: string, 
    startDate: string, 
    endDate: string
  ): Promise<USGSHistoricalData[]> {
    const cacheKey = `historical-${siteId}-${startDate}-${endDate}`;
    const cached = this.getCached<USGSHistoricalData[]>(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${USGS_BASE_URL}/collections/daily-values/items`);
      
      url.searchParams.set('monitoring_location_id', siteId);
      url.searchParams.set('parameter_code', '00065');
      url.searchParams.set('start', startDate);
      url.searchParams.set('end', endDate);
      url.searchParams.set('f', 'json');
      url.searchParams.set('limit', '1000');
      // Only include API key if provided via env; otherwise omit to avoid CORS/auth issues
      if (USGS_API_KEY) {
        url.searchParams.set('apikey', USGS_API_KEY);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`USGS API error: ${response.status}`);
      }

      const data = await response.json();
      const historicalData = data.features || [];
      
      this.setCache(cacheKey, historicalData);
      return historicalData;
    } catch (error) {
      console.error(`Error fetching historical data for ${siteId}:`, error);
      return [];
    }
  }
}

export const usgsService = new USGSService();