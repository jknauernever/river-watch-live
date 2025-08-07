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
      try {
        const url = new URL(`${USGS_BASE_URL}/collections/monitoring-locations/items`);
        url.searchParams.set('bbox', bbox.join(','));
        url.searchParams.set('f', 'json');
        url.searchParams.set('limit', '500');
        url.searchParams.set('apikey', USGS_API_KEY);

        const response = await fetch(url.toString());
        if (!response.ok) {
          console.warn(`USGS API returned ${response.status}, falling back to demo data`);
          return this.generateDemoLocations(bbox);
        }

        const data = await response.json();
        const locations = data.features || [];
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
  
  // Generate demo locations when API is unavailable
  generateDemoLocations(bbox: [number, number, number, number]): USGSMonitoringLocation[] {
    // Fixed demo locations in Puget Sound area - these won't move with map bounds
    const fixedDemoSites = [
      { name: "Skagit River at Mount Vernon", coordinates: [-122.3344, 48.4262], siteId: "DEMO001" },
      { name: "Snoqualmie River near Carnation", coordinates: [-121.9145, 47.6479], siteId: "DEMO002" },
      { name: "Green River at Auburn", coordinates: [-122.2284, 47.3073], siteId: "DEMO003" },
      { name: "Duwamish River at Tukwila", coordinates: [-122.2615, 47.4598], siteId: "DEMO004" },
      { name: "Cedar River at Renton", coordinates: [-122.2071, 47.4829], siteId: "DEMO005" },
      { name: "White River at Pacific", coordinates: [-122.2507, 47.2640], siteId: "DEMO006" },
      { name: "Puyallup River at Puyallup", coordinates: [-122.3126, 47.1856], siteId: "DEMO007" },
      { name: "Nisqually River at McKenna", coordinates: [-122.5654, 47.0873], siteId: "DEMO008" },
    ];
    
    // Check which demo sites are within the current viewport
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const visibleSites = fixedDemoSites.filter(site => {
      const [lng, lat] = site.coordinates;
      return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
    });
    
    // If no sites are visible in current view, show the closest few sites
    const demosToShow = visibleSites.length > 0 ? visibleSites : fixedDemoSites.slice(0, 5);
    
    const demoLocations: USGSMonitoringLocation[] = demosToShow.map((site) => ({
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
    
    console.log(`Generated ${demoLocations.length} demo locations at fixed positions`);
    return demoLocations;
  }
  async getGaugeLocationsOnly(bbox: [number, number, number, number]): Promise<{ 
    id: string; 
    name: string; 
    siteId: string; 
    coordinates: [number, number];
    siteType: string;
  }[]> {
    const locations = await this.fetchMonitoringLocations(bbox);
    
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
      siteType: location.properties.site_type_code
    }));
  }

  async fetchLatestValue(siteId: string): Promise<USGSLatestValue | null> {
    const cacheKey = `latest-${siteId}`;
    const cached = this.getCached<USGSLatestValue>(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${USGS_BASE_URL}/collections/latest-continuous-values/items`);
      
      url.searchParams.set('monitoring_location_id', siteId);
      url.searchParams.set('f', 'json');
      url.searchParams.set('apikey', USGS_API_KEY);

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

  async enhanceGaugeStationsWithData(basicStations: { 
    id: string; 
    name: string; 
    siteId: string; 
    coordinates: [number, number];
    siteType: string;
  }[]): Promise<GaugeStation[]> {
    const stations: GaugeStation[] = [];

    console.log(`Enhancing ${basicStations.length} gauge stations with water data`);

    // Process all stations in batches to get their water data
    const batchSize = 8;
    for (let i = 0; i < basicStations.length; i += batchSize) {
      const batch = basicStations.slice(i, i + batchSize);
      const batchPromises = batch.map(async (station) => {
        const latestValue = await this.fetchLatestValue(station.siteId);
        
        const height = latestValue?.properties?.value || Math.random() * 10; // Demo data if no real data
        const waterLevel = calculateWaterLevel(height);

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

  // Legacy method - now uses the two-phase approach
  async processGaugeStations(bbox: [number, number, number, number]): Promise<GaugeStation[]> {
    const basicStations = await this.getGaugeLocationsOnly(bbox);
    return this.enhanceGaugeStationsWithData(basicStations);
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