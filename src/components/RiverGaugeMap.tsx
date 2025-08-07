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
    initMap: () => void;
  }
}

export const RiverGaugeMap = ({ apiKey }: RiverGaugeMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stations, setStations] = useState<GaugeStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<GaugeStation | null>(null);
  const { toast } = useToast();

  const loadGoogleMapsScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve(window.google);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
  }, [apiKey]);

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

  const loadStations = useCallback(async (map: any) => {
    const bounds = map.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const bbox: [number, number, number, number] = [
      sw.lng(), sw.lat(), ne.lng(), ne.lat()
    ];

    setIsLoading(true);
    try {
      const newStations = await usgsService.processGaugeStations(bbox);
      setStations(newStations);

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Create new markers
      const newMarkers = newStations.map(station => createMarker(station, map));
      markersRef.current = newMarkers;

      toast({
        title: "Gauge Data Loaded",
        description: `Found ${newStations.length} river gauge stations`,
      });
    } catch (error) {
      console.error('Error loading stations:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load USGS gauge data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [createMarker, toast]);

  const initializeMap = useCallback(async () => {
    try {
      await loadGoogleMapsScript();
      
      if (!mapRef.current) return;

      const { google } = window;
      
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

      // Add search box
      const searchBox = new google.maps.places.SearchBox(
        document.getElementById('search-input') as HTMLInputElement
      );

      searchBox.addListener('places_changed', () => {
        const places = searchBox.getPlaces();
        if (places.length === 0) return;

        const place = places[0];
        if (place.geometry?.location) {
          map.setCenter(place.geometry.location);
          map.setZoom(10);
        }
      });

      // Load initial data
      google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        loadStations(map);
      });

      // Reload data when map moves (with debouncing)
      let timeoutId: NodeJS.Timeout;
      map.addListener('bounds_changed', () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => loadStations(map), 1000);
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

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-4 items-center">
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
        
        <Button onClick={resetView} variant="secondary" size="sm">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset View
        </Button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading gauge data...</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
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

      {/* Station count */}
      {stations.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10">
          <Badge variant="secondary">
            {stations.length} gauge{stations.length !== 1 ? 's' : ''} loaded
          </Badge>
        </div>
      )}

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};