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
  const markersRef = useRef<(google.maps.Marker | any)[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markerMapRef = useRef<Map<string, google.maps.Marker | any>>(new Map());

  const clearMarkers = useCallback(() => {
    console.log('Clearing markers:', markersRef.current.length);
    markersRef.current.forEach(marker => (marker as any).setMap(null));
    markersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
    markerMapRef.current.clear();
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

  // Update markers when data changes using diffing and batching
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

    const upsert = (id: string, lat: number, lng: number, title: string, color?: string) => {
      const existing = markerMapRef.current.get(id) as google.maps.Marker | undefined;
      if (existing) {
        if (existing.setPosition) existing.setPosition({ lat, lng });
        if (existing.setIcon) {
          existing.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: color || '#1e90ff',
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          } as any);
        }
        return existing;
      }

      // Create using the original styled circular symbol and attach listeners
      let marker: google.maps.Marker | null = null;
      if (showRiverData) {
        const station = stations.find(s => s.id === id);
        if (station) {
          marker = createStationMarker(station) as google.maps.Marker | null;
        }
      } else {
        const loc = basicLocations.find(l => l.siteId === id);
        if (loc) {
          marker = createBasicMarker(loc) as google.maps.Marker | null;
        }
      }

      if (!marker) {
        marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: color || '#1e90ff',
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          visible: true,
          zIndex: showRiverData ? 2 : 1,
          animation: google.maps.Animation.DROP,
        });
      }

      markerMapRef.current.set(id, marker);
      return marker;
    };

    const targets: Array<{ id: string; lat: number; lng: number; title: string; color?: string }> = showRiverData
      ? stations.map(s => ({ id: s.id, lat: s.coordinates[1], lng: s.coordinates[0], title: s.name, color: s.waterLevel.color }))
      : basicLocations.map(l => ({ id: l.siteId, lat: l.coordinates[1], lng: l.coordinates[0], title: l.name }));

    const nextIds = new Set(targets.map(t => t.id));

    // Remove markers that are no longer needed
    markerMapRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        (marker as any).setMap(null);
        markerMapRef.current.delete(id);
      }
    });

    // Batch additions/updates
    const batchSize = 200;
    let index = 0;
    const process = () => {
      const end = Math.min(index + batchSize, targets.length);
      for (; index < end; index++) {
        const t = targets[index];
        const m = upsert(t.id, t.lat, t.lng, t.title, t.color);
        if ((m as any).setMap) (m as any).setMap(map);
      }
      if (index < targets.length) requestAnimationFrame(process);
    };
    process();
  }, [map, basicLocations, stations, showRiverData, createBasicMarker, createStationMarker, clearMarkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMarkers();
    };
  }, [clearMarkers]);

  return null; // This component only manages markers, doesn't render UI
};