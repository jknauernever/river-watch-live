const ee = require('@google/earthengine');
const { createServer } = require('http');

const SERVICE_ACCOUNT = JSON.parse(process.env.GEE_SERVICE_ACCOUNT);
const API_KEY = process.env.API_KEY;

const initializeEarthEngine = () => {
  return new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(SERVICE_ACCOUNT, () => {
      ee.initialize(null, null, resolve, reject);
    }, reject);
  });
};

module.exports = async (req, res) => {
  const { query } = req;
  const {
    year = "2024",
    month,
    period = "monthly",
    palette = "FF0000,FFFF00,00FF00",
    opacity = "1.0",
    apikey,
  } = query;

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
