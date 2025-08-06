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
    year = "2024",
    month,
    period = "monthly",
    palette = "FF0000,FFFF00,00FF00",
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

    const geometry = ee.Geometry.Rectangle([-180, -90, 180, 90]);

    let collection = ee.ImageCollection("MODIS/006/MOD13Q1")
      .select("NDVI")
      .filterBounds(geometry);

    if (period === "monthly" && month) {
      collection = collection
        .filterDate(`${year}-${month}-01`, `${year}-${month}-28`);
    } else {
      collection = collection.filterDate(`${year}-01-01`, `${year}-12-31`);
    }

    const composite = collection.mean();

    const visParams = {
      min: 0,
      max: 9000,
      palette: palette.split(","),
      opacity: parseFloat(opacity),
    };

    const mapId = await new Promise((resolve, reject) => {
      ee.data.getMapId({ image: composite, visParams }, (map, err) => {
        if (err) reject(err);
        else resolve(map);
      });
    });

    res.json({ tile_url: mapId.urlFormat });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}; 