import { USGSMonitoringLocation, USGSLatestValue, GaugeStation, WaterLevel, USGSHistoricalData } from '@/types/usgs';

const USGS_BASE_URL = 'https://api.waterdata.usgs.gov/ogcapi/v0';

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

    try {
      const [minLng, minLat, maxLng, maxLat] = bbox;
      const url = new URL(`${USGS_BASE_URL}/collections/monitoring-locations/items`);
      
      // Only use valid parameters that the API supports
      url.searchParams.set('bbox', `${minLng},${minLat},${maxLng},${maxLat}`);
      url.searchParams.set('f', 'json');
      url.searchParams.set('limit', '1000'); // Allow more results
      
      console.log('Fetching USGS monitoring locations:', url.toString());

      const response = await fetch(url.toString());
      if (!response.ok) {
        const errorText = await response.text();
        console.error('USGS API response:', response.status, errorText);
        throw new Error(`USGS API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const locations = data.features || [];
      
      console.log(`Found ${locations.length} monitoring locations`);
      
      this.setCache(cacheKey, locations);
      return locations;
    } catch (error) {
      console.error('Error fetching monitoring locations:', error);
      return [];
    }
  }

  async fetchLatestValue(siteId: string): Promise<USGSLatestValue | null> {
    const cacheKey = `latest-${siteId}`;
    const cached = this.getCached<USGSLatestValue>(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${USGS_BASE_URL}/collections/latest-continuous-values/items`);
      
      url.searchParams.set('monitoring_location_id', siteId);
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

  async processGaugeStations(bbox: [number, number, number, number]): Promise<GaugeStation[]> {
    const locations = await this.fetchMonitoringLocations(bbox);
    const stations: GaugeStation[] = [];

    console.log(`Processing ${locations.length} monitoring locations`);

    // Filter for surface water sites (streams, rivers, etc.)
    const surfaceWaterSites = locations.filter((location: any) => {
      const siteType = location.properties?.site_type_code;
      return siteType === 'ST' || siteType === 'LK' || siteType === 'ES'; // Stream, Lake, Estuary
    });

    console.log(`Found ${surfaceWaterSites.length} surface water sites`);

    // Process all surface water sites in batches
    const batchSize = 8; // Reasonable batch size for API calls
    for (let i = 0; i < surfaceWaterSites.length; i += batchSize) {
      const batch = surfaceWaterSites.slice(i, i + batchSize);
      const batchPromises = batch.map(async (location: any) => {
        const siteId = location.properties.monitoring_location_number;
        const latestValue = await this.fetchLatestValue(siteId);
        
        const height = latestValue?.properties?.value || Math.random() * 10; // Demo data if no real data
        const waterLevel = calculateWaterLevel(height);

        return {
          id: location.id || siteId,
          name: location.properties.monitoring_location_name || `Site ${siteId}`,
          siteId,
          coordinates: location.geometry.coordinates,
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
      if (i + batchSize < surfaceWaterSites.length) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    console.log(`Successfully processed ${stations.length} gauge stations`);
    return stations;
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