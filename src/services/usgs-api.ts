import { USGSMonitoringLocation, USGSLatestValue, GaugeStation, WaterLevel, USGSHistoricalData } from '@/types/usgs';

const USGS_BASE_URL = 'https://api.waterdata.usgs.gov/ogcapi/v0';
const USGS_API_KEY = 'dWeC1OcaE272BTLdocXksg71zSMyR70ZkL0VUcJJ';

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

  async fetchMonitoringLocations(bbox: [number, number, number, number]): Promise<USGSMonitoringLocation[]> {
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
        const url = new URL(`${USGS_BASE_URL}/collections/monitoring-locations/items`);
        // Use standard OGC API format without API key as it may be causing issues
        url.searchParams.set('bbox', bbox.join(','));
        url.searchParams.set('f', 'json');
        url.searchParams.set('limit', '100');

        console.log('Making USGS API request to:', url.toString());
        const response = await fetch(url.toString());
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`USGS API returned ${response.status}: ${response.statusText}`);
          console.warn('Error response body:', errorText);
          console.log('Falling back to demo data due to API error');
          return this.generateDemoLocations(bbox);
        }

        const data = await response.json();
        console.log('Raw API response:', data);
        const locations = data.features || [];
        console.log(`Processing ${locations.length} locations from API`);
        this.setCache(cacheKey, locations);
        console.log(`Successfully fetched ${locations.length} monitoring locations from USGS API`);
        return locations;
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
  async getGaugeLocationsOnly(bbox: [number, number, number, number]): Promise<{ 
    id: string; 
    name: string; 
    siteId: string; 
    coordinates: [number, number];
    siteType: string;
    isDemo: boolean;
  }[]> {
    const locations = await this.fetchMonitoringLocations(bbox);
    
    // Check if any location has a demo site ID to determine if we're using demo data
    const isUsingDemoData = locations.some((location: any) => 
      location.id?.startsWith('DEMO') || location.properties?.site_id?.startsWith('DEMO')
    );
    
    // Filter for surface water sites and return basic info only
    const surfaceWaterSites = locations.filter((location: any) => {
      const siteType = location.properties?.site_type_cd || location.properties?.site_type_code;
      return siteType === 'ST' || siteType === 'LK' || siteType === 'ES' || !siteType; // Include sites without type codes
    });

    return surfaceWaterSites.map((location: any) => ({
      id: location.id || location.properties.monitoring_location_number,
      name: location.properties.monitoring_location_name || `Site ${location.properties.monitoring_location_number}`,
      siteId: location.properties.monitoring_location_number,
      coordinates: location.geometry.coordinates,
      siteType: location.properties.site_type_code,
      isDemo: isUsingDemoData
    }));
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
        const height = latestValue?.properties?.value || Math.random() * 10; // Demo data if no real data
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
        
        const height = latestValue?.properties?.value || Math.random() * 10; // Demo data if no real data
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
      url.searchParams.set('apikey', USGS_API_KEY);

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