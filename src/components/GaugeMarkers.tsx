/// <reference types="google.maps" />
import { useEffect, useRef, useCallback } from 'react';
import { colorForValue } from '@/lib/datasets';

interface BasicLocation {
  siteId: string;
  name: string;
  coordinates: [number, number];
  siteType: string;
  params?: Array<{ code: string; value: number; unit?: string; time?: string; label?: string }>;
}


interface GaugeMarkersProps {
  map: google.maps.Map | null;
  basicLocations: BasicLocation[];
  activeCodes: string[];
  thresholds: Record<string, { q33: number; q66: number; min: number; max: number } | undefined>;
  hazardBySite?: Record<string, { medThreshold: number; highThreshold: number; extremeThreshold: number; source?: string; floodStageValue?: number }>;
  onSiteSelect?: (site: BasicLocation) => void;
}

export const GaugeMarkers = ({ map, basicLocations, activeCodes, thresholds, hazardBySite, onSiteSelect }: GaugeMarkersProps) => {
const markersRef = useRef<google.maps.Marker[]>([]);
const markerMapRef = useRef<Map<string, google.maps.Marker>>(new Map());

const clearMarkers = useCallback(() => {
  // Remove any markers tracked in array
  markersRef.current.forEach(marker => marker.setMap(null));
  markersRef.current = [];
  // Also remove any markers tracked in the map
  markerMapRef.current.forEach((marker) => marker.setMap(null));
  markerMapRef.current.clear();
}, []);

  // Use selected dataset code (first active code)
  const activeCode = activeCodes[0] || '00065';

  const siteColor = (site: BasicLocation) => {
    const p = site.params?.find(x => x.code === activeCode);
    const value = Number(p?.value);
    const hazard = activeCode === '00065' ? hazardBySite?.[site.siteId] : undefined;
    const th = hazard
      ? ({ medThreshold: hazard.medThreshold, highThreshold: hazard.highThreshold, extremeThreshold: hazard.extremeThreshold } as any)
      : (thresholds?.[activeCode] as any);
    return colorForValue(activeCode, value, th || null);
  };


  const createMarker = useCallback((location: BasicLocation) => {
    if (!map || !window.google) return null;
    const { google } = window;
    const [lng, lat] = location.coordinates;
    if (
      typeof lng !== 'number' || typeof lat !== 'number' ||
      isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90
    ) return null;

    const color = siteColor(location);
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      title: location.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: color,
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      zIndex: 1,
      opacity: 0,
    });

    // Fade-in animation (replaces DROP)
    try {
      const duration = 300; // ms
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        marker.setOpacity(t);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } catch (_) {
      // noop if opacity not supported
    }

marker.addListener('click', () => {
  // Delegate selection to parent to handle drawer logic
  onSiteSelect?.(location);
});

    return marker;
  }, [map, activeCodes, thresholds, hazardBySite, onSiteSelect]);

  // Force redraw when active parameter changes
  useEffect(() => {
    clearMarkers();
  }, [activeCode, clearMarkers]);

  // Sync markers with locations and color bins
  useEffect(() => {
    if (!map) return;

    // Only include sites that have a value for the currently active parameter
    const filtered = basicLocations.filter((l) =>
      (l.params || []).some((p) => p.code === activeCode && Number.isFinite(Number(p.value)))
    );

    const nextIds = new Set(filtered.map((l) => l.siteId));

    // Remove markers not in the filtered set
    markerMapRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        marker.setMap(null);
        markerMapRef.current.delete(id);
      }
    });

    // Upsert only the filtered locations
    filtered.forEach((loc) => {
      let marker = markerMapRef.current.get(loc.siteId);
      const [lng, lat] = loc.coordinates;
      const color = siteColor(loc);
      if (marker) {
        marker.setPosition({ lat, lng });
        const nextIcon: google.maps.Symbol = {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        } as any;
        marker.setIcon(nextIcon);
      } else {
        marker = createMarker(loc) as google.maps.Marker | null;
        if (marker) {
          marker.setMap(map);
          markerMapRef.current.set(loc.siteId, marker);
          markersRef.current.push(marker);
        }
      }
    });

    return () => {
      // no-op here; full cleanup on unmount
    };
  }, [map, basicLocations, createMarker, activeCodes, thresholds, hazardBySite, activeCode]);

  // Cleanup on unmount
  useEffect(() => clearMarkers, [clearMarkers]);

  return null;
};