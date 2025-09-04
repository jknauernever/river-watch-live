/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseGoogleMapsOptions {
  apiKey: string;
  containerId?: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export const useGoogleMaps = ({ apiKey, containerId = 'map-container' }: UseGoogleMapsOptions) => {
  console.log('useGoogleMaps hook called with:', { apiKey: apiKey ? 'present' : 'missing', containerId });
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [mapState, setMapState] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);
  const placesLoadedRef = useRef(false);
  const vizLoadedRef = useRef(false);

  const loadScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      // If already loaded, resolve immediately
      if (window.google && window.google.maps && window.google.maps.Map) {
        console.log('Google Maps already loaded');
        resolve(window.google);
        return;
      }

      // If script is already being loaded, wait for it
      if (scriptLoadedRef.current) {
        const checkInterval = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.Map) {
            clearInterval(checkInterval);
            resolve(window.google);
          }
        }, 100);
        // Safety timeout to avoid hanging forever
        setTimeout(() => {
          if (window.google && window.google.maps && window.google.maps.Map) {
            resolve(window.google);
          }
        }, 10000);
        return;
      }

      scriptLoadedRef.current = true;

      // Remove any existing script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      // Keep callback for compatibility but also rely on onload to avoid ad-blocker quirks
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        console.log('Google Maps loaded successfully');
        resolve(window.google);
      };

      window.initGoogleMaps = () => {
        // Callback path
        if (window.google?.maps?.Map) settle();
      };

      script.onload = () => {
        // onload path (works even if callback suppressed by blockers)
        if (window.google?.maps?.Map) settle();
      };

      const timeoutId = setTimeout(() => {
        if (window.google?.maps?.Map) {
          settle();
        } else {
          console.error('Google Maps script load timed out');
          scriptLoadedRef.current = false;
          reject(new Error('Google Maps failed to load (timeout)'));
        }
      }, 12000);

      script.onerror = (event) => {
        console.error('Google Maps script failed to load:', event);
        scriptLoadedRef.current = false;
        clearTimeout(timeoutId);
        reject(new Error('Failed to load Google Maps'));
      };

      document.head.appendChild(script);
    });
  }, [apiKey]);

  const initializeMap = useCallback(async () => {
    if (mapInstanceRef.current || !apiKey) return mapInstanceRef.current;

    try {
      await loadScript();
      
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Map container with id "${containerId}" not found`);
      }

      const { google } = window;
      
      console.log('Creating single map instance...');
      const map = new google.maps.Map(container as HTMLElement, {
        zoom: 9,
        center: { lat: 47.6062, lng: -122.3321 }, // Puget Sound, Washington
        mapTypeId: 'terrain',
        // Standard Google UI controls
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DEFAULT,
          position: google.maps.ControlPosition.TOP_RIGHT,
          mapTypeIds: [
            google.maps.MapTypeId.ROADMAP,
            google.maps.MapTypeId.TERRAIN,
            google.maps.MapTypeId.SATELLITE,
            google.maps.MapTypeId.HYBRID,
          ],
        },
        fullscreenControl: true,
        fullscreenControlOptions: { position: google.maps.ControlPosition.RIGHT_TOP },
        scaleControl: true,
        streetViewControl: false,
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

      // Restore last chosen map type if available
      try {
        const savedType = localStorage.getItem('gm_map_type') as google.maps.MapTypeId | null;
        if (savedType) map.setMapTypeId(savedType);
      } catch {}

      // Persist map type changes
      google.maps.event.addListener(map, 'maptypeid_changed', () => {
        try {
          const typeId = map.getMapTypeId();
          localStorage.setItem('gm_map_type', typeId as string);
        } catch {}
      });

      mapInstanceRef.current = map;
      setMapState(map);
      setIsLoaded(true);
      setError(null);
      
      console.log('Map instance created successfully');
      return map;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize map';
      console.error('Map initialization failed:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  }, [apiKey, containerId, loadScript]);

  const loadPlacesLibrary = useCallback(async () => {
    if (placesLoadedRef.current) return;
    const { google } = window as any;
    if (google?.maps?.places) { placesLoadedRef.current = true; return; }
    try {
      if (typeof google?.maps?.importLibrary === 'function') {
        await google.maps.importLibrary('places');
      } else {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`;
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Places library'));
          document.head.appendChild(script);
        });
      }
      placesLoadedRef.current = true;
    } catch (e) {
      console.warn('Failed to load Places library:', e);
    }
  }, [apiKey]);

  const loadVisualizationLibrary = useCallback(async () => { /* heatmap disabled */ }, []);

  const getMap = useCallback((): google.maps.Map | null => {
    return mapInstanceRef.current;
  }, []);

  const resetView = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: 47.6062, lng: -122.3321 });
      mapInstanceRef.current.setZoom(9);
    }
  }, []);

  useEffect(() => {
    if (apiKey && !mapInstanceRef.current) {
      initializeMap().catch(console.error);
    }
  }, [apiKey, initializeMap]);

  return {
    map: mapState,
    isLoaded,
    error,
    initializeMap,
    loadPlacesLibrary,
    loadVisualizationLibrary,
    getMap,
    resetView
  };
};