# River Watch Live

Interactive map that displays USGS river gauges and current water level data using the USGS Water Data OGC APIs and Google Maps.

### USGS API Reference
- Main entry point: [USGS Water Data OGC APIs](https://api.waterdata.usgs.gov/ogcapi/v0/)
- OpenAPI definition: [JSON](https://api.waterdata.usgs.gov/ogcapi/v0/openapi) · [HTML](https://api.waterdata.usgs.gov/ogcapi/v0/openapi?f=html)
- Collections: `GET /collections`
  - Monitoring locations: `GET /collections/monitoring-locations/items`
  - Latest continuous values: `GET /collections/latest-continuous-values/items`
  - Daily values: `GET /collections/daily-values/items`

Typical query params used by this app:
- **bbox**: `minLon,minLat,maxLon,maxLat` to limit results to current map extent
- **parameter_code**: `00065` for gage height
- **monitoring_location_id**: USGS site id
- **f**: `json`
- **limit**: pagination size

Examples used in code:
- Monitoring locations in a bbox: `GET /collections/monitoring-locations/items?bbox={minLon,minLat,maxLon,maxLat}&f=json&limit=100`
- Latest gage heights in a bbox: `GET /collections/latest-continuous-values/items?bbox={minLon,minLat,maxLon,maxLat}&parameter_code=00065&f=json&limit=1000`
- Historical daily values: `GET /collections/daily-values/items?monitoring_location_id={siteId}&parameter_code=00065&start={YYYY-MM-DD}&end={YYYY-MM-DD}&f=json&limit=1000`

### Project Setup
1) Install dependencies
```sh
npm i
```

2) Configure environment
```sh
# Option A: Local storage (prompted by UI)
# Option B: .env.local for Vite
VITE_GOOGLE_MAPS_API_KEY=your_key_here
# Optional for daily-values if required by your usage
VITE_USGS_API_KEY=your_usgs_key_here
```

3) Run locally
```sh
npm run dev
```

### Notes
- The app fetches monitoring locations for the current map bounds, then optionally enhances them with latest gage height data via a single bulk request per extent.
- When USGS endpoints are unavailable, the app shows demo locations distributed across the current view.
- For security, do not commit API keys. Use env vars or local storage. Restrict Google Maps keys by HTTP referrers.

### Key Files
- `src/pages/Index.tsx` – loads Google Maps key and renders the map
- `src/components/RiverGaugeMap.tsx` – orchestrates fetching and rendering
- `src/components/GaugeMarkers.tsx` – renders markers and info windows
- `src/hooks/useGoogleMaps.ts` – loads and manages the Google Map instance
- `src/services/usgs-api.ts` – USGS OGC API client

### Working Agreement (Approval Before Changes)
- Before making any code edits, contributors must first propose a concrete plan of action (what will change and why) and receive explicit approval from the project owner.
- No code changes should be committed without prior approval of the plan.
- This rule applies to all edits, including content, configuration, and infrastructure.
