# Google Earth Engine Tile Server API Documentation

## Overview
This API provides access to Google Earth Engine datasets as map tiles that can be displayed in mapping applications like Mapbox, Leaflet, or any web mapping library.

**Base URL:** `https://gee-tile-server.vercel.app`

## Authentication
All API requests require an `apikey` parameter for authentication.

## Endpoints

### 1. List Available Datasets
**GET** `/api/datasets`

Returns information about all available datasets.

**Parameters:**
- `category` (optional): Filter datasets by category
- `format` (optional): Response format (`json` or `list`)

**Example Request:**
```
GET https://gee-tile-server.vercel.app/api/datasets
```

**Example Response:**
```json
{
  "datasets": {
    "ndvi": {
      "collection": "MODIS/006/MOD13Q1",
      "band": "NDVI",
      "min": 0,
      "max": 9000,
      "defaultPalette": "FF0000,FFFF00,00FF00",
      "description": "Normalized Difference Vegetation Index",
      "category": "Vegetation",
      "temporalResolution": "16 days",
      "spatialResolution": "250m"
    }
  },
  "total": 8,
  "categories": ["Vegetation", "Water", "Climate", "Cryosphere", "Hazards", "Land Use"],
  "usage": {
    "example": "https://gee-tile-server.vercel.app/api/tiles?dataset=ndvi&year=2024&month=6&apikey=YOUR_API_KEY",
    "parameters": {
      "dataset": "Dataset name (required)",
      "year": "Year (default: 2024)",
      "month": "Month 1-12 (optional)",
      "period": "monthly or yearly (default: monthly)",
      "palette": "Color palette (optional, uses dataset default)",
      "opacity": "Opacity 0.0-1.0 (default: 1.0)",
      "apikey": "Your API key (required)"
    }
  }
}
```

### 2. Get Map Tiles
**GET** `/api/tiles`

Returns a Google Earth Engine tile URL for the specified dataset and parameters.

**Required Parameters:**
- `apikey`: Your API key for authentication

**Optional Parameters:**
- `dataset`: Dataset name (default: "ndvi")
- `year`: Year for data (default: "2024")
- `month`: Month 1-12 (optional, for monthly data)
- `period`: "monthly" or "yearly" (default: "monthly")
- `palette`: Color palette as comma-separated hex colors (optional)
- `opacity`: Opacity level 0.0-1.0 (default: "1.0")

**Available Datasets:**
- `ndvi`: Normalized Difference Vegetation Index
- `evi`: Enhanced Vegetation Index
- `ndwi`: Normalized Difference Water Index
- `temperature`: Land Surface Temperature
- `precipitation`: Precipitation (IMERG)
- `snow`: Snow Cover
- `fire`: Fire Detection
- `urban`: WorldCover Land Use

**Example Request:**
```
GET https://gee-tile-server.vercel.app/api/tiles?dataset=temperature&year=2024&month=6&apikey=YOUR_API_KEY
```

**Example Response:**
```json
{
  "tile_url": "https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps/...",
  "dataset": "temperature",
  "description": "Land Surface Temperature (Day)",
  "parameters": {
    "year": "2024",
    "month": "6",
    "period": "monthly",
    "palette": "0000FF,00FFFF,FFFF00,FF0000",
    "opacity": "1.0"
  }
}
```

### 3. Test Endpoint
**GET** `/api/test`

Simple test endpoint to verify API connectivity.

**Example Request:**
```
GET https://gee-tile-server.vercel.app/api/test
```

**Example Response:**
```json
{
  "message": "API is working!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "method": "GET",
  "url": "/api/test"
}
```

## Dataset Categories

### Vegetation
- **NDVI**: Normalized Difference Vegetation Index - measures vegetation health
- **EVI**: Enhanced Vegetation Index - improved vegetation index

### Water
- **NDWI**: Normalized Difference Water Index - detects water bodies

