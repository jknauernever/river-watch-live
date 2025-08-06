import ee from '@google/earthengine';

// Check if environment variables are loaded
let SERVICE_ACCOUNT = null;
let API_KEY = process.env.API_KEY;

try {
  if (process.env.GEE_SERVICE_ACCOUNT) {
    SERVICE_ACCOUNT = JSON.parse(process.env.GEE_SERVICE_ACCOUNT);
  }
} catch (error) {
  console.error('Error parsing GEE_SERVICE_ACCOUNT:', error.message);
}

// Dataset configurations
const DATASETS = {
  'ndvi': {
    collection: 'MODIS/006/MOD13Q1',
    band: 'NDVI',
    min: 0,
    max: 9000,
    defaultPalette: 'FF0000,FFFF00,00FF00',
    description: 'Normalized Difference Vegetation Index'
  },
  'evi': {
    collection: 'MODIS/006/MOD13Q1',
    band: 'EVI',
    min: 0,
    max: 6000,
    defaultPalette: 'FF0000,FFFF00,00FF00',
    description: 'Enhanced Vegetation Index'
  },
  'ndwi': {
    collection: 'MODIS/006/MOD13Q1',
    band: 'NDWI',
    min: -1,
    max: 1,
    defaultPalette: '0000FF,FFFFFF,00FF00',
    description: 'Normalized Difference Water Index'
  },
  'temperature': {
    collection: 'MODIS/006/MOD11A1',
    band: 'LST_Day_1km',
    min: 250,
    max: 320,
    defaultPalette: '0000FF,00FFFF,FFFF00,FF0000',
    description: 'Land Surface Temperature (Day)'
  },
  'precipitation': {
    collection: 'NASA/GPM_L3/IMERG_V06',
    band: 'precipitationCal',
    min: 0,
    max: 50,
    defaultPalette: 'FFFFFF,0000FF,00FFFF,00FF00,FFFF00,FF0000',
    description: 'Precipitation (IMERG)'
  },
  'snow': {
    collection: 'MODIS/006/MOD10A1',
    band: 'NDSI_Snow_Cover',
    min: 0,
    max: 100,
    defaultPalette: 'FFFFFF,0000FF',
    description: 'Snow Cover'
  },
  'fire': {
    collection: 'MODIS/006/MOD14A1',
    band: 'FireMask',
    min: 0,
    max: 9,
    defaultPalette: '000000,FF0000,FFFF00,00FF00',
    description: 'Fire Detection'
  },
  'urban': {
    collection: 'ESA/WorldCover/v100',
    band: 'Map',
    min: 0,
    max: 100,
    defaultPalette: '006400,FFA500,FFFF00,FF0000,0000FF,FFFFFF,8B4513,808080',
    description: 'WorldCover Land Use'
  }
};

const initializeEarthEngine = () => {
  return new Promise((resolve, reject) => {
    if (!SERVICE_ACCOUNT) {
      reject(new Error('GEE_SERVICE_ACCOUNT not properly configured'));
      return;
    }
    
    ee.data.authenticateViaPrivateKey(SERVICE_ACCOUNT, () => {
      ee.initialize(null, null, resolve, reject);
    }, reject);
  });
};

const getDatasetConfig = (datasetName) => {
  const dataset = DATASETS[datasetName.toLowerCase()];
  if (!dataset) {
    throw new Error(`Dataset '${datasetName}' not supported. Available datasets: ${Object.keys(DATASETS).join(', ')}`);
  }
  return dataset;
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
  const {
    dataset = "ndvi",
    year = "2024",
    month,
    period = "monthly",
    palette,
    opacity = "1.0",
    apikey,
  } = query;

  // Check if environment variables are set
  if (!SERVICE_ACCOUNT) {
    res.status(500).json({ 
      error: "GEE_SERVICE_ACCOUNT environment variable not set or invalid JSON",
      hint: "Make sure to set the entire JSON as a single line in Vercel environment variables"
    });
    return;
  }

  if (!API_KEY) {
    res.status(500).json({ error: "API_KEY environment variable not set" });
    return;
  }

  if (apikey !== API_KEY) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  try {
    await initializeEarthEngine();

    // Get dataset configuration
    const datasetConfig = getDatasetConfig(dataset);
    
    // Use dataset-specific palette if not provided
    const finalPalette = palette || datasetConfig.defaultPalette;

    const geometry = ee.Geometry.Rectangle([-180, -90, 180, 90]);

    let collection = ee.ImageCollection(datasetConfig.collection)
      .select(datasetConfig.band)
      .filterBounds(geometry);

    if (period === "monthly" && month) {
      collection = collection
        .filterDate(`${year}-${month}-01`, `${year}-${month}-28`);
    } else {
      collection = collection.filterDate(`${year}-01-01`, `${year}-12-31`);
    }

    const composite = collection.mean();

    const visParams = {
      min: datasetConfig.min,
      max: datasetConfig.max,
      palette: finalPalette.split(","),
      opacity: parseFloat(opacity),
    };

    const mapId = await new Promise((resolve, reject) => {
      ee.data.getMapId({ image: composite, visParams }, (map, err) => {
        if (err) reject(err);
        else resolve(map);
      });
    });

    res.json({ 
      tile_url: mapId.urlFormat,
      dataset: dataset,
      description: datasetConfig.description,
      parameters: {
        year,
        month,
        period,
        palette: finalPalette,
        opacity
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}; 