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
        return;
      }

      scriptLoadedRef.current = true;

      // Remove any existing script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      window.initGoogleMaps = () => {
        console.log('Google Maps loaded successfully');
        resolve(window.google);
      };
      
      script.onerror = (event) => {
        console.error('Google Maps script failed to load:', event);
        scriptLoadedRef.current = false;
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
    getMap,
    resetView
  };
};