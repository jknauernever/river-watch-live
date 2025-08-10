/// <reference types="google.maps" />
import { useEffect, useRef, useCallback } from 'react';
import { usgsService } from '@/services/usgs-api';

interface BasicLocation {
  siteId: string;
  name: string;
  coordinates: [number, number];
  siteType: string;
}

interface GaugeMarkersProps {
  map: google.maps.Map | null;
  basicLocations: BasicLocation[];
}

export const GaugeMarkers = ({ map, basicLocations }: GaugeMarkersProps) => {
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markerMapRef = useRef<Map<string, google.maps.Marker>>(new Map());

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    markerMapRef.current.clear();
    infoWindowRef.current?.close();
  }, []);

  const buildAttributesHtml = (attrs: Record<string, any>) => {
    const rows = Object.entries(attrs)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([key, val]) => {
        const value = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `<div class="flex justify-between gap-3"><span class="font-medium">${key}</span><span class="text-right">${value}</span></div>`;
      })
      .join('');
    return rows || '<div class="text-muted-foreground">No attributes available.</div>';
  };

  const buildMeasurementsHtml = (features: any[]) => {
    if (!Array.isArray(features) || features.length === 0) {
      return '<div class="text-muted-foreground">No recent measurements.</div>';
    }
    const rows = features
      .map((f: any) => {
        const p = f?.properties || {};
        const label = p.parameter_name || p.observed_property_name || p.parameter_code || 'Measurement';
        const unit = p.unit || p.unit_of_measurement || '';
        const time = p.time || p.datetime || p.result_time || '';
        const val = p.value ?? p.result ?? 'N/A';
        return `<div class="space-y-0.5">
          <div class="font-medium">${label}</div>
          <div class="text-sm">Value: <span class="font-mono">${val}</span>${unit ? ` ${unit}` : ''}</div>
          ${time ? `<div class="text-xs text-muted-foreground">${new Date(time).toLocaleString()}</div>` : ''}
        </div>`;
      })
      .join('<hr class="my-2" />');
    return rows;
  };

  const createMarker = useCallback((location: BasicLocation) => {
    if (!map || !window.google) return null;
    const { google } = window;
    const [lng, lat] = location.coordinates;
    if (
      typeof lng !== 'number' || typeof lat !== 'number' ||
      isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90
    ) return null;

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      title: location.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#1e90ff',
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

    marker.addListener('click', async () => {
      // Open a lightweight InfoWindow immediately
      infoWindowRef.current?.close();
      infoWindowRef.current = new google.maps.InfoWindow({
        content: `<div class="p-3 max-w-sm"><div class="font-semibold mb-1">${location.name}</div><div class="text-sm">Loading data…</div></div>`
      });
      infoWindowRef.current.open(map, marker);

      try {
        const { attributes, latest } = await usgsService.getGaugeFullInfo(location.siteId);
        const attrsHtml = buildAttributesHtml(attributes || {});
        const measurementsHtml = buildMeasurementsHtml(latest || []);
        const content = `
          <div class="p-3 max-w-sm">
            <h3 class="font-semibold text-primary mb-2">${location.name}</h3>
            <div class="text-xs text-muted-foreground mb-2">${lat.toFixed(4)}, ${lng.toFixed(4)} • ${location.siteId}</div>
            <div class="space-y-3">
              <div>
                <div class="text-sm mb-1 font-semibold">Site attributes</div>
                <div class="space-y-1">${attrsHtml}</div>
              </div>
              <div>
                <div class="text-sm mb-1 font-semibold">Latest measurements</div>
                <div class="space-y-2">${measurementsHtml}</div>
              </div>
            </div>
          </div>`;
        infoWindowRef.current.setContent(content);
      } catch (e) {
        infoWindowRef.current.setContent(`<div class="p-3 max-w-sm"><div class="font-semibold mb-1">${location.name}</div><div class="text-sm text-destructive">Failed to load data.</div></div>`);
      }
    });

    return marker;
  }, [map]);

  // Sync markers with locations
  useEffect(() => {
    if (!map) return;

    const nextIds = new Set(basicLocations.map(l => l.siteId));

    // Remove markers not in view
    markerMapRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        marker.setMap(null);
        markerMapRef.current.delete(id);
      }
    });

    // Upsert
    basicLocations.forEach((loc) => {
      let marker = markerMapRef.current.get(loc.siteId);
      const [lng, lat] = loc.coordinates;
      if (marker) {
        marker.setPosition({ lat, lng });
      } else {
        marker = createMarker(loc) as google.maps.Marker | null;
        if (marker) {
          marker.setMap(map);
          markerMapRef.current.set(loc.siteId, marker);
        }
      }
    });

    return () => {
      // no-op here; full cleanup on unmount
    };
  }, [map, basicLocations, createMarker]);

  // Cleanup on unmount
  useEffect(() => clearMarkers, [clearMarkers]);

  return null;
};