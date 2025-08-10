/// <reference types="google.maps" />
import { useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { usgsService } from '@/services/usgs-api';
import { colorForValue } from '@/lib/datasets';
import { SitePopup } from '@/components/SitePopup';

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
}

export const GaugeMarkers = ({ map, basicLocations, activeCodes, thresholds }: GaugeMarkersProps) => {
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markerMapRef = useRef<Map<string, google.maps.Marker>>(new Map());

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    markerMapRef.current.clear();
    infoWindowRef.current?.close();
  }, []);

  // Use selected dataset code (first active code)
  const activeCode = activeCodes[0] || '00065';

  const siteColor = (site: BasicLocation) => {
    const p = site.params?.find(x => x.code === activeCode);
    const t = thresholds?.[activeCode];
    const value = Number(p?.value);
    return colorForValue(activeCode, value, (t as any) || null);
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

    marker.addListener('click', async () => {
      // Create container and open InfoWindow immediately
      infoWindowRef.current?.close();
      const container = document.createElement('div');
      container.className = 'max-w-sm';
      container.innerHTML = `<div class="p-3 max-w-sm"><div class="font-semibold mb-1">${location.name}</div><div class="text-sm">Loading data…</div></div>`;
      infoWindowRef.current = new google.maps.InfoWindow({ content: container });
      infoWindowRef.current.open(map, marker);

      let root: ReturnType<typeof createRoot> | null = null;
      const closeListener = google.maps.event.addListenerOnce(infoWindowRef.current, 'closeclick', () => {
        try { root?.unmount?.(); } catch {}
        root = null;
      });

      try {
        const { attributes, latest } = await usgsService.getGaugeFullInfo(location.siteId);
        // Render React popup
        root = createRoot(container);
        root.render(
          React.createElement(SitePopup, {
            site: { siteId: location.siteId, name: location.name, coordinates: location.coordinates, siteType: location.siteType },
            latestFeatures: latest || [],
            activeCode,
            thresholds: (thresholds?.[activeCode] as any) || null,
            onCenter: () => {
              map?.panTo({ lat: location.coordinates[1], lng: location.coordinates[0] });
              if (map?.getZoom && (map.getZoom() ?? 0) < 12) map.setZoom(12);
            }
          })
        );
      } catch (e) {
        container.innerHTML = `<div class="p-3 max-w-sm"><div class="font-semibold mb-1">${location.name}</div><div class="text-sm text-destructive">Failed to load data.</div></div>`;
      }
    });

    return marker;
  }, [map]);

  // Sync markers with locations and color bins
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
        }
      }
    });

    return () => {
      // no-op here; full cleanup on unmount
    };
  }, [map, basicLocations, createMarker, activeCodes, thresholds]);

  // Cleanup on unmount
  useEffect(() => clearMarkers, [clearMarkers]);

  return null;
};