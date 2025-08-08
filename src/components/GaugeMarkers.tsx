/// <reference types="google.maps" />
import { useEffect, useRef, useCallback } from 'react';
import { GaugeStation } from '@/types/usgs';

interface BasicLocation {
  siteId: string;
  name: string;
  coordinates: [number, number];
  siteType: string;
}

interface GaugeMarkersProps {
  map: google.maps.Map | null;
  basicLocations: BasicLocation[];
  stations: GaugeStation[];
  showRiverData: boolean;
  onStationSelect?: (station: GaugeStation | null) => void;
}

export const GaugeMarkers = ({ 
  map, 
  basicLocations, 
  stations, 
  showRiverData, 
  onStationSelect 
}: GaugeMarkersProps) => {
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const clearMarkers = useCallback(() => {
    console.log('Clearing markers:', markersRef.current.length);
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);

  const createBasicMarker = useCallback((location: BasicLocation) => {
    if (!map || !window.google) {
      console.warn('Map or Google Maps not available for marker creation');
      return null;
    }

    const { google } = window;
    
    // Ensure coordinates are in the correct format [lng, lat]
    const [lng, lat] = location.coordinates;
    
    // Validate coordinates
    if (typeof lng !== 'number' || typeof lat !== 'number' || 
        isNaN(lng) || isNaN(lat) || 
        lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      console.warn('Invalid coordinates for location:', location.name, location.coordinates);
      return null;
    }

    console.log('Creating basic marker for:', location.name, 'at', [lng, lat]);
    
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: map,
      title: location.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#1e90ff',
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      // Ensure marker is visible
      visible: true,
      zIndex: 1,
      // Add animation to make markers more visible
      animation: google.maps.Animation.DROP
    });

    marker.addListener('click', () => {
      const content = `
        <div class="p-3 max-w-sm">
          <h3 class="font-semibold text-primary mb-2">${location.name}</h3>
          <div class="space-y-1 text-sm">
            <div><strong>Site ID:</strong> ${location.siteId}</div>
            <div><strong>Type:</strong> ${location.siteType === 'ST' ? 'Stream' : location.siteType === 'LK' ? 'Lake' : 'Estuary'}</div>
            <div><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
            <div class="text-muted-foreground text-xs mt-2">Click "Show Water Data" to see current water levels</div>
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
  }, [map]);

  const createStationMarker = useCallback((station: GaugeStation) => {
    if (!map || !window.google) {
      console.warn('Map or Google Maps not available for station marker creation');
      return null;
    }

    const { google } = window;
    
    // Ensure coordinates are in the correct format [lng, lat]
    const [lng, lat] = station.coordinates;
    
    // Validate coordinates
    if (typeof lng !== 'number' || typeof lat !== 'number' || 
        isNaN(lng) || isNaN(lat) || 
        lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      console.warn('Invalid coordinates for station:', station.name, station.coordinates);
      return null;
    }

    console.log('Creating station marker for:', station.name, 'at', [lng, lat]);
    
    const marker = new google.maps.Marker({
      position: { lat, lng },
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
      // Ensure marker is visible
      visible: true,
      zIndex: 2
    });

    marker.addListener('click', () => {
      onStationSelect?.(station);
      
      const content = `
        <div class="p-3 max-w-sm">
          <h3 class="font-semibold text-primary mb-2">${station.name}</h3>
          <div class="space-y-1 text-sm">
            <div><strong>Site ID:</strong> ${station.siteId}</div>
            <div><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
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
  }, [map, onStationSelect]);

  // Update markers when data changes
  useEffect(() => {
    if (!map) {
      console.log('Map not available, skipping marker update');
      return;
    }

    console.log('Updating markers:', {
      showRiverData,
      basicLocationsCount: basicLocations.length,
      stationsCount: stations.length
    });

    clearMarkers();

    if (showRiverData && stations.length > 0) {
      // Show enhanced markers with water data
      console.log('Creating station markers:', stations.length);
      const newMarkers = stations.map(station => createStationMarker(station)).filter(Boolean);
      markersRef.current = newMarkers;
      console.log('Created station markers:', newMarkers.length);
      
      // Verify markers are on the map
      newMarkers.forEach((marker, index) => {
        if (marker && marker.getMap() !== map) {
          console.warn(`Station marker ${index} not properly attached to map`);
        }
      });
    } else if (basicLocations.length > 0) {
      // Show basic location markers
      console.log('Creating basic location markers:', basicLocations.length);
      const newMarkers = basicLocations.map(location => createBasicMarker(location)).filter(Boolean);
      markersRef.current = newMarkers;
      console.log('Created basic markers:', newMarkers.length);
      
      // Verify markers are on the map
      newMarkers.forEach((marker, index) => {
        if (marker && marker.getMap() !== map) {
          console.warn(`Basic marker ${index} not properly attached to map`);
        }
      });
    }
  }, [map, basicLocations, stations, showRiverData, createBasicMarker, createStationMarker, clearMarkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMarkers();
    };
  }, [clearMarkers]);

  return null; // This component only manages markers, doesn't render UI
};