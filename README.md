# Google Earth Engine NDVI Tile Server (Vercel)

## 🔧 Setup

1. **Create Vercel Account**  
   https://vercel.com/

2. **Import This Project**  
   Upload or connect via GitHub

3. **Add Environment Variables**
   - `GEE_SERVICE_ACCOUNT` — Paste your entire JSON as a single line (escaped `\n`)
   - `API_KEY` — Set a private key you’ll use to restrict access

4. **Deploy**

---

## 🔍 Usage

Make GET requests to:

```
https://<your-vercel-project>.vercel.app/tiles?year=2024&month=6&palette=FF0000,FFFF00,00FF00&opacity=0.8&apikey=YOUR_KEY
```

---

## 🛠 Features

- Supports `year`, `month`, `palette`, `opacity`
- Returns Google Earth Engine tile URL (for Mapbox, Leaflet, etc.)
- Monthly or yearly NDVI composites
- Protects access with `apikey`

