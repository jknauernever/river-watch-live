// Dataset configurations
const DATASETS = {
  'ndvi': {
    collection: 'MODIS/006/MOD13Q1',
    band: 'NDVI',
    min: 0,
    max: 9000,
    defaultPalette: 'FF0000,FFFF00,00FF00',
    description: 'Normalized Difference Vegetation Index',
    category: 'Vegetation',
    temporalResolution: '16 days',
    spatialResolution: '250m'
  },
  'evi': {
    collection: 'MODIS/006/MOD13Q1',
    band: 'EVI',
    min: 0,
    max: 6000,
    defaultPalette: 'FF0000,FFFF00,00FF00',
    description: 'Enhanced Vegetation Index',
    category: 'Vegetation',
    temporalResolution: '16 days',
    spatialResolution: '250m'
  },
  'ndwi': {
    collection: 'MODIS/006/MOD13Q1',
    band: 'NDWI',
    min: -1,
    max: 1,
    defaultPalette: '0000FF,FFFFFF,00FF00',
    description: 'Normalized Difference Water Index',
    category: 'Water',
    temporalResolution: '16 days',
    spatialResolution: '250m'
  },
  'temperature': {
    collection: 'MODIS/006/MOD11A1',
    band: 'LST_Day_1km',
    min: 250,
    max: 320,
    defaultPalette: '0000FF,00FFFF,FFFF00,FF0000',
    description: 'Land Surface Temperature (Day)',
    category: 'Climate',
    temporalResolution: 'Daily',
    spatialResolution: '1km'
  },
  'precipitation': {
    collection: 'NASA/GPM_L3/IMERG_V06',
    band: 'precipitationCal',
    min: 0,
    max: 50,
    defaultPalette: 'FFFFFF,0000FF,00FFFF,00FF00,FFFF00,FF0000',
    description: 'Precipitation (IMERG)',
    category: 'Climate',
    temporalResolution: '30 minutes',
    spatialResolution: '10km'
  },
  'snow': {
    collection: 'MODIS/006/MOD10A1',
    band: 'NDSI_Snow_Cover',
    min: 0,
    max: 100,
    defaultPalette: 'FFFFFF,0000FF',
    description: 'Snow Cover',
    category: 'Cryosphere',
    temporalResolution: 'Daily',
    spatialResolution: '500m'
  },
  'fire': {
    collection: 'MODIS/006/MOD14A1',
    band: 'FireMask',
    min: 0,
    max: 9,
    defaultPalette: '000000,FF0000,FFFF00,00FF00',
    description: 'Fire Detection',
    category: 'Hazards',
    temporalResolution: 'Daily',
    spatialResolution: '1km'
  },
  'urban': {
    collection: 'ESA/WorldCover/v100',
    band: 'Map',
    min: 0,
    max: 100,
    defaultPalette: '006400,FFA500,FFFF00,FF0000,0000FF,FFFFFF,8B4513,808080',
    description: 'WorldCover Land Use',
    category: 'Land Use',
    temporalResolution: 'Annual',
    spatialResolution: '10m'
  }
};

export default async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { query } = req;
  const { category, format = 'json' } = query;

  try {
    let datasets = DATASETS;

    // Filter by category if specified
    if (category) {
      datasets = Object.fromEntries(
        Object.entries(DATASETS).filter(([key, config]) => 
          config.category.toLowerCase() === category.toLowerCase()
        )
      );
    }

    if (format === 'list') {
      // Return simple list of dataset names
      res.json({
        datasets: Object.keys(datasets),
        total: Object.keys(datasets).length
      });
    } else {
      // Return full dataset information
      res.json({
        datasets,
        total: Object.keys(datasets).length,
        categories: [...new Set(Object.values(DATASETS).map(d => d.category))],
        usage: {
          example: 'https://gee-tile-server.vercel.app/api/tiles?dataset=ndvi&year=2024&month=6&apikey=YOUR_API_KEY',
          parameters: {
            dataset: 'Dataset name (required)',
            year: 'Year (default: 2024)',
            month: 'Month 1-12 (optional)',
            period: 'monthly or yearly (default: monthly)',
            palette: 'Color palette (optional, uses dataset default)',
            opacity: 'Opacity 0.0-1.0 (default: 1.0)',
            apikey: 'Your API key (required)'
          }
        }
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}; 