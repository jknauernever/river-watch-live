export default async (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Earth Engine Tile Server API Documentation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 0;
            margin-bottom: 30px;
            border-radius: 10px;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .section {
            background: white;
            padding: 30px;
            margin-bottom: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .section h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #3498db;
        }
        
        .endpoint {
            background: #f8f9fa;
            padding: 20px;
            margin: 15px 0;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        
        .endpoint h3 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .method {
            display: inline-block;
            background: #27ae60;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-right: 10px;
        }
        
        .url {
            background: #2c3e50;
            color: white;
            padding: 10px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
            word-break: break-all;
        }
        
        .dataset-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .dataset-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #e74c3c;
        }
        
        .dataset-card h4 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .category {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            margin-bottom: 10px;
        }
        
        .example {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
            overflow-x: auto;
        }
        
        .response {
            background: #27ae60;
            color: white;
            padding: 15px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
            overflow-x: auto;
        }
        
        .error {
            background: #e74c3c;
            color: white;
            padding: 15px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
        }
        
        .parameter-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        .parameter-table th,
        .parameter-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .parameter-table th {
            background: #f8f9fa;
            font-weight: bold;
        }
        
        .required {
            color: #e74c3c;
            font-weight: bold;
        }
        
        .optional {
            color: #7f8c8d;
        }
        
        .nav {
            position: sticky;
            top: 20px;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .nav ul {
            list-style: none;
        }
        
        .nav li {
            margin: 5px 0;
        }
        
        .nav a {
            color: #3498db;
            text-decoration: none;
        }
        
        .nav a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .dataset-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌍 Google Earth Engine Tile Server API</h1>
            <p>Access Google Earth Engine datasets as map tiles for your mapping applications</p>
        </div>

        <div class="nav">
            <h3>📋 Quick Navigation</h3>
            <ul>
                <li><a href="#overview">Overview</a></li>
                <li><a href="#endpoints">API Endpoints</a></li>
                <li><a href="#datasets">Available Datasets</a></li>
                <li><a href="#examples">Integration Examples</a></li>
                <li><a href="#errors">Error Handling</a></li>
            </ul>
        </div>

        <div class="section" id="overview">
            <h2>📖 Overview</h2>
            <p>This API provides access to Google Earth Engine datasets as map tiles that can be displayed in mapping applications like Mapbox, Leaflet, or any web mapping library.</p>
            
            <div class="endpoint">
                <h3>Base URL</h3>
                <div class="url">https://gee-tile-server.vercel.app</div>
            </div>
            
            <div class="endpoint">
                <h3>Authentication</h3>
                <p>All API requests require an <code>apikey</code> parameter for authentication.</p>
            </div>
        </div>

        <div class="section" id="endpoints">
            <h2>🔗 API Endpoints</h2>
            
            <div class="endpoint">
                <h3><span class="method">GET</span> List Available Datasets</h3>
                <div class="url">/api/datasets</div>
                <p>Returns information about all available datasets.</p>
                
                <h4>Parameters:</h4>
                <table class="parameter-table">
                    <tr>
                        <th>Parameter</th>
                        <th>Type</th>
                        <th>Required</th>
                        <th>Description</th>
                    </tr>
                    <tr>
                        <td>category</td>
                        <td>string</td>
                        <td class="optional">No</td>
                        <td>Filter datasets by category</td>
                    </tr>
                    <tr>
                        <td>format</td>
                        <td>string</td>
                        <td class="optional">No</td>
                        <td>Response format (json or list)</td>
                    </tr>
                </table>
                
                <h4>Example Request:</h4>
                <div class="example">GET https://gee-tile-server.vercel.app/api/datasets</div>
                
                <h4>Example Response:</h4>
                <div class="response">{
  "datasets": {
    "ndvi": {
      "description": "Normalized Difference Vegetation Index",
      "category": "Vegetation",
      "temporalResolution": "16 days",
      "spatialResolution": "250m"
    }
  },
  "total": 8,
  "categories": ["Vegetation", "Water", "Climate", "Cryosphere", "Hazards", "Land Use"]
}</div>
            </div>

            <div class="endpoint">
                <h3><span class="method">GET</span> Get Map Tiles</h3>
                <div class="url">/api/tiles</div>
                <p>Returns a Google Earth Engine tile URL for the specified dataset and parameters.</p>
                
                <h4>Required Parameters:</h4>
                <table class="parameter-table">
                    <tr>
                        <th>Parameter</th>
                        <th>Type</th>
                        <th>Description</th>
                    </tr>
                    <tr>
                        <td>apikey</td>
                        <td>string</td>
                        <td>Your API key for authentication</td>
                    </tr>
                </table>
                
                <h4>Optional Parameters:</h4>
                <table class="parameter-table">
                    <tr>
                        <th>Parameter</th>
                        <th>Type</th>
                        <th>Default</th>
                        <th>Description</th>
                    </tr>
                    <tr>
                        <td>dataset</td>
                        <td>string</td>
                        <td>ndvi</td>
                        <td>Dataset name</td>
                    </tr>
                    <tr>
                        <td>year</td>
                        <td>string</td>
                        <td>2024</td>
                        <td>Year for data</td>
                    </tr>
                    <tr>
                        <td>month</td>
                        <td>string</td>
                        <td>-</td>
                        <td>Month 1-12 (optional, for monthly data)</td>
                    </tr>
                    <tr>
                        <td>period</td>
                        <td>string</td>
                        <td>monthly</td>
                        <td>Time period (monthly or yearly)</td>
                    </tr>
                    <tr>
                        <td>palette</td>
                        <td>string</td>
                        <td>dataset default</td>
                        <td>Color palette as comma-separated hex colors</td>
                    </tr>
                    <tr>
                        <td>opacity</td>
                        <td>string</td>
                        <td>1.0</td>
                        <td>Opacity level 0.0-1.0</td>
                    </tr>
                </table>
                
                <h4>Example Request:</h4>
                <div class="example">GET https://gee-tile-server.vercel.app/api/tiles?dataset=temperature&year=2024&month=6&apikey=YOUR_API_KEY</div>
                
                <h4>Example Response:</h4>
                <div class="response">{
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
}</div>
            </div>

            <div class="endpoint">
                <h3><span class="method">GET</span> Test Endpoint</h3>
                <div class="url">/api/test</div>
                <p>Simple test endpoint to verify API connectivity.</p>
                
                <h4>Example Response:</h4>
                <div class="response">{
  "message": "API is working!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "method": "GET",
  "url": "/api/test"
}</div>
            </div>
        </div>

        <div class="section" id="datasets">
            <h2>📊 Available Datasets</h2>
            
            <div class="dataset-grid">
                <div class="dataset-card">
                    <h4>🌱 NDVI</h4>
                    <div class="category">Vegetation</div>
                    <p><strong>Normalized Difference Vegetation Index</strong></p>
                    <p>Measures vegetation health and density</p>
                    <p><strong>Resolution:</strong> 250m, 16 days</p>
                    <p><strong>Palette:</strong> Red-Yellow-Green</p>
                </div>
                
                <div class="dataset-card">
                    <h4>🌿 EVI</h4>
                    <div class="category">Vegetation</div>
                    <p><strong>Enhanced Vegetation Index</strong></p>
                    <p>Improved vegetation index with better sensitivity</p>
                    <p><strong>Resolution:</strong> 250m, 16 days</p>
                    <p><strong>Palette:</strong> Red-Yellow-Green</p>
                </div>
                
                <div class="dataset-card">
                    <h4>💧 NDWI</h4>
                    <div class="category">Water</div>
                    <p><strong>Normalized Difference Water Index</strong></p>
                    <p>Detects water bodies and moisture</p>
                    <p><strong>Resolution:</strong> 250m, 16 days</p>
                    <p><strong>Palette:</strong> Blue-White-Green</p>
                </div>
                
                <div class="dataset-card">
                    <h4>🌡️ Temperature</h4>
                    <div class="category">Climate</div>
                    <p><strong>Land Surface Temperature</strong></p>
                    <p>Thermal data showing surface temperature</p>
                    <p><strong>Resolution:</strong> 1km, Daily</p>
                    <p><strong>Palette:</strong> Blue-Cyan-Yellow-Red</p>
                </div>
                
                <div class="dataset-card">
                    <h4>🌧️ Precipitation</h4>
                    <div class="category">Climate</div>
                    <p><strong>Precipitation (IMERG)</strong></p>
                    <p>Rainfall measurements from IMERG</p>
                    <p><strong>Resolution:</strong> 10km, 30 minutes</p>
                    <p><strong>Palette:</strong> White-Blue-Cyan-Green-Yellow-Red</p>
                </div>
                
                <div class="dataset-card">
                    <h4>❄️ Snow</h4>
                    <div class="category">Cryosphere</div>
                    <p><strong>Snow Cover</strong></p>
                    <p>Snow extent mapping</p>
                    <p><strong>Resolution:</strong> 500m, Daily</p>
                    <p><strong>Palette:</strong> White-Blue</p>
                </div>
                
                <div class="dataset-card">
                    <h4>🔥 Fire</h4>
                    <div class="category">Hazards</div>
                    <p><strong>Fire Detection</strong></p>
                    <p>Active fire monitoring</p>
                    <p><strong>Resolution:</strong> 1km, Daily</p>
                    <p><strong>Palette:</strong> Black-Red-Yellow-Green</p>
                </div>
                
                <div class="dataset-card">
                    <h4>🏙️ Urban</h4>
                    <div class="category">Land Use</div>
                    <p><strong>WorldCover Land Use</strong></p>
                    <p>Land cover classification</p>
                    <p><strong>Resolution:</strong> 10m, Annual</p>
                    <p><strong>Palette:</strong> Land use categories</p>
                </div>
            </div>
        </div>

        <div class="section" id="examples">
            <h2>💻 Integration Examples</h2>
            
            <div class="endpoint">
                <h3>JavaScript/Mapbox</h3>
                <div class="example">// Get tile URL
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
});</div>
            </div>
            
            <div class="endpoint">
                <h3>Python/Requests</h3>
                <div class="example">import requests

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
tile_url = tile_data['tile_url']</div>
            </div>
            
            <div class="endpoint">
                <h3>cURL</h3>
                <div class="example"># List datasets
