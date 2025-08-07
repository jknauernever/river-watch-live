import { useEffect, useRef, useState, useCallback } from 'react';
import { GaugeStation } from '@/types/usgs';
import { usgsService } from '@/services/usgs-api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Droplets } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RiverGaugeMapProps {
  apiKey: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export const RiverGaugeMap = ({ apiKey }: RiverGaugeMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [stations, setStations] = useState<GaugeStation[]>([]);
  const [basicGaugeLocations, setBasicGaugeLocations] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<GaugeStation | null>(null);
  const [showRiverData, setShowRiverData] = useState(false); // Start with just locations
  const { toast } = useToast();

  const loadGoogleMapsScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps && window.google.maps.Map) {
        console.log('Google Maps already loaded');
        resolve(window.google);
        return;
      }

      // Remove any existing script to avoid conflicts
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      // Set up global callback
      window.initGoogleMaps = () => {
        console.log('Google Maps loaded successfully');
        resolve(window.google);
      };
      
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
  }, [apiKey]);

  const createBasicMarker = useCallback((location: any, map: any) => {
    const { google } = window;
    
    const marker = new google.maps.Marker({
      position: { lat: location.coordinates[1], lng: location.coordinates[0] },
      map: map,
      title: location.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#8e8e93', // Neutral gray
        fillOpacity: 0.7,
        strokeColor: '#ffffff',
        strokeWeight: 1,
      },
    });

    marker.addListener('click', () => {
      const content = `
        <div class="p-3 max-w-sm">
          <h3 class="font-semibold text-primary mb-2">${location.name}</h3>
          <div class="space-y-1 text-sm">
            <div><strong>Site ID:</strong> ${location.siteId}</div>
            <div><strong>Type:</strong> ${location.siteType === 'ST' ? 'Stream' : location.siteType === 'LK' ? 'Lake' : 'Estuary'}</div>
            <div><strong>Coordinates:</strong> ${location.coordinates[1].toFixed(4)}, ${location.coordinates[0].toFixed(4)}</div>
            <div class="text-muted-foreground text-xs mt-2">Click "Show River Data" to see current water levels</div>
          </div>
        </div>
      `;

      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }

      infoWindowRef.current = new google.maps.InfoWindow({
        content: content,
      });

      infoWindowRef.current.open(map, marker);
    });

    return marker;
  }, []);

  const createMarker = useCallback((station: GaugeStation, map: any) => {
    const { google } = window;
    
    const marker = new google.maps.Marker({
      position: { lat: station.coordinates[1], lng: station.coordinates[0] },
      map: map,
      title: station.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: station.waterLevel.color,
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    marker.addListener('click', () => {
      setSelectedStation(station);
      
      const content = `
        <div class="p-3 max-w-sm">
          <h3 class="font-semibold text-primary mb-2">${station.name}</h3>
          <div class="space-y-1 text-sm">
            <div><strong>Site ID:</strong> ${station.siteId}</div>
            <div><strong>Coordinates:</strong> ${station.coordinates[1].toFixed(4)}, ${station.coordinates[0].toFixed(4)}</div>
            <div><strong>Gage Height:</strong> ${station.latestHeight?.toFixed(2) || 'N/A'} ft</div>
            <div><strong>Water Level:</strong> 
              <span style="color: ${station.waterLevel.color}; font-weight: bold; text-transform: capitalize;">
                ${station.waterLevel.level}
              </span>
            </div>
            ${station.lastUpdated ? `<div><strong>Last Updated:</strong> ${new Date(station.lastUpdated).toLocaleString()}</div>` : ''}
          </div>
        </div>
      `;

      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }

      infoWindowRef.current = new google.maps.InfoWindow({
        content: content,
      });

      infoWindowRef.current.open(map, marker);
    });

    return marker;
  }, []);

  const loadGaugeLocations = useCallback(async (map: any) => {
    const bounds = map.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const bbox: [number, number, number, number] = [
      sw.lng(), sw.lat(), ne.lng(), ne.lat()
    ];

    setIsLoading(true);
    try {
      const locations = await usgsService.getGaugeLocationsOnly(bbox);
      setBasicGaugeLocations(locations);

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Create basic location markers
      const newMarkers = locations.map(location => createBasicMarker(location, map));
      markersRef.current = newMarkers;

      console.log(`Loaded ${locations.length} gauge locations`);
    } catch (error) {
      console.error('Error loading gauge locations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [createBasicMarker]);

  const loadStations = useCallback(async (map: any) => {
    if (!showRiverData || basicGaugeLocations.length === 0) return;
    
    setIsLoadingData(true);
    try {
      const enhancedStations = await usgsService.enhanceGaugeStationsWithData(basicGaugeLocations);
      setStations(enhancedStations);

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Create enhanced markers with water data
      const newMarkers = enhancedStations.map(station => createMarker(station, map));
      markersRef.current = newMarkers;

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
  }, [createMarker, toast, showRiverData, basicGaugeLocations]);

  const initializeMap = useCallback(async () => {
    try {
      console.log('Initializing Google Maps...');
      await loadGoogleMapsScript();
      
      if (!mapRef.current) {
        console.error('Map container not found');
        return;
      }

      const { google } = window;
      
      if (!google || !google.maps || !google.maps.Map) {
        throw new Error('Google Maps API not properly loaded');
      }
      
      console.log('Creating map instance...');
      
      const map = new google.maps.Map(mapRef.current, {
        zoom: 6,
        center: { lat: 39.8283, lng: -98.5795 }, // Center of US
        mapTypeId: 'terrain',
        styles: [
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#e9f3ff' }]
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#1a73e8' }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // Add search box (using alternative to SearchBox since it's being deprecated)
      const autocomplete = new google.maps.places.Autocomplete(
        document.getElementById('search-input') as HTMLInputElement
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          map.setCenter(place.geometry.location);
          map.setZoom(10);
        }
      });

      // Load initial gauge locations (not water data yet)
      google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        loadGaugeLocations(map);
      });

      // Reload locations when map moves (with debouncing)
      let timeoutId: NodeJS.Timeout;
      map.addListener('bounds_changed', () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => loadGaugeLocations(map), 1000);
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
      toast({
        title: "Map Loading Error",
        description: "Failed to load Google Maps. Please check your API key.",
        variant: "destructive",
      });
    }
  }, [loadGoogleMapsScript, loadStations, toast]);

  const resetView = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: 39.8283, lng: -98.5795 });
      mapInstanceRef.current.setZoom(6);
    }
  }, []);

  const toggleRiverData = useCallback(() => {
    setShowRiverData(prev => {
      const newValue = !prev;
      
      if (!newValue) {
        // Switch back to basic location markers
        if (mapInstanceRef.current && basicGaugeLocations.length > 0) {
          markersRef.current.forEach(marker => marker.setMap(null));
          markersRef.current = [];
          
          const basicMarkers = basicGaugeLocations.map(location => 
            createBasicMarker(location, mapInstanceRef.current)
          );
          markersRef.current = basicMarkers;
        }
        setStations([]);
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
      } else {
        // Load water data for current locations
        if (mapInstanceRef.current) {
          loadStations(mapInstanceRef.current);
        }
      }
      
      return newValue;
    });
  }, [loadStations, basicGaugeLocations, createBasicMarker]);

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  return (
    <div className="relative w-full h-screen bg-background">
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

      {/* Loading indicators */}
      {isLoading && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading gauge locations...</span>
            </CardContent>
          </Card>
        </div>
      )}

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

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};