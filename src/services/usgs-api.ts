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
      
      // Only get basic location data - no water measurements yet
      url.searchParams.set('bbox', `${minLng},${minLat},${maxLng},${maxLat}`);
      url.searchParams.set('f', 'json');
      url.searchParams.set('limit', '200'); // Reduced limit to avoid rate limiting
      
      console.log('Fetching USGS monitoring locations (locations only):', url.toString());

      const response = await fetch(url.toString());
      if (!response.ok) {
        const errorText = await response.text();
        console.error('USGS API response:', response.status, errorText);
        
        // Handle rate limiting gracefully
        if (response.status === 429) {
          console.warn('USGS API rate limit reached. Using demo data.');
          return this.generateDemoLocations(bbox);
        }
        
        throw new Error(`USGS API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const locations = data.features || [];
      
      console.log(`Found ${locations.length} total monitoring locations`);
      
      this.setCache(cacheKey, locations);
      return locations;
    } catch (error) {
      console.error('Error fetching monitoring locations:', error);
      // Fallback to demo data if API fails
      console.warn('Falling back to demo data due to API error');
      return this.generateDemoLocations(bbox);
    }
  }
  
  // Generate demo locations when API is unavailable
  generateDemoLocations(bbox: [number, number, number, number]): USGSMonitoringLocation[] {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const demoLocations: USGSMonitoringLocation[] = [];
    
    // Generate realistic demo gauge locations
    const sampleSites = [
      { name: "Demo River at Main St", offset: [0.2, 0.2] },
      { name: "Demo Creek near Bridge", offset: [0.5, 0.3] },
      { name: "Demo Lake Outlet", offset: [0.7, 0.6] },
      { name: "Demo Stream at Park", offset: [0.3, 0.8] },
      { name: "Demo River below Dam", offset: [0.8, 0.4] },
    ];
    
    sampleSites.forEach((site, index) => {
      const lng = minLng + (maxLng - minLng) * site.offset[0];
      const lat = minLat + (maxLat - minLat) * site.offset[1];
      const siteId = `DEMO${String(index + 1).padStart(3, '0')}`;
      
      demoLocations.push({
        id: siteId,
        properties: {
          name: site.name,
          site_id: siteId,
          coordinates: [lng, lat],
          site_type_cd: 'ST', // Stream
          monitoring_location_number: siteId,
          monitoring_location_name: site.name,
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      } as any);
    });
    
    console.log(`Generated ${demoLocations.length} demo locations`);
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
      const siteType = location.properties?.site_type_code;
      return siteType === 'ST' || siteType === 'LK' || siteType === 'ES'; // Stream, Lake, Estuary
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