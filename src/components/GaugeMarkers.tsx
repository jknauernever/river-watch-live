import { useEffect, useRef, useCallback } from 'react';
import { GaugeStation } from '@/types/usgs';

interface BasicLocation {
  siteId: string;
  name: string;
  coordinates: [number, number];
  siteType: string;
}

interface GaugeMarkersProps {
  map: any;
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
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);

  const createBasicMarker = useCallback((location: BasicLocation) => {
    if (!map || !window.google) return null;

    const { google } = window;
    
    const marker = new google.maps.Marker({
      position: { lat: location.coordinates[1], lng: location.coordinates[0] },
      map: map,
      title: location.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#1e90ff',
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2,
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
    if (!map || !window.google) return null;

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
      onStationSelect?.(station);
      
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
  }, [map, onStationSelect]);

  // Update markers when data changes
  useEffect(() => {
    if (!map) return;

    clearMarkers();

    if (showRiverData && stations.length > 0) {
      // Show enhanced markers with water data
      const newMarkers = stations.map(station => createStationMarker(station)).filter(Boolean);
      markersRef.current = newMarkers;
    } else if (basicLocations.length > 0) {
      // Show basic location markers
      const newMarkers = basicLocations.map(location => createBasicMarker(location)).filter(Boolean);
      markersRef.current = newMarkers;
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