### Climate
- **Temperature**: Land Surface Temperature - thermal data
- **Precipitation**: IMERG precipitation data - rainfall measurements

### Cryosphere
- **Snow**: Snow cover detection - snow extent mapping

### Hazards
- **Fire**: Fire detection - active fire monitoring

### Land Use
- **Urban**: WorldCover land use classification - land cover types

## Color Palettes

Each dataset has a default color palette optimized for the data type:

- **NDVI/EVI**: `FF0000,FFFF00,00FF00` (Red-Yellow-Green)
- **NDWI**: `0000FF,FFFFFF,00FF00` (Blue-White-Green)
- **Temperature**: `0000FF,00FFFF,FFFF00,FF0000` (Blue-Cyan-Yellow-Red)
- **Precipitation**: `FFFFFF,0000FF,00FFFF,00FF00,FFFF00,FF0000` (White-Blue-Cyan-Green-Yellow-Red)
- **Snow**: `FFFFFF,0000FF` (White-Blue)
- **Fire**: `000000,FF0000,FFFF00,00FF00` (Black-Red-Yellow-Green)
- **Urban**: `006400,FFA500,FFFF00,FF0000,0000FF,FFFFFF,8B4513,808080` (Land use categories)

## Error Responses

### 403 Forbidden
```json
{
  "error": "Invalid API key"
}
```

### 500 Internal Server Error
```json
{
  "error": "GEE_SERVICE_ACCOUNT environment variable not set or invalid JSON",
  "hint": "Make sure to set the entire JSON as a single line in Vercel environment variables"
}
```

```json
{
  "error": "Dataset 'invalid_dataset' not supported. Available datasets: ndvi, evi, ndwi, temperature, precipitation, snow, fire, urban"
}
```

## Integration Examples

### JavaScript/Mapbox
```javascript
// Get tile URL
const response = await fetch('https://gee-tile-server.vercel.app/api/tiles?dataset=temperature&year=2024&month=6&apikey=YOUR_API_KEY');
const data = await response.json();

// Add to map
map.addSource('temperature-tiles', {
  type: 'raster',
  tiles: [data.tile_url],
  tileSize: 256
});

map.addLayer({
  id: 'temperature-layer',
  type: 'raster',
  source: 'temperature-tiles',
  paint: {
    'raster-opacity': 0.8
  }
});
```

### Python/Requests
```python
import requests

# Get available datasets
datasets_response = requests.get('https://gee-tile-server.vercel.app/api/datasets')
datasets = datasets_response.json()

# Get tile URL
params = {
    'dataset': 'ndvi',
    'year': '2024',
    'month': '6',
    'apikey': 'YOUR_API_KEY'
}
response = requests.get('https://gee-tile-server.vercel.app/api/tiles', params=params)
tile_data = response.json()
tile_url = tile_data['tile_url']
```

### cURL
```bash
# List datasets
curl "https://gee-tile-server.vercel.app/api/datasets"

# Get temperature tiles
curl "https://gee-tile-server.vercel.app/api/tiles?dataset=temperature&year=2024&month=6&apikey=YOUR_API_KEY"
```

## Rate Limits
- No specific rate limits currently implemented
- Google Earth Engine may have its own rate limits
- Recommended to cache tile URLs when possible

## CORS Support
All endpoints support CORS and can be called from web browsers.

## Data Sources
All data comes from Google Earth Engine collections:
- MODIS/006/MOD13Q1 (Vegetation indices)
- MODIS/006/MOD11A1 (Temperature)
- NASA/GPM_L3/IMERG_V06 (Precipitation)
- MODIS/006/MOD10A1 (Snow)
- MODIS/006/MOD14A1 (Fire)
- ESA/WorldCover/v100 (Land use)

## Temporal Coverage
- Most datasets: 2000-present
- Precipitation: 2000-present
- Land use: 2020
- Temporal resolution varies by dataset (daily to annual)

## Spatial Coverage
- Global coverage
- Spatial resolution varies by dataset (10m to 10km) 