curl "https://gee-tile-server.vercel.app/api/datasets"

# Get temperature tiles
curl "https://gee-tile-server.vercel.app/api/tiles?dataset=temperature&year=2024&month=6&apikey=YOUR_API_KEY"</div>
            </div>
        </div>

        <div class="section" id="errors">
            <h2>⚠️ Error Handling</h2>
            
            <div class="endpoint">
                <h3>403 Forbidden</h3>
                <div class="error">{
  "error": "Invalid API key"
}</div>
            </div>
            
            <div class="endpoint">
                <h3>500 Internal Server Error</h3>
                <div class="error">{
  "error": "GEE_SERVICE_ACCOUNT environment variable not set or invalid JSON",
  "hint": "Make sure to set the entire JSON as a single line in Vercel environment variables"
}</div>
            </div>
            
            <div class="endpoint">
                <h3>Dataset Not Found</h3>
                <div class="error">{
  "error": "Dataset 'invalid_dataset' not supported. Available datasets: ndvi, evi, ndwi, temperature, precipitation, snow, fire, urban"
}</div>
            </div>
        </div>

        <div class="section">
            <h2>📋 Additional Information</h2>
            
            <div class="endpoint">
                <h3>Rate Limits</h3>
                <p>No specific rate limits currently implemented. Google Earth Engine may have its own rate limits. Recommended to cache tile URLs when possible.</p>
            </div>
            
            <div class="endpoint">
                <h3>CORS Support</h3>
                <p>All endpoints support CORS and can be called from web browsers.</p>
            </div>
            
            <div class="endpoint">
                <h3>Data Sources</h3>
                <p>All data comes from Google Earth Engine collections:</p>
                <ul>
                    <li>MODIS/006/MOD13Q1 (Vegetation indices)</li>
                    <li>MODIS/006/MOD11A1 (Temperature)</li>
                    <li>NASA/GPM_L3/IMERG_V06 (Precipitation)</li>
                    <li>MODIS/006/MOD10A1 (Snow)</li>
                    <li>MODIS/006/MOD14A1 (Fire)</li>
                    <li>ESA/WorldCover/v100 (Land use)</li>
                </ul>
            </div>
            
            <div class="endpoint">
                <h3>Temporal Coverage</h3>
                <ul>
                    <li>Most datasets: 2000-present</li>
                    <li>Precipitation: 2000-present</li>
                    <li>Land use: 2020</li>
                    <li>Temporal resolution varies by dataset (daily to annual)</li>
                </ul>
            </div>
            
            <div class="endpoint">
                <h3>Spatial Coverage</h3>
                <ul>
                    <li>Global coverage</li>
                    <li>Spatial resolution varies by dataset (10m to 10km)</li>
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`;

  res.send(html);
}; 